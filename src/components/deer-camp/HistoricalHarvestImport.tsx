/**
 * @file HistoricalHarvestImport.tsx
 * @description Modal/screen for importing historical harvest data into a deer camp.
 * Users can add past harvests to help the AI learn camp patterns and behavior.
 *
 * @module Components
 * @version 1.0.0
 */

import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
  Alert,
  SafeAreaView,
  FlatList,
  Switch,
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Colors from '../../theme/colors';
import { DeerCamp } from '../../types/deercamp';

// ─── Types ──────────────────────────────────────────────────────

export interface HistoricalHarvest {
  id: string;
  species: string;
  year: number;
  season: string;
  weapon: string;
  location: string;
  antlerPoints?: number;
  weight?: number;
  timeOfDay: string;
  notes?: string;
  addedAt: string;
}

interface Props {
  camp: DeerCamp;
  visible: boolean;
  onClose: () => void;
  onSave: (harvests: HistoricalHarvest[]) => Promise<void>;
}

const SPECIES_OPTIONS = ['Deer', 'Turkey', 'Waterfowl', 'Bear', 'Small Game'];
const YEAR_OPTIONS = Array.from({ length: 12 }, (_, i) => 2026 - i);
const SEASON_OPTIONS = ['Archery', 'Firearms', 'Muzzleloader', 'Late Season'];
const WEAPON_OPTIONS = ['Archery', 'Firearms', 'Muzzleloader', 'Shotgun'];
const TIME_OF_DAY_OPTIONS = ['Morning', 'Midday', 'Evening'];

// ─── Main Component ─────────────────────────────────────────────

