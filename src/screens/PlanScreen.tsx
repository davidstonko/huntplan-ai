import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Modal,
  TextInput,
  ScrollView,
  Alert,
} from 'react-native';
import Colors from '../theme/colors';
import {
  marylandPublicLands,
  MarylandPublicLand,
  filterLands,
  searchLands,
} from '../data/marylandPublicLands';

// ── Season Data (2025–2026 Maryland) ──
interface SeasonInfo {
  species: string;
  weapon: string;
  startDate: string;
  endDate: string;
  notes?: string;
}

const MD_SEASONS: SeasonInfo[] = [
  // Deer
  { species: 'Deer', weapon: 'Archery', startDate: '2025-09-06', endDate: '2026-01-31', notes: 'Includes Sept early & late archery' },
  { species: 'Deer', weapon: 'Firearms', startDate: '2025-11-29', endDate: '2025-12-13' },
  { species: 'Deer', weapon: 'Muzzleloader', startDate: '2025-12-14', endDate: '2025-12-20' },
  { species: 'Deer', weapon: 'Antlerless Firearms', startDate: '2026-01-02', endDate: '2026-01-10' },
  // Turkey
  { species: 'Turkey', weapon: 'Archery', startDate: '2025-09-15', endDate: '2025-09-27' },
  { species: 'Turkey', weapon: 'Firearms (Spring)', startDate: '2025-04-14', endDate: '2025-05-17' },
  { species: 'Turkey', weapon: 'Firearms (Fall)', startDate: '2025-10-25', endDate: '2025-11-01' },
  // Bear
  { species: 'Bear', weapon: 'Archery', startDate: '2025-10-18', endDate: '2025-10-25' },
  { species: 'Bear', weapon: 'Firearms', startDate: '2025-10-27', endDate: '2025-10-31' },
  // Waterfowl
  { species: 'Waterfowl', weapon: 'Shotgun', startDate: '2025-11-12', endDate: '2026-01-31', notes: 'Varies by zone — check DNR' },
  // Small Game
  { species: 'Small Game', weapon: 'Firearms', startDate: '2025-11-01', endDate: '2026-02-28', notes: 'Rabbit, squirrel, pheasant' },
  { species: 'Small Game', weapon: 'Archery', startDate: '2025-09-01', endDate: '2026-02-28' },
];

const SPECIES_OPTIONS = ['Deer', 'Turkey', 'Bear', 'Waterfowl', 'Small Game'];
const WEAPON_OPTIONS = ['Archery', 'Firearms', 'Muzzleloader', 'Shotgun'];

const MD_COUNTIES = [
  'Allegany', 'Anne Arundel', 'Baltimore', 'Baltimore City', 'Calvert',
  'Caroline', 'Carroll', 'Cecil', 'Charles', 'Dorchester', 'Frederick',
  'Garrett', 'Harford', 'Howard', 'Kent', 'Montgomery', 'Prince George\'s',
  'Queen Anne\'s', 'Somerset', 'St. Mary\'s', 'Talbot', 'Washington',
  'Wicomico', 'Worcester',
];

interface HuntPlan {
  id: string;
  species: string;
  date: string;
  location: string;
  locationId?: string;
  weaponType: string;
  county: string;
  createdAt: string;
  notes: string;
  seasonStatus: 'open' | 'closed' | 'unknown';
  reservationRequired: boolean;
  sundayHunting: boolean;
}

/**
 * Check if a date falls within an open season for species/weapon combo.
 */
function checkSeasonStatus(
  species: string,
  weapon: string,
  dateStr: string
): { status: 'open' | 'closed' | 'unknown'; info?: SeasonInfo } {
  if (!dateStr || !species) return { status: 'unknown' };

  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return { status: 'unknown' };

  const matching = MD_SEASONS.filter(
    (s) =>
      s.species.toLowerCase() === species.toLowerCase() &&
      (!weapon || s.weapon.toLowerCase().includes(weapon.toLowerCase()))
  );

  for (const season of matching) {
    const start = new Date(season.startDate);
    const end = new Date(season.endDate);
    if (date >= start && date <= end) {
      return { status: 'open', info: season };
    }
  }

  return matching.length > 0 ? { status: 'closed' } : { status: 'unknown' };
}

