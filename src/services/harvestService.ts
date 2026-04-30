/**
 * @file harvestService.ts
 * @description Harvest logging service for MDHuntFishOutdoors.
 * Provides typed wrappers around harvest API endpoints.
 * Includes error handling and offline-first fallback to AsyncStorage.
 *
 * Features:
 * - Log new harvest entries
 * - Get user's harvests
 * - Get harvest statistics by season/species
 *
 * @module Services
 * @version 1.0.0
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import Config from '../config';

// ── Types ──────────────────────────────────────────────────────

export interface HarvestEntry {
  id: string;
  species: string;
  date: string;
  county: string;
  weight?: number;
  antlerPoints?: number;
  notes?: string;
  photoUrl?: string;
}

export interface HarvestStats {
  totalHarvests: number;
  bySpecies: Record<string, number>;
  bySeason?: Record<string, number>;
}

// ── Helper: Get Auth Token ──────────────────────────────────

async function getAuthToken(): Promise<string | null> {
  try {
    return await AsyncStorage.getItem('auth_token');
  } catch (error) {
    if (__DEV__) console.warn('[HarvestService] Failed to get auth token:', error);
    return null;
  }
}

/**
 * Build authorization headers with Bearer token
 * Falls back to no auth if token unavailable
 */
async function getHeaders(): Promise<Record<string, string>> {
  const token = await getAuthToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }
  return headers;
}

// ── Main Service ───────────────────────────────────────────

export const harvestService = {
  /**
   * Log a new harvest entry
   */
  async logHarvest(data: Omit<HarvestEntry, 'id'>): Promise<HarvestEntry | null> {
    try {
      const headers = await getHeaders();
      const response = await fetch(
        `${Config.API_BASE_URL}/api/v1/harvest/log`,
        {
          method: 'POST',
          headers,
          body: JSON.stringify(data),
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const responseData = await response.json();
      const newEntry = responseData.harvest || null;

      if (__DEV__) console.log('[HarvestService] Harvest logged successfully');

      // Invalidate cache on successful log
      try {
        await AsyncStorage.removeItem('harvest_logs_cache');
        await AsyncStorage.removeItem('harvest_stats_cache');
      } catch (cacheError) {
        if (__DEV__) console.warn('[HarvestService] Failed to invalidate cache:', cacheError);
      }

      return newEntry;
    } catch (error) {
      if (__DEV__) console.warn('[HarvestService] Failed to log harvest:', error);
      return null;
    }
  },

  /**
   * Get all harvests for the current user
   * Tries API first, falls back to AsyncStorage cache on failure
   */
  async getMyHarvests(): Promise<HarvestEntry[]> {
    try {
      const headers = await getHeaders();
      const response = await fetch(
        `${Config.API_BASE_URL}/api/v1/harvest/logs`,
        { headers }
      );

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();
      const harvests = data.harvests || [];

      // Cache success to AsyncStorage
      try {
        await AsyncStorage.setItem(
          'harvest_logs_cache',
          JSON.stringify({ data: harvests, timestamp: Date.now() })
        );
      } catch (cacheError) {
        if (__DEV__) console.warn('[HarvestService] Failed to cache harvests:', cacheError);
      }

      return harvests;
    } catch (error) {
      if (__DEV__) console.warn('[HarvestService] Failed to fetch harvests:', error);

      // Fall back to cached data
      try {
        const cached = await AsyncStorage.getItem('harvest_logs_cache');
        if (cached) {
          const { data } = JSON.parse(cached);
          if (__DEV__) console.log('[HarvestService] Using cached harvests');
          return data;
        }
      } catch (cacheError) {
        if (__DEV__) console.warn('[HarvestService] Failed to read cached harvests:', cacheError);
      }

      return [];
    }
  },

  /**
   * Get harvest statistics
   * Optional season filter (defaults to current season)
   */
  async getStats(season?: string): Promise<HarvestStats> {
    try {
      const headers = await getHeaders();
      const params = new URLSearchParams();
      if (season) {
        params.append('season', season);
      }

      const response = await fetch(
        `${Config.API_BASE_URL}/api/v1/harvest/stats?${params}`,
        { headers }
      );

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();
      const stats: HarvestStats = {
        totalHarvests: data.total_harvests || 0,
        bySpecies: data.by_species || {},
        bySeason: data.by_season || {},
      };

      // Cache success
      try {
        const cacheKey = season ? `harvest_stats_${season}` : 'harvest_stats_current';
        await AsyncStorage.setItem(
          cacheKey,
          JSON.stringify({ data: stats, timestamp: Date.now() })
        );
      } catch (cacheError) {
        if (__DEV__) console.warn('[HarvestService] Failed to cache stats:', cacheError);
      }

      return stats;
    } catch (error) {
      if (__DEV__) console.warn('[HarvestService] Failed to fetch stats:', error);

      // Fall back to cached data
      try {
        const cacheKey = season ? `harvest_stats_${season}` : 'harvest_stats_current';
        const cached = await AsyncStorage.getItem(cacheKey);
        if (cached) {
          const { data } = JSON.parse(cached);
          if (__DEV__) console.log('[HarvestService] Using cached stats');
          return data;
        }
      } catch (cacheError) {
        if (__DEV__) console.warn('[HarvestService] Failed to read cached stats:', cacheError);
      }

      return { totalHarvests: 0, bySpecies: {}, bySeason: {} };
    }
  },
};

export default harvestService;
