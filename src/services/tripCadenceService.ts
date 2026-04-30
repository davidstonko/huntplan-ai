/**
 * @file tripCadenceService.ts
 * @description Phase A.47 — pure aggregator over Camp + Hike trips
 * that surfaces "how often do I actually go?". Drives a new TRIP
 * CADENCE section on PersonalStatsScreen.
 *
 * Distinct from personalStatsService (A.4) which counts personal-layer
 * artifacts (waypoints, tracks, markups). Trips live in a different
 * storage layer (camp_trips_v1 / hike_trips_v1) and answer a
 * different question: "how regularly am I getting out?".
 *
 * Cadence math is anchored to the trip's *start* date (CampTrip.
 * arrivalDate, HikeTrip.startDate) — we don't count multi-day trips
 * as multiple events. The question is "how often do I go?", not
 * "how many days do I spend out?".
 *
 * Past-only by default. Future-dated trips are NOT counted in
 * totals or cadence — they're plans, not events. The selector
 * exposes `daysSinceLastTrip` so the user can see the "It's been 23
 * days" gap; future trips don't reset that clock.
 *
 * Year buckets are CALENDAR years (Jan 1 → Dec 31), local-anchored.
 *
 * @module Services
 * @version 2.3.0
 */

import type { CampTrip } from '../types/camp';
import type { HikeTrip } from '../types/hike';
import { ymdToLocalDate, localMidnightToday } from './upcomingTripsService';

const MS_PER_DAY = 86_400_000;

/**
 * Per-kind breakdown of past trip counts. The TripCadence shape
 * sums these into `totals.*` for the dashboard hero number.
 */
export interface TripCountByKind {
  camp: number;
  hike: number;
  total: number;
}

/**
 * Aggregate result. All counts and stats consider only trips whose
 * start date is today-or-before (past-only). `daysSinceLastTrip` is
 * null when the user has never taken a trip; otherwise the integer
 * count of local civil days from the last trip's start date to today.
 *
 * `averageGapDays` and `longestGapDays` are null when the user has
 * fewer than 2 past trips (a gap is undefined for < 2 events).
 */
export interface TripCadence {
  /** Total past trips across both kinds. */
  totalPast: TripCountByKind;
  /** Past trips that started in the current calendar year. */
  thisYear: TripCountByKind;
  /** Past trips that started in the previous calendar year. */
  lastYear: TripCountByKind;
  /** Local YMD of the most recent past trip start, or null. */
  lastTripDate: string | null;
  /** Days from `lastTripDate` to today (0 = today, 1 = yesterday). */
  daysSinceLastTrip: number | null;
  /** Mean gap (in civil days) between consecutive past trips. */
  averageGapDays: number | null;
  /** Longest single gap (in civil days) between consecutive past trips. */
  longestGapDays: number | null;
  /**
   * Convenience flag: `daysSinceLastTrip > LONG_GAP_THRESHOLD_DAYS`.
   * The component uses this to color the "days since last" stat
   * with an amber/warning tone — a gentle nudge to plan a new trip.
   */
  isLongGap: boolean;
}

export interface TripCadenceInputs {
  campTrips: CampTrip[];
  hikeTrips: HikeTrip[];
}

/**
 * What counts as a "long gap since last trip". 30 days is the rough
 * "you haven't been out in a month" threshold — beyond that, the UI
 * surfaces a soft nudge. Lock the constant so future surfaces using
 * the same idea (e.g. a streak insurance variant for trips) align.
 */
export const LONG_GAP_THRESHOLD_DAYS = 30;

function emptyByKind(): TripCountByKind {
  return { camp: 0, hike: 0, total: 0 };
}

/**
 * Pull the start-date YMD for a trip in either shape.
 * Camp → arrivalDate. Hike → startDate.
 */
function tripStartYmd(trip: CampTrip | HikeTrip): string {
  return 'arrivalDate' in trip ? trip.arrivalDate : trip.startDate;
}

/**
 * Compute the cadence object. All math runs over past-only trips.
 *
 * Algorithm:
 *   1. Filter both kinds to start-date ≤ today.
 *   2. Bucket per kind / per year (current vs. previous calendar).
 *   3. Sort distinct start-day timestamps to compute gaps between
 *      consecutive events. Multiple trips on the same day count once
 *      for cadence (a 0-gap drags the average toward 0 misleadingly).
 *   4. Compute `daysSinceLastTrip` from the latest start date.
 */
