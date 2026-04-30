/**
 * @file AppNavigator.tsx
 * @description Root app navigator — mode-picker home + per-mode tab stacks.
 *
 * 2026-04-20 revert: the V2.3 Track 1 "unified map" refactor was removed
 * after user feedback that each activity deserves a specialized surface.
 * The entry point is now ModePickerScreen; tapping a card sets the active
 * mode (context) and pushes the mode's dedicated Tab.Navigator onto the
 * root Stack. The ActivityModePicker header dropdown remains as a fast
 * cross-mode switcher — it calls setActiveMode and navigates the root
 * Stack to the target mode's tab stack.
 *
 *   Hunt tabs (6, post 2026-04-26 merge): Map, Scout, AI, Deer Camp, Gear, Info
 *   Fish tabs (5, post 2026-04-26 merge): Fish Map, Spots, AI, Gear, Info
 *   Camp tabs (6, post 2026-04-28 audit-of-audit): Camp Map, Trip Planner,
 *     Group Camp, AI, Gear, Resources — AI added 2026-04-28 after the
 *     wiring-integrity test caught it had been shipping orphaned
 *   Hike tabs (6, post 2026-04-28 audit-of-audit): Hike Map, Trails, Trip,
 *     AI, Gear, Resources — AI added 2026-04-28 same reason as Camp
 *   Weather accessible via stack push from Map/FishMap/Spots/CampMap/HikeMap panels
 *   ResourcesStack exposes StarterGear, HuntingVideos, GuideDirectory, GearGuide
 */

import React from 'react';
import { StyleSheet, View, Text } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import { useSafeAreaInsets } from 'react-native-safe-area-context';
import ActivityModePicker from '../components/navigation/ActivityModePicker';

// ── Home picker ──
import ModePickerScreen from '../screens/ModePickerScreen';

// ── Hunt screens ──
import MapScreen from '../screens/MapScreen';
import ScoutScreen from '../screens/ScoutScreen';
import ChatScreen from '../screens/ChatScreen';
import DeerCampScreen from '../screens/DeerCampScreen';
import CampAreaPickerScreen from '../screens/CampAreaPickerScreen';
import ResourcesHubScreen from '../screens/ResourcesHubScreen';
import RutCalendarScreen from '../screens/RutCalendarScreen';
import BestTimesScreen from '../screens/BestTimesScreen';

// ── Sub-screens (accessible via stack push within tabs) ──
import SettingsScreen from '../screens/SettingsScreen';
import HarvestLogScreen from '../screens/HarvestLogScreen';
import HuntPlanScreen from '../screens/HuntPlanScreen';
import OfflineMapsScreen from '../screens/OfflineMapsScreen';
import WindWidgetPlayground from '../screens/WindWidgetPlayground';
import ForumScreen from '../screens/ForumScreen';
import WeatherScreen from '../screens/WeatherScreen';
import StarterGearScreen from '../screens/StarterGearScreen';
import HuntingVideosScreen from '../screens/HuntingVideosScreen';
import GuideDirectoryScreen from '../screens/GuideDirectoryScreen';
import GearGuideScreen from '../screens/GearGuideScreen';

// ── Fish screens ──
import FishMapScreen from '../screens/FishMapScreen';
import FishSpotsScreen from '../screens/FishSpotsScreen';

// ── Camp screens (Phase 5A) ──
import CampMapScreen from '../screens/CampMapScreen';
import CampTripPlannerScreen from '../screens/CampTripPlannerScreen';
import GroupCampScreen from '../screens/GroupCampScreen';
import CampGearScreen from '../screens/CampGearScreen';
import CampResourcesScreen from '../screens/CampResourcesScreen';

// ── Hike screens (Phase 5B) ──
import HikeMapScreen from '../screens/HikeMapScreen';
import HikeTrailBrowserScreen from '../screens/HikeTrailBrowserScreen';
import ATTripPlannerScreen from '../screens/ATTripPlannerScreen';
import HikeResourcesScreen from '../screens/HikeResourcesScreen';

// ── Personal layer screens (Phase A — waypoints + tracker + history) ──
import WaypointListScreen from '../screens/WaypointListScreen';
import WaypointEditScreen from '../screens/WaypointEditScreen';
import TrackRecorderScreen from '../screens/TrackRecorderScreen';
import TrackListScreen from '../screens/TrackListScreen';
import TrackDetailScreen from '../screens/TrackDetailScreen';
import TrackInsightsScreen from '../screens/TrackInsightsScreen';

// ── Personal layer screens (Phase D.2 — markup lines + polygons) ──
import MarkupListScreen from '../screens/MarkupListScreen';
import MarkupEditScreen from '../screens/MarkupEditScreen';
import MarkupDrawScreen from '../screens/MarkupDrawScreen';
import PersonalStatsScreen from '../screens/PersonalStatsScreen';

// ── Personal layer hub (V2.3 entry-point landing page) ──
import PersonalHubScreen from '../screens/PersonalHubScreen';

// ── Personal layer screens (Phase A.5 — field journal) ──
import JournalListScreen from '../screens/JournalListScreen';
import JournalEditScreen from '../screens/JournalEditScreen';

// ── Personal layer screens (Phase A.6 — gear checklists) ──
import GearChecklistListScreen from '../screens/GearChecklistListScreen';
import GearChecklistEditScreen from '../screens/GearChecklistEditScreen';

