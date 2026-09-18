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
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Colors from '../theme/colors';
import { useModalFocus } from '../hooks/useModalFocus';
import { API_BASE_URL } from '../services/api';
import { REGULATIONS_META } from '../data/marylandHuntingData';
import { fetchWithTimeout } from '../config';

/** Harvest API ceiling; past this the local log is shown with Retry. */
const HARVEST_REQUEST_TIMEOUT_MS = 8000;
const LOCAL_LOG_KEY = '@harvest_log';

/** Read the on-device log, tolerating a missing or corrupt value. */
async function readLocalLog(): Promise<HarvestEntry[]> {
  try {
    const raw = await AsyncStorage.getItem(LOCAL_LOG_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((h) => h && typeof h.id === 'string') : [];
  } catch {
    return [];
  }
}

/** Server entries first, then local-only entries not already on the server. */
function mergeHarvests(server: HarvestEntry[], local: HarvestEntry[]): HarvestEntry[] {
  const seen = new Set(server.map((h) => h.id));
  return [...server, ...local.filter((h) => !seen.has(h.id))];
}

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
}

interface SeasonSummary {
  total_harvests: number;
  by_species: Record<string, number>;
  deer_detail?: { antlered: number; antlerless: number };
  game_check_rate: { total: number; checked: number; rate: number };
}

const SPECIES_OPTIONS = ['deer', 'turkey', 'waterfowl', 'bear', 'small_game', 'dove', 'rabbit', 'squirrel'];
// 2026-04-29: Aligned with HuntPlanScreen — MD DNR has 3 distinct legal
// hunt seasons: Archery, Firearms, Muzzleloader. Shotgun is a firearm
// subtype required in shotgun-only zones, NOT a separate season. Logged
// harvests record the season, not the firearm subtype.
const WEAPON_OPTIONS = ['archery', 'firearms', 'muzzleloader'];

// ─── Main Component ─────────────────────────────────────────────

