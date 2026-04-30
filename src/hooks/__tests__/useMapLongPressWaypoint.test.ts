/**
 * useMapLongPressWaypoint contract tests.
 *
 * The project ships neither `@testing-library/react-native` nor
 * `react-test-renderer`, so we follow the same pattern
 * `UserWaypointContext.test.tsx` uses: test the pure behavior the hook
 * wraps. `useMapLongPressWaypoint` is a `useCallback` shell around the
 * pure `createLongPressWaypointHandler` factory — exercising the factory
 * locks the long-press → Alert → navigate contract without needing a
 * React renderer.
 */

import { Alert } from 'react-native';
import { createLongPressWaypointHandler } from '../useMapLongPressWaypoint';

function makeFeature(lng: number, lat: number): GeoJSON.Feature {
  return {
    type: 'Feature',
    geometry: { type: 'Point', coordinates: [lng, lat] },
    properties: {},
  };
}

describe('useMapLongPressWaypoint (via createLongPressWaypointHandler)', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('is a no-op when the feature is missing or has no coordinates', () => {
    const navigate = jest.fn();
    const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => {});

    const handler = createLongPressWaypointHandler({ mode: 'hunt', navigate });
    handler(undefined);
    handler(null);
    handler({
      type: 'Feature',
      geometry: { type: 'Point', coordinates: [] as unknown as number[] },
      properties: {},
    });

    expect(alertSpy).not.toHaveBeenCalled();
    expect(navigate).not.toHaveBeenCalled();
  });

  it('is a no-op when coordinates are non-finite', () => {
    const navigate = jest.fn();
    const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => {});

    const handler = createLongPressWaypointHandler({ mode: 'fish', navigate });
    handler(makeFeature(NaN, 38.9));
    handler(makeFeature(-76.6, Infinity));

    expect(alertSpy).not.toHaveBeenCalled();
    expect(navigate).not.toHaveBeenCalled();
  });

  it('shows an Alert with lat/lng on valid long-press and calls onBeforeConfirm', () => {
    const navigate = jest.fn();
    const onBeforeConfirm = jest.fn();
    const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => {});

    const handler = createLongPressWaypointHandler({
      mode: 'camp',
      navigate,
      onBeforeConfirm,
    });
    handler(makeFeature(-76.6, 39.3));

    expect(onBeforeConfirm).toHaveBeenCalledWith(39.3, -76.6);
    expect(alertSpy).toHaveBeenCalledTimes(1);
    const [title, body, buttons] = alertSpy.mock.calls[0];
    expect(title).toBe('Drop waypoint here?');
    expect(body).toContain('39.300000');
    expect(body).toContain('-76.600000');
    expect(Array.isArray(buttons)).toBe(true);
    expect(buttons).toHaveLength(2);
  });

  it('the Alert confirm button navigates to WaypointEdit with mode + coords', () => {
    const navigate = jest.fn();
    const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => {});

    const handler = createLongPressWaypointHandler({ mode: 'hike', navigate });
    handler(makeFeature(-77.12, 39.45));

    const buttons = alertSpy.mock.calls[0][2] as Array<{
      text: string;
      onPress?: () => void;
    }>;
    const confirm = buttons.find((b) => b.text === 'Add waypoint');
    expect(confirm).toBeTruthy();
    confirm!.onPress!();

    expect(navigate).toHaveBeenCalledWith('WaypointEdit', {
      mode: 'hike',
      initialLat: 39.45,
      initialLng: -77.12,
    });
  });

  it('cancel button is wired with the right style and does not navigate', () => {
    const navigate = jest.fn();
    const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => {});

    const handler = createLongPressWaypointHandler({ mode: 'hunt', navigate });
    handler(makeFeature(-76.5, 39.0));

    const buttons = alertSpy.mock.calls[0][2] as Array<{
      text: string;
      style?: string;
    }>;
    const cancel = buttons.find((b) => b.text === 'Cancel');
    expect(cancel).toBeTruthy();
    expect(cancel!.style).toBe('cancel');
    // Intentionally do NOT invoke cancel.onPress — confirm we didn't navigate.
    expect(navigate).not.toHaveBeenCalled();
  });
});
