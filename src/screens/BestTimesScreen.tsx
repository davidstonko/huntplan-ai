/**
 * BestTimesScreen — 7-day solunar "best days" forecast.
 *
 * V2_3 Phase D.1b — companion to the Rut Calendar but for daily activity
 * windows (dawn/dusk + moon overhead/underfoot). Useful for hunters
 * picking a Saturday to take off and for anglers picking a tide-aligned
 * morning to fish.
 *
 * Loads instantly off the synchronous offline model so the user always
 * sees something. If the backend is reachable and returns more accurate
 * numbers, those replace the local forecast in-place.
 *
 * No location permission required — defaults to a Maryland centroid.
 * Today's per-day detail still requires lat/lng for accurate sunrise.
 */
import React, { useEffect, useMemo, useState } from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  View,
  ActivityIndicator,
} from 'react-native';
import Colors from '../theme/colors';
import {
  getLocalWeeklySolunar,
  getWeeklySolunar,
  bestSolunarDay,
  WeeklySolunarDay,
} from '../services/solunarService';

const MD_LAT = 39.0458; // Maryland centroid (approx)
const MD_LNG = -76.6413;

function ratingColor(label: WeeklySolunarDay['rating']['label']): string {
  switch (label) {
    case 'Excellent':
      return '#16a34a';
    case 'Good':
      return '#3b82f6';
    case 'Fair':
      return '#f59e0b';
    case 'Poor':
    default:
      return Colors.mud;
  }
}

function formatRowDate(iso: string, dayOfWeek: string): string {
  const d = new Date(iso + 'T12:00:00');
  const monthDay = d.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
  });
  return `${dayOfWeek} · ${monthDay}`;
}

function ForecastRow({
  day,
  isPeak,
}: {
  day: WeeklySolunarDay;
  isPeak: boolean;
}) {
  const color = ratingColor(day.rating.label);
  return (
    <View style={[styles.row, isPeak && styles.rowPeak]}>
      <View style={styles.rowDate}>
        <Text style={styles.rowDateText}>
          {formatRowDate(day.date, day.day_of_week)}
        </Text>
        <Text style={styles.rowMoon}>
          {day.moon_phase} · {day.illumination}%
        </Text>
      </View>
      <View style={styles.rowBar}>
        <View
          style={[
            styles.rowBarFill,
            { width: `${Math.min(100, Math.max(0, day.rating.score))}%`, backgroundColor: color },
          ]}
        />
        <Text style={styles.rowScore}>{day.rating.score}</Text>
      </View>
      <View style={[styles.rowChip, { borderColor: color }]}>
        <Text style={[styles.rowChipText, { color }]}>
          {day.rating.label.toUpperCase().slice(0, 4)}
        </Text>
      </View>
    </View>
  );
}

export default function BestTimesScreen() {
  // Always start with the offline forecast so the screen is never blank.
  const initialWeek = useMemo(
    () => getLocalWeeklySolunar(MD_LAT, MD_LNG, new Date(), 7),
    [],
  );
  const [week, setWeek] = useState<WeeklySolunarDay[]>(initialWeek);
  const [source, setSource] = useState<'local' | 'backend'>('local');
  const [refreshing, setRefreshing] = useState(false);

  // Best-effort upgrade to backend numbers (which use a richer model).
  useEffect(() => {
    let cancelled = false;
    setRefreshing(true);
    (async () => {
      const remote = await getWeeklySolunar(MD_LAT, MD_LNG, undefined, 7);
      if (cancelled) return;
      if (remote && remote.length > 0) {
        setWeek(remote);
        setSource('backend');
      }
      setRefreshing(false);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const peak = useMemo(() => bestSolunarDay(week), [week]);

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
    >
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Best Times — 7 Day</Text>
        <Text style={styles.headerSub}>
          Solunar activity rating per day for the Maryland region.
          Major / minor moon transits + dawn-dusk overlap.
        </Text>
      </View>

      {peak ? (
        <View style={[styles.peakCard, { borderColor: ratingColor(peak.rating.label) }]}>
          <Text style={styles.peakLabel}>BEST DAY THIS WEEK</Text>
          <Text style={styles.peakDate}>
            {formatRowDate(peak.date, peak.day_of_week)}
          </Text>
          <Text style={styles.peakScore}>
            {peak.rating.score} / 100 — {peak.rating.label}
          </Text>
          <Text style={styles.peakNotes}>
            Moon: {peak.moon_phase} ({peak.illumination}% illum.)
          </Text>
        </View>
      ) : null}

      {refreshing ? (
        <View style={styles.loadingRow}>
          <ActivityIndicator size="small" color={Colors.moss} />
          <Text style={styles.loadingText}>Checking server for refined forecast…</Text>
        </View>
      ) : null}

      <Text style={styles.sectionHeader}>7-DAY FORECAST</Text>
      {week.map((d) => (
        <ForecastRow key={d.date} day={d} isPeak={!!peak && d.date === peak.date} />
      ))}

      <View style={styles.disclaimer}>
        <Text style={styles.disclaimerText}>
          Source: {source === 'backend' ? 'Server solunar model' : 'On-device offline model'}.
          Local model is approximate — moon-phase + simplified sunrise/sunset.
          Use as guidance, not as a guarantee.
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  content: {
    padding: 16,
  },
  header: {
    marginBottom: 14,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginBottom: 4,
  },
  headerSub: {
    fontSize: 13,
    color: Colors.textSecondary,
    lineHeight: 18,
  },
  peakCard: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    borderWidth: 2,
    padding: 16,
    marginBottom: 14,
    alignItems: 'center',
  },
  peakLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: Colors.textSecondary,
    letterSpacing: 1.5,
    marginBottom: 4,
  },
  peakDate: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginBottom: 4,
  },
  peakScore: {
    fontSize: 22,
    fontWeight: '800',
    color: Colors.textPrimary,
    marginBottom: 4,
  },
  peakNotes: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 8,
  },
  loadingText: {
    fontSize: 11,
    color: Colors.textSecondary,
  },
  sectionHeader: {
    fontSize: 11,
    fontWeight: '800',
    color: Colors.textSecondary,
    letterSpacing: 1.2,
    marginBottom: 8,
    marginLeft: 4,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
    marginBottom: 6,
    borderWidth: 1,
    borderColor: Colors.mud,
  },
  rowPeak: {
    borderColor: Colors.moss,
  },
  rowDate: {
    width: 110,
  },
  rowDateText: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  rowMoon: {
    fontSize: 10,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  rowBar: {
    flex: 1,
    height: 22,
    backgroundColor: Colors.background,
    borderRadius: 11,
    marginHorizontal: 8,
    overflow: 'hidden',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
  },
  rowBarFill: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    opacity: 0.55,
  },
  rowScore: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.textPrimary,
    zIndex: 2,
  },
  rowChip: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    minWidth: 50,
    alignItems: 'center',
  },
  rowChipText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  disclaimer: {
    backgroundColor: Colors.surface,
    borderRadius: 10,
    padding: 12,
    marginTop: 14,
    borderWidth: 1,
    borderColor: Colors.mud,
  },
  disclaimerText: {
    fontSize: 11,
    color: Colors.textSecondary,
    lineHeight: 15,
    textAlign: 'center',
  },
});
