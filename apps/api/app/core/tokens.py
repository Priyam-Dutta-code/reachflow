"""Token primitives.

- Access token: HS256 JWT, claims sub/email/jti/iat/exp, short-lived
  (ACCESS_TOKEN_MINUTES). Held in memory client-side; sent as Bearer.
- Refresh / one-time tokens: opaque 256-bit randoms. The server stores only
  their SHA-256 hash — a database leak exposes nothing usable.
"""
import hashlib
import secrets
import uuid
from datetime import datetime, timedelta, timezone

import jwt

from app.core.settings import get_settings


class TokenError(Exception):
    """Invalid, expired, or malformed token."""


def create_access_token(user_id: str, email: str) -> tuple[str, int]:
    """Return (token, expires_in_seconds)."""
    settings = get_settings()
    now = datetime.now(timezone.utc)
    expires_in = settings.access_token_minutes * 60
    payload = {
        "sub": user_id,
        "email": email,
        "jti": uuid.uuid4().hex,
        "iat": now,
        "exp": now + timedelta(seconds=expires_in),
    }
    return jwt.encode(payload, settings.jwt_secret, algorithm="HS256"), expires_in


def decode_access_token(token: str) -> dict:
    try:
        return jwt.decode(token, get_settings().jwt_secret, algorithms=["HS256"])
    except jwt.ExpiredSignatureError as exc:
        raise TokenError("Session expired. Please log in again.") from exc
    except jwt.InvalidTokenError as exc:
        raise TokenError("Invalid token.") from exc


def new_opaque_token() -> str:
    """256-bit URL-safe random (refresh + one-time tokens)."""
    return secrets.token_urlsafe(32)


def hash_token(token: str) -> str:
    return hashlib.sha256(token.encode("utf-8")).hexdigest()
