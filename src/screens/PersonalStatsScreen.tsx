/**
 * PersonalStatsScreen — lifetime activity dashboard.
 *
 * V2_3 Phase A.4 (retention surface). Reads the three personal-layer
 * contexts (waypoints / tracks / markups), runs them through the pure
 * `personalStatsService.computePersonalStats`, and renders:
 *
 *   - Hero card: total tracks, total miles, total elevation, days active
 *   - "Last 7 / Last 30 days" recency strip
 *   - Per-mode breakdown rows (Hunt / Fish / Camp / Hike) with MV chip,
 *     track count, distance, waypoint+markup tallies
 *   - Personal records: longest single track, biggest elevation gain
 *   - First / Last activity date footer
 *
 * No network, no filesystem, no platform-specific APIs — purely consumes
 * in-memory snapshots from the providers, so it's safe to mount under
 * any per-mode tab stack.
 */

import React, { useEffect, useMemo, useState } from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Colors from '../theme/colors';
import { useUserWaypoints } from '../context/UserWaypointContext';
import { useTrackRecorder } from '../context/TrackRecorderContext';
import { useUserMarkups } from '../context/UserMarkupContext';
import {
  computePersonalStats,
  formatStatDistance,
  formatElevationFt,
  formatStatDuration,
  modeCode,
  modeLabel,
  PERSONAL_STATS_MODES,
  PersonalStatsByMode,
} from '../services/personalStatsService';
import {
  cadenceGapLabel,
  computeTripCadence,
  daysSinceLabel,
  tripMonthlyStreak,
} from '../services/tripCadenceService';
import type { WaypointMode } from '../types/userWaypoint';
import type { CampTrip } from '../types/camp';
import type { HikeTrip } from '../types/hike';

function HeroStat({
  label,
  value,
  unit,
}: {
  label: string;
  value: string;
  unit?: string;
}) {
  return (
    <View style={styles.heroStat}>
      <Text style={styles.heroValue}>
        {value}
        {unit ? <Text style={styles.heroUnit}>{` ${unit}`}</Text> : null}
      </Text>
      <Text style={styles.heroLabel}>{label}</Text>
    </View>
  );
}

function ModeRow({
  mode,
  data,
}: {
  mode: WaypointMode;
  data: PersonalStatsByMode;
}) {
  const empty =
    data.trackCount === 0 &&
    data.waypointCount === 0 &&
    data.markupCount === 0;
  return (
    <View style={[styles.modeRow, empty && styles.modeRowEmpty]}>
      <View style={[styles.modeChip, empty && styles.modeChipEmpty]}>
        <Text style={[styles.modeChipText, empty && styles.modeChipTextEmpty]}>
          {modeCode(mode)}
        </Text>
      </View>
      <View style={styles.modeBody}>
        <Text style={[styles.modeLabel, empty && styles.modeLabelEmpty]}>
          {modeLabel(mode)}
        </Text>
        {empty ? (
          <Text style={styles.modeLine}>No saved activity yet.</Text>
        ) : (
          <>
            <Text style={styles.modeLine}>
              {data.trackCount} track{data.trackCount === 1 ? '' : 's'} ·{' '}
              {formatStatDistance(data.totalDistanceM)} ·{' '}
              {formatElevationFt(data.totalElevationGainM)} gain
            </Text>
            <Text style={styles.modeLineSecondary}>
              {data.waypointCount} waypoint
              {data.waypointCount === 1 ? '' : 's'} ·{' '}
              {data.markupCount} markup
              {data.markupCount === 1 ? '' : 's'}
            </Text>
          </>
        )}
      </View>
    </View>
  );
}

