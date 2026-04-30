/**
 * GearWizard.tsx — Step-by-step species → region/season → method picker
 *
 * Compact wizard for selecting fishing or hunting gear recommendations.
 * Fish mode: Species → Region → Method
 * Hunt mode: Species → Season → Method
 *
 * Chip-based selection with animated transitions. All steps on one scrollable screen.
 * Used by GearGuide and recommendation screens.
 */

import React, { useState } from 'react';
import {
  View,
  TouchableOpacity,
  StyleSheet,
  ViewStyle,
  ScrollView,
} from 'react-native';
import { Text } from 'react-native';
import Colors from '../../theme/colors';

interface GearWizardProps {
  /** Activity mode: fish or hunt */
  mode: 'fish' | 'hunt';
  /** Callback when selection is complete */
  onComplete: (selection: {
    species: string;
    region?: string;
    season?: string;
    method?: string;
  }) => void;
  /** Optional style override */
  style?: ViewStyle;
}

// Fish species options
const fishSpecies = ['Striped Bass', 'Trout', 'Largemouth Bass', 'Catfish', 'Panfish', 'Yellow Perch', 'Bluefish', 'Flounder'];

// Fish regions
const fishRegions = ['Chesapeake Bay', 'Gunpowder Falls', 'Deep Creek Lake', 'Patuxent River', 'Coastal Bays', 'Other'];

// Fishing methods
const fishMethods = ['Fly', 'Bait', 'Lure'];

// Hunt species options
const huntSpecies = ['Whitetail Deer', 'Turkey', 'Waterfowl', 'Bear', 'Small Game'];

// Hunt seasons (auto-suggested based on month, but can be overridden)
const huntSeasons = ['Archery Early', 'Firearms', 'Muzzleloader', 'Late Season'];

// Hunt methods
const huntMethods = ['Archery', 'Firearms', 'Muzzleloader'];

type Step = 'species' | 'region_season' | 'method';

/**
 * GearWizard component — step-by-step gear selection
 *
 * Compact, single-screen wizard with chip-based selections and animated transitions.
 */
