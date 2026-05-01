/**
 * CampTripPlannerScreen — Multi-day camp itinerary builder.
 *
 * Phase 5A implementation:
 *   - Pick campground (autocomplete from marylandCampgrounds.ts)
 *   - Arrival/departure dates, party size, trip type
 *   - Save trip to AsyncStorage (camp_trips_v1)
 *   - Edit/delete flows
 *
 * Map ↔ Trip Planner handoff (P2):
 *   - Accepts a `campgroundId` route param. When present, the form
 *     pre-selects that campground so the user doesn't have to re-search.
 *     Fired by CampMapScreen's "Plan Trip" button.
 *   - Saved trip rows expose a "Map" action that navigates back to the
 *     Camp Map tab with `focusCampgroundId` set, opening the detail panel
 *     for that campground.
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
  ActivityIndicator,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import Colors from '../theme/colors';
import FilterPicker from '../components/common/FilterPicker';
import { MARYLAND_CAMPGROUNDS } from '../data/marylandCampgrounds';
import type { CampTrip } from '../types/camp';
import { seedFromCampTrip } from '../services/journalSeedService';
import { duplicateCampTrip } from '../services/tripDuplicationService';

/**
 * Route params for CampTripPlannerScreen. `campgroundId`, when present,
 * pre-selects that campground in the picker on screen focus. Set by
 * CampMapScreen → "Plan Trip".
 */
type CampTripPlannerRouteParams = {
  campgroundId?: string;
};

