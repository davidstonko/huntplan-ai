/**
 * dailyBriefingService — unit tests for the today aggregator.
 */
import {
  buildDailyBriefing,
  dailyBriefingHighlightCount,
  localYmd,
  localMonthDay,
  daysBetweenYmd,
  streakAtRisk,
} from '../dailyBriefingService';
import type { UserWaypoint } from '../../types/userWaypoint';
import type { RecordedTrack } from '../../types/track';
import type { LineStringMarkup, UserMarkup } from '../../types/userMarkup';
import type { JournalEntry } from '../../types/journalEntry';
import type { GearChecklist } from '../../types/gearChecklist';

// ── Factories — locked overrides-spread pattern ──

function wp(overrides: Partial<UserWaypoint> = {}): UserWaypoint {
  const base: UserWaypoint = {
    id: 'wp-1',
    createdAt: '2026-04-25T10:00:00Z',
    updatedAt: '2026-04-25T10:00:00Z',
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
    name: 'Loop',
    startedAt: '2026-04-25T13:00:00Z',
    endedAt: '2026-04-25T14:00:00Z',
    state: 'saved',
    samples: [],
    distanceM: 1000,
    durationSec: 3600,
    elevationGainM: 0,
  };
  return { ...base, ...overrides };
}

function mk(overrides: Partial<LineStringMarkup> = {}): UserMarkup {
  // Locked LineString factory pattern — discriminated-union narrowing
  // requires the base be typed as a single variant.
  const base: LineStringMarkup = {
    id: 'mk-1',
    createdAt: '2026-04-25T15:00:00Z',
    updatedAt: '2026-04-25T15:00:00Z',
    mode: 'fish',
    title: 'Drift',
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
    createdAt: '2026-04-25T08:00:00Z',
    updatedAt: '2026-04-25T08:00:00Z',
    entryDate: '2026-04-25',
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
    createdAt: '2026-04-20T08:00:00Z',
    updatedAt: '2026-04-20T08:00:00Z',
    mode: 'camp',
    name: 'Weekend',
    tripDate: '2026-04-26',
    items: [],
  };
  return { ...base, ...overrides };
}

// Reference date for deterministic tests: noon local 2026-04-25 (Sat).
const TODAY = new Date(2026, 3, 25, 12, 0, 0);

describe('localYmd / localMonthDay', () => {
  it('formats local YYYY-MM-DD', () => {
    expect(localYmd(new Date(2026, 3, 5))).toBe('2026-04-05');
  });
  it('formats MM-DD', () => {
    expect(localMonthDay(new Date(2026, 3, 5))).toBe('04-05');
  });
});

describe('daysBetweenYmd', () => {
  it('returns 0 for same date', () => {
    expect(daysBetweenYmd('2026-04-25', '2026-04-25')).toBe(0);
  });
  it('returns positive for future date', () => {
    expect(daysBetweenYmd('2026-04-25', '2026-04-28')).toBe(3);
  });
  it('returns negative for past date', () => {
    expect(daysBetweenYmd('2026-04-25', '2026-04-20')).toBe(-5);
  });
  it('returns NaN for malformed input', () => {
    expect(daysBetweenYmd('not-a-date', '2026-04-25')).toBeNaN();
  });
});

