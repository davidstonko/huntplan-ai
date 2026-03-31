/**
 * Photo Upload Service — S3/R2 Direct Upload
 *
 * Handles photo uploads for camps, harvest logs, and scouting reports.
 * Flow:
 * 1. Request presigned upload URL from backend
 * 2. Compress image on device
 * 3. Upload directly to R2/S3 using presigned URL
 * 4. Confirm upload with backend (registers metadata)
 *
 * Supports offline queuing — queued uploads retry when connectivity returns.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

const API_BASE_URL = __DEV__
  ? 'http://localhost:8000'
  : 'https://huntplan-api.onrender.com';

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

const UPLOAD_QUEUE_KEY = 'photo_upload_queue';

// ── API Helpers ────────────────────────────────────────────────

async function getAuthHeaders(): Promise<Record<string, string>> {
  const token = await AsyncStorage.getItem('jwt_token');
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

    // Step 1: Get presigned upload URL
    const contentType = localUri.toLowerCase().endsWith('.png')
      ? 'image/png'
      : 'image/jpeg';

    const urlResponse = await fetch(`${API_BASE_URL}/api/v1/photos/upload-url`, {
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
    const photoBlob = await fetch(localUri).then(r => r.blob());

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

    const confirmResponse = await fetch(`${API_BASE_URL}/api/v1/photos/confirm`, {
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
      }),
    });

    if (!confirmResponse.ok) {
      throw new Error(`Confirm failed: ${confirmResponse.status}`);
    }

    const result = await confirmResponse.json();
    return {
      id: result.id,
      image_url: result.image_url,
      thumbnail_url: result.thumbnail_url,
    };
  } catch (error) {
    console.error('[Photo] Upload failed, queuing for retry:', error);

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
    console.log(`[Photo] Queued upload (${queue.length} pending)`);
  } catch (err) {
    console.error('[Photo] Failed to queue upload:', err);
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

    console.log(`[Photo] Processing ${queue.length} queued uploads...`);

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
    console.log(`[Photo] Queue processed: ${successCount} uploaded, ${remaining.length} remaining`);
    return successCount;
  } catch (err) {
    console.error('[Photo] Queue processing failed:', err);
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
  } catch {
    return 0;
  }
}
