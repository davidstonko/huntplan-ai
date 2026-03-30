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
} from 'react-native';
import MapboxGL from '@rnmapbox/maps';
import { useLocation } from '../hooks/useLocation';
import DisclaimerBanner from '../components/common/DisclaimerBanner';
import MapFilterPanel, { FilterState } from '../components/map/MapFilterPanel';
import Colors from '../theme/colors';
import {
  marylandPublicLands,
  shootingRanges,
  MarylandPublicLand,
  ShootingRange,
  ParkingLocation,
  DATA_STATS,
} from '../data/marylandPublicLands';

MapboxGL.setAccessToken('pk.eyJ1IjoiZHN0b25rbzEiLCJhIjoiY21uYXJva3dqMG40MzJycHRreGg0NHp5diJ9.FjYw8WPexpiugKmhZqQiww');

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

export default function MapScreen() {
  const { location, loading: locationLoading, error: locationError } = useLocation();
  const [selectedLand, setSelectedLand] = useState<MarylandPublicLand | null>(null);
  const [selectedRange, setSelectedRange] = useState<ShootingRange | null>(null);
  const [showTopo, setShowTopo] = useState(false);
  const [currentZoom, setCurrentZoom] = useState(7);
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
  const mapRef = useRef<MapboxGL.MapView>(null);

  const defaultCenter: [number, number] = [-76.6413, 39.0458];

  const locationAlertShown = useRef(false);
  useEffect(() => {
    if (locationError && !locationAlertShown.current) {
      locationAlertShown.current = true;
      Alert.alert('Location Notice', 'Could not get GPS. Showing Maryland overview.');
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
  const polygonGeoJSON = useMemo(() => {
    const features = filteredLands
      .filter((land) => land.geometry != null)
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

  // ── Build GeoJSON for point markers (lands without polygons) ──
  const pointGeoJSON = useMemo(() => {
    const features = filteredLands
      .filter((land) => land.geometry == null && land.center != null)
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

  const centerCoords = location
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
            onPress={() => { setSelectedLand(null); setSelectedRange(null); }}
            onMapIdle={handleRegionChange}
          >
            <MapboxGL.Camera
              ref={cameraRef}
              zoomLevel={location ? 10 : 7}
              centerCoordinate={centerCoords as [number, number]}
              animationMode="moveTo"
              animationDuration={800}
            />
            <MapboxGL.UserLocation visible={true} />

            {/* ── Polygon layers for lands with GIS geometry ── */}
            {polygonGeoJSON.features.length > 0 && (
              <MapboxGL.ShapeSource
                id="landPolygons"
                shape={polygonGeoJSON}
                onPress={handleLandPress}
              >
                <MapboxGL.FillLayer
                  id="landFill"
                  style={{
                    fillColor: ['get', 'color'],
                    fillOpacity: 0.3,
                  }}
                />
                <MapboxGL.LineLayer
                  id="landBorder"
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
          </MapboxGL.MapView>

          {/* ── Filter Panel ── */}
          <MapFilterPanel
            onFilterChange={handleFilterChange}
            landCount={marylandPublicLands.length}
            filteredCount={filteredLands.length}
          />

          {/* ── Legend ── */}
          <View style={styles.legend}>
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
          </View>

          {/* ── Map Controls ── */}
          <View style={styles.mapControls}>
            <TouchableOpacity style={styles.controlButton} onPress={handleZoomIn} activeOpacity={0.7}>
              <Text style={styles.controlButtonText}>+</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.controlButton} onPress={handleZoomOut} activeOpacity={0.7}>
              <Text style={styles.controlButtonText}>−</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.controlButton, showTopo && styles.controlButtonActive]}
              onPress={() => setShowTopo(!showTopo)}
              activeOpacity={0.7}
            >
              <Text style={[styles.controlButtonLabel, showTopo && styles.controlButtonLabelActive]}>
                {showTopo ? 'MAP' : 'SAT'}
              </Text>
            </TouchableOpacity>
            {location && (
              <TouchableOpacity
                style={styles.controlButton}
                onPress={() => {
                  cameraRef.current?.setCamera({
                    centerCoordinate: [location.longitude, location.latitude],
                    zoomLevel: 10,
                    animationDuration: 500,
                  });
                }}
                activeOpacity={0.7}
              >
                <Text style={styles.controlButtonLabel}>GPS</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* ── Land count badge ── */}
          <View style={styles.countBadge}>
            <Text style={styles.countText}>
              {filteredLands.length} of {DATA_STATS.totalLands} lands
              {(hasActiveSpeciesFilter || hasActiveWeaponFilter || hasActiveAccessFilter) ? ' (filtered)' : ''}
            </Text>
            <Text style={styles.countSubtext}>
              {DATA_STATS.withPolygons} boundaries · {DATA_STATS.totalRanges} ranges
            </Text>
          </View>

          {/* ── Selected land info panel ── */}
          {selectedLand && (
            <LandDetailPanel
              land={selectedLand}
              onClose={() => setSelectedLand(null)}
            />
          )}

          {/* ── Selected range info panel ── */}
          {selectedRange && (
            <RangeDetailPanel
              range={selectedRange}
              onClose={() => setSelectedRange(null)}
            />
          )}
        </>
      )}
      <DisclaimerBanner />
    </View>
  );
}

// ── Land Detail Panel ──
function LandDetailPanel({ land, onClose }: { land: MarylandPublicLand; onClose: () => void }) {
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
            {land.parking.map((p: ParkingLocation, i: number) => (
              <Text key={i} style={detailStyles.parkingItem}>
                {'\u2022'} {p.description}{p.notes ? ` (${p.notes})` : ''}
              </Text>
            ))}
          </View>
        )}

        {land.notes && (
          <Text style={detailStyles.notes}>{land.notes}</Text>
        )}

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

// ── Range Detail Panel ──
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

// ── Tag component ──
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
  legend: {
    position: 'absolute', top: 12, left: 12,
    backgroundColor: Colors.overlay, borderRadius: 8, padding: 6,
    flexDirection: 'column', gap: 3,
  },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  legendSwatch: { width: 12, height: 12, borderRadius: 2, opacity: 0.8 },
  legendLabel: { fontSize: 9, color: Colors.textPrimary, fontWeight: '600' },
  mapControls: {
    position: 'absolute', right: 12, bottom: 110,
    flexDirection: 'column', gap: 8, alignItems: 'center',
  },
  controlButton: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: Colors.overlay, justifyContent: 'center', alignItems: 'center',
    elevation: 4, shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3, shadowRadius: 4, borderWidth: 1, borderColor: Colors.clay,
  },
  controlButtonActive: { backgroundColor: Colors.moss, borderColor: Colors.lichen },
  controlButtonText: { fontSize: 22, color: Colors.textPrimary, fontWeight: '700', lineHeight: 24 },
  controlButtonLabel: { fontSize: 9, color: Colors.textPrimary, fontWeight: '800', letterSpacing: 0.5 },
  controlButtonLabelActive: { color: Colors.textOnAccent },
  countBadge: {
    position: 'absolute', top: 12, right: 12,
    backgroundColor: Colors.overlay, borderRadius: 8,
    paddingHorizontal: 10, paddingVertical: 5,
  },
  countText: { fontSize: 11, color: Colors.sage, fontWeight: '600' },
  countSubtext: { fontSize: 9, color: Colors.textSecondary },
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
  description: { fontSize: 11, color: Colors.textSecondary, marginBottom: 6, fontStyle: 'italic', lineHeight: 16 },
  infoLine: { fontSize: 11, color: Colors.textSecondary, marginBottom: 3 },
  sectionLabel: { fontSize: 11, color: Colors.textPrimary, fontWeight: '600', marginTop: 4, marginBottom: 2 },
  parkingSection: { marginBottom: 4 },
  parkingItem: { fontSize: 10, color: Colors.textSecondary, marginLeft: 8, marginBottom: 1 },
  link: { fontSize: 11, color: '#0277BD', fontWeight: '600', marginBottom: 4 },
  notes: { fontSize: 10, color: Colors.textSecondary, fontStyle: 'italic', marginTop: 4 },
  linkRow: { flexDirection: 'row', gap: 8, marginTop: 8 },
  linkButton: {
    backgroundColor: Colors.moss, paddingHorizontal: 12, paddingVertical: 6,
    borderRadius: 8,
  },
  linkButtonText: { color: Colors.textOnAccent, fontSize: 11, fontWeight: '700' },
});
