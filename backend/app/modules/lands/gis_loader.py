"""
HuntPlan AI — GIS Data Loader

Downloads Maryland public land GIS data from:
- Maryland iMap ArcGIS REST API (data.imap.maryland.gov)
- USFWS federal refuge boundaries (gis-fws.opendata.arcgis.com)

Parses shapefiles/GeoJSON into structured data and loads into PostGIS database.
"""

import asyncio
import json
import logging
from typing import Optional, Dict, Any, List
from datetime import datetime

import httpx
import shapely.geometry as geom
from shapely.geometry import shape, mapping, MultiPolygon
from geoalchemy2.shape import from_shape

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.land import PublicLand
from app.models.regulation import State

logger = logging.getLogger(__name__)


class GISLoader:
    """Load public hunting land GIS data from remote APIs."""

    # Maryland iMap ArcGIS REST API endpoints (new server as of 2025)
    MD_PROTECTED_LANDS = "https://mdgeodata.md.gov/imap/rest/services/Environment/MD_ProtectedLands/FeatureServer"
    MD_FEDERAL_LANDS = "https://mdgeodata.md.gov/imap/rest/services/PlanningCadastre/MD_FederalLands/FeatureServer"

    # USFWS ArcGIS endpoint for federal refuges (backup)
    USFWS_BASE = "https://services.arcgis.com/QVENGdaPbd4LUkLV/ArcGIS/rest/services"
    USFWS_REFUGE_SERVICE = f"{USFWS_BASE}/FWSInterest_Simplified/FeatureServer"

    # Timeout for HTTP requests
    TIMEOUT = 60.0

    def __init__(self):
        """Initialize the GIS loader."""
        self.client: Optional[httpx.AsyncClient] = None

    async def __aenter__(self):
        """Context manager entry."""
        self.client = httpx.AsyncClient(timeout=self.TIMEOUT)
        return self

    async def __aexit__(self, exc_type, exc_val, exc_tb):
        """Context manager exit."""
        if self.client:
            await self.client.aclose()

    async def _fetch_geojson(self, url: str, params: Dict[str, Any]) -> Dict[str, Any]:
        """
        Fetch GeoJSON from an ArcGIS REST API endpoint.

        Args:
            url: API endpoint URL
            params: Query parameters (will add f=geojson, outSR, etc.)

        Returns:
            GeoJSON FeatureCollection as dict
        """
        if not self.client:
            raise RuntimeError("GISLoader must be used as async context manager")

        # Add standard ArcGIS parameters
        params.setdefault("f", "geojson")
        params.setdefault("outSR", "4326")  # WGS84
        params.setdefault("returnGeometry", "true")
        params.setdefault("outFields", "*")

        logger.debug(f"Fetching from {url} with params {params}")
        response = await self.client.get(url, params=params)
        response.raise_for_status()

        return response.json()

    async def load_maryland_wmas(self, db: AsyncSession, state_id: str) -> int:
        """
        Load Maryland Wildlife Management Areas (WMAs) from iMap.

        Args:
            db: Database session
            state_id: UUID of Maryland state record

        Returns:
            Count of WMAs loaded
        """
        logger.info("Loading Maryland Wildlife Management Areas...")

        # Query DNR Protected Lands Layer 0 for WMAs (DESIG='WMA')
        geojson = await self._fetch_geojson(
            f"{self.MD_PROTECTED_LANDS}/0/query",
            {"where": "DESIG='WMA'"},
        )

        # Aggregate multi-part WMAs by name
        wma_parts = {}
        for feature in geojson.get("features", []):
            props = feature.get("properties", {})
            geometry = feature.get("geometry")
            name = props.get("DNRName", "Unknown WMA")

            if not geometry:
                logger.warning(f"WMA feature has no geometry: {name}")
                continue

            shape_obj = shape(geometry)
            if name not in wma_parts:
                wma_parts[name] = {"shapes": [], "props": props}
            wma_parts[name]["shapes"].append(shape_obj)

        count = 0
        for name, data in wma_parts.items():
            props = data["props"]
            # Merge all parts into one MultiPolygon
            from shapely.ops import unary_union
            merged = unary_union(data["shapes"])
            multi = self._ensure_multipolygon(merged)
            if not multi:
                continue
            centroid = multi.centroid
            acreage = self._calculate_acreage(multi)

            land = PublicLand(
                state_id=state_id,
                name=name,
                land_type="wma",
                managing_agency="MD DNR",
                geometry=from_shape(multi, srid=4326),
                centroid_lat=centroid.y,
                centroid_lon=centroid.x,
                acreage=acreage,
                huntable_species=["deer", "turkey", "waterfowl"],
                county=props.get("County"),
                dnr_url=props.get("WebLink"),
                source="MD_ProtectedLands_WMA",
            )

            db.add(land)
            count += 1

            if count % 10 == 0:
                logger.debug(f"  Loaded {count} WMAs...")
                await db.flush()

        await db.flush()
        logger.info(f"Loaded {count} Maryland WMAs")
        return count

    async def load_maryland_state_forests(self, db: AsyncSession, state_id: str) -> int:
        """
        Load Maryland State Forests from iMap.

        Args:
            db: Database session
            state_id: UUID of Maryland state record

        Returns:
            Count of state forests loaded
        """
        logger.info("Loading Maryland State Forests...")

        # Query DNR Protected Lands for State Forests (DESIG='SF')
        geojson = await self._fetch_geojson(
            f"{self.MD_PROTECTED_LANDS}/0/query",
            {"where": "DESIG='SF'"},
        )

        # Aggregate multi-part forests by name
        forest_parts = {}
        for feature in geojson.get("features", []):
            props = feature.get("properties", {})
            geometry = feature.get("geometry")
            name = props.get("DNRName", "Unknown State Forest")

            if not geometry:
                logger.warning(f"State forest feature has no geometry: {name}")
                continue

            shape_obj = shape(geometry)
            if name not in forest_parts:
                forest_parts[name] = {"shapes": [], "props": props}
            forest_parts[name]["shapes"].append(shape_obj)

        count = 0
        for name, data in forest_parts.items():
            props = data["props"]
            from shapely.ops import unary_union
            merged = unary_union(data["shapes"])
            multi = self._ensure_multipolygon(merged)
            if not multi:
                continue
            centroid = multi.centroid
            acreage = self._calculate_acreage(multi)

            land = PublicLand(
                state_id=state_id,
                name=name,
                land_type="state_forest",
                managing_agency="MD DNR",
                geometry=from_shape(multi, srid=4326),
                centroid_lat=centroid.y,
                centroid_lon=centroid.x,
                acreage=acreage,
                huntable_species=["deer", "turkey", "small_game"],
                county=props.get("County"),
                dnr_url=props.get("WebLink"),
                source="MD_ProtectedLands_SF",
            )

            db.add(land)
            count += 1

        await db.flush()
        logger.info(f"Loaded {count} Maryland State Forests")
        return count

    async def load_usfws_refuges_maryland(self, db: AsyncSession, state_id: str) -> int:
        """
        Load USFWS National Wildlife Refuges that intersect Maryland.

        Args:
            db: Database session
            state_id: UUID of Maryland state record

        Returns:
            Count of refuges loaded
        """
        logger.info("Loading Federal Lands in Maryland...")

        # Use MD Protected Lands Layer 8 (Protected Federal Lands)
        geojson = await self._fetch_geojson(
            f"{self.MD_PROTECTED_LANDS}/8/query",
            {"where": "1=1"},
        )

        # Aggregate by name
        fed_parts = {}
        for feature in geojson.get("features", []):
            props = feature.get("properties", {})
            geometry = feature.get("geometry")
            name = props.get("NAME") or props.get("OWNEDBY") or "Unknown Federal Land"

            if not geometry:
                continue

            shape_obj = shape(geometry)
            if name not in fed_parts:
                fed_parts[name] = {"shapes": [], "props": props}
            fed_parts[name]["shapes"].append(shape_obj)

        count = 0
        for name, data in fed_parts.items():
            props = data["props"]
            from shapely.ops import unary_union
            merged = unary_union(data["shapes"])
            multi = self._ensure_multipolygon(merged)
            if not multi:
                continue
            centroid = multi.centroid
            acreage = self._calculate_acreage(multi)

            land = PublicLand(
                state_id=state_id,
                name=name,
                land_type="federal_land",
                managing_agency=props.get("OWNEDBY", "Federal"),
                geometry=from_shape(multi, srid=4326),
                centroid_lat=centroid.y,
                centroid_lon=centroid.x,
                acreage=acreage,
                huntable_species=["waterfowl", "small_game"],
                county=props.get("County"),
                special_regulations="Check federal land hunting regulations; restrictions may apply.",
                source="MD_ProtectedLands_Federal",
            )

            db.add(land)
            count += 1

        await db.flush()
        logger.info(f"Loaded {count} Federal Lands")
        return count

    async def load_all_maryland_public_lands(self, db: AsyncSession) -> Dict[str, int]:
        """
        Load all Maryland public hunting lands.

        Args:
            db: Database session

        Returns:
            Dictionary with counts of each land type
        """
        # Get or create Maryland state record
        result = await db.execute(select(State).where(State.code == "MD"))
        state = result.scalar_one_or_none()

        if not state:
            logger.error("Maryland state record not found in database")
            raise ValueError("Maryland state must be seeded first. Run: python -m scripts.seed_maryland")

        state_id = state.id

        counts = {}

        # Load each land type
        counts["wma"] = await self.load_maryland_wmas(db, state_id)
        counts["state_forest"] = await self.load_maryland_state_forests(db, state_id)
        counts["federal_refuge"] = await self.load_usfws_refuges_maryland(db, state_id)

        return counts

    @staticmethod
    def _ensure_multipolygon(shape_obj):
        """Convert Polygon to MultiPolygon if needed (PostGIS column expects MULTIPOLYGON)."""
        if shape_obj.geom_type == "Polygon":
            return MultiPolygon([shape_obj])
        elif shape_obj.geom_type == "MultiPolygon":
            return shape_obj
        else:
            logger.warning(f"Unexpected geometry type: {shape_obj.geom_type}")
            return None

    @staticmethod
    def _calculate_acreage(shape_obj: geom.base.BaseGeometry) -> float:
        """
        Calculate acreage from a Shapely geometry (polygon/multipolygon).

        Uses an approximate conversion: 1 degree ≈ 69 miles ≈ 111 km.
        For more precision, would need to project to a local UTM zone.

        Args:
            shape_obj: Shapely geometry object

        Returns:
            Estimated acreage
        """
        # Get bounds to estimate latitude for area calculation
        bounds = shape_obj.bounds
        lat = (bounds[1] + bounds[3]) / 2  # Average latitude

        # Rough conversion: 1 degree of latitude ≈ 69 miles
        # At Maryland's latitude (~39°), 1 degree of longitude ≈ 52 miles
        lat_miles_per_degree = 69
        lon_miles_per_degree = 69 * abs(__import__("math").cos(__import__("math").radians(lat)))

        # Project area from degrees to square miles
        area_degrees = shape_obj.area
        # Very rough: assume area in degrees², convert to miles²
        area_sq_miles = area_degrees * (lat_miles_per_degree / 1.0) ** 2

        # Convert square miles to acres (1 sq mile = 640 acres)
        acreage = area_sq_miles * 640

        return max(acreage, 0.1)  # Ensure positive value


async def load_gis_data(db: AsyncSession, state_code: str = "MD") -> Dict[str, int]:
    """
    Load GIS data for a state (currently only Maryland supported).

    Args:
        db: Database session
        state_code: State code (e.g., "MD")

    Returns:
        Dictionary with counts of loaded features
    """
    if state_code != "MD":
        raise ValueError(f"Only Maryland (MD) is currently supported; got {state_code}")

    async with GISLoader() as loader:
        counts = await loader.load_all_maryland_public_lands(db)

    return counts
