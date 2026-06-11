"""Suppression list (Phase 4 compliance). One row = this user must never
email this address again. Checked before EVERY send."""
from datetime import datetime
from uuid import uuid4

from sqlalchemy import Column, DateTime, ForeignKey, String, UniqueConstraint

from app.db.base import Base


class Unsubscribe(Base):
    __tablename__ = "unsubscribes"
    __table_args__ = (
        UniqueConstraint("user_id", "email", name="uq_unsubscribes_user_email"),
    )

    id         = Column(String, primary_key=True, default=lambda: uuid4().hex)
    user_id    = Column(String, ForeignKey("users.id"), nullable=False, index=True)
    email      = Column(String, nullable=False, index=True)  # stored lowercase
    source     = Column(String, default="link")  # link | manual | bounce
    created_at = Column(DateTime, default=datetime.utcnow)
