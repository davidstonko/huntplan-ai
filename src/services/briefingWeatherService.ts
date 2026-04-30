/**
 * briefingWeatherService — pure projection helpers that turn a
 * weather.gov `WeatherForecast[]` into the compact view-model the
 * Daily Briefing's one-row weather card renders.
 *
 * weatherService.getForecast already does the network + grid lookup +
 * unit normalization. The card needs *less* than that — just today's
 * high/low, the daytime wind, the daytime conditions, and a short
 * "as-of" timestamp. Pulling those four numbers out of a 14-period
 * array is small but worth a dedicated module so the UI doesn't carry
 * the picking logic and so unit tests can lock the parsing.
 *
 * The wind-speed parsing is the riskiest piece: weather.gov sends
 * windSpeed as a free-form string like "5 to 10 mph" or "10 mph" or
 * "Light and variable". The card needs a single integer it can render
 * in tabular-nums; the helper here returns the *highest* number it sees
 * (so "5 to 10 mph" → 10 — the gust-aware reading) or null when no
 * number is parseable.
 *
 * All exports are pure functions. Network fetching lives in the
 * component so Suspense / pull-to-refresh can be added later without
 * having to rewire this module.
 */

import type { WeatherForecast } from './weatherService';

/**
 * Compact view-model for the briefing weather card. Each field is
 * optional because weather.gov can return a forecast that's missing
 * a tonight period (late night, after the day rolls over) or a
 * windSpeed that doesn't parse.
 */
export interface BriefingWeatherSummary {
  /** Today's daytime forecast period, or null if not present. */
  todayPeriod: WeatherForecast | null;
  /** Tonight's overnight period, or null if not present. */
  tonightPeriod: WeatherForecast | null;
  /** Forecast high in °F (the daytime period's `temperature`). */
  highF: number | null;
  /** Forecast low in °F (the overnight period's `temperature`). */
  lowF: number | null;
  /** Daytime wind speed in MPH (max of any range), or null. */
  windMph: number | null;
  /** Daytime wind cardinal direction ("NW", etc.), or null. */
  windDir: string | null;
  /** Daytime short forecast string ("Partly Cloudy"), or null. */
  conditions: string | null;
}

/**
 * Pick the first daytime and first nighttime periods out of the
 * weather.gov forecast array. weather.gov orders periods chronologically
 * starting with the closest one in time, so the first matching period
 * for each is the one the user wants on the briefing.
 */
export function pickTodayPeriods(
  forecasts: WeatherForecast[],
): { day: WeatherForecast | null; night: WeatherForecast | null } {
  let day: WeatherForecast | null = null;
  let night: WeatherForecast | null = null;
  for (const p of forecasts) {
    if (!day && p.isDaytime) day = p;
    else if (!night && !p.isDaytime) night = p;
    if (day && night) break;
  }
  return { day, night };
}

/**
 * Extract an integer mph value from a weather.gov windSpeed string.
 * Returns the *largest* number seen so a "5 to 10 mph" range yields 10
 * (the gust-aware reading the card should highlight). Returns null when
 * no number is parseable — "Light and variable" → null, "" → null.
 *
 * Pure regex parse — no Number() coercion that could swallow trailing
 * units or NaN-coerce a partial string into a misleading 0.
 */
export function parseWindMph(s: string | null | undefined): number | null {
  if (!s) return null;
  const matches = s.match(/\d+/g);
  if (!matches || matches.length === 0) return null;
  let best = -Infinity;
  for (const m of matches) {
    const n = parseInt(m, 10);
    if (!isNaN(n) && n > best) best = n;
  }
  return best === -Infinity ? null : best;
}

/**
 * Project a `WeatherForecast[]` (as returned by weatherService.getForecast)
 * into the briefing view-model. Pure, deterministic, no network.
 *
 * Returns a "blank" summary (every field null) when forecasts is empty
 * so the card can render a degraded state without pre-checking the array.
 */
export function summarizeForecast(
  forecasts: WeatherForecast[],
): BriefingWeatherSummary {
  const { day, night } = pickTodayPeriods(forecasts);
  const highF = day && typeof day.temperature === 'number' ? day.temperature : null;
  const lowF = night && typeof night.temperature === 'number' ? night.temperature : null;
  const windMph = day ? parseWindMph(day.windSpeed) : null;
  const windDir = day && day.windDirection ? day.windDirection : null;
  const conditions = day && day.shortForecast ? day.shortForecast : null;
  return {
    todayPeriod: day,
    tonightPeriod: night,
    highF,
    lowF,
    windMph,
    windDir,
    conditions,
  };
}

/**
 * Format a high/low pair for the card's primary line. Drops the half
 * that's missing rather than rendering "—". Returns null if neither
 * end is available so the caller can skip the row entirely.
 */
export function formatHighLow(
  highF: number | null,
  lowF: number | null,
): string | null {
  const h = highF !== null ? `${Math.round(highF)}°` : null;
  const l = lowF !== null ? `${Math.round(lowF)}°` : null;
  if (!h && !l) return null;
  if (h && l) return `${h} / ${l}`;
  return h ?? l!;
}

/**
 * Format wind speed + direction for the card's secondary line. Returns
 * null if neither piece is available.
 */
export function formatWind(
  windMph: number | null,
  windDir: string | null,
): string | null {
  if (windMph === null && !windDir) return null;
  if (windMph !== null && windDir) return `${windMph} mph ${windDir}`;
  if (windMph !== null) return `${windMph} mph`;
  return windDir;
}