export default function CampTripPlannerScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<RouteProp<Record<string, CampTripPlannerRouteParams>, string>>();
  const handoffCampgroundId = route.params?.campgroundId;
  const [tripName, setTripName] = useState('My Camp Trip');
  const [selectedCampgroundId, setSelectedCampgroundId] = useState<string | null>(null);
  const [arrivalDate, setArrivalDate] = useState('2026-05-01');
  const [departureDate, setDepartureDate] = useState('2026-05-02');
  const [partySize, setPartySize] = useState('4');
  const [tripType, setTripType] = useState<'car_camp' | 'backcountry' | 'group' | 'family' | 'solo'>('family');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [trips, setTrips] = useState<CampTrip[]>([]);
  const [showTrips, setShowTrips] = useState(false);

  // Load trips on mount with migration: backfill tripName from campgroundName for old records
  React.useEffect(() => {
    const loadTrips = async () => {
      try {
        const stored = await AsyncStorage.getItem('camp_trips_v1');
        if (stored) {
          let trips = JSON.parse(stored) as CampTrip[];
          // Migration history (run idempotently every load):
          //   v1 → v1.1 (V2.2): backfill `tripName` from `campgroundName`
          //                     for trips created before tripName was added
          //   v1.1 → v1.2 (V2.4 step 1, 2026-04-30): backfill `inviteCode`
          //                     and `members` so legacy trips can use the
          //                     new Share-Trip-Link flow without forcing
          //                     the user to recreate them. Same eager-
          //                     code pattern as DeerCamp invite fix.
          let mutated = false;
          trips = trips.map((trip) => {
            const next = { ...trip };
            if (!next.tripName) {
              next.tripName = next.campgroundName;
              mutated = true;
            }
            if (!next.inviteCode) {
              next.inviteCode = Math.random().toString(36).substring(2, 8).toUpperCase();
              mutated = true;
            }
            if (!next.members || next.members.length === 0) {
              next.members = [
                {
                  userId: 'self',
                  username: 'You',
                  joinedAt: next.createdAt || new Date().toISOString(),
                  role: 'owner',
                  color: '#4A6741',
                },
              ];
              mutated = true;
            }
            return next;
          });
          setTrips(trips);
          if (mutated) {
            await AsyncStorage.setItem('camp_trips_v1', JSON.stringify(trips));
          }
        }
      } catch {
        //
      }
    };
    loadTrips();
  }, []);

  /**
   * Handoff from CampMapScreen → "Plan Trip". When the route carries a
   * `campgroundId`, auto-fill the campground picker and clear the search.
   * The param is cleared after consumption so re-focusing the tab doesn't
   * re-fire this effect and clobber the user's current edit.
   */
  useEffect(() => {
    if (!handoffCampgroundId) return;
    const match = MARYLAND_CAMPGROUNDS.find((cg) => cg.id === handoffCampgroundId);
    if (!match) return;
    setSelectedCampgroundId(match.id);
    setSearchQuery('');
    // Seed a reasonable default trip name if the user hasn't customized it yet.
    setTripName((prev) =>
      prev === 'My Camp Trip' ? `Trip to ${match.name}` : prev,
    );
    navigation.setParams({ campgroundId: undefined });
  }, [handoffCampgroundId, navigation]);

  /**
   * Reverse handoff — open the selected trip's campground on the Camp Map
   * tab. Cross-tab navigation uses the nested `screen` + `params` shape
   * so the stack inside the target tab receives `focusCampgroundId`.
   */
  const viewTripOnMap = useCallback(
    (campgroundId: string) => {
      navigation.navigate('CampMapTab', {
        screen: 'CampMapMain',
        params: { focusCampgroundId: campgroundId },
      });
    },
    [navigation],
  );

  const campgrounds = MARYLAND_CAMPGROUNDS;

  const filteredCampgrounds = useMemo(() => {
    if (!searchQuery.trim()) return campgrounds;
    const q = searchQuery.toLowerCase();
    return campgrounds.filter(
      (cg) =>
        cg.name.toLowerCase().includes(q) ||
        cg.park.toLowerCase().includes(q),
    );
  }, [searchQuery]);

  const selectedCampground = campgrounds.find((cg) => cg.id === selectedCampgroundId);

  const handleSaveTrip = useCallback(async () => {
    if (!selectedCampgroundId || !tripName.trim() || !arrivalDate || !departureDate) {
      Alert.alert('Incomplete', 'Please fill in trip name, campground, and dates.');
      return;
    }

    setSaving(true);
    try {
      // 2026-04-30 (V2.4 step 1): every CampTrip now ships with an
      // eagerly-generated 6-char alphanumeric inviteCode so the user
      // can share the trip via Universal Link the same way Deer Camp
      // and Honey Hole invites work. Eager generation pattern is
      // locked by `live_audit_round_2_invite_code_bug_2026_04_28` —
      // V2.3 had this bug for Deer Camps, fixed there, copying the
      // pattern here. Includes the owner as the first member so the
      // members[] field is non-empty from creation.
      const inviteCode = Math.random().toString(36).substring(2, 8).toUpperCase();
      const trip: CampTrip = {
        id: `trip-${Date.now()}`,
        campgroundId: selectedCampgroundId,
        campgroundName: selectedCampground?.name || 'Unknown',
        tripName: tripName.trim(),
        arrivalDate,
        departureDate,
        partySize: parseInt(partySize, 10) || 1,
        tripType,
        notes: notes.trim() || null,
        gearChecklistId: null,
        groupCampId: null,
        inviteCode,
        members: [
          {
            userId: 'self',
            username: 'You',
            joinedAt: new Date().toISOString(),
            role: 'owner',
            color: '#4A6741',
          },
        ],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const updated = [...trips, trip];
      await AsyncStorage.setItem('camp_trips_v1', JSON.stringify(updated));
      setTrips(updated);

      Alert.alert('Saved', `Trip '${tripName}' saved to your device.`);
      setTripName('My Camp Trip');
      setSelectedCampgroundId(null);
      setArrivalDate('2026-05-01');
      setDepartureDate('2026-05-02');
      setPartySize('4');
      setNotes('');
      setShowTrips(true);
    } catch (err) {
      Alert.alert('Error', 'Failed to save trip.');
    } finally {
      setSaving(false);
    }
  }, [selectedCampgroundId, tripName, arrivalDate, departureDate, partySize, tripType, notes, trips, selectedCampground]);

  const handleDeleteTrip = useCallback(
    async (tripId: string) => {
      Alert.alert('Delete Trip', 'Are you sure?', [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const updated = trips.filter((t) => t.id !== tripId);
              await AsyncStorage.setItem('camp_trips_v1', JSON.stringify(updated));
              setTrips(updated);
            } catch {
              Alert.alert('Error', 'Failed to delete trip.');
            }
          },
        },
      ]);
    },
    [trips],
  );

  const renderCampgroundOption = ({ item }: { item: typeof campgrounds[0] }) => (
    <TouchableOpacity
      style={[styles.campgroundOption, selectedCampgroundId === item.id && styles.campgroundOptionSelected]}
      onPress={() => {
        setSelectedCampgroundId(item.id);
        setSearchQuery('');
      }}
    >
      <View style={{ flex: 1 }}>
        <Text style={styles.campgroundOptionName}>{item.name}</Text>
        <Text style={styles.campgroundOptionMeta}>{item.park}</Text>
      </View>
      {selectedCampgroundId === item.id && <Text style={styles.checkmark}>✓</Text>}
    </TouchableOpacity>
  );

  /**
   * Reverse handoff — seed a new journal entry from a saved trip. Phase A.27:
   * eliminates the "blank journal screen" friction by pre-filling
   * mode/date/title/body/tags/locationLabel from the trip plan. JournalEdit
   * is mounted in the same tab stack via PersonalLayerScreens(), so this is
   * a same-stack push.
   */
  const logTripJournal = useCallback(
    (trip: CampTrip) => {
      navigation.navigate('JournalEdit', {
        mode: 'camp',
        seed: seedFromCampTrip(trip),
      });
    },
    [navigation],
  );

  /**
   * Phase A.40 — clone a saved trip into a fresh "Copy of …" entry,
   * persist it, and surface a confirmation. The user can then jump to
   * the duplicate via the saved-trips list and tweak whatever they
   * want (date, party, notes) without re-entering the campground +
   * party + dates from scratch.
   */
  const handleDuplicateTrip = useCallback(
    async (trip: CampTrip) => {
      try {
        const dup = duplicateCampTrip(trip);
        const updated = [...trips, dup];
        await AsyncStorage.setItem('camp_trips_v1', JSON.stringify(updated));
        setTrips(updated);
        setShowTrips(true);
        Alert.alert('Duplicated', `'${dup.tripName}' added to your saved trips.`);
      } catch {
        Alert.alert('Error', 'Failed to duplicate trip.');
      }
    },
    [trips],
  );

  /**
   * Share a CampTrip via the iOS share sheet using a Universal Link
   * encoded with the trip's inviteCode. Mirrors the DeerCamp /
   * HoneyHole invite flow set up in the V2.3 audit (see
   * `live_audit_round_2_invite_code_bug_2026_04_28.md`). The recipient
   * taps the link, the deepLinkRouter recognizes the `/trip/{code}`
   * path, and the app opens directly to the trip with the user joined.
   *
   * 2026-04-30 (V2.4 step 1): added so users can invite others to a
   * trip the same way they invite to a Deer Camp.
   */
  const handleShareTripLink = useCallback(
    async (trip: CampTrip) => {
      try {
        // Local import to avoid pulling Share into the top of the file
        // for a single use; React Native's Share is already available
        // via the runtime so requireing it inline keeps the import list
        // tighter.
        const { Share } = require('react-native');
        const url = `https://davidstonko.github.io/huntmaryland-site/trip/${trip.inviteCode}`;
        const message = `Join my Maryland camping trip "${trip.tripName}" at ${trip.campgroundName} (${trip.arrivalDate} → ${trip.departureDate}) on MDHuntFishOutdoors: ${url}`;
        await Share.share({ message, url });
      } catch (err) {
        // User-cancelled is the most common path — silently no-op.
      }
    },
    [],
  );

  const renderTrip = ({ item }: { item: CampTrip }) => (
    <View style={styles.tripRow}>
      <View style={{ flex: 1 }}>
        <Text style={styles.tripName} numberOfLines={1}>{item.tripName}</Text>
        <Text style={styles.tripMeta}>
          {item.arrivalDate} — {item.departureDate} • {item.partySize} people • {item.campgroundName}
        </Text>
      </View>
      <TouchableOpacity
        style={styles.tripShareBtn}
        onPress={() => handleShareTripLink(item)}
        accessibilityLabel={`Share invite link for ${item.tripName}`}
      >
        <Text style={styles.tripShareBtnText}>SHARE</Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={styles.tripLogBtn}
        onPress={() => logTripJournal(item)}
        accessibilityLabel={`Log a journal entry from ${item.tripName}`}
      >
        <Text style={styles.tripLogBtnText}>LOG</Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={styles.tripMapBtn}
        onPress={() => viewTripOnMap(item.campgroundId)}
        accessibilityLabel={`View ${item.campgroundName} on map`}
      >
        <Text style={styles.tripMapBtnText}>MAP</Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={styles.tripDupBtn}
        onPress={() => handleDuplicateTrip(item)}
        accessibilityLabel={`Duplicate ${item.tripName}`}
      >
        <Text style={styles.tripDupBtnText}>DUP</Text>
      </TouchableOpacity>
      <TouchableOpacity onPress={() => handleDeleteTrip(item.id)}>
        <Text style={styles.tripDeleteBtn}>×</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.heading}>Trip Planner</Text>

      {/* Trip Name */}
      <View style={styles.section}>
        <Text style={styles.sectionLabel}>Trip Name</Text>
        <TextInput
          style={styles.input}
          placeholder="e.g., Memorial Day at Assateague"
          placeholderTextColor={Colors.textMuted}
          value={tripName}
          onChangeText={setTripName}
        />
      </View>

      {/* Campground Selector */}
      <View style={styles.section}>
        <Text style={styles.sectionLabel}>Select Campground</Text>
        <TextInput
          style={styles.searchInput}
          placeholder="Search campgrounds..."
          placeholderTextColor={Colors.textMuted}
          value={searchQuery}
          onChangeText={setSearchQuery}
          autoCorrect={false}
        />
        <FlatList
          data={filteredCampgrounds}
          renderItem={renderCampgroundOption}
          keyExtractor={(cg) => cg.id}
          scrollEnabled={false}
          style={{ marginTop: 10 }}
        />
      </View>

      {/* Dates */}
      <View style={styles.section}>
        <Text style={styles.sectionLabel}>Dates</Text>
        <View style={styles.dateRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.dateLabel}>Arrival</Text>
            <TextInput
              style={styles.dateInput}
              placeholder="YYYY-MM-DD"
              value={arrivalDate}
              onChangeText={setArrivalDate}
            />
          </View>
          <View style={{ flex: 1, marginLeft: 8 }}>
            <Text style={styles.dateLabel}>Departure</Text>
            <TextInput
              style={styles.dateInput}
              placeholder="YYYY-MM-DD"
              value={departureDate}
              onChangeText={setDepartureDate}
            />
          </View>
        </View>
      </View>

      {/* Party Size & Trip Type */}
      <View style={styles.section}>
        <Text style={styles.sectionLabel}>Details</Text>
        <View style={styles.detailRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.detailLabel}>Party Size</Text>
            <TextInput
              style={styles.detailInput}
              placeholder="4"
              value={partySize}
              onChangeText={setPartySize}
              keyboardType="number-pad"
            />
          </View>
          <View style={{ flex: 1, marginLeft: 8 }}>
            <Text style={styles.detailLabel}>Trip Type</Text>
            {/*
              2026-04-30 (V2.4 audit): horizontal chip row for trip
              type replaced with FilterPicker. 5 chips (Car / Family /
              Solo / Group / Backcountry) clipped on smaller screens
              and inside this nested column they had even less
              horizontal room. Single-select via toggle handler.
            */}
            <FilterPicker
              triggerLabel={
                tripType === 'car_camp'
                  ? 'Car Camping'
                  : tripType.charAt(0).toUpperCase() + tripType.slice(1)
              }
              title="Trip Type"
              compact
              options={[
                { key: 'car_camp', label: 'Car Camping', hint: 'Drive-in established sites', active: tripType === 'car_camp' },
                { key: 'family', label: 'Family', hint: 'Multi-generation, kids welcome', active: tripType === 'family' },
                { key: 'solo', label: 'Solo', hint: 'Going alone', active: tripType === 'solo' },
                { key: 'group', label: 'Group', hint: 'Friends or club outing', active: tripType === 'group' },
                { key: 'backcountry', label: 'Backcountry', hint: 'Hike-in / primitive', active: tripType === 'backcountry' },
              ]}
              onChange={(key, next) => {
                if (next) setTripType(key as any);
              }}
            />
          </View>
        </View>
      </View>

      {/* Notes */}
      <View style={styles.section}>
        <Text style={styles.sectionLabel}>Notes</Text>
        <TextInput
          style={styles.notesInput}
          placeholder="Any special plans or reminders?"
          placeholderTextColor={Colors.textMuted}
          value={notes}
          onChangeText={setNotes}
          multiline
        />
      </View>

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

      {/* Trip List */}
      {trips.length > 0 && (
        <View style={styles.section}>
          <TouchableOpacity
            style={styles.tripsHeader}
            onPress={() => setShowTrips(!showTrips)}
          >
            <Text style={styles.tripsTitle}>Saved Trips ({trips.length})</Text>
            <Text style={styles.tripsToggle}>{showTrips ? '−' : '+'}</Text>
          </TouchableOpacity>
          {showTrips && (
            <FlatList
              data={trips}
              renderItem={renderTrip}
              keyExtractor={(t) => t.id}
              scrollEnabled={false}
              style={{ marginTop: 12 }}
            />
          )}
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
  campgroundOption: {
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
  campgroundOptionSelected: {
    backgroundColor: Colors.forestDark,
    borderColor: Colors.moss,
  },
  campgroundOptionName: { fontSize: 13, fontWeight: '700', color: Colors.textPrimary },
  campgroundOptionMeta: { fontSize: 11, color: Colors.textMuted, marginTop: 2 },
  checkmark: { fontSize: 18, color: Colors.moss, marginLeft: 8 },
  dateRow: { flexDirection: 'row', gap: 8 },
  dateLabel: { fontSize: 11, fontWeight: '600', color: Colors.textMuted, marginBottom: 4 },
  dateInput: {
    backgroundColor: Colors.surfaceElevated,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.mud,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 12,
    color: Colors.textPrimary,
  },
  detailRow: { flexDirection: 'row', gap: 8 },
  detailLabel: { fontSize: 11, fontWeight: '600', color: Colors.textMuted, marginBottom: 4 },
  detailInput: {
    backgroundColor: Colors.surfaceElevated,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.mud,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 12,
    color: Colors.textPrimary,
  },
  typeChip: {
    backgroundColor: Colors.surface,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginRight: 8,
    borderWidth: 1,
    borderColor: Colors.mud,
  },
  typeChipActive: {
    backgroundColor: Colors.moss,
    borderColor: Colors.moss,
  },
  typeChipText: { fontSize: 10, fontWeight: '600', color: Colors.textSecondary },
  typeChipTextActive: { color: Colors.textPrimary },
  notesInput: {
    backgroundColor: Colors.surfaceElevated,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.mud,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 13,
    color: Colors.textPrimary,
    minHeight: 80,
  },
  saveBtn: {
    backgroundColor: Colors.moss,
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 12,
  },
  saveBtnText: { fontSize: 13, fontWeight: '700', color: Colors.textPrimary },
  tripsHeader: {
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
  tripMapBtn: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    backgroundColor: Colors.moss,
    minWidth: 36,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  tripMapBtnText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  tripLogBtn: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    backgroundColor: Colors.amber,
    minWidth: 36,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 6,
  },
  // 2026-04-30 (V2.4 step 1): SHARE button. Water-blue accent differs
  // from moss=MAP, amber=LOG, and the tan DUP chip so the action row
  // stays glanceable. Uses the same paddings/typography as the others.
  tripShareBtn: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    backgroundColor: Colors.water,
    minWidth: 44,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 6,
  },
  tripShareBtnText: {
    color: Colors.textOnAccent,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  tripLogBtnText: {
    color: Colors.textOnAccent,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  // Phase A.40 — DUP button. Tan-on-mud chip differentiates from
  // moss=MAP and amber=LOG so the row stays scannable at a glance.
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
