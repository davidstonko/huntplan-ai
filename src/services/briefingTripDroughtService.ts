/**
 * @file briefingTripDroughtService.ts
 * @description Phase A.48 — pure selector that returns a "trip
 * drought" nudge when the user has gone too long without a trip.
 * Drives a soft, amber-bordered card on Daily Briefing.
 *
 * Wraps `tripCadenceService.computeTripCadence` and applies the
 * `isLongGap` threshold (currently 30 days). When triggered, also
 * exposes the kind ('camp' | 'hike') of the user's most-recent past
 * trip so the briefing card can deep-link to the right planner —
 * the user's habit signal beats a hardcoded default.
 *
 * Returns null when:
 *  - user has no past trips (first-time experience uses other surfaces)
 *  - user IS within the threshold (last trip was ≤30 days ago)
 *
 * @module Services
 * @version 2.3.0
 */

import type { CampTrip } from '../types/camp';
import type { HikeTrip } from '../types/hike';
import { ymdToLocalDate, localMidnightToday } from './upcomingTripsService';
import {
  computeTripCadence,
  type TripCadenceInputs,
} from './tripCadenceService';

export type DroughtTripKind = 'camp' | 'hike';

/**
 * View-shape for the briefing's "trip drought" card. Only present
 * when the user has at least one past trip AND the gap since that
 * trip exceeds the long-gap threshold.
 */
export interface BriefingTripDrought {
  /** Civil days from the last trip's start to today. Always > 30. */
  daysSinceLastTrip: number;
  /** Kind of the most-recent past trip — used to pick the planner tab. */
  lastTripKind: DroughtTripKind;
}

/**
 * Pick the drought nudge or null. Iterates the trips a second time
 * (after the cadence pass) only to recover the kind of the most-
 * recent trip — cheap, and keeps the cadence service's shape stable.
 */
export function pickBriefingTripDrought(
  inputs: TripCadenceInputs,
  now: Date = new Date(),
): BriefingTripDrought | null {
  const cadence = computeTripCadence(inputs, now);
  if (!cadence.isLongGap || cadence.daysSinceLastTrip === null) return null;

  const startOfToday = localMidnightToday(now);
  const todayMs = startOfToday.getTime();

  let bestMs = -Infinity;
  let bestKind: DroughtTripKind = 'hike'; // safe default; overwritten below

  for (const t of inputs.campTrips) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(t.arrivalDate)) continue;
    const ms = ymdToLocalDate(t.arrivalDate).getTime();
    if (isNaN(ms) || ms > todayMs) continue;
    if (ms > bestMs) {
      bestMs = ms;
      bestKind = 'camp';
    }
  }
  for (const t of inputs.hikeTrips) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(t.startDate)) continue;
    const ms = ymdToLocalDate(t.startDate).getTime();
    if (isNaN(ms) || ms > todayMs) continue;
    if (ms > bestMs) {
      bestMs = ms;
      bestKind = 'hike';
    }
  }

  // Defensive: cadence said isLongGap was true, so we must have at
  // least one past trip. If something weird happens (e.g. all trips
  // have malformed start dates), fall back to null rather than
  // surfacing a bogus card.
  if (bestMs === -Infinity) return null;

  return {
    daysSinceLastTrip: cadence.daysSinceLastTrip,
    lastTripKind: bestKind,
  };
}

// Re-exporting for convenience: lets callers import the union of
// CampTrip + HikeTrip + the journal-aware shape from one place.
export type { CampTrip, HikeTrip };
