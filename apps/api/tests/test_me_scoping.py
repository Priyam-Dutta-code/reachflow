"""Tenant scoping + secret handling on the ported profile contract."""
from tests.conftest import register_user


def test_me_returns_own_data_only(client, mailbox):
    a = register_user(client, email="a@example.com", name="User A")
    client.cookies.clear()
    b = register_user(client, email="b@example.com", name="User B", vertical="recruiter")

    me_a = client.get("/api/auth/me", headers={"Authorization": f"Bearer {a.json()['access_token']}"})
    me_b = client.get("/api/auth/me", headers={"Authorization": f"Bearer {b.json()['access_token']}"})
    assert me_a.json()["email"] == "a@example.com"
    assert me_b.json()["email"] == "b@example.com"
    assert me_b.json()["vertical"] == "recruiter"
    assert me_a.json()["id"] != me_b.json()["id"]


def test_profile_secrets_encrypted_and_never_echoed(client, mailbox, db):
    response = register_user(client)
    headers = {"Authorization": f"Bearer {response.json()['access_token']}"}

    updated = client.patch("/api/auth/profile", headers=headers, json={
        "gmail_password": "abcd efgh ijkl mnop",
        "sender_name": "Priyam",
        "sender_email": "priyam@example.com",
    })
    assert updated.status_code == 200
    user_payload = updated.json()["user"]
    assert user_payload["has_gmail_password"] is True
    assert "gmail_password" not in user_payload
    assert "password_hash" not in user_payload
    assert "gmail_connection" not in user_payload["missing_setup"]

    # stored encrypted with the enc: prefix, decryptable round-trip
    from app.core.security import get_secret_manager
    from app.db.models import User

    row = db.query(User).filter(User.email == "user@example.com").first()
    assert row.gmail_password.startswith("enc:")
    assert get_secret_manager().decrypt(row.gmail_password) == "abcd efgh ijkl mnop"


def test_onboard_contract(client, mailbox):
    response = register_user(client, vertical="job_seeker")
    headers = {"Authorization": f"Bearer {response.json()['access_token']}"}

    onboarded = client.post("/api/auth/onboard", headers=headers, json={
        "name": "Priyam Dutta",
        "vertical": "job_seeker",
        "sender_name": "Priyam Dutta",
        "sender_email": "priyam@example.com",
        "sender_role": "Backend Engineer",
    })
    assert onboarded.status_code == 200
    user = onboarded.json()["user"]
    assert user["onboarded"] is True
    assert user["vertical_config"]["id"] == "job_seeker"
    assert user["plan_key"] == "job_seeker_free"
