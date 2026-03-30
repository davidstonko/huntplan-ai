/**
 * PlanCreationFlow — Step-by-step wizard for creating a hunt plan.
 * Steps: 1) Name  2) Set parking point  3) Add annotations  4) Review & Save
 * Rendered as a bottom sheet overlay on the ScoutScreen map.
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Alert,
} from 'react-native';
import { useScoutData } from '../../context/ScoutDataContext';
import { WaypointIcon, WAYPOINT_ICONS } from '../../types/scout';
import Colors from '../../theme/colors';

type Step = 'name' | 'parking' | 'annotate' | 'review';

interface PlanCreationFlowProps {
  /** Called when wizard finishes or is cancelled */
  onDone: () => void;
  /** Called when user should tap map to set parking point */
  onRequestMapTap: (mode: 'parking' | 'waypoint') => void;
  /** Currently active plan ID (set after name step) */
  activePlanId: string | null;
}

const ICON_OPTIONS: { icon: WaypointIcon; label: string }[] = [
  { icon: 'stand', label: 'Tree Stand' },
  { icon: 'blind', label: 'Ground Blind' },
  { icon: 'camera', label: 'Trail Cam' },
  { icon: 'feeder', label: 'Feeder' },
  { icon: 'food-plot', label: 'Food Plot' },
  { icon: 'water', label: 'Water' },
  { icon: 'crossing', label: 'Crossing' },
  { icon: 'sign', label: 'Sign/Rub' },
  { icon: 'custom', label: 'Custom Pin' },
];

