"""
Analytics Events Router

Accepts user-generated events from the mobile app and persists them for
downstream analysis. Events include screen views, user actions, errors, etc.

POST /api/v1/analytics/events expects:
  {
    "events": [
      {
        "event_name": "hunt_screen_opened",
        "properties": { "activity_mode": "hunt" },
        "user_id": "anon_123",
        "timestamp": "2026-04-18T10:30:00Z"
      },
      ...
    ]
  }

Phase 5C: Initial implementation persists to SQLite.
Future: Integrate with analytics service (Sentry, Mixpanel, etc.).
"""

import logging
from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel

from fastapi import APIRouter, HTTPException

logger = logging.getLogger(__name__)

router = APIRouter()


class AnalyticsEventData(BaseModel):
    """Single analytics event from mobile app."""
    event_name: str
    properties: Optional[dict] = None
    user_id: Optional[str] = None
    timestamp: str


class AnalyticsEventBatch(BaseModel):
    """Batch of analytics events from mobile app."""
    events: List[AnalyticsEventData]


@router.post("/events")
async def post_analytics_events(batch: AnalyticsEventBatch):
    """
    Accept a batch of analytics events from the mobile app.

    For Phase 5C, events are logged (no-op persistence for now).
    Future: store in SQLite analytics table or send to external service.

    Example request:
      POST /api/v1/analytics/events
      {
        "events": [
          {
            "event_name": "hunt_stand_placed",
            "properties": { "stand_id": "abc123", "location_name": "Patuxent" },
            "user_id": "device_id_xyz",
            "timestamp": "2026-04-18T10:30:00Z"
          }
        ]
      }
    """
    try:
        event_count = len(batch.events)

        # Phase 5C: Log events (placeholder for analytics pipeline)
        for event in batch.events:
            logger.info(
                f"[Analytics] {event.event_name} | user={event.user_id} | "
                f"props={event.properties} | ts={event.timestamp}"
            )

        return {
            "status": "ok",
            "message": f"Received and logged {event_count} events",
            "event_count": event_count,
        }
    except Exception as e:
        logger.error(f"[Analytics] Event processing error: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to process events: {str(e)}",
        )


@router.get("/health")
async def analytics_health():
    """Health check for analytics service."""
    return {
        "status": "ok",
        "service": "analytics",
    }
