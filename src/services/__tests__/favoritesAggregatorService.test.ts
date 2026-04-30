/**
 * favoritesAggregatorService — unit tests for the favorites join.
 */
import {
  getFavoriteItems,
  liveFavoriteCount,
} from '../favoritesAggregatorService';
import type { FavoriteRef } from '../../types/favorite';
import type { UserWaypoint } from '../../types/userWaypoint';
import type { RecordedTrack } from '../../types/track';
import type { LineStringMarkup, UserMarkup } from '../../types/userMarkup';
import type { JournalEntry } from '../../types/journalEntry';
import type { GearChecklist } from '../../types/gearChecklist';

// ── Factories — match the locked overrides-spread pattern ──

function wp(overrides: Partial<UserWaypoint> = {}): UserWaypoint {
  const base: UserWaypoint = {
    id: 'wp-1',
    createdAt: '2026-04-24T10:00:00Z',
    updatedAt: '2026-04-24T10:00:00Z',
    mode: 'hunt',
    category: 'tree-stand',
    title: 'Stand A',
    notes: '',
    lat: 39.0,
    lng: -76.0,
    photoUris: [],
  };
  return { ...base, ...overrides };
}

function tr(overrides: Partial<RecordedTrack> = {}): RecordedTrack {
  const base: RecordedTrack = {
    id: 'tr-1',
    mode: 'hike',
    name: 'Morning loop',
    startedAt: '2026-04-24T13:00:00Z',
    endedAt: '2026-04-24T14:00:00Z',
    state: 'saved',
    samples: [],
    distanceM: 1000,
    durationSec: 3600,
    elevationGainM: 0,
  };
  return { ...base, ...overrides };
}

function mk(overrides: Partial<LineStringMarkup> = {}): UserMarkup {
  // Locked LineString factory — discriminated-union narrowing requires
  // the base be typed as a single variant, not the union.
  const base: LineStringMarkup = {
    id: 'mk-1',
    createdAt: '2026-04-24T15:00:00Z',
    updatedAt: '2026-04-24T15:00:00Z',
    mode: 'fish',
    title: 'Drift line',
    shapeType: 'LineString',
    coordinates: [
      [-76.0, 39.0],
      [-76.1, 39.1],
    ],
  };
  return { ...base, ...overrides };
}

function je(overrides: Partial<JournalEntry> = {}): JournalEntry {
  const base: JournalEntry = {
    id: 'je-1',
    createdAt: '2026-04-25T08:00:00Z',
    updatedAt: '2026-04-25T08:00:00Z',
    entryDate: '2026-04-24',
    mode: 'hunt',
    title: 'Sat hunt',
    body: '',
    outcome: 'sighting',
    tags: [],
    photoUris: [],
  };
  return { ...base, ...overrides };
}

function gc(overrides: Partial<GearChecklist> = {}): GearChecklist {
  const base: GearChecklist = {
    id: 'gc-1',
    createdAt: '2026-04-20T08:00:00Z',
    updatedAt: '2026-04-20T08:00:00Z',
    mode: 'camp',
    name: 'Weekend pack',
    tripDate: '2026-04-24',
    items: [],
  };
  return { ...base, ...overrides };
}

function ref(overrides: Partial<FavoriteRef> = {}): FavoriteRef {
  return {
    kind: 'waypoint',
    id: 'wp-1',
    addedAt: '2026-04-24T20:00:00Z',
    ...overrides,
  };
}

