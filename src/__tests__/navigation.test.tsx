/**
 * @file navigation.test.tsx
 * @description Tests for the navigation route-name contract
 * (src/navigation/routes.ts + AppNavigator.tsx).
 *
 * 2026-09-18 (five-tab restructure): every mode has the SAME five tabs —
 * Map | Plan | Log | AI | More — with route names MapTab / PlanTab /
 * LogTab / AITab / MoreTab. Structural wiring (which stack registers
 * which screen) is asserted in wiringIntegrity.test.ts; this file locks
 * the exported contract that screens import.
 */

import {
  TAB,
  TAB_ORDER,
  MODE_TABS_ROUTE,
  MAP_ROOT,
  PLAN_ROOT,
  PLANNER_SCREEN,
  MODE_LOG_SCREEN,
  ROOT_ROUTES,
} from '../navigation/routes';

const MODES = ['hunt', 'fish', 'camp', 'hike'] as const;

describe('navigation route contract', () => {
  describe('tab names', () => {
    it('exposes exactly five tabs: Map | Plan | Log | AI | More', () => {
      expect(TAB_ORDER).toEqual(['MapTab', 'PlanTab', 'LogTab', 'AITab', 'MoreTab']);
      expect(TAB_ORDER).toHaveLength(5);
    });

    it('every tab constant ends in "Tab" (so a11y labels derive cleanly)', () => {
      for (const name of Object.values(TAB)) {
        expect(name).toMatch(/Tab$/);
      }
    });

    it('the map agent contract names resolve: LogTab and MoreTab', () => {
      expect(TAB.LOG).toBe('LogTab');
      expect(TAB.MORE).toBe('MoreTab');
      expect(TAB.AI).toBe('AITab');
    });

    it('tab names are unique', () => {
      expect(new Set(TAB_ORDER).size).toBe(TAB_ORDER.length);
    });
  });

  describe('per-mode roots', () => {
    it('each mode has a root-Stack tabs route', () => {
      expect(MODE_TABS_ROUTE).toEqual({
        hunt: 'HuntTabs',
        fish: 'FishTabs',
        camp: 'CampTabs',
        hike: 'HikeTabs',
      });
    });

    it('map roots keep their historical names (map screens navigate to them)', () => {
      expect(MAP_ROOT).toEqual({
        hunt: 'MapMain',
        fish: 'FishMapMain',
        camp: 'CampMapMain',
        hike: 'HikeMapMain',
      });
    });

    it('Plan roots: Hunt is Scout (no stack), Fish spots, Camp planner, Hike trails', () => {
      expect(PLAN_ROOT.hunt).toBeNull();
      expect(PLAN_ROOT.fish).toBe('FishSpotsMain');
      expect(PLAN_ROOT.camp).toBe('CampTripPlannerMain');
      expect(PLAN_ROOT.hike).toBe('HikeTrailsMain');
    });

    it('trip planners keep their historical nested screen names', () => {
      expect(PLANNER_SCREEN.camp).toBe('CampTripPlannerMain');
      expect(PLANNER_SCREEN.hike).toBe('HikeTripPlannerMain');
      // Camp's planner IS the Plan root; Hike's is pushed over the browser.
      expect(PLAN_ROOT.camp).toBe(PLANNER_SCREEN.camp);
      expect(PLAN_ROOT.hike).not.toBe(PLANNER_SCREEN.hike);
    });

    it('mode logs: Hunt → HarvestLog, Fish → CatchLog, Camp/Hike none', () => {
      expect(MODE_LOG_SCREEN).toEqual({
        hunt: 'HarvestLog',
        fish: 'CatchLog',
        camp: null,
        hike: null,
      });
    });

    it('every mode is covered by every per-mode table', () => {
      for (const m of MODES) {
        expect(MODE_TABS_ROUTE[m]).toBeDefined();
        expect(MAP_ROOT[m]).toBeDefined();
        expect(m in PLAN_ROOT).toBe(true);
        expect(m in MODE_LOG_SCREEN).toBe(true);
      }
    });
  });

  describe('root-level cross-mode routes', () => {
    it('Settings, Forum, Gear, OfflineMaps and Weather are root routes', () => {
      expect([...ROOT_ROUTES]).toEqual(['Settings', 'Forum', 'Gear', 'OfflineMaps', 'Weather']);
    });

    it('root routes never collide with tab names', () => {
      for (const r of ROOT_ROUTES) {
        expect(TAB_ORDER).not.toContain(r);
      }
    });
  });
});
