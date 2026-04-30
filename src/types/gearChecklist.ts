/**
 * gearChecklist.ts — types + base content for the pre-trip Gear Checklist.
 *
 * A user creates one or more named checklists per mode (e.g., "Opening day
 * stand sit", "Striper run weekend", "Catoctin overnight"). Each checklist
 * is a list of items with a checked state. Items either come from the
 * mode's BASE_GEAR_LIBRARY (seeded on creation) or are user-added customs.
 *
 * Design choices:
 *  - "Checklist" is the noun the user manages, not "trip" — a single trip
 *    might have multiple lists (truck box, day pack), and a single list
 *    might be reused across many trips.
 *  - The base library is intentionally short and durable — household
 *    outdoor practice, not affiliate SKUs. The Buyer's Guide / Starter
 *    Gear screens already cover product recommendations.
 *  - Items carry a `category` so the edit screen can group them on
 *    render. Categories are fixed; users cannot add new categories.
 *  - `isCustom: true` distinguishes user-added items from seeded ones
 *    so the edit screen can show a "remove" affordance only on customs
 *    (seeded items can only be unchecked / kept).
 *
 * Phase A.6 — added 2026-04-24 per V2_3_FEATURE_EXPANSION_PLAN.
 */

import type { WaypointMode } from './userWaypoint';

export type GearCategory =
  | 'safety'
  | 'navigation'
  | 'apparel'
  | 'food-water'
  | 'shelter'
  | 'tools'
  | 'optics'
  | 'mode-specific'
  | 'other';

export interface GearChecklistItem {
  /** stable id within a checklist (for keyExtractor + toggle lookups). */
  id: string;
  /** human label, e.g. "Headlamp + spare batteries". */
  label: string;
  /** category bucket for rendering. */
  category: GearCategory;
  /** whether the user has packed/checked this item. */
  checked: boolean;
  /**
   * true if the user added this item themselves (vs. seeded from
   * BASE_GEAR_LIBRARY). Customs are removable; seeds are not.
   */
  isCustom: boolean;
}

export interface GearChecklist {
  id: string;
  createdAt: string; // ISO
  updatedAt: string; // ISO
  /** Mode this checklist belongs to. */
  mode: WaypointMode;
  /** Display name, e.g. "Opening day stand sit". */
  name: string;
  /** Optional planned trip date (YYYY-MM-DD); purely for display sort. */
  tripDate?: string;
  /** Ordered items — render order matches array order. */
  items: GearChecklistItem[];
}

/**
 * Display metadata for each category. Title-cased label, two-letter code
 * for tight chip rendering, and a color from the existing palette so the
 * UI stays consistent with the rest of the personal layer.
 */
export const GEAR_CATEGORY_META: Record<
  GearCategory,
  { label: string; letterCode: string; sortOrder: number }
> = {
  safety: { label: 'Safety', letterCode: 'SF', sortOrder: 1 },
  navigation: { label: 'Navigation', letterCode: 'NV', sortOrder: 2 },
  apparel: { label: 'Apparel', letterCode: 'AP', sortOrder: 3 },
  'food-water': { label: 'Food & Water', letterCode: 'FW', sortOrder: 4 },
  shelter: { label: 'Shelter & Sleep', letterCode: 'SH', sortOrder: 5 },
  tools: { label: 'Tools', letterCode: 'TL', sortOrder: 6 },
  optics: { label: 'Optics & Tech', letterCode: 'OP', sortOrder: 7 },
  'mode-specific': { label: 'Activity-specific', letterCode: 'MS', sortOrder: 8 },
  other: { label: 'Other', letterCode: 'OT', sortOrder: 9 },
};

/**
 * Sentinel base library — items are baseline outdoor practice for
 * Maryland conditions. Conservative on purpose: a checklist generator
 * that hands the user a 50-item list trains them to ignore it.
 *
 * Cross-mode safety/navigation items (water, headlamp, first aid, phone,
 * weather check) appear under SAFETY and NAVIGATION in every mode rather
 * than being deduped. The user can uncheck what they don't need; missing
 * a critical item silently is the worse failure.
 */
const SAFETY_CORE: { label: string; category: GearCategory }[] = [
  { label: 'First-aid kit (compact)', category: 'safety' },
  { label: 'Headlamp + spare batteries', category: 'safety' },
  { label: 'Phone charged + battery bank', category: 'safety' },
  { label: 'Whistle / signal mirror', category: 'safety' },
  { label: 'Lighter + waterproof matches', category: 'safety' },
  { label: 'Water (≥ 1L) + filter or tablets', category: 'food-water' },
  { label: 'Snacks / lunch', category: 'food-water' },
  { label: 'Weather check + told someone the plan', category: 'navigation' },
  { label: 'Map / GPS / offline tile pack', category: 'navigation' },
  { label: 'Compass', category: 'navigation' },
  { label: 'Layers for forecast (rain shell, insulator)', category: 'apparel' },
];

