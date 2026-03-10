"""routers/analytics.py — Dashboard Stats"""
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func

from database import get_db, User, Lead, Campaign, EmailLog, LeadStatus
from routers.auth import get_current_user

router = APIRouter()


@router.get("/overview")
def overview(
    current_user: User = Depends(get_current_user),
    db: Session        = Depends(get_db),
):
    uid = current_user.id

    total_leads = db.query(Lead).filter(Lead.user_id == uid).count()
    with_email  = db.query(Lead).filter(Lead.user_id == uid, Lead.email != None, Lead.email != "").count()
    sent        = db.query(Lead).filter(Lead.user_id == uid, Lead.status == LeadStatus.sent).count()
    replied     = db.query(Lead).filter(Lead.user_id == uid, Lead.replied == True).count()
    bounced     = db.query(Lead).filter(Lead.user_id == uid, Lead.status == LeadStatus.bounced).count()
    follow_ups  = db.query(Lead).filter(Lead.user_id == uid, Lead.follow_up_sent == True).count()
    reply_rate  = round(replied / sent * 100, 1) if sent > 0 else 0

    sources = db.query(Lead.source, func.count(Lead.id))\
                .filter(Lead.user_id == uid).group_by(Lead.source).all()

    industries = db.query(Lead.industry, func.count(Lead.id))\
                   .filter(Lead.user_id == uid, Lead.industry != None)\
                   .group_by(Lead.industry).order_by(func.count(Lead.id).desc()).limit(8).all()

    daily = db.query(func.date(EmailLog.sent_at), func.count(EmailLog.id))\
              .filter(EmailLog.user_id == uid)\
              .group_by(func.date(EmailLog.sent_at))\
              .order_by(func.date(EmailLog.sent_at)).limit(30).all()

    return {
        "total_leads":  total_leads,
        "with_email":   with_email,
        "sent":         sent,
        "replied":      replied,
        "bounced":      bounced,
        "follow_ups":   follow_ups,
        "reply_rate":   reply_rate,
        "credits_left": current_user.credits,
        "leads_quota":  current_user.leads_quota,
        "leads_used":   current_user.leads_used,
        "plan":         current_user.plan,
        "sources":      [{"source": s, "count": c} for s, c in sources],
        "industries":   [{"industry": i or "Unknown", "count": c} for i, c in industries],
        "daily_sends":  [{"date": str(d), "count": c} for d, c in daily],
        "funnel": [
            {"stage": "Leads Generated", "count": total_leads},
            {"stage": "Have Email",       "count": with_email},
            {"stage": "Emails Sent",      "count": sent},
            {"stage": "Follow-ups Sent",  "count": follow_ups},
            {"stage": "Replied",          "count": replied},
        ],
    }
