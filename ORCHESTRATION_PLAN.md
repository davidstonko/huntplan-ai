# MDHuntFishOutdoors — Full Orchestration Plan

**Created:** 2026-04-12
**Owner:** David Stonko
**Status:** Active — master execution document for all remaining build work

This plan covers every remaining task from current state to full production-ready app with monetization. Work is organized into 8 execution sprints, ordered by dependency and impact. Each sprint lists concrete deliverables, estimated effort, and acceptance criteria.

---

## Current State Summary

**What's Done:**
- Hunt mode: 100% complete (V3 shipped, App Store live)
- Fish mode: Screens built (FishMap, Spots, HoneyHole, Regs, Resources, OutOfState, CatchLog), AI knowledge base (2,240 lines, 15 handlers), 436+ GIS locations loaded
- Camp mode: Screens built (CampMap, CampGear, GroupCamp, CampResources, CampOutOfState, CampTripPlanner), AI knowledge (1,312 lines, 7 handlers), 45 campgrounds
- Hike mode: Screens built (HikeMap, TrailBrowser, HikeResources, HikeOutOfState, ATTripPlanner), AI knowledge (1,003 lines, 8 handlers), AT trail data (40.9 mi)
- Cross-cutting: RevenueCat wired, Sentry wired, analytics service, Universal Links, state packs architecture, 174 tests
- Data: 5,933 lines across 4 AI knowledge bases (46+ intent handlers), 61+ guide listings, CWD zones, artificial reefs, snakehead hotspots, 47 knowledge-scrape JSON files (508K)
- Backend: FastAPI on Render (15 modules, 45+ tests), PostgreSQL + PostGIS
- Monetization: Amazon Associates active (mdoutdoors-20), RevenueCat SDK wired, Guide Directory live, MONETIZATION_PLAN.md written

**What's Remaining:**
- Fish mode build plan sprints F-0 through F-E (shared refactor, map rebuild, spots, camp, regs, resources)
- Camp mode sprint C-D (CampMap Mapbox implementation, Group Camp collaborative features)
- Camp mode sprint C-A partial (Universal Links AASA deployment, Xcode associated domains)
- Hiking build plan (H-A through H-G per HIKING_BUILD_PLAN.md — but most screens already built)
- Gear commerce build plan (G-A through G-F per GEAR_COMMERCE_BUILD_PLAN.md — partially done)
- App Store submission for V2.1.0 update
- Monetization activation (affiliate signups, partner outreach)
- QA, polish, and regression testing
- Multi-state expansion architecture (VA, PA — Phase 6)

---

## Sprint 1: Shared Infrastructure & Refactor (2 days)

**Goal:** Eliminate duplicated code between Hunt and Fish collaborative features, fix Universal Links, ensure clean foundation for remaining sprints.

### 1A. DeerCamp/HoneyHole Shared Refactor
- Extract shared collaborative map logic from DeerCampScreen and HoneyHoleScreen into `components/shared/CollaborativeMapBase.tsx`
- Shared components: member list panel, activity feed, photo upload modal, annotation renderer
- Both screens import from shared base, override only mode-specific styling/labels
- **Acceptance:** Both screens render identically to current state, code duplication reduced by ~60%

### 1B. Universal Links Deployment
- Add Associated Domains capability in Xcode project (applinks:davidstonko.github.io)
- Add URL scheme `huntmaryland://` to Info.plist
- Push AASA file (apple-app-site-association) to GitHub Pages site
- Push join page (HTML) to GitHub Pages for camp invite deep links
- Test Universal Link flow: share link → Safari → app opens to correct camp
- **Acceptance:** Tapping a shared camp invite link on iOS opens the app and navigates to the correct camp

### 1C. WatermelonDB Package Install
- Run `npm install @nozbe/watermelondb` to resolve babel-plugin error on clean builds
- Verify build succeeds with `npx react-native run-ios --configuration Release`
- Schema already defined in schema.ts — no new code needed, just the npm package
- **Acceptance:** Clean build with no babel-plugin-watermelondb errors

---

## Sprint 2: Fish Mode Completion (3 days)

**Goal:** Bring Fish mode to full feature parity with Hunt mode.

