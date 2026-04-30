/**
 * MarkupDrawScreen — Tap-to-draw editor for new lines and polygons.
 *
 * Flow:
 *   1. Caller navigates here with `{ mode, shapeType, initialCenter? }`.
 *   2. User taps the map to drop vertices. Each tap appends to the
 *      working geometry; an in-place ShapeSource renders the
 *      partial-shape preview while editing.
 *   3. UNDO removes the last vertex. CLEAR resets the buffer.
 *   4. SAVE finalizes the geometry — minimum 2 points for LineString,
 *      3+ for Polygon (closePolygon defensively repeats the first
 *      vertex on save). User is then routed to MarkupEditScreen for
 *      title/notes/color.
 *
 * Design choices:
 *
 *   - Polygons ARE drawn as open rings during edit (the closing edge is
 *     rendered separately) so the user can see what they're building
 *     without the visual confusion of a wrap-around segment chasing
 *     their finger.
 *
 *   - The map itself is the only input — no separate "tap point" button.
 *     Same gesture as OnX-Hunt's draw mode and Google Earth Pro.
 *
 *   - We don't show the existing UserMarkupLayer here; the only visible
 *     geometry is what the user is currently building. Reduces visual
 *     noise when adjusting an in-progress shape.
 *
 * V2_3_FEATURE_EXPANSION_PLAN §D.2.
 */

