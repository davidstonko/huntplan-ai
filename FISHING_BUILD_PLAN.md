# Phase 4: Fishing Module Build Plan

> **CANONICAL REPO LOCK:** This plan applies to `~/Documents/huntmaryland-build/` ONLY. If you see this file in any other folder (e.g. `huntplan-ai/mobile/`), that copy is **stale** — flag it to David and stop. (Lock added 2026-04-26 after a parallel V2.3 fork consolidation.)


**Created:** 2026-04-04
**Target:** Mirror hunting module structure for Maryland fishing
**Status:** Implementation in progress

---

## Current Status (Audit 2026-04-11)

- **Crabbing + Boating consolidated into Fish module** (2026-04-08)
- **FishCampScreen replaced by HoneyHoleScreen** — shared maps with fixed viewport, 6 annotation categories (water features, structure, navigation, fishing intel, catch photos, bait/depth)
- **FishRegulationsScreen expanded to 5-tab layout** — Fishing, Can I Fish?, Crabbing, Boating, Licenses
- **FishMapScreen has boat ramp toggle** (⚓ anchor icon) + crabbing locations toggle (🦀 crab emoji)
- **Monetization tier system built into camp/honey hole** — 10 free members, $5/25 paid blocks per camp. Tier upgrades local-state only; payment NOT wired (need RevenueCat/react-native-iap)
- **Full chat system integrated** — Real-time group chat with emoji picker (96 emojis, 6 categories), reactions, typing indicators, unread badges, message deletion
- **Sprint F-0 shared refactor NOT DONE YET** — duplicated logic between DeerCamp and HoneyHole screens still needs consolidation
- **Sprint F-A through F-E mostly implemented** — check FISHING_BUILD_PLAN sprints section for details

---

## 1. Data Inventory

### GIS Data Sources (MD DNR ArcGIS REST Services)

All services hosted at `dnr.geodata.md.gov/dnrdata/rest/services/Fisheries/`

| Service | Layer | Geometry | Count | Key Fields | Priority |
|---------|-------|----------|-------|------------|----------|
| **PublicFishingAccessSites** | 0 | Point | **307** | Name, County, Waterbody, FishTypes, Ramp, ShoreFishi, FlyFishing, AccessRating, Amenities (20+ fields), WebLink, X/Y | **P0 — Core** |
| **TroutStockingActivities** | 0 (Points), 1 (Lines) | Point + Polyline | **68** | LOCATION, Species, NumOfFish, ActivityDate, coords | **P0 — Core** |
| **FishingGrounds** | 0 | Polygon | **61** | Name, Area, Length (Chesapeake Bay popular fishing areas) | **P0 — Core** |
| **TidalBass** | 0 | Point | **3,342** | SiteName, Year, LMB_Count, LMB_Pres, Method, Region | P1 — Enhancement |
| **DesignatedUse_Trout** | 0 | Polyline | **28,123** | GNIS_Name, STream_Nam, Des_Use (class III/IV), LengthKM | P1 — Enhancement |
| **FishHatcheries** | 0 | Point | **16** | Facility, Owner, Contact_Na, Phone, Postal_Add | P1 — Enhancement |
| **MDSmallPondsSrvc** | 0 | Point | TBD | Small ponds statewide | P2 — Future |
| **GearAreasAndSanctuaries** | 0-6 | Polygon | 7 layers | Oyster sanctuaries, tong/dredge/dive areas | P2 — Future (Crab module) |
| **AnadromousFish** | — | — | TBD | Anadromous fish survey data | P2 — Future |

**Total P0 features: ~436 locations + 61 polygons**

### Regulation Data Sources

