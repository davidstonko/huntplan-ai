"""
HuntPlan AI — Regulations Parser

Parses scraped HTML/text into structured regulation data.
This module converts raw eRegulations content into database-ready dicts.
"""

from bs4 import BeautifulSoup
from typing import Optional
import re
import logging

logger = logging.getLogger(__name__)


def parse_deer_seasons_html(html: str) -> dict:
    """
    Parse the deer seasons & bag limits page from eRegulations.
    Returns structured data ready for database insertion.
    """
    soup = BeautifulSoup(html, "lxml")
    text = soup.get_text(separator="\n", strip=True)

    # For now, we use the pre-extracted seed data (md_seed_data.py)
    # In production, this would parse the HTML tables/sections dynamically.
    # eRegulations uses structured HTML tables that can be parsed with BeautifulSoup.

    logger.info("Parsed deer seasons page — use seed data for initial load")
    return {"raw_text": text, "source": "eregulations_deer_seasons"}


def parse_turkey_seasons_html(html: str) -> dict:
    """Parse the turkey seasons & limits page."""
    soup = BeautifulSoup(html, "lxml")
    text = soup.get_text(separator="\n", strip=True)

    logger.info("Parsed turkey seasons page — use seed data for initial load")
    return {"raw_text": text, "source": "eregulations_turkey_seasons"}


def clean_date_string(date_str: str) -> str:
    """
    Normalize date strings from regulations.
    e.g., 'Nov. 29' -> '2025-11-29', 'Sept. 5' -> '2025-09-05'
    """
    month_map = {
        "jan": "01", "feb": "02", "mar": "03", "apr": "04",
        "may": "05", "jun": "06", "jul": "07", "aug": "08",
        "sep": "09", "sept": "09", "oct": "10", "nov": "11", "dec": "12",
    }

    date_str = date_str.strip().lower().rstrip(".")
    for abbrev, num in month_map.items():
        if date_str.startswith(abbrev):
            day_match = re.search(r"(\d+)", date_str)
            if day_match:
                day = int(day_match.group(1))
                return f"{num}-{day:02d}"
    return date_str


def extract_regulation_text_for_rag(pages: dict[str, str]) -> list[dict]:
    """
    Extract regulation text chunks for the RAG vector store.
    Each chunk has: text, source_url, section, state.
    """
    chunks = []
    for page_key, text in pages.items():
        if not text:
            continue

        # Split into paragraphs / sections
        paragraphs = [p.strip() for p in text.split("\n\n") if len(p.strip()) > 50]

        for i, para in enumerate(paragraphs):
            chunks.append({
                "text": para,
                "source": f"eregulations_maryland_{page_key}",
                "section": f"{page_key}_chunk_{i}",
                "state": "MD",
            })

    logger.info(f"Extracted {len(chunks)} text chunks for RAG")
    return chunks
