/**
 * ScoutScreen — Full interactive map with scouting + planning tools.
 * Merges the old Plan and Scout/Social tabs into one power-user map.
 * Same base map layers as MapScreen, with annotation toolbar on top.
 * V2: Uses PlanSidebar, PlanCreationFlow, and AnnotationLayer components.
 */

import React, { useRef, useState, useMemo, useCallback } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Text,
  Alert,
} from 'react-native';
import MapboxGL from '@rnmapbox/maps';
import { useLocation } from '../hooks/useLocation';
import { useScoutData } from '../context/ScoutDataContext';
import DisclaimerBanner from '../components/common/DisclaimerBanner';
import MapFilterPanel, { FilterState } from '../components/map/MapFilterPanel';
import PlanSidebar from '../components/scout/PlanSidebar';
import PlanCreationFlow from '../components/scout/PlanCreationFlow';
import AnnotationLayer from '../components/scout/AnnotationLayer';
import TrackMeBar from '../components/scout/TrackMeBar';
import CompassOverlay from '../components/scout/CompassOverlay';
import MeasureTool, { MeasurePoint, measurePointsToGeoJSON } from '../components/scout/MeasureTool';
import Colors from '../theme/colors';
import {
  marylandPublicLands,
} from '../data/marylandPublicLands';
import { WaypointIcon, TrackPoint } from '../types/scout';

MapboxGL.setAccessToken('pk.eyJ1IjoiZHN0b25rbzEiLCJhIjoiY21uYXJva3dqMG40MzJycHRreGg0NHp5diJ9.FjYw8WPexpiugKmhZqQiww');

// ── Color maps (shared with MapScreen) ──
const DESIGNATION_COLORS: Record<string, string> = {
  WMA: '#2E7D32', CWMA: '#558B2F', CFL: '#33691E', SF: '#1B5E20',
  SP: '#00695C', NRMA: '#4E342E', NEA: '#6A1B9A', FMA: '#0277BD',
  MNCPPC: '#EF6C00', Federal: '#B71C1C', Range: '#F57F17',
};
const DESIGNATION_BORDER_COLORS: Record<string, string> = {
  WMA: '#1B5E20', CWMA: '#33691E', CFL: '#1B5E20', SF: '#004D40',
  SP: '#004D40', NRMA: '#3E2723', NEA: '#4A148C', FMA: '#01579B',
  MNCPPC: '#BF360C', Federal: '#7F0000', Range: '#E65100',
};

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
const DESIGNATION_TO_FILTER: Record<string, keyof FilterState['landTypes']> = {
  WMA: 'wma', CWMA: 'cwma', CFL: 'cfl', SF: 'sf', SP: 'sp',
  NRMA: 'nrma', NEA: 'nea', FMA: 'fma', MNCPPC: 'wma', Federal: 'wma', Range: 'range',
};

type MapTapMode = 'none' | 'parking' | 'waypoint' | 'measure';

