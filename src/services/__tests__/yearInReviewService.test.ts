/**
 * Tests for yearInReviewService — V2.3 Phase A.23.
 *
 * Synthetic factories build minimally-typed artifacts so the test focuses
 * on the year-bucketing + tally logic without depending on the full
 * domain types' optional fields.
 */
import {
  computeYearInReview,
  availableYearsWithActivity,
  computeYearInReviewTrips,
} from '../yearInReviewService';
import type { UserWaypoint, WaypointMode } from '../../types/userWaypoint';
import type { RecordedTrack } from '../../types/track';
import type { UserMarkup } from '../../types/userMarkup';
import type { JournalEntry } from '../../types/journalEntry';
import type { GearChecklist } from '../../types/gearChecklist';
import type { CampTrip } from '../../types/camp';
import type { HikeTrip } from '../../types/hike';

// ── Synthetic factories ─────────────────────────────────────────────────
let idCounter = 0;
const nextId = () => `id-${++idCounter}`;

function wp(
  mode: WaypointMode,
  isoCreatedAt: string,
  photos: string[] = [],
): UserWaypoint {
  return {
    id: nextId(),
    mode,
    name: 'pin',
    notes: '',
    coordinate: { latitude: 39, longitude: -76 },
    createdAt: isoCreatedAt,
    updatedAt: isoCreatedAt,
    photoUris: photos,
  } as unknown as UserWaypoint;
}

function tr(
  mode: WaypointMode,
  isoStartedAt: string,
  distanceM: number = 1000,
  elevationGainM: number = 0,
  durationSec: number = 600,
): RecordedTrack {
  return {
    id: nextId(),
    mode,
    name: 'track',
    notes: '',
    startedAt: isoStartedAt,
    endedAt: isoStartedAt,
    distanceM,
    elevationGainM,
    durationSec,
    samples: [],
  } as unknown as RecordedTrack;
}

function mk(mode: WaypointMode, isoCreatedAt: string): UserMarkup {
  // LineString shape — sufficient for date-bucketing tests.
  return {
    id: nextId(),
    mode,
    kind: 'line',
    name: 'line',
    notes: '',
    coordinates: [
      { latitude: 39, longitude: -76 },
      { latitude: 39.01, longitude: -76 },
    ],
    color: '#fff',
    createdAt: isoCreatedAt,
    updatedAt: isoCreatedAt,
  } as unknown as UserMarkup;
}

function je(
  mode: WaypointMode,
  ymd: string,
  tags: string[] = [],
  photos: string[] = [],
): JournalEntry {
  return {
    id: nextId(),
    mode,
    entryDate: ymd,
    title: 'entry',
    body: '',
    outcome: 'scout',
    tags,
    photoUris: photos,
    createdAt: `${ymd}T12:00:00Z`,
    updatedAt: `${ymd}T12:00:00Z`,
  } as unknown as JournalEntry;
}

function gc(
  mode: WaypointMode,
  isoCreatedAt: string,
  tripDate?: string,
): GearChecklist {
  return {
    id: nextId(),
    mode,
    name: 'list',
    items: [],
    createdAt: isoCreatedAt,
    updatedAt: isoCreatedAt,
    tripDate,
  } as unknown as GearChecklist;
}

beforeEach(() => {
  idCounter = 0;
});

// ── availableYearsWithActivity ──────────────────────────────────────────
describe('availableYearsWithActivity', () => {
  test('always includes current year', () => {
    const today = new Date(2026, 5, 1);
    const out = availableYearsWithActivity({}, today);
    expect(out).toEqual([2026]);
  });

  test('returns descending years from all 5 layers', () => {
    const today = new Date(2026, 5, 1);
    const inputs = {
      waypoints: [wp('hunt', '2024-10-15T13:00:00Z')],
      tracks: [tr('hike', '2025-08-20T13:00:00Z')],
      markups: [mk('camp', '2023-04-01T13:00:00Z')],
      journalEntries: [je('fish', '2025-07-04')],
      checklists: [gc('hunt', '2022-11-11T13:00:00Z')],
    };
    const out = availableYearsWithActivity(inputs, today);
    expect(out).toEqual([2026, 2025, 2024, 2023, 2022]);
  });

  test('skips malformed dates', () => {
    const today = new Date(2026, 5, 1);
    const inputs = {
      waypoints: [wp('hunt', 'not-a-date')],
      journalEntries: [je('fish', 'bad-ymd' as unknown as string)],
    };
    const out = availableYearsWithActivity(inputs, today);
    expect(out).toEqual([2026]);
  });
});

