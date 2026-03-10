"""
routers/payments.py — Cashfree Payments
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Flow: create-order → Cashfree popup (UPI/card/netbanking) → verify → plan upgraded.
Setup: Add CASHFREE_APP_ID + CASHFREE_SECRET_KEY to .env. That's it.
"""
import hmac, hashlib, requests
from datetime import datetime, timedelta
from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session
from pydantic import BaseModel

from config import (
    CASHFREE_APP_ID, CASHFREE_SECRET, CASHFREE_BASE_URL,
    CASHFREE_ENV, FRONTEND_URL, API_URL
)
from database import get_db, User, Payment, PlanType
from routers.auth import get_current_user

router = APIRouter()

CF_HEADERS = {
    "x-api-version":   "2023-08-01",
    "x-client-id":     CASHFREE_APP_ID,
    "x-client-secret": CASHFREE_SECRET,
    "Content-Type":    "application/json",
}

PLANS = {
    "pro": {
        "name": "ReachFlow Pro", "amount": 999.0,
        "leads_quota": 1000, "credits": 500, "plan_type": PlanType.pro,
    },
    "agency": {
        "name": "ReachFlow Agency", "amount": 2999.0,
        "leads_quota": 999999, "credits": 2000, "plan_type": PlanType.agency,
    },
    "lifetime": {
        "name": "ReachFlow Lifetime", "amount": 9999.0,
        "leads_quota": 999999, "credits": 999999, "plan_type": PlanType.lifetime,
    },
    "credits_100": {
        "name": "100 Email Credits", "amount": 199.0,
        "credits": 100, "plan_type": None,
    },
}


class CreateOrderRequest(BaseModel):
    plan: str

class VerifyRequest(BaseModel):
    order_id: str
    plan:     str


@router.post("/create-order")
def create_order(
    body: CreateOrderRequest,
    current_user: User = Depends(get_current_user),
    db: Session        = Depends(get_db),
):
    plan = PLANS.get(body.plan)
    if not plan:
        raise HTTPException(400, f"Invalid plan: {body.plan}")
    if not CASHFREE_APP_ID:
        raise HTTPException(500, "Cashfree not configured. Add CASHFREE_APP_ID + CASHFREE_SECRET_KEY to .env")

    order_id = f"RF_{current_user.id[:8]}_{body.plan}_{int(datetime.utcnow().timestamp())}"
    phone    = (current_user.sender_phone or "9999999999").replace(" ","").replace("+91","").lstrip("0")[:10] or "9999999999"

    payload = {
        "order_id":       order_id,
        "order_amount":   plan["amount"],
        "order_currency": "INR",
        "order_note":     f"ReachFlow — {plan['name']}",
        "customer_details": {
            "customer_id":    current_user.id[:50],
            "customer_email": current_user.email,
            "customer_name":  current_user.sender_name or current_user.name or "User",
            "customer_phone": phone,
        },
        "order_meta": {
            "return_url": f"{FRONTEND_URL}/dashboard?payment=success&order_id={order_id}&plan={body.plan}",
            "notify_url": f"{API_URL}/api/payments/webhook",
        },
    }

    resp = requests.post(f"{CASHFREE_BASE_URL}/orders", json=payload, headers=CF_HEADERS, timeout=10)
    if resp.status_code != 200:
        raise HTTPException(502, f"Cashfree error: {resp.text}")

    data = resp.json()
    return {
        "order_id":           order_id,
        "payment_session_id": data["payment_session_id"],
        "amount":             plan["amount"],
        "plan_name":          plan["name"],
        "cashfree_env":       CASHFREE_ENV,
    }


@router.post("/verify")
def verify_payment(
    body: VerifyRequest,
    current_user: User = Depends(get_current_user),
    db: Session        = Depends(get_db),
):
    resp = requests.get(f"{CASHFREE_BASE_URL}/orders/{body.order_id}", headers=CF_HEADERS, timeout=10)
    if resp.status_code != 200:
        raise HTTPException(502, f"Could not verify order: {resp.text}")

    order  = resp.json()
    status = order.get("order_status", "")
    if status != "PAID":
        raise HTTPException(402, f"Payment not completed. Status: {status}")

    plan_cfg = PLANS.get(body.plan, {})
    _upgrade_user(current_user, body.plan, plan_cfg, body.order_id, db)
    return {"success": True, "plan": body.plan}


@router.post("/webhook")
async def cashfree_webhook(request: Request, db: Session = Depends(get_db)):
    """Cashfree posts events here. Verify() above is the primary path."""
    try:
        data  = await request.json()
        event = data.get("type", "")
        if event == "PAYMENT_SUCCESS_WEBHOOK":
            order_id = data.get("data", {}).get("order", {}).get("order_id", "")
            parts    = order_id.split("_")      # RF_{uid}_{plan}_{ts}
            if len(parts) >= 3:
                uid_part = parts[1]
                plan_key = parts[2]
                users    = db.query(User).all()
                user     = next((u for u in users if u.id.startswith(uid_part)), None)
                if user:
                    _upgrade_user(user, plan_key, PLANS.get(plan_key, {}), order_id, db)
    except Exception as e:
        print(f"[Webhook] Error: {e}")
    return {"received": True}


def _upgrade_user(user: User, plan_key: str, plan_cfg: dict, order_id: str, db: Session):
    existing = db.query(Payment).filter(Payment.provider_id == order_id).first()
    if existing and existing.status == "completed":
        return

    if plan_key == "credits_100":
        user.credits = (user.credits or 0) + plan_cfg.get("credits", 100)
    elif plan_cfg.get("plan_type"):
        user.plan        = plan_cfg["plan_type"]
        user.credits     = plan_cfg.get("credits", 0)
        user.leads_quota = plan_cfg.get("leads_quota", 100)
        if plan_cfg["plan_type"] != PlanType.lifetime:
            user.subscription_end = datetime.utcnow() + timedelta(days=32)

    db.add(Payment(
        user_id      = user.id,
        amount       = plan_cfg.get("amount", 0),
        currency     = "INR",
        plan         = plan_key,
        payment_type = "one_time" if plan_key in ("lifetime","credits_100") else "subscription",
        provider     = "cashfree",
        provider_id  = order_id,
        status       = "completed",
        credits_added= plan_cfg.get("credits", 0) if plan_key == "credits_100" else 0,
    ))
    db.commit()


@router.get("/plans")
def get_plans():
    return {
        "plans": [
            {"id":"free",     "name":"Free",     "amount":0,    "per":"/mo",   "leads_quota":100,    "emails":50,
             "features":["100 leads/month","50 emails/month","Google Maps","AI email writing","Basic analytics"]},
            {"id":"pro",      "name":"Pro",      "amount":999,  "per":"/mo",   "leads_quota":1000,   "emails":500,   "popular":True,
             "features":["1,000 leads/month","500 emails/month","All lead sources","Follow-up automation","Reply detection","Full analytics"]},
            {"id":"agency",   "name":"Agency",   "amount":2999, "per":"/mo",   "leads_quota":-1,     "emails":2000,
             "features":["Unlimited leads","2,000 emails/month","Everything in Pro","Priority support","API access"]},
            {"id":"lifetime", "name":"Lifetime", "amount":9999, "per":" once", "leads_quota":-1,     "emails":-1,    "badge":"Best Value",
             "features":["Everything in Agency","Pay once — use forever","All future features","Founder badge"]},
        ],
        "credits": {"id":"credits_100","name":"100 Email Credits","amount":199},
    }
