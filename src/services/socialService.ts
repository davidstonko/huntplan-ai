/**
 * @file socialService.ts
 * @description Social sighting reports service for MDHuntFishOutdoors.
 * Provides typed wrappers around social API endpoints.
 * Includes error handling and offline-first fallback to AsyncStorage.
 *
 * Features:
 * - Get sighting reports (with optional location filtering)
 * - Create new sighting reports
 * - Like/upvote reports
 *
 * @module Services
 * @version 1.0.0
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import Config from '../config';

// ── Types ──────────────────────────────────────────────────────

export interface SightingReport {
  id: string;
  authorName: string;
  species: string;
  description: string;
  lat: number;
  lng: number;
  createdAt: string;
  likes: number;
  photoUrl?: string;
}

export interface NewReport {
  species: string;
  description: string;
  lat: number;
  lng: number;
  photoUrl?: string;
}

// ── Helper: Get Auth Token ──────────────────────────────────

async function getAuthToken(): Promise<string | null> {
  try {
    return await AsyncStorage.getItem('auth_token');
  } catch (error) {
    if (__DEV__) console.warn('[SocialService] Failed to get auth token:', error);
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

export const socialService = {
  /**
   * Get sighting reports with optional geographic filtering
   * Tries API first, falls back to AsyncStorage cache on failure
   */
  async getReports(
    lat?: number,
    lng?: number,
    radius?: number
  ): Promise<SightingReport[]> {
    try {
      const headers = await getHeaders();
      const params = new URLSearchParams();
      if (lat !== undefined && lng !== undefined) {
        params.append('lat', lat.toString());
        params.append('lon', lng.toString());
      }
      if (radius !== undefined) {
        params.append('radius', radius.toString());
      }

      const url = `${Config.API_BASE_URL}/api/v1/social/reports`;
      const queryString = params.toString();
      const fullUrl = queryString ? `${url}?${queryString}` : url;

      const response = await fetch(fullUrl, { headers });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();
      const reports = data.reports || [];

      // Cache success to AsyncStorage
      try {
        const cacheKey = lat && lng
          ? `social_reports_${lat.toFixed(2)}_${lng.toFixed(2)}_${radius || 'all'}`
          : 'social_reports_all';
        await AsyncStorage.setItem(
          cacheKey,
          JSON.stringify({ data: reports, timestamp: Date.now() })
        );
      } catch (cacheError) {
        if (__DEV__) console.warn('[SocialService] Failed to cache reports:', cacheError);
      }

      return reports;
    } catch (error) {
      if (__DEV__) console.warn('[SocialService] Failed to fetch reports:', error);

      // Fall back to cached data
      try {
        const cacheKey = lat && lng
          ? `social_reports_${lat.toFixed(2)}_${lng.toFixed(2)}_${radius || 'all'}`
          : 'social_reports_all';
        const cached = await AsyncStorage.getItem(cacheKey);
        if (cached) {
          const { data } = JSON.parse(cached);
          if (__DEV__) console.log('[SocialService] Using cached reports');
          return data;
        }
      } catch (cacheError) {
        if (__DEV__) console.warn('[SocialService] Failed to read cached reports:', cacheError);
      }

      return [];
    }
  },

  /**
   * Create a new sighting report
   */
  async createReport(report: NewReport): Promise<SightingReport | null> {
    try {
      const headers = await getHeaders();
      const response = await fetch(
        `${Config.API_BASE_URL}/api/v1/social/reports`,
        {
          method: 'POST',
          headers,
          body: JSON.stringify(report),
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();
      const newReport = data.report || null;

      if (__DEV__) console.log('[SocialService] Report created successfully');

      // Invalidate cache on successful report creation
      try {
        const keys = await AsyncStorage.getAllKeys();
        const cacheKeys = keys.filter(k => k.startsWith('social_reports_'));
        await AsyncStorage.multiRemove(cacheKeys);
      } catch (cacheError) {
        if (__DEV__) console.warn('[SocialService] Failed to invalidate cache:', cacheError);
      }

      return newReport;
    } catch (error) {
      if (__DEV__) console.warn('[SocialService] Failed to create report:', error);
      return null;
    }
  },

  /**
   * Like/upvote a sighting report
   */
  async likeReport(reportId: string): Promise<void> {
    try {
      const headers = await getHeaders();
      const response = await fetch(
        `${Config.API_BASE_URL}/api/v1/social/reports/${reportId}/like`,
        {
          method: 'POST',
          headers,
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      if (__DEV__) console.log('[SocialService] Report liked successfully');
    } catch (error) {
      if (__DEV__) console.warn('[SocialService] Failed to like report:', error);
    }
  },
};

export default socialService;
