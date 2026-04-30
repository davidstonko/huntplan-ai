/**
 * marylandCampgrounds contract tests.
 *
 * Guards the Phase 5A campground dataset against regression. Every entry in
 * MARYLAND_CAMPGROUNDS was cross-referenced against OSM Nominatim on
 * 2026-04-18 (see file header). These tests enforce the contract we ship:
 *   • Exactly 19 records — matches the header comment and Phase 5A plan.
 *   • id uniqueness — the map renderer and AsyncStorage key on id.
 *   • type is one of the 8 allowed CampgroundType enum values.
 *   • lat/lon inside MD bbox, never null, never null-island.
 *   • amenities is a fully-populated 15-key boolean record (no missing keys,
 *     no strings, no null) so Mapbox filter expressions can't crash.
 *   • reservationUrl, when present, is a valid https URL.
 *   • season.openMonth / closeMonth are either null or 1-12.
 */

import { MARYLAND_CAMPGROUNDS } from '../marylandCampgrounds';
import type { CampgroundType } from '../../types/camp';

const MD_BBOX = {
  latMin: 37.85,
  latMax: 39.78,
  lonMin: -79.55,
  lonMax: -75.00,
};

const VALID_TYPES: CampgroundType[] = [
  'state_forest',
  'state_park',
  'national_park',
  'private',
  'primitive',
  'group',
  'equestrian',
  'backpacker',
];

const AMENITY_KEYS: Array<keyof typeof MARYLAND_CAMPGROUNDS[number]['amenities']> = [
  'potableWater', 'flushToilets', 'pitToilets', 'shower', 'fireRing',
  'picnicTable', 'electricHookup', 'waterHookup', 'sewerHookup', 'dumpStation',
  'petsAllowed', 'ada', 'trashService', 'laundry', 'store',
];

describe('marylandCampgrounds', () => {
  it('ships the documented record count (19)', () => {
    expect(MARYLAND_CAMPGROUNDS.length).toBe(19);
  });

  it('has unique ids', () => {
    const ids = MARYLAND_CAMPGROUNDS.map((c) => c.id);
    const set = new Set(ids);
    expect(set.size).toBe(ids.length);
  });

  it('every campground has non-empty id, name, park, county', () => {
    for (const c of MARYLAND_CAMPGROUNDS) {
      expect(typeof c.id).toBe('string');
      expect(c.id.length).toBeGreaterThan(0);
      expect(typeof c.name).toBe('string');
      expect(c.name.length).toBeGreaterThan(0);
      expect(typeof c.park).toBe('string');
      expect(c.park.length).toBeGreaterThan(0);
      expect(typeof c.county).toBe('string');
      expect(c.county.length).toBeGreaterThan(0);
    }
  });

  it('ids follow the "md-" slug convention', () => {
    for (const c of MARYLAND_CAMPGROUNDS) {
      expect(c.id).toMatch(/^md-[a-z0-9-]+$/);
    }
  });

  it('every type is one of the 8 allowed CampgroundType values', () => {
    for (const c of MARYLAND_CAMPGROUNDS) {
      expect(VALID_TYPES).toContain(c.type);
    }
  });

  it('every coordinate is inside the Maryland bounding box', () => {
    for (const c of MARYLAND_CAMPGROUNDS) {
      expect(typeof c.lat).toBe('number');
      expect(typeof c.lon).toBe('number');
      expect(c.lat).toBeGreaterThanOrEqual(MD_BBOX.latMin);
      expect(c.lat).toBeLessThanOrEqual(MD_BBOX.latMax);
      expect(c.lon).toBeGreaterThanOrEqual(MD_BBOX.lonMin);
      expect(c.lon).toBeLessThanOrEqual(MD_BBOX.lonMax);
    }
  });

  it('no campground is on Null Island (0, 0)', () => {
    for (const c of MARYLAND_CAMPGROUNDS) {
      expect(Math.abs(c.lat) + Math.abs(c.lon)).toBeGreaterThan(1);
    }
  });

  it('amenities is a fully-populated 15-key boolean record', () => {
    for (const c of MARYLAND_CAMPGROUNDS) {
      expect(c.amenities).not.toBeNull();
      expect(typeof c.amenities).toBe('object');
      // Exactly the 15 keys, no more no fewer.
      const actualKeys = Object.keys(c.amenities).sort();
      expect(actualKeys).toEqual([...AMENITY_KEYS].sort());
      for (const key of AMENITY_KEYS) {
        expect(typeof c.amenities[key]).toBe('boolean');
      }
    }
  });

  it('reservationRequired is a strict boolean', () => {
    for (const c of MARYLAND_CAMPGROUNDS) {
      expect(typeof c.reservationRequired).toBe('boolean');
    }
  });

  it('reservationUrl, when present, is an https URL', () => {
    for (const c of MARYLAND_CAMPGROUNDS) {
      if (c.reservationUrl == null) continue;
      expect(typeof c.reservationUrl).toBe('string');
      expect(c.reservationUrl).toMatch(/^https:\/\//);
    }
  });

  it('siteCount is null or a positive integer', () => {
    for (const c of MARYLAND_CAMPGROUNDS) {
      if (c.siteCount == null) continue;
      expect(typeof c.siteCount).toBe('number');
      expect(Number.isInteger(c.siteCount)).toBe(true);
      expect(c.siteCount).toBeGreaterThan(0);
    }
  });

  it('season.openMonth / closeMonth are null or 1-12', () => {
    for (const c of MARYLAND_CAMPGROUNDS) {
      expect(c.season).not.toBeNull();
      const { openMonth, closeMonth } = c.season;
      if (openMonth != null) {
        expect(openMonth).toBeGreaterThanOrEqual(1);
        expect(openMonth).toBeLessThanOrEqual(12);
      }
      if (closeMonth != null) {
        expect(closeMonth).toBeGreaterThanOrEqual(1);
        expect(closeMonth).toBeLessThanOrEqual(12);
      }
    }
  });

  it('tags is a string array (possibly empty)', () => {
    for (const c of MARYLAND_CAMPGROUNDS) {
      expect(Array.isArray(c.tags)).toBe(true);
      for (const t of c.tags) expect(typeof t).toBe('string');
    }
  });
});
