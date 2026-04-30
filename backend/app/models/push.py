"""
HuntPlan AI — Push Notification Device Token Model

Tracks registered APNS device tokens for server-initiated notifications.
Supports multiple devices per user + anonymous device registration.
"""

import uuid
from datetime import datetime
from typing import Optional

from sqlalchemy import String, Boolean, DateTime, ForeignKey, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.sql import func

from app.db.database import Base


class DeviceToken(Base):
    """
    Registered APNS device token for push notification delivery.

    One row per unique device. Supports:
    - Multiple devices per user (same user_id, different tokens)
    - Anonymous registration (user_id = null)
    - Deactivation without deletion (is_active = false)
    """
    __tablename__ = "device_tokens"

    __table_args__ = (
        UniqueConstraint('token', name='uq_device_tokens_token'),
    )

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)

    # Optional user link (null = anonymous device)
    user_id: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)

    # APNS device token (64 hex chars)
    token: Mapped[str] = mapped_column(String(256), nullable=False, index=True)

    # Platform (always 'ios' for now; 'android' ready for future)
    platform: Mapped[str] = mapped_column(String(16), default='ios', nullable=False)

    # Environment: 'development' | 'production'
    environment: Mapped[str] = mapped_column(String(16), default='development', nullable=False)

    # App version at registration time (e.g., "3.0.0")
    app_version: Mapped[Optional[str]] = mapped_column(String(32), nullable=True)

    # Lifecycle
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    last_seen_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))

    # Status
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, index=True)

    # Relationships
    user = relationship("User", back_populates="device_tokens")