| Source | URL | Content | Format |
|--------|-----|---------|--------|
| **eRegulations MD Fishing** | eregulations.com/maryland/fishing | Species seasons, bag limits, size limits, gear rules | HTML (scrape) |
| **MD DNR Fishing Regs** | dnr.maryland.gov/fisheries/pages/regulations/index.aspx | Official regulation categories: Recreational, Blue Crab, Commercial | HTML links |
| **Striped Bass 2026** | news.maryland.gov/dnr (March 2026) | New 2026 season: C&R April, harvest May 1+, 19-24" slot, spawning closures | Structured |
| **Yellow Perch Update** | eRegulations | Decreased to 5/day in all tidal + nontidal | Structured |

### License Data

| Type | Fee | Notes |
|------|-----|-------|
| Resident Nontidal (Freshwater) | $32/yr | Increased June 2025 (first in 20 years) |
| Trout Stamp | $20/yr | Required for trout fishing |
| Chesapeake Bay & Coastal | $15/yr | Tidal waters |
| Nonresident Nontidal | Varies (reciprocal) | ≥ Home state's fee for MD residents |
| Under 16 | Free | No license required |
| Free Fishing Days 2026 | — | June 6, June 13, July 4 |

### Tidal/Weather Data

| Source | API | Data | Format |
|--------|-----|------|--------|
| **NOAA Tides & Currents** | api.tidesandcurrents.noaa.gov/api/prod/ | Tide predictions, water levels, currents | JSON/CSV/XML |
| **NOAA MDAPI** | api.tidesandcurrents.noaa.gov/mdapi/prod/ | Station metadata | JSON |
| **NOAA CBOFS** | tidesandcurrents.noaa.gov/ofs/cbofs/ | Chesapeake Bay forecasts (water level, temp, salinity, currents) | Multiple |
| **MD DNR Tide Finder** | dnr.maryland.gov/fisheries/Pages/Tide-Finder.aspx | MD-specific tide predictions | Web |
| **NOAA Weather** | weather.gov API | Already integrated (hunting module) | JSON |

### Boat Ramp / Water Access

| Source | URL | Notes |
|--------|-----|-------|
| **MD Water Access Guide** | dnr.maryland.gov/boating/pages/water-access/boatramps.aspx | Official interactive guide |
| **Public Water Access (ArcGIS)** | maryland.maps.arcgis.com/apps/webappviewer/index.html?id=434ab9c6980c4ea2a45f55ca6dcefc8a | GIS viewer |
| **PublicFishingAccessSites** | (Already in GIS inventory above) | 307 sites with Ramp=Yes/No field |

---

## 2. Fish Mode Tab Structure

### Target: Mirror Hunt Mode (5 tabs)

```
Fish Map | Spots | AI | Fish Camp | Resources
```

| Tab | Hunt Equivalent | Description |
|-----|----------------|-------------|
| **Fish Map** | Map | Full Mapbox map with fishing locations, stocking sites, fishing grounds, filters |
| **Spots** | Scout | Fishing spot planning — save spots, record fishing trips, annotations |
| **AI** | AI | Fishing-focused RAG chat — regulations, species ID, stocking reports, tides |
| **Fish Camp** | Deer Camp | Collaborative shared fishing maps with friends |
| **Resources** | Resources | Segmented: Regulations \| Links & Guides \| Out of State |

### Tab Icons
```typescript
const FISH_ICONS: Record<string, string> = {
  MAP: '🗺️',      // Same as hunt
  SPOTS: '🎣',     // Fishing rod
  AI: '🤖',        // Same as hunt
  CAMP: '⛵',      // Boat/fishing camp
  RESOURCES: '📚', // Same as hunt
};
```

---

## 3. Data Pipeline

### Step 1: generate_maryland_fishing_data.py

Mirror the hunting pipeline (`generate_maryland_lands_v2.py`). Python script that:

1. **Queries PublicFishingAccessSites** (307 points) — paginate with resultOffset
2. **Queries TroutStockingActivities** (68 points) — full download
3. **Queries FishingGrounds** (61 polygons) — full download
4. **Queries FishHatcheries** (16 points) — full download
5. **Merges into single JSON** with normalized schema
6. **Outputs:** `src/data/marylandFishingData.ts` (bundled) + `src/data/mdFishingGISData.json` (polygons)

