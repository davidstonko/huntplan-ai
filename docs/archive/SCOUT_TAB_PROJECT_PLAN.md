> **DEPRECATED** — This was the original Scout tab design spec. See [ARCHITECTURE.md](ARCHITECTURE.md) for the current system architecture.

# Scout Tab — Project Plan

## Overview

Merge the current **Plan** and **Scout** tabs into a single **Scout** tab. This tab contains a full copy of the hunting map with additional interactive scouting and planning tools layered on top. All data saved to the main Map also appears here, and vice versa.

---

## Architecture Summary

**ScoutScreen** is a full-screen Mapbox map (same data layers as MapScreen) with an overlay toolbar providing scouting tools. Plans are stored as named groups of map annotations (markers, routes, drawings) that can be toggled on/off independently.

**Shared data layer:** Both MapScreen and ScoutScreen read from the same `marylandPublicLands` dataset. User-created annotations (waypoints, routes, plans) are stored in a shared context (`ScoutDataContext`) backed by AsyncStorage so they persist across sessions.

---

## Tab Structure After Rework

**HuntMaryland tabs (6 → 5):**
| Old | New |
|-----|-----|
| Map | Map (unchanged — browse lands, filters, land details) |
| Regs | Regs (unchanged) |
| Plan | **REMOVED** — merged into Scout |
| AI | AI (unchanged) |
| Scout | **Scout** (full map + scouting tools + hunt plans + community reports) |
| Resources | Resources (unchanged) |

---

## Feature Breakdown

### Phase S1: Scout Map Foundation (Build Now)
**Goal:** Replace Plan + Scout tabs with a single Scout tab containing the full map.

1. **ScoutScreen.tsx** — New screen with full Mapbox map
   - Imports same land data, polygon layers, filter panel as MapScreen
   - Extract shared map rendering into a reusable `<HuntMap>` component or shared hook
   - Floating toolbar at top-right with tool icons
   - Bottom sheet for active tool controls

2. **ScoutDataContext.tsx** — Shared state for user annotations
   - `HuntPlan`: named group of annotations (waypoints, routes, areas)
   - `Waypoint`: lat/lng + icon + label + notes
   - `Route`: ordered array of lat/lng points + distance
   - `DrawingArea`: polygon drawn on map
   - AsyncStorage persistence
   - Methods: createPlan, addWaypoint, addRoute, deletePlan, togglePlanVisibility

3. **PlanSidebar.tsx** — Slide-out panel from left edge
   - Lists all saved hunt plans
   - Toggle switch per plan to show/hide on map
   - Tap plan name to expand and see its waypoints/routes
   - "New Plan" button at top
   - Swipe-to-delete on plans

4. **AppNavigator update** — Remove PlanTab, rename SocialTab → ScoutTab

### Phase S2: Compass Feature (Build Now)
**Goal:** OnX-style compass overlay on the Scout map.

1. **CompassOverlay.tsx**
   - Circular compass rose in corner of map
   - Shows current heading from device magnetometer (`react-native-sensors` or Mapbox heading)
   - Tap to toggle between magnetic north and true north
   - Shows bearing to selected waypoint when one is active
   - Bearing line drawn on map from user location to target

### Phase S3: TrackMe — GPS Tracking (Build Now)
**Goal:** Record your hike/scout with distance and track saving.

1. **TrackMeService.ts**
   - Start/stop GPS recording using `@react-native-community/geolocation` or Mapbox UserLocation
   - Records lat/lng every N seconds (configurable: 5s, 10s, 30s)
   - Calculates running distance (haversine formula)
   - Calculates elapsed time, avg speed, elevation gain (if available)

2. **TrackMeOverlay.tsx**
   - Floating panel showing: distance walked, time, avg speed
   - Start/Pause/Stop buttons
   - Polyline drawn on map in real-time as user moves
   - On stop: prompt to save track with a name
   - Saved tracks appear in PlanSidebar and can be toggled on/off

3. **MeasureTool.tsx** — Sub-feature of TrackMe
   - Tap two points on map → shows straight-line distance
   - Tap multiple points → shows total polyline distance
   - Shows bearing/angle between points
   - Optional: elevation profile if terrain data is available (defer to S5)

### Phase S4: Plan a Hunt Feature (Build Now)
**Goal:** Named, drawable hunt plans with full map annotation.

1. **PlanCreationFlow.tsx** — Step-by-step wizard
   - Step 1: Name the plan (e.g., "Turkey Hunting Opening Day")
   - Step 2: Set parking/start point — user taps map to place marker
   - Step 3: Add annotations — toolbar with:
     - **Waypoint marker** (stand location, blind, feeding area, camera)
     - **Route line** (approach route, escape route)
     - **Area polygon** (draw hunting zone, food plot area)
     - **Text note** (attach to any point)
   - Step 4: Review & Save

2. **Map annotation rendering**
   - Each plan gets a unique color (auto-assigned from palette)
   - Waypoints render as custom icons (tree stand, blind, camera, truck/parking)
   - Routes render as dashed or solid lines with direction arrows
   - Areas render as semi-transparent fill polygons
   - All annotations are draggable in edit mode

3. **Plan visibility system**
   - PlanSidebar shows all plans with eye-icon toggle
   - Multiple plans can be visible simultaneously (layered on map)
   - Active/editing plan is highlighted with a different border
   - "Edit" button per plan to re-enter annotation mode

4. **Community scouting reports** (moved from old SocialScreen)
   - Scouting report feed integrated into Scout tab
   - Toggle between "My Plans" and "Community" views in sidebar
   - Reports can reference specific WMAs from the database

