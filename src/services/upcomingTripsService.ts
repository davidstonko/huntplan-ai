/**
 * @file upcomingTripsService.ts
 * @description Phase A.41 — pure aggregator over Camp + Hike saved
 * trips. Surfaces "next trip in N days" so the user gets a daily pull
 * to the planner work they've already started without having to open
 * each planner tab to remember what they had planned.
 *
 * The aggregator unifies two different shapes (CampTrip and HikeTrip)
 * into a single discriminated-union row keyed by `kind`. Sort is
 * strictly by `daysUntil` ascending; ties resolve by `name` to keep
 * order stable across renders.
 *
 * Past trips are excluded by default — the user already has the
 * Activity Calendar / Year-in-Review / Field Journal for revisiting
 * trips that have already happened. Pass `{ includePast: true }` to
 * surface past trips too (used by tests and possibly a future
 * "all saved trips" filter).
 *
 * What "today" means:
 * - For CampTrip we compare arrivalDate (YYYY-MM-DD).
 * - For HikeTrip we compare startDate (YYYY-MM-DD).
 * Both are local-anchored ISO date strings; comparison is lexicographic
 * after normalizing to YYYY-MM-DD, which is correct for the format.
 *
 * Deliberate non-features:
 * - No reminder/notification scheduling. Push is deferred per project
 *   notes; this service is read-only.
 * - No sort by trip type, tier, or party size. Chronological is the
 *   only sensible default for "what's next".
 *
 * @module Services
 * @version 2.3.0
 */

import type { CampTrip } from '../types/camp';
import type { HikeTrip } from '../types/hike';

/**
 * A unified row representing one saved trip across both planner types.
 * The `kind` discriminator tells the screen which planner to navigate
 * back to on tap.
 */
export interface UpcomingTripRow {
  kind: 'camp' | 'hike';
  id: string;
  /** Display name (CampTrip.tripName, HikeTrip.name). */
  name: string;
  /** YYYY-MM-DD local — start/arrival date. */
  startDate: string;
  /**
   * Days from today (local) to startDate.
   * - 0 means "today"
   * - positive means future
   * - negative means past (only present when includePast=true)
   */
  daysUntil: number;
  /** A short single-line context string for the row. */
  meta: string;
  /** The original trip object — for forwarding to a deep-link. */
  raw: CampTrip | HikeTrip;
}

export interface UpcomingTripsInputs {
  campTrips: CampTrip[];
  hikeTrips: HikeTrip[];
}

export interface UpcomingTripsOptions {
  includePast?: boolean;
}

/**
 * Convert a YYYY-MM-DD ISO date string to a local-time Date pinned to
 * midnight. Avoids the UTC midnight shift that `new Date(ymd)` would
 * apply in UTC-anchored timezones. Mirrors the parser used in
 * onThisDayService and briefingTomorrowService.
 */
export function ymdToLocalDate(ymd: string): Date {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(ymd.trim());
  if (!m) return new Date(NaN);
  const [, y, mo, d] = m;
  return new Date(Number(y), Number(mo) - 1, Number(d));
}

/**
 * Local-midnight today as a Date for diff math. Pulled out so tests
 * can pass a fixed "now".
 */
