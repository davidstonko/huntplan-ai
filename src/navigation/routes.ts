/**
 * @file routes.ts
 * @description Route-name contract for the five-tab navigation.
 *
 * Every mode's Tab.Navigator uses the SAME five tab route names, so any
 * screen can `navigation.navigate(TAB.LOG)` without knowing the mode.
 * Import from here instead of typing the strings so a rename is a
 * one-file change.
 */

import type { ActivityMode } from '../context/ActivityModeContext';

export type { ActivityMode };

/** Tab route names — identical in Hunt, Fish, Camp and Hike. */
export const TAB = {
  MAP: 'MapTab',
  PLAN: 'PlanTab',
  LOG: 'LogTab',
  AI: 'AITab',
  MORE: 'MoreTab',
} as const;

export type TabRouteName = (typeof TAB)[keyof typeof TAB];

/** Ordered tab list, as rendered left → right. */
export const TAB_ORDER: readonly TabRouteName[] = [
  TAB.MAP,
  TAB.PLAN,
  TAB.LOG,
  TAB.AI,
  TAB.MORE,
];

/** Root-Stack route that owns each mode's Tab.Navigator. */
export const MODE_TABS_ROUTE: Record<ActivityMode, 'HuntTabs' | 'FishTabs' | 'CampTabs' | 'HikeTabs'> = {
  hunt: 'HuntTabs',
  fish: 'FishTabs',
  camp: 'CampTabs',
  hike: 'HikeTabs',
};

/** Root screen of each mode's Map stack (kept stable for map-screen navigate() calls). */
export const MAP_ROOT: Record<ActivityMode, string> = {
  hunt: 'MapMain',
  fish: 'FishMapMain',
  camp: 'CampMapMain',
  hike: 'HikeMapMain',
};

/** Root screen of each mode's Plan stack (Hunt's Plan tab is ScoutScreen directly — no stack). */
export const PLAN_ROOT: Record<ActivityMode, string | null> = {
  hunt: null,
  fish: 'FishSpotsMain',
  camp: 'CampTripPlannerMain',
  hike: 'HikeTrailsMain',
};

/**
 * Trip-planner screen inside the Plan tab, per trip kind. Camp's planner
 * is the Plan root; Hike's is pushed over the trail browser.
 */
export const PLANNER_SCREEN = {
  camp: 'CampTripPlannerMain',
  hike: 'HikeTripPlannerMain',
} as const;

/** Log-tab screen for the mode's harvest / catch log (Camp + Hike have none). */
export const MODE_LOG_SCREEN: Record<ActivityMode, string | null> = {
  hunt: 'HarvestLog',
  fish: 'CatchLog',
  camp: null,
  hike: null,
};

/**
 * Cross-mode routes registered ONCE on the root Stack. `navigate()` to
 * any of these resolves from every tab in every mode.
 */
export const ROOT_ROUTES = ['Settings', 'Forum', 'Gear', 'OfflineMaps', 'Weather'] as const;