### Output Schema: FishingLocation

```typescript
interface FishingLocation {
  id: string;                    // 'pfa-{OBJECTID}' | 'ts-{LocationID}' | 'fg-{OBJECTID}'
  type: 'access_site' | 'stocking_location' | 'fishing_ground' | 'hatchery';
  name: string;
  county: string;
  waterbody: string;
  latitude: number;
  longitude: number;

  // Access site fields (307 sites)
  fishTypes?: string;            // Species available
  hasRamp?: boolean;
  hasShoreFishing?: boolean;
  hasFlyFishing?: boolean;
  accessRating?: 'Easy' | 'Moderate' | 'Difficult' | 'Unknown';
  amenities?: {
    restroom: boolean;
    picnicArea: boolean;
    campsites: boolean;
    boatRental: boolean;
    baitShop: boolean;
    piers: boolean;
    kayakCanoe: boolean;
    parking: string;             // ParkingTyp
    ada: boolean;                // AccessibleSp
  };
  fee?: boolean;
  hoursOfOperation?: string;
  operatingAgency?: string;
  webLink?: string;
  specialRegulations?: string;
  licenseType?: string;

  // Stocking fields (68 locations)
  stockingHistory?: {
    date: string;                // ISO date
    species: string;
    numFish: number;
  }[];

  // Fishing ground fields (61 areas)
  // Polygon geometry stored in separate GeoJSON file
  area?: number;                 // sq degrees

  // Hatchery fields (16 facilities)
  owner?: string;
  contact?: string;
  phone?: string;
  address?: string;

  // Display
  color: string;                 // For map marker
  icon: string;                  // Marker icon type
}
```

### Step 2: Fishing Regulations Data

Create `src/data/marylandFishingData.ts` with structured regulations:

```typescript
interface FishingRegulation {
  species: string;
  waterType: 'tidal' | 'nontidal' | 'both';
  season: { open: string; close: string } | 'year-round';
  dailyCreel: number | string;
  minSize: string;
  maxSize?: string;              // Slot limits (e.g., striped bass 19-24")
  gearRestrictions?: string[];
  specialNotes?: string;
}
```

### Step 3: Trout Stocking Live Feed

The DNR updates trout stocking weekly during season. Create a service to fetch fresh data:

```typescript
// services/stockingService.ts
// Queries TroutStockingActivities FeatureServer for latest stocking events
// Caches results in AsyncStorage with 24-hour TTL
// Falls back to bundled data when offline
```

---

## 4. Sprint Breakdown

> **IMPORTANT:** See `SHARED_COMPONENTS_PLAN.md` for full cross-mode reusability analysis.
> Sprint F-0 sets up shared infrastructure so fishing doesn't duplicate hunting code.

### Sprint F-0: Shared Infrastructure Refactor (1-2 days)

**Goal:** Set up mode-agnostic architecture before building fishing-specific code

Tasks:
1. Create `src/config/activityModeConfig.ts` — full config objects for hunt + fish modes (filters, icons, labels, KB keys)
2. Move AnnotationLayer, TrackMeBar, MeasureTool, CompassOverlay to `src/components/shared/` (update imports)
3. Update ScoutDataContext storage keys to be mode-aware (`@scout_${mode}_plans`)
4. Update DeerCampContext storage keys to be mode-aware (`@camp_${mode}`)
5. Add `useActivityMode()` to ChatScreen — switch welcome message + suggestion chips by mode
6. Rename `types/deercamp.ts` → `types/camp.ts` (keep backward-compat exports)
7. Update PlanSidebar + PlanCreationFlow to read labels/icons from `activityModeConfig`
8. Create generic `MapFilterPanel` that renders filters from config instead of hardcoded SPECIES_MAP/WEAPON_MAP
9. Run `npx tsc --noEmit` — 0 errors after refactor

