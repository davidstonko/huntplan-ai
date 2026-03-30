import { useState, useEffect, useRef } from 'react';
import {
  getCurrentLocation,
  startTracking,
  stopTracking,
  Location,
} from '../services/locationService';

interface UseLocationResult {
  location: Location | null;
  error: string | null;
  loading: boolean;
  refetch: () => void;
}

/**
 * Hook that provides current location and tracking
 */
export function useLocation(trackContinuous = false): UseLocationResult {
  const [location, setLocation] = useState<Location | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const watchIdRef = useRef<number | null>(null);

  const fetchLocation = async () => {
    try {
      setLoading(true);
      const loc = await getCurrentLocation();
      setLocation(loc);
      setError(null);
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : 'Failed to get location';
      setError(errorMessage);
      setLocation(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Get initial location
    fetchLocation();

    // Setup continuous tracking if requested
    if (trackContinuous) {
      watchIdRef.current = startTracking(
        {
          onSuccess: (loc) => {
            setLocation(loc);
            setError(null);
          },
          onError: (err) => {
            setError(err);
          },
        },
        5000 // Update every 5 seconds
      );
    }

    // Cleanup
    return () => {
      if (watchIdRef.current !== null) {
        stopTracking(watchIdRef.current);
      }
    };
  }, [trackContinuous]);

  return {
    location,
    error,
    loading,
    refetch: fetchLocation,
  };
}
