/**
 * JournalListScreen — Per-mode field-journal landing surface.
 *
 * Lists every JournalEntry for the active mode (Hunt / Fish / Camp /
 * Hike), sorted by entryDate descending. Tap a row to edit; long-press
 * to delete (confirmed). Top-right "+ NEW" button creates a fresh
 * entry pre-filled with today's date and the mode-default outcome.
 *
 * Mirrors WaypointListScreen architecturally — reads `mode` from route
 * params so each per-mode tab stack can register the same screen with
 * its own mode in Phase A.5e wiring.
 *
 * Added 2026-04-24 per V2_3_FEATURE_EXPANSION_PLAN §3 / Phase A.5.
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
import { useJournalEntries } from '../context/JournalEntryContext';
import {
  JournalEntry,
  JOURNAL_OUTCOME_META,
  resolveOutcomeColor,
  resolveOutcomeLetterCode,
} from '../types/journalEntry';
import type { WaypointMode } from '../types/userWaypoint';
import { entriesWithTag } from '../services/journalTagService';

type JournalListParams = {
  JournalList: { mode: WaypointMode; tagFilter?: string };
};

function modeHeading(mode: WaypointMode): string {
  switch (mode) {
    case 'hunt': return 'HUNT JOURNAL';
    case 'fish': return 'FISH JOURNAL';
    case 'camp': return 'CAMP JOURNAL';
    case 'hike': return 'HIKE JOURNAL';
  }
}

function modeEmptyHint(mode: WaypointMode): string {
  switch (mode) {
    case 'hunt':
      return 'Log what you saw, what you took, what worked, what didn\'t. The patterns are easier to see when they\'re written down.';
    case 'fish':
      return 'Log what you caught, what you tried, what the tide and bite were doing. Patterns surface across seasons.';
    case 'camp':
      return 'Log how the trip went — what you packed, what you forgot, what to do differently next time.';
    case 'hike':
      return 'Log what you saw, where you turned back, conditions on the trail. Helps the next person you take out.';
  }
}

/**
 * Render a YYYY-MM-DD string as a short human label like "Apr 24".
 * No locale-relative formatting (no "yesterday") — the entry date is
 * a fact about the trip, not a fact about when the user is reading it.
 */