export default function PlanCreationFlow({
  onDone,
  onRequestMapTap,
  activePlanId,
}: PlanCreationFlowProps) {
  const { createPlan, getPlan, updatePlan } = useScoutData();
  const [step, setStep] = useState<Step>('name');
  const [planName, setPlanName] = useState('');
  const [planNotes, setPlanNotes] = useState('');
  const [selectedWaypointIcon, setSelectedWaypointIcon] = useState<WaypointIcon>('stand');
  const [currentPlanId, setCurrentPlanId] = useState<string | null>(activePlanId);

  const currentPlan = currentPlanId ? getPlan(currentPlanId) : undefined;

  const handleCreatePlan = () => {
    if (!planName.trim()) {
      Alert.alert('Name Required', 'Please enter a name for your hunt plan.');
      return;
    }
    const newPlan = createPlan(planName.trim());
    setCurrentPlanId(newPlan.id);
    setStep('parking');
  };

  const handleSkipParking = () => {
    setStep('annotate');
  };

  const handleSetParking = () => {
    onRequestMapTap('parking');
    // The ScoutScreen will handle the actual map tap and set the parking point
    // For now, advance to annotate step
    setStep('annotate');
  };

  const handleAddWaypoint = () => {
    onRequestMapTap('waypoint');
  };

  const handleFinish = () => {
    if (currentPlan && planNotes.trim()) {
      updatePlan({ ...currentPlan, notes: planNotes.trim() });
    }
    onDone();
  };

  const handleCancel = () => {
    Alert.alert('Cancel Plan', 'Discard this plan?', [
      { text: 'Keep Editing', style: 'cancel' },
      { text: 'Discard', style: 'destructive', onPress: onDone },
    ]);
  };

  // ── Step 1: Name ──
  if (step === 'name') {
    return (
      <View style={styles.container}>
        <View style={styles.stepHeader}>
          <Text style={styles.stepNumber}>Step 1 of 4</Text>
          <Text style={styles.stepTitle}>Name Your Hunt Plan</Text>
        </View>
        <TextInput
          style={styles.input}
          placeholder="e.g., Opening Day Turkey — Green Ridge"
          placeholderTextColor={Colors.textMuted}
          value={planName}
          onChangeText={setPlanName}
          autoFocus
        />
        <View style={styles.buttonRow}>
          <TouchableOpacity style={styles.cancelBtn} onPress={handleCancel}>
            <Text style={styles.cancelText}>Cancel</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.nextBtn} onPress={handleCreatePlan}>
            <Text style={styles.nextText}>Next: Set Parking</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // ── Step 2: Set Parking Point ──
  if (step === 'parking') {
    return (
      <View style={styles.container}>
        <View style={styles.stepHeader}>
          <Text style={styles.stepNumber}>Step 2 of 4</Text>
          <Text style={styles.stepTitle}>Set Parking / Start Point</Text>
          <Text style={styles.stepSubtitle}>
            Tap the map where you'll park, or skip for now.
          </Text>
        </View>
        {currentPlan?.parkingPoint && (
          <View style={styles.confirmRow}>
            <Text style={styles.confirmIcon}>{WAYPOINT_ICONS.parking}</Text>
            <Text style={styles.confirmText}>
              Parking set at {currentPlan.parkingPoint.lat.toFixed(4)}, {currentPlan.parkingPoint.lng.toFixed(4)}
            </Text>
          </View>
        )}
        <View style={styles.buttonRow}>
          <TouchableOpacity style={styles.cancelBtn} onPress={handleSkipParking}>
            <Text style={styles.cancelText}>Skip</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.mapTapBtn} onPress={handleSetParking}>
            <Text style={styles.mapTapText}>{'\uD83D\uDCCD'} Tap Map to Set</Text>
          </TouchableOpacity>
          {currentPlan?.parkingPoint && (
            <TouchableOpacity style={styles.nextBtn} onPress={() => setStep('annotate')}>
              <Text style={styles.nextText}>Next</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  }

  // ── Step 3: Add Annotations ──
  if (step === 'annotate') {
    return (
      <View style={styles.container}>
        <View style={styles.stepHeader}>
          <Text style={styles.stepNumber}>Step 3 of 4</Text>
          <Text style={styles.stepTitle}>Add Annotations</Text>
          <Text style={styles.stepSubtitle}>
            Select an icon type, then tap the map to place it.
          </Text>
        </View>

        {/* Icon picker */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.iconPicker}
          contentContainerStyle={styles.iconPickerContent}
        >
          {ICON_OPTIONS.map((opt) => (
            <TouchableOpacity
              key={opt.icon}
              style={[
                styles.iconOption,
                selectedWaypointIcon === opt.icon && styles.iconOptionActive,
              ]}
              onPress={() => setSelectedWaypointIcon(opt.icon)}
            >
              <Text style={styles.iconEmoji}>{WAYPOINT_ICONS[opt.icon]}</Text>
              <Text style={styles.iconLabel}>{opt.label}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        <TouchableOpacity style={styles.mapTapBtn} onPress={handleAddWaypoint}>
          <Text style={styles.mapTapText}>
            {WAYPOINT_ICONS[selectedWaypointIcon]} Tap Map to Place {ICON_OPTIONS.find(o => o.icon === selectedWaypointIcon)?.label}
          </Text>
        </TouchableOpacity>

        {/* Current annotation count */}
        {currentPlan && (
          <Text style={styles.countText}>
            {currentPlan.waypoints.length} waypoints · {currentPlan.routes.length} routes · {currentPlan.areas.length} areas
          </Text>
        )}

        <View style={styles.buttonRow}>
          <TouchableOpacity style={styles.cancelBtn} onPress={() => setStep('parking')}>
            <Text style={styles.cancelText}>Back</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.nextBtn} onPress={() => setStep('review')}>
            <Text style={styles.nextText}>Next: Review</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // ── Step 4: Review & Save ──
  return (
    <View style={styles.container}>
      <View style={styles.stepHeader}>
        <Text style={styles.stepNumber}>Step 4 of 4</Text>
        <Text style={styles.stepTitle}>Review & Save</Text>
      </View>

      {currentPlan && (
        <View style={styles.reviewCard}>
          <View style={styles.reviewRow}>
            <Text style={styles.reviewLabel}>Plan:</Text>
            <Text style={styles.reviewValue}>{currentPlan.name}</Text>
          </View>
          <View style={styles.reviewRow}>
            <Text style={styles.reviewLabel}>Color:</Text>
            <View style={[styles.colorDot, { backgroundColor: currentPlan.color }]} />
          </View>
          <View style={styles.reviewRow}>
            <Text style={styles.reviewLabel}>Parking:</Text>
            <Text style={styles.reviewValue}>
              {currentPlan.parkingPoint ? 'Set' : 'Not set'}
            </Text>
          </View>
          <View style={styles.reviewRow}>
            <Text style={styles.reviewLabel}>Waypoints:</Text>
            <Text style={styles.reviewValue}>{currentPlan.waypoints.length}</Text>
          </View>
          <View style={styles.reviewRow}>
            <Text style={styles.reviewLabel}>Routes:</Text>
            <Text style={styles.reviewValue}>{currentPlan.routes.length}</Text>
          </View>
          <View style={styles.reviewRow}>
            <Text style={styles.reviewLabel}>Areas:</Text>
            <Text style={styles.reviewValue}>{currentPlan.areas.length}</Text>
          </View>
        </View>
      )}

      <TextInput
        style={[styles.input, styles.notesInput]}
        placeholder="Add notes (optional)"
        placeholderTextColor={Colors.textMuted}
        value={planNotes}
        onChangeText={setPlanNotes}
        multiline
      />

      <View style={styles.buttonRow}>
        <TouchableOpacity style={styles.cancelBtn} onPress={() => setStep('annotate')}>
          <Text style={styles.cancelText}>Back</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.saveBtn} onPress={handleFinish}>
          <Text style={styles.saveText}>Save Plan</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 60,
    left: 10,
    right: 10,
    backgroundColor: Colors.surfaceElevated,
    borderRadius: 14,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 10,
    borderWidth: 1,
    borderColor: Colors.clay,
  },

  stepHeader: {
    marginBottom: 12,
  },
  stepNumber: {
    fontSize: 10,
    fontWeight: '700',
    color: Colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 2,
  },
  stepTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: Colors.tan,
  },
  stepSubtitle: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 4,
    lineHeight: 18,
  },

  input: {
    backgroundColor: Colors.surface,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: Colors.textPrimary,
    borderWidth: 1,
    borderColor: Colors.mud,
    marginBottom: 12,
  },
  notesInput: {
    height: 60,
    textAlignVertical: 'top',
  },

  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
    marginTop: 4,
  },
  cancelBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
  },
  cancelText: {
    color: Colors.textMuted,
    fontSize: 13,
    fontWeight: '600',
  },
  nextBtn: {
    backgroundColor: Colors.moss,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
  },
  nextText: {
    color: Colors.textOnAccent,
    fontSize: 13,
    fontWeight: '700',
  },
  saveBtn: {
    backgroundColor: Colors.oak,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
  },
  saveText: {
    color: Colors.textOnAccent,
    fontSize: 14,
    fontWeight: '700',
  },
  mapTapBtn: {
    backgroundColor: Colors.forestDark,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.moss,
    marginBottom: 8,
  },
  mapTapText: {
    color: Colors.lichen,
    fontSize: 13,
    fontWeight: '600',
  },

  confirmRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
    backgroundColor: Colors.forestDark,
    padding: 8,
    borderRadius: 8,
  },
  confirmIcon: { fontSize: 18 },
  confirmText: { fontSize: 12, color: Colors.sage },

  // Icon picker
  iconPicker: {
    marginBottom: 10,
  },
  iconPickerContent: {
    gap: 6,
    paddingVertical: 4,
  },
  iconOption: {
    alignItems: 'center',
    padding: 6,
    borderRadius: 8,
    minWidth: 56,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  iconOptionActive: {
    borderColor: Colors.moss,
    backgroundColor: Colors.forestDark,
  },
  iconEmoji: {
    fontSize: 22,
    marginBottom: 2,
  },
  iconLabel: {
    fontSize: 8,
    color: Colors.textMuted,
    fontWeight: '600',
  },

  countText: {
    fontSize: 11,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginBottom: 8,
  },

  // Review
  reviewCard: {
    backgroundColor: Colors.surface,
    borderRadius: 10,
    padding: 12,
    marginBottom: 12,
  },
  reviewRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 3,
  },
  reviewLabel: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
  reviewValue: {
    fontSize: 12,
    color: Colors.textPrimary,
    fontWeight: '600',
  },
  colorDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
  },
});
