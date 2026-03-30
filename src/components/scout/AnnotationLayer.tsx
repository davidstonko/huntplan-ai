/**
 * AnnotationLayer — Renders hunt plan annotations (waypoints, routes, areas)
 * on the Mapbox map as GeoJSON layers. Used by ScoutScreen and DeerCamp map views.
 *
 * Waypoints: colored circles with emoji labels
 * Routes: colored polylines (solid/dashed)
 * Areas: semi-transparent colored fill polygons with border
 */

import React, { useMemo } from 'react';
import MapboxGL from '@rnmapbox/maps';
import { HuntPlan, WAYPOINT_ICONS } from '../../types/scout';

interface AnnotationLayerProps {
  /** Plans to render — only visible ones should be passed */
  plans: HuntPlan[];
  /** Unique prefix for Mapbox source/layer IDs to avoid collisions */
  idPrefix?: string;
}

export default function AnnotationLayer({ plans, idPrefix = 'scout' }: AnnotationLayerProps) {
  // ── Waypoint GeoJSON ──
  const waypointGeoJSON = useMemo(() => {
    const features: any[] = [];
    plans.forEach((plan) => {
      // Parking point
      if (plan.parkingPoint) {
        features.push({
          type: 'Feature',
          id: `${plan.id}_parking`,
          properties: {
            label: WAYPOINT_ICONS.parking,
            color: plan.color,
            planName: plan.name,
          },
          geometry: {
            type: 'Point',
            coordinates: [plan.parkingPoint.lng, plan.parkingPoint.lat],
          },
        });
      }
      // Waypoints
      plan.waypoints.forEach((wp) => {
        features.push({
          type: 'Feature',
          id: `${plan.id}_wp_${wp.id}`,
          properties: {
            label: wp.label || WAYPOINT_ICONS[wp.icon],
            emoji: WAYPOINT_ICONS[wp.icon],
            color: plan.color,
            planName: plan.name,
          },
          geometry: {
            type: 'Point',
            coordinates: [wp.lng, wp.lat],
          },
        });
      });
    });
    return { type: 'FeatureCollection' as const, features } as any;
  }, [plans]);

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

      {/* ── Waypoint markers ── */}
      {waypointGeoJSON.features.length > 0 && (
        <MapboxGL.ShapeSource id={`${idPrefix}Waypoints`} shape={waypointGeoJSON}>
          <MapboxGL.CircleLayer
            id={`${idPrefix}WaypointOuterCircle`}
            style={{
              circleRadius: 14,
              circleColor: '#ffffff',
              circleStrokeWidth: 3,
              circleStrokeColor: ['get', 'color'],
              circleOpacity: 1,
            }}
          />
          <MapboxGL.CircleLayer
            id={`${idPrefix}WaypointInnerCircle`}
            style={{
              circleRadius: 7,
              circleColor: ['get', 'color'],
              circleOpacity: 1,
            }}
          />
          <MapboxGL.SymbolLayer
            id={`${idPrefix}WaypointLabels`}
            style={{
              textField: ['get', 'label'],
              textSize: 10,
              textColor: '#ffffff',
              textHaloColor: '#000000',
              textHaloWidth: 1,
              textOffset: [0, 2],
              textMaxWidth: 8,
              textFont: ['DIN Pro Medium', 'Arial Unicode MS Regular'],
            }}
          />
        </MapboxGL.ShapeSource>
      )}
    </>
  );
}
