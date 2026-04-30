/**
 * activityCalendarService.ts — bucket every personal-layer artifact by
 * UTC calendar day so we can render a GitHub-style "activity heatmap"
 * for the user's outdoor history.
 *
 * Input: a denormalized bag of waypoints + tracks + markups + journals
 * + checklists (same shape as personalSearchService / photoGalleryService).
 *
 * Output: an array of { date, total, byKind, items } day buckets,
 * sorted by date DESC. Days with zero activity are NOT emitted —
 * the rendering layer is free to fill them in for grid presentation.
 *
 * Date-extraction rules (per kind):
 *   - waypoint    → createdAt → YYYY-MM-DD (UTC)
 *   - track       → startedAt → YYYY-MM-DD (UTC)
 *   - markup      → createdAt → YYYY-MM-DD (UTC)
 *   - journal     → entryDate (already YYYY-MM-DD, no TZ shift)
 *   - checklist   → tripDate ?? createdAt → YYYY-MM-DD (UTC)
 *
 * The "tripDate beats createdAt" rule for checklists matches the
 * semantic intent: a checklist is *about* a planned future day, not
 * the day it was authored. Same logic as Apple Calendar treating an
 * event by its scheduled date, not its compose timestamp.
 *
 * All functions are synchronous + pure. Mode + kind + date-range
 * filters are optional; default behavior returns every active day
 * across every layer.
 *
 * Phase A.11 — added 2026-04-24 per V2_3_FEATURE_EXPANSION_PLAN.
 */

import type { UserWaypoint, WaypointMode } from '../types/userWaypoint';
import type { RecordedTrack } from '../types/track';
import type { UserMarkup } from '../types/userMarkup';
import type { JournalEntry } from '../types/journalEntry';
import {
  JOURNAL_OUTCOME_META,
} from '../types/journalEntry';
import type { GearChecklist } from '../types/gearChecklist';

export type CalendarItemKind =
  | 'waypoint'
  | 'track'
  | 'markup'
  | 'journal'
  | 'checklist';

export interface CalendarDayItem {
  kind: CalendarItemKind;
  /** Source row id — caller uses this to deep-link to the row's edit screen. */
  id: string;
  mode: WaypointMode;
  /** Short display label (caller renders directly). */
  label: string;
  /** Optional sub-text (kind-specific). */
  detail?: string;
}

export interface CalendarDayBucket {
  /** YYYY-MM-DD (UTC). */
  date: string;
  /** Total items across all kinds for this day. */
  total: number;
  /** Counts per kind (only kinds with > 0 are present). */
  byKind: Partial<Record<CalendarItemKind, number>>;
  /** All items for this day, sorted by kind alphabetical then label. */
  items: CalendarDayItem[];
}

export interface CalendarInputs {
  waypoints: UserWaypoint[];
  tracks: RecordedTrack[];
  markups: UserMarkup[];
  journalEntries: JournalEntry[];
  checklists: GearChecklist[];
}

export interface CalendarOptions {
  /** When set, only counts rows of this mode. */
  mode?: WaypointMode;
  /** When set, only counts rows of these kinds. */
  kinds?: CalendarItemKind[];
  /** Inclusive lower bound (YYYY-MM-DD). Buckets earlier than this are dropped. */
  fromDate?: string;
  /** Inclusive upper bound (YYYY-MM-DD). Buckets later than this are dropped. */
  toDate?: string;
}

/**
 * Convert an ISO 8601 timestamp to a YYYY-MM-DD UTC date key. Returns ''
 * for unparseable input — caller should treat '' as "skip".
 */
function isoDay(iso: string | null | undefined): string {
  if (!iso) return '';
  // Fast-path: already a YYYY-MM-DD string.
  if (/^\d{4}-\d{2}-\d{2}$/.test(iso)) return iso;
  // Fast-path: starts with YYYY-MM-DD (full ISO).
  if (iso.length >= 10 && /^\d{4}-\d{2}-\d{2}/.test(iso)) {
    return iso.slice(0, 10);
  }
  return '';
}

function maybeIncludeKind(
  kind: CalendarItemKind,
  opts: CalendarOptions,
): boolean {
  if (!opts.kinds || opts.kinds.length === 0) return true;
  return opts.kinds.includes(kind);
}

function inDateRange(date: string, opts: CalendarOptions): boolean {
  if (opts.fromDate && date < opts.fromDate) return false;
  if (opts.toDate && date > opts.toDate) return false;
  return true;
}

function pushItem(
  buckets: Map<string, CalendarDayBucket>,
  date: string,
  item: CalendarDayItem,
): void {
  let b = buckets.get(date);
  if (!b) {
    b = { date, total: 0, byKind: {}, items: [] };
    buckets.set(date, b);
  }
  b.total += 1;
  b.byKind[item.kind] = (b.byKind[item.kind] ?? 0) + 1;
  b.items.push(item);
}

/**
 * Build the activity heatmap bucket array.
 */
