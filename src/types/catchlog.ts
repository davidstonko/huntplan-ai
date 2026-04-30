/**
 * catchlog.ts — TypeScript type definitions for fishing catch logs and hunting harvest logs
 *
 * Includes:
 * - Catch log entries for fishing (species, bait, conditions, location, etc.)
 * - Harvest log entries for hunting (species, method, distance, etc.)
 * - Trip summaries for analytics and personal records
 *
 * Used by ScoutDataContext and catch/harvest log UI components.
 * AsyncStorage-backed persistence in V2; backend sync in Phase 3+.
 */

/**
 * Single fishing catch log entry
 * Records details about a caught fish for future reference and gear recommendations
 */
export interface CatchLogEntry {
  /** Unique identifier (UUID or generated ID) */
  id: string;
  /** Date caught (ISO format, e.g. '2026-04-04') */
  date: string;
  /** Time caught (24-hour format, e.g. '14:30') */
  time: string;
  /** Latitude of catch location */
  lat: number;
  /** Longitude of catch location */
  lng: number;
  /** User-friendly location name, e.g. 'Gunpowder Falls North Bank' */
  locationName: string;
  /** Type of water: tidal (Chesapeake/tributaries) or nontidal (streams/lakes) */
  waterType: 'tidal' | 'nontidal';
  /** Geographic region: 'chesapeake', 'gunpowder', 'deep_creek', 'western_md', etc. */
  region: string;
  /** Species caught: 'striped_bass', 'brown_trout', 'largemouth_bass', 'catfish', etc. */
  species: string;
  /** Fish length in inches (optional) */
  length?: number;
  /** Fish weight in pounds (optional) */
  weight?: number;
  /** Whether the fish was kept for consumption */
  kept: boolean;
  /** Optional photo URI (local file path or URL) */
  photoUri?: string;
  /** Fishing method used: fly, bait, or lure */
  method: 'fly' | 'bait' | 'lure';
  /** Specific bait or fly pattern used, e.g. 'Woolly Bugger #8', 'live shiners' */
  baitOrFly: string;
  /** Presentation technique: 'dead drift', 'slow retrieve', 'jigging', 'stripping', etc. */
  presentation: string;
  /** Depth at which fish was caught: 'surface', 'mid-column', 'bottom' */
  depth?: string;
  /** Water temperature in Fahrenheit (optional) */
  waterTemp?: number;
  /** Air temperature in Fahrenheit (optional) */
  airTemp?: number;
  /** Weather conditions: 'sunny', 'cloudy', 'rainy', 'windy', etc. */
  weather: string;
  /** Wind speed in mph (optional) */
  windSpeed?: number;
  /** Tidal phase (Chesapeake only): 'incoming', 'outgoing', 'slack_high', 'slack_low' */
  tidePhase?: string;
  /** User rating of the fishing session (1-5 stars) */
  rating: 1 | 2 | 3 | 4 | 5;
  /** Freeform notes about the catch, conditions, or techniques */
  notes: string;
}

/**
 * Single hunting harvest log entry
 * Records details about a harvested animal for future reference and gear recommendations
 */
export interface HarvestLogEntry {
  /** Unique identifier (UUID or generated ID) */
  id: string;
  /** Date of harvest (ISO format, e.g. '2026-04-04') */
  date: string;
  /** Time of harvest (24-hour format, e.g. '06:30') */
  time: string;
  /** Latitude of harvest location */
  lat: number;
  /** Longitude of harvest location */
  lng: number;
  /** User-friendly location name, e.g. 'Soldier\'s Delight Natural Environmental Area' */
  locationName: string;
  /** Land type: 'WMA', 'CWMA', 'CFL', 'SF', 'SP', 'NRMA', 'NEA', 'FMA', 'Private' */
  landType: string;
  /** Species harvested: 'whitetail', 'turkey', 'waterfowl', 'bear', 'small_game' */
  species: string;
  /** Hunting method: archery, firearms, muzzleloader */
  method: 'archery' | 'firearms' | 'muzzleloader';
  /** Specific weapon used, e.g. 'Hoyt RX3', '30-06 Springfield' */
  weapon: string;
  /** Shot distance in yards (optional, archery and firearms) */
  distance?: number;
  /** Shot placement description, e.g. 'vital organs', 'high shoulder' */
  shotPlacement?: string;
  /** Optional photo URI (local file path or URL) */
  photoUri?: string;
  /** Antler points (deer only) */
  points?: number;
  /** Field-dressed weight in pounds (optional) */
  weight?: number;
  /** Beard length in inches (turkey only) */
  beardLength?: number;
  /** Camouflage pattern used, e.g. 'Mossy Oak Break-up Country' */
  camoPattern: string;
  /** Scent control product used (optional), e.g. 'Code Blue Whitetail Estrus' */
  scentProduct?: string;
  /** Predator or game call used (optional), e.g. 'Zink Calls Diaphragm' */
  callUsed?: string;
  /** Bait or attractant used (optional), e.g. 'apple, corn pile' */
  attractant?: string;
  /** Air temperature in Fahrenheit */
  temperature: number;
  /** Wind direction: 'N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW' */
  windDirection: string;
  /** Wind speed in mph */
  windSpeed: number;
  /** Weather conditions: 'sunny', 'cloudy', 'rainy', 'windy', 'snow', etc. */
  weather: string;
  /** Moon phase (optional), e.g. 'new', 'waxing crescent', 'full', 'waning gibbous' */
  moonPhase?: string;
  /** User rating of the hunting session (1-5 stars) */
  rating: 1 | 2 | 3 | 4 | 5;
  /** Freeform notes about the hunt, tactics, or observations */
  notes: string;
}

/**
 * Summary of a fishing or hunting trip for analytics
 * Used to display trip history and generate insights
 */
export interface TripSummary {
  /** Date of trip (ISO format) */
  date: string;
  /** Location name */
  locationName: string;
  /** Total number of catches/harvests on this trip */
  totalCatches: number;
  /** Top species caught/harvested */
  topSpecies: string;
  /** Most effective bait, fly, lure, or tactic */
  topBait: string;
  /** Average rating for the trip (1-5) */
  rating: number;
}
