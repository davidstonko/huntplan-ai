/**
 * chatKnowledge augmentation contract test (Hunt mode).
 *
 * Locks the 2026-04-27 wiring that pipes `servicesForRegion` +
 * `servicesForSpecies` into hunt-mode chat responses. When a user
 * mentions a known region or species, the response must include a
 * "Local pros for ..." footer with at least one verified-2026 service.
 */

import { getSmartResponse } from '../chatKnowledge';

describe('chatKnowledge — local-pros augmentation (Hunt)', () => {
  it('includes Eastern Shore waterfowl outfitters when user asks about Kent County goose hunting', () => {
    const r = getSmartResponse('What is the goose season in Kent County?');
    expect(r.text).toMatch(/Local pros for/i);
    // At least one of the verified-2026 Kent County waterfowl outfitters
    expect(/Winter Farms|Sean Mann|Harrison/i.test(r.text)).toBe(true);
  });

  it('includes Dorchester sika outfitters when user asks about sika', () => {
    const r = getSmartResponse('Where can I hunt sika deer?');
    expect(r.text).toMatch(/Local pros for/i);
    expect(/Muddy Marsh|TUNDRATOUR|Nanticoke Outfitters/i.test(r.text)).toBe(
      true,
    );
  });

  it('includes Western Maryland outfitters when user asks about bear', () => {
    const r = getSmartResponse('When is bear season in Western Maryland?');
    expect(r.text).toMatch(/Local pros for/i);
  });

  it('does NOT add a footer when no region or species is mentioned', () => {
    const r = getSmartResponse('What does CWD stand for?');
    expect(r.text).not.toMatch(/Local pros for/i);
  });
});
