import {
  pointToSegmentMeters,
  distanceToRouteMeters,
  assessOffRoute,
  toRouteCoords,
  type LatLng,
} from '../offRouteService';

// A ~1.1 km north-south segment along the -77.000 meridian at ~39°N.
const A: LatLng = { lat: 39.0, lng: -77.0 };
const B: LatLng = { lat: 39.01, lng: -77.0 };
const ROUTE: LatLng[] = [A, B];

// At 39°N, 1° of longitude ≈ 111320 * cos(39°) ≈ 86,500 m.
// 0.001° east of the meridian ≈ 86.5 m.
const P_ON: LatLng = { lat: 39.005, lng: -77.0 }; // on the line
const P_86: LatLng = { lat: 39.005, lng: -76.999 }; // ~86 m east
const P_NORTH: LatLng = { lat: 39.02, lng: -77.0 }; // 0.01° past the north end

describe('pointToSegmentMeters', () => {
  it('is ~0 for a point on the segment', () => {
    expect(pointToSegmentMeters(P_ON, A, B)).toBeLessThan(1);
  });
  it('measures perpendicular offset (~86 m for 0.001° lng at 39°N)', () => {
    const d = pointToSegmentMeters(P_86, A, B);
    expect(d).toBeGreaterThan(80);
    expect(d).toBeLessThan(93);
  });
  it('clamps past an endpoint (distance to the nearer end)', () => {
    // 0.01° north of B ≈ 1113 m.
    const d = pointToSegmentMeters(P_NORTH, A, B);
    expect(d).toBeGreaterThan(1090);
    expect(d).toBeLessThan(1135);
  });
  it('handles a degenerate segment (a === b)', () => {
    expect(pointToSegmentMeters(P_ON, A, A)).toBeGreaterThan(500); // ~556 m from A
  });
});

describe('distanceToRouteMeters', () => {
  it('returns Infinity for an empty route', () => {
    expect(distanceToRouteMeters(P_ON, [])).toBe(Infinity);
  });
  it('uses point distance for a single-point route', () => {
    expect(distanceToRouteMeters(P_ON, [A])).toBeGreaterThan(500); // ~556 m from A
  });
  it('takes the minimum across segments', () => {
    const route = [A, B, { lat: 39.01, lng: -76.99 }]; // adds an east leg
    // P_86 is nearest the first (N-S) leg at ~86 m.
    const d = distanceToRouteMeters(P_86, route);
    expect(d).toBeGreaterThan(80);
    expect(d).toBeLessThan(93);
  });
});

describe('assessOffRoute (hysteresis)', () => {
  const opts = { offThresholdM: 50, onThresholdM: 25 };

  it('stays on-route when close', () => {
    const r = assessOffRoute(P_ON, ROUTE, false, opts);
    expect(r.offRoute).toBe(false);
    expect(r.transition).toBe('none');
  });

  it('trips off-route past the off threshold', () => {
    const r = assessOffRoute(P_86, ROUTE, false, opts); // ~86 m > 50
    expect(r.offRoute).toBe(true);
    expect(r.transition).toBe('went-off');
  });

  it('stays off-route in the hysteresis band (between on and off)', () => {
    // ~35 m east: still > onThreshold(25), so once off you stay off.
    const p35: LatLng = { lat: 39.005, lng: -77.0 + 35 / (111320 * Math.cos((39 * Math.PI) / 180)) };
    const r = assessOffRoute(p35, ROUTE, true, opts);
    expect(r.distanceMeters).toBeGreaterThan(25);
    expect(r.distanceMeters).toBeLessThan(50);
    expect(r.offRoute).toBe(true);
    expect(r.transition).toBe('none');
  });

  it('clears back on-route within the on threshold', () => {
    const r = assessOffRoute(P_ON, ROUTE, true, opts); // ~0 m <= 25
    expect(r.offRoute).toBe(false);
    expect(r.transition).toBe('came-back');
  });
});

describe('toRouteCoords', () => {
  it('maps track samples to lat/lng coords', () => {
    expect(toRouteCoords([{ lat: 1, lng: 2, altitude: 9 } as any])).toEqual([{ lat: 1, lng: 2 }]);
  });
});
