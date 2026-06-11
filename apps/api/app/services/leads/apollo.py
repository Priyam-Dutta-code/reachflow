"""Apollo.io people-search source — PORTED from V1."""
import logging
import time

import requests

from app.core.settings import get_settings
from app.services.leads.common import enrich_leads

logger = logging.getLogger("reachflow.leads.apollo")


def scrape_apollo(query: str, industry: str = "", location: str = "", max_results: int = 50) -> list:
    api_key = get_settings().apollo_api_key
    if not api_key:
        logger.info("apollo key not set — skipping", extra={"event": "source_skipped"})
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
                logger.warning("apollo api error %s", resp.status_code, extra={"event": "source_error"})
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
            logger.warning("apollo failed: %s", type(exc).__name__, extra={"event": "source_error"})
            break

    return enrich_leads(leads, query=query, location=location)
