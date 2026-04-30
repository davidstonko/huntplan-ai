/**
 * Journal Entry — Personal-Layer Types Module (V2.3 expansion, Phase A.5)
 *
 * A JournalEntry is a per-trip diary row. It complements the personal
 * activity layer (Waypoints / Tracks / Markups) by giving users a
 * narrative surface against the same `WaypointMode` axis. A user might
 * record a track from a duck blind in the morning AND write a journal
 * entry that evening saying "saw three pintails, got skunked, tide was
 * still going out at 9am."
 *
 * Distinct from:
 *   - `UserWaypoint` (point-in-space, not point-in-time)
 *   - `RecordedTrack` (line-in-time, no narrative)
 *   - `UserMarkup` (annotation geometry, not story)
 *
 * Lives entirely on-device. Cloud sync is deferred to Phase C when user
 * accounts graduate past username-only.
 *
 * Coordinate convention: optional `lat` / `lng` (entries that aren't
 * tied to a specific spot can omit it — e.g. "Drove home, planning to
 * scout the western shore tomorrow").
 *
 * Added 2026-04-24 per V2_3_FEATURE_EXPANSION_PLAN §3 / Phase A.5.
 */

import type { WaypointMode } from './userWaypoint';

/**
 * Outcome tag — coarse self-classification the user picks at write time.
 *
 * Kept intentionally short so it works as a single-row chip group on
 * the edit screen (no 10+ scrolling list). Maps cleanly onto the four
 * activity modes:
 *   - hunt: harvest / sighting / sign / skunked
 *   - fish: catch / lost / sighting / skunked
 *   - camp: setup / overnight / pack-out
 *   - hike: completed / turned-back / view
 *
 * "scout" is the cross-mode "I went out to look around but didn't
 * actively pursue" tag. "note" is the catch-all for anything that
 * doesn't fit (planning notes, gear thoughts, weather observations).
 */
export type JournalOutcome =
  | 'harvest'
  | 'catch'
  | 'sighting'
  | 'sign'
  | 'skunked'
  | 'scout'
  | 'completed'
  | 'turned-back'
  | 'note';

/**
 * Weather snapshot the user can attach to an entry. All fields optional
 * so the user isn't forced through a multi-step form to write a quick
 * note. When set, fields are stored as authored — no unit normalization
 * (the screen renders them with the unit suffix the user picked).
 *
 * @property temperatureF   Air temperature in Fahrenheit (preferred MD unit)
 * @property windMph        Sustained wind speed in MPH
 * @property windDirection  Cardinal direction string ("NW", "ESE", etc.)
 * @property conditions     Free-form sky/precip notes ("clear", "light rain")
 */
export interface JournalWeather {
  temperatureF?: number;
  windMph?: number;
  windDirection?: string;
  conditions?: string;
}

/**
 * A single field-journal entry.
 *
 * @property id            UUID-like unique identifier
 * @property createdAt     ISO 8601 row-creation timestamp
 * @property updatedAt     ISO 8601 last-mutation timestamp
 * @property entryDate     ISO YYYY-MM-DD — the date the trip happened
 *                         (NOT necessarily the same as createdAt; a user
 *                         can backfill a Saturday entry on Monday).
 * @property mode          Which activity mode this entry is filed under
 * @property title         Short headline ("Sat morning hunt — Cunningham")
 * @property body          Free-form narrative (markdown-ish, plain text)
 * @property outcome       Coarse outcome tag (see JournalOutcome)
 * @property tags          Free-form user tags (gear names, species, area)
 * @property lat           Optional latitude in decimal degrees
 * @property lng           Optional longitude in decimal degrees
 * @property locationLabel Optional human label ("Cunningham Falls SP")
 * @property weather       Optional weather snapshot
 * @property photoUris     Local file URIs (may be empty)
 */
export interface JournalEntry {
  id: string;
  createdAt: string;
  updatedAt: string;
  entryDate: string;
  mode: WaypointMode;
  title: string;
  body: string;
  outcome: JournalOutcome;
  tags: string[];
  lat?: number;
  lng?: number;
  locationLabel?: string;
  weather?: JournalWeather;
  photoUris: string[];
}

/**
 * Metadata for rendering an outcome tag chip.
 *
 * - `label` is the human display string in pickers + chips.
 * - `letterCode` is the 1–3 char abbreviation in the chip on the list row
 *   (matches the codified professionalism letter-code pattern).
 * - `color` is the chip fill color. Greens for positive outcomes,
 *   amber for partial/turned-back, gray for neutral, red for skunked.
 */
export interface JournalOutcomeMeta {
  label: string;
  letterCode: string;
  color: string;
}

export const JOURNAL_OUTCOME_META: Record<JournalOutcome, JournalOutcomeMeta> = {
  harvest:       { label: 'Harvest',     letterCode: 'HV', color: '#16a34a' },
  catch:         { label: 'Catch',       letterCode: 'CT', color: '#0277BD' },
  sighting:      { label: 'Sighting',    letterCode: 'SG', color: '#3b82f6' },
  sign:          { label: 'Sign',        letterCode: 'SN', color: '#6D4C41' },
  skunked:       { label: 'Skunked',     letterCode: 'SK', color: '#B71C1C' },
  scout:         { label: 'Scout',       letterCode: 'SC', color: '#546E7A' },
  completed:     { label: 'Completed',   letterCode: 'OK', color: '#16a34a' },
  'turned-back': { label: 'Turned Back', letterCode: 'TB', color: '#f59e0b' },
  note:          { label: 'Note',        letterCode: 'NT', color: '#616161' },
};

/**
 * Outcomes available for a given mode. Used by the outcome-picker chip
 * group in the journal edit screen so a fish entry doesn't surface a
 * "harvest" chip.
 *
 * "scout" and "note" are deliberately offered in every mode — both are
 * cross-cutting (a hiker can scout a trail; an angler can write a
 * planning note). Outcomes that don't fit a mode at all are omitted
 * rather than rendered with a no-op label.
 */
export const OUTCOMES_BY_MODE: Record<WaypointMode, JournalOutcome[]> = {
  hunt: ['harvest', 'sighting', 'sign', 'skunked', 'scout', 'note'],
  fish: ['catch', 'sighting', 'skunked', 'scout', 'note'],
  camp: ['completed', 'turned-back', 'scout', 'note'],
  hike: ['completed', 'turned-back', 'sighting', 'scout', 'note'],
};

/**
 * Returns the YYYY-MM-DD slice for a given Date. Used by callers that
 * need to default `entryDate` for a "log today's trip" flow without
 * pulling in a date library.
 *
 * Uses local-TZ getters intentionally — the user's "today" is the
 * device's local today, not UTC today. Storage rows are still
 * round-trippable because we store the exact string we computed; we
 * never re-parse and re-compute against UTC.
 */
export function todayDateLabel(d: Date = new Date()): string {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

/**
 * Resolve the chip color for a given outcome. Defensive fallback so a
 * future outcome added to the union without a META entry doesn't render
 * `undefined` as a color string.
 */
export function resolveOutcomeColor(outcome: JournalOutcome): string {
  const meta = JOURNAL_OUTCOME_META[outcome];
  return meta ? meta.color : '#616161';
}

/**
 * Resolve the letter code for a given outcome. Defensive fallback to
 * 'NT' (note) for unknown outcomes.
 */
export function resolveOutcomeLetterCode(outcome: JournalOutcome): string {
  const meta = JOURNAL_OUTCOME_META[outcome];
  return meta ? meta.letterCode : 'NT';
}
