/**
 * briefingTomorrowService — pure helpers that compute tomorrow's
 * date stamp and the delta between today's and tomorrow's solunar
 * activity ratings (Phase A.35).
 *
 * Reused by the Daily Briefing's "Tomorrow Preview" card so the
 * dashboard rewards evening opens, not just morning ones — at 8 PM
 * the user can glance at "tomorrow looks better than today" and
 * decide whether to set the alarm.
 *
 * Pure functions only. No network, no storage. The `ymd` strings
 * are interpreted in local time (matches what `today.ymd` from the
 * dailyBriefingService aggregator means everywhere else in the app).
 */

import type { SolunarData } from './solunarService';

/**
 * Add `delta` calendar days to a YYYY-MM-DD string and return the
 * resulting YYYY-MM-DD. Treated as a local-date operation —
 * constructed via `new Date(year, monthIdx, day + delta)` so DST
 * jumps don't shift the date by a day. Returns the input unchanged
 * if it doesn't parse (defensive guard; the briefing aggregator
 * always emits a valid stamp).
 */
export function addDaysToYmd(ymd: string, delta: number): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(ymd);
  if (!m) return ymd;
  const y = Number(m[1]);
  const mo = Number(m[2]) - 1;
  const d = Number(m[3]);
  const dt = new Date(y, mo, d + delta);
  const yy = dt.getFullYear();
  const mm = String(dt.getMonth() + 1).padStart(2, '0');
  const dd = String(dt.getDate()).padStart(2, '0');
  return `${yy}-${mm}-${dd}`;
}

/**
 * Convenience: `tomorrow` on top of `addDaysToYmd`. Kept as its own
 * export so call sites read intentfully ("get tomorrow's ymd") and
 * so future "+2 days" / "next weekend" helpers can layer on the same
 * primitive.
 */
export function tomorrowYmd(ymd: string): string {
  return addDaysToYmd(ymd, 1);
}

/** Three-bucket comparison of two solunar scores. */
export type RatingDelta = 'better' | 'same' | 'worse';

/**
 * Compare tomorrow's score to today's. Strict numeric compare; ties
 * (within ±1 point) bucket as 'same' so a one-point jitter in the
 * local model doesn't read as a meaningful change. The 1-point
 * tolerance is hand-picked to match the local model's quantization
 * (its score formula rounds to ints, so a one-step change is the
 * smallest the model can emit and shouldn't wave the flag).
 */
export function compareRating(
  todayScore: number,
  tomorrowScore: number,
): RatingDelta {
  const diff = tomorrowScore - todayScore;
  if (diff > 1) return 'better';
  if (diff < -1) return 'worse';
  return 'same';
}

/**
 * Compact view-model for the Tomorrow Preview card. Deliberately
 * minimal — the dashboard already has today's card right above, so
 * tomorrow's row only needs the headline (label + score) and the
 * comparison verdict.
 */
export interface BriefingTomorrowSummary {
  /** YYYY-MM-DD for tomorrow (local). */
  ymd: string;
  /** "Excellent" / "Good" / "Fair" / "Poor". */
  ratingLabel: string;
  /** 0–100 score. */
  ratingScore: number;
  /** Sunrise time in HH:MM (24-hour) — caller can re-format. */
  sunrise: string;
  /** Comparison vs today's score. */
  delta: RatingDelta;
}

/**
 * Project tomorrow's SolunarData (computed by the caller via
 * `getLocalSolunarData(lat, lon, tomorrowYmd(today.ymd))`) plus
 * today's score into the view-model the card renders.
 *
 * Pure: no `new Date()`, no fetch. The caller passes the data so
 * tests don't have to mock the solunar service.
 */
export function summarizeTomorrow(
  tomorrow: SolunarData,
  todayScore: number,
): BriefingTomorrowSummary {
  return {
    ymd: tomorrow.date,
    ratingLabel: tomorrow.rating.label,
    ratingScore: tomorrow.rating.score,
    sunrise: tomorrow.sun.sunrise,
    delta: compareRating(todayScore, tomorrow.rating.score),
  };
}
