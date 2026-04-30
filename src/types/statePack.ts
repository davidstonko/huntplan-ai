/**
 * @file statePack.ts
 * @description Type definitions for the multi-state expansion system.
 * Defines state pack interfaces, type guards, and data structures.
 */

/**
 * State code literal type for available states.
 * MD: Maryland (built-in)
 * VA: Virginia (downloadable)
 * PA: Pennsylvania (downloadable)
 */
export type StateCode = 'MD' | 'VA' | 'PA';

/**
 * Feature counts and availability within a state pack.
 */
export interface StatePackFeatures {
  huntingLands: number;
  fishingLocations: number;
  campgrounds: number;
  hikingTrails: number;
  regulations: boolean;
  aiKnowledge: boolean;
}

/**
 * Metadata for a downloadable state data pack.
 * Includes installation status, size, version, and features.
 */
export interface StatePack {
  stateCode: StateCode;
  stateName: string;
  version: string;
  sizeBytes: number;
  installed: boolean;
  downloadProgress?: number; // 0-100, undefined if not downloading
  lastUpdated?: string; // ISO 8601 timestamp
  features: StatePackFeatures;
  downloadUrl?: string; // Download URL from server (Phase 3+)
  description?: string; // Brief description of contents
  releaseDate?: string; // When this pack was released
}

/**
 * Manifest for a state pack download from the server.
 * Used to validate and install packs.
 */
export interface StatePackManifest {
  stateCode: StateCode;
  stateName: string;
  version: string;
  checksumSha256: string;
  sizeBytes: number;
  releaseDate: string;
  compatibility: {
    minAppVersion: string;
    minIOSVersion: string;
  };
  downloadUrl: string;
  features: StatePackFeatures;
}

/**
 * Regulation data structure within a state pack.
 * Organized by activity mode.
 */
export interface RegulationData {
  huntingSeasons: {
    [key: string]: {
      speciesName: string;
      startDate: string;
      endDate: string;
      bagLimit: number;
      weaponRestrictions: string[];
      notes: string;
    };
  };
  fishingSeasons: {
    [key: string]: {
      speciesName: string;
      minSize: number;
      maxSize: number;
      bagLimit: number;
      restrictions: string[];
      notes: string;
    };
  };
  campingRules: {
    stayLimitDays: number;
    reservationRequired: boolean;
    fireAllowed: boolean;
    petPolicy: string;
    notes: string;
  };
  hikingRules: {
    trailUsePolicy: string;
    fireAllowed: boolean;
    backcountryAllowed: boolean;
    notes: string;
  };
  licenses: {
    hunting: {
      name: string;
      price: number;
      url: string;
    };
    fishing: {
      name: string;
      price: number;
      url: string;
    };
  };
  disclaimers: {
    huntingDisclaimer: string;
    fishingDisclaimer: string;
    campingDisclaimer: string;
    hikingDisclaimer: string;
  };
}

/**
 * GIS boundary data within a state pack.
 * Includes hunting lands, fishing grounds, park boundaries, etc.
 */
export interface GISData {
  huntingLands: GISFeature[];
  fishingGrounds: GISFeature[];
  campgrounds: GISFeature[];
  hikingTrails: GISFeature[];
  parkBoundaries: GISFeature[];
}

/**
 * Single GIS feature (point or polygon).
 */
export interface GISFeature {
  id: string;
  name: string;
  geometry: {
    type: 'Point' | 'Polygon' | 'LineString';
    coordinates: number[] | number[][] | number[][][];
  };
  properties: Record<string, string | number | boolean>;
}

/**
 * Fishing-specific data within a state pack.
 */
export interface FishingData {
  accessSites: FishingAccessSite[];
  stockingLocations: StockingLocation[];
  fishingGrounds: FishingGround[];
  hatcheries: Hatchery[];
  boatRamps: BoatRamp[];
}

/**
 * Public fishing access site.
 */
export interface FishingAccessSite {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  waterBody: string;
  accessTypes: string[]; // e.g., ["Shoreline", "Boat Ramp"]
  facilities: string[]; // e.g., ["Parking", "Restrooms", "ADA"]
  contactPhone?: string;
  managingAgency: string;
}

/**
 * Trout stocking or other stocking location.
 */
