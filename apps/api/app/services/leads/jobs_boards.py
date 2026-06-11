"""Job-portal scrapers (Naukri / Indeed / LinkedIn Jobs) — PORTED from V1."""
import logging
import time

import requests
from bs4 import BeautifulSoup

from app.services.leads.common import HEADERS, enrich_leads

logger = logging.getLogger("reachflow.leads.jobs")

PORTAL_LABELS = {
    "naukri": "Naukri",
    "indeed": "Indeed",
    "linkedin_jobs": "LinkedIn Jobs",
}


def scrape_job_portal(portal: str, query: str, location: str = "", max_results: int = 50) -> list:
    if portal == "naukri":
        leads = _scrape_naukri(query, location, max_results)
    elif portal == "indeed":
        leads = _scrape_indeed(query, location, max_results)
    elif portal == "linkedin_jobs":
        leads = _scrape_linkedin_jobs(query, location, max_results)
    else:
        return []

    return enrich_leads(leads, query=query, location=location)


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
                                "name": "", "email": "", "company": company, "title": title,
                                "phone": "", "website": "", "location": loc_txt,
                                "industry": query, "source": "naukri",
                            }
                        )
                except Exception:
                    continue
            page += 1
            time.sleep(2)
        except Exception as exc:
            logger.warning("naukri failed: %s", type(exc).__name__, extra={"event": "source_error"})
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
                                "name": "", "email": "", "company": company, "title": query,
                                "phone": "", "website": "", "location": loc_txt,
                                "industry": query, "source": "indeed",
                            }
                        )
                except Exception:
                    continue
            start += 10
            time.sleep(2)
        except Exception as exc:
            logger.warning("indeed failed: %s", type(exc).__name__, extra={"event": "source_error"})
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
                                "name": "", "email": "", "company": company, "title": title,
                                "phone": "", "website": "", "location": loc_txt,
                                "industry": query, "source": "linkedin_jobs",
                            }
                        )
                except Exception:
                    continue
            start += 25
            time.sleep(2)
        except Exception as exc:
            logger.warning("linkedin jobs failed: %s", type(exc).__name__, extra={"event": "source_error"})
            break
    return leads
