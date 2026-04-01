/**
 * @file HuntPlanScreen.tsx
 * @description AI-powered hunt plan generator screen.
 * Users specify species, weapon, date, and location — the AI generates
 * a comprehensive plan with regulations, locations, timing, and strategy.
 *
 * Accessible from the AI tab or Scout tab.
 *
 * @module Screens
 * @version 3.0.0
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  SafeAreaView,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Colors from '../theme/colors';

const API_BASE_URL = __DEV__
  ? 'http://localhost:8000'
  : 'https://huntplan-api.onrender.com';

const SPECIES_OPTIONS = [
  { value: 'deer', label: 'Deer', icon: '🦌' },
  { value: 'turkey', label: 'Turkey', icon: '🦃' },
  { value: 'waterfowl', label: 'Waterfowl', icon: '🦆' },
  { value: 'bear', label: 'Bear', icon: '🐻' },
  { value: 'small_game', label: 'Small Game', icon: '🐿️' },
];

const WEAPON_OPTIONS = [
  { value: 'archery', label: 'Archery' },
  { value: 'firearms', label: 'Firearms' },
  { value: 'muzzleloader', label: 'Muzzleloader' },
  { value: 'shotgun', label: 'Shotgun' },
];

const MD_COUNTIES = [
  'Allegany', 'Anne Arundel', 'Baltimore', 'Baltimore City', 'Calvert',
  'Caroline', 'Carroll', 'Cecil', 'Charles', 'Dorchester', 'Frederick',
  'Garrett', 'Harford', 'Howard', 'Kent', 'Montgomery', 'Prince Georges',
  'Queen Annes', 'Somerset', 'St. Marys', 'Talbot', 'Washington',
  'Wicomico', 'Worcester',
];

export default function HuntPlanScreen() {
  const [species, setSpecies] = useState('deer');
  const [weapon, setWeapon] = useState('archery');
  const [huntDate, setHuntDate] = useState(getNextSaturday());
  const [county, setCounty] = useState('');
  const [landName, setLandName] = useState('');
  const [showCountyPicker, setShowCountyPicker] = useState(false);

  const [loading, setLoading] = useState(false);
  const [plan, setPlan] = useState<string | null>(null);
  const [sources, setSources] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  const generatePlan = async () => {
    setLoading(true);
    setPlan(null);
    setError(null);

    try {
      const token = await AsyncStorage.getItem('@auth_access_token');
      const res = await fetch(`${API_BASE_URL}/api/v1/planner/ai/hunt-plan`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          species,
          weapon,
          hunt_date: huntDate,
          county: county || undefined,
          land_name: landName || undefined,
          state: 'MD',
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setPlan(data.plan);
        setSources(data.sources || []);
      } else {
        const errData = await res.json().catch(() => null);
        throw new Error(errData?.detail || 'Failed to generate plan');
      }
    } catch (e: any) {
      setError(e.message || 'Could not generate hunt plan. Check your connection.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {!plan ? (
          <>
            {/* Header */}
            <Text style={styles.title}>AI Hunt Planner</Text>
            <Text style={styles.subtitle}>
              Tell me what you want to hunt and I'll build a complete plan
              with regulations, locations, timing, and strategy.
            </Text>

            {/* Species Picker */}
            <Text style={styles.sectionLabel}>What are you hunting?</Text>
            <View style={styles.speciesRow}>
              {SPECIES_OPTIONS.map((s) => (
                <TouchableOpacity
                  key={s.value}
                  style={[styles.speciesCard, species === s.value && styles.speciesCardActive]}
                  onPress={() => setSpecies(s.value)}
                >
                  <Text style={styles.speciesIcon}>{s.icon}</Text>
                  <Text style={[styles.speciesLabel, species === s.value && styles.speciesLabelActive]}>
                    {s.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Weapon Picker */}
            <Text style={styles.sectionLabel}>Weapon / Method</Text>
            <View style={styles.chipRow}>
              {WEAPON_OPTIONS.map((w) => (
                <TouchableOpacity
                  key={w.value}
                  style={[styles.chip, weapon === w.value && styles.chipActive]}
                  onPress={() => setWeapon(w.value)}
                >
                  <Text style={[styles.chipText, weapon === w.value && styles.chipTextActive]}>
                    {w.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Date */}
            <Text style={styles.sectionLabel}>Planned Date</Text>
            <TextInput
              style={styles.input}
              value={huntDate}
              onChangeText={setHuntDate}
              placeholder="YYYY-MM-DD"
              placeholderTextColor={Colors.textMuted}
            />

            {/* County */}
            <Text style={styles.sectionLabel}>County (optional)</Text>
            <TouchableOpacity
              style={styles.input}
              onPress={() => setShowCountyPicker(!showCountyPicker)}
            >
              <Text style={county ? styles.inputText : styles.inputPlaceholder}>
                {county || 'Select a county...'}
              </Text>
            </TouchableOpacity>
            {showCountyPicker && (
              <View style={styles.countyPicker}>
                <TouchableOpacity
                  style={styles.countyOption}
                  onPress={() => { setCounty(''); setShowCountyPicker(false); }}
                >
                  <Text style={styles.countyOptionText}>Any County</Text>
                </TouchableOpacity>
                {MD_COUNTIES.map((c) => (
                  <TouchableOpacity
                    key={c}
                    style={[styles.countyOption, county === c && styles.countyOptionActive]}
                    onPress={() => { setCounty(c); setShowCountyPicker(false); }}
                  >
                    <Text style={[styles.countyOptionText, county === c && styles.countyOptionTextActive]}>
                      {c}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}

            {/* Specific Land */}
            <Text style={styles.sectionLabel}>Specific Public Land (optional)</Text>
            <TextInput
              style={styles.input}
              value={landName}
              onChangeText={setLandName}
              placeholder="e.g., Green Ridge SF, Deal Island WMA"
              placeholderTextColor={Colors.textMuted}
            />

            {/* Generate Button */}
            <TouchableOpacity
              style={[styles.generateBtn, loading && styles.generateBtnDisabled]}
              onPress={generatePlan}
              disabled={loading}
              activeOpacity={0.8}
            >
              {loading ? (
                <View style={styles.loadingRow}>
                  <ActivityIndicator color="#fff" size="small" />
                  <Text style={styles.generateBtnText}>Generating Plan...</Text>
                </View>
              ) : (
                <Text style={styles.generateBtnText}>Generate Hunt Plan</Text>
              )}
            </TouchableOpacity>

            {error && (
              <View style={styles.errorCard}>
                <Text style={styles.errorText}>{error}</Text>
              </View>
            )}
          </>
        ) : (
          <>
            {/* Plan Result */}
            <View style={styles.planHeader}>
              <TouchableOpacity onPress={() => setPlan(null)}>
                <Text style={styles.backBtn}>{'< New Plan'}</Text>
              </TouchableOpacity>
              <Text style={styles.planTitle}>Your Hunt Plan</Text>
            </View>

            <View style={styles.planCard}>
              <Text style={styles.planText}>{plan}</Text>
            </View>

            {sources.length > 0 && (
              <View style={styles.sourcesCard}>
                <Text style={styles.sourcesTitle}>Sources</Text>
                {sources.map((src, i) => (
                  <Text key={i} style={styles.sourceItem}>{'\u2022'} {src}</Text>
                ))}
              </View>
            )}

            <Text style={styles.disclaimer}>
              This plan is generated from Maryland regulation data and is for planning purposes only.
              Always verify all regulations with MD DNR before hunting.
            </Text>

            <TouchableOpacity
              style={styles.newPlanBtn}
              onPress={() => setPlan(null)}
            >
              <Text style={styles.newPlanBtnText}>Create Another Plan</Text>
            </TouchableOpacity>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── Helpers ────────────────────────────────────────────────────

function getNextSaturday(): string {
  const d = new Date();
  const day = d.getDay();
  const daysUntilSat = (6 - day + 7) % 7 || 7;
  d.setDate(d.getDate() + daysUntilSat);
  return d.toISOString().split('T')[0];
}

// ─── Styles ─────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  scrollContent: { padding: 16, paddingBottom: 40 },
  title: { fontSize: 24, fontWeight: '700', color: Colors.textPrimary, marginBottom: 6 },
  subtitle: { fontSize: 14, color: Colors.textSecondary, lineHeight: 20, marginBottom: 24 },
  sectionLabel: {
    fontSize: 14, fontWeight: '700', color: Colors.tan,
    marginBottom: 8, marginTop: 16,
  },
  speciesRow: {
    flexDirection: 'row', flexWrap: 'wrap', gap: 10,
  },
  speciesCard: {
    width: '30%', aspectRatio: 1.2, backgroundColor: Colors.surface,
    borderRadius: 12, alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, borderColor: Colors.mud,
  },
  speciesCardActive: {
    borderColor: Colors.moss, backgroundColor: Colors.forestDark,
  },
  speciesIcon: { fontSize: 28, marginBottom: 4 },
  speciesLabel: { fontSize: 13, color: Colors.textSecondary, fontWeight: '600' },
  speciesLabelActive: { color: Colors.lichen },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    paddingVertical: 8, paddingHorizontal: 18, borderRadius: 20,
    backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.mud,
  },
  chipActive: { backgroundColor: Colors.moss, borderColor: Colors.moss },
  chipText: { fontSize: 14, color: Colors.textSecondary, fontWeight: '600' },
  chipTextActive: { color: '#fff' },
  input: {
    backgroundColor: Colors.surface, borderRadius: 10, padding: 14,
    borderWidth: 1, borderColor: Colors.mud,
  },
  inputText: { fontSize: 15, color: Colors.textPrimary },
  inputPlaceholder: { fontSize: 15, color: Colors.textMuted },
  countyPicker: {
    backgroundColor: Colors.surface, borderRadius: 10, padding: 8,
    maxHeight: 200, borderWidth: 1, borderColor: Colors.mud, marginTop: 4,
  },
  countyOption: { paddingVertical: 8, paddingHorizontal: 12, borderRadius: 6 },
  countyOptionActive: { backgroundColor: Colors.moss },
  countyOptionText: { fontSize: 14, color: Colors.textSecondary },
  countyOptionTextActive: { color: '#fff', fontWeight: '600' },
  generateBtn: {
    backgroundColor: Colors.moss, paddingVertical: 16, borderRadius: 12,
    alignItems: 'center', marginTop: 28,
  },
  generateBtnDisabled: { opacity: 0.6 },
  generateBtnText: { color: '#fff', fontSize: 17, fontWeight: '700' },
  loadingRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  errorCard: {
    backgroundColor: Colors.rust + '20', borderRadius: 8, padding: 12, marginTop: 12,
  },
  errorText: { color: Colors.rust, fontSize: 14 },
  // Plan result
  planHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 16, gap: 12 },
  backBtn: { fontSize: 16, color: Colors.moss, fontWeight: '600' },
  planTitle: { fontSize: 20, fontWeight: '700', color: Colors.textPrimary },
  planCard: {
    backgroundColor: Colors.surface, borderRadius: 12, padding: 16,
    borderWidth: 1, borderColor: Colors.mud,
  },
  planText: { fontSize: 14, color: Colors.textPrimary, lineHeight: 22 },
  sourcesCard: {
    backgroundColor: Colors.forestDark, borderRadius: 10, padding: 14, marginTop: 12,
  },
  sourcesTitle: { fontSize: 13, fontWeight: '700', color: Colors.lichen, marginBottom: 6 },
  sourceItem: { fontSize: 12, color: Colors.textSecondary, marginBottom: 2 },
  disclaimer: {
    fontSize: 11, color: Colors.textMuted, textAlign: 'center',
    marginTop: 16, lineHeight: 16, paddingHorizontal: 20,
  },
  newPlanBtn: {
    backgroundColor: Colors.surfaceElevated, paddingVertical: 14, borderRadius: 10,
    alignItems: 'center', marginTop: 16, borderWidth: 1, borderColor: Colors.moss,
  },
  newPlanBtnText: { color: Colors.moss, fontSize: 15, fontWeight: '600' },
});