// ── Personal layer screens (Phase A.8 — unified search) ──
import PersonalSearchScreen from '../screens/PersonalSearchScreen';

// ── Personal layer screens (Phase A.9 — photo gallery) ──
import PhotoGalleryScreen from '../screens/PhotoGalleryScreen';

// ── Personal layer screens (Phase A.10 — tag explorer) ──
import TagExplorerScreen from '../screens/TagExplorerScreen';

// ── Personal layer screens (Phase A.11 — activity calendar / heatmap) ──
import ActivityCalendarScreen from '../screens/ActivityCalendarScreen';

// ── Personal layer screens (Phase A.13 — comparable conditions finder) ──
import ComparableConditionsScreen from '../screens/ComparableConditionsScreen';
import OnThisDayScreen from '../screens/OnThisDayScreen';
import FavoritesScreen from '../screens/FavoritesScreen';
import DailyBriefingScreen from '../screens/DailyBriefingScreen';

// ── Personal layer screens (Phase A.23 — year in review) ──
import YearInReviewScreen from '../screens/YearInReviewScreen';
import ImportPickerScreen from '../screens/ImportPickerScreen';

// ── Personal layer screens (Phase A.28 — annual goal tracker) ──
import GoalsScreen from '../screens/GoalsScreen';
import UpcomingTripsScreen from '../screens/UpcomingTripsScreen';

import Colors from '../theme/colors';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

// ── Stack wrappers for tabs that need sub-screen navigation ──

/** Map tab stack (Hunt): MapScreen → OfflineMaps, Settings, Weather */
function MapStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="MapMain" component={MapScreen} />
      <Stack.Screen
        name="OfflineMaps"
        component={OfflineMapsScreen}
        options={{ headerShown: true, title: 'Offline Maps' }}
      />
      <Stack.Screen
        name="Settings"
        component={SettingsScreen}
        options={{ headerShown: true, title: 'Settings' }}
      />
      <Stack.Screen
        name="Weather"
        component={WeatherScreen}
        options={{ headerShown: true, title: 'Weather & Safety' }}
      />
      {/* 2026-04-26 (fork merge): dev playground for redesigning the
          Hunt wind widget. Reachable via Settings → "Wind widget playground"
          (when wired) or by typing the deep link huntmaryland://playground/wind. */}
      <Stack.Screen
        name="WindWidgetPlayground"
        component={WindWidgetPlayground}
        options={{ headerShown: true, title: 'Wind widget playground' }}
      />
      {PersonalLayerScreens()}
    </Stack.Navigator>
  );
}

/** Fish Map tab stack: FishMapScreen → Weather + personal-layer screens */
function FishMapStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="FishMapMain" component={FishMapScreen} />
      <Stack.Screen
        name="Weather"
        component={WeatherScreen}
        options={{ headerShown: true, title: 'Weather & Marine' }}
      />
      {PersonalLayerScreens()}
    </Stack.Navigator>
  );
}

/** Fish Spots tab stack: FishSpotsScreen → Weather */
function FishSpotsStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="FishSpotsMain" component={FishSpotsScreen} />
      <Stack.Screen
        name="Weather"
        component={WeatherScreen}
        options={{ headerShown: true, title: 'Weather & Marine' }}
      />
    </Stack.Navigator>
  );
}

/** Camp Map tab stack: CampMapScreen → Weather + personal-layer screens */
function CampMapStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="CampMapMain" component={CampMapScreen} />
      <Stack.Screen
        name="Weather"
        component={WeatherScreen}
        options={{ headerShown: true, title: 'Weather & Safety' }}
      />
      {PersonalLayerScreens()}
    </Stack.Navigator>
  );
}

/** Camp Trip Planner tab stack */
function CampTripPlannerStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="CampTripPlannerMain" component={CampTripPlannerScreen} />
      {/* Personal-layer screens so a saved trip can deep-link to JournalEdit
          (Phase A.27 trip→journal handoff) without cross-tab navigation. */}
      {PersonalLayerScreens()}
    </Stack.Navigator>
  );
}

/** Deer Camp tab stack — DeerCampScreen is the landing, CampAreaPicker
 *  is pushed when the user taps Next on the create-modal. Navigation push
 *  beats the in-screen Modal/overlay approach because iOS UIKit modal-stack
 *  races never enter the picture: the picker is a peer Stack screen.
 *  Added 2026-04-26 (fifth-pass fix). */
function DeerCampStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="DeerCampMain" component={DeerCampScreen} />
      <Stack.Screen
        name="CampAreaPicker"
        component={CampAreaPickerScreen}
        options={{ presentation: 'modal', animation: 'slide_from_bottom' }}
      />
    </Stack.Navigator>
  );
}

/** Hike Map tab stack: HikeMapScreen → Weather + personal-layer screens */
function HikeMapStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="HikeMapMain" component={HikeMapScreen} />
      <Stack.Screen
        name="Weather"
        component={WeatherScreen}
        options={{ headerShown: true, title: 'Weather & Safety' }}
      />
      {PersonalLayerScreens()}
    </Stack.Navigator>
  );
}

/**
 * Shared personal-layer stack screens — appended to each mode's Map stack.
 *
 * Registering WaypointList/WaypointEdit/TrackRecorder/TrackList/TrackDetail
 * in every map stack means long-press-on-map can push `WaypointEdit` from
 * any mode without cross-stack navigation, and `navigation.navigate('WaypointList')`
 * reaches the right list from every map surface. The screens read `mode`
 * from route params (seeded by the navigating screen) so they filter
 * correctly regardless of which tab stack pushed them.
 */
