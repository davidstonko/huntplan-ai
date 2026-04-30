/**
 * journalEntry.test.ts — pure-function contract for journal-entry types.
 */

import {
  JOURNAL_OUTCOME_META,
  OUTCOMES_BY_MODE,
  resolveOutcomeColor,
  resolveOutcomeLetterCode,
  todayDateLabel,
} from '../journalEntry';

describe('JOURNAL_OUTCOME_META', () => {
  it('has a metadata entry for every outcome surfaced via OUTCOMES_BY_MODE', () => {
    const surfaced = new Set<string>();
    Object.values(OUTCOMES_BY_MODE).forEach((list) =>
      list.forEach((o) => surfaced.add(o)),
    );
    for (const outcome of surfaced) {
      expect(
        JOURNAL_OUTCOME_META[outcome as keyof typeof JOURNAL_OUTCOME_META],
      ).toBeDefined();
    }
  });

  it('every meta row has non-empty label, letterCode, and #-prefixed color', () => {
    for (const [, meta] of Object.entries(JOURNAL_OUTCOME_META)) {
      expect(meta.label.length).toBeGreaterThan(0);
      expect(meta.letterCode.length).toBeGreaterThan(0);
      expect(meta.letterCode.length).toBeLessThanOrEqual(3);
      expect(meta.color.startsWith('#')).toBe(true);
    }
  });
});

describe('OUTCOMES_BY_MODE', () => {
  it('every mode includes the cross-mode "scout" and "note" outcomes', () => {
    for (const list of Object.values(OUTCOMES_BY_MODE)) {
      expect(list).toContain('scout');
      expect(list).toContain('note');
    }
  });

  it('hunt surfaces harvest; fish surfaces catch; camp/hike surface completed', () => {
    expect(OUTCOMES_BY_MODE.hunt).toContain('harvest');
    expect(OUTCOMES_BY_MODE.fish).toContain('catch');
    expect(OUTCOMES_BY_MODE.camp).toContain('completed');
    expect(OUTCOMES_BY_MODE.hike).toContain('completed');
  });

  it('no mode surfaces an outcome that does not belong (eg fish has no harvest)', () => {
    expect(OUTCOMES_BY_MODE.fish).not.toContain('harvest');
    expect(OUTCOMES_BY_MODE.hunt).not.toContain('catch');
  });
});

describe('resolveOutcomeColor', () => {
  it('returns the meta color for every known outcome', () => {
    expect(resolveOutcomeColor('harvest')).toBe(
      JOURNAL_OUTCOME_META.harvest.color,
    );
    expect(resolveOutcomeColor('skunked')).toBe(
      JOURNAL_OUTCOME_META.skunked.color,
    );
  });

  it('falls back to neutral gray for an unknown outcome', () => {
    expect(resolveOutcomeColor('totally-fake' as any)).toBe('#616161');
  });
});

describe('resolveOutcomeLetterCode', () => {
  it('returns the meta letter code for every known outcome', () => {
    expect(resolveOutcomeLetterCode('harvest')).toBe('HV');
    expect(resolveOutcomeLetterCode('catch')).toBe('CT');
    expect(resolveOutcomeLetterCode('turned-back')).toBe('TB');
  });

  it('falls back to NT for an unknown outcome', () => {
    expect(resolveOutcomeLetterCode('totally-fake' as any)).toBe('NT');
  });
});

describe('todayDateLabel', () => {
  it('returns YYYY-MM-DD for a given Date', () => {
    const d = new Date(2026, 3, 24); // April 24, 2026 local
    expect(todayDateLabel(d)).toBe('2026-04-24');
  });

  it('zero-pads month and day', () => {
    const d = new Date(2026, 0, 5); // Jan 5, 2026
    expect(todayDateLabel(d)).toBe('2026-01-05');
  });

  it('defaults to current date when no arg passed', () => {
    expect(todayDateLabel()).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});
