/**
 * userWaypoint.test.ts — Contract tests for the UserWaypoint types module.
 *
 * Locks three invariants the rest of the stack depends on:
 *   1. Every category referenced in CATEGORIES_BY_MODE has a matching
 *      CATEGORY_META entry (no silent 'undefined' crashes at render time).
 *   2. Every entry in CATEGORY_META has well-formed fields (hex color, non-
 *      empty letter code, valid mode).
 *   3. resolveWaypointColor / resolveWaypointLetterCode honor overrides and
 *      fall back safely for unknown categories.
 */

import {
  UserWaypoint,
  WaypointMode,
  WaypointCategory,
  CATEGORY_META,
  CATEGORIES_BY_MODE,
  resolveWaypointColor,
  resolveWaypointLetterCode,
} from '../userWaypoint';

const HEX_COLOR = /^#[0-9A-Fa-f]{6}$/;
const MODES: WaypointMode[] = ['hunt', 'fish', 'camp', 'hike'];

function makeWaypoint(overrides: Partial<UserWaypoint> = {}): UserWaypoint {
  return {
    id: 'wp-test',
    createdAt: '2026-04-24T00:00:00.000Z',
    updatedAt: '2026-04-24T00:00:00.000Z',
    mode: 'hunt',
    category: 'tree-stand',
    title: 'Test',
    notes: '',
    lat: 39,
    lng: -76,
    photoUris: [],
    ...overrides,
  };
}

describe('CATEGORY_META', () => {
  it('exposes well-formed metadata for every known category', () => {
    for (const [category, meta] of Object.entries(CATEGORY_META)) {
      expect(meta.label).toBeTruthy();
      expect(typeof meta.label).toBe('string');
      expect(meta.letterCode.length).toBeGreaterThan(0);
      expect(meta.letterCode.length).toBeLessThanOrEqual(3);
      expect(meta.defaultColor).toMatch(HEX_COLOR);
      expect(MODES).toContain(meta.mode);
      // Sanity: the key is a real category value (not a typo like 'stand').
      expect(category.length).toBeGreaterThan(0);
    }
  });

  it('uses mode-appropriate color families', () => {
    // Smoke check — categories we've already visually tuned should keep
    // their intended colors. If this ever fails, it's a signal someone
    // changed a color without updating the design lock.
    expect(CATEGORY_META['tree-stand'].defaultColor).toBe('#C62828');
    expect(CATEGORY_META['hole'].defaultColor).toBe('#0277BD');
    expect(CATEGORY_META['tent'].defaultColor).toBe('#6D4C41');
    expect(CATEGORY_META['landmark'].defaultColor).toBe('#2E7D32');
  });
});

describe('CATEGORIES_BY_MODE', () => {
  it.each(MODES)('returns at least one category for %s mode', (mode) => {
    const list = CATEGORIES_BY_MODE[mode];
    expect(list.length).toBeGreaterThan(0);
  });

  it('includes a CATEGORY_META entry for every listed category', () => {
    for (const mode of MODES) {
      for (const category of CATEGORIES_BY_MODE[mode]) {
        expect(CATEGORY_META[category as WaypointCategory]).toBeDefined();
      }
    }
  });

  it('exposes parking and other in every mode (cross-mode shared)', () => {
    for (const mode of MODES) {
      expect(CATEGORIES_BY_MODE[mode]).toContain('parking');
      expect(CATEGORIES_BY_MODE[mode]).toContain('other');
    }
  });

  it('has no duplicate categories within a single mode', () => {
    for (const mode of MODES) {
      const list = CATEGORIES_BY_MODE[mode];
      const seen = new Set(list);
      expect(seen.size).toBe(list.length);
    }
  });
});

describe('resolveWaypointColor', () => {
  it('returns colorOverride when provided and hex-shaped', () => {
    const wp = makeWaypoint({ colorOverride: '#123456' });
    expect(resolveWaypointColor(wp)).toBe('#123456');
  });

  it('ignores a colorOverride that is not a hex literal', () => {
    const wp = makeWaypoint({ colorOverride: 'red' });
    expect(resolveWaypointColor(wp)).toBe(CATEGORY_META['tree-stand'].defaultColor);
  });

  it('falls back to the category default when no override is set', () => {
    const wp = makeWaypoint({ category: 'hole', colorOverride: undefined });
    expect(resolveWaypointColor(wp)).toBe(CATEGORY_META['hole'].defaultColor);
  });

  it('returns a safe grey for unknown categories (defensive)', () => {
    const wp = makeWaypoint({ category: 'bogus' as WaypointCategory });
    expect(resolveWaypointColor(wp)).toBe('#616161');
  });
});

describe('resolveWaypointLetterCode', () => {
  it('returns the CATEGORY_META letter code for known categories', () => {
    const wp = makeWaypoint({ category: 'tree-stand' });
    expect(resolveWaypointLetterCode(wp)).toBe('ST');
  });

  it('returns PIN for unknown categories (defensive)', () => {
    const wp = makeWaypoint({ category: 'bogus' as WaypointCategory });
    expect(resolveWaypointLetterCode(wp)).toBe('PIN');
  });
});
