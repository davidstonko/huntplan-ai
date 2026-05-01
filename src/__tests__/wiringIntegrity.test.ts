/**
 * wiringIntegrity.test.ts
 *
 * Static-introspection tests that verify code is REACHABLE FROM THE UI,
 * not just type-correct or unit-tested.
 *
 * History (2026-04-28): two consecutive audit BLOCKERs slipped through
 * 108 passing test suites + tsc clean because every test exercised a
 * function in isolation while the bug lived in the wiring between
 * function and UI:
 *
 *   1. `ChatScreen.tsx` was hardwired to call Hunt's `getSmartResponse`
 *      regardless of activeMode, so Fish/Hike/Camp AI tabs all rendered
 *      Hunt content — but every per-mode `getXSmartResponse` test passed
 *      because tests called the wrappers directly.
 *
 *   2. `DeerCampContext.createCamp` did not generate `inviteCode`, so
 *      the Share Link via Messages button always alerted "No Share Code
 *      Yet" — but `shareCampInvite` and `parseLink` tests both passed
 *      because they were called with valid codes from fixtures.
 *
 * Pattern: contract tests prove a function works; they don't prove the
 * function is reachable from the UI surface that's supposed to call it.
 *
 * THIS TEST is the regression gate for that pattern. Each `it()` here
 * asserts a specific wiring fact about the codebase. They use file-
 * reading + grep instead of jest's standard import-and-call — that's
 * intentional. The point is to catch *missing* code paths, not exercise
 * present ones.
 *
 * Add a new assertion every time a wiring bug ships. The cost of one
 * line of regex is much less than one BLOCKER caught at the App Store.
 */

import * as fs from 'fs';
import * as path from 'path';

const REPO_ROOT = path.resolve(__dirname, '..', '..');
const SRC = path.join(REPO_ROOT, 'src');

function read(rel: string): string {
  return fs.readFileSync(path.join(REPO_ROOT, rel), 'utf8');
}

