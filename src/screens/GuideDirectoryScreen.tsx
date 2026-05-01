/**
 * GuideDirectoryScreen — Directory of Maryland licensed hunting/fishing guides & outfitters.
 *
 * Shows a searchable list of MD guide services. Each entry has a phone number,
 * website, and region tag. Tapping phone → dialer, tapping web → browser.
 * No booking flow, no payments — just a reference list.
 *
 * Data source: Public MD DNR guide registry + well-known charter fleets.
 * Entries are verified as of 2026-04-17; users can flag outdated entries
 * through Feedback.
 */

import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Linking,
  Alert,
  TextInput,
  ScrollView,
} from 'react-native';
import Colors from '../theme/colors';
import FilterPicker from '../components/common/FilterPicker';

type Region = 'chesapeake' | 'western' | 'eastern-shore' | 'central' | 'southern' | 'ocean';
type Service = 'deer' | 'waterfowl' | 'turkey' | 'upland' | 'freshwater' | 'trout' | 'striper' | 'offshore' | 'fly';

interface Guide {
  id: string;
  name: string;
  region: Region;
  services: Service[];
  phone?: string;
  website?: string;
  notes: string;
}

const REGION_LABEL: Record<Region, string> = {
  chesapeake: 'Chesapeake Bay',
  western: 'Western MD',
  'eastern-shore': 'Eastern Shore',
  central: 'Central MD',
  southern: 'Southern MD',
  ocean: 'Ocean / Coast',
};

const SERVICE_LABEL: Record<Service, string> = {
  deer: 'Deer',
  waterfowl: 'Waterfowl',
  turkey: 'Turkey',
  upland: 'Upland',
  freshwater: 'Freshwater',
  trout: 'Trout',
  striper: 'Striper',
  offshore: 'Offshore',
  fly: 'Fly Fishing',
};

// Public-registry-style directory. Each entry links to the guide's official
// website; phone numbers are public business lines. MDHuntFishOutdoors does
// not certify or endorse individual guides — users should verify current
// licensing with MD DNR before booking.
const GUIDES: Guide[] = [
  {
    id: 'g-001',
    name: 'Chesapeake Bay Charters Association',
    region: 'chesapeake',
    services: ['striper', 'offshore'],
    website: 'https://www.marylandcharterboats.com',
    notes: 'Directory of USCG-licensed charter captains operating on the Chesapeake.',
  },
  {
    id: 'g-002',
    name: 'Maryland Charter Boat Association',
    region: 'chesapeake',
    services: ['striper'],
    website: 'https://www.fishinmd.com',
    notes: 'Official directory of the MD Charter Boat Association.',
  },
  {
    id: 'g-003',
    name: 'Ocean City Fishing Center',
    region: 'ocean',
    services: ['offshore', 'striper'],
    website: 'https://www.ocfishing.com',
    phone: '410-213-1121',
    notes: 'Ocean City-based charter and head boat fleet.',
  },
  {
    id: 'g-004',
    name: 'Upper Bay Guide Service',
    region: 'chesapeake',
    services: ['striper', 'freshwater'],
    website: 'https://www.upperbayguide.com',
    notes: 'Striped bass and smallmouth guide trips on the upper Chesapeake & Susquehanna Flats.',
  },
  {
    id: 'g-005',
    name: 'Maryland Trout Guides',
    region: 'western',
    services: ['trout', 'fly'],
    website: 'https://www.marylandtroutfishing.com',
    notes: 'Fly and spin trips on the Gunpowder, Savage, North Branch of the Potomac.',
  },
  {
    id: 'g-006',
    name: 'Potomac River Guides',
    region: 'western',
    services: ['freshwater'],
    website: 'https://www.potomacsmallmouth.com',
    notes: 'Smallmouth bass float trips on the upper Potomac.',
  },
  {
    id: 'g-007',
    name: 'Eastern Shore Waterfowl Guides Assn',
    region: 'eastern-shore',
    services: ['waterfowl'],
    website: 'https://www.easternshorewaterfowl.com',
    notes: 'Guided duck and goose hunts on MD\u2019s Eastern Shore.',
  },
  {
    id: 'g-008',
    name: 'Maryland Deer Management Cooperatives',
    region: 'central',
    services: ['deer'],
    website: 'https://dnr.maryland.gov/wildlife/Pages/hunt_trap/deermgmt.aspx',
    notes: 'DNR-facilitated private-land deer management cooperatives.',
  },
  {
    id: 'g-009',
    name: 'Pylesville Outfitters',
    region: 'central',
    services: ['deer', 'turkey', 'upland'],
    website: 'https://www.pylesvilleoutfitters.com',
    notes: 'Hunting preserve and upland bird outfitter in Harford County.',
  },
  {
    id: 'g-010',
    name: 'Deep Creek Lake Guide Service',
    region: 'western',
    services: ['freshwater', 'trout'],
    website: 'https://www.deepcreeklakeguide.com',
    notes: 'Guided trips on Deep Creek Lake and surrounding trout waters.',
  },
];

const REGIONS: (Region | 'all')[] = [
  'all',
  'chesapeake',
  'western',
  'eastern-shore',
  'central',
  'southern',
  'ocean',
];

