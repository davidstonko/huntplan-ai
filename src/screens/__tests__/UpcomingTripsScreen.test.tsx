/**
 * @file UpcomingTripsScreen.test.tsx
 * @description Public-contract test for the Phase A.41 screen.
 *
 * The aggregator math lives in upcomingTripsService and is unit-tested
 * in services/__tests__/upcomingTripsService.test.ts. The screen is a
 * presentational wrapper around that service plus an AsyncStorage
 * load — convention is to verify the default-export shape only. The
 * screen imports `useNavigation` so the @react-navigation/native ESM
 * stub is required (same pattern as A.39's BriefingGoalSpotlightCard).
 */

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: jest.fn(), addListener: () => () => {} }),
}));

import UpcomingTripsScreen from '../UpcomingTripsScreen';

describe('UpcomingTripsScreen — public contract', () => {
  it('exports a default function component', () => {
    expect(typeof UpcomingTripsScreen).toBe('function');
  });
});
