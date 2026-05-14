# CLAUDE.md — AI Assistant Context for MDHuntFishOutdoors

> ## CANONICAL REPO — READ THIS FIRST
>
> **The only working tree for this app is `~/Documents/huntmaryland-build/`.** Bundle ID `com.davidstonko.huntmaryland` builds from THIS folder; this is what Xcode opens; this is what ships to the App Store.
>
> **Never edit a copy or fork of this code.** If you encounter another folder claiming to contain this app (e.g. `~/Documents/Claude/Projects/AI Hunting Planning/huntplan-ai/`, `~/projects/huntplan-ai/`, `~/Desktop/mobile/`), it is **stale**. Flag it to David and stop. Do not merge from it, copy from it, or take it as authoritative.
>
> Before starting any non-trivial work in a future session, **verify** that the current working tree IS the canonical repo:
>
> 1. `pwd` should be inside `huntmaryland-build/`
> 2. `git remote -v` should show the GitHub origin you expect
> 3. The Xcode workspace open in your IDE/Finder should be `huntmaryland-build/ios/HuntPlanAI.xcworkspace`
>
> If any of these disagree, **stop and ask** before doing anything destructive (file edits, npm install, pod install, builds).
>
> History: this lock landed 2026-04-26 after a parallel V2.3 fork at `huntplan-ai/mobile/` had drifted ~120 service files and 30+ screen rewrites from the canonical V2.2 build. Consolidating those forks took a full day and several hundred merge conflicts. Don't make a second one.

## Project Identity

- **App Name (App Store):** MDHuntFishOutdoors
- **Apple ID:** 6761347484
- **Bundle ID:** com.davidstonko.huntmaryland (DO NOT CHANGE — registered with Apple)
- **Xcode Project Name:** HuntPlanAI (structural rename deferred to future phase)
- **Display Name:** MDHuntFishOutdoors
- **Umbrella Brand:** OutdoorsMaryland (cross-activity branding)
- **Activity Mode Labels:** MD Hunt, MD Fish, MD Camp, MD Hike (Crab/Boat folded into Fish)

## Project Mission

Consolidate all disparate Maryland DNR information (regulations, maps, seasons, bag limits, public land data) into one free, offline-first iPhone app. Not a replacement for OnX — a standalone map stack with community forums. Starting with hunting (V1 shipped 2026-03-30), expanding to fishing, crabbing, boating, and hiking.

## Tech Stack

### Frontend
- **Framework:** React Native 0.76.6 (iOS only, bare — no Expo)
- **Language:** TypeScript 5.5 (strict mode, 0 errors required)
- **Maps:** Mapbox GL Native (@rnmapbox/maps 10.1.35)
- **Navigation:** React Navigation 7.0 (bottom tab navigator)
- **Local Persistence:** AsyncStorage (V2), WatermelonDB schema ready for backend sync (Phase 3)
- **State Management:** Context API (ActivityModeContext, ScoutDataContext, DeerCampContext, FishingDataContext)
- **Target:** iPhone 12+ (iOS 15+)

### Backend (V3+)
- Server DB: PostgreSQL + PostGIS + pgvector for RAG
- API: FastAPI (Python)
- Authentication: Username-based profiles (users choose anonymous or real name)

### Tooling
- **Build Path:** /Users/davidstonko/Documents/huntmaryland-build (no spaces — Hermes build requirement)
- **Pod Install:** `cd ios && RCT_NEW_ARCH_ENABLED=0 pod install`
- **TypeScript Check:** `npx tsc --noEmit`
- **Package Manager:** npm (Node.js)

## Coding Conventions

### TypeScript & Style
- **Strict mode enforced** — all code must pass `npx tsc --noEmit` with 0 errors
- **Functional components with hooks only** — no class components
- **Naming conventions:**
  - PascalCase: Components, screens, types
  - camelCase: Services, hooks, utilities, event handlers
- **Color references:** Always import from `theme/colors.ts` — never hardcode hex/rgb values
- **Theme:** Dark theme throughout with Maryland color palette (mdRed, mdGold, mdBlack, mdWhite, oak, tan, sand, etc.)

### File Organization
- `screens/` — 14 screen components (MapScreen, ScoutScreen, DeerCampScreen, AIScreen, RegulationsScreen, etc.)
- `components/` — Feature-organized subdirectories:
  - `scout/` — PlanSidebar, PlanCreationFlow, AnnotationLayer, CompassOverlay, TrackMeBar, MeasureTool
  - `map/` — Map layers, filters, overlays
  - `deer-camp/` — Deer Camp UI components
  - `common/` — Shared UI (buttons, modals, headers)
- `context/` — Context providers (ActivityModeContext, ScoutDataContext, DeerCampContext)
- `services/` — API calls, location, weather, auth
- `types/` — TypeScript definitions (scout.ts, deercamp.ts)
- `data/` — Static MD hunting data, GIS boundaries, chat knowledge base
- `hooks/` — Custom React hooks
- `navigation/` — Route configuration, deep linking
- `theme/` — Colors, typography, spacing constants

