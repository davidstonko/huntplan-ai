#!/usr/bin/env python3
"""
Maryland Hunting Regulations Ingestion Script

Populates the regulation_chunks table with searchable hunting data.
Run this after database migration to seed the RAG knowledge base.

Usage:
    python -m scripts.ingest_regulations
    # or from backend/:
    python scripts/ingest_regulations.py
"""

import asyncio
import uuid
import sys
import os

# Add parent dir to path so we can import app modules
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy import text
from app.db.database import engine, async_session, Base
from app.models.rag import RegulationChunk


# ─────────────────────────────────────────────────────────────────────────────
# MARYLAND HUNTING DATA
#
# Loaded from backend/data/maryland_regulations.json, which is GENERATED from
# src/data/marylandHuntingData.ts by scripts/export_regulations_json.js.
#
# This file used to carry its own hand-written copy of the season table, under
# the comment "mirrored from mobile TypeScript data". It drifted, exactly as a
# second copy always does: on 2026-09-27 the app shipped 2026-2027 dates while
# the deployed knowledge base was still answering with 2025-2026 ones, so the
# AI tab would have told a hunter archery opened 2025-09-06. For a regulations
# app that is the worst class of bug there is.
#
# So do not re-add literal season data here. Edit the TypeScript, run
# `node scripts/export_regulations_json.js`, and commit both files.
# regs_json_is_current.test.ts fails the suite if they disagree.
# ─────────────────────────────────────────────────────────────────────────────

import json
from pathlib import Path

_DATA_FILE = Path(__file__).resolve().parent.parent / "data" / "maryland_regulations.json"


def _load_regulations() -> dict:
    if not _DATA_FILE.exists():
        raise FileNotFoundError(
            f"{_DATA_FILE} is missing. It is generated from the app's "
            "regulation data — run: node scripts/export_regulations_json.js"
        )
    with _DATA_FILE.open(encoding="utf-8") as fh:
        data = json.load(fh)
    if not data.get("seasons"):
        raise ValueError(f"{_DATA_FILE} contains no seasons")
    return data


_REGS = _load_regulations()

# The license year these chunks describe, e.g. "2026-2027". Written onto every
# row as regulation_year, so a stale knowledge base is visible in the database
# rather than only in the answers hunters read.
SEASON_LABEL: str = _REGS["meta"]["seasonLabel"]
SOURCE_URL: str = _REGS["meta"]["sourceUrl"]

SEASONS: list[dict] = _REGS["seasons"]
WMAS: list[dict] = _REGS["wmas"]
COUNTIES: list[dict] = _REGS["counties"]
BAG_LIMITS: list[dict] = _REGS["bag_limits"]


