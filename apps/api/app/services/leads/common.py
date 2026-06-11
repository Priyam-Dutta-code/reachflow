"""Shared lead-gen machinery — PORTED from V1 `services/lead_gen_service.py`.

Website discovery/scoring, public-email finding/ranking, enrichment, and
dedupe. Behavior preserved; prints became structured logs and config reads
moved to settings.
"""
import logging
import re
from concurrent.futures import ThreadPoolExecutor
from urllib.parse import parse_qs, unquote, urlparse

import requests
from bs4 import BeautifulSoup

logger = logging.getLogger("reachflow.leads")

HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/120.0.0.0 Safari/537.36"
    )
}

CLEARBIT_AUTOCOMPLETE_URL = "https://autocomplete.clearbit.com/v1/companies/suggest"
EMAIL_RE = re.compile(r"[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}")
SKIP_DOMAINS = {
    "example.com", "domain.com", "yourdomain.com", "sentry.io",
    "wix.com", "wordpress.com", "png", "jpg", "gif", "svg",
}
SEARCH_BLOCKLIST = {
    "apollo.io", "bark.com", "clutch.co", "crunchbase.com", "duckduckgo.com",
    "designrush.com", "facebook.com", "foundit.in", "g2.com", "glassdoor.com",
    "google.com", "goodfirms.co", "indiamart.com", "instagram.com", "indeed.com",
    "justdial.com", "jobrapido.com", "linkedin.com", "naukri.com", "reddit.com",
    "registerkaro.in", "search.brave.com", "sortlist.com", "trustpilot.com",
    "twitter.com", "wikipedia.org", "x.com", "yahoo.com", "yellowpages.com",
    "yelp.com", "youtube.com", "zhihu.com", "techbehemoths.com",
}
CAREER_ALIASES = ["careers", "jobs", "hiring", "talent", "recruiting", "hr", "people"]
BUSINESS_ALIASES = ["hello", "sales", "info", "partnerships", "growth", "contact"]
PARTNERSHIP_ALIASES = ["partnerships", "alliances", "channel", "bd"]
EMAIL_NEGATIVE_HINTS = {"abuse", "billing", "care", "legal", "noreply", "no-reply", "privacy", "security", "support"}
MULTIPART_TLDS = {"co.in", "co.uk", "com.au", "com.br", "com.mx", "co.jp", "org.uk"}
COMPANY_STOPWORDS = {
    "and", "co", "company", "corp", "corporation", "group", "holdings", "inc",
    "india", "limited", "llc", "llp", "ltd", "private", "pvt", "services",
    "solutions", "technologies", "technology",
}

_website_cache: dict[tuple[str, str, str], str] = {}


class LeadGenerationError(Exception):
    """Raised when lead generation cannot run or yields no usable output."""


