/**
 * @file SunMoonCard.test.tsx
 * @description Jest tests for the Phase A.29 Daily Briefing Sun & Moon
 * panel — locks the pure helpers that drive its three sub-views (sun
 * ribbon time labels, day-length pill, moon-disc half brightness).
 *
 * Following the project convention (see ConfidenceChip.test.tsx), we
 * validate the component's public contract via static inspection rather
 * than rendering into a host tree. The high-risk surface is the math —
 * format edge cases, zero / negative day length, and the synodic-phase
 * → half-brightness mapping that drives the View-shape moon disc.
 */

import SunMoonCard, {
  formatTime12,
  computeDayLength,
  moonHalfBrightness,
} from '../SunMoonCard';

describe('SunMoonCard — public contract', () => {
  it('exports a default function component', () => {
    expect(typeof SunMoonCard).toBe('function');
  });

  it('exports the three pure helpers used by the card body', () => {
    expect(typeof formatTime12).toBe('function');
    expect(typeof computeDayLength).toBe('function');
    expect(typeof moonHalfBrightness).toBe('function');
  });
});

describe('formatTime12 — HH:MM 24h → "h:MM AM/PM"', () => {
  it('converts midnight to 12:00 AM', () => {
    expect(formatTime12('00:00')).toBe('12:00 AM');
  });

  it('converts noon to 12:00 PM', () => {
    expect(formatTime12('12:00')).toBe('12:00 PM');
  });

  it('converts a morning time', () => {
    expect(formatTime12('06:30')).toBe('6:30 AM');
  });

  it('converts an afternoon time', () => {
    expect(formatTime12('17:45')).toBe('5:45 PM');
  });

  it('preserves leading-zero minutes (no minute truncation)', () => {
    expect(formatTime12('07:05')).toBe('7:05 AM');
  });

  it('returns the input unchanged for malformed strings (defensive)', () => {
    expect(formatTime12('not a time')).toBe('not a time');
    expect(formatTime12('')).toBe('');
    // Above shows we don't validate ranges — the local solunar model
    // never emits invalid times, so range-violating-but-shape-matching
    // strings still get reformatted (lossy fallback is acceptable
    // because the upstream service never emits them).
  });
});

describe('computeDayLength — sunset − sunrise', () => {
  it('computes a typical winter day in Maryland', () => {
    expect(computeDayLength('07:15', '17:00')).toBe('9h 45m');
  });

  it('computes a typical summer day in Maryland', () => {
    expect(computeDayLength('05:45', '20:30')).toBe('14h 45m');
  });

  it('handles whole-hour day length', () => {
    expect(computeDayLength('06:00', '18:00')).toBe('12h 00m');
  });

  it('returns "0h 00m" if sunset precedes sunrise (defensive clamp)', () => {
    // The local solunar model never returns inverted bookends for
    // Maryland latitudes; this case exists so a polar-night-style
    // backend response does not produce a negative length.
    expect(computeDayLength('20:00', '06:00')).toBe('0h 00m');
  });

  it('returns empty string for malformed input', () => {
    expect(computeDayLength('bad', '17:00')).toBe('');
    expect(computeDayLength('07:00', 'bad')).toBe('');
  });
});

describe('moonHalfBrightness — synodic phase → left/right disc fill', () => {
  it('new moon (phase 0): both halves dark', () => {
    expect(moonHalfBrightness(0)).toEqual({ left: 0, right: 0 });
  });

  it('first quarter (phase 0.25): right half fully lit, left dark', () => {
    expect(moonHalfBrightness(0.25)).toEqual({ left: 0, right: 1 });
  });

  it('full moon (phase 0.5): both halves fully lit', () => {
    expect(moonHalfBrightness(0.5)).toEqual({ left: 1, right: 1 });
  });

  it('last quarter (phase 0.75): left half fully lit, right dark', () => {
    expect(moonHalfBrightness(0.75)).toEqual({ left: 1, right: 0 });
  });

  it('waxing crescent (phase 0.125): right half partially lit', () => {
    const { left, right } = moonHalfBrightness(0.125);
    expect(left).toBe(0);
    expect(right).toBeGreaterThan(0);
    expect(right).toBeLessThan(1);
  });

  it('waning crescent (phase 0.875): left half partially lit', () => {
    const { left, right } = moonHalfBrightness(0.875);
    expect(left).toBeGreaterThan(0);
    expect(left).toBeLessThan(1);
    expect(right).toBe(0);
  });

  it('wraps phase fractions outside [0,1) into the unit interval', () => {
    expect(moonHalfBrightness(1.0)).toEqual({ left: 0, right: 0 });
    // 1.25 wraps to 0.25 (first quarter)
    const wrapped = moonHalfBrightness(1.25);
    expect(wrapped.left).toBeCloseTo(0, 5);
    expect(wrapped.right).toBeCloseTo(1, 5);
  });

  it('every interpolated phase produces brightness values in [0,1]', () => {
    for (let p = 0; p <= 1; p += 0.0125) {
      const { left, right } = moonHalfBrightness(p);
      expect(left).toBeGreaterThanOrEqual(0);
      expect(left).toBeLessThanOrEqual(1);
      expect(right).toBeGreaterThanOrEqual(0);
      expect(right).toBeLessThanOrEqual(1);
    }
  });
});