function PersonalLayerScreens() {
  return (
    <>
      <Stack.Screen
        name="PersonalHub"
        component={PersonalHubScreen}
        options={{ headerShown: true, title: 'My Layer' }}
      />
      <Stack.Screen
        name="WaypointList"
        component={WaypointListScreen}
        options={{ headerShown: true, title: 'Waypoints' }}
      />
      <Stack.Screen
        name="WaypointEdit"
        component={WaypointEditScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="TrackRecorder"
        component={TrackRecorderScreen}
        options={{ headerShown: true, title: 'Record Track' }}
      />
      <Stack.Screen
        name="TrackList"
        component={TrackListScreen}
        options={{ headerShown: true, title: 'My Tracks' }}
      />
      <Stack.Screen
        name="TrackDetail"
        component={TrackDetailScreen}
        options={{ headerShown: true, title: 'Track' }}
      />
      <Stack.Screen
        name="TrackInsights"
        component={TrackInsightsScreen}
        options={{ headerShown: true, title: 'Track Insights' }}
      />
      <Stack.Screen
        name="MarkupList"
        component={MarkupListScreen}
        options={{ headerShown: true, title: 'Markups' }}
      />
      <Stack.Screen
        name="MarkupEdit"
        component={MarkupEditScreen}
        options={{ headerShown: true, title: 'Edit Markup' }}
      />
      <Stack.Screen
        name="MarkupDraw"
        component={MarkupDrawScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="PersonalStats"
        component={PersonalStatsScreen}
        options={{ headerShown: true, title: 'My Stats' }}
      />
      <Stack.Screen
        name="JournalList"
        component={JournalListScreen}
        options={{ headerShown: true, title: 'Field Journal' }}
      />
      <Stack.Screen
        name="JournalEdit"
        component={JournalEditScreen}
        options={{ headerShown: true, title: 'Journal Entry' }}
      />
      <Stack.Screen
        name="GearChecklistList"
        component={GearChecklistListScreen}
        options={{ headerShown: true, title: 'Gear Checklists' }}
      />
      <Stack.Screen
        name="GearChecklistEdit"
        component={GearChecklistEditScreen}
        options={{ headerShown: true, title: 'Edit Checklist' }}
      />
      <Stack.Screen
        name="PersonalSearch"
        component={PersonalSearchScreen}
        options={{ headerShown: true, title: 'Find in My Layer' }}
      />
      <Stack.Screen
        name="PhotoGallery"
        component={PhotoGalleryScreen}
        options={{ headerShown: true, title: 'My Photos' }}
      />
      <Stack.Screen
        name="TagExplorer"
        component={TagExplorerScreen}
        options={{ headerShown: true, title: 'Journal Tags' }}
      />
      <Stack.Screen
        name="ActivityCalendar"
        component={ActivityCalendarScreen}
        options={{ headerShown: true, title: 'Activity Calendar' }}
      />
      <Stack.Screen
        name="ComparableConditions"
        component={ComparableConditionsScreen}
        options={{ headerShown: true, title: 'Comparable Conditions' }}
      />
      <Stack.Screen
        name="OnThisDay"
        component={OnThisDayScreen}
        options={{ headerShown: true, title: 'On This Day' }}
      />
      <Stack.Screen
        name="Favorites"
        component={FavoritesScreen}
        options={{ headerShown: true, title: 'Favorites' }}
      />
      <Stack.Screen
        name="DailyBriefing"
        component={DailyBriefingScreen}
        options={{ headerShown: true, title: 'Today' }}
      />
      <Stack.Screen
        name="YearInReview"
        component={YearInReviewScreen}
        options={{ headerShown: true, title: 'Year in Review' }}
      />
      <Stack.Screen
        name="ImportPicker"
        component={ImportPickerScreen}
        options={{ headerShown: true, title: 'Import KML / GPX' }}
      />
      <Stack.Screen
        name="Goals"
        component={GoalsScreen}
        options={{ headerShown: true, title: 'Annual Goals' }}
      />
      <Stack.Screen
        name="UpcomingTrips"
        component={UpcomingTripsScreen}
        options={{ headerShown: true, title: 'Upcoming Trips' }}
      />
    </>
  );
}

/** Hike Trip Planner tab stack */
function HikeTripPlannerStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="HikeTripPlannerMain" component={ATTripPlannerScreen} />
      {/* Personal-layer screens so a saved hike trip can deep-link to
          JournalEdit (Phase A.27 trip→journal handoff). */}
      {PersonalLayerScreens()}
    </Stack.Navigator>
  );
}

/**
 * AI tab stack: ChatScreen → mode-specific planner.
 *
 * Each mode's banner in ChatScreen deep-links to the right planner:
 *   - hunt → HuntPlan (HuntPlanScreen)
 *   - camp → CampTripPlan (CampTripPlannerScreen)
 *   - hike → HikeTripPlan (ATTripPlannerScreen)
 *   - fish → no planner yet; banner is hidden in Fish mode.
 */
function AIStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="ChatMain" component={ChatScreen} />
      <Stack.Screen
        name="HuntPlan"
        component={HuntPlanScreen}
        options={{ headerShown: true, title: 'AI Hunt Plan' }}
      />
      <Stack.Screen
        name="CampTripPlan"
        component={CampTripPlannerScreen}
        options={{ headerShown: true, title: 'AI Camp Trip Plan' }}
      />
      <Stack.Screen
        name="HikeTripPlan"
        component={ATTripPlannerScreen}
        options={{ headerShown: true, title: 'AI Hike Trip Plan' }}
      />
    </Stack.Navigator>
  );
}

/** Hunt-mode Gear tab stack — landing page is the curated Starter-gear list,
 *  with a deeper-read Gear Guide pushable on top. Added 2026-04-26
 *  (fork merge) per user directive: gear was previously buried under
 *  Resources/Info and needed a top-level entry. */
function GearStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen
        name="GearMain"
        component={StarterGearScreen}
        options={{ headerShown: true, title: 'Gear' }}
      />
      <Stack.Screen
        name="GearGuide"
        component={GearGuideScreen}
        options={{ headerShown: true, title: 'Gear Guide' }}
      />
    </Stack.Navigator>
  );
}

/** Resources tab stack: ResourcesHub → HarvestLog, Settings, Forum, StarterGear, HuntingVideos, GuideDirectory, GearGuide */
function ResourcesStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="ResourcesMain" component={ResourcesHubScreen} />
      <Stack.Screen
        name="HarvestLog"
        component={HarvestLogScreen}
        options={{ headerShown: true, title: 'Harvest Log' }}
      />
      <Stack.Screen
        name="Settings"
        component={SettingsScreen}
        options={{ headerShown: true, title: 'Settings' }}
      />
      <Stack.Screen
        name="Forum"
        component={ForumScreen}
        options={{ headerShown: true, title: 'Community Forum' }}
      />
      <Stack.Screen
        name="StarterGear"
        component={StarterGearScreen}
        options={{ headerShown: true, title: 'Starter Gear' }}
      />
      <Stack.Screen
        name="HuntingVideos"
        component={HuntingVideosScreen}
        options={{ headerShown: true, title: 'Videos & Channels' }}
      />
      <Stack.Screen
        name="GuideDirectory"
        component={GuideDirectoryScreen}
        options={{ headerShown: true, title: 'Licensed Guides' }}
      />
      <Stack.Screen
        name="GearGuide"
        component={GearGuideScreen}
        options={{ headerShown: true, title: "Buyer's Guides" }}
      />
      <Stack.Screen
        name="Weather"
        component={WeatherScreen}
        options={{ headerShown: true, title: 'Weather & Safety' }}
      />
      <Stack.Screen
        name="RutCalendar"
        component={RutCalendarScreen}
        options={{ headerShown: true, title: 'MD Rut Calendar' }}
      />
      <Stack.Screen
        name="BestTimes"
        component={BestTimesScreen}
        options={{ headerShown: true, title: 'Best Times' }}
      />
    </Stack.Navigator>
  );
}

// ── Tab icons ──
/**
 * TabIcon — renders a custom geometric symbol for each tab.
 * Uses View-based CSS shapes instead of emoji for reliable rendering.
 */
