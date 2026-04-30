/**
 * UserWaypointLayer — Renders personal waypoints of a given mode as a
 * ShapeSource + CircleLayer + SymbolLayer stack.
 *
 * Rendered on all four mode MapScreens (Hunt / Fish / Camp / Hike). The
 * caller passes the current `mode` so the layer pulls only that mode's
 * waypoints from UserWaypointContext — hunt pins do not leak onto the
 * fish map and vice versa. Tap opens WaypointEditScreen for that
 * waypoint via the caller-supplied `onWaypointPress`, keeping navigator
 * wiring out of this leaf component.
 *
 * Rendering contract:
 *   - Outer white halo circle (radius 11) so the pin is visible over the
 *     dark Mapbox dark-v11 style.
 *   - Inner color-filled circle (radius 8) using `resolveWaypointColor`.
 *   - Centered white letter code (`resolveWaypointLetterCode`, 1–3
 *     chars) so users can tell a tree stand from a trail cam at a glance
 *     without a legend.
 *
 * Deliberately NOT rendered:
 *   - A title label hovering under the pin. That would swamp the map at
 *     statewide zoom and collide with land labels. Users tap to reveal
 *     the title in the edit screen.
 *
 * Kept in sync with Scout's AnnotationLayer and the land point stack in
 * MapScreen (white halo + color + letter) so the three pin families
 * share a visual language.
 *
 * Added 2026-04-24 per V2_3_FEATURE_EXPANSION_PLAN §3 / Phase A.1b.
 *
 * @module Components/Map
 */

import React, { useMemo, useCallback } from 'react';
import MapboxGL from '@rnmapbox/maps';
import { useUserWaypoints } from '../../context/UserWaypointContext';
import {
  WaypointMode,
  resolveWaypointColor,
  resolveWaypointLetterCode,
} from '../../types/userWaypoint';

interface UserWaypointLayerProps {
  /** Which mode's waypoints to render. */
  mode: WaypointMode;
  /**
   * Called when a pin is tapped. Caller is responsible for navigating
   * to the edit screen or otherwise handling the selection.
   */
  onWaypointPress?: (waypointId: string) => void;
}

/**
 * Build a GeoJSON FeatureCollection with one point per mode-filtered
 * waypoint. Each feature carries `id`, `color`, and `letterCode` as
 * properties so the Mapbox data-driven expressions can render each pin
 * without a re-pass through React.
 */
function buildShape(
  waypoints: ReturnType<ReturnType<typeof useUserWaypoints>['waypointsForMode']>,
) {
  return {
    type: 'FeatureCollection' as const,
    features: waypoints.map((wp) => ({
      type: 'Feature' as const,
      id: wp.id,
      geometry: {
        type: 'Point' as const,
        coordinates: [wp.lng, wp.lat] as [number, number],
      },
      properties: {
        id: wp.id,
        color: resolveWaypointColor(wp),
        letterCode: resolveWaypointLetterCode(wp),
      },
    })),
  };
}

export default function UserWaypointLayer({
  mode,
  onWaypointPress,
}: UserWaypointLayerProps) {
  const { waypointsForMode, hydrated } = useUserWaypoints();

  const shape = useMemo(() => {
    if (!hydrated) return { type: 'FeatureCollection' as const, features: [] };
    return buildShape(waypointsForMode(mode));
  }, [hydrated, waypointsForMode, mode]);

  const handlePress = useCallback(
    (event: { features?: Array<{ properties?: { id?: string } }> }) => {
      const id = event?.features?.[0]?.properties?.id;
      if (id && onWaypointPress) onWaypointPress(id);
    },
    [onWaypointPress],
  );

  // When there are no waypoints, render nothing so we don't create an
  // empty layer id on the native side for the sake of empty. Prevents
  // stacks of zero-feature sources across 4 MapScreens × lifecycle.
  if (shape.features.length === 0) return null;

  return (
    <MapboxGL.ShapeSource
      id={`userWaypoints_${mode}`}
      shape={shape}
      onPress={handlePress as any}
    >
      <MapboxGL.CircleLayer
        id={`userWaypointCirclesOuter_${mode}`}
        style={{
          circleRadius: 11,
          circleColor: '#ffffff',
          circleStrokeWidth: 2.5,
          circleStrokeColor: ['get', 'color'],
          circleOpacity: 1,
        }}
      />
      <MapboxGL.CircleLayer
        id={`userWaypointCirclesInner_${mode}`}
        style={{
          circleRadius: 8,
          circleColor: ['get', 'color'],
          circleOpacity: 1,
        }}
      />
      <MapboxGL.SymbolLayer
        id={`userWaypointLabels_${mode}`}
        style={{
          textField: ['get', 'letterCode'],
          textSize: 9,
          textColor: '#ffffff',
          textHaloColor: ['get', 'color'],
          textHaloWidth: 0.8,
          textFont: ['DIN Pro Bold', 'Arial Unicode MS Bold'],
          textAllowOverlap: true,
          textIgnorePlacement: true,
        }}
      />
    </MapboxGL.ShapeSource>
  );
}
