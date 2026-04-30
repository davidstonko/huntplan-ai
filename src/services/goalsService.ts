/**
 * goalsService — pure aggregation of personal-layer data against
 * user-defined Goal targets (Phase A.28 Annual Goal Tracker).
 *
 * The whole module is side-effect-free pure functions. Storage lives in
 * goalsStorage; this module only computes progress so the screen can
 * render bars and pace verdicts.
 *
 * Year-anchored model: a goal applies to a single calendar year. We slice
 * the input collections to entries dated within the goal's year (inclusive)
 * and aggregate. The "expected at this point" baseline is linear over the
 * year — fancier models (seasonality) would hide the user's actual pace.
 *
 * Date semantics — load-bearing:
 *   - All comparisons use LOCAL year (not UTC). A track started at 23:00
 *     local on Dec 31 should belong to that year, not the next.
 *   - If a date string fails to parse, the row is silently dropped — same
 *     "extractors not validators" pattern as geoImport / personalSearch.
 */

import type {
  Goal,
  GoalProgress,
  GoalScope,
  PaceStatus,
} from '../types/goal';
import type { RecordedTrack } from '../types/track';
import type { JournalEntry } from '../types/journalEntry';
import type { UserWaypoint } from '../types/userWaypoint';

// ────────────────────────── unit conversions ──────────────────────────

/** Meters → miles (statute). */
function metersToMiles(m: number): number {
  return m / 1609.344;
}
/** Seconds → hours (decimal). */
function secondsToHours(s: number): number {
  return s / 3600;
}
/** Meters → feet (international). */
function metersToFeet(m: number): number {
  return m * 3.28084;
}

/** Display unit per metric — stable strings the screen renders verbatim. */
export function unitForMetric(metric: Goal['metric']): string {
  switch (metric) {
    case 'track_distance':
      return 'mi';
    case 'track_duration':
      return 'hr';
    case 'track_count':
      return 'tracks';
    case 'elevation_gain':
      return 'ft';
    case 'journal_entries':
      return 'entries';
    case 'unique_active_days':
      return 'days';
    case 'waypoint_count':
      return 'pins';
  }
}

// ────────────────────────── date helpers ──────────────────────────

