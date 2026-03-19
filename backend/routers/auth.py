"""
routers/auth.py - Supabase JWT verification + user profile management.
"""
from typing import Optional
from urllib.parse import urlparse

import jwt
from fastapi import APIRouter, Depends, Header, HTTPException, Request
from jwt import PyJWKClient
from pydantic import BaseModel, ConfigDict, Field, field_validator
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from config import DATABASE_URL, SUPABASE_ANON_KEY, SUPABASE_JWT_SECRET, SUPABASE_URL
from database import PlanType, User, get_db
from security import enforce_rate_limit, secret_manager

router = APIRouter()

PLAN_DEFAULTS = {
    PlanType.free: {"leads_quota": 100, "credits": 50},
    PlanType.pro: {"leads_quota": 1000, "credits": 500},
    PlanType.agency: {"leads_quota": 999999, "credits": 2000},
    PlanType.lifetime: {"leads_quota": 999999, "credits": 999999},
}

_jwks_clients: dict[str, PyJWKClient] = {}


def _project_ref_from_supabase_url(url: str) -> str:
    host = urlparse((url or "").strip()).hostname or ""
    if host.endswith(".supabase.co"):
        return host.split(".")[0]
    return ""


def _project_ref_from_database_url(url: str) -> str:
    username = (urlparse((url or "").strip()).username or "").strip()
    if "." not in username:
        return ""
    return username.split(".")[-1]


def _project_ref_from_anon_key(key: str) -> str:
    candidate = (key or "").strip()
    if candidate.count(".") != 2:
        return ""

    try:
        payload = jwt.decode(candidate, options={"verify_signature": False, "verify_aud": False})
        return str(payload.get("ref") or "").strip()
    except Exception:
        return ""


def _expected_supabase_project_ref() -> str:
    return (
        _project_ref_from_supabase_url(SUPABASE_URL)
        or _project_ref_from_database_url(DATABASE_URL)
        or _project_ref_from_anon_key(SUPABASE_ANON_KEY)
    )


def _build_jwks_url(issuer: str) -> str:
    normalized = (issuer or "").strip().rstrip("/")
    if not normalized:
        return ""
    if normalized.endswith("/auth/v1"):
        return f"{normalized}/.well-known/jwks.json"
    return f"{normalized}/auth/v1/.well-known/jwks.json"


def _get_jwks_client(issuer: str | None = None) -> Optional[PyJWKClient]:
    expected_ref = _expected_supabase_project_ref()
    candidate = (issuer or SUPABASE_URL).strip().rstrip("/")
    if not candidate and expected_ref:
        candidate = f"https://{expected_ref}.supabase.co/auth/v1"
    if not candidate:
        return None

    parsed = urlparse(candidate)
    host = parsed.hostname or ""
    if expected_ref:
        allowed_host = f"{expected_ref}.supabase.co"
        if host != allowed_host:
            print(f"[auth] Rejected issuer host '{host}' (expected '{allowed_host}')")
            return None
    elif not host.endswith(".supabase.co"):
        print(f"[auth] Rejected non-Supabase issuer host '{host}'")
        return None

    jwks_url = _build_jwks_url(candidate)
    if not jwks_url:
        return None

    client = _jwks_clients.get(jwks_url)
    if client is None:
        try:
            client = PyJWKClient(jwks_url, cache_keys=True)
            _jwks_clients[jwks_url] = client
        except Exception as exc:
            print(f"[auth] JWKS client init failed for {jwks_url}: {exc}")
            return None
    return client


def _decode_unverified_payload(token: str) -> dict:
    try:
        payload = jwt.decode(token, options={"verify_signature": False, "verify_aud": False})
        return payload if isinstance(payload, dict) else {}
    except Exception:
        return {}


def verify_token(authorization: str | None = Header(default=None)) -> dict:
    if not authorization:
        raise HTTPException(401, "Missing authorization token")

    try:
        token = authorization.removeprefix("Bearer ").strip()
        unverified_payload = _decode_unverified_payload(token)
        verification_configured = False

        jwks = _get_jwks_client(str(unverified_payload.get("iss") or ""))
        if jwks:
            verification_configured = True
            try:
                key = jwks.get_signing_key_from_jwt(token)
                return jwt.decode(
                    token,
                    key.key,
                    algorithms=["HS256", "RS256", "ES256"],
                    options={"verify_aud": False},
                )
            except Exception as exc:
                print(f"[auth] JWKS verify failed ({exc}), trying legacy secret")

        if SUPABASE_JWT_SECRET:
            verification_configured = True
            return jwt.decode(
                token,
                SUPABASE_JWT_SECRET,
                algorithms=["HS256"],
                options={"verify_aud": False},
            )

        if not verification_configured:
            raise HTTPException(503, "Authentication is temporarily unavailable. Please try again shortly.")
        raise HTTPException(401, "Invalid token")
    except jwt.ExpiredSignatureError:
        raise HTTPException(401, "Session expired. Please log in again.")
    except HTTPException:
        raise
    except Exception as exc:
        print(f"[auth] Token verification error: {exc}")
        raise HTTPException(401, "Invalid token")


