"""The compliance-first send pipeline: suppression, idempotency, bounces,
caps, verification gate, footer."""
import pytest

from app.db.models import Campaign, CampaignStatus, EmailLog, Lead, LeadStatus
from app.services import send_engine
from app.services.send_engine import run_campaign_batch, suppress
from tests.conftest import make_verified_user


@pytest.fixture()
def outbox(monkeypatch):
    """Capture SMTP sends; everything succeeds unless told otherwise."""
    sent: list[dict] = []
    failures: dict[str, str] = {}

    def fake_send(user, to_email, subject, body):
        if to_email in failures:
            return False, failures[to_email]
        sent.append({"to": to_email, "subject": subject, "body": body})
        return True, None

    monkeypatch.setattr(send_engine, "send_smtp", fake_send)
    monkeypatch.setattr(
        send_engine, "generate_email_for_lead",
        lambda lead, user: (f"Subject for {lead.company}", f"Body for {lead.company}"),
    )
    monkeypatch.setattr(
        send_engine, "generate_followup_for_lead",
        lambda lead, user: (f"Follow-up for {lead.company}", "Follow-up body"),
    )
    return {"sent": sent, "failures": failures}


def _campaign_with_leads(db, user, count=3, emails_per_day=25):
    campaign = Campaign(user_id=user.id, name="C", emails_per_day=emails_per_day,
                        status=CampaignStatus.active)
    db.add(campaign)
    db.commit()
    leads = []
    for i in range(count):
        lead = Lead(user_id=user.id, campaign_id=campaign.id,
                    email=f"lead{i}@example.com", company=f"Co{i}")
        db.add(lead)
        leads.append(lead)
    db.commit()
    return campaign, leads


def test_batch_sends_with_footer_and_decrements_credits(db, outbox):
    user = make_verified_user(db, credits=10)
    campaign, _ = _campaign_with_leads(db, user, count=2)

    result = run_campaign_batch(db, user.id, campaign.id, pace_seconds=0)
    assert result["sent"] == 2

    body = outbox["sent"][0]["body"]
    assert "Sent by Sender Name" in body
    assert "/unsubscribe?token=" in body

    db.expire_all()
    assert db.get(type(user), user.id).credits == 8
    assert db.query(EmailLog).filter_by(status="sent").count() == 2
    # all eligible leads done → campaign completes
    assert db.get(Campaign, campaign.id).status == CampaignStatus.complete


def test_unverified_sender_cannot_send(db, outbox):
    user = make_verified_user(db, email_verified_at=None)
    campaign, _ = _campaign_with_leads(db, user)

    result = run_campaign_batch(db, user.id, campaign.id, pace_seconds=0)
    assert result["reason"] == "sender_not_verified"
    assert outbox["sent"] == []


def test_suppressed_lead_is_never_emailed(db, outbox):
    user = make_verified_user(db)
    campaign, leads = _campaign_with_leads(db, user, count=2)
    suppress(db, user.id, leads[0].email)

    result = run_campaign_batch(db, user.id, campaign.id, pace_seconds=0)
    assert result["sent"] == 1
    assert {mail["to"] for mail in outbox["sent"]} == {leads[1].email}


def test_send_is_idempotent_across_runs(db, outbox):
    user = make_verified_user(db)
    campaign, _ = _campaign_with_leads(db, user, count=2)

    first = run_campaign_batch(db, user.id, campaign.id, pace_seconds=0)
    second = run_campaign_batch(db, user.id, campaign.id, pace_seconds=0)
    assert first["sent"] == 2
    assert second["sent"] == 0
    assert len(outbox["sent"]) == 2
    assert db.query(EmailLog).filter_by(status="sent").count() == 2


def test_permanent_failure_marks_bounced_and_suppresses(db, outbox):
    user = make_verified_user(db)
    campaign, leads = _campaign_with_leads(db, user, count=1)
    outbox["failures"][leads[0].email] = "550 5.1.1 recipient rejected: mailbox unavailable"

    result = run_campaign_batch(db, user.id, campaign.id, pace_seconds=0)
    assert result["sent"] == 0 and result["failed"] == 1

    db.expire_all()
    assert db.get(Lead, leads[0].id).status == LeadStatus.bounced
    assert send_engine.is_suppressed(db, user.id, leads[0].email)


def test_daily_cap_and_batch_limit(db, outbox):
    user = make_verified_user(db)
    campaign, _ = _campaign_with_leads(db, user, count=5, emails_per_day=3)

    result = run_campaign_batch(db, user.id, campaign.id, pace_seconds=0)
    assert result["sent"] == 3  # plan/campaign daily cap

    # next run today: budget exhausted
    again = run_campaign_batch(db, user.id, campaign.id, pace_seconds=0)
    assert again["reason"] == "daily_cap_reached"


def test_followups_only_for_entitled_verified_users(db, outbox):
    from datetime import datetime, timedelta

    from app.services.send_engine import process_followups

    # free plan: no follow_up_automation entitlement
    user = make_verified_user(db)
    campaign, leads = _campaign_with_leads(db, user, count=1)
    lead = leads[0]
    lead.status = LeadStatus.sent
    lead.sent_date = datetime.utcnow() - timedelta(days=10)
    db.commit()

    assert process_followups(db, user.id)["sent"] == 0

    # paid plan key with automation: follow-up goes out once, then never again
    user.plan_key = "business_growth_explorer"
    db.commit()
    assert process_followups(db, user.id)["sent"] == 1
    assert process_followups(db, user.id)["sent"] == 0
    followup_log = db.query(EmailLog).filter_by(is_followup=True, status="sent").one()
    assert "/unsubscribe?token=" in followup_log.body
