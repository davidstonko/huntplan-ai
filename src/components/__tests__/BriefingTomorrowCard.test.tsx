/**
 * @file BriefingTomorrowCard.test.tsx
 * @description Public-contract test for the Phase A.35 Tomorrow
 * Preview card.
 *
 * Following the project convention (see SunMoonCard.test.tsx,
 * BriefingWeatherCard.test.tsx, BriefingTideCard.test.tsx,
 * BriefingActivityRatingCard.test.tsx), we validate the component's
 * public contract via static inspection rather than rendering into a
 * host tree. The pure helpers (addDaysToYmd, tomorrowYmd,
 * compareRating, summarizeTomorrow) live in briefingTomorrowService
 * and are unit-tested in
 * `services/__tests__/briefingTomorrowService.test.ts`.
 */

import BriefingTomorrowCard from '../BriefingTomorrowCard';

describe('BriefingTomorrowCard — public contract', () => {
  it('exports a default function component', () => {
    expect(typeof BriefingTomorrowCard).toBe('function');
  });
});
