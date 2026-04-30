/**
 * @file briefingTripTeaserService.test.ts
 * @description Locks Phase A.44 — pickBriefingTripTeaser horizon
 * filter + count projection. The selector wraps the A.41 aggregator
 * so the chronological-sort + past-drop + name-tie-break paths are
 * already covered in upcomingTripsService.test.ts; here we focus on
 * the additional 14-day horizon gate + the totalUpcoming projection.
 */

import {
  BRIEFING_TRIP_HORIZON_DAYS,
  pickBriefingTripTeaser,
} from '../briefingTripTeaserService';
import type { CampTrip } from '../../types/camp';
import type { HikeTrip } from '../../types/hike';
import type { GearChecklist, GearChecklistItem } from '../../types/gearChecklist';

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

describe('BRIEFING_TRIP_HORIZON_DAYS constant', () => {
  it('is 14 (locked — change requires deliberate review)', () => {
    expect(BRIEFING_TRIP_HORIZON_DAYS).toBe(14);
  });
});

describe('pickBriefingTripTeaser', () => {
  it('returns null when no trips are planned', () => {
    expect(
      pickBriefingTripTeaser({ campTrips: [], hikeTrips: [] }, NOW),
    ).toBeNull();
  });

  it('returns null when only past trips exist', () => {
    const past = camp({ id: 'c-past', arrivalDate: '2026-04-01', departureDate: '2026-04-02' });
    expect(
      pickBriefingTripTeaser({ campTrips: [past], hikeTrips: [] }, NOW),
    ).toBeNull();
  });

  it('returns null when the soonest trip is beyond the 14-day horizon', () => {
    // 2026-04-25 + 28 days = 2026-05-23 (the default Memorial Day camp).
    const farOut = camp({ id: 'c-far', arrivalDate: '2026-05-23' });
    expect(
      pickBriefingTripTeaser({ campTrips: [farOut], hikeTrips: [] }, NOW),
    ).toBeNull();
  });

  it('returns the row at exactly 14 days out (boundary inclusive)', () => {
    const onBoundary = hike({ id: 'h-boundary', startDate: '2026-05-09' }); // 14 days
    const teaser = pickBriefingTripTeaser(
      { campTrips: [], hikeTrips: [onBoundary] },
      NOW,
    );
    expect(teaser).not.toBeNull();
    expect(teaser!.row.id).toBe('h-boundary');
    expect(teaser!.row.daysUntil).toBe(14);
  });

  it('returns null at 15 days out (just past the boundary)', () => {
    const justBeyond = hike({ id: 'h-beyond', startDate: '2026-05-10' }); // 15 days
    expect(
      pickBriefingTripTeaser({ campTrips: [], hikeTrips: [justBeyond] }, NOW),
    ).toBeNull();
  });

  it('returns the soonest trip across both planner types', () => {
    const sevenOut = camp({ id: 'c-7', arrivalDate: '2026-05-02' }); // 7 days
    const oneOut = hike({ id: 'h-1', startDate: '2026-04-26' }); // 1 day
    const teaser = pickBriefingTripTeaser(
      { campTrips: [sevenOut], hikeTrips: [oneOut] },
      NOW,
    );
    expect(teaser!.row.id).toBe('h-1');
    expect(teaser!.row.daysUntil).toBe(1);
  });

  it('prefers a today-trip over a same-week future trip', () => {
    const today = camp({ id: 'c-today', arrivalDate: '2026-04-25', departureDate: '2026-04-27' });
    const inThree = hike({ id: 'h-3', startDate: '2026-04-28' });
    const teaser = pickBriefingTripTeaser(
      { campTrips: [today], hikeTrips: [inThree] },
      NOW,
    );
    expect(teaser!.row.id).toBe('c-today');
    expect(teaser!.row.daysUntil).toBe(0);
  });

  it('totalUpcoming counts ALL upcoming trips, not just within-horizon', () => {
    // Closest is in 7 days (within horizon), but the user has 3 more
    // upcoming trips outside the horizon. The teaser should show the
    // soonest AND let the user know there are 4 total queued up.
    const within = hike({ id: 'h-7', startDate: '2026-05-02' }); // 7 days
    const farA = camp({ id: 'c-A', arrivalDate: '2026-06-10' });
    const farB = camp({ id: 'c-B', arrivalDate: '2026-07-15' });
    const farC = hike({ id: 'h-far', startDate: '2026-08-01' });
    const teaser = pickBriefingTripTeaser(
      { campTrips: [farA, farB], hikeTrips: [within, farC] },
      NOW,
    );
    expect(teaser).not.toBeNull();
    expect(teaser!.row.id).toBe('h-7');
    expect(teaser!.totalUpcoming).toBe(4);
  });

  it('totalUpcoming excludes past trips (mirrors the aggregator default)', () => {
    const past = camp({ id: 'c-past', arrivalDate: '2026-04-01', departureDate: '2026-04-02' });
    const within = hike({ id: 'h-7', startDate: '2026-05-02' });
    const teaser = pickBriefingTripTeaser(
      { campTrips: [past], hikeTrips: [within] },
      NOW,
    );
    expect(teaser!.totalUpcoming).toBe(1);
  });

  it('returns the full UpcomingTripRow shape (id, kind, name, daysUntil, meta, raw)', () => {
    const t = hike({
      id: 'h-1',
      name: 'Sugarloaf',
      startDate: '2026-04-26',
      nights: 0,
      plannedMileage: 4.2,
      partySize: 2,
    });
    const teaser = pickBriefingTripTeaser(
      { campTrips: [], hikeTrips: [t] },
      NOW,
    );
    expect(teaser!.row).toEqual({
      kind: 'hike',
      id: 'h-1',
      name: 'Sugarloaf',
      startDate: '2026-04-26',
      daysUntil: 1,
      meta: 'day hike · 4.2 mi · party of 2',
      raw: t,
    });
  });

  it('packStatus defaults to null when no checklists are passed', () => {
    const t = hike({ id: 'h-1', startDate: '2026-04-26', gearChecklistId: 'gc-1' });
    const teaser = pickBriefingTripTeaser(
      { campTrips: [], hikeTrips: [t] },
      NOW,
    );
    expect(teaser!.packStatus).toBeNull();
  });
});

