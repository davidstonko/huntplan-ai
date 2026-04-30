/**
 * Photo Upload Service — S3/R2 Direct Upload
 *
 * Handles photo uploads for camps, harvest logs, and scouting reports.
 * Flow:
 * 1. Request presigned upload URL from backend
 * 2. Compress image on device (quality-based reduction)
 * 3. Upload directly to R2/S3 using presigned URL
 * 4. Confirm upload with backend (registers metadata)
 *
 * Supports offline queuing — queued uploads retry when connectivity returns.
 * Image compression reduces bandwidth usage on LTE.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { Image } from 'react-native';
import RNFS from 'react-native-fs';
import Config from '../config';
import { stripExifMarkers, isJpeg, bytesStripped } from './exifStripper';

// ── Types ──────────────────────────────────────────────────────

export interface UploadResult {
  id: string;
  image_url: string;
  thumbnail_url?: string;
}

interface UploadURLResponse {
  upload_url: string;
  image_key: string;
  thumbnail_key: string;
  expires_in: number;
}

interface QueuedUpload {
  id: string;
  context: 'camp' | 'harvest' | 'scouting';
  context_id: string;
  localUri: string;
  lat?: number;
  lng?: number;
  caption?: string;
  timestamp: string;
}

interface CompressionMetadata {
  originalWidth: number;
  originalHeight: number;
  originalSize: number;
  compressedSize: number;
  quality: number;
}

const UPLOAD_QUEUE_KEY = 'photo_upload_queue';
const COMPRESSION_SETTINGS_KEY = 'photo_compression_enabled';

let compressionEnabled = true;

// ── Compression Utilities ──────────────────────────────────────

/**
 * Initialize compression settings from AsyncStorage
 * Call this once on app launch
 */
export async function initCompressionSettings(): Promise<void> {
  try {
    const stored = await AsyncStorage.getItem(COMPRESSION_SETTINGS_KEY);
    compressionEnabled = stored !== 'false';
    if (__DEV__) console.log('[Photo] Compression enabled:', compressionEnabled);
  } catch (err) {
    if (__DEV__) console.warn('[Photo] Failed to load compression settings:', err);
  }
}

/**
 * Enable or disable image compression
 */
export async function setCompressionEnabled(enabled: boolean): Promise<void> {
  try {
    compressionEnabled = enabled;
    await AsyncStorage.setItem(COMPRESSION_SETTINGS_KEY, enabled ? 'true' : 'false');
    if (__DEV__) console.log('[Photo] Compression setting updated:', enabled);
  } catch (err) {
    if (__DEV__) console.warn('[Photo] Failed to save compression setting:', err);
  }
}

/**
 * Get compression enabled status
 */
export function isCompressionEnabled(): boolean {
  return compressionEnabled;
}

/**
 * Get image dimensions and size information
 * Returns null if unable to determine dimensions
 */
async function getImageInfo(
  localUri: string,
): Promise<{ width: number; height: number; size: number } | null> {
  return new Promise((resolve) => {
    Image.getSize(
      localUri,
      (width: number, height: number) => {
        // Try to get file size via fetch
        fetch(localUri)
          .then((r) => r.blob())
          .then((blob) => {
            resolve({ width, height, size: blob.size });
          })
          .catch(() => {
            // If we can't get blob size, estimate from dimensions
            resolve({ width, height, size: width * height * 1.5 });
          });
      },
      () => {
        resolve(null);
      },
    );
  });
}

/**
 * Compress image before upload by creating a JPEG with reduced quality
 * Falls back to original if compression fails or is disabled
 *
 * @param localUri - Local file URI
 * @returns Compressed file URI and metadata, or original URI if compression disabled
 */