const TabIcon = ({
  label,
  focused,
}: {
  label: string;
  focused: boolean;
  mode?: string;
}) => {
  const color = focused ? Colors.oak : Colors.textMuted;

  if (label === 'MAP') {
    return (
      <View style={{ alignItems: 'center', opacity: focused ? 1 : 0.55 }}>
        <View style={{ width: 12, height: 12, borderRadius: 6, backgroundColor: color, marginBottom: -2 }} />
        <View
          style={{
            width: 0,
            height: 0,
            borderLeftWidth: 5,
            borderRightWidth: 5,
            borderTopWidth: 7,
            borderLeftColor: 'transparent',
            borderRightColor: 'transparent',
            borderTopColor: color,
          }}
        />
      </View>
    );
  }

  if (label === 'SCOUT') {
    return (
      <View style={{ opacity: focused ? 1 : 0.55, transform: [{ rotate: '45deg' }] }}>
        <View style={{ width: 14, height: 14, backgroundColor: color, borderRadius: 2 }} />
      </View>
    );
  }

  if (label === 'AI') {
    return (
      <View style={{ alignItems: 'center', justifyContent: 'center', opacity: focused ? 1 : 0.55 }}>
        <View
          style={{
            width: 18,
            height: 18,
            borderRadius: 9,
            borderWidth: 2,
            borderColor: color,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: color }} />
        </View>
      </View>
    );
  }

  if (label === 'GROUP') {
    return (
      <View style={{ alignItems: 'center', opacity: focused ? 1 : 0.55 }}>
        <View style={{ width: 12, height: 3, backgroundColor: color, borderRadius: 1 }} />
        <View style={{ width: 12, height: 3, backgroundColor: color, borderRadius: 1, marginTop: 2 }} />
        <View style={{ width: 12, height: 3, backgroundColor: color, borderRadius: 1, marginTop: 2 }} />
      </View>
    );
  }

  if (label === 'CAMP') {
    // 2026-04-26: cabin silhouette (was a triangle that read as "tent" or
    // "mountain"). Square body + sloped triangular roof + small chimney +
    // door + tiny window. Built from View primitives to match the rest of
    // the TabIcon DIY pattern.
    return (
      <View style={{ width: 22, height: 18, opacity: focused ? 1 : 0.55 }}>
        {/* Roof — triangle pointing up, spans the full body width */}
        <View
          style={{
            position: 'absolute',
            left: 0,
            top: 0,
            width: 0,
            height: 0,
            borderLeftWidth: 11,
            borderRightWidth: 11,
            borderBottomWidth: 7,
            borderLeftColor: 'transparent',
            borderRightColor: 'transparent',
            borderBottomColor: color,
          }}
        />
        {/* Chimney — narrow rect on top-right of the roof */}
        <View
          style={{
            position: 'absolute',
            left: 14,
            top: 0,
            width: 2.5,
            height: 5,
            backgroundColor: color,
          }}
        />
        {/* Body — solid block under the roof */}
        <View
          style={{
            position: 'absolute',
            left: 1,
            top: 7,
            width: 20,
            height: 11,
            backgroundColor: color,
          }}
        />
        {/* Door — small notch out of the body, bottom-center, in bg color */}
        <View
          style={{
            position: 'absolute',
            left: 9,
            top: 10,
            width: 4,
            height: 8,
            backgroundColor: Colors.surface,
            borderTopLeftRadius: 1,
            borderTopRightRadius: 1,
          }}
        />
        {/* Window — small square, bg color */}
        <View
          style={{
            position: 'absolute',
            left: 3,
            top: 10,
            width: 3,
            height: 3,
            backgroundColor: Colors.surface,
          }}
        />
      </View>
    );
  }

  if (label === 'INFO') {
    return (
      <View style={{ alignItems: 'center', justifyContent: 'center', opacity: focused ? 1 : 0.55, gap: 2 }}>
        <View style={{ width: 16, height: 3, backgroundColor: color, borderRadius: 1 }} />
        <View style={{ width: 16, height: 3, backgroundColor: color, borderRadius: 1 }} />
        <View style={{ width: 16, height: 3, backgroundColor: color, borderRadius: 1 }} />
      </View>
    );
  }

  if (label === 'HIKE_GEAR') {
    // 2026-04-26: Hike-mode Gear icon — a hiking boot silhouette in profile.
    // Toe up-slope, ankle collar, sole. Built from View primitives.
    return (
      <View
        style={{
          width: 22,
          height: 16,
          opacity: focused ? 1 : 0.55,
        }}
      >
        {/* Sole — long flat rectangle with a small toe lift on the right */}
        <View
          style={{
            position: 'absolute',
            left: 1,
            top: 12,
            width: 18,
            height: 2.5,
            backgroundColor: color,
            borderRadius: 1,
          }}
        />
        {/* Heel block — small bump on the left underside */}
        <View
          style={{
            position: 'absolute',
            left: 1,
            top: 14,
            width: 3,
            height: 1.5,
            backgroundColor: color,
          }}
        />
        {/* Toe — small upward angle at the right */}
        <View
          style={{
            position: 'absolute',
            left: 16,
            top: 9,
            width: 4,
            height: 4,
            backgroundColor: color,
            borderTopRightRadius: 2,
            borderBottomRightRadius: 1,
          }}
        />
        {/* Body of the boot — main upper, taller toward the ankle */}
        <View
          style={{
            position: 'absolute',
            left: 4,
            top: 5,
            width: 13,
            height: 7,
            backgroundColor: color,
            borderTopLeftRadius: 1.5,
            borderTopRightRadius: 1,
            borderBottomLeftRadius: 0.5,
            borderBottomRightRadius: 0.5,
          }}
        />
        {/* Ankle collar — slight padded ridge at top of the heel */}
        <View
          style={{
            position: 'absolute',
            left: 4,
            top: 3,
            width: 5,
            height: 2.5,
            backgroundColor: color,
            borderTopLeftRadius: 1.5,
            borderTopRightRadius: 1.5,
          }}
        />
      </View>
    );
  }

  if (label === 'FISH_GEAR') {
    // 2026-04-26: Fish-mode Gear tab icon — a fishing-rod silhouette with a
    // line dropping down to a small lure. Built from View primitives to
    // match the rest of the TabIcon DIY pattern.
    return (
      <View
        style={{
          width: 22,
          height: 16,
          opacity: focused ? 1 : 0.55,
        }}
      >
        {/* Rod (diagonal long line, top-left to mid-right) */}
        <View
          style={{
            position: 'absolute',
            left: 1,
            top: 1,
            width: 18,
            height: 1.5,
            backgroundColor: color,
            borderRadius: 0.75,
            transform: [{ rotate: '20deg' }],
          }}
        />
        {/* Reel — small block on the rod's grip end (bottom-left) */}
        <View
          style={{
            position: 'absolute',
            left: 0,
            top: 4,
            width: 3,
            height: 4,
            backgroundColor: color,
            borderRadius: 0.5,
          }}
        />
        {/* Line dropping straight down from the rod tip */}
        <View
          style={{
            position: 'absolute',
            left: 17,
            top: 4,
            width: 1,
            height: 8,
            backgroundColor: color,
          }}
        />
        {/* Hook / lure — tiny circle at the bottom of the line */}
        <View
          style={{
            position: 'absolute',
            left: 15,
            top: 12,
            width: 4,
            height: 4,
            backgroundColor: color,
            borderRadius: 2,
          }}
        />
      </View>
    );
  }

  if (label === 'GEAR') {
    // 2026-04-26 (fork merge, second pass): hunting-rifle silhouette.
    // Reads as a bolt-action sporting rifle, NOT an AR/army profile.
    //   • long thin barrel (left ~70% of width)
    //   • scope tube on top, with two ring stubs
    //   • bolt handle nub on the upper-rear of the receiver
    //   • thicker receiver/wrist
    //   • curved wood stock with a sloped comb dropping to a recoil pad
    //   • slim trigger guard hanging below the receiver
    return (
      <View
        style={{
          width: 26,
          height: 16,
          opacity: focused ? 1 : 0.55,
          justifyContent: 'center',
        }}
      >
        {/* Scope tube — sits on top of the receiver */}
        <View
          style={{
            position: 'absolute',
            left: 8,
            top: 1,
            width: 9,
            height: 2,
            backgroundColor: color,
            borderRadius: 1,
          }}
        />
        {/* Front scope ring */}
        <View
          style={{
            position: 'absolute',
            left: 8,
            top: 3,
            width: 1.5,
            height: 2,
            backgroundColor: color,
          }}
        />
        {/* Rear scope ring */}
        <View
          style={{
            position: 'absolute',
            left: 15,
            top: 3,
            width: 1.5,
            height: 2,
            backgroundColor: color,
          }}
        />
        {/* Barrel — long & thin, runs from the muzzle to the receiver */}
        <View
          style={{
            position: 'absolute',
            left: 0,
            top: 7,
            width: 16,
            height: 1.5,
            backgroundColor: color,
            borderRadius: 0.75,
          }}
        />
        {/* Receiver / magazine well */}
        <View
          style={{
            position: 'absolute',
            left: 13,
            top: 6,
            width: 5,
            height: 4,
            backgroundColor: color,
            borderRadius: 0.5,
          }}
        />
        {/* Bolt handle nub — protrudes from the upper-rear of the receiver */}
        <View
          style={{
            position: 'absolute',
            left: 16.5,
            top: 4,
            width: 1.5,
            height: 2.5,
            backgroundColor: color,
            borderRadius: 0.5,
          }}
        />
        {/* Trigger guard — slim curve below the receiver */}
        <View
          style={{
            position: 'absolute',
            left: 14,
            top: 10,
            width: 3,
            height: 2,
            backgroundColor: color,
            borderTopLeftRadius: 0.5,
            borderBottomLeftRadius: 1,
            borderBottomRightRadius: 1,
          }}
        />
        {/* Wrist of the stock — narrow neck behind the receiver */}
        <View
          style={{
            position: 'absolute',
            left: 17,
            top: 8,
            width: 4,
            height: 2,
            backgroundColor: color,
            borderRadius: 0.5,
          }}
        />
        {/* Buttstock — wider toward the recoil pad, gentle drop */}
        <View
          style={{
            position: 'absolute',
            left: 19,
            top: 7,
            width: 7,
            height: 5,
            backgroundColor: color,
            borderTopLeftRadius: 0.5,
            borderTopRightRadius: 0.5,
            borderBottomLeftRadius: 0.5,
            borderBottomRightRadius: 2,
          }}
        />
      </View>
    );
  }

  if (label === 'SPOTS') {
    return (
      <View style={{ flexDirection: 'row', alignItems: 'center', opacity: focused ? 1 : 0.55, gap: 3 }}>
        <View style={{ width: 5, height: 5, borderRadius: 3, backgroundColor: color }} />
        <View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: color }} />
        <View style={{ width: 5, height: 5, borderRadius: 3, backgroundColor: color }} />
      </View>
    );
  }

  return (
    <Text style={{ fontSize: 10, color, fontWeight: '700', opacity: focused ? 1 : 0.55 }}>
      {label}
    </Text>
  );
};

