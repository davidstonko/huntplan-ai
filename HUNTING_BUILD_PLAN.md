# MDHuntFishOutdoors — Hunting Module Build Plan

**Last updated:** 2026-03-31
**Status:** V2 submitted to App Review, backend live on Render (v3.0.0), Sprint A+B+C core features complete, C4 terrain done, C5 pending

---

## Completed (V1 + V2)

### Mobile App
- 5-tab Hunt Mode: Map, Scout, AI, Deer Camp, Resources
- 192 Maryland public lands with polygon boundaries + enriched metadata
- 9 land type filters, 5 species, 3 weapons, 3 access filters (AND logic)
- Scout tab: plan creation wizard, GPS tracking, compass, measure tool, annotation layers
- Deer Camp: local collaborative maps, member management, activity feed, photo pins
- Local AI chat (keyword-matching knowledge base for regulations)
- GPX/KML export on-device
- Animated splash, disclaimer, MDHuntFishOutdoors branding
- Offline data bundles (regulations, lands, GeoJSON)

### Backend (live at huntplan-api.onrender.com)
- 35+ live endpoints: auth, regulations, lands, deer camp, export, notifications
- Anonymous-first JWT auth with device registration
- Full Deer Camp CRUD with invite codes + offline sync endpoint
- Regulations API (seasons, can-i-hunt, bag-limits, species, Sunday hunting)
- Lands API with PostGIS spatial queries

---

## Sprint A — AI & Backend Integration (COMPLETE)

### A1. RAG Pipeline (DONE)
- PostgreSQL full-text search (tsvector/tsquery) for regulation chunk retrieval
- `regulation_chunks` table with auto-ingestion on first startup
- ~80 chunks: 16 seasons, 17 WMAs, 24 counties, 10 bag limits, 8 general topics
- `search_regulation_chunks()` + `fallback_search()` (ILIKE fallback)

### A2. Claude AI Backend (DONE → Gemini LLM)
- `/api/v1/planner/ai/query` — RAG-powered Q&A endpoint
- System prompt: MD hunting regulations expert, cites sources, adds DNR disclaimer
- LLM switched to Google Gemini 2.0 Flash (free tier) on 2026-03-31; endpoints unchanged
- Graceful fallback: if Gemini API fails, returns formatted raw chunks
- Follow-up suggestions based on detected species/topic
- `/api/v1/planner/ai/ingest` — Admin endpoint for re-seeding data

### A3. AI Hunt Plan Generator (DONE → Gemini LLM)
- `/api/v1/planner/ai/hunt-plan` — comprehensive plan generation endpoint
- Input: species, weapon, date, county, specific land name
- Multi-category RAG search: seasons + lands + bag limits + county rules + general
- Gemini 2.0 Flash generates full plan: overview, legal check, locations, timing, gear, strategy, safety
- LLM switched to Google Gemini 2.0 Flash (free tier) on 2026-03-31
- Fallback plan from raw chunks if API unavailable

### A4. Mobile ↔ Backend Wiring (DONE)
- ChatScreen calls backend RAG endpoint, falls back to local knowledge base
- Auto-register device on first launch (silent JWT in App.tsx)
- JWT stored in AsyncStorage, attached to all API requests
- SocialScreen wired to backend feed + post submission

### A5. Deer Camp Backend Sync (DONE)
- Full sync endpoint: client sends `last_synced`, server returns delta
- Camp CRUD, member management, annotations, photos, activity feed all wired

---

## Sprint B — Daily-Use Features (COMPLETE)

### B1. Weather Integration (DONE)
- Backend: Weather.gov API integration with hunting condition analysis
- `_calculate_hunting_conditions()`: deer activity, wind/scent, pressure trends, overall rating
- Sunrise/sunset endpoint with MD legal shooting hours (30 min before/after)
- Mobile: WeatherOverlay badge on MapScreen (temp + condition + hunting rating)
- Expanded view: current conditions, deer activity assessment, 3-day forecast

### B2. Solunar / Best Hunting Times (DONE)
- Backend: `/solunar`, `/solunar/week`, `/moon` endpoints
- Moon phase calculation (synodic month algorithm)
- Major periods (moon overhead/underfoot) + minor periods (moonrise/moonset)
- Activity rating (0-100) based on moon phase, solunar-dawn overlap, daylight
- Multi-day forecast for picking best day to hunt
- Mobile: `solunarService.ts` with offline fallback calculation
- Mobile: `SolunarWidget` component for map/scout screens

