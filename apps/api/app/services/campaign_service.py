"""Campaign stats + eligibility — PORTED from V1 with Phase 4 helpers."""
from datetime import datetime
from datetime import time as dt_time

from sqlalchemy import func
from sqlalchemy.orm import Session

from app.db.models import Campaign, CampaignStatus, EmailLog, Lead, LeadStatus
from app.services.verticals import entitlements_for_user


def sync_campaign_stats(db: Session, campaign_id: int | None) -> None:
    if not campaign_id:
        return

    campaign = db.query(Campaign).filter(Campaign.id == campaign_id).first()
    if not campaign:
        return

    q = db.query(Lead).filter(Lead.campaign_id == campaign_id)
    campaign.total_leads = q.count()
    campaign.total_sent = q.filter(Lead.sent_date != None).count()  # noqa: E711
    campaign.total_replied = q.filter(Lead.replied == True).count()  # noqa: E712
    campaign.total_bounced = q.filter(Lead.status == LeadStatus.bounced).count()
    campaign.updated_at = datetime.utcnow()


def eligible_leads_query(db: Session, user_id: str, campaign_id: int):
    """Pending leads with an email address, attached to this campaign."""
    return db.query(Lead).filter(
        Lead.user_id == user_id,
        Lead.campaign_id == campaign_id,
        Lead.status == LeadStatus.pending,
        Lead.email != None,  # noqa: E711
        Lead.email != "",
    )


def sent_today(db: Session, campaign_id: int) -> int:
    start_of_day = datetime.combine(datetime.utcnow().date(), dt_time.min)
    return (
        db.query(func.count(EmailLog.id))
        .filter(
            EmailLog.campaign_id == campaign_id,
            EmailLog.status == "sent",
            EmailLog.sent_at >= start_of_day,
        )
        .scalar()
        or 0
    )


def daily_send_budget(db: Session, user, campaign: Campaign) -> int:
    """How many more emails this campaign may send today (plan cap enforced)."""
    entitlements = entitlements_for_user(user)
    cap = min(campaign.emails_per_day or 0, entitlements.get("daily_send_cap", 25))
    return max(cap - sent_today(db, campaign.id), 0)


def due_campaigns(db: Session, now: datetime | None = None) -> list[Campaign]:
    """Active campaigns whose configured send_time has passed today."""
    now = now or datetime.utcnow()
    current_hhmm = now.strftime("%H:%M")
    return (
        db.query(Campaign)
        .filter(Campaign.status == CampaignStatus.active, Campaign.send_time <= current_hhmm)
        .all()
    )
