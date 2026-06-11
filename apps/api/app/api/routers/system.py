"""Health endpoint — db + redis aware. Doubles as the keep-alive target
(UptimeRobot pings keep Render warm and Supabase active, per D-001)."""
from fastapi import APIRouter, Response
from sqlalchemy import text

from app.core.settings import get_settings
from app.db.session import get_engine

router = APIRouter()


def _check_db() -> str:
    try:
        with get_engine().connect() as conn:
            conn.execute(text("SELECT 1"))
        return "ok"
    except Exception as exc:
        return f"error: {type(exc).__name__}"


def _check_redis() -> str:
    url = get_settings().redis_url
    if not url:
        return "disabled"
    try:
        import redis as redis_lib

        redis_lib.from_url(url, socket_connect_timeout=2).ping()
        return "ok"
    except Exception as exc:
        return f"error: {type(exc).__name__}"


@router.get("/health")
def health(response: Response):
    db = _check_db()
    cache = _check_redis()
    healthy = db == "ok" and cache in ("ok", "disabled")
    if not healthy:
        response.status_code = 503
    return {
        "status": "ok" if healthy else "degraded",
        "service": "ReachFlow API",
        "version": "2.0.0",
        "db": db,
        "redis": cache,
    }
