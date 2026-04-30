/**
 * @file cwdZonesData.ts
 * @description CWD (Chronic Wasting Disease) Management Zone boundaries and metadata for Maryland.
 *
 * The 7 CWDMA (CWD Management Area) counties represent areas with confirmed or suspected CWD
 * presence, requiring special handling of deer carcasses and mandatory reporting.
 *
 * @module Data
 * @version 1.0.0
 */

/**
 * CWD Information and regulations
 */
export const CWD_INFO = {
  counties: [
    'Allegany',
    'Baltimore',
    'Carroll',
    'Frederick',
    'Howard',
    'Montgomery',
    'Washington',
  ],
  addedRecently: 'Howard County added 2025',
  carcassRules:
    'No whole carcasses outside CWDMA. Deboned meat, quarters without spinal column OK.',
  testingContact: '301-334-4255',
  url: 'https://dnr.maryland.gov/wildlife/Pages/hunt_trap/CWD.aspx',
};

/**
 * CWD Zone GeoJSON FeatureCollection
 *
 * Each feature represents an approximate bounding polygon for a CWDMA county.
 * Coordinates are approximate county boundaries suitable for zone visualization.
 * Used to render semi-transparent overlay on map when CWD zones are enabled.
 */
export const CWD_ZONES_GEOJSON = {
  type: 'FeatureCollection' as const,
  features: [
    {
      type: 'Feature' as const,
      id: 'allegany',
      properties: {
        id: 'allegany',
        name: 'Allegany County',
        county: 'Allegany',
        color: '#B71C1C',
      },
      geometry: {
        type: 'Polygon' as const,
        coordinates: [
          [
            [-78.83, 39.47],
            [-78.27, 39.47],
            [-78.27, 39.72],
            [-78.83, 39.72],
            [-78.83, 39.47],
          ],
        ],
      },
    },
    {
      type: 'Feature' as const,
      id: 'baltimore',
      properties: {
        id: 'baltimore',
        name: 'Baltimore County',
        county: 'Baltimore',
        color: '#B71C1C',
      },
      geometry: {
        type: 'Polygon' as const,
        coordinates: [
          [
            [-76.83, 39.25],
            [-76.33, 39.25],
            [-76.33, 39.72],
            [-76.83, 39.72],
            [-76.83, 39.25],
          ],
        ],
      },
    },
    {
      type: 'Feature' as const,
      id: 'carroll',
      properties: {
        id: 'carroll',
        name: 'Carroll County',
        county: 'Carroll',
        color: '#B71C1C',
      },
      geometry: {
        type: 'Polygon' as const,
        coordinates: [
          [
            [-77.27, 39.47],
            [-76.83, 39.47],
            [-76.83, 39.67],
            [-77.27, 39.67],
            [-77.27, 39.47],
          ],
        ],
      },
    },
    {
      type: 'Feature' as const,
      id: 'frederick',
      properties: {
        id: 'frederick',
        name: 'Frederick County',
        county: 'Frederick',
        color: '#B71C1C',
      },
      geometry: {
        type: 'Polygon' as const,
        coordinates: [
          [
            [-77.67, 39.27],
            [-77.17, 39.27],
            [-77.17, 39.72],
            [-77.67, 39.72],
            [-77.67, 39.27],
          ],
        ],
      },
    },
    {
      type: 'Feature' as const,
      id: 'howard',
      properties: {
        id: 'howard',
        name: 'Howard County',
        county: 'Howard',
        color: '#B71C1C',
      },
      geometry: {
        type: 'Polygon' as const,
        coordinates: [
          [
            [-77.05, 39.10],
            [-76.70, 39.10],
            [-76.70, 39.35],
            [-77.05, 39.35],
            [-77.05, 39.10],
          ],
        ],
      },
    },
    {
      type: 'Feature' as const,
      id: 'montgomery',
      properties: {
        id: 'montgomery',
        name: 'Montgomery County',
        county: 'Montgomery',
        color: '#B71C1C',
      },
      geometry: {
        type: 'Polygon' as const,
        coordinates: [
          [
            [-77.50, 38.93],
            [-77.00, 38.93],
            [-77.00, 39.35],
            [-77.50, 39.35],
            [-77.50, 38.93],
          ],
        ],
      },
    },
    {
      type: 'Feature' as const,
      id: 'washington',
      properties: {
        id: 'washington',
        name: 'Washington County',
        county: 'Washington',
        color: '#B71C1C',
      },
      geometry: {
        type: 'Polygon' as const,
        coordinates: [
          [
            [-77.93, 39.43],
            [-77.57, 39.43],
            [-77.57, 39.72],
            [-77.93, 39.72],
            [-77.93, 39.43],
          ],
        ],
      },
    },
  ],
};
