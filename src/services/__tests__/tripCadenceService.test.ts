/**
 * @file tripCadenceService.test.ts
 * @description Locks Phase A.47 — past-only filter, year buckets,
 * cadence math (avg/longest gap), and friendly projections.
 */

import {
  LONG_GAP_THRESHOLD_DAYS,
  cadenceGapLabel,
  computeTripCadence,
  daysSinceLabel,
  tripMonthlyStreak,
} from '../tripCadenceService';
import type { CampTrip } from '../../types/camp';
import type { HikeTrip } from '../../types/hike';

const NOW = new Date(2026, 3, 25, 10, 30, 0); // 2026-04-25 10:30 local

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

describe('LONG_GAP_THRESHOLD_DAYS constant', () => {
  it('is 30 (locked)', () => {
    expect(LONG_GAP_THRESHOLD_DAYS).toBe(30);
  });
});

describe('computeTripCadence — empty', () => {
  it('returns zeros + null gaps when no trips', () => {
    const c = computeTripCadence({ campTrips: [], hikeTrips: [] }, NOW);
    expect(c.totalPast.total).toBe(0);
    expect(c.thisYear.total).toBe(0);
    expect(c.lastYear.total).toBe(0);
    expect(c.lastTripDate).toBeNull();
    expect(c.daysSinceLastTrip).toBeNull();
    expect(c.averageGapDays).toBeNull();
    expect(c.longestGapDays).toBeNull();
    expect(c.isLongGap).toBe(false);
  });
});

describe('computeTripCadence — past-only filter', () => {
  it('excludes future-dated trips entirely from totals', () => {
    const future = camp({ id: 'c-fut', arrivalDate: '2026-06-01', departureDate: '2026-06-03' });
    const past = camp({ id: 'c-past', arrivalDate: '2026-04-01', departureDate: '2026-04-03' });
    const c = computeTripCadence(
      { campTrips: [future, past], hikeTrips: [] },
      NOW,
    );
    expect(c.totalPast.total).toBe(1);
    expect(c.totalPast.camp).toBe(1);
  });

  it('today counts as past (start <= today)', () => {
    const today = camp({ id: 'c-tod', arrivalDate: '2026-04-25', departureDate: '2026-04-26' });
    const c = computeTripCadence(
      { campTrips: [today], hikeTrips: [] },
      NOW,
    );
    expect(c.totalPast.total).toBe(1);
    expect(c.daysSinceLastTrip).toBe(0);
  });

  it('drops trips with malformed start date', () => {
    const bad = camp({ id: 'c-bad', arrivalDate: 'garbage' });
    const c = computeTripCadence(
      { campTrips: [bad], hikeTrips: [] },
      NOW,
    );
    expect(c.totalPast.total).toBe(0);
  });
});

describe('computeTripCadence — by-kind tally', () => {
  it('separates camp from hike correctly', () => {
    const c1 = camp({ id: 'c-1', arrivalDate: '2026-03-15', departureDate: '2026-03-17' });
    const c2 = camp({ id: 'c-2', arrivalDate: '2026-03-20', departureDate: '2026-03-22' });
    const h1 = hike({ id: 'h-1', startDate: '2026-04-01' });
    const cad = computeTripCadence(
      { campTrips: [c1, c2], hikeTrips: [h1] },
      NOW,
    );
    expect(cad.totalPast).toEqual({ camp: 2, hike: 1, total: 3 });
  });
});

describe('computeTripCadence — year buckets', () => {
  it('bucketizes thisYear vs lastYear correctly', () => {
    const earlier = camp({ id: 'c-2024', arrivalDate: '2024-08-01', departureDate: '2024-08-03' });
    const lastYr = camp({ id: 'c-2025', arrivalDate: '2025-08-01', departureDate: '2025-08-03' });
    const thisYr = hike({ id: 'h-2026', startDate: '2026-03-15' });
    const cad = computeTripCadence(
      { campTrips: [earlier, lastYr], hikeTrips: [thisYr] },
      NOW,
    );
    expect(cad.totalPast.total).toBe(3);
    expect(cad.thisYear.total).toBe(1);
    expect(cad.thisYear.hike).toBe(1);
    expect(cad.lastYear.total).toBe(1);
    expect(cad.lastYear.camp).toBe(1);
    // earlier-than-last-year doesn't appear in either bucket but DOES
    // appear in totalPast.
  });
});

