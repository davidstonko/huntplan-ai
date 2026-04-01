/**
 * @file pushNotifications.ts
 * @description APNS push notification registration and preference management.
 * Manages notification preferences and device token registration.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

const PREFS_KEY = '@push_preferences';
const TOKEN_KEY = '@push_device_token';

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

export async function getPreferences(): Promise<PushPreferences> {
  try {
    const data = await AsyncStorage.getItem(PREFS_KEY);
    return data ? { ...DEFAULT_PREFS, ...JSON.parse(data) } : DEFAULT_PREFS;
  } catch {
    return DEFAULT_PREFS;
  }
}

export async function updatePreferences(prefs: Partial<PushPreferences>): Promise<PushPreferences> {
  const current = await getPreferences();
  const updated = { ...current, ...prefs };
  await AsyncStorage.setItem(PREFS_KEY, JSON.stringify(updated));
  return updated;
}

export async function registerForPush(): Promise<string | null> {
  // Placeholder — requires react-native-push-notification or expo-notifications
  // Returns device token on success
  console.log('[Push] Registration placeholder — native module needed');
  return null;
}

export async function unregisterPush(): Promise<void> {
  await AsyncStorage.removeItem(TOKEN_KEY);
}

export async function getDeviceToken(): Promise<string | null> {
  return AsyncStorage.getItem(TOKEN_KEY);
}
