/**
 * exportBundleService.test.ts — pure-function contract for the
 * "Backup My Data" JSON bundle builder.
 *
 * Tests buildExportBundle / bundleToJSON / defaultBundleFilename. The
 * shareExportBundle wrapper is intentionally not exercised here because
 * it depends on the native bridge — but we still need to mock its
 * dependencies (`react-native-fs` and `react-native-share`) at the
 * top of this file because the service module's top-level imports
 * pull them in even when only the pure functions are called.
 *
 * The mocks below are minimal — the jest preset for react-native does
 * not ship default mocks for these modules.
 */

jest.mock('react-native-fs', () => ({
  __esModule: true,
  default: {
    CachesDirectoryPath: '/tmp/test-caches',
    writeFile: jest.fn().mockResolvedValue(undefined),
  },
}));

jest.mock('react-native-share', () => ({
  __esModule: true,
  default: {
    open: jest.fn().mockResolvedValue(undefined),
  },
}));

import {
  buildExportBundle,
  bundleToJSON,
  defaultBundleFilename,
  EXPORT_BUNDLE_GENERATOR,
  EXPORT_BUNDLE_SCHEMA_VERSION,
  ExportBundleInputs,
} from '../exportBundleService';
import type { UserWaypoint } from '../../types/userWaypoint';
import type { RecordedTrack } from '../../types/track';
import type { UserMarkup } from '../../types/userMarkup';
import type { JournalEntry } from '../../types/journalEntry';
import type { GearChecklist } from '../../types/gearChecklist';
import {
  APP_BUILD_NUMBER,
  APP_MARKETING_VERSION,
} from '../../config';

// ─── Synthetic data factories (extract `base`, then spread overrides) ───

function wp(overrides: Partial<UserWaypoint> = {}): UserWaypoint {
  const base: UserWaypoint = {
    id: 'w1',
    title: 'Stand A',
    notes: '',
    mode: 'hunt',
    category: 'tree-stand',
    lat: 39.5,
    lng: -76.5,
    photoUris: [],
    createdAt: '2026-04-22T12:00:00.000Z',
    updatedAt: '2026-04-22T12:00:00.000Z',
  };
  return { ...base, ...overrides };
}

function tr(overrides: Partial<RecordedTrack> = {}): RecordedTrack {
  const base: RecordedTrack = {
    id: 't1',
    mode: 'hike',
    name: 'Loop',
    startedAt: '2026-04-22T13:00:00.000Z',
    endedAt: '2026-04-22T15:00:00.000Z',
    state: 'saved',
    samples: [],
    distanceM: 4500,
    durationSec: 7200,
    elevationGainM: 200,
  };
  return { ...base, ...overrides };
}

function mk(overrides: Partial<UserMarkup> = {}): UserMarkup {
  const base: UserMarkup = {
    id: 'm1',
    title: 'Boundary',
    notes: '',
    mode: 'hunt',
    color: '#abcdef',
    shapeType: 'LineString',
    coordinates: [
      [-76.5, 39.5],
      [-76.6, 39.6],
    ],
    createdAt: '2026-04-21T18:00:00.000Z',
    updatedAt: '2026-04-21T18:00:00.000Z',
  };
  return { ...base, ...overrides } as UserMarkup;
}

function je(overrides: Partial<JournalEntry> = {}): JournalEntry {
  const base: JournalEntry = {
    id: 'j1',
    createdAt: '2026-04-22T22:00:00.000Z',
    updatedAt: '2026-04-22T22:00:00.000Z',
    entryDate: '2026-04-22',
    mode: 'hunt',
    title: 'Evening sit',
    body: '',
    outcome: 'sighting',
    tags: [],
    photoUris: [],
  };
  return { ...base, ...overrides };
}

function cl(overrides: Partial<GearChecklist> = {}): GearChecklist {
  const base: GearChecklist = {
    id: 'c1',
    mode: 'hunt',
    name: 'Opening day',
    tripDate: '2026-04-25',
    items: [],
    createdAt: '2026-04-20T09:00:00.000Z',
    updatedAt: '2026-04-20T09:00:00.000Z',
  };
  return { ...base, ...overrides };
}

function emptyInputs(): ExportBundleInputs {
  return {
    waypoints: [],
    tracks: [],
    markups: [],
    journalEntries: [],
    checklists: [],
  };
}

// ─── buildExportBundle ───

