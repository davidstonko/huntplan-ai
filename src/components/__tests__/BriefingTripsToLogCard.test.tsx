/**
 * @file BriefingTripsToLogCard.test.tsx
 * @description Public-contract test for the Phase A.46 Trips-to-Log
 * card. The selector + journal-match logic is unit-tested in
 * `services/__tests__/recentlyEndedTripsService.test.ts`; here we
 * only lock the export shape (mirrors A.39 / A.44 convention).
 */

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: jest.fn() }),
}));

import BriefingTripsToLogCard from '../BriefingTripsToLogCard';

describe('BriefingTripsToLogCard — public contract', () => {
  it('exports a default function component', () => {
    expect(typeof BriefingTripsToLogCard).toBe('function');
  });
});
