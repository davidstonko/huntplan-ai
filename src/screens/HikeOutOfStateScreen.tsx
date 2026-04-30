/**
 * @file HikeOutOfStateScreen.tsx
 * @description Comprehensive guide for out-of-state hikers visiting Maryland's Appalachian Trail.
 * Covers getting started, parking, trail rules, Four States Challenge, water/safety, day hikes, and contacts.
 *
 * @module Screens
 * @version 1.0.0
 *
 * Key features:
 * - Collapsible sections with detailed hiking information
 * - External links to ATC, PATC, MD DNR, and trail resources
 * - Key contact information for trail conditions and emergencies
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
    icon: '🥾',
    content:
      'Maryland\'s Appalachian Trail section spans 40.9 miles from Harpers Ferry, WV to Pen Mar Park at the PA border, traversing the scenic South Mountain ridgeline. No permits are required for day hiking. Overnight camping is allowed only at designated shelters and campsites. The trail is well-marked and maintained by the Potomac Appalachian Trail Club (PATC).',
    links: [
      { label: 'ATC Maryland Section', url: 'https://appalachiantrail.org/experience/hike-the-trail/explore-by-state/maryland/' },
      { label: 'MD DNR AT Page', url: 'https://dnr.maryland.gov/publiclands/pages/at.aspx' },
    ],
  },
  {
    id: 'access-parking',
    title: 'Access & Parking',
    icon: '🅿️',
    content:
      'Ten trailheads provide access along the Maryland AT. The most popular are: Washington Monument State Park (50 spaces), US Route 40 at Greenbrier (50 spaces), and Annapolis Rock (50 spaces — fills quickly on weekends). Southern access via Harpers Ferry, WV on US 340. Northern terminus at Pen Mar Park (40 spaces). Most locations have no parking fees except Washington Monument SP. Arrive early on weekends to secure parking.',
    links: [
      { label: 'PATC Trailheads Map', url: 'https://www.patc.net/' },
      { label: 'Washington Monument SP', url: 'https://dnr.maryland.gov/publiclands/pages/south-mountain.aspx' },
    ],
  },
  {
    id: 'trail-rules',
    title: 'Trail Rules',
    icon: '⚖️',
    content:
      'Overnight camping is permitted only at designated shelters and campsites (9 total). Maximum group size is 10 people. Fires are allowed only in established fire rings. Practice Leave No Trace principles: pack out all trash, use established sites, and camp away from water sources. Dogs are allowed on leash. Hunting is prohibited within South Mountain State Park. Observe quiet hours from dusk to dawn.',
    links: [
      { label: 'ATC Leave No Trace', url: 'https://appalachiantrail.org/experience/plan-and-prepare/leave-no-trace/' },
      { label: 'Shelter Rules & Maps', url: 'https://www.patc.net/' },
    ],
  },
  {
    id: 'four-states-challenge',
    title: 'Four States Challenge',
    icon: '🏆',
    content:
      'The Four States Challenge is a popular ultra-hike covering 43.5 miles through Virginia, West Virginia, Maryland, and Pennsylvania in 24 hours. Start at the VA/WV border and finish at Pen Mar Park. Requires a car shuttle or support crew. Best attempted May through October. Not recommended for beginners or solo hikers. Many experienced ultrarunners attempt this classic challenge.',
    links: [
      { label: 'FKT Records — Four State Challenge', url: 'https://fastestknowntime.com/route/four-state-challenge-pa-md-wv-va' },
      { label: 'The Trek — Four State Challenge Guide', url: 'https://thetrek.co/appalachian-trail/the-four-state-challenge/' },
    ],
  },
  {
    id: 'water-safety',
    title: 'Water & Safety',
    icon: '💧',
    content:
      'Water sources are available at most shelters via springs. Always filter or treat water before drinking. Cell service is spotty on the ridgeline — plan accordingly. Ticks are prevalent March through November; check yourself daily and apply tick prevention. Black bears are present in the region; hang food securely or use a bear canister. Terrain is rocky; sturdy hiking boots are essential. Lightning exposure is high on the open ridgeline during thunderstorms.',
    links: [
      { label: 'NOAA Weather — Western Maryland', url: 'https://forecast.weather.gov/MapClick.php?lat=39.5&lon=-77.6' },
      { label: 'Tick Prevention Guide', url: 'https://dnr.maryland.gov/wildlife/Pages/index.aspx' },
    ],
  },
  {
    id: 'day-hikes',
    title: 'Best Day Hikes',
    icon: '🌄',
    content:
      'Maryland AT offers outstanding day hikes. Weverton Cliffs (2 mi RT, easy): stunning Potomac River views. Annapolis Rock (5 mi RT, moderate): iconic vista point and popular turnaround. Washington Monument Tower (2 mi RT, easy): historic 34-meter tower with panoramic views. High Rock (1 mi RT, easy): highest point at 1,905 ft. Black Rock Cliffs (6 mi RT, moderate): dramatic rock formations and scenic vistas.',
    links: [
      { label: 'AllTrails — Maryland AT Hikes', url: 'https://www.alltrails.com/us/maryland' },
      { label: 'Hiking Project — Maryland Trails', url: 'https://www.hikingproject.com/directory/8008069/maryland' },
    ],
  },
  {
    id: 'key-contacts',
    title: 'Key Contacts',
    icon: '📞',
    content:
      'Appalachian Trail Conservancy (ATC): 304-535-6331 — trail conditions and general AT info. Potomac Appalachian Trail Club (PATC): 703-242-0315 — shelter maintenance and detailed MD AT support. Maryland DNR: 877-620-8367 — park regulations and emergency services. South Mountain State Park: 301-791-4767 — local conditions and facilities. In emergencies, call 911 and provide your nearest shelter name or road crossing.',
    links: [
      { label: 'ATC Contact & Resources', url: 'https://appalachiantrail.org/about-us/contact/' },
      { label: 'PATC Headquarters', url: 'https://www.patc.net/' },
      { label: 'MD DNR Main Office', url: 'https://dnr.maryland.gov/Pages/index.aspx' },
    ],
  },
];

export default function HikeOutOfStateScreen() {
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
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <View style={styles.header}>
        <Text style={styles.headerIcon}>🏔️</Text>
        <Text style={styles.headerTitle}>Hiking Maryland's AT — Visitor Guide</Text>
        <Text style={styles.headerSubtitle}>40.9 miles of the Appalachian Trail</Text>
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
            Start early to beat crowds, especially on weekends. Bring a detailed shelter map and water purification.
            Spring (April-May) and fall (September-October) offer ideal hiking conditions. Check trail conditions
            before departure.
          </Text>
        </View>
      </View>

      <View style={styles.disclaimerContainer}>
        <Text style={styles.disclaimerText}>
          Always verify trail conditions with Maryland DNR and the Appalachian Trail Conservancy
        </Text>
      </View>
    </ScrollView>
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
    color: Colors.info,
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
    color: Colors.info,
    flex: 1,
  },
  sectionLinkArrow: {
    fontSize: 14,
    color: Colors.info,
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
    color: Colors.info,
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
