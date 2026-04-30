/**
 * FishWaypointPicker — Interactive waypoint type selector for fishing/boating/crabbing.
 *
 * Same pattern as the hunt WaypointPicker but configured for fishing:
 * 1. Category tabs (horizontal scroll) — Freshwater, Saltwater, Structure, Water, Intel, Crabbing, Boating, Events, Access, General
 * 2. Type grid (3 columns) — Fish species, structure types, water features, crabbing gear, etc.
 * 3. Details section — Photo, notes, date, optional species/depth fields, share toggle
 * 4. Action buttons — Place on Map / Cancel
 *
 * Water-themed dark blue accents (Colors.water, Colors.waterLight) throughout.
 * Uses FISH_ICON_GLYPHS from fishWaypoints.ts for icon rendering.
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Modal,
  Switch,
  Image,
  Alert,
  FlatList,
} from 'react-native';
import {
  getFishWaypointsByCategory,
  getActiveFishCategories,
  FishWaypointCategory,
  FishWaypointType,
  getFishWaypointEntry,
} from '../../types/fishWaypoints';
import { WaypointIcon } from '../icons/WaypointIcons';
import Colors from '../../theme/colors';
import { pickPhoto } from '../../services/imagePicker';

// ══════════════════════════════════════════════════════════════
// Types
// ══════════════════════════════════════════════════════════════

export interface FishWaypointPickerResult {
  type: FishWaypointType;
  notes: string;
  photoUri?: string;
  observedAt: string; // ISO timestamp
  sharedToHole: boolean;
  species?: string;
  depthFt?: number;
}

interface FishWaypointPickerProps {
  visible: boolean;
  onConfirm: (config: FishWaypointPickerResult) => void;
  onCancel: () => void;
  linkedHoleId?: string; // if spot is linked to Honey Hole group, show sharing toggle
}

// ══════════════════════════════════════════════════════════════
// Component
// ══════════════════════════════════════════════════════════════

export const FishWaypointPicker: React.FC<FishWaypointPickerProps> = ({
  visible,
  onConfirm,
  onCancel,
  linkedHoleId,
}) => {
  // ── State ──
  const categories = getActiveFishCategories();
  const [activeCategory, setActiveCategory] = useState<FishWaypointCategory>(
    categories[0]?.id || 'freshwater_fish'
  );
  const [selectedType, setSelectedType] = useState<FishWaypointType | null>(null);
  const [notes, setNotes] = useState('');
  const [photoUri, setPhotoUri] = useState<string | undefined>(undefined);
  const [sharedToHole, setSharedToHole] = useState(!!linkedHoleId);
  const [observedAt] = useState(new Date().toISOString());
  const [species, setSpecies] = useState('');
  const [depthFt, setDepthFt] = useState('');

  const currentCategoryTypes = getFishWaypointsByCategory(activeCategory);

  // Auto-fill species from type name if it's a fish type
  const handleSelectType = (type: FishWaypointType) => {
    setSelectedType(type);
    // For fish species types, pre-fill species field from type name
    if (
      type.includes('bass') ||
      type.includes('catfish') ||
      type.includes('perch') ||
      type.includes('trout') ||
      type.includes('pike') ||
      type.includes('fish') ||
      type.includes('shad') ||
      type.includes('carp')
    ) {
      const entry = getFishWaypointEntry(type);
      setSpecies(entry.shortLabel);
    } else {
      setSpecies('');
    }
  };

  const handleAddPhoto = async () => {
    // 2026-04-27: wired to the existing pickPhoto helper (camera +
    // photo library chooser). Replaces the prior "coming soon" alert.
    try {
      const uri = await pickPhoto();
      if (uri) {
        setPhotoUri(uri);
      }
    } catch (err) {
      // pickPhoto handles its own permission prompts; surface anything
      // unexpected (e.g., user canceled action sheet) gracefully.
      if (__DEV__) {
        console.warn('[FishWaypointPicker] photo picker error', err);
      }
    }
  };

  const handleConfirm = () => {
    if (!selectedType) {
      Alert.alert('Type Required', 'Please select a waypoint type.');
      return;
    }

    onConfirm({
      type: selectedType,
      notes: notes.trim(),
      photoUri,
      observedAt,
      sharedToHole,
      species: species.trim() || undefined,
      depthFt: depthFt.trim() ? parseInt(depthFt, 10) : undefined,
    });

    // Reset state for next use
    resetState();
  };

  const handleCancel = () => {
    resetState();
    onCancel();
  };

  const resetState = () => {
    setSelectedType(null);
    setNotes('');
    setPhotoUri(undefined);
    setSharedToHole(!!linkedHoleId);
    setSpecies('');
    setDepthFt('');
  };

  // ── Render ──

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={handleCancel}>
      <View style={styles.overlay}>
        <View style={styles.container}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.headerTitle}>Add Waypoint</Text>
            <TouchableOpacity onPress={handleCancel}>
              <Text style={styles.headerClose}>✕</Text>
            </TouchableOpacity>
          </View>

          {/* Main content — scrollable */}
          <ScrollView
            style={styles.content}
            showsVerticalScrollIndicator={true}
            scrollIndicatorInsets={{ right: 1 }}
          >
            {/* Category tabs */}
            <View style={styles.categoryTabsSection}>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                scrollIndicatorInsets={{ bottom: 1 }}
                contentContainerStyle={styles.categoryTabsContent}
              >
                {categories.map((cat) => (
                  <TouchableOpacity
                    key={cat.id}
                    style={[
                      styles.categoryTab,
                      activeCategory === cat.id && styles.categoryTabActive,
                    ]}
                    onPress={() => {
                      setActiveCategory(cat.id);
                      setSelectedType(null); // Reset selection when changing category
                    }}
                  >
                    <Text style={styles.categoryTabLabel}>{cat.label}</Text>
                    {activeCategory === cat.id && (
                      <View
                        style={[styles.categoryTabUnderline, { backgroundColor: cat.color }]}
                      />
                    )}
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            {/* Type grid — 3 columns */}
            <View style={styles.typeGridSection}>
              <FlatList
                scrollEnabled={false}
                data={currentCategoryTypes}
                numColumns={3}
                keyExtractor={(item) => item.type}
                columnWrapperStyle={styles.gridRow}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={[
                      styles.typeButton,
                      selectedType === item.type && styles.typeButtonSelected,
                    ]}
                    onPress={() => handleSelectType(item.type)}
                  >
                    <View style={styles.typeIconContainer}>
                      <WaypointIcon
                        iconKey={item.iconKey}
                        size={40}
                        color={item.color}
                        backgroundColor={Colors.surface}
                        showBorder={selectedType === item.type}
                      />
                    </View>
                    <Text style={styles.typeLabel} numberOfLines={2}>
                      {item.label}
                    </Text>
                  </TouchableOpacity>
                )}
              />
            </View>

            {/* Details section (shown after type is selected) */}
            {selectedType && (
              <View style={styles.detailsSection}>
                <Text style={styles.detailsSectionTitle}>Details</Text>

                {/* Photo section */}
                <View style={styles.detailsGroup}>
                  <Text style={styles.detailsLabel}>Photo</Text>
                  {photoUri ? (
                    <View style={styles.photoContainer}>
                      <Image
                        source={{ uri: photoUri }}
                        style={styles.photoPreview}
                      />
                      <TouchableOpacity
                        style={styles.photoRemove}
                        onPress={() => setPhotoUri(undefined)}
                      >
                        <Text style={styles.photoRemoveText}>✕</Text>
                      </TouchableOpacity>
                    </View>
                  ) : (
                    <TouchableOpacity
                      style={styles.photoButton}
                      onPress={handleAddPhoto}
                    >
                      <Text style={styles.photoButtonIcon}>📷</Text>
                      <Text style={styles.photoButtonText}>Add Photo</Text>
                    </TouchableOpacity>
                  )}
                </View>

                {/* Notes field */}
                <View style={styles.detailsGroup}>
                  <Text style={styles.detailsLabel}>Notes</Text>
                  <TextInput
                    style={styles.notesInput}
                    placeholder="Add notes visible to your Honey Hole group..."
                    placeholderTextColor={Colors.textMuted}
                    value={notes}
                    onChangeText={setNotes}
                    multiline
                    maxLength={300}
                  />
                  <Text style={styles.charCount}>
                    {notes.length} / 300
                  </Text>
                </View>

                {/* Species field */}
                <View style={styles.detailsGroup}>
                  <Text style={styles.detailsLabel}>Species</Text>
                  <TextInput
                    style={styles.speciesInput}
                    placeholder="Fish species name (optional)"
                    placeholderTextColor={Colors.textMuted}
                    value={species}
                    onChangeText={setSpecies}
                    maxLength={50}
                  />
                </View>

                {/* Depth field */}
                <View style={styles.detailsGroup}>
                  <Text style={styles.detailsLabel}>Depth (feet)</Text>
                  <TextInput
                    style={styles.depthInput}
                    placeholder="e.g., 12"
                    placeholderTextColor={Colors.textMuted}
                    value={depthFt}
                    onChangeText={setDepthFt}
                    keyboardType="number-pad"
                    maxLength={4}
                  />
                </View>

                {/* Date/Time (display only for now) */}
                <View style={styles.detailsGroup}>
                  <Text style={styles.detailsLabel}>Observed</Text>
                  <Text style={styles.dateTimeText}>
                    {new Date(observedAt).toLocaleString()}
                  </Text>
                </View>

                {/* Share to Honey Hole toggle */}
                {linkedHoleId && (
                  <View style={styles.detailsGroup}>
                    <View style={styles.shareToggleRow}>
                      <Text style={styles.detailsLabel}>Share to Honey Hole</Text>
                      <Switch
                        value={sharedToHole}
                        onValueChange={setSharedToHole}
                        trackColor={{ false: Colors.mud, true: Colors.water }}
                        thumbColor={sharedToHole ? Colors.waterLight : Colors.textMuted}
                      />
                    </View>
                  </View>
                )}
              </View>
            )}
          </ScrollView>

          {/* Action buttons */}
          <View style={styles.actionButtons}>
            <TouchableOpacity style={styles.cancelButton} onPress={handleCancel}>
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.placeButton,
                !selectedType && styles.placeButtonDisabled,
              ]}
              onPress={handleConfirm}
              disabled={!selectedType}
            >
              <Text style={styles.placeButtonText}>Place on Map</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

