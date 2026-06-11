"""Single-use tokens for email verification and password reset (Phase 3).
Only the SHA-256 hash is stored; tokens expire and burn on use."""
from datetime import datetime
from uuid import uuid4

from sqlalchemy import Column, DateTime, ForeignKey, String

from app.db.base import Base


class OneTimeToken(Base):
    __tablename__ = "one_time_tokens"

    id         = Column(String, primary_key=True, default=lambda: uuid4().hex)
    user_id    = Column(String, ForeignKey("users.id"), nullable=False, index=True)
    purpose    = Column(String, nullable=False)  # "verify_email" | "reset_password"
    token_hash = Column(String, unique=True, nullable=False, index=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    expires_at = Column(DateTime, nullable=False)
    used_at    = Column(DateTime)
