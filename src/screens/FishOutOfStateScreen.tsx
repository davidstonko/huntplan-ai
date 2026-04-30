/**
 * @file FishOutOfStateScreen.tsx
 * @description Curated guide for nonresident anglers visiting Maryland.
 * Covers licensing, reciprocal agreements, seasons, public access, boat ramps, and key contacts.
 *
 * @module Screens
 * @version 1.0.0
 *
 * Key features:
 * - Collapsible sections with detailed information
 * - External links for license purchase, guides, regulations
 * - Key contacts for Maryland DNR Fisheries
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Linking,
  Alert,
} from 'react-native';
import Colors from '../theme/colors';
import ActivityDisclaimer from '../components/common/ActivityDisclaimer';

interface OutOfStateSection {
  id: string;
  title: string;
  icon: string;
  content: string;
  links?: Array<{
    label: string;
    url: string;
  }>;
}

const SECTIONS: OutOfStateSection[] = [
  {
    id: 'getting-started',
    title: 'Getting Started',
    icon: '🏁',
    content:
      'Welcome to Maryland! Nonresident anglers need a fishing license to fish in Maryland waters. Licenses can be purchased online 24/7 through Compass DNR. You do not need a hunting license to fish.',
    links: [
      { label: 'Buy Nonresident License', url: 'https://compass.dnr.maryland.gov/' },
      { label: 'License Requirements', url: 'https://dnr.maryland.gov/fisheries/pages/licenses.aspx' },
    ],
  },
  {
    id: 'license-fees',
    title: 'Nonresident License Fees (2026)',
    icon: '💰',
    content:
      'Nonresident licenses are valid from the date of purchase through July 31 of the following year. Additional stamps and permits may be required for certain waters or species.',
    links: [
      { label: 'Nonresident License $85', url: 'https://compass.dnr.maryland.gov/' },
      { label: 'Senior 65+ $42.50', url: 'https://compass.dnr.maryland.gov/' },
      { label: 'Youth (7-15) $20', url: 'https://compass.dnr.maryland.gov/' },
      { label: '3-Day Temporary License $30', url: 'https://compass.dnr.maryland.gov/' },
      { label: 'All-Species Stamp $10', url: 'https://compass.dnr.maryland.gov/' },
    ],
  },
  {
    id: 'reciprocal-agreements',
    title: 'Reciprocal Agreements',
    icon: '🤝',
    content:
      'Maryland has reciprocal fishing agreements with several neighboring states. Check the list to see if your home state has reciprocity. Out-of-state resident licenses from reciprocal states may be honored — verify before traveling.',
    links: [
      { label: 'Reciprocal States Info', url: 'https://dnr.maryland.gov/fisheries/pages/reciprocal.aspx' },
    ],
  },
  {
    id: 'seasons-regulations',
    title: 'Key Species & Seasons',
    icon: '🐟',
    content:
      'Maryland has year-round fishing for many species with specific size and creel limits. Striped bass has strict regulations including spawning season closures (March 1 - May 31). Trout fishing in freshwater streams runs March 1 - October 31 (put-and-take areas). Always verify current regulations before fishing.',
    links: [
      { label: 'Striped Bass Regs', url: 'https://dnr.maryland.gov/fisheries/pages/stripedBass.aspx' },
      { label: 'Trout Regulations', url: 'https://dnr.maryland.gov/fisheries/pages/trout.aspx' },
      { label: 'All Species Regulations', url: 'https://www.eregulations.com/maryland/fishing' },
    ],
  },
  {
    id: 'public-access',
    title: 'Public Fishing Access',
    icon: '📍',
    content:
      'Maryland offers 307+ public fishing access sites. Maps and guides are available online. Most locations have free parking and public facilities. Check access conditions before visiting.',
    links: [
      { label: 'Public Access Sites Map', url: 'https://dnr.maryland.gov/fisheries/pages/publicAccess.aspx' },
      { label: 'Boat Ramps & Access Guide', url: 'https://dnr.maryland.gov/boating/pages/water-access/boatramps.aspx' },
      { label: 'Angler Access Map (Interactive)', url: 'https://dnr.maryland.gov/fisheries/pages/AnglerAccessMap.aspx' },
    ],
  },
  {
    id: 'charter-fishing',
    title: 'Charter Fishing & Guides',
    icon: '⛵',
    content:
      'Professional charter operators and fishing guides operate throughout Maryland. Popular destinations include Ocean City (ocean charters), the Chesapeake Bay (striped bass, rockfish), and freshwater streams (trout, bass).',
    links: [
      { label: 'Charter Operator Directory', url: 'https://dnr.maryland.gov/fisheries/pages/charters.aspx' },
      { label: 'Fishing Guide Association', url: 'https://www.mdfishinguides.com/' },
    ],
  },
  {
    id: 'chesapeake-guide',
    title: 'Chesapeake Bay Fishing',
    icon: '🌊',
    content:
      'The Chesapeake Bay offers world-class fishing. Striped bass, bluefish, summer flounder, and spot are popular. Spring (March-May) and fall (September-November) are peak seasons. Tide and weather conditions significantly impact success.',
    links: [
      { label: 'Bay Fishing Guide', url: 'https://dnr.maryland.gov/fisheries/Documents/BayFishingGuide.pdf' },
      { label: 'Tides & Currents', url: 'https://api.tidesandcurrents.noaa.gov/' },
      { label: 'Weather Forecast', url: 'https://www.weather.gov/' },
    ],
  },
  {
    id: 'key-contacts',
    title: 'Key Contacts',
    icon: '📞',
    content:
      'Maryland DNR Fisheries Division provides information about licenses, regulations, access sites, and fishing conditions. Staff can answer questions about specific waters and species.',
    links: [
      { label: 'MD DNR Fisheries Main', url: 'https://dnr.maryland.gov/fisheries/Pages/index.aspx' },
      { label: 'Report Violations (TIP Line)', url: 'https://dnr.maryland.gov/wildlife/Pages/hunt_trap/TIPLINE.aspx' },
    ],
  },
];

export default function FishOutOfStateScreen() {
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());

  const toggleSection = (id: string) => {
    const newSet = new Set(expandedSections);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    setExpandedSections(newSet);
  };

  const handleLinkPress = (url: string, label: string) => {
    Linking.openURL(url).catch(() => {
      Alert.alert('Error', `Could not open ${label}`);
    });
  };

  return (
    <View style={{ flex: 1 }}>
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <View style={styles.header}>
        <Text style={styles.headerIcon}>🎣</Text>
        <Text style={styles.headerTitle}>Nonresident Fishing Guide</Text>
        <Text style={styles.headerSubtitle}>Everything you need to fish in Maryland</Text>
      </View>

      {SECTIONS.map((section) => {
        const isExpanded = expandedSections.has(section.id);
        return (
          <View key={section.id} style={styles.section}>
            <TouchableOpacity
              style={styles.sectionHeader}
              onPress={() => toggleSection(section.id)}
              activeOpacity={0.7}
            >
              <View style={styles.sectionTitle}>
                <Text style={styles.sectionIcon}>{section.icon}</Text>
                <Text style={styles.sectionName}>{section.title}</Text>
              </View>
              <Text style={styles.expandIcon}>{isExpanded ? '▼' : '▶'}</Text>
            </TouchableOpacity>

            {isExpanded && (
              <View style={styles.sectionContent}>
                <Text style={styles.sectionText}>{section.content}</Text>

                {section.links && section.links.length > 0 && (
                  <View style={styles.linksContainer}>
                    {section.links.map((link, idx) => (
                      <TouchableOpacity
                        key={idx}
                        style={styles.sectionLink}
                        onPress={() => handleLinkPress(link.url, link.label)}
                        activeOpacity={0.7}
                      >
                        <Text style={styles.sectionLinkText}>{link.label}</Text>
                        <Text style={styles.sectionLinkArrow}>→</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
              </View>
            )}
          </View>
        );
      })}

      <View style={styles.tipContainer}>
        <Text style={styles.tipIcon}>💡</Text>
        <View style={styles.tipContent}>
          <Text style={styles.tipTitle}>Pro Tips</Text>
          <Text style={styles.tipText}>
            Peak fishing seasons: Spring (March-May) for striped bass, Fall (September-November) for bluefish. Check
            stocking reports and tide predictions before planning your trip.
          </Text>
        </View>
      </View>

      <View style={styles.disclaimerContainer}>
        <Text style={styles.disclaimerText}>Always verify regulations with Maryland DNR before fishing</Text>
      </View>
    </ScrollView>
    <ActivityDisclaimer mode="fish" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    paddingHorizontal: 16,
    paddingVertical: 20,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: Colors.mud,
  },
  headerIcon: {
    fontSize: 48,
    marginBottom: 12,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: Colors.water,
    marginBottom: 6,
    textAlign: 'center',
  },
  headerSubtitle: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: 'center',
  },
  section: {
    marginHorizontal: 16,
    marginTop: 12,
    backgroundColor: Colors.surface,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.mud,
    overflow: 'hidden',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 14,
    backgroundColor: Colors.surface,
  },
  sectionTitle: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 10,
  },
  sectionIcon: {
    fontSize: 20,
  },
  sectionName: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  expandIcon: {
    fontSize: 12,
    color: Colors.textMuted,
  },
  sectionContent: {
    backgroundColor: Colors.background,
    paddingHorizontal: 14,
    paddingBottom: 14,
    borderTopWidth: 1,
    borderTopColor: Colors.mud,
  },
  sectionText: {
    fontSize: 13,
    color: Colors.textSecondary,
    lineHeight: 20,
    marginBottom: 12,
  },
  linksContainer: {
    gap: 8,
  },
  sectionLink: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: Colors.mud,
  },
  sectionLinkText: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.water,
    flex: 1,
  },
  sectionLinkArrow: {
    fontSize: 14,
    color: Colors.water,
  },
  tipContainer: {
    marginHorizontal: 16,
    marginTop: 20,
    backgroundColor: Colors.surface,
    borderRadius: 10,
    padding: 14,
    borderWidth: 1,
    borderColor: Colors.mud,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    marginBottom: 20,
  },
  tipIcon: {
    fontSize: 24,
  },
  tipContent: {
    flex: 1,
  },
  tipTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.water,
    marginBottom: 4,
  },
  tipText: {
    fontSize: 13,
    color: Colors.textSecondary,
    lineHeight: 18,
  },
  disclaimerContainer: {
    marginHorizontal: 16,
    backgroundColor: Colors.surface,
    borderRadius: 8,
    padding: 12,
    marginBottom: 20,
    borderLeftWidth: 3,
    borderLeftColor: Colors.blood,
  },
  disclaimerText: {
    fontSize: 12,
    color: Colors.textSecondary,
    lineHeight: 16,
    fontStyle: 'italic',
  },
});