export default function HarvestLogScreen() {
  const [harvests, setHarvests] = useState<HarvestEntry[]>([]);
  const [summary, setSummary] = useState<SeasonSummary | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  /** Set when the server could not be reached; the local log is shown. */
  const [fetchError, setFetchError] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [view, setView] = useState<'list' | 'summary'>('list');

  // Form state
  const [formSpecies, setFormSpecies] = useState('deer');
  const [formSpeciesDetail, setFormSpeciesDetail] = useState('');
  const [formDate, setFormDate] = useState(new Date().toISOString().split('T')[0]);
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

  const fetchData = useCallback(async () => {
    // Local entries always show, whether or not the server answers.
    const local = await readLocalLog();
    setHarvests((prev) => (prev.length === 0 ? local : mergeHarvests(prev, local)));
    try {
      const token = await AsyncStorage.getItem('@auth_access_token').catch(() => null);
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;
      // Bound every request in this block to 8 s (shadowing global fetch
      // keeps the endpoint lines below untouched).
      const fetch = (url: string, init?: RequestInit) =>
        fetchWithTimeout(url, init, HARVEST_REQUEST_TIMEOUT_MS);

      // Fetch harvests
      const listRes = await fetch(`${API_BASE_URL}/api/v1/harvest/list?season_year=${REGULATIONS_META.seasonLabel}`, { headers });
      if (listRes.ok) {
        const data = await listRes.json();
        const server: HarvestEntry[] = Array.isArray(data?.harvests) ? data.harvests : [];
        setHarvests(mergeHarvests(server, local));
        setFetchError(false);
      } else {
        setFetchError(true);
      }

      // Fetch summary
      const sumRes = await fetch(`${API_BASE_URL}/api/v1/harvest/summary?season_year=${REGULATIONS_META.seasonLabel}`, { headers });
      if (sumRes.ok) {
        const data = await sumRes.json();
        setSummary(data);
      }
    } catch (e) {
      // Offline, timeout, or bad payload: keep showing the local log.
      setFetchError(true);
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
    const entry: any = {
      species: formSpecies,
      species_detail: formSpeciesDetail || undefined,
      harvest_date: formDate,
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
      season_year: REGULATIONS_META.seasonLabel,
    };

    try {
      const token = await AsyncStorage.getItem('@auth_access_token');
      const res = await fetchWithTimeout(`${API_BASE_URL}/api/v1/harvest/log`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(entry),
      }, HARVEST_REQUEST_TIMEOUT_MS);

      if (res.ok) {
        setShowForm(false);
        resetForm();
        await fetchData();
      } else {
        throw new Error('Server error');
      }
    } catch {
      // Save locally for offline
      const list = await readLocalLog();
      list.unshift({ ...entry, id: `local_${Date.now()}`, created_at: new Date().toISOString() });
      try {
        await AsyncStorage.setItem(LOCAL_LOG_KEY, JSON.stringify(list));
      } catch {
        // Storage write failed; the entry still shows for this session.
      }
      setHarvests((prev) => mergeHarvests(prev.filter((h) => !h.id.startsWith('local_')), list));
      setShowForm(false);
      resetForm();
      Alert.alert('Saved Locally', 'Harvest saved to your device. It will sync when you have connection.');
    }
  };

  const resetForm = () => {
    setFormSpecies('deer');
    setFormSpeciesDetail('');
    setFormDate(new Date().toISOString().split('T')[0]);
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
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Harvest Log</Text>
        <TouchableOpacity style={styles.addBtn} onPress={() => setShowForm(true)}>
          <Text style={styles.addBtnText}>+ Log Harvest</Text>
        </TouchableOpacity>
      </View>

      {/* View Toggle */}
      <View style={styles.toggleBar}>
        <TouchableOpacity
          style={[styles.toggleBtn, view === 'list' && styles.toggleActive]}
          onPress={() => setView('list')}
        >
          <Text style={[styles.toggleText, view === 'list' && styles.toggleTextActive]}>
            Harvests
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.toggleBtn, view === 'summary' && styles.toggleActive]}
          onPress={() => setView('summary')}
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
            {fetchError && (
              <View style={styles.offlineNotice}>
                <Text style={styles.offlineNoticeTitle}>Showing your local log</Text>
                <Text style={styles.offlineNoticeText}>
                  The harvest server could not be reached. Entries saved on this device are shown and new ones will sync later.
                </Text>
                <TouchableOpacity
                  style={styles.retryBtn}
                  onPress={onRefresh}
                  accessibilityRole="button"
                  accessibilityLabel="Retry loading harvests"
                >
                  <Text style={styles.retryBtnText}>Retry</Text>
                </TouchableOpacity>
              </View>
            )}
            {harvests.length === 0 ? (
              <View style={styles.emptyState}>
                <Text style={styles.emptyTitle}>No Harvests Yet</Text>
                <Text style={styles.emptyText}>
                  Tap "Log Harvest" to record your first harvest of the season.
                  Track your bag count and game check status.
                </Text>
              </View>
            ) : (
              harvests?.map((h) => (
                <View key={h.id} style={styles.harvestCard}>
                  <View style={styles.harvestHeader}>
                    <Text style={styles.harvestSpecies}>
                      {h.species.charAt(0).toUpperCase() + h.species.slice(1)}
                      {h.species_detail ? ` — ${h.species_detail}` : ''}
                    </Text>
                    <Text style={styles.harvestDate}>{formatDate(h.harvest_date)}</Text>
                  </View>
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
                  <Text style={styles.summarySubtext}>{`${REGULATIONS_META.seasonLabel} Season`}</Text>
                </View>

                {Object.entries(summary?.by_species || {}).map(([sp, count]) => (
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

      {/* ── Log Harvest Modal ── */}
      <Modal visible={showForm} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => { setShowForm(false); resetForm(); }}>
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => { setShowForm(false); resetForm(); }}>
              <Text style={styles.cancelBtn}>Cancel</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Log Harvest</Text>
            <TouchableOpacity onPress={submitHarvest}>
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
                >
                  <Text style={[styles.chipText, formWeapon === w && styles.chipTextActive]}>
                    {w.charAt(0).toUpperCase() + w.slice(1)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <FormField label="Weapon Detail (optional)" value={formWeaponDetail} onChange={setFormWeaponDetail}
              placeholder="e.g., Mathews V3X, .30-06 Remington" />

            <FormField label="Date" value={formDate} onChange={setFormDate} placeholder="YYYY-MM-DD" />
            <FormField label="Time (optional)" value={formTime} onChange={setFormTime} placeholder="07:30" />
            <FormField label="County" value={formCounty} onChange={setFormCounty} placeholder="e.g., Frederick" />
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
                MD law requires checking your harvest within 24 hours.
                Call 1-800-214-3337 or use the DNR website.
              </Text>
              <View style={styles.switchRow}>
                <Text style={styles.formLabel}>Game Check Completed</Text>
                <Switch
                  value={formGameCheckDone}
                  onValueChange={setFormGameCheckDone}
                  trackColor={{ false: Colors.mud, true: Colors.success }}
                  thumbColor={formGameCheckDone ? Colors.success : Colors.textMuted}
                />
              </View>
              {formGameCheckDone && (
                <FormField label="Confirmation Number" value={formGameCheck}
                  onChange={setFormGameCheck} placeholder="Enter confirmation #" />
              )}
            </View>

            <FormField label="Notes (optional)" value={formNotes} onChange={setFormNotes}
              placeholder="Weather conditions, stand location, story..." multiline />

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
        maxLength={100}
        returnKeyType="done"
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
  addBtnText: { color: '#fff', fontSize: 14, fontWeight: '600' },
  toggleBar: {
    flexDirection: 'row', marginHorizontal: 16, backgroundColor: Colors.surface,
    borderRadius: 8, overflow: 'hidden', marginBottom: 12,
  },
  toggleBtn: { flex: 1, paddingVertical: 10, alignItems: 'center' },
  toggleActive: { backgroundColor: Colors.moss },
  toggleText: { fontSize: 14, color: Colors.textSecondary, fontWeight: '600' },
  toggleTextActive: { color: '#fff' },
  scrollContent: { padding: 16, paddingBottom: 40 },
  emptyState: { alignItems: 'center', paddingTop: 60 },
  offlineNotice: {
    backgroundColor: Colors.surface,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.mdGold,
    padding: 12,
    marginBottom: 12,
  },
  offlineNoticeTitle: { fontSize: 13, fontWeight: '800', color: Colors.mdGold, letterSpacing: 0.5, marginBottom: 4 },
  offlineNoticeText: { fontSize: 13, color: Colors.textSecondary, lineHeight: 18 },
  retryBtn: {
    alignSelf: 'flex-start',
    marginTop: 10,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
    backgroundColor: Colors.moss,
  },
  retryBtnText: { color: Colors.textOnAccent, fontSize: 12, fontWeight: '700', letterSpacing: 0.5 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: Colors.textPrimary, marginBottom: 8 },
  emptyText: { fontSize: 14, color: Colors.textSecondary, textAlign: 'center', lineHeight: 20, paddingHorizontal: 32 },
  harvestCard: {
    backgroundColor: Colors.surface, borderRadius: 10, padding: 14, marginBottom: 10,
    borderWidth: 1, borderColor: Colors.mud,
  },
  harvestHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  harvestSpecies: { fontSize: 16, fontWeight: '700', color: Colors.textPrimary },
  harvestDate: { fontSize: 13, color: Colors.textSecondary },
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
  formSectionTitle: { fontSize: 16, fontWeight: '700', color: Colors.textPrimary, marginTop: 12, marginBottom: 4 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
  chip: {
    paddingVertical: 6, paddingHorizontal: 14, borderRadius: 16,
    backgroundColor: Colors.surfaceElevated, borderWidth: 1, borderColor: Colors.mud,
  },
  chipActive: { backgroundColor: Colors.moss, borderColor: Colors.moss },
  chipText: { fontSize: 13, color: Colors.textSecondary },
  chipTextActive: { color: '#fff', fontWeight: '600' },
  switchRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    marginBottom: 16,
  },
  gameCheckSection: {
    marginTop: 16, paddingTop: 16, borderTopWidth: 1, borderTopColor: Colors.mud,
  },
});
