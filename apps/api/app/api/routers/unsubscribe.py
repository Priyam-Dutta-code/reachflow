"""Public unsubscribe endpoint (Phase 4 compliance). No auth — the HMAC
token in every email footer is the credential."""
from fastapi import APIRouter, Depends, HTTPException, Query, Request
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.core.rate_limit import enforce_rate_limit
from app.core.unsubscribe_tokens import parse_unsubscribe_token
from app.db.session import get_db
from app.services.send_engine import suppress

router = APIRouter()


class UnsubscribeRequest(BaseModel):
    token: str = Field(min_length=10, max_length=500)


def _process(token: str, request: Request, db: Session) -> dict:
    enforce_rate_limit(request, "unsubscribe", limit=10, window_seconds=60)
    parsed = parse_unsubscribe_token(token)
    if not parsed:
        raise HTTPException(400, "This unsubscribe link is invalid.")
    user_id, email = parsed
    suppress(db, user_id, email, source="link")
    return {"message": "You've been unsubscribed and won't receive further emails from this sender.", "email": email}


@router.get("/unsubscribe")
def unsubscribe_get(
    request: Request,
    token: str = Query(min_length=10, max_length=500),
    db: Session = Depends(get_db),
):
    return _process(token, request, db)


@router.post("/unsubscribe")
def unsubscribe_post(
    body: UnsubscribeRequest,
    request: Request,
    db: Session = Depends(get_db),
):
    return _process(body.token, request, db)
