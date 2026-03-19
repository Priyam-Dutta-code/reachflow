"""Vertical catalog, plans, and entitlements for ReachFlow."""

from copy import deepcopy

from database import PlanType

DEFAULT_VERTICAL = "business_growth"

VERTICALS = {
    "job_seeker": {
        "id": "job_seeker",
        "label": "Job Seekers",
        "headline": "Find hiring companies and reach them with stronger application emails.",
        "summary": "Built for students and professionals who want targeted job leads, hiring inboxes, and better outreach.",
        "generator_label": "Career intelligence",
        "generator_note": "Searches live hiring signals and company career paths so you get relevant job-focused leads.",
    },
    "recruiter": {
        "id": "recruiter",
        "label": "Recruiters",
        "headline": "Track hiring demand and reach the right companies faster.",
        "summary": "For recruiters and staffing teams sourcing hiring companies, outreach routes, and candidate-placement opportunities.",
        "generator_label": "Hiring-company intelligence",
        "generator_note": "Combines hiring signals and company discovery to surface reachable employer accounts.",
    },
    "agency": {
        "id": "agency",
        "label": "Agencies",
        "headline": "Build client pipelines with better-fit companies and usable inboxes.",
        "summary": "For freelancers, agencies, and consultants running outbound for client acquisition and service-led growth.",
        "generator_label": "Client-acquisition intelligence",
        "generator_note": "Searches the open web and local company signals to find ideal client accounts by niche and market.",
    },
    "business_growth": {
        "id": "business_growth",
        "label": "Business Growth",
        "headline": "Turn niche markets into email-ready lead lists for growth campaigns.",
        "summary": "For business owners, growth teams, and marketers who need segmented outreach and campaign control.",
        "generator_label": "Growth-market intelligence",
        "generator_note": "Combines company discovery, public contact enrichment, and market targeting for outbound growth.",
    },
    "partnerships": {
        "id": "partnerships",
        "label": "Partnerships",
        "headline": "Build targeted lists for strategic partnerships and business development.",
        "summary": "For founders and partnership teams opening conversations with affiliates, channels, and strategic partners.",
        "generator_label": "Partner-discovery intelligence",
        "generator_note": "Targets organizations that match your partnership thesis and surfaces reachable contact routes.",
    },
}

