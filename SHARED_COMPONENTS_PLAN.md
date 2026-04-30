# Shared Components & Cross-Mode Reusability Plan

**Created:** 2026-04-04
**Purpose:** Identify code that can be shared across all 5 activity modes (Hunt, Fish, Hike, Crab, Boat) to avoid duplication and accelerate Phase 4-6 development.

---

## 1. Audit Summary

After a full codebase audit, the results are clear: **~70% of the hunting module's code is already generic** and can be reused across all activity modes with minimal refactoring. The hunt-specific parts are concentrated in data, labels, filter configs, and knowledge bases — not in the core infrastructure.

### Reusability Scorecard

| Component | Generic | Hunt-Specific | Refactor Effort |
|-----------|---------|---------------|-----------------|
| **AnnotationLayer** | 100% | 0% | None |
| **TrackMeBar** | 100% | 0% | None |
| **MeasureTool** | 100% | 0% | None |
| **CompassOverlay** | 100% | 0% | None |
| **useLocation hook** | 100% | 0% | None |
| **deercamp.ts types** | 99% | 1% (name only) | Rename file |
| **DeerCampContext** | 95% | 5% (storage keys, table names) | Parameterize keys |
| **PlanSidebar** | 90% | 10% (labels) | Add mode prop |
| **PlanCreationFlow** | 90% | 10% (icon options, labels) | Config-driven |
| **ScoutDataContext** | 90% | 10% (storage keys, table names) | Parameterize keys |
| **ResourcesHubScreen** | 95% | 5% (child screens) | Swap children by mode |
| **weatherService** | 90% | 10% (hunt-specific calculations) | Add mode-specific logic |
| **ChatScreen** | 70% | 30% (KB, suggestions, welcome) | Mode-switch KB |
| **DeerCampScreen** | 65% | 35% (labels, harvest, sightings) | Config-driven + mode modals |
| **ScoutScreen** | 60% | 40% (filters, species, weapons) | Pluggable filter system |
| **MapScreen** | 60% | 40% (data, filters, colors) | Mode-specific data/filters |
| **RegulationsScreen** | 50% | 50% (data, logic) | Create per-mode variants |
| **ResourcesScreen** | 40% | 60% (all links hunt-specific) | Create per-mode variants |
| **OutOfStateScreen** | 40% | 60% (all content hunt-specific) | Create per-mode variants |
| **HistoricalHarvestImport** | 10% | 90% (entirely hunt-specific) | Replace per mode |

---

## 2. Tier 1: Zero-Change Reusables (Use As-Is)

These components work identically for every activity mode today. No code changes needed.

| Component | What It Does | Used By |
|-----------|-------------|---------|
| `AnnotationLayer.tsx` | Renders waypoints, routes, areas, tracks on Mapbox | Scout, Camp |
| `TrackMeBar.tsx` | GPS recording with distance, speed, elevation | Scout/Spots |
| `MeasureTool.tsx` | Tap-to-measure distance and bearing | Scout/Spots |
| `CompassOverlay.tsx` | Animated compass rose with heading | Scout/Spots |
| `useLocation.ts` | GPS location hook | All screens |
| `PLAN_COLORS` palette | 10-color plan assignment | Scout, Camp |
| `MEMBER_COLORS` palette | 10-color member assignment | Camp |

