"""EmailLog model — PORTED from V1; adds the (user_id, sent_at) index."""
from datetime import datetime

from sqlalchemy import Boolean, Column, DateTime, ForeignKey, Index, Integer, String, Text
from sqlalchemy.orm import relationship

from app.db.base import Base


class EmailLog(Base):
    __tablename__ = "email_logs"
    __table_args__ = (
        Index("ix_email_logs_user_sent", "user_id", "sent_at"),
    )

    id          = Column(Integer, primary_key=True, index=True)
    user_id     = Column(String, ForeignKey("users.id"), nullable=False)
    campaign_id = Column(Integer, ForeignKey("campaigns.id"), nullable=True)
    lead_id     = Column(Integer, ForeignKey("leads.id"), nullable=True)
    to_email    = Column(String)
    subject     = Column(String)
    body        = Column(Text)
    status      = Column(String, default="sent")
    is_followup = Column(Boolean, default=False)
    sent_at     = Column(DateTime, default=datetime.utcnow)

    campaign = relationship("Campaign", back_populates="email_logs")
