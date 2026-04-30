/**
 * onThisDayService — Facebook-Memories-style "what did I do on this
 * calendar date in past years?" aggregator.
 *
 * Pure function over the 5 personal-layer datasets:
 *   - UserWaypoint  (anchored on `createdAt`)
 *   - RecordedTrack (anchored on `startedAt`)
 *   - UserMarkup    (anchored on `createdAt`)
 *   - JournalEntry  (anchored on `entryDate` — the trip date the user
 *                    explicitly chose, not the row-creation timestamp;
 *                    a backfilled "wrote it Monday about Saturday's hunt"
 *                    entry should surface on Saturday's calendar day).
 *   - GearChecklist (anchored on `tripDate` if set; checklists with no
 *                    trip date are skipped — they're general loadouts,
 *                    not historical events).
 *
 * "On this day" means SAME MONTH + DAY in any STRICTLY PRIOR calendar
 * year. Same-year items are excluded — those are "today's activity",
 * not "memories". A user opening the app on the very first day they
 * ever made a waypoint sees an empty memory feed, which is the correct
 * UX (you have no past).
 *
 * V2_3_FEATURE_EXPANSION_PLAN — Phase A.15.
 *
 * Why pure function:
 *   - Same shape as recentActivity, personalSearch, photoGallery,
 *     journalTag, activityCalendar, exportBundle, comparableConditions.
 *   - Test factories use the locked `{ ...base, ...overrides }` pattern.
 *   - Live-update useMemo on the screen — no async, no I/O.
 */

import type { JournalEntry } from '../types/journalEntry';
import type { UserWaypoint } from '../types/userWaypoint';
import type { RecordedTrack } from '../types/track';
import type { UserMarkup } from '../types/userMarkup';
import type { GearChecklist } from '../types/gearChecklist';

/**
 * Polymorphic item in the On-This-Day feed. The `kind` discriminator
 * tells the UI which detail screen to deep-link to.
 */
export type OnThisDayItem =
  | { kind: 'waypoint';  date: string; year: number; item: UserWaypoint }
  | { kind: 'track';     date: string; year: number; item: RecordedTrack }
  | { kind: 'markup';    date: string; year: number; item: UserMarkup }
  | { kind: 'journal';   date: string; year: number; item: JournalEntry }
  | { kind: 'checklist'; date: string; year: number; item: GearChecklist };

/**
 * One year's worth of memories, suitable for rendering as a sectioned
 * list. `yearsAgo` is precomputed so the UI can show "1 year ago" /
 * "3 years ago" without recomputing math per row.
 */
export interface OnThisDayYearBucket {
  year: number;
  yearsAgo: number;
  items: OnThisDayItem[];
}

/**
 * Top-level result. `monthDay` is the "MM-DD" string the query was
 * computed against — useful for header copy ("April 24") and as a
 * cache key.
 */
export interface OnThisDayResult {
  monthDay: string;
  todayYear: number;
  buckets: OnThisDayYearBucket[];
  totalCount: number;
}

/**
 * Inputs to the aggregator. All fields default to `[]` if omitted so a
 * caller mid-bootstrap (one context loaded, another not yet) doesn't
 * crash the screen.
 */
export interface OnThisDayInputs {
  waypoints?: UserWaypoint[];
  tracks?: RecordedTrack[];
  markups?: UserMarkup[];
  journalEntries?: JournalEntry[];
  checklists?: GearChecklist[];
}

/**
 * Format a Date as a "MM-DD" string in the *local* timezone.
 *
 * Local TZ is intentional: the user's "April 24" is the device's local
 * April 24, not UTC's. A waypoint they created at 11pm local on April
 * 23 should not surface as "April 24" in their memory feed.
 */
