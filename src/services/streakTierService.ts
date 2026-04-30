/**
 * streakTierService — pure helpers that map a streak length (in
 * consecutive active days) to a named tier + visual-weight bucket.
 *
 * The Daily Briefing's streak strip shows two raw numbers (current
 * + longest) but they don't communicate progress. A 6-day streak
 * vs a 30-day streak feels very different but reads identically as
 * "a number". This module assigns names + accents so the dashboard
 * can render small badges that reward consistency.
 *
 * Tier thresholds are deliberately conservative — outdoor recreation
 * is weather-dependent and a "missed-by-a-day" should not feel like
 * a failure. The bands are wide enough that a typical-active user
 * sits at CONSISTENT for most of a season rather than oscillating
 * between tiers each week.
 *
 * Pure functions only. No network, no storage.
 */

/** Named streak tier from a count of consecutive active days. */
export type StreakTier = 'none' | 'new' | 'consistent' | 'committed' | 'legend';

/**
 * Visual weight for the badge. 'muted' = low-emphasis (none/new),
 * 'medium' = warm accent (consistent), 'strong' = mdGold (committed),
 * 'elite' = gradient/special accent (legend). Mapped to real theme
 * colors in the rendering component (locked by A.34's
 * "bucket-name-in-service / theme-color-in-component" pattern).
 */
export type StreakTierAccent = 'muted' | 'medium' | 'strong' | 'elite';

/**
 * Threshold table. Sorted ascending so callers can read off the
 * tier in O(n) without a switch statement. Each entry's `min` is
 * the inclusive lower bound for the tier; the next entry's `min`
 * is the exclusive upper bound.
 *
 * Bands chosen for outdoor-rec context:
 *   - none (0): no current streak
 *   - new (1–2): first signs of habit
 *   - consistent (3–6): a typical week of regular activity
 *   - committed (7–29): a month of nearly-every-day engagement
 *   - legend (30+): a full month of unbroken activity
 */
const TIER_TABLE: Array<{
  min: number;
  tier: StreakTier;
  accent: StreakTierAccent;
  label: string;
}> = [
  { min: 0, tier: 'none', accent: 'muted', label: 'NONE' },
  { min: 1, tier: 'new', accent: 'muted', label: 'NEW' },
  { min: 3, tier: 'consistent', accent: 'medium', label: 'CONSISTENT' },
  { min: 7, tier: 'committed', accent: 'strong', label: 'COMMITTED' },
  { min: 30, tier: 'legend', accent: 'elite', label: 'LEGEND' },
];

/**
 * Compact view-model for a streak badge.
 */
export interface StreakTierInfo {
  tier: StreakTier;
  accent: StreakTierAccent;
  /** Short caps label, e.g. "COMMITTED". */
  label: string;
  /**
   * Days remaining until the next tier. `null` when already at the
   * top tier. The dashboard can use this to render a subtle "3 days
   * to LEGEND" hint that motivates continuing the streak.
   */
  daysToNextTier: number | null;
  /** Name of the next tier, e.g. "LEGEND". `null` at top. */
  nextTierLabel: string | null;
}

/**
 * Project a streak count into the badge view-model. Defensive
 * against negative inputs — clamps to 0 so a buggy caller doesn't
 * propagate negatives into the dashboard.
 */
export function tierFromStreak(days: number): StreakTierInfo {
  const n = Math.max(0, Math.floor(days));
  // Find the highest tier whose `min` is ≤ n. TIER_TABLE is small
  // and ascending; iterate from the end.
  let idx = 0;
  for (let i = TIER_TABLE.length - 1; i >= 0; i--) {
    if (n >= TIER_TABLE[i].min) {
      idx = i;
      break;
    }
  }
  const cur = TIER_TABLE[idx];
  const next = idx + 1 < TIER_TABLE.length ? TIER_TABLE[idx + 1] : null;
  return {
    tier: cur.tier,
    accent: cur.accent,
    label: cur.label,
    daysToNextTier: next ? Math.max(1, next.min - n) : null,
    nextTierLabel: next ? next.label : null,
  };
}

/**
 * Convenience: a single boolean "should we show a badge at all?"
 * The 'none' tier (zero days) intentionally renders nothing so the
 * streak strip stays clean for new users who haven't logged anything.
 */
export function shouldShowBadge(info: StreakTierInfo): boolean {
  return info.tier !== 'none';
}
