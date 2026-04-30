/**
 * Fish/Boat/Crab Waypoint Types — Complete taxonomy for Maryland & Chesapeake Bay.
 *
 * Organized into categories for the waypoint picker UI in Fish mode.
 * Covers: major sport fish species, structure/cover, water features,
 * crabbing operations, boating infrastructure, and fishing events.
 *
 * Mirrors the hunt waypoint pattern (huntWaypoints.ts) with the same
 * icon registry, category, and helper function architecture.
 */

// ══════════════════════════════════════════════════════════════
// Fish Waypoint Type Union
// ══════════════════════════════════════════════════════════════

export type FishWaypointType =
  // ── Chesapeake Sport Fish ──
  | 'striped_bass'       // Rockfish — THE Chesapeake species
  | 'largemouth_bass'
  | 'smallmouth_bass'
  | 'blue_catfish'
  | 'channel_catfish'
  | 'white_perch'
  | 'yellow_perch'
  | 'crappie'
  | 'bluegill'           // panfish
  | 'walleye'
  | 'northern_pike'
  | 'chain_pickerel'
  | 'brook_trout'
  | 'brown_trout'
  | 'rainbow_trout'
  | 'shad'               // American & hickory shad
  | 'snakehead'
  | 'carp'
  // ── Saltwater / Bay Sport Fish ──
  | 'bluefish'
  | 'flounder'
  | 'red_drum'
  | 'speckled_trout'     // spotted seatrout
  | 'croaker'
  | 'spot'
  | 'white_marlin'
  | 'tuna'
  | 'mahi_mahi'
  | 'cobia'
  | 'tautog'             // blackfish
  | 'sea_bass'
  // ── Structure & Cover ──
  | 'submerged_timber'
  | 'rock_pile'
  | 'brush_pile'
  | 'laydown'
  | 'stump_field'
  | 'grass_bed'
  | 'lily_pads'
  | 'riprap'
  | 'dock'
  | 'bridge_piling'
  | 'seawall'
  | 'jetty'
  | 'oyster_bar'
  | 'artificial_reef'
  | 'mussel_bed'
  // ── Water Features ──
  | 'deep_hole'
  | 'drop_off'
  | 'channel'
  | 'current_break'
  | 'eddy'
  | 'riffle'
  | 'shoal'
  | 'sandbar'
  | 'tidal_flat'
  | 'spring'
  | 'confluence'
  | 'tailwater'
  | 'thermocline'
  | 'creek_mouth'
  // ── Fishing Intel ──
  | 'honey_spot'         // proven productive spot
  | 'bait_school'
  | 'trolling_lane'
  | 'drift_line'
  | 'anchor_point'
  | 'cast_zone'
  | 'spawning_area'
  | 'feeding_lane'
  | 'fish_kill'          // observed die-off (water quality)
  | 'stocking_site'      // DNR trout/fish stocking location
  // ── Crabbing ──
  | 'crab_pot_mine'      // where I dropped my pots
  | 'crab_pot_others'    // observed other peoples' pots
  | 'crab_trotline'      // trotline location
  | 'crab_handline'      // handline / chicken-neck spot
  | 'crab_trap_area'     // general crab trap zone
  | 'crab_shedder'       // peeler/shedder operation
  | 'crab_catch_spot'    // proven crabbing spot
  | 'crab_pot_pull'      // pull/check point for a pot run
  // ── Boating & Navigation ──
  | 'boat_ramp'
  | 'marina'
  | 'fuel_dock'
  | 'anchorage'
  | 'mooring'
  | 'no_wake_zone'
  | 'shallow_hazard'
  | 'channel_marker'
  | 'speed_limit'
  | 'restricted_area'
  | 'pump_out'           // sewage pump-out station
  | 'boat_washdown'
  // ── Fishing Events ──
  | 'catch_photo'        // catch with photo
  | 'personal_best'      // PB catch
  | 'bait_depth_note'    // bait + depth + success
  | 'tournament_spot'    // tournament-related mark
  // ── Access & Logistics ──
  | 'parking'
  | 'fish_cleaning'      // cleaning station
  | 'bait_shop'
  | 'weigh_station'
  | 'kayak_launch'
  | 'wade_access'
  // ── General ──
  | 'custom_fish';

// ══════════════════════════════════════════════════════════════
// Fish Waypoint Categories (for picker UI)
// ══════════════════════════════════════════════════════════════

export type FishWaypointCategory =
  | 'freshwater_fish'
  | 'saltwater_fish'
  | 'structure'
  | 'water_features'
  | 'fishing_intel'
  | 'crabbing'
  | 'boating'
  | 'fish_events'
  | 'fish_access'
  | 'general_fish';

// ══════════════════════════════════════════════════════════════
// Icon Registry Entry
// ══════════════════════════════════════════════════════════════

