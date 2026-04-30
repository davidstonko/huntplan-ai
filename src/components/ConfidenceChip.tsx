/**
 * @file ConfidenceChip.tsx
 * @description UI component for displaying data-source confidence indicators.
 *
 * Shows a small colored pill badge indicating the confidence level of a
 * geo-location or data point. Used in feature detail panels (e.g., angler
 * access sites, hunting lands, etc.).
 *
 * Color scheme:
 *   - verified (green): Sourced directly from DNR/authoritative data pulled within ~30 days
 *   - approximate (amber): Hand-coded from non-authoritative sources (legacy)
 *   - community (gray): Crowdsourced or user-contributed
 *   - unknown (light gray): No confidence metadata available
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';

type ConfidenceLevel = 'verified' | 'approximate' | 'community' | 'unknown';

interface ConfidenceChipProps {
  level: ConfidenceLevel;
  tooltip?: string;
  onLongPress?: () => void;
}

interface ChipStyle {
  backgroundColor: string;
  textColor: string;
  borderColor: string;
  label: string;
}

const CHIP_STYLES: Record<ConfidenceLevel, ChipStyle> = {
  verified: {
    backgroundColor: '#E8F5E9',
    textColor: '#2E7D32',
    borderColor: '#4CAF50',
    label: 'Verified',
  },
  approximate: {
    backgroundColor: '#FFF3E0',
    textColor: '#E65100',
    borderColor: '#FF9800',
    label: 'Approximate',
  },
  community: {
    backgroundColor: '#F5F5F5',
    textColor: '#666666',
    borderColor: '#BDBDBD',
    label: 'Community',
  },
  unknown: {
    backgroundColor: '#FAFAFA',
    textColor: '#999999',
    borderColor: '#E0E0E0',
    label: 'Unknown',
  },
};

/**
 * Renders a small colored confidence badge.
 *
 * @param level - Confidence level: 'verified', 'approximate', 'community', or 'unknown'
 * @param tooltip - Optional text shown on long-press (e.g., "Sourced from MD DNR FeatureServer, 2026-04-19")
 * @param onLongPress - Optional callback when long-pressed (for showing tooltip)
 */
export default function ConfidenceChip({
  level,
  tooltip,
  onLongPress,
}: ConfidenceChipProps) {
  const style = CHIP_STYLES[level] || CHIP_STYLES.unknown;

  const chipStyles = StyleSheet.create({
    chip: {
      backgroundColor: style.backgroundColor,
      borderWidth: 1,
      borderColor: style.borderColor,
      borderRadius: 12,
      paddingHorizontal: 10,
      paddingVertical: 4,
      alignSelf: 'flex-start',
    },
    text: {
      color: style.textColor,
      fontSize: 12,
      fontWeight: '600',
    },
  });

  const content = (
    <View style={chipStyles.chip}>
      <Text style={chipStyles.text}>{style.label}</Text>
    </View>
  );

  if (tooltip || onLongPress) {
    return (
      <TouchableOpacity
        onLongPress={onLongPress}
        activeOpacity={0.7}
        accessibilityLabel={tooltip}
        accessibilityHint={tooltip}
      >
        {content}
      </TouchableOpacity>
    );
  }

  return content;
}
