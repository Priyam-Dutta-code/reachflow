"""Phase 8 API extensions: email log, lead search/source filter, payment
history, delete-account cascade, test-integrations shape."""
from app.db.models import (
    AuthSession,
    Campaign,
    EmailLog,
    Job,
    Lead,
    LeadSource,
    Payment,
    Unsubscribe,
    User,
)
from tests.conftest import register_user


def _auth(response) -> dict:
    return {"Authorization": f"Bearer {response.json()['access_token']}"}


def _seed(db, user_id: str):
    campaign = Campaign(user_id=user_id, name="Seeded")
    db.add(campaign)
    db.commit()
    db.add_all([
        Lead(user_id=user_id, name="Maya Patel", company="Kinetic", email="maya@kinetic.co",
             source=LeadSource.web_search, campaign_id=campaign.id),
        Lead(user_id=user_id, name="Arjun", company="Vectorlane", email="arjun@vector.ai",
             source=LeadSource.linkedin_jobs),
        EmailLog(user_id=user_id, campaign_id=campaign.id, to_email="maya@kinetic.co",
                 subject="Hello", body="b", status="sent"),
        Payment(user_id=user_id, amount=999.0, plan="business_growth_explorer",
                provider_id=f"RF_{user_id[:6]}", status="completed"),
        Unsubscribe(user_id=user_id, email="gone@example.com"),
    ])
    db.commit()
    return campaign


def test_email_log_tenant_scoped(client, db, mailbox):
    a = register_user(client, email="a8@example.com")
    user_a = db.query(User).filter_by(email="a8@example.com").one()
    _seed(db, user_a.id)

    client.cookies.clear()
    b = register_user(client, email="b8@example.com")

    log_a = client.get("/api/emails/log", headers=_auth(a)).json()
    log_b = client.get("/api/emails/log", headers=_auth(b)).json()
    assert log_a["total"] == 1
    assert log_a["logs"][0]["to_email"] == "maya@kinetic.co"
    assert log_b["total"] == 0


def test_lead_search_and_source_filter(client, db, mailbox):
    reg = register_user(client, email="search8@example.com")
    user = db.query(User).filter_by(email="search8@example.com").one()
    _seed(db, user.id)
    headers = _auth(reg)

    by_name = client.get("/api/leads/?q=maya", headers=headers).json()
    assert by_name["total"] == 1 and by_name["leads"][0]["company"] == "Kinetic"

    by_source = client.get("/api/leads/?source=linkedin_jobs", headers=headers).json()
    assert by_source["total"] == 1 and by_source["leads"][0]["name"] == "Arjun"

    none = client.get("/api/leads/?q=nonexistent", headers=headers).json()
    assert none["total"] == 0


def test_payment_history(client, db, mailbox):
    reg = register_user(client, email="pay8@example.com")
    user = db.query(User).filter_by(email="pay8@example.com").one()
    _seed(db, user.id)

    history = client.get("/api/payments/history", headers=_auth(reg)).json()
    assert len(history) == 1
    assert history[0]["plan"] == "business_growth_explorer"
    assert history[0]["status"] == "completed"


def test_test_integrations_shape_unconfigured(client, db, mailbox):
    reg = register_user(client, email="ti8@example.com")
    result = client.post("/api/auth/test-integrations", headers=_auth(reg)).json()
    assert result["gmail"]["connected"] is False
    assert result["groq"]["connected"] is False


def test_delete_account_cascades_everything(client, db, mailbox):
    reg = register_user(client, email="del8@example.com")
    user = db.query(User).filter_by(email="del8@example.com").one()
    user_id = user.id
    _seed(db, user_id)
    headers = _auth(reg)

    wrong = client.request("DELETE", "/api/auth/account", headers=headers,
                           json={"password": "not-the-password"})
    assert wrong.status_code == 401

    ok = client.request("DELETE", "/api/auth/account", headers=headers,
                        json={"password": "correct-horse-9"})
    assert ok.status_code == 200

    db.expire_all()
    assert db.get(User, user_id) is None
    for model in (Lead, Campaign, EmailLog, Payment, AuthSession, Unsubscribe, Job):
        assert db.query(model).filter_by(user_id=user_id).count() == 0

    # token now dead
    assert client.get("/api/auth/me", headers=headers).status_code == 401
