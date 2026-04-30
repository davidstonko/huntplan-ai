/**
 * @file artificialReefData.ts
 * @description Maryland artificial reef locations and snakehead hotspot data.
 * Exports GeoJSON FeatureCollections for reef and snakehead overlay layers.
 *
 * Artificial Reef Sites: Known Maryland fisheries-enhanced reef structures
 * Snakehead Hotspots: High-concentration invasive species fishing areas
 */

/**
 * Artificial Reef Sites GeoJSON
 * Point features representing known Maryland artificial reef locations
 * Used for FishMapScreen overlay layer
 */
export const ARTIFICIAL_REEFS_GEOJSON = {
  type: 'FeatureCollection' as const,
  features: [
    {
      type: 'Feature' as const,
      id: 'reef_1',
      properties: {
        name: 'Cedar Point Reef',
        description: 'Patuxent River area structure',
        color: '#FF6F00', // Amber
      },
      geometry: {
        type: 'Point' as const,
        coordinates: [-76.37, 38.31],
      },
    },
    {
      type: 'Feature' as const,
      id: 'reef_2',
      properties: {
        name: 'Cedarhurst Reef',
        description: 'Upper Bay reef structure',
        color: '#FF6F00',
      },
      geometry: {
        type: 'Point' as const,
        coordinates: [-76.46, 38.84],
      },
    },
    {
      type: 'Feature' as const,
      id: 'reef_3',
      properties: {
        name: 'Coble Reef',
        description: 'Solomons area, 5 acres',
        color: '#FF6F00',
      },
      geometry: {
        type: 'Point' as const,
        coordinates: [-76.33, 38.35],
      },
    },
    {
      type: 'Feature' as const,
      id: 'reef_4',
      properties: {
        name: 'Point No Point Reef',
        description: 'Eastern Shore structure',
        color: '#FF6F00',
      },
      geometry: {
        type: 'Point' as const,
        coordinates: [-76.22, 38.13],
      },
    },
    {
      type: 'Feature' as const,
      id: 'reef_5',
      properties: {
        name: 'Chesapeake Beach Reef',
        description: 'Sandy Point area reef',
        color: '#FF6F00',
      },
      geometry: {
        type: 'Point' as const,
        coordinates: [-76.53, 38.68],
      },
    },
    {
      type: 'Feature' as const,
      id: 'reef_6',
      properties: {
        name: 'Tolchester Reef',
        description: 'Upper Bay structure',
        color: '#FF6F00',
      },
      geometry: {
        type: 'Point' as const,
        coordinates: [-76.24, 39.21],
      },
    },
    {
      type: 'Feature' as const,
      id: 'reef_7',
      properties: {
        name: 'Love Point Reef',
        description: 'Chester River area',
        color: '#FF6F00',
      },
      geometry: {
        type: 'Point' as const,
        coordinates: [-76.32, 39.05],
      },
    },
    {
      type: 'Feature' as const,
      id: 'reef_8',
      properties: {
        name: 'Sandy Point Reef',
        description: 'Upper Bay reef',
        color: '#FF6F00',
      },
      geometry: {
        type: 'Point' as const,
        coordinates: [-76.38, 39.01],
      },
    },
  ],
};

/**
 * Snakehead Hotspot Sites GeoJSON
 * Point features representing high-concentration invasive snakehead fishing areas
 * Used for FishMapScreen overlay layer
 */
export const SNAKEHEAD_HOTSPOTS_GEOJSON = {
  type: 'FeatureCollection' as const,
  features: [
    {
      type: 'Feature' as const,
      id: 'snakehead_1',
      properties: {
        name: 'Blackwater NWR',
        notes: 'Largest US population, excellent bass fishing',
        color: '#4A148C', // Purple
      },
      geometry: {
        type: 'Point' as const,
        coordinates: [-76.07, 38.45],
      },
    },
    {
      type: 'Feature' as const,
      id: 'snakehead_2',
      properties: {
        name: 'Mattawoman Creek',
        notes: 'Big fish, high pressure area',
        color: '#4A148C',
      },
      geometry: {
        type: 'Point' as const,
        coordinates: [-77.07, 38.56],
      },
    },
    {
      type: 'Feature' as const,
      id: 'snakehead_3',
      properties: {
        name: 'Pomonkey Creek',
        notes: 'Hidden gem, less pressure',
        color: '#4A148C',
      },
      geometry: {
        type: 'Point' as const,
        coordinates: [-77.00, 38.55],
      },
    },
    {
      type: 'Feature' as const,
      id: 'snakehead_4',
      properties: {
        name: 'Potomac River - Piscataway',
        notes: 'Tidal creek system',
        color: '#4A148C',
      },
      geometry: {
        type: 'Point' as const,
        coordinates: [-77.00, 38.69],
      },
    },
    {
      type: 'Feature' as const,
      id: 'snakehead_5',
      properties: {
        name: 'Nanjemoy Creek',
        notes: 'Winding creek, tidal access',
        color: '#4A148C',
      },
      geometry: {
        type: 'Point' as const,
        coordinates: [-77.18, 38.44],
      },
    },
  ],
};
