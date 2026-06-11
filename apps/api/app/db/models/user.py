"""User model — PORTED from V1 with Phase 2/3 additions.

Changes vs V1: PK generated server-side (`uuid4().hex`) instead of issued by
Supabase; new `password_hash` + `email_verified_at` for the custom auth
(Phase 3 wires them). Everything else is contract-preserved.
"""
from datetime import datetime
from uuid import uuid4

from sqlalchemy import Column, DateTime, Enum, Integer, String, Text
from sqlalchemy.orm import relationship

from app.db.base import Base
from app.db.models.enums import PlanType


def _new_id() -> str:
    return uuid4().hex


class User(Base):
    __tablename__ = "users"

    id               = Column(String, primary_key=True, default=_new_id)
    email            = Column(String, unique=True, nullable=False, index=True)
    name             = Column(String)
    password_hash    = Column(String)                 # Phase 3 (argon2id)
    email_verified_at = Column(DateTime)              # Phase 3
    vertical         = Column(String, default="business_growth")
    plan             = Column(Enum(PlanType), default=PlanType.free)
    plan_key         = Column(String, default="business_growth_starter")
    credits          = Column(Integer, default=50)
    leads_quota      = Column(Integer, default=100)
    leads_used       = Column(Integer, default=0)
    emails_sent      = Column(Integer, default=0)
    subscription_id  = Column(String)
    subscription_end = Column(DateTime)
    cashfree_customer = Column(String)
    sender_name      = Column(String)
    sender_email     = Column(String)
    sender_phone     = Column(String)
    sender_linkedin  = Column(String)
    sender_profile   = Column(Text)
    sender_role      = Column(String)
    gmail_password   = Column(String)   # encrypted at rest (enc: prefix)
    groq_api_key     = Column(String)   # encrypted at rest (enc: prefix)
    created_at       = Column(DateTime, default=datetime.utcnow)

    leads     = relationship("Lead", back_populates="user", cascade="all, delete")
    campaigns = relationship("Campaign", back_populates="user", cascade="all, delete")
