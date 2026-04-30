/**
 * scentConeGeometry — pure math for the Hunt-map scent-cone overlay.
 *
 * Given a waypoint (typically a tree-stand), a wind direction and speed,
 * we return a GeoJSON.Polygon representing the downwind scent plume.
 *
 * Design choices (documented per V2_3_FEATURE_EXPANSION_PLAN §B.2):
 *
 *   - **Meteorological wind convention.** Wind direction is reported as
 *     the direction the wind is coming FROM (0° = from north, 90° = from
 *     east). Scent travels TO the opposite direction, so the cone axis
 *     points at `(fromDirectionDeg + 180) mod 360`.
 *
 *   - **Calm threshold.** Below ~3 mph the wind is too diffuse/variable
 *     to model a meaningful cone; we return `null` and the caller
 *     renders a "calm" badge instead of a polygon.
 *
 *   - **Cone width.** 120° total arc (±60° from the downwind axis).
 *     Chosen by convention — narrower than "any direction" (the point of
 *     a cone) but wide enough to account for real-world wind spread and
 *     microterrain eddies.
 *
 *   - **Cone length.** Grows with wind speed but caps at 1 mile:
 *     `length_m = min(160 + 64 * speedMph, 1609)` (1 mi = 1609 m). This
 *     keeps weak-wind cones small enough to be useful for stand picking
 *     while preventing 40-mph gusts from rendering a statewide plume.
 *
 *   - **Great-circle math.** Cone edges are computed via the
 *     spherical-earth destination formula so the polygon stays correct
 *     at Maryland latitudes without importing a full geodesy library.
 *
 * This module is deliberately dependency-free (no react, no mapbox, no
 * turf) so it can be unit-tested without a renderer. Wire-up lives in
 * `components/map/ScentConeLayer.tsx`.
 */

const EARTH_RADIUS_M = 6_371_000;
const DEG_TO_RAD = Math.PI / 180;
const RAD_TO_DEG = 180 / Math.PI;
const METERS_PER_MILE = 1609.344;

export interface ScentConeOptions {
  originLat: number;
  originLng: number;
  /** Meteorological "from" direction. 0° = wind FROM the north. */
  windFromDirectionDeg: number;
  windSpeedMph: number;
  /** Half-angle of the cone, degrees. Default 60 (→ 120° total arc). */
  halfAngleDeg?: number;
  /** Override the auto length calculation if needed (meters). */
  lengthMetersOverride?: number;
  /** Number of arc segments used to sweep the cone's far edge. Default 24. */
  arcSegments?: number;
}

export interface ScentConeResult {
  polygon: GeoJSON.Polygon;
  /** Meters from origin to the cone tip. */
  lengthMeters: number;
  /** Downwind axis heading (0-360). Useful for labels/debug. */
  downwindHeadingDeg: number;
}

/**
 * Scent-cone length as a function of wind speed.
 *
 * - 0 mph  → 160 m  (but buildScentCone returns null below calm threshold)
 * - 5 mph  → 480 m  (~0.3 mi)
 * - 10 mph → 800 m  (~0.5 mi)
 * - 20 mph → 1440 m (~0.9 mi)
 * - 30 mph → 1609 m (cap, 1 mi)
 *
 * Capped at 1 mile so strong-wind cones don't dominate the map.
 */
export function coneLengthForWindSpeed(speedMph: number): number {
  if (speedMph <= 0) return 0;
  const raw = 160 + 64 * speedMph;
  return Math.min(raw, METERS_PER_MILE);
}

/**
 * Calm = wind speeds where direction can't be trusted. Below this,
 * the cone is replaced with a text badge.
 */
export const CALM_THRESHOLD_MPH = 3;

/**
 * Given a start point, bearing, and distance, return the destination
 * lat/lng on a sphere. Direct great-circle destination formula.
 */
export function destinationPoint(
  lat: number,
  lng: number,
  bearingDeg: number,
  distanceMeters: number,
): { lat: number; lng: number } {
  const δ = distanceMeters / EARTH_RADIUS_M; // angular distance
  const θ = bearingDeg * DEG_TO_RAD;
  const φ1 = lat * DEG_TO_RAD;
  const λ1 = lng * DEG_TO_RAD;

  const sinφ1 = Math.sin(φ1);
  const cosφ1 = Math.cos(φ1);
  const sinδ = Math.sin(δ);
  const cosδ = Math.cos(δ);

  const sinφ2 = sinφ1 * cosδ + cosφ1 * sinδ * Math.cos(θ);
  const φ2 = Math.asin(sinφ2);
  const y = Math.sin(θ) * sinδ * cosφ1;
  const x = cosδ - sinφ1 * sinφ2;
  const λ2 = λ1 + Math.atan2(y, x);

  return {
    lat: φ2 * RAD_TO_DEG,
    // Normalize to -180..180
    lng: ((λ2 * RAD_TO_DEG + 540) % 360) - 180,
  };
}

/**
 * Build a scent-cone polygon. Returns `null` when the wind is too weak
 * to model (calm).
 */
export function buildScentCone(
  opts: ScentConeOptions,
): ScentConeResult | null {
  const {
    originLat,
    originLng,
    windFromDirectionDeg,
    windSpeedMph,
    halfAngleDeg = 60,
    lengthMetersOverride,
    arcSegments = 24,
  } = opts;

  if (!Number.isFinite(windSpeedMph) || windSpeedMph < CALM_THRESHOLD_MPH) {
    return null;
  }
  if (
    !Number.isFinite(originLat) ||
    !Number.isFinite(originLng) ||
    !Number.isFinite(windFromDirectionDeg)
  ) {
    return null;
  }

  const length =
    lengthMetersOverride ?? coneLengthForWindSpeed(windSpeedMph);
  if (length <= 0) return null;

  // Wind direction is FROM; scent goes TO opposite direction.
  const downwindHeading = (windFromDirectionDeg + 180) % 360;
  const leftEdgeBearing = (downwindHeading - halfAngleDeg + 360) % 360;

  const vertices: Array<[number, number]> = [];
  // First vertex = origin (cone tip).
  vertices.push([originLng, originLat]);

  // Sweep the arc across the cone's far edge from left to right.
  const totalArcDeg = halfAngleDeg * 2;
  const segments = Math.max(2, arcSegments);
  for (let i = 0; i <= segments; i++) {
    const bearing =
      (leftEdgeBearing + (totalArcDeg * i) / segments + 360) % 360;
    const p = destinationPoint(originLat, originLng, bearing, length);
    vertices.push([p.lng, p.lat]);
  }

  // Close the ring.
  vertices.push([originLng, originLat]);

  return {
    polygon: {
      type: 'Polygon',
      coordinates: [vertices],
    },
    lengthMeters: length,
    downwindHeadingDeg: downwindHeading,
  };
}

/**
 * Cardinal abbreviation for a compass bearing. Handy for legend text.
 * 0° → N, 22.5° → NNE, 45° → NE, etc.
 */
export function bearingToCardinal(deg: number): string {
  const dirs = [
    'N',
    'NNE',
    'NE',
    'ENE',
    'E',
    'ESE',
    'SE',
    'SSE',
    'S',
    'SSW',
    'SW',
    'WSW',
    'W',
    'WNW',
    'NW',
    'NNW',
  ];
  const idx = Math.round(((deg % 360) + 360) / 22.5) % 16;
  return dirs[idx];
}
