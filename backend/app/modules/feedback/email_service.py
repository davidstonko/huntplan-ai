"""
MDHuntFishOutdoors — Email Notification Service

Sends email notifications when new feedback is submitted.
Uses Gmail SMTP with App Password authentication.

Setup:
  1. Go to myaccount.google.com → Security → 2-Step Verification → App passwords
  2. Generate an app password for "Mail"
  3. Set FEEDBACK_EMAIL and FEEDBACK_EMAIL_APP_PASSWORD in Render env vars
"""

import logging
import smtplib
import asyncio
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from datetime import datetime
from typing import Optional

from app.config import settings

logger = logging.getLogger(__name__)


# ─── Configuration ──────────────────────────────────────────────

FEEDBACK_EMAIL = getattr(settings, "feedback_email", None) or "feedback.mdhuntfishoutdoors@gmail.com"
FEEDBACK_EMAIL_PASSWORD = getattr(settings, "feedback_email_app_password", None)
SMTP_HOST = "smtp.gmail.com"
SMTP_PORT = 587


# ─── Email Templates ────────────────────────────────────────────

def _build_feedback_email(
    feedback_type: str,
    description: str,
    screen: Optional[str],
    active_tab: Optional[str],
    app_version: Optional[str],
    feedback_id: str,
    created_at: str,
    device_id: Optional[str] = None,
) -> tuple[str, str]:
    """Build subject and HTML body for a feedback notification email."""

    type_emoji = {"bug": "🐛", "outdated": "📅", "suggestion": "💡"}.get(feedback_type, "📩")
    type_label = {"bug": "Bug / Error Report", "outdated": "Outdated Information", "suggestion": "Feature Suggestion"}.get(feedback_type, feedback_type)

    subject = f"{type_emoji} [{type_label}] New feedback from MDHuntFishOutdoors"

    html = f"""
    <html>
    <body style="font-family: -apple-system, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: #1a1a1a; color: #ffffff; padding: 20px; border-radius: 8px 8px 0 0;">
            <h2 style="margin: 0; color: #E03C31;">MDHuntFishOutdoors</h2>
            <p style="margin: 5px 0 0; color: #FFD700; font-size: 14px;">User Feedback Received</p>
        </div>

        <div style="background: #f9f9f9; padding: 20px; border: 1px solid #ddd;">
            <table style="width: 100%; border-collapse: collapse;">
                <tr>
                    <td style="padding: 8px 0; font-weight: bold; width: 120px; vertical-align: top;">Type:</td>
                    <td style="padding: 8px 0;">{type_emoji} {type_label}</td>
                </tr>
                <tr>
                    <td style="padding: 8px 0; font-weight: bold; vertical-align: top;">Screen:</td>
                    <td style="padding: 8px 0;">{screen or 'N/A'} {('→ ' + active_tab) if active_tab else ''}</td>
                </tr>
                <tr>
                    <td style="padding: 8px 0; font-weight: bold; vertical-align: top;">App Version:</td>
                    <td style="padding: 8px 0;">{app_version or 'Unknown'}</td>
                </tr>
                <tr>
                    <td style="padding: 8px 0; font-weight: bold; vertical-align: top;">Submitted:</td>
                    <td style="padding: 8px 0;">{created_at}</td>
                </tr>
                <tr>
                    <td style="padding: 8px 0; font-weight: bold; vertical-align: top;">Feedback ID:</td>
                    <td style="padding: 8px 0; font-size: 12px; color: #666;">{feedback_id}</td>
                </tr>
            </table>

            <hr style="border: none; border-top: 1px solid #ddd; margin: 16px 0;">

            <h3 style="margin: 0 0 8px; color: #333;">Description</h3>
            <div style="background: #fff; padding: 12px; border-radius: 6px; border: 1px solid #e0e0e0; white-space: pre-wrap;">
{description}
            </div>
        </div>

        <div style="background: #333; color: #aaa; padding: 12px 20px; border-radius: 0 0 8px 8px; font-size: 12px;">
            <p style="margin: 0;">Reply to this email or manage feedback at your admin dashboard.</p>
            <p style="margin: 4px 0 0;">API: POST /api/v1/feedback/{feedback_id}/respond</p>
        </div>
    </body>
    </html>
    """

    return subject, html


# ─── Send Email ─────────────────────────────────────────────────

def _send_email_sync(to_email: str, subject: str, html_body: str) -> bool:
    """Send an email via Gmail SMTP (synchronous — run in executor)."""
    if not FEEDBACK_EMAIL_PASSWORD:
        logger.warning(
            "FEEDBACK_EMAIL_APP_PASSWORD not set — email notification skipped. "
            "Set this env var on Render to enable email alerts."
        )
        return False

    try:
        msg = MIMEMultipart("alternative")
        msg["From"] = f"MDHuntFishOutdoors Feedback <{FEEDBACK_EMAIL}>"
        msg["To"] = to_email
        msg["Subject"] = subject
        msg["Reply-To"] = FEEDBACK_EMAIL

        # Plain text fallback
        plain = f"{subject}\n\nCheck your email client's HTML rendering for full details."
        msg.attach(MIMEText(plain, "plain"))
        msg.attach(MIMEText(html_body, "html"))

        with smtplib.SMTP(SMTP_HOST, SMTP_PORT) as server:
            server.starttls()
            server.login(FEEDBACK_EMAIL, FEEDBACK_EMAIL_PASSWORD)
            server.sendmail(FEEDBACK_EMAIL, [to_email], msg.as_string())

        logger.info(f"Feedback notification email sent to {to_email}")
        return True

    except Exception as e:
        logger.error(f"Failed to send feedback email: {e}")
        return False


async def send_feedback_notification(
    feedback_type: str,
    description: str,
    feedback_id: str,
    screen: Optional[str] = None,
    active_tab: Optional[str] = None,
    app_version: Optional[str] = None,
    device_id: Optional[str] = None,
) -> bool:
    """
    Send a feedback notification email asynchronously.
    Runs SMTP in a thread pool to avoid blocking the event loop.
    """
    subject, html = _build_feedback_email(
        feedback_type=feedback_type,
        description=description,
        screen=screen,
        active_tab=active_tab,
        app_version=app_version,
        feedback_id=feedback_id,
        created_at=datetime.utcnow().strftime("%Y-%m-%d %H:%M UTC"),
        device_id=device_id,
    )

    loop = asyncio.get_event_loop()
    return await loop.run_in_executor(
        None, _send_email_sync, FEEDBACK_EMAIL, subject, html
    )