// ── computeYearInReview ─────────────────────────────────────────────────
describe('computeYearInReview', () => {
  test('empty inputs return zeros for the requested year', () => {
    const r = computeYearInReview(2026, {});
    expect(r.year).toBe(2026);
    expect(r.totals.daysActive).toBe(0);
    expect(r.totals.tracks).toBe(0);
    expect(r.totals.distanceM).toBe(0);
    expect(r.byMode).toHaveLength(4);
    expect(r.byMode.every((b) => b.count === 0)).toBe(true);
    expect(r.topMode).toBeNull();
    expect(r.topTag).toBeNull();
    expect(r.longestStreakInYear).toBe(0);
    expect(r.biggestDay).toBeNull();
    expect(r.firstActivityDate).toBeNull();
    expect(r.lastActivityDate).toBeNull();
    expect(r.monthsActive).toEqual([]);
  });

  test('filters out artifacts from other years', () => {
    const r = computeYearInReview(2026, {
      tracks: [
        tr('hike', '2025-12-31T13:00:00Z', 1000),
        tr('hike', '2026-01-01T13:00:00Z', 2000),
        tr('hike', '2027-01-01T13:00:00Z', 3000),
      ],
    });
    expect(r.totals.tracks).toBe(1);
    expect(r.totals.distanceM).toBe(2000);
  });

  test('aggregates across all 5 layers + photos', () => {
    const r = computeYearInReview(2026, {
      waypoints: [wp('hunt', '2026-01-15T13:00:00Z', ['p1.jpg', 'p2.jpg'])],
      tracks: [tr('hike', '2026-03-10T13:00:00Z', 1500, 100, 1800)],
      markups: [mk('fish', '2026-04-05T13:00:00Z')],
      journalEntries: [je('hunt', '2026-05-01', ['cold'], ['p3.jpg'])],
      checklists: [gc('camp', '2025-12-01T13:00:00Z', '2026-06-15')],
    });
    expect(r.totals.waypoints).toBe(1);
    expect(r.totals.tracks).toBe(1);
    expect(r.totals.markups).toBe(1);
    expect(r.totals.journals).toBe(1);
    expect(r.totals.checklists).toBe(1);
    expect(r.totals.photos).toBe(3);
    expect(r.totals.distanceM).toBe(1500);
    expect(r.totals.elevationGainM).toBe(100);
    expect(r.totals.durationSec).toBe(1800);
    expect(r.totals.daysActive).toBe(5);
  });

  test('topMode tracks the mode with most artifacts', () => {
    const r = computeYearInReview(2026, {
      waypoints: [
        wp('hunt', '2026-01-01T13:00:00Z'),
        wp('hunt', '2026-02-01T13:00:00Z'),
        wp('fish', '2026-03-01T13:00:00Z'),
      ],
    });
    expect(r.topMode).toBe('hunt');
  });

  test('topMode tie-breaks deterministically (hunt before fish)', () => {
    const r = computeYearInReview(2026, {
      waypoints: [
        wp('hunt', '2026-01-01T13:00:00Z'),
        wp('fish', '2026-01-01T13:00:00Z'),
      ],
    });
    expect(r.topMode).toBe('hunt');
  });

  test('topTag normalizes case-insensitively but preserves first casing', () => {
    const r = computeYearInReview(2026, {
      journalEntries: [
        je('hunt', '2026-01-01', ['Cold Front']),
        je('hunt', '2026-01-02', ['cold front']),
        je('hunt', '2026-01-03', ['NW Wind']),
      ],
    });
    expect(r.topTag).toEqual({ tag: 'Cold Front', count: 2 });
  });

  test('longestStreakInYear runs over consecutive local days', () => {
    const r = computeYearInReview(2026, {
      journalEntries: [
        je('hike', '2026-04-20'),
        je('hike', '2026-04-21'),
        je('hike', '2026-04-22'),
        je('hike', '2026-04-23'),
        je('hike', '2026-04-25'), // 1-day gap breaks the streak
      ],
    });
    expect(r.longestStreakInYear).toBe(4);
  });

  test('longestStreakInYear is year-bounded (Dec 31 → Jan 1 does NOT continue)', () => {
    // Even though calendar-wise these are consecutive, the year boundary
    // splits the run. The 2026 review should report a 1-day longest streak.
    const r = computeYearInReview(2026, {
      journalEntries: [
        je('hunt', '2025-12-31'),
        je('hunt', '2026-01-01'),
        je('hunt', '2026-01-03'),
      ],
    });
    expect(r.longestStreakInYear).toBe(1);
  });

  test('biggestDay picks the day with most artifacts; ties go to earlier date', () => {
    const r = computeYearInReview(2026, {
      waypoints: [
        wp('hunt', '2026-04-01T13:00:00Z'),
        wp('hunt', '2026-04-01T14:00:00Z'),
        wp('hunt', '2026-04-02T13:00:00Z'),
        wp('hunt', '2026-04-02T14:00:00Z'),
      ],
    });
    expect(r.biggestDay).toEqual({ date: '2026-04-01', count: 2 });
  });

  test('first/last activity dates come from sort order, not insertion', () => {
    const r = computeYearInReview(2026, {
      journalEntries: [
        je('hunt', '2026-08-15'),
        je('hunt', '2026-02-10'),
        je('hunt', '2026-11-30'),
      ],
    });
    expect(r.firstActivityDate).toBe('2026-02-10');
    expect(r.lastActivityDate).toBe('2026-11-30');
  });

  test('monthsActive lists unique months ascending', () => {
    const r = computeYearInReview(2026, {
      journalEntries: [
        je('hunt', '2026-01-15'),
        je('hunt', '2026-01-20'),
        je('hunt', '2026-06-15'),
        je('hunt', '2026-12-01'),
      ],
    });
    expect(r.monthsActive).toEqual([0, 5, 11]);
  });

  test('checklists prefer tripDate over createdAt when present', () => {
    // createdAt in 2025, tripDate in 2026 → counts toward 2026.
    const r = computeYearInReview(2026, {
      checklists: [gc('camp', '2025-11-15T13:00:00Z', '2026-03-15')],
    });
    expect(r.totals.checklists).toBe(1);
  });

  test('byMode reports per-mode counts and unique days', () => {
    const r = computeYearInReview(2026, {
      waypoints: [
        wp('hunt', '2026-01-01T13:00:00Z'),
        wp('hunt', '2026-01-01T14:00:00Z'),
        wp('hike', '2026-02-15T13:00:00Z'),
      ],
    });
    const hunt = r.byMode.find((b) => b.mode === 'hunt');
    const hike = r.byMode.find((b) => b.mode === 'hike');
    const fish = r.byMode.find((b) => b.mode === 'fish');
    expect(hunt).toEqual({ mode: 'hunt', count: 2, daysActive: 1 });
    expect(hike).toEqual({ mode: 'hike', count: 1, daysActive: 1 });
    expect(fish).toEqual({ mode: 'fish', count: 0, daysActive: 0 });
  });
});

