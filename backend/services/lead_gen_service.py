"""
services/lead_gen_service.py — Lead Generation Router
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Called by Celery worker (tasks.py) to run scraping jobs.
Routes to the correct scraper based on the source param.
"""

import os
import re
import time
import requests
from bs4 import BeautifulSoup
from config import GOOGLE_MAPS_API_KEY, APOLLO_API_KEY, SENDER_EMAIL, GMAIL_PASSWORD

HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/120.0.0.0 Safari/537.36"
    )
}

EMAIL_RE = re.compile(r"[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}")
SKIP_DOMAINS = {"example.com","domain.com","yourdomain.com","sentry.io",
                "wix.com","wordpress.com","png","jpg","gif","svg"}


def run_lead_gen(params: dict) -> list:
    """Entry point called by tasks.py. Routes to correct scraper."""
    source   = params.get("source", "google_maps")
    query    = params.get("query", "")
    location = params.get("location", "")
    industry = params.get("industry", "")
    method   = params.get("method", "selenium")
    portal   = params.get("portal", "naukri")
    max_r    = int(params.get("max", 50))

    if source == "google_maps":
        return scrape_google_maps(query, location, max_r)
    elif source == "linkedin":
        if method == "apollo":
            return scrape_apollo(query, industry, location, max_r)
        else:
            return scrape_linkedin_selenium(query, industry, location, max_r)
    elif source == "job_portal":
        return scrape_job_portal(portal, query, location, max_r)
    elif source == "apollo":
        return scrape_apollo(query, industry, location, max_r)
    else:
        return []


# ─────────────────────────────────────────────────────────
#  EMAIL FINDER
# ─────────────────────────────────────────────────────────

def find_email(website: str) -> str:
    """Scrape a company website for a publicly listed email."""
    if not website:
        return ""
    if not website.startswith("http"):
        website = "https://" + website

    pages = [
        website,
        website.rstrip("/") + "/contact",
        website.rstrip("/") + "/contact-us",
        website.rstrip("/") + "/about",
    ]
    for page in pages:
        try:
            resp   = requests.get(page, headers=HEADERS, timeout=7)
            emails = EMAIL_RE.findall(resp.text)
            for e in emails:
                domain = e.split("@")[1].lower()
                if not any(s in domain for s in SKIP_DOMAINS):
                    return e.lower()
        except Exception:
            continue
    return ""


# ─────────────────────────────────────────────────────────
#  GOOGLE MAPS
# ─────────────────────────────────────────────────────────

def scrape_google_maps(query: str, location: str, max_results: int = 50) -> list:
    from config import GOOGLE_MAPS_API_KEY as api_key  # type: ignore
    if not api_key:
        print("[LeadGen] Google Maps API key not set — skipping")
        return []

    base_url = "https://maps.googleapis.com/maps/api/place/textsearch/json"
    leads    = []
    params   = {"query": f"{query} in {location}", "key": api_key}

    while len(leads) < max_results:
        try:
            resp = requests.get(base_url, params=params, timeout=10)
            data = resp.json()
        except Exception as e:
            print(f"[Google Maps] Request error: {e}")
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
                    params={"place_id": place["place_id"],
                            "fields": "name,formatted_address,formatted_phone_number,website,types",
                            "key": api_key},
                    timeout=10
                )
                detail   = detail_resp.json().get("result", {})
                company  = detail.get("name", place.get("name", ""))
                website  = detail.get("website", "")
                phone    = detail.get("formatted_phone_number", "")
                address  = detail.get("formatted_address", "")
                types    = detail.get("types", [])
                industry = types[0].replace("_", " ").title() if types else query
                email    = find_email(website) if website else ""

                leads.append({
                    "name": "", "email": email, "company": company,
                    "title": "", "phone": phone, "website": website,
                    "location": address, "industry": industry, "source": "google_maps",
                })
                time.sleep(0.3)
            except Exception as e:
                print(f"[Google Maps] Place detail error: {e}")
                continue

        next_token = data.get("next_page_token")
        if not next_token or len(leads) >= max_results:
            break
        time.sleep(2)
        params = {"pagetoken": next_token, "key": api_key}

    return leads


# ─────────────────────────────────────────────────────────
#  APOLLO.IO
# ─────────────────────────────────────────────────────────

