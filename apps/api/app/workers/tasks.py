"""Celery tasks. Phase 2 ships the heartbeat that proves the loop;
Phase 4 ports the real lead-gen / send / follow-up tasks here."""
import logging

from app.workers.celery_app import celery

logger = logging.getLogger("reachflow.worker")


@celery.task(name="heartbeat")
def heartbeat() -> str:
    logger.info("worker heartbeat", extra={"event": "heartbeat"})
    return "ok"
