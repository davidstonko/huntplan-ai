import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import Colors from '../../theme/colors';

interface ReportFormProps {
  onSubmit: (report: {
    species: string;
    activityLevel: 'none' | 'low' | 'moderate' | 'high';
    county: string;
    area: string;
    bodyText: string;
  }) => void;
  onCancel: () => void;
}

const SPECIES = [
  'Deer',
  'Turkey',
  'Waterfowl',
  'Rabbit',
  'Squirrel',
  'Pheasant',
  'Grouse',
];

const COUNTIES = [
  'Allegany',
  'Anne Arundel',
  'Baltimore',
  'Calvert',
  'Caroline',
  'Carroll',
  'Cecil',
  'Charles',
  'Dorchester',
  'Frederick',
  'Garrett',
  'Harford',
  'Howard',
  'Kent',
  'Montgomery',
  'Prince Georges',
  'Queen Annes',
  'Someset',
  'Talbot',
  'Washington',
  'Wicomico',
  'Worcester',
];

export default function ReportForm({ onSubmit, onCancel }: ReportFormProps) {
  const [species, setSpecies] = useState(SPECIES[0]);
  const [activityLevel, setActivityLevel] = useState<'none' | 'low' | 'moderate' | 'high'>('moderate');
  const [county, setCounty] = useState(COUNTIES[0]);
  const [area, setArea] = useState('');
  const [bodyText, setBodyText] = useState('');

  const handleSubmit = () => {
    if (!species || !county || !bodyText.trim()) {
      Alert.alert('Missing Fields', 'Please fill in required fields.');
      return;
    }

    onSubmit({
      species,
      activityLevel,
      county,
      area,
      bodyText,
    });
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
      showsVerticalScrollIndicator={false}
    >
      <Text style={styles.label}>Species *</Text>
      <View style={styles.pickerContainer}>
        <Picker
          selectedValue={species}
          onValueChange={(value: string) => setSpecies(value)}
          style={styles.picker}
        >
          {SPECIES.map((s) => (
            <Picker.Item key={s} label={s} value={s} />
          ))}
        </Picker>
      </View>

      <Text style={styles.label}>Activity Level</Text>
      <View style={styles.activityButtons}>
        {(['none', 'low', 'moderate', 'high'] as const).map((level) => (
          <TouchableOpacity
            key={level}
            style={[
              styles.activityButton,
              activityLevel === level && styles.activityButtonActive,
            ]}
            onPress={() => setActivityLevel(level)}
          >
            <Text
              style={[
                styles.activityButtonText,
                activityLevel === level && styles.activityButtonTextActive,
              ]}
            >
              {level === 'none'
                ? '❌ None'
                : level === 'low'
                  ? '💤 Low'
                  : level === 'moderate'
                    ? '⚡ Moderate'
                    : '🔥 High'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={styles.label}>County *</Text>
      <View style={styles.pickerContainer}>
        <Picker
          selectedValue={county}
          onValueChange={(value: string) => setCounty(value)}
          style={styles.picker}
        >
          {COUNTIES.map((c) => (
            <Picker.Item key={c} label={c} value={c} />
          ))}
        </Picker>
      </View>

      <Text style={styles.label}>Area / WMA Name</Text>
      <TextInput
        style={styles.input}
        placeholder="e.g., Savage Mill WMA, public land"
        placeholderTextColor="#666"
        value={area}
        onChangeText={setArea}
      />

      <Text style={styles.label}>What Did You See? *</Text>
      <TextInput
        style={[styles.input, styles.largeInput]}
        placeholder="Describe the sighting, sign, activity, and conditions..."
        placeholderTextColor="#666"
        value={bodyText}
        onChangeText={setBodyText}
        multiline
        numberOfLines={6}
        textAlignVertical="top"
      />

      <Text style={styles.note}>
        💡 Tip: Include time, weather, wind, and any fresh sign you observed.
        Location is kept coarse (county-level) for privacy.
      </Text>

      <View style={styles.buttonContainer}>
        <TouchableOpacity
          style={styles.cancelButton}
          onPress={onCancel}
          activeOpacity={0.7}
        >
          <Text style={styles.cancelButtonText}>Cancel</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.submitButton}
          onPress={handleSubmit}
          activeOpacity={0.7}
        >
          <Text style={styles.submitButtonText}>Post Report</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  contentContainer: {
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textPrimary,
    marginBottom: 8,
  },
  pickerContainer: {
    backgroundColor: Colors.surface,
    borderRadius: 6,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: Colors.mud,
    overflow: 'hidden',
  },
  picker: {
    color: Colors.textPrimary,
    backgroundColor: Colors.surface,
    height: 50,
  },
  activityButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  activityButton: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 6,
    marginHorizontal: 4,
    backgroundColor: Colors.surface,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: Colors.mud,
    alignItems: 'center',
  },
  activityButtonActive: {
    backgroundColor: Colors.oak,
    borderColor: Colors.oak,
  },
  activityButtonText: {
    fontSize: 11,
    color: Colors.textSecondary,
    fontWeight: '500',
  },
  activityButtonTextActive: {
    color: Colors.mdWhite,
  },
  input: {
    backgroundColor: Colors.surface,
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: Colors.textPrimary,
    fontSize: 14,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: Colors.mud,
  },
  largeInput: {
    height: 120,
    textAlignVertical: 'top',
  },
  note: {
    fontSize: 12,
    color: Colors.textSecondary,
    fontStyle: 'italic',
    marginBottom: 20,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: Colors.surface,
    borderRadius: 6,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 40,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: Colors.oak,
    alignItems: 'center',
  },
  cancelButtonText: {
    color: Colors.oak,
    fontWeight: '600',
    fontSize: 14,
  },
  submitButton: {
    flex: 1,
    paddingVertical: 12,
    backgroundColor: Colors.oak,
    borderRadius: 6,
    alignItems: 'center',
  },
  submitButtonText: {
    color: Colors.mdWhite,
    fontWeight: '600',
    fontSize: 14,
  },
});