### 2A. FishMapScreen Rebuild
- Current FishMapScreen has 436+ locations loaded but needs polish
- Verify all 4 GIS layers render correctly: access sites (307), stocking (68), fishing grounds (61 polygons), hatcheries (16)
- Verify artificial reef and snakehead hotspot overlays toggle correctly
- Add tide widget integration (NOAA API — tidesandcurrents.noaa.gov)
- Add stocking banner (seasonal alert when trout stocking is active)
- **Acceptance:** All 436+ markers render, filters work with AND logic, tide data displays for nearest station

### 2B. Fish Spots Tab Polish
- FishSpotsScreen mirrors ScoutScreen — verify plan creation flow works for fishing spots
- Ensure GPS track recording works (TrackMeBar integration)
- Verify annotation layer renders fishing-specific waypoint icons
- **Acceptance:** User can create a fishing spot plan, record a GPS track, and save annotations

### 2C. HoneyHole (Fish Camp) Polish
- Verify collaborative features work: member management, activity feed, photo upload
- Ensure fishing-specific labels (e.g., "Honey Hole" not "Deer Camp")
- Test annotation sharing between members
- **Acceptance:** Two simulated users can share annotations on a collaborative fishing map

### 2D. Fish Regulations & Resources Final Pass
- FishRegulationsScreen: Verify seasons, bag limits, "Can I Fish?" checker all display correctly
- FishResourcesScreen: Confirm all 11 categories render with working Linking.openURL()
- FishOutOfStateScreen: Verify nonresident guide content
- **Acceptance:** All fish resource links open correctly, regulations data matches current MD DNR

---

## Sprint 3: Camp Mode Completion (2 days)

**Goal:** Complete CampMap Mapbox implementation and Group Camp collaborative features.

### 3A. CampMapScreen Mapbox Polish
- 45 campground markers already loaded — verify all render with correct type-based colors
- Verify 7 filter toggles work (State Park, State Forest, Federal, County, Private RV, KOA, Glamping)
- Verify AT trail overlay toggle works on camp map
- Add amenity filter pills (water, restrooms, RV hookups, ADA accessible)
- Detail panel: tap marker → show campground name, type, amenities, reservation link, phone
- **Acceptance:** All 45 campgrounds render, filters work, detail panel shows on tap

### 3B. GroupCamp Collaborative Features
- GroupCampScreen mirrors DeerCampScreen — verify shared annotation layer
- Ensure camping-specific labels and icons
- Test member invite flow (depends on Sprint 1B Universal Links)
- Photo upload with geotag pinning
- **Acceptance:** Camp group can share waypoints, photos, and gear lists on a shared map

### 3C. CampTripPlanner & CampOutOfState Polish
- Verify CampTripPlannerScreen 4-step wizard generates correct packing list
- Verify rules engine adapts to location (Assateague vs Deep Creek vs mountains)
- Verify CampOutOfStateScreen 8 collapsible sections render
- **Acceptance:** Trip planner generates location-appropriate gear list with affiliate links

---

## Sprint 4: Hike Mode Completion (1 day)

**Goal:** Polish hiking screens and verify all data renders correctly. Most screens already built.

### 4A. HikeMapScreen Polish
- Verify AT route polyline (25 waypoints, 40.9 mi) renders correctly
- Verify 9 shelters, 10 trailheads, 12 landmarks display with correct icons
- Verify Four States Challenge overlay toggle
- Verify filter toggles for each layer type
- Test resource modal and detail panels
- **Acceptance:** Full AT route visible, all markers interactive, filters toggle layers

### 4B. HikeTrailBrowserScreen Polish
- Verify 5 section cards with mileage, elevation, difficulty
- Verify shelter detail views (capacity, water, privy, coordinates)
- Verify POI list renders
- Segmented control: Sections | Shelters | Points of Interest
- **Acceptance:** All 5 AT sections browsable with complete data

### 4C. HikeResourcesScreen & ATTripPlanner Polish
- Verify segmented control (Trail Info | Links & Guides | Four States)
- Verify all hiking resource links open correctly (12 sections, 70+ links)
- ATTripPlannerScreen: verify 4-step wizard generates personalized packing list
- **Acceptance:** All resource links work, trip planner generates appropriate list

---

## Sprint 5: Gear Commerce Completion (2 days)

**Goal:** Complete the gear recommendation and affiliate commerce system across all modes.

