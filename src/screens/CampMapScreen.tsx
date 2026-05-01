/**
 * CampMapScreen — Mapbox campground map with color-coded markers.
 *
 * Phase 5A implementation:
 *   - Renders marylandCampgrounds.ts with color-coded markers by type
 *   - Tap marker → detail panel (amenities, reservation URL, Directions,
 *     Plan Trip, Close). "Plan Trip" hands the campground off to the Trip
 *     Planner tab with the record pre-selected — see route param
 *     `campgroundId` on CampTripPlannerScreen.
 *   - Filter chips: type, amenities (water/toilet/shower), ADA
 *   - Mapbox + location-aware camera centering
 *
 * Reverse handoff: CampMapScreen accepts a `focusCampgroundId` route param.
 * When set (typically from Trip Planner → "View on Map"), the screen opens
 * the detail panel for that campground and centers the camera on it.
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
import MapboxGL from '@rnmapbox/maps';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { useLocation } from '../hooks/useLocation';
import DisclaimerBanner from '../components/common/DisclaimerBanner';
import UserWaypointLayer from '../components/map/UserWaypointLayer';
import UserMarkupLayer from '../components/map/UserMarkupLayer';
import ZoomIcon from '../components/map/ZoomIcon';
import OnboardingTourGate from '../components/OnboardingTourGate';
import { useMapLongPressWaypoint } from '../hooks/useMapLongPressWaypoint';
import Colors from '../theme/colors';
import { MARYLAND_CAMPGROUNDS } from '../data/marylandCampgrounds';
import type { Campground, CampgroundType } from '../types/camp';
import { MAPBOX_ACCESS_TOKEN } from '../config';

/**
 * Route params for CampMapScreen. `focusCampgroundId`, when present, opens
 * the detail panel for that campground and centers the camera on it. Used
 * by CampTripPlannerScreen's "View on Map" action.
 */
type CampMapRouteParams = {
  focusCampgroundId?: string;
};

MapboxGL.setAccessToken(MAPBOX_ACCESS_TOKEN);

const BALTIMORE_CENTER: [number, number] = [-76.6122, 39.2904];
const DEFAULT_ZOOM = 7.5;

type TypeFilter = CampgroundType | 'all';
interface AmenityFilters {
  potableWater: boolean;
  flushToilets: boolean;
  shower: boolean;
  ada: boolean;
}

interface SelectedCampground {
  id: string;
  name: string;
  lat: number;
  lon: number;
  details: Campground;
}

const TYPE_COLORS: Record<CampgroundType, string> = {
  state_park: '#4A6741',
  state_forest: '#2D6B4A',
  national_park: '#1E3A2B',
  private: '#8B6914',
  primitive: '#7A5C3E',
  group: '#8B7355',
  equestrian: '#C4A882',
  backpacker: '#6B5C3E',
};

