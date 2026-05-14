/**
 * @file MapScreen.tsx
 * @description Primary map interface for browsing all 192+ public hunting lands and 14 shooting ranges in Maryland.
 * Features interactive Mapbox GL map with land filtering, land detail panels, and map controls.
 *
 * @module Screens
 * @version 2.0.0
 *
 * Key features:
 * - Displays polygons and point markers for public lands color-coded by designation
 * - 9-factor filter system (land type, species, weapons, access methods)
 * - Polygon rendering for lands with GIS boundaries, point markers for center-only lands
 * - Shooting range overlay with tap-to-detail
 * - Map style toggle (satellite vs. topographic), zoom controls, GPS recenter button
 * - Responsive legend showing land designation types
 * - Land and range detail panels with full metadata, contact info, parking data
 * - Disclaimer banner footer reminding users to verify with MD DNR
 */

import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Text,
  ActivityIndicator,
  Alert,
  Linking,
  ScrollView,
  TextInput,
} from 'react-native';
import MapboxGL from '@rnmapbox/maps';
import { useNavigation } from '@react-navigation/native';
import { useLocation } from '../hooks/useLocation';
import DisclaimerBanner from '../components/common/DisclaimerBanner';
import MapFilterPanel, { FilterState } from '../components/map/MapFilterPanel';
import FilterPicker, { FilterOption } from '../components/common/FilterPicker';
import WeatherOverlay from '../components/map/WeatherOverlay';
import ZoomIcon from '../components/map/ZoomIcon';
import UserWaypointLayer from '../components/map/UserWaypointLayer';
import UserMarkupLayer from '../components/map/UserMarkupLayer';
import ScentConeLayer from '../components/map/ScentConeLayer';
import HuntWindPanel, {
  type HuntWindPanelState,
} from '../components/map/HuntWindPanel';
import OnboardingTourGate from '../components/OnboardingTourGate';
import { useMapLongPressWaypoint } from '../hooks/useMapLongPressWaypoint';
import { useUserWaypoints } from '../context/UserWaypointContext';
import Colors from '../theme/colors';
import {
  marylandPublicLands,
  shootingRanges,
  MarylandPublicLand,
  ShootingRange,
  ParkingLocation,
  DATA_STATS,
} from '../data/marylandPublicLands';
import { LANDOWNER_BLINDS, LandownerBlind } from '../data/landownerBlinds';
import {
  MARYLAND_LOCAL_SERVICES,
  servicesForRegion,
  type LocalService,
} from '../data/marylandLocalServices';
import {
  MARYLAND_OFFSHORE_BLINDS,
  MARYLAND_OFFSHORE_BLIND_CLOSURES,
  OffshoreBlind,
} from '../data/marylandOffshoreBlinds';
import {
  MARYLAND_WATERFOWL_ZONES,
} from '../data/marylandWaterfowlZones';
import {
  MARYLAND_HUNT_CLOSURES,
  HuntClosure,
} from '../data/marylandHuntClosures';
import {
  MARYLAND_HUNT_LOTTERY_TRACTS,
  MARYLAND_HUNT_LOTTERY_ROADS,
  HuntLotteryTract,
} from '../data/marylandHuntLotteryTracts';
import { MAPBOX_ACCESS_TOKEN } from '../config';

MapboxGL.setAccessToken(MAPBOX_ACCESS_TOKEN);

// ── Color map for land designations ──
const DESIGNATION_COLORS: Record<string, string> = {
  WMA: '#2E7D32',
  CWMA: '#558B2F',
  CFL: '#33691E',
  SF: '#1B5E20',
  SP: '#00695C',
  NRMA: '#4E342E',
  NEA: '#6A1B9A',
  FMA: '#0277BD',
  MNCPPC: '#EF6C00',
  Federal: '#B71C1C',
  Range: '#F57F17',
};

const DESIGNATION_BORDER_COLORS: Record<string, string> = {
  WMA: '#1B5E20',
  CWMA: '#33691E',
  CFL: '#1B5E20',
  SF: '#004D40',
  SP: '#004D40',
  NRMA: '#3E2723',
  NEA: '#4A148C',
  FMA: '#01579B',
  MNCPPC: '#BF360C',
  Federal: '#7F0000',
  Range: '#E65100',
};

// ── Species filter matching ──
const SPECIES_MAP: Record<string, string[]> = {
  deer: ['deer', 'white-tailed deer', 'whitetail'],
  turkey: ['turkey', 'wild turkey'],
  waterfowl: ['waterfowl', 'duck', 'goose', 'geese'],
  bear: ['bear', 'black bear'],
  smallGame: ['small game', 'upland game', 'squirrel', 'grouse', 'rabbit', 'dove', 'quail'],
};

const WEAPON_MAP: Record<string, string[]> = {
  archery: ['archery', 'bow', 'crossbow'],
  firearms: ['firearms', 'rifle', 'shotgun', 'rifle or shotgun'],
  muzzleloader: ['muzzleloader'],
};

// ── Hunt overlay color palette (Build 7 wave) ──
// Landowner blinds already render in `#8B4513` (saddle brown). Offshore blinds
// must be visually distinct because the regulatory regime is different — these
// are tidewater permits with a 500-yd spacing rule. Blue signals "water".
const OFFSHORE_BLIND_COLOR = '#1565C0';
const OFFSHORE_CLOSURE_COLOR = '#B71C1C'; // "cannot hunt here" — red stroke/fill
const WATERFOWL_ZONE_COLOR = '#6A1B9A';   // purple — late resident goose zones
const HUNT_CLOSURE_COLORS: Record<HuntClosure['kind'], string> = {
  public_harvest_closure: '#E65100', // regulatory notice — burnt orange
  oyster_sanctuary: '#00695C',       // shellfish sanctuary — teal
  new_hunting_area: '#2E7D32',       // new-area opportunity — forest green
};
const LOTTERY_TRACT_COLOR = '#C08A2F'; // gold — permit-only lottery tracts

// ── Map designation key to filter key ──
const DESIGNATION_TO_FILTER: Record<string, keyof FilterState['landTypes']> = {
  WMA: 'wma',
  CWMA: 'cwma',
  CFL: 'cfl',
  SF: 'sf',
  SP: 'sp',
  NRMA: 'nrma',
  NEA: 'nea',
  FMA: 'fma',
  MNCPPC: 'wma',
  Federal: 'wma',
  Range: 'range',
};

/**
 * MapScreen — Main map browse and discovery interface.
 *
 * Renders an interactive Mapbox GL map centered on user's GPS location (or MD center on error).
 * Displays all public hunting lands as polygons or point markers, with color coding by designation type.
 * Users can filter lands by type, huntable species, allowed weapons, and access methods.
 * Tap any land or range to view detailed information including regulations, contact, parking, and links.
 *
 * Data comes from marylandPublicLands (192 lands + 14 ranges) with full geospatial boundaries
 * and enriched metadata (access notes, contacts, parking, bag limits, etc.).
 *
 * @returns {JSX.Element} Full-screen map UI with filter panel, controls, legend, and detail panels
 */
