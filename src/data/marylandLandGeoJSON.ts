/**
 * Maryland Public Land GeoJSON Data
 *
 * Approximate polygon boundaries for Maryland WMAs and State Forests.
 * Used as offline fallback when the backend API is unavailable.
 * Coordinates are approximate center-based bounding polygons derived from
 * MD iMap / MD DNR published land boundaries.
 *
 * Each entry maps to an MD_WMAS entry by id and produces a PublicLand-compatible
 * object with geometry for map rendering.
 */

import { PublicLand, GeoJSONGeometry } from '../services/api';
import { MD_WMAS } from './marylandHuntingData';

// ── Approximate polygon boundaries for each WMA ──
// Format: [longitude, latitude] coordinate rings (GeoJSON standard)
// Polygons are simplified bounding shapes near the real boundaries.

interface WMAGeoEntry {
  wmaId: string;
  landType: 'WMA' | 'State Forest' | 'Federal';
  center: [number, number]; // [lon, lat]
  geometry: GeoJSONGeometry;
}

const MD_LAND_GEOMETRIES: WMAGeoEntry[] = [
  {
    wmaId: 'dans_mountain',
    landType: 'WMA',
    center: [-78.87, 39.65],
    geometry: {
      type: 'Polygon',
      coordinates: [[
        [-78.92, 39.62],
        [-78.88, 39.60],
        [-78.82, 39.62],
        [-78.80, 39.65],
        [-78.82, 39.69],
        [-78.87, 39.71],
        [-78.92, 39.69],
        [-78.94, 39.66],
        [-78.92, 39.62],
      ]],
    },
  },
  {
    wmaId: 'savage_river',
    landType: 'WMA',
    center: [-79.10, 39.55],
    geometry: {
      type: 'Polygon',
      coordinates: [[
        [-79.16, 39.52],
        [-79.12, 39.50],
        [-79.06, 39.52],
        [-79.04, 39.55],
        [-79.06, 39.58],
        [-79.10, 39.60],
        [-79.15, 39.58],
        [-79.17, 39.55],
        [-79.16, 39.52],
      ]],
    },
  },
  {
    wmaId: 'green_ridge',
    landType: 'WMA',
    center: [-78.58, 39.65],
    geometry: {
      type: 'Polygon',
      coordinates: [[
        [-78.65, 39.60],
        [-78.60, 39.58],
        [-78.52, 39.60],
        [-78.50, 39.64],
        [-78.52, 39.70],
        [-78.57, 39.72],
        [-78.63, 39.70],
        [-78.66, 39.66],
        [-78.65, 39.60],
      ]],
    },
  },
  {
    wmaId: 'pocomoke',
    landType: 'WMA',
    center: [-75.56, 38.10],
    geometry: {
      type: 'Polygon',
      coordinates: [[
        [-75.62, 38.06],
        [-75.58, 38.04],
        [-75.52, 38.06],
        [-75.50, 38.10],
        [-75.52, 38.14],
        [-75.56, 38.16],
        [-75.61, 38.14],
        [-75.63, 38.10],
        [-75.62, 38.06],
      ]],
    },
  },
  {
    wmaId: 'leconte',
    landType: 'WMA',
    center: [-76.05, 38.50],
    geometry: {
      type: 'Polygon',
      coordinates: [[
        [-76.09, 38.47],
        [-76.06, 38.46],
        [-76.02, 38.47],
        [-76.00, 38.50],
        [-76.02, 38.53],
        [-76.06, 38.54],
        [-76.09, 38.53],
        [-76.10, 38.50],
        [-76.09, 38.47],
      ]],
    },
  },
  {
    wmaId: 'idylwild',
    landType: 'WMA',
    center: [-76.18, 38.78],
    geometry: {
      type: 'Polygon',
      coordinates: [[
        [-76.21, 38.76],
        [-76.19, 38.75],
        [-76.16, 38.76],
        [-76.15, 38.78],
        [-76.16, 38.80],
        [-76.19, 38.81],
        [-76.21, 38.80],
        [-76.22, 38.78],
        [-76.21, 38.76],
      ]],
    },
  },
  {
    wmaId: 'millington',
    landType: 'WMA',
    center: [-75.85, 39.25],
    geometry: {
      type: 'Polygon',
      coordinates: [[
        [-75.90, 39.22],
        [-75.87, 39.21],
        [-75.82, 39.22],
        [-75.80, 39.25],
        [-75.82, 39.28],
        [-75.86, 39.29],
        [-75.90, 39.28],
        [-75.91, 39.25],
        [-75.90, 39.22],
      ]],
    },
  },
  {
    wmaId: 'stoney_creek',
    landType: 'WMA',
    center: [-75.97, 39.55],
    geometry: {
      type: 'Polygon',
      coordinates: [[
        [-76.01, 39.52],
        [-75.98, 39.51],
        [-75.94, 39.52],
        [-75.92, 39.55],
        [-75.94, 39.58],
        [-75.98, 39.59],
        [-76.01, 39.58],
        [-76.02, 39.55],
        [-76.01, 39.52],
      ]],
    },
  },
  {
    wmaId: 'back_river',
    landType: 'WMA',
    center: [-76.47, 39.20],
    geometry: {
      type: 'Polygon',
      coordinates: [[
        [-76.50, 39.18],
        [-76.48, 39.17],
        [-76.45, 39.18],
        [-76.44, 39.20],
        [-76.45, 39.22],
        [-76.48, 39.23],
        [-76.50, 39.22],
        [-76.51, 39.20],
        [-76.50, 39.18],
      ]],
    },
  },
  {
    wmaId: 'morgan_run',
    landType: 'WMA',
    center: [-76.88, 39.42],
    geometry: {
      type: 'Polygon',
      coordinates: [[
        [-76.91, 39.40],
        [-76.89, 39.39],
        [-76.86, 39.40],
        [-76.85, 39.42],
        [-76.86, 39.44],
        [-76.89, 39.45],
        [-76.91, 39.44],
        [-76.92, 39.42],
        [-76.91, 39.40],
      ]],
    },
  },
  {
    wmaId: 'little_bennett',
    landType: 'WMA',
    center: [-77.27, 39.28],
    geometry: {
      type: 'Polygon',
      coordinates: [[
        [-77.30, 39.26],
        [-77.28, 39.25],
        [-77.25, 39.26],
        [-77.24, 39.28],
        [-77.25, 39.30],
        [-77.28, 39.31],
        [-77.30, 39.30],
        [-77.31, 39.28],
        [-77.30, 39.26],
      ]],
    },
  },
  {
    wmaId: 'patapsco',
    landType: 'State Forest',
    center: [-76.75, 39.30],
    geometry: {
      type: 'Polygon',
      coordinates: [[
        [-76.82, 39.26],
        [-76.78, 39.24],
        [-76.72, 39.26],
        [-76.68, 39.29],
        [-76.70, 39.34],
        [-76.75, 39.36],
        [-76.80, 39.34],
        [-76.83, 39.30],
        [-76.82, 39.26],
      ]],
    },
  },
  {
    wmaId: 'elkridge',
    landType: 'WMA',
    center: [-76.82, 39.22],
    geometry: {
      type: 'Polygon',
      coordinates: [[
        [-76.85, 39.20],
        [-76.83, 39.19],
        [-76.80, 39.20],
        [-76.79, 39.22],
        [-76.80, 39.24],
        [-76.83, 39.25],
        [-76.85, 39.24],
        [-76.86, 39.22],
        [-76.85, 39.20],
      ]],
    },
  },
  {
    wmaId: 'washington_monument',
    landType: 'WMA',
    center: [-77.62, 39.50],
    geometry: {
      type: 'Polygon',
      coordinates: [[
        [-77.65, 39.48],
        [-77.63, 39.47],
        [-77.60, 39.48],
        [-77.59, 39.50],
        [-77.60, 39.52],
        [-77.63, 39.53],
        [-77.65, 39.52],
        [-77.66, 39.50],
        [-77.65, 39.48],
      ]],
    },
  },
  {
    wmaId: 'soldiers_delight',
    landType: 'WMA',
    center: [-76.84, 39.41],
    geometry: {
      type: 'Polygon',
      coordinates: [[
        [-76.86, 39.40],
        [-76.85, 39.39],
        [-76.83, 39.40],
        [-76.82, 39.41],
        [-76.83, 39.42],
        [-76.85, 39.43],
        [-76.86, 39.42],
        [-76.87, 39.41],
        [-76.86, 39.40],
      ]],
    },
  },
  {
    wmaId: 'cedarville',
    landType: 'State Forest',
    center: [-76.83, 38.62],
    geometry: {
      type: 'Polygon',
      coordinates: [[
        [-76.87, 38.59],
        [-76.84, 38.58],
        [-76.80, 38.59],
        [-76.78, 38.62],
        [-76.80, 38.65],
        [-76.84, 38.66],
        [-76.87, 38.65],
        [-76.88, 38.62],
        [-76.87, 38.59],
      ]],
    },
  },
  {
    wmaId: 'newman_wma',
    landType: 'WMA',
    center: [-77.35, 39.20],
    geometry: {
      type: 'Polygon',
      coordinates: [[
        [-77.39, 39.17],
        [-77.36, 39.16],
        [-77.32, 39.17],
        [-77.30, 39.20],
        [-77.32, 39.23],
        [-77.36, 39.24],
        [-77.39, 39.23],
        [-77.40, 39.20],
        [-77.39, 39.17],
      ]],
    },
  },
  // ── Additional State Forests ──
  {
    wmaId: 'potomac_sf',
    landType: 'State Forest',
    center: [-79.35, 39.45],
    geometry: {
      type: 'Polygon',
      coordinates: [[
        [-79.42, 39.40],
        [-79.38, 39.38],
        [-79.30, 39.40],
        [-79.27, 39.44],
        [-79.30, 39.50],
        [-79.36, 39.52],
        [-79.41, 39.50],
        [-79.43, 39.45],
        [-79.42, 39.40],
      ]],
    },
  },
  {
    wmaId: 'garrett_sf',
    landType: 'State Forest',
    center: [-79.30, 39.40],
    geometry: {
      type: 'Polygon',
      coordinates: [[
        [-79.37, 39.35],
        [-79.33, 39.33],
        [-79.25, 39.35],
        [-79.22, 39.39],
        [-79.25, 39.45],
        [-79.30, 39.47],
        [-79.36, 39.45],
        [-79.38, 39.40],
        [-79.37, 39.35],
      ]],
    },
  },
  // ── Federal Lands ──
  {
    wmaId: 'blackwater_nwr',
    landType: 'Federal',
    center: [-76.10, 38.42],
    geometry: {
      type: 'Polygon',
      coordinates: [[
        [-76.18, 38.38],
        [-76.14, 38.35],
        [-76.06, 38.36],
        [-76.02, 38.40],
        [-76.04, 38.46],
        [-76.10, 38.49],
        [-76.16, 38.47],
        [-76.19, 38.43],
        [-76.18, 38.38],
      ]],
    },
  },
  {
    wmaId: 'eastern_neck_nwr',
    landType: 'Federal',
    center: [-76.22, 39.03],
    geometry: {
      type: 'Polygon',
      coordinates: [[
        [-76.24, 39.01],
        [-76.23, 39.00],
        [-76.20, 39.01],
        [-76.19, 39.03],
        [-76.20, 39.05],
        [-76.23, 39.06],
        [-76.24, 39.05],
        [-76.25, 39.03],
        [-76.24, 39.01],
      ]],
    },
  },
  {
    wmaId: 'assateague_island',
    landType: 'Federal',
    center: [-75.15, 38.20],
    geometry: {
      type: 'Polygon',
      coordinates: [[
        [-75.18, 38.12],
        [-75.16, 38.10],
        [-75.13, 38.12],
        [-75.12, 38.18],
        [-75.13, 38.25],
        [-75.15, 38.28],
        [-75.17, 38.26],
        [-75.19, 38.20],
        [-75.18, 38.12],
      ]],
    },
  },
];

