/**
 * trackInsightsService — unit tests (Phase A.18).
 */
import {
  computeSplits,
  detectPauses,
  elevationProfile,
  computeElevationLossM,
  elevationRangeM,
  timeOfDayStats,
  buildTrackInsights,
  formatPace,
  formatElapsed,
} from '../trackInsightsService';
import type { RecordedTrack, TrackSample } from '../../types/track';

// ── Sample factory ──
//
// We need samples that travel a known distance. Trick: pick a fixed
// latitude and step longitude by `degPerMeter * meters`. At Maryland's
// ~39° N, 1 degree of longitude is ~86,575 m, so degPerMeter ≈
// 1.155e-5. The Haversine in the service will then read out ≈ `meters`.
// We accept ~0.5% rounding slack in assertions.
const LAT = 39.0;
const DEG_PER_M_LNG_AT_39N = 1.155e-5;

function sampleAt(
  metersFromStart: number,
  timestamp: number,
  altitude?: number,
): TrackSample {
  return {
    lat: LAT,
    lng: -76.0 + metersFromStart * DEG_PER_M_LNG_AT_39N,
    timestamp,
    ...(typeof altitude === 'number' ? { altitude } : {}),
  };
}

function track(
  overrides: Partial<RecordedTrack> = {},
  samples: TrackSample[] = [],
): RecordedTrack {
  const startedAt =
    samples.length > 0 ? new Date(samples[0].timestamp).toISOString() : '';
  const endedAt =
    samples.length > 0
      ? new Date(samples[samples.length - 1].timestamp).toISOString()
      : null;
  const durationSec =
    samples.length >= 2
      ? Math.round(
          (samples[samples.length - 1].timestamp - samples[0].timestamp) / 1000,
        )
      : 0;
  return {
    id: 'tk-1',
    mode: 'hike',
    name: 'Loop',
    startedAt,
    endedAt,
    state: 'saved',
    samples,
    distanceM: 0,
    durationSec,
    elevationGainM: 0,
    ...overrides,
  };
}

// ── computeSplits ──

describe('computeSplits', () => {
  it('returns [] for fewer than 2 samples', () => {
    expect(computeSplits([])).toEqual([]);
    expect(computeSplits([sampleAt(0, 0)])).toEqual([]);
  });

  it('returns one full mile split for an exactly-1mi track', () => {
    const T0 = 1_700_000_000_000;
    const samples: TrackSample[] = [
      sampleAt(0, T0),
      sampleAt(1609.344, T0 + 600_000), // 10 minutes later
    ];
    const out = computeSplits(samples, 'mi');
    expect(out.length).toBe(1);
    expect(out[0].index).toBe(1);
    expect(out[0].distance).toBeCloseTo(1, 1);
    expect(out[0].durationSec).toBeGreaterThanOrEqual(595);
    expect(out[0].durationSec).toBeLessThanOrEqual(605);
  });

  it('returns trailing partial split for a sub-mile track', () => {
    const T0 = 1_700_000_000_000;
    const samples: TrackSample[] = [
      sampleAt(0, T0),
      sampleAt(800, T0 + 300_000), // 0.5 mi in 5 minutes
    ];
    const out = computeSplits(samples, 'mi');
    expect(out.length).toBe(1);
    expect(out[0].index).toBe(1);
    expect(out[0].distance).toBeLessThan(1);
    expect(out[0].distance).toBeGreaterThan(0.4);
    expect(out[0].durationSec).toBeGreaterThanOrEqual(295);
    expect(out[0].durationSec).toBeLessThanOrEqual(305);
  });

  it('returns 2 full + 1 partial for a multi-mile track', () => {
    const T0 = 1_700_000_000_000;
    // Oversize to 2.6 mi so per-degree rounding can't drop us below
    // the second mile boundary. 6 samples, evenly spaced over 26 min.
    const totalM = 1609.344 * 2.6;
    const totalMs = 26 * 60 * 1000;
    const samples: TrackSample[] = [];
    for (let i = 0; i <= 5; i++) {
      samples.push(
        sampleAt((totalM * i) / 5, T0 + (totalMs * i) / 5),
      );
    }
    const out = computeSplits(samples, 'mi');
    expect(out.length).toBe(3);
    expect(out[0].distance).toBeCloseTo(1, 1);
    expect(out[1].distance).toBeCloseTo(1, 1);
    expect(out[2].distance).toBeLessThan(1);
    expect(out[2].distance).toBeGreaterThan(0.4);
  });

  it('supports km unit', () => {
    const T0 = 1_700_000_000_000;
    const samples: TrackSample[] = [
      sampleAt(0, T0),
      sampleAt(1000, T0 + 600_000),
    ];
    const out = computeSplits(samples, 'km');
    expect(out.length).toBe(1);
    expect(out[0].distance).toBeCloseTo(1, 1);
  });
});