### Component Structure
```typescript
// File: components/MyComponent.tsx
import React from 'react';
import { View, StyleSheet } from 'react-native';
import { colors } from '@/theme/colors';

interface MyComponentProps {
  title: string;
  onPress?: () => void;
}

export const MyComponent: React.FC<MyComponentProps> = ({ title, onPress }) => {
  return (
    <View style={styles.container}>
      {/* JSX */}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.mdBlack,
  },
});
```

## Architecture Rules

### Offline-First Design
- All core features must work without network connectivity
- Map tiles cached locally via Mapbox offline packs
- AsyncStorage for user-generated data (plans, tracks, camps, photos)
- Backend sync deferred to Phase 3

### Activity Modes
- App supports 6 activity modes: hunt, fish, camp, hike, crab, boat
- `ActivityModeContext` manages current mode + related settings
- `ActivityModePicker` dropdown in header enables mode switching
- Tab configuration changes per activity mode: Hunt (5 tabs), Fish (5), Camp (5), Hike (3)
- Active modes in picker: hunt, fish, camp, hike (crab/boat content folded into fish)
- Mode persists across sessions via AsyncStorage

### Map Layer System
- **Data-driven styling:** Mapbox styling uses `['get', 'color']` expressions for dynamic colors
- **Point markers:** Dual-layer design (white circle base + colored border for visibility)
- **Labels:** Appear at zoom level 10+, text size 10pt
- **Filters:** Combine with AND logic (show lands matching ALL active filters)
  - Land Type: WMA, CWMA, CFL, SF, SP, NRMA, NEA, FMA, Range
  - Species: Deer, Turkey, Waterfowl, Bear, Small Game
  - Weapon/Method: Archery, Firearms, Muzzleloader
  - Access: Sunday Hunting, No Reservation, ADA Accessible
- **AI Filter Control:** Chat can programmatically set filters and navigate to map

### Scout Tab (V2)
- Full Mapbox map (same layers as MapScreen) + 7-button overlay toolbar
- PlanSidebar: Slide-out panel listing hunt plans + saved tracks with visibility toggles
- PlanCreationFlow: 4-step wizard (Name → Parking → Annotate → Save)
- AnnotationLayer: Reusable Mapbox renderer for waypoints/routes/areas
- TrackMeBar: Bottom bar GPS recorder (time, distance, speed, elevation gain/loss)
- MeasureTool: Tap points to measure distance + bearing between segments
- Plans and tracks can independently be exported to Deer Camp

### Deer Camp Tab (V2)
- Two modes: camp list (cards) and camp map (full Mapbox)
- Renders all 5 annotation types: waypoints, routes, areas, tracks, photo pins
- Member management panel: Avatars, role badges, pin/photo counts
- Activity feed panel: Last 30 actions with member colors + timestamps
- Photo upload modal: Geotags pin at GPS location with optional caption
- Local-first MVP (real-time collaboration deferred to V3)

### State Management
- **Context Providers:**
  - `ActivityModeContext` — Current activity mode, mode settings
  - `ScoutDataContext` — Hunt plans, GPS tracks (AsyncStorage-backed V2)
  - `DeerCampContext` — Camps, members, shared annotations, photos (AsyncStorage-backed V2)
- **AsyncStorage Usage:** Persists across app launches
- **WatermelonDB:** Schema defined in `schema.ts` but not active until backend sync Phase 3

## Build Notes

### Build Environment
- **Build Path:** `/Users/davidstonko/Documents/huntmaryland-build` (no spaces — Hermes requirement)
- **New Architecture:** DISABLED (`RCT_NEW_ARCH_ENABLED=0`) due to Node 25 codegen crash
- **Pod Install Command:** `cd ios && RCT_NEW_ARCH_ENABLED=0 pod install`
- **TypeScript Before Build:** Always run `npx tsc --noEmit` — 0 errors required
- **DerivedData:** Clean if switching between configurations (`rm -rf ~/Library/Developer/Xcode/DerivedData/*`)
- **Xcode Archive:** Target iPhone 12+ (iOS 15+)

### Code Quality Checks
- TypeScript: `npx tsc --noEmit` — 0 errors
- Unused imports: Review and remove before each build
- Linting: ESLint configured in `.eslintrc.js`
- Pre-commit: Consider adding hooks to enforce TS/lint checks

## What Landed 2026-05-02 (V2.4.0 Audit Session)

22 audit iterations + DNR research pass + user-caught overlap fix. 33
V2.4 commits, ~30 bugs fixed. See `RELEASE_NOTES_V2.4.md` for the
user-facing summary.

**Live-simulator BLOCKERs (sim audit is non-negotiable per user
directive 2026-05-02):**
1. ScoutScreen opened to San Francisco (Cupertino default GPS) —
   missing `inMaryland` geofence. Fixed `7dda956b`. Same gap on
   HoneyHoleScreen.
2. ScoutDataContext deref'd `database.get()` while database is null
   in V2.4 — plans + tracks never loaded. Fixed `0f5ce9cf`.
