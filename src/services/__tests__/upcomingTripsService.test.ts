/**
 * @file upcomingTripsService.test.ts
 * @description Locks the Phase A.41 cross-planner trip aggregator.
 *
 * The service combines two different shapes (CampTrip + HikeTrip) into
 * a unified, sorted, optionally-past-filtered list. The tests cover:
 *   - daysUntil math (today, tomorrow, future, past, edge cases)
 *   - sort: chronological, name tie-break
 *   - includePast filter
 *   - nightsBetween subtitle helper
 *   - relativeDayLabel projection
 *   - headline + count projections
 */

import {
  listUpcomingTrips,
  upcomingTripsCount,
  upcomingTripsHeadline,
  pickFeaturedTrip,
  daysUntilLocal,
  ymdToLocalDate,
  relativeDayLabel,
  nightsBetween,
  tripChecklistMode,
  tripChecklistName,
  tripChecklistDate,
  type UpcomingTripRow,
} from '../upcomingTripsService';
import type { CampTrip } from '../../types/camp';
import type { HikeTrip } from '../../types/hike';

const NOW = new Date(2026, 3, 25, 10, 30, 0); // 2026-04-25 10:30 local

function camp(overrides: Partial<CampTrip> = {}): CampTrip {
  return {
    id: 'c-1',
    campgroundId: 'cg-1',
    campgroundName: 'Assateague Oceanside',
    tripName: 'Memorial Day Trip',
    arrivalDate: '2026-05-23',
    departureDate: '2026-05-26',
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
    name: 'Pen Mar to Rocky Run',
    trailId: 'md-appalachian-trail',
    startTrailheadId: 'th-pen-mar',
    endTrailheadId: 'th-rocky-run',
    startDate: '2026-05-02',
    nights: 1,
    partySize: 2,
    tier: 'overnight',
    plannedShelterIds: ['shelter-rocky-run'],
    plannedMileage: 12.4,
    gearChecklistId: null,
    notes: null,
    createdAt: '2026-04-01T00:00:00.000Z',
    updatedAt: '2026-04-01T00:00:00.000Z',
    ...overrides,
  };
}

// ── ymdToLocalDate ──

describe('ymdToLocalDate', () => {
  it('parses to local-midnight (no UTC drift)', () => {
    const d = ymdToLocalDate('2026-04-25');
    expect(d.getFullYear()).toBe(2026);
    expect(d.getMonth()).toBe(3);
    expect(d.getDate()).toBe(25);
    expect(d.getHours()).toBe(0);
  });

  it('returns Invalid Date for malformed input', () => {
    expect(isNaN(ymdToLocalDate('garbage').getTime())).toBe(true);
    expect(isNaN(ymdToLocalDate('2026-4-5').getTime())).toBe(true); // not zero-padded
  });
});

// ── daysUntilLocal ──

describe('daysUntilLocal', () => {
  it('returns 0 for today', () => {
    expect(daysUntilLocal(NOW, '2026-04-25')).toBe(0);
  });

  it('returns 1 for tomorrow', () => {
    expect(daysUntilLocal(NOW, '2026-04-26')).toBe(1);
  });

  it('returns positive N for future dates', () => {
    expect(daysUntilLocal(NOW, '2026-05-02')).toBe(7);
  });

  it('returns negative N for past dates', () => {
    expect(daysUntilLocal(NOW, '2026-04-20')).toBe(-5);
  });

  it('returns NaN for malformed input', () => {
    expect(isNaN(daysUntilLocal(NOW, 'garbage'))).toBe(true);
  });
});

// ── nightsBetween ──

describe('nightsBetween', () => {
  it('returns the integer night-count', () => {
    expect(nightsBetween('2026-05-23', '2026-05-26')).toBe(3);
  });

  it('returns 0 for same-day arrival + departure', () => {
    expect(nightsBetween('2026-05-23', '2026-05-23')).toBe(0);
  });

  it('coerces negative spans to 0', () => {
    expect(nightsBetween('2026-05-26', '2026-05-23')).toBe(0);
  });

  it('returns 0 for malformed input', () => {
    expect(nightsBetween('garbage', '2026-05-23')).toBe(0);
  });
});

// ── relativeDayLabel ──

describe('relativeDayLabel', () => {
  it('returns "today" for 0', () => {
    expect(relativeDayLabel(0)).toBe('today');
  });

  it('returns "tomorrow" for 1', () => {
    expect(relativeDayLabel(1)).toBe('tomorrow');
  });

  it('returns "in N days" for N > 1', () => {
    expect(relativeDayLabel(7)).toBe('in 7 days');
  });

  it('returns "yesterday" for -1', () => {
    expect(relativeDayLabel(-1)).toBe('yesterday');
  });

  it('returns "N days ago" for past', () => {
    expect(relativeDayLabel(-5)).toBe('5 days ago');
  });
});

