/**
 * MarkupListScreen — Personal-markup list, filtered by current mode.
 *
 * Mirrors WaypointListScreen but for `UserMarkup` (LineString + Polygon).
 * One landing surface per mode: Hunt shoot-lanes, Camp property
 * boundaries, Hike off-trail spurs, Fish drift lines.
 *
 * Tap a row → MarkupEditScreen (rename / recolor / delete / export).
 * Tap "+ NEW LINE" or "+ NEW AREA" → MarkupDrawScreen with the chosen
 * shape pre-selected.
 *
 * V2_3_FEATURE_EXPANSION_PLAN §D.2.
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
import { useUserMarkups } from '../context/UserMarkupContext';
import {
  UserMarkup,
  resolveMarkupColor,
} from '../types/userMarkup';
import type { WaypointMode } from '../types/userWaypoint';

type MarkupListParams = {
  MarkupList: { mode: WaypointMode };
};

function relativeTime(iso: string): string {
  const then = new Date(iso).getTime();
  if (!Number.isFinite(then)) return '';
  const deltaSec = Math.max(0, (Date.now() - then) / 1000);
  if (deltaSec < 60) return 'just now';
  if (deltaSec < 3600) return `${Math.floor(deltaSec / 60)}m ago`;
  if (deltaSec < 86400) return `${Math.floor(deltaSec / 3600)}h ago`;
  if (deltaSec < 604800) return `${Math.floor(deltaSec / 86400)}d ago`;
  return new Date(iso).toLocaleDateString();
}

function shapeLabel(m: UserMarkup): string {
  return m.shapeType === 'LineString' ? 'LINE' : 'AREA';
}

function modeHeading(mode: WaypointMode): string {
  switch (mode) {
    case 'hunt': return 'HUNT MARKUPS';
    case 'fish': return 'FISH MARKUPS';
    case 'camp': return 'CAMP MARKUPS';
    case 'hike': return 'HIKE MARKUPS';
  }
}

function modeEmptyHint(mode: WaypointMode): string {
  switch (mode) {
    case 'hunt':
      return 'Draw shoot lanes, blood trails, or property boundaries here. Lines and polygons only — for individual pins, use Waypoints.';
    case 'fish':
      return 'Draw drift lines, structure outlines, or honey-hole zones here.';
    case 'camp':
      return 'Mark property boundaries or campsite areas. Useful for marking what you own vs. what you can hunt.';
    case 'hike':
      return 'Plot off-trail spurs or alternate routes here.';
  }
}

export default function MarkupListScreen() {
  const route = useRoute<RouteProp<MarkupListParams, 'MarkupList'>>();
  const navigation = useNavigation<any>();
  const { mode } = route.params;
  const { markupsForMode, deleteMarkup, hydrated } = useUserMarkups();

  const data = useMemo(() => {
    return [...markupsForMode(mode)].sort((a, b) =>
      b.updatedAt.localeCompare(a.updatedAt),
    );
  }, [mode, markupsForMode]);

  const onNewLine = useCallback(() => {
    navigation.navigate('MarkupDraw', { mode, shapeType: 'LineString' });
  }, [mode, navigation]);

  const onNewPolygon = useCallback(() => {
    navigation.navigate('MarkupDraw', { mode, shapeType: 'Polygon' });
  }, [mode, navigation]);

  const onOpen = useCallback(
    (m: UserMarkup) => {
      navigation.navigate('MarkupEdit', { mode, markupId: m.id });
    },
    [mode, navigation],
  );

  const onLongPressDelete = useCallback(
    (m: UserMarkup) => {
      Alert.alert(
        'Delete markup?',
        `"${m.title || 'Untitled'}" will be permanently removed from this device.`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Delete',
            style: 'destructive',
            onPress: () => void deleteMarkup(m.id),
          },
        ],
      );
    },
    [deleteMarkup],
  );

  const renderItem = useCallback(
    ({ item }: { item: UserMarkup }) => {
      const color = resolveMarkupColor(item);
      const shape = shapeLabel(item);
      const title = item.title.trim() || `Untitled ${shape.toLowerCase()}`;
      return (
        <Pressable
          onPress={() => onOpen(item)}
          onLongPress={() => onLongPressDelete(item)}
          style={styles.row}
          android_ripple={{ color: Colors.surfaceElevated }}
        >
          <View style={[styles.badge, { backgroundColor: color }]}>
            <Text style={styles.badgeText}>{shape}</Text>
          </View>
          <View style={styles.body}>
            <View style={styles.titleRow}>
              <Text style={styles.title} numberOfLines={1}>{title}</Text>
              <Text style={styles.time}>{relativeTime(item.updatedAt)}</Text>
            </View>
            <Text style={styles.category} numberOfLines={1}>
              {item.shapeType === 'Polygon'
                ? `${item.coordinates[0]?.length ?? 0} vertices`
                : `${item.coordinates.length} points`}
              {item.notes ? `  ·  notes` : ''}
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
        <View style={styles.headerBtns}>
          <Pressable onPress={onNewLine} hitSlop={8} style={styles.newBtn}>
            <Text style={styles.newBtnText}>+ LINE</Text>
          </Pressable>
          <Pressable onPress={onNewPolygon} hitSlop={8} style={[styles.newBtn, styles.newBtnSecondary]}>
            <Text style={styles.newBtnText}>+ AREA</Text>
          </Pressable>
        </View>
      </View>

      {!hydrated ? (
        <View style={styles.emptyWrap}>
          <Text style={styles.emptyHint}>Loading…</Text>
        </View>
      ) : data.length === 0 ? (
        <View style={styles.emptyWrap}>
          <Text style={styles.emptyTitle}>No markups yet</Text>
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
  screen: { flex: 1, backgroundColor: Colors.background },
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
  headerBtns: { flexDirection: 'row', gap: 6 },
  newBtn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: Colors.mdGold,
    borderRadius: 6,
    marginLeft: 6,
  },
  newBtnSecondary: { backgroundColor: '#f59e0b' },
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
  listBody: { paddingVertical: 6, paddingBottom: 40 },
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
    width: 48,
    height: 36,
    borderRadius: 6,
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
  body: { flex: 1 },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  title: {
    color: Colors.textPrimary,
    fontSize: 15,
    fontWeight: '700',
    flex: 1,
    marginRight: 8,
  },
  time: { color: Colors.textMuted, fontSize: 11 },
  category: {
    color: Colors.textMuted,
    fontSize: 12,
    marginTop: 2,
  },
});
