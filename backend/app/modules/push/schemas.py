"""
Push Notification Schemas

Pydantic models for device token registration, unregistration, and push dispatch.
"""

from typing import Optional, List
from datetime import datetime
from pydantic import BaseModel, Field, ConfigDict


class DeviceTokenCreate(BaseModel):
    """Register a new APNS device token."""
    token: str = Field(..., description="APNS device token (64 hex chars)")
    platform: str = Field(default="ios", description="'ios' or 'android'")
    environment: str = Field(default="development", description="'development' or 'production'")
    app_version: Optional[str] = Field(None, description="App version at registration time")


class DeviceTokenOut(BaseModel):
    """Response when registering a device token."""
    id: str
    token: str
    platform: str
    environment: str
    app_version: Optional[str]
    created_at: datetime
    is_active: bool

    model_config = ConfigDict(from_attributes=True)


class PushSendRequest(BaseModel):
    """Request to send a push notification to device(s)."""
    token_ids: Optional[List[str]] = Field(None, description="List of device token IDs, or null for 'all_ios'")
    all_ios: Optional[bool] = Field(False, description="If true, send to all active iOS tokens")
    title: str = Field(..., description="Notification title")
    body: str = Field(..., description="Notification body")
    data: Optional[dict] = Field(None, description="Custom payload data")


class PushSendResponse(BaseModel):
    """Response after attempting to send push notifications."""
    sent_count: int
    failed_count: int
    tokens_targeted: int
    message: str


class AdminTokensResponse(BaseModel):
    """Admin response listing all active device tokens."""
    total_tokens: int
    active_tokens: int
    ios_tokens: int
    android_tokens: int
    development_tokens: int
    production_tokens: int
    tokens: List[DeviceTokenOut]
