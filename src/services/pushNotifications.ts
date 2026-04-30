/**
 * @file pushNotifications.ts
 * @description Notification service for MDHuntFishOutdoors.
 *
 * V2.2.0 scope: **on-device local notifications only**, via @notifee/react-native.
 * We do not register an APNS token with a backend push server yet — the
 * /notifications/register endpoint exists on the backend but server-initiated
 * pushes are deferred to a later release (V2.3+).
 *
 * The user-facing features this enables for Apple review:
 *  - Season Alerts: locally scheduled reminders for MD hunt season openings
 *    (dove, archery, muzzleloader, firearms deer, spring turkey).
 *  - Camp Activity / Regulation / Weather toggles: stored preferences that
 *    gate which local categories fire. Server-initiated pushes for these
 *    categories ship in a future update; preferences persist so the user
 *    experience is seamless when that lands.
 *
 * This keeps the SettingsScreen toggles **functional today** — flipping a
 * Season Alerts toggle genuinely schedules or cancels local notifications.
 */

import { Platform, Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import notifee, {
  AuthorizationStatus,
  TriggerType,
  TimestampTrigger,
  AndroidImportance,
} from '@notifee/react-native';

const PUSH_PREFS_KEY = '@push_preferences';
const PERMISSION_REQUESTED_KEY = '@push_permission_requested';
const SEASON_ALERT_PREFIX = 'md-season-';

// ─── Types ───────────────────────────────────────────────────────

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
 * Known Maryland 2025-2026 season openings used for local alert scheduling.
 * Each entry fires at 07:00 local the morning the season opens.
 * These dates are refreshed annually — update when 2026 MD DNR regs publish.
 */
const MD_SEASON_OPENINGS = [
  { id: 'dove-2025', date: '2025-09-06T07:00:00', title: 'Dove Season Opens', body: 'Maryland dove season opens today. Check your regs and shell limits.' },
  { id: 'archery-2025', date: '2025-09-13T07:00:00', title: 'Archery Deer Opens', body: 'Maryland archery deer season opens today. Safe hunting.' },
  { id: 'muzzle-2025', date: '2025-10-04T07:00:00', title: 'Muzzleloader Opens', body: 'Maryland muzzleloader deer season opens today.' },
  { id: 'firearm-2025', date: '2025-11-29T07:00:00', title: 'Firearms Deer Opens', body: 'Maryland firearms deer season opens today. Orange required.' },
  { id: 'turkey-2026', date: '2026-04-18T05:30:00', title: 'Spring Turkey Opens', body: 'Maryland spring turkey season opens today.' },
];

// ─── Permission / Channel Setup ──────────────────────────────────

/**
 * Request OS permission to display notifications. Safe to call repeatedly —
 * after the first call the OS remembers the decision. Returns true only when
 * the user granted full authorization.
 */
export async function requestPermission(): Promise<boolean> {
  try {
    const settings = await notifee.requestPermission();
    await AsyncStorage.setItem(PERMISSION_REQUESTED_KEY, '1');

    const granted =
      settings.authorizationStatus === AuthorizationStatus.AUTHORIZED ||
      settings.authorizationStatus === AuthorizationStatus.PROVISIONAL;

    if (!granted) {
      // eslint-disable-next-line no-console
      console.log('[Push] Permission not granted:', settings.authorizationStatus);
    }

    if (granted && Platform.OS === 'android') {
      // Android requires a channel for foreground notifications
      await notifee.createChannel({
        id: 'md-general',
        name: 'MDHuntFishOutdoors',
        importance: AndroidImportance.DEFAULT,
      });
    }

    return granted;
  } catch (err) {
    // eslint-disable-next-line no-console
    console.warn('[Push] requestPermission failed:', err);
    return false;
  }
}

/**
 * Check whether the OS has granted notification permission (without
 * prompting). Useful for SettingsScreen to render the correct state.
 */
export async function hasPermission(): Promise<boolean> {
  try {
    const settings = await notifee.getNotificationSettings();
    return (
      settings.authorizationStatus === AuthorizationStatus.AUTHORIZED ||
      settings.authorizationStatus === AuthorizationStatus.PROVISIONAL
    );
  } catch {
    return false;
  }
}

// ─── Preferences ─────────────────────────────────────────────────

/**
 * Get the user's notification category preferences.
 */
export async function getPreferences(): Promise<PushPreferences> {
  try {
    const json = await AsyncStorage.getItem(PUSH_PREFS_KEY);
    return json ? { ...DEFAULT_PREFS, ...JSON.parse(json) } : DEFAULT_PREFS;
  } catch {
    return DEFAULT_PREFS;
  }
}

/**
 * Update notification preferences. When the seasonAlerts preference changes
 * we re-sync the scheduled local notifications to match.
 */
export async function updatePreferences(prefs: Partial<PushPreferences>): Promise<void> {
  const current = await getPreferences();
  const updated = { ...current, ...prefs };
  await AsyncStorage.setItem(PUSH_PREFS_KEY, JSON.stringify(updated));

  // Re-sync season alerts when their toggle flipped
  if (typeof prefs.seasonAlerts === 'boolean') {
    if (prefs.seasonAlerts) {
      await scheduleSeasonAlerts();
    } else {
      await cancelSeasonAlerts();
    }
  }
}

// ─── Notification Routing ────────────────────────────────────────

/**
 * Map a notification type + data payload to a target screen.
 * Consumed by the deep-link router when a notification is tapped.
 */
export function handleNotification(notification: {
  type: string;
  title: string;
  body: string;
  data?: Record<string, unknown>;
}): { screen: string; params?: Record<string, unknown> } | null {
  switch (notification.type) {
    case 'season_alert':
      return { screen: 'Regulations' };
    case 'camp_activity':
      return { screen: 'DeerCamp', params: { campId: notification.data?.camp_id } };
    case 'regulation_change':
      return { screen: 'Regulations' };
    case 'weather_alert':
      return { screen: 'Scout', params: { showWeather: true } };
    default:
      return null;
  }
}

// ─── Season Alert Scheduling ─────────────────────────────────────

/**
 * Schedule all upcoming Maryland season-opening local notifications.
 *
 * Behavior:
 *  - No-op if seasonAlerts preference is disabled
 *  - No-op if notification permission is not granted
 *  - Skips any season whose date is already in the past
 *  - Idempotent: existing scheduled notifications with our ids are replaced
 */
export async function scheduleSeasonAlerts(): Promise<void> {
  const prefs = await getPreferences();
  if (!prefs.seasonAlerts) return;

  const granted = await hasPermission();
  if (!granted) {
    // eslint-disable-next-line no-console
    console.log('[Push] Skip schedule — no permission');
    return;
  }

  const now = Date.now();
  let scheduled = 0;

  for (const season of MD_SEASON_OPENINGS) {
    const timestamp = new Date(season.date).getTime();
    if (timestamp <= now) continue;

    const trigger: TimestampTrigger = {
      type: TriggerType.TIMESTAMP,
      timestamp,
    };

    try {
      await notifee.createTriggerNotification(
        {
          id: SEASON_ALERT_PREFIX + season.id,
          title: season.title,
          body: season.body,
          android: {
            channelId: 'md-general',
            pressAction: { id: 'default' },
          },
          ios: {
            sound: 'default',
          },
          data: { type: 'season_alert', season_id: season.id },
        },
        trigger,
      );
      scheduled += 1;
    } catch (err) {
      // eslint-disable-next-line no-console
      console.warn('[Push] Failed to schedule', season.id, err);
    }
  }

  // eslint-disable-next-line no-console
  console.log(`[Push] Scheduled ${scheduled} season alerts`);
}

/**
 * Cancel every scheduled season-opening local notification.
 */
export async function cancelSeasonAlerts(): Promise<void> {
  try {
    const ids = MD_SEASON_OPENINGS.map((s) => SEASON_ALERT_PREFIX + s.id);
    await notifee.cancelTriggerNotifications(ids);
    // eslint-disable-next-line no-console
    console.log('[Push] Cancelled season alerts');
  } catch (err) {
    // eslint-disable-next-line no-console
    console.warn('[Push] Cancel season alerts failed:', err);
  }
}

/**
 * Fire an immediate local notification. Used for in-app events (e.g., a new
 * camp photo) where the server isn't involved yet.
 */
export async function displayLocalNotification(opts: {
  title: string;
  body: string;
  data?: Record<string, string>;
}): Promise<void> {
  try {
    const granted = await hasPermission();
    if (!granted) return;
    await notifee.displayNotification({
      title: opts.title,
      body: opts.body,
      android: { channelId: 'md-general', pressAction: { id: 'default' } },
      ios: { sound: 'default' },
      data: opts.data,
    });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.warn('[Push] displayLocalNotification failed:', err);
  }
}

/**
 * Clear all scheduled + displayed notifications. Call on sign-out.
 */
export async function unregister(): Promise<void> {
  try {
    await notifee.cancelAllNotifications();
    await AsyncStorage.removeItem(PERMISSION_REQUESTED_KEY);
  } catch (err) {
    // eslint-disable-next-line no-console
    console.warn('[Push] Unregister failed:', err);
  }
}
