"""
APNS Push Notification Service — iOS Push via Apple Push Notification Service

Sends push notifications to iOS devices for:
- Camp activity (member joined, new pin/photo, plan imported)
- Season alerts (season opening/closing reminders)
- Regulation changes (updated rules for subscribed species/counties)
- Weather alerts (severe conditions at favorited lands)

Uses PyAPNs2 for APNS HTTP/2 communication.
Falls back to logging if APNS is not configured (dev mode).
"""

import logging
from typing import Optional
from datetime import datetime

from app.config import settings

logger = logging.getLogger(__name__)

# ─── APNS Client (Lazy Init) ───────────────────────────────────

_apns_client = None


def get_apns_client():
    """
    Lazy-init APNS client using .p8 token-based auth.
    Returns None if not configured (logs notifications instead).
    """
    global _apns_client
    if _apns_client is not None:
        return _apns_client

    if not settings.apns_key_path or not settings.apns_key_id:
        logger.info("APNS not configured — notifications will be logged only")
        return None

    try:
        from apns2.client import APNsClient
        from apns2.credentials import TokenCredentials

        token_credentials = TokenCredentials(
            auth_key_path=settings.apns_key_path,
            auth_key_id=settings.apns_key_id,
            team_id=settings.apns_team_id,
        )

        _apns_client = APNsClient(
            credentials=token_credentials,
            use_sandbox=settings.apns_use_sandbox,
        )
        logger.info(f"APNS client initialized (sandbox={settings.apns_use_sandbox})")
        return _apns_client
    except ImportError:
        logger.warning("PyAPNs2 not installed — pip install apns2")
        return None
    except Exception as e:
        logger.error(f"APNS client init failed: {e}")
        return None

# ─── Notification Builders ──────────────────────────────────────


def _build_payload(
    title: str,
    body: str,
    badge: int = 1,
    sound: str = "default",
    category: str = "general",
    data: Optional[dict] = None,
) -> dict:
    """
    Build an APNS payload dict.
    Compatible with PyAPNs2 Payload or raw dict for logging.
    """
    payload = {
        "aps": {
            "alert": {"title": title, "body": body},
            "badge": badge,
            "sound": sound,
            "category": category,
        }
    }
    if data:
        payload.update(data)
    return payload


async def send_push(
    device_token: str,
    title: str,
    body: str,
    badge: int = 1,
    sound: str = "default",
    category: str = "general",
    data: Optional[dict] = None,
) -> bool:    """
    Send a push notification to a single device.
    Returns True if sent (or logged), False on error.
    """
    client = get_apns_client()
    payload_dict = _build_payload(title, body, badge, sound, category, data)

    if client is None:
        logger.info(f"[APNS-DEV] → {device_token[:12]}...: {title} — {body}")
        return True

    try:
        from apns2.payload import Payload

        payload = Payload(
            alert={"title": title, "body": body},
            badge=badge,
            sound=sound,
            category=category,
            custom=data or {},
        )

        import asyncio

        def _send():
            return client.send_notification(
                device_token,
                payload,
                topic=settings.apns_bundle_id,
            )

        result = await asyncio.get_event_loop().run_in_executor(None, _send)
        if result.is_successful:
            logger.debug(f"APNS sent to {device_token[:12]}...")
            return True
        else:
            logger.warning(f"APNS failed for {device_token[:12]}...: {result.description}")
            return False
    except Exception as e:
        logger.error(f"APNS send error: {e}")
        return False

# ─── High-Level Notification Functions ──────────────────────────


async def notify_camp_members(
    db,
    camp_id: str,
    exclude_user_id: str,
    title: str,
    body: str,
    category: str = "camp_activity",
    data: Optional[dict] = None,
):
    """
    Send push to all camp members except the actor.
    Queries member device tokens and dispatches in parallel.
    """
    from sqlalchemy import text

    result = await db.execute(
        text("""
            SELECT u.device_token
            FROM camp_members cm
            JOIN users u ON u.id = cm.user_id
            WHERE cm.camp_id = :camp_id
              AND cm.user_id != :exclude_id
              AND u.device_token IS NOT NULL
              AND u.device_token != ''
        """),
        {"camp_id": camp_id, "exclude_id": exclude_user_id},
    )
    tokens = [row.device_token for row in result.fetchall()]

    if not tokens:
        return

    push_data = {"camp_id": camp_id}
    if data:
        push_data.update(data)

    sent_count = 0
    for token in tokens:
        success = await send_push(token, title, body, category=category, data=push_data)
        if success:
            sent_count += 1

    logger.info(f"Camp {camp_id}: sent {sent_count}/{len(tokens)} push notifications")

async def notify_season_alert(
    db,
    species: str,
    season_name: str,
    event: str,  # "opening" or "closing"
    date_str: str,
):
    """
    Send season opening/closing alerts to users who have season_alerts enabled.
    For now, sends to all users with device tokens (preference filtering TBD).
    """
    from sqlalchemy import text

    title = f"🦌 {species.title()} Season {event.title()}"
    body = f"{season_name} {event}s on {date_str}. Check regulations before heading out!"

    result = await db.execute(
        text("SELECT device_token FROM users WHERE device_token IS NOT NULL AND device_token != ''")
    )
    tokens = [row.device_token for row in result.fetchall()]

    sent = 0
    for token in tokens:
        if await send_push(token, title, body, category="season_alert"):
            sent += 1

    logger.info(f"Season alert ({species} {event}): sent to {sent}/{len(tokens)} devices")