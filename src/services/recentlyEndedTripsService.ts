/**
 * @file recentlyEndedTripsService.ts
 * @description Phase A.46 — pure projection that finds trips whose
 * end date fell in the last N days but which the user hasn't yet
 * logged a journal entry about. Drives the briefing's "TRIPS TO LOG"
 * card, closing the post-trip retention loop.
 *
 * Why post-trip prompts matter: the user's planner has them in the
 * pre-trip phase (see A.43 PACK CTA, A.44/A.45 briefing); the field
 * journal is the post-trip phase. Without an explicit nudge, a trip
 * the user actually went on can fall through the cracks — they
 * remember "I should write that up" but the day passes. Surfacing
 * the prompt the morning after end-of-trip is the cheapest moment to
 * catch them.
 *
 * Design choices:
 *  - Match heuristic on "trip already logged" is intentionally
 *    permissive: same mode + journal entryDate within the trip's
 *    [start - 1, end + 7] window. We aren't trying to enforce a
 *    1:1 link (that would need a tripId field on JournalEntry which
 *    the type doesn't have today); we just want to suppress the
 *    nudge when the user already wrote *something* close enough in
 *    time. False negatives ("user wrote about a different trip in
 *    the same window") are acceptable — they just don't see the
 *    nudge for that trip, no harm done.
 *  - 7-day post-trip window is the same horizon as the briefing
 *    teaser (A.44) — gives the user a week to log before we stop
 *    nagging.
 *  - Returns at most one trip (the most-recently-ended one) so the
 *    briefing card stays a single-decision surface. The service
 *    also exposes `listRecentlyEndedTrips` for a future "all trips
 *    pending log" screen.
 *
 * @module Services
 * @version 2.3.0
 */

import type { CampTrip } from '../types/camp';
import type { HikeTrip } from '../types/hike';
import type { JournalEntry } from '../types/journalEntry';
import type { UpcomingTripsInputs } from './upcomingTripsService';
import { ymdToLocalDate, localMidnightToday } from './upcomingTripsService';

/**
 * How many days after a trip ends we'll keep nudging the user to log
 * it. After this, the trip falls off the briefing nudge surface.
 * Mirrors the `BRIEFING_TRIP_HORIZON_DAYS` 14-day forward horizon
 * symmetry, but tighter (7 days) because post-trip recall fades fast.
 */
export const RECENTLY_ENDED_HORIZON_DAYS = 7;

/**
 * The unified row shape returned by the selector. Mirrors A.41's
 * `UpcomingTripRow` but oriented toward the END of the trip (and
 * therefore exposes `daysSinceEnd` rather than `daysUntil`).
 */
export interface RecentlyEndedTripRow {
  kind: 'camp' | 'hike';
  id: string;
  /** Display name (CampTrip.tripName, HikeTrip.name). */
  name: string;
  /** YYYY-MM-DD local — trip start (for the "trip just ended" copy). */
  startDate: string;
  /** YYYY-MM-DD local — trip end (camp.departureDate, hike.startDate + nights). */
  endDate: string;
  /** Whole local-civil days from end to today; 0 = ended today, 1 = yesterday. */
  daysSinceEnd: number;
  /** Short context line for the row. */
  meta: string;
  /** Original trip (for forwarding to the journal seed). */
  raw: CampTrip | HikeTrip;
}

/**
 * Compute the trip end date as a YYYY-MM-DD. For Camp it's the
 * recorded `departureDate`. For Hike it's `startDate + nights` days
 * later (a 0-night day-hike ends on its start date). Returns null on
 * malformed input.
 */
