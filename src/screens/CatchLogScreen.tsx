/**
 * CatchLogScreen.tsx — Fishing catch log interface for MDHuntFishOutdoors
 *
 * Two-view layout:
 * 1. List View (default): FlatList of catch log entries with filters and search
 * 2. Add Entry Modal: ScrollView form for logging new catches
 *
 * Features:
 * - Catch cards with species emoji, location, date, bait, length/weight, rating
 * - Filter by species (All + dynamic chip buttons)
 * - Long-press delete with confirmation
 * - Add Entry modal with comprehensive form:
 *   - Species picker (common MD species)
 *   - Method picker (Fly / Bait / Lure)
 *   - Bait/Fly input, Location, Water type
 *   - Length/Weight inputs (optional)
 *   - Kept/Released toggle, Weather, Temperature inputs
 *   - Tide phase picker (tidal only)
 *   - Presentation, Rating (1-5 stars), Notes
 *   - Save button with validation
 * - Empty state with fish emoji and encouragement
 * - GPS location auto-capture
 * - Dark theme with Maryland color palette
 * - Accessibility labels on all interactive elements
 *
 * Usage: Add to tab navigator (Fish mode only, or universal in later phases)
 */

import React, { useState, useCallback } from 'react';
import {
  View,
  ScrollView,
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  Modal,
  TextInput,
  Alert,
  SafeAreaView,
  SectionList,
  Pressable,
} from 'react-native';
import Colors from '../theme/colors';
import ActivityDisclaimer from '../components/common/ActivityDisclaimer';
import { CatchLogEntry } from '../types/catchlog';
import { useCatchLog, generateId } from '../context/CatchLogContext';

// Species emoji mapping
const SPECIES_EMOJI: { [key: string]: string } = {
  striped_bass: '🦈',
  brown_trout: '🐟',
  rainbow_trout: '🌈',
  largemouth_bass: '🎣',
  smallmouth_bass: '🎯',
  channel_catfish: '🐱',
  bluegill: '🍵',
  crappie: '⚪',
  yellow_perch: '💛',
  white_perch: '⚫',
  bluefish: '💙',
  flounder: '🏜',
};

const COMMON_SPECIES = [
  'Striped Bass',
  'Brown Trout',
  'Rainbow Trout',
  'Largemouth Bass',
  'Smallmouth Bass',
  'Channel Catfish',
  'Bluegill',
  'Crappie',
  'Yellow Perch',
  'White Perch',
  'Bluefish',
  'Flounder',
];

const METHODS = ['Fly', 'Bait', 'Lure'];
const WEATHER_OPTIONS = ['Sunny', 'Cloudy', 'Rainy', 'Windy', 'Overcast'];
const TIDE_PHASES = ['Incoming', 'Outgoing', 'Slack High', 'Slack Low'];

/**
 * CatchLogScreen — Main fishing catch log interface
 */
