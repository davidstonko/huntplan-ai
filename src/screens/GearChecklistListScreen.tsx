/**
 * GearChecklistListScreen — Per-mode landing surface for gear checklists.
 *
 * Lists every GearChecklist for the active mode, sorted by tripDate desc
 * with "no-tripDate" rows falling to the bottom by updatedAt. Tap a row
 * to edit; long-press to delete. Top-right "+ NEW" creates a fresh
 * checklist seeded from BASE_GEAR_LIBRARY for the mode.
 *
 * Phase A.6 — added 2026-04-24 per V2_3_FEATURE_EXPANSION_PLAN.
 */

import React, { useCallback, useMemo } from 'react';
import {
  Alert,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import Colors from '../theme/colors';
import { useGearChecklists } from '../context/GearChecklistContext';
import {
  GearChecklist,
  countItems,
} from '../types/gearChecklist';
import type { WaypointMode } from '../types/userWaypoint';

type GearChecklistListParams = {
  GearChecklistList: { mode: WaypointMode };
};

function modeHeading(mode: WaypointMode): string {
  switch (mode) {
    case 'hunt': return 'HUNT GEAR CHECKLISTS';
    case 'fish': return 'FISH GEAR CHECKLISTS';
    case 'camp': return 'CAMP GEAR CHECKLISTS';
    case 'hike': return 'HIKE GEAR CHECKLISTS';
  }
}

function modeEmptyHint(mode: WaypointMode): string {
  switch (mode) {
    case 'hunt':
      return 'A short, durable pack list. Build one for opening day, one for the rifle weekend, one for late season — they\'ll be ready next year too.';
    case 'fish':
      return 'A short pack list per trip type. Striper run, summer crab, ice-out trout. Build it once, carry it forward.';
    case 'camp':
      return 'A pack list per trip style. One for state-park weekends, one for AT shelter nights, one for the truck-camp loadout.';
    case 'hike':
      return 'A pack list per trip distance. Day hike, overnight, loop-trail kit. Quick to scan as you load the pack.';
  }
}

function formatTripDate(iso?: string): string | null {
  if (!iso) return null;
  const parts = iso.split('-');
  if (parts.length !== 3) return iso;
  const d = new Date(
    parseInt(parts[0], 10),
    parseInt(parts[1], 10) - 1,
    parseInt(parts[2], 10),
  );
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

export default function GearChecklistListScreen() {
  const route = useRoute<RouteProp<GearChecklistListParams, 'GearChecklistList'>>();
  const navigation = useNavigation<any>();
  const { mode } = route.params;
  const { checklistsForMode, deleteChecklist, hydrated } = useGearChecklists();

  const data = useMemo(() => checklistsForMode(mode), [mode, checklistsForMode]);

  const onNew = useCallback(() => {
    navigation.navigate('GearChecklistEdit', { mode });
  }, [mode, navigation]);

  const onOpen = useCallback(
    (list: GearChecklist) => {
      navigation.navigate('GearChecklistEdit', { mode, checklistId: list.id });
    },
    [mode, navigation],
  );

  const onLongPressDelete = useCallback(
    (list: GearChecklist) => {
      Alert.alert(
        'Delete checklist?',
        `"${list.name}" will be permanently removed from this device.`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Delete',
            style: 'destructive',
            onPress: () => void deleteChecklist(list.id),
          },
        ],
      );
    },
    [deleteChecklist],
  );

  const renderItem = useCallback(
    ({ item }: { item: GearChecklist }) => {
      const counts = countItems(item.items);
      const pct = counts.total === 0 ? 0 : counts.checked / counts.total;
      const tripLabel = formatTripDate(item.tripDate);
      const allChecked = counts.total > 0 && counts.checked === counts.total;
      return (
        <Pressable
          onPress={() => onOpen(item)}
          onLongPress={() => onLongPressDelete(item)}
          style={styles.row}
          android_ripple={{ color: Colors.surfaceElevated }}
        >
          <View
            style={[
              styles.badge,
              { backgroundColor: allChecked ? Colors.moss : Colors.mdGold },
            ]}
          >
            <Text
              style={[
                styles.badgeText,
                { color: allChecked ? Colors.background : Colors.mdBlack },
              ]}
            >
              {counts.checked}/{counts.total}
            </Text>
          </View>
          <View style={styles.body}>
            <View style={styles.titleRow}>
              <Text style={styles.title} numberOfLines={1}>{item.name}</Text>
              {tripLabel && <Text style={styles.date}>{tripLabel}</Text>}
            </View>
            <View style={styles.progressTrack}>
              <View
                style={[
                  styles.progressFill,
                  {
                    width: `${Math.round(pct * 100)}%`,
                    backgroundColor: allChecked ? Colors.moss : Colors.amber,
                  },
                ]}
              />
            </View>
            <Text style={styles.meta}>
              {counts.total === 0
                ? 'Empty checklist'
                : `${counts.checked} of ${counts.total} packed`}
            </Text>
          </View>
        </Pressable>
      );
    },
    [onOpen, onLongPressDelete],
  );

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <Text style={styles.heading}>{modeHeading(mode)}</Text>
        <Pressable onPress={onNew} hitSlop={12} style={styles.newBtn}>
          <Text style={styles.newBtnText}>+ NEW</Text>
        </Pressable>
      </View>

      {!hydrated ? (
        <View style={styles.emptyWrap}>
          <Text style={styles.emptyHint}>Loading checklists…</Text>
        </View>
      ) : data.length === 0 ? (
        <View style={styles.emptyWrap}>
          <Text style={styles.emptyTitle}>No checklists yet</Text>
          <Text style={styles.emptyHint}>{modeEmptyHint(mode)}</Text>
          <Pressable onPress={onNew} style={styles.emptyCta}>
            <Text style={styles.emptyCtaText}>+ NEW CHECKLIST</Text>
          </Pressable>
        </View>
      ) : (
        <FlatList
          data={data}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.listBody}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
        />
      )}
    </View>
  );
}

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
  heading: {
    color: Colors.textPrimary,
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 1.1,
  },
  newBtn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
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
    marginBottom: 8,
  },
  emptyHint: {
    color: Colors.textMuted,
    fontSize: 13,
    lineHeight: 19,
    textAlign: 'center',
    marginBottom: 22,
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
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: Colors.surface,
  },
  separator: {
    height: 1,
    backgroundColor: Colors.mud,
    marginHorizontal: 16,
  },
  badge: {
    minWidth: 50,
    height: 36,
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    marginTop: 2,
    paddingHorizontal: 8,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.4,
  },
  body: {
    flex: 1,
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: {
    color: Colors.textPrimary,
    fontSize: 15,
    fontWeight: '700',
    flex: 1,
    marginRight: 8,
  },
  date: {
    color: Colors.textMuted,
    fontSize: 11,
    fontWeight: '700',
  },
  progressTrack: {
    height: 4,
    backgroundColor: Colors.background,
    borderRadius: 2,
    marginTop: 6,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 2,
  },
  meta: {
    color: Colors.textSecondary,
    fontSize: 12,
    marginTop: 4,
  },
});
