"""
HuntPlan AI — Forum & Marketplace Routes

Discussion threads per public land, gear marketplace, and land permission listings.
All endpoints require JWT auth. Content is anonymous by default (username-based).
"""

from datetime import datetime, timedelta, timezone
from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field
from sqlalchemy import select, func, desc, and_
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.database import get_db
from app.models.forum import ForumThread, ForumReply, MarketplaceListing, LandPermission
from app.models.user import User
from app.modules.auth.dependencies import get_current_user


router = APIRouter()


# ─── Request / Response Models ─────────────────────────────────

class CreateThreadRequest(BaseModel):
    title: str = Field(..., min_length=3, max_length=256)
    body: str = Field(..., min_length=10, max_length=10000)
    category: str = Field(default="general")
    land_id: Optional[str] = None
    land_name: Optional[str] = None
    county: Optional[str] = None
    tags: Optional[list[str]] = None
    photo_urls: Optional[list[str]] = None


class CreateReplyRequest(BaseModel):
    body: str = Field(..., min_length=1, max_length=5000)
    parent_id: Optional[str] = None
    photo_urls: Optional[list[str]] = None


class ThreadResponse(BaseModel):
    id: str
    title: str
    body: str
    category: str
    land_id: Optional[str] = None
    land_name: Optional[str] = None
    county: Optional[str] = None
    tags: Optional[list[str]] = None
    photo_urls: Optional[list[str]] = None
    reply_count: int
    upvotes: int
    view_count: int
    is_pinned: bool
    is_locked: bool
    username: Optional[str] = None
    created_at: str
    last_reply_at: Optional[str] = None


class ReplyResponse(BaseModel):
    id: str
    body: str
    parent_id: Optional[str] = None
    photo_urls: Optional[list[str]] = None
    upvotes: int
    username: Optional[str] = None
    created_at: str


class CreateListingRequest(BaseModel):
    title: str = Field(..., min_length=3, max_length=256)
    description: str = Field(..., min_length=10, max_length=5000)
    category: str
    condition: str = "used_good"
    listing_type: str = "sell"
    price: Optional[float] = None
    is_negotiable: bool = True
    county: Optional[str] = None
    photo_urls: Optional[list[str]] = None


class ListingResponse(BaseModel):
    id: str
    title: str
    description: str
    category: str
    condition: str
    listing_type: str
    price: Optional[float] = None
    is_negotiable: bool
    county: Optional[str] = None
    photo_urls: Optional[list[str]] = None
    status: str
    message_count: int
    view_count: int
    username: Optional[str] = None
    created_at: str


class CreateLandPermissionRequest(BaseModel):
    title: str = Field(..., min_length=3, max_length=256)
    description: str = Field(..., min_length=10, max_length=5000)
    county: str
    acres: Optional[float] = None
    terrain_description: Optional[str] = None
    general_area: Optional[str] = None
    permission_type: str
    species_allowed: Optional[list[str]] = None
    weapons_allowed: Optional[list[str]] = None
    max_hunters: Optional[int] = None
    price: Optional[float] = None
    price_unit: Optional[str] = None
    photo_urls: Optional[list[str]] = None


# ─── Forum Threads ──────────────────────────────────────────────

