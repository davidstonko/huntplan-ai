/**
 * briefingActivityRatingService — pure projection helpers that turn a
 * `SolunarData` snapshot into the compact view-model the Daily
 * Briefing's "Today's Activity" card renders (Phase A.34).
 *
 * `getLocalSolunarData` is already used by the Sun & Moon panel
 * (A.29). Reusing the same synchronous local model means this card
 * also renders without a fetch — keeping the briefing's first-paint
 * fast and offline-capable. The card surfaces the rating label/score
 * the local model emits + the first useful "best window" so the user
 * gets a single-glance "is today worth getting up for?" answer.
 *
 * Pure functions only. No network, no storage, no Date.now() (the
 * SolunarData snapshot is the only input).
 */

import type { SolunarData, BestTimeWindow } from './solunarService';
import { formatTime12 } from '../components/SunMoonCard';

/**
 * Compact view-model for the Daily Briefing activity-rating card.
 * Each field is optional because best_times can in principle be
 * empty (e.g. an exotic future polar latitude); the local model
 * always emits two windows for Maryland but the projection stays
 * defensive.
 */
export interface BriefingActivityRatingSummary {
  /** "Excellent" / "Good" / "Fair" / "Poor". */
  ratingLabel: string;
  /** 0–100 integer activity score from the solunar model. */
  ratingScore: number;
  /**
   * Visual weight for the rating chip. 'strong' = mdGold (Excellent /
   * Good), 'medium' = amber (Fair), 'muted' = textMuted (Poor).
   * Computed once here so the component doesn't switch on the label.
   */
  ratingAccent: 'strong' | 'medium' | 'muted';
  /** Window label e.g. "Dawn Feed", or null when no best window. */
  bestWindowLabel: string | null;
  /** Formatted "h:MM AM/PM – h:MM AM/PM" range, or null. */
  bestWindowTimeRange: string | null;
  /** "Peak feeding at first light" reason copy, or null. */
  bestWindowReason: string | null;
}

/**
 * Map the rating label onto a visual-weight bucket the card can use
 * to style its accent chip. Excellent + Good both deserve mdGold;
 * Fair gets amber; Poor gets the muted treatment so the dashboard
 * doesn't shout about a quiet day.
 */
export function ratingAccentOf(
  label: string,
): 'strong' | 'medium' | 'muted' {
  if (label === 'Excellent' || label === 'Good') return 'strong';
  if (label === 'Fair') return 'medium';
  return 'muted';
}

/**
 * Pick the most-useful "best window" to surface on a one-row card.
 * Preference: first window with priority === 'high'; else the first
 * window in the list; else null when the array is empty.
 *
 * Stable order: never re-sorts. Keeps the local solunar model's
 * intended display order (dawn before dusk) so a morning open of
 * the briefing always shows the upcoming dawn window first.
 */
export function pickBestWindow(
  windows: BestTimeWindow[],
): BestTimeWindow | null {
  if (windows.length === 0) return null;
  const high = windows.find((w) => w.priority === 'high');
  return high ?? windows[0];
}

/**
 * Format a "HH:MM"–"HH:MM" pair as "h:MM AM/PM – h:MM AM/PM" using
 * the shared `formatTime12` helper from SunMoonCard. Returns null if
 * either side is missing or unparseable so the cell can collapse to
 * an em-dash rather than render half a range.
 */
export function formatBestWindowRange(
  start: string | undefined,
  end: string | undefined,
): string | null {
  if (!start || !end) return null;
  const a = formatTime12(start);
  const b = formatTime12(end);
  // formatTime12 returns its input unchanged on parse failure; that
  // means a non-HH:MM input would surface as the raw string. We treat
  // any unconverted side as a parse failure and bail to null so the
  // user sees an em-dash rather than misleading raw-format text.
  if (a === start || b === end) return null;
  return `${a} – ${b}`;
}

/**
 * Project a SolunarData snapshot into the briefing view-model.
 * Pure, deterministic, no Date.now(). All fields except the rating
 * itself can come back null when the underlying solunar model has
 * no usable best-times entry.
 */
export function summarizeActivityRating(
  data: SolunarData,
): BriefingActivityRatingSummary {
  const ratingLabel = data.rating.label;
  const ratingScore = data.rating.score;
  const ratingAccent = ratingAccentOf(ratingLabel);
  const window = pickBestWindow(data.best_times);
  return {
    ratingLabel,
    ratingScore,
    ratingAccent,
    bestWindowLabel: window?.window ?? null,
    bestWindowTimeRange: window
      ? formatBestWindowRange(window.start, window.end)
      : null,
    bestWindowReason: window?.reason ?? null,
  };
}
