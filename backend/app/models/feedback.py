"""
MDHuntFishOutdoors — User Feedback Models

Captures regulation error reports, outdated info flags, and feature suggestions
from app users. Supports admin responses and status tracking.
"""

import uuid
from datetime import datetime
from typing import Optional

from sqlalchemy import String, Boolean, Text, DateTime, ForeignKey, Index
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy.sql import func

from app.db.database import Base


class Feedback(Base):
    """
    User-submitted feedback about regulation accuracy, app bugs, or feature ideas.

    Types:
      - bug: Something is broken or incorrect
      - outdated: Regulation data is stale
      - suggestion: Feature request or improvement idea

    Lifecycle: new → reviewed → resolved | dismissed
    """
    __tablename__ = "feedback"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )

    # Who submitted (nullable — anonymous feedback allowed)
    user_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        ForeignKey("users.id"), nullable=True
    )
    device_id: Mapped[Optional[str]] = mapped_column(String(256), nullable=True)

    # Feedback content
    feedback_type: Mapped[str] = mapped_column(
        String(32), nullable=False
    )  # 'bug', 'outdated', 'suggestion'
    description: Mapped[str] = mapped_column(Text, nullable=False)

    # Context — which screen/tab the user was on
    screen: Mapped[Optional[str]] = mapped_column(String(64), nullable=True)
    active_tab: Mapped[Optional[str]] = mapped_column(String(64), nullable=True)

    # App metadata
    app_version: Mapped[Optional[str]] = mapped_column(String(32), nullable=True)
    ios_version: Mapped[Optional[str]] = mapped_column(String(32), nullable=True)

    # Admin handling
    status: Mapped[str] = mapped_column(
        String(32), nullable=False, default="new"
    )  # 'new', 'reviewed', 'resolved', 'dismissed'
    admin_notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    admin_response: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    resolved_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)

    # Email notification tracking
    notification_sent: Mapped[bool] = mapped_column(Boolean, default=False)

    # Timestamps
    created_at: Mapped[datetime] = mapped_column(
        DateTime, server_default=func.now(), nullable=False
    )
    updated_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime, onupdate=func.now(), nullable=True
    )

    __table_args__ = (
        Index("ix_feedback_status", "status"),
        Index("ix_feedback_type", "feedback_type"),
        Index("ix_feedback_created", "created_at"),
    )