describe('wiring integrity — every UI surface reaches its data layer', () => {
  // ════════════════════════════════════════════════════════════════════
  // Chat-knowledge wiring (BLOCKER #1 from 2026-04-28)
  // For each mode that has a chat-knowledge file, three things must
  // line up: (1) ChatScreen imports the per-mode responder, (2)
  // ChatScreen dispatches on activeMode, (3) AppNavigator mounts an AI
  // tab for that mode.
  // ════════════════════════════════════════════════════════════════════
  describe('ChatScreen → mode-aware chat-knowledge dispatch', () => {
    const chat = read('src/screens/ChatScreen.tsx');
    const nav = read('src/navigation/AppNavigator.tsx');

    const modes: Array<{
      mode: string;
      responder: string;
      knowledgeFile: string;
      tabsFn: string;
    }> = [
      { mode: 'hunt', responder: 'getSmartResponse', knowledgeFile: 'chatKnowledge', tabsFn: 'HuntTabs' },
      { mode: 'fish', responder: 'getFishingSmartResponse', knowledgeFile: 'fishingChatKnowledge', tabsFn: 'FishTabs' },
      { mode: 'camp', responder: 'getCampingSmartResponse', knowledgeFile: 'campingChatKnowledge', tabsFn: 'CampTabs' },
      { mode: 'hike', responder: 'getHikingSmartResponse', knowledgeFile: 'hikingChatKnowledge', tabsFn: 'HikeTabs' },
    ];

    for (const { mode, responder, knowledgeFile, tabsFn } of modes) {
      it(`${mode}: ChatScreen imports ${responder} from data/${knowledgeFile}`, () => {
        const importPattern = new RegExp(
          `import\\s*\\{[^}]*\\b${responder}\\b[^}]*\\}\\s*from\\s*['"][^'"]*${knowledgeFile}['"]`,
        );
        expect(chat).toMatch(importPattern);
      });

      it(`${mode}: ChatScreen dispatches to ${responder} (or it's the default fallthrough)`, () => {
        // Either explicit `=== 'mode'` branch, switch case, or — for
        // Hunt specifically — being the fallthrough else of the
        // dispatch chain (since Hunt's getSmartResponse is the
        // catch-all default).
        const dispatched =
          chat.includes(`activeMode === '${mode}'`) ||
          chat.includes(`case '${mode}'`) ||
          // Fallthrough else: e.g. `: getSmartResponse(query);`
          new RegExp(`:\\s*${responder}\\(`).test(chat);
        expect(dispatched).toBe(true);
      });

      it(`${mode}: AppNavigator's ${tabsFn} mounts an AI tab (component={AIStack})`, () => {
        // Find the function body for this Tabs function and assert
        // AIStack is mounted somewhere inside it.
        const fnStart = nav.indexOf(`function ${tabsFn}(`);
        expect(fnStart).toBeGreaterThan(-1);
        // Walk forward to the matching `}` of the function. Cheap
        // approximation: find the next top-level `function ` after
        // fnStart and clip there.
        const nextFn = nav.indexOf('\nfunction ', fnStart + 1);
        const slice = nav.slice(fnStart, nextFn === -1 ? undefined : nextFn);
        expect(slice).toMatch(/component=\{AIStack\}/);
      });
    }
  });

  // ════════════════════════════════════════════════════════════════════
  // gearAskAi CTA route names per mode
  // 2026-04-29: each mode's map detail card has a "What we use here" CTA
  // that navigates to the mode's AI tab. The tab names DIFFER per mode:
  //   - Hunt MapScreen.tsx → 'ChatTab' (HuntTabs has it as ChatTab)
  //   - Fish FishMapScreen.tsx → 'FishAITab'
  //   - Camp CampMapScreen.tsx → 'CampAITab'
  //   - Hike HikeMapScreen.tsx → 'HikeAITab'
  // Final adversarial audit caught this — Fish + Hike were both routing
  // to 'ChatTab' which only exists in HuntTabs. Result: silent no-op
  // in those modes. This test locks the correct routing.
  // ════════════════════════════════════════════════════════════════════
  describe('gearAskAi CTA navigates to the correct mode-specific AI tab', () => {
    const expectations = [
      { file: 'src/screens/MapScreen.tsx', expected: "navigation.navigate('ChatTab'", mode: 'hunt' },
      { file: 'src/screens/FishMapScreen.tsx', expected: "navigation.navigate('FishAITab'", mode: 'fish' },
      { file: 'src/screens/CampMapScreen.tsx', expected: "navigation.navigate('CampAITab'", mode: 'camp' },
      { file: 'src/screens/HikeMapScreen.tsx', expected: "navigation.navigate('HikeAITab'", mode: 'hike' },
    ];
    for (const { file, expected, mode } of expectations) {
      it(`${mode}: ${file} navigates to the correct AI tab`, () => {
        const src = read(file);
        // Find the gear-CTA block (look for "What we use here" emoji marker)
        if (!src.includes('What we use here')) {
          // CTA not present yet — skip without failing (some mode files
          // may not have a hotspot/detail panel)
          return;
        }
        // The expected navigate call must appear in the file
        expect(src).toContain(expected);
      });
    }
  });

  // ════════════════════════════════════════════════════════════════════
  // CHAT_MODE_CONFIG banner-route consistency
  // 2026-04-28 (audit-of-audit): every banner.route in CHAT_MODE_CONFIG
  // must correspond to a Stack.Screen registered in AIStack. Otherwise
  // the user taps the banner and the navigation is a silent no-op.
  // Caught by adversarial reviewer agent — would have shipped silently
  // if Camp/Hike banner routes pointed at unregistered names.
  // ════════════════════════════════════════════════════════════════════
  describe('CHAT_MODE_CONFIG banner routes are registered in AIStack', () => {
    const chat = read('src/screens/ChatScreen.tsx');
    const nav = read('src/navigation/AppNavigator.tsx');

    // Pull every `route: 'XXX'` literal that appears inside a banner
    // declaration in CHAT_MODE_CONFIG.
    const routeMatches = [
      ...chat.matchAll(/banner:\s*\{[^}]*route:\s*['"](\w+)['"]/g),
    ].map((m) => m[1]);

    // Pull AIStack body (between `function AIStack(` and the next top-level function)
    const aiStackStart = nav.indexOf('function AIStack(');
    const aiStackEnd = nav.indexOf('\nfunction ', aiStackStart + 1);
    const aiStackBody = aiStackStart === -1
      ? ''
      : nav.slice(aiStackStart, aiStackEnd === -1 ? undefined : aiStackEnd);

    it('AIStack function exists and contains Stack.Screen entries', () => {
      expect(aiStackStart).toBeGreaterThan(-1);
      expect(aiStackBody).toContain('Stack.Screen');
    });

    it('extracted at least one banner route from CHAT_MODE_CONFIG', () => {
      // Sanity: if zero, our regex is broken and the rest of the suite is moot.
      expect(routeMatches.length).toBeGreaterThan(0);
    });

    for (const route of routeMatches) {
      it(`AIStack registers a Stack.Screen named "${route}" (banner CTA target)`, () => {
        expect(aiStackBody).toMatch(new RegExp(`name=['"]${route}['"]`));
      });
    }
  });

  // ════════════════════════════════════════════════════════════════════
  // Augmentation-wrapper wiring (orphan pattern from rounds 5/6/7/8)
  // Each chat-knowledge file with an `augmentXLocalPros` wrapper must
  // call that wrapper from the public entry-point function in the same
  // file — not just export it. The 2026-04-28 BLOCKER hid here:
  // wrappers were renamed-and-rewrapped but the entry point was the
  // raw function, so the wrapper was orphaned.
  // ════════════════════════════════════════════════════════════════════
  describe('augmentXLocalPros wrappers are invoked from entry point', () => {
    // Note: Hunt's wrapper is named `augmentWithHuntLocalPros` (not
    // `augmentWithLocalPros` like fishing) — the Fish file owns the
    // un-prefixed name because it shipped first.
    const augmenters = [
      { file: 'src/data/fishingChatKnowledge.ts', wrapper: 'augmentWithLocalPros', entry: 'getFishingSmartResponse' },
      { file: 'src/data/chatKnowledge.ts', wrapper: 'augmentWithHuntLocalPros', entry: 'getSmartResponse' },
      { file: 'src/data/hikingChatKnowledge.ts', wrapper: 'augmentHikeWithLocalPros', entry: 'getHikingSmartResponse' },
      { file: 'src/data/campingChatKnowledge.ts', wrapper: 'augmentCampWithLocalPros', entry: 'getCampingSmartResponse' },
      // 2026-04-29: gear-suggestion monetization wrappers (parallel
      // pattern, different category — Amazon affiliate links instead
      // of guide referrals). Each chat-knowledge file's entry point
      // must call its augmentXGearSuggestions wrapper, otherwise the
      // monetization path orphans silently (the same kind of BLOCKER
      // that the original BLOCKER #1 was — chat wrappers shipping
      // disconnected from the UI surface).
      { file: 'src/data/fishingChatKnowledge.ts', wrapper: 'augmentWithGearSuggestions', entry: 'getFishingSmartResponse' },
      { file: 'src/data/chatKnowledge.ts', wrapper: 'augmentWithHuntGearSuggestions', entry: 'getSmartResponse' },
      { file: 'src/data/hikingChatKnowledge.ts', wrapper: 'augmentHikeWithGearSuggestions', entry: 'getHikingSmartResponse' },
      { file: 'src/data/campingChatKnowledge.ts', wrapper: 'augmentCampWithGearSuggestions', entry: 'getCampingSmartResponse' },
    ];

    for (const { file, wrapper, entry } of augmenters) {
      it(`${file}: ${entry} calls ${wrapper}`, () => {
        const src = read(file);
        // Wrapper must be defined in the same file
        expect(src).toMatch(new RegExp(`function\\s+${wrapper}\\b`));
        // Find the entry function body. Look for `export function entry` or
        // `export const entry =`. Walk forward, assert wrapper(...)
        // appears before the next top-level `export function` or EOF.
        const entryStart = src.search(
          new RegExp(`export\\s+(async\\s+)?function\\s+${entry}\\b`),
        );
        expect(entryStart).toBeGreaterThan(-1);
        const nextExport = src.indexOf('\nexport ', entryStart + 1);
        const slice = src.slice(entryStart, nextExport === -1 ? undefined : nextExport);
        expect(slice).toMatch(new RegExp(`\\b${wrapper}\\s*\\(`));
      });
    }
  });

  // ════════════════════════════════════════════════════════════════════
  // Deer Camp invite-code wiring (BLOCKER #2 from 2026-04-28)
  // createCamp must populate inviteCode at create time so the Share
  // Link button works on the very first tap. Old camps that lack one
  // must have a path to lazily generate via ensureCampInviteCode.
  // ════════════════════════════════════════════════════════════════════
  describe('DeerCamp invite-code wiring', () => {
    const ctx = read('src/context/DeerCampContext.tsx');

    it('createCamp populates inviteCode at create time', () => {
      const start = ctx.indexOf('const createCamp = useCallback');
      expect(start).toBeGreaterThan(-1);
      const end = ctx.indexOf('  );', start);
      const slice = ctx.slice(start, end);
      expect(slice).toMatch(/inviteCode\s*:\s*generateInviteCode\(\)/);
    });

    it('ensureCampInviteCode is exposed on the context type', () => {
      expect(ctx).toMatch(/ensureCampInviteCode\s*:\s*\(campId:\s*string\)\s*=>\s*string\s*\|\s*null/);
    });

    it('ensureCampInviteCode is included in the provider value', () => {
      // Find the Provider value block and assert ensureCampInviteCode is in it
      const valueStart = ctx.indexOf('value={{');
      expect(valueStart).toBeGreaterThan(-1);
      const valueEnd = ctx.indexOf('}}', valueStart);
      const valueSlice = ctx.slice(valueStart, valueEnd);
      expect(valueSlice).toMatch(/\bensureCampInviteCode\b/);
    });

    const consumers = [
      'src/screens/DeerCampScreen.tsx',
      'src/screens/HoneyHoleScreen.tsx',
    ];
    for (const file of consumers) {
      it(`${file}: every shareCampInvite call site uses ensureCampInviteCode for fallback`, () => {
        const src = read(file);
        if (!src.includes('shareCampInvite')) return; // not a consumer
        // Either the file destructures ensureCampInviteCode from the context...
        const usesEnsure = /ensureCampInviteCode/.test(src);
        expect(usesEnsure).toBe(true);
        // ...AND the old "No Share Code Yet" Alert text is gone (or the
        // path that hit it is gated by ensureCampInviteCode falling
        // through to null).
        const oldAlertText = "before share links existed";
        expect(src).not.toContain(oldAlertText);
      });
    }
  });

  // ════════════════════════════════════════════════════════════════════
  // Universal Link domain consistency (D from adversarial audit)
  // Every URL-generation site must use a domain that's parseable by
  // deepLinkRouter.parseLink AND served from a domain whose AASA file
  // we actually own.
  // ════════════════════════════════════════════════════════════════════
  describe('Universal Link domains are consistent', () => {
    const router = read('src/services/deepLinkRouter.ts');

    // The OWNED domain (we serve AASA from this GitHub Pages site)
    const OWNED_DOMAIN = 'davidstonko.github.io/huntmaryland-site';

    it('deepLinkRouter parses the owned GitHub Pages domain', () => {
      expect(router).toContain(OWNED_DOMAIN);
    });

    const linkGenSites = [
      { file: 'src/services/deepLinkService.ts', desc: 'main shareCampInvite path (Deer Camp Share Link via Messages)' },
      { file: 'src/components/deercamp/CampInviteLinkModal.tsx', desc: 'LINK button at top of Deer Camp detail header' },
      { file: 'src/screens/GroupCampScreen.tsx', desc: 'Group Camp share path' },
      // 2026-04-28: also verify the URL PARSER doesn't claim unowned
      // domains. Caught by the audit-of-audit's adversarial agent —
      // deepLinkRouter previously parsed mdhuntfishoutdoors.com URLs
      // even though the share-link generators stopped using that
      // domain. Removed that branch, but locking it here.
      { file: 'src/services/deepLinkRouter.ts', desc: 'URL parser — must only claim domains we own' },
    ];

    for (const { file, desc } of linkGenSites) {
      it(`${file}: ${desc} — uses owned domain in active code (comments OK)`, () => {
        if (!fs.existsSync(path.join(REPO_ROOT, file))) return;
        const raw = read(file);
        // Strip comments before extracting URLs — historical / docstring
        // references to unregistered domains are documentation, not code
        // that ships URLs to users. The test catches *active code* that
        // generates URLs at the wrong domain.
        const codeOnly = raw
          .replace(/\/\*[\s\S]*?\*\//g, '') // block comments + JSDoc
          .replace(/^\s*\*.*$/gm, '')        // continued block-comment lines
          .replace(/\/\/.*$/gm, '');          // line comments
        const urlBases = (codeOnly.match(/https:\/\/[a-zA-Z0-9.\-/]+/g) || []).filter(
          (u) => !u.includes('weather.gov') && !u.includes('api.tidesandcurrents') && !u.includes('amzn.to') && !u.includes('amazon.com'),
        );
        const usesUnregisteredDomain = urlBases.some(
          (u) => u.includes('mdhuntfishoutdoors.com'),
        );
        expect({ file, urlBases, usesUnregisteredDomain }).toEqual({
          file,
          urlBases: expect.anything(),
          usesUnregisteredDomain: false,
        });
      });
    }
  });

  // ════════════════════════════════════════════════════════════════════
  // App.tsx boot wiring
  // Every service named like an init/boot service must actually be
  // imported AND called from App.tsx — not just exported into the void.
  // ════════════════════════════════════════════════════════════════════
  describe('App.tsx boots its declared services', () => {
    const app = read('src/App.tsx');

    const bootServices = [
      { name: 'initSentry', file: 'sentryClient' },
      { name: 'initMapboxToken', file: 'mapboxTokenService' },
      { name: 'initAuth', file: 'authService' },
    ];

    for (const { name, file } of bootServices) {
      it(`App.tsx imports ${name} from ${file}`, () => {
        expect(app).toMatch(
          new RegExp(`import\\s*\\{[^}]*\\b${name}\\b[^}]*\\}\\s*from\\s*['"][^'"]*${file}['"]`),
        );
      });

      it(`App.tsx calls ${name}() somewhere in the boot path`, () => {
        // Allow `await initX()`, `initX()`, `initX().catch(...)` patterns
        expect(app).toMatch(new RegExp(`\\b${name}\\s*\\(`));
      });
    }
  });

  // ════════════════════════════════════════════════════════════════════
  // Provider tree wiring
  // Every Context Provider exported by `src/context/*` must be wrapped
  // around the app in App.tsx (otherwise consumers throw "outside
  // Provider" at runtime, but tsc is happy).
  // ════════════════════════════════════════════════════════════════════
  describe('Every Provider with a CONSUMED hook wraps the app in App.tsx', () => {
    const app = read('src/App.tsx');
    const ctxDir = path.join(SRC, 'context');
    const providerFiles = fs
      .readdirSync(ctxDir)
      .filter((f) => f.endsWith('Context.tsx') && !f.startsWith('__'));

    // Files we treat as "doesn't count as a real consumer" — orphan
    // screens that aren't in the navigator. Mirrors ALLOW_UNWIRED in
    // the screen-registration test above. If the ONLY caller of a
    // hook is an allow-listed orphan screen, then mounting the
    // Provider is also optional.
    const ORPHAN_SCREENS: Set<string> = new Set([
      'CatchLogScreen.tsx',
      'CampComingSoonScreen.tsx',
      'ComingSoonScreen.tsx',
      'DonateScreen.tsx',
      'FishCampScreen.tsx',
      'HoneyHoleScreen.tsx',
    ]);

    // Walk all .tsx/.ts files outside context/ and __tests__/, build a
    // set of all `useX` hook names that are CALLED somewhere — but
    // only count calls in NON-orphan files.
    function collectHookConsumers(): Set<string> {
      const hits = new Set<string>();
      function walk(dir: string) {
        for (const f of fs.readdirSync(dir)) {
          const full = path.join(dir, f);
          const stat = fs.statSync(full);
          if (stat.isDirectory()) {
            if (f === '__tests__' || f === 'context') continue;
            walk(full);
          } else if (f.endsWith('.tsx') || f.endsWith('.ts')) {
            if (ORPHAN_SCREENS.has(f)) continue;
            const src = fs.readFileSync(full, 'utf8');
            // Match `useFoo()` style calls
            for (const m of src.matchAll(/\b(use[A-Z]\w+)\s*\(/g)) {
              hits.add(m[1]);
            }
          }
        }
      }
      walk(SRC);
      return hits;
    }
    const consumedHooks = collectHookConsumers();

    for (const f of providerFiles) {
      const src = read(`src/context/${f}`);
      const providers = [
        ...src.matchAll(/export\s+(const|function)\s+(\w+Provider)\b/g),
      ].map((m) => m[2]);
      const hooks = [
        ...src.matchAll(/export\s+(?:const|function)\s+(use\w+)\b/g),
      ].map((m) => m[1]);

      for (const p of providers) {
        // Only enforce mount if at least one of this Context's
        // hooks is actually consumed by a screen/component. If
        // nobody calls useX, the Provider is vestigial / staged
        // for V2.4 work and not mounting it is intentional.
        const hookConsumed = hooks.some((h) => consumedHooks.has(h));
        if (!hookConsumed) {
          it.skip(`App.tsx mounts <${p}> [skipped: no consumer of its hook(s) — Provider is vestigial]`, () => {});
          continue;
        }
        it(`App.tsx mounts <${p}> (consumed via ${hooks.filter((h) => consumedHooks.has(h)).join(', ')})`, () => {
          expect(app).toMatch(new RegExp(`<\\s*${p}[\\s>]`));
        });
      }
    }
  });

  // ════════════════════════════════════════════════════════════════════
  // Orphan screens — every screen in src/screens/ should be reachable
  // through the navigator (or explicitly allow-listed).
  // ════════════════════════════════════════════════════════════════════
  describe('Every screen is registered in AppNavigator (or explicitly allow-listed)', () => {
    const screensDir = path.join(SRC, 'screens');
    const screenFiles = fs
      .readdirSync(screensDir)
      .filter((f) => f.endsWith('Screen.tsx'));

    // Allow-list: screens that are intentionally not yet wired into
    // the navigator — staged for a future release or deliberately
    // standalone. Each entry should have a reason. Remove from
    // allow-list when the screen ships.
    const ALLOW_UNWIRED: Set<string> = new Set([
      'CatchLogScreen.tsx',         // V2.4 — fishing personal stats; CatchLogProvider also unmounted until we wire it
      'CampComingSoonScreen.tsx',   // Placeholder for future Camp features
      'ComingSoonScreen.tsx',       // Generic placeholder
      'DonateScreen.tsx',           // Standalone post-V2.3 monetization screen
      'FishCampScreen.tsx',         // Fishing equivalent of DeerCamp; reserved for V2.4
      'HoneyHoleScreen.tsx',        // Used as a child route within Spots stack — see HoneyHole picker flow
      // 2026-04-28 audit findings — orphan screens with no nav route AND
      // no runtime navigation.navigate() call. All staged for V2.4+:
      'CampOutOfStateScreen.tsx',   // V2.4 — non-resident camping visitor guide; not wired into CampResources nav
      'FishOutOfStateScreen.tsx',   // V2.4 — non-resident fishing visitor guide; not wired into FishResources nav
      'HikeOutOfStateScreen.tsx',   // V2.4 — non-resident hiking visitor guide; not wired into HikeResources nav
      'OutOfStateScreen.tsx',       // V2.4 — generic visitor screen, may be deletable (superseded by per-mode versions)
      'PlanScreen.tsx',             // Possibly superseded by HuntPlanScreen — investigate + delete or revive
      'ProfileScreen.tsx',          // V3+ — user profiles need backend auth not yet shipped
      'SocialScreen.tsx',           // V3+ — community features
      'StatePackScreen.tsx',        // Phase 6 — multi-state expansion (VA/PA packs)
      'SubscriptionScreen.tsx',     // Phase 5C — RevenueCat tier mgmt; deferred until paid tiers go live
    ]);

    // Build a corpus of every file under src/navigation + src/screens
    // and search for the screen name across all of them. This catches
    // screens registered via nested Stack navigators (e.g. ResourcesHub
    // owns FishRegulations + FishResources via its own Stack).
    function buildCorpus(): string {
      const buf: string[] = [];
      function walk(dir: string) {
        for (const f of fs.readdirSync(dir)) {
          const full = path.join(dir, f);
          const stat = fs.statSync(full);
          if (stat.isDirectory()) {
            if (f === '__tests__') continue;
            walk(full);
          } else if (f.endsWith('.tsx') || f.endsWith('.ts')) {
            buf.push(fs.readFileSync(full, 'utf8'));
          }
        }
      }
      walk(path.join(SRC, 'navigation'));
      walk(path.join(SRC, 'screens'));
      walk(path.join(SRC, 'components'));
      return buf.join('\n');
    }
    const corpus = buildCorpus();

    for (const f of screenFiles) {
      it(`${f}: reachable from a navigator (direct or nested stack)`, () => {
        if (ALLOW_UNWIRED.has(f)) return;
        const screenName = f.replace('.tsx', '');
        // Match `import ScreenName` or `component={ScreenName}` anywhere
        // in the navigation/screens/components tree.
        const referenced =
          new RegExp(`\\bcomponent=\\{\\s*${screenName}\\b`).test(corpus) ||
          new RegExp(`\\bimport\\s+${screenName}\\b`).test(corpus);
        expect({ screen: f, referenced }).toEqual({
          screen: f,
          referenced: true,
        });
      });
    }
  });

  // ════════════════════════════════════════════════════════════════════
  // AASA files (apple-app-site-association) consistency
  // Every AASA file checked into the repo must use the REAL team ID
  // (BAFL96ZCUU) and the REAL bundle ID (com.davidstonko.huntmaryland) —
  // never a `TEAM_ID` placeholder. Caught a real BLOCKER 2026-04-28:
  // root + docs/ AASA files had placeholder; if deployed, Universal
  // Link recipient flow would silently fail (iOS rejects the AASA
  // handshake when it can't validate the team ID).
  // ════════════════════════════════════════════════════════════════════
  describe('AASA files use the real team ID + bundle ID', () => {
    const TEAM_ID = 'BAFL96ZCUU';
    const BUNDLE_ID = 'com.davidstonko.huntmaryland';

    // Only check the canonical AASA file locations. Walking the full
    // repo tree was too slow and would include node_modules' sample
    // AASAs from RN libraries.
    const candidatePaths = [
      'apple-app-site-association',
      'docs/apple-app-site-association',
      'docs/.well-known/apple-app-site-association',
      'website/apple-app-site-association',
      'website/.well-known/apple-app-site-association',
    ];
    const aasaFiles = candidatePaths
      .map((p) => path.join(REPO_ROOT, p))
      .filter((p) => fs.existsSync(p));

    it('at least one AASA file is checked into the repo', () => {
      expect(aasaFiles.length).toBeGreaterThan(0);
    });

    for (const f of aasaFiles) {
      const rel = path.relative(REPO_ROOT, f);
      it(`${rel}: contains the real team ID '${TEAM_ID}'`, () => {
        const src = fs.readFileSync(f, 'utf8');
        expect(src).toContain(TEAM_ID);
        expect(src).not.toContain('TEAM_ID.');
        expect(src).toContain(BUNDLE_ID);
      });

      it(`${rel}: parses as valid JSON`, () => {
        const src = fs.readFileSync(f, 'utf8');
        expect(() => JSON.parse(src)).not.toThrow();
      });

      it(`${rel}: declares the GitHub Pages join path that deepLinkRouter parses`, () => {
        const src = fs.readFileSync(f, 'utf8');
        const json = JSON.parse(src);
        const detail = json.applinks?.details?.[0];
        expect(detail).toBeDefined();
        // Either old-style `paths` or new-style `components` — at least
        // one should reference the /huntmaryland-site/join/ or /join/
        // path that the app generates.
        const matchesJoinPath = (s: string) => /\/(?:huntmaryland-site\/)?join\//.test(s);
        const allPaths = [
          ...(detail.paths ?? []),
          ...(detail.components ?? []).map((c: any) => c['/'] ?? ''),
        ];
        expect(allPaths.some(matchesJoinPath)).toBe(true);
      });
    }
  });

  // ════════════════════════════════════════════════════════════════════
  // Local-services data parity per mode
  // Every mode's primary surface should expose local-services data in
  // some way (Pros pin layer on the map, Local Pros section on a
  // detail card, etc.) for the "find a guide" feature to work.
  // ════════════════════════════════════════════════════════════════════
  describe('Local-services data is reachable from each mode', () => {
    const localServicesImporters = (() => {
      // Find every file in src/screens/ or src/components/ that imports
      // anything from marylandLocalServices
      const out: string[] = [];
      function walk(dir: string) {
        for (const f of fs.readdirSync(dir)) {
          const full = path.join(dir, f);
          const stat = fs.statSync(full);
          if (stat.isDirectory()) {
            walk(full);
          } else if (f.endsWith('.tsx') || f.endsWith('.ts')) {
            const src = fs.readFileSync(full, 'utf8');
            if (/from\s*['"][^'"]*marylandLocalServices['"]/.test(src)) {
              out.push(path.relative(REPO_ROOT, full));
            }
          }
        }
      }
      walk(path.join(SRC, 'screens'));
      walk(path.join(SRC, 'components'));
      walk(path.join(SRC, 'data'));
      return out;
    })();

    it('marylandLocalServices is consumed somewhere', () => {
      expect(localServicesImporters.length).toBeGreaterThan(0);
    });

    // Per-mode coverage:
    const modeMapScreens = [
      { mode: 'hunt', screen: 'src/screens/MapScreen.tsx' },
      { mode: 'fish', screen: 'src/screens/FishMapScreen.tsx' },
      { mode: 'camp', screen: 'src/screens/CampMapScreen.tsx' },
      { mode: 'hike', screen: 'src/screens/HikeMapScreen.tsx' },
    ];

    for (const { mode, screen } of modeMapScreens) {
      it(`${mode}: ${screen} either imports local services OR another screen in this mode does`, () => {
        if (!fs.existsSync(path.join(REPO_ROOT, screen))) return; // skip if file missing
        const src = read(screen);
        const directlyImports = /from\s*['"][^'"]*marylandLocalServices['"]/.test(src) ||
          /from\s*['"][^'"]*\/data\/marylandLocalServices['"]/.test(src);
        // Acceptable: chat-knowledge for the mode also pulls from local services
        const chatKnowledgeFiles: Record<string, string> = {
          hunt: 'src/data/chatKnowledge.ts',
          fish: 'src/data/fishingChatKnowledge.ts',
          camp: 'src/data/campingChatKnowledge.ts',
          hike: 'src/data/hikingChatKnowledge.ts',
        };
        const ck = read(chatKnowledgeFiles[mode]);
        const chatPullsLocalServices = /from\s*['"][^'"]*marylandLocalServices['"]/.test(ck) ||
          /servicesForRegion|servicesForWater|servicesForSpecies/.test(ck);
        expect(directlyImports || chatPullsLocalServices).toBe(true);
      });
    }
  });

  // ════════════════════════════════════════════════════════════════════
  // ContactFab cross-mode parity (V2.4 audit — 2026-05-01)
  // The user's contact pill landed on Hunt's Info tab in the V2.4 UI
  // refactor. The cross-module audit caught that Fish/Camp/Hike Info
  // tabs had no contact mechanism — partner outreach + bug reports
  // could only be initiated from Hunt mode. ContactFab was extracted
  // to a shared component; this test locks the invariant that all
  // four Resources screens render it.
  //
  // It also catches a subtle related bug: someone could remove the
  // import without removing the usage and tsc would still pass (tsc
  // doesn't error on unused JSX names — only React's runtime would).
  // ════════════════════════════════════════════════════════════════════
  describe('ContactFab cross-mode parity', () => {
    // Hunt + Fish share ResourcesHubScreen via mode-aware render — one
    // ContactFab mount at the parent covers both. Camp + Hike use
    // dedicated Resources screens so they each mount their own.
    const screens = [
      { mode: 'hunt+fish', file: 'src/screens/ResourcesHubScreen.tsx' },
      { mode: 'camp', file: 'src/screens/CampResourcesScreen.tsx' },
      { mode: 'hike', file: 'src/screens/HikeResourcesScreen.tsx' },
    ];

    for (const { mode, file } of screens) {
      it(`${mode}: ${file} imports ContactFab`, () => {
        const src = read(file);
        expect(/from\s*['"][^'"]*\/components\/common\/ContactFab['"]/.test(src)).toBe(true);
      });

      it(`${mode}: ${file} renders <ContactFab`, () => {
        const src = read(file);
        expect(/<ContactFab\b/.test(src)).toBe(true);
      });
    }

    it('FishResourcesScreen does NOT mount its own ContactFab', () => {
      // Negative assertion: the parent ResourcesHubScreen handles the
      // ContactFab for Fish via activeMode-based render. A second mount
      // here would stack two FABs in the bottom-right corner.
      const src = read('src/screens/FishResourcesScreen.tsx');
      expect(/<ContactFab\b/.test(src)).toBe(false);
    });

    it('ContactFab uses the shared feedback inbox, not personal email', () => {
      const src = read('src/components/common/ContactFab.tsx');
      expect(src).toContain('feedback.mdhuntfishoutdoors@gmail.com');
      expect(src).not.toContain('dstonko1@gmail.com');
    });
  });

  // ════════════════════════════════════════════════════════════════════
  // OnboardingTourGate cross-mode parity (V2.4 audit — 2026-05-01)
  //
  // Phase A.26 added a "Take the tour again" replay row so users could
  // re-trigger the onboarding tour from the Info tab.
  //
  // Architecture quirk: ResourcesHubScreen serves BOTH Hunt and Fish
  // modes (via activeMode-based conditional render of FishRegulations
  // / FishResources). So the tour gate at the parent level covers Hunt
  // AND Fish in a single mount. Camp + Hike use dedicated screens
  // (CampResourcesScreen / HikeResourcesScreen) and need their own
  // gate mount.
  //
  // A previous audit pass briefly added a duplicate tour gate to
  // FishResourcesScreen — that's wrong because the parent already
  // handles it. The contract below reflects the correct architecture:
  // Hunt/Fish covered by ResourcesHubScreen; Camp/Hike each covered
  // by their own screen.
  // ════════════════════════════════════════════════════════════════════
  describe('OnboardingTourGate cross-mode parity', () => {
    const screens = [
      // Hunt + Fish share ResourcesHubScreen via mode-aware render.
      { mode: 'hunt+fish', file: 'src/screens/ResourcesHubScreen.tsx' },
      { mode: 'camp', file: 'src/screens/CampResourcesScreen.tsx' },
      { mode: 'hike', file: 'src/screens/HikeResourcesScreen.tsx' },
    ];

    for (const { mode, file } of screens) {
      it(`${mode}: ${file} imports OnboardingTourGate`, () => {
        const src = read(file);
        expect(/from\s*['"][^'"]*\/OnboardingTourGate['"]/.test(src)).toBe(true);
      });

      it(`${mode}: ${file} renders <OnboardingTourGate`, () => {
        const src = read(file);
        expect(/<OnboardingTourGate\b/.test(src)).toBe(true);
      });
    }

    it('FishResourcesScreen does NOT mount its own OnboardingTourGate', () => {
      // Negative assertion: the parent ResourcesHubScreen handles the
      // tour gate for Fish via activeMode-based render. A second mount
      // here would create a visible duplicate "Take the tour again" row.
      const src = read('src/screens/FishResourcesScreen.tsx');
      expect(/<OnboardingTourGate\b/.test(src)).toBe(false);
    });
  });

  // ════════════════════════════════════════════════════════════════════
  // Camp-invite URL format (V2.4 audit — 2026-05-01, fourth pass)
  //
  // History: this exact bug pattern has been caught THREE times now —
  //   - DeerCamp (pre-April 2026) — fixed
  //   - GroupCamp (today, second-pass audit) — fixed in 6518a2b1
  //   - FishCamp (today, iteration-2 audit) — fixed in this commit
  //
  // The bug: a screen builds the share-link URL with a query string
  // (`?code=ABCDEF` or `?camp=ABCDEF`) instead of a path segment
  // (`/ABCDEF`). The AASA pattern is `/huntmaryland-site/join/*`
  // (path-only) and deepLinkRouter regex matches the path. Query
  // strings are stripped before matching, so the share link silently
  // fails to deep-link into the app.
  //
  // This contract sweeps every screen that builds a join URL and
  // asserts it uses path format. Any future query-string regression
  // fails this test instead of shipping.
  // ════════════════════════════════════════════════════════════════════
  describe('Camp-invite URL format (no query strings)', () => {
    const screens = [
      'src/screens/DeerCampScreen.tsx',
      'src/screens/FishCampScreen.tsx',
      'src/screens/GroupCampScreen.tsx',
      'src/screens/HoneyHoleScreen.tsx',
      'src/screens/CampTripPlannerScreen.tsx',
    ];

    for (const file of screens) {
      it(`${file} builds invite URL with path style, not query string`, () => {
        const src = read(file);
        // Look for `huntmaryland-site/(join|trip)?...` — that's a
        // query-string url and is broken.
        const hasQueryStringJoin =
          /huntmaryland-site\/join\?/.test(src) ||
          /huntmaryland-site\/trip\?/.test(src);
        expect(hasQueryStringJoin).toBe(false);
      });
    }

    it('GroupCampContext builds path-style URL, not ?camp= query string', () => {
      const src = read('src/context/GroupCampContext.tsx');
      // Strip line comments so the historical-context comments that
      // mention the old buggy form don't trip the regex. We're only
      // looking for live code that constructs a query-string URL.
      const stripped = src
        .split('\n')
        .filter((line) => !line.trimStart().startsWith('//'))
        .join('\n');
      expect(/huntmaryland-site\/join\?/.test(stripped)).toBe(false);
      expect(/\?camp=\$\{/.test(stripped)).toBe(false);
    });
  });

  // ════════════════════════════════════════════════════════════════════
  // Context-provider mount integrity (V2.4 audit — 2026-05-01, iter 4)
  //
  // Every Context exported from src/context/ that has a `*Provider` is
  // expected to be mounted in App.tsx's provider tree. If a provider
  // exists but isn't mounted, any screen that calls `useX()` crashes
  // with "must be used within Provider". This test enumerates the
  // expected providers and asserts each is both imported and rendered
  // in App.tsx.
  //
  // Why a wiring test: tsc allows `useGroupCamp()` to compile even if
  // GroupCampProvider isn't mounted — the runtime crash only fires on
  // first consumer. Caught GroupCampProvider missing on iter-4 audit.
  // ════════════════════════════════════════════════════════════════════
  describe('Context provider mount integrity', () => {
    const requiredProviders = [
      'ActivityModeProvider',
      'ScoutDataProvider',
      'DeerCampProvider',
      'GroupCampProvider',
      'SettingsProvider',
      'UserWaypointProvider',
      'UserMarkupProvider',
      'TrackRecorderProvider',
      'JournalEntryProvider',
      'GearChecklistProvider',
      'FavoritesProvider',
    ];

    const app = read('src/App.tsx');

    for (const provider of requiredProviders) {
      it(`${provider} is imported into App.tsx`, () => {
        expect(new RegExp(`import\\s*\\{[^}]*${provider}[^}]*\\}`).test(app)).toBe(true);
      });

      it(`${provider} wraps the tree in App.tsx`, () => {
        expect(new RegExp(`<${provider}>`).test(app)).toBe(true);
        expect(new RegExp(`</${provider}>`).test(app)).toBe(true);
      });
    }
  });
});
