/**
 * @file BriefingGoalSpotlightCard.tsx
 * @description Daily Briefing "Goal Spotlight" card — Phase A.39.
 *
 * Surfaces the single annual goal most worth acting on in the
 * briefing's footer cluster. Designed to drive a tap → goals
 * screen → quick log entry loop. When no goal is eligible (no
 * goals defined, all complete, all past-year) the card renders
 * null — the briefing collapses cleanly without an empty stub.
 *
 * @module Components
 * @version 2.3.0
 *
 * Composition:
 *   - Section title row.
 *   - Goal label line (year + scope + metric tag).
 *   - One row, three cells:
 *       PROGRESS — "47 / 100 mi" + percent.
 *       EXPECTED — "27 mi · day 115" baseline reference.
 *       PACE     — BEHIND PACE / ON PACE / AHEAD pill (color-emphasized).
 *
 * Tapping the card navigates to the Goals screen so the user can
 * jump from "I'm 5 entries behind" → quick add. Single-target tap
 * intentionally — splitting into multi-target zones would muddle
 * the hub's "one card, one action" rhythm.
 */

import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import Colors from '../theme/colors';
import type { GoalProgress } from '../types/goal';
import { paceLabel } from '../services/briefingGoalSpotlightService';
import { defaultLabelFor } from '../services/goalsService';

interface BriefingGoalSpotlightCardProps {
  /**
   * The picked goal-progress snapshot, or `null` when no goal
   * qualifies. The card returns `null` on null so the parent doesn't
   * have to gate the JSX itself.
   */
  featured: GoalProgress | null;
}

export default function BriefingGoalSpotlightCard({
  featured,
}: BriefingGoalSpotlightCardProps): JSX.Element | null {
  const navigation = useNavigation<any>();
  if (!featured) return null;

  // Color the pace pill based on bucket — service stays theme-free,
  // same convention as A.34's accent + A.35's delta + A.38's headline.
  // Behind = amber (a nudge color, not alarm-red), ahead = mdGold,
  // on-pace = textSecondary (muted-but-present), complete = moss
  // (the green of "done" — though pickFeaturedGoal filters these out
  // so this branch never actually renders, kept for completeness).
  const paceColor =
    featured.paceStatus === 'behind'
      ? Colors.amber
      : featured.paceStatus === 'ahead'
        ? Colors.mdGold
        : featured.paceStatus === 'complete'
          ? Colors.moss
          : Colors.textSecondary;

  const goalTitle = featured.goal.label?.trim() || defaultLabelFor(featured.goal);
  const percentRounded = Math.round(featured.percent);
  const expectedRounded = Math.round(featured.expectedAtThisPoint);

  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>GOAL SPOTLIGHT</Text>
      <TouchableOpacity
        style={styles.card}
        activeOpacity={0.7}
        onPress={() => navigation.navigate('Goals')}
      >
        <Text style={styles.goalTitle} numberOfLines={1}>
          {goalTitle}
        </Text>
        <View style={styles.row}>
          <View style={styles.cell}>
            <Text style={styles.cellLabel}>PROGRESS</Text>
            <View style={styles.progressRow}>
              <Text style={styles.progressValue}>
                {featured.display.current} / {featured.display.target}
              </Text>
              <Text style={styles.progressUnit}>{featured.display.unit}</Text>
            </View>
            <Text style={styles.progressPercent}>{percentRounded}%</Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.cell}>
            <Text style={styles.cellLabel}>EXPECTED</Text>
            <Text style={styles.cellValue}>
              {expectedRounded} {featured.display.unit}
            </Text>
            <Text style={styles.cellSub}>day {featured.daysElapsed}</Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.cell}>
            <Text style={styles.cellLabel}>PACE</Text>
            <Text style={[styles.pacePill, { color: paceColor }]}>
              {paceLabel(featured)}
            </Text>
          </View>
        </View>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  section: { marginBottom: 18 },
  sectionTitle: {
    color: Colors.textMuted,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.2,
    marginBottom: 8,
  },
  card: {
    backgroundColor: Colors.surface,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.mud,
    paddingHorizontal: 12,
    paddingVertical: 12,
    minHeight: 56,
    justifyContent: 'center',
  },
  goalTitle: {
    color: Colors.textPrimary,
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 8,
  },
  row: { flexDirection: 'row', alignItems: 'center' },
  cell: { flex: 1, alignItems: 'flex-start' },
  cellLabel: {
    color: Colors.textMuted,
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.8,
    marginBottom: 2,
  },
  cellValue: {
    color: Colors.textPrimary,
    fontSize: 13,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
  },
  cellSub: {
    color: Colors.textMuted,
    fontSize: 10,
    fontWeight: '600',
    marginTop: 1,
    fontVariant: ['tabular-nums'],
  },
  progressRow: { flexDirection: 'row', alignItems: 'baseline' },
  progressValue: {
    color: Colors.textPrimary,
    fontSize: 13,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
  },
  progressUnit: {
    color: Colors.textSecondary,
    fontSize: 10,
    fontWeight: '700',
    marginLeft: 4,
  },
  progressPercent: {
    color: Colors.mdGold,
    fontSize: 10,
    fontWeight: '800',
    marginTop: 1,
    fontVariant: ['tabular-nums'],
  },
  pacePill: {
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  divider: {
    width: 1,
    backgroundColor: Colors.mud,
    alignSelf: 'stretch',
    marginHorizontal: 10,
  },
});
