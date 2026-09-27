#!/usr/bin/env node
/**
 * Generate backend/data/maryland_regulations.json from the app's
 * src/data/marylandHuntingData.ts.
 *
 * WHY THIS EXISTS
 * ---------------
 * The backend's RAG chunks used to be a SECOND, hand-written copy of the
 * season table, carrying the comment "mirrored from mobile TypeScript data".
 * It drifted. On 2026-09-27 the app shipped 2026-2027 dates while the
 * deployed knowledge base still answered with 2025-2026 ones, so the AI tab
 * would have told a hunter that archery season opened 2025-09-06. Wrong
 * season dates are the one class of error this app cannot afford.
 *
 * The fix is not to retype the data, it is to stop having two copies.
 * marylandHuntingData.ts is the single source of truth, and this script
 * projects it into JSON the Python ingest reads. Both files are committed;
 * regs_json_is_current.test.ts fails if they disagree.
 *
 * Usage:  node scripts/export_regulations_json.js [--check]
 *   (no args)  rewrite backend/data/maryland_regulations.json
 *   --check    exit 1 if the committed JSON is stale, printing the diff
 */

const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');

const REPO = path.resolve(__dirname, '..');
const TS_SOURCE = path.join(REPO, 'src/data/marylandHuntingData.ts');
const OUT = path.join(REPO, 'backend/data/maryland_regulations.json');

function loadDataModule() {
  // marylandHuntingData.ts is pure data with no imports, so it transpiles
  // and loads standalone. Kept deliberately dependency-free: no ts-node, no
  // tsx, nothing that has to survive an npm install on a build box.
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'mdregs-'));
  try {
    execFileSync(
      path.join(REPO, 'node_modules/.bin/tsc'),
      [TS_SOURCE, '--outDir', tmp, '--module', 'commonjs', '--target', 'es2020',
       '--skipLibCheck'],
      { stdio: 'pipe' },
    );
    return require(path.join(tmp, 'marylandHuntingData.js'));
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
}

function build(data) {
  const {
    REGULATIONS_META, MD_SEASONS, MD_WMAS, MD_COUNTIES, MD_BAG_LIMITS,
  } = data;

  if (!REGULATIONS_META || !Array.isArray(MD_SEASONS) || !MD_SEASONS.length) {
    throw new Error('marylandHuntingData.ts did not export the expected shape');
  }

  return {
    // Generated file. Do not hand-edit; see the header of this script.
    _generated_by: 'scripts/export_regulations_json.js',
    _source: 'src/data/marylandHuntingData.ts',
    _do_not_edit: 'Regenerate with: node scripts/export_regulations_json.js',
    meta: {
      seasonLabel: REGULATIONS_META.seasonLabel,
      publishedOn: REGULATIONS_META.publishedOn,
      nextSeasonExpectedBy: REGULATIONS_META.nextSeasonExpectedBy,
      sourceUrl: REGULATIONS_META.sourceUrl,
    },
    seasons: MD_SEASONS.map((s) => ({
      species: s.species,
      season_type: s.seasonType,
      start_date: s.startDate,
      end_date: s.endDate,
      weapon: s.weaponType,
      bag_limit: s.bagLimit,
      notes: s.notes || '',
      counties: s.counties || [],
    })),
    // Keys below are the shapes backend/scripts/ingest_regulations.py already
    // expects, so the Python side only swaps its data source, not its builders.
    wmas: (MD_WMAS || []).map((w) => ({
      name: w.name,
      county: w.county,
      acres: w.acres,
      species: w.allowedSpecies || [],
      weapons: w.allowedWeapons || [],
      sunday: w.sundayHunting,
      dnr_url: w.dnrUrl || '',
      notes: w.notes || '',
    })),
    counties: (MD_COUNTIES || []).map((c) => ({
      name: c.name,
      region: c.deerManagementRegion,
      sunday: c.sundayHuntingAllowed,
      antler: c.antlerRestrictions,
      notes: c.notes || '',
    })),
    bag_limits: (MD_BAG_LIMITS || []).map((b) => ({
      species: b.species,
      // weaponType is optional in the TS; absent means the rule is
      // weapon-agnostic, which the chunk text renders as "Any".
      weapon: b.weaponType || 'Any',
      type: b.limitType,
      qty: b.quantity,
      period: b.timePeriod,
      notes: b.notes || '',
      counties: b.countyRestrictions || [],
    })),
  };
}

const payload = JSON.stringify(build(loadDataModule()), null, 2) + '\n';

if (process.argv.includes('--check')) {
  const current = fs.existsSync(OUT) ? fs.readFileSync(OUT, 'utf8') : '';
  if (current !== payload) {
    console.error(
      'backend/data/maryland_regulations.json is STALE relative to\n' +
      'src/data/marylandHuntingData.ts.\n\n' +
      'The backend would answer hunters with different season dates than the\n' +
      'app shows. Regenerate and commit:\n\n' +
      '    node scripts/export_regulations_json.js\n',
    );
    process.exit(1);
  }
  console.log('maryland_regulations.json is current.');
} else {
  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  fs.writeFileSync(OUT, payload);
  const d = JSON.parse(payload);
  console.log(
    `Wrote ${path.relative(REPO, OUT)}: season ${d.meta.seasonLabel}, ` +
    `${d.seasons.length} seasons, ${d.wmas.length} WMAs, ` +
    `${d.counties.length} counties, ${d.bag_limits.length} bag limits.`,
  );
}