export default function MapScreen() {
  const navigation = useNavigation<any>();
  const onLongPressMap = useMapLongPressWaypoint({
    mode: 'hunt',
    navigate: (screen, params) => navigation.navigate(screen, params),
  });
  const openWaypointEdit = useCallback(
    (waypointId: string) =>
      navigation.navigate('WaypointEdit', { mode: 'hunt', waypointId }),
    [navigation],
  );
  const openMarkupEdit = useCallback(
    (markupId: string) =>
      navigation.navigate('MarkupEdit', { mode: 'hunt', markupId }),
    [navigation],
  );
  const openPersonalHub = useCallback(
    () => navigation.navigate('PersonalHub', { mode: 'hunt' }),
    [navigation],
  );
  const { location, loading: locationLoading, error: locationError } = useLocation();
  const [selectedLand, setSelectedLand] = useState<MarylandPublicLand | null>(null);
  const [selectedRange, setSelectedRange] = useState<ShootingRange | null>(null);
  const [showTopo, setShowTopo] = useState(false);
  const [show3D, setShow3D] = useState(false);
  const [terrainExaggeration, setTerrainExaggeration] = useState(1.5);
  const [currentZoom, setCurrentZoom] = useState(7);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilters, setActiveFilters] = useState<FilterState>({
    landTypes: {
      wma: true, cwma: true, cfl: true, sf: true,
      sp: true, nrma: true, nea: true, fma: true, range: true,
    },
    species: {
      deer: false, turkey: false, waterfowl: false, bear: false, smallGame: false,
    },
    weapons: {
      archery: false, firearms: false, muzzleloader: false,
    },
    access: {
      sundayHunting: false, noReservation: false, mobilityAccess: false,
    },
  });
  const [showBlinds, setShowBlinds] = useState(false);
  const [selectedBlind, setSelectedBlind] = useState<LandownerBlind | null>(null);
  // ── Hunt overlays (Build 7 — 2026-04-19) ──
  // `showOffshoreBlinds` is a single toggle that renders BOTH the 4687 licensed
  // blind points AND the 571 no-blind exclusion polygons. These are drawn
  // together, not filtered against each other — a waterfowler scouting a site
  // needs to see existing blinds (for 500-yd spacing) and closed areas (for
  // legality) simultaneously. See hunt_data_wave_2026_04_19.md.
  const [showOffshoreBlinds, setShowOffshoreBlinds] = useState(false);
  const [showGooseZones, setShowGooseZones] = useState(false);
  const [showHuntClosures, setShowHuntClosures] = useState(false);
  // 2026-04-26: Toggle for local-pros layer (Guntry, Bass Pro Hanover, etc.)
  const [showLocalPros, setShowLocalPros] = useState(true);
  const [selectedProId, setSelectedProId] = useState<string | null>(null);
  const [showLotteryTracts, setShowLotteryTracts] = useState(false);
  const [selectedOffshoreBlind, setSelectedOffshoreBlind] = useState<OffshoreBlind | null>(null);
  const [selectedHuntClosure, setSelectedHuntClosure] = useState<HuntClosure | null>(null);
  const [selectedLotteryTract, setSelectedLotteryTract] = useState<HuntLotteryTract | null>(null);

  // ── UI dismissal state ──
  // The map's two footer banners (approximate-boundary warning + DNR
  // disclaimer) previously ate ~50px of vertical space, crowding the search
  // bar and bottom controls. User directive 2026-04-20: "we also need to
  // enable the use to minimize the warnings at the bottom". Per-session
  // dismissal is fine — both banners come back on next cold start so the
  // legal disclaimer is always re-presented once per session.
  const [approxBannerDismissed, setApproxBannerDismissed] = useState(false);
  const [disclaimerDismissed, setDisclaimerDismissed] = useState(false);
  // Legend collapses to a single pill when not needed. Prevents collision
  // with WeatherOverlay (top: 50 right: 12) — which was visually stacking on
  // top of the expanded legend before this was added.
  const [legendExpanded, setLegendExpanded] = useState(false);
  const cameraRef = useRef<MapboxGL.Camera>(null);
  const mapRef = useRef<MapboxGL.MapView>(null);

  // ── Phase B.2: Hunt wind panel + scent cones ──
  // `huntWind` holds the wind reading + toggle state pushed up from the
  // HuntWindPanel child. ScentConeLayer reads it to render cones downwind
  // from every tree-stand waypoint.
  //
  // `mapCenter` is the point we ask NWS about. We use the default map
  // center to start — a pan/zoom listener could narrow it later, but
  // statewide the NWS grid is uniform enough that refetching on every
  // pan is wasteful.
  const [huntWind, setHuntWind] = useState<HuntWindPanelState>({
    wind: null,
    showCones: false,
    forecastIso: new Date().toISOString(),
    hoursAhead: 0,
  });
  const huntWindCenter = useMemo(
    () => ({ lat: 39.2904, lng: -76.6122 }),
    [],
  );
  const { waypointsForMode } = useUserWaypoints();
  const treeStandWaypoints = useMemo(
    () =>
      waypointsForMode('hunt')
        .filter((w) => w.category === 'tree-stand')
        .map((w) => ({ id: w.id, lat: w.lat, lng: w.lng })),
    [waypointsForMode],
  );

  const defaultCenter: [number, number] = [-76.6122, 39.2904]; // Downtown Baltimore

  /**
   * Maryland bounding box — used to gate whether we trust device location.
   * On iOS Simulator the default device location is Cupertino, CA, which
   * centers the map on the Bay Area and makes the app look broken on first
   * open. We clamp to Baltimore when the user is outside Maryland.
   *
   * Coordinates cover the state generously: Garrett County corner in the
   * west to the Atlantic edge of Worcester County in the east, with a small
   * tolerance around the Pennsylvania and Virginia borders.
   */
  const isInMaryland = (lng: number, lat: number): boolean =>
    lng >= -79.5 && lng <= -74.9 && lat >= 37.8 && lat <= 39.8;

  const locationAlertShown = useRef(false);
  useEffect(() => {
    if (locationError && !locationAlertShown.current) {
      locationAlertShown.current = true;
      Alert.alert(
        'Location Services',
        'Enable location access in Settings > Privacy > Location Services to see your position on the map.',
        [
          { text: 'Open Settings', onPress: () => Linking.openURL('app-settings:') },
          { text: 'OK', style: 'cancel' },
        ]
      );
    }
  }, [locationError]);

  // ── Filter logic ──
  const hasActiveSpeciesFilter = Object.values(activeFilters.species).some(Boolean);
  const hasActiveWeaponFilter = Object.values(activeFilters.weapons).some(Boolean);
  const hasActiveAccessFilter = Object.values(activeFilters.access).some(Boolean);

  const filteredLands = useMemo(() => {
    return marylandPublicLands.filter((land) => {
      // 1. Land type filter
      const filterKey = DESIGNATION_TO_FILTER[land.designation];
      if (filterKey && !activeFilters.landTypes[filterKey]) return false;

      // 2. Species filter
      if (hasActiveSpeciesFilter) {
        const landSpecies = (land.huntableSpecies || []).map((s: string) => s.toLowerCase());
        const matchesSpecies = Object.entries(activeFilters.species).some(([key, isActive]) => {
          if (!isActive) return false;
          const targets = SPECIES_MAP[key] || [];
          return targets.some(t => landSpecies.some(ls => ls.includes(t)));
        });
        if (!matchesSpecies) return false;
      }

      // 3. Weapon filter
      if (hasActiveWeaponFilter) {
        const landWeapons = (land.allowedWeapons || []).map((w: string) => w.toLowerCase());
        const matchesWeapon = Object.entries(activeFilters.weapons).some(([key, isActive]) => {
          if (!isActive) return false;
          const targets = WEAPON_MAP[key] || [];
          return targets.some(t => landWeapons.some(lw => lw.includes(t)));
        });
        if (!matchesWeapon) return false;
      }

      // 4. Access filters
      if (activeFilters.access.sundayHunting && !land.sundayHunting) return false;
      if (activeFilters.access.noReservation && land.reservationRequired) return false;
      if (activeFilters.access.mobilityAccess && !land.mobilityImpaired) return false;

      return true;
    });
  }, [activeFilters, hasActiveSpeciesFilter, hasActiveWeaponFilter, hasActiveAccessFilter]);

  // ── Build GeoJSON for polygon lands ──
  // CRITICAL: we REFUSE to ship fabricated boundaries. If a land is flagged
  // `boundaryApproximate === true` it means the geometry is a hand-traced
  // placeholder / octagonal stub / "acreage-sized diamond" — those are more
  // misleading than useful (they overlay the wrong areas on real features
  // like reservoirs) and the only honest surface is a pin at the centroid.
  // So we filter approximates OUT of the polygon layer and route them into
  // the point layer below. The 2026-04-17 dashed-border mitigation was
  // insufficient: users rely on what they see. Purged 2026-04-24 per
  // David's QC call; see DATA_QUALITY_METHODOLOGY.md §3 (revision).
  const polygonGeoJSON = useMemo(() => {
    const features = filteredLands
      .filter((land) => land.geometry != null && land.boundaryApproximate !== true)
      .map((land, idx) => ({
        type: 'Feature' as const,
        id: idx.toString(),
        properties: {
          landId: land.id,
          name: land.name,
          designation: land.designation,
          designationFull: land.designationFull,
          county: land.county,
          acres: land.acres,
          color: DESIGNATION_COLORS[land.designation] || '#2E7D32',
          borderColor: DESIGNATION_BORDER_COLORS[land.designation] || '#1B5E20',
        },
        geometry: { ...land.geometry!, type: land.geometry!.type as 'Polygon' | 'MultiPolygon' },
      }));
    return { type: 'FeatureCollection' as const, features } as any;
  }, [filteredLands]);

  // True if ANY rendered land is pin-only due to a missing / approximate
  // boundary. Drives the bottom banner telling the user to verify exact
  // boundaries via the DNR PDF on the detail sheet.
  const anyPinOnlyLands = useMemo(
    () => filteredLands.some((l) => (l.geometry == null || l.boundaryApproximate === true) && l.center != null),
    [filteredLands],
  );

  // 2026-04-26: hunting-relevant local-services GeoJSON for the Pros layer.
  // Only entries with lat/lng AND that touch a hunting category render here
  // — Guntry, Bass Pro Hanover, archery pro shops, taxidermists, etc.
  const localProsGeoJSON = useMemo(() => {
    if (!showLocalPros) return { type: 'FeatureCollection' as const, features: [] };
    const huntCats = new Set([
      'shooting-complex',
      'archery-pro-shop',
      'waterfowl-outfitter',
      'big-game-guide',
      'sika-outfitter',
      'hunting-lodge',
      'taxidermist',
      'big-box',
      'call-decoy-maker',
      'game-processor',
    ]);
    const features = MARYLAND_LOCAL_SERVICES
      .filter((s: LocalService) =>
        huntCats.has(s.category) &&
        typeof s.lat === 'number' &&
        typeof s.lng === 'number')
      .map((s: LocalService) => ({
        type: 'Feature' as const,
        id: s.id,
        properties: {
          id: s.id,
          name: s.name,
          category: s.category,
          // Featured services (David's recommendations like Guntry) get
          // gold; others get a neutral charcoal pin so they don't compete
          // with hunting-land polygon colors.
          color: s.featured ? '#FFD700' : '#3A3F2A',
        },
        geometry: { type: 'Point' as const, coordinates: [s.lng!, s.lat!] },
      }));
    return { type: 'FeatureCollection' as const, features };
  }, [showLocalPros]);

  const selectedPro = useMemo(
    () => MARYLAND_LOCAL_SERVICES.find((s) => s.id === selectedProId) || null,
    [selectedProId],
  );

  // ── Build GeoJSON for point markers ──
  // Two sources: lands that never had a geometry, AND lands we used to
  // render as fake diamonds (boundaryApproximate === true). Both deserve
  // a pin at centroid and zero fabricated polygon.
  const pointGeoJSON = useMemo(() => {
    const features = filteredLands
      .filter((land) => (land.geometry == null || land.boundaryApproximate === true) && land.center != null)
      .map((land, idx) => ({
        type: 'Feature' as const,
        id: `pt_${idx}`,
        properties: {
          landId: land.id,
          name: land.name,
          designation: land.designation,
          county: land.county,
          acres: land.acres,
          color: DESIGNATION_COLORS[land.designation] || '#2E7D32',
          approximate: land.boundaryApproximate === true,
        },
        geometry: {
          type: 'Point' as const,
          coordinates: land.center!,
        },
      }));
    return { type: 'FeatureCollection' as const, features };
  }, [filteredLands]);

  // ── Build GeoJSON for shooting ranges ──
  const rangeGeoJSON = useMemo(() => {
    if (!activeFilters.landTypes.range) return { type: 'FeatureCollection' as const, features: [] };
    const features = shootingRanges
      .filter((r) => r.center != null)
      .map((r, idx) => ({
        type: 'Feature' as const,
        id: `range_${idx}`,
        properties: {
          rangeId: r.id,
          name: r.name,
          county: r.county,
          types: r.rangeTypes.join(', '),
        },
        geometry: {
          type: 'Point' as const,
          coordinates: r.center!,
        },
      }));
    return { type: 'FeatureCollection' as const, features };
  }, [activeFilters.landTypes.range]);

  // ── Build GeoJSON for landowner blind sites ──
  const blindGeoJSON = useMemo(() => {
    if (!showBlinds) return { type: 'FeatureCollection' as const, features: [] };
    const features = LANDOWNER_BLINDS
      .filter((b) => b.lat != null && b.lng != null)
      .map((b, idx) => ({
        type: 'Feature' as const,
        id: `blind_${idx}`,
        properties: {
          blindId: b.id,
          permitNumber: b.permitNumber,
          active: b.active,
        },
        geometry: {
          type: 'Point' as const,
          coordinates: [b.lng!, b.lat!],
        },
      }));
    return { type: 'FeatureCollection' as const, features };
  }, [showBlinds]);

  // ── Build GeoJSON for DNR-licensed offshore blinds (tidewater) ──
  // 4687 points. Rendered at minZoomLevel=9 to avoid overwhelming the map at
  // statewide zoom — these are ubiquitous along the bay shoreline.
  const offshoreBlindGeoJSON = useMemo(() => {
    if (!showOffshoreBlinds) return { type: 'FeatureCollection' as const, features: [] };
    const features = MARYLAND_OFFSHORE_BLINDS.map((b, idx) => ({
      type: 'Feature' as const,
      id: `ob_${idx}`,
      properties: {
        offshoreBlindId: b.id,
        licenseNumber: b.licenseNumber ?? null,
      },
      geometry: {
        type: 'Point' as const,
        coordinates: [b.lng, b.lat],
      },
    }));
    return { type: 'FeatureCollection' as const, features };
  }, [showOffshoreBlinds]);

  // ── Build GeoJSON for offshore blind closed-area polygons ──
  // Rendered WITH the offshore blinds (same toggle) because the two datasets
  // must always be interpreted together.
  const offshoreClosureGeoJSON = useMemo(() => {
    if (!showOffshoreBlinds) return { type: 'FeatureCollection' as const, features: [] };
    const features = MARYLAND_OFFSHORE_BLIND_CLOSURES.map((c, idx) => ({
      type: 'Feature' as const,
      id: `obc_${idx}`,
      properties: {
        closureId: c.id,
      },
      geometry: {
        type: 'Polygon' as const,
        coordinates: c.rings,
      },
    }));
    return { type: 'FeatureCollection' as const, features };
  }, [showOffshoreBlinds]);

  // ── Build GeoJSON for late resident goose zones (2 polygons) ──
  const gooseZoneGeoJSON = useMemo(() => {
    if (!showGooseZones) return { type: 'FeatureCollection' as const, features: [] };
    const features = MARYLAND_WATERFOWL_ZONES.map((z, idx) => ({
      type: 'Feature' as const,
      id: `gz_${idx}`,
      properties: {
        zoneId: z.id,
        kind: z.kind,
        name: z.name,
      },
      geometry: {
        type: 'Polygon' as const,
        coordinates: z.rings,
      },
    }));
    return { type: 'FeatureCollection' as const, features };
  }, [showGooseZones]);

  // ── Build GeoJSON for hunt closures (kind-coded fill) ──
  const huntClosureGeoJSON = useMemo(() => {
    if (!showHuntClosures) return { type: 'FeatureCollection' as const, features: [] };
    const features = MARYLAND_HUNT_CLOSURES.map((c, idx) => ({
      type: 'Feature' as const,
      id: `hc_${idx}`,
      properties: {
        closureId: c.id,
        kind: c.kind,
        name: c.name,
        color: HUNT_CLOSURE_COLORS[c.kind],
      },
      geometry: {
        type: 'Polygon' as const,
        coordinates: c.rings,
      },
    }));
    return { type: 'FeatureCollection' as const, features };
  }, [showHuntClosures]);

  // ── Build GeoJSON for 2025 DNR lottery hunt tracts ──
  const lotteryTractGeoJSON = useMemo(() => {
    if (!showLotteryTracts) return { type: 'FeatureCollection' as const, features: [] };
    const features = MARYLAND_HUNT_LOTTERY_TRACTS.map((t, idx) => ({
      type: 'Feature' as const,
      id: `lot_${idx}`,
      properties: {
        tractId: t.id,
        complex: t.complex ?? '',
        complexName: t.complexName ?? '',
        acres: t.acres ?? 0,
      },
      geometry: {
        type: 'Polygon' as const,
        coordinates: t.rings,
      },
    }));
    return { type: 'FeatureCollection' as const, features };
  }, [showLotteryTracts]);

  // ── Build GeoJSON for lottery tract access roads (polylines) ──
  const lotteryRoadGeoJSON = useMemo(() => {
    if (!showLotteryTracts) return { type: 'FeatureCollection' as const, features: [] };
    const features = MARYLAND_HUNT_LOTTERY_ROADS.map((r, idx) => ({
      type: 'Feature' as const,
      id: `lotr_${idx}`,
      properties: {
        roadId: r.id,
      },
      geometry: {
        type: 'MultiLineString' as const,
        coordinates: r.paths,
      },
    }));
    return { type: 'FeatureCollection' as const, features };
  }, [showLotteryTracts]);

  const handleLandPress = (event: any) => {
    const feature = event?.features?.[0];
    if (feature?.properties?.landId) {
      const land = marylandPublicLands.find((l) => l.id === feature.properties.landId);
      if (land) {
        setSelectedLand(land);
        setSelectedRange(null);
      }
    }
  };

  const handleRangePress = (event: any) => {
    const feature = event?.features?.[0];
    if (feature?.properties?.rangeId) {
      const range = shootingRanges.find((r) => r.id === feature.properties.rangeId);
      if (range) {
        setSelectedRange(range);
        setSelectedLand(null);
      }
    }
  };

  const handleBlindPress = (event: any) => {
    const feature = event?.features?.[0];
    if (feature?.properties?.blindId) {
      const blind = LANDOWNER_BLINDS.find((b) => b.id === feature.properties.blindId);
      if (blind) {
        setSelectedBlind(blind);
        setSelectedLand(null);
        setSelectedRange(null);
        setSelectedOffshoreBlind(null);
        setSelectedHuntClosure(null);
        setSelectedLotteryTract(null);
      }
    }
  };

  const clearOtherSelections = () => {
    setSelectedLand(null);
    setSelectedRange(null);
    setSelectedBlind(null);
    setSelectedOffshoreBlind(null);
    setSelectedHuntClosure(null);
    setSelectedLotteryTract(null);
  };

  const handleOffshoreBlindPress = (event: any) => {
    const feature = event?.features?.[0];
    if (feature?.properties?.offshoreBlindId) {
      const b = MARYLAND_OFFSHORE_BLINDS.find((x) => x.id === feature.properties.offshoreBlindId);
      if (b) {
        clearOtherSelections();
        setSelectedOffshoreBlind(b);
      }
    }
  };

  const handleHuntClosurePress = (event: any) => {
    const feature = event?.features?.[0];
    if (feature?.properties?.closureId) {
      const c = MARYLAND_HUNT_CLOSURES.find((x) => x.id === feature.properties.closureId);
      if (c) {
        clearOtherSelections();
        setSelectedHuntClosure(c);
      }
    }
  };

  const handleLotteryTractPress = (event: any) => {
    const feature = event?.features?.[0];
    if (feature?.properties?.tractId) {
      const t = MARYLAND_HUNT_LOTTERY_TRACTS.find((x) => x.id === feature.properties.tractId);
      if (t) {
        clearOtherSelections();
        setSelectedLotteryTract(t);
      }
    }
  };

  const centerCoords =
    location && isInMaryland(location.longitude, location.latitude)
      ? [location.longitude, location.latitude]
      : defaultCenter;

  const mapStyleURL = showTopo
    ? 'mapbox://styles/mapbox/satellite-streets-v12'
    : 'mapbox://styles/mapbox/outdoors-v12';

  const handleZoomIn = () => {
    const newZoom = Math.min(currentZoom + 1, 18);
    setCurrentZoom(newZoom);
    cameraRef.current?.setCamera({ zoomLevel: newZoom, animationDuration: 300 });
  };

  const handleZoomOut = () => {
    const newZoom = Math.max(currentZoom - 1, 3);
    setCurrentZoom(newZoom);
    cameraRef.current?.setCamera({ zoomLevel: newZoom, animationDuration: 300 });
  };

  const handleRegionChange = (feature: any) => {
    if (feature?.properties?.zoomLevel) {
      setCurrentZoom(Math.round(feature.properties.zoomLevel));
    }
  };

  const handleFilterChange = useCallback((newFilters: FilterState) => {
    setActiveFilters(newFilters);
  }, []);

  return (
    <View style={styles.container}>
      {locationLoading && !location ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.oak} />
          <Text style={styles.loadingText}>Getting your location...</Text>
        </View>
      ) : (
        <>
          <MapboxGL.MapView
            ref={mapRef}
            style={styles.map}
            styleURL={mapStyleURL}
            onPress={() => {
              setSelectedLand(null);
              setSelectedRange(null);
              setSelectedBlind(null);
              setSelectedOffshoreBlind(null);
              setSelectedHuntClosure(null);
              setSelectedLotteryTract(null);
            }}
            onLongPress={onLongPressMap}
            onMapIdle={handleRegionChange}
          >
            {/* 2026-04-26 (fork merge): switched to `defaultSettings` so the
                camera is UNCONTROLLED. Passing centerCoordinate/zoomLevel as
                live props made every re-render re-apply the camera, snapping
                the user's drag back to the initial position — that was the
                "I can't pan the map" bug. The cameraRef is still used
                imperatively for zoom buttons and the "ME" recenter, which
                works in either mode. */}
            <MapboxGL.Camera
              ref={cameraRef}
              defaultSettings={{
                centerCoordinate: centerCoords as [number, number],
                zoomLevel:
                  location && isInMaryland(location.longitude, location.latitude)
                    ? 10
                    : 7,
              }}
              animationMode="moveTo"
              animationDuration={800}
            />
            <MapboxGL.UserLocation visible={true} />

            {/* ── 3D Terrain (DEM source + hillshade) ── */}
            {show3D && (
              <>
                <MapboxGL.RasterDemSource
                  id="mapboxDem"
                  url="mapbox://mapbox.mapbox-terrain-dem-v1"
                  tileSize={514}
                  maxZoomLevel={14}
                >
                  <MapboxGL.Terrain
                    exaggeration={terrainExaggeration}
                  />
                  {/* HillshadeLayer — cast needed, type defs lag behind runtime.
                      belowLayerID REMOVED 2026-04-24: when show3D toggled on
                      before the landFill layer had mounted, Mapbox logged
                      "inserting layer failed at position" and the hillshade
                      silently failed to draw. React render order already
                      places this layer first, so omitting belowLayerID is
                      safe and hillshade now always paints under the land
                      polygons. */}
                  {React.createElement((MapboxGL as any).HillshadeLayer, {
                    id: 'hillshade',
                    sourceID: 'mapboxDem',
                    style: {
                      hillshadeIlluminationDirection: 335,
                      hillshadeShadowColor: '#000000',
                      hillshadeHighlightColor: '#ffffff',
                      hillshadeAccentColor: '#4a6741',
                      hillshadeExaggeration: 0.5,
                    },
                  })}
                </MapboxGL.RasterDemSource>
                <MapboxGL.Atmosphere
                  style={{
                    color: 'rgb(186, 210, 235)',
                    highColor: 'rgb(36, 92, 223)',
                    horizonBlend: 0.02,
                    spaceColor: 'rgb(11, 11, 25)',
                    starIntensity: 0.6,
                  }}
                />
                <MapboxGL.SkyLayer
                  id="sky"
                  style={{
                    skyType: 'atmosphere',
                    skyAtmosphereSun: [0, 0],
                    skyAtmosphereSunIntensity: 15,
                  }}
                />
              </>
            )}

            {/* ── Polygon layers for lands with GIS geometry ── */}
            {polygonGeoJSON.features.length > 0 && (
              <MapboxGL.ShapeSource
                id="landPolygons"
                shape={polygonGeoJSON}
                onPress={handleLandPress}
              >
                <MapboxGL.FillLayer
                  id="landFill"
                  minZoomLevel={8}
                  style={{
                    fillColor: ['get', 'color'],
                    fillOpacity: 0.25,
                  }}
                />
                {/* Solid border for authoritative (GIS-sourced) boundaries.
                    There is no longer a dashed-approximate LineLayer — approximate
                    boundaries are never rendered as polygons at all (they render
                    as centroid pins in the point layer). This closes the
                    fabricated-diamond hazard David caught on 2026-04-24. */}
                <MapboxGL.LineLayer
                  id="landBorder"
                  minZoomLevel={8}
                  style={{
                    lineColor: ['get', 'borderColor'],
                    lineWidth: 1.5,
                  }}
                />
                <MapboxGL.SymbolLayer
                  id="landLabels"
                  minZoomLevel={10}
                  style={{
                    textField: ['get', 'name'],
                    textSize: 10,
                    textColor: '#1a1a1a',
                    textHaloColor: '#ffffff',
                    textHaloWidth: 1.2,
                    textFont: ['DIN Pro Medium', 'Arial Unicode MS Regular'],
                    textMaxWidth: 8,
                  }}
                />
              </MapboxGL.ShapeSource>
            )}

            {/* ── Point markers for lands without polygons ── */}
            {pointGeoJSON.features.length > 0 && (
              <MapboxGL.ShapeSource
                id="landPoints"
                shape={pointGeoJSON}
                onPress={handleLandPress}
              >
                <MapboxGL.CircleLayer
                  id="landCirclesOuter"
                  style={{
                    circleRadius: 10,
                    circleColor: '#ffffff',
                    circleStrokeWidth: 2.5,
                    circleStrokeColor: ['get', 'color'],
                    circleOpacity: 1,
                  }}
                />
                <MapboxGL.CircleLayer
                  id="landCirclesInner"
                  style={{
                    circleRadius: 5,
                    circleColor: ['get', 'color'],
                    circleOpacity: 1,
                  }}
                />
                <MapboxGL.SymbolLayer
                  id="landPointLabels"
                  minZoomLevel={10}
                  style={{
                    textField: ['get', 'name'],
                    textSize: 10,
                    textColor: '#1a1a1a',
                    textHaloColor: '#ffffff',
                    textHaloWidth: 1.5,
                    textFont: ['DIN Pro Medium', 'Arial Unicode MS Regular'],
                    textOffset: [0, 1.8],
                    textMaxWidth: 8,
                  }}
                />
              </MapboxGL.ShapeSource>
            )}

            {/* ── Shooting range markers ── */}
            {rangeGeoJSON.features.length > 0 && (
              <MapboxGL.ShapeSource
                id="rangePoints"
                shape={rangeGeoJSON}
                onPress={handleRangePress}
              >
                <MapboxGL.CircleLayer
                  id="rangeCircles"
                  style={{
                    circleRadius: 7,
                    circleColor: DESIGNATION_COLORS.Range,
                    circleStrokeWidth: 2,
                    circleStrokeColor: '#ffffff',
                    circleOpacity: 0.9,
                  }}
                />
                <MapboxGL.SymbolLayer
                  id="rangeLabels"
                  minZoomLevel={10}
                  style={{
                    textField: ['get', 'name'],
                    textSize: 9,
                    textColor: '#E65100',
                    textHaloColor: '#ffffff',
                    textHaloWidth: 1.2,
                    textFont: ['DIN Pro Bold', 'Arial Unicode MS Bold'],
                    textOffset: [0, 1.5],
                    textMaxWidth: 8,
                  }}
                />
              </MapboxGL.ShapeSource>
            )}

            {/* ── Landowner blind sites (togglable) ── */}
            {blindGeoJSON.features.length > 0 && (
              <MapboxGL.ShapeSource
                id="blindPoints"
                shape={blindGeoJSON}
                onPress={handleBlindPress}
              >
                <MapboxGL.CircleLayer
                  id="blindCircles"
                  style={{
                    circleRadius: 6,
                    circleColor: '#8B4513',
                    circleStrokeWidth: 1.5,
                    circleStrokeColor: '#FFFFFF',
                    circleOpacity: 0.85,
                  }}
                />
              </MapboxGL.ShapeSource>
            )}

            {/* ── Offshore blind closed-area polygons (Build 7) ──
                Drawn BELOW the blind points so pins stay tappable. Red fill
                with a solid red outline signals "no blind may be placed here".
                See hunt_data_wave_2026_04_19.md §Why this matters. */}
            {offshoreClosureGeoJSON.features.length > 0 && (
              <MapboxGL.ShapeSource
                id="offshoreClosurePolys"
                shape={offshoreClosureGeoJSON}
              >
                <MapboxGL.FillLayer
                  id="offshoreClosureFill"
                  minZoomLevel={8}
                  style={{
                    fillColor: OFFSHORE_CLOSURE_COLOR,
                    fillOpacity: 0.15,
                  }}
                />
                <MapboxGL.LineLayer
                  id="offshoreClosureLine"
                  minZoomLevel={8}
                  style={{
                    lineColor: OFFSHORE_CLOSURE_COLOR,
                    lineWidth: 1.5,
                    lineOpacity: 0.9,
                  }}
                />
              </MapboxGL.ShapeSource>
            )}

            {/* ── DNR-licensed offshore blinds (tidewater) ──
                4687 points — minZoomLevel=9 to avoid swarming the statewide
                view. Blue so hunters can visually distinguish the tidewater
                regulatory regime from landowner (brown) blinds. */}
            {offshoreBlindGeoJSON.features.length > 0 && (
              <MapboxGL.ShapeSource
                id="offshoreBlindPoints"
                shape={offshoreBlindGeoJSON}
                onPress={handleOffshoreBlindPress}
              >
                <MapboxGL.CircleLayer
                  id="offshoreBlindCircles"
                  minZoomLevel={9}
                  style={{
                    circleRadius: 5,
                    circleColor: OFFSHORE_BLIND_COLOR,
                    circleStrokeWidth: 1.25,
                    circleStrokeColor: '#FFFFFF',
                    circleOpacity: 0.9,
                  }}
                />
              </MapboxGL.ShapeSource>
            )}

            {/* ── Late Resident Goose Zones (Build 7) ──
                Purple semi-transparent fill. These are regulatory polygons
                that extend the resident Canada goose season — a hunter inside
                the polygon may hunt late resident geese; outside, closed. */}
            {gooseZoneGeoJSON.features.length > 0 && (
              <MapboxGL.ShapeSource
                id="gooseZonePolys"
                shape={gooseZoneGeoJSON}
              >
                <MapboxGL.FillLayer
                  id="gooseZoneFill"
                  minZoomLevel={7}
                  style={{
                    fillColor: WATERFOWL_ZONE_COLOR,
                    fillOpacity: 0.12,
                  }}
                />
                <MapboxGL.LineLayer
                  id="gooseZoneLine"
                  minZoomLevel={7}
                  style={{
                    lineColor: WATERFOWL_ZONE_COLOR,
                    lineWidth: 2,
                    lineDasharray: [6, 3],
                    lineOpacity: 0.85,
                  }}
                />
              </MapboxGL.ShapeSource>
            )}

            {/* ── Hunt closures (public-harvest notices, oyster sanctuary,
                new hunting areas) ── Kind-coded fill color via data-driven
                `color` property. Tap opens the closure detail sheet with the
                DNR PDF CTA. */}
            {huntClosureGeoJSON.features.length > 0 && (
              <MapboxGL.ShapeSource
                id="huntClosurePolys"
                shape={huntClosureGeoJSON}
                onPress={handleHuntClosurePress}
              >
                <MapboxGL.FillLayer
                  id="huntClosureFill"
                  minZoomLevel={8}
                  style={{
                    fillColor: ['get', 'color'] as any,
                    fillOpacity: 0.2,
                  }}
                />
                <MapboxGL.LineLayer
                  id="huntClosureLine"
                  minZoomLevel={8}
                  style={{
                    lineColor: ['get', 'color'] as any,
                    lineWidth: 2,
                    lineDasharray: [4, 3],
                    lineOpacity: 0.9,
                  }}
                />
              </MapboxGL.ShapeSource>
            )}

            {/* ── 2025 DNR Lottery Hunt Tracts (niche) ──
                Gold-outlined polygons; tap reveals the tract detail (acres,
                price, winning bidder). Shown only when the user opts in
                because lottery hunts are permit-only and irrelevant to most. */}
            {lotteryTractGeoJSON.features.length > 0 && (
              <MapboxGL.ShapeSource
                id="lotteryTractPolys"
                shape={lotteryTractGeoJSON}
                onPress={handleLotteryTractPress}
              >
                <MapboxGL.FillLayer
                  id="lotteryTractFill"
                  minZoomLevel={10}
                  style={{
                    fillColor: LOTTERY_TRACT_COLOR,
                    fillOpacity: 0.25,
                  }}
                />
                <MapboxGL.LineLayer
                  id="lotteryTractLine"
                  minZoomLevel={10}
                  style={{
                    lineColor: LOTTERY_TRACT_COLOR,
                    lineWidth: 2,
                    lineOpacity: 0.95,
                  }}
                />
              </MapboxGL.ShapeSource>
            )}

            {/* ── Lottery tract access roads ── */}
            {lotteryRoadGeoJSON.features.length > 0 && (
              <MapboxGL.ShapeSource
                id="lotteryRoadLines"
                shape={lotteryRoadGeoJSON}
              >
                <MapboxGL.LineLayer
                  id="lotteryRoadLine"
                  minZoomLevel={10}
                  style={{
                    lineColor: LOTTERY_TRACT_COLOR,
                    lineWidth: 2,
                    lineDasharray: [2, 2],
                    lineOpacity: 0.9,
                  }}
                />
              </MapboxGL.ShapeSource>
            )}

            {/* ── Personal waypoints (Phase A.1b) ──
                User-created pins for hunt mode. Long-press anywhere on the
                map to drop a new one; tap an existing pin to edit. Sits at
                the top of the layer stack so pins stay tappable over any
                land/overlay. */}
            <UserWaypointLayer mode="hunt" onWaypointPress={openWaypointEdit} />

            {/* 2026-04-26: Local-pros pins (Guntry, Bass Pro, archery shops,
                taxidermists). Featured services (David's picks) render in
                gold; others charcoal. Tap to open the detail card. */}
            {showLocalPros && localProsGeoJSON.features.length > 0 && (
              <MapboxGL.ShapeSource
                id="huntLocalPros"
                shape={localProsGeoJSON as any}
                onPress={(e: any) => {
                  const f = e?.features?.[0];
                  if (f?.properties?.id) setSelectedProId(f.properties.id);
                }}
              >
                <MapboxGL.CircleLayer
                  id="huntLocalProsHalo"
                  style={{
                    circleRadius: ['interpolate', ['linear'], ['zoom'], 7, 5, 12, 11, 16, 16],
                    circleColor: '#FFFFFF',
                    circleOpacity: 0.9,
                  }}
                />
                <MapboxGL.CircleLayer
                  id="huntLocalProsCore"
                  style={{
                    circleRadius: ['interpolate', ['linear'], ['zoom'], 7, 3, 12, 7, 16, 11],
                    circleColor: ['get', 'color'],
                    circleStrokeColor: '#000000',
                    circleStrokeWidth: 1,
                  }}
                />
                <MapboxGL.SymbolLayer
                  id="huntLocalProsLabel"
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

            {/* ── Phase D.2: Personal markups (lines + polygons) ──
                User-drawn shoot lanes, blood trails, property boundaries.
                Rendered just below pins so a stand pin still sits on top
                of any shoot lane the user drew through it. */}
            <UserMarkupLayer mode="hunt" onMarkupPress={openMarkupEdit} />

            {/* ── Phase B.2: Scent cones for tree-stand waypoints ──
                Only rendered when the user has toggled cones on in the
                HuntWindPanel. Draws a translucent amber polygon from each
                stand, fanning downwind based on the NOAA forecast wind at
                the selected forecast hour. Suppressed when wind is calm
                (<3 mph) per scentConeGeometry.CALM_THRESHOLD_MPH. */}
            {huntWind.showCones ? (
              <ScentConeLayer
                waypoints={treeStandWaypoints}
                wind={huntWind.wind}
              />
            ) : null}
          </MapboxGL.MapView>

          {/* ── Legend (collapsible — prevents collision with WeatherOverlay
               which sits at top: 50 right: 12). Collapsed = single pill chip
               at top: 12 right: 12; expanded = full swatch list below the
               weather widget at top: 130 right: 12. ── */}
          {legendExpanded ? (
            <View style={styles.legendExpanded}>
              <TouchableOpacity
                style={styles.legendHeader}
                onPress={() => setLegendExpanded(false)}
                accessibilityLabel="Collapse legend"
                accessibilityRole="button"
              >
                <Text style={styles.legendHeaderText}>LEGEND</Text>
                <Text style={styles.legendCollapseText}>▲</Text>
              </TouchableOpacity>
              <View style={styles.legendItem}>
                <View style={[styles.legendSwatch, { backgroundColor: DESIGNATION_COLORS.WMA }]} />
                <Text style={styles.legendLabel}>WMA</Text>
              </View>
              <View style={styles.legendItem}>
                <View style={[styles.legendSwatch, { backgroundColor: DESIGNATION_COLORS.SF }]} />
                <Text style={styles.legendLabel}>Forest</Text>
              </View>
              <View style={styles.legendItem}>
                <View style={[styles.legendSwatch, { backgroundColor: DESIGNATION_COLORS.SP }]} />
                <Text style={styles.legendLabel}>Park</Text>
              </View>
              <View style={styles.legendItem}>
                <View style={[styles.legendSwatch, { backgroundColor: DESIGNATION_COLORS.CFL }]} />
                <Text style={styles.legendLabel}>CFL</Text>
              </View>
              <View style={styles.legendItem}>
                <View style={[styles.legendSwatch, { backgroundColor: DESIGNATION_COLORS.NEA }]} />
                <Text style={styles.legendLabel}>NEA</Text>
              </View>
              <View style={styles.legendItem}>
                <View style={[styles.legendSwatch, { backgroundColor: DESIGNATION_COLORS.Range, borderRadius: 5 }]} />
                <Text style={styles.legendLabel}>Range</Text>
              </View>
              {/* ── Hunt overlay legend (only visible when overlay active) ── */}
              {showOffshoreBlinds && (
                <View style={styles.legendItem}>
                  <View style={[styles.legendSwatch, { backgroundColor: OFFSHORE_BLIND_COLOR, borderRadius: 5 }]} />
                  <Text style={styles.legendLabel}>Water Blind</Text>
                </View>
              )}
              {showOffshoreBlinds && (
                <View style={styles.legendItem}>
                  <View style={[styles.legendSwatch, { backgroundColor: OFFSHORE_CLOSURE_COLOR, opacity: 0.35 }]} />
                  <Text style={styles.legendLabel}>No Blind</Text>
                </View>
              )}
              {showGooseZones && (
                <View style={styles.legendItem}>
                  <View style={[styles.legendSwatch, { backgroundColor: WATERFOWL_ZONE_COLOR, opacity: 0.35 }]} />
                  <Text style={styles.legendLabel}>Goose Zone</Text>
                </View>
              )}
              {showHuntClosures && (
                <View style={styles.legendItem}>
                  <View style={[styles.legendSwatch, { backgroundColor: HUNT_CLOSURE_COLORS.public_harvest_closure, opacity: 0.5 }]} />
                  <Text style={styles.legendLabel}>Closure</Text>
                </View>
              )}
              {showLotteryTracts && (
                <View style={styles.legendItem}>
                  <View style={[styles.legendSwatch, { backgroundColor: LOTTERY_TRACT_COLOR, opacity: 0.5 }]} />
                  <Text style={styles.legendLabel}>Lottery</Text>
                </View>
              )}
            </View>
          ) : (
            <TouchableOpacity
              style={styles.legendCollapsed}
              onPress={() => setLegendExpanded(true)}
              accessibilityLabel="Expand legend"
              accessibilityRole="button"
            >
              <Text style={styles.legendCollapsedText}>LEGEND ▼</Text>
            </TouchableOpacity>
          )}

          {/* ── Phase B.2: Hunt wind panel (top-right, below legend) ──
               Fetches NOAA wind for the map-center + selected forecast
               hour, and owns the Scent-cones toggle. State is pushed up
               via onChange so ScentConeLayer (inside the MapView) can
               render the resulting cones. */}
          <View style={styles.windPanelContainer}>
            <HuntWindPanel
              mapCenter={huntWindCenter}
              onChange={setHuntWind}
            />
          </View>

          {/* ── Land Count Badge (Top Left) ── */}
          <View style={styles.countBadge}>
            <Text style={styles.countText}>
              {filteredLands.length} of {DATA_STATS.totalLands} lands
              {(hasActiveSpeciesFilter || hasActiveWeaponFilter || hasActiveAccessFilter) ? ' (filtered)' : ''}
            </Text>
            <Text style={styles.countSubtext}>
              {DATA_STATS.withPolygons} boundaries · {DATA_STATS.totalRanges} ranges
            </Text>
          </View>

          {/*
            ── Filters popover (Below Land Count) ──
            MapFilterPanel owns its own absolute positioning
            (`panelContainer` ⟶ left:12, top:70). We render it directly so
            that positioning resolves against the map container rather than
            a nested wrapper. The chip row below sits further down.
          */}
          <MapFilterPanel
            onFilterChange={handleFilterChange}
            landCount={marylandPublicLands.length}
            filteredCount={filteredLands.length}
          />

          {/*
            ── Overlay toggle chips (horizontal scrollable row) ──
            Rendered as a pill row below the count badge. Horizontal layout
            fits the six 5–6 char labels without mid-word wrapping that the
            old circular 44×44 chips caused. ScrollView keeps everything on
            screen on smaller devices.
          */}
          {/*
            2026-04-30 (V2.4 audit): the previous horizontal ScrollView
            of 6 toggle chips (Blinds / Water / Geese / Closed / Lotto /
            Pros) clipped on iPhone 17 Pro Max — only 4-5 chips were
            visible at a time and the rightmost truncated mid-word. Per
            user directive, replaced with a single FilterPicker that
            opens a bottom sheet listing every overlay as a Switch row.
            Active count appears in the trigger label so the user knows
            at a glance how many overlays are on. Same options, cleaner
            chrome, scales identically across screen sizes.
          */}
          <View style={styles.overlayPickerWrap} pointerEvents="box-none">
            <FilterPicker
              triggerLabel="Overlays"
              title="Map Overlays"
              options={[
                {
                  key: 'blinds',
                  label: 'Landowner Blinds',
                  hint: 'Licensed waterfowl blinds (2,000+)',
                  active: showBlinds,
                },
                {
                  key: 'water',
                  label: 'Waterfowl Closures',
                  hint: 'Offshore blinds + sanctuary boundaries',
                  active: showOffshoreBlinds,
                },
                {
                  key: 'geese',
                  label: 'Goose Zones',
                  hint: 'Atlantic Population area boundaries',
                  active: showGooseZones,
                },
                {
                  key: 'closed',
                  label: 'Hunt Closures',
                  hint: 'Active no-hunt areas',
                  active: showHuntClosures,
                },
                {
                  key: 'lotto',
                  label: 'Lottery Tracts',
                  hint: 'Permit-required hunts',
                  active: showLotteryTracts,
                },
                {
                  key: 'pros',
                  label: 'Local Pros',
                  hint: 'Guntry, archery shops, processors, taxidermists',
                  active: showLocalPros,
                },
              ]}
              onChange={(key, next) => {
                switch (key) {
                  case 'blinds':
                    setShowBlinds(next);
                    break;
                  case 'water':
                    setShowOffshoreBlinds(next);
                    break;
                  case 'geese':
                    setShowGooseZones(next);
                    break;
                  case 'closed':
                    setShowHuntClosures(next);
                    break;
                  case 'lotto':
                    setShowLotteryTracts(next);
                    break;
                  case 'pros':
                    setShowLocalPros(next);
                    break;
                }
              }}
              onClearAll={() => {
                setShowBlinds(false);
                setShowOffshoreBlinds(false);
                setShowGooseZones(false);
                setShowHuntClosures(false);
                setShowLotteryTracts(false);
                setShowLocalPros(false);
              }}
            />
          </View>

          {/* ── Map Controls (Bottom Right) ── */}
          <View style={styles.mapControls}>
            <TouchableOpacity
              style={[styles.controlButton, show3D && styles.controlButtonActive]}
              onPress={() => setShow3D(!show3D)}
              activeOpacity={0.7}
            >
              <Text style={[styles.controlButtonLabel, show3D && styles.controlButtonLabelActive]}>
                3D
              </Text>
            </TouchableOpacity>
            {show3D && (
              <TouchableOpacity
                style={styles.controlButton}
                onPress={() => {
                  const levels = [0.5, 1.0, 1.5, 2.0, 3.0];
                  const idx = levels.indexOf(terrainExaggeration);
                  const next = levels[(idx + 1) % levels.length];
                  setTerrainExaggeration(next);
                }}
                activeOpacity={0.7}
              >
                <Text style={styles.controlButtonLabel}>{terrainExaggeration}x</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              style={[styles.controlButton, showTopo && styles.controlButtonActive]}
              onPress={() => setShowTopo(!showTopo)}
              activeOpacity={0.7}
            >
              <Text style={[styles.controlButtonLabel, showTopo && styles.controlButtonLabelActive]}>
                {showTopo ? 'MAP' : 'SAT'}
              </Text>
            </TouchableOpacity>
            {/* Personal Layer Hub (waypoints, tracks, markups) */}
            <TouchableOpacity
              style={styles.controlButton}
              onPress={openPersonalHub}
              activeOpacity={0.7}
            >
              <Text style={styles.controlButtonLabel}>ME</Text>
            </TouchableOpacity>
            {/* GPS Button with crosshair symbol */}
            <TouchableOpacity
              style={styles.controlButton}
              onPress={() => {
                if (location) {
                  cameraRef.current?.setCamera({
                    centerCoordinate: [location.longitude, location.latitude],
                    zoomLevel: 10,
                    animationDuration: 500,
                  });
                } else {
                  Alert.alert(
                    'Location Services',
                    'Enable location access in Settings > Privacy > Location Services to see your position.',
                    [
                      { text: 'Open Settings', onPress: () => Linking.openURL('app-settings:') },
                      { text: 'OK', style: 'cancel' },
                    ]
                  );
                }
              }}
              activeOpacity={0.7}
            >
              <Text style={styles.controlButtonLabel}>⌖</Text>
            </TouchableOpacity>
          </View>

          {/* 2026-04-26 (zoom relocation): Zoom buttons split out of the
              controls column and moved to a tight bottom-right pair just
              above the search bar. Vertical, + on top of −, in canonical
              order. The previous mid-screen position blocked map content. */}
          <View style={styles.zoomControls}>
            <TouchableOpacity
              style={styles.controlButton}
              onPress={handleZoomIn}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel="Zoom in"
            >
              <ZoomIcon variant="plus" color={Colors.textPrimary} size={20} />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.controlButton}
              onPress={handleZoomOut}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel="Zoom out"
            >
              <ZoomIcon variant="minus" color={Colors.textPrimary} size={20} />
            </TouchableOpacity>
          </View>

          {/* ── Selected land info panel ── */}
          {selectedLand && (
            <LandDetailPanel
              land={selectedLand}
              onClose={() => setSelectedLand(null)}
              navigation={navigation}
            />
          )}

          {/* ── Selected range info panel ── */}
          {selectedRange && (
            <RangeDetailPanel
              range={selectedRange}
              onClose={() => setSelectedRange(null)}
            />
          )}

          {/* ── Selected blind info panel ── */}
          {selectedBlind && (
            <BlindDetailPanel
              blind={selectedBlind}
              onClose={() => setSelectedBlind(null)}
            />
          )}

          {/* ── Selected offshore (tidewater) blind info panel ── */}
          {selectedOffshoreBlind && (
            <OffshoreBlindDetailPanel
              blind={selectedOffshoreBlind}
              onClose={() => setSelectedOffshoreBlind(null)}
            />
          )}

          {/* ── Selected hunt-closure info panel ── */}
          {selectedHuntClosure && (
            <HuntClosureDetailPanel
              closure={selectedHuntClosure}
              onClose={() => setSelectedHuntClosure(null)}
            />
          )}

          {/* ── Selected lottery-tract info panel ── */}
          {selectedLotteryTract && (
            <LotteryTractDetailPanel
              tract={selectedLotteryTract}
              onClose={() => setSelectedLotteryTract(null)}
            />
          )}

          {/* 2026-04-26: Selected local-pro card. Tap a Pros pin (Guntry,
              Bass Pro, archery shop, taxidermist, outfitter) to see contact
              info + offerings + tap-through to website / phone. */}
          {selectedPro && (
            <View style={styles.proCard}>
              <View style={styles.proCardHeader}>
                <Text style={styles.proCardName} numberOfLines={2}>
                  {selectedPro.name}
                </Text>
                <TouchableOpacity onPress={() => setSelectedProId(null)}>
                  <Text style={styles.proCardClose}>✕</Text>
                </TouchableOpacity>
              </View>
              <Text style={styles.proCardCat}>
                {selectedPro.category.replace('-', ' ')}
                {selectedPro.featured ? ' · ★ recommended' : ''}
              </Text>
              <Text style={styles.proCardDesc} numberOfLines={4}>
                {selectedPro.description}
              </Text>
              <Text style={styles.proCardOff} numberOfLines={2}>
                {selectedPro.offerings}
              </Text>
              {selectedPro.address ? (
                <Text style={styles.proCardAddr}>{selectedPro.address}</Text>
              ) : null}
              <View style={styles.proCardBtns}>
                {selectedPro.phone ? (
                  <TouchableOpacity
                    style={[styles.proCardBtn, { backgroundColor: Colors.moss }]}
                    onPress={() => Linking.openURL('tel:' + selectedPro.phone).catch(() => {})}
                  >
                    <Text style={styles.proCardBtnText}>Call</Text>
                  </TouchableOpacity>
                ) : null}
                {selectedPro.website ? (
                  <TouchableOpacity
                    style={[styles.proCardBtn, { backgroundColor: '#1A3A5C' }]}
                    onPress={() => Linking.openURL(selectedPro.website!).catch(() => {})}
                  >
                    <Text style={styles.proCardBtnText}>Website</Text>
                  </TouchableOpacity>
                ) : null}
              </View>
            </View>
          )}

          {/* ── Weather overlay (top-right) ── */}
          {location && (
            <WeatherOverlay
              latitude={location.latitude}
              longitude={location.longitude}
              visible={
                !selectedLand &&
                !selectedRange &&
                !selectedBlind &&
                !selectedOffshoreBlind &&
                !selectedHuntClosure &&
                !selectedLotteryTract
              }
            />
          )}

          {/* ── Search Bar (Bottom, Above Disclaimer) ──
               bottom offset is dynamic so dismissing either banner lets the
               search bar slide down and reclaim space. */}
          <View
            style={[
              styles.searchBarContainer,
              {
                bottom:
                  8 +
                  (anyPinOnlyLands && !approxBannerDismissed ? 28 : 0) +
                  (!disclaimerDismissed ? 32 : 0),
              },
            ]}
          >
            <TextInput
              style={styles.searchInput}
              placeholder="Search lands by name..."
              placeholderTextColor={Colors.textSecondary}
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
          </View>
        </>
      )}

      {anyPinOnlyLands && !approxBannerDismissed ? (
        <View style={styles.approxBanner}>
          <Text style={styles.approxBannerText}>
            Lands shown as pins have no published GIS boundary — tap the pin, then use the DNR map PDF link on the detail sheet for exact land edges before hunting.
          </Text>
          <TouchableOpacity
            style={styles.bannerDismissBtn}
            onPress={() => setApproxBannerDismissed(true)}
            accessibilityLabel="Dismiss approximate boundary warning"
            accessibilityRole="button"
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Text style={styles.bannerDismissText}>✕</Text>
          </TouchableOpacity>
        </View>
      ) : null}

      <DisclaimerBanner
        dismissed={disclaimerDismissed}
        onDismiss={() => setDisclaimerDismissed(true)}
      />

      <OnboardingTourGate mode="hunt" />
    </View>
  );
}

