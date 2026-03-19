"""
routers/payments.py - Vertical-aware Cashfree payments with verified webhooks.
"""
import base64
import hashlib
import hmac
import time
from datetime import datetime, timedelta

import requests
from fastapi import APIRouter, Depends, HTTPException, Query, Request
from pydantic import BaseModel, ConfigDict, Field
from sqlalchemy.orm import Session

from config import API_URL, CASHFREE_APP_ID, CASHFREE_BASE_URL, CASHFREE_ENV, CASHFREE_SECRET, FRONTEND_URL
from database import Payment, User, get_db
from routers.auth import get_current_user
from security import enforce_rate_limit
from verticals import (
    get_plan,
    get_topup,
    get_vertical_config,
    get_vertical_plans,
    get_vertical_topup,
    is_known_plan,
    is_known_topup,
    normalize_vertical,
)

router = APIRouter()

CF_HEADERS = {
    "x-api-version": "2023-08-01",
    "x-client-id": CASHFREE_APP_ID,
    "x-client-secret": CASHFREE_SECRET,
    "Content-Type": "application/json",
}


class CreateOrderRequest(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True)
    plan: str = Field(min_length=2, max_length=80)


class VerifyRequest(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True)
    order_id: str = Field(min_length=6, max_length=120)
    plan: str = Field(min_length=2, max_length=80)


def _verify_webhook_signature(raw_body: str, signature: str, timestamp: str) -> bool:
    if not signature or not timestamp or not CASHFREE_SECRET:
        return False

    try:
        raw_timestamp = int(timestamp)
        normalized_timestamp = raw_timestamp / 1000 if raw_timestamp > 10_000_000_000 else raw_timestamp
        age_seconds = abs(time.time() - normalized_timestamp)
        if age_seconds > 900:
            return False
    except ValueError:
        return False

    signed_payload = f"{timestamp}{raw_body}"
    computed = base64.b64encode(
        hmac.new(
            CASHFREE_SECRET.encode("utf-8"),
            signed_payload.encode("utf-8"),
            hashlib.sha256,
        ).digest()
    ).decode("utf-8")
    return hmac.compare_digest(computed, signature)


def _pending_payment(order_id: str, db: Session) -> Payment | None:
    return db.query(Payment).filter(Payment.provider_id == order_id).first()


def _resolve_purchase(item_id: str, vertical: str | None) -> tuple[str, dict]:
    if is_known_plan(item_id):
        return "plan", get_plan(item_id, vertical)
    if is_known_topup(item_id):
        return "topup", get_topup(item_id, vertical)
    raise HTTPException(400, f"Invalid plan: {item_id}")


