# MDHuntFishOutdoors Architecture

**Last updated:** 2026-04-02
**Version:** V2 live (App Store), V3 backend live on Render

---

## 1. System Overview

MDHuntFishOutdoors is an offline-first iOS app for Maryland outdoor recreation — hunting, fishing, crabbing, boating, and hiking. It consolidates MD DNR regulations, public land maps, AI planning, community forums, and collaborative group maps into a single free app.

**Current state:**
- Frontend: React Native 0.76.6 + TypeScript (strict mode, 0 errors)
- Backend: FastAPI on Render (14 modules, 50+ endpoints, PostgreSQL + PostGIS)
- Maps: Mapbox GL Native with 3D terrain, offline tile packs, 192 public lands
- AI: Gemini 2.0 Flash via RAG pipeline (full-text search over regulation chunks)
- Auth: Anonymous-first JWT (device token registration, no PII required)
- State: WatermelonDB (SQLite) for plans/camps, AsyncStorage for preferences
- Target: iPhone 12+ (iOS 15+)

**Architecture principles:**
1. Offline-first — every core feature works without network
2. Maryland-first — validated on MD data before multi-state expansion
3. Anonymous-first — no accounts required, username-based profiles optional
4. DNR disclaimer — every regulation display includes "Verify with MD DNR"

---

## 2. App Lifecycle Flow

```
App Launch (index.js)
    │
    ▼
RootNavigator (App.tsx)
  ├─ Load context providers (Activity → Scout → DeerCamp)
  ├─ Silent auth (register device or restore JWT)
  ├─ Flush pending feedback queue
  │
  ├─ First launch? → SplashDisclaimer (liability acceptance)
  │                    │
  │                    ▼
  └─ AnimatedSplash (2.8s Ken Burns zoom, 6 scenes)
                       │
                       ▼
                  AppNavigator (bottom tabs)
```

**Provider hierarchy:**
```
ActivityModeProvider
  └─ ScoutDataProvider (WatermelonDB-backed)
       └─ DeerCampProvider (WatermelonDB-backed + WebSocket sync)
            └─ SafeAreaProvider
                 └─ NavigationContainer
                      └─ AppNavigator (mode-aware tabs)
```

---

## 3. Navigation Architecture

Bottom-tab navigator reconfigures per activity mode. ActivityModePicker in header enables instant switching.

### Hunt Mode (5 tabs — fully implemented)
```
Map | Scout | AI | Deer Camp | Resources
```
- **Map:** 192 public lands with polygons, 3D terrain, filters, weather overlay, land details
- **Scout:** Plan creation wizard, GPS tracking, compass, measure tool, annotation layers
- **AI:** RAG-powered chat (Gemini 2.0 Flash), local fallback, AI hunt plan generator
- **Deer Camp:** Collaborative shared maps, member management, WebSocket sync
- **Resources:** Segmented control (Regulations | Links & Guides), quick-access toolbar

### Fish Mode (3 tabs — basic)
```
Map | AI | Resources
```
- Map has 6 DNR quick-link cards (no fishing-specific data overlays yet)
- AI and Resources share Hunt mode screens

### Hike/Crab/Boat (placeholder — ComingSoonScreen)

### Sub-screens (via stack navigation)
- Settings, HarvestLog, HuntPlan, OfflineMaps, Profile, Forum, Donate — all accessible from Resources toolbar or AI banners

---

## 4. State Management

### ActivityModeContext
Current activity mode (hunt, fish, hike, crab, boat). Determines tab structure, labels, icons.
- **Storage:** AsyncStorage (persists across sessions)
- **Hook:** `useActivityMode()`

### ScoutDataContext
Hunt plans and GPS tracks for the Scout tab. Plans include name, parking, waypoints, routes, areas. Tracks are recorded GPS paths with elevation/distance.
- **Storage:** WatermelonDB (SQLite) with AsyncStorage migration
- **CRUD:** createPlan, updatePlan, deletePlan, createTrack, deleteTrack
- **Hook:** `useScoutData()`
- **Sync:** Local-only in V2. Backend sync planned for V3.

### DeerCampContext
Collaborative camps with members, shared annotations, photos, activity feed. Supports WebSocket real-time sync with REST fallback.
- **Storage:** WatermelonDB with campSyncService bridge
- **Sync:** WebSocket (real-time) → REST polling (30s fallback) → offline queue
- **CRUD:** createCamp, joinCamp, leaveCamp, addAnnotation, uploadPhoto
- **Hook:** `useDeerCamp()`

