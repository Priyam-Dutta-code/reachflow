"""Session + one-time-token logic (Phase 3 core).

Refresh model: opaque token → sha256 stored in auth_sessions. Rotation on
every refresh keeps the family_id; presenting a rotated/revoked token revokes
the whole family. One-time tokens (verify/reset) are single-use with short
expiries; issuing a new one invalidates older unused ones of the same purpose.
"""
from datetime import datetime, timedelta

from sqlalchemy.orm import Session

from app.core.settings import get_settings
from app.core.tokens import hash_token, new_opaque_token
from app.db.models import AuthSession, OneTimeToken, User

VERIFY_EMAIL_MINUTES = 60
RESET_PASSWORD_MINUTES = 30


class RefreshError(Exception):
    """Invalid/expired/reused refresh token."""


# ── Refresh sessions ─────────────────────────────────────────────────

def create_session(
    db: Session, user: User, user_agent: str = "", ip: str = "", family_id: str | None = None
) -> str:
    """Create a session row; returns the raw refresh token (only time it exists)."""
    token = new_opaque_token()
    session = AuthSession(
        user_id=user.id,
        token_hash=hash_token(token),
        user_agent=(user_agent or "")[:300],
        ip=(ip or "")[:64],
        expires_at=datetime.utcnow() + timedelta(days=get_settings().refresh_token_days),
    )
    if family_id:
        session.family_id = family_id
    db.add(session)
    db.commit()
    return token


def rotate_session(db: Session, raw_token: str, user_agent: str = "", ip: str = "") -> tuple[User, str]:
    """Validate + rotate a refresh token. Returns (user, new_raw_token).

    Reuse of a rotated/revoked token nukes the whole family.
    """
    now = datetime.utcnow()
    session = (
        db.query(AuthSession).filter(AuthSession.token_hash == hash_token(raw_token)).first()
    )
    if not session:
        raise RefreshError("Unknown refresh token.")

    if session.revoked_at is not None:
        revoke_family(db, session.family_id)
        raise RefreshError("Refresh token reuse detected — all sessions revoked.")

    if session.expires_at < now:
        session.revoked_at = now
        db.commit()
        raise RefreshError("Session expired. Please log in again.")

    user = db.get(User, session.user_id)
    if not user:
        raise RefreshError("Account no longer exists.")

    session.revoked_at = now
    session.last_used_at = now
    db.commit()

    new_token = create_session(db, user, user_agent=user_agent, ip=ip, family_id=session.family_id)
    return user, new_token


def revoke_session_by_token(db: Session, raw_token: str) -> None:
    session = (
        db.query(AuthSession).filter(AuthSession.token_hash == hash_token(raw_token)).first()
    )
    if session and session.revoked_at is None:
        session.revoked_at = datetime.utcnow()
        db.commit()


def revoke_family(db: Session, family_id: str) -> None:
    db.query(AuthSession).filter(
        AuthSession.family_id == family_id, AuthSession.revoked_at.is_(None)
    ).update({"revoked_at": datetime.utcnow()}, synchronize_session=False)
    db.commit()


def revoke_all_sessions(db: Session, user_id: str, except_token: str | None = None) -> int:
    query = db.query(AuthSession).filter(
        AuthSession.user_id == user_id, AuthSession.revoked_at.is_(None)
    )
    if except_token:
        query = query.filter(AuthSession.token_hash != hash_token(except_token))
    count = query.update({"revoked_at": datetime.utcnow()}, synchronize_session=False)
    db.commit()
    return count


# ── One-time tokens (verify email / reset password) ──────────────────

def issue_one_time_token(db: Session, user: User, purpose: str) -> str:
    minutes = VERIFY_EMAIL_MINUTES if purpose == "verify_email" else RESET_PASSWORD_MINUTES
    now = datetime.utcnow()

    # a fresh token invalidates older unused ones of the same purpose
    db.query(OneTimeToken).filter(
        OneTimeToken.user_id == user.id,
        OneTimeToken.purpose == purpose,
        OneTimeToken.used_at.is_(None),
    ).update({"used_at": now}, synchronize_session=False)

    token = new_opaque_token()
    db.add(
        OneTimeToken(
            user_id=user.id,
            purpose=purpose,
            token_hash=hash_token(token),
            expires_at=now + timedelta(minutes=minutes),
        )
    )
    db.commit()
    return token


def consume_one_time_token(db: Session, raw_token: str, purpose: str) -> User | None:
    """Burn the token and return its user, or None if invalid/expired/used."""
    now = datetime.utcnow()
    record = (
        db.query(OneTimeToken)
        .filter(OneTimeToken.token_hash == hash_token(raw_token), OneTimeToken.purpose == purpose)
        .first()
    )
    if not record or record.used_at is not None or record.expires_at < now:
        return None
    record.used_at = now
    db.commit()
    return db.get(User, record.user_id)
