"""The send pipeline (Phase 4) — compliance-first.

Before EVERY send: suppression list, lead status (unsubscribed/bounced),
sender email verification. Every outbound email carries the sender-identity
footer + HMAC unsubscribe link. Idempotency is enforced by the partial unique
index on email_logs (status='sent') — a duplicate insert is rolled back and
the send is counted as already-done.

V1 defects fixed here: A4 (bounces now recorded + suppressed), A5 (reply scan
only flags addresses we actually emailed).
"""
import email as email_lib
import imaplib
import logging
import smtplib
import time
from datetime import datetime, timedelta
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText

from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.core.security import get_secret_manager
from app.core.settings import get_settings
from app.core.unsubscribe_tokens import make_unsubscribe_token
from app.db.models import (
    Campaign,
    CampaignStatus,
    EmailLog,
    Lead,
    LeadStatus,
    Unsubscribe,
    User,
)
from app.services.ai_service import generate_email_for_lead, generate_followup_for_lead
from app.services.campaign_service import daily_send_budget, eligible_leads_query, sync_campaign_stats
from app.services.verticals import entitlements_for_user

logger = logging.getLogger("reachflow.send")

PERMANENT_FAILURE_HINTS = ("550", "553", "recipient", "mailbox unavailable", "does not exist")


# ── Compliance ────────────────────────────────────────────────────────

def is_suppressed(db: Session, user_id: str, email: str) -> bool:
    address = (email or "").strip().lower()
    if not address:
        return True
    return (
        db.query(Unsubscribe)
        .filter(Unsubscribe.user_id == user_id, Unsubscribe.email == address)
        .first()
        is not None
    )


def send_block_reason(db: Session, user: User, lead: Lead) -> str | None:
    """Why this lead must NOT be emailed right now (None = clear to send)."""
    if not user.email_verified_at:
        return "sender_not_verified"
    if not (lead.email or "").strip():
        return "no_email"
    if lead.status in (LeadStatus.unsubscribed, LeadStatus.bounced):
        return f"lead_{lead.status.value}"
    if is_suppressed(db, user.id, lead.email):
        return "suppressed"
    return None


def suppress(db: Session, user_id: str, email: str, source: str = "link") -> bool:
    """Add to the suppression list (idempotent) and flag matching leads."""
    address = (email or "").strip().lower()
    if not address:
        return False
    if not is_suppressed(db, user_id, address):
        db.add(Unsubscribe(user_id=user_id, email=address, source=source))
    # bounced stays bounced (it's suppressed either way; analytics needs it)
    db.query(Lead).filter(
        Lead.user_id == user_id,
        Lead.email == address,
        Lead.status != LeadStatus.bounced,
    ).update({"status": LeadStatus.unsubscribed}, synchronize_session=False)
    db.commit()
    return True


def compliance_footer(user: User, recipient_email: str) -> str:
    """Sender identity + unsubscribe link — appended to every outbound email."""
    settings = get_settings()
    token = make_unsubscribe_token(user.id, recipient_email)
    unsubscribe_url = f"{settings.app_url.rstrip('/')}/unsubscribe?token={token}"
    identity_bits = [user.sender_name or user.name or "", user.sender_email or user.email]
    identity = ", ".join(bit for bit in identity_bits if bit)
    return (
        "\n\n--\n"
        f"Sent by {identity}.\n"
        f"Don't want these emails? Unsubscribe: {unsubscribe_url}"
    )


# ── SMTP ──────────────────────────────────────────────────────────────

def send_smtp(user: User, to_email: str, subject: str, body: str) -> tuple[bool, str | None]:
    """PORTED from V1 — per-user Gmail app password, decrypted at send time."""
    try:
        password = get_secret_manager().decrypt(user.gmail_password)
        if not password:
            return False, "Missing Gmail app password"

        msg = MIMEMultipart()
        msg["From"] = user.sender_email or user.email
        msg["To"] = to_email
        msg["Subject"] = subject
        msg.attach(MIMEText(body, "plain"))

        server = smtplib.SMTP("smtp.gmail.com", 587, timeout=20)
        server.starttls()
        server.login(user.sender_email or user.email, password)
        server.sendmail(user.sender_email or user.email, to_email, msg.as_string())
        server.quit()
        return True, None
    except Exception as exc:
        return False, str(exc)


