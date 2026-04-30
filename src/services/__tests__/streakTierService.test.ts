/**
 * @file streakTierService.test.ts
 * @description Locks the Phase A.36 streak-tier projection.
 *
 * The Daily Briefing's streak strip renders these badges; the
 * threshold table is the only thing that decides what the user
 * sees, so the boundary cases are tested explicitly. A future
 * tweak to the bands should require updating these tests, which is
 * exactly the kind of forcing-function we want.
 */

import {
  tierFromStreak,
  shouldShowBadge,
} from '../streakTierService';

describe('tierFromStreak — threshold boundaries', () => {
  it('returns tier "none" with muted accent for 0 days', () => {
    const info = tierFromStreak(0);
    expect(info.tier).toBe('none');
    expect(info.accent).toBe('muted');
    expect(info.label).toBe('NONE');
    expect(info.nextTierLabel).toBe('NEW');
    expect(info.daysToNextTier).toBe(1);
  });

  it('returns tier "new" for the first day of activity', () => {
    const info = tierFromStreak(1);
    expect(info.tier).toBe('new');
    expect(info.accent).toBe('muted');
    expect(info.label).toBe('NEW');
    expect(info.nextTierLabel).toBe('CONSISTENT');
    expect(info.daysToNextTier).toBe(2);
  });

  it('still returns tier "new" at 2 days (just below CONSISTENT)', () => {
    expect(tierFromStreak(2).tier).toBe('new');
    expect(tierFromStreak(2).daysToNextTier).toBe(1);
  });

  it('returns tier "consistent" exactly at the 3-day boundary', () => {
    const info = tierFromStreak(3);
    expect(info.tier).toBe('consistent');
    expect(info.accent).toBe('medium');
    expect(info.label).toBe('CONSISTENT');
    expect(info.nextTierLabel).toBe('COMMITTED');
    expect(info.daysToNextTier).toBe(4);
  });

  it('still returns tier "consistent" at 6 days (just below COMMITTED)', () => {
    expect(tierFromStreak(6).tier).toBe('consistent');
    expect(tierFromStreak(6).daysToNextTier).toBe(1);
  });

  it('returns tier "committed" exactly at the 7-day boundary', () => {
    const info = tierFromStreak(7);
    expect(info.tier).toBe('committed');
    expect(info.accent).toBe('strong');
    expect(info.label).toBe('COMMITTED');
    expect(info.nextTierLabel).toBe('LEGEND');
    expect(info.daysToNextTier).toBe(23);
  });

  it('still returns tier "committed" at 29 days (just below LEGEND)', () => {
    expect(tierFromStreak(29).tier).toBe('committed');
    expect(tierFromStreak(29).daysToNextTier).toBe(1);
  });

  it('returns tier "legend" exactly at the 30-day boundary', () => {
    const info = tierFromStreak(30);
    expect(info.tier).toBe('legend');
    expect(info.accent).toBe('elite');
    expect(info.label).toBe('LEGEND');
    expect(info.nextTierLabel).toBeNull();
    expect(info.daysToNextTier).toBeNull();
  });

  it('returns tier "legend" for very large streak counts (no overflow)', () => {
    expect(tierFromStreak(365).tier).toBe('legend');
    expect(tierFromStreak(10000).tier).toBe('legend');
  });

  it('clamps negative input to 0 ("none" tier)', () => {
    expect(tierFromStreak(-1).tier).toBe('none');
    expect(tierFromStreak(-100).tier).toBe('none');
  });

  it('floors fractional input (defensive against caller bugs)', () => {
    expect(tierFromStreak(2.9).tier).toBe('new');
    expect(tierFromStreak(7.5).tier).toBe('committed');
  });
});

describe('shouldShowBadge — render gate', () => {
  it('hides the badge for the "none" tier (no activity)', () => {
    expect(shouldShowBadge(tierFromStreak(0))).toBe(false);
  });

  it('shows the badge starting at the "new" tier (1 day)', () => {
    expect(shouldShowBadge(tierFromStreak(1))).toBe(true);
  });

  it('shows the badge for all tiers above "none"', () => {
    expect(shouldShowBadge(tierFromStreak(3))).toBe(true);
    expect(shouldShowBadge(tierFromStreak(7))).toBe(true);
    expect(shouldShowBadge(tierFromStreak(30))).toBe(true);
    expect(shouldShowBadge(tierFromStreak(365))).toBe(true);
  });
});
