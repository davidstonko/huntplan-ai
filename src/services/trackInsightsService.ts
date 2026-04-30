/**
 * trackInsightsService — pure analytics over a RecordedTrack's samples.
 *
 * Used by TrackInsightsScreen to enrich the simple "distance / duration"
 * stats already shown on TrackDetailScreen. Computes:
 *
 *   - **Mile splits** — pace per cumulative mile (or kilometer if the
 *     user prefers metric). Useful for hikers ranking their effort by
 *     mile and for hunters reviewing how long a still-hunt sit-walk-sit
 *     pattern took.
 *   - **Pause/rest segments** — periods where motion stopped for longer
 *     than `pauseGapMs`. Detected from time gaps between successive
 *     samples (recorder paused) AND from "stationary clusters" — a run
 *     of samples that stayed within a small radius for ≥ pauseGapMs.
 *   - **Elevation profile** — downsampled (lat/lng/distance/altitude)
 *     points suitable for sparkline rendering. Returns null when no
 *     sample carries altitude.
 *   - **Time-of-day stats** — first sample hour, last sample hour, and
 *     a coarse bucket label (early-morning, morning, midday, afternoon,
 *     evening, night) for the median sample.
 *
 * V2_3_FEATURE_EXPANSION_PLAN — Phase A.18.
 */

import { haversineMeters } from '../types/track';
import type { RecordedTrack, TrackSample } from '../types/track';

export interface SplitRow {
  /** 1-indexed split number — split 1 covers 0…1 mile (or 0…1 km). */
  index: number;
  /** Distance covered by this split in the chosen unit (mi or km). */
  distance: number;
  /** Wall-clock seconds elapsed inside this split. */
  durationSec: number;
  /** Pace (sec/unit). 0 if duration is 0. */
  paceSecPerUnit: number;
  /** ISO start timestamp of the first sample in this split. */
  startedAt: string;
}

export interface PauseSegment {
  /** Index into samples[] where the pause begins. */
  startSampleIndex: number;
  /** Index into samples[] where motion resumes. */
  endSampleIndex: number;
  /** Duration of the pause in seconds. */
  durationSec: number;
  /** ISO start timestamp of the pause. */
  startedAt: string;
  /** Reason — "gap" (recorder paused) vs "stationary" (didn't move). */
  reason: 'gap' | 'stationary';
}

export interface ElevationPoint {
  /** Cumulative distance in meters from the start. */
  distM: number;
  /** Altitude in meters at this point. */
  altM: number;
  /** Epoch ms timestamp at this point. */
  timestamp: number;
}

export interface TimeOfDayStats {
  startHour: number; // 0–23
  endHour: number; // 0–23
  /** Coarse bucket for the median sample. */
  medianBucket:
    | 'early-morning'
    | 'morning'
    | 'midday'
    | 'afternoon'
    | 'evening'
    | 'night';
}

export interface TrackInsights {
  unit: 'mi' | 'km';
  splits: SplitRow[];
  pauses: PauseSegment[];
  /** null when no sample carries altitude. */
  elevation: ElevationPoint[] | null;
  /** Cumulative max - min altitude (meters). 0 when elevation null. */
  elevationRangeM: number;
  /** Sum of positive altitude deltas (descents). */
  elevationLossM: number;
  /** null when track has < 2 samples. */
  timeOfDay: TimeOfDayStats | null;
  /**
   * Average moving pace in seconds per unit, EXCLUDING pause segments.
   * 0 when distance is 0 or all motion was paused.
   */
  movingPaceSecPerUnit: number;
}

export interface InsightsOptions {
  /** Display unit. Default 'mi'. */
  unit?: 'mi' | 'km';
  /**
   * Minimum gap (in ms) between samples to count as a recorder pause.
   * Default 5 minutes (300_000 ms).
   */
  pauseGapMs?: number;
  /**
   * Minimum displacement (in meters) to consider the user moving when
   * detecting stationary clusters. Default 30 m — wider than typical
   * GPS noise but tight enough to catch a real pause.
   */
  stationaryRadiusM?: number;
  /**
   * Maximum points returned in the elevation profile. The series is
   * uniformly downsampled. Default 80 (renders well as a sparkline).
   */
  maxElevationPoints?: number;
}

