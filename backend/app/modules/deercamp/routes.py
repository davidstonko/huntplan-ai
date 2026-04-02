"""
HuntPlan AI — Deer Camp API Routes

Full CRUD for collaborative hunting camps:
  - Create/list/delete camps
  - Join via invite code
  - Add/remove members
  - Add/remove annotations (waypoints, routes, areas, tracks, notes)
  - Upload geotagged photos
  - Activity feed
  - Sync endpoint for offline-first clients
"""

import uuid
from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, status, Query
from pydantic import BaseModel
from sqlalchemy import select, delete, func as sa_func, and_
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.database import get_db
from app.models.user import User
from app.models.deercamp import (
    DeerCamp, CampMember, SharedAnnotation, CampPhoto, CampActivity,
)
from app.modules.auth.dependencies import get_current_user
from app.modules.auth.service import generate_invite_code
from app.modules.deercamp.intelligence_service import generate_camp_intelligence


router = APIRouter()

# Member color rotation (matches mobile MEMBER_COLORS)
MEMBER_COLORS = [
    "#C62828", "#1565C0", "#F9A825", "#6A1B9A", "#E65100",
    "#00838F", "#AD1457", "#283593", "#2E7D32", "#FF8F00",
]


# --- Request / Response Models ---

class CreateCampRequest(BaseModel):
    name: str
    center_lat: float
    center_lng: float
    linked_land_id: Optional[str] = None

class JoinCampRequest(BaseModel):
    invite_code: str
    username: Optional[str] = None

class AddAnnotationRequest(BaseModel):
    annotation_type: str  # waypoint | route | area | track | note
    data: dict
    imported_from_plan_id: Optional[str] = None

class AddPhotoRequest(BaseModel):
    image_key: str
    lat: float
    lng: float
    caption: Optional[str] = None

class SyncRequest(BaseModel):
    """Offline-first sync: client sends last_synced timestamp, gets everything newer."""
    last_synced: Optional[str] = None  # ISO timestamp or None for full sync


class HarvestLocation(BaseModel):
    """Harvest location data point."""
    name: str
    lat: float
    lng: float
    count: int


class WeaponStat(BaseModel):
    """Weapon effectiveness statistics."""
    attempts: int = 0
    harvests: int = 0


class SeasonalData(BaseModel):
    """Monthly seasonal activity data."""
    month: str
    activity: int  # Percentage


class TopStand(BaseModel):
    """Top hunting stand/location."""
    name: str
    harvests: int


class CampBounds(BaseModel):
    """Geographic bounds of camp area."""
    north: float
    south: float
    east: float
    west: float


class CampIntelligenceRequest(BaseModel):
    """Request for AI intelligence analysis of camp data."""
    data_point_count: int
    members_count: int
    species_breakdown: dict  # {"Deer": 45, "Turkey": 12}
    harvest_locations: list[HarvestLocation] = []
    time_patterns: dict  # {"morning": 65, "midday": 15, "evening": 20}
    seasonal_data: list[SeasonalData] = []
    weapon_stats: dict  # {"Archery": {"attempts": 20, "harvests": 5}, ...}
    average_harvest_weight: Optional[float] = None
    average_antler_points: Optional[float] = None
    top_stands: list[TopStand] = []
    camp_bounds: Optional[CampBounds] = None


class CampIntelligenceResponse(BaseModel):
    """AI-generated intelligence response."""
    status: str = "ok"
    summary: Optional[str] = None
    recommendations: list[str] = []
    patterns: list[str] = []
    predicted_best_days: list[str] = []
    strategy_suggestion: Optional[str] = None
    analyzed_at: Optional[str] = None
    data_point_count: Optional[int] = None
    members_count: Optional[int] = None
    fallback: bool = False  # True if LLM failed and using fallback
    # For tier gating
    message: Optional[str] = None
    required_count: Optional[int] = None


class CampSummary(BaseModel):
    id: str
    name: str
    invite_code: str
    member_count: int
    center_lat: float
    center_lng: float
    created_at: str

class CampDetail(BaseModel):
    id: str
    name: str
    invite_code: str
    center_lat: float
    center_lng: float
    default_zoom: float
    linked_land_id: Optional[str] = None
    members: list
    annotations: list
    photos: list
    activity_feed: list