import React, { useCallback, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import MapboxGL from '@rnmapbox/maps';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import Colors from '../theme/colors';
import { MAPBOX_ACCESS_TOKEN } from '../config';
import { useUserMarkups } from '../context/UserMarkupContext';
import {
  closePolygon,
  DEFAULT_MARKUP_COLOR,
  MarkupShapeType,
} from '../types/userMarkup';
import type { WaypointMode } from '../types/userWaypoint';

MapboxGL.setAccessToken(MAPBOX_ACCESS_TOKEN);

type MarkupDrawParams = {
  MarkupDraw: {
    mode: WaypointMode;
    shapeType: MarkupShapeType;
    initialCenter?: { lat: number; lng: number };
  };
};

const MARYLAND_CENTROID: [number, number] = [-76.6122, 39.0458];

export default function MarkupDrawScreen() {
  const route = useRoute<RouteProp<MarkupDrawParams, 'MarkupDraw'>>();
  const navigation = useNavigation<any>();
  const { mode, shapeType, initialCenter } = route.params;
  const { addMarkup } = useUserMarkups();

  const [coords, setCoords] = useState<Array<[number, number]>>([]);
  const cameraRef = useRef<MapboxGL.Camera>(null);

  const center = useMemo<[number, number]>(() => {
    if (initialCenter) return [initialCenter.lng, initialCenter.lat];
    return MARYLAND_CENTROID;
  }, [initialCenter]);

  // Mapbox MapView fires onPress with a feature whose geometry has the
  // tapped longitude/latitude as a Point. We only care about that
  // coordinate; everything else is background context.
  const onMapPress = useCallback(
    (event: { geometry?: GeoJSON.Point } | { geometry?: { coordinates?: number[] } }) => {
      const geom = (event as any)?.geometry;
      const c = geom?.coordinates;
      if (!c || c.length < 2) return;
      const lng = c[0];
      const lat = c[1];
      if (!Number.isFinite(lng) || !Number.isFinite(lat)) return;
      setCoords((prev) => [...prev, [lng, lat]]);
    },
    [],
  );

  const onUndo = useCallback(() => {
    setCoords((prev) => prev.slice(0, -1));
  }, []);

  const onClear = useCallback(() => {
    if (coords.length === 0) {
      navigation.goBack();
      return;
    }
    Alert.alert('Clear shape?', 'All vertices will be removed.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Clear', style: 'destructive', onPress: () => setCoords([]) },
    ]);
  }, [coords.length, navigation]);

  const onSave = useCallback(async () => {
    if (shapeType === 'LineString') {
      if (coords.length < 2) {
        Alert.alert('Need more points', 'A line needs at least 2 points.');
        return;
      }
      const created = await addMarkup({
        mode,
        shapeType: 'LineString',
        title: '',
        coordinates: coords,
        color: DEFAULT_MARKUP_COLOR,
      });
      navigation.replace('MarkupEdit', { mode, markupId: created.id });
      return;
    }
    if (coords.length < 3) {
      Alert.alert('Need more points', 'An area needs at least 3 points.');
      return;
    }
    const closed = closePolygon([coords]);
    const created = await addMarkup({
      mode,
      shapeType: 'Polygon',
      title: '',
      coordinates: closed,
      color: DEFAULT_MARKUP_COLOR,
    });
    navigation.replace('MarkupEdit', { mode, markupId: created.id });
  }, [coords, shapeType, mode, addMarkup, navigation]);

  // Build the in-progress preview shape. For LineString that's just the
  // tapped points. For Polygon we draw the open ring as a line plus a
  // dashed "closing edge" hint between the last vertex and the first.
  const previewShape = useMemo(() => {
    const features: GeoJSON.Feature[] = [];
    if (coords.length >= 2) {
      features.push({
        type: 'Feature',
        id: 'inProgress',
        geometry: { type: 'LineString', coordinates: coords },
        properties: { kind: 'edge' },
      });
    }
    if (shapeType === 'Polygon' && coords.length >= 3) {
      features.push({
        type: 'Feature',
        id: 'closing',
        geometry: {
          type: 'LineString',
          coordinates: [coords[coords.length - 1], coords[0]],
        },
        properties: { kind: 'closing' },
      });
    }
    return { type: 'FeatureCollection' as const, features };
  }, [coords, shapeType]);

  const vertexShape = useMemo(() => {
    return {
      type: 'FeatureCollection' as const,
      features: coords.map((c, i) => ({
        type: 'Feature' as const,
        id: `v${i}`,
        geometry: { type: 'Point' as const, coordinates: c },
        properties: { i },
      })),
    };
  }, [coords]);

  return (
    <View style={styles.screen}>
      <MapboxGL.MapView
        style={styles.map}
        styleURL={MapboxGL.StyleURL.Outdoors}
        onPress={onMapPress as any}
      >
        {/* 2026-04-26 (cross-cutting audit): defaultSettings instead of
            controlled centerCoordinate. Markup-draw needs free pan/zoom
            once the user is sketching — live prop kept snapping back. */}
        <MapboxGL.Camera
          ref={cameraRef}
          defaultSettings={{
            centerCoordinate: center,
            zoomLevel: initialCenter ? 14 : 9,
          }}
          animationMode="moveTo"
          animationDuration={400}
        />
        <MapboxGL.UserLocation visible={true} />

        {coords.length >= 2 && (
          <MapboxGL.ShapeSource id="markupPreview" shape={previewShape}>
            <MapboxGL.LineLayer
              id="markupPreviewEdges"
              filter={['==', ['get', 'kind'], 'edge']}
              style={{
                lineColor: DEFAULT_MARKUP_COLOR,
                lineWidth: 3,
                lineCap: 'round' as any,
                lineJoin: 'round' as any,
              }}
            />
            <MapboxGL.LineLayer
              id="markupPreviewClose"
              filter={['==', ['get', 'kind'], 'closing']}
              style={{
                lineColor: DEFAULT_MARKUP_COLOR,
                lineWidth: 1.8,
                lineDasharray: [2, 2],
                lineOpacity: 0.6,
              }}
            />
          </MapboxGL.ShapeSource>
        )}

        {coords.length > 0 && (
          <MapboxGL.ShapeSource id="markupVertices" shape={vertexShape}>
            <MapboxGL.CircleLayer
              id="markupVertexHalo"
              style={{
                circleRadius: 7,
                circleColor: '#ffffff',
                circleStrokeWidth: 2,
                circleStrokeColor: DEFAULT_MARKUP_COLOR,
              }}
            />
            <MapboxGL.CircleLayer
              id="markupVertexInner"
              style={{
                circleRadius: 4,
                circleColor: DEFAULT_MARKUP_COLOR,
              }}
            />
          </MapboxGL.ShapeSource>
        )}
      </MapboxGL.MapView>

      <View style={styles.headerOverlay}>
        <Text style={styles.headerText}>
          DRAW {shapeType === 'Polygon' ? 'AREA' : 'LINE'} · {mode.toUpperCase()}
        </Text>
        <Text style={styles.subText}>
          {coords.length === 0
            ? 'Tap the map to place vertices'
            : shapeType === 'Polygon'
              ? `${coords.length} vertices · ≥ 3 to save`
              : `${coords.length} points · ≥ 2 to save`}
        </Text>
      </View>

      <View style={styles.toolbar}>
        <Pressable onPress={onClear} style={styles.toolBtn}>
          <Text style={styles.toolBtnText}>{coords.length === 0 ? 'CANCEL' : 'CLEAR'}</Text>
        </Pressable>
        <Pressable
          onPress={onUndo}
          disabled={coords.length === 0}
          style={[styles.toolBtn, coords.length === 0 ? styles.toolBtnDisabled : null]}
        >
          <Text style={styles.toolBtnText}>UNDO</Text>
        </Pressable>
        <Pressable
          onPress={onSave}
          disabled={
            (shapeType === 'LineString' && coords.length < 2) ||
            (shapeType === 'Polygon' && coords.length < 3)
          }
          style={[
            styles.saveBtn,
            (shapeType === 'LineString' && coords.length < 2) ||
            (shapeType === 'Polygon' && coords.length < 3)
              ? styles.saveBtnDisabled
              : null,
          ]}
        >
          <Text style={styles.saveBtnText}>SAVE</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.background },
  map: { flex: 1 },
  headerOverlay: {
    position: 'absolute',
    top: 12,
    left: 12,
    right: 12,
    backgroundColor: 'rgba(15, 23, 42, 0.85)',
    borderRadius: 8,
    padding: 12,
  },
  headerText: {
    color: Colors.mdGold,
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1.2,
  },
  subText: {
    color: Colors.textPrimary,
    fontSize: 12,
    marginTop: 4,
  },
  toolbar: {
    position: 'absolute',
    bottom: 24,
    left: 12,
    right: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 10,
  },
  toolBtn: {
    backgroundColor: 'rgba(15, 23, 42, 0.9)',
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 8,
    flex: 1,
    alignItems: 'center',
    marginRight: 8,
  },
  toolBtnDisabled: { opacity: 0.4 },
  toolBtnText: {
    color: Colors.textPrimary,
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  saveBtn: {
    backgroundColor: Colors.mdGold,
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 8,
    flex: 1,
    alignItems: 'center',
  },
  saveBtnDisabled: { opacity: 0.4 },
  saveBtnText: {
    color: Colors.mdBlack,
    fontSize: 13,
    fontWeight: '900',
    letterSpacing: 1,
  },
});
