"""Phase 9 growth: feedback (auth + anon) and newsletter capture."""
from app.db.models import Feedback, NewsletterSignup
from tests.conftest import register_user


def _auth(response) -> dict:
    return {"Authorization": f"Bearer {response.json()['access_token']}"}


def test_feedback_logged_in_stores_and_emails(client, db, mailbox, monkeypatch):
    sent: list = []
    from app.services import mailer

    monkeypatch.setattr(mailer, "send_feedback_notice", lambda *a: sent.append(a) or True)

    reg = register_user(client, email="fb9@example.com")
    response = client.post("/api/feedback", headers=_auth(reg), json={
        "message": "The lead drawer is great.", "page": "/leads",
    })
    assert response.status_code == 200
    row = db.query(Feedback).one()
    assert row.email == "fb9@example.com" and row.user_id is not None
    assert row.page == "/leads"
    assert len(sent) == 1  # operator notified


def test_feedback_anonymous(client, db, mailbox):
    response = client.post("/api/feedback", json={
        "message": "Loving the demo — no account yet.", "email": "stranger@example.com", "page": "/demo",
    })
    assert response.status_code == 200
    row = db.query(Feedback).one()
    assert row.user_id is None and row.email == "stranger@example.com"


def test_feedback_validation_and_rate_limit(client, db, mailbox):
    assert client.post("/api/feedback", json={"message": "no"}).status_code == 422
    for _ in range(5):
        client.post("/api/feedback", json={"message": "valid feedback here"})
    assert client.post("/api/feedback", json={"message": "one too many here"}).status_code == 429


def test_newsletter_capture_is_idempotent(client, db, mailbox):
    first = client.post("/api/newsletter", json={"email": "News@Example.com"})
    assert first.status_code == 200
    again = client.post("/api/newsletter", json={"email": "news@example.com"})
    assert again.status_code == 200
    assert "already" in again.json()["message"].lower()
    assert db.query(NewsletterSignup).count() == 1
    assert db.query(NewsletterSignup).one().email == "news@example.com"


def test_delete_account_also_clears_feedback(client, db, mailbox):
    from app.db.models import User

    reg = register_user(client, email="fbdel@example.com")
    user = db.query(User).filter_by(email="fbdel@example.com").one()
    user_id = user.id
    db.add(Feedback(user_id=user_id, email=user.email, message="bye", page="/settings"))
    db.commit()

    ok = client.request("DELETE", "/api/auth/account", headers=_auth(reg),
                        json={"password": "correct-horse-9"})
    assert ok.status_code == 200
    db.expire_all()
    assert db.query(Feedback).filter_by(user_id=user_id).count() == 0