PLAN_CATALOG = {
    "job_seeker": [
        {
            "id": "job_seeker_free",
            "name": "Launch Free",
            "amount": 0.0,
            "per": "/mo",
            "plan_type": PlanType.free,
            "leads_quota": 120,
            "credits": 40,
            "features": [
                "Job-focused dashboard",
                "Multi-source hiring-company lead generation",
                "AI application email previews",
                "1 active campaign",
                "Basic analytics",
            ],
            "entitlements": {
                "campaign_slots": 1,
                "daily_send_cap": 25,
                "analytics_level": "basic",
                "follow_up_automation": False,
                "reply_checks": False,
            },
        },
        {
            "id": "job_seeker_interview",
            "name": "Interview Plus",
            "amount": 499.0,
            "per": "/mo",
            "plan_type": PlanType.pro,
            "leads_quota": 700,
            "credits": 220,
            "popular": True,
            "features": [
                "Everything in Launch Free",
                "Deeper company and hiring-contact coverage",
                "Advanced outreach drafts and follow-up templates",
                "5 active campaigns",
                "Advanced analytics",
            ],
            "entitlements": {
                "campaign_slots": 5,
                "daily_send_cap": 80,
                "analytics_level": "advanced",
                "follow_up_automation": True,
                "reply_checks": True,
            },
        },
        {
            "id": "job_seeker_offer",
            "name": "Offer Sprint",
            "amount": 1299.0,
            "per": "/mo",
            "plan_type": PlanType.agency,
            "leads_quota": 2500,
            "credits": 900,
            "features": [
                "Everything in Interview Plus",
                "Higher-volume hiring-company sourcing",
                "Priority campaign capacity",
                "15 active campaigns",
                "High-volume send limits",
            ],
            "entitlements": {
                "campaign_slots": 15,
                "daily_send_cap": 200,
                "analytics_level": "advanced",
                "follow_up_automation": True,
                "reply_checks": True,
            },
        },
    ],
    "recruiter": [
        {
            "id": "recruiter_starter",
            "name": "Talent Starter",
            "amount": 0.0,
            "per": "/mo",
            "plan_type": PlanType.free,
            "leads_quota": 220,
            "credits": 80,
            "features": [
                "Recruiter dashboard",
                "Hiring-company lead generation",
                "Employer outreach drafts",
                "2 active campaigns",
                "Core analytics",
            ],
            "entitlements": {
                "campaign_slots": 2,
                "daily_send_cap": 35,
                "analytics_level": "basic",
                "follow_up_automation": False,
                "reply_checks": False,
            },
        },
        {
            "id": "recruiter_desk",
            "name": "Talent Desk",
            "amount": 1499.0,
            "per": "/mo",
            "plan_type": PlanType.pro,
            "leads_quota": 1200,
            "credits": 400,
            "features": [
                "Recruiter-specific dashboard",
                "Hiring-company discovery",
                "Employer outreach drafts",
                "6 active campaigns",
                "Advanced analytics",
            ],
            "entitlements": {
                "campaign_slots": 6,
                "daily_send_cap": 120,
                "analytics_level": "advanced",
                "follow_up_automation": True,
                "reply_checks": True,
            },
        },
        {
            "id": "recruiter_team",
            "name": "Search Team",
            "amount": 3999.0,
            "per": "/mo",
            "plan_type": PlanType.agency,
            "leads_quota": 5000,
            "credits": 2000,
            "popular": True,
            "features": [
                "Everything in Talent Desk",
                "Broader hiring-market coverage",
                "Faster multi-campaign execution",
                "20 active campaigns",
                "Priority automation capacity",
            ],
            "entitlements": {
                "campaign_slots": 20,
                "daily_send_cap": 350,
                "analytics_level": "advanced",
                "follow_up_automation": True,
                "reply_checks": True,
            },
        },
        {
            "id": "recruiter_firm",
            "name": "Placement Engine",
            "amount": 8999.0,
            "per": "/mo",
            "plan_type": PlanType.agency,
            "leads_quota": 16000,
            "credits": 7000,
            "features": [
                "Everything in Search Team",
                "Firm-scale outreach capacity",
                "Higher recruiter credit pools",
                "60 active campaigns",
                "Highest send limits",
            ],
            "entitlements": {
                "campaign_slots": 60,
                "daily_send_cap": 900,
                "analytics_level": "advanced",
                "follow_up_automation": True,
                "reply_checks": True,
            },
        },
    ],
    "agency": [
        {
            "id": "agency_starter",
            "name": "Agency Starter",
            "amount": 0.0,
            "per": "/mo",
            "plan_type": PlanType.free,
            "leads_quota": 180,
            "credits": 70,
            "features": [
                "Agency pipeline dashboard",
                "Client-acquisition lead generation",
                "AI outbound drafts",
                "2 active campaigns",
                "Core analytics",
            ],
            "entitlements": {
                "campaign_slots": 2,
                "daily_send_cap": 35,
                "analytics_level": "basic",
                "follow_up_automation": False,
                "reply_checks": False,
            },
        },
        {
            "id": "agency_solo",
            "name": "Solo Operator",
            "amount": 1499.0,
            "per": "/mo",
            "plan_type": PlanType.pro,
            "leads_quota": 1200,
            "credits": 450,
            "features": [
                "Agency pipeline dashboard",
                "Client-acquisition lead generation",
                "AI outbound drafts",
                "8 active campaigns",
                "Advanced analytics",
            ],
            "entitlements": {
                "campaign_slots": 8,
                "daily_send_cap": 150,
                "analytics_level": "advanced",
                "follow_up_automation": True,
                "reply_checks": True,
            },
        },
        {
            "id": "agency_client_pod",
            "name": "Client Pod",
            "amount": 3499.0,
            "per": "/mo",
            "plan_type": PlanType.agency,
            "leads_quota": 4500,
            "credits": 1800,
            "popular": True,
            "features": [
                "Everything in Solo Operator",
                "Broader market and local-business sourcing",
                "20 active campaigns",
                "Higher send throughput",
                "Priority automation",
            ],
            "entitlements": {
                "campaign_slots": 20,
                "daily_send_cap": 350,
                "analytics_level": "advanced",
                "follow_up_automation": True,
                "reply_checks": True,
            },
        },
        {
            "id": "agency_ops",
            "name": "Agency Ops",
            "amount": 7999.0,
            "per": "/mo",
            "plan_type": PlanType.agency,
            "leads_quota": 15000,
            "credits": 6000,
            "features": [
                "Everything in Client Pod",
                "Multi-client outbound capacity",
                "60 active campaigns",
                "Largest monthly lead pool",
                "Highest send limits",
            ],
            "entitlements": {
                "campaign_slots": 60,
                "daily_send_cap": 800,
                "analytics_level": "advanced",
                "follow_up_automation": True,
                "reply_checks": True,
            },
        },
    ],
    "business_growth": [
        {
            "id": "business_growth_starter",
            "name": "Market Starter",
            "amount": 0.0,
            "per": "/mo",
            "plan_type": PlanType.free,
            "leads_quota": 160,
            "credits": 60,
            "features": [
                "Growth dashboard",
                "Market-specific lead generation",
                "AI cold email drafts",
                "2 active campaigns",
                "Core analytics",
            ],
            "entitlements": {
                "campaign_slots": 2,
                "daily_send_cap": 30,
                "analytics_level": "basic",
                "follow_up_automation": False,
                "reply_checks": False,
            },
        },
        {
            "id": "business_growth_explorer",
            "name": "Market Explorer",
            "amount": 999.0,
            "per": "/mo",
            "plan_type": PlanType.pro,
            "leads_quota": 600,
            "credits": 250,
            "features": [
                "Growth dashboard",
                "Market-specific lead generation",
                "AI cold email drafts",
                "3 active campaigns",
                "Advanced analytics",
            ],
            "entitlements": {
                "campaign_slots": 3,
                "daily_send_cap": 100,
                "analytics_level": "advanced",
                "follow_up_automation": True,
                "reply_checks": True,
            },
        },
        {
            "id": "business_growth_engine",
            "name": "Growth Engine",
            "amount": 2499.0,
            "per": "/mo",
            "plan_type": PlanType.agency,
            "leads_quota": 2500,
            "credits": 1100,
            "popular": True,
            "features": [
                "Everything in Market Explorer",
                "Broader account discovery and enrichment",
                "10 active campaigns",
                "Higher daily send throughput",
                "Advanced analytics and automation",
            ],
            "entitlements": {
                "campaign_slots": 10,
                "daily_send_cap": 250,
                "analytics_level": "advanced",
                "follow_up_automation": True,
                "reply_checks": True,
            },
        },
        {
            "id": "business_growth_scale",
            "name": "Revenue Studio",
            "amount": 5999.0,
            "per": "/mo",
            "plan_type": PlanType.agency,
            "leads_quota": 8000,
            "credits": 4000,
            "features": [
                "Everything in Growth Engine",
                "Scale-ready outbound capacity",
                "30 active campaigns",
                "Largest lead and credit pool",
                "Highest send limits",
            ],
            "entitlements": {
                "campaign_slots": 30,
                "daily_send_cap": 500,
                "analytics_level": "advanced",
                "follow_up_automation": True,
                "reply_checks": True,
            },
        },
    ],
    "partnerships": [
        {
            "id": "partnerships_starter",
            "name": "Partner Starter",
            "amount": 0.0,
            "per": "/mo",
            "plan_type": PlanType.free,
            "leads_quota": 150,
            "credits": 60,
            "features": [
                "Partnership dashboard",
                "Strategic account discovery",
                "Relationship-first drafts",
                "2 active campaigns",
                "Core analytics",
            ],
            "entitlements": {
                "campaign_slots": 2,
                "daily_send_cap": 30,
                "analytics_level": "basic",
                "follow_up_automation": False,
                "reply_checks": False,
            },
        },
        {
            "id": "partnerships_scout",
            "name": "Partner Scout",
            "amount": 899.0,
            "per": "/mo",
            "plan_type": PlanType.pro,
            "leads_quota": 500,
            "credits": 200,
            "features": [
                "Partnership dashboard",
                "Strategic account discovery",
                "Relationship-first email drafts",
                "3 active campaigns",
                "Advanced analytics",
            ],
            "entitlements": {
                "campaign_slots": 3,
                "daily_send_cap": 80,
                "analytics_level": "advanced",
                "follow_up_automation": True,
                "reply_checks": True,
            },
        },
        {
            "id": "partnerships_growth",
            "name": "Alliance Growth",
            "amount": 2199.0,
            "per": "/mo",
            "plan_type": PlanType.agency,
            "leads_quota": 2200,
            "credits": 900,
            "popular": True,
            "features": [
                "Everything in Partner Scout",
                "Broader partner and channel discovery",
                "10 active campaigns",
                "Higher send throughput",
                "Advanced automation",
            ],
            "entitlements": {
                "campaign_slots": 10,
                "daily_send_cap": 200,
                "analytics_level": "advanced",
                "follow_up_automation": True,
                "reply_checks": True,
            },
        },
        {
            "id": "partnerships_strategic",
            "name": "Strategic Network",
            "amount": 4999.0,
            "per": "/mo",
            "plan_type": PlanType.agency,
            "leads_quota": 7000,
            "credits": 3000,
            "features": [
                "Everything in Alliance Growth",
                "High-volume strategic account coverage",
                "25 active campaigns",
                "Largest partner-credit pool",
                "Highest send limits",
            ],
            "entitlements": {
                "campaign_slots": 25,
                "daily_send_cap": 500,
                "analytics_level": "advanced",
                "follow_up_automation": True,
                "reply_checks": True,
            },
        },
    ],
}

