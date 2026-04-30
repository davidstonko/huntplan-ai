/**
 * AppLogo — Reusable branded logo component for MDHuntFishOutdoors.
 * Renders a circular badge with MD flag colors and a crosshairs icon,
 * used on splash, mode picker, donate, and disclaimer screens.
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Colors from '../../theme/colors';

interface AppLogoProps {
  /** Size of the logo circle (default 64) */
  size?: number;
  /** Show the app name text below the logo */
  showTitle?: boolean;
}

const AppLogo: React.FC<AppLogoProps> = ({ size = 64, showTitle = false }) => {
  const iconSize = size * 0.45;
  const borderWidth = size * 0.04;

  return (
    <View style={styles.wrapper}>
      {/* Outer circle with MD gold border */}
      <View
        style={[
          styles.outerCircle,
          {
            width: size,
            height: size,
            borderRadius: size / 2,
            borderWidth,
            borderColor: Colors.mdGold,
          },
        ]}
      >
        {/* Inner circle with dark background */}
        <View
          style={[
            styles.innerCircle,
            {
              width: size - borderWidth * 4,
              height: size - borderWidth * 4,
              borderRadius: (size - borderWidth * 4) / 2,
            },
          ]}
        >
          {/* MD Flag quadrant accents */}
          <View style={[styles.quadrant, styles.topLeft, { backgroundColor: Colors.mdRed + '50' }]} />
          <View style={[styles.quadrant, styles.topRight, { backgroundColor: Colors.mdWhite + '35' }]} />
          <View style={[styles.quadrant, styles.bottomLeft, { backgroundColor: Colors.mdWhite + '35' }]} />
          <View style={[styles.quadrant, styles.bottomRight, { backgroundColor: Colors.mdRed + '50' }]} />

          {/* Crosshairs icon */}
          <View style={styles.crosshairsContainer}>
            {/* Vertical line */}
            <View
              style={[
                styles.crossLine,
                styles.vertical,
                { height: iconSize, width: 2 },
              ]}
            />
            {/* Horizontal line */}
            <View
              style={[
                styles.crossLine,
                styles.horizontal,
                { width: iconSize, height: 2 },
              ]}
            />
            {/* Center circle */}
            <View
              style={[
                styles.centerDot,
                {
                  width: iconSize * 0.55,
                  height: iconSize * 0.55,
                  borderRadius: iconSize * 0.275,
                  borderWidth: 2,
                },
              ]}
            />
            {/* MD letters */}
            <Text
              style={[
                styles.mdText,
                { fontSize: iconSize * 0.28 },
              ]}
            >
              MD
            </Text>
          </View>
        </View>
      </View>
      {showTitle && (
        <Text style={styles.titleText}>MDHuntFishOutdoors</Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    alignItems: 'center',
  },
  outerCircle: {
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: Colors.mdGold,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  innerCircle: {
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  quadrant: {
    position: 'absolute',
    width: '50%',
    height: '50%',
  },
  topLeft: { top: 0, left: 0 },
  topRight: { top: 0, right: 0 },
  bottomLeft: { bottom: 0, left: 0 },
  bottomRight: { bottom: 0, right: 0 },
  crosshairsContainer: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  crossLine: {
    position: 'absolute',
    backgroundColor: Colors.mdGold,
    opacity: 0.6,
  },
  vertical: {},
  horizontal: {},
  centerDot: {
    position: 'absolute',
    borderColor: Colors.mdGold,
    backgroundColor: 'transparent',
  },
  mdText: {
    fontWeight: '900',
    color: Colors.mdGold,
    letterSpacing: 3,
  },
  titleText: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.tan,
    letterSpacing: 0.5,
    marginTop: 8,
  },
});

export default AppLogo;
