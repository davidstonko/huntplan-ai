/**
 * @file AppNavigator.tsx
 * @description Root app navigator — mode-picker home + per-mode tab stacks.
 *
 * 2026-09-18 restructure: every mode now has the SAME five tabs so the
 * app reads as one product instead of four loosely related ones:
 *
 *   Map | Plan | Log | AI | More
 *
 * Tab route names are a CONTRACT — `MapTab`, `PlanTab`, `LogTab`,
 * `AITab`, `MoreTab` — identical in every mode, so any screen can
 * `navigation.navigate('LogTab')` without knowing which mode it is in.
 *
 *   Map  → the per-mode map stack (MapMain / FishMapMain / CampMapMain /
 *          HikeMapMain) plus the handful of personal-layer editors the
 *          map surfaces push directly (WaypointEdit, MarkupEdit, ...).
 *   Plan → Hunt: Scout. Fish: Spots. Camp: Trip Planner.
 *          Hike: Trail browser → AT Trip Planner.
 *   Log  → PersonalHub root + the personal-layer screens registered
 *          ONCE (previously stamped into six stacks) + HarvestLog /
 *          CatchLog.
 *   AI   → ChatMain + only this mode's planner route.
 *   More → MoreScreen hub: regulations, links, gear, camps, forum,
 *          weather, offline maps, backup, settings, contact.
 *
 * Cross-mode routes (Settings, Forum, Gear, OfflineMaps, Weather) are
 * registered ONCE on the root Stack so `navigate('Gear')` resolves from
 * any tab in any mode.
 *
 * The entry point is still ModePickerScreen; tapping a card sets the
 * active mode (context) and pushes the mode's Tab.Navigator onto the
 * root Stack. The ActivityModePicker header dropdown remains as a fast
 * cross-mode switcher.
 */

import React from 'react';
import { StyleSheet, View, Text } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import { useSafeAreaInsets } from 'react-native-safe-area-context';
import ActivityModePicker from '../components/navigation/ActivityModePicker';
import { useActivityMode } from '../context/ActivityModeContext';

// ── Home picker ──
import ModePickerScreen from '../screens/ModePickerScreen';

// ── Map tab roots ──
import MapScreen from '../screens/MapScreen';
import FishMapScreen from '../screens/FishMapScreen';
import CampMapScreen from '../screens/CampMapScreen';
import HikeMapScreen from '../screens/HikeMapScreen';

// ── Plan tab roots ──
import ScoutScreen from '../screens/ScoutScreen';
import FishSpotsScreen from '../screens/FishSpotsScreen';
import CampTripPlannerScreen from '../screens/CampTripPlannerScreen';
import HikeTrailBrowserScreen from '../screens/HikeTrailBrowserScreen';
import ATTripPlannerScreen from '../screens/ATTripPlannerScreen';

// ── AI tab ──
import ChatScreen from '../screens/ChatScreen';
import HuntPlanScreen from '../screens/HuntPlanScreen';

// ── More tab ──
import MoreScreen from '../screens/MoreScreen';
import ResourcesHubScreen from '../screens/ResourcesHubScreen';
import CampResourcesScreen from '../screens/CampResourcesScreen';
import HikeResourcesScreen from '../screens/HikeResourcesScreen';
import DeerCampScreen from '../screens/DeerCampScreen';
import CampAreaPickerScreen from '../screens/CampAreaPickerScreen';
import GroupCampScreen from '../screens/GroupCampScreen';
import RutCalendarScreen from '../screens/RutCalendarScreen';
import BestTimesScreen from '../screens/BestTimesScreen';
import WindForecastScreen from '../screens/WindForecastScreen';

// ── Root-level cross-mode screens ──
import SettingsScreen from '../screens/SettingsScreen';
import ForumScreen from '../screens/ForumScreen';
import OfflineMapsScreen from '../screens/OfflineMapsScreen';
import WeatherScreen from '../screens/WeatherScreen';
import StarterGearScreen from '../screens/StarterGearScreen';
import CampGearScreen from '../screens/CampGearScreen';

