/**
 * HikeTrailBrowserScreen — Filterable, sortable trail list.
 *
 * Phase 5B implementation:
 *   - List of all trails (AT segments + state-park trails)
 *   - Filter chips: difficulty, length range, elevation gain, dog-friendly
 *   - Sort: distance-to-user, alphabetical
 *   - Tap row → detail with description, "Directions" button, "Plan Trip" button
 *   - "Plan Trip" hands the selected trail off to the Hike Trip Planner tab
 *     via route params, pre-selecting it there.
 */

import React, { useMemo, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Linking,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useLocation } from '../hooks/useLocation';
import Colors from '../theme/colors';
import FilterPicker from '../components/common/FilterPicker';
import { MARYLAND_STATE_PARK_TRAILS } from '../data/marylandStateParkTrails';
import type { Trail, TrailDifficulty } from '../types/hike';

type SortOption = 'name' | 'distance' | 'difficulty';

const DIFFICULTY_COLORS: Record<TrailDifficulty, string> = {
  easy: '#6B9E5B',
  moderate: '#D4913D',
  strenuous: '#C75450',
};

export default function HikeTrailBrowserScreen() {
  const navigation = useNavigation<any>();
  const { location } = useLocation();
  const [searchQuery, setSearchQuery] = useState('');
  const [difficultyFilter, setDifficultyFilter] = useState<Set<TrailDifficulty>>(
    new Set(['easy', 'moderate', 'strenuous']),
  );
  const [lengthRange, setLengthRange] = useState<'all' | 'short' | 'medium' | 'long'>('all');
  const [elevationRange, setElevationRange] = useState<'all' | 'low' | 'medium' | 'high'>('all');
  const [dogFriendlyOnly, setDogFriendlyOnly] = useState(false);
  const [sortBy, setSortBy] = useState<SortOption>('name');
  const [selectedTrail, setSelectedTrail] = useState<Trail | null>(null);

  // Filtered and sorted trails
  const filteredTrails = useMemo(() => {
    let result = [...MARYLAND_STATE_PARK_TRAILS];

    // Difficulty filter
    result = result.filter((t) => difficultyFilter.has(t.difficulty));

    // Length range filter
    if (lengthRange === 'short') result = result.filter((t) => t.lengthMi <= 2);
    else if (lengthRange === 'medium') result = result.filter((t) => t.lengthMi > 2 && t.lengthMi <= 5);
    else if (lengthRange === 'long') result = result.filter((t) => t.lengthMi > 5);

    // Elevation range filter
    if (elevationRange === 'low') result = result.filter((t) => t.elevationGainFt <= 300);
    else if (elevationRange === 'medium')
      result = result.filter((t) => t.elevationGainFt > 300 && t.elevationGainFt <= 600);
    else if (elevationRange === 'high') result = result.filter((t) => t.elevationGainFt > 600);

    // Dog-friendly filter
    if (dogFriendlyOnly) result = result.filter((t) => t.dogFriendly);

    // Search filter (name, park, tags)
    if (searchQuery.trim().length > 0) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (t) =>
          t.name.toLowerCase().includes(q) ||
          t.park.toLowerCase().includes(q) ||
          t.tags.some((tag) => tag.toLowerCase().includes(q)),
      );
    }

    // Sort
    if (sortBy === 'name') {
      result.sort((a, b) => a.name.localeCompare(b.name));
    } else if (sortBy === 'distance' && location) {
      result.sort((a, b) => {
        const distA = Math.sqrt(
          Math.pow(a.trailheadLat - location.latitude, 2) +
            Math.pow(a.trailheadLon - location.longitude, 2),
        );
        const distB = Math.sqrt(
          Math.pow(b.trailheadLat - location.latitude, 2) +
            Math.pow(b.trailheadLon - location.longitude, 2),
        );
        return distA - distB;
      });
    } else if (sortBy === 'difficulty') {
      const diffOrder = { easy: 0, moderate: 1, strenuous: 2 };
      result.sort((a, b) => diffOrder[a.difficulty] - diffOrder[b.difficulty]);
    }

    return result;
  }, [searchQuery, difficultyFilter, lengthRange, elevationRange, dogFriendlyOnly, sortBy, location]);

  const toggleDifficulty = useCallback((diff: TrailDifficulty) => {
    setDifficultyFilter((prev) => {
      const next = new Set(prev);
      if (next.has(diff)) next.delete(diff);
      else next.add(diff);
      return next;
    });
  }, []);

  const openDirections = useCallback((trail: Trail) => {
    const url = `http://maps.apple.com/?daddr=${trail.trailheadLat},${trail.trailheadLon}&q=${encodeURIComponent(trail.name)}`;
    Linking.openURL(url).catch(() => {});
  }, []);

  const planTripFromTrail = useCallback(
    (trail: Trail) => {
      navigation.navigate('HikeTripPlannerTab', {
        screen: 'HikeTripPlannerMain',
        params: { trailId: trail.id },
      });
    },
    [navigation],
  );

  const renderTrailRow = ({ item }: { item: Trail }) => (
    <TouchableOpacity
      style={styles.trailRow}
      onPress={() => setSelectedTrail(item)}
      activeOpacity={0.7}
    >
      <View style={styles.trailInfo}>
        <Text style={styles.trailName} numberOfLines={2}>
          {item.name}
        </Text>
        <Text style={styles.trailPark}>{item.park}</Text>
        <View style={styles.trailMeta}>
          <Text style={styles.metaText}>{item.lengthMi} mi</Text>
          <View style={styles.metaDot} />
          <Text style={styles.metaText}>{item.elevationGainFt} ft</Text>
          <View style={styles.metaDot} />
          <Text style={[styles.metaText, { color: DIFFICULTY_COLORS[item.difficulty] }]}>
            {item.difficulty.charAt(0).toUpperCase() + item.difficulty.slice(1)}
          </Text>
          {item.dogFriendly && (
            <>
              <View style={styles.metaDot} />
              <Text style={styles.metaText}>Dogs OK</Text>
            </>
          )}
        </View>
      </View>
      <Text style={styles.trailArrow}>{'›'}</Text>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Trails</Text>
        <TextInput
          style={styles.searchInput}
          placeholder="Search trails..."
          placeholderTextColor={Colors.textMuted}
          value={searchQuery}
          onChangeText={setSearchQuery}
          autoCorrect={false}
          autoCapitalize="none"
        />
      </View>

      {/*
        2026-04-30 (V2.4 audit cross-module sweep): the Trail Browser
        filter row had FOUR separate groups (Difficulty multi-select +
        Length single-select + Elevation single-select + Dog-Friendly
        toggle) crammed into one horizontal ScrollView. Definitely
        overflowed on every screen size. Replaced with a single
        FilterPicker that nests all of them. Hint text identifies which
        group each option belongs to so users can scan the list.
      */}
      {/*
        2026-04-30 (V2.4 audit, second pass): live simulator showed the
        trigger pill rendering "Filters (3) (3)" because this screen was
        pre-formatting `Filters (n)` while FilterPicker also auto-appends
        the active count from its `options[].active` array. Pass the
        bare label and let FilterPicker compute the count once — same
        pattern every other FilterPicker call site already uses.
      */}
      <View style={styles.filterTriggerWrap}>
        <FilterPicker
          triggerLabel="Filters"
          title="Trail Filters"
          options={[
            // Difficulty — multi-select
            { key: 'diff_easy', label: 'Easy', hint: 'Difficulty', active: difficultyFilter.has('easy') },
            { key: 'diff_moderate', label: 'Moderate', hint: 'Difficulty', active: difficultyFilter.has('moderate') },
            { key: 'diff_strenuous', label: 'Strenuous', hint: 'Difficulty', active: difficultyFilter.has('strenuous') },
            // Length — single-select
            { key: 'len_short', label: '≤2 miles', hint: 'Length', active: lengthRange === 'short' },
            { key: 'len_medium', label: '2–5 miles', hint: 'Length', active: lengthRange === 'medium' },
            { key: 'len_long', label: '5+ miles', hint: 'Length', active: lengthRange === 'long' },
            // Elevation — single-select
            { key: 'elev_low', label: '≤300 ft', hint: 'Elevation gain', active: elevationRange === 'low' },
            { key: 'elev_medium', label: '300–600 ft', hint: 'Elevation gain', active: elevationRange === 'medium' },
            { key: 'elev_high', label: '600+ ft', hint: 'Elevation gain', active: elevationRange === 'high' },
            // Dog-friendly — single toggle
            { key: 'dog', label: 'Dog-Friendly', hint: 'Other', active: dogFriendlyOnly },
          ]}
          onChange={(key, next) => {
            if (key.startsWith('diff_')) {
              const diff = key.replace('diff_', '') as 'easy' | 'moderate' | 'strenuous';
              toggleDifficulty(diff);
            } else if (key.startsWith('len_')) {
              const len = key.replace('len_', '') as 'short' | 'medium' | 'long';
              setLengthRange(next ? len : 'all');
            } else if (key.startsWith('elev_')) {
              const elev = key.replace('elev_', '') as 'low' | 'medium' | 'high';
              setElevationRange(next ? elev : 'all');
            } else if (key === 'dog') {
              setDogFriendlyOnly(next);
            }
          }}
          onClearAll={() => {
            difficultyFilter.forEach((d) => toggleDifficulty(d));
            setLengthRange('all');
            setElevationRange('all');
            setDogFriendlyOnly(false);
          }}
        />
      </View>

      <View style={styles.sortBar}>
        <Text style={styles.sortLabel}>Sort:</Text>
        {(['name', 'distance', 'difficulty'] as const).map((sort) => (
          <TouchableOpacity
            key={sort}
            style={[styles.sortChip, sortBy === sort && styles.sortChipActive]}
            onPress={() => setSortBy(sort)}
          >
            <Text
              style={[
                styles.sortChipText,
                sortBy === sort && styles.sortChipTextActive,
              ]}
            >
              {sort === 'name' ? 'Name' : sort === 'distance' ? 'Distance' : 'Difficulty'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <FlatList
        data={filteredTrails}
        keyExtractor={(t) => t.id}
        renderItem={renderTrailRow}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyText}>No trails match these filters.</Text>
          </View>
        }
        ListHeaderComponent={
          <Text style={styles.resultCount}>
            {filteredTrails.length} of {MARYLAND_STATE_PARK_TRAILS.length} trails
          </Text>
        }
      />

      {selectedTrail ? (
        <View style={styles.detailPanel}>
          <View style={styles.detailHeader}>
            <View style={{ flex: 1 }}>
              <Text style={styles.detailTitle}>{selectedTrail.name}</Text>
              <Text style={styles.detailPark}>{selectedTrail.park}</Text>
            </View>
            <TouchableOpacity onPress={() => setSelectedTrail(null)}>
              <Text style={styles.detailClose}>{'\u2715'}</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.detailBody} showsVerticalScrollIndicator={false}>
          <Text style={styles.detailDescription}>{selectedTrail.description}</Text>

          <View style={styles.detailStats}>
            <View style={styles.stat}>
              <Text style={styles.statLabel}>Distance</Text>
              <Text style={styles.statValue}>{selectedTrail.lengthMi} mi</Text>
            </View>
            <View style={styles.stat}>
              <Text style={styles.statLabel}>Elevation</Text>
              <Text style={styles.statValue}>{selectedTrail.elevationGainFt} ft</Text>
            </View>
            <View style={styles.stat}>
              <Text style={styles.statLabel}>Duration</Text>
              <Text style={styles.statValue}>{Math.round(selectedTrail.estDurationMin / 60)}h</Text>
            </View>
            <View style={styles.stat}>
              <Text style={styles.statLabel}>Difficulty</Text>
              <Text
                style={[styles.statValue, { color: DIFFICULTY_COLORS[selectedTrail.difficulty] }]}
              >
                {selectedTrail.difficulty.charAt(0).toUpperCase() + selectedTrail.difficulty.slice(1)}
              </Text>
            </View>
          </View>

          {selectedTrail.highlights && selectedTrail.highlights.length > 0 && (
            <View style={styles.highlightsContainer}>
              <Text style={styles.highlightsTitle}>Highlights</Text>
              {selectedTrail.highlights.map((h, idx) => (
                <Text key={idx} style={styles.highlightItem}>• {h}</Text>
              ))}
            </View>
          )}

          {selectedTrail.parkingNotes ? (
            <View style={styles.parkingContainer}>
              <Text style={styles.parkingTitle}>Parking</Text>
              <Text style={styles.parkingText}>{selectedTrail.parkingNotes}</Text>
            </View>
          ) : null}

          {selectedTrail.tags && selectedTrail.tags.length > 0 && (
            <View style={styles.tagsContainer}>
              {selectedTrail.tags.map((tag, idx) => (
                <View key={idx} style={styles.tag}>
                  <Text style={styles.tagText}>{tag}</Text>
                </View>
              ))}
            </View>
          )}

          {selectedTrail.officialUrl ? (
            <TouchableOpacity
              onPress={() => {
                if (selectedTrail.officialUrl) {
                  Linking.openURL(selectedTrail.officialUrl).catch(() => {});
                }
              }}
              accessibilityLabel={`Open official site for ${selectedTrail.name}`}
            >
              <Text style={styles.officialLink}>Official site ↗</Text>
            </TouchableOpacity>
          ) : null}
          </ScrollView>

          <View style={styles.detailButtons}>
            <TouchableOpacity
              style={[styles.button, { backgroundColor: Colors.moss }]}
              onPress={() => openDirections(selectedTrail)}
            >
              <Text style={styles.buttonText}>Directions</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.button, { backgroundColor: Colors.mdGold }]}
              onPress={() => planTripFromTrail(selectedTrail)}
              accessibilityLabel={`Plan a trip for ${selectedTrail.name}`}
            >
              <Text style={[styles.buttonText, { color: Colors.mdBlack }]}>
                Plan Trip
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.button, { backgroundColor: Colors.mud }]}
              onPress={() => setSelectedTrail(null)}
            >
              <Text style={styles.buttonText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 12, backgroundColor: Colors.surface },
  headerTitle: { fontSize: 18, fontWeight: '700', color: Colors.textPrimary, marginBottom: 10 },
  searchInput: {
    backgroundColor: Colors.surfaceElevated,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.mud,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 13,
    color: Colors.textPrimary,
  },
  // 2026-04-30 (V2.4 audit): the multi-group filter row with chip
  // children was retired. Single FilterPicker trigger anchors here
  // with the same chrome.
  filterTriggerWrap: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.mud,
  },
  sortBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.mud,
    gap: 8,
  },
  sortLabel: { fontSize: 11, fontWeight: '600', color: Colors.textMuted },
  sortChip: {
    backgroundColor: Colors.surfaceElevated,
    borderRadius: 14,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderWidth: 1,
    borderColor: Colors.mud,
  },
  sortChipActive: { backgroundColor: Colors.moss, borderColor: Colors.moss },
  sortChipText: { fontSize: 10, fontWeight: '600', color: Colors.textSecondary },
  sortChipTextActive: { color: Colors.textPrimary },
  listContent: { paddingHorizontal: 12, paddingVertical: 12, paddingBottom: 32 },
  resultCount: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.textMuted,
    marginBottom: 12,
  },
  trailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.surfaceElevated,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: Colors.mud,
  },
  trailInfo: { flex: 1 },
  trailName: { fontSize: 14, fontWeight: '700', color: Colors.textPrimary, marginBottom: 4 },
  trailPark: { fontSize: 11, color: Colors.textSecondary, marginBottom: 6 },
  trailMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: { fontSize: 10, color: Colors.textMuted },
  metaDot: { width: 3, height: 3, borderRadius: 1.5, backgroundColor: Colors.textMuted },
  trailArrow: { fontSize: 20, color: Colors.textMuted, marginLeft: 12 },
  empty: { paddingVertical: 40, alignItems: 'center' },
  emptyText: { fontSize: 13, color: Colors.textMuted },
  detailPanel: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: Colors.surface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 16,
    paddingTop: 20,
    paddingBottom: 24,
    borderTopWidth: 1,
    borderTopColor: Colors.mud,
    maxHeight: '80%',
  },
  detailHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  detailTitle: { fontSize: 16, fontWeight: '700', color: Colors.textPrimary },
  detailPark: { fontSize: 12, color: Colors.textSecondary, marginTop: 2 },
  detailClose: { fontSize: 20, color: Colors.textMuted },
  detailDescription: {
    fontSize: 13,
    color: Colors.textSecondary,
    lineHeight: 18,
    marginBottom: 12,
  },
  detailStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: Colors.surfaceElevated,
    borderRadius: 10,
    paddingVertical: 12,
    marginBottom: 12,
  },
  stat: { alignItems: 'center' },
  statLabel: { fontSize: 10, color: Colors.textMuted, marginBottom: 2 },
  statValue: { fontSize: 12, fontWeight: '700', color: Colors.textPrimary },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 12,
  },
  tag: {
    backgroundColor: Colors.surfaceElevated,
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  tagText: { fontSize: 10, color: Colors.tan },
  highlightsContainer: {
    marginBottom: 12,
    paddingHorizontal: 2,
  },
  highlightsTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  highlightItem: {
    fontSize: 12,
    color: Colors.textPrimary,
    lineHeight: 18,
  },
  parkingContainer: {
    marginBottom: 12,
    paddingHorizontal: 2,
  },
  parkingTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  parkingText: { fontSize: 12, color: Colors.textPrimary, lineHeight: 18 },
  officialLink: {
    fontSize: 12,
    color: Colors.mdGold,
    marginBottom: 12,
    fontWeight: '600',
  },
  detailBody: { flexGrow: 0, flexShrink: 1 },
  detailButtons: { flexDirection: 'row', gap: 8, marginTop: 8 },
  button: { flex: 1, paddingVertical: 12, borderRadius: 8, alignItems: 'center' },
  buttonText: { fontSize: 12, fontWeight: '700', color: Colors.textPrimary },
});
