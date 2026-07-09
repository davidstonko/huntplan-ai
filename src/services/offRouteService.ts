/**
 * offRouteService — "wrong turn" / off-route detection (AllTrails-style safety).
 *
 * Given a route to follow (a saved GPS track or drawn route) and the user's live
 * location, decide whether they've strayed off the line and by how far. Pure
 * geometry + a hysteresis state machine so a single noisy fix near the threshold
 * doesn't spam "off route / on route / off route." The hook layer feeds this live
 * GPS and turns transitions into a vibrate + banner.
 *
 * Coordinates use the app's `{lat, lng}` convention (same as TrackSample), NOT
 * GeoJSON tuples. Distances are meters.
 */
import { haversineMeters } from '../types/track';

export interface LatLng {
  lat: number;
  lng: number;
}

/**
 * Distance in meters from point `p` to the segment `a→b`, via a local
 * equirectangular projection about `a`. Well under 1% error over the hundreds of
 * meters that matter here.
 */
export function pointToSegmentMeters(p: LatLng, a: LatLng, b: LatLng): number {
  const mPerDegLat = 111320;
  const mPerDegLng = 111320 * Math.cos((a.lat * Math.PI) / 180);
  // Local planar coords in meters, origin at `a`.
  const bx = (b.lng - a.lng) * mPerDegLng;
  const by = (b.lat - a.lat) * mPerDegLat;
  const px = (p.lng - a.lng) * mPerDegLng;
  const py = (p.lat - a.lat) * mPerDegLat;
  const segLen2 = bx * bx + by * by;
  if (segLen2 === 0) return haversineMeters(p.lat, p.lng, a.lat, a.lng); // a === b
  let t = (px * bx + py * by) / segLen2;
  t = Math.max(0, Math.min(1, t));
  const cx = t * bx;
  const cy = t * by;
  const ex = px - cx;
  const ey = py - cy;
  return Math.sqrt(ex * ex + ey * ey);
}

/** Minimum distance in meters from `p` to a route polyline. */
export function distanceToRouteMeters(p: LatLng, route: LatLng[]): number {
  if (route.length === 0) return Infinity;
  if (route.length === 1) {
    return haversineMeters(p.lat, p.lng, route[0].lat, route[0].lng);
  }
  let min = Infinity;
  for (let i = 1; i < route.length; i++) {
    const d = pointToSegmentMeters(p, route[i - 1], route[i]);
    if (d < min) min = d;
  }
  return min;
}

export interface OffRouteOptions {
  /** Cross this distance from the line to be flagged OFF-route. Default 50 m. */
  offThresholdM?: number;
  /** Come back within this to clear it (hysteresis, < offThreshold). Default 25 m. */
  onThresholdM?: number;
}

export type OffRouteTransition = 'went-off' | 'came-back' | 'none';

export interface OffRouteResult {
  distanceMeters: number;
  offRoute: boolean;
  transition: OffRouteTransition;
}

/**
 * Evaluate a new location against the route given the previous off/on state.
 * Hysteresis: once off-route you must get back within `onThreshold` to clear,
 * and once on-route you must exceed `offThreshold` to trip — so a fix hovering
 * at the boundary won't flap.
 */
export function assessOffRoute(
  p: LatLng,
  route: LatLng[],
  wasOffRoute: boolean,
  opts: OffRouteOptions = {},
): OffRouteResult {
  const off = opts.offThresholdM ?? 50;
  const on = opts.onThresholdM ?? 25;
  const distanceMeters = distanceToRouteMeters(p, route);

  let offRoute = wasOffRoute;
  if (wasOffRoute) {
    if (distanceMeters <= on) offRoute = false;
  } else if (distanceMeters > off) {
    offRoute = true;
  }

  const transition: OffRouteTransition =
    offRoute && !wasOffRoute
      ? 'went-off'
      : !offRoute && wasOffRoute
        ? 'came-back'
        : 'none';

  return { distanceMeters, offRoute, transition };
}

/** Convert an array of TrackSample-like points to the LatLng[] this service wants. */
export function toRouteCoords(
  samples: { lat: number; lng: number }[],
): LatLng[] {
  return samples.map((s) => ({ lat: s.lat, lng: s.lng }));
}
