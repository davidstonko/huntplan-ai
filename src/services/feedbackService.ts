/**
 * @file services/feedbackService.ts
 * @description Feedback submission service with offline queue.
 *
 * When the user submits feedback:
 *  1. Save to AsyncStorage queue immediately (offline-safe)
 *  2. Attempt to POST to backend
 *  3. If successful, remove from queue
 *  4. If offline, retry next time the service is called
 *
 * The queue is flushed on app launch and after each new submission.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { Config } from '../config';
import { Platform } from 'react-native';

// ── Types ──────────────────────────────────────────────────────

export interface FeedbackPayload {
  feedback_type: 'bug' | 'outdated' | 'suggestion';
  description: string;
  screen?: string;
  active_tab?: string;
  app_version?: string;
  ios_version?: string;
  device_id?: string;
}

interface QueuedFeedback extends FeedbackPayload {
  queued_at: string;
  id: string; // local UUID for dedup
}

// ── Constants ──────────────────────────────────────────────────

const QUEUE_KEY = '@feedback_queue';
const APP_VERSION = '2.0.0';

// ── Queue Management ───────────────────────────────────────────

async function getQueue(): Promise<QueuedFeedback[]> {
  try {
    const raw = await AsyncStorage.getItem(QUEUE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

async function saveQueue(queue: QueuedFeedback[]): Promise<void> {
  await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
}

async function addToQueue(payload: FeedbackPayload): Promise<string> {
  const queue = await getQueue();
  const localId = `fb_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  queue.push({
    ...payload,
    queued_at: new Date().toISOString(),
    id: localId,
  });
  await saveQueue(queue);
  return localId;
}

async function removeFromQueue(localId: string): Promise<void> {
  const queue = await getQueue();
  const filtered = queue.filter(item => item.id !== localId);
  await saveQueue(filtered);
}

// ── API Calls ──────────────────────────────────────────────────

async function getAuthToken(): Promise<string | null> {
  try {
    return await AsyncStorage.getItem('auth_token');
  } catch {
    return null;
  }
}

async function postFeedback(payload: FeedbackPayload): Promise<{ ok: boolean; feedback_id?: string }> {
  try {
    const token = await getAuthToken();
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(`${Config.API_BASE_URL}/api/v1/feedback/submit`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        ...payload,
        app_version: payload.app_version || APP_VERSION,
        ios_version: payload.ios_version || Platform.Version?.toString(),
      }),
    });

    if (response.ok) {
      const data = await response.json();
      return { ok: true, feedback_id: data.feedback_id };
    }

    // Non-OK but reachable — don't retry (likely a validation error)
    if (response.status >= 400 && response.status < 500) {
      if (__DEV__) console.warn('[Feedback] Server rejected submission:', response.status);
      return { ok: false };
    }

    // Server error — worth retrying
    return { ok: false };
  } catch (error) {
    // Network error — offline, will retry from queue
    if (__DEV__) console.log('[Feedback] Network unavailable, queued for retry');
    return { ok: false };
  }
}

// ── Public API ─────────────────────────────────────────────────

/**
 * Submit feedback with offline support.
 * Always saves to local queue first, then attempts network send.
 * Returns true if the feedback was at least queued successfully.
 */
export async function submitFeedback(payload: FeedbackPayload): Promise<boolean> {
  // 1. Queue locally first (guarantees persistence)
  const localId = await addToQueue(payload);

  // 2. Attempt immediate send
  const result = await postFeedback(payload);

  if (result.ok) {
    // Success — remove from queue
    await removeFromQueue(localId);
    if (__DEV__) {
      console.log('[Feedback] Submitted successfully:', result.feedback_id);
    }
  } else {
    if (__DEV__) {
      console.log('[Feedback] Queued for retry:', localId);
    }
  }

  return true;
}

/**
 * Flush any queued feedback that failed to send previously.
 * Call this on app launch or when network becomes available.
 */
export async function flushFeedbackQueue(): Promise<number> {
  const queue = await getQueue();
  if (queue.length === 0) return 0;

  if (__DEV__) {
    console.log(`[Feedback] Flushing ${queue.length} queued items`);
  }

  let sent = 0;
  for (const item of queue) {
    const result = await postFeedback({
      feedback_type: item.feedback_type,
      description: item.description,
      screen: item.screen,
      active_tab: item.active_tab,
      app_version: item.app_version,
      ios_version: item.ios_version,
      device_id: item.device_id,
    });

    if (result.ok) {
      await removeFromQueue(item.id);
      sent++;
    } else {
      // Stop flushing on first failure (likely still offline)
      break;
    }
  }

  if (__DEV__ && sent > 0) {
    console.log(`[Feedback] Flushed ${sent}/${queue.length} queued items`);
  }

  return sent;
}

/**
 * Get the count of pending (unsent) feedback items.
 * Useful for showing a badge on the UI.
 */
export async function getPendingFeedbackCount(): Promise<number> {
  const queue = await getQueue();
  return queue.length;
}
