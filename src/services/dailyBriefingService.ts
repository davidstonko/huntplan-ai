/**
 * dailyBriefingService — "what should I open the app for today?" aggregator.
 *
 * Stitches together the personal-layer data into a single morning
 * dashboard:
 *   1. **Today header** — local YYYY-MM-DD + a friendly date label.
 *   2. **Memories** — On This Day items from prior years (delegates to
 *      onThisDayService).
 *   3. **Logged today** — journal entries the user wrote with
 *      entryDate === today, so they can re-open the morning's notes.
 *   4. **Upcoming trips** — gear checklists with tripDate ≥ today,
 *      sorted ASC. The "next thing on your calendar" chip.
 *   5. **Recent activity** — the most-recent personal-layer item across
 *      every mode (waypoint / track / markup / journal / checklist),
 *      so a returning user picks up where they left off.
 *   6. **Streak** — current + longest active-day streak (delegates to
 *      activityCalendarService).
 *   7. **Totals** — coarse counts for the at-a-glance row.
 *
 * Pure function; same shape as recentActivity, onThisDay, personalSearch,
 * etc. No network, no I/O, no side effects.
 *
 * V2_3_FEATURE_EXPANSION_PLAN — Phase A.17.
 */

import type { JournalEntry } from '../types/journalEntry';
import type { UserWaypoint, WaypointMode } from '../types/userWaypoint';
import type { RecordedTrack } from '../types/track';
import type { UserMarkup } from '../types/userMarkup';
import type { GearChecklist } from '../types/gearChecklist';
import { countItems } from '../types/gearChecklist';
import {
  getOnThisDayItems,
  type OnThisDayResult,
  isoToLocalYmd,
} from './onThisDayService';
import {
  summarizeRecentForMode,
  type RecentActivitySummary,
} from './recentActivityService';
import { activeStreaks } from './activityCalendarService';
import { totalPhotoCount } from './photoGalleryService';

export interface DailyBriefingInputs {
  waypoints?: UserWaypoint[];
  tracks?: RecordedTrack[];
  markups?: UserMarkup[];
  journalEntries?: JournalEntry[];
  checklists?: GearChecklist[];
}

export interface UpcomingTripItem {
  id: string;
  name: string;
  mode: WaypointMode;
  tripDate: string; // YYYY-MM-DD
  daysAway: number; // 0 = today, 1 = tomorrow…
  packedCount: number;
  totalCount: number;
}

export interface BriefingTotals {
  waypoints: number;
  tracks: number;
  markups: number;
  journal: number;
  checklists: number;
  photos: number;
}

export interface DailyBriefingTodayHeader {
  /** Local YYYY-MM-DD slice of `today`. */
  ymd: string;
  /** "MM-DD" — for the memories header. */
  monthDay: string;
  /** e.g. "Saturday". */
  weekdayLabel: string;
  /** e.g. "April 25, 2026". */
  dateLabel: string;
}

export interface DailyBriefing {
  today: DailyBriefingTodayHeader;
  memories: OnThisDayResult;
  /**
   * Journal entries the user logged for today (entryDate === today).
   * Sorted by `updatedAt` DESC so the most-recently-edited shows first.
   */
  loggedToday: JournalEntry[];
  /**
   * Gear checklists with a tripDate of today or later, sorted by
   * tripDate ASC (soonest first). Only the first 5 are returned — the
   * UI can deep-link to GearChecklistList for the long tail.
   */
  upcomingTrips: UpcomingTripItem[];
  /**
   * Single most-recent personal-layer activity across all modes, or
   * null if the user has nothing yet. Useful for "pick up where you
   * left off" copy.
   */
  recent: RecentActivitySummary | null;
  /** Current + longest active-day streak. */
  streak: { current: number; longest: number };
  /** Coarse totals for an at-a-glance row. */
  totals: BriefingTotals;
}

const WEEKDAY = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
];

const MONTH = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

/** Format a Date as a local YYYY-MM-DD slice (avoids UTC drift). */
export function localYmd(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${dd}`;
}

/** Format a Date as "MM-DD" in the local TZ. */
export function localMonthDay(d: Date): string {
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${m}-${dd}`;
}

/**
 * Compute days between two YYYY-MM-DD strings (b - a). Works in the
 * local TZ via the same midnight-anchor pattern used by
 * activityCalendarService. Returns NaN for malformed input.
 */
export function daysBetweenYmd(a: string, b: string): number {
  const pa = parseYmd(a);
  const pb = parseYmd(b);
  if (!pa || !pb) return NaN;
  const ms = pb.getTime() - pa.getTime();
  return Math.round(ms / 86400000);
}

function parseYmd(ymd: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(ymd);
  if (!m) return null;
  const y = Number(m[1]);
  const mo = Number(m[2]);
  const d = Number(m[3]);
  if (!Number.isFinite(y) || !Number.isFinite(mo) || !Number.isFinite(d)) {
    return null;
  }
  // Local midnight — matches the local-day semantics used for entryDate.
  return new Date(y, mo - 1, d, 0, 0, 0, 0);
}

/**
 * Build the daily briefing.
 *
 * @param today   Reference date — defaults to `new Date()`. Tests inject
 *                a fixed date for determinism. Never mutated.
 * @param inputs  The 5 personal-layer arrays (all optional; default `[]`).
 */