/**
 * LandDetailPanel — Slide-up detail view for a selected public land.
 *
 * Displays comprehensive land information: name, designation, county, acreage, tags (Sunday OK,
 * ADA access, etc.), species/weapons allowed, contact info, parking locations, reservation details,
 * and action buttons to open DNR website or PDF maps.
 *
 * @param {Object} props - Component props
 * @param {MarylandPublicLand} props.land - Land object with full metadata
 * @param {Function} props.onClose - Callback to close the detail panel
 * @returns {JSX.Element} Scrollable detail panel with close button
 */
/**
 * Returns an Apple Maps URL targeted at the best-known coordinate for a land.
 * Priority: first parking location with lat/lng → land.center → null. The
 * 1-tap Directions button depends on this; falling through to null hides the
 * button rather than opening a misleading pin.
 */
function buildLandDirectionsUrl(land: MarylandPublicLand): string | null {
  const parkCoord =
    land.parking && land.parking.length > 0 &&
    typeof (land.parking[0] as any).lat === 'number' &&
    typeof (land.parking[0] as any).lng === 'number'
      ? [(land.parking[0] as any).lat, (land.parking[0] as any).lng]
      : null;
  const centerCoord = land.center ? [land.center[1], land.center[0]] : null; // GeoJSON [lng,lat] → Apple Maps [lat,lng]
  const coord = parkCoord || centerCoord;
  if (!coord) return null;
  return `http://maps.apple.com/?daddr=${coord[0]},${coord[1]}&q=${encodeURIComponent(land.name)}`;
}