GENERAL_REGULATIONS = [
    {
        "title": "Maryland Hunting License Requirements",
        "content": "All hunters in Maryland must have a valid hunting license. Maryland residents can purchase an annual hunting license for approximately $24.50. Non-residents pay approximately $130.50. Junior hunters (ages 10-15) hunt free with a licensed adult. Apprentice licenses available for first-time hunters without a Hunter Education course. A Deer Stamp ($5) is required for deer hunting. A Turkey Stamp ($5) is required for turkey hunting. A Migratory Game Bird Stamp (federal duck stamp, ~$25) is required for waterfowl. HIP (Harvest Information Program) registration is free and required for all migratory bird hunters.",
        "category": "license",
    },
    {
        "title": "Maryland Hunter Education Requirements",
        "content": "Maryland requires all first-time hunters to complete a state-approved Hunter Education course before purchasing a hunting license. The course covers firearm safety, wildlife management, hunting ethics, first aid, and Maryland-specific regulations. Online courses are available through the MD DNR website. Apprentice hunting licenses allow first-time hunters to hunt under the direct supervision of a licensed hunter while completing the course. Youth hunters (under 16) must be accompanied by a licensed adult 18+ at all times.",
        "category": "license",
    },
    {
        "title": "Maryland Legal Shooting Hours",
        "content": "Legal shooting hours in Maryland for most game are 30 minutes before sunrise to 30 minutes after sunset. For migratory birds (waterfowl, dove), shooting hours are 30 minutes before sunrise to sunset (not after sunset). Spring turkey hunting hours are 30 minutes before sunrise to noon during the first two weeks, then 30 minutes before sunrise to sunset for the remainder of the season. Deer hunters should always check the exact sunrise/sunset times for their hunting location and date.",
        "category": "general",
    },
    {
        "title": "Maryland Weapon Regulations for Hunting",
        "content": "Rifles: Centerfire rifles are legal for deer in most counties. Some counties restrict to shotgun/bow only. Check your specific county. Shotguns: Must use non-toxic shot for waterfowl. Buckshot or slugs for deer. Bows: Compound, recurve, and crossbow are legal during archery season. Minimum draw weight requirements may apply. Muzzleloaders: Single-shot, front-loading firearms. Both flintlock and inline muzzleloaders are legal. Handguns: Legal for deer hunting during firearms season if minimum caliber requirements are met. Prohibited: Fully automatic weapons, suppressors/silencers for hunting, poisoned arrows, electronic calls for deer/turkey (calls OK for waterfowl and predators).",
        "category": "weapon",
    },
    {
        "title": "Maryland Sunday Hunting Laws",
        "content": "Sunday hunting is permitted on private land in all Maryland counties. Sunday hunting on public land varies by location. Many Wildlife Management Areas (WMAs) and state forests allow Sunday hunting, but some do not. Always check the specific public land's rules before planning a Sunday hunt. Bow hunting is generally the most widely permitted method on Sundays. Some public lands allow Sunday hunting during certain seasons only. Check the MDHuntFishOutdoors app map or MD DNR website for land-specific Sunday hunting rules.",
        "category": "sunday",
    },
    {
        "title": "Maryland Deer Tagging and Checking Requirements",
        "content": "All harvested deer must be checked in within 24 hours using the MD DNR's online game checking system or by calling the automated phone system. You must have your confirmation number before transporting the deer. Antler point restrictions apply in some counties — check your specific county. CWD (Chronic Wasting Disease) testing is available and recommended in designated CWD management areas. Antlered deer must have at least 3 points on one antler in certain antler restriction zones.",
        "category": "general",
    },
    {
        "title": "Maryland Hunting Safety and Ethics",
        "content": "Fluorescent orange is required during firearms deer season — a minimum of 250 square inches of daylight fluorescent orange visible from all sides. Tree stand safety: Always use a full-body safety harness when hunting from an elevated stand. Notify landowners and nearby hunters of your hunting location. Never shoot at movement or sound — always positively identify your target. Be aware of other hunters, hikers, and residences in the area. Report poaching or illegal hunting to the MD DNR Natural Resources Police at 1-800-628-9944.",
        "category": "general",
    },
    {
        "title": "Maryland Chronic Wasting Disease (CWD) Information",
        "content": "CWD has been detected in white-tailed deer in western Maryland, primarily in Allegany and Washington counties. Special regulations apply in the CWD Management Area including mandatory deer checking, antler restrictions, and feeding/baiting bans. Hunters harvesting deer in the CWD zone are encouraged to submit samples for free testing. Do not transport whole deer carcasses out of the CWD zone — only deboned meat, cleaned skull plates, and tanned hides may be moved. For the latest CWD updates, check the MD DNR CWD page.",
        "category": "general",
    },
]


# ─────────────────────────────────────────────────────────────────────────────
# CHUNK BUILDERS
# ─────────────────────────────────────────────────────────────────────────────

def build_season_chunks() -> list[dict]:
    """Create one chunk per hunting season."""
    chunks = []
    for s in SEASONS:
        county_note = f" Counties: {', '.join(s['counties'])}." if s["counties"] else " Statewide."
        content = (
            f"Maryland {s['species']} {s['season_type']} Season ({s['start_date']} to {s['end_date']}). "
            f"Weapon: {s['weapon']}. Bag limit: {s['bag_limit']}.{county_note} "
            f"{s['notes']}"
        )
        chunks.append({
            "title": f"{s['species']} — {s['season_type']} Season",
            "content": content,
            "category": "season",
            "species": s["species"].split("(")[0].strip(),
            "county": s["counties"][0] if s["counties"] else None,
            "source": "MD DNR Hunter's Guide / eRegulations Maryland",
            "extra_data": {
                "start_date": s["start_date"],
                "end_date": s["end_date"],
                "weapon": s["weapon"],
                "bag_limit": s["bag_limit"],
            },
        })
    return chunks


def build_wma_chunks() -> list[dict]:
    """Create one chunk per WMA."""
    chunks = []
    for w in WMAS:
        sunday_text = "Sunday hunting IS allowed" if w["sunday"] else "Sunday hunting is NOT allowed"
        content = (
            f"{w['name']} is a {w['acres']}-acre public hunting area in {w['county']} County, Maryland. "
            f"Species: {', '.join(w['species'])}. "
            f"Allowed weapons: {', '.join(w['weapons'])}. "
            f"{sunday_text} at this location. "
            f"{w['notes']}"
        )
        chunks.append({
            "title": f"{w['name']} ({w['county']} County)",
            "content": content,
            "category": "land",
            "species": None,
            "county": w["county"],
            "source": "MD DNR Wildlife Management Areas",
            "extra_data": {
                "acres": w["acres"],
                "species": w["species"],
                "weapons": w["weapons"],
                "sunday_hunting": w["sunday"],
            },
        })
    return chunks


