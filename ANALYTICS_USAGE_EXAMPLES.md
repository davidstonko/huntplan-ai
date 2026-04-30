# Analytics & Crash Reporting — Usage Examples

Complete examples showing how to integrate crash reporting and analytics throughout the MDHuntFishOutdoors app.

## Setup & Initialization

### App.tsx — Initialize on Startup

```typescript
/**
 * @file App.tsx
 * @description Main app component with analytics & crash reporting initialization
 */

import React, { useEffect } from 'react';
import { View, StyleSheet, SafeAreaView } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import DeviceInfo from 'react-native-device-info';
import { colors } from '@/theme/colors';
import { initializeCrashReporting, captureMessage, setUserContext } from '@/services/crashReportingService';
import { initializeAnalytics, trackScreenView } from '@/services/analyticsService';
import AppNavigator from '@/navigation/AppNavigator';
import { DisclaimerModal } from '@/components/common/DisclaimerModal';

export default function App(): React.ReactElement {
  const [disclaimerAccepted, setDisclaimerAccepted] = React.useState(false);

  useEffect(() => {
    const initializeServices = async () => {
      try {
        // Get device info for analytics
        const deviceId = await DeviceInfo.getUniqueId();
        const appVersion = await DeviceInfo.getVersion();

        // Initialize crash reporting (Sentry)
        const sentryDSN = process.env.SENTRY_DSN || '';
        initializeCrashReporting(sentryDSN, {
          environment: __DEV__ ? 'development' : 'production',
          tracesSampleRate: 0.1, // 10% of transactions
        });

        // Set user context (anonymous device ID only)
        setUserContext(deviceId);

        // Initialize analytics
        await initializeAnalytics(deviceId, appVersion, 60000); // 60s flush interval

        // Log successful initialization
        captureMessage('App startup successful', 'info');
        await trackScreenView('AppStartup', {
          version: appVersion,
          deviceType: await DeviceInfo.getDeviceType(),
        });
      } catch (error) {
        console.error('[App] Initialization error:', error);
      }
    };

    initializeServices();
  }, []);

  if (!disclaimerAccepted) {
    return (
      <SafeAreaView style={styles.container}>
        <DisclaimerModal
          onAccept={() => setDisclaimerAccepted(true)}
          onReject={() => {
            // User declined — could exit app or show secondary screen
            captureMessage('User rejected disclaimer', 'info');
          }}
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <NavigationContainer>
        <AppNavigator />
      </NavigationContainer>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.mdBlack,
  },
});
```

## Screen-Level Analytics

### MapScreen — Track Navigation & Filters

```typescript
/**
 * @file screens/MapScreen.tsx
 * @description Main map screen with analytics integration
 */

import React, { useCallback } from 'react';
import { View, StyleSheet } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { trackScreenView, trackFilterChange } from '@/services/analyticsService';
import { captureException } from '@/services/crashReportingService';
import MapboxGL from '@rnmapbox/maps';

export const MapScreen: React.FC = () => {
  // Track screen view when focused
  useFocusEffect(
    useCallback(() => {
      trackScreenView('MapScreen', {
        mode: 'hunt',
      }).catch((error: unknown) => {
        console.warn('[MapScreen] Analytics error:', error);
      });

      return () => {
        // Optional cleanup
      };
    }, [])
  );

  const handleFilterChange = useCallback((filterType: string, values: string[]) => {
    try {
      trackFilterChange(filterType, {
        active_filters: values,
        filter_count: values.length,
      }).catch((error: unknown) => {
        console.warn('[MapScreen] Filter tracking error:', error);
      });

      // Update map display
      updateMapFilters(filterType, values);
    } catch (error) {
      captureException(error as Error, {
        context: 'MapScreen.handleFilterChange',
        filter_type: filterType,
      });
    }
  }, []);

  const handleMapError = useCallback((error: Error) => {
    captureException(error, {
      context: 'MapScreen.mapError',
      screen: 'MapScreen',
    });
  }, []);

  return (
    <View style={styles.container}>
      <MapboxGL.MapView
        style={styles.map}
        onPress={() => {}}
        onDidFailLoadingMap={handleMapError}
      >
        {/* Map layers */}
      </MapboxGL.MapView>

      {/* Filter controls */}
      <FilterPanel onFilterChange={handleFilterChange} />
    </View>
  );
};

const updateMapFilters = (filterType: string, values: string[]) => {
  // Update map display...
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  map: {
    flex: 1,
  },
});
```

