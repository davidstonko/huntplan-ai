/**
 * marylandPublicLands contract tests.
 *
 * Guards the Build 9 public-lands dataset against ingest regression:
 *   • Exactly 192 hunting lands + 14 shooting ranges (206 total).
 *   • id uniqueness within each list AND across both lists.
 *   • designation is one of the 11 allowed LandDesignation values.
 *   • county and name are non-empty strings.
 *   • center (when present) is a [lng, lat] pair inside the MD bbox.
 *   • geometry coordinates (when present) are all inside the MD bbox.
 *   • boundaryApproximate, when set, is a strict boolean.
 *   • DATA_STATS totals match the actual array lengths.
 *
 * MD_BBOX is widened vs. the angler test because some lands (e.g. western
 * state forests) sit very close to the border.
 */

import {
  marylandPublicLands,
  shootingRanges,
  DATA_STATS,
  type MarylandPublicLand,
  type LandDesignation,
} from '../marylandPublicLands';

const MD_BBOX = {
  latMin: 37.85,
  latMax: 39.78,
  lonMin: -79.55,
  lonMax: -75.00,
};

const VALID_DESIGNATIONS: LandDesignation[] = [
  'WMA', 'CWMA', 'CFL', 'FMA', 'MNCPPC', 'NEA', 'NRMA', 'SF', 'SP', 'Federal', 'Range',
];

// Recursively walk a GeoJSON-like coordinates tree and yield every [lon, lat] pair.
function* walkCoords(node: any): Generator<[number, number]> {
  if (!Array.isArray(node)) return;
  if (
    node.length === 2 &&
    typeof node[0] === 'number' &&
    typeof node[1] === 'number'
  ) {
    yield node as [number, number];
    return;
  }
  for (const child of node) {
    yield* walkCoords(child);
  }
}

