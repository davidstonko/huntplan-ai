/**
 * yearInReviewService — pure aggregator for the Year-in-Review screen.
 *
 * V2_3 Phase A.23 (retention surface).
 *
 * "Spotify Wrapped" for the user's outdoor data: takes a calendar year
 * (local TZ) and returns headline numbers for that year across all 5
 * personal layers — counts, totals, top mode, top tag, longest in-year
 * streak, biggest single day.
 *
 * Pure function. No I/O. Reads in-memory snapshots from the contexts.
 *
 * Year semantics: every personal-layer artifact contributes to its
 * LOCAL-day-of year. Tracks/waypoints/markups/checklists use the local
 * YMD slice of their createdAt/startedAt ISO timestamp; journals use
 * `entryDate` directly (already a local YYYY-MM-DD). Photos count is
 * derived from waypoint+journal photoUris (same rule as photoGalleryService).
 *
 * The longest-streak computation is intentionally year-bounded: it resets
 * at year boundaries, unlike activeStreaks which is open-ended. This keeps
 * Year-in-Review's "longest streak THIS YEAR" honest even when the user's
 * lifetime longest crosses Dec 31 → Jan 1.
 */

import type { UserWaypoint, WaypointMode } from '../types/userWaypoint';
import type { RecordedTrack } from '../types/track';
import type { UserMarkup } from '../types/userMarkup';
import type { JournalEntry } from '../types/journalEntry';
import type { GearChecklist } from '../types/gearChecklist';
import { isoToLocalYmd, ymdToYear } from './onThisDayService';

export interface YearInReviewInputs {
  waypoints?: UserWaypoint[];
  tracks?: RecordedTrack[];
  markups?: UserMarkup[];
  journalEntries?: JournalEntry[];
  checklists?: GearChecklist[];
}

export interface YearInReviewModeBreakdown {
  /** WaypointMode ('hunt' | 'fish' | 'camp' | 'hike'). */
  mode: WaypointMode;
  /** Total artifacts (across all 5 layers) attributed to this mode. */
  count: number;
  /** Unique local-YMD days the user did anything in this mode. */
  daysActive: number;
}

export interface YearInReviewBiggestDay {
  /** Local YYYY-MM-DD. */
  date: string;
  /** Total artifacts logged that day across all 5 layers. */
  count: number;
}

export interface YearInReview {
  /** The calendar year this review covers. */
  year: number;

  /** Per-layer counts for `year`. */
  totals: {
    waypoints: number;
    tracks: number;
    markups: number;
    journals: number;
    checklists: number;
    photos: number;
    /** Sum of distanceM across tracks in this year. */
    distanceM: number;
    /** Sum of elevationGainM across tracks in this year. */
    elevationGainM: number;
    /** Sum of durationSec across tracks in this year. */
    durationSec: number;
    /** Unique local-YMD days the user did ANYTHING. */
    daysActive: number;
  };

  /** Per-mode breakdown (always all 4 modes; counts may be 0). */
  byMode: YearInReviewModeBreakdown[];

  /** Mode with the most artifacts in this year. null if no activity. */
  topMode: WaypointMode | null;

  /** Most-used journal tag in this year (case-insensitive). null if none. */
  topTag: { tag: string; count: number } | null;

  /**
   * Longest run of consecutive local-YMD days in `year` with at least one
   * artifact. Year-bounded: streaks straddling Dec 31 → Jan 1 do NOT carry.
   */
  longestStreakInYear: number;

  /** Single day with the most artifacts. null if no activity. */
  biggestDay: YearInReviewBiggestDay | null;

  /** Earliest local-YMD with activity in this year. null if none. */
  firstActivityDate: string | null;

  /** Most-recent local-YMD with activity in this year. null if none. */
  lastActivityDate: string | null;

  /** Months (0-11) that had any activity. Sorted ascending. */
  monthsActive: number[];
}

const ALL_MODES: WaypointMode[] = ['hunt', 'fish', 'camp', 'hike'];

/**
 * Per-layer date extractor → local YMD. Returns undefined if the date is
 * missing or malformed (caller skips that artifact for the year-bucket).
 */