describe('buildExportBundle', () => {
  it('emits stable identity headers', () => {
    const b = buildExportBundle(emptyInputs(), {
      exportedAt: '2026-04-24T12:00:00.000Z',
    });
    expect(b.schemaVersion).toBe(EXPORT_BUNDLE_SCHEMA_VERSION);
    expect(b.generator).toBe(EXPORT_BUNDLE_GENERATOR);
    expect(b.exportedAt).toBe('2026-04-24T12:00:00.000Z');
  });

  it('stamps app identity from config', () => {
    const b = buildExportBundle(emptyInputs());
    expect(b.app.name).toBe('MDHuntFishOutdoors');
    expect(b.app.marketingVersion).toBe(APP_MARKETING_VERSION);
    expect(b.app.buildNumber).toBe(APP_BUILD_NUMBER);
    expect(b.app.versionString).toBe(
      `${APP_MARKETING_VERSION}+${APP_BUILD_NUMBER}`,
    );
  });

  it('stamps exportedAt = now when not overridden', () => {
    const before = new Date().getTime();
    const b = buildExportBundle(emptyInputs());
    const after = new Date().getTime();
    const stamped = new Date(b.exportedAt).getTime();
    expect(stamped).toBeGreaterThanOrEqual(before);
    expect(stamped).toBeLessThanOrEqual(after);
  });

  it('omits note key when no note is provided', () => {
    const b = buildExportBundle(emptyInputs());
    expect(b.note).toBeUndefined();
    expect(Object.keys(b)).not.toContain('note');
  });

  it('attaches optional note when provided', () => {
    const b = buildExportBundle(emptyInputs(), {
      note: 'pre-trip backup',
    });
    expect(b.note).toBe('pre-trip backup');
  });

  it('returns zero counts and empty arrays for empty inputs', () => {
    const b = buildExportBundle(emptyInputs());
    expect(b.counts).toEqual({
      waypoints: 0,
      tracks: 0,
      markups: 0,
      journalEntries: 0,
      checklists: 0,
      total: 0,
    });
    expect(b.waypoints).toEqual([]);
    expect(b.tracks).toEqual([]);
    expect(b.markups).toEqual([]);
    expect(b.journalEntries).toEqual([]);
    expect(b.checklists).toEqual([]);
  });

  it('counts each layer independently and sums to total', () => {
    const inputs: ExportBundleInputs = {
      waypoints: [wp({ id: 'w1' }), wp({ id: 'w2' })],
      tracks: [tr({ id: 't1' })],
      markups: [mk({ id: 'm1' }), mk({ id: 'm2' }), mk({ id: 'm3' })],
      journalEntries: [je({ id: 'j1' })],
      checklists: [cl({ id: 'c1' }), cl({ id: 'c2' })],
    };
    const b = buildExportBundle(inputs);
    expect(b.counts.waypoints).toBe(2);
    expect(b.counts.tracks).toBe(1);
    expect(b.counts.markups).toBe(3);
    expect(b.counts.journalEntries).toBe(1);
    expect(b.counts.checklists).toBe(2);
    expect(b.counts.total).toBe(2 + 1 + 3 + 1 + 2);
  });

  it('count fields equal underlying array lengths (sanity contract)', () => {
    const inputs: ExportBundleInputs = {
      waypoints: [wp(), wp(), wp(), wp()],
      tracks: [tr(), tr()],
      markups: [mk()],
      journalEntries: [je(), je(), je()],
      checklists: [cl(), cl(), cl(), cl(), cl()],
    };
    const b = buildExportBundle(inputs);
    expect(b.counts.waypoints).toBe(b.waypoints.length);
    expect(b.counts.tracks).toBe(b.tracks.length);
    expect(b.counts.markups).toBe(b.markups.length);
    expect(b.counts.journalEntries).toBe(b.journalEntries.length);
    expect(b.counts.checklists).toBe(b.checklists.length);
    expect(b.counts.total).toBe(
      b.waypoints.length +
        b.tracks.length +
        b.markups.length +
        b.journalEntries.length +
        b.checklists.length,
    );
  });

  it('preserves field-level fidelity for every layer', () => {
    const inputs: ExportBundleInputs = {
      waypoints: [
        wp({ id: 'w1', title: 'Stand A', notes: 'NW wind only', lat: 39.123, lng: -76.456 }),
      ],
      tracks: [
        tr({ id: 't1', name: 'Sunday loop', distanceM: 9876, durationSec: 4321 }),
      ],
      markups: [
        mk({
          id: 'm1',
          title: 'Property line',
          shapeType: 'LineString',
          coordinates: [
            [-76.0, 39.0],
            [-76.1, 39.1],
            [-76.2, 39.2],
          ],
        }),
      ],
      journalEntries: [
        je({ id: 'j1', title: 'Saw a 10pt', body: 'Big buck at dusk', tags: ['buck', 'dusk'] }),
      ],
      checklists: [
        cl({ id: 'c1', name: 'Striper run', mode: 'fish', tripDate: '2026-05-01' }),
      ],
    };
    const b = buildExportBundle(inputs);
    expect(b.waypoints[0].title).toBe('Stand A');
    expect(b.waypoints[0].notes).toBe('NW wind only');
    expect(b.waypoints[0].lat).toBeCloseTo(39.123);
    expect(b.tracks[0].distanceM).toBe(9876);
    expect((b.markups[0] as any).coordinates).toHaveLength(3);
    expect(b.journalEntries[0].tags).toEqual(['buck', 'dusk']);
    expect(b.checklists[0].mode).toBe('fish');
    expect(b.checklists[0].tripDate).toBe('2026-05-01');
  });

  it('does not mutate the input arrays', () => {
    const wps = [wp({ id: 'w1' })];
    const trs = [tr({ id: 't1' })];
    const mks = [mk({ id: 'm1' })];
    const jes = [je({ id: 'j1' })];
    const cls = [cl({ id: 'c1' })];
    const lengths = [wps.length, trs.length, mks.length, jes.length, cls.length];
    buildExportBundle({
      waypoints: wps,
      tracks: trs,
      markups: mks,
      journalEntries: jes,
      checklists: cls,
    });
    expect([wps.length, trs.length, mks.length, jes.length, cls.length]).toEqual(lengths);
  });
});

