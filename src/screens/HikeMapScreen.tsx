/**
 * HikeMapScreen — Mapbox trail map.
 *
 * Phase 5B implementation:
 *   - AT LineString styled as flagship polyline (dark green)
 *   - 4 AT shelters as brown triangles (only coordinate-verified entries)
 *   - 4 AT trailheads as green pins (only coordinate-verified entries)
 *   - Additional verified landmarks as amber stars
 *   - State-park trails toggleable by difficulty
 *   - Tap any feature → detail panel with distance, elevation, difficulty, "Start recording" button
 */

import React, { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ScrollView,
  ActivityIndicator,
  Linking,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import MapboxGL from '@rnmapbox/maps';
import { useNavigation } from '@react-navigation/native';
import { useLocation } from '../hooks/useLocation';
import DisclaimerBanner from '../components/common/DisclaimerBanner';
import UserWaypointLayer from '../components/map/UserWaypointLayer';
import UserMarkupLayer from '../components/map/UserMarkupLayer';
import TrailNavChip from '../components/map/TrailNavChip';
import ZoomIcon from '../components/map/ZoomIcon';
import OnboardingTourGate from '../components/OnboardingTourGate';
import { useMapLongPressWaypoint } from '../hooks/useMapLongPressWaypoint';
import type { NearestTrailCandidate } from '../services/trailNavService';
import Colors from '../theme/colors';
import { MARYLAND_APPALACHIAN_TRAIL, AT_POLYLINE_IS_APPROXIMATE } from '../data/marylandATTrail';
import {
  MARYLAND_LOCAL_SERVICES,
  type LocalService,
} from '../data/marylandLocalServices';
import { MARYLAND_STATE_PARK_TRAILS } from '../data/marylandStateParkTrails';
import { HIKING_TRACES, HIKING_TRACE_SUMMARY } from '../data/marylandHikingTraces';
import { MAPBOX_ACCESS_TOKEN } from '../config';

MapboxGL.setAccessToken(MAPBOX_ACCESS_TOKEN);

const BALTIMORE_CENTER: [number, number] = [-76.6122, 39.2904];
const DEFAULT_ZOOM = 7.5;

type DifficultyFilter = 'easy' | 'moderate' | 'strenuous' | 'all';

interface SelectedFeature {
  type: 'shelter' | 'trailhead' | 'landmark' | 'trail';
  id: string;
  name: string;
  lat: number;
  lon: number;
  details?: Record<string, any>;
}

export default function HikeMapScreen() {
  const navigation = useNavigation<any>();
  const onLongPressMap = useMapLongPressWaypoint({
    mode: 'hike',
    navigate: (screen, params) => navigation.navigate(screen, params),
  });
  const openWaypointEdit = useCallback(
    (waypointId: string) =>
      navigation.navigate('WaypointEdit', { mode: 'hike', waypointId }),
    [navigation],
  );
  const openMarkupEdit = useCallback(
    (markupId: string) =>
      navigation.navigate('MarkupEdit', { mode: 'hike', markupId }),
    [navigation],
  );
  const openPersonalHub = useCallback(
    () => navigation.navigate('PersonalHub', { mode: 'hike' }),
    [navigation],
  );
  const insets = useSafeAreaInsets();
  const cameraRef = useRef<MapboxGL.Camera>(null);
  const { location, loading: locationLoading } = useLocation();

  const [selected, setSelected] = useState<SelectedFeature | null>(null);
  const [difficultyFilter, setDifficultyFilter] = useState<DifficultyFilter>('all');
  const [mapStyle, setMapStyle] = useState<'topo' | 'satellite'>('topo');
  // Per-session dismissal of the bottom banners so the user can reclaim
  // vertical space. Both come back on next cold start.
  const [approxBannerDismissed, setApproxBannerDismissed] = useState(false);
  const [disclaimerDismissed, setDisclaimerDismissed] = useState(false);
  // 2026-04-27: Local-pros layer (REI / Charm City Run / Bike Doctor / etc.)
  const [showHikePros, setShowHikePros] = useState(true);
  const [selectedHikeProId, setSelectedHikeProId] = useState<string | null>(null);

  // Current camera zoom — kept in sync via onCameraChanged so the +/- buttons
  // can apply a correct delta from wherever the user currently is. Previous
  // impl read `_centerCoordinate[2]` which is always undefined (the slot is
  // lng/lat, not zoom) so +/- snapped to DEFAULT_ZOOM±1.
  const [currentZoom, setCurrentZoom] = useState<number>(DEFAULT_ZOOM);

  // Center on user location on mount, but only when the user is actually in
  // Maryland. iOS Simulator defaults to Cupertino and would otherwise fly the
  // camera off-state on first open.
  useEffect(() => {
    if (cameraRef.current && location) {
      const { longitude, latitude } = location;
      const inMaryland =
        longitude >= -79.5 && longitude <= -74.9 &&
        latitude >= 37.8 && latitude <= 39.8;
      if (inMaryland) {
        cameraRef.current.setCamera({
          centerCoordinate: [longitude, latitude],
          zoomLevel: DEFAULT_ZOOM,
          animationDuration: 1000,
        });
      }
    }
  }, [location]);

  // AT polyline GeoJSON
  const atLineGeoJSON = useMemo(() => ({
    type: 'FeatureCollection' as const,
    features: [
      {
        type: 'Feature' as const,
        id: 'at-line',
        properties: { name: 'Appalachian Trail (MD)' },
        geometry: {
          type: 'LineString' as const,
          coordinates: MARYLAND_APPALACHIAN_TRAIL.coordinates,
        },
      },
    ],
  }), []);

  // AT shelters GeoJSON
  const sheltersGeoJSON = useMemo(() => ({
    type: 'FeatureCollection' as const,
    features: MARYLAND_APPALACHIAN_TRAIL.shelters.map((s) => ({
      type: 'Feature' as const,
      id: s.id,
      properties: {
        name: s.name,
        capacity: s.capacity,
        hasPrivy: s.hasPrivy,
        waterSourceNotes: s.waterSourceNotes,
      },
      geometry: {
        type: 'Point' as const,
        coordinates: [s.lon, s.lat],
      },
    })),
  }), []);

  // AT trailheads GeoJSON
  const trailheadsGeoJSON = useMemo(() => ({
    type: 'FeatureCollection' as const,
    features: MARYLAND_APPALACHIAN_TRAIL.trailheads.map((t) => ({
      type: 'Feature' as const,
      id: t.id,
      properties: {
        name: t.name,
        parking: t.parking,
        parkingCapacity: t.parkingCapacity,
      },
      geometry: {
        type: 'Point' as const,
        coordinates: [t.lon, t.lat],
      },
    })),
  }), []);

  // AT landmarks GeoJSON
  const landmarksGeoJSON = useMemo(() => ({
    type: 'FeatureCollection' as const,
    features: MARYLAND_APPALACHIAN_TRAIL.landmarks.map((l) => ({
      type: 'Feature' as const,
      id: l.id,
      properties: {
        name: l.name,
        type: l.type,
        description: l.description,
      },
      geometry: {
        type: 'Point' as const,
        coordinates: [l.lon, l.lat],
      },
    })),
  }), []);

  // State-park trails GeoJSON (filtered by difficulty)
  const trailsGeoJSON = useMemo(() => {
    const filtered =
      difficultyFilter === 'all'
        ? MARYLAND_STATE_PARK_TRAILS
        : MARYLAND_STATE_PARK_TRAILS.filter((t) => t.difficulty === difficultyFilter);

    return {
      type: 'FeatureCollection' as const,
      features: filtered.map((t) => ({
        type: 'Feature' as const,
        id: t.id,
        properties: {
          name: t.name,
          difficulty: t.difficulty,
          lengthMi: t.lengthMi,
          elevationGainFt: t.elevationGainFt,
          park: t.park,
          dogFriendly: t.dogFriendly,
        },
        geometry: {
          type: 'Point' as const,
          coordinates: [t.trailheadLon, t.trailheadLat],
        },
      })),
    };
  }, [difficultyFilter]);

  // 2026-04-27: Hike-relevant local-pros GeoJSON. Pins for hiking-shop,
  // bike-shop, shoe-store with lat/lng. REI / Charm City Run / Bike
  // Doctor / etc. Same pattern as Hunt MapScreen.
  const hikeProsGeoJSON = useMemo(() => {
    if (!showHikePros) return { type: 'FeatureCollection' as const, features: [] };
    const hikeCats = new Set([
      'hiking-shop',
      'bike-shop',
      'shoe-store',
      'hiking-club',  // clubs without lat/lng will be filtered by the typeof check
      'biking-club',
    ]);
    const features = MARYLAND_LOCAL_SERVICES
      .filter((s: LocalService) =>
        hikeCats.has(s.category) &&
        typeof s.lat === 'number' &&
        typeof s.lng === 'number')
      .map((s: LocalService) => ({
        type: 'Feature' as const,
        id: s.id,
        properties: {
          id: s.id,
          name: s.name,
          category: s.category,
          // Featured (David's picks) gold; hiking shops teal; bike shops
          // indigo; shoe stores pink so they're visually distinct.
          color: s.featured
            ? '#FFD700'
            : s.category === 'hiking-shop'
            ? '#26A69A'
            : s.category === 'bike-shop'
            ? '#3949AB'
            : s.category === 'shoe-store'
            ? '#E91E63'
            : '#3A3F2A',
        },
        geometry: { type: 'Point' as const, coordinates: [s.lng!, s.lat!] },
      }));
    return { type: 'FeatureCollection' as const, features };
  }, [showHikePros]);

  const selectedHikePro = useMemo(
    () => MARYLAND_LOCAL_SERVICES.find((s) => s.id === selectedHikeProId) || null,
    [selectedHikeProId],
  );

  // Park-trail polyline GeoJSON from HIKING_TRACES (Tier-1 + Tier-2 ingested).
  // Confidence drives styling: solid green for high, dashed amber for medium/low
  // (per the IS_APPROXIMATE UX contract in data_quality_methodology.md).
  const parkTraceLinesGeoJSON = useMemo(() => ({
    type: 'FeatureCollection' as const,
    features: Object.values(HIKING_TRACES).map((t) => ({
      type: 'Feature' as const,
      id: t.id,
      properties: {
        name: t.name,
        confidence: t.confidence,
        isApproximate: t.isApproximate,
        lengthMi: t.lengthMi,
        publishedMi: t.publishedMi,
        source: t.source,
      },
      geometry: {
        type: 'LineString' as const,
        coordinates: t.coordinates,
      },
    })),
  }), []);

  const anyApproximateTraces = useMemo(
    () => Object.values(HIKING_TRACES).some((t) => t.isApproximate),
    [],
  );

  const handleMapPress = useCallback(() => {
    setSelected(null);
  }, []);

  const handleShelterPress = useCallback((event: any) => {
    try {
      const feature = event?.features?.[0];
      if (feature?.properties?.name && feature?.geometry?.coordinates) {
        const [lon, lat] = feature.geometry.coordinates;
        const shelter = MARYLAND_APPALACHIAN_TRAIL.shelters.find(
          (s) => s.name === feature.properties.name,
        );
        setSelected({
          type: 'shelter',
          id: feature.id || '',
          name: feature.properties.name,
          lat,
          lon,
          details: shelter,
        });
      }
    } catch {
      //
    }
  }, []);

  const handleTrailheadPress = useCallback((event: any) => {
    try {
      const feature = event?.features?.[0];
      if (feature?.properties?.name && feature?.geometry?.coordinates) {
        const [lon, lat] = feature.geometry.coordinates;
        const trailhead = MARYLAND_APPALACHIAN_TRAIL.trailheads.find(
          (t) => t.name === feature.properties.name,
        );
        setSelected({
          type: 'trailhead',
          id: feature.id || '',
          name: feature.properties.name,
          lat,
          lon,
          details: trailhead,
        });
      }
    } catch {
      //
    }
  }, []);

  const handleLandmarkPress = useCallback((event: any) => {
    try {
      const feature = event?.features?.[0];
      if (feature?.properties?.name && feature?.geometry?.coordinates) {
        const [lon, lat] = feature.geometry.coordinates;
        const landmark = MARYLAND_APPALACHIAN_TRAIL.landmarks.find(
          (l) => l.name === feature.properties.name,
        );
        setSelected({
          type: 'landmark',
          id: feature.id || '',
          name: feature.properties.name,
          lat,
          lon,
          details: landmark,
        });
      }
    } catch {
      //
    }
  }, []);

  const handleTrailPress = useCallback((event: any) => {
    try {
      const feature = event?.features?.[0];
      if (feature?.properties?.name && feature?.geometry?.coordinates) {
        const [lon, lat] = feature.geometry.coordinates;
        const trail = MARYLAND_STATE_PARK_TRAILS.find((t) => t.name === feature.properties.name);
        setSelected({
          type: 'trail',
          id: feature.id || '',
          name: feature.properties.name,
          lat,
          lon,
          details: trail,
        });
      }
    } catch {
      //
    }
  }, []);

  const centerOnLocation = useCallback(() => {
    if (location && cameraRef.current) {
      cameraRef.current.setCamera({
        centerCoordinate: [location.longitude, location.latitude],
        zoomLevel: 12,
        animationDuration: 800,
      });
    } else {
      Alert.alert(
        'Location Services',
        'Enable location access in Settings > Privacy > Location Services to see your position.',
        [{ text: 'OK', style: 'cancel' }],
      );
    }
  }, [location]);

  const zoomIn = useCallback(() => {
    cameraRef.current?.zoomTo(Math.min(currentZoom + 1, 18), 300);
  }, [currentZoom]);

  const zoomOut = useCallback(() => {
    cameraRef.current?.zoomTo(Math.max(currentZoom - 1, 4), 300);
  }, [currentZoom]);

  const handleCameraChanged = useCallback((state: any) => {
    const z = state?.properties?.zoom;
    if (typeof z === 'number' && isFinite(z)) setCurrentZoom(z);
  }, []);

  // ── Phase B.3: build the trail candidates list for the nav chip ──
  // The chip picks whichever trail is closest to the user. We feed it
  // both the Appalachian Trail and the currently-filtered state-park
  // trails so the "near a trail" status reflects what's on-screen. AT
  // is a single LineString; state-park trails are a mix of LineString
  // and pin-only entries (those just skipped by snapToPolyline).
  const trailCandidates = useMemo<NearestTrailCandidate[]>(() => {
    const list: NearestTrailCandidate[] = [
      {
        trailId: 'at-md',
        name: 'Appalachian Trail (MD)',
        coordinates: MARYLAND_APPALACHIAN_TRAIL.coordinates as Array<[number, number]>,
      },
    ];
    const active =
      difficultyFilter === 'all'
        ? MARYLAND_STATE_PARK_TRAILS
        : MARYLAND_STATE_PARK_TRAILS.filter((t) => t.difficulty === difficultyFilter);
    for (const t of active) {
      const coords = (t as any).coordinates;
      if (Array.isArray(coords) && coords.length >= 2) {
        list.push({
          trailId: t.id,
          name: t.name,
          coordinates: coords as Array<[number, number]>,
        });
      }
    }
    return list;
  }, [difficultyFilter]);

  return (
    <View style={styles.container}>
      <MapboxGL.MapView
        style={styles.map}
        styleURL={
          mapStyle === 'satellite' ? MapboxGL.StyleURL.SatelliteStreet : MapboxGL.StyleURL.Outdoors
        }
        onPress={handleMapPress}
        onLongPress={onLongPressMap}
        onCameraChanged={handleCameraChanged}
      >
        <MapboxGL.Camera
          ref={cameraRef}
          defaultSettings={{
            centerCoordinate: BALTIMORE_CENTER,
            zoomLevel: DEFAULT_ZOOM,
          }}
        />

        {/* AT LineString */}
        <MapboxGL.ShapeSource id="atLine" shape={atLineGeoJSON as any}>
          <MapboxGL.LineLayer
            id="atPolyline"
            style={{
              lineColor: Colors.forestDark,
              lineWidth: ['interpolate', ['linear'], ['zoom'], 6, 2, 10, 3, 14, 5],
              lineOpacity: 0.9,
              lineCap: 'round',
              lineJoin: 'round',
            }}
          />
        </MapboxGL.ShapeSource>

        {/* AT Shelters */}
        <MapboxGL.ShapeSource id="shelters" shape={sheltersGeoJSON as any} onPress={handleShelterPress}>
          <MapboxGL.SymbolLayer
            id="shelterMarkers"
            style={{
              iconImage: 'pin-brown',
              iconSize: ['interpolate', ['linear'], ['zoom'], 8, 0.8, 12, 1.2],
              iconAllowOverlap: true,
            }}
          />
        </MapboxGL.ShapeSource>

        {/* AT Trailheads */}
        <MapboxGL.ShapeSource id="trailheads" shape={trailheadsGeoJSON as any} onPress={handleTrailheadPress}>
          <MapboxGL.SymbolLayer
            id="trailheadMarkers"
            style={{
              iconImage: 'pin-green',
              iconSize: ['interpolate', ['linear'], ['zoom'], 8, 0.8, 12, 1.2],
              iconAllowOverlap: true,
            }}
          />
        </MapboxGL.ShapeSource>

        {/* AT Landmarks */}
        <MapboxGL.ShapeSource id="landmarks" shape={landmarksGeoJSON as any} onPress={handleLandmarkPress}>
          <MapboxGL.SymbolLayer
            id="landmarkMarkers"
            style={{
              iconImage: 'star',
              iconSize: ['interpolate', ['linear'], ['zoom'], 8, 0.7, 12, 1.1],
              iconColor: Colors.mdGold,
              iconAllowOverlap: true,
            }}
          />
        </MapboxGL.ShapeSource>

        {/* Park-trail polylines (Tier-1 USGS + Overpass, Tier-2 relaxed OSM).
            Solid green = confidence 'high'; dashed amber = 'medium' or 'low'
            (isApproximate=true). Rendered BEFORE state-park pins so the
            circle markers stay clickable on top. */}
        <MapboxGL.ShapeSource id="parkTraceLines" shape={parkTraceLinesGeoJSON as any}>
          <MapboxGL.LineLayer
            id="parkTraceLinesLayer"
            style={{
              lineColor: [
                'case',
                ['==', ['get', 'isApproximate'], true],
                Colors.amber,
                Colors.moss,
              ],
              lineWidth: ['interpolate', ['linear'], ['zoom'], 8, 1.5, 12, 3, 15, 4.5],
              lineOpacity: 0.85,
              lineDasharray: [
                'case',
                ['==', ['get', 'isApproximate'], true],
                ['literal', [2, 2]],
                ['literal', [1, 0]],
              ],
              lineCap: 'round',
              lineJoin: 'round',
            }}
          />
        </MapboxGL.ShapeSource>

        {/* State-park trails */}
        <MapboxGL.ShapeSource id="stateParks" shape={trailsGeoJSON as any} onPress={handleTrailPress}>
          <MapboxGL.CircleLayer
            id="stateParksMarkers"
            style={{
              circleColor: ['match', ['get', 'difficulty'], 'easy', '#6B9E5B', 'moderate', '#D4913D', 'strenuous', '#C75450', '#8FA67A'],
              circleRadius: ['interpolate', ['linear'], ['zoom'], 8, 3, 12, 6],
              circleOpacity: 0.75,
              circleStrokeWidth: 1.5,
              circleStrokeColor: '#FFFFFF',
            }}
          />
        </MapboxGL.ShapeSource>

        {/* 2026-04-27: Hike-relevant local-pros pins. REI Columbia /
            Rockville / Timonium, Charm City Run × 3, Bike Doctor × 2.
            Distinct color per category so users can tell hiking shop
            vs. bike shop vs. running shop at a glance. */}
        {showHikePros && hikeProsGeoJSON.features.length > 0 && (
          <MapboxGL.ShapeSource
            id="hikeLocalPros"
            shape={hikeProsGeoJSON as any}
            onPress={(e: any) => {
              const f = e?.features?.[0];
              if (f?.properties?.id) setSelectedHikeProId(f.properties.id);
            }}
          >
            <MapboxGL.CircleLayer
              id="hikeLocalProsHalo"
              style={{
                circleRadius: ['interpolate', ['linear'], ['zoom'], 7, 5, 12, 11, 16, 16],
                circleColor: '#FFFFFF',
                circleOpacity: 0.9,
              }}
            />
            <MapboxGL.CircleLayer
              id="hikeLocalProsCore"
              style={{
                circleRadius: ['interpolate', ['linear'], ['zoom'], 7, 3, 12, 7, 16, 11],
                circleColor: ['get', 'color'],
                circleStrokeColor: '#000000',
                circleStrokeWidth: 1,
              }}
            />
            <MapboxGL.SymbolLayer
              id="hikeLocalProsLabel"
              minZoomLevel={11}
              style={{
                textField: ['get', 'name'],
                textSize: 10,
                textColor: '#FFFFFF',
                textHaloColor: '#000000',
                textHaloWidth: 1.2,
                textOffset: [0, 1.4],
                textAnchor: 'top',
              }}
            />
          </MapboxGL.ShapeSource>
        )}

        {/* ── Personal waypoints (Phase A.1b) ──
            User-created pins for hike mode (landmark / view / hazard). */}
        <UserWaypointLayer mode="hike" onWaypointPress={openWaypointEdit} />
        <UserMarkupLayer mode="hike" onMarkupPress={openMarkupEdit} />
      </MapboxGL.MapView>

      {/* ── Phase B.3: trail-nav status chip (top-left) ──
          Hidden when no user location or no valid trails; otherwise
          shows "on/off trail" plus progress through the nearest trail. */}
      <TrailNavChip
        userLat={location?.latitude}
        userLng={location?.longitude}
        trails={trailCandidates}
      />

      <View style={styles.statsBadge}>
        <Text style={styles.statsText}>
          {MARYLAND_APPALACHIAN_TRAIL.totalLengthMi} mi AT + {MARYLAND_STATE_PARK_TRAILS.length} state trails
        </Text>
        <Text style={styles.statsSubtext}>
          Maryland Hiking Map · {HIKING_TRACE_SUMMARY.withGeometry}/{HIKING_TRACE_SUMMARY.totalTrails} park traces
        </Text>
      </View>

      {!selected ? (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.filterBar}
          contentContainerStyle={styles.filterBarContent}
        >
          {(['all', 'easy', 'moderate', 'strenuous'] as const).map((diff) => (
            <TouchableOpacity
              key={diff}
              style={[styles.filterChip, difficultyFilter === diff && styles.filterChipActive]}
              onPress={() => setDifficultyFilter(diff)}
              activeOpacity={0.7}
              accessibilityRole="switch"
              accessibilityLabel={`Filter to ${diff === 'all' ? 'all trails' : diff + ' trails'}`}
              accessibilityState={{ checked: difficultyFilter === diff }}
            >
              <Text
                style={[styles.filterLabel, difficultyFilter === diff && styles.filterLabelActive]}
              >
                {diff === 'all' ? 'All Trails' : diff.charAt(0).toUpperCase() + diff.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
          {/* 2026-04-27: Pros toggle — REI / Charm City Run / Bike Doctor / etc. */}
          <TouchableOpacity
            style={[styles.filterChip, showHikePros && styles.filterChipActive]}
            onPress={() => setShowHikePros((s) => !s)}
            activeOpacity={0.7}
            accessibilityRole="switch"
            accessibilityLabel="Toggle local hiking and biking pros overlay"
            accessibilityState={{ checked: showHikePros }}
          >
            <Text
              style={[styles.filterLabel, showHikePros && styles.filterLabelActive]}
            >
              Pros
            </Text>
          </TouchableOpacity>
        </ScrollView>
      ) : null}

      <View style={styles.controlsColumn}>
        <TouchableOpacity
          style={styles.controlBtn}
          onPress={() => setMapStyle((s) => (s === 'topo' ? 'satellite' : 'topo'))}
        >
          <Text style={styles.controlText}>{mapStyle === 'topo' ? 'SAT' : 'MAP'}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.controlBtn} onPress={openPersonalHub}>
          <Text style={styles.controlText}>ME</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.controlBtn} onPress={centerOnLocation}>
          <Text style={styles.controlCrosshair}>{'\u2316'}</Text>
        </TouchableOpacity>
      </View>

      {/* 2026-04-26 (zoom relocation): zoom buttons moved to bottom-right
          row above the bottom panel — vertical pair with + on top of −. */}
      <View style={styles.zoomControls}>
        <TouchableOpacity
          style={styles.controlBtn}
          onPress={zoomIn}
          accessibilityRole="button"
          accessibilityLabel="Zoom in"
        >
          <ZoomIcon variant="plus" color={Colors.textPrimary} size={20} />
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.controlBtn}
          onPress={zoomOut}
          accessibilityRole="button"
          accessibilityLabel="Zoom out"
        >
          <ZoomIcon variant="minus" color={Colors.textPrimary} size={20} />
        </TouchableOpacity>
      </View>

      {/* 2026-04-27: Selected Hike Pro detail card. Same pattern as Hunt
          Pros card — name / category / description / offerings / address
          + Call + Website buttons. Uses inline styles tied to Colors so
          we don't need a separate StyleSheet diff. */}
      {selectedHikePro && (
        <View style={hikeProCardStyles.card}>
          <View style={hikeProCardStyles.header}>
            <Text style={hikeProCardStyles.name} numberOfLines={2}>
              {selectedHikePro.name}
            </Text>
            <TouchableOpacity onPress={() => setSelectedHikeProId(null)}>
              <Text style={hikeProCardStyles.close}>✕</Text>
            </TouchableOpacity>
          </View>
          <Text style={hikeProCardStyles.cat}>
            {selectedHikePro.category.replace('-', ' ')}
            {selectedHikePro.featured ? ' · ★ recommended' : ''}
          </Text>
          <Text style={hikeProCardStyles.desc} numberOfLines={4}>
            {selectedHikePro.description}
          </Text>
          <Text style={hikeProCardStyles.off} numberOfLines={2}>
            {selectedHikePro.offerings}
          </Text>
          {selectedHikePro.address ? (
            <Text style={hikeProCardStyles.addr}>{selectedHikePro.address}</Text>
          ) : null}
          <View style={hikeProCardStyles.btns}>
            {selectedHikePro.phone ? (
              <TouchableOpacity
                style={[hikeProCardStyles.btn, { backgroundColor: Colors.moss }]}
                onPress={() =>
                  Linking.openURL('tel:' + selectedHikePro.phone).catch(() => {})
                }
                accessibilityRole="button"
                accessibilityLabel={`Call ${selectedHikePro.name}`}
              >
                <Text style={hikeProCardStyles.btnText}>Call</Text>
              </TouchableOpacity>
            ) : null}
            {selectedHikePro.website ? (
              <TouchableOpacity
                style={[hikeProCardStyles.btn, { backgroundColor: '#1A3A5C' }]}
                onPress={() =>
                  Linking.openURL(selectedHikePro.website!).catch(() => {})
                }
                accessibilityRole="button"
                accessibilityLabel={`Open ${selectedHikePro.name} website`}
              >
                <Text style={hikeProCardStyles.btnText}>Website</Text>
              </TouchableOpacity>
            ) : null}
          </View>
        </View>
      )}

      {selected ? (
        <View
          style={[
            styles.detailPanel,
            {
              bottom:
                insets.bottom +
                12 +
                (!approxBannerDismissed ? 32 : 0) +
                (!disclaimerDismissed ? 32 : 0),
            },
          ]}
        >
          <View style={styles.detailHeader}>
            <Text style={styles.detailName} numberOfLines={2}>
              {selected.name}
            </Text>
            <TouchableOpacity onPress={() => setSelected(null)}>
              <Text style={styles.detailClose}>{'\u2715'}</Text>
            </TouchableOpacity>
          </View>

          {selected.type === 'shelter' && selected.details ? (
            <>
              <Text style={styles.detailField}>
                <Text style={styles.detailFieldLabel}>Capacity: </Text>
                {selected.details.capacity} hikers
              </Text>
              <Text style={styles.detailField}>
                <Text style={styles.detailFieldLabel}>Water: </Text>
                {selected.details.waterSourceNotes || 'Check nearby'}
              </Text>
              <Text style={styles.detailField}>
                <Text style={styles.detailFieldLabel}>Facilities: </Text>
                {selected.details.hasPrivy ? 'Privy' : 'No facilities'}
                {selected.details.hasBearBox ? ', Bear box' : ''}
              </Text>
            </>
          ) : null}

          {selected.type === 'trailhead' && selected.details ? (
            <>
              <Text style={styles.detailField}>
                <Text style={styles.detailFieldLabel}>Parking: </Text>
                {selected.details.parkingCapacity || '?'} spots ({selected.details.parking})
              </Text>
              <Text style={styles.detailField}>
                <Text style={styles.detailFieldLabel}>Access: </Text>
                {selected.details.access === 'public' ? 'Public' : 'Permit required'}
              </Text>
            </>
          ) : null}

          {selected.type === 'landmark' && selected.details ? (
            <Text style={styles.detailField}>{selected.details.description}</Text>
          ) : null}

          {selected.type === 'trail' && selected.details ? (
            <>
              <Text style={styles.detailField}>
                <Text style={styles.detailFieldLabel}>Distance: </Text>
                {selected.details.lengthMi} mi
              </Text>
              <Text style={styles.detailField}>
                <Text style={styles.detailFieldLabel}>Elevation: </Text>
                {selected.details.elevationGainFt} ft gain
              </Text>
              <Text style={styles.detailField}>
                <Text style={styles.detailFieldLabel}>Difficulty: </Text>
                {selected.details.difficulty.charAt(0).toUpperCase() +
                  selected.details.difficulty.slice(1)}
              </Text>
              <Text style={styles.detailField}>
                <Text style={styles.detailFieldLabel}>Dog-friendly: </Text>
                {selected.details.dogFriendly ? 'Yes' : 'No'}
              </Text>
            </>
          ) : null}

          {/* 2026-04-29: "What we use here" CTA — taps deep-link into AI tab
              pre-populated with a hike-specific query. AI response splices
              the Amazon affiliate footer via augmentHikeWithGearSuggestions
              in hikingChatKnowledge. End-to-end monetization mirroring
              Hunt + Fish patterns. */}
          {(() => {
            const t = selected.type;
            const query =
              t === 'shelter'
                ? `Best overnight gear for ${selected.name} on the AT?`
                : t === 'trailhead'
                ? `Day-hike gear list for ${selected.name}?`
                : t === 'landmark'
                ? `What gear do we use to hike to ${selected.name}?`
                : `Gear list for ${selected.name}?`;
            return (
              <TouchableOpacity
                accessibilityRole="button"
                accessibilityLabel={`Ask AI: ${query}`}
                onPress={() => {
                  // 2026-04-29: Hike mode's AI tab is registered as
                  // `HikeAITab` in AppNavigator (not `ChatTab` — that's
                  // the Hunt tab name). Adversarial audit caught this.
                  navigation.navigate('HikeAITab', {
                    screen: 'ChatMain',
                    params: { initialQuery: query },
                  });
                }}
                activeOpacity={0.7}
                style={{
                  marginTop: 8,
                  paddingVertical: 8,
                  paddingHorizontal: 10,
                  backgroundColor: Colors.lichen,
                  borderRadius: 8,
                }}
              >
                <Text style={{ color: Colors.background, fontWeight: '700', fontSize: 13 }}>
                  💡 What we use here →
                </Text>
                <Text style={{ color: Colors.background, fontSize: 11, marginTop: 2 }}>
                  {query}
                </Text>
              </TouchableOpacity>
            );
          })()}

          <TouchableOpacity
            style={[styles.detailBtn, { backgroundColor: Colors.moss, marginTop: 12 }]}
            onPress={() => setSelected(null)}
            activeOpacity={0.8}
          >
            <Text style={styles.detailBtnText}>Close</Text>
          </TouchableOpacity>
        </View>
      ) : null}

      {locationLoading ? (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color={Colors.moss} />
        </View>
      ) : null}

      {(AT_POLYLINE_IS_APPROXIMATE || anyApproximateTraces) && !approxBannerDismissed ? (
        <View style={styles.approxBanner}>
          <Text style={styles.approxText}>
            Dashed amber lines are approximate alignments — refer to official park/ATC maps for navigation.
          </Text>
          <TouchableOpacity
            style={styles.approxDismissBtn}
            onPress={() => setApproxBannerDismissed(true)}
            accessibilityLabel="Dismiss approximate alignment warning"
            accessibilityRole="button"
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Text style={styles.approxDismissText}>✕</Text>
          </TouchableOpacity>
        </View>
      ) : null}

      <DisclaimerBanner
        dismissed={disclaimerDismissed}
        onDismiss={() => setDisclaimerDismissed(true)}
      />

      <OnboardingTourGate mode="hike" />
    </View>
  );
}

// 2026-04-27: Hike Pro detail-card styles. Bottom-anchored card mirrors
// Hunt MapScreen's proCard pattern. Kept in its own object so it doesn't
// fight any naming collisions with the existing detailPanel style.
const hikeProCardStyles = StyleSheet.create({
  card: {
    position: 'absolute',
    bottom: 130,
    left: 12,
    right: 12,
    backgroundColor: Colors.overlay,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: Colors.mud,
    elevation: 6,
  },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  name: { flex: 1, fontSize: 16, fontWeight: '700', color: Colors.textPrimary },
  close: { fontSize: 18, color: Colors.textSecondary, paddingLeft: 8 },
  cat: { fontSize: 11, color: Colors.mdGold, fontWeight: '600', marginTop: 2, marginBottom: 6, textTransform: 'capitalize' },
  desc: { fontSize: 13, color: Colors.textSecondary, marginBottom: 6, lineHeight: 18 },
  off: { fontSize: 12, color: Colors.textPrimary, marginBottom: 4, fontStyle: 'italic' },
  addr: { fontSize: 11, color: Colors.textMuted, marginBottom: 8 },
  btns: { flexDirection: 'row', gap: 8 },
  btn: { flex: 1, paddingVertical: 8, borderRadius: 8, alignItems: 'center' },
  btnText: { color: Colors.textOnAccent, fontWeight: '700', fontSize: 13 },
});

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  map: { flex: 1 },
  statsBadge: {
    position: 'absolute',
    top: 12,
    left: 12,
    backgroundColor: Colors.overlay,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    zIndex: 10,
  },
  statsText: { fontSize: 12, fontWeight: '700', color: Colors.lichen },
  statsSubtext: { fontSize: 10, color: Colors.textMuted, marginTop: 2 },
  filterBar: { position: 'absolute', top: 58, left: 0, right: 0, zIndex: 10, maxHeight: 44 },
  filterBarContent: { paddingHorizontal: 12, gap: 8 },
  filterChip: {
    backgroundColor: Colors.overlay,
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: Colors.mud,
  },
  filterChipActive: {
    backgroundColor: Colors.moss,
    borderColor: Colors.moss,
  },
  filterLabel: { fontSize: 11, fontWeight: '600', color: Colors.textSecondary },
  filterLabelActive: { color: Colors.textPrimary },
  // 2026-04-26 (zoom relocation): SAT/ME/⌖ moved up; zoom split out into
  // zoomControls anchored just above the bottom detail panel.
  controlsColumn: {
    position: 'absolute',
    right: 12,
    top: 200,
    zIndex: 10,
    gap: 6,
  },
  // Vertical zoom pair, + on top of −, anchored just above the bottom
  // detail panel / search area.
  zoomControls: {
    position: 'absolute',
    right: 12,
    bottom: 130,
    zIndex: 10,
    gap: 6,
  },
  controlBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.overlay,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.mud,
  },
  controlText: { fontSize: 16, fontWeight: '700', color: Colors.textPrimary },
  controlCrosshair: { fontSize: 20, color: Colors.lichen },
  detailPanel: {
    position: 'absolute',
    left: 12,
    right: 12,
    backgroundColor: Colors.surface,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: Colors.mud,
    zIndex: 15,
  },
  detailHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  detailName: { fontSize: 15, fontWeight: '700', color: Colors.textPrimary, flex: 1 },
  detailClose: { fontSize: 18, color: Colors.textMuted, padding: 4 },
  detailField: { fontSize: 13, color: Colors.textSecondary, lineHeight: 20, marginBottom: 6 },
  detailFieldLabel: { fontWeight: '600', color: Colors.textPrimary },
  detailBtn: {
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  detailBtnText: { fontSize: 12, fontWeight: '700', color: Colors.textPrimary },
  approxBanner: {
    backgroundColor: Colors.amber,
    paddingLeft: 12,
    paddingRight: 32, // reserve room for ✕ button
    paddingVertical: 6,
    borderTopWidth: 1,
    borderTopColor: Colors.mud,
    flexDirection: 'row',
    alignItems: 'center',
  },
  approxText: {
    flex: 1,
    fontSize: 10,
    color: Colors.forestDark,
    textAlign: 'center',
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  approxDismissBtn: {
    position: 'absolute',
    top: 0, bottom: 0, right: 0,
    width: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  approxDismissText: {
    fontSize: 14,
    fontWeight: '800',
    color: Colors.forestDark,
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: Colors.overlay,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 20,
  },
});
