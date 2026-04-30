/**
 * @file FishRegulationsScreen.tsx
 * @description Maryland fishing regulations with segmented view for seasons, "Can I Fish?" checker, and licenses.
 * Three tabs: "Seasons & Limits" | "Can I Fish?" | "Licenses"
 *
 * @module Screens
 * @version 1.0.0
 *
 * Key features:
 * - Seasons & Limits: All MD_FISHING_REGULATIONS as expandable species cards grouped by water type
 * - Can I Fish?: Dropdown selectors for species + water type + date → shows result
 * - Licenses: Show MD_FISHING_LICENSES as cards with fees, plus free fishing days banner
 * - Persistent disclaimer: "Always verify regulations with Maryland DNR"
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  FlatList,
  Modal,
  Linking,
} from 'react-native';
import Colors from '../theme/colors';
import ActivityDisclaimer from '../components/common/ActivityDisclaimer';
import { MD_FISHING_REGULATIONS, MD_FISHING_LICENSES, FishingRegulation, FishingLicense } from '../data/marylandFishingRegs';

type FishTab = 'seasons' | 'canIFish' | 'licenses' | 'crabbing' | 'boating';

// ── Maryland Crabbing Regulations (2026 season) ──
const MD_CRABBING_REGS = [
  { title: 'Recreational Crabbing License', detail: 'Required for all crabbers 16+. $5 resident / $10 nonresident.' },
  { title: 'Blue Crab — Trotline/Net', detail: 'Season: April 1 – Dec 15. Male hard crabs 5" min. Female hard crabs must be returned. Daily limit: 1 bushel/person, 2 bushels/boat.' },
  { title: 'Blue Crab — Chicken Necking', detail: 'Open year-round in tidal waters. 2 dozen/person/day. No license required for hand lines with bait.' },
  { title: 'Soft Shell Crabs', detail: 'Must be 3.5" min point-to-point. Season: May 1 – Sept 30. Daily limit: 2 dozen.' },
  { title: 'Female Crabs (Sooks)', detail: 'Must be returned to water immediately. Taking egg-bearing (sponge) crabs prohibited year-round.' },
  { title: 'Crab Pots', detail: 'Recreational: 2 pots max per person. Must be marked with name/address. Check every 72 hours. Remove by Dec 15.' },
  { title: 'Restricted Areas', detail: 'Crabbing prohibited in MD/VA shared waters south of Smith Island during spawning season (June–Sept).' },
  { title: 'Sunday Crabbing', detail: 'Recreational crabbing allowed on Sundays statewide.' },
];

// ── Maryland Boating Regulations ──
const MD_BOATING_REGS = [
  { title: 'Vessel Registration', detail: 'All motorized vessels must be registered with MD DNR. Registration valid for 3 years.' },
  { title: 'Boating Safety Certificate', detail: 'Required for all boat operators born after July 1, 1972. Free online course at boat-ed.com/maryland.' },
  { title: 'Life Jackets (PFDs)', detail: 'One USCG-approved PFD per person on board. Children under 13 must wear PFDs at all times on vessels under 21 ft.' },
  { title: 'Speed Limits', detail: '6 knots within 100 yards of shore, pier, or anchored vessel. No-wake zones marked by buoys.' },
  { title: 'Navigation Lights', detail: 'Required from sunset to sunrise and during reduced visibility. All vessels must display proper running lights.' },
  { title: 'Alcohol / BUI', detail: 'Operating a vessel under the influence is illegal. BAC limit: 0.08%. MD Natural Resources Police enforce.' },
  { title: 'Fire Extinguishers', detail: 'Required on all motorized vessels with enclosed fuel compartments or living spaces. Check expiration annually.' },
  { title: 'Kayak / Canoe Rules', detail: 'Non-motorized vessels exempt from registration. PFDs required on board. Sound-producing device required on waters over 2 miles wide.' },
  { title: 'Towing / Waterskiing', detail: 'Observer or wide-angle mirror required. Prohibited from sunset to sunrise. No towing within 100 yards of docks.' },
  { title: 'Pump-Out Stations', detail: 'Discharge of untreated sewage prohibited in MD waters. Free pump-out stations at most marinas.' },
];

// Get unique species by water type
const getSpeciesByWaterType = (waterType: 'tidal' | 'nontidal'): string[] => {
  const species = new Set<string>();
  MD_FISHING_REGULATIONS.forEach((reg) => {
    if (reg.waterType === waterType || reg.waterType === 'both') {
      species.add(reg.species);
    }
  });
  return Array.from(species).sort();
};

// Get unique water types available for a species
const getWaterTypesForSpecies = (species: string): ('tidal' | 'nontidal')[] => {
  const waterTypes = new Set<'tidal' | 'nontidal'>();
  MD_FISHING_REGULATIONS.forEach((reg) => {
    if (reg.species === species) {
      if (reg.waterType === 'both') {
        waterTypes.add('tidal');
        waterTypes.add('nontidal');
      } else {
        waterTypes.add(reg.waterType);
      }
    }
  });
  return Array.from(waterTypes);
};

// Get regulation for species + water type
const getRegulationForSpeciesAndWater = (
  species: string,
  waterType: 'tidal' | 'nontidal'
): FishingRegulation | undefined => {
  return MD_FISHING_REGULATIONS.find(
    (reg) =>
      reg.species === species &&
      (reg.waterType === waterType || reg.waterType === 'both')
  );
};

export default function FishRegulationsScreen() {
  const [activeTab, setActiveTab] = useState<FishTab>('seasons');
  const [expandedSpecies, setExpandedSpecies] = useState<Set<string>>(new Set());

  // Can I Fish form
  const [fishSpecies, setFishSpecies] = useState('');
  const [fishWaterType, setFishWaterType] = useState<'tidal' | 'nontidal' | ''>('');
  const [fishResult, setFishResult] = useState<{ allowed: boolean; reason: string } | null>(null);

  // Dropdown visibility
  const [showSpeciesDropdown, setShowSpeciesDropdown] = useState(false);
  const [showWaterDropdown, setShowWaterDropdown] = useState(false);

  const toggleExpandedSpecies = (species: string) => {
    const newSet = new Set(expandedSpecies);
    if (newSet.has(species)) {
      newSet.delete(species);
    } else {
      newSet.add(species);
    }
    setExpandedSpecies(newSet);
  };

  const handleCanIFish = () => {
    if (!fishSpecies || !fishWaterType) {
      Alert.alert('Missing Fields', 'Please select species and water type.');
      return;
    }

    const reg = getRegulationForSpeciesAndWater(fishSpecies, fishWaterType as 'tidal' | 'nontidal');
    if (!reg) {
      setFishResult({
        allowed: false,
        reason: `No regulations found for ${fishSpecies} in ${fishWaterType} waters.`,
      });
      return;
    }

    setFishResult({
      allowed: true,
      reason: `${fishSpecies} in ${fishWaterType} waters: ${reg.season}. Daily limit: ${reg.dailyCreel}${
        reg.minSize ? `. Min size: ${reg.minSize}` : ''
      }.`,
    });
  };

  const renderSeasonsTab = () => (
    <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
      {/* Tidal Species */}
      <View style={styles.sectionContainer}>
        <Text style={styles.sectionHeader}>Tidal Waters (Chesapeake Bay & Coastal)</Text>
        {getSpeciesByWaterType('tidal').map((species) => {
          const reg = getRegulationForSpeciesAndWater(species, 'tidal');
          const isExpanded = expandedSpecies.has(species);
          if (!reg) return null;
          return (
            <TouchableOpacity
              key={species}
              style={styles.speciesCard}
              onPress={() => toggleExpandedSpecies(species)}
              activeOpacity={0.7}
            >
              <View style={styles.speciesHeader}>
                <Text style={styles.speciesName}>{species}</Text>
                <Text style={styles.expandIcon}>{isExpanded ? '▼' : '▶'}</Text>
              </View>
              {isExpanded && (
                <View style={styles.speciesDetails}>
                  <Text style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Season: </Text>
                    <Text style={styles.detailValue}>{reg.season}</Text>
                  </Text>
                  <Text style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Daily Limit: </Text>
                    <Text style={styles.detailValue}>{reg.dailyCreel}</Text>
                  </Text>
                  {reg.minSize && (
                    <Text style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Min Size: </Text>
                      <Text style={styles.detailValue}>{reg.minSize}</Text>
                    </Text>
                  )}
                  {reg.maxSize && (
                    <Text style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Max Size: </Text>
                      <Text style={styles.detailValue}>{reg.maxSize}</Text>
                    </Text>
                  )}
                  {reg.gearRestrictions && (
                    <Text style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Gear: </Text>
                      <Text style={styles.detailValue}>{reg.gearRestrictions}</Text>
                    </Text>
                  )}
                  {reg.specialNotes && (
                    <Text style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Notes: </Text>
                      <Text style={styles.detailValue}>{reg.specialNotes}</Text>
                    </Text>
                  )}
                </View>
              )}
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Nontidal Species */}
      <View style={styles.sectionContainer}>
        <Text style={styles.sectionHeader}>Nontidal Waters (Freshwater)</Text>
        {getSpeciesByWaterType('nontidal').map((species) => {
          const reg = getRegulationForSpeciesAndWater(species, 'nontidal');
          const isExpanded = expandedSpecies.has(species);
          if (!reg) return null;
          return (
            <TouchableOpacity
              key={species}
              style={styles.speciesCard}
              onPress={() => toggleExpandedSpecies(species)}
              activeOpacity={0.7}
            >
              <View style={styles.speciesHeader}>
                <Text style={styles.speciesName}>{species}</Text>
                <Text style={styles.expandIcon}>{isExpanded ? '▼' : '▶'}</Text>
              </View>
              {isExpanded && (
                <View style={styles.speciesDetails}>
                  <Text style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Season: </Text>
                    <Text style={styles.detailValue}>{reg.season}</Text>
                  </Text>
                  <Text style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Daily Limit: </Text>
                    <Text style={styles.detailValue}>{reg.dailyCreel}</Text>
                  </Text>
                  {reg.minSize && (
                    <Text style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Min Size: </Text>
                      <Text style={styles.detailValue}>{reg.minSize}</Text>
                    </Text>
                  )}
                  {reg.maxSize && (
                    <Text style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Max Size: </Text>
                      <Text style={styles.detailValue}>{reg.maxSize}</Text>
                    </Text>
                  )}
                  {reg.gearRestrictions && (
                    <Text style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Gear: </Text>
                      <Text style={styles.detailValue}>{reg.gearRestrictions}</Text>
                    </Text>
                  )}
                  {reg.specialNotes && (
                    <Text style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Notes: </Text>
                      <Text style={styles.detailValue}>{reg.specialNotes}</Text>
                    </Text>
                  )}
                </View>
              )}
            </TouchableOpacity>
          );
        })}
      </View>

      <View style={styles.disclaimerContainer}>
        <Text style={styles.disclaimerText}>Always verify regulations with Maryland DNR</Text>
      </View>
    </ScrollView>
  );

  const renderCanIFishTab = () => (
    <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
      <View style={styles.formContainer}>
        <Text style={styles.formTitle}>Can I Fish?</Text>

        {/* Species Selector */}
        <View style={styles.formSection}>
          <Text style={styles.formLabel}>Species</Text>
          <TouchableOpacity
            style={styles.dropdownButton}
            onPress={() => setShowSpeciesDropdown(!showSpeciesDropdown)}
            activeOpacity={0.7}
          >
            <Text style={[styles.dropdownText, !fishSpecies && styles.placeholderText]}>
              {fishSpecies || 'Select species'}
            </Text>
            <Text style={styles.dropdownIcon}>▼</Text>
          </TouchableOpacity>
          {showSpeciesDropdown && (
            <View style={styles.dropdownMenu}>
              <FlatList
                data={Array.from(new Set(MD_FISHING_REGULATIONS.map((r) => r.species))).sort()}
                keyExtractor={(item) => item}
                scrollEnabled={false}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={styles.dropdownItem}
                    onPress={() => {
                      setFishSpecies(item);
                      setFishWaterType('');
                      setShowSpeciesDropdown(false);
                    }}
                  >
                    <Text style={styles.dropdownItemText}>{item}</Text>
                  </TouchableOpacity>
                )}
              />
            </View>
          )}
        </View>

        {/* Water Type Selector */}
        {fishSpecies && (
          <View style={styles.formSection}>
            <Text style={styles.formLabel}>Water Type</Text>
            <TouchableOpacity
              style={styles.dropdownButton}
              onPress={() => setShowWaterDropdown(!showWaterDropdown)}
              activeOpacity={0.7}
            >
              <Text style={[styles.dropdownText, !fishWaterType && styles.placeholderText]}>
                {fishWaterType ? (fishWaterType === 'tidal' ? 'Tidal (Chesapeake Bay)' : 'Nontidal (Freshwater)') : 'Select water type'}
              </Text>
              <Text style={styles.dropdownIcon}>▼</Text>
            </TouchableOpacity>
            {showWaterDropdown && (
              <View style={styles.dropdownMenu}>
                {getWaterTypesForSpecies(fishSpecies).map((wt) => (
                  <TouchableOpacity
                    key={wt}
                    style={styles.dropdownItem}
                    onPress={() => {
                      setFishWaterType(wt);
                      setShowWaterDropdown(false);
                    }}
                  >
                    <Text style={styles.dropdownItemText}>
                      {wt === 'tidal' ? 'Tidal (Chesapeake Bay)' : 'Nontidal (Freshwater)'}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>
        )}

        {/* Check Button */}
        <TouchableOpacity
          style={[styles.checkButton, (!fishSpecies || !fishWaterType) && styles.checkButtonDisabled]}
          onPress={handleCanIFish}
          disabled={!fishSpecies || !fishWaterType}
          activeOpacity={0.7}
        >
          <Text style={styles.checkButtonText}>Check Regulations</Text>
        </TouchableOpacity>

        {/* Result */}
        {fishResult && (
          <View style={[styles.resultCard, fishResult.allowed ? styles.resultAllowed : styles.resultNotAllowed]}>
            <Text style={styles.resultText}>{fishResult.reason}</Text>
          </View>
        )}

        <View style={styles.disclaimerContainer}>
          <Text style={styles.disclaimerText}>Always verify regulations with Maryland DNR</Text>
        </View>
      </View>
    </ScrollView>
  );

  const renderLicensesTab = () => (
    <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
      {/* Free Fishing Days Banner */}
      <View style={styles.freeFishingBanner}>
        <Text style={styles.freeFishingIcon}>🎣</Text>
        <View style={styles.freeFishingContent}>
          <Text style={styles.freeFishingTitle}>Free Fishing Days</Text>
          <Text style={styles.freeFishingText}>
            Fish for free on selected weekends throughout the year without a license. Check MD DNR calendar for dates.
          </Text>
        </View>
      </View>

      {/* License Cards */}
      <View style={styles.licenseContainer}>
        {MD_FISHING_LICENSES.map((license, idx) => (
          <View key={idx} style={styles.licenseCard}>
            <View style={styles.licenseName}>
              <Text style={styles.licenseTitle}>{license.name}</Text>
              <Text style={styles.licenseType}>{license.type}</Text>
            </View>
            <Text style={styles.licenseFee}>{license.fee}</Text>
            <Text style={styles.licenseValidity}>{license.validity}</Text>
            <Text style={styles.licenseNotes}>{license.notes}</Text>
          </View>
        ))}
      </View>

      {/* Buy License Button */}
      <TouchableOpacity
        style={styles.buyLicenseButton}
        onPress={() => Linking.openURL('https://compass.dnr.maryland.gov/')}
        activeOpacity={0.7}
      >
        <Text style={styles.buyLicenseText}>Buy License (Compass DNR)</Text>
      </TouchableOpacity>

      <View style={styles.disclaimerContainer}>
        <Text style={styles.disclaimerText}>Always verify regulations with Maryland DNR</Text>
      </View>
    </ScrollView>
  );

  return (
    <View style={styles.container}>
      {/* Tab Bar — scrollable for 5 tabs */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabBar} contentContainerStyle={styles.tabBarContent}>
        {([
          { key: 'seasons' as FishTab, label: '\uD83D\uDC1F Fishing' },
          { key: 'canIFish' as FishTab, label: '\u2753 Can I Fish?' },
          { key: 'crabbing' as FishTab, label: '\uD83E\uDD80 Crabbing' },
          { key: 'boating' as FishTab, label: '\u26F5 Boating' },
          { key: 'licenses' as FishTab, label: '\uD83D\uDCB3 Licenses' },
        ]).map(({ key, label }) => (
          <TouchableOpacity
            key={key}
            style={[styles.tab, activeTab === key && styles.tabActive]}
            onPress={() => setActiveTab(key)}
            activeOpacity={0.7}
          >
            <Text style={[styles.tabText, activeTab === key && styles.tabTextActive]}>
              {label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Content */}
      {activeTab === 'seasons' && renderSeasonsTab()}
      {activeTab === 'canIFish' && renderCanIFishTab()}
      {activeTab === 'licenses' && renderLicensesTab()}

      {/* Crabbing Regulations */}
      {activeTab === 'crabbing' && (
        <ScrollView style={styles.content} contentContainerStyle={styles.regScrollContent}>
          <Text style={styles.regSectionHeader}>{'\uD83E\uDD80'} Maryland Crabbing Regulations</Text>
          <Text style={styles.regSectionSubheader}>2026 Season · Always verify with MD DNR</Text>
          {MD_CRABBING_REGS.map((reg, idx) => (
            <View key={idx} style={styles.regCard}>
              <Text style={styles.regTitle}>{reg.title}</Text>
              <Text style={styles.regDetail}>{reg.detail}</Text>
            </View>
          ))}
          <TouchableOpacity
            style={styles.drnLinkBtn}
            onPress={() => Linking.openURL('https://dnr.maryland.gov/fisheries/pages/crabs/index.aspx')}
          >
            <Text style={styles.drnLinkText}>View Full DNR Crabbing Regs {'\u2192'}</Text>
          </TouchableOpacity>
        </ScrollView>
      )}

      {/* Boating Regulations */}
      {activeTab === 'boating' && (
        <ScrollView style={styles.content} contentContainerStyle={styles.regScrollContent}>
          <Text style={styles.regSectionHeader}>{'\u26F5'} Maryland Boating Regulations</Text>
          <Text style={styles.regSectionSubheader}>MD Natural Resources Police · Always verify with MD DNR</Text>
          {MD_BOATING_REGS.map((reg, idx) => (
            <View key={idx} style={styles.regCard}>
              <Text style={styles.regTitle}>{reg.title}</Text>
              <Text style={styles.regDetail}>{reg.detail}</Text>
            </View>
          ))}
          <TouchableOpacity
            style={styles.drnLinkBtn}
            onPress={() => Linking.openURL('https://dnr.maryland.gov/boating/pages/index.aspx')}
          >
            <Text style={styles.drnLinkText}>View Full DNR Boating Regs {'\u2192'}</Text>
          </TouchableOpacity>
        </ScrollView>
      )}

      {/* Persistent disclaimer footer */}
      <ActivityDisclaimer mode="fish" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  tabBar: {
    maxHeight: 48,
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.mud,
  },
  tabBarContent: {
    flexDirection: 'row',
    alignItems: 'stretch',
  },
  tab: {
    paddingVertical: 12,
    paddingHorizontal: 14,
    alignItems: 'center',
    borderBottomWidth: 3,
    borderBottomColor: Colors.surface,
  },
  tabActive: {
    borderBottomColor: Colors.water,
  },
  tabText: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.textMuted,
  },
  tabTextActive: {
    color: Colors.water,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  sectionContainer: {
    marginBottom: 20,
  },
  sectionHeader: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.water,
    marginBottom: 12,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: Colors.mud,
  },
  speciesCard: {
    backgroundColor: Colors.surface,
    borderRadius: 10,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: Colors.mud,
    overflow: 'hidden',
  },
  speciesHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 14,
    backgroundColor: Colors.surface,
  },
  speciesName: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.textPrimary,
    flex: 1,
  },
  expandIcon: {
    fontSize: 12,
    color: Colors.textMuted,
  },
  speciesDetails: {
    backgroundColor: Colors.background,
    paddingHorizontal: 14,
    paddingBottom: 14,
    borderTopWidth: 1,
    borderTopColor: Colors.mud,
  },
  detailRow: {
    marginTop: 8,
    fontSize: 13,
    lineHeight: 18,
    color: Colors.textPrimary,
  },
  detailLabel: {
    fontWeight: '700',
    color: Colors.water,
  },
  detailValue: {
    color: Colors.textSecondary,
  },
  formContainer: {
    padding: 16,
  },
  formTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.water,
    marginBottom: 20,
  },
  formSection: {
    marginBottom: 16,
  },
  formLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginBottom: 8,
  },
  dropdownButton: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.mud,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dropdownText: {
    fontSize: 14,
    color: Colors.textPrimary,
    flex: 1,
  },
  placeholderText: {
    color: Colors.textMuted,
  },
  dropdownIcon: {
    fontSize: 12,
    color: Colors.textMuted,
    marginLeft: 8,
  },
  dropdownMenu: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.mud,
    borderRadius: 8,
    marginTop: 4,
    maxHeight: 200,
    overflow: 'hidden',
  },
  dropdownItem: {
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.mud,
  },
  dropdownItemText: {
    fontSize: 14,
    color: Colors.textPrimary,
  },
  checkButton: {
    backgroundColor: Colors.water,
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 16,
  },
  checkButtonDisabled: {
    backgroundColor: Colors.mud,
    opacity: 0.5,
  },
  checkButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.textOnAccent,
  },
  resultCard: {
    borderRadius: 8,
    padding: 14,
    marginBottom: 16,
  },
  resultAllowed: {
    backgroundColor: Colors.moss,
    borderWidth: 1,
    borderColor: Colors.moss,
  },
  resultNotAllowed: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.blood,
  },
  resultText: {
    fontSize: 14,
    color: Colors.textPrimary,
    lineHeight: 20,
  },
  licenseContainer: {
    marginTop: 16,
  },
  licenseCard: {
    backgroundColor: Colors.surface,
    borderRadius: 10,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: Colors.mud,
  },
  licenseName: {
    marginBottom: 10,
  },
  licenseTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  licenseType: {
    fontSize: 12,
    color: Colors.textMuted,
    marginTop: 2,
  },
  licenseFee: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.water,
    marginBottom: 6,
  },
  licenseValidity: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginBottom: 6,
  },
  licenseNotes: {
    fontSize: 12,
    color: Colors.textSecondary,
    lineHeight: 16,
  },
  freeFishingBanner: {
    backgroundColor: Colors.surface,
    borderRadius: 10,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: Colors.mud,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  freeFishingIcon: {
    fontSize: 28,
  },
  freeFishingContent: {
    flex: 1,
  },
  freeFishingTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.water,
    marginBottom: 4,
  },
  freeFishingText: {
    fontSize: 13,
    color: Colors.textSecondary,
    lineHeight: 18,
  },
  buyLicenseButton: {
    backgroundColor: Colors.water,
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 16,
    marginBottom: 16,
  },
  buyLicenseText: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.textOnAccent,
  },
  disclaimerContainer: {
    backgroundColor: Colors.surface,
    borderRadius: 8,
    padding: 12,
    marginTop: 16,
    marginBottom: 12,
    borderLeftWidth: 3,
    borderLeftColor: Colors.blood,
  },
  disclaimerText: {
    fontSize: 12,
    color: Colors.textSecondary,
    lineHeight: 16,
    fontStyle: 'italic',
  },

  // ── Crabbing / Boating shared styles ──
  regScrollContent: {
    paddingBottom: 80,
  },
  regSectionHeader: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginBottom: 4,
  },
  regSectionSubheader: {
    fontSize: 11,
    color: Colors.textMuted,
    marginBottom: 14,
  },
  regCard: {
    backgroundColor: Colors.surface,
    borderRadius: 10,
    padding: 14,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: Colors.mud,
  },
  regTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.tan,
    marginBottom: 4,
  },
  regDetail: {
    fontSize: 12,
    color: Colors.textSecondary,
    lineHeight: 17,
  },
  drnLinkBtn: {
    marginTop: 12,
    paddingVertical: 12,
    alignItems: 'center',
    backgroundColor: Colors.water,
    borderRadius: 10,
  },
  drnLinkText: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.textOnAccent,
  },
});