export default function CampMapScreen() {
  const cameraRef = useRef<MapboxGL.Camera>(null);
  const navigation = useNavigation<any>();
  const onLongPressMap = useMapLongPressWaypoint({
    mode: 'camp',
    navigate: (screen, params) => navigation.navigate(screen, params),
  });
  const openWaypointEdit = useCallback(
    (waypointId: string) =>
      navigation.navigate('WaypointEdit', { mode: 'camp', waypointId }),
    [navigation],
  );
  const openMarkupEdit = useCallback(
    (markupId: string) =>
      navigation.navigate('MarkupEdit', { mode: 'camp', markupId }),
    [navigation],
  );
  const openPersonalHub = useCallback(
    () => navigation.navigate('PersonalHub', { mode: 'camp' }),
    [navigation],
  );
  const route = useRoute<RouteProp<Record<string, CampMapRouteParams>, string>>();
  const focusCampgroundId = route.params?.focusCampgroundId;
  const { location, loading: locationLoading } = useLocation();

  const [selected, setSelected] = useState<SelectedCampground | null>(null);
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('all');
  const [amenityFilters, setAmenityFilters] = useState<AmenityFilters>({
    potableWater: false,
    flushToilets: false,
    shower: false,
    ada: false,
  });
  const [mapStyle, setMapStyle] = useState<'topo' | 'satellite'>('topo');
  // Per-session dismissal of the DNR disclaimer — user can reclaim vertical
  // space at the bottom of the map. Re-shown on next cold start.
  const [disclaimerDismissed, setDisclaimerDismissed] = useState(false);

  // Current camera zoom — kept in sync via onCameraChanged so the +/- buttons
  // can apply a correct delta from wherever the user currently is. Previous
  // impl read `_centerCoordinate[2]` which is always undefined (that slot is
  // lng/lat, not zoom) so +/- snapped to DEFAULT_ZOOM±1.
  const [currentZoom, setCurrentZoom] = useState<number>(DEFAULT_ZOOM);

  // 2026-04-30 (V2.4 audit): same drag-killing bug as Hike + Fish. The
  // previous version had `[location, focusCampgroundId]` as the dep
  // and called setCamera every time location ticked — making the map
  // appear locked to the user's current position. Fix mirrors the
  // other maps: one-shot ref guard so initial centering runs exactly
  // once when location first becomes available. Recenter button
  // remains the canonical "go back to me" affordance.
  //
  // Center on user location on mount (only when no focus param is pending —
  // focus takes priority so the camera doesn't jump away from the handoff target).
  // We also gate on the Maryland bbox so the iOS Simulator's Cupertino default
  // doesn't fly the camera to California on first open.
  const initialCenterApplied = useRef(false);
  useEffect(() => {
    if (initialCenterApplied.current) return;
    if (focusCampgroundId) return;
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
      initialCenterApplied.current = true;
    }
  }, [location, focusCampgroundId]);

  // Handoff from Trip Planner: when focusCampgroundId arrives, open the
  // detail panel for that campground and center the camera on it. The param
  // is cleared after consumption so a tab re-focus doesn't re-fire this.
  useEffect(() => {
    if (!focusCampgroundId) return;
    const campground = MARYLAND_CAMPGROUNDS.find((cg) => cg.id === focusCampgroundId);
    if (!campground) return;
    setSelected({
      id: campground.id,
      name: campground.name,
      lat: campground.lat,
      lon: campground.lon,
      details: campground,
    });
    if (cameraRef.current) {
      cameraRef.current.setCamera({
        centerCoordinate: [campground.lon, campground.lat],
        zoomLevel: 11,
        animationDuration: 800,
      });
    }
    // Clear the param so back-nav doesn't re-fire.
    navigation.setParams({ focusCampgroundId: undefined });
  }, [focusCampgroundId, navigation]);

  // Filter campgrounds by type and amenities
  const filteredCampgrounds = useMemo(() => {
    return MARYLAND_CAMPGROUNDS.filter((cg) => {
      if (typeFilter !== 'all' && cg.type !== typeFilter) return false;
      if (amenityFilters.potableWater && !cg.amenities.potableWater) return false;
      if (amenityFilters.flushToilets && !cg.amenities.flushToilets) return false;
      if (amenityFilters.shower && !cg.amenities.shower) return false;
      if (amenityFilters.ada && !cg.amenities.ada) return false;
      return true;
    });
  }, [typeFilter, amenityFilters]);

  // Campgrounds GeoJSON
  const campgroundsGeoJSON = useMemo(() => ({
    type: 'FeatureCollection' as const,
    features: filteredCampgrounds.map((cg) => ({
      type: 'Feature' as const,
      id: cg.id,
      properties: {
        name: cg.name,
        type: cg.type,
        park: cg.park,
      },
      geometry: {
        type: 'Point' as const,
        coordinates: [cg.lon, cg.lat],
      },
    })),
  }), [filteredCampgrounds]);

  const handleMapPress = useCallback(() => {
    setSelected(null);
  }, []);

  const handleCampgroundPress = useCallback((event: any) => {
    try {
      const feature = event?.features?.[0];
      if (feature?.properties?.name && feature?.geometry?.coordinates) {
        const [lon, lat] = feature.geometry.coordinates;
        const campground = MARYLAND_CAMPGROUNDS.find((cg) => cg.id === feature.id);
        if (campground) {
          setSelected({
            id: feature.id || '',
            name: feature.properties.name,
            lat,
            lon,
            details: campground,
          });
        }
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

  const openDirections = useCallback(() => {
    if (selected) {
      const url = `http://maps.apple.com/?daddr=${selected.lat},${selected.lon}&q=${encodeURIComponent(selected.name)}`;
      Linking.openURL(url).catch(() => {});
    }
  }, [selected]);

  /**
   * Hand the currently-selected campground off to the Trip Planner tab.
   * The param `campgroundId` is consumed by CampTripPlannerScreen on focus:
   * it pre-selects the campground so the user doesn't have to re-search.
   */
  const planTripFromSelected = useCallback(() => {
    if (!selected) return;
    navigation.navigate('CampTripPlannerTab', {
      screen: 'CampTripPlannerMain',
      params: { campgroundId: selected.id },
    });
  }, [navigation, selected]);

  const toggleAmenity = useCallback((key: keyof AmenityFilters) => {
    setAmenityFilters((prev) => ({ ...prev, [key]: !prev[key] }));
  }, []);

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

        {/* Campgrounds */}
        <MapboxGL.ShapeSource id="campgrounds" shape={campgroundsGeoJSON as any} onPress={handleCampgroundPress}>
          <MapboxGL.CircleLayer
            id="campgroundMarkers"
            style={{
              circleColor: ['match', ['get', 'type'], 'state_park', '#4A6741', 'state_forest', '#2D6B4A', 'private', '#8B6914', 'group', '#8B7355', 'backpacker', '#6B5C3E', '#7A5C3E'],
              circleRadius: ['interpolate', ['linear'], ['zoom'], 8, 4, 12, 7],
              circleOpacity: 0.85,
              circleStrokeWidth: 2,
              circleStrokeColor: '#FFFFFF',
            }}
          />
        </MapboxGL.ShapeSource>

        {/* ── Personal waypoints (Phase A.1b) ──
            User-created pins for camp mode (tent / firepit / water). */}
        <UserWaypointLayer mode="camp" onWaypointPress={openWaypointEdit} />
        <UserMarkupLayer mode="camp" onMarkupPress={openMarkupEdit} />
      </MapboxGL.MapView>

      <View style={styles.statsBadge}>
        <Text style={styles.statsText}>{filteredCampgrounds.length} campgrounds</Text>
        <Text style={styles.statsSubtext}>Maryland Camping Map</Text>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.filterBar}
        contentContainerStyle={styles.filterBarContent}
      >
        {(['all', 'state_park', 'state_forest', 'private', 'backpacker'] as const).map((type) => (
          <TouchableOpacity
            key={type}
            style={[styles.filterChip, typeFilter === type && styles.filterChipActive]}
            onPress={() => setTypeFilter(type)}
            activeOpacity={0.7}
          >
            <Text
              style={[styles.filterLabel, typeFilter === type && styles.filterLabelActive]}
            >
              {type === 'all' ? 'All' : type === 'state_park' ? 'State Park' : type === 'state_forest' ? 'Forest' : type === 'private' ? 'Private' : 'Backpacker'}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.amenityBar}
        contentContainerStyle={styles.amenityBarContent}
      >
        {(['potableWater', 'flushToilets', 'shower', 'ada'] as const).map((amenity) => (
          <TouchableOpacity
            key={amenity}
            style={[styles.amenityChip, amenityFilters[amenity] && styles.amenityChipActive]}
            onPress={() => toggleAmenity(amenity)}
            activeOpacity={0.7}
          >
            <Text
              style={[styles.amenityLabel, amenityFilters[amenity] && styles.amenityLabelActive]}
            >
              {amenity === 'potableWater' ? 'Water' : amenity === 'flushToilets' ? 'Toilet' : amenity === 'shower' ? 'Shower' : 'ADA'}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

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

      {/* 2026-04-26 (zoom relocation): zoom buttons split out of right-side
          controls and moved to bottom-right just above the detail panel. */}
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

      {selected ? (
        <View style={styles.detailPanel}>
          <View style={styles.detailHeader}>
            <Text style={styles.detailName} numberOfLines={2}>
              {selected.name}
            </Text>
            <TouchableOpacity onPress={() => setSelected(null)}>
              <Text style={styles.detailClose}>{'\u2715'}</Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.detailField}>
            <Text style={styles.detailFieldLabel}>Type: </Text>
            {selected.details.type.replace(/_/g, ' ').charAt(0).toUpperCase() + selected.details.type.replace(/_/g, ' ').slice(1)}
          </Text>

          {selected.details.amenities.potableWater && (
            <Text style={styles.detailField}>
              <Text style={styles.detailFieldLabel}>Water: </Text>Potable
            </Text>
          )}

          {selected.details.amenities.flushToilets && (
            <Text style={styles.detailField}>
              <Text style={styles.detailFieldLabel}>Toilets: </Text>Flush
            </Text>
          )}

          {selected.details.amenities.shower && (
            <Text style={styles.detailField}>
              <Text style={styles.detailFieldLabel}>Shower: </Text>Yes
            </Text>
          )}

          {selected.details.siteCount && (
            <Text style={styles.detailField}>
              <Text style={styles.detailFieldLabel}>Sites: </Text>
              {selected.details.siteCount}
            </Text>
          )}

          {selected.details.amenities.ada && (
            <Text style={styles.detailField}>
              <Text style={styles.detailFieldLabel}>ADA: </Text>Accessible
            </Text>
          )}

          {selected.details.season.notes && (
            <Text style={styles.detailField}>
              <Text style={styles.detailFieldLabel}>Season: </Text>
              {selected.details.season.notes}
            </Text>
          )}

          {/* 2026-04-29: "What we use here" CTA — taps deep-link into AI tab
              pre-populated with a camp-specific gear query. AI response splices
              the Amazon affiliate footer via augmentCampWithGearSuggestions
              in campingChatKnowledge. End-to-end monetization mirroring
              Hunt + Fish + Hike patterns. */}
          {(() => {
            const type = selected.details.type;
            const isBackpacker = type === 'backpacker' || type === 'primitive';
            const query = isBackpacker
              ? `Best backpacking gear for ${selected.name}?`
              : `Car camping gear list for ${selected.name}?`;
            return (
              <TouchableOpacity
                accessibilityRole="button"
                accessibilityLabel={`Ask AI: ${query}`}
                onPress={() => {
                  navigation.navigate('CampAITab', {
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

          <View style={styles.detailButtonRow}>
            <TouchableOpacity
              style={[styles.detailBtn, { backgroundColor: Colors.moss }]}
              onPress={openDirections}
              activeOpacity={0.8}
            >
              <Text style={styles.detailBtnText}>Directions</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.detailBtn, { backgroundColor: Colors.mdGold }]}
              onPress={planTripFromSelected}
              activeOpacity={0.8}
            >
              <Text style={[styles.detailBtnText, { color: Colors.mdBlack }]}>Plan Trip</Text>
            </TouchableOpacity>
            {selected.details.reservationUrl && (
              <TouchableOpacity
                style={[styles.detailBtn, { backgroundColor: Colors.oak }]}
                onPress={() => Linking.openURL(selected.details.reservationUrl!).catch(() => {})}
                activeOpacity={0.8}
              >
                <Text style={styles.detailBtnText}>Reserve</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              style={[styles.detailBtn, { backgroundColor: Colors.mud }]}
              onPress={() => setSelected(null)}
              activeOpacity={0.8}
            >
              <Text style={styles.detailBtnText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : null}

      {locationLoading ? (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color={Colors.moss} />
        </View>
      ) : null}

      <DisclaimerBanner
        dismissed={disclaimerDismissed}
        onDismiss={() => setDisclaimerDismissed(true)}
      />

      <OnboardingTourGate mode="camp" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  map: { flex: 1 },
  // 2026-04-30 (V2.4 audit): pushed from top:12 to top:46 because the
  // Mapbox scale ruler renders at top-left by default and was
  // overlapping the badge text. Same fix as Hunt + Fish + Hike maps.
  statsBadge: {
    position: 'absolute',
    top: 46,
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
  amenityBar: { position: 'absolute', top: 110, left: 0, right: 0, zIndex: 10, maxHeight: 44 },
  amenityBarContent: { paddingHorizontal: 12, gap: 8 },
  amenityChip: {
    backgroundColor: Colors.overlay,
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: Colors.mud,
  },
  amenityChipActive: {
    backgroundColor: Colors.oak,
    borderColor: Colors.oak,
  },
  amenityLabel: { fontSize: 10, fontWeight: '600', color: Colors.textSecondary },
  amenityLabelActive: { color: Colors.textPrimary },
  // 2026-04-26 (zoom relocation): SAT/ME/⌖ moved to top: 200; zoom split
  // into zoomControls anchored just above the bottom detail panel.
  controlsColumn: {
    position: 'absolute',
    right: 12,
    top: 200,
    zIndex: 10,
    gap: 6,
  },
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
    bottom: 42,
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
  detailButtonRow: { flexDirection: 'row', gap: 6, marginTop: 12 },
  detailBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  detailBtnText: { fontSize: 12, fontWeight: '700', color: Colors.textPrimary },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: Colors.overlay,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 20,
  },
});
