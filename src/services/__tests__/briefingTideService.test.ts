/**
 * @file briefingTideService.test.ts
 * @description Locks the Phase A.33 pure helpers that turn a
 * MarineConditions snapshot into the one-row Daily Briefing tide
 * view-model.
 *
 * The card itself is contract-tested in BriefingTideCard.test.tsx.
 * The riskier surface is here: the predicate that decides whether the
 * card should render at all (inland users → no card), and the time
 * formatting (12-hour clock, relative-time deltas).
 */

import {
  hasUsefulTideData,
  titleCase,
  formatTideTime,
  formatTideRelative,
  summarizeTide,
} from '../briefingTideService';
import type { MarineConditions } from '../weatherService';

function marine(over: Partial<MarineConditions>): MarineConditions {
  return {
    waveHeightFt: null,
    waterTempF: null,
    windSpeedMph: null,
    windDirection: null,
    tideStage: 'unknown',
    nextTideTime: null,
    nextTideType: null,
    smallCraftAdvisory: false,
    advisory: '',
    asOf: '2026-04-25T08:00:00Z',
    ...over,
  };
}

describe('hasUsefulTideData — render predicate', () => {
  it('returns false when stage is unknown and there is no next-tide info', () => {
    expect(hasUsefulTideData(marine({}))).toBe(false);
  });

  it('returns true when stage is a real value (e.g. incoming)', () => {
    expect(hasUsefulTideData(marine({ tideStage: 'incoming' }))).toBe(true);
  });

  it('returns true when stage is unknown but next-tide info is present', () => {
    expect(
      hasUsefulTideData(
        marine({
          tideStage: 'unknown',
          nextTideTime: '2026-04-25T14:30:00Z',
          nextTideType: 'high',
        }),
      ),
    ).toBe(true);
  });

  it('returns false when only one half of the next-tide pair is present', () => {
    expect(
      hasUsefulTideData(
        marine({ nextTideTime: '2026-04-25T14:30:00Z', nextTideType: null }),
      ),
    ).toBe(false);
    expect(
      hasUsefulTideData(
        marine({ nextTideTime: null, nextTideType: 'high' }),
      ),
    ).toBe(false);
  });
});

describe('titleCase — null-safe first-letter capitalize', () => {
  it('capitalizes a lowercase word', () => {
    expect(titleCase('incoming')).toBe('Incoming');
  });

  it('lowercases the rest of an all-caps word', () => {
    expect(titleCase('HIGH')).toBe('High');
  });

  it('returns null for null/undefined/empty', () => {
    expect(titleCase(null)).toBeNull();
    expect(titleCase(undefined)).toBeNull();
    expect(titleCase('')).toBeNull();
  });
});

describe('formatTideTime — ISO → "h:MM AM/PM"', () => {
  it('formats a morning ISO as h:MM AM (local)', () => {
    // Build via local-time constructor so the test runs the same in any TZ.
    const iso = new Date(2026, 3, 25, 6, 30, 0).toISOString();
    expect(formatTideTime(iso)).toBe('6:30 AM');
  });

  it('formats an afternoon ISO as h:MM PM (local)', () => {
    const iso = new Date(2026, 3, 25, 14, 5, 0).toISOString();
    expect(formatTideTime(iso)).toBe('2:05 PM');
  });

  it('formats midnight as 12:00 AM', () => {
    const iso = new Date(2026, 3, 25, 0, 0, 0).toISOString();
    expect(formatTideTime(iso)).toBe('12:00 AM');
  });

  it('formats noon as 12:00 PM', () => {
    const iso = new Date(2026, 3, 25, 12, 0, 0).toISOString();
    expect(formatTideTime(iso)).toBe('12:00 PM');
  });

  it('returns null for null/undefined input', () => {
    expect(formatTideTime(null)).toBeNull();
    expect(formatTideTime(undefined)).toBeNull();
  });

  it('returns null for unparseable input', () => {
    expect(formatTideTime('not-a-date')).toBeNull();
  });
});

describe('formatTideRelative — "in Xh YYm" / "in YYm" / "now"', () => {
  const now = new Date('2026-04-25T12:00:00Z');

  it('returns "in Xh YYm" for multi-hour deltas', () => {
    const future = new Date('2026-04-25T14:15:00Z').toISOString();
    expect(formatTideRelative(future, now)).toBe('in 2h 15m');
  });

  it('zero-pads the minute portion in multi-hour deltas', () => {
    const future = new Date('2026-04-25T14:05:00Z').toISOString();
    expect(formatTideRelative(future, now)).toBe('in 2h 05m');
  });

  it('returns "in YYm" when under one hour', () => {
    const future = new Date('2026-04-25T12:30:00Z').toISOString();
    expect(formatTideRelative(future, now)).toBe('in 30m');
  });

  it('returns "now" when the delta is zero or negative', () => {
    expect(formatTideRelative(new Date('2026-04-25T12:00:00Z').toISOString(), now)).toBe(
      'now',
    );
    expect(formatTideRelative(new Date('2026-04-25T11:00:00Z').toISOString(), now)).toBe(
      'now',
    );
  });

  it('returns null for null or unparseable input', () => {
    expect(formatTideRelative(null, now)).toBeNull();
    expect(formatTideRelative(undefined, now)).toBeNull();
    expect(formatTideRelative('not-a-date', now)).toBeNull();
  });
});

describe('summarizeTide — projection of MarineConditions → view-model', () => {
  const now = new Date('2026-04-25T12:00:00Z');

  it('projects a full coastal MarineConditions snapshot', () => {
    const m = marine({
      tideStage: 'incoming',
      nextTideTime: '2026-04-25T14:30:00Z',
      nextTideType: 'high',
    });
    const s = summarizeTide(m, now);
    expect(s.stageLabel).toBe('Incoming');
    expect(s.nextTideTypeLabel).toBe('HIGH');
    expect(s.nextTideTimeLabel).not.toBeNull(); // formatted local time
    expect(s.nextTideRelativeLabel).toBe('in 2h 30m');
  });

  it('returns null stageLabel for unknown stage (inland point)', () => {
    const m = marine({
      tideStage: 'unknown',
      nextTideTime: '2026-04-25T14:30:00Z',
      nextTideType: 'low',
    });
    const s = summarizeTide(m, now);
    expect(s.stageLabel).toBeNull();
    expect(s.nextTideTypeLabel).toBe('LOW');
    expect(s.nextTideRelativeLabel).toBe('in 2h 30m');
  });

  it('handles a snapshot with stage but no next-tide info', () => {
    const m = marine({
      tideStage: 'high',
      nextTideTime: null,
      nextTideType: null,
    });
    const s = summarizeTide(m, now);
    expect(s.stageLabel).toBe('High');
    expect(s.nextTideTypeLabel).toBeNull();
    expect(s.nextTideTimeLabel).toBeNull();
    expect(s.nextTideRelativeLabel).toBeNull();
  });

  it('handles a fully empty MarineConditions (would also fail predicate)', () => {
    const s = summarizeTide(marine({}), now);
    expect(s.stageLabel).toBeNull();
    expect(s.nextTideTypeLabel).toBeNull();
    expect(s.nextTideTimeLabel).toBeNull();
    expect(s.nextTideRelativeLabel).toBeNull();
  });
});