// ── Log tab ──
import PersonalHubScreen from '../screens/PersonalHubScreen';
import HarvestLogScreen from '../screens/HarvestLogScreen';
import { CatchLogScreen } from '../screens/CatchLogScreen';
import WaypointListScreen from '../screens/WaypointListScreen';
import WaypointEditScreen from '../screens/WaypointEditScreen';
import TrackRecorderScreen from '../screens/TrackRecorderScreen';
import TrackListScreen from '../screens/TrackListScreen';
import TrackDetailScreen from '../screens/TrackDetailScreen';
import TrackInsightsScreen from '../screens/TrackInsightsScreen';
import MarkupListScreen from '../screens/MarkupListScreen';
import MarkupEditScreen from '../screens/MarkupEditScreen';
import MarkupDrawScreen from '../screens/MarkupDrawScreen';
import PersonalStatsScreen from '../screens/PersonalStatsScreen';
import JournalListScreen from '../screens/JournalListScreen';
import JournalEditScreen from '../screens/JournalEditScreen';
import GearChecklistListScreen from '../screens/GearChecklistListScreen';
import GearChecklistEditScreen from '../screens/GearChecklistEditScreen';
import PersonalSearchScreen from '../screens/PersonalSearchScreen';
import PhotoGalleryScreen from '../screens/PhotoGalleryScreen';
import TagExplorerScreen from '../screens/TagExplorerScreen';
import ActivityCalendarScreen from '../screens/ActivityCalendarScreen';
import ComparableConditionsScreen from '../screens/ComparableConditionsScreen';
import OnThisDayScreen from '../screens/OnThisDayScreen';
import FavoritesScreen from '../screens/FavoritesScreen';
import DailyBriefingScreen from '../screens/DailyBriefingScreen';
import YearInReviewScreen from '../screens/YearInReviewScreen';
import ImportPickerScreen from '../screens/ImportPickerScreen';
import GoalsScreen from '../screens/GoalsScreen';
import UpcomingTripsScreen from '../screens/UpcomingTripsScreen';

import Colors from '../theme/colors';
import { TAB, MODE_TABS_ROUTE, type ActivityMode } from './routes';
import { deriveTabAccessibilityLabel } from './tabA11y';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

// ════════════════════════════════════════════════════════════════════
// Shared screen groups
// ════════════════════════════════════════════════════════════════════

/**
 * Personal-layer editors the MAP surfaces push directly (long-press →
 * WaypointEdit, draw → MarkupEdit/MarkupDraw, record → TrackRecorder →
 * TrackDetail). These must live INSIDE each map stack: a plain
 * `navigate('WaypointEdit')` from a map cannot reach a sibling tab's
 * stack unless that stack has already been mounted. Everything else in
 * the personal layer lives once, in LogStack.
 */
function MapLayerScreens() {
  return (
    <>
      <Stack.Screen
        name="WaypointEdit"
        component={WaypointEditScreen}
        options={{ headerShown: false }}
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
        name="TrackRecorder"
        component={TrackRecorderScreen}
        options={{ headerShown: true, title: 'Record Track' }}
      />
      <Stack.Screen
        name="TrackDetail"
        component={TrackDetailScreen}
        options={{ headerShown: true, title: 'Track' }}
      />
    </>
  );
}

/**
 * The full personal layer — registered ONCE, in LogStack. Screens read
 * `mode` from route params (seeded by the navigating screen, falling
 * back to the active mode) so they filter correctly.
 */
function PersonalLayerScreens() {
  return (
    <>
      <Stack.Screen
        name="WaypointList"
        component={WaypointListScreen}
        options={{ headerShown: true, title: 'Waypoints' }}
      />
      <Stack.Screen
        name="TrackList"
        component={TrackListScreen}
        options={{ headerShown: true, title: 'My Tracks' }}
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

// ════════════════════════════════════════════════════════════════════
// Map tab stacks (one per mode — root screen names are a contract the
// map screens rely on for nested navigation: MapMain, FishMapMain,
// CampMapMain, HikeMapMain)
// ════════════════════════════════════════════════════════════════════

function MapStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="MapMain" component={MapScreen} />
      {MapLayerScreens()}
    </Stack.Navigator>
  );
}

function FishMapStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="FishMapMain" component={FishMapScreen} />
      {MapLayerScreens()}
    </Stack.Navigator>
  );
}

function CampMapStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="CampMapMain" component={CampMapScreen} />
      {MapLayerScreens()}
    </Stack.Navigator>
  );
}

function HikeMapStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="HikeMapMain" component={HikeMapScreen} />
      {MapLayerScreens()}
    </Stack.Navigator>
  );
}

