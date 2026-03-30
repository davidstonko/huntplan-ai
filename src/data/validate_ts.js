// Quick validation of generated TypeScript
const fs = require('fs');
const path = require('path');

const tsFile = 'marylandPublicLands.ts';
const content = fs.readFileSync(tsFile, 'utf8');

// Basic syntax checks
const checks = [
  { regex: /export type LandDesignation/, desc: 'LandDesignation type export' },
  { regex: /export interface MarylandPublicLand/, desc: 'MarylandPublicLand interface' },
  { regex: /export interface ShootingRange/, desc: 'ShootingRange interface' },
  { regex: /export const marylandPublicLands.*=.*\[/, desc: 'marylandPublicLands export' },
  { regex: /export const shootingRanges.*=.*\[/, desc: 'shootingRanges export' },
  { regex: /export function getLandsByCounty/, desc: 'getLandsByCounty function' },
  { regex: /export function searchLands/, desc: 'searchLands function' },
  { regex: /export function filterLands/, desc: 'filterLands function' },
  { regex: /export function getRangesByCounty/, desc: 'getRangesByCounty function' },
  { regex: /export const DATA_STATS/, desc: 'DATA_STATS export' },
];

console.log('Validating TypeScript file...\n');
let passed = 0;
let failed = 0;

checks.forEach(check => {
  if (check.regex.test(content)) {
    console.log(`✓ ${check.desc}`);
    passed++;
  } else {
    console.log(`✗ ${check.desc}`);
    failed++;
  }
});

// Count data entries
const landsMatch = content.match(/export const marylandPublicLands.*?\] *;/s);
if (landsMatch) {
  const lands = JSON.parse('[' + landsMatch[0].split('= [')[1].split('];')[0] + ']');
  console.log(`\n✓ Found ${lands.length} land entries`);
  
  // Sample first entry
  console.log(`\nSample land entry:`);
  console.log(JSON.stringify(lands[0], null, 2).substring(0, 300) + '...');
}

const rangesMatch = content.match(/export const shootingRanges.*?\] *;/s);
if (rangesMatch) {
  const ranges = JSON.parse('[' + rangesMatch[0].split('= [')[1].split('];')[0] + ']');
  console.log(`\n✓ Found ${ranges.length} shooting range entries`);
}

console.log(`\n---\nResults: ${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);
