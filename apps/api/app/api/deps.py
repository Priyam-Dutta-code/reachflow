"""Shared dependencies — Bearer-token authentication."""
from fastapi import Depends, Header, HTTPException
from sqlalchemy.orm import Session

from app.core.logging import user_id_var
from app.core.tokens import TokenError, decode_access_token
from app.db.models import User
from app.db.session import get_db
from app.services.users import ensure_product_profile, migrate_sensitive_fields


def get_current_user(
    authorization: str | None = Header(default=None),
    db: Session = Depends(get_db),
) -> User:
    if not authorization or not authorization.lower().startswith("bearer "):
        raise HTTPException(401, "Missing authorization token")

    token = authorization[7:].strip()
    try:
        payload = decode_access_token(token)
    except TokenError as exc:
        raise HTTPException(401, str(exc)) from exc

    user = db.get(User, payload.get("sub", ""))
    if not user:
        raise HTTPException(401, "Account not found")

    user_id_var.set(user.id)  # log correlation
    migrate_sensitive_fields(user, db)
    ensure_product_profile(user, db)
    return user