// ════════════════════════════════════════════════════════════════════
// Plan tab stacks
// ════════════════════════════════════════════════════════════════════

/** Fish Plan: saved spots + trip notes. */
function FishSpotsStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="FishSpotsMain" component={FishSpotsScreen} />
    </Stack.Navigator>
  );
}

/** Camp Plan: the location-aware camping trip planner. */
function CampPlanStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="CampTripPlannerMain" component={CampTripPlannerScreen} />
    </Stack.Navigator>
  );
}

/** Hike Plan: trail browser first, AT trip planner pushable. */
function HikePlanStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="HikeTrailsMain" component={HikeTrailBrowserScreen} />
      <Stack.Screen
        name="HikeTripPlannerMain"
        component={ATTripPlannerScreen}
        options={{ headerShown: true, title: 'Plan a Trip' }}
      />
    </Stack.Navigator>
  );
}

// ════════════════════════════════════════════════════════════════════
// Log tab stack — the personal layer, registered once.
// ════════════════════════════════════════════════════════════════════

function LogStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="PersonalHub" component={PersonalHubScreen} />
      <Stack.Screen
        name="HarvestLog"
        component={HarvestLogScreen}
        options={{ headerShown: true, title: 'Harvest Log' }}
      />
      <Stack.Screen
        name="CatchLog"
        component={CatchLogScreen}
        options={{ headerShown: true, title: 'Catch Log' }}
      />
      {/* Editors the map stacks also carry — the Log tab needs them for
          the quick-add FAB + list → detail pushes. */}
      {MapLayerScreens()}
      {PersonalLayerScreens()}
    </Stack.Navigator>
  );
}

// ════════════════════════════════════════════════════════════════════
// AI tab stack — ChatMain + ONLY this mode's planner route.
//
//   hunt → HuntPlan (HuntPlanScreen)
//   camp → CampTripPlan (CampTripPlannerScreen)
//   hike → HikeTripPlan (ATTripPlannerScreen)
//   fish → no planner; ChatScreen hides its banner in Fish mode.
//
// The mode is fixed per Tab.Navigator (not read from context) so a
// mode switch via the header dropdown never removes a route out from
// under a still-mounted tab stack.
//
// TODO(hunt gear path): Gear moved to the More tab. Camp/Hike planners
// and the Log hub carry a "Gear" row back to it, but Hunt's Plan tab
// (ScoutScreen) and HuntPlanScreen are owned by the map/chat worktree —
// add a gear card on the AI Hunt Plan result (navigate('Gear')) there.
// ════════════════════════════════════════════════════════════════════

function AIStack({ mode }: { mode: ActivityMode }) {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="ChatMain" component={ChatScreen} />
      {mode === 'hunt' ? (
        <Stack.Screen
          name="HuntPlan"
          component={HuntPlanScreen}
          options={{ headerShown: true, title: 'AI Hunt Plan' }}
        />
      ) : null}
      {mode === 'camp' ? (
        <Stack.Screen
          name="CampTripPlan"
          component={CampTripPlannerScreen}
          options={{ headerShown: true, title: 'AI Camp Trip Plan' }}
        />
      ) : null}
      {mode === 'hike' ? (
        <Stack.Screen
          name="HikeTripPlan"
          component={ATTripPlannerScreen}
          options={{ headerShown: true, title: 'AI Hike Trip Plan' }}
        />
      ) : null}
    </Stack.Navigator>
  );
}

function HuntAIStack() {
  return <AIStack mode="hunt" />;
}
function FishAIStack() {
  return <AIStack mode="fish" />;
}
function CampAIStack() {
  return <AIStack mode="camp" />;
}
function HikeAIStack() {
  return <AIStack mode="hike" />;
}

// ════════════════════════════════════════════════════════════════════
// More tab stack — MoreScreen hub + every destination registered once.
// Mode-specific rows are decided inside MoreScreen; the stack itself
// registers the union so a stale mode never hits an unknown route.
// ════════════════════════════════════════════════════════════════════

function MoreStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="MoreMain" component={MoreScreen} />
      {/* Hunt + Fish regulations / links hub (segmented, mode-aware). Also
          the target of MapScreen's "Regulations" deep-link
          (`navigate('MoreTab', { screen: 'ResourcesMain', params })`). */}
      <Stack.Screen
        name="ResourcesMain"
        component={ResourcesHubScreen}
        options={{ headerShown: true, title: 'Regulations & Guides' }}
      />
      <Stack.Screen
        name="CampResources"
        component={CampResourcesScreen}
        options={{ headerShown: true, title: 'Camp Resources' }}
      />
      <Stack.Screen
        name="HikeResources"
        component={HikeResourcesScreen}
        options={{ headerShown: true, title: 'Hike Resources' }}
      />
      {/* Hunt tools reachable from ResourcesScreen's HUNT TOOLS cards. */}
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
      <Stack.Screen
        name="WindForecast"
        component={WindForecastScreen}
        options={{ headerShown: true, title: 'Wind Forecast' }}
      />
      {/* Deer Camp (Hunt) — CampAreaPicker is a peer Stack screen pushed
          from the create-modal (iOS modal-stack races ruled out the
          in-screen Modal approach, 2026-04-26). */}
      <Stack.Screen
        name="DeerCampMain"
        component={DeerCampScreen}
        options={{ headerShown: true, title: 'Deer Camp' }}
      />
      <Stack.Screen
        name="CampAreaPicker"
        component={CampAreaPickerScreen}
        options={{ presentation: 'modal', animation: 'slide_from_bottom' }}
      />
      {/* Group Camp (Camp) */}
      <Stack.Screen
        name="GroupCampMain"
        component={GroupCampScreen}
        options={{ headerShown: true, title: 'Group Camp' }}
      />
    </Stack.Navigator>
  );
}

// ════════════════════════════════════════════════════════════════════
// Root-level cross-mode screens
// ════════════════════════════════════════════════════════════════════

/**
 * Gear — one root route, mode-aware component. Camp has its own curated
 * gear screen; Hunt / Fish / Hike share StarterGearScreen, which reads
 * the active mode for its category picker.
 */
function GearScreen() {
  const { activeMode } = useActivityMode();
  return activeMode === 'camp' ? <CampGearScreen /> : <StarterGearScreen />;
}

// ── Tab icons ──
/**
 * TabIcon — renders a custom geometric symbol for each tab.
 * Uses View-based CSS shapes instead of emoji for reliable rendering.
 * One glyph per tab, shared by every mode: MAP, PLAN, LOG, AI, MORE.
 */
