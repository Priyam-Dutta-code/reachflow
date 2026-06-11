"""HMAC-signed unsubscribe tokens (Phase 4 compliance).

Self-contained (no DB row needed): payload = base64url({"u": user_id,
"e": email}), signed with JWT_SECRET. Embedded in every outbound email's
footer; the public unsubscribe endpoint verifies and suppresses.
"""
import base64
import hashlib
import hmac
import json

from app.core.settings import get_settings


def _sign(payload: str) -> str:
    return hmac.new(
        get_settings().jwt_secret.encode("utf-8"),
        payload.encode("utf-8"),
        hashlib.sha256,
    ).hexdigest()[:32]


def make_unsubscribe_token(user_id: str, email: str) -> str:
    payload = base64.urlsafe_b64encode(
        json.dumps({"u": user_id, "e": (email or "").lower()}, separators=(",", ":")).encode("utf-8")
    ).decode("ascii").rstrip("=")
    return f"{payload}.{_sign(payload)}"


def parse_unsubscribe_token(token: str) -> tuple[str, str] | None:
    """Return (user_id, email) or None if invalid/tampered."""
    try:
        payload, signature = (token or "").strip().split(".", 1)
        if not hmac.compare_digest(_sign(payload), signature):
            return None
        padded = payload + "=" * (-len(payload) % 4)
        data = json.loads(base64.urlsafe_b64decode(padded.encode("ascii")))
        user_id = str(data.get("u") or "")
        email = str(data.get("e") or "").lower()
        if not user_id or not email:
            return None
        return user_id, email
    except Exception:
        return None