const DEFAULTS: Required<InsightsOptions> = {
  unit: 'mi',
  pauseGapMs: 5 * 60 * 1000,
  stationaryRadiusM: 30,
  maxElevationPoints: 80,
};

const METERS_PER_MI = 1609.344;
const METERS_PER_KM = 1000;

function metersPerUnit(unit: 'mi' | 'km'): number {
  return unit === 'mi' ? METERS_PER_MI : METERS_PER_KM;
}

function bucketForHour(h: number): TimeOfDayStats['medianBucket'] {
  if (h < 5) return 'night';
  if (h < 8) return 'early-morning';
  if (h < 11) return 'morning';
  if (h < 14) return 'midday';
  if (h < 17) return 'afternoon';
  if (h < 20) return 'evening';
  return 'night';
}

/**
 * Compute mile / km splits from samples. Each split represents the time
 * spent covering one full unit (1 mi or 1 km). The final partial split
 * is included so the user can see "mile 4 was 0.4 miles in 8:00".
 */
export function computeSplits(
  samples: TrackSample[],
  unit: 'mi' | 'km' = 'mi',
): SplitRow[] {
  if (samples.length < 2) return [];
  const unitM = metersPerUnit(unit);
  const splits: SplitRow[] = [];
  let cumDistM = 0;
  let splitStartIndex = 0;
  let splitStartDistM = 0;
  let splitNumber = 1;

  for (let i = 1; i < samples.length; i++) {
    const segM = haversineMeters(
      samples[i - 1].lat,
      samples[i - 1].lng,
      samples[i].lat,
      samples[i].lng,
    );
    cumDistM += segM;

    while (cumDistM - splitStartDistM >= unitM) {
      // Linearly interpolate to the unit boundary inside segment i.
      const overshoot = cumDistM - (splitStartDistM + unitM);
      const segFrac = segM > 0 ? (segM - overshoot) / segM : 0;
      const tStart = samples[splitStartIndex].timestamp;
      const tBoundary =
        samples[i - 1].timestamp +
        (samples[i].timestamp - samples[i - 1].timestamp) * segFrac;
      const durationSec = Math.max(
        0,
        Math.round((tBoundary - tStart) / 1000),
      );
      splits.push({
        index: splitNumber,
        distance: 1, // by construction, this split is exactly one unit
        durationSec,
        paceSecPerUnit: durationSec, // (1 unit / duration) → sec/unit
        startedAt: new Date(tStart).toISOString(),
      });
      splitNumber += 1;
      splitStartDistM += unitM;
      // The next split starts at the interpolated boundary timestamp.
      splitStartIndex = i;
    }
  }

  // Trailing partial split.
  const remainingM = cumDistM - splitStartDistM;
  if (remainingM > 0 && splitStartIndex < samples.length - 1) {
    const tStart = samples[splitStartIndex].timestamp;
    const tEnd = samples[samples.length - 1].timestamp;
    const durationSec = Math.max(0, Math.round((tEnd - tStart) / 1000));
    const fraction = remainingM / unitM;
    const paceSecPerUnit =
      fraction > 0 ? Math.round(durationSec / fraction) : 0;
    splits.push({
      index: splitNumber,
      distance: Number(fraction.toFixed(2)),
      durationSec,
      paceSecPerUnit,
      startedAt: new Date(tStart).toISOString(),
    });
  }

  return splits;
}

/**
 * Detect pauses. Two flavors:
 *   - **gap**       — successive samples are > pauseGapMs apart (the
 *                     recorder was paused).
 *   - **stationary**— a run of consecutive samples whose pairwise
 *                     distance never exceeded stationaryRadiusM and whose
 *                     total elapsed time ≥ pauseGapMs.
 */
