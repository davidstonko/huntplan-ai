/**
 * @file config/activityModeConfig.ts
 * @description Central configuration for all activity modes.
 * Each mode defines its own filters, waypoint icons, labels, AI prompts, and tab icons.
 * Used by Scout/Spots, Camp, Chat, Map, and Filter components to adapt per mode.
 */

import { ActivityMode } from '../context/ActivityModeContext';

// ── Types ──

export interface WaypointIconOption {
  icon: string;
  label: string;
  emoji: string;
}

export interface FilterOption {
  key: string;
  label: string;
}

export interface FilterCategory {
  key: string;
  label: string;
  options: FilterOption[];
}

export interface ActivityModeConfig {
  // Display labels
  planLabel: string;
  planLabelPlural: string;
  campLabel: string;
  parkingLabel: string;
  activityVerb: string;
  emptyPlanText: string;
  spotLabel: string;

  // Waypoint icon options per mode
  waypointIcons: WaypointIconOption[];

  // Map filter categories per mode
  filters: FilterCategory[];

  // AI Chat configuration
  welcomeMessage: string;
  suggestionChips: string[];
  knowledgeBaseKey: string;

  // Observation/sighting options (for Camp)
  speciesOptions: string[];
  activityOptions: string[];

  // Tab configuration
  tabIcons: Record<string, string>;
  tabLabels: Record<string, string>;

  // Map data
  dataSourceKey: string;
  mapBannerTitle: string;
  mapBannerSubtitle: string;
}

// ── Configurations ──

const huntConfig: ActivityModeConfig = {
  planLabel: 'Hunt Plan',
  planLabelPlural: 'Hunt Plans',
  campLabel: 'Deer Camp',
  parkingLabel: 'Parking / Start Point',
  activityVerb: 'hunt',
  emptyPlanText: 'Create a hunt plan to start marking stands, routes, and areas on the map.',
  spotLabel: 'Scout',

  waypointIcons: [
    { icon: 'stand', label: 'Tree Stand', emoji: '🌲' },
    { icon: 'blind', label: 'Ground Blind', emoji: '🎪' },
    { icon: 'camera', label: 'Trail Cam', emoji: '📷' },
    { icon: 'feeder', label: 'Feeder', emoji: '🌾' },
    { icon: 'food-plot', label: 'Food Plot', emoji: '🌿' },
    { icon: 'water', label: 'Water', emoji: '💧' },
    { icon: 'crossing', label: 'Crossing', emoji: '🚶' },
    { icon: 'sign', label: 'Sign/Rub', emoji: '🪧' },
    { icon: 'parking', label: 'Parking', emoji: '🅿️' },
    { icon: 'custom', label: 'Custom Pin', emoji: '📌' },
  ],

  filters: [
    {
      key: 'landType', label: 'Land Type', options: [
        { key: 'WMA', label: 'WMA' }, { key: 'CWMA', label: 'CWMA' },
        { key: 'CFL', label: 'CFL' }, { key: 'SF', label: 'SF' },
        { key: 'SP', label: 'SP' }, { key: 'NRMA', label: 'NRMA' },
        { key: 'NEA', label: 'NEA' }, { key: 'FMA', label: 'FMA' },
        { key: 'Range', label: 'Range' },
      ],
    },
    {
      key: 'species', label: 'Species', options: [
        { key: 'deer', label: 'Deer' }, { key: 'turkey', label: 'Turkey' },
        { key: 'waterfowl', label: 'Waterfowl' }, { key: 'bear', label: 'Bear' },
        { key: 'smallGame', label: 'Small Game' },
      ],
    },
    {
      key: 'weapon', label: 'Weapon/Method', options: [
        { key: 'archery', label: 'Archery' }, { key: 'firearms', label: 'Firearms' },
        { key: 'muzzleloader', label: 'Muzzleloader' },
      ],
    },
    {
      key: 'access', label: 'Access', options: [
        { key: 'sundayHunting', label: 'Sunday Hunting' },
        { key: 'noReservation', label: 'No Reservation' },
        { key: 'mobilityAccess', label: 'ADA Accessible' },
      ],
    },
  ],

  welcomeMessage: 'I know about 192 public hunting lands, 14 shooting ranges, seasons, bag limits, and regulations across Maryland.',
  suggestionChips: [
    'When is deer season?', 'Turkey season dates', 'Bear hunting rules',
    'Sunday hunting rules', 'Where can I hunt near me?',
    'What licenses do I need?', 'Plan my next hunt',
  ],
  knowledgeBaseKey: 'hunting',

  speciesOptions: ['Whitetail Buck', 'Whitetail Doe', 'Turkey Tom', 'Turkey Hen', 'Bear', 'Coyote', 'Fox', 'Bobcat'],
  activityOptions: ['Feeding', 'Bedded', 'Moving', 'Rutting', 'With Fawns'],

  tabIcons: { MAP: '🗺️', SCOUT: '🐾', AI: '🤖', CAMP: '🏕️', RESOURCES: '📚' },
  tabLabels: { MAP: 'Map', SCOUT: 'Scout', AI: 'AI', CAMP: 'Deer Camp', RESOURCES: 'Resources' },

  dataSourceKey: 'hunt',
  mapBannerTitle: '🦌 MD Hunt',
  mapBannerSubtitle: '192 public hunting lands across Maryland',
};

