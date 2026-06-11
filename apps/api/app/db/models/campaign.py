"""Campaign model — PORTED from V1 unchanged."""
from datetime import datetime

from sqlalchemy import Column, DateTime, Enum, ForeignKey, Integer, String, Text
from sqlalchemy.orm import relationship

from app.db.base import Base
from app.db.models.enums import CampaignStatus


class Campaign(Base):
    __tablename__ = "campaigns"

    id             = Column(Integer, primary_key=True, index=True)
    user_id        = Column(String, ForeignKey("users.id"), nullable=False)
    name           = Column(String, nullable=False)
    description    = Column(Text)
    status         = Column(Enum(CampaignStatus), default=CampaignStatus.draft)
    emails_per_day = Column(Integer, default=50)
    send_time      = Column(String, default="09:00")
    follow_up_days = Column(Integer, default=5)
    total_leads    = Column(Integer, default=0)
    total_sent     = Column(Integer, default=0)
    total_replied  = Column(Integer, default=0)
    total_bounced  = Column(Integer, default=0)
    created_at     = Column(DateTime, default=datetime.utcnow)
    updated_at     = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    user       = relationship("User", back_populates="campaigns")
    leads      = relationship("Lead", back_populates="campaign")
    email_logs = relationship("EmailLog", back_populates="campaign", cascade="all, delete")
