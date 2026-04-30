/**
 * goalsService tests — Phase A.28 Annual Goal Tracker.
 *
 * Covers per-metric aggregation, scope filtering, year filtering,
 * leap-year length, pace verdict thresholds, and the unique-active-days
 * cross-source dedupe. Uses minimal hand-built factories so each test
 * controls only the fields it needs.
 */

import {
  computeGoalProgress,
  computeAllGoalProgress,
  unitForMetric,
  defaultLabelFor,
  pickFeaturedGoal,
} from '../goalsService';
import type { GoalProgress, PaceStatus } from '../../types/goal';
import type { Goal } from '../../types/goal';
import type { RecordedTrack } from '../../types/track';
import type { JournalEntry } from '../../types/journalEntry';
import type { UserWaypoint } from '../../types/userWaypoint';

// ────────────────────────── factories ──────────────────────────

function makeGoal(overrides: Partial<Goal> = {}): Goal {
  return {
    id: overrides.id ?? 'goal-1',
    label: overrides.label,
    scope: overrides.scope ?? 'all',
    metric: overrides.metric ?? 'track_count',
    targetValue: overrides.targetValue ?? 10,
    year: overrides.year ?? 2026,
    createdAt: overrides.createdAt ?? '2026-01-01T00:00:00.000Z',
    updatedAt: overrides.updatedAt ?? '2026-01-01T00:00:00.000Z',
  };
}

function makeTrack(overrides: Partial<RecordedTrack> = {}): RecordedTrack {
  return {
    id: overrides.id ?? `track-${Math.random()}`,
    mode: overrides.mode ?? 'hike',
    name: overrides.name ?? 'Test track',
    startedAt: overrides.startedAt ?? '2026-03-01T10:00:00.000Z',
    endedAt: overrides.endedAt ?? '2026-03-01T12:00:00.000Z',
    state: 'saved',
    samples: overrides.samples ?? [],
    distanceM: overrides.distanceM ?? 0,
    durationSec: overrides.durationSec ?? 0,
    elevationGainM: overrides.elevationGainM ?? 0,
    notes: overrides.notes,
  };
}

function makeJournal(overrides: Partial<JournalEntry> = {}): JournalEntry {
  return {
    id: overrides.id ?? `journal-${Math.random()}`,
    createdAt: overrides.createdAt ?? '2026-03-01T00:00:00.000Z',
    updatedAt: overrides.updatedAt ?? '2026-03-01T00:00:00.000Z',
    entryDate: overrides.entryDate ?? '2026-03-01',
    mode: overrides.mode ?? 'hunt',
    title: overrides.title ?? 'Test journal',
    body: overrides.body ?? '',
    outcome: overrides.outcome ?? 'note',
    tags: overrides.tags ?? [],
    photoUris: overrides.photoUris ?? [],
    weather: overrides.weather,
    locationLabel: overrides.locationLabel,
  };
}

function makeWaypoint(overrides: Partial<UserWaypoint> = {}): UserWaypoint {
  return {
    id: overrides.id ?? `wp-${Math.random()}`,
    createdAt: overrides.createdAt ?? '2026-03-01T00:00:00.000Z',
    updatedAt: overrides.updatedAt ?? '2026-03-01T00:00:00.000Z',
    mode: overrides.mode ?? 'hunt',
    category: overrides.category ?? 'other',
    title: overrides.title ?? 'Test pin',
    notes: overrides.notes ?? '',
    lat: overrides.lat ?? 39,
    lng: overrides.lng ?? -76,
    photoUris: overrides.photoUris ?? [],
    colorOverride: overrides.colorOverride,
  };
}

// ────────────────────────── unit helpers ──────────────────────────

describe('unitForMetric', () => {
  it('returns stable display unit per metric', () => {
    expect(unitForMetric('track_distance')).toBe('mi');
    expect(unitForMetric('track_duration')).toBe('hr');
    expect(unitForMetric('track_count')).toBe('tracks');
    expect(unitForMetric('elevation_gain')).toBe('ft');
    expect(unitForMetric('journal_entries')).toBe('entries');
    expect(unitForMetric('unique_active_days')).toBe('days');
    expect(unitForMetric('waypoint_count')).toBe('pins');
  });
});