describe('getFavoriteItems', () => {
  it('returns empty result when no favorites are set', () => {
    const r = getFavoriteItems({ favorites: [] });
    expect(r.totalCount).toBe(0);
    expect(r.items).toEqual([]);
    expect(r.buckets).toEqual([]);
    expect(r.staleCount).toBe(0);
  });

  it('joins a waypoint favorite with its live row', () => {
    const r = getFavoriteItems({
      favorites: [ref({ kind: 'waypoint', id: 'wp-1' })],
      waypoints: [wp({ id: 'wp-1', title: 'Pinned Stand' })],
    });
    expect(r.totalCount).toBe(1);
    expect(r.items[0].kind).toBe('waypoint');
    if (r.items[0].kind === 'waypoint') {
      expect(r.items[0].item.title).toBe('Pinned Stand');
    }
    expect(r.staleCount).toBe(0);
  });

  it('joins favorites for all 5 kinds', () => {
    const r = getFavoriteItems({
      favorites: [
        ref({ kind: 'waypoint', id: 'wp-1', addedAt: '2026-04-24T01:00:00Z' }),
        ref({ kind: 'track', id: 'tr-1', addedAt: '2026-04-24T02:00:00Z' }),
        ref({ kind: 'markup', id: 'mk-1', addedAt: '2026-04-24T03:00:00Z' }),
        ref({ kind: 'journal', id: 'je-1', addedAt: '2026-04-24T04:00:00Z' }),
        ref({ kind: 'checklist', id: 'gc-1', addedAt: '2026-04-24T05:00:00Z' }),
      ],
      waypoints: [wp({ id: 'wp-1' })],
      tracks: [tr({ id: 'tr-1' })],
      markups: [mk({ id: 'mk-1' })],
      journalEntries: [je({ id: 'je-1' })],
      checklists: [gc({ id: 'gc-1' })],
    });
    expect(r.totalCount).toBe(5);
    expect(r.buckets).toHaveLength(5);
    const kinds = r.buckets.map((b) => b.kind).sort();
    expect(kinds).toEqual([
      'checklist',
      'journal',
      'markup',
      'track',
      'waypoint',
    ]);
  });

  it('orders top-level items by addedAt DESC (most-recent-starred first)', () => {
    const r = getFavoriteItems({
      favorites: [
        ref({ kind: 'waypoint', id: 'a', addedAt: '2026-04-24T01:00:00Z' }),
        ref({ kind: 'waypoint', id: 'b', addedAt: '2026-04-24T03:00:00Z' }),
        ref({ kind: 'waypoint', id: 'c', addedAt: '2026-04-24T02:00:00Z' }),
      ],
      waypoints: [wp({ id: 'a' }), wp({ id: 'b' }), wp({ id: 'c' })],
    });
    expect(r.items.map((i) => i.item.id)).toEqual(['b', 'c', 'a']);
  });

  it('groups buckets in fixed kind order (waypoint, track, markup, journal, checklist)', () => {
    const r = getFavoriteItems({
      favorites: [
        ref({ kind: 'checklist', id: 'gc-1' }),
        ref({ kind: 'waypoint', id: 'wp-1' }),
        ref({ kind: 'journal', id: 'je-1' }),
      ],
      waypoints: [wp({ id: 'wp-1' })],
      journalEntries: [je({ id: 'je-1' })],
      checklists: [gc({ id: 'gc-1' })],
    });
    expect(r.buckets.map((b) => b.kind)).toEqual([
      'waypoint',
      'journal',
      'checklist',
    ]);
  });

  it('counts a stale ref (favorited row was deleted) and excludes it from items', () => {
    const r = getFavoriteItems({
      favorites: [
        ref({ kind: 'waypoint', id: 'wp-live' }),
        ref({ kind: 'waypoint', id: 'wp-deleted' }),
        ref({ kind: 'journal', id: 'je-deleted' }),
      ],
      waypoints: [wp({ id: 'wp-live' })],
      // wp-deleted and je-deleted are missing from inputs.
    });
    expect(r.totalCount).toBe(1);
    expect(r.staleCount).toBe(2);
    expect(r.items[0].item.id).toBe('wp-live');
  });

  it('stale-tracks each kind independently', () => {
    const r = getFavoriteItems({
      favorites: [
        ref({ kind: 'waypoint', id: 'missing-1' }),
        ref({ kind: 'track', id: 'missing-2' }),
        ref({ kind: 'markup', id: 'missing-3' }),
        ref({ kind: 'journal', id: 'missing-4' }),
        ref({ kind: 'checklist', id: 'missing-5' }),
      ],
    });
    expect(r.staleCount).toBe(5);
    expect(r.totalCount).toBe(0);
  });

  it('does not mutate the inputs', () => {
    const favs = [
      ref({ kind: 'waypoint', id: 'a', addedAt: '2026-04-24T01:00:00Z' }),
      ref({ kind: 'waypoint', id: 'b', addedAt: '2026-04-24T03:00:00Z' }),
    ];
    const before = favs.map((f) => f.id);
    getFavoriteItems({ favorites: favs, waypoints: [wp({ id: 'a' }), wp({ id: 'b' })] });
    expect(favs.map((f) => f.id)).toEqual(before);
  });

  it('handles missing optional input arrays without crashing', () => {
    const r = getFavoriteItems({
      favorites: [ref({ kind: 'waypoint', id: 'wp-1' })],
      // No layer arrays passed at all.
    });
    expect(r.totalCount).toBe(0);
    expect(r.staleCount).toBe(1);
  });

  it('within a bucket, items sort by addedAt DESC', () => {
    const r = getFavoriteItems({
      favorites: [
        ref({ kind: 'waypoint', id: 'a', addedAt: '2026-04-24T01:00:00Z' }),
        ref({ kind: 'waypoint', id: 'b', addedAt: '2026-04-24T03:00:00Z' }),
      ],
      waypoints: [wp({ id: 'a' }), wp({ id: 'b' })],
    });
    expect(r.buckets[0].items.map((i) => i.item.id)).toEqual(['b', 'a']);
  });
});

describe('liveFavoriteCount', () => {
  it('returns count of live favorites only (excludes stale)', () => {
    expect(
      liveFavoriteCount({
        favorites: [
          ref({ kind: 'waypoint', id: 'live' }),
          ref({ kind: 'waypoint', id: 'gone' }),
        ],
        waypoints: [wp({ id: 'live' })],
      }),
    ).toBe(1);
  });

  it('returns 0 when favorites list is empty', () => {
    expect(liveFavoriteCount({ favorites: [] })).toBe(0);
  });
});
