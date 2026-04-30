/**
 * @file analyticsService.ts
 * @description Lightweight analytics for MDHuntFishOutdoors.
 * Tracks screen views, feature usage, and affiliate conversions.
 * Offline-first: queues events locally, flushes to backend when connected.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import Config from '../config';

// Event types
export type AnalyticsEventType =
  | 'screen_view'
  | 'feature_used'
  | 'affiliate_tap'
  | 'search'
  | 'filter_change'
  | 'plan_created'
  | 'trip_planned'
  | 'error';

export interface AnalyticsEvent {
  id: string;
  type: AnalyticsEventType;
  screenName?: string;
  feature?: string;
  productName?: string;
  asin?: string;
  category?: string;
  query?: string;
  resultCount?: number;
  filterType?: string;
  planType?: string;
  tripType?: string;
  season?: string;
  itemCount?: number;
  errorMessage?: string;
  errorContext?: string;
  metadata?: Record<string, unknown>;
  timestamp: number;
  sessionId: string;
  appVersion: string;
}

interface AnalyticsServiceConfig {
  sessionId: string;
  appVersion: string;
  flushIntervalMs?: number;
  maxQueueSize?: number;
}

const QUEUE_STORAGE_KEY = '@analytics_queue';
const CONFIG_STORAGE_KEY = '@analytics_config';
const DEFAULT_FLUSH_INTERVAL = 60000; // 60 seconds
const DEFAULT_MAX_QUEUE_SIZE = 500;

let config: AnalyticsServiceConfig | null = null;
let flushTimer: ReturnType<typeof setInterval> | null = null;

/**
 * Initialize analytics service
 * @param sessionId - Unique session identifier (device ID)
 * @param appVersion - App version string (from package.json)
 * @param flushIntervalMs - Optional flush interval (ms)
 */
export const initializeAnalytics = async (
  sessionId: string,
  appVersion: string,
  flushIntervalMs?: number
): Promise<void> => {
  try {
    config = {
      sessionId,
      appVersion,
      flushIntervalMs: flushIntervalMs ?? DEFAULT_FLUSH_INTERVAL,
      maxQueueSize: DEFAULT_MAX_QUEUE_SIZE,
    };

    await AsyncStorage.setItem(CONFIG_STORAGE_KEY, JSON.stringify(config));

    // Set up auto-flush timer
    if (flushTimer) {
      clearInterval(flushTimer);
    }

    flushTimer = setInterval(() => {
      flushEvents().catch((error: unknown) => {
        console.warn('[Analytics] Auto-flush failed:', error);
      });
    }, config.flushIntervalMs);

    console.log('[Analytics] Initialized');
  } catch (error) {
    console.warn('[Analytics] Initialization failed:', error);
  }
};

/**
 * Generate unique event ID
 */
