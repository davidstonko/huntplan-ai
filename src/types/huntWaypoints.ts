/**
 * Hunt Waypoint Types — Complete taxonomy for all huntable species and scouting features.
 *
 * Organized into categories for the waypoint picker UI.
 * Each type has a unique icon key, label, category, and color from the MD palette.
 * Replaces the old 10-type WaypointIcon system with 50+ specialized types.
 */

// ══════════════════════════════════════════════════════════════
// Waypoint Type Union
// ══════════════════════════════════════════════════════════════

export type HuntWaypointType =
  // ── Deer: Whitetail ──
  | 'buck'
  | 'doe'
  | 'shooter_buck'
  | 'fawn'
  | 'buck_bedding'
  | 'doe_bedding'
  | 'buck_sign'         // rub, rub line
  | 'scrape'
  | 'shed'
  | 'deer_tracks'
  | 'deer_scat'
  | 'deer_crossing'
  | 'travel_corridor'
  | 'staging_area'
  // ── Turkey ──
  | 'gobbler'
  | 'hen'
  | 'hen_nest'
  | 'roosted_turkey'
  | 'turkey_flock'
  | 'turkey_strut_zone'
  | 'turkey_dust_bath'
  | 'decoy_setup'
  // ── Bear ──
  | 'bear'
  | 'bear_sign'         // claw marks, scat, turned rocks
  | 'bear_den'
  | 'bear_trail'
  // ── Predator ──
  | 'coyote'
  | 'fox'
  | 'coyote_den'
  | 'predator_sign'     // tracks, scat, kills
  // ── Small Game ──
  | 'rabbit'
  | 'squirrel'
  | 'pheasant'
  | 'grouse'
  // ── Waterfowl ──
  | 'duck'
  | 'goose'
  | 'waterfowl_roost'
  | 'blind_spot_water'  // waterfowl blind location
  // ── Sika (MD Eastern Shore specialty) ──
  | 'sika_deer'
  | 'sika_sign'
  // ── Hunt Events ──
  | 'kill_site'
  | 'blood_trail'
  | 'shot_location'
  | 'recovery_point'
  // ── Infrastructure ──
  | 'stand'
  | 'blind'
  | 'prepped_tree'      // tree trimmed/prepped for hang-on or saddle
  | 'camera'
  | 'feeder'
  | 'food_plot'
  | 'mineral_lick'
  // ── Habitat & Terrain ──
  | 'water_source'
  | 'funnel'
  | 'saddle'
  | 'ridge'
  | 'oak_flat'
  | 'field_edge'
  | 'thick_cover'
  // ── Access & Logistics ──
  | 'parking'
  | 'gate'
  | 'camp_base'
  | 'check_station'
  | 'property_corner'
  | 'danger_zone'       // road, house, neighbor boundary
  // ── General ──
  | 'custom';

// ══════════════════════════════════════════════════════════════
// Waypoint Categories (for picker UI)
// ══════════════════════════════════════════════════════════════

export type WaypointCategory =
  | 'deer'
  | 'turkey'
  | 'bear'
  | 'predator'
  | 'small_game'
  | 'waterfowl'
  | 'sika'
  | 'hunt_events'
  | 'infrastructure'
  | 'habitat'
  | 'access'
  | 'general';

// ══════════════════════════════════════════════════════════════
// Icon Registry Entry
// ══════════════════════════════════════════════════════════════

export interface WaypointIconEntry {
  type: HuntWaypointType;
  label: string;
  shortLabel: string;        // 1-2 word label for map display
  category: WaypointCategory;
  /** SVG path key — maps to the icon component */
  iconKey: string;
  /** Primary color for the map marker (from MD palette) */
  color: string;
  /** Secondary color for the inner dot or icon fill */
  colorSecondary: string;
  /** Whether this type supports StandDetails (height, wind, etc.) */
  hasStandDetails: boolean;
  /** Sort order within category */
  sortOrder: number;
}

// ══════════════════════════════════════════════════════════════
// Category Metadata
// ══════════════════════════════════════════════════════════════

export interface WaypointCategoryMeta {
  id: WaypointCategory;
  label: string;
  color: string;
  sortOrder: number;
}