const fishConfig: ActivityModeConfig = {
  planLabel: 'Fishing Spot',
  planLabelPlural: 'Fishing Spots',
  campLabel: 'Fish Camp',
  parkingLabel: 'Launch Point / Access',
  activityVerb: 'fish',
  emptyPlanText: 'Save a fishing spot to start marking your favorite holes, ramps, and structures.',
  spotLabel: 'Spots',

  waypointIcons: [
    { icon: 'dock', label: 'Dock / Pier', emoji: '🛟' },
    { icon: 'ramp', label: 'Boat Ramp', emoji: '🚤' },
    { icon: 'shore', label: 'Shore Spot', emoji: '🏖️' },
    { icon: 'structure', label: 'Structure', emoji: '🪨' },
    { icon: 'deep', label: 'Deep Hole', emoji: '🌊' },
    { icon: 'current', label: 'Current Break', emoji: '💨' },
    { icon: 'bait', label: 'Bait Shop', emoji: '🪱' },
    { icon: 'parking', label: 'Parking', emoji: '🅿️' },
    { icon: 'custom', label: 'Custom Pin', emoji: '📌' },
  ],

  filters: [
    {
      key: 'locationType', label: 'Location Type', options: [
        { key: 'access_site', label: 'Access Site' },
        { key: 'stocking_location', label: 'Stocking Site' },
        { key: 'fishing_ground', label: 'Fishing Ground' },
        { key: 'hatchery', label: 'Hatchery' },
      ],
    },
    {
      key: 'waterbody', label: 'Waterbody', options: [
        { key: 'chesapeake', label: 'Chesapeake Bay' },
        { key: 'river', label: 'River' },
        { key: 'lake', label: 'Lake / Pond' },
        { key: 'stream', label: 'Stream' },
        { key: 'ocean', label: 'Ocean / Coastal' },
      ],
    },
    {
      key: 'species', label: 'Species', options: [
        { key: 'trout', label: 'Trout' }, { key: 'bass', label: 'Bass' },
        { key: 'striped', label: 'Striped Bass' }, { key: 'catfish', label: 'Catfish' },
        { key: 'panfish', label: 'Panfish' }, { key: 'saltwater', label: 'Saltwater' },
      ],
    },
    {
      key: 'amenities', label: 'Amenities', options: [
        { key: 'ramp', label: 'Boat Ramp' },
        { key: 'shoreFishing', label: 'Shore Fishing' },
        { key: 'flyFishing', label: 'Fly Fishing' },
        { key: 'ada', label: 'ADA Accessible' },
        { key: 'restrooms', label: 'Restrooms' },
      ],
    },
    {
      key: 'stocking', label: 'Stocking', options: [
        { key: 'recentlyStocked', label: 'Recently Stocked (30 days)' },
      ],
    },
  ],

  welcomeMessage: 'I know about 307 fishing access sites, 68 stocking locations, 61 fishing grounds, tides, regulations, and licenses across Maryland.',
  suggestionChips: [
    'Striped bass season?', 'Where was trout stocked recently?',
    'Tide predictions near me', 'Best bass fishing spots',
    'Do I need a license?', 'Creel limits for trout',
    'Free fishing days 2026',
  ],
  knowledgeBaseKey: 'fishing',

  speciesOptions: ['Largemouth Bass', 'Striped Bass', 'Rainbow Trout', 'Brown Trout', 'Channel Catfish', 'Bluegill', 'Crappie', 'Yellow Perch', 'Flounder', 'Bluefish'],
  activityOptions: ['Surface Feeding', 'Schooling', 'Bedding', 'Deep', 'Near Structure'],

  tabIcons: { MAP: '🗺️', SPOTS: '🎣', AI: '🤖', CAMP: '⛵', RESOURCES: '📚' },
  tabLabels: { MAP: 'Fish Map', SPOTS: 'Spots', AI: 'AI', CAMP: 'Fish Camp', RESOURCES: 'Resources' },

  dataSourceKey: 'fish',
  mapBannerTitle: '🐟 MD Fish',
  mapBannerSubtitle: '436+ fishing locations across Maryland',
};

