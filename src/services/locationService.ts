/**
 * Location Service Module — HuntPlan AI
 *
 * Provides GPS location services for the app:
 * - One-time location capture (high accuracy)
 * - Continuous GPS tracking for recording hunts
 * - Heading and speed information when available
 *
 * Uses @react-native-community/geolocation for iOS/Android compatibility.
 * Requires NSLocationWhenInUseUsageDescription in Info.plist.
 */

import Geolocation from '@react-native-community/geolocation';

/**
 * Represents a single GPS coordinate with associated data
 * @interface Location
 * @property {number} latitude - Decimal latitude
 * @property {number} longitude - Decimal longitude
 * @property {number} accuracy - Horizontal accuracy in meters
 * @property {number} [heading] - Compass heading in degrees (0-360), undefined if not available
 * @property {number} [speed] - Speed in meters/second, undefined if not available
 */
export interface Location {
  latitude: number;
  longitude: number;
  accuracy: number;
  heading?: number;
  speed?: number;
}

/**
 * Callbacks for location tracking events
 * @interface LocationCallback
 * @property {Function} onSuccess - Called when location is obtained
 * @property {Function} onError - Called when an error occurs
 */
interface LocationCallback {
  onSuccess: (location: Location) => void;
  onError: (error: string) => void;
}

/**
 * Get the current GPS location one time with high accuracy
 * Waits up to 10 seconds for a fix. Used for centering map on device.
 * @async
 * @returns {Promise<Location>} Current location with latitude, longitude, accuracy, heading, speed
 * @throws {Error} If geolocation fails or times out
 */
export function getCurrentLocation(): Promise<Location> {
  return new Promise((resolve, reject) => {
    Geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude, accuracy, heading, speed } = position.coords;
        // Extract coordinates and optional fields; undefined if not available from device
        resolve({
          latitude,
          longitude,
          accuracy,
          heading: heading || undefined,
          speed: speed || undefined,
        });
      },
      (error) => {
        reject(new Error(error.message || 'Failed to get location'));
      },
      {
        enableHighAccuracy: true,  // Use GPS instead of WiFi/cellular triangulation
        timeout: 10000,            // Maximum wait time in milliseconds
        maximumAge: 0,             // Don't use cached position
      }
    );
  });
}

/**
 * Start continuous GPS tracking for recording hunts or movement
 * Invokes callback each time location updates by >10m or at 5-second intervals.
 * Used by TrackMeBar to record GPS tracks for scouting or hunt logs.
 * @param {LocationCallback} callback - Success and error handlers
 * @param {number} [interval=5000] - Maximum age of cached position in milliseconds
 * @returns {number} Watch ID used to stop tracking (pass to stopTracking)
 */
export function startTracking(callback: LocationCallback, interval: number = 5000): number {
  return Geolocation.watchPosition(
    (position) => {
      const { latitude, longitude, accuracy, heading, speed } = position.coords;
      // Call success callback with new location
      callback.onSuccess({
        latitude,
        longitude,
        accuracy,
        heading: heading || undefined,
        speed: speed || undefined,
      });
    },
    (error) => {
      // Call error callback on geolocation failure
      callback.onError(error.message || 'Location tracking error');
    },
    {
      enableHighAccuracy: true,  // Use GPS for best accuracy during active tracking
      timeout: 10000,            // Timeout per request
      maximumAge: interval,      // Reuse cached position if newer than interval
      distanceFilter: 10,        // Only trigger callback if moved >10m (battery optimization)
    }
  );
}

/**
 * Stop tracking a specific GPS watcher by ID
 * Always call when done recording to free resources.
 * @param {number} watchId - Watch ID returned by startTracking()
 */
export function stopTracking(watchId: number): void {
  Geolocation.clearWatch(watchId);
}
