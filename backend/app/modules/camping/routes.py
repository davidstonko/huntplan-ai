"""
HuntPlan AI — Camping API Routes

Full CRUD for camping trips and group camping:
  - Create/list/delete camping trips
  - Create/join group camping via invite code
  - View group members
"""

import uuid
from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy import select, delete, and_
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.database import get_db
from app.models.user import User
from app.models.camping import CampingTrip, CampingGroup, CampingGroupMember
from app.modules.auth.dependencies import get_current_user
from app.modules.auth.service import generate_invite_code


router = APIRouter()

# MEMBER_COLORS for group consistency (matches deercamp)
MEMBER_COLORS = [
    "#C62828", "#1565C0", "#F9A825", "#6A1B9A", "#E65100",
    "#00838F", "#AD1457", "#283593", "#2E7D32", "#FF8F00",
]


# --- Request / Response Models ---

class CreateTripRequest(BaseModel):
    campground_id: str
    start_date: str  # ISO date
    end_date: str    # ISO date
    party_size: int = 1
    notes: Optional[str] = None


class UpdateTripRequest(BaseModel):
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    party_size: Optional[int] = None
    notes: Optional[str] = None


class CreateGroupRequest(BaseModel):
    name: str
    campground_id: str


class JoinGroupRequest(BaseModel):
    invite_code: str


# --- Helper functions ---

async def _get_trip(db: AsyncSession, trip_id: uuid.UUID, user_id: uuid.UUID) -> CampingTrip | None:
    """Get a trip and verify ownership."""
    result = await db.execute(
        select(CampingTrip).where(
            and_(CampingTrip.id == trip_id, CampingTrip.user_id == user_id)
        )
    )
    return result.scalar_one_or_none()


