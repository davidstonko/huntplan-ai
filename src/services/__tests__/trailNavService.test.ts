/**
 * trailNavService — contract tests.
 *
 * Locks the snap-to-polyline math driving the Hike-map trail HUD.
 */

import {
  haversineMeters,
  initialBearingDeg,
  snapToPolyline,
  findNearestTrail,
  classifyTrailStatus,
} from '../trailNavService';

describe('haversineMeters', () => {
  it('returns 0 for same point', () => {
    expect(haversineMeters(39, -77, 39, -77)).toBeCloseTo(0, 3);
  });

  it('matches known short-distance value (≈111 m per 0.001°)', () => {
    const d = haversineMeters(39, -77, 39.001, -77);
    // 0.001° of latitude = ~111.1 m
    expect(d).toBeGreaterThan(110);
    expect(d).toBeLessThan(112);
  });

  it('is symmetric', () => {
    const a = haversineMeters(39.1, -77.2, 39.3, -76.9);
    const b = haversineMeters(39.3, -76.9, 39.1, -77.2);
    expect(a).toBeCloseTo(b, 3);
  });
});

describe('initialBearingDeg', () => {
  it('due north → 0°', () => {
    expect(initialBearingDeg(39, -77, 40, -77)).toBeCloseTo(0, 3);
  });
  it('due east along a parallel is ≈ 90° (initial great-circle bearing)', () => {
    // On a sphere, the great-circle between two points at the same latitude
    // bulges toward the nearer pole, so the initial bearing is *not* exactly
    // 90° — it deviates by ~(Δλ/2)·sinφ. For 1° at lat 39 that's ~0.3°.
    const b = initialBearingDeg(39, -77, 39, -76);
    expect(b).toBeGreaterThan(89);
    expect(b).toBeLessThan(90);
  });
  it('due south → 180°', () => {
    expect(initialBearingDeg(39, -77, 38, -77)).toBeCloseTo(180, 3);
  });
  it('due west along a parallel is ≈ 270°', () => {
    const b = initialBearingDeg(39, -77, 39, -78);
    expect(b).toBeGreaterThan(270);
    expect(b).toBeLessThan(271);
  });
});

describe('snapToPolyline', () => {
  // A simple east-going trail at lat 39.0 from lng -77.0 to -76.95 (~4.3 km).
  const trail: Array<[number, number]> = [
    [-77.0, 39.0],
    [-76.99, 39.0],
    [-76.98, 39.0],
    [-76.97, 39.0],
    [-76.96, 39.0],
    [-76.95, 39.0],
  ];

  it('returns null for degenerate polylines', () => {
    expect(snapToPolyline(39, -77, [])).toBeNull();
    expect(snapToPolyline(39, -77, [[-77, 39]])).toBeNull();
  });

  it('snaps a point on the trail to distance ≈ 0', () => {
    const out = snapToPolyline(39.0, -76.985, trail)!;
    expect(out.distanceFromTrailMeters).toBeLessThan(1);
    // Along: from -77.0 to -76.985 is 0.015° lng @ lat 39 ≈ 1300 m
    expect(out.distanceAlongTrailMeters).toBeGreaterThan(1200);
    expect(out.distanceAlongTrailMeters).toBeLessThan(1400);
  });

  it('snaps a point due north of the trail to perpendicular distance', () => {
    const out = snapToPolyline(39.001, -76.985, trail)!;
    // 0.001° latitude ≈ 111 m, and the snap point should be at lat 39.0.
    expect(out.distanceFromTrailMeters).toBeGreaterThan(105);
    expect(out.distanceFromTrailMeters).toBeLessThan(115);
    expect(out.snapLat).toBeCloseTo(39.0, 4);
  });

  it('snaps a point past the end of the trail to the endpoint', () => {
    const out = snapToPolyline(39.0, -76.94, trail)!;
    // The snap lng should clamp at -76.95 (trail end).
    expect(out.snapLng).toBeCloseTo(-76.95, 4);
    expect(out.distanceAlongTrailMeters).toBeCloseTo(out.totalTrailMeters, 1);
  });

  it('reports a total length matching the sum of segment lengths', () => {
    const out = snapToPolyline(39.0, -76.985, trail)!;
    // Five segments of 0.01° lng @ lat 39 ≈ 867 m each → ~4335 m total.
    expect(out.totalTrailMeters).toBeGreaterThan(4300);
    expect(out.totalTrailMeters).toBeLessThan(4400);
  });

  it('heading for an east-going segment is ~90°', () => {
    const out = snapToPolyline(39.0, -76.98, trail)!;
    expect(out.headingDeg).toBeGreaterThan(89);
    expect(out.headingDeg).toBeLessThan(91);
  });
});

describe('findNearestTrail', () => {
  const trailA = {
    trailId: 'A',
    name: 'East Trail',
    coordinates: [
      [-77.0, 39.0],
      [-76.95, 39.0],
    ] as Array<[number, number]>,
  };
  const trailB = {
    trailId: 'B',
    name: 'North Trail',
    coordinates: [
      [-77.0, 39.0],
      [-77.0, 39.05],
    ] as Array<[number, number]>,
  };

  it('picks the trail whose closest point is nearest', () => {
    // User is ~55 m north of the east trail → A should win.
    const out = findNearestTrail(39.0005, -76.98, [trailA, trailB])!;
    expect(out.trail.trailId).toBe('A');
    expect(out.snap.distanceFromTrailMeters).toBeLessThan(100);
  });

  it('returns null for an empty trail list', () => {
    expect(findNearestTrail(39, -77, [])).toBeNull();
  });

  it('skips degenerate trails in the list', () => {
    const degenerate = {
      trailId: 'X',
      coordinates: [] as Array<[number, number]>,
    };
    const out = findNearestTrail(39, -76.98, [degenerate, trailA])!;
    expect(out.trail.trailId).toBe('A');
  });
});

describe('classifyTrailStatus', () => {
  it('under 10m is on-trail', () => {
    expect(
      classifyTrailStatus({
        segmentIndex: 0,
        snapLat: 0,
        snapLng: 0,
        distanceFromTrailMeters: 5,
        distanceAlongTrailMeters: 0,
        totalTrailMeters: 100,
        headingDeg: 0,
      }),
    ).toBe('on-trail');
  });
  it('10-25m is near-trail', () => {
    expect(
      classifyTrailStatus({
        segmentIndex: 0,
        snapLat: 0,
        snapLng: 0,
        distanceFromTrailMeters: 18,
        distanceAlongTrailMeters: 0,
        totalTrailMeters: 100,
        headingDeg: 0,
      }),
    ).toBe('near-trail');
  });
  it('over 25m is off-trail', () => {
    expect(
      classifyTrailStatus({
        segmentIndex: 0,
        snapLat: 0,
        snapLng: 0,
        distanceFromTrailMeters: 40,
        distanceAlongTrailMeters: 0,
        totalTrailMeters: 100,
        headingDeg: 0,
      }),
    ).toBe('off-trail');
  });
  it('thresholds are overridable', () => {
    expect(
      classifyTrailStatus(
        {
          segmentIndex: 0,
          snapLat: 0,
          snapLng: 0,
          distanceFromTrailMeters: 50,
          distanceAlongTrailMeters: 0,
          totalTrailMeters: 100,
          headingDeg: 0,
        },
        { onThresholdMeters: 100 },
      ),
    ).toBe('on-trail');
  });
});
