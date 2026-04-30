/**
 * @file BriefingActivityRatingCard.test.tsx
 * @description Public-contract test for the Phase A.34 today's-activity
 * one-liner.
 *
 * Following the project convention (see SunMoonCard.test.tsx,
 * BriefingWeatherCard.test.tsx, BriefingTideCard.test.tsx), we
 * validate the component's public contract via static inspection
 * rather than rendering into a host tree. The pure helpers
 * (ratingAccentOf, pickBestWindow, formatBestWindowRange,
 * summarizeActivityRating) live in briefingActivityRatingService
 * and are unit-tested in
 * `services/__tests__/briefingActivityRatingService.test.ts`.
 */

import BriefingActivityRatingCard from '../BriefingActivityRatingCard';

describe('BriefingActivityRatingCard — public contract', () => {
  it('exports a default function component', () => {
    expect(typeof BriefingActivityRatingCard).toBe('function');
  });
});
