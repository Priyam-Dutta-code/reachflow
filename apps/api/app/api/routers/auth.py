"""Auth endpoints (Phase 3) + ported V1 profile contract (me/onboard/profile).

Token model: short-lived access JWT in the JSON body (client holds it in
memory) + opaque refresh token in an httpOnly Secure SameSite=Lax cookie.
Only /refresh and /logout read the cookie; everything else is Bearer-only,
which keeps the CSRF surface at zero.

Email verification gates sending (Phase 4 pipeline), not exploring.
"""
import logging
from datetime import datetime

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Request, Response
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.core.passwords import hash_password, validate_password_policy, verify_password
from app.core.rate_limit import client_ip, enforce_rate_limit
from app.core.settings import get_settings
from app.core.tokens import create_access_token
from app.db.models import User
from app.db.session import get_db
from app.schemas.auth import (
    ChangePasswordRequest,
    ForgotPasswordRequest,
    LoginRequest,
    OnboardRequest,
    ProfileUpdate,
    RegisterRequest,
    ResetPasswordRequest,
    TokenPayload,
)
from app.services import auth_service, mailer
from app.services.users import update_sensitive_fields, user_dict
from app.services.verticals import default_plan_key, get_plan

router = APIRouter()
logger = logging.getLogger("reachflow.auth")

REFRESH_COOKIE = "rf_refresh"


def _set_refresh_cookie(response: Response, token: str) -> None:
    settings = get_settings()
    response.set_cookie(
        key=REFRESH_COOKIE,
        value=token,
        max_age=settings.refresh_token_days * 86400,
        httponly=True,
        secure=settings.is_production,
        samesite="lax",
        path="/",
    )


def _clear_refresh_cookie(response: Response) -> None:
    response.delete_cookie(key=REFRESH_COOKIE, path="/")


def _token_response(user: User, refresh_token: str, response: Response) -> dict:
    access_token, expires_in = create_access_token(user.id, user.email)
    _set_refresh_cookie(response, refresh_token)
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "expires_in": expires_in,
        "user": user_dict(user),
    }


# ── Register / login / refresh / logout ──────────────────────────────