// ── listUpcomingTrips ──

describe('listUpcomingTrips — sort + filter', () => {
  it('returns empty list when no trips', () => {
    const rows = listUpcomingTrips({ campTrips: [], hikeTrips: [] }, NOW);
    expect(rows).toEqual([]);
  });

  it('drops past trips by default', () => {
    const past = camp({ id: 'c-past', arrivalDate: '2026-04-01', departureDate: '2026-04-03' });
    const future = camp({ id: 'c-future', arrivalDate: '2026-05-23' });
    const rows = listUpcomingTrips(
      { campTrips: [past, future], hikeTrips: [] },
      NOW,
    );
    expect(rows).toHaveLength(1);
    expect(rows[0].id).toBe('c-future');
  });

  it('keeps past trips when includePast=true', () => {
    const past = camp({ id: 'c-past', arrivalDate: '2026-04-01', departureDate: '2026-04-03' });
    const future = camp({ id: 'c-future', arrivalDate: '2026-05-23' });
    const rows = listUpcomingTrips(
      { campTrips: [past, future], hikeTrips: [] },
      NOW,
      { includePast: true },
    );
    expect(rows).toHaveLength(2);
    // Past sorts first because daysUntil is more negative (earlier).
    expect(rows[0].id).toBe('c-past');
    expect(rows[1].id).toBe('c-future');
  });

  it('sorts chronologically across both planner types', () => {
    const c = camp({ id: 'c-may', tripName: 'Assateague', arrivalDate: '2026-05-23' });
    const h = hike({ id: 'h-may', name: 'Pen Mar', startDate: '2026-05-02' });
    const rows = listUpcomingTrips(
      { campTrips: [c], hikeTrips: [h] },
      NOW,
    );
    expect(rows.map((r) => r.id)).toEqual(['h-may', 'c-may']);
  });

  it('breaks daysUntil ties by name ascending', () => {
    const sameDay1 = camp({ id: 'a', tripName: 'Bunker Hill', arrivalDate: '2026-05-02', departureDate: '2026-05-03' });
    const sameDay2 = hike({ id: 'b', name: 'Annapolis Rocks', startDate: '2026-05-02' });
    const rows = listUpcomingTrips(
      { campTrips: [sameDay1], hikeTrips: [sameDay2] },
      NOW,
    );
    // Annapolis Rocks < Bunker Hill alphabetically.
    expect(rows.map((r) => r.name)).toEqual(['Annapolis Rocks', 'Bunker Hill']);
  });

  it('drops trips with malformed startDate', () => {
    const bad = camp({ id: 'c-bad', arrivalDate: 'garbage' });
    const good = camp({ id: 'c-good', arrivalDate: '2026-05-23' });
    const rows = listUpcomingTrips(
      { campTrips: [bad, good], hikeTrips: [] },
      NOW,
    );
    expect(rows.map((r) => r.id)).toEqual(['c-good']);
  });

  it('today and future both included', () => {
    const today = camp({ id: 'c-today', arrivalDate: '2026-04-25', departureDate: '2026-04-27' });
    const tomorrow = hike({ id: 'h-tomorrow', startDate: '2026-04-26' });
    const rows = listUpcomingTrips(
      { campTrips: [today], hikeTrips: [tomorrow] },
      NOW,
    );
    expect(rows.map((r) => r.id)).toEqual(['c-today', 'h-tomorrow']);
    expect(rows[0].daysUntil).toBe(0);
    expect(rows[1].daysUntil).toBe(1);
  });
});

