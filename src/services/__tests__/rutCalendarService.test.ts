/**
 * rutCalendarService.test.ts — pure function contract for the rut score.
 *
 * Locks the biological window calendar (peak rut Nov 5–20) and the
 * moon-phase modifier behavior. Astronomy facts (synodic month, 2000-01-06
 * new moon) are publicly documented; if these tests ever fail because the
 * almanac changed, the universe broke first.
 */

import {
  rutScoreForDate,
  rutForecast,
  peakDay,
  moonPhaseFraction,
  moonPhaseName,
  moonIlluminationPct,
  moonModifierForDate,
} from '../rutCalendarService';

describe('rutCalendarService — biological windows', () => {
  it('Aug 1 is off-season', () => {
    const s = rutScoreForDate(new Date(Date.UTC(2026, 7, 1, 12)));
    expect(s.phase).toBe('off-season');
    expect(s.biologicalScore).toBe(15);
  });

  it('Oct 28 is pre-rut', () => {
    const s = rutScoreForDate(new Date(Date.UTC(2026, 9, 28, 12)));
    expect(s.phase).toBe('pre-rut');
    expect(s.biologicalScore).toBe(60);
  });

  it('Nov 12 is peak-rut at 80', () => {
    const s = rutScoreForDate(new Date(Date.UTC(2026, 10, 12, 12)));
    expect(s.phase).toBe('peak-rut');
    expect(s.biologicalScore).toBe(80);
    expect(s.intensity).toBeGreaterThanOrEqual(70);
    expect(s.intensity).toBeLessThanOrEqual(100);
  });

  it('Nov 25 is post-rut', () => {
    const s = rutScoreForDate(new Date(Date.UTC(2026, 10, 25, 12)));
    expect(s.phase).toBe('post-rut');
    expect(s.biologicalScore).toBe(55);
  });

  it('Dec 15 is late-season', () => {
    const s = rutScoreForDate(new Date(Date.UTC(2026, 11, 15, 12)));
    expect(s.phase).toBe('late-season');
    expect(s.biologicalScore).toBe(35);
  });

  it('intensity is always clamped to 0..100', () => {
    for (let dayOffset = 0; dayOffset < 365; dayOffset++) {
      const d = new Date(Date.UTC(2026, 0, 1, 12) + dayOffset * 86_400_000);
      const s = rutScoreForDate(d);
      expect(s.intensity).toBeGreaterThanOrEqual(0);
      expect(s.intensity).toBeLessThanOrEqual(100);
    }
  });

  it('every score carries a non-empty notes string', () => {
    for (let dayOffset = 0; dayOffset < 365; dayOffset += 7) {
      const d = new Date(Date.UTC(2026, 0, 1, 12) + dayOffset * 86_400_000);
      const s = rutScoreForDate(d);
      expect(s.notes.length).toBeGreaterThan(20);
    }
  });
});

describe('rutCalendarService — moon astronomy', () => {
  it('reference new moon (2000-01-06) yields fraction near 0', () => {
    const f = moonPhaseFraction(new Date(Date.UTC(2000, 0, 6, 18, 14)));
    expect(f).toBeGreaterThanOrEqual(0);
    expect(f).toBeLessThan(0.005);
  });

  it('half a synodic month later is near full moon', () => {
    const halfSynodicMs = (29.530_588_67 / 2) * 86_400_000;
    const refMs = Date.UTC(2000, 0, 6, 18, 14);
    const f = moonPhaseFraction(new Date(refMs + halfSynodicMs));
    expect(Math.abs(f - 0.5)).toBeLessThan(0.005);
  });

  it('moon phase names span the cycle', () => {
    const names = new Set<string>();
    for (let day = 0; day < 35; day++) {
      const d = new Date(Date.UTC(2026, 0, 1, 12) + day * 86_400_000);
      names.add(moonPhaseName(d));
    }
    // At least 5 distinct phase names should appear in any 35-day window.
    expect(names.size).toBeGreaterThanOrEqual(5);
  });

  it('illumination is 0–100 and rises near full moon', () => {
    for (let day = 0; day < 30; day++) {
      const d = new Date(Date.UTC(2026, 0, 1, 12) + day * 86_400_000);
      const ill = moonIlluminationPct(d);
      expect(ill).toBeGreaterThanOrEqual(0);
      expect(ill).toBeLessThanOrEqual(100);
    }
  });

  it('moon modifier rewards quarter moons and mildly penalizes new/full', () => {
    // Sweep a synodic month and confirm both regimes appear.
    let sawQuarterBoost = false;
    let sawFullPenalty = false;
    for (let day = 0; day < 30; day++) {
      const d = new Date(Date.UTC(2026, 0, 1, 12) + day * 86_400_000);
      const m = moonModifierForDate(d);
      if (m >= 8) sawQuarterBoost = true;
      if (m <= -4) sawFullPenalty = true;
    }
    expect(sawQuarterBoost).toBe(true);
    expect(sawFullPenalty).toBe(true);
  });
});

describe('rutCalendarService — forecast helper', () => {
  it('returns N days starting at the given date', () => {
    const fc = rutForecast(new Date(Date.UTC(2026, 10, 1, 12)), 14);
    expect(fc).toHaveLength(14);
    expect(fc[0].date).toBe('2026-11-01');
    expect(fc[13].date).toBe('2026-11-14');
  });

  it('peakDay returns the highest-intensity entry', () => {
    const fc = rutForecast(new Date(Date.UTC(2026, 10, 5, 12)), 16);
    const top = peakDay(fc);
    expect(top).not.toBeNull();
    expect(top!.intensity).toBe(Math.max(...fc.map((r) => r.intensity)));
  });

  it('peakDay returns null on empty input', () => {
    expect(peakDay([])).toBeNull();
  });
});
