/**
 * ActivityCalendarScreen — GitHub-style activity heatmap that turns
 * every personal-layer artifact into a "field-day" pixel.
 *
 * Why: the user's personal layer is rich (waypoints / tracks / markups
 * / journal / checklists) but the *temporal* shape — when am I active
 * the most, what's my streak, what days lit up last fall — was hidden.
 * A heatmap turns history into a single-glance retention magnet
 * ("don't break the streak") and a date-first navigation surface
 * ("what did I do that Saturday in November?").
 *
 * Layout: a 13-column × 7-row grid (~3 months / 91 days), most-recent
 * column on the right. Cells are intensity-tinted moss. Tap a cell to
 * expand a "what happened" panel below the grid with deep-links into
 * each item's edit screen.
 *
 * Filter: mode chips (All/Hunt/Fish/Camp/Hike) re-aggregate from
 * source. Streak readout (current / longest) sits above the grid.
 *
 * Phase A.11 — added 2026-04-24 per V2_3_FEATURE_EXPANSION_PLAN.
 */

import React, { useMemo, useState } from 'react';
import {
  Dimensions,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import {
  useNavigation,
  useRoute,
  RouteProp,
} from '@react-navigation/native';
import Colors from '../theme/colors';
import { useUserWaypoints } from '../context/UserWaypointContext';
import { useTrackRecorder } from '../context/TrackRecorderContext';
import { useUserMarkups } from '../context/UserMarkupContext';
import { useJournalEntries } from '../context/JournalEntryContext';
import { useGearChecklists } from '../context/GearChecklistContext';
import {
  buildActivityCalendar,
  activeStreaks,
  CalendarInputs,
  CalendarDayItem,
} from '../services/activityCalendarService';
import type { WaypointMode } from '../types/userWaypoint';

type Params = {
  ActivityCalendar: { mode?: WaypointMode };
};

const MODE_FILTERS: { key: WaypointMode | 'all'; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'hunt', label: 'Hunt' },
  { key: 'fish', label: 'Fish' },
  { key: 'camp', label: 'Camp' },
  { key: 'hike', label: 'Hike' },
];

const NUM_WEEKS = 13;
const DAYS_PER_WEEK = 7;
const TOTAL_CELLS = NUM_WEEKS * DAYS_PER_WEEK;
const CELL_GUTTER = 3;
const HORIZONTAL_PADDING = 16;

const KIND_LABEL: Record<CalendarDayItem['kind'], string> = {
  waypoint: 'WP',
  track: 'TR',
  markup: 'MK',
  journal: 'JR',
  checklist: 'GC',
};

/**
 * Return YYYY-MM-DD for a Date in UTC.
 */
