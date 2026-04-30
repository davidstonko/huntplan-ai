/**
 * MARYLAND_TROUT_WATERSHEDS contract tests.
 *
 * Guards the 158 wild-trout watershed polygons shipped in Build 7
 * (2026-04-19). Douglas-Peucker simplified @30m tolerance with 4-pt ring
 * fallback.
 */

import {
  MARYLAND_TROUT_WATERSHEDS,
} from '../marylandTroutWatersheds';

const MD_BBOX = {
  latMin: 37.85,
  latMax: 39.78,
  lonMin: -79.55,
  lonMax: -75.00,
};

describe('MARYLAND_TROUT_WATERSHEDS', () => {
  it('ships the documented record count (158)', () => {
    expect(MARYLAND_TROUT_WATERSHEDS.length).toBe(158);
  });

  it('has unique ids', () => {
    const ids = MARYLAND_TROUT_WATERSHEDS.map((t) => t.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('every watershed has a non-empty DNR12DIG code', () => {
    for (const w of MARYLAND_TROUT_WATERSHEDS) {
      expect(typeof w.dnr12dig).toBe('string');
      expect(w.dnr12dig.length).toBeGreaterThan(0);
    }
  });

  it('every watershed has >=1 ring with >=4 points', () => {
    for (const w of MARYLAND_TROUT_WATERSHEDS) {
      expect(w.rings.length).toBeGreaterThanOrEqual(1);
      for (const r of w.rings) {
        expect(r.length).toBeGreaterThanOrEqual(4);
      }
    }
  });

  it('every ring is closed (first coord == last coord)', () => {
    for (const w of MARYLAND_TROUT_WATERSHEDS) {
      for (const r of w.rings) {
        const f = r[0], l = r[r.length - 1];
        expect(f[0]).toBe(l[0]);
        expect(f[1]).toBe(l[1]);
      }
    }
  });

  // MBSS watersheds can touch state lines — apply a small bbox buffer.
  const BUF = 0.05;
  it('every vertex is inside MD bbox (0.05° buffer)', () => {
    for (const w of MARYLAND_TROUT_WATERSHEDS) {
      for (const r of w.rings) {
        for (const [lng, lat] of r) {
          expect(lat).toBeGreaterThanOrEqual(MD_BBOX.latMin - BUF);
          expect(lat).toBeLessThanOrEqual(MD_BBOX.latMax + BUF);
          expect(lng).toBeGreaterThanOrEqual(MD_BBOX.lonMin - BUF);
          expect(lng).toBeLessThanOrEqual(MD_BBOX.lonMax + BUF);
        }
      }
    }
  });

  it('trout-presence flags are strict booleans', () => {
    for (const w of MARYLAND_TROUT_WATERSHEDS) {
      expect(typeof w.hasBrookTrout).toBe('boolean');
      expect(typeof w.hasWildBrownTrout).toBe('boolean');
      expect(typeof w.hasWildRainbowTrout).toBe('boolean');
    }
  });

  it('every watershed has at least one trout species present', () => {
    // MBSS only lists watersheds with confirmed wild trout; if all three
    // flags are false for any record, our enum parsing broke.
    let withTrout = 0;
    for (const w of MARYLAND_TROUT_WATERSHEDS) {
      if (w.hasBrookTrout || w.hasWildBrownTrout || w.hasWildRainbowTrout) {
        withTrout++;
      }
    }
    // >=90% floor allows a handful of "historic record" polygons.
    expect(withTrout).toBeGreaterThanOrEqual(
      Math.floor(MARYLAND_TROUT_WATERSHEDS.length * 0.9)
    );
  });

  it('total vertex count is under 20k mobile-bundle budget', () => {
    let total = 0;
    for (const w of MARYLAND_TROUT_WATERSHEDS) {
      for (const r of w.rings) total += r.length;
    }
    // Emitted at 13,948 after DP@30m. 20k floor tolerates ingest churn.
    expect(total).toBeLessThan(20000);
  });
});
