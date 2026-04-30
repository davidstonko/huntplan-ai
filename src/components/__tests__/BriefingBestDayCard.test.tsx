/**
 * @file BriefingBestDayCard.test.tsx
 * @description Public-contract test for the Phase A.38 Best Day
 * This Week card.
 *
 * Following the project convention (see SunMoonCard.test.tsx,
 * BriefingTomorrowCard.test.tsx, etc.), we validate the component's
 * public contract via static inspection rather than rendering into a
 * host tree. The pure helpers (BEST_DAY_WINDOW, pickBestDay,
 * relativeDayLabel, weekdayShortFromYmd) live in briefingBestDayService
 * and are unit-tested in
 * `services/__tests__/briefingBestDayService.test.ts`.
 */

import BriefingBestDayCard from '../BriefingBestDayCard';

describe('BriefingBestDayCard — public contract', () => {
  it('exports a default function component', () => {
    expect(typeof BriefingBestDayCard).toBe('function');
  });
});
