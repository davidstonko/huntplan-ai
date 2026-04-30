/**
 * StandDetailEditor — Comprehensive tree stand / blind detail form.
 * Covers: height, ideal wind (via WindRosePicker), habitat type,
 * secondary habitat, shot distance, best season, best time of day,
 * target species, and last-checked date.
 *
 * Rendered inline in PlanCreationFlow or as a modal when editing an existing waypoint.
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
} from 'react-native';
import {
  StandDetails,
  StandHabitatType,
  CardinalDirection,
} from '../../types/scout';
import WindRosePicker from './WindRosePicker';
import Colors from '../../theme/colors';

interface StandDetailEditorProps {
  /** Initial stand details (if editing existing) */
  initial?: StandDetails;
  /** Called when user saves details */
  onSave: (details: StandDetails) => void;
  /** Called when user cancels */
  onCancel: () => void;
}

// ── Habitat options with friendly labels + emoji ──
const HABITAT_OPTIONS: { value: StandHabitatType; label: string; emoji: string }[] = [
  { value: 'oak_flat', label: 'Oak Flat', emoji: '\uD83C\uDF3E' },
  { value: 'acorn_ridge', label: 'Acorn Ridge', emoji: '\u26F0\uFE0F' },
  { value: 'field_edge', label: 'Field Edge', emoji: '\uD83C\uDF3E' },
  { value: 'inside_edge', label: 'Inside Edge', emoji: '\u2934\uFE0F' },
  { value: 'outside_edge', label: 'Outside Edge', emoji: '\u2935\uFE0F' },
  { value: 'funnel', label: 'Funnel', emoji: '\uD83D\uDD3D' },
  { value: 'saddle', label: 'Saddle', emoji: '\uD83C\uDFD4\uFE0F' },
  { value: 'creek_bottom', label: 'Creek Bottom', emoji: '\uD83C\uDF0A' },
  { value: 'bench', label: 'Bench', emoji: '\u2B1B' },
  { value: 'food_plot', label: 'Food Plot', emoji: '\uD83C\uDF3F' },
  { value: 'bedding_edge', label: 'Bedding Edge', emoji: '\uD83D\uDCA4' },
  { value: 'travel_corridor', label: 'Travel Corridor', emoji: '\uD83D\uDEB6' },
  { value: 'water_source', label: 'Water Source', emoji: '\uD83D\uDCA7' },
  { value: 'staging_area', label: 'Staging Area', emoji: '\uD83E\uDD8C' },
  { value: 'other', label: 'Other', emoji: '\uD83D\uDCCC' },
];

const SEASON_OPTIONS: { value: NonNullable<StandDetails['bestSeason']>; label: string }[] = [
  { value: 'early', label: 'Early Season' },
  { value: 'pre_rut', label: 'Pre-Rut' },
  { value: 'rut', label: 'Rut' },
  { value: 'late', label: 'Late Season' },
  { value: 'any', label: 'Any Season' },
];

const TIME_OPTIONS: { value: NonNullable<StandDetails['bestTimeOfDay']>; label: string; emoji: string }[] = [
  { value: 'morning', label: 'Morning', emoji: '\uD83C\uDF05' },
  { value: 'evening', label: 'Evening', emoji: '\uD83C\uDF07' },
  { value: 'all_day', label: 'All Day', emoji: '\u2600\uFE0F' },
];

