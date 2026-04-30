/**
 * Reservoir Hunting Zones - Baltimore Area
 *
 * GeoJSON data for three CWMA hunting zones around Baltimore reservoirs:
 * - Loch Raven Reservoir (archery/deer only)
 * - Pretty Boy Reservoir (all legal game except waterfowl, archery only)
 * - Liberty Reservoir (all legal game except waterfowl, archery only; hunting prohibited south of Rt 26)
 *
 * Polygons are approximate based on known geographic features and road networks.
 * Coordinate system: WGS84 (EPSG:4326)
 */

import * as GeoJSON from 'geojson';

// ============================================================================
// Type Definitions
// ============================================================================

export interface ReservoirZone {
  id: string;
  name: string;
  reservoirId: string;
  type: 'hunting' | 'safety' | 'no_hunting';
  geojson: GeoJSON.Feature<GeoJSON.Polygon>;
}

export interface ReservoirInfo {
  id: string;
  name: string;
  acresCWMA: number;
  center: [number, number]; // [lng, lat]
  species: string[];
  method: string;
  permitRequired: boolean;
  sundayHunting: boolean;
  regulations: string[];
}

// ============================================================================
// Color Constants
// ============================================================================

export const ZONE_COLORS = {
  hunting: 'rgba(76, 175, 80, 0.2)',
  hunting_border: 'rgba(76, 175, 80, 0.6)',
  safety: 'rgba(255, 152, 0, 0.25)',
  safety_border: 'rgba(255, 152, 0, 0.7)',
  no_hunting: 'rgba(244, 67, 54, 0.2)',
  no_hunting_border: 'rgba(244, 67, 54, 0.6)',
};

// ============================================================================
// LOCH RAVEN RESERVOIR
// Center: 39.4385, -76.5590
// CWMA: ~1,600 acres
// Archery only, deer only
// ============================================================================

// Main hunting zone - land around Loch Raven Reservoir
// Bounded by: Jarrettsville Pike (north), Dulaney Valley Rd (east),
// Loch Raven Drive (south/west)
const LOCH_RAVEN_HUNTING: GeoJSON.Feature<GeoJSON.Polygon> = {
  type: 'Feature',
  properties: {
    name: 'Loch Raven Hunting Zone',
    type: 'hunting',
  },
  geometry: {
    type: 'Polygon',
    coordinates: [
      [
        [-76.5750, 39.4550], // NW corner near Jarrettsville Pike
        [-76.5400, 39.4580], // NE corner
        [-76.5350, 39.4500], // East side
        [-76.5380, 39.4380], // SE side
        [-76.5420, 39.4320], // South
        [-76.5580, 39.4300], // SW
        [-76.5750, 39.4350], // West
        [-76.5750, 39.4550], // Close polygon
      ],
    ],
  },
};

// Safety zone - 50ft shoreline buffer around reservoir
const LOCH_RAVEN_SAFETY: GeoJSON.Feature<GeoJSON.Polygon> = {
  type: 'Feature',
  properties: {
    name: 'Loch Raven Safety Zone (50ft Shoreline Buffer)',
    type: 'safety',
  },
  geometry: {
    type: 'Polygon',
    coordinates: [
      [
        [-76.5550, 39.4450],
        [-76.5450, 39.4460],
        [-76.5440, 39.4390],
        [-76.5460, 39.4340],
        [-76.5550, 39.4330],
        [-76.5600, 39.4360],
        [-76.5600, 39.4420],
        [-76.5550, 39.4450],
      ],
    ],
  },
};

// ============================================================================
// PRETTY BOY RESERVOIR
// Center: 39.5890, -76.7270
// CWMA: ~7,380 acres
// All legal game except waterfowl, archery only
// ============================================================================

// Main hunting zone - Pretty Boy Reservoir watershed
// Bounded by: Rt 137 (north), Priestford Rd (east),
// Rt 140 (south), Middle River (west)
const PRETTY_BOY_HUNTING: GeoJSON.Feature<GeoJSON.Polygon> = {
  type: 'Feature',
  properties: {
    name: 'Pretty Boy Hunting Zone',
    type: 'hunting',
  },
  geometry: {
    type: 'Polygon',
    coordinates: [
      [
        [-76.7500, 39.6150], // NW corner
        [-76.6900, 39.6180], // NE near Priestford Rd
        [-76.6850, 39.5950], // East
        [-76.6900, 39.5700], // SE
        [-76.7100, 39.5600], // South
        [-76.7350, 39.5620], // SW
        [-76.7550, 39.5800], // West
        [-76.7550, 39.6000], // NW
        [-76.7500, 39.6150], // Close polygon
      ],
    ],
  },
};

