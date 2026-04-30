/**
 * RutCalendarScreen — 30-day Maryland whitetail rut intensity forecast.
 *
 * V2_3 Phase D.1 (simplified). Consumes `rutCalendarService` (pure
 * biological windows + moon modifier; no fabricated harvest stats).
 *
 * Layout:
 *   - Today card: large intensity score + phase + notes
 *   - Peak day callout: "Best day in the next two weeks: ..."
 *   - 30-day list: date, score bar, phase chip, moon glyph
 *
 * No external network calls. Lives under Hunt Resources tab.
 */
import React, { useMemo } from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Colors from '../theme/colors';
import {
  rutForecast,
  peakDay,
  RutDayScore,
} from '../services/rutCalendarService';

function phaseColor(phase: RutDayScore['phase']): string {
  switch (phase) {
    case 'peak-rut':
      return '#dc2626';
    case 'pre-rut':
      return '#f59e0b';
    case 'post-rut':
      return '#a855f7';
    case 'late-season':
      return '#3b82f6';
    case 'off-season':
    default:
      return Colors.mud;
  }
}

function phaseLabel(phase: RutDayScore['phase']): string {
  switch (phase) {
    case 'peak-rut':
      return 'PEAK';
    case 'pre-rut':
      return 'PRE';
    case 'post-rut':
      return 'POST';
    case 'late-season':
      return 'LATE';
    case 'off-season':
    default:
      return 'OFF';
  }
}

function moonGlyph(phaseName: string): string {
  switch (phaseName) {
    case 'New Moon':
      return '\u25CB';
    case 'Waxing Crescent':
      return '\u263D';
    case 'First Quarter':
      return '\u263D';
    case 'Waxing Gibbous':
      return '\u263E';
    case 'Full Moon':
      return '\u25CF';
    case 'Waning Gibbous':
      return '\u263D';
    case 'Last Quarter':
      return '\u263E';
    case 'Waning Crescent':
      return '\u263E';
    default:
      return '\u25CB';
  }
}

function formatRowDate(iso: string): string {
  const d = new Date(iso + 'T12:00:00');
  return d.toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
}

interface RowProps {
  score: RutDayScore;
}

function ForecastRow({ score }: RowProps) {
  return (
    <View style={styles.row}>
      <View style={styles.rowDate}>
        <Text style={styles.rowDateText}>{formatRowDate(score.date)}</Text>
        <Text style={styles.rowMoon}>
          {moonGlyph(score.moonPhase)} {score.moonIlluminationPct}%
        </Text>
      </View>
      <View style={styles.rowBar}>
        <View
          style={[
            styles.rowBarFill,
            {
              width: `${score.intensity}%`,
              backgroundColor: phaseColor(score.phase),
            },
          ]}
        />
        <Text style={styles.rowScore}>{score.intensity}</Text>
      </View>
      <View
        style={[
          styles.rowChip,
          { borderColor: phaseColor(score.phase) },
        ]}
      >
        <Text style={[styles.rowChipText, { color: phaseColor(score.phase) }]}>
          {phaseLabel(score.phase)}
        </Text>
      </View>
    </View>
  );
}

export default function RutCalendarScreen() {
  const forecast = useMemo(() => rutForecast(new Date(), 30), []);
  const today = forecast[0];
  const next14 = useMemo(() => forecast.slice(0, 14), [forecast]);
  const peak = useMemo(() => peakDay(next14), [next14]);

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
    >
      <View
        style={[
          styles.todayCard,
          { borderColor: phaseColor(today.phase) },
        ]}
      >
        <Text style={styles.todayLabel}>TODAY</Text>
        <Text style={styles.todayScore}>{today.intensity}</Text>
        <Text style={styles.todaySubscore}>/100 rut intensity</Text>
        <View
          style={[
            styles.todayChip,
            { backgroundColor: phaseColor(today.phase) },
          ]}
        >
          <Text style={styles.todayChipText}>
            {phaseLabel(today.phase)} RUT
          </Text>
        </View>
        <Text style={styles.todayNotes}>{today.notes}</Text>
        <Text style={styles.todayMoon}>
          {moonGlyph(today.moonPhase)} {today.moonPhase} —{' '}
          {today.moonIlluminationPct}% illumination
        </Text>
      </View>

      {peak && peak.date !== today.date ? (
        <View style={styles.peakCard}>
          <Text style={styles.peakLabel}>BEST DAY IN NEXT 2 WEEKS</Text>
          <Text style={styles.peakDate}>{formatRowDate(peak.date)}</Text>
          <Text style={styles.peakNotes}>
            Score {peak.intensity}/100 — {peak.notes}
          </Text>
        </View>
      ) : null}

      <Text style={styles.sectionHeader}>30-DAY FORECAST</Text>
      {forecast.map((s) => (
        <ForecastRow key={s.date} score={s} />
      ))}

      <View style={styles.disclaimer}>
        <Text style={styles.disclaimerText}>
          Statewide biological forecast — when bucks are most likely to
          move on average. Not a county-level harvest predictor. Always
          verify season dates and weapons rules in MD DNR Hunting Guide.
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
  todayCard: {
    backgroundColor: Colors.surface,
    borderWidth: 2,
    borderRadius: 14,
    padding: 18,
    alignItems: 'center',
    marginBottom: 14,
  },
  todayLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: Colors.textSecondary,
    letterSpacing: 1.5,
  },
  todayScore: {
    fontSize: 64,
    fontWeight: '800',
    color: Colors.textPrimary,
    marginTop: 4,
  },
  todaySubscore: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginBottom: 12,
  },
  todayChip: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 14,
    marginBottom: 12,
  },
  todayChipText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#fff',
    letterSpacing: 1,
  },
  todayNotes: {
    fontSize: 13,
    color: Colors.textPrimary,
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 10,
  },
  todayMoon: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
  peakCard: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.moss,
    padding: 14,
    marginBottom: 14,
  },
  peakLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: Colors.lichen,
    letterSpacing: 1.2,
  },
  peakDate: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginTop: 4,
    marginBottom: 4,
  },
  peakNotes: {
    fontSize: 12,
    color: Colors.textSecondary,
    lineHeight: 16,
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
  rowDate: {
    width: 88,
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
