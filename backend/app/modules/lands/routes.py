"""
Land & Map Engine Router

Handles queries for nearby hunting lands, properties, WMAs, and map-related operations.
Integrates with Mapbox and land parcel databases.
"""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.db.database import get_db
from app.models.land import PublicLand
from app.modules.lands.queries import (
    find_nearby_public_lands,
    find_lands_open_for_species,
    get_land_details,
    search_lands,
    get_lands_by_county,
    get_stats,
)

router = APIRouter()


@router.get("")
@router.get("/")
async def get_all_lands(
    limit: int = 10,
    offset: int = 0,
    state: str = "MD",
    db: AsyncSession = Depends(get_db),
):
    """Get paginated list of public lands."""
    try:
        # Simple pagination query
        query = select(
            PublicLand.id,
            PublicLand.name,
            PublicLand.land_type,
            PublicLand.managing_agency,
            PublicLand.centroid_lat,
            PublicLand.centroid_lon,
            PublicLand.acreage,
            PublicLand.huntable_species,
            PublicLand.county,
        ).limit(limit).offset(offset)
        
        result = await db.execute(query)
        rows = result.fetchall()
        
        lands = [
            {
                "id": row[0],
                "name": row[1],
                "land_type": row[2],
                "managing_agency": row[3],
                "centroid_lat": row[4],
                "centroid_lon": row[5],
                "acreage": row[6],
                "huntable_species": row[7],
                "county": row[8],
            }
            for row in rows
        ]
        
        return {
            "status": "success",
            "state": state,
            "limit": limit,
            "offset": offset,
            "lands": lands,
            "count": len(lands),
        }
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error fetching lands: {str(e)}"
        )


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


@router.get("/gis/boundaries")
async def get_gis_boundaries():
    """
    Serve the full GeoJSON boundaries file.
    Mobile fetches this once and caches locally.
    Returns the raw GeoJSON FeatureCollection.

    Endpoint: GET /api/v1/lands/gis/boundaries
    Response: GeoJSON FeatureCollection with 124 Maryland public land boundaries
    Cache-Control: public, max-age=604800 (7 days)

    Note: This endpoint must come BEFORE the {land_id} catch-all route below.
    """
    from pathlib import Path
    from fastapi.responses import Response
    from app.config import settings

    gis_path = Path(settings.data_dir) / "mdGISData.json"
    if not gis_path.exists():
        raise HTTPException(status_code=404, detail="GIS data not found")

    # Read and return as JSON response with cache headers
    data = gis_path.read_bytes()
    return Response(
        content=data,
        media_type="application/geo+json",
        headers={
            "Cache-Control": "public, max-age=604800",  # 7 days
            "Content-Encoding": "identity",
        }
    )


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
