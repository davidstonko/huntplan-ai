/**
 * trailNavService — snap-to-polyline navigation for the Hike map.
 *
 * V2_3_FEATURE_EXPANSION_PLAN §B.3. Given a hiker's current position
 * and a trail LineString, this module answers:
 *
 *   1. How far off the trail am I? (perpendicular distance in meters)
 *   2. How far along the trail am I? (cumulative distance from the
 *      start vertex to the foot of the perpendicular)
 *   3. What's the heading of the trail at my snap point? (so the HUD
 *      arrow can point the right way)
 *   4. Which of the N available trails am I closest to?
 *
 * Design choices:
 *
 *   - **Equirectangular projection for segment-level math.** At
 *     Maryland latitudes (~38-40°N), a local equirectangular projection
 *     (cosφ) is accurate to within ~0.1% over segment distances
 *     <10 km — far below GPS noise. We keep the haversine for the
 *     final perpendicular distance so the reported meters-off-trail is
 *     correct on a sphere.
 *
 *   - **No @turf dependency.** The whole module is ~150 lines of math.
 *     Skipping turf avoids the ESM/CJS interop pain and keeps the
 *     mobile bundle small. Feel free to swap in @turf/nearest-point-on
 *     -line later if we ever need its 3-D variant; the API was chosen
 *     to match so a swap is mechanical.
 *
 *   - **Returns null on empty trails.** A caller that asks about an
 *     empty LineString or one with <2 points gets `null` so the UI
 *     layer can render "no trail" instead of NaN.
 *
 * @module Services
 */

const EARTH_RADIUS_M = 6_371_000;
const DEG_TO_RAD = Math.PI / 180;
const RAD_TO_DEG = 180 / Math.PI;

export interface TrailSnapResult {
  /** Index of the LineString segment the snap fell on (0 = first segment). */
  segmentIndex: number;
  /** Lat/Lng of the perpendicular-foot point on the trail. */
  snapLat: number;
  snapLng: number;
  /** Meters from the input point to the snap point (great-circle). */
  distanceFromTrailMeters: number;
  /** Cumulative meters along the trail from vertex[0] to the snap point. */
  distanceAlongTrailMeters: number;
  /** Total trail length in meters (sum of all segment great-circles). */
  totalTrailMeters: number;
  /** Heading of the trail at the snap point, 0-360 (0 = north). */
  headingDeg: number;
}

/**
 * Great-circle distance between two lat/lng points on a sphere.
 * Exported for tests.
 */
export function haversineMeters(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
): number {
  const dLat = (lat2 - lat1) * DEG_TO_RAD;
  const dLng = (lng2 - lng1) * DEG_TO_RAD;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * DEG_TO_RAD) *
      Math.cos(lat2 * DEG_TO_RAD) *
      Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_M * Math.asin(Math.sqrt(a));
}

/**
 * Initial bearing from (lat1,lng1) to (lat2,lng2). Degrees, 0-360.
 */
export function initialBearingDeg(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
): number {
  const φ1 = lat1 * DEG_TO_RAD;
  const φ2 = lat2 * DEG_TO_RAD;
  const Δλ = (lng2 - lng1) * DEG_TO_RAD;
  const y = Math.sin(Δλ) * Math.cos(φ2);
  const x =
    Math.cos(φ1) * Math.sin(φ2) -
    Math.sin(φ1) * Math.cos(φ2) * Math.cos(Δλ);
  return ((Math.atan2(y, x) * RAD_TO_DEG) + 360) % 360;
}

/**
 * Project a point onto a 2D segment (in equirectangular meters).
 * Returns the parametric `t` in [0,1] and the foot point's lat/lng.
 */
function projectOntoSegment(
  pointLat: number,
  pointLng: number,
  aLat: number,
  aLng: number,
  bLat: number,
  bLng: number,
): { t: number; snapLat: number; snapLng: number } {
  // Reference latitude for the local flat plane.
  const refLat = (aLat + bLat) / 2;
  const cosLat = Math.cos(refLat * DEG_TO_RAD);

  // Convert all three points to local meters via equirectangular scale.
  const ax = aLng * cosLat;
  const ay = aLat;
  const bx = bLng * cosLat;
  const by = bLat;
  const px = pointLng * cosLat;
  const py = pointLat;

  const abx = bx - ax;
  const aby = by - ay;
  const apx = px - ax;
  const apy = py - ay;
  const abLen2 = abx * abx + aby * aby;
  if (abLen2 === 0) {
    // Degenerate: a==b, snap is just a.
    return { t: 0, snapLat: aLat, snapLng: aLng };
  }
  let t = (apx * abx + apy * aby) / abLen2;
  if (t < 0) t = 0;
  else if (t > 1) t = 1;
  const snapLat = aLat + t * (bLat - aLat);
  const snapLng = aLng + t * (bLng - aLng);
  return { t, snapLat, snapLng };
}

