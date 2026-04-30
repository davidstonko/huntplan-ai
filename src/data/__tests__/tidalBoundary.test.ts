/**
 * tidalBoundary contract tests.
 *
 * Guards the Wave 5C DNR tidal / non-tidal boundary dataset against ingest
 * regression. These segments are the regulatory demarcation between
 * saltwater and freshwater licensing — a user silently seeing the wrong
 * side of a dam could think they can legally keep an undersized striper.
 *
 * Contract:
 *   • Exactly 100 segments — matches the header comment and Wave 5C ingest
 *     log. A silent count drift should flip this test, not ship.
 *   • Unique ids — the Mapbox LineLayer keys on id.
 *   • Every segment has ≥ 2 coordinate pairs (enough to draw a line).
 *   • Every coordinate is a [lng, lat] pair inside the MD bbox.
 *   • No Null Island coordinates.
 *   • No NaN / non-finite coordinates.
 */

import { TIDAL_BOUNDARY } from '../tidalBoundary';

const MD_BBOX = {
  latMin: 37.85,
  latMax: 39.78,
  lonMin: -79.55,
  lonMax: -75.00,
};

describe('tidalBoundary', () => {
  it('ships the documented segment count (100)', () => {
    expect(TIDAL_BOUNDARY.length).toBe(100);
  });

  it('has unique ids', () => {
    const ids = TIDAL_BOUNDARY.map((s) => s.id);
    const set = new Set(ids);
    expect(set.size).toBe(ids.length);
  });

  it('every segment has a non-empty id', () => {
    for (const s of TIDAL_BOUNDARY) {
      expect(typeof s.id).toBe('string');
      expect(s.id.length).toBeGreaterThan(0);
    }
  });

  it('every segment has at least 2 coordinate pairs', () => {
    for (const s of TIDAL_BOUNDARY) {
      expect(Array.isArray(s.coordinates)).toBe(true);
      expect(s.coordinates.length).toBeGreaterThanOrEqual(2);
    }
  });

  it('every coordinate is a [lng, lat] pair of finite numbers', () => {
    for (const s of TIDAL_BOUNDARY) {
      for (const pt of s.coordinates) {
        expect(Array.isArray(pt)).toBe(true);
        expect(pt.length).toBe(2);
        const [lng, lat] = pt;
        expect(typeof lng).toBe('number');
        expect(typeof lat).toBe('number');
        expect(Number.isFinite(lng)).toBe(true);
        expect(Number.isFinite(lat)).toBe(true);
      }
    }
  });

  it('every coordinate is inside the Maryland bounding box', () => {
    for (const s of TIDAL_BOUNDARY) {
      for (const [lng, lat] of s.coordinates) {
        expect(lat).toBeGreaterThanOrEqual(MD_BBOX.latMin);
        expect(lat).toBeLessThanOrEqual(MD_BBOX.latMax);
        expect(lng).toBeGreaterThanOrEqual(MD_BBOX.lonMin);
        expect(lng).toBeLessThanOrEqual(MD_BBOX.lonMax);
      }
    }
  });

  it('no coordinate is on Null Island (0, 0)', () => {
    for (const s of TIDAL_BOUNDARY) {
      for (const [lng, lat] of s.coordinates) {
        expect(Math.abs(lat) + Math.abs(lng)).toBeGreaterThan(1);
      }
    }
  });

  it('waterBody or description, when present, is a non-empty string', () => {
    for (const s of TIDAL_BOUNDARY) {
      if (s.waterBody !== undefined) {
        expect(typeof s.waterBody).toBe('string');
        expect(s.waterBody.length).toBeGreaterThan(0);
      }
      if (s.description !== undefined) {
        expect(typeof s.description).toBe('string');
        expect(s.description.length).toBeGreaterThan(0);
      }
    }
  });
});