// ── Additional WMA data for lands not in MD_WMAS ──
const EXTRA_LAND_INFO: Record<string, {
  name: string;
  county: string;
  acres: number;
  allowedSpecies: string[];
  allowedWeapons: string[];
  dnrUrl: string;
}> = {
  potomac_sf: {
    name: 'Potomac State Forest',
    county: 'Garrett',
    acres: 11535,
    allowedSpecies: ['Deer', 'Turkey', 'Bear', 'Grouse', 'Small Game'],
    allowedWeapons: ['Bow', 'Rifle', 'Shotgun', 'Muzzleloader'],
    dnrUrl: 'https://dnr.maryland.gov/forests/Pages/publiclands/western_potomacforest.aspx',
  },
  garrett_sf: {
    name: 'Garrett State Forest',
    county: 'Garrett',
    acres: 7480,
    allowedSpecies: ['Deer', 'Turkey', 'Bear', 'Grouse', 'Small Game'],
    allowedWeapons: ['Bow', 'Rifle', 'Shotgun', 'Muzzleloader'],
    dnrUrl: 'https://dnr.maryland.gov/forests/Pages/publiclands/western_garrettforest.aspx',
  },
  blackwater_nwr: {
    name: 'Blackwater National Wildlife Refuge',
    county: 'Dorchester',
    acres: 28000,
    allowedSpecies: ['Waterfowl', 'Deer'],
    allowedWeapons: ['Bow', 'Shotgun'],
    dnrUrl: 'https://www.fws.gov/refuge/blackwater',
  },
  eastern_neck_nwr: {
    name: 'Eastern Neck National Wildlife Refuge',
    county: 'Kent',
    acres: 2285,
    allowedSpecies: ['Waterfowl', 'Deer'],
    allowedWeapons: ['Bow', 'Shotgun'],
    dnrUrl: 'https://www.fws.gov/refuge/eastern-neck',
  },
  assateague_island: {
    name: 'Assateague Island National Seashore',
    county: 'Worcester',
    acres: 19000,
    allowedSpecies: ['Waterfowl', 'Deer'],
    allowedWeapons: ['Bow', 'Shotgun'],
    dnrUrl: 'https://www.nps.gov/asis/',
  },
};

