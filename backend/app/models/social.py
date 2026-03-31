"""
HuntPlan AI — Anonymous Social Network Models

Scouting reports, community Q&A, messaging — all anonymous by default.
"""

import uuid
from datetime import datetime
from typing import Optional

from sqlalchemy import String, Integer, Boolean, Text, DateTime, ForeignKey, Index
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy.sql import func

from app.db.database import Base


class ScoutingReport(Base):
    """
    A community scouting report — posted anonymously.
    Location is coarse (county/WMA level only, never GPS coordinates).
    """
    __tablename__ = "scouting_reports"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id"), nullable=False)

    # Location (intentionally coarse — county or WMA name only)
    state_code: Mapped[str] = mapped_column(String(2), nullable=False)
    county: Mapped[Optional[str]] = mapped_column(String(128))
    public_land_name: Mapped[Optional[str]] = mapped_column(String(256))    # WMA/forest name
    general_area: Mapped[Optional[str]] = mapped_column(String(256))        # "Northern Frederick County"

    # Report content
    species: Mapped[str] = mapped_column(String(128), nullable=False)
    activity_level: Mapped[str] = mapped_column(String(32), nullable=False) # "none", "low", "moderate", "high", "very_high"
    report_date: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    body: Mapped[Optional[str]] = mapped_column(Text)                       # Free text description
    sign_observed: Mapped[Optional[list]] = mapped_column(JSONB)            # ["tracks", "scrapes", "rubs", "gobbles"]
    conditions: Mapped[Optional[str]] = mapped_column(Text)                 # Weather/terrain conditions

    # Photos (EXIF GPS stripped before upload)
    photo_urls: Mapped[Optional[list]] = mapped_column(JSONB)

    # Community engagement
    upvotes: Mapped[int] = mapped_column(Integer, default=0)
    downvotes: Mapped[int] = mapped_column(Integer, default=0)
    comment_count: Mapped[int] = mapped_column(Integer, default=0)

    # Moderation
    is_flagged: Mapped[bool] = mapped_column(Boolean, default=False)
    is_removed: Mapped[bool] = mapped_column(Boolean, default=False)

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    __table_args__ = (
        Index("ix_report_state_species", "state_code", "species"),
        Index("ix_report_date", "report_date"),
        Index("ix_report_county", "state_code", "county"),
    )


class ReportComment(Base):
    """A comment on a scouting report."""
    __tablename__ = "report_comments"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    report_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("scouting_reports.id"), nullable=False)
    user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id"), nullable=False)
    parent_id: Mapped[Optional[uuid.UUID]] = mapped_column(ForeignKey("report_comments.id"))

    body: Mapped[str] = mapped_column(Text, nullable=False)
    upvotes: Mapped[int] = mapped_column(Integer, default=0)

    is_flagged: Mapped[bool] = mapped_column(Boolean, default=False)
    is_removed: Mapped[bool] = mapped_column(Boolean, default=False)

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class DirectMessage(Base):
    """An encrypted direct message between anonymous users."""
    __tablename__ = "direct_messages"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    sender_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id"), nullable=False)
    recipient_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id"), nullable=False)

    body_encrypted: Mapped[str] = mapped_column(Text, nullable=False)       # E2E encrypted
    is_read: Mapped[bool] = mapped_column(Boolean, default=False)

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    __table_args__ = (
        Index("ix_dm_recipient", "recipient_id", "is_read"),
    )


class Group(Base):
    """A discussion group (region-based, species-based, or season-based)."""
    __tablename__ = "groups"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name: Mapped[str] = mapped_column(String(256), nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text)
    group_type: Mapped[str] = mapped_column(String(32), nullable=False)     # "region", "species", "season", "custom"
    state_code: Mapped[Optional[str]] = mapped_column(String(2))
    member_count: Mapped[int] = mapped_column(Integer, default=0)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