export interface FishWaypointIconEntry {
  type: FishWaypointType;
  label: string;
  shortLabel: string;
  category: FishWaypointCategory;
  iconKey: string;
  color: string;
  colorSecondary: string;
  sortOrder: number;
}

// ══════════════════════════════════════════════════════════════
// Category Metadata
// ══════════════════════════════════════════════════════════════

export interface FishWaypointCategoryMeta {
  id: FishWaypointCategory;
  label: string;
  color: string;
  sortOrder: number;
}

export const FISH_WAYPOINT_CATEGORIES: FishWaypointCategoryMeta[] = [
  { id: 'freshwater_fish', label: 'Freshwater',   color: '#1565C0', sortOrder: 0 },
  { id: 'saltwater_fish',  label: 'Saltwater',    color: '#00695C', sortOrder: 1 },
  { id: 'structure',       label: 'Structure',    color: '#795548', sortOrder: 2 },
  { id: 'water_features',  label: 'Water',        color: '#0277BD', sortOrder: 3 },
  { id: 'fishing_intel',   label: 'Intel',        color: '#EF6C00', sortOrder: 4 },
  { id: 'crabbing',        label: 'Crabbing',     color: '#E03C31', sortOrder: 5 },
  { id: 'boating',         label: 'Boating',      color: '#37474F', sortOrder: 6 },
  { id: 'fish_events',     label: 'Events',       color: '#FFD700', sortOrder: 7 },
  { id: 'fish_access',     label: 'Access',       color: '#D4913D', sortOrder: 8 },
  { id: 'general_fish',    label: 'General',      color: '#6B6358', sortOrder: 9 },
];

// ══════════════════════════════════════════════════════════════
// Color Palette (water-themed MD palette)
// ══════════════════════════════════════════════════════════════

const F = {
  water:      '#1565C0',
  waterLight: '#42A5F5',
  teal:       '#00695C',
  tealLight:  '#26A69A',
  bay:        '#0277BD',
  mdRed:      '#E03C31',
  mdGold:     '#FFD700',
  amber:      '#D4913D',
  orange:     '#EF6C00',
  bark:       '#795548',
  barkLight:  '#8D6E63',
  clay:       '#7A5C3E',
  slate:      '#37474F',
  slateLight: '#546E7A',
  moss:       '#4A6741',
  sage:       '#6B7F5E',
  success:    '#6B9E5B',
  danger:     '#C75450',
  blood:      '#8B0000',
  silver:     '#90A4AE',
  sand:       '#DEC5A0',
  purple:     '#6A1B9A',
  info:       '#5B7B8A',
  muted:      '#6B6358',
  forest:     '#1B4332',
  brass:      '#B5A642',
};

// ══════════════════════════════════════════════════════════════
// Full Fish Icon Registry
// ══════════════════════════════════════════════════════════════