TOPUPS = {
    "job_seeker": {"id": "job_seeker_booster", "name": "200 Outreach Credits", "amount": 149.0, "credits": 200},
    "recruiter": {"id": "recruiter_booster", "name": "500 Outreach Credits", "amount": 699.0, "credits": 500},
    "agency": {"id": "agency_booster", "name": "500 Outreach Credits", "amount": 699.0, "credits": 500},
    "business_growth": {"id": "business_growth_booster", "name": "250 Outreach Credits", "amount": 349.0, "credits": 250},
    "partnerships": {"id": "partnerships_booster", "name": "250 Outreach Credits", "amount": 349.0, "credits": 250},
}

PLAN_INDEX = {
    plan["id"]: {**plan, "vertical": vertical_id}
    for vertical_id, plans in PLAN_CATALOG.items()
    for plan in plans
}
TOPUP_INDEX = {
    pack["id"]: {**pack, "vertical": vertical_id}
    for vertical_id, pack in TOPUPS.items()
}


def normalize_vertical(vertical: str | None) -> str:
    candidate = (vertical or "").strip().lower()
    return candidate if candidate in VERTICALS else DEFAULT_VERTICAL


def get_vertical_config(vertical: str | None) -> dict:
    return deepcopy(VERTICALS[normalize_vertical(vertical)])


