/**
 * WaypointListScreen — Personal-waypoint list, filtered by current mode.
 *
 * One-per-mode landing surface for the personal waypoint system. Renders
 * the user's saved pins as a scrollable list with:
 *   - Color-coded letter-code badge (matches the map pin symbol)
 *   - Category label + title
 *   - Relative-time created stamp
 *   - Short notes preview
 *   - Tap to edit / long-press to delete (confirmed)
 *
 * Navigation behavior:
 *   - `navigation.navigate('WaypointEdit', { mode, waypointId? })` opens
 *     the edit screen. Omit `waypointId` to create a new waypoint at an
 *     approximate mode-default location (user refines on the map later).
 *   - Map-driven create (long-press on map) is Phase A.1b — not wired
 *     in this screen yet. The "+ NEW" button here creates at a
 *     placeholder location the user must edit before save.
 *
 * This screen reads the mode from route params (`route.params.mode`).
 * Each of the four tab stacks (HuntTabs, FishTabs, CampTabs, HikeTabs)
 * will register this screen with its own mode in Phase A.1e.
 *
 * Added 2026-04-24 per V2_3_FEATURE_EXPANSION_PLAN §3 / Phase A.1.
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
import { useUserWaypoints } from '../context/UserWaypointContext';
import {
  UserWaypoint,
  WaypointMode,
  CATEGORY_META,
  resolveWaypointColor,
  resolveWaypointLetterCode,
} from '../types/userWaypoint';

// ── Route typing ─────────────────────────────────────────────────────
// The parent stack (per-mode, wired in Phase A.1e) registers this screen
// with a mode param; we read it here.
type WaypointListParams = {
  WaypointList: { mode: WaypointMode };
};

/**
 * Maryland geographic centroid used as a placeholder when the user taps
 * "+ NEW" from the list before choosing a map location. The edit screen
 * shows a "Location not set — pick on map" affordance rather than
 * silently lying that this is the user's real location.
 */
const MARYLAND_CENTROID = { lat: 38.9784, lng: -76.4922 };

/**
 * Convert an ISO timestamp to a short relative string: "2m", "3h",
 * "5d", "2026-04-01". Small helper so the list rows don't all look
 * like ISO strings.
 */
function relativeTime(iso: string): string {
  const then = new Date(iso).getTime();
  if (!Number.isFinite(then)) return '';
  const deltaSec = Math.max(0, (Date.now() - then) / 1000);
  if (deltaSec < 60) return 'just now';
  if (deltaSec < 60 * 60) return `${Math.floor(deltaSec / 60)}m ago`;
  if (deltaSec < 60 * 60 * 24) return `${Math.floor(deltaSec / 3600)}h ago`;
  if (deltaSec < 60 * 60 * 24 * 7) return `${Math.floor(deltaSec / 86400)}d ago`;
  return new Date(iso).toLocaleDateString();
}

function modeHeading(mode: WaypointMode): string {
  switch (mode) {
    case 'hunt': return 'HUNT WAYPOINTS';
    case 'fish': return 'FISH WAYPOINTS';
    case 'camp': return 'CAMP WAYPOINTS';
    case 'hike': return 'HIKE WAYPOINTS';
  }
}

function modeEmptyHint(mode: WaypointMode): string {
  switch (mode) {
    case 'hunt':
      return 'Save tree stands, trail cameras, rubs, and buck sightings here. Long-press the map to drop a pin, or tap NEW to create one.';
    case 'fish':
      return 'Save your honey holes, boat ramps, put-ins, and structure here. Long-press the map to drop a pin, or tap NEW to create one.';
    case 'camp':
      return 'Save tent sites, firepits, water sources, and bear boxes here. Long-press the map to drop a pin, or tap NEW to create one.';
    case 'hike':
      return 'Save trailheads, viewpoints, water sources, and hazards here. Long-press the map to drop a pin, or tap NEW to create one.';
  }
}

export default function WaypointListScreen() {
  const route = useRoute<RouteProp<WaypointListParams, 'WaypointList'>>();
  const navigation = useNavigation<any>();
  const { mode } = route.params;
  const { waypointsForMode, deleteWaypoint, hydrated } = useUserWaypoints();

  const data = useMemo(() => {
    // Most-recent-first. `waypointsForMode` returns an unsorted slice.
    return [...waypointsForMode(mode)].sort((a, b) =>
      b.updatedAt.localeCompare(a.updatedAt),
    );
  }, [mode, waypointsForMode]);

  const onNew = useCallback(() => {
    navigation.navigate('WaypointEdit', {
      mode,
      initialLat: MARYLAND_CENTROID.lat,
      initialLng: MARYLAND_CENTROID.lng,
    });
  }, [mode, navigation]);

  const onOpen = useCallback(
    (wp: UserWaypoint) => {
      navigation.navigate('WaypointEdit', { mode, waypointId: wp.id });
    },
    [mode, navigation],
  );

  const onLongPressDelete = useCallback(
    (wp: UserWaypoint) => {
      Alert.alert(
        'Delete waypoint?',
        `"${wp.title || CATEGORY_META[wp.category]?.label || 'Waypoint'}" will be permanently removed from this device.`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Delete',
            style: 'destructive',
            onPress: () => void deleteWaypoint(wp.id),
          },
        ],
      );
    },
    [deleteWaypoint],
  );

  const renderItem = useCallback(
    ({ item }: { item: UserWaypoint }) => {
      const color = resolveWaypointColor(item);
      const code = resolveWaypointLetterCode(item);
      const meta = CATEGORY_META[item.category];
      const categoryLabel = meta ? meta.label : item.category;
      const title = item.title.trim() || `Untitled ${categoryLabel}`;
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
              <Text style={styles.time}>{relativeTime(item.updatedAt)}</Text>
            </View>
            <Text style={styles.category} numberOfLines={1}>
              {categoryLabel}
              {item.photoUris.length > 0 ? `  ·  ${item.photoUris.length} photo${item.photoUris.length === 1 ? '' : 's'}` : ''}
            </Text>
            {item.notes.trim().length > 0 && (
              <Text style={styles.notes} numberOfLines={2}>
                {item.notes.trim()}
              </Text>
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

      {!hydrated ? (
        <View style={styles.emptyWrap}>
          <Text style={styles.emptyHint}>Loading waypoints…</Text>
        </View>
      ) : data.length === 0 ? (
        <View style={styles.emptyWrap}>
          <Text style={styles.emptyTitle}>No waypoints yet</Text>
          <Text style={styles.emptyHint}>{modeEmptyHint(mode)}</Text>
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
  time: {
    color: Colors.textMuted,
    fontSize: 11,
  },
  category: {
    color: Colors.textSecondary,
    fontSize: 12,
    marginTop: 2,
  },
  notes: {
    color: Colors.textMuted,
    fontSize: 12,
    lineHeight: 17,
    marginTop: 4,
  },
});
