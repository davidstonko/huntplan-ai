/**
 * @file OutOfStateScreen.tsx
 * @description Curated resources and guide for out-of-state hunters visiting Maryland.
 * Covers licensing, hunter education reciprocity, public land access, season dates,
 * harvest reporting, Sunday hunting, outfitters, and key DNR contacts.
 *
 * @module Screens
 * @version 2.1.0
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

interface OutOfStateLink {
  id: string;
  title: string;
  description: string;
  url: string;
  icon: string;
  /** If true, this is an internal cross-reference (navigates within app) */
  internal?: boolean;
}

interface OutOfStateSection {
  name: string;
  icon: string;
  intro: string;
  links: OutOfStateLink[];
}

const OUT_OF_STATE_SECTIONS: OutOfStateSection[] = [
  {
    name: 'Getting Started',
    icon: '🏁',
    intro:
      'Welcome to Maryland! Here\'s everything you need to hunt in the Old Line State as a nonresident.',
    links: [
      {
        id: 'oos-md-outdoors',
        title: 'MD Outdoors License Portal',
        description:
          'Buy your nonresident hunting license, stamps, and permits online — 24/7',
        url: 'https://mdoutdoors.maryland.gov/',
        icon: '💳',
      },
      {
        id: 'oos-license-overview',
        title: 'Hunting License Requirements',
        description:
          'Full breakdown of license types, fees, and what you need to hunt in MD',
        url: 'https://dnr.maryland.gov/wildlife/pages/hunt_trap/huntinglicenses.aspx',
        icon: '📜',
      },
      {
        id: 'oos-dnr-service',
        title: 'DNR Licensing & Permits Page',
        description:
          'Official MD DNR page for hunting licenses, stamps, and permits',
        url: 'https://dnr.maryland.gov/pages/service_hunting_license.aspx',
        icon: '🏛️',
      },
    ],
  },
  {
    name: 'Nonresident License Fees',
    icon: '💰',
    intro:
      'Nonresident licenses are valid from date of purchase through July 31. Stamps for archery, muzzleloader, and waterfowl are additional.',
    links: [
      {
        id: 'oos-ereg-licenses',
        title: 'License Types & Fees (eRegulations)',
        description:
          'Nonresident Regular ($130+), Senior 65+ ($65), 3-Day Waterfowl & Small Game ($65), Apprentice ($40)',
        url: 'https://www.eregulations.com/maryland/hunting/hunting-licenses',
        icon: '📋',
      },
      {
        id: 'oos-huntpassport-cost',
        title: 'Nonresident Cost Breakdown',
        description:
          'Detailed fee table — stamps, deer tags, bonus antlered, sika, migratory bird, federal duck stamp',
        url: 'https://hunterpassport.com/tools/license-cost/non-resident/maryland/',
        icon: '🧾',
      },
    ],
  },
  {
    name: 'Hunter Education & Reciprocity',
    icon: '🎓',
    intro:
      'Maryland accepts hunter education certifications from all U.S. states that meet IHEA-USA standards. No need to retake the course.',
    links: [
      {
        id: 'oos-hunter-ed',
        title: 'Hunter Education — MD DNR',
        description:
          'Maryland recognizes your out-of-state hunter safety card if it meets IHEA-USA standards',
        url: 'https://dnr.maryland.gov/nrp/Pages/hunter_education.aspx',
        icon: '🎓',
      },
      {
        id: 'oos-apprentice',
        title: 'Apprentice License (No Hunter Ed Required)',
        description:
          'First-time hunters of any age can get a $40 apprentice license — no hunter ed needed',
        url: 'https://dnr.maryland.gov/huntersguide/Pages/apprenticelicense.aspx',
        icon: '👤',
      },
      {
        id: 'oos-hunter-ed-course',
        title: 'Take the MD Course Online',
        description:
          'If you need certification, complete the official Maryland hunter safety course',
        url: 'https://www.hunter-ed.com/maryland/',
        icon: '💻',
      },
    ],
  },
  {
    name: 'Seasons & Regulations',
    icon: '📅',
    intro:
      'Maryland\'s hunting seasons run Sep–Jan for most species. Regulations vary by county, weapon, and species.',
    links: [
      {
        id: 'oos-seasons-calendar',
        title: 'Hunting Seasons Calendar (PDF)',
        description:
          'Official one-page calendar of all Maryland hunting season dates',
        url: 'https://dnr.maryland.gov/huntersguide/Documents/Hunting_Seasons_Calendar.pdf',
        icon: '📅',
      },
      {
        id: 'oos-ereg-seasons',
        title: 'Full Seasons & Rules (eRegulations)',
        description:
          'Complete regulations by species — deer, turkey, waterfowl, bear, small game',
        url: 'https://www.eregulations.com/maryland/hunting',
        icon: '⚖️',
      },
      {
        id: 'oos-hunters-guide',
        title: 'Guide to Hunting & Trapping',
        description:
          'Comprehensive MD DNR guide with all species, bag limits, and restrictions',
        url: 'https://dnr.maryland.gov/huntersguide/Pages/default.aspx',
        icon: '📖',
      },
      {
        id: 'oos-all-species',
        title: 'All Species Info (DNR)',
        description:
          'Deer, turkey, waterfowl, bear, furbearer — species-by-species breakdown',
        url: 'https://dnr.maryland.gov/huntersguide/pages/allspecies.aspx',
        icon: '🦌',
      },
    ],
  },
  {
    name: 'Public Hunting Lands',
    icon: '🏞️',
    intro:
      'Maryland offers 192+ public hunting areas including WMAs, State Forests, and federal refuges. Our Map tab has all boundaries.',
    links: [
      {
        id: 'oos-public-lands',
        title: 'Public Hunting Lands (eRegulations)',
        description:
          'Searchable list of all Maryland public hunting lands with allowed species',
        url: 'https://www.eregulations.com/maryland/hunting/public-hunting-lands',
        icon: '🗺️',
      },
      {
        id: 'oos-wma-regions',
        title: 'WMA Maps by Region (DNR)',
        description:
          'Browse Wildlife Management Areas by Maryland region with maps and details',
        url: 'https://dnr.maryland.gov/wildlife/Pages/publiclands/allbyregion.aspx',
        icon: '📍',
      },
      {
        id: 'oos-western-md',
        title: 'Top Public Lands — Western MD',
        description:
          'Green Ridge SF (49,000 ac), Dan\'s Mountain WMA, Rocky Gap SP — best for visiting hunters',
        url: 'https://fishandhuntmaryland.com/articles/top-3-public-lands-hunt-deer-western-maryland',
        icon: '⛰️',
      },
      {
        id: 'oos-deer-trail',
        title: 'Maryland Deer Hunting Trail',
        description:
          'Curated trail of top deer hunting areas with lodging and outfitter info',
        url: 'https://fishandhuntmaryland.com/marylands-deer-hunting-trail',
        icon: '🦌',
      },
      {
        id: 'oos-free-permit',
        title: 'Free Public Hunting Permit Program (PDF)',
        description:
          'Some public lands require a free permit — check before you go',
        url: 'https://dnr.maryland.gov/wildlife/Documents/Free-Public-Hunting-Permit-Program.pdf',
        icon: '🎫',
      },
    ],
  },
  {
    name: 'Sunday Hunting',
    icon: '📆',
    intro:
      'Sunday hunting is allowed in 20 of 23 counties on specific dates, but rules vary by county and land type (private vs. public).',
    links: [
      {
        id: 'oos-sunday-rules',
        title: 'Sunday Hunting Rules (DNR)',
        description:
          'County-by-county breakdown of which Sundays allow hunting and on what land types',
        url: 'https://dnr.maryland.gov/wildlife/Pages/hunt_trap/sundayhunt.aspx',
        icon: '📖',
      },
      {
        id: 'oos-sunday-calendar',
        title: 'Sunday Deer Hunting Calendar (PDF)',
        description:
          'Visual calendar showing permitted Sunday deer hunting dates by county',
        url: 'https://dnr.maryland.gov/huntersguide/documents/sundaydeerhuntingcalendar.pdf',
        icon: '📅',
      },
    ],
  },
  {
    name: 'Harvest Check-In',
    icon: '✅',
    intro:
      'All deer and turkey harvests must be reported within 24 hours. You\'ll need a land code from where you harvested.',
    links: [
      {
        id: 'oos-deer-checkin',
        title: 'Deer & Turkey Check-In (DNR)',
        description:
          'Report your harvest online — you\'ll need a DNRid and land code',
        url: 'https://dnr.maryland.gov/wildlife/Pages/hunt_trap/mdcheckstation.aspx',
        icon: '✅',
      },
      {
        id: 'oos-tagging-rules',
        title: 'Tagging & Checking Rules (eRegulations)',
        description:
          'Field tag requirements, check-in methods, and 24-hour reporting deadline',
        url: 'https://www.eregulations.com/maryland/hunting/deer-turkey-tagging-checking',
        icon: '🏷️',
      },
    ],
  },
  {
    name: 'Outfitters & Lodging',
    icon: '🏕️',
    intro:
      'Maryland\'s Eastern Shore is renowned for waterfowl and whitetail. Several outfitters offer packages for visiting hunters.',
    links: [
      {
        id: 'oos-visit-md',
        title: '15 Top Hunting & Fishing Spots (VisitMaryland)',
        description:
          'Official tourism guide to Maryland\'s best hunting and fishing destinations',
        url: 'https://www.visitmaryland.org/list/15-top-places-to-go-hunting-and-fishing',
        icon: '🗺️',
      },
      {
        id: 'oos-fish-hunt-md',
        title: 'Fish & Hunt Maryland',
        description:
          'Tourism site with lodging, outfitter info, and area guides for hunters',
        url: 'https://fishandhuntmaryland.com/',
        icon: '🎣',
      },
      {
        id: 'oos-guidefitter',
        title: 'Maryland Outfitters (Guidefitter)',
        description:
          'Browse hunting outfitters and guides across Maryland — waterfowl, deer, turkey',
        url: 'https://www.guidefitter.com/hunting/united-states-maryland',
        icon: '🧭',
      },
    ],
  },
  {
    name: 'Key Contacts & Help',
    icon: '📞',
    intro:
      'Questions? Contact MD DNR Wildlife & Heritage Service or Natural Resources Police.',
    links: [
      {
        id: 'oos-dnr-wildlife',
        title: 'DNR Wildlife & Heritage Service',
        description:
          'Main office: (410) 260-8540 — questions about seasons, licenses, and regulations',
        url: 'https://dnr.maryland.gov/wildlife/Pages/default.aspx',
        icon: '🏛️',
      },
      {
        id: 'oos-nrp',
        title: 'Natural Resources Police (Report Violations)',
        description:
          'Report poaching or violations: 1-800-628-9944 (24-hour tip line)',
        url: 'https://dnr.maryland.gov/nrp/Pages/default.aspx',
        icon: '🚔',
      },
      {
        id: 'oos-dnr-news',
        title: 'DNR News & Announcements',
        description:
          'Latest hunting news, season updates, CWD alerts, and harvest reports',
        url: 'https://news.maryland.gov/dnr/',
        icon: '📢',
      },
    ],
  },
];