### B3. Harvest Log (DONE)
- Backend model: `HarvestLog` with species, weapon, location, deer details, game check
- Full CRUD: log, list, update, delete harvests
- Season summary with bag limit tracking (antlered/antlerless breakdown)
- Game check compliance rate tracking
- Community harvest stats (anonymous, opt-in)
- Mobile: `HarvestLogScreen` with list view, season summary, log form modal
- Offline: saves locally, syncs when connected

### B4. Social Scouting Feed (DONE)
- Backend: full CRUD for scouting reports with species/county/land filters
- Upvote + comment system
- Mobile: SocialScreen wired to backend

### B5. Offline Maps UI (DONE)
- `OfflineMapsScreen`: download/delete/manage 5 MD regional tile packs
- Disk usage tracking, progress indicator during download
- Tips for offline hunting

### B6. Settings Screen (DONE)
- Notification preferences (season alerts, camp activity, reg changes, weather)
- Offline maps shortcut
- Metric/imperial unit toggle
- Clear local data option
- Privacy policy, version info, DNR link

### B7. AI Hunt Plan UI (DONE)
- `HuntPlanScreen`: species picker, weapon selector, date input, county dropdown
- County picker with all 24 MD counties
- Full plan display with sources and disclaimer
- Error handling with connection retry

---

## Sprint AB-Post — LLM Migration (COMPLETE)

### Gemini API Migration
- Switched from Anthropic Claude to Google Gemini 2.0 Flash (free tier) on 2026-03-31
- Reason: Anthropic API credit balance exhausted; Gemini offers generous free tier (15 RPM, 1M tokens/day)
- google-generativeai SDK added to requirements.txt
- Synchronous `generate_content()` wrapped in asyncio executor for async backend compatibility
- GEMINI_API_KEY added to Render environment variables
- Anthropic SDK retained as optional fallback dependency
- Deployed to Render via auto-deploy from GitHub push
- No breaking changes to API contracts; all endpoints remain fully functional

---

## Sprint C — Premium Polish (IN PROGRESS)

### C1. WebSocket Real-Time Sync (DONE)
- `app/modules/websocket/manager.py` — ConnectionManager with per-camp rooms
- `app/modules/websocket/routes.py` — WebSocket endpoint at `/ws/camps/{camp_id}`
- JWT auth on connect, camp membership verification
- Message types: annotation_add/update/delete, photo_added, location_update, ping/pong
- Member online/offline presence with real-time roster broadcasts
- REST fallback: `/ws/camps/{camp_id}/online` for polling clients
- Mobile: `websocketService.ts` — CampWebSocket class with auto-reconnect (exponential backoff)

### C2. Push Notifications (APNS) (DONE)
- `app/modules/notifications/apns_service.py` — Full APNS service with PyAPNs2
- Token-based auth (.p8 key), lazy-init client
- `notify_camp_members()` — sends push to all camp members except actor
- `notify_season_alert()` — broadcast season opening/closing alerts
- Dev mode: logs notifications when APNS not configured
- `send_camp_notification()` in routes.py now wired to real APNS service

### C3. S3/R2 Photo Upload (DONE)
- `app/modules/photos/routes.py` — Presigned URL generation + upload confirmation
- Cloudflare R2 (S3-compatible) storage with boto3 client
- Upload flow: request URL → direct upload to R2 → confirm with backend
- Camp photos, harvest photos, scouting report photos supported
- `/api/v1/photos/upload-url` + `/api/v1/photos/confirm` + `/api/v1/photos/camp/{id}`
- Mobile: `photoService.ts` — upload with offline queue and automatic retry
- Dev fallback: local upload endpoint when R2 not configured

### C4. 3D Terrain (DONE)
- `MapScreen.tsx` — Mapbox `RasterDemSource` + `Terrain` + `HillshadeLayer` + `Atmosphere` + `SkyLayer`
- 3D toggle button in map controls (ON/OFF)
- Terrain exaggeration cycle: 0.5x, 1.0x, 1.5x, 2.0x, 3.0x (tap to cycle)
- `ElevationProfile.tsx` — Track elevation chart with distance, gain/loss, min/max stats
- `TerrainControls.tsx` — Inline terrain settings panel with exaggeration presets and hunting tips
- Hillshade illumination at 335°, accent color #4a6741 (forest green)
- Atmosphere + sky layer for immersive 3D experience