describe('defaultLabelFor', () => {
  it('synthesizes "<year> <scope> <target> <unit>" for missing labels', () => {
    const goal = makeGoal({ year: 2026, scope: 'hike', metric: 'track_distance', targetValue: 100 });
    // Distance >= 10 mi formats with 1 decimal per fmt() rules
    expect(defaultLabelFor(goal)).toBe('2026 hike 100.0 mi');
  });

  it('renders "all-mode" for scope=all', () => {
    const goal = makeGoal({ year: 2026, scope: 'all', metric: 'unique_active_days', targetValue: 50 });
    expect(defaultLabelFor(goal)).toBe('2026 all-mode 50 days');
  });
});

// ────────────────────────── per-metric aggregation ──────────────────────────

describe('computeGoalProgress — per-metric aggregation', () => {
  const inputsEmpty = { tracks: [], journals: [], waypoints: [] };

  it('returns zero progress on empty inputs', () => {
    const goal = makeGoal({ metric: 'track_count', targetValue: 10 });
    const p = computeGoalProgress(goal, inputsEmpty, new Date(2026, 5, 15));
    expect(p.current).toBe(0);
    expect(p.percent).toBe(0);
    expect(p.target).toBe(10);
  });

  it('sums track_distance in miles', () => {
    const tracks = [
      makeTrack({ distanceM: 1609.344, mode: 'hike' }), // 1 mi
      makeTrack({ distanceM: 3218.688, mode: 'hike' }), // 2 mi
    ];
    const goal = makeGoal({ metric: 'track_distance', targetValue: 100, scope: 'hike' });
    const p = computeGoalProgress(goal, { ...inputsEmpty, tracks }, new Date(2026, 5, 15));
    expect(p.current).toBeCloseTo(3, 5);
  });

  it('sums track_duration in hours', () => {
    const tracks = [
      makeTrack({ durationSec: 3600 }), // 1 hr
      makeTrack({ durationSec: 1800 }), // 0.5 hr
    ];
    const goal = makeGoal({ metric: 'track_duration', targetValue: 50 });
    const p = computeGoalProgress(goal, { ...inputsEmpty, tracks }, new Date(2026, 5, 15));
    expect(p.current).toBeCloseTo(1.5, 5);
  });

  it('counts track_count', () => {
    const tracks = [makeTrack(), makeTrack(), makeTrack()];
    const goal = makeGoal({ metric: 'track_count', targetValue: 12 });
    const p = computeGoalProgress(goal, { ...inputsEmpty, tracks }, new Date(2026, 5, 15));
    expect(p.current).toBe(3);
  });

  it('sums elevation_gain in feet', () => {
    const tracks = [makeTrack({ elevationGainM: 1000 })]; // ~3280.84 ft
    const goal = makeGoal({ metric: 'elevation_gain', targetValue: 10000 });
    const p = computeGoalProgress(goal, { ...inputsEmpty, tracks }, new Date(2026, 5, 15));
    expect(p.current).toBeCloseTo(3280.84, 1);
  });

  it('counts journal_entries', () => {
    const journals = [
      makeJournal({ entryDate: '2026-02-10' }),
      makeJournal({ entryDate: '2026-04-20' }),
    ];
    const goal = makeGoal({ metric: 'journal_entries', targetValue: 12 });
    const p = computeGoalProgress(goal, { ...inputsEmpty, journals }, new Date(2026, 5, 15));
    expect(p.current).toBe(2);
  });

  it('counts waypoint_count', () => {
    const waypoints = [makeWaypoint(), makeWaypoint(), makeWaypoint()];
    const goal = makeGoal({ metric: 'waypoint_count', targetValue: 20 });
    const p = computeGoalProgress(goal, { ...inputsEmpty, waypoints }, new Date(2026, 5, 15));
    expect(p.current).toBe(3);
  });

  it('counts unique_active_days across all 3 source types and dedupes', () => {
    // Same calendar day across track + journal + waypoint counts ONCE.
    const tracks = [makeTrack({ startedAt: '2026-03-01T10:00:00.000Z' })];
    const journals = [makeJournal({ entryDate: '2026-03-01' })];
    const waypoints = [makeWaypoint({ createdAt: '2026-03-01T15:00:00.000Z' })];
    // Plus one extra unique day on tracks only.
    tracks.push(makeTrack({ startedAt: '2026-03-02T10:00:00.000Z' }));

    const goal = makeGoal({ metric: 'unique_active_days', targetValue: 50 });
    const p = computeGoalProgress(
      goal,
      { tracks, journals, waypoints },
      new Date(2026, 5, 15),
    );
    expect(p.current).toBe(2);
  });
});

