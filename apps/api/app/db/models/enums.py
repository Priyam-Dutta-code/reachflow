"""Enums — PORTED from V1 `database.py` unchanged (values are API contract)."""
import enum


class PlanType(str, enum.Enum):
    free = "free"
    pro = "pro"
    agency = "agency"
    lifetime = "lifetime"


class LeadStatus(str, enum.Enum):
    pending = "pending"
    sent = "sent"
    replied = "replied"
    bounced = "bounced"
    unsubscribed = "unsubscribed"


class CampaignStatus(str, enum.Enum):
    draft = "draft"
    active = "active"
    paused = "paused"
    complete = "complete"


class LeadSource(str, enum.Enum):
    google_maps = "google_maps"
    linkedin_selenium = "linkedin_selenium"
    apollo = "apollo"
    naukri = "naukri"
    indeed = "indeed"
    linkedin_jobs = "linkedin_jobs"
    web_search = "web_search"
    manual = "manual"
