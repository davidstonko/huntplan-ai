/**
 * @file BriefingTideCard.tsx
 * @description Daily Briefing tide one-liner — Phase A.33.
 *
 * Compact card that surfaces the next high/low tide for the briefing's
 * lat/lng. Fetches once via weatherService.getMarineConditions; hides
 * itself entirely when the response indicates inland or unknown
 * (so Western MD users don't see a noise card).
 *
 * @module Components
 * @version 2.3.0
 *
 * Composition:
 *  - Section title row.
 *  - One row: current stage (left), next tide type + time (middle),
 *    relative time-until (right). Each cell renders nothing if its
 *    data is missing.
 *  - Loading state while fetch is in flight.
 *  - Hidden entirely when `hasUsefulTideData` returns false — no
 *    "tide unavailable" placeholder; the card simply isn't there.
 */

import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Colors from '../theme/colors';
import weatherService, { type MarineConditions } from '../services/weatherService';
import {
  hasUsefulTideData,
  summarizeTide,
  type BriefingTideSummary,
} from '../services/briefingTideService';

interface BriefingTideCardProps {
  latitude: number;
  longitude: number;
}

export default function BriefingTideCard({
  latitude,
  longitude,
}: BriefingTideCardProps) {
  const [status, setStatus] = useState<'loading' | 'ready' | 'error' | 'hidden'>(
    'loading',
  );
  const [summary, setSummary] = useState<BriefingTideSummary | null>(null);

  useEffect(() => {
    let cancelled = false;
    setStatus('loading');
    setSummary(null);
    weatherService
      .getMarineConditions(latitude, longitude)
      .then((m: MarineConditions) => {
        if (cancelled) return;
        if (!hasUsefulTideData(m)) {
          setStatus('hidden');
          return;
        }
        setSummary(summarizeTide(m));
        setStatus('ready');
      })
      .catch(() => {
        if (cancelled) return;
        setStatus('error');
      });
    return () => {
      cancelled = true;
    };
  }, [latitude, longitude]);

  // Hide entirely for inland points / silent network errors. The
  // briefing already has weather + sun & moon — a "tide unavailable"
  // line would be noise, not signal.
  if (status === 'hidden' || status === 'error') return null;

  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>TIDE</Text>
      <View style={styles.card}>
        {status === 'loading' ? (
          <Text style={styles.placeholder}>Loading tide…</Text>
        ) : null}
        {status === 'ready' && summary ? (
          <View style={styles.row}>
            <View style={styles.cell}>
              {summary.stageLabel ? (
                <>
                  <Text style={styles.cellLabel}>STAGE</Text>
                  <Text style={styles.cellValue}>{summary.stageLabel}</Text>
                </>
              ) : (
                <Text style={styles.placeholder}>—</Text>
              )}
            </View>
            <View style={styles.divider} />
            <View style={styles.cell}>
              {summary.nextTideTypeLabel && summary.nextTideTimeLabel ? (
                <>
                  <Text style={styles.cellLabel}>
                    NEXT {summary.nextTideTypeLabel}
                  </Text>
                  <Text style={styles.cellValue}>
                    {summary.nextTideTimeLabel}
                  </Text>
                </>
              ) : (
                <Text style={styles.placeholder}>—</Text>
              )}
            </View>
            <View style={styles.divider} />
            <View style={styles.cell}>
              {summary.nextTideRelativeLabel ? (
                <>
                  <Text style={styles.cellLabel}>IN</Text>
                  <Text style={styles.cellValue}>
                    {summary.nextTideRelativeLabel}
                  </Text>
                </>
              ) : (
                <Text style={styles.placeholder}>—</Text>
              )}
            </View>
          </View>
        ) : null}
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
  divider: {
    width: 1,
    backgroundColor: Colors.mud,
    alignSelf: 'stretch',
    marginHorizontal: 10,
  },
  placeholder: {
    color: Colors.textMuted,
    fontSize: 12,
    fontStyle: 'italic',
  },
});