def _migrate_sensitive_fields(user: User, db: Session) -> None:
    changed = False
    if secret_manager.needs_migration(user.gmail_password):
        user.gmail_password = secret_manager.encrypt(user.gmail_password)
        changed = True
    if secret_manager.needs_migration(user.groq_api_key):
        user.groq_api_key = secret_manager.encrypt(user.groq_api_key)
        changed = True
    if changed:
        db.commit()
        db.refresh(user)


def get_current_user(
    payload: dict = Depends(verify_token),
    db: Session = Depends(get_db),
) -> User:
    user_id = payload.get("sub")
    email = payload.get("email", "")
    if not user_id:
        raise HTTPException(401, "Invalid token payload")

    user = db.query(User).filter(User.id == user_id).first()
    if not user and email:
        user = db.query(User).filter(User.email == email).first()
        if user:
            print(f"[auth] Reusing existing user row {user.id} for verified email {email} (token sub {user_id})")

    if not user:
        defaults = PLAN_DEFAULTS[PlanType.free]
        metadata = payload.get("user_metadata") or {}
        preferred_name = metadata.get("name") or email.split("@")[0] or "User"
        user = User(
            id=user_id,
            email=email,
            name=preferred_name,
            plan=PlanType.free,
            credits=defaults["credits"],
            leads_quota=defaults["leads_quota"],
            leads_used=0,
            emails_sent=0,
        )
        db.add(user)
        try:
            db.commit()
            db.refresh(user)
            print(f"[auth] Auto-created user row for {email}")
        except IntegrityError:
            db.rollback()
            if email:
                user = db.query(User).filter(User.email == email).first()
            if not user:
                raise
            print(f"[auth] Recovered existing user row {user.id} after duplicate insert for {email}")

    _migrate_sensitive_fields(user, db)
    return user


class _ProfileBase(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True)

    name: Optional[str] = Field(default=None, min_length=2, max_length=80)
    sender_name: Optional[str] = Field(default=None, min_length=2, max_length=80)
    sender_email: Optional[str] = Field(default=None, min_length=5, max_length=255)
    sender_phone: Optional[str] = Field(default=None, max_length=32)
    sender_linkedin: Optional[str] = Field(default=None, max_length=255)
    sender_profile: Optional[str] = Field(default=None, max_length=800)
    sender_role: Optional[str] = Field(default=None, max_length=80)
    gmail_password: Optional[str] = Field(default=None, max_length=255)
    groq_api_key: Optional[str] = Field(default=None, max_length=255)

    @field_validator("sender_email")
    @classmethod
    def validate_email(cls, value: Optional[str]) -> Optional[str]:
        if value and "@" not in value:
            raise ValueError("Enter a valid sender email address")
        return value

    @field_validator("sender_linkedin")
    @classmethod
    def validate_linkedin(cls, value: Optional[str]) -> Optional[str]:
        if value and "linkedin.com" not in value:
            raise ValueError("Enter a valid LinkedIn URL")
        return value


class OnboardRequest(_ProfileBase):
    name: str = Field(min_length=2, max_length=80)
    sender_name: str = Field(min_length=2, max_length=80)
    sender_email: str = Field(min_length=5, max_length=255)
    sender_phone: str = Field(default="")
    sender_linkedin: str = Field(default="")
    sender_profile: str = Field(default="")
    sender_role: str = Field(default="Professional", max_length=80)
    gmail_password: str = Field(default="")
    groq_api_key: str = Field(default="")


class ProfileUpdate(_ProfileBase):
    pass


def _update_sensitive_fields(current_user: User, fields: dict) -> None:
    for field, value in fields.items():
        if field in {"gmail_password", "groq_api_key"}:
            setattr(current_user, field, secret_manager.encrypt(value))
        else:
            setattr(current_user, field, value)


def _user_dict(user: User) -> dict:
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
        "plan": user.plan.value if hasattr(user.plan, "value") else user.plan,
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
    }


@router.get("/me")
def get_me(current_user: User = Depends(get_current_user)):
    return _user_dict(current_user)


@router.post("/onboard")
def onboard(
    body: OnboardRequest,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    enforce_rate_limit(request, "auth_onboard", limit=8, window_seconds=60, identifier=current_user.id)
    _update_sensitive_fields(current_user, body.model_dump())
    db.commit()
    db.refresh(current_user)
    return {"message": "Onboarded", "user": _user_dict(current_user)}


@router.patch("/profile")
def update_profile(
    body: ProfileUpdate,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    enforce_rate_limit(request, "auth_profile", limit=20, window_seconds=60, identifier=current_user.id)
    payload = body.model_dump(exclude_none=True)
    if not payload:
        return {"message": "No changes submitted", "user": _user_dict(current_user)}

    _update_sensitive_fields(current_user, payload)
    db.commit()
    db.refresh(current_user)
    return {"message": "Updated", "user": _user_dict(current_user)}
