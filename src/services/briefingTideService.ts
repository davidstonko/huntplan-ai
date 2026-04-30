/**
 * briefingTideService — pure projection helpers that turn a
 * `MarineConditions` snapshot into the compact view-model the Daily
 * Briefing's tide card renders.
 *
 * weatherService.getMarineConditions already does the network +
 * aggregation. The card needs less than that — just the next tide
 * type/time, current stage, and a "as of" timestamp the user can
 * sanity-check.
 *
 * Coastal-only by design: many MarineConditions responses for inland
 * MD points come back with `tideStage === 'unknown'` and null next-tide
 * fields. The `hasUsefulTideData` predicate exists so the card can
 * silently skip rendering for inland users instead of showing an
 * "unknown" line that's noise on the dashboard.
 *
 * Pure functions only. No network, no storage.
 */

import type { MarineConditions } from './weatherService';

/**
 * Compact view-model for the briefing tide card. Each field is
 * optional because the underlying service can return nulls for
 * inland points or when the nearest CO-OPS station is unreachable.
 */
export interface BriefingTideSummary {
  /** "Incoming", "Outgoing", "High", "Low", or null for unknown. */
  stageLabel: string | null;
  /** "HIGH" or "LOW" — what the next tide will be. */
  nextTideTypeLabel: string | null;
  /** "h:MM AM/PM" formatted time of next tide, or null. */
  nextTideTimeLabel: string | null;
  /** "in 2h 15m" relative time until next tide, or null. */
  nextTideRelativeLabel: string | null;
}

/**
 * Predicate: is there enough useful tide data to bother rendering the
 * card? An "unknown" stage with no next-tide info is the dashboard's
 * "you're inland" signal — return false so the card hides.
 */
export function hasUsefulTideData(m: MarineConditions): boolean {
  if (m.tideStage && m.tideStage !== 'unknown') return true;
  if (m.nextTideTime && m.nextTideType) return true;
  return false;
}

/**
 * Capitalize the first letter of a label, handling null safely.
 * "incoming" → "Incoming", "high" → "High".
 */
export function titleCase(s: string | null | undefined): string | null {
  if (!s) return null;
  if (s.length === 0) return null;
  return s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();
}

/**
 * Format an ISO datetime string as "h:MM AM/PM" in local time. Returns
 * null on parse failure.
 */
export function formatTideTime(iso: string | null | undefined): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (!isFinite(d.getTime())) return null;
  let h = d.getHours();
  const period = h >= 12 ? 'PM' : 'AM';
  if (h === 0) h = 12;
  else if (h > 12) h -= 12;
  const m = String(d.getMinutes()).padStart(2, '0');
  return `${h}:${m} ${period}`;
}

/**
 * Format a relative-time delta as "in Xh YYm" (or "in YYm" when under
 * an hour, or "now" when negative-or-zero). Returns null when either
 * input is unparseable.
 *
 * `now` is injectable so tests don't depend on wall clock.
 */
export function formatTideRelative(
  iso: string | null | undefined,
  now: Date = new Date(),
): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (!isFinite(d.getTime())) return null;
  const deltaMs = d.getTime() - now.getTime();
  if (deltaMs <= 0) return 'now';
  const totalMin = Math.floor(deltaMs / 60000);
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  if (h === 0) return `in ${m}m`;
  return `in ${h}h ${String(m).padStart(2, '0')}m`;
}

/**
 * Project a MarineConditions snapshot into the briefing view-model.
 * Pure, deterministic, no network. `now` is injectable for tests.
 */
export function summarizeTide(
  m: MarineConditions,
  now: Date = new Date(),
): BriefingTideSummary {
  const stageLabel =
    m.tideStage && m.tideStage !== 'unknown' ? titleCase(m.tideStage) : null;
  const nextTideTypeLabel = m.nextTideType
    ? m.nextTideType.toUpperCase()
    : null;
  const nextTideTimeLabel = formatTideTime(m.nextTideTime);
  const nextTideRelativeLabel = formatTideRelative(m.nextTideTime, now);
  return {
    stageLabel,
    nextTideTypeLabel,
    nextTideTimeLabel,
    nextTideRelativeLabel,
  };
}
