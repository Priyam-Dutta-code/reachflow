"""Lead generation orchestrator — PORTED from V1 `run_lead_gen` + the three
vertical-intelligence strategies. Split by source for Phase 4; behavior kept.
"""
import logging

from app.core.settings import get_settings
from app.services.leads.apollo import scrape_apollo
from app.services.leads.common import (
    LeadGenerationError,
    append_note,
    build_result,
    combine_text,
    email_ready_leads,
    enrich_leads,
    merge_lead_batches,
)
from app.services.leads.jobs_boards import PORTAL_LABELS, scrape_job_portal
from app.services.leads.maps import scrape_google_maps
from app.services.leads.selenium_linkedin import scrape_linkedin_selenium
from app.services.leads.web import scrape_web_search
from app.services.verticals import normalize_vertical

logger = logging.getLogger("reachflow.leads")

__all__ = ["run_lead_gen", "LeadGenerationError", "PORTAL_LABELS"]


def run_lead_gen(params: dict) -> dict:
    """Run lead generation and return email-ready leads plus source metadata."""
    source = params.get("source", "auto")
    query = params.get("query", "")
    location = params.get("location", "")
    industry = params.get("industry", "")
    audience = params.get("audience", "")
    offer = params.get("offer", "")
    goal = params.get("goal", "")
    method = params.get("method", "selenium")
    portal = params.get("portal", "naukri")
    max_r = int(params.get("max", 50))
    vertical = normalize_vertical(params.get("vertical"))
    settings = get_settings()

    if source == "auto":
        return _run_vertical_strategy(
            vertical=vertical, query=query, location=location, industry=industry,
            audience=audience, offer=offer, goal=goal, max_results=max_r,
        )

    if source == "google_maps":
        if not settings.google_maps_api_key:
            raise LeadGenerationError(
                "Google Maps needs a Google Maps API key. Add one in Settings or switch to Web Search or LinkedIn Jobs."
            )
        leads = email_ready_leads(scrape_google_maps(query, location, max_r), max_r)
        if not leads:
            raise LeadGenerationError(
                "No email-ready Google Maps leads were found for that search. Try Web Search, a broader query, or a nearby location."
            )
        return build_result(leads, source_requested=source, source_used="google_maps", resources_used=["Google Maps"])

    if source == "linkedin":
        if method == "apollo":
            if not settings.apollo_api_key:
                raise LeadGenerationError(
                    "Apollo lookup needs an Apollo API key. Add one in Settings or switch to Web Search."
                )
            leads = email_ready_leads(scrape_apollo(query, industry, location, max_r), max_r)
            if not leads:
                raise LeadGenerationError(
                    "Apollo did not return any email-ready matches. Try a broader title, industry, or location."
                )
            return build_result(leads, source_requested=source, source_used="apollo", resources_used=["Apollo"])

        if not settings.enable_selenium_sources:
            raise LeadGenerationError(
                "Browser-assisted LinkedIn search is not enabled on this deployment. Use Web Search or Apollo instead."
            )
        leads = email_ready_leads(
            enrich_leads(scrape_linkedin_selenium(query, industry, location, max_r), query=query, location=location),
            max_r,
        )
        if not leads:
            raise LeadGenerationError(
                "LinkedIn browser search found profiles but not usable email addresses. Use Apollo or Web Search for email-ready leads."
            )
        return build_result(
            leads, source_requested=source, source_used="linkedin_selenium",
            resources_used=["LinkedIn browser search"],
        )

    if source == "job_portal":
        leads = email_ready_leads(scrape_job_portal(portal, query, location, max_r), max_r)
        source_used = portal
        warning = None

        if not leads and portal != "linkedin_jobs":
            fallback_leads = email_ready_leads(scrape_job_portal("linkedin_jobs", query, location, max_r), max_r)
            if fallback_leads:
                leads = fallback_leads
                source_used = "linkedin_jobs"
                warning = (
                    f"{PORTAL_LABELS.get(portal, portal)} returned no accessible email-ready results, "
                    "so ReachFlow switched this run to LinkedIn Jobs."
                )

        if not leads:
            raise LeadGenerationError(
                "No email-ready leads were found for that search. Try LinkedIn Jobs, Web Search, a broader title, or a different location."
            )

        return build_result(
            leads, source_requested=source, source_used=source_used, warning=warning,
            resources_used=[PORTAL_LABELS.get(source_used, source_used)],
        )

    if source == "apollo":
        if not settings.apollo_api_key:
            raise LeadGenerationError(
                "Apollo source needs an Apollo API key. Add one in Settings or switch to Web Search."
            )
        leads = email_ready_leads(scrape_apollo(query, industry, location, max_r), max_r)
        if not leads:
            raise LeadGenerationError(
                "Apollo did not return any email-ready matches. Try a broader title, industry, or location."
            )
        return build_result(leads, source_requested=source, source_used="apollo", resources_used=["Apollo"])

    if source == "web_search":
        leads = email_ready_leads(scrape_web_search(query, industry, location, max_r), max_r)
        if not leads:
            raise LeadGenerationError(
                "Web Search did not find any usable email-ready leads. Try a narrower niche, service, or location."
            )
        return build_result(leads, source_requested=source, source_used="web_search", resources_used=["Open Web"])

    raise LeadGenerationError("This lead source is not available right now. Please choose another source.")


def _run_vertical_strategy(
    vertical: str, query: str, location: str, industry: str,
    audience: str, offer: str, goal: str, max_results: int,
) -> dict:
    if vertical in {"job_seeker", "recruiter"}:
        return _career_intelligence(vertical, query, location, industry, audience, goal, max_results)
    if vertical in {"agency", "business_growth"}:
        return _market_intelligence(vertical, query, location, industry, audience, offer, goal, max_results)
    return _partnership_intelligence(query, location, industry, audience, offer, goal, max_results)


