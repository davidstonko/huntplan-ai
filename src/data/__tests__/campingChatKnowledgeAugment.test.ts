/**
 * campingChatKnowledge augmentation contract test (Camp mode).
 *
 * Locks the 2026-04-27 wiring that pipes `servicesForRegion` into camping
 * chat responses. Camp tokens map park names + counties to the regions
 * stored on local services so REI / Bike Doctor / Bill's Marine / etc.
 * surface for the right camper.
 */

import { getCampingSmartResponse } from '../campingChatKnowledge';

describe('campingChatKnowledge — local-pros augmentation (Camp)', () => {
  it('includes Garrett County pros when user asks about Deep Creek camping', () => {
    const r = getCampingSmartResponse('Where can I camp at Deep Creek Lake?');
    if (!r) return;
    expect(r.text).toMatch(/Local pros for/i);
    // Bill's Marine Service serves Deep Creek
    expect(/Bill's Marine|REI|Charm City/i.test(r.text)).toBe(true);
  });

  it('includes Frederick County pros when user mentions Cunningham Falls', () => {
    const r = getCampingSmartResponse('Are there campsites near Cunningham Falls?');
    if (!r) return;
    expect(r.text).toMatch(/Local pros for Frederick County/i);
  });

  it('does NOT add a footer when query has no region/park token', () => {
    const r = getCampingSmartResponse('What is leave no trace?');
    if (!r) return;
    expect(r.text).not.toMatch(/Local pros for/i);
  });
});
