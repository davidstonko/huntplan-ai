/**
 * TrackInsightsScreen — depth view for a saved RecordedTrack.
 *
 * Reachable from TrackDetailScreen via an "INSIGHTS" button. Renders:
 *   1. Hero — distance / moving pace / elevation range
 *   2. Mile splits table
 *   3. Elevation profile sparkline (SVG-style polyline rendered as
 *      a plain View grid, since we want zero non-RN deps here)
 *   4. Pause segments list (gap vs stationary, with time-of-day)
 *   5. Time-of-day bucket
 *
 * Pure presentation; all numbers come from `buildTrackInsights`.
 *
 * V2_3_FEATURE_EXPANSION_PLAN — Phase A.18.
 */

import React, { useMemo } from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  View,
  SafeAreaView,
  TouchableOpacity,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import Colors from '../theme/colors';
import { useTrackRecorder } from '../context/TrackRecorderContext';
import { formatDistance, formatDuration } from '../types/track';
import {
  buildTrackInsights,
  formatPace,
  formatElapsed,
  type ElevationPoint,
  type PauseSegment,
} from '../services/trackInsightsService';

type TrackInsightsRoute = RouteProp<
  { TrackInsights: { trackId: string } },
  'TrackInsights'
>;

const HOUR_LABELS: Record<string, string> = {
  'early-morning': 'Early morning',
  morning: 'Morning',
  midday: 'Midday',
  afternoon: 'Afternoon',
  evening: 'Evening',
  night: 'Night',
};

