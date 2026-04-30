/**
 * comparableConditionsService.ts — pure-function similarity scorer that
 * matches a "today" weather snapshot against every JournalEntry the user
 * has authored, ranking past trips by how close their conditions were.
 *
 * The fundamental hunter / angler workflow is "what happened the last
 * time it looked like this outside?" A field journal makes that
 * answerable in principle, but only if the search is fast — hand-
 * scrolling 200 entries and eyeballing weather chips isn't viable
 * mid-coffee. This service collapses the question into a single ranked
 * list with explainable per-component scores.
 *
 * Scoring axes (each contributes a normalized 0..1 score, then weighted):
 *   - temperature: |Δ°F| → exponentially decaying score, half-life ~10°F
 *   - wind speed:  |Δmph| → linear decay, 0 at ≥20 mph delta
 *   - wind dir:    8-cardinal angular distance → cosine-bin score
 *   - sky/conditions text: token overlap (substring + Jaccard hybrid)
 *
 * Components with `undefined` queries OR `undefined` entry values are
 * skipped (do NOT penalize) — a partial match on temperature alone is
 * still useful information, and so is comparing against a journal that
 * happened to omit wind direction.
 *
 * Composite score = weighted average over PRESENT axes only. If no axis
 * is comparable (both sides undefined everywhere) the entry is
 * filtered out of results, NOT shown with a fake score.
 *
 * Why this beats a generic "tag search":
 *   - A tag-based recall like "rain" is brittle (typo'd "raining" misses).
 *   - Numeric similarity captures things the user wouldn't have tagged
 *     ("47°F NW 12 mph clear" is a recognizable conditions fingerprint
 *     even when the user only wrote "saw a 6-pt").
 *   - Returning the *raw deltas* alongside the score lets the user judge
 *     each match for themselves rather than trusting a black box.
 *
 * Phase A.13 — added 2026-04-24 per V2_3_FEATURE_EXPANSION_PLAN.
 */

import type { JournalEntry, JournalWeather } from '../types/journalEntry';
import type { WaypointMode } from '../types/userWaypoint';

/**
 * Query weather snapshot. Same shape as JournalWeather but every field
 * is optional and the caller is free to leave fields blank — the scorer
 * skips axes where the query side is undefined.
 */
export type WeatherQuery = JournalWeather;

/**
 * Per-axis weighting. Weights are applied AFTER per-axis 0..1 scoring
 * and only over axes that contributed (so a query with no
 * windDirection still produces a 0..1 composite over the remaining
 * axes — proportional reweighting, not sandbagged scores).
 *
 * Defaults skew toward what hunters/anglers most commonly cite as
 * decisive: temperature first (0.4), wind speed second (0.3), sky
 * conditions third (0.2), wind direction fourth (0.1). Direction is
 * lower-weight than speed because "wind direction matters" is mode-
 * specific (matters a lot for stand hunting, less for fishing in a
 * sheltered creek), and the user can pin-bias by *only* querying
 * direction when that's what they care about.
 */
export interface ConditionsScoringWeights {
  temperatureF: number;
  windMph: number;
  windDirection: number;
  conditions: number;
}

export const DEFAULT_WEIGHTS: ConditionsScoringWeights = {
  temperatureF: 0.4,
  windMph: 0.3,
  windDirection: 0.1,
  conditions: 0.2,
};

/**
 * Per-axis breakdown. `score` is 0..1 (1 = identical match, 0 = no
 * relationship). `delta` is the raw signed/unsigned difference, kept
 * so the UI can show "Δ +3°F" rather than just a similarity bar.
 *
 * `applied` flags whether this axis contributed to the composite. An
 * axis where either side is undefined is recorded as
 * `{score: 0, applied: false}` and skipped in the composite math.
 */
export interface AxisScore {
  score: number;
  applied: boolean;
  /** Human-readable delta string, eg "Δ +3°F" or "ENE vs NNE". */
  delta?: string;
}

export interface ConditionsBreakdown {
  temperatureF: AxisScore;
  windMph: AxisScore;
  windDirection: AxisScore;
  conditions: AxisScore;
}

export interface ScoredJournalMatch {
  entry: JournalEntry;
  /** Composite 0..1, computed over applied axes only. */
  score: number;
  breakdown: ConditionsBreakdown;
  /** How many of the 4 axes contributed (0..4). */
  axesApplied: number;
}