describe('listUpcomingTrips — meta projection', () => {
  it('camp meta includes campground, nights, party', () => {
    const c = camp({
      campgroundName: 'Greenbrier State Park',
      arrivalDate: '2026-05-01',
      departureDate: '2026-05-04',
      partySize: 6,
    });
    const rows = listUpcomingTrips({ campTrips: [c], hikeTrips: [] }, NOW);
    expect(rows[0].meta).toBe('Greenbrier State Park · 3 nights · party of 6');
  });

  it('camp meta singular night', () => {
    const c = camp({
      campgroundName: 'Greenbrier',
      arrivalDate: '2026-05-01',
      departureDate: '2026-05-02',
      partySize: 2,
    });
    const rows = listUpcomingTrips({ campTrips: [c], hikeTrips: [] }, NOW);
    expect(rows[0].meta).toBe('Greenbrier · 1 night · party of 2');
  });

  it('hike meta day-hike vs nights, with mileage', () => {
    const dayHike = hike({ id: 'h-day', nights: 0, plannedMileage: 5.2, partySize: 1 });
    const overnight = hike({ id: 'h-on', startDate: '2026-05-03', nights: 2, plannedMileage: 18, partySize: 3 });
    const rows = listUpcomingTrips(
      { campTrips: [], hikeTrips: [dayHike, overnight] },
      NOW,
    );
    const day = rows.find((r) => r.id === 'h-day')!;
    const on = rows.find((r) => r.id === 'h-on')!;
    expect(day.meta).toBe('day hike · 5.2 mi · party of 1');
    expect(on.meta).toBe('2 nights · 18.0 mi · party of 3');
  });

  it('hike meta omits mileage when zero', () => {
    const t = hike({ nights: 1, plannedMileage: 0, partySize: 2 });
    const rows = listUpcomingTrips({ campTrips: [], hikeTrips: [t] }, NOW);
    expect(rows[0].meta).toBe('1 night · party of 2');
  });
});

// ── upcomingTripsCount ──

describe('upcomingTripsCount', () => {
  it('returns 0 when nothing is planned', () => {
    expect(upcomingTripsCount({ campTrips: [], hikeTrips: [] }, NOW)).toBe(0);
  });

  it('counts upcoming-only by default', () => {
    const past = camp({ arrivalDate: '2026-04-01', departureDate: '2026-04-02' });
    const future = camp({ id: 'c-2', arrivalDate: '2026-05-23' });
    expect(
      upcomingTripsCount({ campTrips: [past, future], hikeTrips: [] }, NOW),
    ).toBe(1);
  });

  it('counts across both planner types', () => {
    expect(
      upcomingTripsCount(
        { campTrips: [camp(), camp({ id: 'c-2' })], hikeTrips: [hike()] },
        NOW,
      ),
    ).toBe(3);
  });
});

// ── upcomingTripsHeadline ──

describe('upcomingTripsHeadline', () => {
  it('returns empty-state nudge when nothing is planned', () => {
    expect(
      upcomingTripsHeadline({ campTrips: [], hikeTrips: [] }, NOW),
    ).toBe('No trips planned yet — open a planner to start one.');
  });

  it('projects the closest upcoming trip with friendly day label', () => {
    const tomorrow = hike({ name: 'Sugarloaf Loop', startDate: '2026-04-26' });
    expect(
      upcomingTripsHeadline({ campTrips: [], hikeTrips: [tomorrow] }, NOW),
    ).toBe('Next: Sugarloaf Loop tomorrow');
  });

  it('uses "today" for a same-day trip', () => {
    const today = camp({ tripName: 'Quick Camp', arrivalDate: '2026-04-25', departureDate: '2026-04-26' });
    expect(
      upcomingTripsHeadline({ campTrips: [today], hikeTrips: [] }, NOW),
    ).toBe('Next: Quick Camp today');
  });
});

// ── pickFeaturedTrip (Phase A.42 — closest trip preview card) ──

