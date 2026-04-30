/**
 * windService — NOAA National Weather Service wind forecasts.
 *
 * V2_3_FEATURE_EXPANSION_PLAN §B.2: the scent-cone overlay needs a
 * wind direction + speed for a given lat/lng and forecast hour. NWS's
 * public API (api.weather.gov) gives us this for free, no key, with
 * a ~2.5 km grid covering all of Maryland.
 *
 * Fetch shape is two-step:
 *   1. GET /points/{lat},{lng}
 *      → returns the gridId + gridX + gridY for that coordinate, and
 *        a forecastHourly URL.
 *   2. GET that forecastHourly URL
 *      → returns 150+ hourly periods with startTime, windSpeed,
 *        windDirection, windGust (optional).
 *
 * Both steps are cached:
 *   - Points response is static per gridpoint, cached for 24 hours.
 *   - Hourly forecast refreshes every hour, cached keyed on the grid
 *     id and the current hour bucket.
 *
 * This module is pure data access — no React, no map dependencies. A
 * test double can be injected via `setWindServiceFetcher` to avoid
 * hitting the live network during jest runs.
 *
 * NWS requires a User-Agent header identifying the app. We set:
 *   "MDHuntFishOutdoors (support@mdhuntfishoutdoors.com)"
 * per NWS terms.
 */

type Fetcher = (url: string, init?: RequestInit) => Promise<Response>;

let fetcher: Fetcher =
  typeof fetch !== 'undefined' ? fetch.bind(globalThis) : (async () => {
    throw new Error('fetch is not available in this environment');
  });

/**
 * Injection hook for tests. Pass a function that returns a Response-like
 * object; call with no argument to reset back to global fetch.
 */
export function setWindServiceFetcher(custom?: Fetcher) {
  fetcher =
    custom ??
    (typeof fetch !== 'undefined'
      ? fetch.bind(globalThis)
      : (async () => {
          throw new Error('fetch is not available in this environment');
        }));
}

const NWS_BASE = 'https://api.weather.gov';
const USER_AGENT = 'MDHuntFishOutdoors (support@mdhuntfishoutdoors.com)';
const POINTS_TTL_MS = 24 * 60 * 60 * 1000;
const HOURLY_TTL_MS = 60 * 60 * 1000;

export interface WindReading {
  /** Hour-aligned ISO timestamp for the forecast period. */
  timeIso: string;
  /** Miles per hour. */
  speedMph: number;
  /** Meteorological FROM direction, 0-360. */
  directionDeg: number;
  /** Optional gust mph if NWS provided one. */
  gustMph?: number;
}

export interface GridpointInfo {
  gridId: string;
  gridX: number;
  gridY: number;
  forecastHourlyUrl: string;
  fetchedAt: number;
}

interface PointsCacheEntry {
  info: GridpointInfo;
  expiresAt: number;
}
interface HourlyCacheEntry {
  readings: WindReading[];
  expiresAt: number;
}

const pointsCache = new Map<string, PointsCacheEntry>();
const hourlyCache = new Map<string, HourlyCacheEntry>();

/**
 * Test helper — lets tests reset both caches.
 */
export function __clearWindCaches() {
  pointsCache.clear();
  hourlyCache.clear();
}

/**
 * Round to 3 decimals (~110 m at Maryland latitudes). Caches points
 * lookups per neighborhood, preventing the re-fetch for every slightly
 * different waypoint.
 */
function roundLatLng(n: number): number {
  return Math.round(n * 1000) / 1000;
}

function pointsKey(lat: number, lng: number): string {
  return `${roundLatLng(lat)},${roundLatLng(lng)}`;
}

function hourlyKey(info: GridpointInfo): string {
  const hourBucket = Math.floor(Date.now() / HOURLY_TTL_MS);
  return `${info.gridId}/${info.gridX}/${info.gridY}@${hourBucket}`;
}

async function jsonOrThrow(url: string): Promise<any> {
  const res = await fetcher(url, {
    headers: {
      Accept: 'application/ld+json, application/geo+json, application/json',
      'User-Agent': USER_AGENT,
    },
  });
  if (!res.ok) {
    throw new Error(`NWS ${res.status} for ${url}`);
  }
  return res.json();
}

/**
 * Step 1 of the NWS fetch dance. Returns the gridpoint + hourly URL.
 */
