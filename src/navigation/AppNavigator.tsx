import React from 'react';
import { StyleSheet, View, TouchableOpacity, Text } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import { useActivityMode } from '../context/ActivityModeContext';
import ActivityModePicker from '../components/navigation/ActivityModePicker';

// ── Hunt screens ──
import MapScreen from '../screens/MapScreen';
import ScoutScreen from '../screens/ScoutScreen';
import ChatScreen from '../screens/ChatScreen';
import DeerCampScreen from '../screens/DeerCampScreen';
import ResourcesHubScreen from '../screens/ResourcesHubScreen';

// ── Sub-screens (accessible via stack push within tabs) ──
import SettingsScreen from '../screens/SettingsScreen';
import HarvestLogScreen from '../screens/HarvestLogScreen';
import HuntPlanScreen from '../screens/HuntPlanScreen';
import OfflineMapsScreen from '../screens/OfflineMapsScreen';
import ForumScreen from '../screens/ForumScreen';

// ── Fish / Coming Soon screens ──
import FishMapScreen from '../screens/FishMapScreen';
import ComingSoonScreen from '../screens/ComingSoonScreen';

import Colors from '../theme/colors';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

// ── Stack wrappers for tabs that need sub-screen navigation ──

/** Map tab stack: MapScreen → OfflineMaps, Settings */
function MapStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="MapMain" component={MapScreen} />
      <Stack.Screen name="OfflineMaps" component={OfflineMapsScreen} options={{ headerShown: true, title: 'Offline Maps' }} />
      <Stack.Screen name="Settings" component={SettingsScreen} options={{ headerShown: true, title: 'Settings' }} />
    </Stack.Navigator>
  );
}

/** AI tab stack: ChatScreen → HuntPlan */
function AIStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="ChatMain" component={ChatScreen} />
      <Stack.Screen name="HuntPlan" component={HuntPlanScreen} options={{ headerShown: true, title: 'AI Hunt Plan' }} />
    </Stack.Navigator>
  );
}

/** Resources tab stack: ResourcesHub → HarvestLog, Settings, Forum */
function ResourcesStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="ResourcesMain" component={ResourcesHubScreen} />
      <Stack.Screen name="HarvestLog" component={HarvestLogScreen} options={{ headerShown: true, title: 'Harvest Log' }} />
      <Stack.Screen name="Settings" component={SettingsScreen} options={{ headerShown: true, title: 'Settings' }} />
      <Stack.Screen name="Forum" component={ForumScreen} options={{ headerShown: true, title: 'Community Forum' }} />
    </Stack.Navigator>
  );
}

/**
 * Emoji + text tab icons — themed per activity mode.
 * V2: Hunt mode has 5 tabs: Map, Scout, AI, Deer Camp, Resources
 */
const HUNT_ICONS: Record<string, string> = {
  MAP: '\uD83D\uDDFA\uFE0F',
  SCOUT: '\uD83D\uDC3E',
  AI: '\uD83E\uDD16',
  CAMP: '\uD83C\uDFD5\uFE0F',
  RESOURCES: '\uD83D\uDCDA',
};

const FISH_ICONS: Record<string, string> = {
  MAP: '\uD83D\uDDFA\uFE0F',
  AI: '\uD83E\uDD16',
  RESOURCES: '\uD83D\uDCDA',
};

const TabIcon = ({
  label,
  focused,
  icons,
}: {
  label: string;
  focused: boolean;
  icons: Record<string, string>;
}) => (
  <Text style={{ fontSize: 18, opacity: focused ? 1 : 0.5 }}>
    {icons[label] || label}
  </Text>
);

/**
 * Maryland flag stripe for the header right side.
 */
const MdFlagStripe = () => (
  <View style={styles.mdFlagStripe}>
    <View style={[styles.mdStripeBlock, { backgroundColor: Colors.mdRed }]} />
    <View style={[styles.mdStripeBlock, { backgroundColor: Colors.mdGold }]} />
    <View style={[styles.mdStripeBlock, { backgroundColor: Colors.mdBlack }]} />
    <View style={[styles.mdStripeBlock, { backgroundColor: Colors.mdWhite }]} />
  </View>
);

/**
 * Main app navigator — switches tab configuration based on active activity mode.
 * V2 Hunt mode: Map, Scout, AI, Deer Camp, Resources (5 tabs)
 * Fish mode: Map, AI, Resources
 * Other modes: Coming Soon placeholder
 */
