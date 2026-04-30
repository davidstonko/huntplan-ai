/**
 * Hiking-mode domain types.
 *
 * Built for Phase 5B (V2.2.0). Covers trails (LineStrings with metadata),
 * AT shelters + trailheads + landmarks, user-owned hike trips (day or
 * AT section), and a 3-tier gear recommendation system (day / overnight /
 * multi-day) that draws from the shared GEAR_CATALOG.
 *
 * No premium / pay-gated fields — V2.2.0 is fully free.
 */

export type TrailDifficulty = 'easy' | 'moderate' | 'strenuous';

export type TrailType = 'loop' | 'out-and-back' | 'point-to-point';

/**
 * A single trail (state-park or short AT segment). For the full
 * Maryland AT LineString we use `ATTrail` separately — it's a single
 * 40.9-mile polyline that merits its own record shape.
 */
export interface Trail {
  id: string; // "md-cunningham-falls-lower-loop" — stable slug
  name: string;
  park: string;
  county: string;

  type: TrailType;
  difficulty: TrailDifficulty;
  lengthMi: number;
  elevationGainFt: number;
  estDurationMin: number;

  dogFriendly: boolean;
  seasonOpenMonth: number | null;
  seasonCloseMonth: number | null;

  trailheadLat: number;
  trailheadLon: number;

  /**
   * GeoJSON LineString coordinates [[lon, lat], ...]. Optional — some
   * trails have only a trailhead pin when we can't source a clean track.
   */
  coordinates: number[][] | null;

  description: string | null;
  tags: string[]; // free-text: "waterfall", "summit-view", "stream-crossing", etc.

  color?: string;

  /**
   * User-facing highlight bullets — what makes this trail worth visiting.
   * Distinct from `tags` (slug-ish filters). Optional so older trails
   * without curated copy still validate.
   */
  highlights?: string[];

  /**
   * Official park / trail website (managing agency — DNR, NPS, county, etc.).
   * Optional; used for "Learn more" deep-links from the detail panel.
   */
  officialUrl?: string;

  /**
   * Free-text notes about the trailhead parking lot (surface, fee, gate hours,
   * shared-access). The trailheadLat/Lon IS the parking pin — this field is
   * for nuance the coordinate alone can't convey.
   */
  parkingNotes?: string | null;
}

/**
 * The 40.9-mile Maryland section of the Appalachian Trail. Authoritative
 * record — loaded from ATC GIS or OSM extract, validated before shipping.
 */
export interface ATTrail {
  id: 'md-appalachian-trail';
  name: 'Maryland Appalachian Trail';
  totalLengthMi: number; // 40.9
  coordinates: number[][]; // LineString, south-to-north
  shelters: ATShelter[];
  trailheads: ATTrailhead[];
  landmarks: ATLandmark[];
  waterSources: ATWaterSource[];
}

export interface ATShelter {
  id: string; // "at-md-ensign-cowall"
  name: string;
  lat: number;
  lon: number;
  mileFromSouth: number; // MD southern border = 0
  capacity: number;
  hasPrivy: boolean;
  hasBearBox: boolean;
  waterSourceNotes: string | null;
  notes: string | null;
}

export interface ATTrailhead {
  id: string;
  name: string;
  lat: number;
  lon: number;
  mileFromSouth: number;
  parking: 'paved' | 'gravel' | 'roadside' | 'none';
  parkingCapacity: number | null;
  hasPrivy: boolean;
  access: 'public' | 'permit';
  notes: string | null;
}

export interface ATLandmark {
  id: string;
  name: string;
  type: 'vista' | 'summit' | 'historic' | 'rock_formation' | 'stream' | 'road_crossing';
  lat: number;
  lon: number;
  mileFromSouth: number;
  description: string | null;
}

export interface ATWaterSource {
  id: string;
  name: string;
  lat: number;
  lon: number;
  mileFromSouth: number;
  reliability: 'year-round' | 'seasonal' | 'unreliable';
  notes: string | null;
}

/**
 * Gear-tier bundle. Each bundle references `GEAR_CATALOG` IDs from
 * StarterGearScreen.tsx. Bundles are additive: Overnight inherits Day,
 * Multi-day inherits Overnight. Some items are replaced rather than
 * added (e.g. day-pack → overnight-pack).
 */
export type HikeTier = 'day' | 'overnight' | 'multi-day';

export interface HikeGearBundle {
  tier: HikeTier;
  label: string;
  distanceHint: string; // "0-12 mi, same-day"
  trailExamples: string[];
  /** Gear IDs from GEAR_CATALOG. Resolved by `resolveBundle(tier)`. */
  itemIds: string[];
  /** Items from previous tier to remove (e.g. day pack when moving to overnight). */
  removeFromPrev?: string[];
}

/**
 * A user's hike trip. Day hikes have `nights: 0`; AT section hikes have
 * `nights: >= 1` and carry an ordered shelter/campsite list.
 */
export interface HikeTrip {
  id: string;
  name: string;
  trailId: string | null; // null for free-form AT sections
  startTrailheadId: string | null;
  endTrailheadId: string | null;

  startDate: string; // ISO yyyy-mm-dd
  nights: number; // 0 = day hike
  partySize: number;

  tier: HikeTier;
  plannedShelterIds: string[]; // for AT overnight/multi-day
  plannedMileage: number;

  gearChecklistId: string | null;
  notes: string | null;

  createdAt: string;
  updatedAt: string;
}

export type HikeGearCategory =
  | 'pack'
  | 'shelter'
  | 'sleep'
  | 'cook'
  | 'safety'
  | 'navigation'
  | 'clothing'
  | 'hydration'
  | 'food'
  | 'tools';

export interface HikeGearItem {
  id: string; // FK into GEAR_CATALOG
  label: string;
  category: HikeGearCategory;
  quantity: number;
  checked: boolean;
  asin: string | null;
  /** Why the rules engine included this. */
  reason: string | null;
  /** True if required (cannot be unchecked); used for safety-critical items. */
  required: boolean;
}

export interface HikeGearChecklist {
  id: string;
  tripId: string | null;
  tier: HikeTier;
  items: HikeGearItem[];
  createdAt: string;
  updatedAt: string;
}