describe('computeTripCadence — last trip + days-since', () => {
  it('reports last trip date and daysSinceLastTrip', () => {
    const trips = [
      camp({ id: 'c-1', arrivalDate: '2026-03-01', departureDate: '2026-03-03' }),
      camp({ id: 'c-2', arrivalDate: '2026-04-10', departureDate: '2026-04-12' }),
    ];
    const cad = computeTripCadence(
      { campTrips: trips, hikeTrips: [] },
      NOW,
    );
    expect(cad.lastTripDate).toBe('2026-04-10');
    expect(cad.daysSinceLastTrip).toBe(15);
  });

  it('isLongGap true when daysSinceLastTrip > 30', () => {
    const trip = camp({ id: 'c-1', arrivalDate: '2026-02-15', departureDate: '2026-02-17' }); // ~69d ago
    const cad = computeTripCadence(
      { campTrips: [trip], hikeTrips: [] },
      NOW,
    );
    expect(cad.daysSinceLastTrip).toBe(69);
    expect(cad.isLongGap).toBe(true);
  });

  it('isLongGap false at exactly 30 days', () => {
    const trip = camp({ id: 'c-1', arrivalDate: '2026-03-26', departureDate: '2026-03-27' }); // 30d
    const cad = computeTripCadence(
      { campTrips: [trip], hikeTrips: [] },
      NOW,
    );
    expect(cad.daysSinceLastTrip).toBe(30);
    expect(cad.isLongGap).toBe(false); // not strictly greater
  });
});

describe('computeTripCadence — gap math', () => {
  it('average + longest gap require ≥2 trips (else null)', () => {
    const trip = camp({ id: 'c-1', arrivalDate: '2026-04-01', departureDate: '2026-04-03' });
    const cad = computeTripCadence(
      { campTrips: [trip], hikeTrips: [] },
      NOW,
    );
    expect(cad.averageGapDays).toBeNull();
    expect(cad.longestGapDays).toBeNull();
  });

  it('computes average and longest gap across consecutive trips', () => {
    const trips = [
      camp({ id: 'c-1', arrivalDate: '2026-01-01', departureDate: '2026-01-02' }),
      camp({ id: 'c-2', arrivalDate: '2026-01-15', departureDate: '2026-01-16' }), // gap 14
      camp({ id: 'c-3', arrivalDate: '2026-02-04', departureDate: '2026-02-05' }), // gap 20
      camp({ id: 'c-4', arrivalDate: '2026-04-15', departureDate: '2026-04-16' }), // gap 70
    ];
    const cad = computeTripCadence(
      { campTrips: trips, hikeTrips: [] },
      NOW,
    );
    // gaps: 14, 20, 70 → avg = (104/3) ≈ 35
    expect(cad.averageGapDays).toBe(35);
    expect(cad.longestGapDays).toBe(70);
  });

  it('multiple trips on the same start day collapse to one for gap math', () => {
    const c1 = camp({ id: 'c-A', arrivalDate: '2026-04-01', departureDate: '2026-04-03' });
    const c2 = camp({ id: 'c-B', arrivalDate: '2026-04-01', departureDate: '2026-04-02' }); // same day
    const h1 = hike({ id: 'h-1', startDate: '2026-04-15' });
    const cad = computeTripCadence(
      { campTrips: [c1, c2], hikeTrips: [h1] },
      NOW,
    );
    // Gap should be exactly 14 (Apr-1 → Apr-15), NOT 0 from the same-day pair.
    expect(cad.averageGapDays).toBe(14);
    expect(cad.longestGapDays).toBe(14);
    // But totalPast counts every trip — same-day collapse is ONLY for
    // gap math, not totals.
    expect(cad.totalPast.total).toBe(3);
  });

  it('cross-kind trips contribute to the same gap series', () => {
    const trips = {
      campTrips: [
        camp({ id: 'c-1', arrivalDate: '2026-01-01', departureDate: '2026-01-02' }),
        camp({ id: 'c-2', arrivalDate: '2026-02-01', departureDate: '2026-02-03' }),
      ],
      hikeTrips: [
        hike({ id: 'h-1', startDate: '2026-01-15' }), // gap 14 then 17
      ],
    };
    const cad = computeTripCadence(trips, NOW);
    // sortedDays: Jan 1, Jan 15, Feb 1 → gaps 14, 17 → avg 16, longest 17
    expect(cad.averageGapDays).toBe(16);
    expect(cad.longestGapDays).toBe(17);
  });
});

describe('daysSinceLabel', () => {
  it('null → "no trips yet"', () => {
    expect(daysSinceLabel(null)).toBe('no trips yet');
  });

  it('0 (or negative defensive) → "today"', () => {
    expect(daysSinceLabel(0)).toBe('today');
    expect(daysSinceLabel(-1)).toBe('today');
  });

  it('1 → "yesterday"', () => {
    expect(daysSinceLabel(1)).toBe('yesterday');
  });

  it('N>1 → "N days ago"', () => {
    expect(daysSinceLabel(5)).toBe('5 days ago');
  });
});

describe('cadenceGapLabel', () => {
  it('null → em dash', () => {
    expect(cadenceGapLabel(null)).toBe('—');
  });

  it('0 → "multiple/day"', () => {
    expect(cadenceGapLabel(0)).toBe('multiple/day');
  });

  it('1 → "every 1 day"', () => {
    expect(cadenceGapLabel(1)).toBe('every 1 day');
  });

  it('N → "every N days"', () => {
    expect(cadenceGapLabel(14)).toBe('every 14 days');
  });
});

