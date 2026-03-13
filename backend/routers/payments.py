"""
routers/payments.py - Cashfree payments with verified webhooks.
"""
import base64
import hmac
import hashlib
import time
from datetime import datetime, timedelta

import requests
from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel, ConfigDict, Field
from sqlalchemy.orm import Session

from config import API_URL, CASHFREE_APP_ID, CASHFREE_BASE_URL, CASHFREE_ENV, CASHFREE_SECRET, FRONTEND_URL
from database import Payment, PlanType, User, get_db
from routers.auth import get_current_user
from security import enforce_rate_limit

router = APIRouter()

CF_HEADERS = {
    "x-api-version": "2023-08-01",
    "x-client-id": CASHFREE_APP_ID,
    "x-client-secret": CASHFREE_SECRET,
    "Content-Type": "application/json",
}

PLANS = {
    "pro": {
        "name": "ReachFlow Pro",
        "amount": 999.0,
        "leads_quota": 1000,
        "credits": 500,
        "plan_type": PlanType.pro,
    },
    "agency": {
        "name": "ReachFlow Agency",
        "amount": 2999.0,
        "leads_quota": 999999,
        "credits": 2000,
        "plan_type": PlanType.agency,
    },
    "lifetime": {
        "name": "ReachFlow Lifetime",
        "amount": 9999.0,
        "leads_quota": 999999,
        "credits": 999999,
        "plan_type": PlanType.lifetime,
    },
    "credits_100": {
        "name": "100 Email Credits",
        "amount": 199.0,
        "credits": 100,
        "plan_type": None,
    },
}


class CreateOrderRequest(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True)
    plan: str = Field(min_length=2, max_length=40)


class VerifyRequest(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True)
    order_id: str = Field(min_length=6, max_length=120)
    plan: str = Field(min_length=2, max_length=40)


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


@router.post("/create-order")
def create_order(
    body: CreateOrderRequest,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    enforce_rate_limit(request, "payment_create", limit=8, window_seconds=300, identifier=current_user.id)

    plan = PLANS.get(body.plan)
    if not plan:
        raise HTTPException(400, f"Invalid plan: {body.plan}")
    if not CASHFREE_APP_ID or not CASHFREE_SECRET:
        raise HTTPException(500, "Cashfree is not configured. Add CASHFREE_APP_ID and CASHFREE_SECRET_KEY.")

    order_id = f"RF_{current_user.id[:8]}_{body.plan}_{int(datetime.utcnow().timestamp())}"
    phone = (
        (current_user.sender_phone or "9999999999")
        .replace(" ", "")
        .replace("+91", "")
        .lstrip("0")[:10]
        or "9999999999"
    )

    payload = {
        "order_id": order_id,
        "order_amount": plan["amount"],
        "order_currency": "INR",
        "order_note": f"ReachFlow - {plan['name']}",
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
                amount=plan["amount"],
                currency="INR",
                plan=body.plan,
                payment_type="one_time" if body.plan in {"lifetime", "credits_100"} else "subscription",
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
        "amount": plan["amount"],
        "plan_name": plan["name"],
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

    plan_cfg = PLANS.get(body.plan, {})
    _upgrade_user(current_user, body.plan, plan_cfg, body.order_id, db)
    return {"success": True, "plan": body.plan}


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
            _upgrade_user(user, pending.plan, PLANS.get(pending.plan, {}), order_id, db)
            return {"received": True}

    parts = order_id.split("_")
    if len(parts) >= 4:
        uid_part = parts[1]
        user = next((u for u in db.query(User).all() if u.id.startswith(uid_part)), None)
        if user:
            plan_key = parts[2]
            _upgrade_user(user, plan_key, PLANS.get(plan_key, {}), order_id, db)

    return {"received": True}


def _upgrade_user(user: User, plan_key: str, plan_cfg: dict, order_id: str, db: Session):
    existing = db.query(Payment).filter(Payment.provider_id == order_id).first()
    if existing and existing.status == "completed":
        return

    if plan_key == "credits_100":
        user.credits = (user.credits or 0) + plan_cfg.get("credits", 100)
    elif plan_cfg.get("plan_type"):
        user.plan = plan_cfg["plan_type"]
        user.credits = plan_cfg.get("credits", 0)
        user.leads_quota = plan_cfg.get("leads_quota", 100)
        if plan_cfg["plan_type"] != PlanType.lifetime:
            user.subscription_end = datetime.utcnow() + timedelta(days=32)

    if existing:
        existing.status = "completed"
        existing.amount = plan_cfg.get("amount", existing.amount)
        existing.plan = plan_key
        existing.credits_added = plan_cfg.get("credits", 0) if plan_key == "credits_100" else 0
    else:
        db.add(
            Payment(
                user_id=user.id,
                amount=plan_cfg.get("amount", 0),
                currency="INR",
                plan=plan_key,
                payment_type="one_time" if plan_key in ("lifetime", "credits_100") else "subscription",
                provider="cashfree",
                provider_id=order_id,
                status="completed",
                credits_added=plan_cfg.get("credits", 0) if plan_key == "credits_100" else 0,
            )
        )
    db.commit()


@router.get("/plans")
def get_plans():
    return {
        "plans": [
            {
                "id": "free",
                "name": "Free",
                "amount": 0,
                "per": "/mo",
                "leads_quota": 100,
                "emails": 50,
                "features": [
                    "100 leads/month",
                    "50 emails/month",
                    "Google Maps",
                    "AI email writing",
                    "Basic analytics",
                ],
            },
            {
                "id": "pro",
                "name": "Pro",
                "amount": 999,
                "per": "/mo",
                "leads_quota": 1000,
                "emails": 500,
                "popular": True,
                "features": [
                    "1,000 leads/month",
                    "500 emails/month",
                    "All lead sources",
                    "Follow-up automation",
                    "Reply detection",
                    "Full analytics",
                ],
            },
            {
                "id": "agency",
                "name": "Agency",
                "amount": 2999,
                "per": "/mo",
                "leads_quota": -1,
                "emails": 2000,
                "features": [
                    "Unlimited leads",
                    "2,000 emails/month",
                    "Everything in Pro",
                    "Priority support",
                    "API access",
                ],
            },
            {
                "id": "lifetime",
                "name": "Lifetime",
                "amount": 9999,
                "per": " once",
                "leads_quota": -1,
                "emails": -1,
                "badge": "Best Value",
                "features": [
                    "Everything in Agency",
                    "Pay once - use forever",
                    "All future features",
                    "Founder badge",
                ],
            },
        ],
        "credits": {"id": "credits_100", "name": "100 Email Credits", "amount": 199},
    }
