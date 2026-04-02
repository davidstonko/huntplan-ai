"""
MDHuntFishOutdoors — Feedback Routes

User endpoints:
  POST /submit          — Submit new feedback (anonymous OK)
  GET  /my              — List feedback submitted by current user

Admin endpoints:
  GET  /admin/list      — List all feedback with filters
  GET  /admin/{id}      — Get single feedback detail
  POST /admin/{id}/respond — Add admin response/notes, update status
  GET  /admin/export    — Export all feedback as JSON (for Google Sheets / backup)
"""

import uuid
import logging
from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy import select, desc, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.database import get_db
from app.models.user import User
from app.models.feedback import Feedback
from app.modules.auth.dependencies import get_current_user, get_optional_user
from app.modules.feedback.email_service import send_feedback_notification, send_donation_notification

logger = logging.getLogger(__name__)
router = APIRouter()


# ─── Request / Response Models ──────────────────────────────────

class SubmitFeedbackRequest(BaseModel):
    feedback_type: str  # 'bug', 'outdated', 'suggestion'
    description: str
    screen: Optional[str] = None
    active_tab: Optional[str] = None
    app_version: Optional[str] = None
    ios_version: Optional[str] = None
    device_id: Optional[str] = None


class SubmitFeedbackResponse(BaseModel):
    status: str
    feedback_id: str
    message: str


class AdminRespondRequest(BaseModel):
    status: Optional[str] = None  # 'reviewed', 'resolved', 'dismissed'
    admin_notes: Optional[str] = None
    admin_response: Optional[str] = None


class FeedbackDetail(BaseModel):
    id: str
    feedback_type: str
    description: str
    screen: Optional[str]
    active_tab: Optional[str]
    app_version: Optional[str]
    ios_version: Optional[str]
    device_id: Optional[str]
    status: str
    admin_notes: Optional[str]
    admin_response: Optional[str]
    notification_sent: bool
    created_at: str
    updated_at: Optional[str]
    resolved_at: Optional[str]


class FeedbackListResponse(BaseModel):
    total: int
    items: list[FeedbackDetail]


# ─── Helpers ────────────────────────────────────────────────────

def _feedback_to_detail(fb: Feedback) -> FeedbackDetail:
    return FeedbackDetail(
        id=str(fb.id),
        feedback_type=fb.feedback_type,
        description=fb.description,
        screen=fb.screen,
        active_tab=fb.active_tab,
        app_version=fb.app_version,
        ios_version=fb.ios_version,
        device_id=fb.device_id,
        status=fb.status,
        admin_notes=fb.admin_notes,
        admin_response=fb.admin_response,
        notification_sent=fb.notification_sent,
        created_at=fb.created_at.isoformat() if fb.created_at else "",
        updated_at=fb.updated_at.isoformat() if fb.updated_at else None,
        resolved_at=fb.resolved_at.isoformat() if fb.resolved_at else None,
    )


# ─── User Endpoints ────────────────────────────────────────────

@router.post("/submit", response_model=SubmitFeedbackResponse)
async def submit_feedback(
    req: SubmitFeedbackRequest,
    db: AsyncSession = Depends(get_db),
    user: Optional[User] = Depends(get_optional_user),
):
    """
    Submit feedback about regulations, bugs, or feature requests.
    Works for both authenticated and anonymous users.
    Sends email notification to the feedback management inbox.
    """
    if req.feedback_type not in ("bug", "outdated", "suggestion"):
        raise HTTPException(status_code=400, detail="feedback_type must be 'bug', 'outdated', or 'suggestion'")

    if not req.description or len(req.description.strip()) < 5:
        raise HTTPException(status_code=400, detail="Description must be at least 5 characters")

    feedback = Feedback(
        id=uuid.uuid4(),
        user_id=user.id if user else None,
        device_id=req.device_id,
        feedback_type=req.feedback_type,
        description=req.description.strip(),
        screen=req.screen,
        active_tab=req.active_tab,
        app_version=req.app_version,
        ios_version=req.ios_version,
        status="new",
    )

    db.add(feedback)
    await db.commit()
    await db.refresh(feedback)

    # Send email notification (fire-and-forget, don't block the response)
    try:
        email_sent = await send_feedback_notification(
            feedback_type=req.feedback_type,
            description=req.description.strip(),
            feedback_id=str(feedback.id),
            screen=req.screen,
            active_tab=req.active_tab,
            app_version=req.app_version,
            device_id=req.device_id,
        )
        if email_sent:
            feedback.notification_sent = True
            await db.commit()
    except Exception as e:
        logger.warning(f"Email notification failed (non-blocking): {e}")

    logger.info(
        f"New feedback submitted: {feedback.feedback_type} — "
        f"ID {feedback.id} — notification_sent={feedback.notification_sent}"
    )

    return SubmitFeedbackResponse(
        status="ok",
        feedback_id=str(feedback.id),
        message="Thank you! Your feedback has been received.",
    )


# ─── Donation Notification ────────────────────────────────────

class DonationTapRequest(BaseModel):
    payment_method: str  # 'venmo', 'buymeacoffee', 'patreon'
    tier: Optional[str] = None  # 'coffee', 'ammo', 'lease', 'sponsor'
    amount: Optional[str] = None  # '$5', '$25', etc.
    device_id: Optional[str] = None