**Why this sprint exists:** The audit found that ~70% of the hunting code is already generic. By extracting shared components FIRST, fishing builds on shared infrastructure instead of duplicating it. This also means Crabbing, Boating, and Hiking modules (Phase 5) get ~60-70% of their code for free.

### Sprint F-A: Data Pipeline + Fish Map (3-4 days)

**Goal:** Full-featured fishing map with all 436+ locations

Tasks:
1. Create `scripts/generate_maryland_fishing_data.py` — query all 4 GIS services, merge, output TS + GeoJSON
2. Run pipeline, validate output, commit data files
3. Create `src/data/marylandFishingData.ts` with typed fishing location array
4. Create `src/data/mdFishingGISData.json` with fishing ground polygons
5. Rebuild `FishMapScreen.tsx` — full Mapbox map replacing current link-card placeholder:
   - Point markers for access sites (307), stocking locations (68), hatcheries (16)
   - Polygon overlays for fishing grounds (61)
   - Dual-layer markers (same pattern as hunting map)
   - Data-driven colors by location type
   - Labels at zoom 10+
6. Create `FishFilterPanel` — filters for:
   - **Location Type:** Access Site, Stocking Site, Fishing Ground, Hatchery
   - **Waterbody:** Chesapeake Bay, River, Lake/Pond, Stream, Ocean
   - **Species:** Trout, Bass, Striped Bass, Catfish, Panfish, Saltwater
   - **Amenities:** Boat Ramp, Shore Fishing, Fly Fishing, ADA, Restrooms
   - **Stocking:** Recently Stocked (within 30 days)
7. Create `FishInfoPanel` — tap location → slide-up detail panel:
   - Name, waterbody, county
   - Species available, amenities icons
   - Stocking history (if stocking location)
   - Directions link, DNR web link
   - Access rating badge

### Sprint F-B: Spots Tab + Fish Camp (3-4 days)

**Goal:** Fishing spot planning and collaborative fishing maps

Tasks:
1. Create `src/types/fishing.ts` — FishingSpot, FishingTrip, FishCatch types
2. Create `src/context/FishingDataContext.tsx` — AsyncStorage-backed CRUD for spots/trips
3. Create `src/screens/FishSpotsScreen.tsx` — mirror ScoutScreen:
   - Full Mapbox map with fishing layers
   - Spot creation flow (Name → Location → Species → Notes → Save)
   - Trip recording (like TrackMe but for fishing sessions — start time, end time, catches)
   - Annotation layer for personal fishing spots
4. Create `src/screens/FishCampScreen.tsx` — mirror DeerCampScreen:
   - Share fishing spots with friends
   - Collaborative fishing maps
   - Photo geotagging for catches
   - Activity feed
5. Wire both screens into AppNavigator fish mode tabs

### Sprint F-C: Fishing Regulations + AI (2-3 days)

**Goal:** Comprehensive fishing regulations and AI chat with fishing knowledge

Tasks:
1. Create `src/data/marylandFishingRegs.ts` — structured regulations data:
   - Freshwater species: seasons, creel limits, size limits
   - Tidal species: striped bass (2026 slot), yellow perch, blue crab
   - Gear restrictions, special management areas
   - License requirements and fees
   - Free fishing days
2. Create `src/screens/FishRegulationsScreen.tsx` — mirror RegulationsScreen:
   - Three segments: Seasons & Limits | Can I Fish? | Licenses
   - Species cards with expandable details
   - "Can I Fish?" interactive checker (species + location + date → answer)
   - License fee table with purchase links
3. Create `src/data/fishingChatKnowledge.ts` — RAG knowledge base for fishing:
   - All regulation chunks
   - Stocking schedule info
   - Species identification
   - Tide/weather impact on fishing
4. Update ChatScreen to detect fish mode and switch knowledge base
5. Update ResourcesHubScreen to show fishing regulations when in fish mode

