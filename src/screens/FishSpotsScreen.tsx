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

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll}>
        <View style={styles.filterBar}>
          {(['all', 'ramp', 'soft', 'shore'] as const).map((a) => (
            <TouchableOpacity
              key={a}
              style={[styles.chip, access === a && styles.chipActive]}
              onPress={() => setAccess(a)}
              activeOpacity={0.7}
            >
              <Text style={[styles.chipText, access === a && styles.chipTextActive]}>
                {a === 'all'
                  ? 'All Access'
                  : a === 'ramp'
                  ? 'Boat Ramp'
                  : a === 'soft'
                  ? 'Soft Launch'
                  : 'Shore Only'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.countyScroll}>
        <View style={styles.filterBar}>
          <TouchableOpacity
            style={[styles.chip, county === 'all' && styles.chipActive]}
            onPress={() => setCounty('all')}
            activeOpacity={0.7}
          >
            <Text style={[styles.chipText, county === 'all' && styles.chipTextActive]}>
              All Counties
            </Text>
          </TouchableOpacity>
          {ALL_COUNTIES.map((c) => (
            <TouchableOpacity
              key={c}
              style={[styles.chip, county === c && styles.chipActive]}
              onPress={() => setCounty(c)}
              activeOpacity={0.7}
            >
              <Text style={[styles.chipText, county === c && styles.chipTextActive]}>{c}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>

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
  filterScroll: {
    maxHeight: 46,
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.mud,
  },
  countyScroll: {
    maxHeight: 46,
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.mud,
  },
  filterBar: {
    flexDirection: 'row',
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.mud,
    marginRight: 6,
  },
  chipActive: { backgroundColor: Colors.moss, borderColor: Colors.moss },
  chipText: { fontSize: 11, fontWeight: '600', color: Colors.textMuted },
  chipTextActive: { color: Colors.textPrimary },
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
