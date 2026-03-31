"""
HuntPlan AI — Regulations API Routes

Endpoints for querying hunting regulations, seasons, bag limits, and species.
"""

from datetime import date
from typing import Optional

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.database import get_db
from app.modules.regulations import queries

router = APIRouter()

DISCLAIMER = "Always verify with your state DNR before hunting. This is not legal advice."


@router.get("/seasons")
async def get_open_seasons(
    state: str = Query("MD", description="Two-letter state code"),
    date_str: str = Query(None, alias="date", description="Query date (YYYY-MM-DD). Defaults to today."),
    species: Optional[str] = Query(None, description="Species name filter (e.g., 'deer', 'turkey')"),
    weapon: Optional[str] = Query(None, description="Weapon type filter (e.g., 'bow', 'firearm', 'muzzleloader')"),
    county: Optional[str] = Query(None, description="County name for Sunday hunting check"),
    db: AsyncSession = Depends(get_db),
):
    """
    Get all hunting seasons open on a given date.

    Example: `/api/v1/regulations/seasons?state=MD&date=2026-04-19&species=turkey`
    """
    query_date = date.fromisoformat(date_str) if date_str else date.today()

    seasons = await queries.get_open_seasons(
        db, state, query_date, species, weapon, county
    )

    return {
        "query": {
            "state": state,
            "date": query_date.isoformat(),
            "species": species,
            "weapon": weapon,
            "county": county,
        },
        "count": len(seasons),
        "seasons": seasons,
        "disclaimer": DISCLAIMER,
    }


@router.get("/can-i-hunt")
async def can_i_hunt(
    species: str = Query(..., description="Species to hunt (e.g., 'White-tailed Deer', 'turkey')"),
    state: str = Query("MD", description="Two-letter state code"),
    date_str: str = Query(None, alias="date", description="Date to hunt (YYYY-MM-DD). Defaults to today."),
    weapon: Optional[str] = Query(None, description="Weapon type (bow, firearm, muzzleloader, shotgun)"),
    county: Optional[str] = Query(None, description="County name"),
    db: AsyncSession = Depends(get_db),
):
    """
    The core question: "Can I hunt [species] on [date] with [weapon] in [county]?"

    Returns a structured yes/no answer with legal citations.

    Example: `/api/v1/regulations/can-i-hunt?species=turkey&date=2026-04-19&weapon=shotgun&county=Frederick`
    """
    query_date = date.fromisoformat(date_str) if date_str else date.today()

    result = await queries.can_i_hunt(
        db, state, species, query_date, weapon, county
    )

    return result


@router.get("/bag-limits")
async def get_bag_limits(
    species: str = Query(..., description="Species name"),
    state: str = Query("MD", description="Two-letter state code"),
    season_type: Optional[str] = Query(None, description="Season type (archery, firearms, muzzleloader)"),
    region: Optional[str] = Query(None, description="Region (A, B) or county name"),
    db: AsyncSession = Depends(get_db),
):
    """
    Get bag limits for a species.

    Example: `/api/v1/regulations/bag-limits?species=deer&region=B`
    """
    limits = await queries.get_bag_limits(db, state, species, season_type, region)

    return {
        "query": {"state": state, "species": species, "season_type": season_type, "region": region},
        "count": len(limits),
        "bag_limits": limits,
        "disclaimer": DISCLAIMER,
    }


@router.get("/species")
async def list_species(
    state: str = Query("MD", description="Two-letter state code"),
    db: AsyncSession = Depends(get_db),
):
    """List all huntable species for a state."""
    species = await queries.get_all_species(db, state)

    return {
        "state": state,
        "count": len(species),
        "species": species,
    }


@router.get("/sunday-hunting")
async def get_sunday_hunting(
    state: str = Query("MD", description="Two-letter state code"),
    county: Optional[str] = Query(None, description="County name"),
    db: AsyncSession = Depends(get_db),
):
    """
    Get Sunday hunting rules by county.

    Example: `/api/v1/regulations/sunday-hunting?county=Frederick`
    """
    info = await queries.get_sunday_hunting_info(db, state, county)

    return {
        "state": state,
        "county_filter": county,
        "count": len(info),
        "counties": info,
        "disclaimer": DISCLAIMER,
    }
