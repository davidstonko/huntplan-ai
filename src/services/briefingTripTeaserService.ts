/**
 * @file briefingTripTeaserService.ts
 * @description Phase A.44 — pure selector that picks the single
 * upcoming Camp/Hike trip most worth featuring on Daily Briefing.
 *
 * Wraps the A.41 cross-planner aggregator and applies a "near-horizon"
 * filter: only trips within `HORIZON_DAYS` (default 14) of today
 * qualify. The briefing surfaces "what does today need from me?", and
 * a trip three months out doesn't pass that bar — the user already
 * has the dedicated Upcoming Trips screen for the long view.
 *
 * Returns null when no trip qualifies (no saved trips, all past, all
 * beyond the horizon). The Daily Briefing card renders null on null
 * per the A.39 card-renders-null pattern, so the briefing collapses
 * cleanly without an empty stub.
 *
 * Why a separate service module rather than inlining on the screen:
 *   - The horizon constant + the "totalUpcoming" count projection are
 *     both testable in isolation.
 *   - Keeping briefing-card selectors as their own modules mirrors the
 *     A.32–A.39 pattern (briefingWeather/Tide/ActivityRating/Tomorrow/
 *     BestDay/GoalSpotlight all live in their own service file).
 *
 * @module Services
 * @version 2.3.0
 */

import {
  listUpcomingTrips,
  type UpcomingTripRow,
  type UpcomingTripsInputs,
} from './upcomingTripsService';
import type { GearChecklist } from '../types/gearChecklist';
import { countItems } from '../types/gearChecklist';

/**
 * How many days out a trip can be and still qualify for the briefing
 * teaser. 14 days mirrors a typical "trip prep window" — long enough
 * to start packing + pulling permits, short enough that the trip is
 * actually next-thing-on-deck rather than far-future planning.
 */
export const BRIEFING_TRIP_HORIZON_DAYS = 14;

/**
 * Pack-progress projection derived from the trip's linked
 * GearChecklist. When the trip has no `gearChecklistId` (or the link
 * is stale — id present but the checklist was deleted), `packStatus`
 * is null and the card surfaces a "start packing" CTA. When present,
 * the briefing shows "checked/total packed" and the tap-target swaps
 * from "see all trips" to "open the linked checklist directly".
 */
export interface BriefingTripPackStatus {
  checklistId: string;
  checked: number;
  total: number;
}

/**
 * View-shape returned by `pickBriefingTripTeaser`. The card uses the
 * row for headline + meta and the count for the "1 of N upcoming"
 * sub-line.
 */
export interface BriefingTripTeaser {
  /** The featured trip itself (the soonest upcoming row). */
  row: UpcomingTripRow;
  /**
   * How many upcoming (today + future) trips the user has across both
   * planners. Lets the card render "1 of N upcoming" so the user
   * knows the briefing is showing a slice, not the full list.
   */
  totalUpcoming: number;
  /**
   * Pack progress for the trip's linked checklist, or null when the
   * trip has no linked checklist (or the link is stale). Shapes the
   * tap-target on the briefing card: when present, tap → checklist
   * editor; when null, tap → UpcomingTripsScreen (start packing from
   * the PACK button there).
   */
  packStatus: BriefingTripPackStatus | null;
}

/**
 * Pick the trip to feature in the briefing's trip teaser, or null if
 * none qualify.
 *
 * Eligibility:
 *   - At least one upcoming trip exists (today or future).
 *   - The soonest upcoming trip's `daysUntil` is ≤
 *     `BRIEFING_TRIP_HORIZON_DAYS`.
 *
 * The "soonest" pick reuses listUpcomingTrips' chronological sort —
 * we don't re-sort here. If a future tweak wants a different heuristic
 * (e.g. prefer a trip with no gear checklist linked), this is the
 * place to layer it on, not the screen.
 *
 * Pass `checklists` to enrich the result with `packStatus` (the
 * checked/total of the trip's linked GearChecklist). When the trip
 * has no `gearChecklistId` — or it points to a checklist that no
 * longer exists (stale link) — `packStatus` is null and the card
 * surfaces a "start packing" CTA. The third positional arg is
 * intentionally optional so existing call sites that don't have a
 * checklist context handy still compile.
 */
export function pickBriefingTripTeaser(
  inputs: UpcomingTripsInputs,
  now: Date = new Date(),
  checklists: GearChecklist[] = [],
): BriefingTripTeaser | null {
  const rows = listUpcomingTrips(inputs, now);
  if (rows.length === 0) return null;
  const soonest = rows[0];
  if (soonest.daysUntil > BRIEFING_TRIP_HORIZON_DAYS) return null;

  const linkId = soonest.raw.gearChecklistId ?? null;
  const linked = linkId
    ? checklists.find((c) => c.id === linkId) ?? null
    : null;
  const packStatus: BriefingTripPackStatus | null = linked
    ? { checklistId: linked.id, ...countItems(linked.items) }
    : null;

  return {
    row: soonest,
    totalUpcoming: rows.length,
    packStatus,
  };
}
