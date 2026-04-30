/**
 * @file services/stockingService.ts
 * @description MD DNR Trout Stocking live data service for fishing planning.
 *
 * Queries the TroutStockingActivities ArcGIS FeatureServer for live stocking events
 * and integrates with bundled stocking data (fallback).
 *
 * Cache strategy:
 * 1. Check AsyncStorage for cached stocking data (24-hour TTL)
 * 2. Fetch from MD DNR ArcGIS FeatureServer if cache expired or miss
 * 3. Fallback to bundled stocking data on network error
 * 4. Return minimal data if completely unavailable
 *
 * Used by:
 * - FishMapScreen: Display stocking locations on map
 * - FishSpotsScreen: Show recent stocking at bookmarked spots
 * - AIScreen: Provide stocking info in fishing chat
 *
 * @module Services
 * @version 1.0.0
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';

// ── Types ──────────────────────────────────────────────────────

/**
 * Single stocking event
 * @interface StockingEvent
 * @property {number} id - Feature ID from ArcGIS
 * @property {number} objectId - ArcGIS ObjectID
 * @property {string} waterBody - Water body name (e.g., "Savage Mill Pond")
 * @property {string} locationName - Specific location name
 * @property {number} quantity - Number of fish stocked
 * @property {string} species - Fish species (typically "Rainbow Trout", "Brown Trout", "Brook Trout")
 * @property {string} stockingDate - ISO date string (YYYY-MM-DD)
 * @property {string} stockingTime - Time of stocking (e.g., "09:00:00")
 * @property {number} latitude - Latitude (decimal degrees)
 * @property {number} longitude - Longitude (decimal degrees)
 * @property {string} county - Maryland county (e.g., "Baltimore")
 * @property {string} waterType - Water type (e.g., "Pond", "Stream", "Lake")
 * @property {Record<string, any>} [additionalFields] - Other ArcGIS properties
 */
export interface StockingEvent {
  id: number;
  objectId: number;
  waterBody: string;
  locationName: string;
  quantity: number;
  species: string;
  stockingDate: string;
  stockingTime: string;
  latitude: number;
  longitude: number;
  county: string;
  waterType: string;
  [key: string]: any; // Allow additional ArcGIS fields
}

/**
 * Stocking data result with metadata
 * @interface StockingDataResult
 * @property {StockingEvent[]} events - Array of stocking events
 * @property {string} fetchedAt - ISO timestamp when data was retrieved
 * @property {boolean} fromCache - True if returned from AsyncStorage
 * @property {number} totalRecords - Total number of records in source
 */
export interface StockingDataResult {
  events: StockingEvent[];
  fetchedAt: string;
  fromCache: boolean;
  totalRecords: number;
}

/**
 * Recent stocking information for a location
 * @interface RecentStocking
 * @property {string} waterBody - Water body name
 * @property {string} locationName - Location name
 * @property {StockingEvent[]} recentEvents - Stocking events within the specified days
 * @property {number} daysSinceLatest - Days since the most recent stocking
 * @property {boolean} isRecentlyStocked - True if any stocking within the threshold
 */
export interface RecentStocking {
  waterBody: string;
  locationName: string;
  recentEvents: StockingEvent[];
  daysSinceLatest: number | null;
  isRecentlyStocked: boolean;
}

/**
 * Cached stocking data with TTL
 * @interface CachedStockingData
 * @property {StockingDataResult} data - The stocking data
 * @property {number} timestamp - Unix timestamp (ms) when cached
 * @property {boolean} isExpired - True if cache age exceeds TTL
 */
interface CachedStockingData {
  data: StockingDataResult;
  timestamp: number;
  isExpired: boolean;
}

// ── Constants ──────────────────────────────────────────────────

/**
 * MD DNR ArcGIS FeatureServer endpoint for TroutStockingActivities
 * Part of the Fisheries service
 */
const STOCKING_FEATURE_SERVER =
  'https://dnr.geodata.md.gov/dnrdata/rest/services/Fisheries/TroutStockingActivities/MapServer/0/query';

