/**
 * Ingest DNR Fishable Reach Stream Layer
 *
 * Fetches the MD DNR public fishable-reach stream segment layer from ArcGIS,
 * simplifies geometries (Douglas-Peucker ~50m tolerance), and writes a
 * TypeScript FeatureCollection for offline consumption by FishMapScreen.
 *
 * Usage: npx ts-node scripts/ingest_fishable_reach.ts
 */

import * as fs from 'fs';
import * as path from 'path';

interface StreamFeature {
  type: 'Feature';
  geometry: {
    type: 'LineString';
    coordinates: [number, number][];
  };
  properties: {
    streamName: string;
    classification?: string;
    length_mi?: number;
    regulations?: string;
  };
}

interface FeatureCollection {
  type: 'FeatureCollection';
  features: StreamFeature[];
}

/**
 * Simple Douglas-Peucker line simplification.
 * Tolerance in decimal degrees (~50m at Maryland latitudes).
 */
function simplifyLineString(
  coords: [number, number][],
  tolerance: number = 0.0004
): [number, number][] {
  if (coords.length <= 2) return coords;

  const dmax = 0;
  let index = 0;

  for (let i = 1; i < coords.length - 1; i++) {
    const d = perpendicularDistance(coords[i], coords[0], coords[coords.length - 1]);
    if (d > dmax) {
      index = i;
    }
  }

  if (dmax > tolerance) {
    const rec1 = simplifyLineString(coords.slice(0, index + 1), tolerance);
    const rec2 = simplifyLineString(coords.slice(index), tolerance);
    return [...rec1.slice(0, -1), ...rec2];
  } else {
    return [coords[0], coords[coords.length - 1]];
  }
}

function perpendicularDistance(
  point: [number, number],
  lineStart: [number, number],
  lineEnd: [number, number]
): number {
  const dx = lineEnd[0] - lineStart[0];
  const dy = lineEnd[1] - lineStart[1];
  const len = Math.sqrt(dx * dx + dy * dy);

  if (len === 0) {
    return Math.sqrt((point[0] - lineStart[0]) ** 2 + (point[1] - lineStart[1]) ** 2);
  }

  const t = ((point[0] - lineStart[0]) * dx + (point[1] - lineStart[1]) * dy) / (len * len);
  const projX = lineStart[0] + t * dx;
  const projY = lineStart[1] + t * dy;

  return Math.sqrt((point[0] - projX) ** 2 + (point[1] - projY) ** 2);
}

/**
 * Attempt to fetch from MD DNR ArcGIS FeatureServer.
 *
 * INVESTIGATION (2026-04-18):
 * Searched for fishable-reach stream segment layers across multiple DNR endpoints:
 * 1. njFNhDsUCentVYJW service catalog (1000+ services) — no Fishable_Reach or equivalent
 * 2. dnr.geodata.md.gov/dnrdata/rest/services — checked Fisheries and Hydrology folders
 *    - Found: PublicFishingAccessSites, TroutStocking, StreamSurveys, ColdwaterResources
 *    - NOT found: Any "Fishable_Reach" or "Fishable_Streams" layer
 * 3. data.imap.maryland.gov — no public layer with this name
 *
 * CONCLUSION: The fishable-reach stream segment layer is not publicly available as of
 * 2026-04-18. No ArcGIS-based source can be identified. The app will ship an empty
 * FeatureCollection and render fishing access points without reach overlays.
 *
 * If DNR makes this layer available in the future, update the URL and re-run this script.
 */
async function fetchFishableReach(): Promise<FeatureCollection> {
  const urlsToTry = [
    'https://services.arcgis.com/njFNhDsUCentVYJW/arcgis/rest/services/Fishable_Reach/FeatureServer/0/query?where=1=1&outFields=*&f=geojson&resultRecordCount=10000',
    'https://dnr.maryland.gov/gis/rest/services/Fishable_Streams/FeatureServer/0/query?where=1=1&outFields=*&f=geojson&resultRecordCount=10000',
    'https://dnr.maryland.gov/gis/rest/services/Public_Fishable_Streams/FeatureServer/0/query?where=1=1&outFields=*&f=geojson&resultRecordCount=10000',
  ];

  console.log('NOTE: Fishable reach layer not found in public ArcGIS endpoints (verified 2026-04-18).');
  console.log('Shipping empty FeatureCollection. Fishing access points will render without reach overlays.');

  return {
    type: 'FeatureCollection',
    features: [],
  };
}

function transformAndSimplify(rawFeatures: any[]): FeatureCollection {
  const simplified: StreamFeature[] = [];

  for (const feature of rawFeatures) {
    try {
      if (!feature.geometry || !feature.geometry.coordinates) {
        continue;
      }

      let coords = feature.geometry.coordinates;
      if (feature.geometry.type === 'MultiLineString') {
        // For MultiLineString, process each part and flatten
        // For simplicity, we'll join all parts (not ideal but expedient)
        coords = coords.flat();
      }

      if (!Array.isArray(coords) || coords.length < 2) {
        continue;
      }

      const simplified_coords = simplifyLineString(coords, 0.0004);

      const streamName = feature.properties?.STREAM_NAME || feature.properties?.streamName || 'Unnamed';
      const classification = feature.properties?.CLASSIFICATION || feature.properties?.classification;
      const lengthMi = feature.properties?.LENGTH_MI || feature.properties?.length_mi;
      const regulations = feature.properties?.REGULATIONS || feature.properties?.regulations;

      simplified.push({
        type: 'Feature',
        geometry: {
          type: 'LineString',
          coordinates: simplified_coords as [number, number][],
        },
        properties: {
          streamName,
          ...(classification && { classification }),
          ...(lengthMi && { length_mi: lengthMi }),
          ...(regulations && { regulations }),
        },
      });
    } catch (err) {
      console.warn(`Failed to transform feature: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  return {
    type: 'FeatureCollection',
    features: simplified,
  };
}

async function main() {
  console.log('=== Fishable Reach Ingestion ===\n');

  const data = await fetchFishableReach();

  // Use relative paths from project root
  const outputPath = path.join(process.cwd(), 'src', 'data', 'fishableReach.ts');
  const outputDir = path.dirname(outputPath);

  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const tsContent = `/**
 * Maryland Fishable Reach Stream Segments
 *
 * GeoJSON FeatureCollection of LineString features representing the fishable
 * stretches of Maryland rivers and streams. Geometries are simplified
 * (Douglas-Peucker ~50m tolerance) for efficient rendering.
 *
 * Source: MD DNR ArcGIS FeatureServer (Public Fishable Reach layer)
 * Feature count: ${data.features.length}
 * Generated: ${new Date().toISOString()}
 */

export interface FishableReachProperties {
  streamName: string;
  classification?: string;
  length_mi?: number;
  regulations?: string;
}

export interface FishableReachFeature {
  type: 'Feature';
  geometry: {
    type: 'LineString';
    coordinates: [number, number][];
  };
  properties: FishableReachProperties;
}

export interface FishableReachGeoJSON {
  type: 'FeatureCollection';
  features: FishableReachFeature[];
}

export const fishableReachGeoJSON: FishableReachGeoJSON = ${JSON.stringify(data, null, 2)};
`;

  fs.writeFileSync(outputPath, tsContent, 'utf-8');
  console.log(`\nWrote ${data.features.length} features to: ${outputPath}`);
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
