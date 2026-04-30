/**
 * TrackListScreen — List of saved tracks.
 *
 * Launched from any mode's map stack. If route param `mode` is present,
 * the list filters to that mode; otherwise it shows all tracks across
 * every mode. Ordering is reverse-chronological (newest first), which
 * matches the order tracks are prepended to `allTracks` in the
 * recorder context.
 *
 * Row tap → TrackDetailScreen. Row swipe / long-press → delete confirm
 * (swipe gesture deferred; long-press is good enough for V2.3).
 *
 * Empty-state copy is honest: "No tracks yet" is the correct message
 * before the first recording and gently routes the user into the
 * recorder if they want one.
 *
 * Added 2026-04-24 per V2_3_FEATURE_EXPANSION_PLAN §3 / Phase A.3.
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  SafeAreaView,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { useTrackRecorder } from '../context/TrackRecorderContext';
import { RecordedTrack, formatDistance, formatDuration } from '../types/track';
import { WaypointMode } from '../types/userWaypoint';
import Colors from '../theme/colors';

type TrackListRoute = RouteProp<
  { TrackList: { mode?: WaypointMode } },
  'TrackList'
>;

const MODE_LABEL: Record<WaypointMode, string> = {
  hunt: 'Hunt',
  fish: 'Fish',
  camp: 'Camp',
  hike: 'Hike',
};

export default function TrackListScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<TrackListRoute>();
  const mode = route.params?.mode;
  const { allTracks, tracksForMode, hydrated, deleteTrack } = useTrackRecorder();

  const rows: RecordedTrack[] = mode ? tracksForMode(mode) : allTracks;

  const confirmDelete = (t: RecordedTrack) => {
    Alert.alert(
      'Delete track?',
      `"${t.name}" — ${formatDistance(t.distanceM)}. This cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            deleteTrack(t.id);
          },
        },
      ],
    );
  };

  if (!hydrated) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.empty}>
          <Text style={styles.emptyTitle}>Loading tracks…</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.headerRow}>
        <Text style={styles.header}>
          {mode ? `${MODE_LABEL[mode]} Tracks` : 'All Tracks'}
        </Text>
        <TouchableOpacity
          style={styles.recordBtn}
          onPress={() =>
            navigation.navigate('TrackRecorder', { mode: mode ?? 'hunt' })
          }
        >
          <Text style={styles.recordBtnText}>● Record</Text>
        </TouchableOpacity>
      </View>

      {rows.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyTitle}>No tracks yet</Text>
          <Text style={styles.emptyBody}>
            Record your first track to see it here. Tracks persist
            on-device and can be replayed on the map or exported as GPX.
          </Text>
          <TouchableOpacity
            style={styles.emptyCta}
            onPress={() =>
              navigation.navigate('TrackRecorder', { mode: mode ?? 'hunt' })
            }
          >
            <Text style={styles.emptyCtaText}>Record a track</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={rows}
          keyExtractor={(t) => t.id}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.row}
              onPress={() =>
                navigation.navigate('TrackDetail', { trackId: item.id })
              }
              onLongPress={() => confirmDelete(item)}
            >
              <View style={styles.rowMain}>
                <Text style={styles.rowTitle} numberOfLines={1}>
                  {item.name}
                </Text>
                <Text style={styles.rowMeta}>
                  {MODE_LABEL[item.mode]} •{' '}
                  {new Date(item.startedAt).toLocaleDateString()}
                </Text>
              </View>
              <View style={styles.rowStats}>
                <Text style={styles.rowStatPrimary}>
                  {formatDistance(item.distanceM)}
                </Text>
                <Text style={styles.rowStatSecondary}>
                  {formatDuration(item.durationSec)}
                </Text>
              </View>
            </TouchableOpacity>
          )}
          ItemSeparatorComponent={() => <View style={styles.sep} />}
          contentContainerStyle={styles.listContent}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },

  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: Colors.mud,
  },
  header: {
    color: Colors.textPrimary,
    fontSize: 18,
    fontWeight: '700',
  },
  recordBtn: {
    backgroundColor: Colors.mdGold,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
  },
  recordBtnText: { color: Colors.mdBlack, fontWeight: '700', fontSize: 13 },

  listContent: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 32 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
  },
  rowMain: { flex: 1, marginRight: 12 },
  rowTitle: {
    color: Colors.textPrimary,
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 3,
  },
  rowMeta: { color: Colors.textSecondary, fontSize: 12 },
  rowStats: { alignItems: 'flex-end' },
  rowStatPrimary: {
    color: Colors.mdGold,
    fontSize: 15,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  rowStatSecondary: {
    color: Colors.textMuted,
    fontSize: 12,
    marginTop: 2,
    fontVariant: ['tabular-nums'],
  },
  sep: { height: 1, backgroundColor: Colors.mud },

  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  emptyTitle: {
    color: Colors.textPrimary,
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 10,
  },
  emptyBody: {
    color: Colors.textSecondary,
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
    marginBottom: 20,
  },
  emptyCta: {
    backgroundColor: Colors.mdGold,
    paddingHorizontal: 22,
    paddingVertical: 12,
    borderRadius: 8,
  },
  emptyCtaText: { color: Colors.mdBlack, fontWeight: '700', fontSize: 14 },
});