describe('pickFeaturedTrip', () => {
  it('returns null when no trips are planned', () => {
    expect(pickFeaturedTrip({ campTrips: [], hikeTrips: [] }, NOW)).toBeNull();
  });

  it('returns null when only past trips exist (past dropped by default)', () => {
    const past = camp({ id: 'c-past', arrivalDate: '2026-04-01', departureDate: '2026-04-03' });
    expect(
      pickFeaturedTrip({ campTrips: [past], hikeTrips: [] }, NOW),
    ).toBeNull();
  });

  it('returns the soonest upcoming trip across both planner types', () => {
    const farCamp = camp({ id: 'c-far', tripName: 'Assateague', arrivalDate: '2026-05-23' });
    const closerHike = hike({ id: 'h-close', name: 'Pen Mar', startDate: '2026-05-02' });
    const featured = pickFeaturedTrip(
      { campTrips: [farCamp], hikeTrips: [closerHike] },
      NOW,
    );
    expect(featured).not.toBeNull();
    expect(featured!.id).toBe('h-close');
    expect(featured!.kind).toBe('hike');
    expect(featured!.daysUntil).toBe(7);
  });

  it('prefers a "today" trip over a future trip', () => {
    const today = camp({ id: 'c-today', arrivalDate: '2026-04-25', departureDate: '2026-04-27' });
    const future = hike({ id: 'h-future', startDate: '2026-05-15' });
    const featured = pickFeaturedTrip(
      { campTrips: [today], hikeTrips: [future] },
      NOW,
    );
    expect(featured!.id).toBe('c-today');
    expect(featured!.daysUntil).toBe(0);
  });

  it('breaks daysUntil ties by name ascending (matches list order)', () => {
    const a = camp({ id: 'a', tripName: 'Bunker Hill', arrivalDate: '2026-05-02', departureDate: '2026-05-03' });
    const b = hike({ id: 'b', name: 'Annapolis Rocks', startDate: '2026-05-02' });
    const featured = pickFeaturedTrip(
      { campTrips: [a], hikeTrips: [b] },
      NOW,
    );
    // Annapolis Rocks < Bunker Hill alphabetically.
    expect(featured!.name).toBe('Annapolis Rocks');
  });

  it('returns the row shape (id, kind, name, startDate, daysUntil, meta, raw)', () => {
    const t = hike({ id: 'h-one', name: 'Sugarloaf', startDate: '2026-04-26', nights: 0, plannedMileage: 4.2, partySize: 2 });
    const featured = pickFeaturedTrip(
      { campTrips: [], hikeTrips: [t] },
      NOW,
    );
    expect(featured).toEqual({
      kind: 'hike',
      id: 'h-one',
      name: 'Sugarloaf',
      startDate: '2026-04-26',
      daysUntil: 1,
      meta: 'day hike · 4.2 mi · party of 2',
      raw: t,
    });
  });
});

// ── Phase A.43 — trip→checklist projection helpers ──
//
// These three helpers translate an UpcomingTripRow into the seed-args
// for a brand-new GearChecklist (the A.6 type, not the older Phase-5
// CampGearChecklist/HikeGearChecklist). The screen-level "PACK" handler
// is a pure orchestration of these + GearChecklistContext.addChecklist,
// so the naming + shaping rules belong here.

function row(overrides: Partial<UpcomingTripRow> = {}): UpcomingTripRow {
  return {
    kind: 'camp',
    id: 'c-1',
    name: 'Memorial Day Trip',
    startDate: '2026-05-23',
    daysUntil: 28,
    meta: 'Assateague · 3 nights · party of 4',
    raw: camp(),
    ...overrides,
  };
}

describe('tripChecklistMode', () => {
  it('passes camp through', () => {
    expect(tripChecklistMode(row({ kind: 'camp' }))).toBe('camp');
  });

  it('passes hike through', () => {
    expect(tripChecklistMode(row({ kind: 'hike' }))).toBe('hike');
  });
});

describe('tripChecklistName', () => {
  it('appends " Pack List" to a normal trip name', () => {
    expect(tripChecklistName(row({ name: 'Memorial Day Trip' }))).toBe(
      'Memorial Day Trip Pack List',
    );
  });

  it('preserves user-typed casing in the trip name', () => {
    expect(tripChecklistName(row({ name: 'aSsAtEaGuE 2026' }))).toBe(
      'aSsAtEaGuE 2026 Pack List',
    );
  });

  it('is idempotent — does not double-suffix when name already ends in "Pack List"', () => {
    expect(tripChecklistName(row({ name: 'Greenbrier Pack List' }))).toBe(
      'Greenbrier Pack List',
    );
  });

  it('idempotent suffix check is case-insensitive', () => {
    expect(tripChecklistName(row({ name: 'Greenbrier PACK LIST' }))).toBe(
      'Greenbrier PACK LIST',
    );
    expect(tripChecklistName(row({ name: 'greenbrier pack list' }))).toBe(
      'greenbrier pack list',
    );
  });

  it('falls back to "Trip Pack List" for empty name', () => {
    expect(tripChecklistName(row({ name: '' }))).toBe('Trip Pack List');
  });

  it('falls back to "Trip Pack List" for whitespace-only name', () => {
    expect(tripChecklistName(row({ name: '   ' }))).toBe('Trip Pack List');
  });

  it('trims surrounding whitespace before suffixing', () => {
    expect(tripChecklistName(row({ name: '  Pen Mar  ' }))).toBe(
      'Pen Mar Pack List',
    );
  });
});

describe('tripChecklistDate', () => {
  it('returns the row.startDate verbatim (camp arrival)', () => {
    expect(tripChecklistDate(row({ kind: 'camp', startDate: '2026-05-23' }))).toBe(
      '2026-05-23',
    );
  });

  it('returns the row.startDate verbatim (hike start)', () => {
    expect(tripChecklistDate(row({ kind: 'hike', startDate: '2026-05-02' }))).toBe(
      '2026-05-02',
    );
  });
});
