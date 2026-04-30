/**
 * @file tideStationService.ts
 * @description Service for fetching NOAA CO-OPS tide predictions for individual stations.
 *
 * Provides caching (5-minute in-memory TTL) and graceful fallback when the backend
 * is unavailable.
 */

import { API_BASE_URL } from './api';

export interface TidePrediction {
  time: string;
  height_ft: number;
}

export interface TideStationData {
  status: 'ok' | 'unavailable';
  station_id: string;
  high: TidePrediction[];
  low: TidePrediction[];
  now: {
    state: 'rising' | 'falling' | 'unknown';
    error?: string;
    as_of?: string;
  };
}

// In-memory cache: stationId → { data, expiresAt }
interface CacheEntry {
  data: TideStationData;
  expiresAt: number;
}

const cache = new Map<string, CacheEntry>();
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

/**
 * Get tide predictions for a single NOAA station.
 *
 * @param stationId - NOAA station ID (e.g. "8575512")
 * @returns TideStationData with high/low predictions or unavailable status
 */
export async function getTidesForStation(
  stationId: string
): Promise<TideStationData> {
  // Check cache first
  const cached = cache.get(stationId);
  if (cached && Date.now() < cached.expiresAt) {
    return cached.data;
  }

  try {
    const response = await fetch(
      `${API_BASE_URL}/api/v1/integrations/fish/tide-station/${stationId}`
    );

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const data = (await response.json()) as TideStationData;

    // Cache the result
    cache.set(stationId, {
      data,
      expiresAt: Date.now() + CACHE_TTL_MS,
    });

    return data;
  } catch (error) {
    // Fallback when service is unavailable
    const unavailable: TideStationData = {
      status: 'unavailable',
      station_id: stationId,
      high: [],
      low: [],
      now: {
        state: 'unknown',
        error: error instanceof Error ? error.message : 'Unknown error',
      },
    };

    // Cache the fallback for a shorter time (1 minute) to retry sooner
    cache.set(stationId, {
      data: unavailable,
      expiresAt: Date.now() + 60 * 1000,
    });

    return unavailable;
  }
}

/**
 * Clear the tide station cache (useful for testing or forced refresh).
 */
export function clearTideCache(): void {
  cache.clear();
}

/**
 * Get cache size (for testing/debugging).
 */
export function getTideCacheSize(): number {
  return cache.size;
}
