import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Linking,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import MapboxGL from '@rnmapbox/maps';
import { useLocation } from '../hooks/useLocation';
import Colors from '../theme/colors';
import Config from '../config';

MapboxGL.setAccessToken(Config.MAPBOX_ACCESS_TOKEN);

/**
 * FishMapScreen - Maryland Fishing Map
 * Interactive map with quick-access links to MD DNR fishing resources,
 * regulations, and stocking reports.
 */

interface FishingResource {
  id: string;
  emoji: string;
  title: string;
  subtitle: string;
  url: string;
}

const FISHING_RESOURCES: FishingResource[] = [
  {
    id: 'angler-map',
    emoji: '🗺️',
    title: 'Angler Access Map',
    subtitle: 'Interactive DNR fishing map',
    url: 'https://experience.arcgis.com/experience/5697efd09521400c9cd37b36c49ad6c5',
  },
  {
    id: 'regulations',
    emoji: '📋',
    title: 'Fishing Regulations',
    subtitle: '2025-2026 MD freshwater & tidal',
    url: 'https://www.eregulations.com/maryland/fishing',
  },
  {
    id: 'stocking',
    emoji: '🐟',
    title: 'Trout Stocking',
    subtitle: 'Weekly stocking schedule & locations',
    url: 'https://dnr.maryland.gov/fisheries/pages/trout-stocking-areas.aspx',
  },
  {
    id: 'tidal',
    emoji: '🌊',
    title: 'Tidal Fish Reports',
    subtitle: 'Chesapeake Bay & tidal waters',
    url: 'https://dnr.maryland.gov/fisheries/pages/default.aspx',
  },
  {
    id: 'license',
    emoji: '🪪',
    title: 'Fishing License',
    subtitle: 'Purchase or renew online',
    url: 'https://compass.dnr.maryland.gov/Licensing',
  },
  {
    id: 'boat-ramps',
    emoji: '⚓',
    title: 'Boat Ramps & Access',
    subtitle: 'Public launch sites across MD',
    url: 'https://dnr.maryland.gov/boating/pages/ramps.aspx',
  },
];

export default function FishMapScreen() {
  const cameraRef = useRef<MapboxGL.Camera>(null);
  const { location, loading: locationLoading } = useLocation();
  const [showPanel, setShowPanel] = useState(true);

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
        <Text style={styles.bannerTitle}>🐟 MD Fish</Text>
        <Text style={styles.bannerSubtitle}>Maryland Fishing Resources</Text>
      </View>

      {/* Loading Indicator */}
      {locationLoading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color={Colors.moss} />
        </View>
      )}

      {/* Toggle Panel Button */}
      <TouchableOpacity
        style={styles.toggleButton}
        onPress={() => setShowPanel(!showPanel)}
        accessibilityLabel={showPanel ? 'Hide resources panel' : 'Show resources panel'}
        accessibilityRole="button"
      >
        <Text style={styles.toggleText}>{showPanel ? '▼ Hide' : '▲ Resources'}</Text>
      </TouchableOpacity>

      {/* Fishing Resources Panel */}
      {showPanel && (
        <View style={styles.panelContainer}>
          <View style={styles.panel}>
            <Text style={styles.panelTitle}>Quick Access</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.resourcesRow}
            >
              {FISHING_RESOURCES.map((resource) => (
                <TouchableOpacity
                  key={resource.id}
                  style={styles.resourceCard}
                  onPress={() => openLink(resource.url)}
                  accessibilityLabel={`Open ${resource.title}`}
                  accessibilityRole="link"
                  accessibilityHint={resource.subtitle}
                  activeOpacity={0.7}
                >
                  <Text style={styles.resourceEmoji}>{resource.emoji}</Text>
                  <Text style={styles.resourceTitle} numberOfLines={1}>{resource.title}</Text>
                  <Text style={styles.resourceSubtitle} numberOfLines={2}>{resource.subtitle}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            <Text style={styles.disclaimerText}>
              Always verify regulations with Maryland DNR
            </Text>
          </View>
        </View>
      )}
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
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: Colors.sage,
    zIndex: 10,
  },
  bannerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  bannerSubtitle: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: Colors.overlay,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 20,
  },
  toggleButton: {
    position: 'absolute',
    bottom: 200,
    right: 16,
    backgroundColor: Colors.surface,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: Colors.mud,
    zIndex: 10,
  },
  toggleText: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.textSecondary,
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
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: Colors.mud,
  },
  panelTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 10,
  },
  resourcesRow: {
    paddingRight: 8,
  },
  resourceCard: {
    width: 110,
    backgroundColor: Colors.surfaceElevated,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 10,
    marginRight: 8,
    borderWidth: 1,
    borderColor: Colors.mud,
    alignItems: 'center',
  },
  resourceEmoji: {
    fontSize: 24,
    marginBottom: 6,
  },
  resourceTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.textPrimary,
    textAlign: 'center',
    marginBottom: 3,
  },
  resourceSubtitle: {
    fontSize: 9,
    color: Colors.textMuted,
    textAlign: 'center',
    lineHeight: 12,
  },
  disclaimerText: {
    fontSize: 10,
    color: Colors.textMuted,
    fontStyle: 'italic',
    marginTop: 10,
    textAlign: 'center',
  },
});
