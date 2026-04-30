/**
 * marylandATTrail contract tests.
 *
 * Guards the MD AT polyline against regression: bbox sanity, south-to-north
 * ordering, length within the IS_APPROXIMATE data-quality gate, and the
 * UX-banner flag.
 */

import {
  MARYLAND_APPALACHIAN_TRAIL,
  AT_POLYLINE_IS_APPROXIMATE,
  TOTAL_AT_MILES,
} from '../marylandATTrail';

// Maryland AT envelope with a small buffer: PA border 39.72°N, Harpers Ferry
// ~39.32°N, longitude mostly -77.75 to -77.48.
const AT_BBOX = {
  latMin: 39.31,
  latMax: 39.73,
  lonMin: -77.78,
  lonMax: -77.45,
};

function haversineMi(a: number[], b: number[]): number {
  const R = 6371000;
  const [lon1, lat1] = a;
  const [lon2, lat2] = b;
  const p1 = (lat1 * Math.PI) / 180;
  const p2 = (lat2 * Math.PI) / 180;
  const dp = ((lat2 - lat1) * Math.PI) / 180;
  const dl = ((lon2 - lon1) * Math.PI) / 180;
  const x =
    Math.sin(dp / 2) ** 2 + Math.cos(p1) * Math.cos(p2) * Math.sin(dl / 2) ** 2;
  return (2 * R * Math.asin(Math.sqrt(x))) / 1609.344;
}

function polylineLengthMi(coords: number[][]): number {
  let total = 0;
  for (let i = 1; i < coords.length; i++) {
    total += haversineMi(coords[i - 1], coords[i]);
  }
  return total;
}

describe('marylandATTrail — data-quality contract', () => {
  const coords = MARYLAND_APPALACHIAN_TRAIL.coordinates;

  it('has at least 100 vertices (surveyed polyline, not waypoint connect-the-dots)', () => {
    expect(coords.length).toBeGreaterThanOrEqual(100);
  });

  it('every vertex sits inside the MD AT bbox', () => {
    for (const [lon, lat] of coords) {
      expect(lat).toBeGreaterThanOrEqual(AT_BBOX.latMin);
      expect(lat).toBeLessThanOrEqual(AT_BBOX.latMax);
      expect(lon).toBeGreaterThanOrEqual(AT_BBOX.lonMin);
      expect(lon).toBeLessThanOrEqual(AT_BBOX.lonMax);
    }
  });

  it('is ordered south-to-north (start lat < end lat)', () => {
    const startLat = coords[0][1];
    const endLat = coords[coords.length - 1][1];
    expect(startLat).toBeLessThan(endLat);
  });

  it('south terminus is near Harpers Ferry (within 2 km)', () => {
    const HARPERS_FERRY = [-77.7276, 39.3239];
    const d = haversineMi(coords[0], HARPERS_FERRY);
    expect(d).toBeLessThan(2 / 1.609); // 2 km
  });

  it('north terminus is at Mason-Dixon monument (within 200 m)', () => {
    const MASON_DIXON = [-77.5077, 39.7199];
    const d = haversineMi(coords[coords.length - 1], MASON_DIXON);
    expect(d).toBeLessThan(0.2 / 1.609); // 200 m
  });

  it('polyline length is within 0.5-2.0x published (IS_APPROXIMATE gate)', () => {
    const computed = polylineLengthMi(coords);
    const ratio = computed / TOTAL_AT_MILES;
    expect(ratio).toBeGreaterThanOrEqual(0.5);
    expect(ratio).toBeLessThanOrEqual(2.0);
  });

  it('approximate-alignment UX banner flag is still set', () => {
    expect(AT_POLYLINE_IS_APPROXIMATE).toBe(true);
  });

  it('TOTAL_AT_MILES reflects the ATC-published segment length', () => {
    // Published MD section is 40.9 mi per ATC.
    expect(TOTAL_AT_MILES).toBeCloseTo(40.9, 1);
  });
});
