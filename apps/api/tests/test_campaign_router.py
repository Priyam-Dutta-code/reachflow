"""Campaign router: cap clamping (A1 fix), slot limits, verification gate."""
from tests.conftest import register_user


def _auth(response) -> dict:
    return {"Authorization": f"Bearer {response.json()['access_token']}"}


def test_create_clamps_emails_per_day_to_plan_cap(client, db, mailbox):
    reg = register_user(client)  # business_growth free: daily_send_cap 30
    headers = _auth(reg)

    created = client.post("/api/campaigns/", headers=headers, json={
        "name": "First push", "emails_per_day": 500,
    })
    assert created.status_code == 200, created.text  # A1: no 400 on first run
    assert created.json()["emails_per_day"] == 30


def test_campaign_slot_limit_enforced(client, db, mailbox):
    reg = register_user(client)  # business_growth free: 2 slots
    headers = _auth(reg)

    for i in range(2):
        assert client.post("/api/campaigns/", headers=headers, json={
            "name": f"Campaign {i}",
        }).status_code == 200

    third = client.post("/api/campaigns/", headers=headers, json={"name": "One too many"})
    assert third.status_code == 402
    assert third.json()["detail"]["reason"] == "campaign_slots_exhausted"


def test_send_now_requires_verified_email(client, db, mailbox):
    reg = register_user(client)
    headers = _auth(reg)
    campaign = client.post("/api/campaigns/", headers=headers, json={"name": "C1"}).json()

    blocked = client.post(f"/api/campaigns/{campaign['id']}/send-now", headers=headers)
    assert blocked.status_code == 403
    assert blocked.json()["detail"]["reason"] == "sender_not_verified"


def test_campaign_detail_includes_leads(client, db, mailbox):
    reg = register_user(client)
    headers = _auth(reg)
    campaign = client.post("/api/campaigns/", headers=headers, json={"name": "C1"}).json()

    detail = client.get(f"/api/campaigns/{campaign['id']}", headers=headers)
    assert detail.status_code == 200
    body = detail.json()
    assert body["id"] == campaign["id"]
    assert body["leads"] == []
    assert "eligible_leads" in body