describe('buildDailyBriefing', () => {
  it('returns an empty-shape briefing when there are no inputs', () => {
    const r = buildDailyBriefing(TODAY, {});
    expect(r.today.ymd).toBe('2026-04-25');
    expect(r.today.weekdayLabel).toBe('Saturday');
    expect(r.today.dateLabel).toBe('April 25, 2026');
    expect(r.memories.totalCount).toBe(0);
    expect(r.loggedToday).toEqual([]);
    expect(r.upcomingTrips).toEqual([]);
    expect(r.recent).toBeNull();
    expect(r.streak).toEqual({ current: 0, longest: 0 });
    expect(r.totals.waypoints).toBe(0);
  });

  it('surfaces journal entries logged today', () => {
    const r = buildDailyBriefing(TODAY, {
      journalEntries: [
        je({ id: 'today-1', entryDate: '2026-04-25' }),
        je({ id: 'yesterday', entryDate: '2026-04-24' }),
        je({ id: 'today-2', entryDate: '2026-04-25', updatedAt: '2026-04-25T11:00:00Z' }),
      ],
    });
    const ids = r.loggedToday.map((e) => e.id);
    expect(ids).toContain('today-1');
    expect(ids).toContain('today-2');
    expect(ids).not.toContain('yesterday');
    expect(r.loggedToday.length).toBe(2);
  });

  it('orders loggedToday by updatedAt DESC', () => {
    const r = buildDailyBriefing(TODAY, {
      journalEntries: [
        je({ id: 'a', entryDate: '2026-04-25', updatedAt: '2026-04-25T08:00:00Z' }),
        je({ id: 'b', entryDate: '2026-04-25', updatedAt: '2026-04-25T11:00:00Z' }),
        je({ id: 'c', entryDate: '2026-04-25', updatedAt: '2026-04-25T09:00:00Z' }),
      ],
    });
    expect(r.loggedToday.map((e) => e.id)).toEqual(['b', 'c', 'a']);
  });

  it('lists upcoming trips today and forward, soonest first, daysAway computed', () => {
    const r = buildDailyBriefing(TODAY, {
      checklists: [
        gc({ id: 'past', tripDate: '2026-04-20' }),
        gc({ id: 'today', tripDate: '2026-04-25' }),
        gc({ id: 'tomorrow', tripDate: '2026-04-26' }),
        gc({ id: 'next-week', tripDate: '2026-05-02' }),
        gc({ id: 'no-date', tripDate: undefined }),
      ],
    });
    const ids = r.upcomingTrips.map((u) => u.id);
    expect(ids).not.toContain('past');
    expect(ids).not.toContain('no-date');
    expect(ids).toEqual(['today', 'tomorrow', 'next-week']);
    expect(r.upcomingTrips[0].daysAway).toBe(0);
    expect(r.upcomingTrips[1].daysAway).toBe(1);
    expect(r.upcomingTrips[2].daysAway).toBe(7);
  });

  it('caps upcomingTrips at 5', () => {
    const checklists = Array.from({ length: 10 }, (_, i) =>
      gc({
        id: `gc-${i}`,
        tripDate: `2026-05-${String(i + 1).padStart(2, '0')}`,
      }),
    );
    const r = buildDailyBriefing(TODAY, { checklists });
    expect(r.upcomingTrips.length).toBe(5);
    expect(r.upcomingTrips[0].tripDate).toBe('2026-05-01');
    expect(r.upcomingTrips[4].tripDate).toBe('2026-05-05');
  });

  it('picks the most-recent activity across modes', () => {
    const r = buildDailyBriefing(TODAY, {
      waypoints: [wp({ id: 'old-wp', updatedAt: '2026-04-23T10:00:00Z' })],
      tracks: [tr({ id: 'newer-tr', startedAt: '2026-04-24T12:00:00Z' })],
      markups: [mk({ id: 'newest-mk', updatedAt: '2026-04-25T08:00:00Z' })],
    });
    expect(r.recent).not.toBeNull();
    expect(r.recent!.kind).toBe('markup');
  });

  it('surfaces On This Day memories from prior years', () => {
    const r = buildDailyBriefing(TODAY, {
      journalEntries: [
        je({ id: 'm1', entryDate: '2025-04-25' }), // 1 year ago
        je({ id: 'm2', entryDate: '2024-04-25' }), // 2 years ago
        je({ id: 'today', entryDate: '2026-04-25' }), // not a memory
      ],
    });
    expect(r.memories.totalCount).toBe(2);
    // newest year first
    expect(r.memories.buckets[0].year).toBe(2025);
    expect(r.memories.buckets[1].year).toBe(2024);
  });

  it('computes the active-day streak using the briefing date', () => {
    const r = buildDailyBriefing(TODAY, {
      journalEntries: [
        je({ id: '1', entryDate: '2026-04-25' }),
        je({ id: '2', entryDate: '2026-04-24' }),
        je({ id: '3', entryDate: '2026-04-23' }),
      ],
    });
    expect(r.streak.current).toBeGreaterThanOrEqual(3);
    expect(r.streak.longest).toBeGreaterThanOrEqual(3);
  });

  it('computes total counts across all 5 layers', () => {
    const r = buildDailyBriefing(TODAY, {
      waypoints: [wp({ id: 'w1' }), wp({ id: 'w2' })],
      tracks: [tr({ id: 't1' })],
      markups: [mk({ id: 'm1' }), mk({ id: 'm2' }), mk({ id: 'm3' })],
      journalEntries: [je({ id: 'j1' })],
      checklists: [gc({ id: 'c1' }), gc({ id: 'c2' })],
    });
    expect(r.totals.waypoints).toBe(2);
    expect(r.totals.tracks).toBe(1);
    expect(r.totals.markups).toBe(3);
    expect(r.totals.journal).toBe(1);
    expect(r.totals.checklists).toBe(2);
  });

  it('does not mutate the input arrays', () => {
    const checklists = [
      gc({ id: 'b', tripDate: '2026-04-30' }),
      gc({ id: 'a', tripDate: '2026-04-26' }),
    ];
    const beforeIds = checklists.map((c) => c.id);
    buildDailyBriefing(TODAY, { checklists });
    expect(checklists.map((c) => c.id)).toEqual(beforeIds);
  });
});