export function detectPauses(
  samples: TrackSample[],
  pauseGapMs: number = DEFAULTS.pauseGapMs,
  stationaryRadiusM: number = DEFAULTS.stationaryRadiusM,
): PauseSegment[] {
  if (samples.length < 2) return [];
  const out: PauseSegment[] = [];

  // ── 1) recorder-gap pauses ──
  for (let i = 1; i < samples.length; i++) {
    const dt = samples[i].timestamp - samples[i - 1].timestamp;
    if (dt >= pauseGapMs) {
      out.push({
        startSampleIndex: i - 1,
        endSampleIndex: i,
        durationSec: Math.round(dt / 1000),
        startedAt: new Date(samples[i - 1].timestamp).toISOString(),
        reason: 'gap',
      });
    }
  }

  // ── 2) stationary clusters ──
  let clusterStart = 0;
  for (let i = 1; i < samples.length; i++) {
    const segM = haversineMeters(
      samples[clusterStart].lat,
      samples[clusterStart].lng,
      samples[i].lat,
      samples[i].lng,
    );
    if (segM > stationaryRadiusM) {
      // Cluster ended at i-1.
      const dtMs =
        samples[i - 1].timestamp - samples[clusterStart].timestamp;
      if (i - 1 > clusterStart && dtMs >= pauseGapMs) {
        // Skip if it overlaps a gap pause we already recorded.
        const overlapsGap = out.some(
          (p) =>
            p.reason === 'gap' &&
            p.startSampleIndex >= clusterStart &&
            p.endSampleIndex <= i - 1,
        );
        if (!overlapsGap) {
          out.push({
            startSampleIndex: clusterStart,
            endSampleIndex: i - 1,
            durationSec: Math.round(dtMs / 1000),
            startedAt: new Date(samples[clusterStart].timestamp).toISOString(),
            reason: 'stationary',
          });
        }
      }
      clusterStart = i;
    }
  }
  // Trailing cluster.
  const tailDt =
    samples[samples.length - 1].timestamp - samples[clusterStart].timestamp;
  if (samples.length - 1 > clusterStart && tailDt >= pauseGapMs) {
    const overlapsGap = out.some(
      (p) =>
        p.reason === 'gap' &&
        p.startSampleIndex >= clusterStart &&
        p.endSampleIndex <= samples.length - 1,
    );
    if (!overlapsGap) {
      out.push({
        startSampleIndex: clusterStart,
        endSampleIndex: samples.length - 1,
        durationSec: Math.round(tailDt / 1000),
        startedAt: new Date(samples[clusterStart].timestamp).toISOString(),
        reason: 'stationary',
      });
    }
  }

  out.sort((a, b) => a.startSampleIndex - b.startSampleIndex);
  return out;
}

/**
 * Build a downsampled elevation profile. Returns null if no sample
 * carries altitude.
 */
export function elevationProfile(
  samples: TrackSample[],
  maxPoints: number = DEFAULTS.maxElevationPoints,
): ElevationPoint[] | null {
  const altSamples = samples.filter((s) => typeof s.altitude === 'number');
  if (altSamples.length === 0) return null;
  if (samples.length < 2) return null;

  // Build per-sample (cumDist, alt, ts), then downsample.
  const points: ElevationPoint[] = [];
  let cum = 0;
  let lastAlt: number | undefined;
  for (let i = 0; i < samples.length; i++) {
    if (i > 0) {
      cum += haversineMeters(
        samples[i - 1].lat,
        samples[i - 1].lng,
        samples[i].lat,
        samples[i].lng,
      );
    }
    const alt =
      typeof samples[i].altitude === 'number'
        ? (samples[i].altitude as number)
        : lastAlt;
    if (typeof alt === 'number') {
      lastAlt = alt;
      points.push({ distM: cum, altM: alt, timestamp: samples[i].timestamp });
    }
  }
  if (points.length === 0) return null;
  if (points.length <= maxPoints) return points;

  // Uniform downsample by stride.
  const stride = points.length / maxPoints;
  const out: ElevationPoint[] = [];
  for (let i = 0; i < maxPoints; i++) {
    const idx = Math.floor(i * stride);
    out.push(points[Math.min(points.length - 1, idx)]);
  }
  // Ensure last point preserved (sparkline endpoints matter).
  if (out[out.length - 1] !== points[points.length - 1]) {
    out[out.length - 1] = points[points.length - 1];
  }
  return out;
}

