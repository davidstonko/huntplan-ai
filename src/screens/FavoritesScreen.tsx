/**
 * FavoritesScreen — kind-grouped feed of every starred personal-layer
 * row. Cross-mode by design: a hunt stand sits next to a fish hole sits
 * next to a hike trail.
 *
 * Polymorphic rows reuse the chip-+-title-+-subtitle pattern from
 * OnThisDayScreen, with a star CTA on each row that toggles the
 * favorite. Tapping anywhere else on the row deep-links to the right
 * detail screen.
 *
 * V2_3_FEATURE_EXPANSION_PLAN — Phase A.16.
 */
import React, { useMemo } from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import Colors from '../theme/colors';
import { useUserWaypoints } from '../context/UserWaypointContext';
import { useUserMarkups } from '../context/UserMarkupContext';
import { useTrackRecorder } from '../context/TrackRecorderContext';
import { useJournalEntries } from '../context/JournalEntryContext';
import { useGearChecklists } from '../context/GearChecklistContext';
import { useFavorites } from '../context/FavoritesContext';
import {
  getFavoriteItems,
  FavoriteItem,
  FavoriteKindBucket,
} from '../services/favoritesAggregatorService';
import {
  CATEGORY_META,
  resolveWaypointColor,
} from '../types/userWaypoint';
import { JOURNAL_OUTCOME_META } from '../types/journalEntry';

export default function FavoritesScreen() {
  const navigation = useNavigation<any>();

  const { allWaypoints } = useUserWaypoints();
  const { allMarkups } = useUserMarkups();
  const { allTracks } = useTrackRecorder();
  const { allEntries } = useJournalEntries();
  const { allChecklists } = useGearChecklists();
  const { favorites, toggleFavorite } = useFavorites();

  const result = useMemo(
    () =>
      getFavoriteItems({
        favorites,
        waypoints: allWaypoints,
        tracks: allTracks,
        markups: allMarkups,
        journalEntries: allEntries,
        checklists: allChecklists,
      }),
    [
      favorites,
      allWaypoints,
      allTracks,
      allMarkups,
      allEntries,
      allChecklists,
    ],
  );

  const onTapItem = (it: FavoriteItem) => {
    switch (it.kind) {
      case 'waypoint':
        navigation.navigate('WaypointEdit', {
          mode: it.item.mode,
          waypointId: it.item.id,
        });
        break;
      case 'track':
        navigation.navigate('TrackDetail', {
          mode: it.item.mode,
          trackId: it.item.id,
        });
        break;
      case 'markup':
        navigation.navigate('MarkupEdit', {
          mode: it.item.mode,
          markupId: it.item.id,
        });
        break;
      case 'journal':
        navigation.navigate('JournalEdit', {
          mode: it.item.mode,
          entryId: it.item.id,
        });
        break;
      case 'checklist':
        navigation.navigate('GearChecklistEdit', {
          mode: it.item.mode,
          checklistId: it.item.id,
        });
        break;
    }
  };

  const onUnstar = (it: FavoriteItem) => {
    toggleFavorite(it.kind, it.item.id);
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
    >
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Favorites</Text>
        <Text style={styles.headerSub}>
          Your starred waypoints, tracks, markups, journal entries, and
          checklists. Across every mode.
        </Text>
        {result.staleCount > 0 ? (
          <Text style={styles.headerStale}>
            {result.staleCount} starred row
            {result.staleCount === 1 ? ' is' : 's are'} no longer in your
            layer (deleted) — hidden from this list.
          </Text>
        ) : null}
      </View>

      {result.totalCount === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyTitle}>No favorites yet</Text>
          <Text style={styles.emptyText}>
            Open any waypoint, track, markup, journal entry, or gear
            checklist and tap the star to pin it here. The Favorites tab
            stays cross-mode so you can see your hunt stands, fish holes,
            and trail loops in one place.
          </Text>
        </View>
      ) : (
        result.buckets.map((b) => (
          <KindSection
            key={b.kind}
            bucket={b}
            onTap={onTapItem}
            onUnstar={onUnstar}
          />
        ))
      )}
    </ScrollView>
  );
}

function KindSection({
  bucket,
  onTap,
  onUnstar,
}: {
  bucket: FavoriteKindBucket;
  onTap: (it: FavoriteItem) => void;
  onUnstar: (it: FavoriteItem) => void;
}) {
  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionLabel}>{bucket.label}</Text>
        <Text style={styles.sectionCount}>{bucket.items.length}</Text>
      </View>
      {bucket.items.map((it) => (
        <FavoriteRow
          key={`${it.kind}-${it.item.id}`}
          item={it}
          onPress={() => onTap(it)}
          onUnstar={() => onUnstar(it)}
        />
      ))}
    </View>
  );
}

