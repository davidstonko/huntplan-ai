"""
HuntPlan AI — Hunt Plan & Field Documentation Models

Stores AI-generated hunt plans and in-field documentation
(notes, photos, GPS tracks, observations).
"""

import uuid
from datetime import datetime, date
from typing import Optional

from sqlalchemy import String, Integer, Float, Boolean, Text, Date, DateTime, ForeignKey
from sqlalchemy.dialects.postgresql import UUID, JSONB
from geoalchemy2 import Geometry
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy.sql import func

from app.db.database import Base


class HuntPlan(Base):
    """An AI-generated or user-created hunt plan."""
    __tablename__ = "hunt_plans"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id"), nullable=False)

    # Plan details
    title: Mapped[str] = mapped_column(String(256), nullable=False)
    hunt_date: Mapped[date] = mapped_column(Date, nullable=False)
    species: Mapped[str] = mapped_column(String(128), nullable=False)
    weapon_type: Mapped[Optional[str]] = mapped_column(String(64))
    state_code: Mapped[str] = mapped_column(String(2), nullable=False)
    county: Mapped[Optional[str]] = mapped_column(String(128))

    # Location
    land_id: Mapped[Optional[uuid.UUID]] = mapped_column(ForeignKey("public_lands.id"))
    custom_location_name: Mapped[Optional[str]] = mapped_column(String(256))
    location_lat: Mapped[Optional[float]] = mapped_column(Float)
    location_lon: Mapped[Optional[float]] = mapped_column(Float)

    # AI-generated content
    plan_summary: Mapped[Optional[str]] = mapped_column(Text)               # AI narrative summary
    legal_verification: Mapped[Optional[dict]] = mapped_column(JSONB)       # {season_open, weapon_ok, sunday_ok, bag_limit, ...}
    weather_forecast: Mapped[Optional[dict]] = mapped_column(JSONB)
    solunar_data: Mapped[Optional[dict]] = mapped_column(JSONB)
    gear_checklist: Mapped[Optional[list]] = mapped_column(JSONB)
    access_directions: Mapped[Optional[str]] = mapped_column(Text)
    ai_recommendations: Mapped[Optional[str]] = mapped_column(Text)

    # Timing
    planned_arrival: Mapped[Optional[str]] = mapped_column(String(16))      # "05:30"
    sunrise: Mapped[Optional[str]] = mapped_column(String(16))
    sunset: Mapped[Optional[str]] = mapped_column(String(16))
    legal_start: Mapped[Optional[str]] = mapped_column(String(16))
    legal_end: Mapped[Optional[str]] = mapped_column(String(16))

    # Status
    status: Mapped[str] = mapped_column(String(32), default="draft")        # draft, planned, active, completed, cancelled
    shared_with_safety_contact: Mapped[bool] = mapped_column(Boolean, default=False)
    safety_contact_info: Mapped[Optional[str]] = mapped_column(String(256))

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), onupdate=func.now())


class FieldNote(Base):
    """
    A note taken in the field — text, photo, observation.
    Created offline, synced to server when back online.
    """
    __tablename__ = "field_notes"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id"), nullable=False)
    plan_id: Mapped[Optional[uuid.UUID]] = mapped_column(ForeignKey("hunt_plans.id"))

    # Content
    note_type: Mapped[str] = mapped_column(String(32), nullable=False)      # "text", "photo", "observation", "harvest", "gps_track"
    title: Mapped[Optional[str]] = mapped_column(String(256))
    body: Mapped[Optional[str]] = mapped_column(Text)
    photo_path: Mapped[Optional[str]] = mapped_column(String(512))          # Local path or S3 key

    # Location (GPS at time of note)
    lat: Mapped[Optional[float]] = mapped_column(Float)
    lon: Mapped[Optional[float]] = mapped_column(Float)
    elevation_ft: Mapped[Optional[float]] = mapped_column(Float)
    point = mapped_column(Geometry("POINT", srid=4326), nullable=True)

    # Observation data (for note_type = "observation")
    species_observed: Mapped[Optional[str]] = mapped_column(String(128))
    activity_type: Mapped[Optional[str]] = mapped_column(String(64))        # "visual", "tracks", "scrape", "rub", "gobble", "call", "scat"
    count: Mapped[Optional[int]] = mapped_column(Integer)

    # Harvest data (for note_type = "harvest")
    harvest_species: Mapped[Optional[str]] = mapped_column(String(128))
    harvest_sex: Mapped[Optional[str]] = mapped_column(String(16))          # "male", "female", "unknown"
    harvest_weapon: Mapped[Optional[str]] = mapped_column(String(64))
    harvest_details: Mapped[Optional[dict]] = mapped_column(JSONB)          # weight, antler points, etc.

    # GPS track (for note_type = "gps_track")
    track_geojson: Mapped[Optional[dict]] = mapped_column(JSONB)            # GeoJSON LineString
    distance_miles: Mapped[Optional[float]] = mapped_column(Float)
    duration_minutes: Mapped[Optional[int]] = mapped_column(Integer)

    # Privacy
    is_private: Mapped[bool] = mapped_column(Boolean, default=True)         # NOT shared unless user posts to social
    shared_to_social: Mapped[bool] = mapped_column(Boolean, default=False)

    # Sync
    created_at_local: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)  # Device timestamp
    synced_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