const hikeConfig: ActivityModeConfig = {
  planLabel: 'Hiking Route',
  planLabelPlural: 'Hiking Routes',
  campLabel: 'Trail Crew',
  parkingLabel: 'Trailhead',
  activityVerb: 'hike',
  emptyPlanText: 'Create a route to plan your next hike — mark trailheads, viewpoints, and water sources.',
  spotLabel: 'Routes',

  waypointIcons: [
    { icon: 'trailhead', label: 'Trailhead', emoji: '🥾' },
    { icon: 'viewpoint', label: 'Viewpoint', emoji: '🏔️' },
    { icon: 'water', label: 'Water Source', emoji: '💧' },
    { icon: 'campsite', label: 'Campsite', emoji: '⛺' },
    { icon: 'shelter', label: 'Shelter', emoji: '🏠' },
    { icon: 'hazard', label: 'Hazard', emoji: '⚠️' },
    { icon: 'wildlife', label: 'Wildlife', emoji: '🦅' },
    { icon: 'parking', label: 'Parking', emoji: '🅿️' },
    { icon: 'custom', label: 'Custom Pin', emoji: '📌' },
  ],

  filters: [
    {
      key: 'trailType', label: 'Trail Type', options: [
        { key: 'loop', label: 'Loop' }, { key: 'out-back', label: 'Out & Back' },
        { key: 'point-point', label: 'Point to Point' }, { key: 'network', label: 'Trail Network' },
      ],
    },
    {
      key: 'difficulty', label: 'Difficulty', options: [
        { key: 'easy', label: 'Easy' }, { key: 'moderate', label: 'Moderate' },
        { key: 'hard', label: 'Hard' }, { key: 'expert', label: 'Expert' },
      ],
    },
    {
      key: 'features', label: 'Features', options: [
        { key: 'waterfall', label: 'Waterfall' }, { key: 'scenic', label: 'Scenic View' },
        { key: 'lake', label: 'Lake / Pond' }, { key: 'wildlife', label: 'Wildlife' },
        { key: 'historical', label: 'Historical' },
      ],
    },
    {
      key: 'access', label: 'Access', options: [
        { key: 'ada', label: 'ADA Accessible' },
        { key: 'dogFriendly', label: 'Dog Friendly' },
        { key: 'parking', label: 'Free Parking' },
      ],
    },
  ],

  welcomeMessage: 'I know about Maryland state parks, trails, and hiking resources.',
  suggestionChips: [
    'Best hikes near Baltimore', 'Waterfalls in Maryland',
    'Easy trails for families', 'Appalachian Trail in MD',
    'Dog-friendly trails', 'State park hours',
  ],
  knowledgeBaseKey: 'hiking',

  speciesOptions: ['Bald Eagle', 'Black Bear', 'White-tailed Deer', 'Wild Turkey', 'Great Blue Heron', 'Red Fox'],
  activityOptions: ['Perched', 'Nesting', 'Feeding', 'In Flight', 'On Trail'],

  tabIcons: { MAP: '🗺️', ROUTES: '🥾', AI: '🤖', CREW: '⛰️', RESOURCES: '📚' },
  tabLabels: { MAP: 'Map', ROUTES: 'Routes', AI: 'AI', CREW: 'Trail Crew', RESOURCES: 'Resources' },

  dataSourceKey: 'hike',
  mapBannerTitle: '🥾 MD Hike',
  mapBannerSubtitle: 'Maryland state parks and trails',
};

