/**
 * @file AddSightingModal.tsx
 * @description Quick-add modal for logging deer/wildlife sightings (not harvests).
 * Helps the AI learn camp activity patterns.
 *
 * @module Components
 * @version 1.0.0
 */

import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Alert,
  SafeAreaView,
  ScrollView,
  TextInput,
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Colors from '../../theme/colors';
import { useLocation } from '../../hooks/useLocation';

// ─── Types ──────────────────────────────────────────────────────

export interface CampSighting {
  id: string;
  species: string;
  count: number;
  activity: string;
  directionOfTravel: string;
  distanceYards: number;
  timeLogged: string;
  location?: string;
  gpsLat?: number;
  gpsLng?: number;
  notes?: string;
  addedAt: string;
}

interface Props {
  campId: string;
  visible: boolean;
  onClose: () => void;
}

const SPECIES_OPTIONS = [
  'Whitetail Buck',
  'Whitetail Doe',
  'Turkey Tom',
  'Turkey Hen',
  'Bear',
  'Coyote',
  'Fox',
  'Bobcat',
];

const ACTIVITY_OPTIONS = ['Feeding', 'Bedded', 'Moving', 'Rutting', 'With Fawns'];
const DIRECTION_OPTIONS = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW', 'Stationary'];

// ─── Main Component ─────────────────────────────────────────────

export const AddSightingModal: React.FC<Props> = ({ campId, visible, onClose }) => {
  const { location } = useLocation();

  // Form state
  const [species, setSpecies] = useState('Whitetail Buck');
  const [count, setCount] = useState(1);
  const [activity, setActivity] = useState('Moving');
  const [direction, setDirection] = useState('N');
  const [distance, setDistance] = useState(100);
  const [distanceInput, setDistanceInput] = useState('100');
  const [notes, setNotes] = useState('');
  const [locationName, setLocationName] = useState('');
  const [saving, setSaving] = useState(false);

  const resetForm = useCallback(() => {
    setSpecies('Whitetail Deer');
    setCount(1);
    setActivity('Moving');
    setDirection('N');
    setDistance(100);
    setDistanceInput('100');
    setNotes('');
    setLocationName('');
  }, []);

  const handleCountChange = useCallback((newCount: number) => {
    if (newCount >= 1 && newCount <= 20) {
      setCount(newCount);
    }
  }, []);

  const handleDistanceChange = useCallback((value: string) => {
    setDistanceInput(value);
    const parsed = parseInt(value);
    if (!isNaN(parsed) && parsed >= 0 && parsed <= 500) {
      setDistance(parsed);
    }
  }, []);

  const logSighting = useCallback(async () => {
    if (!location) {
      Alert.alert('Location Needed', 'GPS location is required to log sightings.');
      return;
    }

    setSaving(true);
    try {
      const now = new Date();
      const timeString = now.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
      });

      const sighting: CampSighting = {
        id: Date.now().toString(36) + Math.random().toString(36).substr(2, 9),
        species,
        count,
        activity,
        directionOfTravel: direction,
        distanceYards: distance,
        timeLogged: timeString,
        location: locationName.trim() || undefined,
        gpsLat: location.latitude,
        gpsLng: location.longitude,
        notes: notes.trim() || undefined,
        addedAt: now.toISOString(),
      };

      // Save to AsyncStorage
      const key = `@camp_sightings_${campId}`;
      const existingJson = await AsyncStorage.getItem(key);
      const sightings: CampSighting[] = existingJson ? JSON.parse(existingJson) : [];
      sightings.push(sighting);
      await AsyncStorage.setItem(key, JSON.stringify(sightings));

      Alert.alert('Success', `${species} sighting logged at ${timeString}`);
      resetForm();
      onClose();
    } catch (error: any) {
      Alert.alert('Error', `Failed to log sighting: ${error.message}`);
    } finally {
      setSaving(false);
    }
  }, [campId, species, count, activity, direction, distance, notes, locationName, location, onClose, resetForm]);

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <SafeAreaView style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} accessibilityLabel="Close">
            <Text style={styles.closeButton}>✕</Text>
          </TouchableOpacity>
          <Text style={styles.title}>Log Sighting</Text>
          <View style={{ width: 30 }} />
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent}>
          {/* Species */}
          <View style={styles.section}>
            <Text style={styles.label}>Species</Text>
            <View style={styles.pickerContainer}>
              <Picker
                selectedValue={species}
                onValueChange={setSpecies}
                style={styles.picker}
              >
                {SPECIES_OPTIONS.map((s) => (
                  <Picker.Item key={s} label={s} value={s} />
                ))}
              </Picker>
            </View>
          </View>

          {/* Count */}
          <View style={styles.section}>
            <Text style={styles.label}>Count</Text>
            <View style={styles.countContainer}>
              <TouchableOpacity
                style={styles.countButton}
                onPress={() => handleCountChange(count - 1)}
                disabled={count <= 1}
              >
                <Text style={styles.countButtonText}>−</Text>
              </TouchableOpacity>
              <Text style={styles.countDisplay}>{count}</Text>
              <TouchableOpacity
                style={styles.countButton}
                onPress={() => handleCountChange(count + 1)}
                disabled={count >= 20}
              >
                <Text style={styles.countButtonText}>+</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Activity */}
          <View style={styles.section}>
            <Text style={styles.label}>Activity</Text>
            <View style={styles.pickerContainer}>
              <Picker
                selectedValue={activity}
                onValueChange={setActivity}
                style={styles.picker}
              >
                {ACTIVITY_OPTIONS.map((a) => (
                  <Picker.Item key={a} label={a} value={a} />
                ))}
              </Picker>
            </View>
          </View>

          {/* Direction of Travel */}
          <View style={styles.section}>
            <Text style={styles.label}>Direction of Travel</Text>
            <View style={styles.pickerContainer}>
              <Picker
                selectedValue={direction}
                onValueChange={setDirection}
                style={styles.picker}
              >
                {DIRECTION_OPTIONS.map((d) => (
                  <Picker.Item key={d} label={d} value={d} />
                ))}
              </Picker>
            </View>
          </View>

          {/* Distance */}
          <View style={styles.section}>
            <Text style={styles.label}>Distance (yards)</Text>
            <TextInput
              style={styles.distanceInput}
              keyboardType="numeric"
              value={distanceInput}
              onChangeText={handleDistanceChange}
              placeholder="0-500 yards"
              placeholderTextColor={Colors.textMuted}
            />
            <Text style={styles.distanceLabel}>
              {distance} yards away
            </Text>
          </View>

          {/* Location Name */}
          <View style={styles.section}>
            <Text style={styles.label}>Location (optional)</Text>
            <TextInput
              style={styles.textInput}
              placeholder="e.g., North Blind, Ridge Top, Creek"
              value={locationName}
              onChangeText={setLocationName}
              placeholderTextColor={Colors.textMuted}
            />
          </View>

          {/* GPS Note */}
          {location && (
            <View style={styles.gpsNote}>
              <Text style={styles.gpsNoteText}>
                📍 Current GPS: {location.latitude.toFixed(4)}, {location.longitude.toFixed(4)}
              </Text>
            </View>
          )}

          {/* Notes */}
          <View style={styles.section}>
            <Text style={styles.label}>Notes (optional)</Text>
            <TextInput
              style={[styles.textInput, styles.multilineInput]}
              placeholder="Behavior, wind direction, weather, etc."
              value={notes}
              onChangeText={setNotes}
              multiline
              placeholderTextColor={Colors.textMuted}
            />
          </View>
        </ScrollView>

        {/* Footer Actions */}
        <View style={styles.footer}>
          <TouchableOpacity
            style={styles.cancelButton}
            onPress={onClose}
            disabled={saving}
            accessibilityLabel="Cancel"
          >
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.logButton}
            onPress={logSighting}
            disabled={saving}
            accessibilityLabel="Log sighting"
          >
            {saving ? (
              <Text style={styles.logButtonText}>Logging...</Text>
            ) : (
              <Text style={styles.logButtonText}>Log Sighting</Text>
            )}
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </Modal>
  );
};