// ────────────────────────── year filtering ──────────────────────────

describe('computeGoalProgress — year filtering', () => {
  it('drops tracks dated outside the goal year', () => {
    const tracks = [
      makeTrack({ startedAt: '2025-12-31T20:00:00.000Z', distanceM: 1609.344 }),
      makeTrack({ startedAt: '2026-06-15T12:00:00.000Z', distanceM: 1609.344 }),
      makeTrack({ startedAt: '2027-01-01T05:00:00.000Z', distanceM: 1609.344 }),
    ];
    const goal = makeGoal({ year: 2026, metric: 'track_distance', targetValue: 50 });
    const p = computeGoalProgress(
      goal,
      { tracks, journals: [], waypoints: [] },
      new Date(2026, 5, 15),
    );
    expect(p.current).toBeCloseTo(1, 5);
  });

  it('drops journals dated outside the goal year', () => {
    const journals = [
      makeJournal({ entryDate: '2025-12-15' }),
      makeJournal({ entryDate: '2026-01-01' }),
      makeJournal({ entryDate: '2027-01-01' }),
    ];
    const goal = makeGoal({ year: 2026, metric: 'journal_entries', targetValue: 10 });
    const p = computeGoalProgress(
      goal,
      { tracks: [], journals, waypoints: [] },
      new Date(2026, 5, 15),
    );
    expect(p.current).toBe(1);
  });

  it('silently drops rows with unparseable date strings', () => {
    const tracks = [
      makeTrack({ startedAt: 'not-a-date', distanceM: 1609.344 }),
      makeTrack({ startedAt: '2026-06-15T12:00:00.000Z', distanceM: 1609.344 }),
    ];
    const goal = makeGoal({ year: 2026, metric: 'track_distance', targetValue: 50 });
    const p = computeGoalProgress(
      goal,
      { tracks, journals: [], waypoints: [] },
      new Date(2026, 5, 15),
    );
    expect(p.current).toBeCloseTo(1, 5);
  });
});

// ────────────────────────── scope filtering ──────────────────────────

describe('computeGoalProgress — scope filtering', () => {
  it('scope=hike filters out non-hike tracks', () => {
    const tracks = [
      makeTrack({ mode: 'hike', distanceM: 1609.344 }),
      makeTrack({ mode: 'hunt', distanceM: 1609.344 }),
      makeTrack({ mode: 'fish', distanceM: 1609.344 }),
    ];
    const goal = makeGoal({ scope: 'hike', metric: 'track_distance', targetValue: 50 });
    const p = computeGoalProgress(
      goal,
      { tracks, journals: [], waypoints: [] },
      new Date(2026, 5, 15),
    );
    expect(p.current).toBeCloseTo(1, 5);
  });

  it('scope=all keeps every mode', () => {
    const tracks = [
      makeTrack({ mode: 'hike', distanceM: 1609.344 }),
      makeTrack({ mode: 'hunt', distanceM: 1609.344 }),
      makeTrack({ mode: 'fish', distanceM: 1609.344 }),
    ];
    const goal = makeGoal({ scope: 'all', metric: 'track_distance', targetValue: 50 });
    const p = computeGoalProgress(
      goal,
      { tracks, journals: [], waypoints: [] },
      new Date(2026, 5, 15),
    );
    expect(p.current).toBeCloseTo(3, 5);
  });

  it('scope=hunt also filters journals and waypoints', () => {
    const journals = [
      makeJournal({ mode: 'hunt' }),
      makeJournal({ mode: 'fish' }),
    ];
    const waypoints = [
      makeWaypoint({ mode: 'hunt' }),
      makeWaypoint({ mode: 'camp' }),
      makeWaypoint({ mode: 'hunt' }),
    ];
    const journalGoal = makeGoal({ scope: 'hunt', metric: 'journal_entries', targetValue: 10 });
    const wpGoal = makeGoal({ scope: 'hunt', metric: 'waypoint_count', targetValue: 20 });

    expect(
      computeGoalProgress(journalGoal, { tracks: [], journals, waypoints: [] }, new Date(2026, 5, 15)).current,
    ).toBe(1);
    expect(
      computeGoalProgress(wpGoal, { tracks: [], journals: [], waypoints }, new Date(2026, 5, 15)).current,
    ).toBe(2);
  });
});