export function buildActivityCalendar(
  inputs: CalendarInputs,
  opts: CalendarOptions = {},
): CalendarDayBucket[] {
  const buckets = new Map<string, CalendarDayBucket>();
  const modeFilter = opts.mode;

  if (maybeIncludeKind('waypoint', opts)) {
    for (const w of inputs.waypoints) {
      if (modeFilter && w.mode !== modeFilter) continue;
      const date = isoDay(w.createdAt);
      if (!date || !inDateRange(date, opts)) continue;
      pushItem(buckets, date, {
        kind: 'waypoint',
        id: w.id,
        mode: w.mode,
        label: w.title || 'Waypoint',
        detail: w.category || undefined,
      });
    }
  }

  if (maybeIncludeKind('track', opts)) {
    for (const t of inputs.tracks) {
      if (modeFilter && t.mode !== modeFilter) continue;
      const date = isoDay(t.startedAt);
      if (!date || !inDateRange(date, opts)) continue;
      const km = t.distanceM > 0 ? `${(t.distanceM / 1000).toFixed(2)} km` : undefined;
      pushItem(buckets, date, {
        kind: 'track',
        id: t.id,
        mode: t.mode,
        label: t.name || 'Track',
        detail: km,
      });
    }
  }

  if (maybeIncludeKind('markup', opts)) {
    for (const m of inputs.markups) {
      if (modeFilter && m.mode !== modeFilter) continue;
      const date = isoDay(m.createdAt);
      if (!date || !inDateRange(date, opts)) continue;
      pushItem(buckets, date, {
        kind: 'markup',
        id: m.id,
        mode: m.mode,
        label: m.title || 'Markup',
        detail: m.shapeType,
      });
    }
  }

  if (maybeIncludeKind('journal', opts)) {
    for (const j of inputs.journalEntries) {
      if (modeFilter && j.mode !== modeFilter) continue;
      const date = isoDay(j.entryDate);
      if (!date || !inDateRange(date, opts)) continue;
      const meta = JOURNAL_OUTCOME_META[j.outcome];
      pushItem(buckets, date, {
        kind: 'journal',
        id: j.id,
        mode: j.mode,
        label: j.title || 'Untitled entry',
        detail: meta ? meta.label : j.outcome,
      });
    }
  }

  if (maybeIncludeKind('checklist', opts)) {
    for (const c of inputs.checklists) {
      if (modeFilter && c.mode !== modeFilter) continue;
      const date = isoDay(c.tripDate ?? c.createdAt);
      if (!date || !inDateRange(date, opts)) continue;
      pushItem(buckets, date, {
        kind: 'checklist',
        id: c.id,
        mode: c.mode,
        label: c.name || 'Gear list',
        detail: c.tripDate ? `trip ${c.tripDate}` : 'authored',
      });
    }
  }

  // Sort items inside each bucket: kind ASC then label ASC for stable
  // presentation regardless of input ordering.
  for (const b of buckets.values()) {
    b.items.sort((a, z) => {
      if (a.kind !== z.kind) return a.kind < z.kind ? -1 : 1;
      return a.label < z.label ? -1 : a.label > z.label ? 1 : 0;
    });
  }

  // Return bucket array sorted date DESC (newest first).
  return Array.from(buckets.values()).sort((a, b) =>
    a.date < b.date ? 1 : a.date > b.date ? -1 : 0,
  );
}

/**
 * Convenience accessor: how many distinct days carry at least one
 * personal-layer artifact (within the given filter).
 */
export function activeDayCount(
  inputs: CalendarInputs,
  opts: CalendarOptions = {},
): number {
  return buildActivityCalendar(inputs, opts).length;
}

/**
 * Compute current + longest active-day streak. A "streak" = consecutive
 * UTC days each carrying at least one item. `current` is the streak
 * ending on `referenceDate` (default today UTC); `longest` walks the
 * whole history.
 *
 * Returns 0/0 when there's no activity. Active days that are *future*
 * relative to the reference date are ignored for `current` (so a
 * planned-checklist for next Saturday doesn't inflate today's streak)
 * but still contribute to `longest`.
 */
export function activeStreaks(
  inputs: CalendarInputs,
  referenceDate?: string,
  opts: CalendarOptions = {},
): { current: number; longest: number } {
  const buckets = buildActivityCalendar(inputs, opts);
  if (buckets.length === 0) return { current: 0, longest: 0 };

  // ASC for streak walk.
  const days = buckets.map((b) => b.date).sort();

  const todayKey = referenceDate ?? isoDay(new Date().toISOString());

  let longest = 1;
  let run = 1;
  for (let i = 1; i < days.length; i++) {
    if (isNextDay(days[i - 1], days[i])) {
      run += 1;
      if (run > longest) longest = run;
    } else {
      run = 1;
    }
  }

  // Current streak: walk backwards from today (or yesterday if today
  // is empty) through consecutive present days.
  const present = new Set(days);
  let current = 0;
  let cursor = todayKey;
  if (!present.has(cursor)) {
    cursor = prevDay(cursor);
    // Allow a one-day grace so "active yesterday" still reads as a
    // live streak — matches GitHub-style streak semantics.
    if (!present.has(cursor)) {
      return { current: 0, longest };
    }
  }
  while (present.has(cursor)) {
    current += 1;
    cursor = prevDay(cursor);
  }

  return { current, longest };
}

/**
 * True if `b` is exactly one calendar day after `a` (both YYYY-MM-DD UTC).
 */
function isNextDay(a: string, b: string): boolean {
  return prevDay(b) === a;
}

/**
 * Return YYYY-MM-DD for the day before `date` (UTC).
 */
function prevDay(date: string): string {
  const t = new Date(`${date}T00:00:00.000Z`).getTime();
  if (Number.isNaN(t)) return '';
  return new Date(t - 86_400_000).toISOString().slice(0, 10);
}