/** Maryland flag stripe for the header right side. */
const MdFlagStripe = () => (
  <View style={styles.mdFlagStripe}>
    <View style={[styles.mdStripeBlock, { backgroundColor: Colors.mdRed }]} />
    <View style={[styles.mdStripeBlock, { backgroundColor: Colors.mdGold }]} />
    <View style={[styles.mdStripeBlock, { backgroundColor: Colors.mdBlack }]} />
    <View style={[styles.mdStripeBlock, { backgroundColor: Colors.mdWhite }]} />
  </View>
);

// ── Shared screen options builder ──
/**
 * Shared Tab.Navigator screenOptions used by all four mode tab stacks.
 * Keeps the ActivityModePicker in the header title slot so users can
 * cross-switch to a different specialized stack without returning home.
 */
function useSharedTabOptions() {
  const insets = useSafeAreaInsets();
  return {
    headerShown: true,
    // 2026-04-26 (fork merge): bumped from oak/textMuted (both dark earth
    // tones on a dark earth-tone bar — ~2.4:1 contrast, fails WCAG AA) to
    // mdGold for active (Maryland flag gold, ~11.5:1) and textSecondary
    // for inactive (~4.9:1, passes AA). Tab labels are now legible.
    tabBarActiveTintColor: Colors.mdGold,
    tabBarInactiveTintColor: Colors.textSecondary,
    tabBarStyle: {
      ...styles.tabBar,
      paddingBottom: Math.max(4, insets.bottom),
      height: 56 + insets.bottom,
    },
    headerStyle: styles.header,
    headerTintColor: Colors.textPrimary,
    headerTitleStyle: styles.headerTitle,
    tabBarLabelStyle: styles.tabLabel,
    headerTitle: () => <ActivityModePicker />,
    headerRight: () => <MdFlagStripe />,
  };
}