const crabConfig: ActivityModeConfig = {
  planLabel: 'Crabbing Spot',
  planLabelPlural: 'Crabbing Spots',
  campLabel: 'Crab Crew',
  parkingLabel: 'Access Point',
  activityVerb: 'crab',
  emptyPlanText: 'Save a crabbing spot to mark your favorite piers, shorelines, and crabbing areas.',
  spotLabel: 'Spots',

  waypointIcons: [
    { icon: 'pier', label: 'Pier', emoji: '🌉' },
    { icon: 'shore', label: 'Shore Access', emoji: '🏖️' },
    { icon: 'ramp', label: 'Boat Ramp', emoji: '🚤' },
    { icon: 'dock', label: 'Dock', emoji: '⚓' },
    { icon: 'channel', label: 'Channel Edge', emoji: '🌊' },
    { icon: 'grass', label: 'Grass Bed', emoji: '🌿' },
    { icon: 'bait', label: 'Bait Shop', emoji: '🪱' },
    { icon: 'parking', label: 'Parking', emoji: '🅿️' },
    { icon: 'custom', label: 'Custom Pin', emoji: '📌' },
  ],

  filters: [
    {
      key: 'locationType', label: 'Location Type', options: [
        { key: 'pier', label: 'Public Pier' }, { key: 'shore', label: 'Shore Access' },
        { key: 'ramp', label: 'Boat Ramp' }, { key: 'charter', label: 'Charter / Guide' },
      ],
    },
    {
      key: 'method', label: 'Method', options: [
        { key: 'trotline', label: 'Trotline' }, { key: 'pot', label: 'Crab Pot' },
        { key: 'handline', label: 'Handline' }, { key: 'net', label: 'Dip Net' },
        { key: 'ring', label: 'Collapsible Trap' },
      ],
    },
    {
      key: 'access', label: 'Access', options: [
        { key: 'free', label: 'Free Access' },
        { key: 'ada', label: 'ADA Accessible' },
        { key: 'restrooms', label: 'Restrooms' },
      ],
    },
  ],

  welcomeMessage: 'I know about Maryland blue crab regulations, access points, and crabbing resources.',
  suggestionChips: [
    'Crab season dates?', 'Bushel limit?', 'Best crabbing spots',
    'Do I need a license?', 'Trotline rules',
    'Crab size limits', 'Female crab rules',
  ],
  knowledgeBaseKey: 'crabbing',

  speciesOptions: ['Blue Crab (Male/Jimmy)', 'Blue Crab (Female/Sook)', 'Blue Crab (Peeler)', 'Blue Crab (Soft Shell)'],
  activityOptions: ['Surface', 'Bottom', 'Moving', 'Molting', 'Near Structure'],

  tabIcons: { MAP: '🗺️', SPOTS: '🦀', AI: '🤖', CREW: '🪣', RESOURCES: '📚' },
  tabLabels: { MAP: 'Map', SPOTS: 'Spots', AI: 'AI', CREW: 'Crab Crew', RESOURCES: 'Resources' },

  dataSourceKey: 'crab',
  mapBannerTitle: '🦀 MD Crab',
  mapBannerSubtitle: 'Maryland blue crab access and regulations',
};

