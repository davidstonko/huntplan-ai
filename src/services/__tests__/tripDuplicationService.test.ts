/**
 * @file tripDuplicationService.test.ts
 * @description Locks the Phase A.40 trip-cloning helpers.
 *
 * Each helper is pure given an injected clock — tests pass a fixed
 * `now` so id/timestamp assertions are deterministic.
 */

import {
  deDupeCopyPrefix,
  newTripId,
  todayYmdLocal,
  duplicateCampTrip,
  duplicateHikeTrip,
} from '../tripDuplicationService';
import type { CampTrip } from '../../types/camp';
import type { HikeTrip } from '../../types/hike';

const NOW = new Date(2026, 3, 25, 10, 30, 0); // 2026-04-25 10:30 local
const NOW_MS = NOW.getTime();
const NOW_ISO = NOW.toISOString();

// ── deDupeCopyPrefix ──

describe('deDupeCopyPrefix', () => {
  it('adds "Copy of " prefix to a fresh name', () => {
    expect(deDupeCopyPrefix('Pen Mar to Rocky Run')).toBe(
      'Copy of Pen Mar to Rocky Run',
    );
  });

  it('does not double-prefix an already-prefixed name', () => {
    expect(deDupeCopyPrefix('Copy of Pen Mar')).toBe('Copy of Pen Mar');
  });

  it('does not flatten case-divergent prefixes (case-sensitive)', () => {
    // "copy of …" is not the canonical prefix; users who typed it
    // manually should still get the proper "Copy of " stamp on top.
    expect(deDupeCopyPrefix('copy of pen mar')).toBe(
      'Copy of copy of pen mar',
    );
  });

  it('trims surrounding whitespace before checking the prefix', () => {
    expect(deDupeCopyPrefix('  Copy of Trail  ')).toBe('Copy of Trail');
  });

  it('returns "Copy of Untitled" for an empty/whitespace name', () => {
    expect(deDupeCopyPrefix('')).toBe('Copy of Untitled');
    expect(deDupeCopyPrefix('   ')).toBe('Copy of Untitled');
  });
});

// ── newTripId ──

describe('newTripId', () => {
  it('returns the trip-<ms> shape', () => {
    expect(newTripId(NOW_MS)).toBe(`trip-${NOW_MS}`);
  });

  it('uses Date.now() by default', () => {
    const id = newTripId();
    expect(id).toMatch(/^trip-\d+$/);
  });
});

// ── todayYmdLocal ──

describe('todayYmdLocal', () => {
  it('returns YYYY-MM-DD in local time', () => {
    expect(todayYmdLocal(NOW)).toBe('2026-04-25');
  });

  it('zero-pads single-digit month/day', () => {
    expect(todayYmdLocal(new Date(2026, 0, 5))).toBe('2026-01-05');
  });
});

// ── duplicateCampTrip ──

function campTrip(overrides: Partial<CampTrip> = {}): CampTrip {
  return {
    id: 'trip-original',
    campgroundId: 'cg-1',
    campgroundName: 'Assateague Oceanside',
    tripName: 'Memorial Day at Assateague',
    arrivalDate: '2026-05-23',
    departureDate: '2026-05-26',
    partySize: 4,
    tripType: 'family',
    notes: 'Bring kayaks',
    gearChecklistId: 'cl-original',
    groupCampId: 'gc-original',
    createdAt: '2026-04-01T08:00:00.000Z',
    updatedAt: '2026-04-10T12:00:00.000Z',
    ...overrides,
  };
}

