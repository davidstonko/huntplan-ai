# PUSH_AUDIT.md — Pre-submission tap-through checklist

> **Rule:** Every box below MUST be physically ticked on a fresh-rebuild
> simulator (or device) before the build is declared push-ready.
> "Probably works" doesn't count. "I changed the symmetric code over
> here so this should work too" doesn't count. **You tap, you see it
> working, you tick the box.**
>
> The list grows whenever a feature ships. It does not shrink without
> the feature being deleted.
>
> History (2026-04-28): the V2.3 build shipped *2 BLOCKERs* that
> passed tsc + 108 jest suites + a "live audit" because the live audit
> only sampled the most prominent paths. This file exists so that
> sampling stops being implicit and becomes explicit. See:
>   - [memory/live_audit_2026_04_28.md](../../sessions/.../live_audit_2026_04_28.md) (ChatScreen mode dispatch)
>   - [memory/live_audit_round_2_invite_code_bug_2026_04_28.md](../../sessions/.../live_audit_round_2_invite_code_bug_2026_04_28.md) (Camp inviteCode)
>
> Pair this checklist with `src/__tests__/wiringIntegrity.test.ts`.
> The wiring test catches *static* orphans. This list catches things
> the static test can't see — UX flow correctness, content accuracy,
> share-sheet behavior, deep-link recipient flow.

---

## Pre-flight (local repo state)

- [ ] `pwd` ends with `huntmaryland-build` (canonical repo lock — see CLAUDE.md)
- [ ] `git remote -v` matches the expected GitHub origin
- [ ] `git status` clean (or every dirty file is intentional)
- [ ] `npx tsc --noEmit` exits 0
- [ ] `npx jest` exits 0 — no failed suites, no skipped suites we forgot about
- [ ] `npx jest src/__tests__/wiringIntegrity.test.ts` passes — orphan gate green
- [ ] Build number bumped in Xcode (last shipped was Build 4 on 2026-04-24)
- [ ] `cd ios && rm -rf Pods && RCT_NEW_ARCH_ENABLED=0 pod install` fresh
- [ ] DerivedData cleaned (`rm -rf ~/Library/Developer/Xcode/DerivedData/*`)
- [ ] AASA file deployed to `davidstonko.github.io/huntmaryland-site/.well-known/apple-app-site-association` AND verified live (`curl -i` returns 200 with correct content-type + correct TEAM_ID + bundle ID)

## Boot path

- [ ] Cold-start the app on iPhone 17 Pro simulator from a clean uninstall (`xcrun simctl uninstall booted com.davidstonko.huntmaryland`) — no crash
- [ ] AnimatedSplash plays and dismisses
- [ ] SplashDisclaimer renders, "I understand" button works, navigates to ModePicker
- [ ] No red error screens, no LogBox-suppressed errors, no Sentry events fired during boot
- [ ] If a previous version was installed, AsyncStorage data persists (existing camps, journal entries, etc.) — schema migration didn't blow away user data

## ModePicker

- [ ] All 4 mode cards render: Hunt, Fish, Camp, Hike (with correct icon + subtitle)
- [ ] Tapping each card opens the right TabNavigator
- [ ] Footer disclaimer "Always verify regulations with Maryland DNR" visible
- [ ] Version number visible (e.g. "v2.3.0")

## Hunt mode (6 tabs: Map / Scout / AI / Deer Camp / Gear / Info)

### Hunt → Map
- [ ] Mapbox loads (no blank gray); 192 hunting lands + 14 ranges visible as pins
- [ ] Top header has weather pill + wind pill (collapsed by default at top:90)
- [ ] Tap wind pill → expands → contains expand/collapse toggle
- [ ] Filter chip strip horizontally scrollable: Blinds / Water / Geese / Closed / Lotto / **Pros** (verify Pros chip exists at end via horizontal scroll)
- [ ] Tap Blinds chip → only landowner-blind pins remain
- [ ] Tap Pros chip → guide/outfitter pins replace land pins
- [ ] Tap a Pros pin in Owings Mills area → Guntry detail card with **★ Recommended** badge, full description (64,000 sq ft / 34 ranges / 40-yard archery), italic offerings, address (10705 Red Run Blvd), Call + Website buttons
- [ ] Tap a public-land cluster (e.g. Frederick County) → Frederick City Watershed CWMA card → scroll past species/weapons/contact → **"Local pros for Frederick County"** section with Natalie's Taxidermy as first entry
- [ ] Zoom buttons bottom-right, **+ on top, − on bottom** (magnifying-glass icons)
- [ ] Map drag/pan works (no controlled-prop trap re-snapping camera)
- [ ] Search bar at bottom: search "Patapsco" → matching land highlights