export default function TrackInsightsScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<TrackInsightsRoute>();
  const { getTrack } = useTrackRecorder();
  const track = getTrack(route.params.trackId);

  const insights = useMemo(
    () => (track ? buildTrackInsights(track, { unit: 'mi' }) : null),
    [track],
  );

  if (!track) {
    return (
      <SafeAreaView style={styles.screen}>
        <View style={styles.empty}>
          <Text style={styles.emptyTitle}>Track not found</Text>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Text style={styles.backBtnText}>BACK</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  if (!insights) return null;

  return (
    <SafeAreaView style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content}>
        {/* ── Header ────────────────────────── */}
        <Text style={styles.title}>{track.name}</Text>
        <Text style={styles.subtitle}>
          {new Date(track.startedAt).toLocaleDateString()} ·{' '}
          {track.mode.toUpperCase()}
        </Text>

        {/* ── Hero stats ────────────────────── */}
        <View style={styles.heroRow}>
          <Stat
            label="DISTANCE"
            value={formatDistance(track.distanceM)}
          />
          <Stat
            label={`MOVING PACE / ${insights.unit.toUpperCase()}`}
            value={formatPace(insights.movingPaceSecPerUnit)}
          />
        </View>
        <View style={styles.heroRow}>
          <Stat label="DURATION" value={formatDuration(track.durationSec)} />
          <Stat
            label="ELEV. RANGE"
            value={
              insights.elevationRangeM > 0
                ? `${insights.elevationRangeM.toFixed(0)} m`
                : '—'
            }
          />
        </View>
        <View style={styles.heroRow}>
          <Stat
            label="ASCENT"
            value={
              track.elevationGainM > 0
                ? `${track.elevationGainM.toFixed(0)} m`
                : '—'
            }
          />
          <Stat
            label="DESCENT"
            value={
              insights.elevationLossM > 0
                ? `${insights.elevationLossM.toFixed(0)} m`
                : '—'
            }
          />
        </View>

        {/* ── Splits ────────────────────────── */}
        {insights.splits.length > 0 ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>
              SPLITS (per {insights.unit})
            </Text>
            <View style={styles.splitsHeader}>
              <Text style={[styles.splitsCol, styles.splitsCol1]}>#</Text>
              <Text style={[styles.splitsCol, styles.splitsColMid]}>
                DIST
              </Text>
              <Text style={[styles.splitsCol, styles.splitsColMid]}>TIME</Text>
              <Text style={[styles.splitsCol, styles.splitsColEnd]}>PACE</Text>
            </View>
            {insights.splits.map((s) => (
              <View key={s.index} style={styles.splitsRow}>
                <Text style={[styles.splitsCol, styles.splitsCol1]}>
                  {s.index}
                </Text>
                <Text style={[styles.splitsCol, styles.splitsColMid]}>
                  {s.distance === 1 ? '1.00' : s.distance.toFixed(2)}
                </Text>
                <Text style={[styles.splitsCol, styles.splitsColMid]}>
                  {formatElapsed(s.durationSec)}
                </Text>
                <Text style={[styles.splitsCol, styles.splitsColEnd]}>
                  {formatPace(s.paceSecPerUnit)}
                </Text>
              </View>
            ))}
          </View>
        ) : (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>SPLITS</Text>
            <Text style={styles.empty2}>
              Track was too short to compute splits.
            </Text>
          </View>
        )}

        {/* ── Elevation sparkline ───────────── */}
        {insights.elevation && insights.elevation.length > 1 ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>ELEVATION PROFILE</Text>
            <ElevationSparkline points={insights.elevation} />
          </View>
        ) : null}

        {/* ── Pauses ────────────────────────── */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>PAUSES & REST STOPS</Text>
          {insights.pauses.length === 0 ? (
            <Text style={styles.empty2}>No pauses detected.</Text>
          ) : (
            insights.pauses.map((p, i) => <PauseRow key={i} p={p} />)
          )}
        </View>

        {/* ── Time of day ───────────────────── */}
        {insights.timeOfDay ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>WHEN</Text>
            <View style={styles.todRow}>
              <Text style={styles.todBucket}>
                {HOUR_LABELS[insights.timeOfDay.medianBucket] ??
                  insights.timeOfDay.medianBucket}
              </Text>
              <Text style={styles.todHours}>
                {String(insights.timeOfDay.startHour).padStart(2, '0')}:00 →{' '}
                {String(insights.timeOfDay.endHour).padStart(2, '0')}:00
              </Text>
            </View>
          </View>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.statCell}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function PauseRow({ p }: { p: PauseSegment }) {
  return (
    <View style={styles.pauseRow}>
      <View style={styles.pauseChip}>
        <Text style={styles.pauseChipText}>
          {p.reason === 'gap' ? 'GAP' : 'STAT'}
        </Text>
      </View>
      <View style={styles.pauseBody}>
        <Text style={styles.pauseTitle}>
          {formatElapsed(p.durationSec)}{' '}
          {p.reason === 'gap' ? 'recorder paused' : 'stationary'}
        </Text>
        <Text style={styles.pauseSub}>
          {new Date(p.startedAt).toLocaleTimeString()}
        </Text>
      </View>
    </View>
  );
}

/**
 * Tiny no-deps elevation sparkline. Renders the profile as a row of
 * narrow vertical bars whose heights are normalized to the local
 * altitude range. Not a perfect line chart, but good enough for an
 * at-a-glance "did I climb a lot?" answer.
 */
function ElevationSparkline({ points }: { points: ElevationPoint[] }) {
  const alts = points.map((p) => p.altM);
  const min = Math.min(...alts);
  const max = Math.max(...alts);
  const range = max - min || 1;
  return (
    <View style={styles.sparklineWrap}>
      <View style={styles.sparklineRow}>
        {points.map((p, i) => {
          const h = ((p.altM - min) / range) * 60;
          return (
            <View
              key={i}
              style={[
                styles.sparkBar,
                { height: Math.max(3, h) },
              ]}
            />
          );
        })}
      </View>
      <View style={styles.sparkAxis}>
        <Text style={styles.sparkAxisText}>{Math.round(min)}m</Text>
        <Text style={styles.sparkAxisText}>{Math.round(max)}m</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.background },
  content: { padding: 16, paddingBottom: 32 },

  title: {
    color: Colors.textPrimary,
    fontSize: 20,
    fontWeight: '800',
    marginBottom: 4,
  },
  subtitle: {
    color: Colors.textSecondary,
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.6,
    marginBottom: 14,
  },

  heroRow: {
    flexDirection: 'row',
    backgroundColor: Colors.surfaceElevated,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.mud,
    paddingVertical: 14,
    marginBottom: 8,
  },
  statCell: { flex: 1, alignItems: 'center' },
  statValue: {
    color: Colors.mdGold,
    fontSize: 18,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
  },
  statLabel: {
    color: Colors.textMuted,
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 0.8,
    marginTop: 4,
  },

  section: { marginTop: 18 },
  sectionTitle: {
    color: Colors.textMuted,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.2,
    marginBottom: 8,
  },

  splitsHeader: {
    flexDirection: 'row',
    backgroundColor: Colors.surface,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.mud,
    paddingHorizontal: 10,
    paddingVertical: 8,
    marginBottom: 4,
  },
  splitsRow: {
    flexDirection: 'row',
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.mud,
  },
  splitsCol: {
    color: Colors.textSecondary,
    fontSize: 12,
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
  },
  splitsCol1: { width: 30 },
  splitsColMid: { flex: 1, textAlign: 'center' },
  splitsColEnd: { flex: 1, textAlign: 'right', color: Colors.textPrimary },

  sparklineWrap: {
    backgroundColor: Colors.surface,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.mud,
    padding: 10,
  },
  sparklineRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    height: 64,
    gap: 1,
  },
  sparkBar: {
    flex: 1,
    backgroundColor: Colors.mdGold,
    borderRadius: 1,
  },
  sparkAxis: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 6,
  },
  sparkAxisText: {
    color: Colors.textMuted,
    fontSize: 10,
    fontWeight: '700',
  },

  pauseRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.mud,
    paddingHorizontal: 10,
    paddingVertical: 10,
    marginBottom: 6,
  },
  pauseChip: {
    width: 44,
    backgroundColor: Colors.background,
    borderWidth: 1,
    borderColor: Colors.oak,
    borderRadius: 6,
    paddingVertical: 4,
    alignItems: 'center',
    marginRight: 10,
  },
  pauseChipText: {
    color: Colors.oak,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.6,
  },
  pauseBody: { flex: 1 },
  pauseTitle: {
    color: Colors.textPrimary,
    fontSize: 13,
    fontWeight: '700',
  },
  pauseSub: {
    color: Colors.textSecondary,
    fontSize: 11,
    marginTop: 2,
  },

  todRow: {
    backgroundColor: Colors.surface,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.mud,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  todBucket: {
    color: Colors.mdGold,
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  todHours: {
    color: Colors.textSecondary,
    fontSize: 12,
    marginTop: 4,
    fontVariant: ['tabular-nums'],
  },

  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  emptyTitle: {
    color: Colors.textPrimary,
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 12,
  },
  empty2: {
    color: Colors.textSecondary,
    fontSize: 12,
    paddingHorizontal: 4,
    paddingVertical: 6,
  },

  backBtn: {
    backgroundColor: Colors.surfaceElevated,
    borderRadius: 8,
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: Colors.mud,
  },
  backBtnText: {
    color: Colors.textPrimary,
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.8,
  },
});
