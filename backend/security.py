import base64
import hashlib
import re
import threading
import time
from collections import defaultdict, deque
from typing import Optional
from urllib.parse import urlparse

import redis
from cryptography.fernet import Fernet, InvalidToken
from fastapi import HTTPException, Request

from config import APP_ENCRYPTION_KEY, REDIS_URL


def _normalize_url(url: str) -> str:
    parsed = urlparse(url.strip())
    if not parsed.scheme or not parsed.netloc:
        return ""
    return f"{parsed.scheme}://{parsed.netloc}".rstrip("/")


def build_allowed_origins(frontend_url: str) -> list[str]:
    origins = {
        "http://localhost:3000",
        "https://localhost:3000",
        "http://127.0.0.1:3000",
        "https://127.0.0.1:3000",
    }
    normalized = _normalize_url(frontend_url)
    if normalized:
        origins.add(normalized)
    return sorted(origins)


def build_preview_origin_regex(frontend_url: str, explicit_regex: str) -> Optional[str]:
    if explicit_regex:
        return explicit_regex

    parsed = urlparse(frontend_url)
    host = parsed.netloc.split(":")[0]
    if not host.endswith(".vercel.app"):
        return None

    project = re.escape(host.split(".")[0])
    return rf"^https://{project}(?:-git-[a-z0-9-]+)?\.vercel\.app$"


def build_allowed_hosts(api_url: str) -> list[str]:
    hosts = {"localhost", "127.0.0.1"}
    parsed = urlparse(api_url.strip())
    if parsed.netloc:
        host = parsed.netloc.split(":")[0]
        hosts.add(host)
        if host.endswith(".onrender.com"):
            hosts.add("*.onrender.com")
    return sorted(hosts)


class SecretManager:
    def __init__(self, key: str):
        self._fernet: Optional[Fernet] = None
        if key:
            digest = hashlib.sha256(key.encode("utf-8")).digest()
            self._fernet = Fernet(base64.urlsafe_b64encode(digest))

    @property
    def enabled(self) -> bool:
        return self._fernet is not None

    def encrypt(self, value: Optional[str]) -> str:
        plain = (value or "").strip()
        if not plain:
            return ""
        if plain.startswith("enc:"):
            return plain
        if not self._fernet:
            return plain
        token = self._fernet.encrypt(plain.encode("utf-8")).decode("utf-8")
        return f"enc:{token}"

    def decrypt(self, value: Optional[str]) -> str:
        stored = (value or "").strip()
        if not stored:
            return ""
        if not stored.startswith("enc:"):
            return stored
        if not self._fernet:
            raise RuntimeError("APP_ENCRYPTION_KEY is required to decrypt stored secrets.")
        try:
            return self._fernet.decrypt(stored.removeprefix("enc:").encode("utf-8")).decode("utf-8")
        except InvalidToken as exc:
            raise RuntimeError("Stored secret could not be decrypted. Check APP_ENCRYPTION_KEY.") from exc

    def needs_migration(self, value: Optional[str]) -> bool:
        stored = (value or "").strip()
        return bool(stored and self.enabled and not stored.startswith("enc:"))


secret_manager = SecretManager(APP_ENCRYPTION_KEY)


class _RateLimiter:
    def __init__(self, redis_url: str):
        self._redis = None
        if redis_url:
            try:
                self._redis = redis.from_url(redis_url, decode_responses=True)
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
                pass

        with self._lock:
            bucket = self._memory[key]
            cutoff = now - window_seconds
            while bucket and bucket[0] <= cutoff:
                bucket.popleft()
            if len(bucket) >= limit:
                return False
            bucket.append(now)
            return True


rate_limiter = _RateLimiter(REDIS_URL)


def request_fingerprint(request: Request, extra: str = "") -> str:
    forwarded = request.headers.get("x-forwarded-for", "")
    client_ip = forwarded.split(",")[0].strip() if forwarded else (request.client.host if request.client else "unknown")
    parts = [client_ip, request.url.path, extra]
    return ":".join(part for part in parts if part)


def enforce_rate_limit(
    request: Request,
    scope: str,
    limit: int,
    window_seconds: int,
    identifier: str = "",
) -> None:
    fingerprint = request_fingerprint(request, identifier)
    key = f"rl:{scope}:{hashlib.sha256(fingerprint.encode('utf-8')).hexdigest()}"
    if not rate_limiter.allow(key, limit, window_seconds):
        raise HTTPException(429, "Too many requests. Please try again shortly.")
