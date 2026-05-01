/**
 * @file ResourcesHubScreen.tsx
 * @description Tab wrapper combining Regulations and external Resources/Links into unified Resources tab.
 * Replaces the old separate "Regulations" and "Resources" tabs with a segmented control for switching.
 *
 * @module Screens
 * @version 2.0.0
 *
 * Key features:
 * - Segmented control (Regulations | Links & Guides) for toggling between two content views
 * - Regulations view: Full seasons, bag limits, and "Can I Hunt?" checker
 * - Links & Guides view: External DNR resources, license sales, documentation, gear guides
 * - Clean, unified tab preventing navigation clutter in V2 tab bar
 */

/**
 * ResourcesHubScreen — Combined regulations and external resources interface.
 *
 * Provides two content areas accessible via a horizontal segmented control at the top:
 *
 * 1. **Regulations**: Full RegulationsScreen with seasons, bag limits, and "Can I Hunt?" checker
 * 2. **Links & Guides**: External resources (DNR links, license sales, guides) from ResourcesScreen
 *
 * Replaces the old separate tabs, reducing clutter while keeping both features easily accessible.
 *
 * @returns {JSX.Element} Container with segmented control and content view
 */

import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Linking } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import Colors from '../theme/colors';
import RegulationsScreen from './RegulationsScreen';
import FishRegulationsScreen from './FishRegulationsScreen';
import FishResourcesScreen from './FishResourcesScreen';
import ResourcesScreen from './ResourcesScreen';
import OnboardingTourGate from '../components/OnboardingTourGate';
import ContactFab from '../components/common/ContactFab';
import { useActivityMode } from '../context/ActivityModeContext';

type Segment = 'regulations' | 'links';

/**
 * ResourcesHubScreen component — Segmented wrapper for Regulations and Resources.
 * Includes quick-access toolbar for Harvest Log and Settings sub-screens.
 *
 * @returns {JSX.Element} Container with segmented control and either RegulationsScreen or ResourcesScreen
 */
