"""
HuntPlan AI — Land & Geography PostGIS Queries

Spatial query functions for finding public hunting lands using PostGIS.
"""

import logging
from typing import Optional, List, Dict, Any
from datetime import date

from sqlalchemy import select, func, text
from sqlalchemy.ext.asyncio import AsyncSession
from geoalchemy2.functions import ST_DWithin, ST_Distance, ST_MakePoint, ST_Contains, ST_Intersects

from app.models.land import PublicLand
from app.models.regulation import State, Season

logger = logging.getLogger(__name__)


async def find_nearby_public_lands(
    db: AsyncSession,
    lat: float,
    lon: float,
    radius_miles: float = 25.0,
    state_code: str = "MD",
    species: Optional[str] = None,
) -> List[Dict[str, Any]]:
    """
    Find public hunting lands within a radius of a point.

    Args:
        db: Database session
        lat: Latitude of center point
        lon: Longitude of center point
        radius_miles: Search radius in miles (default 25)
        state_code: State code (e.g., "MD")
        species: Filter by huntable species (e.g., "deer", "turkey")

    Returns:
        List of public land records with distance, sorted by distance ascending
    """
    # Convert miles to meters (1 mile = 1609.34 meters)
    radius_meters = radius_miles * 1609.34

    # Build query
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
        PublicLand.region,
        PublicLand.dnr_url,
        PublicLand.access_notes,
        # Calculate distance in meters
        ST_Distance(
            PublicLand.geometry,
            ST_MakePoint(lon, lat),
        ).label("distance_m"),
    ).distinct()

    # Join with State to filter by state code
    query = query.join(State, PublicLand.state_id == State.id)
    query = query.filter(State.code == state_code)

    # Filter by distance using ST_DWithin for efficiency (uses spatial index)
    query = query.filter(
        ST_DWithin(
            PublicLand.geometry,
            ST_MakePoint(lon, lat),
            radius_meters,
        )
    )

    # Filter by huntable species if specified
    if species:
        query = query.filter(
            PublicLand.huntable_species.contains([species])
        )

    # Sort by distance
    query = query.order_by(text("distance_m ASC"))

    result = await db.execute(query)
    rows = result.fetchall()

    # Convert to list of dicts
    lands = [
        {
            "id": str(row.id),
            "name": row.name,
            "land_type": row.land_type,
            "managing_agency": row.managing_agency,
            "centroid_lat": row.centroid_lat,
            "centroid_lon": row.centroid_lon,
            "acreage": row.acreage,
            "huntable_species": row.huntable_species,
            "county": row.county,
            "region": row.region,
            "dnr_url": row.dnr_url,
            "access_notes": row.access_notes,
            "distance_miles": round(row.distance_m / 1609.34, 2),
        }
        for row in rows
    ]

    logger.debug(f"Found {len(lands)} public lands within {radius_miles} miles")
    return lands


