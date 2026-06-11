from app.db.models import (
    Campaign,
    CampaignStatus,
    EmailLog,
    Lead,
    LeadSource,
    LeadStatus,
    Payment,
    PlanType,
    User,
)


def test_full_model_round_trip(db):
    user = User(email="t@example.com", name="T", vertical="agency")
    db.add(user)
    db.commit()

    assert len(user.id) == 32  # uuid4().hex, server-generated
    assert user.plan == PlanType.free
    assert user.password_hash is None and user.email_verified_at is None

    campaign = Campaign(user_id=user.id, name="C1")
    db.add(campaign)
    db.commit()
    assert campaign.status == CampaignStatus.draft

    lead = Lead(user_id=user.id, campaign_id=campaign.id, email="lead@x.com",
                company="X", source=LeadSource.web_search)
    db.add(lead)
    db.commit()
    assert lead.status == LeadStatus.pending

    log = EmailLog(user_id=user.id, campaign_id=campaign.id, lead_id=lead.id,
                   to_email="lead@x.com", subject="s", body="b")
    payment = Payment(user_id=user.id, amount=499.0, plan="agency_solo",
                      provider_id="RF_TEST_1")
    db.add_all([log, payment])
    db.commit()

    # relationships
    assert user.leads[0].campaign.id == campaign.id
    assert campaign.email_logs[0].to_email == "lead@x.com"

    # cascade: deleting the user removes leads/campaigns
    db.delete(user)
    db.commit()
    assert db.query(Lead).count() == 0
    assert db.query(Campaign).count() == 0
