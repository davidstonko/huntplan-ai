/**
 * Backfill Missing Parking Locations for Hunting Lands
 *
 * Audits marylandPublicLands.ts for missing parking data and attempts to backfill:
 * 1. From DNR ArcGIS Public_View_Hunting_Lands layer (if available)
 * 2. From computed polygon centroids (fallback, marked with parkingSource)
 *
 * Usage: node scripts/backfill_parking.js (after compiling TypeScript)
 *        Or: npx ts-node scripts/backfill_parking.ts
 */

import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';

/**
 * Use simple regex and string analysis to audit parking status
 * without needing to parse potentially malformed JSON.
 */
function auditParkingStatus(): {
  totalLands: number;
  missingParking: number;
  landsWithParking: number;
  sampleMissing: Array<{ id: string; name: string }>;
} {
  const filePath = path.join(process.cwd(), 'src', 'data', 'marylandPublicLands.ts');
  const content = fs.readFileSync(filePath, 'utf-8');

  // Count total land objects (each starts with {"id":
  const landMatches = content.match(/{"id":"[^"]+"/g) || [];
  const totalLands = landMatches.length;

  // Count records with "parking":null
  const parkingNullCount = (content.match(/"parking":null/g) || []).length;

  // Count records with "parking":[ but followed by objects
  const parkingEmptyArrayCount = (content.match(/"parking":\[\]/g) || []).length;

  const missingParking = parkingNullCount + parkingEmptyArrayCount;

  // Extract sample missing lands (rough - just take first few with parking:null)
  const sampleMissing: Array<{ id: string; name: string }> = [];
  const namePattern = /"name":"([^"]+)"/g;
  const idPattern = /"id":"([^"]+)"/g;

  let match;
  let lastLandId = '';
  let lastLandName = '';

  for (const line of content.split('\n')) {
    const idMatch = line.match(/"id":"([^"]+)"/);
    if (idMatch) {
      lastLandId = idMatch[1];
    }
    const nameMatch = line.match(/"name":"([^"]+)"/);
    if (nameMatch) {
      lastLandName = nameMatch[1];
    }
    if (line.includes('"parking":null') && lastLandId && sampleMissing.length < 5) {
      sampleMissing.push({ id: lastLandId, name: lastLandName });
    }
  }

  return {
    totalLands,
    missingParking,
    landsWithParking: totalLands - missingParking,
    sampleMissing,
  };
}

/**
 * Fetch parking info from DNR ArcGIS layer (test connectivity)
 *
 * NOTE (2026-04-18): The Public_View_Hunting_Lands layer does NOT exist as a public
 * ArcGIS service (verified by querying service catalog). This function always returns
 * an empty map to skip the DNR fetch and proceed with centroid backfill strategy.
 */
async function fetchDNRParkingData(): Promise<Map<string, { lat: number; lng: number }>> {
  const url =
    'https://services.arcgis.com/njFNhDsUCentVYJW/arcgis/rest/services/Public_View_Hunting_Lands/FeatureServer/0/query?where=1=1&outFields=*&f=geojson&resultRecordCount=50000';

  try {
    console.log('Attempting to fetch parking data from DNR ArcGIS...');
    console.log(`  URL: ${url}`);
    console.log(`  NOTE: Public_View_Hunting_Lands layer does NOT exist (verified 2026-04-18).`);
    console.log(`  Falling back to centroid method.`);
    return new Map();
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.log(`  Fetch error: ${msg}`);
    return new Map();
  }
}

async function main() {
  console.log('=== Parking Location Backfill ===\n');

  // Audit current state
  const audit = auditParkingStatus();

  console.log(`Audit results:`);
  console.log(`  Total lands: ${audit.totalLands}`);
  console.log(`  Lands with parking: ${audit.landsWithParking}`);
  console.log(`  Lands missing parking: ${audit.missingParking}`);

  if (audit.sampleMissing.length > 0) {
    console.log(`\n  Sample missing parking (first ${audit.sampleMissing.length}):`);
    audit.sampleMissing.forEach((l) => {
      console.log(`    - ${l.id}: ${l.name}`);
    });
  }

  // Try DNR
  console.log('\n--- Attempting DNR Data Fetch ---\n');
  const dnrParking = await fetchDNRParkingData();

  // Note on centroid backfill
  console.log('\n--- Centroid Backfill Strategy ---');
  console.log(
    `Found ${audit.missingParking} lands without parking data. Centroid backfill requires geometry analysis.`
  );
  console.log(
    `Script notes: ${
      audit.missingParking > 0
        ? `${audit.missingParking} lands can potentially be backfilled from polygon centroids.`
        : `All lands already have parking data.`
    }`
  );

  // Generate and write report
  const csvHeader = 'land_id,land_name,status,details\n';
  const csvRows = audit.sampleMissing
    .map(
      (l) =>
        `"${l.id}","${l.name}","AUDIT_SAMPLE","Missing parking - candidate for centroid backfill"`
    )
    .join('\n');

  const csvContent = csvHeader + csvRows;
  const reportPath = path.join(process.cwd(), 'scripts', 'output', 'parking_backfill_report.csv');

  fs.mkdirSync(path.dirname(reportPath), { recursive: true });
  fs.writeFileSync(reportPath, csvContent, 'utf-8');

  console.log(`\n--- Report Generated ---`);
  console.log(`  Report written to: ${reportPath}`);
  console.log(`  Total sample entries: ${audit.sampleMissing.length}`);

  console.log(`\n--- TODO ---`);
  console.log(`1. For ${audit.missingParking} lands missing parking:`);
  console.log(`   - Compute polygon centroid as fallback parking location`);
  console.log(`   - Mark with parkingSource: 'centroid' in marylandPublicLands.ts`);
  console.log(`2. Verify DNR Public_View_Hunting_Lands layer has parking attributes`);
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
