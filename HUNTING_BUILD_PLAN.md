# MDHuntFishOutdoors — Hunting Module Build Plan

**Last updated:** 2026-04-02
**Status:** HUNTING MODULE COMPLETE. All sprints (A–H) done. Ready for Phase 4 (Fishing).

---

## Hunter UX Audit (2026-04-02)

A full audit of every screen, service, context, and backend module from the perspective of a Maryland hunter using the app in the field. All 30 items identified have been addressed.

### What Works Well
- Offline map tiles with 192 public lands + polygon boundaries — can navigate in the field with no signal
- Scout plan creation with waypoints, routes, areas — good for preseason planning
- Deer Camp shared maps — hunt groups can coordinate stands and routes
- 3D terrain with hillshade — see ridgelines, valleys, funnels
- Regulations with "Can I Hunt?" checker — quick legal question answering
- AI chat with local fallback — answers regulation questions even offline
- Harvest log with game check tracking — MD requires 24-hour check-in
- GPX/KML export — share plans with non-app users
- Offline map downloads — 5 MD regions available

### UX Audit Items — ALL RESOLVED

| # | Issue | Resolution | Sprint |
|---|-------|-----------|--------|
| 1 | No offline indicator | OfflineBanner component with animated fade | E |
| 2 | Date picker is text input | CalendarDatePicker (iOS wheel picker modal) | E |
| 3 | County dropdown unsearchable | SearchableCountyPicker component | E |
| 4 | No barometric pressure trends | weatherService tracks pressure + 6h/12h/24h trends | F |
| 5 | Push notifications don't navigate | handleNotificationRouting() completed | E |
| 6 | No background GPS tracking | backgroundGPS.ts service (native lib install needed) | F |
| 7 | Can't edit plans after creation | Edit mode added to PlanScreen | E |
| 8 | Social features non-functional | Upvote/reply wired to backend | G |
| 9 | No map legend | Collapsible legend overlay on MapScreen | E |
| 10 | No map land search | Search bar + filtered results on MapScreen | E |
| 11 | No wind direction integration | WindDirectionIndicator component on map | F |
| 12 | Rut prediction missing | MD_RUT_CALENDAR + getCurrentRutPhase() helper | F |
| 13 | Harvest log can't be edited | Edit mode + pencil icon on harvest cards | F |
| 14 | Game check phone not clickable | Linking.openURL('tel:...') on HarvestLogScreen | E |
| 15 | No photo capture for harvest | Photo attachment button (placeholder, backend ready) | F |
| 16 | Scout toolbar overwhelming | No change (7 buttons acceptable for power users) | — |
| 17 | 42MB GIS JSON in bundle | gisDataService.ts + backend /gis/boundaries endpoint | H |
| 18 | Season data hardcoded | regulationDataService.ts (fetch + 24hr cache + fallback) | H |
| 19 | No hunt plan sharing | "Share to Camp" button with camp picker | G |
| 20 | Chat history not persisted | AsyncStorage persistence (50 msg limit) + Clear Chat | G |
| 21 | No GPS routing to WMA | Apple Maps deep-link on land detail panel | E+ |
| 22 | No gear checklist | GearChecklist component (species-specific, per-plan) | E+ |
| 23 | No image compression | Server-side Pillow thumbnails + mobile compression flag | H |
| 24 | No offline maps resume | Resume/cancel/speed display on OfflineMapsScreen | E+ |
| 25 | No dark mode detection | Deferred (always dark is fine for hunting) | — |
| 26 | API requests not cached | api.ts in-memory cache + TTL + request deduplication | E+ |
| 27 | No dew point / scent conditions | weatherService dew point + scent risk scale (1-10) | E+ |
| 28 | Forum threads no reply viewing | Reply modal + thread detail view | G |
| 29 | No harvest heatmap | HarvestHeatmap Mapbox layer (mock data, API stub) | G |
| 30 | ActivityMode doesn't persist | AsyncStorage persistence + isLoading state | E+ |

---

## Completed Work

### V1 (shipped 2026-03-30)
- 6-tab Hunt Mode app with Map, Regulations, AI, Social, Resources, Profile
- 192 Maryland public lands with polygon boundaries + enriched metadata
- Static bundled data (seasons, bag limits, lands, GIS)
- Animated splash screen, liability disclaimer, MDHuntFishOutdoors branding