// ────────────────────────── pace verdict ──────────────────────────

describe('computeGoalProgress — pace verdict', () => {
  // 100-mile goal in 2026 (non-leap, 365 days). Day 100 of the year =
  // April 10. Linear expected at day 100 = 100/365 * 100 ≈ 27.4 mi.
  const goal = makeGoal({
    year: 2026,
    metric: 'track_distance',
    targetValue: 100,
    scope: 'all',
  });
  const dayOfYear = (n: number) => {
    const d = new Date(2026, 0, 1);
    d.setDate(d.getDate() + n - 1);
    return d;
  };

  function tracksForMiles(miles: number): RecordedTrack[] {
    return [makeTrack({ distanceM: miles * 1609.344, startedAt: '2026-02-01T10:00:00.000Z' })];
  }

  it('paceStatus=behind when current is well below expected', () => {
    const p = computeGoalProgress(
      goal,
      { tracks: tracksForMiles(10), journals: [], waypoints: [] },
      dayOfYear(100),
    );
    expect(p.paceStatus).toBe('behind');
  });

  it('paceStatus=on_pace when current is within ±10% of expected', () => {
    // expected ~27.4 mi at day 100; 27 mi is ratio ~0.99 → on_pace
    const p = computeGoalProgress(
      goal,
      { tracks: tracksForMiles(27), journals: [], waypoints: [] },
      dayOfYear(100),
    );
    expect(p.paceStatus).toBe('on_pace');
  });

  it('paceStatus=ahead when current is well above expected', () => {
    const p = computeGoalProgress(
      goal,
      { tracks: tracksForMiles(60), journals: [], waypoints: [] },
      dayOfYear(100),
    );
    expect(p.paceStatus).toBe('ahead');
  });

  it('paceStatus=complete when current >= target (overrides ahead)', () => {
    const p = computeGoalProgress(
      goal,
      { tracks: tracksForMiles(105), journals: [], waypoints: [] },
      dayOfYear(100),
    );
    expect(p.paceStatus).toBe('complete');
    expect(p.percent).toBe(100); // capped
  });

  it('paceStatus=on_pace at year-start when expected is ~0', () => {
    const p = computeGoalProgress(
      goal,
      { tracks: [], journals: [], waypoints: [] },
      new Date(2025, 11, 31), // before year starts
    );
    expect(p.paceStatus).toBe('on_pace');
    expect(p.daysElapsed).toBe(0);
  });
});

// ────────────────────────── days elapsed / remaining ──────────────────────────

describe('computeGoalProgress — days elapsed and remaining', () => {
  it('returns 0 elapsed before year starts', () => {
    const goal = makeGoal({ year: 2026 });
    const p = computeGoalProgress(
      goal,
      { tracks: [], journals: [], waypoints: [] },
      new Date(2025, 6, 15),
    );
    expect(p.daysElapsed).toBe(0);
    expect(p.daysRemaining).toBe(365);
  });

  it('returns full year length after year ends', () => {
    const goal = makeGoal({ year: 2026 });
    const p = computeGoalProgress(
      goal,
      { tracks: [], journals: [], waypoints: [] },
      new Date(2027, 5, 1),
    );
    expect(p.daysElapsed).toBe(365);
    expect(p.daysRemaining).toBe(0);
  });

  it('uses 366 days for leap year 2024', () => {
    const goal = makeGoal({ year: 2024 });
    const p = computeGoalProgress(
      goal,
      { tracks: [], journals: [], waypoints: [] },
      new Date(2025, 5, 1),
    );
    expect(p.daysElapsed).toBe(366);
    expect(p.daysRemaining).toBe(0);
  });

  it('counts day 1 as elapsed=1 (not 0)', () => {
    const goal = makeGoal({ year: 2026 });
    const p = computeGoalProgress(
      goal,
      { tracks: [], journals: [], waypoints: [] },
      new Date(2026, 0, 1, 12, 0),
    );
    expect(p.daysElapsed).toBe(1);
  });
});

// ────────────────────────── display formatting ──────────────────────────

