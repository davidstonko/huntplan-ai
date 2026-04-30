/**
 * StandWindBadge — Small color-coded badge showing wind match status for a tree stand.
 * Green = ideal wind, Amber = acceptable, Red = poor.
 * Placed next to stand/blind markers on the map.
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { WindMatchLevel } from '../../services/weatherService';
import Colors from '../../theme/colors';

interface StandWindBadgeProps {
  match: WindMatchLevel;
  /** Show text label alongside dot (default false for map markers) */
  showLabel?: boolean;
}

const MATCH_CONFIG: Record<WindMatchLevel, { color: string; label: string; emoji: string }> = {
  ideal: { color: Colors.success, label: 'GO', emoji: '\u2705' },
  acceptable: { color: Colors.amber, label: 'OK', emoji: '\u26A0\uFE0F' },
  poor: { color: Colors.danger, label: 'NO', emoji: '\u274C' },
};

export default function StandWindBadge({ match, showLabel = false }: StandWindBadgeProps) {
  const config = MATCH_CONFIG[match];

  if (showLabel) {
    return (
      <View style={[styles.labelBadge, { backgroundColor: config.color }]}>
        <Text style={styles.labelText}>{config.label}</Text>
      </View>
    );
  }

  return (
    <View style={[styles.dot, { backgroundColor: config.color }]} />
  );
}

const styles = StyleSheet.create({
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    borderWidth: 1.5,
    borderColor: Colors.background,
    position: 'absolute',
    top: -2,
    right: -2,
  },
  labelBadge: {
    borderRadius: 8,
    paddingHorizontal: 5,
    paddingVertical: 1,
  },
  labelText: {
    fontSize: 8,
    fontWeight: '800',
    color: Colors.textOnAccent,
    letterSpacing: 0.5,
  },
});
