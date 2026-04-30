/**
 * marylandRivers.test.ts — Contract tests for Maryland river polylines
 *
 * These tests lock the shape and integrity of the river dataset:
 *   - All rivers have valid metadata (name, source, date)
 *   - All coordinates fall within Maryland bbox (with slack)
 *   - All coordinates are [lng, lat] pairs (GeoJSON order)
 *   - coordinates field is MultiLineString-shaped (number[][][])
 *   - Summary counts match actual river list
 *
 * As of 2026-04-20, MARYLAND_RIVERS is populated from MD iMAP Hydrography
 * (Rivers and Streams - Generalized). The shape is MultiLineString, so
 * river.coordinates is an array of line segments, each an array of
 * [lng, lat] vertex pairs. The contract below validates every vertex of
 * every segment.
 */

import {
  MARYLAND_RIVERS,
  MARYLAND_RIVERS_SUMMARY,
} from '../marylandRivers';

describe('marylandRivers', () => {
  // Maryland geographic bounds (with 0.25 degree slack for tidal sections).
  // Matches MD_BBOX in scripts/rivers_ingest/emit_ts_from_imap.py.
  const MD_BBOX = {
    south: 37.65,
    north: 40.0,
    west: -79.85,
    east: -74.75,
  };

  it('MARYLAND_RIVERS should be an array', () => {
    expect(Array.isArray(MARYLAND_RIVERS)).toBe(true);
  });

  it('should have summary counts that match river list', () => {
    const byConfidence = { high: 0, medium: 0, low: 0 };

    for (const river of MARYLAND_RIVERS) {
      byConfidence[river.confidence]++;
    }

    expect(MARYLAND_RIVERS_SUMMARY.total).toBe(MARYLAND_RIVERS.length);
    expect(MARYLAND_RIVERS_SUMMARY.byConfidence).toEqual(byConfidence);
  });

  it('should have total miles matching sum of individual rivers', () => {
    const sumMiles = MARYLAND_RIVERS.reduce((acc, r) => acc + r.lengthMi, 0);
    expect(MARYLAND_RIVERS_SUMMARY.totalMiles).toBeCloseTo(sumMiles, 0);
  });

  it('each river should have required metadata fields', () => {
    for (const river of MARYLAND_RIVERS) {
      expect(river.id).toBeDefined();
      expect(typeof river.id).toBe('string');
      expect(river.id.length).toBeGreaterThan(0);

      expect(river.name).toBeDefined();
      expect(typeof river.name).toBe('string');
      expect(river.name.length).toBeGreaterThan(0);

      expect(river.coordinates).toBeDefined();
      expect(Array.isArray(river.coordinates)).toBe(true);

      expect(river.lengthMi).toBeDefined();
      expect(typeof river.lengthMi).toBe('number');
      expect(river.lengthMi).toBeGreaterThan(0);

      expect(river.confidence).toBeDefined();
      expect(['high', 'medium', 'low']).toContain(river.confidence);

      expect(river.isApproximate).toBeDefined();
      expect(typeof river.isApproximate).toBe('boolean');

      expect(river.source).toBeDefined();
      expect(typeof river.source).toBe('string');

      expect(river.sourceUrl).toBeDefined();
      expect(typeof river.sourceUrl).toBe('string');

      expect(river.datePulled).toBeDefined();
      expect(typeof river.datePulled).toBe('string');
      // Should be ISO date format
      expect(/^\d{4}-\d{2}-\d{2}/.test(river.datePulled)).toBe(true);
    }
  });

  it('each river should have at least one segment and every segment at least 2 vertices', () => {
    for (const river of MARYLAND_RIVERS) {
      expect(river.coordinates.length).toBeGreaterThanOrEqual(1);
      for (const segment of river.coordinates) {
        expect(Array.isArray(segment)).toBe(true);
        expect(segment.length).toBeGreaterThanOrEqual(2);
      }
    }
  });

  it('all vertices should be [lng, lat] within Maryland bbox', () => {
    for (const river of MARYLAND_RIVERS) {
      for (const segment of river.coordinates) {
        for (const [lng, lat] of segment) {
          expect(typeof lng).toBe('number');
          expect(typeof lat).toBe('number');

          expect(lng).toBeGreaterThanOrEqual(MD_BBOX.west);
          expect(lng).toBeLessThanOrEqual(MD_BBOX.east);
          expect(lat).toBeGreaterThanOrEqual(MD_BBOX.south);
          expect(lat).toBeLessThanOrEqual(MD_BBOX.north);
        }
      }
    }
  });

  it('confidence should match isApproximate: high = not approximate, medium/low = approximate', () => {
    for (const river of MARYLAND_RIVERS) {
      if (river.confidence === 'high') {
        expect(river.isApproximate).toBe(false);
      } else {
        expect(river.isApproximate).toBe(true);
      }
    }
  });

  it('source should be one of the known sources', () => {
    const validSources = [
      'OSM Overpass',
      'USGS NHD',
      'MD DNR',
      'MD iMAP',
      'USGS National Trails',
      'Mixed',
    ];

    for (const river of MARYLAND_RIVERS) {
      expect(validSources.some(s => river.source.includes(s))).toBe(true);
    }
  });

  it('sourceUrl should start with http', () => {
    for (const river of MARYLAND_RIVERS) {
      expect(
        river.sourceUrl.startsWith('http://') ||
          river.sourceUrl.startsWith('https://')
      ).toBe(true);
    }
  });

  it('vertexCount should match actual vertex total across segments', () => {
    for (const river of MARYLAND_RIVERS) {
      const actualVerts = river.coordinates.reduce(
        (acc, seg) => acc + seg.length,
        0
      );
      expect(river.vertexCount).toBe(actualVerts);
    }
  });

  it('segmentCount should match coordinates.length', () => {
    for (const river of MARYLAND_RIVERS) {
      expect(river.segmentCount).toBe(river.coordinates.length);
    }
  });
});
