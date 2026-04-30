"""
APNS Client Service

Handles server-initiated push notification delivery via Apple Push Notification Service.
Uses aioapns for async HTTP/2 APNS communication, or falls back to dev-mode logging
if APNS credentials are not configured.
"""

import logging
import base64
import json
from typing import Optional, Tuple
from datetime import datetime

from app.config import settings

logger = logging.getLogger(__name__)

# Lazy-initialized APNS client
_apns_client = None
_apns_configured = False


def _init_apns_client():
    """
    Initialize aioapns client from env vars.
    Returns (client, configured) tuple.
    """
    global _apns_client, _apns_configured

    if _apns_configured:
        return _apns_client, True

    _apns_configured = True

    # Check if all required env vars are present
    if not all([
        settings.apns_key_id,
        settings.apns_team_id,
        settings.apns_bundle_id,
    ]):
        logger.info(
            "APNS not configured (missing APNS_KEY_ID, APNS_TEAM_ID, or APNS_BUNDLE_ID) — "
            "notifications will be logged only; tokens still register for offline queuing"
        )
        return None, False

    # Decode private key if provided via env (base64)
    apns_private_key_b64 = getattr(settings, 'apns_private_key_base64', None)
    apns_key_path = getattr(settings, 'apns_key_path', None)

    try:
        # Try aioapns client
        try:
            from aioapns import APNs
            from aioapns.credentials import CertificateCredentials

            if apns_private_key_b64:
                # Decode base64 key
                key_bytes = base64.b64decode(apns_private_key_b64)
                # Write to temp location or use in-memory
                import tempfile
                import os
                fd, temp_key_path = tempfile.mkstemp(suffix='.p8')
                try:
                    os.write(fd, key_bytes)
                    os.close(fd)

                    credentials = CertificateCredentials(
                        certificate=temp_key_path,
                        default_error_timeout=10,
                        default_expiration_offset=600,
                    )
                    _apns_client = APNs(credentials=credentials, sandbox=settings.apns_use_sandbox)
                    logger.info(
                        f"APNS client initialized via base64 key (sandbox={settings.apns_use_sandbox})"
                    )
                    return _apns_client, True
                finally:
                    try:
                        os.unlink(temp_key_path)
                    except:
                        pass

            elif apns_key_path:
                credentials = CertificateCredentials(
                    certificate=apns_key_path,
                    default_error_timeout=10,
                    default_expiration_offset=600,
                )
                _apns_client = APNs(credentials=credentials, sandbox=settings.apns_use_sandbox)
                logger.info(
                    f"APNS client initialized from key file (sandbox={settings.apns_use_sandbox})"
                )
                return _apns_client, True

            else:
                logger.warning("APNS credentials not available (no .p8 key) — dev mode")
                return None, False

        except ImportError:
            logger.warning("aioapns not installed; falling back to dev-mode logging")
            return None, False

    except Exception as e:
        logger.error(f"APNS client initialization failed: {e}")
        return None, False


async def send_push_to_token(
    device_token: str,
    title: str,
    body: str,
    badge: int = 1,
    sound: str = "default",
    category: str = "general",
    data: Optional[dict] = None,
) -> Tuple[bool, str]:
    """
    Send a push notification to a single APNS device token.

    Returns: (success: bool, message: str)
    """
    client, configured = _init_apns_client()

    payload_dict = {
        "aps": {
            "alert": {"title": title, "body": body},
            "badge": badge,
            "sound": sound,
            "category": category,
        }
    }
    if data:
        payload_dict.update(data)

    if not configured or client is None:
        # Dev mode: just log it
        logger.info(
            f"[APNS-DEV] → {device_token[:12]}...: {title} — {body}"
        )
        return True, "logged (APNS not configured)"

    try:
        # aioapns uses async/await
        result = await client.send_notification(
            device_token=device_token,
            notification_dict=payload_dict,
            topic=settings.apns_bundle_id,
        )

        if result.is_successful():
            logger.debug(f"APNS sent to {device_token[:12]}...")
            return True, "sent"
        else:
            logger.warning(
                f"APNS failed for {device_token[:12]}...: {result.description}"
            )
            return False, f"APNS error: {result.description}"

    except Exception as e:
        logger.error(f"APNS send error for {device_token[:12]}...: {e}")
        return False, f"exception: {str(e)}"


async def send_push_to_many(
    device_tokens: list,
    title: str,
    body: str,
    data: Optional[dict] = None,
) -> Tuple[int, int]:
    """
    Send a push notification to multiple tokens.

    Returns: (sent_count, failed_count)
    """
    sent = 0
    failed = 0

    for token in device_tokens:
        success, msg = await send_push_to_token(token, title, body, data=data)
        if success:
            sent += 1
        else:
            failed += 1

    return sent, failed