3. Hunt Map overlay stack visually collided — countBadge +
   MapFilterPanel + overlayPickerWrap. User-caught after 21 prior
   iterations missed it. Fixed `6b1e7d7d`. Pattern locked in
   memory/audit_overlap_check_2026_05_02.md: every screen with
   position-absolute overlays must enumerate (top, height) and
   verify each stack has ≥ 8pt gap.

**Cross-module audit pattern caught repeatedly:**
- 4 instances of "config fixed but consumers not swept" (email
  leak; ?code= URL format on FishCamp + GroupCamp; API_BASE_URL
  hardcoded localhost in 3 files; inviteCode generation across
  3 contexts)
- 3 instances of doc/code drift on storage layer
  (ActivityModeContext, ScoutDataContext, syncService)

**DNR research pass — 1 class miss + several single-miss:**
- CLASS MISS: trapping/furbearer activity entirely absent. 11
  species, Furtaker license tier, Trapper Education — none modeled.
  Fix: new isTrappingQuery + handler in src/data/chatKnowledge.ts.
- Single-miss: harvest stats (84,201 deer 2024-25, 4,851 turkeys);
  2026 trout stocking +26% (240k); 2025 senior license trout-stamp
  removal; PFD requirements; bowfishing cross-ref.

**Released:** V2.4.0 build 1. Versions aligned in package.json,
src/config.ts, ios/HuntPlanAI.xcodeproj/project.pbxproj. tsc clean,
112 jest / 2680 / 0 failed. wiringIntegrity went from ~138 to ~196
assertions today.

## What Landed 2026-04-26 (Fork Consolidation + V2.3 Work)

A full day's work consolidating two divergent forks into this canonical repo, fixing UX bugs surfaced during the live audit, building out the gear-monetization surfaces, and adding sub-style hierarchies. Single-day delta vs the prior `1d7e65a0 V2.2.0` HEAD: **103 modified files + 340 new files, 13,005 insertions, 5,756 deletions, 0 tsc errors, 102 jest suites / 2438 passed**.

**Big-picture changes:**

1. **Fork consolidation** — merged `huntplan-ai/mobile/` (V2.3 phantom fork — 51 Phase A.1–A.51 services, briefing cards, journal export, trip aggregator) into this canonical tree. Resolved 40 conflicts per-file. Deleted the phantom fork at end of day. Audit + manifest at `outputs/MERGE_MANIFEST.md`. See [fork_consolidation_2026_04_26.md](memory file) for the full why.

2. **Tab structure expanded across all four modes:**
   - Hunt: 5 → **6 tabs** (added Gear with hunting-rifle silhouette icon, "Deer / Camp" label wrapped to two lines)
   - Fish: 4 → **5 tabs** (added Gear with fishing-rod silhouette icon)
   - Hike: 4 → **5 tabs** (added Gear with hiking-boot silhouette icon)
   - Camp: unchanged 5 tabs

3. **Map UX bugs fixed (10):**
   - Hunt map drag/pan was blocked because Camera had `centerCoordinate` as a live prop (every re-render snapped the camera back). Switched to `defaultSettings`.
   - Wind/scent-cone widget collapsed-by-default to a small `Wind: NW 8 mph ▼` pill (was covering middle of map). Tap to expand. State persisted to AsyncStorage.
   - Top overlay spacing tightened — wind pill moved from top:200 → top:90 directly under WeatherOverlay.
   - Legend dropdown anchored at top:12 instead of jumping to top:130 when expanded.
   - Fish map: filter chip labels compacted (Boat Ramp → Ramp etc.) so 5 chips fit on iPhone 17 Pro width. Right-side controls bumped to bottom:140 to clear search bar.
   - Hike map: AT info panel moved to top:110 with × dismiss button, units formatted properly (3,849,073 m → "X mi off").
   - Bottom tab text contrast: oak/textMuted (~2.4:1, fails WCAG) → mdGold/textSecondary (~11.5:1 / 4.9:1, both pass AA).
   - Gear tier filter pill contrast: same fix.

4. **Deer Camp create flow** — fourth-pass fix. Replaced iOS `<Modal presentationStyle="fullScreen">` for CampAreaPicker with a conditional absolute-positioned overlay. iOS UIKit modal-stack races couldn't block it anymore.

5. **API base URL** defaults to Render production in both dev and prod (was `__DEV__ ? localhost : render`, broke every fresh dev machine without a local FastAPI). Override via `EXPO_PUBLIC_API_BASE_URL`.

