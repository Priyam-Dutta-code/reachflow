"""Refresh-token sessions (Phase 3).

One row per issued refresh token; only the SHA-256 hash is stored. Rotation
creates a new row in the same `family_id`; presenting a rotated (revoked)
token revokes the entire family — the classic stolen-refresh-token defense.
"""
from datetime import datetime
from uuid import uuid4

from sqlalchemy import Column, DateTime, ForeignKey, Index, String

from app.db.base import Base


def _new_id() -> str:
    return uuid4().hex


class AuthSession(Base):
    __tablename__ = "auth_sessions"
    __table_args__ = (
        Index("ix_auth_sessions_family", "family_id"),
        Index("ix_auth_sessions_user", "user_id"),
    )

    id           = Column(String, primary_key=True, default=_new_id)
    user_id      = Column(String, ForeignKey("users.id"), nullable=False)
    family_id    = Column(String, nullable=False, default=_new_id)
    token_hash   = Column(String, unique=True, nullable=False, index=True)
    user_agent   = Column(String, default="")
    ip           = Column(String, default="")
    created_at   = Column(DateTime, default=datetime.utcnow)
    last_used_at = Column(DateTime, default=datetime.utcnow)
    expires_at   = Column(DateTime, nullable=False)
    revoked_at   = Column(DateTime)
