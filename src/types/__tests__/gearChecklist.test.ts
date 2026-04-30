/**
 * gearChecklist.test.ts — pure-function contract for the gear checklist
 * types + base library + helpers.
 */

import {
  BASE_GEAR_LIBRARY,
  GEAR_CATEGORY_META,
  countItems,
  defaultChecklistName,
  groupByCategory,
  GearChecklistItem,
} from '../gearChecklist';
import type { WaypointMode } from '../../types/userWaypoint';

const ALL_MODES: WaypointMode[] = ['hunt', 'fish', 'camp', 'hike'];

describe('GEAR_CATEGORY_META', () => {
  it('every category has a non-empty label and 2-letter code', () => {
    for (const [, meta] of Object.entries(GEAR_CATEGORY_META)) {
      expect(meta.label.length).toBeGreaterThan(0);
      expect(meta.letterCode.length).toBe(2);
      expect(meta.sortOrder).toBeGreaterThan(0);
    }
  });

  it('sortOrder values are unique', () => {
    const orders = Object.values(GEAR_CATEGORY_META).map((m) => m.sortOrder);
    const unique = new Set(orders);
    expect(unique.size).toBe(orders.length);
  });
});

describe('BASE_GEAR_LIBRARY', () => {
  it('has a non-empty seed list for every mode', () => {
    for (const mode of ALL_MODES) {
      expect(BASE_GEAR_LIBRARY[mode].length).toBeGreaterThan(0);
    }
  });

  it('every seed item has a label and a known category', () => {
    for (const mode of ALL_MODES) {
      for (const item of BASE_GEAR_LIBRARY[mode]) {
        expect(item.label.trim().length).toBeGreaterThan(0);
        expect(GEAR_CATEGORY_META[item.category]).toBeDefined();
      }
    }
  });

  it('hunt seed includes blaze orange + license + harness items', () => {
    const labels = BASE_GEAR_LIBRARY.hunt.map((i) => i.label.toLowerCase());
    expect(labels.some((l) => l.includes('blaze orange'))).toBe(true);
    expect(labels.some((l) => l.includes('license'))).toBe(true);
    expect(labels.some((l) => l.includes('harness'))).toBe(true);
  });

  it('fish seed includes license + PFD + rod', () => {
    const labels = BASE_GEAR_LIBRARY.fish.map((i) => i.label.toLowerCase());
    expect(labels.some((l) => l.includes('license'))).toBe(true);
    expect(labels.some((l) => l.includes('pfd'))).toBe(true);
    expect(labels.some((l) => l.includes('rod'))).toBe(true);
  });

  it('camp seed includes tent + sleeping bag + bear-resistant storage', () => {
    const labels = BASE_GEAR_LIBRARY.camp.map((i) => i.label.toLowerCase());
    expect(labels.some((l) => l.includes('tent'))).toBe(true);
    expect(labels.some((l) => l.includes('sleeping bag'))).toBe(true);
    expect(labels.some((l) => l.includes('bear'))).toBe(true);
  });

  it('hike seed includes trail map + day pack + blister kit', () => {
    const labels = BASE_GEAR_LIBRARY.hike.map((i) => i.label.toLowerCase());
    expect(labels.some((l) => l.includes('trail map'))).toBe(true);
    expect(labels.some((l) => l.includes('day pack'))).toBe(true);
    expect(labels.some((l) => l.includes('blister'))).toBe(true);
  });
});

describe('defaultChecklistName', () => {
  it('starts with the mode name capitalized for every mode', () => {
    expect(defaultChecklistName('hunt').startsWith('Hunt — ')).toBe(true);
    expect(defaultChecklistName('fish').startsWith('Fish — ')).toBe(true);
    expect(defaultChecklistName('camp').startsWith('Camp — ')).toBe(true);
    expect(defaultChecklistName('hike').startsWith('Hike — ')).toBe(true);
  });

  it('embeds a YYYY-MM-DD date', () => {
    expect(defaultChecklistName('hunt')).toMatch(/\d{4}-\d{2}-\d{2}$/);
  });
});

describe('countItems', () => {
  it('returns 0/0 for empty list', () => {
    expect(countItems([])).toEqual({ checked: 0, total: 0 });
  });

  it('counts checked vs. total correctly', () => {
    const items: GearChecklistItem[] = [
      { id: '1', label: 'a', category: 'safety', checked: true, isCustom: false },
      { id: '2', label: 'b', category: 'safety', checked: false, isCustom: false },
      { id: '3', label: 'c', category: 'tools', checked: true, isCustom: true },
    ];
    expect(countItems(items)).toEqual({ checked: 2, total: 3 });
  });
});

describe('groupByCategory', () => {
  it('returns empty array for empty items', () => {
    expect(groupByCategory([])).toEqual([]);
  });

  it('groups items into category buckets sorted by sortOrder', () => {
    const items: GearChecklistItem[] = [
      { id: '1', label: 'pliers', category: 'tools', checked: false, isCustom: false },
      { id: '2', label: 'first aid', category: 'safety', checked: false, isCustom: false },
      { id: '3', label: 'water', category: 'food-water', checked: false, isCustom: false },
      { id: '4', label: 'tape', category: 'tools', checked: false, isCustom: false },
    ];
    const grouped = groupByCategory(items);
    // sortOrder: safety=1, food-water=4, tools=6
    expect(grouped.map((g) => g.category)).toEqual([
      'safety',
      'food-water',
      'tools',
    ]);
    expect(grouped[2].items.map((i) => i.label)).toEqual(['pliers', 'tape']);
  });
});