export interface StockingLocation {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  waterBody: string;
  species: string;
  lastStockDate?: string;
  upcomingStockDate?: string;
  quantity?: number;
}

/**
 * Defined fishing ground (polygon).
 */
export interface FishingGround {
  id: string;
  name: string;
  polygon: number[][][]; // GeoJSON coordinates
  waterType: string; // "Bay", "River", "Lake", "Ocean"
  allowedSpecies: string[];
  restrictions?: string;
}

/**
 * Fish hatchery location.
 */
export interface Hatchery {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  managingAgency: string;
  species: string[];
  contactPhone?: string;
  website?: string;
}

/**
 * Boat ramp location.
 */
export interface BoatRamp {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  waterBody: string;
  rampType: string; // "Single Lane", "Double Lane", "Concrete", "Gravel"
  facilities: string[]; // e.g., ["Parking", "Restrooms", "ADA"]
  managingAgency: string;
  contactPhone?: string;
}

/**
 * Hunting-specific data within a state pack.
 */
export interface HuntingData {
  huntingLands: HuntingLand[];
  shootingRanges: ShootingRange[];
  regulations: RegulationData['huntingSeasons'];
}

/**
 * Hunting land (WMA, wildlife area, etc.).
 */
export interface HuntingLand {
  id: string;
  name: string;
  polygon: number[][][]; // GeoJSON coordinates
  landType: string; // "WMA", "State Forest", etc.
  acres: number;
  allowedSpecies: string[];
  allowedWeapons: string[];
  accessRequirements?: string;
  contact?: {
    phone: string;
    email?: string;
  };
  websiteUrl?: string;
  mapPdfUrl?: string;
}

/**
 * Shooting range location.
 */
export interface ShootingRange {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  rangeType: string; // "Rifle", "Shotgun", "Archery", "Multi-Purpose"
  facilities: string[];
  hoursOfOperation?: string;
  contact?: {
    phone: string;
    email?: string;
  };
  websiteUrl?: string;
}

/**
 * Complete data bundle within a state pack.
 * Loaded into memory after installation.
 */
export interface StateDataBundle {
  stateCode: StateCode;
  stateName: string;
  version: string;
  regulations: RegulationData;
  gis: GISData;
  fishing: FishingData;
  hunting: HuntingData;
  aiKnowledgeBase: AIKnowledgeBase;
  mapTileRegions: MapTileRegion[];
  lastUpdated: string;
}

/**
 * Pre-indexed knowledge base for AI chat in this state.
 * Used for RAG (Retrieval-Augmented Generation).
 */
export interface AIKnowledgeBase {
  huntingFAQ: { question: string; answer: string }[];
  fishingFAQ: { question: string; answer: string }[];
  campingFAQ: { question: string; answer: string }[];
  hikingFAQ: { question: string; answer: string }[];
  regulations: { topic: string; content: string }[];
  landDescriptions: { [landId: string]: string };
  localTips: string[];
}

/**
 * Map tile region for offline caching.
 */
export interface MapTileRegion {
  id: string;
  name: string;
  bounds: {
    north: number;
    south: number;
    east: number;
    west: number;
  };
  zoomLevels: number[]; // e.g., [0, 1, 2, ..., 15]
}

/**
 * AsyncStorage metadata for installed packs.
 * Lighter than StatePack, used for quick lookups.
 */
export interface StatePackMetadata {
  stateCode: StateCode;
  installed: boolean;
  version: string;
  lastUpdated: string;
  downloadProgress?: number;
}

/**
 * Type guard to check if a value is a valid StateCode.
 */
export function isValidStateCode(value: unknown): value is StateCode {
  return typeof value === 'string' && ['MD', 'VA', 'PA'].includes(value);
}

/**
 * Type guard to check if a value is a valid StatePack.
 */
export function isValidStatePack(value: unknown): value is StatePack {
  if (typeof value !== 'object' || value === null) return false;
  const pack = value as Record<string, unknown>;
  return (
    isValidStateCode(pack.stateCode) &&
    typeof pack.stateName === 'string' &&
    typeof pack.version === 'string' &&
    typeof pack.sizeBytes === 'number' &&
    typeof pack.installed === 'boolean' &&
    typeof pack.features === 'object'
  );
}