export const FISH_WAYPOINT_REGISTRY: FishWaypointIconEntry[] = [
  // ── Freshwater Sport Fish ──
  { type: 'striped_bass',      label: 'Striped Bass (Rockfish)',  shortLabel: 'Striper',    category: 'freshwater_fish', iconKey: 'fish_stripe',   color: F.water,     colorSecondary: F.silver,    sortOrder: 0 },
  { type: 'largemouth_bass',   label: 'Largemouth Bass',         shortLabel: 'LMB',        category: 'freshwater_fish', iconKey: 'fish_bass',     color: F.moss,      colorSecondary: F.sage,      sortOrder: 1 },
  { type: 'smallmouth_bass',   label: 'Smallmouth Bass',         shortLabel: 'SMB',        category: 'freshwater_fish', iconKey: 'fish_bass',     color: F.bark,      colorSecondary: F.clay,      sortOrder: 2 },
  { type: 'blue_catfish',      label: 'Blue Catfish',            shortLabel: 'Blue Cat',   category: 'freshwater_fish', iconKey: 'fish_cat',      color: F.slate,     colorSecondary: F.slateLight,sortOrder: 3 },
  { type: 'channel_catfish',   label: 'Channel Catfish',         shortLabel: 'Ch. Cat',    category: 'freshwater_fish', iconKey: 'fish_cat',      color: F.clay,      colorSecondary: F.bark,      sortOrder: 4 },
  { type: 'white_perch',       label: 'White Perch',             shortLabel: 'Wh Perch',   category: 'freshwater_fish', iconKey: 'fish_perch',    color: F.silver,    colorSecondary: F.water,     sortOrder: 5 },
  { type: 'yellow_perch',      label: 'Yellow Perch',            shortLabel: 'Yl Perch',   category: 'freshwater_fish', iconKey: 'fish_perch',    color: F.mdGold,    colorSecondary: F.amber,     sortOrder: 6 },
  { type: 'crappie',           label: 'Crappie',                 shortLabel: 'Crappie',    category: 'freshwater_fish', iconKey: 'fish_panfish',  color: F.slateLight,colorSecondary: F.silver,    sortOrder: 7 },
  { type: 'bluegill',          label: 'Bluegill / Panfish',      shortLabel: 'Bluegill',   category: 'freshwater_fish', iconKey: 'fish_panfish',  color: F.water,     colorSecondary: F.mdGold,    sortOrder: 8 },
  { type: 'walleye',           label: 'Walleye',                 shortLabel: 'Walleye',    category: 'freshwater_fish', iconKey: 'fish_walleye',  color: F.amber,     colorSecondary: F.sand,      sortOrder: 9 },
  { type: 'northern_pike',     label: 'Northern Pike',           shortLabel: 'Pike',       category: 'freshwater_fish', iconKey: 'fish_pike',     color: F.moss,      colorSecondary: F.forest,    sortOrder: 10 },
  { type: 'chain_pickerel',    label: 'Chain Pickerel',          shortLabel: 'Pickerel',   category: 'freshwater_fish', iconKey: 'fish_pike',     color: F.sage,      colorSecondary: F.moss,      sortOrder: 11 },
  { type: 'brook_trout',       label: 'Brook Trout',             shortLabel: 'Brookie',    category: 'freshwater_fish', iconKey: 'fish_trout',    color: F.teal,      colorSecondary: F.mdRed,     sortOrder: 12 },
  { type: 'brown_trout',       label: 'Brown Trout',             shortLabel: 'Brown',      category: 'freshwater_fish', iconKey: 'fish_trout',    color: F.bark,      colorSecondary: F.amber,     sortOrder: 13 },
  { type: 'rainbow_trout',     label: 'Rainbow Trout',           shortLabel: 'Rainbow',    category: 'freshwater_fish', iconKey: 'fish_trout',    color: F.purple,    colorSecondary: F.waterLight, sortOrder: 14 },
  { type: 'shad',              label: 'Shad (American/Hickory)', shortLabel: 'Shad',       category: 'freshwater_fish', iconKey: 'fish_shad',     color: F.silver,    colorSecondary: F.water,     sortOrder: 15 },
  { type: 'snakehead',         label: 'Snakehead',               shortLabel: 'Snake',      category: 'freshwater_fish', iconKey: 'fish_snake',    color: F.forest,    colorSecondary: F.moss,      sortOrder: 16 },
  { type: 'carp',              label: 'Carp',                    shortLabel: 'Carp',       category: 'freshwater_fish', iconKey: 'fish_carp',     color: F.brass,     colorSecondary: F.clay,      sortOrder: 17 },

  // ── Saltwater / Bay Sport Fish ──
  { type: 'bluefish',          label: 'Bluefish',                shortLabel: 'Blue',       category: 'saltwater_fish', iconKey: 'fish_blue',     color: F.water,     colorSecondary: F.slateLight, sortOrder: 0 },
  { type: 'flounder',          label: 'Flounder',                shortLabel: 'Flounder',   category: 'saltwater_fish', iconKey: 'fish_flat',     color: F.sand,      colorSecondary: F.bark,      sortOrder: 1 },
  { type: 'red_drum',          label: 'Red Drum',                shortLabel: 'Redfish',    category: 'saltwater_fish', iconKey: 'fish_drum',     color: F.mdRed,     colorSecondary: F.amber,     sortOrder: 2 },
  { type: 'speckled_trout',    label: 'Speckled Trout',          shortLabel: 'Speck',      category: 'saltwater_fish', iconKey: 'fish_speck',    color: F.slateLight,colorSecondary: F.silver,    sortOrder: 3 },
  { type: 'croaker',           label: 'Croaker',                 shortLabel: 'Croaker',    category: 'saltwater_fish', iconKey: 'fish_croaker',  color: F.amber,     colorSecondary: F.sand,      sortOrder: 4 },
  { type: 'spot',              label: 'Spot',                    shortLabel: 'Spot',       category: 'saltwater_fish', iconKey: 'fish_spot',     color: F.mdGold,    colorSecondary: F.amber,     sortOrder: 5 },
  { type: 'white_marlin',      label: 'White Marlin',            shortLabel: 'Marlin',     category: 'saltwater_fish', iconKey: 'fish_marlin',   color: F.bay,       colorSecondary: F.water,     sortOrder: 6 },
  { type: 'tuna',              label: 'Tuna',                    shortLabel: 'Tuna',       category: 'saltwater_fish', iconKey: 'fish_tuna',     color: F.slate,     colorSecondary: F.water,     sortOrder: 7 },
  { type: 'mahi_mahi',         label: 'Mahi-Mahi',              shortLabel: 'Mahi',       category: 'saltwater_fish', iconKey: 'fish_mahi',     color: F.tealLight, colorSecondary: F.mdGold,    sortOrder: 8 },
  { type: 'cobia',             label: 'Cobia',                  shortLabel: 'Cobia',      category: 'saltwater_fish', iconKey: 'fish_cobia',    color: F.bark,      colorSecondary: F.slate,     sortOrder: 9 },
  { type: 'tautog',            label: 'Tautog (Blackfish)',     shortLabel: 'Tog',        category: 'saltwater_fish', iconKey: 'fish_tog',      color: F.slate,     colorSecondary: F.slateLight, sortOrder: 10 },
  { type: 'sea_bass',          label: 'Black Sea Bass',         shortLabel: 'Sea Bass',   category: 'saltwater_fish', iconKey: 'fish_seabass',  color: F.slate,     colorSecondary: F.info,      sortOrder: 11 },

  // ── Structure & Cover ──
  { type: 'submerged_timber',  label: 'Submerged Timber',       shortLabel: 'Timber',     category: 'structure', iconKey: 'log',            color: F.bark,      colorSecondary: F.clay,      sortOrder: 0 },
  { type: 'rock_pile',         label: 'Rock Pile',              shortLabel: 'Rocks',      category: 'structure', iconKey: 'rocks',          color: F.slate,     colorSecondary: F.slateLight, sortOrder: 1 },
  { type: 'brush_pile',        label: 'Brush Pile',             shortLabel: 'Brush',      category: 'structure', iconKey: 'brush',          color: F.moss,      colorSecondary: F.bark,      sortOrder: 2 },
  { type: 'laydown',           label: 'Laydown Tree',           shortLabel: 'Laydown',    category: 'structure', iconKey: 'log',            color: F.barkLight, colorSecondary: F.bark,      sortOrder: 3 },
  { type: 'stump_field',       label: 'Stump Field',            shortLabel: 'Stumps',     category: 'structure', iconKey: 'stump',          color: F.bark,      colorSecondary: F.clay,      sortOrder: 4 },
  { type: 'grass_bed',         label: 'Grass Bed',              shortLabel: 'Grass',      category: 'structure', iconKey: 'grass',          color: F.moss,      colorSecondary: F.sage,      sortOrder: 5 },
  { type: 'lily_pads',         label: 'Lily Pads',              shortLabel: 'Lilies',     category: 'structure', iconKey: 'lily',           color: F.sage,      colorSecondary: F.moss,      sortOrder: 6 },
  { type: 'riprap',            label: 'Rip-rap',                shortLabel: 'Riprap',     category: 'structure', iconKey: 'rocks',          color: F.slateLight,colorSecondary: F.slate,     sortOrder: 7 },
  { type: 'dock',              label: 'Dock / Pier',            shortLabel: 'Dock',       category: 'structure', iconKey: 'dock_icon',      color: F.bark,      colorSecondary: F.barkLight, sortOrder: 8 },
  { type: 'bridge_piling',     label: 'Bridge Piling',          shortLabel: 'Bridge',     category: 'structure', iconKey: 'bridge',         color: F.slate,     colorSecondary: F.bark,      sortOrder: 9 },
  { type: 'seawall',           label: 'Seawall',                shortLabel: 'Seawall',    category: 'structure', iconKey: 'wall',           color: F.slate,     colorSecondary: F.slateLight, sortOrder: 10 },
  { type: 'jetty',             label: 'Jetty / Breakwater',     shortLabel: 'Jetty',      category: 'structure', iconKey: 'jetty_icon',     color: F.slateLight,colorSecondary: F.water,     sortOrder: 11 },
  { type: 'oyster_bar',        label: 'Oyster Bar',             shortLabel: 'Oyster',     category: 'structure', iconKey: 'oyster',         color: F.clay,      colorSecondary: F.sand,      sortOrder: 12 },
  { type: 'artificial_reef',   label: 'Artificial Reef',        shortLabel: 'Reef',       category: 'structure', iconKey: 'reef',           color: F.teal,      colorSecondary: F.tealLight, sortOrder: 13 },
  { type: 'mussel_bed',        label: 'Mussel Bed',             shortLabel: 'Mussel',     category: 'structure', iconKey: 'mussel',         color: F.slate,     colorSecondary: F.clay,      sortOrder: 14 },

  // ── Water Features ──
  { type: 'deep_hole',         label: 'Deep Hole',              shortLabel: 'Deep',       category: 'water_features', iconKey: 'depth',     color: F.water,     colorSecondary: F.bay,       sortOrder: 0 },
  { type: 'drop_off',          label: 'Drop-off / Ledge',       shortLabel: 'Drop',       category: 'water_features', iconKey: 'ledge',     color: F.water,     colorSecondary: F.slate,     sortOrder: 1 },
  { type: 'channel',           label: 'Channel',                shortLabel: 'Channel',    category: 'water_features', iconKey: 'channel',   color: F.bay,       colorSecondary: F.water,     sortOrder: 2 },
  { type: 'current_break',     label: 'Current Break',          shortLabel: 'Break',      category: 'water_features', iconKey: 'current',   color: F.waterLight,colorSecondary: F.water,     sortOrder: 3 },
  { type: 'eddy',              label: 'Eddy',                   shortLabel: 'Eddy',       category: 'water_features', iconKey: 'eddy_icon', color: F.waterLight,colorSecondary: F.bay,       sortOrder: 4 },
  { type: 'riffle',            label: 'Riffle',                 shortLabel: 'Riffle',     category: 'water_features', iconKey: 'riffle',    color: F.waterLight,colorSecondary: F.silver,    sortOrder: 5 },
  { type: 'shoal',             label: 'Shoal',                  shortLabel: 'Shoal',      category: 'water_features', iconKey: 'shoal_icon',color: F.amber,     colorSecondary: F.sand,      sortOrder: 6 },
  { type: 'sandbar',           label: 'Sandbar',                shortLabel: 'Sand',       category: 'water_features', iconKey: 'sandbar',   color: F.sand,      colorSecondary: F.amber,     sortOrder: 7 },
  { type: 'tidal_flat',        label: 'Tidal Flat',             shortLabel: 'Flat',       category: 'water_features', iconKey: 'tidal',     color: F.info,      colorSecondary: F.silver,    sortOrder: 8 },
  { type: 'spring',            label: 'Spring',                 shortLabel: 'Spring',     category: 'water_features', iconKey: 'spring_icon',color: F.tealLight, colorSecondary: F.teal,      sortOrder: 9 },
  { type: 'confluence',        label: 'Confluence',             shortLabel: 'Merge',      category: 'water_features', iconKey: 'merge',     color: F.bay,       colorSecondary: F.waterLight, sortOrder: 10 },
  { type: 'tailwater',         label: 'Tailwater',              shortLabel: 'Tail',       category: 'water_features', iconKey: 'tailwater', color: F.water,     colorSecondary: F.silver,    sortOrder: 11 },
  { type: 'thermocline',       label: 'Thermocline',            shortLabel: 'Thermo',     category: 'water_features', iconKey: 'thermo',    color: F.bay,       colorSecondary: F.teal,      sortOrder: 12 },
  { type: 'creek_mouth',       label: 'Creek Mouth',            shortLabel: 'Creek',      category: 'water_features', iconKey: 'creek',     color: F.teal,      colorSecondary: F.water,     sortOrder: 13 },

  // ── Fishing Intel ──
  { type: 'honey_spot',        label: 'Honey Spot',             shortLabel: 'Honey',      category: 'fishing_intel', iconKey: 'star',       color: F.mdGold,    colorSecondary: F.amber,     sortOrder: 0 },
  { type: 'bait_school',       label: 'Bait School',            shortLabel: 'Bait',       category: 'fishing_intel', iconKey: 'school',     color: F.silver,    colorSecondary: F.water,     sortOrder: 1 },
  { type: 'trolling_lane',     label: 'Trolling Lane',          shortLabel: 'Troll',      category: 'fishing_intel', iconKey: 'troll_arrow',color: F.orange,    colorSecondary: F.amber,     sortOrder: 2 },
  { type: 'drift_line',        label: 'Drift Line',             shortLabel: 'Drift',      category: 'fishing_intel', iconKey: 'drift',      color: F.waterLight,colorSecondary: F.silver,    sortOrder: 3 },
  { type: 'anchor_point',      label: 'Anchor Point',           shortLabel: 'Anchor',     category: 'fishing_intel', iconKey: 'anchor',     color: F.slate,     colorSecondary: F.slateLight, sortOrder: 4 },
  { type: 'cast_zone',         label: 'Cast Zone',              shortLabel: 'Cast',       category: 'fishing_intel', iconKey: 'cast',       color: F.orange,    colorSecondary: F.mdGold,    sortOrder: 5 },
  { type: 'spawning_area',     label: 'Spawning Area',          shortLabel: 'Spawn',      category: 'fishing_intel', iconKey: 'spawn',      color: F.danger,    colorSecondary: F.mdRed,     sortOrder: 6 },
  { type: 'feeding_lane',      label: 'Feeding Lane',           shortLabel: 'Feed',       category: 'fishing_intel', iconKey: 'feed',       color: F.amber,     colorSecondary: F.orange,    sortOrder: 7 },
  { type: 'fish_kill',         label: 'Fish Kill / Die-off',    shortLabel: 'Kill',       category: 'fishing_intel', iconKey: 'skull',      color: F.danger,    colorSecondary: F.blood,     sortOrder: 8 },
  { type: 'stocking_site',     label: 'Stocking Site (DNR)',    shortLabel: 'Stock',      category: 'fishing_intel', iconKey: 'truck',      color: F.success,   colorSecondary: F.moss,      sortOrder: 9 },

  // ── Crabbing ──
  { type: 'crab_pot_mine',     label: 'My Crab Pot',            shortLabel: 'My Pot',     category: 'crabbing', iconKey: 'crab_pot',       color: F.mdRed,     colorSecondary: F.amber,     sortOrder: 0 },
  { type: 'crab_pot_others',   label: "Others' Crab Pots",      shortLabel: 'Pots',       category: 'crabbing', iconKey: 'crab_pot_mark',  color: F.orange,    colorSecondary: F.amber,     sortOrder: 1 },
  { type: 'crab_trotline',     label: 'Trotline Run',           shortLabel: 'Trotline',   category: 'crabbing', iconKey: 'trotline',       color: F.mdRed,     colorSecondary: F.bark,      sortOrder: 2 },
  { type: 'crab_handline',     label: 'Handline / Chicken Neck',shortLabel: 'Handline',   category: 'crabbing', iconKey: 'handline',       color: F.amber,     colorSecondary: F.clay,      sortOrder: 3 },
  { type: 'crab_trap_area',    label: 'Crab Trap Zone',         shortLabel: 'Trap',       category: 'crabbing', iconKey: 'trap_zone',      color: F.orange,    colorSecondary: F.mdRed,     sortOrder: 4 },
  { type: 'crab_shedder',      label: 'Shedder / Peeler',       shortLabel: 'Shedder',    category: 'crabbing', iconKey: 'shedder',        color: F.teal,      colorSecondary: F.tealLight, sortOrder: 5 },
  { type: 'crab_catch_spot',   label: 'Proven Crab Spot',       shortLabel: 'Spot',       category: 'crabbing', iconKey: 'crab_star',      color: F.mdGold,    colorSecondary: F.mdRed,     sortOrder: 6 },
  { type: 'crab_pot_pull',     label: 'Pot Check / Pull Point', shortLabel: 'Pull',       category: 'crabbing', iconKey: 'crab_check',     color: F.amber,     colorSecondary: F.orange,    sortOrder: 7 },

  // ── Boating & Navigation ──
  { type: 'boat_ramp',         label: 'Boat Ramp',              shortLabel: 'Ramp',       category: 'boating', iconKey: 'ramp',            color: F.teal,      colorSecondary: F.water,     sortOrder: 0 },
  { type: 'marina',            label: 'Marina',                 shortLabel: 'Marina',     category: 'boating', iconKey: 'marina_icon',     color: F.water,     colorSecondary: F.bay,       sortOrder: 1 },
  { type: 'fuel_dock',         label: 'Fuel Dock',              shortLabel: 'Fuel',       category: 'boating', iconKey: 'fuel',            color: F.amber,     colorSecondary: F.orange,    sortOrder: 2 },
  { type: 'anchorage',         label: 'Anchorage',              shortLabel: 'Anchor',     category: 'boating', iconKey: 'anchor',          color: F.slate,     colorSecondary: F.slateLight, sortOrder: 3 },
  { type: 'mooring',           label: 'Mooring',                shortLabel: 'Moor',       category: 'boating', iconKey: 'mooring_icon',    color: F.slate,     colorSecondary: F.water,     sortOrder: 4 },
  { type: 'no_wake_zone',      label: 'No-Wake Zone',           shortLabel: 'No Wake',    category: 'boating', iconKey: 'no_wake',         color: F.danger,    colorSecondary: F.mdRed,     sortOrder: 5 },
  { type: 'shallow_hazard',    label: 'Shallow Hazard',         shortLabel: 'Shallow',    category: 'boating', iconKey: 'hazard',          color: F.amber,     colorSecondary: F.danger,    sortOrder: 6 },
  { type: 'channel_marker',    label: 'Channel Marker',         shortLabel: 'Marker',     category: 'boating', iconKey: 'ch_marker',       color: F.mdRed,     colorSecondary: F.moss,      sortOrder: 7 },
  { type: 'speed_limit',       label: 'Speed Limit Zone',       shortLabel: 'Speed',      category: 'boating', iconKey: 'speed',           color: F.orange,    colorSecondary: F.amber,     sortOrder: 8 },
  { type: 'restricted_area',   label: 'Restricted Area',        shortLabel: 'Restricted', category: 'boating', iconKey: 'restricted',      color: F.danger,    colorSecondary: F.mdRed,     sortOrder: 9 },
  { type: 'pump_out',          label: 'Pump-Out Station',       shortLabel: 'Pump',       category: 'boating', iconKey: 'pump',            color: F.teal,      colorSecondary: F.tealLight, sortOrder: 10 },
  { type: 'boat_washdown',     label: 'Boat Washdown',          shortLabel: 'Wash',       category: 'boating', iconKey: 'washdown',        color: F.waterLight, colorSecondary: F.water,    sortOrder: 11 },

  // ── Fishing Events ──
  { type: 'catch_photo',       label: 'Catch Photo',            shortLabel: 'Catch',      category: 'fish_events', iconKey: 'camera_fish',  color: F.mdGold,    colorSecondary: F.amber,     sortOrder: 0 },
  { type: 'personal_best',     label: 'Personal Best',          shortLabel: 'PB!',        category: 'fish_events', iconKey: 'trophy',       color: F.mdGold,    colorSecondary: F.brass,     sortOrder: 1 },
  { type: 'bait_depth_note',   label: 'Bait & Depth Note',      shortLabel: 'Bait/Depth', category: 'fish_events', iconKey: 'bait_hook',    color: F.purple,    colorSecondary: F.water,     sortOrder: 2 },
  { type: 'tournament_spot',   label: 'Tournament Spot',        shortLabel: 'Tourney',    category: 'fish_events', iconKey: 'trophy',       color: F.brass,     colorSecondary: F.mdGold,    sortOrder: 3 },

  // ── Access & Logistics ──
  { type: 'parking',           label: 'Parking',                shortLabel: 'Park',       category: 'fish_access', iconKey: 'parking_p',    color: F.amber,     colorSecondary: F.clay,      sortOrder: 0 },
  { type: 'fish_cleaning',     label: 'Fish Cleaning Station',  shortLabel: 'Clean',      category: 'fish_access', iconKey: 'cleaning',     color: F.teal,      colorSecondary: F.water,     sortOrder: 1 },
  { type: 'bait_shop',         label: 'Bait Shop',              shortLabel: 'Bait',       category: 'fish_access', iconKey: 'shop',         color: F.orange,    colorSecondary: F.amber,     sortOrder: 2 },
  { type: 'weigh_station',     label: 'Weigh Station',          shortLabel: 'Weigh',      category: 'fish_access', iconKey: 'scale',        color: F.slateLight,colorSecondary: F.slate,     sortOrder: 3 },
  { type: 'kayak_launch',      label: 'Kayak Launch',           shortLabel: 'Kayak',      category: 'fish_access', iconKey: 'kayak',        color: F.teal,      colorSecondary: F.tealLight, sortOrder: 4 },
  { type: 'wade_access',       label: 'Wade Access',            shortLabel: 'Wade',       category: 'fish_access', iconKey: 'wade',         color: F.sage,      colorSecondary: F.moss,      sortOrder: 5 },

  // ── General ──
  { type: 'custom_fish',       label: 'Custom Pin',             shortLabel: 'Pin',        category: 'general_fish', iconKey: 'pin',         color: F.info,      colorSecondary: F.muted,     sortOrder: 0 },
];

