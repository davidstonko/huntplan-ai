/**
 * journalSeedService — unit tests (Phase A.19).
 */
import {
  seedFromTrack,
  seedFromCampTrip,
  seedFromHikeTrip,
  emptySeed,
  isJournalSeed,
} from '../journalSeedService';
import type { RecordedTrack } from '../../types/track';
import type { CampTrip } from '../../types/camp';
import type { HikeTrip } from '../../types/hike';

// ── Factory ──

function tr(overrides: Partial<RecordedTrack> = {}): RecordedTrack {
  const base: RecordedTrack = {
    id: 'tk-1',
    mode: 'hike',
    name: 'Cunningham Loop',
    startedAt: new Date(2026, 3, 25, 7, 30, 0).toISOString(), // Sat 7:30 AM local
    endedAt: new Date(2026, 3, 25, 9, 0, 0).toISOString(),
    state: 'saved',
    samples: [
      { lat: 39, lng: -76, timestamp: 1, altitude: 100 },
      { lat: 39.001, lng: -76.001, timestamp: 5_400_000, altitude: 150 },
    ],
    distanceM: 4500,
    durationSec: 5400,
    elevationGainM: 50,
  };
  return { ...base, ...overrides };
}

describe('seedFromTrack', () => {
  it('inherits the track mode', () => {
    expect(seedFromTrack(tr({ mode: 'hunt' })).mode).toBe('hunt');
    expect(seedFromTrack(tr({ mode: 'fish' })).mode).toBe('fish');
    expect(seedFromTrack(tr({ mode: 'camp' })).mode).toBe('camp');
    expect(seedFromTrack(tr({ mode: 'hike' })).mode).toBe('hike');
  });

  it('dates the seed to the LOCAL date of startedAt', () => {
    const s = seedFromTrack(tr());
    expect(s.entryDate).toBe('2026-04-25');
  });

  it('builds a "<TimeOfDay> <Mode> — <track name>" title for named tracks', () => {
    const s = seedFromTrack(tr({ name: 'Cunningham Loop', mode: 'hike' }));
    expect(s.title).toBe('Morning Hike — Cunningham Loop');
  });

  it('builds a "<TimeOfDay> <Mode>" title for auto-named tracks', () => {
    // auto-named pattern: anything starting with /^track\b/i
    const s = seedFromTrack(tr({ name: 'Track 2026-04-25', mode: 'hike' }));
    expect(s.title).toBe('Morning Hike');
  });

  it('chooses the right time-of-day prefix', () => {
    const cases: Array<[number, string]> = [
      [3, 'late-night'],
      [9, 'Morning'],
      [12, 'Midday'],
      [15, 'Afternoon'],
      [18, 'Evening'],
      [22, 'Night'],
    ];
    for (const [hour, expectPrefix] of cases) {
      const startedAt = new Date(2026, 3, 25, hour, 0, 0).toISOString();
      const s = seedFromTrack(tr({ startedAt }));
      // late-night title gets cap-first too: "Late-night Hike"
      const expected =
        expectPrefix === 'late-night'
          ? 'Late-night'
          : expectPrefix;
      expect(s.title.startsWith(`${expected} `)).toBe(true);
    }
  });

  it('summarizes distance/duration/ascent in the body', () => {
    const s = seedFromTrack(tr({ distanceM: 2500, durationSec: 3600, elevationGainM: 75 }));
    expect(s.body).toContain('Ascent 75 m');
    expect(s.body.toLowerCase()).toContain('km');
  });

  it('omits ascent line when elevationGainM is 0', () => {
    const s = seedFromTrack(tr({ elevationGainM: 0 }));
    expect(s.body).not.toContain('Ascent');
  });

  it('always seeds a "track" tag', () => {
    expect(seedFromTrack(tr()).tags).toEqual(['track']);
  });

  it('picks a sane default outcome per mode', () => {
    expect(seedFromTrack(tr({ mode: 'hunt' })).outcome).toBe('scout');
    expect(seedFromTrack(tr({ mode: 'fish' })).outcome).toBe('scout');
    expect(seedFromTrack(tr({ mode: 'camp' })).outcome).toBe('completed');
    expect(seedFromTrack(tr({ mode: 'hike' })).outcome).toBe('completed');
  });

  it('falls back to today when startedAt is missing', () => {
    // Empty string startedAt; date should still be a valid YYYY-MM-DD
    const s = seedFromTrack(tr({ startedAt: '' }));
    expect(s.entryDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});

// ────────────────────────── seedFromCampTrip ──────────────────────────

function ct(overrides: Partial<CampTrip> = {}): CampTrip {
  const base: CampTrip = {
    id: 'trip-1',
    campgroundId: 'cg-assateague',
    campgroundName: 'Assateague State Park',
    tripName: 'Memorial Day at Assateague',
    arrivalDate: '2026-05-23',
    departureDate: '2026-05-25',
    partySize: 4,
    tripType: 'family',
    notes: null,
    gearChecklistId: null,
    groupCampId: null,
    createdAt: '2026-04-25T00:00:00Z',
    updatedAt: '2026-04-25T00:00:00Z',
  };
  return { ...base, ...overrides };
}

describe('seedFromCampTrip', () => {
  it('always sets mode to camp regardless of trip type', () => {
    expect(seedFromCampTrip(ct({ tripType: 'backcountry' })).mode).toBe('camp');
    expect(seedFromCampTrip(ct({ tripType: 'solo' })).mode).toBe('camp');
  });

  it('uses arrival date when not in the future', () => {
    const now = new Date(2026, 5, 1); // Jun 1 — after the trip
    expect(seedFromCampTrip(ct(), now).entryDate).toBe('2026-05-23');
  });

  it('uses today when arrival date is in the future (no pre-dating)', () => {
    const now = new Date(2026, 3, 25); // Apr 25 — before the trip
    expect(seedFromCampTrip(ct(), now).entryDate).toBe('2026-04-25');
  });

  it('uses tripName as title', () => {
    expect(seedFromCampTrip(ct()).title).toBe('Memorial Day at Assateague');
  });

  it('falls back to campgroundName when tripName is empty', () => {
    expect(seedFromCampTrip(ct({ tripName: '' })).title).toBe(
      'Assateague State Park',
    );
  });

  it('puts arrival/departure/party/type in the body', () => {
    const s = seedFromCampTrip(ct());
    expect(s.body).toContain('2026-05-23');
    expect(s.body).toContain('2026-05-25');
    expect(s.body).toContain('party of 4');
    expect(s.body).toContain('family camp');
  });

  it('appends user notes under a separator-free new line when present', () => {
    const s = seedFromCampTrip(ct({ notes: 'rain in forecast — bring tarp' }));
    expect(s.body).toMatch(/family camp\n\nrain in forecast/);
  });

  it('seeds tags with trip + camp + tripType (kebabed)', () => {
    const s = seedFromCampTrip(ct({ tripType: 'car_camp' }));
    expect(s.tags).toEqual(['trip', 'camp', 'car-camp']);
  });

  it('sets locationLabel to the campgroundName', () => {
    expect(seedFromCampTrip(ct()).locationLabel).toBe('Assateague State Park');
  });

  it('outcome defaults to completed (camp trip default)', () => {
    expect(seedFromCampTrip(ct()).outcome).toBe('completed');
  });
});

// ────────────────────────── seedFromHikeTrip ──────────────────────────

function ht(overrides: Partial<HikeTrip> = {}): HikeTrip {
  const base: HikeTrip = {
    id: 'hike-1',
    name: 'Catoctin AT Section',
    trailId: 'at-md-section-2',
    startTrailheadId: 'th-1',
    endTrailheadId: 'th-2',
    startDate: '2026-05-15',
    nights: 1,
    partySize: 2,
    tier: 'day',
    plannedShelterIds: ['ed-garvey-shelter'],
    plannedMileage: 12.4,
    gearChecklistId: null,
    notes: null,
    createdAt: '2026-04-25T00:00:00Z',
    updatedAt: '2026-04-25T00:00:00Z',
  };
  return { ...base, ...overrides };
}

describe('seedFromHikeTrip', () => {
  it('always sets mode to hike', () => {
    expect(seedFromHikeTrip(ht()).mode).toBe('hike');
  });

  it('uses startDate when not in the future', () => {
    const now = new Date(2026, 5, 1); // Jun 1
    expect(seedFromHikeTrip(ht(), now).entryDate).toBe('2026-05-15');
  });

  it('uses today when startDate is in the future', () => {
    const now = new Date(2026, 3, 25); // Apr 25
    expect(seedFromHikeTrip(ht(), now).entryDate).toBe('2026-04-25');
  });

  it('uses trip name as title; falls back to "Hike" when empty', () => {
    expect(seedFromHikeTrip(ht()).title).toBe('Catoctin AT Section');
    expect(seedFromHikeTrip(ht({ name: '' })).title).toBe('Hike');
  });

  it('summarizes mileage + days + party + tier in the body', () => {
    const s = seedFromHikeTrip(ht());
    expect(s.body).toContain('12.4 mi');
    expect(s.body).toContain('2 days'); // nights=1 → 2 days
    expect(s.body).toContain('party of 2');
    expect(s.body).toContain('tier day');
  });

  it('labels day hikes as "1 day" when nights=0', () => {
    expect(seedFromHikeTrip(ht({ nights: 0 })).body).toContain('1 day');
  });

  it('uses "unspecified distance" when plannedMileage is 0', () => {
    expect(seedFromHikeTrip(ht({ plannedMileage: 0 })).body).toContain(
      'unspecified distance',
    );
  });

  it('appends user notes after a blank line', () => {
    const s = seedFromHikeTrip(ht({ notes: 'storm window Friday' }));
    expect(s.body).toMatch(/tier day\n\nstorm window Friday/);
  });

  it('seeds trip + hike + tier tags, plus overnight when nights >= 1', () => {
    expect(seedFromHikeTrip(ht({ nights: 0 })).tags).toEqual([
      'trip',
      'hike',
      'day',
    ]);
    expect(seedFromHikeTrip(ht({ nights: 2 })).tags).toEqual([
      'trip',
      'hike',
      'day',
      'overnight',
    ]);
  });

  it('outcome defaults to completed', () => {
    expect(seedFromHikeTrip(ht()).outcome).toBe('completed');
  });
});

describe('emptySeed', () => {
  it('returns a valid seed shape per mode', () => {
    const s = emptySeed('hunt');
    expect(s.mode).toBe('hunt');
    expect(s.title).toBe('');
    expect(s.body).toBe('');
    expect(s.tags).toEqual([]);
    expect(s.outcome).toBe('scout');
    expect(s.entryDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});

describe('isJournalSeed', () => {
  it('accepts a valid seed', () => {
    expect(isJournalSeed(emptySeed('hike'))).toBe(true);
    expect(isJournalSeed(seedFromTrack(tr()))).toBe(true);
    expect(isJournalSeed(seedFromCampTrip(ct()))).toBe(true);
    expect(isJournalSeed(seedFromHikeTrip(ht()))).toBe(true);
  });

  it('rejects null / undefined / non-objects', () => {
    expect(isJournalSeed(null)).toBe(false);
    expect(isJournalSeed(undefined)).toBe(false);
    expect(isJournalSeed('hike')).toBe(false);
    expect(isJournalSeed(42)).toBe(false);
  });

  it('rejects partial / malformed seeds', () => {
    expect(isJournalSeed({})).toBe(false);
    expect(isJournalSeed({ mode: 'hike' })).toBe(false);
    expect(
      isJournalSeed({
        mode: 'hike',
        entryDate: '2026-04-25',
        title: 'x',
        body: '',
        outcome: 'completed',
        tags: 'not-an-array',
      }),
    ).toBe(false);
  });
});
