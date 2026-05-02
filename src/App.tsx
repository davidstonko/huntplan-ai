import React, { useEffect, useState, useRef } from 'react';
import { View, StyleSheet, ActivityIndicator, StatusBar, LogBox } from 'react-native';

// 2026-04-26 (task #17): Suppress benign Mapbox + React Navigation noise
// from the YellowBox / RedBox toasts. These warnings are well-understood
// and don't affect runtime behavior — they otherwise pile up on dev
// builds and make signal-vs-noise hard for actual issues.
LogBox.ignoreLogs([
  // Mapbox logs this when a layer references a `belowLayerID` whose
  // sibling hasn't mounted yet. We've structured the JSX so the layers
  // mount in the right order anyway; the warning is cosmetic only.
  /inserting layer failed/i,
  /Layer with id .* not found/i,
  // RN's NativeEventEmitter shouts when a native module is loaded but
  // its listener prop isn't wired (common with optional Sentry integration).
  /new NativeEventEmitter/i,
  // React Navigation pre-empts itself with a non-serializable warning we
  // already addressed for CampAreaPicker (see task #48). Other paths that
  // pass functions through route.params remain (deep-link onAuthSuccess,
  // etc.); keep this scoped silence in until we audit each one.
  /Non-serializable values were found in the navigation state/i,
]);
import AsyncStorage from '@react-native-async-storage/async-storage';
import { NavigationContainer, NavigationContainerRef } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import SplashDisclaimer from './screens/SplashDisclaimer';
import AppNavigator from './navigation/AppNavigator';
import AnimatedSplash from './components/splash/AnimatedSplash';
import { ActivityModeProvider } from './context/ActivityModeContext';
import { ScoutDataProvider } from './context/ScoutDataContext';
import { DeerCampProvider } from './context/DeerCampContext';
import { GroupCampProvider } from './context/GroupCampContext';
import { SettingsProvider } from './context/SettingsContext';
import { UserWaypointProvider } from './context/UserWaypointContext';
import { UserMarkupProvider } from './context/UserMarkupContext';
import { TrackRecorderProvider } from './context/TrackRecorderContext';
import { JournalEntryProvider } from './context/JournalEntryContext';
import { GearChecklistProvider } from './context/GearChecklistContext';
import { FavoritesProvider } from './context/FavoritesContext';
import Colors from './theme/colors';
import { initAuth } from './services/authService';
import { initSentry } from './services/sentryClient';
import { useDeepLinks } from './services/deepLinkRouter';
import { initMapboxToken } from './services/mapboxTokenService';

const DISCLAIMER_KEY = 'HUNTPLAN_DISCLAIMER_ACCEPTED';

export default function App() {
  const [isLoading, setIsLoading] = useState(true);
  const [showSplash, setShowSplash] = useState(true);
  const [disclaimerAccepted, setDisclaimerAccepted] = useState(false);
  const navigationRef = useRef<NavigationContainerRef<any>>(null);

  useEffect(() => {
    (async () => {
      try {
        // Initialize Sentry error tracking early
        await initSentry();

        // 2026-04-27: Mapbox token boot — applies cached token instantly
        // (synchronous from AsyncStorage), then fires a background fetch
        // to /api/v1/config/mapbox-token. Backend returns the env-var
        // value; we cache for 24h. Falls back to the hardcoded constant
        // when offline. Doesn't block boot — fire-and-forget pattern.
        initMapboxToken().catch((err) => {
          console.warn('[Mapbox] token init failed, using fallback:', err);
        });

        const accepted = await AsyncStorage.getItem(DISCLAIMER_KEY);
        setDisclaimerAccepted(accepted === 'true');

        // Silent auth: register device or restore stored JWT
        // Runs in background — doesn't block app launch
        initAuth().then((authState) => {
          if (authState.isAuthenticated && authState.accessToken) {
            // Also store under 'auth_token' for simple fetch() calls
            AsyncStorage.setItem('auth_token', authState.accessToken).catch(() => {
              if (__DEV__) console.error('[Auth] Failed to store auth token');
            });
          }
          console.log('[Auth]', authState.isAuthenticated ? 'Authenticated' : 'Offline mode');
        }).catch(() => {
          console.warn('[Auth] Silent auth failed, running offline');
        });
      } catch (e) {
        console.error('Error checking disclaimer:', e);
      } finally {
        setIsLoading(false);
      }
    })();
  }, []);

  const handleAccept = async () => {
    try {
      await AsyncStorage.setItem(DISCLAIMER_KEY, 'true');
      setDisclaimerAccepted(true);
    } catch (e) {
      console.error('Error saving disclaimer:', e);
    }
  };

  // Show animated splash on every app launch
  if (showSplash) {
    return (
      <View style={styles.loading}>
        <StatusBar barStyle="light-content" backgroundColor="#0D1A0D" translucent />
        <AnimatedSplash onFinish={() => setShowSplash(false)} duration={2000} />
      </View>
    );
  }

  if (isLoading) {
    return (
      <View style={styles.loading}>
        <StatusBar barStyle="light-content" backgroundColor={Colors.background} />
        <ActivityIndicator size="large" color={Colors.oak} />
      </View>
    );
  }

  return (
    <ActivityModeProvider>
    <ScoutDataProvider>
    <DeerCampProvider>
    <GroupCampProvider>
    <SettingsProvider>
    <UserWaypointProvider>
    <UserMarkupProvider>
    <TrackRecorderProvider>
    <JournalEntryProvider>
    <GearChecklistProvider>
    <FavoritesProvider>
    <SafeAreaProvider>
      <StatusBar barStyle="light-content" backgroundColor={Colors.background} />
      <NavigationContainer
        ref={navigationRef}
        theme={{
          dark: true,
          colors: {
            primary: Colors.oak,
            background: Colors.background,
            card: Colors.surface,
            text: Colors.textPrimary,
            border: Colors.mud,
            notification: Colors.amber,
          },
          fonts: {
            regular: { fontFamily: 'System', fontWeight: '400' as const },
            medium: { fontFamily: 'System', fontWeight: '500' as const },
            bold: { fontFamily: 'System', fontWeight: '700' as const },
            heavy: { fontFamily: 'System', fontWeight: '900' as const },
          },
        }}
      >
        {/* Set up deep link router (Phase 5C: handles Camp invites, Hike trips) */}
        <DeepLinkInitializer navigationRef={navigationRef} />

        {!disclaimerAccepted ? (
          <SplashDisclaimer onAccept={handleAccept} />
        ) : (
          <AppNavigator />
        )}
      </NavigationContainer>
    </SafeAreaProvider>
    </FavoritesProvider>
    </GearChecklistProvider>
    </JournalEntryProvider>
    </TrackRecorderProvider>
    </UserMarkupProvider>
    </UserWaypointProvider>
    </SettingsProvider>
    </GroupCampProvider>
    </DeerCampProvider>
    </ScoutDataProvider>
    </ActivityModeProvider>
  );
}

/**
 * DeepLinkInitializer — Subscribes to deep link events within NavigationContainer scope.
 * Must be rendered inside NavigationContainer so navigationRef is active.
 */
function DeepLinkInitializer({
  navigationRef,
}: {
  navigationRef: React.RefObject<NavigationContainerRef<any>>;
}): null {
  useDeepLinks(navigationRef);
  return null;
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.background,
  },
});
