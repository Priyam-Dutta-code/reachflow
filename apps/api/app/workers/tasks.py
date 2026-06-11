"""Celery tasks (compose/self-host mode). Render mode reaches the same
service functions via BackgroundTasks + /internal/cron/tick."""
import logging

from app.db.session import get_session_factory
from app.workers.celery_app import celery

logger = logging.getLogger("reachflow.worker")


@celery.task(name="heartbeat")
def heartbeat() -> str:
    logger.info("worker heartbeat", extra={"event": "heartbeat"})
    return "ok"


@celery.task(name="lead_gen")
def lead_gen(job_id: str) -> None:
    from app.services.jobs import process_lead_gen_job

    process_lead_gen_job(job_id)


@celery.task(name="send_batch")
def send_batch(user_id: str, campaign_id: int) -> None:
    from app.services.send_engine import run_campaign_batch

    db = get_session_factory()()
    try:
        run_campaign_batch(db, user_id, campaign_id)
    finally:
        db.close()


@celery.task(name="campaign_scheduler")
def campaign_scheduler() -> int:
    """Beat: advance every due active campaign (respects send_time + caps)."""
    from app.services.campaign_service import due_campaigns
    from app.services.send_engine import run_campaign_batch

    db = get_session_factory()()
    advanced = 0
    try:
        for campaign in due_campaigns(db):
            result = run_campaign_batch(db, campaign.user_id, campaign.id)
            advanced += result.get("sent", 0)
        return advanced
    finally:
        db.close()


@celery.task(name="followup")
def followup(user_id: str | None = None) -> int:
    """Beat (daily) or per-user trigger: send due follow-ups."""
    from app.db.models import User
    from app.services.send_engine import process_followups

    db = get_session_factory()()
    sent = 0
    try:
        if user_id:
            sent = process_followups(db, user_id).get("sent", 0)
        else:
            for (uid,) in db.query(User.id).all():
                sent += process_followups(db, uid).get("sent", 0)
        return sent
    finally:
        db.close()
