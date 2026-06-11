"""Email verification, forgot/reset, change-password."""
from tests.conftest import register_user


def test_verify_email_flow(client, mailbox):
    response = register_user(client)
    access = response.json()["access_token"]
    _, token = mailbox["verify"][0]

    ok = client.post("/api/auth/verify-email", json={"token": token})
    assert ok.status_code == 200
    assert ok.json()["email_verified"] is True

    me = client.get("/api/auth/me", headers={"Authorization": f"Bearer {access}"})
    assert me.json()["email_verified"] is True

    # single-use: same token again fails
    again = client.post("/api/auth/verify-email", json={"token": token})
    assert again.status_code == 400


def test_resend_invalidates_previous_token(client, mailbox):
    response = register_user(client)
    access = response.json()["access_token"]
    _, old_token = mailbox["verify"][0]

    resent = client.post(
        "/api/auth/resend-verification", headers={"Authorization": f"Bearer {access}"}
    )
    assert resent.status_code == 200
    _, new_token = mailbox["verify"][1]

    assert client.post("/api/auth/verify-email", json={"token": old_token}).status_code == 400
    assert client.post("/api/auth/verify-email", json={"token": new_token}).status_code == 200


def test_forgot_reset_password_flow(client, mailbox):
    register_user(client)
    old_refresh = client.cookies.get("rf_refresh")

    # response identical whether or not the account exists (no enumeration)
    unknown = client.post("/api/auth/forgot-password", json={"email": "ghost@example.com"})
    known = client.post("/api/auth/forgot-password", json={"email": "user@example.com"})
    assert unknown.status_code == known.status_code == 200
    assert unknown.json() == known.json()
    assert len(mailbox["reset"]) == 1

    _, token = mailbox["reset"][0]
    reset = client.post("/api/auth/reset-password", json={
        "token": token, "new_password": "brand-new-secret-7",
    })
    assert reset.status_code == 200
    assert mailbox["notice"] == ["user@example.com"]

    # all sessions revoked by the reset
    client.cookies.clear()
    client.cookies.set("rf_refresh", old_refresh)
    assert client.post("/api/auth/refresh").status_code == 401

    # old password dead, new password works
    assert client.post("/api/auth/login", json={
        "email": "user@example.com", "password": "correct-horse-9",
    }).status_code == 401
    assert client.post("/api/auth/login", json={
        "email": "user@example.com", "password": "brand-new-secret-7",
    }).status_code == 200

    # token is single-use
    assert client.post("/api/auth/reset-password", json={
        "token": token, "new_password": "another-new-secret-7",
    }).status_code == 400


def test_change_password_requires_current(client, mailbox):
    response = register_user(client)
    access = response.json()["access_token"]
    headers = {"Authorization": f"Bearer {access}"}

    bad = client.post("/api/auth/change-password", headers=headers, json={
        "current_password": "wrong", "new_password": "next-level-secret-3",
    })
    assert bad.status_code == 401

    ok = client.post("/api/auth/change-password", headers=headers, json={
        "current_password": "correct-horse-9", "new_password": "next-level-secret-3",
    })
    assert ok.status_code == 200

    client.cookies.clear()
    assert client.post("/api/auth/login", json={
        "email": "user@example.com", "password": "next-level-secret-3",
    }).status_code == 200
