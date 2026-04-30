/**
 * MARYLAND_WATERFOWL_ZONES contract tests.
 *
 * Guards the 2 DNR-published late resident goose zones shipped in Build 7
 * (2026-04-19): Southern Late Residential Goose Zone + Western Late
 * Residential Goose Zone.
 */

import {
  MARYLAND_WATERFOWL_ZONES,
  WaterfowlZoneKind,
} from '../marylandWaterfowlZones';

const MD_BBOX = {
  latMin: 37.85,
  latMax: 39.78,
  lonMin: -79.55,
  lonMax: -75.00,
};
const BUF = 0.1;

const VALID_KINDS: WaterfowlZoneKind[] = [
  'southern_late_residential_goose',
  'western_late_residential_goose',
];

describe('MARYLAND_WATERFOWL_ZONES', () => {
  it('ships the documented record count (2)', () => {
    expect(MARYLAND_WATERFOWL_ZONES.length).toBe(2);
  });

  it('has unique ids', () => {
    const ids = MARYLAND_WATERFOWL_ZONES.map((z) => z.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('kinds are unique across the 2 records', () => {
    const kinds = MARYLAND_WATERFOWL_ZONES.map((z) => z.kind);
    expect(new Set(kinds).size).toBe(kinds.length);
  });

  it('every kind is a documented literal', () => {
    for (const z of MARYLAND_WATERFOWL_ZONES) {
      expect(VALID_KINDS).toContain(z.kind);
    }
  });

  it('every zone has a non-empty name', () => {
    for (const z of MARYLAND_WATERFOWL_ZONES) {
      expect(typeof z.name).toBe('string');
      expect(z.name.length).toBeGreaterThan(0);
    }
  });

  it('every zone has >=1 ring with >=4 points', () => {
    for (const z of MARYLAND_WATERFOWL_ZONES) {
      expect(z.rings.length).toBeGreaterThanOrEqual(1);
      for (const r of z.rings) {
        expect(r.length).toBeGreaterThanOrEqual(4);
      }
    }
  });

  it('every ring is closed', () => {
    for (const z of MARYLAND_WATERFOWL_ZONES) {
      for (const r of z.rings) {
        const f = r[0], l = r[r.length - 1];
        expect(f[0]).toBe(l[0]);
        expect(f[1]).toBe(l[1]);
      }
    }
  });

  it('every vertex is inside MD bbox (0.1° buffer)', () => {
    for (const z of MARYLAND_WATERFOWL_ZONES) {
      for (const r of z.rings) {
        for (const [lng, lat] of r) {
          expect(lat).toBeGreaterThanOrEqual(MD_BBOX.latMin - BUF);
          expect(lat).toBeLessThanOrEqual(MD_BBOX.latMax + BUF);
          expect(lng).toBeGreaterThanOrEqual(MD_BBOX.lonMin - BUF);
          expect(lng).toBeLessThanOrEqual(MD_BBOX.lonMax + BUF);
        }
      }
    }
  });
});
