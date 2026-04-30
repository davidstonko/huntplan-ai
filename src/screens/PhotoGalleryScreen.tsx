/**
 * PhotoGalleryScreen — flat grid of every photo the user has saved across
 * the personal layer (waypoints + journal entries). Filter by mode +
 * source kind. Tap a photo to navigate to the source row's edit screen
 * with that photo's index pre-flagged for context.
 *
 * Phase A.9 — added 2026-04-24 per V2_3_FEATURE_EXPANSION_PLAN.
 */

import React, { useMemo, useState } from 'react';
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  FlatList,
  Image,
  Dimensions,
} from 'react-native';
import {
  useNavigation,
  useRoute,
  RouteProp,
} from '@react-navigation/native';
import Colors from '../theme/colors';
import { useUserWaypoints } from '../context/UserWaypointContext';
import { useJournalEntries } from '../context/JournalEntryContext';
import {
  buildPhotoGallery,
  PhotoGalleryInputs,
  PhotoGalleryItem,
  PhotoSourceKind,
} from '../services/photoGalleryService';
import type { WaypointMode } from '../types/userWaypoint';

type Params = {
  PhotoGallery: { mode?: WaypointMode };
};

type KindFilter = PhotoSourceKind | 'all';

const KIND_FILTERS: { key: KindFilter; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'waypoint', label: 'WP' },
  { key: 'journal', label: 'JR' },
];

const NUM_COLUMNS = 3;
const GUTTER = 4;
const HORIZONTAL_PADDING = 12;

function navigateToSource(navigation: any, item: PhotoGalleryItem): void {
  switch (item.kind) {
    case 'waypoint':
      navigation.navigate('WaypointEdit', {
        mode: item.mode,
        waypointId: item.sourceId,
      });
      break;
    case 'journal':
      navigation.navigate('JournalEdit', {
        mode: item.mode,
        entryId: item.sourceId,
      });
      break;
  }
}

export default function PhotoGalleryScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<RouteProp<Params, 'PhotoGallery'>>();
  const initialMode = route.params?.mode;

  const [kindFilter, setKindFilter] = useState<KindFilter>('all');
  const [scopeMode, setScopeMode] = useState<WaypointMode | undefined>(
    initialMode,
  );

  const { allWaypoints } = useUserWaypoints();
  const { allEntries } = useJournalEntries();

  const inputs = useMemo<PhotoGalleryInputs>(
    () => ({
      waypoints: allWaypoints,
      journalEntries: allEntries,
    }),
    [allWaypoints, allEntries],
  );

  const items = useMemo(
    () =>
      buildPhotoGallery(inputs, {
        mode: scopeMode,
        kinds: kindFilter === 'all' ? undefined : [kindFilter],
        limit: 250,
      }),
    [inputs, scopeMode, kindFilter],
  );

  const screenWidth = Dimensions.get('window').width;
  const tileSize =
    (screenWidth - HORIZONTAL_PADDING * 2 - GUTTER * (NUM_COLUMNS - 1)) /
    NUM_COLUMNS;

  const renderTile = ({ item }: { item: PhotoGalleryItem }) => (
    <TouchableOpacity
      style={[styles.tile, { width: tileSize, height: tileSize }]}
      onPress={() => navigateToSource(navigation, item)}
      activeOpacity={0.85}
    >
      <Image
        source={{ uri: item.uri }}
        style={styles.tileImage}
        resizeMode="cover"
      />
      <View style={styles.tileChip}>
        <Text style={styles.tileChipText}>{item.code}</Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
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

      <Text style={styles.caption}>
        {items.length === 0
          ? 'No photos in this filter.'
          : `${items.length} photo${items.length === 1 ? '' : 's'} — newest first.`}
      </Text>

      <FlatList
        data={items}
        keyExtractor={(item) => item.id}
        renderItem={renderTile}
        numColumns={NUM_COLUMNS}
        columnWrapperStyle={items.length > 0 ? styles.columnWrapper : undefined}
        contentContainerStyle={
          items.length === 0
            ? styles.listContentEmpty
            : styles.listContent
        }
        ListEmptyComponent={
          <View style={styles.emptyBox}>
            <Text style={styles.emptyTitle}>No photos yet.</Text>
            <Text style={styles.emptyHint}>
              Add a photo to a waypoint or journal entry to populate the
              gallery. Trail-cam pulls, hero shots, parking-spot
              memory-aids — anything goes.
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
  filterRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingTop: 12,
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
    paddingBottom: 8,
  },
  listContent: {
    paddingHorizontal: HORIZONTAL_PADDING,
    paddingBottom: 24,
  },
  listContentEmpty: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingBottom: 24,
    justifyContent: 'center',
  },
  columnWrapper: {
    gap: GUTTER,
    marginBottom: GUTTER,
  },
  tile: {
    backgroundColor: Colors.surface,
    borderRadius: 6,
    overflow: 'hidden',
  },
  tileImage: {
    width: '100%',
    height: '100%',
  },
  tileChip: {
    position: 'absolute',
    top: 4,
    left: 4,
    backgroundColor: 'rgba(0,0,0,0.55)',
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 4,
  },
  tileChipText: {
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.5,
    color: '#fff',
  },
  emptyBox: {
    alignItems: 'center',
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginBottom: 8,
  },
  emptyHint: {
    fontSize: 12,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 18,
  },
});
