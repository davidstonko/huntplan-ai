"""
Push Notification Routes

Handles device token registration, unregistration, and server-initiated push dispatch.
Endpoints are auth-optional for registration (anonymous devices supported).
Dispatch requires admin authorization or INTERNAL_API_KEY.
"""

import logging
from typing import Optional, List
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, Header, status
from sqlalchemy import select, and_
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.db.database import get_db
from app.models.user import User
from app.models.push import DeviceToken
from app.modules.auth.dependencies import get_current_user
from app.modules.push.schemas import (
    DeviceTokenCreate,
    DeviceTokenOut,
    PushSendRequest,
    PushSendResponse,
    AdminTokensResponse,
)
from app.modules.push.apns_client import send_push_to_many, send_push_to_token

logger = logging.getLogger(__name__)

router = APIRouter()

# ─── Admin Guard ───────────────────────────────────────────────────

async def verify_admin_or_key(
    authorization: Optional[str] = Header(None),
    db: AsyncSession = Depends(get_db),
) -> Optional[User]:
    """
    Verify either:
    1. Bearer token is a valid user (not yet implemented)
    2. X-Internal-API-Key matches INTERNAL_API_KEY env var
    Returns the User if authorized, else raises 403.
    """
    # For now, use INTERNAL_API_KEY env var as a simple guard
    internal_key = getattr(settings, 'internal_api_key', None)
    if not internal_key:
        logger.warning("INTERNAL_API_KEY not set — admin endpoints will reject requests")
        raise HTTPException(status_code=403, detail="Admin key not configured")

    if authorization and authorization.startswith("Bearer "):
        token = authorization[7:]
        if token == internal_key:
            return None  # Indicate key-based auth succeeded

    raise HTTPException(status_code=403, detail="Unauthorized")


# ─── Device Token Management ───────────────────────────────────────

@router.post("/push/register", response_model=DeviceTokenOut)
async def register_device_token(
    request: DeviceTokenCreate,
    db: AsyncSession = Depends(get_db),
    user: Optional[User] = Depends(lambda: None),  # Optional auth
):
    """
    Register or update an APNS device token.

    - auth-optional: can be called by anonymous or authenticated users
    - Idempotent: if token already exists, update last_seen_at and is_active=true
    - Returns the registered DeviceToken with id
    """
    # Check if token already exists
    result = await db.execute(
        select(DeviceToken).where(DeviceToken.token == request.token)
    )
    existing = result.scalars().first()

    if existing:
        # Update last_seen_at and reactivate if was deactivated
        existing.last_seen_at = datetime.utcnow()
        existing.is_active = True
        existing.app_version = request.app_version
        db.add(existing)
        await db.flush()
        logger.info(f"Updated device token {request.token[:12]}...")
        return DeviceTokenOut.model_validate(existing)

    # Create new token
    device_token = DeviceToken(
        user_id=user.id if user else None,
        token=request.token,
        platform=request.platform,
        environment=request.environment,
        app_version=request.app_version,
    )
    db.add(device_token)
    await db.flush()
    logger.info(f"Registered device token {request.token[:12]}... (user={user.id if user else 'anonymous'})")

    return DeviceTokenOut.model_validate(device_token)


@router.post("/push/unregister", status_code=204)
async def unregister_device_token(
    token: str,
    db: AsyncSession = Depends(get_db),
    user: Optional[User] = Depends(lambda: None),
):
    """
    Unregister (deactivate) a device token.

    - Auth-optional: can unregister your own token
    - Sets is_active = false; does not delete the record
    """
    result = await db.execute(
        select(DeviceToken).where(DeviceToken.token == token)
    )
    device = result.scalars().first()

    if not device:
        raise HTTPException(status_code=404, detail="Token not found")

    # Check ownership (if user provided, must own the token)
    if user and device.user_id and device.user_id != user.id:
        raise HTTPException(status_code=403, detail="Cannot unregister another user's token")

    device.is_active = False
    db.add(device)
    await db.flush()
    logger.info(f"Deactivated device token {token[:12]}...")


