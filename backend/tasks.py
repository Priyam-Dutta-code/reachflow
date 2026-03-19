"""
tasks.py - Background task execution.

Free mode:
- with ENABLE_BACKGROUND_WORKER=false, jobs run inside the web service via FastAPI BackgroundTasks

Scaled mode:
- with ENABLE_BACKGROUND_WORKER=true, jobs are queued to Celery/Redis and processed by a worker
"""
import email as email_lib
import imaplib
import os
import smtplib
import sys
import time
from datetime import datetime, timedelta
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText

from celery import Celery

sys.path.insert(0, os.path.dirname(__file__))

from config import ENABLE_BACKGROUND_WORKER, REDIS_URL  # noqa: E402
from database import Campaign, CampaignStatus, EmailLog, Lead, LeadStatus, SessionLocal, User  # noqa: E402
from security import secret_manager  # noqa: E402
from services.campaign_service import sync_campaign_stats  # noqa: E402

broker_url = REDIS_URL or "memory://"
result_backend = REDIS_URL or "cache+memory://"
celery = Celery("reachflow", broker=broker_url, backend=result_backend)
celery.conf.timezone = "Asia/Kolkata"
celery.conf.beat_schedule = {
    "daily-followup": {"task": "followup", "schedule": 86400},
}


def run_lead_gen_task(user_id: str, params: dict):
    if ENABLE_BACKGROUND_WORKER:
        celery_lead_gen.delay(user_id, params)
        return {"status": "queued"}
    return _lead_gen_impl(user_id, params)


@celery.task(name="lead_gen")
def celery_lead_gen(user_id: str, params: dict):
    _lead_gen_impl(user_id, params)


def _lead_gen_impl(user_id: str, params: dict):
    from services.lead_gen_service import run_lead_gen
    from database import LeadSource

    db = SessionLocal()
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        db.close()
        return

    result = run_lead_gen(params)
    leads = result.get("leads", [])
    added = 0

    existing_emails = {
        record[0].lower()
        for record in db.query(Lead.email).filter(Lead.user_id == user_id, Lead.email != None).all()  # noqa: E711
        if record[0]
    }
    duplicates_skipped = 0

    for lead_data in leads:
        email_address = (lead_data.get("email") or "").lower().strip()
        if email_address and email_address in existing_emails:
            duplicates_skipped += 1
            continue
        if email_address:
            existing_emails.add(email_address)

        source_value = lead_data.get("source", LeadSource.manual)
        try:
            lead_source = LeadSource(source_value) if isinstance(source_value, str) else source_value
        except Exception:
            lead_source = LeadSource.manual

        db.add(
            Lead(
                user_id=user_id,
                name=lead_data.get("name", ""),
                email=lead_data.get("email", ""),
                company=lead_data.get("company", ""),
                title=lead_data.get("title", ""),
                phone=lead_data.get("phone", ""),
                website=lead_data.get("website", ""),
                linkedin_url=lead_data.get("linkedin_url", ""),
                industry=lead_data.get("industry", ""),
                company_size=lead_data.get("company_size", ""),
                location=lead_data.get("location", ""),
                source=lead_source,
                notes=lead_data.get("notes", ""),
                campaign_id=params.get("campaign_id"),
            )
        )
        added += 1
        if added % 20 == 0:
            db.commit()

    user.leads_used = (user.leads_used or 0) + added
    sync_campaign_stats(db, params.get("campaign_id"))
    db.commit()
    db.close()
    print(f"[LeadGen] +{added} leads for user {user_id}")
    return {
        "status": "completed",
        "requested_source": result.get("source_requested"),
        "source_used": result.get("source_used"),
        "warning": result.get("warning"),
        "total_found": len(leads),
        "added": added,
        "duplicates_skipped": duplicates_skipped,
        "campaign_id": params.get("campaign_id"),
    }


def run_campaign_batch(user_id: str, campaign_id: int):
    if ENABLE_BACKGROUND_WORKER:
        celery_send_batch.delay(user_id, campaign_id)
        return
    _send_batch_impl(user_id, campaign_id)


@celery.task(name="send_batch")
def celery_send_batch(user_id: str, campaign_id: int):
    _send_batch_impl(user_id, campaign_id)