const boatConfig: ActivityModeConfig = {
  planLabel: 'Boating Route',
  planLabelPlural: 'Boating Routes',
  campLabel: 'Boat Crew',
  parkingLabel: 'Launch Ramp',
  activityVerb: 'boat',
  emptyPlanText: 'Plan a route to mark launch ramps, anchorages, fuel docks, and waterway waypoints.',
  spotLabel: 'Routes',

  waypointIcons: [
    { icon: 'ramp', label: 'Launch Ramp', emoji: '🚤' },
    { icon: 'marina', label: 'Marina', emoji: '⚓' },
    { icon: 'fuel', label: 'Fuel Dock', emoji: '⛽' },
    { icon: 'anchorage', label: 'Anchorage', emoji: '🏴' },
    { icon: 'hazard', label: 'Hazard / Shoal', emoji: '⚠️' },
    { icon: 'channel', label: 'Channel Marker', emoji: '🔴' },
    { icon: 'dock', label: 'Transient Dock', emoji: '🛟' },
    { icon: 'parking', label: 'Parking', emoji: '🅿️' },
    { icon: 'custom', label: 'Custom Pin', emoji: '📌' },
  ],

  filters: [
    {
      key: 'locationType', label: 'Location Type', options: [
        { key: 'ramp', label: 'Boat Ramp' }, { key: 'marina', label: 'Marina' },
        { key: 'fuel', label: 'Fuel Dock' }, { key: 'pumpout', label: 'Pumpout Station' },
        { key: 'transient', label: 'Transient Dock' },
      ],
    },
    {
      key: 'waterType', label: 'Waterway', options: [
        { key: 'chesapeake', label: 'Chesapeake Bay' }, { key: 'river', label: 'River' },
        { key: 'lake', label: 'Lake / Reservoir' }, { key: 'coastal', label: 'Coastal Bays' },
        { key: 'canal', label: 'Canal' },
      ],
    },
    {
      key: 'amenities', label: 'Amenities', options: [
        { key: 'fuel', label: 'Fuel' }, { key: 'pumpout', label: 'Pumpout' },
        { key: 'restrooms', label: 'Restrooms' }, { key: 'ada', label: 'ADA Accessible' },
        { key: 'overnight', label: 'Overnight Docking' },
      ],
    },
  ],

  welcomeMessage: 'I know about Maryland boat ramps, marinas, waterway regulations, and boating resources.',
  suggestionChips: [
    'Boat ramps near me', 'Boating license requirements',
    'Speed limits on the Bay', 'Marina fuel prices',
    'No-wake zones', 'Weather on the water',
  ],
  knowledgeBaseKey: 'boating',

  speciesOptions: [],
  activityOptions: [],

  tabIcons: { MAP: '🗺️', ROUTES: '⛵', AI: '🤖', CREW: '🚢', RESOURCES: '📚' },
  tabLabels: { MAP: 'Map', ROUTES: 'Routes', AI: 'AI', CREW: 'Boat Crew', RESOURCES: 'Resources' },

  dataSourceKey: 'boat',
  mapBannerTitle: '⛵ MD Boat',
  mapBannerSubtitle: 'Maryland boat ramps, marinas, and waterways',
};

