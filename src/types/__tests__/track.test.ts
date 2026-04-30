/**
 * track.test.ts — Contract coverage for the track geometry math.
 *
 * Locks the Haversine/distance/duration/elevation helpers that both
 * save-time stat computation and HUD rendering rely on. If these drift,
 * every saved track's stats become wrong — this test is the canary.
 */

import {
  TrackSample,
  haversineMeters,
  computeDistanceM,
  computeDurationSec,
  computeElevationGainM,
  formatDistance,
  formatDuration,
} from '../track';

function sample(
  lat: number,
  lng: number,
  tsMs: number,
  altitude?: number,
): TrackSample {
  return { lat, lng, timestamp: tsMs, altitude };
}

describe('track math helpers', () => {
  describe('haversineMeters', () => {
    it('returns 0 for identical points', () => {
      expect(haversineMeters(39.0, -77.0, 39.0, -77.0)).toBe(0);
    });

    it('matches known distance to within 1% (DC → Annapolis ≈ 48 km)', () => {
      // Washington, DC (38.8951,-77.0364) → Annapolis, MD (38.9784,-76.4922)
      // is ≈ 48.0 km great-circle. We allow ±1% for spherical-vs-WGS84 slop.
      const meters = haversineMeters(38.8951, -77.0364, 38.9784, -76.4922);
      expect(meters).toBeGreaterThan(47_500);
      expect(meters).toBeLessThan(48_500);
    });

    it('is symmetric (a→b === b→a)', () => {
      const ab = haversineMeters(39.2, -77.1, 38.9, -76.4);
      const ba = haversineMeters(38.9, -76.4, 39.2, -77.1);
      expect(ab).toBeCloseTo(ba, 6);
    });
  });

  describe('computeDistanceM', () => {
    it('returns 0 for fewer than 2 samples', () => {
      expect(computeDistanceM([])).toBe(0);
      expect(computeDistanceM([sample(39, -77, 0)])).toBe(0);
    });

    it('sums pairwise segment distances', () => {
      const samples = [
        sample(39.0, -77.0, 0),
        sample(39.1, -77.0, 1000),
        sample(39.2, -77.0, 2000),
      ];
      const d12 = haversineMeters(39.0, -77.0, 39.1, -77.0);
      const d23 = haversineMeters(39.1, -77.0, 39.2, -77.0);
      expect(computeDistanceM(samples)).toBeCloseTo(d12 + d23, 5);
    });
  });

  describe('computeDurationSec', () => {
    it('returns 0 for fewer than 2 samples', () => {
      expect(computeDurationSec([])).toBe(0);
      expect(computeDurationSec([sample(39, -77, 0)])).toBe(0);
    });

    it('returns wall-clock seconds between first and last sample', () => {
      const samples = [
        sample(39, -77, 0),
        sample(39, -77, 60_000),
        sample(39, -77, 180_000),
      ];
      expect(computeDurationSec(samples)).toBe(180);
    });

    it('never returns negative', () => {
      // Defensive: clock skew could produce negative deltas — those
      // must floor to 0 rather than flip the sign.
      const samples = [sample(39, -77, 1000), sample(39, -77, 500)];
      expect(computeDurationSec(samples)).toBe(0);
    });
  });

  describe('computeElevationGainM', () => {
    it('returns 0 when no samples carry altitude', () => {
      const samples = [sample(39, -77, 0), sample(39, -77, 1000)];
      expect(computeElevationGainM(samples)).toBe(0);
    });

    it('sums only positive altitude deltas', () => {
      const samples = [
        sample(39, -77, 0, 100),
        sample(39, -77, 1, 150), // +50
        sample(39, -77, 2, 140), // descent, ignored
        sample(39, -77, 3, 170), // +30
      ];
      expect(computeElevationGainM(samples)).toBe(80);
    });

    it('ignores samples missing altitude (carries last altitude forward)', () => {
      const samples = [
        sample(39, -77, 0, 100),
        sample(39, -77, 1),      // no altitude — skipped
        sample(39, -77, 2, 150), // delta vs 100 = +50
      ];
      expect(computeElevationGainM(samples)).toBe(50);
    });
  });

  describe('formatDistance', () => {
    it('uses meters below 1000', () => {
      expect(formatDistance(0)).toBe('0 m');
      expect(formatDistance(999)).toBe('999 m');
    });
    it('uses km with 2 decimals below 10 km', () => {
      expect(formatDistance(1000)).toBe('1.00 km');
      expect(formatDistance(1234)).toBe('1.23 km');
    });
    it('uses km with 1 decimal at 10+ km', () => {
      expect(formatDistance(15_789)).toBe('15.8 km');
    });
  });

  describe('formatDuration', () => {
    it('m:ss under an hour', () => {
      expect(formatDuration(0)).toBe('0:00');
      expect(formatDuration(65)).toBe('1:05');
      expect(formatDuration(59 * 60 + 59)).toBe('59:59');
    });
    it('h:mm:ss at or above an hour', () => {
      expect(formatDuration(3600)).toBe('1:00:00');
      expect(formatDuration(3 * 3600 + 5 * 60 + 7)).toBe('3:05:07');
    });
  });
});
