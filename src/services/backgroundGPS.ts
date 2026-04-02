/**
 * @file backgroundGPS.ts
 * @description Background GPS tracking service for continuous track recording.
 * Wraps react-native-background-geolocation for all-day scouting trips.
 *
 * NOTE: Requires native library installation:
 *   npm install react-native-background-geolocation
 *   cd ios && pod install
 *
 * Until the native library is installed, this module exports no-op stubs
 * so the app compiles without errors.
 *
 * @module Services
 * @version 1.0.0
 */

import { Platform } from 'react-native';

// ─── Types ──────────────────────────────────────────────────────

export interface GPSPosition {
  latitude: number;
  longitude: number;
  altitude: number;
  speed: number; // m/s
  heading: number; // degrees
  accuracy: number; // meters
  timestamp: number; // epoch ms
}

export interface BackgroundGPSConfig {
  /** Minimum distance between points in meters (default: 10) */
  distanceFilter: number;
  /** Minimum time between points in ms (default: 5000) */
  interval: number;
  /** Enable battery-saving mode (default: true) */
  batterySaving: boolean;
  /** Activity type hint for iOS (default: 'fitness') */
  activityType: 'fitness' | 'other';
}

export type GPSCallback = (position: GPSPosition) => void;

const DEFAULT_CONFIG: BackgroundGPSConfig = {
  distanceFilter: 10,
  interval: 5000,
  batterySaving: true,
  activityType: 'fitness',
};

// ─── State ──────────────────────────────────────────────────────

let isTracking = false;
let watchId: number | null = null;
let positionCallback: GPSCallback | null = null;

// Try to load the native background geolocation library
let BackgroundGeolocation: any = null;
try {
  // This will throw if the native module isn't installed
  BackgroundGeolocation = require('react-native-background-geolocation').default;
} catch {
  if (__DEV__) {
    console.warn(
      '[BackgroundGPS] react-native-background-geolocation not installed. ' +
      'Background tracking will use foreground-only fallback.'
    );
  }
}

// ─── Core Functions ─────────────────────────────────────────────

/**
 * Configure and start background GPS tracking.
 * Falls back to standard Geolocation.watchPosition if native library unavailable.
 */
export async function startBackgroundTracking(
  onPosition: GPSCallback,
  config: Partial<BackgroundGPSConfig> = {},
): Promise<boolean> {
  if (isTracking) {
    if (__DEV__) console.warn('[BackgroundGPS] Already tracking');
    return true;
  }

  const cfg = { ...DEFAULT_CONFIG, ...config };
  positionCallback = onPosition;

  if (BackgroundGeolocation) {
    // Use native background geolocation
    try {
      await BackgroundGeolocation.ready({
        desiredAccuracy: BackgroundGeolocation.DESIRED_ACCURACY_HIGH,
        distanceFilter: cfg.distanceFilter,
        stopOnTerminate: false,
        startOnBoot: false,
        enableHeadless: false,
        locationAuthorizationRequest: 'Always',
        backgroundPermissionRationale: {
          title: 'Allow MDHuntFishOutdoors to track your location in the background?',
          message:
            'Background location is needed to record your scouting track while your phone is in your pocket.',
          positiveAction: 'Allow',
          negativeAction: 'Cancel',
        },
        // iOS-specific
        activityType: Platform.OS === 'ios' ? (cfg.activityType === 'fitness' ? 1 : 3) : undefined,
        // Battery optimization
        preventSuspend: !cfg.batterySaving,
        heartbeatInterval: cfg.batterySaving ? 60 : 15,
      });

      // Listen for location updates
      BackgroundGeolocation.onLocation((location: any) => {
        if (positionCallback && location.coords) {
          positionCallback({
            latitude: location.coords.latitude,
            longitude: location.coords.longitude,
            altitude: location.coords.altitude || 0,
            speed: location.coords.speed || 0,
            heading: location.coords.heading || 0,
            accuracy: location.coords.accuracy || 0,
            timestamp: new Date(location.timestamp).getTime(),
          });
        }
      });

      await BackgroundGeolocation.start();
      isTracking = true;

      if (__DEV__) console.log('[BackgroundGPS] Native background tracking started');
      return true;
    } catch (err) {
      if (__DEV__) console.error('[BackgroundGPS] Failed to start native tracking:', err);
      // Fall through to foreground fallback
    }
  }

  // Foreground-only fallback using standard Geolocation API
  try {
    const { default: Geolocation } = await import('@react-native-community/geolocation');

    watchId = Geolocation.watchPosition(
      (position) => {
        if (positionCallback) {
          positionCallback({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            altitude: position.coords.altitude || 0,
            speed: position.coords.speed || 0,
            heading: position.coords.heading || 0,
            accuracy: position.coords.accuracy || 0,
            timestamp: position.timestamp,
          });
        }
      },
      (error) => {
        if (__DEV__) console.error('[BackgroundGPS] Foreground watch error:', error);
      },
      {
        enableHighAccuracy: true,
        distanceFilter: cfg.distanceFilter,
        interval: cfg.interval,
        fastestInterval: cfg.interval / 2,
      }
    );

    isTracking = true;
    if (__DEV__)
      console.log(
        '[BackgroundGPS] Foreground-only tracking started (background library not available)'
      );
    return true;
  } catch (err) {
    if (__DEV__) console.error('[BackgroundGPS] Failed to start foreground tracking:', err);
    return false;
  }
}

/**
 * Stop background GPS tracking.
 */
export async function stopBackgroundTracking(): Promise<void> {
  if (!isTracking) return;

  if (BackgroundGeolocation) {
    try {
      await BackgroundGeolocation.stop();
      BackgroundGeolocation.removeListeners();
    } catch (err) {
      if (__DEV__) console.error('[BackgroundGPS] Failed to stop native tracking:', err);
    }
  } else if (watchId !== null) {
    try {
      const { default: Geolocation } = await import('@react-native-community/geolocation');
      Geolocation.clearWatch(watchId);
    } catch {
      // ignore
    }
    watchId = null;
  }

  isTracking = false;
  positionCallback = null;
  if (__DEV__) console.log('[BackgroundGPS] Tracking stopped');
}

/**
 * Check if background tracking is currently active.
 */
export function isBackgroundTrackingActive(): boolean {
  return isTracking;
}

/**
 * Check if the native background geolocation library is available.
 */
export function isNativeBackgroundAvailable(): boolean {
  return BackgroundGeolocation !== null;
}

/**
 * Get estimated battery impact level.
 */
export function getBatteryImpact(config: Partial<BackgroundGPSConfig> = {}): 'low' | 'medium' | 'high' {
  const cfg = { ...DEFAULT_CONFIG, ...config };
  if (cfg.batterySaving && cfg.distanceFilter >= 20) return 'low';
  if (cfg.batterySaving || cfg.distanceFilter >= 10) return 'medium';
  return 'high';
}
