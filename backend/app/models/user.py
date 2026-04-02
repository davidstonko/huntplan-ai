"""
HuntPlan AI — User Models

Anonymous-first user system. No real name required.
Device-bound token on first launch; optional email for recovery.
"""

import uuid
from datetime import datetime
from typing import Optional

from sqlalchemy import String, Integer, Boolean, Text, DateTime, Float
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy.sql import func

from app.db.database import Base


class User(Base):
    """
    An anonymous user. Created automatically on first app launch.
    No PII required — just a device token and anonymous handle.
    """
    __tablename__ = "users"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)

    # Anonymous identity
    handle: Mapped[str] = mapped_column(String(64), unique=True, nullable=False)  # e.g. "BuckHunter_7742"
    device_token: Mapped[str] = mapped_column(String(256), unique=True, nullable=False)

    # Optional PII (only if user opts in for account recovery)
    email: Mapped[Optional[str]] = mapped_column(String(256), unique=True)
    email_verified: Mapped[bool] = mapped_column(Boolean, default=False)

    # Profile (all optional, anonymous-safe)
    experience_level: Mapped[Optional[str]] = mapped_column(String(32))     # "beginner", "intermediate", "experienced", "expert"
    preferred_species: Mapped[Optional[str]] = mapped_column(Text)          # Comma-separated
    home_county: Mapped[Optional[str]] = mapped_column(String(128))         # General location, not address
    home_state: Mapped[Optional[str]] = mapped_column(String(2))

    # GPS (last known, for proximity features — only stored with consent)
    last_lat: Mapped[Optional[float]] = mapped_column(Float)
    last_lon: Mapped[Optional[float]] = mapped_column(Float)

    # Reputation
    reputation_score: Mapped[int] = mapped_column(Integer, default=0)
    reports_posted: Mapped[int] = mapped_column(Integer, default=0)
    reports_upvoted: Mapped[int] = mapped_column(Integer, default=0)

    # Verification (optional — linked to state license number but number NOT stored)
    is_verified_hunter: Mapped[bool] = mapped_column(Boolean, default=False)

    # Notification preferences (JSONB)
    notification_preferences: Mapped[dict] = mapped_column(
        JSONB,
        default={
            "season_alerts": True,
            "camp_activity": True,
            "regulation_changes": True,
            "weather_alerts": False,
        },
        nullable=False
    )

    # Account status
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    is_admin: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    last_active_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))
