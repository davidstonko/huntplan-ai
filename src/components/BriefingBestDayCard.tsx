/**
 * @file BriefingBestDayCard.tsx
 * @description Daily Briefing "Best Day This Week" card — Phase A.38.
 *
 * Sits one rung up from A.35's Tomorrow card: A.35 answers "is it
 * worth setting an alarm tonight?", A.38 answers "if I'm planning
 * my weekend, when should I block?". The two cards are complementary
 * not redundant — when they agree on the same day they reinforce;
 * when they disagree the user gets two different planning horizons
 * in the same glance.
 *
 * Sync — reuses `getLocalSolunarData` for each of the 7 lookahead
 * days, no network. Sits at the bottom of the briefing's
 * forward-looking footer cluster, directly below the Tomorrow card.
 *
 * @module Components
 * @version 2.3.0
 *
 * Composition:
 *  - Section title row.
 *  - "Today is the best day" headline branch when today wins, OR
 *  - Three cells when a future day wins:
 *      BEST DAY  — relative label (TODAY/TOMORROW/IN N DAYS).
 *      RATING    — label + 0–100 score (mdGold).
 *      WEEKDAY   — short weekday name pill (mdGold-tinted).
 */

import React, { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Colors from '../theme/colors';
import { getLocalSolunarData } from '../services/solunarService';
import { addDaysToYmd } from '../services/briefingTomorrowService';
import {
  BEST_DAY_WINDOW,
  pickBestDay,
  relativeDayLabel,
} from '../services/briefingBestDayService';

interface BriefingBestDayCardProps {
  /** YYYY-MM-DD for today (briefing aggregator emits this). */
  todayYmd: string;
  /** Decimal latitude. */
  latitude: number;
  /** Decimal longitude (negative in Maryland). */
  longitude: number;
}

export default function BriefingBestDayCard({
  todayYmd,
  latitude,
  longitude,
}: BriefingBestDayCardProps): JSX.Element {
  // Build the 7-day lookahead in one memoized pass. `getLocalSolunarData`
  // is sync + offline so a 7-call loop costs essentially nothing — well
  // under 1 ms in practice. Re-runs only when the location or the
  // briefing's anchor date changes (so a midnight rollover triggers a
  // fresh pick the next morning, but a re-render does not).
  const summary = useMemo(() => {
    const data = Array.from({ length: BEST_DAY_WINDOW }, (_, i) =>
      getLocalSolunarData(latitude, longitude, addDaysToYmd(todayYmd, i)),
    );
    return pickBestDay(todayYmd, data);
  }, [latitude, longitude, todayYmd]);

  // When today wins the scan we render an alternate single-line
  // headline ("TODAY IS THE BEST DAY THIS WEEK") rather than the
  // three-cell layout. Avoids the awkward "BEST DAY: TODAY · ··· · SAT"
  // phrasing that reads like a copy-paste bug.
  if (summary.todayIsBest) {
    return (
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>BEST DAY THIS WEEK</Text>
        <View style={styles.card}>
          <View style={styles.headlineRow}>
            <Text style={styles.headlineText}>
              TODAY IS THE BEST DAY THIS WEEK
            </Text>
            <Text style={styles.headlineScore}>· {summary.ratingScore}</Text>
          </View>
          <Text style={styles.headlineSub}>
            {summary.ratingLabel.toUpperCase()} · {summary.weekdayShort.toUpperCase()}
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>BEST DAY THIS WEEK</Text>
      <View style={styles.card}>
        <View style={styles.row}>
          <View style={styles.cell}>
            <Text style={styles.cellLabel}>BEST DAY</Text>
            <Text style={styles.cellValueAccent}>
              {relativeDayLabel(summary.daysAhead)}
            </Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.cell}>
            <Text style={styles.cellLabel}>RATING</Text>
            <View style={styles.ratingRow}>
              <Text style={styles.ratingLabel}>
                {summary.ratingLabel.toUpperCase()}
              </Text>
              <Text style={styles.ratingScore}>· {summary.ratingScore}</Text>
            </View>
          </View>
          <View style={styles.divider} />
          <View style={styles.cell}>
            <Text style={styles.cellLabel}>WEEKDAY</Text>
            <Text style={styles.weekdayPill}>
              {summary.weekdayShort.toUpperCase()}
            </Text>
          </View>
        </View>
      </View>
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
  // Three-cell variant (future-day winner).
  row: { flexDirection: 'row', alignItems: 'center' },
  cell: { flex: 1, alignItems: 'flex-start' },
  cellLabel: {
    color: Colors.textMuted,
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.8,
    marginBottom: 2,
  },
  cellValueAccent: {
    color: Colors.mdGold,
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 0.6,
  },
  ratingRow: { flexDirection: 'row', alignItems: 'baseline' },
  ratingLabel: {
    color: Colors.textPrimary,
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 0.6,
  },
  ratingScore: {
    color: Colors.textSecondary,
    fontSize: 12,
    fontWeight: '700',
    marginLeft: 6,
    fontVariant: ['tabular-nums'],
  },
  weekdayPill: {
    color: Colors.mdGold,
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  divider: {
    width: 1,
    backgroundColor: Colors.mud,
    alignSelf: 'stretch',
    marginHorizontal: 10,
  },
  // "TODAY IS BEST" headline variant.
  headlineRow: { flexDirection: 'row', alignItems: 'baseline' },
  headlineText: {
    color: Colors.mdGold,
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 0.6,
    flexShrink: 1,
  },
  headlineScore: {
    color: Colors.textSecondary,
    fontSize: 12,
    fontWeight: '700',
    marginLeft: 6,
    fontVariant: ['tabular-nums'],
  },
  headlineSub: {
    color: Colors.textMuted,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.8,
    marginTop: 4,
  },
});
