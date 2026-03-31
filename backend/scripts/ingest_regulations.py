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
# MARYLAND HUNTING DATA (mirrored from mobile TypeScript data)
# ─────────────────────────────────────────────────────────────────────────────

SEASONS = [
    # DEER
    {
        "species": "White-tailed Deer",
        "season_type": "Archery",
        "start_date": "2025-09-06",
        "end_date": "2026-01-31",
        "weapon": "Bow",
        "bag_limit": "2 antlered, 5 antlerless",
        "notes": "Archery season runs 5 months. Antlerless bag limit varies by county/region. Check your county for antler restrictions.",
        "counties": [],
    },
    {
        "species": "White-tailed Deer",
        "season_type": "Firearms (Regular)",
        "start_date": "2025-11-29",
        "end_date": "2025-12-13",
        "weapon": "Rifle or Shotgun",
        "bag_limit": "2 antlered, 5 antlerless",
        "notes": "Regular firearms season begins Saturday after Thanksgiving. All hunting methods except archery. Antlerless limit varies by county.",
        "counties": [],
    },
    {
        "species": "White-tailed Deer",
        "season_type": "Muzzleloader (Fall)",
        "start_date": "2025-10-18",
        "end_date": "2025-10-25",
        "weapon": "Muzzleloader",
        "bag_limit": "1 antlered per season",
        "notes": "Muzzleloader only. One antlered deer per season from both fall and winter segments combined. Antlerless also allowed.",
        "counties": [],
    },
    {
        "species": "White-tailed Deer",
        "season_type": "Muzzleloader (Winter)",
        "start_date": "2025-12-14",
        "end_date": "2025-12-20",
        "weapon": "Muzzleloader",
        "bag_limit": "1 antlered per season",
        "notes": "Winter muzzleloader season. Combined antlered limit with fall muzzleloader is 1 per season. Antlerless available.",
        "counties": [],
    },
    # TURKEY
    {
        "species": "Wild Turkey",
        "season_type": "Spring",
        "start_date": "2026-04-14",
        "end_date": "2026-05-23",
        "weapon": "Shotgun or Bow",
        "bag_limit": "1 bearded turkey",
        "notes": "Bearded turkeys only (males). Spring season is limited to one bird. Check your county for opening dates.",
        "counties": [],
    },
    {
        "species": "Wild Turkey",
        "season_type": "Fall (Archery)",
        "start_date": "2025-10-04",
        "end_date": "2025-11-01",
        "weapon": "Bow",
        "bag_limit": "2 turkeys",
        "notes": "Fall archery season allows turkeys of either sex. Maximum 2 per fall/winter combined.",
        "counties": [],
    },
    {
        "species": "Wild Turkey",
        "season_type": "Fall (Firearms)",
        "start_date": "2025-10-18",
        "end_date": "2025-10-25",
        "weapon": "Shotgun",
        "bag_limit": "2 turkeys combined fall/winter",
        "notes": "Fall firearms week (shotgun only). Turkeys of either sex. Counts toward fall/winter combined limit of 2.",
        "counties": [],
    },
    # WATERFOWL
    {
        "species": "Waterfowl (Teal)",
        "season_type": "Early Teal",
        "start_date": "2025-09-01",
        "end_date": "2025-09-15",
        "weapon": "Shotgun",
        "bag_limit": "4 per day",
        "notes": "Blue-winged and green-winged teal only. Requires HIP registration and valid waterfowl stamp.",
        "counties": [],
    },
    {
        "species": "Waterfowl (Ducks)",
        "season_type": "Regular (Split 1)",
        "start_date": "2025-10-25",
        "end_date": "2025-11-15",
        "weapon": "Shotgun",
        "bag_limit": "6 per day",
        "notes": "First split of regular duck season. Includes most species. Federal framework limits apply.",
        "counties": [],
    },
    {
        "species": "Waterfowl (Ducks)",
        "season_type": "Regular (Split 2)",
        "start_date": "2025-11-29",
        "end_date": "2025-12-14",
        "weapon": "Shotgun",
        "bag_limit": "6 per day",
        "notes": "Second split of regular duck season. Continues waterfowl hunting through early winter.",
        "counties": [],
    },
    {
        "species": "Waterfowl (Geese)",
        "season_type": "Regular",
        "start_date": "2025-10-25",
        "end_date": "2025-12-14",
        "weapon": "Shotgun",
        "bag_limit": "5 per day",
        "notes": "Canada and snow geese. Daily limit 5 geese. Must have valid federal stamp and HIP registration.",
        "counties": [],
    },
    # SMALL GAME
    {
        "species": "Rabbit",
        "season_type": "Regular",
        "start_date": "2025-10-01",
        "end_date": "2026-02-28",
        "weapon": "Shotgun or Rifle",
        "bag_limit": "4 per day, 8 in possession",
        "notes": "Eastern cottontail and marsh rabbit. Shotgun or .22 caliber rifle only.",
        "counties": [],
    },
    {
        "species": "Squirrel",
        "season_type": "Regular",
        "start_date": "2025-09-06",
        "end_date": "2026-02-01",
        "weapon": "Shotgun or Rifle",
        "bag_limit": "6 per day, 12 in possession",
        "notes": "Gray and fox squirrel. Includes archery season. Shotgun or .22 rifle.",
        "counties": [],
    },
    {
        "species": "Pheasant",
        "season_type": "Regular",
        "start_date": "2025-11-01",
        "end_date": "2025-12-31",
        "weapon": "Shotgun",
        "bag_limit": "2 per day, 4 in possession",
        "notes": "Ring-necked pheasant. Limited availability; check for restocking areas. Shotgun only.",
        "counties": [],
    },
    {
        "species": "Ruffed Grouse",
        "season_type": "Regular",
        "start_date": "2025-10-04",
        "end_date": "2025-11-22",
        "weapon": "Shotgun",
        "bag_limit": "3 per day, 6 in possession",
        "notes": "Ruffed grouse only. Western Maryland forests. Shotgun with #4 shot or smaller.",
        "counties": ["Garrett", "Allegany"],
    },
    # BEAR
    {
        "species": "Black Bear",
        "season_type": "Regular",
        "start_date": "2025-10-20",
        "end_date": "2025-10-25",
        "weapon": "Rifle",
        "bag_limit": "1 per season",
        "notes": "Designated counties only (primarily Garrett and Allegany). Rifle or shotgun slug. Lottery draw for permits.",
        "counties": ["Garrett", "Allegany"],
    },
]

