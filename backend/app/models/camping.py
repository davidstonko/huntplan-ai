"""
HuntPlan AI — Camping Models

Trip planning and group camping. Each trip represents a camping booking at a
specific campground. Groups organize multi-user camping experiences.
"""

import uuid
from datetime import datetime
from typing import Optional

from sqlalchemy import String, Integer, Float, Date, Text, DateTime, ForeignKey, Index
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy.sql import func

from app.db.database import Base


class CampingTrip(Base):
    """
    A camping trip at a specific campground — user's itinerary.
    Tracks dates, party size, and associated group (optional).
    """
    __tablename__ = "camping_trips"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id"), nullable=False)

    # Campground reference (ID string, e.g., from GIS data)
    campground_id: Mapped[str] = mapped_column(String(256), nullable=False)

    # Trip details
    start_date: Mapped[datetime] = mapped_column(Date, nullable=False)
    end_date: Mapped[datetime] = mapped_column(Date, nullable=False)
    party_size: Mapped[int] = mapped_column(Integer, default=1)
    notes: Mapped[Optional[str]] = mapped_column(Text)

    # Optional group association
    group_code: Mapped[Optional[str]] = mapped_column(String(16), ForeignKey("camping_groups.code"))

    # Gear checklist (optional — stored as JSONB)
    gear_packed: Mapped[Optional[dict]] = mapped_column(JSONB, default={})

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), onupdate=func.now())

    __table_args__ = (
        Index("ix_trip_user", "user_id"),
        Index("ix_trip_campground", "campground_id"),
        Index("ix_trip_dates", "start_date", "end_date"),
    )


class CampingGroup(Base):
    """
    A group camping experience — multiple users planning a trip together.
    Creator becomes admin; others join via invite code.
    """
    __tablename__ = "camping_groups"

    code: Mapped[str] = mapped_column(String(16), primary_key=True)
    name: Mapped[str] = mapped_column(String(256), nullable=False)
    created_by: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id"), nullable=False)

    # Campground reference
    campground_id: Mapped[str] = mapped_column(String(256), nullable=False)

    # Status
    is_active: Mapped[bool] = mapped_column(default=True)
    member_count: Mapped[int] = mapped_column(Integer, default=1)

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), onupdate=func.now())

    __table_args__ = (
        Index("ix_group_created_by", "created_by"),
        Index("ix_group_campground", "campground_id"),
    )


class CampingGroupMember(Base):
    """A user's membership in a camping group."""
    __tablename__ = "camping_group_members"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    group_code: Mapped[str] = mapped_column(ForeignKey("camping_groups.code", ondelete="CASCADE"), nullable=False)
    user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id"), nullable=False)
    username: Mapped[str] = mapped_column(String(64), nullable=False)
    role: Mapped[str] = mapped_column(String(16), default="member")  # "admin" or "member"

    joined_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    __table_args__ = (
        Index("ix_group_member_code", "group_code"),
        Index("ix_group_member_user", "user_id"),
        Index("ix_group_member_unique", "group_code", "user_id", unique=True),
    )
