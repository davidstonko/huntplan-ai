"""
Photos Module — S3/R2 Upload with Local Fallback

Handles photo uploads for camps, harvest logs, and scouting reports.

Features:
- Presigned URL generation for direct client uploads to Cloudflare R2/S3
- Thumbnail generation via Pillow (400x300, optimized)
- Local file storage fallback when R2 is not configured
- File validation (size ≤10MB, JPEG/PNG/HEIC only)
- Public URL construction for both R2 and local storage
- Geotag support (lat/lng) for all photo contexts
- Activity feed integration for camp photos

Files:
- storage.py — PhotoStorageService class with presigned URLs, thumbnails, validation
- routes.py — FastAPI endpoints for upload-url, confirm, list, and file serving
"""

from .storage import PhotoStorageService

__all__ = ["PhotoStorageService"]