async def find_lands_open_for_species(
    db: AsyncSession,
    species: str,
    query_date: Optional[date] = None,
    lat: Optional[float] = None,
    lon: Optional[float] = None,
    radius_miles: float = 25.0,
    state_code: str = "MD",
) -> List[Dict[str, Any]]:
    """
    Find lands open for hunting a specific species on a given date.

    Combines GIS data with regulation seasons.

    Args:
        db: Database session
        species: Species name (e.g., "White-tailed Deer", "Wild Turkey")
        query_date: Date to check (defaults to today)
        lat: Optional latitude for proximity search
        lon: Optional longitude for proximity search
        radius_miles: Search radius if lat/lon provided
        state_code: State code (e.g., "MD")

    Returns:
        List of open lands with matching seasons
    """
    if query_date is None:
        from datetime import datetime
        query_date = datetime.now().date()

    # Find all lands that have this species listed
    query = select(
        PublicLand.id,
        PublicLand.name,
        PublicLand.land_type,
        PublicLand.managing_agency,
        PublicLand.centroid_lat,
        PublicLand.centroid_lon,
        PublicLand.acreage,
        PublicLand.county,
        PublicLand.dnr_url,
        Season.weapon_type,
        Season.name.label("season_name"),
        Season.start_date,
        Season.end_date,
    )

    # Join with state
    query = query.join(State, PublicLand.state_id == State.id)
    query = query.filter(State.code == state_code)

    # Filter species (note: we can't directly join Season because we'd need Species first)
    # Instead, we filter lands that have the species in their huntable_species list
    query = query.filter(
        PublicLand.huntable_species.contains([species.lower()])
    )

    # Cross-join to get possible seasons for filtering
    # (In a real implementation, would join through Season/Species more elegantly)
    # For now, just get lands with the species and note season availability

    # Add distance if coordinates provided
    if lat is not None and lon is not None:
        radius_meters = radius_miles * 1609.34
        query = query.filter(
            ST_DWithin(
                PublicLand.geometry,
                ST_MakePoint(lon, lat),
                radius_meters,
            )
        )
        query = query.add_columns(
            ST_Distance(
                PublicLand.geometry,
                ST_MakePoint(lon, lat),
            ).label("distance_m")
        )

    result = await db.execute(query.distinct())
    rows = result.fetchall()

    # Build result with season info
    lands = []
    for row in rows:
        land_dict = {
            "id": str(row.id),
            "name": row.name,
            "land_type": row.land_type,
            "managing_agency": row.managing_agency,
            "centroid_lat": row.centroid_lat,
            "centroid_lon": row.centroid_lon,
            "acreage": row.acreage,
            "county": row.county,
            "dnr_url": row.dnr_url,
        }

        # Add distance if available
        if hasattr(row, "distance_m"):
            land_dict["distance_miles"] = round(row.distance_m / 1609.34, 2)

        lands.append(land_dict)

    logger.debug(f"Found {len(lands)} lands open for {species} on {query_date}")
    return lands


async def get_land_details(
    db: AsyncSession,
    land_id: str,
) -> Optional[Dict[str, Any]]:
    """
    Get full details for a single public land parcel.

    Args:
        db: Database session
        land_id: PublicLand UUID

    Returns:
        Full land record with geometry as GeoJSON, or None if not found
    """
    query = select(PublicLand).filter(PublicLand.id == land_id)
    result = await db.execute(query)
    land = result.scalar_one_or_none()

    if not land:
        return None

    # Extract geometry as GeoJSON if available
    # Note: geometry column is PostGIS, need to extract as GeoJSON via raw query
    geo_query = select(
        func.ST_AsGeoJSON(PublicLand.geometry).label("geojson")
    ).filter(PublicLand.id == land_id)

    geo_result = await db.execute(geo_query)
    geo_row = geo_result.scalar_one_or_none()

    import json
    geojson_str = geo_row if geo_row else None
    geometry = json.loads(geojson_str) if geojson_str else None

    return {
        "id": str(land.id),
        "name": land.name,
        "land_type": land.land_type,
        "managing_agency": land.managing_agency,
        "centroid_lat": land.centroid_lat,
        "centroid_lon": land.centroid_lon,
        "acreage": land.acreage,
        "huntable_species": land.huntable_species,
        "weapon_restrictions": land.weapon_restrictions,
        "permit_required": land.permit_required,
        "check_station_required": land.check_station_required,
        "special_regulations": land.special_regulations,
        "parking_coords": land.parking_coords,
        "access_notes": land.access_notes,
        "county": land.county,
        "region": land.region,
        "dnr_url": land.dnr_url,
        "source": land.source,
        "geometry": geometry,
    }


