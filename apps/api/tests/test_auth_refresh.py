"""Rotation and reuse-revocation — the core of the session model."""
from tests.conftest import register_user


def _cookie(response) -> str:
    return response.cookies.get("rf_refresh", "")


def test_refresh_rotates_token(client, mailbox):
    first = register_user(client)
    token_1 = _cookie(first)
    assert token_1

    refreshed = client.post("/api/auth/refresh")
    assert refreshed.status_code == 200
    token_2 = _cookie(refreshed)
    assert token_2 and token_2 != token_1
    assert refreshed.json()["access_token"]


def test_reuse_of_rotated_token_revokes_family(client, mailbox):
    first = register_user(client)
    token_1 = _cookie(first)

    refreshed = client.post("/api/auth/refresh")
    token_2 = _cookie(refreshed)

    # Attacker replays the OLD token → 401 and the whole family burns
    client.cookies.clear()
    client.cookies.set("rf_refresh", token_1)
    reuse = client.post("/api/auth/refresh")
    assert reuse.status_code == 401
    assert "reuse" in reuse.json()["detail"].lower() or "revoked" in reuse.json()["detail"].lower()

    # The legitimate (newest) token is now dead too
    client.cookies.clear()
    client.cookies.set("rf_refresh", token_2)
    legit = client.post("/api/auth/refresh")
    assert legit.status_code == 401


def test_logout_all_revokes_every_session(client, mailbox):
    first = register_user(client)
    access = first.json()["access_token"]
    token_1 = _cookie(first)

    # a second session (separate login)
    client.cookies.clear()
    second = client.post("/api/auth/login", json={
        "email": "user@example.com", "password": "correct-horse-9",
    })
    token_2 = _cookie(second)
    assert token_1 != token_2

    out = client.post("/api/auth/logout-all", headers={"Authorization": f"Bearer {access}"})
    assert out.status_code == 200

    for token in (token_1, token_2):
        client.cookies.clear()
        client.cookies.set("rf_refresh", token)
        assert client.post("/api/auth/refresh").status_code == 401
