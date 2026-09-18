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
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useRoute } from '@react-navigation/native';
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
 *
 * @returns {JSX.Element} Container with segmented control and either RegulationsScreen or ResourcesScreen
 */
export default function ResourcesHubScreen() {
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

      {/*
        2026-09-18 (five-tab restructure): the Harvest Log / Forum /
        Settings quick bar that used to sit here was removed — every one
        of those is now a row on the More tab, which is the only screen
        that pushes this hub. Harvest Log moved to the Log tab.
      */}

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
