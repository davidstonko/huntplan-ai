/**
 * AnnotationLayer — Renders hunt plan annotations (waypoints, routes, areas)
 * on the Mapbox map as GeoJSON layers. Used by ScoutScreen and DeerCamp map views.
 *
 * Waypoints: colored circles with icon glyphs (replaces emoji system)
 * Routes: colored polylines (solid/dashed)
 * Areas: semi-transparent colored fill polygons with border
 */

import React, { useMemo } from 'react';
import MapboxGL from '@rnmapbox/maps';
import { HuntPlan } from '../../types/scout';
import { getWaypointEntry, getWaypointColor } from '../../types/huntWaypoints';
import { getIconGlyph } from '../icons/WaypointIcons';
import { evaluateWindMatch } from '../../services/weatherService';
import Colors from '../../theme/colors';

interface AnnotationLayerProps {
  /** Plans to render — only visible ones should be passed */
  plans: HuntPlan[];
  /** Unique prefix for Mapbox source/layer IDs to avoid collisions */
  idPrefix?: string;
  /** Current wind direction string — used to compute wind match for stands */
  currentWindDirection?: string | null;
}

// Wind match → Mapbox circle color
const WIND_MATCH_COLORS: Record<string, string> = {
  ideal: Colors.success,     // success green
  acceptable: Colors.warning, // amber
  poor: Colors.danger,        // danger red
};