export default function PlanScreen() {
  const [plans, setPlans] = useState<HuntPlan[]>([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [formData, setFormData] = useState({
    species: '',
    date: '',
    location: '',
    locationId: '',
    weaponType: '',
    county: '',
    notes: '',
  });

  // Picker states
  const [showSpeciesPicker, setShowSpeciesPicker] = useState(false);
  const [showWeaponPicker, setShowWeaponPicker] = useState(false);
  const [showCountyPicker, setShowCountyPicker] = useState(false);
  const [showLocationPicker, setShowLocationPicker] = useState(false);
  const [locationSearch, setLocationSearch] = useState('');

  // Suggested lands based on species + weapon + county
  const suggestedLands = useMemo(() => {
    if (!formData.species && !formData.county) return [];

    return marylandPublicLands.filter((land) => {
      // County filter
      if (formData.county && !land.county.toLowerCase().includes(formData.county.toLowerCase())) {
        return false;
      }
      // Species filter
      if (formData.species) {
        const speciesLower = formData.species.toLowerCase();
        const hasSpecies = land.huntableSpecies.some((s) =>
          s.toLowerCase().includes(speciesLower)
        );
        if (!hasSpecies) return false;
      }
      // Weapon filter
      if (formData.weaponType) {
        const weaponLower = formData.weaponType.toLowerCase();
        const hasWeapon = land.allowedWeapons.some((w) =>
          w.toLowerCase().includes(weaponLower)
        );
        if (!hasWeapon) return false;
      }
      return true;
    }).slice(0, 15);
  }, [formData.species, formData.weaponType, formData.county]);

  // Location search results
  const locationResults = useMemo(() => {
    if (!locationSearch.trim()) return suggestedLands;
    return searchLands(locationSearch).slice(0, 15);
  }, [locationSearch, suggestedLands]);

  // Season check for current form
  const seasonCheck = useMemo(
    () => checkSeasonStatus(formData.species, formData.weaponType, formData.date),
    [formData.species, formData.weaponType, formData.date]
  );

  const handleCreatePlan = () => {
    if (!formData.species || !formData.date || !formData.weaponType) {
      Alert.alert('Missing Fields', 'Please fill in species, date, and weapon type.');
      return;
    }

    // Warn if season is closed
    if (seasonCheck.status === 'closed') {
      Alert.alert(
        'Season Closed',
        `${formData.species} ${formData.weaponType} season appears to be closed on ${formData.date}. Create plan anyway?`,
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Create Anyway', onPress: () => savePlan() },
        ]
      );
      return;
    }

    savePlan();
  };

  const savePlan = () => {
    const selectedLand = formData.locationId
      ? marylandPublicLands.find((l) => l.id === formData.locationId)
      : undefined;

    const newPlan: HuntPlan = {
      id: Date.now().toString(),
      species: formData.species,
      date: formData.date,
      location: formData.location,
      locationId: formData.locationId,
      weaponType: formData.weaponType,
      county: formData.county || selectedLand?.county || '',
      notes: formData.notes,
      createdAt: new Date().toISOString().split('T')[0],
      seasonStatus: seasonCheck.status,
      reservationRequired: selectedLand?.reservationRequired ?? false,
      sundayHunting: selectedLand?.sundayHunting ?? false,
    };

    setPlans([newPlan, ...plans]);
    setFormData({ species: '', date: '', location: '', locationId: '', weaponType: '', county: '', notes: '' });
    setShowCreateModal(false);
  };

  const deletePlan = (id: string) => {
    Alert.alert('Delete Plan', 'Remove this hunt plan?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => setPlans(plans.filter((p) => p.id !== id)) },
    ]);
  };

  // ── Inline Picker Modal ──
  const PickerModal = ({
    visible,
    onClose,
    title,
    options,
    onSelect,
  }: {
    visible: boolean;
    onClose: () => void;
    title: string;
    options: string[];
    onSelect: (val: string) => void;
  }) => (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <TouchableOpacity style={styles.pickerOverlay} onPress={onClose} activeOpacity={1}>
        <View style={styles.pickerContainer}>
          <Text style={styles.pickerTitle}>{title}</Text>
          <ScrollView style={styles.pickerScroll} showsVerticalScrollIndicator={false}>
            {options.map((opt) => (
              <TouchableOpacity
                key={opt}
                style={styles.pickerOption}
                onPress={() => {
                  onSelect(opt);
                  onClose();
                }}
              >
                <Text style={styles.pickerOptionText}>{opt}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      </TouchableOpacity>
    </Modal>
  );

  const renderPlanCard = ({ item }: { item: HuntPlan }) => (
    <TouchableOpacity
      style={styles.planCard}
      onLongPress={() => deletePlan(item.id)}
      activeOpacity={0.8}
    >
      <View style={styles.planHeader}>
        <View style={styles.planHeaderLeft}>
          <Text style={styles.planSpecies}>{item.species}</Text>
          <View
            style={[
              styles.seasonBadge,
              item.seasonStatus === 'open'
                ? styles.seasonOpen
                : item.seasonStatus === 'closed'
                ? styles.seasonClosed
                : styles.seasonUnknown,
            ]}
          >
            <Text style={styles.seasonBadgeText}>
              {item.seasonStatus === 'open' ? 'In Season' : item.seasonStatus === 'closed' ? 'Closed' : '?'}
            </Text>
          </View>
        </View>
        <Text style={styles.planDate}>{item.date}</Text>
      </View>
      <View style={styles.planDetails}>
        {item.location ? (
          <Text style={styles.planDetail}>
            <Text style={styles.label}>Location: </Text>
            {item.location}
          </Text>
        ) : null}
        <Text style={styles.planDetail}>
          <Text style={styles.label}>Weapon: </Text>
          {item.weaponType}
        </Text>
        {item.county ? (
          <Text style={styles.planDetail}>
            <Text style={styles.label}>County: </Text>
            {item.county}
          </Text>
        ) : null}
      </View>
      {/* Inline warnings */}
      <View style={styles.warningsRow}>
        {item.reservationRequired && (
          <View style={styles.warningBadge}>
            <Text style={styles.warningText}>Reservation Req.</Text>
          </View>
        )}
        {item.sundayHunting && (
          <View style={styles.infoBadge}>
            <Text style={styles.infoText}>Sunday OK</Text>
          </View>
        )}
      </View>
      {item.notes ? (
        <Text style={styles.planNotes}>{item.notes}</Text>
      ) : null}
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      {plans.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyEmoji}>{'\uD83C\uDFAF'}</Text>
          <Text style={styles.emptyTitle}>No hunt plans yet</Text>
          <Text style={styles.emptyText}>
            Create a plan to organize your trips. The planner checks seasons, suggests WMAs,
            and warns about reservation requirements.
          </Text>
          <TouchableOpacity
            style={styles.emptyButton}
            onPress={() => setShowCreateModal(true)}
            activeOpacity={0.7}
          >
            <Text style={styles.emptyButtonText}>+ Create Your First Plan</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={plans}
          renderItem={renderPlanCard}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        />
      )}

      {plans.length > 0 && (
        <TouchableOpacity
          style={styles.createButton}
          onPress={() => setShowCreateModal(true)}
          activeOpacity={0.7}
        >
          <Text style={styles.createButtonText}>+ New Plan</Text>
        </TouchableOpacity>
      )}

      {/* ── Create Plan Modal ── */}
      <Modal
        visible={showCreateModal}
        animationType="slide"
        transparent={false}
        onRequestClose={() => setShowCreateModal(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setShowCreateModal(false)}>
              <Text style={styles.closeButton}>Cancel</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>New Hunt Plan</Text>
            <TouchableOpacity onPress={handleCreatePlan}>
              <Text style={styles.saveButton}>Save</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.formContainer} showsVerticalScrollIndicator={false}>
            {/* Species Picker */}
            <Text style={styles.formLabel}>Species *</Text>
            <TouchableOpacity
              style={styles.pickerInput}
              onPress={() => setShowSpeciesPicker(true)}
            >
              <Text style={formData.species ? styles.pickerValue : styles.pickerPlaceholder}>
                {formData.species || 'Select species...'}
              </Text>
              <Text style={styles.pickerArrow}>{'\u25BE'}</Text>
            </TouchableOpacity>

            {/* Date Input */}
            <Text style={styles.formLabel}>Hunt Date *</Text>
            <TextInput
              style={styles.input}
              placeholder="YYYY-MM-DD"
              placeholderTextColor={Colors.textMuted}
              value={formData.date}
              onChangeText={(text) => setFormData({ ...formData, date: text })}
              keyboardType="numbers-and-punctuation"
            />

            {/* Season Status Indicator */}
            {formData.species && formData.date && (
              <View
                style={[
                  styles.seasonIndicator,
                  seasonCheck.status === 'open'
                    ? styles.seasonIndicatorOpen
                    : seasonCheck.status === 'closed'
                    ? styles.seasonIndicatorClosed
                    : styles.seasonIndicatorUnknown,
                ]}
              >
                <Text style={styles.seasonIndicatorText}>
                  {seasonCheck.status === 'open'
                    ? `\u2705 ${formData.species} ${formData.weaponType || ''} season is OPEN`
                    : seasonCheck.status === 'closed'
                    ? `\u26D4 ${formData.species} ${formData.weaponType || ''} season appears CLOSED on this date`
                    : `\u2753 Season status unknown — verify with MD DNR`}
                </Text>
                {seasonCheck.info?.notes && (
                  <Text style={styles.seasonNote}>{seasonCheck.info.notes}</Text>
                )}
              </View>
            )}

            {/* Weapon Picker */}
            <Text style={styles.formLabel}>Weapon Type *</Text>
            <TouchableOpacity
              style={styles.pickerInput}
              onPress={() => setShowWeaponPicker(true)}
            >
              <Text style={formData.weaponType ? styles.pickerValue : styles.pickerPlaceholder}>
                {formData.weaponType || 'Select weapon...'}
              </Text>
              <Text style={styles.pickerArrow}>{'\u25BE'}</Text>
            </TouchableOpacity>

            {/* County Picker */}
            <Text style={styles.formLabel}>County</Text>
            <TouchableOpacity
              style={styles.pickerInput}
              onPress={() => setShowCountyPicker(true)}
            >
              <Text style={formData.county ? styles.pickerValue : styles.pickerPlaceholder}>
                {formData.county || 'Select county (optional)...'}
              </Text>
              <Text style={styles.pickerArrow}>{'\u25BE'}</Text>
            </TouchableOpacity>

            {/* Location Picker — searches real WMA database */}
            <Text style={styles.formLabel}>Location (WMA / Public Land)</Text>
            <TouchableOpacity
              style={styles.pickerInput}
              onPress={() => setShowLocationPicker(true)}
            >
              <Text style={formData.location ? styles.pickerValue : styles.pickerPlaceholder}>
                {formData.location || 'Search or browse public lands...'}
              </Text>
              <Text style={styles.pickerArrow}>{'\u25BE'}</Text>
            </TouchableOpacity>

            {/* Suggested Lands (when species/county selected but no location yet) */}
            {!formData.location && suggestedLands.length > 0 && (
              <View style={styles.suggestionsBox}>
                <Text style={styles.suggestionsTitle}>
                  Suggested Lands ({suggestedLands.length})
                </Text>
                {suggestedLands.slice(0, 5).map((land) => (
                  <TouchableOpacity
                    key={land.id}
                    style={styles.suggestionItem}
                    onPress={() =>
                      setFormData({
                        ...formData,
                        location: land.name,
                        locationId: land.id,
                        county: land.county,
                      })
                    }
                  >
                    <Text style={styles.suggestionName}>{land.name}</Text>
                    <Text style={styles.suggestionMeta}>
                      {land.designation} · {land.county}
                      {land.acres ? ` · ${land.acres.toLocaleString()} ac` : ''}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}

            {/* Notes */}
            <Text style={styles.formLabel}>Notes</Text>
            <TextInput
              style={[styles.input, styles.notesInput]}
              placeholder="Gear, access notes, meeting point..."
              placeholderTextColor={Colors.textMuted}
              value={formData.notes}
              onChangeText={(text) => setFormData({ ...formData, notes: text })}
              multiline
              maxLength={500}
            />

            <View style={{ height: 40 }} />
          </ScrollView>
        </View>
      </Modal>

      {/* Picker Modals */}
      <PickerModal
        visible={showSpeciesPicker}
        onClose={() => setShowSpeciesPicker(false)}
        title="Select Species"
        options={SPECIES_OPTIONS}
        onSelect={(val) => setFormData({ ...formData, species: val })}
      />
      <PickerModal
        visible={showWeaponPicker}
        onClose={() => setShowWeaponPicker(false)}
        title="Select Weapon"
        options={WEAPON_OPTIONS}
        onSelect={(val) => setFormData({ ...formData, weaponType: val })}
      />
      <PickerModal
        visible={showCountyPicker}
        onClose={() => setShowCountyPicker(false)}
        title="Select County"
        options={MD_COUNTIES}
        onSelect={(val) => setFormData({ ...formData, county: val })}
      />

      {/* Location Search Modal */}
      <Modal
        visible={showLocationPicker}
        transparent
        animationType="fade"
        onRequestClose={() => setShowLocationPicker(false)}
      >
        <TouchableOpacity
          style={styles.pickerOverlay}
          onPress={() => setShowLocationPicker(false)}
          activeOpacity={1}
        >
          <View style={[styles.pickerContainer, { maxHeight: 500 }]}>
            <Text style={styles.pickerTitle}>Find Public Land</Text>
            <TextInput
              style={styles.locationSearchInput}
              placeholder="Search by name..."
              placeholderTextColor={Colors.textMuted}
              value={locationSearch}
              onChangeText={setLocationSearch}
              autoFocus
            />
            <ScrollView style={styles.pickerScroll} showsVerticalScrollIndicator={false}>
              {locationResults.map((land) => (
                <TouchableOpacity
                  key={land.id}
                  style={styles.locationOption}
                  onPress={() => {
                    setFormData({
                      ...formData,
                      location: land.name,
                      locationId: land.id,
                      county: land.county,
                    });
                    setLocationSearch('');
                    setShowLocationPicker(false);
                  }}
                >
                  <Text style={styles.locationName}>{land.name}</Text>
                  <Text style={styles.locationMeta}>
                    {land.designation} · {land.county}
                    {land.acres ? ` · ${land.acres.toLocaleString()} ac` : ''}
                    {land.reservationRequired ? ' · Res. Req.' : ''}
                    {land.sundayHunting ? ' · Sun OK' : ''}
                  </Text>
                </TouchableOpacity>
              ))}
              {locationResults.length === 0 && (
                <Text style={styles.noResults}>No matching lands found</Text>
              )}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  listContent: { paddingHorizontal: 16, paddingVertical: 12, paddingBottom: 80 },

  // Plan Card
  planCard: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderLeftWidth: 3,
    borderLeftColor: Colors.moss,
  },
  planHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  planHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  planSpecies: { fontSize: 16, fontWeight: '700', color: Colors.textPrimary },
  planDate: { fontSize: 12, color: Colors.textMuted },
  planDetails: { gap: 4, marginBottom: 8 },
  planDetail: { fontSize: 13, color: Colors.textSecondary },
  label: { fontWeight: '600', color: Colors.oak },
  planNotes: {
    fontSize: 12,
    color: Colors.textMuted,
    fontStyle: 'italic',
    marginTop: 4,
    borderTopWidth: 1,
    borderTopColor: Colors.mud,
    paddingTop: 6,
  },

  // Season badges
  seasonBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  seasonOpen: { backgroundColor: Colors.moss },
  seasonClosed: { backgroundColor: Colors.rust },
  seasonUnknown: { backgroundColor: Colors.mud },
  seasonBadgeText: {
    fontSize: 9,
    fontWeight: '700',
    color: Colors.textOnAccent,
    textTransform: 'uppercase',
  },

  // Warnings row
  warningsRow: {
    flexDirection: 'row',
    gap: 6,
    flexWrap: 'wrap',
  },
  warningBadge: {
    backgroundColor: Colors.amber,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  warningText: { fontSize: 9, fontWeight: '700', color: Colors.textOnAccent },
  infoBadge: {
    backgroundColor: Colors.sage,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  infoText: { fontSize: 9, fontWeight: '700', color: Colors.textOnAccent },

  // Empty state
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  emptyEmoji: { fontSize: 56, marginBottom: 16 },
  emptyTitle: { fontSize: 20, fontWeight: '700', color: Colors.textPrimary, marginBottom: 8 },
  emptyText: {
    fontSize: 14,
    color: Colors.textMuted,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  emptyButton: {
    backgroundColor: Colors.moss,
    paddingVertical: 14,
    paddingHorizontal: 28,
    borderRadius: 10,
  },
  emptyButtonText: { color: Colors.textOnAccent, fontWeight: '700', fontSize: 15 },

  // FAB
  createButton: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    backgroundColor: Colors.moss,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 10,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  createButtonText: { color: Colors.textOnAccent, fontWeight: '700', fontSize: 14 },

  // Modal
  modalContainer: { flex: 1, backgroundColor: Colors.background },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: Colors.mud,
  },
  closeButton: { fontSize: 15, color: Colors.textMuted, fontWeight: '600' },
  modalTitle: { fontSize: 18, fontWeight: '700', color: Colors.textPrimary },
  saveButton: { fontSize: 15, color: Colors.moss, fontWeight: '700' },

  // Form
  formContainer: { flex: 1, paddingHorizontal: 16, paddingTop: 20 },
  formLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.textPrimary,
    marginBottom: 6,
    marginTop: 4,
  },
  input: {
    backgroundColor: Colors.surface,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: Colors.textPrimary,
    fontSize: 14,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: Colors.mud,
  },
  notesInput: {
    minHeight: 60,
    textAlignVertical: 'top',
  },

  // Picker input (looks like an input but tappable)
  pickerInput: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: Colors.mud,
  },
  pickerValue: { flex: 1, fontSize: 14, color: Colors.textPrimary },
  pickerPlaceholder: { flex: 1, fontSize: 14, color: Colors.textMuted },
  pickerArrow: { fontSize: 14, color: Colors.sage, marginLeft: 8 },

  // Season indicator
  seasonIndicator: {
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 14,
  },
  seasonIndicatorOpen: { backgroundColor: 'rgba(74, 103, 65, 0.3)', borderWidth: 1, borderColor: Colors.moss },
  seasonIndicatorClosed: { backgroundColor: 'rgba(164, 74, 63, 0.3)', borderWidth: 1, borderColor: Colors.rust },
  seasonIndicatorUnknown: { backgroundColor: 'rgba(212, 145, 61, 0.2)', borderWidth: 1, borderColor: Colors.amber },
  seasonIndicatorText: { fontSize: 13, fontWeight: '600', color: Colors.textPrimary },
  seasonNote: { fontSize: 11, color: Colors.textMuted, marginTop: 4, fontStyle: 'italic' },

  // Suggestions box
  suggestionsBox: {
    backgroundColor: Colors.forestDark,
    borderRadius: 10,
    padding: 12,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: Colors.sage,
  },
  suggestionsTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.sage,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  suggestionItem: {
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: Colors.mud,
  },
  suggestionName: { fontSize: 13, fontWeight: '600', color: Colors.textPrimary },
  suggestionMeta: { fontSize: 11, color: Colors.textMuted, marginTop: 2 },

  // Picker modals
  pickerOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  pickerContainer: {
    width: 280,
    maxHeight: 400,
    backgroundColor: Colors.surfaceElevated,
    borderRadius: 14,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: Colors.clay,
  },
  pickerTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.textPrimary,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.mud,
  },
  pickerScroll: {
    maxHeight: 320,
  },
  pickerOption: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: Colors.mud,
  },
  pickerOptionText: {
    fontSize: 14,
    color: Colors.textPrimary,
  },

  // Location picker
  locationSearchInput: {
    marginHorizontal: 12,
    marginVertical: 8,
    backgroundColor: Colors.surface,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    color: Colors.textPrimary,
    fontSize: 14,
    borderWidth: 1,
    borderColor: Colors.mud,
  },
  locationOption: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.mud,
  },
  locationName: { fontSize: 14, fontWeight: '600', color: Colors.textPrimary },
  locationMeta: { fontSize: 11, color: Colors.textMuted, marginTop: 2 },
  noResults: {
    fontSize: 13,
    color: Colors.textMuted,
    textAlign: 'center',
    paddingVertical: 20,
  },
});
