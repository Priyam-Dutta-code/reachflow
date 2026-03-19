"""routers/leads.py - Lead generation and lead management."""
from enum import Enum
from typing import Optional

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Query, Request
from pydantic import BaseModel, ConfigDict, Field
from sqlalchemy.orm import Session

from config import ENABLE_BACKGROUND_WORKER
from database import Campaign, Lead, LeadStatus, User, get_db
from routers.auth import get_current_user
from security import enforce_rate_limit
from services.campaign_service import sync_campaign_stats
from services.lead_gen_service import LeadGenerationError
from tasks import run_lead_gen_task

router = APIRouter()


class LeadGenSource(str, Enum):
    google_maps = "google_maps"
    linkedin = "linkedin"
    apollo = "apollo"
    job_portal = "job_portal"
    web_search = "web_search"


class LeadGenMethod(str, Enum):
    selenium = "selenium"
    apollo = "apollo"


class JobPortal(str, Enum):
    naukri = "naukri"
    indeed = "indeed"
    linkedin_jobs = "linkedin_jobs"


class LeadGenRequest(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True)

    source: LeadGenSource = LeadGenSource.google_maps
    query: str = Field(min_length=2, max_length=120)
    location: str = Field(default="", max_length=120)
    industry: str = Field(default="", max_length=120)
    method: LeadGenMethod = LeadGenMethod.selenium
    portal: JobPortal = JobPortal.naukri
    max: int = Field(default=50, ge=1, le=200)
    campaign_id: Optional[int] = None


SOURCE_LABELS = {
    "google_maps": "Google Maps",
    "linkedin_selenium": "LinkedIn browser search",
    "apollo": "Apollo",
    "naukri": "Naukri",
    "indeed": "Indeed",
    "linkedin_jobs": "LinkedIn Jobs",
    "web_search": "Web Search",
}


class LeadUpdate(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True)

    name: Optional[str] = Field(default=None, max_length=120)
    email: Optional[str] = Field(default=None, max_length=255)
    company: Optional[str] = Field(default=None, max_length=160)
    title: Optional[str] = Field(default=None, max_length=120)
    notes: Optional[str] = Field(default=None, max_length=1000)
    status: Optional[LeadStatus] = None
    campaign_id: Optional[int] = None


@router.post("/generate")
def generate_leads(
    body: LeadGenRequest,
    request: Request,
    background_tasks: BackgroundTasks,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    enforce_rate_limit(request, "lead_generate", limit=6, window_seconds=60, identifier=current_user.id)

    remaining_quota = max((current_user.leads_quota or 0) - (current_user.leads_used or 0), 0)
    if remaining_quota <= 0:
        raise HTTPException(402, "Lead quota exhausted. Upgrade your plan.")

    if body.campaign_id:
        campaign = db.query(Campaign).filter(
            Campaign.id == body.campaign_id,
            Campaign.user_id == current_user.id,
        ).first()
        if not campaign:
            raise HTTPException(404, "Campaign not found")

    payload = body.model_dump()
    payload["max"] = min(body.max, remaining_quota)
    if ENABLE_BACKGROUND_WORKER:
        background_tasks.add_task(run_lead_gen_task, current_user.id, payload)
        return {
            "message": "Lead generation has been queued.",
            "status": "running",
            "max_results": payload["max"],
        }

    try:
        result = run_lead_gen_task(current_user.id, payload) or {}
    except LeadGenerationError as exc:
        raise HTTPException(400, str(exc)) from exc

    source_used = SOURCE_LABELS.get(result.get("source_used"), "the selected source")
    added = result.get("added", 0)
    message = f"Imported {added} lead{'s' if added != 1 else ''} from {source_used}."
    if result.get("duplicates_skipped"):
        message += f" Skipped {result['duplicates_skipped']} duplicate{'s' if result['duplicates_skipped'] != 1 else ''}."

    return {
        **result,
        "message": message,
        "max_results": payload["max"],
    }


@router.get("/")
def list_leads(
    page: int = Query(default=1, ge=1),
    per_page: int = Query(default=50, ge=1, le=100),
    status: Optional[LeadStatus] = None,
    campaign_id: Optional[int] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    q = db.query(Lead).filter(Lead.user_id == current_user.id)
    if status:
        q = q.filter(Lead.status == status)
    if campaign_id is not None:
        q = q.filter(Lead.campaign_id == campaign_id)

    total = q.count()
    leads = (
        q.order_by(Lead.created_at.desc())
        .offset((page - 1) * per_page)
        .limit(per_page)
        .all()
    )
    return {
        "total": total,
        "page": page,
        "per_page": per_page,
        "leads": [_lead_dict(lead) for lead in leads],
    }


@router.patch("/{lead_id}")
def update_lead(
    lead_id: int,
    body: LeadUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    lead = db.query(Lead).filter(Lead.id == lead_id, Lead.user_id == current_user.id).first()
    if not lead:
        raise HTTPException(404, "Lead not found")

    updates = body.model_dump(exclude_none=True)
    if "campaign_id" in body.model_fields_set:
        updates["campaign_id"] = body.campaign_id
    previous_campaign_id = lead.campaign_id

    if "campaign_id" in updates and updates["campaign_id"]:
        campaign = db.query(Campaign).filter(
            Campaign.id == updates["campaign_id"],
            Campaign.user_id == current_user.id,
        ).first()
        if not campaign:
            raise HTTPException(404, "Campaign not found")

    for field, value in updates.items():
        setattr(lead, field, value)

    db.commit()
    sync_campaign_stats(db, previous_campaign_id)
    sync_campaign_stats(db, lead.campaign_id)
    db.commit()
    db.refresh(lead)
    return _lead_dict(lead)


@router.delete("/{lead_id}")
def delete_lead(
    lead_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    lead = db.query(Lead).filter(Lead.id == lead_id, Lead.user_id == current_user.id).first()
    if not lead:
        raise HTTPException(404, "Lead not found")

    campaign_id = lead.campaign_id
    db.delete(lead)
    db.commit()
    sync_campaign_stats(db, campaign_id)
    db.commit()
    return {"deleted": True}


def _lead_dict(lead: Lead) -> dict:
    return {
        "id": lead.id,
        "name": lead.name,
        "email": lead.email,
        "company": lead.company,
        "title": lead.title,
        "phone": lead.phone,
        "website": lead.website,
        "linkedin_url": lead.linkedin_url,
        "industry": lead.industry,
        "company_size": lead.company_size,
        "location": lead.location,
        "source": lead.source.value if hasattr(lead.source, "value") else lead.source,
        "status": lead.status.value if hasattr(lead.status, "value") else lead.status,
        "sent_date": str(lead.sent_date) if lead.sent_date else None,
        "follow_up_sent": lead.follow_up_sent,
        "replied": lead.replied,
        "notes": lead.notes,
        "campaign_id": lead.campaign_id,
        "created_at": str(lead.created_at),
    }
