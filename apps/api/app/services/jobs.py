"""Job lifecycle + the cron-tick orchestrator (Phase 4, dual-mode per D-001).

Lead generation runs as a Job row processed by either Celery (compose) or a
FastAPI BackgroundTask (Render). The cron tick recovers stale queued jobs
(BackgroundTask died on deploy/restart), advances due campaign sends, and
runs follow-ups — every action bounded and idempotent.
"""
import logging
from datetime import datetime, timedelta

from sqlalchemy.orm import Session

from app.db.models import Campaign, Job, JobStatus, Lead, LeadSource, User
from app.db.session import get_session_factory
from app.services.campaign_service import sync_campaign_stats
from app.services.leads import LeadGenerationError, run_lead_gen
from app.services.quota import refund_quota
from app.services.send_engine import process_followups, run_campaign_batch

logger = logging.getLogger("reachflow.jobs")

STALE_QUEUED_AFTER = timedelta(minutes=3)
TICK_MAX_JOBS = 2
TICK_MAX_SENDS = 10
TICK_MAX_FOLLOWUPS = 10


def create_lead_gen_job(db: Session, user: User, params: dict, reserved: int) -> Job:
    job = Job(
        user_id=user.id,
        type="lead_generation",
        status=JobStatus.queued,
        progress=0,
        params={**params, "reserved": reserved},
    )
    db.add(job)
    db.commit()
    db.refresh(job)
    return job


def process_lead_gen_job(job_id: str) -> None:
    """Run a queued lead-generation job to completion. Own session — runs in
    a worker, a BackgroundTask, or a cron tick."""
    db: Session = get_session_factory()()
    try:
        job = db.get(Job, job_id)
        if not job or job.status not in (JobStatus.queued,):
            return
        job.status = JobStatus.running
        job.started_at = datetime.utcnow()
        job.progress = 10
        db.commit()

        params = dict(job.params or {})
        reserved = int(params.pop("reserved", 0))
        user = db.get(User, job.user_id)
        if not user:
            _fail(db, job, "Account no longer exists.", reserved)
            return

        try:
            result = run_lead_gen(params)
        except LeadGenerationError as exc:
            refund_quota(db, job.user_id, reserved)
            _fail(db, job, str(exc), 0)
            return

        job.progress = 70
        db.commit()

        added, duplicates = _insert_leads(
            db, user, result.get("leads", []), params.get("campaign_id")
        )
        # release whatever the run didn't use
        refund_quota(db, user.id, max(reserved - added, 0))
        sync_campaign_stats(db, params.get("campaign_id"))

        job.status = JobStatus.completed
        job.progress = 100
        job.finished_at = datetime.utcnow()
        job.result = {
            "added": added,
            "duplicates_skipped": duplicates,
            "total_found": len(result.get("leads", [])),
            "source_used": result.get("source_used"),
            "resources_used": result.get("resources_used") or [],
            "warning": result.get("warning"),
        }
        db.commit()
        logger.info("lead gen job done: +%d leads", added, extra={"event": "job_completed"})
    except Exception as exc:
        logger.error("lead gen job crashed", exc_info=exc)
        try:
            job = db.get(Job, job_id)
            if job and job.status != JobStatus.completed:
                reserved = int((job.params or {}).get("reserved", 0))
                _fail(db, job, "Lead generation hit an unexpected error. Please try again.", reserved)
        except Exception:
            pass
    finally:
        db.close()


def _fail(db: Session, job: Job, message: str, refund: int) -> None:
    if refund:
        refund_quota(db, job.user_id, refund)
    job.status = JobStatus.failed
    job.error = message
    job.finished_at = datetime.utcnow()
    db.commit()


def _insert_leads(db: Session, user: User, leads: list[dict], campaign_id) -> tuple[int, int]:
    """PORTED from V1 `_lead_gen_impl`: dedupe against existing emails, insert."""
    existing_emails = {
        record[0].lower()
        for record in db.query(Lead.email).filter(Lead.user_id == user.id, Lead.email != None).all()  # noqa: E711
        if record[0]
    }
    added = duplicates = 0

    for lead_data in leads:
        email_address = (lead_data.get("email") or "").lower().strip()
        if email_address and email_address in existing_emails:
            duplicates += 1
            continue
        if email_address:
            existing_emails.add(email_address)

        source_value = lead_data.get("source", LeadSource.manual)
        try:
            lead_source = LeadSource(source_value) if isinstance(source_value, str) else source_value
        except Exception:
            lead_source = LeadSource.manual

        db.add(
            Lead(
                user_id=user.id,
                name=lead_data.get("name", ""),
                email=lead_data.get("email", ""),
                company=lead_data.get("company", ""),
                title=lead_data.get("title", ""),
                phone=lead_data.get("phone", ""),
                website=lead_data.get("website", ""),
                linkedin_url=lead_data.get("linkedin_url", ""),
                industry=lead_data.get("industry", ""),
                company_size=lead_data.get("company_size", ""),
                location=lead_data.get("location", ""),
                source=lead_source,
                notes=lead_data.get("notes", ""),
                campaign_id=campaign_id,
            )
        )
        added += 1
        if added % 20 == 0:
            db.commit()

    db.commit()
    return added, duplicates


# ── Cron tick (Render mode) / beat helpers (compose mode) ─────────────

def process_due_work() -> dict:
    """One bounded, idempotent slice of background work. Safe to call from
    the cron tick at any frequency."""
    db: Session = get_session_factory()()
    summary = {"jobs": 0, "sends": 0, "followups": 0}
    try:
        # 1. stale queued jobs (their BackgroundTask died)
        cutoff = datetime.utcnow() - STALE_QUEUED_AFTER
        stale = (
            db.query(Job)
            .filter(Job.status == JobStatus.queued, Job.created_at < cutoff)
            .order_by(Job.created_at)
            .limit(TICK_MAX_JOBS)
            .all()
        )
        stale_ids = [job.id for job in stale]
        db.close()  # process_lead_gen_job opens its own session
        for job_id in stale_ids:
            process_lead_gen_job(job_id)
            summary["jobs"] += 1

        # 2. due campaign sends (one campaign per tick, small batch)
        db = get_session_factory()()
        from app.services.campaign_service import due_campaigns

        for campaign in due_campaigns(db):
            result = run_campaign_batch(
                db, campaign.user_id, campaign.id, batch_limit=TICK_MAX_SENDS, pace_seconds=0.5
            )
            summary["sends"] += result.get("sent", 0)
            if result.get("sent"):
                break  # one campaign slice per tick keeps ticks fast

        # 3. follow-ups for users with sends due (bounded)
        user_ids = [
            row[0]
            for row in db.query(Campaign.user_id).filter(
                Campaign.status.in_(["active", "complete"])
            ).distinct().limit(10)
        ]
        for user_id in user_ids:
            if summary["followups"] >= TICK_MAX_FOLLOWUPS:
                break
            result = process_followups(db, user_id, batch_limit=TICK_MAX_FOLLOWUPS - summary["followups"])
            summary["followups"] += result.get("sent", 0)

        return summary
    finally:
        db.close()