### 5A. Gear Knowledge Base Expansion
- Review existing files: curatedCampingGear.ts, curatedHikingGear.ts
- Create/expand hunting gear data: optics, tree stands, blinds, clothing, calls
- Create/expand fishing gear data: rods, reels, tackle boxes, waders, electronics
- Add boating safety gear, crabbing supplies to fishing gear
- Ensure all products have valid ASINs and mdoutdoors-20 affiliate tag
- **Acceptance:** 100+ products across 4 modes with valid affiliate links

### 5B. GearGuideScreen Enhancement
- GearGuideScreen already exists — verify it switches content by active mode
- Add seasonal recommendations (auto-detect month, show relevant gear)
- Add "Quick Kit" feature: pre-built gear bundles by activity (e.g., "Turkey Opener Kit")
- Product cards with image placeholder, price, rating, "View on Amazon" button
- **Acceptance:** Mode-aware gear guide with seasonal picks and kit bundles

### 5C. Harvest/Catch Log Integration
- HarvestLogScreen (hunt) — verify recording flow: species, weapon, location, date, photo
- CatchLogScreen (fish) — verify recording flow: species, method, location, weight, photo
- Both export to CSV for personal records
- Future: backend sync for aggregate harvest data (Phase 6)
- **Acceptance:** User can log harvest/catch with photo, view history, export CSV

---

## Sprint 6: QA, Polish & App Store Submission (2 days)

**Goal:** Full regression test, performance audit, and submit V2.1.0 update to App Store.

### 6A. TypeScript & Build Verification
- Run `npx tsc --noEmit` — must be 0 errors
- Remove all unused imports across codebase
- Verify no hardcoded colors (all from theme/colors.ts)
- Run full test suite: `npx jest` — all 174+ tests must pass
- **Acceptance:** 0 TS errors, 0 test failures, 0 unused imports

### 6B. Mode Switching Regression
- Test all 4 activity modes: hunt → fish → camp → hike → hunt
- Verify tab bar updates correctly for each mode (5/5/5/4 tabs)
- Verify AsyncStorage persists mode across app restart
- Verify AI chat switches knowledge base per mode
- Verify map layers change per mode
- **Acceptance:** Seamless mode switching with no state leaks

### 6C. Offline Functionality Audit
- Enable airplane mode, verify all core features work:
  - Map renders cached tiles
  - Regulations display from local data
  - AI chat responds from local knowledge base
  - Plans/tracks/camps load from AsyncStorage
  - Gear recommendations display from local product data
- **Acceptance:** Core app fully functional offline

### 6D. Performance & Memory
- Profile app startup time (target: <3s cold start)
- Check memory usage with all map layers active
- Verify no memory leaks in map screen transitions
- Test with large plan/track datasets (50+ items)
- **Acceptance:** No crashes, no jank, responsive scrolling

### 6E. App Store Submission
- Update version in package.json and Xcode project
- Update App Store screenshots for all 4 modes
- Write release notes highlighting fishing, camping, hiking additions
- Archive build: `cd ios && xcodebuild archive`
- Upload to App Store Connect via Xcode Organizer
- Submit for review
- **Acceptance:** Build accepted by App Store Connect, submitted for review

---

## Sprint 7: Monetization Activation (1–2 weeks, parallel with Sprint 6)

**Goal:** Activate all Tier 1 revenue streams from MONETIZATION_PLAN.md.

### 7A. RevenueCat App Store Products
- Create subscription products in App Store Connect:
  - Pro Monthly ($4.99/mo)
  - Pro Annual ($39.99/yr)
  - Team Monthly ($9.99/mo)
  - Team Annual ($79.99/yr)
- Link products in RevenueCat dashboard
- Test purchase flow on TestFlight
- **Acceptance:** Subscription purchases work end-to-end on TestFlight

### 7B. Affiliate Program Signups
- Apply to Bass Pro Shops / Cabela's affiliate program
- Apply to REI Co-op affiliate program
- Sign up for Campnab affiliate (campnab.com)
- Sign up for Airbnb referral program
- Sign up for Booking.com affiliate program
- **Acceptance:** At least 2 new affiliate programs approved and links integrated

