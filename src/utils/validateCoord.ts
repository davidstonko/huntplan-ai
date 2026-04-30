/**
 * validateCoord — Coordinate validation utilities for Maryland outdoor app.
 *
 * Provides runtime guards for lat/lng values before they are rendered on
 * a Mapbox map or stored in a log. Protects against NaN, Infinity, off-planet
 * values, and (optionally) out-of-state coordinates.
 *
 * Used primarily by the Hunt and Fish map screens and the harvest/catch logs.
 */

/**
 * Maryland bounding box (approximate, includes coastal and mountain extremes).
 * Slightly padded so coordinates slightly outside the border do not fail.
 */
export const MD_BOUNDS = {
  minLat: 37.88,
  maxLat: 39.73,
  minLng: -79.49,
  maxLng: -74.99,
} as const;

/**
 * Basic validity check — finite, numeric, and within -90/90 and -180/180.
 */
export function isValidCoord(lat: unknown, lng: unknown): boolean {
  if (typeof lat !== 'number' || typeof lng !== 'number') return false;
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return false;
  if (lat < -90 || lat > 90) return false;
  if (lng < -180 || lng > 180) return false;
  return true;
}

/**
 * Maryland-bounds check — returns true if the coordinate is within the
 * padded MD bounding box. Use for warnings only (not hard rejections),
 * since edge cases like the Potomac or Atlantic coast may be near-border.
 */
export function isInMaryland(lat: number, lng: number): boolean {
  return (
    lat >= MD_BOUNDS.minLat &&
    lat <= MD_BOUNDS.maxLat &&
    lng >= MD_BOUNDS.minLng &&
    lng <= MD_BOUNDS.maxLng
  );
}

/**
 * Assertion helper: throws if coordinate is invalid. Use when a
 * downstream API would crash or silently misrender.
 */
export function assertValidCoord(lat: unknown, lng: unknown, context = 'coordinate'): void {
  if (!isValidCoord(lat, lng)) {
    throw new Error(
      `Invalid ${context}: lat=${String(lat)} lng=${String(lng)} — expected finite numbers within -90..90 / -180..180`,
    );
  }
}

/**
 * Safe coercion — returns the coordinate if valid, otherwise null.
 * Use when filtering a dataset that may contain occasional bad rows.
 */
export function coerceCoord(lat: unknown, lng: unknown): { lat: number; lng: number } | null {
  if (!isValidCoord(lat, lng)) return null;
  return { lat: lat as number, lng: lng as number };
}

/**
 * Rounds a coordinate to a sensible precision for display (5 decimals ≈ 1.1m).
 */
export function formatCoord(lat: number, lng: number, precision = 5): string {
  if (!isValidCoord(lat, lng)) return '—';
  return `${lat.toFixed(precision)}, ${lng.toFixed(precision)}`;
}