function ymdOfWaypoint(w: UserWaypoint): string | undefined {
  return isoToLocalYmd(w.createdAt);
}
function ymdOfTrack(t: RecordedTrack): string | undefined {
  return isoToLocalYmd(t.startedAt);
}
function ymdOfMarkup(m: UserMarkup): string | undefined {
  return isoToLocalYmd(m.createdAt);
}
function ymdOfJournal(j: JournalEntry): string | undefined {
  // entryDate is already local YYYY-MM-DD; sanity-check shape.
  if (!j.entryDate || typeof j.entryDate !== 'string') return undefined;
  return /^\d{4}-\d{2}-\d{2}$/.test(j.entryDate) ? j.entryDate : undefined;
}
function ymdOfChecklist(c: GearChecklist): string | undefined {
  // Prefer tripDate (the user's intent) when present, else fall back to
  // createdAt. tripDate is already YYYY-MM-DD.
  if (c.tripDate && /^\d{4}-\d{2}-\d{2}$/.test(c.tripDate)) return c.tripDate;
  return isoToLocalYmd(c.createdAt);
}

/**
 * Years (descending) that have ANY personal-layer activity. Used to render
 * the year-picker chip row in YearInReviewScreen.
 *
 * Always includes the current year (even if zero activity) so the user can
 * still open the screen on Jan 1 without an empty chip row.
 */
export function availableYearsWithActivity(
  inputs: YearInReviewInputs,
  today: Date = new Date(),
): number[] {
  const years = new Set<number>();
  years.add(today.getFullYear());

  const ingest = (ymd?: string) => {
    if (!ymd) return;
    const y = ymdToYear(ymd);
    if (y !== undefined) years.add(y);
  };

  for (const w of inputs.waypoints ?? []) ingest(ymdOfWaypoint(w));
  for (const t of inputs.tracks ?? []) ingest(ymdOfTrack(t));
  for (const m of inputs.markups ?? []) ingest(ymdOfMarkup(m));
  for (const j of inputs.journalEntries ?? []) ingest(ymdOfJournal(j));
  for (const c of inputs.checklists ?? []) ingest(ymdOfChecklist(c));

  return Array.from(years).sort((a, b) => b - a);
}

/**
 * Compute the Year-in-Review for a specific calendar year.
 *
 * `inputs` should always be the FULL collections (every layer); the
 * function filters internally so the caller can pass straight from
 * the context providers.
 */
