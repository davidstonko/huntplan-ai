/**
 * HikeResourcesScreen — Hiking reference content.
 *
 * Phase 5B implementation:
 *   - Leave No Trace (7 principles, MD-specific notes)
 *   - Hypothermia / heat-injury first aid
 *   - AT resupply towns and logistics
 *   - Black bear + tick safety
 *   - Links to ATC and MD DNR
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
import Colors from '../theme/colors';
import OnboardingTourGate from '../components/OnboardingTourGate';
import ContactFab from '../components/common/ContactFab';

export default function HikeResourcesScreen() {
  const openURL = (url: string) => {
    Linking.openURL(url).catch(() => {});
  };
  // Phase A.26 — controlled re-show of the hike onboarding tour.
  const [tourOpen, setTourOpen] = useState(false);

  return (
    // 2026-05-01 (V2.4 audit): wrapped scroll in a relative View so the
    // ContactFab can position absolutely at bottom-right without
    // scrolling away with the content. Same pattern as Hunt's
    // ResourcesHubScreen.
    <View style={styles.container}>
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.heading}>Hike Resources</Text>

      {/* ── "Take the tour again" — Phase A.26 onboarding replay entry ── */}
      <TouchableOpacity
        style={styles.tourReplayRow}
        onPress={() => setTourOpen(true)}
        activeOpacity={0.7}
        accessibilityRole="button"
        accessibilityLabel="Replay the Hike mode onboarding tour"
      >
        <View style={styles.tourReplayChip}>
          <Text style={styles.tourReplayChipText}>TR</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.tourReplayTitle}>Take the tour again</Text>
          <Text style={styles.tourReplaySubtitle}>
            Replay the Hike mode walkthrough
          </Text>
        </View>
      </TouchableOpacity>

      <OnboardingTourGate
        mode="hike"
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
              Know the trail, weather, and regulations. Carry a map, compass, and headlamp.
              MD AT requires no permit but informs the ATC of your thru-hike plans.
            </Text>
          </View>
        </View>

        <View style={styles.principle}>
          <Text style={styles.principleNum}>2.</Text>
          <View style={{ flex: 1 }}>
            <Text style={styles.principleName}>Travel and Camp on Durable Surfaces</Text>
            <Text style={styles.principleText}>
              Stay on marked trails. Camp at established shelters on the AT or designated sites
              in state parks. Avoid creating new campsites or widening trails.
            </Text>
          </View>
        </View>

        <View style={styles.principle}>
          <Text style={styles.principleNum}>3.</Text>
          <View style={{ flex: 1 }}>
            <Text style={styles.principleName}>Dispose of Waste Properly</Text>
            <Text style={styles.principleText}>
              Pack out all trash. Human waste must be buried 200 feet from water and trails.
              Use pit toilets at shelters when available. Never leave microtrash (gum wrappers, etc.).
            </Text>
          </View>
        </View>

        <View style={styles.principle}>
          <Text style={styles.principleNum}>4.</Text>
          <View style={{ flex: 1 }}>
            <Text style={styles.principleName}>Leave What You Find</Text>
            <Text style={styles.principleText}>
              Don't pick wildflowers, collect rocks, or remove mushrooms. Leave tree bark intact.
              Preserve MD's natural heritage for future hikers.
            </Text>
          </View>
        </View>

        <View style={styles.principle}>
          <Text style={styles.principleNum}>5.</Text>
          <View style={{ flex: 1 }}>
            <Text style={styles.principleName}>Minimize Campfire Impact</Text>
            <Text style={styles.principleText}>
              Use a camp stove instead of wood fires. If fire is necessary, use only dead wood
              below wrist thickness and fully extinguish. Many MD parks ban campfires.
            </Text>
          </View>
        </View>

        <View style={styles.principle}>
          <Text style={styles.principleNum}>6.</Text>
          <View style={{ flex: 1 }}>
            <Text style={styles.principleName}>Respect Wildlife</Text>
            <Text style={styles.principleText}>
              Never feed deer, bears, or birds. Store food in bear boxes at shelters. Observe
              wildlife from at least 25 feet away. Report aggressive animals to the ATC.
            </Text>
          </View>
        </View>

        <View style={styles.principle}>
          <Text style={styles.principleNum}>7.</Text>
          <View style={{ flex: 1 }}>
            <Text style={styles.principleName}>Be Considerate of Other Visitors</Text>
            <Text style={styles.principleText}>
              Yield to uphill hikers. Keep noise low at shelters, especially at dawn. Respect
              shelter-free nights and share space fairly.
            </Text>
          </View>
        </View>
      </View>

      {/* Hypothermia & Heat Injury */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>First Aid: Hypothermia & Heat Injury</Text>

        <View style={styles.subsection}>
          <Text style={styles.subsectionTitle}>Hypothermia (Core Temp &lt; 95°F)</Text>
          <Text style={styles.riskText}>Risk: Fall, winter, wet conditions without insulation.</Text>
          <Text style={styles.symptomLabel}>Symptoms:</Text>
          <Text style={styles.symptomText}>
            Shivering → uncontrollable shaking → confusion → slurred speech → loss of consciousness
          </Text>
          <Text style={styles.treatmentLabel}>Treatment:</Text>
          <Text style={styles.treatmentText}>
            1. Move to shelter, remove wet clothing. {'\n'}
            2. Warm gradually with blankets and skin-to-skin contact. {'\n'}
            3. Give warm drinks (not alcohol). {'\n'}
            4. If unconscious, treat gently and evacuate immediately. {'\n'}
            5. Call 911 or Appalachian Trail Conservancy emergency line.
          </Text>
        </View>

        <View style={styles.subsection}>
          <Text style={styles.subsectionTitle}>Heat Exhaustion (Dehydration + Overheating)</Text>
          <Text style={styles.riskText}>Risk: Summer hiking, May–Aug, lack of water/shade.</Text>
          <Text style={styles.symptomLabel}>Symptoms:</Text>
          <Text style={styles.symptomText}>
            Heavy sweating, weakness, dizziness, fast heartbeat, nausea, headache
          </Text>
          <Text style={styles.treatmentLabel}>Treatment:</Text>
          <Text style={styles.treatmentText}>
            1. Stop hiking, find shade. {'\n'}
            2. Drink water with electrolytes. {'\n'}
            3. Remove excess clothing. {'\n'}
            4. Cool skin with water or rest for 30+ minutes. {'\n'}
            5. If symptoms don't improve, evacuate.
          </Text>
        </View>

        <View style={styles.subsection}>
          <Text style={styles.subsectionTitle}>Heat Stroke (Medical Emergency)</Text>
          <Text style={styles.riskText}>Risk: Untreated heat exhaustion, core temp &gt; 104°F.</Text>
          <Text style={styles.symptomLabel}>Symptoms:</Text>
          <Text style={styles.symptomText}>
            No sweating, confusion, unconsciousness, hot/red skin
          </Text>
          <Text style={styles.treatmentLabel}>Treatment:</Text>
          <Text style={styles.treatmentText}>
            1. IMMEDIATE EVACUATION REQUIRED. {'\n'}
            2. Cool person aggressively (immerse in water if available). {'\n'}
            3. Call 911 immediately.
          </Text>
        </View>
      </View>

      {/* AT Resupply & Logistics */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>AT Maryland Resupply Towns</Text>

        <View style={styles.town}>
          <Text style={styles.townName}>Boonsboro, MD</Text>
          <Text style={styles.townInfo}>
            ~13 mi from Crampton Gap. Grocery (Food Lion), pharmacy, laundromat, lodging.
          </Text>
        </View>

        <View style={styles.town}>
          <Text style={styles.townName}>Hagerstown, MD</Text>
          <Text style={styles.townInfo}>
            ~10 mi west of Boonsboro. Full services: REI, multiple grocery stores, restaurants, hotels.
          </Text>
        </View>

        <View style={styles.town}>
          <Text style={styles.townName}>Harpers Ferry, WV</Text>
          <Text style={styles.townInfo}>
            AT trail terminus. ATC visitor center, lodging, restaurants, grocery stores. Last resupply
            before Virginia.
          </Text>
        </View>

        <View style={styles.town}>
          <Text style={styles.townName}>Brunswick, MD</Text>
          <Text style={styles.townInfo}>
            ~5 mi south of Harpers Ferry. Small town with market and basic services.
          </Text>
        </View>

        <Text style={styles.noteText}>
          Note: No major towns directly on the AT between Pen Mar and Harpers Ferry. Plan resupply
          carefully for multi-day hikes.
        </Text>
      </View>

      {/* Black Bear Safety */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Black Bear Safety</Text>

        <Text style={styles.safetyText}>
          <Text style={{ fontWeight: '700' }}>Encounter:</Text> Most bears flee. Make noise while hiking.
          If you encounter one: don't run, back away slowly, make yourself look large, talk calmly.
        </Text>

        <Text style={styles.safetyText}>
          <Text style={{ fontWeight: '700' }}>Food Storage:</Text> Use bear boxes at shelters. Hang food
          in a bear bag from a high branch if no box. Never sleep with food in your tent.
        </Text>

        <Text style={styles.safetyText}>
          <Text style={{ fontWeight: '700' }}>Scent Management:</Text> Filter all trash. Avoid
          perfumed soaps and strong foods. Brush teeth away from camp.
        </Text>
      </View>

      {/* Tick Safety */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Tick & Lyme Disease Prevention</Text>

        <Text style={styles.safetyText}>
          <Text style={{ fontWeight: '700' }}>Prevention:</Text> Permethrin-treat clothing and gear
          before hiking. Check body for ticks daily, especially behind knees and in armpits.
        </Text>

        <Text style={styles.safetyText}>
          <Text style={{ fontWeight: '700' }}>Removal:</Text> Use a tick key or fine-tipped tweezers.
          Grasp tick close to skin and pull straight out. Save the tick in a bag for ID if needed.
        </Text>

        <Text style={styles.safetyText}>
          <Text style={{ fontWeight: '700' }}>Risk Window:</Text> Ticks are active April–October in MD.
          Brush-covered trails = higher risk. Wear gaiters to block ground-level ticks.
        </Text>

        <Text style={styles.safetyText}>
          <Text style={{ fontWeight: '700' }}>Lyme Symptoms:</Text> Watch for "bull's-eye" rash within
          3–30 days. Early antibiotic treatment prevents serious complications. Consult a doctor if you
          found an attached tick and develop flu-like illness.
        </Text>
      </View>

      {/* External Resources */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Learn More</Text>

        <TouchableOpacity
          style={styles.resourceLink}
          onPress={() =>
            openURL(
              'https://www.appalachiantrail.org',
            )
          }
        >
          <Text style={styles.resourceLinkText}>
            Appalachian Trail Conservancy — Official AT guide, trail updates, shelter info
          </Text>
          <Text style={styles.linkArrow}>›</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.resourceLink}
          onPress={() =>
            openURL(
              'https://dnr.maryland.gov/publiclands/Pages/stateparks.aspx',
            )
          }
        >
          <Text style={styles.resourceLinkText}>
            MD DNR State Parks — Trails, camping, regulations
          </Text>
          <Text style={styles.linkArrow}>›</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.resourceLink}
          onPress={() =>
            openURL(
              'https://dnr.maryland.gov/nrm/Pages/wildlifelist/blackbear.aspx',
            )
          }
        >
          <Text style={styles.resourceLinkText}>
            MD DNR Black Bear Safety — Coexistence tips
          </Text>
          <Text style={styles.linkArrow}>›</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.resourceLink}
          onPress={() =>
            openURL(
              'https://www.cdc.gov/lyme/index.html',
            )
          }
        >
          <Text style={styles.resourceLinkText}>
            CDC Lyme Disease — Prevention, diagnosis, treatment
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
  subsection: { marginBottom: 14 },
  subsectionTitle: { fontSize: 13, fontWeight: '700', color: Colors.textPrimary, marginBottom: 6 },
  riskText: { fontSize: 11, color: Colors.amber, marginBottom: 6, fontWeight: '600' },
  symptomLabel: { fontSize: 11, fontWeight: '700', color: Colors.textPrimary, marginTop: 6 },
  symptomText: { fontSize: 11, color: Colors.textSecondary, lineHeight: 16, marginBottom: 8 },
  treatmentLabel: { fontSize: 11, fontWeight: '700', color: Colors.textPrimary, marginTop: 6 },
  treatmentText: { fontSize: 11, color: Colors.textSecondary, lineHeight: 17 },
  town: { marginBottom: 10 },
  townName: { fontSize: 12, fontWeight: '700', color: Colors.textPrimary },
  townInfo: { fontSize: 11, color: Colors.textSecondary, lineHeight: 16, marginTop: 4 },
  noteText: { fontSize: 11, color: Colors.textMuted, lineHeight: 16, marginTop: 8, fontStyle: 'italic' },
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
    backgroundColor: Colors.moss,
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