def scrape_apollo(query: str, industry: str = "", location: str = "",
                  max_results: int = 50) -> list:
    api_key = APOLLO_API_KEY
    if not api_key:
        print("[LeadGen] Apollo API key not set — skipping")
        return []

    headers = {
        "Content-Type": "application/json",
        "X-Api-Key":    api_key,
    }
    titles  = [t.strip() for t in query.split(",")]
    leads   = []
    page    = 1

    while len(leads) < max_results:
        payload = {
            "person_titles":      titles,
            "person_locations":   [location] if location else [],
            "page":               page,
            "per_page":           min(max_results - len(leads), 25),
        }
        if industry:
            payload["q_organization_keyword_tags"] = [industry]

        try:
            resp = requests.post(
                "https://api.apollo.io/v1/mixed_people/search",
                json=payload, headers=headers, timeout=15
            )
            if resp.status_code != 200:
                print(f"[Apollo] API error {resp.status_code}")
                break
            data   = resp.json()
            people = data.get("people", [])
            if not people:
                break

            for p in people:
                if len(leads) >= max_results:
                    break
                org     = p.get("organization") or {}
                name    = f"{p.get('first_name','')} {p.get('last_name','')}".strip()
                email   = (p.get("email") or "").lower()
                company = org.get("name", "")
                leads.append({
                    "name": name, "email": email,
                    "company": company, "title": p.get("title", ""),
                    "phone": "", "website": org.get("website_url", ""),
                    "linkedin_url": p.get("linkedin_url", ""),
                    "location": f"{p.get('city','')} {p.get('country','')}".strip(),
                    "industry": org.get("industry", industry),
                    "company_size": str(org.get("estimated_num_employees", "")),
                    "source": "apollo",
                })
            if len(people) < payload["per_page"]:
                break
            page += 1
            time.sleep(1)
        except Exception as e:
            print(f"[Apollo] Error: {e}")
            break

    return leads


# ─────────────────────────────────────────────────────────
#  JOB PORTALS (Naukri / Indeed / LinkedIn Jobs)
# ─────────────────────────────────────────────────────────

def scrape_job_portal(portal: str, query: str, location: str = "",
                      max_results: int = 50) -> list:
    if portal == "naukri":
        return _scrape_naukri(query, location, max_results)
    elif portal == "indeed":
        return _scrape_indeed(query, location, max_results)
    elif portal == "linkedin_jobs":
        return _scrape_linkedin_jobs(query, location, max_results)
    return []


def _scrape_naukri(query: str, location: str, max_results: int) -> list:
    leads = []
    page  = 1
    while len(leads) < max_results:
        q   = "-".join(query.lower().split())
        loc = "-".join(location.lower().split()) if location else ""
        url = f"https://www.naukri.com/{q}-jobs" + (f"-in-{loc}" if loc else "") + f"-{page}"
        try:
            resp  = requests.get(url, headers=HEADERS, timeout=10)
            soup  = BeautifulSoup(resp.text, "html.parser")
            cards = soup.select("article.jobTuple, div.srp-jobtuple-wrapper")
            if not cards:
                break
            for card in cards:
                if len(leads) >= max_results:
                    break
                try:
                    company = (card.select_one("a.subTitle, .comp-name") or {}).get_text(strip=True)
                    title   = (card.select_one("a.title, .row1 a") or {}).get_text(strip=True) or query
                    loc_el  = card.select_one("li.fleft.br2.placeHolderLi, .locWdth")
                    loc_txt = loc_el.get_text(strip=True) if loc_el else location
                    if company:
                        leads.append({"name":"","email":"","company":company,"title":"HR / Recruiter",
                                      "phone":"","website":"","location":loc_txt,"industry":query,"source":"naukri"})
                except Exception:
                    continue
            page += 1
            time.sleep(2)
        except Exception as e:
            print(f"[Naukri] Error: {e}")
            break
    return leads


def _scrape_indeed(query: str, location: str, max_results: int) -> list:
    leads = []
    start = 0
    while len(leads) < max_results:
        url = f"https://www.indeed.com/jobs?q={requests.utils.quote(query)}&l={requests.utils.quote(location)}&start={start}"
        try:
            resp  = requests.get(url, headers=HEADERS, timeout=10)
            soup  = BeautifulSoup(resp.text, "html.parser")
            cards = soup.select("div.job_seen_beacon, div.tapItem")
            if not cards:
                break
            for card in cards:
                if len(leads) >= max_results:
                    break
                try:
                    company = (card.select_one("span.companyName, [data-testid='company-name']") or {}).get_text(strip=True)
                    loc_el  = card.select_one("div.companyLocation, [data-testid='text-location']")
                    loc_txt = loc_el.get_text(strip=True) if loc_el else location
                    if company:
                        leads.append({"name":"","email":"","company":company,"title":"HR / Recruiter",
                                      "phone":"","website":"","location":loc_txt,"industry":query,"source":"indeed"})
                except Exception:
                    continue
            start += 10
            time.sleep(2)
        except Exception as e:
            print(f"[Indeed] Error: {e}")
            break
    return leads


