/**
 * userMarkup — types for user-drawn LineString and Polygon annotations.
 *
 * V2_3_FEATURE_EXPANSION_PLAN §D.2. The Phase A `UserWaypoint` system
 * already handles points; Phase D.2 adds lines (shoot lanes, route
 * traces, access paths) and polygons (private-property boundaries,
 * honey-hole zones, bedding-area flags). Kept as a separate type so
 * the Point schema stays stable and the draw UI can switch between
 * the two primitives cleanly.
 *
 * Storage note: markups persist to a separate AsyncStorage key from
 * waypoints. This means v1 markups can be added/removed without
 * touching waypoint data — isolating migration risk.
 */

import type { WaypointMode } from './userWaypoint';

export type MarkupShapeType = 'LineString' | 'Polygon';

export type LineStringCoords = Array<[number, number]>;
export type PolygonCoords = Array<Array<[number, number]>>; // rings[]

export interface BaseMarkup {
  id: string;
  createdAt: string;
  updatedAt: string;
  mode: WaypointMode;
  title: string;
  notes?: string;
  /** Hex color. Falls back to DEFAULT_MARKUP_COLOR when absent. */
  color?: string;
  photoUris?: string[];
}

export interface LineStringMarkup extends BaseMarkup {
  shapeType: 'LineString';
  coordinates: LineStringCoords;
}

export interface PolygonMarkup extends BaseMarkup {
  shapeType: 'Polygon';
  coordinates: PolygonCoords;
}

export type UserMarkup = LineStringMarkup | PolygonMarkup;

export const DEFAULT_MARKUP_COLOR = '#f59e0b';

/**
 * Minimum coordinate counts per shape type. A LineString needs at
 * least 2 points; a Polygon's outer ring needs at least 4 (first == last).
 */
export function isValidMarkup(m: UserMarkup): boolean {
  if (!m.coordinates) return false;
  if (m.shapeType === 'LineString') {
    const coords = m.coordinates;
    return (
      Array.isArray(coords) &&
      coords.length >= 2 &&
      coords.every(
        (c) =>
          Array.isArray(c) &&
          c.length === 2 &&
          Number.isFinite(c[0]) &&
          Number.isFinite(c[1]),
      )
    );
  }
  if (m.shapeType === 'Polygon') {
    const rings = m.coordinates;
    if (!Array.isArray(rings) || rings.length === 0) return false;
    const outer = rings[0];
    if (!Array.isArray(outer) || outer.length < 4) return false;
    // First and last coord must be identical (closed ring).
    const first = outer[0];
    const last = outer[outer.length - 1];
    if (first[0] !== last[0] || first[1] !== last[1]) return false;
    return outer.every(
      (c) =>
        Array.isArray(c) &&
        c.length === 2 &&
        Number.isFinite(c[0]) &&
        Number.isFinite(c[1]),
    );
  }
  return false;
}

/**
 * Ensures a polygon's outer ring is closed — appends the first point if
 * not already repeated. Returns the input unchanged if already closed.
 *
 * Draw flows collect user taps and finish with an explicit "close"
 * action; this helper lets the persistence layer be defensive about
 * borderline input.
 */
export function closePolygon(coords: PolygonCoords): PolygonCoords {
  return coords.map((ring) => {
    if (ring.length < 1) return ring;
    const first = ring[0];
    const last = ring[ring.length - 1];
    if (first[0] === last[0] && first[1] === last[1]) return ring;
    return [...ring, [first[0], first[1]] as [number, number]];
  });
}

/**
 * Resolves the display color for a markup — user override or default.
 */
export function resolveMarkupColor(m: UserMarkup): string {
  return m.color ?? DEFAULT_MARKUP_COLOR;
}
