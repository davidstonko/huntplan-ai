/**
 * @file recentlyEndedTripsService.test.ts
 * @description Locks Phase A.46 — recently-ended trip selector +
 * journal-match suppression + end-date computation for both planner
 * shapes.
 */

import {
  RECENTLY_ENDED_HORIZON_DAYS,
  computeTripEndDate,
  endedAgoLabel,
  listRecentlyEndedTrips,
  pickRecentlyEndedTrip,
  tripHasMatchingJournal,
} from '../recentlyEndedTripsService';
import type { CampTrip } from '../../types/camp';
import type { HikeTrip } from '../../types/hike';
import type { JournalEntry } from '../../types/journalEntry';

const NOW = new Date(2026, 3, 25, 10, 30, 0); // 2026-04-25 10:30 local

function camp(overrides: Partial<CampTrip> = {}): CampTrip {
  return {
    id: 'c-1',
    campgroundId: 'cg-1',
    campgroundName: 'Assateague',
    tripName: 'Spring Camp',
    arrivalDate: '2026-04-18',
    departureDate: '2026-04-21',
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
    name: 'Pen Mar AT',
    trailId: 'md-appalachian-trail',
    startTrailheadId: 'th-pen-mar',
    endTrailheadId: null,
    startDate: '2026-04-22',
    nights: 1,
    partySize: 2,
    tier: 'overnight',
    plannedShelterIds: [],
    plannedMileage: 12.4,
    gearChecklistId: null,
    notes: null,
    createdAt: '2026-04-01T00:00:00.000Z',
    updatedAt: '2026-04-01T00:00:00.000Z',
    ...overrides,
  };
}

function journal(overrides: Partial<JournalEntry> = {}): JournalEntry {
  return {
    id: 'j-1',
    createdAt: '2026-04-22T00:00:00.000Z',
    updatedAt: '2026-04-22T00:00:00.000Z',
    entryDate: '2026-04-22',
    mode: 'camp',
    title: 'A trip',
    body: '',
    outcome: 'completed',
    tags: [],
    photoUris: [],
    ...overrides,
  };
}

describe('RECENTLY_ENDED_HORIZON_DAYS constant', () => {
  it('is 7 (locked)', () => {
    expect(RECENTLY_ENDED_HORIZON_DAYS).toBe(7);
  });
});

describe('computeTripEndDate', () => {
  it('uses departureDate for camp trips', () => {
    expect(
      computeTripEndDate(camp({ departureDate: '2026-04-21' })),
    ).toBe('2026-04-21');
  });

  it('uses startDate + nights for hike trips', () => {
    expect(
      computeTripEndDate(hike({ startDate: '2026-04-22', nights: 1 })),
    ).toBe('2026-04-23');
  });

  it('a 0-night day-hike ends on its start date', () => {
    expect(
      computeTripEndDate(hike({ startDate: '2026-04-22', nights: 0 })),
    ).toBe('2026-04-22');
  });

  it('handles month/year rollovers correctly (hike spans Dec→Jan)', () => {
    expect(
      computeTripEndDate(hike({ startDate: '2026-12-29', nights: 5 })),
    ).toBe('2027-01-03');
  });

  it('returns null on malformed camp departureDate', () => {
    expect(
      computeTripEndDate(camp({ departureDate: 'garbage' })),
    ).toBeNull();
  });

  it('returns null on malformed hike startDate', () => {
    expect(
      computeTripEndDate(hike({ startDate: 'garbage' })),
    ).toBeNull();
  });

  it('clamps negative nights to 0 (defensive)', () => {
    expect(
      computeTripEndDate(hike({ startDate: '2026-04-22', nights: -3 })),
    ).toBe('2026-04-22');
  });
});

