# MDHuntFishOutdoors Architecture

## 1. System Overview

MDHuntFishOutdoors is a React Native 0.76.6 iOS application designed for outdoor recreation planning in Maryland. The app follows an offline-first architecture, allowing users to access maps, regulations, and community features without a network connection.

**Current scope (V2):** Standalone local-first app with static data bundled at build time. Users interact with Mapbox-rendered maps, plan hunts in the Scout tab, and collaborate with friends in shared Deer Camp maps.

**Technology stack:**
- Frontend: React Native 0.76.6 + TypeScript, Mapbox GL Native 10.1.35
- State management: React Context API (ActivityModeContext, ScoutDataContext, DeerCampContext)
- Local storage: AsyncStorage for user-created plans, tracks, and camp data
- Mapping: Mapbox GL Native with offline tile support (planned)
- Target platform: iPhone 12+ (iOS 14+)

**Future architecture (V3+):** A Python FastAPI backend with PostgreSQL, PostGIS, and pgvector will enable real-time Deer Camp collaboration, multi-user synchronization, and advanced RAG-based AI responses.

---

## 2. App Lifecycle Flow

The app follows a deterministic boot sequence from launch through to the main navigation stack.

```
┌─────────────────────────────────────┐
│        App Launch (index.js)        │
└─────────────────┬───────────────────┘
                  │
                  ▼
┌─────────────────────────────────────┐
│  RootNavigator (App.tsx)            │
│  - Load async providers             │
│  - Check disclaimer acceptance      │
└─────────────────┬───────────────────┘
                  │
        ┌─────────┴─────────┐
        │                   │
        ▼                   ▼
   ┌─────────────┐   ┌──────────────────┐
   │ Disclaimer  │   │ AnimatedSplash   │
   │ Not Shown   │   │ (2.8s Ken Burns) │
   └─────────────┘   └────────┬─────────┘
        │                      │
        │           ┌──────────┴─────────┐
        │           │                    │
        │           ▼                    ▼
        │    ┌─────────────┐      ┌──────────────┐
        │    │ Disclaimer  │      │ Accepted &   │
        │    │ Shown       │      │ Cached       │
        │    └──────┬──────┘      └──────┬───────┘
        │           │                    │
        └───────────┴────────┬───────────┘
                             │
                             ▼
                  ┌─────────────────────┐
                  │  AppNavigator       │
                  │  (Bottom Tabs)      │
                  │  Activity Mode +    │
                  │  Map/Scout/AI/etc   │
                  └─────────────────────┘
```

**Provider hierarchy:**
```
ActivityModeProvider
  └─ ScoutDataProvider
       └─ DeerCampProvider
            └─ SafeAreaProvider
                 └─ NavigationContainer
                      └─ AppNavigator
```

The AnimatedSplash screen displays for 2.8 seconds with a Ken Burns zoom effect over 4 bundled user photos and 2 emoji scenes. Upon completion, RootNavigator checks AsyncStorage for a disclaimer acceptance flag. If the flag is missing or false, SplashDisclaimer is shown; otherwise, the app proceeds directly to AppNavigator.

---

## 3. Navigation Architecture

The app uses a bottom-tab navigator that dynamically reconfigures based on the selected activity mode. The ActivityModePicker dropdown in the header allows instant switching between Hunt, Fish, Hike, Crab, and Boat modes.

**Hunt mode (5 tabs, currently implemented):**
- **Map:** Full Mapbox view of Maryland public lands with filters
- **Scout:** Hunt planning tools — plans, GPS tracks, annotations
- **AI:** Chat interface for regulations and planning advice
- **Deer Camp:** Shared collaborative maps for hunting groups
- **Resources:** Regulations, links, guides, and feedback system

**Fish mode (3 tabs, structure only):**
- **Map:** Fishing locations, access points, and boat ramps
- **AI:** Fishing-specific advice and stocking information
- **Resources:** Fishing regulations, tidal charts, guides

**Hike/Crab/Boat modes (3 tabs each, coming soon):**
- **Map:** Mode-specific locations
- **AI:** Mode-specific assistance
- **Resources:** Mode-specific information

The header includes the Maryland flag stripe branding and a prominent ActivityModePicker for mode switching. Tab labels and icons adapt to the current mode (e.g., "MD Scout" in Hunt mode, "MD Fish Spots" in Fish mode).

---

## 4. State Management

