/**
 * windCalendarService — multi-day "which stand when" wind planner.
 *
 * Combines the NOAA 7-day wind forecast (weatherService.getForecast) with each
 * saved stand's `idealWindDirections` to tell a hunter which stand the wind
 * favors on each upcoming day/period. This closes a real gap: the data
 * (`idealWindDirections`, set in StandDetailEditor) already lived on stands, but
 * nothing consumed it for planning — the current-wind scent cone only looks at
 * "right now." HuntStand paywalls exactly this as its "Wind Calendar."
 *
 * Everything here is a pure function so it is fully unit-testable; the screen
 * supplies the forecast periods and the list of stands.
 */
import type { WeatherForecast } from './weatherService';
import type { CardinalDirection } from '../types/scout';

export type WindFavorability = 'ideal' | 'marginal' | 'poor' | 'unknown';

/** 8-point compass, clockwise from North. Index * 45° = bearing. */
const COMPASS8: CardinalDirection[] = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];

/** Bearing (degrees) for every 8- and 16-point NOAA cardinal string. */
const CARDINAL_DEGREES: Record<string, number> = {
  N: 0, NNE: 22.5, NE: 45, ENE: 67.5, E: 90, ESE: 112.5, SE: 135, SSE: 157.5,
  S: 180, SSW: 202.5, SW: 225, WSW: 247.5, W: 270, WNW: 292.5, NW: 315, NNW: 337.5,
};

/** Map any NOAA wind-direction string (8- or 16-point) to the nearest 8-point cardinal. */
export function normalizeToCardinal8(
  dir: string | null | undefined,
): CardinalDirection | null {
  if (!dir) return null;
  const deg = CARDINAL_DEGREES[dir.trim().toUpperCase()];
  if (deg === undefined) return null;
  const idx = Math.round(deg / 45) % 8;
  return COMPASS8[idx];
}

/** Peak mph from a NOAA windSpeed string ("10 to 15 mph" -> 15, "5 mph" -> 5). */
export function parseWindMph(windSpeed: string | null | undefined): number {
  if (!windSpeed) return 0;
  const nums = windSpeed.match(/\d+/g);
  if (!nums || nums.length === 0) return 0;
  return Math.max(...nums.map(Number));
}

/** Angular distance in 45° steps (0..4) between two 8-point cardinals. */
function stepsApart(a: CardinalDirection, b: CardinalDirection): number {
  const d = Math.abs(COMPASS8.indexOf(a) - COMPASS8.indexOf(b));
  return Math.min(d, 8 - d);
}

/**
 * Rate how favorable a forecast wind is for a stand.
 * Both `idealWindDirections` and NOAA's windDirection use the "wind FROM"
 * convention, so a direct match means the hunter's scent blows the way they set
 * the stand up for.
 *   ideal    — wind is one of the stand's ideal directions
 *   marginal — wind is exactly one 45° step off an ideal direction
 *   poor     — further off than that
 *   unknown  — missing/unparseable data
 */
export function windFavorability(
  idealDirections: CardinalDirection[] | undefined,
  forecastDir: string | null | undefined,
): WindFavorability {
  const fc = normalizeToCardinal8(forecastDir);
  if (!fc || !idealDirections || idealDirections.length === 0) return 'unknown';
  let best = 4;
  for (const ideal of idealDirections) best = Math.min(best, stepsApart(ideal, fc));
  if (best === 0) return 'ideal';
  if (best === 1) return 'marginal';
  return 'poor';
}

/** Human label for a favorability bucket. */
export function favorabilityLabel(f: WindFavorability): string {
  switch (f) {
    case 'ideal': return 'Ideal wind';
    case 'marginal': return 'Marginal';
    case 'poor': return 'Wrong wind';
    default: return 'No wind data';
  }
}

/** A forecast period reduced to what the planner needs. */
export interface WindPeriod {
  name: string; // "Saturday", "Saturday Night"
  isDaytime: boolean;
  cardinal: CardinalDirection | null; // normalized 8-point
  rawDirection: string; // as NOAA gave it, e.g. "WNW"
  windMph: number; // peak mph
  temperature: number;
  temperatureUnit: string;
  shortForecast: string;
}

export function toWindPeriods(forecasts: WeatherForecast[]): WindPeriod[] {
  return forecasts.map((f) => ({
    name: f.name,
    isDaytime: f.isDaytime,
    cardinal: normalizeToCardinal8(f.windDirection),
    rawDirection: f.windDirection,
    windMph: parseWindMph(f.windSpeed),
    temperature: f.temperature,
    temperatureUnit: f.temperatureUnit,
    shortForecast: f.shortForecast,
  }));
}

/** A stand as the planner needs it (subset of scout.Waypoint + StandDetails). */
export interface PlannerStand {
  id: string;
  label: string;
  idealWindDirections: CardinalDirection[];
}

export interface StandWindPlanRow {
  stand: PlannerStand;
  cells: WindFavorability[]; // aligned index-for-index with the periods array
}

/** Cross every stand with every period. */
export function buildStandWindPlan(
  stands: PlannerStand[],
  periods: WindPeriod[],
): StandWindPlanRow[] {
  return stands.map((stand) => ({
    stand,
    cells: periods.map((p) =>
      windFavorability(stand.idealWindDirections, p.rawDirection),
    ),
  }));
}

/** Stands whose wind is ideal (then marginal) for one period, best first. */
export function rankStandsForPeriod(
  plan: StandWindPlanRow[],
  periodIndex: number,
): { stand: PlannerStand; favorability: WindFavorability }[] {
  const order: Record<WindFavorability, number> = {
    ideal: 0, marginal: 1, poor: 2, unknown: 3,
  };
  return plan
    .map((row) => ({ stand: row.stand, favorability: row.cells[periodIndex] }))
    .filter((r) => r.favorability === 'ideal' || r.favorability === 'marginal')
    .sort((a, b) => order[a.favorability] - order[b.favorability]);
}
