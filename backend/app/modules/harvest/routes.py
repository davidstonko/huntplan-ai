"""
HuntPlan AI — Harvest Log Routes

CRUD endpoints for game harvest logging:
- Log a harvest (species, weapon, location, details)
- List user's harvests (with season filtering)
- Get season summary / bag count
- Update / delete harvest entries
- Community harvest stats (anonymous, opt-in)
"""

import uuid
from datetime import date
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field
from sqlalchemy import select, func as sa_func, and_, extract
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.database import get_db
from app.models.user import User
from app.models.harvest import HarvestLog
from app.modules.auth.dependencies import get_current_user


router = APIRouter()


# ─── Request / Response Models ───────────────────────────────────
class LogHarvestRequest(BaseModel):
    species: str = Field(..., description="deer, turkey, waterfowl, bear, small_game")
    species_detail: Optional[str] = None
    harvest_date: str = Field(..., description="YYYY-MM-DD")
    harvest_time: Optional[str] = None
    weapon: str = Field(..., description="archery, firearms, muzzleloader, shotgun")
    weapon_detail: Optional[str] = None
    county: Optional[str] = None
    land_name: Optional[str] = None
    lat: Optional[float] = None
    lng: Optional[float] = None
    antler_points: Optional[int] = None
    is_antlered: Optional[bool] = None
    estimated_weight_lbs: Optional[int] = None
    beard_length_inches: Optional[float] = None
    spur_length_inches: Optional[float] = None
    game_check_number: Optional[str] = None
    game_check_completed: bool = False
    photo_key: Optional[str] = None
    notes: Optional[str] = None
    is_shared: bool = False
    season_year: str = "2025-2026"

class UpdateHarvestRequest(BaseModel):
    species_detail: Optional[str] = None
    harvest_time: Optional[str] = None
    weapon_detail: Optional[str] = None
    county: Optional[str] = None
    land_name: Optional[str] = None
    antler_points: Optional[int] = None
    is_antlered: Optional[bool] = None
    estimated_weight_lbs: Optional[int] = None
    beard_length_inches: Optional[float] = None
    spur_length_inches: Optional[float] = None
    game_check_number: Optional[str] = None
    game_check_completed: Optional[bool] = None
    photo_key: Optional[str] = None
    notes: Optional[str] = None
    is_shared: Optional[bool] = None


class HarvestSummary(BaseModel):
    id: str
    species: str
    species_detail: Optional[str] = None
    harvest_date: str
    weapon: str
    county: Optional[str] = None
    land_name: Optional[str] = None
    game_check_completed: bool = False


