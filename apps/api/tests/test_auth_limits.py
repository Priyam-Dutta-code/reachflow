"""Rate limits: login 5/min/IP+email, register 3/hr/IP."""
from tests.conftest import register_user


def test_login_rate_limit(client, mailbox):
    register_user(client)
    payload = {"email": "user@example.com", "password": "wrong-password-x"}

    for _ in range(5):
        assert client.post("/api/auth/login", json=payload).status_code == 401
    assert client.post("/api/auth/login", json=payload).status_code == 429

    # a different email from the same IP is its own bucket
    other = client.post("/api/auth/login", json={
        "email": "other@example.com", "password": "whatever-pass-1",
    })
    assert other.status_code == 401  # not 429


def test_register_rate_limit(client, mailbox):
    for i in range(3):
        register_user(client, email=f"u{i}@example.com")
    fourth = client.post("/api/auth/register", json={
        "name": "Late", "email": "u3@example.com", "password": "correct-horse-9",
    })
    assert fourth.status_code == 429
