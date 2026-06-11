"""Google Maps (Places API) source — PORTED from V1."""
import logging
import time

import requests

from app.core.settings import get_settings
from app.services.leads.common import contact_name_from_email, enrich_leads, find_public_email

logger = logging.getLogger("reachflow.leads.maps")


def scrape_google_maps(query: str, location: str, max_results: int = 50) -> list:
    api_key = get_settings().google_maps_api_key
    if not api_key:
        logger.info("google maps key not set — skipping", extra={"event": "source_skipped"})
        return []

    base_url = "https://maps.googleapis.com/maps/api/place/textsearch/json"
    leads = []
    params = {"query": f"{query} in {location}", "key": api_key}

    while len(leads) < max_results:
        try:
            resp = requests.get(base_url, params=params, timeout=10)
            data = resp.json()
        except Exception as exc:
            logger.warning("maps request failed: %s", type(exc).__name__, extra={"event": "source_error"})
            break

        if data.get("status") not in ("OK", "ZERO_RESULTS"):
            logger.warning("maps api status: %s", data.get("status"), extra={"event": "source_error"})
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
                logger.info("maps place detail failed: %s", type(exc).__name__)
                continue

        next_token = data.get("next_page_token")
        if not next_token or len(leads) >= max_results:
            break
        time.sleep(2)
        params = {"pagetoken": next_token, "key": api_key}

    return enrich_leads(leads, query=query, location=location)
