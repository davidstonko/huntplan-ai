/**
 * @file briefingLocationService.test.ts
 * @description Locks the Phase A.31 helper that picks the lat/lng the
 * Daily Briefing's ambient surfaces (currently the Sun & Moon panel)
 * render against. Pure function — `now` is injectable for stable tests.
 */

import {
  MD_CENTROID_LAT,
  MD_CENTROID_LNG,
  RECENT_TRACK_WINDOW_DAYS,
  pickBriefingLocation,
} from '../briefingLocationService';
import type { RecordedTrack, TrackSample } from '../../types/track';

const NOW = new Date('2026-04-25T15:00:00.000Z');
const NOW_MS = NOW.getTime();
const DAY_MS = 24 * 60 * 60 * 1000;

function sample(
  lat: number,
  lng: number,
  msFromNow: number,
): TrackSample {
  return { lat, lng, timestamp: NOW_MS + msFromNow };
}

function makeTrack(
  id: string,
  samples: TrackSample[],
  overrides: Partial<RecordedTrack> = {},
): RecordedTrack {
  return {
    id,
    mode: 'hike',
    name: id,
    startedAt: '2026-04-25T14:00:00.000Z',
    endedAt: '2026-04-25T14:30:00.000Z',
    state: 'saved',
    samples,
    distanceM: 0,
    durationSec: 0,
    elevationGainM: 0,
    ...overrides,
  };
}

describe('pickBriefingLocation — fallback path', () => {
  it('returns MD centroid when no tracks exist', () => {
    const r = pickBriefingLocation([], NOW);
    expect(r).toEqual({
      latitude: MD_CENTROID_LAT,
      longitude: MD_CENTROID_LNG,
      source: 'maryland-centroid',
    });
  });

  it('returns MD centroid when tracks exist but have no samples', () => {
    const r = pickBriefingLocation([makeTrack('t1', [])], NOW);
    expect(r.source).toBe('maryland-centroid');
    expect(r.latitude).toBe(MD_CENTROID_LAT);
    expect(r.longitude).toBe(MD_CENTROID_LNG);
  });

  it('returns MD centroid when every track is older than the recency window', () => {
    const old = sample(38.3365, -75.0849, -60 * DAY_MS); // 60 days ago, Ocean City
    const r = pickBriefingLocation([makeTrack('t1', [old])], NOW);
    expect(r.source).toBe('maryland-centroid');
  });

  it('returns MD centroid when sample lat/lng is non-finite', () => {
    const bad = sample(NaN, NaN, -1 * DAY_MS);
    const r = pickBriefingLocation([makeTrack('t1', [bad])], NOW);
    expect(r.source).toBe('maryland-centroid');
  });
});

describe('pickBriefingLocation — last-track path', () => {
  it('uses the last sample of the only recent track', () => {
    const oc = sample(38.3365, -75.0849, -2 * DAY_MS); // Ocean City, 2 days ago
    const r = pickBriefingLocation([makeTrack('t1', [oc])], NOW);
    expect(r.source).toBe('last-track');
    expect(r.latitude).toBeCloseTo(38.3365, 4);
    expect(r.longitude).toBeCloseTo(-75.0849, 4);
  });

  it('picks the highest-timestamp sample within a single track', () => {
    const earlier = sample(39.0, -76.0, -3 * DAY_MS);
    const later = sample(38.5, -75.5, -1 * DAY_MS);
    const out = sample(38.0, -75.0, -2 * DAY_MS);
    const r = pickBriefingLocation([makeTrack('t1', [earlier, out, later])], NOW);
    expect(r.latitude).toBeCloseTo(38.5, 4);
    expect(r.longitude).toBeCloseTo(-75.5, 4);
    expect(r.source).toBe('last-track');
  });

  it('picks the most recent sample across multiple tracks', () => {
    const oldTrack = makeTrack('old', [sample(39.5, -77.0, -10 * DAY_MS)]);
    const newTrack = makeTrack('new', [sample(38.4, -75.5, -1 * DAY_MS)]);
    const r = pickBriefingLocation([oldTrack, newTrack], NOW);
    expect(r.latitude).toBeCloseTo(38.4, 4);
    expect(r.source).toBe('last-track');
  });

  it('input order does not affect the chosen sample', () => {
    const a = sample(39.5, -77.0, -10 * DAY_MS);
    const b = sample(38.4, -75.5, -1 * DAY_MS);
    const forward = pickBriefingLocation(
      [makeTrack('a', [a]), makeTrack('b', [b])],
      NOW,
    );
    const backward = pickBriefingLocation(
      [makeTrack('b', [b]), makeTrack('a', [a])],
      NOW,
    );
    expect(forward).toEqual(backward);
  });

  it('discards the older track once it crosses the recency cliff', () => {
    // Just inside the window vs just outside.
    const fresh = sample(
      38.4,
      -75.5,
      -((RECENT_TRACK_WINDOW_DAYS - 0.5) * DAY_MS),
    );
    const stale = sample(
      39.7,
      -78.9,
      -((RECENT_TRACK_WINDOW_DAYS + 0.5) * DAY_MS),
    );
    const r = pickBriefingLocation(
      [makeTrack('stale', [stale]), makeTrack('fresh', [fresh])],
      NOW,
    );
    expect(r.source).toBe('last-track');
    expect(r.latitude).toBeCloseTo(38.4, 4);
  });

  it('does not mutate the input array', () => {
    const samples = [sample(38.4, -75.5, -1 * DAY_MS)];
    const tracks = [makeTrack('t', samples)];
    const snapshot = JSON.parse(JSON.stringify(tracks));
    pickBriefingLocation(tracks, NOW);
    expect(tracks).toEqual(snapshot);
  });
});

describe('pickBriefingLocation — recency cutoff edge', () => {
  it('treats a sample exactly at the cutoff as too old', () => {
    const exactly = sample(38.4, -75.5, -RECENT_TRACK_WINDOW_DAYS * DAY_MS);
    const r = pickBriefingLocation([makeTrack('t', [exactly])], NOW);
    // Spec: `< cutoffMs` is rejected; `=== cutoffMs` is also rejected
    // because Date math at the boundary is fuzzy and we'd rather lean
    // towards the centroid fallback than a stale fix.
    expect(r.source).toBe('maryland-centroid');
  });

  it('treats a sample one second inside the cutoff as fresh', () => {
    const justInside = sample(
      38.4,
      -75.5,
      -RECENT_TRACK_WINDOW_DAYS * DAY_MS + 1000,
    );
    const r = pickBriefingLocation([makeTrack('t', [justInside])], NOW);
    expect(r.source).toBe('last-track');
    expect(r.latitude).toBeCloseTo(38.4, 4);
  });
});

describe('pickBriefingLocation — defaults `now` to wall clock', () => {
  it('runs without an explicit `now` argument', () => {
    // No samples → centroid path, but the call should succeed.
    const r = pickBriefingLocation([]);
    expect(r.source).toBe('maryland-centroid');
  });
});