def build_county_chunks() -> list[dict]:
    """Create one chunk per county."""
    chunks = []
    for c in COUNTIES:
        sunday_text = "Sunday hunting IS allowed" if c["sunday"] else "Sunday hunting is NOT allowed"
        content = (
            f"{c['name']} County, Maryland — Deer Management Region: {c['region']}. "
            f"{sunday_text} on private land in {c['name']} County. "
            f"Antler restrictions: {c['antler']}. "
            f"{c['notes']}"
        )
        chunks.append({
            "title": f"{c['name']} County Hunting Rules",
            "content": content,
            "category": "county",
            "species": None,
            "county": c["name"],
            "source": "MD DNR County Hunting Regulations",
            "extra_data": {
                "region": c["region"],
                "sunday_hunting": c["sunday"],
                "antler_restrictions": c["antler"],
            },
        })
    return chunks


def build_bag_limit_chunks() -> list[dict]:
    """Create one chunk per bag limit rule."""
    chunks = []
    for b in BAG_LIMITS:
        content = (
            f"Maryland {b['species']} bag limit: {b['qty']} per {b['period']}. "
            f"Weapon: {b['weapon']}. Limit type: {b['type']}. "
            f"{b['notes']}"
        )
        chunks.append({
            "title": f"{b['species']} — Bag Limit ({b['weapon']})",
            "content": content,
            "category": "bag_limit",
            "species": b["species"].split("(")[0].strip(),
            "county": None,
            "source": "MD DNR Bag Limits / eRegulations Maryland",
            "extra_data": {
                "quantity": b["qty"],
                "period": b["period"],
                "weapon": b["weapon"],
                "limit_type": b["type"],
            },
        })
    return chunks


def build_general_chunks() -> list[dict]:
    """Create chunks for general regulation knowledge."""
    chunks = []
    for g in GENERAL_REGULATIONS:
        chunks.append({
            "title": g["title"],
            "content": g["content"],
            "category": g["category"],
            "species": None,
            "county": None,
            "source": "MD DNR Hunter's Guide",
            "extra_data": {},
        })
    return chunks


# ─────────────────────────────────────────────────────────────────────────────
# INGESTION
# ─────────────────────────────────────────────────────────────────────────────

async def ingest_all():
    """Ingest all regulation chunks into the database."""
    print("🦌 Maryland Hunting Regulations Ingestion")
    print("=" * 50)

    # Build all chunks
    all_chunks = []
    all_chunks.extend(build_season_chunks())
    print(f"  Seasons: {len(build_season_chunks())} chunks")
    all_chunks.extend(build_wma_chunks())
    print(f"  WMAs: {len(build_wma_chunks())} chunks")
    all_chunks.extend(build_county_chunks())
    print(f"  Counties: {len(build_county_chunks())} chunks")
    all_chunks.extend(build_bag_limit_chunks())
    print(f"  Bag limits: {len(build_bag_limit_chunks())} chunks")
    all_chunks.extend(build_general_chunks())
    print(f"  General: {len(build_general_chunks())} chunks")
    print(f"  TOTAL: {len(all_chunks)} chunks")
    print()

    async with engine.begin() as conn:
        # Create pgvector extension (if available) and tables
        await conn.execute(text("CREATE EXTENSION IF NOT EXISTS postgis"))
        # Note: pgvector may not be available on all Render plans
        try:
            await conn.execute(text("CREATE EXTENSION IF NOT EXISTS vector"))
            print("  ✓ pgvector extension enabled")
        except Exception:
            print("  ⚠ pgvector not available (full-text search will be used)")

        await conn.run_sync(Base.metadata.create_all)
        print("  ✓ Tables created")

        # Clear existing MD chunks (idempotent re-ingestion)
        await conn.execute(text("DELETE FROM regulation_chunks WHERE state = 'MD'"))
        print("  ✓ Cleared existing MD chunks")

    # Insert chunks
    async with async_session() as session:
        for chunk_data in all_chunks:
            chunk = RegulationChunk(
                id=str(uuid.uuid4()),
                content=chunk_data["content"],
                title=chunk_data["title"],
                state="MD",
                category=chunk_data["category"],
                species=chunk_data["species"],
                county=chunk_data["county"],
                source=chunk_data["source"],
                extra_data=chunk_data["extra_data"],
                regulation_year="2025-2026",
            )
            session.add(chunk)

        await session.commit()
        print(f"  ✓ Inserted {len(all_chunks)} chunks")

    # Update full-text search vectors
    async with engine.begin() as conn:
        await conn.execute(text("""
            UPDATE regulation_chunks
            SET search_vector = to_tsvector('english', title || ' ' || content)
            WHERE state = 'MD'
        """))
        print("  ✓ Search vectors updated")

    print()
    print("✅ Ingestion complete!")
    print(f"   {len(all_chunks)} regulation chunks ready for RAG queries")


if __name__ == "__main__":
    asyncio.run(ingest_all())
