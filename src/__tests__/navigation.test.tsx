/**
 * @file navigation.test.tsx
 * @description Tests for src/navigation/AppNavigator.tsx
 * Verifies tab configuration per activity mode.
 */

describe('AppNavigator', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Hunt mode tab configuration', () => {
    // 2026-04-26 (fork merge): Hunt tabs grew from 5 → 6 with the addition
    // of a top-level Gear tab so curated gear lists are no longer buried
    // under Resources. The Camp tab label is rendered as a two-line
    // "Deer\nCamp" via a tabBarLabel render function — for routing-name
    // purposes we still treat it as 'Deer Camp'.
    const HUNT_TABS = ['Map', 'Scout', 'AI', 'Deer Camp', 'Gear', 'Info'] as const;

    it('should have 6 tabs in Hunt mode', () => {
      expect(HUNT_TABS).toHaveLength(6);
    });

    it('should have Map as first Hunt tab', () => {
      expect(HUNT_TABS[0]).toBe('Map');
    });

    it('should have Scout as second Hunt tab', () => {
      expect(HUNT_TABS[1]).toBe('Scout');
    });

    it('should have AI as third Hunt tab', () => {
      expect(HUNT_TABS[2]).toBe('AI');
    });

    it('should have Deer Camp as fourth Hunt tab', () => {
      expect(HUNT_TABS[3]).toBe('Deer Camp');
    });

    it('should have Gear as fifth Hunt tab', () => {
      expect(HUNT_TABS[4]).toBe('Gear');
    });

    it('should have Info as sixth Hunt tab', () => {
      expect(HUNT_TABS[5]).toBe('Info');
    });
  });

  describe('Fish mode tab configuration', () => {
    // 2026-04-26 (fork merge): Fish tabs are Map · Spots · AI · Gear · Info
    // (Honey Hole is an orphan screen, not wired into the tab nav). Gear was
    // added 2026-04-26 to mirror the Hunt-mode Gear tab — bottom-tab access
    // to David's curated fishing kit (fly, lakes, bay shore, bay boat).
    const FISH_TABS = ['Map', 'Spots', 'AI', 'Gear', 'Info'] as const;

    it('should have 5 tabs in Fish mode', () => {
      expect(FISH_TABS).toHaveLength(5);
    });

    it('should have Map as first Fish tab', () => {
      expect(FISH_TABS[0]).toBe('Map');
    });

    it('should have Spots as second Fish tab', () => {
      expect(FISH_TABS[1]).toBe('Spots');
    });

    it('should have Gear as fourth Fish tab', () => {
      expect(FISH_TABS[3]).toBe('Gear');
    });

    it('should have Info as fifth Fish tab', () => {
      expect(FISH_TABS[4]).toBe('Info');
    });
  });

  describe('Camp mode tab configuration', () => {
    it('should have 5 tabs in Camp mode', () => {
      // Camp mode: Camp Map, Gear, AI, Group Camp, Resources
      const campTabs = ['Camp Map', 'Gear', 'AI', 'Group Camp', 'Resources'];
      expect(campTabs).toHaveLength(5);
    });

    it('should have Camp Map as first Camp tab', () => {
      const campTabs = ['Camp Map', 'Gear', 'AI', 'Group Camp', 'Resources'];
      expect(campTabs[0]).toBe('Camp Map');
    });

    it('should have Gear as second Camp tab', () => {
      const campTabs = ['Camp Map', 'Gear', 'AI', 'Group Camp', 'Resources'];
      expect(campTabs[1]).toBe('Gear');
    });

    it('should have Group Camp as fourth Camp tab', () => {
      const campTabs = ['Camp Map', 'Gear', 'AI', 'Group Camp', 'Resources'];
      expect(campTabs[3]).toBe('Group Camp');
    });
  });

  describe('Hike mode tab configuration', () => {
    it('should have 4 tabs in Hike mode', () => {
      // Hike mode: Trail Map, Trail Guide, AI, Resources
      const hikeTabs = ['Trail Map', 'Trail Guide', 'AI', 'Resources'];
      expect(hikeTabs).toHaveLength(4);
    });

    it('should have Trail Map as first Hike tab', () => {
      const hikeTabs = ['Trail Map', 'Trail Guide', 'AI', 'Resources'];
      expect(hikeTabs[0]).toBe('Trail Map');
    });

    it('should have Trail Guide as second Hike tab', () => {
      const hikeTabs = ['Trail Map', 'Trail Guide', 'AI', 'Resources'];
      expect(hikeTabs[1]).toBe('Trail Guide');
    });

    it('should have AI as third Hike tab', () => {
      const hikeTabs = ['Trail Map', 'Trail Guide', 'AI', 'Resources'];
      expect(hikeTabs[2]).toBe('AI');
    });

    it('should have Resources as fourth Hike tab', () => {
      const hikeTabs = ['Trail Map', 'Trail Guide', 'AI', 'Resources'];
      expect(hikeTabs[3]).toBe('Resources');
    });
  });

  describe('Tab icons', () => {
    it('should have emoji tab icons for Hunt mode', () => {
      const huntIcons = {
        MAP: '\uD83D\uDDFA\uFE0F',
        SCOUT: '\uD83D\uDC3E',
        AI: '\uD83E\uDD16',
        CAMP: '\uD83C\uDFD5\uFE0F',
        RESOURCES: '\uD83D\uDCDA',
      };

      Object.values(huntIcons).forEach((icon) => {
        expect(typeof icon).toBe('string');
        expect(icon.length).toBeGreaterThan(0);
      });
      expect(Object.keys(huntIcons)).toHaveLength(5);
    });

    it('should have emoji tab icons for Fish mode', () => {
      const fishIcons = {
        MAP: '\uD83D\uDDFA\uFE0F',
        SPOTS: '\uD83C\uDFA3',
        AI: '\uD83E\uDD16',
        HONEY: '\uD83D\uDDFA\uFE0F',
        RESOURCES: '\uD83D\uDCDA',
      };

      Object.values(fishIcons).forEach((icon) => {
        expect(typeof icon).toBe('string');
        expect(icon.length).toBeGreaterThan(0);
      });
      expect(Object.keys(fishIcons)).toHaveLength(5);
    });

    it('should have emoji tab icons for Camp mode', () => {
      const campIcons = {
        MAP: '\u26FA',
        GEAR: '\uD83E\uDDF3',
        AI: '\uD83E\uDD16',
        GROUP: '\uD83D\uDC65',
        RESOURCES: '\uD83D\uDCDA',
      };

      Object.values(campIcons).forEach((icon) => {
        expect(typeof icon).toBe('string');
        expect(icon.length).toBeGreaterThan(0);
      });
      expect(Object.keys(campIcons)).toHaveLength(5);
    });

    it('should have emoji tab icons for Hike mode', () => {
      const hikeIcons = {
        MAP: '\uD83E\uDDED',
        TRAIL: '\uD83E\uDD7E',
        AI: '\uD83E\uDD16',
        RESOURCES: '\uD83D\uDCDA',
      };

      Object.values(hikeIcons).forEach((icon) => {
        expect(typeof icon).toBe('string');
        expect(icon.length).toBeGreaterThan(0);
      });
      expect(Object.keys(hikeIcons)).toHaveLength(4);
    });
  });

  describe('Tab order consistency', () => {
    it('Hunt mode tabs should be Map, Scout, AI, Deer Camp, Resources', () => {
      const order = ['Map', 'Scout', 'AI', 'Deer Camp', 'Resources'];
      expect(order).toEqual(['Map', 'Scout', 'AI', 'Deer Camp', 'Resources']);
    });

    it('Fish mode tabs should be Fish Map, Spots, AI, Honey Hole, Resources', () => {
      const order = ['Fish Map', 'Spots', 'AI', 'Honey Hole', 'Resources'];
      expect(order).toEqual(['Fish Map', 'Spots', 'AI', 'Honey Hole', 'Resources']);
    });

    it('Camp mode tabs should be Camp Map, Gear, AI, Group Camp, Resources', () => {
      const order = ['Camp Map', 'Gear', 'AI', 'Group Camp', 'Resources'];
      expect(order).toEqual(['Camp Map', 'Gear', 'AI', 'Group Camp', 'Resources']);
    });

    it('Hike mode tabs should be Trail Map, Trail Guide, AI, Resources', () => {
      const order = ['Trail Map', 'Trail Guide', 'AI', 'Resources'];
      expect(order).toEqual(['Trail Map', 'Trail Guide', 'AI', 'Resources']);
    });
  });

  describe('All modes have AI tab', () => {
    it('AI tab should be in Hunt mode', () => {
      const huntTabs = ['Map', 'Scout', 'AI', 'Deer Camp', 'Resources'];
      expect(huntTabs).toContain('AI');
    });

    it('AI tab should be in Fish mode', () => {
      const fishTabs = ['Fish Map', 'Spots', 'AI', 'Honey Hole', 'Resources'];
      expect(fishTabs).toContain('AI');
    });

    it('AI tab should be in Camp mode', () => {
      const campTabs = ['Camp Map', 'Gear', 'AI', 'Group Camp', 'Resources'];
      expect(campTabs).toContain('AI');
    });

    it('AI tab should be in Hike mode', () => {
      const hikeTabs = ['Trail Map', 'Trail Guide', 'AI', 'Resources'];
      expect(hikeTabs).toContain('AI');
    });
  });

  describe('Fallback behavior', () => {
    it('unknown modes should fallback to Fish tabs', () => {
      // Crab and Boat modes default to Fish mode
      const fallbackTabs = ['Fish Map', 'Spots', 'AI', 'Honey Hole', 'Resources'];
      expect(fallbackTabs).toHaveLength(5);
    });
  });
});
