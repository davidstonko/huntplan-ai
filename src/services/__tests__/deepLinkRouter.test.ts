/**
 * Tests for deepLinkRouter.ts
 *
 * Covers parseLink() function with custom scheme and universal links.
 *
 * V2.2.0: Only camp-invite deep links are wired to real screens. The previous
 * versions of this router referenced CampInviteScreen, HikeScreen, and
 * HuntScreen — none of which were ever implemented — so those paths now
 * return null rather than advertising broken targets.
 *
 * 2026-04-20: After the Deer Camp area-redesign, invite codes belong to the
 * Hunt-mode DeerCampTab (the shared-map social surface), not the Camp-mode
 * GroupCampTab. Router targets updated accordingly.
 */

import { parseLink } from '../deepLinkRouter';

describe('deepLinkRouter', () => {
  describe('parseLink()', () => {
    // Custom scheme: camp invite routes to the Hunt-mode DeerCampTab and asks
    // the app to switch into Hunt mode so the tab exists in the navigator.
    it('should parse mdhuntfish://camp/invite/{code}', () => {
      const result = parseLink('mdhuntfish://camp/invite/ABC123');
      expect(result).toEqual({
        screen: 'DeerCampTab',
        params: { inviteCode: 'ABC123' },
        mode: 'hunt',
        parent: 'HuntTabs',
      });
    });

    // Hike trip and hunt stand deep links were never wired to real screens
    // in V2.2.0 — return null so we don't navigate to missing targets.
    it('should return null for mdhuntfish://hike/trip/{id} (not implemented)', () => {
      const result = parseLink('mdhuntfish://hike/trip/42');
      expect(result).toBeNull();
    });

    it('should return null for mdhuntfish://hunt/stand/{id} (not implemented)', () => {
      const result = parseLink('mdhuntfish://hunt/stand/stand-001');
      expect(result).toBeNull();
    });

    // 2026-04-28 (audit-of-audit): mdhuntfishoutdoors.com is no longer
    // parsed. We never owned that domain, so iOS would never deliver
    // such a URL to the app via AASA in the first place. The branch was
    // removed from `parseLink` as defense-in-depth — if the domain is
    // ever registered by someone else, that party cannot accidentally
    // open our deer-camp join flow because we no longer claim that
    // pattern. The valid recipient domain is
    // `davidstonko.github.io/huntmaryland-site/`.
    it('should return null for https://mdhuntfishoutdoors.com/i/{code} (unowned domain — no longer parsed)', () => {
      const result = parseLink('https://mdhuntfishoutdoors.com/i/XYZ');
      expect(result).toBeNull();
    });

    it('should return null for http://mdhuntfishoutdoors.com/i/{code} (unowned domain — no longer parsed)', () => {
      const result = parseLink('http://mdhuntfishoutdoors.com/i/test123');
      expect(result).toBeNull();
    });

    // Unknown custom scheme path
    it('should return null for mdhuntfish://unknown/path', () => {
      const result = parseLink('mdhuntfish://unknown/path');
      expect(result).toBeNull();
    });

    // Unknown domain
    it('should return null for https://example.com', () => {
      const result = parseLink('https://example.com');
      expect(result).toBeNull();
    });

    // Empty string
    it('should return null for empty string', () => {
      const result = parseLink('');
      expect(result).toBeNull();
    });

    // 2026-04-28 audit-of-audit: same change reason as above — we no
    // longer parse mdhuntfishoutdoors.com at all, so a missing-code
    // variant on that domain also returns null (was already null
    // pre-fix, just for a different reason).
    it('should return null for https://mdhuntfishoutdoors.com/i/ (unowned + no code)', () => {
      const result = parseLink('https://mdhuntfishoutdoors.com/i/');
      expect(result).toBeNull();
    });

    // Partial path on custom scheme
    it('should return null for mdhuntfish://camp/invite (missing code)', () => {
      const result = parseLink('mdhuntfish://camp/invite');
      expect(result).toBeNull();
    });

    // Multi-segment ID in custom scheme — rare in practice, but supported
    // so that invite codes containing slashes don't silently fail.
    it('should handle multi-segment IDs in custom scheme', () => {
      const result = parseLink('mdhuntfish://camp/invite/nested/id/value');
      expect(result).toEqual({
        screen: 'DeerCampTab',
        params: { inviteCode: 'nested/id/value' },
        mode: 'hunt',
        parent: 'HuntTabs',
      });
    });

    // Universal link with query params on the OWNED GitHub Pages
    // domain (should still extract the code). Updated 2026-04-28 to
    // use davidstonko.github.io after dropping the mdhuntfishoutdoors
    // branch.
    it('should parse universal link with query params (GitHub Pages)', () => {
      const result = parseLink(
        'https://davidstonko.github.io/huntmaryland-site/join/ABC123?foo=bar',
      );
      expect(result).toEqual({
        screen: 'DeerCampTab',
        params: { inviteCode: 'ABC123' },
        mode: 'hunt',
        parent: 'HuntTabs',
      });
    });

    // Invalid URL should not crash
    it('should handle invalid URLs gracefully', () => {
      expect(() => parseLink('not a url at all')).not.toThrow();
      const result = parseLink('not a url at all');
      expect(result).toBeNull();
    });

    // 2026-04-27: legacy GitHub Pages format generated by deepLinkService
    // (still in use because the AASA is hosted at davidstonko.github.io).
    // Deer Camp + Honey Hole share-link invites currently use this format,
    // so the router MUST recognize it.
    it('should parse https://davidstonko.github.io/huntmaryland-site/join/{code}', () => {
      const result = parseLink(
        'https://davidstonko.github.io/huntmaryland-site/join/SHARE123',
      );
      expect(result).toEqual({
        screen: 'DeerCampTab',
        params: { inviteCode: 'SHARE123' },
        mode: 'hunt',
        parent: 'HuntTabs',
      });
    });

    it('should parse http variant of GitHub Pages share URL', () => {
      const result = parseLink(
        'http://davidstonko.github.io/huntmaryland-site/join/HTTP456',
      );
      expect(result).toEqual({
        screen: 'DeerCampTab',
        params: { inviteCode: 'HTTP456' },
        mode: 'hunt',
        parent: 'HuntTabs',
      });
    });

    it('should return null for GitHub Pages URL with no code', () => {
      const result = parseLink(
        'https://davidstonko.github.io/huntmaryland-site/join/',
      );
      expect(result).toBeNull();
    });
  });
});
