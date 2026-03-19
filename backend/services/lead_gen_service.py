"""
services/lead_gen_service.py - Lead generation, web discovery, and email enrichment.
"""

from concurrent.futures import ThreadPoolExecutor
from html import unescape
import re
import time
from urllib.parse import parse_qs, unquote, urlparse

import requests
from bs4 import BeautifulSoup

from config import APOLLO_API_KEY, GMAIL_PASSWORD, GOOGLE_MAPS_API_KEY, SENDER_EMAIL
from verticals import normalize_vertical

HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/120.0.0.0 Safari/537.36"
    )
}

BRAVE_SEARCH_URL = "https://search.brave.com/search"
CLEARBIT_AUTOCOMPLETE_URL = "https://autocomplete.clearbit.com/v1/companies/suggest"
EMAIL_RE = re.compile(r"[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}")
SKIP_DOMAINS = {
    "example.com",
    "domain.com",
    "yourdomain.com",
    "sentry.io",
    "wix.com",
    "wordpress.com",
    "png",
    "jpg",
    "gif",
    "svg",
}
SEARCH_BLOCKLIST = {
    "apollo.io",
    "bark.com",
    "clutch.co",
    "crunchbase.com",
    "duckduckgo.com",
    "designrush.com",
    "facebook.com",
    "foundit.in",
    "g2.com",
    "glassdoor.com",
    "google.com",
    "goodfirms.co",
    "indiamart.com",
    "instagram.com",
    "indeed.com",
    "justdial.com",
    "jobrapido.com",
    "linkedin.com",
    "naukri.com",
    "reddit.com",
    "registerkaro.in",
    "search.brave.com",
    "sortlist.com",
    "trustpilot.com",
    "twitter.com",
    "wikipedia.org",
    "x.com",
    "yahoo.com",
    "yellowpages.com",
    "yelp.com",
    "youtube.com",
    "techbehemoths.com",
}
PORTAL_LABELS = {
    "naukri": "Naukri",
    "indeed": "Indeed",
    "linkedin_jobs": "LinkedIn Jobs",
}
CAREER_ALIASES = ["careers", "jobs", "hiring", "talent", "recruiting", "hr", "people"]
BUSINESS_ALIASES = ["hello", "sales", "info", "partnerships", "growth", "contact"]
PARTNERSHIP_ALIASES = ["partnerships", "alliances", "bd", "hello", "info"]
EMAIL_NEGATIVE_HINTS = {"abuse", "billing", "care", "legal", "noreply", "no-reply", "privacy", "security", "support"}
MULTIPART_TLDS = {"co.in", "co.uk", "com.au", "com.br", "com.mx", "co.jp", "org.uk"}
COMPANY_STOPWORDS = {
    "and",
    "co",
    "company",
    "corp",
    "corporation",
    "group",
    "holdings",
    "inc",
    "india",
    "limited",
    "llc",
    "llp",
    "ltd",
    "private",
    "pvt",
    "services",
    "solutions",
    "technologies",
    "technology",
}

_website_cache: dict[tuple[str, str, str], str] = {}


class LeadGenerationError(Exception):
    """Raised when lead generation cannot run or yields no usable output."""


