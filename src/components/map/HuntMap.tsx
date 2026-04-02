import React, { useRef, useEffect, useState, forwardRef } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Text,
} from 'react-native';
import MapboxGL from '@rnmapbox/maps';
import Colors from '../../theme/colors';

interface HuntMapProps {
  initialCoords: [number, number]; // [lon, lat]
}

const HuntMap = forwardRef(
  ({ initialCoords }: HuntMapProps, ref: React.Ref<MapboxGL.MapView>) => {
    const [zoom, setZoom] = useState(12);

    return (
      <View style={styles.container}>
        <MapboxGL.MapView
          ref={ref}
          style={styles.map}
          styleURL="mapbox://styles/mapbox/outdoors-v12"
          onDidFinishLoadingMap={() => {
            // Map loaded
          }}
        >
          <MapboxGL.Camera
            zoomLevel={zoom}
            centerCoordinate={initialCoords}
            animationMode="moveTo"
            animationDuration={1000}
          />

          <MapboxGL.UserLocation visible={true} />

          {/* Public Land Layer - Placeholder */}
          <MapboxGL.ShapeSource
            id="publicLands"
            shape={{
              type: 'FeatureCollection',
              features: [
                {
                  type: 'Feature',
                  properties: { name: 'Savage Mill WMA' },
                  geometry: {
                    type: 'Point',
                    coordinates: [-76.8, 39.1],
                  },
                },
              ],
            }}
          >
            <MapboxGL.CircleLayer
              id="publicLandsCircle"
              style={{
                circleRadius: 8,
                circleColor: Colors.moss,
                circleOpacity: 0.7,
              }}
            />
          </MapboxGL.ShapeSource>
        </MapboxGL.MapView>

        {/* Zoom Controls */}
        <View style={styles.controls}>
          <TouchableOpacity
            style={styles.zoomButton}
            onPress={() => setZoom(Math.min(zoom + 1, 22))}
            activeOpacity={0.7}
          >
            <Text style={styles.zoomText}>+</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.zoomButton}
            onPress={() => setZoom(Math.max(zoom - 1, 1))}
            activeOpacity={0.7}
          >
            <Text style={styles.zoomText}>−</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }
);

HuntMap.displayName = 'HuntMap';

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  map: {
    flex: 1,
  },
  controls: {
    position: 'absolute',
    top: 20,
    left: 20,
    backgroundColor: Colors.overlayLight,
    borderRadius: 6,
    overflow: 'hidden',
  },
  zoomButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: Colors.mud,
  },
  zoomText: {
    color: Colors.oak,
    fontSize: 20,
    fontWeight: '600',
  },
});

export default HuntMap;