### C6. Navigation Wiring (DONE)
- Stack navigation wrappers: `MapStack`, `AIStack`, `ResourcesStack`
- Sub-screens accessible via push: Settings, HarvestLog, HuntPlan, OfflineMaps
- ResourcesHub quick-access toolbar: Harvest Log + Settings pill buttons
- ChatScreen Hunt Plan Generator banner with navigation to HuntPlanScreen
- All Sprint B screens now reachable from main tabs

### C5. WatermelonDB Migration (PENDING)
- Replace AsyncStorage with WatermelonDB (SQLite)
- Schema: plans, tracks, camps, annotations, photos
- Sync adapter connecting to backend REST endpoints
- Offline queue with automatic retry

---

## Sprint D — Growth (Ongoing)

### D1. Multi-State Expansion (PENDING)
- Virginia + Pennsylvania data pack scrapers
- State-specific regulation chunks for RAG
- State selector in app settings

### D2. Forum / Marketplace (DONE)
- `ForumThread` model: discussion threads with categories, land association, tags, upvotes
- `ForumReply` model: nested comment system with upvotes and moderation
- `MarketplaceListing` model: gear buy/sell/trade with pricing, condition, 30-day expiry
- `LandPermission` model: hunting lease/access listings with species, weapons, pricing
- Full CRUD endpoints: `/api/v1/forum/threads`, `/marketplace`, `/land-permissions`
- Thread filtering: category, land_id, county; sorting: recent, popular, active
- Marketplace filtering: category, listing_type, price range
- Mobile: `ForumScreen` with 3-tab layout (Forum, Gear, Land)
- Category filter chips, thread cards, marketplace cards, creation modal
- Forum accessible from Resources tab quick-access toolbar
- Moderation flags (is_flagged, is_removed, is_locked) on all content types

### D3. MATLAB Analytics
- MD DNR harvest data ingestion
- Success probability models by land, season, weapon
- Population density heatmaps
- Trend analysis dashboard

### D4. Monetization
- Non-intrusive ads (banner on Resources tab)
- Premium tier: offline maps, 3D terrain, advanced analytics
- Sponsored content from outdoor brands

---

## New Files Created (Sprint A+B Session 2)

### Backend
```
app/models/harvest.py                    — Harvest log SQLAlchemy model
app/modules/harvest/__init__.py          — Package init
app/modules/harvest/routes.py            — Full harvest CRUD + season summary + community stats
app/modules/integrations/solunar_service.py — Moon phase, solunar periods, activity ratings
```

### Backend Modified
```
app/main.py                              — Added harvest router
app/models/__init__.py                   — Added harvest import
app/modules/ai_planner/service.py        — Rewritten for Gemini; added generate_hunt_plan() + system prompt
app/modules/ai_planner/routes.py         — Added /hunt-plan endpoint + HuntPlanRequest/Response
app/modules/ai_planner/config.py         — Updated with Gemini settings
app/modules/integrations/routes.py       — Added /solunar, /solunar/week, /moon endpoints
requirements.txt                         — Added google-generativeai dependency
```

### Mobile
```
screens/OfflineMapsScreen.tsx            — Offline map download manager UI
screens/SettingsScreen.tsx               — App settings (notifications, maps, units, data)
screens/HarvestLogScreen.tsx             — Harvest log with list, summary, form
screens/HuntPlanScreen.tsx               — AI hunt plan generator UI
services/solunarService.ts              — Solunar data fetching + offline fallback
components/map/SolunarWidget.tsx         — Compact solunar badge for map screens
```

## New Files Created (Sprint C4 Session)

### Mobile
```
components/map/ElevationProfile.tsx      — Track elevation profile chart with stats
components/map/TerrainControls.tsx       — 3D terrain settings panel with exaggeration presets
navigation/AppNavigator.tsx              — Updated: stack navigation wrappers for sub-screens
screens/MapScreen.tsx                    — Updated: 3D terrain (DEM + hillshade + atmosphere + sky)
screens/ChatScreen.tsx                   — Updated: Hunt Plan banner + navigation
screens/ResourcesHubScreen.tsx           — Updated: quick-access toolbar (Harvest Log, Settings)
```

---

## Architecture Notes

- **Offline-first principle**: Every feature must work without internet, syncing when connected
- **Maryland-first**: All features validated on MD data before multi-state expansion
- **DNR disclaimer**: Every AI response and regulation display includes "Verify with MD DNR" footer
- **Privacy**: Anonymous by default, username-based profiles, no real names required
- **Graceful degradation**: Gemini API → raw chunks → local knowledge base → error message
