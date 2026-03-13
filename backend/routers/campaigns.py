"""routers/campaigns.py - Campaign management."""
from datetime import datetime
from typing import Optional

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Request
from pydantic import BaseModel, ConfigDict, Field
from sqlalchemy.orm import Session

from database import Campaign, CampaignStatus, Lead, LeadStatus, User, get_db
from routers.auth import get_current_user
from security import enforce_rate_limit, secret_manager
from services.campaign_service import sync_campaign_stats
from tasks import run_campaign_batch

router = APIRouter()


class CampaignCreate(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True)

    name: str = Field(min_length=2, max_length=120)
    description: str = Field(default="", max_length=600)
    emails_per_day: int = Field(default=50, ge=1, le=500)
    send_time: str = Field(default="09:00", pattern=r"^\d{2}:\d{2}$")
    follow_up_days: int = Field(default=5, ge=1, le=30)


class CampaignUpdate(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True)

    name: Optional[str] = Field(default=None, min_length=2, max_length=120)
    description: Optional[str] = Field(default=None, max_length=600)
    emails_per_day: Optional[int] = Field(default=None, ge=1, le=500)
    send_time: Optional[str] = Field(default=None, pattern=r"^\d{2}:\d{2}$")
    follow_up_days: Optional[int] = Field(default=None, ge=1, le=30)
    status: Optional[CampaignStatus] = None


@router.post("/")
def create_campaign(
    body: CampaignCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    campaign = Campaign(
        user_id=current_user.id,
        name=body.name,
        description=body.description,
        emails_per_day=body.emails_per_day,
        send_time=body.send_time,
        follow_up_days=body.follow_up_days,
    )
    db.add(campaign)
    db.commit()
    db.refresh(campaign)
    return _camp_dict(campaign, db)


@router.get("/")
def list_campaigns(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    campaigns = (
        db.query(Campaign)
        .filter(Campaign.user_id == current_user.id)
        .order_by(Campaign.created_at.desc())
        .all()
    )

    for campaign in campaigns:
        sync_campaign_stats(db, campaign.id)
    db.commit()

    return [_camp_dict(campaign, db) for campaign in campaigns]


@router.patch("/{campaign_id}")
def update_campaign(
    campaign_id: int,
    body: CampaignUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    campaign = db.query(Campaign).filter(
        Campaign.id == campaign_id,
        Campaign.user_id == current_user.id,
    ).first()
    if not campaign:
        raise HTTPException(404, "Campaign not found")

    for field, value in body.model_dump(exclude_none=True).items():
        setattr(campaign, field, value)
    campaign.updated_at = datetime.utcnow()
    db.commit()
    sync_campaign_stats(db, campaign.id)
    db.commit()
    db.refresh(campaign)
    return _camp_dict(campaign, db)


@router.post("/{campaign_id}/send-now")
def send_now(
    campaign_id: int,
    request: Request,
    background_tasks: BackgroundTasks,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    enforce_rate_limit(request, "campaign_send", limit=4, window_seconds=60, identifier=current_user.id)

    campaign = db.query(Campaign).filter(
        Campaign.id == campaign_id,
        Campaign.user_id == current_user.id,
    ).first()
    if not campaign:
        raise HTTPException(404, "Campaign not found")

    if current_user.credits <= 0:
        raise HTTPException(402, "No email credits left. Top up to continue.")

    try:
        smtp_password = secret_manager.decrypt(current_user.gmail_password)
    except RuntimeError as exc:
        raise HTTPException(500, str(exc))

    if not current_user.sender_email or not smtp_password:
        raise HTTPException(400, "Connect a sender email and Gmail app password before sending.")

    eligible_leads = db.query(Lead).filter(
        Lead.user_id == current_user.id,
        Lead.campaign_id == campaign_id,
        Lead.status == LeadStatus.pending,
        Lead.email != None,  # noqa: E711
        Lead.email != "",
    ).count()
    if eligible_leads <= 0:
        raise HTTPException(400, "This campaign has no attached leads with email addresses.")

    background_tasks.add_task(run_campaign_batch, current_user.id, campaign_id)
    campaign.status = CampaignStatus.active
    campaign.updated_at = datetime.utcnow()
    db.commit()
    return {"message": "Campaign batch started", "eligible_leads": eligible_leads}


@router.delete("/{campaign_id}")
def delete_campaign(
    campaign_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    campaign = db.query(Campaign).filter(
        Campaign.id == campaign_id,
        Campaign.user_id == current_user.id,
    ).first()
    if not campaign:
        raise HTTPException(404, "Campaign not found")

    db.delete(campaign)
    db.commit()
    return {"deleted": True}


def _camp_dict(campaign: Campaign, db: Session) -> dict:
    eligible = db.query(Lead).filter(
        Lead.campaign_id == campaign.id,
        Lead.status == LeadStatus.pending,
        Lead.email != None,  # noqa: E711
        Lead.email != "",
    ).count()
    return {
        "id": campaign.id,
        "name": campaign.name,
        "description": campaign.description,
        "status": campaign.status.value if hasattr(campaign.status, "value") else campaign.status,
        "emails_per_day": campaign.emails_per_day,
        "send_time": campaign.send_time,
        "follow_up_days": campaign.follow_up_days,
        "total_leads": campaign.total_leads,
        "total_sent": campaign.total_sent,
        "total_replied": campaign.total_replied,
        "total_bounced": campaign.total_bounced,
        "eligible_leads": eligible,
        "created_at": str(campaign.created_at),
    }
