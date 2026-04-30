/**
 * User Waypoint — Personal-Layer Types Module (V2.3 expansion, Phase A.1)
 *
 * A UserWaypoint is a pin the user places on their own map, in any mode
 * (Hunt / Fish / Camp / Hike). This is distinct from:
 *   - `Waypoint` in `scout.ts`, which is plan-scoped and hunt-specific
 *     (belongs to a `HuntPlan`, rendered inside the Scout tab surface).
 *   - `SharedAnnotation` in `deercamp.ts`, which is a camp-group-visible
 *     annotation owned by a DeerCamp and color-coded per member.
 *
 * UserWaypoints are the OnX-Hunt-"Markup" / AllTrails-"Saved Locations"
 * equivalent: personal, private by default, persists on-device via
 * AsyncStorage, and serves as the anchor for Phase B scent-cone rendering
 * (a tree-stand waypoint is what the wind-overlay cone projects from).
 *
 * Categories are mode-aware. A fishing hole and a tree stand are not the
 * same thing and should not share an icon set. See CATEGORY_META for the
 * per-category letter code + display label + default color the UI uses.
 *
 * Coordinate convention: latitude/longitude stored as `lat` / `lng` named
 * fields (NOT the GeoJSON `[lng, lat]` tuple). This matches the pattern
 * used by scout.Waypoint and deercamp.CampNote so the three pin types can
 * share rendering helpers without per-type adapters.
 *
 * Added 2026-04-24 per V2_3_FEATURE_EXPANSION_PLAN §3 / Phase A.1.
 */

/**
 * Which mode's map surface a waypoint belongs to.
 *
 * Must match the activity-mode values used by ActivityModeContext so a
 * waypoint created on the Hunt map is only surfaced on the Hunt map.
 */
export type WaypointMode = 'hunt' | 'fish' | 'camp' | 'hike';

/**
 * Hunt-mode categories. Names are intentionally more specific than
 * scout's WaypointIcon — "trail-cam" rather than "camera", "blood-trail"
 * as its own category, "buck-sighting" distinct from sign-in-general.
 */
export type HuntWaypointCategory =
  | 'tree-stand'
  | 'ground-blind'
  | 'trail-cam'
  | 'rub'
  | 'scrape'
  | 'buck-sighting'
  | 'blood-trail'
  | 'parking'
  | 'other';

/**
 * Fish-mode categories.
 */
export type FishWaypointCategory =
  | 'hole'
  | 'ramp'
  | 'put-in'
  | 'take-out'
  | 'snag'
  | 'structure'
  | 'parking'
  | 'other';

/**
 * Camp-mode categories. Distinct from the DeerCamp-shared annotation
 * categories — these are personal camp-planning marks (where I want my
 * tent, where the firepit should go) and can live inside a DeerCamp
 * area or outside it.
 */
export type CampWaypointCategory =
  | 'tent'
  | 'firepit'
  | 'water-source'
  | 'latrine'
  | 'bear-box'
  | 'parking'
  | 'other';

/**
 * Hike-mode categories.
 */
export type HikeWaypointCategory =
  | 'landmark'
  | 'view'
  | 'water'
  | 'campsite'
  | 'hazard'
  | 'trailhead'
  | 'parking'
  | 'other';

/**
 * Discriminated union of all category values, across modes.
 * Callers that need a single-mode category should prefer the per-mode
 * type for narrower type safety.
 */
export type WaypointCategory =
  | HuntWaypointCategory
  | FishWaypointCategory
  | CampWaypointCategory
  | HikeWaypointCategory;

/**
 * A single personal waypoint.
 *
 * `mode` + `category` together determine rendering (icon letter, color,
 * tap-to-open screen). `photoUris` holds local file URIs picked via the
 * existing imagePicker service; cloud photo upload is deferred to Phase
 * C when user accounts graduate past username-only.
 *
 * @property {string}   id          UUID-like unique identifier
 * @property {string}   createdAt   ISO 8601 creation timestamp
 * @property {string}   updatedAt   ISO 8601 last-mutation timestamp
 * @property {WaypointMode}    mode     Which mode's map this belongs to
 * @property {WaypointCategory} category Category within the mode
 * @property {string}   title       Short display name ("Stand A", "Chesapeake rockfish hole")
 * @property {string}   notes       Free-form user notes
 * @property {number}   lat         Latitude in decimal degrees
 * @property {number}   lng         Longitude in decimal degrees
 * @property {string[]} photoUris   Attached local photo URIs (may be empty)
 * @property {string}   [colorOverride] Optional hex override; falls back to CATEGORY_META default
 */
export interface UserWaypoint {
  id: string;
  createdAt: string;
  updatedAt: string;
  mode: WaypointMode;
  category: WaypointCategory;
  title: string;
  notes: string;
  lat: number;
  lng: number;
  photoUris: string[];
  colorOverride?: string;
}

/**
 * Metadata for rendering and authoring a single waypoint category.
 *
 * - `label` is the human-readable form shown in pickers and list rows.
 * - `letterCode` is the 1–3 character abbreviation shown inside the
 *   colored pin on the map (matches the Scout convention from
 *   WAYPOINT_ICONS in scout.ts — keeps the visual language consistent
 *   across plan waypoints and personal waypoints).
 * - `defaultColor` is the hex color for the pin fill when the user
 *   hasn't set a `colorOverride`. Colors are mode-themed: red hues for
 *   Hunt, blue for Fish, brown for Camp, green for Hike.
 * - `mode` is the mode this category belongs to. Used to filter the
 *   category picker in the edit screen.
 */
export interface WaypointCategoryMeta {
  label: string;
  letterCode: string;
  defaultColor: string;
  mode: WaypointMode;
}