// ── detectPauses ──

describe('detectPauses', () => {
  it('returns [] for fewer than 2 samples', () => {
    expect(detectPauses([])).toEqual([]);
    expect(detectPauses([sampleAt(0, 0)])).toEqual([]);
  });

  it('detects a recorder-gap pause', () => {
    const T0 = 1_700_000_000_000;
    const samples: TrackSample[] = [
      sampleAt(0, T0),
      sampleAt(50, T0 + 60_000),
      sampleAt(100, T0 + 60_000 + 10 * 60_000), // 10-minute gap
      sampleAt(150, T0 + 60_000 + 10 * 60_000 + 30_000),
    ];
    const out = detectPauses(samples);
    const gaps = out.filter((p) => p.reason === 'gap');
    expect(gaps.length).toBe(1);
    expect(gaps[0].durationSec).toBeGreaterThanOrEqual(599);
    expect(gaps[0].durationSec).toBeLessThanOrEqual(601);
  });

  it('detects a stationary cluster (samples close together for ≥ pauseGapMs)', () => {
    const T0 = 1_700_000_000_000;
    // 8 samples within 10m for 10 minutes (sub-radius motion), then a move
    const samples: TrackSample[] = [];
    for (let i = 0; i < 8; i++) {
      samples.push(
        sampleAt(i * 1, T0 + i * (90 * 1000)), // ~90s apart, ≤ 10m drift
      );
    }
    // then a real move
    samples.push(sampleAt(500, T0 + 8 * 90 * 1000 + 30_000));
    const out = detectPauses(samples);
    const stationaries = out.filter((p) => p.reason === 'stationary');
    expect(stationaries.length).toBeGreaterThanOrEqual(1);
    expect(stationaries[0].durationSec).toBeGreaterThanOrEqual(300);
  });

  it('does not double-record a stationary that overlaps a gap', () => {
    const T0 = 1_700_000_000_000;
    const samples: TrackSample[] = [
      sampleAt(0, T0),
      sampleAt(2, T0 + 10 * 60 * 1000), // 10-minute gap, barely moved
      sampleAt(500, T0 + 10 * 60 * 1000 + 30_000),
    ];
    const out = detectPauses(samples);
    const gaps = out.filter((p) => p.reason === 'gap');
    expect(gaps.length).toBe(1);
    // the stationary detection should not register a second pause for
    // the same time window
    expect(out.length).toBe(1);
  });
});

// ── elevation helpers ──

describe('elevationProfile', () => {
  it('returns null when no sample carries altitude', () => {
    const T0 = 1_700_000_000_000;
    const samples: TrackSample[] = [sampleAt(0, T0), sampleAt(100, T0 + 60_000)];
    expect(elevationProfile(samples)).toBeNull();
  });

  it('downsamples uniformly to maxPoints and preserves last point', () => {
    const T0 = 1_700_000_000_000;
    const samples: TrackSample[] = [];
    for (let i = 0; i < 200; i++) {
      samples.push(sampleAt(i * 10, T0 + i * 1000, 100 + (i % 50)));
    }
    const out = elevationProfile(samples, 50)!;
    expect(out).not.toBeNull();
    expect(out.length).toBe(50);
    expect(out[out.length - 1].altM).toBe(samples[samples.length - 1].altitude);
  });
});

describe('computeElevationLossM', () => {
  it('sums positive descents only', () => {
    const samples: TrackSample[] = [
      sampleAt(0, 0, 100),
      sampleAt(100, 1000, 110), // gain 10 (ignored)
      sampleAt(200, 2000, 90), // loss 20
      sampleAt(300, 3000, 80), // loss 10
    ];
    expect(computeElevationLossM(samples)).toBe(30);
  });

  it('returns 0 when no samples carry altitude', () => {
    const samples: TrackSample[] = [sampleAt(0, 0), sampleAt(100, 1000)];
    expect(computeElevationLossM(samples)).toBe(0);
  });
});

