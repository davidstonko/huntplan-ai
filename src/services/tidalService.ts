/**
 * @file services/tidalService.ts
 * @description NOAA Tides & Currents API integration for Maryland fishing locations.
 *
 * Provides tide predictions (high/low times) and station lookup for fishing planning.
 * Uses NOAA's free API (no API key required) with 24-hour AsyncStorage caching.
 *
 * Cache strategy:
 * 1. Check AsyncStorage for cached predictions (24-hour TTL per station)
 * 2. Fetch from NOAA API if cache expired or miss
 * 3. Fallback to last cached predictions on network error
 * 4. Return null if completely unavailable
 *
 * Maryland has 10 major tidal stations covering Chesapeake Bay and Atlantic coast.
 * @module Services
 * @version 1.0.0
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';

// ── Types ──────────────────────────────────────────────────────

/**
 * Single tide event (high or low tide)
 * @interface TidePrediction
 * @property {string} time - ISO 8601 timestamp of tide (e.g., "2026-04-04T06:15:00")
 * @property {string} type - "H" for high tide, "L" for low tide
 * @property {number} height - Water height in feet (MLLW datum)
 * @property {number} timestamp - Unix timestamp (ms) for easy comparison
 */
export interface TidePrediction {
  time: string;
  type: 'H' | 'L';
  height: number;
  timestamp: number;
}

/**
 * Tide prediction response for a day
 * @interface TidePredictionResult
 * @property {string} stationId - NOAA station ID (e.g., "8574680")
 * @property {string} stationName - Human-readable station name (e.g., "Baltimore")
 * @property {TidePrediction[]} predictions - Array of tide events for the day
 * @property {string} fetchedAt - ISO timestamp when data was retrieved
 * @property {boolean} fromCache - True if returned from AsyncStorage cache
 */
export interface TidePredictionResult {
  stationId: string;
  stationName: string;
  predictions: TidePrediction[];
  fetchedAt: string;
  fromCache: boolean;
}

/**
 * Next tide event information
 * @interface NextTide
 * @property {string} stationId - Station ID
 * @property {string} stationName - Station name
 * @property {TidePrediction} tide - The next tide event
 * @property {number} hoursUntil - Hours until this tide occurs
 */
export interface NextTide extends TidePredictionResult {
  tide: TidePrediction;
  hoursUntil: number;
}

/**
 * Tide station metadata with geographic location
 * @interface TideStation
 * @property {string} id - NOAA station ID
 * @property {string} name - Station name
 * @property {number} lat - Latitude (decimal degrees)
 * @property {number} lng - Longitude (decimal degrees)
 */
export interface TideStation {
  id: string;
  name: string;
  lat: number;
  lng: number;
}

/**
 * Cached tide data with TTL
 * @interface CachedTideData
 * @property {TidePredictionResult} data - The prediction data
 * @property {number} timestamp - Unix timestamp (ms) when cached
 * @property {boolean} isExpired - True if cache age exceeds TTL
 */
interface CachedTideData {
  data: TidePredictionResult;
  timestamp: number;
  isExpired: boolean;
}

// ── Constants ──────────────────────────────────────────────────

const NOAA_API = 'https://api.tidesandcurrents.noaa.gov/api/prod/datagetter';
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

/**
 * Maryland tidal stations covering Chesapeake Bay and Atlantic coast
 * Sorted north to south for reference
 */
export const MD_TIDE_STATIONS: TideStation[] = [
  { id: '8574680', name: 'Baltimore', lat: 39.2667, lng: -76.5783 },
  { id: '8573364', name: 'Tolchester Beach', lat: 39.2133, lng: -76.2450 },
  { id: '8575437', name: 'Havre de Grace', lat: 39.5367, lng: -76.0883 },
  { id: '8573927', name: 'Chesapeake City', lat: 39.5267, lng: -75.8100 },
  { id: '8575512', name: 'Annapolis', lat: 38.9833, lng: -76.4817 },
  { id: '8571892', name: 'Cambridge', lat: 38.5733, lng: -76.0683 },
  { id: '8577330', name: 'Solomons Island', lat: 38.3167, lng: -76.4517 },
  { id: '8577188', name: 'Point Lookout', lat: 38.0400, lng: -76.3233 },
  { id: '8571421', name: 'Crisfield', lat: 37.9717, lng: -75.8550 },
  { id: '8570283', name: 'Ocean City', lat: 38.3283, lng: -75.0917 },
];

// ── Cache Management ───────────────────────────────────────────

