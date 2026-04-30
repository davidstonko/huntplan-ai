/**
 * @file statePackRegistry.ts
 * @description Registry of available state data packs with metadata, descriptions, and features.
 * Serves as the single source of truth for state pack information.
 *
 * States: MD (built-in), VA (downloadable), PA (downloadable)
 */

import { StatePack } from '../types/statePack';

/**
 * Master registry of all available state packs.
 * MD is built-in; VA and PA are downloadable.
 */
export const STATE_PACK_REGISTRY: StatePack[] = [
  {
    stateCode: 'MD',
    stateName: 'Maryland',
    version: '2.1.0',
    sizeBytes: 52_428_800, // ~50 MB
    installed: true, // Built-in, cannot be uninstalled
    lastUpdated: '2026-04-11T00:00:00Z',
    description:
      'Complete Maryland hunting, fishing, and camping data. Includes 192 hunting lands, 436 fishing locations, 45 campgrounds, and Appalachian Trail data.',
    releaseDate: '2026-03-30T00:00:00Z',
    features: {
      huntingLands: 192,
      fishingLocations: 436,
      campgrounds: 45,
      hikingTrails: 1, // Appalachian Trail
      regulations: true,
      aiKnowledge: true,
    },
  },
  {
    stateCode: 'VA',
    stateName: 'Virginia',
    version: '1.0.0',
    sizeBytes: 125_829_120, // ~120 MB
    installed: false, // Downloadable
    description:
      'Virginia outdoor recreation data. Includes 350+ hunting lands, 500+ fishing locations, 80+ campgrounds, and 200+ hiking trails including AT extensions.',
    releaseDate: '2026-05-01T00:00:00Z',
    features: {
      huntingLands: 350,
      fishingLocations: 500,
      campgrounds: 80,
      hikingTrails: 200,
      regulations: true,
      aiKnowledge: true,
    },
  },
  {
    stateCode: 'PA',
    stateName: 'Pennsylvania',
    version: '1.0.0',
    sizeBytes: 104_857_600, // ~100 MB
    installed: false, // Downloadable
    description:
      'Pennsylvania outdoor recreation data. Includes 300+ hunting lands, 400+ fishing locations, 60+ campgrounds, and 150+ hiking trails with State Game Lands coverage.',
    releaseDate: '2026-05-15T00:00:00Z',
    features: {
      huntingLands: 300,
      fishingLocations: 400,
      campgrounds: 60,
      hikingTrails: 150,
      regulations: true,
      aiKnowledge: true,
    },
  },
];

/**
 * Get a state pack by its state code.
 * @param stateCode - The state code ('MD', 'VA', 'PA')
 * @returns The StatePack object or undefined if not found
 */
export function getStatePackByCode(stateCode: string): StatePack | undefined {
  return STATE_PACK_REGISTRY.find((pack) => pack.stateCode === stateCode);
}

/**
 * Get all installed state packs.
 * @returns Array of installed StatePack objects
 */
export function getInstalledPacks(): StatePack[] {
  return STATE_PACK_REGISTRY.filter((pack) => pack.installed);
}

/**
 * Get all downloadable (not yet installed) state packs.
 * @returns Array of downloadable StatePack objects
 */
export function getAvailablePacks(): StatePack[] {
  return STATE_PACK_REGISTRY.filter((pack) => !pack.installed);
}

/**
 * Format bytes to human-readable size string.
 * @param bytes - Number of bytes
 * @returns Formatted string (e.g., "120 MB", "1.5 GB")
 */
export function formatPackSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round((bytes / Math.pow(k, i)) * 10) / 10 + ' ' + sizes[i];
}

/**
 * Get detailed description of a state pack's hunting features.
 * @param stateCode - The state code
 * @returns Description string
 */