# ─── CRUD Endpoints ──────────────────────────────────────────────
@router.post("/log", status_code=201)
async def log_harvest(
    request: LogHarvestRequest,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Log a new game harvest.

    Tracks species, weapon, location, and optional details like antler points,
    weight, game check confirmation, and photos.
    """
    harvest = HarvestLog(
        user_id=user.id,
        species=request.species,
        species_detail=request.species_detail,
        harvest_date=date.fromisoformat(request.harvest_date),
        harvest_time=request.harvest_time,
        weapon=request.weapon,
        weapon_detail=request.weapon_detail,
        county=request.county,
        land_name=request.land_name,
        lat=request.lat,
        lng=request.lng,
        antler_points=request.antler_points,
        is_antlered=request.is_antlered,
        estimated_weight_lbs=request.estimated_weight_lbs,
        beard_length_inches=request.beard_length_inches,        spur_length_inches=request.spur_length_inches,
        game_check_number=request.game_check_number,
        game_check_completed=request.game_check_completed,
        photo_key=request.photo_key,
        notes=request.notes,
        is_shared=request.is_shared,
        season_year=request.season_year,
    )
    db.add(harvest)
    await db.flush()

    return {
        "id": str(harvest.id),
        "species": harvest.species,
        "harvest_date": harvest.harvest_date.isoformat(),
        "weapon": harvest.weapon,
        "game_check_completed": harvest.game_check_completed,
        "message": "Harvest logged successfully",
    }


@router.get("/list")
async def list_harvests(
    season_year: Optional[str] = Query(None, description="Filter by season year, e.g. '2025-2026'"),
    species: Optional[str] = Query(None, description="Filter by species"),
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """List all harvests for the current user, optionally filtered by season and species."""    query = select(HarvestLog).where(HarvestLog.user_id == user.id)

    if season_year:
        query = query.where(HarvestLog.season_year == season_year)
    if species:
        query = query.where(HarvestLog.species == species)

    query = query.order_by(HarvestLog.harvest_date.desc())
    result = await db.execute(query)
    harvests = result.scalars().all()

    return {
        "harvests": [
            {
                "id": str(h.id),
                "species": h.species,
                "species_detail": h.species_detail,
                "harvest_date": h.harvest_date.isoformat(),
                "harvest_time": h.harvest_time,
                "weapon": h.weapon,
                "weapon_detail": h.weapon_detail,
                "county": h.county,
                "land_name": h.land_name,
                "lat": h.lat,
                "lng": h.lng,
                "antler_points": h.antler_points,
                "is_antlered": h.is_antlered,
                "estimated_weight_lbs": h.estimated_weight_lbs,
                "beard_length_inches": h.beard_length_inches,                "spur_length_inches": h.spur_length_inches,
                "game_check_number": h.game_check_number,
                "game_check_completed": h.game_check_completed,
                "photo_key": h.photo_key,
                "notes": h.notes,
                "is_shared": h.is_shared,
                "season_year": h.season_year,
                "created_at": h.created_at.isoformat() if h.created_at else None,
            }
            for h in harvests
        ],
        "count": len(harvests),
    }


@router.get("/summary")
async def season_summary(
    season_year: str = Query("2025-2026", description="Season year"),
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Get a summary of the user's harvest season.
    Shows total count by species + bag limit tracking.
    """
    result = await db.execute(
        select(
            HarvestLog.species,
            sa_func.count(HarvestLog.id).label("count"),
        )
        .where(and_(HarvestLog.user_id == user.id, HarvestLog.season_year == season_year))
        .group_by(HarvestLog.species)
    )    rows = result.all()

    # Maryland bag limits for reference (2025-2026)
    md_bag_limits = {
        "deer": {"antlered": 2, "antlerless": 20, "total": 22,
                 "note": "2 antlered per weapon season, 20 antlerless total"},
        "turkey": {"spring": 2, "fall": 1, "total": 3,
                   "note": "2 bearded turkeys spring, 1 either sex fall"},
        "bear": {"total": 1, "note": "1 bear per season"},
    }

    # Count antlered vs antlerless deer
    deer_detail = None
    if any(r[0] == "deer" for r in rows):
        antlered_result = await db.execute(
            select(sa_func.count(HarvestLog.id))
            .where(and_(
                HarvestLog.user_id == user.id,
                HarvestLog.season_year == season_year,
                HarvestLog.species == "deer",
                HarvestLog.is_antlered == True,
            ))
        )
        antlered_count = antlered_result.scalar() or 0

        antlerless_result = await db.execute(
            select(sa_func.count(HarvestLog.id))
            .where(and_(
                HarvestLog.user_id == user.id,
                HarvestLog.season_year == season_year,
                HarvestLog.species == "deer",
                HarvestLog.is_antlered == False,
            ))
        )
        antlerless_count = antlerless_result.scalar() or 0
        deer_detail = {
            "antlered": antlered_count,
            "antlerless": antlerless_count,
        }

    by_species = {
        row[0]: row[1] for row in rows
    }

    total = sum(by_species.values())

    return {
        "season_year": season_year,
        "total_harvests": total,
        "by_species": by_species,
        "deer_detail": deer_detail,
        "bag_limits": md_bag_limits,
        "game_check_rate": await _game_check_rate(db, user.id, season_year),
    }


async def _game_check_rate(db: AsyncSession, user_id: uuid.UUID, season_year: str) -> dict:
    """Calculate game check completion rate."""
    total_result = await db.execute(
        select(sa_func.count(HarvestLog.id))
        .where(and_(HarvestLog.user_id == user_id, HarvestLog.season_year == season_year))
    )
    total = total_result.scalar() or 0

    checked_result = await db.execute(
        select(sa_func.count(HarvestLog.id))
        .where(and_(
            HarvestLog.user_id == user_id,
            HarvestLog.season_year == season_year,
            HarvestLog.game_check_completed == True,
        ))
    )    checked = checked_result.scalar() or 0

    return {
        "total": total,
        "checked": checked,
        "rate": round(checked / total * 100, 1) if total > 0 else 0,
    }


@router.get("/{harvest_id}")
async def get_harvest(
    harvest_id: str,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get a single harvest entry."""
    hid = uuid.UUID(harvest_id)
    result = await db.execute(
        select(HarvestLog).where(and_(HarvestLog.id == hid, HarvestLog.user_id == user.id))
    )
    h = result.scalar_one_or_none()
    if not h:
        raise HTTPException(status_code=404, detail="Harvest not found")

    return {
        "id": str(h.id),
        "species": h.species,
        "species_detail": h.species_detail,
        "harvest_date": h.harvest_date.isoformat(),
        "harvest_time": h.harvest_time,
        "weapon": h.weapon,
        "weapon_detail": h.weapon_detail,        "county": h.county,
        "land_name": h.land_name,
        "lat": h.lat,
        "lng": h.lng,
        "antler_points": h.antler_points,
        "is_antlered": h.is_antlered,
        "estimated_weight_lbs": h.estimated_weight_lbs,
        "beard_length_inches": h.beard_length_inches,
        "spur_length_inches": h.spur_length_inches,
        "game_check_number": h.game_check_number,
        "game_check_completed": h.game_check_completed,
        "photo_key": h.photo_key,
        "notes": h.notes,
        "is_shared": h.is_shared,
        "season_year": h.season_year,
    }


@router.patch("/{harvest_id}")
async def update_harvest(
    harvest_id: str,
    request: UpdateHarvestRequest,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Update a harvest entry (e.g., add game check number after the fact)."""
    hid = uuid.UUID(harvest_id)
    result = await db.execute(
        select(HarvestLog).where(and_(HarvestLog.id == hid, HarvestLog.user_id == user.id))
    )
    h = result.scalar_one_or_none()
    if not h:
        raise HTTPException(status_code=404, detail="Harvest not found")

    # Update only provided fields
    update_data = request.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        if value is not None:
            setattr(h, field, value)

    db.add(h)
    await db.flush()

    return {"message": "Harvest updated", "id": str(h.id)}

@router.delete("/{harvest_id}", status_code=204)
async def delete_harvest(
    harvest_id: str,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Delete a harvest entry."""
    hid = uuid.UUID(harvest_id)
    result = await db.execute(
        select(HarvestLog).where(and_(HarvestLog.id == hid, HarvestLog.user_id == user.id))
    )
    h = result.scalar_one_or_none()
    if not h:
        raise HTTPException(status_code=404, detail="Harvest not found")

    await db.delete(h)


# ─── Community Stats (Anonymous, Opt-in) ─────────────────────────

@router.get("/community/stats")
async def community_harvest_stats(
    season_year: str = Query("2025-2026"),
    county: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
):
    """
    Anonymized community harvest statistics.
    Only includes harvests where is_shared=True.
    No user-identifying information is returned.
    """
    query = select(
        HarvestLog.species,
        HarvestLog.county,
        sa_func.count(HarvestLog.id).label("count"),
        sa_func.avg(HarvestLog.estimated_weight_lbs).label("avg_weight"),
    ).where(and_(
        HarvestLog.is_shared == True,
        HarvestLog.season_year == season_year,
    ))

    if county:
        query = query.where(HarvestLog.county == county)

    query = query.group_by(HarvestLog.species, HarvestLog.county)
    result = await db.execute(query)
    rows = result.all()

    stats = []
    for row in rows:
        stats.append({
            "species": row[0],
            "county": row[1],
            "count": row[2],
            "avg_weight_lbs": round(float(row[3]), 1) if row[3] else None,
        })

    return {
        "season_year": season_year,
        "stats": stats,
        "total_shared": sum(s["count"] for s in stats),
    }