// ── Phase A.45 — pack-progress projection ──

function item(overrides: Partial<GearChecklistItem> = {}): GearChecklistItem {
  return {
    id: 'i-1',
    label: 'Headlamp',
    category: 'safety',
    checked: false,
    isCustom: false,
    ...overrides,
  };
}

function checklist(overrides: Partial<GearChecklist> = {}): GearChecklist {
  return {
    id: 'gc-1',
    createdAt: '2026-04-20T00:00:00.000Z',
    updatedAt: '2026-04-20T00:00:00.000Z',
    mode: 'hike',
    name: 'Pen Mar Pack List',
    tripDate: '2026-05-02',
    items: [
      item({ id: 'i-1', label: 'Headlamp', checked: true }),
      item({ id: 'i-2', label: 'Map', checked: true }),
      item({ id: 'i-3', label: 'Filter', checked: false }),
    ],
    ...overrides,
  };
}

describe('pickBriefingTripTeaser — packStatus projection', () => {
  it('packStatus is null when the trip has no gearChecklistId', () => {
    const t = hike({
      id: 'h-1',
      startDate: '2026-04-26',
      gearChecklistId: null,
    });
    const teaser = pickBriefingTripTeaser(
      { campTrips: [], hikeTrips: [t] },
      NOW,
      [checklist({ id: 'gc-orphan' })],
    );
    expect(teaser!.packStatus).toBeNull();
  });

  it('packStatus is null when the linked checklist no longer exists (stale link)', () => {
    const t = hike({
      id: 'h-1',
      startDate: '2026-04-26',
      gearChecklistId: 'gc-DELETED',
    });
    const teaser = pickBriefingTripTeaser(
      { campTrips: [], hikeTrips: [t] },
      NOW,
      [checklist({ id: 'gc-something-else' })],
    );
    expect(teaser!.packStatus).toBeNull();
  });

  it('packStatus reflects the linked checklist counts', () => {
    const t = hike({
      id: 'h-1',
      startDate: '2026-04-26',
      gearChecklistId: 'gc-1',
    });
    const teaser = pickBriefingTripTeaser(
      { campTrips: [], hikeTrips: [t] },
      NOW,
      [checklist({ id: 'gc-1' })],
    );
    expect(teaser!.packStatus).toEqual({
      checklistId: 'gc-1',
      checked: 2,
      total: 3,
    });
  });

  it('packStatus reports {checked: 0, total: 0} for a linked-but-empty checklist', () => {
    const t = hike({
      id: 'h-1',
      startDate: '2026-04-26',
      gearChecklistId: 'gc-empty',
    });
    const teaser = pickBriefingTripTeaser(
      { campTrips: [], hikeTrips: [t] },
      NOW,
      [checklist({ id: 'gc-empty', items: [] })],
    );
    expect(teaser!.packStatus).toEqual({
      checklistId: 'gc-empty',
      checked: 0,
      total: 0,
    });
  });

  it('packStatus reports total=checked when fully packed', () => {
    const t = hike({
      id: 'h-1',
      startDate: '2026-04-26',
      gearChecklistId: 'gc-done',
    });
    const teaser = pickBriefingTripTeaser(
      { campTrips: [], hikeTrips: [t] },
      NOW,
      [
        checklist({
          id: 'gc-done',
          items: [
            item({ id: 'i-1', checked: true }),
            item({ id: 'i-2', checked: true }),
          ],
        }),
      ],
    );
    expect(teaser!.packStatus).toEqual({
      checklistId: 'gc-done',
      checked: 2,
      total: 2,
    });
  });

  it('packStatus respects which planner the trip came from (camp link)', () => {
    const t = camp({ id: 'c-1', arrivalDate: '2026-05-02', gearChecklistId: 'gc-camp' });
    const teaser = pickBriefingTripTeaser(
      { campTrips: [t], hikeTrips: [] },
      NOW,
      [checklist({ id: 'gc-camp', mode: 'camp' })],
    );
    expect(teaser!.packStatus!.checklistId).toBe('gc-camp');
    expect(teaser!.packStatus!.checked).toBe(2);
    expect(teaser!.packStatus!.total).toBe(3);
  });
});
