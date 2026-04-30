/**
 * MARYLAND_OFFSHORE_BLINDS + closures contract tests.
 *
 * Guards the 4687 MD DNR licensed offshore blind points + 571 offshore
 * closure polygons shipped in Build 7 (2026-04-19). Source: OffshoreBlinds_
 * ord_view (layers 0 and 2).
 *
 * Note: the bbox buffer here is 0.1° wider than the standard 0.05° used
 * elsewhere — offshore blinds are positioned in tidal waters that extend
 * beyond the strict state land boundary.
 */

import {
  MARYLAND_OFFSHORE_BLINDS,
  MARYLAND_OFFSHORE_BLIND_CLOSURES,
} from '../marylandOffshoreBlinds';

const MD_BBOX = {
  latMin: 37.85,
  latMax: 39.78,
  lonMin: -79.55,
  lonMax: -75.00,
};
const BUF = 0.1;

describe('MARYLAND_OFFSHORE_BLINDS', () => {
  it('ships the documented record count (4687)', () => {
    expect(MARYLAND_OFFSHORE_BLINDS.length).toBe(4687);
  });

  it('has unique ids', () => {
    const ids = MARYLAND_OFFSHORE_BLINDS.map((b) => b.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('every coordinate is inside MD bbox (0.1° buffer)', () => {
    for (const b of MARYLAND_OFFSHORE_BLINDS) {
      expect(b.lat).toBeGreaterThanOrEqual(MD_BBOX.latMin - BUF);
      expect(b.lat).toBeLessThanOrEqual(MD_BBOX.latMax + BUF);
      expect(b.lng).toBeGreaterThanOrEqual(MD_BBOX.lonMin - BUF);
      expect(b.lng).toBeLessThanOrEqual(MD_BBOX.lonMax + BUF);
    }
  });

  it('dnrObjectId is a positive integer on every record', () => {
    for (const b of MARYLAND_OFFSHORE_BLINDS) {
      expect(Number.isFinite(b.dnrObjectId)).toBe(true);
      expect(b.dnrObjectId).toBeGreaterThan(0);
    }
  });

  it('licenseNumber, when present, is a positive integer', () => {
    for (const b of MARYLAND_OFFSHORE_BLINDS) {
      if (b.licenseNumber == null) continue;
      expect(Number.isFinite(b.licenseNumber)).toBe(true);
      expect(b.licenseNumber).toBeGreaterThan(0);
    }
  });

  it('licensed-blind coverage: majority of records carry a license number', () => {
    // DNR-authoritative value — should be well above 95%.
    const withLic = MARYLAND_OFFSHORE_BLINDS.filter((b) => b.licenseNumber != null).length;
    expect(withLic).toBeGreaterThanOrEqual(
      Math.floor(MARYLAND_OFFSHORE_BLINDS.length * 0.95)
    );
  });
});

describe('MARYLAND_OFFSHORE_BLIND_CLOSURES', () => {
  it('ships the documented record count (571)', () => {
    expect(MARYLAND_OFFSHORE_BLIND_CLOSURES.length).toBe(571);
  });

  it('has unique ids', () => {
    const ids = MARYLAND_OFFSHORE_BLIND_CLOSURES.map((c) => c.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('every closure has >=1 ring with >=4 points', () => {
    for (const c of MARYLAND_OFFSHORE_BLIND_CLOSURES) {
      expect(c.rings.length).toBeGreaterThanOrEqual(1);
      for (const r of c.rings) {
        expect(r.length).toBeGreaterThanOrEqual(4);
      }
    }
  });

  it('every ring is closed (first coord == last coord)', () => {
    for (const c of MARYLAND_OFFSHORE_BLIND_CLOSURES) {
      for (const r of c.rings) {
        const f = r[0], l = r[r.length - 1];
        expect(f[0]).toBe(l[0]);
        expect(f[1]).toBe(l[1]);
      }
    }
  });

  it('every vertex is inside MD bbox (0.1° buffer)', () => {
    for (const c of MARYLAND_OFFSHORE_BLIND_CLOSURES) {
      for (const r of c.rings) {
        for (const [lng, lat] of r) {
          expect(lat).toBeGreaterThanOrEqual(MD_BBOX.latMin - BUF);
          expect(lat).toBeLessThanOrEqual(MD_BBOX.latMax + BUF);
          expect(lng).toBeGreaterThanOrEqual(MD_BBOX.lonMin - BUF);
          expect(lng).toBeLessThanOrEqual(MD_BBOX.lonMax + BUF);
        }
      }
    }
  });

  it('total closure-polygon vertex count is below mobile budget of 40k', () => {
    let total = 0;
    for (const c of MARYLAND_OFFSHORE_BLIND_CLOSURES) {
      for (const r of c.rings) total += r.length;
    }
    // Emitted at ~29k vertices after DP@15m. 40k floor tolerates ingest churn.
    expect(total).toBeLessThan(40000);
  });
});