export const HistoricalHarvestImport: React.FC<Props> = ({
  camp,
  visible,
  onClose,
  onSave,
}) => {
  const [harvestsList, setHarvestsList] = useState<HistoricalHarvest[]>([]);
  const [saving, setSaving] = useState(false);

  // Form state for new harvest
  const [formSpecies, setFormSpecies] = useState('Deer');
  const [formYear, setFormYear] = useState(2025);
  const [formSeason, setFormSeason] = useState('Archery');
  const [formWeapon, setFormWeapon] = useState('Archery');
  const [formLocation, setFormLocation] = useState('');
  const [formAntlerPoints, setFormAntlerPoints] = useState('');
  const [formWeight, setFormWeight] = useState('');
  const [formTimeOfDay, setFormTimeOfDay] = useState('Morning');
  const [formNotes, setFormNotes] = useState('');

  const resetForm = useCallback(() => {
    setFormSpecies('Deer');
    setFormYear(2025);
    setFormSeason('Archery');
    setFormWeapon('Archery');
    setFormLocation('');
    setFormAntlerPoints('');
    setFormWeight('');
    setFormTimeOfDay('Morning');
    setFormNotes('');
  }, []);

  const addHarvest = useCallback(() => {
    if (!formLocation.trim()) {
      Alert.alert('Location Required', 'Please enter a location within the camp.');
      return;
    }

    const harvest: HistoricalHarvest = {
      id: Date.now().toString(36) + Math.random().toString(36).substr(2, 9),
      species: formSpecies,
      year: formYear,
      season: formSeason,
      weapon: formWeapon,
      location: formLocation.trim(),
      antlerPoints: formSpecies === 'Deer' && formAntlerPoints
        ? parseInt(formAntlerPoints)
        : undefined,
      weight: formWeight ? parseInt(formWeight) : undefined,
      timeOfDay: formTimeOfDay,
      notes: formNotes.trim() || undefined,
      addedAt: new Date().toISOString(),
    };

    setHarvestsList((prev) => [...prev, harvest]);
    resetForm();
    Alert.alert('Added', `${formSpecies} harvest from ${formYear} added to list.`);
  }, [
    formSpecies,
    formYear,
    formSeason,
    formWeapon,
    formLocation,
    formAntlerPoints,
    formWeight,
    formTimeOfDay,
    formNotes,
    resetForm,
  ]);

  const removeHarvest = useCallback((harvestId: string) => {
    setHarvestsList((prev) => prev.filter((h) => h.id !== harvestId));
  }, []);

  const saveHarvests = useCallback(async () => {
    if (harvestsList.length === 0) {
      Alert.alert('Nothing to Save', 'Add at least one harvest to import.');
      return;
    }

    setSaving(true);
    try {
      await onSave(harvestsList);
      Alert.alert('Success', `${harvestsList.length} harvest(es) saved to camp.`);
      setHarvestsList([]);
      onClose();
    } catch (error: any) {
      Alert.alert('Error', `Failed to save harvests: ${error.message}`);
    } finally {
      setSaving(false);
    }
  }, [harvestsList, onSave, onClose]);

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
          <Text style={styles.title}>Import Historical Harvests</Text>
          <View style={{ width: 30 }} />
        </View>

        {/* Explanation */}
        <View style={styles.explanation}>
          <Text style={styles.explanationText}>
            Add past harvests to help the AI learn your camp. The more data, the better the insights.
          </Text>
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent}>
          {/* Form Section */}
          <View style={styles.formSection}>
            <Text style={styles.sectionTitle}>Add Historical Harvest</Text>

            {/* Species Picker */}
            <Text style={styles.label}>Species</Text>
            <View style={styles.pickerContainer}>
              <Picker
                selectedValue={formSpecies}
                onValueChange={setFormSpecies}
                style={styles.picker}
              >
                {SPECIES_OPTIONS.map((s) => (
                  <Picker.Item key={s} label={s} value={s} />
                ))}
              </Picker>
            </View>

            {/* Year Picker */}
            <Text style={styles.label}>Year</Text>
            <View style={styles.pickerContainer}>
              <Picker
                selectedValue={formYear}
                onValueChange={setFormYear}
                style={styles.picker}
              >
                {YEAR_OPTIONS.map((y) => (
                  <Picker.Item key={y} label={y.toString()} value={y} />
                ))}
              </Picker>
            </View>

            {/* Season Picker */}
            <Text style={styles.label}>Season</Text>
            <View style={styles.pickerContainer}>
              <Picker
                selectedValue={formSeason}
                onValueChange={setFormSeason}
                style={styles.picker}
              >
                {SEASON_OPTIONS.map((s) => (
                  <Picker.Item key={s} label={s} value={s} />
                ))}
              </Picker>
            </View>

            {/* Weapon Picker */}
            <Text style={styles.label}>Weapon / Method</Text>
            <View style={styles.pickerContainer}>
              <Picker
                selectedValue={formWeapon}
                onValueChange={setFormWeapon}
                style={styles.picker}
              >
                {WEAPON_OPTIONS.map((w) => (
                  <Picker.Item key={w} label={w} value={w} />
                ))}
              </Picker>
            </View>

            {/* Location Input */}
            <Text style={styles.label}>Location Within Camp</Text>
            <TextInput
              style={styles.textInput}
              placeholder="e.g., North Ridge, Blind 3, Creek Bottom"
              value={formLocation}
              onChangeText={setFormLocation}
              placeholderTextColor={Colors.textMuted}
            />

            {/* Antler Points (Deer only) */}
            {formSpecies === 'Deer' && (
              <>
                <Text style={styles.label}>Antler Points (optional)</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="e.g., 8"
                  value={formAntlerPoints}
                  onChangeText={setFormAntlerPoints}
                  keyboardType="numeric"
                  placeholderTextColor={Colors.textMuted}
                />
              </>
            )}

            {/* Weight */}
            <Text style={styles.label}>Weight in lbs (optional)</Text>
            <TextInput
              style={styles.textInput}
              placeholder="e.g., 175"
              value={formWeight}
              onChangeText={setFormWeight}
              keyboardType="numeric"
              placeholderTextColor={Colors.textMuted}
            />

            {/* Time of Day */}
            <Text style={styles.label}>Time of Day</Text>
            <View style={styles.pickerContainer}>
              <Picker
                selectedValue={formTimeOfDay}
                onValueChange={setFormTimeOfDay}
                style={styles.picker}
              >
                {TIME_OF_DAY_OPTIONS.map((t) => (
                  <Picker.Item key={t} label={t} value={t} />
                ))}
              </Picker>
            </View>

            {/* Notes */}
            <Text style={styles.label}>Notes (optional)</Text>
            <TextInput
              style={[styles.textInput, styles.multilineInput]}
              placeholder="Weather, conditions, story..."
              value={formNotes}
              onChangeText={setFormNotes}
              multiline
              placeholderTextColor={Colors.textMuted}
            />

            {/* Add Button */}
            <TouchableOpacity
              style={styles.addButton}
              onPress={addHarvest}
              accessibilityLabel="Add harvest"
              accessibilityRole="button"
            >
              <Text style={styles.addButtonText}>+ Add Harvest</Text>
            </TouchableOpacity>
          </View>

          {/* Harvests List */}
          {harvestsList.length > 0 && (
            <View style={styles.listSection}>
              <Text style={styles.sectionTitle}>
                {harvestsList.length} Harvest{harvestsList.length !== 1 ? 'es' : ''} Added
              </Text>

              {harvestsList.map((harvest) => (
                <View key={harvest.id} style={styles.harvestCard}>
                  <View style={styles.harvestHeader}>
                    <View>
                      <Text style={styles.harvestTitle}>
                        {harvest.species} — {harvest.year}
                      </Text>
                      <Text style={styles.harvestSubtitle}>
                        {harvest.season} ({harvest.weapon})
                      </Text>
                    </View>
                    <TouchableOpacity
                      onPress={() => removeHarvest(harvest.id)}
                      accessibilityLabel="Remove harvest"
                    >
                      <Text style={styles.removeButton}>✕</Text>
                    </TouchableOpacity>
                  </View>

                  <View style={styles.harvestDetails}>
                    <Text style={styles.detail}>📍 {harvest.location}</Text>
                    <Text style={styles.detail}>🕐 {harvest.timeOfDay}</Text>
                    {harvest.antlerPoints && (
                      <Text style={styles.detail}>{harvest.antlerPoints}-point</Text>
                    )}
                    {harvest.weight && (
                      <Text style={styles.detail}>~{harvest.weight} lbs</Text>
                    )}
                  </View>

                  {harvest.notes && (
                    <Text style={styles.notes}>{harvest.notes}</Text>
                  )}
                </View>
              ))}
            </View>
          )}

          {harvestsList.length === 0 && (
            <View style={styles.emptyState}>
              <Text style={styles.emptyIcon}>📋</Text>
              <Text style={styles.emptyText}>No harvests added yet.</Text>
              <Text style={styles.emptySubtext}>Add your first historical harvest above.</Text>
            </View>
          )}
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
            style={[styles.saveButton, harvestsList.length === 0 && styles.saveButtonDisabled]}
            onPress={saveHarvests}
            disabled={harvestsList.length === 0 || saving}
            accessibilityLabel="Save all harvests"
          >
            {saving ? (
              <Text style={styles.saveButtonText}>Saving...</Text>
            ) : (
              <Text style={styles.saveButtonText}>
                Save All ({harvestsList.length})
              </Text>
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
  explanation: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: Colors.surfaceElevated,
    marginBottom: 8,
  },
  explanationText: {
    fontSize: 14,
    color: Colors.textSecondary,
    lineHeight: 20,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 100,
  },
  formSection: {
    marginBottom: 24,
  },
  listSection: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginBottom: 12,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.tan,
    marginTop: 12,
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
  addButton: {
    backgroundColor: Colors.moss,
    borderRadius: 8,
    paddingVertical: 12,
    marginTop: 16,
    alignItems: 'center',
  },
  addButtonText: {
    color: Colors.mdWhite,
    fontSize: 15,
    fontWeight: '600',
  },
  harvestCard: {
    backgroundColor: Colors.surface,
    borderRadius: 10,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: Colors.mud,
  },
  harvestHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  harvestTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  harvestSubtitle: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  removeButton: {
    fontSize: 20,
    color: Colors.mdRed,
    width: 24,
    textAlign: 'center',
  },
  harvestDetails: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 6,
  },
  detail: {
    fontSize: 12,
    color: Colors.tan,
    backgroundColor: Colors.surfaceElevated,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  notes: {
    fontSize: 12,
    color: Colors.textMuted,
    fontStyle: 'italic',
    marginTop: 4,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 12,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.textPrimary,
    marginBottom: 4,
  },
  emptySubtext: {
    fontSize: 14,
    color: Colors.textSecondary,
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
  saveButton: {
    flex: 1,
    borderRadius: 8,
    backgroundColor: Colors.moss,
    paddingVertical: 12,
    alignItems: 'center',
  },
  saveButtonDisabled: {
    backgroundColor: Colors.textMuted,
    opacity: 0.6,
  },
  saveButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.mdWhite,
  },
});
