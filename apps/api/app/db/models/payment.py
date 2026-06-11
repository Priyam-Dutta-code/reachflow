"""Payment model — PORTED from V1 unchanged."""
from datetime import datetime

from sqlalchemy import Column, DateTime, Float, ForeignKey, Integer, String

from app.db.base import Base


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
