/**
 * activityCalendarService.test.ts — pure-function contract for the
 * cross-layer activity calendar / heatmap aggregator.
 */

import {
  activeDayCount,
  activeStreaks,
  buildActivityCalendar,
  CalendarInputs,
} from '../activityCalendarService';
import type { UserWaypoint } from '../../types/userWaypoint';
import type { RecordedTrack } from '../../types/track';
import type { UserMarkup } from '../../types/userMarkup';
import type { JournalEntry } from '../../types/journalEntry';
import type { GearChecklist } from '../../types/gearChecklist';

function wp(overrides: Partial<UserWaypoint> = {}): UserWaypoint {
  return {
    id: 'w1',
    title: 'Stand A',
    notes: '',
    mode: 'hunt',
    category: 'stand',
    coordinate: { latitude: 39.5, longitude: -76.5 },
    photoUris: [],
    createdAt: '2026-04-22T12:00:00.000Z',
    updatedAt: '2026-04-22T12:00:00.000Z',
    ...overrides,
  } as UserWaypoint;
}

function tr(overrides: Partial<RecordedTrack> = {}): RecordedTrack {
  return {
    id: 't1',
    mode: 'hike',
    name: 'Loop',
    startedAt: '2026-04-22T13:00:00.000Z',
    endedAt: '2026-04-22T15:00:00.000Z',
    state: 'saved',
    samples: [],
    distanceM: 4500,
    durationSec: 7200,
    elevationGainM: 200,
    ...overrides,
  } as RecordedTrack;
}

function mk(overrides: Partial<UserMarkup> = {}): UserMarkup {
  return {
    id: 'm1',
    title: 'Boundary',
    notes: '',
    mode: 'hunt',
    color: '#abcdef',
    shapeType: 'LineString',
    coordinates: [
      [-76.5, 39.5],
      [-76.6, 39.6],
    ],
    createdAt: '2026-04-21T18:00:00.000Z',
    updatedAt: '2026-04-21T18:00:00.000Z',
    ...overrides,
  } as UserMarkup;
}

function je(overrides: Partial<JournalEntry> = {}): JournalEntry {
  return {
    id: 'j1',
    createdAt: '2026-04-22T22:00:00.000Z',
    updatedAt: '2026-04-22T22:00:00.000Z',
    entryDate: '2026-04-22',
    mode: 'hunt',
    title: 'Evening sit',
    body: '',
    outcome: 'sighting',
    tags: [],
    photoUris: [],
    ...overrides,
  };
}

function cl(overrides: Partial<GearChecklist> = {}): GearChecklist {
  const base: GearChecklist = {
    id: 'c1',
    mode: 'hunt',
    name: 'Opening day',
    tripDate: '2026-04-25',
    items: [],
    createdAt: '2026-04-20T09:00:00.000Z',
    updatedAt: '2026-04-20T09:00:00.000Z',
  };
  return { ...base, ...overrides };
}

function emptyInputs(): CalendarInputs {
  return {
    waypoints: [],
    tracks: [],
    markups: [],
    journalEntries: [],
    checklists: [],
  };
}

