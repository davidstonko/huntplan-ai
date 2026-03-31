"""
HuntPlan AI — Regulations Scraper

Scrapes hunting season data from eRegulations.com and MD DNR.
Each state needs a state-specific scraper class; this is the Maryland implementation.
"""

import httpx
from bs4 import BeautifulSoup
from typing import Optional
import logging

logger = logging.getLogger(__name__)

EREGULATIONS_BASE = "https://www.eregulations.com"

# Maryland-specific URLs on eRegulations
MD_URLS = {
    "hub": f"{EREGULATIONS_BASE}/maryland/hunting",
    "deer_seasons": f"{EREGULATIONS_BASE}/maryland/hunting/deer-seasons-bag-limits",
    "deer_regs": f"{EREGULATIONS_BASE}/maryland/hunting/deer-regs-for-archery-muzzleloader-firearms-airguns",
    "turkey": f"{EREGULATIONS_BASE}/maryland/hunting/turkey-seasons-limits",
    "turkey_regs": f"{EREGULATIONS_BASE}/maryland/hunting/wild-turkey-hunting",
    "migratory": f"{EREGULATIONS_BASE}/maryland/hunting/migratory-game-bird-hunting",
    "small_game": f"{EREGULATIONS_BASE}/maryland/hunting/small-game-hunting",
    "furbearer": f"{EREGULATIONS_BASE}/maryland/hunting/furbearer-seasons-limits",
    "public_lands": f"{EREGULATIONS_BASE}/maryland/hunting/public-hunting-lands",
    "sunday_hunting": f"{EREGULATIONS_BASE}/maryland/hunting/sunday-hunting",
}


class MarylandScraper:
    """
    Scrapes Maryland hunting regulations from eRegulations.com.

    Usage:
        scraper = MarylandScraper()
        raw_pages = await scraper.fetch_all_pages()
        # Then pass to parser.py for structured extraction
    """

    def __init__(self):
        self.client = httpx.AsyncClient(
            timeout=30.0,
            headers={
                "User-Agent": "HuntPlanAI/0.1 (research; contact: huntplanai@example.com)",
            },
            follow_redirects=True,
        )

    async def fetch_page(self, url: str) -> Optional[str]:
        """Fetch a single page and return its HTML content."""
        try:
            response = await self.client.get(url)
            response.raise_for_status()
            logger.info(f"Fetched {url} — {len(response.text)} bytes")
            return response.text
        except httpx.HTTPError as e:
            logger.error(f"Failed to fetch {url}: {e}")
            return None

    async def fetch_all_pages(self) -> dict[str, Optional[str]]:
        """Fetch all Maryland regulation pages. Returns dict of page_key -> HTML."""
        results = {}
        for key, url in MD_URLS.items():
            html = await self.fetch_page(url)
            results[key] = html
        return results

    async def extract_text(self, url: str) -> Optional[str]:
        """Fetch a page and extract clean text (stripped of HTML)."""
        html = await self.fetch_page(url)
        if not html:
            return None
        soup = BeautifulSoup(html, "lxml")

        # Remove script and style elements
        for tag in soup(["script", "style", "nav", "header", "footer"]):
            tag.decompose()

        text = soup.get_text(separator="\n", strip=True)
        return text

    async def fetch_all_text(self) -> dict[str, Optional[str]]:
        """Fetch all pages and return clean text for each."""
        results = {}
        for key, url in MD_URLS.items():
            text = await self.extract_text(url)
            results[key] = text
        return results

    async def close(self):
        await self.client.aclose()
