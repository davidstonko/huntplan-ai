# Integration Points for "AI Learns Your Deer Camp"

## Component Hierarchy

```
DeerCampScreen
├── HistoricalHarvestImport (modal)
│   └── Shows when user taps "📜 History" button on camp card
│   └── Saves to: @camp_harvests_{campId}
│
├── AddSightingModal (modal)
│   └── Shows when user taps "📝 Log" button in camp toolbar
│   └── Saves to: @camp_sightings_{campId}
│
└── campDataConnector (service)
    └── Aggregates all camp data (via getAllCampDataPoints)
    └── Cross-references scout plans & tracks
    └── Provides statistics & time-range queries
```

## UI Entry Points

### Camp List View (List Mode)
```
Camp Card
├── Name, members, pins, tracks, photos
├── Member color dots
├── Last activity
└── Actions Bar
    ├── 📜 History Button
    │   └── Opens HistoricalHarvestImport modal
    └── Export Button
        └── GPX/KML export
```

### Camp Map View (Map Mode)
```
Camp Header
├── Back button
├── Camp name
└── + Invite button

Camp Toolbar (7 buttons)
├── 📌 Pin (add waypoint mode toggle)
├── 📷 Photo (add geotagged photo)
├── 📝 Log ← NEW (add sighting)
├── 👥 Team (show members panel)
├── 🧠 AI (show insights panel)
├── 📨 Feed (show activity feed)
└── ⌖ Crosshair (center on location)

Member Bar (compact)
└── Member chips with color dots

Bottom Panel (toggled)
├── Activity Feed
├── Insights Panel
├── Members Panel
└── Map Canvas
```

## Data Flow Diagrams

### Import Historical Harvests
```
User Action
    ↓
Camp Card → "📜 History" Button
    ↓
HistoricalHarvestImport Modal Opens
    ├── User fills form (species, year, season, etc.)
    ├── Taps "Add Harvest"
    └── Repeats for multiple harvests
    ↓
User Taps "Save All"
    ↓
DeerCampScreen.handleSaveHistoricalHarvests()
    ├── Reads existing @camp_harvests_{campId}
    ├── Appends new harvests
    └── Writes back to AsyncStorage
    ↓
Modal closes
Status: ✅ Saved to device
```

### Log Wildlife Sighting
```
User Action
    ↓
Camp Map View → "📝 Log" Button
    ↓
AddSightingModal Opens
    ├── User selects species, count, activity, direction, distance
    ├── Current GPS coordinates auto-captured
    └── User taps "Log Sighting"
    ↓
AddSightingModal.logSighting()
    ├── Creates CampSighting object
    ├── Auto-fills timestamp and GPS
    └── Saves to @camp_sightings_{campId}
    ↓
Modal closes
Status: ✅ Sighting logged at current location
```

### Aggregate Data for AI
```
Phase 3 Backend Request
    ↓
getAllCampDataPoints(campId, camp)
    ├── Load @camp_harvests_{campId}
    ├── Load @camp_sightings_{campId}
    ├── Get camp.annotations (waypoints, routes, areas, tracks)
    ├── Get camp.photos
    └── Combine into CampDataPoint[]
    ↓
getCampDataStatistics(campId, camp)
    ├── Count by type (waypoint, harvest, sighting, etc.)
    ├── Count by species
    ├── Find time range (oldest/newest)
    └── Return summary stats
    ↓
Send to: POST /api/v1/camp/{campId}/analyze
    ↓
Backend receives: { campId, campName, dataPoints, memberCount }
Status: Ready for ML training
```

## Type Definitions & Exports

### From HistoricalHarvestImport.tsx
```typescript
export interface HistoricalHarvest {
  id: string;
  species: string;           // "Deer", "Turkey", etc.
  year: number;              // 2015-2026
  season: string;            // "Archery", "Firearms", etc.
  weapon: string;            // "Archery", "Firearms", "Shotgun"
  location: string;          // Within camp (required)
  antlerPoints?: number;     // Optional
  weight?: number;           // Optional
  timeOfDay: string;         // "Morning", "Midday", "Evening"
  notes?: string;            // Optional
  addedAt: string;           // ISO timestamp
}

export const HistoricalHarvestImport: React.FC<Props>
```

### From AddSightingModal.tsx
```typescript
export interface CampSighting {
  id: string;
  species: string;           // "Whitetail Buck", "Turkey", etc.
  count: number;             // 1-20
  activity: string;          // "Feeding", "Bedded", "Moving", etc.
  directionOfTravel: string; // Cardinal directions + Stationary
  distanceYards: number;     // 0-500
  timeLogged: string;        // Time formatted
  location?: string;         // Named location (optional)
  gpsLat?: number;           // Auto-filled
  gpsLng?: number;           // Auto-filled
  notes?: string;            // Optional
  addedAt: string;           // ISO timestamp
}

export const AddSightingModal: React.FC<Props>
```

### From campDataConnector.ts
```typescript
export interface CampDataPoint {
  type: CampDataPointType;
  timestamp: string;
  location?: { latitude: number; longitude: number };
  memberName?: string;
  metadata: Record<string, any>;
}

export type CampDataPointType =
  | 'waypoint'
  | 'route'
  | 'area'
  | 'track'
  | 'photo'
  | 'harvest'
  | 'historical_harvest'
  | 'sighting'
  | 'weather_log';

// Functions
export function calculateDistance(...): number
export function findRelatedHarvests(...): HarvestEntry[]
export function findRelatedScoutData(...): { plans, tracks }
export async function getAllCampDataPoints(...): CampDataPoint[]
export async function getCampDataStatistics(...): Record<string, any>
export async function getCampDataPointsInRange(...): CampDataPoint[]
export async function getCampDataPointsByDate(...): Record<string, CampDataPoint[]>
```