// ── Mode-specific Tab.Navigator components ──

/** Hunt mode (6 tabs): Map | Scout | AI | Camp | Gear | Info
 *
 * 2026-04-26 (fork merge): added Gear tab per user request — curated
 * gear lists were buried under Resources/Info and had no top-level
 * surface. Promoted Gear to a peer tab with its own stack so users can
 * jump straight in. Deer Camp label compacted to "Camp" so 6 short
 * labels fit comfortably on iPhone 17 Pro width (~65pt per tab).
 */
function HuntTabs() {
  const sharedScreenOptions = useSharedTabOptions();
  return (
    <Tab.Navigator screenOptions={sharedScreenOptions}>
      <Tab.Screen
        name="MapTab"
        component={MapStack}
        options={{
          tabBarLabel: 'Map',
          tabBarIcon: ({ focused }) => <TabIcon label="MAP" focused={focused} />,
        }}
      />
      <Tab.Screen
        name="ScoutTab"
        component={ScoutScreen}
        options={{
          tabBarLabel: 'Scout',
          tabBarIcon: ({ focused }) => <TabIcon label="SCOUT" focused={focused} mode="hunt" />,
        }}
      />
      <Tab.Screen
        name="ChatTab"
        component={AIStack}
        options={{
          tabBarLabel: 'AI',
          tabBarIcon: ({ focused }) => <TabIcon label="AI" focused={focused} mode="hunt" />,
        }}
      />
      <Tab.Screen
        name="DeerCampTab"
        component={DeerCampStack}
        options={{
          // 2026-04-26 (fork merge): render label as a two-line "Deer / Camp"
          // so the tab matches the in-screen "Deer Camp" header. Going through
          // a render function (not a plain string) is the only way RN's
          // bottom-tabs respects an embedded "\n".
          tabBarLabel: ({ focused, color }) => (
            <Text
              numberOfLines={2}
              style={{
                color,
                fontSize: 10,
                lineHeight: 11,
                textAlign: 'center',
                fontWeight: focused ? '700' : '500',
                marginTop: 2,
              }}
            >
              Deer{'\n'}Camp
            </Text>
          ),
          tabBarIcon: ({ focused }) => <TabIcon label="CAMP" focused={focused} mode="hunt" />,
        }}
      />
      <Tab.Screen
        name="HuntGearTab"
        component={GearStack}
        options={{
          tabBarLabel: 'Gear',
          tabBarIcon: ({ focused }) => <TabIcon label="GEAR" focused={focused} mode="hunt" />,
        }}
      />
      <Tab.Screen
        name="ResourcesTab"
        component={ResourcesStack}
        options={{
          tabBarLabel: 'Info',
          tabBarIcon: ({ focused }) => <TabIcon label="INFO" focused={focused} mode="hunt" />,
        }}
      />
    </Tab.Navigator>
  );
}

/** Fish mode (4 tabs): Map | Spots | AI | Resources */
function FishTabs() {
  const sharedScreenOptions = useSharedTabOptions();
  return (
    <Tab.Navigator screenOptions={sharedScreenOptions}>
      <Tab.Screen
        name="FishMapTab"
        component={FishMapStack}
        options={{
          tabBarLabel: 'Map',
          tabBarIcon: ({ focused }) => <TabIcon label="MAP" focused={focused} mode="fish" />,
        }}
      />
      <Tab.Screen
        name="FishSpotsTab"
        component={FishSpotsStack}
        options={{
          tabBarLabel: 'Spots',
          tabBarIcon: ({ focused }) => <TabIcon label="SPOTS" focused={focused} mode="fish" />,
        }}
      />
      <Tab.Screen
        name="FishAITab"
        component={AIStack}
        options={{
          tabBarLabel: 'AI',
          tabBarIcon: ({ focused }) => <TabIcon label="AI" focused={focused} mode="fish" />,
        }}
      />
      <Tab.Screen
        name="FishGearTab"
        component={GearStack}
        options={{
          tabBarLabel: 'Gear',
          tabBarIcon: ({ focused }) => <TabIcon label="FISH_GEAR" focused={focused} mode="fish" />,
        }}
      />
      <Tab.Screen
        name="FishResourcesTab"
        component={ResourcesStack}
        options={{
          tabBarLabel: 'Info',
          tabBarIcon: ({ focused }) => <TabIcon label="INFO" focused={focused} mode="fish" />,
        }}
      />
    </Tab.Navigator>
  );
}

/**
 * Camp mode (6 tabs after 2026-04-28 audit): Map | Trip Planner | Group | AI | Gear | Info.
 *
 * AI tab added 2026-04-28 — `campingChatKnowledge.ts` (1,312 lines, 7
 * intent handlers) plus the round-104 `augmentCampWithLocalPros`
 * wrapper had been shipping orphaned because no Camp tab mounted
 * AIStack. Caught by the new wiring-integrity test.
 */
