/**
 * scentConeGeometry — contract tests.
 *
 * Lock the math that drives the Hunt-map scent-cone overlay. The
 * renderer (`ScentConeLayer`) is a thin bridge — as long as the
 * polygon+metadata coming out of this module is right, the map layer
 * is right.
 */

import {
  buildScentCone,
  coneLengthForWindSpeed,
  destinationPoint,
  bearingToCardinal,
  CALM_THRESHOLD_MPH,
} from '../scentConeGeometry';

function haversine(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
): number {
  const R = 6_371_000;
  const toRad = Math.PI / 180;
  const dLat = (lat2 - lat1) * toRad;
  const dLng = (lng2 - lng1) * toRad;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * toRad) *
      Math.cos(lat2 * toRad) *
      Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

describe('coneLengthForWindSpeed', () => {
  it('is 0 at or below 0 mph', () => {
    expect(coneLengthForWindSpeed(0)).toBe(0);
    expect(coneLengthForWindSpeed(-5)).toBe(0);
  });

  it('grows linearly then caps at 1 mile', () => {
    expect(coneLengthForWindSpeed(5)).toBe(160 + 64 * 5);
    expect(coneLengthForWindSpeed(10)).toBe(160 + 64 * 10);
    expect(coneLengthForWindSpeed(22.64)).toBeCloseTo(1609.3, 0);
    // Cap: at 30 mph we should be at the 1-mi ceiling.
    expect(coneLengthForWindSpeed(30)).toBeCloseTo(1609.344, 2);
    expect(coneLengthForWindSpeed(80)).toBeCloseTo(1609.344, 2);
  });
});

describe('destinationPoint', () => {
  it('round-trips a known Maryland bearing/distance', () => {
    // Annapolis → Baltimore is ~042° at 46km as a sanity check.
    const d = destinationPoint(38.979, -76.492, 315, 1000);
    // NW 1km moves lat up and lng down.
    expect(d.lat).toBeGreaterThan(38.979);
    expect(d.lng).toBeLessThan(-76.492);
    // And the resulting distance should actually be ~1000m.
    const back = haversine(38.979, -76.492, d.lat, d.lng);
    expect(back).toBeGreaterThan(990);
    expect(back).toBeLessThan(1010);
  });

  it('bearing 0 moves latitude northward', () => {
    const d = destinationPoint(39, -77, 0, 500);
    expect(d.lat).toBeGreaterThan(39);
    expect(Math.abs(d.lng + 77)).toBeLessThan(0.0001);
  });

  it('bearing 90 moves longitude eastward', () => {
    const d = destinationPoint(39, -77, 90, 500);
    expect(d.lng).toBeGreaterThan(-77);
    expect(Math.abs(d.lat - 39)).toBeLessThan(0.0001);
  });
});

describe('buildScentCone', () => {
  const origin = { lat: 39.3, lng: -76.9 };

  it('returns null when wind is calm', () => {
    expect(
      buildScentCone({
        originLat: origin.lat,
        originLng: origin.lng,
        windFromDirectionDeg: 90,
        windSpeedMph: CALM_THRESHOLD_MPH - 0.5,
      }),
    ).toBeNull();
  });

  it('returns null for NaN inputs rather than producing junk geometry', () => {
    expect(
      buildScentCone({
        originLat: NaN,
        originLng: origin.lng,
        windFromDirectionDeg: 90,
        windSpeedMph: 10,
      }),
    ).toBeNull();
    expect(
      buildScentCone({
        originLat: origin.lat,
        originLng: origin.lng,
        windFromDirectionDeg: NaN,
        windSpeedMph: 10,
      }),
    ).toBeNull();
    expect(
      buildScentCone({
        originLat: origin.lat,
        originLng: origin.lng,
        windFromDirectionDeg: 90,
        windSpeedMph: NaN,
      }),
    ).toBeNull();
  });

  it('produces a closed polygon with the origin at the tip', () => {
    const out = buildScentCone({
      originLat: origin.lat,
      originLng: origin.lng,
      windFromDirectionDeg: 270, // wind from west; scent goes east
      windSpeedMph: 10,
      arcSegments: 12,
    });
    expect(out).not.toBeNull();
    const ring = out!.polygon.coordinates[0];
    // Tip + arcSegments+1 edge points + closing tip.
    expect(ring.length).toBe(1 + 13 + 1);
    // First and last are the same point (tip).
    expect(ring[0]).toEqual(ring[ring.length - 1]);
    expect(ring[0][0]).toBeCloseTo(origin.lng, 6);
    expect(ring[0][1]).toBeCloseTo(origin.lat, 6);
  });

  it('orients the cone axis 180° from the FROM direction', () => {
    // Wind FROM west (270°) ⇒ scent going east (90°).
    const out = buildScentCone({
      originLat: origin.lat,
      originLng: origin.lng,
      windFromDirectionDeg: 270,
      windSpeedMph: 10,
    })!;
    expect(out.downwindHeadingDeg).toBe(90);

    // The midpoint of the arc (by bearing) should be ~due east, so its
    // longitude should be noticeably greater than origin and its
    // latitude close to origin.
    const ring = out.polygon.coordinates[0];
    const midIdx = Math.floor(ring.length / 2);
    const [midLng, midLat] = ring[midIdx];
    expect(midLng).toBeGreaterThan(origin.lng);
    expect(Math.abs(midLat - origin.lat)).toBeLessThan(0.01);
  });

  it('cone tip-to-arc-midpoint distance equals the computed length', () => {
    const out = buildScentCone({
      originLat: origin.lat,
      originLng: origin.lng,
      windFromDirectionDeg: 0, // wind from N → scent S
      windSpeedMph: 10,
      arcSegments: 24,
    })!;
    const ring = out.polygon.coordinates[0];
    // Middle of the arc should be the apex of the cone on the downwind axis.
    const midIdx = Math.floor(ring.length / 2);
    const [midLng, midLat] = ring[midIdx];
    const d = haversine(origin.lat, origin.lng, midLat, midLng);
    expect(d).toBeGreaterThan(out.lengthMeters * 0.99);
    expect(d).toBeLessThan(out.lengthMeters * 1.01);
  });

  it('respects lengthMetersOverride', () => {
    const out = buildScentCone({
      originLat: origin.lat,
      originLng: origin.lng,
      windFromDirectionDeg: 180,
      windSpeedMph: 20,
      lengthMetersOverride: 500,
    })!;
    expect(out.lengthMeters).toBe(500);
  });
});

describe('bearingToCardinal', () => {
  it('maps cardinal and intercardinal bearings', () => {
    expect(bearingToCardinal(0)).toBe('N');
    expect(bearingToCardinal(45)).toBe('NE');
    expect(bearingToCardinal(90)).toBe('E');
    expect(bearingToCardinal(135)).toBe('SE');
    expect(bearingToCardinal(180)).toBe('S');
    expect(bearingToCardinal(225)).toBe('SW');
    expect(bearingToCardinal(270)).toBe('W');
    expect(bearingToCardinal(315)).toBe('NW');
    expect(bearingToCardinal(360)).toBe('N'); // wraps
    expect(bearingToCardinal(-45)).toBe('NW'); // negative handled
  });
});
