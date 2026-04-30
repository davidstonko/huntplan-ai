/**
 * @file CampAreaPicker.tsx
 * @description Full-screen modal for drawing a deer camp's rectangular map area.
 *
 * UX contract (per user directive 2026-04-20):
 *   - User drags a red rectangle on screen that they can resize (8 handles)
 *     and can zoom/pan the underlying map freely before/while drawing.
 *   - During this step NO other boxes or chrome overlap the map surface.
 *     Only the top bar (Cancel · title · Confirm) and a bottom area-readout
 *     pill are shown — no legends, tab bars, banners, or overlays.
 *   - Max area 5 sq mi. Users can change the RECTANGLE'S SHAPE — skinny/tall
 *     is allowed — but total area is hard-capped. Confirm disabled if over.
 *
 * Implementation approach:
 *   The rectangle lives in *screen* coordinates. The map pans/zooms
 *   independently underneath. When the user presses Confirm we translate
 *   the rectangle's four corners back to geographic coordinates using the
 *   Mapbox MapView's `pointInView→coordinate` projection. This gives the
 *   fastest, most-responsive drag UX — no async round-trips per frame.
 *
 * Storage: on Confirm the caller receives a `CampArea` (lat/lng bounds +
 * cached sq-mi area). We do NOT mutate state here; parent decides whether
 * to call createCamp.
 *
 * @module Components/DeerCamp
 */

import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  PanResponder,
  // Modal import dropped 2026-04-26 — picker is now an absolute overlay,
  // no UIKit modal involvement. See note above the return statement.
  Dimensions,
  StatusBar,
  Platform,
  Alert,
} from 'react-native';
import MapboxGL from '@rnmapbox/maps';
import Colors from '../../theme/colors';
import { MAPBOX_ACCESS_TOKEN } from '../../config';
import ZoomIcon from '../map/ZoomIcon';
import { CampArea, DEER_CAMP_MAX_AREA_SQ_MI } from '../../types/deercamp';

MapboxGL.setAccessToken(MAPBOX_ACCESS_TOKEN);

/**
 * Degrees → miles conversion at a given latitude.
 * 1° latitude  ≈ 69.0 miles (nearly constant)
 * 1° longitude ≈ 69.172 × cos(lat) miles
 */
const MILES_PER_DEG_LAT = 69.0;
function milesPerDegLng(latDeg: number): number {
  return 69.172 * Math.cos((latDeg * Math.PI) / 180);
}

/**
 * Compute the area (sq mi) of a CampArea-like bounds record.
 * Latitude and longitude spans use a mid-latitude cos correction for lng.
 */
export function computeAreaSqMi(
  bounds: { north: number; south: number; east: number; west: number }
): number {
  const midLat = (bounds.north + bounds.south) / 2;
  const latMiles = Math.abs(bounds.north - bounds.south) * MILES_PER_DEG_LAT;
  const lngMiles = Math.abs(bounds.east - bounds.west) * milesPerDegLng(midLat);
  return latMiles * lngMiles;
}

interface CampAreaPickerProps {
  /** When true, the modal is visible. */
  visible: boolean;
  /** Camp name captured in the previous step — shown as subtitle only. */
  campName: string;
  /** Called with the chosen area when the user confirms. */
  onConfirm: (area: CampArea) => void;
  /** Called when the user cancels. */
  onCancel: () => void;
  /** Initial map camera center. Defaults to central Maryland. */
  initialCenter?: { lat: number; lng: number };
}

/** Corner/edge handle identifier. 'center' = drag-to-move the whole rect. */
type HandleId =
  | 'nw' | 'n' | 'ne'
  | 'w'  | 'center' | 'e'
  | 'sw' | 's' | 'se';

/** Minimum rectangle side length in screen pixels. */
const MIN_SIZE_PX = 80;

/** Visual handle dot size. */
const HANDLE_SIZE = 22;

/**
 * CampAreaPicker — full-screen area-drawing modal.
 */
