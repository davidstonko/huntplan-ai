/**
 * MARYLAND_HUNT_LOTTERY_TRACTS + ROADS contract tests.
 *
 * Guards the 2025 DNR Hunting Tract Lottery dataset (2 tract polygons + 3
 * access road polylines) shipped in Build 7 (2026-04-19).
 */

import {
  MARYLAND_HUNT_LOTTERY_TRACTS,
  MARYLAND_HUNT_LOTTERY_ROADS,
} from '../marylandHuntLotteryTracts';

const MD_BBOX = {
  latMin: 37.85,
  latMax: 39.78,
  lonMin: -79.55,
  lonMax: -75.00,
};
const BUF = 0.1;

describe('MARYLAND_HUNT_LOTTERY_TRACTS', () => {
  it('ships the documented record count (2)', () => {
    expect(MARYLAND_HUNT_LOTTERY_TRACTS.length).toBe(2);
  });

  it('has unique ids', () => {
    const ids = MARYLAND_HUNT_LOTTERY_TRACTS.map((t) => t.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('rings are closed + have >=4 pts', () => {
    for (const t of MARYLAND_HUNT_LOTTERY_TRACTS) {
      expect(t.rings.length).toBeGreaterThanOrEqual(1);
      for (const r of t.rings) {
        expect(r.length).toBeGreaterThanOrEqual(4);
        const f = r[0], l = r[r.length - 1];
        expect(f[0]).toBe(l[0]);
        expect(f[1]).toBe(l[1]);
      }
    }
  });

  it('every vertex is inside MD bbox (0.1° buffer)', () => {
    for (const t of MARYLAND_HUNT_LOTTERY_TRACTS) {
      for (const r of t.rings) {
        for (const [lng, lat] of r) {
          expect(lat).toBeGreaterThanOrEqual(MD_BBOX.latMin - BUF);
          expect(lat).toBeLessThanOrEqual(MD_BBOX.latMax + BUF);
          expect(lng).toBeGreaterThanOrEqual(MD_BBOX.lonMin - BUF);
          expect(lng).toBeLessThanOrEqual(MD_BBOX.lonMax + BUF);
        }
      }
    }
  });

  it('acres, when present, is finite and positive', () => {
    for (const t of MARYLAND_HUNT_LOTTERY_TRACTS) {
      if (t.acres == null) continue;
      expect(Number.isFinite(t.acres)).toBe(true);
      expect(t.acres).toBeGreaterThan(0);
    }
  });

  it('pricing fields, when present, are non-negative finite numbers', () => {
    for (const t of MARYLAND_HUNT_LOTTERY_TRACTS) {
      for (const v of [t.pricePerAcre, t.totalPrice]) {
        if (v == null) continue;
        expect(Number.isFinite(v)).toBe(true);
        expect(v).toBeGreaterThanOrEqual(0);
      }
    }
  });
});

describe('MARYLAND_HUNT_LOTTERY_ROADS', () => {
  it('ships the documented record count (3)', () => {
    expect(MARYLAND_HUNT_LOTTERY_ROADS.length).toBe(3);
  });

  it('has unique ids', () => {
    const ids = MARYLAND_HUNT_LOTTERY_ROADS.map((r) => r.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('every road has >=1 path with >=2 points', () => {
    for (const r of MARYLAND_HUNT_LOTTERY_ROADS) {
      expect(r.paths.length).toBeGreaterThanOrEqual(1);
      for (const p of r.paths) {
        expect(p.length).toBeGreaterThanOrEqual(2);
      }
    }
  });

  it('every vertex is inside MD bbox (0.1° buffer)', () => {
    for (const r of MARYLAND_HUNT_LOTTERY_ROADS) {
      for (const p of r.paths) {
        for (const [lng, lat] of p) {
          expect(lat).toBeGreaterThanOrEqual(MD_BBOX.latMin - BUF);
          expect(lat).toBeLessThanOrEqual(MD_BBOX.latMax + BUF);
          expect(lng).toBeGreaterThanOrEqual(MD_BBOX.lonMin - BUF);
          expect(lng).toBeLessThanOrEqual(MD_BBOX.lonMax + BUF);
        }
      }
    }
  });
});
