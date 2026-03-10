"""routers/campaigns.py — Campaign Management"""
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional

from database import get_db, User, Campaign, CampaignStatus
from routers.auth import get_current_user
from tasks import run_campaign_batch

router = APIRouter()


class CampaignCreate(BaseModel):
    name:           str
    description:    str = ""
    emails_per_day: int = 50
    send_time:      str = "09:00"
    follow_up_days: int = 5


class CampaignUpdate(BaseModel):
    name:           Optional[str] = None
    description:    Optional[str] = None
    emails_per_day: Optional[int] = None
    send_time:      Optional[str] = None
    follow_up_days: Optional[int] = None
    status:         Optional[str] = None


@router.post("/")
def create_campaign(
    body: CampaignCreate,
    current_user: User = Depends(get_current_user),
    db: Session        = Depends(get_db),
):
    c = Campaign(
        user_id=current_user.id, name=body.name,
        description=body.description, emails_per_day=body.emails_per_day,
        send_time=body.send_time, follow_up_days=body.follow_up_days,
    )
    db.add(c); db.commit(); db.refresh(c)
    return _camp_dict(c)


@router.get("/")
def list_campaigns(
    current_user: User = Depends(get_current_user),
    db: Session        = Depends(get_db),
):
    camps = db.query(Campaign).filter(Campaign.user_id == current_user.id)\
               .order_by(Campaign.created_at.desc()).all()
    return [_camp_dict(c) for c in camps]


@router.patch("/{campaign_id}")
def update_campaign(
    campaign_id: int,
    body: CampaignUpdate,
    current_user: User = Depends(get_current_user),
    db: Session        = Depends(get_db),
):
    c = db.query(Campaign).filter(Campaign.id == campaign_id, Campaign.user_id == current_user.id).first()
    if not c:
        raise HTTPException(404, "Campaign not found")
    for k, v in body.dict(exclude_none=True).items():
        setattr(c, k, v)
    c.updated_at = datetime.utcnow()
    db.commit()
    return _camp_dict(c)


@router.post("/{campaign_id}/send-now")
def send_now(
    campaign_id: int,
    background_tasks: BackgroundTasks,
    current_user: User = Depends(get_current_user),
    db: Session        = Depends(get_db),
):
    c = db.query(Campaign).filter(Campaign.id == campaign_id, Campaign.user_id == current_user.id).first()
    if not c:
        raise HTTPException(404, "Campaign not found")
    if current_user.credits <= 0:
        raise HTTPException(402, "No email credits left. Top up to continue.")
    background_tasks.add_task(run_campaign_batch, current_user.id, campaign_id)
    c.status = CampaignStatus.active
    db.commit()
    return {"message": "Campaign batch started"}


@router.delete("/{campaign_id}")
def delete_campaign(
    campaign_id: int,
    current_user: User = Depends(get_current_user),
    db: Session        = Depends(get_db),
):
    c = db.query(Campaign).filter(Campaign.id == campaign_id, Campaign.user_id == current_user.id).first()
    if not c:
        raise HTTPException(404, "Campaign not found")
    db.delete(c); db.commit()
    return {"deleted": True}


def _camp_dict(c: Campaign) -> dict:
    return {
        "id": c.id, "name": c.name, "description": c.description,
        "status": c.status, "emails_per_day": c.emails_per_day,
        "send_time": c.send_time, "follow_up_days": c.follow_up_days,
        "total_leads": c.total_leads, "total_sent": c.total_sent,
        "total_replied": c.total_replied, "total_bounced": c.total_bounced,
        "created_at": str(c.created_at),
    }
