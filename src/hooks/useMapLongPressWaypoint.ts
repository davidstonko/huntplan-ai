/**
 * useMapLongPressWaypoint — Map long-press → "Drop waypoint here?" flow.
 *
 * Returns an `onLongPress` callback suitable for wiring into
 * `<MapboxGL.MapView onLongPress={...}>`. On long-press it:
 *
 *   1. Extracts [lng, lat] from the GeoJSON.Feature the Mapbox bridge
 *      gives us. Defensive about missing/invalid coordinates — we just
 *      no-op rather than navigate to an editor with NaN.
 *   2. Pops an Alert confirming the location. Showing coordinates in the
 *      prompt gives the user a visible sanity check — if they meant to
 *      drop a pin on Prettyboy Reservoir and see 0,0, they can cancel.
 *   3. On confirm, navigates to WaypointEdit with
 *      { mode, initialLat, initialLng } so the edit screen seeds the
 *      coordinates in create mode.
 *
 * This hook is agnostic of the navigation container shape — the caller
 * passes in a `navigate` function (typically obtained via
 * `useNavigation()` on their screen). Keeping it decoupled means the
 * hook composes cleanly whether the caller is inside a per-mode tab
 * stack (MapScreen under HuntTabs) or a nested modal stack.
 *
 * Added 2026-04-24 per V2_3_FEATURE_EXPANSION_PLAN §3 / Phase A.1b.
 */

import { useCallback } from 'react';
import { Alert } from 'react-native';
import type { WaypointMode } from '../types/userWaypoint';

interface Options {
  /** Which mode's map this hook is attached to. Propagated into the edit screen. */
  mode: WaypointMode;
  /**
   * Navigation helper. Kept as a generic callable so each MapScreen can
   * pass in `navigation.navigate` (or a memoized wrapper) without this
   * hook needing to import a specific StackNavigationProp<…>.
   */
  navigate: (
    screen: 'WaypointEdit',
    params: { mode: WaypointMode; initialLat: number; initialLng: number },
  ) => void;
  /**
   * Optional hook — called before the Alert. Primarily for tests to
   * verify long-press routing without mocking Alert. Real callers
   * generally don't need it.
   */
  onBeforeConfirm?: (lat: number, lng: number) => void;
}

/**
 * Pure (non-React) handler factory — extracted so it can be unit-tested
 * without a React renderer (the project ships neither
 * `@testing-library/react-native` nor `react-test-renderer`, mirroring
 * the approach used in `UserWaypointContext.test.tsx`).
 *
 * The hook below is a thin `useCallback` wrapper around this helper.
 */
export function createLongPressWaypointHandler({
  mode,
  navigate,
  onBeforeConfirm,
}: Options) {
  return (feature: GeoJSON.Feature | undefined | null) => {
    const coords = (feature?.geometry as GeoJSON.Point | undefined)
      ?.coordinates;
    if (
      !coords ||
      coords.length < 2 ||
      !Number.isFinite(coords[0]) ||
      !Number.isFinite(coords[1])
    ) {
      return;
    }
    const lng = coords[0] as number;
    const lat = coords[1] as number;
    onBeforeConfirm?.(lat, lng);
    Alert.alert(
      'Drop waypoint here?',
      `Latitude: ${lat.toFixed(6)}\nLongitude: ${lng.toFixed(6)}`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Add waypoint',
          onPress: () => {
            navigate('WaypointEdit', {
              mode,
              initialLat: lat,
              initialLng: lng,
            });
          },
        },
      ],
    );
  };
}

export function useMapLongPressWaypoint(opts: Options) {
  const { mode, navigate, onBeforeConfirm } = opts;
  return useCallback(
    createLongPressWaypointHandler({ mode, navigate, onBeforeConfirm }),
    [mode, navigate, onBeforeConfirm],
  );
}
