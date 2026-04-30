/**
 * @file tripDuplicationService.ts
 * @description Phase A.40 — pure cloning helpers for camp & hike trips.
 *
 * Lets users one-tap re-create a successful past trip with a new id, a
 * "Copy of …" name, and a fresh date anchored on today. The original
 * row is left untouched. The new trip carries forward every plan field
 * (campground/trail, party size, gear tier, planned shelters, notes,
 * etc.) so the user only has to nudge the date/name and re-save.
 *
 * Why a service (not inline in each planner screen):
 *   - Two screens need the same clone shape.
 *   - Identity rules (new id, today's date, copy-name) are easy to
 *     accidentally diverge between Camp and Hike — keeping them in one
 *     pure file means audit-by-grep + lock-by-test.
 *   - Pure helpers are jest-trivial; the planner screens just wire the
 *     button + AsyncStorage round-trip.
 *
 * Convention reuses:
 *   - "Copy of <name>" prefix (only added once even if duplicating a
 *     duplicate — see deDupeCopyPrefix). Familiar from Finder, Notes.app,
 *     Google Drive copy semantics.
 *   - `id: trip-<Date.now()>` matches the existing planner save shape so
 *     duplicates sort to the bottom of the saved list (newest last) the
 *     same way fresh saves do.
 *   - `createdAt`/`updatedAt` reset to the duplication moment so the
 *     duplicate is correctly recent.
 *
 * What is NOT carried over:
 *   - `groupCampId` (camp): a cloned trip should NOT auto-link to the
 *     same group camp; the user can re-link from the saved trip if
 *     they want both trips coordinated. Carried-over group links would
 *     silently broadcast a new trip to the original group.
 *   - `gearChecklistId`: the gear checklist (A.6) is per-trip; cloning
 *     the trip shouldn't double-claim the original's checklist. New
 *     clone starts checklist-less; user can spawn a new one.
 *
 * What IS carried over: everything else — campground/trail anchors,
 * dates (preserved as-is for camp; reset to today for hike since hike
 * trips only carry a single startDate), party size, trip type,
 * planned shelters, planned mileage, gear tier, notes.
 *
 * @module Services
 * @version 2.3.0
 */

import type { CampTrip } from '../types/camp';
import type { HikeTrip } from '../types/hike';

/**
 * Idempotently prefix a trip name with "Copy of ". Avoids
 * "Copy of Copy of Copy of …" walls when a user repeatedly duplicates
 * the same trip — the prefix is added once and only once per chain.
 *
 * Visible cases:
 *   - "Pen Mar to Rocky Run"     → "Copy of Pen Mar to Rocky Run"
 *   - "Copy of Pen Mar"          → "Copy of Pen Mar"   (unchanged)
 *   - "copy of pen mar"          → "Copy of copy of pen mar"
 *     (case-sensitive — only the canonical prefix is dedup'd)
 */
export function deDupeCopyPrefix(name: string): string {
  const trimmed = name.trim();
  if (trimmed.length === 0) return 'Copy of Untitled';
  if (trimmed.startsWith('Copy of ')) return trimmed;
  return `Copy of ${trimmed}`;
}

/**
 * Build a fresh `trip-<ms>` id matching the existing planner save shape.
 * Exported so tests can predict the value with a fixed `nowMs` clock.
 */
export function newTripId(nowMs: number = Date.now()): string {
  return `trip-${nowMs}`;
}

/**
 * Today's date in local YYYY-MM-DD form (matches the Camp/Hike planner
 * default date inputs).
 */
export function todayYmdLocal(now: Date = new Date()): string {
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * Clone a CampTrip into a new trip ready to save.
 *
 * Identity:
 *   - id: regenerated
 *   - tripName: deDupeCopyPrefix(original)
 *   - createdAt/updatedAt: now (ISO)
 *
 * Carried over:
 *   - campgroundId, campgroundName, arrivalDate, departureDate,
 *     partySize, tripType, notes
 *
 * Reset:
 *   - gearChecklistId: null
 *   - groupCampId: null   (do NOT auto-broadcast to the prior group)
 */
export function duplicateCampTrip(
  trip: CampTrip,
  now: Date = new Date(),
): CampTrip {
  const iso = now.toISOString();
  return {
    id: newTripId(now.getTime()),
    campgroundId: trip.campgroundId,
    campgroundName: trip.campgroundName,
    tripName: deDupeCopyPrefix(trip.tripName),
    arrivalDate: trip.arrivalDate,
    departureDate: trip.departureDate,
    partySize: trip.partySize,
    tripType: trip.tripType,
    notes: trip.notes,
    gearChecklistId: null,
    groupCampId: null,
    createdAt: iso,
    updatedAt: iso,
  };
}

/**
 * Clone a HikeTrip into a new trip ready to save.
 *
 * Identity:
 *   - id: regenerated
 *   - name: deDupeCopyPrefix(original)
 *   - createdAt/updatedAt: now (ISO)
 *   - startDate: reset to today (HikeTrip only has one date and the
 *     vast majority of users duplicating a hike will be planning a
 *     new outing rather than re-creating the same date)
 *
 * Carried over:
 *   - trailId, startTrailheadId, endTrailheadId, nights, partySize,
 *     tier, plannedShelterIds (array copy), plannedMileage, notes
 *
 * Reset:
 *   - gearChecklistId: null
 */
export function duplicateHikeTrip(
  trip: HikeTrip,
  now: Date = new Date(),
): HikeTrip {
  const iso = now.toISOString();
  return {
    id: newTripId(now.getTime()),
    name: deDupeCopyPrefix(trip.name),
    trailId: trip.trailId,
    startTrailheadId: trip.startTrailheadId,
    endTrailheadId: trip.endTrailheadId,
    startDate: todayYmdLocal(now),
    nights: trip.nights,
    partySize: trip.partySize,
    tier: trip.tier,
    plannedShelterIds: [...trip.plannedShelterIds],
    plannedMileage: trip.plannedMileage,
    gearChecklistId: null,
    notes: trip.notes,
    createdAt: iso,
    updatedAt: iso,
  };
}