describe('tripMonthlyStreak — Phase A.50', () => {
  it('zeros when no past trips', () => {
    expect(
      tripMonthlyStreak({ campTrips: [], hikeTrips: [] }, NOW),
    ).toEqual({ current: 0, longest: 0 });
  });

  it('current = 1 when only this month has a trip', () => {
    const t = camp({ arrivalDate: '2026-04-10', departureDate: '2026-04-12' });
    const s = tripMonthlyStreak({ campTrips: [t], hikeTrips: [] }, NOW);
    expect(s.current).toBe(1);
    expect(s.longest).toBe(1);
  });

  it('current is forgiving — empty current month walks back from last month', () => {
    // NOW = 2026-04-25. No April trip; March + Feb + Jan all have one.
    // Current should still be 3 (forgiving on the in-progress month).
    const trips = [
      camp({ id: 'c-jan', arrivalDate: '2026-01-15', departureDate: '2026-01-16' }),
      camp({ id: 'c-feb', arrivalDate: '2026-02-15', departureDate: '2026-02-16' }),
      camp({ id: 'c-mar', arrivalDate: '2026-03-15', departureDate: '2026-03-16' }),
    ];
    const s = tripMonthlyStreak({ campTrips: trips, hikeTrips: [] }, NOW);
    expect(s.current).toBe(3);
    expect(s.longest).toBe(3);
  });

  it('current resets to 0 when last-month is empty AND this-month is empty', () => {
    // NOW = 2026-04-25. Last trip was Feb. Both Mar and Apr empty.
    const t = camp({ arrivalDate: '2026-02-10', departureDate: '2026-02-11' });
    const s = tripMonthlyStreak({ campTrips: [t], hikeTrips: [] }, NOW);
    expect(s.current).toBe(0);
    // longest still 1 — the user did go in February.
    expect(s.longest).toBe(1);
  });

  it('multiple trips in same month count as one for streak math', () => {
    const trips = [
      camp({ id: 'c-1', arrivalDate: '2026-04-05', departureDate: '2026-04-06' }),
      camp({ id: 'c-2', arrivalDate: '2026-04-20', departureDate: '2026-04-21' }),
    ];
    const s = tripMonthlyStreak({ campTrips: trips, hikeTrips: [] }, NOW);
    expect(s.current).toBe(1);
    expect(s.longest).toBe(1);
  });

  it('counts year-boundary streaks (Dec→Jan→Feb)', () => {
    const trips = [
      camp({ id: 'c-dec', arrivalDate: '2025-12-15', departureDate: '2025-12-16' }),
      camp({ id: 'c-jan', arrivalDate: '2026-01-15', departureDate: '2026-01-16' }),
      camp({ id: 'c-feb', arrivalDate: '2026-02-15', departureDate: '2026-02-16' }),
    ];
    const s = tripMonthlyStreak({ campTrips: trips, hikeTrips: [] }, NOW);
    // current walks from Apr (empty) → Mar (empty) → break.
    // longest = 3 (Dec/Jan/Feb).
    expect(s.longest).toBe(3);
  });

  it('cross-kind months collapse to one (camp + hike same month = 1)', () => {
    const trips = {
      campTrips: [
        camp({ arrivalDate: '2026-03-10', departureDate: '2026-03-12' }),
      ],
      hikeTrips: [
        hike({ startDate: '2026-03-25' }),
      ],
    };
    const s = tripMonthlyStreak(trips, NOW);
    expect(s.longest).toBe(1);
  });

  it('longest tracks max even when current is shorter', () => {
    // Long old run + short fresh run.
    const trips = [
      camp({ id: 'c1', arrivalDate: '2025-01-05', departureDate: '2025-01-06' }),
      camp({ id: 'c2', arrivalDate: '2025-02-05', departureDate: '2025-02-06' }),
      camp({ id: 'c3', arrivalDate: '2025-03-05', departureDate: '2025-03-06' }),
      camp({ id: 'c4', arrivalDate: '2025-04-05', departureDate: '2025-04-06' }),
      // Gap...
      camp({ id: 'c5', arrivalDate: '2026-04-05', departureDate: '2026-04-06' }),
    ];
    const s = tripMonthlyStreak({ campTrips: trips, hikeTrips: [] }, NOW);
    expect(s.current).toBe(1);
    expect(s.longest).toBe(4);
  });

  it('ignores future-dated trips entirely', () => {
    const future = camp({ arrivalDate: '2026-06-01', departureDate: '2026-06-02' });
    const past = camp({ id: 'c-past', arrivalDate: '2026-04-10', departureDate: '2026-04-11' });
    const s = tripMonthlyStreak(
      { campTrips: [future, past], hikeTrips: [] },
      NOW,
    );
    expect(s.current).toBe(1);
    expect(s.longest).toBe(1);
  });

  it('ignores trips with malformed start dates', () => {
    const bad = camp({ arrivalDate: 'garbage' });
    expect(
      tripMonthlyStreak({ campTrips: [bad], hikeTrips: [] }, NOW),
    ).toEqual({ current: 0, longest: 0 });
  });
});
