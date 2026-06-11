"""Cashfree webhook signature accept/reject + disabled-safe checkout."""
import base64
import hashlib
import hmac
import json
import time

from app.db.models import Payment, PlanType, User
from tests.conftest import make_verified_user, register_user

SECRET = "test_webhook_secret"  # set in conftest env


def _signed_headers(raw_body: str, timestamp: str | None = None) -> dict:
    timestamp = timestamp or str(int(time.time()))
    computed = base64.b64encode(
        hmac.new(SECRET.encode(), f"{timestamp}{raw_body}".encode(), hashlib.sha256).digest()
    ).decode()
    return {
        "x-webhook-signature": computed,
        "x-webhook-timestamp": timestamp,
        "content-type": "application/json",
    }


def _webhook_body(order_id: str) -> str:
    return json.dumps({"data": {"order": {"order_id": order_id, "order_status": "PAID"}}})


def test_webhook_rejects_bad_or_stale_signatures(client, db):
    raw = _webhook_body("RF_X_1")

    no_sig = client.post("/api/payments/webhook", content=raw, headers={"content-type": "application/json"})
    assert no_sig.status_code == 401

    bad_sig = client.post(
        "/api/payments/webhook", content=raw,
        headers={**_signed_headers(raw), "x-webhook-signature": "AAAA"},
    )
    assert bad_sig.status_code == 401

    stale = client.post(
        "/api/payments/webhook", content=raw,
        headers=_signed_headers(raw, timestamp=str(int(time.time()) - 3600)),
    )
    assert stale.status_code == 401


def test_webhook_upgrades_user_on_valid_signature(client, db):
    user = make_verified_user(db)
    db.add(
        Payment(
            user_id=user.id, amount=999.0, currency="INR",
            plan="business_growth_explorer", payment_type="subscription",
            provider="cashfree", provider_id="RF_TEST_999", status="pending",
        )
    )
    db.commit()

    raw = _webhook_body("RF_TEST_999")
    ok = client.post("/api/payments/webhook", content=raw, headers=_signed_headers(raw))
    assert ok.status_code == 200

    db.expire_all()
    refreshed = db.get(User, user.id)
    assert refreshed.plan == PlanType.pro
    assert refreshed.plan_key == "business_growth_explorer"
    assert refreshed.credits == 250
    assert db.query(Payment).filter_by(provider_id="RF_TEST_999").one().status == "completed"

    # replay is a no-op (already completed)
    replay = client.post("/api/payments/webhook", content=raw, headers=_signed_headers(raw))
    assert replay.status_code == 200
    assert refreshed.credits == 250


def test_create_order_disabled_safe(client, db, mailbox):
    reg = register_user(client)
    headers = {"Authorization": f"Bearer {reg.json()['access_token']}"}

    response = client.post("/api/payments/create-order", headers=headers, json={
        "plan": "business_growth_explorer",
    })
    assert response.status_code == 503
    assert response.json()["detail"]["reason"] == "payments_not_configured"


def test_plans_endpoint_public(client):
    response = client.get("/api/payments/plans?vertical=recruiter")
    assert response.status_code == 200
    body = response.json()
    assert body["vertical"] == "recruiter"
    assert body["plans"][0]["id"] == "recruiter_starter"
    assert body["credits"]["id"] == "recruiter_booster"
