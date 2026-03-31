"""
HuntPlan AI — Regulation Models

Stores hunting seasons, species, bag limits, weapon restrictions,
Sunday rules, and license requirements per state.
"""

import uuid
from datetime import date, time
from typing import Optional

from sqlalchemy import (
    String, Integer, Float, Boolean, Date, Time, Text, ForeignKey,
    UniqueConstraint, Index,
)
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.database import Base


class State(Base):
    """A US state with hunting data available."""
    __tablename__ = "states"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    code: Mapped[str] = mapped_column(String(2), unique=True, nullable=False)  # e.g. "MD"
    name: Mapped[str] = mapped_column(String(64), nullable=False)               # e.g. "Maryland"
    dnr_url: Mapped[Optional[str]] = mapped_column(String(512))
    data_pack_version: Mapped[Optional[str]] = mapped_column(String(32))
    regulation_year: Mapped[Optional[str]] = mapped_column(String(16))          # e.g. "2025-2026"

    # Relationships
    species: Mapped[list["Species"]] = relationship(back_populates="state")
    seasons: Mapped[list["Season"]] = relationship(back_populates="state")
    counties: Mapped[list["County"]] = relationship(back_populates="state")


class County(Base):
    """A county within a state. Used for region-specific regulations."""
    __tablename__ = "counties"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    state_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("states.id"), nullable=False)
    name: Mapped[str] = mapped_column(String(128), nullable=False)
    fips_code: Mapped[Optional[str]] = mapped_column(String(5))

    # Sunday hunting
    sunday_hunting_allowed: Mapped[bool] = mapped_column(Boolean, default=False)
    sunday_hunting_notes: Mapped[Optional[str]] = mapped_column(Text)

    state: Mapped["State"] = relationship(back_populates="counties")

    __table_args__ = (
        UniqueConstraint("state_id", "name", name="uq_county_state_name"),
    )


class Species(Base):
    """A huntable species (deer, turkey, waterfowl, etc.)."""
    __tablename__ = "species"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    state_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("states.id"), nullable=False)
    name: Mapped[str] = mapped_column(String(128), nullable=False)          # e.g. "White-tailed Deer"
    category: Mapped[str] = mapped_column(String(64), nullable=False)       # e.g. "big_game", "turkey", "waterfowl", "small_game"
    description: Mapped[Optional[str]] = mapped_column(Text)

    state: Mapped["State"] = relationship(back_populates="species")
    seasons: Mapped[list["Season"]] = relationship(back_populates="species")
    bag_limits: Mapped[list["BagLimit"]] = relationship(back_populates="species")

    __table_args__ = (
        UniqueConstraint("state_id", "name", name="uq_species_state_name"),
    )


class Season(Base):
    """
    A hunting season — defines when a species can be hunted
    with a specific weapon type in a specific region.
    """
    __tablename__ = "seasons"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    state_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("states.id"), nullable=False)
    species_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("species.id"), nullable=False)

    name: Mapped[str] = mapped_column(String(256), nullable=False)          # e.g. "Archery Deer Season"
    weapon_type: Mapped[str] = mapped_column(String(64), nullable=False)    # bow, firearm, muzzleloader, crossbow, shotgun, falconry
    start_date: Mapped[date] = mapped_column(Date, nullable=False)
    end_date: Mapped[date] = mapped_column(Date, nullable=False)

    # Region scoping (null = statewide)
    region: Mapped[Optional[str]] = mapped_column(String(128))              # e.g. "Western Maryland", "Region A"
    county_ids: Mapped[Optional[list]] = mapped_column(JSONB)               # List of county UUIDs if county-specific

    # Legal hours
    shooting_hours_start: Mapped[Optional[str]] = mapped_column(String(64)) # e.g. "30 min before sunrise"
    shooting_hours_end: Mapped[Optional[str]] = mapped_column(String(64))   # e.g. "30 min after sunset"

    # Restrictions
    antler_restrictions: Mapped[Optional[str]] = mapped_column(Text)        # e.g. "Must have 3+ points on one side"
    sex_restrictions: Mapped[Optional[str]] = mapped_column(String(64))     # "either_sex", "antlered_only", "antlerless_only"
    special_conditions: Mapped[Optional[str]] = mapped_column(Text)
    permit_required: Mapped[bool] = mapped_column(Boolean, default=False)
    sunday_allowed: Mapped[bool] = mapped_column(Boolean, default=True)

    # Source citation
    source_url: Mapped[Optional[str]] = mapped_column(String(512))
    source_text: Mapped[Optional[str]] = mapped_column(Text)               # Original regulation text for RAG

    state: Mapped["State"] = relationship(back_populates="seasons")
    species: Mapped["Species"] = relationship(back_populates="seasons")

    __table_args__ = (
        Index("ix_season_dates", "start_date", "end_date"),
        Index("ix_season_species_weapon", "species_id", "weapon_type"),
    )


class BagLimit(Base):
    """Bag limits per species, season type, and region."""
    __tablename__ = "bag_limits"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    state_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("states.id"), nullable=False)
    species_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("species.id"), nullable=False)

    season_type: Mapped[Optional[str]] = mapped_column(String(64))          # "archery", "firearms", "muzzleloader", or null for overall
    region: Mapped[Optional[str]] = mapped_column(String(128))

    daily_limit: Mapped[Optional[int]] = mapped_column(Integer)
    season_limit: Mapped[Optional[int]] = mapped_column(Integer)
    possession_limit: Mapped[Optional[int]] = mapped_column(Integer)
    sex_specific: Mapped[Optional[str]] = mapped_column(String(64))         # "antlered", "antlerless", "either"
    notes: Mapped[Optional[str]] = mapped_column(Text)

    source_url: Mapped[Optional[str]] = mapped_column(String(512))

    species: Mapped["Species"] = relationship(back_populates="bag_limits")


class WeaponRestriction(Base):
    """Weapon-specific rules (e.g., caliber minimums, magazine capacity, allowed attachments)."""
    __tablename__ = "weapon_restrictions"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    state_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("states.id"), nullable=False)

    weapon_type: Mapped[str] = mapped_column(String(64), nullable=False)
    restriction: Mapped[str] = mapped_column(Text, nullable=False)
    species_category: Mapped[Optional[str]] = mapped_column(String(64))     # If restriction is species-specific
    source_url: Mapped[Optional[str]] = mapped_column(String(512))


class LicenseRequirement(Base):
    """License and stamp requirements for hunting in a state."""
    __tablename__ = "license_requirements"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    state_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("states.id"), nullable=False)

    name: Mapped[str] = mapped_column(String(256), nullable=False)          # e.g. "Resident Hunting License"
    license_type: Mapped[str] = mapped_column(String(64), nullable=False)   # "license", "stamp", "permit", "tag"
    required_for: Mapped[Optional[str]] = mapped_column(Text)               # Species or activity description
    resident_price: Mapped[Optional[float]] = mapped_column(Float)
    nonresident_price: Mapped[Optional[float]] = mapped_column(Float)
    notes: Mapped[Optional[str]] = mapped_column(Text)
    source_url: Mapped[Optional[str]] = mapped_column(String(512))
