"""
HuntPlan AI — Land & Geography Models

Public lands, private parcels, and terrain data with PostGIS geometry.
"""

import uuid
from typing import Optional

from sqlalchemy import String, Integer, Float, Boolean, Text, ForeignKey, Index
from sqlalchemy.dialects.postgresql import UUID, JSONB
from geoalchemy2 import Geometry
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.database import Base


class PublicLand(Base):
    """
    A public hunting land parcel — WMA, state forest, federal refuge, etc.
    Geometry stored as PostGIS polygon for spatial queries.
    """
    __tablename__ = "public_lands"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    state_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("states.id"), nullable=False)

    name: Mapped[str] = mapped_column(String(256), nullable=False)          # e.g. "Green Ridge State Forest"
    land_type: Mapped[str] = mapped_column(String(64), nullable=False)      # "wma", "state_forest", "state_park", "federal_refuge", "corps_land", "county"
    managing_agency: Mapped[Optional[str]] = mapped_column(String(128))     # e.g. "MD DNR", "USFWS"

    # Geometry — PostGIS polygon/multipolygon (SRID 4326 = WGS84 / GPS coordinates)
    geometry = mapped_column(Geometry("MULTIPOLYGON", srid=4326), nullable=True)
    centroid_lat: Mapped[Optional[float]] = mapped_column(Float)
    centroid_lon: Mapped[Optional[float]] = mapped_column(Float)
    acreage: Mapped[Optional[float]] = mapped_column(Float)

    # Hunting attributes
    huntable_species: Mapped[Optional[list]] = mapped_column(JSONB)         # ["deer", "turkey", "waterfowl"]
    weapon_restrictions: Mapped[Optional[str]] = mapped_column(Text)        # e.g. "Archery only", "Shotgun only"
    permit_required: Mapped[bool] = mapped_column(Boolean, default=False)
    check_station_required: Mapped[bool] = mapped_column(Boolean, default=False)
    special_regulations: Mapped[Optional[str]] = mapped_column(Text)

    # Access
    parking_coords: Mapped[Optional[list]] = mapped_column(JSONB)           # [{lat, lon, name}]
    access_notes: Mapped[Optional[str]] = mapped_column(Text)

    # Metadata
    county: Mapped[Optional[str]] = mapped_column(String(128))
    region: Mapped[Optional[str]] = mapped_column(String(128))              # e.g. "Western", "Eastern Shore"
    dnr_url: Mapped[Optional[str]] = mapped_column(String(512))
    source: Mapped[Optional[str]] = mapped_column(String(256))              # Data source identifier

    __table_args__ = (
        Index("ix_public_land_state", "state_id"),
        Index("ix_public_land_type", "land_type"),
        Index("ix_public_land_geometry", "geometry", postgresql_using="gist"),
    )


class PrivateParcel(Base):
    """
    A private land parcel from county tax records.
    Used for landowner outreach (Phase 2).
    """
    __tablename__ = "private_parcels"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    state_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("states.id"), nullable=False)

    # Parcel info
    parcel_id: Mapped[Optional[str]] = mapped_column(String(64))            # County parcel ID
    county: Mapped[str] = mapped_column(String(128), nullable=False)

    # Geometry
    geometry = mapped_column(Geometry("MULTIPOLYGON", srid=4326), nullable=True)
    centroid_lat: Mapped[Optional[float]] = mapped_column(Float)
    centroid_lon: Mapped[Optional[float]] = mapped_column(Float)
    acreage: Mapped[Optional[float]] = mapped_column(Float)

    # Owner info (public record)
    owner_name: Mapped[Optional[str]] = mapped_column(String(256))
    owner_address: Mapped[Optional[str]] = mapped_column(Text)
    owner_type: Mapped[Optional[str]] = mapped_column(String(32))           # "individual", "llc", "corporation", "government"

    # Land use
    land_use: Mapped[Optional[str]] = mapped_column(String(64))             # "agricultural", "forest", "residential", "commercial"
    zoning: Mapped[Optional[str]] = mapped_column(String(64))

    source: Mapped[Optional[str]] = mapped_column(String(256))

    __table_args__ = (
        Index("ix_parcel_state_county", "state_id", "county"),
        Index("ix_parcel_geometry", "geometry", postgresql_using="gist"),
        Index("ix_parcel_acreage", "acreage"),
    )


class TerrainData(Base):
    """
    Terrain metadata per region — elevation stats, land cover breakdown.
    Actual raster data lives in MBTiles files, not in PostgreSQL.
    """
    __tablename__ = "terrain_data"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    state_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("states.id"), nullable=False)
    region_name: Mapped[str] = mapped_column(String(128), nullable=False)

    # Elevation
    min_elevation_ft: Mapped[Optional[float]] = mapped_column(Float)
    max_elevation_ft: Mapped[Optional[float]] = mapped_column(Float)
    avg_elevation_ft: Mapped[Optional[float]] = mapped_column(Float)

    # Land cover breakdown (percentage)
    pct_forest: Mapped[Optional[float]] = mapped_column(Float)
    pct_cropland: Mapped[Optional[float]] = mapped_column(Float)
    pct_wetland: Mapped[Optional[float]] = mapped_column(Float)
    pct_developed: Mapped[Optional[float]] = mapped_column(Float)
    pct_water: Mapped[Optional[float]] = mapped_column(Float)

    # Bounding box
    geometry = mapped_column(Geometry("POLYGON", srid=4326), nullable=True)