export function getHuntingDescription(stateCode: string): string {
  const descriptions: Record<string, string> = {
    MD:
      'Maryland\'s comprehensive public hunting data includes 192 Wildlife Management Areas (WMAs), Chesapeake Wildlife Management Areas (CWMAs), Community Fishing Locations (CFLs), State Forests (SFs), State Parks (SPs), and 14 shooting ranges. Coverage includes deer, turkey, waterfowl, and small game hunting across all 24 counties.',
    VA:
      'Virginia\'s expansive public hunting system features 350+ lands including State Wildlife Management Areas, National Forests (George Washington, Jefferson, Mount Rogers), Army Corps of Engineers lands, and private partnerships. Excellent deer, turkey, and waterfowl hunting across western, piedmont, and coastal regions.',
    PA:
      'Pennsylvania\'s State Game Lands program offers 300+ public hunting areas totaling 1.5+ million acres. Comprehensive coverage of state forests, national forests (Allegheny), and Wildlife Management Units. Prime region for whitetail deer, black bear, turkey, and grouse.',
  };
  return descriptions[stateCode] || 'Hunting data not available for this state.';
}

/**
 * Get detailed description of a state pack's fishing features.
 * @param stateCode - The state code
 * @returns Description string
 */
export function getFishingDescription(stateCode: string): string {
  const descriptions: Record<string, string> = {
    MD:
      'Maryland offers diverse fishing across 436+ access sites including bay, river, and inland waters. Features Chesapeake Bay (striped bass, crabbing), major rivers (Potomac, Susquehanna), trout streams, and inland lakes. Includes 68 trout stocking locations and live stocking reports.',
    VA:
      'Virginia\'s 500+ fishing locations span coastal waters (largemouth/striped bass), major rivers (James, New, Shenandoah), and mountain trout streams. Comprehensive access site directory with boat ramps, tackle shops, and seasonal species guides.',
    PA:
      'Pennsylvania\'s 400+ fishing locations include Lake Erie (walleye, perch), major rivers (Allegheny, Susquehanna, Delaware), and excellent trout streams throughout the state. Statewide tidal and stream condition data.',
  };
  return descriptions[stateCode] || 'Fishing data not available for this state.';
}

/**
 * Get detailed description of a state pack's hiking features.
 * @param stateCode - The state code
 * @returns Description string
 */
export function getHikingDescription(stateCode: string): string {
  const descriptions: Record<string, string> = {
    MD:
      'Maryland\'s 1 hiking feature focuses on the 40.9-mile Appalachian Trail (AT) crossing the state through Washington County. Includes 9 shelters, 10 trailheads, 12 landmarks, and the Four States Challenge. Day hikes from near DC, Baltimore, and Western Maryland.',
    VA:
      'Virginia\'s 200+ hiking trails include 550+ miles of Appalachian Trail (longest section through any state), Shenandoah National Park, George Washington & Jefferson National Forests, and countless day hikes. Comprehensive trail guide with difficulty ratings and seasonal conditions.',
    PA:
      'Pennsylvania\'s 150+ hiking trails span Appalachian Trail extensions, state parks (Hickory Run, Rickett\'s Glen), national forests, and the Laurel Highlands Trail. Excellent fall foliage hiking and Four States Challenge segments.',
  };
  return descriptions[stateCode] || 'Hiking data not available for this state.';
}

/**
 * Get notable destinations/features for a state.
 * @param stateCode - The state code
 * @returns Array of notable location names
 */
export function getNotableDestinations(stateCode: string): string[] {
  const destinations: Record<string, string[]> = {
    MD: [
      'Chesapeake Bay',
      'Patuxent River',
      'Conowingo Dam',
      'Back Bay NWR',
      'Blackwater NWR',
      'Assateague Island',
      'Deep Creek Lake',
      'Savage Mill Trail',
    ],
    VA: [
      'Shenandoah National Park',
      'James River',
      'New River',
      'False Cape State Park',
      'Grayson Highlands State Park',
      'Mount Rogers',
      'Appalachian Trail',
      'Great Falls Park',
    ],
    PA: [
      'Lake Erie',
      'Allegheny National Forest',
      'Ricketts Glen State Park',
      'Laurel Highlands',
      'Delaware Water Gap',
      'Hickory Run State Park',
      'French Creek',
      'Susquehanna River',
    ],
  };
  return destinations[stateCode] || [];
}
