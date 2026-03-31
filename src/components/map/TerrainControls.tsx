/**
 * @file TerrainControls.tsx
 * @description 3D terrain control panel for map screens.
 * Provides terrain toggle, exaggeration slider, and ridge/valley identification hints.
 *
 * @module Components/Map
 * @version 3.0.0
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import Colors from '../../theme/colors';

interface TerrainControlsProps {
  /** Whether 3D terrain is currently enabled */
  enabled: boolean;
  /** Toggle terrain on/off */
  onToggle: () => void;
  /** Current exaggeration level (0.5 - 3.0) */
  exaggeration: number;
  /** Set exaggeration level */
  onExaggerationChange: (value: number) => void;
  /** Whether to show the expanded controls or just the toggle */
  expanded?: boolean;
}

const EXAGGERATION_LEVELS = [
  { value: 0.5, label: 'Subtle' },
  { value: 1.0, label: 'Normal' },
  { value: 1.5, label: 'Enhanced' },
  { value: 2.0, label: 'High' },
  { value: 3.0, label: 'Extreme' },
];

/**
 * TerrainControls — Inline terrain settings for map overlay.
 *
 * Features:
 * - 3D terrain on/off toggle
 * - Exaggeration level selector (5 presets)
 * - Terrain tip for hunting context (ridge/valley placement)
 */
export default function TerrainControls({
  enabled,
  onToggle,
  exaggeration,
  onExaggerationChange,
  expanded = true,
}: TerrainControlsProps) {
  return (
    <View style={styles.container}>
      {/* Toggle row */}
      <TouchableOpacity
        style={styles.toggleRow}
        onPress={onToggle}
        activeOpacity={0.7}
      >
        <Text style={styles.toggleIcon}>{enabled ? '🏔️' : '🗺️'}</Text>
        <Text style={styles.toggleLabel}>
          {enabled ? '3D Terrain ON' : '3D Terrain OFF'}
        </Text>
        <View style={[styles.toggleDot, enabled && styles.toggleDotActive]} />
      </TouchableOpacity>

      {/* Exaggeration selector (only when enabled + expanded) */}
      {enabled && expanded && (
        <>
          <View style={styles.exaggerationRow}>
            {EXAGGERATION_LEVELS.map((level) => (
              <TouchableOpacity
                key={level.value}
                style={[
                  styles.exaggerationChip,
                  exaggeration === level.value && styles.exaggerationChipActive,
                ]}
                onPress={() => onExaggerationChange(level.value)}
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    styles.exaggerationText,
                    exaggeration === level.value && styles.exaggerationTextActive,
                  ]}
                >
                  {level.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Hunting terrain tip */}
          <View style={styles.tipContainer}>
            <Text style={styles.tipText}>
              {'💡'} Ridges and saddles are prime stand locations. Use 3D terrain to identify
              elevation features for tree stand and ground blind placement.
            </Text>
          </View>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.surface,
    borderRadius: 10,
    padding: 10,
    borderWidth: 1,
    borderColor: Colors.mud,
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  toggleIcon: {
    fontSize: 16,
  },
  toggleLabel: {
    flex: 1,
    fontSize: 13,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  toggleDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: Colors.textMuted,
  },
  toggleDotActive: {
    backgroundColor: '#2E7D32',
  },
  exaggerationRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
    gap: 4,
  },
  exaggerationChip: {
    flex: 1,
    paddingVertical: 5,
    alignItems: 'center',
    borderRadius: 6,
    backgroundColor: Colors.background,
    borderWidth: 1,
    borderColor: Colors.clay,
  },
  exaggerationChipActive: {
    backgroundColor: Colors.moss,
    borderColor: Colors.moss,
  },
  exaggerationText: {
    fontSize: 10,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  exaggerationTextActive: {
    color: Colors.textOnAccent,
  },
  tipContainer: {
    marginTop: 8,
    paddingHorizontal: 4,
  },
  tipText: {
    fontSize: 10,
    color: Colors.textMuted,
    lineHeight: 14,
    fontStyle: 'italic',
  },
});