// ══════════════════════════════════════════════════════════════
// Fish Icon Glyphs (extends the glyph system from WaypointIcons.tsx)
// ══════════════════════════════════════════════════════════════

export const FISH_ICON_GLYPHS: Record<string, string> = {
  // Sport Fish
  fish_stripe:    '≋',   // triple wave → striper
  fish_bass:      '⊃',   // cup → bass mouth
  fish_cat:       '∿',   // wavy → catfish whiskers
  fish_perch:     '⊂',   // cup → perch
  fish_panfish:   '○',   // circle → panfish
  fish_walleye:   '◎',   // target → walleye eye
  fish_pike:      '⊳',   // triangle → pike
  fish_trout:     '∼',   // wave → trout
  fish_shad:      '◇',   // diamond → shad
  fish_snake:     '§',   // S → snakehead
  fish_carp:      '◉',   // circle → carp
  fish_blue:      '≫',   // double angle → bluefish
  fish_flat:      '▬',   // rectangle → flounder
  fish_drum:      '◐',   // half circle → drum
  fish_speck:     '∴',   // dots → speckles
  fish_croaker:   '◖',   // half → croaker
  fish_spot:      '●',   // dot → spot
  fish_marlin:    '⇗',   // arrow up → marlin bill
  fish_tuna:      '◈',   // diamond → tuna
  fish_mahi:      '◇',   // diamond → mahi
  fish_cobia:     '▬',   // bar → cobia
  fish_tog:       '■',   // square → blackfish
  fish_seabass:   '▪',   // small square

  // Structure
  log:            '═',   // double line → timber
  rocks:          '⬡',   // hexagon → rocks
  brush:          '※',   // asterisk → brush
  stump:          '⊥',   // perpendicular → stump
  grass:          '≡',   // triple line → grass
  lily:           '❁',   // flower → lily
  dock_icon:      '⊞',   // grid → dock
  bridge:         '∩',   // arch → bridge
  wall:           '▐',   // half block → seawall
  jetty_icon:     '▬',   // bar → jetty
  oyster:         '◗',   // half → oyster
  reef:           '⊛',   // circled star → reef
  mussel:         '◖',   // half → mussel

  // Water Features
  depth:          '▼',   // down → deep
  ledge:          '⌐',   // corner → drop-off
  channel:        '∥',   // parallel → channel
  current:        '↝',   // wavy arrow → current
  eddy_icon:      '↻',   // circular → eddy
  riffle:         '≈',   // waves → riffle
  shoal_icon:     '△',   // triangle → shoal
  sandbar:        '▭',   // rectangle → sand
  tidal:          '⌇',   // dots → tidal
  spring_icon:    '♨',   // hot spring
  merge:          '⊻',   // merge → confluence
  tailwater:      '↓',   // down → tailwater
  thermo:         '⌁',   // zigzag → thermocline
  creek:          '⊂',   // cup → creek mouth

  // Fishing Intel
  star:           '★',   // star → honey spot
  school:         '⋮⋮',  // dots → bait school
  troll_arrow:    '→',   // arrow → trolling
  drift:          '⇀',   // arrow → drift
  anchor:         '⚓',  // anchor
  cast:           '⊕',   // target → cast zone
  spawn:          '◎',   // target → spawning
  feed:           '◉',   // filled → feeding
  skull:          '☠',   // skull → fish kill
  truck:          '▣',   // box → stocking truck

  // Crabbing
  crab_pot:       '⊞',   // grid → pot
  crab_pot_mark:  '⊠',   // crossed grid → others' pots
  trotline:       '┄',   // dashed → trotline
  handline:       '⌇',   // vertical → handline
  trap_zone:      '⊡',   // target box → trap area
  shedder:        '◌',   // dashed circle → shedder
  crab_star:      '★',   // star → proven spot
  crab_check:     '☑',   // checkbox → pull point

  // Boating
  ramp:           '⊿',   // right triangle → ramp
  marina_icon:    '⚓',  // anchor → marina
  fuel:           '⛽',  // fuel
  mooring_icon:   '⊚',   // circled dot → mooring
  no_wake:        '⊘',   // crossed circle → no wake
  hazard:         '⚠',   // warning
  ch_marker:      '⚐',   // flag → channel marker
  speed:          '◫',   // rectangle → speed
  restricted:     '⊘',   // crossed → restricted
  pump:           '▥',   // hatched → pump
  washdown:       '≋',   // waves → wash

  // Events
  camera_fish:    '◻',   // square → photo
  trophy:         '🏆',  // trophy (keep this one emoji — it's universal)
  bait_hook:      '⌒',   // arc → hook

  // Access
  parking_p:      'P',   // P
  cleaning:       '✂',   // scissors → cleaning
  shop:           '⌂',   // house → shop
  scale:          '⎍',   // scale
  kayak:          '⌇',   // vertical → kayak
  wade:           '⍉',   // circle → wade

  // General
  pin:            '●',   // dot
};