def build_result(
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


def combine_text(*parts: str) -> str:
    return " ".join(part.strip() for part in parts if part and part.strip()).strip()


def _lead_dedupe_key(lead: dict) -> str:
    email = (lead.get("email") or "").strip().lower()
    if email:
        return f"email:{email}"

    website = (lead.get("website") or "").strip().lower()
    if website:
        return f"web:{base_domain(website)}"

    company = (lead.get("company") or "").strip().lower()
    title = (lead.get("title") or "").strip().lower()
    return f"company:{company}|title:{title}"


def merge_lead_batches(batches: list[list[dict]], max_results: int) -> list[dict]:
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


def append_note(leads: list[dict], note: str) -> list[dict]:
    for lead in leads:
        existing = (lead.get("notes") or "").strip()
        lead["notes"] = f"{existing} {note}".strip() if existing else note
    return leads


def email_ready_leads(leads: list[dict], max_results: int) -> list[dict]:
    ready = [lead for lead in leads if (lead.get("email") or "").strip()]
    return ready[:max_results]


def enrich_leads(leads: list[dict], query: str, location: str) -> list[dict]:
    if not leads:
        return leads

    with ThreadPoolExecutor(max_workers=min(6, max(len(leads), 1))) as executor:
        return list(executor.map(lambda lead: _enrich_lead(lead, query, location), leads))


def _enrich_lead(lead: dict, query: str, location: str) -> dict:
    company = (lead.get("company") or "").strip()
    if not company:
        return lead

    source = lead.get("source", "manual")
    mode = contact_mode(source, lead)
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
                lead["notes"] = (
                    "Suggested team inbox based on the official company domain. "
                    "Verify before high-volume sending."
                )

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


def contact_mode(source: str, lead: dict | None = None) -> str:
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


def normalize_website(url: str) -> str:
    if not url:
        return ""
    normalized = _extract_result_url(url)
    if normalized.startswith("//"):
        normalized = f"https:{normalized}"
    if not normalized.startswith("http"):
        normalized = f"https://{normalized.lstrip('/')}"
    return normalized


def root_website(url: str) -> str:
    normalized = normalize_website(url)
    if not normalized:
        return ""

    parsed = urlparse(normalized)
    if not parsed.netloc:
        return normalized.rstrip("/")

    scheme = parsed.scheme or "https"
    return f"{scheme}://{parsed.netloc}".rstrip("/")


def base_domain(url: str) -> str:
    if not url:
        return ""

    host = urlparse(normalize_website(url)).netloc.lower()
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


def blocked_host(url: str) -> bool:
    domain = base_domain(url)
    if re.fullmatch(r"\d{1,3}(?:\.\d{1,3}){3}", domain):
        return True
    return any(domain == blocked or domain.endswith(f".{blocked}") for blocked in SEARCH_BLOCKLIST)


def mostly_ascii(text: str) -> bool:
    if not text:
        return False
    ascii_chars = sum(1 for char in text if ord(char) < 128)
    return ascii_chars / max(len(text), 1) >= 0.7


def _company_tokens(company: str) -> list[str]:
    normalized = re.sub(r"[^a-z0-9]+", " ", (company or "").lower()).strip()
    if not normalized:
        return []
    return [token for token in normalized.split() if token and token not in COMPANY_STOPWORDS]


def website_score(company: str, url: str, label: str = "") -> int:
    if not url or blocked_host(url):
        return -100

    score = 0
    root = root_website(url)
    domain_text = re.sub(r"[^a-z0-9]+", " ", base_domain(root))
    label_text = re.sub(r"[^a-z0-9]+", " ", (label or "").lower())
    path = urlparse(normalize_website(url)).path.strip("/").lower()
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


def search_public_web(query: str, limit: int = 12) -> list[dict]:
    if not query:
        return []

    try:
        response = requests.get(
            "https://www.bing.com/search",
            params={"q": query, "format": "rss"},
            headers=HEADERS,
            timeout=6,
        )
        if response.status_code < 400:
            soup = BeautifulSoup(response.text, "xml")
            results = []
            seen_urls: set[str] = set()
            for item in soup.select("item"):
                href = normalize_website(item.link.get_text(strip=True))
                if not href or href in seen_urls or blocked_host(href):
                    continue
                title = item.title.get_text(" ", strip=True)
                if not title or not mostly_ascii(title):
                    continue
                seen_urls.add(href)
                results.append({"url": href, "title": title})
                if len(results) >= limit:
                    break
            if results:
                return results
    except Exception as exc:
        logger.info("web search failed: %s", type(exc).__name__, extra={"event": "source_error"})
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
        website = root_website(domain)
        score = website_score(company, website, f"{item.get('name', '')} {domain}") + 8
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
            for result in search_public_web(term, limit=12):
                candidate = root_website(result["url"])
                score = website_score(company, candidate, result.get("title", ""))
                if score > best_score:
                    best_score = score
                    best_url = candidate
            if best_score >= 18:
                break

        website = best_url

    if len(_website_cache) > 5000:  # bounded (long-lived worker process)
        _website_cache.clear()
    _website_cache[cache_key] = website
    return website


def find_public_email(website: str, mode: str = "business") -> str:
    if not website:
        return ""

    base = normalize_website(website).rstrip("/")
    domain = base_domain(base)
    pages = [
        base,
        f"{base}/contact",
        f"{base}/contact-us",
        f"{base}/about",
        f"{base}/careers",
        f"{base}/jobs",
    ]

    emails: set[str] = set()
    for page in pages:
        try:
            response = requests.get(page, headers=HEADERS, timeout=3)
            for email in EMAIL_RE.findall(response.text):
                email = email.lower()
                email_domain = email.split("@", 1)[1]
                if any(skip in email_domain for skip in SKIP_DOMAINS):
                    continue
                if domain and not email_domain.endswith(domain):
                    continue
                emails.add(email)
            if emails:
                break
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

    if mode == "business" and any(alias in local for alias in CAREER_ALIASES):
        score -= 18
    if mode == "career" and any(alias in local for alias in BUSINESS_ALIASES):
        score -= 12

    if any(hint in local for hint in EMAIL_NEGATIVE_HINTS):
        score -= 25

    if "." in local:
        score -= 5

    return score


def guess_role_email(website: str, mode: str = "business") -> str:
    domain = base_domain(website)
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