describe('duplicateCampTrip', () => {
  it('regenerates id, prefixes name, resets timestamps to now', () => {
    const original = campTrip();
    const dup = duplicateCampTrip(original, NOW);
    expect(dup.id).toBe(`trip-${NOW_MS}`);
    expect(dup.id).not.toBe(original.id);
    expect(dup.tripName).toBe('Copy of Memorial Day at Assateague');
    expect(dup.createdAt).toBe(NOW_ISO);
    expect(dup.updatedAt).toBe(NOW_ISO);
  });

  it('carries over campground anchors, dates, party, type, notes', () => {
    const original = campTrip();
    const dup = duplicateCampTrip(original, NOW);
    expect(dup.campgroundId).toBe('cg-1');
    expect(dup.campgroundName).toBe('Assateague Oceanside');
    expect(dup.arrivalDate).toBe('2026-05-23');
    expect(dup.departureDate).toBe('2026-05-26');
    expect(dup.partySize).toBe(4);
    expect(dup.tripType).toBe('family');
    expect(dup.notes).toBe('Bring kayaks');
  });

  it('resets gearChecklistId and groupCampId (no auto-link)', () => {
    const original = campTrip();
    const dup = duplicateCampTrip(original, NOW);
    expect(dup.gearChecklistId).toBeNull();
    expect(dup.groupCampId).toBeNull();
  });

  it('does not double-prefix when duplicating a duplicate', () => {
    const original = campTrip({ tripName: 'Copy of Memorial Day' });
    const dup = duplicateCampTrip(original, NOW);
    expect(dup.tripName).toBe('Copy of Memorial Day');
  });

  it('preserves null notes', () => {
    const original = campTrip({ notes: null });
    const dup = duplicateCampTrip(original, NOW);
    expect(dup.notes).toBeNull();
  });
});

// ── duplicateHikeTrip ──

function hikeTrip(overrides: Partial<HikeTrip> = {}): HikeTrip {
  return {
    id: 'trip-original',
    name: 'Pen Mar to Rocky Run',
    trailId: 'md-appalachian-trail',
    startTrailheadId: 'th-pen-mar',
    endTrailheadId: 'th-rocky-run',
    startDate: '2026-05-12',
    nights: 1,
    partySize: 2,
    tier: 'overnight',
    plannedShelterIds: ['shelter-rocky-run'],
    plannedMileage: 12.4,
    gearChecklistId: 'cl-original',
    notes: 'Filter water at the spring',
    createdAt: '2026-04-01T08:00:00.000Z',
    updatedAt: '2026-04-10T12:00:00.000Z',
    ...overrides,
  };
}

describe('duplicateHikeTrip', () => {
  it('regenerates id, prefixes name, resets timestamps + startDate', () => {
    const original = hikeTrip();
    const dup = duplicateHikeTrip(original, NOW);
    expect(dup.id).toBe(`trip-${NOW_MS}`);
    expect(dup.id).not.toBe(original.id);
    expect(dup.name).toBe('Copy of Pen Mar to Rocky Run');
    expect(dup.startDate).toBe('2026-04-25'); // today, not original
    expect(dup.createdAt).toBe(NOW_ISO);
    expect(dup.updatedAt).toBe(NOW_ISO);
  });

  it('carries over trail anchors, nights, party, tier, mileage, notes', () => {
    const original = hikeTrip();
    const dup = duplicateHikeTrip(original, NOW);
    expect(dup.trailId).toBe('md-appalachian-trail');
    expect(dup.startTrailheadId).toBe('th-pen-mar');
    expect(dup.endTrailheadId).toBe('th-rocky-run');
    expect(dup.nights).toBe(1);
    expect(dup.partySize).toBe(2);
    expect(dup.tier).toBe('overnight');
    expect(dup.plannedMileage).toBe(12.4);
    expect(dup.notes).toBe('Filter water at the spring');
  });

  it('clones plannedShelterIds (defensive copy, not aliasing)', () => {
    const original = hikeTrip({ plannedShelterIds: ['s1', 's2', 's3'] });
    const dup = duplicateHikeTrip(original, NOW);
    expect(dup.plannedShelterIds).toEqual(['s1', 's2', 's3']);
    expect(dup.plannedShelterIds).not.toBe(original.plannedShelterIds);
  });

  it('resets gearChecklistId (no double-claim of original checklist)', () => {
    const original = hikeTrip();
    const dup = duplicateHikeTrip(original, NOW);
    expect(dup.gearChecklistId).toBeNull();
  });

  it('does not double-prefix when duplicating a duplicate', () => {
    const original = hikeTrip({ name: 'Copy of Pen Mar' });
    const dup = duplicateHikeTrip(original, NOW);
    expect(dup.name).toBe('Copy of Pen Mar');
  });

  it('handles a day-hike (0 nights, no shelters)', () => {
    const original = hikeTrip({
      nights: 0,
      tier: 'day',
      plannedShelterIds: [],
      endTrailheadId: null,
    });
    const dup = duplicateHikeTrip(original, NOW);
    expect(dup.nights).toBe(0);
    expect(dup.tier).toBe('day');
    expect(dup.plannedShelterIds).toEqual([]);
    expect(dup.endTrailheadId).toBeNull();
  });
});
