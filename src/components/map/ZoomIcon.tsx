/**
 * ZoomIcon — magnifying-glass + and − icons for map zoom buttons.
 *
 * 2026-04-26: replaces the previous up-arrow / down-arrow icons that read
 * as "scroll" instead of "zoom". A magnifying-glass-with-plus / minus is
 * the universal mobile zoom affordance.
 *
 * Rendered with View primitives (no react-native-svg installed). The lens
 * is a circle (View with borderRadius), the handle is a rotated rect, and
 * the +/− is a small Text glyph centered in the lens.
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

interface Props {
  variant: 'plus' | 'minus';
  /** Outer button color (matches surrounding button text/icon color). */
  color?: string;
  /** Diameter of the icon block. */
  size?: number;
}

export default function ZoomIcon({
  variant,
  color = '#FFFFFF',
  size = 22,
}: Props) {
  const lensSize = Math.round(size * 0.85);
  const handleLength = Math.round(size * 0.32);
  const handleThickness = Math.max(2, Math.round(size * 0.12));
  const glyphSize = Math.round(size * 0.6);
  return (
    <View
      style={{
        width: size,
        height: size,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      {/* Lens — open circle */}
      <View
        style={[
          styles.lens,
          {
            width: lensSize,
            height: lensSize,
            borderRadius: lensSize / 2,
            borderColor: color,
            borderWidth: handleThickness * 0.7,
          },
        ]}
      >
        <Text
          style={{
            color,
            fontSize: glyphSize,
            fontWeight: '900',
            lineHeight: glyphSize,
            textAlign: 'center',
          }}
        >
          {variant === 'plus' ? '+' : '−'}
        </Text>
      </View>
      {/* Handle — diagonal rect from lower-right of lens */}
      <View
        style={{
          position: 'absolute',
          right: 0,
          bottom: 1,
          width: handleLength,
          height: handleThickness,
          backgroundColor: color,
          borderRadius: handleThickness / 2,
          transform: [{ rotate: '45deg' }],
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  lens: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