describe('tripHasMatchingJournal', () => {
  it('returns false when no journal entries', () => {
    expect(
      tripHasMatchingJournal(camp(), '2026-04-21', []),
    ).toBe(false);
  });

  it('matches when entry mode + date are within window', () => {
    const t = camp({ arrivalDate: '2026-04-18', departureDate: '2026-04-21' });
    const match = journal({ entryDate: '2026-04-21', mode: 'camp' });
    expect(tripHasMatchingJournal(t, '2026-04-21', [match])).toBe(true);
  });

  it('matches an entry written within the +7 day post-trip window', () => {
    const t = camp({ arrivalDate: '2026-04-18', departureDate: '2026-04-21' });
    const match = journal({ entryDate: '2026-04-28', mode: 'camp' });
    expect(tripHasMatchingJournal(t, '2026-04-21', [match])).toBe(true);
  });

  it('does NOT match an entry just outside the +7 day window', () => {
    const t = camp({ arrivalDate: '2026-04-18', departureDate: '2026-04-21' });
    const tooLate = journal({ entryDate: '2026-04-29', mode: 'camp' });
    expect(tripHasMatchingJournal(t, '2026-04-21', [tooLate])).toBe(false);
  });

  it('matches an entry written 1 day before trip start (lower bound)', () => {
    const t = camp({ arrivalDate: '2026-04-18', departureDate: '2026-04-21' });
    const dayBefore = journal({ entryDate: '2026-04-17', mode: 'camp' });
    expect(tripHasMatchingJournal(t, '2026-04-21', [dayBefore])).toBe(true);
  });

  it('does NOT match an entry of a different mode', () => {
    const t = camp({ arrivalDate: '2026-04-18', departureDate: '2026-04-21' });
    const wrongMode = journal({ entryDate: '2026-04-21', mode: 'hike' });
    expect(tripHasMatchingJournal(t, '2026-04-21', [wrongMode])).toBe(false);
  });

  it('matches a hike trip with a hike-mode journal in window', () => {
    const t = hike({ startDate: '2026-04-22', nights: 1 });
    const match = journal({ entryDate: '2026-04-23', mode: 'hike' });
    expect(tripHasMatchingJournal(t, '2026-04-23', [match])).toBe(true);
  });
});

