"""
HuntPlan AI — State Data Pack Builder

Packages all GIS and regulation data into downloadable bundles for offline use.
Each state pack includes:
- regulations.json — all hunting seasons, bag limits, licenses
- lands.geojson — all public hunting lands with geometry
- manifest.json — metadata, versions, record counts
"""

import json
import logging
import os
from datetime import datetime
from pathlib import Path
from typing import Dict, Any, Optional

from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.land import PublicLand
from app.models.regulation import (
    State, Species, Season, BagLimit, WeaponRestriction, LicenseRequirement, County,
)
from app.config import settings

logger = logging.getLogger(__name__)


class DataPackBuilder:
    """Build offline data packs for states."""

    def __init__(self, state_code: str, output_dir: Optional[Path] = None):
        """
        Initialize the data pack builder.

        Args:
            state_code: State code (e.g., "MD")
            output_dir: Output directory (defaults to configured state_packs_dir)
        """
        self.state_code = state_code
        self.output_dir = Path(output_dir or settings.state_packs_dir)
        self.state_dir = self.output_dir / state_code.lower()
        self.state_dir.mkdir(parents=True, exist_ok=True)

    async def build_regulations_json(self, db: AsyncSession) -> Dict[str, Any]:
        """
        Extract all regulation data for a state into a structured format.

        Args:
            db: Database session

        Returns:
            Dictionary with all regulation data
        """
        logger.info(f"Building regulations for {self.state_code}...")

        # Fetch state
        state_result = await db.execute(
            select(State).filter(State.code == self.state_code)
        )
        state = state_result.scalar_one_or_none()
        if not state:
            raise ValueError(f"State {self.state_code} not found")

        # Fetch all related data
        species_result = await db.execute(
            select(Species).filter(Species.state_id == state.id)
        )
        species_list = species_result.scalars().all()

        seasons_result = await db.execute(
            select(Season).filter(Season.state_id == state.id)
        )
        seasons = seasons_result.scalars().all()

        bag_limits_result = await db.execute(
            select(BagLimit).filter(BagLimit.state_id == state.id)
        )
        bag_limits = bag_limits_result.scalars().all()

        weapon_restrictions_result = await db.execute(
            select(WeaponRestriction).filter(WeaponRestriction.state_id == state.id)
        )
        weapon_restrictions = weapon_restrictions_result.scalars().all()

        license_requirements_result = await db.execute(
            select(LicenseRequirement).filter(LicenseRequirement.state_id == state.id)
        )
        license_requirements = license_requirements_result.scalars().all()

        counties_result = await db.execute(
            select(County).filter(County.state_id == state.id)
        )
        counties = counties_result.scalars().all()

        # Build regulation data structure
        regulations = {
            "state": {
                "code": state.code,
                "name": state.name,
                "dnr_url": state.dnr_url,
                "regulation_year": state.regulation_year,
            },
            "species": [
                {
                    "id": str(sp.id),
                    "name": sp.name,
                    "category": sp.category,
                    "description": sp.description,
                }
                for sp in species_list
            ],
            "seasons": [
                {
                    "id": str(s.id),
                    "species_id": str(s.species_id),
                    "name": s.name,
                    "weapon_type": s.weapon_type,
                    "start_date": s.start_date.isoformat(),
                    "end_date": s.end_date.isoformat(),
                    "region": s.region,
                    "county_ids": s.county_ids,
                    "shooting_hours_start": s.shooting_hours_start,
                    "shooting_hours_end": s.shooting_hours_end,
                    "antler_restrictions": s.antler_restrictions,
                    "sex_restrictions": s.sex_restrictions,
                    "special_conditions": s.special_conditions,
                    "permit_required": s.permit_required,
                    "sunday_allowed": s.sunday_allowed,
                    "source_url": s.source_url,
                }
                for s in seasons
            ],
            "bag_limits": [
                {
                    "id": str(bl.id),
                    "species_id": str(bl.species_id),
                    "season_type": bl.season_type,
                    "region": bl.region,
                    "daily_limit": bl.daily_limit,
                    "season_limit": bl.season_limit,
                    "possession_limit": bl.possession_limit,
                    "sex_specific": bl.sex_specific,
                    "notes": bl.notes,
                    "source_url": bl.source_url,
                }
                for bl in bag_limits
            ],
            "weapon_restrictions": [
                {
                    "id": str(wr.id),
                    "weapon_type": wr.weapon_type,
                    "restriction": wr.restriction,
                    "species_category": wr.species_category,
                    "source_url": wr.source_url,
                }
                for wr in weapon_restrictions
            ],
            "license_requirements": [
                {
                    "id": str(lr.id),
                    "name": lr.name,
                    "license_type": lr.license_type,
                    "required_for": lr.required_for,
                    "resident_price": lr.resident_price,
                    "nonresident_price": lr.nonresident_price,
                    "notes": lr.notes,
                    "source_url": lr.source_url,
                }
                for lr in license_requirements
            ],
            "counties": [
                {
                    "id": str(c.id),
                    "name": c.name,
                    "fips_code": c.fips_code,
                    "sunday_hunting_allowed": c.sunday_hunting_allowed,
                    "sunday_hunting_notes": c.sunday_hunting_notes,
                }
                for c in counties
            ],
        }

        logger.info(
            f"  {len(species_list)} species, {len(seasons)} seasons, "
            f"{len(bag_limits)} bag limits, {len(weapon_restrictions)} weapon restrictions, "
            f"{len(license_requirements)} license requirements"
        )

        return regulations

    async def build_lands_geojson(self, db: AsyncSession) -> Dict[str, Any]:
        """
        Extract all public lands for a state as a GeoJSON FeatureCollection.

        Args:
            db: Database session

        Returns:
            GeoJSON FeatureCollection with all public lands
        """
        logger.info(f"Building lands GeoJSON for {self.state_code}...")

        # Fetch state
        state_result = await db.execute(
            select(State).filter(State.code == self.state_code)
        )
        state = state_result.scalar_one_or_none()
        if not state:
            raise ValueError(f"State {self.state_code} not found")

        # Fetch all public lands with geometry as GeoJSON
        lands_result = await db.execute(
            select(
                PublicLand.id,
                PublicLand.name,
                PublicLand.land_type,
                PublicLand.managing_agency,
                PublicLand.centroid_lat,
                PublicLand.centroid_lon,
                PublicLand.acreage,
                PublicLand.huntable_species,
                PublicLand.weapon_restrictions,
                PublicLand.permit_required,
                PublicLand.check_station_required,
                PublicLand.special_regulations,
                PublicLand.parking_coords,
                PublicLand.access_notes,
                PublicLand.county,
                PublicLand.region,
                PublicLand.dnr_url,
                PublicLand.source,
                func.ST_AsGeoJSON(PublicLand.geometry).label("geometry_json"),
            ).filter(PublicLand.state_id == state.id)
        )
        lands = lands_result.fetchall()

        features = []
        for land in lands:
            geometry = (
                json.loads(land.geometry_json) if land.geometry_json else None
            )

            feature = {
                "type": "Feature",
                "geometry": geometry,
                "properties": {
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
                },
            }
            features.append(feature)

        geojson = {
            "type": "FeatureCollection",
            "name": f"{self.state_code} Public Hunting Lands",
            "features": features,
        }

        logger.info(f"  {len(features)} public land parcels")
        return geojson

    async def build_manifest(
        self,
        db: AsyncSession,
        regulations: Dict[str, Any],
        lands: Dict[str, Any],
    ) -> Dict[str, Any]:
        """
        Build the manifest metadata file.

        Args:
            db: Database session
            regulations: Regulations data structure
            lands: Lands GeoJSON structure

        Returns:
            Manifest dictionary
        """
        # Get state record for version info
        state_result = await db.execute(
            select(State).filter(State.code == self.state_code)
        )
        state = state_result.scalar_one_or_none()

        # Count records
        land_count = await db.scalar(
            select(func.count(PublicLand.id)).filter(
                PublicLand.state_id == state.id
            )
        ) if state else 0

        species_count = len(regulations.get("species", []))
        seasons_count = len(regulations.get("seasons", []))
        bag_limits_count = len(regulations.get("bag_limits", []))

        manifest = {
            "version": state.data_pack_version or "1.0.0" if state else "1.0.0",
            "state": self.state_code,
            "state_name": state.name if state else "Unknown",
            "built_at": datetime.utcnow().isoformat() + "Z",
            "regulation_year": state.regulation_year if state else None,
            "records": {
                "public_lands": land_count,
                "species": species_count,
                "seasons": seasons_count,
                "bag_limits": bag_limits_count,
                "weapon_restrictions": len(regulations.get("weapon_restrictions", [])),
                "license_requirements": len(
                    regulations.get("license_requirements", [])
                ),
                "counties": len(regulations.get("counties", [])),
            },
            "files": {
                "regulations.json": {
                    "size_bytes": 0,  # Will update after writing
                    "records": species_count + seasons_count + bag_limits_count,
                },
                "lands.geojson": {
                    "size_bytes": 0,  # Will update after writing
                    "feature_count": len(lands.get("features", [])),
                },
                "manifest.json": {
                    "size_bytes": 0,  # Will update after writing
                },
            },
            "sources": {
                "regulations": "app/modules/regulations/md_seed_data.py",
                "lands": "MD iMap ArcGIS REST API, USFWS OpenData",
            },
        }

        return manifest

    async def write_pack(
        self,
        db: AsyncSession,
    ) -> Dict[str, str]:
        """
        Build and write the complete data pack to disk.

        Args:
            db: Database session

        Returns:
            Dictionary with paths of written files
        """
        logger.info(f"Building data pack for {self.state_code}...")

        # Build all components
        regulations = await self.build_regulations_json(db)
        lands = await self.build_lands_geojson(db)
        manifest = await self.build_manifest(db, regulations, lands)

        # Write files
        regulations_path = self.state_dir / "regulations.json"
        lands_path = self.state_dir / "lands.geojson"
        manifest_path = self.state_dir / "manifest.json"

        # Write regulations
        with open(regulations_path, "w") as f:
            json.dump(regulations, f, indent=2, default=str)
        reg_size = regulations_path.stat().st_size
        manifest["files"]["regulations.json"]["size_bytes"] = reg_size

        # Write lands
        with open(lands_path, "w") as f:
            json.dump(lands, f, indent=2, default=str)
        lands_size = lands_path.stat().st_size
        manifest["files"]["lands.geojson"]["size_bytes"] = lands_size

        # Write manifest
        with open(manifest_path, "w") as f:
            json.dump(manifest, f, indent=2, default=str)
        manifest_size = manifest_path.stat().st_size
        manifest["files"]["manifest.json"]["size_bytes"] = manifest_size

        # Update manifest with actual sizes
        with open(manifest_path, "w") as f:
            json.dump(manifest, f, indent=2, default=str)

        logger.info(f"Data pack written to {self.state_dir}")
        logger.info(
            f"  regulations.json: {reg_size / 1024 / 1024:.2f} MB"
        )
        logger.info(f"  lands.geojson: {lands_size / 1024 / 1024:.2f} MB")
        logger.info(f"  Total: {(reg_size + lands_size + manifest_size) / 1024 / 1024:.2f} MB")

        return {
            "regulations": str(regulations_path),
            "lands": str(lands_path),
            "manifest": str(manifest_path),
        }


async def build_state_pack(db: AsyncSession, state_code: str) -> Dict[str, str]:
    """
    Build and write a state data pack.

    Args:
        db: Database session
        state_code: State code (e.g., "MD")

    Returns:
        Dictionary with paths of written files
    """
    builder = DataPackBuilder(state_code)
    return await builder.write_pack(db)