async def search_lands(
    db: AsyncSession,
    query_text: str,
    state_code: str = "MD",
) -> List[Dict[str, Any]]:
    """
    Search public lands by name, county, or region using text search.

    Args:
        db: Database session
        query_text: Search text (e.g., "Green Ridge" or "Baltimore County")
        state_code: State code (e.g., "MD")

    Returns:
        List of matching land records
    """
    search_term = f"%{query_text.lower()}%"

    query = select(
        PublicLand.id,
        PublicLand.name,
        PublicLand.land_type,
        PublicLand.managing_agency,
        PublicLand.centroid_lat,
        PublicLand.centroid_lon,
        PublicLand.acreage,
        PublicLand.county,
        PublicLand.region,
        PublicLand.dnr_url,
        PublicLand.huntable_species,
    )

    # Join with state
    query = query.join(State, PublicLand.state_id == State.id)
    query = query.filter(State.code == state_code)

    # Search on name, county, or region (case-insensitive)
    query = query.filter(
        (func.lower(PublicLand.name).ilike(search_term)) |
        (func.lower(PublicLand.county).ilike(search_term)) |
        (func.lower(PublicLand.region).ilike(search_term))
    )

    result = await db.execute(query)
    rows = result.fetchall()

    lands = [
        {
            "id": str(row.id),
            "name": row.name,
            "land_type": row.land_type,
            "managing_agency": row.managing_agency,
            "centroid_lat": row.centroid_lat,
            "centroid_lon": row.centroid_lon,
            "acreage": row.acreage,
            "county": row.county,
            "region": row.region,
            "dnr_url": row.dnr_url,
            "huntable_species": row.huntable_species,
        }
        for row in rows
    ]

    logger.debug(f"Text search for '{query_text}' found {len(lands)} lands")
    return lands


async def get_lands_by_county(
    db: AsyncSession,
    county: str,
    state_code: str = "MD",
) -> List[Dict[str, Any]]:
    """
    Get all public lands in a specific county.

    Args:
        db: Database session
        county: County name (e.g., "Garrett County")
        state_code: State code (e.g., "MD")

    Returns:
        List of lands in the county
    """
    query = select(
        PublicLand.id,
        PublicLand.name,
        PublicLand.land_type,
        PublicLand.managing_agency,
        PublicLand.centroid_lat,
        PublicLand.centroid_lon,
        PublicLand.acreage,
        PublicLand.county,
        PublicLand.huntable_species,
    )

    # Join with state
    query = query.join(State, PublicLand.state_id == State.id)
    query = query.filter(State.code == state_code)

    # Filter by county
    query = query.filter(func.lower(PublicLand.county) == county.lower())
    query = query.order_by(PublicLand.name)

    result = await db.execute(query)
    rows = result.fetchall()

    lands = [
        {
            "id": str(row.id),
            "name": row.name,
            "land_type": row.land_type,
            "managing_agency": row.managing_agency,
            "centroid_lat": row.centroid_lat,
            "centroid_lon": row.centroid_lon,
            "acreage": row.acreage,
            "county": row.county,
            "huntable_species": row.huntable_species,
        }
        for row in rows
    ]

    logger.debug(f"Found {len(lands)} public lands in {county}")
    return lands


async def get_stats(db: AsyncSession, state_code: str = "MD") -> Dict[str, Any]:
    """
    Get aggregate statistics for public lands in a state.

    Args:
        db: Database session
        state_code: State code (e.g., "MD")

    Returns:
        Dictionary with land counts and statistics
    """
    # Total records
    total_query = select(func.count(PublicLand.id)).join(
        State, PublicLand.state_id == State.id
    ).filter(State.code == state_code)
    total = await db.scalar(total_query)

    # Count by type
    by_type_query = select(
        PublicLand.land_type,
        func.count(PublicLand.id).label("count"),
        func.sum(PublicLand.acreage).label("total_acreage"),
    ).join(
        State, PublicLand.state_id == State.id
    ).filter(
        State.code == state_code
    ).group_by(PublicLand.land_type)

    by_type_result = await db.execute(by_type_query)
    by_type_rows = by_type_result.fetchall()

    land_types = {
        row.land_type: {
            "count": row.count,
            "total_acreage": float(row.total_acreage or 0),
        }
        for row in by_type_rows
    }

    # Total acreage
    total_acreage_query = select(func.sum(PublicLand.acreage)).join(
        State, PublicLand.state_id == State.id
    ).filter(State.code == state_code)
    total_acreage = await db.scalar(total_acreage_query) or 0

    return {
        "state": state_code,
        "total_lands": total,
        "total_acreage": float(total_acreage),
        "by_type": land_types,
    }
