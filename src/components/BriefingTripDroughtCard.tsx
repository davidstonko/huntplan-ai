/**
 * @file BriefingTripDroughtCard.tsx
 * @description Phase A.48 — soft, amber-bordered nudge that appears
 * on Daily Briefing when the user has gone > 30 days since their
 * last trip. Tap → planner of their most-recent-trip kind (the user's
 * habit signal beats a hardcoded default).
 *
 * Mirrors the A.20 streak-insurance CTA shape — an aspirational
 * nudge, not a stat. Renders null when no drought is active so the
 * briefing collapses cleanly. The picker
 * (briefingTripDroughtService.pickBriefingTripDrought) returns null
 * unless the user has at least one past trip AND
 * `cadence.daysSinceLastTrip > 30`.
 *
 * Composition:
 *   - Bordered card, no section title (it's a one-off CTA, not a
 *     dashboard).
 *   - Headline: "It's been N days since your last trip."
 *   - Sub-line: "Plan a new {kind} trip to break the drought."
 *   - Implicit tap target = whole card.
 *
 * @module Components
 * @version 2.3.0
 */

import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import Colors from '../theme/colors';
import type { BriefingTripDrought } from '../services/briefingTripDroughtService';

interface BriefingTripDroughtCardProps {
  drought: BriefingTripDrought | null;
}

export default function BriefingTripDroughtCard({
  drought,
}: BriefingTripDroughtCardProps): JSX.Element | null {
  const navigation = useNavigation<any>();
  if (!drought) return null;

  const kindLabel = drought.lastTripKind === 'camp' ? 'camp' : 'hike';
  const onPlan = () => {
    if (drought.lastTripKind === 'camp') {
      navigation.navigate('CampTripPlannerTab', {
        screen: 'CampTripPlannerMain',
      });
    } else {
      navigation.navigate('HikeTripPlannerTab', {
        screen: 'HikeTripPlannerMain',
      });
    }
  };

  return (
    <View style={styles.section}>
      <TouchableOpacity
        style={styles.card}
        activeOpacity={0.7}
        onPress={onPlan}
        accessibilityRole="button"
        accessibilityLabel={`It's been ${drought.daysSinceLastTrip} days since your last trip. Tap to plan a new ${kindLabel} trip.`}
      >
        <View style={styles.headerRow}>
          <Text style={styles.label}>TRIP DROUGHT</Text>
          <Text style={styles.daysPill}>{drought.daysSinceLastTrip} DAYS</Text>
        </View>
        <Text style={styles.headline}>
          It&apos;s been {drought.daysSinceLastTrip} days since your last trip.
        </Text>
        <Text style={styles.sub}>
          Plan a new {kindLabel} trip to break the drought →
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  section: { marginBottom: 18 },
  card: {
    backgroundColor: Colors.surface,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.amber,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  label: {
    fontSize: 11,
    fontWeight: '800',
    color: Colors.amber,
    letterSpacing: 1.2,
  },
  daysPill: {
    fontSize: 11,
    fontWeight: '800',
    color: Colors.amber,
    letterSpacing: 0.8,
    fontVariant: ['tabular-nums'],
  },
  headline: {
    color: Colors.textPrimary,
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 4,
    lineHeight: 19,
  },
  sub: {
    color: Colors.textSecondary,
    fontSize: 11,
    fontWeight: '600',
  },
});