@router.post("/create-order")
def create_order(
    body: CreateOrderRequest,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    enforce_rate_limit(request, "payment_create", limit=8, window_seconds=300, identifier=current_user.id)

    purchase_type, purchase = _resolve_purchase(body.plan, getattr(current_user, "vertical", None))
    if purchase.get("amount", 0) <= 0:
        raise HTTPException(400, "Free starter plans do not require checkout.")
    if not CASHFREE_APP_ID or not CASHFREE_SECRET:
        raise HTTPException(500, "Cashfree is not configured. Add CASHFREE_APP_ID and CASHFREE_SECRET_KEY.")

    order_id = f"RF_{current_user.id[:8]}_{int(datetime.utcnow().timestamp())}"
    phone = (
        (current_user.sender_phone or "9999999999")
        .replace(" ", "")
        .replace("+91", "")
        .lstrip("0")[:10]
        or "9999999999"
    )

    payload = {
        "order_id": order_id,
        "order_amount": purchase["amount"],
        "order_currency": "INR",
        "order_note": f"ReachFlow - {purchase['name']}",
        "customer_details": {
            "customer_id": current_user.id[:50],
            "customer_email": current_user.email,
            "customer_name": current_user.sender_name or current_user.name or "User",
            "customer_phone": phone,
        },
        "order_meta": {
            "return_url": f"{FRONTEND_URL}/pricing?payment=success&order_id={order_id}&plan={body.plan}",
            "notify_url": f"{API_URL}/api/payments/webhook",
        },
    }

    resp = requests.post(f"{CASHFREE_BASE_URL}/orders", json=payload, headers=CF_HEADERS, timeout=10)
    if resp.status_code not in {200, 201}:
        raise HTTPException(502, f"Cashfree error: {resp.text}")

    existing = _pending_payment(order_id, db)
    if not existing:
        db.add(
            Payment(
                user_id=current_user.id,
                amount=purchase["amount"],
                currency="INR",
                plan=body.plan,
                payment_type="one_time" if purchase_type == "topup" else "subscription",
                provider="cashfree",
                provider_id=order_id,
                status="pending",
            )
        )
        db.commit()

    data = resp.json()
    return {
        "order_id": order_id,
        "payment_session_id": data["payment_session_id"],
        "amount": purchase["amount"],
        "plan_name": purchase["name"],
        "vertical": purchase.get("vertical", normalize_vertical(getattr(current_user, "vertical", None))),
        "cashfree_env": CASHFREE_ENV,
    }


@router.post("/verify")
def verify_payment(
    body: VerifyRequest,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    enforce_rate_limit(request, "payment_verify", limit=20, window_seconds=300, identifier=current_user.id)

    payment = db.query(Payment).filter(
        Payment.provider_id == body.order_id,
        Payment.user_id == current_user.id,
    ).first()
    if not payment or payment.plan != body.plan:
        raise HTTPException(404, "Order not found")

    resp = requests.get(f"{CASHFREE_BASE_URL}/orders/{body.order_id}", headers=CF_HEADERS, timeout=10)
    if resp.status_code != 200:
        raise HTTPException(502, f"Could not verify order: {resp.text}")

    order = resp.json()
    status = order.get("order_status", "")
    if status != "PAID":
        raise HTTPException(402, f"Payment not completed. Status: {status}")

    purchase_type, purchase = _resolve_purchase(body.plan, getattr(current_user, "vertical", None))
    _upgrade_user(current_user, body.plan, purchase_type, purchase, body.order_id, db)
    return {"success": True, "plan": body.plan, "vertical": purchase.get("vertical")}


@router.post("/webhook")
async def cashfree_webhook(request: Request, db: Session = Depends(get_db)):
    raw_body = (await request.body()).decode("utf-8")
    signature = request.headers.get("x-webhook-signature", "")
    timestamp = request.headers.get("x-webhook-timestamp", "")

    if not _verify_webhook_signature(raw_body, signature, timestamp):
        raise HTTPException(401, "Invalid webhook signature")

    payload = await request.json()
    data = payload.get("data", {})
    order = data.get("order") or payload.get("order") or {}
    payment = data.get("payment") or payload.get("payment") or {}
    order_id = order.get("order_id") or payload.get("order_id") or ""
    status = order.get("order_status") or payment.get("payment_status") or ""

    if status not in {"PAID", "SUCCESS"} or not order_id:
        return {"received": True}

    pending = _pending_payment(order_id, db)
    if pending:
        user = db.query(User).filter(User.id == pending.user_id).first()
        if user:
            purchase_type, purchase = _resolve_purchase(pending.plan, getattr(user, "vertical", None))
            _upgrade_user(user, pending.plan, purchase_type, purchase, order_id, db)

    return {"received": True}


def _upgrade_user(user: User, purchase_key: str, purchase_type: str, purchase: dict, order_id: str, db: Session):
    existing = db.query(Payment).filter(Payment.provider_id == order_id).first()
    if existing and existing.status == "completed":
        return

    if purchase_type == "topup":
        user.credits = (user.credits or 0) + purchase.get("credits", 0)
    else:
        user.vertical = purchase["vertical"]
        user.plan = purchase["plan_type"]
        user.plan_key = purchase_key
        user.credits = purchase.get("credits", 0)
        user.leads_quota = purchase.get("leads_quota", 100)
        user.subscription_end = datetime.utcnow() + timedelta(days=32) if purchase["plan_type"].value != "free" else None

    if existing:
        existing.status = "completed"
        existing.amount = purchase.get("amount", existing.amount)
        existing.plan = purchase_key
        existing.credits_added = purchase.get("credits", 0) if purchase_type == "topup" else 0
    else:
        db.add(
            Payment(
                user_id=user.id,
                amount=purchase.get("amount", 0),
                currency="INR",
                plan=purchase_key,
                payment_type="one_time" if purchase_type == "topup" else "subscription",
                provider="cashfree",
                provider_id=order_id,
                status="completed",
                credits_added=purchase.get("credits", 0) if purchase_type == "topup" else 0,
            )
        )
    db.commit()


@router.get("/plans")
def get_plans(vertical: str | None = Query(default=None)):
    selected_vertical = normalize_vertical(vertical)
    plans = get_vertical_plans(selected_vertical)
    topup = get_vertical_topup(selected_vertical)
    return {
        "vertical": selected_vertical,
        "vertical_config": get_vertical_config(selected_vertical),
        "plans": plans,
        "credits": topup,
    }