export default function ResourcesHubScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { activeMode } = useActivityMode();
  // Honor deep-link / cross-tab params so 1-tap shortcuts from the map land on
  // the correct segment. Accepted values: 'regulations' | 'links'.
  const initialSegment: Segment =
    route?.params?.initialSegment === 'links' ? 'links' : 'regulations';
  const [activeSegment, setActiveSegment] = useState<Segment>(initialSegment);
  // Phase A.26 — controlled re-show of the per-mode onboarding tour.
  const [tourOpen, setTourOpen] = useState(false);
  useEffect(() => {
    const incoming = route?.params?.initialSegment;
    if (incoming === 'links' || incoming === 'regulations') {
      setActiveSegment(incoming);
    }
  }, [route?.params?.initialSegment]);

  return (
    <View style={styles.container}>
      {/*
        Contact button moved out of the top banner area on 2026-04-30 per
        user directive. The big banner that lived here was visually
        dominant on the Info screen and used David's personal email
        (`dstonko1@gmail.com`); both got fixed:
          - Email is now `feedback.mdhuntfishoutdoors@gmail.com`
            (the dedicated app inbox).
          - The button is now a small floating bubble rendered as
            `<ContactFab/>` near the bottom-right, pairing with the
            existing "Report" FAB inside the regulations sub-screen.
            See bottom of this component.
        Keeps the same partnership / listing-inquiry mailto subject so
        outreach quality stays consistent.
      */}

      {/* ── Quick-Access Toolbar ── */}
      {/* Icon style matches TabIcon geometry (View-shape, not emoji) for a
          consistent visual language across the nav surfaces. See audit §16.3. */}
      <View style={styles.quickBar}>
        <TouchableOpacity
          style={styles.quickButton}
          onPress={() => navigation.navigate('HarvestLog')}
          activeOpacity={0.7}
        >
          <HarvestLogGlyph />
          <Text style={styles.quickLabel}>Harvest Log</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.quickButton}
          onPress={() => navigation.navigate('Forum')}
          activeOpacity={0.7}
        >
          <ForumGlyph />
          <Text style={styles.quickLabel}>Forum</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.quickButton}
          onPress={() => navigation.navigate('Settings')}
          activeOpacity={0.7}
        >
          <SettingsGlyph />
          <Text style={styles.quickLabel}>Settings</Text>
        </TouchableOpacity>
      </View>

      {/* ── "Take the tour again" — Phase A.26 onboarding replay entry ── */}
      <TouchableOpacity
        style={styles.tourReplayRow}
        onPress={() => setTourOpen(true)}
        activeOpacity={0.7}
        accessibilityRole="button"
        accessibilityLabel="Replay this mode's onboarding tour"
      >
        <View style={styles.tourReplayChip}>
          <Text style={styles.tourReplayChipText}>TR</Text>
        </View>
        <View style={styles.tourReplayTextWrap}>
          <Text style={styles.tourReplayTitle}>Take the tour again</Text>
          <Text style={styles.tourReplaySubtitle}>
            Replay the {activeMode === 'fish' ? 'Fish' : 'Hunt'} mode walkthrough
          </Text>
        </View>
      </TouchableOpacity>

      {/* ── Segmented Control ── */}
      <View style={styles.segmentBar}>
        <TouchableOpacity
          style={[styles.segment, activeSegment === 'regulations' && styles.segmentActive]}
          onPress={() => setActiveSegment('regulations')}
          activeOpacity={0.7}
        >
          <Text style={[styles.segmentText, activeSegment === 'regulations' && styles.segmentTextActive]}>
            Regulations
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.segment, activeSegment === 'links' && styles.segmentActive]}
          onPress={() => setActiveSegment('links')}
          activeOpacity={0.7}
        >
          <Text style={[styles.segmentText, activeSegment === 'links' && styles.segmentTextActive]}>
            Links & Guides
          </Text>
        </TouchableOpacity>
      </View>

      {/* ── Content ── 2026-04-26: mode-aware. Fish mode shows the
          fishing-specific Regulations + Resources screens (no "Can I Hunt"
          checker). Hunt mode keeps the canonical screens. */}
      <View style={styles.content}>
        {activeMode === 'fish' ? (
          activeSegment === 'regulations' ? (
            <FishRegulationsScreen />
          ) : (
            <FishResourcesScreen />
          )
        ) : activeSegment === 'regulations' ? (
          <RegulationsScreen />
        ) : (
          <ResourcesScreen />
        )}
      </View>

      {/* ── Controlled onboarding tour replay (Phase A.26) ── */}
      <OnboardingTourGate
        mode={activeMode}
        open={tourOpen}
        onClose={() => setTourOpen(false)}
      />

      {/*
        Contact bubble — small FAB anchored just ABOVE the Report FAB
        that lives inside the regulations sub-screen. Together they form
        a vertical pair in the bottom-right corner. Tap → mailto: with
        partnership-inquiry subject pre-filled.

        2026-04-30: replaced the top-banner version per user directive.
        Email moved off David's personal account onto the dedicated
        feedback inbox so partner outreach lands in the right place.
      */}
      {/*
        ContactFab stacked above the existing Report FAB.
        Report sits at bottom: 24 with ~64pt height, so bottom: 96
        gives ~8pt gap between them.
        2026-05-01: extracted to src/components/common/ContactFab.tsx
        so Fish/Camp/Hike Resources screens can use the same affordance.
      */}
      <ContactFab bottom={96} />
    </View>
  );
}

/* ── View-shape glyphs for the quick-access toolbar ──
 * These replace the prior emoji icons (🦌💬⚙️) so the quick bar matches the
 * tab-bar visual language (see AppNavigator TabIcon). Kept deliberately small
 * and abstract — not literal art. */

