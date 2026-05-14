/**
 * CampResourcesScreen — Camp reference content and resources.
 *
 * Phase 5A implementation:
 *   - Leave No Trace 7 principles
 *   - Fire & burn ban policy
 *   - Bear safety & food storage
 *   - Tick/Lyme disease prevention
 *   - Reservation systems (ReserveMaryland, Recreation.gov)
 *   - External resource links
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Linking,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import Colors from '../theme/colors';
import OnboardingTourGate from '../components/OnboardingTourGate';
import ContactFab from '../components/common/ContactFab';

export default function CampResourcesScreen() {
  const navigation = useNavigation<any>();
  const openURL = (url: string) => {
    Linking.openURL(url).catch(() => {});
  };
  // Phase A.26 — controlled re-show of the camp onboarding tour.
  const [tourOpen, setTourOpen] = useState(false);

  return (
    // 2026-05-01 (V2.4 audit): wrap ScrollView in relative View so
    // ContactFab can position absolutely at bottom-right without
    // scrolling away. Same parallel as Hunt's ResourcesHubScreen.
    <View style={styles.container}>
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.heading}>Camp Resources</Text>

      {/*
        2026-05-02 (V2.4 audit, task #57): Settings + Forum quick-nav
        row. Hunt's ResourcesHubScreen has had these two nav buttons
        for a long time (plus Harvest Log); Camp users had no path to
        reach Settings or the Community Forum from the Info tab.
        Settings + Forum are registered at the root Stack (see
        AppNavigator.tsx) so navigate() resolves from any mode.
      */}
      <View style={styles.quickNavRow}>
        <TouchableOpacity
          style={styles.quickNavBtn}
          onPress={() => navigation.navigate('Forum')}
          accessibilityRole="button"
          accessibilityLabel="Open Community Forum"
          activeOpacity={0.7}
        >
          <Text style={styles.quickNavLabel}>Forum</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.quickNavBtn}
          onPress={() => navigation.navigate('Settings')}
          accessibilityRole="button"
          accessibilityLabel="Open Settings"
          activeOpacity={0.7}
        >
          <Text style={styles.quickNavLabel}>Settings</Text>
        </TouchableOpacity>
      </View>

      {/* ── "Take the tour again" — Phase A.26 onboarding replay entry ── */}
      <TouchableOpacity
        style={styles.tourReplayRow}
        onPress={() => setTourOpen(true)}
        activeOpacity={0.7}
        accessibilityRole="button"
        accessibilityLabel="Replay the Camp mode onboarding tour"
      >
        <View style={styles.tourReplayChip}>
          <Text style={styles.tourReplayChipText}>TR</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.tourReplayTitle}>Take the tour again</Text>
          <Text style={styles.tourReplaySubtitle}>
            Replay the Camp mode walkthrough
          </Text>
        </View>
      </TouchableOpacity>

      <OnboardingTourGate
        mode="camp"
        open={tourOpen}
        onClose={() => setTourOpen(false)}
      />

      {/* Leave No Trace */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Leave No Trace — 7 Principles</Text>

        <View style={styles.principle}>
          <Text style={styles.principleNum}>1.</Text>
          <View style={{ flex: 1 }}>
            <Text style={styles.principleName}>Plan Ahead and Prepare</Text>
            <Text style={styles.principleText}>
              Know the campground, regulations, and weather. Reserve early and inform others of your trip.
            </Text>
          </View>
        </View>

        <View style={styles.principle}>
          <Text style={styles.principleNum}>2.</Text>
          <View style={{ flex: 1 }}>
            <Text style={styles.principleName}>Travel and Camp on Durable Surfaces</Text>
            <Text style={styles.principleText}>
              Use established campsites and existing tent pads. Stay on defined trails. Camp 200+ feet from water sources.
            </Text>
          </View>
        </View>

        <View style={styles.principle}>
          <Text style={styles.principleNum}>3.</Text>
          <View style={{ flex: 1 }}>
            <Text style={styles.principleName}>Dispose of Waste Properly</Text>
            <Text style={styles.principleText}>
              Pack out all trash and food scraps. Use bear boxes at shelters. Catholes must be 200 feet from water.
            </Text>
          </View>
        </View>

        <View style={styles.principle}>
          <Text style={styles.principleNum}>4.</Text>
          <View style={{ flex: 1 }}>
            <Text style={styles.principleName}>Leave What You Find</Text>
            <Text style={styles.principleText}>
              Don't pick wildflowers, move rocks, or collect firewood. Leave natural and cultural objects for others.
            </Text>
          </View>
        </View>

        <View style={styles.principle}>
          <Text style={styles.principleNum}>5.</Text>
          <View style={{ flex: 1 }}>
            <Text style={styles.principleName}>Minimize Campfire Impact</Text>
            <Text style={styles.principleText}>
              Use a camp stove instead of fires. If fires are permitted, use existing rings and fully extinguish.
            </Text>
          </View>
        </View>

        <View style={styles.principle}>
          <Text style={styles.principleNum}>6.</Text>
          <View style={{ flex: 1 }}>
            <Text style={styles.principleName}>Respect Wildlife</Text>
            <Text style={styles.principleText}>
              Never feed animals. Store food in bear boxes. Observe wildlife from 25+ feet. Report aggressive animals.
            </Text>
          </View>
        </View>

        <View style={styles.principle}>
          <Text style={styles.principleNum}>7.</Text>
          <View style={{ flex: 1 }}>
            <Text style={styles.principleName}>Be Considerate of Other Visitors</Text>
            <Text style={styles.principleText}>
              Keep noise low. Camp away from trails. Respect quiet hours (usually dusk–dawn).
            </Text>
          </View>
        </View>
      </View>

      {/* Fire & Burn Ban Policy */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Fire & Burn Ban Policy</Text>

        <Text style={styles.safetyText}>
          <Text style={{ fontWeight: '700' }}>MD State Parks:</Text> Most parks permit fires in designated rings only. Some seasonal parks ban fires during drought. Check with your specific campground.
        </Text>

        <Text style={styles.safetyText}>
          <Text style={{ fontWeight: '700' }}>Private Parks:</Text> Always ask before building any fire. Many require portable camp stoves only.
        </Text>

        <Text style={styles.safetyText}>
          <Text style={{ fontWeight: '700' }}>Burn Bans:</Text> MD Department of Forests suspends burning during dry/windy conditions. Phone ahead to confirm.
        </Text>

        <Text style={styles.safetyText}>
          <Text style={{ fontWeight: '700' }}>Best Practice:</Text> Carry a camp stove as your primary cooking method. Bring fire-starter kit only as backup.
        </Text>
      </View>

      {/* Bear Safety & Food Storage */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Bear Safety & Food Storage</Text>

        <Text style={styles.safetyText}>
          <Text style={{ fontWeight: '700' }}>Encounter:</Text> Most bears flee on sight. Make noise while cooking and walking. Never approach cubs. If a bear appears: speak calmly, back away slowly, do not run.
        </Text>

        <Text style={styles.safetyText}>
          <Text style={{ fontWeight: '700' }}>Food Storage:</Text> Use bear boxes provided at campsites. Never sleep with food in your tent. Store toiletries, garbage, and scented items in the box.
        </Text>

        <Text style={styles.safetyText}>
          <Text style={{ fontWeight: '700' }}>Camp Setup:</Text> Keep your campsite at least 100 feet from water sources and trails. Separate sleeping, cooking, and food storage areas.
        </Text>

        <Text style={styles.safetyText}>
          <Text style={{ fontWeight: '700' }}>Scent Control:</Text> Use unscented soaps. Store all trash immediately. Avoid perfumed products. Brush teeth away from camp.
        </Text>
      </View>

      {/* Tick & Lyme Disease */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Tick & Lyme Disease Prevention</Text>

        <Text style={styles.safetyText}>
          <Text style={{ fontWeight: '700' }}>Prevention:</Text> Permethrin-treat clothing and gear before your trip. Wear light-colored, long-sleeved shirts. Tuck pants into socks in brush.
        </Text>

        <Text style={styles.safetyText}>
          <Text style={{ fontWeight: '700' }}>Daily Inspection:</Text> Check your entire body daily, especially behind knees, armpits, and groin. Have a partner check your back.
        </Text>

        <Text style={styles.safetyText}>
          <Text style={{ fontWeight: '700' }}>Removal:</Text> Use a tick key or fine-tipped tweezers. Grasp the tick close to the skin and pull straight out. Do NOT twist or squeeze. Save the tick for ID if symptoms develop.
        </Text>

        <Text style={styles.safetyText}>
          <Text style={{ fontWeight: '700' }}>Lyme Symptoms:</Text> Watch for a "bull's-eye" rash within 3–30 days. Fever, joint pain, and fatigue are other signs. Early antibiotic treatment prevents serious complications. See a doctor immediately if you find an attached tick.
        </Text>

        <Text style={styles.safetyText}>
          <Text style={{ fontWeight: '700' }}>Seasonal Risk:</Text> Ticks are active April–October in MD. Brush-covered trails pose the highest risk.
        </Text>
      </View>

      {/* Reservation Systems */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Reservation Systems</Text>

        <TouchableOpacity
          style={styles.resourceLink}
          onPress={() => openURL('https://reservemaryland.com')}
        >
          <Text style={styles.resourceLinkText}>
            ReserveMaryland — MD state parks & forests
          </Text>
          <Text style={styles.linkArrow}>›</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.resourceLink}
          onPress={() => openURL('https://recreation.gov')}
        >
          <Text style={styles.resourceLinkText}>
            Recreation.gov — Federal & COE campgrounds
          </Text>
          <Text style={styles.linkArrow}>›</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.resourceLink}
          onPress={() => openURL('https://dnr.maryland.gov/publiclands/pages/state-parks.aspx')}
        >
          <Text style={styles.resourceLinkText}>
            MD DNR State Parks — Regulations & contact info
          </Text>
          <Text style={styles.linkArrow}>›</Text>
        </TouchableOpacity>
      </View>

      {/* External Resources */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Learn More</Text>

        <TouchableOpacity
          style={styles.resourceLink}
          onPress={() => openURL('https://lnt.org/')}
        >
          <Text style={styles.resourceLinkText}>
            Leave No Trace Center for Outdoor Ethics
          </Text>
          <Text style={styles.linkArrow}>›</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.resourceLink}
          onPress={() => openURL('https://dnr.maryland.gov/nrm/Pages/wildlifelist/blackbear.aspx')}
        >
          <Text style={styles.resourceLinkText}>
            MD DNR Black Bear Safety & Coexistence
          </Text>
          <Text style={styles.linkArrow}>›</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.resourceLink}
          onPress={() => openURL('https://www.cdc.gov/lyme/index.html')}
        >
          <Text style={styles.resourceLinkText}>
            CDC — Lyme Disease Prevention & Treatment
          </Text>
          <Text style={styles.linkArrow}>›</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.resourceLink}
          onPress={() => openURL('https://dnr.maryland.gov/forests/Pages/index.aspx')}
        >
          <Text style={styles.resourceLinkText}>
            MD Department of Forests — Burn bans & regulations
          </Text>
          <Text style={styles.linkArrow}>›</Text>
        </TouchableOpacity>
      </View>

      <View style={{ height: 20 }} />
    </ScrollView>
    <ContactFab />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { padding: 16, paddingBottom: 32 },
  heading: { fontSize: 20, fontWeight: '700', color: Colors.textPrimary, marginBottom: 20 },
  // 2026-05-02 (V2.4 audit, task #57): Forum + Settings quick-nav row.
  // Matches the style of Hunt's ResourcesHubScreen quick-bar but
  // stripped down to the two universal entries (Harvest Log is
  // Hunt-specific so it doesn't belong on Camp).
  quickNavRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 18,
  },
  quickNavBtn: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 14,
    backgroundColor: Colors.surface,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.mud,
    alignItems: 'center',
  },
  quickNavLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.textPrimary,
    letterSpacing: 0.3,
  },
  section: { marginBottom: 24 },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.mdGold,
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  principle: {
    flexDirection: 'row',
    marginBottom: 14,
    paddingHorizontal: 12,
  },
  principleNum: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.moss,
    width: 24,
    marginRight: 8,
  },
  principleName: { fontSize: 12, fontWeight: '700', color: Colors.textPrimary, marginBottom: 4 },
  principleText: { fontSize: 12, color: Colors.textSecondary, lineHeight: 17 },
  safetyText: { fontSize: 12, color: Colors.textSecondary, lineHeight: 18, marginBottom: 10 },
  resourceLink: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    backgroundColor: Colors.surface,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: Colors.mud,
  },
  resourceLinkText: { fontSize: 12, color: Colors.textSecondary, lineHeight: 17, flex: 1 },
  linkArrow: { fontSize: 16, color: Colors.moss, marginLeft: 8 },
  tourReplayRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 18,
    backgroundColor: Colors.surface,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.mud,
  },
  tourReplayChip: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#6D4C41',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  tourReplayChipText: {
    color: Colors.textOnAccent,
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.4,
  },
  tourReplayTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  tourReplaySubtitle: {
    fontSize: 11,
    color: Colors.textSecondary,
    marginTop: 1,
  },
});
