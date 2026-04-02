import axios, { AxiosInstance } from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Config from '../config';

/**
 * API Service Module — HuntPlan AI
 *
 * Provides a typed client for communicating with the FastAPI backend.
 * Handles all HTTP requests for lands, regulations, species, seasons, and bag limits.
 *
 * The client connects to:
 * - Development: http://localhost:8000 (iOS Simulator)
 * - Production: https://huntplan-api.onrender.com
 *
 * For real device development, update localhost to your Mac's local IP.
 * All responses are automatically parsed and typed.
 *
 * Features:
 * - In-memory cache with configurable TTL to reduce API calls
 * - Request deduplication to prevent simultaneous duplicate requests
 * - AsyncStorage-backed persistent cache for offline fallback
 * - Automatic cache invalidation on network errors
 */

// ── Cache configuration ──

/**
 * Cache entry with data and timestamp
 * @interface CacheEntry
 * @property {T} data - Cached response data
 * @property {number} timestamp - Timestamp when cached
 */
interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

/** Default TTL for in-memory cache: 5 minutes */
const DEFAULT_CACHE_TTL = 5 * 60 * 1000;

/** TTL for persistent AsyncStorage caches */
const PERSISTENT_CACHE_TTL = {
  regulations: 24 * 60 * 60 * 1000, // 24 hours for seasons, bag limits
  lands: 7 * 24 * 60 * 60 * 1000,   // 7 days for lands data
};

// ── Type definitions matching backend models ──

/**
 * Represents a public hunting land (WMA, State Forest, Federal, etc.)
 * @interface PublicLand
 * @property {number} id - Unique identifier
 * @property {string} name - Land name (e.g., "Patuxent River Wildlife Refuge")
 * @property {string} land_type - Classification: 'WMA', 'State Forest', 'Federal', etc.
 * @property {string} state - State abbreviation (e.g., 'MD')
 * @property {string} county - County name (e.g., 'Anne Arundel')
 * @property {number | null} acres - Total acreage, null if unknown
 * @property {string | null} managing_agency - Managing organization (e.g., "MD DNR")
 * @property {string | null} website_url - Link to land's website or details
 * @property {string[] | null} huntable_species - Array of huntable species (e.g., ['Deer', 'Turkey'])
 * @property {string[] | null} allowed_weapons - Array of allowed weapons (e.g., ['Archery', 'Firearms'])
 * @property {GeoJSONGeometry | null} geometry - GeoJSON polygon/point boundary, null if not available
 */
export interface PublicLand {
  id: number;
  name: string;
  land_type: string; // 'WMA' | 'State Forest' | 'Federal'
  state: string;
  county: string;
  acres: number | null;
  managing_agency: string | null;
  website_url: string | null;
  huntable_species: string[] | null;
  allowed_weapons: string[] | null;
  geometry: GeoJSONGeometry | null;
}

/**
 * GeoJSON geometry object for land boundaries
 * @interface GeoJSONGeometry
 * @property {string} type - Geometry type: Polygon, MultiPolygon, Point, LineString, etc.
 * @property {number[][] | number[][][] | number[][][][]} coordinates - Nested array of [lng, lat] pairs
 */
export interface GeoJSONGeometry {
  type: 'Polygon' | 'MultiPolygon' | 'Point' | 'LineString' | 'MultiLineString' | 'MultiPoint' | 'GeometryCollection';
  coordinates: number[] | number[][] | number[][][] | number[][][][];
}

/**
 * Hunting season window for a species and weapon type
 * @interface Season
 * @property {number} id - Unique identifier
 * @property {number} species_id - References Species.id
 * @property {string} season_type - Type of hunt (e.g., 'Regular', 'Youth', 'Doe')
 * @property {string} start_date - ISO 8601 date (YYYY-MM-DD)
 * @property {string} end_date - ISO 8601 date (YYYY-MM-DD)
 * @property {string} weapon_type - Allowed weapon (e.g., 'Archery', 'Firearms')
 * @property {string | null} notes - Additional restrictions or notes
 */
export interface Season {
  id: number;
  species_id: number;
  season_type: string;
  start_date: string;
  end_date: string;
  weapon_type: string;
  notes: string | null;
}

/**
 * Huntable species (Deer, Turkey, Waterfowl, etc.)
 * @interface Species
 * @property {number} id - Unique identifier
 * @property {string} name - Common name (e.g., "White-tailed Deer")
 * @property {string} category - Grouping (e.g., "Big Game", "Upland Game")
 */
