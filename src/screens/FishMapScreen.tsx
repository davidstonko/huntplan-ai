/**
 * FishMapScreen — Maryland fishing map backed by the 579-site DNR Public Angler Access dataset.
 *
 * Replaces the old barriers/dams dataset (which was mis-sourced) with the
 * correct MD DNR Public_View_Angler_Access_Sites_ feature layer.
 *
 * Filter categories are derived from the per-site attributes:
 *   - Boat Ramp (hasRamp)
 *   - Soft Launch (hasSoftLaunch)
 *   - Shore Only (no ramp, no soft launch)
 *   - Trout Waters (fishTypes contains "Trout")
 *   - Put & Take (specialReg contains "Put & Take")
 *
 * Migrated 2026-04-17 as part of Path A (V2.2.0 resubmission).
 */

import React, { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Alert,
  Linking,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import MapboxGL from '@rnmapbox/maps';
import { useNavigation } from '@react-navigation/native';
import { useLocation } from '../hooks/useLocation';
import { isInMaryland } from '../utils/validateCoord';
import DisclaimerBanner from '../components/common/DisclaimerBanner';
import FilterPicker from '../components/common/FilterPicker';
import UserWaypointLayer from '../components/map/UserWaypointLayer';
import UserMarkupLayer from '../components/map/UserMarkupLayer';
import OnboardingTourGate from '../components/OnboardingTourGate';
import { useMapLongPressWaypoint } from '../hooks/useMapLongPressWaypoint';
import Colors from '../theme/colors';
import { MAP_STYLE_OUTDOORS, MAP_STYLE_SATELLITE } from '../constants/mapStyles';
import ZoomIcon from '../components/map/ZoomIcon';
import { useOfflineMaps } from '../hooks/useOfflineMaps';
import OfflineMapsModal from '../components/map/OfflineMapsModal';
import GaugeLayer from '../components/map/GaugeLayer';
import TroutWatershedLayer from '../components/map/TroutWatershedLayer';
import GaugeDetailCard from '../components/map/GaugeDetailCard';
import { StreamGauge } from '../services/streamGaugeService';
import {
  MARYLAND_ANGLER_ACCESS_SITES,
  type AnglerAccessSite,
} from '../data/marylandAnglerAccessSites';
import { TIDAL_BOUNDARY } from '../data/tidalBoundary';
import { MARYLAND_RIVERS } from '../data/marylandRivers';
import {
  MARYLAND_FISHING_HOTSPOTS,
  type FishingHotspot,
} from '../data/marylandFishingHotspots';
import { servicesForWater } from '../data/marylandLocalServices';
import { isValidCoord } from '../utils/validateCoord';
import { MAPBOX_ACCESS_TOKEN } from '../config';

MapboxGL.setAccessToken(MAPBOX_ACCESS_TOKEN);

const BALTIMORE_CENTER: [number, number] = [-76.6122, 39.2904];
const DEFAULT_ZOOM = 7.5;

type CategoryKey = 'ramp' | 'soft' | 'shore' | 'trout' | 'putTake';

interface CategoryDef {
  key: CategoryKey;
  code: string;
  label: string;
  color: string;
  matches: (s: AnglerAccessSite) => boolean;
}

// Short letter codes replace emoji glyphs for the Build 9 brand/professionalism
// pass. Codes read as angler shorthand (Ramp, Soft-launch, Shore, Trout, Put & Take).
// 2026-04-26 (fork merge): labels compacted to single words so 3 chips
// fit within an iPhone 17 Pro screen width without horizontal-scroll
// clipping. The colored badge code carries the full taxonomy.
const CATEGORIES: CategoryDef[] = [
  {
    key: 'ramp',
    code: 'RMP',
    label: 'Ramp',
    color: '#0277BD',
    matches: (s) => s.hasRamp,
  },
  {
    key: 'soft',
    code: 'SFT',
    label: 'Soft',
    color: '#26A69A',
    matches: (s) => s.hasSoftLaunch,
  },
  {
    key: 'shore',
    code: 'SHR',
    label: 'Shore',
    color: '#8B7355',
    matches: (s) => !s.hasRamp && !s.hasSoftLaunch,
  },
  {
    key: 'trout',
    code: 'TRT',
    label: 'Trout',
    color: '#C85A3E',
    matches: (s) => /trout/i.test(s.fishTypes),
  },
  {
    key: 'putTake',
    code: 'P&T',
    label: 'Put & Take',
    color: '#E8AA00',
    matches: (s) => /put\s*&?\s*take/i.test(s.specialReg),
  },
];

/**
 * For each site, decide which primary color to use on the map.
 * Priority: ramp > soft > trout > put & take > shore.
 */
function primaryColor(site: AnglerAccessSite): string {
  if (site.hasRamp) return '#0277BD';
  if (site.hasSoftLaunch) return '#26A69A';
  if (/trout/i.test(site.fishTypes)) return '#C85A3E';
  if (/put\s*&?\s*take/i.test(site.specialReg)) return '#E8AA00';
  return '#8B7355';
}

export default function FishMapScreen() {
  const navigation = useNavigation<any>();
  const onLongPressMap = useMapLongPressWaypoint({
    mode: 'fish',
    navigate: (screen, params) => navigation.navigate(screen, params),
  });
  const openWaypointEdit = useCallback(
    (waypointId: string) =>
      navigation.navigate('WaypointEdit', { mode: 'fish', waypointId }),
    [navigation],
  );
  const openMarkupEdit = useCallback(
    (markupId: string) =>
      navigation.navigate('MarkupEdit', { mode: 'fish', markupId }),
    [navigation],
  );
  const openPersonalHub = useCallback(
    () => navigation.navigate('PersonalHub', { mode: 'fish' }),
    [navigation],
  );
  const insets = useSafeAreaInsets();
  const cameraRef = useRef<MapboxGL.Camera>(null);
  const offlineMaps = useOfflineMaps();
  const [offlineOpen, setOfflineOpen] = useState(false);
  const [showGauges, setShowGauges] = useState(false);
  const [selectedGauge, setSelectedGauge] = useState<StreamGauge | null>(null);
  const { location, loading: locationLoading } = useLocation();
  const [selected, setSelected] = useState<AnglerAccessSite | null>(null);
  const [activeFilters, setActiveFilters] = useState<Set<CategoryKey>>(
    new Set(['ramp', 'soft', 'shore', 'trout', 'putTake']),
  );
  const [showLegend, setShowLegend] = useState(false);
  const [mapStyle, setMapStyle] = useState<'topo' | 'satellite'>('topo');
  const [showTidalBoundary, setShowTidalBoundary] = useState(true);
  // Search query parallels the Hunt MapScreen pattern (MapScreen.tsx:678 area).
  // Substring-matches `name` and `waterbody`. Added 2026-04-17 late-evening to
  // close §17B Gap (a) in the app-audit skill.
  const [searchQuery, setSearchQuery] = useState('');
  // Per-session dismissal of the DNR disclaimer banner — frees up vertical
  // space at the bottom of the map. Re-presents on next cold start.
  const [disclaimerDismissed, setDisclaimerDismissed] = useState(false);
  // Toggle for Maryland rivers overlay (currently empty until Overpass API
  // becomes available; see src/data/marylandRivers.ts for ingest status).
  const [showRivers, setShowRivers] = useState(false);
  // 2026-04-26: Toggle for the curated fishing-hotspots layer
  // (marylandFishingHotspots.ts — 48 named in-water spots with citation).
  const [showHotspots, setShowHotspots] = useState(true);
  // Wild-trout watershed overlay (native brook / wild brown / wild rainbow),
  // bundled + offline. Default off so it doesn't clutter the default view.
  const [showTroutWaters, setShowTroutWaters] = useState(false);
  const [selectedHotspotId, setSelectedHotspotId] = useState<string | null>(null);

  // Current camera zoom — kept in sync via onCameraChanged so the +/- buttons
  // can apply a correct delta from wherever the user currently is.
  const [currentZoom, setCurrentZoom] = useState<number>(DEFAULT_ZOOM);

  // 2026-04-30 (V2.4 audit fix): same bug as HikeMapScreen — the
  // previous version of this effect listed `[location]` as the
  // dependency, so every GPS tick re-applied `setCamera` and reset any
  // user pan. Result: the map appeared to be locked, only zoom worked.
  // Fix mirrors HikeMapScreen — guard with a one-shot ref so initial
  // centering happens once on first available location, and
  // subsequent updates do nothing. The recenter button at the bottom
  // remains the canonical "go back to my location" affordance.
  //
  // Only auto-recenter on the user's GPS when they're physically inside
  // Maryland. On iOS Simulator the default device location is Cupertino,
  // which would otherwise fly the map to the Bay Area and make the app
  // look broken on first open.
  const initialCenterApplied = useRef(false);
  useEffect(() => {
    if (initialCenterApplied.current) return;
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
  }, [location]);

  const toggleFilter = useCallback((cat: CategoryKey) => {
    setActiveFilters((prev) => {
      const next = new Set(prev);
      if (next.has(cat)) next.delete(cat);
      else next.add(cat);
      return next;
    });
  }, []);

  const pointGeoJSON = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const features = MARYLAND_ANGLER_ACCESS_SITES.filter((s) => {
      if (!isValidCoord(s.lat, s.lng)) return false;
      // A site is included if ANY active filter matches
      const passesFilter = CATEGORIES.some(
        (c) => activeFilters.has(c.key) && c.matches(s),
      );
      if (!passesFilter) return false;
      // Substring search on name + waterbody when searchQuery is non-empty.
      if (q.length === 0) return true;
      return (
        s.name.toLowerCase().includes(q) ||
        (s.waterbody && s.waterbody.toLowerCase().includes(q))
      );
    }).map((s) => ({
      type: 'Feature' as const,
      id: s.id,
      properties: {
        id: s.id,
        name: s.name,
        color: primaryColor(s),
        hasRamp: s.hasRamp,
        hasSoftLaunch: s.hasSoftLaunch,
        fishTypes: s.fishTypes,
      },
      geometry: {
        type: 'Point' as const,
        coordinates: [s.lng, s.lat],
      },
    }));
    return { type: 'FeatureCollection' as const, features };
  }, [activeFilters, searchQuery]);

  const filteredCount = pointGeoJSON.features.length;

  /**
   * Optional LineString overlay — only rendered for sites whose `fishableReach`
   * was populated. A fisherman cares about the stretch of the RIVER that is
   * legally and practically fishable, not the surrounding park polygon. Until
   * the reach backfill lands (tracked in audits/2026-04-17-evening-comprehensive.md §B),
   * this collection will be empty and the LineLayer renders nothing.
   */
  const fishableReachGeoJSON = useMemo(() => {
    const activeSet = new Set(
      MARYLAND_ANGLER_ACCESS_SITES.filter((s) =>
        CATEGORIES.some((c) => activeFilters.has(c.key) && c.matches(s)),
      ).map((s) => s.id),
    );
    const features = MARYLAND_ANGLER_ACCESS_SITES
      .filter((s) => s.fishableReach && activeSet.has(s.id))
      .map((s) => ({
        type: 'Feature' as const,
        id: `reach_${s.id}`,
        properties: {
          id: s.id,
          name: s.name,
          color: primaryColor(s),
        },
        geometry: s.fishableReach as any,
      }));
    return { type: 'FeatureCollection' as const, features };
  }, [activeFilters]);

  /**
   * Tidal/NonTidal boundary overlay — MD DNR regulatory boundary determining
   * which fishing license structure and regulations apply (tidal = saltwater rules,
   * non-tidal = freshwater rules). ~100 segments from the Tidal_NonTidal_view service.
   * Toggled by showTidalBoundary state (default: on, anglers must see this).
   */
  const tidalBoundaryGeoJSON = useMemo(() => {
    if (!showTidalBoundary) {
      return { type: 'FeatureCollection' as const, features: [] };
    }
    const features = TIDAL_BOUNDARY.map((segment) => ({
      type: 'Feature' as const,
      id: segment.id,
      properties: {
        id: segment.id,
        description: segment.description,
      },
      geometry: {
        type: 'LineString' as const,
        coordinates: segment.coordinates,
      },
    }));
    return { type: 'FeatureCollection' as const, features };
  }, [showTidalBoundary]);

  /**
   * Maryland rivers overlay — named rivers and streams from MD iMAP
   * Hydrography (Rivers and Streams - Generalized). Each river is emitted
   * as a MultiLineString so Mapbox renders its segments as a single
   * feature without stitching artifacts at tributary junctions. Toggled
   * by showRivers state. See src/data/marylandRivers.ts for ingest
   * provenance (pulled 2026-04-20 from mdgeodata.md.gov).
   */
  const riversGeoJSON = useMemo(() => {
    if (!showRivers || MARYLAND_RIVERS.length === 0) {
      return { type: 'FeatureCollection' as const, features: [] };
    }
    const features = MARYLAND_RIVERS.map((river) => ({
      type: 'Feature' as const,
      id: river.id,
      properties: {
        id: river.id,
        name: river.name,
        source: river.source,
        lengthMi: river.lengthMi,
        isApproximate: river.isApproximate,
      },
      geometry: {
        type: 'MultiLineString' as const,
        coordinates: river.coordinates,
      },
    }));
    return { type: 'FeatureCollection' as const, features };
  }, [showRivers]);

  /**
   * Curated fishing-hotspots GeoJSON. 48 named in-water spots from
   * marylandFishingHotspots.ts (reservoirs, Bay structure, trout pools).
   * Color is derived from the waterClass field so each class renders in a
   * distinct hue. 2026-04-26.
   */
  const hotspotsGeoJSON = useMemo(() => {
    if (!showHotspots) {
      return { type: 'FeatureCollection' as const, features: [] };
    }
    const colorByClass: Record<string, string> = {
      reservoir: '#26A69A',           // teal
      'tidal-bay': '#1976D2',         // bay blue
      'tidal-river': '#5C6BC0',       // indigo
      'freshwater-river': '#3949AB',  // deep indigo
      'trout-stream': '#E91E63',      // pink (matches trout-stocking convention)
      pond: '#43A047',                // green
    };
    const features = MARYLAND_FISHING_HOTSPOTS.map((h: FishingHotspot) => ({
      type: 'Feature' as const,
      id: h.id,
      properties: {
        id: h.id,
        name: h.name,
        waterbody: h.waterbody,
        kind: h.kind,
        waterClass: h.waterClass,
        primary: h.primarySpecies.join(', '),
        color: colorByClass[h.waterClass] || '#26A69A',
        isStretch: h.isStretch,
      },
      geometry: {
        type: 'Point' as const,
        coordinates: [h.lng, h.lat],
      },
    }));
    return { type: 'FeatureCollection' as const, features };
  }, [showHotspots]);

  /** Lookup for the detail-sheet renderer. */
  const selectedHotspot = useMemo(
    () => MARYLAND_FISHING_HOTSPOTS.find((h) => h.id === selectedHotspotId) || null,
    [selectedHotspotId],
  );

  const handleMapPress = useCallback(() => {
    setSelected(null);
  }, []);

  const handleMarkerPress = useCallback((event: any) => {
    try {
      const feature = event?.features?.[0];
      if (feature?.properties?.id) {
        const site = MARYLAND_ANGLER_ACCESS_SITES.find((s) => s.id === feature.properties.id);
        if (site) setSelected(site);
      }
    } catch {
      // swallow
    }
  }, []);

  const centerOnLocation = useCallback(() => {
    if (location && cameraRef.current && isInMaryland(location.longitude, location.latitude)) {
      cameraRef.current.setCamera({
        centerCoordinate: [location.longitude, location.latitude],
        zoomLevel: 12,
        animationDuration: 800,
      });
    } else {
      Alert.alert(
        'Location Services',
        'Enable location access in Settings > Privacy > Location Services to see your position on the map.',
        [
          { text: 'Open Settings', onPress: () => Linking.openURL('app-settings:') },
          { text: 'OK', style: 'cancel' },
        ],
      );
    }
  }, [location]);

  // Track current zoom via onCameraChanged so +/- buttons apply a delta to the
  // actual current camera zoom. Previous impl read `_centerCoordinate[2]`
  // which is always undefined (that slot is lng/lat, not zoom) — so +/- snapped
  // to DEFAULT_ZOOM±1 regardless of where the user had zoomed to.
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

  const openWeather = useCallback(
    (site: AnglerAccessSite) => {
      navigation.navigate('Weather', {
        lat: site.lat,
        lon: site.lng,
        label: site.name,
      });
    },
    [navigation],
  );

  const openDirections = useCallback((site: AnglerAccessSite) => {
    // Prefer precise parking coordinate when available, else fall back to the
    // access-point coordinate (the marker itself). Some access points drop
    // users mid-river; parkingLat/Lng solves that when populated.
    const lat = typeof site.parkingLat === 'number' ? site.parkingLat : site.lat;
    const lng = typeof site.parkingLng === 'number' ? site.parkingLng : site.lng;
    const url = `http://maps.apple.com/?daddr=${lat},${lng}&q=${encodeURIComponent(site.name)}`;
    Linking.openURL(url).catch(() => Alert.alert('Unable to open Maps'));
  }, []);

  return (
    <View style={styles.container}>
      <MapboxGL.MapView
        style={styles.map}
        styleURL={
          mapStyle === 'satellite' ? MAP_STYLE_SATELLITE : MAP_STYLE_OUTDOORS
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
          maxZoomLevel={18}
        />

        <TroutWatershedLayer
          enabled={showTroutWaters}
          onSelect={({ label, link }) =>
            Alert.alert(
              'Wild Trout Waters',
              label,
              link
                ? [
                    {
                      text: 'DNR info',
                      onPress: () => Linking.openURL(link).catch(() => {}),
                    },
                    { text: 'Close', style: 'cancel' },
                  ]
                : [{ text: 'OK' }],
            )
          }
        />

        <GaugeLayer enabled={showGauges} onSelect={setSelectedGauge} />

        <MapboxGL.ShapeSource
          id="fishPoints"
          shape={pointGeoJSON as any}
          onPress={handleMarkerPress}
          cluster={true}
          clusterRadius={40}
          clusterMaxZoomLevel={12}
        >
          <MapboxGL.CircleLayer
            id="fishClusters"
            filter={['has', 'point_count']}
            style={{
              circleColor: '#0277BD',
              circleRadius: ['step', ['get', 'point_count'], 16, 20, 20, 50, 24],
              circleOpacity: 0.85,
              circleStrokeWidth: 2,
              circleStrokeColor: '#FFFFFF',
            }}
          />
          <MapboxGL.SymbolLayer
            id="fishClusterCount"
            filter={['has', 'point_count']}
            style={{
              textField: ['get', 'point_count_abbreviated'],
              textSize: 12,
              textColor: '#FFFFFF',
              textFont: ['DIN Pro Bold', 'Arial Unicode MS Bold'],
            }}
          />

          <MapboxGL.CircleLayer
            id="fishMarkers"
            filter={['!', ['has', 'point_count']]}
            style={{
              circleColor: ['get', 'color'],
              circleRadius: ['interpolate', ['linear'], ['zoom'], 6, 3, 10, 5, 14, 8],
              circleOpacity: 0.9,
              circleStrokeWidth: 1.5,
              circleStrokeColor: '#FFFFFF',
            }}
          />
        </MapboxGL.ShapeSource>

        {/* ── Fishable-reach overlay ── */}
        {/* Dashed amber line showing the legally fishable stretch of rivers/creeks.
            Hidden until the DNR reach data lands (see audit §B). Rendering an
            empty FeatureCollection is a no-op for Mapbox GL. */}
        <MapboxGL.ShapeSource id="fishableReach" shape={fishableReachGeoJSON as any}>
          <MapboxGL.LineLayer
            id="fishableReachLine"
            style={{
              lineColor: '#F3D48B',
              lineWidth: ['interpolate', ['linear'], ['zoom'], 8, 1.5, 12, 3, 16, 5],
              lineOpacity: 0.85,
              lineDasharray: [4, 3],
              lineJoin: 'round',
              lineCap: 'round',
            }}
          />
        </MapboxGL.ShapeSource>

        {/* ── Maryland rivers overlay ── */}
        {/* Blue solid lines for major named rivers (main stem only). Ingestion
            status as of 2026-04-20: all sources (Overpass, USGS NHD, MD DNR)
            were blocked/unreachable. Array is empty; layer renders nothing.
            Once Overpass or USGS NHD becomes available, rivers will auto-populate
            with no code changes. Approximate rivers shown as dashed. */}
        <MapboxGL.ShapeSource id="rivers" shape={riversGeoJSON as any}>
          <MapboxGL.LineLayer
            id="riverLinesSolid"
            filter={['!', ['get', 'isApproximate']]}
            style={{
              lineColor: '#1976D2',
              lineWidth: ['interpolate', ['linear'], ['zoom'], 6, 1, 8, 1.5, 12, 2.5, 16, 4],
              lineOpacity: 0.7,
              lineJoin: 'round',
              lineCap: 'round',
            }}
          />
          <MapboxGL.LineLayer
            id="riverLinesDashed"
            filter={['get', 'isApproximate']}
            style={{
              lineColor: '#1976D2',
              lineWidth: ['interpolate', ['linear'], ['zoom'], 6, 1, 8, 1.5, 12, 2.5, 16, 4],
              lineOpacity: 0.5,
              lineDasharray: [3, 2],
              lineJoin: 'round',
              lineCap: 'round',
            }}
          />
        </MapboxGL.ShapeSource>

        {/* ── Tidal/NonTidal boundary overlay ── */}
        {/* Orange dashed line showing the regulatory boundary between tidal (saltwater)
            and non-tidal (freshwater) waters. Anglers on the wrong side can violate regs.
            100 segments from MD DNR Tidal_NonTidal_view service. Togglable via state. */}
        <MapboxGL.ShapeSource id="tidalBoundary" shape={tidalBoundaryGeoJSON as any}>
          <MapboxGL.LineLayer
            id="tidalBoundaryLine"
            style={{
              lineColor: '#D4913D',
              lineWidth: ['interpolate', ['linear'], ['zoom'], 8, 1.5, 12, 2.5, 16, 4],
              lineOpacity: 0.9,
              lineDasharray: [5, 4],
              lineJoin: 'round',
              lineCap: 'round',
            }}
          />
        </MapboxGL.ShapeSource>

        {/* ── Curated fishing hotspots (2026-04-26) ──
            48 named in-water spots from marylandFishingHotspots.ts.
            Solid colored circle with white halo so they stand out from
            the angler-access point markers. Tap to open detail sheet. */}
        {showHotspots && (
          <MapboxGL.ShapeSource
            id="fishingHotspots"
            shape={hotspotsGeoJSON as any}
            onPress={(e: any) => {
              const f = e?.features?.[0];
              if (f?.properties?.id) setSelectedHotspotId(f.properties.id);
            }}
          >
            <MapboxGL.CircleLayer
              id="fishingHotspotsHalo"
              style={{
                circleRadius: ['interpolate', ['linear'], ['zoom'], 7, 4, 12, 9, 16, 14],
                circleColor: '#FFFFFF',
                circleOpacity: 0.85,
                circleStrokeWidth: 0,
              }}
            />
            <MapboxGL.CircleLayer
              id="fishingHotspotsCore"
              style={{
                circleRadius: ['interpolate', ['linear'], ['zoom'], 7, 2.5, 12, 6, 16, 10],
                circleColor: ['get', 'color'],
                circleStrokeColor: '#FFFFFF',
                circleStrokeWidth: 1,
              }}
            />
            <MapboxGL.SymbolLayer
              id="fishingHotspotsLabel"
              minZoomLevel={11}
              style={{
                textField: ['get', 'name'],
                textSize: 10,
                textColor: '#FFFFFF',
                textHaloColor: '#000000',
                textHaloWidth: 1.2,
                textOffset: [0, 1.2],
                textAnchor: 'top',
              }}
            />
          </MapboxGL.ShapeSource>
        )}

        {/* ── Personal waypoints (Phase A.1b) ──
            User-created pins for fish mode. Long-press on the water to
            drop a new hole / ramp / put-in; tap a pin to edit. */}
        <UserWaypointLayer mode="fish" onWaypointPress={openWaypointEdit} />
        <UserMarkupLayer mode="fish" onMarkupPress={openMarkupEdit} />
      </MapboxGL.MapView>

      <View style={styles.statsBadge}>
        <Text style={styles.statsText}>
          {filteredCount} of {MARYLAND_ANGLER_ACCESS_SITES.length} sites
        </Text>
        <Text style={styles.statsSubtext}>MD DNR Public Angler Access</Text>
      </View>

      {/*
        2026-04-30 (V2.4 audit): the previous horizontal ScrollView
        held 8 filter chips (5 access categories from CATEGORIES + Rivers
        + Tidal + Hotspots) which clipped on every screen size at
        once-or-the-next iPhone size up. Replaced with a single
        FilterPicker that opens a bottom sheet listing every filter as a
        Switch row. The colored code badges (RMP/SFT/SHR/TRT/P&T/RIV/
        TIDE/HOT) are condensed into the row hint text. Trigger label
        shows the active count so users know if filters are restricting
        what they see.
      */}
      <View style={styles.filterPickerWrap} pointerEvents="box-none">
        <FilterPicker
          triggerLabel="Filters"
          title="Fish Map Filters"
          options={[
            ...CATEGORIES.map((cat) => ({
              key: cat.key,
              label: cat.label,
              hint: `${cat.code} — ${
                cat.key === 'ramp'
                  ? 'Boat ramps with hard surface'
                  : cat.key === 'soft'
                  ? 'Soft-launch / kayak / canoe'
                  : cat.key === 'shore'
                  ? 'Shore / pier / wading'
                  : cat.key === 'trout'
                  ? 'Trout-stocked waters'
                  : 'Put-and-take stocked ponds'
              }`,
              active: activeFilters.has(cat.key),
              accent: cat.color,
            })),
            {
              key: 'rivers',
              label: 'Rivers',
              hint: 'RIV — Major Maryland rivers polyline',
              active: showRivers,
              accent: '#1976D2',
            },
            {
              key: 'tidal',
              label: 'Tidal Boundary',
              hint: 'TIDE — Tidal vs. non-tidal regulation line',
              active: showTidalBoundary,
              accent: Colors.amber,
            },
            {
              key: 'hotspots',
              label: 'Hotspots',
              hint: 'HOT — 309 curated in-water spots',
              active: showHotspots,
              accent: '#26A69A',
            },
            {
              key: 'troutWaters',
              label: 'Wild Trout',
              hint: 'WLD — Native brook & wild trout streams (DNR MBSS)',
              active: showTroutWaters,
              accent: '#2E7D32',
            },
          ]}
          onChange={(key, next) => {
            if (key === 'rivers') setShowRivers(next);
            else if (key === 'tidal') setShowTidalBoundary(next);
            else if (key === 'hotspots') setShowHotspots(next);
            else if (key === 'troutWaters') setShowTroutWaters(next);
            else {
              // CATEGORIES key — toggle in the activeFilters Set.
              setActiveFilters((prev) => {
                const out = new Set(prev);
                if (next) out.add(key as any);
                else out.delete(key as any);
                return out;
              });
            }
          }}
          onClearAll={() => {
            setShowRivers(false);
            setShowTidalBoundary(false);
            setShowHotspots(false);
            setShowTroutWaters(false);
            setActiveFilters(new Set());
          }}
        />
      </View>

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
        <TouchableOpacity
          style={styles.controlBtn}
          onPress={() => setOfflineOpen(true)}
          accessibilityRole="button"
          accessibilityLabel="Offline maps"
        >
          <Text
            style={[
              styles.controlText,
              offlineMaps.isOffline && !offlineMaps.hasPacks
                ? { color: Colors.mdRed }
                : null,
            ]}
          >
            {offlineMaps.isOffline && !offlineMaps.hasPacks ? '!' : 'DL'}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.controlBtn,
            showGauges ? { borderColor: '#42A5F5', borderWidth: 1.5 } : null,
          ]}
          onPress={() => setShowGauges((v) => !v)}
          accessibilityRole="button"
          accessibilityLabel="Toggle live USGS stream gauges"
        >
          <Text style={[styles.controlText, showGauges ? { color: '#42A5F5' } : null]}>
            USGS
          </Text>
        </TouchableOpacity>
      </View>

      {/* 2026-04-26 (zoom relocation): zoom split out of right-side
          controls and moved to bottom-right above search bar — vertical
          pair, + on top of −. Same pattern as Hunt MapScreen. */}
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

      <TouchableOpacity style={styles.legendToggle} onPress={() => setShowLegend(!showLegend)}>
        <Text style={styles.legendToggleText}>Legend {showLegend ? '\u25BC' : '\u25B6'}</Text>
      </TouchableOpacity>

      {showLegend ? (
        <View style={styles.legendPanel}>
          {CATEGORIES.map((cat) => (
            <View key={cat.key} style={styles.legendRow}>
              <View style={[styles.legendDot, { backgroundColor: cat.color }]} />
              <Text style={styles.legendLabel}>
                {cat.code} · {cat.label}
              </Text>
            </View>
          ))}
          {showTroutWaters ? (
            <>
              <View style={styles.legendRow}>
                <View style={[styles.legendDot, { backgroundColor: '#00C853' }]} />
                <Text style={styles.legendLabel}>WLD · Brook (native)</Text>
              </View>
              <View style={styles.legendRow}>
                <View style={[styles.legendDot, { backgroundColor: '#FFB300' }]} />
                <Text style={styles.legendLabel}>WLD · Wild brown</Text>
              </View>
              <View style={styles.legendRow}>
                <View style={[styles.legendDot, { backgroundColor: '#EC407A' }]} />
                <Text style={styles.legendLabel}>WLD · Wild rainbow</Text>
              </View>
            </>
          ) : null}
          {showGauges ? (
            <View style={styles.legendRow}>
              <View style={[styles.legendDot, { backgroundColor: '#1E88E5' }]} />
              <Text style={styles.legendLabel}>USGS · Live gauge (cfs)</Text>
            </View>
          ) : null}
        </View>
      ) : null}

      {selected ? (
        <View
          style={[
            styles.detailPanel,
            {
              bottom:
                insets.bottom +
                12 +
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
          <Text style={styles.detailField}>
            <Text style={styles.detailFieldLabel}>County: </Text>
            {selected.county}
          </Text>
          <Text style={styles.detailField}>
            <Text style={styles.detailFieldLabel}>Water: </Text>
            {selected.waterbody}
          </Text>
          {selected.fishTypes ? (
            <Text style={styles.detailField}>
              <Text style={styles.detailFieldLabel}>Species: </Text>
              {selected.fishTypes}
            </Text>
          ) : null}
          {selected.specialReg && selected.specialReg !== 'None' ? (
            <Text style={styles.detailField}>
              <Text style={styles.detailFieldLabel}>Special Reg: </Text>
              {selected.specialReg}
            </Text>
          ) : null}
          <Text style={styles.detailField}>
            <Text style={styles.detailFieldLabel}>Access: </Text>
            {selected.hasRamp
              ? 'Concrete boat ramp'
              : selected.hasSoftLaunch
              ? 'Soft launch (car-top)'
              : 'Shore only'}
          </Text>
          {/* 2026-04-27: Local Pros — fly shops, charters, marinas that
              serve the same waterbody as this access site. Mirrors the
              hotspot card. Tap a row to call/visit website. */}
          {(() => {
            const pros = servicesForWater(selected.waterbody).slice(0, 3);
            if (pros.length === 0) return null;
            return (
              <View style={{ marginTop: 6, paddingTop: 6, borderTopWidth: 1, borderTopColor: Colors.mud }}>
                <Text style={[styles.detailFieldLabel, { fontSize: 12, marginBottom: 4 }]}>
                  Local pros for {selected.waterbody}
                </Text>
                {pros.map((p) => (
                  <TouchableOpacity
                    key={p.id}
                    onPress={() => {
                      if (p.website) Linking.openURL(p.website).catch(() => {});
                      else if (p.phone) Linking.openURL('tel:' + p.phone).catch(() => {});
                    }}
                    activeOpacity={0.7}
                    style={{ paddingVertical: 3 }}
                    accessibilityRole="button"
                    accessibilityLabel={`Open ${p.name}`}
                  >
                    <Text style={[styles.detailField, { color: Colors.lichen, fontWeight: '600' }]}>
                      {p.name}
                    </Text>
                    <Text style={[styles.detailField, { fontSize: 10, color: Colors.textMuted }]}>
                      {p.category.replace('-', ' ')} · {p.city}
                      {p.phone ? ' · ' + p.phone : ''}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            );
          })()}
          <View style={styles.detailButtons}>
            <TouchableOpacity
              style={[styles.detailBtn, { backgroundColor: Colors.moss }]}
              onPress={() => openDirections(selected)}
              activeOpacity={0.8}
            >
              <Text style={styles.detailBtnText}>{'\uD83E\uDDED'} Directions</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.detailBtn, { backgroundColor: '#1A3A5C' }]}
              onPress={() => openWeather(selected)}
              activeOpacity={0.8}
            >
              <Text style={styles.detailBtnText}>{'\u2601'} Weather</Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : null}

      {/* \u2500\u2500 Curated hotspot detail panel (2026-04-26) \u2500\u2500
          Tapping a HOT marker selects a hotspot. Renders a card with name,
          waterbody, kind, primary species, technique notes, best months,
          and a citation badge so users can judge source quality. */}
      {selectedHotspot ? (
        <View
          style={[
            styles.detailPanel,
            {
              bottom:
                insets.bottom +
                12 +
                (!disclaimerDismissed ? 32 : 0),
            },
          ]}
        >
          <View style={styles.detailHeader}>
            <Text style={styles.detailName} numberOfLines={2}>
              {selectedHotspot.name}
            </Text>
            <TouchableOpacity onPress={() => setSelectedHotspotId(null)}>
              <Text style={styles.detailClose}>{'\u2715'}</Text>
            </TouchableOpacity>
          </View>
          <Text style={styles.detailField}>
            <Text style={styles.detailFieldLabel}>Waterbody: </Text>
            {selectedHotspot.waterbody} ({selectedHotspot.county})
          </Text>
          <Text style={styles.detailField}>
            <Text style={styles.detailFieldLabel}>Type: </Text>
            {selectedHotspot.kind.replace('-', ' ')}
            {selectedHotspot.isStretch ? ' (representative point)' : ''}
          </Text>
          <Text style={styles.detailField}>
            <Text style={styles.detailFieldLabel}>Species: </Text>
            {selectedHotspot.primarySpecies.join(', ')}
          </Text>
          <Text style={styles.detailField}>
            <Text style={styles.detailFieldLabel}>Best months: </Text>
            {selectedHotspot.bestMonths || 'year-round'}
          </Text>
          <Text style={styles.detailField}>
            <Text style={styles.detailFieldLabel}>Notes: </Text>
            {selectedHotspot.techniqueNotes}
          </Text>
          {selectedHotspot.parking ? (
            <Text style={styles.detailField}>
              <Text style={styles.detailFieldLabel}>Parking: </Text>
              {selectedHotspot.parking}
            </Text>
          ) : null}
          {selectedHotspot.hours ? (
            <Text style={styles.detailField}>
              <Text style={styles.detailFieldLabel}>Hours: </Text>
              {selectedHotspot.hours}
            </Text>
          ) : null}
          {selectedHotspot.accessNotes ? (
            <Text style={styles.detailField}>
              <Text style={styles.detailFieldLabel}>Access: </Text>
              {selectedHotspot.accessNotes}
            </Text>
          ) : null}
          {selectedHotspot.borderWater ? (
            <Text style={[styles.detailField, { color: Colors.lichen, fontWeight: '600' }]}>
              ⚓ Border water — MD license valid both sides
            </Text>
          ) : null}
          {selectedHotspot.reg ? (
            <Text style={[styles.detailField, { color: Colors.amber }]}>
              <Text style={styles.detailFieldLabel}>Reg: </Text>
              {selectedHotspot.reg}
            </Text>
          ) : null}
          {/* 2026-04-29: "What we use here" CTA — taps deep-link into the
              AI tab pre-populated with the hotspot's gearAskAi prompt. The
              AI's response then splices the Amazon-affiliate footer (per
              augmentWithGearSuggestions in fishingChatKnowledge.ts). This
              is the David-flagged monetization path: hotspot → AI → gear. */}
          {selectedHotspot.gearAskAi ? (
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel={`Ask AI: ${selectedHotspot.gearAskAi}`}
              onPress={() => {
                // 2026-04-29: Fish mode's AI tab is registered as
                // `FishAITab` in AppNavigator (HuntTabs uses `ChatTab`,
                // CampTabs uses `CampAITab`, HikeTabs uses `HikeAITab`).
                // Routing to the wrong tab name silently no-ops within
                // FishTabs since `ChatTab` doesn't exist there. Adversarial
                // audit caught this.
                navigation.navigate('FishAITab', {
                  screen: 'ChatMain',
                  params: { initialQuery: selectedHotspot.gearAskAi },
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
                {selectedHotspot.gearAskAi}
              </Text>
            </TouchableOpacity>
          ) : null}
          {/* Local Pros — fly shops, guides, charters that explicitly
              serve this waterbody. Sourced from marylandLocalServices.ts.
              2026-04-26: tap a row to call/visit website. */}
          {(() => {
            const pros = servicesForWater(selectedHotspot.waterbody).slice(0, 4);
            if (pros.length === 0) return null;
            return (
              <View style={{ marginTop: 8, paddingTop: 8, borderTopWidth: 1, borderTopColor: Colors.mud }}>
                <Text style={[styles.detailFieldLabel, { fontSize: 12, marginBottom: 4 }]}>
                  Local pros ({pros.length})
                </Text>
                {pros.map((p) => (
                  <TouchableOpacity
                    key={p.id}
                    onPress={() => {
                      if (p.website) Linking.openURL(p.website).catch(() => {});
                      else if (p.phone) Linking.openURL('tel:' + p.phone).catch(() => {});
                    }}
                    activeOpacity={0.7}
                    style={{ paddingVertical: 4 }}
                  >
                    <Text style={[styles.detailField, { color: Colors.lichen, fontWeight: '600' }]}>
                      {p.name}
                    </Text>
                    <Text style={[styles.detailField, { fontSize: 10, color: Colors.textMuted }]}>
                      {p.category.replace('-', ' ')} · {p.city}
                      {p.phone ? ' · ' + p.phone : ''}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            );
          })()}
          <Text style={[styles.detailField, { fontSize: 10, color: Colors.textMuted, marginTop: 6 }]}>
            Source ({selectedHotspot.sourceTier}): {selectedHotspot.source}
          </Text>
        </View>
      ) : null}

      {locationLoading ? (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color={Colors.moss} />
        </View>
      ) : null}

      {/* ── Search Bar (Bottom, Above Disclaimer & Detail Panel) ──
          Mirrors the Hunt MapScreen.tsx search bar. Only shown when no detail
          panel is selected to avoid collision. Bottom offset accounts for
          disclaimer banner (32pt) and safe area insets. */}
      {!selected ? (
        <View
          style={[
            styles.searchBarContainer,
            {
              bottom:
                insets.bottom +
                8 +
                (!disclaimerDismissed ? 32 : 0),
            },
          ]}
        >
          <TextInput
            style={styles.searchInput}
            placeholder="Search sites by name or waterbody..."
            placeholderTextColor={Colors.textSecondary}
            value={searchQuery}
            onChangeText={setSearchQuery}
            autoCorrect={false}
            autoCapitalize="none"
            returnKeyType="search"
          />
        </View>
      ) : null}

      <DisclaimerBanner
        dismissed={disclaimerDismissed}
        onDismiss={() => setDisclaimerDismissed(true)}
      />

      <OnboardingTourGate mode="fish" />

      <OfflineMapsModal
        visible={offlineOpen}
        onClose={() => setOfflineOpen(false)}
        onChanged={offlineMaps.refresh}
        isOffline={offlineMaps.isOffline}
      />

      <GaugeDetailCard
        gauge={selectedGauge}
        onClose={() => setSelectedGauge(null)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  map: { flex: 1 },
  // 2026-04-30 (V2.4 audit): pushed from top:12 to top:46 because the
  // Mapbox scale ruler renders at top-left by default (~28pt tall) and
  // was overlapping the badge text. Same fix as Hunt MapScreen.
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
  // ── Filter picker wrapper (replaces the old chip-row ScrollView) ──
  // 2026-04-30 (V2.4 audit): pushed down to top: 96 — clears the
  // stats badge (now at top: 46, with ~36pt height) plus a few pt of
  // breathing room.
  filterPickerWrap: {
    position: 'absolute',
    top: 96,
    left: 12,
    zIndex: 10,
  },
  filterChip: {
    // 2026-04-26 (second pass): tighter padding + smaller right margin so
    // 5 chips fit on iPhone 17 Pro width without the rightmost chip clipping.
    // Total budget: 393pt screen / 5 chips = ~78pt per chip incl. gap.
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.overlay,
    borderRadius: 20,
    paddingHorizontal: 6,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: Colors.mud,
    marginRight: 4,
  },
  filterChipCode: {
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 3,
    marginRight: 6,
    minWidth: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterChipCodeText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.4,
  },
  filterLabel: { fontSize: 11, fontWeight: '600', color: Colors.textSecondary },
  controlsColumn: {
    position: 'absolute',
    right: 12,
    // 2026-04-26 (zoom relocation): zoom buttons split out into zoomControls,
    // SAT/ME/⌖ stay in this column. Anchored at top: 200 (below filter chips
    // + tide overlay) so the column doesn't fight the bottom-row controls.
    top: 200,
    zIndex: 10,
    gap: 6,
  },
  // ── Zoom Controls (bottom-right, just above search bar) ──
  // Vertical pair, + on top of −. Bottom value (~118) puts the pair just
  // above the search box (which is at ~insets.bottom + 8 ≈ 74). Same
  // pattern across Hunt / Fish / Camp / Hike for visual consistency.
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
    marginBottom: 6,
  },
  controlText: { fontSize: 16, fontWeight: '700', color: Colors.textPrimary },
  controlCrosshair: { fontSize: 20, color: Colors.lichen },
  legendToggle: {
    position: 'absolute',
    bottom: 80,
    left: 12,
    backgroundColor: Colors.overlay,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    zIndex: 10,
    borderWidth: 1,
    borderColor: Colors.mud,
  },
  legendToggleText: { fontSize: 12, fontWeight: '600', color: Colors.textSecondary },
  legendPanel: {
    position: 'absolute',
    bottom: 116,
    left: 12,
    backgroundColor: Colors.surface,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    zIndex: 10,
    borderWidth: 1,
    borderColor: Colors.mud,
  },
  legendRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
  legendDot: { width: 10, height: 10, borderRadius: 5, marginRight: 8 },
  legendLabel: { fontSize: 12, color: Colors.textSecondary },
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
  detailName: { fontSize: 15, fontWeight: '700', color: Colors.textPrimary, flex: 1, marginRight: 12 },
  detailClose: { fontSize: 18, color: Colors.textMuted, padding: 4 },
  detailField: { fontSize: 13, color: Colors.textSecondary, lineHeight: 20 },
  detailFieldLabel: { fontWeight: '600', color: Colors.textPrimary },
  detailButtons: {
    flexDirection: 'row',
    marginTop: 12,
    gap: 8,
  },
  detailBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
    marginRight: 8,
  },
  detailBtnText: { fontSize: 12, fontWeight: '700', color: Colors.textPrimary },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: Colors.overlay,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 20,
  },
  // ── Search Bar (Bottom, Above Disclaimer) ──
  // Dynamic bottom position accounts for safe area insets and disclaimer banner.
  // Hidden when detail panel is open to prevent collision.
  searchBarContainer: {
    position: 'absolute',
    left: 12,
    right: 12,
    backgroundColor: Colors.overlay,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    flexDirection: 'row',
    alignItems: 'center',
    zIndex: 10,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    color: Colors.textPrimary,
    backgroundColor: 'transparent',
    paddingVertical: 0,
  },
});