export default function AppNavigator() {
  const { activeMode } = useActivityMode();

  const sharedScreenOptions = {
    headerShown: true,
    tabBarActiveTintColor: Colors.oak,
    tabBarInactiveTintColor: Colors.textMuted,
    tabBarStyle: styles.tabBar,
    headerStyle: styles.header,
    headerTintColor: Colors.textPrimary,
    headerTitleStyle: styles.headerTitle,
    tabBarLabelStyle: styles.tabLabel,
    // Custom header title component with activity mode picker
    headerTitle: () => <ActivityModePicker />,
    headerRight: () => <MdFlagStripe />,
  };

  // ── Hunt Mode (default, full-featured — V2: 5 tabs) ──
  if (activeMode === 'hunt') {
    return (
      <Tab.Navigator screenOptions={sharedScreenOptions}>
        <Tab.Screen
          name="MapTab"
          component={MapStack}
          options={{
            tabBarLabel: 'Map',
            tabBarIcon: ({ focused }) => (
              <TabIcon label="MAP" focused={focused} icons={HUNT_ICONS} />
            ),
          }}
        />
        <Tab.Screen
          name="ScoutTab"
          component={ScoutScreen}
          options={{
            tabBarLabel: 'Scout',
            tabBarIcon: ({ focused }) => (
              <TabIcon label="SCOUT" focused={focused} icons={HUNT_ICONS} />
            ),
          }}
        />
        <Tab.Screen
          name="ChatTab"
          component={AIStack}
          options={{
            tabBarLabel: 'AI',
            tabBarIcon: ({ focused }) => (
              <TabIcon label="AI" focused={focused} icons={HUNT_ICONS} />
            ),
          }}
        />
        <Tab.Screen
          name="DeerCampTab"
          component={DeerCampScreen}
          options={{
            tabBarLabel: 'Deer Camp',
            tabBarIcon: ({ focused }) => (
              <TabIcon label="CAMP" focused={focused} icons={HUNT_ICONS} />
            ),
          }}
        />
        <Tab.Screen
          name="ResourcesTab"
          component={ResourcesStack}
          options={{
            tabBarLabel: 'Resources',
            tabBarIcon: ({ focused }) => (
              <TabIcon label="RESOURCES" focused={focused} icons={HUNT_ICONS} />
            ),
          }}
        />
      </Tab.Navigator>
    );
  }

  // ── Fish Mode (map + coming soon features) ──
  if (activeMode === 'fish') {
    return (
      <Tab.Navigator screenOptions={sharedScreenOptions}>
        <Tab.Screen
          name="FishMapTab"
          component={FishMapScreen}
          options={{
            tabBarLabel: 'Map',
            tabBarIcon: ({ focused }) => (
              <TabIcon label="MAP" focused={focused} icons={FISH_ICONS} />
            ),
          }}
        />
        <Tab.Screen
          name="ChatTab"
          component={ChatScreen}
          options={{
            tabBarLabel: 'AI',
            tabBarIcon: ({ focused }) => (
              <TabIcon label="AI" focused={focused} icons={FISH_ICONS} />
            ),
          }}
        />
        <Tab.Screen
          name="ResourcesTab"
          component={ResourcesHubScreen}
          options={{
            tabBarLabel: 'Resources',
            tabBarIcon: ({ focused }) => (
              <TabIcon label="RESOURCES" focused={focused} icons={FISH_ICONS} />
            ),
          }}
        />
      </Tab.Navigator>
    );
  }

  // ── Hike / Crab / Boat modes (Coming Soon) ──
  const ComingSoonForMode = () => (
    <ComingSoonScreen route={{ params: { mode: activeMode as 'hike' | 'crab' | 'boat' } }} />
  );

  return (
    <Tab.Navigator screenOptions={sharedScreenOptions}>
      <Tab.Screen
        name="ComingSoonTab"
        component={ComingSoonForMode}
        options={{
          tabBarLabel: 'Home',
          tabBarIcon: ({ focused }) => (
            <Text style={{ fontSize: 18, opacity: focused ? 1 : 0.5 }}>
              {activeMode === 'hike' ? '\uD83E\uDD7E' : activeMode === 'crab' ? '\uD83E\uDD80' : '\uD83D\uDEA4'}
            </Text>
          ),
        }}
      />
      <Tab.Screen
        name="ChatTab"
        component={ChatScreen}
        options={{
          tabBarLabel: 'AI',
          tabBarIcon: ({ focused }) => (
            <Text style={{ fontSize: 18, opacity: focused ? 1 : 0.5 }}>
              {'\uD83E\uDD16'}
            </Text>
          ),
        }}
      />
      <Tab.Screen
        name="ResourcesTab"
        component={ResourcesHubScreen}
        options={{
          tabBarLabel: 'Resources',
          tabBarIcon: ({ focused }) => (
            <Text style={{ fontSize: 18, opacity: focused ? 1 : 0.5 }}>
              {'\uD83D\uDCDA'}
            </Text>
          ),
        }}
      />
    </Tab.Navigator>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: Colors.surface,
    borderTopColor: Colors.mud,
    borderTopWidth: 1,
    paddingTop: 4,
  },
  tabLabel: {
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 0.3,
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
