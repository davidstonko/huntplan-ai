/**
 * Annual Goal — Personal-Layer Types Module (V2.3 expansion, Phase A.28)
 *
 * A user-defined numeric target anchored to a calendar year and (optionally)
 * one activity mode. Goals are pure-aggregation reads of the existing
 * personal-layer data — adding a goal does NOT add a new write surface, it
 * only computes and surfaces progress against tracks/journals/waypoints
 * the user already creates.
 *
 * Why year-anchored: goals like "log 50 fishing trips this year" are the
 * obvious mental model. A rolling 365-day window would feel arbitrary. The
 * UI offers "next year" as the new-year default and the previous year stays
 * read-only as a record.
 *
 * Lives entirely on-device. AsyncStorage key `user_goals_v1`.
 *
 * Added 2026-04-25 per V2.3 plan / Phase A.28.
 */

import type { WaypointMode } from './userWaypoint';

/**
 * What we're counting against the goal target. Each metric is a pure
 * aggregation over one of the personal-layer collections.
 *
 * - `track_distance`     — sum of `RecordedTrack.distanceM` (rendered as miles)
 * - `track_duration`     — sum of `RecordedTrack.durationSec` (rendered as hours)
 * - `track_count`        — number of saved RecordedTracks
 * - `elevation_gain`     — sum of `RecordedTrack.elevationGainM` (rendered as feet)
 * - `journal_entries`    — number of JournalEntry rows
 * - `unique_active_days` — distinct YYYY-MM-DD across tracks + journals + waypoints
 * - `waypoint_count`     — number of UserWaypoint pins created
 */
export type GoalMetric =
  | 'track_distance'
  | 'track_duration'
  | 'track_count'
  | 'elevation_gain'
  | 'journal_entries'
  | 'unique_active_days'
  | 'waypoint_count';

/**
 * Which subset of the personal layer the goal aggregates over. `'all'` is
 * cross-mode — useful for "active days" or other lifestyle goals that
 * shouldn't be siloed into one activity.
 */
export type GoalScope = WaypointMode | 'all';

export interface Goal {
  id: string;
  /** User-friendly label. Optional — UI synthesizes one if missing. */
  label?: string;
  scope: GoalScope;
  metric: GoalMetric;
  /** Numeric target in the metric's natural display unit (mi / hr / count / ft / days). */
  targetValue: number;
  /** Calendar year the goal applies to (e.g., 2026). */
  year: number;
  createdAt: string;
  updatedAt: string;
}

/**
 * The "are we on track?" verdict. Computed from current vs expected at
 * this date. `expectedAtThisPoint = (daysElapsed / daysInYear) * targetValue`.
 */
export type PaceStatus = 'ahead' | 'on_pace' | 'behind' | 'complete';

/**
 * Computed snapshot for a goal at a given moment. Pure read — no side
 * effects. The UI binds against this directly.
 */
export interface GoalProgress {
  goal: Goal;
  /** Current accumulated value in the goal's display unit. */
  current: number;
  /** Goal's target (mirrored from goal.targetValue for convenience). */
  target: number;
  /** 0–100, capped at 100. */
  percent: number;
  /** Days since the goal year started (clamped 0..daysInYear). */
  daysElapsed: number;
  /** Days remaining in the goal year (0 if year is over). */
  daysRemaining: number;
  /** What `current` "should" be at this point of the year, linearly. */
  expectedAtThisPoint: number;
  /** Linear pace verdict. `complete` when `current >= target`. */
  paceStatus: PaceStatus;
  /**
   * Whole-unit display — what the user sees on the row. e.g. "47 of 100 mi".
   */
  display: { current: string; target: string; unit: string };
}
