/**
 * @file HarvestLogScreen.tsx
 * @description Game harvest log — tracks user's harvests for the season.
 * Shows harvest list, season summary with bag limit tracking,
 * and form to log new harvests with game check confirmation.
 *
 * Accessible from Scout tab or Profile tab.
 *
 * @module Screens
 * @version 3.0.0
 */

import React, { useState, useEffect, useCallback } from 'react';
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
  RefreshControl,
  Switch,
  Linking,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Colors from '../theme/colors';
import Config from '../config';
import { CalendarDatePicker } from '../components/common/CalendarDatePicker';
import { SearchableCountyPicker } from '../components/common/SearchableCountyPicker';

// ─── Types ──────────────────────────────────────────────────────

interface HarvestEntry {
  id: string;
  species: string;
  species_detail?: string;
  harvest_date: string;
  harvest_time?: string;
  weapon: string;
  weapon_detail?: string;
  county?: string;
  land_name?: string;
  antler_points?: number;
  is_antlered?: boolean;
  estimated_weight_lbs?: number;
  game_check_number?: string;
  game_check_completed: boolean;
  notes?: string;
  is_shared: boolean;
  season_year: string;
  photo_uri?: string;
}

interface SeasonSummary {
  total_harvests: number;
  by_species: Record<string, number>;
  deer_detail?: { antlered: number; antlerless: number };
  game_check_rate: { total: number; checked: number; rate: number };
}

const SPECIES_OPTIONS = ['deer', 'turkey', 'waterfowl', 'bear', 'small_game', 'dove', 'rabbit', 'squirrel'];
const WEAPON_OPTIONS = ['archery', 'firearms', 'muzzleloader', 'shotgun'];

// ─── Main Component ─────────────────────────────────────────────