def _career_intelligence(
    vertical: str, query: str, location: str, industry: str,
    audience: str, goal: str, max_results: int,
) -> dict:
    role_query = combine_text(query, industry if vertical == "recruiter" else "")
    if not role_query:
        raise LeadGenerationError("Add the target role or hiring focus before generating leads.")

    per_source = max(8, max_results // 3)
    resources: list[str] = []
    batches: list[list[dict]] = []

    for portal in ("linkedin_jobs", "indeed", "naukri"):
        leads = email_ready_leads(scrape_job_portal(portal, role_query, location, per_source), per_source)
        if leads:
            note = (
                "Hiring-company lead pulled from live recruitment signals."
                if vertical == "job_seeker"
                else "Hiring-company lead matched for recruiter outreach."
            )
            batches.append(append_note(leads, note))
            resources.append(PORTAL_LABELS.get(portal, portal))
            if len(merge_lead_batches(batches, max_results)) >= max_results:
                break

    web_query = (
        combine_text(role_query, "hiring companies", location, industry)
        if vertical == "job_seeker"
        else combine_text("companies hiring", role_query, location, industry, audience, goal)
    )
    web_leads = email_ready_leads(
        scrape_web_search(
            web_query, industry or query, location,
            max_results=max(per_source, max_results // 2),
            mode="career", role_label="Hiring Team", company_hint="Hiring Team",
        ),
        max(max_results // 2, per_source),
    )
    if web_leads:
        batches.append(
            append_note(
                web_leads,
                "Open-web company discovery confirmed this team through public hiring or careers signals.",
            )
        )
        resources.append("Open Web")

    leads = merge_lead_batches(batches, max_results)
    if not leads:
        raise LeadGenerationError(
            "ReachFlow could not find email-ready hiring leads for that role yet. Broaden the title, try a nearby market, or add an industry hint."
        )

    return build_result(leads, source_requested="auto", source_used="vertical_intelligence", resources_used=resources)


def _market_intelligence(
    vertical: str, query: str, location: str, industry: str,
    audience: str, offer: str, goal: str, max_results: int,
) -> dict:
    market_query = combine_text(industry, audience, location) or combine_text(query, audience, offer or goal)
    if not market_query:
        raise LeadGenerationError("Add the service, market, or buyer profile before generating leads.")

    resources: list[str] = []
    batches: list[list[dict]] = []
    target_seed = industry or audience or query
    market_descriptor = "brands" if vertical == "business_growth" else "companies"

    web_terms = [
        combine_text(target_seed, location, market_descriptor),
        combine_text(target_seed, location, "company"),
    ]
    for term in web_terms:
        if not term:
            continue
        leads = email_ready_leads(
            scrape_web_search(term, industry or query, location, max_results=max(10, max_results // 2)),
            max(max_results // 2, 10),
        )
        if leads:
            note = (
                "Matched to client-acquisition criteria for service-led outreach."
                if vertical == "agency"
                else "Matched to your growth-market criteria for outbound pipeline building."
            )
            batches.append(append_note(leads, note))
            if "Open Web" not in resources:
                resources.append("Open Web")
            if len(merge_lead_batches(batches, max_results)) >= max_results:
                break

    settings = get_settings()
    if settings.google_maps_api_key and location and len(merge_lead_batches(batches, max_results)) == 0:
        maps_query = combine_text(industry or query, audience or market_query)
        maps_leads = email_ready_leads(
            scrape_google_maps(maps_query, location, max(max_results // 2, 10)), max(max_results // 2, 10)
        )
        if maps_leads:
            batches.append(
                append_note(
                    maps_leads,
                    "Local-market lead discovered from business listings and enriched with public contact routes.",
                )
            )
            resources.append("Google Maps")

    leads = merge_lead_batches(batches, max_results)
    if not leads:
        raise LeadGenerationError(
            "ReachFlow could not find email-ready commercial leads for that market yet. Refine the offer, niche, or location and try again."
        )

    return build_result(leads, source_requested="auto", source_used="vertical_intelligence", resources_used=resources)


def _partnership_intelligence(
    query: str, location: str, industry: str, audience: str,
    offer: str, goal: str, max_results: int,
) -> dict:
    partner_thesis = combine_text(query, audience, offer, goal)
    if not partner_thesis:
        raise LeadGenerationError("Add the partner type, thesis, or target segment before generating leads.")

    resources = ["Open Web"]
    batches: list[list[dict]] = []

    for term in [
        combine_text(partner_thesis, industry, location),
        combine_text(partner_thesis, "partners", location),
    ]:
        if not term:
            continue
        leads = email_ready_leads(
            scrape_web_search(
                term, industry or query, location,
                max_results=max(12, max_results // 2),
                mode="partnership", role_label="Partnership Team", company_hint="Partnership Team",
            ),
            max(max_results // 2, 12),
        )
        if leads:
            batches.append(
                append_note(
                    leads,
                    "Strategic-partner lead identified from public company and channel signals.",
                )
            )
            if len(merge_lead_batches(batches, max_results)) >= max_results:
                break

    leads = merge_lead_batches(batches, max_results)
    if not leads:
        raise LeadGenerationError(
            "ReachFlow could not find email-ready partner accounts for that thesis yet. Try a clearer partner type, market, or category."
        )

    return build_result(leads, source_requested="auto", source_used="vertical_intelligence", resources_used=resources)