export interface FindOptions {
  /** When set, only entries with this mode are considered. */
  mode?: WaypointMode;
  /** Cap on returned matches (default 25). */
  limit?: number;
  /** Minimum composite score to include (default 0 — return everything scored). */
  minScore?: number;
  /** Optional weighting override. */
  weights?: ConditionsScoringWeights;
  /** Minimum number of axes that must apply (default 1). */
  minAxes?: number;
}

// ─── Per-axis scorers ────────────────────────────────────────────

/**
 * Temperature score: exponential half-life decay.
 * f(d) = 0.5 ^ (|d| / HALF_LIFE).
 * HALF_LIFE = 10°F means a 10-degree miss scores 0.5, a 20-degree
 * miss scores 0.25, a 30-degree miss scores 0.125, etc. Asymptotes
 * at 0; never goes negative.
 */
const TEMP_HALF_LIFE_F = 10;

export function scoreTemperature(
  query: number | undefined,
  entry: number | undefined,
): AxisScore {
  if (query === undefined || entry === undefined) {
    return { score: 0, applied: false };
  }
  const delta = entry - query;
  const score = Math.pow(0.5, Math.abs(delta) / TEMP_HALF_LIFE_F);
  const sign = delta >= 0 ? '+' : '';
  return {
    score,
    applied: true,
    delta: `Δ ${sign}${delta.toFixed(0)}°F`,
  };
}

/**
 * Wind-speed score: linear decay from 1 at delta=0 to 0 at delta=20mph
 * or above. Wind speed differences of >20mph are operationally
 * unrelated for outdoor planning (calm vs. small-craft warning).
 */
const WIND_DECAY_TO_ZERO_MPH = 20;

export function scoreWindSpeed(
  query: number | undefined,
  entry: number | undefined,
): AxisScore {
  if (query === undefined || entry === undefined) {
    return { score: 0, applied: false };
  }
  const delta = entry - query;
  const abs = Math.abs(delta);
  const score = Math.max(0, 1 - abs / WIND_DECAY_TO_ZERO_MPH);
  const sign = delta >= 0 ? '+' : '';
  return {
    score,
    applied: true,
    delta: `Δ ${sign}${delta.toFixed(0)} mph`,
  };
}

/**
 * Cardinal direction strings → degrees (0=N, 90=E, etc.).
 * Accepts 8-point ("NW") and 16-point ("NNW", "WNW") notations.
 * Case- and whitespace-insensitive. Returns undefined for unknown.
 */
const DIRECTION_DEGREES: Record<string, number> = {
  N: 0,
  NNE: 22.5,
  NE: 45,
  ENE: 67.5,
  E: 90,
  ESE: 112.5,
  SE: 135,
  SSE: 157.5,
  S: 180,
  SSW: 202.5,
  SW: 225,
  WSW: 247.5,
  W: 270,
  WNW: 292.5,
  NW: 315,
  NNW: 337.5,
};

export function parseDirectionDeg(raw: string | undefined): number | undefined {
  if (!raw) return undefined;
  const key = raw.trim().toUpperCase();
  if (key in DIRECTION_DEGREES) return DIRECTION_DEGREES[key];
  return undefined;
}

/**
 * Wind direction score: cosine-bin similarity.
 * Score = (1 + cos(Δθ)) / 2 → identical=1, perpendicular=0.5, opposite=0.
 * Captures the intuition that NNW vs N is a near-perfect match while
 * NNW vs SSE is the worst possible.
 *
 * `delta` shows source pair when both parse, else falls back to raw.
 */
export function scoreWindDirection(
  query: string | undefined,
  entry: string | undefined,
): AxisScore {
  const qDeg = parseDirectionDeg(query);
  const eDeg = parseDirectionDeg(entry);
  if (qDeg === undefined || eDeg === undefined) {
    return { score: 0, applied: false };
  }
  const dRad = ((eDeg - qDeg) * Math.PI) / 180;
  const score = (1 + Math.cos(dRad)) / 2;
  return {
    score,
    applied: true,
    delta: `${(query ?? '').toUpperCase()} vs ${(entry ?? '').toUpperCase()}`,
  };
}

/**
 * Conditions text score: hybrid token overlap.
 *
 *   1. Tokenize each side (lowercase, split on non-alphanumeric, drop
 *      tokens shorter than 3 chars to suppress noise like "&" or "a").
 *   2. If either side has zero tokens after normalization → not applied.
 *   3. Score = |intersection| / |union|  (Jaccard).
 *
 * Picks up "light rain" vs "rain showers" (intersection={rain}) but
 * does NOT inflate "clear" vs "sunny" since the tokens differ. That's
 * an acceptable tradeoff — false matches would erode trust faster than
 * occasional misses.
 */
