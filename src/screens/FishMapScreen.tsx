import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Linking,
  ActivityIndicator,
} from 'react-native';
import MapboxGL from '@rnmapbox/maps';
import { useLocation } from '../hooks/useLocation';
import Colors from '../theme/colors';

MapboxGL.setAccessToken('pk.eyJ1IjoiZHN0b25rbzEiLCJhIjoiY21uYXJva3dqMG40MzJycHRreGg0NHp5diJ9.FjYw8WPexpiugKmhZqQiww');

/**
 * FishMapScreen - Fishing map for OutdoorsMaryland
 * Shows Maryland map with fishing data sources and coming soon features
 */
export default function FishMapScreen() {
  const cameraRef = useRef<MapboxGL.Camera>(null);
  const { location, loading: locationLoading } = useLocation();

  // Center on Maryland (approximate center)
  const MARYLAND_CENTER = [-76.8, 39.0];
  const ZOOM = 7;

  useEffect(() => {
    if (cameraRef.current && location) {
      cameraRef.current.setCamera({
        centerCoordinate: [location.longitude, location.latitude],
        zoomLevel: ZOOM,
        animationDuration: 1000,
      });
    }
  }, [location]);

  const openLink = async (url: string) => {
    const canOpen = await Linking.canOpenURL(url);
    if (canOpen) {
      await Linking.openURL(url);
    }
  };

  return (
    <View style={styles.container}>
      <MapboxGL.MapView style={styles.map}>
        <MapboxGL.Camera
          ref={cameraRef}
          defaultSettings={{
            centerCoordinate: MARYLAND_CENTER,
            zoomLevel: ZOOM,
          }}
        />
      </MapboxGL.MapView>

      {/* Top Banner */}
      <View style={styles.banner}>
        <Text style={styles.bannerTitle}>🐟 FishMaryland</Text>
      </View>

      {/* Loading Indicator */}
      {locationLoading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color={Colors.moss} />
        </View>
      )}

      {/* Coming Soon Panel */}
      <View style={styles.panelContainer}>
        <View style={styles.panel}>
          {/* Data Source Notice */}
          <View style={styles.dataSourceSection}>
            <Text style={styles.dataSourceLabel}>Data Source</Text>
            <TouchableOpacity
              onPress={() =>
                openLink(
                  'https://experience.arcgis.com/experience/5697efd09521400c9cd37b36c49ad6c5'
                )
              }
              activeOpacity={0.7}
            >
              <Text style={styles.dataSourceLink}>
                MD DNR Angler Access Map
              </Text>
            </TouchableOpacity>
          </View>

          {/* Coming Soon Message */}
          <View style={styles.comingSoonSection}>
            <Text style={styles.comingSoonTitle}>Coming Soon</Text>
            <Text style={styles.comingSoonText}>
              FishMaryland is in development. When available, you'll find:
            </Text>

            <View style={styles.featureList}>
              <Text style={styles.featureItem}>• Boat Ramp Locations</Text>
              <Text style={styles.featureItem}>• Fishing Spots & Hotspots</Text>
              <Text style={styles.featureItem}>• Stocking Reports</Text>
              <Text style={styles.featureItem}>• Tidal Charts (for tidal areas)</Text>
              <Text style={styles.featureItem}>
                • MD DNR Fishing Regulations
              </Text>
            </View>

            <Text style={styles.disclaimerText}>
              Check back soon for full fishing support across Maryland!
            </Text>
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  map: {
    flex: 1,
  },
  banner: {
    position: 'absolute',
    top: 16,
    left: 16,
    right: 16,
    backgroundColor: Colors.forestDark,
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: Colors.sage,
    zIndex: 10,
  },
  bannerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: Colors.overlay,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 20,
  },
  panelContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 12,
    paddingVertical: 12,
    zIndex: 10,
  },
  panel: {
    backgroundColor: Colors.surface,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: Colors.mud,
  },
  dataSourceSection: {
    marginBottom: 14,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.mud,
  },
  dataSourceLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  dataSourceLink: {
    fontSize: 13,
    color: Colors.mdGold,
    fontWeight: '600',
    textDecorationLine: 'underline',
  },
  comingSoonSection: {
    paddingTop: 4,
  },
  comingSoonTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.amber,
    marginBottom: 8,
  },
  comingSoonText: {
    fontSize: 13,
    color: Colors.textSecondary,
    lineHeight: 19,
    marginBottom: 10,
  },
  featureList: {
    marginVertical: 10,
    paddingLeft: 4,
  },
  featureItem: {
    fontSize: 12,
    color: Colors.textSecondary,
    lineHeight: 18,
    marginBottom: 4,
  },
  disclaimerText: {
    fontSize: 11,
    color: Colors.textMuted,
    fontStyle: 'italic',
    marginTop: 10,
    lineHeight: 16,
  },
});