/**
 * Full per-category metadata table. Exhaustive over every category in
 * every mode. Centralizing this so UI screens, list rows, map pins, and
 * category pickers all pull from the same source of truth.
 */
export const CATEGORY_META: Record<WaypointCategory, WaypointCategoryMeta> = {
  // Hunt
  'tree-stand':     { label: 'Tree Stand',    letterCode: 'ST',  defaultColor: '#C62828', mode: 'hunt' },
  'ground-blind':   { label: 'Ground Blind',  letterCode: 'BL',  defaultColor: '#AD1457', mode: 'hunt' },
  'trail-cam':      { label: 'Trail Cam',     letterCode: 'CAM', defaultColor: '#EF6C00', mode: 'hunt' },
  'rub':            { label: 'Rub',           letterCode: 'RB',  defaultColor: '#8B4513', mode: 'hunt' },
  'scrape':         { label: 'Scrape',        letterCode: 'SC',  defaultColor: '#6D4C41', mode: 'hunt' },
  'buck-sighting':  { label: 'Buck Sighting', letterCode: 'BS',  defaultColor: '#E03C31', mode: 'hunt' },
  'blood-trail':    { label: 'Blood Trail',   letterCode: 'BT',  defaultColor: '#B71C1C', mode: 'hunt' },
  // Fish
  'hole':           { label: 'Hole',          letterCode: 'H',   defaultColor: '#0277BD', mode: 'fish' },
  'ramp':           { label: 'Ramp',          letterCode: 'RMP', defaultColor: '#1565C0', mode: 'fish' },
  'put-in':         { label: 'Put-In',        letterCode: 'PI',  defaultColor: '#0288D1', mode: 'fish' },
  'take-out':       { label: 'Take-Out',      letterCode: 'TO',  defaultColor: '#0097A7', mode: 'fish' },
  'snag':           { label: 'Snag',          letterCode: 'SN',  defaultColor: '#455A64', mode: 'fish' },
  'structure':      { label: 'Structure',     letterCode: 'STR', defaultColor: '#546E7A', mode: 'fish' },
  // Camp
  'tent':           { label: 'Tent',          letterCode: 'TNT', defaultColor: '#6D4C41', mode: 'camp' },
  'firepit':        { label: 'Firepit',       letterCode: 'FP',  defaultColor: '#BF360C', mode: 'camp' },
  'water-source':   { label: 'Water Source',  letterCode: 'WS',  defaultColor: '#00695C', mode: 'camp' },
  'latrine':        { label: 'Latrine',       letterCode: 'LAT', defaultColor: '#4E342E', mode: 'camp' },
  'bear-box':       { label: 'Bear Box',      letterCode: 'BB',  defaultColor: '#5D4037', mode: 'camp' },
  // Hike
  'landmark':       { label: 'Landmark',      letterCode: 'LM',  defaultColor: '#2E7D32', mode: 'hike' },
  'view':           { label: 'View',          letterCode: 'VW',  defaultColor: '#388E3C', mode: 'hike' },
  'water':          { label: 'Water',         letterCode: 'W',   defaultColor: '#00838F', mode: 'hike' },
  'campsite':       { label: 'Campsite',      letterCode: 'CS',  defaultColor: '#558B2F', mode: 'hike' },
  'hazard':         { label: 'Hazard',        letterCode: 'HZ',  defaultColor: '#D84315', mode: 'hike' },
  'trailhead':      { label: 'Trailhead',     letterCode: 'TH',  defaultColor: '#33691E', mode: 'hike' },
  // Cross-mode
  'parking':        { label: 'Parking',       letterCode: 'P',   defaultColor: '#424242', mode: 'hunt' },
  'other':          { label: 'Other',         letterCode: 'PIN', defaultColor: '#616161', mode: 'hunt' },
};

/**
 * Categories available for a given mode. Used by the category-picker
 * UI in WaypointEditScreen. Ordered so the most-common categories for
 * the mode appear first.
 *
 * Note: `parking` and `other` are duplicated across modes because all
 * four activities can reasonably use them. CATEGORY_META records a
 * single canonical `mode` for these shared categories (hunt) but the
 * picker surfaces them regardless.
 */
export const CATEGORIES_BY_MODE: Record<WaypointMode, WaypointCategory[]> = {
  hunt: [
    'tree-stand',
    'ground-blind',
    'trail-cam',
    'rub',
    'scrape',
    'buck-sighting',
    'blood-trail',
    'parking',
    'other',
  ],
  fish: [
    'hole',
    'ramp',
    'put-in',
    'take-out',
    'snag',
    'structure',
    'parking',
    'other',
  ],
  camp: [
    'tent',
    'firepit',
    'water-source',
    'latrine',
    'bear-box',
    'parking',
    'other',
  ],
  hike: [
    'landmark',
    'view',
    'water',
    'campsite',
    'hazard',
    'trailhead',
    'parking',
    'other',
  ],
};

/**
 * Resolve the display color for a waypoint. Honors `colorOverride` if
 * set, else falls back to the category's default color.
 */
export function resolveWaypointColor(wp: UserWaypoint): string {
  if (wp.colorOverride && wp.colorOverride.startsWith('#')) return wp.colorOverride;
  const meta = CATEGORY_META[wp.category];
  return meta ? meta.defaultColor : '#616161';
}

/**
 * Resolve the letter code shown inside the pin for a waypoint.
 * Delegates to CATEGORY_META; falls back to 'PIN' for unknown categories
 * (defensive — new categories added to the type union without a META
 * entry would otherwise produce `undefined` at runtime).
 */
export function resolveWaypointLetterCode(wp: UserWaypoint): string {
  const meta = CATEGORY_META[wp.category];
  return meta ? meta.letterCode : 'PIN';
}
