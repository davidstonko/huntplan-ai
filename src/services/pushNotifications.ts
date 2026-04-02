/**
 * @file pushNotifications.ts
 * @description APNS push notification registration and preference management.
 * Manages notification preferences, device token registration, and notification handling.
 *
 * Uses React Native's built-in PushNotificationIOS for iOS APNS support.
 * Flow:
 * 1. Request notification permissions on app launch
 * 2. Register for remote notifications (device token via PushNotificationIOS)
 * 3. Send token to backend at /api/v1/notifications/register
 * 4. Handle notification delivery and user interactions
 * 5. Allow users to manage notification preferences
 */

import { PushNotificationIOS } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { createNavigationContainerRef } from '@react-navigation/native';
import Config from '../config';

const PREFS_KEY = '@push_preferences';
const TOKEN_KEY = '@push_device_token';

/**
 * Navigation ref for handling push notification routing outside of React components.
 * Used to navigate when notifications arrive while app is backgrounded or open.
 * Type cast to any because RootParamList is not centralized in this project.
 */
export const navigationRef = createNavigationContainerRef<any>();

export interface PushPreferences {
  seasonAlerts: boolean;
  campActivity: boolean;
  regulationChanges: boolean;
  weatherAlerts: boolean;
}

const DEFAULT_PREFS: PushPreferences = {
  seasonAlerts: true,
  campActivity: true,
  regulationChanges: true,
  weatherAlerts: false,
};

/**
 * Get stored notification preferences
 */
export async function getPreferences(): Promise<PushPreferences> {
  try {
    const data = await AsyncStorage.getItem(PREFS_KEY);
    return data ? { ...DEFAULT_PREFS, ...JSON.parse(data) } : DEFAULT_PREFS;
  } catch (error) {
    if (__DEV__) console.warn('[Push] Failed to load preferences:', error);
    return DEFAULT_PREFS;
  }
}

/**
 * Update notification preferences and persist to AsyncStorage
 */
export async function updatePreferences(prefs: Partial<PushPreferences>): Promise<PushPreferences> {
  try {
    const current = await getPreferences();
    const updated = { ...current, ...prefs };
    await AsyncStorage.setItem(PREFS_KEY, JSON.stringify(updated));

    // Notify backend of preference change (fire-and-forget)
    const token = await getDeviceToken();
    if (token) {
      axios.post(
        `${Config.API_BASE_URL}/api/v1/notifications/preferences`,
        { preferences: updated },
        { headers: { Authorization: `Bearer ${await AsyncStorage.getItem('@auth_access_token')}` } }
      ).catch((err) => { if (__DEV__) console.warn('[Push] Failed to update backend preferences:', err); });
    }

    return updated;
  } catch (error) {
    if (__DEV__) console.error('[Push] Failed to update preferences:', error);
    return await getPreferences();
  }
}

/**
 * Register for APNS push notifications.
 * Requests permissions, registers for remote notifications, and stores device token.
 * Returns the device token on success, null on failure.
 */
export async function registerForPush(): Promise<string | null> {
  try {
    // Request notification permissions using correct API format
    const permission = await PushNotificationIOS.requestPermissions({
      alert: true,
      badge: true,
      sound: true,
    });

    if (!permission) {
      if (__DEV__) console.log('[Push] User denied notification permissions');
      return null;
    }

    // Register event listeners for device token and notification delivery
    PushNotificationIOS.addEventListener(
      'register' as any,
      onPushTokenReceived as any
    );
    PushNotificationIOS.addEventListener(
      'notification' as any,
      onPushNotificationReceived as any
    );

    if (__DEV__) console.log('[Push] Registered for remote notifications');
    return null; // Token will be delivered async via 'register' event
  } catch (error) {
    if (__DEV__) console.error('[Push] Registration failed:', error);
    return null;
  }
}

/**
 * Internal: Handle device token from APNS
 */
function onPushTokenReceived(token: string): void {
  if (__DEV__) console.log('[Push] Device token received:', token);

  // Store token locally
  AsyncStorage.setItem(TOKEN_KEY, token).catch((err) =>
    { if (__DEV__) console.warn('[Push] Failed to store token:', err); }
  );

  // Send token to backend
  sendTokenToBackend(token).catch((err) =>
    { if (__DEV__) console.error('[Push] Failed to register token with backend:', err); }
  );
}

/**
 * Internal: Handle incoming push notification
 */
