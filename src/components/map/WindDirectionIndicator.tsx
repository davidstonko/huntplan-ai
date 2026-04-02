/**
 * @file WindDirectionIndicator.tsx
 * @description Wind direction and speed indicator for the map.
 * Shows animated wind direction arrow with cardinal direction and speed.
 * Color-coded by wind intensity: green (light), amber (moderate), red (heavy).
 *
 * @module Components/Map
 * @version 1.0.0
 */

import React, { useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
} from 'react-native';
import Colors from '../../theme/colors';

interface WindDirectionIndicatorProps {
  windDirection: string; // Cardinal direction (N, NE, E, SE, S, SW, W, NW)
  windSpeed: string;     // Wind speed string (e.g., "12 mph")
  visible?: boolean;
}

/**
 * Parse wind speed from string and return numeric mph
 * @param windSpeed - Wind speed string (e.g., "10 to 15 mph")
 * @returns Numeric wind speed in mph (or undefined if unparseable)
 */
function parseWindSpeedMph(windSpeed: string): number | undefined {
  const match = windSpeed.match(/\d+/);
  return match ? parseInt(match[0]) : undefined;
}

/**
 * Convert cardinal direction to rotation degrees (0-360)
 * @param direction - Cardinal direction (N, NE, E, SE, S, SW, W, NW)
 * @returns Rotation in degrees
 */
function directionToRotation(direction: string): number {
  const directionMap: Record<string, number> = {
    N: 0,
    NE: 45,
    E: 90,
    SE: 135,
    S: 180,
    SW: 225,
    W: 270,
    NW: 315,
  };
  return directionMap[direction.toUpperCase()] ?? 0;
}

/**
 * WindDirectionIndicator — Shows wind direction arrow + speed + cardinal direction
 *
 * Positioned on map near weather overlay.
 * Color intensity based on wind speed:
 * - Green: < 10 mph (light)
 * - Amber: 10-20 mph (moderate)
 * - Red: > 20 mph (heavy/gusty)
 */
export default function WindDirectionIndicator({
  windDirection,
  windSpeed,
  visible = true,
}: WindDirectionIndicatorProps) {
  if (!visible) return null;

  const windMph = parseWindSpeedMph(windSpeed);

  // Determine color based on wind intensity
  const windColor = useMemo(() => {
    if (windMph === undefined) return Colors.textSecondary;
    if (windMph < 10) return Colors.success; // Green - light wind
    if (windMph <= 20) return Colors.warning; // Amber - moderate wind
    return Colors.danger; // Red - heavy wind
  }, [windMph]);

  // Calculate rotation for arrow
  const rotation = directionToRotation(windDirection);

  // Get wind intensity label
  const windIntensityLabel = useMemo(() => {
    if (windMph === undefined) return 'Calm';
    if (windMph < 5) return 'Calm';
    if (windMph < 10) return 'Light';
    if (windMph <= 20) return 'Moderate';
    return 'Heavy';
  }, [windMph]);

  return (
    <View style={styles.container}>
      {/* Arrow indicator with rotation */}
      <View
        style={[
          styles.arrowContainer,
          {
            transform: [{ rotate: `${rotation}deg` }],
          },
        ]}
      >
        <Text
          style={[
            styles.arrowText,
            { color: windColor },
          ]}
        >
          ↑
        </Text>
      </View>

      {/* Direction and speed text */}
      <View style={styles.textContainer}>
        <Text style={[styles.directionText, { color: windColor }]}>
          {windDirection.toUpperCase()}
        </Text>
        <Text style={styles.speedText}>
          {windSpeed}
        </Text>
        <Text style={[styles.intensityText, { color: windColor }]}>
          {windIntensityLabel}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: Colors.forestDark,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: Colors.mud,
  },
  arrowContainer: {
    width: 28,
    height: 28,
    justifyContent: 'center',
    alignItems: 'center',
  },
  arrowText: {
    fontSize: 20,
    fontWeight: '700',
  },
  textContainer: {
    alignItems: 'flex-start',
    gap: 2,
  },
  directionText: {
    fontSize: 12,
    fontWeight: '700',
  },
  speedText: {
    fontSize: 11,
    color: Colors.textSecondary,
    fontWeight: '600',
  },
  intensityText: {
    fontSize: 10,
    fontWeight: '500',
  },
});