WMAS = [
    {"name": "Dan's Mountain WMA", "county": "Allegany", "acres": 10246, "species": ["Deer", "Turkey", "Grouse", "Squirrel"], "weapons": ["Bow", "Rifle", "Shotgun", "Muzzleloader"], "sunday": True, "notes": "Mountainous terrain in western Maryland. Popular for deer archery. Scenic ridges."},
    {"name": "Savage River WMA", "county": "Garrett", "acres": 6500, "species": ["Deer", "Turkey", "Grouse", "Squirrel"], "weapons": ["Bow", "Rifle", "Shotgun", "Muzzleloader"], "sunday": False, "notes": "Western Maryland. No Sunday hunting. Pristine hardwood forests. Popular for whitetail."},
    {"name": "Green Ridge WMA", "county": "Allegany", "acres": 9475, "species": ["Deer", "Turkey", "Grouse", "Small Game"], "weapons": ["Bow", "Rifle", "Shotgun", "Muzzleloader"], "sunday": False, "notes": "Ridge habitat in Allegany County. Limited Sunday hunting. Excellent for deer."},
    {"name": "Pocomoke WMA", "county": "Somerset", "acres": 9212, "species": ["Deer", "Waterfowl", "Turkey", "Small Game"], "weapons": ["Bow", "Rifle", "Shotgun"], "sunday": True, "notes": "Eastern Shore swamp habitat. Excellent waterfowl hunting. Deer and turkey also present."},
    {"name": "LeCompte WMA", "county": "Dorchester", "acres": 4050, "species": ["Waterfowl", "Deer", "Turkey"], "weapons": ["Bow", "Rifle", "Shotgun"], "sunday": True, "notes": "Eastern Shore marsh and upland. Great waterfowl and deer habitat."},
    {"name": "Idylwild WMA", "county": "Talbot", "acres": 1627, "species": ["Waterfowl", "Upland Game"], "weapons": ["Shotgun"], "sunday": False, "notes": "Eastern Shore. Waterfowl and small game. Shotgun only; no rifles."},
    {"name": "Millington WMA", "county": "Kent", "acres": 6447, "species": ["Waterfowl", "Turkey", "Upland Game", "Deer"], "weapons": ["Bow", "Rifle", "Shotgun"], "sunday": True, "notes": "Upper Eastern Shore. Mixed habitat with marshes and uplands. Good deer and waterfowl."},
    {"name": "Stoney Creek WMA", "county": "Cecil", "acres": 5618, "species": ["Deer", "Turkey", "Waterfowl", "Upland Game"], "weapons": ["Bow", "Rifle", "Shotgun"], "sunday": True, "notes": "Upper Eastern Shore. Mixed hardwood and agricultural land. Excellent deer hunting."},
    {"name": "Back River Neck WMA", "county": "Anne Arundel", "acres": 3800, "species": ["Waterfowl", "Deer"], "weapons": ["Bow", "Shotgun"], "sunday": True, "notes": "Central Maryland. Tidal marsh and upland. Waterfowl primary; deer secondary."},
    {"name": "Morgan Run WMA", "county": "Baltimore", "acres": 2700, "species": ["Deer", "Turkey", "Upland Game"], "weapons": ["Bow", "Rifle", "Shotgun"], "sunday": False, "notes": "Central Maryland. No Sunday hunting. Hardwood forest and streams. Good deer."},
    {"name": "Little Bennett Regional Park", "county": "Montgomery", "acres": 3700, "species": ["Deer", "Turkey", "Upland Game"], "weapons": ["Bow", "Shotgun"], "sunday": False, "notes": "Northern Maryland. No centerfire rifles. Excellent deer bowhunting."},
    {"name": "Patapsco Valley State Park", "county": "Baltimore", "acres": 14000, "species": ["Deer", "Turkey", "Upland Game"], "weapons": ["Bow", "Shotgun"], "sunday": False, "notes": "Large park with hunting sections. Bow and shotgun only. Excellent urban deer hunting."},
    {"name": "Elk Ridge WMA", "county": "Howard", "acres": 2800, "species": ["Deer", "Upland Game"], "weapons": ["Bow", "Shotgun"], "sunday": False, "notes": "Central Maryland. Shotgun and bow only. Small but productive for deer."},
    {"name": "Washington Monument State Park", "county": "Washington", "acres": 2289, "species": ["Deer", "Turkey"], "weapons": ["Bow"], "sunday": True, "notes": "Western Maryland. Bow only. Scenic ridgeline. Limited acreage but productive."},
    {"name": "Soldiers Delight NEA", "county": "Baltimore", "acres": 1860, "species": ["Deer", "Turkey"], "weapons": ["Bow", "Shotgun"], "sunday": False, "notes": "Urban reserve. Shotgun and bow only. Important for urban deer management."},
    {"name": "Cedarville State Forest", "county": "Charles", "acres": 3700, "species": ["Deer", "Turkey", "Upland Game"], "weapons": ["Bow", "Rifle", "Shotgun"], "sunday": True, "notes": "Southern Maryland. Mixed forest and fields. Good all-around hunting."},
    {"name": "Newman WMA", "county": "Montgomery", "acres": 5200, "species": ["Deer", "Turkey", "Upland Game"], "weapons": ["Bow", "Shotgun"], "sunday": True, "notes": "Northwestern Maryland. No centerfire rifles. Agricultural land with deer."},
]