describe('marylandPublicLands — land records', () => {
  it('ships exactly 192 hunting lands', () => {
    expect(marylandPublicLands.length).toBe(192);
  });

  it('has unique land ids', () => {
    const ids = marylandPublicLands.map((l) => l.id);
    const set = new Set(ids);
    expect(set.size).toBe(ids.length);
  });

  it('every land has non-empty name, county, designation, designationFull', () => {
    for (const l of marylandPublicLands) {
      expect(typeof l.name).toBe('string');
      expect(l.name.length).toBeGreaterThan(0);
      expect(typeof l.county).toBe('string');
      expect(l.county.length).toBeGreaterThan(0);
      expect(typeof l.designation).toBe('string');
      expect(l.designation.length).toBeGreaterThan(0);
      expect(typeof l.designationFull).toBe('string');
      expect(l.designationFull.length).toBeGreaterThan(0);
    }
  });

  it('every designation is one of the 11 allowed values', () => {
    for (const l of marylandPublicLands) {
      expect(VALID_DESIGNATIONS).toContain(l.designation);
    }
  });

  it('huntableSpecies and allowedWeapons are arrays of strings', () => {
    for (const l of marylandPublicLands) {
      expect(Array.isArray(l.huntableSpecies)).toBe(true);
      expect(Array.isArray(l.allowedWeapons)).toBe(true);
      for (const s of l.huntableSpecies) expect(typeof s).toBe('string');
      for (const w of l.allowedWeapons) expect(typeof w).toBe('string');
    }
  });

  it('reservation/permit/flags are strict booleans', () => {
    for (const l of marylandPublicLands) {
      expect(typeof l.reservationRequired).toBe('boolean');
      expect(typeof l.freePermitRequired).toBe('boolean');
      expect(typeof l.sundayHunting).toBe('boolean');
      expect(typeof l.mobilityImpaired).toBe('boolean');
      expect(typeof l.vehicleHunting).toBe('boolean');
      expect(typeof l.trappingAllowed).toBe('boolean');
      expect(typeof l.shootingRange).toBe('boolean');
      expect(typeof l.boatAccessOnly).toBe('boolean');
    }
  });

  it('boundaryApproximate, when present, is a strict boolean', () => {
    for (const l of marylandPublicLands) {
      if (l.boundaryApproximate !== undefined) {
        expect(typeof l.boundaryApproximate).toBe('boolean');
      }
    }
  });

  it('center (when present) is a [lng, lat] pair inside MD bbox', () => {
    for (const l of marylandPublicLands) {
      if (l.center == null) continue;
      expect(Array.isArray(l.center)).toBe(true);
      expect(l.center.length).toBe(2);
      const [lng, lat] = l.center;
      expect(typeof lng).toBe('number');
      expect(typeof lat).toBe('number');
      expect(lat).toBeGreaterThanOrEqual(MD_BBOX.latMin);
      expect(lat).toBeLessThanOrEqual(MD_BBOX.latMax);
      expect(lng).toBeGreaterThanOrEqual(MD_BBOX.lonMin);
      expect(lng).toBeLessThanOrEqual(MD_BBOX.lonMax);
    }
  });

  it('geometry coordinates (when present) are all inside MD bbox', () => {
    for (const l of marylandPublicLands) {
      if (!l.geometry) continue;
      for (const [lng, lat] of walkCoords(l.geometry.coordinates)) {
        expect(lat).toBeGreaterThanOrEqual(MD_BBOX.latMin);
        expect(lat).toBeLessThanOrEqual(MD_BBOX.latMax);
        expect(lng).toBeGreaterThanOrEqual(MD_BBOX.lonMin);
        expect(lng).toBeLessThanOrEqual(MD_BBOX.lonMax);
      }
    }
  });

  it('every land has either a geometry or a center — never both null (so the map can show it)', () => {
    for (const l of marylandPublicLands) {
      const geomPresent = l.geometry != null;
      const centerPresent = l.center != null;
      expect(geomPresent || centerPresent).toBe(true);
    }
  });

  it('parking (when present) is an array of ParkingLocation objects', () => {
    for (const l of marylandPublicLands) {
      if (l.parking == null) continue;
      expect(Array.isArray(l.parking)).toBe(true);
      for (const p of l.parking) {
        expect(typeof p.description).toBe('string');
        if (p.lat != null || p.lng != null) {
          expect(typeof p.lat).toBe('number');
          expect(typeof p.lng).toBe('number');
          expect(p.lat!).toBeGreaterThanOrEqual(MD_BBOX.latMin);
          expect(p.lat!).toBeLessThanOrEqual(MD_BBOX.latMax);
          expect(p.lng!).toBeGreaterThanOrEqual(MD_BBOX.lonMin);
          expect(p.lng!).toBeLessThanOrEqual(MD_BBOX.lonMax);
        }
      }
    }
  });
});

describe('marylandPublicLands — shooting ranges', () => {
  it('ships exactly 14 shooting ranges', () => {
    expect(shootingRanges.length).toBe(14);
  });

  it('has unique range ids', () => {
    const ids = shootingRanges.map((r) => r.id);
    const set = new Set(ids);
    expect(set.size).toBe(ids.length);
  });

  it('every range has non-empty name and county', () => {
    for (const r of shootingRanges) {
      expect(typeof r.name).toBe('string');
      expect(r.name.length).toBeGreaterThan(0);
      expect(typeof r.county).toBe('string');
      expect(r.county.length).toBeGreaterThan(0);
    }
  });

  it('every range has rangeTypes array and isPublic boolean', () => {
    for (const r of shootingRanges) {
      expect(Array.isArray(r.rangeTypes)).toBe(true);
      expect(r.rangeTypes.length).toBeGreaterThan(0);
      expect(typeof r.isPublic).toBe('boolean');
    }
  });

  it('center (when present) is a [lng, lat] pair inside MD bbox', () => {
    for (const r of shootingRanges) {
      if (r.center == null) continue;
      expect(Array.isArray(r.center)).toBe(true);
      expect(r.center.length).toBe(2);
      const [lng, lat] = r.center;
      expect(lat).toBeGreaterThanOrEqual(MD_BBOX.latMin);
      expect(lat).toBeLessThanOrEqual(MD_BBOX.latMax);
      expect(lng).toBeGreaterThanOrEqual(MD_BBOX.lonMin);
      expect(lng).toBeLessThanOrEqual(MD_BBOX.lonMax);
    }
  });
});

