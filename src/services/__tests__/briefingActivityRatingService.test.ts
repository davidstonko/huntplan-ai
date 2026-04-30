/**
 * @file briefingActivityRatingService.test.ts
 * @description Locks the Phase A.34 pure helpers that project a
 * SolunarData snapshot into the one-row "Today's Activity" card view-model.
 *
 * The card itself is contract-tested in BriefingActivityRatingCard.test.tsx.
 * The riskier surface is here: rating-accent bucketing (drives the
 * dashboard's color emphasis), best-window picking (priority='high'
 * preferred), and the time-range formatter that bails to null on parse
 * failure rather than emitting half a range.
 */

import {
  ratingAccentOf,
  pickBestWindow,
  formatBestWindowRange,
  summarizeActivityRating,
} from '../briefingActivityRatingService';
import type {
  SolunarData,
  BestTimeWindow,
} from '../solunarService';

function bestTime(over: Partial<BestTimeWindow>): BestTimeWindow {
  return {
    window: 'Dawn Feed',
    start: '05:30',
    end: '07:30',
    priority: 'high',
    reason: 'Peak feeding at first light',
    ...over,
  };
}

function solunar(over: Partial<SolunarData>): SolunarData {
  return {
    date: '2026-04-25',
    moon: { phase_name: 'Full Moon', illumination_pct: 100, phase_fraction: 0.5 },
    major_periods: [],
    minor_periods: [],
    sun: {
      sunrise: '06:00',
      sunset: '19:30',
      legal_start: '05:30',
      legal_end: '20:00',
    },
    best_times: [bestTime({})],
    rating: {
      score: 72,
      label: 'Good',
      factors: {
        moon_phase: 'Full Moon',
        illumination: 100,
        solunar_dawn_overlap: false,
        solunar_dusk_overlap: false,
      },
    },
    ...over,
  };
}

describe('ratingAccentOf — visual-weight bucket', () => {
  it('returns strong for Excellent', () => {
    expect(ratingAccentOf('Excellent')).toBe('strong');
  });

  it('returns strong for Good', () => {
    expect(ratingAccentOf('Good')).toBe('strong');
  });

  it('returns medium for Fair', () => {
    expect(ratingAccentOf('Fair')).toBe('medium');
  });

  it('returns muted for Poor', () => {
    expect(ratingAccentOf('Poor')).toBe('muted');
  });

  it('falls back to muted for any unknown label', () => {
    expect(ratingAccentOf('Unknown')).toBe('muted');
  });
});

describe('pickBestWindow — priority-aware first-of-array', () => {
  it('returns null for an empty list', () => {
    expect(pickBestWindow([])).toBeNull();
  });

  it('returns the only window when the list has one entry', () => {
    const w = bestTime({});
    expect(pickBestWindow([w])).toBe(w);
  });

  it('prefers the first high-priority window over a leading low-priority one', () => {
    const low = bestTime({ window: 'Mid-day Slack', priority: 'low' });
    const high = bestTime({ window: 'Dusk Feed', priority: 'high' });
    expect(pickBestWindow([low, high])?.window).toBe('Dusk Feed');
  });

  it('returns the first window when none are high-priority', () => {
    const a = bestTime({ window: 'A', priority: 'low' });
    const b = bestTime({ window: 'B', priority: 'medium' });
    expect(pickBestWindow([a, b])?.window).toBe('A');
  });

  it('returns the first high-priority window when multiple are high', () => {
    const a = bestTime({ window: 'Dawn', priority: 'high' });
    const b = bestTime({ window: 'Dusk', priority: 'high' });
    expect(pickBestWindow([a, b])?.window).toBe('Dawn');
  });
});

describe('formatBestWindowRange — "h:MM AM/PM – h:MM AM/PM"', () => {
  it('formats a morning range', () => {
    expect(formatBestWindowRange('05:30', '07:30')).toBe('5:30 AM – 7:30 AM');
  });

  it('formats an evening range crossing noon', () => {
    expect(formatBestWindowRange('11:30', '13:30')).toBe('11:30 AM – 1:30 PM');
  });

  it('formats midnight-crossing endpoints individually (no roll-over math)', () => {
    expect(formatBestWindowRange('00:00', '02:00')).toBe('12:00 AM – 2:00 AM');
  });

  it('returns null when either side is missing', () => {
    expect(formatBestWindowRange(undefined, '07:30')).toBeNull();
    expect(formatBestWindowRange('05:30', undefined)).toBeNull();
  });

  it('returns null when either side fails the HH:MM parse', () => {
    expect(formatBestWindowRange('not-a-time', '07:30')).toBeNull();
    expect(formatBestWindowRange('05:30', 'late')).toBeNull();
  });
});

describe('summarizeActivityRating — full projection', () => {
  it('projects a full snapshot with one high-priority window', () => {
    const s = summarizeActivityRating(solunar({}));
    expect(s.ratingLabel).toBe('Good');
    expect(s.ratingScore).toBe(72);
    expect(s.ratingAccent).toBe('strong');
    expect(s.bestWindowLabel).toBe('Dawn Feed');
    expect(s.bestWindowTimeRange).toBe('5:30 AM – 7:30 AM');
    expect(s.bestWindowReason).toBe('Peak feeding at first light');
  });

  it('projects an Excellent day with two high-priority windows (picks dawn)', () => {
    const s = summarizeActivityRating(
      solunar({
        rating: {
          score: 88,
          label: 'Excellent',
          factors: {
            moon_phase: 'Full Moon',
            illumination: 100,
            solunar_dawn_overlap: true,
            solunar_dusk_overlap: true,
          },
        },
        best_times: [
          bestTime({ window: 'Dawn Feed', priority: 'high' }),
          bestTime({
            window: 'Dusk Feed',
            start: '17:30',
            end: '19:30',
            priority: 'high',
            reason: 'Evening feeding movement',
          }),
        ],
      }),
    );
    expect(s.ratingLabel).toBe('Excellent');
    expect(s.ratingAccent).toBe('strong');
    expect(s.bestWindowLabel).toBe('Dawn Feed');
  });

  it('projects a Poor-rating day with no best_times to a muted accent + null window', () => {
    const s = summarizeActivityRating(
      solunar({
        rating: {
          score: 30,
          label: 'Poor',
          factors: {
            moon_phase: 'New Moon',
            illumination: 0,
            solunar_dawn_overlap: false,
            solunar_dusk_overlap: false,
          },
        },
        best_times: [],
      }),
    );
    expect(s.ratingLabel).toBe('Poor');
    expect(s.ratingScore).toBe(30);
    expect(s.ratingAccent).toBe('muted');
    expect(s.bestWindowLabel).toBeNull();
    expect(s.bestWindowTimeRange).toBeNull();
    expect(s.bestWindowReason).toBeNull();
  });

  it('handles a Fair-rating day (medium accent)', () => {
    const s = summarizeActivityRating(
      solunar({
        rating: {
          score: 50,
          label: 'Fair',
          factors: {
            moon_phase: 'Last Quarter',
            illumination: 50,
            solunar_dawn_overlap: false,
            solunar_dusk_overlap: false,
          },
        },
      }),
    );
    expect(s.ratingAccent).toBe('medium');
  });
});