def _build_result(
    leads: list,
    source_requested: str,
    source_used: str,
    warning: str | None = None,
    resources_used: list[str] | None = None,
) -> dict:
    return {
        "leads": leads,
        "source_requested": source_requested,
        "source_used": source_used,
        "warning": warning,
        "resources_used": resources_used or [],
    }


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

    if source == "auto":
        return _run_vertical_strategy(
            vertical=vertical,
            query=query,
            location=location,
            industry=industry,
            audience=audience,
            offer=offer,
            goal=goal,
            max_results=max_r,
        )

    if source == "google_maps":
        if not GOOGLE_MAPS_API_KEY:
            raise LeadGenerationError(
                "Google Maps needs a Google Maps API key. Add one in Settings or switch to Web Search or LinkedIn Jobs."
            )
        leads = _email_ready_leads(scrape_google_maps(query, location, max_r), max_r)
        if not leads:
            raise LeadGenerationError(
                "No email-ready Google Maps leads were found for that search. Try Web Search, a broader query, or a nearby location."
            )
        return _build_result(leads, source_requested=source, source_used="google_maps", resources_used=["Google Maps"])

    if source == "linkedin":
        if method == "apollo":
            if not APOLLO_API_KEY:
                raise LeadGenerationError(
                    "Apollo lookup needs an Apollo API key. Add one in Settings or switch to Web Search."
                )
            leads = _email_ready_leads(scrape_apollo(query, industry, location, max_r), max_r)
            if not leads:
                raise LeadGenerationError(
                    "Apollo did not return any email-ready matches. Try a broader title, industry, or location."
                )
            return _build_result(leads, source_requested=source, source_used="apollo", resources_used=["Apollo"])

        if not SENDER_EMAIL or not GMAIL_PASSWORD:
            raise LeadGenerationError(
                "Browser-assisted LinkedIn search needs sender email and Gmail app password. Add them in Settings or use Web Search."
            )
        leads = _email_ready_leads(
            _enrich_leads(scrape_linkedin_selenium(query, industry, location, max_r), query=query, location=location),
            max_r,
        )
        if not leads:
            raise LeadGenerationError(
                "LinkedIn browser search found profiles but not usable email addresses. Use Apollo or Web Search for email-ready leads."
            )
        return _build_result(leads, source_requested=source, source_used="linkedin_selenium", resources_used=["LinkedIn browser search"])

    if source == "job_portal":
        leads = _email_ready_leads(scrape_job_portal(portal, query, location, max_r), max_r)
        source_used = portal
        warning = None

        if not leads and portal != "linkedin_jobs":
            fallback_leads = _email_ready_leads(scrape_job_portal("linkedin_jobs", query, location, max_r), max_r)
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

        return _build_result(
            leads,
            source_requested=source,
            source_used=source_used,
            warning=warning,
            resources_used=[PORTAL_LABELS.get(source_used, source_used)],
        )

    if source == "apollo":
        if not APOLLO_API_KEY:
            raise LeadGenerationError(
                "Apollo source needs an Apollo API key. Add one in Settings or switch to Web Search."
            )
        leads = _email_ready_leads(scrape_apollo(query, industry, location, max_r), max_r)
        if not leads:
            raise LeadGenerationError(
                "Apollo did not return any email-ready matches. Try a broader title, industry, or location."
            )
        return _build_result(leads, source_requested=source, source_used="apollo", resources_used=["Apollo"])

    if source == "web_search":
        leads = _email_ready_leads(scrape_web_search(query, industry, location, max_r), max_r)
        if not leads:
            raise LeadGenerationError(
                "Web Search did not find any usable email-ready leads. Try a narrower niche, service, or location."
            )
        return _build_result(leads, source_requested=source, source_used="web_search", resources_used=["Open Web"])

    raise LeadGenerationError("This lead source is not available right now. Please choose another source.")


def _combine_text(*parts: str) -> str:
    return " ".join(part.strip() for part in parts if part and part.strip()).strip()


def _lead_dedupe_key(lead: dict) -> str:
    email = (lead.get("email") or "").strip().lower()
    if email:
        return f"email:{email}"

    website = (lead.get("website") or "").strip().lower()
    if website:
        return f"web:{_base_domain(website)}"

    company = (lead.get("company") or "").strip().lower()
    title = (lead.get("title") or "").strip().lower()
    return f"company:{company}|title:{title}"


def _merge_lead_batches(batches: list[list[dict]], max_results: int) -> list[dict]:
    merged: list[dict] = []
    seen: set[str] = set()

    for batch in batches:
        for lead in batch:
            dedupe_key = _lead_dedupe_key(lead)
            if not dedupe_key or dedupe_key in seen:
                continue
            seen.add(dedupe_key)
            merged.append(lead)
            if len(merged) >= max_results:
                return merged

    return merged


def _append_note(leads: list[dict], note: str) -> list[dict]:
    for lead in leads:
        existing = (lead.get("notes") or "").strip()
        lead["notes"] = f"{existing} {note}".strip() if existing else note
    return leads


def _run_vertical_strategy(
    vertical: str,
    query: str,
    location: str,
    industry: str,
    audience: str,
    offer: str,
    goal: str,
    max_results: int,
) -> dict:
    if vertical in {"job_seeker", "recruiter"}:
        return _career_intelligence(vertical, query, location, industry, audience, goal, max_results)
    if vertical in {"agency", "business_growth"}:
        return _market_intelligence(vertical, query, location, industry, audience, offer, goal, max_results)
    return _partnership_intelligence(query, location, industry, audience, offer, goal, max_results)


