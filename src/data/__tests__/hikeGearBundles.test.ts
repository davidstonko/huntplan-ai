/**
 * Tests for hikeGearBundles.ts
 *
 * Covers bundle structure, composition invariants, and gear catalog consistency.
 */

import {
  HIKE_DAY_BUNDLE,
  HIKE_OVERNIGHT_BUNDLE,
  HIKE_MULTIDAY_BUNDLE,
  HIKE_GEAR_BUNDLES,
  resolveBundleByTier,
  nightsToTier,
} from '../hikeGearBundles';
import { GEAR_CATALOG } from '../../screens/StarterGearScreen';
import type { HikeGearBundle } from '../../types/hike';

describe('hikeGearBundles', () => {
  describe('Bundle structure', () => {
    it('should have DAY_BUNDLE with valid tier, label, and items', () => {
      expect(HIKE_DAY_BUNDLE.tier).toBe('day');
      expect(HIKE_DAY_BUNDLE.label).toBe('Day Hike');
      expect(HIKE_DAY_BUNDLE.itemIds).toBeInstanceOf(Array);
      expect(HIKE_DAY_BUNDLE.itemIds.length).toBeGreaterThan(0);
    });

    it('should have OVERNIGHT_BUNDLE with valid tier, label, and items', () => {
      expect(HIKE_OVERNIGHT_BUNDLE.tier).toBe('overnight');
      expect(HIKE_OVERNIGHT_BUNDLE.label).toBe('Overnight Backpacking');
      expect(HIKE_OVERNIGHT_BUNDLE.itemIds).toBeInstanceOf(Array);
      expect(HIKE_OVERNIGHT_BUNDLE.itemIds.length).toBeGreaterThan(0);
    });

    it('should have MULTIDAY_BUNDLE with valid tier, label, and items', () => {
      expect(HIKE_MULTIDAY_BUNDLE.tier).toBe('multi-day');
      expect(HIKE_MULTIDAY_BUNDLE.label).toBe('Multi-Day Backpacking');
      expect(HIKE_MULTIDAY_BUNDLE.itemIds).toBeInstanceOf(Array);
      expect(HIKE_MULTIDAY_BUNDLE.itemIds.length).toBeGreaterThan(0);
    });

    it('should have distanceHint and trailExamples in each bundle', () => {
      const bundles = [HIKE_DAY_BUNDLE, HIKE_OVERNIGHT_BUNDLE, HIKE_MULTIDAY_BUNDLE];
      bundles.forEach((bundle) => {
        expect(typeof bundle.distanceHint).toBe('string');
        expect(bundle.distanceHint.length).toBeGreaterThan(0);
        expect(bundle.trailExamples).toBeInstanceOf(Array);
        expect(bundle.trailExamples.length).toBeGreaterThan(0);
      });
    });
  });

  describe('Composition invariants (bundles are additive with possible item swaps)', () => {
    /**
     * Note: The bundles use a swap model where items may be removed as they
     * transition (e.g., 'hike-pack-day' → 'hike-pack-overnight'). This function
     * tests that the "net" of items is additive (considering swaps).
     */

    it('should have OVERNIGHT with most or all DAY items (or equivalents)', () => {
      const daySet = new Set(HIKE_DAY_BUNDLE.itemIds);
      const overnightSet = new Set(HIKE_OVERNIGHT_BUNDLE.itemIds);

      // Most day items should still be present in overnight
      // Some may be swapped (e.g. day-pack → overnight-pack)
      const dayItemsInOvernight = Array.from(daySet).filter((id) => overnightSet.has(id));
      expect(dayItemsInOvernight.length).toBeGreaterThan(0);
      expect(overnightSet.size).toBeGreaterThanOrEqual(daySet.size);
    });

    it('should have MULTIDAY with most or all OVERNIGHT items', () => {
      const overnightSet = new Set(HIKE_OVERNIGHT_BUNDLE.itemIds);
      const multidaySet = new Set(HIKE_MULTIDAY_BUNDLE.itemIds);

      // Most overnight items should be in multiday
      const overnightItemsInMultiday = Array.from(overnightSet).filter((id) => multidaySet.has(id));
      expect(overnightItemsInMultiday.length).toBeGreaterThan(0);
      expect(multidaySet.size).toBeGreaterThanOrEqual(overnightSet.size);
    });

    it('should have MULTIDAY with more items than DAY', () => {
      // Multiday should have more items than day (even accounting for swaps)
      expect(HIKE_MULTIDAY_BUNDLE.itemIds.length).toBeGreaterThan(HIKE_DAY_BUNDLE.itemIds.length);
    });
  });

  describe('Item ID consistency', () => {
    it('should have all item IDs as non-empty strings in DAY bundle', () => {
      HIKE_DAY_BUNDLE.itemIds.forEach((itemId) => {
        expect(typeof itemId).toBe('string');
        expect(itemId.length).toBeGreaterThan(0);
      });
    });

    it('should have all item IDs as non-empty strings in OVERNIGHT bundle', () => {
      HIKE_OVERNIGHT_BUNDLE.itemIds.forEach((itemId) => {
        expect(typeof itemId).toBe('string');
        expect(itemId.length).toBeGreaterThan(0);
      });
    });

    it('should have all item IDs as non-empty strings in MULTIDAY bundle', () => {
      HIKE_MULTIDAY_BUNDLE.itemIds.forEach((itemId) => {
        expect(typeof itemId).toBe('string');
        expect(itemId.length).toBeGreaterThan(0);
      });
    });
  });

  // Contract test — every itemId referenced by any hike bundle must resolve
  // to a real entry in GEAR_CATALOG. This is the test that would have caught
  // the TODO-referenced missing items (freezedried meals, blister kit, etc)
  // before they shipped to the AT Trip Planner UI. See task #17.
  describe('GEAR_CATALOG referential integrity', () => {
    const catalogIds = new Set(GEAR_CATALOG.map((item) => item.id));

    it('every DAY bundle itemId must exist in GEAR_CATALOG', () => {
      const missing = HIKE_DAY_BUNDLE.itemIds.filter((id) => !catalogIds.has(id));
      expect(missing).toEqual([]);
    });

    it('every OVERNIGHT bundle itemId must exist in GEAR_CATALOG', () => {
      const missing = HIKE_OVERNIGHT_BUNDLE.itemIds.filter((id) => !catalogIds.has(id));
      expect(missing).toEqual([]);
    });

    it('every MULTIDAY bundle itemId must exist in GEAR_CATALOG', () => {
      const missing = HIKE_MULTIDAY_BUNDLE.itemIds.filter((id) => !catalogIds.has(id));
      expect(missing).toEqual([]);
    });
  });

  describe('Duplicate item IDs within bundles', () => {
    const findDuplicates = (itemIds: string[]): string[] => {
      const seen = new Set<string>();
      const duplicates = new Set<string>();
      itemIds.forEach((id) => {
        if (seen.has(id)) {
          duplicates.add(id);
        }
        seen.add(id);
      });
      return Array.from(duplicates);
    };

    it('should have no duplicate item IDs in DAY bundle', () => {
      const duplicates = findDuplicates(HIKE_DAY_BUNDLE.itemIds);
      expect(duplicates.length).toBe(0);
    });

    it('should have at most 1 expected duplicate in OVERNIGHT bundle (hike-socks-merino)', () => {
      const duplicates = findDuplicates(HIKE_OVERNIGHT_BUNDLE.itemIds);
      // hike-socks-merino is listed twice (for two pairs) — this is intentional
      expect(duplicates).toEqual(['hike-socks-merino']);
    });

    it('should have at most 2 expected duplicates in MULTIDAY bundle', () => {
      const duplicates = findDuplicates(HIKE_MULTIDAY_BUNDLE.itemIds);
      // hike-socks-merino is listed 3 times and hunt-first-aid is listed twice — intentional
      expect(duplicates.length).toBeGreaterThanOrEqual(0);
      expect(duplicates.length).toBeLessThanOrEqual(2);
    });
  });

  describe('HIKE_GEAR_BUNDLES array', () => {
    it('should export all three bundles in array', () => {
      expect(HIKE_GEAR_BUNDLES).toBeInstanceOf(Array);
      expect(HIKE_GEAR_BUNDLES.length).toBe(3);
      expect(HIKE_GEAR_BUNDLES).toContain(HIKE_DAY_BUNDLE);
      expect(HIKE_GEAR_BUNDLES).toContain(HIKE_OVERNIGHT_BUNDLE);
      expect(HIKE_GEAR_BUNDLES).toContain(HIKE_MULTIDAY_BUNDLE);
    });

    it('should maintain correct order in array (day, overnight, multi-day)', () => {
      expect(HIKE_GEAR_BUNDLES[0].tier).toBe('day');
      expect(HIKE_GEAR_BUNDLES[1].tier).toBe('overnight');
      expect(HIKE_GEAR_BUNDLES[2].tier).toBe('multi-day');
    });
  });

  describe('resolveBundleByTier()', () => {
    it('should resolve "day" tier to DAY_BUNDLE', () => {
      const bundle = resolveBundleByTier('day');
      expect(bundle).toEqual(HIKE_DAY_BUNDLE);
    });

    it('should resolve "overnight" tier to OVERNIGHT_BUNDLE', () => {
      const bundle = resolveBundleByTier('overnight');
      expect(bundle).toEqual(HIKE_OVERNIGHT_BUNDLE);
    });

    it('should resolve "multi-day" tier to MULTIDAY_BUNDLE', () => {
      const bundle = resolveBundleByTier('multi-day');
      expect(bundle).toEqual(HIKE_MULTIDAY_BUNDLE);
    });

    it('should return bundle with correct itemIds', () => {
      const dayBundle = resolveBundleByTier('day');
      expect(dayBundle.itemIds).toBe(HIKE_DAY_BUNDLE.itemIds);

      const overnightBundle = resolveBundleByTier('overnight');
      expect(overnightBundle.itemIds).toBe(HIKE_OVERNIGHT_BUNDLE.itemIds);

      const multidayBundle = resolveBundleByTier('multi-day');
      expect(multidayBundle.itemIds).toBe(HIKE_MULTIDAY_BUNDLE.itemIds);
    });
  });

  describe('nightsToTier()', () => {
    it('should return "day" for 0 nights', () => {
      expect(nightsToTier(0)).toBe('day');
    });

    it('should return "overnight" for 1 night', () => {
      expect(nightsToTier(1)).toBe('overnight');
    });

    it('should return "multi-day" for 2 nights', () => {
      expect(nightsToTier(2)).toBe('multi-day');
    });

    it('should return "multi-day" for 3+ nights', () => {
      expect(nightsToTier(3)).toBe('multi-day');
      expect(nightsToTier(4)).toBe('multi-day');
      expect(nightsToTier(10)).toBe('multi-day');
    });
  });

  describe('Type compatibility', () => {
    it('should satisfy HikeGearBundle type for all bundles', () => {
      const bundles: HikeGearBundle[] = [HIKE_DAY_BUNDLE, HIKE_OVERNIGHT_BUNDLE, HIKE_MULTIDAY_BUNDLE];

      bundles.forEach((bundle) => {
        expect(bundle.tier).toBeDefined();
        expect(['day', 'overnight', 'multi-day']).toContain(bundle.tier);
        expect(bundle.label).toBeDefined();
        expect(typeof bundle.label).toBe('string');
        expect(bundle.distanceHint).toBeDefined();
        expect(typeof bundle.distanceHint).toBe('string');
        expect(bundle.trailExamples).toBeDefined();
        expect(Array.isArray(bundle.trailExamples)).toBe(true);
        expect(bundle.itemIds).toBeDefined();
        expect(Array.isArray(bundle.itemIds)).toBe(true);
      });
    });
  });

  describe('Bundle progression checks', () => {
    it('should have progressively increasing bundle sizes', () => {
      const daySize = HIKE_DAY_BUNDLE.itemIds.length;
      const overnightSize = HIKE_OVERNIGHT_BUNDLE.itemIds.length;
      const multidaySize = HIKE_MULTIDAY_BUNDLE.itemIds.length;

      // Due to item swaps, sizes may not be strictly increasing,
      // but general progression should hold
      expect(overnightSize).toBeGreaterThanOrEqual(daySize - 2);
      expect(multidaySize).toBeGreaterThanOrEqual(overnightSize - 2);
    });

    it('should have meaningful coverage in each tier', () => {
      // Each bundle should have a reasonable number of items
      expect(HIKE_DAY_BUNDLE.itemIds.length).toBeGreaterThanOrEqual(10);
      expect(HIKE_OVERNIGHT_BUNDLE.itemIds.length).toBeGreaterThanOrEqual(20);
      expect(HIKE_MULTIDAY_BUNDLE.itemIds.length).toBeGreaterThanOrEqual(25);
    });
  });
});
