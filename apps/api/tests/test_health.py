def test_health_ok(client):
    response = client.get("/health")
    assert response.status_code == 200
    body = response.json()
    assert body["status"] == "ok"
    assert body["db"] == "ok"
    assert body["redis"] == "disabled"


def test_security_headers_and_request_id(client):
    response = client.get("/health")
    assert response.headers["X-Content-Type-Options"] == "nosniff"
    assert response.headers["X-Frame-Options"] == "DENY"
    assert response.headers["X-Request-ID"]


def test_cron_tick_requires_secret(client):
    assert client.post("/internal/cron/tick").status_code == 401
    ok = client.post("/internal/cron/tick", headers={"X-Cron-Secret": "test_cron_secret"})
    assert ok.status_code == 200
    assert "processed" in ok.json()
