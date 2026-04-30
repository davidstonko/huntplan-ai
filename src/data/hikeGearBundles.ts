/**
 * Hike Gear Bundles — 3-tier packing lists for hiking.
 *
 * Each bundle references existing GEAR_CATALOG IDs from StarterGearScreen.tsx.
 * Bundles are additive: Overnight includes all Day items (minus any swaps),
 * and Multi-day includes all Overnight items (minus any swaps).
 *
 * Built for Phase 5B (V2.2.0). Uses amazonLink() from StarterGearScreen.tsx.
 *
 * Consistency is enforced by a contract test in
 * `__tests__/hikeGearBundles.test.ts` — every itemId here MUST exist in
 * GEAR_CATALOG. Earlier revisions had TODO comments that pointed at gear
 * which the catalog had since grown to include (freeze-dried meals, blister
 * kit, bear bag); those TODOs are now resolved and the bundles below wire
 * the real catalog entries in.
 */

import type { HikeGearBundle } from '../types/hike';

/**
 * Day-hike bundle: 0 nights, same-day return.
 * Assumes starting from a trailhead with vehicle.
 */
export const HIKE_DAY_BUNDLE: HikeGearBundle = {
  tier: 'day',
  label: 'Day Hike',
  distanceHint: '0–12 miles, same-day return',
  trailExamples: [
    'Annapolis Rock (AT)',
    'Billy Goat Trail Section C',
    'Cunningham Falls Cascade',
    'Catoctin Thurmont Vista',
  ],
  itemIds: [
    // Pack & storage
    'hike-pack-day',
    'hike-rain-cover',

    // Safety
    'hunt-first-aid', // Compact first aid (shared with hunt)
    'hike-whistle-compass',
    'hike-emergency-bivy',

    // Navigation & light
    'hunt-headlamp', // LED headlamp (shared with hunt)
    'hunt-gps', // Optional: GPS backup

    // Hydration & food
    'hike-filter-bottle',
    'hike-electrolyte',
    'hike-trail-snacks',

    // Clothing (assume day weather, not all seasons)
    'hunt-base-merino',
    'hike-boots',
    'hike-socks-merino',
    'hike-rain-shell',
    'fish-sun-shirt', // UPF shirt for sun protection

    // Trekking (optional poles)
    // 'hike-poles', // Optional—omit for light day-hike bundles
  ],
};

/**
 * Overnight bundle: 1 night on trail.
 * Inherits Day items but swaps day-pack for overnight-pack and adds sleep/cook.
 */
export const HIKE_OVERNIGHT_BUNDLE: HikeGearBundle = {
  tier: 'overnight',
  label: 'Overnight Backpacking',
  distanceHint: '6–15 miles, 1 night',
  trailExamples: [
    'AT Pen Mar to Raven Rock Shelter',
    'AT Rocky Run to Crampton Gap',
    'Cunningham Falls to camp loop',
  ],
  itemIds: [
    // Pack & storage (upgraded)
    'hike-pack-overnight', // Swap day → overnight
    'hike-rain-cover',
    'gen-dry-bag', // Extra dry storage

    // Safety
    'hunt-first-aid',
    'hike-whistle-compass',
    'hike-emergency-bivy',
    'hike-first-aid', // Trail-specific FA kit for overnight
    'hike-bear-bag', // MD AT has active bear presence; Ursack or PCT hang required

    // Navigation & light
    'hunt-headlamp',
    'hunt-gps',
    'camp-lantern', // Camp lighting

    // Hydration & food
    'hike-filter-bottle',
    'hike-electrolyte',
    'hike-trail-snacks',
    'hike-meals-freezedried', // Dinner(s) + hot breakfast for overnight

    // Clothing
    'hunt-base-merino',
    'hike-boots',
    'hike-socks-merino',
    'hike-socks-merino', // Extra pair for multi-day comfort
    'hike-rain-shell',
    'fish-sun-shirt',

    // Sleep system
    'camp-bag-20f',
    'camp-pad-inflatable',
    'camp-pillow',

    // Cook kit
    'camp-stove-canister',
    'camp-cookset',
    'camp-water-filter',

    // Trekking
    'hike-poles',
    'hike-gaiters',
  ],
};

