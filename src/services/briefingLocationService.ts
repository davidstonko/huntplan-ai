/**
 * briefingLocationService — pick the lat/lng the Daily Briefing should
 * use for ambient surfaces (currently the Phase A.29 Sun & Moon panel).
 *
 * Phase A.29 originally hardcoded Maryland's geographic centroid:
 *   39.0458, -76.6413
 * which is good enough for a state-wide median user (sunrise variance
 * across MD's longitude span is < 2 minutes). It's NOT good enough for
 * users routinely operating far east or west — Ocean City vs Garrett
 * County is a ~15 minute sunrise delta, which actively misleads a "is it
 * worth leaving the house in the next 30 minutes?" decision.
 *
 * Phase A.31 tightens the answer by reusing what the user has already
 * told the app — the most recent GPS track they recorded — as a
 * proxy for "where do you currently hunt / fish / hike?". When no recent
 * track exists, we fall back to the centroid (the user gets the same
 * decent default they had before).
 *
 * "Recent" is defined narrowly (30 days) on purpose. A track from last
 * deer season tells us nothing useful about where this user will be
 * tomorrow — using a stale location would make the briefing *less*
 * accurate than the centroid. The cliff at 30d is a guess; the
 * sensitivity to this number is low because the centroid fallback is
 * already pretty good for MD.
 *
 * This module is side-effect-free: pure functions only, no storage
 * reads, no network. The screen wires it up by calling
 * pickBriefingLocation(allTracks).
 */

import type { RecordedTrack, TrackSample } from '../types/track';

/**
 * Maryland geographic centroid. Anchored here so consumers don't
 * re-derive it on every render and don't drift from the value
 * documented in memory (`sun_moon_panel_a29_2026_04_25.md`).
 */
export const MD_CENTROID_LAT = 39.0458;
export const MD_CENTROID_LNG = -76.6413;

/**
 * How recent a track has to be to count as a useful proxy for "where
 * the user is currently active." 30 days strikes the balance between
 * tightening sunrise/sunset accuracy for the median user and avoiding
 * stale guesses (a deer-season track in May is not informative).
 */
export const RECENT_TRACK_WINDOW_DAYS = 30;

/**
 * Where the briefing location came from. `'last-track'` means we used a
 * sample from a recent recorded track; `'maryland-centroid'` means we
 * fell back to the state default. Surfaced so the UI can disclose the
 * source if desired (currently consumed only by tests).
 */
export type BriefingLocationSource = 'last-track' | 'maryland-centroid';

export interface BriefingLocation {
  latitude: number;
  longitude: number;
  source: BriefingLocationSource;
}

/**
 * Last sample of a track, or null if the track has no samples. Picks
 * the highest `timestamp` rather than the array's last index — defensive
 * against a hypothetical reorder bug elsewhere in the codebase.
 */
function lastSampleOf(track: RecordedTrack): TrackSample | null {
  if (!track.samples || track.samples.length === 0) return null;
  let best: TrackSample | null = null;
  for (const s of track.samples) {
    if (typeof s.timestamp !== 'number') continue;
    if (!best || s.timestamp > best.timestamp) best = s;
  }
  return best;
}

/**
 * Choose the lat/lng for the Daily Briefing's ambient surfaces. Returns
 * a centroid fallback if the input list is empty, contains no track
 * with usable samples within the recency window, or every track was
 * recorded more than RECENT_TRACK_WINDOW_DAYS ago.
 *
 * Pure function — `now` is injectable for tests. Does not mutate the
 * input array.
 */
export function pickBriefingLocation(
  tracks: RecordedTrack[],
  now: Date = new Date(),
): BriefingLocation {
  const cutoffMs =
    now.getTime() - RECENT_TRACK_WINDOW_DAYS * 24 * 60 * 60 * 1000;

  // Among tracks with samples, find the one whose last-sample timestamp
  // is the most recent AND is newer than the cutoff. Iterating once
  // beats sort-then-find because we only ever need the max.
  let bestSample: TrackSample | null = null;
  for (const t of tracks) {
    const s = lastSampleOf(t);
    if (!s) continue;
    if (s.timestamp <= cutoffMs) continue;
    if (!isFinite(s.lat) || !isFinite(s.lng)) continue;
    if (!bestSample || s.timestamp > bestSample.timestamp) {
      bestSample = s;
    }
  }

  if (bestSample) {
    return {
      latitude: bestSample.lat,
      longitude: bestSample.lng,
      source: 'last-track',
    };
  }

  return {
    latitude: MD_CENTROID_LAT,
    longitude: MD_CENTROID_LNG,
    source: 'maryland-centroid',
  };
}