// ══════════════════════════════════════════════════════════════
// Styles
// ══════════════════════════════════════════════════════════════

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'flex-end',
  },

  container: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '90%',
    display: 'flex',
    flexDirection: 'column',
  },

  // ── Header ──
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.mud,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.tan,
  },
  headerClose: {
    fontSize: 22,
    color: Colors.textMuted,
    width: 32,
    textAlign: 'right',
  },

  // ── Content ──
  content: {
    flex: 1,
    paddingHorizontal: 16,
  },

  // ── Category Tabs ──
  categoryTabsSection: {
    paddingVertical: 12,
    marginBottom: 12,
  },
  categoryTabsContent: {
    paddingHorizontal: 0,
    gap: 12,
  },
  categoryTab: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: Colors.surfaceElevated,
    alignItems: 'center',
  },
  categoryTabActive: {
    backgroundColor: Colors.forestDark,
  },
  categoryTabLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  categoryTabUnderline: {
    marginTop: 4,
    height: 2,
    width: '100%',
    borderRadius: 1,
  },

  // ── Type Grid ──
  typeGridSection: {
    marginBottom: 20,
  },
  gridRow: {
    justifyContent: 'space-between',
    gap: 8,
    marginBottom: 8,
  },
  typeButton: {
    flex: 1,
    aspectRatio: 1,
    backgroundColor: Colors.surfaceElevated,
    borderRadius: 10,
    padding: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  typeButtonSelected: {
    borderColor: Colors.mdGold,
    backgroundColor: Colors.forestDark,
  },
  typeIconContainer: {
    marginBottom: 6,
  },
  typeLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 14,
  },

  // ── Details Section ──
  detailsSection: {
    backgroundColor: Colors.surfaceElevated,
    borderRadius: 10,
    padding: 12,
    marginBottom: 20,
  },
  detailsSectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.tan,
    marginBottom: 12,
  },
  detailsGroup: {
    marginBottom: 12,
  },
  detailsLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.textSecondary,
    marginBottom: 6,
  },

  // Photo
  photoButton: {
    borderWidth: 1,
    borderColor: Colors.mud,
    borderRadius: 8,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  photoButtonIcon: {
    fontSize: 24,
  },
  photoButtonText: {
    fontSize: 12,
    color: Colors.textSecondary,
    fontWeight: '600',
  },
  photoContainer: {
    position: 'relative',
  },
  photoPreview: {
    width: '100%',
    height: 120,
    borderRadius: 8,
    backgroundColor: Colors.surface,
  },
  photoRemove: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  photoRemoveText: {
    fontSize: 16,
    color: Colors.textOnAccent,
    fontWeight: '700',
  },

  // Notes
  notesInput: {
    backgroundColor: Colors.surface,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 13,
    color: Colors.textPrimary,
    borderWidth: 1,
    borderColor: Colors.mud,
    maxHeight: 80,
  },
  charCount: {
    fontSize: 10,
    color: Colors.textMuted,
    marginTop: 4,
    textAlign: 'right',
  },

  // Species
  speciesInput: {
    backgroundColor: Colors.surface,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 13,
    color: Colors.textPrimary,
    borderWidth: 1,
    borderColor: Colors.mud,
  },

  // Depth
  depthInput: {
    backgroundColor: Colors.surface,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 13,
    color: Colors.textPrimary,
    borderWidth: 1,
    borderColor: Colors.mud,
  },

  // Date/Time
  dateTimeText: {
    fontSize: 12,
    color: Colors.textPrimary,
    backgroundColor: Colors.surface,
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },

  // Share toggle
  shareToggleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  // ── Action Buttons ──
  actionButtons: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    paddingBottom: 12 + 20, // Account for notch/safe area
    backgroundColor: Colors.surface,
    borderTopWidth: 1,
    borderTopColor: Colors.mud,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 8,
    backgroundColor: Colors.surfaceElevated,
  },
  cancelButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textMuted,
  },
  placeButton: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 8,
    backgroundColor: Colors.mdGold,
  },
  placeButtonDisabled: {
    opacity: 0.5,
  },
  placeButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.mdBlack,
  },
});

export default FishWaypointPicker;
