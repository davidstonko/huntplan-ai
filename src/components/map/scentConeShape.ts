/**
 * scentConeShape — pure shape-builder for the Hunt-map scent cone layer.
 *
 * Lives outside the .tsx component so it can be imported by jest
 * without pulling in `@rnmapbox/maps` (the native module blows up under
 * the jest runner).
 */

import { buildScentCone } from '../../services/scentConeGeometry';
import type { WindReading } from '../../services/windService';

export interface ScentConeWaypointInput {
  id: string;
  lat: number;
  lng: number;
}

export function buildScentConeShape(
  waypoints: ScentConeWaypointInput[],
  wind: WindReading | null,
): GeoJSON.FeatureCollection {
  const features: GeoJSON.Feature[] = [];
  if (!wind) return { type: 'FeatureCollection', features };
  for (const wp of waypoints) {
    const cone = buildScentCone({
      originLat: wp.lat,
      originLng: wp.lng,
      windFromDirectionDeg: wind.directionDeg,
      windSpeedMph: wind.speedMph,
    });
    if (!cone) continue;
    features.push({
      type: 'Feature',
      geometry: cone.polygon,
      properties: {
        waypointId: wp.id,
        lengthMeters: cone.lengthMeters,
        downwindHeadingDeg: cone.downwindHeadingDeg,
      },
    });
  }
  return { type: 'FeatureCollection', features };
}
