"""User profile helpers — PORTED from V1 `routers/auth.py` (contract-bearing).

`user_dict` is the `/api/auth/me` response shape (Part IV contract), extended
with `email_verified`. The vertical→plan remap rules and `missing_setup[]`
logic are V1 behavior, unchanged.
"""
from sqlalchemy.orm import Session

from app.core.security import get_secret_manager
from app.db.models import PlanType, User
from app.services.verticals import (
    entitlements_for_user,
    get_plan,
    get_vertical_config,
    matching_plan_key,
    normalize_vertical,
    plan_for_user,
)


def migrate_sensitive_fields(user: User, db: Session) -> None:
    """Encrypt any plaintext secrets (V1-imported rows)."""
    sm = get_secret_manager()
    changed = False
    if sm.needs_migration(user.gmail_password):
        user.gmail_password = sm.encrypt(user.gmail_password)
        changed = True
    if sm.needs_migration(user.groq_api_key):
        user.groq_api_key = sm.encrypt(user.groq_api_key)
        changed = True
    if changed:
        db.commit()
        db.refresh(user)


def ensure_product_profile(user: User, db: Session) -> None:
    """Normalize vertical/plan_key/plan and top up free-plan quotas."""
    changed = False

    normalized_vertical = normalize_vertical(user.vertical)
    if user.vertical != normalized_vertical:
        user.vertical = normalized_vertical
        changed = True

    expected_plan_key = (user.plan_key or "").strip() or matching_plan_key(
        normalized_vertical, user.plan
    )
    if user.plan_key != expected_plan_key:
        user.plan_key = expected_plan_key
        changed = True

    current_plan = plan_for_user(user)
    if user.plan != current_plan["plan_type"]:
        user.plan = current_plan["plan_type"]
        changed = True

    if user.plan == PlanType.free:
        if (user.leads_quota or 0) != current_plan["leads_quota"]:
            user.leads_quota = current_plan["leads_quota"]
            changed = True
        if (user.credits or 0) < current_plan["credits"]:
            user.credits = current_plan["credits"]
            changed = True

    if changed:
        db.commit()
        db.refresh(user)


def update_sensitive_fields(user: User, fields: dict) -> None:
    """Apply profile updates; encrypts secrets, remaps plan on vertical change."""
    sm = get_secret_manager()
    for field, value in fields.items():
        if field == "vertical":
            next_vertical = normalize_vertical(value)
            mapped_plan = get_plan(matching_plan_key(next_vertical, user.plan), next_vertical)
            user.vertical = next_vertical
            user.plan = mapped_plan["plan_type"]
            user.plan_key = mapped_plan["id"]
            user.leads_quota = mapped_plan["leads_quota"]
            if user.plan == PlanType.free:
                user.credits = mapped_plan["credits"]
            else:
                user.credits = max(user.credits or 0, mapped_plan["credits"])
            continue
        if field in {"gmail_password", "groq_api_key"}:
            setattr(user, field, sm.encrypt(value))
        else:
            setattr(user, field, value)


def user_dict(user: User) -> dict:
    current_plan = plan_for_user(user)
    entitlements = entitlements_for_user(user)
    missing_setup = []
    if not user.sender_name:
        missing_setup.append("sender_profile")
    if not user.sender_email:
        missing_setup.append("sender_email")
    if not user.gmail_password:
        missing_setup.append("gmail_connection")
    if not (user.groq_api_key or user.sender_profile):
        missing_setup.append("ai_personalization")

    return {
        "id": user.id,
        "email": user.email,
        "name": user.name,
        "email_verified": bool(user.email_verified_at),
        "vertical": normalize_vertical(user.vertical),
        "vertical_config": get_vertical_config(user.vertical),
        "plan": current_plan["plan_type"].value
        if hasattr(current_plan["plan_type"], "value")
        else current_plan["plan_type"],
        "plan_key": current_plan["id"],
        "plan_name": current_plan["name"],
        "credits": user.credits,
        "leads_quota": user.leads_quota,
        "leads_used": user.leads_used,
        "emails_sent": user.emails_sent,
        "sender_name": user.sender_name,
        "sender_email": user.sender_email,
        "sender_phone": user.sender_phone,
        "sender_linkedin": user.sender_linkedin,
        "sender_role": user.sender_role,
        "sender_profile": user.sender_profile,
        "onboarded": bool(user.sender_name and user.sender_email),
        "has_gmail_password": bool(user.gmail_password),
        "has_groq_api_key": bool(user.groq_api_key),
        "missing_setup": missing_setup,
        "entitlements": entitlements,
    }