### Hunt → Scout
- [ ] Toolbar shows 6 buttons (waypoint, route, area, track, photo, …) with accessibility labels
- [ ] Tap waypoint → drop pin → opens annotation editor
- [ ] Track-Me bar visible
- [ ] PlanSidebar slide-out shows existing plans + saved tracks with visibility toggles

### Hunt → AI
- [ ] Welcome message references "192 public hunting lands, 14 shooting ranges"
- [ ] Type "where can I hunt sika deer?" → response includes Sika Deer info **+ "Local pros for Sika Deer" footer with Muddy Marsh Outfitters · 410-228-2770 · TUNDRATOUR**
- [ ] Type "when is deer season?" → response includes 2026 dates with citation
- [ ] AI Hunt Plan banner visible at top → tap → opens HuntPlanScreen
- [ ] Quick-suggestion chips render and are tappable

### Hunt → Deer Camp
- [ ] Tab label renders as two-line "Deer / Camp"
- [ ] Existing camps load from AsyncStorage (Green Spring, Hunt Valley, etc.)
- [ ] Tap + New Camp → modal opens
- [ ] Type a name → tap "Next: Draw Area" → CampAreaPickerScreen pushes
- [ ] CampAreaPicker: address-search row at top with Go button, rectangle handles draggable, zoom buttons +/− at bottom-right, area-cap warning ("over 5 sq mi cap") fires when drawn area > 5 sq mi and Confirm is disabled
- [ ] Drag bottom-right corner inward → "X.XX sq mi" updates → Confirm becomes active under 5 sq mi
- [ ] Tap Confirm → land back on Deer Camp list with new camp at bottom
- [ ] Tap into the new camp → camp detail map renders with red boundary rectangle
- [ ] Tap **+ Invite** → Invite to Camp modal opens with Username field + **Share Link via Messages** button (lichen-green, link emoji)
- [ ] Tap Share Link via Messages → **iOS share sheet opens with `davidstonko.github.io` URL preview** (this is the BLOCKER #2 fix from 2026-04-28 — must work for both NEW camps and OLD AsyncStorage camps lacking inviteCode)
- [ ] Tap **LINK** button at top of camp detail header → CampInviteLinkModal opens → URL displayed contains `davidstonko.github.io/huntmaryland-site/join/` (NOT mdhuntfishoutdoors.com — domain we don't own; was BLOCKER fixed in audit-of-audit 2026-04-28)
- [ ] Tap **EDIT** → CampDetailsEditor opens → can rename camp + add description
- [ ] Long-press a camp on the list → delete confirmation
- [ ] Activity feed shows "Me created '{name}' (X.XX sq mi)" entry

### Hunt → Gear
- [ ] Category picker shows: Whitetail · Turkey · Sika · Bear · Optics · Stands · Calls · Clothing · Accessories
- [ ] Whitetail subStyle picker: Saddle / Treestand / Both
- [ ] "By David" featured-pick section visible with gold left-border + "By David" badge + italic notes
- [ ] Tap a gear card with Amazon URL → opens Safari with `mdoutdoors1-20` affiliate tag in URL

### Hunt → Info
- [ ] Segmented control: Regulations | Links & Guides | Out of State
- [ ] Regulations tab → 2026 hunt seasons render
- [ ] Links & Guides tab → official MD DNR links + Guide Directory entry
- [ ] Tap Guide Directory → 61+ services list, tab selector for fishing-charters / hunting-guides / taxidermists / etc.
- [ ] **Contact David** banner at bottom of Info → tap → mailto:dstonko1@gmail.com opens

## Fish mode (5 tabs: Map / Spots / AI / Gear / Info)

### Fish → Map
- [ ] 737 angler-access sites + stocking + tide stations render
- [ ] 5 filter chips fit on iPhone 17 Pro width: RMP / SFT / SHR / TRT / P&T (compacted from "Boat Ramp" etc.)
- [ ] Tap a hotspot pin (e.g. Gunpowder Falls Big Gunpowder Bridge Pool) → detail card with species, technique notes, best months, **+ "Local pros for Gunpowder Falls" section with Great Feathers fly shop · 410-472-6799**
- [ ] Tap a DNR access-site pin → detail card with owner metadata + Local Pros section
- [ ] Zoom buttons bottom-right, + on top, − on bottom

### Fish → Spots
- [ ] FishSpotsScreen renders saved spots
- [ ] Tap + → FishWaypointPicker opens; address-search + zoom +/− work
- [ ] HoneyHoleScreen accessible (used as child route)

### Fish → AI
- [ ] Welcome message is fishing-specific (NOT hunt content)
- [ ] Type "best fly fishing on the gunpowder?" → species response **+ "Local pros for Gunpowder Falls" footer with Great Feathers**
- [ ] Type "striped bass season" → 2026 slot/season dates + spawning closure info
- [ ] Quick-suggestion chips fishing-specific

### Fish → Gear
- [ ] Category picker: Fly · Streams / Lakes & Ponds / Bay · Shore / Bay · Boat
- [ ] Fly Fishing subStyle picker: Euro Nymph / Conventional / All
- [ ] "By David" section has 26 of David's fly fishing creator picks (Patagonia Atom Sling, Orvis Clearwater Waders, Korkers, Echo Shadow II 10' 3wt, Sage R8 Core, Rio Premier Gold, Ventures Fly Co MD assortment, etc.)
- [ ] All ASIN URLs open with `mdoutdoors1-20` tag

### Fish → Info
- [ ] Segmented control fishing-specific: Regulations | Links & Guides | Out of State (NOT showing "Can I Hunt" content — was bugged pre-2026-04-26 and fixed)
- [ ] **Contact David** banner at bottom

## Camp mode (6 tabs after 2026-04-28: Map / Trip Planner / Group / **AI** / Gear / Info)

> AI tab is NEW in V2.3 audit-of-audit work. Was orphaned pre-2026-04-28.

### Camp → Map
- [ ] CampMapScreen renders with 45 MD campgrounds, type filters: All / State Park / Forest / Private / Backpacker / Water / Toilet / Shower / ADA
- [ ] AT trail overlay toggle works
- [ ] Tap a campground → detail card
- [ ] Zoom buttons +/− bottom-right
- [ ] **Note**: Camp map does NOT have a Pros pin layer. This is a known V2.4 task (#113 in tasks). Per current scope, this is intentional. Verify the chip strip does NOT show "Pros" (we don't want a chip that does nothing).

### Camp → Trip Planner
- [ ] CampTripPlannerScreen 4-step wizard (campground → month → style → gear list) works
- [ ] Generated gear list has weights + Amazon affiliate links

### Camp → Group
- [ ] GroupCampScreen renders
- [ ] Tap "Share Invite" → message contains `davidstonko.github.io/huntmaryland-site/join/{code}` web fallback (NOT mdhuntfishoutdoors.com — fixed in audit-of-audit)

### Camp → AI ⭐ NEW IN V2.3 AUDIT-OF-AUDIT
- [ ] AI tab renders with Camp-specific welcome ("campgrounds, reservations, access, trip planning")
- [ ] Type "best campground at Deep Creek" → response includes Deep Creek info **+ "Local pros" footer with Bill's Marine or similar western MD outfitter**
- [ ] Type "how do I reserve a site?" → reservation flow info
- [ ] AI Camp Trip Planner banner at top → tap → opens CampTripPlannerScreen
- [ ] Quick-suggestion chips camp-specific

### Camp → Gear
- [ ] CampGearScreen renders curated camping gear with Amazon affiliate links
- [ ] Categories surface relevant gear

### Camp → Info
- [ ] CampResourcesScreen renders camping regulations + park contacts
- [ ] **Contact David** banner at bottom

## Hike mode (6 tabs after 2026-04-28: Map / Trails / Trip / **AI** / Gear / Info)

> AI tab is NEW in V2.3 audit-of-audit work. Was orphaned pre-2026-04-28.

### Hike → Map
- [ ] HikeMapScreen renders AT route polyline (40.9 mi), 9 shelters, 10 trailheads, 12 landmarks
- [ ] Filter chip strip: All Trails / Easy / Moderate / Strenuous / **Pros** — verify Pros chip exists
- [ ] Tap a Pros pin → detail card (REI / Charm City Run / Bike Doctor / MCM / PATC etc.)
- [ ] Four States Challenge overlay toggle works
- [ ] Zoom +/− bottom-right

### Hike → Trails
- [ ] HikeTrailBrowserScreen renders 5 AT sections
- [ ] Segmented: Sections | Shelters | Points of Interest

### Hike → Trip
- [ ] HikeTripPlannerStack 4-step wizard (trip type → season → conditions → group)
- [ ] Generated AT packing list has weights + Amazon affiliate links

### Hike → AI ⭐ NEW IN V2.3 AUDIT-OF-AUDIT
- [ ] AI tab renders with Hike-specific welcome ("trails, AT, shelters, elevation, trip planning")
- [ ] Type "AT in Maryland" → AT route info **+ "Local pros" footer with MCM / PATC / REI**
- [ ] Type "where are the AT shelters?" → shelter list with mile markers
- [ ] AI Hike Trip Planner banner at top → tap → opens ATTripPlannerScreen
- [ ] Quick-suggestion chips hike-specific

### Hike → Gear
- [ ] Categories: Day Hike · Backpacking · AT Through · Winter · Trail Run
- [ ] Hiking-boot tab icon renders

### Hike → Info
- [ ] Segmented: Trail Info | Links & Guides | Four States
- [ ] **Contact David** banner at bottom

## Universal Link recipient flow (cross-device)

> The hardest thing to verify in simulator. Best done with a real
> device + a friend's device.

- [ ] Generate a Share Link from Deer Camp on simulator A → AirDrop or Notes-paste to a different device B
- [ ] On device B (with the app already installed), tap the link → app opens directly to DeerCamp join flow with code pre-filled
- [ ] On device B (with app NOT installed), tap the link → Safari falls through to App Store listing
- [ ] Same test for the LINK-button URL (CampInviteLinkModal) — both Universal Link and custom-scheme should resolve

## Cross-cutting

- [ ] All 5 maps have zoom buttons +/− bottom-right with magnifying-glass icons
- [ ] All 5 maps support drag/pan (no Camera controlled-prop trap)
- [ ] Bottom tab bar text passes WCAG AA contrast on all 4 modes
- [ ] No "Open debugger to view warnings" warnings besides the suppressed Mapbox ones in LogBox.ignoreLogs

## Known V2.4+ deferred (intentionally not tested here)

These are documented in `src/__tests__/wiringIntegrity.test.ts`'s
ALLOW_UNWIRED set. They will be tested when they ship.

- StatePackScreen, SubscriptionScreen (Phase 5C / Phase 6 staging)
- ProfileScreen, SocialScreen (V3+ backend auth)
- PlanScreen (legacy, possibly deletable)
- CampOutOfState/FishOutOfState/HikeOutOfState/OutOfState (V2.4 visitor guides — not yet linked from per-mode Resources screens)
- CatchLogScreen + CatchLogProvider (V2.4 fishing personal stats)

---

## When to update this file

- A new screen ships → add tap-through items here.
- A user-facing surface gets a new field/CTA → add a verify-it-renders item.
- A bug ships that this checklist would have caught → add an item that would catch the next instance.

The list is the source of truth for "did we test this." If it's not on
the list, it didn't get tested.
