import React, { useEffect, useState } from 'react';
import { View, StyleSheet, ActivityIndicator, StatusBar } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { NavigationContainer } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import SplashDisclaimer from './screens/SplashDisclaimer';
import AppNavigator from './navigation/AppNavigator';
import AnimatedSplash from './components/splash/AnimatedSplash';
import { ActivityModeProvider } from './context/ActivityModeContext';
import { ScoutDataProvider } from './context/ScoutDataContext';
import { DeerCampProvider } from './context/DeerCampContext';
import DatabaseProvider from './db/DatabaseProvider';
import Colors from './theme/colors';
import { initAuth } from './services/authService';
import { ErrorBoundary } from './components/common/ErrorBoundary';
import { OfflineBanner } from './components/common/OfflineBanner';
import { flushFeedbackQueue } from './services/feedbackService';
import { navigationRef } from './services/pushNotifications';

const DISCLAIMER_KEY = 'HUNTPLAN_DISCLAIMER_ACCEPTED';

export default function App() {
  const [isLoading, setIsLoading] = useState(true);
  const [showSplash, setShowSplash] = useState(true);
  const [disclaimerAccepted, setDisclaimerAccepted] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const accepted = await AsyncStorage.getItem(DISCLAIMER_KEY);
        setDisclaimerAccepted(accepted === 'true');

        // Silent auth: register device or restore stored JWT
        // Runs in background — doesn't block app launch
        initAuth().then((authState) => {
          if (authState.isAuthenticated && authState.accessToken) {
            // Also store under 'auth_token' for simple fetch() calls
            AsyncStorage.setItem('auth_token', authState.accessToken);
          }
          if (__DEV__) console.log('[Auth]', authState.isAuthenticated ? 'Authenticated' : 'Offline mode');
        }).catch(() => {
          if (__DEV__) console.warn('[Auth] Silent auth failed, running offline');
        });

        // Flush any queued feedback from previous offline sessions
        flushFeedbackQueue().catch(() => {});
      } catch (e) {
        if (__DEV__) console.error('[App] Error checking disclaimer:', e);
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
      if (__DEV__) console.error('[App] Error saving disclaimer:', e);
    }
  };

  // Show animated splash on every app launch
  if (showSplash) {
    return (
      <View style={styles.loading}>
        <StatusBar barStyle="light-content" backgroundColor="#0D1A0D" translucent />
        <AnimatedSplash onFinish={() => setShowSplash(false)} duration={2800} />
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
    <DatabaseProvider>
    <ActivityModeProvider>
    <ScoutDataProvider>
    <DeerCampProvider>
    <SafeAreaProvider>
      <ErrorBoundary>
        <StatusBar barStyle="light-content" backgroundColor={Colors.background} />
        <OfflineBanner />
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
          {!disclaimerAccepted ? (
            <SplashDisclaimer onAccept={handleAccept} />
          ) : (
            <AppNavigator />
          )}
        </NavigationContainer>
      </ErrorBoundary>
    </SafeAreaProvider>
    </DeerCampProvider>
    </ScoutDataProvider>
    </ActivityModeProvider>
    </DatabaseProvider>
  );
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.background,
  },
});
