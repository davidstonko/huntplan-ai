/**
 * personalStatsService.test.ts — pure function contract for the
 * Personal Stats dashboard aggregator.
 */

import {
  computePersonalStats,
  formatStatDistance,
  formatElevationFt,
  formatStatDuration,
  modeCode,
  modeLabel,
} from '../personalStatsService';
import type { RecordedTrack } from '../../types/track';
import type { UserWaypoint } from '../../types/userWaypoint';
import type { UserMarkup } from '../../types/userMarkup';

function track(
  id: string,
  mode: 'hunt' | 'fish' | 'camp' | 'hike',
  distanceM: number,
  durationSec: number,
  elevationGainM: number,
  startedAt: string,
): RecordedTrack {
  return {
    id,
    mode,
    name: `Track ${id}`,
    startedAt,
    endedAt: startedAt,
    state: 'saved',
    samples: [],
    distanceM,
    durationSec,
    elevationGainM,
  };
}

function waypoint(
  id: string,
  mode: 'hunt' | 'fish' | 'camp' | 'hike',
  createdAt: string,
): UserWaypoint {
  return {
    id,
    createdAt,
    updatedAt: createdAt,
    mode,
    category: 'tree-stand' as any,
    title: `WP ${id}`,
    notes: '',
    lat: 39.0,
    lng: -76.5,
    photoUris: [],
  };
}

function markup(
  id: string,
  mode: 'hunt' | 'fish' | 'camp' | 'hike',
  createdAt: string,
): UserMarkup {
  return {
    id,
    createdAt,
    updatedAt: createdAt,
    mode,
    title: `MK ${id}`,
    color: '#ff0000',
    shapeType: 'LineString',
    coordinates: [
      [-76.5, 39.0],
      [-76.4, 39.1],
    ],
  };
}