function formatEntryDate(iso: string): string {
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

export default function JournalListScreen() {
  const route = useRoute<RouteProp<JournalListParams, 'JournalList'>>();
  const navigation = useNavigation<any>();
  const { mode, tagFilter } = route.params;
  const { entriesForMode, deleteEntry, hydrated } = useJournalEntries();

  const data = useMemo(() => {
    const base = entriesForMode(mode);
    const filtered = tagFilter ? entriesWithTag(base, tagFilter) : base;
    return [...filtered].sort((a, b) => {
      if (a.entryDate !== b.entryDate) {
        return a.entryDate < b.entryDate ? 1 : -1;
      }
      return a.createdAt < b.createdAt ? 1 : -1;
    });
  }, [mode, entriesForMode, tagFilter]);

  const onClearTagFilter = useCallback(() => {
    navigation.setParams({ tagFilter: undefined });
  }, [navigation]);

  const onNew = useCallback(() => {
    navigation.navigate('JournalEdit', { mode });
  }, [mode, navigation]);

  const onOpen = useCallback(
    (entry: JournalEntry) => {
      navigation.navigate('JournalEdit', { mode, entryId: entry.id });
    },
    [mode, navigation],
  );

  const onLongPressDelete = useCallback(
    (entry: JournalEntry) => {
      Alert.alert(
        'Delete entry?',
        `"${entry.title || 'Untitled entry'}" will be permanently removed from this device.`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Delete',
            style: 'destructive',
            onPress: () => void deleteEntry(entry.id),
          },
        ],
      );
    },
    [deleteEntry],
  );

  const renderItem = useCallback(
    ({ item }: { item: JournalEntry }) => {
      const color = resolveOutcomeColor(item.outcome);
      const code = resolveOutcomeLetterCode(item.outcome);
      const meta = JOURNAL_OUTCOME_META[item.outcome];
      const outcomeLabel = meta ? meta.label : item.outcome;
      const title = item.title.trim() || 'Untitled entry';
      return (
        <Pressable
          onPress={() => onOpen(item)}
          onLongPress={() => onLongPressDelete(item)}
          style={styles.row}
          android_ripple={{ color: Colors.surfaceElevated }}
        >
          <View style={[styles.badge, { backgroundColor: color }]}>
            <Text style={styles.badgeText}>{code}</Text>
          </View>
          <View style={styles.body}>
            <View style={styles.titleRow}>
              <Text style={styles.title} numberOfLines={1}>{title}</Text>
              <Text style={styles.date}>{formatEntryDate(item.entryDate)}</Text>
            </View>
            <Text style={styles.meta} numberOfLines={1}>
              {outcomeLabel}
              {item.locationLabel ? `  ·  ${item.locationLabel}` : ''}
              {item.photoUris.length > 0
                ? `  ·  ${item.photoUris.length} photo${item.photoUris.length === 1 ? '' : 's'}`
                : ''}
            </Text>
            {item.body.trim().length > 0 && (
              <Text style={styles.bodyPreview} numberOfLines={2}>
                {item.body.trim()}
              </Text>
            )}
            {item.tags.length > 0 && (
              <View style={styles.tagRow}>
                {item.tags.slice(0, 4).map((tag) => (
                  <View key={tag} style={styles.tagChip}>
                    <Text style={styles.tagChipText}>{tag}</Text>
                  </View>
                ))}
                {item.tags.length > 4 && (
                  <Text style={styles.tagOverflow}>
                    +{item.tags.length - 4}
                  </Text>
                )}
              </View>
            )}
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

      {tagFilter ? (
        <View style={styles.filterBar}>
          <Text style={styles.filterBarLabel}>Tag:</Text>
          <View style={styles.filterChip}>
            <Text style={styles.filterChipText}>{tagFilter}</Text>
            <Pressable onPress={onClearTagFilter} hitSlop={8} style={styles.filterChipClear}>
              <Text style={styles.filterChipClearText}>{'\u2715'}</Text>
            </Pressable>
          </View>
          <Text style={styles.filterBarCount}>
            {data.length} {data.length === 1 ? 'entry' : 'entries'}
          </Text>
        </View>
      ) : null}

      {!hydrated ? (
        <View style={styles.emptyWrap}>
          <Text style={styles.emptyHint}>Loading journal…</Text>
        </View>
      ) : data.length === 0 ? (
        <View style={styles.emptyWrap}>
          <Text style={styles.emptyTitle}>
            {tagFilter ? `No entries tagged "${tagFilter}"` : 'No entries yet'}
          </Text>
          <Text style={styles.emptyHint}>
            {tagFilter
              ? `In this mode, no entries carry that tag. Clear the filter to see the full ${modeHeading(mode).toLowerCase()}.`
              : modeEmptyHint(mode)}
          </Text>
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
  filterBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingVertical: 10,
    backgroundColor: Colors.surfaceElevated,
    borderBottomWidth: 1,
    borderColor: Colors.mud,
    gap: 8,
  },
  filterBarLabel: {
    color: Colors.textMuted,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.6,
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: 10,
    paddingRight: 6,
    paddingVertical: 4,
    backgroundColor: Colors.background,
    borderWidth: 1,
    borderColor: Colors.moss,
    borderRadius: 12,
    gap: 6,
  },
  filterChipText: {
    color: Colors.textPrimary,
    fontSize: 12,
    fontWeight: '700',
  },
  filterChipClear: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: Colors.mud,
    justifyContent: 'center',
    alignItems: 'center',
  },
  filterChipClearText: {
    color: Colors.textPrimary,
    fontSize: 10,
    fontWeight: '800',
    lineHeight: 12,
  },
  filterBarCount: {
    marginLeft: 'auto',
    color: Colors.textSecondary,
    fontSize: 11,
    fontWeight: '700',
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
  },
  listBody: {
    paddingVertical: 6,
    paddingBottom: 40,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: Colors.surface,
  },
  separator: {
    height: 1,
    backgroundColor: Colors.mud,
    marginHorizontal: 16,
  },
  badge: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    marginTop: 2,
  },
  badgeText: {
    color: Colors.textOnAccent,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.6,
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
  meta: {
    color: Colors.textSecondary,
    fontSize: 12,
    marginTop: 2,
  },
  bodyPreview: {
    color: Colors.textMuted,
    fontSize: 12,
    lineHeight: 17,
    marginTop: 4,
  },
  tagRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 6,
    gap: 6,
  },
  tagChip: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    backgroundColor: Colors.background,
    borderWidth: 1,
    borderColor: Colors.mud,
  },
  tagChipText: {
    color: Colors.textSecondary,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.4,
  },
  tagOverflow: {
    color: Colors.textMuted,
    fontSize: 11,
    fontWeight: '700',
    alignSelf: 'center',
  },
});
