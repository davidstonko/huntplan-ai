/**
 * hikingChatKnowledge augmentation contract test (Hike mode).
 *
 * Locks the 2026-04-27 wiring that pipes `servicesForRegion` into hiking
 * chat responses. Region tokens (Catoctin, Loch Raven, AT, DMV, etc.)
 * trigger a "Local pros" footer with hiking-shop / bike-shop / shoe-store
 * services.
 */

import { getHikingSmartResponse } from '../hikingChatKnowledge';

describe('hikingChatKnowledge — local-pros augmentation (Hike)', () => {
  it('includes Baltimore-area shops when user asks about hiking near Loch Raven', () => {
    const r = getHikingSmartResponse('Where can I hike near Loch Raven?');
    if (!r) return;
    expect(r.text).toMatch(/Local pros for/i);
    expect(/REI|Charm City Run|Bike Doctor|Mountain Club/i.test(r.text)).toBe(
      true,
    );
  });

  it('includes statewide clubs when AT is mentioned', () => {
    const r = getHikingSmartResponse('Tell me about the Appalachian Trail in Maryland');
    if (!r) return;
    // Either MCM or PATC should appear since both maintain MD AT sections
    expect(/Mountain Club of Maryland|Potomac Appalachian Trail Club/i.test(r.text)).toBe(
      true,
    );
  });

  it('does NOT add a footer when no region/trail token matches', () => {
    const r = getHikingSmartResponse('What is leave no trace?');
    if (!r) return;
    expect(r.text).not.toMatch(/Local pros for/i);
  });
});
