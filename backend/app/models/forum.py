"""
HuntPlan AI — Forum & Marketplace Models

Discussion threads per public land and gear trading marketplace.
Anonymous-first — username-based, no real names required.
"""

import uuid
from datetime import datetime
from typing import Optional

from sqlalchemy import String, Integer, Boolean, Text, DateTime, Float, ForeignKey, Index
from sqlalchemy.dialects.postgresql import UUID, JSONB, ARRAY
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy.sql import func

from app.db.database import Base


# ─── Forum Discussion Threads ───────────────────────────────────

class ForumThread(Base):
    """
    A discussion thread — optionally tied to a specific public land.
    Categories: general, land_discussion, strategy, regulations, gear, season_report
    """
    __tablename__ = "forum_threads"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id"), nullable=False)

    # Thread metadata
    title: Mapped[str] = mapped_column(String(256), nullable=False)
    body: Mapped[str] = mapped_column(Text, nullable=False)
    category: Mapped[str] = mapped_column(
        String(32), nullable=False, default="general"
    )  # general, land_discussion, strategy, regulations, gear, season_report

    # Optional land association
    land_id: Mapped[Optional[str]] = mapped_column(String(128))  # matches MarylandPublicLand.id
    land_name: Mapped[Optional[str]] = mapped_column(String(256))

    # Location context
    state_code: Mapped[str] = mapped_column(String(2), nullable=False, default="MD")
    county: Mapped[Optional[str]] = mapped_column(String(128))

    # Tags for searchability
    tags: Mapped[Optional[list]] = mapped_column(JSONB)  # ["deer", "archery", "western-md"]

    # Photos (optional)
    photo_urls: Mapped[Optional[list]] = mapped_column(JSONB)

    # Engagement
    reply_count: Mapped[int] = mapped_column(Integer, default=0)
    upvotes: Mapped[int] = mapped_column(Integer, default=0)
    view_count: Mapped[int] = mapped_column(Integer, default=0)
    last_reply_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))

    # Pinning / moderation
    is_pinned: Mapped[bool] = mapped_column(Boolean, default=False)
    is_locked: Mapped[bool] = mapped_column(Boolean, default=False)
    is_flagged: Mapped[bool] = mapped_column(Boolean, default=False)
    is_removed: Mapped[bool] = mapped_column(Boolean, default=False)

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    __table_args__ = (
        Index("ix_thread_category", "category", "state_code"),
        Index("ix_thread_land", "land_id"),
        Index("ix_thread_created", "created_at"),
        Index("ix_thread_last_reply", "last_reply_at"),
    )


class ForumReply(Base):
    """A reply to a forum thread. Supports nested replies via parent_id."""
    __tablename__ = "forum_replies"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    thread_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("forum_threads.id", ondelete="CASCADE"), nullable=False)
    user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id"), nullable=False)
    parent_id: Mapped[Optional[uuid.UUID]] = mapped_column(ForeignKey("forum_replies.id"))

    body: Mapped[str] = mapped_column(Text, nullable=False)
    photo_urls: Mapped[Optional[list]] = mapped_column(JSONB)

    upvotes: Mapped[int] = mapped_column(Integer, default=0)

    is_flagged: Mapped[bool] = mapped_column(Boolean, default=False)
    is_removed: Mapped[bool] = mapped_column(Boolean, default=False)

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    __table_args__ = (
        Index("ix_reply_thread", "thread_id", "created_at"),
    )


# ─── Gear Marketplace ───────────────────────────────────────────

class MarketplaceListing(Base):
    """
    A gear trading post — buy/sell/trade hunting equipment.
    Categories: firearms, archery, clothing, optics, tree_stands, decoys, other
    """
    __tablename__ = "marketplace_listings"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id"), nullable=False)

    # Listing details
    title: Mapped[str] = mapped_column(String(256), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    category: Mapped[str] = mapped_column(
        String(32), nullable=False
    )  # firearms, archery, clothing, optics, tree_stands, decoys, accessories, other
    condition: Mapped[str] = mapped_column(
        String(32), nullable=False, default="used_good"
    )  # new, like_new, used_good, used_fair, for_parts

    # Pricing
    listing_type: Mapped[str] = mapped_column(
        String(16), nullable=False, default="sell"
    )  # sell, trade, free, wanted
    price: Mapped[Optional[float]] = mapped_column(Float)  # USD, null for trade/free/wanted
    is_negotiable: Mapped[bool] = mapped_column(Boolean, default=True)

    # Location (county-level only for privacy)
    state_code: Mapped[str] = mapped_column(String(2), nullable=False, default="MD")
    county: Mapped[Optional[str]] = mapped_column(String(128))

    # Photos
    photo_urls: Mapped[Optional[list]] = mapped_column(JSONB)  # Up to 8 photos

    # Status
    status: Mapped[str] = mapped_column(
        String(16), nullable=False, default="active"
    )  # active, pending, sold, traded, expired, removed
    message_count: Mapped[int] = mapped_column(Integer, default=0)
    view_count: Mapped[int] = mapped_column(Integer, default=0)

    # Moderation
    is_flagged: Mapped[bool] = mapped_column(Boolean, default=False)
    is_removed: Mapped[bool] = mapped_column(Boolean, default=False)

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    expires_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))  # Auto-expire after 30 days

    __table_args__ = (
        Index("ix_listing_category", "category", "status"),
        Index("ix_listing_state", "state_code", "status"),
        Index("ix_listing_created", "created_at"),
        Index("ix_listing_price", "price"),
    )


# ─── Land Permission Listings ───────────────────────────────────

class LandPermission(Base):
    """
    Hunting permission / lease listing for private land.
    Connects landowners with hunters seeking access.
    """
    __tablename__ = "land_permissions"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id"), nullable=False)

    # Land details
    title: Mapped[str] = mapped_column(String(256), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    acres: Mapped[Optional[float]] = mapped_column(Float)
    terrain_description: Mapped[Optional[str]] = mapped_column(Text)  # "rolling hills, hardwood ridges"

    # Location (county + general area, no exact address)
    state_code: Mapped[str] = mapped_column(String(2), nullable=False, default="MD")
    county: Mapped[str] = mapped_column(String(128), nullable=False)
    general_area: Mapped[Optional[str]] = mapped_column(String(256))

    # Lease details
    permission_type: Mapped[str] = mapped_column(
        String(32), nullable=False
    )  # seasonal_lease, daily_access, free_permission, guided
    species_allowed: Mapped[Optional[list]] = mapped_column(JSONB)  # ["deer", "turkey"]
    weapons_allowed: Mapped[Optional[list]] = mapped_column(JSONB)  # ["archery", "firearms"]
    max_hunters: Mapped[Optional[int]] = mapped_column(Integer)
    price: Mapped[Optional[float]] = mapped_column(Float)  # Per season or per day
    price_unit: Mapped[Optional[str]] = mapped_column(String(16))  # "season", "day", "free"

    # Photos
    photo_urls: Mapped[Optional[list]] = mapped_column(JSONB)

    # Status
    status: Mapped[str] = mapped_column(
        String(16), nullable=False, default="active"
    )  # active, filled, expired, removed

    # Moderation
    is_verified: Mapped[bool] = mapped_column(Boolean, default=False)  # Verified landowner
    is_flagged: Mapped[bool] = mapped_column(Boolean, default=False)
    is_removed: Mapped[bool] = mapped_column(Boolean, default=False)

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    __table_args__ = (
        Index("ix_permission_county", "state_code", "county", "status"),
        Index("ix_permission_type", "permission_type", "status"),
    )
