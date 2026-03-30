/**
 * Database schema for offline-first data storage.
 * WatermelonDB integration planned for Phase 2.
 * For now, this file defines the schema shape for future use.
 */

export interface RegulationRecord {
  species: string;
  season_type: string;
  start_date: string;
  end_date: string;
  county: string;
  weapon_type: string;
  bag_limit_daily: number;
  bag_limit_season: number;
  sunday_allowed: boolean;
  notes: string;
  source: string;
  last_updated: number;
}

export interface PublicLandRecord {
  name: string;
  wma_id: string;
  type: string;
  county: string;
  acres: number;
  latitude: number;
  longitude: number;
  huntable_species: string;
  access_points: string;
  restrictions: string;
  geometry: string;
  last_updated: number;
}

export interface HuntPlanRecord {
  species: string;
  planned_date: string;
  location: string;
  county: string;
  weapon_type: string;
  weather_notes: string;
  target_public_land: string;
  notes: string;
  is_synced: boolean;
  created_at: number;
  updated_at: number;
}

export interface FieldNoteRecord {
  title: string;
  body: string;
  latitude: number;
  longitude: number;
  accuracy: number;
  is_synced: boolean;
  created_at: number;
  updated_at: number;
}

export interface ScoutingReportRecord {
  anonymous_handle: string;
  species: string;
  activity_level: string;
  county: string;
  area: string;
  body_text: string;
  upvotes: number;
  user_upvoted: boolean;
  is_synced: boolean;
  created_at: number;
  updated_at: number;
}

export interface UserProfileRecord {
  anonymous_handle: string;
  device_id: string;
  auth_token: string;
  home_county: string;
  experience_level: string;
  preferred_species: string;
  notifications_enabled: boolean;
  created_at: number;
  updated_at: number;
}

// Schema version for future WatermelonDB migration
export const SCHEMA_VERSION = 1;
