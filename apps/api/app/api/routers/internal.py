"""Internal cron-tick endpoints (plan amendment D-001).

On the Render deployment a GitHub Actions schedule calls these with the
shared CRON_SECRET; in compose/self-host, Celery beat covers the same work
and these endpoints are simply unused. Phase 4 fills in the actual tick work
(due campaign sends, follow-ups, job processing) — each tick must be bounded
and idempotent.
"""
import hmac
import logging

from fastapi import APIRouter, Header, HTTPException

from app.core.settings import get_settings

router = APIRouter()
logger = logging.getLogger("reachflow.cron")


def _verify(secret_header: str | None) -> None:
    expected = get_settings().cron_secret
    if not expected:
        raise HTTPException(503, "Cron ticks are not configured (CRON_SECRET unset).")
    if not secret_header or not hmac.compare_digest(secret_header, expected):
        raise HTTPException(401, "Invalid cron secret.")


@router.post("/cron/tick")
def cron_tick(x_cron_secret: str | None = Header(default=None)):
    _verify(x_cron_secret)
    # Phase 4: process due sends / follow-ups / generation jobs in bounded batches.
    logger.info("cron tick", extra={"event": "cron_tick"})
    return {"processed": 0, "note": "tick scaffold — work added in Phase 4"}
