/**
 * useOffRouteAlerts — watch live GPS against a route and warn on wrong turns.
 *
 * Feeds locationService's GPS watcher into offRouteService's hysteresis state
 * machine. Vibrates once on the on→off transition and exposes the current status
 * for a banner. No-ops cleanly when disabled or the route is too short to follow.
 * The GPS subscription only re-subscribes when `enabled`/`route`/`options` change,
 * so pass a memoized `route`.
 */
import { useEffect, useRef, useState } from 'react';
import { Vibration } from 'react-native';
import { startTracking, stopTracking, Location } from '../services/locationService';
import {
  assessOffRoute,
  type LatLng,
  type OffRouteOptions,
} from '../services/offRouteService';

interface UseOffRouteAlertsParams {
  route: LatLng[];
  enabled: boolean;
  options?: OffRouteOptions;
  /** Fired once each time the user crosses from on-route to off-route. */
  onWentOff?: (distanceMeters: number) => void;
  /** Fired once each time the user returns to the route. */
  onCameBack?: () => void;
}

export interface OffRouteStatus {
  offRoute: boolean;
  distanceMeters: number | null;
}

export function useOffRouteAlerts({
  route,
  enabled,
  options,
  onWentOff,
  onCameBack,
}: UseOffRouteAlertsParams): OffRouteStatus {
  const [status, setStatus] = useState<OffRouteStatus>({
    offRoute: false,
    distanceMeters: null,
  });
  const wasOff = useRef(false);
  // Keep latest callbacks without retriggering the GPS subscription.
  const onWentOffRef = useRef(onWentOff);
  const onCameBackRef = useRef(onCameBack);
  onWentOffRef.current = onWentOff;
  onCameBackRef.current = onCameBack;

  useEffect(() => {
    if (!enabled || route.length < 2) {
      wasOff.current = false;
      setStatus({ offRoute: false, distanceMeters: null });
      return;
    }
    const watchId = startTracking(
      {
        onSuccess: (loc: Location) => {
          const res = assessOffRoute(
            { lat: loc.latitude, lng: loc.longitude },
            route,
            wasOff.current,
            options,
          );
          wasOff.current = res.offRoute;
          setStatus({ offRoute: res.offRoute, distanceMeters: res.distanceMeters });
          if (res.transition === 'went-off') {
            Vibration.vibrate([0, 400, 150, 400]);
            onWentOffRef.current?.(res.distanceMeters);
          } else if (res.transition === 'came-back') {
            onCameBackRef.current?.();
          }
        },
        onError: () => {
          /* transient GPS error — keep last known status */
        },
      },
      3000,
    );
    return () => stopTracking(watchId);
  }, [enabled, route, options]);

  return status;
}
