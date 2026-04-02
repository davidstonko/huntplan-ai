# MDHuntFishOutdoors — Hunting Module Build Plan

**Last updated:** 2026-04-02
**Status:** V2 live on App Store, backend live on Render (v3.0.0), Sprints A+B+C complete (except C5 WatermelonDB migration)

---

## Hunter UX Audit (2026-04-02)

A full audit of every screen, service, context, and backend module from the perspective of a Maryland hunter using the app in the field. This drives the priority list below.

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

### Critical UX Gaps (Things a hunter would notice immediately)

1. **No offline indicator** — Hunter drives to Green Ridge SF, loses signal, has no idea if data is stale or fresh. No banner says "You're offline."

2. **Date picker is text input (YYYY-MM-DD)** — In Regulations "Can I Hunt?" and Plan screens, hunter must type a date manually instead of tapping a calendar. Error-prone in the field with gloves.

3. **County dropdown is unsearchable** — 23 counties in a scroll list. Appears in Regulations, PlanScreen, HuntPlanScreen, HarvestLog. Should be a searchable picker.

4. **No barometric pressure trends** — Single biggest predictor of deer movement. Weather service tracks temp/wind but not pressure changes (6h/12h/24h trends). Hunters check pressure religiously.

5. **Push notifications don't navigate** — Notifications register with APNS but `handleNotificationRouting()` stores to AsyncStorage and never opens the relevant screen. Season alert comes in, hunter taps it, nothing happens.

6. **No background GPS tracking** — TrackMeBar stops recording when app is backgrounded. Hunter puts phone in pocket, walks 2 miles, track is incomplete.

7. **Can't edit plans after creation** — PlanScreen only supports create and delete. Hunter makes a plan, realizes parking coordinates are wrong, has to delete and start over.

8. **Social features are non-functional** — Upvote and Reply buttons exist in SocialScreen and ForumScreen but don't work. Hunter sees a scouting report, tries to upvote or reply, nothing happens.

9. **No map legend** — 9 land type colors (WMA red, CFL green, SF dark green, etc.) with no legend. New user has no idea what colors mean.

10. **Public land search not available from Map tab** — Hunter wants to find "Dan's Mountain WMA" from the map. Has to go to PlanScreen to search the 192-land database. Map tab has no text search.

### Medium UX Gaps

11. **No wind direction integration** — Scout plans don't account for wind. No "approach from downwind" recommendation. No current wind overlay on map.

12. **Rut prediction missing** — No breeding season timeline or behavior change predictions by rut phase. Hunters plan their entire November around this.

