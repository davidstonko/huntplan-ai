# MDHuntFishOutdoors V2.4.0 (build 1)

Release date: TBD (target: 2026-05-15)  
Previous release: V2.3.0 build 5 (uploaded, Apple-validated, ships unchanged)

## What's new for users

**Smarter AI**: hunt-mode chat now answers questions about trapping
(11 furbearer species: beaver, fisher, fox, muskrat, mink, raccoon,
opossum, skunk, coyote, weasel), bowfishing for invasive snakehead +
blue catfish, and statewide harvest stats (84,201 deer in 2024-25;
4,851 spring turkeys). Fish chat covers the enhanced 2026 trout
stocking program (240,000 fish, +26%, hotline 800-688-3467), the
2025 senior license trout-stamp change, and PFD/boating safety
requirements.

**Better maps**: Scout tab now opens to Maryland by default instead
of wherever the user is — out-of-state users + the iOS Simulator no
longer see their own city's map with every hunting pin 3000+ miles
away. Same geofence fix applied to Honey Hole and the Fish/Camp
recenter buttons. Hunt Map overlay stack cleaned up — the count
badge, filter pill, and overlay picker no longer visually collide.

**Fewer surprises**: activity mode (Hunt/Fish/Camp/Hike) now persists
across app launches — pick Fish on Monday, you land in Fish on
Tuesday. Scout plans + tracks now reliably load from AsyncStorage
on cold start (a silent V2.3 bug meant they appeared to vanish
between sessions). Group Camps reliably generate invite codes;
all share-link URLs now use the path format that iOS Universal
Links actually parses.

**Cleaner everything**: invite-code share URLs on every camp type
(Deer Camp, Fish Camp, Group Camp, Camp Trip) use the same
canonical `/join/CODE` format. ContactFab is now reachable from
all 4 modes (Fish/Camp/Hike Info tabs gained the bottom-right
contact bubble). Personal email replaced everywhere with the
shared feedback inbox.

## What's new for the codebase

- 33 V2.4 audit commits across 22 audit iterations
- 30+ bugs caught and fixed, including 5 live-simulator BLOCKERs
- ~196 new wiringIntegrity assertions (ContactFab parity, URL format,
  Provider mounting, API_BASE_URL source-of-truth, OnboardingTourGate
  parity)
- New `RESEARCH_PLAN.md` mapping the >200-page sweep across 7
  categories of MD outdoors content sources
- New chat-knowledge intents (Hunt: trapping, bowfishing, harvest
  stats; Fish: 2026 stocking program, senior license, PFD)
- Reusable `ContactFab` component
- `fetchWithTimeout` helper for backend cold-start defense
- Defensive null-guard + try/catch fixes in 5+ files

## Build version

- Marketing: 2.4.0
- Build: 1
- Sources of truth aligned:
  - `package.json` → `"version": "2.4.0"`
  - `src/config.ts` → `APP_MARKETING_VERSION='2.4.0'`,
    `APP_BUILD_NUMBER='1'`
  - `ios/HuntPlanAI.xcodeproj/project.pbxproj` →
    `MARKETING_VERSION=2.4.0`, `CURRENT_PROJECT_VERSION=1`

## What ships unchanged from V2.3.0(5)

- AASA at `website/.well-known/apple-app-site-association` (team
  BAFL96ZCUU, paths `/huntmaryland-site/{join,trip}/*`)
- EXIF stripping via `src/services/exifStripper.ts`
- Mapbox token via react-native-dotenv (no hardcoded fallback)
- 4 active modes (hunt/fish/camp/hike)
- React Native 0.76.6, iOS 15+, iPhone 12+

## App Store Connect submission notes

- Privacy nutrition label: unchanged from V2.3
- New permissions: none
- Affiliate disclosure: unchanged from V2.3 (Amazon Associates
  tag mdoutdoors1-20 on gear cards across all 4 modes)
- Subscription tier behavior: unchanged from V2.3
- iOS minimum target: 15 (unchanged)

## Known follow-ups deferred to V2.4.1+

- Camp/Hike Info tabs can't reach Settings or Forum (Hunt+Fish use
  ResourcesStack; Camp/Hike use direct screens — task #57)
- Tab.Screen mounts have no explicit accessibilityLabel beyond
  visual tabBarLabel (task #59)
- Console.log spam in DB models (intentionally dev-only files, not
  blocking release)
- Research sweep through Categories C-G of RESEARCH_PLAN.md
  (federal lands, conservation orgs, academic papers, books, forums)

## Pre-submission checklist

- [x] tsc --noEmit clean
- [x] jest: 112 suites / 2680 tests / 0 failed
- [x] wiringIntegrity: ~196 assertions
- [x] Version bumped consistently across 3 sources of truth
- [ ] Simulator visual verify each tab in each mode (USER: ⌘R in Xcode)
- [ ] Real-device verify Fish Map drag (only one open issue from
      iter 11 simulator audit — task #46)
- [ ] Archive in Xcode (Product → Archive)
- [ ] Upload to App Store Connect via Organizer
- [ ] Apple validation (TestFlight processing ~15 min)
- [ ] Submit for App Store Review (~24-48hr)
