/**
 * @file BriefingWeatherCard.test.tsx
 * @description Public-contract test for the Phase A.32 weather one-liner.
 *
 * Following the project convention (see ConfidenceChip.test.tsx and
 * SunMoonCard.test.tsx), we validate the component's public contract
 * via static inspection rather than rendering into a host tree. The
 * pure helpers (parseWindMph, summarizeForecast, formatHighLow,
 * formatWind) live in briefingWeatherService and are unit-tested in
 * `services/__tests__/briefingWeatherService.test.ts`.
 */

import BriefingWeatherCard from '../BriefingWeatherCard';

describe('BriefingWeatherCard — public contract', () => {
  it('exports a default function component', () => {
    expect(typeof BriefingWeatherCard).toBe('function');
  });
});