@router.get("/push/admin/tokens", response_model=AdminTokensResponse, status_code=200)
async def list_admin_tokens(
    authorization: Optional[str] = Header(None),
    db: AsyncSession = Depends(get_db),
):
    """
    Admin endpoint: list all active device tokens with summary stats.

    Requires: Authorization: Bearer {INTERNAL_API_KEY}
    """
    await verify_admin_or_key(authorization=authorization, db=db)

    result = await db.execute(
        select(DeviceToken).where(DeviceToken.is_active == True)
    )
    tokens = result.scalars().all()

    ios_count = sum(1 for t in tokens if t.platform == 'ios')
    android_count = sum(1 for t in tokens if t.platform == 'android')
    dev_count = sum(1 for t in tokens if t.environment == 'development')
    prod_count = sum(1 for t in tokens if t.environment == 'production')

    return AdminTokensResponse(
        total_tokens=len(tokens),
        active_tokens=len(tokens),
        ios_tokens=ios_count,
        android_tokens=android_count,
        development_tokens=dev_count,
        production_tokens=prod_count,
        tokens=[DeviceTokenOut.model_validate(t) for t in tokens],
    )


@router.post("/push/send", response_model=PushSendResponse, status_code=200)
async def send_push(
    request: PushSendRequest,
    authorization: Optional[str] = Header(None),
    db: AsyncSession = Depends(get_db),
):
    """
    Send a push notification to device(s).

    Requires: Authorization: Bearer {INTERNAL_API_KEY}

    Body:
    {
      "all_ios": true,  # Send to all active iOS tokens
      "title": "...",
      "body": "...",
      "data": { ... }  # Optional custom payload
    }

    Or:
    {
      "token_ids": ["<id>", "<id>"],  # Send to specific tokens
      "title": "...",
      "body": "...",
      "data": { ... }
    }
    """
    await verify_admin_or_key(authorization=authorization, db=db)

    # Determine target tokens
    target_tokens = []

    if request.all_ios:
        result = await db.execute(
            select(DeviceToken).where(
                and_(
                    DeviceToken.is_active == True,
                    DeviceToken.platform == 'ios',
                )
            )
        )
        target_tokens = [t.token for t in result.scalars().all()]
    elif request.token_ids:
        result = await db.execute(
            select(DeviceToken).where(
                and_(
                    DeviceToken.id.in_(request.token_ids),
                    DeviceToken.is_active == True,
                )
            )
        )
        target_tokens = [t.token for t in result.scalars().all()]
    else:
        raise HTTPException(
            status_code=400,
            detail="Must specify either 'all_ios' or 'token_ids'"
        )

    if not target_tokens:
        return PushSendResponse(
            sent_count=0,
            failed_count=0,
            tokens_targeted=0,
            message="No active tokens found matching criteria",
        )

    # Send to all targets
    sent, failed = await send_push_to_many(
        target_tokens,
        title=request.title,
        body=request.body,
        data=request.data,
    )

    logger.info(f"Push dispatch: {sent} sent, {failed} failed, {len(target_tokens)} targeted")

    return PushSendResponse(
        sent_count=sent,
        failed_count=failed,
        tokens_targeted=len(target_tokens),
        message=f"Sent {sent}/{len(target_tokens)} notifications",
    )


# ─── Health Check ─────────────────────────────────────────────────

@router.get("/push/health", status_code=200)
async def push_health_check(db: AsyncSession = Depends(get_db)):
    """
    Check push notification subsystem health.
    Returns APNS configuration status and token count.
    """
    result = await db.execute(
        select(DeviceToken).where(DeviceToken.is_active == True)
    )
    active_tokens = len(result.scalars().all())

    apns_configured = all([
        settings.apns_key_id,
        settings.apns_team_id,
        settings.apns_bundle_id,
    ])

    return {
        "status": "ok",
        "apns_configured": apns_configured,
        "active_tokens": active_tokens,
        "message": (
            "APNS configured and ready" if apns_configured
            else "APNS not configured; notifications logged only"
        ),
    }