export function computeYearInReview(
  year: number,
  inputs: YearInReviewInputs,
): YearInReview {
  const waypoints = inputs.waypoints ?? [];
  const tracks = inputs.tracks ?? [];
  const markups = inputs.markups ?? [];
  const journals = inputs.journalEntries ?? [];
  const checklists = inputs.checklists ?? [];

  const dayBag = new Set<string>();
  const monthBag = new Set<number>();
  const dayCount: Map<string, number> = new Map();
  const modeCount: Record<WaypointMode, number> = {
    hunt: 0,
    fish: 0,
    camp: 0,
    hike: 0,
  };
  const modeDays: Record<WaypointMode, Set<string>> = {
    hunt: new Set(),
    fish: new Set(),
    camp: new Set(),
    hike: new Set(),
  };

  let earliest: string | null = null;
  let latest: string | null = null;
  let nWaypoints = 0;
  let nTracks = 0;
  let nMarkups = 0;
  let nJournals = 0;
  let nChecklists = 0;
  let photos = 0;
  let distanceM = 0;
  let elevationGainM = 0;
  let durationSec = 0;

  /**
   * Fold one artifact's local YMD + mode + month into the running aggregates.
   * Centralized so every layer hits the same bookkeeping path.
   */
  function ingest(ymd: string | undefined, mode: WaypointMode): boolean {
    if (!ymd) return false;
    if (ymdToYear(ymd) !== year) return false;
    dayBag.add(ymd);
    dayCount.set(ymd, (dayCount.get(ymd) ?? 0) + 1);
    monthBag.add(parseInt(ymd.slice(5, 7), 10) - 1);
    modeCount[mode] += 1;
    modeDays[mode].add(ymd);
    if (earliest === null || ymd < earliest) earliest = ymd;
    if (latest === null || ymd > latest) latest = ymd;
    return true;
  }

  for (const w of waypoints) {
    if (ingest(ymdOfWaypoint(w), w.mode)) {
      nWaypoints += 1;
      photos += w.photoUris?.length ?? 0;
    }
  }
  for (const t of tracks) {
    if (ingest(ymdOfTrack(t), t.mode)) {
      nTracks += 1;
      distanceM += t.distanceM ?? 0;
      elevationGainM += t.elevationGainM ?? 0;
      durationSec += t.durationSec ?? 0;
    }
  }
  for (const m of markups) {
    if (ingest(ymdOfMarkup(m), m.mode)) {
      nMarkups += 1;
    }
  }

  // Tag tally — only journal entries falling in `year` contribute.
  const tagCounts: Map<string, { tag: string; count: number }> = new Map();
  for (const j of journals) {
    if (ingest(ymdOfJournal(j), j.mode)) {
      nJournals += 1;
      photos += j.photoUris?.length ?? 0;
      for (const raw of j.tags ?? []) {
        const k = raw.trim().toLowerCase();
        if (!k) continue;
        const existing = tagCounts.get(k);
        if (existing) {
          existing.count += 1;
        } else {
          tagCounts.set(k, { tag: raw.trim(), count: 1 });
        }
      }
    }
  }
  for (const c of checklists) {
    if (ingest(ymdOfChecklist(c), c.mode)) {
      nChecklists += 1;
    }
  }

  // Top mode = mode with most artifacts. Tie-break by ALL_MODES order (hunt > fish > camp > hike)
  // so behavior is deterministic when two modes have equal counts.
  let topMode: WaypointMode | null = null;
  let topModeN = 0;
  for (const m of ALL_MODES) {
    if (modeCount[m] > topModeN) {
      topModeN = modeCount[m];
      topMode = m;
    }
  }

  // Top tag — same tie-break: lexicographically lower tag wins.
  let topTag: { tag: string; count: number } | null = null;
  for (const v of tagCounts.values()) {
    if (
      !topTag ||
      v.count > topTag.count ||
      (v.count === topTag.count && v.tag.toLowerCase() < topTag.tag.toLowerCase())
    ) {
      topTag = { tag: v.tag, count: v.count };
    }
  }

  // Longest in-year streak — sort active days, walk for consecutive runs.
  const sortedDays = Array.from(dayBag).sort();
  let longestStreak = 0;
  let run = 0;
  let prevMs: number | null = null;
  for (const ymd of sortedDays) {
    const [y, mo, d] = ymd.split('-').map((p) => parseInt(p, 10));
    const ms = new Date(y, mo - 1, d, 0, 0, 0, 0).getTime();
    if (prevMs !== null && ms - prevMs === 86_400_000) {
      run += 1;
    } else {
      run = 1;
    }
    if (run > longestStreak) longestStreak = run;
    prevMs = ms;
  }

  // Biggest day — same deterministic tie-break (earlier date wins).
  let biggestDay: YearInReviewBiggestDay | null = null;
  for (const [date, count] of dayCount) {
    if (
      !biggestDay ||
      count > biggestDay.count ||
      (count === biggestDay.count && date < biggestDay.date)
    ) {
      biggestDay = { date, count };
    }
  }

  const byMode: YearInReviewModeBreakdown[] = ALL_MODES.map((m) => ({
    mode: m,
    count: modeCount[m],
    daysActive: modeDays[m].size,
  }));

  return {
    year,
    totals: {
      waypoints: nWaypoints,
      tracks: nTracks,
      markups: nMarkups,
      journals: nJournals,
      checklists: nChecklists,
      photos,
      distanceM,
      elevationGainM,
      durationSec,
      daysActive: dayBag.size,
    },
    byMode,
    topMode,
    topTag,
    longestStreakInYear: longestStreak,
    biggestDay,
    firstActivityDate: earliest,
    lastActivityDate: latest,
    monthsActive: Array.from(monthBag).sort((a, b) => a - b),
  };
}

