/**
 * onThisDayService — unit tests
 *
 * Locks in the calendar-day matching logic, year-bucketing, and
 * defensive parsing for the personal-layer "memories" feed.
 */
import {
  formatMonthDay,
  isoToLocalYmd,
  ymdToMonthDay,
  ymdToYear,
  getOnThisDayItems,
  onThisDayCount,
} from '../onThisDayService';
import type { UserWaypoint } from '../../types/userWaypoint';
import type { RecordedTrack } from '../../types/track';
import type { LineStringMarkup, UserMarkup } from '../../types/userMarkup';
import type { JournalEntry } from '../../types/journalEntry';
import type { GearChecklist } from '../../types/gearChecklist';

// ── Factories — locked overrides-spread pattern ──

function wp(overrides: Partial<UserWaypoint> = {}): UserWaypoint {
  const base: UserWaypoint = {
    id: 'wp-1',
    createdAt: '2025-04-24T10:00:00Z',
    updatedAt: '2025-04-24T10:00:00Z',
    mode: 'hunt',
    category: 'tree-stand',
    title: 'Stand A',
    notes: '',
    lat: 39.0,
    lng: -76.0,
    photoUris: [],
  };
  return { ...base, ...overrides };
}

function tr(overrides: Partial<RecordedTrack> = {}): RecordedTrack {
  const base: RecordedTrack = {
    id: 'tr-1',
    mode: 'hike',
    name: 'Morning loop',
    startedAt: '2025-04-24T13:00:00Z',
    endedAt: '2025-04-24T14:00:00Z',
    state: 'saved',
    samples: [],
    distanceM: 1000,
    durationSec: 3600,
    elevationGainM: 0,
  };
  return { ...base, ...overrides };
}

function mk(overrides: Partial<LineStringMarkup> = {}): UserMarkup {
  // Locked LineString factory — keeps the discriminated-union narrow.
  // Polygon factory would be a separate helper if a test needed one;
  // these tests only exercise the date-matching axis so a single shape
  // is sufficient.
  const base: LineStringMarkup = {
    id: 'mk-1',
    createdAt: '2025-04-24T15:00:00Z',
    updatedAt: '2025-04-24T15:00:00Z',
    mode: 'fish',
    title: 'Drift line',
    shapeType: 'LineString',
    coordinates: [
      [-76.0, 39.0],
      [-76.1, 39.1],
    ],
  };
  return { ...base, ...overrides };
}

function je(overrides: Partial<JournalEntry> = {}): JournalEntry {
  const base: JournalEntry = {
    id: 'je-1',
    createdAt: '2025-04-25T08:00:00Z',
    updatedAt: '2025-04-25T08:00:00Z',
    entryDate: '2025-04-24',
    mode: 'hunt',
    title: 'Sat hunt',
    body: '',
    outcome: 'sighting',
    tags: [],
    photoUris: [],
  };
  return { ...base, ...overrides };
}

function gc(overrides: Partial<GearChecklist> = {}): GearChecklist {
  const base: GearChecklist = {
    id: 'gc-1',
    createdAt: '2025-04-20T08:00:00Z',
    updatedAt: '2025-04-20T08:00:00Z',
    mode: 'camp',
    name: 'Weekend pack',
    tripDate: '2025-04-24',
    items: [],
  };
  return { ...base, ...overrides };
}

// ── Date helpers ──

describe('formatMonthDay', () => {
  it('returns MM-DD with zero-padding', () => {
    expect(formatMonthDay(new Date(2026, 0, 5))).toBe('01-05');
    expect(formatMonthDay(new Date(2026, 11, 31))).toBe('12-31');
    expect(formatMonthDay(new Date(2026, 3, 24))).toBe('04-24');
  });
});