/**
 * Sum of negative altitude deltas (positive number reporting total descent).
 */
export function computeElevationLossM(samples: TrackSample[]): number {
  let loss = 0;
  let last: number | null = null;
  for (const s of samples) {
    if (typeof s.altitude !== 'number') continue;
    if (last !== null && s.altitude < last) {
      loss += last - s.altitude;
    }
    last = s.altitude;
  }
  return loss;
}

/** Coarse altitude range (max - min). 0 when no altitudes present. */
export function elevationRangeM(samples: TrackSample[]): number {
  let min = Infinity;
  let max = -Infinity;
  let any = false;
  for (const s of samples) {
    if (typeof s.altitude !== 'number') continue;
    any = true;
    if (s.altitude < min) min = s.altitude;
    if (s.altitude > max) max = s.altitude;
  }
  if (!any) return 0;
  return Math.max(0, max - min);
}

/** Time-of-day stats for the recording. */
export function timeOfDayStats(
  samples: TrackSample[],
): TimeOfDayStats | null {
  if (samples.length < 2) return null;
  const startHour = new Date(samples[0].timestamp).getHours();
  const endHour = new Date(samples[samples.length - 1].timestamp).getHours();
  const median = samples[Math.floor(samples.length / 2)];
  const medianBucket = bucketForHour(new Date(median.timestamp).getHours());
  return { startHour, endHour, medianBucket };
}

/**
 * Top-level entry point. Combines splits + pauses + elevation +
 * time-of-day + moving-pace into a single insights bundle.
 */
export function buildTrackInsights(
  track: RecordedTrack,
  options: InsightsOptions = {},
): TrackInsights {
  const opts = { ...DEFAULTS, ...options };
  const samples = track.samples ?? [];

  const splits = computeSplits(samples, opts.unit);
  const pauses = detectPauses(
    samples,
    opts.pauseGapMs,
    opts.stationaryRadiusM,
  );
  const elevation = elevationProfile(samples, opts.maxElevationPoints);
  const elRange = elevationRangeM(samples);
  const elLoss = computeElevationLossM(samples);
  const tod = timeOfDayStats(samples);

  // Moving pace: total duration MINUS pause duration, divided by
  // distance-in-units. This removes "I sat down for lunch" inflation.
  const totalPauseSec = pauses.reduce((s, p) => s + p.durationSec, 0);
  const movingSec = Math.max(0, track.durationSec - totalPauseSec);
  const distUnits = track.distanceM / metersPerUnit(opts.unit);
  const movingPaceSecPerUnit =
    distUnits > 0 ? Math.round(movingSec / distUnits) : 0;

  return {
    unit: opts.unit,
    splits,
    pauses,
    elevation,
    elevationRangeM: elRange,
    elevationLossM: elLoss,
    timeOfDay: tod,
    movingPaceSecPerUnit,
  };
}

/** Format sec/mi (or sec/km) as M:SS. */
export function formatPace(secPerUnit: number): string {
  if (!Number.isFinite(secPerUnit) || secPerUnit <= 0) return '—';
  const m = Math.floor(secPerUnit / 60);
  const s = Math.round(secPerUnit % 60);
  return `${m}:${String(s).padStart(2, '0')}`;
}

/** Format an elapsed duration in seconds as H:MM:SS or M:SS. */
export function formatElapsed(sec: number): string {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = Math.floor(sec % 60);
  const pad = (n: number) => String(n).padStart(2, '0');
  if (h > 0) return `${h}:${pad(m)}:${pad(s)}`;
  return `${m}:${pad(s)}`;
}
