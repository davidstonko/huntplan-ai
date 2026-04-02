/**
 * @file regulationDataService.ts
 * @description Fetches hunting season and bag limit data from the backend API.
 * Replaces hardcoded data in marylandHuntingData.ts with dynamic, updatable data.
 * Falls back to bundled data when offline or API unavailable.
 *
 * Cache strategy:
 * 1. In-memory cache (instant, per session)
 * 2. AsyncStorage cache with 24-hour TTL
 * 3. Stale cache fallback on network error
 * 4. Bundled marylandHuntingData.ts as final fallback
 *
 * @module Services
 * @version 1.0.0
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import Config from '../config';
import {
  MD_SEASONS,
  MD_BAG_LIMITS,
  HuntingSeason,
  BagLimitRule,
} from '../data/marylandHuntingData';

const SEASONS_CACHE_KEY = '@regulation_seasons';
const BAG_LIMITS_CACHE_KEY = '@regulation_bag_limits';
const SEASONS_TS_KEY = '@regulation_seasons_ts';
const BAG_LIMITS_TS_KEY = '@regulation_bag_limits_ts';
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

// In-memory caches
let seasonsCache: HuntingSeason[] | null = null;
let bagLimitsCache: BagLimitRule[] | null = null;

/**
 * Generic fetch-with-cache helper
 */
async function fetchWithCache<T>(
  url: string,
  cacheKey: string,
  tsKey: string,
  fallbackData: T,
): Promise<T> {
  // 1. Check AsyncStorage cache freshness
  try {
    const tsStr = await AsyncStorage.getItem(tsKey);
    if (tsStr) {
      const age = Date.now() - parseInt(tsStr, 10);
      if (age < CACHE_TTL_MS) {
        const cached = await AsyncStorage.getItem(cacheKey);
        if (cached) {
          if (__DEV__) console.log(`[RegData] Cache hit for ${cacheKey}`);
          return JSON.parse(cached) as T;
        }
      }
    }
  } catch (err) {
    if (__DEV__) console.warn('[RegData] Cache read error:', err);
  }

  // 2. Fetch from API
  try {
    const response = await axios.get<T>(url, { timeout: 15000 });
    if (response.data) {
      // Persist to cache
      AsyncStorage.setItem(cacheKey, JSON.stringify(response.data)).catch(() => {});
      AsyncStorage.setItem(tsKey, Date.now().toString()).catch(() => {});
      if (__DEV__) console.log(`[RegData] Fetched fresh data for ${cacheKey}`);
      return response.data;
    }
  } catch (err) {
    if (__DEV__) console.warn(`[RegData] API fetch failed for ${cacheKey}:`, err);
  }

  // 3. Stale cache fallback
  try {
    const stale = await AsyncStorage.getItem(cacheKey);
    if (stale) {
      if (__DEV__) console.log(`[RegData] Using stale cache for ${cacheKey}`);
      return JSON.parse(stale) as T;
    }
  } catch {
    // ignore
  }

  // 4. Bundled data fallback
  if (__DEV__) console.log(`[RegData] Using bundled fallback for ${cacheKey}`);
  return fallbackData;
}

/**
 * Get hunting seasons — tries API, falls back to cache, then bundled data.
 */
export async function getSeasons(): Promise<HuntingSeason[]> {
  if (seasonsCache) return seasonsCache;

  const data = await fetchWithCache<HuntingSeason[]>(
    `${Config.API_BASE_URL}/api/v1/regulations/seasons`,
    SEASONS_CACHE_KEY,
    SEASONS_TS_KEY,
    MD_SEASONS,
  );

  seasonsCache = data;
  return data;
}

/**
 * Get bag limits — tries API, falls back to cache, then bundled data.
 */
export async function getBagLimits(): Promise<BagLimitRule[]> {
  if (bagLimitsCache) return bagLimitsCache;

  const data = await fetchWithCache<BagLimitRule[]>(
    `${Config.API_BASE_URL}/api/v1/regulations/bag-limits`,
    BAG_LIMITS_CACHE_KEY,
    BAG_LIMITS_TS_KEY,
    MD_BAG_LIMITS,
  );

  bagLimitsCache = data;
  return data;
}

/**
 * Clear regulation caches (for settings or manual refresh).
 */
export async function clearRegulationCache(): Promise<void> {
  seasonsCache = null;
  bagLimitsCache = null;
  await AsyncStorage.multiRemove([
    SEASONS_CACHE_KEY,
    BAG_LIMITS_CACHE_KEY,
    SEASONS_TS_KEY,
    BAG_LIMITS_TS_KEY,
  ]);
  if (__DEV__) console.log('[RegData] Cache cleared');
}

/**
 * Preload regulation data in background (call on app startup).
 */
export function preloadRegulationData(): void {
  getSeasons().catch(() => {});
  getBagLimits().catch(() => {});

}