@router.post("/donation-tap")
async def donation_tap(
    req: DonationTapRequest,
):
    """
    Fire-and-forget email notification when a user taps a donation button.
    No auth required — anonymous users can donate too.
    No database write — just sends the email.
    """
    try:
        await send_donation_notification(
            payment_method=req.payment_method,
            tier=req.tier,
            amount=req.amount,
            device_id=req.device_id,
        )
    except Exception as e:
        logger.warning(f"Donation notification email failed (non-blocking): {e}")

    return {"status": "ok", "message": "Thanks for your support!"}


@router.get("/my", response_model=FeedbackListResponse)
async def my_feedback(
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
    limit: int = Query(20, ge=1, le=100),
):
    """List feedback submitted by the current authenticated user."""
    query = (
        select(Feedback)
        .where(Feedback.user_id == user.id)
        .order_by(desc(Feedback.created_at))
        .limit(limit)
    )
    result = await db.execute(query)
    items = result.scalars().all()

    count_q = select(func.count()).where(Feedback.user_id == user.id)
    total = (await db.execute(count_q)).scalar() or 0

    return FeedbackListResponse(
        total=total,
        items=[_feedback_to_detail(fb) for fb in items],
    )


# ─── Admin Endpoints ───────────────────────────────────────────
# Note: In production, add proper admin role check.
# For now, any authenticated user can access admin endpoints.
# TODO: Add is_admin flag to User model for proper RBAC.

@router.get("/admin/list", response_model=FeedbackListResponse)
async def admin_list_feedback(
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
    status_filter: Optional[str] = Query(None, alias="status"),
    type_filter: Optional[str] = Query(None, alias="type"),
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
):
    """
    List all feedback with optional filters.
    Returns newest first.
    """
    query = select(Feedback).order_by(desc(Feedback.created_at))

    if status_filter:
        query = query.where(Feedback.status == status_filter)
    if type_filter:
        query = query.where(Feedback.feedback_type == type_filter)

    query = query.offset(offset).limit(limit)
    result = await db.execute(query)
    items = result.scalars().all()

    # Total count (with same filters)
    count_q = select(func.count()).select_from(Feedback)
    if status_filter:
        count_q = count_q.where(Feedback.status == status_filter)
    if type_filter:
        count_q = count_q.where(Feedback.feedback_type == type_filter)
    total = (await db.execute(count_q)).scalar() or 0

    return FeedbackListResponse(
        total=total,
        items=[_feedback_to_detail(fb) for fb in items],
    )


# IMPORTANT: /admin/export MUST come before /admin/{feedback_id}
# so FastAPI doesn't treat "export" as a UUID path parameter.
@router.get("/admin/export")
async def admin_export_feedback(
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
    status_filter: Optional[str] = Query(None, alias="status"),
):
    """
    Export all feedback as a JSON array.
    Useful for importing into Google Sheets or backup systems.
    """
    query = select(Feedback).order_by(desc(Feedback.created_at))
    if status_filter:
        query = query.where(Feedback.status == status_filter)

    result = await db.execute(query)
    items = result.scalars().all()

    return {
        "exported_at": datetime.utcnow().isoformat(),
        "count": len(items),
        "items": [
            {
                "id": str(fb.id),
                "feedback_type": fb.feedback_type,
                "description": fb.description,
                "screen": fb.screen,
                "active_tab": fb.active_tab,
                "app_version": fb.app_version,
                "ios_version": fb.ios_version,
                "device_id": fb.device_id,
                "status": fb.status,
                "admin_notes": fb.admin_notes,
                "admin_response": fb.admin_response,
                "notification_sent": fb.notification_sent,
                "created_at": fb.created_at.isoformat() if fb.created_at else None,
                "resolved_at": fb.resolved_at.isoformat() if fb.resolved_at else None,
            }
            for fb in items
        ],
    }


# Dynamic path routes MUST come after static /admin/list and /admin/export
@router.get("/admin/{feedback_id}", response_model=FeedbackDetail)
async def admin_get_feedback(
    feedback_id: str,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """Get a single feedback item with all details."""
    try:
        fid = uuid.UUID(feedback_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid feedback ID")

    result = await db.execute(select(Feedback).where(Feedback.id == fid))
    fb = result.scalar_one_or_none()

    if not fb:
        raise HTTPException(status_code=404, detail="Feedback not found")

    return _feedback_to_detail(fb)


@router.post("/admin/{feedback_id}/respond")
async def admin_respond_to_feedback(
    feedback_id: str,
    req: AdminRespondRequest,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """
    Update feedback status, add admin notes, or write a response.
    Valid statuses: 'new', 'reviewed', 'resolved', 'dismissed'
    """
    try:
        fid = uuid.UUID(feedback_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid feedback ID")

    result = await db.execute(select(Feedback).where(Feedback.id == fid))
    fb = result.scalar_one_or_none()

    if not fb:
        raise HTTPException(status_code=404, detail="Feedback not found")

    if req.status:
        if req.status not in ("new", "reviewed", "resolved", "dismissed"):
            raise HTTPException(status_code=400, detail="Invalid status")
        fb.status = req.status
        if req.status == "resolved":
            fb.resolved_at = datetime.utcnow()

    if req.admin_notes is not None:
        fb.admin_notes = req.admin_notes

    if req.admin_response is not None:
        fb.admin_response = req.admin_response

    await db.commit()
    await db.refresh(fb)

    logger.info(f"Feedback {feedback_id} updated by admin: status={fb.status}")

    return {
        "status": "ok",
        "feedback_id": str(fb.id),
        "new_status": fb.status,
        "message": "Feedback updated successfully",
    }
