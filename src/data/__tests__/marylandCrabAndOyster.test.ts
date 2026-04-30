/**
 * marylandCrabAndOyster contract tests.
 *
 * Guards the two regulatory fishing/crabbing overlays (Crab Pot Boundaries +
 * Natural Oyster Bars) shipped in Build 7 (2026-04-19).
 */

import {
  MARYLAND_CRAB_POT_BOUNDARIES,
  MARYLAND_NATURAL_OYSTER_BARS,
  CrabPotBoundaryPoint,
  NaturalOysterBar,
} from '../marylandCrabAndOyster';

const MD_BBOX = {
  latMin: 37.85,
  latMax: 39.78,
  lonMin: -79.55,
  lonMax: -75.00,
};

const VALID_REGIONS: CrabPotBoundaryPoint['region'][] = ['LES', 'LWS', 'POT', 'UWS', 'UES'];

describe('MARYLAND_CRAB_POT_BOUNDARIES', () => {
  it('ships the documented record count (312)', () => {
    expect(MARYLAND_CRAB_POT_BOUNDARIES.length).toBe(312);
  });

  it('has unique ids', () => {
    const ids = MARYLAND_CRAB_POT_BOUNDARIES.map((p) => p.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('every point is inside the Maryland bounding box', () => {
    for (const p of MARYLAND_CRAB_POT_BOUNDARIES) {
      expect(p.lat).toBeGreaterThanOrEqual(MD_BBOX.latMin);
      expect(p.lat).toBeLessThanOrEqual(MD_BBOX.latMax);
      expect(p.lng).toBeGreaterThanOrEqual(MD_BBOX.lonMin);
      expect(p.lng).toBeLessThanOrEqual(MD_BBOX.lonMax);
    }
  });

  it('every point has non-empty identifier fields', () => {
    for (const p of MARYLAND_CRAB_POT_BOUNDARIES) {
      expect(typeof p.pointName).toBe('string');
      expect(p.pointName.length).toBeGreaterThan(0);
      expect(typeof p.comarReference).toBe('string');
      expect(p.comarReference.length).toBeGreaterThan(0);
      expect(typeof p.waterbody).toBe('string');
    }
  });

  it('every region is one of the 5 DNR codes', () => {
    for (const p of MARYLAND_CRAB_POT_BOUNDARIES) {
      expect(VALID_REGIONS).toContain(p.region);
    }
  });

  it('distribution matches DNR pull (LES:137 LWS:65 POT:51 UWS:31 UES:28)', () => {
    const counts: Record<string, number> = {};
    for (const p of MARYLAND_CRAB_POT_BOUNDARIES) {
      counts[p.region] = (counts[p.region] || 0) + 1;
    }
    expect(counts).toEqual({ LES: 137, LWS: 65, POT: 51, UWS: 31, UES: 28 });
  });
});

describe('MARYLAND_NATURAL_OYSTER_BARS', () => {
  it('ships the documented record count (381)', () => {
    expect(MARYLAND_NATURAL_OYSTER_BARS.length).toBe(381);
  });

  it('has unique ids', () => {
    const ids = MARYLAND_NATURAL_OYSTER_BARS.map((o) => o.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('every polygon has at least one ring with at least 4 points', () => {
    for (const o of MARYLAND_NATURAL_OYSTER_BARS) {
      expect(o.rings.length).toBeGreaterThanOrEqual(1);
      for (const ring of o.rings) {
        expect(ring.length).toBeGreaterThanOrEqual(4);
      }
    }
  });

  it('every ring is closed (first coord == last coord)', () => {
    for (const o of MARYLAND_NATURAL_OYSTER_BARS) {
      for (const ring of o.rings) {
        const first = ring[0];
        const last = ring[ring.length - 1];
        expect(first[0]).toBe(last[0]);
        expect(first[1]).toBe(last[1]);
      }
    }
  });

  it('every vertex is inside the Maryland bounding box', () => {
    for (const o of MARYLAND_NATURAL_OYSTER_BARS) {
      for (const ring of o.rings) {
        for (const [lng, lat] of ring) {
          expect(lat).toBeGreaterThanOrEqual(MD_BBOX.latMin);
          expect(lat).toBeLessThanOrEqual(MD_BBOX.latMax);
          expect(lng).toBeGreaterThanOrEqual(MD_BBOX.lonMin);
          expect(lng).toBeLessThanOrEqual(MD_BBOX.lonMax);
        }
      }
    }
  });

  it('every NOB has a non-empty name', () => {
    for (const o of MARYLAND_NATURAL_OYSTER_BARS) {
      expect(typeof o.name).toBe('string');
      expect(o.name.length).toBeGreaterThan(0);
    }
  });

  it('total vertex count is below the mobile-bundle budget of 10k', () => {
    // Simplification at 20m tolerance produced ~7000 vertices. A floor of
    // 10k lets us tighten further; this test fails loudly if a future
    // ingest accidentally re-adds the raw 64k vertices.
    let total = 0;
    for (const o of MARYLAND_NATURAL_OYSTER_BARS) {
      for (const ring of o.rings) {
        total += ring.length;
      }
    }
    expect(total).toBeLessThan(10000);
  });
});