COUNTIES = [
    {"name": "Allegany", "region": "Western", "sunday": True, "antler": "No restrictions", "notes": "Mountain region. Western Maryland. Grouse hunting available."},
    {"name": "Anne Arundel", "region": "Central", "sunday": True, "antler": "No restrictions", "notes": "Around Annapolis. Urban and suburban. Waterfowl hunting in tidewater."},
    {"name": "Baltimore", "region": "Central", "sunday": True, "antler": "No restrictions", "notes": "Urban/suburban. Limited hunting areas. Bow and shotgun emphasis."},
    {"name": "Baltimore City", "region": "Central", "sunday": False, "antler": "No hunting except special programs", "notes": "Urban area. Limited hunting except dedicated wildlife management areas."},
    {"name": "Calvert", "region": "Central", "sunday": True, "antler": "No restrictions", "notes": "Southern Maryland. Tidewater. Waterfowl and deer habitat."},
    {"name": "Caroline", "region": "Eastern Shore", "sunday": True, "antler": "No restrictions", "notes": "Eastern Shore. Agricultural land. Good deer and upland game."},
    {"name": "Carroll", "region": "Central", "sunday": True, "antler": "No restrictions", "notes": "Northwestern Maryland. Rolling hills. Good deer hunting."},
    {"name": "Cecil", "region": "Northern", "sunday": True, "antler": "No restrictions", "notes": "Upper Eastern Shore. Mixed habitat. Good all-around hunting."},
    {"name": "Charles", "region": "Southern", "sunday": True, "antler": "No restrictions", "notes": "Southern Maryland. Potomac River area. Waterfowl and deer."},
    {"name": "Dorchester", "region": "Eastern Shore", "sunday": True, "antler": "No restrictions", "notes": "Eastern Shore marshlands. Excellent waterfowl. Deer available."},
    {"name": "Frederick", "region": "Central", "sunday": True, "antler": "No restrictions", "notes": "North-central Maryland. Appalachian foothills. Good deer."},
    {"name": "Garrett", "region": "Western", "sunday": True, "antler": "No restrictions", "notes": "Far western Maryland. High elevation. Bear season. Grouse habitat."},
    {"name": "Harford", "region": "Northern", "sunday": True, "antler": "No restrictions", "notes": "Northern Maryland. Rolling terrain. Good deer and turkey."},
    {"name": "Howard", "region": "Central", "sunday": True, "antler": "No restrictions", "notes": "Central Maryland. Urban/suburban. Limited hunting areas."},
    {"name": "Kent", "region": "Eastern Shore", "sunday": True, "antler": "No restrictions", "notes": "Upper Eastern Shore. Chesapeake Bay tributaries. Mixed habitat."},
    {"name": "Montgomery", "region": "Central", "sunday": True, "antler": "No restrictions", "notes": "Northern suburban Maryland. Multiple WMAs. Shotgun/bow emphasis."},
    {"name": "Prince George's", "region": "Central", "sunday": True, "antler": "No restrictions", "notes": "Washington D.C. suburbs. Limited hunting areas."},
    {"name": "Queen Anne's", "region": "Eastern Shore", "sunday": True, "antler": "No restrictions", "notes": "Upper Eastern Shore. Chesapeake Bay area. Waterfowl and deer."},
    {"name": "Somerset", "region": "Eastern Shore", "sunday": True, "antler": "No restrictions", "notes": "Lower Eastern Shore. Swamp habitat. Excellent waterfowl."},
    {"name": "St. Mary's", "region": "Southern", "sunday": True, "antler": "No restrictions", "notes": "Southern Maryland. Potomac River. Waterfowl and deer."},
    {"name": "Talbot", "region": "Eastern Shore", "sunday": True, "antler": "No restrictions", "notes": "Upper Eastern Shore. Chesapeake Bay area. Waterfowl habitat."},
    {"name": "Washington", "region": "Western", "sunday": True, "antler": "No restrictions", "notes": "Western Maryland. Potomac area. Appalachian terrain."},
    {"name": "Wicomico", "region": "Eastern Shore", "sunday": True, "antler": "No restrictions", "notes": "Lower Eastern Shore. Mixed habitat. Good hunting."},
    {"name": "Worcester", "region": "Eastern Shore", "sunday": True, "antler": "No restrictions", "notes": "Lower Eastern Shore. Coastal area. Waterfowl emphasis."},
]

