/**
 * @file ModePickerScreen.tsx
 * @description Home screen — user picks an activity (Hunt, Fish, Camp, or Hike)
 *
 * This is the app's entry point after the animated splash. Each of the four
 * Maryland outdoor activities gets its own specialized tab stack; the picker
 * is a deliberate cognitive gate so that a hiker never has to see deer-blind
 * overlays, and a hunter never has to scroll past campground chips.
 *
 * Design principle (see .auto-memory/feedback_mode_picker_over_unified_map.md):
 *   Each activity is its own app surface. Keep specialization.
 */

import React, { useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  StatusBar,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';

import Colors from '../theme/colors';
import { useActivityMode, ActivityMode } from '../context/ActivityModeContext';
import { useUserWaypoints } from '../context/UserWaypointContext';
import { useTrackRecorder } from '../context/TrackRecorderContext';
import { useUserMarkups } from '../context/UserMarkupContext';
import { useJournalEntries } from '../context/JournalEntryContext';
import { useGearChecklists } from '../context/GearChecklistContext';
import {
  summarizeRecentForMode,
  RecentActivityInputs,
  RecentActivitySummary,
} from '../services/recentActivityService';
import type { WaypointMode } from '../types/userWaypoint';
import { APP_MARKETING_VERSION } from '../config';
import ModeLogo from '../components/common/ModeLogo';

interface ModeCard {
  mode: ActivityMode;
  title: string;
  sublabel: string;
  accent: string;
  route: 'HuntTabs' | 'FishTabs' | 'CampTabs' | 'HikeTabs';
}

const MODE_CARDS: ModeCard[] = [
  {
    mode: 'hunt',
    title: 'Hunt',
    sublabel: 'Public lands, scouting, deer camp, blinds, regulations',
    accent: Colors.moss,
    route: 'HuntTabs',
  },
  {
    mode: 'fish',
    title: 'Fish',
    sublabel: 'Angler access, stocking, tides, marine conditions',
    accent: '#0277BD',
    route: 'FishTabs',
  },
  {
    mode: 'camp',
    title: 'Camp',
    sublabel: 'Campgrounds, trip planner, group camp, gear',
    accent: '#E67E22',
    route: 'CampTabs',
  },
  {
    mode: 'hike',
    title: 'Hike',
    sublabel: 'Appalachian Trail, state-park trails, trip planner',
    accent: '#2E7D32',
    route: 'HikeTabs',
  },
];

export default function ModePickerScreen() {
  const navigation = useNavigation<any>();
  const { setActiveMode } = useActivityMode();

  // Pull every personal-layer collection so we can render a "where were
  // we" hook on each mode card. Pure local state — no network, no work
  // beyond a couple of array filters.
  const { allWaypoints } = useUserWaypoints();
  const { allTracks } = useTrackRecorder();
  const { allMarkups } = useUserMarkups();
  const { allEntries } = useJournalEntries();
  const { allChecklists } = useGearChecklists();

  const recentByMode = useMemo<Record<WaypointMode, RecentActivitySummary | null>>(() => {
    const inputs: RecentActivityInputs = {
      waypoints: allWaypoints,
      tracks: allTracks,
      markups: allMarkups,
      journalEntries: allEntries,
      checklists: allChecklists,
    };
    return {
      hunt: summarizeRecentForMode('hunt', inputs),
      fish: summarizeRecentForMode('fish', inputs),
      camp: summarizeRecentForMode('camp', inputs),
      hike: summarizeRecentForMode('hike', inputs),
    };
  }, [allWaypoints, allTracks, allMarkups, allEntries, allChecklists]);

  const handleCardPress = (card: ModeCard) => {
    setActiveMode(card.mode);
    navigation.navigate(card.route);
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.background} />
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <View style={styles.flagStripe}>
            <View style={[styles.flagBlock, { backgroundColor: Colors.mdRed }]} />
            <View style={[styles.flagBlock, { backgroundColor: Colors.mdGold }]} />
            <View style={[styles.flagBlock, { backgroundColor: Colors.mdBlack }]} />
            <View style={[styles.flagBlock, { backgroundColor: Colors.mdWhite }]} />
          </View>
          <Text style={styles.title}>MDHuntFishOutdoors</Text>
          <Text style={styles.subtitle}>What are you headed out to do today?</Text>
        </View>

        <View style={styles.grid}>
          {MODE_CARDS.map((card) => {
            const recent = recentByMode[card.mode as WaypointMode];
            return (
              <TouchableOpacity
                key={card.mode}
                style={[styles.card, { borderColor: card.accent }]}
                onPress={() => handleCardPress(card)}
                activeOpacity={0.75}
                accessibilityRole="button"
                accessibilityLabel={
                  recent
                    ? `${card.title} mode — ${card.sublabel}. Recent: ${recent.label}, ${recent.detail}`
                    : `${card.title} mode — ${card.sublabel}`
                }
              >
                <ModeLogo mode={card.mode} size="lg" accent={card.accent} />
                <View style={styles.cardTextCol}>
                  <Text style={styles.cardTitle}>{card.title}</Text>
                  <Text style={styles.cardSub}>{card.sublabel}</Text>
                  {recent ? (
                    <View style={styles.recentRow}>
                      <View
                        style={[styles.recentChip, { borderColor: card.accent }]}
                      >
                        <Text
                          style={[styles.recentChipText, { color: card.accent }]}
                        >
                          {recent.code}
                        </Text>
                      </View>
                      <View style={styles.recentTextCol}>
                        <Text style={styles.recentLabel} numberOfLines={1}>
                          {recent.label}
                        </Text>
                        <Text style={styles.recentDetail} numberOfLines={1}>
                          {recent.detail}
                        </Text>
                      </View>
                    </View>
                  ) : null}
                </View>
              </TouchableOpacity>
            );
          })}
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerLine}>
            Not affiliated with Maryland DNR. Always verify current regulations with
            the official source before you go.
          </Text>
          <Text style={styles.footerVersion}>v{APP_MARKETING_VERSION}</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingBottom: 24,
  },
  header: {
    alignItems: 'center',
    paddingTop: 24,
    paddingBottom: 20,
  },
  flagStripe: {
    flexDirection: 'row',
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: 14,
  },
  flagBlock: {
    width: 14,
    height: 20,
  },
  title: {
    fontSize: 26,
    fontWeight: '800',
    color: Colors.tan,
    letterSpacing: 0.5,
    textAlign: 'center',
  },
  subtitle: {
    marginTop: 6,
    fontSize: 14,
    color: Colors.textMuted,
    textAlign: 'center',
  },
  grid: {
    gap: 14,
  },
  card: {
    backgroundColor: Colors.surface,
    borderRadius: 14,
    borderWidth: 2,
    padding: 18,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  cardTextCol: {
    flex: 1,
    flexShrink: 1,
  },
  cardTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginBottom: 2,
  },
  cardSub: {
    fontSize: 13,
    color: Colors.textMuted,
    lineHeight: 18,
    flexShrink: 1,
  },
  recentRow: {
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Colors.mud,
    flexDirection: 'row',
    alignItems: 'center',
  },
  recentChip: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
    marginRight: 8,
  },
  recentChipText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  recentTextCol: {
    flex: 1,
  },
  recentLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  recentDetail: {
    fontSize: 11,
    color: Colors.textSecondary,
    marginTop: 1,
  },
  footer: {
    marginTop: 28,
    paddingHorizontal: 8,
    alignItems: 'center',
  },
  footerLine: {
    fontSize: 11,
    color: Colors.textMuted,
    textAlign: 'center',
    lineHeight: 16,
  },
  footerVersion: {
    marginTop: 8,
    fontSize: 11,
    color: Colors.textMuted,
    opacity: 0.6,
  },
});