function onPushNotificationReceived(notification: any): void {
  if (__DEV__) console.log('[Push] Notification received:', notification);

  // Mark notification as consumed to remove from notification center badge
  notification.finish(PushNotificationIOS.FetchResult.NewData);

  // Parse notification payload
  const title = notification.getMessage?.() || 'Notification';
  const body = notification.getAlert?.() || '';
  const data = notification.getData?.() || {};

  if (__DEV__) console.log('[Push] Title:', title, 'Body:', body, 'Data:', data);

  // Route notification to appropriate screen based on type
  const notificationType = data.type;

  switch (notificationType) {
    case 'season_alert':
      // Navigate to regulations screen
      if (__DEV__) console.log('[Push] Season alert notification');
      handleNotificationRouting('season_alert', data);
      break;
    case 'camp_activity':
      // Navigate to deer camp with camp_id from data
      if (__DEV__) console.log('[Push] Camp activity notification for camp:', data.camp_id);
      handleNotificationRouting('camp_activity', data);
      break;
    case 'regulation_change':
      // Navigate to regulations screen
      if (__DEV__) console.log('[Push] Regulation change notification');
      handleNotificationRouting('regulation_change', data);
      break;
    case 'weather_alert':
      // Show alert with weather info
      if (__DEV__) console.log('[Push] Weather alert:', data.message);
      handleNotificationRouting('weather_alert', data);
      break;
    default:
      if (notificationType) {
        if (__DEV__) console.log('[Push] Unknown notification type:', notificationType);
      }
      break;
  }
}

/**
 * Handle notification routing by navigating to the appropriate screen.
 * Maps notification types to relevant tabs and screens.
 * Uses navigationRef for navigation outside of React components.
 *
 * Navigation mappings:
 * - season_alert → ResourcesTab (regulations)
 * - camp_activity → DeerCampTab (hunting camp)
 * - regulation_change → ResourcesTab (regulations)
 * - weather_alert → MapTab (map view)
 */
function handleNotificationRouting(
  notificationType: string,
  data: Record<string, any>
): void {
  try {
    // Check if navigation is ready before attempting to navigate
    if (!navigationRef.isReady()) {
      if (__DEV__) console.warn('[Push] Navigation not ready, cannot route notification:', notificationType);
      // Fallback: store to AsyncStorage for potential future use
      AsyncStorage.setItem(
        '@pending_notification',
        JSON.stringify({
          type: notificationType,
          data,
          timestamp: new Date().toISOString(),
        })
      ).catch((err) => { if (__DEV__) console.warn('[Push] Failed to store fallback notification:', err); });
      return;
    }

    // Route to appropriate screen based on notification type
    switch (notificationType) {
      case 'season_alert':
        if (__DEV__) console.log('[Push] Routing to Resources tab (season alert)');
        navigationRef.navigate('ResourcesTab');
        break;

      case 'camp_activity':
        if (__DEV__) console.log('[Push] Routing to DeerCamp tab (camp_id:', data.camp_id, ')');
        navigationRef.navigate('DeerCampTab', {
          campId: data.camp_id,
          initial: false,
        });
        break;

      case 'regulation_change':
        if (__DEV__) console.log('[Push] Routing to Resources tab (regulation change)');
        navigationRef.navigate('ResourcesTab');
        break;

      case 'weather_alert':
        if (__DEV__) console.log('[Push] Routing to Map tab (weather alert)');
        navigationRef.navigate('MapTab');
        break;

      default:
        if (__DEV__) console.warn('[Push] Unknown notification type, not routing:', notificationType);
        break;
    }
  } catch (error) {
    if (__DEV__) console.error('[Push] Failed to route notification:', error);
  }
}

/**
 * Send device token to backend for registration
 */
async function sendTokenToBackend(token: string): Promise<void> {
  try {
    const authToken = await AsyncStorage.getItem('@auth_access_token');
    if (!authToken) {
      if (__DEV__) console.warn('[Push] No auth token available, skipping backend registration');
      return;
    }

    await axios.post(
      `${Config.API_BASE_URL}/api/v1/notifications/register`,
      { device_token: token },
      {
        headers: { Authorization: `Bearer ${authToken}` },
        timeout: 10000,
      }
    );

    if (__DEV__) console.log('[Push] Token registered with backend');
  } catch (error) {
    if (__DEV__) console.error('[Push] Failed to register token with backend:', error);
  }
}

/**
 * Unregister from push notifications and remove device token
 */
export async function unregisterPush(): Promise<void> {
  try {
    // Remove event listeners
    PushNotificationIOS.removeEventListener('register' as any, onPushTokenReceived as any);
    PushNotificationIOS.removeEventListener('notification' as any, onPushNotificationReceived as any);

    // Clear stored token
    await AsyncStorage.removeItem(TOKEN_KEY);

    if (__DEV__) console.log('[Push] Unregistered from push notifications');
  } catch (error) {
    if (__DEV__) console.error('[Push] Failed to unregister:', error);
  }
}

/**
 * Retrieve stored device token
 */
export async function getDeviceToken(): Promise<string | null> {
  try {
    return await AsyncStorage.getItem(TOKEN_KEY);
  } catch (error) {
    if (__DEV__) console.warn('[Push] Failed to retrieve device token:', error);
    return null;
  }
}