13. **Harvest log can't be edited** — Once logged, hunter can't fix typos or add game check number later. (Backend supports PATCH, but mobile UI doesn't expose edit.)

14. **Game check phone number not clickable** — `1-800-214-3337` appears in help text but isn't a tappable link.

15. **No photo capture for harvest log** — Can log species/weapon/weight but no photo attachment (backend supports photo_key but UI doesn't offer camera).

16. **Scout toolbar overwhelming** — 7 buttons stacked vertically on a phone screen. New users won't know what each does.

17. **42 MB GIS JSON bundled in app** — mdGISData.json ships in the binary. Should be fetched from API or lazy-loaded.

18. **Season data hardcoded (2025-2026)** — `marylandHuntingData.ts` won't update without a new app build. Should pull from backend.

19. **No hunt plan sharing** — Can't share a plan with Deer Camp members directly from PlanScreen. Export-to-camp exists in Scout but not in the manual plan builder.

20. **Chat history not persisted** — AI conversation resets when navigating away. Hunter asks a question, switches to Map, comes back — chat is gone.

### Low Priority / Polish

21. No GPS routing to selected WMA (could deep-link to Apple Maps)
22. No pack/gear checklist integrated with plans
23. No image compression before photo upload (large files on LTE)
24. No offline maps resume (interrupted download restarts from 0)
25. No dark mode detection (always dark — fine for hunting, but preference would be nice)
26. API requests not cached or deduplicated
27. WeatherOverlay doesn't show dew point (scent conditions)
28. Forum threads don't support reply viewing (thread detail view missing)
29. No community harvest heatmap (which WMAs produce most deer)
30. ActivityMode doesn't persist across restarts (always resets to Hunt)

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

### Sprint C — Premium Polish (MOSTLY COMPLETE)
- C1: WebSocket real-time sync for Deer Camp (manager, reconnect, presence)
- C2: Push notifications APNS (token registration, preferences — routing incomplete)
- C3: S3/R2 photo upload (presigned URLs, offline queue, confirmation)
- C4: 3D terrain (DEM, hillshade, atmosphere, sky, exaggeration presets)
- C5: WatermelonDB migration — **PENDING** (schema defined, migration code written, not activated)
- C6: Navigation wiring (stack navigators, sub-screen access from all tabs)

### Sprint D — Growth (PARTIAL)
- D2: Forum/Marketplace — COMPLETE (threads, gear listings, land permissions, moderation)
- D5: Feedback system — COMPLETE (mobile offline queue, backend API, Gmail SMTP, donation notifications)
- D6: Donate screen — COMPLETE (tiers, Venmo/BMC/Patreon, backend notification tap)

---

## Recommended Build Priority

Based on the hunter UX audit, here's what to build next, ordered by impact for real hunters:

### Sprint E — Field-Ready Polish (HIGH IMPACT)

**E1. Offline Network Banner** (2-3 hours)
- Show a persistent banner when `isOnline === false`
- Use `useNetworkStatus()` hook in AppNavigator
- Simple colored bar: "Offline — using cached data"
- Dismiss on reconnect

**E2. Calendar Date Picker** (3-4 hours)
- Replace text input with `@react-native-community/datetimepicker`
- Apply to: RegulationsScreen "Can I Hunt?", PlanScreen, HuntPlanScreen, HarvestLogScreen
- Default to today, restrict to current season range

**E3. Searchable County Picker** (3-4 hours)
- TextInput with filtered FlatList dropdown
- Replace county ScrollView picker in all 4+ screens
- Consider reusable `<SearchablePicker>` component

**E4. Map Land Search** (4-6 hours)
- Add search bar to MapScreen header
- Search against 192 land names (local, instant)
- On select: fly to land location, open LandInfoPanel
- Reuse PlanScreen's location search logic

**E5. Map Legend** (2-3 hours)
- Collapsible legend overlay showing land type colors
- 9 entries: WMA (red), CFL (green), SF (dark green), etc.
- Toggle via button on MapFilterPanel

**E6. Fix Push Notification Routing** (3-4 hours)
- Complete `handleNotificationRouting()` in pushNotifications.ts
- Map notification types to screen navigation:
  - `season_alert` → RegulationsScreen
  - `camp_activity` → DeerCampScreen
  - `regulation_change` → RegulationsScreen
  - `weather_alert` → MapScreen (weather overlay)

**E7. Edit Hunt Plans** (3-4 hours)
- Add edit button to PlanScreen plan cards
- Pre-populate form with existing plan data
- Save updates via context CRUD

**E8. Make Game Check Number Clickable** (30 min)
- Wrap `1-800-214-3337` in `Linking.openURL('tel:18002143337')`
- Apply in HarvestLogScreen help text

### Sprint F — Hunter Intelligence (MEDIUM IMPACT)

**F1. Barometric Pressure Trends** (6-8 hours)
- Backend: Add pressure history tracking (NOAA includes pressure in forecast data)
- Calculate 6h/12h/24h trends (rising/falling/stable)
- Mobile: Add pressure widget to weather overlay
- Deer activity formula: rising pressure = increased movement
- This is the #1 feature serious deer hunters would want

**F2. Wind Direction Overlay** (4-6 hours)
- Show current wind direction arrow on map
- Color-code: green = favorable (downwind approach), red = unfavorable
- Integrate with scout plan — suggest approach routes based on wind

**F3. Rut Prediction Calendar** (4-6 hours)
- Add MD rut timeline to chatKnowledge.ts and regulations data
- Pre-rut (late Oct), Peak Rut (Nov 5-15), Post-Rut (late Nov)
- AI chat should reference rut phase when answering November questions
- Optional: push notification for rut phase changes

**F4. Background GPS Tracking** (6-8 hours)
- Use `react-native-background-geolocation` or equivalent
- Keep TrackMeBar recording when app is backgrounded
- Critical for all-day scouting trips
- Battery impact warning in UI

**F5. Harvest Log Edit + Photo** (4-6 hours)
- Add edit mode to harvest log entries (backend PATCH already works)
- Add camera/gallery picker for harvest photos
- Upload via photoService with offline queue
- Display photo thumbnail on harvest card

### Sprint G — Social & Community (LOWER IMPACT)

**G1. Fix Upvote/Reply** (4-6 hours)
- Wire upvote buttons to backend endpoints (already exist)
- Implement reply UI for scouting reports and forum threads
- Show reply count accurately

**G2. Chat History Persistence** (3-4 hours)
- Save conversation to AsyncStorage per session
- Restore on screen re-mount
- Add "Clear Chat" button

**G3. Plan Sharing to Deer Camp** (3-4 hours)
- Add "Share to Camp" button on PlanScreen plan cards
- Use existing `importPlanToCamp()` from DeerCampContext
- Show camp picker modal

**G4. Community Harvest Heatmap** (8-12 hours)
- Backend: Aggregate anonymous harvest data by WMA
- Mobile: Render heatmap overlay on map
- Show "X deer harvested at [WMA] this season"

### Sprint H — Technical Debt

**H1. Remove 42 MB GIS JSON from Bundle** (4-6 hours)
- Serve mdGISData.json from backend API
- Cache locally after first fetch
- Reduce app binary size significantly

**H2. Dynamic Season Data** (4-6 hours)
- Fetch seasons/bag limits from backend instead of hardcoded TS
- Cache in AsyncStorage with freshness check
- Backend already serves this via `/api/v1/regulations/seasons`

**H3. Admin RBAC** (2-3 hours)
- Add `is_admin` flag to User model
- Protect `/admin/*` feedback endpoints
- Currently any auth user can access admin routes

**H4. Alembic Migrations** (4-6 hours)
- Set up Alembic for proper schema versioning
- Currently using `create_all()` at startup (dangerous for production)

**H5. Image Compression** (2-3 hours)
- Compress photos to 1080p before upload
- Reduces upload time on LTE significantly

---

## Backend Endpoint Coverage

| Module | Endpoints | Mobile Wired? | Notes |
|--------|-----------|---------------|-------|
| Auth | 4 | Yes | Silent register on launch |
| Regulations | 5 | Yes | "Can I Hunt?" + seasons + bag limits |
| Lands | 6 | Partial | api.ts has types, MapScreen uses local data |
| AI Planner | 2 | Yes | ChatScreen + HuntPlanScreen |
| Deer Camp | 12 | Yes | Full sync via campSyncService |
| WebSocket | 2 | Yes | websocketService.ts |
| Export | 4 | Partial | On-device export exists; backend export not used |
| Harvest | 7 | Yes | HarvestLogScreen with offline fallback |
| Social | 5 | Yes | SocialScreen feed + posting |
| Forum | 9+ | Yes | ForumScreen 3-tab layout |
| Photos | 5 | Yes | photoService with offline queue |
| Integrations | 3 | Yes | Weather + solunar widgets |
| Notifications | 4 | Partial | Token registered, routing broken |
| Feedback | 6 | Yes | Offline queue + admin panel |

---

## Development Phases

- **V1** (shipped 2026-03-30): Hunting MVP
- **V2** (live, App Store): Scout + Deer Camp + branding
- **Sprint E** (next): Field-ready polish (offline banner, date pickers, search, legend)
- **Sprint F** (after E): Hunter intelligence (pressure, wind, rut, background GPS)
- **Sprint G**: Social polish (upvotes, chat persistence, plan sharing)
- **Sprint H**: Technical debt (bundle size, dynamic data, admin RBAC, migrations)
- **Phase 4** (Weeks 23-30): Fishing module — MD fishing regulations, stocking reports, boat ramps
- **Phase 5** (Weeks 31+): Crabbing + Boating + Hiking modules
- **Phase 6** (Post-launch): Monetization, multi-state expansion (VA, PA)

---

## Architecture Notes

- **Offline-first**: Every feature must work without internet, syncing when connected
- **Maryland-first**: All features validated on MD data before multi-state expansion
- **DNR disclaimer**: Every AI response and regulation display includes "Verify with MD DNR"
- **Privacy**: Anonymous by default, username-based profiles, no real names required
- **Graceful degradation**: Gemini API → raw chunks → local knowledge base → error message
- **WatermelonDB**: Schema defined, migration code ready — activation is Sprint C5 (pending)
- **Bundle ID locked**: com.davidstonko.huntmaryland (registered with Apple, do NOT change)