function HarvestLogGlyph() {
  // Stylized antler/tag: two stacked short bars on a disc.
  return (
    <View style={glyphStyles.wrap}>
      <View style={[glyphStyles.disc, { backgroundColor: Colors.moss }]} />
      <View style={[glyphStyles.bar, { width: 10, top: 3 }]} />
      <View style={[glyphStyles.bar, { width: 6, top: 8 }]} />
    </View>
  );
}

function ForumGlyph() {
  // Two overlapping rounded rectangles — a conversation bubble stack.
  return (
    <View style={glyphStyles.wrap}>
      <View
        style={{
          width: 11,
          height: 9,
          borderRadius: 2,
          borderWidth: 1.5,
          borderColor: Colors.textPrimary,
          position: 'absolute',
          top: 1,
          left: 0,
        }}
      />
      <View
        style={{
          width: 11,
          height: 9,
          borderRadius: 2,
          backgroundColor: Colors.moss,
          position: 'absolute',
          top: 5,
          left: 4,
        }}
      />
    </View>
  );
}

function SettingsGlyph() {
  // Concentric rings — gear-like without drawing teeth.
  return (
    <View style={glyphStyles.wrap}>
      <View
        style={{
          width: 15,
          height: 15,
          borderRadius: 8,
          borderWidth: 1.5,
          borderColor: Colors.textPrimary,
        }}
      />
      <View
        style={{
          position: 'absolute',
          width: 6,
          height: 6,
          borderRadius: 3,
          backgroundColor: Colors.moss,
        }}
      />
    </View>
  );
}

const glyphStyles = StyleSheet.create({
  wrap: {
    width: 16,
    height: 16,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  disc: {
    position: 'absolute',
    width: 14,
    height: 14,
    borderRadius: 7,
    opacity: 0.35,
  },
  bar: {
    position: 'absolute',
    height: 2,
    borderRadius: 1,
    backgroundColor: '#F3E3A1',
  },
});

// 2026-04-26: Contact-David banner styles. Green moss accent with white
// pill so the email is the visual hook. Uses textOnAccent for AA contrast.
const contactStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: Colors.moss,
    marginHorizontal: 12,
    marginTop: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 12,
  },
  pill: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    alignItems: 'center',
    flexDirection: 'row',
    gap: 6,
  },
  pillEmoji: { fontSize: 14 },
  pillText: {
    color: Colors.moss,
    fontWeight: '800',
    fontSize: 13,
    letterSpacing: 0.4,
  },
  textWrap: { flex: 1 },
  title: { color: Colors.textOnAccent, fontSize: 13, fontWeight: '600' },
  email: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
    marginTop: 2,
    letterSpacing: 0.3,
  },
  subtitle: {
    color: Colors.textOnAccent,
    fontSize: 11,
    marginTop: 4,
    opacity: 0.85,
    lineHeight: 14,
  },
});

/* contactFabStyles removed 2026-05-01 — ContactFab moved to
   src/components/common/ContactFab.tsx. The styles now live with
   the component so other Resources screens (Fish/Camp/Hike) can
   share the same visual treatment. */

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  segmentBar: {
    flexDirection: 'row',
    backgroundColor: Colors.surface,
    marginHorizontal: 16,
    marginTop: 10,
    marginBottom: 4,
    borderRadius: 10,
    padding: 3,
    borderWidth: 1,
    borderColor: Colors.mud,
  },
  segment: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 8,
  },
  segmentActive: {
    backgroundColor: Colors.moss,
  },
  segmentText: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.textMuted,
  },
  segmentTextActive: {
    color: Colors.textOnAccent,
  },
  content: {
    flex: 1,
  },
  quickBar: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 2,
  },
  quickButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Colors.mud,
    gap: 6,
  },
  quickLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  tourReplayRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginTop: 6,
    marginBottom: 0,
    paddingHorizontal: 12,
    paddingVertical: 8,
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
  tourReplayTextWrap: {
    flex: 1,
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
