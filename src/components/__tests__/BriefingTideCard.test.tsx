/**
 * @file BriefingTideCard.test.tsx
 * @description Public-contract test for the Phase A.33 tide one-liner.
 *
 * Following the project convention (see ConfidenceChip.test.tsx,
 * SunMoonCard.test.tsx, BriefingWeatherCard.test.tsx), we validate the
 * component's public contract via static inspection rather than
 * rendering into a host tree. The pure helpers (hasUsefulTideData,
 * formatTideTime, formatTideRelative, summarizeTide) live in
 * briefingTideService and are unit-tested in
 * `services/__tests__/briefingTideService.test.ts`.
 */

import BriefingTideCard from '../BriefingTideCard';

describe('BriefingTideCard — public contract', () => {
  it('exports a default function component', () => {
    expect(typeof BriefingTideCard).toBe('function');
  });
});