### Sprint F-D: Tidal Data + Stocking Service (2-3 days)

**Goal:** Live tidal predictions and stocking report updates

Tasks:
1. Create `src/services/tidalService.ts`:
   - NOAA Tides API integration (api.tidesandcurrents.noaa.gov)
   - Fetch tide predictions for nearest MD station
   - Cache predictions in AsyncStorage (24-hour TTL)
   - Display: next high/low tide, tide chart (24-hour)
2. Create `src/services/stockingService.ts`:
   - Query TroutStockingActivities FeatureServer
   - Compare with bundled data, show "NEW" badge on recently stocked locations
   - Cache with 24-hour TTL, offline fallback to bundled data
3. Create `src/components/fish/TideWidget.tsx`:
   - Compact tide card (next high, next low, trend arrow)
   - Full tide chart (24h line graph with high/low annotations)
   - Shows on Fish Map and Fish Spots screens
4. Create `src/components/fish/StockingBanner.tsx`:
   - "Recently Stocked!" badge on stocking locations
   - Stocking activity feed (last 10 stockings statewide)
5. Add solunar data to fishing screens (already have solunarService)

### Sprint F-E: Resources + Out-of-State + QC (2-3 days)

**Goal:** Complete resources section and polish

Tasks:
1. Create `src/screens/FishResourcesScreen.tsx` — mirror ResourcesScreen:
   - Curated fishing links (MD DNR Fishing & Boating, eRegulations, stocking reports)
   - Chesapeake Bay resources
   - Boat ramp guide links
   - Species identification guides
2. Create `src/screens/FishOutOfStateScreen.tsx`:
   - Nonresident fishing licenses
   - Reciprocal agreements
   - Charter boat info
   - Popular visitor destinations
3. Update ResourcesHubScreen to switch content based on activity mode
4. QC pass: TypeScript 0 errors, theme compliance, offline testing
5. Update CLAUDE.md, ARCHITECTURE.md with fishing module documentation

---

## 5. New Files Summary

```
scripts/
  generate_maryland_fishing_data.py    # Data pipeline

src/
  data/
    marylandFishingData.ts             # 436+ fishing locations (typed)
    mdFishingGISData.json              # Fishing ground polygons (GeoJSON)
    marylandFishingRegs.ts             # Structured regulations
    fishingChatKnowledge.ts            # AI knowledge base for fishing

  types/
    fishing.ts                         # FishingLocation, FishingSpot, FishingTrip, FishCatch

  context/
    FishingDataContext.tsx              # Spots + trips CRUD (AsyncStorage-backed)

  screens/
    FishMapScreen.tsx                   # REBUILD — full Mapbox map (replaces link cards)
    FishSpotsScreen.tsx                # NEW — fishing spot planning (mirrors Scout)
    FishCampScreen.tsx                 # NEW — collaborative fishing maps (mirrors Deer Camp)
    FishRegulationsScreen.tsx          # NEW — fishing regulations (mirrors RegulationsScreen)
    FishResourcesScreen.tsx            # NEW — fishing links & guides
    FishOutOfStateScreen.tsx           # NEW — nonresident fishing guide

  components/
    fish/
      FishFilterPanel.tsx              # Location type, species, amenities filters
      FishInfoPanel.tsx                # Tap-to-view fishing location details
      TideWidget.tsx                   # NOAA tide predictions display
      StockingBanner.tsx               # Recently stocked locations banner
      FishSpotCreationFlow.tsx         # Spot creation wizard
      FishTripRecorder.tsx             # Fishing trip session recorder

  services/
    tidalService.ts                    # NOAA Tides API integration
    stockingService.ts                 # Live trout stocking data service

  navigation/
    AppNavigator.tsx                   # UPDATE — 5-tab fish mode config
```

---

## 6. Backend Additions (Phase 4+)

