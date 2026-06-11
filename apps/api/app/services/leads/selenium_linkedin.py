"""Browser-based LinkedIn people search — PORTED from V1, flag-gated.

Off by default (ENABLE_SELENIUM_SOURCES=false). When enabled, uses the
distro-installed chromium + chromium-driver (arm64-safe) — NEVER
webdriver-manager downloads. The requests-based sources are primary.
"""
import logging
import time

import requests

from app.core.settings import get_settings

logger = logging.getLogger("reachflow.leads.selenium")

CHROMEDRIVER_PATHS = ("/usr/bin/chromedriver", "/usr/lib/chromium/chromedriver")
CHROMIUM_PATHS = ("/usr/bin/chromium", "/usr/bin/chromium-browser")


def scrape_linkedin_selenium(query: str, industry: str = "", location: str = "", max_results: int = 30) -> list:
    settings = get_settings()
    if not settings.enable_selenium_sources:
        logger.info("selenium sources disabled — skipping", extra={"event": "source_skipped"})
        return []

    try:
        from selenium import webdriver
        from selenium.webdriver.chrome.options import Options
        from selenium.webdriver.chrome.service import Service
        from selenium.webdriver.common.by import By
        from selenium.webdriver.support import expected_conditions as EC
        from selenium.webdriver.support.ui import WebDriverWait
    except ImportError:
        logger.warning("selenium not installed — skipping", extra={"event": "source_skipped"})
        return []

    li_email = settings.smtp_user
    li_pass = settings.smtp_password
    if not li_email or not li_pass:
        logger.info("linkedin credentials not configured — skipping", extra={"event": "source_skipped"})
        return []

    import os

    driver_path = next((p for p in CHROMEDRIVER_PATHS if os.path.exists(p)), None)
    binary_path = next((p for p in CHROMIUM_PATHS if os.path.exists(p)), None)
    if not driver_path:
        logger.warning("distro chromedriver not found — skipping", extra={"event": "source_skipped"})
        return []

    options = Options()
    if binary_path:
        options.binary_location = binary_path
    options.add_argument("--headless")
    options.add_argument("--no-sandbox")
    options.add_argument("--disable-dev-shm-usage")
    options.add_argument("--disable-notifications")

    driver = webdriver.Chrome(service=Service(driver_path), options=options)
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
            logger.warning("linkedin verification challenge — cannot proceed headless")
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
                    name_el = result.find_element(
                        By.CSS_SELECTOR, ".entity-result__title-text a span[aria-hidden='true']"
                    )
                    name = name_el.text.strip()
                    profile = result.find_element(
                        By.CSS_SELECTOR, ".entity-result__title-text a"
                    ).get_attribute("href").split("?")[0]
                    title_el = result.find_element(By.CSS_SELECTOR, ".entity-result__primary-subtitle")
                    title = title_el.text.strip() if title_el else ""
                    comp_el = result.find_element(By.CSS_SELECTOR, ".entity-result__secondary-subtitle")
                    company = comp_el.text.strip().split("·")[0].strip() if comp_el else ""
                    leads.append(
                        {
                            "name": name, "email": "", "company": company, "title": title,
                            "phone": "", "website": "", "linkedin_url": profile,
                            "location": location, "industry": industry,
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
