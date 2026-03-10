"""routers/emails.py — Email Preview & Reply Check"""
from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlalchemy.orm import Session
from pydantic import BaseModel

from database import get_db, User, Lead
from routers.auth import get_current_user
from tasks import run_followup_check

router = APIRouter()


class PreviewRequest(BaseModel):
    lead_id: int


@router.post("/preview")
def preview_email(
    body: PreviewRequest,
    current_user: User = Depends(get_current_user),
    db: Session        = Depends(get_db),
):
    from services.ai_service import generate_email_for_lead
    lead = db.query(Lead).filter(Lead.id == body.lead_id, Lead.user_id == current_user.id).first()
    if not lead:
        raise HTTPException(404, "Lead not found")
    subject, body_text = generate_email_for_lead(lead, current_user)
    return {"subject": subject, "body": body_text, "to": lead.email, "company": lead.company}


@router.post("/check-replies")
def check_replies(
    background_tasks: BackgroundTasks,
    current_user: User = Depends(get_current_user),
):
    background_tasks.add_task(run_followup_check, current_user.id)
    return {"message": "Reply check started in background"}
