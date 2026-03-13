"""routers/emails.py - Email preview and reply checks."""
from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Request
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from database import Lead, User, get_db
from routers.auth import get_current_user
from security import enforce_rate_limit
from tasks import run_followup_check

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
    from services.ai_service import generate_email_for_lead

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


@router.post("/check-replies")
def check_replies(
    request: Request,
    background_tasks: BackgroundTasks,
    current_user: User = Depends(get_current_user),
):
    enforce_rate_limit(request, "reply_check", limit=4, window_seconds=300, identifier=current_user.id)
    background_tasks.add_task(run_followup_check, current_user.id)
    return {"message": "Reply check started in the background"}