### V2 (submitted 2026-03-30, live on App Store)
- 5-tab restructure: Map | Scout | AI | Deer Camp | Resources
- Scout tab: PlanSidebar, PlanCreationFlow, AnnotationLayer, CompassOverlay, TrackMeBar, MeasureTool
- Deer Camp: Camp list/map, member management, activity feed, photo pins, import/export
- Resources segmented control (Regulations | Links & Guides)
- 9 land type filters, 5 species, 3 weapons, 3 access filters (AND logic)
- GPX/KML on-device export with iOS share sheet

### Sprint A — AI & Backend Integration (COMPLETE)
- RAG pipeline: PostgreSQL full-text search over ~80 regulation chunks
- Gemini 2.0 Flash for AI chat + hunt plan generation (free tier)
- Mobile ↔ backend wiring: ChatScreen, SocialScreen, auth, camp sync
- AI hunt plan generator with multi-category RAG search

### Sprint B — Daily-Use Features (COMPLETE)
- Weather integration: NOAA API + hunting condition analysis + deer activity score
- Solunar service: Moon phase, major/minor periods, activity ratings, offline fallback
- Harvest log: Full CRUD with game check tracking + season summary
- Offline maps UI: 5 MD regions, download/delete/manage
- Settings screen: Notifications, units, clear data, privacy policy
- AI hunt plan UI: Species/weapon/date/county pickers + generated plan display

### Sprint C — Premium Polish (COMPLETE)
- C1: WebSocket real-time sync for Deer Camp (manager, reconnect, presence)
- C2: Push notifications APNS (token registration, preferences, routing)
- C3: S3/R2 photo upload (presigned URLs, offline queue, confirmation)
- C4: 3D terrain (DEM, hillshade, atmosphere, sky, exaggeration presets)
- C5: WatermelonDB activated — ScoutDataContext + DeerCampContext both use WMDB with AsyncStorage migration
- C6: Navigation wiring (stack navigators, sub-screen access from all tabs)

### Sprint D — Growth (COMPLETE)
- D2: Forum/Marketplace (threads, gear listings, land permissions, moderation)
- D5: Feedback system (mobile offline queue, backend API, Gmail SMTP, donation notifications)
- D6: Donate screen (tiers, Venmo/BMC/Patreon, backend notification tap)

### Sprint E — Field-Ready Polish (COMPLETE)
- E1: OfflineBanner — animated amber bar when offline
- E2: CalendarDatePicker — iOS wheel picker in modal (4 screens)
- E3: SearchableCountyPicker — search + filtered FlatList (4 screens)
- E4: Map land search — search bar on MapScreen, fly-to on select
- E5: Map legend — collapsible 9-entry color legend
- E6: Push notification routing — navigates to correct screen on tap
- E7: Edit hunt plans — edit mode with pre-populated form
- E8: Game check number clickable — tel: link on HarvestLogScreen
- E+: Apple Maps directions, gear checklist, offline map resume, API caching, dew point/scent, ActivityMode persistence

### Sprint F — Hunter Intelligence (COMPLETE)
- F1: Barometric pressure trends — 6h/12h/24h with rising/falling/stable indicators
- F2: Wind direction overlay — arrow + speed + color-coded intensity on map
- F3: Rut prediction calendar — 5-phase MD rut timeline + AI chat integration
- F4: Background GPS service — react-native-background-geolocation wrapper with foreground fallback (native lib install needed on Mac)
- F5: Harvest log edit + photo — edit mode, pencil icon, photo attachment button

### Sprint G — Social & Community (COMPLETE)
- G1: Upvote/reply wired — SocialScreen + ForumScreen POST to backend
- G2: Chat history persistence — AsyncStorage, 50 msg limit, Clear Chat button
- G3: Plan sharing to Deer Camp — "Share to Camp" button with camp picker modal
- G4: Harvest heatmap — Mapbox CircleLayer + SymbolLayer (mock data, API stub)

### Sprint H — Technical Debt (COMPLETE)
- H1: GIS data lazy-load — backend /gis/boundaries endpoint + gisDataService.ts (7-day cache, 5-layer fallback)
- H2: Dynamic season data — regulationDataService.ts (24hr cache, bundled fallback)
- H3: Admin RBAC — is_admin on User model + require_admin dependency on feedback admin endpoints
- H4: Alembic migrations — initialized, env.py configured, initial migration created
- H5: Server-side image compression — Pillow thumbnail_service.py (400x400 thumb, 1080p display, EXIF fix)