6. **Gear monetization surface (only revenue path right now — no ads / sponsorships / IAP):**
   - **By David** featured cards with gold left-border + "By David" badge + italicized notes for items where David picked the gear personally.
   - **Mode-aware category picker:** Hunt has 9 categories (Whitetail · Turkey · Sika · Bear · Optics · Stands · Calls · Clothing · Accessories). Fish has 4 (Fly · Streams / Lakes & Ponds / Bay · Shore / Bay · Boat). Hike has 4 (Day Hike · Backpacking · Winter · Rain).
   - **subStyle hierarchy** within categories that benefit from it. Fly fishing splits Euro Nymph / Conventional / Both. Whitetail splits Saddle / Treestand / Both (data infra in place; David's saddle vs treestand picks pending).
   - **26 fly-fishing creator picks** from David's actual Maryland kit (Patagonia Atom Sling, Orvis Clearwater Waders, Korkers boots, Echo Shadow II 10' 3wt, Sage R8 Core, Rio Premier Gold, Ventures Fly Co MD assortment, etc.) all tagged with subStyle.
   - **All 23 ASIN-based URLs verified live** + **0 broken** + **0 missing affiliate tag** (mdoutdoors1-20). Verification report at `GEAR_LINK_VERIFICATION_2026_04_26.md`.
   - **11 gap-fill items added** per agent's review: Berkley PowerBait Variety, Shimano Sienna FE Combo, Crappie Jig Assortment, Leatherman Signal, Loon Forceps, Nikon Prostaff 7S binoculars, Dead Down Wind detergent, Ameristep ground blind, Smartwool Merino base layer, OR Crocodile gaiters, Esbit pocket stove.
   - **Bass/Freshwater list reordered** (utility items earlier, premium last) per the gear-business review.

7. **WindWidgetPlayground screen** — new dev-only screen at Settings → Dev tools → Wind widget playground. Drag the wind widget around a stage, tweak 12 style knobs (padding, radius, fonts, etc.), copy the resulting StyleSheet snippet to clipboard.