export async function getGridpointForCoord(
  lat: number,
  lng: number,
): Promise<GridpointInfo> {
  const key = pointsKey(lat, lng);
  const cached = pointsCache.get(key);
  if (cached && Date.now() < cached.expiresAt) {
    return cached.info;
  }
  const url = `${NWS_BASE}/points/${roundLatLng(lat)},${roundLatLng(lng)}`;
  const data = await jsonOrThrow(url);
  // ld+json flattens properties onto the top-level; geo+json nests under .properties.
  const props = data.properties ?? data;
  const info: GridpointInfo = {
    gridId: props.gridId ?? props.cwa ?? '',
    gridX: Number(props.gridX),
    gridY: Number(props.gridY),
    forecastHourlyUrl: props.forecastHourly ?? '',
    fetchedAt: Date.now(),
  };
  if (!info.forecastHourlyUrl) {
    throw new Error(`NWS points response missing forecastHourly for ${key}`);
  }
  pointsCache.set(key, {
    info,
    expiresAt: Date.now() + POINTS_TTL_MS,
  });
  return info;
}

/**
 * Parse NWS "windSpeed" which comes as a string like "10 mph" or
 * "5 to 10 mph". We take the upper bound on ranges — it's the number
 * that actually moves scent.
 */
export function parseWindSpeedString(raw: string | number | undefined): number {
  if (raw == null) return 0;
  if (typeof raw === 'number') return raw;
  const cleaned = raw.replace(/mph|kph|km\/h/i, '').trim();
  if (!cleaned) return 0;
  const parts = cleaned.split(/to|-/i).map((s) => parseFloat(s.trim()));
  const nums = parts.filter((n) => Number.isFinite(n));
  if (nums.length === 0) return 0;
  return Math.max(...nums);
}

/**
 * Parse NWS "windDirection" which comes as a compass abbreviation like
 * "NNE" or "W". Returns degrees (0 = north, 90 = east).
 */
export function parseWindDirectionString(
  raw: string | number | undefined,
): number {
  if (raw == null) return 0;
  if (typeof raw === 'number') return ((raw % 360) + 360) % 360;
  const map: Record<string, number> = {
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
  const k = raw.trim().toUpperCase();
  return map[k] ?? 0;
}

export function parseNwsHourlyResponse(payload: any): WindReading[] {
  const periods: any[] = payload?.properties?.periods ?? payload?.periods ?? [];
  return periods.map((p) => {
    const speedMph = parseWindSpeedString(p.windSpeed);
    const directionDeg = parseWindDirectionString(p.windDirection);
    const gust = parseWindSpeedString(p.windGust);
    return {
      timeIso: p.startTime,
      speedMph,
      directionDeg,
      gustMph: gust > 0 ? gust : undefined,
    };
  });
}

/**
 * Step 2 + caching. Returns the parsed wind readings array for a
 * gridpoint, cached for one hour.
 */
export async function getHourlyForecast(
  info: GridpointInfo,
): Promise<WindReading[]> {
  const key = hourlyKey(info);
  const cached = hourlyCache.get(key);
  if (cached && Date.now() < cached.expiresAt) {
    return cached.readings;
  }
  const data = await jsonOrThrow(info.forecastHourlyUrl);
  const readings = parseNwsHourlyResponse(data);
  hourlyCache.set(key, {
    readings,
    expiresAt: Date.now() + HOURLY_TTL_MS,
  });
  return readings;
}

/**
 * Pick the forecast hour whose startTime is closest to `whenIso`
 * without going past it (i.e. the currently-valid forecast period).
 * Returns null when the forecast is empty or entirely in the past.
 */
export function pickReadingForTime(
  readings: WindReading[],
  whenIso: string,
): WindReading | null {
  if (readings.length === 0) return null;
  const whenMs = new Date(whenIso).getTime();
  if (!Number.isFinite(whenMs)) return null;
  let best: WindReading | null = null;
  let bestDelta = Infinity;
  for (const r of readings) {
    const rMs = new Date(r.timeIso).getTime();
    if (!Number.isFinite(rMs)) continue;
    // Prefer periods at or before `whenMs`, but fall back to the nearest.
    const delta = Math.abs(rMs - whenMs);
    if (delta < bestDelta) {
      best = r;
      bestDelta = delta;
    }
  }
  return best;
}

/**
 * One-shot: "what's the wind at (lat, lng) at time X?".
 * Errors bubble up to the caller so the UI can show a red banner.
 */
export async function getWindAt(
  lat: number,
  lng: number,
  whenIso: string,
): Promise<WindReading | null> {
  const info = await getGridpointForCoord(lat, lng);
  const readings = await getHourlyForecast(info);
  return pickReadingForTime(readings, whenIso);
}