export function buildDailyBriefing(
  today: Date | undefined,
  inputs: DailyBriefingInputs,
): DailyBriefing {
  const ref = today ?? new Date();
  const ymd = localYmd(ref);
  const monthDay = localMonthDay(ref);
  const weekdayLabel = WEEKDAY[ref.getDay()];
  const dateLabel = `${MONTH[ref.getMonth()]} ${ref.getDate()}, ${ref.getFullYear()}`;

  const waypoints = inputs.waypoints ?? [];
  const tracks = inputs.tracks ?? [];
  const markups = inputs.markups ?? [];
  const journalEntries = inputs.journalEntries ?? [];
  const checklists = inputs.checklists ?? [];

  // ── Memories ──
  const memories = getOnThisDayItems(ref, {
    waypoints,
    tracks,
    markups,
    journalEntries,
    checklists,
  });

  // ── Logged today ──
  const loggedToday = journalEntries
    .filter((e) => e.entryDate === ymd)
    .slice()
    .sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : -1));

  // ── Upcoming trips ──
  const upcoming: UpcomingTripItem[] = [];
  for (const c of checklists) {
    if (!c.tripDate) continue;
    const days = daysBetweenYmd(ymd, c.tripDate);
    if (!Number.isFinite(days) || days < 0) continue;
    const counts = countItems(c.items);
    upcoming.push({
      id: c.id,
      name: c.name,
      mode: c.mode,
      tripDate: c.tripDate,
      daysAway: days,
      packedCount: counts.checked,
      totalCount: counts.total,
    });
  }
  upcoming.sort((a, b) => (a.tripDate < b.tripDate ? -1 : 1));
  const upcomingTrips = upcoming.slice(0, 5);

  // ── Recent activity (cross-mode) ──
  const modes: WaypointMode[] = ['hunt', 'fish', 'camp', 'hike'];
  let recent: RecentActivitySummary | null = null;
  for (const mode of modes) {
    const r = summarizeRecentForMode(
      mode,
      {
        waypoints,
        tracks,
        markups,
        journalEntries,
        checklists,
      },
      ref,
    );
    if (!r) continue;
    if (!recent || r.timestamp > recent.timestamp) recent = r;
  }

  // ── Streak ──
  const streak = activeStreaks(
    {
      waypoints,
      tracks,
      markups,
      journalEntries,
      checklists,
    },
    ymd,
  );

  // ── Totals ──
  const totals: BriefingTotals = {
    waypoints: waypoints.length,
    tracks: tracks.length,
    markups: markups.length,
    journal: journalEntries.length,
    checklists: checklists.length,
    photos: totalPhotoCount({ waypoints, journalEntries }),
  };

  return {
    today: { ymd, monthDay, weekdayLabel, dateLabel },
    memories,
    loggedToday,
    upcomingTrips,
    recent,
    streak,
    totals,
  };
}

/**
 * Convenience: count of "things to look at today" — the briefing's
 * notification-badge equivalent. Sums memories + upcoming-trip count
 * (capped) + 1 if the user already logged something today (reminding
 * them they can re-open).
 *
 * Useful for the TODAY HubRow on PersonalHubScreen so the user sees a
 * non-zero count when there's actually something interesting today,
 * without forcing the screen to compute the whole bucket structure.
 */
export function dailyBriefingHighlightCount(
  today: Date | undefined,
  inputs: DailyBriefingInputs,
): number {
  const b = buildDailyBriefing(today, inputs);
  return (
    b.memories.totalCount +
    b.upcomingTrips.length +
    (b.loggedToday.length > 0 ? 1 : 0)
  );
}

/**
 * Re-export for callers that want to ensure ISO timestamps cleanly map
 * to the same local-day key buildDailyBriefing uses internally. Same
 * function as onThisDayService's, kept here as a stable surface for
 * tests of this module.
 */
export const __isoToLocalYmdForBriefing = isoToLocalYmd;

/**
 * Streak insurance check (Phase A.20).
 *
 * Returns true when the user has an active streak that today's lack of
 * activity would break. The Daily Briefing UI uses this to surface a
 * "Don't break your streak" CTA instead of letting the user close the
 * app with the streak silently dying.
 *
 * Specifically: streakAtRisk = (current >= MIN_STREAK) AND
 * (loggedToday is empty) AND (recent activity from any layer this same
 * day is empty — i.e. no waypoint/track/markup/journal logged today).
 *
 * The function is parameterized so the caller can fine-tune what
 * counts as "logged today" — by default we count any of the 5 personal
 * layers landing on today's local date. This means a user who recorded
 * a track today still keeps the streak even without writing a journal
 * entry, which matches activeStreaks' behavior.
 *
 * @param today          local YMD for "today"
 * @param streakCurrent  the current streak length
 * @param inputs         the same five-layer bag buildDailyBriefing uses
 * @param minStreak      minimum streak length to bother insuring (default 2)
 */
export function streakAtRisk(
  todayYmd: string,
  streakCurrent: number,
  inputs: DailyBriefingInputs,
  minStreak: number = 2,
): boolean {
  if (streakCurrent < minStreak) return false;

  // Quick scan: any personal-layer artifact dated today keeps the streak.
  const wps = inputs.waypoints ?? [];
  const tks = inputs.tracks ?? [];
  const mks = inputs.markups ?? [];
  const jes = inputs.journalEntries ?? [];

  // Journal: explicit entryDate.
  for (const j of jes) {
    if (j.entryDate === todayYmd) return false;
  }
  // Waypoints/tracks/markups: convert createdAt/startedAt/updatedAt to local
  // YMD via the shared helper, then compare.
  for (const w of wps) {
    if (isoToLocalYmd(w.createdAt) === todayYmd) return false;
  }
  for (const t of tks) {
    if (isoToLocalYmd(t.startedAt) === todayYmd) return false;
  }
  for (const m of mks) {
    if (isoToLocalYmd(m.createdAt) === todayYmd) return false;
  }

  return true;
}
