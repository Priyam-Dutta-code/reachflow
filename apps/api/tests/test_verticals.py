"""Sanity over the verbatim-ported verticals catalog (the sacred config)."""
from app.db.models.enums import PlanType
from app.services.verticals import (
    DEFAULT_VERTICAL,
    PLAN_CATALOG,
    VERTICALS,
    default_plan_key,
    entitlements_for_user,
    get_plan,
    normalize_vertical,
)


def test_five_verticals_present():
    assert set(VERTICALS) == {
        "job_seeker", "recruiter", "agency", "business_growth", "partnerships"
    }
    assert DEFAULT_VERTICAL == "business_growth"


def test_normalize_vertical():
    assert normalize_vertical("Agency ") == "agency"
    assert normalize_vertical("nonsense") == DEFAULT_VERTICAL
    assert normalize_vertical(None) == DEFAULT_VERTICAL


def test_every_vertical_has_free_plan_with_entitlements():
    for _vertical, plans in PLAN_CATALOG.items():
        free = plans[0]
        assert free["amount"] == 0.0
        assert free["plan_type"] == PlanType.free
        ent = free["entitlements"]
        assert ent["campaign_slots"] >= 1
        assert ent["daily_send_cap"] >= 25


def test_entitlements_for_user_shape():
    class FakeUser:
        vertical = "recruiter"
        plan_key = default_plan_key("recruiter")
        plan = PlanType.free

    ent = entitlements_for_user(FakeUser())
    assert ent["vertical"] == "recruiter"
    assert ent["plan_key"] == "recruiter_starter"
    assert "daily_send_cap" in ent and "campaign_slots" in ent


def test_get_plan_falls_back_to_free():
    plan = get_plan("unknown_plan_key", "agency")
    assert plan["plan_type"] == PlanType.free
    assert plan["vertical"] == "agency"
