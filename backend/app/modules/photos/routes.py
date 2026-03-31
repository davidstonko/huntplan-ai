"""
Photo Upload Routes — S3/R2 Presigned URL Generation

Handles photo uploads for:
- Camp photos (geotagged, shared with camp members)
- Harvest log photos (trophy shots, game check documentation)
- Scouting report photos (trail cam pics, sign observations)

Flow:
1. Mobile requests presigned upload URL → POST /photos/upload-url
2. Mobile uploads directly to S3/R2 using presigned URL
3. Mobile confirms upload → POST /photos/confirm
4. Backend generates thumbnail (async) and stores metadata

Uses Cloudflare R2 (S3-compatible) for storage.
Falls back to local disk storage in development.
"""

import uuid
import logging
from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.db.database import get_db

logger = logging.getLogger(__name__)
router = APIRouter()


# ─── Request / Response Models ──────────────────────────────────


class UploadURLRequest(BaseModel):
    """Request a presigned upload URL."""
    context: str  # "camp", "harvest", "scouting"
    context_id: str  # camp_id, harvest_id, or report_id
    content_type: str = "image/jpeg"
    filename: Optional[str] = None


class UploadURLResponse(BaseModel):
    """Presigned upload URL + metadata."""
    upload_url: str
    image_key: str
    thumbnail_key: str
    expires_in: int = 3600


class ConfirmUploadRequest(BaseModel):
    """Confirm that an upload completed successfully."""
    image_key: str
    context: str  # "camp", "harvest", "scouting"
    context_id: str
    lat: Optional[float] = None
    lng: Optional[float] = None
    caption: Optional[str] = None
    user_id: str


class PhotoResponse(BaseModel):
    """Photo metadata response."""
    id: str
    image_url: str
    thumbnail_url: Optional[str] = None
    lat: Optional[float] = None
    lng: Optional[float] = None
    caption: Optional[str] = None
    uploaded_by: str
    uploaded_at: str


# ─── S3/R2 Client ──────────────────────────────────────────────


def _get_s3_client():
    """
    Get boto3 S3 client configured for Cloudflare R2.
    Returns None if R2 is not configured (falls back to local storage).
    """
    try:
        import boto3

        if not settings.r2_account_id:
            return None

        return boto3.client(
            "s3",
            endpoint_url=f"https://{settings.r2_account_id}.r2.cloudflarestorage.com",
            aws_access_key_id=settings.r2_access_key_id,
            aws_secret_access_key=settings.r2_secret_access_key,
            region_name="auto",
        )
    except ImportError:
        logger.warning("boto3 not installed — photo uploads disabled")
        return None
    except Exception as e:
        logger.warning(f"R2 client init failed: {e}")
        return None


def _generate_presigned_url(
    s3_client,
    bucket: str,
    key: str,
    content_type: str,
    expires_in: int = 3600,
) -> str:
    """Generate a presigned PUT URL for direct upload."""
    return s3_client.generate_presigned_url(
        "put_object",
        Params={
            "Bucket": bucket,
            "Key": key,
            "ContentType": content_type,
        },
        ExpiresIn=expires_in,
    )


def _get_public_url(key: str) -> str:
    """Get the public URL for an uploaded object."""
    if settings.r2_public_url:
        return f"{settings.r2_public_url}/{key}"
    return f"https://{settings.r2_bucket}.r2.cloudflarestorage.com/{key}"


# ─── Endpoints ──────────────────────────────────────────────────