def _record_send(
    db: Session, user: User, lead: Lead, campaign_id: int | None,
    subject: str, body: str, ok: bool, error: str | None, is_followup: bool,
) -> bool:
    """Write the EmailLog row; the unique index makes 'sent' idempotent.
    Returns True if this send was recorded as the first successful one."""
    log = EmailLog(
        user_id=user.id,
        campaign_id=campaign_id,
        lead_id=lead.id,
        to_email=lead.email,
        subject=subject,
        body=body,
        status="sent" if ok else "failed",
        is_followup=is_followup,
    )
    db.add(log)
    try:
        db.commit()
        return ok
    except IntegrityError:
        db.rollback()
        logger.info("duplicate send blocked by idempotency guard", extra={"event": "send_duplicate"})
        return False


def _handle_failure(db: Session, user: User, lead: Lead, error: str | None) -> None:
    """A4 fix: permanent failures mark the lead bounced + suppress the address."""
    message = (error or "").lower()
    if any(hint in message for hint in PERMANENT_FAILURE_HINTS):
        lead.status = LeadStatus.bounced
        db.commit()
        suppress(db, user.id, lead.email, source="bounce")


# ── Campaign batch send ───────────────────────────────────────────────

def run_campaign_batch(
    db: Session, user_id: str, campaign_id: int, batch_limit: int | None = None,
    pace_seconds: float = 2.0,
) -> dict:
    """Send the next slice of a campaign. Bounded, compliant, idempotent.

    `batch_limit` bounds one invocation (tick mode passes a small number);
    the daily budget (plan cap + already-sent-today) is always enforced.
    """
    user = db.get(User, user_id)
    campaign = db.query(Campaign).filter(
        Campaign.id == campaign_id, Campaign.user_id == user_id
    ).first()
    if not user or not campaign:
        return {"sent": 0, "failed": 0, "skipped": 0, "reason": "not_found"}

    if not user.email_verified_at:
        return {"sent": 0, "failed": 0, "skipped": 0, "reason": "sender_not_verified"}

    budget = daily_send_budget(db, user, campaign)
    if batch_limit is not None:
        budget = min(budget, batch_limit)
    if budget <= 0:
        return {"sent": 0, "failed": 0, "skipped": 0, "reason": "daily_cap_reached"}

    pending = eligible_leads_query(db, user_id, campaign_id).limit(budget * 2).all()

    sent = failed = skipped = 0
    for lead in pending:
        if sent >= budget or (user.credits or 0) <= 0:
            break
        reason = send_block_reason(db, user, lead)
        if reason:
            skipped += 1
            continue

        subject, body = generate_email_for_lead(lead, user)
        body_with_footer = body + compliance_footer(user, lead.email)
        ok, err = send_smtp(user, lead.email, subject, body_with_footer)

        recorded = _record_send(db, user, lead, campaign_id, subject, body_with_footer, ok, err, is_followup=False)
        if recorded:
            lead.status = LeadStatus.sent
            lead.sent_date = datetime.utcnow()
            user.credits = (user.credits or 0) - 1
            user.emails_sent = (user.emails_sent or 0) + 1
            db.commit()
            sent += 1
            if pace_seconds:
                time.sleep(pace_seconds)
        elif not ok:
            failed += 1
            logger.warning("send failed: %s", (err or "")[:120], extra={"event": "send_failed"})
            _handle_failure(db, user, lead, err)

    sync_campaign_stats(db, campaign_id)
    remaining = eligible_leads_query(db, user_id, campaign_id).count()
    if remaining == 0 and campaign.status == CampaignStatus.active:
        campaign.status = CampaignStatus.complete
    db.commit()

    logger.info(
        "campaign batch done", extra={"event": "campaign_batch", "status": f"{sent}s/{failed}f/{skipped}k"}
    )
    return {"sent": sent, "failed": failed, "skipped": skipped, "remaining": remaining}