export function formatMonthDay(d: Date): string {
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${mm}-${dd}`;
}

/**
 * Convert an ISO 8601 timestamp to its LOCAL YYYY-MM-DD slice.
 *
 * Returns undefined for malformed input rather than throwing — the
 * caller treats undefined as "no date, skip this row" which is safer
 * than blowing up the whole memories feed because of one bad record.
 */
export function isoToLocalYmd(iso: string): string | undefined {
  if (!iso || typeof iso !== 'string') return undefined;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return undefined;
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

/**
 * Extract MM-DD from a YYYY-MM-DD string. Returns undefined if the
 * input doesn't look like a YYYY-MM-DD slice.
 */
export function ymdToMonthDay(ymd: string): string | undefined {
  if (!ymd || typeof ymd !== 'string') return undefined;
  // Cheap shape check: 4-2-2 with hyphens, all-digit segments.
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(ymd);
  if (!m) return undefined;
  return `${m[2]}-${m[3]}`;
}

/**
 * Extract YYYY (number) from a YYYY-MM-DD string. Returns undefined for
 * malformed input.
 */
export function ymdToYear(ymd: string): number | undefined {
  if (!ymd || typeof ymd !== 'string') return undefined;
  const m = /^(\d{4})-/.exec(ymd);
  if (!m) return undefined;
  const y = Number(m[1]);
  return Number.isFinite(y) ? y : undefined;
}

/**
 * Main entry point. Returns all personal-layer items whose calendar
 * date matches today's month + day in a strictly prior year, grouped
 * by year (newest first).
 *
 * @param today  Reference date — defaults to `new Date()`. Tests inject
 *               a fixed date for determinism. The function never
 *               mutates this argument.
 * @param inputs The 5 personal-layer arrays.
 *
 * Sort:
 *   - Years DESC (most recent year first — that's the most likely
 *     match to the user's working memory)
 *   - Within a year: by item.id ASC (deterministic; the screen can
 *     re-group by kind for visual clarity)
 */
export function getOnThisDayItems(
  today: Date | undefined,
  inputs: OnThisDayInputs,
): OnThisDayResult {
  const ref = today ?? new Date();
  const monthDay = formatMonthDay(ref);
  const todayYear = ref.getFullYear();

  const matches: OnThisDayItem[] = [];

  // ── Waypoints ──
  for (const w of inputs.waypoints ?? []) {
    const ymd = isoToLocalYmd(w.createdAt);
    if (!ymd) continue;
    const md = ymdToMonthDay(ymd);
    const year = ymdToYear(ymd);
    if (md !== monthDay || year === undefined || year >= todayYear) continue;
    matches.push({ kind: 'waypoint', date: ymd, year, item: w });
  }

  // ── Tracks ──
  for (const t of inputs.tracks ?? []) {
    const ymd = isoToLocalYmd(t.startedAt);
    if (!ymd) continue;
    const md = ymdToMonthDay(ymd);
    const year = ymdToYear(ymd);
    if (md !== monthDay || year === undefined || year >= todayYear) continue;
    matches.push({ kind: 'track', date: ymd, year, item: t });
  }

  // ── Markups ──
  for (const m of inputs.markups ?? []) {
    const ymd = isoToLocalYmd(m.createdAt);
    if (!ymd) continue;
    const md = ymdToMonthDay(ymd);
    const year = ymdToYear(ymd);
    if (md !== monthDay || year === undefined || year >= todayYear) continue;
    matches.push({ kind: 'markup', date: ymd, year, item: m });
  }

  // ── Journal entries (entryDate is already YYYY-MM-DD) ──
  for (const e of inputs.journalEntries ?? []) {
    const md = ymdToMonthDay(e.entryDate);
    const year = ymdToYear(e.entryDate);
    if (md !== monthDay || year === undefined || year >= todayYear) continue;
    matches.push({ kind: 'journal', date: e.entryDate, year, item: e });
  }

  // ── Gear checklists (only when tripDate is set) ──
  for (const c of inputs.checklists ?? []) {
    if (!c.tripDate) continue;
    const md = ymdToMonthDay(c.tripDate);
    const year = ymdToYear(c.tripDate);
    if (md !== monthDay || year === undefined || year >= todayYear) continue;
    matches.push({ kind: 'checklist', date: c.tripDate, year, item: c });
  }

  // Group by year.
  const byYear = new Map<number, OnThisDayItem[]>();
  for (const it of matches) {
    const arr = byYear.get(it.year) ?? [];
    arr.push(it);
    byYear.set(it.year, arr);
  }

  // Sort years DESC; within each year, sort by id ASC for determinism.
  const buckets: OnThisDayYearBucket[] = Array.from(byYear.entries())
    .sort((a, b) => b[0] - a[0])
    .map(([year, items]) => ({
      year,
      yearsAgo: todayYear - year,
      items: items.slice().sort((a, b) => a.item.id.localeCompare(b.item.id)),
    }));

  return {
    monthDay,
    todayYear,
    buckets,
    totalCount: matches.length,
  };
}

/**
 * Convenience: total count of items that share today's calendar date in
 * any prior year. Used to badge the OD HubRow on PersonalHubScreen
 * without forcing the row to compute the full bucket structure.
 */
export function onThisDayCount(
  today: Date | undefined,
  inputs: OnThisDayInputs,
): number {
  return getOnThisDayItems(today, inputs).totalCount;
}
