# CLAUDE.md — AI Assistant Context for MDHuntFishOutdoors

This file provides essential context for AI assistants working on the MDHuntFishOutdoors codebase.

## Project Identity

- **App Name (App Store):** MDHuntFishOutdoors
- **Apple ID:** 6761347484
- **Bundle ID:** com.davidstonko.huntmaryland (DO NOT CHANGE — registered with Apple)
- **Xcode Project Name:** HuntPlanAI (structural rename deferred to future phase)
- **Display Name:** MDHuntFishOutdoors
- **Umbrella Brand:** OutdoorsMaryland (cross-activity branding)
- **Activity Mode Labels:** MD Hunt, MD Fish, MD Hike, MD Crab, MD Boat

## Project Mission

Consolidate all disparate Maryland DNR information (regulations, maps, seasons, bag limits, public land data) into one free, offline-first iPhone app. Not a replacement for OnX — a standalone map stack with community forums. Starting with hunting (V1 shipped 2026-03-30), expanding to fishing, crabbing, boating, and hiking.

## Tech Stack

### Frontend
- **Framework:** React Native 0.76.6 (iOS only, bare — no Expo)
- **Language:** TypeScript 5.5 (strict mode, 0 errors required)
- **Maps:** Mapbox GL Native (@rnmapbox/maps 10.1.35)
- **Navigation:** React Navigation 7.0 (bottom tab navigator)
- **Local Persistence:** AsyncStorage (V2), WatermelonDB schema ready for backend sync (Phase 3)
- **State Management:** Context API (ActivityModeContext, ScoutDataContext, DeerCampContext)
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
- App supports 5 activity modes: hunt, fish, hike, crab, boat
- `ActivityModeContext` manages current mode + related settings
- `ActivityModePicker` dropdown in header enables mode switching
- Tab configuration changes per activity mode (e.g., Scout tab specific to Hunt mode in V2)
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

## Current Tab Structure (V2 Hunt Mode)

```
Map | Scout | AI | Deer Camp | Resources
```

### Tab Descriptions
- **Map:** Full Mapbox with lands, ranges, search, filters
- **Scout:** Hunt planning — create plans, record GPS tracks, annotate locations
- **AI:** Chat-based assistant with regulations knowledge, filter control
- **Deer Camp:** Collaborative shared maps with friends/hunting groups
- **Resources:** Regulations (segmented: Regulations | Links & Guides) + feedback FAB

## Maryland Data

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
- **V2** (target 2026-04-04): Scout tab + Deer Camp tab + branding update
- **Phase 3** (Weeks 15-22): 3D terrain, backend sync, forum marketplace, multi-state (VA, PA), MATLAB analytics
- **Phase 4** (Weeks 23-30): Fishing module — MD fishing regulations, stocking reports, boat ramps, tidal charts
- **Phase 5** (Weeks 31+): Crabbing, Boating, Hiking modules
- **Phase 6** (Post-launch): Monetization — ads, premium features, sponsored content

## Key Files & Modules

### Root Level
- `App.tsx` — Root component, provider tree, splash screen, disclaimer flow
- `tsconfig.json` — TypeScript strict mode configuration

### Navigation
- `navigation/AppNavigator.tsx` — Bottom tab navigator, mode-aware tab configuration

### Screens (14 total for Hunt mode)
- `screens/MapScreen.tsx` — Main map with filters, search, land details
- `screens/ScoutScreen.tsx` — Plan creation, GPS tracking, annotation
- `screens/AIScreen.tsx` — Chat assistant
- `screens/DeerCampScreen.tsx` — Camp list and camp map view
- `screens/ResourcesHubScreen.tsx` — Regulations and links
- Plus: SocialScreen, ProfileScreen, AuthScreen, etc.

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

### Services
- `services/api.ts` — Backend API calls (future)
- `services/locationService.ts` — GPS location tracking, geofencing
- `services/weatherService.ts` — NOAA weather API integration
- `services/mapboxService.ts` — Offline tiles, style management

### Types
- `types/scout.ts` — Hunt plan, track, waypoint, annotation types
- `types/deercamp.ts` — Camp, member, shared annotation, activity feed types
- `types/common.ts` — Shared enums (ActivityMode, FilterType, etc.)

### Data & Theme
- `data/maryland-lands.json` — 192 hunting lands + 14 ranges (generated by v2 pipeline)
- `data/regulations.json` — MD hunting seasons, bag limits, weapon restrictions
- `data/chat-knowledge-base.json` — Pre-indexed MD DNR regulations for RAG
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

Last Updated: 2026-03-30
