"""Analytics overview — PORTED from V1 (contract-bearing for dashboard + analytics)."""
from fastapi import APIRouter, Depends
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.db.models import Campaign, EmailLog, Lead, LeadStatus, User
from app.db.session import get_db
from app.services.verticals import entitlements_for_user, plan_for_user

router = APIRouter()


@router.get("/overview")
def overview(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    uid = current_user.id

    total_leads = db.query(Lead).filter(Lead.user_id == uid).count()
    with_email = db.query(Lead).filter(Lead.user_id == uid, Lead.email != None, Lead.email != "").count()  # noqa: E711
    sent = db.query(Lead).filter(Lead.user_id == uid, Lead.status == LeadStatus.sent).count()
    replied = db.query(Lead).filter(Lead.user_id == uid, Lead.replied == True).count()  # noqa: E712
    bounced = db.query(Lead).filter(Lead.user_id == uid, Lead.status == LeadStatus.bounced).count()
    follow_ups = db.query(Lead).filter(Lead.user_id == uid, Lead.follow_up_sent == True).count()  # noqa: E712
    pending = db.query(Lead).filter(Lead.user_id == uid, Lead.status == LeadStatus.pending).count()
    ready_to_send = db.query(Lead).filter(
        Lead.user_id == uid, Lead.status == LeadStatus.pending,
        Lead.email != None, Lead.email != "",  # noqa: E711
    ).count()
    campaigns_count = db.query(Campaign).filter(Campaign.user_id == uid).count()
    active_campaigns = db.query(Campaign).filter(Campaign.user_id == uid, Campaign.status == "active").count()
    draft_campaigns = db.query(Campaign).filter(Campaign.user_id == uid, Campaign.status == "draft").count()
    reply_rate = round(replied / sent * 100, 1) if sent > 0 else 0

    sources = (
        db.query(Lead.source, func.count(Lead.id))
        .filter(Lead.user_id == uid)
        .group_by(Lead.source)
        .all()
    )
    industries = (
        db.query(Lead.industry, func.count(Lead.id))
        .filter(Lead.user_id == uid, Lead.industry != None)  # noqa: E711
        .group_by(Lead.industry)
        .order_by(func.count(Lead.id).desc())
        .limit(8)
        .all()
    )
    daily = (
        db.query(func.date(EmailLog.sent_at), func.count(EmailLog.id))
        .filter(EmailLog.user_id == uid)
        .group_by(func.date(EmailLog.sent_at))
        .order_by(func.date(EmailLog.sent_at))
        .limit(30)
        .all()
    )

    plan = plan_for_user(current_user)
    entitlements = entitlements_for_user(current_user)

    return {
        "vertical": current_user.vertical or "business_growth",
        "plan": plan["plan_type"].value if hasattr(plan["plan_type"], "value") else plan["plan_type"],
        "plan_key": plan["id"],
        "plan_name": plan["name"],
        "entitlements": entitlements,
        "total_leads": total_leads,
        "with_email": with_email,
        "sent": sent,
        "replied": replied,
        "bounced": bounced,
        "follow_ups": follow_ups,
        "pending": pending,
        "ready_to_send": ready_to_send,
        "campaigns_count": campaigns_count,
        "active_campaigns": active_campaigns,
        "draft_campaigns": draft_campaigns,
        "reply_rate": reply_rate,
        "credits_left": current_user.credits,
        "leads_quota": current_user.leads_quota,
        "leads_used": current_user.leads_used,
        "sources": [{"source": getattr(source, "value", source), "count": count} for source, count in sources],
        "industries": [{"industry": industry or "Unknown", "count": count} for industry, count in industries],
        "daily_sends": [{"date": str(date), "count": count} for date, count in daily],
        "funnel": [
            {"stage": "Leads Generated", "count": total_leads},
            {"stage": "Ready to Send", "count": ready_to_send},
            {"stage": "Emails Sent", "count": sent},
            {"stage": "Follow-ups Sent", "count": follow_ups},
            {"stage": "Replied", "count": replied},
        ],
    }