## AsyncStorage Schema

### Harvest History
**Key:** `@camp_harvests_{campId}`
**Type:** `HistoricalHarvest[]`
**Example:**
```json
[
  {
    "id": "abc123",
    "species": "Deer",
    "year": 2024,
    "season": "Firearms",
    "weapon": "Firearms",
    "location": "North Ridge",
    "antlerPoints": 8,
    "weight": 175,
    "timeOfDay": "Morning",
    "notes": "Clear skies, 3 mph wind from west",
    "addedAt": "2025-04-02T16:35:00Z"
  }
]
```

### Sightings Log
**Key:** `@camp_sightings_{campId}`
**Type:** `CampSighting[]`
**Example:**
```json
[
  {
    "id": "xyz789",
    "species": "Whitetail Buck",
    "count": 2,
    "activity": "Feeding",
    "directionOfTravel": "NE",
    "distanceYards": 150,
    "timeLogged": "07:30 AM",
    "location": "East Treeline",
    "gpsLat": 39.0465,
    "gpsLng": -76.6398,
    "notes": "Bucks sparring, bachelor group",
    "addedAt": "2025-04-02T12:30:00Z"
  }
]
```

## Handler Functions in DeerCampScreen

### handleSaveHistoricalHarvests
```typescript
async function handleSaveHistoricalHarvests(
  harvests: HistoricalHarvest[]
): Promise<void>

Purpose: Persist imported harvests to AsyncStorage
Called by: HistoricalHarvestImport component's onSave prop
Storage key: `@camp_harvests_{selectedCampId}`
Behavior: Appends new harvests to existing list
```

### handlePhotoUpload (existing)
```typescript
Purpose: Create geotagged photo pin
Saves to: camp.photos array (via addPhoto context)
GPS: Auto-filled from device location
```

## Phase 3 Backend Integration Points

### Required API Endpoints

**POST /api/v1/camp/{campId}/analyze**
```typescript
Request Body: {
  campId: string;
  campName: string;
  dataPoints: CampDataPoint[];
  memberCount: number;
}

Response: {
  summary: string;
  recommendations: string[];
  patterns: string[];
  predictedBestDays: string[];
  strategySuggestion: string;
}
```

**POST /api/v1/harvest/import**
```typescript
Request Body: {
  campId: string;
  harvests: HistoricalHarvest[];
}

Response: {
  imported: number;
  status: "success" | "partial" | "failed";
}
```

**POST /api/v1/sighting/log**
```typescript
Request Body: {
  campId: string;
  sighting: CampSighting;
}

Response: {
  id: string;
  timestamp: string;
  status: "success";
}
```

## Offline-First Behavior

All operations complete offline:
- Harvests saved to AsyncStorage immediately
- Sightings logged with GPS before network sync
- Data aggregation happens locally
- No network dependency for core features
- Phase 3: Periodic sync to backend

## Error Handling

### HistoricalHarvestImport
- Alert if location not provided
- Alert on save error
- Graceful AsyncStorage write failure
- User can retry manually

### AddSightingModal
- Alert if GPS location unavailable
- Graceful AsyncStorage write
- Time auto-filled as fallback
- User can edit manually

### campDataConnector
- Safe AsyncStorage reads with try/catch
- Handles missing keys (returns empty array)
- Validates date ranges
- Filters out invalid data points

## Testing Checklist

- [ ] Add 3 historical harvests via History modal
- [ ] Verify stored in AsyncStorage
- [ ] Log 5 sightings via Log button
- [ ] Verify GPS coordinates captured
- [ ] Verify timestamps saved
- [ ] Call getAllCampDataPoints and confirm both data types included
- [ ] Filter by date range
- [ ] Group by date
- [ ] Match scout plans to camp location
- [ ] Verify no TypeScript errors
- [ ] Verify component renders without crashes

## Files Modified/Created Summary

| File | Type | Size | Status |
|------|------|------|--------|
| HistoricalHarvestImport.tsx | Component | 17KB | Created ✅ |
| AddSightingModal.tsx | Component | 13KB | Created ✅ |
| campDataConnector.ts | Service | 12KB | Created ✅ |
| DeerCampScreen.tsx | Screen | Updated | Modified ✅ |
| DATA_CONNECTIONS_SUMMARY.md | Doc | 8KB | Created ✅ |
| DATA_CONNECTIONS_USAGE.md | Doc | 10KB | Created ✅ |

## Next Steps (Phase 3)

1. Deploy backend endpoints for data analysis
2. Implement pgvector embeddings for harvest patterns
3. Train ML model on aggregated camp data
4. Build insights panel to display AI recommendations
5. Add real-time sync from mobile to PostgreSQL
6. Create analytics dashboard for camp admin
7. Implement collaborative insights across team members
8. Add push notifications for optimal hunting times
9. Develop predictive model for season forecasting
10. Create shareable insights within camp group

---

**All components ready for Phase 3 backend integration. TypeScript strict mode validation: ✅ PASSING**