/**
 * Get AsyncStorage cache key for a station
 * @private
 * @param {string} stationId - NOAA station ID
 * @param {Date} date - Date for prediction
 * @returns {string} Cache key
 */
function getCacheKey(stationId: string, date: Date): string {
  const dateStr = date.toISOString().split('T')[0]; // YYYY-MM-DD
  return `@tide_cache_${stationId}_${dateStr}`;
}

/**
 * Get timestamp cache key for TTL tracking
 * @private
 * @param {string} stationId - NOAA station ID
 * @param {Date} date - Date for prediction
 * @returns {string} Timestamp key
 */
function getCacheTimestampKey(stationId: string, date: Date): string {
  const dateStr = date.toISOString().split('T')[0];
  return `@tide_cache_ts_${stationId}_${dateStr}`;
}

/**
 * Get cached tide data if valid (not expired)
 * @private
 * @async
 * @param {string} stationId - NOAA station ID
 * @param {Date} date - Date for prediction
 * @returns {Promise<CachedTideData | null>} Cached data or null if expired/missing
 */
async function getCachedData(stationId: string, date: Date): Promise<CachedTideData | null> {
  try {
    const tsStr = await AsyncStorage.getItem(getCacheTimestampKey(stationId, date));
    if (!tsStr) return null;

    const cacheAge = Date.now() - parseInt(tsStr, 10);
    const isExpired = cacheAge > CACHE_TTL_MS;

    const dataStr = await AsyncStorage.getItem(getCacheKey(stationId, date));
    if (!dataStr) return null;

    const data = JSON.parse(dataStr) as TidePredictionResult;
    return { data, timestamp: parseInt(tsStr, 10), isExpired };
  } catch (error) {
    if (__DEV__) console.warn('[Tidal] Cache read failed:', error);
    return null;
  }
}

/**
 * Store tide data in AsyncStorage cache
 * @private
 * @async
 * @param {string} stationId - NOAA station ID
 * @param {Date} date - Date for prediction
 * @param {TidePredictionResult} data - Prediction data to cache
 * @returns {Promise<void>}
 */
async function setCachedData(stationId: string, date: Date, data: TidePredictionResult): Promise<void> {
  try {
    const key = getCacheKey(stationId, date);
    const tsKey = getCacheTimestampKey(stationId, date);
    await AsyncStorage.setItem(key, JSON.stringify(data));
    await AsyncStorage.setItem(tsKey, Date.now().toString());
  } catch (error) {
    if (__DEV__) console.warn('[Tidal] Cache write failed:', error);
  }
}

// ── NOAA API Calls ─────────────────────────────────────────────

/**
 * Fetch tide predictions from NOAA API for a specific date
 * @private
 * @async
 * @param {string} stationId - NOAA station ID
 * @param {string} stationName - Human-readable station name
 * @param {Date} date - Date for prediction
 * @returns {Promise<TidePredictionResult | null>} Predictions or null on error
 */
async function fetchTidesFromNOAA(
  stationId: string,
  stationName: string,
  date: Date
): Promise<TidePredictionResult | null> {
  try {
    const dateStr = date.toISOString().split('T')[0]; // YYYY-MM-DD format
    const endDate = new Date(date);
    endDate.setDate(endDate.getDate() + 1);
    const endDateStr = endDate.toISOString().split('T')[0];

    const response = await axios.get(NOAA_API, {
      params: {
        begin_date: dateStr.replace(/-/g, ''),
        end_date: endDateStr.replace(/-/g, ''),
        station: stationId,
        product: 'predictions',
        datum: 'MLLW',
        time_zone: 'lst_ldt',
        units: 'english',
        interval: 'hilo',
        format: 'json',
      },
      timeout: 10000,
    });

    if (!response.data.predictions || response.data.predictions.length === 0) {
      return null;
    }

    // Parse NOAA response
    const predictions: TidePrediction[] = response.data.predictions.map((p: any) => ({
      time: p.t,
      type: p.type as 'H' | 'L',
      height: parseFloat(p.v),
      timestamp: new Date(p.t).getTime(),
    }));

    return {
      stationId,
      stationName,
      predictions,
      fetchedAt: new Date().toISOString(),
      fromCache: false,
    };
  } catch (error) {
    if (__DEV__) console.warn(`[Tidal] API fetch failed for ${stationId}:`, error);
    return null;
  }
}

// ── Public API ─────────────────────────────────────────────────