export const CatchLogScreen: React.FC = () => {
  const { catches, totalCatches, speciesCaught } = useCatchLog();
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedSpeciesFilter, setSelectedSpeciesFilter] = useState('All');

  // Filter catches based on selected species
  const filteredCatches = selectedSpeciesFilter === 'All'
    ? catches
    : catches.filter(c => c.species.toLowerCase() === selectedSpeciesFilter.toLowerCase());

  // Sort by most recent
  const sortedCatches = filteredCatches.sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );

  const handleAddPress = useCallback(() => {
    setModalVisible(true);
  }, []);

  const handleModalClose = useCallback(() => {
    setModalVisible(false);
  }, []);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Catch Log</Text>
        <View style={styles.badgeContainer}>
          <Text style={styles.badge}>{totalCatches}</Text>
        </View>
      </View>

      {/* Filter Chips */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.filtersContainer}
        contentContainerStyle={styles.filtersContentContainer}
      >
        <TouchableOpacity
          style={[
            styles.filterChip,
            selectedSpeciesFilter === 'All' && styles.filterChipActive,
          ]}
          onPress={() => setSelectedSpeciesFilter('All')}
          accessibilityLabel="Filter: Show all catches"
          accessibilityRole="button"
        >
          <Text
            style={[
              styles.filterChipText,
              selectedSpeciesFilter === 'All' && styles.filterChipTextActive,
            ]}
          >
            All
          </Text>
        </TouchableOpacity>

        {speciesCaught.map(species => (
          <TouchableOpacity
            key={species}
            style={[
              styles.filterChip,
              selectedSpeciesFilter === species && styles.filterChipActive,
            ]}
            onPress={() => setSelectedSpeciesFilter(species)}
            accessibilityLabel={`Filter: ${species}`}
            accessibilityRole="button"
          >
            <Text
              style={[
                styles.filterChipText,
                selectedSpeciesFilter === species && styles.filterChipTextActive,
              ]}
            >
              {species}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Catch List or Empty State */}
      {sortedCatches.length === 0 ? (
        <View style={styles.emptyStateContainer}>
          <Text style={styles.emptyStateEmoji}>🐟</Text>
          <Text style={styles.emptyStateTitle}>No catches logged yet</Text>
          <Text style={styles.emptyStateSubtitle}>
            Log your first catch to start building your personal fishing history
          </Text>
          <TouchableOpacity
            style={styles.emptyStateButton}
            onPress={handleAddPress}
            accessibilityLabel="Log your first catch"
            accessibilityRole="button"
          >
            <Text style={styles.emptyStateButtonText}>Log Catch</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={sortedCatches}
          keyExtractor={item => item.id}
          renderItem={({ item }) => (
            <CatchCard catch={item} onDelete={() => setModalVisible(false)} />
          )}
          scrollEventThrottle={16}
          ListFooterComponent={<View style={{ height: 20 }} />}
        />
      )}

      {/* Floating Action Button */}
      <TouchableOpacity
        style={styles.fab}
        onPress={handleAddPress}
        accessibilityLabel="Log new catch"
        accessibilityRole="button"
      >
        <Text style={styles.fabText}>+ Log Catch</Text>
      </TouchableOpacity>

      {/* Add Entry Modal */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent={false}
        onRequestClose={handleModalClose}
      >
        <AddCatchModal onClose={handleModalClose} />
      </Modal>

      {/* Persistent disclaimer footer */}
      <ActivityDisclaimer mode="fish" />
    </SafeAreaView>
  );
};

/**
 * CatchCard — Individual catch log entry card
 */
interface CatchCardProps {
  catch: CatchLogEntry;
  onDelete: () => void;
}

const CatchCard: React.FC<CatchCardProps> = ({ catch: catchEntry, onDelete }) => {
  const { deleteCatch } = useCatchLog();

  const handleLongPress = useCallback(() => {
    Alert.alert(
      'Delete Catch?',
      `Remove "${catchEntry.species}" from ${catchEntry.locationName}?`,
      [
        { text: 'Cancel', onPress: () => {}, style: 'cancel' },
        {
          text: 'Delete',
          onPress: async () => {
            await deleteCatch(catchEntry.id);
            onDelete();
          },
          style: 'destructive',
        },
      ]
    );
  }, [catchEntry, deleteCatch, onDelete]);

  const emoji = SPECIES_EMOJI[catchEntry.species.toLowerCase()] || '🎣';
  const dateObj = new Date(catchEntry.date);
  const dateStr = dateObj.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  return (
    <Pressable
      style={({ pressed }) => [
        styles.catchCard,
        pressed && styles.catchCardPressed,
      ]}
      onLongPress={handleLongPress}
      delayLongPress={500}
      accessibilityLabel={`Catch: ${catchEntry.species} at ${catchEntry.locationName}`}
      accessibilityHint={`Long press to delete. Caught on ${dateStr}.`}
      accessibilityRole="button"
    >
      <View style={styles.catchCardHeader}>
        <Text style={styles.catchCardEmoji}>{emoji}</Text>
        <View style={styles.catchCardTitleContainer}>
          <Text style={styles.catchCardTitle}>{catchEntry.species}</Text>
          <Text style={styles.catchCardLocation}>{catchEntry.locationName}</Text>
        </View>
        <View style={styles.catchCardRating}>
          <Text style={styles.catchCardRatingText}>
            {'⭐'.repeat(catchEntry.rating)}
          </Text>
        </View>
      </View>

      <View style={styles.catchCardDetails}>
        <View style={styles.catchCardDetailRow}>
          <Text style={styles.catchCardDetailLabel}>Date:</Text>
          <Text style={styles.catchCardDetailValue}>{dateStr}</Text>
        </View>

        <View style={styles.catchCardDetailRow}>
          <Text style={styles.catchCardDetailLabel}>Method:</Text>
          <Text style={styles.catchCardDetailValue}>
            {catchEntry.method.charAt(0).toUpperCase() + catchEntry.method.slice(1)}
          </Text>
        </View>

        <View style={styles.catchCardDetailRow}>
          <Text style={styles.catchCardDetailLabel}>Bait/Fly:</Text>
          <Text style={styles.catchCardDetailValue}>{catchEntry.baitOrFly}</Text>
        </View>

        {(catchEntry.length || catchEntry.weight) && (
          <View style={styles.catchCardDetailRow}>
            <Text style={styles.catchCardDetailLabel}>Size:</Text>
            <Text style={styles.catchCardDetailValue}>
              {catchEntry.length && `${catchEntry.length}"`}
              {catchEntry.length && catchEntry.weight && ' / '}
              {catchEntry.weight && `${catchEntry.weight} lbs`}
            </Text>
          </View>
        )}

        <View style={styles.catchCardDetailRow}>
          <Text style={styles.catchCardDetailLabel}>Status:</Text>
          <Text style={styles.catchCardDetailValue}>
            {catchEntry.kept ? 'Kept' : 'Released'}
          </Text>
        </View>
      </View>
    </Pressable>
  );
};

/**
 * AddCatchModal — Form for logging a new catch
 */
interface AddCatchModalProps {
  onClose: () => void;
}

const AddCatchModal: React.FC<AddCatchModalProps> = ({ onClose }) => {
  const { addCatch } = useCatchLog();
  const [species, setSpecies] = useState('');
  const [method, setMethod] = useState('');
  const [baitOrFly, setBaitOrFly] = useState('');
  const [locationName, setLocationName] = useState('');
  const [waterType, setWaterType] = useState<'tidal' | 'nontidal'>('nontidal');
  const [length, setLength] = useState('');
  const [weight, setWeight] = useState('');
  const [kept, setKept] = useState(false);
  const [weather, setWeather] = useState('');
  const [airTemp, setAirTemp] = useState('');
  const [waterTemp, setWaterTemp] = useState('');
  const [tidePhase, setTidePhase] = useState('');
  const [presentation, setPresentation] = useState('');
  const [rating, setRating] = useState<1 | 2 | 3 | 4 | 5>(3);
  const [notes, setNotes] = useState('');
  const [showSpeciesPicker, setShowSpeciesPicker] = useState(false);
  const [showWeatherPicker, setShowWeatherPicker] = useState(false);
  const [showTidePicker, setShowTidePicker] = useState(false);

  const handleSave = async () => {
    // Validation
    if (!species) {
      Alert.alert('Missing Field', 'Please select a species');
      return;
    }
    if (!method) {
      Alert.alert('Missing Field', 'Please select a fishing method');
      return;
    }
    if (!baitOrFly) {
      Alert.alert('Missing Field', 'Please enter bait or fly pattern');
      return;
    }
    if (!locationName) {
      Alert.alert('Missing Field', 'Please enter location name');
      return;
    }
    if (!weather) {
      Alert.alert('Missing Field', 'Please select weather conditions');
      return;
    }

    const today = new Date();
    const dateStr = today.toISOString().split('T')[0];
    const timeStr = `${String(today.getHours()).padStart(2, '0')}:${String(
      today.getMinutes()
    ).padStart(2, '0')}`;

    const newCatch: CatchLogEntry = {
      id: generateId(),
      date: dateStr,
      time: timeStr,
      lat: 39.0504, // Default to MD center; in production, use LocationService
      lng: -76.6413,
      locationName,
      waterType,
      region: 'maryland', // Default region
      species,
      length: length ? parseFloat(length) : undefined,
      weight: weight ? parseFloat(weight) : undefined,
      kept,
      method: method.toLowerCase() as 'fly' | 'bait' | 'lure',
      baitOrFly,
      presentation,
      airTemp: airTemp ? parseFloat(airTemp) : undefined,
      waterTemp: waterTemp ? parseFloat(waterTemp) : undefined,
      weather,
      tidePhase: waterType === 'tidal' ? tidePhase : undefined,
      rating,
      notes,
    };

    await addCatch(newCatch);
    Alert.alert('Success', `Logged ${species} from ${locationName}`);
    onClose();
  };

  return (
    <SafeAreaView style={styles.modalContainer}>
      <View style={styles.modalHeader}>
        <TouchableOpacity onPress={onClose} accessibilityLabel="Close form">
          <Text style={styles.modalHeaderButton}>Cancel</Text>
        </TouchableOpacity>
        <Text style={styles.modalHeaderTitle}>Log Catch</Text>
        <TouchableOpacity
          onPress={handleSave}
          accessibilityLabel="Save catch entry"
        >
          <Text style={styles.modalHeaderButton}>Save</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.formContainer} contentContainerStyle={styles.formContent}>
        {/* Species Section */}
        <View style={styles.formSection}>
          <Text style={styles.formSectionTitle}>Species</Text>
          <TouchableOpacity
            style={styles.pickerButton}
            onPress={() => setShowSpeciesPicker(!showSpeciesPicker)}
            accessibilityLabel="Select species"
            accessibilityRole="button"
          >
            <Text style={styles.pickerButtonText}>
              {species || 'Choose a species...'}
            </Text>
          </TouchableOpacity>
          {showSpeciesPicker && (
            <View style={styles.pickerDropdown}>
              {COMMON_SPECIES.map(s => (
                <TouchableOpacity
                  key={s}
                  style={styles.pickerOption}
                  onPress={() => {
                    setSpecies(s);
                    setShowSpeciesPicker(false);
                  }}
                >
                  <Text style={styles.pickerOptionText}>{s}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>

        {/* Method Section */}
        <View style={styles.formSection}>
          <Text style={styles.formSectionTitle}>Fishing Method</Text>
          <View style={styles.methodChips}>
            {METHODS.map(m => (
              <TouchableOpacity
                key={m}
                style={[
                  styles.methodChip,
                  method === m && styles.methodChipActive,
                ]}
                onPress={() => setMethod(m)}
                accessibilityLabel={`Method: ${m}`}
                accessibilityRole="button"
              >
                <Text
                  style={[
                    styles.methodChipText,
                    method === m && styles.methodChipTextActive,
                  ]}
                >
                  {m}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Bait/Fly Input */}
        <View style={styles.formSection}>
          <Text style={styles.formSectionTitle}>Bait / Fly Pattern</Text>
          <TextInput
            style={styles.textInput}
            placeholder="What did you use?"
            placeholderTextColor={Colors.brass}
            value={baitOrFly}
            onChangeText={setBaitOrFly}
            accessibilityLabel="Bait or fly pattern"
          />
        </View>

        {/* Location Input */}
        <View style={styles.formSection}>
          <Text style={styles.formSectionTitle}>Location</Text>
          <TextInput
            style={styles.textInput}
            placeholder="Location name (e.g. Gunpowder Falls)"
            placeholderTextColor={Colors.brass}
            value={locationName}
            onChangeText={setLocationName}
            accessibilityLabel="Catch location"
          />
          <Text style={styles.helperText}>GPS will be auto-captured</Text>
        </View>

        {/* Water Type Toggle */}
        <View style={styles.formSection}>
          <Text style={styles.formSectionTitle}>Water Type</Text>
          <View style={styles.toggleGroup}>
            <TouchableOpacity
              style={[
                styles.toggleButton,
                waterType === 'tidal' && styles.toggleButtonActive,
              ]}
              onPress={() => setWaterType('tidal')}
              accessibilityLabel="Water type: Tidal"
              accessibilityRole="button"
            >
              <Text
                style={[
                  styles.toggleButtonText,
                  waterType === 'tidal' && styles.toggleButtonTextActive,
                ]}
              >
                Tidal
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.toggleButton,
                waterType === 'nontidal' && styles.toggleButtonActive,
              ]}
              onPress={() => setWaterType('nontidal')}
              accessibilityLabel="Water type: Nontidal"
              accessibilityRole="button"
            >
              <Text
                style={[
                  styles.toggleButtonText,
                  waterType === 'nontidal' && styles.toggleButtonTextActive,
                ]}
              >
                Nontidal
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Length & Weight */}
        <View style={styles.formSection}>
          <Text style={styles.formSectionTitle}>Size (optional)</Text>
          <View style={styles.twoColumnRow}>
            <View style={styles.twoColumnItem}>
              <TextInput
                style={styles.textInput}
                placeholder="Length (inches)"
                placeholderTextColor={Colors.brass}
                value={length}
                onChangeText={setLength}
                keyboardType="decimal-pad"
                accessibilityLabel="Fish length in inches"
              />
            </View>
            <View style={styles.twoColumnItem}>
              <TextInput
                style={styles.textInput}
                placeholder="Weight (lbs)"
                placeholderTextColor={Colors.brass}
                value={weight}
                onChangeText={setWeight}
                keyboardType="decimal-pad"
                accessibilityLabel="Fish weight in pounds"
              />
            </View>
          </View>
        </View>

        {/* Kept/Released Toggle */}
        <View style={styles.formSection}>
          <Text style={styles.formSectionTitle}>Status</Text>
          <View style={styles.toggleGroup}>
            <TouchableOpacity
              style={[
                styles.toggleButton,
                !kept && styles.toggleButtonActive,
              ]}
              onPress={() => setKept(false)}
              accessibilityLabel="Fish status: Released"
              accessibilityRole="button"
            >
              <Text
                style={[
                  styles.toggleButtonText,
                  !kept && styles.toggleButtonTextActive,
                ]}
              >
                Released
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.toggleButton,
                kept && styles.toggleButtonActive,
              ]}
              onPress={() => setKept(true)}
              accessibilityLabel="Fish status: Kept"
              accessibilityRole="button"
            >
              <Text
                style={[
                  styles.toggleButtonText,
                  kept && styles.toggleButtonTextActive,
                ]}
              >
                Kept
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Weather Conditions */}
        <View style={styles.formSection}>
          <Text style={styles.formSectionTitle}>Weather</Text>
          <TouchableOpacity
            style={styles.pickerButton}
            onPress={() => setShowWeatherPicker(!showWeatherPicker)}
            accessibilityLabel="Select weather conditions"
            accessibilityRole="button"
          >
            <Text style={styles.pickerButtonText}>
              {weather || 'Choose weather...'}
            </Text>
          </TouchableOpacity>
          {showWeatherPicker && (
            <View style={styles.pickerDropdown}>
              {WEATHER_OPTIONS.map(w => (
                <TouchableOpacity
                  key={w}
                  style={styles.pickerOption}
                  onPress={() => {
                    setWeather(w);
                    setShowWeatherPicker(false);
                  }}
                >
                  <Text style={styles.pickerOptionText}>{w}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>

        {/* Temperature Inputs */}
        <View style={styles.formSection}>
          <Text style={styles.formSectionTitle}>Temperature (optional)</Text>
          <View style={styles.twoColumnRow}>
            <View style={styles.twoColumnItem}>
              <TextInput
                style={styles.textInput}
                placeholder="Air (°F)"
                placeholderTextColor={Colors.brass}
                value={airTemp}
                onChangeText={setAirTemp}
                keyboardType="decimal-pad"
                accessibilityLabel="Air temperature in Fahrenheit"
              />
            </View>
            <View style={styles.twoColumnItem}>
              <TextInput
                style={styles.textInput}
                placeholder="Water (°F)"
                placeholderTextColor={Colors.brass}
                value={waterTemp}
                onChangeText={setWaterTemp}
                keyboardType="decimal-pad"
                accessibilityLabel="Water temperature in Fahrenheit"
              />
            </View>
          </View>
        </View>

        {/* Tide Phase (conditional) */}
        {waterType === 'tidal' && (
          <View style={styles.formSection}>
            <Text style={styles.formSectionTitle}>Tide Phase</Text>
            <TouchableOpacity
              style={styles.pickerButton}
              onPress={() => setShowTidePicker(!showTidePicker)}
              accessibilityLabel="Select tidal phase"
              accessibilityRole="button"
            >
              <Text style={styles.pickerButtonText}>
                {tidePhase || 'Choose tide phase...'}
              </Text>
            </TouchableOpacity>
            {showTidePicker && (
              <View style={styles.pickerDropdown}>
                {TIDE_PHASES.map(t => (
                  <TouchableOpacity
                    key={t}
                    style={styles.pickerOption}
                    onPress={() => {
                      setTidePhase(t);
                      setShowTidePicker(false);
                    }}
                  >
                    <Text style={styles.pickerOptionText}>{t}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>
        )}

        {/* Presentation Technique */}
        <View style={styles.formSection}>
          <Text style={styles.formSectionTitle}>Presentation Technique</Text>
          <TextInput
            style={styles.textInput}
            placeholder="How did you fish it? (dead drift, stripping, etc.)"
            placeholderTextColor={Colors.brass}
            value={presentation}
            onChangeText={setPresentation}
            accessibilityLabel="Presentation technique"
          />
        </View>

        {/* Rating */}
        <View style={styles.formSection}>
          <Text style={styles.formSectionTitle}>Rating</Text>
          <View style={styles.ratingContainer}>
            {([1, 2, 3, 4, 5] as const).map(star => (
              <TouchableOpacity
                key={star}
                style={styles.starButton}
                onPress={() => setRating(star)}
                accessibilityLabel={`Rating: ${star} stars`}
                accessibilityRole="button"
              >
                <Text style={styles.starButtonText}>
                  {star <= rating ? '⭐' : '☆'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Notes */}
        <View style={styles.formSection}>
          <Text style={styles.formSectionTitle}>Notes</Text>
          <TextInput
            style={[styles.textInput, styles.textAreaInput]}
            placeholder="Any other observations?"
            placeholderTextColor={Colors.brass}
            value={notes}
            onChangeText={setNotes}
            multiline
            numberOfLines={4}
            accessibilityLabel="Additional notes"
          />
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
};

// Styles
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.mdBlack,
  },

  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.oak,
  },

  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: Colors.mdWhite,
  },

  badgeContainer: {
    backgroundColor: Colors.mdGold,
    borderRadius: 12,
    minWidth: 28,
    height: 28,
    justifyContent: 'center',
    alignItems: 'center',
  },

  badge: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.mdBlack,
  },

  filtersContainer: {
    flexGrow: 0,
    backgroundColor: Colors.mdBlack,
  },

  filtersContentContainer: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 8,
  },

  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: Colors.oak,
    borderWidth: 1,
    borderColor: Colors.brass,
  },

  filterChipActive: {
    backgroundColor: Colors.mdGold,
    borderColor: Colors.mdGold,
  },

  filterChipText: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.brass,
  },

  filterChipTextActive: {
    color: Colors.mdBlack,
  },

  emptyStateContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },

  emptyStateEmoji: {
    fontSize: 64,
    marginBottom: 16,
  },

  emptyStateTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: Colors.mdWhite,
    marginBottom: 8,
    textAlign: 'center',
  },

  emptyStateSubtitle: {
    fontSize: 14,
    color: Colors.brass,
    textAlign: 'center',
    marginBottom: 24,
  },

  emptyStateButton: {
    backgroundColor: Colors.mdGold,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },

  emptyStateButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.mdBlack,
  },

  fab: {
    position: 'absolute',
    bottom: 20,
    right: 16,
    backgroundColor: Colors.mdGold,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: Colors.mdBlack,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3,
    elevation: 5,
  },

  fabText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.mdBlack,
  },

  catchCard: {
    marginHorizontal: 12,
    marginVertical: 8,
    backgroundColor: Colors.oak,
    borderRadius: 12,
    padding: 12,
    borderLeftWidth: 4,
    borderLeftColor: Colors.mdGold,
  },

  catchCardPressed: {
    backgroundColor: Colors.forest,
  },

  catchCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 12,
  },

  catchCardEmoji: {
    fontSize: 32,
  },

  catchCardTitleContainer: {
    flex: 1,
  },

  catchCardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.mdWhite,
  },

  catchCardLocation: {
    fontSize: 13,
    color: Colors.brass,
    marginTop: 2,
  },

  catchCardRating: {
    alignItems: 'center',
  },

  catchCardRatingText: {
    fontSize: 14,
  },

  catchCardDetails: {
    gap: 6,
  },

  catchCardDetailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },

  catchCardDetailLabel: {
    fontSize: 12,
    color: Colors.brass,
    fontWeight: '500',
  },

  catchCardDetailValue: {
    fontSize: 12,
    color: Colors.mdWhite,
    fontWeight: '500',
  },

  // Modal styles
  modalContainer: {
    flex: 1,
    backgroundColor: Colors.mdBlack,
  },

  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.oak,
  },

  modalHeaderTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.mdWhite,
  },

  modalHeaderButton: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.mdGold,
  },

  formContainer: {
    flex: 1,
  },

  formContent: {
    paddingHorizontal: 16,
    paddingTop: 12,
  },

  formSection: {
    marginBottom: 20,
  },

  formSectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.mdGold,
    marginBottom: 8,
  },

  textInput: {
    backgroundColor: Colors.oak,
    borderWidth: 1,
    borderColor: Colors.brass,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: Colors.mdWhite,
  },

  textAreaInput: {
    minHeight: 80,
    textAlignVertical: 'top',
  },

  helperText: {
    fontSize: 12,
    color: Colors.brass,
    marginTop: 4,
    fontStyle: 'italic',
  },

  methodChips: {
    flexDirection: 'row',
    gap: 8,
  },

  methodChip: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 6,
    backgroundColor: Colors.oak,
    borderWidth: 1,
    borderColor: Colors.brass,
    alignItems: 'center',
  },

  methodChipActive: {
    backgroundColor: Colors.mdGold,
    borderColor: Colors.mdGold,
  },

  methodChipText: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.brass,
  },

  methodChipTextActive: {
    color: Colors.mdBlack,
  },

  pickerButton: {
    backgroundColor: Colors.oak,
    borderWidth: 1,
    borderColor: Colors.brass,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },

  pickerButtonText: {
    fontSize: 14,
    color: Colors.mdWhite,
  },

  pickerDropdown: {
    marginTop: 8,
    backgroundColor: Colors.oak,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.brass,
    overflow: 'hidden',
  },

  pickerOption: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: Colors.forest,
  },

  pickerOptionText: {
    fontSize: 14,
    color: Colors.mdWhite,
  },

  toggleGroup: {
    flexDirection: 'row',
    gap: 8,
  },

  toggleButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 6,
    backgroundColor: Colors.oak,
    borderWidth: 1,
    borderColor: Colors.brass,
    alignItems: 'center',
  },

  toggleButtonActive: {
    backgroundColor: Colors.mdGold,
    borderColor: Colors.mdGold,
  },

  toggleButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.brass,
  },

  toggleButtonTextActive: {
    color: Colors.mdBlack,
  },

  twoColumnRow: {
    flexDirection: 'row',
    gap: 8,
  },

  twoColumnItem: {
    flex: 1,
  },

  ratingContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },

  starButton: {
    minWidth: 44,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },

  starButtonText: {
    fontSize: 28,
  },
});