### ScoutScreen — Track Plan Creation

```typescript
/**
 * @file screens/ScoutScreen.tsx
 * @description Scout planning screen with analytics
 */

import React, { useCallback } from 'react';
import { View, StyleSheet } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { trackScreenView, trackPlanCreated } from '@/services/analyticsService';
import { captureException } from '@/services/crashReportingService';
import { PlanCreationFlow } from '@/components/scout/PlanCreationFlow';

interface HuntPlan {
  id: string;
  name: string;
  location: string;
  season: string;
  weapon: string;
  coordinates: { lat: number; lng: number };
}

export const ScoutScreen: React.FC = () => {
  useFocusEffect(
    useCallback(() => {
      trackScreenView('ScoutScreen', {
        tab: 'scout',
      }).catch(console.error);
      return () => {};
    }, [])
  );

  const handlePlanSaved = useCallback(async (plan: HuntPlan) => {
    try {
      // Track plan creation
      await trackPlanCreated('hunt_plan', {
        name: plan.name,
        location: plan.location,
        season: plan.season,
        weapon: plan.weapon,
      });

      // Save plan locally
      await savePlanToStorage(plan);
    } catch (error) {
      captureException(error as Error, {
        context: 'ScoutScreen.handlePlanSaved',
        plan_name: plan.name,
      });
    }
  }, []);

  return (
    <View style={styles.container}>
      <PlanCreationFlow onPlanSaved={handlePlanSaved} />
    </View>
  );
};

const savePlanToStorage = async (plan: HuntPlan) => {
  // Implementation...
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
```

## Feature-Level Analytics

### CampGearScreen — Track Affiliate Conversions

```typescript
/**
 * @file screens/CampGearScreen.tsx
 * @description Camping gear picks with affiliate link tracking
 */

import React, { useCallback } from 'react';
import { View, ScrollView, Text, TouchableOpacity, Linking, StyleSheet } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { trackScreenView, trackAffiliateTap, trackFeatureUsed } from '@/services/analyticsService';
import { colors } from '@/theme/colors';

interface GearProduct {
  id: string;
  name: string;
  asin: string;
  category: string;
  price: string;
  description: string;
}

const GEAR_CATALOG: GearProduct[] = [
  {
    id: 'tent-001',
    name: 'Big Agnes Fly Creek HV UL2',
    asin: 'B08VY2XKZ7',
    category: 'tents',
    price: '$349',
    description: '2-person ultralight backpacking tent',
  },
  {
    id: 'sleeping-001',
    name: 'REI Co-op Trailbreak 20 Sleeping Bag',
    asin: 'B07QXSN8FV',
    category: 'sleeping_bags',
    price: '$179',
    description: 'Synthetic insulation, 20°F rating',
  },
];

export const CampGearScreen: React.FC = () => {
  useFocusEffect(
    useCallback(() => {
      trackScreenView('CampGearScreen').catch(console.error);
      return () => {};
    }, [])
  );

  const handleGearLinkPress = useCallback(
    async (product: GearProduct) => {
      try {
        // Track affiliate tap
        await trackAffiliateTap(product.name, product.asin, product.category);

        // Open Amazon link
        const affiliateUrl = `https://amazon.com/dp/${product.asin}?tag=mdoutdoors-20`;
        await Linking.openURL(affiliateUrl);
      } catch (error) {
        console.error('[CampGearScreen] Link error:', error);
      }
    },
    []
  );

  const handleViewAllCategory = useCallback(async (category: string) => {
    await trackFeatureUsed('view_gear_category', {
      category,
    });
    // Navigate to category screen...
  }, []);

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>My Gear Picks</Text>
      <Text style={styles.subtitle}>Tested & recommended for Maryland camping</Text>

      {GEAR_CATALOG.map((product) => (
        <View key={product.id} style={styles.productCard}>
          <View style={styles.productHeader}>
            <Text style={styles.productName}>{product.name}</Text>
            <Text style={styles.price}>{product.price}</Text>
          </View>

          <Text style={styles.description}>{product.description}</Text>

          <TouchableOpacity
            style={styles.linkButton}
            onPress={() => handleGearLinkPress(product)}
          >
            <Text style={styles.linkButtonText}>View on Amazon</Text>
          </TouchableOpacity>
        </View>
      ))}

      <TouchableOpacity
        style={styles.viewAllButton}
        onPress={() => handleViewAllCategory('all')}
      >
        <Text style={styles.viewAllText}>View All Gear Picks</Text>
      </TouchableOpacity>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.mdBlack,
    padding: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.mdWhite,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: colors.tan,
    marginBottom: 20,
  },
  productCard: {
    backgroundColor: '#1a1a1a',
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
    borderLeftWidth: 4,
    borderLeftColor: colors.mdRed,
  },
  productHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  productName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.mdWhite,
    flex: 1,
  },
  price: {
    fontSize: 14,
    fontWeight: 'bold',
    color: colors.mdGold,
    marginLeft: 8,
  },
  description: {
    fontSize: 13,
    color: colors.tan,
    marginBottom: 12,
    lineHeight: 18,
  },
  linkButton: {
    backgroundColor: colors.mdRed,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 6,
    alignItems: 'center',
  },
  linkButtonText: {
    color: colors.mdWhite,
    fontWeight: 'bold',
    fontSize: 14,
  },
  viewAllButton: {
    backgroundColor: colors.mdGold,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 16,
  },
  viewAllText: {
    color: colors.mdBlack,
    fontWeight: 'bold',
    fontSize: 16,
  },
});
```

### ATTripPlannerScreen — Track Trip Planning

```typescript
/**
 * @file screens/ATTripPlannerScreen.tsx
 * @description Appalachian Trail trip planner with analytics
 */

