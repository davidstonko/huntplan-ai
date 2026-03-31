/**
 * @file SolunarWidget.tsx
 * @description Compact solunar/best-times widget for map and scout screens.
 * Shows current deer activity rating, moon phase, and best hunting windows.
 * Taps to expand with full solunar detail.
 *
 * @module Components/Map
 * @version 3.0.0
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
} from 'react-native';
import Colors from '../../theme/colors';
import { getSolunarData, SolunarData } from '../../services/solunarService';

interface SolunarWidgetProps {
  latitude: number;
  longitude: number;
  date?: string;
}

const MOON_ICONS: Record<string, string> = {
  'New Moon': '🌑',
  'Waxing Crescent': '🌒',
  'First Quarter': '🌓',
  'Waxing Gibbous': '🌔',
  'Full Moon': '🌕',
  'Waning Gibbous': '🌖',
  'Last Quarter': '🌗',
  'Waning Crescent': '🌘',
};

const RATING_COLORS: Record<string, string> = {
  Excellent: Colors.success,
  Good: '#8BC34A',
  Fair: Colors.amber,
  Poor: Colors.rust,
};

export default function SolunarWidget({ latitude, longitude, date }: SolunarWidgetProps) {
  const [data, setData] = useState<SolunarData | null>(null);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    if (latitude && longitude) {
      getSolunarData(latitude, longitude, date).then(setData);
    }
  }, [latitude, longitude, date]);

  if (!data) return null;

  const ratingColor = RATING_COLORS[data.rating.label] || Colors.textMuted;
  const moonIcon = MOON_ICONS[data.moon.phase_name] || '🌙';

  return (
    <View style={styles.container}>
      {/* Collapsed Badge */}
      <TouchableOpacity
        style={styles.badge}
        onPress={() => setExpanded(!expanded)}
        activeOpacity={0.8}
      >
        <Text style={styles.moonIcon}>{moonIcon}</Text>
        <View>
          <Text style={[styles.ratingText, { color: ratingColor }]}>
            {data.rating.label}
          </Text>
          <Text style={styles.ratingScore}>{data.rating.score}/100</Text>
        </View>
      </TouchableOpacity>

      {/* Expanded Detail */}
      {expanded && (
        <View style={styles.expandedPanel}>
          {/* Moon Info */}
          <View style={styles.moonRow}>
            <Text style={styles.moonPhase}>{moonIcon} {data.moon.phase_name}</Text>
            <Text style={styles.moonIllum}>{data.moon.illumination_pct}% illuminated</Text>
          </View>

          {/* Sun Times */}
          <View style={styles.sunRow}>
            <View style={styles.sunItem}>
              <Text style={styles.sunLabel}>Sunrise</Text>
              <Text style={styles.sunTime}>{data.sun.sunrise}</Text>
            </View>
            <View style={styles.sunItem}>
              <Text style={styles.sunLabel}>Sunset</Text>
              <Text style={styles.sunTime}>{data.sun.sunset}</Text>
            </View>
            <View style={styles.sunItem}>
              <Text style={styles.sunLabel}>Legal Start</Text>
              <Text style={[styles.sunTime, { color: Colors.success }]}>{data.sun.legal_start}</Text>
            </View>
            <View style={styles.sunItem}>
              <Text style={styles.sunLabel}>Legal End</Text>
              <Text style={[styles.sunTime, { color: Colors.rust }]}>{data.sun.legal_end}</Text>
            </View>
          </View>

          {/* Best Times */}
          <Text style={styles.sectionLabel}>Best Hunting Windows</Text>
          {data.best_times
            .filter((t) => t.priority !== 'low')
            .map((t, i) => (
              <View key={i} style={styles.timeRow}>
                <View style={[
                  styles.priorityDot,
                  { backgroundColor: t.priority === 'high' ? Colors.success : Colors.amber },
                ]} />
                <View style={styles.timeInfo}>
                  <Text style={styles.timeLabel}>{t.window}</Text>
                  <Text style={styles.timeRange}>{t.start} — {t.end}</Text>
                  <Text style={styles.timeReason}>{t.reason}</Text>
                </View>
              </View>
            ))}

          {/* Solunar Periods */}
          <Text style={styles.sectionLabel}>Solunar Periods</Text>
          {data.major_periods.map((p, i) => (
            <View key={`major-${i}`} style={styles.periodRow}>
              <Text style={styles.periodLabel}>{p.label}</Text>
              <Text style={styles.periodTime}>{p.start} — {p.end}</Text>
            </View>
          ))}
          {data.minor_periods.map((p, i) => (
            <View key={`minor-${i}`} style={styles.periodRow}>
              <Text style={styles.periodLabel}>{p.label}</Text>
              <Text style={styles.periodTime}>~{p.center}</Text>
            </View>
          ))}

          {/* Rating Factors */}
          <View style={styles.factorsRow}>
            {data.rating.factors.solunar_dawn_overlap && (
              <Text style={styles.factorBadge}>Solunar + Dawn</Text>
            )}
            {data.rating.factors.solunar_dusk_overlap && (
              <Text style={styles.factorBadge}>Solunar + Dusk</Text>
            )}
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 60,
    left: 10,
    zIndex: 100,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.overlay,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 20,
    gap: 6,
  },
  moonIcon: { fontSize: 18 },
  ratingText: { fontSize: 12, fontWeight: '700' },
  ratingScore: { fontSize: 10, color: Colors.textMuted },
  expandedPanel: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 14,
    marginTop: 6,
    width: 280,
    borderWidth: 1,
    borderColor: Colors.mud,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  moonRow: { marginBottom: 12 },
  moonPhase: { fontSize: 15, fontWeight: '700', color: Colors.textPrimary },
  moonIllum: { fontSize: 12, color: Colors.textSecondary },
  sunRow: {
    flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 14,
    paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: Colors.mud,
  },
  sunItem: {},
  sunLabel: { fontSize: 10, color: Colors.textMuted, textTransform: 'uppercase' },
  sunTime: { fontSize: 14, fontWeight: '700', color: Colors.textPrimary },
  sectionLabel: {
    fontSize: 11, fontWeight: '700', color: Colors.textMuted,
    textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6, marginTop: 8,
  },
  timeRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 8, gap: 8 },
  priorityDot: { width: 8, height: 8, borderRadius: 4, marginTop: 4 },
  timeInfo: { flex: 1 },
  timeLabel: { fontSize: 13, fontWeight: '600', color: Colors.textPrimary },
  timeRange: { fontSize: 12, color: Colors.tan },
  timeReason: { fontSize: 11, color: Colors.textMuted },
  periodRow: {
    flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 3,
  },
  periodLabel: { fontSize: 12, color: Colors.textSecondary },
  periodTime: { fontSize: 12, fontWeight: '600', color: Colors.textPrimary },
  factorsRow: { flexDirection: 'row', gap: 6, marginTop: 8 },
  factorBadge: {
    fontSize: 10, color: Colors.success, backgroundColor: Colors.success + '20',
    paddingHorizontal: 8, paddingVertical: 3, borderRadius: 4, fontWeight: '600',
  },
});