describe('buildActivityCalendar', () => {
  it('returns [] for fully empty inputs', () => {
    expect(buildActivityCalendar(emptyInputs())).toEqual([]);
  });

  it('emits one bucket for a single waypoint, count=1', () => {
    const inputs = { ...emptyInputs(), waypoints: [wp()] };
    const out = buildActivityCalendar(inputs);
    expect(out).toHaveLength(1);
    expect(out[0].date).toBe('2026-04-22');
    expect(out[0].total).toBe(1);
    expect(out[0].byKind).toEqual({ waypoint: 1 });
    expect(out[0].items[0].kind).toBe('waypoint');
    expect(out[0].items[0].id).toBe('w1');
  });

  it('groups multiple kinds on the same day into one bucket', () => {
    const inputs: CalendarInputs = {
      waypoints: [wp({ id: 'w', createdAt: '2026-04-22T10:00:00.000Z' })],
      tracks: [tr({ id: 't', startedAt: '2026-04-22T11:00:00.000Z' })],
      markups: [],
      journalEntries: [je({ id: 'j', entryDate: '2026-04-22' })],
      checklists: [],
    };
    const out = buildActivityCalendar(inputs);
    expect(out).toHaveLength(1);
    expect(out[0].total).toBe(3);
    expect(out[0].byKind).toEqual({ waypoint: 1, track: 1, journal: 1 });
  });

  it('sorts buckets date DESC (newest first)', () => {
    const inputs: CalendarInputs = {
      waypoints: [
        wp({ id: 'a', createdAt: '2026-04-20T10:00:00.000Z' }),
        wp({ id: 'b', createdAt: '2026-04-22T10:00:00.000Z' }),
        wp({ id: 'c', createdAt: '2026-04-21T10:00:00.000Z' }),
      ],
      tracks: [],
      markups: [],
      journalEntries: [],
      checklists: [],
    };
    const out = buildActivityCalendar(inputs);
    expect(out.map((b) => b.date)).toEqual([
      '2026-04-22',
      '2026-04-21',
      '2026-04-20',
    ]);
  });

  it('sorts items inside a bucket: kind ASC then label ASC', () => {
    const inputs: CalendarInputs = {
      waypoints: [
        wp({ id: 'wa', title: 'Zulu', createdAt: '2026-04-22T10:00:00.000Z' }),
        wp({ id: 'wb', title: 'Alpha', createdAt: '2026-04-22T10:00:00.000Z' }),
      ],
      tracks: [tr({ id: 'ta', startedAt: '2026-04-22T11:00:00.000Z' })],
      markups: [mk({ id: 'ma', createdAt: '2026-04-22T11:00:00.000Z' })],
      journalEntries: [],
      checklists: [],
    };
    const out = buildActivityCalendar(inputs);
    // kind alphabetical: markup, track, waypoint
    expect(out[0].items.map((i) => i.kind)).toEqual([
      'markup',
      'track',
      'waypoint',
      'waypoint',
    ]);
    // and within waypoint, label ASC: Alpha, Zulu
    const wps = out[0].items.filter((i) => i.kind === 'waypoint');
    expect(wps.map((i) => i.label)).toEqual(['Alpha', 'Zulu']);
  });

  it('uses journal entryDate (not createdAt)', () => {
    const inputs: CalendarInputs = {
      ...emptyInputs(),
      journalEntries: [
        je({
          id: 'j',
          entryDate: '2026-04-15',
          createdAt: '2026-04-22T22:00:00.000Z',
        }),
      ],
    };
    const out = buildActivityCalendar(inputs);
    expect(out[0].date).toBe('2026-04-15');
  });

  it('prefers checklist tripDate over createdAt when set', () => {
    const inputs: CalendarInputs = {
      ...emptyInputs(),
      checklists: [
        cl({
          id: 'c',
          createdAt: '2026-04-20T09:00:00.000Z',
          tripDate: '2026-05-10',
        }),
      ],
    };
    const out = buildActivityCalendar(inputs);
    expect(out[0].date).toBe('2026-05-10');
  });

  it('falls back to checklist createdAt when tripDate missing', () => {
    const inputs: CalendarInputs = {
      ...emptyInputs(),
      checklists: [
        cl({
          id: 'c',
          createdAt: '2026-04-20T09:00:00.000Z',
          tripDate: undefined,
        }),
      ],
    };
    const out = buildActivityCalendar(inputs);
    expect(out[0].date).toBe('2026-04-20');
  });

  it('honors mode strict-equality filter', () => {
    const inputs: CalendarInputs = {
      ...emptyInputs(),
      waypoints: [
        wp({ id: 'h', mode: 'hunt' }),
        wp({ id: 'f', mode: 'fish' }),
      ],
    };
    const huntOnly = buildActivityCalendar(inputs, { mode: 'hunt' });
    expect(huntOnly[0].total).toBe(1);
    expect(huntOnly[0].items[0].id).toBe('h');
  });

  it('honors kinds filter (subset)', () => {
    const inputs: CalendarInputs = {
      waypoints: [wp()],
      tracks: [tr()],
      markups: [mk()],
      journalEntries: [je()],
      checklists: [cl()],
    };
    const trackOnly = buildActivityCalendar(inputs, { kinds: ['track'] });
    const allKinds = new Set(
      trackOnly.flatMap((b) => b.items.map((i) => i.kind)),
    );
    expect(allKinds).toEqual(new Set(['track']));
  });

  it('honors fromDate / toDate range (inclusive)', () => {
    const inputs: CalendarInputs = {
      ...emptyInputs(),
      waypoints: [
        wp({ id: 'before', createdAt: '2026-04-10T10:00:00.000Z' }),
        wp({ id: 'inside', createdAt: '2026-04-15T10:00:00.000Z' }),
        wp({ id: 'after', createdAt: '2026-04-25T10:00:00.000Z' }),
      ],
    };
    const out = buildActivityCalendar(inputs, {
      fromDate: '2026-04-12',
      toDate: '2026-04-20',
    });
    expect(out).toHaveLength(1);
    expect(out[0].items[0].id).toBe('inside');
  });

  it('drops rows with unparseable timestamps defensively', () => {
    const inputs: CalendarInputs = {
      ...emptyInputs(),
      waypoints: [wp({ id: 'bad', createdAt: 'not-a-date' as any })],
    };
    expect(buildActivityCalendar(inputs)).toEqual([]);
  });
});

