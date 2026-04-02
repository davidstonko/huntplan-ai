"""
Thumbnail Generation Service

Generates thumbnails from uploaded photos using Pillow.
Called after photo upload confirmation.
Supports both local and R2/S3 storage backends.
"""

import io
import logging
from pathlib import Path
from typing import Optional, Tuple

from PIL import Image, ExifTags

logger = logging.getLogger(__name__)

# Thumbnail sizes
THUMBNAIL_SIZE = (400, 400)  # Max dimensions (maintains aspect ratio)
DISPLAY_SIZE = (1080, 1080)  # Max dimensions for display-quality images
JPEG_QUALITY = 82  # Good balance of size vs quality


def fix_orientation(img: Image.Image) -> Image.Image:
    """Fix image orientation based on EXIF data (common on mobile photos)."""
    try:
        for orientation in ExifTags.TAGS:
            if ExifTags.TAGS[orientation] == 'Orientation':
                break

        exif = img.getexif()
        if exif and orientation in exif:
            orient = exif[orientation]
            if orient == 3:
                img = img.rotate(180, expand=True)
            elif orient == 6:
                img = img.rotate(270, expand=True)
            elif orient == 8:
                img = img.rotate(90, expand=True)
    except (AttributeError, KeyError, IndexError):
        pass
    return img


def generate_thumbnail(
    image_bytes: bytes,
    size: Tuple[int, int] = THUMBNAIL_SIZE,
    quality: int = JPEG_QUALITY,
) -> Optional[bytes]:
    """
    Generate a thumbnail from image bytes.

    Args:
        image_bytes: Raw image file bytes
        size: Max (width, height) tuple
        quality: JPEG quality (1-100)

    Returns:
        Thumbnail bytes as JPEG, or None on failure
    """
    try:
        img = Image.open(io.BytesIO(image_bytes))
        img = fix_orientation(img)

        # Convert to RGB if needed (handles PNG with alpha, etc.)
        if img.mode in ('RGBA', 'P', 'LA'):
            img = img.convert('RGB')

        # Resize maintaining aspect ratio
        img.thumbnail(size, Image.Resampling.LANCZOS)

        # Save to bytes
        output = io.BytesIO()
        img.save(output, format='JPEG', quality=quality, optimize=True)
        output.seek(0)

        original_kb = len(image_bytes) / 1024
        thumb_kb = output.getbuffer().nbytes / 1024
        logger.info(f"Thumbnail: {original_kb:.0f}KB -> {thumb_kb:.0f}KB ({size[0]}x{size[1]})")

        return output.read()
    except Exception as e:
        logger.error(f"Thumbnail generation failed: {e}")
        return None


def compress_for_display(
    image_bytes: bytes,
    max_size: Tuple[int, int] = DISPLAY_SIZE,
    quality: int = JPEG_QUALITY,
) -> Optional[bytes]:
    """
    Compress an image for display quality (1080p max).
    Used to reduce storage costs and download times.

    Args:
        image_bytes: Raw image file bytes
        max_size: Max (width, height) tuple
        quality: JPEG quality (1-100)

    Returns:
        Compressed bytes as JPEG, or None on failure
    """
    try:
        img = Image.open(io.BytesIO(image_bytes))
        img = fix_orientation(img)

        if img.mode in ('RGBA', 'P', 'LA'):
            img = img.convert('RGB')

        # Only resize if larger than max
        if img.width > max_size[0] or img.height > max_size[1]:
            img.thumbnail(max_size, Image.Resampling.LANCZOS)

        output = io.BytesIO()
        img.save(output, format='JPEG', quality=quality, optimize=True)
        output.seek(0)

        original_kb = len(image_bytes) / 1024
        compressed_kb = output.getbuffer().nbytes / 1024
        reduction = (1 - compressed_kb / original_kb) * 100 if original_kb > 0 else 0
        logger.info(f"Compressed: {original_kb:.0f}KB -> {compressed_kb:.0f}KB ({reduction:.0f}% reduction)")

        return output.read()
    except Exception as e:
        logger.error(f"Image compression failed: {e}")
        return None


async def generate_and_store_thumbnail(
    image_bytes: bytes,
    thumbnail_key: str,
    storage_service,
) -> Optional[str]:
    """
    Generate thumbnail and store it via the storage service.

    Args:
        image_bytes: Original image bytes
        thumbnail_key: Storage key for the thumbnail
        storage_service: PhotoStorageService instance

    Returns:
        Public URL of thumbnail, or None on failure
    """
    thumb_bytes = generate_thumbnail(image_bytes)
    if not thumb_bytes:
        return None

    try:
        # Store thumbnail
        if hasattr(storage_service, 'upload_bytes'):
            await storage_service.upload_bytes(thumbnail_key, thumb_bytes, 'image/jpeg')
        else:
            # Local storage fallback
            local_path = Path("./data/photos") / thumbnail_key.replace("photos/", "")
            local_path.parent.mkdir(parents=True, exist_ok=True)
            local_path.write_bytes(thumb_bytes)

        return storage_service.get_public_url(thumbnail_key)
    except Exception as e:
        logger.error(f"Thumbnail storage failed: {e}")
        return None