import React, { useCallback, useState } from 'react';
import { View, ScrollView, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { trackScreenView, trackTripPlanned, trackFeatureUsed } from '@/services/analyticsService';
import { colors } from '@/theme/colors';

interface TripPlan {
  type: 'backpacking' | 'dayhike' | 'sheltered';
  season: 'spring' | 'summer' | 'fall' | 'winter';
  groupSize: number;
  gearItems: number;
}

export const ATTripPlannerScreen: React.FC = () => {
  const [selectedType, setSelectedType] = useState<TripPlan['type']>('backpacking');
  const [selectedSeason, setSelectedSeason] = useState<TripPlan['season']>('summer');

  React.useFocusEffect(
    useCallback(() => {
      trackScreenView('ATTripPlannerScreen').catch(console.error);
      return () => {};
    }, [])
  );

  const handleGeneratePacking = useCallback(async () => {
    try {
      // Generate packing list based on trip params
      const gearItems = generatePackingList(selectedType, selectedSeason);

      // Track trip planning event
      await trackTripPlanned(`at_${selectedType}`, selectedSeason, gearItems.length);

      // Track feature usage
      await trackFeatureUsed('trip_planner_completed', {
        type: selectedType,
        season: selectedSeason,
        item_count: gearItems.length,
      });
    } catch (error) {
      console.error('[ATTripPlannerScreen] Error:', error);
    }
  }, [selectedType, selectedSeason]);

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>AT Trip Planner</Text>
      <Text style={styles.subtitle}>Get a personalized packing list</Text>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Trip Type</Text>
        {(['backpacking', 'dayhike', 'sheltered'] as const).map((type) => (
          <TouchableOpacity
            key={type}
            style={[
              styles.option,
              selectedType === type && styles.optionSelected,
            ]}
            onPress={() => {
              setSelectedType(type);
              trackFeatureUsed('trip_type_selected', { type }).catch(console.error);
            }}
          >
            <Text style={styles.optionText}>
              {type.charAt(0).toUpperCase() + type.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Season</Text>
        {(['spring', 'summer', 'fall', 'winter'] as const).map((season) => (
          <TouchableOpacity
            key={season}
            style={[
              styles.option,
              selectedSeason === season && styles.optionSelected,
            ]}
            onPress={() => {
              setSelectedSeason(season);
              trackFeatureUsed('season_selected', { season }).catch(console.error);
            }}
          >
            <Text style={styles.optionText}>
              {season.charAt(0).toUpperCase() + season.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <TouchableOpacity
        style={styles.generateButton}
        onPress={handleGeneratePacking}
      >
        <Text style={styles.generateButtonText}>Generate Packing List</Text>
      </TouchableOpacity>
    </ScrollView>
  );
};

const generatePackingList = (
  type: TripPlan['type'],
  season: TripPlan['season']
): Array<{ name: string; weight: string }> => {
  // Return packing list based on type and season
  return [];
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.mdBlack,
    padding: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.mdWhite,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: colors.tan,
    marginBottom: 20,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.mdWhite,
    marginBottom: 12,
  },
  option: {
    backgroundColor: '#1a1a1a',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 6,
    marginBottom: 8,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  optionSelected: {
    borderColor: colors.mdRed,
    backgroundColor: '#2a1a1a',
  },
  optionText: {
    color: colors.mdWhite,
    fontSize: 14,
  },
  generateButton: {
    backgroundColor: colors.mdGold,
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 20,
  },
  generateButtonText: {
    color: colors.mdBlack,
    fontWeight: 'bold',
    fontSize: 16,
  },
});
```

## Error Handling with Analytics

### Example: Search with Error Tracking

```typescript
import { trackSearch, trackError } from '@/services/analyticsService';
import { captureException } from '@/services/crashReportingService';

const handleSearch = useCallback(
  async (query: string) => {
    try {
      if (!query || query.length < 2) {
        throw new Error('Search query too short');
      }

      // Perform search
      const results = await performSearch(query);

      // Track successful search
      await trackSearch(query, results.length);

      // Update UI with results
      setResults(results);
    } catch (error) {
      const err = error as Error;

      // Track error separately from crash reporting
      await trackError(err.message, 'SearchScreen');

      // Report to Sentry as well
      captureException(err, {
        context: 'SearchScreen.handleSearch',
        query,
      });
    }
  },
  []
);
```

## Testing Analytics Locally

```typescript
/**
 * Debug screen for testing analytics (development only)
 */

import React from 'react';
import { View, ScrollView, TouchableOpacity, Text, StyleSheet } from 'react-native';
import {
  getEventQueue,
  getAnalyticsStatus,
  flushEvents,
  clearEventQueue,
  trackScreenView,
  trackFeatureUsed,
  trackAffiliateTap,
} from '@/services/analyticsService';
import { getCrashReportingStatus } from '@/services/crashReportingService';

export const DebugAnalyticsScreen: React.FC = () => {
  const [status, setStatus] = React.useState<any>(null);

  const refreshStatus = async () => {
    const analytics = await getAnalyticsStatus();
    const crash = getCrashReportingStatus();
    const queue = await getEventQueue();
    setStatus({
      analytics,
      crash,
      queueLength: queue.length,
      firstEvent: queue[0],
    });
  };

  React.useEffect(() => {
    refreshStatus();
  }, []);

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>Debug Analytics</Text>

      {status && (
        <>
          <Text style={styles.json}>{JSON.stringify(status, null, 2)}</Text>

          <TouchableOpacity
            style={styles.button}
            onPress={() => trackScreenView('DebugScreen').then(refreshStatus)}
          >
            <Text>Test: Track Screen View</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.button}
            onPress={() => trackFeatureUsed('debug_test').then(refreshStatus)}
          >
            <Text>Test: Track Feature</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.button}
            onPress={() =>
              trackAffiliateTap('Test Product', 'B123456789', 'test').then(refreshStatus)
            }
          >
            <Text>Test: Track Affiliate Tap</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.button} onPress={() => flushEvents().then(refreshStatus)}>
            <Text>Flush Events Now</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.button} onPress={() => clearEventQueue().then(refreshStatus)}>
            <Text>Clear Queue</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.button} onPress={refreshStatus}>
            <Text>Refresh Status</Text>
          </TouchableOpacity>
        </>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: '#000',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 16,
  },
  json: {
    color: '#0f0',
    fontFamily: 'Courier',
    fontSize: 10,
    marginBottom: 16,
    padding: 8,
    backgroundColor: '#111',
  },
  button: {
    backgroundColor: '#666',
    padding: 12,
    borderRadius: 6,
    marginBottom: 8,
  },
});
```

---

These examples show how to integrate analytics and crash reporting throughout the app for comprehensive monitoring and conversion tracking.
