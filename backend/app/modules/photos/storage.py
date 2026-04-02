"""
Photo Storage Service — S3/R2 with Local Fallback

Handles:
- Presigned URL generation for direct client uploads to Cloudflare R2/S3
- Thumbnail generation from uploaded images (Pillow)
- Local file storage fallback when R2 is not configured
- File validation (size, content type, dimensions)
- Public URL construction for both R2 and local storage

Architecture:
- Mobile client requests presigned URL
- Client uploads directly to R2 using presigned URL
- Client confirms upload to backend
- Backend generates thumbnail asynchronously
- Backend stores photo metadata in database
"""

import os
import uuid
import logging
from io import BytesIO
from pathlib import Path
from typing import Optional, Tuple
from datetime import datetime

logger = logging.getLogger(__name__)

# ─── Configuration ─────────────────────────────────────────────────

MAX_FILE_SIZE = 10 * 1024 * 1024  # 10 MB
ALLOWED_CONTENT_TYPES = {"image/jpeg", "image/png", "image/heic"}
THUMBNAIL_SIZE = (400, 300)  # Width x Height
LOCAL_STORAGE_DIR = Path("./data/photos")

# ─── Storage Service ───────────────────────────────────────────────


class PhotoStorageService:
    """
    Unified photo storage service with R2/S3 support and local fallback.

    Supports:
    - Presigned URL generation for direct uploads
    - Thumbnail generation via Pillow
    - Public URL construction
    - Local file storage as fallback
    """

    def __init__(self, config):
        """
        Initialize storage service.

        Args:
            config: Settings object with R2 configuration
        """
        self.config = config
        self.s3_client = self._init_s3_client()
        self.use_local_storage = not self._is_r2_configured()

        # Ensure local storage directory exists if needed
        if self.use_local_storage:
            LOCAL_STORAGE_DIR.mkdir(parents=True, exist_ok=True)
            logger.info(f"Photo storage using local filesystem: {LOCAL_STORAGE_DIR}")
        else:
            logger.info(f"Photo storage configured for R2 bucket: {config.r2_bucket}")

    def _init_s3_client(self):
        """Initialize boto3 S3 client for R2. Returns None if not configured."""
        try:
            if not self._is_r2_configured():
                return None

            import boto3

            return boto3.client(
                "s3",
                endpoint_url=f"https://{self.config.r2_account_id}.r2.cloudflarestorage.com",
                aws_access_key_id=self.config.r2_access_key_id,
                aws_secret_access_key=self.config.r2_secret_access_key,
                region_name="auto",
            )
        except ImportError:
            logger.warning("boto3 not installed — R2 uploads disabled")
            return None
        except Exception as e:
            logger.error(f"Failed to initialize S3 client: {e}")
            return None

    def _is_r2_configured(self) -> bool:
        """Check if R2 credentials are fully configured."""
        return all([
            self.config.r2_account_id,
            self.config.r2_access_key_id,
            self.config.r2_secret_access_key,
        ])

    def validate_file(self, content_type: str, file_size: int) -> Tuple[bool, Optional[str]]:
        """
        Validate file before upload.

        Args:
            content_type: MIME type of the file
            file_size: Size in bytes

        Returns:
            Tuple of (is_valid, error_message)
        """
        if content_type not in ALLOWED_CONTENT_TYPES:
            return False, f"Unsupported content type: {content_type}. Allowed: {ALLOWED_CONTENT_TYPES}"

        if file_size > MAX_FILE_SIZE:
            return False, f"File too large: {file_size} bytes. Max: {MAX_FILE_SIZE} bytes"

        return True, None

    def get_file_extension(self, content_type: str) -> str:
        """Get file extension from content type."""
        mapping = {
            "image/jpeg": "jpg",
            "image/png": "png",
            "image/heic": "heic",
        }
        return mapping.get(content_type, "jpg")

    def generate_presigned_url(
        self,
        context: str,
        context_id: str,
        content_type: str,
        expires_in: int = 3600,
    ) -> str:
        """
        Generate a presigned URL for direct client upload.

        For R2: Returns presigned PUT URL from boto3
        For local: Returns backend endpoint URL

        Args:
            context: "camp", "harvest", or "scouting"
            context_id: camp_id, harvest_id, or report_id
            content_type: MIME type (e.g., "image/jpeg")
            expires_in: Expiration in seconds (R2 only)

        Returns:
            Presigned URL or local endpoint URL
        """
        ext = self.get_file_extension(content_type)
        photo_id = str(uuid.uuid4())
        image_key = f"photos/{context}/{context_id}/{photo_id}.{ext}"

        if self.use_local_storage:
            # Return backend endpoint for local upload
            return f"/api/v1/photos/upload-local/{photo_id}", image_key

        # Generate R2 presigned URL
        try:
            upload_url = self.s3_client.generate_presigned_url(
                "put_object",
                Params={
                    "Bucket": self.config.r2_bucket,
                    "Key": image_key,
                    "ContentType": content_type,
                },
                ExpiresIn=expires_in,
            )
            return upload_url, image_key
        except Exception as e:
            logger.error(f"Failed to generate presigned URL: {e}")
            raise

    def get_public_url(self, key: str) -> str:
        """
        Get the public URL for an uploaded object.

        Args:
            key: Storage key/path (e.g., "photos/camp/123/abc123.jpg")

        Returns:
            Public URL to access the file
        """
        if self.use_local_storage:
            return f"/api/v1/photos/file/{key}"

        if self.config.r2_public_url:
            return f"{self.config.r2_public_url}/{key}"

        return f"https://{self.config.r2_bucket}.r2.cloudflarestorage.com/{key}"

    async def save_local_file(self, photo_id: str, file_data: bytes, ext: str) -> str:
        """
        Save file to local storage.

        Args:
            photo_id: Unique photo ID
            file_data: Raw file bytes
            ext: File extension ("jpg", "png", "heic")

        Returns:
            Storage key path
        """
        timestamp = datetime.utcnow().strftime("%Y/%m/%d")
        storage_path = LOCAL_STORAGE_DIR / timestamp / f"{photo_id}.{ext}"
        storage_path.parent.mkdir(parents=True, exist_ok=True)

        # Write file
        with open(storage_path, "wb") as f:
            f.write(file_data)

        # Return relative key for database
        return f"photos/{timestamp}/{photo_id}.{ext}"

    async def generate_thumbnail(
        self,
        image_key: str,
        file_data: Optional[bytes] = None,
    ) -> Optional[str]:
        """
        Generate a thumbnail for an uploaded image.

        Uses Pillow to create a 400x300 thumbnail.
        For R2: Downloads original, generates thumb, uploads to R2
        For local: Generates thumb directly from local file

        Args:
            image_key: Path to original image (e.g., "photos/camp/123/abc123.jpg")
            file_data: Optional raw file data (for newly uploaded files)

        Returns:
            Thumbnail key/path, or None if generation failed
        """
        try:
            from PIL import Image

            # Extract context and photo ID from key
            parts = image_key.split("/")
            if len(parts) < 4:
                logger.warning(f"Invalid image key format: {image_key}")
                return None

            context = parts[1]
            context_id = parts[2]
            filename = parts[3]
            ext = filename.split(".")[-1]
            photo_id = filename.split(".")[0]

            thumbnail_key = f"photos/{context}/{context_id}/thumb_{photo_id}.{ext}"

            # Load image data
            if file_data:
                img_bytes = file_data
            elif self.use_local_storage:
                local_path = LOCAL_STORAGE_DIR / "/".join(image_key.split("/")[1:])
                if not local_path.exists():
                    logger.warning(f"Local file not found: {local_path}")
                    return None
                with open(local_path, "rb") as f:
                    img_bytes = f.read()
            else:
                # Download from R2
                try:
                    response = self.s3_client.get_object(
                        Bucket=self.config.r2_bucket,
                        Key=image_key,
                    )
                    img_bytes = response["Body"].read()
                except Exception as e:
                    logger.error(f"Failed to download image from R2 for thumbnail: {e}")
                    return None

            # Generate thumbnail
            img = Image.open(BytesIO(img_bytes))
            img.thumbnail(THUMBNAIL_SIZE, Image.Resampling.LANCZOS)

            # Save thumbnail
            thumb_buffer = BytesIO()
            img.save(thumb_buffer, format=ext.upper(), quality=85, optimize=True)
            thumb_buffer.seek(0)
            thumb_data = thumb_buffer.getvalue()

            # Upload or save locally
            if self.use_local_storage:
                timestamp = datetime.utcnow().strftime("%Y/%m/%d")
                thumb_path = LOCAL_STORAGE_DIR / timestamp / f"thumb_{photo_id}.{ext}"
                thumb_path.parent.mkdir(parents=True, exist_ok=True)
                with open(thumb_path, "wb") as f:
                    f.write(thumb_data)
            else:
                self.s3_client.put_object(
                    Bucket=self.config.r2_bucket,
                    Key=thumbnail_key,
                    Body=thumb_data,
                    ContentType=f"image/{ext}",
                )

            logger.info(f"Thumbnail generated: {thumbnail_key}")
            return thumbnail_key

        except ImportError:
            logger.warning("Pillow not installed — thumbnail generation disabled")
            return None
        except Exception as e:
            logger.error(f"Thumbnail generation failed: {e}")
            return None

    def health_check(self) -> dict:
        """
        Health check for storage service.

        Returns:
            Status dict with storage type and connectivity info
        """
        status = {
            "storage_type": "local" if self.use_local_storage else "r2",
            "configured": not self.use_local_storage,
            "local_dir_exists": LOCAL_STORAGE_DIR.exists(),
        }

        if not self.use_local_storage:
            try:
                self.s3_client.head_bucket(Bucket=self.config.r2_bucket)
                status["r2_accessible"] = True
            except Exception as e:
                status["r2_accessible"] = False
                status["r2_error"] = str(e)

        return status
