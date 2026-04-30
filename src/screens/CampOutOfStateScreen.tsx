/**
 * @file CampOutOfStateScreen.tsx
 * @description Curated guide for nonresident campers visiting Maryland.
 * Covers campground types, reservation tips, fees, rules, regions, weather, and key contacts.
 *
 * @module Screens
 * @version 1.0.0
 *
 * Key features:
 * - Collapsible sections with detailed camping information
 * - External links for reservations, park info, and regional guides
 * - Key contacts for Maryland DNR Parks & Forests
 * - Pro tips for nonresident campers
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
    icon: '🏕️',
    content:
      'Welcome to Maryland camping! Most state park campgrounds book through ReserveAmerica or the Maryland DNR Reservations system. Popular sites fill up quickly during peak season (April–October). Plan ahead and reserve exactly 6 months in advance for the best availability.',
    links: [
      { label: 'Maryland State Park Camping Reservations', url: 'https://parkreservations.maryland.gov' },
      { label: 'MD DNR State Parks', url: 'https://dnr.maryland.gov/publiclands/Pages/default.aspx' },
    ],
  },
  {
    id: 'reservation-tips',
    title: 'Reservation Tips',
    icon: '📅',
    content:
      'Popular parks like Assateague Island, Cunningham Falls, and Deep Creek Lake book within minutes of the reservation window opening (6 months ahead). Reserve exactly on opening day for peak-season weekends. Cancellation policy allows changes up to 2 days before arrival. Group sites and large parties should contact parks directly for advance planning.',
    links: [
      { label: 'Assateague Island Camping', url: 'https://www.nps.gov/asis/planyourvisit/camping.htm' },
      { label: 'Reserve America Maryland Parks', url: 'https://www.reserveamerica.com/camping/Maryland/31049' },
    ],
  },
  {
    id: 'fees-passes',
    title: 'Fees & Passes',
    icon: '💲',
    content:
      'Nonresident camping rates are typically $5–10 more per night than Maryland resident rates. Annual park passes provide unlimited day-use access. Day-use fees are $3–5 per vehicle. Pets and extra vehicles may incur additional fees. Contact the park directly for current pricing and available discounts.',
    links: [
      { label: 'MD State Park Fees', url: 'https://dnr.maryland.gov/publiclands/Pages/Fees.aspx' },
      { label: 'Maryland Park Pass', url: 'https://shopdnr.com/parkpass.aspx' },
    ],
  },
  {
    id: 'campground-types',
    title: 'Campground Types',
    icon: '⛺',
    content:
      'Maryland offers diverse camping: State Parks (full amenities, showers, electric sites), State Forests (primitive, natural settings), Federal lands (C&O Canal, Assateague NPS), County Parks (affordable, family-friendly), KOA franchises (RV-friendly), and private campgrounds with glamping options. Choose based on your comfort level and desired experience.',
    links: [
      { label: 'KOA Maryland Locations', url: 'https://koa.com/campgrounds/maryland/' },
      { label: 'Hipcamp Maryland Glamping & Unique Stays', url: 'https://www.hipcamp.com/en-US/d/united-states/maryland/camping' },
      { label: 'Explore MD State Parks', url: 'https://dnr.maryland.gov/publiclands/Pages/findyourpark.aspx' },
    ],
  },
  {
    id: 'rules-regulations',
    title: 'Rules & Regulations',
    icon: '📜',
    content:
      'Quiet hours are 10 PM to 7 AM. Maximum stay is 14 consecutive days. Sites accommodate up to 6 people per site. Pets must be on leash at all times. Campfires are only allowed in designated rings; check burn restrictions during dry seasons. Follow Leave No Trace principles: pack in, pack out. Alcohol is permitted in campsites only. Generator hours are typically limited to daytime hours.',
    links: [
      { label: 'MD State Park Rules & Regulations', url: 'https://dnr.maryland.gov/publiclands/Pages/rules.aspx' },
    ],
  },
  {
    id: 'best-regions',
    title: 'Best Regions for Camping',
    icon: '🗺️',
    content:
      'Western MD (Deep Creek Lake, Swallow Falls, Savage River) offers mountain camping and cool summers. Central MD (Cunningham Falls, Gambrill) provides proximity to DC with forest trails. Eastern Shore (Assateague Island, Janes Island) delivers beach and kayaking opportunities. Southern MD (Cedarville, Calvert Cliffs) features family-friendly parks with water access and scenic bluffs.',
    links: [
      { label: 'Explore MD State Parks by Region', url: 'https://dnr.maryland.gov/publiclands/Pages/findyourpark.aspx' },
      { label: 'Deep Creek Lake State Park', url: 'https://dnr.maryland.gov/publiclands/Pages/western/deep-creek.aspx' },
      { label: 'Assateague Island National Seashore', url: 'https://www.nps.gov/asis/index.htm' },
    ],
  },
  {
    id: 'gear-weather',
    title: 'Gear & Weather',
    icon: '🌡️',
    content:
      'Spring (April–May): 40–70°F, unpredictable rain — bring a quality tent and rain fly. Summer (June–August): 70–90°F with high humidity — waterproof gear and ventilation essential. Fall (September–November): 40–65°F with stunning foliage, peak camping season — layers recommended. Winter (December–February): 20–40°F, limited campgrounds open — winter-rated sleeping bags essential. Western MD is 10–15°F cooler than the Eastern Shore year-round.',
    links: [
      { label: 'NOAA Weather Forecast — Western MD', url: 'https://forecast.weather.gov/MapClick.php?lat=39.5&lon=-77.6' },
      { label: 'NOAA Weather Forecast — Eastern MD', url: 'https://forecast.weather.gov/MapClick.php?lat=38.5&lon=-76.0' },
    ],
  },
  {
    id: 'key-contacts',
    title: 'Key Contacts',
    icon: '📞',
    content:
      'Maryland DNR Parks & Forests: 1-877-620-8DNR (for park information and regulations). Park Reservations Line: 1-888-432-2267 (for booking and changes). Emergency: 911. Rangers are on duty at major parks during operating hours. Contact parks directly for group rates, accessibility needs, and special requests.',
    links: [
      { label: 'MD DNR Contact Information', url: 'https://dnr.maryland.gov/Pages/contactus.aspx' },
      { label: 'MD State Parks Directory', url: 'https://dnr.maryland.gov/publiclands/Pages/default.aspx' },
    ],
  },
];

export default function CampOutOfStateScreen() {
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
        <Text style={styles.headerIcon}>🏕️</Text>
        <Text style={styles.headerTitle}>Camping in Maryland — Visitor Guide</Text>
        <Text style={styles.headerSubtitle}>Everything nonresidents need to know</Text>
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
            Reserve exactly 6 months ahead for peak-season weekends. Check campground amenities and nearby attractions
            before booking. Download offline maps before leaving civilization. Spring and fall offer perfect temperatures
            and fewer crowds than summer.
          </Text>
        </View>
      </View>

      <View style={styles.disclaimerContainer}>
        <Text style={styles.disclaimerText}>
          Always verify campsite availability with Maryland DNR before your trip
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
    color: Colors.sand,
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
    color: Colors.sand,
    flex: 1,
  },
  sectionLinkArrow: {
    fontSize: 14,
    color: Colors.sand,
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
    color: Colors.sand,
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