function FavoriteRow({
  item,
  onPress,
  onUnstar,
}: {
  item: FavoriteItem;
  onPress: () => void;
  onUnstar: () => void;
}) {
  const { code, color, title, subtitle } = describeItem(item);
  return (
    <View style={styles.rowWrap}>
      <TouchableOpacity style={styles.row} onPress={onPress}>
        <View style={[styles.codeBadge, { backgroundColor: color }]}>
          <Text style={styles.codeBadgeText}>{code}</Text>
        </View>
        <View style={styles.rowTextCol}>
          <Text style={styles.rowTitle} numberOfLines={1}>
            {title}
          </Text>
          <Text style={styles.rowSub} numberOfLines={2}>
            {subtitle}
          </Text>
        </View>
        <Text style={styles.rowChev}>{'\u203A'}</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.starBtn} onPress={onUnstar}>
        <Text style={styles.starBtnText}>{'\u2605'}</Text>
      </TouchableOpacity>
    </View>
  );
}

interface RowDesc {
  code: string;
  color: string;
  title: string;
  subtitle: string;
}

function describeItem(it: FavoriteItem): RowDesc {
  switch (it.kind) {
    case 'waypoint': {
      const cat = CATEGORY_META[it.item.category];
      return {
        code: cat?.letterCode ?? 'WP',
        color: resolveWaypointColor(it.item),
        title: it.item.title || '(untitled waypoint)',
        subtitle: `${cat?.label ?? 'Waypoint'} \u00b7 ${modeLabel(it.item.mode)}`,
      };
    }
    case 'track': {
      const km = (it.item.distanceM / 1000).toFixed(1);
      const mi = (it.item.distanceM / 1609.34).toFixed(1);
      return {
        code: 'TR',
        color: Colors.moss,
        title: it.item.name || '(unnamed track)',
        subtitle: `${mi} mi / ${km} km \u00b7 ${modeLabel(it.item.mode)}`,
      };
    }
    case 'markup': {
      const shape = it.item.shapeType === 'Polygon' ? 'Polygon' : 'Line';
      return {
        code: 'MK',
        color: it.item.color || Colors.amber,
        title: it.item.title || '(untitled markup)',
        subtitle: `${shape} \u00b7 ${modeLabel(it.item.mode)}`,
      };
    }
    case 'journal': {
      const oc = JOURNAL_OUTCOME_META[it.item.outcome];
      return {
        code: oc?.letterCode ?? 'JR',
        color: oc?.color ?? Colors.oak,
        title: it.item.title || '(untitled entry)',
        subtitle: `${oc?.label ?? 'Note'} \u00b7 ${modeLabel(it.item.mode)}`,
      };
    }
    case 'checklist': {
      const checked = it.item.items.filter((i) => i.checked).length;
      const total = it.item.items.length;
      return {
        code: 'GC',
        color: Colors.mdGold,
        title: it.item.name || '(untitled checklist)',
        subtitle: `${checked}/${total} packed \u00b7 ${modeLabel(it.item.mode)}`,
      };
    }
  }
}

function modeLabel(mode: string): string {
  switch (mode) {
    case 'hunt': return 'Hunt';
    case 'fish': return 'Fish';
    case 'camp': return 'Camp';
    case 'hike': return 'Hike';
    default: return mode;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  content: {
    padding: 16,
    paddingBottom: 48,
  },
  header: {
    marginBottom: 20,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: Colors.textPrimary,
  },
  headerSub: {
    fontSize: 13,
    color: Colors.textSecondary,
    lineHeight: 18,
    marginTop: 6,
  },
  headerStale: {
    fontSize: 12,
    color: Colors.textMuted,
    fontStyle: 'italic',
    marginTop: 8,
  },
  empty: {
    paddingVertical: 36,
    paddingHorizontal: 16,
    backgroundColor: Colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.mud,
  },
  emptyTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginBottom: 6,
  },
  emptyText: {
    fontSize: 13,
    color: Colors.textSecondary,
    lineHeight: 18,
  },
  section: {
    marginBottom: 22,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    marginBottom: 8,
    paddingHorizontal: 4,
  },
  sectionLabel: {
    fontSize: 16,
    fontWeight: '800',
    color: Colors.textPrimary,
    letterSpacing: 0.4,
  },
  sectionCount: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.textMuted,
    letterSpacing: 0.6,
  },
  rowWrap: {
    flexDirection: 'row',
    alignItems: 'stretch',
    marginBottom: 8,
  },
  row: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.mud,
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  codeBadge: {
    width: 40,
    minHeight: 40,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    paddingHorizontal: 4,
  },
  codeBadgeText: {
    color: Colors.background,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  rowTextCol: {
    flex: 1,
  },
  rowTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  rowSub: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  rowChev: {
    fontSize: 22,
    color: Colors.textMuted,
    marginLeft: 8,
  },
  starBtn: {
    width: 44,
    marginLeft: 8,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.mud,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  starBtnText: {
    color: Colors.mdGold,
    fontSize: 22,
    fontWeight: '900',
  },
});
