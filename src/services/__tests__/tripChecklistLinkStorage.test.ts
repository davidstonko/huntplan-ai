/**
 * @file tripChecklistLinkStorage.test.ts
 * @description Phase A.43 — locks the AsyncStorage write-back that
 * links a freshly-created GearChecklist back to its parent CampTrip
 * or HikeTrip. These tests cover BOTH planner keys and the unlink
 * (null checklistId) variant; storage corruption + missing-trip
 * paths return null rather than throwing.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { persistTripChecklistLink } from '../tripChecklistLinkStorage';
import type { CampTrip } from '../../types/camp';
import type { HikeTrip } from '../../types/hike';

const NOW = new Date(2026, 3, 25, 10, 30, 0); // 2026-04-25 10:30 local

function camp(overrides: Partial<CampTrip> = {}): CampTrip {
  return {
    id: 'c-1',
    campgroundId: 'cg-1',
    campgroundName: 'Assateague',
    tripName: 'Memorial Day Trip',
    arrivalDate: '2026-05-23',
    departureDate: '2026-05-26',
    partySize: 4,
    tripType: 'family',
    notes: 'remember the bug spray',
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

beforeEach(async () => {
  await AsyncStorage.clear();
});

describe('persistTripChecklistLink — null-safe paths', () => {
  it('returns null when storage is empty for the chosen key', async () => {
    const result = await persistTripChecklistLink('camp', 'c-1', 'gc-1', NOW);
    expect(result).toBeNull();
  });

  it('returns null when the trip id is not found in storage', async () => {
    await AsyncStorage.setItem('camp_trips_v1', JSON.stringify([camp({ id: 'c-7' })]));
    const result = await persistTripChecklistLink('camp', 'c-MISSING', 'gc-1', NOW);
    expect(result).toBeNull();
  });

  it('returns null when stored value is malformed JSON', async () => {
    await AsyncStorage.setItem('camp_trips_v1', '{not valid json');
    const result = await persistTripChecklistLink('camp', 'c-1', 'gc-1', NOW);
    expect(result).toBeNull();
  });

  it('returns null when stored value is not an array', async () => {
    await AsyncStorage.setItem('camp_trips_v1', JSON.stringify({ oops: true }));
    const result = await persistTripChecklistLink('camp', 'c-1', 'gc-1', NOW);
    expect(result).toBeNull();
  });
});

describe('persistTripChecklistLink — camp', () => {
  it('patches gearChecklistId, bumps updatedAt, and persists to AsyncStorage', async () => {
    const original = camp({ id: 'c-1', gearChecklistId: null });
    await AsyncStorage.setItem('camp_trips_v1', JSON.stringify([original]));

    const patched = await persistTripChecklistLink('camp', 'c-1', 'gc-NEW', NOW);

    expect(patched).not.toBeNull();
    expect((patched as CampTrip).gearChecklistId).toBe('gc-NEW');
    expect((patched as CampTrip).updatedAt).toBe(NOW.toISOString());

    // Persisted shape matches the in-memory return.
    const raw = await AsyncStorage.getItem('camp_trips_v1');
    const stored = JSON.parse(raw!) as CampTrip[];
    expect(stored).toHaveLength(1);
    expect(stored[0].gearChecklistId).toBe('gc-NEW');
    expect(stored[0].updatedAt).toBe(NOW.toISOString());
  });

  it('preserves all other fields on the patched trip', async () => {
    const original = camp({
      id: 'c-1',
      campgroundName: 'Greenbrier',
      tripName: 'Anniversary',
      arrivalDate: '2026-06-10',
      departureDate: '2026-06-13',
      partySize: 6,
      notes: 'KEEP ME',
      groupCampId: 'gc-shared-1',
    });
    await AsyncStorage.setItem('camp_trips_v1', JSON.stringify([original]));

    const patched = (await persistTripChecklistLink('camp', 'c-1', 'gc-X', NOW)) as CampTrip;

    expect(patched.campgroundName).toBe('Greenbrier');
    expect(patched.tripName).toBe('Anniversary');
    expect(patched.arrivalDate).toBe('2026-06-10');
    expect(patched.departureDate).toBe('2026-06-13');
    expect(patched.partySize).toBe(6);
    expect(patched.notes).toBe('KEEP ME');
    expect(patched.groupCampId).toBe('gc-shared-1');
  });

  it('only patches the targeted trip — other rows untouched', async () => {
    const a = camp({ id: 'c-A' });
    const b = camp({ id: 'c-B', gearChecklistId: 'pre-existing' });
    const c = camp({ id: 'c-C' });
    await AsyncStorage.setItem('camp_trips_v1', JSON.stringify([a, b, c]));

    await persistTripChecklistLink('camp', 'c-A', 'gc-NEW', NOW);

    const raw = await AsyncStorage.getItem('camp_trips_v1');
    const stored = JSON.parse(raw!) as CampTrip[];
    expect(stored.find((t) => t.id === 'c-A')!.gearChecklistId).toBe('gc-NEW');
    expect(stored.find((t) => t.id === 'c-B')!.gearChecklistId).toBe('pre-existing');
    expect(stored.find((t) => t.id === 'c-C')!.gearChecklistId).toBeNull();
  });

  it('null checklistId unlinks an existing link', async () => {
    const original = camp({ id: 'c-1', gearChecklistId: 'gc-old' });
    await AsyncStorage.setItem('camp_trips_v1', JSON.stringify([original]));

    const patched = (await persistTripChecklistLink('camp', 'c-1', null, NOW)) as CampTrip;
    expect(patched.gearChecklistId).toBeNull();

    const raw = await AsyncStorage.getItem('camp_trips_v1');
    const stored = JSON.parse(raw!) as CampTrip[];
    expect(stored[0].gearChecklistId).toBeNull();
  });

  it('idempotent: re-linking the same id is safe (same JSON in, same id out)', async () => {
    const original = camp({ id: 'c-1', gearChecklistId: 'gc-1' });
    await AsyncStorage.setItem('camp_trips_v1', JSON.stringify([original]));

    const first = (await persistTripChecklistLink('camp', 'c-1', 'gc-1', NOW)) as CampTrip;
    const later = new Date(NOW.getTime() + 60_000);
    const second = (await persistTripChecklistLink('camp', 'c-1', 'gc-1', later)) as CampTrip;

    expect(first.gearChecklistId).toBe('gc-1');
    expect(second.gearChecklistId).toBe('gc-1');
    // updatedAt advances on each write — that's the contract.
    expect(second.updatedAt).toBe(later.toISOString());
  });
});

describe('persistTripChecklistLink — hike', () => {
  it('writes against the hike key, not the camp key', async () => {
    const original = hike({ id: 'h-1', gearChecklistId: null });
    await AsyncStorage.setItem('hike_trips_v1', JSON.stringify([original]));

    const patched = (await persistTripChecklistLink('hike', 'h-1', 'gc-H', NOW)) as HikeTrip;
    expect(patched.gearChecklistId).toBe('gc-H');
    expect(patched.updatedAt).toBe(NOW.toISOString());

    // Camp key untouched.
    expect(await AsyncStorage.getItem('camp_trips_v1')).toBeNull();

    // Hike key updated.
    const raw = await AsyncStorage.getItem('hike_trips_v1');
    const stored = JSON.parse(raw!) as HikeTrip[];
    expect(stored[0].gearChecklistId).toBe('gc-H');
  });

  it('preserves hike-specific fields (trailId, plannedShelterIds, plannedMileage)', async () => {
    const original = hike({
      id: 'h-1',
      trailId: 'md-appalachian-trail',
      plannedShelterIds: ['rocky-run', 'pine-knob'],
      plannedMileage: 18.7,
    });
    await AsyncStorage.setItem('hike_trips_v1', JSON.stringify([original]));

    const patched = (await persistTripChecklistLink('hike', 'h-1', 'gc-H', NOW)) as HikeTrip;
    expect(patched.trailId).toBe('md-appalachian-trail');
    expect(patched.plannedShelterIds).toEqual(['rocky-run', 'pine-knob']);
    expect(patched.plannedMileage).toBe(18.7);
  });
});
