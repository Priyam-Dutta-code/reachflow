"""Quota enforcement — server-side and atomic (Phase 4).

Reservation model: callers reserve up-front with a guarded single UPDATE
(no read-modify-write race), then refund whatever the run didn't use.
`leads_used` can never exceed `leads_quota` and never goes negative.
"""
from sqlalchemy import text
from sqlalchemy.orm import Session

from app.db.models import User

QUOTA_EXHAUSTED = {
    "message": "Lead quota exhausted for this billing period.",
    "reason": "quota_exhausted",
    "action": "upgrade",
}


def remaining_quota(user: User) -> int:
    return max((user.leads_quota or 0) - (user.leads_used or 0), 0)


def reserve_quota(db: Session, user_id: str, amount: int) -> int:
    """Atomically reserve up to `amount` lead slots. Returns the amount
    actually reserved (0 if nothing left). Single guarded UPDATE."""
    if amount <= 0:
        return 0
    granted = 0
    # try full amount first, then whatever remains
    result = db.execute(
        text(
            "UPDATE users SET leads_used = leads_used + :amt "
            "WHERE id = :uid AND (leads_quota - leads_used) >= :amt"
        ),
        {"amt": amount, "uid": user_id},
    )
    if result.rowcount == 1:
        granted = amount
    else:
        row = db.execute(
            text("SELECT MAX(leads_quota - leads_used, 0) FROM users WHERE id = :uid")
            if db.bind.dialect.name == "sqlite"
            else text("SELECT GREATEST(leads_quota - leads_used, 0) FROM users WHERE id = :uid"),
            {"uid": user_id},
        ).first()
        available = int(row[0] or 0) if row else 0
        if available > 0:
            result = db.execute(
                text(
                    "UPDATE users SET leads_used = leads_used + :amt "
                    "WHERE id = :uid AND (leads_quota - leads_used) >= :amt"
                ),
                {"amt": available, "uid": user_id},
            )
            if result.rowcount == 1:
                granted = available
    db.commit()
    return granted


def refund_quota(db: Session, user_id: str, amount: int) -> None:
    """Return unused reservation; floor at zero."""
    if amount <= 0:
        return
    db.execute(
        text(
            "UPDATE users SET leads_used = "
            "CASE WHEN leads_used >= :amt THEN leads_used - :amt ELSE 0 END "
            "WHERE id = :uid"
        ),
        {"amt": amount, "uid": user_id},
    )
    db.commit()
