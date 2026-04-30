/**
 * marylandFishingHotspots contract test.
 *
 * Locks the data-quality invariants per the FISHING_OVERHAUL_PLAN.md
 * and the fabrication_pattern memory:
 *   - Every hotspot has a valid sourceTier
 *   - Every hotspot has a non-empty source citation
 *   - Lat/lng is inside the MD bounding box (rough — includes
 *     immediately-bordering tidal water like the lower Potomac)
 *   - No duplicate ids
 *   - Plan target met (>= 90 spots; current build is 98+)
 */

import {
  MARYLAND_FISHING_HOTSPOTS,
  FISHING_HOTSPOT_STATS,
} from '../marylandFishingHotspots';

describe('marylandFishingHotspots', () => {
  it('every hotspot has a valid sourceTier and non-empty source', () => {
    const validTiers = new Set([
      'dnr-publication',
      'noaa-chart',
      'dnr-regulation',
      'community',
    ]);
    for (const h of MARYLAND_FISHING_HOTSPOTS) {
      expect(validTiers.has(h.sourceTier)).toBe(true);
      expect(typeof h.source).toBe('string');
      expect(h.source.length).toBeGreaterThan(0);
    }
  });

  it('every hotspot lies within the MD bounding box', () => {
    // MD bounding box including tidal Potomac/Bay extensions.
    // Roughly: lat 37.85 to 39.75, lng -79.5 to -75.0.
    for (const h of MARYLAND_FISHING_HOTSPOTS) {
      expect(h.lat).toBeGreaterThanOrEqual(37.85);
      expect(h.lat).toBeLessThanOrEqual(39.75);
      expect(h.lng).toBeGreaterThanOrEqual(-79.6);
      expect(h.lng).toBeLessThanOrEqual(-74.9);
    }
  });

  it('hotspot ids are unique', () => {
    const ids = MARYLAND_FISHING_HOTSPOTS.map((h) => h.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('plan-target hotspot count is met (>= 90)', () => {
    expect(FISHING_HOTSPOT_STATS.total).toBeGreaterThanOrEqual(90);
  });

  it('every required field is present', () => {
    for (const h of MARYLAND_FISHING_HOTSPOTS) {
      expect(typeof h.id).toBe('string');
      expect(typeof h.name).toBe('string');
      expect(typeof h.waterbody).toBe('string');
      expect(typeof h.county).toBe('string');
      expect(typeof h.kind).toBe('string');
      expect(Array.isArray(h.primarySpecies)).toBe(true);
      expect(h.primarySpecies.length).toBeGreaterThan(0);
      expect(typeof h.techniqueNotes).toBe('string');
      expect(typeof h.bestMonths).toBe('string');
      expect(typeof h.isStretch).toBe('boolean');
    }
  });
});
