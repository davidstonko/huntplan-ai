import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Modal,
  TextInput,
  ScrollView,
  Alert,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Colors from '../theme/colors';

const API_BASE_URL = __DEV__
  ? 'http://localhost:8000'
  : 'https://huntplan-api.onrender.com';

interface ScoutingReport {
  id: string;
  handle: string;
  species: string;
  activityLevel: 'none' | 'low' | 'moderate' | 'high';
  county: string;
  area: string;
  bodyText: string;
  date: string;
  upvotes: number;
}

const ACTIVITY_LABELS: Record<string, { label: string; color: string }> = {
  high: { label: 'HIGH', color: Colors.danger },
  moderate: { label: 'MOD', color: Colors.amber },
  low: { label: 'LOW', color: Colors.sage },
  none: { label: 'NONE', color: Colors.textMuted },
};

export default function SocialScreen() {
  const [username, setUsername] = useState<string | null>(null);
  const [showUsernameModal, setShowUsernameModal] = useState(true);
  const [usernameInput, setUsernameInput] = useState('');
  const [usernameError, setUsernameError] = useState('');

  const [reports, setReports] = useState<ScoutingReport[]>([
    {
      id: '1',
      handle: 'EasternShore_Buck',
      species: 'Deer',
      activityLevel: 'high',
      county: 'Dorchester',
      area: 'LeCompte WMA',
      bodyText: 'Saw 5 deer at first light near the east field. Strong rut activity with fresh rubs along the tree line. Several does and a solid 8-point.',
      date: '2026-03-28',
      upvotes: 14,
    },
    {
      id: '2',
      handle: 'TurkeyTom_301',
      species: 'Turkey',
      activityLevel: 'moderate',
      county: 'Garrett',
      area: 'Savage River SF',
      bodyText: 'Heard gobbling at sunrise off the main ridge trail. Clear weather, good conditions for a setup. Saw tracks near the parking area.',
      date: '2026-03-27',
      upvotes: 9,
    },
    {
      id: '3',
      handle: 'WaterfowlKing_22',
      species: 'Waterfowl',
      activityLevel: 'high',
      county: 'Cecil',
      area: 'Elk Neck SF',
      bodyText: 'Huge flight of mallards and pintails at dawn. Counted 200+ birds in the cove. Decoys pulled well. Best day this season.',
      date: '2026-03-26',
      upvotes: 21,
    },
    {
      id: '4',
      handle: 'MountainMan_WMD',
      species: 'Bear',
      activityLevel: 'low',
      county: 'Allegany',
      area: "Dan's Mountain WMA",
      bodyText: 'Found bear scat and overturned logs near the upper ridge. No visual sighting. Area looks promising for archery season.',
      date: '2026-03-25',
      upvotes: 6,
    },
  ]);

  const [refreshing, setRefreshing] = useState(false);
  const [loadingFeed, setLoadingFeed] = useState(true);

  /** Fetch scouting reports from backend, fallback to local mock data */
  const fetchReports = useCallback(async () => {
    try {
      const token = await AsyncStorage.getItem('auth_token');
      const response = await fetch(`${API_BASE_URL}/api/v1/social/social/feed?limit=30`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (response.ok) {
        const data = await response.json();
        if (data.reports && data.reports.length > 0) {
          const mapped: ScoutingReport[] = data.reports.map((r: any) => ({
            id: r.id,
            handle: r.handle || 'Anonymous',
            species: r.species,
            activityLevel: r.activity_level || 'moderate',
            county: r.county || '',
            area: r.public_land_name || r.general_area || '',
            bodyText: r.body || '',
            date: r.report_date?.split('T')[0] || '',
            upvotes: r.upvotes || 0,
          }));
          setReports(mapped);
        }
      }
    } catch {
      // Keep local mock data as fallback
    } finally {
      setLoadingFeed(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchReports();
  }, [fetchReports]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchReports();
  }, [fetchReports]);

  /** Submit report to backend, then add locally */
  const submitToBackend = async (report: ScoutingReport) => {
    try {
      const token = await AsyncStorage.getItem('auth_token');
      if (!token) return;
      await fetch(`${API_BASE_URL}/api/v1/social/social/reports`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          species: report.species,
          activity_level: report.activityLevel,
          report_date: report.date,
          county: report.county,
          public_land_name: report.area,
          body: report.bodyText,
        }),
      });
    } catch {
      // Report saved locally even if backend fails
    }
  };

  const [showReportModal, setShowReportModal] = useState(false);
  const [formData, setFormData] = useState({
    species: '',
    county: '',
    area: '',
    bodyText: '',
    activityLevel: 'moderate' as ScoutingReport['activityLevel'],
  });

  const validateUsername = (input: string): boolean => {
    if (input.length < 3) {
      setUsernameError('Username must be at least 3 characters');
      return false;
    }
    if (input.length > 20) {
      setUsernameError('Username must be 20 characters or less');
      return false;
    }
    if (!/^[a-zA-Z0-9_]+$/.test(input)) {
      setUsernameError('Only alphanumeric characters and underscores allowed');
      return false;
    }
    setUsernameError('');
    return true;
  };

  const handleCreateUsername = () => {
    if (validateUsername(usernameInput)) {
      setUsername(usernameInput);
      setShowUsernameModal(false);
      setUsernameInput('');
    }
  };

  const handleStayAnonymous = () => {
    const randomHandle = 'Hunter_' + Math.floor(Math.random() * 9999).toString().padStart(4, '0');
    setUsername(randomHandle);
    setShowUsernameModal(false);
    setUsernameInput('');
  };

  const handleSubmit = () => {
    if (!formData.species || !formData.county || !formData.bodyText.trim()) {
      Alert.alert('Missing Fields', 'Fill in species, county, and observation.');
      return;
    }
    const report: ScoutingReport = {
      id: Date.now().toString(),
      handle: username || 'Hunter_' + Math.floor(Math.random() * 9999),
      upvotes: 0,
      date: new Date().toISOString().split('T')[0],
      ...formData,
    };
    setReports([report, ...reports]);
    submitToBackend(report); // Push to backend in background
    setFormData({ species: '', county: '', area: '', bodyText: '', activityLevel: 'moderate' });
    setShowReportModal(false);
  };

  const renderReport = ({ item }: { item: ScoutingReport }) => {
    const activity = ACTIVITY_LABELS[item.activityLevel];
    return (
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <View>
            <Text style={styles.handle}>{item.handle}</Text>
            <Text style={styles.date}>{item.date}</Text>
          </View>
          <View style={[styles.activityBadge, { backgroundColor: activity.color }]}>
            <Text style={styles.activityText}>{activity.label}</Text>
          </View>
        </View>

        <View style={styles.cardBody}>
          <Text style={styles.speciesLabel}>{item.species}</Text>
          <Text style={styles.location}>{item.area}, {item.county} Co.</Text>
          <Text style={styles.body}>{item.bodyText}</Text>
        </View>

        <View style={styles.cardFooter}>
          <TouchableOpacity style={styles.actionBtn}>
            <Text style={styles.actionText}>Upvote ({item.upvotes})</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionBtn}>
            <Text style={styles.actionText}>Reply</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {/* ── Username Header Bar ── */}
      {username && (
        <View style={styles.usernameBar}>
          <Text style={styles.usernameText}>Posting as: <Text style={styles.usernameHandle}>@{username}</Text></Text>
          <TouchableOpacity onPress={() => setShowUsernameModal(true)}>
            <Text style={styles.editUsernameBtn}>Edit</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* ── Feed Section ── */}
      {reports.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyMark}>SCOUT</Text>
          <Text style={styles.emptyTitle}>No scouting reports yet</Text>
          <Text style={styles.emptyText}>Be the first to share intel with the community</Text>
        </View>
      ) : (
        <FlatList
          data={reports}
          renderItem={renderReport}
          keyExtractor={(item) => item.id}
          ListHeaderComponent={
            <View style={styles.feedHeader}>
              <Text style={styles.feedHeaderTitle}>Scouting Reports</Text>
              <Text style={styles.feedHeaderCount}>{reports.length}</Text>
            </View>
          }
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.oak} />
          }
        />
      )}

      <TouchableOpacity
        style={styles.fab}
        onPress={() => setShowReportModal(true)}
        activeOpacity={0.7}
      >
        <Text style={styles.fabText}>+</Text>
      </TouchableOpacity>

      {/* ── Username Creation Modal ── */}
      <Modal visible={showUsernameModal && !username} animationType="fade" transparent>
        <View style={styles.usernameModalOverlay}>
          <View style={styles.usernameModalContent}>
            <Text style={styles.usernameModalTitle}>Create Your Username</Text>
            <Text style={styles.usernameModalSubtitle}>
              Choose a username for the MDHuntFishOutdoors community (3-20 characters, alphanumeric + underscores only)
            </Text>

            <TextInput
              style={[styles.usernameInput, usernameError && styles.usernameInputError]}
              placeholder="e.g., DeerHunter_MD"
              placeholderTextColor={Colors.textMuted}
              value={usernameInput}
              onChangeText={(text) => {
                setUsernameInput(text);
                setUsernameError('');
              }}
              maxLength={20}
            />

            {usernameError ? (
              <Text style={styles.errorText}>{usernameError}</Text>
            ) : (
              <Text style={styles.characterCount}>{usernameInput.length}/20 characters</Text>
            )}

            <TouchableOpacity
              style={[styles.usernameSubmitBtn, { opacity: usernameInput.length >= 3 ? 1 : 0.5 }]}
              onPress={handleCreateUsername}
              disabled={usernameInput.length < 3}
            >
              <Text style={styles.usernameSubmitBtnText}>Create Username</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.anonymousBtn} onPress={handleStayAnonymous}>
              <Text style={styles.anonymousBtnText}>Stay Anonymous</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ── Username Edit Modal ── */}
      <Modal visible={showUsernameModal && !!username} animationType="fade" transparent>
        <View style={styles.usernameModalOverlay}>
          <View style={styles.usernameModalContent}>
            <Text style={styles.usernameModalTitle}>Edit Username</Text>
            <Text style={styles.usernameModalSubtitle}>
              Change your username (3-20 characters, alphanumeric + underscores only)
            </Text>

            <TextInput
              style={[styles.usernameInput, usernameError && styles.usernameInputError]}
              placeholder="e.g., DeerHunter_MD"
              placeholderTextColor={Colors.textMuted}
              value={usernameInput || username || ''}
              onChangeText={(text) => {
                setUsernameInput(text);
                setUsernameError('');
              }}
              maxLength={20}
            />

            {usernameError ? (
              <Text style={styles.errorText}>{usernameError}</Text>
            ) : (
              <Text style={styles.characterCount}>{(usernameInput || username || '').length}/20 characters</Text>
            )}

            <TouchableOpacity
              style={[styles.usernameSubmitBtn, { opacity: (usernameInput || username || '').length >= 3 ? 1 : 0.5 }]}
              onPress={() => {
                const newUsername = usernameInput || username;
                if (newUsername && validateUsername(newUsername)) {
                  setUsername(newUsername);
                  setShowUsernameModal(false);
                  setUsernameInput('');
                }
              }}
              disabled={(usernameInput || username || '').length < 3}
            >
              <Text style={styles.usernameSubmitBtnText}>Save Username</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.cancelBtn}
              onPress={() => {
                setShowUsernameModal(false);
                setUsernameInput('');
                setUsernameError('');
              }}
            >
              <Text style={styles.cancelBtnText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ── Report Form Modal ── */}
      <Modal visible={showReportModal} animationType="slide" onRequestClose={() => setShowReportModal(false)}>
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setShowReportModal(false)}>
              <Text style={styles.closeBtn}>X</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>New Scouting Report</Text>
            <View style={{ width: 24 }} />
          </View>

          <ScrollView style={styles.formContainer} showsVerticalScrollIndicator={false}>
            <Text style={styles.formLabel}>Species *</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g., Deer, Turkey, Waterfowl"
              placeholderTextColor={Colors.textMuted}
              value={formData.species}
              onChangeText={(t) => setFormData({ ...formData, species: t })}
            />

            <Text style={styles.formLabel}>Activity Level</Text>
            <View style={styles.activityRow}>
              {(['none', 'low', 'moderate', 'high'] as const).map((level) => (
                <TouchableOpacity
                  key={level}
                  style={[
                    styles.activityOption,
                    formData.activityLevel === level && styles.activityOptionActive,
                  ]}
                  onPress={() => setFormData({ ...formData, activityLevel: level })}
                >
                  <Text
                    style={[
                      styles.activityOptionText,
                      formData.activityLevel === level && styles.activityOptionTextActive,
                    ]}
                  >
                    {level.charAt(0).toUpperCase() + level.slice(1)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.formLabel}>County *</Text>
            <TextInput
              style={styles.input}
              placeholder="Maryland county"
              placeholderTextColor={Colors.textMuted}
              value={formData.county}
              onChangeText={(t) => setFormData({ ...formData, county: t })}
            />

            <Text style={styles.formLabel}>Area / WMA</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g., Savage Mill WMA"
              placeholderTextColor={Colors.textMuted}
              value={formData.area}
              onChangeText={(t) => setFormData({ ...formData, area: t })}
            />

            <Text style={styles.formLabel}>What Did You See? *</Text>
            <TextInput
              style={[styles.input, styles.largeInput]}
              placeholder="Describe sighting, sign, conditions..."
              placeholderTextColor={Colors.textMuted}
              value={formData.bodyText}
              onChangeText={(t) => setFormData({ ...formData, bodyText: t })}
              multiline
              textAlignVertical="top"
            />

            <TouchableOpacity style={styles.submitButton} onPress={handleSubmit}>
              <Text style={styles.submitButtonText}>Post Report</Text>
            </TouchableOpacity>

            <View style={{ height: 40 }} />
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  usernameBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.mud,
  },
  usernameText: { fontSize: 13, color: Colors.textSecondary, fontWeight: '500' },
  usernameHandle: { color: Colors.oak, fontWeight: '700' },
  editUsernameBtn: { fontSize: 12, color: Colors.moss, fontWeight: '600' },
  feedHeader: {
    paddingHorizontal: 12,
    paddingTop: 12,
    paddingBottom: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  feedHeaderTitle: { fontSize: 16, fontWeight: '700', color: Colors.textPrimary },
  feedHeaderCount: { fontSize: 14, color: Colors.textMuted, fontWeight: '600' },
  listContent: { paddingHorizontal: 12, paddingVertical: 0, paddingBottom: 80 },
  card: {
    backgroundColor: Colors.surface,
    borderRadius: 10,
    padding: 14,
    marginBottom: 12,
    borderLeftWidth: 3,
    borderLeftColor: Colors.oak,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  handle: { fontSize: 13, fontWeight: '600', color: Colors.oak },
  date: { fontSize: 11, color: Colors.textMuted },
  activityBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  activityText: { fontSize: 10, fontWeight: '800', color: Colors.textOnAccent, letterSpacing: 0.5 },
  cardBody: { marginBottom: 10 },
  speciesLabel: { fontSize: 15, fontWeight: '700', color: Colors.textPrimary, marginBottom: 4 },
  location: { fontSize: 12, color: Colors.textSecondary, marginBottom: 6 },
  body: { fontSize: 13, color: Colors.textPrimary, lineHeight: 19 },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    borderTopWidth: 1,
    borderTopColor: Colors.mud,
    paddingTop: 8,
  },
  actionBtn: { paddingVertical: 4 },
  actionText: { fontSize: 12, color: Colors.oak, fontWeight: '600' },
  emptyState: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyMark: { fontSize: 36, fontWeight: '900', color: Colors.mud, letterSpacing: 6, marginBottom: 12 },
  emptyTitle: { fontSize: 18, fontWeight: '600', color: Colors.textPrimary, marginBottom: 8 },
  emptyText: { fontSize: 14, color: Colors.textMuted, textAlign: 'center', paddingHorizontal: 40 },
  fab: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Colors.moss,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  fabText: { fontSize: 28, color: Colors.textOnAccent, fontWeight: '600' },
  modalContainer: { flex: 1, backgroundColor: Colors.background },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: Colors.mud,
  },
  closeBtn: { fontSize: 18, color: Colors.oak, fontWeight: '700' },
  modalTitle: { fontSize: 18, fontWeight: '700', color: Colors.textPrimary },
  formContainer: { flex: 1, paddingHorizontal: 16, paddingTop: 20 },
  formLabel: { fontSize: 13, fontWeight: '600', color: Colors.textPrimary, marginBottom: 6, marginTop: 4 },
  input: {
    backgroundColor: Colors.surface,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: Colors.textPrimary,
    fontSize: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: Colors.mud,
  },
  largeInput: { height: 100, textAlignVertical: 'top' },
  activityRow: { flexDirection: 'row', gap: 8, marginBottom: 14 },
  activityOption: {
    flex: 1,
    paddingVertical: 8,
    backgroundColor: Colors.surface,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: Colors.mud,
    alignItems: 'center',
  },
  activityOptionActive: { backgroundColor: Colors.moss, borderColor: Colors.moss },
  activityOptionText: { fontSize: 11, color: Colors.textMuted, fontWeight: '600' },
  activityOptionTextActive: { color: Colors.textOnAccent },
  submitButton: {
    backgroundColor: Colors.moss,
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 10,
  },
  submitButtonText: { color: Colors.textOnAccent, fontWeight: '700', fontSize: 16 },
  usernameModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  usernameModalContent: {
    backgroundColor: Colors.surface,
    borderRadius: 14,
    paddingHorizontal: 20,
    paddingVertical: 28,
    width: '100%',
    maxWidth: 340,
    borderWidth: 1,
    borderColor: Colors.mud,
  },
  usernameModalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginBottom: 8,
    textAlign: 'center',
  },
  usernameModalSubtitle: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginBottom: 20,
    textAlign: 'center',
    lineHeight: 18,
  },
  usernameInput: {
    backgroundColor: Colors.background,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    color: Colors.textPrimary,
    fontSize: 14,
    marginBottom: 8,
    borderWidth: 1.5,
    borderColor: Colors.mud,
  },
  usernameInputError: { borderColor: Colors.danger },
  characterCount: {
    fontSize: 11,
    color: Colors.textMuted,
    marginBottom: 14,
    textAlign: 'right',
  },
  errorText: {
    fontSize: 11,
    color: Colors.danger,
    marginBottom: 14,
  },
  usernameSubmitBtn: {
    backgroundColor: Colors.moss,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 10,
  },
  usernameSubmitBtnText: {
    color: Colors.textOnAccent,
    fontWeight: '700',
    fontSize: 15,
  },
  anonymousBtn: {
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: Colors.mud,
  },
  anonymousBtnText: {
    color: Colors.textSecondary,
    fontWeight: '600',
    fontSize: 15,
  },
  cancelBtn: {
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: Colors.mud,
  },
  cancelBtnText: {
    color: Colors.textSecondary,
    fontWeight: '600',
    fontSize: 15,
  },
});
