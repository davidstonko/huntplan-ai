/**
 * briefingGoalSpotlightService — pure briefing-side wrapper that
 * picks a single Annual Goal to surface on the Daily Briefing
 * (Phase A.39).
 *
 * The actual selection math lives in `goalsService.pickFeaturedGoal`
 * (Phase A.28) — this module is a thin orchestrator that handles:
 *   1. Computing all current-progress snapshots from raw inputs
 *      (tracks + journals + waypoints + goals).
 *   2. Delegating to the picker for the priority order
 *      (current-year > non-complete > behind > closer-to-finish).
 *   3. Returning `null` when no goal qualifies — the screen hides
 *      the card entirely rather than rendering a stub.
 *
 * Pure functions only. No storage, no `new Date()` outside the
 * caller-provided clock. Convention matches A.34/A.35/A.38: one
 * tiny per-card service that the screen calls in a single useMemo.
 *
 * Why this thin wrapper exists rather than calling the picker
 * directly from the screen:
 *   - Keeps the briefing's view-model surface uniform (`pickX`
 *     returns the rendering input, period).
 *   - Lets briefing-specific concerns (e.g. a future "skip if goal
 *     was just created today" guard) layer here without polluting
 *     the general-purpose goalsService.
 *   - One import in the screen instead of two, mirrored by one
 *     useMemo call site.
 */

import type { Goal, GoalProgress } from '../types/goal';
import type { RecordedTrack } from '../types/track';
import type { JournalEntry } from '../types/journalEntry';
import type { UserWaypoint } from '../types/userWaypoint';
import {
  computeAllGoalProgress,
  pickFeaturedGoal,
} from './goalsService';

/** Source data the briefing already has on hand. */
export interface BriefingGoalInputs {
  tracks: RecordedTrack[];
  journals: JournalEntry[];
  waypoints: UserWaypoint[];
}

/**
 * Pick the single annual-goal progress snapshot to feature on the
 * Daily Briefing's GOAL SPOTLIGHT card. Returns `null` when no goal
 * is eligible (no goals defined, all goals are past-year, all goals
 * are already complete).
 *
 * Selection priority (delegated to `pickFeaturedGoal`):
 *   1. Active or future-year goals (past-year is read-only history).
 *   2. Skip already-complete goals (celebration is on Year-in-Review,
 *      not on the open-loop briefing card).
 *   3. Behind > on-pace > ahead — the behind one is the "log a quick
 *      entry now" tap that fixes the gap.
 *   4. Within the same pace bucket, prefer the highest percent —
 *      closer-to-finish exerts a stronger pull.
 *   5. Tiebreak: oldest goal in the bucket wins.
 *
 * @example
 *   const featured = pickBriefingGoalSpotlight(goals, {
 *     tracks: allTracks, journals: allJournals, waypoints: allWaypoints,
 *   });
 *   if (featured) {
 *     // render <BriefingGoalSpotlightCard featured={featured} />
 *   }
 */
export function pickBriefingGoalSpotlight(
  goals: Goal[],
  inputs: BriefingGoalInputs,
  now: Date = new Date(),
): GoalProgress | null {
  if (goals.length === 0) return null;
  const progresses = computeAllGoalProgress(goals, inputs, now);
  return pickFeaturedGoal(progresses, now);
}

/**
 * Render-gating predicate paired with the projection. Convention
 * from A.33 `hasUsefulTideData` / A.36 `shouldShowBadge` /
 * A.37 `hasOnThisDayPhoto` — lets a screen ask "do we have a goal
 * to feature?" without re-running the full picker if it doesn't
 * actually need the snapshot.
 *
 * Currently a 1-liner over the picker (no separate predicate
 * shortcut), kept exported for convention symmetry and so future
 * callers can treat the predicate as the contract.
 */
export function hasBriefingGoalSpotlight(
  goals: Goal[],
  inputs: BriefingGoalInputs,
  now: Date = new Date(),
): boolean {
  return pickBriefingGoalSpotlight(goals, inputs, now) !== null;
}

/**
 * Compact relative-time tag for the briefing card's PACE cell:
 * one of 'BEHIND PACE' / 'ON PACE' / 'AHEAD' / 'COMPLETE'. Mirrors
 * the screen-friendly bucket-label pattern from A.34/A.35/A.36 —
 * the service emits the bucket name; the component maps to color.
 */
export function paceLabel(progress: GoalProgress): string {
  switch (progress.paceStatus) {
    case 'behind':
      return 'BEHIND PACE';
    case 'on_pace':
      return 'ON PACE';
    case 'ahead':
      return 'AHEAD';
    case 'complete':
      return 'COMPLETE';
  }
}
