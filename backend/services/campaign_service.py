from datetime import datetime

from sqlalchemy.orm import Session

from database import Campaign, Lead, LeadStatus


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