---

## 5. Map Architecture

Both Map and Scout tabs render Mapbox GL Native maps sharing the same public land layers.

### Data
- 124 polygon boundaries (GeoJSON from MD iMap FeatureServer)
- 68 center-point markers for lands without polygon data
- 192 total lands + 14 shooting ranges
- Data-driven styling: `['get', 'color']` expressions for dynamic land-type colors

### Rendering
- Polygons: 50% opacity fill with colored stroke
- Points: Dual-layer (white circle base + colored border) for visibility
- Labels: Appear at zoom 10+, font size 10
- 3D terrain: Mapbox RasterDemSource + Terrain + HillshadeLayer + Atmosphere + SkyLayer
- Terrain exaggeration: 0.5x–3.0x (tap to cycle)

### Filter System
Collapsible MapFilterPanel with AND logic:
- **Land type (9):** WMA, CWMA, CFL, SF, SP, NRMA, NEA, FMA, Range
- **Species (5):** Deer, Turkey, Waterfowl, Bear, Small Game
- **Weapon (3):** Archery, Firearms, Muzzleloader
- **Access (3):** Sunday Hunting, No Reservation, ADA Accessible
- AI chat can programmatically set filters and navigate to map

### Interaction
- Tap land → LandInfoPanel slide-up (regulations, parking, contacts, links)
- Weather overlay badge (temp, condition, hunting rating from NOAA)
- Solunar widget (moon phase, activity score)

---

## 6. Scout Tab Architecture

Full Mapbox map + 7-button toolbar + slide-out PlanSidebar.

**Toolbar:** Layers, Filters, Plans, Pin, Photo, Measure, Crosshair (GPS center)

**PlanSidebar:** Lists all plans/tracks. Visibility toggles per plan. Long-press for export-to-camp, rename, delete.

**PlanCreationFlow:** 4-step wizard — Name → Parking (GPS or map tap) → Annotate (waypoints/routes/areas) → Save

**AnnotationLayer:** Shared renderer for waypoints (pin icons), routes (linestrings with bearing labels), areas (filled polygons), tracks (polylines with elevation coloring). Reused in Deer Camp.

**TrackMeBar:** Bottom bar GPS recorder — distance, time, speed, elevation gain/loss. 5-second polling.

**MeasureTool:** Tap points on map, shows cumulative distance and bearing per segment.

**CompassOverlay:** Animated compass rose with cardinal directions and heading readout.

---

## 7. Deer Camp Architecture

Two viewing modes: Camp List (cards) and Camp Map (full Mapbox).

**Camp Map:** Renders all 5 annotation types (waypoints, routes, areas, tracks, photo pins) color-coded per member. Toolbar: Pin, Photo, Team, Feed, Crosshair.

**Member Management:** Side panel with avatars, role badges (admin/member), pin/photo counts. Admin can remove members. 10-color palette auto-assigned.

**Activity Feed:** Scrollable, last 30 actions with member color dots + timestamps.

**Photo Geotagging:** Captures GPS location + optional caption. V2 stores metadata locally; R2 upload functional via presigned URLs.

**Import/Export:** Plans and tracks can be exported from Scout to any camp. `importPlanToCamp()` converts annotations to SharedAnnotations.

**Real-time Sync:** WebSocket connection per camp (JWT auth, exponential backoff reconnect). Falls back to REST polling at 30s intervals. Offline changes queued to AsyncStorage and replayed on reconnect.

---

## 8. Backend Architecture

FastAPI on Render (huntplan-api.onrender.com). PostgreSQL + PostGIS + pgvector. 14 registered modules, 50+ endpoints.

### Module Status

| Module | Endpoints | Status | Notes |
|--------|-----------|--------|-------|
| Auth | 4 | Complete | Anonymous JWT, device tokens, profile CRUD |
| Regulations | 5 | Complete | Seasons, can-i-hunt, bag limits, species, Sunday hunting |
| Lands | 6 | Complete | PostGIS spatial queries, nearby search, species filter |
| AI Planner | 2 | Complete | RAG pipeline, Gemini 2.0 Flash, multi-turn conversations |
| Deer Camp | 12 | Complete | Full CRUD, invite codes, offline sync delta endpoint |
| WebSocket | 2 | Complete | Real-time camp sync, presence tracking |
| Export | 4 | Complete | GPX 1.1 + KML 2.2 for plans and tracks |
| Harvest | 7 | Complete | Log/list/update/delete, season summary, community stats |
| Social | 5 | Complete | Scouting reports, upvotes, threaded comments |
| Forum | 9+ | Complete | Threads, marketplace, land permissions, moderation |
| Photos | 5 | Complete | Presigned R2 URLs, upload confirmation, camp/harvest photos |
| Integrations | 3 | Complete | NOAA weather, solunar, sunrise/sunset |
| Notifications | 4 | Partial | APNS configured, routing incomplete |
| Feedback | 6 | Complete | Submit, admin CRUD, Gmail SMTP notifications, donation tap |