const generateEventId = (): string => {
  return `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

/**
 * Track a screen view
 * @param screenName - Screen/tab name
 * @param params - Optional additional parameters
 */
export const trackScreenView = async (
  screenName: string,
  params?: Record<string, unknown>
): Promise<void> => {
  if (!config) {
    console.warn('[Analytics] Not initialized');
    return;
  }

  const event: AnalyticsEvent = {
    id: generateEventId(),
    type: 'screen_view',
    screenName,
    metadata: params,
    timestamp: Date.now(),
    sessionId: config.sessionId,
    appVersion: config.appVersion,
  };

  await enqueueEvent(event);
};

/**
 * Track feature usage
 * @param feature - Feature name (e.g., 'gear_picks', 'trip_planner')
 * @param metadata - Optional feature-specific data
 */
export const trackFeatureUsed = async (
  feature: string,
  metadata?: Record<string, unknown>
): Promise<void> => {
  if (!config) {
    console.warn('[Analytics] Not initialized');
    return;
  }

  const event: AnalyticsEvent = {
    id: generateEventId(),
    type: 'feature_used',
    feature,
    metadata,
    timestamp: Date.now(),
    sessionId: config.sessionId,
    appVersion: config.appVersion,
  };

  await enqueueEvent(event);
};

/**
 * Track affiliate link tap for conversion analysis
 * @param productName - Product name (e.g., 'Gobstopper Decoy')
 * @param asin - Amazon ASIN
 * @param category - Product category (e.g., 'decoys', 'licenses', 'boots')
 */
export const trackAffiliateTap = async (
  productName: string,
  asin: string,
  category: string
): Promise<void> => {
  if (!config) {
    console.warn('[Analytics] Not initialized');
    return;
  }

  const event: AnalyticsEvent = {
    id: generateEventId(),
    type: 'affiliate_tap',
    productName,
    asin,
    category,
    timestamp: Date.now(),
    sessionId: config.sessionId,
    appVersion: config.appVersion,
  };

  await enqueueEvent(event);
};

/**
 * Track search behavior
 * @param query - Search query text
 * @param resultCount - Number of results returned
 */
export const trackSearch = async (query: string, resultCount: number): Promise<void> => {
  if (!config) {
    console.warn('[Analytics] Not initialized');
    return;
  }

  const event: AnalyticsEvent = {
    id: generateEventId(),
    type: 'search',
    query,
    resultCount,
    timestamp: Date.now(),
    sessionId: config.sessionId,
    appVersion: config.appVersion,
  };

  await enqueueEvent(event);
};

/**
 * Track filter changes
 * @param filterType - Filter type (e.g., 'land_type', 'species', 'weapon')
 * @param metadata - Filter values and active state
 */
export const trackFilterChange = async (
  filterType: string,
  metadata?: Record<string, unknown>
): Promise<void> => {
  if (!config) {
    console.warn('[Analytics] Not initialized');
    return;
  }

  const event: AnalyticsEvent = {
    id: generateEventId(),
    type: 'filter_change',
    filterType,
    metadata,
    timestamp: Date.now(),
    sessionId: config.sessionId,
    appVersion: config.appVersion,
  };

  await enqueueEvent(event);
};

/**
 * Track plan creation
 * @param planType - Type of plan (e.g., 'hunt_plan', 'fish_spot', 'camp_trip')
 * @param metadata - Plan metadata (location, season, etc.)
 */
export const trackPlanCreated = async (
  planType: string,
  metadata?: Record<string, unknown>
): Promise<void> => {
  if (!config) {
    console.warn('[Analytics] Not initialized');
    return;
  }

  const event: AnalyticsEvent = {
    id: generateEventId(),
    type: 'plan_created',
    planType,
    metadata,
    timestamp: Date.now(),
    sessionId: config.sessionId,
    appVersion: config.appVersion,
  };

  await enqueueEvent(event);
};

/**
 * Track trip planning (e.g., AT trip planner, camping trip planner)
 * @param tripType - Type of trip (e.g., 'at_backpacking', 'camp_weekend')
 * @param season - Season or timeframe
 * @param itemCount - Number of items in generated list
 */
export const trackTripPlanned = async (
  tripType: string,
  season: string,
  itemCount: number
): Promise<void> => {
  if (!config) {
    console.warn('[Analytics] Not initialized');
    return;
  }

  const event: AnalyticsEvent = {
    id: generateEventId(),
    type: 'trip_planned',
    tripType,
    season,
    itemCount,
    timestamp: Date.now(),
    sessionId: config.sessionId,
    appVersion: config.appVersion,
  };

  await enqueueEvent(event);
};

/**
 * Track non-fatal errors
 * @param errorMessage - Error message
 * @param context - Error context (feature, screen, etc.)
 */
export const trackError = async (errorMessage: string, context: string): Promise<void> => {
  if (!config) {
    console.warn('[Analytics] Not initialized');
    return;
  }

  const event: AnalyticsEvent = {
    id: generateEventId(),
    type: 'error',
    errorMessage,
    errorContext: context,
    timestamp: Date.now(),
    sessionId: config.sessionId,
    appVersion: config.appVersion,
  };

  await enqueueEvent(event);
};

/**
 * Enqueue an event locally
 */
const enqueueEvent = async (event: AnalyticsEvent): Promise<void> => {
  try {
    const queueJson = await AsyncStorage.getItem(QUEUE_STORAGE_KEY);
    const queue: AnalyticsEvent[] = queueJson ? JSON.parse(queueJson) : [];

    // Enforce max queue size
    if (queue.length >= (config?.maxQueueSize ?? DEFAULT_MAX_QUEUE_SIZE)) {
      queue.shift(); // Drop oldest event
    }

    queue.push(event);
    await AsyncStorage.setItem(QUEUE_STORAGE_KEY, JSON.stringify(queue));
  } catch (error) {
    console.warn('[Analytics] Failed to enqueue event:', error);
  }
};

/**
 * Flush all queued events to backend
 */
export const flushEvents = async (): Promise<void> => {
  if (!config) {
    return;
  }

  try {
    const queueJson = await AsyncStorage.getItem(QUEUE_STORAGE_KEY);
    const queue: AnalyticsEvent[] = queueJson ? JSON.parse(queueJson) : [];

    if (queue.length === 0) {
      return; // Nothing to send
    }

    // Send to backend
    const response = await fetch(`${Config.API_BASE_URL}/api/v1/analytics/events`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        events: queue,
        device_id: config.sessionId,
        app_version: config.appVersion,
        platform: Platform.OS,
      }),
    });

    if (!response.ok) {
      throw new Error(`Analytics flush failed: ${response.status}`);
    }

    // Clear queue on success
    await AsyncStorage.removeItem(QUEUE_STORAGE_KEY);
    console.log(`[Analytics] Flushed ${queue.length} events`);
  } catch (error) {
    console.warn('[Analytics] Flush error (will retry):', error);
    // Don't throw — let auto-flush retry later
  }
};

/**
 * Get current event queue (for debugging)
 */
export const getEventQueue = async (): Promise<AnalyticsEvent[]> => {
  try {
    const queueJson = await AsyncStorage.getItem(QUEUE_STORAGE_KEY);
    return queueJson ? JSON.parse(queueJson) : [];
  } catch (error) {
    console.warn('[Analytics] Failed to get queue:', error);
    return [];
  }
};

/**
 * Clear event queue (for testing)
 */
export const clearEventQueue = async (): Promise<void> => {
  try {
    await AsyncStorage.removeItem(QUEUE_STORAGE_KEY);
  } catch (error) {
    console.warn('[Analytics] Failed to clear queue:', error);
  }
};

/**
 * Shutdown analytics service (cleanup)
 */
export const shutdownAnalytics = (): void => {
  if (flushTimer) {
    clearInterval(flushTimer);
    flushTimer = null;
  }
  config = null;
};

/**
 * Get analytics status (for debugging)
 */
export const getAnalyticsStatus = async (): Promise<{
  initialized: boolean;
  queueSize: number;
  sessionId?: string;
}> => {
  const queue = await getEventQueue();
  return {
    initialized: !!config,
    queueSize: queue.length,
    sessionId: config?.sessionId,
  };
};
