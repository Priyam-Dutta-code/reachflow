"""Rate limiting — Redis-backed fixed window with in-memory fallback.

Ported from V1 (battle-tested) and exposed as a FastAPI dependency factory:

    @router.post("/login", dependencies=[rate_limit("auth_login", 5, 60)])

On Render free (no Redis) the in-memory fallback is correct for a single
instance; in compose/self-host the Redis path makes limits cross-process.
"""
import hashlib
import threading
import time
from collections import defaultdict, deque

from fastapi import Depends, HTTPException, Request

from app.core.settings import get_settings


class RateLimiter:
    def __init__(self, redis_url: str):
        self._redis = None
        if redis_url:
            try:
                import redis as redis_lib

                self._redis = redis_lib.from_url(
                    redis_url, decode_responses=True, socket_connect_timeout=2
                )
                self._redis.ping()
            except Exception:
                self._redis = None

        self._memory: defaultdict[str, deque[float]] = defaultdict(deque)
        self._lock = threading.Lock()

    def allow(self, key: str, limit: int, window_seconds: int) -> bool:
        now = time.time()
        if self._redis:
            try:
                pipe = self._redis.pipeline()
                pipe.incr(key)
                pipe.expire(key, window_seconds, nx=True)
                count, _ = pipe.execute()
                return int(count) <= limit
            except Exception:
                pass  # fall through to memory

        with self._lock:
            bucket = self._memory[key]
            cutoff = now - window_seconds
            while bucket and bucket[0] <= cutoff:
                bucket.popleft()
            if len(bucket) >= limit:
                return False
            bucket.append(now)
            return True


_limiter: RateLimiter | None = None


def get_limiter() -> RateLimiter:
    global _limiter
    if _limiter is None:
        _limiter = RateLimiter(get_settings().redis_url)
    return _limiter


def client_ip(request: Request) -> str:
    forwarded = request.headers.get("x-forwarded-for", "")
    if forwarded:
        return forwarded.split(",")[0].strip()
    return request.client.host if request.client else "unknown"


def enforce_rate_limit(
    request: Request,
    scope: str,
    limit: int,
    window_seconds: int,
    identifier: str = "",
) -> None:
    fingerprint = ":".join(p for p in (client_ip(request), request.url.path, identifier) if p)
    key = f"rl:{scope}:{hashlib.sha256(fingerprint.encode('utf-8')).hexdigest()}"
    if not get_limiter().allow(key, limit, window_seconds):
        raise HTTPException(429, "Too many requests. Please try again shortly.")


def rate_limit(scope: str, limit: int, window_seconds: int):
    """Dependency factory for route-level limits keyed by client IP + path."""

    def dependency(request: Request) -> None:
        enforce_rate_limit(request, scope, limit, window_seconds)

    return Depends(dependency)
