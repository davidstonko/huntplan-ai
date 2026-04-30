/**
 * @file BriefingTripDroughtCard.test.tsx
 * @description Public-contract test for the Phase A.48 Trip Drought
 * card. Selector logic is unit-tested in
 * `services/__tests__/briefingTripDroughtService.test.ts`; here we
 * only lock the export shape.
 */

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: jest.fn() }),
}));

import BriefingTripDroughtCard from '../BriefingTripDroughtCard';

describe('BriefingTripDroughtCard — public contract', () => {
  it('exports a default function component', () => {
    expect(typeof BriefingTripDroughtCard).toBe('function');
  });
});
