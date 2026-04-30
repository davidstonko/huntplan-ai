/**
 * WaypointPicker — Interactive waypoint type selector with photo + notes.
 *
 * Replaces the old horizontal emoji scroll with a professional multi-step interface:
 * 1. Category tabs (horizontal scroll)
 * 2. Type grid (3 columns)
 * 3. Details section (photo, notes, date, sharing toggle)
 * 4. Action buttons (Place on Map / Cancel)
 *
 * Uses the new 60+ waypoint taxonomy from huntWaypoints.ts.
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
  getWaypointsByCategory,
  getActiveCategories,
  WaypointCategory,
  HuntWaypointType,
  getWaypointEntry,
} from '../../types/huntWaypoints';
import { WaypointIcon } from '../icons/WaypointIcons';
import Colors from '../../theme/colors';

// ══════════════════════════════════════════════════════════════
// Types
// ══════════════════════════════════════════════════════════════

export interface WaypointPickerResult {
  type: HuntWaypointType;
  notes: string;
  photoUri?: string;
  observedAt: string; // ISO timestamp
  sharedToCamp: boolean;
}

interface WaypointPickerProps {
  visible: boolean;
  onConfirm: (config: WaypointPickerResult) => void;
  onCancel: () => void;
  linkedCampId?: string; // if plan is linked to a camp, show sharing toggle
}

// ══════════════════════════════════════════════════════════════
// Component
// ══════════════════════════════════════════════════════════════

export const WaypointPicker: React.FC<WaypointPickerProps> = ({
  visible,
  onConfirm,
  onCancel,
  linkedCampId,
}) => {
  // ── State ──
  const categories = getActiveCategories();
  const [activeCategory, setActiveCategory] = useState<WaypointCategory>(
    categories[0]?.id || 'deer'
  );
  const [selectedType, setSelectedType] = useState<HuntWaypointType | null>(null);
  const [notes, setNotes] = useState('');
  const [photoUri, setPhotoUri] = useState<string | undefined>(undefined);
  const [sharedToCamp, setSharedToCamp] = useState(!!linkedCampId);
  const [observedAt] = useState(new Date().toISOString());

  const currentCategoryTypes = getWaypointsByCategory(activeCategory);

  // ── Handlers ──

  const handleSelectType = (type: HuntWaypointType) => {
    setSelectedType(type);
  };

  const handleAddPhoto = () => {
    // TODO: Integrate with react-native-image-picker for real photo capture
    // For now, show a placeholder alert
    Alert.alert(
      'Photo Capture',
      'Photo picker integration coming in next phase.\n\nFor now, you can add notes and place the waypoint.'
    );
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
      sharedToCamp,
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
    setSharedToCamp(!!linkedCampId);
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
                    placeholder="Add notes visible to your Deer Camp..."
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

                {/* Date/Time (display only for now) */}
                <View style={styles.detailsGroup}>
                  <Text style={styles.detailsLabel}>Observed</Text>
                  <Text style={styles.dateTimeText}>
                    {new Date(observedAt).toLocaleString()}
                  </Text>
                </View>

                {/* Share to camp toggle */}
                {linkedCampId && (
                  <View style={styles.detailsGroup}>
                    <View style={styles.shareToggleRow}>
                      <Text style={styles.detailsLabel}>Share to Deer Camp</Text>
                      <Switch
                        value={sharedToCamp}
                        onValueChange={setSharedToCamp}
                        trackColor={{ false: Colors.mud, true: Colors.moss }}
                        thumbColor={sharedToCamp ? Colors.lichen : Colors.textMuted}
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

export default WaypointPicker;
