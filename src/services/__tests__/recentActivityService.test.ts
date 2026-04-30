/**
 * recentActivityService.test.ts — pure-function contract for the
 * "most recent personal-layer activity per mode" summarizer.
 */

import {
  RecentActivityInputs,
  summarizeRecentForMode,
  timeAgo,
} from '../recentActivityService';
import type { UserWaypoint } from '../../types/userWaypoint';
import type { RecordedTrack } from '../../types/track';
import type { UserMarkup } from '../../types/userMarkup';
import type { JournalEntry } from '../../types/journalEntry';
import type { GearChecklist } from '../../types/gearChecklist';

const NOW = new Date('2026-04-24T12:00:00.000Z');

function emptyInputs(): RecentActivityInputs {
  return {
    waypoints: [],
    tracks: [],
    markups: [],
    journalEntries: [],
    checklists: [],
  };
}

function wp(overrides: Partial<UserWaypoint>): UserWaypoint {
  return {
    id: 'w1',
    createdAt: '2026-04-20T08:00:00.000Z',
    updatedAt: '2026-04-20T08:00:00.000Z',
    mode: 'hunt',
    category: 'stand' as any,
    title: 'Cedar Hill stand',
    notes: '',
    lat: 39.4,
    lng: -76.7,
    photoUris: [],
    ...overrides,
  };
}

function tr(overrides: Partial<RecordedTrack>): RecordedTrack {
  return {
    id: 't1',
    mode: 'hunt',
    name: 'Morning walk',
    startedAt: '2026-04-22T11:00:00.000Z',
    endedAt: '2026-04-22T12:30:00.000Z',
    state: 'idle',
    samples: [],
    distanceM: 3200,
    durationSec: 5400,
    elevationGainM: 65,
    ...overrides,
  };
}

function mk(overrides: Partial<UserMarkup>): UserMarkup {
  return {
    id: 'm1',
    createdAt: '2026-04-21T10:00:00.000Z',
    updatedAt: '2026-04-21T10:00:00.000Z',
    mode: 'hunt',
    title: 'Property line',
    shapeType: 'LineString',
    coordinates: [[-76.7, 39.4], [-76.71, 39.41]],
    ...overrides,
  } as UserMarkup;
}

function je(overrides: Partial<JournalEntry>): JournalEntry {
  return {
    id: 'j1',
    createdAt: '2026-04-23T22:00:00.000Z',
    updatedAt: '2026-04-23T22:00:00.000Z',
    entryDate: '2026-04-23',
    mode: 'hunt',
    title: 'Evening sit',
    body: '',
    outcome: 'sighting',
    tags: [],
    photoUris: [],
    ...overrides,
  };
}

function gc(overrides: Partial<GearChecklist>): GearChecklist {
  return {
    id: 'c1',
    createdAt: '2026-04-19T14:00:00.000Z',
    updatedAt: '2026-04-19T14:00:00.000Z',
    mode: 'hunt',
    name: 'Opening day',
    items: [
      { id: 'i1', label: 'a', category: 'safety', checked: true, isCustom: false },
      { id: 'i2', label: 'b', category: 'safety', checked: false, isCustom: false },
    ],
    ...overrides,
  };
}

describe('timeAgo', () => {
  it('returns "just now" for sub-minute differences', () => {
    expect(timeAgo('2026-04-24T11:59:30.000Z', NOW)).toBe('just now');
  });

  it('returns minutes for sub-hour differences', () => {
    expect(timeAgo('2026-04-24T11:30:00.000Z', NOW)).toBe('30m ago');
  });

  it('returns hours for sub-day differences', () => {
    expect(timeAgo('2026-04-24T06:00:00.000Z', NOW)).toBe('6h ago');
  });

  it('returns days for sub-week differences', () => {
    expect(timeAgo('2026-04-22T12:00:00.000Z', NOW)).toBe('2d ago');
  });

  it('returns short date for >7d same year', () => {
    const out = timeAgo('2026-03-20T12:00:00.000Z', NOW);
    // OS-dependent locale; just assert no "ago" suffix and is short.
    expect(out).not.toMatch(/ago/);
    expect(out.length).toBeGreaterThan(0);
  });

  it('returns "in the future" for future timestamps', () => {
    expect(timeAgo('2026-05-01T12:00:00.000Z', NOW)).toBe('in the future');
  });

  it('returns empty string for invalid input', () => {
    expect(timeAgo('not-a-date', NOW)).toBe('');
  });
});

describe('summarizeRecentForMode', () => {
  it('returns null when the user has no activity in any layer for that mode', () => {
    expect(summarizeRecentForMode('hunt', emptyInputs(), NOW)).toBeNull();
  });

  it('returns null when activity exists ONLY in a different mode', () => {
    const inputs: RecentActivityInputs = {
      ...emptyInputs(),
      waypoints: [wp({ mode: 'fish' })],
    };
    expect(summarizeRecentForMode('hunt', inputs, NOW)).toBeNull();
  });

  it('picks the most-recent layer when multiple exist', () => {
    const inputs: RecentActivityInputs = {
      waypoints: [wp({ updatedAt: '2026-04-20T08:00:00.000Z' })],
      tracks: [tr({ startedAt: '2026-04-22T11:00:00.000Z' })],
      markups: [mk({ updatedAt: '2026-04-21T10:00:00.000Z' })],
      journalEntries: [je({ entryDate: '2026-04-23' })],
      checklists: [gc({ updatedAt: '2026-04-19T14:00:00.000Z' })],
    };
    const out = summarizeRecentForMode('hunt', inputs, NOW);
    expect(out).not.toBeNull();
    // Journal (Apr 23 noon UTC) > track (Apr 22) > markup (Apr 21) > wp (Apr 20).
    expect(out!.kind).toBe('journal');
    expect(out!.code).toBe('JR');
    expect(out!.label).toContain('Evening sit');
    expect(out!.detail).toContain('Sighting');
  });

  it('falls back to a single layer when only that layer has data', () => {
    const inputs: RecentActivityInputs = {
      ...emptyInputs(),
      checklists: [gc({})],
    };
    const out = summarizeRecentForMode('hunt', inputs, NOW);
    expect(out).not.toBeNull();
    expect(out!.kind).toBe('checklist');
    expect(out!.code).toBe('GC');
    expect(out!.detail).toMatch(/1\/2 packed/);
  });

  it('formats track distance in miles when ≥ 161m', () => {
    const inputs: RecentActivityInputs = {
      ...emptyInputs(),
      tracks: [tr({ distanceM: 8047 })], // ~5.0 mi
    };
    const out = summarizeRecentForMode('hunt', inputs, NOW);
    expect(out!.detail).toMatch(/5\.0 mi/);
  });

  it('filters by mode strictly', () => {
    const inputs: RecentActivityInputs = {
      ...emptyInputs(),
      waypoints: [
        wp({ id: 'h1', mode: 'hunt', title: 'Hunt pin', updatedAt: '2026-04-20T08:00:00.000Z' }),
        wp({ id: 'f1', mode: 'fish', title: 'Fish pin', updatedAt: '2026-04-23T08:00:00.000Z' }),
      ],
    };
    const huntSummary = summarizeRecentForMode('hunt', inputs, NOW);
    const fishSummary = summarizeRecentForMode('fish', inputs, NOW);
    expect(huntSummary!.label).toContain('Hunt pin');
    expect(fishSummary!.label).toContain('Fish pin');
  });
});
