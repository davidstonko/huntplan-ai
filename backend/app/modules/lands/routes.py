"""
Land & Map Engine Router

Handles queries for nearby hunting lands, properties, WMAs, and map-related operations.
Integrates with Mapbox and land parcel databases.
"""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.database import get_db
from app.modules.lands.queries import (
    find_nearby_public_lands,
    find_lands_open_for_species,
    get_land_details,
    search_lands,
    get_lands_by_county,
    get_stats,
)

router = APIRouter()


@router.get("/nearby")
async def nearby_lands(
    latitude: float,
    longitude: float,
    radius_km: float = 25.0,
    state: str = "MD",
    species: str = None,
    db: AsyncSession = Depends(get_db),
):
    """Get nearby hunting lands within a specified radius."""
    radius_miles = radius_km / 1.60934
    lands = await find_nearby_public_lands(db, latitude, longitude, radius_miles, state, species)
    return {
        "status": "success",
        "query": {"latitude": latitude, "longitude": longitude, "radius_km": radius_km, "state": state, "species": species},
        "lands": lands,
        "count": len(lands),
    }


@router.get("/open-for-species")
async def lands_open_for_species(
    species: str,
    latitude: float = None,
    longitude: float = None,
    radius_km: float = 25.0,
    state: str = "MD",
    db: AsyncSession = Depends(get_db),
):
    """Find lands open for hunting a specific species."""
    radius_miles = radius_km / 1.60934 if radius_km else None
    lands = await find_lands_open_for_species(db, species, lat=latitude, lon=longitude, radius_miles=radius_miles, state_code=state)
    return {
        "status": "success",
        "query": {"species": species, "latitude": latitude, "longitude": longitude, "radius_km": radius_km, "state": state},
        "lands": lands,
        "count": len(lands),
    }


@router.get("/search")
async def search_public_lands(
    query: str,
    state: str = "MD",
    db: AsyncSession = Depends(get_db),
):
    """Search public lands by name, county, or region."""
    lands = await search_lands(db, query, state)
    return {
        "status": "success",
        "query": query,
        "state": state,
        "lands": lands,
        "count": len(lands),
    }


@router.get("/county/{county_name}")
async def lands_in_county(
    county_name: str,
    state: str = "MD",
    db: AsyncSession = Depends(get_db),
):
    """Get all public lands in a specific county."""
    lands = await get_lands_by_county(db, county_name, state)
    return {
        "status": "success",
        "county": county_name,
        "state": state,
        "lands": lands,
        "count": len(lands),
    }


@router.get("/stats/{state}")
async def lands_statistics(
    state: str = "MD",
    db: AsyncSession = Depends(get_db),
):
    """Get aggregate statistics for public lands in a state."""
    stats = await get_stats(db, state)
    return {"status": "success", "stats": stats}


# This must be LAST — catch-all {land_id} would match "search", "county", "stats" otherwise
@router.get("/{land_id}")
async def land_details(
    land_id: str,
    db: AsyncSession = Depends(get_db),
):
    """Get full details for a public land parcel, including geometry."""
    land = await get_land_details(db, land_id)
    if not land:
        raise HTTPException(status_code=404, detail="Land parcel not found")
    return {"status": "success", "land": land}
