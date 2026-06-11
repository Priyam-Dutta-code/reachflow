"""AI drafting: structure per vertical (mocked client), model fallback,
deterministic templates when the LLM fails."""
import json

import pytest

from app.services import ai_service
from tests.conftest import make_verified_user

VERTICALS = ["job_seeker", "recruiter", "agency", "business_growth", "partnerships"]


class FakeCompletion:
    def __init__(self, content):
        self.choices = [type("C", (), {"message": type("M", (), {"content": content})()})()]


class FakeClient:
    """Returns canned JSON; can simulate a rate-limited primary model."""

    def __init__(self, rate_limit_primary=False):
        self.rate_limit_primary = rate_limit_primary
        self.models_called = []

        outer = self

        class Completions:
            def create(self, model, messages, temperature, max_tokens):
                outer.models_called.append(model)
                if outer.rate_limit_primary and model == ai_service.PRIMARY_MODEL:
                    raise RuntimeError("429 rate limit exceeded")
                draft = {"subject": f"A precise subject from {model}"[:59], "body": "Dear Team,\n\nHello.\n\nBest regards,\nSender"}
                return FakeCompletion(json.dumps(draft))

        self.chat = type("Chat", (), {"completions": Completions()})()


class FakeLead:
    def __init__(self):
        self.company = "Acme Studio"
        self.name = "Maya"
        self.title = "Founder"
        self.email = "maya@acme.co"
        self.industry = "design"
        self.location = "Pune"
        self.website = ""
        self.notes = ""
        self.source = "web_search"


@pytest.fixture(autouse=True)
def clear_ai_cache():
    ai_service._cache.clear()


@pytest.mark.parametrize("vertical", VERTICALS)
def test_draft_structure_per_vertical(db, monkeypatch, vertical):
    user = make_verified_user(db, email=f"{vertical}@example.com", vertical=vertical)
    fake = FakeClient()
    monkeypatch.setattr(ai_service, "_client", lambda u: fake)

    subject, body = ai_service.generate_email_for_lead(FakeLead(), user)
    assert 0 < len(subject) < 60
    assert body.startswith("Dear")
    assert fake.models_called == [ai_service.PRIMARY_MODEL]

    # cached on second call — no extra model hit
    ai_service.generate_email_for_lead(FakeLead(), user)
    assert len(fake.models_called) == 1


def test_model_fallback_on_rate_limit(db, monkeypatch):
    user = make_verified_user(db, email="fb@example.com")
    fake = FakeClient(rate_limit_primary=True)
    monkeypatch.setattr(ai_service, "_client", lambda u: fake)

    subject, _ = ai_service.generate_email_for_lead(FakeLead(), user)
    assert ai_service.FALLBACK_MODEL in fake.models_called
    assert ai_service.FALLBACK_MODEL in subject  # canned subject names the model


def test_fallback_template_when_llm_unavailable(db, monkeypatch):
    user = make_verified_user(db, email="tmpl@example.com", vertical="agency")

    def boom(_):
        raise RuntimeError("connection error")

    monkeypatch.setattr(ai_service, "_client", boom)
    subject, body = ai_service.generate_email_for_lead(FakeLead(), user)
    assert "Acme Studio" in subject
    assert body.startswith("Dear Maya")
    assert "Best regards," in body  # real newlines in fallback signature
    assert "\\n" not in body


@pytest.mark.parametrize("vertical", VERTICALS)
def test_followup_structure_per_vertical(db, monkeypatch, vertical):
    user = make_verified_user(db, email=f"fu-{vertical}@example.com", vertical=vertical)
    fake = FakeClient()
    monkeypatch.setattr(ai_service, "_client", lambda u: fake)

    subject, body = ai_service.generate_followup_for_lead(FakeLead(), user)
    assert 0 < len(subject) < 60
    assert body.startswith("Dear")