def _career_intelligence(
    vertical: str,
    query: str,
    location: str,
    industry: str,
    audience: str,
    goal: str,
    max_results: int,
) -> dict:
    role_query = _combine_text(query, industry if vertical == "recruiter" else "")
    if not role_query:
        raise LeadGenerationError("Add the target role or hiring focus before generating leads.")

    per_source = max(8, max_results // 3)
    resources: list[str] = []
    batches: list[list[dict]] = []

    for portal in ("linkedin_jobs", "indeed", "naukri"):
        leads = _email_ready_leads(scrape_job_portal(portal, role_query, location, per_source), per_source)
        if leads:
            note = (
                "Hiring-company lead pulled from live recruitment signals."
                if vertical == "job_seeker"
                else "Hiring-company lead matched for recruiter outreach."
            )
            batches.append(_append_note(leads, note))
            resources.append(PORTAL_LABELS.get(portal, portal))

    web_query = (
        _combine_text(role_query, "hiring companies", location, industry)
        if vertical == "job_seeker"
        else _combine_text("companies hiring", role_query, location, industry, audience, goal)
    )
    web_leads = _email_ready_leads(
        scrape_web_search(
            web_query,
            industry or query,
            location,
            max_results=max(per_source, max_results // 2),
            mode="career",
            role_label="Hiring Team",
            company_hint="Hiring Team",
        ),
        max(max_results // 2, per_source),
    )
    if web_leads:
        batches.append(
            _append_note(
                web_leads,
                "Open-web company discovery confirmed this team through public hiring or careers signals.",
            )
        )
        resources.append("Open Web")

    leads = _merge_lead_batches(batches, max_results)
    if not leads:
        raise LeadGenerationError(
            "ReachFlow could not find email-ready hiring leads for that role yet. Broaden the title, try a nearby market, or add an industry hint."
        )

    return _build_result(
        leads,
        source_requested="auto",
        source_used="vertical_intelligence",
        resources_used=resources,
    )


def _market_intelligence(
    vertical: str,
    query: str,
    location: str,
    industry: str,
    audience: str,
    offer: str,
    goal: str,
    max_results: int,
) -> dict:
    market_query = _combine_text(query, audience, offer or goal)
    if not market_query:
        raise LeadGenerationError("Add the service, market, or buyer profile before generating leads.")

    resources: list[str] = []
    batches: list[list[dict]] = []

    web_terms = [
        _combine_text(market_query, industry, location),
        _combine_text(industry or market_query, location, "company"),
        _combine_text(market_query, location, "agency" if vertical == "agency" else "business"),
    ]
    for term in web_terms:
        if not term:
            continue
        leads = _email_ready_leads(
            scrape_web_search(term, industry or query, location, max_results=max(10, max_results // 2)),
            max(max_results // 2, 10),
        )
        if leads:
            note = (
                "Matched to client-acquisition criteria for service-led outreach."
                if vertical == "agency"
                else "Matched to your growth-market criteria for outbound pipeline building."
            )
            batches.append(_append_note(leads, note))
            if "Open Web" not in resources:
                resources.append("Open Web")

    if GOOGLE_MAPS_API_KEY and location:
        maps_query = _combine_text(industry or query, audience or market_query)
        maps_leads = _email_ready_leads(scrape_google_maps(maps_query, location, max(max_results // 2, 10)), max(max_results // 2, 10))
        if maps_leads:
            batches.append(
                _append_note(
                    maps_leads,
                    "Local-market lead discovered from business listings and enriched with public contact routes.",
                )
            )
            resources.append("Google Maps")

    leads = _merge_lead_batches(batches, max_results)
    if not leads:
        raise LeadGenerationError(
            "ReachFlow could not find email-ready commercial leads for that market yet. Refine the offer, niche, or location and try again."
        )

    return _build_result(
        leads,
        source_requested="auto",
        source_used="vertical_intelligence",
        resources_used=resources,
    )


def _partnership_intelligence(
    query: str,
    location: str,
    industry: str,
    audience: str,
    offer: str,
    goal: str,
    max_results: int,
) -> dict:
    partner_thesis = _combine_text(query, audience, offer, goal)
    if not partner_thesis:
        raise LeadGenerationError("Add the partner type, thesis, or target segment before generating leads.")

    resources = ["Open Web"]
    batches: list[list[dict]] = []

    for term in [
        _combine_text(partner_thesis, industry, location),
        _combine_text(partner_thesis, "partners", location),
        _combine_text(partner_thesis, "integrations", location),
        _combine_text(partner_thesis, "alliances", location),
    ]:
        if not term:
            continue
        leads = _email_ready_leads(
            scrape_web_search(
                term,
                industry or query,
                location,
                max_results=max(12, max_results // 2),
                mode="partnership",
                role_label="Partnership Team",
                company_hint="Partnership Team",
            ),
            max(max_results // 2, 12),
        )
        if leads:
            batches.append(
                _append_note(
                    leads,
                    "Strategic-partner lead identified from public company and channel signals.",
                )
            )

    leads = _merge_lead_batches(batches, max_results)
    if not leads:
        raise LeadGenerationError(
            "ReachFlow could not find email-ready partner accounts for that thesis yet. Try a clearer partner type, market, or category."
        )

    return _build_result(
        leads,
        source_requested="auto",
        source_used="vertical_intelligence",
        resources_used=resources,
    )


def _email_ready_leads(leads: list[dict], max_results: int) -> list[dict]:
    ready = [lead for lead in leads if (lead.get("email") or "").strip()]
    return ready[:max_results]


def _enrich_leads(leads: list[dict], query: str, location: str) -> list[dict]:
    if not leads:
        return leads

    with ThreadPoolExecutor(max_workers=min(6, max(len(leads), 1))) as executor:
        return list(executor.map(lambda lead: _enrich_lead(lead, query, location), leads))


def _enrich_lead(lead: dict, query: str, location: str) -> dict:
    company = (lead.get("company") or "").strip()
    if not company:
        return lead

    source = lead.get("source", "manual")
    mode = _contact_mode(source, lead)
    website = lead.get("website") or discover_official_website(company, query=query, location=location)
    if website:
        lead["website"] = website

    if not lead.get("email") and website:
        public_email = find_public_email(website, mode=mode)
        if public_email:
            lead["email"] = public_email
        else:
            guessed_email = guess_role_email(website, mode=mode)
            if guessed_email:
                lead["email"] = guessed_email
                lead["notes"] = "Suggested team inbox based on the official company domain. Verify before high-volume sending."

    if not lead.get("name") and lead.get("email"):
        lead["name"] = contact_name_from_email(lead["email"], mode=mode)

    if not lead.get("title"):
        if mode == "career":
            lead["title"] = "Hiring Team"
        elif mode == "partnership":
            lead["title"] = "Partnership Team"
        else:
            lead["title"] = "Business Development"

    return lead


def _contact_mode(source: str, lead: dict | None = None) -> str:
    explicit = ((lead or {}).get("contact_mode") or "").strip().lower()
    if explicit in {"career", "business", "partnership"}:
        return explicit
    return "career" if source in {"linkedin_jobs", "naukri", "indeed"} else "business"


def _extract_result_url(href: str) -> str:
    if not href:
        return ""

    href = href.strip()
    parsed = urlparse(href)
    if "duckduckgo.com" in parsed.netloc:
        params = parse_qs(parsed.query)
        for key in ("uddg", "u", "u3"):
            if params.get(key):
                return unquote(params[key][0])
    if "search.yahoo.com" in parsed.netloc or "r.search.yahoo.com" in parsed.netloc:
        match = re.search(r"/RU=([^/]+)", href)
        if match:
            return unquote(match.group(1))
    return href


def _normalize_website(url: str) -> str:
    if not url:
        return ""
    normalized = _extract_result_url(url)
    if normalized.startswith("//"):
        normalized = f"https:{normalized}"
    if not normalized.startswith("http"):
        normalized = f"https://{normalized.lstrip('/')}"
    return normalized


def _root_website(url: str) -> str:
    normalized = _normalize_website(url)
    if not normalized:
        return ""

    parsed = urlparse(normalized)
    if not parsed.netloc:
        return normalized.rstrip("/")

    scheme = parsed.scheme or "https"
    return f"{scheme}://{parsed.netloc}".rstrip("/")


def _base_domain(url: str) -> str:
    if not url:
        return ""

    host = urlparse(_normalize_website(url)).netloc.lower()
    host = host.split(":")[0]
    if host.startswith("www."):
        host = host[4:]
    if not host:
        return ""

    parts = host.split(".")
    if len(parts) <= 2:
        return host

    suffix = ".".join(parts[-2:])
    if suffix in MULTIPART_TLDS and len(parts) >= 3:
        return ".".join(parts[-3:])
    if ".".join(parts[-3:]) in MULTIPART_TLDS and len(parts) >= 4:
        return ".".join(parts[-4:])
    return ".".join(parts[-2:])


def _blocked_host(url: str) -> bool:
    domain = _base_domain(url)
    return any(domain == blocked or domain.endswith(f".{blocked}") for blocked in SEARCH_BLOCKLIST)


def _company_tokens(company: str) -> list[str]:
    normalized = re.sub(r"[^a-z0-9]+", " ", (company or "").lower()).strip()
    if not normalized:
        return []
    return [token for token in normalized.split() if token and token not in COMPANY_STOPWORDS]


def _website_score(company: str, url: str, label: str = "") -> int:
    if not url or _blocked_host(url):
        return -100

    score = 0
    root = _root_website(url)
    domain_text = re.sub(r"[^a-z0-9]+", " ", _base_domain(root))
    label_text = re.sub(r"[^a-z0-9]+", " ", (label or "").lower())
    path = urlparse(_normalize_website(url)).path.strip("/").lower()
    tokens = _company_tokens(company)

    if not tokens:
        fallback = re.sub(r"[^a-z0-9]+", "", (company or "").lower())
        tokens = [fallback] if fallback else []

    for token in tokens:
        if token in domain_text:
            score += 10
        if token in label_text:
            score += 6

    if (company or "").lower() in (label or "").lower():
        score += 10

    if not path:
        score += 6
    elif path.count("/") == 0:
        score += 3
    else:
        score += 1

    if any(hint in path for hint in ("contact", "about", "careers", "jobs")):
        score += 1

    return score


def _search_public_web(query: str, limit: int = 12) -> list[dict]:
    if not query:
        return []

    engines = [
        (
            BRAVE_SEARCH_URL,
            {"q": query, "source": "web"},
            "div[data-type='web'] a[href^='http']",
        ),
        (
            "https://search.yahoo.com/search",
            {"p": query},
            "div#web ol li a[href^='http']",
        ),
    ]

    for url, params, selector in engines:
        try:
            response = requests.get(url, params=params, headers=HEADERS, timeout=10)
            if response.status_code >= 400:
                continue
            soup = BeautifulSoup(response.text, "html.parser")
        except Exception:
            continue

        results = []
        seen_urls: set[str] = set()
        for anchor in soup.select(selector):
            href = _normalize_website(anchor.get("href", ""))
            if not href or href in seen_urls or _blocked_host(href):
                continue

            title = " ".join(anchor.stripped_strings).strip()
            if not title or title.lower() in {"videos", "view all"}:
                continue

            seen_urls.add(href)
            results.append({"url": href, "title": title})
            if len(results) >= limit:
                break

        if results:
            return results

    return []


def _clearbit_website(company: str) -> str:
    if not company:
        return ""

    try:
        response = requests.get(
            CLEARBIT_AUTOCOMPLETE_URL,
            params={"query": company},
            headers=HEADERS,
            timeout=8,
        )
        suggestions = response.json()
    except Exception:
        return ""

    best_url = ""
    best_score = -100
    for item in suggestions[:8]:
        domain = (item or {}).get("domain", "")
        if not domain:
            continue
        website = _root_website(domain)
        score = _website_score(company, website, f"{item.get('name', '')} {domain}") + 8
        if score > best_score:
            best_score = score
            best_url = website

    return best_url


def discover_official_website(company: str, query: str = "", location: str = "") -> str:
    cache_key = ((company or "").strip().lower(), (query or "").strip().lower(), (location or "").strip().lower())
    if cache_key in _website_cache:
        return _website_cache[cache_key]

    website = _clearbit_website(company)
    if not website:
        best_url = ""
        best_score = -100
        search_terms = [
            " ".join(part for part in [company, location, "official website"] if part),
            " ".join(part for part in [company, query, location] if part),
            " ".join(part for part in [company, "contact"] if part),
            " ".join(part for part in [company, "careers"] if part),
        ]

        for term in search_terms:
            if not term:
                continue
            for result in _search_public_web(term, limit=12):
                candidate = _root_website(result["url"])
                score = _website_score(company, candidate, result.get("title", ""))
                if score > best_score:
                    best_score = score
                    best_url = candidate
            if best_score >= 18:
                break

        website = best_url

    _website_cache[cache_key] = website
    return website


def find_public_email(website: str, mode: str = "business") -> str:
    if not website:
        return ""

    base = _normalize_website(website).rstrip("/")
    domain = _base_domain(base)
    pages = [
        base,
        f"{base}/contact",
        f"{base}/contact-us",
        f"{base}/contactus",
        f"{base}/contact-us.html",
        f"{base}/about",
        f"{base}/about-us",
        f"{base}/careers",
        f"{base}/careers.html",
        f"{base}/jobs",
        f"{base}/jobs.html",
        f"{base}/team",
    ]

    emails: set[str] = set()
    for page in pages:
        try:
            response = requests.get(page, headers=HEADERS, timeout=6)
            for email in EMAIL_RE.findall(response.text):
                email = email.lower()
                email_domain = email.split("@", 1)[1]
                if any(skip in email_domain for skip in SKIP_DOMAINS):
                    continue
                if domain and not email_domain.endswith(domain):
                    continue
                emails.add(email)
        except Exception:
            continue

    if not emails:
        return ""

    ranked = sorted(emails, key=lambda email: _email_rank(email, domain, mode), reverse=True)
    return ranked[0]


def _email_rank(email: str, domain: str, mode: str) -> int:
    local, _, email_domain = email.partition("@")
    aliases = CAREER_ALIASES if mode == "career" else PARTNERSHIP_ALIASES if mode == "partnership" else BUSINESS_ALIASES
    score = 0

    if domain and email_domain.endswith(domain):
        score += 50

    for index, alias in enumerate(aliases):
        if alias in local:
            score += 30 - index

    if any(hint in local for hint in EMAIL_NEGATIVE_HINTS):
        score -= 25

    if "." in local:
        score -= 5

    return score


def guess_role_email(website: str, mode: str = "business") -> str:
    domain = _base_domain(website)
    if not domain:
        return ""

    aliases = CAREER_ALIASES if mode == "career" else PARTNERSHIP_ALIASES if mode == "partnership" else BUSINESS_ALIASES
    return f"{aliases[0]}@{domain}"


def contact_name_from_email(email: str, mode: str = "business") -> str:
    local = (email or "").split("@", 1)[0].lower()
    if any(alias in local for alias in CAREER_ALIASES):
        return "Hiring Team"
    if any(alias in local for alias in PARTNERSHIP_ALIASES):
        return "Partnership Team"
    if any(alias in local for alias in BUSINESS_ALIASES):
        return "Growth Team"

    tokens = [token for token in re.split(r"[._\-]", local) if token]
    if tokens and all(token.isalpha() for token in tokens[:2]):
        return " ".join(token.capitalize() for token in tokens[:2])

    if mode == "career":
        return "Hiring Team"
    if mode == "partnership":
        return "Partnership Team"
    return "Growth Team"


def scrape_google_maps(query: str, location: str, max_results: int = 50) -> list:
    api_key = GOOGLE_MAPS_API_KEY
    if not api_key:
        print("[LeadGen] Google Maps API key not set - skipping")
        return []

    base_url = "https://maps.googleapis.com/maps/api/place/textsearch/json"
    leads = []
    params = {"query": f"{query} in {location}", "key": api_key}

    while len(leads) < max_results:
        try:
            resp = requests.get(base_url, params=params, timeout=10)
            data = resp.json()
        except Exception as exc:
            print(f"[Google Maps] Request error: {exc}")
            break

        if data.get("status") not in ("OK", "ZERO_RESULTS"):
            print(f"[Google Maps] API error: {data.get('status')}")
            break

        for place in data.get("results", []):
            if len(leads) >= max_results:
                break
            try:
                detail_resp = requests.get(
                    "https://maps.googleapis.com/maps/api/place/details/json",
                    params={
                        "place_id": place["place_id"],
                        "fields": "name,formatted_address,formatted_phone_number,website,types",
                        "key": api_key,
                    },
                    timeout=10,
                )
                detail = detail_resp.json().get("result", {})
                company = detail.get("name", place.get("name", ""))
                website = detail.get("website", "")
                phone = detail.get("formatted_phone_number", "")
                address = detail.get("formatted_address", "")
                types = detail.get("types", [])
                industry = types[0].replace("_", " ").title() if types else query
                email = find_public_email(website, mode="business") if website else ""

                leads.append(
                    {
                        "name": contact_name_from_email(email, mode="business") if email else "",
                        "email": email,
                        "company": company,
                        "title": "Business Development",
                        "phone": phone,
                        "website": website,
                        "location": address,
                        "industry": industry,
                        "source": "google_maps",
                    }
                )
                time.sleep(0.3)
            except Exception as exc:
                print(f"[Google Maps] Place detail error: {exc}")
                continue

        next_token = data.get("next_page_token")
        if not next_token or len(leads) >= max_results:
            break
        time.sleep(2)
        params = {"pagetoken": next_token, "key": api_key}

    return _enrich_leads(leads, query=query, location=location)


def scrape_apollo(query: str, industry: str = "", location: str = "", max_results: int = 50) -> list:
    api_key = APOLLO_API_KEY
    if not api_key:
        print("[LeadGen] Apollo API key not set - skipping")
        return []

    headers = {
        "Content-Type": "application/json",
        "X-Api-Key": api_key,
    }
    titles = [title.strip() for title in query.split(",")]
    leads = []
    page = 1

    while len(leads) < max_results:
        payload = {
            "person_titles": titles,
            "person_locations": [location] if location else [],
            "page": page,
            "per_page": min(max_results - len(leads), 25),
        }
        if industry:
            payload["q_organization_keyword_tags"] = [industry]

        try:
            resp = requests.post(
                "https://api.apollo.io/v1/mixed_people/search",
                json=payload,
                headers=headers,
                timeout=15,
            )
            if resp.status_code != 200:
                print(f"[Apollo] API error {resp.status_code}")
                break
            data = resp.json()
            people = data.get("people", [])
            if not people:
                break

            for person in people:
                if len(leads) >= max_results:
                    break
                org = person.get("organization") or {}
                name = f"{person.get('first_name', '')} {person.get('last_name', '')}".strip()
                email = (person.get("email") or "").lower()
                company = org.get("name", "")
                leads.append(
                    {
                        "name": name,
                        "email": email,
                        "company": company,
                        "title": person.get("title", "") or "Business Development",
                        "phone": "",
                        "website": org.get("website_url", ""),
                        "linkedin_url": person.get("linkedin_url", ""),
                        "location": f"{person.get('city', '')} {person.get('country', '')}".strip(),
                        "industry": org.get("industry", industry),
                        "company_size": str(org.get("estimated_num_employees", "")),
                        "source": "apollo",
                    }
                )
            if len(people) < payload["per_page"]:
                break
            page += 1
            time.sleep(1)
        except Exception as exc:
            print(f"[Apollo] Error: {exc}")
            break

    return _enrich_leads(leads, query=query, location=location)


def scrape_job_portal(portal: str, query: str, location: str = "", max_results: int = 50) -> list:
    if portal == "naukri":
        leads = _scrape_naukri(query, location, max_results)
    elif portal == "indeed":
        leads = _scrape_indeed(query, location, max_results)
    elif portal == "linkedin_jobs":
        leads = _scrape_linkedin_jobs(query, location, max_results)
    else:
        return []

    return _enrich_leads(leads, query=query, location=location)


def _scrape_naukri(query: str, location: str, max_results: int) -> list:
    leads = []
    page = 1
    while len(leads) < max_results:
        q = "-".join(query.lower().split())
        loc = "-".join(location.lower().split()) if location else ""
        url = f"https://www.naukri.com/{q}-jobs" + (f"-in-{loc}" if loc else "") + f"-{page}"
        try:
            resp = requests.get(url, headers=HEADERS, timeout=10)
            soup = BeautifulSoup(resp.text, "html.parser")
            cards = soup.select("article.jobTuple, div.srp-jobtuple-wrapper")
            if not cards:
                break
            for card in cards:
                if len(leads) >= max_results:
                    break
                try:
                    company = (card.select_one("a.subTitle, .comp-name") or {}).get_text(strip=True)
                    title = (card.select_one("a.title, .row1 a") or {}).get_text(strip=True) or query
                    loc_el = card.select_one("li.fleft.br2.placeHolderLi, .locWdth")
                    loc_txt = loc_el.get_text(strip=True) if loc_el else location
                    if company:
                        leads.append(
                            {
                                "name": "",
                                "email": "",
                                "company": company,
                                "title": title,
                                "phone": "",
                                "website": "",
                                "location": loc_txt,
                                "industry": query,
                                "source": "naukri",
                            }
                        )
                except Exception:
                    continue
            page += 1
            time.sleep(2)
        except Exception as exc:
            print(f"[Naukri] Error: {exc}")
            break
    return leads


def _scrape_indeed(query: str, location: str, max_results: int) -> list:
    leads = []
    start = 0
    while len(leads) < max_results:
        url = (
            f"https://www.indeed.com/jobs?q={requests.utils.quote(query)}"
            f"&l={requests.utils.quote(location)}&start={start}"
        )
        try:
            resp = requests.get(url, headers=HEADERS, timeout=10)
            soup = BeautifulSoup(resp.text, "html.parser")
            cards = soup.select("div.job_seen_beacon, div.tapItem")
            if not cards:
                break
            for card in cards:
                if len(leads) >= max_results:
                    break
                try:
                    company = (card.select_one("span.companyName, [data-testid='company-name']") or {}).get_text(strip=True)
                    loc_el = card.select_one("div.companyLocation, [data-testid='text-location']")
                    loc_txt = loc_el.get_text(strip=True) if loc_el else location
                    if company:
                        leads.append(
                            {
                                "name": "",
                                "email": "",
                                "company": company,
                                "title": query,
                                "phone": "",
                                "website": "",
                                "location": loc_txt,
                                "industry": query,
                                "source": "indeed",
                            }
                        )
                except Exception:
                    continue
            start += 10
            time.sleep(2)
        except Exception as exc:
            print(f"[Indeed] Error: {exc}")
            break
    return leads


def _scrape_linkedin_jobs(query: str, location: str, max_results: int) -> list:
    leads = []
    start = 0
    while len(leads) < max_results:
        url = (
            "https://www.linkedin.com/jobs-guest/jobs/api/seeMoreJobPostings/search"
            f"?keywords={requests.utils.quote(query)}&location={requests.utils.quote(location)}&start={start}"
        )
        try:
            resp = requests.get(url, headers=HEADERS, timeout=10)
            soup = BeautifulSoup(resp.text, "html.parser")
            cards = soup.select("li")
            if not cards:
                break
            for card in cards:
                if len(leads) >= max_results:
                    break
                try:
                    company = (card.select_one("h4.base-search-card__subtitle") or {}).get_text(strip=True)
                    title_el = card.select_one("h3.base-search-card__title")
                    title = title_el.get_text(strip=True) if title_el else query
                    loc_el = card.select_one("span.job-search-card__location")
                    loc_txt = loc_el.get_text(strip=True) if loc_el else location
                    if company:
                        leads.append(
                            {
                                "name": "",
                                "email": "",
                                "company": company,
                                "title": title,
                                "phone": "",
                                "website": "",
                                "location": loc_txt,
                                "industry": query,
                                "source": "linkedin_jobs",
                            }
                        )
                except Exception:
                    continue
            start += 25
            time.sleep(2)
        except Exception as exc:
            print(f"[LinkedIn Jobs] Error: {exc}")
            break
    return leads


def scrape_web_search(
    query: str,
    industry: str = "",
    location: str = "",
    max_results: int = 50,
    mode: str = "business",
    role_label: str = "Business Development",
    company_hint: str = "",
) -> list:
    leads = []
    seen_domains: set[str] = set()
    search_terms = [
        " ".join(part for part in [query, industry, location] if part).strip(),
        " ".join(part for part in [industry or query, location, "company"] if part).strip(),
        " ".join(part for part in [query, location, "services"] if part).strip(),
        " ".join(part for part in [query, location, "agency"] if part).strip(),
    ]

    for term in search_terms:
        if not term or len(leads) >= max_results:
            continue
        try:
            for result in _search_public_web(term, limit=max_results * 2):
                if len(leads) >= max_results:
                    break

                website = _root_website(result["url"])
                if not website or _blocked_host(website):
                    continue

                domain = _base_domain(website)
                if not domain or domain in seen_domains:
                    continue
                seen_domains.add(domain)

                title = unescape(result.get("title", ""))
                company = _preferred_company_name(title, domain)
                leads.append(
                    {
                        "name": "",
                        "email": "",
                        "company": company,
                        "title": role_label,
                        "phone": "",
                        "website": website,
                        "location": location,
                        "industry": industry or query,
                        "contact_mode": mode,
                        "name_hint": company_hint,
                        "source": "web_search",
                    }
                )
        except Exception as exc:
            print(f"[Web Search] Error: {exc}")
            continue

    return _enrich_leads(leads, query=query, location=location)


def _company_name_from_result(title: str, domain: str) -> str:
    if title:
        company = re.split(r"\s[\-|–—|:]\s", title, maxsplit=1)[0].strip()
        if company:
            return company
    seed = domain.split(".", 1)[0].replace("-", " ").replace("_", " ").strip()
    return seed.title()


def _display_company_name(title: str, domain: str) -> str:
    cleaned = re.sub(r"\s+", " ", (title or "").replace("\u203a", " ").replace("›", " ")).strip()
    if cleaned:
        domain_text = _base_domain(domain).replace(".", " ").strip()
        for separator in (" | ", " - ", " : ", " — ", " – "):
            if separator in cleaned:
                cleaned = cleaned.split(separator, 1)[0].strip()
                break
        if domain_text:
            cleaned = re.sub(re.escape(domain_text), " ", cleaned, flags=re.I)
        cleaned = re.sub(r"\s+", " ", cleaned).strip()
        if cleaned:
            return " ".join(cleaned.split()[:4]).strip()

    return _company_name_from_result(title, domain)


def _preferred_company_name(title: str, domain: str) -> str:
    dotted_domain = _base_domain(domain).strip()
    seed = dotted_domain.split(".", 1)[0].replace("-", " ").replace("_", " ").strip().title()
    if dotted_domain:
        cleaned = re.sub(r"\s+", " ", (title or "")).strip()
        if cleaned.lower().startswith(dotted_domain.lower()):
            return seed or cleaned
        match = re.match(rf"^(.*?)\s+{re.escape(dotted_domain)}\b", cleaned, flags=re.I)
        if match and match.group(1).strip():
            return match.group(1).strip()

    company = _display_company_name(title, domain)
    if dotted_domain and dotted_domain.lower() in company.lower():
        return seed or company
    if company and company == company.lower():
        return company.title()
    return company


def scrape_linkedin_selenium(query: str, industry: str = "", location: str = "", max_results: int = 30) -> list:
    """Browser-based LinkedIn scraping. Requires Chrome + selenium installed."""
    try:
        from selenium import webdriver
        from selenium.webdriver.chrome.options import Options
        from selenium.webdriver.chrome.service import Service
        from selenium.webdriver.common.by import By
        from selenium.webdriver.support import expected_conditions as EC
        from selenium.webdriver.support.ui import WebDriverWait
        from webdriver_manager.chrome import ChromeDriverManager
    except ImportError:
        print("[LinkedIn] selenium not installed - pip install selenium webdriver-manager")
        return []

    li_email = SENDER_EMAIL
    li_pass = GMAIL_PASSWORD
    if not li_email or not li_pass:
        print("[LinkedIn] SENDER_EMAIL / GMAIL_PASSWORD not set in .env")
        return []

    options = Options()
    options.add_argument("--headless")
    options.add_argument("--no-sandbox")
    options.add_argument("--disable-dev-shm-usage")
    options.add_argument("--disable-notifications")

    driver = webdriver.Chrome(service=Service(ChromeDriverManager().install()), options=options)
    wait = WebDriverWait(driver, 15)
    leads = []

    try:
        driver.get("https://www.linkedin.com/login")
        wait.until(EC.presence_of_element_located((By.ID, "username")))
        driver.find_element(By.ID, "username").send_keys(li_email)
        driver.find_element(By.ID, "password").send_keys(li_pass)
        driver.find_element(By.XPATH, "//button[@type='submit']").click()
        time.sleep(3)

        if "challenge" in driver.current_url or "checkpoint" in driver.current_url:
            print("[LinkedIn] Verification required - cannot complete in headless mode")
            return []

        search_url = (
            "https://www.linkedin.com/search/results/people/"
            f"?keywords={requests.utils.quote(query)}"
            + (f"&geoUrn=%5B%22{requests.utils.quote(location)}%22%5D" if location else "")
        )
        driver.get(search_url)
        time.sleep(3)

        while len(leads) < max_results:
            results = driver.find_elements(By.CSS_SELECTOR, ".entity-result__item")
            if not results:
                break
            for result in results:
                if len(leads) >= max_results:
                    break
                try:
                    name_el = result.find_element(By.CSS_SELECTOR, ".entity-result__title-text a span[aria-hidden='true']")
                    name = name_el.text.strip()
                    profile = result.find_element(By.CSS_SELECTOR, ".entity-result__title-text a").get_attribute("href").split("?")[0]
                    title_el = result.find_element(By.CSS_SELECTOR, ".entity-result__primary-subtitle")
                    title = title_el.text.strip() if title_el else ""
                    comp_el = result.find_element(By.CSS_SELECTOR, ".entity-result__secondary-subtitle")
                    company = comp_el.text.strip().split("·")[0].strip() if comp_el else ""
                    leads.append(
                        {
                            "name": name,
                            "email": "",
                            "company": company,
                            "title": title,
                            "phone": "",
                            "website": "",
                            "linkedin_url": profile,
                            "location": location,
                            "industry": industry,
                            "source": "linkedin_selenium",
                        }
                    )
                except Exception:
                    continue
            try:
                next_btn = driver.find_element(By.CSS_SELECTOR, "button[aria-label='Next']")
                if not next_btn.is_enabled():
                    break
                next_btn.click()
                time.sleep(3)
            except Exception:
                break
    finally:
        driver.quit()

    return leads
