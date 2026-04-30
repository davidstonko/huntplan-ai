/**
 * @file briefingTomorrowService.test.ts
 * @description Locks the Phase A.35 pure helpers that compute
 * tomorrow's date stamp + project tomorrow's SolunarData into the
 * Daily Briefing's footer card.
 *
 * The card is contract-tested in BriefingTomorrowCard.test.tsx.
 * The riskier surface is here: month/year rollovers in addDaysToYmd
 * (a Dec-31 → Jan-1 bug would silently destroy the briefing's
 * Tomorrow card on New Year's Eve), and the ±1-point tolerance on
 * compareRating (tomorrow's score jitter shouldn't read as a
 * meaningful change).
 */

import {
  addDaysToYmd,
  tomorrowYmd,
  compareRating,
  summarizeTomorrow,
} from '../briefingTomorrowService';
import type { SolunarData } from '../solunarService';

function solunar(over: Partial<SolunarData>): SolunarData {
  return {
    date: '2026-04-26',
    moon: { phase_name: 'Waning Gibbous', illumination_pct: 80, phase_fraction: 0.6 },
    major_periods: [],
    minor_periods: [],
    sun: {
      sunrise: '06:00',
      sunset: '19:30',
      legal_start: '05:30',
      legal_end: '20:00',
    },
    best_times: [],
    rating: {
      score: 75,
      label: 'Good',
      factors: {
        moon_phase: 'Waning Gibbous',
        illumination: 80,
        solunar_dawn_overlap: false,
        solunar_dusk_overlap: false,
      },
    },
    ...over,
  };
}

describe('addDaysToYmd — calendar-aware date offset', () => {
  it('adds one day in mid-month', () => {
    expect(addDaysToYmd('2026-04-25', 1)).toBe('2026-04-26');
  });

  it('rolls forward across a month boundary', () => {
    expect(addDaysToYmd('2026-04-30', 1)).toBe('2026-05-01');
  });

  it('rolls forward across a year boundary', () => {
    expect(addDaysToYmd('2026-12-31', 1)).toBe('2027-01-01');
  });

  it('handles February month-length correctly (non-leap)', () => {
    expect(addDaysToYmd('2026-02-28', 1)).toBe('2026-03-01');
  });

  it('handles February 28 → 29 in a leap year (2028)', () => {
    expect(addDaysToYmd('2028-02-28', 1)).toBe('2028-02-29');
  });

  it('subtracts days when delta is negative', () => {
    expect(addDaysToYmd('2026-04-25', -1)).toBe('2026-04-24');
    expect(addDaysToYmd('2026-01-01', -1)).toBe('2025-12-31');
  });

  it('returns input unchanged when YMD does not parse', () => {
    expect(addDaysToYmd('not-a-date', 1)).toBe('not-a-date');
    expect(addDaysToYmd('2026-04', 1)).toBe('2026-04');
  });
});

describe('tomorrowYmd — convenience over addDaysToYmd', () => {
  it('returns the next calendar day', () => {
    expect(tomorrowYmd('2026-04-25')).toBe('2026-04-26');
  });

  it('rolls across month boundary', () => {
    expect(tomorrowYmd('2026-05-31')).toBe('2026-06-01');
  });
});

describe('compareRating — three-bucket score comparison', () => {
  it('returns "better" for a clearly higher tomorrow score', () => {
    expect(compareRating(50, 70)).toBe('better');
  });

  it('returns "worse" for a clearly lower tomorrow score', () => {
    expect(compareRating(80, 50)).toBe('worse');
  });

  it('returns "same" for an exact match', () => {
    expect(compareRating(60, 60)).toBe('same');
  });

  it('returns "same" for a one-point upward jitter (tolerance band)', () => {
    expect(compareRating(60, 61)).toBe('same');
  });

  it('returns "same" for a one-point downward jitter (tolerance band)', () => {
    expect(compareRating(60, 59)).toBe('same');
  });

  it('returns "better" for a two-point upward jump (above tolerance)', () => {
    expect(compareRating(60, 62)).toBe('better');
  });

  it('returns "worse" for a two-point downward drop (above tolerance)', () => {
    expect(compareRating(60, 58)).toBe('worse');
  });
});

describe('summarizeTomorrow — view-model projection', () => {
  it('projects all fields from a SolunarData snapshot', () => {
    const s = summarizeTomorrow(solunar({}), 60);
    expect(s.ymd).toBe('2026-04-26');
    expect(s.ratingLabel).toBe('Good');
    expect(s.ratingScore).toBe(75);
    expect(s.sunrise).toBe('06:00');
    expect(s.delta).toBe('better');
  });

  it('emits "worse" when tomorrow underperforms today', () => {
    const s = summarizeTomorrow(
      solunar({
        rating: {
          score: 40,
          label: 'Poor',
          factors: {
            moon_phase: 'New Moon',
            illumination: 0,
            solunar_dawn_overlap: false,
            solunar_dusk_overlap: false,
          },
        },
      }),
      80,
    );
    expect(s.ratingLabel).toBe('Poor');
    expect(s.ratingScore).toBe(40);
    expect(s.delta).toBe('worse');
  });

  it('emits "same" when scores match within tolerance', () => {
    const s = summarizeTomorrow(
      solunar({
        rating: {
          score: 71,
          label: 'Good',
          factors: {
            moon_phase: 'Waning Gibbous',
            illumination: 80,
            solunar_dawn_overlap: false,
            solunar_dusk_overlap: false,
          },
        },
      }),
      72,
    );
    expect(s.delta).toBe('same');
  });
});