export const GearWizard: React.FC<GearWizardProps> = ({
  mode,
  onComplete,
  style,
}) => {
  const [currentStep, setCurrentStep] = useState<Step>('species');
  const [selectedSpecies, setSelectedSpecies] = useState<string>('');
  const [selectedRegionSeason, setSelectedRegionSeason] = useState<string>('');
  const [selectedMethod, setSelectedMethod] = useState<string>('');

  const isComplete = selectedSpecies && selectedRegionSeason && selectedMethod;

  const handleSpeciesSelect = (species: string) => {
    setSelectedSpecies(species);
    setCurrentStep('region_season');
  };

  const handleRegionSeasonSelect = (regionSeason: string) => {
    setSelectedRegionSeason(regionSeason);
    setCurrentStep('method');
  };

  const handleMethodSelect = (method: string) => {
    setSelectedMethod(method);
    // Trigger completion
    onComplete({
      species: selectedSpecies,
      region: mode === 'fish' ? selectedRegionSeason : undefined,
      season: mode === 'hunt' ? selectedRegionSeason : undefined,
      method,
    });
  };

  const handleReset = () => {
    setCurrentStep('species');
    setSelectedSpecies('');
    setSelectedRegionSeason('');
    setSelectedMethod('');
  };

  return (
    <View style={[styles.container, style]}>
      {/* Step indicator */}
      <View style={styles.stepIndicator}>
        <View style={[styles.step, currentStep === 'species' && styles.stepActive]}>
          <Text style={[styles.stepLabel, currentStep === 'species' && styles.stepLabelActive]}>
            Species
          </Text>
        </View>
        <View style={styles.stepDivider} />
        <View style={[styles.step, currentStep === 'region_season' && styles.stepActive]}>
          <Text style={[styles.stepLabel, currentStep === 'region_season' && styles.stepLabelActive]}>
            {mode === 'fish' ? 'Region' : 'Season'}
          </Text>
        </View>
        <View style={styles.stepDivider} />
        <View style={[styles.step, currentStep === 'method' && styles.stepActive]}>
          <Text style={[styles.stepLabel, currentStep === 'method' && styles.stepLabelActive]}>
            Method
          </Text>
        </View>
      </View>

      {/* Step 1: Species Selection */}
      {currentStep === 'species' && (
        <ScrollView
          contentContainerStyle={styles.stepContent}
          showsVerticalScrollIndicator={false}
        >
          <Text style={styles.stepTitle}>Choose a Species</Text>
          <View style={styles.chipGrid}>
            {(mode === 'fish' ? fishSpecies : huntSpecies).map((species, idx) => (
              <TouchableOpacity
                key={idx}
                style={styles.chip}
                onPress={() => handleSpeciesSelect(species)}
                accessible={true}
                accessibilityLabel={species}
                accessibilityRole="button"
                accessibilityHint="Double tap to select"
              >
                <Text style={styles.chipText}>{species}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>
      )}

      {/* Step 2: Region/Season Selection */}
      {currentStep === 'region_season' && (
        <ScrollView
          contentContainerStyle={styles.stepContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.stepHeader}>
            <TouchableOpacity
              onPress={() => setCurrentStep('species')}
              accessible={true}
              accessibilityLabel="Back to Species"
              accessibilityRole="button"
            >
              <Text style={styles.backButton}>← {selectedSpecies}</Text>
            </TouchableOpacity>
          </View>
          <Text style={styles.stepTitle}>
            Choose {mode === 'fish' ? 'a Fishing Region' : 'a Season'}
          </Text>
          <View style={styles.chipGrid}>
            {(mode === 'fish' ? fishRegions : huntSeasons).map((option, idx) => (
              <TouchableOpacity
                key={idx}
                style={styles.chip}
                onPress={() => handleRegionSeasonSelect(option)}
                accessible={true}
                accessibilityLabel={option}
                accessibilityRole="button"
                accessibilityHint="Double tap to select"
              >
                <Text style={styles.chipText}>{option}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>
      )}

      {/* Step 3: Method Selection */}
      {currentStep === 'method' && (
        <ScrollView
          contentContainerStyle={styles.stepContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.stepHeader}>
            <TouchableOpacity
              onPress={() => setCurrentStep('region_season')}
              accessible={true}
              accessibilityLabel="Back to Region"
              accessibilityRole="button"
            >
              <Text style={styles.backButton}>← {selectedRegionSeason}</Text>
            </TouchableOpacity>
          </View>
          <Text style={styles.stepTitle}>Choose a Method</Text>
          <View style={styles.chipGrid}>
            {(mode === 'fish' ? fishMethods : huntMethods).map((method, idx) => (
              <TouchableOpacity
                key={idx}
                style={styles.chip}
                onPress={() => handleMethodSelect(method)}
                accessible={true}
                accessibilityLabel={method}
                accessibilityRole="button"
                accessibilityHint="Double tap to select and complete"
              >
                <Text style={styles.chipText}>{method}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>
      )}

      {/* Action buttons */}
      {isComplete && (
        <View style={styles.footer}>
          <TouchableOpacity
            style={styles.resetButton}
            onPress={handleReset}
            accessible={true}
            accessibilityLabel="Start Over"
            accessibilityRole="button"
          >
            <Text style={styles.resetButtonText}>Start Over</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.mud,
    padding: 16,
    minHeight: 300,
  },
  stepIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    gap: 8,
  },
  step: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: Colors.surfaceElevated,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: Colors.mud,
    alignItems: 'center',
  },
  stepActive: {
    backgroundColor: Colors.moss,
    borderColor: Colors.lichen,
  },
  stepLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  stepLabelActive: {
    color: Colors.textOnAccent,
  },
  stepDivider: {
    width: 1,
    height: 20,
    backgroundColor: Colors.mud,
  },
  stepContent: {
    paddingVertical: 8,
  },
  stepHeader: {
    marginBottom: 12,
  },
  backButton: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.tan,
  },
  stepTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginBottom: 14,
  },
  chipGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  chip: {
    backgroundColor: Colors.surfaceElevated,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: Colors.mud,
    paddingVertical: 10,
    paddingHorizontal: 14,
    minWidth: '45%',
  },
  chipText: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.textPrimary,
    textAlign: 'center',
  },
  footer: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: Colors.mud,
  },
  resetButton: {
    backgroundColor: Colors.oak,
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  resetButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textOnAccent,
  },
});
