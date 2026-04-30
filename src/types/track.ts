/**
 * Track — GPS Track Recorder types (V2.3 Phase A.2).
 *
 * A `RecordedTrack` is a user-initiated GPS recording — the path the user
 * walked / paddled / rode — captured as a sequence of `TrackSample`s and
 * persisted to AsyncStorage for later review, replay, and GPX export.
 *
 * This is distinct from UserWaypoints (single-point pins) and from the
 * Scout module's live location dot. A track has a start, an end, and a
 * lifecycle (idle → recording ⇆ paused → saved). Only one track can be
 * `recording` or `paused` at a time — the context enforces that.
 *
 * Coordinate convention matches UserWaypoint: named `lat`/`lng` fields,
 * NOT GeoJSON tuples. Rendering code can remap to `[lng, lat]` for
 * Mapbox LineString features at the seam.
 *
 * Shipping this surface is also what legitimately closes the
 * `NSLocationAlwaysAndWhenInUseUsageDescription` Info.plist entry —
 * previously an overclaim flagged under 2.3.1(a). A user-facing "Record
 * Track" button gives the always-on location permission a real consumer.
 *
 * Added 2026-04-24 per V2_3_FEATURE_EXPANSION_PLAN §3 / Phase A.2.
 */

import { WaypointMode } from './userWaypoint';

/**
 * Track recorder lifecycle states. Drives both the HUD UI (which
 * controls are visible) and the sampling engine (whether the
 * `watchPosition` subscription is active).
 *
 *   - `idle`      : no recording in progress
 *   - `recording` : live GPS subscription is consuming samples
 *   - `paused`    : subscription stopped; samples preserved for resume
 *   - `saved`     : momentary state after commit; UI transitions back to
 *                   `idle` once the save resolves. Exposed so callers can
 *                   differentiate "saved a moment ago" from "never
 *                   recorded anything" without polling.
 */
export type TrackRecorderState =
  | 'idle'
  | 'recording'
  | 'paused'
  | 'saved';

/**
 * A single GPS fix within a track. Kept small so very long recordings
 * (multi-hour hikes, all-day fishing trips) stay within AsyncStorage's
 * per-key budget.
 *
 * `timestamp` is an epoch-millisecond number rather than an ISO string
 * to keep the payload compact — a typical 8-hour recording at 5s moving
 * / 30s stationary yields a few thousand samples, and switching to ISO
 * strings would roughly double that payload.
 *
 * `altitude` is captured when iOS gives it to us (it can be null on
 * older devices or indoors). `accuracy` is in meters; callers can
 * decide to discard samples above a threshold when rendering.
 */
export interface TrackSample {
  lat: number;
  lng: number;
  /** Meters above sea level when the OS provides it. */
  altitude?: number;
  /** Epoch ms at which the fix was taken. */
  timestamp: number;
  /** Horizontal accuracy in meters when the OS provides it. */
  accuracy?: number;
}

/**
 * A persisted recording. Created when the user hits "Start", committed
 * to storage when they hit "Save", and surfaced in TrackListScreen /
 * TrackDetailScreen afterwards.
 *
 * `state` on a persisted track is always `'saved'` — the live in-flight
 * recording is held in the TrackRecorderContext's activeTrack slot and
 * is NOT what gets serialized here. Loaded tracks are read-only from
 * the context's perspective; edits (rename, delete) go through dedicated
 * mutators.
 *
 * `distanceM`, `durationSec`, and `elevationGainM` are derived fields
 * computed once at save-time so the list screen doesn't have to
 * Haversine-sum every track on every render.
 */
export interface RecordedTrack {
  id: string;
  mode: WaypointMode;
  name: string;
  /** ISO 8601 timestamp of the first sample. */
  startedAt: string;
  /** ISO 8601 timestamp of the last sample, null if still recording. */
  endedAt: string | null;
  state: TrackRecorderState;
  samples: TrackSample[];
  /** Total on-the-ground distance in meters (Haversine-summed). */
  distanceM: number;
  /** Wall-clock duration in seconds (endedAt - startedAt). */
  durationSec: number;
  /** Sum of positive altitude deltas in meters (0 when unavailable). */
  elevationGainM: number;
  /** Optional free-form notes the user attaches after saving. */
  notes?: string;
}

/**
 * Haversine distance between two points in meters. Exported so save-time
 * stat computation and list-screen rendering share a single
 * implementation instead of drifting.
 *
 * Uses the mean Earth radius (6371000 m). Accurate to a few tenths of a
 * percent at the latitudes Maryland cares about, which is well inside
 * GPS noise.
 */
export function haversineMeters(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
): number {
  const R = 6371000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLng / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Sum the Haversine distances between consecutive samples.
 * Returns 0 for < 2 samples.
 */
export function computeDistanceM(samples: TrackSample[]): number {
  if (samples.length < 2) return 0;
  let total = 0;
  for (let i = 1; i < samples.length; i++) {
    total += haversineMeters(
      samples[i - 1].lat,
      samples[i - 1].lng,
      samples[i].lat,
      samples[i].lng,
    );
  }
  return total;
}

/**
 * Sum only positive altitude deltas between consecutive samples.
 * Samples missing `altitude` are treated as interpolation-neutral
 * (carried forward). Returns 0 if no samples carry altitude.
 */
export function computeElevationGainM(samples: TrackSample[]): number {
  let gain = 0;
  let last: number | null = null;
  for (const s of samples) {
    if (typeof s.altitude !== 'number') continue;
    if (last !== null && s.altitude > last) {
      gain += s.altitude - last;
    }
    last = s.altitude;
  }
  return gain;
}

/**
 * Wall-clock seconds between the first and last sample. Returns 0 for
 * < 2 samples.
 */
export function computeDurationSec(samples: TrackSample[]): number {
  if (samples.length < 2) return 0;
  const first = samples[0].timestamp;
  const last = samples[samples.length - 1].timestamp;
  return Math.max(0, Math.round((last - first) / 1000));
}

/**
 * Format meters as a user-readable distance string. Switches to km
 * above 1000m; rounds to 2 decimal places below, 1 decimal above.
 */
export function formatDistance(m: number): string {
  if (m < 1000) return `${m.toFixed(0)} m`;
  const km = m / 1000;
  return `${km.toFixed(km >= 10 ? 1 : 2)} km`;
}

/**
 * Format seconds as H:MM:SS (dropping the hour when zero).
 */
export function formatDuration(sec: number): string {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = Math.floor(sec % 60);
  const pad = (n: number) => String(n).padStart(2, '0');
  if (h > 0) return `${h}:${pad(m)}:${pad(s)}`;
  return `${m}:${pad(s)}`;
}