/**
 * Cache configuration
 */
const STOCKING_CACHE_KEY = '@stocking_data';
const STOCKING_CACHE_TIMESTAMP_KEY = '@stocking_data_ts';
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

/**
 * In-memory cache to avoid repeated parsing
 */
let memoryCache: StockingDataResult | null = null;

// ── Cache Management ───────────────────────────────────────────

/**
 * Get cached stocking data if valid (not expired)
 * @private
 * @async
 * @returns {Promise<CachedStockingData | null>} Cached data or null if expired/missing
 */
async function getCachedData(): Promise<CachedStockingData | null> {
  try {
    const tsStr = await AsyncStorage.getItem(STOCKING_CACHE_TIMESTAMP_KEY);
    if (!tsStr) return null;

    const cacheAge = Date.now() - parseInt(tsStr, 10);
    const isExpired = cacheAge > CACHE_TTL_MS;

    const dataStr = await AsyncStorage.getItem(STOCKING_CACHE_KEY);
    if (!dataStr) return null;

    const data = JSON.parse(dataStr) as StockingDataResult;
    return { data, timestamp: parseInt(tsStr, 10), isExpired };
  } catch (error) {
    if (__DEV__) console.warn('[Stocking] Cache read failed:', error);
    return null;
  }
}

/**
 * Store stocking data in AsyncStorage cache
 * @private
 * @async
 * @param {StockingDataResult} data - Data to cache
 * @returns {Promise<void>}
 */
async function setCachedData(data: StockingDataResult): Promise<void> {
  try {
    await AsyncStorage.setItem(STOCKING_CACHE_KEY, JSON.stringify(data));
    await AsyncStorage.setItem(STOCKING_CACHE_TIMESTAMP_KEY, Date.now().toString());
  } catch (error) {
    if (__DEV__) console.warn('[Stocking] Cache write failed:', error);
  }
}

// ── ArcGIS API Calls ───────────────────────────────────────────

/**
 * Fetch stocking data from MD DNR ArcGIS FeatureServer
 * Retrieves all TroutStockingActivities features with geometry and all fields
 * @private
 * @async
 * @returns {Promise<StockingDataResult | null>} Stocking data or null on error
 */
async function fetchStockingFromArcGIS(): Promise<StockingDataResult | null> {
  try {
    if (__DEV__) console.log('[Stocking] Fetching from ArcGIS FeatureServer...');

    const response = await axios.get(STOCKING_FEATURE_SERVER, {
      params: {
        where: '1=1', // Get all features
        outFields: '*', // Get all fields
        returnGeometry: 'true', // Include lat/lng
        f: 'json', // JSON response format
      },
      timeout: 30000, // 30s timeout
    });

    if (!response.data.features || response.data.features.length === 0) {
      if (__DEV__) console.log('[Stocking] No features returned from ArcGIS');
      return null;
    }

    // Parse ArcGIS response
    const events: StockingEvent[] = response.data.features.map((feature: any) => {
      const props = feature.attributes || {};
      const geometry = feature.geometry || {};

      return {
        id: props.OBJECTID || props.FID || 0,
        objectId: props.OBJECTID || 0,
        waterBody: props.WaterBody || props.WATER_BODY || 'Unknown',
        locationName: props.LocationName || props.Location || '',
        quantity: parseInt(props.Quantity || props.QUANTITY || '0', 10),
        species: props.Species || props.SPECIES || 'Trout',
        stockingDate: props.StockingDate || props.STOCKING_DATE || '',
        stockingTime: props.StockingTime || props.STOCKING_TIME || '',
        latitude: geometry.y || props.Latitude || props.LAT || 0,
        longitude: geometry.x || props.Longitude || props.LNG || 0,
        county: props.County || props.COUNTY || '',
        waterType: props.WaterType || props.WATER_TYPE || '',
        ...props, // Include all other fields
      };
    });

    const result: StockingDataResult = {
      events,
      fetchedAt: new Date().toISOString(),
      fromCache: false,
      totalRecords: response.data.features.length,
    };

    if (__DEV__) console.log(`[Stocking] Fetched ${events.length} stocking events from ArcGIS`);
    return result;
  } catch (error) {
    if (__DEV__) console.warn('[Stocking] ArcGIS API fetch failed:', error);
    return null;
  }
}

