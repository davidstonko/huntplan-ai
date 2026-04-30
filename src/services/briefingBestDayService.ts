/**
 * briefingBestDayService — pure helper that scans a 7-day solunar
 * lookahead and surfaces the day with the highest activity score
 * (Phase A.38).
 *
 * Sits one rung up from A.35's "tomorrow vs today" comparison: A.35
 * answers "is it worth setting an alarm tonight?", A.38 answers "if
 * I'm planning my weekend, when should I block?". The two cards are
 * complementary, not redundant — when they agree on the same day
 * they reinforce; when they disagree the user gets two different
 * planning horizons in the same glance.
 *
 * Pure functions only. No fetch, no `new Date()`, no theme imports.
 * The caller produces the 7-day array via repeated calls to
 * `getLocalSolunarData(lat, lng, addDaysToYmd(today, i))` and hands
 * it in — keeps the projection trivially testable.
 */

import type { SolunarData } from './solunarService';

/**
 * Number of days in the lookahead window, including today. 7 lines
 * up with a standard weekly weather forecast and matches typical
 * "this week" planning scope. Exported so tests + callers stay in
 * sync without magic-numbering the count.
 */
export const BEST_DAY_WINDOW = 7;

/**
 * Compact view-model for the BEST DAY THIS WEEK card.
 *
 *   - `daysAhead` is `0` when today wins the scan; `1` for tomorrow;
 *     `≥2` for further out. Lets the card render a friendly relative
 *     label ("TODAY", "TOMORROW", "IN 4 DAYS") without re-deriving
 *     the math.
 *   - `todayIsBest` is a screen-friendly flag that the card uses to
 *     render an alternate "TODAY IS THE BEST DAY THIS WEEK" headline
 *     instead of "BEST DAY: TUE". Avoids an awkward "BEST DAY: TODAY"
 *     phrasing that reads like a copy-paste bug.
 */
export interface BriefingBestDaySummary {
  /** YYYY-MM-DD of the winning day. */
  ymd: string;
  /** Days ahead from today (0..BEST_DAY_WINDOW-1). */
  daysAhead: number;
  /** "Mon" / "Tue" / etc. — short weekday name. */
  weekdayShort: string;
  /** 0–100 activity score. */
  ratingScore: number;
  /** "Excellent" / "Good" / "Fair" / "Poor". */
  ratingLabel: string;
  /** True when no future day in the window beats today's score. */
  todayIsBest: boolean;
}

/**
 * Short weekday names indexed by JS `Date.prototype.getDay()`
 * (0 = Sunday). Built once and reused — keeps the projection free
 * of i18n / Intl which would import locale data.
 */
const WEEKDAY_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

/**
 * Convert a YYYY-MM-DD string to its short local weekday name.
 * Parses with the explicit `(year, monthIdx, day)` constructor so
 * the day is computed in local time (NOT UTC, which would shift the
 * weekday by one for users west of UTC near midnight). Defensive
 * fallback to empty string on bad input.
 */
export function weekdayShortFromYmd(ymd: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(ymd);
  if (!m) return '';
  const dt = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  const idx = dt.getDay();
  return WEEKDAY_SHORT[idx] ?? '';
}

/**
 * Pick the highest-scoring day from a 7-day lookahead.
 *
 * Tie-break: the EARLIEST day wins. Sooner = more actionable, and
 * we don't want a tied "Saturday" to lose to a tied "Sunday" just
 * because Sunday is later in the array. As a corollary, today wins
 * any tie with a future day (it's index 0).
 *
 * The `data` array is expected to have length === BEST_DAY_WINDOW
 * with index 0 = today. The function defensively walks whatever
 * length is provided so a partial fetch can't NaN-out the card.
 *
 * @example
 *   const days = Array.from({ length: 7 }, (_, i) =>
 *     getLocalSolunarData(lat, lng, addDaysToYmd(today.ymd, i)),
 *   );
 *   const best = pickBestDay(today.ymd, days);
 *   // best.daysAhead === 3, best.weekdayShort === 'Thu'
 */
export function pickBestDay(
  todayYmd: string,
  data: SolunarData[],
): BriefingBestDaySummary {
  // Defensive — empty input returns a today-shaped result rather
  // than throwing. Score 0 / label "Poor" is the safest fallback.
  if (data.length === 0) {
    return {
      ymd: todayYmd,
      daysAhead: 0,
      weekdayShort: weekdayShortFromYmd(todayYmd),
      ratingScore: 0,
      ratingLabel: 'Poor',
      todayIsBest: true,
    };
  }

  let bestIdx = 0;
  let bestScore = data[0].rating.score;
  for (let i = 1; i < data.length; i++) {
    const s = data[i].rating.score;
    // Strict greater-than → ties go to the earlier (already-set) idx.
    if (s > bestScore) {
      bestScore = s;
      bestIdx = i;
    }
  }

  const winner = data[bestIdx];
  return {
    ymd: winner.date,
    daysAhead: bestIdx,
    weekdayShort: weekdayShortFromYmd(winner.date),
    ratingScore: winner.rating.score,
    ratingLabel: winner.rating.label,
    todayIsBest: bestIdx === 0,
  };
}

/**
 * Friendly relative-day label for the card caption: "TODAY",
 * "TOMORROW", or "IN N DAYS". Mirrors the `daysAwayLabel` helper
 * already used by the briefing's UPCOMING TRIPS section so the
 * dashboard's relative-time vocabulary stays consistent.
 *
 * For days beyond the window (defensive — daysAhead should always
 * be in 0..BEST_DAY_WINDOW-1) the function still renders correctly
 * as "IN N DAYS".
 */
export function relativeDayLabel(daysAhead: number): string {
  if (daysAhead <= 0) return 'TODAY';
  if (daysAhead === 1) return 'TOMORROW';
  return `IN ${daysAhead} DAYS`;
}
