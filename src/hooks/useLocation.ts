import { useState, useEffect, useRef, useCallback } from 'react';
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
  /**
   * Request a fresh one-shot fix. Resolves with the location (or null on
   * failure) so callers can chain a camera move without waiting on a
   * re-render. Also triggers the OS permission prompt on first use.
   */
  refetch: () => Promise<Location | null>;
}

export interface UseLocationOptions {
  /** Keep a watchPosition subscription alive while mounted. */
  trackContinuous?: boolean;
  /**
   * Fetch a fix (and therefore trigger the OS permission prompt) as soon as
   * the hook mounts. Defaults to true for backwards compatibility. Map
   * screens pass `false` so the permission prompt is tied to the Locate
   * button gesture instead of landing on top of the first-run UI.
   */
  requestOnMount?: boolean;
}

/**
 * Hook that provides current location and tracking.
 *
 * Accepts either the legacy boolean (`trackContinuous`) or an options object.
 */
export function useLocation(
  arg: boolean | UseLocationOptions = false,
): UseLocationResult {
  const options: UseLocationOptions =
    typeof arg === 'boolean' ? { trackContinuous: arg } : arg;
  const trackContinuous = !!options.trackContinuous;
  const requestOnMount = options.requestOnMount !== false;

  const [location, setLocation] = useState<Location | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(requestOnMount);
  const watchIdRef = useRef<number | null>(null);
  const mountedRef = useRef(true);

  const fetchLocation = useCallback(async (): Promise<Location | null> => {
    try {
      if (mountedRef.current) setLoading(true);
      const loc = await getCurrentLocation();
      if (mountedRef.current) {
        setLocation(loc);
        setError(null);
      }
      return loc;
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : 'Failed to get location';
      if (mountedRef.current) {
        setError(errorMessage);
        setLocation(null);
      }
      return null;
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    // Get initial location only when the caller wants it on mount.
    if (requestOnMount) {
      void fetchLocation();
    }

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
      mountedRef.current = false;
      if (watchIdRef.current !== null) {
        stopTracking(watchIdRef.current);
        watchIdRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trackContinuous, requestOnMount]);

  return {
    location,
    error,
    loading,
    refetch: fetchLocation,
  };
}
