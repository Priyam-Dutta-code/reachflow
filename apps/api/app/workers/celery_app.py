"""Celery application — the compose/self-host job runner.

On Render free (no Redis, D-001) Celery is unused: jobs run via FastAPI
BackgroundTasks plus the /internal/cron/tick endpoint. Both paths share the
same task functions (Phase 4) so behavior is identical.
"""
from celery import Celery

from app.core.settings import get_settings

settings = get_settings()

broker_url = settings.redis_url or "memory://"
result_backend = settings.redis_url or "cache+memory://"

celery = Celery("reachflow", broker=broker_url, backend=result_backend)
celery.conf.timezone = "Asia/Kolkata"
celery.conf.task_default_queue = "reachflow"
celery.conf.broker_connection_retry_on_startup = True

celery.conf.beat_schedule = {
    "heartbeat": {"task": "heartbeat", "schedule": 300.0},
    # Advance due campaigns every 15 min (respects send_time + daily caps)
    "campaign-scheduler": {"task": "campaign_scheduler", "schedule": 900.0},
    # Daily follow-up pass
    "daily-followup": {"task": "followup", "schedule": 86400.0},
}

celery.autodiscover_tasks(["app.workers"])
