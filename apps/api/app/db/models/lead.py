"""Lead model — PORTED from V1; adds the (user_id, status) hot-query index."""
from datetime import datetime

from sqlalchemy import (
    Boolean,
    Column,
    DateTime,
    Enum,
    ForeignKey,
    Index,
    Integer,
    String,
    Text,
)
from sqlalchemy.orm import relationship

from app.db.base import Base
from app.db.models.enums import LeadSource, LeadStatus


class Lead(Base):
    __tablename__ = "leads"
    __table_args__ = (
        Index("ix_leads_user_status", "user_id", "status"),
    )

    id             = Column(Integer, primary_key=True, index=True)
    user_id        = Column(String, ForeignKey("users.id"), nullable=False)
    name           = Column(String)
    email          = Column(String)
    company        = Column(String)
    title          = Column(String)
    phone          = Column(String)
    website        = Column(String)
    linkedin_url   = Column(String)
    industry       = Column(String)
    company_size   = Column(String)
    location       = Column(String)
    source         = Column(Enum(LeadSource), default=LeadSource.manual)
    status         = Column(Enum(LeadStatus), default=LeadStatus.pending)
    sent_date      = Column(DateTime)
    follow_up_sent = Column(Boolean, default=False)
    follow_up_date = Column(DateTime)
    replied        = Column(Boolean, default=False)
    notes          = Column(Text)
    campaign_id    = Column(Integer, ForeignKey("campaigns.id"), nullable=True)
    created_at     = Column(DateTime, default=datetime.utcnow)

    user     = relationship("User", back_populates="leads")
    campaign = relationship("Campaign", back_populates="leads")
