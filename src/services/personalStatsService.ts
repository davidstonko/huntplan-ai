/**
 * personalStatsService — pure aggregator for the Personal Stats dashboard.
 *
 * V2_3 Phase A.4 (retention surface).
 *
 * Reads the in-memory snapshots that the three personal-layer contexts
 * already maintain (waypoints, tracks, markups) and produces a structured
 * stats object the UI can render without doing math in JSX. Pure function
 * so it's trivially jest-testable; no AsyncStorage / no network.
 *
 * Stats philosophy: count what the user actually did. Distance and
 * elevation come from the saved track stats (`distanceM`, `elevationGainM`)
 * which were already Haversine-computed at save time — we don't re-walk
 * sample arrays here.
 *
 * "Days active" counts unique YYYY-MM-DD dates across track startedAt,
 * waypoint createdAt, and markup createdAt. Two recordings on the same
 * day = 1 day, not 2.
 */

import type { WaypointMode } from '../types/userWaypoint';
import type { UserWaypoint } from '../types/userWaypoint';
import type { UserMarkup } from '../types/userMarkup';
import type { RecordedTrack } from '../types/track';

export interface PersonalStatsByMode {
  trackCount: number;
  totalDistanceM: number;
  totalDurationSec: number;
  totalElevationGainM: number;
  waypointCount: number;
  markupCount: number;
  /** Best single track distance in meters (0 if none). */
  longestTrackM: number;
  /** Best single track elevation gain in meters (0 if none). */
  bestElevationGainM: number;
}

export interface PersonalStats {
  totals: PersonalStatsByMode;
  byMode: Record<WaypointMode, PersonalStatsByMode>;
  /** Unique YYYY-MM-DD days the user did something. */
  daysActive: number;
  /** Earliest dated artifact (ISO date). null if no activity. */
  firstActivityDate: string | null;
  /** Most recent dated artifact (ISO date). null if no activity. */
  lastActivityDate: string | null;
  /** Activity count in the past 7 calendar days (any artifact). */
  last7Days: number;
  /** Activity count in the past 30 calendar days (any artifact). */
  last30Days: number;
}

const ALL_MODES: WaypointMode[] = ['hunt', 'fish', 'camp', 'hike'];
const MS_PER_DAY = 86_400_000;

function emptyByMode(): PersonalStatsByMode {
  return {
    trackCount: 0,
    totalDistanceM: 0,
    totalDurationSec: 0,
    totalElevationGainM: 0,
    waypointCount: 0,
    markupCount: 0,
    longestTrackM: 0,
    bestElevationGainM: 0,
  };
}

/** Pull just the YYYY-MM-DD slice from any ISO timestamp. */
function dayKey(iso: string): string {
  return iso.slice(0, 10);
}

interface ComputeArgs {
  waypoints: UserWaypoint[];
  tracks: RecordedTrack[];
  markups: UserMarkup[];
  /** Override "now" for deterministic tests. Defaults to Date.now(). */
  nowMs?: number;
}

/**
 * Compute aggregated stats from the three personal-layer collections.
 * All three inputs must be the FULL collections (not pre-filtered);
 * per-mode breakdowns are derived inside this function.
 */