8. **Build config** — `react-native.config.js` now has explicit autolink overrides for `react-native-fs`, `react-native-image-picker`, `react-native-share` (RN 0.76's stricter autolinker silently skips these). Without this the app crashes at boot with `new NativeEventEmitter(null)`. Mapbox token fallback restored in `src/config.ts`.

9. **Documentation written today** (all in repo root):
   - `MERGE_MANIFEST.md` — fork-consolidation manifest
   - `GEAR_BUSINESS_REVIEW_2026_04_26.md` — agent's 706-line gear-monetization review
   - `GEAR_LINK_VERIFICATION_2026_04_26.md` — Amazon-link verification report
   - `AI_MONETIZATION_PLAN.md` — directive for AI chat to surface gear cards
   - `dev_relaunch.sh` — script to detach Metro from TTY and rebuild

10. **Open / deferred:**
    - Brand affiliate partnerships (Patagonia / Sage / Korkers / REI) — user explicitly deferred
    - AI chat gear-card render (Phase 2 of monetization plan — biggest revenue lever, ~1-2 days of work)
    - Fill out non-fly-fishing categories with David's actual creator picks
    - 5-week A/B test cadence per the gear-review report

## Key Decisions (Do Not Change)

### Bundle ID — LOCKED
- **Value:** com.davidstonko.huntmaryland
- **Reason:** Registered with Apple Developer Program
- **Status:** IMMUTABLE — changing breaks app linking and App Store indexing

### OnX Integration — DEFERRED INDEFINITELY
- OnX has no public API
- Scrapers face DMCA takedowns
- Decision: Build fully standalone Mapbox-based map stack instead
- Current app provides feature parity without OnX dependency

### Username-Based Profiles
- Users choose whether to be anonymous or use real names
- NOT email-based authentication
- Supports community sharing without requiring accounts

### Persistent Disclaimer
- App footer displays: "Always verify regulations with Maryland DNR"
- Users see this on every session start
- Protects both app and users from regulatory misunderstandings

### WatermelonDB
- Schema defined in `schema.ts` but not actively used in V2
- Ready for Phase 3 backend sync
- Do NOT activate without comprehensive backend support

## Current Tab Structure

### Hunt Mode (V2.3 — 6 tabs after 2026-04-26 merge)
```
Map | Scout | AI | Deer Camp | Gear | Info
```
- **Map:** Full Mapbox with 192 lands, ranges, search, filters, 3D terrain
- **Scout:** Hunt planning — create plans, record GPS tracks, annotate locations
- **AI:** Chat-based assistant with regulations knowledge, filter control
- **Deer Camp:** Collaborative shared maps with friends/hunting groups (label rendered as two-line "Deer / Camp")
- **Gear:** Curated hunting gear with Amazon affiliate links (mdoutdoors1-20). Category picker: Whitetail · Turkey · Sika · Bear · Optics · Stands · Calls · Clothing · Accessories. Whitetail has subStyle hierarchy (saddle / treestand / both). Hunting-rifle silhouette tab icon.
- **Info:** Regulations (segmented: Regulations | Links & Guides | Out of State) + feedback FAB

### Fish Mode (V2.3 — 5 tabs after 2026-04-26 merge)
```
Map | Spots | AI | Gear | Info
```
- **Map:** Full Mapbox with 737 angler-access sites, stocking, tide stations. Filters: Ramp · Soft · Shore · Trout · P&T (compacted from "Boat Ramp" / "Soft Launch" / "Shore Only" so all 5 fit on iPhone 17 Pro width).
- **Spots:** Fishing spot planning — save spots, record fishing trips, annotations
- **AI:** Fishing-focused chat — regulations, species ID, stocking reports, tides
- **Gear:** Curated fishing gear. Category picker: Fly · Streams / Lakes & Ponds / Bay · Shore / Bay · Boat. Fly Fishing has subStyle hierarchy (Euro Nymph / Conventional / All) and a "By David" featured section with 26 of David's personal Maryland fly fishing picks. Fishing-rod silhouette tab icon.
- **Info:** Segmented (Regulations | Links & Guides | Out of State) — fishing-specific content

### Camp Mode (Phase 5A — implemented)
```
Camp Map | Gear | AI | Group Camp | Resources
```
- **Camp Map:** Full Mapbox with MD campsite locations, park boundaries, amenities filters (water, restrooms, RV hookups), accessibility features
- **Gear:** Curated camping gear picks with Amazon affiliate links (Amazon Associates, mdoutdoors-20 tag)
- **AI:** Camp-focused RAG chat — trip planning, weather, gear recommendations, park regulations
- **Group Camp:** Collaborative shared camping maps with friends/camping groups (mirrors Deer Camp)
- **Resources:** Segmented (Regulations | Links & Guides | Out of State) — camping-specific content, park contacts. Sub-screens: Visitor Guide (CampOutOfStateScreen), Trip Planner (CampTripPlannerScreen).

### Hike Mode (V2.3 — 5 tabs after 2026-04-26 merge)
```
Map | Trails | Trip | Gear | Info
```
- **Trail Map:** Full Mapbox with AT route polyline (40.9 mi), 9 shelters, 10 trailheads, 12 landmarks. Four States Challenge overlay. Filter toggles for each layer.
- **Trail Guide:** Section-by-section AT browser (5 sections, shelter details, points of interest). Segmented: Sections | Shelters | Points of Interest.
- **AI:** Hiking-focused RAG chat — AT info, shelters, water sources, trailheads, Four States Challenge, day hike suggestions
- **Resources:** Segmented (Trail Info | Links & Guides | Four States) — official orgs, maps, guides, community forums, challenge resources. Sub-screens: Visitor Guide (HikeOutOfStateScreen), AT Trip Planner (ATTripPlannerScreen).

## Maryland Data

### Data Sources (Phase 4 Fish)
- **GIS/Fishing Locations:** MD DNR ArcGIS REST (dnr.geodata.md.gov) — PublicFishingAccessSites (307), TroutStockingActivities (68), FishingGrounds (61 polygons), FishHatcheries (16)
- **Fishing Regulations:** eRegulations.com/maryland/fishing, MD DNR Fisheries regulations page
- **Tidal Data:** NOAA Tides & Currents API (api.tidesandcurrents.noaa.gov) — 10+ MD stations
- **Stocking Reports:** DNR TroutStockingActivities FeatureServer (live updates during stocking season)
- **Licenses:** MD DNR Sport Fishing Licenses page, eRegulations licenses & fees
- **Striped Bass 2026:** 19-24" slot, 1/day, C&R April, harvest May 1+, spawning river closures
- **Boat Ramps:** Included in PublicFishingAccessSites (Ramp=Yes/No field)
- **Water Access Guide:** dnr.maryland.gov/boating/pages/water-access/boatramps.aspx

### Data Sources (V2 Hunt)
- **Seasons/Regulations:** eRegulations.com/maryland, MD DNR Hunter's Guide, Hunting Seasons Calendar PDF
- **GIS/Land Boundaries:** Maryland iMap (data.imap.maryland.gov), MD DNR WMA maps
- **Land Details:** DNR detail page scrapes (77 lands), DNR regional pages (75 lands)
- **Ranges:** eRegulations inventory (14 shooting ranges)
- **Parking:** Collected from DNR detail pages, geocoded
- **Contacts:** Land manager phone/email from official sources
- **Harvest Data:** MD DNR annual reports (Phase 3+)
- **Weather:** NOAA weather.gov API
- **Terrain:** Mapbox terrain tiles (Phase 3 — 3D terrain)

### Data Coverage (V2)
- **Public Hunting Lands:** 192 locations
- **Shooting Ranges:** 14 locations
- **GIS Polygons:** 124 boundaries (from MD iMap FeatureServer)
- **Point Markers:** 68 center-point markers + 124 polygon labels
- **Coverage:** 72 detail-enriched, 67 parking locations, 70 contacts, 72 access notes, 135 website URLs, 64 PDF map links

## Development Phases

- **V1** (shipped 2026-03-30): Hunting MVP — 6 tabs, regulations, map, AI, social, resources
- **V2** (shipped 2026-03-30): Scout tab + Deer Camp tab + branding update to MDHuntFishOutdoors
- **V3** (shipped 2026-04-03): 3D terrain, backend sync, forum, feedback, out-of-state hunters
- **Phase 4** (started 2026-04-04): Fishing module — 5 tabs mirroring hunt (Fish Map, Spots, AI, Fish Camp, Resources). 436+ GIS locations, NOAA tides, live stocking. See FISHING_BUILD_PLAN.md.
- **Phase 5A** (started 2026-04-05): Camping module — 4 tabs (Camp Map, Gear, AI, Group Camp, Resources). MD state parks + private campgrounds, curated gear with affiliate links. See CAMPING_BUILD_PLAN.md.
- **Phase 5B** (started 2026-04-11): Hiking module — 4 tabs (Trail Map, Trail Guide, AI, Resources). AT Maryland data (40.9 mi route, 9 shelters, 10 trailheads, 12 landmarks, Four States Challenge). AT overlay on CampMapScreen. Trail browser, visitor guides, fishing GIS polygons (40 grounds).
- **Phase 5C** (started 2026-04-11): Cross-cutting services — RevenueCat subscriptions, Sentry crash reporting, analytics pipeline, Universal Links for invites, multi-state expansion architecture (VA, PA state packs), backend test suite (45+ tests)
- **Phase 5D** (started 2026-04-11): Analytics dashboard + deep data integration — React admin panel at /dashboard, 7 backend aggregation endpoints, 47+ knowledge scrape JSON files (508K data), Guide Directory (61 businesses), CWD zone map overlay, artificial reef + snakehead hotspot overlays, expanded AI knowledge bases (5,933 lines across 4 modules, 46+ intent handlers), MONETIZATION_PLAN.md with 3-tier revenue strategy
- **Phase 6** (future): Multi-state expansion (VA, PA data pipelines), MATLAB analytics
- **Phase 7** (post-launch): Monetization — ads, premium features, sponsored content
- **Orchestration Plan:** See ORCHESTRATION_PLAN.md for comprehensive 10-sprint execution plan covering all remaining work (Sprints 1–6 = ~10 days to next App Store submission, Sprints 7–10 = full platform maturity)

## Key Files & Modules

### Root Level
- `App.tsx` — Root component, provider tree, splash screen, disclaimer flow, service initialization (Sentry, RevenueCat, analytics)
- `config.ts` — Centralized app config: API_BASE_URL, WS_BASE_URL, MAPBOX_ACCESS_TOKEN, REVENUECAT_API_KEY, SENTRY_DSN, feature flags
- `tsconfig.json` — TypeScript strict mode configuration
- `jest.config.js` — Jest test runner configuration

### Navigation
- `navigation/AppNavigator.tsx` — Bottom tab navigator, mode-aware tab configuration

### Screens (14 Hunt + 6 Fish + 5 Camp + 4 Hike + 3 Cross-Mode)
- `screens/MapScreen.tsx` — Main map with filters, search, land details
- `screens/ScoutScreen.tsx` — Plan creation, GPS tracking, annotation
- `screens/AIScreen.tsx` — Chat assistant
- `screens/DeerCampScreen.tsx` — Camp list and camp map view
- `screens/ResourcesHubScreen.tsx` — Regulations and links
- Plus: SocialScreen, ProfileScreen, AuthScreen, etc.

### Fish Mode Screens (Phase 4 — planned)
- `screens/FishMapScreen.tsx` — Full Mapbox map with 436+ fishing locations (REBUILD from link cards)
- `screens/FishSpotsScreen.tsx` — Fishing spot planning (mirrors ScoutScreen)
- `screens/FishCampScreen.tsx` — Collaborative fishing maps (mirrors DeerCampScreen)
- `screens/FishRegulationsScreen.tsx` — Fishing regs: Seasons, Can I Fish?, Licenses
- `screens/FishResourcesScreen.tsx` — Curated fishing links & guides
- `screens/FishOutOfStateScreen.tsx` — Nonresident fishing guide

### Camp Mode Screens (Phase 5A — implemented)
- `screens/CampMapScreen.tsx` — Full Mapbox map with 45 campgrounds (7 type filters), AT trail overlay toggle, amenity filters
- `screens/CampGearScreen.tsx` — Curated camping gear picks with product cards + Amazon affiliate links
- `screens/GroupCampScreen.tsx` — Collaborative shared camping maps (mirrors DeerCampScreen)
- `screens/CampResourcesScreen.tsx` — Camping regulations, park contacts, links & guides
- `screens/CampOutOfStateScreen.tsx` — Nonresident camping visitor guide (8 collapsible sections)

### Hike Mode Screens (Phase 5B — implemented)
- `screens/HikeMapScreen.tsx` — Full Mapbox with AT route polyline, shelters, trailheads, landmarks. Filter toggles, Four States Challenge overlay, resource modal, detail panels.
- `screens/HikeTrailBrowserScreen.tsx` — Section-by-section AT trail browser (5 sections, 9 shelters, POIs). Segmented: Sections | Shelters | Points of Interest.
- `screens/HikeResourcesScreen.tsx` — Segmented (Trail Info | Links & Guides | Four States) — AT resources, guides, challenge info
- `screens/HikeOutOfStateScreen.tsx` — Nonresident hiking visitor guide (7 collapsible sections, day hike suggestions)

### Trip Planner Screens (Phase 5B — implemented)
- `screens/ATTripPlannerScreen.tsx` — 4-step wizard (trip type → season → conditions → group) generates personalized AT packing list with weights + Amazon affiliate links
- `screens/CampTripPlannerScreen.tsx` — Location-aware camping trip planner (campground → month → style → gear list). Rules engine adapts to Assateague vs Deep Creek vs mountains. 80+ gear items.

### Cross-Mode Screens (Phase 5B/5D — implemented)
- `screens/SubscriptionScreen.tsx` — RevenueCat subscription management: Free/Pro/Team tiers, monthly/annual toggle, feature comparison
- `screens/StatePackScreen.tsx` — Multi-state data pack browser: download/delete/switch state packs (MD built-in, VA/PA downloadable)
- `screens/GuideDirectoryScreen.tsx` — Directory of 61+ local service providers: 15 fishing charters, 9 hunting guides, 8 taxidermists, 6 processors, 6 bait shops, 7 archery shops, 6 kayak rentals, 4 outfitters. Horizontally-scrollable tab selector. Wired into hunt + fish Resources stacks.

### Scout Components
- `components/scout/PlanSidebar.tsx` — List of plans/tracks with visibility toggles
- `components/scout/PlanCreationFlow.tsx` — 4-step wizard
- `components/scout/AnnotationLayer.tsx` — Mapbox renderer for all annotation types
- `components/scout/CompassOverlay.tsx` — Animated compass with cardinal directions
- `components/scout/TrackMeBar.tsx` — GPS recording UI
- `components/scout/MeasureTool.tsx` — Distance/bearing measurement

### Context Providers
- `context/ActivityModeContext.tsx` — Activity mode + settings
- `context/ScoutDataContext.tsx` — Plans, tracks (AsyncStorage-backed)
- `context/DeerCampContext.tsx` — Camps, members, annotations, photos (AsyncStorage-backed)
- `context/FishingDataContext.tsx` — Fishing spots, trips, catches (AsyncStorage-backed, Phase 4)
- `context/GroupCampContext.tsx` — Camping groups, campsites, shared annotations, gear lists (AsyncStorage-backed, Phase 5A)

### Services
- `services/api.ts` — Backend API calls (future)
- `services/locationService.ts` — GPS location tracking, geofencing
- `services/weatherService.ts` — NOAA weather API integration
- `services/mapboxService.ts` — Offline tiles, style management
- `services/purchaseService.ts` — RevenueCat subscription wrapper: 3 tiers (Free/Pro/Team), feature gates, AsyncStorage-cached entitlements, graceful SDK fallback
- `services/crashReportingService.ts` — Sentry crash reporting wrapper: captureException, breadcrumbs, performance transactions, PII stripping, graceful SDK fallback
- `services/analyticsService.ts` — Offline-first analytics: 8 event types, AsyncStorage queue (max 500), auto-flush 60s, backend POST /api/v1/analytics/events
- `services/deepLinkService.ts` — Universal Links for camp invites: URL handler, custom scheme fallback, iOS share sheet integration
- `services/statePackService.ts` — Multi-state data pack lifecycle: download, install, delete, activate. MD (built-in), VA/PA (downloadable, Pro-tier)

### Types
- `types/scout.ts` — Hunt plan, track, waypoint, annotation types
- `types/deercamp.ts` — Camp, member, shared annotation, activity feed types
- `types/common.ts` — Shared enums (ActivityMode, FilterType, etc.)
- `types/statePack.ts` — StateCode, StatePack, StatePackManifest, StateDataBundle interfaces

### Data & Theme
- `data/maryland-lands.json` — 192 hunting lands + 14 ranges (generated by v2 pipeline)
- `data/regulations.json` — MD hunting seasons, bag limits, weapon restrictions
- `data/chatKnowledge.ts` — Hunt AI knowledge base (1,378 lines, 16 intent handlers: seasons, bag limits, weapons, WMAs, licenses, CWD, harvest stats, bear, turkey, waterfowl, special hunts, managed hunts, reporting, hunter ed, dog training, sika, small game, accessible hunting, public land permits)
- `data/marylandFishingData.ts` — 436+ fishing locations (Phase 4, generated by fishing pipeline)
- `data/mdFishingGISData.ts` — 40 fishing ground polygons GeoJSON (bay, river, lake, ocean) with species + type metadata (Phase 5B)
- `data/marylandFishingRegs.ts` — Structured fishing regulations by species (Phase 4)
- `data/fishingChatKnowledge.ts` — Fish AI knowledge base (2,240 lines, 15 intent handlers: seasons, species, access, tides, stocking, bait, striped bass 2026, advisories, license fees, crabbing, boating safety, snakehead, fly fishing, trophy fish, ice fishing, artificial reefs, spawning closures, community reports)
- `data/marylandCampsiteData.ts` — 45 MD campgrounds: state parks, state forests, federal, county, private RV, KOA, glamping (Phase 5A, expanded 2026-04-11)
- `data/curatedCampingGear.ts` — Curated camping gear picks with Amazon product data + affiliate links (Phase 5A)
- `data/campingChatKnowledge.ts` — Camp AI knowledge base (1,312 lines, 7 intent handlers: reservations, campfires, fees, KOA, glamping, private campgrounds, primitive camping, trail races, state park details, cabin rentals, winter activities)
- `data/campingResources.ts` — Park regulations, contact info, links (Phase 5A)
- `data/appalachianTrailData.ts` — AT Maryland: route (25 waypoints), 9 shelters, 10 trailheads, 12 landmarks, 5 side trails, 25 resources, Four States Challenge (Phase 5B)
- `data/hikingChatKnowledge.ts` — Hike AI knowledge base (1,003 lines, 8 intent handlers: AT info, shelters, water, day hikes, Four States, other MD trails, waterfalls, rock climbing, scenic overlooks, mountain biking, geocaching, endangered species)
- `data/hikingResources.ts` — Curated AT hiking resources by category: official, maps, guides, blogs, community, challenge (Phase 5B)
- `data/curatedHikingGear.ts` — Hiking gear with ASINs, weights, seasonal tags + TripPlannerGearItem interface + rules engine helpers (Phase 5B)
- `data/guideServicesData.ts` — 61+ local service providers: fishing charters, hunting guides, taxidermists, processors, bait shops, archery shops, kayak rentals, outfitters (Phase 5D monetization)
- `data/cwdZonesData.ts` — CWD management zone polygons for 7 western MD counties + CWD_INFO facts (Phase 5D)
- `data/artificialReefData.ts` — 8 artificial reef GPS locations + 5 snakehead hotspot locations as GeoJSON (Phase 5D)
- `data/statePackRegistry.ts` — Registry of 3 state packs (MD, VA, PA) with metadata and feature counts
- `theme/colors.ts` — Maryland color palette (mdRed, mdGold, mdBlack, mdWhite, oak, tan, sand, water, blood, brass, forest, corn, etc.)
- `theme/typography.ts` — Font sizes, weights, line heights
- `theme/spacing.ts` — Consistent padding/margin scale

### Assets
- `assets/icons/` — SF Symbols, feature icons
- `assets/icon/` — App logo (1024x1024 PNG), source files (SVG, JSON)
  - `deer_silhouette.svg` — Deer icon
  - `maryland_outline.json` — MD state boundary
  - `logo_source.html` — Logo design reference
- `assets/images/` — Splash screen photos, placeholder images

### Test Suite (174 tests, 6 suites)
- `__tests__/setup.ts` — Shared mocks (AsyncStorage, RN modules, Mapbox, RevenueCat, Sentry)
- `__tests__/config.test.ts` — Config exports, feature flags, app metadata
- `__tests__/activityMode.test.tsx` — ActivityModeContext default, switching, persistence
- `__tests__/analyticsService.test.ts` — Event tracking, queue limits, flush behavior
- `__tests__/purchaseService.test.ts` — SDK fallback, feature gates, tier hierarchy
- `__tests__/offlineMaps.test.ts` — Region metadata, geographic bounds, state management
- `__tests__/navigation.test.tsx` — Tab counts per mode (Hunt=5, Fish=5, Camp=5, Hike=4)

## Development Workflow

### Before Any Commit
1. Run `npx tsc --noEmit` — verify 0 errors
2. Remove unused imports
3. Review theme/color references (no hardcoded values)
4. Check component prop types are exported/documented
5. Verify AsyncStorage serialization for context state

### Before Any Build/Archive
1. `npx tsc --noEmit` — final TS check
2. `cd ios && rm -rf Pods && RCT_NEW_ARCH_ENABLED=0 pod install`
3. Clean DerivedData if switching configurations
4. Verify info.plist has all required keys (e.g., NSLocationAlwaysAndWhenInUseUsageDescription)
5. Check version numbers in package.json and Xcode project

### Build Command (from project root)
```bash
cd huntmaryland-build && npx react-native run-ios --device --configuration Release
```

## Important Notes for AI Assistants

- **Do not change Bundle ID** — it's registered with Apple and locked to the app
- **Always check theme/colors.ts** before hardcoding colors
- **Activity modes determine tab structure** — hunt mode has Scout + Deer Camp; other modes may differ
- **AsyncStorage is V2 state layer** — WatermelonDB not active yet
- **TS strict mode enforced** — all code must compile with 0 errors
- **Offline-first is non-negotiable** — assume no network on every feature
- **Maryland branding throughout** — use MD flag colors, crab imagery, local terminology
- **Disclaimer footer is persistent** — users must always see "verify with MD DNR" message
- **OnX is not an option** — do not suggest OnX integration or data scraping

## Contact & Attribution

- **Project Owner:** David Stonko
- **Repository:** GitHub (check for URL in project docs)
- **Website:** https://davidstonko.github.io/huntmaryland-site/
- **Privacy Policy:** https://davidstonko.github.io/huntmaryland-site/privacy.html

---

Last Updated: 2026-04-12