export default function StandDetailEditor({
  initial,
  onSave,
  onCancel,
}: StandDetailEditorProps) {
  const [heightFeet, setHeightFeet] = useState<string>(
    initial?.heightFeet?.toString() || ''
  );
  const [idealWinds, setIdealWinds] = useState<CardinalDirection[]>(
    initial?.idealWindDirections || []
  );
  const [habitat, setHabitat] = useState<StandHabitatType | undefined>(
    initial?.habitat
  );
  const [secondaryHabitat, setSecondaryHabitat] = useState<StandHabitatType | undefined>(
    initial?.secondaryHabitat
  );
  const [shotDistance, setShotDistance] = useState<string>(
    initial?.shotDistanceYards?.toString() || ''
  );
  const [bestSeason, setBestSeason] = useState<StandDetails['bestSeason']>(
    initial?.bestSeason
  );
  const [bestTime, setBestTime] = useState<StandDetails['bestTimeOfDay']>(
    initial?.bestTimeOfDay
  );
  const [targetSpecies, setTargetSpecies] = useState<string>(
    initial?.targetSpecies || ''
  );

  const [showSecondaryHabitat, setShowSecondaryHabitat] = useState(
    !!initial?.secondaryHabitat
  );

  const handleWindToggle = (dir: CardinalDirection) => {
    setIdealWinds((prev) =>
      prev.includes(dir) ? prev.filter((d) => d !== dir) : [...prev, dir]
    );
  };

  const handleSave = () => {
    const details: StandDetails = {
      idealWindDirections: idealWinds,
    };

    const h = parseInt(heightFeet, 10);
    if (!isNaN(h) && h > 0) details.heightFeet = h;

    const sd = parseInt(shotDistance, 10);
    if (!isNaN(sd) && sd > 0) details.shotDistanceYards = sd;

    if (habitat) details.habitat = habitat;
    if (secondaryHabitat) details.secondaryHabitat = secondaryHabitat;
    if (bestSeason) details.bestSeason = bestSeason;
    if (bestTime) details.bestTimeOfDay = bestTime;
    if (targetSpecies.trim()) details.targetSpecies = targetSpecies.trim();
    details.lastChecked = new Date().toISOString().split('T')[0];

    onSave(details);
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
    >
      <Text style={styles.title}>Stand Details</Text>
      <Text style={styles.subtitle}>
        Set up your stand for smart wind matching & hunt planning
      </Text>

      {/* ── Height ── */}
      <View style={styles.fieldRow}>
        <Text style={styles.fieldLabel}>Height (ft)</Text>
        <TextInput
          style={styles.numInput}
          placeholder="20"
          placeholderTextColor={Colors.textMuted}
          value={heightFeet}
          onChangeText={setHeightFeet}
          keyboardType="number-pad"
          maxLength={3}
        />
      </View>

      {/* ── Ideal Wind Directions ── */}
      <Text style={styles.sectionLabel}>Ideal Wind Directions</Text>
      <Text style={styles.sectionHint}>
        Which wind directions are best for this stand? Select up to 3.
      </Text>
      <WindRosePicker
        selected={idealWinds}
        onToggle={handleWindToggle}
        max={3}
        size={180}
      />

      {/* ── Primary Habitat ── */}
      <Text style={styles.sectionLabel}>What does it hunt over?</Text>
      <View style={styles.chipGrid}>
        {HABITAT_OPTIONS.map((opt) => (
          <TouchableOpacity
            key={opt.value}
            style={[styles.chip, habitat === opt.value && styles.chipActive]}
            onPress={() => setHabitat(opt.value === habitat ? undefined : opt.value)}
          >
            <Text style={styles.chipEmoji}>{opt.emoji}</Text>
            <Text style={[styles.chipText, habitat === opt.value && styles.chipTextActive]}>
              {opt.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* ── Secondary Habitat ── */}
      {!showSecondaryHabitat ? (
        <TouchableOpacity
          style={styles.addSecondaryBtn}
          onPress={() => setShowSecondaryHabitat(true)}
        >
          <Text style={styles.addSecondaryText}>+ Add Secondary Habitat</Text>
        </TouchableOpacity>
      ) : (
        <>
          <Text style={styles.sectionLabel}>Secondary Habitat</Text>
          <View style={styles.chipGrid}>
            {HABITAT_OPTIONS.filter((o) => o.value !== habitat).map((opt) => (
              <TouchableOpacity
                key={opt.value}
                style={[styles.chip, secondaryHabitat === opt.value && styles.chipActive]}
                onPress={() =>
                  setSecondaryHabitat(opt.value === secondaryHabitat ? undefined : opt.value)
                }
              >
                <Text style={styles.chipEmoji}>{opt.emoji}</Text>
                <Text
                  style={[
                    styles.chipText,
                    secondaryHabitat === opt.value && styles.chipTextActive,
                  ]}
                >
                  {opt.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </>
      )}

      {/* ── Shot Distance ── */}
      <View style={styles.fieldRow}>
        <Text style={styles.fieldLabel}>Shot Distance (yds)</Text>
        <TextInput
          style={styles.numInput}
          placeholder="25"
          placeholderTextColor={Colors.textMuted}
          value={shotDistance}
          onChangeText={setShotDistance}
          keyboardType="number-pad"
          maxLength={3}
        />
      </View>

      {/* ── Best Season ── */}
      <Text style={styles.sectionLabel}>Best Season</Text>
      <View style={styles.pillRow}>
        {SEASON_OPTIONS.map((opt) => (
          <TouchableOpacity
            key={opt.value}
            style={[styles.pill, bestSeason === opt.value && styles.pillActive]}
            onPress={() => setBestSeason(opt.value === bestSeason ? undefined : opt.value)}
          >
            <Text style={[styles.pillText, bestSeason === opt.value && styles.pillTextActive]}>
              {opt.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* ── Best Time of Day ── */}
      <Text style={styles.sectionLabel}>Best Time of Day</Text>
      <View style={styles.pillRow}>
        {TIME_OPTIONS.map((opt) => (
          <TouchableOpacity
            key={opt.value}
            style={[styles.pill, bestTime === opt.value && styles.pillActive]}
            onPress={() => setBestTime(opt.value === bestTime ? undefined : opt.value)}
          >
            <Text style={styles.pillEmoji}>{opt.emoji}</Text>
            <Text style={[styles.pillText, bestTime === opt.value && styles.pillTextActive]}>
              {opt.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* ── Target Species ── */}
      <View style={styles.fieldRow}>
        <Text style={styles.fieldLabel}>Target Species</Text>
        <TextInput
          style={[styles.numInput, { width: 140 }]}
          placeholder="Whitetail"
          placeholderTextColor={Colors.textMuted}
          value={targetSpecies}
          onChangeText={setTargetSpecies}
          maxLength={30}
        />
      </View>

      {/* ── Action Buttons ── */}
      <View style={styles.actionRow}>
        <TouchableOpacity style={styles.cancelBtn} onPress={onCancel}>
          <Text style={styles.cancelText}>Skip Details</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.saveBtn} onPress={handleSave}>
          <Text style={styles.saveText}>Save Stand Details</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    maxHeight: 520,
  },
  content: {
    paddingBottom: 16,
  },
  title: {
    fontSize: 17,
    fontWeight: '700',
    color: Colors.tan,
    marginBottom: 2,
  },
  subtitle: {
    fontSize: 11,
    color: Colors.textSecondary,
    marginBottom: 14,
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginTop: 14,
    marginBottom: 4,
  },
  sectionHint: {
    fontSize: 10,
    color: Colors.textMuted,
    marginBottom: 4,
  },

  // ── Field row (label + small input) ──
  fieldRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginVertical: 6,
  },
  fieldLabel: {
    fontSize: 13,
    color: Colors.textSecondary,
    fontWeight: '600',
  },
  numInput: {
    backgroundColor: Colors.surface,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    fontSize: 14,
    color: Colors.textPrimary,
    borderWidth: 1,
    borderColor: Colors.mud,
    width: 70,
    textAlign: 'center',
  },

  // ── Chip grid (habitat picker) ──
  chipGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 6,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 16,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.mud,
    gap: 4,
  },
  chipActive: {
    borderColor: Colors.moss,
    backgroundColor: Colors.forestDark,
  },
  chipEmoji: {
    fontSize: 12,
  },
  chipText: {
    fontSize: 11,
    color: Colors.textMuted,
    fontWeight: '600',
  },
  chipTextActive: {
    color: Colors.lichen,
  },

  // ── Secondary habitat add button ──
  addSecondaryBtn: {
    marginTop: 8,
    alignSelf: 'flex-start',
  },
  addSecondaryText: {
    fontSize: 11,
    color: Colors.sage,
    fontWeight: '600',
  },

  // ── Pill row (season / time) ──
  pillRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 6,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.mud,
    gap: 4,
  },
  pillActive: {
    borderColor: Colors.oak,
    backgroundColor: Colors.bark,
  },
  pillEmoji: {
    fontSize: 12,
  },
  pillText: {
    fontSize: 11,
    color: Colors.textMuted,
    fontWeight: '600',
  },
  pillTextActive: {
    color: Colors.tan,
  },

  // ── Actions ──
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
    marginTop: 18,
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
  saveBtn: {
    backgroundColor: Colors.moss,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
  },
  saveText: {
    color: Colors.textOnAccent,
    fontSize: 13,
    fontWeight: '700',
  },
});