describe('listRecentlyEndedTrips', () => {
  it('returns empty when no trips', () => {
    expect(
      listRecentlyEndedTrips(
        { campTrips: [], hikeTrips: [], journalEntries: [] },
        NOW,
      ),
    ).toEqual([]);
  });

  it('drops trips that ended more than 7 days ago', () => {
    const old = camp({ id: 'c-old', arrivalDate: '2026-04-10', departureDate: '2026-04-12' }); // ended 13d ago
    const fresh = camp({ id: 'c-fresh', arrivalDate: '2026-04-18', departureDate: '2026-04-21' }); // 4d ago
    const rows = listRecentlyEndedTrips(
      { campTrips: [old, fresh], hikeTrips: [], journalEntries: [] },
      NOW,
    );
    expect(rows.map((r) => r.id)).toEqual(['c-fresh']);
  });

  it('drops trips whose end date is in the future', () => {
    const future = camp({ id: 'c-future', arrivalDate: '2026-04-30', departureDate: '2026-05-02' });
    const rows = listRecentlyEndedTrips(
      { campTrips: [future], hikeTrips: [], journalEntries: [] },
      NOW,
    );
    expect(rows).toEqual([]);
  });

  it('keeps trips that ended today or up to 7 days ago', () => {
    const today = camp({ id: 'c-today', arrivalDate: '2026-04-23', departureDate: '2026-04-25' }); // 0d
    const seven = hike({ id: 'h-7', startDate: '2026-04-18', nights: 0 }); // 7d ago
    const rows = listRecentlyEndedTrips(
      { campTrips: [today], hikeTrips: [seven], journalEntries: [] },
      NOW,
    );
    expect(rows).toHaveLength(2);
    // Today first (smaller daysSinceEnd).
    expect(rows[0].id).toBe('c-today');
    expect(rows[0].daysSinceEnd).toBe(0);
    expect(rows[1].id).toBe('h-7');
    expect(rows[1].daysSinceEnd).toBe(7);
  });

  it('drops a trip that has a matching journal entry', () => {
    const t = camp({ arrivalDate: '2026-04-18', departureDate: '2026-04-21' });
    const j = journal({ entryDate: '2026-04-22', mode: 'camp' });
    expect(
      listRecentlyEndedTrips(
        { campTrips: [t], hikeTrips: [], journalEntries: [j] },
        NOW,
      ),
    ).toEqual([]);
  });

  it('keeps a trip even if a different-mode journal exists in the window', () => {
    const t = camp({ id: 'c-1', arrivalDate: '2026-04-18', departureDate: '2026-04-21' });
    const wrongMode = journal({ entryDate: '2026-04-22', mode: 'hike' });
    const rows = listRecentlyEndedTrips(
      { campTrips: [t], hikeTrips: [], journalEntries: [wrongMode] },
      NOW,
    );
    expect(rows.map((r) => r.id)).toEqual(['c-1']);
  });

  it('sorts by daysSinceEnd asc, then by name', () => {
    const a = camp({ id: 'a', tripName: 'Bunker Hill', arrivalDate: '2026-04-22', departureDate: '2026-04-23' }); // 2d
    const b = hike({ id: 'b', name: 'Annapolis Rocks', startDate: '2026-04-23', nights: 0 }); // 2d
    const rows = listRecentlyEndedTrips(
      { campTrips: [a], hikeTrips: [b], journalEntries: [] },
      NOW,
    );
    expect(rows.map((r) => r.name)).toEqual(['Annapolis Rocks', 'Bunker Hill']);
  });

  it('camp meta includes campground + nights + party', () => {
    const t = camp({
      campgroundName: 'Greenbrier',
      arrivalDate: '2026-04-22',
      departureDate: '2026-04-25',
      partySize: 6,
    });
    const rows = listRecentlyEndedTrips(
      { campTrips: [t], hikeTrips: [], journalEntries: [] },
      NOW,
    );
    expect(rows[0].meta).toBe('Greenbrier · 3 nights · party of 6');
  });

  it('hike meta covers day-hike vs nights vs mileage', () => {
    const dayHike = hike({ id: 'h-day', startDate: '2026-04-24', nights: 0, plannedMileage: 4.2, partySize: 1 });
    const overnight = hike({ id: 'h-on', startDate: '2026-04-22', nights: 2, plannedMileage: 18, partySize: 3 });
    const rows = listRecentlyEndedTrips(
      { campTrips: [], hikeTrips: [dayHike, overnight], journalEntries: [] },
      NOW,
    );
    const day = rows.find((r) => r.id === 'h-day')!;
    const on = rows.find((r) => r.id === 'h-on')!;
    expect(day.meta).toBe('day hike · 4.2 mi · party of 1');
    expect(on.meta).toBe('2 nights · 18.0 mi · party of 3');
  });
});

describe('pickRecentlyEndedTrip', () => {
  it('returns null when no eligible trip', () => {
    expect(
      pickRecentlyEndedTrip(
        { campTrips: [], hikeTrips: [], journalEntries: [] },
        NOW,
      ),
    ).toBeNull();
  });

  it('returns the most-recently-ended trip', () => {
    const old = camp({ id: 'c-old', arrivalDate: '2026-04-18', departureDate: '2026-04-19' }); // 6d
    const recent = hike({ id: 'h-recent', startDate: '2026-04-23', nights: 1 }); // 1d
    const featured = pickRecentlyEndedTrip(
      { campTrips: [old], hikeTrips: [recent], journalEntries: [] },
      NOW,
    );
    expect(featured!.id).toBe('h-recent');
    expect(featured!.daysSinceEnd).toBe(1);
  });
});

describe('endedAgoLabel', () => {
  it('returns "today" for 0', () => {
    expect(endedAgoLabel(0)).toBe('today');
  });

  it('returns "today" for negative (defensive)', () => {
    expect(endedAgoLabel(-1)).toBe('today');
  });

  it('returns "yesterday" for 1', () => {
    expect(endedAgoLabel(1)).toBe('yesterday');
  });

  it('returns "N days ago" for >1', () => {
    expect(endedAgoLabel(5)).toBe('5 days ago');
  });
});