def _scrape_linkedin_jobs(query: str, location: str, max_results: int) -> list:
    leads = []
    start = 0
    while len(leads) < max_results:
        url = (f"https://www.linkedin.com/jobs-guest/jobs/api/seeMoreJobPostings/search"
               f"?keywords={requests.utils.quote(query)}&location={requests.utils.quote(location)}&start={start}")
        try:
            resp  = requests.get(url, headers=HEADERS, timeout=10)
            soup  = BeautifulSoup(resp.text, "html.parser")
            cards = soup.select("li")
            if not cards:
                break
            for card in cards:
                if len(leads) >= max_results:
                    break
                try:
                    company = (card.select_one("h4.base-search-card__subtitle") or {}).get_text(strip=True)
                    loc_el  = card.select_one("span.job-search-card__location")
                    loc_txt = loc_el.get_text(strip=True) if loc_el else location
                    if company:
                        leads.append({"name":"","email":"","company":company,"title":"HR / Recruiter",
                                      "phone":"","website":"","location":loc_txt,"industry":query,"source":"linkedin_jobs"})
                except Exception:
                    continue
            start += 25
            time.sleep(2)
        except Exception as e:
            print(f"[LinkedIn Jobs] Error: {e}")
            break
    return leads


# ─────────────────────────────────────────────────────────
#  LINKEDIN SELENIUM
# ─────────────────────────────────────────────────────────

def scrape_linkedin_selenium(query: str, industry: str = "",
                              location: str = "", max_results: int = 30) -> list:
    """Browser-based LinkedIn scraping. Requires Chrome + selenium installed."""
    try:
        from selenium import webdriver
        from selenium.webdriver.common.by import By
        from selenium.webdriver.chrome.options import Options
        from selenium.webdriver.support.ui import WebDriverWait
        from selenium.webdriver.support import expected_conditions as EC
        from selenium.webdriver.chrome.service import Service
        from webdriver_manager.chrome import ChromeDriverManager
    except ImportError:
        print("[LinkedIn] selenium not installed — pip install selenium webdriver-manager")
        return []

    li_email = SENDER_EMAIL
    li_pass  = GMAIL_PASSWORD
    if not li_email or not li_pass:
        print("[LinkedIn] SENDER_EMAIL / GMAIL_PASSWORD not set in .env")
        return []

    options = Options()
    options.add_argument("--headless")
    options.add_argument("--no-sandbox")
    options.add_argument("--disable-dev-shm-usage")
    options.add_argument("--disable-notifications")

    driver = webdriver.Chrome(
        service=Service(ChromeDriverManager().install()),
        options=options
    )
    wait  = WebDriverWait(driver, 15)
    leads = []

    try:
        driver.get("https://www.linkedin.com/login")
        wait.until(EC.presence_of_element_located((By.ID, "username")))
        driver.find_element(By.ID, "username").send_keys(li_email)
        driver.find_element(By.ID, "password").send_keys(li_pass)
        driver.find_element(By.XPATH, "//button[@type='submit']").click()
        time.sleep(3)

        if "challenge" in driver.current_url or "checkpoint" in driver.current_url:
            print("[LinkedIn] Verification required — cannot complete in headless mode")
            return []

        search_url = (
            f"https://www.linkedin.com/search/results/people/"
            f"?keywords={requests.utils.quote(query)}"
            + (f"&geoUrn=%5B%22{requests.utils.quote(location)}%22%5D" if location else "")
        )
        driver.get(search_url)
        time.sleep(3)

        page = 1
        while len(leads) < max_results:
            results = driver.find_elements(By.CSS_SELECTOR, ".entity-result__item")
            if not results:
                break
            for result in results:
                if len(leads) >= max_results:
                    break
                try:
                    name_el  = result.find_element(By.CSS_SELECTOR, ".entity-result__title-text a span[aria-hidden='true']")
                    name     = name_el.text.strip()
                    profile  = result.find_element(By.CSS_SELECTOR, ".entity-result__title-text a").get_attribute("href").split("?")[0]
                    title_el = result.find_element(By.CSS_SELECTOR, ".entity-result__primary-subtitle")
                    title    = title_el.text.strip() if title_el else ""
                    comp_el  = result.find_element(By.CSS_SELECTOR, ".entity-result__secondary-subtitle")
                    company  = comp_el.text.strip().split("·")[0].strip() if comp_el else ""
                    leads.append({"name":name,"email":"","company":company,"title":title,
                                  "phone":"","website":"","linkedin_url":profile,
                                  "location":location,"industry":industry,"source":"linkedin_selenium"})
                except Exception:
                    continue
            try:
                next_btn = driver.find_element(By.CSS_SELECTOR, "button[aria-label='Next']")
                if not next_btn.is_enabled():
                    break
                next_btn.click()
                time.sleep(3)
                page += 1
            except Exception:
                break
    finally:
        driver.quit()

    return leads