export function computePersonalStats(args: ComputeArgs): PersonalStats {
  const { waypoints, tracks, markups } = args;
  const nowMs = args.nowMs ?? Date.now();

  const byMode: Record<WaypointMode, PersonalStatsByMode> = {
    hunt: emptyByMode(),
    fish: emptyByMode(),
    camp: emptyByMode(),
    hike: emptyByMode(),
  };
  const totals = emptyByMode();

  // Tracks
  for (const t of tracks) {
    const m = byMode[t.mode];
    if (!m) continue;
    m.trackCount += 1;
    m.totalDistanceM += t.distanceM;
    m.totalDurationSec += t.durationSec;
    m.totalElevationGainM += t.elevationGainM;
    if (t.distanceM > m.longestTrackM) m.longestTrackM = t.distanceM;
    if (t.elevationGainM > m.bestElevationGainM) {
      m.bestElevationGainM = t.elevationGainM;
    }
    totals.trackCount += 1;
    totals.totalDistanceM += t.distanceM;
    totals.totalDurationSec += t.durationSec;
    totals.totalElevationGainM += t.elevationGainM;
    if (t.distanceM > totals.longestTrackM) totals.longestTrackM = t.distanceM;
    if (t.elevationGainM > totals.bestElevationGainM) {
      totals.bestElevationGainM = t.elevationGainM;
    }
  }

  // Waypoints
  for (const w of waypoints) {
    const m = byMode[w.mode];
    if (!m) continue;
    m.waypointCount += 1;
    totals.waypointCount += 1;
  }

  // Markups
  for (const mk of markups) {
    const m = byMode[mk.mode];
    if (!m) continue;
    m.markupCount += 1;
    totals.markupCount += 1;
  }

  // Days active + first/last activity + recency buckets
  const dayBag = new Set<string>();
  let earliestMs: number | null = null;
  let latestMs: number | null = null;
  let last7 = 0;
  let last30 = 0;

  function ingest(isoTimestamp: string) {
    dayBag.add(dayKey(isoTimestamp));
    const t = new Date(isoTimestamp).getTime();
    if (!Number.isFinite(t)) return;
    if (earliestMs === null || t < earliestMs) earliestMs = t;
    if (latestMs === null || t > latestMs) latestMs = t;
    const ageMs = nowMs - t;
    if (ageMs <= 7 * MS_PER_DAY) last7 += 1;
    if (ageMs <= 30 * MS_PER_DAY) last30 += 1;
  }

  for (const t of tracks) ingest(t.startedAt);
  for (const w of waypoints) ingest(w.createdAt);
  for (const mk of markups) ingest(mk.createdAt);

  return {
    totals,
    byMode,
    daysActive: dayBag.size,
    firstActivityDate: earliestMs !== null ? new Date(earliestMs).toISOString().slice(0, 10) : null,
    lastActivityDate: latestMs !== null ? new Date(latestMs).toISOString().slice(0, 10) : null,
    last7Days: last7,
    last30Days: last30,
  };
}

/**
 * Convert meters to a hunter-friendly distance string. Uses miles since
 * Maryland hunters/anglers/hikers all default to imperial in DNR docs.
 *   < 528 ft (0.1 mi)  → "X ft"
 *   < 5280 m equivalent → ".XX mi"
 *   else → "X.X mi"
 */
export function formatStatDistance(meters: number): string {
  const feet = meters * 3.280_84;
  if (feet < 528) return `${Math.round(feet)} ft`;
  const miles = meters / 1609.344;
  if (miles < 10) return `${miles.toFixed(2)} mi`;
  return `${miles.toFixed(1)} mi`;
}

/**
 * Convert meters of elevation gain to feet (the unit serious hikers use).
 */
export function formatElevationFt(meters: number): string {
  const ft = meters * 3.280_84;
  if (ft < 100) return `${Math.round(ft)} ft`;
  return `${Math.round(ft).toLocaleString()} ft`;
}

/**
 * Convert seconds to "Hh Mm" (or "Mm Ss" under an hour).
 */
export function formatStatDuration(sec: number): string {
  if (sec < 60) return `${sec}s`;
  const mins = Math.floor(sec / 60);
  if (mins < 60) {
    const remSec = sec % 60;
    return remSec === 0 ? `${mins}m` : `${mins}m ${remSec}s`;
  }
  const hours = Math.floor(mins / 60);
  const remMins = mins % 60;
  return remMins === 0 ? `${hours}h` : `${hours}h ${remMins}m`;
}

/** Mode label used in headers and chips. */
export function modeLabel(mode: WaypointMode): string {
  switch (mode) {
    case 'hunt':
      return 'Hunt';
    case 'fish':
      return 'Fish';
    case 'camp':
      return 'Camp';
    case 'hike':
      return 'Hike';
  }
}

/** Two-letter chip code for a mode (matches the codified chip pattern). */
export function modeCode(mode: WaypointMode): string {
  switch (mode) {
    case 'hunt':
      return 'HU';
    case 'fish':
      return 'FI';
    case 'camp':
      return 'CA';
    case 'hike':
      return 'HI';
  }
}

/** All modes in display order. Exported for the dashboard render loop. */
export const PERSONAL_STATS_MODES = ALL_MODES;