// ── Phase A.51 — trips section ──

function camp(overrides: Partial<CampTrip> = {}): CampTrip {
  return {
    id: 'c-1',
    campgroundId: 'cg-1',
    campgroundName: 'Assateague',
    tripName: 'Trip',
    arrivalDate: '2026-04-01',
    departureDate: '2026-04-03',
    partySize: 4,
    tripType: 'family',
    notes: null,
    gearChecklistId: null,
    groupCampId: null,
    createdAt: '2026-04-01T00:00:00.000Z',
    updatedAt: '2026-04-01T00:00:00.000Z',
    ...overrides,
  };
}

function hike(overrides: Partial<HikeTrip> = {}): HikeTrip {
  return {
    id: 'h-1',
    name: 'Pen Mar',
    trailId: 'md-appalachian-trail',
    startTrailheadId: null,
    endTrailheadId: null,
    startDate: '2026-04-01',
    nights: 0,
    partySize: 2,
    tier: 'day',
    plannedShelterIds: [],
    plannedMileage: 5,
    gearChecklistId: null,
    notes: null,
    createdAt: '2026-04-01T00:00:00.000Z',
    updatedAt: '2026-04-01T00:00:00.000Z',
    ...overrides,
  };
}

describe('computeYearInReviewTrips', () => {
  it('returns zeros and nulls when no trips', () => {
    expect(computeYearInReviewTrips(2026)).toEqual({
      camp: 0,
      hike: 0,
      total: 0,
      longestGapDaysInYear: null,
      busiestMonth: null,
    });
  });

  it('counts camp + hike trips that started in the requested year', () => {
    const r = computeYearInReviewTrips(2026, {
      campTrips: [
        camp({ id: 'c-1', arrivalDate: '2026-04-01' }),
        camp({ id: 'c-2', arrivalDate: '2026-06-15' }),
      ],
      hikeTrips: [
        hike({ id: 'h-1', startDate: '2026-05-01' }),
      ],
    });
    expect(r.camp).toBe(2);
    expect(r.hike).toBe(1);
    expect(r.total).toBe(3);
  });

  it('excludes trips from other years', () => {
    const r = computeYearInReviewTrips(2026, {
      campTrips: [
        camp({ id: 'c-old', arrivalDate: '2025-12-15' }),
        camp({ id: 'c-new', arrivalDate: '2027-01-05' }),
        camp({ id: 'c-target', arrivalDate: '2026-04-01' }),
      ],
      hikeTrips: [],
    });
    expect(r.total).toBe(1);
    expect(r.camp).toBe(1);
  });

  it('skips malformed dates rather than throwing', () => {
    const r = computeYearInReviewTrips(2026, {
      campTrips: [camp({ arrivalDate: 'garbage' })],
      hikeTrips: [],
    });
    expect(r.total).toBe(0);
  });

  it('longest in-year gap uses dates in days', () => {
    const r = computeYearInReviewTrips(2026, {
      campTrips: [
        camp({ id: 'c-1', arrivalDate: '2026-01-01' }),
        camp({ id: 'c-2', arrivalDate: '2026-01-15' }), // 14
        camp({ id: 'c-3', arrivalDate: '2026-04-15' }), // 90
      ],
      hikeTrips: [],
    });
    expect(r.longestGapDaysInYear).toBe(90);
  });

  it('longestGapDaysInYear is null when fewer than 2 trips in year', () => {
    const r = computeYearInReviewTrips(2026, {
      campTrips: [camp({ arrivalDate: '2026-04-01' })],
      hikeTrips: [],
    });
    expect(r.longestGapDaysInYear).toBeNull();
  });

  it('busiestMonth picks the YYYY-MM with the most trips', () => {
    const r = computeYearInReviewTrips(2026, {
      campTrips: [
        camp({ id: 'c-1', arrivalDate: '2026-04-01' }),
        camp({ id: 'c-2', arrivalDate: '2026-04-15' }),
        camp({ id: 'c-3', arrivalDate: '2026-06-01' }),
      ],
      hikeTrips: [],
    });
    expect(r.busiestMonth).toBe('2026-04');
  });

  it('busiestMonth tie-break: earliest YM wins', () => {
    const r = computeYearInReviewTrips(2026, {
      campTrips: [
        camp({ id: 'c-1', arrivalDate: '2026-03-15' }),
        camp({ id: 'c-2', arrivalDate: '2026-05-15' }),
      ],
      hikeTrips: [],
    });
    expect(r.busiestMonth).toBe('2026-03');
  });
});