function LandDetailPanel({
  land,
  onClose,
  navigation,
}: {
  land: MarylandPublicLand;
  onClose: () => void;
  navigation: any;
}) {
  const directionsUrl = buildLandDirectionsUrl(land);
  const weatherCoord = land.center
    ? { lat: land.center[1], lon: land.center[0] }
    : null;
  return (
    <View style={detailStyles.panel}>
      <TouchableOpacity style={detailStyles.closeBtn} onPress={onClose}>
        <Text style={detailStyles.closeBtnText}>✕</Text>
      </TouchableOpacity>
      <ScrollView style={detailStyles.scrollArea} showsVerticalScrollIndicator={false}>
        <Text style={detailStyles.name}>{land.name}</Text>
        <Text style={detailStyles.subtitle}>
          {land.designationFull} · {land.county} County
          {land.acres ? ` · ${land.acres.toLocaleString()} ac` : ''}
        </Text>

        <View style={detailStyles.tagRow}>
          {land.sundayHunting && <Tag label="Sunday OK" color="#2E7D32" />}
          {land.reservationRequired && <Tag label="Reservation Req." color="#E65100" />}
          {land.freePermitRequired && <Tag label="Free Permit" color="#0277BD" />}
          {land.mobilityImpaired && <Tag label="ADA Access" color="#6A1B9A" />}
          {land.vehicleHunting && <Tag label="Vehicle" color="#33691E" />}
          {land.boatAccessOnly && <Tag label="Boat Only" color="#01579B" />}
          {land.trappingAllowed && <Tag label="Trapping" color="#4E342E" />}
          {land.shootingRange && <Tag label="Range" color="#F57F17" />}
        </View>

        {/* Approximate-boundary warning. Shown whenever the stored geometry is a hand-traced
            placeholder, octagonal stub, or diamond marker. The user is directed to the DNR PDF
            as the authoritative source. See DATA_QUALITY_METHODOLOGY.md §3. */}
        {land.boundaryApproximate && (
          <View style={detailStyles.approxBanner}>
            <Text style={detailStyles.approxBannerTitle}>Approximate boundary</Text>
            <Text style={detailStyles.approxBannerBody}>
              The outline on the map is a placeholder. Verify the real boundary using the DNR map PDF before planning access or legal hunting zones.
            </Text>
          </View>
        )}

        {land.description && (
          <Text style={detailStyles.description}>{land.description}</Text>
        )}

        {land.huntableSpecies.length > 0 && (
          <Text style={detailStyles.infoLine}>
            Species: {land.huntableSpecies.join(', ')}
          </Text>
        )}
        {land.allowedWeapons.length > 0 && (
          <Text style={detailStyles.infoLine}>
            Weapons: {land.allowedWeapons.join(', ')}
          </Text>
        )}

        {land.contact && (
          <TouchableOpacity onPress={() => Linking.openURL(`tel:${land.contact}`)}>
            <Text style={detailStyles.link}>Call: {land.contact}</Text>
          </TouchableOpacity>
        )}

        {land.reservationInfo && (
          <Text style={detailStyles.infoLine}>Reservation: {land.reservationInfo}</Text>
        )}

        {land.accessNotes && (
          <Text style={detailStyles.infoLine}>Access: {land.accessNotes}</Text>
        )}

        {land.parking && land.parking.length > 0 && (
          <View style={detailStyles.parkingSection}>
            <Text style={detailStyles.sectionLabel}>Parking:</Text>
            {land?.parking?.map((p: ParkingLocation, i: number) => (
              <Text key={i} style={detailStyles.parkingItem}>
                {'\u2022'} {p.description}{p.notes ? ` (${p.notes})` : ''}
              </Text>
            ))}
          </View>
        )}

        {land.notes && (
          <Text style={detailStyles.notes}>{land.notes}</Text>
        )}

        {/* 2026-04-27: Local Pros section. Joins servicesForRegion against
            the land's county so taxidermists / processors / outfitters /
            archery shops local to this WMA surface here. Tap a row to open
            website / phone. Same pattern as Fish hotspot card. */}
        {(() => {
          const pros = servicesForRegion(land.county + ' County').slice(0, 3);
          if (pros.length === 0) return null;
          return (
            <View style={detailStyles.parkingSection}>
              <Text style={detailStyles.sectionLabel}>
                Local pros for {land.county} County
              </Text>
              {pros.map((p) => (
                <TouchableOpacity
                  key={p.id}
                  onPress={() => {
                    if (p.website) Linking.openURL(p.website).catch(() => {});
                    else if (p.phone)
                      Linking.openURL('tel:' + p.phone).catch(() => {});
                  }}
                  activeOpacity={0.7}
                  accessibilityRole="button"
                  accessibilityLabel={`Open ${p.name}`}
                  style={{ paddingVertical: 4 }}
                >
                  <Text style={[detailStyles.infoLine, { color: Colors.lichen, fontWeight: '600' }]}>
                    {p.name}
                  </Text>
                  <Text style={[detailStyles.infoLine, { fontSize: 11, color: Colors.textMuted }]}>
                    {p.category.replace('-', ' ')} · {p.city}
                    {p.phone ? ' · ' + p.phone : ''}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          );
        })()}

        {/* 2026-04-29: "What we use here" CTA — taps deep-link into the AI
            tab pre-populated with a hunt-specific gear query. The AI's
            response splices the Amazon-affiliate footer via
            augmentWithHuntGearSuggestions in chatKnowledge.ts. End-to-end
            monetization path: land detail → tap CTA → AI chat → affiliate
            links. Mirrors the FishMapScreen hotspot-detail pattern. */}
        {(() => {
          const topSpecies = land.huntableSpecies?.[0];
          if (!topSpecies) return null;
          const query = `Best gear for ${topSpecies} on ${land.name}?`;
          return (
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel={`Ask AI: ${query}`}
              onPress={() => {
                navigation.navigate('ChatTab', {
                  screen: 'ChatMain',
                  params: { initialQuery: query },
                });
              }}
              activeOpacity={0.7}
              style={detailStyles.gearCta}
            >
              <Text style={detailStyles.gearCtaTitle}>
                💡 What we use here →
              </Text>
              <Text style={detailStyles.gearCtaSubtitle}>{query}</Text>
            </TouchableOpacity>
          );
        })()}

        {/* Primary-action row — 1-tap shortcuts to the three utilities every
            hunter needs on a stand day: driving directions, forecast, and
            regulations. See audits/2026-04-17-evening-comprehensive.md §D. */}
        <View style={detailStyles.linkRow}>
          {directionsUrl && (
            <TouchableOpacity
              style={detailStyles.primaryButton}
              onPress={() => Linking.openURL(directionsUrl)}
            >
              <Text style={detailStyles.primaryButtonText}>Directions</Text>
            </TouchableOpacity>
          )}
          {weatherCoord && (
            <TouchableOpacity
              style={detailStyles.primaryButton}
              onPress={() =>
                navigation.navigate('Weather', {
                  lat: weatherCoord.lat,
                  lon: weatherCoord.lon,
                  context: 'hunt',
                  locationName: land.name,
                })
              }
            >
              <Text style={detailStyles.primaryButtonText}>Weather</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity
            style={detailStyles.primaryButton}
            onPress={() =>
              navigation.navigate('ResourcesTab', {
                screen: 'ResourcesMain',
                params: { initialSegment: 'regulations', landId: land.id },
              })
            }
          >
            <Text style={detailStyles.primaryButtonText}>Regulations</Text>
          </TouchableOpacity>
        </View>
        <View style={detailStyles.linkRow}>
          {land.websiteUrl && (
            <TouchableOpacity
              style={detailStyles.linkButton}
              onPress={() => Linking.openURL(land.websiteUrl!)}
            >
              <Text style={detailStyles.linkButtonText}>DNR Page</Text>
            </TouchableOpacity>
          )}
          {land.dnrMapPdf && (
            <TouchableOpacity
              style={detailStyles.linkButton}
              onPress={() => Linking.openURL(land.dnrMapPdf!)}
            >
              <Text style={detailStyles.linkButtonText}>Map PDF</Text>
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

/**
 * RangeDetailPanel — Slide-up detail view for a selected shooting range.
 *
 * Displays shooting range information: name, county, range types (e.g., Pistol, Rifle),
 * public/member access, address, hours, fees, phone contact, and website link.
 *
 * @param {Object} props - Component props
 * @param {ShootingRange} props.range - Range object with full metadata
 * @param {Function} props.onClose - Callback to close the detail panel
 * @returns {JSX.Element} Detail panel with range info and contact actions
 */
function RangeDetailPanel({ range, onClose }: { range: ShootingRange; onClose: () => void }) {
  return (
    <View style={detailStyles.panel}>
      <TouchableOpacity style={detailStyles.closeBtn} onPress={onClose}>
        <Text style={detailStyles.closeBtnText}>✕</Text>
      </TouchableOpacity>
      <Text style={detailStyles.name}>{range.name}</Text>
      <Text style={detailStyles.subtitle}>
        Shooting Range · {range.county} County
      </Text>
      <View style={detailStyles.tagRow}>
        {range.rangeTypes.map((t, i) => (
          <Tag key={i} label={t} color="#F57F17" />
        ))}
        <Tag label={range.isPublic ? 'Public' : 'Members'} color={range.isPublic ? '#2E7D32' : '#E65100'} />
      </View>
      {range.address && <Text style={detailStyles.infoLine}>{range.address}</Text>}
      {range.hours && <Text style={detailStyles.infoLine}>Hours: {range.hours}</Text>}
      {range.fees && <Text style={detailStyles.infoLine}>Fees: {range.fees}</Text>}
      {range.phone && (
        <TouchableOpacity onPress={() => Linking.openURL(`tel:${range.phone}`)}>
          <Text style={detailStyles.link}>Call: {range.phone}</Text>
        </TouchableOpacity>
      )}
      {range.notes && <Text style={detailStyles.notes}>{range.notes}</Text>}
      {range.websiteUrl && (
        <TouchableOpacity
          style={detailStyles.linkButton}
          onPress={() => Linking.openURL(range.websiteUrl!)}
        >
          <Text style={detailStyles.linkButtonText}>Website</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

/**
 * BlindDetailPanel — Slide-up detail view for a selected landowner blind site.
 *
 * Displays blind site information: permit number, location coordinates, and active status.
 *
 * @param {Object} props - Component props
 * @param {LandownerBlind} props.blind - Blind object with location and permit info
 * @param {Function} props.onClose - Callback to close the detail panel
 * @returns {JSX.Element} Detail panel with blind info
 */
function BlindDetailPanel({ blind, onClose }: { blind: LandownerBlind; onClose: () => void }) {
  return (
    <View style={detailStyles.panel}>
      <TouchableOpacity style={detailStyles.closeBtn} onPress={onClose}>
        <Text style={detailStyles.closeBtnText}>✕</Text>
      </TouchableOpacity>
      <Text style={detailStyles.name}>Blind Site</Text>
      <Text style={detailStyles.subtitle}>
        Landowner Blind · Maryland DNR
      </Text>
      <View style={detailStyles.tagRow}>
        <Tag label={blind.active ? 'Active' : 'Inactive'} color={blind.active ? '#2E7D32' : '#999999'} />
      </View>
      {blind.permitNumber && (
        <Text style={detailStyles.infoLine}>Permit: {blind.permitNumber}</Text>
      )}
      <Text style={detailStyles.infoLine}>
        Latitude: {blind.lat.toFixed(6)}
      </Text>
      <Text style={detailStyles.infoLine}>
        Longitude: {blind.lng.toFixed(6)}
      </Text>
      <Text style={detailStyles.notes}>
        Verify access and regulations with MD DNR before planning your hunt.
      </Text>
    </View>
  );
}

/**
 * OffshoreBlindDetailPanel — Licensed tidewater duck/goose blind.
 *
 * MD law requires ≥500 yds from any other licensed offshore blind when
 * placing a new blind, so the license number is the key datum here. The
 * closed-area polygons on the same map tell the user where a new blind may
 * not be placed regardless of spacing.
 */
function OffshoreBlindDetailPanel({
  blind,
  onClose,
}: {
  blind: OffshoreBlind;
  onClose: () => void;
}) {
  return (
    <View style={detailStyles.panel}>
      <TouchableOpacity style={detailStyles.closeBtn} onPress={onClose}>
        <Text style={detailStyles.closeBtnText}>✕</Text>
      </TouchableOpacity>
      <Text style={detailStyles.name}>Offshore Blind</Text>
      <Text style={detailStyles.subtitle}>
        Tidewater Licensed · Maryland DNR
      </Text>
      <View style={detailStyles.tagRow}>
        <Tag label="Licensed" color={OFFSHORE_BLIND_COLOR} />
      </View>
      {blind.licenseNumber != null && (
        <Text style={detailStyles.infoLine}>License: {blind.licenseNumber}</Text>
      )}
      <Text style={detailStyles.infoLine}>
        Latitude: {blind.lat.toFixed(6)}
      </Text>
      <Text style={detailStyles.infoLine}>
        Longitude: {blind.lng.toFixed(6)}
      </Text>
      <Text style={detailStyles.notes}>
        New blinds must be placed at least 500 yards from any other licensed offshore blind. Red-outlined polygons are closed areas where no offshore blind may be placed.
      </Text>
    </View>
  );
}

/**
 * HuntClosureDetailPanel — DNR-published closure polygon.
 *
 * Three kinds: `public_harvest_closure` (regulatory notice with PDF),
 * `oyster_sanctuary` (IBR citation, open-ended), `new_hunting_area` (DNR
 * seasonal). The DNR PDF URL is the authoritative source, so it surfaces as
 * a prominent primary CTA — the polygon alone is not enough to know the
 * scope of the closure.
 */
function HuntClosureDetailPanel({
  closure,
  onClose,
}: {
  closure: HuntClosure;
  onClose: () => void;
}) {
  const kindLabel =
    closure.kind === 'public_harvest_closure'
      ? 'Public Harvest Closure'
      : closure.kind === 'oyster_sanctuary'
        ? 'Oyster Sanctuary'
        : 'New Hunting Area';
  const color = HUNT_CLOSURE_COLORS[closure.kind];
  return (
    <View style={detailStyles.panel}>
      <TouchableOpacity style={detailStyles.closeBtn} onPress={onClose}>
        <Text style={detailStyles.closeBtnText}>✕</Text>
      </TouchableOpacity>
      <ScrollView style={detailStyles.scrollArea} showsVerticalScrollIndicator={false}>
        <Text style={detailStyles.name}>{closure.name}</Text>
        <Text style={detailStyles.subtitle}>
          {kindLabel} · Maryland DNR
        </Text>
        <View style={detailStyles.tagRow}>
          <Tag label={kindLabel} color={color} />
          {closure.startDate && <Tag label={`From ${closure.startDate}`} color="#0277BD" />}
          {closure.endDate && <Tag label={`Until ${closure.endDate}`} color="#0277BD" />}
          {!closure.endDate && closure.startDate && <Tag label="Open-ended" color="#E65100" />}
        </View>
        {closure.notes && (
          <Text style={detailStyles.description}>{closure.notes}</Text>
        )}
        <Text style={detailStyles.notes}>
          Polygons are DNR reference geometry. Read the full notice for the binding regulatory scope and exceptions.
        </Text>
        {closure.url && (
          <View style={detailStyles.linkRow}>
            <TouchableOpacity
              style={detailStyles.primaryButton}
              onPress={() => Linking.openURL(closure.url!)}
            >
              <Text style={detailStyles.primaryButtonText}>Read DNR Notice</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

/**
 * LotteryTractDetailPanel — 2025 DNR permit-only lottery hunt tract.
 *
 * Niche dataset (2 tracts). Tap exposes complex name, tract id, acres, and
 * winning bid — DNR publishes these as part of the auction results.
 */
function LotteryTractDetailPanel({
  tract,
  onClose,
}: {
  tract: HuntLotteryTract;
  onClose: () => void;
}) {
  return (
    <View style={detailStyles.panel}>
      <TouchableOpacity style={detailStyles.closeBtn} onPress={onClose}>
        <Text style={detailStyles.closeBtnText}>✕</Text>
      </TouchableOpacity>
      <Text style={detailStyles.name}>
        {tract.complexName || 'Lottery Tract'}
      </Text>
      <Text style={detailStyles.subtitle}>
        2025 Hunting Tract Lottery · Maryland DNR
      </Text>
      <View style={detailStyles.tagRow}>
        <Tag label="Permit Only" color={LOTTERY_TRACT_COLOR} />
        {tract.complex && <Tag label={`Complex ${tract.complex}`} color="#0277BD" />}
      </View>
      {tract.tract && (
        <Text style={detailStyles.infoLine}>Tract: {tract.tract}</Text>
      )}
      {tract.acres != null && (
        <Text style={detailStyles.infoLine}>Acres: {tract.acres}</Text>
      )}
      {tract.pricePerAcre != null && (
        <Text style={detailStyles.infoLine}>
          Price/acre: ${tract.pricePerAcre.toFixed(2)}
        </Text>
      )}
      {tract.totalPrice != null && (
        <Text style={detailStyles.infoLine}>
          Total: ${tract.totalPrice.toFixed(2)}
        </Text>
      )}
      <Text style={detailStyles.notes}>
        Lottery hunts are permit-only and awarded by DNR auction. Access roads shown as dashed gold lines.
      </Text>
    </View>
  );
}

/**
 * Tag — Colored badge component for displaying land attributes.
 *
 * Renders small colored tags (e.g., "Sunday OK", "ADA Access", "Free Permit") on land detail panels.
 *
 * @param {Object} props - Component props
 * @param {string} props.label - Text label to display
 * @param {string} props.color - Hex color code for background and text
 * @returns {JSX.Element} Colored badge with transparent background
 */
function Tag({ label, color }: { label: string; color: string }) {
  return (
    <View style={[detailStyles.tag, { backgroundColor: color + '22', borderColor: color }]}>
      <Text style={[detailStyles.tagText, { color }]}>{label}</Text>
    </View>
  );
}

// ── Main Styles ──
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  map: { flex: 1 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { color: Colors.textSecondary, marginTop: 12, fontSize: 14 },
  // ── Legend (top-right, collapsible) ──
  // Collapsed pill sits above the WeatherOverlay (which starts at top: 50);
  // expanded panel drops below the weather widget so the two never overlap.
  // Phase B.2 — Hunt wind + scent-cone panel.
  // Anchored mid-right, below the WeatherOverlay (top:50) and legend
  // collapsed pill (top:12). Width is capped so the slider/toggle stay
  // readable on iPhone SE class devices.
  windPanelContainer: {
    // 2026-04-26 (fork merge, second pass): pulled up from top:200 → top:90
    // (just below the weather widget at top:50, before the filter chip row at
    // top:130). Anchored RIGHT so it stays in the right gutter alongside the
    // legend + weather. Expanded panel grows downward from here. zIndex
    // bumped above WeatherOverlay (zIndex:100) so the expanded panel covers
    // it cleanly while the user is interacting with wind controls.
    position: 'absolute',
    top: 90,
    right: 12,
    zIndex: 105,
    maxWidth: 200,
  },
  legendCollapsed: {
    position: 'absolute', top: 12, right: 12,
    backgroundColor: Colors.overlay, borderRadius: 16,
    paddingHorizontal: 12, paddingVertical: 6,
    borderWidth: 1, borderColor: Colors.clay,
    elevation: 3, shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3, shadowRadius: 3,
    zIndex: 11,
  },
  legendCollapsedText: {
    fontSize: 11, fontWeight: '800', color: Colors.textPrimary,
    letterSpacing: 0.5,
  },
  legendExpanded: {
    // 2026-04-26 (fork merge): expanded panel was at top:130, jumping 118px
    // away from the collapsed pill at top:12. Now anchored at the SAME
    // top so it grows downward in place. zIndex bumped above WeatherOverlay
    // (which sits at zIndex:100) so the expanded legend can briefly cover
    // the weather widget while it's open — that's an acceptable trade
    // because the user is actively interacting with the legend.
    position: 'absolute', top: 12, right: 12,
    backgroundColor: Colors.overlay, borderRadius: 8, padding: 8,
    flexDirection: 'column', gap: 4,
    maxWidth: 138,
    borderWidth: 1, borderColor: Colors.clay,
    elevation: 4, shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.35, shadowRadius: 4,
    zIndex: 110,
  },
  legendHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingBottom: 4, marginBottom: 2,
    borderBottomWidth: 1, borderBottomColor: Colors.clay,
  },
  legendHeaderText: {
    fontSize: 10, fontWeight: '800', color: Colors.textPrimary,
    letterSpacing: 0.5,
  },
  legendCollapseText: {
    fontSize: 10, color: Colors.textSecondary, fontWeight: '700',
  },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  legendSwatch: { width: 12, height: 12, borderRadius: 2, opacity: 0.8 },
  legendLabel: { fontSize: 10, color: Colors.textPrimary, fontWeight: '600' },

  // ── Land Count Badge (Top Left) ──
  // 2026-04-30 (V2.4 audit): pushed from top:12 to top:46 because the
  // Mapbox scale ruler renders at top-left by default (~28pt tall) and
  // was overlapping the badge text. The user reported it as a visual
  // bug. The scale ruler can't be cleanly positioned in @rnmapbox/maps
  // without forking, so we just clear it with vertical offset.
  countBadge: {
    position: 'absolute', top: 46, left: 12,
    backgroundColor: Colors.overlay, borderRadius: 8,
    paddingHorizontal: 10, paddingVertical: 5,
    zIndex: 10,
  },
  countText: { fontSize: 11, color: Colors.sage, fontWeight: '600' },
  countSubtext: { fontSize: 9, color: Colors.textSecondary },

  // ── Overlay picker wrapper (replaces the old chip-row ScrollView) ──
  //
  // 2026-04-30 (V2.4 audit): the chip ScrollView at this slot used to
  // hold 6 toggles (Blinds / Water / Geese / Closed / Lotto / Pros)
  // that overflowed the right edge on iPhone 17 Pro Max. Replaced with
  // a single FilterPicker trigger (the "Overlays" pill); the modal it
  // opens hosts every option as a Switch row. Wrapper just positions
  // the trigger below the filters / lands count badges at the top of
  // the map. The orphan chipRow / chip / chipLabel styles below were
  // retired — kept the slot id (top: 130) so the picker lines up where
  // the row used to.
  overlayPickerWrap: {
    // 2026-05-02 (V2.4 audit, user-flagged): top moved 130 → 144 so
    // the Overlays pill clears the MapFilterPanel collapsed badge
    // above. 2026-05-14 (iter-1 adversarial audit): 144 was off — the
    // panel's toggleButton is height:50 (NOT 36pt as the prior comment
    // assumed), so collapsed panel ends at 92+50=142. Bumped to top:154
    // so we have a real ≥8pt gap above 142. The "panel ~36pt" assumption
    // was the bug.
    position: 'absolute',
    top: 154,
    left: 12,
    zIndex: 8,
  },

  // ── Map Controls (Right side, Stacked Vertically) ──
  // 2026-04-26: zoom buttons split out into their own zoomControls row
  // anchored above the search bar; column-reverse no longer needed.
  mapControls: {
    position: 'absolute', right: 12, top: 200,
    flexDirection: 'column',
    gap: 8, alignItems: 'center',
  },
  // ── Zoom Controls (Bottom Right, just above search bar) ──
  // Vertical pair, + on top of − in canonical map-zoom order. Bottom
  // value lines up so the lower button sits ~12pt above the search box
  // (which is at bottom: 62, height ~44 → top of search at ~106).
  zoomControls: {
    position: 'absolute', right: 12, bottom: 118,
    flexDirection: 'column',
    gap: 8, alignItems: 'center',
  },
  controlButton: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: Colors.overlay, justifyContent: 'center', alignItems: 'center',
    elevation: 4, shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3, shadowRadius: 4, borderWidth: 1, borderColor: Colors.clay,
  },
  controlButtonActive: { backgroundColor: Colors.moss, borderColor: Colors.lichen },
  controlButtonText: { fontSize: 22, color: Colors.textPrimary, fontWeight: '700', lineHeight: 24 },
  controlButtonLabel: { fontSize: 13, color: Colors.textPrimary, fontWeight: '800', letterSpacing: 0.5 },
  controlButtonLabelActive: { color: Colors.textOnAccent },

  // ── Zoom Triangle Styles ──
  zoomTriangleUp: {
    width: 0, height: 0,
    borderLeftColor: 'transparent', borderRightColor: 'transparent',
    borderBottomColor: Colors.textPrimary,
    borderLeftWidth: 8, borderRightWidth: 8, borderBottomWidth: 12,
  },
  zoomTriangleDown: {
    width: 0, height: 0,
    borderLeftColor: 'transparent', borderRightColor: 'transparent',
    borderTopColor: Colors.textPrimary,
    borderLeftWidth: 8, borderRightWidth: 8, borderTopWidth: 12,
  },

  // ── Search Bar (Bottom, Above Disclaimer) ──
  searchBarContainer: {
    position: 'absolute', bottom: 62, left: 12, right: 12,
    backgroundColor: Colors.overlay, borderRadius: 8,
    paddingHorizontal: 12, paddingVertical: 8,
    flexDirection: 'row', alignItems: 'center',
    elevation: 4, shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3, shadowRadius: 4,
  },
  searchInput: {
    flex: 1, fontSize: 13, color: Colors.textPrimary,
    backgroundColor: 'transparent',
    paddingVertical: 0,
  },

  // 2026-04-26: Pros detail card — modeled on the Fish hotspot card.
  // Bottom-anchored so it doesn't fight the search/filter chips.
  proCard: {
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
  proCardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  proCardName: { flex: 1, fontSize: 16, fontWeight: '700', color: Colors.textPrimary },
  proCardClose: { fontSize: 18, color: Colors.textSecondary, paddingLeft: 8 },
  proCardCat: { fontSize: 11, color: Colors.mdGold, fontWeight: '600', marginTop: 2, marginBottom: 6, textTransform: 'capitalize' },
  proCardDesc: { fontSize: 13, color: Colors.textSecondary, marginBottom: 6, lineHeight: 18 },
  proCardOff: { fontSize: 12, color: Colors.textPrimary, marginBottom: 4, fontStyle: 'italic' },
  proCardAddr: { fontSize: 11, color: Colors.textMuted, marginBottom: 8 },
  proCardBtns: { flexDirection: 'row', gap: 8 },
  proCardBtn: { flex: 1, paddingVertical: 8, borderRadius: 8, alignItems: 'center' },
  proCardBtnText: { color: Colors.textOnAccent, fontWeight: '700', fontSize: 13 },

  // Approximate-boundary banner — mirrors the HikeMapScreen pattern so users
  // see the same dashed-amber warning treatment across maps. Dismissible per
  // session via the ✕ button on the right edge.
  approxBanner: {
    backgroundColor: Colors.amber,
    paddingLeft: 12,
    paddingRight: 32, // reserve room for the ✕ button
    paddingVertical: 6,
    borderTopWidth: 1,
    borderTopColor: Colors.mud,
    flexDirection: 'row',
    alignItems: 'center',
  },
  approxBannerText: {
    flex: 1,
    fontSize: 10,
    color: Colors.forestDark,
    textAlign: 'center',
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  bannerDismissBtn: {
    position: 'absolute',
    top: 0, bottom: 0, right: 0,
    width: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  bannerDismissText: {
    fontSize: 14,
    fontWeight: '800',
    color: Colors.forestDark,
  },
});

// ── Detail Panel Styles ──
const detailStyles = StyleSheet.create({
  panel: {
    position: 'absolute', bottom: 60, left: 10, right: 10,
    backgroundColor: Colors.surfaceElevated, borderRadius: 12,
    padding: 14, maxHeight: 280,
    shadowColor: '#000', shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.3, shadowRadius: 6, elevation: 8,
  },
  scrollArea: { maxHeight: 240 },
  closeBtn: {
    position: 'absolute', top: 8, right: 10, zIndex: 2,
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: Colors.clay, justifyContent: 'center', alignItems: 'center',
  },
  closeBtnText: { color: Colors.textPrimary, fontSize: 14, fontWeight: '700' },
  name: { fontSize: 15, fontWeight: '700', color: Colors.textPrimary, marginRight: 30, marginBottom: 2 },
  subtitle: { fontSize: 11, color: Colors.textSecondary, marginBottom: 8 },
  tagRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginBottom: 8 },
  tag: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 8, borderWidth: 1 },
  tagText: { fontSize: 9, fontWeight: '600' },
  // Approximate-boundary banner — matches the dashed map stroke visually.
  approxBanner: {
    borderColor: '#C08A2F',
    borderWidth: 1,
    borderStyle: 'dashed',
    backgroundColor: '#3A2F1A',
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 6,
    marginBottom: 8,
  },
  approxBannerTitle: { fontSize: 11, fontWeight: '700', color: '#F3D48B', marginBottom: 2 },
  approxBannerBody: { fontSize: 10, color: '#E4C98B', lineHeight: 14 },
  description: { fontSize: 11, color: Colors.textSecondary, marginBottom: 6, fontStyle: 'italic', lineHeight: 16 },
  infoLine: { fontSize: 11, color: Colors.textSecondary, marginBottom: 3 },
  sectionLabel: { fontSize: 11, color: Colors.textPrimary, fontWeight: '600', marginTop: 4, marginBottom: 2 },
  parkingSection: { marginBottom: 4 },
  parkingItem: { fontSize: 10, color: Colors.textSecondary, marginLeft: 8, marginBottom: 1 },
  link: { fontSize: 11, color: '#0277BD', fontWeight: '600', marginBottom: 4 },
  notes: { fontSize: 10, color: Colors.textSecondary, fontStyle: 'italic', marginTop: 4 },
  linkRow: { flexDirection: 'row', gap: 8, marginTop: 8, flexWrap: 'wrap' },
  linkButton: {
    backgroundColor: Colors.moss, paddingHorizontal: 12, paddingVertical: 6,
    borderRadius: 8,
  },
  linkButtonText: { color: Colors.textOnAccent, fontSize: 11, fontWeight: '700' },
  /** Primary action pill — higher-contrast MD-flag red for Directions/Weather/Regs shortcuts. */
  primaryButton: {
    backgroundColor: Colors.mdRed, paddingHorizontal: 12, paddingVertical: 6,
    borderRadius: 8, minWidth: 72, alignItems: 'center',
  },
  primaryButtonText: { color: '#FFFFFF', fontSize: 11, fontWeight: '700', letterSpacing: 0.2 },
  /** 2026-04-29: Gear-AI CTA on land detail card. Lichen-green to match the
   *  same CTA on FishMapScreen hotspot detail. Tapping deep-links into AI
   *  chat with a hotspot-specific query that triggers the affiliate-link
   *  footer in chatKnowledge.ts (augmentWithHuntGearSuggestions). */
  gearCta: {
    marginTop: 8,
    paddingVertical: 8,
    paddingHorizontal: 10,
    backgroundColor: Colors.lichen,
    borderRadius: 8,
  },
  gearCtaTitle: { color: Colors.background, fontWeight: '700', fontSize: 13 },
  gearCtaSubtitle: { color: Colors.background, fontSize: 11, marginTop: 2 },
});