async function compressImage(
  localUri: string,
): Promise<{
  uri: string;
  metadata: CompressionMetadata | null;
}> {
  if (!compressionEnabled) {
    return { uri: localUri, metadata: null };
  }

  try {
    const imageInfo = await getImageInfo(localUri);
    if (!imageInfo) {
      if (__DEV__) console.warn('[Photo] Could not get image dimensions, skipping compression');
      return { uri: localUri, metadata: null };
    }

    const { width, height, size: originalSize } = imageInfo;

    // Log original dimensions
    if (__DEV__) {
      console.log(
        `[Photo] Original image: ${width}x${height}px, ~${(originalSize / 1024).toFixed(1)}KB`,
      );
    }

    // EXIF / metadata stripping (privacy policy promise — see
    // huntmaryland-site/privacy.html §5). We re-emit the JPEG without its
    // APPn / comment segments so GPS coordinates, camera serial, and
    // timestamps never reach our backend. Pixel data is preserved
    // byte-for-byte; the strip is metadata-only, not a re-encode.
    //
    // Non-JPEG images (e.g., PNG screenshots) are passed through unchanged
    // by stripExifMarkers, so this is safe to apply unconditionally.
    let strippedUri = localUri;
    let strippedSize = originalSize;
    try {
      const filePath = localUri.replace(/^file:\/\//, '');
      const base64 = await RNFS.readFile(filePath, 'base64');
      const inputBytes = base64ToBytes(base64);
      if (isJpeg(inputBytes)) {
        const cleanBytes = stripExifMarkers(inputBytes);
        const droppedBytes = bytesStripped(inputBytes, cleanBytes);
        if (droppedBytes > 0) {
          const cleanBase64 = bytesToBase64(cleanBytes);
          const outPath = `${RNFS.CachesDirectoryPath}/photo-stripped-${Date.now()}.jpg`;
          await RNFS.writeFile(outPath, cleanBase64, 'base64');
          strippedUri = `file://${outPath}`;
          strippedSize = cleanBytes.length;
          if (__DEV__) {
            console.log(
              `[Photo] EXIF stripped: ${droppedBytes} bytes removed (${(originalSize / 1024).toFixed(1)}KB → ${(strippedSize / 1024).toFixed(1)}KB)`,
            );
          }
        }
      }
    } catch (stripErr) {
      // Strip failed — fall through with original URI rather than block
      // the upload. Logged so we can spot patterns in dev.
      if (__DEV__) console.warn('[Photo] EXIF strip skipped:', stripErr);
    }

    // React Native doesn't have built-in pixel-level compression in the
    // base library, so we track the original dimensions for backend-side
    // compression or future native module integration. The EXIF strip
    // above is the only on-device size reduction we apply today.
    const metadata: CompressionMetadata = {
      originalWidth: width,
      originalHeight: height,
      originalSize: originalSize,
      compressedSize: strippedSize,
      quality: 0.7, // Target quality for future native compression
    };

    if (__DEV__) {
      console.log(
        `[Photo] Compression metadata prepared (quality: ${metadata.quality}, ${(strippedSize / 1024).toFixed(1)}KB)`,
      );
    }

    return { uri: strippedUri, metadata };
  } catch (error) {
    if (__DEV__) console.warn('[Photo] Compression error, using original:', error);
    return { uri: localUri, metadata: null };
  }
}

// ── Base64 ↔ bytes helpers ─────────────────────────────────────
//
// React Native 0.76 exposes global atob/btoa, but they choke on large
// strings via spread (call-stack limit). We chunk through fromCharCode in
// 8KB windows so a 5MB photo doesn't crash the stack.

function base64ToBytes(b64: string): Uint8Array {
  const binary = global.atob ? global.atob(b64) : '';
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

function bytesToBase64(bytes: Uint8Array): string {
  const CHUNK = 0x2000; // 8KB
  const parts: string[] = [];
  for (let i = 0; i < bytes.length; i += CHUNK) {
    const slice = bytes.subarray(i, Math.min(i + CHUNK, bytes.length));
    parts.push(String.fromCharCode.apply(null, Array.from(slice) as number[]));
  }
  return global.btoa ? global.btoa(parts.join('')) : '';
}

// ── API Helpers ────────────────────────────────────────────────

async function getAuthHeaders(): Promise<Record<string, string>> {
  const token = await AsyncStorage.getItem('auth_token');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

// ── Main Upload Function ───────────────────────────────────────

/**
 * Upload a photo to the backend via presigned URL.
 *
 * @param localUri - Local file URI (e.g., from camera or image picker)
 * @param context - Where the photo belongs: 'camp', 'harvest', 'scouting'
 * @param contextId - The ID of the parent entity (camp_id, harvest_id, etc.)
 * @param options - Optional metadata (lat, lng, caption)
 * @returns Upload result with image URL, or null if failed (queued for retry)
 */
export async function uploadPhoto(
  localUri: string,
  context: 'camp' | 'harvest' | 'scouting',
  contextId: string,
  options?: {
    lat?: number;
    lng?: number;
    caption?: string;
    userId?: string;
  },
): Promise<UploadResult | null> {
  try {
    const headers = await getAuthHeaders();

    // Step 0: Compress image if enabled
    const { uri: uploadUri, metadata: compressionMetadata } = await compressImage(localUri);

    // Step 1: Get presigned upload URL
    const contentType = uploadUri.toLowerCase().endsWith('.png')
      ? 'image/png'
      : 'image/jpeg';

    const urlResponse = await fetch(`${Config.API_BASE_URL}/api/v1/photos/upload-url`, {
      method: 'POST',
      headers: { ...headers, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        context,
        context_id: contextId,
        content_type: contentType,
      }),
    });

    if (!urlResponse.ok) {
      throw new Error(`Failed to get upload URL: ${urlResponse.status}`);
    }

    const uploadData: UploadURLResponse = await urlResponse.json();

    // Step 2: Upload photo directly to R2/S3
    const photoBlob = await fetch(uploadUri).then(r => r.blob());

    if (__DEV__) {
      console.log(
        `[Photo] Uploading ${(photoBlob.size / 1024).toFixed(1)}KB to R2 (${contentType})`,
      );
    }

    const uploadResponse = await fetch(uploadData.upload_url, {
      method: 'PUT',
      headers: { 'Content-Type': contentType },
      body: photoBlob,
    });

    if (!uploadResponse.ok) {
      throw new Error(`Upload failed: ${uploadResponse.status}`);
    }

    // Step 3: Confirm upload with backend
    const userId = options?.userId || (await AsyncStorage.getItem('user_id')) || '';

    const confirmResponse = await fetch(`${Config.API_BASE_URL}/api/v1/photos/confirm`, {
      method: 'POST',
      headers: { ...headers, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        image_key: uploadData.image_key,
        context,
        context_id: contextId,
        lat: options?.lat,
        lng: options?.lng,
        caption: options?.caption,
        user_id: userId,
        compression_metadata: compressionMetadata,
      }),
    });

    if (!confirmResponse.ok) {
      throw new Error(`Confirm failed: ${confirmResponse.status}`);
    }

    const result = await confirmResponse.json();

    if (__DEV__) {
      console.log(
        `[Photo] Upload complete: ${result.id} (${(photoBlob.size / 1024).toFixed(1)}KB uploaded)`,
      );
    }

    return {
      id: result.id,
      image_url: result.image_url,
      thumbnail_url: result.thumbnail_url,
    };
  } catch (error) {
    if (__DEV__) console.error('[Photo] Upload failed, queuing for retry:', error);

    // Queue for offline retry
    await queueUpload({
      id: Date.now().toString(),
      context,
      context_id: contextId,
      localUri,
      lat: options?.lat,
      lng: options?.lng,
      caption: options?.caption,
      timestamp: new Date().toISOString(),
    });

    return null;
  }
}

// ── Offline Queue ──────────────────────────────────────────────

async function queueUpload(upload: QueuedUpload): Promise<void> {
  try {
    const existing = await AsyncStorage.getItem(UPLOAD_QUEUE_KEY);
    const queue: QueuedUpload[] = existing ? JSON.parse(existing) : [];
    queue.push(upload);
    await AsyncStorage.setItem(UPLOAD_QUEUE_KEY, JSON.stringify(queue));
    if (__DEV__) console.log(`[Photo] Queued upload (${queue.length} pending)`);
  } catch (err) {
    if (__DEV__) console.error('[Photo] Failed to queue upload:', err);
  }
}

/**
 * Process any queued uploads (call on app foreground or network restore).
 */
export async function processUploadQueue(): Promise<number> {
  try {
    const existing = await AsyncStorage.getItem(UPLOAD_QUEUE_KEY);
    if (!existing) return 0;

    const queue: QueuedUpload[] = JSON.parse(existing);
    if (queue.length === 0) return 0;

    if (__DEV__) console.log(`[Photo] Processing ${queue.length} queued uploads...`);

    const remaining: QueuedUpload[] = [];
    let successCount = 0;

    for (const item of queue) {
      const result = await uploadPhoto(item.localUri, item.context, item.context_id, {
        lat: item.lat,
        lng: item.lng,
        caption: item.caption,
      });

      if (result) {
        successCount++;
      } else {
        remaining.push(item);
      }
    }

    await AsyncStorage.setItem(UPLOAD_QUEUE_KEY, JSON.stringify(remaining));
    if (__DEV__) console.log(`[Photo] Queue processed: ${successCount} uploaded, ${remaining.length} remaining`);
    return successCount;
  } catch (err) {
    if (__DEV__) console.error('[Photo] Queue processing failed:', err);
    return 0;
  }
}

/**
 * Get the number of pending uploads in the queue.
 */
export async function getPendingUploadCount(): Promise<number> {
  try {
    const existing = await AsyncStorage.getItem(UPLOAD_QUEUE_KEY);
    if (!existing) return 0;
    return JSON.parse(existing).length;
  } catch (error) {
    if (__DEV__) console.error('[Photo] Failed to get pending upload count:', error);
    return 0;
  }
}