BAG_LIMITS = [
    {"species": "White-tailed Deer", "weapon": "Any", "type": "season", "qty": 2, "period": "calendar year", "notes": "Antlered deer: Maximum 2 per calendar year."},
    {"species": "White-tailed Deer", "weapon": "Any", "type": "season", "qty": 5, "period": "calendar year", "notes": "Antlerless deer: 5 per calendar year (varies by county). Check specific county bag limits."},
    {"species": "White-tailed Deer", "weapon": "Muzzleloader", "type": "season", "qty": 1, "period": "calendar year", "notes": "Antlered limit for muzzleloader hunters: 1 per calendar year combined (fall + winter seasons)."},
    {"species": "Wild Turkey", "weapon": "Shotgun or Bow", "type": "season", "qty": 1, "period": "spring season", "notes": "Spring season: 1 bearded turkey. Bearded birds only in spring."},
    {"species": "Wild Turkey", "weapon": "Any", "type": "season", "qty": 2, "period": "fall and winter combined", "notes": "Fall/winter combined: 2 turkeys of either sex."},
    {"species": "Waterfowl (Ducks)", "weapon": "Shotgun", "type": "daily", "qty": 6, "period": "per day", "notes": "Daily bag limit. Species-specific limits within aggregate. Federal migratory bird rules apply."},
    {"species": "Waterfowl (Geese)", "weapon": "Shotgun", "type": "daily", "qty": 5, "period": "per day", "notes": "Daily goose bag limit. Requires federal duck stamp and HIP registration."},
    {"species": "Rabbit", "weapon": "Shotgun or Rifle", "type": "daily", "qty": 4, "period": "per day", "notes": "4 per day, 8 in possession. Eastern cottontail and marsh rabbit."},
    {"species": "Squirrel", "weapon": "Shotgun or Rifle", "type": "daily", "qty": 6, "period": "per day", "notes": "6 per day, 12 in possession. Gray and fox squirrel."},
    {"species": "Black Bear", "weapon": "Rifle", "type": "season", "qty": 1, "period": "per season", "notes": "1 bear per season. Garrett and Allegany counties only. Lottery permit required."},
]

# General regulations knowledge
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
            "metadata": {
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
            "metadata": {
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
            "metadata": {
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
            "metadata": {
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
            "metadata": {},
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
                metadata=chunk_data["metadata"],
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
