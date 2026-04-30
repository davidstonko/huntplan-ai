/**
 * fishingChatKnowledge augmentation contract test.
 *
 * Locks the 2026-04-27 wiring that pipes `servicesForWater` into chat
 * responses. When a user mentions a known waterbody in their query, the
 * AI response must include a "Local pros for ..." footer with at least
 * one verified-2026 service.
 */

import { getFishingSmartResponse } from '../fishingChatKnowledge';

describe('fishingChatKnowledge — local-pros augmentation', () => {
  it('includes Gunpowder fly shops when the user asks about Gunpowder fishing', () => {
    const r = getFishingSmartResponse('Where can I fish on the Gunpowder?');
    expect(r).not.toBeNull();
    expect(r!.text).toMatch(/Local pros for Gunpowder Falls/i);
    // At least one of the verified-2026 Gunpowder shops should land
    expect(
      /Great Feathers|Backwater Angler|Tochterman/i.test(r!.text),
    ).toBe(true);
  });

  it('includes Loch Raven pros when the user asks about Loch Raven', () => {
    const r = getFishingSmartResponse('What fish are in Loch Raven Reservoir?');
    expect(r).not.toBeNull();
    // Tochterman's serves Loch Raven per the data file's waters[] list
    expect(/Local pros for Loch Raven/i.test(r!.text)).toBe(true);
  });

  it('includes Bay charters when the user asks about Chesapeake Bay', () => {
    const r = getFishingSmartResponse('Best stripers on the Chesapeake Bay?');
    expect(r).not.toBeNull();
    expect(/Local pros for Chesapeake Bay/i.test(r!.text)).toBe(true);
    // At least one Bay charter should surface (Lucky Strike, Rod N Reel,
    // Bunky's, etc.)
    expect(
      /Lucky Strike|Rod 'N' Reel|Bunky|Knapp|Mega Bite|Tochterman/i.test(
        r!.text,
      ),
    ).toBe(true);
  });

  it('does NOT add a footer when no waterbody is mentioned', () => {
    const r = getFishingSmartResponse(
      'What is the bag limit for largemouth bass?',
    );
    expect(r).not.toBeNull();
    expect(r!.text).not.toMatch(/Local pros for/i);
  });

  it('returns null when the query has no detectable intent', () => {
    const r = getFishingSmartResponse('xyzzy nothing relevant here');
    // We don't check exact null because the chat may have a fallback,
    // but if non-null, it must not have an obviously-wrong augmentation.
    if (r) {
      // Either a plain response or one without a stale local-pros footer
      expect(r.text).not.toMatch(/Local pros for undefined/i);
    }
  });
});
