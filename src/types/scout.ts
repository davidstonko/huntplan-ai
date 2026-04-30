/**
 * Scout Tab — Data Types
 * Used by ScoutDataContext for hunt plans, waypoints, routes, areas, and GPS tracks.
 *
 * V3: Expanded waypoint system with HuntWaypointType, photo support,
 * per-pin notes, date/time stamps, and Deer Camp sharing controls.
 */

import { HuntWaypointType } from './huntWaypoints';

// ── Legacy type alias for backward compatibility ──
// Old code can still reference WaypointIcon; new code should use HuntWaypointType.
export type WaypointIcon = HuntWaypointType;

/** Cardinal wind directions for ideal wind settings on tree stands / blinds */
export type CardinalDirection = 'N' | 'NE' | 'E' | 'SE' | 'S' | 'SW' | 'W' | 'NW';

/** Habitat / terrain type that the stand hunts over */
export type StandHabitatType =
  | 'oak_flat'        // White/red oak acorn flat
  | 'acorn_ridge'     // Ridgetop oak stand
  | 'field_edge'      // Agricultural field edge
  | 'inside_edge'     // Inside corner of field/woods line
  | 'outside_edge'    // Outside corner
  | 'funnel'          // Terrain funnel / pinch point
  | 'saddle'          // Ridge saddle
  | 'creek_bottom'    // Creek or drainage bottom
  | 'bench'           // Bench / flat on a hillside
  | 'food_plot'       // Planted food plot
  | 'bedding_edge'    // Edge of bedding area
  | 'travel_corridor' // Trail / travel corridor
  | 'water_source'    // Near pond, spring, or creek
  | 'staging_area'    // Pre-rut staging area near field
  | 'other';

/** Extended details for tree stand, ground blind, and prepped tree waypoints */
export interface StandDetails {
  /** Height in feet (e.g., 18, 20, 25) */
  heightFeet?: number;
  /** 1-3 ideal wind directions for this stand */
  idealWindDirections: CardinalDirection[];
  /** Habitat / terrain the stand hunts over */
  habitat?: StandHabitatType;
  /** Secondary habitat (e.g., stand overlooks both a food plot AND a creek crossing) */
  secondaryHabitat?: StandHabitatType;
  /** Shot distance estimate in yards */
  shotDistanceYards?: number;
  /** Best season for this stand (e.g., early, pre-rut, rut, late) */
  bestSeason?: 'early' | 'pre_rut' | 'rut' | 'late' | 'any';
  /** Best time of day */
  bestTimeOfDay?: 'morning' | 'evening' | 'all_day';
  /** Species this stand targets */
  targetSpecies?: string;
  /** Date stand was last checked/maintained */
  lastChecked?: string;
}

// ══════════════════════════════════════════════════════════════
// Waypoint — Enhanced V3
// ══════════════════════════════════════════════════════════════

export interface Waypoint {
  id: string;
  lat: number;
  lng: number;
  /** Waypoint type from the expanded HuntWaypointType taxonomy (60+ types) */
  icon: HuntWaypointType;
  /** User-editable label (defaults to shortLabel from registry) */
  label: string;
  /** Freeform notes — visible to Deer Camp members when shared */
  notes: string;
  /** ISO timestamp when waypoint was created */
  createdAt: string;
  /** ISO timestamp when the observation/event occurred (user-selectable) */
  observedAt?: string;
  /** Photo URI — local file path. Full cloud upload in V4. */
  photoUri?: string;
  /** Photo thumbnail URI (lower res for map callouts) */
  photoThumbnailUri?: string;
  /** User ID of the person who created this waypoint */
  createdBy?: string;
  /** Per-pin color override (defaults to plan color or type color) */
  colorOverride?: string;
  /** Extended details for stand/blind/prepped_tree — only present for those types */
  standDetails?: StandDetails;
  // ── Deer Camp Sharing Controls ──
  /** Whether this waypoint is shared to the linked Deer Camp */
  sharedToCamp: boolean;
  /** Whether this waypoint is hidden from camp view (owner can toggle) */
  hiddenFromCamp: boolean;
}