export function localMidnightToday(now: Date = new Date()): Date {
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

/**
 * Days from `now` (local midnight) to `targetYmd` (local midnight).
 * Positive = future, negative = past, 0 = today.
 *
 * Uses 86_400_000 ms-per-day, which is a sound approximation for
 * civil-date arithmetic in non-DST shifts. DST crossings within the
 * window may produce a 23h or 25h day; rounding (Math.round) absorbs
 * that drift correctly across spring-forward / fall-back.
 */
export function daysUntilLocal(now: Date, targetYmd: string): number {
  const t = ymdToLocalDate(targetYmd);
  if (isNaN(t.getTime())) return NaN;
  const startOfToday = localMidnightToday(now);
  const ms = t.getTime() - startOfToday.getTime();
  return Math.round(ms / 86_400_000);
}

/**
 * Aggregate Camp + Hike trips into a single chronological list.
 *
 * Sort:
 *   1. daysUntil ascending (earliest first)
 *   2. name ascending (stable tie-break)
 *
 * Filter:
 *   - includePast === false (default): drop rows with daysUntil < 0
 *   - includePast === true: keep all rows
 *   - rows with NaN startDate (malformed input) are always dropped
 */
export function listUpcomingTrips(
  inputs: UpcomingTripsInputs,
  now: Date = new Date(),
  opts: UpcomingTripsOptions = {},
): UpcomingTripRow[] {
  const { includePast = false } = opts;
  const rows: UpcomingTripRow[] = [];

  for (const t of inputs.campTrips) {
    const daysUntil = daysUntilLocal(now, t.arrivalDate);
    if (isNaN(daysUntil)) continue;
    if (!includePast && daysUntil < 0) continue;
    const nights = nightsBetween(t.arrivalDate, t.departureDate);
    rows.push({
      kind: 'camp',
      id: t.id,
      name: t.tripName,
      startDate: t.arrivalDate,
      daysUntil,
      meta: `${t.campgroundName} · ${nights} night${nights === 1 ? '' : 's'} · party of ${t.partySize}`,
      raw: t,
    });
  }

  for (const t of inputs.hikeTrips) {
    const daysUntil = daysUntilLocal(now, t.startDate);
    if (isNaN(daysUntil)) continue;
    if (!includePast && daysUntil < 0) continue;
    const dur = t.nights === 0 ? 'day hike' : `${t.nights} night${t.nights === 1 ? '' : 's'}`;
    const mi = t.plannedMileage > 0 ? ` · ${t.plannedMileage.toFixed(1)} mi` : '';
    rows.push({
      kind: 'hike',
      id: t.id,
      name: t.name,
      startDate: t.startDate,
      daysUntil,
      meta: `${dur}${mi} · party of ${t.partySize}`,
      raw: t,
    });
  }

  rows.sort((a, b) => {
    if (a.daysUntil !== b.daysUntil) return a.daysUntil - b.daysUntil;
    return a.name.localeCompare(b.name);
  });

  return rows;
}

/**
 * Total number of upcoming (today + future) trips. Mirrors the badge
 * shape used by other PersonalHub rows (`count: number`).
 */
export function upcomingTripsCount(
  inputs: UpcomingTripsInputs,
  now: Date = new Date(),
): number {
  return listUpcomingTrips(inputs, now).length;
}

/**
 * Project the closest upcoming trip into a one-line subtitle the
 * PersonalHub row can render under "Upcoming Trips". Returns a
 * fallback string when no trips qualify so the row is always
 * informative.
 */
export function upcomingTripsHeadline(
  inputs: UpcomingTripsInputs,
  now: Date = new Date(),
): string {
  const rows = listUpcomingTrips(inputs, now);
  if (rows.length === 0) {
    return 'No trips planned yet — open a planner to start one.';
  }
  const next = rows[0];
  return `Next: ${next.name} ${relativeDayLabel(next.daysUntil)}`;
}

/**
 * Select the single trip most worth showing as a hero countdown card
 * on PersonalHub. The selector is intentionally trivial: the soonest
 * upcoming trip (rows[0] from `listUpcomingTrips`) is the one a
 * countdown card can plausibly nudge the user about.
 *
 * Returns null when no upcoming trip exists. The card MUST render-null
 * in that case (no empty stub) per the A.39 card-renders-null pattern.
 *
 * Exposed as a separate selector — rather than asking the component to
 * call `listUpcomingTrips()[0] ?? null` — so the heuristic can evolve
 * later (e.g. prefer a trip with a missing gear-checklist link, or
 * skip trips outside a "near horizon" window) without touching the
 * component.
 */
export function pickFeaturedTrip(
  inputs: UpcomingTripsInputs,
  now: Date = new Date(),
): UpcomingTripRow | null {
  const rows = listUpcomingTrips(inputs, now);
  return rows.length > 0 ? rows[0] : null;
}

/**
 * Friendly relative-day projection.
 *   0  → "today"
 *   1  → "tomorrow"
 *   N>1→ "in N days"
 *  -1  → "yesterday"   (only used when includePast is on)
 *  N<-1→ "N days ago"
 */
export function relativeDayLabel(daysUntil: number): string {
  if (daysUntil === 0) return 'today';
  if (daysUntil === 1) return 'tomorrow';
  if (daysUntil === -1) return 'yesterday';
  if (daysUntil > 0) return `in ${daysUntil} days`;
  return `${Math.abs(daysUntil)} days ago`;
}

/**
 * Compute the integer night-count between two YYYY-MM-DD strings.
 * Used for the camp-trip subtitle. A 0-night trip (same arrival +
 * departure) reports as 0; a multi-day trip reports the count.
 * Negative spans (departure before arrival) coerce to 0 so the
 * subtitle stays sensible.
 */
export function nightsBetween(arrival: string, departure: string): number {
  const a = ymdToLocalDate(arrival);
  const d = ymdToLocalDate(departure);
  if (isNaN(a.getTime()) || isNaN(d.getTime())) return 0;
  const ms = d.getTime() - a.getTime();
  return Math.max(0, Math.round(ms / 86_400_000));
}

// ── Phase A.43 — trip ↔ gear-checklist link projections ──
//
// Three tiny projections that translate an UpcomingTripRow into the
// arguments needed to seed a fresh GearChecklist (the A.6 type, NOT
// the older Phase-5 CampGearChecklist/HikeGearChecklist). Exposed as
// named functions so the naming convention is testable in isolation —
// the screen-level "PACK" handler stays a pure orchestration of these
// + the GearChecklistContext's addChecklist.

/**
 * Map UpcomingTripRow.kind → WaypointMode for checklist seeding.
 * Trivial today (camp→camp, hike→hike) but exposed because the
 * checklist mode field is a separate type from the row's kind, and
 * locking the conversion in one place avoids subtle drift if either
 * union grows.
 */
export function tripChecklistMode(row: UpcomingTripRow): 'camp' | 'hike' {
  return row.kind;
}

/**
 * Default name for a checklist seeded from a trip. The trip name is
 * the user's chosen label, so prefer it; the suffix tells the user the
 * checklist is bound to a specific trip rather than a generic template.
 *
 * Idempotent: if the trip name already ends with "Pack List" (e.g.
 * the user manually re-named a checklist's parent trip), don't double-
 * suffix.
 */
export function tripChecklistName(row: UpcomingTripRow): string {
  const trimmed = row.name.trim();
  const base = trimmed.length > 0 ? trimmed : 'Trip';
  if (/pack list$/i.test(base)) return base;
  return `${base} Pack List`;
}

/**
 * Trip date used as the GearChecklist.tripDate field — drives the
 * "soonest trip first" sort in GearChecklistList. Camp uses arrival,
 * hike uses startDate; both are already on `row.startDate` (the
 * aggregator unified them).
 */
export function tripChecklistDate(row: UpcomingTripRow): string {
  return row.startDate;
}