Three React Contexts handle all persistent and transient state. This approach keeps the codebase simple and avoids external state libraries, which is appropriate for V2's scope.

### ActivityModeContext
Tracks the current activity mode (hunt, fish, hike, crab, boat) and persists to AsyncStorage. Every screen can access the current mode via `useActivityMode()` hook to display mode-specific content, labels, and navigation tabs.

### ScoutDataContext
Manages hunt plans and GPS tracks scoped to the Scout tab. Plans include a name, parking location, and a collection of annotations (waypoints, routes, areas). Tracks are recorded GPS paths with elevation and distance metadata. The context provides CRUD operations: `createPlan()`, `updatePlan()`, `deletePlan()`, `savePlans()`, `loadPlans()`, and equivalent methods for tracks. All data is persisted to AsyncStorage at every mutation.

### DeerCampContext
Manages shared Deer Camp maps, including camps, members, annotations, activity feed, and photos. A camp is a container for multiple members and shared annotations (all 5 types: waypoints, routes, areas, tracks, photo pins). Each annotation carries a member ID and color for visual distinction. The context provides CRUD for camps, members, and annotations. Photos include geotag coordinates and optional captions. An activity feed logs the last 30 actions with member color dots and timestamps. V2 stores all data in AsyncStorage; V3 will sync to a backend.

All contexts export hooks (`useActivityMode()`, `useScoutData()`, `useDeerCamp()`) for convenient access throughout the component tree.

---

## 5. Map Architecture

The Map tab and Scout tab both render Mapbox GL Native maps. The core map component shares a reusable `PublicLandLayer` that renders 192 Maryland public lands.

**Data source:**
A GeoJSON FeatureCollection with 124 polygon boundaries and 68 center-point markers. Each feature carries metadata: land type, access level, contact info, regulations URL, and a computed color based on land type (e.g., mdRed for WMA, forest green for CFL).

**Styling:**
Mapbox expressions drive all styling: `['get', 'color']` retrieves land-type colors from feature properties. Polygons render with 50% opacity; markers are dual-layer (white circle with colored border) for visibility across zoom levels. Labels appear at zoom 10+ with font size 10.

**Filter system:**
MapFilterPanel overlays a collapsible filter UI on the map. Nine toggles control land type (WMA, CWMA, CFL, SF, SP, NRMA, NEA, FMA, Range), five for species (Deer, Turkey, Waterfowl, Bear, Small Game), three for weapon (Archery, Firearms, Muzzleloader), and three for access (Sunday Hunting, No Reservation, ADA Accessible). Filters combine with AND logic — only lands matching all active filters display. The AI Chat context can programmatically set filters and navigate to the map.

**Interaction:**
Tapping a land marker opens LandInfoPanel, a slide-up detail view with regulations, access hours, parking, contacts, and links to official websites and PDF maps. Users can add waypoints, measure distances, or save the location to a Scout plan.

---

## 6. Scout Tab Architecture

The Scout tab provides a dedicated workspace for planning hunts. ScoutScreen renders a full Mapbox map (with all public land layers) plus a 7-button toolbar overlay and a slide-out PlanSidebar.

**Toolbar buttons (left edge):**
1. **Layers:** Toggle map layers (lands, satellite, terrain)
2. **Filters:** Show/hide MapFilterPanel
3. **Plans:** Show/hide PlanSidebar
4. **Pin:** Tap-to-add a waypoint at map center
5. **Photo:** Open photo picker for geotagged photo upload
6. **Measure:** Activate MeasureTool for distance/bearing measurements
7. **Crosshair (⌖):** Center map on current GPS location

**PlanSidebar:**
A slide-out panel listing all saved hunt plans and tracks. Each plan shows a name, parking location, and count of annotations. Users toggle visibility per plan on the map (annotations fade in/out). A long-press menu allows export to Deer Camp, rename, or delete. Tracks display similarly with distance and duration metadata. The creation workflow launches via a floating action button (FAB) at the bottom.

**PlanCreationFlow:**
A 4-step modal wizard guides plan creation. Step 1 asks for a plan name. Step 2 collects parking coordinates (auto-filled from current GPS or by tapping the map). Step 3 presents AnnotationLayer canvas for sketching waypoints, routes, and areas on the map. Step 4 reviews and saves the plan to ScoutDataContext.