export function computeTripCadence(
  inputs: TripCadenceInputs,
  now: Date = new Date(),
): TripCadence {
  const startOfToday = localMidnightToday(now);
  const todayMs = startOfToday.getTime();
  const currentYear = startOfToday.getFullYear();
  const lastYearNum = currentYear - 1;

  const totalPast = emptyByKind();
  const thisYear = emptyByKind();
  const lastYear = emptyByKind();

  // Collect the start-date timestamps (local-midnight) of every past
  // trip, regardless of kind, for cadence math. Use a Set keyed by
  // YYYY-MM-DD so multiple trips on the same day collapse to one
  // event for gap purposes.
  const pastDays = new Set<string>();

  function consider(trip: CampTrip | HikeTrip, kind: 'camp' | 'hike') {
    const ymd = tripStartYmd(trip);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(ymd)) return;
    const startDate = ymdToLocalDate(ymd);
    if (isNaN(startDate.getTime())) return;
    if (startDate.getTime() > todayMs) return; // future — exclude

    totalPast[kind] += 1;
    totalPast.total += 1;

    const yr = startDate.getFullYear();
    if (yr === currentYear) {
      thisYear[kind] += 1;
      thisYear.total += 1;
    } else if (yr === lastYearNum) {
      lastYear[kind] += 1;
      lastYear.total += 1;
    }

    pastDays.add(ymd);
  }

  for (const t of inputs.campTrips) consider(t, 'camp');
  for (const t of inputs.hikeTrips) consider(t, 'hike');

  // Sort distinct days ascending for gap math.
  const sortedDays = [...pastDays]
    .map((d) => ymdToLocalDate(d).getTime())
    .filter((t) => Number.isFinite(t))
    .sort((a, b) => a - b);

  let lastTripDate: string | null = null;
  let daysSinceLastTrip: number | null = null;

  if (sortedDays.length > 0) {
    const lastMs = sortedDays[sortedDays.length - 1];
    daysSinceLastTrip = Math.round((todayMs - lastMs) / MS_PER_DAY);
    const lastDate = new Date(lastMs);
    lastTripDate = `${lastDate.getFullYear()}-${String(lastDate.getMonth() + 1).padStart(2, '0')}-${String(lastDate.getDate()).padStart(2, '0')}`;
  }

  let averageGapDays: number | null = null;
  let longestGapDays: number | null = null;

  if (sortedDays.length >= 2) {
    let gapSum = 0;
    let longestGap = 0;
    for (let i = 1; i < sortedDays.length; i++) {
      const gap = Math.round((sortedDays[i] - sortedDays[i - 1]) / MS_PER_DAY);
      gapSum += gap;
      if (gap > longestGap) longestGap = gap;
    }
    averageGapDays = Math.round(gapSum / (sortedDays.length - 1));
    longestGapDays = longestGap;
  }

  const isLongGap =
    daysSinceLastTrip !== null && daysSinceLastTrip > LONG_GAP_THRESHOLD_DAYS;

  return {
    totalPast,
    thisYear,
    lastYear,
    lastTripDate,
    daysSinceLastTrip,
    averageGapDays,
    longestGapDays,
    isLongGap,
  };
}

/**
 * Friendly projection: "23 days ago" / "yesterday" / "today" / null.
 */
export function daysSinceLabel(days: number | null): string {
  if (days === null) return 'no trips yet';
  if (days <= 0) return 'today';
  if (days === 1) return 'yesterday';
  return `${days} days ago`;
}

/**
 * Friendly projection: "every 14 days" / "every 60 days" / null.
 */
export function cadenceGapLabel(avgDays: number | null): string {
  if (avgDays === null) return '—';
  if (avgDays === 0) return 'multiple/day';
  return `every ${avgDays} day${avgDays === 1 ? '' : 's'}`;
}

// ── Phase A.50 — monthly trip streak ──
//
// "Consecutive months with at least one trip" — the trip equivalent
// of the journal-day streak (A.20). Granularity is MONTHLY, not
// daily, because trips are events that happen on the order of weeks-
// to-months. A user who plans one trip every weekend would have a
// 12-month streak after a year — that's the right unit.

/**
 * View-shape for the monthly trip streak. `current` resets to 0 once
 * the user misses a calendar month entirely. `longest` is the all-
 * time best run.
 */
export interface TripMonthlyStreak {
  current: number;
  longest: number;
}

/**
 * Format YYYY-MM key for a date — local-anchored so trips don't
 * cross-month due to UTC drift.
 */
function ymKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

/**
 * Decrement a YYYY-MM key by one month (e.g. "2026-01" → "2025-12").
 */
function prevMonthKey(key: string): string {
  const [y, m] = key.split('-').map((p) => parseInt(p, 10));
  if (!Number.isFinite(y) || !Number.isFinite(m)) return key;
  if (m === 1) return `${y - 1}-12`;
  return `${y}-${String(m - 1).padStart(2, '0')}`;
}

/**
 * Compute the monthly trip streak from past trip start dates.
 *
 * Algorithm:
 *  1. Build a Set of YYYY-MM keys from every past trip start date.
 *  2. CURRENT: walk back from this month while the set has each key.
 *     The current month does NOT need to have a trip — we're forgiving
 *     about the "current" month so that a user who hasn't planned a
 *     trip yet this month doesn't see a 0 streak just because it's
 *     the 2nd of the month. If the current month is empty, we walk
 *     back from LAST month instead.
 *  3. LONGEST: sort distinct YM keys ascending, count consecutive
 *     runs (each run is a sequence where each key is the next month
 *     of the prior key), track max.
 */
export function tripMonthlyStreak(
  inputs: TripCadenceInputs,
  now: Date = new Date(),
): TripMonthlyStreak {
  const startOfToday = localMidnightToday(now);
  const todayMs = startOfToday.getTime();

  const monthSet = new Set<string>();
  function consider(ymd: string) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(ymd)) return;
    const d = ymdToLocalDate(ymd);
    if (isNaN(d.getTime()) || d.getTime() > todayMs) return;
    monthSet.add(ymKey(d));
  }
  for (const t of inputs.campTrips) consider(t.arrivalDate);
  for (const t of inputs.hikeTrips) consider(t.startDate);

  if (monthSet.size === 0) return { current: 0, longest: 0 };

  // CURRENT — walk back from this month, allowing this month to be
  // empty (use last month as anchor in that case).
  let walker = ymKey(startOfToday);
  if (!monthSet.has(walker)) {
    walker = prevMonthKey(walker);
  }
  let current = 0;
  while (monthSet.has(walker)) {
    current += 1;
    walker = prevMonthKey(walker);
  }

  // LONGEST — sort keys ascending, count consecutive runs.
  const sorted = [...monthSet].sort();
  let longest = 0;
  let run = 0;
  let prev: string | null = null;
  for (const key of sorted) {
    if (prev !== null && prevMonthKey(key) === prev) {
      run += 1;
    } else {
      run = 1;
    }
    if (run > longest) longest = run;
    prev = key;
  }

  return { current, longest };
}
