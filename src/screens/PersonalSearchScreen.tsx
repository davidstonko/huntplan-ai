/**
 * PersonalSearchScreen — unified "find anything" search across the
 * personal layer (waypoints, tracks, markups, journal entries, gear
 * checklists).
 *
 * One search bar at the top → ranked, grouped results below. Tapping a
 * result navigates to the appropriate edit screen, pre-loaded with the
 * row id. Empty query mode shows the most-recently-touched 50 rows so
 * the screen is useful even before the user types.
 *
 * Phase A.8 — added 2026-04-24 per V2_3_FEATURE_EXPANSION_PLAN.
 */

import React, { useMemo, useState } from 'react';
import {
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  FlatList,
  Keyboard,
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
  searchPersonalLayer,
  PersonalSearchInputs,
  PersonalSearchResult,
  PersonalSearchKind,
} from '../services/personalSearchService';
import type { WaypointMode } from '../types/userWaypoint';

type Params = {
  PersonalSearch: { mode?: WaypointMode };
};

type KindFilter = PersonalSearchKind | 'all';

const KIND_FILTERS: { key: KindFilter; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'waypoint', label: 'WP' },
  { key: 'track', label: 'TR' },
  { key: 'markup', label: 'MK' },
  { key: 'journal', label: 'JR' },
  { key: 'checklist', label: 'GC' },
];

function navigateToResult(
  navigation: any,
  result: PersonalSearchResult,
): void {
  switch (result.kind) {
    case 'waypoint':
      navigation.navigate('WaypointEdit', {
        mode: result.mode,
        waypointId: result.id,
      });
      break;
    case 'track':
      navigation.navigate('TrackDetail', { trackId: result.id });
      break;
    case 'markup':
      navigation.navigate('MarkupEdit', {
        mode: result.mode,
        markupId: result.id,
      });
      break;
    case 'journal':
      navigation.navigate('JournalEdit', {
        mode: result.mode,
        entryId: result.id,
      });
      break;
    case 'checklist':
      navigation.navigate('GearChecklistEdit', {
        mode: result.mode,
        checklistId: result.id,
      });
      break;
  }
}

function chipColorForKind(kind: PersonalSearchKind): string {
  switch (kind) {
    case 'waypoint':
      return Colors.moss;
    case 'track':
      return '#0277BD';
    case 'markup':
      return Colors.amber;
    case 'journal':
      return Colors.tan;
    case 'checklist':
      return '#E67E22';
  }
}

