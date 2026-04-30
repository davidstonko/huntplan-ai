/**
 * marylandAnglerAccessSites contract tests.
 *
 * Guards the merged DNR angler-access + water-access dataset shipped in
 * Build 7 (2026-04-19). The enriched file merges three upstream DNR
 * FeatureServer layers (Public_View_Angler_Access_Sites_, Maryland_Water_
 * Access_Sites_Production_View, Public_Water_Access_2020, WaterAccessPnt_
 * Points) into one 737-site dataset. See the file header for sourcing.
 *
 * These tests enforce:
 *   • Expected record count (737) matches the header comment and ingest log.
 *   • Every site has a valid MD lat/lng pair — no null-island, no out-of-state.
 *   • id uniqueness — the map's symbol layer keys on id.
 *   • Filter flags (hasRamp / hasSoftLaunch) are booleans, never strings or null.
 *   • If fishableReach is present it's a valid LineString / MultiLineString.
 *   • confidence, when present, is one of the documented literals.
 *   • source, when present, is a non-empty string.
 *   • ownerType, when present, is one of the normalized DNR enums.
 *   • Numeric enrichment fields are finite numbers, never NaN.
 *   • Enrichment coverage is at or above the documented floor (regression guard).
 */

import {
  MARYLAND_ANGLER_ACCESS_SITES,
  AnglerAccessSite,
  OwnerType,
  AccessSiteConfidence,
  ParkingSize,
} from '../marylandAnglerAccessSites';

// MD bounding box with a small buffer for coastal waters and mountain parks.
const MD_BBOX = {
  latMin: 37.85,
  latMax: 39.78,
  lonMin: -79.55,
  lonMax: -75.00,
};

const VALID_OWNER_TYPES: OwnerType[] = ['STATE', 'COUNTY', 'MUNICIPAL', 'FEDERAL', 'NGO', 'OTHER'];
const VALID_CONFIDENCE: AccessSiteConfidence[] = ['verified', 'approximate'];
const VALID_PARKING_SIZE: ParkingSize[] = ['small', 'medium', 'large'];