/**
 * Build a complete PublicLand[] with geometry from local data.
 * Used as fallback when the backend API is unavailable.
 */
export function getLocalLandsWithGeometry(): PublicLand[] {
  return MD_LAND_GEOMETRIES.map((geo, index) => {
    // Try to match with MD_WMAS data first
    const wma = MD_WMAS.find((w) => w.id === geo.wmaId);
    const extra = EXTRA_LAND_INFO[geo.wmaId];

    if (wma) {
      return {
        id: index + 1,
        name: wma.name,
        land_type: geo.landType,
        state: 'Maryland',
        county: wma.county,
        acres: wma.acres,
        managing_agency: geo.landType === 'Federal' ? 'USFWS' : 'MD DNR',
        website_url: wma.dnrUrl,
        huntable_species: wma.allowedSpecies,
        allowed_weapons: wma.allowedWeapons,
        geometry: geo.geometry,
      };
    } else if (extra) {
      return {
        id: index + 1,
        name: extra.name,
        land_type: geo.landType,
        state: 'Maryland',
        county: extra.county,
        acres: extra.acres,
        managing_agency: geo.landType === 'Federal' ? 'USFWS' : 'MD DNR',
        website_url: extra.dnrUrl,
        huntable_species: extra.allowedSpecies,
        allowed_weapons: extra.allowedWeapons,
        geometry: geo.geometry,
      };
    }

    // Fallback — shouldn't happen
    return {
      id: index + 1,
      name: geo.wmaId,
      land_type: geo.landType,
      state: 'Maryland',
      county: 'Unknown',
      acres: null,
      managing_agency: null,
      website_url: null,
      huntable_species: null,
      allowed_weapons: null,
      geometry: geo.geometry,
    };
  });
}