### 7C. Guide Service Outreach
- Contact top 3 fishing charters for referral partnership:
  1. Chesapeake Bay Sport Fishing
  2. Griffin's Guide Service
  3. Hookset Guide Service
- Contact top 3 hunting guides:
  1. B & J Guide Service
  2. Talbot County Outfitters
  3. DOA Outfitters
- Propose: tracking links or promo codes, 5–15% referral commission
- Add "Book Now" deep links in GuideDirectoryScreen when confirmed
- **Acceptance:** At least 2 partnership agreements in progress

### 7D. Campnab Integration
- Add "Get Availability Alerts" button in CampResourcesScreen
- Link to Campnab with affiliate tracking
- Add explanatory text about the service
- **Acceptance:** Button renders, link opens Campnab with tracking

### 7E. Lodging Affiliates Integration
- Add "Where to Stay" section in CampResourcesScreen
- Add lodging links in FishResourcesScreen (bay-area lodging)
- Include: Airbnb cabin stays, Booking.com hotels near parks, Hipcamp glamping
- **Acceptance:** Lodging affiliate links in both camp and fish resources

---

## Sprint 8: Multi-State Expansion Architecture (Phase 6 — TABLED)

> **STATUS: TABLED** — Deprioritized in favor of backend sync (Sprint 9) and core polish (Sprints 1–6). Will revisit after App Store submission and sync activation.

**Goal:** Build the infrastructure for VA and PA data packs without shipping data yet.

### 8A. State Pack Download System
- StatePackScreen already exists — verify UI for browse/download/delete/switch
- Implement actual download logic in statePackService.ts (currently stub)
- State pack format: JSON bundle with lands, regulations, GIS data, knowledge base
- MD pack is built-in (bundled with app), VA/PA are downloadable (Pro tier)
- **Acceptance:** State pack download/install/delete lifecycle works with mock VA data

### 8B. State-Aware Data Layer
- Refactor data imports to check active state pack
- Create StateDataProvider context that wraps all data access
- When activeState === 'VA', load VA lands, VA regulations, VA knowledge base
- Fallback: if no state pack installed, show MD data
- **Acceptance:** Switching state pack changes map data, regulations, and AI responses

### 8C. VA Data Pipeline (Phase 6 proper)
- Scrape VA DGIF (Department of Game and Inland Fisheries) data:
  - Public hunting lands and WMAs
  - Fishing access sites
  - Seasons and regulations
  - License fees
- Build VA knowledge base for AI chat
- Build VA GIS data (land boundaries, access points)
- Package as downloadable state pack
- **Acceptance:** VA state pack with 50+ lands, regulations, and AI knowledge

### 8D. PA Data Pipeline
- Scrape PA Game Commission data:
  - State Game Lands (300+)
  - Fishing access (PA Fish & Boat Commission)
  - Seasons and regulations
- Build PA knowledge base
- Build PA GIS data
- Package as downloadable state pack
- **Acceptance:** PA state pack with 50+ lands, regulations, and AI knowledge

### 8E. Backend Analytics Dashboard
- React admin panel at /dashboard (separate from mobile app)
- 7 aggregation endpoints:
  - User activity by mode
  - Popular lands/spots by visits
  - AI query patterns
  - Gear link click-through rates
  - Forum engagement
  - Subscription conversion funnel
  - State pack adoption
- **Acceptance:** Dashboard renders with real data from production backend

---

## Sprint 9: Backend Sync Activation (PRIORITY — 1–2 weeks)

> **STATUS: ACTIVE** — Elevated priority. Runs in parallel with Sprints 1–6. WatermelonDB schema is already defined; backend endpoints exist on Render.

**Goal:** Activate WatermelonDB sync so user data persists across devices.

### 9A. WatermelonDB Activation
- Schema already defined in schema.ts
- Install @nozbe/watermelondb npm package (merged from Sprint 1C)
- Implement sync adapter connecting to FastAPI backend
- Sync tables: plans, tracks, camps, members, annotations, photos, catches, harvests
- Conflict resolution: last-write-wins with timestamp
- **Acceptance:** Data created on one device appears on another after sync

### 9B. User Profile System
- Username-based profiles (no email auth required)
- Profile stores: display name, avatar, home county, activity preferences
- Optional: link to Apple ID for cross-device sync
- **Acceptance:** User can create profile, data syncs to backend

