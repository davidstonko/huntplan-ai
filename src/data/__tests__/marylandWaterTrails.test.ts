/**
 * MARYLAND_WATER_TRAILS contract tests.
 *
 * Guards the 134 MD DNR designated paddle/canoe/kayak water trails shipped
 * in Build 7 (2026-04-19). Douglas-Peucker simplified @25m tolerance.
 */

import {
  MARYLAND_WATER_TRAILS,
  WaterTrail,
} from '../marylandWaterTrails';

const MD_BBOX = {
  latMin: 37.85,
  latMax: 39.78,
  lonMin: -79.55,
  lonMax: -75.00,
};

describe('MARYLAND_WATER_TRAILS', () => {
  it('ships the documented record count (134)', () => {
    expect(MARYLAND_WATER_TRAILS.length).toBe(134);
  });

  it('has unique ids', () => {
    const ids = MARYLAND_WATER_TRAILS.map((t) => t.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('every trail has a non-empty name', () => {
    for (const t of MARYLAND_WATER_TRAILS) {
      expect(typeof t.name).toBe('string');
      expect(t.name.length).toBeGreaterThan(0);
    }
  });

  it('every trail has at least one path with >= 2 points', () => {
    for (const t of MARYLAND_WATER_TRAILS) {
      expect(t.paths.length).toBeGreaterThanOrEqual(1);
      for (const p of t.paths) {
        expect(p.length).toBeGreaterThanOrEqual(2);
      }
    }
  });

  // Water trails may briefly cross state line (Potomac ↔ VA, Chesapeake
  // edges), so the bounding box has a 0.05° buffer applied at ingest.
  const BUF = 0.05;
  it('every vertex is inside the MD bounding box (with 0.05° buffer)', () => {
    for (const t of MARYLAND_WATER_TRAILS) {
      for (const path of t.paths) {
        for (const [lng, lat] of path) {
          expect(lat).toBeGreaterThanOrEqual(MD_BBOX.latMin - BUF);
          expect(lat).toBeLessThanOrEqual(MD_BBOX.latMax + BUF);
          expect(lng).toBeGreaterThanOrEqual(MD_BBOX.lonMin - BUF);
          expect(lng).toBeLessThanOrEqual(MD_BBOX.lonMax + BUF);
        }
      }
    }
  });

  it('dnrObjectId is a positive integer on every record', () => {
    for (const t of MARYLAND_WATER_TRAILS) {
      expect(Number.isFinite(t.dnrObjectId)).toBe(true);
      expect(t.dnrObjectId).toBeGreaterThan(0);
    }
  });

  it('hasMapOrGuide is a strict boolean', () => {
    for (const t of MARYLAND_WATER_TRAILS) {
      expect(typeof t.hasMapOrGuide).toBe('boolean');
    }
  });

  it('distance, when present, is a finite positive number', () => {
    for (const t of MARYLAND_WATER_TRAILS) {
      if (t.distance == null) continue;
      expect(typeof t.distance).toBe('number');
      expect(Number.isFinite(t.distance)).toBe(true);
      expect(t.distance).toBeGreaterThan(0);
    }
  });

  it('string-typed fields, when present, are non-empty strings', () => {
    const strFields: Array<keyof WaterTrail> = [
      'region', 'designation', 'type', 'difficulty',
      'county', 'waterbody', 'yearCompleted', 'managedBy', 'moreDetailUrl',
    ];
    for (const t of MARYLAND_WATER_TRAILS) {
      for (const f of strFields) {
        const v = t[f] as string | undefined;
        if (v == null) continue;
        expect(typeof v).toBe('string');
        expect(v.length).toBeGreaterThan(0);
      }
    }
  });

  it('total vertex count is below the mobile bundle budget of 8k', () => {
    let total = 0;
    for (const t of MARYLAND_WATER_TRAILS) {
      for (const p of t.paths) total += p.length;
    }
    // Emitted at 3916 vertices after DP@25m. 8k floor leaves room for
    // future ingests to add regions without blowing the budget.
    expect(total).toBeLessThan(8000);
  });
});
