/**
 * WindRosePicker — Interactive compass rose for selecting ideal wind directions.
 * Users tap 1-3 cardinal/ordinal directions (N, NE, E, SE, S, SW, W, NW)
 * to indicate which winds are ideal for a tree stand.
 * Selected directions show green, unselected show muted.
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { CardinalDirection } from '../../types/scout';
import Colors from '../../theme/colors';

interface WindRosePickerProps {
  selected: CardinalDirection[];
  onToggle: (dir: CardinalDirection) => void;
  /** Maximum selectable directions (default 3) */
  max?: number;
  /** Size of the compass in points (default 180) */
  size?: number;
}

const DIRECTIONS: { dir: CardinalDirection; angle: number; label: string }[] = [
  { dir: 'N', angle: 0, label: 'N' },
  { dir: 'NE', angle: 45, label: 'NE' },
  { dir: 'E', angle: 90, label: 'E' },
  { dir: 'SE', angle: 135, label: 'SE' },
  { dir: 'S', angle: 180, label: 'S' },
  { dir: 'SW', angle: 225, label: 'SW' },
  { dir: 'W', angle: 270, label: 'W' },
  { dir: 'NW', angle: 315, label: 'NW' },
];

export default function WindRosePicker({
  selected,
  onToggle,
  max = 3,
  size = 180,
}: WindRosePickerProps) {
  const center = size / 2;
  const radius = size / 2 - 24;

  const handleToggle = (dir: CardinalDirection) => {
    if (selected.includes(dir)) {
      onToggle(dir);
    } else if (selected.length < max) {
      onToggle(dir);
    }
  };

  return (
    <View style={[styles.container, { width: size, height: size }]}>
      {/* Center crosshair */}
      <View style={[styles.centerDot, { left: center - 4, top: center - 4 }]} />

      {/* Compass ring lines */}
      <View style={[styles.ringLine, styles.ringH, { top: center - 0.5, left: 20, right: 20 }]} />
      <View style={[styles.ringLine, styles.ringV, { left: center - 0.5, top: 20, bottom: 20 }]} />

      {/* Direction buttons arranged in a circle */}
      {DIRECTIONS.map(({ dir, angle, label }) => {
        const isSelected = selected.includes(dir);
        const rad = ((angle - 90) * Math.PI) / 180;
        const x = center + radius * Math.cos(rad) - 18;
        const y = center + radius * Math.sin(rad) - 18;

        return (
          <TouchableOpacity
            key={dir}
            style={[
              styles.dirBtn,
              { left: x, top: y },
              isSelected && styles.dirBtnSelected,
            ]}
            onPress={() => handleToggle(dir)}
            activeOpacity={0.7}
          >
            <Text style={[styles.dirLabel, isSelected && styles.dirLabelSelected]}>
              {label}
            </Text>
          </TouchableOpacity>
        );
      })}

      {/* Hint text below */}
      <Text style={styles.hint}>
        {selected.length === 0
          ? 'Tap ideal wind directions'
          : `${selected.length}/${max} selected`}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    alignSelf: 'center',
    marginVertical: 8,
  },
  centerDot: {
    position: 'absolute',
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.textMuted,
  },
  ringLine: {
    position: 'absolute',
    backgroundColor: Colors.mud,
  },
  ringH: {
    height: 1,
  },
  ringV: {
    width: 1,
  },
  dirBtn: {
    position: 'absolute',
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.surface,
    borderWidth: 1.5,
    borderColor: Colors.mud,
  },
  dirBtnSelected: {
    backgroundColor: Colors.forestDark,
    borderColor: Colors.success,
  },
  dirLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.textMuted,
  },
  dirLabelSelected: {
    color: Colors.success,
  },
  hint: {
    position: 'absolute',
    bottom: -6,
    alignSelf: 'center',
    left: 0,
    right: 0,
    textAlign: 'center',
    fontSize: 10,
    color: Colors.textMuted,
    fontWeight: '600',
  },
});