const TabIcon = ({ label, focused }: { label: string; focused: boolean }) => {
  const color = focused ? Colors.oak : Colors.textMuted;

  if (label === 'MAP') {
    // Map pin — disc over a downward triangle.
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

  if (label === 'PLAN') {
    // Compass rose — rotated square (the long-standing Scout glyph).
    return (
      <View style={{ opacity: focused ? 1 : 0.55, transform: [{ rotate: '45deg' }] }}>
        <View style={{ width: 14, height: 14, backgroundColor: color, borderRadius: 2 }} />
      </View>
    );
  }

  if (label === 'LOG') {
    // Journal page — outlined rectangle with two ruled lines.
    return (
      <View
        style={{
          width: 14,
          height: 17,
          borderRadius: 2,
          borderWidth: 2,
          borderColor: color,
          opacity: focused ? 1 : 0.55,
          paddingHorizontal: 2,
          paddingTop: 3,
          gap: 2,
        }}
      >
        <View style={{ height: 2, backgroundColor: color, borderRadius: 1 }} />
        <View style={{ height: 2, backgroundColor: color, borderRadius: 1 }} />
      </View>
    );
  }

  if (label === 'AI') {
    // Chat ring — outlined circle with a filled center.
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

  if (label === 'MORE') {
    // Three dots.
    return (
      <View style={{ flexDirection: 'row', alignItems: 'center', opacity: focused ? 1 : 0.55, gap: 3 }}>
        <View style={{ width: 5, height: 5, borderRadius: 3, backgroundColor: color }} />
        <View style={{ width: 5, height: 5, borderRadius: 3, backgroundColor: color }} />
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

function useSharedTabOptions() {
  const insets = useSafeAreaInsets();
  return {
    headerShown: true,
    // mdGold active (~11.5:1) / textSecondary inactive (~4.9:1) — both
    // pass WCAG AA on the dark tab bar.
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

const TAB_ICON: Record<string, string> = {
  [TAB.MAP]: 'MAP',
  [TAB.PLAN]: 'PLAN',
  [TAB.LOG]: 'LOG',
  [TAB.AI]: 'AI',
  [TAB.MORE]: 'MORE',
};

const TAB_LABEL: Record<string, string> = {
  [TAB.MAP]: 'Map',
  [TAB.PLAN]: 'Plan',
  [TAB.LOG]: 'Log',
  [TAB.AI]: 'AI',
  [TAB.MORE]: 'More',
};

/** Per-tab options: label, icon, and accessibility label — one source of truth. */
function tabOptions(routeName: string, mode: ActivityMode) {
  const icon = TAB_ICON[routeName] ?? routeName;
  return {
    tabBarLabel: TAB_LABEL[routeName] ?? routeName,
    tabBarIcon: ({ focused }: { focused: boolean }) => <TabIcon label={icon} focused={focused} />,
    tabBarAccessibilityLabel: deriveTabAccessibilityLabel(routeName, mode),
  };
}

// ── Mode-specific Tab.Navigator components ──
// Each mode: Map | Plan | Log | AI | More (route names are the contract).

interface ModeTabsProps {
  mode: ActivityMode;
  map: React.ComponentType<any>;
  plan: React.ComponentType<any>;
  ai: React.ComponentType<any>;
}

function ModeTabs({ mode, map, plan, ai }: ModeTabsProps) {
  const sharedScreenOptions = useSharedTabOptions();
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({ ...sharedScreenOptions, ...tabOptions(route.name, mode) })}
    >
      <Tab.Screen name={TAB.MAP} component={map} />
      <Tab.Screen name={TAB.PLAN} component={plan} />
      <Tab.Screen name={TAB.LOG} component={LogStack} />
      <Tab.Screen name={TAB.AI} component={ai} />
      <Tab.Screen name={TAB.MORE} component={MoreStack} />
    </Tab.Navigator>
  );
}

/** Hunt: Map | Plan (Scout) | Log | AI | More */
function HuntTabs() {
  return <ModeTabs mode="hunt" map={MapStack} plan={ScoutScreen} ai={HuntAIStack} />;
}

/** Fish: Map | Plan (Spots) | Log | AI | More */
function FishTabs() {
  return <ModeTabs mode="fish" map={FishMapStack} plan={FishSpotsStack} ai={FishAIStack} />;
}

/** Camp: Map | Plan (Trip Planner) | Log | AI | More */
function CampTabs() {
  return <ModeTabs mode="camp" map={CampMapStack} plan={CampPlanStack} ai={CampAIStack} />;
}

/** Hike: Map | Plan (Trails → AT Trip Planner) | Log | AI | More */
function HikeTabs() {
  return <ModeTabs mode="hike" map={HikeMapStack} plan={HikePlanStack} ai={HikeAIStack} />;
}

/**
 * Root app navigator — Stack with ModePickerScreen as initial route.
 *
 * ModePickerScreen sets the active mode via context and pushes the target
 * mode's Tab.Navigator. Back from a mode returns to the picker. The
 * ActivityModePicker header dropdown (inside each mode's tabs) allows
 * lateral switching between modes without going home first — it calls
 * setActiveMode then navigation.navigate('HuntTabs' | 'FishTabs' | ...).
 *
 * Cross-mode screens live here, once, so `navigate('Settings' | 'Forum' |
 * 'Gear' | 'OfflineMaps' | 'Weather')` resolves from any tab in any mode.
 */
export default function AppNavigator() {
  return (
    <Stack.Navigator
      initialRouteName="ModePicker"
      screenOptions={{ headerShown: false }}
    >
      <Stack.Screen name="ModePicker" component={ModePickerScreen} />
      <Stack.Screen name={MODE_TABS_ROUTE.hunt} component={HuntTabs} />
      <Stack.Screen name={MODE_TABS_ROUTE.fish} component={FishTabs} />
      <Stack.Screen name={MODE_TABS_ROUTE.camp} component={CampTabs} />
      <Stack.Screen name={MODE_TABS_ROUTE.hike} component={HikeTabs} />
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
        name="Gear"
        component={GearScreen}
        options={{ headerShown: true, title: 'Gear' }}
      />
      <Stack.Screen
        name="OfflineMaps"
        component={OfflineMapsScreen}
        options={{ headerShown: true, title: 'Offline Maps' }}
      />
      <Stack.Screen
        name="Weather"
        component={WeatherScreen}
        options={{ headerShown: true, title: 'Weather & Safety' }}
      />
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
