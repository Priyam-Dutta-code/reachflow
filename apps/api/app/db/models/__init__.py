"""Import every model so Base.metadata sees the full schema (Alembic + tests)."""
from app.db.models.campaign import Campaign
from app.db.models.email_log import EmailLog
from app.db.models.enums import CampaignStatus, LeadSource, LeadStatus, PlanType
from app.db.models.lead import Lead
from app.db.models.payment import Payment
from app.db.models.user import User

__all__ = [
    "PlanType", "LeadStatus", "CampaignStatus", "LeadSource",
    "User", "Lead", "Campaign", "EmailLog", "Payment",
]