export function scoreConditionsText(
  query: string | undefined,
  entry: string | undefined,
): AxisScore {
  const qTokens = tokenizeConditions(query);
  const eTokens = tokenizeConditions(entry);
  if (qTokens.size === 0 || eTokens.size === 0) {
    return { score: 0, applied: false };
  }
  let intersection = 0;
  for (const t of qTokens) {
    if (eTokens.has(t)) intersection += 1;
  }
  const union = new Set<string>([...qTokens, ...eTokens]).size;
  const score = union === 0 ? 0 : intersection / union;
  return {
    score,
    applied: true,
    delta: `${query} ↔ ${entry}`,
  };
}

function tokenizeConditions(raw: string | undefined): Set<string> {
  if (!raw) return new Set();
  return new Set(
    raw
      .toLowerCase()
      .split(/[^a-z0-9]+/g)
      .filter((t) => t.length >= 3),
  );
}

// ─── Composite ───────────────────────────────────────────────────

/**
 * Score a single journal entry against a weather query. Returns the
 * full breakdown plus composite. `axesApplied === 0` means none of the
 * scoring axes had data on both sides.
 */
export function scoreEntry(
  query: WeatherQuery,
  entry: JournalEntry,
  weights: ConditionsScoringWeights = DEFAULT_WEIGHTS,
): ScoredJournalMatch {
  const w: JournalWeather = entry.weather ?? {};
  const breakdown: ConditionsBreakdown = {
    temperatureF: scoreTemperature(query.temperatureF, w.temperatureF),
    windMph: scoreWindSpeed(query.windMph, w.windMph),
    windDirection: scoreWindDirection(query.windDirection, w.windDirection),
    conditions: scoreConditionsText(query.conditions, w.conditions),
  };

  let weightedSum = 0;
  let totalWeight = 0;
  let axesApplied = 0;
  for (const key of [
    'temperatureF',
    'windMph',
    'windDirection',
    'conditions',
  ] as const) {
    const axis = breakdown[key];
    if (axis.applied) {
      const weight = weights[key];
      weightedSum += axis.score * weight;
      totalWeight += weight;
      axesApplied += 1;
    }
  }

  const score = totalWeight > 0 ? weightedSum / totalWeight : 0;
  return { entry, score, breakdown, axesApplied };
}

/**
 * Rank every journal entry against the query and return the top N.
 * Excludes entries where no axis applied (no comparable data).
 *
 * Sort: composite score DESC, then `axesApplied` DESC (more-axes match
 * beats fewer-axes match on a tie), then entry.entryDate DESC (more-
 * recent entry beats older), then entry.id ASC (deterministic
 * tiebreak).
 */
export function findComparableEntries(
  query: WeatherQuery,
  entries: JournalEntry[],
  opts: FindOptions = {},
): ScoredJournalMatch[] {
  const weights = opts.weights ?? DEFAULT_WEIGHTS;
  const minAxes = opts.minAxes ?? 1;
  const minScore = opts.minScore ?? 0;
  const limit = opts.limit ?? 25;

  const filtered = opts.mode
    ? entries.filter((e) => e.mode === opts.mode)
    : entries;

  const scored = filtered
    .map((e) => scoreEntry(query, e, weights))
    .filter((m) => m.axesApplied >= minAxes && m.score >= minScore);

  scored.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    if (b.axesApplied !== a.axesApplied) return b.axesApplied - a.axesApplied;
    if (b.entry.entryDate !== a.entry.entryDate) {
      return b.entry.entryDate < a.entry.entryDate ? -1 : 1;
    }
    return a.entry.id < b.entry.id ? -1 : 1;
  });

  return scored.slice(0, limit);
}

/**
 * Convenience: count how many entries have any usable weather data
 * (so the screen can refuse to show the form when there's nothing
 * to match against — "log a journal with weather first").
 */
export function entriesWithWeatherCount(entries: JournalEntry[]): number {
  let n = 0;
  for (const e of entries) {
    const w = e.weather;
    if (
      w &&
      (w.temperatureF !== undefined ||
        w.windMph !== undefined ||
        w.windDirection !== undefined ||
        (w.conditions !== undefined && w.conditions.trim().length > 0))
    ) {
      n += 1;
    }
  }
  return n;
}
