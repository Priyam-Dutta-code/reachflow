"""
tasks.py — Celery Background Workers
Run:  celery -A tasks worker --loglevel=info
Beat: celery -A tasks beat   --loglevel=info
"""
import os, sys, time, smtplib, imaplib, email as email_lib
from datetime import datetime, timedelta
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from celery import Celery

sys.path.insert(0, os.path.dirname(__file__))
from config import REDIS_URL
from database import SessionLocal, User, Lead, Campaign, EmailLog, LeadStatus, CampaignStatus

celery = Celery("reachflow", broker=REDIS_URL, backend=REDIS_URL)
celery.conf.timezone = "Asia/Kolkata"
celery.conf.beat_schedule = {
    "daily-followup": {"task": "followup", "schedule": 86400},
}


# ── Lead Generation ───────────────────────────────────────

def run_lead_gen_task(user_id: str, params: dict):
    celery_lead_gen.delay(user_id, params)

@celery.task(name="lead_gen")
def celery_lead_gen(user_id: str, params: dict):
    from services.lead_gen_service import run_lead_gen
    from database import LeadSource

    db   = SessionLocal()
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        db.close(); return

    leads = run_lead_gen(params)
    added = 0

    existing_emails = set(
        r[0].lower() for r in db.query(Lead.email)
        .filter(Lead.user_id == user_id, Lead.email != None).all() if r[0]
    )

    for d in leads:
        em = (d.get("email") or "").lower().strip()
        if em and em in existing_emails:
            continue
        if em:
            existing_emails.add(em)

        db.add(Lead(
            user_id=user_id, name=d.get("name",""), email=d.get("email",""),
            company=d.get("company",""), title=d.get("title",""),
            phone=d.get("phone",""), website=d.get("website",""),
            linkedin_url=d.get("linkedin_url",""), industry=d.get("industry",""),
            company_size=d.get("company_size",""), location=d.get("location",""),
            source=d.get("source", LeadSource.manual),
            campaign_id=params.get("campaign_id"),
        ))
        added += 1
        if added % 20 == 0:
            db.commit()

    user.leads_used = (user.leads_used or 0) + added
    db.commit()
    db.close()
    print(f"[LeadGen] +{added} leads for user {user_id}")


# ── Email Batch Sending ───────────────────────────────────

def run_campaign_batch(user_id: str, campaign_id: int):
    celery_send_batch.delay(user_id, campaign_id)

@celery.task(name="send_batch")
def celery_send_batch(user_id: str, campaign_id: int):
    from services.ai_service import generate_email_for_lead

    db       = SessionLocal()
    user     = db.query(User).filter(User.id == user_id).first()
    campaign = db.query(Campaign).filter(Campaign.id == campaign_id).first()
    if not user or not campaign:
        db.close(); return

    pending = db.query(Lead).filter(
        Lead.user_id    == user_id,
        Lead.campaign_id== campaign_id,
        Lead.status     == LeadStatus.pending,
        Lead.email      != None,
        Lead.email      != "",
    ).limit(campaign.emails_per_day).all()

    sent = failed = 0
    for lead in pending:
        if user.credits <= 0:
            break
        subject, body = generate_email_for_lead(lead, user)
        ok, err       = _send_smtp(user, lead.email, subject, body)
        db.add(EmailLog(
            user_id=user_id, campaign_id=campaign_id, lead_id=lead.id,
            to_email=lead.email, subject=subject, body=body,
            status="sent" if ok else "failed",
        ))
        if ok:
            lead.status = LeadStatus.sent
            lead.sent_date = datetime.utcnow()
            user.credits  -= 1
            user.emails_sent = (user.emails_sent or 0) + 1
            campaign.total_sent += 1
            sent += 1
        else:
            print(f"  Failed {lead.email}: {err}")
            failed += 1
        db.commit()
        time.sleep(60)  # respect Gmail limits

    if not pending:
        campaign.status = CampaignStatus.complete
    db.commit()
    db.close()
    print(f"[Batch] Campaign {campaign_id}: {sent} sent, {failed} failed")


# ── Follow-up & Reply Detection ───────────────────────────

def run_followup_check(user_id: str):
    celery_followup.delay(user_id)

@celery.task(name="followup")
def celery_followup(user_id: str):
    from services.ai_service import generate_followup_for_lead

    db   = SessionLocal()
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        db.close(); return

    replied_emails = _check_imap_replies(user)
    if replied_emails:
        db.query(Lead).filter(
            Lead.user_id == user_id,
            Lead.email.in_(replied_emails),
        ).update({"replied": True, "status": LeadStatus.replied}, synchronize_session=False)
        db.commit()

    cutoff = datetime.utcnow() - timedelta(days=5)
    due = db.query(Lead).filter(
        Lead.user_id        == user_id,
        Lead.status         == LeadStatus.sent,
        Lead.replied        == False,
        Lead.follow_up_sent == False,
        Lead.sent_date      != None,
        Lead.sent_date      <= cutoff,
        Lead.email          != None,
    ).all()

    for lead in due:
        if user.credits <= 0:
            break
        subject, body = generate_followup_for_lead(lead, user)
        ok, _         = _send_smtp(user, lead.email, subject, body)
        if ok:
            lead.follow_up_sent = True
            lead.follow_up_date = datetime.utcnow()
            user.credits       -= 1
            db.add(EmailLog(
                user_id=user_id, lead_id=lead.id,
                to_email=lead.email, subject=subject, body=body,
                status="sent", is_followup=True,
            ))
        db.commit()
        time.sleep(60)

    db.close()


# ── Helpers ───────────────────────────────────────────────

def _send_smtp(user: User, to_email: str, subject: str, body: str) -> tuple:
    try:
        msg = MIMEMultipart()
        msg["From"]    = user.sender_email or user.email
        msg["To"]      = to_email
        msg["Subject"] = subject
        msg.attach(MIMEText(body, "plain"))
        server = smtplib.SMTP("smtp.gmail.com", 587)
        server.starttls()
        server.login(user.sender_email or user.email, user.gmail_password or "")
        server.sendmail(user.sender_email or user.email, to_email, msg.as_string())
        server.quit()
        return True, None
    except Exception as e:
        return False, str(e)


def _check_imap_replies(user: User) -> set:
    replied = set()
    try:
        mail = imaplib.IMAP4_SSL("imap.gmail.com")
        mail.login(user.sender_email or user.email, user.gmail_password or "")
        mail.select("INBOX")
        _, data = mail.search(None, "ALL")
        for mid in data[0].split()[-200:]:
            try:
                _, msg_data = mail.fetch(mid, "(RFC822)")
                msg = email_lib.message_from_bytes(msg_data[0][1])
                from_addr = email_lib.utils.parseaddr(msg.get("From",""))[1].lower()
                if from_addr:
                    replied.add(from_addr)
            except Exception:
                continue
        mail.logout()
    except Exception as e:
        print(f"[IMAP] {e}")
    return replied