async def _get_group_membership(db: AsyncSession, group_code: str, user_id: uuid.UUID) -> CampingGroupMember | None:
    """Check if user is a member of a group."""
    result = await db.execute(
        select(CampingGroupMember).where(
            and_(CampingGroupMember.group_code == group_code, CampingGroupMember.user_id == user_id)
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
    """Create a new camping trip."""
    try:
        start = datetime.fromisoformat(request.start_date).date()
        end = datetime.fromisoformat(request.end_date).date()
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid date format. Use ISO format (YYYY-MM-DD).")

    if start > end:
        raise HTTPException(status_code=400, detail="Start date must be before end date.")

    trip = CampingTrip(
        user_id=user.id,
        campground_id=request.campground_id,
        start_date=start,
        end_date=end,
        party_size=request.party_size,
        notes=request.notes,
    )
    db.add(trip)
    await db.flush()

    return {
        "id": str(trip.id),
        "campground_id": trip.campground_id,
        "start_date": trip.start_date.isoformat(),
        "end_date": trip.end_date.isoformat(),
        "party_size": trip.party_size,
        "notes": trip.notes,
        "created_at": trip.created_at.isoformat() if trip.created_at else None,
    }


@router.get("/trips")
async def list_trips(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """List all camping trips for the current user."""
    result = await db.execute(
        select(CampingTrip)
        .where(CampingTrip.user_id == user.id)
        .order_by(CampingTrip.start_date.desc())
    )
    trips = result.scalars().all()

    return {
        "trips": [
            {
                "id": str(t.id),
                "campground_id": t.campground_id,
                "start_date": t.start_date.isoformat(),
                "end_date": t.end_date.isoformat(),
                "party_size": t.party_size,
                "notes": t.notes,
                "group_code": t.group_code,
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
    """Get details for a specific camping trip."""
    tid = uuid.UUID(trip_id)
    trip = await _get_trip(db, tid, user.id)
    if not trip:
        raise HTTPException(status_code=404, detail="Trip not found")

    return {
        "id": str(trip.id),
        "campground_id": trip.campground_id,
        "start_date": trip.start_date.isoformat(),
        "end_date": trip.end_date.isoformat(),
        "party_size": trip.party_size,
        "notes": trip.notes,
        "group_code": trip.group_code,
        "gear_packed": trip.gear_packed or {},
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
    """Update a camping trip."""
    tid = uuid.UUID(trip_id)
    trip = await _get_trip(db, tid, user.id)
    if not trip:
        raise HTTPException(status_code=404, detail="Trip not found")

    if request.start_date:
        trip.start_date = datetime.fromisoformat(request.start_date).date()
    if request.end_date:
        trip.end_date = datetime.fromisoformat(request.end_date).date()
    if request.party_size is not None:
        trip.party_size = request.party_size
    if request.notes is not None:
        trip.notes = request.notes

    db.add(trip)
    await db.flush()

    return {
        "id": str(trip.id),
        "campground_id": trip.campground_id,
        "start_date": trip.start_date.isoformat(),
        "end_date": trip.end_date.isoformat(),
        "party_size": trip.party_size,
        "notes": trip.notes,
        "updated_at": trip.updated_at.isoformat() if trip.updated_at else None,
    }


@router.delete("/trips/{trip_id}", status_code=204)
async def delete_trip(
    trip_id: str,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Delete a camping trip."""
    tid = uuid.UUID(trip_id)
    trip = await _get_trip(db, tid, user.id)
    if not trip:
        raise HTTPException(status_code=404, detail="Trip not found")

    await db.delete(trip)


# --- Group CRUD ---

@router.post("/groups", status_code=201)
async def create_group(
    request: CreateGroupRequest,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Create a new camping group. Creator becomes admin."""
    code = generate_invite_code()

    group = CampingGroup(
        code=code,
        name=request.name,
        created_by=user.id,
        campground_id=request.campground_id,
    )
    db.add(group)
    await db.flush()

    # Add creator as admin member
    member = CampingGroupMember(
        group_code=code,
        user_id=user.id,
        username=user.handle,
        role="admin",
    )
    db.add(member)
    await db.flush()

    return {
        "code": code,
        "name": group.name,
        "campground_id": group.campground_id,
        "invite_code": code,
    }


@router.post("/groups/{code}/join", status_code=200)
async def join_group(
    code: str,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Join a camping group using invite code."""
    # Normalize code
    code_upper = code.upper()

    result = await db.execute(
        select(CampingGroup).where(
            and_(CampingGroup.code == code_upper, CampingGroup.is_active == True)
        )
    )
    group = result.scalar_one_or_none()
    if not group:
        raise HTTPException(status_code=404, detail="Invalid invite code")

    # Check if already a member
    existing = await _get_group_membership(db, code_upper, user.id)
    if existing:
        return {"message": "Already a member", "group_code": code_upper}

    # Assign color based on member count
    color_index = group.member_count % len(MEMBER_COLORS)

    member = CampingGroupMember(
        group_code=code_upper,
        user_id=user.id,
        username=user.handle,
        role="member",
    )
    db.add(member)

    group.member_count += 1
    db.add(group)
    await db.flush()

    return {
        "message": "Joined group",
        "group_code": code_upper,
        "group_name": group.name,
    }


@router.get("/groups/{code}")
async def get_group(
    code: str,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get details for a camping group with members."""
    code_upper = code.upper()

    membership = await _get_group_membership(db, code_upper, user.id)
    if not membership:
        raise HTTPException(status_code=403, detail="Not a member of this group")

    result = await db.execute(
        select(CampingGroup).where(CampingGroup.code == code_upper)
    )
    group = result.scalar_one_or_none()
    if not group:
        raise HTTPException(status_code=404, detail="Group not found")

    # Fetch members
    members_result = await db.execute(
        select(CampingGroupMember).where(CampingGroupMember.group_code == code_upper)
    )
    members = members_result.scalars().all()

    return {
        "code": group.code,
        "name": group.name,
        "campground_id": group.campground_id,
        "member_count": group.member_count,
        "members": [
            {
                "user_id": str(m.user_id),
                "username": m.username,
                "role": m.role,
                "joined_at": m.joined_at.isoformat() if m.joined_at else None,
            }
            for m in members
        ],
        "created_at": group.created_at.isoformat() if group.created_at else None,
    }