**Action:** Move these into `src/components/shared/` (or keep in `scout/` with a note that they're cross-mode).

---

## 3. Tier 2: Light Parameterization (Add Mode Config)

These need an `activityMode` prop or config lookup to swap labels, icons, and options.

### 3a. Activity Mode Configuration System (NEW FILE)

Create `src/config/activityModeConfig.ts`:

```typescript
import { ActivityMode } from '../context/ActivityModeContext';

interface WaypointIconOption {
  icon: string;
  label: string;
  emoji: string;
}

interface FilterCategory {
  key: string;
  label: string;
  options: { key: string; label: string }[];
}

interface ActivityModeConfig {
  // Labels
  planLabel: string;           // "Hunt Plan" | "Fishing Spot" | "Hiking Route"
  planLabelPlural: string;     // "Hunt Plans" | "Fishing Spots" | "Hiking Routes"
  campLabel: string;           // "Deer Camp" | "Fish Camp" | "Trail Crew"
  parkingLabel: string;        // "Parking" | "Launch Point" | "Trailhead"
  activityVerb: string;        // "hunt" | "fish" | "hike" | "crab" | "boat"
  emptyPlanText: string;       // Empty state guidance

  // Waypoint icons per mode
  waypointIcons: WaypointIconOption[];

  // Filter categories per mode
  filters: FilterCategory[];

  // Map data source keys
  dataSourceKey: string;       // Which bundled data to load

  // AI chat
  welcomeMessage: string;
  suggestionChips: string[];
  knowledgeBaseKey: string;    // Which KB to query

  // Sighting/observation options
  speciesOptions: string[];
  activityOptions: string[];

  // Tab icons
  tabIcons: Record<string, string>;
}

export const MODE_CONFIGS: Record<ActivityMode, ActivityModeConfig> = {
  hunt: {
    planLabel: 'Hunt Plan',
    planLabelPlural: 'Hunt Plans',
    campLabel: 'Deer Camp',
    parkingLabel: 'Parking / Start Point',
    activityVerb: 'hunt',
    emptyPlanText: 'Create a hunt plan to start marking stands, routes, and areas on the map.',
    waypointIcons: [
      { icon: 'stand', label: 'Tree Stand', emoji: '🌳' },
      { icon: 'blind', label: 'Ground Blind', emoji: '🏕️' },
      { icon: 'camera', label: 'Trail Cam', emoji: '📷' },
      { icon: 'feeder', label: 'Feeder', emoji: '🌾' },
      { icon: 'food-plot', label: 'Food Plot', emoji: '🌿' },
      { icon: 'water', label: 'Water', emoji: '💧' },
      { icon: 'crossing', label: 'Crossing', emoji: '🦌' },
      { icon: 'sign', label: 'Sign/Rub', emoji: '🪵' },
      { icon: 'parking', label: 'Parking', emoji: '🅿️' },
      { icon: 'custom', label: 'Custom Pin', emoji: '📍' },
    ],
    filters: [
      { key: 'landType', label: 'Land Type', options: [
        { key: 'WMA', label: 'WMA' }, { key: 'CWMA', label: 'CWMA' },
        { key: 'CFL', label: 'CFL' }, { key: 'SF', label: 'SF' },
        { key: 'SP', label: 'SP' }, { key: 'NRMA', label: 'NRMA' },
        { key: 'NEA', label: 'NEA' }, { key: 'FMA', label: 'FMA' },
        { key: 'Range', label: 'Range' },
      ]},
      { key: 'species', label: 'Species', options: [
        { key: 'deer', label: 'Deer' }, { key: 'turkey', label: 'Turkey' },
        { key: 'waterfowl', label: 'Waterfowl' }, { key: 'bear', label: 'Bear' },
        { key: 'smallGame', label: 'Small Game' },
      ]},
      { key: 'weapon', label: 'Weapon/Method', options: [
        { key: 'archery', label: 'Archery' }, { key: 'firearms', label: 'Firearms' },
        { key: 'muzzleloader', label: 'Muzzleloader' },
      ]},
      { key: 'access', label: 'Access', options: [
        { key: 'sundayHunting', label: 'Sunday Hunting' },
        { key: 'noReservation', label: 'No Reservation' },
        { key: 'mobilityAccess', label: 'ADA Accessible' },
      ]},
    ],
    dataSourceKey: 'hunt',
    welcomeMessage: 'I know about 192 public hunting lands, 14 shooting ranges, seasons, bag limits, and regulations across Maryland.',
    suggestionChips: [
      'When is deer season?', 'Turkey season dates', 'Bear hunting rules',
      'Sunday hunting rules', 'Where can I hunt near me?',
      'What licenses do I need?', 'Plan my next hunt',
    ],
    knowledgeBaseKey: 'hunting',
    speciesOptions: ['Whitetail Buck', 'Whitetail Doe', 'Turkey Tom', 'Turkey Hen', 'Bear', 'Coyote', 'Fox'],
    activityOptions: ['Feeding', 'Bedded', 'Moving', 'Rutting', 'With Fawns'],
    tabIcons: { MAP: '🗺️', SCOUT: '🐾', AI: '🤖', CAMP: '🏕️', RESOURCES: '📚' },
  },

  fish: {
    planLabel: 'Fishing Spot',
    planLabelPlural: 'Fishing Spots',
    campLabel: 'Fish Camp',
    parkingLabel: 'Launch Point / Access',
    activityVerb: 'fish',
    emptyPlanText: 'Save a fishing spot to start marking your favorite holes, ramps, and structures.',
    waypointIcons: [
      { icon: 'dock', label: 'Dock / Pier', emoji: '🛟' },
      { icon: 'ramp', label: 'Boat Ramp', emoji: '🚤' },
      { icon: 'shore', label: 'Shore Spot', emoji: '🏖️' },
      { icon: 'structure', label: 'Structure', emoji: '🪨' },
      { icon: 'deep', label: 'Deep Hole', emoji: '🌊' },
      { icon: 'current', label: 'Current Break', emoji: '💨' },
      { icon: 'bait', label: 'Bait Shop', emoji: '🪱' },
      { icon: 'parking', label: 'Parking', emoji: '🅿️' },
      { icon: 'custom', label: 'Custom Pin', emoji: '📍' },
    ],
    filters: [
      { key: 'locationType', label: 'Location Type', options: [
        { key: 'access_site', label: 'Access Site' },
        { key: 'stocking_location', label: 'Stocking Site' },
        { key: 'fishing_ground', label: 'Fishing Ground' },
        { key: 'hatchery', label: 'Hatchery' },
      ]},
      { key: 'waterbody', label: 'Waterbody', options: [
        { key: 'chesapeake', label: 'Chesapeake Bay' },
        { key: 'river', label: 'River' },
        { key: 'lake', label: 'Lake / Pond' },
        { key: 'stream', label: 'Stream' },
        { key: 'ocean', label: 'Ocean / Coastal' },
      ]},
      { key: 'species', label: 'Species', options: [
        { key: 'trout', label: 'Trout' }, { key: 'bass', label: 'Bass' },
        { key: 'striped', label: 'Striped Bass' }, { key: 'catfish', label: 'Catfish' },
        { key: 'panfish', label: 'Panfish' }, { key: 'saltwater', label: 'Saltwater' },
      ]},
      { key: 'amenities', label: 'Amenities', options: [
        { key: 'ramp', label: 'Boat Ramp' },
        { key: 'shoreFishing', label: 'Shore Fishing' },
        { key: 'flyFishing', label: 'Fly Fishing' },
        { key: 'ada', label: 'ADA Accessible' },
        { key: 'restrooms', label: 'Restrooms' },
      ]},
      { key: 'stocking', label: 'Stocking', options: [
        { key: 'recentlyStocked', label: 'Recently Stocked (30 days)' },
      ]},
    ],
    dataSourceKey: 'fish',
    welcomeMessage: 'I know about 307 fishing access sites, 68 stocking locations, 61 fishing grounds, tides, regulations, and licenses across Maryland.',
    suggestionChips: [
      'Striped bass season?', 'Where was trout stocked recently?',
      'Tide predictions near me', 'Best bass fishing spots',
      'Do I need a license?', 'Creel limits for trout',
      'Free fishing days 2026',
    ],
    knowledgeBaseKey: 'fishing',
    speciesOptions: ['Largemouth Bass', 'Striped Bass', 'Rainbow Trout', 'Brown Trout', 'Channel Catfish', 'Bluegill', 'Crappie', 'Perch', 'Flounder', 'Bluefish'],
    activityOptions: ['Surface Feeding', 'Schooling', 'Bedding', 'Deep', 'Near Structure'],
    tabIcons: { MAP: '🗺️', SPOTS: '🎣', AI: '🤖', CAMP: '⛵', RESOURCES: '📚' },
  },

  hike: {
    planLabel: 'Hiking Route',
    planLabelPlural: 'Hiking Routes',
    campLabel: 'Trail Crew',
    parkingLabel: 'Trailhead',
    activityVerb: 'hike',
    emptyPlanText: 'Create a route to plan your next hike — mark trailheads, viewpoints, and water sources.',
    waypointIcons: [
      { icon: 'trailhead', label: 'Trailhead', emoji: '🥾' },
      { icon: 'viewpoint', label: 'Viewpoint', emoji: '🏔️' },
      { icon: 'water', label: 'Water Source', emoji: '💧' },
      { icon: 'campsite', label: 'Campsite', emoji: '⛺' },
      { icon: 'shelter', label: 'Shelter', emoji: '🏠' },
      { icon: 'hazard', label: 'Hazard', emoji: '⚠️' },
      { icon: 'wildlife', label: 'Wildlife', emoji: '🦅' },
      { icon: 'parking', label: 'Parking', emoji: '🅿️' },
      { icon: 'custom', label: 'Custom Pin', emoji: '📍' },
    ],
    filters: [
      { key: 'trailType', label: 'Trail Type', options: [
        { key: 'loop', label: 'Loop' }, { key: 'out-back', label: 'Out & Back' },
        { key: 'point-point', label: 'Point to Point' }, { key: 'network', label: 'Trail Network' },
      ]},
      { key: 'difficulty', label: 'Difficulty', options: [
        { key: 'easy', label: 'Easy' }, { key: 'moderate', label: 'Moderate' },
        { key: 'hard', label: 'Hard' }, { key: 'expert', label: 'Expert' },
      ]},
      { key: 'features', label: 'Features', options: [
        { key: 'waterfall', label: 'Waterfall' }, { key: 'scenic', label: 'Scenic View' },
        { key: 'lake', label: 'Lake / Pond' }, { key: 'wildlife', label: 'Wildlife' },
        { key: 'historical', label: 'Historical' },
      ]},
      { key: 'access', label: 'Access', options: [
        { key: 'ada', label: 'ADA Accessible' },
        { key: 'dogFriendly', label: 'Dog Friendly' },
        { key: 'parking', label: 'Free Parking' },
      ]},
    ],
    dataSourceKey: 'hike',
    welcomeMessage: 'I know about Maryland state parks, trails, and hiking resources.',
    suggestionChips: [
      'Best hikes near Baltimore', 'Waterfalls in Maryland',
      'Easy trails for families', 'Appalachian Trail in MD',
      'Dog-friendly trails', 'State park hours',
    ],
    knowledgeBaseKey: 'hiking',
    speciesOptions: ['Bald Eagle', 'Black Bear', 'White-tailed Deer', 'Wild Turkey', 'Great Blue Heron', 'Red Fox'],
    activityOptions: ['Perched', 'Nesting', 'Feeding', 'In Flight', 'On Trail'],
    tabIcons: { MAP: '🗺️', ROUTES: '🥾', AI: '🤖', CREW: '⛰️', RESOURCES: '📚' },
  },

  crab: {
    planLabel: 'Crabbing Spot',
    planLabelPlural: 'Crabbing Spots',
    campLabel: 'Crab Crew',
    parkingLabel: 'Access Point',
    activityVerb: 'crab',
    emptyPlanText: 'Save a crabbing spot to mark your favorite piers, shorelines, and crabbing areas.',
    waypointIcons: [
      { icon: 'pier', label: 'Pier', emoji: '🌉' },
      { icon: 'shore', label: 'Shore Access', emoji: '🏖️' },
      { icon: 'ramp', label: 'Boat Ramp', emoji: '🚤' },
      { icon: 'dock', label: 'Dock', emoji: '⚓' },
      { icon: 'channel', label: 'Channel Edge', emoji: '🌊' },
      { icon: 'grass', label: 'Grass Bed', emoji: '🌿' },
      { icon: 'bait', label: 'Bait Shop', emoji: '🪱' },
      { icon: 'parking', label: 'Parking', emoji: '🅿️' },
      { icon: 'custom', label: 'Custom Pin', emoji: '📍' },
    ],
    filters: [
      { key: 'locationType', label: 'Location Type', options: [
        { key: 'pier', label: 'Public Pier' }, { key: 'shore', label: 'Shore Access' },
        { key: 'ramp', label: 'Boat Ramp' }, { key: 'charter', label: 'Charter / Guide' },
      ]},
      { key: 'method', label: 'Method', options: [
        { key: 'trotline', label: 'Trotline' }, { key: 'pot', label: 'Crab Pot' },
        { key: 'handline', label: 'Handline' }, { key: 'net', label: 'Dip Net' },
        { key: 'ring', label: 'Collapsible Trap' },
      ]},
      { key: 'access', label: 'Access', options: [
        { key: 'free', label: 'Free Access' },
        { key: 'ada', label: 'ADA Accessible' },
        { key: 'restrooms', label: 'Restrooms' },
      ]},
    ],
    dataSourceKey: 'crab',
    welcomeMessage: 'I know about Maryland blue crab regulations, access points, and crabbing resources.',
    suggestionChips: [
      'Crab season dates?', 'Bushel limit?', 'Best crabbing spots',
      'Do I need a license?', 'Trotline rules',
      'Crab size limits', 'Female crab rules',
    ],
    knowledgeBaseKey: 'crabbing',
    speciesOptions: ['Blue Crab (Male)', 'Blue Crab (Female)', 'Blue Crab (Sook)', 'Blue Crab (Jimmy)'],
    activityOptions: ['Surface', 'Bottom', 'Moving', 'Molting', 'Near Structure'],
    tabIcons: { MAP: '🗺️', SPOTS: '🦀', AI: '🤖', CREW: '🪣', RESOURCES: '📚' },
  },

  boat: {
    planLabel: 'Boating Route',
    planLabelPlural: 'Boating Routes',
    campLabel: 'Boat Crew',
    parkingLabel: 'Launch Ramp',
    activityVerb: 'boat',
    emptyPlanText: 'Plan a route to mark launch ramps, anchorages, fuel docks, and waterway waypoints.',
    waypointIcons: [
      { icon: 'ramp', label: 'Launch Ramp', emoji: '🚤' },
      { icon: 'marina', label: 'Marina', emoji: '⚓' },
      { icon: 'fuel', label: 'Fuel Dock', emoji: '⛽' },
      { icon: 'anchorage', label: 'Anchorage', emoji: '🏴' },
      { icon: 'hazard', label: 'Hazard / Shoal', emoji: '⚠️' },
      { icon: 'channel', label: 'Channel Marker', emoji: '🔴' },
      { icon: 'dock', label: 'Transient Dock', emoji: '🛟' },
      { icon: 'parking', label: 'Parking', emoji: '🅿️' },
      { icon: 'custom', label: 'Custom Pin', emoji: '📍' },
    ],
    filters: [
      { key: 'locationType', label: 'Location Type', options: [
        { key: 'ramp', label: 'Boat Ramp' }, { key: 'marina', label: 'Marina' },
        { key: 'fuel', label: 'Fuel Dock' }, { key: 'pumpout', label: 'Pumpout Station' },
        { key: 'transient', label: 'Transient Dock' },
      ]},
      { key: 'waterType', label: 'Waterway', options: [
        { key: 'chesapeake', label: 'Chesapeake Bay' }, { key: 'river', label: 'River' },
        { key: 'lake', label: 'Lake / Reservoir' }, { key: 'coastal', label: 'Coastal Bays' },
        { key: 'canal', label: 'Canal' },
      ]},
      { key: 'amenities', label: 'Amenities', options: [
        { key: 'fuel', label: 'Fuel' }, { key: 'pumpout', label: 'Pumpout' },
        { key: 'restrooms', label: 'Restrooms' }, { key: 'ada', label: 'ADA Accessible' },
        { key: 'overnight', label: 'Overnight Docking' },
      ]},
    ],
    dataSourceKey: 'boat',
    welcomeMessage: 'I know about Maryland boat ramps, marinas, waterway regulations, and boating resources.',
    suggestionChips: [
      'Boat ramps near me', 'Boating license requirements',
      'Speed limits on the Bay', 'Marina fuel prices',
      'No-wake zones', 'Weather on the water',
    ],
    knowledgeBaseKey: 'boating',
    speciesOptions: [],
    activityOptions: [],
    tabIcons: { MAP: '🗺️', ROUTES: '⛵', AI: '🤖', CREW: '🚢', RESOURCES: '📚' },
  },
};
```

### 3b. Components That Need Mode Config

| Component | Current | Change Needed |
|-----------|---------|--------------|
| **PlanSidebar** | Hardcoded "Hunt Plans" | Read `config.planLabelPlural` |
| **PlanCreationFlow** | Hardcoded `ICON_OPTIONS` for hunting | Read `config.waypointIcons` |
| **PlanCreationFlow** | "Name Your Hunt Plan" | Read `config.planLabel` |
| **PlanCreationFlow** | "Set Parking / Start Point" | Read `config.parkingLabel` |
| **ScoutScreen** | Hardcoded `SPECIES_MAP`, `WEAPON_MAP` | Read `config.filters` |
| **ChatScreen** | Hardcoded welcome message | Read `config.welcomeMessage` |
| **ChatScreen** | Hardcoded suggestion chips | Read `config.suggestionChips` |
| **ChatScreen** | Hardcoded `chatKnowledge.ts` | Switch KB by `config.knowledgeBaseKey` |
| **AddSightingModal** | Hardcoded hunt species | Read `config.speciesOptions` |
| **DeerCampScreen** | Hardcoded "Deer Camp" | Read `config.campLabel` |

---

## 4. Tier 3: Structural Refactors (Rename + Generalize)

These are file/type renames that make the architecture properly mode-agnostic.

### 4a. Type Renames

| Current | Proposed | Why |
|---------|----------|-----|
| `types/scout.ts` → `HuntPlan` | Keep `HuntPlan` + add `ActivityPlan` alias | Backward compat |
| `types/deercamp.ts` | Rename to `types/camp.ts` | Camp types are 99% generic |
| `DeerCamp` interface | Rename to `Camp` | Only the name is hunt-specific |

### 4b. Context Generalization

| Current | Proposed | Impact |
|---------|----------|--------|
| `ScoutDataContext` | Add mode-aware storage keys | `@scout_${mode}_plans` instead of `@scout_hunt_plans` |
| `DeerCampContext` | Add mode-aware storage keys | `@camp_${mode}` instead of `@deer_camps` |
| Both contexts | Accept `activityMode` from `useActivityMode()` | Auto-scope data by mode |

### 4c. File Organization

```
src/components/
  shared/                    # NEW — mode-agnostic components
    AnnotationLayer.tsx      # MOVE from scout/
    TrackMeBar.tsx           # MOVE from scout/
    MeasureTool.tsx          # MOVE from scout/
    CompassOverlay.tsx       # MOVE from scout/
    MapFilterPanel.tsx       # REFACTOR — config-driven filters
    InfoPanel.tsx            # REFACTOR — config-driven detail panel
  scout/                     # Hunt-mode-specific wrappers (if any)
    PlanSidebar.tsx          # STAYS — uses config for labels
    PlanCreationFlow.tsx     # STAYS — uses config for icons/labels
  camp/                      # RENAME from deer-camp/
    AddObservationModal.tsx  # RENAME from AddSightingModal — config-driven
    CampInsightsPanel.tsx    # STAYS — parameterize labels
    HistoryImportModal.tsx   # RENAME from HistoricalHarvestImport — mode-specific variants
```

---

## 5. Screen Strategy Per Mode

### Option A (RECOMMENDED): Shared screens with mode config
Keep ONE screen component, use config to change behavior.

| Screen | Shared? | Strategy |
|--------|---------|----------|
| **MapScreen** | One for all modes | Load mode-specific data + filters from config. Detect `activeMode` to choose data source. |
| **Scout/Spots Screen** | One for all modes | Already ~60% generic. Inject `config.filters`, `config.waypointIcons`, `config.planLabel`. |
| **Camp Screen** | One for all modes | Camp types are 99% generic. Change "Deer Camp" → `config.campLabel`. Swap observation/import modals. |
| **ChatScreen** | One for all modes | Switch `welcomeMessage`, `suggestionChips`, knowledge base by mode. |
| **ResourcesHubScreen** | One for all modes | Already a container. Swap child screens by mode. |
| **RegulationsScreen** | Per-mode variant | Hunt regs vs Fish regs have fundamentally different data structures. Keep separate. |
| **ResourcesScreen** | Per-mode variant | Links are entirely different per mode. Keep separate. |
| **OutOfStateScreen** | Per-mode variant | Content is entirely different per mode. Keep separate. |

### Option B (Alternative): Wrapper pattern
Create thin per-mode wrappers that pass config to generic screens.

```typescript
// FishSpotsScreen.tsx
import { SpotsScreen } from '../components/shared/SpotsScreen';
import { MODE_CONFIGS } from '../config/activityModeConfig';
export default () => <SpotsScreen config={MODE_CONFIGS.fish} />;
```

**Decision:** Start with Option A for Phase 4. If screens diverge significantly, split to Option B.

---

## 6. What Each Future Module Gets "For Free"

### Crabbing Module (Phase 5) — Gets Free:
- Full map with Mapbox (just supply crab spot GIS data)
- Spot planning (PlanCreationFlow with crab waypoint icons)
- GPS tracking (TrackMeBar for tracking crabbing trips)
- Measure tool (measure distance to channel edges)
- Crab Crew collaborative maps (DeerCamp → CrabCrew with config swap)
- Photo geotagging (catch photos at GPS location)
- Activity feed (who caught what, where)
- AI chat (just supply crabbing knowledge base)
- Resources hub (just supply crabbing links)
- Offline-first (entire architecture reusable)

**Crabbing-specific work needed:**
- GIS data pipeline for crab access points, commercial areas
- Crabbing regulations data
- Crabbing knowledge base
- Pot registration/tracking (unique feature)
- Blue crab identification guide (male vs female, legal size)

### Boating Module (Phase 5) — Gets Free:
- Full map with boat ramps, marinas, fuel docks
- Route planning (PlanCreationFlow with boating waypoints)
- GPS tracking (track actual boating routes)
- Measure tool (distance between waypoints)
- Boat Crew collaborative maps
- NOAA tidal service (already built for fishing)
- Weather service (already integrated)
- AI chat with boating knowledge
- Resources hub with boating links

**Boating-specific work needed:**
- GIS data: boat ramps, marinas, fuel docks, pumpout stations
- Waterway regulations (speed limits, no-wake zones)
- Boating license info
- Chart overlay (nautical chart layer)
- AIS vessel tracking (future enhancement)

### Hiking Module (Phase 5) — Gets Free:
- Full map with 3D terrain (already built)
- Route planning (PlanCreationFlow with hiking waypoints)
- GPS tracking (elevation gain/loss already in TrackMeBar)
- Measure tool (trail distances)
- Trail Crew collaborative maps
- Weather service
- AI chat with hiking knowledge
- Resources hub

**Hiking-specific work needed:**
- GIS data: MD state park trails, trailheads, shelters
- Trail difficulty ratings
- Elevation profiles (ElevationProfile component exists)
- Trail condition reports
- Appalachian Trail segment data

---

## 7. Refactoring Priority & Timeline

### Sprint F-0: Shared Infrastructure (BEFORE Sprint F-A)
**Duration:** 1-2 days
**Purpose:** Set up shared architecture so fishing builds on it correctly

Tasks:
1. Create `src/config/activityModeConfig.ts` with hunt + fish configs
2. Move AnnotationLayer, TrackMeBar, MeasureTool, CompassOverlay to `shared/`
3. Update ScoutDataContext storage keys to be mode-aware
4. Update DeerCampContext storage keys to be mode-aware
5. Add `useActivityMode()` to ChatScreen — switch welcome + suggestions
6. Rename `types/deercamp.ts` → `types/camp.ts` (keep both exports for backward compat)
7. Update PlanSidebar + PlanCreationFlow to read from mode config

### Sprint F-A–E: Fishing Module (as planned in FISHING_BUILD_PLAN.md)
Now builds on shared infrastructure instead of duplicating code.

### Phase 5: Crabbing/Boating/Hiking
Each module now only needs:
1. GIS data pipeline (mode-specific)
2. Regulations data (mode-specific)
3. Knowledge base (mode-specific)
4. Links/resources (mode-specific)
5. Mode-specific unique features (pot registration, nautical charts, trail conditions)
6. Config entry in `activityModeConfig.ts`

**Estimated savings per future module: 60-70% less code than building from scratch.**

---

## 8. Files That Should NEVER Be Duplicated

These must remain as single shared implementations:

| File | Reason |
|------|--------|
| `AnnotationLayer.tsx` | Renders any annotation type — already mode-agnostic |
| `TrackMeBar.tsx` | GPS recording is identical for all modes |
| `MeasureTool.tsx` | Distance/bearing calculation is universal |
| `CompassOverlay.tsx` | Compass is universal |
| `useLocation.ts` | GPS hook is universal |
| `weatherService.ts` | Same NOAA API for all modes |
| `locationService.ts` | GPS is universal |
| `AppNavigator.tsx` | Mode-aware tab switching already built |
| `ActivityModeContext.tsx` | Central mode management |
| `theme/colors.ts` | Single color palette for all modes |

---

## 9. Checklist for Future Module Development

When building any new activity module, follow this checklist:

- [ ] Add config entry to `activityModeConfig.ts`
- [ ] Create GIS data pipeline script (`scripts/generate_maryland_{mode}_data.py`)
- [ ] Generate bundled data file (`src/data/maryland{Mode}Data.ts`)
- [ ] Create regulations data (`src/data/maryland{Mode}Regs.ts`)
- [ ] Create AI knowledge base (`src/data/{mode}ChatKnowledge.ts`)
- [ ] Create resources screen (`src/screens/{Mode}ResourcesScreen.tsx`)
- [ ] Create out-of-state screen (`src/screens/{Mode}OutOfStateScreen.tsx`)
- [ ] Create regulations screen (`src/screens/{Mode}RegulationsScreen.tsx`)
- [ ] Update AppNavigator with mode's 5-tab config
- [ ] Update ResourcesHubScreen to swap children by mode
- [ ] Verify Scout/Spots reads correct config for waypoint icons and filters
- [ ] Verify Camp reads correct config for labels and observation options
- [ ] Verify AI Chat switches to correct knowledge base
- [ ] Create mode-specific filter logic (if data structure differs)
- [ ] Run `npx tsc --noEmit` — 0 errors
- [ ] Offline testing — all core features work without network
