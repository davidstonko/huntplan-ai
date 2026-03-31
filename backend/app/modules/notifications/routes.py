"""
HuntPlan AI — Push Notification Routes

Handles device token registration, preference management,
and notification dispatch via APNS.
"""

from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.database import get_db
from app.models.user import User
from app.modules.auth.dependencies import get_current_user


router = APIRouter()


# ─── Models ───────────────────────────────────────────────────────

class RegisterTokenRequest(BaseModel):
    platform: str = "ios"
    token: str

class UnregisterRequest(BaseModel):
    token: str

class NotificationPreferences(BaseModel):
    season_alerts: bool = True
    camp_activity: bool = True
    regulation_changes: bool = True
    weather_alerts: bool = False


# ─── Device Token Management ─────────────────────────────────────
# Note: In production, these tokens would be stored in a dedicated table.
# For now, we store the APNS token in the user's device_token field
# and preferences in a JSONB field (to be added).

@router.post("/register")
async def register_push_token(
    request: RegisterTokenRequest,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Register a push notification device token."""
    # Store the APNS token associated with this user
    # In V3+, this should be a separate push_tokens table
    # to support multiple devices per user
    user.device_token = request.token
    db.add(user)
    await db.flush()

    return {"status": "registered", "platform": request.platform}


@router.post("/unregister")
async def unregister_push_token(
    request: UnregisterRequest,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Unregister a push notification token."""
    return {"status": "unregistered"}


@router.get("/preferences")
async def get_preferences(user: User = Depends(get_current_user)):
    """Get the user's notification preferences."""
    # TODO: Store in user profile JSONB field
    return NotificationPreferences().model_dump()


@router.patch("/preferences")
async def update_preferences(
    prefs: NotificationPreferences,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Update notification preferences."""
    # TODO: Persist to user profile JSONB field
    return prefs.model_dump()


# ─── Notification Dispatch (Internal) ────────────────────────────

async def send_camp_notification(
    db: AsyncSession,
    camp_id: str,
    exclude_user_id: str,
    title: str,
    body: str,
    data: dict = None,
):
    """
    Send a push notification to all camp members except the actor.
    This would be called from the Deer Camp routes when someone
    adds an annotation, joins, etc.

    TODO: Integrate with APNS via PyAPNs2 or firebase-admin.
    For now, this logs the notification intent.
    """
    # In production:
    # 1. Query all camp members except exclude_user_id
    # 2. Get their APNS tokens
    # 3. Send via APNS
    print(f"[Notify] Camp {camp_id}: {title} - {body}")