@router.post("/register", status_code=201)
def register(
    body: RegisterRequest,
    request: Request,
    response: Response,
    background: BackgroundTasks,
    db: Session = Depends(get_db),
):
    enforce_rate_limit(request, "auth_register", limit=3, window_seconds=3600)

    policy_error = validate_password_policy(body.password)
    if policy_error:
        raise HTTPException(400, policy_error)

    email = body.email.lower()
    if db.query(User).filter(User.email == email).first():
        raise HTTPException(409, "An account with this email already exists. Try logging in.")

    plan = get_plan(default_plan_key(body.vertical), body.vertical)
    user = User(
        email=email,
        name=body.name,
        password_hash=hash_password(body.password),
        vertical=body.vertical,
        plan=plan["plan_type"],
        plan_key=plan["id"],
        credits=plan["credits"],
        leads_quota=plan["leads_quota"],
        leads_used=0,
        emails_sent=0,
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    verify_token = auth_service.issue_one_time_token(db, user, "verify_email")
    background.add_task(mailer.send_verification_email, user.email, user.name or "", verify_token)

    refresh_token = auth_service.create_session(
        db, user, user_agent=request.headers.get("user-agent", ""), ip=client_ip(request)
    )
    logger.info("user registered", extra={"event": "auth_register"})
    return _token_response(user, refresh_token, response)


@router.post("/login")
def login(
    body: LoginRequest,
    request: Request,
    response: Response,
    db: Session = Depends(get_db),
):
    email = body.email.lower()
    enforce_rate_limit(request, "auth_login", limit=5, window_seconds=60, identifier=email)

    user = db.query(User).filter(User.email == email).first()
    if not user or not verify_password(user.password_hash, body.password):
        raise HTTPException(401, "Incorrect email or password.")

    refresh_token = auth_service.create_session(
        db, user, user_agent=request.headers.get("user-agent", ""), ip=client_ip(request)
    )
    logger.info("user logged in", extra={"event": "auth_login"})
    return _token_response(user, refresh_token, response)


@router.post("/refresh")
def refresh(request: Request, response: Response, db: Session = Depends(get_db)):
    raw = request.cookies.get(REFRESH_COOKIE, "")
    if not raw:
        raise HTTPException(401, "No active session.")
    try:
        user, new_token = auth_service.rotate_session(
            db, raw, user_agent=request.headers.get("user-agent", ""), ip=client_ip(request)
        )
    except auth_service.RefreshError as exc:
        _clear_refresh_cookie(response)
        raise HTTPException(401, str(exc)) from exc
    return _token_response(user, new_token, response)


@router.post("/logout")
def logout(request: Request, response: Response, db: Session = Depends(get_db)):
    raw = request.cookies.get(REFRESH_COOKIE, "")
    if raw:
        auth_service.revoke_session_by_token(db, raw)
    _clear_refresh_cookie(response)
    return {"message": "Logged out."}


@router.post("/logout-all")
def logout_all(
    response: Response,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    count = auth_service.revoke_all_sessions(db, current_user.id)
    _clear_refresh_cookie(response)
    return {"message": f"Signed out everywhere ({count} sessions revoked)."}


# ── Email verification ────────────────────────────────────────────────

@router.post("/verify-email")
def verify_email(body: TokenPayload, db: Session = Depends(get_db)):
    user = auth_service.consume_one_time_token(db, body.token, "verify_email")
    if not user:
        raise HTTPException(400, "This verification link is invalid or has expired. Request a new one.")
    if not user.email_verified_at:
        user.email_verified_at = datetime.utcnow()
        db.commit()
    return {"message": "Email verified. Sending is unlocked.", "email_verified": True}


@router.post("/resend-verification")
def resend_verification(
    request: Request,
    background: BackgroundTasks,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    enforce_rate_limit(request, "auth_resend", limit=3, window_seconds=3600, identifier=current_user.id)
    if current_user.email_verified_at:
        return {"message": "This email is already verified."}
    token = auth_service.issue_one_time_token(db, current_user, "verify_email")
    background.add_task(mailer.send_verification_email, current_user.email, current_user.name or "", token)
    return {"message": "Verification email sent. Check your inbox."}


# ── Password reset / change ───────────────────────────────────────────

@router.post("/forgot-password")
def forgot_password(
    body: ForgotPasswordRequest,
    request: Request,
    background: BackgroundTasks,
    db: Session = Depends(get_db),
):
    email = body.email.lower()
    enforce_rate_limit(request, "auth_forgot", limit=3, window_seconds=3600, identifier=email)

    user = db.query(User).filter(User.email == email).first()
    if user:
        token = auth_service.issue_one_time_token(db, user, "reset_password")
        background.add_task(mailer.send_reset_email, user.email, user.name or "", token)
    # identical response either way — no account enumeration
    return {"message": "If that email has an account, a reset link is on its way."}


@router.post("/reset-password")
def reset_password(
    body: ResetPasswordRequest,
    background: BackgroundTasks,
    db: Session = Depends(get_db),
):
    policy_error = validate_password_policy(body.new_password)
    if policy_error:
        raise HTTPException(400, policy_error)

    user = auth_service.consume_one_time_token(db, body.token, "reset_password")
    if not user:
        raise HTTPException(400, "This reset link is invalid or has expired. Request a new one.")

    user.password_hash = hash_password(body.new_password)
    db.commit()
    auth_service.revoke_all_sessions(db, user.id)
    background.add_task(mailer.send_password_changed_notice, user.email, user.name or "")
    logger.info("password reset", extra={"event": "auth_password_reset"})
    return {"message": "Password updated. Log in with your new password."}


@router.post("/change-password")
def change_password(
    body: ChangePasswordRequest,
    request: Request,
    background: BackgroundTasks,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if not verify_password(current_user.password_hash, body.current_password):
        raise HTTPException(401, "Current password is incorrect.")
    policy_error = validate_password_policy(body.new_password)
    if policy_error:
        raise HTTPException(400, policy_error)

    current_user.password_hash = hash_password(body.new_password)
    db.commit()
    # keep THIS session alive, sign out everything else
    current_session_token = request.cookies.get(REFRESH_COOKIE) or None
    auth_service.revoke_all_sessions(db, current_user.id, except_token=current_session_token)
    background.add_task(mailer.send_password_changed_notice, current_user.email, current_user.name or "")
    return {"message": "Password changed. Other sessions were signed out."}


# ── Integrations (Phase 8) ────────────────────────────────────────────

@router.post("/test-integrations")
def test_integrations(
    request: Request,
    current_user: User = Depends(get_current_user),
):
    """Live checks for the user's stored Gmail/Groq credentials (Settings)."""
    enforce_rate_limit(request, "integration_test", limit=4, window_seconds=300, identifier=current_user.id)
    import smtplib

    from app.core.security import get_secret_manager

    sm = get_secret_manager()
    result: dict = {
        "gmail": {"connected": bool(current_user.gmail_password), "ok": False, "error": None},
        "groq": {"connected": bool(current_user.groq_api_key), "ok": False, "error": None},
    }

    if current_user.gmail_password:
        try:
            password = sm.decrypt(current_user.gmail_password)
            server = smtplib.SMTP("smtp.gmail.com", 587, timeout=10)
            server.starttls()
            server.login(current_user.sender_email or current_user.email, password)
            server.quit()
            result["gmail"]["ok"] = True
        except Exception as exc:
            result["gmail"]["error"] = type(exc).__name__

    if current_user.groq_api_key:
        try:
            from groq import Groq

            client = Groq(api_key=sm.decrypt(current_user.groq_api_key))
            client.models.list()
            result["groq"]["ok"] = True
        except Exception as exc:
            result["groq"]["error"] = type(exc).__name__

    return result


class DeleteAccountRequest(BaseModel):
    password: str = Field(min_length=1, max_length=200)


@router.delete("/account")
def delete_account(
    body: DeleteAccountRequest,
    response: Response,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Gated full deletion (Phase 8 Settings security section)."""
    if not verify_password(current_user.password_hash, body.password):
        raise HTTPException(401, "Password is incorrect.")

    from app.db.models import (
        AuthSession,
        EmailLog,
        Feedback,
        Job,
        OneTimeToken,
        Payment,
        Unsubscribe,
    )

    user_id = current_user.id
    for model in (EmailLog, Job, Payment, AuthSession, OneTimeToken, Unsubscribe, Feedback):
        db.query(model).filter(model.user_id == user_id).delete(synchronize_session=False)
    db.delete(current_user)  # cascades leads + campaigns via relationships
    db.commit()
    _clear_refresh_cookie(response)
    logger.info("account deleted", extra={"event": "account_deleted"})
    return {"message": "Your account and all associated data were deleted."}


# ── Profile contract (PORTED from V1) ─────────────────────────────────

@router.get("/me")
def get_me(current_user: User = Depends(get_current_user)):
    return user_dict(current_user)


@router.post("/onboard")
def onboard(
    body: OnboardRequest,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    enforce_rate_limit(request, "auth_onboard", limit=8, window_seconds=60, identifier=current_user.id)
    update_sensitive_fields(current_user, body.model_dump())
    db.commit()
    db.refresh(current_user)
    return {"message": "Onboarded", "user": user_dict(current_user)}


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
        return {"message": "No changes submitted", "user": user_dict(current_user)}

    update_sensitive_fields(current_user, payload)
    db.commit()
    db.refresh(current_user)
    return {"message": "Updated", "user": user_dict(current_user)}
