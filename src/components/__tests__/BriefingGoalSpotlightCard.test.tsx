/**
 * @file BriefingGoalSpotlightCard.test.tsx
 * @description Public-contract test for the Phase A.39 Goal Spotlight
 * card.
 *
 * Following the project convention (see SunMoonCard.test.tsx,
 * BriefingTomorrowCard.test.tsx, BriefingBestDayCard.test.tsx, etc.),
 * we validate the component's public contract via static inspection
 * rather than rendering into a host tree. The pure picker
 * (pickBriefingGoalSpotlight, paceLabel, hasBriefingGoalSpotlight)
 * lives in briefingGoalSpotlightService and is unit-tested in
 * `services/__tests__/briefingGoalSpotlightService.test.ts`.
 *
 * `@react-navigation/native` is published as ESM and not
 * pre-transformed by jest's react-native preset; this card is the
 * first briefing card to import `useNavigation` (the others are
 * presentational only). Stub the export so the file loads.
 */

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: jest.fn() }),
}));

import BriefingGoalSpotlightCard from '../BriefingGoalSpotlightCard';

describe('BriefingGoalSpotlightCard — public contract', () => {
  it('exports a default function component', () => {
    expect(typeof BriefingGoalSpotlightCard).toBe('function');
  });
});