function dateKey(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/**
 * Build the most-recent NUM_WEEKS*DAYS_PER_WEEK day labels, oldest
 * first (so the rightmost column is the most recent week, matching
 * GitHub's contribution graph).
 */
function buildGridDays(referenceTodayKey: string): string[] {
  // Anchor: today is in the bottom-right corner. Walk back TOTAL_CELLS-1 days.
  const today = new Date(`${referenceTodayKey}T00:00:00.000Z`).getTime();
  const out: string[] = [];
  for (let i = TOTAL_CELLS - 1; i >= 0; i--) {
    out.push(new Date(today - i * 86_400_000).toISOString().slice(0, 10));
  }
  return out;
}

function formatDayLabel(iso: string): string {
  const d = new Date(`${iso}T12:00:00.000Z`);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function navigateToItem(navigation: any, item: CalendarDayItem) {
  switch (item.kind) {
    case 'waypoint':
      navigation.navigate('WaypointEdit', {
        mode: item.mode,
        waypointId: item.id,
      });
      break;
    case 'track':
      navigation.navigate('TrackDetail', { trackId: item.id });
      break;
    case 'markup':
      navigation.navigate('MarkupEdit', {
        mode: item.mode,
        markupId: item.id,
      });
      break;
    case 'journal':
      navigation.navigate('JournalEdit', {
        mode: item.mode,
        entryId: item.id,
      });
      break;
    case 'checklist':
      navigation.navigate('GearChecklistEdit', {
        mode: item.mode,
        checklistId: item.id,
      });
      break;
  }
}

export default function ActivityCalendarScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<RouteProp<Params, 'ActivityCalendar'>>();
  const initialMode = route.params?.mode;

  const { allWaypoints } = useUserWaypoints();
  const { allTracks } = useTrackRecorder();
  const { allMarkups } = useUserMarkups();
  const { allEntries } = useJournalEntries();
  const { allChecklists } = useGearChecklists();

  const [scopeMode, setScopeMode] = useState<WaypointMode | undefined>(
    initialMode,
  );
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  const inputs = useMemo<CalendarInputs>(
    () => ({
      waypoints: allWaypoints,
      tracks: allTracks,
      markups: allMarkups,
      journalEntries: allEntries,
      checklists: allChecklists,
    }),
    [allWaypoints, allTracks, allMarkups, allEntries, allChecklists],
  );

  const buckets = useMemo(
    () => buildActivityCalendar(inputs, { mode: scopeMode }),
    [inputs, scopeMode],
  );

  const todayKey = dateKey(new Date());

  const streaks = useMemo(
    () => activeStreaks(inputs, todayKey, { mode: scopeMode }),
    [inputs, todayKey, scopeMode],
  );

  const gridDays = useMemo(
    () => buildGridDays(todayKey),
    [todayKey],
  );

  // Map date → bucket for quick cell lookup.
  const byDate = useMemo(() => {
    const m = new Map<string, (typeof buckets)[number]>();
    for (const b of buckets) m.set(b.date, b);
    return m;
  }, [buckets]);

  const selectedBucket = selectedDate ? byDate.get(selectedDate) : undefined;

  // Cell sizing: total available width / NUM_WEEKS columns.
  const screenWidth = Dimensions.get('window').width;
  const gridWidth = screenWidth - HORIZONTAL_PADDING * 2;
  const cellSize =
    (gridWidth - CELL_GUTTER * (NUM_WEEKS - 1)) / NUM_WEEKS;

  const intensityColor = (count: number): string => {
    if (count <= 0) return Colors.surfaceElevated;
    if (count === 1) return '#3B5A40';
    if (count === 2) return '#4F7D55';
    if (count <= 4) return '#6FA46E';
    return Colors.moss;
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.contentInner}
    >
      <View style={styles.modeRow}>
        {MODE_FILTERS.map((f) => {
          const active =
            (f.key === 'all' && !scopeMode) || scopeMode === f.key;
          return (
            <TouchableOpacity
              key={f.key}
              style={[styles.modeChip, active && styles.modeChipActive]}
              onPress={() => {
                setScopeMode(
                  f.key === 'all' ? undefined : (f.key as WaypointMode),
                );
                setSelectedDate(null);
              }}
            >
              <Text
                style={[
                  styles.modeChipText,
                  active && styles.modeChipTextActive,
                ]}
              >
                {f.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <View style={styles.streakRow}>
        <View style={styles.streakBox}>
          <Text style={styles.streakNumber}>{streaks.current}</Text>
          <Text style={styles.streakLabel}>current streak</Text>
        </View>
        <View style={styles.streakDivider} />
        <View style={styles.streakBox}>
          <Text style={styles.streakNumber}>{streaks.longest}</Text>
          <Text style={styles.streakLabel}>longest streak</Text>
        </View>
        <View style={styles.streakDivider} />
        <View style={styles.streakBox}>
          <Text style={styles.streakNumber}>{buckets.length}</Text>
          <Text style={styles.streakLabel}>total active days</Text>
        </View>
      </View>

      <Text style={styles.sectionTitle}>Last 13 weeks</Text>
      <View
        style={[
          styles.grid,
          { width: gridWidth },
        ]}
      >
        {Array.from({ length: NUM_WEEKS }).map((_, weekIdx) => (
          <View
            key={`week-${weekIdx}`}
            style={[
              styles.weekCol,
              { marginRight: weekIdx === NUM_WEEKS - 1 ? 0 : CELL_GUTTER },
            ]}
          >
            {Array.from({ length: DAYS_PER_WEEK }).map((__, dayIdx) => {
              const cellIdx = weekIdx * DAYS_PER_WEEK + dayIdx;
              const date = gridDays[cellIdx];
              const bucket = byDate.get(date);
              const count = bucket?.total ?? 0;
              const isToday = date === todayKey;
              const isSelected = date === selectedDate;
              return (
                <TouchableOpacity
                  key={date}
                  onPress={() =>
                    setSelectedDate(isSelected ? null : date)
                  }
                  activeOpacity={0.7}
                  style={[
                    styles.cell,
                    {
                      width: cellSize,
                      height: cellSize,
                      marginBottom:
                        dayIdx === DAYS_PER_WEEK - 1 ? 0 : CELL_GUTTER,
                      backgroundColor: intensityColor(count),
                    },
                    isToday && styles.cellToday,
                    isSelected && styles.cellSelected,
                  ]}
                />
              );
            })}
          </View>
        ))}
      </View>

      <View style={styles.legendRow}>
        <Text style={styles.legendLabel}>less</Text>
        {[0, 1, 2, 4, 6].map((c, i) => (
          <View
            key={i}
            style={[
              styles.legendCell,
              { backgroundColor: intensityColor(c) },
            ]}
          />
        ))}
        <Text style={styles.legendLabel}>more</Text>
      </View>

      {selectedDate ? (
        selectedBucket ? (
          <View style={styles.detailBox}>
            <Text style={styles.detailDate}>{formatDayLabel(selectedDate)}</Text>
            <Text style={styles.detailCount}>
              {selectedBucket.total}{' '}
              {selectedBucket.total === 1 ? 'item' : 'items'}
            </Text>
            {selectedBucket.items.map((it) => (
              <TouchableOpacity
                key={`${it.kind}:${it.id}`}
                style={styles.detailRow}
                onPress={() => navigateToItem(navigation, it)}
                activeOpacity={0.85}
              >
                <View style={styles.kindChip}>
                  <Text style={styles.kindChipText}>{KIND_LABEL[it.kind]}</Text>
                </View>
                <View style={styles.detailRowBody}>
                  <Text style={styles.detailRowLabel} numberOfLines={1}>
                    {it.label}
                  </Text>
                  {it.detail ? (
                    <Text style={styles.detailRowSub} numberOfLines={1}>
                      {it.detail} · {it.mode}
                    </Text>
                  ) : (
                    <Text style={styles.detailRowSub}>{it.mode}</Text>
                  )}
                </View>
                <Text style={styles.detailChev}>{'\u203A'}</Text>
              </TouchableOpacity>
            ))}
          </View>
        ) : (
          <View style={styles.detailBoxEmpty}>
            <Text style={styles.detailDate}>{formatDayLabel(selectedDate)}</Text>
            <Text style={styles.detailEmptyHint}>
              No personal-layer activity on this day in this filter.
            </Text>
          </View>
        )
      ) : (
        <Text style={styles.tapHint}>
          Tap any day to see what you did. The last 13 weeks of your
          field activity are shown — switch modes to filter.
        </Text>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  contentInner: {
    paddingHorizontal: HORIZONTAL_PADDING,
    paddingTop: 14,
    paddingBottom: 32,
  },
  modeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 14,
  },
  modeChip: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.mud,
    backgroundColor: Colors.surface,
  },
  modeChipActive: {
    backgroundColor: Colors.oak,
    borderColor: Colors.oak,
  },
  modeChipText: {
    color: Colors.textSecondary,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.4,
  },
  modeChipTextActive: {
    color: Colors.background,
  },
  streakRow: {
    flexDirection: 'row',
    alignItems: 'stretch',
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.mud,
    borderRadius: 12,
    paddingVertical: 12,
    marginBottom: 16,
  },
  streakBox: {
    flex: 1,
    alignItems: 'center',
  },
  streakDivider: {
    width: 1,
    backgroundColor: Colors.mud,
    marginVertical: 4,
  },
  streakNumber: {
    color: Colors.textPrimary,
    fontSize: 22,
    fontWeight: '800',
  },
  streakLabel: {
    color: Colors.textMuted,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
    marginTop: 2,
    textAlign: 'center',
  },
  sectionTitle: {
    color: Colors.textPrimary,
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 0.8,
    marginBottom: 10,
  },
  grid: {
    flexDirection: 'row',
    alignSelf: 'flex-start',
    marginBottom: 12,
  },
  weekCol: {
    flexDirection: 'column',
  },
  cell: {
    borderRadius: 3,
  },
  cellToday: {
    borderWidth: 1,
    borderColor: Colors.mdGold,
  },
  cellSelected: {
    borderWidth: 2,
    borderColor: Colors.amber,
  },
  legendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 18,
  },
  legendLabel: {
    color: Colors.textMuted,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
    paddingHorizontal: 4,
  },
  legendCell: {
    width: 12,
    height: 12,
    borderRadius: 2,
  },
  tapHint: {
    color: Colors.textMuted,
    fontSize: 12,
    lineHeight: 17,
    paddingVertical: 12,
    textAlign: 'center',
  },
  detailBox: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.mud,
    borderRadius: 12,
    padding: 14,
  },
  detailBoxEmpty: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.mud,
    borderRadius: 12,
    padding: 14,
    alignItems: 'center',
  },
  detailDate: {
    color: Colors.textPrimary,
    fontSize: 14,
    fontWeight: '800',
    marginBottom: 6,
  },
  detailCount: {
    color: Colors.textMuted,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
    marginBottom: 10,
  },
  detailEmptyHint: {
    color: Colors.textMuted,
    fontSize: 12,
    lineHeight: 17,
    textAlign: 'center',
    marginTop: 4,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    borderTopWidth: 1,
    borderColor: Colors.mud,
  },
  kindChip: {
    width: 30,
    height: 22,
    borderRadius: 4,
    backgroundColor: Colors.background,
    borderWidth: 1,
    borderColor: Colors.moss,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  kindChipText: {
    color: Colors.textPrimary,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.4,
  },
  detailRowBody: {
    flex: 1,
  },
  detailRowLabel: {
    color: Colors.textPrimary,
    fontSize: 13,
    fontWeight: '700',
  },
  detailRowSub: {
    color: Colors.textMuted,
    fontSize: 11,
    marginTop: 1,
  },
  detailChev: {
    color: Colors.textSecondary,
    fontSize: 16,
    marginLeft: 6,
  },
});