const HUNT_SPECIFIC: { label: string; category: GearCategory }[] = [
  { label: 'Hunting license + tags', category: 'safety' },
  { label: 'Blaze orange (vest + hat) — required during firearm seasons', category: 'safety' },
  { label: 'Firearm / bow + ammo or arrows', category: 'mode-specific' },
  { label: 'Field-dressing knife + gloves', category: 'tools' },
  { label: 'Drag rope or game cart', category: 'tools' },
  { label: 'Scent-control spray / wipes', category: 'mode-specific' },
  { label: 'Wind checker', category: 'mode-specific' },
  { label: 'Range finder', category: 'optics' },
  { label: 'Binoculars', category: 'optics' },
  { label: 'Stand harness (full-body) + lifeline', category: 'safety' },
  { label: 'Trail-cam SD cards (if pulling)', category: 'tools' },
  { label: 'Quiet seat cushion', category: 'mode-specific' },
];

const FISH_SPECIFIC: { label: string; category: GearCategory }[] = [
  { label: 'Fishing license (MD non-tidal or tidal as appropriate)', category: 'safety' },
  { label: 'Rod(s) + reel(s) + spare line', category: 'mode-specific' },
  { label: 'Tackle box / bait', category: 'mode-specific' },
  { label: 'Pliers + line cutters', category: 'tools' },
  { label: 'Net', category: 'mode-specific' },
  { label: 'Polarized sunglasses', category: 'optics' },
  { label: 'PFD (boat / kayak / yak only)', category: 'safety' },
  { label: 'Stringer or cooler with ice', category: 'mode-specific' },
  { label: 'Sun hat + sunscreen', category: 'apparel' },
  { label: 'Wading boots / waders (if wading)', category: 'apparel' },
];

const CAMP_SPECIFIC: { label: string; category: GearCategory }[] = [
  { label: 'Tent / hammock + footprint', category: 'shelter' },
  { label: 'Sleeping bag rated for forecast low', category: 'shelter' },
  { label: 'Sleeping pad', category: 'shelter' },
  { label: 'Pillow or stuff-sack pillow', category: 'shelter' },
  { label: 'Stove + fuel + lighter', category: 'tools' },
  { label: 'Cookware + utensils + cup', category: 'tools' },
  { label: 'Trash bag (pack out everything)', category: 'tools' },
  { label: 'Bear-resistant food storage / hang line', category: 'safety' },
  { label: 'Camp chair (optional)', category: 'shelter' },
  { label: 'Tarp / rain fly', category: 'shelter' },
  { label: 'Camp shoes / sandals', category: 'apparel' },
  { label: 'Toiletries + biodegradable soap', category: 'other' },
];

const HIKE_SPECIFIC: { label: string; category: GearCategory }[] = [
  { label: 'Trail map / GPS track (downloaded offline)', category: 'navigation' },
  { label: 'Trekking poles (optional)', category: 'mode-specific' },
  { label: 'Sun hat + sunscreen', category: 'apparel' },
  { label: 'Bug spray (DEET / picaridin)', category: 'apparel' },
  { label: 'Trail snacks / electrolyte mix', category: 'food-water' },
  { label: 'Day pack (15–25L)', category: 'mode-specific' },
  { label: 'Trail shoes / boots broken in', category: 'apparel' },
  { label: 'Blister kit (moleskin, tape)', category: 'safety' },
  { label: 'Trash bag for found litter', category: 'other' },
  { label: 'Camera (phone OK)', category: 'optics' },
];

/**
 * Per-mode seed lists — combined SAFETY_CORE + mode-specific items.
 *
 * Order in each array is the order the items will appear in the
 * generated checklist (after sorting by category sortOrder during render).
 */
export const BASE_GEAR_LIBRARY: Record<
  WaypointMode,
  { label: string; category: GearCategory }[]
> = {
  hunt: [...SAFETY_CORE, ...HUNT_SPECIFIC],
  fish: [...SAFETY_CORE, ...FISH_SPECIFIC],
  camp: [...SAFETY_CORE, ...CAMP_SPECIFIC],
  hike: [...SAFETY_CORE, ...HIKE_SPECIFIC],
};

/** Default name for a freshly-created checklist in a given mode. */
export function defaultChecklistName(mode: WaypointMode): string {
  const today = new Date();
  const m = String(today.getMonth() + 1).padStart(2, '0');
  const d = String(today.getDate()).padStart(2, '0');
  const dateLabel = `${today.getFullYear()}-${m}-${d}`;
  switch (mode) {
    case 'hunt':
      return `Hunt — ${dateLabel}`;
    case 'fish':
      return `Fish — ${dateLabel}`;
    case 'camp':
      return `Camp — ${dateLabel}`;
    case 'hike':
      return `Hike — ${dateLabel}`;
  }
}

/** Counts {checked, total} for the progress meter. */
export function countItems(items: GearChecklistItem[]): {
  checked: number;
  total: number;
} {
  let checked = 0;
  for (const it of items) if (it.checked) checked++;
  return { checked, total: items.length };
}

/**
 * Group items by category, sorted by GEAR_CATEGORY_META.sortOrder. Within
 * a category, items keep their original order. Empty categories are
 * omitted.
 */
export function groupByCategory(
  items: GearChecklistItem[],
): { category: GearCategory; items: GearChecklistItem[] }[] {
  const buckets = new Map<GearCategory, GearChecklistItem[]>();
  for (const it of items) {
    const arr = buckets.get(it.category) ?? [];
    arr.push(it);
    buckets.set(it.category, arr);
  }
  return Array.from(buckets.entries())
    .map(([category, list]) => ({ category, items: list }))
    .sort(
      (a, b) =>
        GEAR_CATEGORY_META[a.category].sortOrder -
        GEAR_CATEGORY_META[b.category].sortOrder,
    );
}
