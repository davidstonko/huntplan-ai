/**
 * weatherToConditionsQuery
 *
 * Pure adapter: maps a WeatherForecast period (from weatherService) into
 * a WeatherQuery (consumed by comparableConditionsService).
 *
 * This bridges the public weather.gov API surface (free-text wind like
 * "10 to 15 mph", cardinal direction strings, prose forecasts) into the
 * structured 4-axis query that the similarity scorer expects.
 *
 * V2_3_FEATURE_EXPANSION_PLAN — Phase A.14 ("Use Today's Weather" auto-fill).
 *
 * Design rules:
 *  - Pure functions only. NO axios, NO React, NO native bridge calls.
 *    All I/O is the caller's responsibility — this file is jest-friendly
 *    without any mocks.
 *  - Defensive parsing. The weather.gov API is documented but the field
 *    formats vary ("Calm", "5 mph", "5 to 10 mph", "5 to 10 mph (gusts
 *    20 mph)"). We extract a representative scalar without throwing.
 *  - Fail-soft. If a field can't be parsed, we return `undefined` for
 *    that axis so the scorer simply marks it not-applied. We do NOT
 *    invent a 0 value — that would lie to the user about confidence.
 */
import type { WeatherForecast } from './weatherService';
import type { WeatherQuery } from './comparableConditionsService';

/**
 * Parse a free-text wind-speed string from the weather.gov forecast
 * into a representative MPH number.
 *
 * Inputs we've observed in the wild:
 *  - "Calm"               → 0
 *  - "5 mph"              → 5
 *  - "5 to 10 mph"        → 7.5  (midpoint)
 *  - "10 to 15 mph"       → 12.5
 *  - "10 to 20 mph (gusts to 30 mph)" → 15  (midpoint of base range, gusts ignored)
 *  - "" / undefined / unparseable → undefined
 *
 * The midpoint choice for ranges is deliberate: weather.gov ranges are
 * sustained-wind brackets, and reporting either endpoint biases the
 * similarity score in arbitrary directions. The midpoint is the unbiased
 * single-number representative.
 *
 * Gusts are intentionally ignored — they're peak transients, not what
 * a hunter or angler would write into a journal entry's wind field.
 */
export function parseWindMphFromText(raw?: string): number | undefined {
  if (!raw || typeof raw !== 'string') return undefined;
  const lower = raw.toLowerCase().trim();
  if (!lower) return undefined;
  // "Calm" is weather.gov's explicit zero-wind label.
  if (/\bcalm\b/.test(lower)) return 0;
  // Strip the gusts clause before extracting the base range — gust numbers
  // would otherwise sneak in and inflate the answer.
  const base = lower.split(/\(/)[0];
  // Pull out all standalone integers. Order preserved.
  const nums = (base.match(/\d+(?:\.\d+)?/g) || []).map(Number).filter(
    (n) => Number.isFinite(n),
  );
  if (nums.length === 0) return undefined;
  if (nums.length === 1) return nums[0];
  // Range like "5 to 10" — return midpoint.
  // (We don't slice past 2 — anything beyond is unexpected and we just
  // average the first two as the conservative interpretation.)
  return (nums[0] + nums[1]) / 2;
}

/**
 * Pick the most-representative forecast period for "right now / today".
 *
 * Weather.gov returns ~14 periods covering 7 days. The first period is
 * either "Today" (daytime) or "Tonight" (nighttime), depending on when
 * the user opens the app. We prefer the first DAYTIME period because:
 *  - Hunters/anglers usually plan around daytime conditions
 *  - The "today" mental model implies daytime
 *  - But if the only daytime period is hours away (user opens the app
 *    at 11pm), we still want SOMETHING to show, hence the fallback to
 *    the first period of any kind.
 *
 * Returns undefined if the forecast list is empty (network failure).
 */
export function pickTodaysForecast(
  periods: WeatherForecast[] | undefined | null,
): WeatherForecast | undefined {
  if (!Array.isArray(periods) || periods.length === 0) return undefined;
  const firstDaytime = periods.find((p) => p.isDaytime);
  return firstDaytime ?? periods[0];
}

/**
 * Map a single WeatherForecast period into a WeatherQuery.
 *
 * Field mapping:
 *  - temperature  → temperatureF (only if temperatureUnit is "F"; we
 *                   skip Celsius rather than silently converting because
 *                   journal entries are F-only and a unit mismatch would
 *                   produce a junk score)
 *  - windSpeed    → windMph (parsed via parseWindMphFromText)
 *  - windDirection → windDirection (cardinal string passes through)
 *  - shortForecast → conditions (e.g., "Partly Cloudy" → matches against
 *                    journal entries' conditions text via Jaccard tokens)
 */
export function weatherForecastToQuery(
  period: WeatherForecast | undefined | null,
): WeatherQuery {
  if (!period) return {};

  const out: WeatherQuery = {};

  // Temperature: only accept Fahrenheit. Weather.gov US locations always
  // report F, but defensive check protects against future API drift.
  if (
    typeof period.temperature === 'number' &&
    Number.isFinite(period.temperature) &&
    typeof period.temperatureUnit === 'string' &&
    period.temperatureUnit.toUpperCase() === 'F'
  ) {
    out.temperatureF = period.temperature;
  }

  const mph = parseWindMphFromText(period.windSpeed);
  if (mph !== undefined) out.windMph = mph;

  const dir = (period.windDirection || '').trim();
  if (dir) out.windDirection = dir;

  const cond = (period.shortForecast || '').trim();
  if (cond) out.conditions = cond;

  return out;
}
