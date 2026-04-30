/**
 * ScentConeLayer — Renders NOAA-forecast scent cones from tree-stand
 * waypoints onto the Hunt map.
 *
 * V2_3_FEATURE_EXPANSION_PLAN §B.2.c/d. Given a list of tree-stand
 * waypoints and a single wind reading (fetched upstream by the Hunt
 * MapScreen using `windService.getWindAt`), this component builds a
 * GeoJSON FeatureCollection of cone polygons using the pure geometry
 * module in `services/scentConeGeometry` and paints them as a translucent
 * orange overlay so hunters can eyeball scent spread downwind from each
 * stand at the selected forecast hour.
 *
 * Design notes:
 *
 *   - **Only tree-stand waypoints get cones.** Other hunt categories
 *     (camera, kill site, trail cam) aren't places the hunter sits, so
 *     the cone would be misleading. The caller passes only relevant
 *     waypoints; this component just renders.
 *
 *   - **One wind reading per map view**, not per waypoint. Maryland is
 *     small enough that the NWS 2.5 km grid is effectively uniform at
 *     statewide zoom; sampling one reading keeps the overlay honest
 *     without fanning out 100+ network calls.
 *
 *   - **Calm = no polygon.** Below 3 mph the cone is suppressed (see
 *     `buildScentCone` return-null path). Caller is expected to show a
 *     "calm" chip in the legend in that case.
 *
 *   - **`null` render when no features.** Mirrors UserWaypointLayer's
 *     pattern so we don't register empty native sources.
 *
 * The companion time slider + wind chip live in `HuntTimeWindChip` on
 * Hunt MapScreen — this module is only the Mapbox render.
 *
 * @module Components/Map
 */

import React, { useMemo } from 'react';
import MapboxGL from '@rnmapbox/maps';
import type { WindReading } from '../../services/windService';
import {
  buildScentConeShape,
  type ScentConeWaypointInput,
} from './scentConeShape';

export type { ScentConeWaypointInput } from './scentConeShape';

interface ScentConeLayerProps {
  /** Waypoints to render cones for (typically filtered to tree-stand). */
  waypoints: ScentConeWaypointInput[];
  /** Wind reading at the selected forecast time. Null = no cones. */
  wind: WindReading | null;
}

export default function ScentConeLayer({
  waypoints,
  wind,
}: ScentConeLayerProps) {
  const shape = useMemo(
    () => buildScentConeShape(waypoints, wind),
    [waypoints, wind],
  );

  if (shape.features.length === 0) return null;

  return (
    <MapboxGL.ShapeSource id="scentCones" shape={shape}>
      <MapboxGL.FillLayer
        id="scentConesFill"
        style={{
          fillColor: '#f59e0b', // amber-500
          fillOpacity: 0.22,
        }}
      />
      <MapboxGL.LineLayer
        id="scentConesOutline"
        style={{
          lineColor: '#d97706', // amber-600
          lineWidth: 1.5,
          lineOpacity: 0.9,
        }}
      />
    </MapboxGL.ShapeSource>
  );
}

// Shape-builder re-exported from `scentConeShape.ts` so jest tests can
// import it without pulling in the Mapbox native module. See that file.
export { buildScentConeShape } from './scentConeShape';