# ── Follow-ups (PORTED from V1, hardened) ─────────────────────────────

def process_followups(db: Session, user_id: str, batch_limit: int = 25) -> dict:
    user = db.get(User, user_id)
    if not user:
        return {"sent": 0}

    entitlements = entitlements_for_user(user)
    if not entitlements.get("follow_up_automation") or not user.email_verified_at:
        return {"sent": 0, "reason": "not_entitled_or_unverified"}

    sent_leads = db.query(Lead).filter(
        Lead.user_id == user_id,
        Lead.status == LeadStatus.sent,        # A5 fix: only leads we actually emailed
        Lead.replied == False,  # noqa: E712
        Lead.follow_up_sent == False,  # noqa: E712
        Lead.sent_date != None,  # noqa: E711
        Lead.email != None,  # noqa: E711
        Lead.email != "",
    ).limit(batch_limit * 2).all()

    sent = 0
    for lead in sent_leads:
        if sent >= batch_limit or (user.credits or 0) <= 0:
            break

        delay_days = 5
        if lead.campaign_id:
            campaign = db.query(Campaign).filter(Campaign.id == lead.campaign_id).first()
            if campaign and campaign.follow_up_days:
                delay_days = campaign.follow_up_days

        cutoff = datetime.utcnow() - timedelta(days=delay_days)
        if not lead.sent_date or lead.sent_date > cutoff:
            continue
        if send_block_reason(db, user, lead):
            continue

        subject, body = generate_followup_for_lead(lead, user)
        body_with_footer = body + compliance_footer(user, lead.email)
        ok, err = send_smtp(user, lead.email, subject, body_with_footer)
        recorded = _record_send(
            db, user, lead, lead.campaign_id, subject, body_with_footer, ok, err, is_followup=True
        )
        if recorded:
            lead.follow_up_sent = True
            lead.follow_up_date = datetime.utcnow()
            user.credits = (user.credits or 0) - 1
            db.commit()
            sent += 1
        elif not ok:
            _handle_failure(db, user, lead, err)

    for campaign_id in {lead.campaign_id for lead in sent_leads if lead.campaign_id}:
        sync_campaign_stats(db, campaign_id)
    db.commit()
    return {"sent": sent}


# ── Reply detection (PORTED, A5 fixed) ────────────────────────────────

def check_replies(db: Session, user: User) -> int:
    """Scan the user's inbox; mark replies ONLY for addresses we emailed."""
    inbox_senders = _imap_inbox_senders(user)
    if not inbox_senders:
        return 0

    updated = db.query(Lead).filter(
        Lead.user_id == user.id,
        Lead.status == LeadStatus.sent,        # A5 fix
        Lead.email.in_(inbox_senders),
    ).update({"replied": True, "status": LeadStatus.replied}, synchronize_session=False)
    db.commit()
    return updated


def _imap_inbox_senders(user: User) -> set[str]:
    senders: set[str] = set()
    try:
        password = get_secret_manager().decrypt(user.gmail_password)
        if not password:
            return senders

        mail = imaplib.IMAP4_SSL("imap.gmail.com")
        mail.login(user.sender_email or user.email, password)
        mail.select("INBOX")
        since = (datetime.utcnow() - timedelta(days=14)).strftime("%d-%b-%Y")
        _, data = mail.search(None, f'(SINCE "{since}")')
        for message_id in data[0].split()[-200:]:
            try:
                _, msg_data = mail.fetch(message_id, "(RFC822.HEADER)")
                msg = email_lib.message_from_bytes(msg_data[0][1])
                from_addr = email_lib.utils.parseaddr(msg.get("From", ""))[1].lower()
                if from_addr:
                    senders.add(from_addr)
            except Exception:
                continue
        mail.logout()
    except Exception as exc:
        logger.warning("imap scan failed: %s", type(exc).__name__, extra={"event": "imap_error"})
    return senders