const campConfig: ActivityModeConfig = {
  planLabel: 'Camp Trip',
  planLabelPlural: 'Camp Trips',
  campLabel: 'Group Camp',
  parkingLabel: 'Trailhead / Parking',
  activityVerb: 'camp',
  emptyPlanText: 'Plan a camping trip — mark campsites, trails, and water sources on the map.',
  spotLabel: 'Camp Map',

  waypointIcons: [
    { icon: 'tent', label: 'Tent Site', emoji: '\u26FA' },
    { icon: 'fire', label: 'Fire Ring', emoji: '\uD83D\uDD25' },
    { icon: 'water', label: 'Water Source', emoji: '\uD83D\uDCA7' },
    { icon: 'restroom', label: 'Restroom', emoji: '\uD83D\uDEBB' },
    { icon: 'trailhead', label: 'Trailhead', emoji: '\uD83E\uDDED' },
    { icon: 'parking', label: 'Parking', emoji: '\uD83C\uDD7F\uFE0F' },
    { icon: 'viewpoint', label: 'Viewpoint', emoji: '\uD83C\uDF04' },
    { icon: 'caution', label: 'Caution', emoji: '\u26A0\uFE0F' },
  ],

  filters: [
    {
      key: 'siteType',
      label: 'Site Type',
      options: [
        { key: 'state_park', label: 'State Park' },
        { key: 'state_forest', label: 'State Forest' },
        { key: 'federal', label: 'Federal' },
        { key: 'county', label: 'County' },
      ],
    },
    {
      key: 'amenities',
      label: 'Amenities',
      options: [
        { key: 'electric', label: 'Electric' },
        { key: 'water', label: 'Water' },
        { key: 'showers', label: 'Showers' },
        { key: 'petFriendly', label: 'Pet Friendly' },
        { key: 'ada', label: 'ADA Accessible' },
        { key: 'waterfront', label: 'Waterfront' },
      ],
    },
    {
      key: 'lodging',
      label: 'Lodging',
      options: [
        { key: 'tent', label: 'Tent' },
        { key: 'rv', label: 'RV' },
        { key: 'cabin', label: 'Cabin/Yurt' },
        { key: 'primitive', label: 'Primitive' },
      ],
    },
    {
      key: 'region',
      label: 'Region',
      options: [
        { key: 'western', label: 'Western MD' },
        { key: 'central', label: 'Central MD' },
        { key: 'southern', label: 'Southern MD' },
        { key: 'eastern', label: 'Eastern Shore' },
      ],
    },
  ],

  welcomeMessage: 'Welcome to MD Camp AI! I can help you find campgrounds, plan trips, check fire regulations, and recommend gear for Maryland camping.',
  suggestionChips: [
    'Best campgrounds in Western MD?',
    'Dog-friendly camping near Baltimore',
    'What camping gear do I need?',
    'State park reservation tips',
  ],
  knowledgeBaseKey: 'camp',

  speciesOptions: [], // N/A for camping
  activityOptions: ['Car Camping', 'Backpacking', 'Family', 'Group', 'Winter Camping'],

  tabIcons: { MAP: '\u26FA', GEAR: '\uD83E\uDDF3', AI: '\uD83E\uDD16', GROUP: '\uD83D\uDC65', RESOURCES: '\uD83D\uDCDA' },
  tabLabels: { MAP: 'Camp Map', GEAR: 'Gear', AI: 'AI', GROUP: 'Group Camp', RESOURCES: 'Resources' },

  dataSourceKey: 'camp',
  mapBannerTitle: '\u26FA MD Camp',
  mapBannerSubtitle: 'Maryland campgrounds, state parks, and camping resources',
};

// ── Export ──
// 2026-04-26 (fork merge): keep legacy 'crab' / 'boat' keys for any caller
// that still resolves them, but type as Record<string, ...> so the picker's
// 4-mode ActivityMode doesn't fan out.

export const MODE_CONFIGS: Record<string, ActivityModeConfig> = {
  hunt: huntConfig,
  fish: fishConfig,
  camp: campConfig,
  hike: hikeConfig,
  crab: crabConfig,
  boat: boatConfig,
};

/**
 * Get the configuration for a specific activity mode.
 * @param mode - The activity mode
 * @returns The configuration object for that mode
 */
export function getModeConfig(mode: ActivityMode): ActivityModeConfig {
  return MODE_CONFIGS[mode];
}

export default MODE_CONFIGS;