export default function AnnotationLayer({ plans, idPrefix = 'scout', currentWindDirection }: AnnotationLayerProps) {
  // ── Waypoint GeoJSON ──
  const waypointGeoJSON = useMemo(() => {
    const features: any[] = [];
    plans.forEach((plan) => {
      // Parking point
      if (plan.parkingPoint) {
        const parkingEntry = getWaypointEntry('parking');
        const parkingGlyph = getIconGlyph(parkingEntry.iconKey);
        const parkingColor = getWaypointColor('parking');

        features.push({
          type: 'Feature' as const,
          id: `${plan.id}_parking`,
          properties: {
            label: parkingGlyph,
            color: plan.parkingPoint.colorOverride || parkingColor,
            colorSecondary: parkingEntry.colorSecondary,
            planName: plan.name,
            waypointType: 'parking',
            hasPhoto: plan.parkingPoint.photoUri ? 1 : 0,
            sharedToCamp: plan.parkingPoint.sharedToCamp ? 1 : 0,
          },
          geometry: {
            type: 'Point' as const,
            coordinates: [plan.parkingPoint.lng, plan.parkingPoint.lat],
          },
        } as any);
      }
      // Waypoints
      plan.waypoints.forEach((wp) => {
        const entry = getWaypointEntry(wp.icon);
        const glyph = getIconGlyph(entry.iconKey);
        const typeColor = getWaypointColor(wp.icon);
        const primaryColor = wp.colorOverride || typeColor || plan.color;

        // Compute wind match for stands/blinds with ideal wind data
        let windMatch: string | null = null;
        if (
          currentWindDirection &&
          entry.hasStandDetails &&
          wp.standDetails?.idealWindDirections?.length
        ) {
          windMatch = evaluateWindMatch(currentWindDirection, wp.standDetails.idealWindDirections) ?? null;
        }

        features.push({
          type: 'Feature' as const,
          id: `${plan.id}_wp_${wp.id}`,
          properties: {
            label: glyph,
            color: primaryColor,
            colorSecondary: entry.colorSecondary,
            planName: plan.name,
            waypointType: wp.icon,
            hasPhoto: wp.photoUri ? 1 : 0,
            sharedToCamp: wp.sharedToCamp ? 1 : 0,
            isStand: entry.hasStandDetails ? 1 : 0,
            windMatch: windMatch || '',
            windMatchColor: windMatch ? (WIND_MATCH_COLORS[windMatch] || '') : '',
          },
          geometry: {
            type: 'Point' as const,
            coordinates: [wp.lng, wp.lat],
          },
        } as any);
      });
    });
    return { type: 'FeatureCollection' as const, features } as any;
  }, [plans, currentWindDirection]);

  // ── Wind match ring layer — separate GeoJSON for stands with wind data ──
  const windMatchGeoJSON = useMemo(() => {
    if (!currentWindDirection) return null;
    const features: any[] = [];
    plans.forEach((plan) => {
      plan.waypoints.forEach((wp) => {
        const entry = getWaypointEntry(wp.icon);
        if (
          entry.hasStandDetails &&
          wp.standDetails?.idealWindDirections?.length
        ) {
          const match = evaluateWindMatch(currentWindDirection, wp.standDetails.idealWindDirections);
          if (match) {
            features.push({
              type: 'Feature' as const,
              id: `${plan.id}_wind_${wp.id}`,
              properties: {
                matchColor: WIND_MATCH_COLORS[match] || Colors.textMuted,
              },
              geometry: {
                type: 'Point' as const,
                coordinates: [wp.lng, wp.lat],
              },
            } as any);
          }
        }
      });
    });
    if (features.length === 0) return null;
    return { type: 'FeatureCollection' as const, features } as any;
  }, [plans, currentWindDirection]);

  // ── Route GeoJSON ──
  const routeGeoJSON = useMemo(() => {
    const features: any[] = [];
    plans.forEach((plan) => {
      plan.routes.forEach((route) => {
        if (route.points.length >= 2) {
          features.push({
            type: 'Feature',
            id: `${plan.id}_rt_${route.id}`,
            properties: {
              color: plan.color,
              label: route.label || 'Route',
              style: route.style,
              distance: route.distanceMeters,
            },
            geometry: {
              type: 'LineString',
              coordinates: route.points,
            },
          });
        }
      });
    });
    return { type: 'FeatureCollection' as const, features } as any;
  }, [plans]);

  // ── Area GeoJSON ──
  const areaGeoJSON = useMemo(() => {
    const features: any[] = [];
    plans.forEach((plan) => {
      plan.areas.forEach((area) => {
        if (area.polygon.length >= 3) {
          // Close the polygon ring if needed
          const ring = [...area.polygon];
          const first = ring[0];
          const last = ring[ring.length - 1];
          if (first[0] !== last[0] || first[1] !== last[1]) {
            ring.push(first);
          }
          features.push({
            type: 'Feature',
            id: `${plan.id}_area_${area.id}`,
            properties: {
              color: plan.color,
              label: area.label || 'Area',
              acres: area.areaAcres,
            },
            geometry: {
              type: 'Polygon',
              coordinates: [ring],
            },
          });
        }
      });
    });
    return { type: 'FeatureCollection' as const, features } as any;
  }, [plans]);

  return (
    <>
      {/* ── Area fill polygons ── */}
      {areaGeoJSON.features.length > 0 && (
        <MapboxGL.ShapeSource id={`${idPrefix}Areas`} shape={areaGeoJSON}>
          <MapboxGL.FillLayer
            id={`${idPrefix}AreaFill`}
            style={{
              fillColor: ['get', 'color'],
              fillOpacity: 0.2,
            }}
          />
          <MapboxGL.LineLayer
            id={`${idPrefix}AreaBorder`}
            style={{
              lineColor: ['get', 'color'],
              lineWidth: 2,
              lineDasharray: [2, 2],
            }}
          />
          <MapboxGL.SymbolLayer
            id={`${idPrefix}AreaLabels`}
            style={{
              textField: ['get', 'label'],
              textSize: 11,
              textColor: ['get', 'color'],
              textHaloColor: '#000000',
              textHaloWidth: 1,
              textFont: ['DIN Pro Medium', 'Arial Unicode MS Regular'],
            }}
          />
        </MapboxGL.ShapeSource>
      )}

      {/* ── Route polylines ── */}
      {routeGeoJSON.features.length > 0 && (
        <MapboxGL.ShapeSource id={`${idPrefix}Routes`} shape={routeGeoJSON}>
          <MapboxGL.LineLayer
            id={`${idPrefix}RouteLine`}
            style={{
              lineColor: ['get', 'color'],
              lineWidth: 3,
              lineOpacity: 0.85,
              lineCap: 'round',
              lineJoin: 'round',
            }}
          />
          <MapboxGL.SymbolLayer
            id={`${idPrefix}RouteLabels`}
            style={{
              textField: ['get', 'label'],
              textSize: 10,
              textColor: ['get', 'color'],
              textHaloColor: '#000000',
              textHaloWidth: 1,
              symbolPlacement: 'line-center',
              textFont: ['DIN Pro Medium', 'Arial Unicode MS Regular'],
            }}
          />
        </MapboxGL.ShapeSource>
      )}

      {/* ── Wind match rings (behind waypoints) ── */}
      {windMatchGeoJSON && (
        <MapboxGL.ShapeSource id={`${idPrefix}WindMatch`} shape={windMatchGeoJSON}>
          <MapboxGL.CircleLayer
            id={`${idPrefix}WindMatchRing`}
            style={{
              circleRadius: 20,
              circleColor: 'transparent',
              circleStrokeWidth: 3,
              circleStrokeColor: ['get', 'matchColor'],
              circleStrokeOpacity: 0.9,
            }}
          />
        </MapboxGL.ShapeSource>
      )}

      {/* ── Waypoint markers ── */}
      {waypointGeoJSON.features.length > 0 && (
        <MapboxGL.ShapeSource id={`${idPrefix}Waypoints`} shape={waypointGeoJSON}>
          {/* Outer white circle */}
          <MapboxGL.CircleLayer
            id={`${idPrefix}WaypointOuterCircle`}
            style={{
              circleRadius: 14,
              circleColor: Colors.mdWhite,
              circleStrokeWidth: 3,
              circleStrokeColor: ['get', 'color'],
              circleOpacity: 1,
            }}
          />
          {/* Inner circle — uses secondary color from waypoint type registry */}
          <MapboxGL.CircleLayer
            id={`${idPrefix}WaypointInnerCircle`}
            style={{
              circleRadius: 7,
              circleColor: ['get', 'colorSecondary'],
              circleOpacity: 1,
            }}
          />
          {/* Icon glyph label */}
          <MapboxGL.SymbolLayer
            id={`${idPrefix}WaypointLabels`}
            style={{
              textField: ['get', 'label'],
              textSize: 10,
              textColor: Colors.mdWhite,
              textHaloColor: Colors.mdBlack,
              textHaloWidth: 1,
              textOffset: [0, 2],
              textMaxWidth: 8,
              textFont: ['DIN Pro Medium', 'Arial Unicode MS Regular'],
            }}
          />
          {/* Photo indicator — small amber dot for waypoints with photos */}
          <MapboxGL.CircleLayer
            id={`${idPrefix}PhotoIndicator`}
            filter={['==', ['get', 'hasPhoto'], 1]}
            style={{
              circleRadius: 4,
              circleColor: Colors.amber,
              circleOpacity: 0.95,
              circleTranslate: [10, -10], // offset to top-right of main marker
            }}
          />
        </MapboxGL.ShapeSource>
      )}
    </>
  );
}
