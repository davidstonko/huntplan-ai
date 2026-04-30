/**
 * @file BriefingTomorrowCard.tsx
 * @description Daily Briefing "Tomorrow Preview" card — Phase A.35.
 *
 * Compact card that surfaces tomorrow's solunar activity rating +
 * sunrise time + a comparison verdict against today (BETTER / SAME /
 * WORSE). Sync — reuses `getLocalSolunarData` for both today and
 * tomorrow, no network. Sits at the bottom of the briefing as the
 * forward-looking footer so the dashboard rewards evening opens, not
 * just morning ones.
 *
 * @module Components
 * @version 2.3.0
 *
 * Composition:
 *  - Section title row.
 *  - One row, three cells:
 *      RATING — label + 0–100 score (mdGold).
 *      SUNRISE — formatted "h:MM AM" time.
 *      VS TODAY — BETTER / SAME / WORSE pill (color-emphasized).
 */

import React, { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Colors from '../theme/colors';
import { getLocalSolunarData } from '../services/solunarService';
import {
  tomorrowYmd,
  summarizeTomorrow,
} from '../services/briefingTomorrowService';
import { formatTime12 } from './SunMoonCard';

interface BriefingTomorrowCardProps {
  /** YYYY-MM-DD for today (briefing aggregator emits this). */
  todayYmd: string;
  /** Decimal latitude. */
  latitude: number;
  /** Decimal longitude (negative in Maryland). */
  longitude: number;
}

export default function BriefingTomorrowCard({
  todayYmd,
  latitude,
  longitude,
}: BriefingTomorrowCardProps): JSX.Element {
  const summary = useMemo(() => {
    const todayData = getLocalSolunarData(latitude, longitude, todayYmd);
    const tomorrow = tomorrowYmd(todayYmd);
    const tomorrowData = getLocalSolunarData(latitude, longitude, tomorrow);
    return summarizeTomorrow(tomorrowData, todayData.rating.score);
  }, [latitude, longitude, todayYmd]);

  // Map the delta verdict to a real theme color. Service stays free
  // of theme imports — same convention as A.34's accent bucket.
  const deltaColor =
    summary.delta === 'better'
      ? Colors.mdGold
      : summary.delta === 'worse'
        ? Colors.amber
        : Colors.textSecondary;
  const deltaLabel =
    summary.delta === 'better'
      ? 'BETTER'
      : summary.delta === 'worse'
        ? 'WORSE'
        : 'SAME';

  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>TOMORROW</Text>
      <View style={styles.card}>
        <View style={styles.row}>
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
            <Text style={styles.cellLabel}>SUNRISE</Text>
            <Text style={styles.cellValue}>{formatTime12(summary.sunrise)}</Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.cell}>
            <Text style={styles.cellLabel}>VS TODAY</Text>
            <Text style={[styles.deltaPill, { color: deltaColor }]}>
              {deltaLabel}
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
    fontSize: 14,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
  },
  ratingRow: { flexDirection: 'row', alignItems: 'baseline' },
  ratingLabel: {
    color: Colors.mdGold,
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
  deltaPill: {
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
});
