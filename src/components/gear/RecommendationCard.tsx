/**
 * RecommendationCard.tsx — Bait/fly/lure recommendation display
 *
 * Shows species, method, confidence badge (color-coded), primary recommendations
 * (bait, fly, or lure lists), conditions, water temperature, and source citation.
 * Left border color indicates confidence level.
 *
 * Used by fishing recommendation results and AI chat suggestions.
 */

import React from 'react';
import {
  View,
  TouchableOpacity,
  StyleSheet,
  ViewStyle,
} from 'react-native';
import { Text } from 'react-native';
import Colors from '../../theme/colors';
import { BaitRecommendation } from '../../types/gear';

interface RecommendationCardProps {
  /** Bait recommendation data */
  recommendation: BaitRecommendation;
  /** Method to display: bait, fly, or lure */
  method?: 'bait' | 'fly' | 'lure';
  /** Callback when "View Products" is tapped */
  onViewProducts?: () => void;
  /** Optional style override */
  style?: ViewStyle;
}

/**
 * Confidence level to color mapping
 */
const confidenceColors: Record<string, { border: string; badge: string; text: string }> = {
  high: {
    border: Colors.success,
    badge: Colors.success,
    text: 'High Confidence',
  },
  medium: {
    border: Colors.amber,
    badge: Colors.amber,
    text: 'Moderate Confidence',
  },
  low: {
    border: Colors.rust,
    badge: Colors.rust,
    text: 'Lower Confidence',
  },
};

/**
 * RecommendationCard component — displays bait/fly/lure recommendation
 *
 * Formatted with colored left border indicating confidence. Shows primary
 * recommendations, conditions, water temp, and source.
 */
export const RecommendationCard: React.FC<RecommendationCardProps> = ({
  recommendation,
  method,
  onViewProducts,
  style,
}) => {
  const colors = confidenceColors[recommendation.confidence];

  // Determine which recommendations to show
  let primaryList: string[] = [];
  let methodLabel = '';

  if (method === 'bait' || (method === undefined && recommendation.method !== 'fly' && recommendation.method !== 'lure')) {
    primaryList = recommendation.primaryBait;
    methodLabel = 'Baits';
  } else if (method === 'fly' || (method === undefined && recommendation.method !== 'bait' && recommendation.method !== 'lure')) {
    primaryList = recommendation.primaryFlies;
    methodLabel = 'Flies';
  } else if (method === 'lure' || (method === undefined && recommendation.method !== 'bait' && recommendation.method !== 'fly')) {
    primaryList = recommendation.primaryLures;
    methodLabel = 'Lures';
  }

  // Capitalize species name
  const speciesLabel = recommendation.species
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');

  return (
    <View
      style={[styles.container, { borderLeftColor: colors.border }, style]}
      accessible={true}
      accessibilityLabel={`Recommendation for ${speciesLabel}`}
      accessibilityRole="text"
    >
      {/* Header: Species + confidence badge */}
      <View style={styles.header}>
        <Text style={styles.species}>{speciesLabel}</Text>
        <View style={[styles.confidenceBadge, { backgroundColor: colors.badge }]}>
          <Text style={styles.confidenceText}>{colors.text}</Text>
        </View>
      </View>

      {/* Water type and region */}
      <View style={styles.metaRow}>
        <Text style={styles.metaLabel}>Water Type:</Text>
        <Text style={styles.metaValue}>
          {recommendation.waterType.charAt(0).toUpperCase() + recommendation.waterType.slice(1)}
        </Text>
        <Text style={[styles.metaLabel, { marginLeft: 16 }]}>Region:</Text>
        <Text style={styles.metaValue}>
          {recommendation.region.charAt(0).toUpperCase() + recommendation.region.slice(1)}
        </Text>
      </View>

      {/* Primary recommendations list */}
      {primaryList.length > 0 && (
        <View style={styles.primarySection}>
          <Text style={styles.primaryLabel}>{methodLabel}</Text>
          <View style={styles.primaryList}>
            {primaryList.slice(0, 5).map((item, idx) => (
              <Text key={idx} style={styles.primaryItem}>
                {`• ${item}`}
              </Text>
            ))}
            {primaryList.length > 5 && (
              <Text style={styles.moreItems}>
                {`+ ${primaryList.length - 5} more`}
              </Text>
            )}
          </View>
        </View>
      )}

      {/* Conditions and water temp */}
      <View style={styles.conditionsSection}>
        <View style={styles.conditionRow}>
          <Text style={styles.conditionLabel}>Best Conditions:</Text>
          <Text style={styles.conditionValue}>{recommendation.conditions}</Text>
        </View>
        <View style={styles.conditionRow}>
          <Text style={styles.conditionLabel}>Water Temp:</Text>
          <Text style={styles.conditionValue}>{recommendation.waterTemp}</Text>
        </View>
      </View>

      {/* Source and action row */}
      <View style={styles.footerRow}>
        <Text style={styles.source} numberOfLines={1}>
          Source: {recommendation.source}
        </Text>
        {onViewProducts && (
          <TouchableOpacity
            style={styles.viewProductsButton}
            onPress={onViewProducts}
            activeOpacity={0.7}
            accessible={true}
            accessibilityLabel="View Related Products"
            accessibilityRole="button"
          >
            <Text style={styles.viewProductsText}>Products</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.surface,
    borderRadius: 10,
    borderLeftWidth: 5,
    padding: 14,
    marginBottom: 12,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
    gap: 12,
  },
  species: {
    fontSize: 17,
    fontWeight: '700',
    color: Colors.textPrimary,
    flex: 1,
  },
  confidenceBadge: {
    borderRadius: 6,
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  confidenceText: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.textOnAccent,
    textTransform: 'uppercase',
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    flexWrap: 'wrap',
  },
  metaLabel: {
    fontSize: 12,
    color: Colors.textMuted,
    fontWeight: '600',
  },
  metaValue: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginLeft: 4,
  },
  primarySection: {
    marginBottom: 12,
    backgroundColor: Colors.surfaceElevated,
    borderRadius: 8,
    padding: 10,
  },
  primaryLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.tan,
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  primaryList: {
    gap: 6,
  },
  primaryItem: {
    fontSize: 13,
    color: Colors.textSecondary,
    lineHeight: 18,
  },
  moreItems: {
    fontSize: 12,
    color: Colors.textMuted,
    fontWeight: '600',
    fontStyle: 'italic',
    marginTop: 4,
  },
  conditionsSection: {
    marginBottom: 12,
    gap: 8,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.mud,
  },
  conditionRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  conditionLabel: {
    fontSize: 12,
    color: Colors.textMuted,
    fontWeight: '600',
    minWidth: 110,
  },
  conditionValue: {
    fontSize: 12,
    color: Colors.textSecondary,
    flex: 1,
    lineHeight: 17,
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
  },
  source: {
    fontSize: 11,
    color: Colors.textMuted,
    fontStyle: 'italic',
    flex: 1,
  },
  viewProductsButton: {
    backgroundColor: Colors.moss,
    borderRadius: 6,
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  viewProductsText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.textOnAccent,
  },
});