export const WAYPOINT_CATEGORIES: WaypointCategoryMeta[] = [
  { id: 'deer',           label: 'Deer',           color: '#8B7355', sortOrder: 0 },
  { id: 'turkey',         label: 'Turkey',          color: '#5C4033', sortOrder: 1 },
  { id: 'bear',           label: 'Bear',            color: '#1C1C1C', sortOrder: 2 },
  { id: 'predator',       label: 'Predator',        color: '#A44A3F', sortOrder: 3 },
  { id: 'small_game',     label: 'Small Game',      color: '#6B7F5E', sortOrder: 4 },
  { id: 'waterfowl',      label: 'Waterfowl',       color: '#1565C0', sortOrder: 5 },
  { id: 'sika',           label: 'Sika',            color: '#7A5C3E', sortOrder: 6 },
  { id: 'hunt_events',    label: 'Hunt Events',     color: '#E03C31', sortOrder: 7 },
  { id: 'infrastructure', label: 'Setup',           color: '#4A6741', sortOrder: 8 },
  { id: 'habitat',        label: 'Habitat',         color: '#2E7D32', sortOrder: 9 },
  { id: 'access',         label: 'Access',          color: '#D4913D', sortOrder: 10 },
  { id: 'general',        label: 'General',         color: '#6B6358', sortOrder: 11 },
];

// ══════════════════════════════════════════════════════════════
// Full Icon Registry
// ══════════════════════════════════════════════════════════════

/** MD Palette references */
const C = {
  oak:       '#8B7355',
  bark:      '#5C4033',
  tan:       '#C4A882',
  fawn:      '#D4B896',
  mdRed:     '#E03C31',
  mdGold:    '#FFD700',
  mdBlack:   '#1C1C1C',
  moss:      '#4A6741',
  sage:      '#6B7F5E',
  forest:    '#1B4332',
  amber:     '#D4913D',
  rust:      '#A44A3F',
  clay:      '#7A5C3E',
  blood:     '#8B0000',
  water:     '#1565C0',
  success:   '#6B9E5B',
  danger:    '#C75450',
  info:      '#5B7B8A',
  white:     '#F5F5DC',
  purple:    '#6A1B9A',
  orange:    '#EF6C00',
  teal:      '#00695C',
};

