"""Campaigns — PORTED V1 contracts with Phase 4 fixes.

A1 fix: emails_per_day is CLAMPED to the plan's daily cap instead of
rejecting with a 400 (V1's worst first-run bug). The effective value is
returned so the UI can show it.
"""
from datetime import datetime

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Request
from pydantic import BaseModel, ConfigDict, Field
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.core.rate_limit import enforce_rate_limit
from app.core.security import get_secret_manager
from app.core.settings import get_settings
from app.db.models import Campaign, CampaignStatus, Lead, LeadStatus, User
from app.db.session import get_db, get_session_factory
from app.services.campaign_service import eligible_leads_query, sync_campaign_stats
from app.services.verticals import entitlements_for_user

router = APIRouter()


class CampaignCreate(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True)

    name: str = Field(min_length=2, max_length=120)
    description: str = Field(default="", max_length=600)
    emails_per_day: int = Field(default=25, ge=1, le=1000)
    send_time: str = Field(default="09:00", pattern=r"^\d{2}:\d{2}$")
    follow_up_days: int = Field(default=5, ge=1, le=30)


class CampaignUpdate(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True)

    name: str | None = Field(default=None, min_length=2, max_length=120)
    description: str | None = Field(default=None, max_length=600)
    emails_per_day: int | None = Field(default=None, ge=1, le=1000)
    send_time: str | None = Field(default=None, pattern=r"^\d{2}:\d{2}$")
    follow_up_days: int | None = Field(default=None, ge=1, le=30)
    status: CampaignStatus | None = None


def _clamp_daily(user: User, requested: int) -> int:
    cap = entitlements_for_user(user).get("daily_send_cap", 25)
    return min(requested, cap)


@router.post("/")
def create_campaign(
    body: CampaignCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    entitlements = entitlements_for_user(current_user)
    current_count = db.query(Campaign).filter(Campaign.user_id == current_user.id).count()
    if current_count >= entitlements.get("campaign_slots", 1):
        raise HTTPException(
            402,
            {
                "message": "Your current plan has reached its campaign limit. Upgrade to create more campaigns.",
                "reason": "campaign_slots_exhausted",
                "action": "upgrade",
            },
        )

    campaign = Campaign(
        user_id=current_user.id,
        name=body.name,
        description=body.description,
        emails_per_day=_clamp_daily(current_user, body.emails_per_day),
        send_time=body.send_time,
        follow_up_days=body.follow_up_days,
    )
    db.add(campaign)
    db.commit()
    db.refresh(campaign)
    return camp_dict(campaign, db)


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

    return [camp_dict(campaign, db) for campaign in campaigns]


@router.get("/{campaign_id}")
def campaign_detail(
    campaign_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    campaign = db.query(Campaign).filter(
        Campaign.id == campaign_id, Campaign.user_id == current_user.id
    ).first()
    if not campaign:
        raise HTTPException(404, "Campaign not found")
    sync_campaign_stats(db, campaign.id)
    db.commit()

    from app.api.routers.leads import lead_dict

    leads = (
        db.query(Lead)
        .filter(Lead.user_id == current_user.id, Lead.campaign_id == campaign_id)
        .order_by(Lead.created_at.desc())
        .limit(200)
        .all()
    )
    return {**camp_dict(campaign, db), "leads": [lead_dict(lead) for lead in leads]}


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

    payload = body.model_dump(exclude_none=True)
    if "emails_per_day" in payload:
        payload["emails_per_day"] = _clamp_daily(current_user, payload["emails_per_day"])

    for field, value in payload.items():
        setattr(campaign, field, value)
    campaign.updated_at = datetime.utcnow()
    db.commit()
    sync_campaign_stats(db, campaign.id)
    db.commit()
    db.refresh(campaign)
    return camp_dict(campaign, db)


def _run_batch_with_session(user_id: str, campaign_id: int) -> None:
    from app.services.send_engine import run_campaign_batch

    db = get_session_factory()()
    try:
        run_campaign_batch(db, user_id, campaign_id)
    finally:
        db.close()


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

    if not current_user.email_verified_at:
        raise HTTPException(
            403,
            {
                "message": "Verify your email address before sending campaigns. Check your inbox for the confirmation link.",
                "reason": "sender_not_verified",
                "action": "verify_email",
            },
        )

    if (current_user.credits or 0) <= 0:
        raise HTTPException(
            402,
            {"message": "No email credits left. Top up to continue.", "reason": "credits_exhausted", "action": "upgrade"},
        )

    try:
        smtp_password = get_secret_manager().decrypt(current_user.gmail_password)
    except RuntimeError as exc:
        raise HTTPException(500, str(exc)) from exc

    if not current_user.sender_email or not smtp_password:
        raise HTTPException(400, "Connect a sender email and Gmail app password before sending.")

    eligible = eligible_leads_query(db, current_user.id, campaign_id).count()
    if eligible <= 0:
        raise HTTPException(400, "This campaign has no attached leads with email addresses.")

    settings = get_settings()
    if settings.enable_background_worker and settings.redis_url:
        from app.workers.tasks import send_batch

        send_batch.delay(current_user.id, campaign_id)
    else:
        background_tasks.add_task(_run_batch_with_session, current_user.id, campaign_id)

    campaign.status = CampaignStatus.active
    campaign.updated_at = datetime.utcnow()
    db.commit()
    return {"message": "Campaign batch started", "eligible_leads": eligible}


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


def camp_dict(campaign: Campaign, db: Session) -> dict:
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
        "daily_cap": campaign.emails_per_day,
        "created_at": str(campaign.created_at),
    }
