/**
 * CompassOverlay — Floating compass rose showing device heading.
 * Uses react-native-sensors (magnetometer) when available,
 * falls back to a static N indicator.
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Easing,
} from 'react-native';
import Colors from '../../theme/colors';

interface CompassOverlayProps {
  /** If the parent has heading from Mapbox UserLocation, pass it in */
  heading?: number | null;
}

export default function CompassOverlay({ heading: externalHeading }: CompassOverlayProps) {
  const [heading, setHeading] = useState(0);
  const rotateAnim = useRef(new Animated.Value(0)).current;

  // Use external heading if provided, otherwise 0 (static)
  useEffect(() => {
    const h = externalHeading ?? 0;
    setHeading(h);
    Animated.timing(rotateAnim, {
      toValue: -h,
      duration: 300,
      easing: Easing.out(Easing.quad),
      useNativeDriver: true,
    }).start();
  }, [externalHeading, rotateAnim]);

  const rotation = rotateAnim.interpolate({
    inputRange: [-360, 360],
    outputRange: ['-360deg', '360deg'],
  });

  const cardinalDirection = (): string => {
    const h = ((heading % 360) + 360) % 360;
    if (h >= 337.5 || h < 22.5) return 'N';
    if (h < 67.5) return 'NE';
    if (h < 112.5) return 'E';
    if (h < 157.5) return 'SE';
    if (h < 202.5) return 'S';
    if (h < 247.5) return 'SW';
    if (h < 292.5) return 'W';
    return 'NW';
  };

  return (
    <View style={styles.container}>
      <Animated.View style={[styles.compassRing, { transform: [{ rotate: rotation }] }]}>
        {/* North marker */}
        <View style={styles.northMarker}>
          <Text style={styles.northText}>N</Text>
        </View>
        {/* East */}
        <View style={[styles.cardinalMarker, styles.eastMarker]}>
          <Text style={styles.cardinalText}>E</Text>
        </View>
        {/* South */}
        <View style={[styles.cardinalMarker, styles.southMarker]}>
          <Text style={styles.cardinalText}>S</Text>
        </View>
        {/* West */}
        <View style={[styles.cardinalMarker, styles.westMarker]}>
          <Text style={styles.cardinalText}>W</Text>
        </View>
        {/* Ring decoration */}
        <View style={styles.innerCircle} />
      </Animated.View>
      {/* Heading readout */}
      <Text style={styles.headingText}>
        {Math.round(heading)}{'\u00B0'} {cardinalDirection()}
      </Text>
    </View>
  );
}

const RING_SIZE = 56;

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 12,
    left: 12,
    alignItems: 'center',
  },
  compassRing: {
    width: RING_SIZE,
    height: RING_SIZE,
    borderRadius: RING_SIZE / 2,
    backgroundColor: Colors.overlay,
    borderWidth: 2,
    borderColor: Colors.clay,
    justifyContent: 'center',
    alignItems: 'center',
  },
  innerCircle: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.textPrimary,
  },
  northMarker: {
    position: 'absolute',
    top: 2,
    alignSelf: 'center',
  },
  northText: {
    fontSize: 11,
    fontWeight: '900',
    color: Colors.mdRed,
  },
  cardinalMarker: {
    position: 'absolute',
  },
  eastMarker: {
    right: 4,
    top: RING_SIZE / 2 - 7,
  },
  southMarker: {
    bottom: 2,
    alignSelf: 'center',
  },
  westMarker: {
    left: 4,
    top: RING_SIZE / 2 - 7,
  },
  cardinalText: {
    fontSize: 9,
    fontWeight: '700',
    color: Colors.textMuted,
  },
  headingText: {
    fontSize: 10,
    fontWeight: '700',
    color: Colors.tan,
    marginTop: 3,
    backgroundColor: Colors.overlay,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    overflow: 'hidden',
  },
});