describe('dailyBriefingHighlightCount', () => {
  it('returns 0 when nothing is happening today', () => {
    expect(dailyBriefingHighlightCount(TODAY, {})).toBe(0);
  });

  it('sums memories + upcoming + 1-if-logged-today', () => {
    const c = dailyBriefingHighlightCount(TODAY, {
      journalEntries: [
        je({ id: 'today', entryDate: '2026-04-25' }),
        je({ id: 'memory-2025', entryDate: '2025-04-25' }),
      ],
      checklists: [gc({ id: 'soon', tripDate: '2026-04-26' })],
    });
    // 1 memory + 1 upcoming + 1 (logged today) = 3
    expect(c).toBe(3);
  });
});

describe('streakAtRisk', () => {
  it('returns false when streak is below minStreak (default 2)', () => {
    expect(streakAtRisk('2026-04-25', 0, {})).toBe(false);
    expect(streakAtRisk('2026-04-25', 1, {})).toBe(false);
  });

  it('returns true when streak is active and nothing is logged today', () => {
    expect(streakAtRisk('2026-04-25', 5, {})).toBe(true);
  });

  it('returns false when a journal entry exists for today', () => {
    expect(
      streakAtRisk('2026-04-25', 5, {
        journalEntries: [je({ entryDate: '2026-04-25' })],
      }),
    ).toBe(false);
  });

  it('returns false when a waypoint was created today', () => {
    expect(
      streakAtRisk('2026-04-25', 5, {
        waypoints: [
          wp({ createdAt: new Date(2026, 3, 25, 9, 0, 0).toISOString() }),
        ],
      }),
    ).toBe(false);
  });

  it('returns false when a track started today', () => {
    expect(
      streakAtRisk('2026-04-25', 5, {
        tracks: [
          tr({ startedAt: new Date(2026, 3, 25, 14, 0, 0).toISOString() }),
        ],
      }),
    ).toBe(false);
  });

  it('returns false when a markup was created today', () => {
    expect(
      streakAtRisk('2026-04-25', 5, {
        markups: [
          mk({ createdAt: new Date(2026, 3, 25, 11, 0, 0).toISOString() }),
        ],
      }),
    ).toBe(false);
  });

  it('respects a custom minStreak threshold', () => {
    expect(streakAtRisk('2026-04-25', 3, {}, 5)).toBe(false);
    expect(streakAtRisk('2026-04-25', 5, {}, 5)).toBe(true);
  });
});
