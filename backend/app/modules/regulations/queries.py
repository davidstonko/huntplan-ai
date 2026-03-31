"""
HuntPlan AI — Regulation Query Engine

Answers structured questions about hunting regulations:
- "Can I hunt X on Y date with Z weapon?"
- "What seasons are open right now?"
- "What are the bag limits for deer in Region B?"

Works both online (PostgreSQL) and can be exported for offline (JSON).
"""

from datetime import date, datetime
from typing import Optional
from sqlalchemy import select, and_
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.regulation import State, Species, Season, BagLimit, County


async def get_open_seasons(
    db: AsyncSession,
    state_code: str,
    query_date: date,
    species_name: Optional[str] = None,
    weapon_type: Optional[str] = None,
    county: Optional[str] = None,
) -> list[dict]:
    """
    Find all hunting seasons open on a given date.

    Args:
        db: Database session
        state_code: Two-letter state code (e.g., "MD")
        query_date: The date to check
        species_name: Optional filter by species (e.g., "White-tailed Deer")
        weapon_type: Optional filter by weapon (e.g., "bow", "firearm")
        county: Optional county name for Sunday hunting check

    Returns:
        List of season dicts with full details
    """
    # Build query
    stmt = (
        select(Season, Species)
        .join(Species, Season.species_id == Species.id)
        .join(State, Season.state_id == State.id)
        .where(
            and_(
                State.code == state_code,
                Season.start_date <= query_date,
                Season.end_date >= query_date,
            )
        )
    )

    if species_name:
        stmt = stmt.where(Species.name.ilike(f"%{species_name}%"))
    if weapon_type:
        stmt = stmt.where(Season.weapon_type == weapon_type)

    result = await db.execute(stmt)
    rows = result.all()

    seasons = []
    for season, species in rows:
        season_dict = {
            "season_id": str(season.id),
            "season_name": season.name,
            "species": species.name,
            "species_category": species.category,
            "weapon_type": season.weapon_type,
            "start_date": season.start_date.isoformat(),
            "end_date": season.end_date.isoformat(),
            "region": season.region,
            "sex_restrictions": season.sex_restrictions,
            "antler_restrictions": season.antler_restrictions,
            "shooting_hours": f"{season.shooting_hours_start} to {season.shooting_hours_end}",
            "sunday_allowed": season.sunday_allowed,
            "permit_required": season.permit_required,
            "special_conditions": season.special_conditions,
            "source_url": season.source_url,
        }

        # Check Sunday hunting if querying for a Sunday
        if query_date.weekday() == 6:  # Sunday
            season_dict["is_sunday"] = True
            if not season.sunday_allowed:
                season_dict["sunday_warning"] = "This season is NOT open on Sundays."

        seasons.append(season_dict)

    return seasons


async def can_i_hunt(
    db: AsyncSession,
    state_code: str,
    species_name: str,
    query_date: date,
    weapon_type: Optional[str] = None,
    county: Optional[str] = None,
) -> dict:
    """
    The core query: "Can I hunt [species] on [date] with [weapon] in [county]?"

    Returns a structured answer with legal citations.
    """
    is_sunday = query_date.weekday() == 6

    # Find matching open seasons
    open_seasons = await get_open_seasons(
        db, state_code, query_date, species_name, weapon_type, county
    )

    if not open_seasons:
        return {
            "answer": False,
            "reason": f"No {species_name} season is open on {query_date.isoformat()} for the specified criteria.",
            "seasons": [],
            "disclaimer": "Always verify with MD DNR before hunting. This is not legal advice.",
        }

    # Check Sunday restrictions
    sunday_blocked = []
    sunday_open = []
    for s in open_seasons:
        if is_sunday and not s.get("sunday_allowed", True):
            sunday_blocked.append(s)
        else:
            sunday_open.append(s)

    if is_sunday and not sunday_open:
        return {
            "answer": False,
            "reason": f"{species_name} season is open but Sunday hunting is not allowed for these seasons.",
            "seasons": sunday_blocked,
            "sunday_note": "Check county-specific Sunday hunting rules — some counties allow Sunday hunting on private land.",
            "disclaimer": "Always verify with MD DNR before hunting. This is not legal advice.",
        }

    return {
        "answer": True,
        "reason": f"Yes, you can hunt {species_name} on {query_date.isoformat()}.",
        "seasons": sunday_open if is_sunday else open_seasons,
        "is_sunday": is_sunday,
        "county_note": f"County: {county}" if county else "Check county-specific Sunday rules.",
        "disclaimer": "Always verify with MD DNR before hunting. This is not legal advice.",
    }


async def get_bag_limits(
    db: AsyncSession,
    state_code: str,
    species_name: str,
    season_type: Optional[str] = None,
    region: Optional[str] = None,
) -> list[dict]:
    """Get bag limits for a species."""
    stmt = (
        select(BagLimit, Species)
        .join(Species, BagLimit.species_id == Species.id)
        .join(State, BagLimit.state_id == State.id)
        .where(
            and_(
                State.code == state_code,
                Species.name.ilike(f"%{species_name}%"),
            )
        )
    )

    if season_type:
        stmt = stmt.where(BagLimit.season_type == season_type)
    if region:
        stmt = stmt.where(BagLimit.region.ilike(f"%{region}%"))

    result = await db.execute(stmt)
    rows = result.all()

    return [
        {
            "species": species.name,
            "season_type": bl.season_type,
            "region": bl.region,
            "daily_limit": bl.daily_limit,
            "season_limit": bl.season_limit,
            "possession_limit": bl.possession_limit,
            "sex_specific": bl.sex_specific,
            "notes": bl.notes,
            "source_url": bl.source_url,
        }
        for bl, species in rows
    ]


async def get_all_species(db: AsyncSession, state_code: str) -> list[dict]:
    """List all huntable species for a state."""
    stmt = (
        select(Species)
        .join(State, Species.state_id == State.id)
        .where(State.code == state_code)
        .order_by(Species.category, Species.name)
    )
    result = await db.execute(stmt)
    species_list = result.scalars().all()

    return [
        {
            "id": str(s.id),
            "name": s.name,
            "category": s.category,
            "description": s.description,
        }
        for s in species_list
    ]


async def get_sunday_hunting_info(
    db: AsyncSession,
    state_code: str,
    county_name: Optional[str] = None,
) -> list[dict]:
    """Get Sunday hunting rules, optionally filtered by county."""
    stmt = (
        select(County)
        .join(State, County.state_id == State.id)
        .where(State.code == state_code)
    )
    if county_name:
        stmt = stmt.where(County.name.ilike(f"%{county_name}%"))

    result = await db.execute(stmt)
    counties = result.scalars().all()

    return [
        {
            "county": c.name,
            "sunday_hunting_allowed": c.sunday_hunting_allowed,
            "notes": c.sunday_hunting_notes,
        }
        for c in counties
    ]