### 9C. Forum Backend Integration
- ForumScreen currently exists — connect to backend forum endpoints
- Post creation, replies, upvotes, moderation flags
- Categories per activity mode
- **Acceptance:** Forum posts persist to backend, visible to all users

---

## Sprint 10: Marketing & Launch (Ongoing)

**Goal:** Drive downloads and engagement post-update.

### 10A. App Store Optimization
- Keywords: maryland hunting, maryland fishing, maryland camping, md outdoor, dnr maryland
- Screenshots showing all 4 activity modes
- App Preview video (15–30 seconds)
- Description highlighting offline-first, free, all-in-one
- **Acceptance:** Updated listing with optimized keywords and new screenshots

### 10B. Social & Community
- Reddit posts: r/MDhunting, r/marylandfishing, r/AppalachianTrail, r/camping
- Maryland hunting/fishing Facebook groups
- WhiteBlaze forum (AT community)
- Local outdoor shop flyer/QR code partnerships
- **Acceptance:** Posts in 5+ relevant communities

### 10C. Content Marketing
- GitHub Pages blog posts:
  - "The Complete Guide to Maryland Public Hunting Lands"
  - "Maryland Trout Stocking 2026: Where & When"
  - "Hiking the AT in Maryland: App-Powered Guide"
- SEO targeting Maryland outdoor keywords
- **Acceptance:** 3+ blog posts published and indexed

---

## Timeline Summary

| Sprint | Description | Est. Effort | Dependencies |
|--------|-------------|-------------|--------------|
| 1 | Shared Infrastructure & Refactor | 2 days | None |
| 2 | Fish Mode Completion | 3 days | Sprint 1A |
| 3 | Camp Mode Completion | 2 days | Sprint 1B |
| 4 | Hike Mode Completion | 1 day | None |
| 5 | Gear Commerce Completion | 2 days | None |
| 6 | QA, Polish & App Store | 2 days | Sprints 1–5 |
| 7 | Monetization Activation | 1–2 weeks | Sprint 6 (parallel) |
| 8 | Multi-State Expansion | 2–3 weeks | **TABLED** |
| 9 | Backend Sync | 1–2 weeks | Sprint 1C (parallel w/ 2–6) |
| 10 | Marketing & Launch | Ongoing | Sprint 6 |

**Critical path:** Sprint 1 → 2 → 3 → 6 (App Store submission)
**Parallel tracks:** Sprints 4, 5, 9 run alongside 1–3. Sprint 7 runs alongside 6. Sprint 10 starts after 6.
**Tabled:** Sprint 8 (multi-state expansion) — revisit post-submission.

**Total estimated effort to next App Store submission:** ~10 days (Sprints 1–6)
**Total estimated effort to full platform maturity:** ~8–12 weeks (all sprints)

---

## Risk Register

| Risk | Impact | Mitigation |
|------|--------|------------|
| App Store rejection (metadata, screenshots) | Delays launch 1–2 weeks | Pre-review checklist, test on TestFlight first |
| RevenueCat product configuration errors | Blocks subscriptions | Test thoroughly on sandbox before submission |
| NOAA Tides API rate limits | Degrades fish map UX | Cache responses, show "last updated" timestamp |
| Affiliate program rejections | Reduces revenue potential | Apply to multiple programs, Amazon is fallback |
| WatermelonDB sync conflicts | Data loss | Last-write-wins + conflict log for manual review |
| VA/PA data scraping legal issues | Blocks multi-state | Use only public .gov data, attribute sources |

---

## Success Metrics

**30-day post-update:**
- 500+ downloads
- 4.5+ App Store rating
- <1% crash rate (Sentry)
- $50+ affiliate revenue

**90-day targets:**
- 2,000+ MAU
- 3+ affiliate programs active
- 100+ Pro subscribers
- VA state pack shipped
- Forum has 50+ posts

**6-month targets:**
- 5,000+ MAU
- $630–2,600/mo revenue (per MONETIZATION_PLAN.md projections)
- PA state pack shipped
- Featured in MD DNR newsletter or outdoor media

---

*This document supersedes individual build plans (HUNTING_BUILD_PLAN.md, FISHING_BUILD_PLAN.md, etc.) as the single source of truth for remaining work. Individual plans remain as reference for sprint-level detail.*