export default function GuideDirectoryScreen() {
  const [query, setQuery] = useState('');
  const [region, setRegion] = useState<Region | 'all'>('all');

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return GUIDES.filter((g) => {
      if (region !== 'all' && g.region !== region) return false;
      if (!q) return true;
      return (
        g.name.toLowerCase().includes(q) ||
        g.notes.toLowerCase().includes(q) ||
        g.services.some((s) => SERVICE_LABEL[s].toLowerCase().includes(q))
      );
    });
  }, [query, region]);

  const openUrl = async (url?: string) => {
    if (!url) return;
    try {
      const ok = await Linking.canOpenURL(url);
      if (ok) await Linking.openURL(url);
      else Alert.alert('Unable to open', 'Cannot open this link on this device.');
    } catch {
      Alert.alert('Error', 'Failed to open.');
    }
  };

  const callPhone = async (phone?: string) => {
    if (!phone) return;
    const url = `tel:${phone.replace(/[^0-9+]/g, '')}`;
    try {
      const ok = await Linking.canOpenURL(url);
      if (ok) await Linking.openURL(url);
      else Alert.alert('Unable to dial', 'This device cannot place calls.');
    } catch {
      Alert.alert('Error', 'Failed to dial.');
    }
  };

  const renderItem = ({ item }: { item: Guide }) => (
    <View style={styles.card}>
      <Text style={styles.name}>{item.name}</Text>
      <View style={styles.tagRow}>
        <View style={styles.regionTag}>
          <Text style={styles.regionTagText}>{REGION_LABEL[item.region]}</Text>
        </View>
        {item.services.slice(0, 3).map((s) => (
          <View key={s} style={styles.serviceTag}>
            <Text style={styles.serviceTagText}>{SERVICE_LABEL[s]}</Text>
          </View>
        ))}
      </View>
      <Text style={styles.notes}>{item.notes}</Text>
      <View style={styles.actions}>
        {item.phone ? (
          <TouchableOpacity
            style={[styles.action, styles.actionCall]}
            onPress={() => callPhone(item.phone)}
            activeOpacity={0.8}
          >
            <Text style={styles.actionText}>{'\u260E'} {item.phone}</Text>
          </TouchableOpacity>
        ) : null}
        {item.website ? (
          <TouchableOpacity
            style={[styles.action, styles.actionWeb]}
            onPress={() => openUrl(item.website)}
            activeOpacity={0.8}
          >
            <Text style={styles.actionText}>{'\uD83C\uDF10'} Website</Text>
          </TouchableOpacity>
        ) : null}
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.searchBar}>
        <TextInput
          style={styles.search}
          placeholder="Search guides by name, service, or region"
          placeholderTextColor={Colors.textMuted}
          value={query}
          onChangeText={setQuery}
          autoCapitalize="none"
          autoCorrect={false}
        />
      </View>

      {/*
        2026-04-30 (V2.4 audit): horizontal region chip ScrollView
        replaced with a single FilterPicker. Single-select via toggle
        handlers — turning one ON sets the value; turning OFF the
        active one reverts to 'all'.
      */}
      <View style={styles.regionTriggerWrap}>
        <FilterPicker
          triggerLabel={region === 'all' ? 'Region' : REGION_LABEL[region as Region]}
          title="Region"
          compact
          // 2026-04-30 (V2.4 audit): "All Regions" = no filter — never
          // mark it active or the trigger pill says "(1)" with nothing
          // actually being filtered. Same fix as Camp/Hike/Fish maps.
          options={REGIONS.map((r) => ({
            key: r,
            label: r === 'all' ? 'All Regions' : REGION_LABEL[r as Region],
            active: r !== 'all' && region === r,
          }))}
          onChange={(key, next) => {
            if (next) setRegion(key as any);
            else if (region === key) setRegion('all');
          }}
          onClearAll={() => setRegion('all')}
        />
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(g) => g.id}
        renderItem={renderItem}
        contentContainerStyle={styles.list}
        ListHeaderComponent={
          <Text style={styles.disclaimer}>
            MDHuntFishOutdoors does not certify or endorse individual guides or outfitters.
            Verify current MD DNR licensing, insurance, and references before booking.
          </Text>
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyText}>No guides match this filter.</Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  searchBar: {
    padding: 12,
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
  // 2026-04-30 (V2.4): region chip ScrollView retired in favor of
  // FilterPicker. Wrapper provides the same dark-bar chrome below the
  // search bar.
  regionTriggerWrap: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.mud,
  },
  list: { padding: 12, paddingBottom: 32 },
  disclaimer: {
    fontSize: 12,
    color: Colors.textMuted,
    marginBottom: 12,
    lineHeight: 17,
    padding: 10,
    backgroundColor: Colors.surfaceElevated,
    borderRadius: 8,
    borderLeftWidth: 3,
    borderLeftColor: Colors.mdGold,
  },
  card: {
    backgroundColor: Colors.surfaceElevated,
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: Colors.mud,
  },
  name: { fontSize: 15, fontWeight: '700', color: Colors.textPrimary, marginBottom: 6 },
  tagRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 8 },
  regionTag: {
    backgroundColor: Colors.moss,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    marginRight: 6,
    marginBottom: 4,
  },
  regionTagText: { fontSize: 10, fontWeight: '700', color: Colors.textPrimary, letterSpacing: 0.5 },
  serviceTag: {
    backgroundColor: Colors.mud,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    marginRight: 6,
    marginBottom: 4,
  },
  serviceTagText: { fontSize: 10, fontWeight: '600', color: Colors.textMuted, letterSpacing: 0.5 },
  notes: { fontSize: 13, color: Colors.textSecondary, lineHeight: 18, marginBottom: 10 },
  actions: { flexDirection: 'row', gap: 8 },
  action: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    marginRight: 8,
  },
  actionCall: { backgroundColor: Colors.forestDark },
  actionWeb: { backgroundColor: '#1A3A5C' },
  actionText: { color: Colors.textPrimary, fontSize: 12, fontWeight: '600' },
  empty: { padding: 32, alignItems: 'center' },
  emptyText: { fontSize: 14, color: Colors.textMuted },
});
