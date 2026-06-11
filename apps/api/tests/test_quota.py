"""Quota reservation is atomic, partial-aware, and never negative."""
from app.services.quota import refund_quota, remaining_quota, reserve_quota
from tests.conftest import make_verified_user


def test_reserve_full_and_partial(db):
    user = make_verified_user(db, leads_quota=50, leads_used=0)

    assert reserve_quota(db, user.id, 30) == 30
    db.refresh(user)
    assert user.leads_used == 30

    # only 20 left; asking for 40 grants the remainder
    assert reserve_quota(db, user.id, 40) == 20
    db.refresh(user)
    assert user.leads_used == 50
    assert remaining_quota(user) == 0

    # exhausted
    assert reserve_quota(db, user.id, 1) == 0


def test_refund_floors_at_zero(db):
    user = make_verified_user(db, leads_quota=50, leads_used=10)

    refund_quota(db, user.id, 4)
    db.refresh(user)
    assert user.leads_used == 6

    refund_quota(db, user.id, 999)
    db.refresh(user)
    assert user.leads_used == 0
