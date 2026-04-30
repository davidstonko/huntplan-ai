/**
 * @file BriefingWeatherCard.tsx
 * @description Daily Briefing weather one-liner — Phase A.32.
 *
 * Compact card that surfaces today's high/low, daytime wind, and short
 * conditions for the briefing's lat/lng (which Phase A.31 already
 * derives from the user's most-recent recorded track or MD centroid).
 *
 * @module Components
 * @version 2.3.0
 *
 * Composition:
 *  - Section title row.
 *  - One row: temperature high/low (left), wind (middle), conditions
 *    (right). Each cell renders nothing if its data is missing — the
 *    card is forgiving of partial weather.gov responses.
 *  - Loading state (small "..." pill) while the fetch is in flight.
 *  - Error/empty state (small "Weather unavailable" line) on fail.
 *
 * Why a separate fetch instead of the dailyBriefingService aggregator?
 *  - Network isolation: a slow weather call shouldn't block the rest
 *    of the briefing from rendering. The aggregator is sync; this card
 *    awaits its own data and shows a placeholder while loading.
 *  - Pull-to-refresh and "tap to refetch" affordances can be added at
 *    the card level without rewiring the briefing's main aggregator.
 *
 * Pure helpers (parseWindMph, summarizeForecast, formatHighLow,
 * formatWind) live in `briefingWeatherService` and are unit-tested
 * separately. This file is the React shell + visual layout.
 */

import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Colors from '../theme/colors';
import weatherService, { type WeatherForecast } from '../services/weatherService';
import {
  formatHighLow,
  formatWind,
  summarizeForecast,
  type BriefingWeatherSummary,
} from '../services/briefingWeatherService';

interface BriefingWeatherCardProps {
  /** Latitude in decimal degrees. */
  latitude: number;
  /** Longitude in decimal degrees. */
  longitude: number;
}

/**
 * Network-aware card. Owns one useState for the in-flight forecast and
 * derives the view-model via the pure summarizer. Re-fetches when
 * lat/lng change so a future "user moved" event recomputes correctly.
 */
export default function BriefingWeatherCard({
  latitude,
  longitude,
}: BriefingWeatherCardProps) {
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>(
    'loading',
  );
  const [summary, setSummary] = useState<BriefingWeatherSummary | null>(null);

  useEffect(() => {
    let cancelled = false;
    setStatus('loading');
    setSummary(null);
    weatherService
      .getForecast(latitude, longitude)
      .then((forecasts: WeatherForecast[]) => {
        if (cancelled) return;
        if (!forecasts || forecasts.length === 0) {
          setStatus('error');
          return;
        }
        setSummary(summarizeForecast(forecasts));
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

  const highLow = summary
    ? formatHighLow(summary.highF, summary.lowF)
    : null;
  const wind = summary ? formatWind(summary.windMph, summary.windDir) : null;
  const conditions = summary?.conditions ?? null;

  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>WEATHER TODAY</Text>
      <View style={styles.card}>
        {status === 'loading' ? (
          <Text style={styles.placeholder}>Loading forecast…</Text>
        ) : null}
        {status === 'error' ? (
          <Text style={styles.placeholder}>
            Weather unavailable — try again later.
          </Text>
        ) : null}
        {status === 'ready' && summary ? (
          <View style={styles.row}>
            <View style={styles.cell}>
              {highLow ? (
                <>
                  <Text style={styles.cellLabel}>HI / LO</Text>
                  <Text style={styles.cellValue}>{highLow}</Text>
                </>
              ) : (
                <Text style={styles.placeholder}>—</Text>
              )}
            </View>
            <View style={styles.divider} />
            <View style={styles.cell}>
              {wind ? (
                <>
                  <Text style={styles.cellLabel}>WIND</Text>
                  <Text style={styles.cellValue}>{wind}</Text>
                </>
              ) : (
                <Text style={styles.placeholder}>—</Text>
              )}
            </View>
            <View style={styles.divider} />
            <View style={[styles.cell, styles.cellWide]}>
              {conditions ? (
                <>
                  <Text style={styles.cellLabel}>SKY</Text>
                  <Text
                    style={styles.cellValue}
                    numberOfLines={1}
                    ellipsizeMode="tail"
                  >
                    {conditions}
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
  cellWide: { flex: 1.4 },
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
