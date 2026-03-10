"""
routers/auth.py — Supabase JWT verification + auto user-creation
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
KEY FIX: get_current_user() now auto-creates a DB row on first login.
This means the "Account not found" error can never happen — any valid
Supabase JWT immediately gets a working account.

Token verification uses PyJWKClient (fetches Supabase's public JWKS)
which supports both old HS256 and new ES256 (ECC P-256) tokens.
"""
import jwt
from jwt import PyJWKClient
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Header
from sqlalchemy.orm import Session
from pydantic import BaseModel

from config import SUPABASE_URL, SUPABASE_JWT_SECRET
from database import get_db, User, PlanType

router = APIRouter()

PLAN_DEFAULTS = {
    PlanType.free:     {"leads_quota": 100,    "credits": 50},
    PlanType.pro:      {"leads_quota": 1000,   "credits": 500},
    PlanType.agency:   {"leads_quota": 999999, "credits": 2000},
    PlanType.lifetime: {"leads_quota": 999999, "credits": 999999},
}

_jwks_client: Optional[PyJWKClient] = None

def _get_jwks_client() -> Optional[PyJWKClient]:
    global _jwks_client
    if _jwks_client is None and SUPABASE_URL:
        try:
            _jwks_client = PyJWKClient(
                f"{SUPABASE_URL}/auth/v1/.well-known/jwks.json",
                cache_keys=True,
            )
        except Exception as e:
            print(f"[auth] JWKS client init failed: {e}")
    return _jwks_client


def verify_token(authorization: str = Header(...)) -> dict:
    """Verify Supabase JWT. Tries JWKS (ES256) first, falls back to HS256 secret."""
    try:
        token = authorization.removeprefix("Bearer ").strip()

        # Strategy 1 — JWKS (handles ES256 and any future key type)
        jwks = _get_jwks_client()
        if jwks:
            try:
                key = jwks.get_signing_key_from_jwt(token)
                return jwt.decode(
                    token, key.key,
                    algorithms=["HS256", "RS256", "ES256"],
                    options={"verify_aud": False},
                )
            except Exception as e:
                print(f"[auth] JWKS verify failed ({e}), trying legacy secret")

        # Strategy 2 — Legacy HS256 secret
        if SUPABASE_JWT_SECRET:
            return jwt.decode(
                token, SUPABASE_JWT_SECRET,
                algorithms=["HS256"],
                options={"verify_aud": False},
            )

        raise HTTPException(401, "No JWT verification method configured")

    except jwt.ExpiredSignatureError:
        raise HTTPException(401, "Session expired — please log in again")
    except HTTPException:
        raise
    except Exception as e:
        print(f"[auth] Token verification error: {e}")
        raise HTTPException(401, "Invalid token")


def get_current_user(
    payload: dict = Depends(verify_token),
    db: Session   = Depends(get_db),
) -> User:
    """
    Get or AUTO-CREATE the user row.
    This is the key fix: a valid Supabase JWT always gets a DB record,
    even if onboarding was never completed (e.g. after email confirmation).
    """
    user_id = payload.get("sub")
    email   = payload.get("email", "")
    if not user_id:
        raise HTTPException(401, "Invalid token payload")

    user = db.query(User).filter(User.id == user_id).first()

    if not user:
        # First time this user hits the backend — create their row automatically
        defaults = PLAN_DEFAULTS[PlanType.free]
        user = User(
            id=user_id,
            email=email,
            name=email.split("@")[0],   # default name until onboarding
            plan=PlanType.free,
            credits=defaults["credits"],
            leads_quota=defaults["leads_quota"],
            leads_used=0,
            emails_sent=0,
        )
        db.add(user)
        db.commit()
        db.refresh(user)
        print(f"[auth] Auto-created user row for {email}")

    return user


# ── Schemas ───────────────────────────────────────────────

class OnboardRequest(BaseModel):
    name:            str
    sender_name:     str
    sender_email:    str
    sender_phone:    Optional[str] = ""
    sender_linkedin: Optional[str] = ""
    sender_profile:  Optional[str] = ""
    sender_role:     Optional[str] = "Professional"
    gmail_password:  Optional[str] = ""
    groq_api_key:    Optional[str] = ""


class ProfileUpdate(BaseModel):
    name:            Optional[str] = None
    sender_name:     Optional[str] = None
    sender_email:    Optional[str] = None
    sender_phone:    Optional[str] = None
    sender_linkedin: Optional[str] = None
    sender_profile:  Optional[str] = None
    sender_role:     Optional[str] = None
    gmail_password:  Optional[str] = None
    groq_api_key:    Optional[str] = None


# ── Routes ────────────────────────────────────────────────

@router.get("/me")
def get_me(current_user: User = Depends(get_current_user)):
    return _user_dict(current_user)


@router.post("/onboard")
def onboard(
    body: OnboardRequest,
    current_user: User = Depends(get_current_user),
    db: Session        = Depends(get_db),
):
    current_user.name            = body.name
    current_user.sender_name     = body.sender_name
    current_user.sender_email    = body.sender_email
    current_user.sender_phone    = body.sender_phone
    current_user.sender_linkedin = body.sender_linkedin
    current_user.sender_profile  = body.sender_profile
    current_user.sender_role     = body.sender_role
    current_user.gmail_password  = body.gmail_password
    current_user.groq_api_key    = body.groq_api_key
    db.commit()
    return {"message": "Onboarded", "user": _user_dict(current_user)}


@router.patch("/profile")
def update_profile(
    body: ProfileUpdate,
    current_user: User = Depends(get_current_user),
    db: Session        = Depends(get_db),
):
    for field, value in body.dict(exclude_none=True).items():
        setattr(current_user, field, value)
    db.commit()
    return {"message": "Updated", "user": _user_dict(current_user)}


def _user_dict(u: User) -> dict:
    return {
        "id": u.id, "email": u.email, "name": u.name,
        "plan": u.plan, "credits": u.credits,
        "leads_quota": u.leads_quota, "leads_used": u.leads_used,
        "emails_sent": u.emails_sent,
        "sender_name": u.sender_name, "sender_email": u.sender_email,
        "sender_phone": u.sender_phone, "sender_linkedin": u.sender_linkedin,
        "sender_role": u.sender_role,
        "onboarded": bool(u.sender_name),
    }