/** True if date is a leap year. */
function isLeapYear(y: number): boolean {
  return (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0;
}

/** Days in the calendar year (365 or 366). */
function daysInYear(y: number): number {
  return isLeapYear(y) ? 366 : 365;
}

/** Local YYYY-MM-DD for a Date — avoids UTC drift. */
function localYmd(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${dd}`;
}

/** Parse an ISO-ish string to local-year, returning NaN if unparseable. */
function localYearOf(s: string | undefined | null): number {
  if (!s) return NaN;
  const d = new Date(s);
  return isFinite(d.getTime()) ? d.getFullYear() : NaN;
}

/** Local YMD of a string ISO date, or null if unparseable. */
function localYmdOf(s: string | undefined | null): string | null {
  if (!s) return null;
  const d = new Date(s);
  if (!isFinite(d.getTime())) return null;
  return localYmd(d);
}

/**
 * Days elapsed from year-start through `now` (clamped 0..daysInYear). For
 * a goal in 2026 evaluated on 2026-04-25 in a non-leap year this returns
 * 115. For `now` in a different year it returns 0 (future) or the year's
 * full length (past).
 */
function daysElapsedInYear(year: number, now: Date): number {
  const start = new Date(year, 0, 1);
  const end = new Date(year + 1, 0, 1);
  if (now < start) return 0;
  if (now >= end) return daysInYear(year);
  // +1 so the first day of the year counts as day 1, not day 0.
  const ms = now.getTime() - start.getTime();
  return Math.floor(ms / (24 * 60 * 60 * 1000)) + 1;
}

// ────────────────────────── scope filter ──────────────────────────

/**
 * Pick rows whose mode matches the goal scope. `'all'` accepts everything.
 * Inputs without a `mode` field (e.g. a UserWaypoint that somehow has none)
 * are dropped under any mode-restricted scope.
 */
function inScope<T extends { mode?: string }>(rows: T[], scope: GoalScope): T[] {
  if (scope === 'all') return rows;
  return rows.filter((r) => r.mode === scope);
}

// ────────────────────────── per-metric aggregation ──────────────────────────

interface AggregateInput {
  tracks: RecordedTrack[];
  journals: JournalEntry[];
  waypoints: UserWaypoint[];
  year: number;
  scope: GoalScope;
}

/**
 * Internal per-metric aggregator. Returns the raw current value in the
 * metric's display unit. Year filter is applied here (not by the caller)
 * so each metric controls which date field on its source row anchors it.
 */
function aggregate(metric: Goal['metric'], input: AggregateInput): number {
  const { tracks, journals, waypoints, year, scope } = input;

  // Tracks anchored by `startedAt`.
  const yearTracks = inScope(tracks, scope).filter(
    (t) => localYearOf(t.startedAt) === year,
  );

  // Journals anchored by `entryDate` (already YYYY-MM-DD local).
  const yearJournals = inScope(journals, scope).filter((j) => {
    const yr = parseInt(j.entryDate?.slice(0, 4) ?? '', 10);
    return yr === year;
  });

  // Waypoints anchored by `createdAt`.
  const yearWaypoints = inScope(waypoints, scope).filter(
    (w) => localYearOf(w.createdAt) === year,
  );

  switch (metric) {
    case 'track_distance':
      return metersToMiles(
        yearTracks.reduce((s, t) => s + (t.distanceM || 0), 0),
      );
    case 'track_duration':
      return secondsToHours(
        yearTracks.reduce((s, t) => s + (t.durationSec || 0), 0),
      );
    case 'track_count':
      return yearTracks.length;
    case 'elevation_gain':
      return metersToFeet(
        yearTracks.reduce((s, t) => s + (t.elevationGainM || 0), 0),
      );
    case 'journal_entries':
      return yearJournals.length;
    case 'waypoint_count':
      return yearWaypoints.length;
    case 'unique_active_days': {
      const days = new Set<string>();
      for (const t of yearTracks) {
        const ymd = localYmdOf(t.startedAt);
        if (ymd) days.add(ymd);
      }
      for (const j of yearJournals) {
        if (j.entryDate) days.add(j.entryDate);
      }
      for (const w of yearWaypoints) {
        const ymd = localYmdOf(w.createdAt);
        if (ymd) days.add(ymd);
      }
      return days.size;
    }
  }
}

// ────────────────────────── public surface ──────────────────────────

/**
 * Format a numeric value for the row display. Counts are integer; distance
 * gets one decimal place once over 10 mi (otherwise still integer feels
 * unnatural for "0.4 mi"), duration always one decimal, elevation integer.
 */
function fmt(value: number, metric: Goal['metric']): string {
  switch (metric) {
    case 'track_distance':
      return value >= 10 ? value.toFixed(1) : value.toFixed(2);
    case 'track_duration':
      return value.toFixed(1);
    case 'elevation_gain':
      return Math.round(value).toLocaleString();
    case 'track_count':
    case 'journal_entries':
    case 'unique_active_days':
    case 'waypoint_count':
      return Math.round(value).toString();
  }
}

/** Pace verdict tolerance. Within ±10% of expected = on_pace. */
const PACE_TOLERANCE = 0.1;

/**
 * Compute the on-screen GoalProgress snapshot for one goal at `now`.
 * Pure function — no storage reads, no side effects.
 */
export function computeGoalProgress(
  goal: Goal,
  inputs: { tracks: RecordedTrack[]; journals: JournalEntry[]; waypoints: UserWaypoint[] },
  now: Date = new Date(),
): GoalProgress {
  const current = aggregate(goal.metric, {
    tracks: inputs.tracks,
    journals: inputs.journals,
    waypoints: inputs.waypoints,
    year: goal.year,
    scope: goal.scope,
  });

  const target = Math.max(0, goal.targetValue);
  const percent = target > 0 ? Math.min(100, (current / target) * 100) : 0;

  const totalDays = daysInYear(goal.year);
  const daysElapsed = daysElapsedInYear(goal.year, now);
  const daysRemaining = Math.max(0, totalDays - daysElapsed);
  const expectedAtThisPoint =
    target > 0 ? (daysElapsed / totalDays) * target : 0;

  let paceStatus: PaceStatus;
  if (target > 0 && current >= target) {
    paceStatus = 'complete';
  } else if (expectedAtThisPoint <= 0) {
    paceStatus = 'on_pace';
  } else {
    const ratio = current / expectedAtThisPoint;
    if (ratio >= 1 + PACE_TOLERANCE) paceStatus = 'ahead';
    else if (ratio <= 1 - PACE_TOLERANCE) paceStatus = 'behind';
    else paceStatus = 'on_pace';
  }

  const unit = unitForMetric(goal.metric);
  return {
    goal,
    current,
    target,
    percent,
    daysElapsed,
    daysRemaining,
    expectedAtThisPoint,
    paceStatus,
    display: {
      current: fmt(current, goal.metric),
      target: fmt(target, goal.metric),
      unit,
    },
  };
}

/**
 * Compute progress for every goal in a list. Convenience for the screen,
 * which renders one row per goal sorted by year DESC then created DESC.
 */
export function computeAllGoalProgress(
  goals: Goal[],
  inputs: { tracks: RecordedTrack[]; journals: JournalEntry[]; waypoints: UserWaypoint[] },
  now: Date = new Date(),
): GoalProgress[] {
  return goals.map((g) => computeGoalProgress(g, inputs, now));
}

/**
 * Pick the single goal most worth surfacing on a hub-style preview card.
 *
 * The preview slot is scarce real-estate, so it should be the goal the
 * user is most likely to act on this session. Heuristic, in priority order:
 *   1. Active year only (current calendar year ≥ goal.year). Past-year
 *      goals are read-only history; future-year goals haven't started.
 *      Past-year goals are filtered out; current-year and any
 *      already-active future-year goals are kept.
 *   2. Skip already-complete goals — celebration belongs on Year-in-Review,
 *      not on the "open loop" hub teaser.
 *   3. Prefer behind-pace goals over on-pace over ahead — the behind one
 *      is the one a "log a quick entry now" tap can fix.
 *   4. Within the same pace bucket, prefer the highest percent — closer
 *      to the finish line is a stronger pull.
 *   5. Final tiebreak: stable sort by `goal.createdAt` ascending so the
 *      oldest goal in a tied bucket wins (matches GoalsScreen's display
 *      order intuition).
 *
 * Returns `null` if no progress entries are eligible (no active goals,
 * or every active goal is already complete).
 */
export function pickFeaturedGoal(
  progresses: GoalProgress[],
  now: Date = new Date(),
): GoalProgress | null {
  const currentYear = now.getFullYear();
  const eligible = progresses.filter(
    (p) => p.goal.year >= currentYear && p.paceStatus !== 'complete',
  );
  if (eligible.length === 0) return null;

  const paceRank: Record<PaceStatus, number> = {
    behind: 0,
    on_pace: 1,
    ahead: 2,
    // 'complete' is filtered out above; included so the type stays exhaustive.
    complete: 3,
  };

  const sorted = [...eligible].sort((a, b) => {
    const pa = paceRank[a.paceStatus] - paceRank[b.paceStatus];
    if (pa !== 0) return pa;
    // Higher percent first within the same pace bucket.
    if (a.percent !== b.percent) return b.percent - a.percent;
    // Stable tiebreak — older goal wins.
    return a.goal.createdAt < b.goal.createdAt ? -1 : 1;
  });
  return sorted[0];
}

/**
 * Default user-friendly label for a fresh goal — used when the user
 * hasn't customized one. Composed of `<Year> <Scope> <Target> <Unit>`,
 * e.g. "2026 hike 100 mi".
 */
export function defaultLabelFor(goal: Goal): string {
  const scopeLabel = goal.scope === 'all' ? 'all-mode' : goal.scope;
  const unit = unitForMetric(goal.metric);
  const tgt = fmt(goal.targetValue, goal.metric);
  return `${goal.year} ${scopeLabel} ${tgt} ${unit}`;
}
