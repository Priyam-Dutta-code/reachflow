from tests.conftest import register_user


def test_register_returns_tokens_and_sends_verification(client, mailbox):
    response = register_user(client, vertical="agency")
    body = response.json()

    assert body["token_type"] == "bearer"
    assert body["access_token"]
    assert body["user"]["email"] == "user@example.com"
    assert body["user"]["vertical"] == "agency"
    assert body["user"]["plan_key"] == "agency_starter"
    assert body["user"]["email_verified"] is False
    # refresh cookie set, httpOnly
    set_cookie = response.headers.get("set-cookie", "")
    assert "rf_refresh=" in set_cookie and "HttpOnly" in set_cookie
    # verification email captured
    assert len(mailbox["verify"]) == 1
    assert mailbox["verify"][0][0] == "user@example.com"

    # access token works on /me
    me = client.get("/api/auth/me", headers={"Authorization": f"Bearer {body['access_token']}"})
    assert me.status_code == 200
    assert me.json()["id"] == body["user"]["id"]


def test_register_rejects_duplicates_and_weak_passwords(client, mailbox):
    register_user(client)
    dupe = client.post("/api/auth/register", json={
        "name": "Dup", "email": "user@example.com", "password": "correct-horse-9",
    })
    assert dupe.status_code == 409

    short = client.post("/api/auth/register", json={
        "name": "S", "email": "s@example.com", "password": "short",
    })
    assert short.status_code in (400, 422)  # 422 from name min-length OR 400 policy

    common = client.post("/api/auth/register", json={
        "name": "Common", "email": "c@example.com", "password": "password123",
    })
    assert common.status_code == 400
    assert "too common" in common.json()["detail"]


def test_login_lifecycle(client, mailbox):
    register_user(client)
    client.cookies.clear()

    wrong = client.post("/api/auth/login", json={
        "email": "user@example.com", "password": "wrong-password-1",
    })
    assert wrong.status_code == 401

    ok = client.post("/api/auth/login", json={
        "email": "user@example.com", "password": "correct-horse-9",
    })
    assert ok.status_code == 200
    assert ok.json()["access_token"]
    assert "rf_refresh=" in ok.headers.get("set-cookie", "")

    # logout revokes + clears cookie
    out = client.post("/api/auth/logout")
    assert out.status_code == 200
    refresh_after_logout = client.post("/api/auth/refresh")
    assert refresh_after_logout.status_code == 401


def test_missing_or_garbage_bearer(client, mailbox):
    assert client.get("/api/auth/me").status_code == 401
    assert client.get(
        "/api/auth/me", headers={"Authorization": "Bearer not-a-jwt"}
    ).status_code == 401