### AI Learns Your Deer Camp (COMPLETE)
- 5-tier progression system: Locked → Basic → Intermediate → Advanced → Expert
- campIntelligenceService.ts — Haversine hotspot clustering, local insights aggregation
- campDataConnector.ts — Cross-references harvests, sightings, plans, tracks
- CampInsightsPanel — UI with tier badge, progress bar, AI insight cards
- HistoricalHarvestImport — Bulk import modal for past harvests
- AddSightingModal — Quick-log for wildlife sightings
- Backend intelligence endpoint — Gemini 2.0 Flash analysis with rule-based fallback

### QC Fixes (COMPLETE)
- 12 critical bugs fixed across frontend (9 files) and backend (4 files)
- Auth token standardized to `auth_token` across all 7 services
- UUID validation on all deercamp endpoints
- Authentication added to 4 unprotected photo endpoints

---

## Backend Endpoint Coverage

| Module | Endpoints | Mobile Wired? | Notes |
|--------|-----------|---------------|-------|
| Auth | 4 | Yes | Silent register on launch |
| Regulations | 5 | Yes | "Can I Hunt?" + dynamic fetch via regulationDataService |
| Lands | 7 | Yes | GIS boundaries endpoint + gisDataService lazy-load |
| AI Planner | 2 | Yes | ChatScreen + HuntPlanScreen |
| Deer Camp | 13 | Yes | Full sync + intelligence endpoint |
| WebSocket | 2 | Yes | websocketService.ts |
| Export | 4 | Partial | On-device export exists; backend export available |
| Harvest | 7 | Yes | HarvestLogScreen with offline fallback |
| Social | 5 | Yes | SocialScreen feed + posting + upvotes |
| Forum | 9+ | Yes | ForumScreen 3-tab layout + replies |
| Photos | 6 | Yes | photoService + thumbnail generation |
| Integrations | 3 | Yes | Weather + solunar + pressure trends |
| Notifications | 4 | Yes | Token registered, routing complete |
| Feedback | 6 | Yes | Offline queue + admin panel (RBAC protected) |

---

## Development Phases

- **V1** (shipped 2026-03-30): Hunting MVP ✅
- **V2** (live, App Store): Scout + Deer Camp + branding ✅
- **Sprints A–H** (complete 2026-04-02): All hunting features, intelligence, QC ✅
- **Phase 3 remaining**: Deploy latest backend to Render, Alembic stamp head, S3 photo storage live
- **Phase 4** (Weeks 23-30): Fishing module — MD fishing regulations, stocking reports, boat ramps, tidal charts
- **Phase 5** (Weeks 31+): Crabbing + Boating + Hiking modules
- **Phase 6** (Post-launch): Monetization, multi-state expansion (VA, PA)

---

## What's Left Before Hunting Module is Production-Complete

### Deployment Tasks (require credentials / Mac access)
1. `npm install react-native-background-geolocation && cd ios && pod install` — enables F4 background GPS
2. Deploy updated backend to Render (includes GIS endpoint, admin RBAC, Alembic, thumbnails)
3. `alembic stamp head` on production database to baseline existing schema
4. Configure Cloudflare R2 credentials for live photo storage
5. Submit V3 to App Store (includes all Sprint E–H features)

### Nice-to-Have (not blocking)
- Replace harvest heatmap mock data with real aggregated data from backend
- Dark mode detection (currently always dark)
- Professional logo redesign + website redesign
- pgvector RAG (currently full-text search — works fine, pgvector is an optimization)

---

## Architecture Notes

- **Offline-first**: Every feature works without internet, syncing when connected
- **Maryland-first**: All features validated on MD data before multi-state expansion
- **DNR disclaimer**: Every AI response and regulation display includes "Verify with MD DNR"
- **Privacy**: Anonymous by default, username-based profiles, no real names required
- **Graceful degradation**: Gemini API → raw chunks → local knowledge base → error message
- **WatermelonDB**: Active for both ScoutDataContext and DeerCampContext (AsyncStorage migration on first launch)
- **Bundle ID locked**: com.davidstonko.huntmaryland (registered with Apple, do NOT change)

---

## Codebase Stats (as of 2026-04-02)

- **19 screens** (17 fully implemented, 1 placeholder for future modes)
- **14+ services** (all functional)
- **3 context providers** (all WatermelonDB-backed)
- **14 backend modules** (60+ endpoints)
- **~99 TypeScript files** in src/
- **~68 Python files** in backend/
- **0 TypeScript errors** (strict mode enforced)
