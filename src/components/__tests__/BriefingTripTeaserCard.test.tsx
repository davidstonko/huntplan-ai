/**
 * @file BriefingTripTeaserCard.test.tsx
 * @description Public-contract test for the Phase A.44 Trip-on-Deck
 * card. The selector logic is unit-tested in
 * `services/__tests__/briefingTripTeaserService.test.ts`; here we only
 * lock the export shape (mirrors A.39 BriefingGoalSpotlightCard
 * convention).
 *
 * `useNavigation` is stubbed so the import-time evaluation doesn't
 * fail — the component pulls a navigate ref from the navigation
 * context.
 */

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: jest.fn() }),
}));

import BriefingTripTeaserCard from '../BriefingTripTeaserCard';

describe('BriefingTripTeaserCard — public contract', () => {
  it('exports a default function component', () => {
    expect(typeof BriefingTripTeaserCard).toBe('function');
  });
});
