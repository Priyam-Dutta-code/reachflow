"""Growth endpoints (Phase 9): in-app feedback + newsletter capture.

Feedback works logged-in or out; newsletter is fully public. No third-party
ESP — signups land in our own table. Both rate-limited.
"""
import logging

from fastapi import APIRouter, BackgroundTasks, Depends, Header, Request
from pydantic import BaseModel, ConfigDict, EmailStr, Field
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.core.rate_limit import enforce_rate_limit
from app.core.tokens import TokenError, decode_access_token
from app.db.models import Feedback, NewsletterSignup, User
from app.db.session import get_db
from app.services import mailer

router = APIRouter()
logger = logging.getLogger("reachflow.growth")


class FeedbackRequest(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True)
    message: str = Field(min_length=3, max_length=2000)
    email: str | None = Field(default=None, max_length=255)
    page: str | None = Field(default=None, max_length=160)


class NewsletterRequest(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True)
    email: EmailStr
    source: str = Field(default="landing", max_length=60)


def _optional_user(authorization: str | None, db: Session) -> User | None:
    """Best-effort identify the sender without forcing auth."""
    if not authorization or not authorization.lower().startswith("bearer "):
        return None
    try:
        payload = decode_access_token(authorization[7:].strip())
    except TokenError:
        return None
    return db.get(User, payload.get("sub", ""))


@router.post("/feedback")
def submit_feedback(
    body: FeedbackRequest,
    request: Request,
    background: BackgroundTasks,
    authorization: str | None = Header(default=None),
    db: Session = Depends(get_db),
):
    enforce_rate_limit(request, "feedback", limit=5, window_seconds=600)
    user = _optional_user(authorization, db)
    sender_email = (body.email or (user.email if user else "") or "").strip().lower()

    db.add(
        Feedback(
            user_id=user.id if user else None,
            email=sender_email or None,
            message=body.message,
            page=body.page,
        )
    )
    db.commit()
    background.add_task(mailer.send_feedback_notice, sender_email, body.message, body.page or "")
    logger.info("feedback received", extra={"event": "feedback"})
    return {"message": "Thanks — your note reached us."}


@router.post("/newsletter")
def subscribe_newsletter(
    body: NewsletterRequest,
    request: Request,
    db: Session = Depends(get_db),
):
    enforce_rate_limit(request, "newsletter", limit=5, window_seconds=600)
    email = body.email.lower()
    existing = db.query(NewsletterSignup).filter(NewsletterSignup.email == email).first()
    if existing:
        return {"message": "You're already on the list."}
    try:
        db.add(NewsletterSignup(email=email, source=body.source))
        db.commit()
    except IntegrityError:
        db.rollback()  # race on the unique constraint — already subscribed
    return {"message": "You're on the list — we'll only send things worth reading."}
