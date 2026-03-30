import Geolocation from '@react-native-community/geolocation';

export interface Location {
  latitude: number;
  longitude: number;
  accuracy: number;
  heading?: number;
  speed?: number;
}

interface LocationCallback {
  onSuccess: (location: Location) => void;
  onError: (error: string) => void;
}

/**
 * Get the current location once (high accuracy).
 */
export function getCurrentLocation(): Promise<Location> {
  return new Promise((resolve, reject) => {
    Geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude, accuracy, heading, speed } = position.coords;
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
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      }
    );
  });
}

/**
 * Start continuous location tracking.
 */
export function startTracking(callback: LocationCallback, interval: number = 5000): number {
  return Geolocation.watchPosition(
    (position) => {
      const { latitude, longitude, accuracy, heading, speed } = position.coords;
      callback.onSuccess({
        latitude,
        longitude,
        accuracy,
        heading: heading || undefined,
        speed: speed || undefined,
      });
    },
    (error) => {
      callback.onError(error.message || 'Location tracking error');
    },
    {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: interval,
      distanceFilter: 10,
    }
  );
}

/**
 * Stop a specific location watcher.
 */
export function stopTracking(watchId: number): void {
  Geolocation.clearWatch(watchId);
}
