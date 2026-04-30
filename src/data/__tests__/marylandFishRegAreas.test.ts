/**
 * MARYLAND_FISH_REG_AREAS contract tests.
 *
 * Guards the 28 License-Free Fishing Areas + 16 Public Fishery Management
 * Area points shipped in Build 7 (2026-04-19). Regulatory overlay.
 */

import {
  MARYLAND_FISH_REG_AREAS,
  FishRegAreaKind,
} from '../marylandFishRegAreas';

const MD_BBOX = {
  latMin: 37.85,
  latMax: 39.78,
  lonMin: -79.55,
  lonMax: -75.00,
};

const VALID_KINDS: FishRegAreaKind[] = ['license_free', 'public_fma'];

describe('MARYLAND_FISH_REG_AREAS', () => {
  it('ships the documented record count (44 = 28 + 16)', () => {
    expect(MARYLAND_FISH_REG_AREAS.length).toBe(44);
  });

  it('has unique ids', () => {
    const ids = MARYLAND_FISH_REG_AREAS.map((a) => a.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('kind distribution matches DNR pull (license_free:28, public_fma:16)', () => {
    const counts: Record<string, number> = {};
    for (const a of MARYLAND_FISH_REG_AREAS) {
      counts[a.kind] = (counts[a.kind] || 0) + 1;
    }
    expect(counts).toEqual({ license_free: 28, public_fma: 16 });
  });

  it('every area has a non-empty name', () => {
    for (const a of MARYLAND_FISH_REG_AREAS) {
      expect(typeof a.name).toBe('string');
      expect(a.name.length).toBeGreaterThan(0);
    }
  });

  it('every kind is one of the documented literals', () => {
    for (const a of MARYLAND_FISH_REG_AREAS) {
      expect(VALID_KINDS).toContain(a.kind);
    }
  });

  it('every coordinate is inside the MD bounding box', () => {
    for (const a of MARYLAND_FISH_REG_AREAS) {
      expect(a.lat).toBeGreaterThanOrEqual(MD_BBOX.latMin);
      expect(a.lat).toBeLessThanOrEqual(MD_BBOX.latMax);
      expect(a.lng).toBeGreaterThanOrEqual(MD_BBOX.lonMin);
      expect(a.lng).toBeLessThanOrEqual(MD_BBOX.lonMax);
    }
  });

  it('every license_free record carries a COMAR reference', () => {
    const lf = MARYLAND_FISH_REG_AREAS.filter((a) => a.kind === 'license_free');
    for (const a of lf) {
      expect(typeof a.comarReference).toBe('string');
      expect((a.comarReference || '').length).toBeGreaterThan(0);
    }
  });

  it('every public_fma record carries waterbody + county', () => {
    const fmas = MARYLAND_FISH_REG_AREAS.filter((a) => a.kind === 'public_fma');
    for (const a of fmas) {
      expect(typeof a.waterbody).toBe('string');
      expect((a.waterbody || '').length).toBeGreaterThan(0);
      expect(typeof a.county).toBe('string');
      expect((a.county || '').length).toBeGreaterThan(0);
    }
  });
});
