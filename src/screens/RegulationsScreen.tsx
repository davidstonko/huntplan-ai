import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  FlatList,
  TextInput,
  Modal,
} from 'react-native';
import Colors from '../theme/colors';
import { submitFeedback } from '../services/feedbackService';
import { CalendarDatePicker } from '../components/common/CalendarDatePicker';
import { SearchableCountyPicker } from '../components/common/SearchableCountyPicker';
import {
  MD_SEASONS,
  MD_COUNTIES,
  MD_BAG_LIMITS,
  isInSeason,
  HuntingSeason,
  BagLimitRule,
  MarylandCounty,
} from '../data/marylandHuntingData';

type Tab = 'seasons' | 'canIHunt' | 'bagLimits';

// Get unique species list from MD_SEASONS
const getUniqueSpecies = (): string[] => {
  const species = new Set(MD_SEASONS.map((s) => s.species));
  return Array.from(species).sort();
};

// Get unique weapon types from MD_SEASONS
const getUniqueWeapons = (): string[] => {
  const weapons = new Set<string>();
  MD_SEASONS.forEach((season) => {
    weapons.add(season.weaponType);
  });
  return Array.from(weapons).sort();
};

// Get county names
const getCountyNames = (): string[] => {
  return MD_COUNTIES.map((c) => c.name).sort();
};

// Format date string to readable format
const formatDate = (dateStr: string): string => {
  try {
    const d = new Date(dateStr + 'T00:00:00');
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  } catch (error) {
    if (__DEV__) console.error('[RegulationsScreen] Date formatting failed:', error);
    return dateStr;
  }
};

type FeedbackType = 'bug' | 'outdated' | 'suggestion';

