/**
 * The backend's regulation knowledge base must describe the same seasons the
 * app does.
 *
 * On 2026-09-27 it did not. backend/scripts/ingest_regulations.py carried its
 * own hand-typed copy of the season table, labelled "mirrored from mobile
 * TypeScript data". The app was refreshed to 2026-2027 and that copy was not,
 * so the deployed AI planner answered a question about Frederick County with
 * "Archery Season runs from September 6, 2025, to January 31, 2026" — the
 * previous licence year, stated confidently, with a DNR source line under it.
 *
 * backend/data/maryland_regulations.json is now generated from
 * src/data/marylandHuntingData.ts and both are committed. This test fails if
 * the committed JSON no longer matches the TypeScript, which is the moment the
 * two would start disagreeing again.
 */

import { execFileSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

const REPO = path.resolve(__dirname, '../../..');
const SCRIPT = path.join(REPO, 'scripts/export_regulations_json.js');
const JSON_PATH = path.join(REPO, 'backend/data/maryland_regulations.json');

describe('backend regulation JSON', () => {
  it('is checked in', () => {
    expect(fs.existsSync(JSON_PATH)).toBe(true);
  });

  it('matches src/data/marylandHuntingData.ts', () => {
    // Regenerates into memory and compares. On failure the script prints the
    // one command that fixes it.
    try {
      execFileSync('node', [SCRIPT, '--check'], {
        cwd: REPO,
        stdio: 'pipe',
        timeout: 120_000,
      });
    } catch (err) {
      const e = err as { stderr?: Buffer; stdout?: Buffer };
      throw new Error(
        (e.stderr?.toString() || '') + (e.stdout?.toString() || '') ||
          'export_regulations_json.js --check failed',
      );
    }
  }, 120_000);

  it('describes the same licence year the app advertises', () => {
    const generated = JSON.parse(fs.readFileSync(JSON_PATH, 'utf8'));
    // Imported lazily so a broken data module fails the earlier test first.
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { REGULATIONS_META } = require('../marylandHuntingData');
    expect(generated.meta.seasonLabel).toBe(REGULATIONS_META.seasonLabel);
  });

  it('carries no dates from a previous licence year', () => {
    const generated = JSON.parse(fs.readFileSync(JSON_PATH, 'utf8'));
    const [startYear] = generated.meta.seasonLabel.split('-');
    const stale = generated.seasons.filter(
      (s: { start_date: string }) => Number(s.start_date.slice(0, 4)) < Number(startYear),
    );
    expect(stale).toEqual([]);
  });

  it('has a season for every species the app lists', () => {
    const generated = JSON.parse(fs.readFileSync(JSON_PATH, 'utf8'));
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { MD_SEASONS } = require('../marylandHuntingData');
    expect(generated.seasons).toHaveLength(MD_SEASONS.length);
    expect(new Set(generated.seasons.map((s: { species: string }) => s.species))).toEqual(
      new Set(MD_SEASONS.map((s: { species: string }) => s.species)),
    );
  });
});
