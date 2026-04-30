"""
Runtime config routes.

GET /api/v1/config/mapbox-token
    Returns the Mapbox token + a server-stamped issued-at so clients can
    decide when to re-fetch. Public endpoint — no auth required (the
    token itself is a public-scope Mapbox key with HTTP-referer / bundle
    restrictions enforced on the Mapbox side).

GET /api/v1/config/runtime
    Combined endpoint returning everything the mobile app might want to
    pull at boot. Currently only Mapbox; extend as we add fields.
"""

from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from app.config import settings


router = APIRouter()


class MapboxTokenResponse(BaseModel):
    """Mapbox token payload returned to clients."""

    token: str
    issued_at: str  # ISO 8601 — clients use this to decide cache freshness
    # Suggested client TTL — matches Mapbox's recommendation that public
    # keys are long-lived but rotated on detected leakage. 86400 = 24h.
    suggested_refresh_seconds: int


class RuntimeConfigResponse(BaseModel):
    """All runtime-fetched config in one payload."""

    mapbox_token: Optional[str]
    mapbox_token_issued_at: str
    mapbox_token_suggested_refresh_seconds: int
    server_time: str  # ISO 8601 — useful for clock-drift sanity checks


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


@router.get("/mapbox-token", response_model=MapboxTokenResponse)
async def get_mapbox_token() -> MapboxTokenResponse:
    """
    Return the current Mapbox access token. The mobile app calls this on
    boot + every 24h to pick up any post-deploy rotation.

    503 when MAPBOX_ACCESS_TOKEN env var is unset (deploy misconfig).
    """
    token = settings.mapbox_access_token
    if not token:
        raise HTTPException(
            status_code=503,
            detail="MAPBOX_ACCESS_TOKEN env var is not configured on the server",
        )
    return MapboxTokenResponse(
        token=token,
        issued_at=_now_iso(),
        suggested_refresh_seconds=86400,
    )


@router.get("/runtime", response_model=RuntimeConfigResponse)
async def get_runtime_config() -> RuntimeConfigResponse:
    """
    One-shot config bundle. Preferred by the mobile boot path when more
    runtime fields land — saves a round-trip per field.
    """
    issued = _now_iso()
    return RuntimeConfigResponse(
        mapbox_token=settings.mapbox_access_token,
        mapbox_token_issued_at=issued,
        mapbox_token_suggested_refresh_seconds=86400,
        server_time=issued,
    )
