import axios, { AxiosInstance } from 'axios';

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
 */

// For iOS Simulator: localhost works. For real device: use your Mac's LAN IP
const API_BASE_URL = __DEV__
  ? 'http://localhost:8000'
  : 'https://huntplan-api.onrender.com';

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
 * HuntPlanAPI — Typed HTTP Client
 *
 * Singleton instance managing all FastAPI backend communication.
 * Uses Axios with automatic request/response typing.
 *
 * @class HuntPlanAPI
 */
class HuntPlanAPI {
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: API_BASE_URL,
      timeout: 15000,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // ── Lands ──

  /**
   * Get public hunting lands within a radius of a location
   * @param {number} lat - Latitude (decimal degrees)
   * @param {number} lon - Longitude (decimal degrees)
   * @param {number} [radiusMiles=25] - Search radius in miles
   * @returns {Promise<PublicLand[]>} Array of lands within radius
   */
  async getLandsNearby(lat: number, lon: number, radiusMiles: number = 25): Promise<PublicLand[]> {
    const res = await this.client.get<PublicLand[]>('/api/v1/lands/nearby', {
      params: { lat, lon, radius_miles: radiusMiles },
    });
    return res.data;
  }

  /**
   * Get all hunting lands in a specific county
   * @param {string} county - County name (e.g., 'Anne Arundel')
   * @returns {Promise<PublicLand[]>} Array of lands in the county
   */
  async getLandsByCounty(county: string): Promise<PublicLand[]> {
    const res = await this.client.get<PublicLand[]>(`/api/v1/lands/county/${encodeURIComponent(county)}`);
    return res.data;
  }

  /**
   * Get detailed information about a specific land by ID
   * @param {number} id - Land identifier
   * @returns {Promise<PublicLand>} The requested land object
   */
  async getLandById(id: number): Promise<PublicLand> {
    const res = await this.client.get<PublicLand>(`/api/v1/lands/${id}`);
    return res.data;
  }

  /**
   * Search lands by name or keyword
   * @param {string} query - Search term (name, county, or keyword)
   * @returns {Promise<PublicLand[]>} Array of matching lands
   */
  async searchLands(query: string): Promise<PublicLand[]> {
    const res = await this.client.get<PublicLand[]>('/api/v1/lands/search/', {
      params: { q: query },
    });
    return res.data;
  }

  /**
   * Get aggregate statistics for all lands
   * @returns {Promise<{total: number; by_type: Record<string, number>; by_county: Record<string, number>}>}
   * Object with total count, breakdown by land type, and breakdown by county
   */
  async getLandStats(): Promise<{ total: number; by_type: Record<string, number>; by_county: Record<string, number> }> {
    const res = await this.client.get('/api/v1/lands/stats/');
    return res.data;
  }

  // ── Regulations ──

  /**
   * Get all huntable species in Maryland
   * @returns {Promise<Species[]>} Array of species with category information
   */
  async getSpecies(): Promise<Species[]> {
    const res = await this.client.get<Species[]>('/api/v1/regulations/species');
    return res.data;
  }

  /**
   * Get all hunting seasons, optionally filtered by species
   * @param {string} [speciesName] - Optional species name to filter by
   * @returns {Promise<Season[]>} Array of seasons
   */
  async getSeasons(speciesName?: string): Promise<Season[]> {
    const params: Record<string, string> = {};
    if (speciesName) params.species = speciesName;
    const res = await this.client.get<Season[]>('/api/v1/regulations/seasons', { params });
    return res.data;
  }

  /**
   * Check if hunting is legal for a specific species, weapon, date, and county
   * Used by AI to answer "Can I hunt...?" questions
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
    const res = await this.client.get<CanIHuntResponse>('/api/v1/regulations/can-i-hunt', {
      params: { species, weapon, date, county },
    });
    return res.data;
  }

  /**
   * Get bag limits (daily/seasonal harvests), optionally for a species
   * @param {string} [species] - Optional species name to filter by
   * @returns {Promise<BagLimit[]>} Array of bag limits
   */
  async getBagLimits(species?: string): Promise<BagLimit[]> {
    const params: Record<string, string> = {};
    if (species) params.species = species;
    const res = await this.client.get<BagLimit[]>('/api/v1/regulations/bag-limits', { params });
    return res.data;
  }
}

// Singleton instance exported for use throughout the app
const api = new HuntPlanAPI();
export default api;