export function computeTripEndDate(
  trip: CampTrip | HikeTrip,
): string | null {
  if ('departureDate' in trip) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(trip.departureDate)) return null;
    return trip.departureDate;
  }
  // HikeTrip
  if (!/^\d{4}-\d{2}-\d{2}$/.test(trip.startDate)) return null;
  const nights = Math.max(0, trip.nights);
  const start = ymdToLocalDate(trip.startDate);
  const end = new Date(
    start.getFullYear(),
    start.getMonth(),
    start.getDate() + nights,
  );
  const y = end.getFullYear();
  const m = String(end.getMonth() + 1).padStart(2, '0');
  const d = String(end.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * True iff a journal entry plausibly already covers `trip` — same
 * mode, entryDate within [trip start - 1, trip end + horizon].
 *
 * Permissive on purpose: false positives (suppressing a nudge the
 * user might've wanted) are cheaper than false negatives (nagging
 * the user about a trip they already logged).
 */
export function tripHasMatchingJournal(
  trip: CampTrip | HikeTrip,
  endDate: string,
  journalEntries: JournalEntry[],
): boolean {
  const expectedMode: 'camp' | 'hike' =
    'departureDate' in trip ? 'camp' : 'hike';
  const startYmd =
    'departureDate' in trip ? trip.arrivalDate : trip.startDate;
  const start = ymdToLocalDate(startYmd);
  const end = ymdToLocalDate(endDate);
  if (isNaN(start.getTime()) || isNaN(end.getTime())) return false;

  const lower = new Date(
    start.getFullYear(),
    start.getMonth(),
    start.getDate() - 1,
  );
  const upper = new Date(
    end.getFullYear(),
    end.getMonth(),
    end.getDate() + RECENTLY_ENDED_HORIZON_DAYS,
  );

  for (const j of journalEntries) {
    if (j.mode !== expectedMode) continue;
    const ed = ymdToLocalDate(j.entryDate);
    if (isNaN(ed.getTime())) continue;
    if (ed.getTime() >= lower.getTime() && ed.getTime() <= upper.getTime()) {
      return true;
    }
  }
  return false;
}

export interface RecentlyEndedTripsInputs extends UpcomingTripsInputs {
  journalEntries: JournalEntry[];
}

/**
 * List every trip whose end date fell in the last
 * `RECENTLY_ENDED_HORIZON_DAYS` and which has no matching journal
 * entry yet. Sorted by `daysSinceEnd` ASC (most recently ended first)
 * with name as the stable tie-break.
 */
export function listRecentlyEndedTrips(
  inputs: RecentlyEndedTripsInputs,
  now: Date = new Date(),
): RecentlyEndedTripRow[] {
  const startOfToday = localMidnightToday(now);
  const rows: RecentlyEndedTripRow[] = [];

  const consider = (trip: CampTrip | HikeTrip) => {
    const endDate = computeTripEndDate(trip);
    if (!endDate) return;
    const end = ymdToLocalDate(endDate);
    if (isNaN(end.getTime())) return;
    const daysSinceEnd = Math.round(
      (startOfToday.getTime() - end.getTime()) / 86_400_000,
    );
    if (daysSinceEnd < 0) return; // future end-date — not "ended" yet
    if (daysSinceEnd > RECENTLY_ENDED_HORIZON_DAYS) return;
    if (tripHasMatchingJournal(trip, endDate, inputs.journalEntries)) return;

    if ('departureDate' in trip) {
      const nights = Math.max(
        0,
        Math.round(
          (ymdToLocalDate(trip.departureDate).getTime() -
            ymdToLocalDate(trip.arrivalDate).getTime()) /
            86_400_000,
        ),
      );
      rows.push({
        kind: 'camp',
        id: trip.id,
        name: trip.tripName || trip.campgroundName || 'Camp trip',
        startDate: trip.arrivalDate,
        endDate,
        daysSinceEnd,
        meta: `${trip.campgroundName} · ${nights} night${nights === 1 ? '' : 's'} · party of ${trip.partySize}`,
        raw: trip,
      });
    } else {
      const dur =
        trip.nights === 0
          ? 'day hike'
          : `${trip.nights} night${trip.nights === 1 ? '' : 's'}`;
      const mi =
        trip.plannedMileage > 0 ? ` · ${trip.plannedMileage.toFixed(1)} mi` : '';
      rows.push({
        kind: 'hike',
        id: trip.id,
        name: trip.name || 'Hike',
        startDate: trip.startDate,
        endDate,
        daysSinceEnd,
        meta: `${dur}${mi} · party of ${trip.partySize}`,
        raw: trip,
      });
    }
  };

  for (const t of inputs.campTrips) consider(t);
  for (const t of inputs.hikeTrips) consider(t);

  rows.sort((a, b) => {
    if (a.daysSinceEnd !== b.daysSinceEnd) return a.daysSinceEnd - b.daysSinceEnd;
    return a.name.localeCompare(b.name);
  });

  return rows;
}

/**
 * Pick at most one trip to surface in the briefing's "TRIPS TO LOG"
 * card. Returns the most recently ended unlogged trip, or null when
 * no trip qualifies.
 */
export function pickRecentlyEndedTrip(
  inputs: RecentlyEndedTripsInputs,
  now: Date = new Date(),
): RecentlyEndedTripRow | null {
  const rows = listRecentlyEndedTrips(inputs, now);
  return rows.length > 0 ? rows[0] : null;
}

/**
 * Friendly relative-end-day projection.
 *   0  → "today"
 *   1  → "yesterday"
 *   N>1→ "N days ago"
 */
export function endedAgoLabel(daysSinceEnd: number): string {
  if (daysSinceEnd <= 0) return 'today';
  if (daysSinceEnd === 1) return 'yesterday';
  return `${daysSinceEnd} days ago`;
}