@router.post("/threads", response_model=ThreadResponse)
async def create_thread(
    request: CreateThreadRequest,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Create a new forum thread."""
    thread = ForumThread(
        user_id=user.id,
        title=request.title,
        body=request.body,
        category=request.category,
        land_id=request.land_id,
        land_name=request.land_name,
        county=request.county,
        tags=request.tags,
        photo_urls=request.photo_urls,
        state_code="MD",
    )
    db.add(thread)
    await db.flush()
    await db.refresh(thread)

    return ThreadResponse(
        id=str(thread.id),
        title=thread.title,
        body=thread.body,
        category=thread.category,
        land_id=thread.land_id,
        land_name=thread.land_name,
        county=thread.county,
        tags=thread.tags,
        photo_urls=thread.photo_urls,
        reply_count=0,
        upvotes=0,
        view_count=0,
        is_pinned=False,
        is_locked=False,
        username=user.handle,
        created_at=thread.created_at.isoformat(),
    )


@router.get("/threads")
async def list_threads(
    category: Optional[str] = None,
    land_id: Optional[str] = None,
    county: Optional[str] = None,
    sort: str = Query(default="recent", regex="^(recent|popular|active)$"),
    page: int = Query(default=1, ge=1),
    per_page: int = Query(default=20, ge=1, le=50),
    db: AsyncSession = Depends(get_db),
):
    """List forum threads with filtering and sorting."""
    query = select(ForumThread, User.handle).join(
        User, ForumThread.user_id == User.id, isouter=True
    ).where(
        ForumThread.is_removed == False  # noqa: E712
    )

    if category:
        query = query.where(ForumThread.category == category)
    if land_id:
        query = query.where(ForumThread.land_id == land_id)
    if county:
        query = query.where(ForumThread.county == county)

    # Sorting
    if sort == "popular":
        query = query.order_by(desc(ForumThread.upvotes))
    elif sort == "active":
        query = query.order_by(desc(ForumThread.last_reply_at).nulls_last())
    else:  # recent
        query = query.order_by(desc(ForumThread.created_at))

    # Pinned threads always first
    query = query.order_by(desc(ForumThread.is_pinned))

    # Pagination
    offset = (page - 1) * per_page
    query = query.offset(offset).limit(per_page)

    result = await db.execute(query)
    rows = result.all()

    threads = [
        ThreadResponse(
            id=str(thread.id),
            title=thread.title,
            body=thread.body[:200] + ("..." if len(thread.body) > 200 else ""),
            category=thread.category,
            land_id=thread.land_id,
            land_name=thread.land_name,
            county=thread.county,
            tags=thread.tags,
            photo_urls=thread.photo_urls,
            reply_count=thread.reply_count,
            upvotes=thread.upvotes,
            view_count=thread.view_count,
            is_pinned=thread.is_pinned,
            is_locked=thread.is_locked,
            username=username,
            created_at=thread.created_at.isoformat(),
            last_reply_at=thread.last_reply_at.isoformat() if thread.last_reply_at else None,
        )
        for thread, username in rows
    ]

    # Get total count
    count_query = select(func.count(ForumThread.id)).where(ForumThread.is_removed == False)  # noqa: E712
    if category:
        count_query = count_query.where(ForumThread.category == category)
    total = (await db.execute(count_query)).scalar() or 0

    return {
        "threads": [t.model_dump() for t in threads],
        "total": total,
        "page": page,
        "per_page": per_page,
        "pages": (total + per_page - 1) // per_page,
    }


@router.get("/threads/{thread_id}")
async def get_thread(
    thread_id: str,
    db: AsyncSession = Depends(get_db),
):
    """Get a single thread with full body and increment view count."""
    result = await db.execute(
        select(ForumThread, User.handle).join(
            User, ForumThread.user_id == User.id, isouter=True
        ).where(ForumThread.id == thread_id, ForumThread.is_removed == False)  # noqa: E712
    )
    row = result.first()
    if not row:
        raise HTTPException(status_code=404, detail="Thread not found")

    thread, username = row
    thread.view_count += 1
    await db.flush()

    return ThreadResponse(
        id=str(thread.id),
        title=thread.title,
        body=thread.body,
        category=thread.category,
        land_id=thread.land_id,
        land_name=thread.land_name,
        county=thread.county,
        tags=thread.tags,
        photo_urls=thread.photo_urls,
        reply_count=thread.reply_count,
        upvotes=thread.upvotes,
        view_count=thread.view_count,
        is_pinned=thread.is_pinned,
        is_locked=thread.is_locked,
        username=username,
        created_at=thread.created_at.isoformat(),
        last_reply_at=thread.last_reply_at.isoformat() if thread.last_reply_at else None,
    ).model_dump()


@router.post("/threads/{thread_id}/upvote")
async def upvote_thread(
    thread_id: str,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Upvote a thread."""
    result = await db.execute(
        select(ForumThread).where(ForumThread.id == thread_id)
    )
    thread = result.scalar_one_or_none()
    if not thread:
        raise HTTPException(status_code=404, detail="Thread not found")

    thread.upvotes += 1
    await db.flush()
    return {"upvotes": thread.upvotes}


# ─── Thread Replies ─────────────────────────────────────────────

@router.post("/threads/{thread_id}/replies", response_model=ReplyResponse)
async def create_reply(
    thread_id: str,
    request: CreateReplyRequest,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Post a reply to a thread."""
    # Verify thread exists and isn't locked
    result = await db.execute(
        select(ForumThread).where(ForumThread.id == thread_id)
    )
    thread = result.scalar_one_or_none()
    if not thread:
        raise HTTPException(status_code=404, detail="Thread not found")
    if thread.is_locked:
        raise HTTPException(status_code=403, detail="Thread is locked")

    parent_uuid = None
    if request.parent_id:
        parent_uuid = request.parent_id

    reply = ForumReply(
        thread_id=thread.id,
        user_id=user.id,
        parent_id=parent_uuid,
        body=request.body,
        photo_urls=request.photo_urls,
    )
    db.add(reply)

    # Update thread stats
    thread.reply_count += 1
    thread.last_reply_at = datetime.now(timezone.utc)

    await db.flush()
    await db.refresh(reply)

    return ReplyResponse(
        id=str(reply.id),
        body=reply.body,
        parent_id=str(reply.parent_id) if reply.parent_id else None,
        photo_urls=reply.photo_urls,
        upvotes=0,
        username=user.handle,
        created_at=reply.created_at.isoformat(),
    )


@router.get("/threads/{thread_id}/replies")
async def list_replies(
    thread_id: str,
    page: int = Query(default=1, ge=1),
    per_page: int = Query(default=50, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
):
    """List all replies for a thread."""
    offset = (page - 1) * per_page
    result = await db.execute(
        select(ForumReply, User.handle).join(
            User, ForumReply.user_id == User.id, isouter=True
        ).where(
            ForumReply.thread_id == thread_id,
            ForumReply.is_removed == False,  # noqa: E712
        ).order_by(ForumReply.created_at).offset(offset).limit(per_page)
    )
    rows = result.all()

    replies = [
        ReplyResponse(
            id=str(reply.id),
            body=reply.body,
            parent_id=str(reply.parent_id) if reply.parent_id else None,
            photo_urls=reply.photo_urls,
            upvotes=reply.upvotes,
            username=username,
            created_at=reply.created_at.isoformat(),
        ).model_dump()
        for reply, username in rows
    ]

    return {"replies": replies, "page": page, "per_page": per_page}


# ─── Gear Marketplace ───────────────────────────────────────────

@router.post("/marketplace", response_model=ListingResponse)
async def create_listing(
    request: CreateListingRequest,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Create a new gear marketplace listing."""
    listing = MarketplaceListing(
        user_id=user.id,
        title=request.title,
        description=request.description,
        category=request.category,
        condition=request.condition,
        listing_type=request.listing_type,
        price=request.price,
        is_negotiable=request.is_negotiable,
        county=request.county,
        photo_urls=request.photo_urls,
        state_code="MD",
        expires_at=datetime.now(timezone.utc) + timedelta(days=30),
    )
    db.add(listing)
    await db.flush()
    await db.refresh(listing)

    return ListingResponse(
        id=str(listing.id),
        title=listing.title,
        description=listing.description,
        category=listing.category,
        condition=listing.condition,
        listing_type=listing.listing_type,
        price=listing.price,
        is_negotiable=listing.is_negotiable,
        county=listing.county,
        photo_urls=listing.photo_urls,
        status=listing.status,
        message_count=0,
        view_count=0,
        username=user.handle,
        created_at=listing.created_at.isoformat(),
    )


@router.get("/marketplace")
async def list_marketplace(
    category: Optional[str] = None,
    listing_type: Optional[str] = None,
    county: Optional[str] = None,
    min_price: Optional[float] = None,
    max_price: Optional[float] = None,
    sort: str = Query(default="recent", regex="^(recent|price_low|price_high)$"),
    page: int = Query(default=1, ge=1),
    per_page: int = Query(default=20, ge=1, le=50),
    db: AsyncSession = Depends(get_db),
):
    """List marketplace items with filtering."""
    query = select(MarketplaceListing, User.handle).join(
        User, MarketplaceListing.user_id == User.id, isouter=True
    ).where(
        MarketplaceListing.status == "active",
        MarketplaceListing.is_removed == False,  # noqa: E712
    )

    if category:
        query = query.where(MarketplaceListing.category == category)
    if listing_type:
        query = query.where(MarketplaceListing.listing_type == listing_type)
    if county:
        query = query.where(MarketplaceListing.county == county)
    if min_price is not None:
        query = query.where(MarketplaceListing.price >= min_price)
    if max_price is not None:
        query = query.where(MarketplaceListing.price <= max_price)

    # Sorting
    if sort == "price_low":
        query = query.order_by(MarketplaceListing.price.asc().nulls_last())
    elif sort == "price_high":
        query = query.order_by(MarketplaceListing.price.desc().nulls_last())
    else:
        query = query.order_by(desc(MarketplaceListing.created_at))

    offset = (page - 1) * per_page
    query = query.offset(offset).limit(per_page)

    result = await db.execute(query)
    rows = result.all()

    listings = [
        ListingResponse(
            id=str(listing.id),
            title=listing.title,
            description=listing.description[:200] + ("..." if len(listing.description) > 200 else ""),
            category=listing.category,
            condition=listing.condition,
            listing_type=listing.listing_type,
            price=listing.price,
            is_negotiable=listing.is_negotiable,
            county=listing.county,
            photo_urls=listing.photo_urls,
            status=listing.status,
            message_count=listing.message_count,
            view_count=listing.view_count,
            username=username,
            created_at=listing.created_at.isoformat(),
        ).model_dump()
        for listing, username in rows
    ]

    return {"listings": listings, "page": page, "per_page": per_page}


@router.get("/marketplace/{listing_id}")
async def get_listing(
    listing_id: str,
    db: AsyncSession = Depends(get_db),
):
    """Get a single marketplace listing."""
    result = await db.execute(
        select(MarketplaceListing, User.handle).join(
            User, MarketplaceListing.user_id == User.id, isouter=True
        ).where(MarketplaceListing.id == listing_id)
    )
    row = result.first()
    if not row:
        raise HTTPException(status_code=404, detail="Listing not found")

    listing, username = row
    listing.view_count += 1
    await db.flush()

    return ListingResponse(
        id=str(listing.id),
        title=listing.title,
        description=listing.description,
        category=listing.category,
        condition=listing.condition,
        listing_type=listing.listing_type,
        price=listing.price,
        is_negotiable=listing.is_negotiable,
        county=listing.county,
        photo_urls=listing.photo_urls,
        status=listing.status,
        message_count=listing.message_count,
        view_count=listing.view_count,
        username=username,
        created_at=listing.created_at.isoformat(),
    ).model_dump()


@router.patch("/marketplace/{listing_id}/status")
async def update_listing_status(
    listing_id: str,
    status: str = Query(..., regex="^(active|sold|traded|expired)$"),
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Update listing status (seller only)."""
    result = await db.execute(
        select(MarketplaceListing).where(MarketplaceListing.id == listing_id)
    )
    listing = result.scalar_one_or_none()
    if not listing:
        raise HTTPException(status_code=404, detail="Listing not found")
    if listing.user_id != user.id:
        raise HTTPException(status_code=403, detail="Not your listing")

    listing.status = status
    await db.flush()
    return {"status": listing.status}


# ─── Land Permissions ───────────────────────────────────────────

@router.post("/land-permissions")
async def create_land_permission(
    request: CreateLandPermissionRequest,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Create a land permission / hunting lease listing."""
    permission = LandPermission(
        user_id=user.id,
        title=request.title,
        description=request.description,
        county=request.county,
        acres=request.acres,
        terrain_description=request.terrain_description,
        general_area=request.general_area,
        permission_type=request.permission_type,
        species_allowed=request.species_allowed,
        weapons_allowed=request.weapons_allowed,
        max_hunters=request.max_hunters,
        price=request.price,
        price_unit=request.price_unit,
        photo_urls=request.photo_urls,
        state_code="MD",
    )
    db.add(permission)
    await db.flush()
    await db.refresh(permission)

    return {
        "id": str(permission.id),
        "title": permission.title,
        "county": permission.county,
        "permission_type": permission.permission_type,
        "status": permission.status,
        "created_at": permission.created_at.isoformat(),
    }


@router.get("/land-permissions")
async def list_land_permissions(
    county: Optional[str] = None,
    permission_type: Optional[str] = None,
    page: int = Query(default=1, ge=1),
    per_page: int = Query(default=20, ge=1, le=50),
    db: AsyncSession = Depends(get_db),
):
    """List available land permissions / hunting leases."""
    query = select(LandPermission, User.handle).join(
        User, LandPermission.user_id == User.id, isouter=True
    ).where(
        LandPermission.status == "active",
        LandPermission.is_removed == False,  # noqa: E712
    )

    if county:
        query = query.where(LandPermission.county == county)
    if permission_type:
        query = query.where(LandPermission.permission_type == permission_type)

    query = query.order_by(desc(LandPermission.created_at))
    offset = (page - 1) * per_page
    query = query.offset(offset).limit(per_page)

    result = await db.execute(query)
    rows = result.all()

    permissions = [
        {
            "id": str(perm.id),
            "title": perm.title,
            "description": perm.description[:200] + ("..." if len(perm.description) > 200 else ""),
            "county": perm.county,
            "acres": perm.acres,
            "general_area": perm.general_area,
            "permission_type": perm.permission_type,
            "species_allowed": perm.species_allowed,
            "price": perm.price,
            "price_unit": perm.price_unit,
            "photo_urls": perm.photo_urls,
            "status": perm.status,
            "is_verified": perm.is_verified,
            "username": username,
            "created_at": perm.created_at.isoformat(),
        }
        for perm, username in rows
    ]

    return {"permissions": permissions, "page": page, "per_page": per_page}
