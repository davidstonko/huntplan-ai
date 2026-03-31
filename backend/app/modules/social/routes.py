"""
Social Scouting Feed Router

Handles community scouting reports, upvotes, and comments.
All posts are anonymous — users identified by handle only.
"""

from datetime import datetime
from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field
from sqlalchemy import select, func, desc
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.database import get_db
from app.models.social import ScoutingReport, ReportComment
from app.models.user import User
from app.modules.auth.dependencies import get_optional_user

router = APIRouter(
    prefix="/social",
    tags=["social"],
)


# ─── Request/Response Models ─────────────────────────────────────

class CreateReportRequest(BaseModel):
    """Create a new scouting report."""
    species: str = Field(..., min_length=1, max_length=128)
    activity_level: str = Field(..., pattern="^(none|low|moderate|high|very_high)$")
    report_date: str = Field(..., description="ISO date string (YYYY-MM-DD)")
    county: Optional[str] = Field(default=None, max_length=128)
    public_land_name: Optional[str] = Field(default=None, max_length=256)
    general_area: Optional[str] = Field(default=None, max_length=256)
    body: Optional[str] = Field(default=None, max_length=2000)
    sign_observed: Optional[list[str]] = Field(default=None)
    conditions: Optional[str] = Field(default=None, max_length=500)


class ReportResponse(BaseModel):
    """A scouting report in the feed."""
    id: str
    handle: Optional[str] = None
    species: str
    activity_level: str
    report_date: str
    county: Optional[str] = None
    public_land_name: Optional[str] = None
    general_area: Optional[str] = None
    body: Optional[str] = None
    sign_observed: Optional[list] = None
    conditions: Optional[str] = None
    upvotes: int = 0
    downvotes: int = 0
    comment_count: int = 0
    created_at: str


class CreateCommentRequest(BaseModel):
    """Add a comment to a report."""
    body: str = Field(..., min_length=1, max_length=1000)
    parent_id: Optional[str] = None


# ─── Feed Endpoints ──────────────────────────────────────────────

@router.get("/feed")
async def get_social_feed(
    limit: int = Query(default=20, ge=1, le=50),
    offset: int = Query(default=0, ge=0),
    species: Optional[str] = Query(default=None, description="Filter by species"),
    county: Optional[str] = Query(default=None, description="Filter by county"),
    land: Optional[str] = Query(default=None, description="Filter by public land name"),
    db: AsyncSession = Depends(get_db),
):
    """
    Get the scouting feed — recent community reports.

    Supports filtering by species, county, or public land name.
    Results ordered by most recent first.
    """
    query = (
        select(ScoutingReport, User.handle)
        .outerjoin(User, ScoutingReport.user_id == User.id)
        .where(ScoutingReport.is_removed == False)
        .where(ScoutingReport.state_code == "MD")
    )

    if species:
        query = query.where(ScoutingReport.species.ilike(f"%{species}%"))
    if county:
        query = query.where(ScoutingReport.county.ilike(f"%{county}%"))
    if land:
        query = query.where(ScoutingReport.public_land_name.ilike(f"%{land}%"))

    query = query.order_by(desc(ScoutingReport.created_at)).offset(offset).limit(limit)

    result = await db.execute(query)
    rows = result.all()

    reports = []
    for report, handle in rows:
        reports.append(ReportResponse(
            id=str(report.id),
            handle=handle or "Anonymous",
            species=report.species,
            activity_level=report.activity_level,
            report_date=report.report_date.isoformat() if report.report_date else "",
            county=report.county,
            public_land_name=report.public_land_name,
            general_area=report.general_area,
            body=report.body,
            sign_observed=report.sign_observed,
            conditions=report.conditions,
            upvotes=report.upvotes,
            downvotes=report.downvotes,
            comment_count=report.comment_count,
            created_at=report.created_at.isoformat() if report.created_at else "",
        ))

    # Get total count for pagination
    count_query = (
        select(func.count(ScoutingReport.id))
        .where(ScoutingReport.is_removed == False)
        .where(ScoutingReport.state_code == "MD")
    )
    total = (await db.execute(count_query)).scalar() or 0

    return {
        "status": "ok",
        "reports": [r.model_dump() for r in reports],
        "total": total,
        "limit": limit,
        "offset": offset,
    }


@router.post("/reports")
async def create_report(
    request: CreateReportRequest,
    db: AsyncSession = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_user),
):
    """
    Post a new scouting report.

    Location is intentionally coarse — county/WMA level only, never GPS.
    Requires authentication (anonymous handle is fine).
    """
    if not current_user:
        raise HTTPException(status_code=401, detail="Authentication required to post reports")

    try:
        report_date = datetime.fromisoformat(request.report_date)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid date format. Use YYYY-MM-DD")

    report = ScoutingReport(
        user_id=current_user.id,
        state_code="MD",
        county=request.county,
        public_land_name=request.public_land_name,
        general_area=request.general_area,
        species=request.species,
        activity_level=request.activity_level,
        report_date=report_date,
        body=request.body,
        sign_observed=request.sign_observed,
        conditions=request.conditions,
    )

    db.add(report)
    await db.flush()

    return {
        "status": "ok",
        "report_id": str(report.id),
        "message": "Scouting report posted successfully",
    }


@router.post("/reports/{report_id}/upvote")
async def upvote_report(
    report_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_user),
):
    """Upvote a scouting report."""
    if not current_user:
        raise HTTPException(status_code=401, detail="Authentication required")

    report = await db.get(ScoutingReport, report_id)
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")

    report.upvotes += 1
    return {"status": "ok", "upvotes": report.upvotes}


@router.post("/reports/{report_id}/comments")
async def add_comment(
    report_id: str,
    request: CreateCommentRequest,
    db: AsyncSession = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_user),
):
    """Add a comment to a scouting report."""
    if not current_user:
        raise HTTPException(status_code=401, detail="Authentication required")

    report = await db.get(ScoutingReport, report_id)
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")

    comment = ReportComment(
        report_id=report.id,
        user_id=current_user.id,
        body=request.body,
        parent_id=request.parent_id,
    )
    db.add(comment)

    report.comment_count += 1

    await db.flush()

    return {
        "status": "ok",
        "comment_id": str(comment.id),
        "message": "Comment added",
    }


@router.get("/reports/{report_id}/comments")
async def get_comments(
    report_id: str,
    db: AsyncSession = Depends(get_db),
):
    """Get all comments on a scouting report."""
    query = (
        select(ReportComment, User.handle)
        .outerjoin(User, ReportComment.user_id == User.id)
        .where(ReportComment.report_id == report_id)
        .where(ReportComment.is_removed == False)
        .order_by(ReportComment.created_at)
    )

    result = await db.execute(query)
    rows = result.all()

    comments = []
    for comment, handle in rows:
        comments.append({
            "id": str(comment.id),
            "handle": handle or "Anonymous",
            "body": comment.body,
            "parent_id": str(comment.parent_id) if comment.parent_id else None,
            "upvotes": comment.upvotes,
            "created_at": comment.created_at.isoformat() if comment.created_at else "",
        })

    return {"status": "ok", "comments": comments}
