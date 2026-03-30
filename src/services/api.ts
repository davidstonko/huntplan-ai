import axios, { AxiosInstance } from 'axios';

/**
 * HuntPlan AI API Client
 *
 * Connects to the FastAPI backend running in Docker.
 * On a real device, replace localhost with your Mac's local IP.
 * In the iOS simulator, localhost works directly.
 */

// For iOS Simulator: localhost works. For real device: use your Mac's LAN IP
const API_BASE_URL = __DEV__
  ? 'http://localhost:8000'
  : 'https://api.huntplanai.com';

// ── Type definitions matching backend models ──

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

export interface GeoJSONGeometry {
  type: 'Polygon' | 'MultiPolygon' | 'Point' | 'LineString' | 'MultiLineString' | 'MultiPoint' | 'GeometryCollection';
  coordinates: number[] | number[][] | number[][][] | number[][][][];
}

export interface Season {
  id: number;
  species_id: number;
  season_type: string;
  start_date: string;
  end_date: string;
  weapon_type: string;
  notes: string | null;
}

export interface Species {
  id: number;
  name: string;
  category: string;
}

export interface BagLimit {
  id: number;
  species_id: number;
  limit_type: string;
  quantity: number;
  time_period: string;
  notes: string | null;
}

export interface Regulation {
  species: string;
  category: string;
  seasons: Season[];
  bag_limits: BagLimit[];
}

export interface CanIHuntResponse {
  allowed: boolean;
  reason: string;
  matching_seasons: Season[];
  citations: string[];
}

// ── API Client ──

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

  async getLandsNearby(lat: number, lon: number, radiusMiles: number = 25): Promise<PublicLand[]> {
    const res = await this.client.get<PublicLand[]>('/api/v1/lands/nearby', {
      params: { lat, lon, radius_miles: radiusMiles },
    });
    return res.data;
  }

  async getLandsByCounty(county: string): Promise<PublicLand[]> {
    const res = await this.client.get<PublicLand[]>(`/api/v1/lands/county/${encodeURIComponent(county)}`);
    return res.data;
  }

  async getLandById(id: number): Promise<PublicLand> {
    const res = await this.client.get<PublicLand>(`/api/v1/lands/${id}`);
    return res.data;
  }

  async searchLands(query: string): Promise<PublicLand[]> {
    const res = await this.client.get<PublicLand[]>('/api/v1/lands/search/', {
      params: { q: query },
    });
    return res.data;
  }

  async getLandStats(): Promise<{ total: number; by_type: Record<string, number>; by_county: Record<string, number> }> {
    const res = await this.client.get('/api/v1/lands/stats/');
    return res.data;
  }

  // ── Regulations ──

  async getSpecies(): Promise<Species[]> {
    const res = await this.client.get<Species[]>('/api/v1/regulations/species');
    return res.data;
  }

  async getSeasons(speciesName?: string): Promise<Season[]> {
    const params: Record<string, string> = {};
    if (speciesName) params.species = speciesName;
    const res = await this.client.get<Season[]>('/api/v1/regulations/seasons', { params });
    return res.data;
  }

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

  async getBagLimits(species?: string): Promise<BagLimit[]> {
    const params: Record<string, string> = {};
    if (species) params.species = species;
    const res = await this.client.get<BagLimit[]>('/api/v1/regulations/bag-limits', { params });
    return res.data;
  }
}

// Singleton
const api = new HuntPlanAPI();
export default api;
