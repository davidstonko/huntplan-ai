/**
 * Re-source Approximate Hunting Land Polygons
 *
 * Identifies all hunting lands with approximate boundaries (boundaryApproximate: true)
 * and attempts to replace them with authoritative geometries from the MD DNR
 * Public_View_Hunting_Lands ArcGIS layer.
 *
 * STATUS (2026-04-18): The Public_View_Hunting_Lands layer does NOT exist as a public
 * ArcGIS service. Investigation verified that njFNhDsUCentVYJW service catalog contains
 * no such layer, and alternative DNR endpoints (dnr.geodata.md.gov, data.imap.maryland.gov)
 * also do not expose this data. The authoritative polygon data is not publicly available.
 *
 * Produces a CSV report of:
 * - (a) Found approximate lands in marylandPublicLands.ts (currently 17 lands)
 * - (b) Still-approximate lands (reason: dnr_layer_unavailable)
 *
 * Usage: npx ts-node scripts/resource_approximate_polygons.ts
 */

import * as fs from 'fs';
import * as path from 'path';

interface StillApproximateLand {
  id: string;
  name: string;
  designation: string;
  reason: string;
}

interface DNRFeature {
  properties?: Record<string, any>;
  geometry?: {
    type: string;
    coordinates: any;
  };
}

/**
 * Use regex to find approximate lands without full JSON parsing
 */
function findApproximateLands(): Array<{ id: string; name: string; designation: string }> {
  const filePath = path.join(process.cwd(), 'src', 'data', 'marylandPublicLands.ts');
  const content = fs.readFileSync(filePath, 'utf-8');

  const results: Array<{ id: string; name: string; designation: string }> = [];

  // Split by land records (each starts with {"id":)
  // This is fragile but works for this audit-only use case
  const lines = content.split('\n');

  let currentLandId = '';
  let currentLandName = '';
  let currentDesignation = '';
  let inApproximateLand = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Extract id
    const idMatch = line.match(/"id":"([^"]+)"/);
    if (idMatch) {
      currentLandId = idMatch[1];
    }

    // Extract name
    const nameMatch = line.match(/"name":"([^"]+)"/);
    if (nameMatch) {
      currentLandName = nameMatch[1];
    }

    // Extract designation
    const designMatch = line.match(/"designation":"([^"]+)"/);
    if (designMatch) {
      currentDesignation = designMatch[1];
    }

    // Check for boundaryApproximate flag
    if (line.includes('boundaryApproximate')) {
      if (currentLandId && currentLandName && currentDesignation) {
        results.push({
          id: currentLandId,
          name: currentLandName,
          designation: currentDesignation,
        });
        inApproximateLand = true;
      }
    }
  }

  return results;
}

/**
 * Fetch hunting lands from MD DNR ArcGIS FeatureServer.
 *
 * NOTE (2026-04-18): Investigation found that the Public_View_Hunting_Lands layer
 * does NOT exist in the njFNhDsUCentVYJW ArcGIS service. Verified by querying the
 * service catalog at https://services.arcgis.com/njFNhDsUCentVYJW/arcgis/rest/services?f=json
 * which returned 1000+ services but no "Public_View_Hunting_Lands" match.
 *
 * Alternative DNR endpoints (dnr.geodata.md.gov, data.imap.maryland.gov) also do not
 * expose a public polygon layer for hunting lands as of 2026-04-18.
 *
 * The authoritative hunting lands boundary data is not publicly available via ArcGIS REST API.
 * The app must continue using the manually-maintained marylandPublicLands.ts and
 * marylandLandGeoJSON.ts data files.
 */
async function fetchDNRHuntingLands(): Promise<Map<string, DNRFeature>> {
  const url =
    'https://services.arcgis.com/njFNhDsUCentVYJW/arcgis/rest/services/Public_View_Hunting_Lands/FeatureServer/0/query?where=1=1&outFields=*&f=geojson&resultRecordCount=50000';

  try {
    console.log('Fetching authoritative hunting lands from DNR ArcGIS...');
    console.log(`  URL: ${url}`);
    console.log(`  NOTE: This endpoint does NOT exist (verified 2026-04-18). Returning empty map.`);
    return new Map();
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.log(`  Fetch error: ${msg}`);
    return new Map();
  }
}

/**
 * Match approximate lands to DNR features.
 */