### Phase S5: 3D Terrain (Build Later — Phase 3+)
**Goal:** Convert 2D topographic map to 3D perspective view.

1. **Mapbox Terrain Integration**
   - Mapbox GL supports `terrain` with DEM (Digital Elevation Model)
   - Add terrain source: `mapbox://mapbox.mapbox-terrain-dem-v1`
   - Toggle button: "2D / 3D" in toolbar
   - In 3D mode: pitch camera to ~60°, enable terrain exaggeration
   - User can pinch/rotate to explore terrain

2. **Elevation profile for tracks/routes**
   - Query Mapbox Tilequery API for elevation along a route
   - Render elevation chart below map when viewing a track
   - Show min/max elevation, total gain/loss

---

## Data Models

```typescript
// ── Scout Data Types ──

interface HuntPlan {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  color: string; // hex color for all annotations in this plan
  visible: boolean;
  parkingPoint: Waypoint | null;
  waypoints: Waypoint[];
  routes: Route[];
  areas: DrawnArea[];
  notes: string;
}

interface Waypoint {
  id: string;
  lat: number;
  lng: number;
  icon: WaypointIcon;
  label: string;
  notes: string;
}

type WaypointIcon = 'parking' | 'stand' | 'blind' | 'camera' | 'feeder'
                  | 'food-plot' | 'water' | 'crossing' | 'sign' | 'custom';

interface Route {
  id: string;
  points: [number, number][]; // [lng, lat] pairs
  style: 'solid' | 'dashed' | 'dotted';
  label: string;
  distanceMeters: number;
}

interface DrawnArea {
  id: string;
  polygon: [number, number][]; // [lng, lat] ring
  label: string;
  areaAcres: number;
}

interface RecordedTrack {
  id: string;
  name: string;
  date: string;
  points: TrackPoint[];
  distanceMeters: number;
  durationSeconds: number;
  visible: boolean;
}

interface TrackPoint {
  lat: number;
  lng: number;
  timestamp: number;
  altitude?: number;
  speed?: number;
}
```

---

## Implementation Order

| Step | What | Files | Est. Effort |
|------|------|-------|-------------|
| 1 | ScoutDataContext + data models + AsyncStorage | `ScoutDataContext.tsx` | 1 session |
| 2 | ScoutScreen with full map (clone MapScreen layers) | `ScoutScreen.tsx` | 1 session |
| 3 | Extract shared map component from MapScreen | `SharedMapLayers.tsx` | 1 session |
| 4 | PlanSidebar (list, toggle, create, delete) | `PlanSidebar.tsx` | 1 session |
| 5 | Update AppNavigator (remove Plan tab, wire Scout) | `AppNavigator.tsx` | Quick |
| 6 | CompassOverlay | `CompassOverlay.tsx` | 1 session |
| 7 | TrackMe service + overlay | `TrackMeService.ts`, `TrackMeOverlay.tsx` | 1-2 sessions |
| 8 | Measure tool (distance + bearing) | `MeasureTool.tsx` | 1 session |
| 9 | Plan creation wizard (name → parking → annotate) | `PlanCreationFlow.tsx` | 2 sessions |
| 10 | Map annotation rendering (waypoints, routes, areas) | ScoutScreen additions | 1-2 sessions |
| 11 | Plan visibility toggle system | PlanSidebar + ScoutScreen | 1 session |
| 12 | Move community reports into Scout sidebar | Migrate from SocialScreen | 1 session |
| 13 | 3D Terrain toggle (Phase 3+) | Mapbox terrain config | 1 session |
| 14 | Elevation profiles for tracks | Tilequery integration | 1 session |

---

## Hiking Analogy (Phase 5)

The Scout tab architecture is designed to be reusable for HikeMaryland:
- `HuntPlan` → `HikePlan` (same structure, different icons)
- `TrackMe` → identical (already generic)
- Compass → identical
- 3D Terrain → identical
- Waypoint icons change: stand/blind → viewpoint/campsite/water-source/trailhead
- Community reports → trail condition reports instead of scouting reports

The `ScoutDataContext` should be parameterized by activity mode so the same infrastructure serves both hunting and hiking.

---

## Dependencies / New Packages

- `react-native-sensors` — magnetometer for compass heading (or use Mapbox heading)
- `@react-native-community/geolocation` — high-accuracy GPS for TrackMe (already may be available via Mapbox UserLocation)
- `@turf/turf` — geospatial math: distance, bearing, area calculation, along
- No new native dependencies required for 3D terrain (built into Mapbox GL)

---

## Prerequisites Status (Updated 2026-03-29)

- [x] **Map data pipeline v2 complete** — 192 lands, 124 polygons, 72 enriched
- [x] **Hanover Watershed CWMA** confirmed visible with full detail data
- [x] **Point markers redesigned** — dual-layer white/colored circles, visible at all zoom levels
- [x] **Detail panel enriched** — parking, species, weapons, contact (clickable), reservations, access notes, descriptions, DNR Page + Map PDF buttons
- [x] **Data generation script** — generate_maryland_lands_v2.py merges 4 sources
- [ ] **Scout tab build** — READY TO START (Phase S1)

---

## Notes

- The main Map tab stays as-is for browsing/filtering lands. Scout is for active planning and fieldwork.
- All user annotations are local-first (AsyncStorage). Backend sync can be added later.
- Plans should be exportable as GPX/KML in Phase 2 (already in project roadmap).