// ─── Styles ─────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.mud,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  closeButton: {
    fontSize: 24,
    color: Colors.textSecondary,
    width: 30,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 100,
  },
  section: {
    marginBottom: 20,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.tan,
    marginBottom: 6,
  },
  pickerContainer: {
    backgroundColor: Colors.surface,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.mud,
    overflow: 'hidden',
  },
  picker: {
    height: 120,
  },
  countContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
  },
  countButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: Colors.moss,
    justifyContent: 'center',
    alignItems: 'center',
  },
  countButtonText: {
    fontSize: 28,
    fontWeight: '700',
    color: Colors.mdWhite,
  },
  countDisplay: {
    fontSize: 32,
    fontWeight: '700',
    color: Colors.textPrimary,
    minWidth: 60,
    textAlign: 'center',
  },
  distanceInput: {
    backgroundColor: Colors.surface,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.mud,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: Colors.textPrimary,
    fontSize: 15,
    marginBottom: 6,
  },
  distanceLabel: {
    fontSize: 12,
    color: Colors.textSecondary,
    fontWeight: '500',
  },
  textInput: {
    backgroundColor: Colors.surface,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.mud,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: Colors.textPrimary,
    fontSize: 15,
  },
  multilineInput: {
    minHeight: 60,
    textAlignVertical: 'top',
  },
  gpsNote: {
    backgroundColor: Colors.surfaceElevated,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 16,
  },
  gpsNoteText: {
    fontSize: 12,
    color: Colors.textSecondary,
    fontFamily: 'Menlo',
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    gap: 12,
    padding: 16,
    backgroundColor: Colors.background,
    borderTopWidth: 1,
    borderTopColor: Colors.mud,
  },
  cancelButton: {
    flex: 1,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.mud,
    paddingVertical: 12,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  logButton: {
    flex: 1,
    borderRadius: 8,
    backgroundColor: Colors.moss,
    paddingVertical: 12,
    alignItems: 'center',
  },
  logButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.mdWhite,
  },
});