describe('marylandAnglerAccessSites', () => {
  it('ships the documented record count (737)', () => {
    expect(MARYLAND_ANGLER_ACCESS_SITES.length).toBe(737);
  });

  it('has unique ids', () => {
    const ids = MARYLAND_ANGLER_ACCESS_SITES.map((s) => s.id);
    const set = new Set(ids);
    expect(set.size).toBe(ids.length);
  });

  it('every site has a non-empty name, county, and waterbody', () => {
    for (const s of MARYLAND_ANGLER_ACCESS_SITES) {
      expect(typeof s.name).toBe('string');
      expect(s.name.length).toBeGreaterThan(0);
      expect(typeof s.county).toBe('string');
      expect(s.county.length).toBeGreaterThan(0);
      expect(typeof s.waterbody).toBe('string');
      expect(s.waterbody.length).toBeGreaterThan(0);
    }
  });

  it('every coordinate is inside the Maryland bounding box', () => {
    for (const s of MARYLAND_ANGLER_ACCESS_SITES) {
      expect(s.lat).toBeGreaterThanOrEqual(MD_BBOX.latMin);
      expect(s.lat).toBeLessThanOrEqual(MD_BBOX.latMax);
      expect(s.lng).toBeGreaterThanOrEqual(MD_BBOX.lonMin);
      expect(s.lng).toBeLessThanOrEqual(MD_BBOX.lonMax);
    }
  });

  it('no site is on Null Island (0, 0)', () => {
    for (const s of MARYLAND_ANGLER_ACCESS_SITES) {
      expect(Math.abs(s.lat) + Math.abs(s.lng)).toBeGreaterThan(1);
    }
  });

  it('ramp and softLaunch flags are strict booleans', () => {
    for (const s of MARYLAND_ANGLER_ACCESS_SITES) {
      expect(typeof s.hasRamp).toBe('boolean');
      expect(typeof s.hasSoftLaunch).toBe('boolean');
    }
  });

  it('parking coordinates, when present, are also inside MD bbox', () => {
    for (const s of MARYLAND_ANGLER_ACCESS_SITES) {
      if (s.parkingLat != null || s.parkingLng != null) {
        expect(s.parkingLat).not.toBeUndefined();
        expect(s.parkingLng).not.toBeUndefined();
        expect(s.parkingLat!).toBeGreaterThanOrEqual(MD_BBOX.latMin);
        expect(s.parkingLat!).toBeLessThanOrEqual(MD_BBOX.latMax);
        expect(s.parkingLng!).toBeGreaterThanOrEqual(MD_BBOX.lonMin);
        expect(s.parkingLng!).toBeLessThanOrEqual(MD_BBOX.lonMax);
      }
    }
  });

  it('fishableReach, when present, is a valid LineString or MultiLineString', () => {
    for (const s of MARYLAND_ANGLER_ACCESS_SITES) {
      if (!s.fishableReach) continue;
      const reach = s.fishableReach;
      expect(['LineString', 'MultiLineString']).toContain(reach.type);
      if (reach.type === 'LineString') {
        expect(Array.isArray(reach.coordinates)).toBe(true);
        expect(reach.coordinates.length).toBeGreaterThanOrEqual(2);
        for (const [lon, lat] of reach.coordinates) {
          expect(lat).toBeGreaterThanOrEqual(MD_BBOX.latMin);
          expect(lat).toBeLessThanOrEqual(MD_BBOX.latMax);
          expect(lon).toBeGreaterThanOrEqual(MD_BBOX.lonMin);
          expect(lon).toBeLessThanOrEqual(MD_BBOX.lonMax);
        }
      } else {
        expect(Array.isArray(reach.coordinates)).toBe(true);
        expect(reach.coordinates.length).toBeGreaterThanOrEqual(1);
        for (const line of reach.coordinates) {
          expect(line.length).toBeGreaterThanOrEqual(2);
        }
      }
    }
  });

  // ---- Enrichment contract (Build 7) ----

  it('confidence, when present, is one of the documented literals', () => {
    for (const s of MARYLAND_ANGLER_ACCESS_SITES) {
      if (s.confidence == null) continue;
      expect(VALID_CONFIDENCE).toContain(s.confidence);
    }
  });

  it('source, when present, is a non-empty string', () => {
    for (const s of MARYLAND_ANGLER_ACCESS_SITES) {
      if (s.source == null) continue;
      expect(typeof s.source).toBe('string');
      expect(s.source.length).toBeGreaterThan(0);
    }
  });

  it('ownerType, when present, is a documented DNR enum', () => {
    for (const s of MARYLAND_ANGLER_ACCESS_SITES) {
      if (s.ownerType == null) continue;
      expect(VALID_OWNER_TYPES).toContain(s.ownerType);
    }
  });

  it('parkingSize, when present, is one of small|medium|large', () => {
    for (const s of MARYLAND_ANGLER_ACCESS_SITES) {
      if (s.parkingSize == null) continue;
      expect(VALID_PARKING_SIZE).toContain(s.parkingSize);
    }
  });

  it('numeric enrichment fields are finite numbers (never NaN)', () => {
    const numericKeys: Array<keyof AnglerAccessSite> = [
      'rampLanes',
      'rampWidthFt',
      'trailerSpaces',
      'carSpaces',
      'boardingPiers',
      'dnrObjectId',
    ];
    for (const s of MARYLAND_ANGLER_ACCESS_SITES) {
      for (const k of numericKeys) {
        const v = s[k] as number | undefined;
        if (v == null) continue;
        expect(typeof v).toBe('number');
        expect(Number.isFinite(v)).toBe(true);
      }
    }
  });

  it('boolean enrichment fields are strict booleans when present', () => {
    const boolKeys: Array<keyof AnglerAccessSite> = [
      'feeRequired',
      'hasBoatRamp',
      'softAccessOnly',
      'hasDock',
      'hasTransientDock',
      'hasRestroom',
      'hasTrashService',
      'hasFuel',
      'hasPumpout',
      'hasSlipRentals',
      'adaRamp',
      'adaSoftAccess',
      'adaCarSpace',
      'adaPier',
      'electricMotorsOnly',
      'largeBoatsOk',
      'wingWalls',
    ];
    for (const s of MARYLAND_ANGLER_ACCESS_SITES) {
      for (const k of boolKeys) {
        const v = s[k] as boolean | undefined;
        if (v == null) continue;
        expect(typeof v).toBe('boolean');
      }
    }
  });

  // ---- Coverage floor regression guards ----
  // These are floors, not equalities. If a future ingest expands the data,
  // these should never drop below their documented floors without an
  // explicit header-comment change.

  it('at least 480 sites carry DNR owner metadata (ownerType + ownerName)', () => {
    const n = MARYLAND_ANGLER_ACCESS_SITES.filter(
      (s) => s.ownerType != null && s.ownerName != null
    ).length;
    expect(n).toBeGreaterThanOrEqual(480);
  });

  it('at least 480 sites carry a contact phone number', () => {
    const n = MARYLAND_ANGLER_ACCESS_SITES.filter((s) => s.contactPhone != null).length;
    expect(n).toBeGreaterThanOrEqual(480);
  });

  it('at least 45 sites have ADA-compliant boat ramps (adaRamp=true)', () => {
    // Actual count in the 2026-04-19 DNR Production View pull: 51. Floor
    // set to 45 to tolerate small edit churn between re-ingests.
    const n = MARYLAND_ANGLER_ACCESS_SITES.filter((s) => s.adaRamp === true).length;
    expect(n).toBeGreaterThanOrEqual(45);
  });

  it('legacy hasRamp flag retained on at least 236 sites (2026-04-13 baseline)', () => {
    const n = MARYLAND_ANGLER_ACCESS_SITES.filter((s) => s.hasRamp).length;
    expect(n).toBeGreaterThanOrEqual(236);
  });

  it('DNR-sourced new additions (angler_580+) all carry confidence=verified', () => {
    for (const s of MARYLAND_ANGLER_ACCESS_SITES) {
      const idx = parseInt(s.id.split('_')[1], 10);
      if (isNaN(idx) || idx < 580) continue;
      expect(s.confidence).toBe('verified');
      expect(s.source).toBeTruthy();
    }
  });
});