describe('marylandPublicLands — QC gate (fabricated-boundary ban)', () => {
  /**
   * On 2026-04-24 the user flagged that 49 "approximate" boundaries were
   * shipping as literal diamond / octagon polygons — fabricated shapes that
   * did not match the underlying land at all (e.g. a diamond overlaid on
   * Prettyboy Reservoir that lit up parts of the reservoir that aren't
   * even the land). The 2026-04-17 mitigation (dashed stroke + banner)
   * was insufficient because the shape itself was the lie.
   *
   * The correct UX for "we don't have a real boundary" is: show a
   * centroid PIN, with a link to the authoritative DNR PDF on the detail
   * sheet. NOT a fake polygon.
   *
   * These tests lock that contract so the fabricated-polygon class of bug
   * cannot regress.
   */

  it('ZERO lands ship as approximate boundary WITH a geometry — approximates must be pin-only', () => {
    const violators = marylandPublicLands.filter(
      (l) => l.boundaryApproximate === true && l.geometry != null,
    );
    // If this trips, someone re-introduced a fabricated-diamond/octagon.
    // Either remove the fake geometry (set to null) or, if you have a
    // REAL boundary for this land, remove the boundaryApproximate flag.
    expect(violators.map((v) => v.id)).toEqual([]);
  });

  it('no geometrySource mentions diamond/octagon/placeholder/stub for an entry still carrying geometry', () => {
    const bad = marylandPublicLands.filter((l) => {
      if (l.geometry == null) return false;
      const src = (l.geometrySource ?? '').toLowerCase();
      return (
        src.includes('diamond') ||
        src.includes('octagon') ||
        src.includes('placeholder') ||
        src.includes('stub') ||
        src.includes('hand-trace')
      );
    });
    expect(bad.map((v) => ({ id: v.id, src: v.geometrySource }))).toEqual([]);
  });

  it('every pin-only or approximate land still has a valid center (so the map can pin it)', () => {
    const pinOnly = marylandPublicLands.filter(
      (l) => l.geometry == null || l.boundaryApproximate === true,
    );
    for (const l of pinOnly) {
      expect(l.center).not.toBeNull();
      expect(l.center).toHaveLength(2);
      const [lng, lat] = l.center!;
      expect(typeof lng).toBe('number');
      expect(typeof lat).toBe('number');
    }
  });
});

describe('marylandPublicLands — cross-file invariants', () => {
  it('land ids and range ids do not collide', () => {
    const landIds = new Set(marylandPublicLands.map((l) => l.id));
    for (const r of shootingRanges) {
      expect(landIds.has(r.id)).toBe(false);
    }
  });

  it('DATA_STATS.totalLands matches marylandPublicLands.length', () => {
    expect(DATA_STATS.totalLands).toBe(marylandPublicLands.length);
  });

  it('DATA_STATS.totalRanges matches shootingRanges.length', () => {
    expect(DATA_STATS.totalRanges).toBe(shootingRanges.length);
  });

  it('DATA_STATS.withPolygons matches lands with geometry', () => {
    const actual = marylandPublicLands.filter((l: MarylandPublicLand) => l.geometry !== null).length;
    expect(DATA_STATS.withPolygons).toBe(actual);
  });

  it('DATA_STATS.landsByDesignation values sum to ≤ totalLands', () => {
    const sum = Object.values(DATA_STATS.landsByDesignation).reduce(
      (a: number, b: number) => a + b,
      0,
    );
    // ≤ because DATA_STATS only enumerates 8 designations (no Federal/SP/Range breakouts).
    expect(sum).toBeLessThanOrEqual(DATA_STATS.totalLands);
  });
});

