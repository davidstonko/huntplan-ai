/**
 * @file gisDataService.ts
 * @description Lazy-loads GIS boundary data from the backend API with local caching.
 * Replaces the 43MB bundled mdGISData.json with on-demand fetch + 7-day cache.
 *
 * Cache strategy:
 * 1. Check AsyncStorage for cached boundaries (7-day TTL)
 * 2. Fetch from backend /api/v1/lands/gis/boundaries
 * 3. Fallback to stale cache on network error
 * 4. Final fallback to bundled data (for first-launch offline)
 *
 * @module Services
 * @version 1.0.0
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import Config from '../config';

const GIS_CACHE_KEY = '@gis_boundaries';
const GIS_CACHE_TIMESTAMP_KEY = '@gis_boundaries_ts';
const CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

/**
 * GeoJSON FeatureCollection type for land boundaries.
 * @interface GISFeatureCollection
 */
export interface GISFeatureCollection {
  type: 'FeatureCollection';
  features: Array<{
    type: 'Feature';
    properties: Record<string, any>;
    geometry: {
      type: string;
      coordinates: any;
    };
  }>;
}

/** In-memory cache to avoid repeated parsing */
let memoryCache: GISFeatureCollection | null = null;

/**
 * Get GIS boundary data with layered caching.
 * Strategy:
 * 1. Return in-memory cache if available (fastest)
 * 2. Check AsyncStorage cache with 7-day TTL
 * 3. Fetch from backend API with 60s timeout
 * 4. Fall back to stale AsyncStorage cache on network error
 * 5. Final fallback: bundled mdGISData.json (for offline first launch)
 *
 * @async
 * @returns {Promise<GISFeatureCollection>} GeoJSON FeatureCollection with land boundaries
 *
 * @example
 * const gis = await getGISData();
 * console.log(`Loaded ${gis.features.length} land boundaries`);
 */
export async function getGISData(): Promise<GISFeatureCollection> {
  // 1. Return in-memory cache if available
  if (memoryCache) {
    if (__DEV__) console.log('[GIS] Returned from memory cache');
    return memoryCache;
  }

  // 2. Check AsyncStorage cache
  try {
    const tsStr = await AsyncStorage.getItem(GIS_CACHE_TIMESTAMP_KEY);
    if (tsStr) {
      const cacheAge = Date.now() - parseInt(tsStr, 10);
      if (cacheAge < CACHE_TTL_MS) {
        const cached = await AsyncStorage.getItem(GIS_CACHE_KEY);
        if (cached) {
          memoryCache = JSON.parse(cached);
          if (__DEV__) console.log(`[GIS] Loaded from AsyncStorage cache (age: ${(cacheAge / 1000 / 60).toFixed(1)}min)`);
          return memoryCache!;
        }
      }
    }
  } catch (err) {
    if (__DEV__) console.warn('[GIS] AsyncStorage cache read failed:', err);
  }

  // 3. Fetch from backend API
  try {
    if (__DEV__) console.log('[GIS] Fetching from backend API...');
    const response = await axios.get<GISFeatureCollection>(
      `${Config.API_BASE_URL}/api/v1/lands/gis/boundaries`,
      { timeout: 60000 } // 60s timeout for large payload
    );

    if (response.data && response.data.features) {
      memoryCache = response.data;

      // Cache in AsyncStorage (fire and forget)
      AsyncStorage.setItem(GIS_CACHE_KEY, JSON.stringify(response.data))
        .then(() => {
          AsyncStorage.setItem(GIS_CACHE_TIMESTAMP_KEY, Date.now().toString()).catch(() => {});
        })
        .catch(() => {});

      if (__DEV__) console.log(`[GIS] Fetched ${response.data.features.length} features from API`);
      return memoryCache;
    }
  } catch (err) {
    if (__DEV__) console.warn('[GIS] API fetch failed, trying stale cache:', err);
  }

  // 4. Fallback to stale AsyncStorage cache
  try {
    const stale = await AsyncStorage.getItem(GIS_CACHE_KEY);
    if (stale) {
      memoryCache = JSON.parse(stale);
      if (__DEV__) console.log('[GIS] Using stale AsyncStorage cache as fallback');
      return memoryCache!;
    }
  } catch (err) {
    if (__DEV__) console.warn('[GIS] Stale cache parse failed:', err);
  }

  // 5. Final fallback: bundled data (first launch offline)
  try {
    const bundled = require('../data/mdGISData.json') as GISFeatureCollection;
    memoryCache = bundled;
    if (__DEV__) console.log('[GIS] Using bundled fallback data');
    return memoryCache;
  } catch (err) {
    if (__DEV__) console.warn('[GIS] Bundled fallback failed:', err);
    // Return empty collection if absolutely nothing works
    return { type: 'FeatureCollection', features: [] };
  }
}

/**
 * Clear the GIS cache (for settings screen or manual refresh).
 * Clears both in-memory cache and AsyncStorage persistent cache.
 *
 * @async
 * @returns {Promise<void>}
 *
 * @example
 * // User taps "Refresh GIS Data" in settings
 * await clearGISCache();
 * const fresh = await getGISData(); // Fetches from API
 */
export async function clearGISCache(): Promise<void> {
  memoryCache = null;
  try {
    await AsyncStorage.multiRemove([GIS_CACHE_KEY, GIS_CACHE_TIMESTAMP_KEY]);
    if (__DEV__) console.log('[GIS] Cache cleared');
  } catch (err) {
    if (__DEV__) console.warn('[GIS] Failed to clear AsyncStorage cache:', err);
  }
}

/**
 * Preload GIS data in background (call on app startup).
 * Initiates fetch without blocking, allowing app to render while data loads.
 *
 * @returns {void}
 *
 * @example
 * // In App.tsx or AppNavigator on launch
 * preloadGISData();
 */
export function preloadGISData(): void {
  getGISData().catch(() => {
    // Silently fail — app can still render with bundled data
  });
}
