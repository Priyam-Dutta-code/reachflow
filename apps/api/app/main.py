"""ReachFlow V2 API — Phase 0 stub.

Proves the compose wiring (db + redis reachable from the api container).
Phase 2 replaces this with the real application layout
(core/, db/, schemas/, api/routers/, services/, workers/).
"""
import os

from fastapi import FastAPI

app = FastAPI(title="ReachFlow API (V2 stub)", version="2.0.0-phase0")


def _check_db() -> str:
    url = os.environ.get("DATABASE_URL", "")
    if not url:
        return "unconfigured"
    try:
        import psycopg

        with psycopg.connect(url, connect_timeout=3) as conn:
            with conn.cursor() as cur:
                cur.execute("SELECT 1")
                cur.fetchone()
        return "ok"
    except Exception as exc:  # pragma: no cover - stub
        return f"error: {type(exc).__name__}"


def _check_redis() -> str:
    url = os.environ.get("REDIS_URL", "")
    if not url:
        return "unconfigured"
    try:
        import redis

        client = redis.from_url(url, socket_connect_timeout=3)
        client.ping()
        return "ok"
    except Exception as exc:  # pragma: no cover - stub
        return f"error: {type(exc).__name__}"


@app.get("/health")
def health():
    db = _check_db()
    cache = _check_redis()
    healthy = db == "ok" and cache == "ok"
    return {
        "status": "ok" if healthy else "degraded",
        "service": "ReachFlow API",
        "version": "2.0.0-phase0",
        "db": db,
        "redis": cache,
    }


@app.get("/")
def root():
    return {"service": "ReachFlow API", "phase": 0, "docs": "/docs"}
