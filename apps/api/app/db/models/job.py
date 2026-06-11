"""Background jobs (Phase 4) — dual-mode per D-001.

A row is the source of truth for async work (lead generation today). It is
processed by Celery (compose/self-host) or by FastAPI BackgroundTasks with
cron-tick recovery (Render). Idempotent: a job runs once; a tick only picks
up rows still 'queued' past a grace period (the BackgroundTask died).
"""
import enum
from datetime import datetime
from uuid import uuid4

from sqlalchemy import JSON, Column, DateTime, Enum, ForeignKey, Index, Integer, String

from app.db.base import Base


class JobStatus(str, enum.Enum):
    queued = "queued"
    running = "running"
    completed = "completed"
    failed = "failed"


class Job(Base):
    __tablename__ = "jobs"
    __table_args__ = (
        Index("ix_jobs_user_created", "user_id", "created_at"),
        Index("ix_jobs_status", "status"),
    )

    id          = Column(String, primary_key=True, default=lambda: uuid4().hex)
    user_id     = Column(String, ForeignKey("users.id"), nullable=False)
    type        = Column(String, nullable=False, default="lead_generation")
    status      = Column(Enum(JobStatus), default=JobStatus.queued, nullable=False)
    progress    = Column(Integer, default=0)        # 0–100
    params      = Column(JSON, default=dict)
    result      = Column(JSON, default=dict)
    error       = Column(String)
    created_at  = Column(DateTime, default=datetime.utcnow)
    started_at  = Column(DateTime)
    finished_at = Column(DateTime)
