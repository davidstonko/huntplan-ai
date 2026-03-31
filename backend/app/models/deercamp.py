"""
HuntPlan AI — Deer Camp Models

Collaborative hunting group maps. Each camp has members, shared annotations
(waypoints, routes, areas, tracks, notes), photos, and an activity feed.
Mirrors the mobile DeerCampContext types for seamless sync.
"""

import uuid
from datetime import datetime
from typing import Optional

from sqlalchemy import String, Integer, Float, Boolean, Text, DateTime, ForeignKey, Index, Enum as SAEnum
from sqlalchemy.dialects.postgresql import UUID, JSONB
from geoalchemy2 import Geometry
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.sql import func

from app.db.database import Base


class DeerCamp(Base):
    """
    A collaborative hunting camp — shared map with team members.
    Created by one user, others join via invite code.
    """
    __tablename__ = "deer_camps"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name: Mapped[str] = mapped_column(String(256), nullable=False)
    created_by: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id"), nullable=False)

    # Invite system
    invite_code: Mapped[str] = mapped_column(String(16), unique=True, nullable=False)

    # Map center (default view when camp opens)
    center_lat: Mapped[float] = mapped_column(Float, nullable=False)
    center_lng: Mapped[float] = mapped_column(Float, nullable=False)
    default_zoom: Mapped[float] = mapped_column(Float, default=13.0)

    # Optional link to a public land
    linked_land_id: Mapped[Optional[str]] = mapped_column(String(256))

    # Status
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    member_count: Mapped[int] = mapped_column(Integer, default=1)

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), onupdate=func.now())

    __table_args__ = (
        Index("ix_camp_created_by", "created_by"),
        Index("ix_camp_invite", "invite_code"),
    )


class CampMember(Base):
    """A user's membership in a deer camp."""
    __tablename__ = "camp_members"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    camp_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("deer_camps.id", ondelete="CASCADE"), nullable=False)
    user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id"), nullable=False)
    username: Mapped[str] = mapped_column(String(64), nullable=False)
    role: Mapped[str] = mapped_column(String(16), default="member")  # "admin" or "member"
    color: Mapped[str] = mapped_column(String(16), nullable=False)   # Hex color for map annotations

    joined_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    __table_args__ = (
        Index("ix_member_camp", "camp_id"),
        Index("ix_member_user", "user_id"),
        Index("ix_member_unique", "camp_id", "user_id", unique=True),
    )


class SharedAnnotation(Base):
    """
    A map annotation shared with the camp — waypoint, route, area, track, or note.
    Stored as structured JSONB so the mobile app can render directly.
    """
    __tablename__ = "shared_annotations"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    camp_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("deer_camps.id", ondelete="CASCADE"), nullable=False)
    created_by: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id"), nullable=False)

    # Type: waypoint | route | area | track | note
    annotation_type: Mapped[str] = mapped_column(String(16), nullable=False)

    # The full annotation data as JSONB — matches mobile type definitions
    # For waypoint: {lat, lng, icon, label, notes}
    # For route: {points: [[lng,lat],...], style, label, distanceMeters}
    # For area: {polygon: [[lng,lat],...], label, areaAcres}
    # For track: {points: [{lat,lng,timestamp,...},...], name, distanceMeters, durationSeconds}
    # For note: {lat, lng, text}
    data: Mapped[dict] = mapped_column(JSONB, nullable=False)

    # Optional: which plan was this imported from?
    imported_from_plan_id: Mapped[Optional[str]] = mapped_column(String(256))

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    __table_args__ = (
        Index("ix_annotation_camp", "camp_id"),
        Index("ix_annotation_type", "camp_id", "annotation_type"),
    )


class CampPhoto(Base):
    """A geotagged photo shared in a deer camp."""
    __tablename__ = "camp_photos"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    camp_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("deer_camps.id", ondelete="CASCADE"), nullable=False)
    uploaded_by: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id"), nullable=False)

    # Storage
    image_key: Mapped[str] = mapped_column(String(512), nullable=False)  # S3 key or local path
    thumbnail_key: Mapped[Optional[str]] = mapped_column(String(512))

    # Geolocation
    lat: Mapped[float] = mapped_column(Float, nullable=False)
    lng: Mapped[float] = mapped_column(Float, nullable=False)

    caption: Mapped[Optional[str]] = mapped_column(String(512))

    uploaded_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    __table_args__ = (
        Index("ix_photo_camp", "camp_id"),
    )


class CampActivity(Base):
    """Activity feed entry for a deer camp — tracks who did what."""
    __tablename__ = "camp_activity"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    camp_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("deer_camps.id", ondelete="CASCADE"), nullable=False)
    user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id"), nullable=False)
    username: Mapped[str] = mapped_column(String(64), nullable=False)

    # Action types: created_camp, joined, left, added_waypoint, added_route,
    # added_area, added_track, added_note, removed_annotation, added_photo, imported_plan
    action: Mapped[str] = mapped_column(String(64), nullable=False)

    # Optional references
    annotation_id: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True))
    photo_id: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True))

    timestamp: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    __table_args__ = (
        Index("ix_activity_camp", "camp_id"),
        Index("ix_activity_time", "camp_id", "timestamp"),
    )