export default function CampAreaPicker({
  visible,
  campName,
  onConfirm,
  onCancel,
  initialCenter,
}: CampAreaPickerProps) {
  const windowDims = Dimensions.get('window');
  const mapRef = useRef<MapboxGL.MapView>(null);
  const cameraRef = useRef<MapboxGL.Camera>(null);

  // Rectangle in SCREEN coordinates (px from top-left of the map view).
  // Initialised to a centered ~60% × 40% box.
  const initRect = useMemo(() => {
    const w = windowDims.width * 0.6;
    const h = windowDims.height * 0.4;
    return {
      x: (windowDims.width - w) / 2,
      y: (windowDims.height - h) / 2,
      w,
      h,
    };
  }, [windowDims.width, windowDims.height]);

  const [rect, setRect] = useState(initRect);
  // Reset rect when the modal re-opens (fresh draw each time)
  useEffect(() => {
    if (visible) setRect(initRect);
  }, [visible, initRect]);

  // Geographic bounds derived from the screen rectangle whenever the map
  // camera or the rectangle changes. Async because pointToCoordinate in
  // @rnmapbox/maps returns a Promise.
  const [areaSqMi, setAreaSqMi] = useState<number | null>(null);
  const [overCap, setOverCap] = useState(false);
  const lastBoundsRef = useRef<CampArea | null>(null);

  const recomputeBounds = React.useCallback(async () => {
    if (!mapRef.current) return;
    try {
      const p1 = await mapRef.current.getCoordinateFromView([rect.x, rect.y]);
      const p2 = await mapRef.current.getCoordinateFromView([rect.x + rect.w, rect.y + rect.h]);
      if (!p1 || !p2) return;
      // p1/p2 are [lng, lat] arrays per @rnmapbox API
      const lng1 = p1[0], lat1 = p1[1];
      const lng2 = p2[0], lat2 = p2[1];
      const bounds = {
        north: Math.max(lat1, lat2),
        south: Math.min(lat1, lat2),
        east:  Math.max(lng1, lng2),
        west:  Math.min(lng1, lng2),
      };
      const sqMi = computeAreaSqMi(bounds);
      setAreaSqMi(sqMi);
      setOverCap(sqMi > DEER_CAMP_MAX_AREA_SQ_MI);
      lastBoundsRef.current = { ...bounds, areaSqMi: sqMi };
    } catch {
      // projection not ready yet; ignore
    }
  }, [rect.x, rect.y, rect.w, rect.h]);

  // Recompute whenever rectangle shape changes. Map-camera-driven changes are
  // picked up via onCameraChanged below.
  useEffect(() => { recomputeBounds(); }, [recomputeBounds]);

  /**
   * Build a PanResponder for a given handle. `handle` determines which
   * edges move while the user drags. We clamp on every move to keep the
   * rectangle inside the window and above MIN_SIZE_PX.
   */
  const makeHandle = (handle: HandleId) => {
    return PanResponder.create({
      // Single-finger drags go to our rectangle; multi-finger gestures (pinch
      // to zoom, two-finger pan to rotate/tilt) fall through to the Mapbox
      // MapView so the user can reframe the map with the rectangle visible.
      onStartShouldSetPanResponder: (evt) => evt.nativeEvent.touches.length === 1,
      onMoveShouldSetPanResponder:  (evt) => evt.nativeEvent.touches.length === 1,
      onPanResponderGrant: () => {},
      onPanResponderMove: (_evt, gesture) => {
        setRect((prev) => {
          let { x, y, w, h } = prev;
          const dx = gesture.dx;
          const dy = gesture.dy;
          switch (handle) {
            case 'nw': x += dx; y += dy; w -= dx; h -= dy; break;
            case 'n':  y += dy; h -= dy; break;
            case 'ne': y += dy; w += dx; h -= dy; break;
            case 'w':  x += dx; w -= dx; break;
            case 'e':  w += dx; break;
            case 'sw': x += dx; w -= dx; h += dy; break;
            case 's':  h += dy; break;
            case 'se': w += dx; h += dy; break;
            case 'center': x += dx; y += dy; break;
          }
          // Clamp size
          if (w < MIN_SIZE_PX) {
            if (handle === 'nw' || handle === 'w' || handle === 'sw') {
              x -= (MIN_SIZE_PX - w);
            }
            w = MIN_SIZE_PX;
          }
          if (h < MIN_SIZE_PX) {
            if (handle === 'nw' || handle === 'n' || handle === 'ne') {
              y -= (MIN_SIZE_PX - h);
            }
            h = MIN_SIZE_PX;
          }
          // Clamp to window bounds
          if (x < 0) { w += x; x = 0; }
          if (y < 0) { h += y; y = 0; }
          if (x + w > windowDims.width)  w = windowDims.width  - x;
          if (y + h > windowDims.height) h = windowDims.height - y;
          return { x, y, w, h };
        });
      },
      // We don't persist dx on release because we apply each delta as it
      // arrives; that makes multi-gesture drags feel natural.
      onPanResponderRelease: () => {},
    });
  };

  // Build responders once per render; PanResponder objects are cheap.
  const responders = {
    nw: makeHandle('nw'), n: makeHandle('n'), ne: makeHandle('ne'),
    w:  makeHandle('w'),  center: makeHandle('center'), e: makeHandle('e'),
    sw: makeHandle('sw'), s: makeHandle('s'), se: makeHandle('se'),
  };

  const handleConfirm = () => {
    const b = lastBoundsRef.current;
    if (!b) return;
    if (b.areaSqMi > DEER_CAMP_MAX_AREA_SQ_MI) return;
    onConfirm(b);
  };

  // 2026-04-26: default to user's GPS via initialCenter (passed by parent).
  // If GPS unavailable, fall back to downtown Baltimore (39.2904, -76.6122)
  // — better starting point than central MD because it's where most users
  // are. From there they can pan/zoom out + search to wherever they need.
  const center = initialCenter ?? { lat: 39.2904, lng: -76.6122 };

  // 2026-04-26: track current zoom in component state so zoomIn/zoomOut
  // produce incremental changes. Previous impl read `_defaultCamera` (a
  // private API that doesn't update) so each click reset to ±1 from 12.
  const [currentZoom, setCurrentZoom] = useState(12);

  // 2026-04-26: Address search state. User types a place name (city,
  // address, landmark) and we forward-geocode via Mapbox API + recenter.
  const [searchQuery, setSearchQuery] = useState('');
  const [searching, setSearching] = useState(false);

  const handleAddressSearch = React.useCallback(async () => {
    const q = searchQuery.trim();
    if (!q) return;
    setSearching(true);
    try {
      // Mapbox forward-geocode. Bbox biased to MD/mid-Atlantic so a query
      // like "Hagerstown" doesn't pull a same-named place from the Midwest.
      const url =
        'https://api.mapbox.com/geocoding/v5/mapbox.places/' +
        encodeURIComponent(q) +
        '.json?limit=1&country=US&proximity=-76.6,39.0&access_token=' +
        MAPBOX_ACCESS_TOKEN;
      const res = await fetch(url);
      const json = await res.json();
      const feature = json?.features?.[0];
      if (feature?.center && Array.isArray(feature.center)) {
        const [lng, lat] = feature.center;
        cameraRef.current?.setCamera({
          centerCoordinate: [lng, lat],
          zoomLevel: 12,
          animationDuration: 600,
        });
        setCurrentZoom(12);
      } else {
        Alert.alert('Not found', `Couldn't find a place matching "${q}".`);
      }
    } catch {
      Alert.alert('Search failed', 'Check your network connection.');
    } finally {
      setSearching(false);
    }
  }, [searchQuery]);

  // 2026-04-26 (fork merge, fourth pass): replaced <Modal presentationStyle=
  // "fullScreen"> with a conditionally-rendered absolute-positioned overlay.
  // The Modal approach was racing iOS's UIKit modal stack against the
  // dismissing parent name-modal (three timeout tweaks did not unblock it),
  // causing the picker to never present. An overlay rendered in the same
  // React tree is presented synchronously by RN's compositor with no UIKit
  // lifecycle involvement, sidestepping the entire issue.
  if (!visible) return null;
  return (
    <View
      style={[
        StyleSheet.absoluteFill,
        { backgroundColor: Colors.background, zIndex: 9999, elevation: 9999 },
      ]}
    >
      <StatusBar barStyle="light-content" backgroundColor={Colors.background} />
      <View style={styles.root}>
        {/* Mapbox pans/zooms freely underneath the rectangle */}
        <MapboxGL.MapView
          ref={mapRef}
          style={styles.map}
          styleURL={MapboxGL.StyleURL.SatelliteStreet}
          logoEnabled={false}
          attributionEnabled={false}
          compassEnabled={false}
          onCameraChanged={recomputeBounds}
        >
          <MapboxGL.Camera
            ref={cameraRef}
            defaultSettings={{
              centerCoordinate: [center.lng, center.lat],
              zoomLevel: 12,
            }}
          />
        </MapboxGL.MapView>

        {/* Rectangle overlay + 9 handles. Everything absolute, no layout shift. */}
        <View
          pointerEvents="box-none"
          style={StyleSheet.absoluteFill}
        >
          {/* Center drag zone (transparent) */}
          <View
            {...responders.center.panHandlers}
            style={[styles.rect, { left: rect.x, top: rect.y, width: rect.w, height: rect.h, borderColor: overCap ? Colors.mdGold : Colors.mdRed }]}
          />
          {/* 8 edge handles */}
          <View {...responders.nw.panHandlers} style={[styles.handle, { left: rect.x - HANDLE_SIZE / 2, top: rect.y - HANDLE_SIZE / 2 }]} />
          <View {...responders.n .panHandlers} style={[styles.handle, { left: rect.x + rect.w / 2 - HANDLE_SIZE / 2, top: rect.y - HANDLE_SIZE / 2 }]} />
          <View {...responders.ne.panHandlers} style={[styles.handle, { left: rect.x + rect.w - HANDLE_SIZE / 2, top: rect.y - HANDLE_SIZE / 2 }]} />
          <View {...responders.w .panHandlers} style={[styles.handle, { left: rect.x - HANDLE_SIZE / 2, top: rect.y + rect.h / 2 - HANDLE_SIZE / 2 }]} />
          <View {...responders.e .panHandlers} style={[styles.handle, { left: rect.x + rect.w - HANDLE_SIZE / 2, top: rect.y + rect.h / 2 - HANDLE_SIZE / 2 }]} />
          <View {...responders.sw.panHandlers} style={[styles.handle, { left: rect.x - HANDLE_SIZE / 2, top: rect.y + rect.h - HANDLE_SIZE / 2 }]} />
          <View {...responders.s .panHandlers} style={[styles.handle, { left: rect.x + rect.w / 2 - HANDLE_SIZE / 2, top: rect.y + rect.h - HANDLE_SIZE / 2 }]} />
          <View {...responders.se.panHandlers} style={[styles.handle, { left: rect.x + rect.w - HANDLE_SIZE / 2, top: rect.y + rect.h - HANDLE_SIZE / 2 }]} />
        </View>

        {/* Top bar — minimal, only Cancel · title · Confirm */}
        <View style={styles.topBar} pointerEvents="box-none">
          <TouchableOpacity onPress={onCancel} style={styles.topBtn} hitSlop={{ top: 12, left: 12, right: 12, bottom: 12 }}>
            <Text style={styles.topBtnText}>Cancel</Text>
          </TouchableOpacity>
          <View style={styles.titleWrap} pointerEvents="none">
            <Text style={styles.titleText} numberOfLines={1}>Draw camp area</Text>
            {campName ? <Text style={styles.subtitleText} numberOfLines={1}>{campName}</Text> : null}
          </View>
          <TouchableOpacity
            onPress={handleConfirm}
            disabled={overCap || areaSqMi === null}
            style={[styles.topBtn, (overCap || areaSqMi === null) && styles.topBtnDisabled]}
            hitSlop={{ top: 12, left: 12, right: 12, bottom: 12 }}
          >
            <Text style={[styles.topBtnText, styles.confirmText, (overCap || areaSqMi === null) && styles.topBtnTextDisabled]}>
              Confirm
            </Text>
          </TouchableOpacity>
        </View>

        {/* Bottom area-readout pill */}
        <View style={styles.bottomPill} pointerEvents="none">
          <Text style={[styles.pillText, overCap && styles.pillTextOver]}>
            {areaSqMi === null
              ? 'Positioning…'
              : `${areaSqMi.toFixed(2)} sq mi${overCap ? ` · over ${DEER_CAMP_MAX_AREA_SQ_MI} sq mi cap` : ''}`}
          </Text>
          <Text style={styles.pillHint}>
            Pinch or double-tap map to zoom · drag handles to resize · drag center to move
          </Text>
        </View>

        {/* 2026-04-26 (zoom relocation + state-tracked zoom): + on top of −,
            anchored at bottom-right just above the bottom area pill. The
            internal currentZoom state means each click is incremental
            (previous impl read a private _defaultCamera and snapped to
            ±1 from 12 forever). zoomLevel clamped to [3, 20] so users can
            zoom way out to find their actual location. */}
        <View style={styles.zoomCol} pointerEvents="box-none">
          <TouchableOpacity
            style={styles.zoomBtn}
            onPress={() => {
              const next = Math.min(20, currentZoom + 1);
              cameraRef.current?.zoomTo(next);
              setCurrentZoom(next);
            }}
            accessibilityLabel="Zoom in"
          >
            <ZoomIcon variant="plus" color={Colors.textPrimary} size={20} />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.zoomBtn}
            onPress={() => {
              const next = Math.max(3, currentZoom - 1);
              cameraRef.current?.zoomTo(next);
              setCurrentZoom(next);
            }}
            accessibilityLabel="Zoom out"
          >
            <ZoomIcon variant="minus" color={Colors.textPrimary} size={20} />
          </TouchableOpacity>
        </View>

        {/* 2026-04-26: Address search. Type a place name / city / landmark,
            we forward-geocode via Mapbox API and recenter the camera at
            zoom 12. Position: top-right, just below the title bar. Width
            limited so it doesn't push the rectangle off-screen. */}
        <View style={styles.searchRow}>
          <TextInput
            style={styles.searchInput}
            placeholder="Search address or town"
            placeholderTextColor={Colors.textSecondary}
            value={searchQuery}
            onChangeText={setSearchQuery}
            onSubmitEditing={handleAddressSearch}
            returnKeyType="search"
            autoCorrect={false}
            autoCapitalize="words"
            editable={!searching}
          />
          <TouchableOpacity
            style={styles.searchBtn}
            onPress={handleAddressSearch}
            disabled={searching || !searchQuery.trim()}
          >
            <Text style={styles.searchBtnText}>{searching ? '…' : 'Go'}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.background },
  map:  { flex: 1 },
  rect: {
    position: 'absolute',
    borderWidth: 3,
    backgroundColor: 'rgba(224, 60, 49, 0.12)', // faint MD red fill
  },
  handle: {
    position: 'absolute',
    width: HANDLE_SIZE,
    height: HANDLE_SIZE,
    borderRadius: HANDLE_SIZE / 2,
    backgroundColor: Colors.mdRed,
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  topBar: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 54 : 24,
    left: 0, right: 0,
    height: 44,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
  },
  topBtn: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    backgroundColor: Colors.overlay,
    borderRadius: 8,
  },
  topBtnDisabled: { opacity: 0.5 },
  topBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.textPrimary,
    letterSpacing: 0.3,
  },
  topBtnTextDisabled: { color: Colors.textMuted },
  confirmText: { color: Colors.mdGold },
  titleWrap: { flex: 1, alignItems: 'center' },
  titleText: { fontSize: 14, fontWeight: '700', color: Colors.textPrimary, letterSpacing: 0.4 },
  subtitleText: { fontSize: 11, color: Colors.textSecondary, marginTop: 1 },
  bottomPill: {
    position: 'absolute',
    bottom: 28,
    left: 16,
    right: 16,
    backgroundColor: Colors.overlay,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  pillText: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.textPrimary,
    letterSpacing: 0.3,
  },
  pillTextOver: { color: Colors.mdGold },
  pillHint: {
    fontSize: 10,
    color: Colors.textSecondary,
    marginTop: 3,
    textAlign: 'center',
  },
  zoomCol: {
    position: 'absolute',
    right: 12,
    // 2026-04-26: pulled in from bottom: 110 → bottom: 130 so the pair
    // sits cleanly above the bottom area-readout pill (which lives at
    // bottom: 28 with ~70pt height including hint line).
    bottom: 130,
    flexDirection: 'column',
    gap: 8,
  },
  // 2026-04-26: address search row, top-of-screen below the title bar.
  searchRow: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 108 : 78,
    left: 16,
    right: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: Colors.overlay,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: Colors.mud,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: Colors.textPrimary,
    paddingVertical: 6,
  },
  searchBtn: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    backgroundColor: Colors.moss,
    borderRadius: 8,
  },
  searchBtnText: {
    color: Colors.textOnAccent,
    fontWeight: '700',
    fontSize: 13,
  },
  zoomBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.overlay,
    borderWidth: 1,
    borderColor: Colors.mud,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