// Safety zone - 50ft shoreline buffer
const PRETTY_BOY_SAFETY: GeoJSON.Feature<GeoJSON.Polygon> = {
  type: 'Feature',
  properties: {
    name: 'Pretty Boy Safety Zone (50ft Shoreline Buffer)',
    type: 'safety',
  },
  geometry: {
    type: 'Polygon',
    coordinates: [
      [
        [-76.7250, 39.6000],
        [-76.7050, 39.6020],
        [-76.7020, 39.5850],
        [-76.7080, 39.5700],
        [-76.7250, 39.5680],
        [-76.7350, 39.5800],
        [-76.7300, 39.5950],
        [-76.7250, 39.6000],
      ],
    ],
  },
};

// ============================================================================
// LIBERTY RESERVOIR
// Center: 39.4080, -76.8710
// CWMA: ~9,200 acres
// All legal game except waterfowl, archery only
// NO hunting south of Liberty Road (MD Route 26)
// ============================================================================

// Hunting zone - North of Route 26
// Bounded by: Rt 29 (west), Rt 108 (north), areas north of Rt 26
const LIBERTY_HUNTING: GeoJSON.Feature<GeoJSON.Polygon> = {
  type: 'Feature',
  properties: {
    name: 'Liberty Hunting Zone (North of Rt 26)',
    type: 'hunting',
  },
  geometry: {
    type: 'Polygon',
    coordinates: [
      [
        [-76.9200, 39.4400], // NW corner
        [-76.8300, 39.4450], // NE
        [-76.8250, 39.4250], // East
        [-76.8350, 39.4100], // SE, approaching Rt 26
        [-76.8550, 39.4050], // S, along Rt 26
        [-76.8850, 39.4070], // SW
        [-76.9100, 39.4200], // W
        [-76.9200, 39.4400], // Close polygon
      ],
    ],
  },
};

// No hunting zone - South of Route 26 (restricted area)
const LIBERTY_NO_HUNTING: GeoJSON.Feature<GeoJSON.Polygon> = {
  type: 'Feature',
  properties: {
    name: 'Liberty No Hunting Zone (South of Rt 26)',
    type: 'no_hunting',
  },
  geometry: {
    type: 'Polygon',
    coordinates: [
      [
        [-76.9100, 39.4020],
        [-76.8550, 39.4000],
        [-76.8350, 39.4020],
        [-76.8250, 39.3850], // South boundary
        [-76.8350, 39.3700],
        [-76.8650, 39.3680],
        [-76.9000, 39.3850],
        [-76.9100, 39.4020],
      ],
    ],
  },
};

// Safety zone - 50ft shoreline buffer (north of Rt 26)
const LIBERTY_SAFETY: GeoJSON.Feature<GeoJSON.Polygon> = {
  type: 'Feature',
  properties: {
    name: 'Liberty Safety Zone (50ft Shoreline Buffer)',
    type: 'safety',
  },
  geometry: {
    type: 'Polygon',
    coordinates: [
      [
        [-76.8900, 39.4200],
        [-76.8450, 39.4220],
        [-76.8420, 39.4120],
        [-76.8500, 39.4050],
        [-76.8700, 39.4060],
        [-76.8850, 39.4150],
        [-76.8900, 39.4200],
      ],
    ],
  },
};

// ============================================================================
// Reservoir Information
// ============================================================================

export const RESERVOIR_INFO: Record<string, ReservoirInfo> = {
  loch_raven: {
    id: 'loch_raven',
    name: 'Loch Raven Reservoir',
    acresCWMA: 1600,
    center: [-76.5590, 39.4385],
    species: ['Deer'],
    method: 'Archery',
    permitRequired: true,
    sundayHunting: false,
    regulations: [
      'Archery only',
      'Deer only',
      '50-foot shoreline buffer (no hunting)',
      'No hunting on Torrey C. Brown Rail Trail',
      'Portable tree stands only — must remove daily',
      'Free DNR reservoir permit required',
      'No baiting allowed',
      'Monday-Saturday only (no Sunday hunting)',
      '30 min before sunrise to 30 min after sunset',
    ],
  },
  pretty_boy: {
    id: 'pretty_boy',
    name: 'Pretty Boy Reservoir',
    acresCWMA: 7380,
    center: [-76.7270, 39.5890],
    species: ['Deer', 'Turkey', 'Bear', 'Small Game'],
    method: 'Archery',
    permitRequired: true,
    sundayHunting: false,
    regulations: [
      'Archery only',
      'All legal game except waterfowl',
      '50-foot shoreline buffer (no hunting)',
      'Portable tree stands only — must remove daily',
      'Free DNR reservoir permit required',
      'No baiting allowed',
      'Monday-Saturday only (no Sunday hunting)',
      '30 min before sunrise to 30 min after sunset',
    ],
  },
  liberty: {
    id: 'liberty',
    name: 'Liberty Reservoir',
    acresCWMA: 9200,
    center: [-76.8710, 39.4080],
    species: ['Deer', 'Turkey', 'Bear', 'Small Game'],
    method: 'Archery',
    permitRequired: true,
    sundayHunting: false,
    regulations: [
      'Archery only',
      'All legal game except waterfowl',
      'NO HUNTING south of Liberty Road (MD Route 26)',
      '50-foot shoreline buffer (no hunting)',
      'Portable tree stands only — must remove daily',
      'Free DNR reservoir permit required',
      'No baiting allowed',
      'Monday-Saturday only (no Sunday hunting)',
      '30 min before sunrise to 30 min after sunset',
    ],
  },
};

