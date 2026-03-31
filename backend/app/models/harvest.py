"""
HuntPlan AI — Harvest Log Models

Tracks game harvests for personal records, season bag tracking,
and (opt-in) community harvest data aggregation.
Each harvest entry records species, method, location, and details.
Maryland game check confirmation numbers can be stored.
"""

import uuid
from datetime import datetime, date
from typing import Optional

from sqlalchemy import String, Integer, Float, Boolean, Text, DateTime, Date, ForeignKey, Index
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy.sql import func

from app.db.database import Base


class HarvestLog(Base):
    """
    A single harvest entry logged by the user.

    Tracks species, weapon, location, and Maryland game check info.
    Users can optionally share harvest data anonymously for community stats.
    """
    __tablename__ = "harvest_logs"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id"), nullable=False)

    # Harvest details
    species: Mapped[str] = mapped_column(String(64), nullable=False)
    species_detail: Mapped[Optional[str]] = mapped_column(String(128))
    harvest_date: Mapped[date] = mapped_column(Date, nullable=False)
    harvest_time: Mapped[Optional[str]] = mapped_column(String(16))

    # Weapon / method
    weapon: Mapped[str] = mapped_column(String(64), nullable=False)
    weapon_detail: Mapped[Optional[str]] = mapped_column(String(128))

    # Location
    county: Mapped[Optional[str]] = mapped_column(String(128))
    land_name: Mapped[Optional[str]] = mapped_column(String(256))
    lat: Mapped[Optional[float]] = mapped_column(Float)
    lng: Mapped[Optional[float]] = mapped_column(Float)

    # Deer-specific fields
    antler_points: Mapped[Optional[int]] = mapped_column(Integer)
    is_antlered: Mapped[Optional[bool]] = mapped_column(Boolean)
    estimated_weight_lbs: Mapped[Optional[int]] = mapped_column(Integer)

    # Turkey-specific
    beard_length_inches: Mapped[Optional[float]] = mapped_column(Float)
    spur_length_inches: Mapped[Optional[float]] = mapped_column(Float)

    # Maryland game check
    game_check_number: Mapped[Optional[str]] = mapped_column(String(64))
    game_check_completed: Mapped[bool] = mapped_column(Boolean, default=False)

    # Photo (S3 key or local reference)
    photo_key: Mapped[Optional[str]] = mapped_column(String(512))

    # Notes
    notes: Mapped[Optional[str]] = mapped_column(Text)

    # Sharing
    is_shared: Mapped[bool] = mapped_column(Boolean, default=False)

    # Season tracking
    season_year: Mapped[str] = mapped_column(String(16), default="2025-2026")

    # Timestamps
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), onupdate=func.now())

    __table_args__ = (
        Index("ix_harvest_user", "user_id"),
        Index("ix_harvest_species", "species"),
        Index("ix_harvest_date", "harvest_date"),
        Index("ix_harvest_county", "county"),
        Index("ix_harvest_season", "user_id", "season_year"),
    )
