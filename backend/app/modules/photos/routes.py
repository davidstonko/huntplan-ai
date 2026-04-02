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
from pathlib import Path

from fastapi import APIRouter, Depends, HTTPException, File, UploadFile
from pydantic import BaseModel
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.db.database import get_db
from .storage import PhotoStorageService

logger = logging.getLogger(__name__)
router = APIRouter()

# Initialize storage service
storage = PhotoStorageService(settings)

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


class StorageHealthResponse(BaseModel):
    """Storage service health check response."""
    storage_type: str  # "r2" or "local"
    configured: bool
    r2_accessible: Optional[bool] = None
    local_dir_exists: bool


# ─── Endpoints ──────────────────────────────────────────────────


@router.post("/upload-url", response_model=UploadURLResponse)
async def get_upload_url(req: UploadURLRequest):
    """
    Generate a presigned URL for direct photo upload to R2/S3.

    The mobile app uploads the photo directly to storage using this URL,
    then calls /confirm to register the photo in the database.

    Validates content type and provides both upload URL and storage key paths.
    """
    # Validate file
    is_valid, error = storage.validate_file(req.content_type, file_size=0)  # Size checked on upload
    if not is_valid:
        raise HTTPException(status_code=400, detail=error)

    ext = storage.get_file_extension(req.content_type)
    photo_id = str(uuid.uuid4())

    # Generate presigned URL (or local endpoint)
    upload_url, image_key = storage.generate_presigned_url(
        context=req.context,
        context_id=req.context_id,
        content_type=req.content_type,
    )

    thumbnail_key = f"photos/{req.context}/{req.context_id}/thumb_{photo_id}.{ext}"

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

    For camp photos:
    - Inserts camp_photos record with geotag and caption
    - Adds activity feed entry ("added_photo")

    For harvest logs:
    - Updates harvest_logs.photo_key with the image key

    Thumbnail generation happens asynchronously (V3 with Celery).
    """
    photo_id = str(uuid.uuid4())
    now = datetime.utcnow().isoformat()

    if req.context == "camp":
        # Insert camp photo
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
                "lat": req.lat or 0.0,
                "lng": req.lng or 0.0,
                "caption": req.caption,
            },
        )

        # Add activity feed entry
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

    elif req.context == "scouting":
        # Insert scouting report photo
        await db.execute(
            text("""
                INSERT INTO scouting_photos (id, report_id, user_id, image_key, lat, lng, caption, uploaded_at)
                VALUES (:id, :report_id, :user_id, :image_key, :lat, :lng, :caption, NOW())
            """),
            {
                "id": photo_id,
                "report_id": req.context_id,
                "user_id": req.user_id,
                "image_key": req.image_key,
                "lat": req.lat,
                "lng": req.lng,
                "caption": req.caption,
            },
        )

    await db.commit()

    # Get public URL
    image_url = storage.get_public_url(req.image_key)

    return PhotoResponse(
        id=photo_id,
        image_url=image_url,
        thumbnail_url=None,  # Thumbnail generated async in V3
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
            "image_url": storage.get_public_url(row.image_key),
            "thumbnail_url": storage.get_public_url(row.thumbnail_key) if row.thumbnail_key else None,
            "lat": row.lat,
            "lng": row.lng,
            "caption": row.caption,
            "uploaded_by": str(row.uploaded_by),
            "uploaded_at": row.uploaded_at.isoformat() if row.uploaded_at else None,
        }
        for row in rows
    ]


@router.post("/upload-local/{photo_id}")
async def upload_local_file(
    photo_id: str,
    context: str,
    context_id: str,
    file: UploadFile = File(...),
):
    """
    Local file upload endpoint (fallback when R2 is not configured).

    Mobile client calls this endpoint to upload files directly for development/testing.

    Args:
        photo_id: Unique photo ID from presigned URL request
        context: "camp", "harvest", or "scouting"
        context_id: camp_id, harvest_id, or report_id
        file: Uploaded file
    """
    # Read file
    contents = await file.read()

    # Validate
    is_valid, error = storage.validate_file(file.content_type or "image/jpeg", len(contents))
    if not is_valid:
        raise HTTPException(status_code=400, detail=error)

    # Get extension
    ext = storage.get_file_extension(file.content_type or "image/jpeg")

    # Save locally
    try:
        image_key = await storage.save_local_file(photo_id, contents, ext)
        return {
            "image_key": image_key,
            "thumbnail_key": f"photos/{context}/{context_id}/thumb_{photo_id}.{ext}",
            "success": True,
        }
    except Exception as e:
        logger.error(f"Local file upload failed: {e}")
        raise HTTPException(status_code=500, detail="File upload failed")


@router.get("/file/{file_path:path}")
async def serve_local_file(file_path: str):
    """
    Serve files from local storage.

    Used when R2 is not configured. Maps /api/v1/photos/file/photos/... to local filesystem.
    """
    from fastapi.responses import FileResponse

    local_path = Path("./data/photos") / file_path.replace("photos/", "")

    if not local_path.exists():
        raise HTTPException(status_code=404, detail="File not found")

    return FileResponse(local_path)


@router.get("/health", response_model=StorageHealthResponse)
async def health_check():
    """
    Health check for photo storage service.

    Returns storage type, configuration status, and connectivity info.
    """
    return storage.health_check()