export interface Species {
  id: number;
  name: string;
  category: string;
}

/**
 * Daily or seasonal harvest limit for a species
 * @interface BagLimit
 * @property {number} id - Unique identifier
 * @property {number} species_id - References Species.id
 * @property {string} limit_type - 'Daily' or 'Seasonal'
 * @property {number} quantity - Number of animals allowed
 * @property {string} time_period - Period (e.g., 'per day', 'per season')
 * @property {string | null} notes - Additional details
 */
export interface BagLimit {
  id: number;
  species_id: number;
  limit_type: string;
  quantity: number;
  time_period: string;
  notes: string | null;
}

/**
 * Regulations for a single species (seasons + bag limits)
 * @interface Regulation
 * @property {string} species - Species name
 * @property {string} category - Species category
 * @property {Season[]} seasons - Array of applicable seasons
 * @property {BagLimit[]} bag_limits - Array of bag limits
 */
export interface Regulation {
  species: string;
  category: string;
  seasons: Season[];
  bag_limits: BagLimit[];
}

/**
 * Response from canIHunt query — determines if hunting is allowed
 * @interface CanIHuntResponse
 * @property {boolean} allowed - True if hunting is permitted on this date/weapon/species
 * @property {string} reason - Human-readable explanation
 * @property {Season[]} matching_seasons - Seasons that match the query
 * @property {string[]} citations - References to regulations (e.g., regulatory codes)
 */
export interface CanIHuntResponse {
  allowed: boolean;
  reason: string;
  matching_seasons: Season[];
  citations: string[];
}

// ── API Client ──

/**
 * HuntPlanAPI — Typed HTTP Client with Caching & Deduplication
 *
 * Singleton instance managing all FastAPI backend communication.
 * Uses Axios with automatic request/response typing.
 *
 * Features:
 * - In-memory cache with TTL to reduce redundant API calls
 * - Request deduplication to prevent concurrent duplicate requests
 * - AsyncStorage-backed persistent cache for offline fallback
 * - Graceful cache invalidation on network errors
 *
 * @class HuntPlanAPI
 */
class HuntPlanAPI {
  private client: AxiosInstance;
  /** In-memory cache: URL → { data, timestamp } */
  private memoryCache = new Map<string, CacheEntry<any>>();
  /** In-flight requests: URL → Promise, prevents duplicate concurrent requests */
  private inFlightRequests = new Map<string, Promise<any>>();