describe('isoToLocalYmd', () => {
  it('returns undefined for empty / nullish input', () => {
    expect(isoToLocalYmd('')).toBeUndefined();
    expect(isoToLocalYmd(undefined as unknown as string)).toBeUndefined();
  });

  it('returns undefined for unparseable input', () => {
    expect(isoToLocalYmd('not a date')).toBeUndefined();
  });

  it('returns YYYY-MM-DD for a valid ISO timestamp', () => {
    // We don't assert the exact day because TZ is local; just shape.
    const out = isoToLocalYmd('2025-04-24T12:00:00Z');
    expect(out).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});

describe('ymdToMonthDay', () => {
  it('extracts MM-DD from YYYY-MM-DD', () => {
    expect(ymdToMonthDay('2025-04-24')).toBe('04-24');
    expect(ymdToMonthDay('2024-12-31')).toBe('12-31');
  });

  it('returns undefined for malformed input', () => {
    expect(ymdToMonthDay('2025-4-24')).toBeUndefined();
    expect(ymdToMonthDay('2025/04/24')).toBeUndefined();
    expect(ymdToMonthDay('')).toBeUndefined();
  });
});

describe('ymdToYear', () => {
  it('extracts year from YYYY-MM-DD', () => {
    expect(ymdToYear('2025-04-24')).toBe(2025);
    expect(ymdToYear('1999-12-31')).toBe(1999);
  });

  it('returns undefined for malformed input', () => {
    expect(ymdToYear('not a date')).toBeUndefined();
    expect(ymdToYear('')).toBeUndefined();
  });
});

// ── Aggregator ──

describe('getOnThisDayItems', () => {
  const today = new Date(2026, 3, 24); // April 24, 2026

  it('returns empty buckets when no inputs match', () => {
    const r = getOnThisDayItems(today, {});
    expect(r.monthDay).toBe('04-24');
    expect(r.todayYear).toBe(2026);
    expect(r.buckets).toEqual([]);
    expect(r.totalCount).toBe(0);
  });

  it('matches a journal entry from a prior year on the same calendar date', () => {
    const r = getOnThisDayItems(today, {
      journalEntries: [je({ id: 'je-1', entryDate: '2025-04-24' })],
    });
    expect(r.totalCount).toBe(1);
    expect(r.buckets).toHaveLength(1);
    expect(r.buckets[0].year).toBe(2025);
    expect(r.buckets[0].yearsAgo).toBe(1);
    expect(r.buckets[0].items[0].kind).toBe('journal');
  });

  it('matches a gear checklist with a prior-year tripDate', () => {
    const r = getOnThisDayItems(today, {
      checklists: [gc({ id: 'gc-1', tripDate: '2024-04-24' })],
    });
    expect(r.totalCount).toBe(1);
    expect(r.buckets[0].year).toBe(2024);
    expect(r.buckets[0].yearsAgo).toBe(2);
  });

  it('skips a checklist with no tripDate', () => {
    const r = getOnThisDayItems(today, {
      checklists: [gc({ id: 'gc-x', tripDate: undefined })],
    });
    expect(r.totalCount).toBe(0);
  });

  it('excludes same-year items (those are "today", not memories)', () => {
    const r = getOnThisDayItems(today, {
      journalEntries: [
        je({ id: 'je-now', entryDate: '2026-04-24' }),
        je({ id: 'je-old', entryDate: '2025-04-24' }),
      ],
    });
    expect(r.totalCount).toBe(1);
    expect(r.buckets[0].items[0].item.id).toBe('je-old');
  });

  it('excludes items with different month/day', () => {
    const r = getOnThisDayItems(today, {
      journalEntries: [
        je({ id: 'je-other', entryDate: '2025-04-23' }),
        je({ id: 'je-other2', entryDate: '2025-05-24' }),
      ],
    });
    expect(r.totalCount).toBe(0);
  });

  it('groups items by year DESC across multiple prior years', () => {
    const r = getOnThisDayItems(today, {
      journalEntries: [
        je({ id: 'je-a', entryDate: '2023-04-24' }),
        je({ id: 'je-b', entryDate: '2025-04-24' }),
        je({ id: 'je-c', entryDate: '2024-04-24' }),
      ],
    });
    expect(r.buckets.map((b) => b.year)).toEqual([2025, 2024, 2023]);
    expect(r.buckets.map((b) => b.yearsAgo)).toEqual([1, 2, 3]);
  });

  it('aggregates across all five layer types in the same bucket', () => {
    const r = getOnThisDayItems(today, {
      waypoints: [wp({ id: 'wp-1', createdAt: '2025-04-24T15:00:00Z' })],
      tracks: [tr({ id: 'tr-1', startedAt: '2025-04-24T15:00:00Z' })],
      markups: [mk({ id: 'mk-1', createdAt: '2025-04-24T15:00:00Z' })],
      journalEntries: [je({ id: 'je-1', entryDate: '2025-04-24' })],
      checklists: [gc({ id: 'gc-1', tripDate: '2025-04-24' })],
    });
    expect(r.totalCount).toBe(5);
    expect(r.buckets).toHaveLength(1);
    expect(r.buckets[0].items.map((i) => i.kind).sort()).toEqual([
      'checklist',
      'journal',
      'markup',
      'track',
      'waypoint',
    ]);
  });

  it('uses default new Date() when today is undefined', () => {
    // Sanity: function does not crash when invoked without a date arg.
    const r = getOnThisDayItems(undefined, { journalEntries: [] });
    expect(r.monthDay).toMatch(/^\d{2}-\d{2}$/);
    expect(typeof r.todayYear).toBe('number');
  });

  it('sorts items within a year bucket by id ASC for determinism', () => {
    const r = getOnThisDayItems(today, {
      journalEntries: [
        je({ id: 'je-zeta', entryDate: '2025-04-24' }),
        je({ id: 'je-alpha', entryDate: '2025-04-24' }),
        je({ id: 'je-mu', entryDate: '2025-04-24' }),
      ],
    });
    expect(r.buckets[0].items.map((i) => i.item.id)).toEqual([
      'je-alpha',
      'je-mu',
      'je-zeta',
    ]);
  });

  it('does not mutate input arrays', () => {
    const wps = [wp({ id: 'wp-z' }), wp({ id: 'wp-a', createdAt: '2025-04-24T10:00:00Z' })];
    const before = wps.map((w) => w.id);
    getOnThisDayItems(today, { waypoints: wps });
    expect(wps.map((w) => w.id)).toEqual(before);
  });

  it('skips waypoints with malformed createdAt', () => {
    const r = getOnThisDayItems(today, {
      waypoints: [wp({ id: 'wp-bad', createdAt: 'not-a-date' })],
    });
    expect(r.totalCount).toBe(0);
  });
});

describe('onThisDayCount', () => {
  const today = new Date(2026, 3, 24);

  it('returns the total count from getOnThisDayItems', () => {
    expect(
      onThisDayCount(today, {
        journalEntries: [
          je({ id: 'je-1', entryDate: '2025-04-24' }),
          je({ id: 'je-2', entryDate: '2024-04-24' }),
        ],
      }),
    ).toBe(2);
  });

  it('returns 0 for empty inputs', () => {
    expect(onThisDayCount(today, {})).toBe(0);
  });
});