// ══════════════════════════════════════════════════════════════
// Routes, Areas, Tracks (unchanged)
// ══════════════════════════════════════════════════════════════

export type RouteStyle = 'solid' | 'dashed' | 'dotted';

export interface Route {
  id: string;
  points: [number, number][]; // [lng, lat] pairs
  style: RouteStyle;
  label: string;
  distanceMeters: number;
}

export interface DrawnArea {
  id: string;
  polygon: [number, number][]; // [lng, lat] ring
  label: string;
  areaAcres: number;
}

export interface HuntPlan {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  color: string;
  visible: boolean;
  parkingPoint: Waypoint | null;
  waypoints: Waypoint[];
  routes: Route[];
  areas: DrawnArea[];
  notes: string;
  /** Optional link to a Deer Camp — shared waypoints appear in camp map */
  linkedCampId?: string;
}

export interface TrackPoint {
  lat: number;
  lng: number;
  timestamp: number;
  altitude?: number;
  speed?: number;
}

export interface RecordedTrack {
  id: string;
  name: string;
  date: string;
  points: TrackPoint[];
  distanceMeters: number;
  durationSeconds: number;
  visible: boolean;
}

// ── Palette for auto-assigning plan colors ──
export const PLAN_COLORS = [
  '#E03C31', // MD Red
  '#0277BD', // Blue
  '#FFD700', // MD Gold
  '#6A1B9A', // Purple
  '#EF6C00', // Orange
  '#00695C', // Teal
  '#C62828', // Deep Red
  '#1565C0', // Royal Blue
  '#2E7D32', // Forest Green
  '#AD1457', // Pink
];

// ── Legacy WAYPOINT_ICONS map ──
// Kept for backward compatibility with AnnotationLayer and older components.
// New code should use HUNT_WAYPOINT_REGISTRY from huntWaypoints.ts.
import { getWaypointEntry, getWaypointLabel } from './huntWaypoints';
import { getIconGlyph } from '../components/icons/WaypointIcons';

/**
 * @deprecated Use HUNT_WAYPOINT_REGISTRY + getIconGlyph() instead.
 * This dynamically builds the old emoji map from the new registry.
 */
export const WAYPOINT_ICONS: Record<string, string> = (() => {
  const map: Record<string, string> = {};
  // Build from registry — use glyph symbols instead of emojis
  const types: HuntWaypointType[] = [
    'parking', 'stand', 'blind', 'camera', 'feeder', 'food_plot',
    'water_source', 'deer_crossing', 'buck_sign', 'custom',
    'buck', 'doe', 'shooter_buck', 'fawn', 'buck_bedding', 'doe_bedding',
    'scrape', 'shed', 'deer_tracks', 'deer_scat', 'travel_corridor', 'staging_area',
    'gobbler', 'hen', 'hen_nest', 'roosted_turkey', 'turkey_flock',
    'turkey_strut_zone', 'turkey_dust_bath', 'decoy_setup',
    'bear', 'bear_sign', 'bear_den', 'bear_trail',
    'coyote', 'fox', 'coyote_den', 'predator_sign',
    'rabbit', 'squirrel', 'pheasant', 'grouse',
    'duck', 'goose', 'waterfowl_roost', 'blind_spot_water',
    'sika_deer', 'sika_sign',
    'kill_site', 'blood_trail', 'shot_location', 'recovery_point',
    'prepped_tree', 'mineral_lick',
    'funnel', 'saddle', 'ridge', 'oak_flat', 'field_edge', 'thick_cover',
    'gate', 'camp_base', 'check_station', 'property_corner', 'danger_zone',
  ];
  types.forEach((t) => {
    const entry = getWaypointEntry(t);
    map[t] = getIconGlyph(entry.iconKey);
  });
  // Legacy aliases — map old names to new names
  map['food-plot'] = map['food_plot'] || '▧';
  map['water'] = map['water_source'] || '◙';
  map['crossing'] = map['deer_crossing'] || '⇌';
  map['sign'] = map['buck_sign'] || '∥';
  return map;
})();
