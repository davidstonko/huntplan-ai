/**
 * Analytics Event Tracking Client
 *
 * Collects user analytics and posts to backend /api/v1/analytics/events.
 * - Offline-first: queues events in AsyncStorage if network is unavailable
 * - Respects opt-out via SettingsContext.ANALYTICS_ENABLED
 * - Flushed periodically or on app foreground
 *
 * Usage:
 *   trackEvent('hunt_screen_opened', { activity_mode: 'hunt' })
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_BASE_URL } from './api';

const ANALYTICS_QUEUE_KEY = '@mdhuntfish:analytics_queue_v1';
const FLUSH_INTERVAL_MS = 30000; // 30s

interface AnalyticsEvent {
  event_name: string;
  properties?: Record<string, unknown>;
  user_id?: string;
  timestamp: string;
}

let flushTimer: NodeJS.Timeout | null = null;

/**
 * Track a user event. Will queue offline and flush when online.
 *
 * @param eventName - Name of the event (e.g., 'hunt_stand_placed', 'fish_spot_viewed')
 * @param properties - Optional properties/context (e.g., { location_id: 123, water_type: 'stream' })
 * @param userId - Optional user identifier
 * @param analyticsEnabled - Whether analytics is enabled (from SettingsContext)
 */
export async function trackEvent(
  eventName: string,
  properties?: Record<string, unknown>,
  userId?: string,
  analyticsEnabled: boolean = true,
): Promise<void> {
  if (!analyticsEnabled) {
    return;
  }

  const event: AnalyticsEvent = {
    event_name: eventName,
    properties,
    user_id: userId,
    timestamp: new Date().toISOString(),
  };

  // Queue event in AsyncStorage
  try {
    const queueRaw = await AsyncStorage.getItem(ANALYTICS_QUEUE_KEY);
    const queue: AnalyticsEvent[] = queueRaw ? JSON.parse(queueRaw) : [];
    queue.push(event);
    await AsyncStorage.setItem(ANALYTICS_QUEUE_KEY, JSON.stringify(queue));

    // Attempt flush
    await flushAnalyticsQueue(analyticsEnabled);
  } catch (err) {
    // eslint-disable-next-line no-console
    console.warn('[Analytics] Failed to queue event:', err);
  }
}

/**
 * Flush all queued events to backend.
 * On network error, events remain queued for next flush attempt.
 */
export async function flushAnalyticsQueue(analyticsEnabled: boolean = true): Promise<void> {
  if (!analyticsEnabled) {
    return;
  }

  try {
    const queueRaw = await AsyncStorage.getItem(ANALYTICS_QUEUE_KEY);
    const queue: AnalyticsEvent[] = queueRaw ? JSON.parse(queueRaw) : [];

    if (queue.length === 0) {
      return;
    }

    // POST all events in batch
    const response = await fetch(`${API_BASE_URL}/api/v1/analytics/events`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ events: queue }),
    });

    if (!response.ok) {
      throw new Error(`Analytics POST failed: ${response.status}`);
    }

    // Clear queue on success
    await AsyncStorage.removeItem(ANALYTICS_QUEUE_KEY);
    // eslint-disable-next-line no-console
    console.log(`[Analytics] Flushed ${queue.length} events`);
  } catch (err) {
    // Network error or server error — leave queue intact for retry
    // eslint-disable-next-line no-console
    console.warn('[Analytics] Flush failed (will retry):', err);
  }
}

/**
 * Start periodic flush of analytics queue.
 * Call once on app boot to ensure events are sent regularly.
 */
export function startAnalyticsFlush(analyticsEnabled: boolean = true): void {
  if (flushTimer) {
    clearInterval(flushTimer);
  }

  if (!analyticsEnabled) {
    return;
  }

  flushTimer = setInterval(() => {
    flushAnalyticsQueue(analyticsEnabled).catch(() => {
      // Silently continue
    });
  }, FLUSH_INTERVAL_MS);
}

/**
 * Stop periodic analytics flush (e.g., on app suspend).
 */
export function stopAnalyticsFlush(): void {
  if (flushTimer) {
    clearInterval(flushTimer);
    flushTimer = null;
  }
}
