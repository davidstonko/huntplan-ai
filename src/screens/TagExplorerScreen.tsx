/**
 * TagExplorerScreen — frequency-ranked tag cloud built from the field
 * journal. Tap a tag to drop into the journal list filtered to entries
 * carrying that tag in the active mode.
 *
 * Why: V2.3 Phase A.5 added free-form tags to JournalEntry, but the
 * tags lived buried inside individual entries. Without a discoverable
 * surface a user couldn't easily ask "show me everything I tagged
 * 'cedar'". This screen turns tags into a navigation primitive.
 *
 * Pulls from `allEntries` (cross-mode) and uses `tagFrequency` from
 * journalTagService — the same pure aggregator that the test suite
 * locks. Mode filter chips (All / Hunt / Fish / Camp / Hike) narrow
 * the displayed counts. Tapping a tag pushes JournalList with
 * `{ mode, tagFilter }` route params.
 *
 * Phase A.10 — added 2026-04-24 per V2_3_FEATURE_EXPANSION_PLAN.
 */

import React, { useMemo, useState } from 'react';
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  FlatList,
} from 'react-native';
import {
  useNavigation,
  useRoute,
  RouteProp,
} from '@react-navigation/native';
import Colors from '../theme/colors';
import { useJournalEntries } from '../context/JournalEntryContext';
import {
  tagFrequency,
  TagFrequencyEntry,
} from '../services/journalTagService';
import type { WaypointMode } from '../types/userWaypoint';

type Params = {
  TagExplorer: { mode?: WaypointMode };
};

const MODE_FILTERS: { key: WaypointMode | 'all'; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'hunt', label: 'Hunt' },
  { key: 'fish', label: 'Fish' },
  { key: 'camp', label: 'Camp' },
  { key: 'hike', label: 'Hike' },
];

function modesCaption(modes: WaypointMode[]): string {
  if (modes.length === 0) return '';
  if (modes.length === 1) {
    return modes[0][0].toUpperCase() + modes[0].slice(1);
  }
  return modes
    .map((m) => m[0].toUpperCase() + m.slice(1))
    .join(' · ');
}

function relativeAgo(iso: string): string {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return '';
  const now = Date.now();
  const days = Math.floor((now - then) / (1000 * 60 * 60 * 24));
  if (days <= 0) return 'today';
  if (days === 1) return '1 day ago';
  if (days < 30) return `${days} days ago`;
  const months = Math.floor(days / 30);
  if (months === 1) return '1 month ago';
  if (months < 12) return `${months} months ago`;
  const years = Math.floor(days / 365);
  return years === 1 ? '1 year ago' : `${years} years ago`;
}

export default function TagExplorerScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<RouteProp<Params, 'TagExplorer'>>();
  const initialMode: WaypointMode = route.params?.mode ?? 'hunt';

  const { allEntries, hydrated } = useJournalEntries();

  const [scopeMode, setScopeMode] = useState<WaypointMode | undefined>(
    undefined,
  );

  const tags = useMemo<TagFrequencyEntry[]>(
    () =>
      tagFrequency(allEntries, {
        mode: scopeMode,
        limit: 250,
      }),
    [allEntries, scopeMode],
  );

  const totalEntries = useMemo(() => {
    if (!scopeMode) return allEntries.length;
    return allEntries.filter((e) => e.mode === scopeMode).length;
  }, [allEntries, scopeMode]);

  const onTagPress = (entry: TagFrequencyEntry) => {
    // If user has no mode filter active, prefer the originating mode
    // (the one they were in when they opened this screen) so the
    // per-mode JournalList is non-empty.
    const navMode = scopeMode ?? initialMode;
    navigation.navigate('JournalList', {
      mode: navMode,
      tagFilter: entry.tag,
    });
  };

  const renderItem = ({ item }: { item: TagFrequencyEntry }) => (
    <TouchableOpacity
      style={styles.row}
      onPress={() => onTagPress(item)}
      activeOpacity={0.85}
    >
      <View style={styles.tagPill}>
        <Text style={styles.tagPillText}>{item.tag}</Text>
      </View>
      <View style={styles.rowBody}>
        <Text style={styles.rowMeta}>
          {item.count} {item.count === 1 ? 'entry' : 'entries'}
          {' · '}
          {modesCaption(item.modes)}
        </Text>
        <Text style={styles.rowSub}>last used {relativeAgo(item.lastUsedAt)}</Text>
      </View>
      <Text style={styles.chev}>{'\u203A'}</Text>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <View style={styles.modeRow}>
        {MODE_FILTERS.map((f) => {
          const active =
            (f.key === 'all' && !scopeMode) || scopeMode === f.key;
          return (
            <TouchableOpacity
              key={f.key}
              style={[styles.modeChip, active && styles.modeChipActive]}
              onPress={() =>
                setScopeMode(
                  f.key === 'all' ? undefined : (f.key as WaypointMode),
                )
              }
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

      <Text style={styles.caption}>
        {!hydrated
          ? 'Loading tags…'
          : tags.length === 0
            ? totalEntries === 0
              ? 'No journal entries in this filter yet.'
              : 'No tags applied yet — add tags when editing journal entries.'
            : `${tags.length} tag${tags.length === 1 ? '' : 's'} across ${totalEntries} ${totalEntries === 1 ? 'entry' : 'entries'} — most-used first.`}
      </Text>

      <FlatList
        data={tags}
        keyExtractor={(item) => item.key}
        renderItem={renderItem}
        contentContainerStyle={
          tags.length === 0 ? styles.listEmpty : styles.listContent
        }
        ItemSeparatorComponent={() => <View style={styles.sep} />}
        ListEmptyComponent={
          hydrated ? (
            <View style={styles.emptyBox}>
              <Text style={styles.emptyTitle}>No tags yet.</Text>
              <Text style={styles.emptyHint}>
                Tag your journal entries with words you'll search for
                later — species, locations, conditions, gear. They
                show up here grouped and ranked, so you can ask the
                journal questions like "everything tagged 'cedar'" in
                one tap.
              </Text>
            </View>
          ) : null
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  modeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 6,
    gap: 6,
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
  caption: {
    color: Colors.textMuted,
    fontSize: 11,
    paddingHorizontal: 16,
    paddingBottom: 8,
    paddingTop: 4,
  },
  listContent: {
    paddingBottom: 32,
  },
  listEmpty: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingBottom: 24,
    justifyContent: 'center',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: Colors.surface,
  },
  sep: {
    height: 1,
    backgroundColor: Colors.mud,
    marginHorizontal: 16,
  },
  tagPill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: Colors.background,
    borderWidth: 1,
    borderColor: Colors.moss,
    borderRadius: 14,
    marginRight: 12,
    maxWidth: '50%',
  },
  tagPillText: {
    color: Colors.textPrimary,
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  rowBody: {
    flex: 1,
  },
  rowMeta: {
    color: Colors.textPrimary,
    fontSize: 13,
    fontWeight: '700',
  },
  rowSub: {
    color: Colors.textMuted,
    fontSize: 11,
    marginTop: 2,
  },
  chev: {
    color: Colors.textSecondary,
    fontSize: 18,
    marginLeft: 6,
  },
  emptyBox: {
    paddingHorizontal: 16,
  },
  emptyTitle: {
    color: Colors.textPrimary,
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 6,
    textAlign: 'center',
  },
  emptyHint: {
    color: Colors.textMuted,
    fontSize: 12,
    lineHeight: 17,
    textAlign: 'center',
  },
});