describe('computeGoalProgress — display formatting', () => {
  it('formats track_distance with 2 decimals under 10 mi, 1 above', () => {
    const goal = makeGoal({ metric: 'track_distance', targetValue: 100 });
    const tracks = [makeTrack({ distanceM: 5 * 1609.344 })];
    const p = computeGoalProgress(goal, { tracks, journals: [], waypoints: [] });
    expect(p.display.current).toBe('5.00');
    expect(p.display.target).toBe('100.0');
    expect(p.display.unit).toBe('mi');
  });

  it('formats counts as integers', () => {
    const goal = makeGoal({ metric: 'track_count', targetValue: 12 });
    const tracks = [makeTrack(), makeTrack(), makeTrack()];
    const p = computeGoalProgress(goal, { tracks, journals: [], waypoints: [] });
    expect(p.display.current).toBe('3');
    expect(p.display.target).toBe('12');
    expect(p.display.unit).toBe('tracks');
  });

  it('formats elevation_gain with thousands separator', () => {
    const goal = makeGoal({ metric: 'elevation_gain', targetValue: 50000 });
    const tracks = [makeTrack({ elevationGainM: 5000 })]; // ~16404 ft
    const p = computeGoalProgress(goal, { tracks, journals: [], waypoints: [] });
    // Locale-formatted; just assert it has a separator and the right magnitude
    expect(p.display.current).toMatch(/16,?404/);
    expect(p.display.target).toMatch(/50,?000/);
  });
});

// ────────────────────────── batch helper ──────────────────────────

describe('computeAllGoalProgress', () => {
  it('returns one progress row per goal in order', () => {
    const goals = [
      makeGoal({ id: 'a', metric: 'track_count', targetValue: 5 }),
      makeGoal({ id: 'b', metric: 'journal_entries', targetValue: 3 }),
    ];
    const ps = computeAllGoalProgress(
      goals,
      { tracks: [makeTrack()], journals: [makeJournal()], waypoints: [] },
      new Date(2026, 5, 15),
    );
    expect(ps).toHaveLength(2);
    expect(ps[0].goal.id).toBe('a');
    expect(ps[0].current).toBe(1);
    expect(ps[1].goal.id).toBe('b');
    expect(ps[1].current).toBe(1);
  });
});

// ────────────────────────── edge cases ──────────────────────────

describe('computeGoalProgress — edge cases', () => {
  it('target=0 yields 0% and on_pace (no division by zero)', () => {
    const goal = makeGoal({ targetValue: 0 });
    const p = computeGoalProgress(
      goal,
      { tracks: [makeTrack()], journals: [], waypoints: [] },
      new Date(2026, 5, 15),
    );
    expect(p.percent).toBe(0);
    expect(p.paceStatus).toBe('on_pace');
  });

  it('negative targetValue is clamped to 0', () => {
    const goal = makeGoal({ targetValue: -5 });
    const p = computeGoalProgress(
      goal,
      { tracks: [], journals: [], waypoints: [] },
      new Date(2026, 5, 15),
    );
    expect(p.target).toBe(0);
  });

  it('percent caps at 100', () => {
    const goal = makeGoal({ metric: 'track_count', targetValue: 5 });
    const tracks = Array.from({ length: 50 }, () => makeTrack());
    const p = computeGoalProgress(
      goal,
      { tracks, journals: [], waypoints: [] },
      new Date(2026, 5, 15),
    );
    expect(p.percent).toBe(100);
    expect(p.current).toBe(50); // raw value preserved
  });
});

// ────────────────────────── pickFeaturedGoal — Phase A.30 ──────────────────────────

/**
 * Synthetic GoalProgress factory — tests for the picker shouldn't have to
 * shape full Goal objects + recompute progress. We build the smallest
 * GoalProgress that satisfies the picker's read surface (year, paceStatus,
 * percent, createdAt) and stub the rest with sane placeholders.
 */
function makeProgress(overrides: {
  id?: string;
  year?: number;
  paceStatus?: PaceStatus;
  percent?: number;
  createdAt?: string;
}): GoalProgress {
  const goal = makeGoal({
    id: overrides.id ?? 'g',
    year: overrides.year ?? 2026,
    createdAt: overrides.createdAt ?? '2026-01-01T00:00:00.000Z',
  });
  return {
    goal,
    current: overrides.percent ?? 0,
    target: 100,
    percent: overrides.percent ?? 0,
    daysElapsed: 100,
    daysRemaining: 265,
    expectedAtThisPoint: 27,
    paceStatus: overrides.paceStatus ?? 'on_pace',
    display: { current: '50', target: '100', unit: 'mi' },
  };
}