/**
 * Multi-day bundle: 2+ nights on trail.
 * Inherits Overnight items but adds redundancy, comfort, and safety items.
 */
export const HIKE_MULTIDAY_BUNDLE: HikeGearBundle = {
  tier: 'multi-day',
  label: 'Multi-Day Backpacking',
  distanceHint: '15+ miles, 2–4 nights',
  trailExamples: [
    'AT Pen Mar to Washington Monument (full MD section)',
    'AT section hike with shelter-hopping',
    'Appalachian Trail thru-hike prep',
  ],
  itemIds: [
    // Pack & storage
    'hike-pack-overnight',
    'hike-rain-cover',
    'gen-dry-bag',

    // Safety (enhanced)
    'hunt-first-aid',
    'hike-whistle-compass',
    'hike-emergency-bivy',
    'hike-first-aid',
    'hike-prb', // Personal Locator Beacon for remote areas
    'hike-bear-bag',
    'hike-blister-kit', // Leukotape + moleskin — single best ROI ounce for multi-day

    // Navigation & light
    'hunt-headlamp',
    'hunt-gps',
    'camp-lantern',
    'hike-guidebook-atmd', // Paper AT guide backup for MD corridor

    // Hydration & food
    'hike-filter-bottle',
    'hike-electrolyte',
    'hike-trail-snacks',
    'hike-meals-freezedried', // Multi-night dinners

    // Clothing
    'hunt-base-merino',
    'hike-boots',
    'hike-socks-merino',
    'hike-socks-merino', // Extra pair
    'hike-socks-merino', // Third pair for rotation
    'hike-rain-shell',
    'fish-sun-shirt',
    'hike-camp-shoes', // Camp relief shoes so boots can dry

    // Sleep system (robust for varying conditions)
    'camp-bag-20f',
    'camp-pad-inflatable',
    'camp-pillow',
    'camp-liner', // Bag liner for cleanliness & warmth boost

    // Cook kit
    'camp-stove-canister',
    'camp-cookset',
    'camp-water-filter',

    // Comfort & bug protection
    'camp-bug-net', // Essential during tick/mosquito season
    'camp-power-bank', // Extended trip phone/GPS charging

    // Trekking & feet care
    'hike-poles',
    'hike-gaiters',

    // Repair & tools
    'gen-knife-fixed', // Multi-use knife
    'camp-fire-starter', // Emergency backup
  ],
};

/**
 * Export all bundles as array for iteration (e.g., in ATTripPlannerScreen).
 */
export const HIKE_GEAR_BUNDLES: HikeGearBundle[] = [
  HIKE_DAY_BUNDLE,
  HIKE_OVERNIGHT_BUNDLE,
  HIKE_MULTIDAY_BUNDLE,
];

/**
 * Resolve a tier string to its corresponding bundle.
 *
 * Usage:
 *   const bundle = resolveBundleByTier('day');
 *   const items = bundle.itemIds;
 */
export function resolveBundleByTier(tier: 'day' | 'overnight' | 'multi-day'): HikeGearBundle {
  const map = {
    day: HIKE_DAY_BUNDLE,
    overnight: HIKE_OVERNIGHT_BUNDLE,
    'multi-day': HIKE_MULTIDAY_BUNDLE,
  };
  return map[tier];
}

/**
 * Get the tier for a given number of nights.
 *
 * Usage:
 *   const tier = nightsToTier(0);  // 'day'
 *   const tier = nightsToTier(1);  // 'overnight'
 *   const tier = nightsToTier(3);  // 'multi-day'
 */
export function nightsToTier(nights: number): 'day' | 'overnight' | 'multi-day' {
  if (nights === 0) return 'day';
  if (nights === 1) return 'overnight';
  return 'multi-day';
}

/**
 * Known gaps — gear that would further improve bundles if added to
 * GEAR_CATALOG. These are intentionally NOT referenced in itemIds above
 * (doing so would break the "every id exists" contract test).
 *
 *   - Pack liner / trash-compactor bag: a waterproof liner inside the pack
 *     for multi-day rain protection (dry bags alone don't cover everything).
 *   - Hiking-boot care kit: leather conditioner + insole spares for $120+
 *     boot longevity between trips.
 */