// ============================================================================
// Zone Collections
// ============================================================================

export const RESERVOIR_ZONES: ReservoirZone[] = [
  // Loch Raven
  {
    id: 'loch_raven_hunting',
    name: 'Loch Raven Hunting Zone',
    reservoirId: 'loch_raven',
    type: 'hunting',
    geojson: LOCH_RAVEN_HUNTING,
  },
  {
    id: 'loch_raven_safety',
    name: 'Loch Raven Safety Zone',
    reservoirId: 'loch_raven',
    type: 'safety',
    geojson: LOCH_RAVEN_SAFETY,
  },
  // Pretty Boy
  {
    id: 'pretty_boy_hunting',
    name: 'Pretty Boy Hunting Zone',
    reservoirId: 'pretty_boy',
    type: 'hunting',
    geojson: PRETTY_BOY_HUNTING,
  },
  {
    id: 'pretty_boy_safety',
    name: 'Pretty Boy Safety Zone',
    reservoirId: 'pretty_boy',
    type: 'safety',
    geojson: PRETTY_BOY_SAFETY,
  },
  // Liberty
  {
    id: 'liberty_hunting',
    name: 'Liberty Hunting Zone',
    reservoirId: 'liberty',
    type: 'hunting',
    geojson: LIBERTY_HUNTING,
  },
  {
    id: 'liberty_no_hunting',
    name: 'Liberty No Hunting Zone',
    reservoirId: 'liberty',
    type: 'no_hunting',
    geojson: LIBERTY_NO_HUNTING,
  },
  {
    id: 'liberty_safety',
    name: 'Liberty Safety Zone',
    reservoirId: 'liberty',
    type: 'safety',
    geojson: LIBERTY_SAFETY,
  },
];

// ============================================================================
// Export as GeoJSON FeatureCollections (for easy Mapbox integration)
// ============================================================================

export const LOCH_RAVEN_GEOJSON: GeoJSON.FeatureCollection = {
  type: 'FeatureCollection',
  features: [LOCH_RAVEN_HUNTING, LOCH_RAVEN_SAFETY],
};

export const PRETTY_BOY_GEOJSON: GeoJSON.FeatureCollection = {
  type: 'FeatureCollection',
  features: [PRETTY_BOY_HUNTING, PRETTY_BOY_SAFETY],
};

export const LIBERTY_GEOJSON: GeoJSON.FeatureCollection = {
  type: 'FeatureCollection',
  features: [LIBERTY_HUNTING, LIBERTY_NO_HUNTING, LIBERTY_SAFETY],
};

export const ALL_RESERVOIR_ZONES_GEOJSON: GeoJSON.FeatureCollection = {
  type: 'FeatureCollection',
  features: [
    LOCH_RAVEN_HUNTING,
    LOCH_RAVEN_SAFETY,
    PRETTY_BOY_HUNTING,
    PRETTY_BOY_SAFETY,
    LIBERTY_HUNTING,
    LIBERTY_NO_HUNTING,
    LIBERTY_SAFETY,
  ],
};

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Get color for a zone type
 */
export function getZoneColor(type: 'hunting' | 'safety' | 'no_hunting'): string {
  return ZONE_COLORS[type];
}

/**
 * Get border color for a zone type
 */
export function getZoneBorderColor(
  type: 'hunting' | 'safety' | 'no_hunting'
): string {
  const borderKey = `${type}_border` as keyof typeof ZONE_COLORS;
  return ZONE_COLORS[borderKey];
}

/**
 * Get all zones for a specific reservoir
 */
export function getReservoirZones(
  reservoirId: string
): ReservoirZone[] {
  return RESERVOIR_ZONES.filter((zone) => zone.reservoirId === reservoirId);
}

/**
 * Get reservoir info by ID
 */
export function getReservoirInfo(reservoirId: string): ReservoirInfo | null {
  return RESERVOIR_INFO[reservoirId] || null;
}
