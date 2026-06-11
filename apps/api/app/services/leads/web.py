"""Open-web company discovery — PORTED from V1."""
import logging
import re
from html import unescape

from app.services.leads.common import (
    base_domain,
    blocked_host,
    enrich_leads,
    root_website,
    search_public_web,
)

logger = logging.getLogger("reachflow.leads.web")


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
            for result in search_public_web(term, limit=max_results * 2):
                if len(leads) >= max_results:
                    break

                website = root_website(result["url"])
                if not website or blocked_host(website):
                    continue

                domain = base_domain(website)
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
            logger.warning("web search term failed: %s", type(exc).__name__, extra={"event": "source_error"})
            continue

    return enrich_leads(leads, query=query, location=location)


def _company_name_from_result(title: str, domain: str) -> str:
    if title:
        company = re.split(r"\s[\-|–—|:]\s", title, maxsplit=1)[0].strip()
        if company:
            return company
    seed = domain.split(".", 1)[0].replace("-", " ").replace("_", " ").strip()
    return seed.title()


def _display_company_name(title: str, domain: str) -> str:
    cleaned = re.sub(r"\s+", " ", (title or "").replace("›", " ").replace("›", " ")).strip()
    if cleaned:
        domain_text = base_domain(domain).replace(".", " ").strip()
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
    dotted_domain = base_domain(domain).strip()
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
