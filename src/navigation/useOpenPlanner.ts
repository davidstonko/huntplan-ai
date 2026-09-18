/**
 * @file useOpenPlanner.ts
 * @description Open the Camp or Hike trip planner from ANY tab in ANY mode.
 *
 * The planners live under each mode's Plan tab (Camp: the Plan root;
 * Hike: pushed over the trail browser). Callers such as the Daily
 * Briefing cards and Upcoming Trips list are cross-mode — a Hunt-mode
 * user can tap a saved Camp trip — so this hook switches the active
 * mode first (the way the header ActivityModePicker does) and then
 * addresses the nested route explicitly.
 */

import { useCallback } from 'react';
import { useNavigation } from '@react-navigation/native';
import { useActivityMode } from '../context/ActivityModeContext';
import { MODE_TABS_ROUTE, PLANNER_SCREEN, TAB } from './routes';

export type PlannerKind = keyof typeof PLANNER_SCREEN;

export function useOpenPlanner() {
  const navigation = useNavigation<any>();
  const { activeMode, setActiveMode } = useActivityMode();

  return useCallback(
    (kind: PlannerKind, params?: Record<string, unknown>) => {
      const nested = { screen: PLANNER_SCREEN[kind], params };
      if (activeMode === kind) {
        // Same mode — stay inside the current Tab.Navigator.
        navigation.navigate(TAB.PLAN, nested);
        return;
      }
      setActiveMode(kind);
      navigation.navigate(MODE_TABS_ROUTE[kind], {
        screen: TAB.PLAN,
        params: nested,
      });
    },
    [activeMode, navigation, setActiveMode],
  );
}