export default function PersonalStatsScreen() {
  const { allWaypoints } = useUserWaypoints();
  const { allTracks } = useTrackRecorder();
  const { allMarkups } = useUserMarkups();

  const stats = useMemo(
    () =>
      computePersonalStats({
        waypoints: allWaypoints,
        tracks: allTracks,
        markups: allMarkups,
      }),
    [allWaypoints, allTracks, allMarkups],
  );

  // Phase A.47 — load Camp + Hike trips for the TRIP CADENCE section.
  // CampTripContext + HikeTripContext are scoped to the planner stacks
  // (not hoisted to root), so a direct read on mount is the simplest
  // path. Mirrors the briefing trip-loader pattern from A.44.
  const [campTrips, setCampTrips] = useState<CampTrip[]>([]);
  const [hikeTrips, setHikeTrips] = useState<HikeTrip[]>([]);
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [campRaw, hikeRaw] = await Promise.all([
          AsyncStorage.getItem('camp_trips_v1'),
          AsyncStorage.getItem('hike_trips_v1'),
        ]);
        if (cancelled) return;
        setCampTrips(campRaw ? (JSON.parse(campRaw) as CampTrip[]) : []);
        setHikeTrips(hikeRaw ? (JSON.parse(hikeRaw) as HikeTrip[]) : []);
      } catch {
        // empty arrays on read error is the safe default
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const cadence = useMemo(
    () => computeTripCadence({ campTrips, hikeTrips }),
    [campTrips, hikeTrips],
  );

  // Phase A.50 — monthly trip streak (consecutive months with at
  // least one trip). Distinct from journal-day streak (A.20). Lives
  // inside the TRIP CADENCE block.
  const monthlyStreak = useMemo(
    () => tripMonthlyStreak({ campTrips, hikeTrips }),
    [campTrips, hikeTrips],
  );

  const totalDistanceLabel = formatStatDistance(stats.totals.totalDistanceM);
  const totalElevationLabel = formatElevationFt(stats.totals.totalElevationGainM);
  const totalDurationLabel = formatStatDuration(stats.totals.totalDurationSec);

  const isEmpty =
    stats.totals.trackCount === 0 &&
    stats.totals.waypointCount === 0 &&
    stats.totals.markupCount === 0;

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
    >
      {isEmpty ? (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyTitle}>Your stats will live here.</Text>
          <Text style={styles.emptyBody}>
            Record a track, drop a waypoint, or sketch a boundary on the map
            and you&apos;ll see lifetime totals, days active, and personal
            records show up automatically.
          </Text>
        </View>
      ) : (
        <>
          <View style={styles.heroCard}>
            <Text style={styles.heroHeader}>LIFETIME</Text>
            <View style={styles.heroGrid}>
              <HeroStat
                label="Tracks"
                value={stats.totals.trackCount.toLocaleString()}
              />
              <HeroStat
                label="Distance"
                value={totalDistanceLabel}
              />
            </View>
            <View style={styles.heroGrid}>
              <HeroStat
                label="Elevation gain"
                value={totalElevationLabel}
              />
              <HeroStat
                label="Days active"
                value={stats.daysActive.toLocaleString()}
              />
            </View>
            <Text style={styles.heroFootnote}>
              Time on the move: {totalDurationLabel}
            </Text>
          </View>

          <View style={styles.recencyCard}>
            <View style={styles.recencyCol}>
              <Text style={styles.recencyValue}>{stats.last7Days}</Text>
              <Text style={styles.recencyLabel}>last 7 days</Text>
            </View>
            <View style={styles.recencyDivider} />
            <View style={styles.recencyCol}>
              <Text style={styles.recencyValue}>{stats.last30Days}</Text>
              <Text style={styles.recencyLabel}>last 30 days</Text>
            </View>
            <View style={styles.recencyDivider} />
            <View style={styles.recencyCol}>
              <Text style={styles.recencyValue}>
                {stats.totals.waypointCount + stats.totals.markupCount}
              </Text>
              <Text style={styles.recencyLabel}>marks dropped</Text>
            </View>
          </View>

          <Text style={styles.sectionHeader}>BY MODE</Text>
          {PERSONAL_STATS_MODES.map((mode) => (
            <ModeRow key={mode} mode={mode} data={stats.byMode[mode]} />
          ))}

          {cadence.totalPast.total > 0 ? (
            <>
              <Text style={styles.sectionHeader}>TRIP CADENCE</Text>
              <View style={styles.cadenceCard}>
                <View style={styles.cadenceRow}>
                  <View style={styles.cadenceCol}>
                    <Text style={styles.cadenceValue}>
                      {cadence.totalPast.total}
                    </Text>
                    <Text style={styles.cadenceLabel}>
                      total · {cadence.totalPast.camp} camp ·{' '}
                      {cadence.totalPast.hike} hike
                    </Text>
                  </View>
                  <View style={styles.cadenceDivider} />
                  <View style={styles.cadenceCol}>
                    <Text style={styles.cadenceValue}>
                      {cadence.thisYear.total}
                    </Text>
                    <Text style={styles.cadenceLabel}>this year</Text>
                  </View>
                  <View style={styles.cadenceDivider} />
                  <View style={styles.cadenceCol}>
                    <Text style={styles.cadenceValue}>
                      {cadence.lastYear.total}
                    </Text>
                    <Text style={styles.cadenceLabel}>last year</Text>
                  </View>
                </View>
                <View style={styles.cadenceFooterRow}>
                  <Text style={styles.cadenceFooterLabel}>last trip</Text>
                  <Text
                    style={[
                      styles.cadenceFooterValue,
                      cadence.isLongGap && {
                        color: Colors.amber,
                      },
                    ]}
                  >
                    {daysSinceLabel(cadence.daysSinceLastTrip)}
                  </Text>
                </View>
                <View style={styles.cadenceFooterRow}>
                  <Text style={styles.cadenceFooterLabel}>typical gap</Text>
                  <Text style={styles.cadenceFooterValue}>
                    {cadenceGapLabel(cadence.averageGapDays)}
                  </Text>
                </View>
                {cadence.longestGapDays !== null ? (
                  <View style={styles.cadenceFooterRow}>
                    <Text style={styles.cadenceFooterLabel}>longest gap</Text>
                    <Text style={styles.cadenceFooterValue}>
                      {cadence.longestGapDays} day
                      {cadence.longestGapDays === 1 ? '' : 's'}
                    </Text>
                  </View>
                ) : null}
                {monthlyStreak.longest > 0 ? (
                  <View style={styles.cadenceFooterRow}>
                    <Text style={styles.cadenceFooterLabel}>monthly streak</Text>
                    <Text
                      style={[
                        styles.cadenceFooterValue,
                        monthlyStreak.current >= 3 && { color: Colors.moss },
                      ]}
                    >
                      {monthlyStreak.current} mo · best{' '}
                      {monthlyStreak.longest}
                    </Text>
                  </View>
                ) : null}
              </View>
            </>
          ) : null}

          {stats.totals.trackCount > 0 ? (
            <>
              <Text style={styles.sectionHeader}>PERSONAL RECORDS</Text>
              <View style={styles.recordCard}>
                <View style={styles.recordRow}>
                  <Text style={styles.recordLabel}>Longest single track</Text>
                  <Text style={styles.recordValue}>
                    {formatStatDistance(stats.totals.longestTrackM)}
                  </Text>
                </View>
                <View style={styles.recordRow}>
                  <Text style={styles.recordLabel}>Biggest elevation gain</Text>
                  <Text style={styles.recordValue}>
                    {formatElevationFt(stats.totals.bestElevationGainM)}
                  </Text>
                </View>
              </View>
            </>
          ) : null}

          {stats.firstActivityDate && stats.lastActivityDate ? (
            <View style={styles.timelineCard}>
              <Text style={styles.timelineText}>
                First saved on {stats.firstActivityDate}. Last activity{' '}
                {stats.lastActivityDate}.
              </Text>
            </View>
          ) : null}
        </>
      )}
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
  emptyCard: {
    backgroundColor: Colors.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.mud,
    padding: 22,
    alignItems: 'center',
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginBottom: 8,
    textAlign: 'center',
  },
  emptyBody: {
    fontSize: 13,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 19,
  },
  heroCard: {
    backgroundColor: Colors.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.moss,
    padding: 18,
    marginBottom: 14,
  },
  heroHeader: {
    fontSize: 11,
    fontWeight: '800',
    color: Colors.moss,
    letterSpacing: 1.5,
    marginBottom: 12,
  },
  heroGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  heroStat: {
    flex: 1,
    paddingVertical: 6,
  },
  heroValue: {
    fontSize: 26,
    fontWeight: '800',
    color: Colors.textPrimary,
  },
  heroUnit: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  heroLabel: {
    fontSize: 11,
    color: Colors.textSecondary,
    marginTop: 2,
    letterSpacing: 0.5,
  },
  heroFootnote: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 6,
    fontStyle: 'italic',
  },
  recencyCard: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.mud,
    flexDirection: 'row',
    paddingVertical: 14,
    marginBottom: 16,
  },
  recencyCol: {
    flex: 1,
    alignItems: 'center',
  },
  recencyDivider: {
    width: 1,
    backgroundColor: Colors.mud,
    marginVertical: 4,
  },
  recencyValue: {
    fontSize: 20,
    fontWeight: '800',
    color: Colors.textPrimary,
  },
  recencyLabel: {
    fontSize: 10,
    color: Colors.textSecondary,
    marginTop: 4,
    letterSpacing: 0.4,
  },
  sectionHeader: {
    fontSize: 11,
    fontWeight: '800',
    color: Colors.textSecondary,
    letterSpacing: 1.2,
    marginBottom: 8,
    marginTop: 6,
    marginLeft: 4,
  },
  modeRow: {
    backgroundColor: Colors.surface,
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 14,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: Colors.mud,
    flexDirection: 'row',
    alignItems: 'center',
  },
  modeRowEmpty: {
    opacity: 0.55,
  },
  modeChip: {
    minWidth: 38,
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 7,
    backgroundColor: Colors.moss,
    alignItems: 'center',
    marginRight: 12,
  },
  modeChipEmpty: {
    backgroundColor: Colors.mud,
  },
  modeChipText: {
    fontSize: 11,
    fontWeight: '800',
    color: Colors.textOnAccent,
    letterSpacing: 1,
  },
  modeChipTextEmpty: {
    color: Colors.textSecondary,
  },
  modeBody: {
    flex: 1,
  },
  modeLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  modeLabelEmpty: {
    color: Colors.textSecondary,
  },
  modeLine: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 3,
  },
  modeLineSecondary: {
    fontSize: 11,
    color: Colors.textMuted,
    marginTop: 2,
  },
  cadenceCard: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.mud,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 14,
  },
  cadenceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
    marginBottom: 8,
  },
  cadenceCol: {
    flex: 1,
    alignItems: 'flex-start',
  },
  cadenceDivider: {
    width: 1,
    backgroundColor: Colors.mud,
    alignSelf: 'stretch',
    marginHorizontal: 10,
  },
  cadenceValue: {
    color: Colors.textPrimary,
    fontSize: 22,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
  },
  cadenceLabel: {
    color: Colors.textMuted,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
    marginTop: 2,
  },
  cadenceFooterRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
    borderTopWidth: 1,
    borderTopColor: Colors.mud,
  },
  cadenceFooterLabel: {
    fontSize: 12,
    color: Colors.textSecondary,
    fontWeight: '600',
  },
  cadenceFooterValue: {
    fontSize: 12,
    color: Colors.textPrimary,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
  },
  recordCard: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.mud,
    paddingHorizontal: 14,
    paddingVertical: 8,
    marginBottom: 14,
  },
  recordRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  recordLabel: {
    fontSize: 13,
    color: Colors.textPrimary,
  },
  recordValue: {
    fontSize: 14,
    fontWeight: '800',
    color: Colors.textPrimary,
  },
  timelineCard: {
    backgroundColor: Colors.surface,
    borderRadius: 10,
    padding: 12,
    marginTop: 4,
    borderWidth: 1,
    borderColor: Colors.mud,
  },
  timelineText: {
    fontSize: 11,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 16,
  },
});