// ── 2026-04-26 area-ratio QC gate ──
//
// Closes a regression class missed by the 2026-04-24 "approximate ⇒ pin-only"
// gate: a land flagged `boundaryApproximate: false` could still ship a stub
// polygon dramatically smaller (or larger) than the claimed `acres`. Live
// audit caught Fairmount WMA shipping a 4-vertex / ~61-acre polygon while
// claiming 4000 ac. This test computes each polygon's actual area via an
// equirectangular shoelace and fails when the ratio leaves [0.3, 3.0].
// Bound is loose enough to allow real DNR partial boundaries and small
// parks; tight enough that any stub gets caught.

const EARTH_R_M = 6_371_008.8;

function shoelaceM2(ring: number[][], lat0: number): number {
  const cos0 = Math.cos((lat0 * Math.PI) / 180);
  let s = 0;
  for (let k = 0; k < ring.length - 1; k++) {
    const [lng1, lat1] = ring[k];
    const [lng2, lat2] = ring[k + 1];
    const x1 = EARTH_R_M * (lng1 * Math.PI / 180) * cos0;
    const y1 = EARTH_R_M * (lat1 * Math.PI / 180);
    const x2 = EARTH_R_M * (lng2 * Math.PI / 180) * cos0;
    const y2 = EARTH_R_M * (lat2 * Math.PI / 180);
    s += x1 * y2 - x2 * y1;
  }
  return Math.abs(s) / 2;
}

function geometryAreaAcres(geom: any): number {
  if (!geom) return 0;
  const m2_to_acres = 0.000247105;
  if (geom.type === 'Polygon') {
    const rings: number[][][] = geom.coordinates;
    if (!rings.length) return 0;
    const lat0 = rings[0].reduce((a, c) => a + c[1], 0) / rings[0].length;
    const outer = shoelaceM2(rings[0], lat0);
    let holes = 0;
    for (let k = 1; k < rings.length; k++) holes += shoelaceM2(rings[k], lat0);
    // Mis-shaped data: if "holes" sum near-or-greater than outer, treat all rings as separate parts.
    if (holes > outer * 0.5) {
      const total = rings.reduce((a, r) => a + shoelaceM2(r, lat0), 0);
      return total * m2_to_acres;
    }
    return Math.max(0, outer - holes) * m2_to_acres;
  }
  if (geom.type === 'MultiPolygon') {
    let total = 0;
    for (const poly of geom.coordinates) {
      if (!poly?.length) continue;
      const lat0 = poly[0].reduce((a: number, c: number[]) => a + c[1], 0) / poly[0].length;
      const outer = shoelaceM2(poly[0], lat0);
      let holes = 0;
      for (let k = 1; k < poly.length; k++) holes += shoelaceM2(poly[k], lat0);
      total += Math.max(0, outer - holes);
    }
    return total * m2_to_acres;
  }
  return 0;
}

describe('marylandPublicLands — area-ratio QC gate', () => {
  it('every land with geometry has polygon area within 0.3x–3.0x of claimed acres', () => {
    const offenders: Array<{ id: string; name: string; acres: number; polyAcres: number; ratio: number }> = [];
    for (const land of marylandPublicLands) {
      if (!land.geometry || !land.acres) continue;
      const polyAcres = geometryAreaAcres(land.geometry);
      const ratio = polyAcres / land.acres;
      if (ratio < 0.3 || ratio > 3.0) {
        offenders.push({
          id: land.id,
          name: land.name,
          acres: land.acres,
          polyAcres: Math.round(polyAcres * 10) / 10,
          ratio: Math.round(ratio * 1000) / 1000,
        });
      }
    }
    if (offenders.length > 0) {
      // eslint-disable-next-line no-console
      console.error(
        'Polygons whose area is wildly off vs claimed acres (likely stubs):\n' +
          offenders.map((o) => `  ${o.id} ${JSON.stringify(o.name)} acres=${o.acres} polyAcres=${o.polyAcres} ratio=${o.ratio}`).join('\n') +
          '\nFix: either replace the geometry with a real DNR polygon, or set geometry=null + boundaryApproximate=true.',
      );
    }
    expect(offenders).toEqual([]);
  });
});