// ─── bundleToJSON ───

describe('bundleToJSON', () => {
  it('round-trips through JSON.parse losslessly for all 5 layers', () => {
    const inputs: ExportBundleInputs = {
      waypoints: [wp({ id: 'w1' }), wp({ id: 'w2' })],
      tracks: [tr({ id: 't1' })],
      markups: [mk({ id: 'm1' })],
      journalEntries: [je({ id: 'j1' })],
      checklists: [cl({ id: 'c1' })],
    };
    const b = buildExportBundle(inputs, {
      exportedAt: '2026-04-24T12:00:00.000Z',
    });
    const json = bundleToJSON(b);
    const parsed = JSON.parse(json);
    expect(parsed.schemaVersion).toBe(EXPORT_BUNDLE_SCHEMA_VERSION);
    expect(parsed.generator).toBe(EXPORT_BUNDLE_GENERATOR);
    expect(parsed.waypoints).toHaveLength(2);
    expect(parsed.tracks).toHaveLength(1);
    expect(parsed.markups).toHaveLength(1);
    expect(parsed.journalEntries).toHaveLength(1);
    expect(parsed.checklists).toHaveLength(1);
    expect(parsed.counts.total).toBe(6);
  });

  it('produces 2-space indented output (human-readable)', () => {
    const b = buildExportBundle(emptyInputs(), {
      exportedAt: '2026-04-24T12:00:00.000Z',
    });
    const json = bundleToJSON(b);
    // The first nested key should be indented 2 spaces from line start.
    expect(json).toMatch(/\n {2}"schemaVersion":/);
    expect(json).toMatch(/\n {2}"generator":/);
  });

  it('emits identity headers in the file (greppable contract)', () => {
    const b = buildExportBundle(emptyInputs(), {
      exportedAt: '2026-04-24T12:00:00.000Z',
    });
    const json = bundleToJSON(b);
    // These two must appear verbatim so import-side validators can refuse
    // foreign / unversioned files via simple substring checks.
    expect(json).toContain('"generator": "mdhuntfishoutdoors-personal-layer"');
    expect(json).toContain('"schemaVersion": 1');
  });
});

// ─── defaultBundleFilename ───

describe('defaultBundleFilename', () => {
  it('uses the YYYY-MM-DD slice of exportedAt', () => {
    const b = buildExportBundle(emptyInputs(), {
      exportedAt: '2026-04-24T12:34:56.000Z',
    });
    expect(defaultBundleFilename(b)).toBe('mdhuntfishoutdoors_backup_2026-04-24');
  });

  it('returns a slugified, no-spaces filename', () => {
    const b = buildExportBundle(emptyInputs(), {
      exportedAt: '2026-12-31T00:00:00.000Z',
    });
    const name = defaultBundleFilename(b);
    expect(name).not.toMatch(/\s/);
    expect(name).toMatch(/^[a-z0-9_\-]+$/);
  });
});
