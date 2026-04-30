/**
 * UserMarkupLayer — Renders user LineString and Polygon markups for a
 * given mode as Mapbox ShapeSource + LineLayer / FillLayer + SymbolLayer
 * stacks.
 *
 * Rendered alongside UserWaypointLayer on every mode MapScreen. The
 * caller passes the `mode`, the layer pulls only the matching rows from
 * UserMarkupContext so Hunt shoot-lanes don't leak onto the Fish map.
 *
 * Tap routing is routed through `onMarkupPress(id)` so this leaf
 * component stays navigator-free; callers wire it to a list/edit screen.
 *
 * Styling contract:
 *   - Lines: 3px stroke at the markup's color, with a 5px white halo
 *     line below for legibility on dark Mapbox style.
 *   - Polygons: 22% fill at the markup's color, 1.5px stroke at the
 *     markup's color.
 *   - Labels: white text with a colored halo, rendered only above zoom 11
 *     so the world view isn't a wall of names.
 *
 * Added 2026-04-24 per V2_3_FEATURE_EXPANSION_PLAN §D.2.
 */

import React, { useMemo, useCallback } from 'react';
import MapboxGL from '@rnmapbox/maps';
import { useUserMarkups } from '../../context/UserMarkupContext';
import type { WaypointMode } from '../../types/userWaypoint';
import { buildUserMarkupShapes } from './userMarkupShape';

export { buildUserMarkupShapes };

interface UserMarkupLayerProps {
  mode: WaypointMode;
  onMarkupPress?: (markupId: string) => void;
}

const EMPTY_FC: GeoJSON.FeatureCollection = {
  type: 'FeatureCollection',
  features: [],
};

export default function UserMarkupLayer({
  mode,
  onMarkupPress,
}: UserMarkupLayerProps) {
  const { markupsForMode, hydrated } = useUserMarkups();

  const shapes = useMemo(() => {
    if (!hydrated) {
      return {
        lines: EMPTY_FC as GeoJSON.FeatureCollection<GeoJSON.LineString>,
        polygons: EMPTY_FC as GeoJSON.FeatureCollection<GeoJSON.Polygon>,
        labels: EMPTY_FC as GeoJSON.FeatureCollection<GeoJSON.Point>,
      };
    }
    return buildUserMarkupShapes(markupsForMode(mode));
  }, [hydrated, markupsForMode, mode]);

  const handleLinePress = useCallback(
    (event: { features?: Array<{ properties?: { id?: string } }> }) => {
      const id = event?.features?.[0]?.properties?.id;
      if (id && onMarkupPress) onMarkupPress(id);
    },
    [onMarkupPress],
  );

  const handlePolyPress = handleLinePress;

  const hasLines = shapes.lines.features.length > 0;
  const hasPolygons = shapes.polygons.features.length > 0;
  const hasLabels = shapes.labels.features.length > 0;

  if (!hasLines && !hasPolygons) return null;

  return (
    <>
      {hasPolygons ? (
        <MapboxGL.ShapeSource
          id={`userMarkupPolys_${mode}`}
          shape={shapes.polygons}
          onPress={handlePolyPress as any}
        >
          <MapboxGL.FillLayer
            id={`userMarkupPolyFill_${mode}`}
            style={{
              fillColor: ['get', 'color'],
              fillOpacity: 0.22,
            }}
          />
          <MapboxGL.LineLayer
            id={`userMarkupPolyOutline_${mode}`}
            style={{
              lineColor: ['get', 'color'],
              lineWidth: 1.5,
            }}
          />
        </MapboxGL.ShapeSource>
      ) : null}
      {hasLines ? (
        <MapboxGL.ShapeSource
          id={`userMarkupLines_${mode}`}
          shape={shapes.lines}
          onPress={handleLinePress as any}
        >
          <MapboxGL.LineLayer
            id={`userMarkupLineHalo_${mode}`}
            style={{
              lineColor: '#ffffff',
              lineWidth: 5,
              lineOpacity: 0.65,
              lineCap: 'round' as any,
              lineJoin: 'round' as any,
            }}
          />
          <MapboxGL.LineLayer
            id={`userMarkupLineStroke_${mode}`}
            style={{
              lineColor: ['get', 'color'],
              lineWidth: 3,
              lineCap: 'round' as any,
              lineJoin: 'round' as any,
            }}
          />
        </MapboxGL.ShapeSource>
      ) : null}
      {hasLabels ? (
        <MapboxGL.ShapeSource
          id={`userMarkupLabels_${mode}`}
          shape={shapes.labels}
        >
          <MapboxGL.SymbolLayer
            id={`userMarkupLabelText_${mode}`}
            minZoomLevel={11}
            style={{
              textField: ['get', 'title'],
              textSize: 11,
              textColor: '#ffffff',
              textHaloColor: ['get', 'color'],
              textHaloWidth: 1.2,
              textFont: ['DIN Pro Medium', 'Arial Unicode MS Regular'],
              textOffset: [0, 0.8],
              textAllowOverlap: false,
              textIgnorePlacement: false,
            }}
          />
        </MapboxGL.ShapeSource>
      ) : null}
    </>
  );
}
