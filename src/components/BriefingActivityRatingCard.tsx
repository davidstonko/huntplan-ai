/**
 * @file BriefingActivityRatingCard.tsx
 * @description Daily Briefing "Today's Activity" one-liner — Phase A.34.
 *
 * Compact card that surfaces today's solunar activity rating
 * (Excellent / Good / Fair / Poor) with its 0–100 score plus the
 * first useful best-time window. Sync — reuses the same local
 * solunar model that powers SunMoonCard (A.29), so no fetch and no
 * loading state.
 *
 * @module Components
 * @version 2.3.0
 *
 * Composition:
 *  - Section title row.
 *  - One row, two cells:
 *      RATING — accent-color label + score (e.g. "GOOD · 72").
 *      BEST WINDOW — window label + formatted time range (e.g.
 *        "DAWN FEED · 5:30 AM – 7:30 AM"). Falls back to em-dash
 *        when the local model has no best window for the lat/lng.
 */

import React, { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Colors from '../theme/colors';
import { getLocalSolunarData } from '../services/solunarService';
import { summarizeActivityRating } from '../services/briefingActivityRatingService';

interface BriefingActivityRatingCardProps {
  /** YYYY-MM-DD; same string the briefing aggregator already computes. */
  ymd: string;
  /** Decimal latitude. */
  latitude: number;
  /** Decimal longitude (negative in Maryland). */
  longitude: number;
}

export default function BriefingActivityRatingCard({
  ymd,
  latitude,
  longitude,
}: BriefingActivityRatingCardProps): JSX.Element {
  const summary = useMemo(
    () => summarizeActivityRating(getLocalSolunarData(latitude, longitude, ymd)),
    [latitude, longitude, ymd],
  );

  // Map the summary's rating-accent bucket to a real color from theme.
  // Done in the component (not the service) so the service stays free
  // of theme imports and remains pure.
  const accentColor =
    summary.ratingAccent === 'strong'
      ? Colors.mdGold
      : summary.ratingAccent === 'medium'
        ? Colors.amber
        : Colors.textMuted;

  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>TODAY'S ACTIVITY</Text>
      <View style={styles.card}>
        <View style={styles.row}>
          <View style={styles.cell}>
            <Text style={styles.cellLabel}>RATING</Text>
            <View style={styles.ratingRow}>
              <Text style={[styles.ratingLabel, { color: accentColor }]}>
                {summary.ratingLabel.toUpperCase()}
              </Text>
              <Text style={styles.ratingScore}>· {summary.ratingScore}</Text>
            </View>
          </View>
          <View style={styles.divider} />
          <View style={styles.cell}>
            <Text style={styles.cellLabel}>
              {summary.bestWindowLabel
                ? summary.bestWindowLabel.toUpperCase()
                : 'BEST WINDOW'}
            </Text>
            <Text style={styles.cellValue}>
              {summary.bestWindowTimeRange ?? '—'}
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
  divider: {
    width: 1,
    backgroundColor: Colors.mud,
    alignSelf: 'stretch',
    marginHorizontal: 10,
  },
});