export default function RegulationsScreen() {
  const [activeTab, setActiveTab] = useState<Tab>('seasons');

  // Can I Hunt form
  const [huntSpecies, setHuntSpecies] = useState('');
  const [huntWeapon, setHuntWeapon] = useState('');
  const [huntDate, setHuntDate] = useState(new Date());
  const [huntCounty, setHuntCounty] = useState('');
  const [huntResult, setHuntResult] = useState<{
    allowed: boolean;
    reason: string;
  } | null>(null);

  // Dropdown visibility states
  const [showSpeciesDropdown, setShowSpeciesDropdown] = useState(false);
  const [showWeaponDropdown, setShowWeaponDropdown] = useState(false);

  // Regulation feedback/report states
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [feedbackType, setFeedbackType] = useState<FeedbackType>('bug');
  const [feedbackText, setFeedbackText] = useState('');
  const [feedbackSubmitted, setFeedbackSubmitted] = useState(false);

  const handleSubmitFeedback = async () => {
    if (!feedbackText.trim()) {
      Alert.alert('Missing Details', 'Please describe the issue or suggestion.');
      return;
    }
    // Submit to backend with offline queue fallback
    try {
      await submitFeedback({
        feedback_type: feedbackType,
        description: feedbackText.trim(),
        screen: 'RegulationsScreen',
        active_tab: activeTab,
      });
    } catch (e) {
      if (__DEV__) console.warn('[RegFeedback] submitFeedback error:', e);
    }
    setFeedbackSubmitted(true);
    setTimeout(() => {
      setShowFeedbackModal(false);
      setFeedbackText('');
      setFeedbackType('bug');
      setFeedbackSubmitted(false);
    }, 1800);
  };

  const handleCanIHunt = () => {
    if (!huntSpecies || !huntWeapon || !huntCounty) {
      Alert.alert('Missing Fields', 'Please select species, weapon, and county.');
      return;
    }

    // Format date to YYYY-MM-DD for comparison
    const dateStr = huntDate.toISOString().split('T')[0];

    // Check if in season using local helper
    const inSeason = isInSeason(huntSpecies, huntDate, huntWeapon);

    if (inSeason) {
      const matchingSeasons = MD_SEASONS.filter(
        (s) =>
          s.species === huntSpecies &&
          s.startDate <= dateStr &&
          dateStr <= s.endDate &&
          s.weaponType.toLowerCase().includes(huntWeapon.toLowerCase())
      );

      const seasonInfo =
        matchingSeasons.length > 0
          ? `${matchingSeasons[0].seasonType} season. ${matchingSeasons[0].notes}`
          : 'Season is open.';

      setHuntResult({
        allowed: true,
        reason: `${huntSpecies} hunting is in season in ${huntCounty} County with ${huntWeapon}. ${seasonInfo}`,
      });
    } else {
      setHuntResult({
        allowed: false,
        reason: `${huntSpecies} is not in season on ${dateStr} with ${huntWeapon} in ${huntCounty} County.`,
      });
    }
  };

  const handleTabChange = (tab: Tab) => {
    setActiveTab(tab);
  };

  // Group seasons by species for display
  const seasonsBySpecies = getUniqueSpecies().map((species) => ({
    species,
    seasons: MD_SEASONS.filter((s) => s.species === species),
  }));

  // Group bag limits by species
  const bagLimitsBySpecies = getUniqueSpecies().map((species) => ({
    species,
    limits: MD_BAG_LIMITS.filter((b) => b.species === species),
  }));

  return (
    <View style={styles.container}>
      {/* Tab Bar */}
      <View style={styles.tabBar}>
        {(['seasons', 'canIHunt', 'bagLimits'] as Tab[]).map((tab) => (
          <TouchableOpacity
            key={tab}
            style={[styles.tab, activeTab === tab && styles.tabActive]}
            onPress={() => handleTabChange(tab)}
          >
            <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>
              {tab === 'seasons' ? 'Seasons' : tab === 'canIHunt' ? 'Can I Hunt?' : 'Bag Limits'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Seasons Tab ── */}
        {activeTab === 'seasons' && (
          <>
            <Text style={styles.sectionTitle}>MARYLAND 2025-2026 SEASONS</Text>
            {seasonsBySpecies.map((group) => (
              <View key={group.species}>
                <Text style={styles.speciesGroupTitle}>{group.species}</Text>
                {group.seasons.map((season) => (
                  <View key={season.id} style={styles.seasonCard}>
                    <View style={styles.seasonHeader}>
                      <Text style={styles.seasonType}>{season.seasonType}</Text>
                    </View>
                    <View style={styles.seasonDates}>
                      <Text style={styles.dateText}>
                        {formatDate(season.startDate)} — {formatDate(season.endDate)}
                      </Text>
                    </View>
                    <Text style={styles.weaponText}>
                      Weapon: {season.weaponType}
                    </Text>
                    {season.bagLimit && (
                      <Text style={styles.bagLimitText}>
                        Bag Limit: {season.bagLimit}
                      </Text>
                    )}
                    {season.notes && (
                      <Text style={styles.notesText}>{season.notes}</Text>
                    )}
                  </View>
                ))}
              </View>
            ))}
          </>
        )}

        {/* ── Can I Hunt Tab ── */}
        {activeTab === 'canIHunt' && (
          <>
            <Text style={styles.sectionTitle}>CHECK IF YOU CAN HUNT</Text>

            <Text style={styles.formLabel}>Species</Text>
            <TouchableOpacity
              style={styles.dropdownButton}
              onPress={() => setShowSpeciesDropdown(!showSpeciesDropdown)}
            >
              <Text
                style={[
                  styles.dropdownButtonText,
                  !huntSpecies && styles.dropdownPlaceholder,
                ]}
              >
                {huntSpecies || 'Select a species...'}
              </Text>
            </TouchableOpacity>
            {showSpeciesDropdown && (
              <View style={styles.dropdownMenu}>
                {getUniqueSpecies().map((sp) => (
                  <TouchableOpacity
                    key={sp}
                    style={styles.dropdownItem}
                    onPress={() => {
                      setHuntSpecies(sp);
                      setShowSpeciesDropdown(false);
                    }}
                  >
                    <Text style={styles.dropdownItemText}>{sp}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}

            <Text style={styles.formLabel}>Weapon</Text>
            <TouchableOpacity
              style={styles.dropdownButton}
              onPress={() => setShowWeaponDropdown(!showWeaponDropdown)}
            >
              <Text
                style={[
                  styles.dropdownButtonText,
                  !huntWeapon && styles.dropdownPlaceholder,
                ]}
              >
                {huntWeapon || 'Select a weapon...'}
              </Text>
            </TouchableOpacity>
            {showWeaponDropdown && (
              <View style={styles.dropdownMenu}>
                {getUniqueWeapons().map((weapon) => (
                  <TouchableOpacity
                    key={weapon}
                    style={styles.dropdownItem}
                    onPress={() => {
                      setHuntWeapon(weapon);
                      setShowWeaponDropdown(false);
                    }}
                  >
                    <Text style={styles.dropdownItemText}>{weapon}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}

            <CalendarDatePicker
              value={huntDate}
              onChange={setHuntDate}
              label="Date"
            />

            <SearchableCountyPicker
              value={huntCounty}
              onChange={setHuntCounty}
              label="County"
            />

            <TouchableOpacity
              style={styles.checkButton}
              onPress={handleCanIHunt}
              activeOpacity={0.7}
            >
              <Text style={styles.checkButtonText}>Check Regulations</Text>
            </TouchableOpacity>

            {huntResult && (
              <View
                style={[
                  styles.resultCard,
                  huntResult.allowed ? styles.resultAllowed : styles.resultDenied,
                ]}
              >
                <Text style={styles.resultTitle}>
                  {huntResult.allowed ? 'HUNT IS IN SEASON' : 'NOT IN SEASON'}
                </Text>
                <Text style={styles.resultReason}>{huntResult.reason}</Text>
                <Text style={styles.resultDisclaimer}>
                  Always verify with MD DNR before heading out.
                </Text>
              </View>
            )}
          </>
        )}

        {/* ── Bag Limits Tab ── */}
        {activeTab === 'bagLimits' && (
          <>
            <Text style={styles.sectionTitle}>MARYLAND BAG LIMITS</Text>
            {bagLimitsBySpecies.map((group) => (
              <View key={group.species}>
                <Text style={styles.speciesGroupTitle}>{group.species}</Text>
                {group.limits.map((limit, idx) => (
                  <View key={`${limit.species}-${idx}`} style={styles.limitCard}>
                    <View style={styles.limitRow}>
                      <Text style={styles.limitLabel}>{limit.limitType}</Text>
                      <Text style={styles.limitValue}>
                        {limit.quantity} / {limit.timePeriod}
                      </Text>
                    </View>
                    {limit.weaponType && (
                      <Text style={styles.limitWeapon}>
                        {limit.weaponType}
                      </Text>
                    )}
                    {limit.notes && (
                      <Text style={styles.notesText}>{limit.notes}</Text>
                    )}
                  </View>
                ))}
              </View>
            ))}
          </>
        )}

        <View style={styles.bottomSpacer} />
      </ScrollView>

      {/* ── Floating "Report Issue" button ── */}
      <TouchableOpacity
        style={styles.fab}
        activeOpacity={0.8}
        onPress={() => setShowFeedbackModal(true)}
      >
        <Text style={styles.fabIcon}>{'\u26A0\uFE0F'}</Text>
        <Text style={styles.fabLabel}>Report</Text>
      </TouchableOpacity>

      {/* ── Feedback Modal ── */}
      <Modal
        visible={showFeedbackModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowFeedbackModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            {feedbackSubmitted ? (
              <View style={styles.thankYouContainer}>
                <Text style={styles.thankYouEmoji}>{'\u2705'}</Text>
                <Text style={styles.thankYouTitle}>Thanks!</Text>
                <Text style={styles.thankYouText}>Your feedback helps keep regulations accurate.</Text>
              </View>
            ) : (
              <>
                <Text style={styles.modalTitle}>Report a Regulation Issue</Text>
                <Text style={styles.modalSubtitle}>
                  Help us keep data accurate. Flag errors, outdated info, or suggest updates.
                </Text>

                {/* Type picker */}
                <View style={styles.feedbackTypeRow}>
                  {([
                    { key: 'bug' as FeedbackType, label: 'Error/Bug', emoji: '\uD83D\uDC1B' },
                    { key: 'outdated' as FeedbackType, label: 'Outdated', emoji: '\uD83D\uDCC5' },
                    { key: 'suggestion' as FeedbackType, label: 'Suggestion', emoji: '\uD83D\uDCA1' },
                  ]).map((opt) => (
                    <TouchableOpacity
                      key={opt.key}
                      style={[styles.feedbackTypeButton, feedbackType === opt.key && styles.feedbackTypeActive]}
                      onPress={() => setFeedbackType(opt.key)}
                    >
                      <Text style={styles.feedbackTypeEmoji}>{opt.emoji}</Text>
                      <Text style={[styles.feedbackTypeLabel, feedbackType === opt.key && styles.feedbackTypeLabelActive]}>
                        {opt.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                {/* Description */}
                <TextInput
                  style={styles.feedbackInput}
                  placeholder="Describe the issue or suggestion..."
                  placeholderTextColor={Colors.textMuted}
                  multiline
                  numberOfLines={4}
                  value={feedbackText}
                  onChangeText={setFeedbackText}
                  textAlignVertical="top"
                />

                {/* Actions */}
                <View style={styles.modalActions}>
                  <TouchableOpacity style={styles.modalCancelButton} onPress={() => { setShowFeedbackModal(false); setFeedbackText(''); }}>
                    <Text style={styles.modalCancelText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.modalSubmitButton} onPress={handleSubmitFeedback}>
                    <Text style={styles.modalSubmitText}>Submit</Text>
                  </TouchableOpacity>
                </View>
              </>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.mud,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
  },
  tabActive: {
    borderBottomWidth: 2,
    borderBottomColor: Colors.oak,
  },
  tabText: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.textMuted,
  },
  tabTextActive: {
    color: Colors.oak,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: Colors.oak,
    letterSpacing: 1.2,
    marginBottom: 14,
  },
  // Seasons
  speciesGroupTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.moss,
    marginTop: 12,
    marginBottom: 8,
  },
  seasonCard: {
    backgroundColor: Colors.surface,
    borderRadius: 10,
    padding: 14,
    marginBottom: 10,
    borderLeftWidth: 3,
    borderLeftColor: Colors.moss,
  },
  seasonHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  seasonType: {
    fontSize: 12,
    color: Colors.sage,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  seasonDates: {
    marginBottom: 4,
  },
  dateText: {
    fontSize: 13,
    color: Colors.tan,
    fontWeight: '500',
  },
  weaponText: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
  bagLimitText: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  notesText: {
    fontSize: 11,
    color: Colors.textMuted,
    fontStyle: 'italic',
    marginTop: 4,
  },
  // Can I Hunt
  formLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.textPrimary,
    marginBottom: 6,
    marginTop: 12,
  },
  dropdownButton: {
    backgroundColor: Colors.surface,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: Colors.mud,
    marginBottom: 12,
  },
  dropdownButtonText: {
    fontSize: 14,
    color: Colors.textPrimary,
  },
  dropdownPlaceholder: {
    color: Colors.textMuted,
  },
  dropdownMenu: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.mud,
    borderRadius: 8,
    marginBottom: 12,
    maxHeight: 200,
  },
  dropdownItem: {
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.mud,
  },
  dropdownItemText: {
    fontSize: 13,
    color: Colors.textPrimary,
  },
  checkButton: {
    backgroundColor: Colors.moss,
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 8,
  },
  checkButtonText: {
    color: Colors.textOnAccent,
    fontSize: 15,
    fontWeight: '700',
  },
  resultCard: {
    marginTop: 16,
    borderRadius: 10,
    padding: 16,
  },
  resultAllowed: {
    backgroundColor: Colors.forestDark,
    borderLeftWidth: 4,
    borderLeftColor: Colors.success,
  },
  resultDenied: {
    backgroundColor: Colors.surface,
    borderLeftWidth: 4,
    borderLeftColor: Colors.danger,
  },
  resultTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: Colors.textPrimary,
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  resultReason: {
    fontSize: 13,
    color: Colors.textSecondary,
    lineHeight: 20,
    marginBottom: 8,
  },
  resultDisclaimer: {
    fontSize: 11,
    color: Colors.amber,
    fontStyle: 'italic',
  },
  // Bag Limits
  limitCard: {
    backgroundColor: Colors.surface,
    borderRadius: 10,
    padding: 14,
    marginBottom: 10,
    borderLeftWidth: 3,
    borderLeftColor: Colors.oak,
  },
  limitRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  limitLabel: {
    fontSize: 13,
    color: Colors.textSecondary,
  },
  limitValue: {
    fontSize: 14,
    color: Colors.tan,
    fontWeight: '700',
  },
  limitWeapon: {
    fontSize: 11,
    color: Colors.textMuted,
    marginTop: 4,
    fontStyle: 'italic',
  },
  bottomSpacer: {
    height: 80,
  },

  // ── Floating Action Button ──
  fab: {
    position: 'absolute',
    bottom: 16,
    right: 16,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.oak,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 24,
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.35,
    shadowRadius: 5,
  },
  fabIcon: { fontSize: 16, marginRight: 6 },
  fabLabel: { fontSize: 13, fontWeight: '700', color: Colors.textOnAccent },

  // ── Feedback Modal ──
  modalOverlay: {
    flex: 1,
    backgroundColor: Colors.overlay,
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    paddingBottom: 36,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: Colors.textPrimary,
    marginBottom: 4,
  },
  modalSubtitle: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginBottom: 16,
    lineHeight: 18,
  },
  feedbackTypeRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 14,
  },
  feedbackTypeButton: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: Colors.surfaceElevated,
    borderWidth: 1.5,
    borderColor: Colors.mud,
  },
  feedbackTypeActive: {
    borderColor: Colors.oak,
    backgroundColor: Colors.forestDark,
  },
  feedbackTypeEmoji: { fontSize: 20, marginBottom: 4 },
  feedbackTypeLabel: { fontSize: 11, fontWeight: '600', color: Colors.textMuted },
  feedbackTypeLabelActive: { color: Colors.tan },
  feedbackInput: {
    backgroundColor: Colors.surfaceElevated,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.mud,
    padding: 12,
    fontSize: 14,
    color: Colors.textPrimary,
    minHeight: 100,
    marginBottom: 16,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 10,
  },
  modalCancelButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: Colors.surfaceElevated,
    alignItems: 'center',
  },
  modalCancelText: { fontSize: 14, fontWeight: '600', color: Colors.textSecondary },
  modalSubmitButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: Colors.moss,
    alignItems: 'center',
  },
  modalSubmitText: { fontSize: 14, fontWeight: '700', color: Colors.textOnAccent },

  // ── Thank-you state ──
  thankYouContainer: { alignItems: 'center', paddingVertical: 30 },
  thankYouEmoji: { fontSize: 40, marginBottom: 12 },
  thankYouTitle: { fontSize: 18, fontWeight: '800', color: Colors.textPrimary, marginBottom: 6 },
  thankYouText: { fontSize: 13, color: Colors.textSecondary, textAlign: 'center' },
});
