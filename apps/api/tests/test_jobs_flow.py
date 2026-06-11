"""Async lead-generation job: happy path, quota accounting, failure refund."""
import pytest

from app.db.models import Lead, User
from app.services.leads import LeadGenerationError
from tests.conftest import register_user

FAKE_LEADS = [
    {"name": "A", "email": "a@x.com", "company": "XCo", "title": "CTO", "source": "web_search"},
    {"name": "B", "email": "b@y.com", "company": "YCo", "title": "CEO", "source": "web_search"},
    {"name": "Dup", "email": "a@x.com", "company": "XCo", "title": "CTO", "source": "web_search"},
]


@pytest.fixture()
def fake_lead_gen(monkeypatch):
    import app.services.jobs as jobs_module

    calls = {"params": None, "raise": None}

    def fake_run(params):
        calls["params"] = params
        if calls["raise"]:
            raise calls["raise"]
        return {
            "leads": [dict(lead) for lead in FAKE_LEADS],
            "source_requested": "auto",
            "source_used": "vertical_intelligence",
            "warning": None,
            "resources_used": ["Open Web"],
        }

    monkeypatch.setattr(jobs_module, "run_lead_gen", fake_run)
    return calls


def _auth(response) -> dict:
    return {"Authorization": f"Bearer {response.json()['access_token']}"}


def test_generate_job_happy_path(client, db, mailbox, fake_lead_gen):
    reg = register_user(client)
    headers = _auth(reg)

    started = client.post("/api/leads/generate", headers=headers, json={
        "source": "auto", "query": "saas founders", "max": 40,
    })
    assert started.status_code == 200, started.text
    body = started.json()
    assert body["status"] == "running" and body["job_id"]
    # unverified users are capped to a sample
    assert body["max_results"] == 15
    assert fake_lead_gen["params"]["max"] == 15

    status = client.get(f"/api/leads/generate/{body['job_id']}", headers=headers)
    payload = status.json()
    assert payload["status"] == "completed"
    assert payload["added"] == 2 and payload["duplicates_skipped"] == 1
    assert "Imported 2 leads" in payload["message"]

    listed = client.get("/api/leads/", headers=headers).json()
    assert listed["total"] == 2

    # quota: reserved 15, used 2, refund 13
    db.expire_all()
    user = db.query(User).filter_by(email="user@example.com").one()
    assert user.leads_used == 2


def test_generate_failure_refunds_quota(client, db, mailbox, fake_lead_gen):
    reg = register_user(client)
    headers = _auth(reg)
    fake_lead_gen["raise"] = LeadGenerationError("No leads found for that search.")

    started = client.post("/api/leads/generate", headers=headers, json={
        "source": "auto", "query": "nothing here", "max": 10,
    })
    job_id = started.json()["job_id"]

    status = client.get(f"/api/leads/generate/{job_id}", headers=headers).json()
    assert status["status"] == "failed"
    assert "No leads found" in status["message"]

    db.expire_all()
    user = db.query(User).filter_by(email="user@example.com").one()
    assert user.leads_used == 0  # full refund
    assert db.query(Lead).count() == 0


def test_generate_blocks_when_quota_exhausted(client, db, mailbox, fake_lead_gen):
    reg = register_user(client)
    headers = _auth(reg)

    db.query(User).filter_by(email="user@example.com").update({"leads_used": 10_000})
    db.commit()

    blocked = client.post("/api/leads/generate", headers=headers, json={
        "source": "auto", "query": "anything", "max": 10,
    })
    assert blocked.status_code == 402
    assert blocked.json()["detail"]["reason"] == "quota_exhausted"


def test_job_status_is_tenant_scoped(client, db, mailbox, fake_lead_gen):
    a = register_user(client, email="a@example.com")
    job = client.post("/api/leads/generate", headers=_auth(a), json={
        "source": "auto", "query": "saas", "max": 5,
    }).json()

    client.cookies.clear()
    b = register_user(client, email="b@example.com")
    other = client.get(f"/api/leads/generate/{job['job_id']}", headers=_auth(b))
    assert other.status_code == 404
