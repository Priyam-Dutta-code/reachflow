"""
database.py — SQLAlchemy Models + Session
"""
import enum
from datetime import datetime
from sqlalchemy import (
    create_engine, Column, Integer, String, Text,
    DateTime, Boolean, Float, ForeignKey, Enum
)
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, relationship

from config import DATABASE_URL

engine       = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base         = declarative_base()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


# ── Enums ─────────────────────────────────────────────────

class PlanType(str, enum.Enum):
    free     = "free"
    pro      = "pro"
    agency   = "agency"
    lifetime = "lifetime"

class LeadStatus(str, enum.Enum):
    pending      = "pending"
    sent         = "sent"
    replied      = "replied"
    bounced      = "bounced"
    unsubscribed = "unsubscribed"

class CampaignStatus(str, enum.Enum):
    draft    = "draft"
    active   = "active"
    paused   = "paused"
    complete = "complete"

class LeadSource(str, enum.Enum):
    google_maps       = "google_maps"
    linkedin_selenium = "linkedin_selenium"
    apollo            = "apollo"
    naukri            = "naukri"
    indeed            = "indeed"
    linkedin_jobs     = "linkedin_jobs"
    web_search        = "web_search"
    manual            = "manual"


# ── Models ────────────────────────────────────────────────

class User(Base):
    __tablename__ = "users"

    id               = Column(String, primary_key=True)   # Supabase UUID
    email            = Column(String, unique=True, nullable=False, index=True)
    name             = Column(String)
    plan             = Column(Enum(PlanType), default=PlanType.free)
    credits          = Column(Integer, default=50)
    leads_quota      = Column(Integer, default=100)
    leads_used       = Column(Integer, default=0)
    emails_sent      = Column(Integer, default=0)
    subscription_id  = Column(String)
    subscription_end = Column(DateTime)
    cashfree_customer= Column(String)
    sender_name      = Column(String)
    sender_email     = Column(String)
    sender_phone     = Column(String)
    sender_linkedin  = Column(String)
    sender_profile   = Column(Text)
    sender_role      = Column(String)
    gmail_password   = Column(String)
    groq_api_key     = Column(String)
    created_at       = Column(DateTime, default=datetime.utcnow)

    leads     = relationship("Lead",     back_populates="user", cascade="all, delete")
    campaigns = relationship("Campaign", back_populates="user", cascade="all, delete")


class Lead(Base):
    __tablename__ = "leads"

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

    user     = relationship("User",     back_populates="leads")
    campaign = relationship("Campaign", back_populates="leads")


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

    user       = relationship("User",     back_populates="campaigns")
    leads      = relationship("Lead",     back_populates="campaign")
    email_logs = relationship("EmailLog", back_populates="campaign", cascade="all, delete")


class EmailLog(Base):
    __tablename__ = "email_logs"

    id          = Column(Integer, primary_key=True, index=True)
    user_id     = Column(String, ForeignKey("users.id"), nullable=False)
    campaign_id = Column(Integer, ForeignKey("campaigns.id"), nullable=True)
    lead_id     = Column(Integer, ForeignKey("leads.id"),     nullable=True)
    to_email    = Column(String)
    subject     = Column(String)
    body        = Column(Text)
    status      = Column(String, default="sent")
    is_followup = Column(Boolean, default=False)
    sent_at     = Column(DateTime, default=datetime.utcnow)

    campaign = relationship("Campaign", back_populates="email_logs")


class Payment(Base):
    __tablename__ = "payments"

    id            = Column(Integer, primary_key=True, index=True)
    user_id       = Column(String, ForeignKey("users.id"), nullable=False)
    amount        = Column(Float)
    currency      = Column(String, default="INR")
    plan          = Column(String)
    payment_type  = Column(String)
    provider      = Column(String, default="cashfree")
    provider_id   = Column(String, unique=True)
    status        = Column(String, default="pending")
    credits_added = Column(Integer, default=0)
    created_at    = Column(DateTime, default=datetime.utcnow)
