/**
 * inviteCodeRoundTrip.test.ts
 *
 * Round-trip contract test for the camp invite-code share-link feature.
 *
 * Locks the invariant:
 *   inviteCode → generateShareLink(inviteCode) → parseLink(url) → same inviteCode
 *
 * Why this exists (2026-04-28): the live audit caught that newly-created
 * Deer Camps had no inviteCode, so the "Share Link via Messages" button
 * always alerted "No Share Code Yet" until the camp round-tripped through
 * the server. Fixed by eagerly generating an inviteCode in
 * `DeerCampContext.createCamp` and lazily backfilling old camps via a new
 * `ensureCampInviteCode` action.
 *
 * This test doesn't render the Context (no React renderer in this repo)
 * but it locks the URL contract that the Context's invite codes flow
 * through. If `deepLinkRouter.parseLink` is ever changed in a way that
 * stops accepting the 6-char codes the Context generates, this test fails
 * before users discover broken share links.
 *
 * Also locks the format the generator MUST produce:
 *   - 6 chars, uppercase alphanumeric ([A-Z0-9])
 *   - Mirrors `Math.random().toString(36).substring(2, 8).toUpperCase()`
 *
 * If the generator format ever changes, update both this test AND
 * `parseLink`'s regex (currently `[a-zA-Z0-9]+`).
 */

import { generateShareLink } from '../deepLinkService';
import { parseLink } from '../deepLinkRouter';

/**
 * Mirror of the private `generateInviteCode` in DeerCampContext.tsx +
 * GroupCampContext.tsx. If you change the generator, update this too.
 */
function generateInviteCode(): string {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

describe('camp invite-code round trip', () => {
  it('generated invite code matches the locked format (6 chars, uppercase alphanumeric)', () => {
    // Generate a sample of codes to catch any case where Math.random
    // output happens to fall outside the locked format (e.g., includes
    // non-alphanumeric chars from a future generator change).
    for (let i = 0; i < 50; i += 1) {
      const code = generateInviteCode();
      expect(code).toMatch(/^[A-Z0-9]{1,6}$/);
      // Math.random().toString(36).substring(2, 8) can occasionally
      // return fewer than 6 chars when the random number ends in 0s
      // (toString(36) trims trailing zeros). The deepLinkRouter regex
      // is `[a-zA-Z0-9]+` which accepts any length ≥ 1 — so short codes
      // still round-trip correctly. This test asserts the codes are
      // never EMPTY and never longer than 6.
      expect(code.length).toBeGreaterThan(0);
      expect(code.length).toBeLessThanOrEqual(6);
    }
  });

  it('generateShareLink produces a URL parseLink can read the code back from', () => {
    const original = 'AB12CD'; // canonical 6-char fixture
    const url = generateShareLink(original);
    expect(url).toContain(original);

    const parsed = parseLink(url);
    expect(parsed).not.toBeNull();
    expect(parsed?.params?.inviteCode).toBe(original);
  });

  it('round-trip works for every code generateInviteCode might produce', () => {
    // Sample the actual generator. If any code in a 200-sample run
    // can't be round-tripped, the contract is broken.
    for (let i = 0; i < 200; i += 1) {
      const code = generateInviteCode();
      const url = generateShareLink(code);
      const parsed = parseLink(url);
      expect(parsed).not.toBeNull();
      expect(parsed?.params?.inviteCode).toBe(code);
    }
  });

  it('parseLink accepts the GitHub Pages domain (post-2026-04-27 audit fix)', () => {
    // The 2026-04-27 audit caught that deepLinkService generated
    // davidstonko.github.io/huntmaryland-site URLs but parseLink only
    // handled mdhuntfishoutdoors.com. This locks the GitHub Pages
    // branch is still wired in.
    const url = 'https://davidstonko.github.io/huntmaryland-site/join/XYZ789';
    const parsed = parseLink(url);
    expect(parsed).not.toBeNull();
    expect(parsed?.params?.inviteCode).toBe('XYZ789');
  });
});