function CampTabs() {
  const sharedScreenOptions = useSharedTabOptions();
  return (
    <Tab.Navigator screenOptions={sharedScreenOptions}>
      <Tab.Screen
        name="CampMapTab"
        component={CampMapStack}
        options={{
          tabBarLabel: 'Map',
          tabBarIcon: ({ focused }) => <TabIcon label="MAP" focused={focused} mode="camp" />,
        }}
      />
      <Tab.Screen
        name="CampTripPlannerTab"
        component={CampTripPlannerStack}
        options={{
          tabBarLabel: 'Trip Planner',
          tabBarIcon: ({ focused }) => <TabIcon label="SCOUT" focused={focused} mode="camp" />,
        }}
      />
      <Tab.Screen
        name="GroupCampTab"
        component={GroupCampScreen}
        options={{
          tabBarLabel: 'Group',
          tabBarIcon: ({ focused }) => <TabIcon label="CAMP" focused={focused} mode="camp" />,
        }}
      />
      <Tab.Screen
        name="CampAITab"
        component={AIStack}
        options={{
          tabBarLabel: 'AI',
          tabBarIcon: ({ focused }) => <TabIcon label="AI" focused={focused} mode="camp" />,
        }}
      />
      <Tab.Screen
        name="CampGearTab"
        component={CampGearScreen}
        options={{
          tabBarLabel: 'Gear',
          tabBarIcon: ({ focused }) => <TabIcon label="SPOTS" focused={focused} mode="camp" />,
        }}
      />
      <Tab.Screen
        name="CampResourcesTab"
        component={CampResourcesScreen}
        options={{
          tabBarLabel: 'Info',
          tabBarIcon: ({ focused }) => <TabIcon label="INFO" focused={focused} mode="camp" />,
        }}
      />
    </Tab.Navigator>
  );
}

/**
 * Hike mode (6 tabs after 2026-04-28 audit): Map | Trails | Trip | AI | Gear | Info.
 *
 * AI tab added 2026-04-28 — `hikingChatKnowledge.ts` (1,003 lines, 8
 * intent handlers) plus the round-90 `augmentHikeWithLocalPros`
 * wrapper had been shipping orphaned because no Hike tab mounted
 * AIStack. Caught by the new wiring-integrity test.
 */
function HikeTabs() {
  const sharedScreenOptions = useSharedTabOptions();
  return (
    <Tab.Navigator screenOptions={sharedScreenOptions}>
      <Tab.Screen
        name="HikeMapTab"
        component={HikeMapStack}
        options={{
          tabBarLabel: 'Map',
          tabBarIcon: ({ focused }) => <TabIcon label="MAP" focused={focused} mode="hike" />,
        }}
      />
      <Tab.Screen
        name="HikeTrailsTab"
        component={HikeTrailBrowserScreen}
        options={{
          tabBarLabel: 'Trails',
          tabBarIcon: ({ focused }) => <TabIcon label="SPOTS" focused={focused} mode="hike" />,
        }}
      />
      <Tab.Screen
        name="HikeTripPlannerTab"
        component={HikeTripPlannerStack}
        options={{
          tabBarLabel: 'Trip',
          tabBarIcon: ({ focused }) => <TabIcon label="SCOUT" focused={focused} mode="hike" />,
        }}
      />
      <Tab.Screen
        name="HikeAITab"
        component={AIStack}
        options={{
          tabBarLabel: 'AI',
          tabBarIcon: ({ focused }) => <TabIcon label="AI" focused={focused} mode="hike" />,
        }}
      />
      <Tab.Screen
        name="HikeGearTab"
        component={GearStack}
        options={{
          tabBarLabel: 'Gear',
          tabBarIcon: ({ focused }) => <TabIcon label="HIKE_GEAR" focused={focused} mode="hike" />,
        }}
      />
      <Tab.Screen
        name="HikeResourcesTab"
        component={HikeResourcesScreen}
        options={{
          tabBarLabel: 'Info',
          tabBarIcon: ({ focused }) => <TabIcon label="INFO" focused={focused} mode="hike" />,
        }}
      />
    </Tab.Navigator>
  );
}

/**
 * Root app navigator — Stack with ModePickerScreen as initial route.
 *
 * ModePickerScreen sets the active mode via context and pushes the target
 * mode's Tab.Navigator. Back from a mode returns to the picker. The
 * ActivityModePicker header dropdown (inside each mode's tabs) allows
 * lateral switching between modes without going home first — it calls
 * setActiveMode then navigation.navigate('HuntTabs' | 'FishTabs' | ...).
 */
export default function AppNavigator() {
  return (
    <Stack.Navigator
      initialRouteName="ModePicker"
      screenOptions={{ headerShown: false }}
    >
      <Stack.Screen name="ModePicker" component={ModePickerScreen} />
      <Stack.Screen name="HuntTabs" component={HuntTabs} />
      <Stack.Screen name="FishTabs" component={FishTabs} />
      <Stack.Screen name="CampTabs" component={CampTabs} />
      <Stack.Screen name="HikeTabs" component={HikeTabs} />
    </Stack.Navigator>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: Colors.surface,
    borderTopColor: Colors.mud,
    borderTopWidth: 1,
    paddingTop: 6,
    paddingBottom: 4,
    height: 56,
  },
  tabLabel: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.3,
    marginTop: 2,
  },
  header: {
    backgroundColor: Colors.background,
    borderBottomColor: Colors.mud,
    borderBottomWidth: 1,
    elevation: 0,
    shadowOpacity: 0,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.tan,
    letterSpacing: 0.5,
  },
  mdFlagStripe: {
    flexDirection: 'row',
    marginRight: 16,
    borderRadius: 3,
    overflow: 'hidden',
  },
  mdStripeBlock: {
    width: 8,
    height: 16,
  },
});