export const HUNT_WAYPOINT_REGISTRY: WaypointIconEntry[] = [
  // ── Deer ──
  { type: 'buck',             label: 'Buck Sighting',        shortLabel: 'Buck',       category: 'deer', iconKey: 'deer_antlers',    color: C.oak,     colorSecondary: C.fawn,   hasStandDetails: false, sortOrder: 0 },
  { type: 'doe',              label: 'Doe Sighting',         shortLabel: 'Doe',        category: 'deer', iconKey: 'deer_head',       color: C.tan,     colorSecondary: C.oak,    hasStandDetails: false, sortOrder: 1 },
  { type: 'shooter_buck',     label: 'Shooter Buck',         shortLabel: 'Shooter',    category: 'deer', iconKey: 'trophy_antlers',  color: C.mdGold,  colorSecondary: C.oak,    hasStandDetails: false, sortOrder: 2 },
  { type: 'fawn',             label: 'Fawn Sighting',        shortLabel: 'Fawn',       category: 'deer', iconKey: 'fawn',            color: C.fawn,    colorSecondary: C.tan,    hasStandDetails: false, sortOrder: 3 },
  { type: 'buck_bedding',     label: 'Buck Bedding',         shortLabel: 'Bed (B)',     category: 'deer', iconKey: 'bed_buck',        color: C.bark,    colorSecondary: C.oak,    hasStandDetails: false, sortOrder: 4 },
  { type: 'doe_bedding',      label: 'Doe Bedding',          shortLabel: 'Bed (D)',     category: 'deer', iconKey: 'bed_doe',         color: C.tan,     colorSecondary: C.bark,   hasStandDetails: false, sortOrder: 5 },
  { type: 'buck_sign',        label: 'Rub / Rub Line',       shortLabel: 'Rub',        category: 'deer', iconKey: 'tree_rub',        color: C.oak,     colorSecondary: C.bark,   hasStandDetails: false, sortOrder: 6 },
  { type: 'scrape',           label: 'Scrape',               shortLabel: 'Scrape',     category: 'deer', iconKey: 'scrape',          color: C.clay,    colorSecondary: C.bark,   hasStandDetails: false, sortOrder: 7 },
  { type: 'shed',             label: 'Shed Antler',          shortLabel: 'Shed',       category: 'deer', iconKey: 'antler_shed',     color: C.mdGold,  colorSecondary: C.tan,    hasStandDetails: false, sortOrder: 8 },
  { type: 'deer_tracks',      label: 'Deer Tracks',          shortLabel: 'Tracks',     category: 'deer', iconKey: 'hoof_print',      color: C.clay,    colorSecondary: C.oak,    hasStandDetails: false, sortOrder: 9 },
  { type: 'deer_scat',        label: 'Deer Scat',            shortLabel: 'Scat',       category: 'deer', iconKey: 'scat',            color: C.bark,    colorSecondary: C.clay,   hasStandDetails: false, sortOrder: 10 },
  { type: 'deer_crossing',    label: 'Deer Crossing',        shortLabel: 'Crossing',   category: 'deer', iconKey: 'crossing',        color: C.amber,   colorSecondary: C.oak,    hasStandDetails: false, sortOrder: 11 },
  { type: 'travel_corridor',  label: 'Travel Corridor',      shortLabel: 'Corridor',   category: 'deer', iconKey: 'trail_arrow',     color: C.moss,    colorSecondary: C.sage,   hasStandDetails: false, sortOrder: 12 },
  { type: 'staging_area',     label: 'Staging Area',         shortLabel: 'Staging',    category: 'deer', iconKey: 'staging',         color: C.amber,   colorSecondary: C.oak,    hasStandDetails: false, sortOrder: 13 },

  // ── Turkey ──
  { type: 'gobbler',          label: 'Gobbler',              shortLabel: 'Gobbler',    category: 'turkey', iconKey: 'turkey_gobbler', color: C.bark,    colorSecondary: C.mdRed,  hasStandDetails: false, sortOrder: 0 },
  { type: 'hen',              label: 'Hen',                  shortLabel: 'Hen',        category: 'turkey', iconKey: 'turkey_hen',     color: C.tan,     colorSecondary: C.bark,   hasStandDetails: false, sortOrder: 1 },
  { type: 'hen_nest',         label: 'Hen Nest',             shortLabel: 'Nest',       category: 'turkey', iconKey: 'nest',           color: C.tan,     colorSecondary: C.fawn,   hasStandDetails: false, sortOrder: 2 },
  { type: 'roosted_turkey',   label: 'Roosted Turkey',       shortLabel: 'Roost',      category: 'turkey', iconKey: 'roost_tree',     color: C.bark,    colorSecondary: C.moss,   hasStandDetails: false, sortOrder: 3 },
  { type: 'turkey_flock',     label: 'Turkey Flock',         shortLabel: 'Flock',      category: 'turkey', iconKey: 'flock',          color: C.bark,    colorSecondary: C.tan,    hasStandDetails: false, sortOrder: 4 },
  { type: 'turkey_strut_zone',label: 'Strut Zone',           shortLabel: 'Strut',      category: 'turkey', iconKey: 'strut_zone',     color: C.mdRed,   colorSecondary: C.bark,   hasStandDetails: false, sortOrder: 5 },
  { type: 'turkey_dust_bath', label: 'Dust Bath',            shortLabel: 'Dust',       category: 'turkey', iconKey: 'dust_bath',      color: C.clay,    colorSecondary: C.tan,    hasStandDetails: false, sortOrder: 6 },
  { type: 'decoy_setup',      label: 'Decoy Setup Spot',     shortLabel: 'Decoy',      category: 'turkey', iconKey: 'decoy',          color: C.moss,    colorSecondary: C.sage,   hasStandDetails: false, sortOrder: 7 },

  // ── Bear ──
  { type: 'bear',             label: 'Bear Sighting',        shortLabel: 'Bear',       category: 'bear', iconKey: 'bear_paw',        color: C.mdBlack, colorSecondary: C.bark,   hasStandDetails: false, sortOrder: 0 },
  { type: 'bear_sign',        label: 'Bear Sign',            shortLabel: 'Sign',       category: 'bear', iconKey: 'claw_marks',      color: C.bark,    colorSecondary: C.mdBlack,hasStandDetails: false, sortOrder: 1 },
  { type: 'bear_den',         label: 'Bear Den',             shortLabel: 'Den',        category: 'bear', iconKey: 'den',             color: C.mdBlack, colorSecondary: C.clay,   hasStandDetails: false, sortOrder: 2 },
  { type: 'bear_trail',       label: 'Bear Trail',           shortLabel: 'Trail',      category: 'bear', iconKey: 'bear_trail',      color: C.bark,    colorSecondary: C.clay,   hasStandDetails: false, sortOrder: 3 },

  // ── Predator ──
  { type: 'coyote',           label: 'Coyote',               shortLabel: 'Coyote',     category: 'predator', iconKey: 'coyote',      color: C.rust,    colorSecondary: C.tan,    hasStandDetails: false, sortOrder: 0 },
  { type: 'fox',              label: 'Fox',                  shortLabel: 'Fox',        category: 'predator', iconKey: 'fox',          color: C.orange,  colorSecondary: C.fawn,   hasStandDetails: false, sortOrder: 1 },
  { type: 'coyote_den',       label: 'Coyote Den',           shortLabel: 'Den',        category: 'predator', iconKey: 'den',          color: C.rust,    colorSecondary: C.clay,   hasStandDetails: false, sortOrder: 2 },
  { type: 'predator_sign',    label: 'Predator Sign',        shortLabel: 'Sign',       category: 'predator', iconKey: 'predator_track',color: C.rust,   colorSecondary: C.bark,   hasStandDetails: false, sortOrder: 3 },

  // ── Small Game ──
  { type: 'rabbit',           label: 'Rabbit',               shortLabel: 'Rabbit',     category: 'small_game', iconKey: 'rabbit',     color: C.tan,     colorSecondary: C.fawn,   hasStandDetails: false, sortOrder: 0 },
  { type: 'squirrel',         label: 'Squirrel',             shortLabel: 'Squirrel',   category: 'small_game', iconKey: 'squirrel',   color: C.sage,    colorSecondary: C.moss,   hasStandDetails: false, sortOrder: 1 },
  { type: 'pheasant',         label: 'Pheasant',             shortLabel: 'Pheasant',   category: 'small_game', iconKey: 'pheasant',   color: C.oak,     colorSecondary: C.mdRed,  hasStandDetails: false, sortOrder: 2 },
  { type: 'grouse',           label: 'Grouse',               shortLabel: 'Grouse',     category: 'small_game', iconKey: 'grouse',     color: C.bark,    colorSecondary: C.sage,   hasStandDetails: false, sortOrder: 3 },

  // ── Waterfowl ──
  { type: 'duck',             label: 'Duck',                 shortLabel: 'Duck',       category: 'waterfowl', iconKey: 'duck',        color: C.water,   colorSecondary: C.teal,   hasStandDetails: false, sortOrder: 0 },
  { type: 'goose',            label: 'Goose',                shortLabel: 'Goose',      category: 'waterfowl', iconKey: 'goose',       color: C.water,   colorSecondary: C.info,   hasStandDetails: false, sortOrder: 1 },
  { type: 'waterfowl_roost',  label: 'Waterfowl Roost',      shortLabel: 'Roost',      category: 'waterfowl', iconKey: 'water_roost', color: C.water,   colorSecondary: C.moss,   hasStandDetails: false, sortOrder: 2 },
  { type: 'blind_spot_water', label: 'Blind Spot (Water)',    shortLabel: 'Blind',      category: 'waterfowl', iconKey: 'water_blind', color: C.teal,    colorSecondary: C.water,  hasStandDetails: false, sortOrder: 3 },

  // ── Sika ──
  { type: 'sika_deer',        label: 'Sika Deer',            shortLabel: 'Sika',       category: 'sika', iconKey: 'sika',            color: C.clay,    colorSecondary: C.bark,   hasStandDetails: false, sortOrder: 0 },
  { type: 'sika_sign',        label: 'Sika Sign',            shortLabel: 'Sign',       category: 'sika', iconKey: 'sika_sign',       color: C.clay,    colorSecondary: C.oak,    hasStandDetails: false, sortOrder: 1 },

  // ── Hunt Events ──
  { type: 'kill_site',        label: 'Kill / Recovery Site',  shortLabel: 'Kill',       category: 'hunt_events', iconKey: 'crosshair', color: C.mdRed,   colorSecondary: C.blood,  hasStandDetails: false, sortOrder: 0 },
  { type: 'blood_trail',      label: 'Blood Trail',           shortLabel: 'Blood',      category: 'hunt_events', iconKey: 'blood_drop',color: C.blood,   colorSecondary: C.mdRed,  hasStandDetails: false, sortOrder: 1 },
  { type: 'shot_location',    label: 'Shot Location',         shortLabel: 'Shot',       category: 'hunt_events', iconKey: 'target',    color: C.mdRed,   colorSecondary: C.danger, hasStandDetails: false, sortOrder: 2 },
  { type: 'recovery_point',   label: 'Recovery Point',        shortLabel: 'Recovery',   category: 'hunt_events', iconKey: 'flag',      color: C.success, colorSecondary: C.moss,   hasStandDetails: false, sortOrder: 3 },

  // ── Infrastructure ──
  { type: 'stand',            label: 'Tree Stand',            shortLabel: 'Stand',      category: 'infrastructure', iconKey: 'tree_stand',  color: C.moss,    colorSecondary: C.forest, hasStandDetails: true,  sortOrder: 0 },
  { type: 'blind',            label: 'Ground Blind',          shortLabel: 'Blind',      category: 'infrastructure', iconKey: 'ground_blind',color: C.sage,    colorSecondary: C.moss,   hasStandDetails: true,  sortOrder: 1 },
  { type: 'prepped_tree',     label: 'Prepped Tree',          shortLabel: 'Prepped',    category: 'infrastructure', iconKey: 'prepped_tree',color: C.moss,    colorSecondary: C.bark,   hasStandDetails: true,  sortOrder: 2 },
  { type: 'camera',           label: 'Trail Camera',          shortLabel: 'Cam',        category: 'infrastructure', iconKey: 'trail_cam',   color: C.sage,    colorSecondary: C.moss,   hasStandDetails: false, sortOrder: 3 },
  { type: 'feeder',           label: 'Feeder',                shortLabel: 'Feeder',     category: 'infrastructure', iconKey: 'feeder',      color: C.amber,   colorSecondary: C.oak,    hasStandDetails: false, sortOrder: 4 },
  { type: 'food_plot',        label: 'Food Plot',             shortLabel: 'Plot',       category: 'infrastructure', iconKey: 'food_plot',   color: C.success, colorSecondary: C.moss,   hasStandDetails: false, sortOrder: 5 },
  { type: 'mineral_lick',     label: 'Mineral Lick',          shortLabel: 'Mineral',    category: 'infrastructure', iconKey: 'mineral',     color: C.clay,    colorSecondary: C.tan,    hasStandDetails: false, sortOrder: 6 },

  // ── Habitat ──
  { type: 'water_source',     label: 'Water Source',          shortLabel: 'Water',      category: 'habitat', iconKey: 'water_drop',   color: C.water,   colorSecondary: C.info,   hasStandDetails: false, sortOrder: 0 },
  { type: 'funnel',           label: 'Funnel / Pinch Point',  shortLabel: 'Funnel',     category: 'habitat', iconKey: 'funnel',       color: C.moss,    colorSecondary: C.sage,   hasStandDetails: false, sortOrder: 1 },
  { type: 'saddle',           label: 'Saddle',                shortLabel: 'Saddle',     category: 'habitat', iconKey: 'saddle',       color: C.oak,     colorSecondary: C.bark,   hasStandDetails: false, sortOrder: 2 },
  { type: 'ridge',            label: 'Ridge',                 shortLabel: 'Ridge',      category: 'habitat', iconKey: 'ridge',        color: C.bark,    colorSecondary: C.oak,    hasStandDetails: false, sortOrder: 3 },
  { type: 'oak_flat',         label: 'Oak Flat / Mast',       shortLabel: 'Oak',        category: 'habitat', iconKey: 'acorn',        color: C.oak,     colorSecondary: C.tan,    hasStandDetails: false, sortOrder: 4 },
  { type: 'field_edge',       label: 'Field Edge',            shortLabel: 'Edge',       category: 'habitat', iconKey: 'field_edge',   color: C.sage,    colorSecondary: C.moss,   hasStandDetails: false, sortOrder: 5 },
  { type: 'thick_cover',      label: 'Thick Cover',           shortLabel: 'Cover',      category: 'habitat', iconKey: 'thick_brush',  color: C.forest,  colorSecondary: C.moss,   hasStandDetails: false, sortOrder: 6 },

  // ── Access ──
  { type: 'parking',          label: 'Parking',               shortLabel: 'Park',       category: 'access', iconKey: 'parking_p',    color: C.amber,   colorSecondary: C.oak,    hasStandDetails: false, sortOrder: 0 },
  { type: 'gate',             label: 'Gate / Access Point',   shortLabel: 'Gate',       category: 'access', iconKey: 'gate',         color: C.amber,   colorSecondary: C.rust,   hasStandDetails: false, sortOrder: 1 },
  { type: 'camp_base',        label: 'Camp / Base',           shortLabel: 'Camp',       category: 'access', iconKey: 'tent',         color: C.moss,    colorSecondary: C.sage,   hasStandDetails: false, sortOrder: 2 },
  { type: 'check_station',    label: 'Check Station',         shortLabel: 'Check',      category: 'access', iconKey: 'clipboard',    color: C.amber,   colorSecondary: C.mdGold, hasStandDetails: false, sortOrder: 3 },
  { type: 'property_corner',  label: 'Property Corner',       shortLabel: 'Corner',     category: 'access', iconKey: 'corner_flag',  color: C.danger,  colorSecondary: C.rust,   hasStandDetails: false, sortOrder: 4 },
  { type: 'danger_zone',      label: 'Danger / No-Go Zone',   shortLabel: 'Danger',     category: 'access', iconKey: 'warning',      color: C.danger,  colorSecondary: C.mdRed,  hasStandDetails: false, sortOrder: 5 },

  // ── General ──
  { type: 'custom',           label: 'Custom Pin',            shortLabel: 'Pin',        category: 'general', iconKey: 'pin',         color: C.info,    colorSecondary: C.sage,   hasStandDetails: false, sortOrder: 0 },
];