### Database (28 tables)
- User & auth: `users`
- Hunting data: `public_lands` (PostGIS), `seasons`, `bag_limits`, `species`, `weapon_restrictions`, `counties`, `states`, `license_requirements`, `terrain_data`, `private_parcels`
- AI: `regulation_chunks` (tsvector full-text search)
- Deer Camp: `deer_camps`, `camp_members`, `shared_annotations`, `camp_photos`, `camp_activity`
- Harvest: `harvest_logs`
- Social: `scouting_reports`, `report_comments`
- Forum: `forum_threads`, `forum_replies`, `marketplace_listings`, `land_permissions`
- Feedback: `feedback`
- Unused stubs: `groups`, `direct_messages`, `hunt_plans`, `field_notes`

### External Services
- **Gemini 2.0 Flash** — Primary LLM (free tier, 15 RPM)
- **Anthropic Claude** — Fallback LLM (retained as optional dependency)
- **NOAA weather.gov** — Weather data (free, no key)
- **Cloudflare R2** — Photo storage (S3-compatible)
- **APNS** — Push notifications (token-based .p8 auth)
- **Gmail SMTP** — Feedback/donation email notifications

---

## 9. Service Layer (Mobile)

| Service | Status | Offline Support | Notes |
|---------|--------|-----------------|-------|
| authService | Complete | JWT cached in AsyncStorage | Silent register on first launch |
| api | Complete | No caching/retry | Typed Axios client, 15s timeout |
| locationService | Complete | GPS works offline | No background tracking |
| weatherService | Complete | Partial (NOAA direct) | No pressure trends |
| solunarService | Complete | Local fallback | Simplified moon phase calculation |
| campSyncService | Complete | Offline queue + replay | WebSocket → REST polling fallback |
| offlineMaps | Complete | Full offline tiles | 5 MD regions, ~110-140 MB each |
| photoService | Complete | Offline queue | Presigned URL upload, auto-retry |
| pushNotifications | Partial | Preferences cached | Routing broken (doesn't navigate) |
| feedbackService | Complete | Offline queue | Bug/outdated/suggestion types |
| websocketService | Complete | Auto-reconnect (5 attempts) | JWT auth, ping/pong keep-alive |

Note: GPX/KML export is handled by the backend export module. Mobile-side export service (on-device generation) is planned but not yet implemented as a standalone file.

---

## 10. Data Layer

### Bundled Data (build-time)
- `marylandPublicLands.ts` — 192 lands with metadata
- `mdGISData.json` — 42 MB GeoJSON (124 polygon boundaries) — **should migrate to API-only**
- `marylandHuntingData.ts` — 2025-2026 seasons, bag limits, counties
- `chatKnowledge.ts` — AI local fallback knowledge base (~655 lines)

### Backend Data
- Same data available via API endpoints (regulations, lands, AI planner)
- Regulation chunks auto-ingested on startup (~80 chunks)
- PostGIS spatial queries for land proximity

### Data Freshness
- Season data is hardcoded 2025-2026 — requires annual update or API sync
- Land boundaries from MD iMap FeatureServer — stable but should refresh annually
- Backend regulation_chunks table supports re-ingestion via `/api/v1/planner/ai/ingest`

---

## 11. Offline-First Strategy

**What works offline:**
- Map rendering (cached Mapbox tiles)
- All 192 public lands with metadata and polygons
- Hunting regulations, seasons, bag limits
- Scout plans (full CRUD via WatermelonDB)
- GPS tracking and recording
- Deer Camp annotations (queued for sync)
- Photo uploads (queued for upload)
- Solunar times (local fallback)
- Feedback submission (queued)
- GPX/KML export (on-device generation)

**What requires network:**
- AI chat (backend RAG — falls back to local keyword matching)
- Weather data (NOAA API — partial caching)
- Camp real-time sync (WebSocket — falls back to local state)
- Push notifications
- Forum/social features
- Harvest log sync (saves locally, syncs when connected)

**Known gaps:**
- No offline network banner (user doesn't know they're offline)
- No cloud backup for scout plans (local-only)
- No conflict resolution for concurrent edits
- Push notifications register but don't navigate to content

---

## 12. Theme System

Dark theme throughout. All colors via `theme/colors.ts`.

**Maryland palette:** mdRed (#C41E3A), mdGold (#FFB81C), mdBlack (#000000), mdWhite (#FFFFFF)

**Outdoor palette:** oak (#8B7355), forest (#228B22), tan (#D2B48C), mud (#8B7765), amber (#FFA500), sage (#9DC183), moss, sand, water, blood, brass, corn

**Semantic colors:** background (#1A1A1A), surface (#2A2A2A), surfaceElevated (#333333), textPrimary (#FFFFFF), textSecondary (#B0B0B0), textMuted (#808080), textOnAccent (#FFFFFF)

---

## 13. File Organization

```
src/
├── screens/           19 screen components
│   ├── MapScreen.tsx          Main map (620+ lines)
│   ├── ScoutScreen.tsx        Scout planning workspace
│   ├── ChatScreen.tsx         AI chat interface
│   ├── DeerCampScreen.tsx     Collaborative maps
│   ├── ResourcesHubScreen.tsx Regulations + Links (segmented)
│   ├── RegulationsScreen.tsx  Seasons, Can I Hunt?, Bag Limits
│   ├── ResourcesScreen.tsx    External DNR links (29 curated)
│   ├── HarvestLogScreen.tsx   Game logging + season summary
│   ├── HuntPlanScreen.tsx     AI hunt plan generator
│   ├── ForumScreen.tsx        Community forum + marketplace
│   ├── SocialScreen.tsx       Scouting reports feed
│   ├── SettingsScreen.tsx     App preferences
│   ├── ProfileScreen.tsx      User profile + data packs
│   ├── OfflineMapsScreen.tsx  Tile pack manager
│   ├── DonateScreen.tsx       Donation tiers + payment links
│   ├── PlanScreen.tsx         Manual hunt plan CRUD
│   ├── FishMapScreen.tsx      Fish mode map + links
│   ├── ComingSoonScreen.tsx   Hike/Crab/Boat placeholder
│   └── SplashDisclaimer.tsx   Liability acceptance
├── components/
│   ├── scout/         PlanSidebar, PlanCreationFlow, AnnotationLayer,
│   │                  CompassOverlay, TrackMeBar, MeasureTool
│   ├── map/           SolunarWidget, ElevationProfile, TerrainControls
│   ├── deer-camp/     Camp-specific UI
│   └── common/        Shared buttons, modals, headers
├── context/           ActivityModeContext, ScoutDataContext, DeerCampContext
├── services/          12 service modules (auth, api, location, weather, etc.)
├── hooks/             useNetworkStatus, useLocation
├── types/             scout.ts, deercamp.ts, common.ts
├── data/              Static MD data (lands, regulations, GIS, chat knowledge)
├── navigation/        AppNavigator with mode-aware tab config
├── theme/             colors.ts, typography.ts, spacing.ts
└── db/                WatermelonDB schema + models

backend/
├── app/
│   ├── main.py              FastAPI entry (14 router registrations)
│   ├── config.py            Settings (DB, R2, APNS, Gemini, Gmail)
│   ├── db/database.py       Async SQLAlchemy engine
│   ├── models/              28 SQLAlchemy models
│   └── modules/             14 feature modules (routes + services)
│       ├── auth/
│       ├── regulations/
│       ├── lands/
│       ├── ai_planner/
│       ├── deercamp/
│       ├── websocket/
│       ├── export/
│       ├── harvest/
│       ├── social/
│       ├── forum/
│       ├── photos/
│       ├── integrations/
│       ├── notifications/
│       └── feedback/
└── requirements.txt
```

---

## Summary

MDHuntFishOutdoors is a production app (V2 on App Store, backend live on Render) with comprehensive offline-first hunting features for Maryland. The modular architecture supports multi-activity expansion (Fish, Hike, Crab, Boat) and multi-state data packs. The 14-module backend provides full API coverage. Primary gaps are in push notification routing, offline network indication, pressure trend analysis, and cloud sync for scout plans.