function matchApproximateLands(
  approximateLands: Array<{ id: string; name: string; designation: string }>,
  dnrFeatures: Map<string, DNRFeature>
): { resolved: Array<{ id: string; name: string; designation: string; geomType: string }>, stillApproximate: StillApproximateLand[] } {
  const resolved: Array<{ id: string; name: string; designation: string; geomType: string }> = [];
  const stillApproximate: StillApproximateLand[] = [];

  for (const land of approximateLands) {
    const dnrFeature = dnrFeatures.get(land.id);

    if (dnrFeature && dnrFeature.geometry) {
      const geomType = dnrFeature.geometry.type;
      resolved.push({
        id: land.id,
        name: land.name,
        designation: land.designation,
        geomType,
      });
    } else {
      stillApproximate.push({
        id: land.id,
        name: land.name,
        designation: land.designation,
        reason: dnrFeatures.size === 0 ? 'dnr_layer_unavailable' : 'no_matching_dnr_record',
      });
    }
  }

  return { resolved, stillApproximate };
}

function generateCSVReport(
  resolved: Array<{ id: string; name: string; designation: string; geomType: string }>,
  stillApproximate: StillApproximateLand[]
): string {
  const header = 'id,name,designation,status,details\n';

  const resolvedRows = resolved
    .map(
      (r) => `"${r.id}","${r.name}","${r.designation}","RESOLVED","authoritative_${r.geomType.toLowerCase()}_matched"`
    )
    .join('\n');

  const stillRows = stillApproximate
    .map((r) => `"${r.id}","${r.name}","${r.designation}","STILL_APPROXIMATE","${r.reason}"`)
    .join('\n');

  return header + resolvedRows + (resolvedRows && stillRows ? '\n' : '') + stillRows;
}

async function main() {
  console.log('=== Re-source Approximate Hunting Land Polygons ===\n');

  // Find approximate lands
  const approximateLands = findApproximateLands();

  console.log(`Found ${approximateLands.length} lands with approximate boundaries`);

  if (approximateLands.length === 0) {
    console.log('No approximate lands to re-source.');
    return;
  }

  console.log('\nApproximate lands (first 20):');
  approximateLands.slice(0, 20).forEach((l) => {
    console.log(`  - ${l.id}: ${l.name} (${l.designation})`);
  });
  if (approximateLands.length > 20) {
    console.log(`  ... and ${approximateLands.length - 20} more`);
  }

  console.log('\n--- Fetching Authoritative Boundaries ---\n');
  const dnrFeatures = await fetchDNRHuntingLands();

  const { resolved, stillApproximate } = matchApproximateLands(approximateLands, dnrFeatures);

  console.log(`\n--- Matching Results ---`);
  console.log(`  Resolved from authoritative layer: ${resolved.length}`);
  console.log(`  Still approximate: ${stillApproximate.length}`);

  if (resolved.length > 0) {
    console.log(`\nResolved lands (first 10):`);
    resolved.slice(0, 10).forEach((r) => {
      console.log(`  - ${r.id}: ${r.name} (${r.geomType})`);
    });
    if (resolved.length > 10) {
      console.log(`  ... and ${resolved.length - 10} more`);
    }
  }

  if (stillApproximate.length > 0) {
    console.log(`\nStill approximate (first 15 of ${stillApproximate.length}):`);
    stillApproximate.slice(0, 15).forEach((s) => {
      console.log(`  - ${s.id}: ${s.name} (${s.reason})`);
    });
    if (stillApproximate.length > 15) {
      console.log(`  ... and ${stillApproximate.length - 15} more`);
    }
  }

  // Write CSV report
  const csvContent = generateCSVReport(resolved, stillApproximate);
  const reportPath = path.join(process.cwd(), 'scripts', 'output', 'approximate_polygon_report.csv');

  fs.mkdirSync(path.dirname(reportPath), { recursive: true });
  fs.writeFileSync(reportPath, csvContent, 'utf-8');

  console.log(`\nReport written to: ${reportPath}`);
  console.log('\nNEXT STEPS:');
  console.log(
    `1. Review the CSV report for lands that could be manually re-sourced from DNR PDFs`
  );
  console.log(`2. For ${stillApproximate.length} still-approximate lands, consider:`);
  console.log(`   - Checking DNR website detail pages for polygon PDFs`);
  console.log(
    `   - Requesting authoritative boundaries from DNR GIS team if publicly unavailable`
  );
  console.log(`3. Once resolved, update marylandPublicLands.ts and marylandLandGeoJSON.ts`);
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