export default function ScoutScreen() {
  const { location } = useLocation();
  const { plans, addWaypoint, updatePlan, getPlan } = useScoutData();

  const [showTopo, setShowTopo] = useState(false);
  const [showSidebar, setShowSidebar] = useState(false);
  const [showCreationFlow, setShowCreationFlow] = useState(false);
  const [creationPlanId, setCreationPlanId] = useState<string | null>(null);
  const [mapTapMode, setMapTapMode] = useState<MapTapMode>('none');
  const [activeWaypointIcon, setActiveWaypointIcon] = useState<WaypointIcon>('custom');
  const [showTrackMe, setShowTrackMe] = useState(false);
  const [liveTrackPoints, setLiveTrackPoints] = useState<TrackPoint[]>([]);
  const [showCompass, setShowCompass] = useState(true);
  const [showMeasure, setShowMeasure] = useState(false);
  const [measurePoints, setMeasurePoints] = useState<MeasurePoint[]>([]);

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

  const cameraRef = useRef<MapboxGL.Camera>(null);
  const defaultCenter: [number, number] = [-76.6413, 39.0458];
  const centerCoords = location ? [location.longitude, location.latitude] : defaultCenter;

  // ── Filter logic ──
  const hasActiveSpeciesFilter = Object.values(activeFilters.species).some(Boolean);
  const hasActiveWeaponFilter = Object.values(activeFilters.weapons).some(Boolean);
  const hasActiveAccessFilter = Object.values(activeFilters.access).some(Boolean);

  const filteredLands = useMemo(() => {
    return marylandPublicLands.filter((land) => {
      const filterKey = DESIGNATION_TO_FILTER[land.designation];
      if (filterKey && !activeFilters.landTypes[filterKey]) return false;
      if (hasActiveSpeciesFilter) {
        const landSpecies = (land.huntableSpecies || []).map((s: string) => s.toLowerCase());
        const matchesSpecies = Object.entries(activeFilters.species).some(([key, isActive]) => {
          if (!isActive) return false;
          return (SPECIES_MAP[key] || []).some(t => landSpecies.some(ls => ls.includes(t)));
        });
        if (!matchesSpecies) return false;
      }
      if (hasActiveWeaponFilter) {
        const landWeapons = (land.allowedWeapons || []).map((w: string) => w.toLowerCase());
        const matchesWeapon = Object.entries(activeFilters.weapons).some(([key, isActive]) => {
          if (!isActive) return false;
          return (WEAPON_MAP[key] || []).some(t => landWeapons.some(lw => lw.includes(t)));
        });
        if (!matchesWeapon) return false;
      }
      if (activeFilters.access.sundayHunting && !land.sundayHunting) return false;
      if (activeFilters.access.noReservation && land.reservationRequired) return false;
      if (activeFilters.access.mobilityAccess && !land.mobilityImpaired) return false;
      return true;
    });
  }, [activeFilters, hasActiveSpeciesFilter, hasActiveWeaponFilter, hasActiveAccessFilter]);

  // ── GeoJSON for base map layers ──
  const polygonGeoJSON = useMemo(() => {
    const features = filteredLands
      .filter((land) => land.geometry != null)
      .map((land, idx) => ({
        type: 'Feature' as const,
        id: idx.toString(),
        properties: {
          landId: land.id, name: land.name, designation: land.designation,
          color: DESIGNATION_COLORS[land.designation] || '#2E7D32',
          borderColor: DESIGNATION_BORDER_COLORS[land.designation] || '#1B5E20',
        },
        geometry: { ...land.geometry!, type: land.geometry!.type as 'Polygon' | 'MultiPolygon' },
      }));
    return { type: 'FeatureCollection' as const, features } as any;
  }, [filteredLands]);

  const pointGeoJSON = useMemo(() => {
    const features = filteredLands
      .filter((land) => land.geometry == null && land.center != null)
      .map((land, idx) => ({
        type: 'Feature' as const,
        id: `pt_${idx}`,
        properties: {
          landId: land.id, name: land.name, designation: land.designation,
          color: DESIGNATION_COLORS[land.designation] || '#2E7D32',
        },
        geometry: { type: 'Point' as const, coordinates: land.center! },
      }));
    return { type: 'FeatureCollection' as const, features };
  }, [filteredLands]);

  // ── Visible plans for AnnotationLayer ──
  const visiblePlans = useMemo(() => plans.filter((p) => p.visible), [plans]);

  // ── Live GPS track polyline ──
  const liveTrackGeoJSON = useMemo(() => {
    if (liveTrackPoints.length < 2) return null;
    return {
      type: 'FeatureCollection' as const,
      features: [{
        type: 'Feature' as const,
        properties: {},
        geometry: {
          type: 'LineString' as const,
          coordinates: liveTrackPoints.map((p) => [p.lng, p.lat]),
        },
      }],
    } as any;
  }, [liveTrackPoints]);

  // ── Measure tool GeoJSON ──
  const measureGeoJSON = useMemo(() => {
    if (measurePoints.length === 0) return null;
    return measurePointsToGeoJSON(measurePoints);
  }, [measurePoints]);

  // ── Map tap handler ──
  const handleMapPress = useCallback((event: any) => {
    const { geometry } = event;
    if (!geometry?.coordinates) return;
    const [lng, lat] = geometry.coordinates;

    if (mapTapMode === 'parking' && creationPlanId) {
      const plan = getPlan(creationPlanId);
      if (plan) {
        const parkingPoint = {
          id: Date.now().toString(36) + Math.random().toString(36).substr(2, 9),
          lat, lng,
          icon: 'parking' as WaypointIcon,
          label: 'Parking',
          notes: '',
        };
        updatePlan({ ...plan, parkingPoint });
      }
      setMapTapMode('none');
      return;
    }

    if (mapTapMode === 'waypoint') {
      // Add waypoint to the most recently created plan, or the creation flow plan
      const targetPlanId = creationPlanId || (plans.length > 0 ? plans[plans.length - 1].id : null);
      if (targetPlanId) {
        const newWaypoint = {
          id: Date.now().toString(36) + Math.random().toString(36).substr(2, 9),
          lat, lng,
          icon: activeWaypointIcon,
          label: `Point ${(getPlan(targetPlanId)?.waypoints.length || 0) + 1}`,
          notes: '',
        };
        addWaypoint(targetPlanId, newWaypoint);
      }
      // Stay in waypoint mode so user can add multiple
      return;
    }

    if (mapTapMode === 'measure') {
      setMeasurePoints((prev) => [...prev, { lat, lng }]);
      return;
    }
  }, [mapTapMode, creationPlanId, plans, activeWaypointIcon, addWaypoint, getPlan, updatePlan]);

  const handleRequestMapTap = useCallback((mode: 'parking' | 'waypoint') => {
    setMapTapMode(mode);
  }, []);

  const handleFilterChange = useCallback((newFilters: FilterState) => {
    setActiveFilters(newFilters);
  }, []);

  const handleNewPlan = () => {
    setShowSidebar(false);
    setShowCreationFlow(true);
    setCreationPlanId(null);
  };

  const handleEditPlan = (planId: string) => {
    setShowSidebar(false);
    setCreationPlanId(planId);
    setShowCreationFlow(true);
  };

  const handleCreationDone = () => {
    setShowCreationFlow(false);
    setCreationPlanId(null);
    setMapTapMode('none');
  };

  const mapStyleURL = showTopo
    ? 'mapbox://styles/mapbox/satellite-streets-v12'
    : 'mapbox://styles/mapbox/outdoors-v12';

  return (
    <View style={styles.container}>
      <MapboxGL.MapView
        style={styles.map}
        styleURL={mapStyleURL}
        onPress={handleMapPress}
      >
        <MapboxGL.Camera
          ref={cameraRef}
          zoomLevel={location ? 10 : 7}
          centerCoordinate={centerCoords as [number, number]}
          animationMode="moveTo"
          animationDuration={800}
        />
        <MapboxGL.UserLocation visible={true} />

        {/* ── Base land polygon layers ── */}
        {polygonGeoJSON.features.length > 0 && (
          <MapboxGL.ShapeSource id="scoutLandPolygons" shape={polygonGeoJSON}>
            <MapboxGL.FillLayer
              id="scoutLandFill"
              style={{ fillColor: ['get', 'color'], fillOpacity: 0.3 }}
            />
            <MapboxGL.LineLayer
              id="scoutLandBorder"
              style={{ lineColor: ['get', 'borderColor'], lineWidth: 1.5 }}
            />
            <MapboxGL.SymbolLayer
              id="scoutLandLabels"
              minZoomLevel={10}
              style={{
                textField: ['get', 'name'], textSize: 10,
                textColor: '#1a1a1a', textHaloColor: '#ffffff', textHaloWidth: 1.2,
                textFont: ['DIN Pro Medium', 'Arial Unicode MS Regular'], textMaxWidth: 8,
              }}
            />
          </MapboxGL.ShapeSource>
        )}

        {/* ── Base land point markers ── */}
        {pointGeoJSON.features.length > 0 && (
          <MapboxGL.ShapeSource id="scoutLandPoints" shape={pointGeoJSON}>
            <MapboxGL.CircleLayer
              id="scoutCirclesOuter"
              style={{
                circleRadius: 10, circleColor: '#ffffff',
                circleStrokeWidth: 2.5, circleStrokeColor: ['get', 'color'],
              }}
            />
            <MapboxGL.CircleLayer
              id="scoutCirclesInner"
              style={{ circleRadius: 5, circleColor: ['get', 'color'] }}
            />
          </MapboxGL.ShapeSource>
        )}

        {/* ── User annotations from visible plans ── */}
        <AnnotationLayer plans={visiblePlans} idPrefix="scout" />

        {/* ── Live GPS track polyline ── */}
        {liveTrackGeoJSON && (
          <MapboxGL.ShapeSource id="liveTrackSource" shape={liveTrackGeoJSON}>
            <MapboxGL.LineLayer
              id="liveTrackLine"
              style={{
                lineColor: '#FF4444',
                lineWidth: 3.5,
                lineOpacity: 0.9,
                lineDasharray: [2, 1],
              }}
            />
          </MapboxGL.ShapeSource>
        )}

        {/* ── Measure tool layers ── */}
        {measureGeoJSON && (
          <MapboxGL.ShapeSource id="measureSource" shape={measureGeoJSON}>
            <MapboxGL.LineLayer
              id="measureLine"
              filter={['==', ['get', 'kind'], 'line']}
              style={{
                lineColor: Colors.mdGold,
                lineWidth: 2.5,
                lineDasharray: [4, 3],
              }}
            />
            <MapboxGL.CircleLayer
              id="measurePoints"
              filter={['==', ['get', 'kind'], 'point']}
              style={{
                circleRadius: 7,
                circleColor: Colors.mdGold,
                circleStrokeWidth: 2,
                circleStrokeColor: '#FFFFFF',
              }}
            />
            <MapboxGL.SymbolLayer
              id="measureLabels"
              filter={['==', ['get', 'kind'], 'point']}
              style={{
                textField: ['to-string', ['get', 'index']],
                textSize: 10,
                textColor: '#1a1a1a',
                textFont: ['DIN Pro Bold', 'Arial Unicode MS Regular'],
                textOffset: [0, -1.5],
              }}
            />
          </MapboxGL.ShapeSource>
        )}
      </MapboxGL.MapView>

      {/* ── Filter Panel ── */}
      <MapFilterPanel
        onFilterChange={handleFilterChange}
        landCount={marylandPublicLands.length}
        filteredCount={filteredLands.length}
      />

      {/* ── Scouting Toolbar ── */}
      <View style={styles.toolbar}>
        <TouchableOpacity
          style={[styles.toolButton, showSidebar && styles.toolButtonActive]}
          onPress={() => { setShowSidebar(!showSidebar); setShowCreationFlow(false); }}
        >
          <Text style={styles.toolEmoji}>{'\uD83D\uDCCB'}</Text>
          <Text style={styles.toolLabel}>Plans</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.toolButton, mapTapMode === 'waypoint' && styles.toolButtonActive]}
          onPress={() => {
            if (plans.length === 0) {
              Alert.alert('Create a Plan First', 'Create a hunt plan before adding waypoints.');
              return;
            }
            setMapTapMode(mapTapMode === 'waypoint' ? 'none' : 'waypoint');
          }}
        >
          <Text style={styles.toolEmoji}>{'\uD83D\uDCCC'}</Text>
          <Text style={styles.toolLabel}>Pin</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.toolButton}
          onPress={() => setShowTopo(!showTopo)}
        >
          <Text style={styles.toolEmoji}>{showTopo ? '\uD83D\uDDFA\uFE0F' : '\uD83D\uDEF0\uFE0F'}</Text>
          <Text style={styles.toolLabel}>{showTopo ? 'Map' : 'Sat'}</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.toolButton, showTrackMe && styles.toolButtonActive]}
          onPress={() => setShowTrackMe(!showTrackMe)}
        >
          <Text style={styles.toolEmoji}>{'\uD83D\uDC63'}</Text>
          <Text style={styles.toolLabel}>Track</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.toolButton, showMeasure && styles.toolButtonActive]}
          onPress={() => {
            if (!showMeasure) {
              setShowMeasure(true);
              setMapTapMode('measure');
              setMeasurePoints([]);
            } else {
              setShowMeasure(false);
              setMapTapMode('none');
              setMeasurePoints([]);
            }
          }}
        >
          <Text style={styles.toolEmoji}>{'\uD83D\uDCCF'}</Text>
          <Text style={styles.toolLabel}>Measure</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.toolButton}
          onPress={() => {
            if (location) {
              cameraRef.current?.setCamera({
                centerCoordinate: [location.longitude, location.latitude],
                zoomLevel: 14,
                animationDuration: 500,
              });
            }
          }}
        >
          <Text style={styles.crosshairIcon}>{'\u2316'}</Text>
        </TouchableOpacity>
      </View>

      {/* ── Active tool hint ── */}
      {mapTapMode !== 'none' && mapTapMode !== 'measure' && (
        <View style={styles.toolHint}>
          <Text style={styles.toolHintText}>
            {mapTapMode === 'parking'
              ? 'Tap the map to set parking point'
              : 'Tap the map to place a waypoint'}
          </Text>
          <TouchableOpacity onPress={() => setMapTapMode('none')}>
            <Text style={styles.toolHintCancel}>Cancel</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* ── Plan Sidebar (component) ── */}
      {showSidebar && (
        <PlanSidebar
          onNewPlan={handleNewPlan}
          onEditPlan={handleEditPlan}
          onClose={() => setShowSidebar(false)}
        />
      )}

      {/* ── Plan Creation Flow (component) ── */}
      {showCreationFlow && (
        <PlanCreationFlow
          onDone={handleCreationDone}
          onRequestMapTap={handleRequestMapTap}
          activePlanId={creationPlanId}
        />
      )}

      {/* ── Compass Overlay ── */}
      {showCompass && !showSidebar && !showCreationFlow && (
        <CompassOverlay />
      )}

      {/* ── Measure Tool panel ── */}
      {showMeasure && (
        <MeasureTool
          points={measurePoints}
          onUndo={() => setMeasurePoints((prev) => prev.slice(0, -1))}
          onClear={() => setMeasurePoints([])}
          onClose={() => { setShowMeasure(false); setMapTapMode('none'); setMeasurePoints([]); }}
        />
      )}

      {/* ── TrackMe GPS bar ── */}
      {showTrackMe && !showMeasure && (
        <TrackMeBar
          onTrackUpdate={setLiveTrackPoints}
          onTrackEnd={() => setLiveTrackPoints([])}
        />
      )}

      <DisclaimerBanner />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  map: { flex: 1 },

  // ── Toolbar ──
  toolbar: {
    position: 'absolute',
    right: 12,
    top: 12,
    flexDirection: 'column',
    gap: 8,
  },
  toolButton: {
    width: 52, height: 52, borderRadius: 12,
    backgroundColor: Colors.overlay,
    justifyContent: 'center', alignItems: 'center',
    borderWidth: 1, borderColor: Colors.clay,
    elevation: 4, shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3, shadowRadius: 4,
  },
  toolButtonActive: {
    backgroundColor: Colors.moss,
    borderColor: Colors.lichen,
  },
  toolEmoji: { fontSize: 20 },
  toolLabel: { fontSize: 8, color: Colors.textPrimary, fontWeight: '700', marginTop: 1 },
  crosshairIcon: { fontSize: 28, color: Colors.textPrimary, fontWeight: '300' },

  // ── Tool hint ──
  toolHint: {
    position: 'absolute',
    top: 12,
    left: 12,
    right: 72,
    backgroundColor: Colors.overlay,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  toolHintText: { fontSize: 12, color: Colors.tan, fontWeight: '600', flex: 1 },
  toolHintCancel: { fontSize: 12, color: Colors.rust, fontWeight: '700', marginLeft: 8 },
});