describe('pickFeaturedGoal — closest-active-goal selector', () => {
  const NOW = new Date(2026, 5, 15); // June 15, 2026

  it('returns null for an empty list', () => {
    expect(pickFeaturedGoal([], NOW)).toBeNull();
  });

  it('returns null when every goal is for a past year', () => {
    const past = makeProgress({ year: 2025, percent: 50 });
    expect(pickFeaturedGoal([past], NOW)).toBeNull();
  });

  it('returns null when every active goal is already complete', () => {
    const done = makeProgress({ year: 2026, paceStatus: 'complete', percent: 100 });
    expect(pickFeaturedGoal([done], NOW)).toBeNull();
  });

  it('skips past-year goals but keeps current-year ones', () => {
    const old = makeProgress({ id: 'old', year: 2025, percent: 80 });
    const cur = makeProgress({ id: 'cur', year: 2026, percent: 30 });
    expect(pickFeaturedGoal([old, cur], NOW)?.goal.id).toBe('cur');
  });

  it('keeps future-year goals (already-active future targets are eligible)', () => {
    const future = makeProgress({ id: 'fut', year: 2027, percent: 10 });
    expect(pickFeaturedGoal([future], NOW)?.goal.id).toBe('fut');
  });

  it('prefers behind-pace over on-pace', () => {
    const ahead = makeProgress({ id: 'a', paceStatus: 'ahead', percent: 90 });
    const onPace = makeProgress({ id: 'o', paceStatus: 'on_pace', percent: 80 });
    const behind = makeProgress({ id: 'b', paceStatus: 'behind', percent: 10 });
    expect(pickFeaturedGoal([ahead, onPace, behind], NOW)?.goal.id).toBe('b');
  });

  it('prefers on-pace over ahead', () => {
    const ahead = makeProgress({ id: 'a', paceStatus: 'ahead', percent: 90 });
    const onPace = makeProgress({ id: 'o', paceStatus: 'on_pace', percent: 50 });
    expect(pickFeaturedGoal([ahead, onPace], NOW)?.goal.id).toBe('o');
  });

  it('within the same pace bucket, prefers higher percent', () => {
    const lo = makeProgress({ id: 'lo', paceStatus: 'behind', percent: 5 });
    const hi = makeProgress({ id: 'hi', paceStatus: 'behind', percent: 40 });
    expect(pickFeaturedGoal([lo, hi], NOW)?.goal.id).toBe('hi');
  });

  it('tiebreak on identical percent + pace: older createdAt wins', () => {
    const newer = makeProgress({
      id: 'newer',
      paceStatus: 'on_pace',
      percent: 50,
      createdAt: '2026-04-01T00:00:00.000Z',
    });
    const older = makeProgress({
      id: 'older',
      paceStatus: 'on_pace',
      percent: 50,
      createdAt: '2026-01-01T00:00:00.000Z',
    });
    expect(pickFeaturedGoal([newer, older], NOW)?.goal.id).toBe('older');
  });

  it('mixed eligible/ineligible: picks the one most-worth-acting on', () => {
    // Past-year complete + current-year complete + current-year on-pace +
    // current-year behind. Picker should land on the behind one.
    const expected = pickFeaturedGoal(
      [
        makeProgress({ id: 'past', year: 2024, percent: 100 }),
        makeProgress({
          id: 'curDone',
          year: 2026,
          paceStatus: 'complete',
          percent: 100,
        }),
        makeProgress({
          id: 'curOnPace',
          year: 2026,
          paceStatus: 'on_pace',
          percent: 60,
        }),
        makeProgress({
          id: 'curBehind',
          year: 2026,
          paceStatus: 'behind',
          percent: 12,
        }),
      ],
      NOW,
    );
    expect(expected?.goal.id).toBe('curBehind');
  });

  it('does not mutate the input array', () => {
    const a = makeProgress({ id: 'a', percent: 30 });
    const b = makeProgress({ id: 'b', percent: 10 });
    const list = [a, b];
    pickFeaturedGoal(list, NOW);
    expect(list).toEqual([a, b]);
  });
});
