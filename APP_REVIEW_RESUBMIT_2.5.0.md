# App Review resubmission plan — 2.5.0 build 4 (2026-09-18)

## Where the submission actually stands (read from App Store Connect 2026-09-18)

Submission baa0bf0f (2.5.0 build 3, submitted Jun 29) is in **Unresolved Issues**.
Two Apple messages, no developer reply was ever sent:

- **2026-05-27** (against 2.3.0 build 5): Guideline 2.3.1(a) "The app contains
  hidden features" + Guideline 4.2 Minimum Functionality ("not sufficiently
  different from a web browsing experience").
- **2026-08-07** (against 2.5.0 build 3): **Guideline 5.6 Developer Code of
  Conduct** — "a pattern of unusual behavior ... the app contains features that
  appear to have been intentionally hidden during the review process."

Also blocking: App Store Connect banner says the **updated Apple Developer
Program License Agreement must be accepted by the Account Holder** before any
new submission. And EU trader status must be provided or EU distribution
removed.

The app has never been Ready for Sale. 2.5.0 would be the first approval.

## Why build 3 made things worse (root cause)

The June fix wrapped the Settings "Dev tools -> Wind widget playground" row in
`__DEV__`, but the screen stayed **imported and registered as a route**
(`WindWidgetPlayground` in MapStack), with a code comment advertising a deep
link (`huntmaryland://playground/wind`). So the Release binary still contained
the entire screen, merely switched off. Compared with build 2, where the row
was visible, that is precisely the pattern App Review describes as "hidden
during review."

Other things in the binary a reviewer could read the same way:
- Three screens registered as routes that nothing in the app navigates to:
  `HuntingVideos`, `GuideDirectory`, `GearGuide` (all in ResourcesStack, plus
  GearGuide in GearStack).
- `react-native-purchases` (RevenueCat) linked as a native pod, plus
  `purchaseService.ts` and `SubscriptionScreen.tsx`, with no purchase UI
  reachable (paywall removed in April). IAP SDK with no visible purchase flow.

## What changed in build 4 (this session)

- Deleted `src/screens/WindWidgetPlayground.tsx`, its route, and the Settings
  `__DEV__` block. No dev tooling remains in any build configuration.
- Removed the unreachable `HuntingVideos`, `GuideDirectory`, `GearGuide`
  routes and imports (screen files remain in the repo but are not bundled;
  wire them visibly or delete them in a later release).
- Removed `react-native-purchases` from package.json, deleted
  `purchaseService.ts`, `SubscriptionScreen.tsx`, their test, the jest mock,
  and `REVENUECAT_API_KEY` from config.
- Bumped to 2.5.0 **build 4** (pbxproj + src/config.ts).
- tsc clean.

## David's steps, in order

1. **Accept the Program License Agreement** at
   https://developer.apple.com/account (Agreements, Tax, and Banking) as
   Account Holder. Nothing can be submitted until this is done.
2. EU trader status: either provide it or remove EU territories under
   Pricing and Availability. Simplest for a Maryland app: remove EU.
3. On the Mac, in `~/Code/huntmaryland-build`:
   `npm install && cd ios && pod install && cd ..` (removes the Purchases
   pod; check that the font "Multiple commands produce" fix in
   font_collision_fix.md did not regress after pod install).
4. Xcode: Product -> Archive on "Any iOS Device" -> Distribute -> App Store
   Connect -> Upload. Confirm it says 2.5.0 (4).
5. App Store Connect -> App Review -> the Jun 29 submission -> the iOS App
   item -> Edit -> attach build 4.
6. **Reply to App Review** with the message below (Reply to App Review
   button on that submission), then Resubmit.
7. Screenshots and description must show only what is in the app.

## Reply to App Review (paste verbatim)

```
Thank you for the detailed feedback, and I apologize for the confusion our
previous builds caused. I want to explain plainly what happened and what
we have changed, because nothing was meant to be concealed from review.

What happened
- Build 2.3.0 (5) unintentionally shipped an internal developer screen
  ("Wind widget playground", a layout tool for the map's wind overlay) in
  the Settings screen. That was the hidden feature you flagged under 2.3.1(a).
- In 2.5.0 (3) we tried to fix it by compiling the Settings entry out of
  release builds. That was the wrong fix: the screen itself was still
  compiled into the app and registered as a navigation destination, just
  no longer reachable. I understand why that looks like a feature that was
  hidden for review rather than removed. It was a mistake in how we removed
  it, not an attempt to hide functionality, but the result was the same
  and I take responsibility for it.

What is different in 2.5.0 (4)
- The developer screen has been deleted from the codebase entirely. There
  is no debug, test, or developer-only user interface in any build
  configuration.
- We also removed three screens that were registered as destinations but
  had no entry point in the app, and removed an in-app-purchase SDK that
  was still linked from an abandoned subscription feature. The app has no
  in-app purchases, no paywall, and no remotely controlled feature flags.
- Every feature in the app is reachable from the visible navigation and is
  described in the App Store metadata.

On Guideline 4.2
The app contains no web views. It is an offline-first native mapping app
for Maryland outdoors: Mapbox vector maps with custom data layers (public
hunting lands, fishing access sites, trails, ranges); downloadable offline
map regions that work with no connectivity; Core Location GPS track
recording with live distance, pace, and elevation; parcel boundaries with
public-vs-private shading and tap-to-inspect ownership; live USGS stream
gauges plotted on the map; on-map measurement, waypoint, route, and
wind/scent tools; a solunar and legal-shooting-hours calculator; and an
on-device regulations knowledge base that answers questions without a
network request. We would be glad to provide a walkthrough video or join a
call if it would help the review.

Thank you for reconsidering.
```

## Still open after approval (not blockers)
- Decide whether to wire HuntingVideos / GuideDirectory / GearGuide into
  ResourcesHub visibly or delete the files.
- Wholesale 2026-27 season-date refresh in the regs data.