/**
 * Load bundled stocking data (fallback)
 * This would be generated by the v2 data pipeline and bundled with the app
 * @private
 * @async
 * @returns {Promise<StockingDataResult | null>} Bundled stocking data or null
 */
async function loadBundledStockingData(): Promise<StockingDataResult | null> {
  try {
    // Import bundled stocking data (from FISHING_BUILD_PLAN data pipeline)
    // For now, this is a placeholder — in production, replace with:
    // const bundled = require('../data/marylandFishingData.ts').MD_STOCKING_DATA;
    // or similar structure from the data pipeline
    if (__DEV__) console.log('[Stocking] Loading bundled stocking data...');

    // Placeholder: empty array (actual data loaded in Phase 4 data pipeline)
    return {
      events: [],
      fetchedAt: new Date().toISOString(),
      fromCache: false,
      totalRecords: 0,
    };
  } catch (error) {
    if (__DEV__) console.warn('[Stocking] Bundled data load failed:', error);
    return null;
  }
}

// ── Public API ─────────────────────────────────────────────────

/**
 * Get latest stocking data with layered caching
 * Strategy:
 * 1. Return in-memory cache if available (fastest)
 * 2. Check AsyncStorage cache with 24-hour TTL
 * 3. Fetch from ArcGIS FeatureServer with 30s timeout
 * 4. Fall back to stale AsyncStorage cache on network error
 * 5. Final fallback: bundled data (for offline)
 *
 * @async
 * @returns {Promise<StockingDataResult>} Stocking data with metadata
 *
 * @example
 * const data = await getLatestStockingData();
 * console.log(`${data.events.length} stocking locations loaded (from ${data.fromCache ? 'cache' : 'live'})`);
 */
export async function getLatestStockingData(): Promise<StockingDataResult> {
  // 1. Return in-memory cache if available
  if (memoryCache) {
    if (__DEV__) console.log('[Stocking] Returned from memory cache');
    return { ...memoryCache, fromCache: true };
  }

  // 2. Check AsyncStorage cache
  const cached = await getCachedData();
  if (cached && !cached.isExpired) {
    memoryCache = cached.data;
    if (__DEV__) {
      const ageMin = (cached.timestamp ? (Date.now() - cached.timestamp) / 1000 / 60 : 0).toFixed(1);
      console.log(`[Stocking] Loaded from AsyncStorage cache (age: ${ageMin}min)`);
    }
    return { ...cached.data, fromCache: true };
  }

  // 3. Fetch from ArcGIS FeatureServer
  const fresh = await fetchStockingFromArcGIS();
  if (fresh) {
    memoryCache = fresh;
    await setCachedData(fresh);
    return fresh;
  }

  // 4. Fallback to stale AsyncStorage cache
  if (cached) {
    memoryCache = cached.data;
    if (__DEV__) console.log('[Stocking] Using stale AsyncStorage cache as fallback');
    return { ...cached.data, fromCache: true };
  }

  // 5. Final fallback: bundled data
  const bundled = await loadBundledStockingData();
  if (bundled && bundled.events.length > 0) {
    memoryCache = bundled;
    if (__DEV__) console.log('[Stocking] Using bundled fallback data');
    return bundled;
  }

  // Return empty result if absolutely nothing works
  return {
    events: [],
    fetchedAt: new Date().toISOString(),
    fromCache: false,
    totalRecords: 0,
  };
}

/**
 * Get stocking events from the last N days
 * Filters cached/fetched stocking data by date range.
 *
 * @async
 * @param {number} [days=7] - Number of days to look back (default: 7)
 * @returns {Promise<StockingEvent[]>} Array of recent stocking events, sorted by date (newest first)
 *
 * @example
 * const recent = await getRecentStockings(14); // Last 2 weeks
 * console.log(`${recent.length} locations stocked in the last 14 days`);
 */