# --- Helper functions ---

async def _get_membership(db: AsyncSession, camp_id: uuid.UUID, user_id: uuid.UUID) -> CampMember | None:
    result = await db.execute(
        select(CampMember).where(
            and_(CampMember.camp_id == camp_id, CampMember.user_id == user_id)
        )
    )
    return result.scalar_one_or_none()


async def _log_activity(db: AsyncSession, camp_id: uuid.UUID, user: User, action: str,
                         annotation_id: uuid.UUID = None, photo_id: uuid.UUID = None):
    activity = CampActivity(
        camp_id=camp_id,
        user_id=user.id,
        username=user.handle,
        action=action,
        annotation_id=annotation_id,
        photo_id=photo_id,
    )
    db.add(activity)


# --- Camp CRUD ---

@router.post("/camps", status_code=201)
async def create_camp(
    request: CreateCampRequest,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Create a new deer camp. Creator becomes admin."""
    camp = DeerCamp(
        name=request.name,
        created_by=user.id,
        invite_code=generate_invite_code(),
        center_lat=request.center_lat,
        center_lng=request.center_lng,
        linked_land_id=request.linked_land_id,
    )
    db.add(camp)
    await db.flush()

    # Add creator as admin member
    member = CampMember(
        camp_id=camp.id,
        user_id=user.id,
        username=user.handle,
        role="admin",
        color=MEMBER_COLORS[0],
    )
    db.add(member)

    await _log_activity(db, camp.id, user, "created_camp")
    await db.flush()

    return {
        "id": str(camp.id),
        "name": camp.name,
        "invite_code": camp.invite_code,
        "center_lat": camp.center_lat,
        "center_lng": camp.center_lng,
    }


@router.get("/camps")
async def list_camps(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """List all camps the current user is a member of."""
    result = await db.execute(
        select(DeerCamp)
        .join(CampMember, CampMember.camp_id == DeerCamp.id)
        .where(and_(CampMember.user_id == user.id, DeerCamp.is_active == True))
        .order_by(DeerCamp.created_at.desc())
    )
    camps = result.scalars().all()

    return {
        "camps": [
            {
                "id": str(c.id),
                "name": c.name,
                "invite_code": c.invite_code,
                "member_count": c.member_count,
                "center_lat": c.center_lat,
                "center_lng": c.center_lng,
                "created_at": c.created_at.isoformat() if c.created_at else None,
            }
            for c in camps
        ],
        "count": len(camps),
    }


@router.get("/camps/{camp_id}")
async def get_camp(
    camp_id: str,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get full camp details including members, annotations, photos, and activity feed."""
    cid = uuid.UUID(camp_id)

    # Verify membership
    membership = await _get_membership(db, cid, user.id)
    if not membership:
        raise HTTPException(status_code=403, detail="Not a member of this camp")

    # Fetch camp
    result = await db.execute(select(DeerCamp).where(DeerCamp.id == cid))
    camp = result.scalar_one_or_none()
    if not camp:
        raise HTTPException(status_code=404, detail="Camp not found")

    # Fetch members
    members_result = await db.execute(
        select(CampMember).where(CampMember.camp_id == cid)
    )
    members = members_result.scalars().all()

    # Fetch annotations
    annot_result = await db.execute(
        select(SharedAnnotation).where(SharedAnnotation.camp_id == cid)
        .order_by(SharedAnnotation.created_at.desc())
    )
    annotations = annot_result.scalars().all()

    # Fetch photos
    photo_result = await db.execute(
        select(CampPhoto).where(CampPhoto.camp_id == cid)
        .order_by(CampPhoto.uploaded_at.desc())
    )
    photos = photo_result.scalars().all()

    # Fetch activity feed (last 50)
    feed_result = await db.execute(
        select(CampActivity).where(CampActivity.camp_id == cid)
        .order_by(CampActivity.timestamp.desc())
        .limit(50)
    )
    feed = feed_result.scalars().all()

    return {
        "id": str(camp.id),
        "name": camp.name,
        "invite_code": camp.invite_code,
        "center_lat": camp.center_lat,
        "center_lng": camp.center_lng,
        "default_zoom": camp.default_zoom,
        "linked_land_id": camp.linked_land_id,
        "members": [
            {
                "user_id": str(m.user_id),
                "username": m.username,
                "role": m.role,
                "color": m.color,
                "joined_at": m.joined_at.isoformat() if m.joined_at else None,
            }
            for m in members
        ],
        "annotations": [
            {
                "id": str(a.id),
                "type": a.annotation_type,
                "created_by": str(a.created_by),
                "data": a.data,
                "imported_from_plan_id": a.imported_from_plan_id,
                "created_at": a.created_at.isoformat() if a.created_at else None,
            }
            for a in annotations
        ],
        "photos": [
            {
                "id": str(p.id),
                "uploaded_by": str(p.uploaded_by),
                "image_key": p.image_key,
                "lat": p.lat,
                "lng": p.lng,
                "caption": p.caption,
                "uploaded_at": p.uploaded_at.isoformat() if p.uploaded_at else None,
            }
            for p in photos
        ],
        "activity_feed": [
            {
                "id": str(f.id),
                "user_id": str(f.user_id),
                "username": f.username,
                "action": f.action,
                "annotation_id": str(f.annotation_id) if f.annotation_id else None,
                "photo_id": str(f.photo_id) if f.photo_id else None,
                "timestamp": f.timestamp.isoformat() if f.timestamp else None,
            }
            for f in feed
        ],
    }


@router.delete("/camps/{camp_id}", status_code=204)
async def delete_camp(
    camp_id: str,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Delete a camp. Only the admin (creator) can delete."""
    cid = uuid.UUID(camp_id)

    membership = await _get_membership(db, cid, user.id)
    if not membership or membership.role != "admin":
        raise HTTPException(status_code=403, detail="Only the camp admin can delete")

    result = await db.execute(select(DeerCamp).where(DeerCamp.id == cid))
    camp = result.scalar_one_or_none()
    if not camp:
        raise HTTPException(status_code=404, detail="Camp not found")

    # Cascade deletes members, annotations, photos, activity via FK ondelete
    await db.delete(camp)


# --- Join / Leave ---

@router.post("/camps/join")
async def join_camp(
    request: JoinCampRequest,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Join a camp using an invite code."""
    result = await db.execute(
        select(DeerCamp).where(
            and_(DeerCamp.invite_code == request.invite_code.upper(), DeerCamp.is_active == True)
        )
    )
    camp = result.scalar_one_or_none()
    if not camp:
        raise HTTPException(status_code=404, detail="Invalid invite code")

    # Check if already a member
    existing = await _get_membership(db, camp.id, user.id)
    if existing:
        return {"message": "Already a member", "camp_id": str(camp.id)}

    # Assign color based on current member count
    color_index = camp.member_count % len(MEMBER_COLORS)

    member = CampMember(
        camp_id=camp.id,
        user_id=user.id,
        username=request.username or user.handle,
        role="member",
        color=MEMBER_COLORS[color_index],
    )
    db.add(member)

    camp.member_count += 1
    db.add(camp)

    await _log_activity(db, camp.id, user, "joined")
    await db.flush()

    return {
        "message": "Joined camp",
        "camp_id": str(camp.id),
        "camp_name": camp.name,
    }


@router.post("/camps/{camp_id}/leave")
async def leave_camp(
    camp_id: str,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Leave a camp. Admins cannot leave (must delete instead)."""
    cid = uuid.UUID(camp_id)

    membership = await _get_membership(db, cid, user.id)
    if not membership:
        raise HTTPException(status_code=404, detail="Not a member")
    if membership.role == "admin":
        raise HTTPException(status_code=400, detail="Admins cannot leave. Delete the camp instead.")

    await db.delete(membership)

    result = await db.execute(select(DeerCamp).where(DeerCamp.id == cid))
    camp = result.scalar_one_or_none()
    if camp:
        camp.member_count = max(0, camp.member_count - 1)
        db.add(camp)

    await _log_activity(db, cid, user, "left")


@router.delete("/camps/{camp_id}/members/{member_user_id}")
async def remove_member(
    camp_id: str,
    member_user_id: str,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Remove a member from camp. Only admins can remove."""
    cid = uuid.UUID(camp_id)

    admin_membership = await _get_membership(db, cid, user.id)
    if not admin_membership or admin_membership.role != "admin":
        raise HTTPException(status_code=403, detail="Only admins can remove members")

    target_uid = uuid.UUID(member_user_id)
    target_membership = await _get_membership(db, cid, target_uid)
    if not target_membership:
        raise HTTPException(status_code=404, detail="Member not found")

    await db.delete(target_membership)

    result = await db.execute(select(DeerCamp).where(DeerCamp.id == cid))
    camp = result.scalar_one_or_none()
    if camp:
        camp.member_count = max(0, camp.member_count - 1)
        db.add(camp)

    return {"message": "Member removed"}


# --- Annotations ---

@router.post("/camps/{camp_id}/annotations", status_code=201)
async def add_annotation(
    camp_id: str,
    request: AddAnnotationRequest,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Add a shared annotation (waypoint, route, area, track, note) to the camp map."""
    cid = uuid.UUID(camp_id)

    membership = await _get_membership(db, cid, user.id)
    if not membership:
        raise HTTPException(status_code=403, detail="Not a member of this camp")

    valid_types = {"waypoint", "route", "area", "track", "note"}
    if request.annotation_type not in valid_types:
        raise HTTPException(status_code=400, detail=f"Invalid type. Must be one of: {valid_types}")

    annotation = SharedAnnotation(
        camp_id=cid,
        created_by=user.id,
        annotation_type=request.annotation_type,
        data=request.data,
        imported_from_plan_id=request.imported_from_plan_id,
    )
    db.add(annotation)
    await db.flush()

    action_map = {
        "waypoint": "added_waypoint",
        "route": "added_route",
        "area": "added_area",
        "track": "added_track",
        "note": "added_note",
    }
    await _log_activity(db, cid, user, action_map[request.annotation_type], annotation_id=annotation.id)

    return {
        "id": str(annotation.id),
        "type": annotation.annotation_type,
        "created_by": str(annotation.created_by),
        "data": annotation.data,
        "created_at": annotation.created_at.isoformat() if annotation.created_at else None,
    }


@router.delete("/camps/{camp_id}/annotations/{annotation_id}")
async def remove_annotation(
    camp_id: str,
    annotation_id: str,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Remove an annotation. Members can remove their own; admins can remove any."""
    cid = uuid.UUID(camp_id)
    aid = uuid.UUID(annotation_id)

    membership = await _get_membership(db, cid, user.id)
    if not membership:
        raise HTTPException(status_code=403, detail="Not a member")

    result = await db.execute(
        select(SharedAnnotation).where(
            and_(SharedAnnotation.id == aid, SharedAnnotation.camp_id == cid)
        )
    )
    annotation = result.scalar_one_or_none()
    if not annotation:
        raise HTTPException(status_code=404, detail="Annotation not found")

    # Members can only remove their own; admins can remove any
    if annotation.created_by != user.id and membership.role != "admin":
        raise HTTPException(status_code=403, detail="Can only remove your own annotations")

    await db.delete(annotation)
    await _log_activity(db, cid, user, "removed_annotation", annotation_id=aid)

    return {"message": "Annotation removed"}


# --- Photos ---

@router.post("/camps/{camp_id}/photos", status_code=201)
async def add_photo(
    camp_id: str,
    request: AddPhotoRequest,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Add a geotagged photo to the camp."""
    cid = uuid.UUID(camp_id)

    membership = await _get_membership(db, cid, user.id)
    if not membership:
        raise HTTPException(status_code=403, detail="Not a member")

    photo = CampPhoto(
        camp_id=cid,
        uploaded_by=user.id,
        image_key=request.image_key,
        lat=request.lat,
        lng=request.lng,
        caption=request.caption,
    )
    db.add(photo)
    await db.flush()

    await _log_activity(db, cid, user, "added_photo", photo_id=photo.id)

    return {
        "id": str(photo.id),
        "image_key": photo.image_key,
        "lat": photo.lat,
        "lng": photo.lng,
        "caption": photo.caption,
    }


@router.delete("/camps/{camp_id}/photos/{photo_id}")
async def remove_photo(
    camp_id: str,
    photo_id: str,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Remove a photo. Members can remove their own; admins can remove any."""
    cid = uuid.UUID(camp_id)
    pid = uuid.UUID(photo_id)

    membership = await _get_membership(db, cid, user.id)
    if not membership:
        raise HTTPException(status_code=403, detail="Not a member")

    result = await db.execute(
        select(CampPhoto).where(and_(CampPhoto.id == pid, CampPhoto.camp_id == cid))
    )
    photo = result.scalar_one_or_none()
    if not photo:
        raise HTTPException(status_code=404, detail="Photo not found")

    if photo.uploaded_by != user.id and membership.role != "admin":
        raise HTTPException(status_code=403, detail="Can only remove your own photos")

    await db.delete(photo)
    return {"message": "Photo removed"}


# --- Activity Feed ---

@router.get("/camps/{camp_id}/feed")
async def get_activity_feed(
    camp_id: str,
    limit: int = Query(30, ge=1, le=100),
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get the activity feed for a camp."""
    cid = uuid.UUID(camp_id)

    membership = await _get_membership(db, cid, user.id)
    if not membership:
        raise HTTPException(status_code=403, detail="Not a member")

    result = await db.execute(
        select(CampActivity)
        .where(CampActivity.camp_id == cid)
        .order_by(CampActivity.timestamp.desc())
        .limit(limit)
    )
    feed = result.scalars().all()

    return {
        "feed": [
            {
                "id": str(f.id),
                "user_id": str(f.user_id),
                "username": f.username,
                "action": f.action,
                "annotation_id": str(f.annotation_id) if f.annotation_id else None,
                "photo_id": str(f.photo_id) if f.photo_id else None,
                "timestamp": f.timestamp.isoformat() if f.timestamp else None,
            }
            for f in feed
        ],
        "count": len(feed),
    }


# --- AI Intelligence Endpoint ---

@router.post("/camps/{camp_id}/intelligence", response_model=CampIntelligenceResponse)
async def analyze_camp_intelligence(
    camp_id: str,
    request: CampIntelligenceRequest,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    AI "Learns Your Deer Camp" — Analyze aggregated camp data and return intelligent hunting insights.

    Requires:
    - User must be a member of the camp
    - At least 50 data points to unlock AI insights (tier gating)

    Returns:
    - AI-generated summary of camp patterns
    - Specific recommendations for next season
    - Notable patterns in the data
    - Predicted best hunting days/windows
    - Overall camp strategy suggestion

    Falls back to rule-based analysis if LLM unavailable.

    Example request:
    ```json
    {
        "data_point_count": 145,
        "members_count": 4,
        "species_breakdown": {"Deer": 89, "Turkey": 12},
        "harvest_locations": [
            {"name": "Ridge Stand", "lat": 39.5, "lng": -78.2, "count": 34},
            {"name": "Creek Bottom", "lat": 39.45, "lng": -78.15, "count": 28}
        ],
        "time_patterns": {"morning": 65, "midday": 10, "evening": 25},
        "seasonal_data": [
            {"month": "October", "activity": 45},
            {"month": "November", "activity": 92}
        ],
        "weapon_stats": {
            "Archery": {"attempts": 45, "harvests": 12},
            "Firearms": {"attempts": 32, "harvests": 18}
        },
        "average_harvest_weight": 187.5,
        "average_antler_points": 7.2,
        "top_stands": [
            {"name": "Ridge Stand", "harvests": 34},
            {"name": "Creek Bottom", "harvests": 28}
        ]
    }
    ```
    """
    cid = uuid.UUID(camp_id)

    # Verify user is a member of this camp
    membership = await _get_membership(db, cid, user.id)
    if not membership:
        raise HTTPException(status_code=403, detail="Not a member of this camp")

    # Convert Pydantic models to dict for intelligence service
    camp_data = {
        "data_point_count": request.data_point_count,
        "members_count": request.members_count,
        "species_breakdown": request.species_breakdown,
        "harvest_locations": [loc.model_dump() for loc in request.harvest_locations],
        "time_patterns": request.time_patterns,
        "seasonal_data": [sd.model_dump() for sd in request.seasonal_data],
        "weapon_stats": request.weapon_stats,
        "average_harvest_weight": request.average_harvest_weight,
        "average_antler_points": request.average_antler_points,
        "top_stands": [ts.model_dump() for ts in request.top_stands],
        "camp_bounds": request.camp_bounds.model_dump() if request.camp_bounds else None,
    }

    # Generate intelligence analysis
    result = await generate_camp_intelligence(camp_data)

    # Check for tier gating (insufficient data)
    if result.get("status") == "insufficient_data":
        raise HTTPException(
            status_code=403,
            detail=f"Need at least {result['required_count']} data points to unlock AI insights. Currently at {result['data_point_count']}.",
        )

    return CampIntelligenceResponse(
        status=result.get("status", "ok"),
        summary=result.get("summary"),
        recommendations=result.get("recommendations", []),
        patterns=result.get("patterns", []),
        predicted_best_days=result.get("predicted_best_days", []),
        strategy_suggestion=result.get("strategy_suggestion"),
        analyzed_at=result.get("analyzed_at"),
        data_point_count=result.get("data_point_count"),
        members_count=result.get("members_count"),
        fallback=result.get("fallback", False),
    )


# --- Sync endpoint (offline-first) ---

@router.post("/camps/{camp_id}/sync")
async def sync_camp(
    camp_id: str,
    request: SyncRequest,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Sync endpoint for offline-first clients.
    Client sends last_synced timestamp; server returns everything newer.
    Full sync if last_synced is None.
    """
    cid = uuid.UUID(camp_id)

    membership = await _get_membership(db, cid, user.id)
    if not membership:
        raise HTTPException(status_code=403, detail="Not a member")

    since = None
    if request.last_synced:
        since = datetime.fromisoformat(request.last_synced)

    # Fetch annotations since last sync
    annot_query = select(SharedAnnotation).where(SharedAnnotation.camp_id == cid)
    if since:
        annot_query = annot_query.where(SharedAnnotation.created_at > since)
    annot_result = await db.execute(annot_query.order_by(SharedAnnotation.created_at))
    annotations = annot_result.scalars().all()

    # Fetch photos since last sync
    photo_query = select(CampPhoto).where(CampPhoto.camp_id == cid)
    if since:
        photo_query = photo_query.where(CampPhoto.uploaded_at > since)
    photo_result = await db.execute(photo_query.order_by(CampPhoto.uploaded_at))
    photos = photo_result.scalars().all()

    # Fetch activity since last sync
    feed_query = select(CampActivity).where(CampActivity.camp_id == cid)
    if since:
        feed_query = feed_query.where(CampActivity.timestamp > since)
    feed_result = await db.execute(feed_query.order_by(CampActivity.timestamp))
    feed = feed_result.scalars().all()

    # Always return full member list (small payload)
    members_result = await db.execute(
        select(CampMember).where(CampMember.camp_id == cid)
    )
    members = members_result.scalars().all()

    now = datetime.now(timezone.utc)

    return {
        "synced_at": now.isoformat(),
        "members": [
            {
                "user_id": str(m.user_id),
                "username": m.username,
                "role": m.role,
                "color": m.color,
                "joined_at": m.joined_at.isoformat() if m.joined_at else None,
            }
            for m in members
        ],
        "new_annotations": [
            {
                "id": str(a.id),
                "type": a.annotation_type,
                "created_by": str(a.created_by),
                "data": a.data,
                "created_at": a.created_at.isoformat() if a.created_at else None,
            }
            for a in annotations
        ],
        "new_photos": [
            {
                "id": str(p.id),
                "uploaded_by": str(p.uploaded_by),
                "image_key": p.image_key,
                "lat": p.lat,
                "lng": p.lng,
                "caption": p.caption,
                "uploaded_at": p.uploaded_at.isoformat() if p.uploaded_at else None,
            }
            for p in photos
        ],
        "new_activity": [
            {
                "id": str(f.id),
                "user_id": str(f.user_id),
                "username": f.username,
                "action": f.action,
                "timestamp": f.timestamp.isoformat() if f.timestamp else None,
            }
            for f in feed
        ],
    }