// ══════════════════════════════════════════════════════════════
// Lookup Helpers
// ══════════════════════════════════════════════════════════════

const _registryMap = new Map<HuntWaypointType, WaypointIconEntry>();
HUNT_WAYPOINT_REGISTRY.forEach((entry) => _registryMap.set(entry.type, entry));

/** Get a waypoint entry by type. Fallback to 'custom' if not found. */
export function getWaypointEntry(type: HuntWaypointType): WaypointIconEntry {
  return _registryMap.get(type) || _registryMap.get('custom')!;
}

/** Get all waypoints in a category, sorted by sortOrder. */
export function getWaypointsByCategory(category: WaypointCategory): WaypointIconEntry[] {
  return HUNT_WAYPOINT_REGISTRY
    .filter((e) => e.category === category)
    .sort((a, b) => a.sortOrder - b.sortOrder);
}

/** Get categories that have at least one waypoint, sorted. */
export function getActiveCategories(): WaypointCategoryMeta[] {
  const active = new Set(HUNT_WAYPOINT_REGISTRY.map((e) => e.category));
  return WAYPOINT_CATEGORIES.filter((c) => active.has(c.id)).sort((a, b) => a.sortOrder - b.sortOrder);
}

/** Get the label for a waypoint type. */
export function getWaypointLabel(type: HuntWaypointType): string {
  return getWaypointEntry(type).label;
}

/** Get the map color for a waypoint type. */
export function getWaypointColor(type: HuntWaypointType): string {
  return getWaypointEntry(type).color;
}

/** Total count of all waypoint types. */
export const TOTAL_WAYPOINT_TYPES = HUNT_WAYPOINT_REGISTRY.length;