export default function PersonalSearchScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<RouteProp<Params, 'PersonalSearch'>>();
  const initialMode = route.params?.mode;

  const [query, setQuery] = useState('');
  const [kindFilter, setKindFilter] = useState<KindFilter>('all');
  const [scopeMode, setScopeMode] = useState<WaypointMode | undefined>(
    initialMode,
  );

  const { allWaypoints } = useUserWaypoints();
  const { allTracks } = useTrackRecorder();
  const { allMarkups } = useUserMarkups();
  const { allEntries } = useJournalEntries();
  const { allChecklists } = useGearChecklists();

  const inputs = useMemo<PersonalSearchInputs>(
    () => ({
      waypoints: allWaypoints,
      tracks: allTracks,
      markups: allMarkups,
      journalEntries: allEntries,
      checklists: allChecklists,
    }),
    [allWaypoints, allTracks, allMarkups, allEntries, allChecklists],
  );

  const results = useMemo(
    () =>
      searchPersonalLayer(query, inputs, {
        mode: scopeMode,
        kinds: kindFilter === 'all' ? undefined : [kindFilter],
        limit: 50,
      }),
    [query, inputs, scopeMode, kindFilter],
  );

  const totalCount =
    allWaypoints.length +
    allTracks.length +
    allMarkups.length +
    allEntries.length +
    allChecklists.length;

  const renderItem = ({ item }: { item: PersonalSearchResult }) => (
    <TouchableOpacity
      style={styles.resultRow}
      onPress={() => {
        Keyboard.dismiss();
        navigateToResult(navigation, item);
      }}
    >
      <View
        style={[
          styles.codeChip,
          {
            borderColor: chipColorForKind(item.kind),
            backgroundColor: chipColorForKind(item.kind) + '22',
          },
        ]}
      >
        <Text
          style={[
            styles.codeChipText,
            { color: chipColorForKind(item.kind) },
          ]}
        >
          {item.code}
        </Text>
      </View>
      <View style={styles.resultBody}>
        <Text style={styles.resultLabel} numberOfLines={1}>
          {item.label}
        </Text>
        <Text style={styles.resultDetail} numberOfLines={1}>
          {item.detail}
        </Text>
      </View>
      <Text style={styles.resultChev}>{'\u203A'}</Text>
    </TouchableOpacity>
  );

  const headerCaption = query.trim().length === 0
    ? `${totalCount} item${totalCount === 1 ? '' : 's'} in your personal layer — sorted by recency.`
    : `${results.length} match${results.length === 1 ? '' : 'es'} for "${query.trim()}".`;

  return (
    <View style={styles.container}>
      <View style={styles.searchBox}>
        <TextInput
          style={styles.input}
          placeholder="Search waypoints, tracks, journals…"
          placeholderTextColor={Colors.textMuted}
          value={query}
          onChangeText={setQuery}
          autoCapitalize="none"
          autoCorrect={false}
          returnKeyType="search"
        />
        {query.length > 0 ? (
          <TouchableOpacity
            style={styles.clearBtn}
            onPress={() => setQuery('')}
          >
            <Text style={styles.clearBtnText}>Clear</Text>
          </TouchableOpacity>
        ) : null}
      </View>

      <View style={styles.filterRow}>
        {KIND_FILTERS.map((f) => {
          const active = kindFilter === f.key;
          return (
            <TouchableOpacity
              key={f.key}
              style={[styles.filterChip, active && styles.filterChipActive]}
              onPress={() => setKindFilter(f.key)}
            >
              <Text
                style={[
                  styles.filterChipText,
                  active && styles.filterChipTextActive,
                ]}
              >
                {f.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <View style={styles.modeRow}>
        <Text style={styles.modeRowLabel}>Mode:</Text>
        {(['all', 'hunt', 'fish', 'camp', 'hike'] as const).map((m) => {
          const active =
            (m === 'all' && !scopeMode) || scopeMode === m;
          return (
            <TouchableOpacity
              key={m}
              style={[styles.modeChip, active && styles.modeChipActive]}
              onPress={() =>
                setScopeMode(m === 'all' ? undefined : (m as WaypointMode))
              }
            >
              <Text
                style={[
                  styles.modeChipText,
                  active && styles.modeChipTextActive,
                ]}
              >
                {m === 'all' ? 'All' : m[0].toUpperCase() + m.slice(1)}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <Text style={styles.caption}>{headerCaption}</Text>

      <FlatList
        data={results}
        keyExtractor={(item) => `${item.kind}:${item.id}`}
        renderItem={renderItem}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={
          results.length === 0
            ? styles.listContentEmpty
            : styles.listContent
        }
        ListEmptyComponent={
          <View style={styles.emptyBox}>
            <Text style={styles.emptyTitle}>No matches.</Text>
            <Text style={styles.emptyHint}>
              {query.trim().length === 0
                ? 'Drop a waypoint or record a track to start populating your personal layer.'
                : 'Try a shorter query or broaden the kind/mode filters above.'}
            </Text>
          </View>
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
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
    gap: 8,
  },
  input: {
    flex: 1,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.mud,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    color: Colors.textPrimary,
  },
  clearBtn: {
    paddingVertical: 8,
    paddingHorizontal: 10,
  },
  clearBtnText: {
    color: Colors.textSecondary,
    fontSize: 13,
    fontWeight: '600',
  },
  filterRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingBottom: 6,
    gap: 6,
    flexWrap: 'wrap',
  },
  filterChip: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.mud,
    backgroundColor: Colors.surface,
  },
  filterChipActive: {
    backgroundColor: Colors.moss,
    borderColor: Colors.moss,
  },
  filterChipText: {
    color: Colors.textSecondary,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.4,
  },
  filterChipTextActive: {
    color: Colors.background,
  },
  modeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 8,
    gap: 6,
    flexWrap: 'wrap',
  },
  modeRowLabel: {
    color: Colors.textMuted,
    fontSize: 12,
    marginRight: 4,
  },
  modeChip: {
    paddingVertical: 5,
    paddingHorizontal: 9,
    borderRadius: 12,
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
    fontSize: 11,
    fontWeight: '700',
  },
  modeChipTextActive: {
    color: Colors.background,
  },
  caption: {
    color: Colors.textMuted,
    fontSize: 11,
    paddingHorizontal: 16,
    paddingBottom: 6,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 24,
  },
  listContentEmpty: {
    flexGrow: 1,
    paddingHorizontal: 16,
    paddingBottom: 24,
    justifyContent: 'center',
  },
  resultRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.mud,
    borderRadius: 10,
    padding: 12,
    marginBottom: 8,
  },
  codeChip: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    marginRight: 12,
  },
  codeChipText: {
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  resultBody: {
    flex: 1,
  },
  resultLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  resultDetail: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  resultChev: {
    fontSize: 18,
    color: Colors.textSecondary,
    marginLeft: 8,
  },
  emptyBox: {
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginBottom: 6,
  },
  emptyHint: {
    fontSize: 12,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 18,
  },
});
