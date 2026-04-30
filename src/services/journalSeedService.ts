/**
 * journalSeedService — pure builders that turn other personal-layer
 * artifacts (tracks, waypoints, markups) into seed values for a new
 * JournalEntry.
 *
 * Used by Track→Journal handoff (Phase A.19): when the user says "log a
 * journal entry from this track", we pre-fill the JournalEdit form with
 * mode/date/title/body/locationLabel/tags so they're not staring at a
 * blank screen. Pure functions so they're trivially testable and don't
 * touch storage / context / navigation.
 *
 * The output shape is intentionally a *partial* JournalEntry — only the
 * fields the user is likely to want auto-filled. The screen reads
 * `seed?.field ?? ''` for each input. Anything we don't seed (id,
 * createdAt, updatedAt, photoUris, weather, lat/lng) gets the screen's
 * normal defaults.
 *
 * V2_3_FEATURE_EXPANSION_PLAN — Phase A.19.
 */

import type { RecordedTrack } from '../types/track';
import { formatDistance, formatDuration } from '../types/track';
import type {
  JournalEntry,
  JournalOutcome,
} from '../types/journalEntry';
import type { WaypointMode } from '../types/userWaypoint';
import type { CampTrip } from '../types/camp';
import type { HikeTrip } from '../types/hike';

/**
 * Subset of JournalEntry fields the seed service can populate. Excludes
 * id/createdAt/updatedAt (assigned at save time) and free-form fields the
 * user owns (photos, weather, geo). The screen merges this into its form
 * state on first mount.
 */
export interface JournalSeed {
  mode: WaypointMode;
  entryDate: string;
  title: string;
  body: string;
  outcome: JournalOutcome;
  tags: string[];
  locationLabel?: string;
}

/**
 * Format YYYY-MM-DD in local time. Avoids `toISOString().slice(0,10)`,
 * which would shift to UTC and could backdate evening recordings.
 */
