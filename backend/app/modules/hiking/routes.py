"""
HuntPlan AI — Hiking API Routes

Full CRUD for hiking trips and Appalachian Trail progress:
  - Create/list/delete hiking trips
  - Log AT progress (shelter visits, mile markers)
  - Get AT progress summary
"""

import uuid
from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy import select, and_, desc
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.database import get_db
from app.models.user import User
from app.models.hiking import HikingTrip, ATProgress
from app.modules.auth.dependencies import get_current_user


router = APIRouter()


# --- Request / Response Models ---

class CreateTripRequest(BaseModel):
    trail_id: str
    trail_type: str  # "at" or "statepark"
    start_date: str  # ISO date
    nights: int = 0
    tier: str  # "day", "overnight", "multiday"
    notes: Optional[str] = None


class UpdateTripRequest(BaseModel):
    start_date: Optional[str] = None
    nights: Optional[int] = None
    tier: Optional[str] = None
    notes: Optional[str] = None


class LogATProgressRequest(BaseModel):
    shelter_id: Optional[str] = None
    mile_marker: Optional[int] = None
    completed_at: Optional[str] = None  # ISO timestamp


# --- Helper functions ---

async def _get_trip(db: AsyncSession, trip_id: uuid.UUID, user_id: uuid.UUID) -> HikingTrip | None:
    """Get a trip and verify ownership."""
    result = await db.execute(
        select(HikingTrip).where(
            and_(HikingTrip.id == trip_id, HikingTrip.user_id == user_id)
        )
    )
    return result.scalar_one_or_none()


# --- Trip CRUD ---

@router.post("/trips", status_code=201)
async def create_trip(
    request: CreateTripRequest,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Create a new hiking trip."""
    try:
        start = datetime.fromisoformat(request.start_date).date()
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid date format. Use ISO format (YYYY-MM-DD).")

    # Validate tier
    valid_tiers = {"day", "overnight", "multiday"}
    if request.tier not in valid_tiers:
        raise HTTPException(status_code=400, detail=f"Tier must be one of: {valid_tiers}")

    trip = HikingTrip(
        user_id=user.id,
        trail_id=request.trail_id,
        trail_type=request.trail_type,
        start_date=start,
        nights=request.nights,
        tier=request.tier,
        notes=request.notes,
    )
    db.add(trip)
    await db.flush()

    return {
        "id": str(trip.id),
        "trail_id": trip.trail_id,
        "trail_type": trip.trail_type,
        "start_date": trip.start_date.isoformat(),
        "nights": trip.nights,
        "tier": trip.tier,
        "notes": trip.notes,
        "created_at": trip.created_at.isoformat() if trip.created_at else None,
    }


@router.get("/trips")
async def list_trips(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """List all hiking trips for the current user."""
    result = await db.execute(
        select(HikingTrip)
        .where(HikingTrip.user_id == user.id)
        .order_by(desc(HikingTrip.start_date))
    )
    trips = result.scalars().all()

    return {
        "trips": [
            {
                "id": str(t.id),
                "trail_id": t.trail_id,
                "trail_type": t.trail_type,
                "start_date": t.start_date.isoformat(),
                "nights": t.nights,
                "tier": t.tier,
                "notes": t.notes,
                "created_at": t.created_at.isoformat() if t.created_at else None,
            }
            for t in trips
        ],
        "count": len(trips),
    }


@router.get("/trips/{trip_id}")
async def get_trip(
    trip_id: str,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get details for a specific hiking trip."""
    tid = uuid.UUID(trip_id)
    trip = await _get_trip(db, tid, user.id)
    if not trip:
        raise HTTPException(status_code=404, detail="Trip not found")

    return {
        "id": str(trip.id),
        "trail_id": trip.trail_id,
        "trail_type": trip.trail_type,
        "start_date": trip.start_date.isoformat(),
        "nights": trip.nights,
        "tier": trip.tier,
        "notes": trip.notes,
        "created_at": trip.created_at.isoformat() if trip.created_at else None,
        "updated_at": trip.updated_at.isoformat() if trip.updated_at else None,
    }


@router.patch("/trips/{trip_id}")
async def update_trip(
    trip_id: str,
    request: UpdateTripRequest,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Update a hiking trip."""
    tid = uuid.UUID(trip_id)
    trip = await _get_trip(db, tid, user.id)
    if not trip:
        raise HTTPException(status_code=404, detail="Trip not found")

    if request.start_date:
        trip.start_date = datetime.fromisoformat(request.start_date).date()
    if request.nights is not None:
        trip.nights = request.nights
    if request.tier:
        trip.tier = request.tier
    if request.notes is not None:
        trip.notes = request.notes

    db.add(trip)
    await db.flush()

    return {
        "id": str(trip.id),
        "trail_id": trip.trail_id,
        "trail_type": trip.trail_type,
        "start_date": trip.start_date.isoformat(),
        "nights": trip.nights,
        "tier": trip.tier,
        "notes": trip.notes,
        "updated_at": trip.updated_at.isoformat() if trip.updated_at else None,
    }


@router.delete("/trips/{trip_id}", status_code=204)
async def delete_trip(
    trip_id: str,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Delete a hiking trip."""
    tid = uuid.UUID(trip_id)
    trip = await _get_trip(db, tid, user.id)
    if not trip:
        raise HTTPException(status_code=404, detail="Trip not found")

    await db.delete(trip)


# --- AT Progress ---

@router.post("/at-progress", status_code=201)
async def log_at_progress(
    request: LogATProgressRequest,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Log AT progress (shelter visit or mile marker)."""
    if not request.shelter_id and request.mile_marker is None:
        raise HTTPException(status_code=400, detail="Either shelter_id or mile_marker is required.")

    try:
        completed_at = datetime.fromisoformat(request.completed_at) if request.completed_at else datetime.now()
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid datetime format. Use ISO format.")

    progress = ATProgress(
        user_id=user.id,
        shelter_id=request.shelter_id,
        mile_marker=request.mile_marker,
        completed_at=completed_at,
    )
    db.add(progress)
    await db.flush()

    return {
        "id": str(progress.id),
        "shelter_id": progress.shelter_id,
        "mile_marker": progress.mile_marker,
        "completed_at": progress.completed_at.isoformat() if progress.completed_at else None,
        "created_at": progress.created_at.isoformat() if progress.created_at else None,
    }


@router.get("/at-progress")
async def get_at_progress(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get aggregate AT progress summary for current user."""
    result = await db.execute(
        select(ATProgress)
        .where(ATProgress.user_id == user.id)
        .order_by(desc(ATProgress.completed_at))
    )
    entries = result.scalars().all()

    # Aggregate stats
    max_mile = None
    shelters_visited = set()

    for entry in entries:
        if entry.mile_marker is not None:
            if max_mile is None or entry.mile_marker > max_mile:
                max_mile = entry.mile_marker
        if entry.shelter_id:
            shelters_visited.add(entry.shelter_id)

    return {
        "entries": [
            {
                "id": str(e.id),
                "shelter_id": e.shelter_id,
                "mile_marker": e.mile_marker,
                "completed_at": e.completed_at.isoformat() if e.completed_at else None,
            }
            for e in entries
        ],
        "summary": {
            "total_progress_entries": len(entries),
            "furthest_mile_marker": max_mile,
            "shelters_visited_count": len(shelters_visited),
            "shelters_visited": list(shelters_visited),
        },
    }