// ── Phase A.51 — trips section ──
//
// Year-in-Review original (A.23) covers the 5 personal-layer artifacts.
// CampTrip + HikeTrip live in their own storage and aren't part of that
// pipeline. The trips section is a separate, small projection that
// answers "how many trips did I plan/take in {year}?" and surfaces
// alongside the personal-layer totals on YearInReviewScreen.

import type { CampTrip } from '../types/camp';
import type { HikeTrip } from '../types/hike';

export interface YearInReviewTrips {
  /** Total Camp trips that started in `year`. */
  camp: number;
  /** Total Hike trips that started in `year`. */
  hike: number;
  /** Sum of camp + hike. */
  total: number;
  /**
   * Longest gap (in civil days) between consecutive trip start dates
   * within `year`. null when fewer than 2 trips occurred in the year.
   */
  longestGapDaysInYear: number | null;
  /** YYYY-MM of the user's busiest month in `year`, or null. */
  busiestMonth: string | null;
}

export interface YearInReviewTripsInputs {
  campTrips?: CampTrip[];
  hikeTrips?: HikeTrip[];
}

/**
 * Pull the local YYYY-MM-DD start date for a trip in either shape.
 * Mirrors `tripStartYmd` from tripCadenceService — duplicated here to
 * keep the dependency direction one-way (yearInReviewService doesn't
 * import from tripCadenceService).
 */
function tripStartYmd(trip: CampTrip | HikeTrip): string {
  return 'arrivalDate' in trip ? trip.arrivalDate : trip.startDate;
}

/**
 * Compute trip-only totals for `year`. PAST+FUTURE both count here
 * because Year-in-Review shows the full year shape, not just past
 * events (the user might open the screen in March and want the count
 * including their summer trip plans). This matches the rest of the
 * Year-in-Review service which counts artifacts dated to the year
 * regardless of whether they're "yet to happen".
 */
export function computeYearInReviewTrips(
  year: number,
  inputs: YearInReviewTripsInputs = {},
): YearInReviewTrips {
  const campTrips = inputs.campTrips ?? [];
  const hikeTrips = inputs.hikeTrips ?? [];

  const dayMs: number[] = [];
  const monthBag: Map<string, number> = new Map();
  let camp = 0;
  let hike = 0;

  function consider(trip: CampTrip | HikeTrip, kind: 'camp' | 'hike') {
    const ymd = tripStartYmd(trip);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(ymd)) return;
    const [yStr, mStr] = ymd.split('-');
    const y = Number(yStr);
    const m = Number(mStr);
    if (y !== year) return;

    if (kind === 'camp') camp += 1;
    else hike += 1;

    const d = new Date(year, m - 1, Number(ymd.split('-')[2]));
    if (!isNaN(d.getTime())) dayMs.push(d.getTime());

    const ymKey = `${yStr}-${mStr}`;
    monthBag.set(ymKey, (monthBag.get(ymKey) ?? 0) + 1);
  }

  for (const t of campTrips) consider(t, 'camp');
  for (const t of hikeTrips) consider(t, 'hike');

  // Longest in-year gap between consecutive start dates.
  let longestGapDaysInYear: number | null = null;
  if (dayMs.length >= 2) {
    const sorted = [...dayMs].sort((a, b) => a - b);
    let longest = 0;
    for (let i = 1; i < sorted.length; i++) {
      const gap = Math.round((sorted[i] - sorted[i - 1]) / 86_400_000);
      if (gap > longest) longest = gap;
    }
    longestGapDaysInYear = longest;
  }

  // Busiest month — highest count, with earliest YM as the tie-break.
  let busiestMonth: string | null = null;
  let bestCount = 0;
  const monthKeys = [...monthBag.keys()].sort();
  for (const k of monthKeys) {
    const c = monthBag.get(k) ?? 0;
    if (c > bestCount) {
      bestCount = c;
      busiestMonth = k;
    }
  }

  return {
    camp,
    hike,
    total: camp + hike,
    longestGapDaysInYear,
    busiestMonth,
  };
}