**AnnotationLayer:**
A shared Mapbox layer renderer that draws all annotations: waypoints (point geometry with a pin icon), routes (linestring geometry with bearing labels every 50 meters), areas (polygon with fill and stroke), and tracks (polylines with elevation coloring). Waypoints have a tap-to-edit UI for name and icon. Routes show bearing and distance. The layer is reused in Deer Camp to render collaborative annotations.

**CompassOverlay:**
An animated compass rose rendered as an SVG overlay in the top-right corner. It rotates to match device heading and displays cardinal directions (N, NE, E, SE, S, SW, W, NW) with the current heading in degrees below.

**TrackMeBar:**
A persistent bottom bar activated by tapping the crosshair. It records GPS position every 5 seconds, computing distance (sum of segment lengths), elapsed time, current speed, and elevation gain/loss (if terrain data is available). Users can pause, resume, or save the track. The bar displays: "3.2 km · 45 min · 12 km/h · +180 m".

**MeasureTool:**
A modal activated from the toolbar. Users tap points on the map; the tool draws lines between them and displays cumulative distance and bearing for each segment. Tapping a segment shows bearing, distance, and coordinate pair. Useful for estimating distance to a potential stand location or route planning.

---

## 7. Deer Camp Architecture

Deer Camp is a shared map space where hunting groups collaborate. DeerCampScreen has two viewing modes: Camp List (card-based UI) and Camp Map (full Mapbox).

**Camp List view:**
Cards display each camp's name, member count, total annotation count, and recent activity. Long-pressing a card opens a menu to view the camp map, edit camp name, remove the current user, or delete the camp. A floating action button creates new camps.

**Camp Map view:**
Full Mapbox showing all 5 annotation types (waypoints, routes, areas, tracks, photo pins) color-coded per member. Tapping a member's annotation opens a detail popup with the member name, annotation type, and action buttons. A toolbar overlay provides buttons for adding annotations (Pin, Photo, Track), managing members (Team panel), viewing activity (Feed panel), and measuring distance.

**Member management:**
A side panel shows member avatars with initials, role badges (admin/guest), and counts of pins and photos added. The admin can remove members. Member colors are auto-assigned from a palette (8 colors) and persist for the session.

**Activity feed:**
A scrollable feed shows the last 30 actions (e.g., "Alice added a waypoint at Bear Ridge", "Bob uploaded a photo at North Parking"). Each entry displays the member color dot, action description, and ISO timestamp. Tapping an entry centers the map on the annotation's location.

**Photo geotagging:**
Users tap the Photo button, select an image from the device library, and optionally add a caption. The photo is geotagged with the current GPS location and saved as a SharedAnnotation of type 'photo'. V2 stores the photo metadata only; full image upload to backend comes in V3.

**Plan and track import:**
Scout plans and tracks can be exported to any Deer Camp. The importPlanToCamp function converts all plan annotations into SharedAnnotations, preserving geometry and metadata. exportTrackToCamp exports saved GPS tracks as 'track' type SharedAnnotations.

**Delete camp:**
Long-pressing a camp card from the list view shows a confirmation dialog. Deletion is permanent and affects all members.

---

## 8. Data Layer

All data in V2 is static and bundled at build time. The data pipeline (generate_maryland_lands_v2.py) merges four sources into TypeScript modules:

**Data sources:**
1. **MD iMap FeatureServer GIS** — 299 features merged into 124 polygon boundaries
2. **DNR detail page scrapes** — 77 lands with enriched metadata (batches 1-3 + WebFetch supplements)
3. **DNR regional page URLs** — 75 lands with detail_url and pdf_map_url
4. **eRegulations inventory** — 192 lands + 14 shooting ranges

**Data coverage:**
- 124 polygon boundaries with geometry
- 68 center-point markers for lands without complete boundary data
- 72 lands with enriched detail information
- 67 lands with parking coordinates
- 70 lands with contact information
- 72 lands with access notes
- 19 lands with descriptions
- 135 website URLs
- 64 PDF map links

**TypeScript modules:**
- `marylandPublicLands.ts`: Array of 192 land objects with type definitions (name, county, landType, access, contact, regulationsUrl, etc.)
- `marylandLandGeoJSON.ts`: GeoJSON FeatureCollection for Mapbox rendering, with land ID and color properties
- `marylandHuntingData.ts`: Seasons, bag limits by county, and hunting method regulations
- `chatKnowledge.ts`: AI response templates for 8 query types (seasons, bag limits, access, gear, etc.)

