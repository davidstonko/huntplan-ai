/**
 * DEPRECATED — archived 2026-04-17 as part of V2.2.0 cleanup.
 *
 * This file previously exported a 1,229-record dataset of fish-barriers / dams
 * mis-sourced from the Chesapeake Bay Program. It was NOT the angler-access
 * dataset the Fish Map needed, and produced misleading UI.
 *
 * All callers have been migrated to `marylandAnglerAccessSites.ts`, which
 * contains the correct 579-site MD DNR Public Angler Access dataset.
 *
 * This file is kept only to preserve the module path — do not add new
 * imports. Remove entirely once we are confident no external references exist
 * (after App Store approval of V2.2.0).
 */

// Empty exports preserved for compile-safety in case any forgotten import survives.
// Intentionally no runtime data here.

export type FishingCategory = 'access' | 'shellfish' | 'spawning' | 'habitat';

export interface FishingLocation {
  id: string;
  name: string;
  category: FishingCategory;
}

export const marylandFishingLocations: FishingLocation[] = [];

export const FISHING_CATEGORIES: Record<
  FishingCategory,
  { emoji: string; label: string; color: string }
> = {
  access: { emoji: '\uD83C\uDFA3', label: 'Access', color: '#0277BD' },
  shellfish: { emoji: '\uD83E\uDD80', label: 'Shellfish', color: '#C85A3E' },
  spawning: { emoji: '\uD83D\uDC23', label: 'Spawning', color: '#26A69A' },
  habitat: { emoji: '\uD83C\uDF3F', label: 'Habitat', color: '#8B7355' },
};

export const FISHING_DATA_STATS = {
  total: 0,
  byCategory: { access: 0, shellfish: 0, spawning: 0, habitat: 0 },
  deprecated: true,
};