  constructor() {
    this.client = axios.create({
      baseURL: Config.API_BASE_URL,
      timeout: 15000,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  /**
   * Cached GET wrapper with deduplication and persistent fallback
   * Checks in-memory cache first, then makes API call if expired/missing.
   * Deduplicates concurrent requests for same URL.
   * On network error, falls back to AsyncStorage persistent cache.
   *
   * @template T - Response data type
   * @private
   * @async
   * @param {string} url - API endpoint URL (relative to baseURL)
   * @param {Record<string, any>} params - Query parameters
   * @param {string} cacheKey - Key for persistent AsyncStorage cache
   * @param {number} [ttl] - Time-to-live in milliseconds (default: DEFAULT_CACHE_TTL)
   * @returns {Promise<T>} Cached or fresh response data
   * @throws Will throw if both API call and persistent cache fail
   */
  private async cachedGet<T>(
    url: string,
    params: Record<string, any> = {},
    cacheKey: string,
    ttl: number = DEFAULT_CACHE_TTL
  ): Promise<T> {
    // Check in-memory cache first
    if (this.memoryCache.has(cacheKey)) {
      const entry = this.memoryCache.get(cacheKey)!;
      const age = Date.now() - entry.timestamp;
      if (age < ttl) {
        if (__DEV__) console.log(`[API] Cache hit (${age}ms old): ${cacheKey}`);
        return entry.data;
      }
    }

    // Check if this request is already in flight — return same promise
    if (this.inFlightRequests.has(cacheKey)) {
      if (__DEV__) console.log(`[API] Deduplicating in-flight request: ${cacheKey}`);
      return this.inFlightRequests.get(cacheKey)!;
    }

    // Create the promise for this request
    const promise = (async () => {
      try {
        const res = await this.client.get<T>(url, { params });
        const data = res.data;

        // Store in memory cache
        this.memoryCache.set(cacheKey, {
          data,
          timestamp: Date.now(),
        });

        // Store in persistent cache
        try {
          await AsyncStorage.setItem(
            `api_cache_${cacheKey}`,
            JSON.stringify({ data, timestamp: Date.now() })
          );
        } catch (storageError) {
          if (__DEV__) console.warn(`[API] Failed to store persistent cache for ${cacheKey}:`, storageError);
        }

        return data;
      } catch (error) {
        if (__DEV__) console.warn(`[API] Request failed for ${cacheKey}:`, error);

        // Fall back to persistent cache on network error
        try {
          const stored = await AsyncStorage.getItem(`api_cache_${cacheKey}`);
          if (stored) {
            const cached = JSON.parse(stored);
            const age = Date.now() - cached.timestamp;
            if (__DEV__) console.log(`[API] Using persistent cache (${age}ms old): ${cacheKey}`);
            // Refresh memory cache from persistent cache
            this.memoryCache.set(cacheKey, {
              data: cached.data,
              timestamp: cached.timestamp,
            });
            return cached.data;
          }
        } catch (persistentError) {
          if (__DEV__) console.warn(`[API] Persistent cache unavailable for ${cacheKey}`);
        }

        // No fallback available — re-throw error
        throw error;
      }
    })();

    // Track in-flight request
    this.inFlightRequests.set(cacheKey, promise);

    // Clean up in-flight tracker when complete
    promise.finally(() => {
      this.inFlightRequests.delete(cacheKey);
    });

    return promise;
  }

  /**
   * Clear all in-memory and optional persistent caches
   * Useful for forcing fresh data (e.g., on app launch, manual refresh)
   *
   * @async
   * @param {boolean} [clearPersistent=false] - Also clear AsyncStorage persistent caches
   * @returns {Promise<void>}
   */
  async clearCache(clearPersistent: boolean = false): Promise<void> {
    this.memoryCache.clear();
    this.inFlightRequests.clear();

    if (clearPersistent) {
      try {
        const keys = await AsyncStorage.getAllKeys();
        const cacheKeys = keys.filter(k => k.startsWith('api_cache_'));
        await AsyncStorage.multiRemove(cacheKeys);
        if (__DEV__) console.log(`[API] Cleared ${cacheKeys.length} persistent cache entries`);
      } catch (error) {
        if (__DEV__) console.warn('[API] Failed to clear persistent cache:', error);
      }
    }
  }

  // ── Lands ──

  /**
   * Get public hunting lands within a radius of a location
   * Cached for 7 days (lands don't change frequently)
   * @param {number} lat - Latitude (decimal degrees)
   * @param {number} lon - Longitude (decimal degrees)
   * @param {number} [radiusMiles=25] - Search radius in miles
   * @returns {Promise<PublicLand[]>} Array of lands within radius
   */
  async getLandsNearby(lat: number, lon: number, radiusMiles: number = 25): Promise<PublicLand[]> {
    const cacheKey = `lands_nearby_${lat.toFixed(2)}_${lon.toFixed(2)}_${radiusMiles}`;
    return this.cachedGet<PublicLand[]>(
      '/api/v1/lands/nearby',
      { lat, lon, radius_miles: radiusMiles },
      cacheKey,
      PERSISTENT_CACHE_TTL.lands
    );
  }

  /**
   * Get all hunting lands in a specific county
   * Cached for 7 days
   * @param {string} county - County name (e.g., 'Anne Arundel')
   * @returns {Promise<PublicLand[]>} Array of lands in the county
   */
  async getLandsByCounty(county: string): Promise<PublicLand[]> {
    const cacheKey = `lands_county_${county.toLowerCase()}`;
    return this.cachedGet<PublicLand[]>(
      `/api/v1/lands/county/${encodeURIComponent(county)}`,
      {},
      cacheKey,
      PERSISTENT_CACHE_TTL.lands
    );
  }

  /**
   * Get detailed information about a specific land by ID
   * Cached for 7 days
   * @param {number} id - Land identifier
   * @returns {Promise<PublicLand>} The requested land object
   */
  async getLandById(id: number): Promise<PublicLand> {
    const cacheKey = `land_${id}`;
    return this.cachedGet<PublicLand>(
      `/api/v1/lands/${id}`,
      {},
      cacheKey,
      PERSISTENT_CACHE_TTL.lands
    );
  }

  /**
   * Search lands by name or keyword
   * Cached for 5 minutes (search results may change with data updates)
   * @param {string} query - Search term (name, county, or keyword)
   * @returns {Promise<PublicLand[]>} Array of matching lands
   */
  async searchLands(query: string): Promise<PublicLand[]> {
    const cacheKey = `lands_search_${query.toLowerCase()}`;
    return this.cachedGet<PublicLand[]>(
      '/api/v1/lands/search/',
      { q: query },
      cacheKey,
      DEFAULT_CACHE_TTL
    );
  }

  /**
   * Get aggregate statistics for all lands
   * Cached for 7 days (stats don't change frequently)
   * @returns {Promise<{total: number; by_type: Record<string, number>; by_county: Record<string, number>}>}
   * Object with total count, breakdown by land type, and breakdown by county
   */
  async getLandStats(): Promise<{ total: number; by_type: Record<string, number>; by_county: Record<string, number> }> {
    const cacheKey = 'lands_stats';
    return this.cachedGet<{ total: number; by_type: Record<string, number>; by_county: Record<string, number> }>(
      '/api/v1/lands/stats/',
      {},
      cacheKey,
      PERSISTENT_CACHE_TTL.lands
    );
  }

  // ── Regulations ──

  /**
   * Get all huntable species in Maryland
   * Cached for 24 hours (species list rarely changes)
   * @returns {Promise<Species[]>} Array of species with category information
   */
  async getSpecies(): Promise<Species[]> {
    const cacheKey = 'regulations_species';
    return this.cachedGet<Species[]>(
      '/api/v1/regulations/species',
      {},
      cacheKey,
      PERSISTENT_CACHE_TTL.regulations
    );
  }

  /**
   * Get all hunting seasons, optionally filtered by species
   * Cached for 24 hours (seasons are fairly stable within season)
   * @param {string} [speciesName] - Optional species name to filter by
   * @returns {Promise<Season[]>} Array of seasons
   */
  async getSeasons(speciesName?: string): Promise<Season[]> {
    const cacheKey = speciesName
      ? `regulations_seasons_${speciesName.toLowerCase()}`
      : 'regulations_seasons_all';
    const params: Record<string, string> = {};
    if (speciesName) params.species = speciesName;
    return this.cachedGet<Season[]>(
      '/api/v1/regulations/seasons',
      params,
      cacheKey,
      PERSISTENT_CACHE_TTL.regulations
    );
  }

  /**
   * Check if hunting is legal for a specific species, weapon, date, and county
   * Used by AI to answer "Can I hunt...?" questions
   * Cached for 5 minutes (user may check multiple dates/weapons)
   * @param {string} species - Species name (e.g., 'White-tailed Deer')
   * @param {string} weapon - Weapon type (e.g., 'Archery', 'Firearms')
   * @param {string} date - ISO 8601 date string (YYYY-MM-DD)
   * @param {string} county - Maryland county name
   * @returns {Promise<CanIHuntResponse>} Legality determination with reason and matched seasons
   */
  async canIHunt(
    species: string,
    weapon: string,
    date: string,
    county: string
  ): Promise<CanIHuntResponse> {
    const cacheKey = `can_hunt_${species.toLowerCase()}_${weapon.toLowerCase()}_${date}_${county.toLowerCase()}`;
    return this.cachedGet<CanIHuntResponse>(
      '/api/v1/regulations/can-i-hunt',
      { species, weapon, date, county },
      cacheKey,
      DEFAULT_CACHE_TTL
    );
  }

  /**
   * Get bag limits (daily/seasonal harvests), optionally for a species
   * Cached for 24 hours
   * @param {string} [species] - Optional species name to filter by
   * @returns {Promise<BagLimit[]>} Array of bag limits
   */
  async getBagLimits(species?: string): Promise<BagLimit[]> {
    const cacheKey = species
      ? `regulations_bag_limits_${species.toLowerCase()}`
      : 'regulations_bag_limits_all';
    const params: Record<string, string> = {};
    if (species) params.species = species;
    return this.cachedGet<BagLimit[]>(
      '/api/v1/regulations/bag-limits',
      params,
      cacheKey,
      PERSISTENT_CACHE_TTL.regulations
    );
  }
}

// Singleton instance exported for use throughout the app
const api = new HuntPlanAPI();
export default api;