All modules are imported statically at app boot. No runtime data fetching in V2.

---

## 9. Services

Eight service modules provide external integrations, authentication, and utility functions.

**api.ts:**
FastAPI client with Axios. Endpoints for regulations, lands, AI chat, and user feedback. Base URL switches between localhost (dev) and api.huntplanai.com (prod). Headers include Content-Type and Bearer JWT authorization.

**authService.ts:**
Anonymous-first authentication. On first launch, generates a device token and registers with the backend to receive a JWT. Stores credentials in AsyncStorage. Provides `initAuth()`, `registerDevice()`, `getProfile()`, `updateProfile()`, and `signOut()`. Includes `createAuthenticatedClient()` factory that auto-attaches JWT to all requests.

**campSyncService.ts:**
Bridges local DeerCampContext with the backend Deer Camp API. Supports offline-first sync: `queueAction()` stores mutations locally when offline; `syncCamp()` pushes pending actions then pulls new data since `last_synced` timestamp. Provides CRUD wrappers: `createCampRemote()`, `joinCampRemote()`, `fetchCampRemote()`, `deleteCampRemote()`.

**exportService.ts:**
On-device GPX 1.1 and KML 2.2 generation from hunt plans and recorded tracks. `planToGPX()` / `planToKML()` export waypoints, routes, and areas (areas become closed routes in GPX, polygons in KML). `trackToGPX()` / `trackToKML()` export recorded GPS tracks with elevation and timestamps. `shareGPX()` and `shareKML()` write to cache and open the iOS share sheet via react-native-share.

**offlineMaps.ts:**
Mapbox offline tile pack manager. Five pre-defined Maryland regions (Western, Central, Piedmont, Eastern Shore, Southern) with bounding boxes, zoom ranges, and estimated sizes. `downloadRegion()` uses Mapbox offlineManager to store tiles locally. `getRegionsWithStatus()` returns all regions with download state. `deleteRegion()` and `deleteAllPacks()` manage storage. Total disk usage tracked via AsyncStorage.

**pushNotifications.ts:**
APNS push notification service. Handles permission requests, token registration with backend, and notification routing. Supports four notification types: season alerts, camp activity, regulation changes, and weather alerts. Includes `scheduleSeasonAlerts()` for local notification scheduling of Maryland season opening dates. Preferences stored in AsyncStorage and synced to backend.

**locationService.ts:**
Wraps React Native's Geolocation API. Methods: `watchPosition(callback, errorCallback)` for continuous GPS tracking with 5-second polling, `getCurrentPosition()` for a single location query, and `clearWatch()` to stop tracking. Used by TrackMeBar and CompassOverlay.

**weatherService.ts:**
Fetches weather from NOAA's weather.gov API. Takes latitude/longitude, returns current conditions, hourly forecast, and 7-day forecast. Used by ResourcesHub to display local conditions. No API key required (public service).

---

## 10. Offline-First Strategy

V2 uses a lightweight offline-first approach suitable for a single-user, local-only app.

**Bundled data:**
All hunting data (lands, regulations, seasons, contacts) is bundled as static TypeScript modules. No runtime data fetch is required. The app is fully functional on a new device with no network connection.

**AsyncStorage:**
User-created plans, tracks, camps, and activity are persisted to AsyncStorage (a key-value store backed by SQLite on iOS). Every mutation in ScoutDataContext or DeerCampContext triggers a `savePlans()` or equivalent function. On app relaunch, `loadPlans()` and `loadCamps()` restore the user's data. AsyncStorage is fast enough for V2; WatermelonDB will replace it in V3 for structured queries.

**Mapbox offline tiles:**
Mapbox GL Native supports offline tile packs. Tiles are downloaded for a geographic region at a specific zoom level and cached locally. The app can render maps using cached tiles when offline. Configuration is deferred to V3 pending user feedback on download sizes.

**Network status detection:**
A custom `useNetworkStatus()` hook uses React Native NetInfo to detect connectivity. Screens gracefully degrade when offline: the map still renders cached data, the AI chat displays a "Offline mode" notice, and the Resources tab shows only bundled content.

**V3 planned:**
- **WatermelonDB (SQLite):** Structured local storage with querying, filtering, and indexing for multi-table schemas
- **PostgreSQL + PostGIS:** Server-side storage and spatial queries
- **Sync engine:** Conflict resolution, tombstones, and eventual consistency for Deer Camp collaboration
- **pgvector:** Embedding-based RAG for context-aware AI responses

