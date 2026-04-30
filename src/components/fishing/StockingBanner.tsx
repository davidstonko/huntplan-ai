/**
 * @file components/fishing/StockingBanner.tsx
 * @description Small stocking status banner for fishing locations.
 *
 * Displays when a fishing location was recently stocked with fish.
 * Shows stocking info (species, date, count) with visual urgency:
 * - "NEW" badge for stocking within 7 days (bright green)
 * - Standard banner for stocking within 30 days
 * - Muted/dimmed version for older stocking (30+ days)
 * - Returns null if no stocking data provided
 *
 * Compact design suitable for overlaying on info panels and list items.
 *
 * @module Components
 * @version 1.0.0
 */

import React, { useMemo } from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import Colors from '../../theme/colors';

// ── Types ──────────────────────────────────────────────────────

interface StockingBannerProps {
  /** Name of the fishing location */
  locationName: string;
  /** ISO date string of last stocking (YYYY-MM-DD) */
  lastStocked?: string;
  /** Species name (e.g., "Rainbow Trout", "Brown Trout") */
  species?: string;
  /** Number of fish stocked */
  numFish?: number;
  /** Optional container style override */
  style?: ViewStyle;
}

/**
 * Stocking information calculated from dates
 * @interface StockingInfo
 */
interface StockingInfo {
  daysSince: number;
  isNew: boolean; // Within 7 days
  isRecent: boolean; // Within 30 days
  isDimmed: boolean; // 30+ days
}

// ── Component ──────────────────────────────────────────────────

/**
 * StockingBanner - Displays recent fishing location stocking status
 *
 * Returns null if lastStocked is not provided.
 * Computes days since stocking and applies appropriate styling:
 * - NEW badge for ≤7 days (bright green background)
 * - Standard banner for 8-30 days
 * - Muted banner for 30+ days
 *
 * @component
 * @example
 * <StockingBanner
 *   locationName="Savage Mill Pond"
 *   lastStocked="2026-04-01"
 *   species="Rainbow Trout"
 *   numFish={500}
 * />
 */
export const StockingBanner: React.FC<StockingBannerProps> = ({
  locationName,
  lastStocked,
  species = 'Fish',
  numFish,
  style,
}) => {
  // Calculate stocking recency
  const stockingInfo: StockingInfo | null = useMemo(() => {
    if (!lastStocked) return null;

    try {
      const lastStockedDate = new Date(lastStocked);
      const now = new Date();
      const diffMs = now.getTime() - lastStockedDate.getTime();
      const daysSince = Math.floor(diffMs / (1000 * 60 * 60 * 24));

      return {
        daysSince: Math.max(0, daysSince),
        isNew: daysSince <= 7,
        isRecent: daysSince <= 30,
        isDimmed: daysSince > 30,
      };
    } catch (error) {
      if (__DEV__) console.warn('[StockingBanner] Date parsing failed:', error);
      return null;
    }
  }, [lastStocked]);

  // No data, render nothing
  if (!stockingInfo) {
    return null;
  }

  const { daysSince, isNew, isRecent, isDimmed } = stockingInfo;

  // Determine styling based on recency
  const isActive = isNew || isRecent;
  const containerStyle = isNew ? styles.containerNew : isRecent ? styles.containerRecent : styles.containerDimmed;
  const textStyle = isNew || isRecent ? styles.textActive : styles.textMuted;
  const badgeStyle = isNew ? styles.badgeNew : undefined;
  const badgeTextStyle = isNew ? styles.badgeTextNew : undefined;

  // Format stocking info
  const daysText = daysSince === 0 ? 'today' : `${daysSince}d ago`;
  const fishText = numFish ? `${numFish} fish` : '';
  const speciesText = species || 'Fish';

  return (
    <View style={[styles.container, containerStyle, style]}>
      {isNew && <View style={[styles.badge, badgeStyle]} />}

      <Text style={[styles.text, textStyle]}>
        {isNew ? '🆕 ' : '🐟 '}
        Stocked {daysText}
        {fishText && ` — ${speciesText} (${fishText})`}
        {!fishText && ` — ${speciesText}`}
      </Text>
    </View>
  );
};

// ── Styles ─────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 4,
    gap: 6,
  },

  // Recent (NEW - ≤7 days)
  containerNew: {
    backgroundColor: 'rgba(107, 158, 91, 0.25)', // success with transparency
    borderLeftWidth: 3,
    borderLeftColor: Colors.success,
  },

  // Recent (8-30 days)
  containerRecent: {
    backgroundColor: 'rgba(107, 158, 91, 0.15)',
    borderLeftWidth: 2,
    borderLeftColor: Colors.lichen,
  },

  // Dimmed (30+ days)
  containerDimmed: {
    backgroundColor: 'rgba(107, 107, 88, 0.1)',
    borderLeftWidth: 2,
    borderLeftColor: Colors.textMuted,
  },

  text: {
    fontSize: 12,
    fontWeight: '500',
    flex: 1,
  },

  textActive: {
    color: Colors.textPrimary,
  },

  textMuted: {
    color: Colors.textSecondary,
  },

  // NEW badge
  badge: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.success,
  },

  badgeNew: {
    backgroundColor: Colors.success,
  },

  badgeTextNew: {
    color: Colors.success,
  },
});
