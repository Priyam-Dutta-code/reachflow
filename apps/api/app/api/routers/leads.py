"""Leads — PORTED V1 contracts; generation is now an async job (Phase 4).

POST /generate returns a job_id immediately (V1 keys `status`/`message`
kept); GET /generate/{job_id} reports progress. Quota is reserved atomically
up-front and unused reservation refunded after the run.
"""
from enum import Enum

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Query, Request
from pydantic import BaseModel, ConfigDict, Field
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.core.rate_limit import enforce_rate_limit
from app.core.settings import get_settings
from app.db.models import Campaign, Job, JobStatus, Lead, LeadStatus, User
from app.db.session import get_db
from app.services.campaign_service import sync_campaign_stats
from app.services.jobs import create_lead_gen_job, process_lead_gen_job
from app.services.quota import QUOTA_EXHAUSTED, remaining_quota, reserve_quota
from app.services.verticals import get_vertical_config

router = APIRouter()

UNVERIFIED_SAMPLE_CAP = 15  # explore freely; big runs need a verified email


class LeadGenSource(str, Enum):
    auto = "auto"
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

    source: LeadGenSource = LeadGenSource.auto
    query: str = Field(min_length=2, max_length=120)
    location: str = Field(default="", max_length=120)
    industry: str = Field(default="", max_length=120)
    audience: str = Field(default="", max_length=120)
    offer: str = Field(default="", max_length=160)
    goal: str = Field(default="", max_length=160)
    method: LeadGenMethod = LeadGenMethod.selenium
    portal: JobPortal = JobPortal.naukri
    max: int = Field(default=50, ge=1, le=200)
    campaign_id: int | None = None


SOURCE_LABELS = {
    "vertical_intelligence": "Vertical intelligence",
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

    name: str | None = Field(default=None, max_length=120)
    email: str | None = Field(default=None, max_length=255)
    company: str | None = Field(default=None, max_length=160)
    title: str | None = Field(default=None, max_length=120)
    notes: str | None = Field(default=None, max_length=1000)
    status: LeadStatus | None = None
    campaign_id: int | None = None


def _dispatch_job(job_id: str, background_tasks: BackgroundTasks) -> None:
    settings = get_settings()
    if settings.enable_background_worker and settings.redis_url:
        from app.workers.tasks import lead_gen

        lead_gen.delay(job_id)
    else:
        background_tasks.add_task(process_lead_gen_job, job_id)


@router.post("/generate")
def generate_leads(
    body: LeadGenRequest,
    request: Request,
    background_tasks: BackgroundTasks,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    enforce_rate_limit(request, "lead_generate", limit=6, window_seconds=60, identifier=current_user.id)

    if remaining_quota(current_user) <= 0:
        raise HTTPException(402, QUOTA_EXHAUSTED)

    if body.campaign_id:
        campaign = db.query(Campaign).filter(
            Campaign.id == body.campaign_id,
            Campaign.user_id == current_user.id,
        ).first()
        if not campaign:
            raise HTTPException(404, "Campaign not found")

    requested = body.max
    if not current_user.email_verified_at:
        requested = min(requested, UNVERIFIED_SAMPLE_CAP)

    reserved = reserve_quota(db, current_user.id, requested)
    if reserved <= 0:
        raise HTTPException(402, QUOTA_EXHAUSTED)

    payload = body.model_dump()
    payload["max"] = reserved
    payload["vertical"] = current_user.vertical or "business_growth"

    job = create_lead_gen_job(db, current_user, payload, reserved)
    _dispatch_job(job.id, background_tasks)

    return {
        "job_id": job.id,
        "status": "running",
        "message": "Lead generation has started. Track progress with the job id.",
        "max_results": reserved,
    }


@router.get("/generate/{job_id}")
def generation_status(
    job_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    job = db.query(Job).filter(Job.id == job_id, Job.user_id == current_user.id).first()
    if not job:
        raise HTTPException(404, "Job not found")

    response = {
        "job_id": job.id,
        "status": job.status.value if hasattr(job.status, "value") else job.status,
        "progress": job.progress or 0,
    }

    if job.status == JobStatus.failed:
        response["message"] = job.error or "Lead generation failed."
        return response

    if job.status == JobStatus.completed:
        result = job.result or {}
        vertical_config = get_vertical_config(current_user.vertical)
        if result.get("source_used") == "vertical_intelligence":
            source_used = vertical_config["generator_label"]
        else:
            source_used = SOURCE_LABELS.get(result.get("source_used"), "the selected source")
        added = result.get("added", 0)
        message = f"Imported {added} lead{'s' if added != 1 else ''} from {source_used}."
        if result.get("resources_used"):
            message += f" Sources used: {', '.join(result['resources_used'])}."
        if result.get("duplicates_skipped"):
            count = result["duplicates_skipped"]
            message += f" Skipped {count} duplicate{'s' if count != 1 else ''}."
        response.update({**result, "message": message})
        if result.get("warning"):
            response["warning"] = result["warning"]

    return response


@router.get("/")
def list_leads(
    page: int = Query(default=1, ge=1),
    per_page: int = Query(default=50, ge=1, le=100),
    status: LeadStatus | None = None,
    campaign_id: int | None = None,
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
        "leads": [lead_dict(lead) for lead in leads],
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
    return lead_dict(lead)


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


def lead_dict(lead: Lead) -> dict:
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
