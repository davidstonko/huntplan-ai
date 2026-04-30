/**
 * @file briefingBestDayService.test.ts
 * @description Locks the Phase A.38 best-day-of-week projection.
 *
 * The picker scans a fixed-length window and returns the highest
 * score, with the EARLIEST day winning ties. Tests cover: empty
 * input, the full set of "where in the window does the winner
 * live?" axes, the today-wins-tie rule, the weekday-name resolver
 * (incl bad input + DST-safe local-time parse), and the relative
 * label.
 */

import {
  BEST_DAY_WINDOW,
  pickBestDay,
  relativeDayLabel,
  weekdayShortFromYmd,
} from '../briefingBestDayService';
import type { SolunarData } from '../solunarService';

// ── Factories ──

/**
 * Build a minimal SolunarData stand-in for the picker. Only
 * `date` + `rating.score` + `rating.label` are read by the
 * function under test, so the rest are placeholders that keep the
 * type happy without forcing the test to construct fully-formed
 * sun/moon/best_times structures.
 */
function day(date: string, score: number, label: SolunarData['rating']['label'] = 'Good'): SolunarData {
  return {
    date,
    moon: { phase_name: 'Waxing Crescent', illumination_pct: 50, phase_fraction: 0.25 },
    major_periods: [],
    minor_periods: [],
    sun: {
      sunrise: '06:00',
      sunset: '19:00',
      legal_start: '05:30',
      legal_end: '19:30',
    },
    best_times: [],
    rating: {
      score,
      label,
      factors: {
        moon_phase: 'Waxing Crescent',
        illumination: 50,
        solunar_dawn_overlap: false,
        solunar_dusk_overlap: false,
      },
    },
  };
}

/** Build a 7-day window starting at `start` with each day's score from `scores`. */
function window7(start: string, scores: number[]): SolunarData[] {
  // start is YYYY-MM-DD; expand into 7 sequential local-time days.
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(start)!;
  const y = Number(m[1]);
  const mo = Number(m[2]) - 1;
  const d = Number(m[3]);
  const out: SolunarData[] = [];
  for (let i = 0; i < scores.length; i++) {
    const dt = new Date(y, mo, d + i);
    const yy = dt.getFullYear();
    const mm = String(dt.getMonth() + 1).padStart(2, '0');
    const dd = String(dt.getDate()).padStart(2, '0');
    out.push(day(`${yy}-${mm}-${dd}`, scores[i]));
  }
  return out;
}

// ── BEST_DAY_WINDOW — the constant matters; lock its value ──

describe('BEST_DAY_WINDOW', () => {
  it('is 7 (one full calendar week)', () => {
    expect(BEST_DAY_WINDOW).toBe(7);
  });
});

// ── weekdayShortFromYmd ──

describe('weekdayShortFromYmd', () => {
  it('returns the correct short name for a known weekday', () => {
    // 2026-04-25 was a Saturday (used throughout the briefing tests).
    expect(weekdayShortFromYmd('2026-04-25')).toBe('Sat');
  });

  it('handles a Sunday (index 0) without falling off the array', () => {
    // 2026-04-26 is a Sunday.
    expect(weekdayShortFromYmd('2026-04-26')).toBe('Sun');
  });

  it('returns empty string for malformed input', () => {
    expect(weekdayShortFromYmd('not-a-date')).toBe('');
    expect(weekdayShortFromYmd('')).toBe('');
    expect(weekdayShortFromYmd('2026/04/25')).toBe('');
  });

  it('parses in local time, not UTC (no off-by-one)', () => {
    // If we naively did `new Date('2026-01-01')` that's UTC midnight,
    // which renders as Dec 31 in any timezone west of UTC. The local
    // (year, monthIdx, day) constructor sidesteps that.
    expect(weekdayShortFromYmd('2026-01-01')).toBe('Thu');
  });
});

// ── pickBestDay — primary picker ──

describe('pickBestDay — empty input', () => {
  it('returns a today-shaped result when the window is empty', () => {
    const summary = pickBestDay('2026-04-25', []);
    expect(summary.ymd).toBe('2026-04-25');
    expect(summary.daysAhead).toBe(0);
    expect(summary.weekdayShort).toBe('Sat');
    expect(summary.ratingScore).toBe(0);
    expect(summary.ratingLabel).toBe('Poor');
    expect(summary.todayIsBest).toBe(true);
  });
});