export default function HarvestLogScreen() {
  const [harvests, setHarvests] = useState<HarvestEntry[]>([]);
  const [summary, setSummary] = useState<SeasonSummary | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [view, setView] = useState<'list' | 'summary'>('list');
  const [editingHarvest, setEditingHarvest] = useState<HarvestEntry | null>(null);

  // Form state
  const [formSpecies, setFormSpecies] = useState('deer');
  const [formSpeciesDetail, setFormSpeciesDetail] = useState('');
  const [formDate, setFormDate] = useState(new Date());
  const [formTime, setFormTime] = useState('');
  const [formWeapon, setFormWeapon] = useState('archery');
  const [formWeaponDetail, setFormWeaponDetail] = useState('');
  const [formCounty, setFormCounty] = useState('');
  const [formLandName, setFormLandName] = useState('');
  const [formAntlerPoints, setFormAntlerPoints] = useState('');
  const [formIsAntlered, setFormIsAntlered] = useState(true);
  const [formWeight, setFormWeight] = useState('');
  const [formGameCheck, setFormGameCheck] = useState('');
  const [formGameCheckDone, setFormGameCheckDone] = useState(false);
  const [formNotes, setFormNotes] = useState('');
  const [formShared, setFormShared] = useState(false);
  const [formPhotoUri, setFormPhotoUri] = useState('');

  const fetchData = useCallback(async () => {
    try {
      const token = await AsyncStorage.getItem('@auth_access_token');
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      // Fetch harvests
      const listRes = await fetch(`${Config.API_BASE_URL}/api/v1/harvest/list?season_year=2025-2026`, { headers });
      if (listRes.ok) {
        const data = await listRes.json();
        setHarvests(data.harvests || []);
      }

      // Fetch summary
      const sumRes = await fetch(`${Config.API_BASE_URL}/api/v1/harvest/summary?season_year=2025-2026`, { headers });
      if (sumRes.ok) {
        const data = await sumRes.json();
        setSummary(data);
      }
    } catch (e) {
      // Offline — use local data
      const local = await AsyncStorage.getItem('@harvest_log');
      if (local) {
        setHarvests(JSON.parse(local));
      }
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
  };

  const submitHarvest = async () => {
    const dateStr = formDate.toISOString().split('T')[0];
    const entry: any = {
      species: formSpecies,
      species_detail: formSpeciesDetail || undefined,
      harvest_date: dateStr,
      harvest_time: formTime || undefined,
      weapon: formWeapon,
      weapon_detail: formWeaponDetail || undefined,
      county: formCounty || undefined,
      land_name: formLandName || undefined,
      antler_points: formAntlerPoints ? parseInt(formAntlerPoints) : undefined,
      is_antlered: formSpecies === 'deer' ? formIsAntlered : undefined,
      estimated_weight_lbs: formWeight ? parseInt(formWeight) : undefined,
      game_check_number: formGameCheck || undefined,
      game_check_completed: formGameCheckDone,
      notes: formNotes || undefined,
      is_shared: formShared,
      season_year: '2025-2026',
      photo_uri: formPhotoUri || undefined,
    };

    try {
      const token = await AsyncStorage.getItem('@auth_access_token');

      if (editingHarvest) {
        // Edit existing harvest
        const res = await fetch(`${Config.API_BASE_URL}/api/v1/harvest/${editingHarvest.id}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify(entry),
        });

        if (res.ok) {
          setShowForm(false);
          resetForm();
          setEditingHarvest(null);
          await fetchData();
        } else {
          throw new Error('Server error');
        }
      } else {
        // Create new harvest
        const res = await fetch(`${Config.API_BASE_URL}/api/v1/harvest/log`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify(entry),
        });

        if (res.ok) {
          setShowForm(false);
          resetForm();
          setEditingHarvest(null);
          await fetchData();
        } else {
          throw new Error('Server error');
        }
      }
    } catch {
      // Save locally for offline
      const local = await AsyncStorage.getItem('@harvest_log');
      const list = local ? JSON.parse(local) : [];

      if (editingHarvest) {
        // Update existing in local storage
        const idx = list.findIndex((h: HarvestEntry) => h.id === editingHarvest.id);
        if (idx >= 0) {
          list[idx] = { ...entry, id: editingHarvest.id };
        }
      } else {
        // Add new to local storage
        list.unshift({ ...entry, id: `local_${Date.now()}`, created_at: new Date().toISOString() });
      }

      await AsyncStorage.setItem('@harvest_log', JSON.stringify(list));
      setHarvests(list);
      setShowForm(false);
      resetForm();
      setEditingHarvest(null);
      const msgTitle = editingHarvest ? 'Updated Locally' : 'Saved Locally';
      Alert.alert(msgTitle, 'Harvest saved to your device. It will sync when you have connection.');
    }
  };

  const resetForm = () => {
    setFormSpecies('deer');
    setFormSpeciesDetail('');
    setFormDate(new Date());
    setFormTime('');
    setFormWeapon('archery');
    setFormWeaponDetail('');
    setFormCounty('');
    setFormLandName('');
    setFormAntlerPoints('');
    setFormIsAntlered(true);
    setFormWeight('');
    setFormGameCheck('');
    setFormGameCheckDone(false);
    setFormNotes('');
    setFormShared(false);
    setFormPhotoUri('');
  };

  const openEditForm = (harvest: HarvestEntry) => {
    setEditingHarvest(harvest);
    setFormSpecies(harvest.species);
    setFormSpeciesDetail(harvest.species_detail || '');
    setFormDate(new Date(harvest.harvest_date + 'T00:00:00'));
    setFormTime(harvest.harvest_time || '');
    setFormWeapon(harvest.weapon);
    setFormWeaponDetail(harvest.weapon_detail || '');
    setFormCounty(harvest.county || '');
    setFormLandName(harvest.land_name || '');
    setFormAntlerPoints(harvest.antler_points ? harvest.antler_points.toString() : '');
    setFormIsAntlered(harvest.is_antlered ?? true);
    setFormWeight(harvest.estimated_weight_lbs ? harvest.estimated_weight_lbs.toString() : '');
    setFormGameCheck(harvest.game_check_number || '');
    setFormGameCheckDone(harvest.game_check_completed);
    setFormNotes(harvest.notes || '');
    setFormShared(harvest.is_shared);
    setFormPhotoUri(harvest.photo_uri || '');
    setShowForm(true);
  };

  const cancelEdit = () => {
    setShowForm(false);
    resetForm();
    setEditingHarvest(null);
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Harvest Log</Text>
        <TouchableOpacity
          style={styles.addBtn}
          onPress={() => setShowForm(true)}
          accessibilityLabel="Log harvest"
          accessibilityRole="button"
          accessibilityHint="Opens form to record a new harvest"
        >
          <Text style={styles.addBtnText}>+ Log Harvest</Text>
        </TouchableOpacity>
      </View>

      {/* View Toggle */}
      <View style={styles.toggleBar}>
        <TouchableOpacity
          style={[styles.toggleBtn, view === 'list' && styles.toggleActive]}
          onPress={() => setView('list')}
          accessibilityLabel="Harvest list"
          accessibilityRole="tab"
          accessibilityState={{ selected: view === 'list' }}
          accessibilityHint="Shows all harvest records"
        >
          <Text style={[styles.toggleText, view === 'list' && styles.toggleTextActive]}>
            Harvests
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.toggleBtn, view === 'summary' && styles.toggleActive]}
          onPress={() => setView('summary')}
          accessibilityLabel="Season summary"
          accessibilityRole="tab"
          accessibilityState={{ selected: view === 'summary' }}
          accessibilityHint="Shows season statistics and summary"
        >
          <Text style={[styles.toggleText, view === 'summary' && styles.toggleTextActive]}>
            Season Summary
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.moss} />}
      >
        {view === 'list' ? (
          <>
            {harvests.length === 0 ? (
              <View style={styles.emptyState}>
                <Text style={styles.emptyIcon}>{'🦌'}</Text>
                <Text style={styles.emptyTitle}>No Harvests Yet</Text>
                <Text style={styles.emptyText}>
                  Tap "Log Harvest" to record your first harvest of the season.
                  Track your bag count and game check status.
                </Text>
              </View>
            ) : (
              harvests.map((h) => (
                <View key={h.id} style={styles.harvestCard}>
                  <View style={styles.harvestHeader}>
                    <View style={styles.harvestTitleGroup}>
                      <Text style={styles.harvestSpecies}>
                        {h.species.charAt(0).toUpperCase() + h.species.slice(1)}
                        {h.species_detail ? ` — ${h.species_detail}` : ''}
                      </Text>
                      <Text style={styles.harvestDate}>{formatDate(h.harvest_date)}</Text>
                    </View>
                    <TouchableOpacity
                      onPress={() => openEditForm(h)}
                      accessibilityLabel="Edit harvest"
                      accessibilityRole="button"
                      accessibilityHint="Opens harvest editor"
                    >
                      <Text style={styles.editButton}>✎</Text>
                    </TouchableOpacity>
                  </View>
                  {h.photo_uri && (
                    <View style={styles.photoPreview}>
                      <Text style={styles.photoIcon}>📸</Text>
                      <Text style={styles.photoText}>Photo attached</Text>
                    </View>
                  )}
                  <View style={styles.harvestDetails}>
                    <Text style={styles.detailText}>
                      {h.weapon.charAt(0).toUpperCase() + h.weapon.slice(1)}
                      {h.weapon_detail ? ` (${h.weapon_detail})` : ''}
                    </Text>
                    {h.county && (
                      <Text style={styles.detailText}>{h.county} County</Text>
                    )}
                    {h.land_name && (
                      <Text style={styles.detailText}>{h.land_name}</Text>
                    )}
                    {h.antler_points != null && (
                      <Text style={styles.detailText}>{h.antler_points}-point</Text>
                    )}
                    {h.estimated_weight_lbs && (
                      <Text style={styles.detailText}>~{h.estimated_weight_lbs} lbs</Text>
                    )}
                  </View>
                  <View style={styles.gameCheckRow}>
                    <View style={[
                      styles.gameCheckBadge,
                      h.game_check_completed ? styles.gameCheckDone : styles.gameCheckPending,
                    ]}>
                      <Text style={styles.gameCheckText}>
                        {h.game_check_completed ? 'Game Check Done' : 'Game Check Needed'}
                      </Text>
                    </View>
                    {h.game_check_number && (
                      <Text style={styles.gameCheckNum}>#{h.game_check_number}</Text>
                    )}
                  </View>
                </View>
              ))
            )}
          </>
        ) : (
          // Season Summary View
          <View>
            {summary ? (
              <>
                <View style={styles.summaryCard}>
                  <Text style={styles.summaryLabel}>Total Harvests</Text>
                  <Text style={styles.summaryBig}>{summary.total_harvests}</Text>
                  <Text style={styles.summarySubtext}>2025-2026 Season</Text>
                </View>

                {Object.entries(summary.by_species).map(([sp, count]) => (
                  <View key={sp} style={styles.speciesRow}>
                    <Text style={styles.speciesName}>
                      {sp.charAt(0).toUpperCase() + sp.slice(1)}
                    </Text>
                    <Text style={styles.speciesCount}>{count}</Text>
                  </View>
                ))}

                {summary.deer_detail && (
                  <View style={styles.deerDetailCard}>
                    <Text style={styles.deerDetailTitle}>Deer Breakdown</Text>
                    <View style={styles.deerRow}>
                      <Text style={styles.deerLabel}>Antlered (Bucks)</Text>
                      <Text style={styles.deerCount}>{summary.deer_detail.antlered}</Text>
                    </View>
                    <View style={styles.deerRow}>
                      <Text style={styles.deerLabel}>Antlerless (Does)</Text>
                      <Text style={styles.deerCount}>{summary.deer_detail.antlerless}</Text>
                    </View>
                  </View>
                )}

                <View style={styles.gameCheckCard}>
                  <Text style={styles.gameCheckTitle}>Game Check Compliance</Text>
                  <Text style={styles.gameCheckRate}>
                    {summary.game_check_rate.rate}%
                  </Text>
                  <Text style={styles.gameCheckDetail}>
                    {summary.game_check_rate.checked} of {summary.game_check_rate.total} harvests checked
                  </Text>
                </View>
              </>
            ) : (
              <Text style={styles.loadingText}>Loading season summary...</Text>
            )}
          </View>
        )}
      </ScrollView>

      {/* ── Log/Edit Harvest Modal ── */}
      <Modal visible={showForm} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity
              onPress={cancelEdit}
              accessibilityLabel="Cancel"
              accessibilityRole="button"
              accessibilityHint="Closes the harvest form without saving"
            >
              <Text style={styles.cancelBtn}>Cancel</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>{editingHarvest ? 'Edit Harvest' : 'Log Harvest'}</Text>
            <TouchableOpacity
              onPress={submitHarvest}
              accessibilityLabel="Save"
              accessibilityRole="button"
              accessibilityHint="Saves the harvest record"
            >
              <Text style={styles.saveBtn}>Save</Text>
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={styles.formContent}>
            {/* Species Picker */}
            <Text style={styles.formLabel}>Species</Text>
            <View style={styles.chipRow}>
              {SPECIES_OPTIONS.map((s) => (
                <TouchableOpacity
                  key={s}
                  style={[styles.chip, formSpecies === s && styles.chipActive]}
                  onPress={() => setFormSpecies(s)}
                  accessibilityLabel={`Select ${s.replace('_', ' ')}`}
                  accessibilityRole="button"
                  accessibilityState={{ selected: formSpecies === s }}
                  accessibilityHint="Select the species harvested"
                >
                  <Text style={[styles.chipText, formSpecies === s && styles.chipTextActive]}>
                    {s.charAt(0).toUpperCase() + s.slice(1).replace('_', ' ')}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <FormField label="Detail (optional)" value={formSpeciesDetail} onChange={setFormSpeciesDetail}
              placeholder="e.g., Whitetail 8-point, Eastern, Mallard" />

            {/* Weapon Picker */}
            <Text style={styles.formLabel}>Weapon / Method</Text>
            <View style={styles.chipRow}>
              {WEAPON_OPTIONS.map((w) => (
                <TouchableOpacity
                  key={w}
                  style={[styles.chip, formWeapon === w && styles.chipActive]}
                  onPress={() => setFormWeapon(w)}
                  accessibilityLabel={`Select ${w}`}
                  accessibilityRole="button"
                  accessibilityState={{ selected: formWeapon === w }}
                  accessibilityHint="Select the weapon or method used"
                >
                  <Text style={[styles.chipText, formWeapon === w && styles.chipTextActive]}>
                    {w.charAt(0).toUpperCase() + w.slice(1)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <FormField label="Weapon Detail (optional)" value={formWeaponDetail} onChange={setFormWeaponDetail}
              placeholder="e.g., Mathews V3X, .30-06 Remington" />

            <CalendarDatePicker
              value={formDate}
              onChange={setFormDate}
              label="Date"
            />
            <FormField label="Time (optional)" value={formTime} onChange={setFormTime} placeholder="07:30" />
            <SearchableCountyPicker
              value={formCounty}
              onChange={setFormCounty}
              label="County"
            />
            <FormField label="Land Name" value={formLandName} onChange={setFormLandName}
              placeholder="e.g., Green Ridge SF, Private" />

            {/* Deer-specific */}
            {formSpecies === 'deer' && (
              <>
                <View style={styles.switchRow}>
                  <Text style={styles.formLabel}>Antlered (Buck)</Text>
                  <Switch
                    value={formIsAntlered}
                    onValueChange={setFormIsAntlered}
                    trackColor={{ false: Colors.mud, true: Colors.moss }}
                    thumbColor={formIsAntlered ? Colors.lichen : Colors.textMuted}
                    accessibilityLabel="Antlered buck"
                    accessibilityRole="switch"
                    accessibilityState={{ checked: formIsAntlered }}
                    accessibilityHint="Toggle if the harvested deer was antlered"
                  />
                </View>
                {formIsAntlered && (
                  <FormField label="Antler Points" value={formAntlerPoints}
                    onChange={setFormAntlerPoints} placeholder="e.g., 8" keyboardType="numeric" />
                )}
                <FormField label="Estimated Weight (lbs)" value={formWeight}
                  onChange={setFormWeight} placeholder="e.g., 180" keyboardType="numeric" />
              </>
            )}

            {/* Game Check */}
            <View style={styles.gameCheckSection}>
              <Text style={styles.formSectionTitle}>Maryland Game Check</Text>
              <Text style={styles.formHelp}>
                MD law requires checking your harvest within 24 hours. Call{' '}
                <TouchableOpacity onPress={() => Linking.openURL('tel:18002143337')}>
                  <Text style={styles.phoneLink}>1-800-214-3337</Text>
                </TouchableOpacity>
                {' '}or use the DNR website.
              </Text>
              <View style={styles.switchRow}>
                <Text style={styles.formLabel}>Game Check Completed</Text>
                <Switch
                  value={formGameCheckDone}
                  onValueChange={setFormGameCheckDone}
                  trackColor={{ false: Colors.mud, true: Colors.success }}
                  thumbColor={formGameCheckDone ? Colors.success : Colors.textMuted}
                  accessibilityLabel="Game check completed"
                  accessibilityRole="switch"
                  accessibilityState={{ checked: formGameCheckDone }}
                  accessibilityHint="Toggle to indicate game check has been completed"
                />
              </View>
              {formGameCheckDone && (
                <FormField label="Confirmation Number" value={formGameCheck}
                  onChange={setFormGameCheck} placeholder="Enter confirmation #" />
              )}
            </View>

            <FormField label="Notes (optional)" value={formNotes} onChange={setFormNotes}
              placeholder="Weather conditions, stand location, story..." multiline />

            {/* Photo Section */}
            <View style={styles.photoSection}>
              <Text style={styles.formSectionTitle}>Photo</Text>
              <TouchableOpacity
                style={styles.photoButton}
                onPress={() => Alert.alert(
                  'Photo Capture',
                  'Photo capture and library selection coming soon. This feature will let you attach harvest photos with automatic geolocation.',
                  [{ text: 'OK' }],
                )}
                accessibilityLabel="Add photo"
                accessibilityRole="button"
                accessibilityHint="Opens photo picker (coming soon)"
              >
                <Text style={styles.photoButtonIcon}>📷</Text>
                <View style={styles.photoButtonContent}>
                  <Text style={styles.photoButtonText}>Add Photo</Text>
                  <Text style={styles.photoButtonSubtext}>
                    {formPhotoUri ? 'Photo selected' : 'Take or choose from library'}
                  </Text>
                </View>
              </TouchableOpacity>
              {formPhotoUri && (
                <View style={styles.photoStatusBadge}>
                  <Text style={styles.photoStatusIcon}>✓</Text>
                  <Text style={styles.photoStatusText}>Photo attached</Text>
                </View>
              )}
            </View>

            <View style={styles.switchRow}>
              <View>
                <Text style={styles.formLabel}>Share Anonymously</Text>
                <Text style={styles.formHelp}>Contribute to community harvest stats</Text>
              </View>
              <Switch
                value={formShared}
                onValueChange={setFormShared}
                trackColor={{ false: Colors.mud, true: Colors.moss }}
                thumbColor={formShared ? Colors.lichen : Colors.textMuted}
              />
            </View>
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

// ─── Sub-components ─────────────────────────────────────────────

function FormField({
  label, value, onChange, placeholder, multiline, keyboardType,
}: {
  label: string; value: string; onChange: (v: string) => void;
  placeholder?: string; multiline?: boolean; keyboardType?: 'numeric' | 'default';
}) {
  return (
    <View style={styles.formField}>
      <Text style={styles.formLabel}>{label}</Text>
      <TextInput
        style={[styles.formInput, multiline && styles.formInputMultiline]}
        value={value}
        onChangeText={onChange}
        placeholder={placeholder}
        placeholderTextColor={Colors.textMuted}
        multiline={multiline}
        keyboardType={keyboardType || 'default'}
        accessibilityLabel={label}
        accessibilityRole="search"
        accessibilityHint={`Enter ${label.toLowerCase()}`}
      />
    </View>
  );
}

// ─── Helpers ────────────────────────────────────────────────────

function formatDate(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

// ─── Styles ─────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 12,
  },
  title: { fontSize: 22, fontWeight: '700', color: Colors.textPrimary },
  addBtn: {
    backgroundColor: Colors.moss, paddingVertical: 8, paddingHorizontal: 16,
    borderRadius: 8,
  },
  addBtnText: { color: Colors.mdWhite, fontSize: 14, fontWeight: '600' },
  toggleBar: {
    flexDirection: 'row', marginHorizontal: 16, backgroundColor: Colors.surface,
    borderRadius: 8, overflow: 'hidden', marginBottom: 12,
  },
  toggleBtn: { flex: 1, paddingVertical: 10, alignItems: 'center' },
  toggleActive: { backgroundColor: Colors.moss },
  toggleText: { fontSize: 14, color: Colors.textSecondary, fontWeight: '600' },
  toggleTextActive: { color: Colors.mdWhite },
  scrollContent: { padding: 16, paddingBottom: 40 },
  emptyState: { alignItems: 'center', paddingTop: 60 },
  emptyIcon: { fontSize: 48, marginBottom: 12 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: Colors.textPrimary, marginBottom: 8 },
  emptyText: { fontSize: 14, color: Colors.textSecondary, textAlign: 'center', lineHeight: 20, paddingHorizontal: 32 },
  harvestCard: {
    backgroundColor: Colors.surface, borderRadius: 10, padding: 14, marginBottom: 10,
    borderWidth: 1, borderColor: Colors.mud,
  },
  harvestHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 },
  harvestTitleGroup: { flex: 1 },
  harvestSpecies: { fontSize: 16, fontWeight: '700', color: Colors.textPrimary },
  harvestDate: { fontSize: 13, color: Colors.textSecondary, marginTop: 2 },
  editButton: { fontSize: 18, color: Colors.tan, paddingLeft: 8 },
  photoPreview: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.forestDark, paddingHorizontal: 8, paddingVertical: 6, borderRadius: 6, marginBottom: 8, gap: 6 },
  photoIcon: { fontSize: 16 },
  photoText: { fontSize: 13, color: Colors.tan, fontWeight: '500' },
  harvestDetails: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 8 },
  detailText: {
    fontSize: 12, color: Colors.tan, backgroundColor: Colors.surfaceElevated,
    paddingHorizontal: 8, paddingVertical: 3, borderRadius: 4,
  },
  gameCheckRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  gameCheckBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 4 },
  gameCheckDone: { backgroundColor: Colors.success + '30' },
  gameCheckPending: { backgroundColor: Colors.warning + '30' },
  gameCheckText: { fontSize: 12, fontWeight: '600', color: Colors.textPrimary },
  gameCheckNum: { fontSize: 12, color: Colors.textMuted },
  summaryCard: {
    backgroundColor: Colors.forestDark, borderRadius: 12, padding: 20, alignItems: 'center',
    marginBottom: 16,
  },
  summaryLabel: { fontSize: 13, color: Colors.textSecondary, textTransform: 'uppercase', letterSpacing: 1 },
  summaryBig: { fontSize: 48, fontWeight: '700', color: Colors.textPrimary, marginVertical: 4 },
  summarySubtext: { fontSize: 14, color: Colors.textMuted },
  speciesRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    backgroundColor: Colors.surface, padding: 14, borderRadius: 8, marginBottom: 8,
  },
  speciesName: { fontSize: 15, fontWeight: '600', color: Colors.textPrimary },
  speciesCount: { fontSize: 18, fontWeight: '700', color: Colors.moss },
  deerDetailCard: {
    backgroundColor: Colors.surface, borderRadius: 10, padding: 14, marginTop: 8, marginBottom: 12,
    borderWidth: 1, borderColor: Colors.mud,
  },
  deerDetailTitle: { fontSize: 14, fontWeight: '700', color: Colors.tan, marginBottom: 8 },
  deerRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4 },
  deerLabel: { fontSize: 14, color: Colors.textSecondary },
  deerCount: { fontSize: 14, fontWeight: '700', color: Colors.textPrimary },
  gameCheckCard: {
    backgroundColor: Colors.surface, borderRadius: 10, padding: 16, marginTop: 8, alignItems: 'center',
  },
  gameCheckTitle: { fontSize: 13, color: Colors.textMuted, textTransform: 'uppercase', letterSpacing: 1 },
  gameCheckRate: { fontSize: 36, fontWeight: '700', color: Colors.success, marginVertical: 4 },
  gameCheckDetail: { fontSize: 13, color: Colors.textSecondary },
  loadingText: { color: Colors.textMuted, textAlign: 'center', marginTop: 40 },
  // Modal
  modalContainer: { flex: 1, backgroundColor: Colors.background },
  modalHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: Colors.mud,
  },
  modalTitle: { fontSize: 17, fontWeight: '700', color: Colors.textPrimary },
  cancelBtn: { fontSize: 16, color: Colors.textSecondary },
  saveBtn: { fontSize: 16, fontWeight: '700', color: Colors.moss },
  formContent: { padding: 16, paddingBottom: 60 },
  formField: { marginBottom: 16 },
  formLabel: { fontSize: 14, fontWeight: '600', color: Colors.tan, marginBottom: 6 },
  formInput: {
    backgroundColor: Colors.surface, borderRadius: 8, padding: 12,
    color: Colors.textPrimary, fontSize: 15, borderWidth: 1, borderColor: Colors.mud,
  },
  formInputMultiline: { minHeight: 80, textAlignVertical: 'top' },
  formHelp: { fontSize: 12, color: Colors.textMuted, marginBottom: 8 },
  phoneLink: { fontSize: 12, color: Colors.moss, fontWeight: '700', textDecorationLine: 'underline' },
  formSectionTitle: { fontSize: 16, fontWeight: '700', color: Colors.textPrimary, marginTop: 12, marginBottom: 4 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
  chip: {
    paddingVertical: 6, paddingHorizontal: 14, borderRadius: 16,
    backgroundColor: Colors.surfaceElevated, borderWidth: 1, borderColor: Colors.mud,
  },
  chipActive: { backgroundColor: Colors.moss, borderColor: Colors.moss },
  chipText: { fontSize: 13, color: Colors.textSecondary },
  chipTextActive: { color: Colors.mdWhite, fontWeight: '600' },
  switchRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    marginBottom: 16,
  },
  gameCheckSection: {
    marginTop: 16, paddingTop: 16, borderTopWidth: 1, borderTopColor: Colors.mud,
  },
  photoSection: {
    marginTop: 16, paddingTop: 16, borderTopWidth: 1, borderTopColor: Colors.mud,
  },
  photoButton: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.surfaceElevated,
    borderRadius: 8, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: Colors.mud,
    gap: 12,
  },
  photoButtonIcon: { fontSize: 24 },
  photoButtonContent: { flex: 1 },
  photoButtonText: { fontSize: 15, fontWeight: '600', color: Colors.textPrimary },
  photoButtonSubtext: { fontSize: 13, color: Colors.textMuted, marginTop: 2 },
  photoStatusBadge: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.forestDark,
    paddingHorizontal: 12, paddingVertical: 8, borderRadius: 6, gap: 8,
  },
  photoStatusIcon: { fontSize: 16, color: Colors.success },
  photoStatusText: { fontSize: 13, color: Colors.textSecondary, fontWeight: '500' },
});