/**
 * OutOfStateScreen — Curated guide for nonresident hunters visiting Maryland.
 *
 * Organized into sections covering licensing, reciprocity, seasons, public lands,
 * Sunday hunting, harvest check-in, outfitters, and DNR contacts.
 * Each section has a brief intro paragraph followed by curated external links.
 *
 * @returns {JSX.Element} Scrollable list of out-of-state hunting resources
 */
export default function OutOfStateScreen() {
  const [expandedSections, setExpandedSections] = useState<Set<string>>(
    new Set(OUT_OF_STATE_SECTIONS.map((s) => s.name))
  );

  const toggleSection = (name: string) => {
    setExpandedSections((prev) => {
      const next = new Set(prev);
      if (next.has(name)) {
        next.delete(name);
      } else {
        next.add(name);
      }
      return next;
    });
  };

  const handleOpenURL = (url: string, title: string) => {
    Linking.openURL(url).catch(() => {
      Alert.alert('Error', `Could not open "${title}". Please try again.`);
    });
  };

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero Banner */}
        <View style={styles.heroBanner}>
          <Text style={styles.heroIcon}>{'🏹'}</Text>
          <Text style={styles.heroTitle}>Out-of-State Hunter Guide</Text>
          <Text style={styles.heroSubtitle}>
            Everything nonresident hunters need to know about hunting in Maryland
            — licensing, public lands, season dates, and more.
          </Text>
        </View>

        {/* Quick Facts Card */}
        <View style={styles.quickFactsCard}>
          <Text style={styles.quickFactsTitle}>{'⚡ Quick Facts'}</Text>
          <Text style={styles.quickFact}>
            {'• Nonresident license starts at $130 (ages 16+)'}
          </Text>
          <Text style={styles.quickFact}>
            {'• MD accepts hunter ed certs from all U.S. states'}
          </Text>
          <Text style={styles.quickFact}>
            {'• 192+ public hunting lands — no reservation needed for most'}
          </Text>
          <Text style={styles.quickFact}>
            {'• Deer & turkey harvests must be reported within 24 hours'}
          </Text>
          <Text style={styles.quickFact}>
            {'• Sunday hunting allowed in 20 of 23 counties (specific dates)'}
          </Text>
        </View>

        {/* Sections */}
        {OUT_OF_STATE_SECTIONS.map((section) => {
          const isExpanded = expandedSections.has(section.name);
          return (
            <View key={section.name} style={styles.section}>
              <TouchableOpacity
                style={styles.sectionHeader}
                onPress={() => toggleSection(section.name)}
                activeOpacity={0.7}
                accessibilityRole="button"
                accessibilityState={{ expanded: isExpanded }}
                accessibilityLabel={`${section.name} section`}
              >
                <View style={styles.sectionHeaderLeft}>
                  <Text style={styles.sectionIcon}>{section.icon}</Text>
                  <Text style={styles.sectionTitle}>{section.name}</Text>
                </View>
                <Text style={styles.chevron}>
                  {isExpanded ? '▼' : '▶'}
                </Text>
              </TouchableOpacity>

              {isExpanded && (
                <View style={styles.sectionBody}>
                  <Text style={styles.sectionIntro}>{section.intro}</Text>
                  {section.links.map((link) => (
                    <TouchableOpacity
                      key={link.id}
                      style={styles.linkCard}
                      onPress={() => handleOpenURL(link.url, link.title)}
                      activeOpacity={0.7}
                      accessibilityRole="link"
                      accessibilityLabel={link.title}
                      accessibilityHint={link.description}
                    >
                      <View style={styles.linkContent}>
                        <View style={styles.linkHeader}>
                          <Text style={styles.linkIcon}>{link.icon}</Text>
                          <Text style={styles.linkTitle}>{link.title}</Text>
                        </View>
                        <Text style={styles.linkDescription}>
                          {link.description}
                        </Text>
                      </View>
                      <Text style={styles.externalIcon}>{'↗'}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>
          );
        })}

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.disclaimerText}>
            Always verify regulations with Maryland DNR before heading out to
            hunt. Regulations change annually.
          </Text>
          <Text style={styles.footerLink}>dnr.maryland.gov</Text>
        </View>

        <View style={styles.bottomSpacer} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
  },
  heroBanner: {
    backgroundColor: Colors.forestDark,
    borderRadius: 14,
    padding: 20,
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: Colors.moss,
  },
  heroIcon: {
    fontSize: 36,
    marginBottom: 8,
  },
  heroTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.mdGold,
    textAlign: 'center',
    marginBottom: 8,
  },
  heroSubtitle: {
    fontSize: 13,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 19,
  },
  quickFactsCard: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    borderLeftWidth: 4,
    borderLeftColor: Colors.mdGold,
  },
  quickFactsTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.tan,
    marginBottom: 10,
  },
  quickFact: {
    fontSize: 13,
    color: Colors.textPrimary,
    lineHeight: 22,
  },
  section: {
    marginBottom: 12,
    backgroundColor: Colors.surface,
    borderRadius: 12,
    overflow: 'hidden',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 14,
  },
  sectionHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  sectionIcon: {
    fontSize: 20,
    marginRight: 10,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.moss,
    flex: 1,
  },
  chevron: {
    fontSize: 12,
    color: Colors.textMuted,
  },
  sectionBody: {
    paddingHorizontal: 14,
    paddingBottom: 14,
  },
  sectionIntro: {
    fontSize: 12,
    color: Colors.textSecondary,
    lineHeight: 18,
    marginBottom: 12,
    fontStyle: 'italic',
  },
  linkCard: {
    backgroundColor: Colors.surfaceElevated,
    borderRadius: 10,
    padding: 12,
    marginBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderLeftWidth: 3,
    borderLeftColor: Colors.oak,
  },
  linkContent: {
    flex: 1,
  },
  linkHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  linkIcon: {
    fontSize: 14,
    marginRight: 8,
  },
  linkTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.tan,
    flex: 1,
  },
  linkDescription: {
    fontSize: 11,
    color: Colors.textSecondary,
    lineHeight: 15,
    marginLeft: 22,
  },
  externalIcon: {
    fontSize: 14,
    color: Colors.textMuted,
    marginLeft: 8,
  },
  footer: {
    marginTop: 16,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: Colors.mud,
    alignItems: 'center',
  },
  disclaimerText: {
    fontSize: 12,
    color: Colors.amber,
    fontStyle: 'italic',
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 6,
  },
  footerLink: {
    fontSize: 12,
    color: Colors.info,
    textAlign: 'center',
  },
  bottomSpacer: {
    height: 20,
  },
});