Not required for initial fishing build (offline-first), but planned:

| Module | Endpoints | Purpose |
|--------|-----------|---------|
| fishing_regulations | 5 | Species lookup, can-i-fish, season calendar |
| fishing_locations | 6 | PostGIS spatial queries for fishing sites |
| stocking | 3 | Latest stocking events, stocking history by location |
| tidal | 2 | Cached NOAA tide predictions, station lookup |
| fishing_ai | 2 | RAG pipeline with fishing regulation chunks |

---

## 7. NOAA Tide Stations (Maryland)

Key stations for the app (NOAA station IDs):

| Station | ID | Location |
|---------|----|----------|
| Baltimore | 8574680 | Inner Harbor |
| Annapolis | 8575512 | Naval Academy |
| Cambridge | 8571892 | Choptank River |
| Solomons Island | 8577330 | Patuxent River |
| Tolchester Beach | 8573364 | Upper Bay |
| Ocean City | 8570283 | Inlet |
| Chesapeake City | 8573927 | C&D Canal |
| Point Lookout | 8577188 | Potomac/Bay junction |
| Havre de Grace | 8573364 | Susquehanna |
| Crisfield | 8571421 | Tangier Sound |

API call example:
```
https://api.tidesandcurrents.noaa.gov/api/prod/datagetter?
  begin_date=20260404&end_date=20260405&
  station=8574680&product=predictions&
  datum=MLLW&time_zone=lst_ldt&
  units=english&interval=hilo&format=json
```

---

## 8. Dependencies

No new npm packages required. Existing stack covers all needs:
- Mapbox: `@rnmapbox/maps` (already installed)
- Storage: `@react-native-async-storage/async-storage` (already installed)
- HTTP: Axios via `services/api.ts` (already installed)
- Navigation: `@react-navigation/bottom-tabs` + `@react-navigation/native-stack` (already installed)

---

## 9. Estimated Timeline

| Sprint | Duration | Deliverable |
|--------|----------|-------------|
| **F-0** | **1-2 days** | **Shared infrastructure refactor (activityModeConfig, shared components)** |
| F-A | 3-4 days | Data pipeline + Fish Map with 436+ locations |
| F-B | 2-3 days | Spots tab + Fish Camp (**faster — reuses shared Scout/Camp components**) |
| F-C | 2-3 days | Fishing regulations + AI knowledge base |
| F-D | 2-3 days | Tidal data + live stocking service |
| F-E | 2-3 days | Resources + Out-of-State + QC |
| **Total** | **12-17 days** | **Full fishing module, feature parity with hunting** |

> **Phase 5 savings:** After F-0, each future module (Crab, Boat, Hike) needs only ~30-40% new code:
> GIS pipeline, regulations data, knowledge base, links, and any mode-specific unique features.
> The map, planning, tracking, camping, and AI infrastructure are all shared.

---

## 10. Key Decisions

1. **PublicFishingAccessSites is the anchor dataset** — 307 locations with rich metadata (amenities, species, ratings). This is the fishing equivalent of the 192 public hunting lands.

2. **Trout stocking is a differentiator** — Weekly updates from DNR give the app a live data advantage. StockingService refreshes from FeatureServer with 24h TTL + offline fallback.

3. **Fishing grounds polygons render on map** — 61 Chesapeake Bay popular fishing areas as filled polygons (same technique as hunting land boundaries).

4. **Tidal data via NOAA API** — Free, no API key required, JSON format, reliable. Station-based predictions for 10+ MD stations.

5. **Fish Camp reuses Deer Camp architecture** — Same DeerCampContext pattern with activity-mode-aware naming. Shared AnnotationLayer component works for both.

6. **Regulations structured same as hunting** — Species → Season → Creel → Size → Gear. "Can I Fish?" mirrors "Can I Hunt?" interactive checker.

7. **No new dependencies** — Everything builds on existing React Native + Mapbox + AsyncStorage stack.