/**
 * Get tide predictions for a specific station and date
 * Uses 24-hour AsyncStorage cache; falls back to cached data on network error.
 *
 * @async
 * @param {string} stationId - NOAA station ID (e.g., "8574680")
 * @param {Date} [date] - Date for prediction (defaults to today)
 * @returns {Promise<TidePredictionResult | null>} Tide predictions or null if unavailable
 *
 * @example
 * const tides = await getTidePredictions('8574680', new Date());
 * console.log(`Next high tide at ${tides.predictions[0].time}`);
 */
export async function getTidePredictions(stationId: string, date?: Date): Promise<TidePredictionResult | null> {
  const targetDate = date || new Date();

  // Find station name
  const station = MD_TIDE_STATIONS.find(s => s.id === stationId);
  if (!station) {
    if (__DEV__) console.warn(`[Tidal] Station ${stationId} not found`);
    return null;
  }

  // Try cache first
  const cached = await getCachedData(stationId, targetDate);
  if (cached && !cached.isExpired) {
    return { ...cached.data, fromCache: true };
  }

  // Fetch from NOAA
  const fresh = await fetchTidesFromNOAA(stationId, station.name, targetDate);
  if (fresh) {
    await setCachedData(stationId, targetDate, fresh);
    return fresh;
  }

  // Return stale cache if available
  if (cached) {
    return { ...cached.data, fromCache: true };
  }

  return null;
}

/**
 * Get the next high or low tide for a station
 * Automatically handles date rollovers (e.g., if all today's tides are past).
 *
 * @async
 * @param {string} stationId - NOAA station ID
 * @returns {Promise<NextTide | null>} Next tide event or null if unavailable
 *
 * @example
 * const next = await getNextTide('8574680');
 * console.log(`Next tide in ${next.hoursUntil.toFixed(1)} hours: ${next.tide.type === 'H' ? 'High' : 'Low'}`);
 */
export async function getNextTide(stationId: string): Promise<NextTide | null> {
  const now = Date.now();
  let date = new Date();
  let attempts = 0;
  const maxAttempts = 3; // Check today + 2 future days

  while (attempts < maxAttempts) {
    const result = await getTidePredictions(stationId, date);
    if (!result || result.predictions.length === 0) {
      date.setDate(date.getDate() + 1);
      attempts++;
      continue;
    }

    // Find first tide in the future
    const nextTide = result.predictions.find(t => t.timestamp > now);
    if (nextTide) {
      const hoursUntil = (nextTide.timestamp - now) / (1000 * 60 * 60);
      return {
        ...result,
        tide: nextTide,
        hoursUntil,
      };
    }

    // No future tides today, try tomorrow
    date.setDate(date.getDate() + 1);
    attempts++;
  }

  return null;
}

/**
 * Find the nearest Maryland tide station to a geographic location
 * Uses simple Haversine distance calculation.
 *
 * @param {number} lat - Latitude (decimal degrees)
 * @param {number} lng - Longitude (decimal degrees)
 * @returns {TideStation} Closest station
 *
 * @example
 * const nearest = getNearestStation(38.5, -76.0);
 * console.log(`Nearest station: ${nearest.name}`);
 */
export function getNearestStation(lat: number, lng: number): TideStation {
  /**
   * Calculate haversine distance between two points
   * @param lat1 - Latitude 1
   * @param lng1 - Longitude 1
   * @param lat2 - Latitude 2
   * @param lng2 - Longitude 2
   * @returns Distance in kilometers
   */
  const haversine = (lat1: number, lng1: number, lat2: number, lng2: number): number => {
    const R = 6371; // Earth's radius in km
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLng = ((lng2 - lng1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  // Find station with minimum distance
  let nearest = MD_TIDE_STATIONS[0];
  let minDistance = haversine(lat, lng, nearest.lat, nearest.lng);

  for (const station of MD_TIDE_STATIONS) {
    const distance = haversine(lat, lng, station.lat, station.lng);
    if (distance < minDistance) {
      minDistance = distance;
      nearest = station;
    }
  }

  return nearest;
}

/**
 * Clear all tidal caches (for manual refresh or settings)
 * @async
 * @returns {Promise<void>}
 */
export async function clearTidalCache(): Promise<void> {
  try {
    const keys: string[] = [];
    for (const station of MD_TIDE_STATIONS) {
      for (let i = -1; i <= 2; i++) {
        const date = new Date();
        date.setDate(date.getDate() + i);
        keys.push(getCacheKey(station.id, date));
        keys.push(getCacheTimestampKey(station.id, date));
      }
    }
    await AsyncStorage.multiRemove(keys);
    if (__DEV__) console.log('[Tidal] Cache cleared');
  } catch (error) {
    if (__DEV__) console.warn('[Tidal] Failed to clear cache:', error);
  }
}