describe('computePersonalStats', () => {
  it('returns all-zero stats for empty inputs', () => {
    const s = computePersonalStats({
      tracks: [],
      waypoints: [],
      markups: [],
      nowMs: Date.UTC(2026, 4, 1),
    });
    expect(s.totals.trackCount).toBe(0);
    expect(s.totals.totalDistanceM).toBe(0);
    expect(s.totals.totalElevationGainM).toBe(0);
    expect(s.totals.waypointCount).toBe(0);
    expect(s.totals.markupCount).toBe(0);
    expect(s.daysActive).toBe(0);
    expect(s.firstActivityDate).toBeNull();
    expect(s.lastActivityDate).toBeNull();
    expect(s.last7Days).toBe(0);
    expect(s.last30Days).toBe(0);
  });

  it('aggregates track totals across modes', () => {
    const stats = computePersonalStats({
      tracks: [
        track('a', 'hike', 5000, 3600, 200, '2026-04-01T10:00:00Z'),
        track('b', 'hike', 10000, 7200, 500, '2026-04-02T10:00:00Z'),
        track('c', 'hunt', 1000, 600, 50, '2026-04-03T10:00:00Z'),
      ],
      waypoints: [],
      markups: [],
      nowMs: Date.UTC(2026, 3, 4),
    });
    expect(stats.totals.trackCount).toBe(3);
    expect(stats.totals.totalDistanceM).toBe(16000);
    expect(stats.totals.totalDurationSec).toBe(11400);
    expect(stats.totals.totalElevationGainM).toBe(750);
    expect(stats.totals.longestTrackM).toBe(10000);
    expect(stats.totals.bestElevationGainM).toBe(500);
    expect(stats.byMode.hike.trackCount).toBe(2);
    expect(stats.byMode.hike.totalDistanceM).toBe(15000);
    expect(stats.byMode.hike.longestTrackM).toBe(10000);
    expect(stats.byMode.hunt.trackCount).toBe(1);
    expect(stats.byMode.fish.trackCount).toBe(0);
    expect(stats.byMode.camp.trackCount).toBe(0);
  });

  it('aggregates waypoint and markup counts per mode', () => {
    const stats = computePersonalStats({
      tracks: [],
      waypoints: [
        waypoint('w1', 'hunt', '2026-04-01T00:00:00Z'),
        waypoint('w2', 'hunt', '2026-04-02T00:00:00Z'),
        waypoint('w3', 'fish', '2026-04-03T00:00:00Z'),
      ],
      markups: [
        markup('m1', 'hunt', '2026-04-04T00:00:00Z'),
        markup('m2', 'camp', '2026-04-05T00:00:00Z'),
      ],
      nowMs: Date.UTC(2026, 3, 6),
    });
    expect(stats.totals.waypointCount).toBe(3);
    expect(stats.totals.markupCount).toBe(2);
    expect(stats.byMode.hunt.waypointCount).toBe(2);
    expect(stats.byMode.hunt.markupCount).toBe(1);
    expect(stats.byMode.fish.waypointCount).toBe(1);
    expect(stats.byMode.camp.markupCount).toBe(1);
  });

  it('counts unique YYYY-MM-DD days across all artifact types', () => {
    const stats = computePersonalStats({
      tracks: [
        track('t1', 'hike', 1000, 600, 0, '2026-04-01T08:00:00Z'),
        track('t2', 'hike', 1000, 600, 0, '2026-04-01T18:00:00Z'),
      ],
      waypoints: [waypoint('w1', 'hunt', '2026-04-02T00:00:00Z')],
      markups: [markup('m1', 'hunt', '2026-04-02T12:00:00Z')],
      nowMs: Date.UTC(2026, 3, 3),
    });
    // Two tracks same day + waypoint+markup same day = 2 days active.
    expect(stats.daysActive).toBe(2);
    expect(stats.firstActivityDate).toBe('2026-04-01');
    expect(stats.lastActivityDate).toBe('2026-04-02');
  });

  it('buckets activities into last7 and last30 windows', () => {
    const now = Date.UTC(2026, 3, 30); // 2026-04-30
    const stats = computePersonalStats({
      tracks: [
        track('a', 'hike', 1000, 600, 0, '2026-04-29T00:00:00Z'), // 1 day ago
        track('b', 'hike', 1000, 600, 0, '2026-04-20T00:00:00Z'), // 10 days ago
        track('c', 'hike', 1000, 600, 0, '2026-03-01T00:00:00Z'), // 60 days ago
      ],
      waypoints: [],
      markups: [],
      nowMs: now,
    });
    expect(stats.last7Days).toBe(1);
    expect(stats.last30Days).toBe(2);
  });
});

describe('formatters', () => {
  it('formatStatDistance switches across feet/miles', () => {
    expect(formatStatDistance(50)).toMatch(/ft$/);
    expect(formatStatDistance(2000)).toMatch(/ mi$/);
    expect(formatStatDistance(50000)).toMatch(/ mi$/);
  });

  it('formatElevationFt formats elevation in feet', () => {
    expect(formatElevationFt(100)).toMatch(/ft$/);
    expect(formatElevationFt(0)).toBe('0 ft');
  });

  it('formatStatDuration handles seconds, minutes, hours', () => {
    expect(formatStatDuration(45)).toBe('45s');
    expect(formatStatDuration(60)).toBe('1m');
    expect(formatStatDuration(125)).toBe('2m 5s');
    expect(formatStatDuration(3600)).toBe('1h');
    expect(formatStatDuration(3725)).toBe('1h 2m');
  });

  it('mode helpers return expected strings', () => {
    expect(modeCode('hunt')).toBe('HU');
    expect(modeCode('fish')).toBe('FI');
    expect(modeCode('camp')).toBe('CA');
    expect(modeCode('hike')).toBe('HI');
    expect(modeLabel('hunt')).toBe('Hunt');
    expect(modeLabel('hike')).toBe('Hike');
  });
});
