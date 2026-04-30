"""
HuntPlan AI — Hiking Models

Trail trips and progress tracking. Supports AT (Appalachian Trail) and
state park trails with multi-day support and gear recommendations.
"""

import uuid
from datetime import datetime
from typing import Optional

from sqlalchemy import String, Integer, Date, DateTime, ForeignKey, Index, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy.sql import func

from app.db.database import Base


class HikingTrip(Base):
    """
    A hiking trip — planned hike with trail, duration, and difficulty tier.
    Supports day hikes, overnight, and multi-day treks.
    """
    __tablename__ = "hiking_trips"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id"), nullable=False)

    # Trail reference
    trail_id: Mapped[str] = mapped_column(String(256), nullable=False)
    trail_type: Mapped[str] = mapped_column(String(32), nullable=False)  # "at" or "statepark"

    # Trip details
    start_date: Mapped[datetime] = mapped_column(Date, nullable=False)
    nights: Mapped[int] = mapped_column(Integer, default=0)  # 0 = day hike, 1+ = overnight
    tier: Mapped[str] = mapped_column(String(32), nullable=False)  # "day", "overnight", "multiday"

    # Optional notes
    notes: Mapped[Optional[str]] = mapped_column(Text)

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), onupdate=func.now())

    __table_args__ = (
        Index("ix_hike_user", "user_id"),
        Index("ix_hike_trail", "trail_id"),
        Index("ix_hike_start", "start_date"),
    )


class ATProgress(Base):
    """
    Appalachian Trail progress tracking — logs shelter visits or mile markers.
    Users can track their AT progress incrementally.
    """
    __tablename__ = "at_progress"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id"), nullable=False)

    # Either shelter_id (e.g., "Blackrock Summit") or mile_marker (float)
    shelter_id: Mapped[Optional[str]] = mapped_column(String(256))
    mile_marker: Mapped[Optional[float]] = mapped_column(Integer)

    completed_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    __table_args__ = (
        Index("ix_at_progress_user", "user_id"),
        Index("ix_at_progress_shelter", "shelter_id"),
        Index("ix_at_progress_mile", "mile_marker"),
    )
