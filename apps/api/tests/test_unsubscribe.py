"""HMAC unsubscribe tokens + the public endpoint actually suppress."""
from app.core.unsubscribe_tokens import make_unsubscribe_token, parse_unsubscribe_token
from app.db.models import Lead, LeadStatus, Unsubscribe
from app.services.send_engine import is_suppressed
from tests.conftest import make_verified_user


def test_token_roundtrip_and_tamper_rejection():
    token = make_unsubscribe_token("user123", "Target@Example.com")
    assert parse_unsubscribe_token(token) == ("user123", "target@example.com")

    payload, signature = token.split(".", 1)
    assert parse_unsubscribe_token(f"{payload}.deadbeef") is None
    assert parse_unsubscribe_token("garbage") is None
    assert parse_unsubscribe_token("") is None


def test_unsubscribe_endpoint_suppresses_and_flags_leads(client, db):
    user = make_verified_user(db)
    lead = Lead(user_id=user.id, email="target@example.com", company="X")
    db.add(lead)
    db.commit()

    token = make_unsubscribe_token(user.id, "target@example.com")
    response = client.get(f"/api/unsubscribe?token={token}")
    assert response.status_code == 200
    assert "unsubscribed" in response.json()["message"].lower()

    db.expire_all()
    assert is_suppressed(db, user.id, "target@example.com")
    assert db.get(Lead, lead.id).status == LeadStatus.unsubscribed
    # idempotent — second click is fine
    assert client.get(f"/api/unsubscribe?token={token}").status_code == 200
    assert db.query(Unsubscribe).filter_by(user_id=user.id).count() == 1


def test_unsubscribe_rejects_bad_token(client, db):
    assert client.get("/api/unsubscribe?token=not.a-real-token").status_code == 400
