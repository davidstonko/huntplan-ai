# Pre-Build Audit — 2026-04-27

Comprehensive audit run before the next App Store push. Grouped by
severity. Items marked **DONE** were fixed during this session.

## BLOCKERs (would fail App Store review or break shipped feature)

1. **Deep-link domain mismatch — DONE.** `deepLinkService` generates
   `davidstonko.github.io/huntmaryland-site/join/{code}` URLs but
   `deepLinkRouter` only parsed `mdhuntfishoutdoors.com/i/{code}`.
   Recipients of the new "Share Link via Messages" Deer Camp invite
   would have had the link silently dropped. Fix landed in
   `deepLinkRouter.ts` — added the legacy GitHub Pages format as a
   second branch. The GitHub Pages site already hosts the AASA, so
   Universal Links work cross-device immediately.

2. **DeepLinkInitializer hook scope — VERIFIED OK.** Re-read
   `App.tsx` 2026-04-27: `<DeepLinkInitializer>` is nested INSIDE all
   ten context providers (ActivityModeProvider, ScoutDataProvider,
   DeerCampProvider, SettingsProvider, UserWaypointProvider,
   UserMarkupProvider, TrackRecorderProvider, JournalEntryProvider,
   GearChecklistProvider, FavoritesProvider) and inside
   NavigationContainer. The audit's earlier flag was a false alarm.

3. **FishWaypointPicker photo capture — DONE.** Wired the existing
   `pickPhoto` helper (camera + photo library chooser via
   react-native-image-picker). Replaces the prior "coming soon"
   placeholder. Permission prompts handled inside `pickPhoto`; the
   component just receives the selected URI.

## HIGH (UX or polish issue, not submission-blocking)

4. **ZoomIcon missing color prop on 3 maps — DONE.** Hike + Camp
   maps were rendering ZoomIcon without `color={Colors.textPrimary}`,
   making the icons invisible on dark surfaces. Hunt + Fish were
   already correct. All five maps now consistent + have
   `accessibilityRole="button"` + `accessibilityLabel="Zoom in/out"`.

5. **Mapbox token rotation — DONE (backend-served).** Backend now
   exposes `GET /api/v1/config/mapbox-token` returning the token from
   the `MAPBOX_ACCESS_TOKEN` env var. Mobile fetches at boot via
   `mapboxTokenService.initMapboxToken`, caches in AsyncStorage with
   24h TTL, falls back to the hardcoded constant when offline. Token
   rotation is now an env-var bump on Render — clients pick up the
   new token within 24h on next foreground. New `test_config.py`
   covers env-var present + missing cases; new
   `mapboxTokenService.test.ts` covers cache TTL + fetch failure +
   corrupted-cache fallback (6 invariants).

6. **AsyncStorage schema-versioning gap on DeerCampContext — DONE.**
   Added `STORAGE_VERSION_KEY` + `CURRENT_SCHEMA_VERSION = 2`. Load
   path now wraps JSON.parse in try/catch (corrupted storage → fresh
   start instead of crash). If a future build downgrades the schema,
   the load path detects it and refuses to overwrite the newer data.

7. **Auth fallback silent on Sentry — DONE.** `authService.initAuth`
   and `authService.registerDevice` now call `captureException` on
   error (with `error instanceof Error ? error : new Error(...)`
   coercion for the `unknown`-typed catch). Backend-down or
   token-corruption regressions will now surface in Sentry instead
   of silently dropping users into offline mode forever.

8. **Cold-start deep-link race condition — DONE.** `deepLinkRouter.ts`
   now caches the resolved initial URL in a module-scoped
   `pendingInitialURL` ref, plus an `AppState` listener re-fires
   `handleDeepLink` on foreground if the URL didn't navigate cleanly
   the first time. The ref is cleared after a successful navigation
   so subsequent foreground transitions don't re-fire.

9. **Hunt map filter chip + Scout toolbar + DeerCamp admin a11y — DONE.**
   All 6 Hunt overlay chips (Blinds, Water, Geese, Closed, Lotto, Pros)
   have `accessibilityLabel`. Scout toolbar's 6 buttons (Plans, Pin,
   Sat/Map, Track, Measure, Crosshair) all carry role + label +
   selected-state. DeerCamp remove-member ✕ button has
   `"Remove {username} from camp"`; the +Invite Member button has
   `"Open invite member dialog"`. Hike difficulty chips already had
   labels per the round-5 audit.

## MEDIUM (cleanup, not user-visible)

10. **`__DEV__ console.log` in `DeerCampScreen.handleNameNext` — DONE
    (kept).** This only fires in dev builds (`__DEV__ = false` in
    Release). No action needed.

11. **Test skips left in `offlineMaps.test.ts`.** Two `it.skip` blocks
    document the V2.2 API removal. **Status: leave** — they're
    documentation, not stale TODOs.

12. **Inline styles on Deer Camp Share-Link button — DONE.** Moved
    the inline padding/backgroundColor/fontSize/etc. props to
    `styles.shareLinkBtn` + `styles.shareLinkBtnText` + `styles.
    shareLinkBtnEmoji` + `styles.shareLinkHelp`. Also added an
    `accessibilityRole="button"` + `accessibilityLabel` on the share
    button itself.

13. **Linking.openURL silent catch** on multiple Resources screens.
    **Status: leave** — adding banner-on-error UI is V2.4 polish.

## NIT

- Info.plist usage strings: **all present.** ✓
- Bundle ID `com.davidstonko.huntmaryland`: **correct.** ✓
- RCT_NEW_ARCH_ENABLED=0: **correct in Podfile + react-native.config.js.** ✓
- RN 0.76 autolink overrides for `react-native-fs` /
  `react-native-image-picker` / `react-native-share`: **correct.** ✓
- `tsc --noEmit`: **0 errors.** ✓
- jest: **102 suites / 2438 passed / 0 failed.** ✓

## Other

- `LogBox.ignoreLogs([...])` added to `App.tsx` to suppress Mapbox
  layer-insertion noise + benign navigation-state warnings.
- Mapbox layer-insertion error toast (task #17): **DONE.**
- CampAreaPicker callbacks off `route.params` (task #48): **DONE.**

## Post-merge tally (post-2026-04-27 work)

- 102 jest suites / 2438 tests passing
- 0 tsc errors
- 36 services in `marylandLocalServices.ts` (Phase 1 + Phase 2:
  Guntry + 11 hike/bike entries)
- 48 hotspots in `marylandFishingHotspots.ts`

## Pre-archive checklist for the actual App Store push

1. **Verify** App.tsx provider order — `DeepLinkInitializer` MUST be
   inside `ActivityModeProvider` + `SettingsProvider`. (BLOCKER #2)
2. **Verify** FishWaypointPicker photo path doesn't crash if a user
   taps the photo button. (BLOCKER #3)
3. `cd ios && rm -rf Pods && RCT_NEW_ARCH_ENABLED=0 pod install`
4. Clean DerivedData: `rm -rf ~/Library/Developer/Xcode/DerivedData/*`
5. In Xcode: bump build number to 5 (was 4 per memory).
6. Archive: Product → Archive.
7. Validate via Organizer.
8. Upload to App Store Connect.
9. After processing: smoke-test on TestFlight before submitting for
   review.