// ══════════════════════════════════════════════════════════════
// Lookup Helpers
// ══════════════════════════════════════════════════════════════

const _fishRegistryMap = new Map<FishWaypointType, FishWaypointIconEntry>();
FISH_WAYPOINT_REGISTRY.forEach((entry) => _fishRegistryMap.set(entry.type, entry));

/** Get a fish waypoint entry by type. Fallback to 'custom_fish' if not found. */
export function getFishWaypointEntry(type: FishWaypointType): FishWaypointIconEntry {
  return _fishRegistryMap.get(type) || _fishRegistryMap.get('custom_fish')!;
}

/** Get all fish waypoints in a category, sorted. */
export function getFishWaypointsByCategory(category: FishWaypointCategory): FishWaypointIconEntry[] {
  return FISH_WAYPOINT_REGISTRY
    .filter((e) => e.category === category)
    .sort((a, b) => a.sortOrder - b.sortOrder);
}

/** Get fish categories that have at least one waypoint, sorted. */
export function getActiveFishCategories(): FishWaypointCategoryMeta[] {
  const active = new Set(FISH_WAYPOINT_REGISTRY.map((e) => e.category));
  return FISH_WAYPOINT_CATEGORIES.filter((c) => active.has(c.id)).sort((a, b) => a.sortOrder - b.sortOrder);
}

/** Get the label for a fish waypoint type. */
export function getFishWaypointLabel(type: FishWaypointType): string {
  return getFishWaypointEntry(type).label;
}

/** Get the map color for a fish waypoint type. */
export function getFishWaypointColor(type: FishWaypointType): string {
  return getFishWaypointEntry(type).color;
}

/** Get the glyph for a fish icon key. */
export function getFishIconGlyph(iconKey: string): string {
  return FISH_ICON_GLYPHS[iconKey] || '●';
}

/** Total count of all fish waypoint types. */
export const TOTAL_FISH_WAYPOINT_TYPES = FISH_WAYPOINT_REGISTRY.length;
