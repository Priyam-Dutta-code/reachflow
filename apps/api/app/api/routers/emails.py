"""Email preview, send log, and reply checks — PORTED V1 contracts + Phase 8 log."""
from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Query, Request
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.core.rate_limit import enforce_rate_limit
from app.db.models import EmailLog, Lead, User
from app.db.session import get_db, get_session_factory
from app.services.verticals import entitlements_for_user

router = APIRouter()


@router.get("/log")
def email_log(
    page: int = Query(default=1, ge=1),
    per_page: int = Query(default=50, ge=1, le=200),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Tenant-scoped send history (Phase 8: analytics CSV export + activity)."""
    q = db.query(EmailLog).filter(EmailLog.user_id == current_user.id)
    total = q.count()
    logs = (
        q.order_by(EmailLog.sent_at.desc())
        .offset((page - 1) * per_page)
        .limit(per_page)
        .all()
    )
    return {
        "total": total,
        "page": page,
        "per_page": per_page,
        "logs": [
            {
                "id": log.id,
                "to_email": log.to_email,
                "subject": log.subject,
                "status": log.status,
                "is_followup": log.is_followup,
                "campaign_id": log.campaign_id,
                "lead_id": log.lead_id,
                "sent_at": str(log.sent_at) if log.sent_at else None,
            }
            for log in logs
        ],
    }


class PreviewRequest(BaseModel):
    lead_id: int = Field(ge=1)


@router.post("/preview")
def preview_email(
    body: PreviewRequest,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    enforce_rate_limit(request, "email_preview", limit=15, window_seconds=60, identifier=current_user.id)
    from app.services.ai_service import generate_email_for_lead

    lead = db.query(Lead).filter(Lead.id == body.lead_id, Lead.user_id == current_user.id).first()
    if not lead:
        raise HTTPException(404, "Lead not found")

    subject, body_text = generate_email_for_lead(lead, current_user)
    return {
        "subject": subject,
        "body": body_text,
        "to": lead.email,
        "company": lead.company,
    }


def _check_replies_with_session(user_id: str) -> None:
    from app.db.models import User as UserModel
    from app.services.send_engine import check_replies

    db = get_session_factory()()
    try:
        user = db.get(UserModel, user_id)
        if user:
            check_replies(db, user)
    finally:
        db.close()


@router.post("/check-replies")
def check_replies_endpoint(
    request: Request,
    background_tasks: BackgroundTasks,
    current_user: User = Depends(get_current_user),
):
    enforce_rate_limit(request, "reply_check", limit=4, window_seconds=300, identifier=current_user.id)
    entitlements = entitlements_for_user(current_user)
    if not entitlements.get("reply_checks"):
        raise HTTPException(
            402,
            {
                "message": "Reply checks are available on the paid plans for this vertical.",
                "reason": "not_entitled",
                "action": "upgrade",
            },
        )
    background_tasks.add_task(_check_replies_with_session, current_user.id)
    return {"message": "Reply check started in the background"}