---

## 11. Theme System

All colors are defined in `theme/colors.ts`. The app uses a dark theme throughout to reduce eye strain and improve battery life on OLED devices.

**Maryland palette:**
- mdRed: `#C41E3A` (state flag red for WMA lands)
- mdGold: `#FFB81C` (state flag gold for accents)
- mdBlack: `#000000` (state flag black for text)
- mdWhite: `#FFFFFF` (backgrounds and borders)

**Outdoor palette:**
- oak: `#8B7355` (parking and waypoints)
- forest: `#228B22` (CFL and state parks)
- tan: `#D2B48C` (sand, open areas)
- mud: `#8B7765` (muted backgrounds)
- amber: `#FFA500` (warnings, highlights)
- sage: `#9DC183` (wildlife areas)

**Semantic colors:**
- background: `#1A1A1A` (screen background)
- surface: `#2A2A2A` (cards, panels)
- textPrimary: `#FFFFFF` (main text)
- textSecondary: `#B0B0B0` (secondary text)
- textMuted: `#808080` (disabled, metadata)

Every screen and component accesses colors via `Colors.*` constants. No hardcoded color values appear in component code, ensuring brand consistency and simplifying theme changes.

---

## 12. Backend Architecture (V3 — In Progress)

The FastAPI backend is now built out with full API coverage. It runs alongside PostgreSQL + PostGIS via Docker Compose.

**Backend modules (backend/app/modules/):**

- **auth/**: Anonymous-first JWT authentication. Device token registration, profile management, token refresh. Dependencies module provides `get_current_user` for route protection.
- **deercamp/**: Full CRUD for collaborative camps. Create/join/leave camps, add/remove members, shared annotations (5 types), geotagged photos, activity feed, and offline-first sync endpoint. Invite code system for camp joins.
- **export/**: GPX 1.1 and KML 2.2 file generation from plans and tracks. Handles waypoints, routes, areas (as closed polygons), and GPS tracks with elevation/timestamp data.
- **notifications/**: Push notification token registration, preference management, and dispatch infrastructure. Ready for APNS integration.
- **regulations/**: Fully implemented — season queries, can-i-hunt, bag limits, species list, Sunday hunting info. Maryland 2025-2026 seed data included.
- **lands/**: Fully implemented — nearby search (PostGIS radius), species filter, text search, county lookup, stats. GIS loader for MD iMap and USFWS data.
- **ai_planner/**: Stub — natural language query endpoint. Will integrate with Claude API + pgvector RAG.
- **social/**: Stub — scouting report feed. Models are complete (ScoutingReport, ReportComment, DirectMessage, Group).
- **integrations/**: Stub — weather API integration.

**Database models (backend/app/models/):**

- **User**: Anonymous handle + device token, optional email, profile, reputation, GPS
- **DeerCamp / CampMember / SharedAnnotation / CampPhoto / CampActivity**: Full collaborative camp schema with invite codes, member colors, typed annotations as JSONB, geotagged photos, and timestamped activity feed
- **HuntPlan / FieldNote**: AI-generated and user-created hunt plans with GPS tracks, harvest data, and offline sync timestamps
- **Species / Season / BagLimit / WeaponRestriction**: Complete hunting regulation schema
- **PublicLand**: WMA/forest/refuge boundaries with PostGIS geometry
- **ScoutingReport / ReportComment / DirectMessage / Group**: Anonymous social features

**Remaining Phase 3 work:**

- WebSocket real-time sync for Deer Camp (currently uses polling via sync endpoint)
- S3/R2 photo upload (currently stores image keys only)
- pgvector RAG pipeline for AI chat
- Claude API integration for ai_planner module
- Deploy backend (Render, Railway, or AWS)
- Multi-state expansion (VA, PA data packs)
- WatermelonDB migration on mobile (replace AsyncStorage for structured queries)

---

## Summary

MDHuntFishOutdoors v2 is a self-contained React Native app combining offline-first data bundling, local-only state management, and rich Mapbox interactions. Its modular architecture — with distinct tabs for Map, Scout, AI, Deer Camp, and Resources — scales to multi-activity support (Hunt, Fish, Hike, Crab, Boat) by reusing map logic and adapting UI labels per mode. Phase 3 will add a FastAPI backend, real-time collaboration, and vector-based AI, positioning the app for multi-state expansion and community-driven content.