/**
 * OnThisDayScreen — Facebook-Memories-style "what did I do on this
 * calendar date in past years?" feed across all 5 personal layers.
 *
 * Pure-aggregator + sectioned list. Year-bucketed sections, each row
 * deep-links to the appropriate detail screen so memories are a one-tap
 * jump back into your past trip.
 *
 * Cross-mode by design: showing all your April-24 memories regardless of
 * which mode they were filed under is the whole point. A user opening
 * this on the morning of April 24 should see hunt entries, fish trips,
 * and hike tracks side-by-side from past years.
 *
 * V2_3_FEATURE_EXPANSION_PLAN — Phase A.15.
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
import {
  getOnThisDayItems,
  OnThisDayItem,
  OnThisDayYearBucket,
} from '../services/onThisDayService';
import {
  CATEGORY_META,
  resolveWaypointColor,
} from '../types/userWaypoint';
import { JOURNAL_OUTCOME_META } from '../types/journalEntry';

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

function formatTodayLabel(): string {
  const d = new Date();
  return `${MONTH_NAMES[d.getMonth()]} ${d.getDate()}`;
}

export default function OnThisDayScreen() {
  const navigation = useNavigation<any>();

  const { allWaypoints } = useUserWaypoints();
  const { allMarkups } = useUserMarkups();
  const { allTracks } = useTrackRecorder();
  const { allEntries } = useJournalEntries();
  const { allChecklists } = useGearChecklists();

  // Compute against all 5 layers across every mode — memories are most
  // poignant when April 24 surfaces a 2024 hunt next to a 2025 hike.
  // Recomputed once per render; the underlying inputs only change on
  // mutation so this stays cheap.
  const result = useMemo(
    () =>
      getOnThisDayItems(new Date(), {
        waypoints: allWaypoints,
        tracks: allTracks,
        markups: allMarkups,
        journalEntries: allEntries,
        checklists: allChecklists,
      }),
    [allWaypoints, allTracks, allMarkups, allEntries, allChecklists],
  );

  const dateLabel = formatTodayLabel();

  const onTapItem = (it: OnThisDayItem) => {
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

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
    >
      <View style={styles.header}>
        <Text style={styles.headerTitle}>On This Day</Text>
        <Text style={styles.headerDate}>{dateLabel}</Text>
        <Text style={styles.headerSub}>
          What you were doing on this calendar day in past years.
          Tap any memory to revisit it.
        </Text>
      </View>

      {result.totalCount === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyTitle}>No memories yet</Text>
          <Text style={styles.emptyText}>
            Once you&apos;ve logged a trip on a {dateLabel} in any prior
            year, it will show up here on every {dateLabel} from now on.
          </Text>
        </View>
      ) : (
        result.buckets.map((b) => (
          <YearSection key={b.year} bucket={b} onTap={onTapItem} />
        ))
      )}
    </ScrollView>
  );
}

function YearSection({
  bucket,
  onTap,
}: {
  bucket: OnThisDayYearBucket;
  onTap: (it: OnThisDayItem) => void;
}) {
  const yearsAgoLabel =
    bucket.yearsAgo === 1
      ? '1 year ago'
      : `${bucket.yearsAgo} years ago`;

  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionYear}>{bucket.year}</Text>
        <Text style={styles.sectionAgo}>{yearsAgoLabel}</Text>
      </View>
      {bucket.items.map((it) => (
        <MemoryRow key={`${it.kind}-${it.item.id}`} item={it} onPress={() => onTap(it)} />
      ))}
    </View>
  );
}

/**
 * Polymorphic row that adapts its color/letter-code chip and subtitle
 * based on the item kind. Keeps a consistent visual rhythm so the user
 * scans the year section easily even when it mixes layers.
 */
function MemoryRow({
  item,
  onPress,
}: {
  item: OnThisDayItem;
  onPress: () => void;
}) {
  const { code, color, title, subtitle } = describeItem(item);
  return (
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
  );
}

interface RowDesc {
  code: string;
  color: string;
  title: string;
  subtitle: string;
}

function describeItem(it: OnThisDayItem): RowDesc {
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
  headerDate: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.mdGold,
    marginTop: 2,
  },
  headerSub: {
    fontSize: 13,
    color: Colors.textSecondary,
    lineHeight: 18,
    marginTop: 6,
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
  sectionYear: {
    fontSize: 18,
    fontWeight: '800',
    color: Colors.textPrimary,
    letterSpacing: 0.5,
  },
  sectionAgo: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.textMuted,
    letterSpacing: 0.6,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.mud,
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
    marginBottom: 8,
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
});
