# MDHuntFishOutdoors — V2.2.0 App Review Notes

**App:** MDHuntFishOutdoors
**Apple ID:** 6761347484
**Bundle ID:** com.davidstonko.huntmaryland
**Version:** 2.2.0
**Build:** 7 (CURRENT_PROJECT_VERSION bumped 2026-04-18 — Xcode will auto-increment on re-archive if needed)
**Submission date:** (fill in at upload time)
**Apple Team ID:** BAFL96ZCUU

---

## Response to V2.1.0 rejection (2026-04-16)

V2.1.0 was rejected under guidelines 2.3.1(a) Hidden Features and 4.2 Minimum Functionality. V2.2.0 directly addresses both concerns by expanding the app from a single mode to **four fully-built outdoor recreation modes**, each with its own map, planning tools, and resource library.

### What is new in V2.2.0

**Hunt mode** (5 tabs — Map, Scout, AI, Deer Camp, Resources)
- 192 Maryland public hunting lands + 14 shooting ranges
- 124 hunting-land boundary polygons with 9 type filters
- **2,000 Landowner Blind Sites** from Maryland DNR — togglable Hunt-map layer with clustering (new in V2.2.0)
- Deer camp shared journal with WebSocket-ready schema
- Regulation chunks linked to each property

**Fish mode** (4 tabs — Fish Map, Spots, AI, Resources)
- 579 Maryland DNR angler access sites (446 access + 133 stocking) across 25 counties, 236 with boat ramps
- **100-segment Tidal/Non-Tidal boundary** overlay — shows anglers which regulation regime applies (new in V2.2.0)
- NOAA tide station integration
- Catch photo upload with EXIF stripping for privacy

**Camp mode** (5 tabs — Camp Map, Trip Planner, Group Camp, Gear, Resources)
- 25 verified Maryland campgrounds (state parks, state forests, AT backpacker shelters)
- Trip planner persisting to device storage (AsyncStorage)
- Group camp invite flow via Universal Links
- Gear recommender with Amazon affiliate links
- Full Leave No Trace, bear safety, tick/Lyme, fire policy resources

**Hike mode** (4 tabs — Hike Map, Trails, Trip Planner, Resources)
- Appalachian Trail in Maryland: 40.9 miles, 9 shelters, 10 trailheads, 12 landmarks, 10 water sources
- 19 verified state-park trails with distances
- 3-tier gear recommender (Day / Overnight / Multi-day)
- AT-specific resources, permits, trail etiquette

### Cross-cutting infrastructure added in V2.2.0

- Universal Links with Associated Domains entitlement (`applinks:davidstonko.github.io`), AASA live at https://davidstonko.github.io/huntmaryland-site/.well-known/apple-app-site-association with Apple Team ID `BAFL96ZCUU`
- Deep-link router (`mdhuntfish://` scheme) for group invites
- Analytics with offline queue (opt-in, respects user setting)
- Sentry client stub (dependency pending)
- Multi-state scaffolding (currently Maryland only)

---

## Why every mode satisfies 4.2 Minimum Functionality

Each mode is independently usable without any other mode:

- Hunt mode ships with 2,192 unique data points (lands + ranges + blinds)
- Fish mode ships with 679 unique data points (access sites + tidal segments)
- Camp mode ships with 25 verified campgrounds + full trip-planning CRUD
- Hike mode ships with AT + 19 trails + 3-tier gear system

None of these are placeholder screens — reviewer can open any tab in any mode and interact with real data.

---

## Data provenance

All geospatial and regulatory data sourced from Maryland Department of Natural Resources (MD DNR) public ArcGIS FeatureServer on organization `njFNhDsUCentVYJW`:
- `Public_View_Angler_Access_Sites_`
- `LandownerBlindSites2025`
- `Tidal_NonTidal_view/FeatureServer/1`

Campground data curated from MD State Parks reservation system, Maryland DNR public pages, and AT Conservancy published shelter lists. No data fabricated.

---

## Test account / demo flow

No account required to explore the app — all four modes are open to anonymous users for browsing maps and resources. Account creation (username-based, no email/password required) unlocks:
- Saving favorite blinds, spots, campgrounds, trails
- Creating trip plans
- Joining group camp sessions
- Deer camp journal

To test gated features, reviewer may create any account in-app — no verification required, synthetic handles accepted.

### Suggested 5-minute reviewer walkthrough

1. Launch app — lands on mode picker. Tap **Hunt**.
2. On the Hunt **Map** tab, zoom into central Maryland. Toggle the "Landowner Blinds" layer (2,000 blind pins cluster/uncluster with zoom) and any of the 9 land-type filters.
3. Tap any hunting-land polygon — info panel slides up with land name, type, and linked regulations.
4. Back to mode picker → tap **Fish**. On the **Fish Map** tab, toggle the "Tidal/Non-Tidal boundary" overlay (100 segments). Tap any angler access pin for site detail (facilities, boat ramp flag, stocked flag).
5. Back to mode picker → tap **Camp**. On **Camp Map**, tap any campground pin. Tap **Trip Planner** tab and create a sample trip; confirm it persists after closing and reopening the app.
6. Back to mode picker → tap **Hike**. On **Hike Map**, tap any AT landmark or state-park trail. Tap **Gear** or **Resources** tab to verify the tier recommender and AT etiquette content.

All four modes load real Maryland DNR / AT Conservancy data — no placeholder screens.

---

## Known limitations

- VA, PA, and other states are scaffolded but not active (Maryland-only at launch)
- Sentry crash reporting is stubbed (SDK installation deferred)
- Real-time lightning overlay on Weather is deferred to post-launch
- Honey Hole / Catch Log social features deferred to post-launch

None of these limitations affect core functionality in any of the four modes.

---

## Privacy

- `NSLocationWhenInUseUsageDescription` / `NSLocationAlwaysAndWhenInUseUsageDescription` — map user position and trip tracking
- `NSCameraUsageDescription` — catch/gear photos
- `NSPhotoLibraryUsageDescription` — photo uploads
- `NSPhotoLibraryAddUsageDescription` — save map screenshots
- EXIF stripped from all uploaded photos before transmission
- No tracking SDKs; analytics is first-party and opt-in
- Privacy manifest (`PrivacyInfo.xcprivacy`) declares all API usage

Contact: dstonko1@gmail.com for any review questions.