describe('activeDayCount', () => {
  it('returns 0 for empty inputs', () => {
    expect(activeDayCount(emptyInputs())).toBe(0);
  });

  it('returns count of distinct dates with activity', () => {
    const inputs: CalendarInputs = {
      ...emptyInputs(),
      waypoints: [
        wp({ id: 'a', createdAt: '2026-04-20T10:00:00.000Z' }),
        wp({ id: 'b', createdAt: '2026-04-20T11:00:00.000Z' }), // same day
        wp({ id: 'c', createdAt: '2026-04-22T10:00:00.000Z' }),
      ],
    };
    expect(activeDayCount(inputs)).toBe(2);
  });

  it('respects mode filter', () => {
    const inputs: CalendarInputs = {
      ...emptyInputs(),
      waypoints: [
        wp({ id: 'h1', mode: 'hunt', createdAt: '2026-04-20T10:00:00.000Z' }),
        wp({ id: 'f1', mode: 'fish', createdAt: '2026-04-22T10:00:00.000Z' }),
      ],
    };
    expect(activeDayCount(inputs, { mode: 'hunt' })).toBe(1);
  });
});

describe('activeStreaks', () => {
  it('returns 0/0 for empty', () => {
    expect(activeStreaks(emptyInputs(), '2026-04-22')).toEqual({
      current: 0,
      longest: 0,
    });
  });

  it('current=1 when only today has activity', () => {
    const inputs: CalendarInputs = {
      ...emptyInputs(),
      waypoints: [wp({ createdAt: '2026-04-22T10:00:00.000Z' })],
    };
    expect(activeStreaks(inputs, '2026-04-22')).toEqual({
      current: 1,
      longest: 1,
    });
  });

  it('current=3 for three consecutive days ending today', () => {
    const inputs: CalendarInputs = {
      ...emptyInputs(),
      waypoints: [
        wp({ id: 'a', createdAt: '2026-04-20T10:00:00.000Z' }),
        wp({ id: 'b', createdAt: '2026-04-21T10:00:00.000Z' }),
        wp({ id: 'c', createdAt: '2026-04-22T10:00:00.000Z' }),
      ],
    };
    expect(activeStreaks(inputs, '2026-04-22')).toEqual({
      current: 3,
      longest: 3,
    });
  });

  it('current keeps streak when today is empty but yesterday is active (1-day grace)', () => {
    const inputs: CalendarInputs = {
      ...emptyInputs(),
      waypoints: [
        wp({ id: 'a', createdAt: '2026-04-20T10:00:00.000Z' }),
        wp({ id: 'b', createdAt: '2026-04-21T10:00:00.000Z' }),
      ],
    };
    expect(activeStreaks(inputs, '2026-04-22')).toEqual({
      current: 2,
      longest: 2,
    });
  });

  it('current=0 when most recent activity is 2+ days ago', () => {
    const inputs: CalendarInputs = {
      ...emptyInputs(),
      waypoints: [wp({ createdAt: '2026-04-20T10:00:00.000Z' })],
    };
    expect(activeStreaks(inputs, '2026-04-22').current).toBe(0);
  });

  it('longest captures historical streak even when current is broken', () => {
    const inputs: CalendarInputs = {
      ...emptyInputs(),
      waypoints: [
        wp({ id: 'a', createdAt: '2026-03-01T10:00:00.000Z' }),
        wp({ id: 'b', createdAt: '2026-03-02T10:00:00.000Z' }),
        wp({ id: 'c', createdAt: '2026-03-03T10:00:00.000Z' }),
        wp({ id: 'd', createdAt: '2026-03-04T10:00:00.000Z' }),
        wp({ id: 'e', createdAt: '2026-04-22T10:00:00.000Z' }),
      ],
    };
    const out = activeStreaks(inputs, '2026-04-22');
    expect(out.longest).toBe(4);
    expect(out.current).toBe(1);
  });
});
