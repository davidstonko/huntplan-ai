/**
 * ATTripPlannerScreen — AT section-hike trip planner with 3-tier gear.
 *
 * Phase 5B implementation:
 *   - Trail selector (state-park trails)
 *   - Nights selector (0 / 1 / 2+) → auto-resolve to tier
 *   - 3-tier gear bundle display with GEAR_CATALOG items
 *   - Each item is a GEAR_CATALOG reference with amazon affiliate link
 *   - Save trip to AsyncStorage (hike_trips_v1)
 *   - For AT section hikes, list on-route shelters with distance markers
 *   - Accepts { trailId } route param from HikeTrailBrowser handoff to
 *     pre-select a trail; param is consumed and cleared so re-focus doesn't
 *     reset user edits.
 */

import React, { useState, useMemo, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Alert,
  Linking,
  ActivityIndicator,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import Colors from '../theme/colors';
import { MARYLAND_STATE_PARK_TRAILS } from '../data/marylandStateParkTrails';
import { MARYLAND_APPALACHIAN_TRAIL } from '../data/marylandATTrail';
import { HIKE_GEAR_BUNDLES, nightsToTier } from '../data/hikeGearBundles';
import { amazonLink } from './StarterGearScreen';
import type { HikeTrip, HikeTier } from '../types/hike';
import { seedFromHikeTrip } from '../services/journalSeedService';
import { duplicateHikeTrip } from '../services/tripDuplicationService';

interface GearCatalogItem {
  id: string;
  name: string;
  asin?: string;
  estimatedPrice?: string;
  category?: string;
}

/**
 * Minimal GEAR_CATALOG excerpt for reference.
 * In production, import the full catalog or fetch from API.
 */
const GEAR_CATALOG_REF: Record<string, GearCatalogItem> = {
  'hike-pack-day': {
    id: 'hike-pack-day',
    name: 'Daypack (24–30 L)',
    asin: 'B06WWJJ2V7',
    estimatedPrice: '$40–120',
    category: 'pack',
  },
  'hike-pack-overnight': {
    id: 'hike-pack-overnight',
    name: 'Overnight Backpack (45–55 L)',
    estimatedPrice: '$140–320',
    category: 'pack',
  },
  'hunt-first-aid': {
    id: 'hunt-first-aid',
    name: 'Compact First Aid Kit',
    asin: 'B0DV6NTJBK',
    estimatedPrice: '$25–60',
    category: 'safety',
  },
  'hike-filter-bottle': {
    id: 'hike-filter-bottle',
    name: 'Squeeze Filter + 2L Bladder',
    asin: 'B08HWP19XK',
    estimatedPrice: '$35–70',
    category: 'hydration',
  },
  'hike-boots': {
    id: 'hike-boots',
    name: 'Mid-Cut Hiking Boots',
    estimatedPrice: '$120–280',
    category: 'clothing',
  },
  'camp-bag-20f': {
    id: 'camp-bag-20f',
    name: '20°F Sleeping Bag (Synthetic)',
    asin: 'B015GXSU3E',
    estimatedPrice: '$70–200',
    category: 'sleep',
  },
  'camp-pad-inflatable': {
    id: 'camp-pad-inflatable',
    name: 'Inflatable Sleeping Pad (R ≥ 3)',
    asin: 'B0D92WP6Y4',
    estimatedPrice: '$60–180',
    category: 'sleep',
  },
  'camp-stove-canister': {
    id: 'camp-stove-canister',
    name: 'Canister Stove (Backpacking)',
    asin: 'B01N5O7551',
    estimatedPrice: '$15–80',
    category: 'kitchen',
  },
  'camp-cookset': {
    id: 'camp-cookset',
    name: 'Nesting Cook Pot Set',
    estimatedPrice: '$30–90',
    category: 'kitchen',
  },
  'hike-rain-shell': {
    id: 'hike-rain-shell',
    name: 'Packable Rain Shell',
    estimatedPrice: '$80–220',
    category: 'clothing',
  },
  'hike-prb': {
    id: 'hike-prb',
    name: 'Personal Locator Beacon',
    estimatedPrice: '$250–500',
    category: 'safety',
  },
};

type ATTripPlannerRouteParams = {
  trailId?: string;
};

export default function ATTripPlannerScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<RouteProp<Record<string, ATTripPlannerRouteParams>, string>>();
  const handoffTrailId = route.params?.trailId;

  const [tripName, setTripName] = useState('My Hike');
  const [selectedTrailId, setSelectedTrailId] = useState<string | null>(null);
  const [nights, setNights] = useState(0);
  const [showGearList, setShowGearList] = useState(false);
  const [saving, setSaving] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [savedTrips, setSavedTrips] = useState<HikeTrip[]>([]);
  const [showTrips, setShowTrips] = useState(false);

  // Load any previously-saved hike trips so the user can re-open and log
  // a journal entry from one (Phase A.27 trip→journal handoff).
  useEffect(() => {
    const load = async () => {
      try {
        const stored = await AsyncStorage.getItem('hike_trips_v1');
        if (stored) {
          setSavedTrips(JSON.parse(stored) as HikeTrip[]);
        }
      } catch {
        //
      }
    };
    load();
  }, []);

  // Add AT trail as a synthetic entry for the trail selector
  const trails = [
    {
      id: 'md-appalachian-trail',
      name: 'Maryland Appalachian Trail',
      park: 'Appalachian Trail Conservancy',
      county: 'Washington',
      type: 'point-to-point' as const,
      difficulty: 'moderate' as const,
      lengthMi: MARYLAND_APPALACHIAN_TRAIL.totalLengthMi,
      elevationGainFt: 12000, // approximate cumulative elevation
      estDurationMin: 2700, // ~45 hours of hiking
      dogFriendly: true,
      seasonOpenMonth: null,
      seasonCloseMonth: null,
      trailheadLat: 39.3239, // Harpers Ferry (south end)
      trailheadLon: -77.7276,
      coordinates: MARYLAND_APPALACHIAN_TRAIL.coordinates as number[][],
      description: 'Maryland section of the Appalachian Trail, a 40.9-mile foot-hiking path from Harpers Ferry to the Pennsylvania border.',
      tags: ['appalachian-trail', 'shelter', 'scenic', 'long-distance'],
      highlights: ['9 shelters', 'Annapolis Rocks overlook', 'Weverton Cliffs', 'Pen Mar'],
    },
    ...MARYLAND_STATE_PARK_TRAILS,
  ];

  // Consume incoming handoff from HikeTrailBrowser. Only overrides the trip
  // name if the user hasn't customized it yet.
  useEffect(() => {
    if (!handoffTrailId) return;
    const match = trails.find((t) => t.id === handoffTrailId);
    if (!match) return;
    setSelectedTrailId(match.id);
    setSearchQuery('');
    setTripName((prev) => (prev === 'My Hike' ? `Hike: ${match.name}` : prev));
    navigation.setParams({ trailId: undefined });
  }, [handoffTrailId, navigation, trails]);

  const filteredTrails = useMemo(() => {
    if (!searchQuery.trim()) return trails;
    const q = searchQuery.toLowerCase();
    return trails.filter(
      (t) =>
        t.name.toLowerCase().includes(q) ||
        t.park.toLowerCase().includes(q),
    );
  }, [searchQuery]);

  const tier: HikeTier = nightsToTier(nights);
  const bundle = HIKE_GEAR_BUNDLES.find((b) => b.tier === tier);

  const selectedTrail = trails.find((t) => t.id === selectedTrailId);

  // For AT trips, list shelters along the route
  const relevantShelters = useMemo(() => {
    if (!selectedTrailId || selectedTrailId !== 'md-appalachian-trail') {
      return [];
    }
    return MARYLAND_APPALACHIAN_TRAIL.shelters.slice(0, Math.ceil((nights + 1) * 2));
  }, [selectedTrailId, nights]);

  const handleSaveTrip = useCallback(async () => {
    if (!selectedTrailId || !tripName.trim()) {
      Alert.alert('Incomplete', 'Please name your trip and select a trail.');
      return;
    }

    setSaving(true);
    try {
      const trip: HikeTrip = {
        id: `trip-${Date.now()}`,
        name: tripName,
        trailId: selectedTrailId,
        startTrailheadId: selectedTrail?.id || null,
        endTrailheadId: null,
        startDate: new Date().toISOString().split('T')[0],
        nights,
        partySize: 1,
        tier,
        plannedShelterIds: relevantShelters.map((s) => s.id),
        plannedMileage: selectedTrail?.lengthMi || 0,
        gearChecklistId: null,
        notes: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const existing = await AsyncStorage.getItem('hike_trips_v1');
      const trips = existing ? JSON.parse(existing) : [];
      trips.push(trip);
      await AsyncStorage.setItem('hike_trips_v1', JSON.stringify(trips));
      setSavedTrips(trips);

      Alert.alert('Saved', `Trip '${tripName}' saved to your device.`);
      setTripName('My Hike');
      setSelectedTrailId(null);
      setNights(0);
    } catch (err) {
      Alert.alert('Error', 'Failed to save trip.');
    } finally {
      setSaving(false);
    }
  }, [selectedTrailId, tripName, nights, tier, selectedTrail, relevantShelters]);

  /**
   * Phase A.27 trip→journal handoff. JournalEdit lives inside this stack
   * via PersonalLayerScreens(), so we can push directly. The seed adapter
   * pre-fills mode/date/title/body/tags from the saved trip.
   */
  const logTripJournal = useCallback(
    (trip: HikeTrip) => {
      navigation.navigate('JournalEdit', {
        mode: 'hike',
        seed: seedFromHikeTrip(trip),
      });
    },
    [navigation],
  );

  /**
   * Phase A.40 — clone a saved hike trip into a fresh "Copy of …"
   * entry, persist it, surface a confirmation. Duplicates use today's
   * date as the new startDate (most users duplicating a hike are
   * planning a NEW outing rather than re-entering the same date).
   */
  const handleDuplicateTrip = useCallback(
    async (trip: HikeTrip) => {
      try {
        const dup = duplicateHikeTrip(trip);
        const next = [...savedTrips, dup];
        setSavedTrips(next);
        await AsyncStorage.setItem('hike_trips_v1', JSON.stringify(next));
        setShowTrips(true);
        Alert.alert('Duplicated', `'${dup.name}' added to your saved trips.`);
      } catch {
        Alert.alert('Error', 'Failed to duplicate trip.');
      }
    },
    [savedTrips],
  );

  const handleDeleteSavedTrip = useCallback(
    (id: string) => {
      Alert.alert('Delete Trip', 'Remove this saved hike trip?', [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            const next = savedTrips.filter((t) => t.id !== id);
            setSavedTrips(next);
            try {
              await AsyncStorage.setItem('hike_trips_v1', JSON.stringify(next));
            } catch {
              //
            }
          },
        },
      ]);
    },
    [savedTrips],
  );

  const renderTrailOption = ({ item }: { item: typeof trails[0] }) => (
    <TouchableOpacity
      style={[styles.trailOption, selectedTrailId === item.id && styles.trailOptionSelected]}
      onPress={() => setSelectedTrailId(item.id)}
    >
      <View style={{ flex: 1 }}>
        <Text style={styles.trailOptionName}>{item.name}</Text>
        <Text style={styles.trailOptionMeta}>
          {item.lengthMi} mi • {item.elevationGainFt} ft • {item.difficulty}
        </Text>
      </View>
      {selectedTrailId === item.id && <Text style={styles.checkmark}>✓</Text>}
    </TouchableOpacity>
  );

  const renderGearItem = ({ item }: { item: string }) => {
    const gearItem = GEAR_CATALOG_REF[item];
    if (!gearItem) return null;

    const affiliateUrl = gearItem.asin
      ? amazonLink({ asin: gearItem.asin, query: gearItem.name })
      : amazonLink({ query: gearItem.name });

    const handlePress = async () => {
      try {
        const supported = await Linking.canOpenURL(affiliateUrl);
        if (supported) {
          await Linking.openURL(affiliateUrl);
        }
      } catch {
        //
      }
    };

    return (
      <TouchableOpacity style={styles.gearItem} onPress={handlePress} activeOpacity={0.7}>
        <View style={{ flex: 1 }}>
          <Text style={styles.gearItemName}>{gearItem.name}</Text>
          {gearItem.category && (
            <Text style={styles.gearItemCategory}>{gearItem.category}</Text>
          )}
        </View>
        <View style={styles.gearItemRight}>
          {gearItem.estimatedPrice && (
            <Text style={styles.gearItemPrice}>{gearItem.estimatedPrice}</Text>
          )}
          <Text style={styles.gearItemLink}>Amazon ›</Text>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.heading}>Trip Planner</Text>

      {/* Trip Name */}
      <View style={styles.section}>
        <Text style={styles.sectionLabel}>Trip Name</Text>
        <TextInput
          style={styles.input}
          placeholder="e.g., Pen Mar to Rocky Run"
          placeholderTextColor={Colors.textMuted}
          value={tripName}
          onChangeText={setTripName}
        />
      </View>

      {/* Trail Selector */}
      <View style={styles.section}>
        <Text style={styles.sectionLabel}>Select Trail</Text>
        <TextInput
          style={styles.searchInput}
          placeholder="Search trails..."
          placeholderTextColor={Colors.textMuted}
          value={searchQuery}
          onChangeText={setSearchQuery}
          autoCorrect={false}
        />
        <FlatList
          data={filteredTrails}
          renderItem={renderTrailOption}
          keyExtractor={(t) => t.id}
          scrollEnabled={false}
          style={{ marginTop: 10 }}
        />
      </View>

      {/* Nights Selector */}
      <View style={styles.section}>
        <Text style={styles.sectionLabel}>Duration</Text>
        <View style={styles.nightsRow}>
          {[0, 1, 2].map((n) => (
            <TouchableOpacity
              key={n}
              style={[styles.nightsBtn, nights === n && styles.nightsBtnActive]}
              onPress={() => setNights(n)}
            >
              <Text
                style={[
                  styles.nightsBtnText,
                  nights === n && styles.nightsBtnTextActive,
                ]}
              >
                {n === 0 ? 'Day' : `${n} Night${n > 1 ? 's' : ''}`}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
        <Text style={styles.tierLabel}>
          Gear Tier: <Text style={{ fontWeight: '700' }}>{tier.toUpperCase()}</Text>
        </Text>
      </View>

      {/* Relevant Shelters (for AT) */}
      {relevantShelters.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>On-Route Shelters</Text>
          {relevantShelters.map((shelter) => (
            <View key={shelter.id} style={styles.shelterRow}>
              <Text style={styles.shelterName}>{shelter.name}</Text>
              <Text style={styles.shelterMi}>{shelter.mileFromSouth} mi</Text>
            </View>
          ))}
        </View>
      )}

      {/* Gear Bundle Preview */}
      {bundle && (
        <View style={styles.section}>
          <TouchableOpacity
            style={styles.bundleHeader}
            onPress={() => setShowGearList(!showGearList)}
          >
            <View>
              <Text style={styles.bundleLabel}>{bundle.label}</Text>
              <Text style={styles.bundleHint}>{bundle.distanceHint}</Text>
            </View>
            <Text style={styles.bundleToggle}>{showGearList ? '−' : '+'}</Text>
          </TouchableOpacity>

          {showGearList && (
            <FlatList
              data={bundle.itemIds}
              renderItem={renderGearItem}
              keyExtractor={(id) => id}
              scrollEnabled={false}
              style={{ marginTop: 12 }}
            />
          )}
        </View>
      )}

      {/* Save Button */}
      <TouchableOpacity
        style={[styles.saveBtn, saving && { opacity: 0.6 }]}
        onPress={handleSaveTrip}
        disabled={saving}
        activeOpacity={0.8}
      >
        {saving ? (
          <ActivityIndicator color={Colors.textPrimary} />
        ) : (
          <Text style={styles.saveBtnText}>Save Trip</Text>
        )}
      </TouchableOpacity>

      {/* Saved Trips — Phase A.27 lets a user pick a past trip and seed a
          journal entry from it (mode/date/title/body/tags pre-filled). */}
      {savedTrips.length > 0 && (
        <View style={styles.tripsSection}>
          <TouchableOpacity
            style={styles.tripsHeader}
            onPress={() => setShowTrips(!showTrips)}
          >
            <Text style={styles.tripsTitle}>
              Saved Trips ({savedTrips.length})
            </Text>
            <Text style={styles.tripsToggle}>{showTrips ? '−' : '+'}</Text>
          </TouchableOpacity>
          {showTrips &&
            savedTrips
              .slice()
              .reverse()
              .map((trip) => (
                <View key={trip.id} style={styles.tripRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.tripName} numberOfLines={1}>
                      {trip.name}
                    </Text>
                    <Text style={styles.tripMeta}>
                      {trip.startDate} • {trip.nights === 0 ? 'day hike' : `${trip.nights}n`} •{' '}
                      {trip.plannedMileage > 0 ? `${trip.plannedMileage.toFixed(1)} mi` : '—'} •{' '}
                      tier {trip.tier}
                    </Text>
                  </View>
                  <TouchableOpacity
                    style={styles.tripLogBtn}
                    onPress={() => logTripJournal(trip)}
                    accessibilityLabel={`Log a journal entry from ${trip.name}`}
                  >
                    <Text style={styles.tripLogBtnText}>LOG</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.tripDupBtn}
                    onPress={() => handleDuplicateTrip(trip)}
                    accessibilityLabel={`Duplicate ${trip.name}`}
                  >
                    <Text style={styles.tripDupBtnText}>DUP</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => handleDeleteSavedTrip(trip.id)}
                    accessibilityLabel={`Delete ${trip.name}`}
                  >
                    <Text style={styles.tripDeleteBtn}>×</Text>
                  </TouchableOpacity>
                </View>
              ))}
        </View>
      )}

      <View style={{ height: 20 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { padding: 16, paddingBottom: 32 },
  heading: { fontSize: 20, fontWeight: '700', color: Colors.textPrimary, marginBottom: 20 },
  section: { marginBottom: 20 },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.mdGold,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 8,
  },
  input: {
    backgroundColor: Colors.surfaceElevated,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.mud,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 13,
    color: Colors.textPrimary,
  },
  searchInput: {
    backgroundColor: Colors.surfaceElevated,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.mud,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 13,
    color: Colors.textPrimary,
    marginBottom: 10,
  },
  trailOption: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: Colors.mud,
  },
  trailOptionSelected: {
    backgroundColor: Colors.forestDark,
    borderColor: Colors.moss,
  },
  trailOptionName: { fontSize: 13, fontWeight: '700', color: Colors.textPrimary },
  trailOptionMeta: { fontSize: 11, color: Colors.textMuted, marginTop: 2 },
  checkmark: { fontSize: 18, color: Colors.moss, marginLeft: 8 },
  nightsRow: { flexDirection: 'row', gap: 8, marginBottom: 10 },
  nightsBtn: {
    flex: 1,
    backgroundColor: Colors.surface,
    borderRadius: 8,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: Colors.mud,
    alignItems: 'center',
  },
  nightsBtnActive: {
    backgroundColor: Colors.moss,
    borderColor: Colors.moss,
  },
  nightsBtnText: { fontSize: 12, fontWeight: '600', color: Colors.textSecondary },
  nightsBtnTextActive: { color: Colors.textPrimary },
  tierLabel: { fontSize: 12, color: Colors.textMuted },
  shelterRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: Colors.surface,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 6,
    borderWidth: 1,
    borderColor: Colors.mud,
  },
  shelterName: { fontSize: 12, color: Colors.textPrimary, fontWeight: '600' },
  shelterMi: { fontSize: 12, color: Colors.textMuted },
  bundleHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: Colors.surfaceElevated,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: Colors.mud,
  },
  bundleLabel: { fontSize: 13, fontWeight: '700', color: Colors.textPrimary },
  bundleHint: { fontSize: 11, color: Colors.textMuted, marginTop: 2 },
  bundleToggle: { fontSize: 16, color: Colors.textSecondary },
  gearItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.surface,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 6,
    borderWidth: 1,
    borderColor: Colors.mud,
  },
  gearItemName: { fontSize: 12, fontWeight: '600', color: Colors.textPrimary },
  gearItemCategory: { fontSize: 10, color: Colors.textMuted, marginTop: 2 },
  gearItemRight: { alignItems: 'flex-end' },
  gearItemPrice: { fontSize: 11, color: Colors.tan, fontWeight: '600' },
  gearItemLink: { fontSize: 11, color: Colors.moss, marginTop: 2 },
  saveBtn: {
    backgroundColor: Colors.moss,
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 12,
  },
  saveBtnText: { fontSize: 13, fontWeight: '700', color: Colors.textPrimary },
  tripsSection: {
    marginTop: 24,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: Colors.mud,
  },
  tripsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  tripsTitle: { fontSize: 13, fontWeight: '700', color: Colors.textPrimary },
  tripsToggle: { fontSize: 16, color: Colors.textSecondary },
  tripRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 6,
    borderWidth: 1,
    borderColor: Colors.mud,
  },
  tripName: { fontSize: 12, fontWeight: '600', color: Colors.textPrimary },
  tripMeta: { fontSize: 10, color: Colors.textMuted, marginTop: 2 },
  tripDeleteBtn: { fontSize: 20, color: Colors.rust, paddingLeft: 8 },
  tripLogBtn: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    backgroundColor: Colors.amber,
    minWidth: 36,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  tripLogBtnText: {
    color: Colors.textOnAccent,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  // Phase A.40 — DUP chip mirrors CampTripPlannerScreen for visual
  // consistency across the two planner surfaces.
  tripDupBtn: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    backgroundColor: Colors.mud,
    borderWidth: 1,
    borderColor: Colors.tan,
    minWidth: 36,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  tripDupBtnText: {
    color: Colors.tan,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
});
