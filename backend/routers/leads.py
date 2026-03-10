"""routers/leads.py — Lead Generation & CRUD"""
from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional

from database import get_db, User, Lead, LeadStatus
from routers.auth import get_current_user
from tasks import run_lead_gen_task

router = APIRouter()


class LeadGenRequest(BaseModel):
    source:      str = "google_maps"
    query:       str
    location:    str = ""
    industry:    str = ""
    method:      str = "selenium"
    portal:      str = "naukri"
    max:         int = 50
    campaign_id: Optional[int] = None


class LeadUpdate(BaseModel):
    name:    Optional[str] = None
    email:   Optional[str] = None
    company: Optional[str] = None
    title:   Optional[str] = None
    notes:   Optional[str] = None
    status:  Optional[str] = None


@router.post("/generate")
def generate_leads(
    body: LeadGenRequest,
    background_tasks: BackgroundTasks,
    current_user: User = Depends(get_current_user),
    db: Session        = Depends(get_db),
):
    if current_user.leads_used >= current_user.leads_quota:
        raise HTTPException(402, "Lead quota exhausted. Upgrade your plan.")
    background_tasks.add_task(run_lead_gen_task, current_user.id, body.dict())
    return {"message": "Lead generation started in background", "status": "running"}


@router.get("/")
def list_leads(
    page:        int = 1,
    per_page:    int = 50,
    status:      Optional[str] = None,
    campaign_id: Optional[int] = None,
    current_user: User = Depends(get_current_user),
    db: Session        = Depends(get_db),
):
    q = db.query(Lead).filter(Lead.user_id == current_user.id)
    if status:
        q = q.filter(Lead.status == status)
    if campaign_id:
        q = q.filter(Lead.campaign_id == campaign_id)
    total = q.count()
    leads = q.order_by(Lead.created_at.desc()).offset((page-1)*per_page).limit(per_page).all()
    return {"total": total, "page": page, "per_page": per_page, "leads": [_lead_dict(l) for l in leads]}


@router.patch("/{lead_id}")
def update_lead(
    lead_id: int,
    body: LeadUpdate,
    current_user: User = Depends(get_current_user),
    db: Session        = Depends(get_db),
):
    lead = db.query(Lead).filter(Lead.id == lead_id, Lead.user_id == current_user.id).first()
    if not lead:
        raise HTTPException(404, "Lead not found")
    for k, v in body.dict(exclude_none=True).items():
        setattr(lead, k, v)
    db.commit()
    return _lead_dict(lead)


@router.delete("/{lead_id}")
def delete_lead(
    lead_id: int,
    current_user: User = Depends(get_current_user),
    db: Session        = Depends(get_db),
):
    lead = db.query(Lead).filter(Lead.id == lead_id, Lead.user_id == current_user.id).first()
    if not lead:
        raise HTTPException(404, "Lead not found")
    db.delete(lead)
    db.commit()
    return {"deleted": True}


def _lead_dict(l: Lead) -> dict:
    return {
        "id": l.id, "name": l.name, "email": l.email,
        "company": l.company, "title": l.title, "phone": l.phone,
        "website": l.website, "linkedin_url": l.linkedin_url,
        "industry": l.industry, "company_size": l.company_size,
        "location": l.location, "source": l.source, "status": l.status,
        "sent_date": str(l.sent_date) if l.sent_date else None,
        "follow_up_sent": l.follow_up_sent, "replied": l.replied,
        "notes": l.notes, "campaign_id": l.campaign_id,
        "created_at": str(l.created_at),
    }
