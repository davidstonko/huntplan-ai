/**
 * solunarLocal.test.ts — pure-function contract for the offline weekly
 * forecast helpers. We don't test the network path here (separate
 * concern); we lock the local-only synchronous path the Best Times
 * screen depends on.
 */

import {
  getLocalWeeklySolunar,
  bestSolunarDay,
} from '../solunarService';

const MD_LAT = 39.0;
const MD_LNG = -76.5;

describe('getLocalWeeklySolunar', () => {
  it('returns N entries when asked for N days', () => {
    const week = getLocalWeeklySolunar(
      MD_LAT,
      MD_LNG,
      new Date(Date.UTC(2026, 10, 1)),
      7,
    );
    expect(week).toHaveLength(7);
    expect(week[0].date).toBe('2026-11-01');
    expect(week[6].date).toBe('2026-11-07');
  });

  it('every day carries a day_of_week label and a 0-100 score', () => {
    const week = getLocalWeeklySolunar(
      MD_LAT,
      MD_LNG,
      new Date(Date.UTC(2026, 10, 1)),
      7,
    );
    for (const d of week) {
      expect(d.day_of_week).toMatch(/^(Sun|Mon|Tue|Wed|Thu|Fri|Sat)$/);
      expect(d.rating.score).toBeGreaterThanOrEqual(0);
      expect(d.rating.score).toBeLessThanOrEqual(100);
      expect(['Excellent', 'Good', 'Fair', 'Poor']).toContain(
        d.rating.label,
      );
      expect(d.illumination).toBeGreaterThanOrEqual(0);
      expect(d.illumination).toBeLessThanOrEqual(100);
    }
  });

  it('defaults to 7 days', () => {
    const week = getLocalWeeklySolunar(MD_LAT, MD_LNG);
    expect(week).toHaveLength(7);
  });

  it('illumination changes across a 28-day window (full moon cycle)', () => {
    const month = getLocalWeeklySolunar(
      MD_LAT,
      MD_LNG,
      new Date(Date.UTC(2026, 10, 1)),
      28,
    );
    const illuminations = month.map((d) => d.illumination);
    expect(Math.max(...illuminations)).toBeGreaterThanOrEqual(80);
    expect(Math.min(...illuminations)).toBeLessThanOrEqual(20);
  });
});

describe('bestSolunarDay', () => {
  it('returns null for an empty week', () => {
    expect(bestSolunarDay([])).toBeNull();
  });

  it('picks the highest-score day', () => {
    const week = getLocalWeeklySolunar(
      MD_LAT,
      MD_LNG,
      new Date(Date.UTC(2026, 10, 1)),
      14,
    );
    const top = bestSolunarDay(week);
    expect(top).not.toBeNull();
    const maxScore = Math.max(...week.map((d) => d.rating.score));
    expect(top!.rating.score).toBe(maxScore);
  });
});
