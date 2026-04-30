/**
 * @file briefingTripDroughtService.test.ts
 * @description Locks Phase A.48 — null gates + last-trip-kind pick.
 * Cadence math itself is covered in tripCadenceService.test.ts; here
 * we focus on the decision boundary + the kind selection rule.
 */

import { pickBriefingTripDrought } from '../briefingTripDroughtService';
import type { CampTrip } from '../../types/camp';
import type { HikeTrip } from '../../types/hike';

const NOW = new Date(2026, 3, 25, 10, 30, 0); // 2026-04-25 10:30 local

function camp(overrides: Partial<CampTrip> = {}): CampTrip {
  return {
    id: 'c-1',
    campgroundId: 'cg-1',
    campgroundName: 'Assateague',
    tripName: 'Trip',
    arrivalDate: '2026-01-01',
    departureDate: '2026-01-03',
    partySize: 4,
    tripType: 'family',
    notes: null,
    gearChecklistId: null,
    groupCampId: null,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
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
    startDate: '2026-01-01',
    nights: 0,
    partySize: 2,
    tier: 'day',
    plannedShelterIds: [],
    plannedMileage: 5,
    gearChecklistId: null,
    notes: null,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  };
}

describe('pickBriefingTripDrought — null gates', () => {
  it('returns null when no trips at all', () => {
    expect(
      pickBriefingTripDrought({ campTrips: [], hikeTrips: [] }, NOW),
    ).toBeNull();
  });

  it('returns null when last trip is within the threshold (≤30 days)', () => {
    // 25 days ago.
    const recent = camp({ arrivalDate: '2026-03-31', departureDate: '2026-04-02' });
    expect(
      pickBriefingTripDrought({ campTrips: [recent], hikeTrips: [] }, NOW),
    ).toBeNull();
  });

  it('returns null at exactly 30 days (strict-greater boundary)', () => {
    const exactly30 = camp({ arrivalDate: '2026-03-26', departureDate: '2026-03-27' });
    expect(
      pickBriefingTripDrought({ campTrips: [exactly30], hikeTrips: [] }, NOW),
    ).toBeNull();
  });

  it('returns null when only future trips exist', () => {
    const future = camp({ arrivalDate: '2026-06-01', departureDate: '2026-06-03' });
    expect(
      pickBriefingTripDrought({ campTrips: [future], hikeTrips: [] }, NOW),
    ).toBeNull();
  });
});

describe('pickBriefingTripDrought — surfaces nudge', () => {
  it('surfaces nudge when last trip is > 30 days ago', () => {
    const old = camp({ arrivalDate: '2026-02-01', departureDate: '2026-02-03' }); // 83d
    const result = pickBriefingTripDrought(
      { campTrips: [old], hikeTrips: [] },
      NOW,
    );
    expect(result).not.toBeNull();
    expect(result!.daysSinceLastTrip).toBe(83);
    expect(result!.lastTripKind).toBe('camp');
  });

  it('lastTripKind picks the kind of the most-recent past trip (hike beats older camp)', () => {
    const olderCamp = camp({ id: 'c-old', arrivalDate: '2026-01-01', departureDate: '2026-01-03' });
    const newerHike = hike({ id: 'h-new', startDate: '2026-03-01' }); // 55d
    const result = pickBriefingTripDrought(
      { campTrips: [olderCamp], hikeTrips: [newerHike] },
      NOW,
    );
    expect(result!.lastTripKind).toBe('hike');
    expect(result!.daysSinceLastTrip).toBe(55);
  });

  it('lastTripKind picks the kind of the most-recent past trip (camp beats older hike)', () => {
    const olderHike = hike({ id: 'h-old', startDate: '2026-01-15' });
    const newerCamp = camp({ id: 'c-new', arrivalDate: '2026-03-01', departureDate: '2026-03-03' });
    const result = pickBriefingTripDrought(
      { campTrips: [newerCamp], hikeTrips: [olderHike] },
      NOW,
    );
    expect(result!.lastTripKind).toBe('camp');
  });

  it('when camp + hike share the most-recent date, camp wins (consistent w/ stable iteration order)', () => {
    // Camp loop runs before hike loop in the picker, so a tie in date
    // should keep camp because the tie-break is "first match wins for >",
    // and camp's already in the running by the time hike is considered
    // with equal ms.
    const sameCamp = camp({ id: 'c-tie', arrivalDate: '2026-02-15', departureDate: '2026-02-17' });
    const sameHike = hike({ id: 'h-tie', startDate: '2026-02-15' });
    const result = pickBriefingTripDrought(
      { campTrips: [sameCamp], hikeTrips: [sameHike] },
      NOW,
    );
    expect(result!.lastTripKind).toBe('camp');
  });

  it('ignores future trips when picking lastTripKind', () => {
    const oldCamp = camp({ id: 'c-old', arrivalDate: '2026-02-01', departureDate: '2026-02-03' });
    const futureHike = hike({ id: 'h-fut', startDate: '2026-06-01' });
    const result = pickBriefingTripDrought(
      { campTrips: [oldCamp], hikeTrips: [futureHike] },
      NOW,
    );
    expect(result!.lastTripKind).toBe('camp');
    expect(result!.daysSinceLastTrip).toBe(83);
  });

  it('ignores trips with malformed start dates entirely', () => {
    const broken = camp({ id: 'c-bad', arrivalDate: 'garbage' });
    const okOld = hike({ id: 'h-old', startDate: '2026-02-01' });
    const result = pickBriefingTripDrought(
      { campTrips: [broken], hikeTrips: [okOld] },
      NOW,
    );
    expect(result!.lastTripKind).toBe('hike');
  });
});
