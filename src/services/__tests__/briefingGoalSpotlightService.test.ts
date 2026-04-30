/**
 * @file briefingGoalSpotlightService.test.ts
 * @description Locks the Phase A.39 briefing goal-spotlight wrapper.
 *
 * The picker math itself lives in goalsService.pickFeaturedGoal and
 * is exhaustively tested in goalsService.test.ts. These tests cover
 * the briefing-side concerns layered on top: empty-list shortcut,
 * end-to-end pass-through with a realistic input, the predicate
 * sibling, and the UPPERCASE pace-label projection.
 */

import {
  pickBriefingGoalSpotlight,
  hasBriefingGoalSpotlight,
  paceLabel,
} from '../briefingGoalSpotlightService';
import type { Goal, GoalProgress } from '../../types/goal';
import type { RecordedTrack } from '../../types/track';
import type { JournalEntry } from '../../types/journalEntry';
import type { UserWaypoint } from '../../types/userWaypoint';

// ── Factories ──

function goal(overrides: Partial<Goal> = {}): Goal {
  return {
    id: 'g-1',
    label: undefined,
    scope: 'all',
    metric: 'journal_entries',
    targetValue: 100,
    year: 2026,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  };
}

function journal(date: string, mode: JournalEntry['mode'] = 'hunt'): JournalEntry {
  return {
    id: `j-${date}`,
    mode,
    outcome: 'scout',
    entryDate: date,
    title: 'x',
    body: '',
    tags: [],
    photoUris: [],
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  };
}

const NOW = new Date(2026, 3, 25); // 2026-04-25 local — day 115 of 365.

// ── pickBriefingGoalSpotlight ──

describe('pickBriefingGoalSpotlight — empty input shortcut', () => {
  it('returns null when goals list is empty', () => {
    const result = pickBriefingGoalSpotlight(
      [],
      { tracks: [], journals: [], waypoints: [] },
      NOW,
    );
    expect(result).toBeNull();
  });
});

describe('pickBriefingGoalSpotlight — passes through goalsService.pickFeaturedGoal', () => {
  it('selects the behind-pace goal over the ahead-pace one', () => {
    // Goal 1: 100 entries target, current = 5 (way behind).
    // Goal 2: 100 entries target, current = 90 (way ahead).
    // pickFeaturedGoal must prefer behind > ahead.
    const goalBehind = goal({
      id: 'g-behind',
      metric: 'journal_entries',
      scope: 'hunt',
      targetValue: 100,
    });
    const goalAhead = goal({
      id: 'g-ahead',
      metric: 'journal_entries',
      scope: 'fish',
      targetValue: 100,
    });
    const journals: JournalEntry[] = [];
    for (let i = 0; i < 5; i++) journals.push(journal(`2026-01-${String(i + 1).padStart(2, '0')}`, 'hunt'));
    for (let i = 0; i < 90; i++) {
      const m = String((i % 12) + 1).padStart(2, '0');
      const d = String((i % 28) + 1).padStart(2, '0');
      journals.push(journal(`2026-${m}-${d}`, 'fish'));
    }

    const result = pickBriefingGoalSpotlight(
      [goalBehind, goalAhead],
      { tracks: [], journals, waypoints: [] },
      NOW,
    );
    expect(result).not.toBeNull();
    expect(result!.goal.id).toBe('g-behind');
    expect(result!.paceStatus).toBe('behind');
  });

  it('returns null when every goal is already complete', () => {
    const g = goal({ id: 'g-done', targetValue: 3 });
    const journals = [
      journal('2026-01-01'),
      journal('2026-01-02'),
      journal('2026-01-03'),
    ];
    const result = pickBriefingGoalSpotlight(
      [g],
      { tracks: [], journals, waypoints: [] },
      NOW,
    );
    expect(result).toBeNull();
  });

  it('returns null when every goal is from a past year', () => {
    const g = goal({ id: 'g-old', year: 2024, targetValue: 100 });
    const result = pickBriefingGoalSpotlight(
      [g],
      { tracks: [], journals: [], waypoints: [] },
      NOW,
    );
    expect(result).toBeNull();
  });

  it('returns the only eligible goal when there is just one', () => {
    const g = goal({ id: 'g-solo', targetValue: 100 });
    const result = pickBriefingGoalSpotlight(
      [g],
      { tracks: [], journals: [], waypoints: [] },
      NOW,
    );
    expect(result).not.toBeNull();
    expect(result!.goal.id).toBe('g-solo');
  });
});

// ── hasBriefingGoalSpotlight ──

describe('hasBriefingGoalSpotlight — render gate', () => {
  it('returns false when no goals', () => {
    expect(
      hasBriefingGoalSpotlight(
        [],
        { tracks: [], journals: [], waypoints: [] },
        NOW,
      ),
    ).toBe(false);
  });

  it('returns true when at least one goal is eligible', () => {
    const g = goal({ targetValue: 100 });
    expect(
      hasBriefingGoalSpotlight(
        [g],
        { tracks: [], journals: [], waypoints: [] },
        NOW,
      ),
    ).toBe(true);
  });

  it('returns false when only goal is complete', () => {
    const g = goal({ targetValue: 1 });
    const journals = [journal('2026-01-01')];
    expect(
      hasBriefingGoalSpotlight(
        [g],
        { tracks: [] as RecordedTrack[], journals, waypoints: [] as UserWaypoint[] },
        NOW,
      ),
    ).toBe(false);
  });
});

// ── paceLabel ──

describe('paceLabel — UPPERCASE bucket projection', () => {
  function pg(status: GoalProgress['paceStatus']): GoalProgress {
    return {
      goal: goal(),
      current: 0,
      target: 100,
      percent: 0,
      daysElapsed: 100,
      daysRemaining: 265,
      expectedAtThisPoint: 27.4,
      paceStatus: status,
      display: { current: '0', target: '100', unit: 'entries' },
    };
  }

  it("renders 'BEHIND PACE' for behind", () => {
    expect(paceLabel(pg('behind'))).toBe('BEHIND PACE');
  });
  it("renders 'ON PACE' for on_pace", () => {
    expect(paceLabel(pg('on_pace'))).toBe('ON PACE');
  });
  it("renders 'AHEAD' for ahead", () => {
    expect(paceLabel(pg('ahead'))).toBe('AHEAD');
  });
  it("renders 'COMPLETE' for complete", () => {
    expect(paceLabel(pg('complete'))).toBe('COMPLETE');
  });
});