describe('pickBestDay — winner location in the window', () => {
  it('picks today when today has the highest score', () => {
    const data = window7('2026-04-25', [90, 80, 70, 60, 50, 40, 30]);
    const s = pickBestDay('2026-04-25', data);
    expect(s.daysAhead).toBe(0);
    expect(s.todayIsBest).toBe(true);
    expect(s.ymd).toBe('2026-04-25');
    expect(s.ratingScore).toBe(90);
  });

  it('picks tomorrow when tomorrow strictly beats today', () => {
    const data = window7('2026-04-25', [50, 90, 50, 50, 50, 50, 50]);
    const s = pickBestDay('2026-04-25', data);
    expect(s.daysAhead).toBe(1);
    expect(s.todayIsBest).toBe(false);
    expect(s.ymd).toBe('2026-04-26');
    expect(s.weekdayShort).toBe('Sun');
    expect(s.ratingScore).toBe(90);
  });

  it('picks a mid-week winner', () => {
    const data = window7('2026-04-25', [50, 60, 70, 99, 70, 60, 50]);
    const s = pickBestDay('2026-04-25', data);
    expect(s.daysAhead).toBe(3);
    expect(s.ymd).toBe('2026-04-28');
    expect(s.weekdayShort).toBe('Tue');
    expect(s.ratingScore).toBe(99);
    expect(s.todayIsBest).toBe(false);
  });

  it('picks the last day in the window when it has the highest score', () => {
    const data = window7('2026-04-25', [50, 50, 50, 50, 50, 50, 88]);
    const s = pickBestDay('2026-04-25', data);
    expect(s.daysAhead).toBe(6);
    expect(s.ymd).toBe('2026-05-01');
    expect(s.ratingScore).toBe(88);
  });
});

describe('pickBestDay — tie-breaks favor the earlier day', () => {
  it('today wins a tie with tomorrow', () => {
    const data = window7('2026-04-25', [80, 80, 70, 70, 70, 70, 70]);
    const s = pickBestDay('2026-04-25', data);
    expect(s.daysAhead).toBe(0);
    expect(s.todayIsBest).toBe(true);
  });

  it('tomorrow wins a tie with day-after when today is lower', () => {
    const data = window7('2026-04-25', [50, 80, 80, 70, 70, 70, 70]);
    const s = pickBestDay('2026-04-25', data);
    expect(s.daysAhead).toBe(1);
    expect(s.ymd).toBe('2026-04-26');
  });

  it('all-equal window picks today', () => {
    const data = window7('2026-04-25', [70, 70, 70, 70, 70, 70, 70]);
    const s = pickBestDay('2026-04-25', data);
    expect(s.daysAhead).toBe(0);
    expect(s.todayIsBest).toBe(true);
  });
});

describe('pickBestDay — surfaces the rating label', () => {
  it('returns the winner day\'s label, not today\'s', () => {
    const today = day('2026-04-25', 50, 'Fair');
    const tomorrow = day('2026-04-26', 95, 'Excellent');
    const s = pickBestDay('2026-04-25', [today, tomorrow]);
    expect(s.ratingLabel).toBe('Excellent');
    expect(s.daysAhead).toBe(1);
  });
});

describe('pickBestDay — month rollover in the window', () => {
  it('handles a window that crosses a month boundary', () => {
    // 2026-04-28 → +6 = 2026-05-04. Verifies the test-factory math
    // and that the picker passes through the date string verbatim.
    const data = window7('2026-04-28', [50, 50, 50, 95, 50, 50, 50]);
    const s = pickBestDay('2026-04-28', data);
    expect(s.ymd).toBe('2026-05-01');
    expect(s.daysAhead).toBe(3);
  });
});

// ── relativeDayLabel ──

describe('relativeDayLabel', () => {
  it('returns TODAY for 0', () => {
    expect(relativeDayLabel(0)).toBe('TODAY');
  });

  it('returns TODAY for negative input (defensive)', () => {
    expect(relativeDayLabel(-1)).toBe('TODAY');
  });

  it('returns TOMORROW for 1', () => {
    expect(relativeDayLabel(1)).toBe('TOMORROW');
  });

  it('returns IN N DAYS for ≥ 2', () => {
    expect(relativeDayLabel(2)).toBe('IN 2 DAYS');
    expect(relativeDayLabel(6)).toBe('IN 6 DAYS');
  });
});
