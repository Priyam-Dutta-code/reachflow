"""Email preview + reply checks — PORTED V1 contracts."""
from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Request
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.core.rate_limit import enforce_rate_limit
from app.db.models import Lead, User
from app.db.session import get_db, get_session_factory
from app.services.verticals import entitlements_for_user

router = APIRouter()


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