@router.post("/upload-url", response_model=UploadURLResponse)
async def get_upload_url(req: UploadURLRequest):
    """
    Generate a presigned URL for direct photo upload to R2/S3.

    The mobile app uploads the photo directly to storage using this URL,
    then calls /confirm to register the photo in the database.
    """
    s3_client = _get_s3_client()

    # Generate storage keys
    ext = "jpg"
    if req.content_type == "image/png":
        ext = "png"
    elif req.content_type == "image/heic":
        ext = "heic"

    photo_id = str(uuid.uuid4())
    image_key = f"photos/{req.context}/{req.context_id}/{photo_id}.{ext}"
    thumbnail_key = f"photos/{req.context}/{req.context_id}/thumb_{photo_id}.{ext}"

    if s3_client:
        # R2/S3 presigned URL
        upload_url = _generate_presigned_url(
            s3_client,
            settings.r2_bucket,
            image_key,
            req.content_type,
        )
    else:
        # Development fallback: local upload endpoint
        upload_url = f"/api/v1/photos/upload-local/{photo_id}"

    return UploadURLResponse(
        upload_url=upload_url,
        image_key=image_key,
        thumbnail_key=thumbnail_key,
    )


@router.post("/confirm", response_model=PhotoResponse)
async def confirm_upload(
    req: ConfirmUploadRequest,
    db: AsyncSession = Depends(get_db),
):
    """
    Confirm a photo upload completed. Registers the photo in the database.
    Called by mobile after direct S3/R2 upload succeeds.
    """
    photo_id = str(uuid.uuid4())
    now = datetime.utcnow().isoformat()

    if req.context == "camp":
        # Insert into camp_photos table
        await db.execute(
            text("""
                INSERT INTO camp_photos (id, camp_id, uploaded_by, image_key, lat, lng, caption, uploaded_at)
                VALUES (:id, :camp_id, :user_id, :image_key, :lat, :lng, :caption, NOW())
            """),
            {
                "id": photo_id,
                "camp_id": req.context_id,
                "user_id": req.user_id,
                "image_key": req.image_key,
                "lat": req.lat or 0,
                "lng": req.lng or 0,
                "caption": req.caption,
            },
        )

        # Log camp activity
        await db.execute(
            text("""
                INSERT INTO camp_activity (id, camp_id, user_id, username, action, photo_id, timestamp)
                VALUES (:id, :camp_id, :user_id,
                    (SELECT username FROM camp_members WHERE user_id = :user_id AND camp_id = :camp_id LIMIT 1),
                    'added_photo', :photo_id, NOW())
            """),
            {
                "id": str(uuid.uuid4()),
                "camp_id": req.context_id,
                "user_id": req.user_id,
                "photo_id": photo_id,
            },
        )

    elif req.context == "harvest":
        # Update harvest log with photo key
        await db.execute(
            text("UPDATE harvest_logs SET photo_key = :key WHERE id = :id AND user_id = :user_id"),
            {"key": req.image_key, "id": req.context_id, "user_id": req.user_id},
        )

    image_url = _get_public_url(req.image_key)

    return PhotoResponse(
        id=photo_id,
        image_url=image_url,
        thumbnail_url=None,  # Generated async later
        lat=req.lat,
        lng=req.lng,
        caption=req.caption,
        uploaded_by=req.user_id,
        uploaded_at=now,
    )


@router.get("/camp/{camp_id}")
async def list_camp_photos(
    camp_id: str,
    limit: int = 50,
    offset: int = 0,
    db: AsyncSession = Depends(get_db),
):
    """List all photos in a camp, newest first."""
    result = await db.execute(
        text("""
            SELECT id, image_key, thumbnail_key, lat, lng, caption,
                   uploaded_by, uploaded_at
            FROM camp_photos
            WHERE camp_id = :camp_id
            ORDER BY uploaded_at DESC
            LIMIT :limit OFFSET :offset
        """),
        {"camp_id": camp_id, "limit": limit, "offset": offset},
    )
    rows = result.fetchall()

    return [
        {
            "id": str(row.id),
            "image_url": _get_public_url(row.image_key),
            "thumbnail_url": _get_public_url(row.thumbnail_key) if row.thumbnail_key else None,
            "lat": row.lat,
            "lng": row.lng,
            "caption": row.caption,
            "uploaded_by": str(row.uploaded_by),
            "uploaded_at": row.uploaded_at.isoformat() if row.uploaded_at else None,
        }
        for row in rows
    ]
