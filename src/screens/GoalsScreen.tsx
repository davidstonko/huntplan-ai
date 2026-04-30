/**
 * GoalsScreen — Annual Goal Tracker (V2.3 Phase A.28).
 *
 * Lists every user-defined goal with a live progress bar, "current of
 * target" readout, and a pace verdict badge (ahead / on pace / behind /
 * complete). Tap a row to edit its target or label. Long-press to delete.
 * "+ NEW" opens an in-screen modal to compose a goal: scope (mode or
 * all), metric (one of 7), numeric target, year (current or next).
 *
 * Data flow:
 *   - Goals load from AsyncStorage on mount via goalsStorage.loadGoals.
 *   - Progress is a pure read over UserWaypointContext / TrackRecorderContext
 *     / JournalEntryContext — no separate cache. Every render recomputes,
 *     which is cheap because computeAllGoalProgress is O(rows).
 *   - Add/edit/delete write through goalsStorage and re-set local state
 *     (no context needed — goals are screen-scoped, the only consumer
 *     today is this screen + the PersonalHub badge which reads via this
 *     same storage helper).
 *
 * UX choices:
 *   - Year defaults to the current year on new goals; a quick "next year"
 *     toggle exists so a user setting up January resolutions in December
 *     doesn't have to type the year.
 *   - Pace badge colors mirror Colors.success / amber / rust / mdGold for
 *     ahead / on_pace-ish / behind / complete respectively. on_pace is
 *     intentionally the calmest color (mdGold is reserved for "complete"
 *     to give finishing a goal a noticeably brighter readout).
 *   - Rows are sorted by year DESC then createdAt DESC so the active
 *     year sits at the top.
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  FlatList,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import Colors from '../theme/colors';
import {
  loadGoals,
  addGoal,
  updateGoal,
  deleteGoal,
} from '../services/goalsStorage';
import {
  computeAllGoalProgress,
  defaultLabelFor,
  unitForMetric,
} from '../services/goalsService';
import type {
  Goal,
  GoalMetric,
  GoalProgress,
  GoalScope,
  PaceStatus,
} from '../types/goal';
import type { WaypointMode } from '../types/userWaypoint';
import { useUserWaypoints } from '../context/UserWaypointContext';
import { useTrackRecorder } from '../context/TrackRecorderContext';
import { useJournalEntries } from '../context/JournalEntryContext';

// ────────────────────────── meta tables ──────────────────────────

const METRIC_OPTIONS: { value: GoalMetric; label: string; hint: string }[] = [
  { value: 'track_distance',     label: 'Distance',          hint: 'Total miles tracked' },
  { value: 'track_duration',     label: 'Time on the move',  hint: 'Total hours recorded' },
  { value: 'track_count',        label: 'Tracks',            hint: 'Number of recorded tracks' },
  { value: 'elevation_gain',     label: 'Elevation gain',    hint: 'Total feet climbed' },
  { value: 'journal_entries',    label: 'Journal entries',   hint: 'Field notes written' },
  { value: 'unique_active_days', label: 'Active days',       hint: 'Distinct days afield' },
  { value: 'waypoint_count',     label: 'Pins dropped',      hint: 'New waypoints saved' },
];

const SCOPE_OPTIONS: { value: GoalScope; label: string }[] = [
  { value: 'all',  label: 'All modes' },
  { value: 'hunt', label: 'Hunt' },
  { value: 'fish', label: 'Fish' },
  { value: 'camp', label: 'Camp' },
  { value: 'hike', label: 'Hike' },
];

function paceLabel(p: PaceStatus): string {
  switch (p) {
    case 'ahead':    return 'AHEAD';
    case 'on_pace':  return 'ON PACE';
    case 'behind':   return 'BEHIND';
    case 'complete': return 'COMPLETE';
  }
}

function paceColor(p: PaceStatus): string {
  switch (p) {
    case 'ahead':    return Colors.success;
    case 'on_pace':  return Colors.sage;
    case 'behind':   return Colors.rust;
    case 'complete': return Colors.mdGold;
  }
}

function paceTextColor(p: PaceStatus): string {
  // mdGold is light enough that the dark text reads better
  return p === 'complete' ? Colors.mdBlack : Colors.textOnAccent;
}

function genId(): string {
  // Same lightweight id pattern as journalEntryStorage / waypointStorage —
  // not cryptographic, just collision-resistant within a single device's
  // lifetime.
  return `g_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

// ────────────────────────── screen ──────────────────────────

export default function GoalsScreen() {
  const navigation = useNavigation<any>();
  const { allWaypoints } = useUserWaypoints();
  const { allTracks } = useTrackRecorder();
  const { allEntries } = useJournalEntries();

  const [goals, setGoals] = useState<Goal[]>([]);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void loadGoals().then((rows) => {
      if (!cancelled) {
        setGoals(rows);
        setHydrated(true);
      }
    });
    return () => {
      cancelled = true;
    };
  }, []);

  // Sort goals by year DESC then createdAt DESC so the active year is on top.
  const orderedGoals = useMemo(
    () =>
      [...goals].sort((a, b) => {
        if (b.year !== a.year) return b.year - a.year;
        return b.createdAt.localeCompare(a.createdAt);
      }),
    [goals],
  );

  const progressRows: GoalProgress[] = useMemo(
    () =>
      computeAllGoalProgress(orderedGoals, {
        tracks: allTracks,
        journals: allEntries,
        waypoints: allWaypoints,
      }),
    [orderedGoals, allTracks, allEntries, allWaypoints],
  );

  // ── editor modal state ──
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draftScope, setDraftScope] = useState<GoalScope>('all');
  const [draftMetric, setDraftMetric] = useState<GoalMetric>('track_distance');
  const [draftYear, setDraftYear] = useState<number>(new Date().getFullYear());
  const [draftTarget, setDraftTarget] = useState<string>('');
  const [draftLabel, setDraftLabel] = useState<string>('');

  const openNewEditor = useCallback(() => {
    setEditingId(null);
    setDraftScope('all');
    setDraftMetric('track_distance');
    setDraftYear(new Date().getFullYear());
    setDraftTarget('');
    setDraftLabel('');
    setEditorOpen(true);
  }, []);

  const openEditEditor = useCallback((g: Goal) => {
    setEditingId(g.id);
    setDraftScope(g.scope);
    setDraftMetric(g.metric);
    setDraftYear(g.year);
    setDraftTarget(String(g.targetValue));
    setDraftLabel(g.label ?? '');
    setEditorOpen(true);
  }, []);

  const closeEditor = useCallback(() => setEditorOpen(false), []);

  const onSave = useCallback(async () => {
    const target = parseFloat(draftTarget);
    if (!isFinite(target) || target <= 0) {
      Alert.alert('Set a target', 'Enter a positive number for the goal target.');
      return;
    }
    const nowIso = new Date().toISOString();
    if (editingId) {
      const next: Goal = {
        id: editingId,
        scope: draftScope,
        metric: draftMetric,
        year: draftYear,
        targetValue: target,
        label: draftLabel.trim() || undefined,
        // updatedAt is overwritten inside updateGoal; createdAt preserved
        // by reading from current state.
        createdAt:
          goals.find((g) => g.id === editingId)?.createdAt ?? nowIso,
        updatedAt: nowIso,
      };
      const rows = await updateGoal(next);
      setGoals(rows);
    } else {
      const next: Goal = {
        id: genId(),
        scope: draftScope,
        metric: draftMetric,
        year: draftYear,
        targetValue: target,
        label: draftLabel.trim() || undefined,
        createdAt: nowIso,
        updatedAt: nowIso,
      };
      const rows = await addGoal(next);
      setGoals(rows);
    }
    setEditorOpen(false);
  }, [
    editingId,
    draftScope,
    draftMetric,
    draftYear,
    draftTarget,
    draftLabel,
    goals,
  ]);

  const onDelete = useCallback(
    (g: Goal) => {
      Alert.alert(
        'Delete goal?',
        `"${g.label ?? defaultLabelFor(g)}" will be removed.`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Delete',
            style: 'destructive',
            onPress: async () => {
              const rows = await deleteGoal(g.id);
              setGoals(rows);
            },
          },
        ],
      );
    },
    [],
  );

  // ── row renderer ──
  const renderRow = useCallback(
    ({ item }: { item: GoalProgress }) => {
      const goal = item.goal;
      const label = goal.label?.trim() || defaultLabelFor(goal);
      const pace = item.paceStatus;
      const fillPct = Math.max(0, Math.min(100, item.percent));
      const fillColor =
        pace === 'complete'
          ? Colors.mdGold
          : pace === 'ahead'
          ? Colors.success
          : pace === 'on_pace'
          ? Colors.sage
          : Colors.rust;

      return (
        <Pressable
          style={styles.row}
          onPress={() => openEditEditor(goal)}
          onLongPress={() => onDelete(goal)}
          android_ripple={{ color: Colors.surfaceElevated }}
        >
          <View style={styles.rowHeader}>
            <Text style={styles.rowTitle} numberOfLines={1}>
              {label}
            </Text>
            <View style={[styles.paceBadge, { backgroundColor: paceColor(pace) }]}>
              <Text style={[styles.paceBadgeText, { color: paceTextColor(pace) }]}>
                {paceLabel(pace)}
              </Text>
            </View>
          </View>
          <View style={styles.progressTrack}>
            <View
              style={[
                styles.progressFill,
                { width: `${fillPct}%`, backgroundColor: fillColor },
              ]}
            />
          </View>
          <View style={styles.rowMeta}>
            <Text style={styles.rowMetaText}>
              {item.display.current} of {item.display.target} {item.display.unit}
              {' · '}
              {Math.round(item.percent)}%
            </Text>
            <Text style={styles.rowMetaText}>
              {item.daysRemaining > 0
                ? `${item.daysRemaining} days left`
                : `${goal.year} closed`}
            </Text>
          </View>
        </Pressable>
      );
    },
    [openEditEditor, onDelete],
  );

  const headerSubtitle =
    progressRows.length === 0
      ? 'Set yearly targets — distance, time, journal entries, days afield. The app does the math.'
      : `${progressRows.length} active ${progressRows.length === 1 ? 'goal' : 'goals'} · long-press a row to delete`;

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <View style={styles.headerCol}>
          <Text style={styles.heading}>ANNUAL GOALS</Text>
          <Text style={styles.headerSub}>{headerSubtitle}</Text>
        </View>
        <Pressable onPress={openNewEditor} hitSlop={12} style={styles.newBtn}>
          <Text style={styles.newBtnText}>+ NEW</Text>
        </Pressable>
      </View>

      {!hydrated ? (
        <View style={styles.emptyWrap}>
          <Text style={styles.emptyHint}>Loading goals…</Text>
        </View>
      ) : progressRows.length === 0 ? (
        <View style={styles.emptyWrap}>
          <Text style={styles.emptyTitle}>No goals yet</Text>
          <Text style={styles.emptyHint}>
            Pick a number you want to hit by year-end — 100 miles hiked,
            50 fishing trips logged, 200 active days. The progress bar
            updates as you use the app.
          </Text>
          <Pressable onPress={openNewEditor} style={styles.emptyCta}>
            <Text style={styles.emptyCtaText}>+ SET MY FIRST GOAL</Text>
          </Pressable>
        </View>
      ) : (
        <FlatList
          data={progressRows}
          keyExtractor={(r) => r.goal.id}
          renderItem={renderRow}
          contentContainerStyle={styles.listBody}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
        />
      )}

      <Modal
        visible={editorOpen}
        transparent
        animationType="fade"
        onRequestClose={closeEditor}
      >
        <Pressable style={styles.sheetBackdrop} onPress={closeEditor}>
          <Pressable style={styles.sheet} onPress={() => {}}>
            <View style={styles.sheetHandle} />
            <Text style={styles.sheetTitle}>
              {editingId ? 'Edit goal' : 'New goal'}
            </Text>

            <Text style={styles.fieldLabel}>SCOPE</Text>
            <View style={styles.chipRow}>
              {SCOPE_OPTIONS.map((opt) => {
                const active = draftScope === opt.value;
                return (
                  <Pressable
                    key={opt.value}
                    style={[styles.pickerChip, active && styles.pickerChipActive]}
                    onPress={() => setDraftScope(opt.value)}
                  >
                    <Text
                      style={[
                        styles.pickerChipText,
                        active && styles.pickerChipTextActive,
                      ]}
                    >
                      {opt.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            <Text style={styles.fieldLabel}>METRIC</Text>
            <View style={styles.chipColumn}>
              {METRIC_OPTIONS.map((opt) => {
                const active = draftMetric === opt.value;
                return (
                  <Pressable
                    key={opt.value}
                    style={[styles.metricRow, active && styles.metricRowActive]}
                    onPress={() => setDraftMetric(opt.value)}
                  >
                    <View style={styles.metricRowText}>
                      <Text
                        style={[
                          styles.metricLabel,
                          active && styles.metricLabelActive,
                        ]}
                      >
                        {opt.label}
                      </Text>
                      <Text style={styles.metricHint}>{opt.hint}</Text>
                    </View>
                    <Text
                      style={[
                        styles.metricUnit,
                        active && styles.metricUnitActive,
                      ]}
                    >
                      {unitForMetric(opt.value)}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            <Text style={styles.fieldLabel}>TARGET</Text>
            <View style={styles.targetRow}>
              <TextInput
                style={styles.targetInput}
                value={draftTarget}
                onChangeText={setDraftTarget}
                keyboardType="numeric"
                placeholder="100"
                placeholderTextColor={Colors.textMuted}
              />
              <Text style={styles.targetUnit}>{unitForMetric(draftMetric)}</Text>
            </View>

            <Text style={styles.fieldLabel}>YEAR</Text>
            <View style={styles.chipRow}>
              {[
                new Date().getFullYear(),
                new Date().getFullYear() + 1,
              ].map((y) => {
                const active = draftYear === y;
                return (
                  <Pressable
                    key={y}
                    style={[styles.pickerChip, active && styles.pickerChipActive]}
                    onPress={() => setDraftYear(y)}
                  >
                    <Text
                      style={[
                        styles.pickerChipText,
                        active && styles.pickerChipTextActive,
                      ]}
                    >
                      {y}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            <Text style={styles.fieldLabel}>LABEL (OPTIONAL)</Text>
            <TextInput
              style={styles.labelInput}
              value={draftLabel}
              onChangeText={setDraftLabel}
              placeholder={defaultLabelFor({
                id: 'preview',
                scope: draftScope,
                metric: draftMetric,
                year: draftYear,
                targetValue: parseFloat(draftTarget) || 0,
                createdAt: '',
                updatedAt: '',
              })}
              placeholderTextColor={Colors.textMuted}
            />

            <View style={styles.sheetActions}>
              <Pressable style={styles.cancelBtn} onPress={closeEditor}>
                <Text style={styles.cancelBtnText}>CANCEL</Text>
              </Pressable>
              <TouchableOpacity style={styles.saveBtn} onPress={onSave}>
                <Text style={styles.saveBtnText}>
                  {editingId ? 'SAVE CHANGES' : 'CREATE GOAL'}
                </Text>
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

// ────────────────────────── styles ──────────────────────────

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingTop: 14,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderColor: Colors.mud,
  },
  headerCol: { flex: 1, marginRight: 12 },
  heading: {
    color: Colors.textPrimary,
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 1.1,
  },
  headerSub: {
    color: Colors.textMuted,
    fontSize: 11,
    marginTop: 4,
    lineHeight: 15,
  },
  newBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: Colors.mdGold,
    borderRadius: 6,
  },
  newBtnText: {
    color: Colors.mdBlack,
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  emptyWrap: {
    flex: 1,
    padding: 28,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyTitle: {
    color: Colors.textPrimary,
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 10,
  },
  emptyHint: {
    color: Colors.textMuted,
    fontSize: 13,
    lineHeight: 19,
    textAlign: 'center',
    marginBottom: 24,
  },
  emptyCta: {
    paddingHorizontal: 18,
    paddingVertical: 12,
    backgroundColor: Colors.mdGold,
    borderRadius: 8,
  },
  emptyCtaText: {
    color: Colors.mdBlack,
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  listBody: {
    paddingVertical: 6,
    paddingBottom: 40,
  },
  separator: {
    height: 1,
    backgroundColor: Colors.mud,
    marginHorizontal: 16,
  },
  row: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: Colors.surface,
  },
  rowHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  rowTitle: {
    color: Colors.textPrimary,
    fontSize: 15,
    fontWeight: '700',
    flex: 1,
    marginRight: 8,
  },
  paceBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  paceBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.6,
  },
  progressTrack: {
    height: 6,
    backgroundColor: Colors.background,
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: 6,
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
  },
  rowMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  rowMetaText: {
    color: Colors.textSecondary,
    fontSize: 12,
  },
  // ── modal sheet ──
  sheetBackdrop: {
    flex: 1,
    backgroundColor: Colors.overlay,
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: Colors.surfaceElevated,
    borderTopLeftRadius: 14,
    borderTopRightRadius: 14,
    paddingHorizontal: 18,
    paddingTop: 8,
    paddingBottom: 28,
    maxHeight: '88%',
  },
  sheetHandle: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    backgroundColor: Colors.mud,
    borderRadius: 2,
    marginBottom: 12,
  },
  sheetTitle: {
    color: Colors.textPrimary,
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 14,
  },
  fieldLabel: {
    color: Colors.textMuted,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.8,
    marginTop: 14,
    marginBottom: 8,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chipColumn: {
    gap: 6,
  },
  pickerChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: Colors.surface,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: Colors.mud,
  },
  pickerChipActive: {
    backgroundColor: Colors.moss,
    borderColor: Colors.moss,
  },
  pickerChipText: {
    color: Colors.textSecondary,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.4,
  },
  pickerChipTextActive: {
    color: Colors.textOnAccent,
  },
  metricRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: Colors.surface,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: Colors.mud,
  },
  metricRowActive: {
    backgroundColor: Colors.moss,
    borderColor: Colors.moss,
  },
  metricRowText: { flex: 1, marginRight: 10 },
  metricLabel: {
    color: Colors.textPrimary,
    fontSize: 13,
    fontWeight: '700',
  },
  metricLabelActive: {
    color: Colors.textOnAccent,
  },
  metricHint: {
    color: Colors.textMuted,
    fontSize: 11,
    marginTop: 2,
  },
  metricUnit: {
    color: Colors.textSecondary,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  metricUnitActive: {
    color: Colors.textOnAccent,
  },
  targetRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: Colors.mud,
    paddingHorizontal: 12,
  },
  targetInput: {
    flex: 1,
    color: Colors.textPrimary,
    fontSize: 16,
    fontWeight: '700',
    paddingVertical: 10,
  },
  targetUnit: {
    color: Colors.textMuted,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.5,
    marginLeft: 8,
  },
  labelInput: {
    color: Colors.textPrimary,
    fontSize: 14,
    backgroundColor: Colors.surface,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: Colors.mud,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  sheetActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
    marginTop: 22,
  },
  cancelBtn: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: Colors.surface,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: Colors.mud,
  },
  cancelBtnText: {
    color: Colors.textSecondary,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  saveBtn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: Colors.mdGold,
    borderRadius: 6,
  },
  saveBtnText: {
    color: Colors.mdBlack,
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.6,
  },
});

// Suppress unused-import lint for WaypointMode (keeps the type available
// for future per-mode UI affordances without re-importing).
export type _GoalsScreenWaypointMode = WaypointMode;