function localYmd(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${dd}`;
}

/**
 * Local-time hour (0–23) used to pick a "morning / afternoon / evening"
 * descriptor for the auto-title.
 */
function timeOfDayLabel(d: Date): string {
  const h = d.getHours();
  if (h < 5) return 'late-night';
  if (h < 11) return 'morning';
  if (h < 14) return 'midday';
  if (h < 17) return 'afternoon';
  if (h < 20) return 'evening';
  return 'night';
}

/**
 * Per-mode default outcome for an auto-seeded entry. We pick the most
 * neutral non-success choice so a user who just recorded a walk doesn't
 * get pre-tagged as "harvest" or "catch" they didn't actually have.
 *
 *   - hunt → 'scout'      (track without a kill is a scouting walk)
 *   - fish → 'scout'      (same logic)
 *   - camp → 'completed'  (completed a leg of a trip)
 *   - hike → 'completed'  (the hike itself is the outcome)
 */
function defaultOutcomeForMode(mode: WaypointMode): JournalOutcome {
  switch (mode) {
    case 'hunt':
    case 'fish':
      return 'scout';
    case 'camp':
    case 'hike':
      return 'completed';
  }
}

/**
 * Build a seed JournalEntry from a saved RecordedTrack. The seed:
 *   - inherits the track's mode
 *   - dates itself to the track's startedAt (LOCAL date — not UTC)
 *   - titles itself "<TimeOfDay> <mode> — <track name>" if the track has a
 *     non-default name, otherwise just "<TimeOfDay> <mode>"
 *   - bodies itself with a one-line summary: "<distance> in <duration>.
 *     <fix-count> fixes."
 *   - tags itself with ['track'] so users can later filter "where are all
 *     my entries linked to a track?"
 */
export function seedFromTrack(track: RecordedTrack): JournalSeed {
  const start = track.startedAt ? new Date(track.startedAt) : new Date();
  const date = isFinite(start.getTime()) ? start : new Date();

  const tod = timeOfDayLabel(date);
  const modeLabel = track.mode.charAt(0).toUpperCase() + track.mode.slice(1);
  const todCap = tod.charAt(0).toUpperCase() + tod.slice(1);

  // Title: "Morning Hike — Cunningham Loop" or just "Morning Hike" if the
  // user kept the recorder's auto-name.
  const isAutoName = !track.name || /^track\b/i.test(track.name.trim());
  const title = isAutoName
    ? `${todCap} ${modeLabel}`
    : `${todCap} ${modeLabel} — ${track.name}`;

  const dist = formatDistance(track.distanceM);
  const dur = formatDuration(track.durationSec);
  const ascent =
    track.elevationGainM > 0
      ? ` Ascent ${track.elevationGainM.toFixed(0)} m.`
      : '';
  const fixes =
    track.samples.length > 0 ? ` ${track.samples.length} fixes.` : '';
  const body = `${dist} in ${dur}.${ascent}${fixes}`;

  return {
    mode: track.mode,
    entryDate: localYmd(date),
    title,
    body,
    outcome: defaultOutcomeForMode(track.mode),
    tags: ['track'],
  };
}

/**
 * Build a seed from a saved CampTrip (Phase A.27 trip→journal handoff).
 *
 *   - mode: 'camp' (always — the planner is camp-only)
 *   - entryDate: arrival date if it's today-or-past, else today (we don't
 *     pre-date a journal entry for a future trip; user is presumably
 *     logging on the day-of or after).
 *   - title: tripName falls through (e.g. "Memorial Day at Assateague").
 *   - body: one-line summary "<arrival> → <departure> · party of N · <type>"
 *     plus the user's pre-trip notes appended on a new line if present —
 *     so any planning thoughts carry into the post-trip writeup.
 *   - outcome: 'completed' (camp trip default — user is logging because
 *     they did the trip).
 *   - tags: ['trip', 'camp', tripType] — gives the Tag Explorer a
 *     pre-populated handle for "all my family-camp trips".
 *   - locationLabel: campgroundName.
 */
export function seedFromCampTrip(
  trip: CampTrip,
  now: Date = new Date(),
): JournalSeed {
  const arrival = parseLocalYmd(trip.arrivalDate);
  const today = localYmd(now);
  const arrivalIsFuture = arrival ? arrival > now : false;
  const entryDate = arrivalIsFuture ? today : trip.arrivalDate || today;

  const partyLabel = `party of ${Math.max(1, trip.partySize)}`;
  const typeLabel = humanCampTripType(trip.tripType);
  const summary = `${trip.arrivalDate} \u2192 ${trip.departureDate} \u00b7 ${partyLabel} \u00b7 ${typeLabel}`;
  const body = trip.notes && trip.notes.trim().length > 0
    ? `${summary}\n\n${trip.notes.trim()}`
    : summary;

  const tags = uniqueTags(['trip', 'camp', trip.tripType.replace('_', '-')]);

  return {
    mode: 'camp',
    entryDate,
    title: trip.tripName || trip.campgroundName || 'Camp trip',
    body,
    outcome: 'completed',
    tags,
    locationLabel: trip.campgroundName,
  };
}

/**
 * Build a seed from a saved HikeTrip (Phase A.27 trip→journal handoff).
 *
 *   - mode: 'hike' (always).
 *   - entryDate: startDate if today-or-past, else today.
 *   - title: hike name (e.g. "Catoctin AT Section").
 *   - body: "<mileage> mi over <nights+1> day(s) · party of N · tier <tier>"
 *     plus user notes appended.
 *   - outcome: 'completed' (default — same logic as camp trip).
 *   - tags: ['trip', 'hike', tier], plus 'overnight' if nights >= 1.
 */
export function seedFromHikeTrip(
  trip: HikeTrip,
  now: Date = new Date(),
): JournalSeed {
  const start = parseLocalYmd(trip.startDate);
  const today = localYmd(now);
  const startIsFuture = start ? start > now : false;
  const entryDate = startIsFuture ? today : trip.startDate || today;

  const days = Math.max(1, trip.nights + 1);
  const dayLabel = days === 1 ? '1 day' : `${days} days`;
  const milesLabel = trip.plannedMileage > 0
    ? `${trip.plannedMileage.toFixed(1)} mi`
    : 'unspecified distance';
  const partyLabel = `party of ${Math.max(1, trip.partySize)}`;
  const tierLabel = `tier ${trip.tier}`;
  const summary = `${milesLabel} over ${dayLabel} \u00b7 ${partyLabel} \u00b7 ${tierLabel}`;
  const body = trip.notes && trip.notes.trim().length > 0
    ? `${summary}\n\n${trip.notes.trim()}`
    : summary;

  const tagSeed = ['trip', 'hike', trip.tier];
  if (trip.nights >= 1) tagSeed.push('overnight');
  const tags = uniqueTags(tagSeed);

  return {
    mode: 'hike',
    entryDate,
    title: trip.name || 'Hike',
    body,
    outcome: 'completed',
    tags,
  };
}

/** Camp trip-type → human label. Centralized so screens can share. */
function humanCampTripType(t: CampTrip['tripType']): string {
  switch (t) {
    case 'car_camp':
      return 'car camp';
    case 'backcountry':
      return 'backcountry';
    case 'group':
      return 'group camp';
    case 'family':
      return 'family camp';
    case 'solo':
      return 'solo camp';
  }
}

/** Parse a local YYYY-MM-DD into a Date at local midnight, or null. */
function parseLocalYmd(s: string): Date | null {
  if (typeof s !== 'string') return null;
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
  if (!m) return null;
  const y = parseInt(m[1], 10);
  const mo = parseInt(m[2], 10) - 1;
  const d = parseInt(m[3], 10);
  const out = new Date(y, mo, d);
  return isFinite(out.getTime()) ? out : null;
}

/** Case-insensitive dedupe of trimmed non-empty tags. */
function uniqueTags(tags: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const t of tags) {
    const trimmed = (t ?? '').trim();
    if (!trimmed) continue;
    const key = trimmed.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(trimmed);
  }
  return out;
}

/**
 * Empty seed — used to assert the seed shape and as a default for tests
 * where the caller wants to verify "no seed" behavior. NOT exposed on
 * the route (the screen treats `undefined` seed as "no seed").
 */
export function emptySeed(mode: WaypointMode): JournalSeed {
  return {
    mode,
    entryDate: localYmd(new Date()),
    title: '',
    body: '',
    outcome: defaultOutcomeForMode(mode),
    tags: [],
  };
}

/**
 * Type guard — light validation that a value coming through navigation
 * params is a usable JournalSeed (not just `any`). Defensive because
 * route params survive serialization through React Navigation and a
 * malformed seed would crash the form.
 */
export function isJournalSeed(v: unknown): v is JournalSeed {
  if (!v || typeof v !== 'object') return false;
  const r = v as Partial<JournalSeed>;
  if (typeof r.mode !== 'string') return false;
  if (typeof r.entryDate !== 'string') return false;
  if (typeof r.title !== 'string') return false;
  if (typeof r.body !== 'string') return false;
  if (typeof r.outcome !== 'string') return false;
  if (!Array.isArray(r.tags)) return false;
  return true;
}

// Re-export the type for screens that consume the seed off route params.
export type { JournalSeed as Seed };