/**
 * Snap a lat/lng to the nearest point on a polyline. Returns null when
 * the polyline has fewer than 2 vertices.
 */
export function snapToPolyline(
  pointLat: number,
  pointLng: number,
  coordinates: Array<[number, number]>,
): TrailSnapResult | null {
  if (!Array.isArray(coordinates) || coordinates.length < 2) return null;

  // Pre-compute cumulative lengths for distanceAlong.
  const segmentLengths: number[] = [];
  const cumulativeAtStart: number[] = [0];
  let total = 0;
  for (let i = 0; i < coordinates.length - 1; i++) {
    const [lngA, latA] = coordinates[i];
    const [lngB, latB] = coordinates[i + 1];
    const d = haversineMeters(latA, lngA, latB, lngB);
    segmentLengths.push(d);
    total += d;
    cumulativeAtStart.push(total);
  }

  let bestIdx = 0;
  let bestDist = Infinity;
  let bestLat = coordinates[0][1];
  let bestLng = coordinates[0][0];
  let bestT = 0;

  for (let i = 0; i < coordinates.length - 1; i++) {
    const [lngA, latA] = coordinates[i];
    const [lngB, latB] = coordinates[i + 1];
    const { t, snapLat, snapLng } = projectOntoSegment(
      pointLat,
      pointLng,
      latA,
      lngA,
      latB,
      lngB,
    );
    const d = haversineMeters(pointLat, pointLng, snapLat, snapLng);
    if (d < bestDist) {
      bestDist = d;
      bestIdx = i;
      bestLat = snapLat;
      bestLng = snapLng;
      bestT = t;
    }
  }

  const segStart = cumulativeAtStart[bestIdx];
  const along = segStart + bestT * segmentLengths[bestIdx];
  const [lngA, latA] = coordinates[bestIdx];
  const [lngB, latB] = coordinates[bestIdx + 1];
  const heading = initialBearingDeg(latA, lngA, latB, lngB);

  return {
    segmentIndex: bestIdx,
    snapLat: bestLat,
    snapLng: bestLng,
    distanceFromTrailMeters: bestDist,
    distanceAlongTrailMeters: along,
    totalTrailMeters: total,
    headingDeg: heading,
  };
}

export interface NearestTrailCandidate {
  trailId: string;
  name?: string;
  coordinates: Array<[number, number]>;
}
export interface NearestTrailResult {
  trail: NearestTrailCandidate;
  snap: TrailSnapResult;
}

/**
 * Given a hiker's position and a list of trails, pick the trail whose
 * closest point is nearest (i.e. the one they're probably on). Returns
 * null when all candidates are empty or the list is empty.
 */
export function findNearestTrail(
  pointLat: number,
  pointLng: number,
  trails: NearestTrailCandidate[],
): NearestTrailResult | null {
  let best: NearestTrailResult | null = null;
  for (const t of trails) {
    const snap = snapToPolyline(pointLat, pointLng, t.coordinates);
    if (!snap) continue;
    if (!best || snap.distanceFromTrailMeters < best.snap.distanceFromTrailMeters) {
      best = { trail: t, snap };
    }
  }
  return best;
}

/**
 * Classify a snap result into an "on-trail" / "near-trail" / "off-trail"
 * state. Thresholds per V2_3_FEATURE_EXPANSION_PLAN §B.3.b: 25 m is the
 * off-trail line.
 */
export type TrailNavStatus = 'on-trail' | 'near-trail' | 'off-trail';
export function classifyTrailStatus(
  snap: TrailSnapResult,
  opts: { onThresholdMeters?: number; nearThresholdMeters?: number } = {},
): TrailNavStatus {
  const onT = opts.onThresholdMeters ?? 10;
  const nearT = opts.nearThresholdMeters ?? 25;
  if (snap.distanceFromTrailMeters <= onT) return 'on-trail';
  if (snap.distanceFromTrailMeters <= nearT) return 'near-trail';
  return 'off-trail';
}
