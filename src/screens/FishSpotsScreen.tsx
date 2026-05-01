/**
 * FishSpotsScreen — Browsable, filterable list of Maryland public angler access sites.
 *
 * Renders the 579-site MD DNR Public View Angler Access dataset as a searchable
 * list, grouped and filterable by county, species, and access type. Taps open
 * a detail sheet with directions-to button that opens Apple Maps.
 *
 * Built 2026-04-17 for V2.2.0 — replaces the "Coming Soon" fall-through for
 * the Fish > Spots tab and addresses App Store 4.2 (Minimum Functionality).
 */

import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  Linking,
  Alert,
  Modal,
  Pressable,
  ScrollView,
} from 'react-native';
import Colors from '../theme/colors';
import FilterPicker from '../components/common/FilterPicker';
import {
  MARYLAND_ANGLER_ACCESS_SITES,
  type AnglerAccessSite,
} from '../data/marylandAnglerAccessSites';
import { isValidCoord, formatCoord } from '../utils/validateCoord';

type AccessFilter = 'all' | 'ramp' | 'shore' | 'soft';

const ALL_COUNTIES = Array.from(
  new Set(MARYLAND_ANGLER_ACCESS_SITES.map((s) => s.county)),
).sort();

export default function FishSpotsScreen() {
  const [query, setQuery] = useState('');
  const [county, setCounty] = useState<string | 'all'>('all');
  const [access, setAccess] = useState<AccessFilter>('all');
  const [selected, setSelected] = useState<AnglerAccessSite | null>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return MARYLAND_ANGLER_ACCESS_SITES.filter((s) => {
      if (!isValidCoord(s.lat, s.lng)) return false;
      if (county !== 'all' && s.county !== county) return false;
      if (access === 'ramp' && !s.hasRamp) return false;
      if (access === 'soft' && !s.hasSoftLaunch) return false;
      if (access === 'shore' && (s.hasRamp || s.hasSoftLaunch)) return false;
      if (!q) return true;
      return (
        s.name.toLowerCase().includes(q) ||
        s.waterbody.toLowerCase().includes(q) ||
        s.fishTypes.toLowerCase().includes(q)
      );
    }).slice(0, 500); // FlatList safety cap
  }, [query, county, access]);

  const openDirections = async (site: AnglerAccessSite) => {
    // Apple Maps URL scheme — opens in Maps.app
    const url = `http://maps.apple.com/?daddr=${site.lat},${site.lng}&q=${encodeURIComponent(site.name)}`;
    try {
      const ok = await Linking.canOpenURL(url);
      if (ok) await Linking.openURL(url);
      else Alert.alert('Unable to open Maps', 'Apple Maps is not available on this device.');
    } catch {
      Alert.alert('Error', 'Failed to launch directions.');
    }
  };

  const renderItem = ({ item }: { item: AnglerAccessSite }) => {
    const badges: string[] = [];
    if (item.hasRamp) badges.push('Ramp');
    if (item.hasSoftLaunch) badges.push('Soft Launch');
    if (item.specialReg && item.specialReg !== 'None') badges.push(item.specialReg);

    return (
      <TouchableOpacity style={styles.card} onPress={() => setSelected(item)} activeOpacity={0.8}>
        <View style={styles.cardHead}>
          <Text style={styles.cardName} numberOfLines={2}>
            {item.name}
          </Text>
          <Text style={styles.cardCounty}>{item.county} Co.</Text>
        </View>
        <Text style={styles.cardWater}>{item.waterbody}</Text>
        <Text style={styles.cardSpecies} numberOfLines={2}>
          {item.fishTypes || 'Species not specified'}
        </Text>
        {badges.length > 0 ? (
          <View style={styles.badgeRow}>
            {badges.map((b) => (
              <View key={b} style={styles.badge}>
                <Text style={styles.badgeText}>{b}</Text>
              </View>
            ))}
          </View>
        ) : null}
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.searchBar}>
        <TextInput
          style={styles.search}
          placeholder="Search spots, waterbody, or species"
          placeholderTextColor={Colors.textMuted}
          value={query}
          onChangeText={setQuery}
          autoCapitalize="none"
          autoCorrect={false}
        />
      </View>

      {/*
        2026-04-30 (V2.4 audit): the two horizontal-scrolling chip rows
        (access + county) clipped on every screen size. Replaced with
        two FilterPicker triggers in a horizontal row. Each opens its
        own modal listing every option as a Switch row. Single-select
        is emulated via toggle handlers — turning one ON sets the value;
        turning OFF the active one reverts to 'all'. Active selection
        appears in the trigger label so users know what's filtered.
      */}
      <View style={styles.filterTriggerRow}>
        <FilterPicker
          triggerLabel={
            access === 'all'
              ? 'Access'
              : access === 'ramp'
              ? 'Boat Ramp'
              : access === 'soft'
              ? 'Soft Launch'
              : 'Shore Only'
          }
          title="Access Type"
          compact
          options={[
            {
              key: 'all',
              label: 'All Access',
              hint: 'No access-type filter',
              active: access === 'all',
            },
            {
              key: 'ramp',
              label: 'Boat Ramp',
              hint: 'Hard-surface launch ramps',
              active: access === 'ramp',
            },
            {
              key: 'soft',
              label: 'Soft Launch',
              hint: 'Kayak / canoe / hand-carry',
              active: access === 'soft',
            },
            {
              key: 'shore',
              label: 'Shore Only',
              hint: 'Pier / wading / shore casting',
              active: access === 'shore',
            },
          ]}
          onChange={(key, next) => {
            if (next) setAccess(key as any);
            else if (access === key) setAccess('all');
          }}
          onClearAll={() => setAccess('all')}
        />
        <FilterPicker
          triggerLabel={county === 'all' ? 'County' : county}
          title="County"
          compact
          options={[
            {
              key: 'all',
              label: 'All Counties',
              hint: 'Statewide',
              active: county === 'all',
            },
            ...ALL_COUNTIES.map((c) => ({
              key: c,
              label: c,
              active: county === c,
            })),
          ]}
          onChange={(key, next) => {
            if (next) setCounty(key as any);
            else if (county === key) setCounty('all');
          }}
          onClearAll={() => setCounty('all')}
        />
      </View>

      <View style={styles.countBar}>
        <Text style={styles.countText}>
          {filtered.length} spot{filtered.length === 1 ? '' : 's'}
          {filtered.length === 500 ? ' (showing first 500)' : ''}
        </Text>
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(s) => s.id}
        renderItem={renderItem}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyText}>No spots match your filters.</Text>
          </View>
        }
      />

      <Modal
        visible={!!selected}
        animationType="slide"
        transparent
        onRequestClose={() => setSelected(null)}
      >
        <Pressable style={styles.modalOverlay} onPress={() => setSelected(null)}>
          <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
            {selected ? (
              <>
                <View style={styles.sheetHandle} />
                <Text style={styles.sheetTitle}>{selected.name}</Text>
                <Text style={styles.sheetSubtitle}>
                  {selected.county} County {'\u2022'} {selected.waterbody}
                </Text>
                <View style={styles.sheetSection}>
                  <Text style={styles.sheetLabel}>Species</Text>
                  <Text style={styles.sheetValue}>
                    {selected.fishTypes || 'Not specified'}
                  </Text>
                </View>
                <View style={styles.sheetSection}>
                  <Text style={styles.sheetLabel}>Special Regulations</Text>
                  <Text style={styles.sheetValue}>{selected.specialReg || 'None'}</Text>
                </View>
                <View style={styles.sheetSection}>
                  <Text style={styles.sheetLabel}>Access</Text>
                  <Text style={styles.sheetValue}>
                    {selected.hasRamp
                      ? 'Concrete boat ramp'
                      : selected.hasSoftLaunch
                      ? 'Soft launch (car-top)'
                      : 'Shore access only'}
                  </Text>
                </View>
                <View style={styles.sheetSection}>
                  <Text style={styles.sheetLabel}>Coordinates</Text>
                  <Text style={styles.sheetValue}>{formatCoord(selected.lat, selected.lng)}</Text>
                </View>
                <TouchableOpacity
                  style={styles.directionsButton}
                  onPress={() => openDirections(selected)}
                  activeOpacity={0.8}
                >
                  <Text style={styles.directionsText}>{'\uD83E\uDDED'} Open in Maps</Text>
                </TouchableOpacity>
                <Text style={styles.sheetDisclaimer}>
                  Always verify current MD DNR fishing regulations, access hours, and any
                  private-property restrictions before visiting. License required.
                </Text>
              </>
            ) : null}
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  searchBar: {
    padding: 10,
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.mud,
  },
  search: {
    backgroundColor: Colors.surfaceElevated,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: Colors.textPrimary,
    fontSize: 14,
    borderWidth: 1,
    borderColor: Colors.mud,
  },
  // 2026-04-30 (V2.4): chip rows replaced with FilterPicker pair. Old
  // styles (filterScroll / countyScroll / filterBar / chip / chipActive
  // / chipText / chipTextActive) retired — kept only the trigger row.
  filterTriggerRow: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.mud,
  },
  countBar: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.mud,
  },
  countText: { fontSize: 11, color: Colors.textMuted, fontWeight: '600' },
  list: { padding: 10, paddingBottom: 32 },
  card: {
    backgroundColor: Colors.surfaceElevated,
    borderRadius: 10,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: Colors.mud,
  },
  cardHead: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 4,
  },
  cardName: { flex: 1, fontSize: 14, fontWeight: '700', color: Colors.textPrimary, marginRight: 8 },
  cardCounty: { fontSize: 10, fontWeight: '600', color: Colors.tan, textTransform: 'uppercase' },
  cardWater: { fontSize: 12, color: Colors.mdGold, marginBottom: 4 },
  cardSpecies: { fontSize: 12, color: Colors.textMuted, lineHeight: 17, marginBottom: 6 },
  badgeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 5 },
  badge: {
    backgroundColor: Colors.forestDark,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    marginRight: 5,
    marginBottom: 4,
  },
  badgeText: { fontSize: 9, fontWeight: '600', color: Colors.mdGold, letterSpacing: 0.3 },
  empty: { padding: 32, alignItems: 'center' },
  emptyText: { fontSize: 14, color: Colors.textMuted },

  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: Colors.surfaceElevated,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    padding: 16,
    paddingBottom: 32,
  },
  sheetHandle: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.mud,
    marginBottom: 14,
  },
  sheetTitle: { fontSize: 18, fontWeight: '700', color: Colors.textPrimary, marginBottom: 4 },
  sheetSubtitle: { fontSize: 13, color: Colors.mdGold, marginBottom: 14 },
  sheetSection: { marginBottom: 12 },
  sheetLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: Colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 4,
  },
  sheetValue: { fontSize: 13, color: Colors.textSecondary, lineHeight: 18 },
  directionsButton: {
    backgroundColor: Colors.moss,
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 12,
  },
  directionsText: { fontSize: 15, fontWeight: '700', color: Colors.textPrimary },
  sheetDisclaimer: { fontSize: 11, color: Colors.textMuted, lineHeight: 16, fontStyle: 'italic' },
});
