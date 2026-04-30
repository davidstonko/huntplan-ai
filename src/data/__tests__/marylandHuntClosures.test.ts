/**
 * MARYLAND_HUNT_CLOSURES contract tests.
 *
 * Guards 11 polygons shipped in Build 7 (2026-04-19): 6 public-harvest
 * closures, 1 Manokin River oyster sanctuary, 4 "new hunting area" polygons.
 */

import {
  MARYLAND_HUNT_CLOSURES,
  HuntClosureKind,
} from '../marylandHuntClosures';

const MD_BBOX = {
  latMin: 37.85,
  latMax: 39.78,
  lonMin: -79.55,
  lonMax: -75.00,
};
const BUF = 0.1;

const VALID_KINDS: HuntClosureKind[] = [
  'public_harvest_closure',
  'oyster_sanctuary',
  'new_hunting_area',
];

describe('MARYLAND_HUNT_CLOSURES', () => {
  it('ships the documented record count (11)', () => {
    expect(MARYLAND_HUNT_CLOSURES.length).toBe(11);
  });

  it('has unique ids', () => {
    const ids = MARYLAND_HUNT_CLOSURES.map((c) => c.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('distribution matches DNR pull (harvest:6, sanctuary:1, new_hunting:4)', () => {
    const counts: Record<string, number> = {};
    for (const c of MARYLAND_HUNT_CLOSURES) {
      counts[c.kind] = (counts[c.kind] || 0) + 1;
    }
    expect(counts).toEqual({
      public_harvest_closure: 6,
      oyster_sanctuary: 1,
      new_hunting_area: 4,
    });
  });

  it('every kind is a documented literal', () => {
    for (const c of MARYLAND_HUNT_CLOSURES) {
      expect(VALID_KINDS).toContain(c.kind);
    }
  });

  it('every closure has non-empty name + >=1 ring >=4 pts', () => {
    for (const c of MARYLAND_HUNT_CLOSURES) {
      expect(typeof c.name).toBe('string');
      expect(c.name.length).toBeGreaterThan(0);
      expect(c.rings.length).toBeGreaterThanOrEqual(1);
      for (const r of c.rings) {
        expect(r.length).toBeGreaterThanOrEqual(4);
      }
    }
  });

  it('every ring is closed', () => {
    for (const c of MARYLAND_HUNT_CLOSURES) {
      for (const r of c.rings) {
        const f = r[0], l = r[r.length - 1];
        expect(f[0]).toBe(l[0]);
        expect(f[1]).toBe(l[1]);
      }
    }
  });

  it('every vertex is inside MD bbox (0.1° buffer)', () => {
    for (const c of MARYLAND_HUNT_CLOSURES) {
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

  it('public_harvest_closure records carry a URL (DNR publishes the notice PDF)', () => {
    const harvests = MARYLAND_HUNT_CLOSURES.filter((c) => c.kind === 'public_harvest_closure');
    // Floor of 5 out of 6 — DNR occasionally publishes a notice without a URL.
    const withUrl = harvests.filter((c) => c.url != null && c.url.length > 0).length;
    expect(withUrl).toBeGreaterThanOrEqual(5);
  });

  it('startDate, when present, is an ISO date (YYYY-MM-DD)', () => {
    for (const c of MARYLAND_HUNT_CLOSURES) {
      if (c.startDate == null) continue;
      expect(c.startDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    }
  });

  it('total closure-polygon vertex count is under 6k', () => {
    let total = 0;
    for (const c of MARYLAND_HUNT_CLOSURES) {
      for (const r of c.rings) total += r.length;
    }
    // Emitted at ~2400 vertices (Manokin raw was 225k). 6k floor gives room
    // for DNR to publish additional closures without re-simplification.
    expect(total).toBeLessThan(6000);
  });
});