describe('elevationRangeM', () => {
  it('returns max - min', () => {
    const samples: TrackSample[] = [
      sampleAt(0, 0, 100),
      sampleAt(100, 1000, 250),
      sampleAt(200, 2000, 50),
    ];
    expect(elevationRangeM(samples)).toBe(200);
  });

  it('returns 0 with no altitudes present', () => {
    expect(elevationRangeM([sampleAt(0, 0)])).toBe(0);
  });
});

// ── timeOfDayStats ──

describe('timeOfDayStats', () => {
  it('returns null for < 2 samples', () => {
    expect(timeOfDayStats([])).toBeNull();
    expect(timeOfDayStats([sampleAt(0, 0)])).toBeNull();
  });

  it('returns a bucket label and start/end hours', () => {
    // construct timestamps via local-midnight Date to stay TZ-agnostic
    const morning = new Date(2026, 3, 25, 7, 30, 0).getTime();
    const noon = new Date(2026, 3, 25, 12, 0, 0).getTime();
    const evening = new Date(2026, 3, 25, 18, 0, 0).getTime();
    const samples: TrackSample[] = [
      sampleAt(0, morning),
      sampleAt(50, noon),
      sampleAt(100, evening),
    ];
    const tod = timeOfDayStats(samples)!;
    expect(tod).not.toBeNull();
    expect(tod.startHour).toBe(7);
    expect(tod.endHour).toBe(18);
    expect(['morning', 'midday', 'afternoon']).toContain(tod.medianBucket);
  });
});

// ── buildTrackInsights ──

describe('buildTrackInsights', () => {
  it('combines splits, pauses, elevation, time-of-day, and moving pace', () => {
    const T0 = new Date(2026, 3, 25, 8, 0, 0).getTime();
    // 1.5 mi over 18 minutes, with a 10-minute gap in the middle.
    const samples: TrackSample[] = [
      sampleAt(0, T0, 100),
      sampleAt(800, T0 + 5 * 60_000, 110), // 0.5 mi at 5 min
      sampleAt(800, T0 + 5 * 60_000 + 10 * 60_000, 110), // 10-min pause
      sampleAt(1609.344, T0 + 18 * 60_000, 100), // boundary at 1 mi
      sampleAt(2400, T0 + 23 * 60_000, 95), // 1.49 mi at 23 min
    ];
    const t = track(
      {
        distanceM: 2400,
      },
      samples,
    );
    const insights = buildTrackInsights(t, { unit: 'mi' });
    expect(insights.unit).toBe('mi');
    expect(insights.splits.length).toBeGreaterThanOrEqual(1);
    expect(insights.pauses.length).toBeGreaterThanOrEqual(1);
    expect(insights.elevation).not.toBeNull();
    expect(insights.elevationRangeM).toBeCloseTo(15, 1);
    expect(insights.elevationLossM).toBeCloseTo(15, 1);
    expect(insights.timeOfDay).not.toBeNull();
    // moving pace should exclude the 10-minute pause
    expect(insights.movingPaceSecPerUnit).toBeGreaterThan(0);
  });

  it('handles an empty track defensively', () => {
    const insights = buildTrackInsights(track({}, []), { unit: 'mi' });
    expect(insights.splits).toEqual([]);
    expect(insights.pauses).toEqual([]);
    expect(insights.elevation).toBeNull();
    expect(insights.elevationRangeM).toBe(0);
    expect(insights.elevationLossM).toBe(0);
    expect(insights.timeOfDay).toBeNull();
    expect(insights.movingPaceSecPerUnit).toBe(0);
  });
});

// ── format helpers ──

describe('formatPace', () => {
  it('returns em-dash for non-positive', () => {
    expect(formatPace(0)).toBe('—');
    expect(formatPace(-1)).toBe('—');
    expect(formatPace(NaN)).toBe('—');
  });

  it('formats sec/unit as M:SS', () => {
    expect(formatPace(605)).toBe('10:05');
    expect(formatPace(60)).toBe('1:00');
    expect(formatPace(125)).toBe('2:05');
  });
});

describe('formatElapsed', () => {
  it('formats sub-hour as M:SS', () => {
    expect(formatElapsed(65)).toBe('1:05');
  });
  it('formats hour+ as H:MM:SS', () => {
    expect(formatElapsed(3725)).toBe('1:02:05');
  });
});