def get_vertical_plans(vertical: str | None) -> list[dict]:
    return deepcopy(PLAN_CATALOG[normalize_vertical(vertical)])


def get_vertical_topup(vertical: str | None) -> dict:
    return deepcopy(TOPUPS[normalize_vertical(vertical)])


def default_plan_key(vertical: str | None) -> str:
    normalized = normalize_vertical(vertical)
    return PLAN_CATALOG[normalized][0]["id"]


def _legacy_plan_key(vertical: str | None, plan_type) -> str:
    normalized = normalize_vertical(vertical)
    plans = PLAN_CATALOG[normalized]
    if plan_type == PlanType.free:
        return plans[0]["id"]
    if plan_type == PlanType.pro:
        return plans[1]["id"] if len(plans) > 1 else plans[0]["id"]
    return plans[-1]["id"]


def matching_plan_key(vertical: str | None, plan_type) -> str:
    return _legacy_plan_key(vertical, plan_type)


def get_plan(plan_key: str | None, vertical: str | None = None) -> dict:
    if plan_key in PLAN_INDEX:
        return deepcopy(PLAN_INDEX[plan_key])
    fallback = _legacy_plan_key(vertical, PlanType.free)
    return deepcopy(PLAN_INDEX[fallback])


def get_topup(pack_id: str | None, vertical: str | None = None) -> dict:
    if pack_id in TOPUP_INDEX:
        return deepcopy(TOPUP_INDEX[pack_id])
    return get_vertical_topup(vertical)


def is_known_plan(plan_key: str | None) -> bool:
    return bool(plan_key in PLAN_INDEX)


def is_known_topup(pack_id: str | None) -> bool:
    return bool(pack_id in TOPUP_INDEX)


def plan_for_user(user) -> dict:
    vertical = normalize_vertical(getattr(user, "vertical", None))
    plan_key = (getattr(user, "plan_key", "") or "").strip()
    if plan_key in PLAN_INDEX:
        return deepcopy(PLAN_INDEX[plan_key])

    broad_plan = getattr(user, "plan", PlanType.free)
    return deepcopy(PLAN_INDEX[_legacy_plan_key(vertical, broad_plan)])


def entitlements_for_user(user) -> dict:
    plan = plan_for_user(user)
    entitlements = deepcopy(plan.get("entitlements", {}))
    entitlements["plan_key"] = plan["id"]
    entitlements["plan_name"] = plan["name"]
    entitlements["vertical"] = plan["vertical"]
    return entitlements