def _send_batch_impl(user_id: str, campaign_id: int):
    from services.ai_service import generate_email_for_lead

    db = SessionLocal()
    user = db.query(User).filter(User.id == user_id).first()
    campaign = db.query(Campaign).filter(Campaign.id == campaign_id, Campaign.user_id == user_id).first()
    if not user or not campaign:
        db.close()
        return

    pending = db.query(Lead).filter(
        Lead.user_id == user_id,
        Lead.campaign_id == campaign_id,
        Lead.status == LeadStatus.pending,
        Lead.email != None,  # noqa: E711
        Lead.email != "",
    ).limit(campaign.emails_per_day).all()

    sent = failed = 0
    for lead in pending:
        if user.credits <= 0:
            break
        subject, body = generate_email_for_lead(lead, user)
        ok, err = _send_smtp(user, lead.email, subject, body)
        db.add(
            EmailLog(
                user_id=user_id,
                campaign_id=campaign_id,
                lead_id=lead.id,
                to_email=lead.email,
                subject=subject,
                body=body,
                status="sent" if ok else "failed",
            )
        )
        if ok:
            lead.status = LeadStatus.sent
            lead.sent_date = datetime.utcnow()
            user.credits -= 1
            user.emails_sent = (user.emails_sent or 0) + 1
            sent += 1
        else:
            print(f"  Failed {lead.email}: {err}")
            failed += 1
        db.commit()
        time.sleep(60)

    sync_campaign_stats(db, campaign_id)
    if pending and sent > 0:
        campaign.status = CampaignStatus.active
    elif not pending:
        campaign.status = CampaignStatus.complete
    db.commit()
    db.close()
    print(f"[Batch] Campaign {campaign_id}: {sent} sent, {failed} failed")


def run_followup_check(user_id: str):
    if ENABLE_BACKGROUND_WORKER:
        celery_followup.delay(user_id)
        return
    _followup_impl(user_id)


@celery.task(name="followup")
def celery_followup(user_id: str):
    _followup_impl(user_id)


def _followup_impl(user_id: str):
    from services.ai_service import generate_followup_for_lead

    db = SessionLocal()
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        db.close()
        return

    replied_emails = _check_imap_replies(user)
    if replied_emails:
        db.query(Lead).filter(
            Lead.user_id == user_id,
            Lead.email.in_(replied_emails),
        ).update({"replied": True, "status": LeadStatus.replied}, synchronize_session=False)
        db.commit()

    sent_leads = db.query(Lead).filter(
        Lead.user_id == user_id,
        Lead.status == LeadStatus.sent,
        Lead.replied == False,  # noqa: E712
        Lead.follow_up_sent == False,  # noqa: E712
        Lead.sent_date != None,  # noqa: E711
        Lead.email != None,  # noqa: E711
        Lead.email != "",
    ).all()

    for lead in sent_leads:
        delay_days = 5
        if lead.campaign_id:
            campaign = db.query(Campaign).filter(Campaign.id == lead.campaign_id).first()
            if campaign and campaign.follow_up_days:
                delay_days = campaign.follow_up_days

        cutoff = datetime.utcnow() - timedelta(days=delay_days)
        if not lead.sent_date or lead.sent_date > cutoff or user.credits <= 0:
            continue

        subject, body = generate_followup_for_lead(lead, user)
        ok, _ = _send_smtp(user, lead.email, subject, body)
        if ok:
            lead.follow_up_sent = True
            lead.follow_up_date = datetime.utcnow()
            user.credits -= 1
            db.add(
                EmailLog(
                    user_id=user_id,
                    lead_id=lead.id,
                    campaign_id=lead.campaign_id,
                    to_email=lead.email,
                    subject=subject,
                    body=body,
                    status="sent",
                    is_followup=True,
                )
            )
        db.commit()
        time.sleep(60)

    for campaign_id in {lead.campaign_id for lead in sent_leads if lead.campaign_id}:
        sync_campaign_stats(db, campaign_id)
    db.commit()
    db.close()


def _send_smtp(user: User, to_email: str, subject: str, body: str) -> tuple[bool, str | None]:
    try:
        password = secret_manager.decrypt(user.gmail_password)
        if not password:
            return False, "Missing Gmail app password"

        msg = MIMEMultipart()
        msg["From"] = user.sender_email or user.email
        msg["To"] = to_email
        msg["Subject"] = subject
        msg.attach(MIMEText(body, "plain"))

        server = smtplib.SMTP("smtp.gmail.com", 587)
        server.starttls()
        server.login(user.sender_email or user.email, password)
        server.sendmail(user.sender_email or user.email, to_email, msg.as_string())
        server.quit()
        return True, None
    except Exception as exc:
        return False, str(exc)


def _check_imap_replies(user: User) -> set[str]:
    replied = set()
    try:
        password = secret_manager.decrypt(user.gmail_password)
        if not password:
            return replied

        mail = imaplib.IMAP4_SSL("imap.gmail.com")
        mail.login(user.sender_email or user.email, password)
        mail.select("INBOX")
        _, data = mail.search(None, "ALL")
        for message_id in data[0].split()[-200:]:
            try:
                _, msg_data = mail.fetch(message_id, "(RFC822)")
                msg = email_lib.message_from_bytes(msg_data[0][1])
                from_addr = email_lib.utils.parseaddr(msg.get("From", ""))[1].lower()
                if from_addr:
                    replied.add(from_addr)
            except Exception:
                continue
        mail.logout()
    except Exception as exc:
        print(f"[IMAP] {exc}")
    return replied