export async function getRecentStockings(days: number = 7): Promise<StockingEvent[]> {
  const data = await getLatestStockingData();
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - days);

  const recent = data.events.filter(event => {
    try {
      const eventDate = new Date(event.stockingDate);
      return eventDate >= cutoffDate;
    } catch {
      return false;
    }
  });

  // Sort by date, newest first
  recent.sort((a, b) => {
    const dateA = new Date(a.stockingDate).getTime();
    const dateB = new Date(b.stockingDate).getTime();
    return dateB - dateA;
  });

  return recent;
}

/**
 * Check if a specific location was recently stocked
 * Uses water body + location name for matching.
 *
 * @async
 * @param {string} locationId - Water body or location identifier (e.g., "Savage Mill Pond")
 * @param {number} [days=14] - Days threshold (default: 14)
 * @returns {Promise<RecentStocking>} Stocking info for the location
 *
 * @example
 * const stock = await isRecentlyStocked('Savage Mill Pond', 7);
 * if (stock.isRecentlyStocked) {
 *   console.log(`${stock.waterBody} stocked ${stock.daysSinceLatest} days ago`);
 * }
 */
export async function isRecentlyStocked(locationId: string, days: number = 14): Promise<RecentStocking> {
  const data = await getLatestStockingData();
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - days);

  // Match events by water body or location name
  const matchingEvents = data.events.filter(event => {
    const matches =
      event.waterBody.toLowerCase().includes(locationId.toLowerCase()) ||
      event.locationName.toLowerCase().includes(locationId.toLowerCase());
    return matches;
  });

  // Filter to recent events only
  const recentEvents = matchingEvents.filter(event => {
    try {
      const eventDate = new Date(event.stockingDate);
      return eventDate >= cutoffDate;
    } catch {
      return false;
    }
  });

  // Calculate days since latest stocking
  let daysSinceLatest: number | null = null;
  if (recentEvents.length > 0) {
    // Find the most recent event
    const latest = recentEvents.reduce((prev, current) => {
      const prevDate = new Date(prev.stockingDate).getTime();
      const currDate = new Date(current.stockingDate).getTime();
      return currDate > prevDate ? current : prev;
    });
    daysSinceLatest = Math.floor((Date.now() - new Date(latest.stockingDate).getTime()) / (1000 * 60 * 60 * 24));
  }

  return {
    waterBody: matchingEvents[0]?.waterBody || locationId,
    locationName: matchingEvents[0]?.locationName || locationId,
    recentEvents,
    daysSinceLatest,
    isRecentlyStocked: recentEvents.length > 0,
  };
}

/**
 * Clear all stocking caches (for manual refresh or settings)
 * Clears both in-memory cache and AsyncStorage persistent cache.
 *
 * @async
 * @returns {Promise<void>}
 *
 * @example
 * // User taps "Refresh Stocking Data" in settings
 * await clearStockingCache();
 * const fresh = await getLatestStockingData(); // Fetches from API
 */
export async function clearStockingCache(): Promise<void> {
  memoryCache = null;
  try {
    await AsyncStorage.multiRemove([STOCKING_CACHE_KEY, STOCKING_CACHE_TIMESTAMP_KEY]);
    if (__DEV__) console.log('[Stocking] Cache cleared');
  } catch (error) {
    if (__DEV__) console.warn('[Stocking] Failed to clear AsyncStorage cache:', error);
  }
}

/**
 * Preload stocking data in background (call on app startup)
 * Initiates fetch without blocking, allowing app to render while data loads.
 *
 * @returns {void}
 *
 * @example
 * // In App.tsx on launch
 * preloadStockingData();
 */
export function preloadStockingData(): void {
  getLatestStockingData().catch(() => {
    // Silently fail — app can still render with bundled/cached data
  });
}
