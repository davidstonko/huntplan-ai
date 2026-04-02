# Data Connections Usage Guide

## Quick Start

### 1. Import Historical Harvests

**From Camp List View:**
1. Long-press on a camp card to see action buttons
2. Tap the "📜 History" button
3. Fill out the harvest form:
   - Select species (Deer, Turkey, etc.)
   - Choose year (2015-2026)
   - Pick season (Archery, Firearms, etc.)
   - Specify location within camp
   - Add optional antler points, weight, notes
4. Tap "Add Harvest" to add to batch
5. Repeat for multiple harvests
6. Tap "Save All" to persist to camp

**Data Location:**
```typescript
AsyncStorage.getItem(`@camp_harvests_{campId}`)
// Returns: HistoricalHarvest[]
```

---

### 2. Log Wildlife Sightings

**From Camp Map View:**
1. Open a camp in map view
2. Tap the "📝 Log" button in the toolbar
3. Fill out the sighting form:
   - Select species (Whitetail Buck, Doe, Turkey, etc.)
   - Use +/- buttons to set count (1-20)
   - Pick activity (Feeding, Bedded, Moving, etc.)
   - Choose direction of travel (N, NE, E, etc.)
   - Enter distance in yards (0-500)
   - Optionally name the location
   - Add notes about behavior/conditions
4. Current GPS location auto-fills
5. Tap "Log Sighting" to save

**Data Location:**
```typescript
AsyncStorage.getItem(`@camp_sightings_{campId}`)
// Returns: CampSighting[]
```

---

### 3. Aggregate All Camp Data for AI

**In Your Custom Component:**

```typescript
import { getAllCampDataPoints } from '../services/campDataConnector';

export async function getCampInsights(campId: string, camp: DeerCamp) {
  // Get all data points (annotations, photos, harvests, sightings)
  const allData = await getAllCampDataPoints(campId, camp);

  // Filter to harvest data only
  const harvests = allData.filter(p => p.type === 'harvest' || p.type === 'historical_harvest');

  // Filter to sightings
  const sightings = allData.filter(p => p.type === 'sighting');

  // Get stats
  const stats = await getCampDataStatistics(campId, camp);
  console.log(`Total data points: ${stats.totalDataPoints}`);
  console.log(`By type: ${JSON.stringify(stats.byType)}`);
  console.log(`By species: ${JSON.stringify(stats.bySpecies)}`);

  return { allData, harvests, sightings, stats };
}
```

---

### 4. Time-Range Analysis

**Query Data for Specific Date Range:**

```typescript
import { getCampDataPointsInRange, getCampDataPointsByDate } from '../services/campDataConnector';

// Get data from September 2024
const september = await getCampDataPointsInRange(
  campId,
  camp,
  new Date('2024-09-01'),
  new Date('2024-09-30')
);

// Get data grouped by date
const byDate = await getCampDataPointsByDate(campId, camp);
Object.entries(byDate).forEach(([date, points]) => {
  console.log(`${date}: ${points.length} data points`);
});
```

---

### 5. GPS Proximity Matching

**Find Scout Plans Near Camp:**

```typescript
import { findRelatedScoutData } from '../services/campDataConnector';
import { useScoutData } from '../context/ScoutDataContext';

export function MatchScoutDataToCamp(camp: DeerCamp) {
  const { plans, tracks } = useScoutData();

  // Find all scout data within 5km of camp center
  const { plans: nearbyPlans, tracks: nearbyTracks } = findRelatedScoutData(
    camp,
    plans,
    tracks
  );

  return {
    nearbyPlans,
    nearbyTracks,
    planCount: nearbyPlans.length,
    trackCount: nearbyTracks.length,
  };
}
```

---

## Data Structure Reference

### HistoricalHarvest
```typescript
{
  id: string;              // Generated ID
  species: string;         // "Deer", "Turkey", etc.
  year: number;            // 2015-2026
  season: string;          // "Archery", "Firearms", etc.
  weapon: string;          // "Archery", "Firearms", "Shotgun"
  location: string;        // Location within camp (required)
  antlerPoints?: number;   // 0-10+ (deer only)
  weight?: number;         // Pounds (optional)
  timeOfDay: string;       // "Morning", "Midday", "Evening"
  notes?: string;          // User notes
  addedAt: string;         // ISO timestamp
}
```

### CampSighting
```typescript
{
  id: string;              // Generated ID
  species: string;         // "Whitetail Buck", "Turkey", etc.
  count: number;           // 1-20
  activity: string;        // "Feeding", "Bedded", "Moving", etc.
  directionOfTravel: string; // "N", "NE", "E", "SE", "S", "SW", "W", "NW", "Stationary"
  distanceYards: number;   // 0-500
  timeLogged: string;      // Time formatted (e.g., "07:30 AM")
  location?: string;       // Named location (optional)
  gpsLat?: number;         // Auto-filled from device GPS
  gpsLng?: number;         // Auto-filled from device GPS
  notes?: string;          // Behavior notes
  addedAt: string;         // ISO timestamp
}
```

### CampDataPoint (Unified)
```typescript
{
  type: 'waypoint' | 'route' | 'area' | 'track' | 'photo' |
        'harvest' | 'historical_harvest' | 'sighting' | 'weather_log';
  timestamp: string;       // ISO timestamp
  location?: {             // GPS coordinates (optional)
    latitude: number;
    longitude: number;
  };
  memberName?: string;     // Who created it
  metadata: {              // Type-specific data
    // Varies by type — see campDataConnector.ts
    // Can include species, count, notes, image URI, etc.
  };
}
```

---

## Phase 3 API Integration Example

Once backend is ready, upload aggregated data to AI analysis:

```typescript
import { getAllCampDataPoints } from '../services/campDataConnector';

export async function requestAIAnalysis(campId: string, camp: DeerCamp) {
  try {
    // Aggregate all local data
    const dataPoints = await getAllCampDataPoints(campId, camp);

    // Send to backend
    const response = await fetch(
      `${API_BASE_URL}/api/v1/camp/${campId}/analyze`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          campId,
          campName: camp.name,
          dataPoints,
          memberCount: camp.members.length,
        }),
      }
    );

    const insights = await response.json();
    return insights; // { summary, recommendations, patterns, predictedBestDays, strategySuggestion }
  } catch (error) {
    console.warn('AI analysis failed:', error);
    throw error;
  }
}
```

---

## Testing Data Flows

### Quick Test: Add 5 Historical Harvests
1. Create a new camp (e.g., "Test Camp")
2. Tap History button
3. Add 5 harvests with varying species and years
4. Verify in AsyncStorage:
   ```
   AsyncStorage.getItem('@camp_harvests_{campId}')
   // Should return array of 5 harvests
   ```

### Quick Test: Log 10 Sightings
1. Enter camp in map view
2. Tap Log button 10 times with varying species/counts
3. Verify in AsyncStorage:
   ```
   AsyncStorage.getItem('@camp_sightings_{campId}')
   // Should return array of 10 sightings with GPS coordinates
   ```

### Quick Test: Aggregate Data
```typescript
import { getAllCampDataPoints, getCampDataStatistics } from '../services/campDataConnector';

// After adding harvests & sightings above:
const data = await getAllCampDataPoints(campId, camp);
console.log(`Total points: ${data.length}`); // Should be 15+
console.log('By type:', data.reduce((acc, p) => {
  acc[p.type] = (acc[p.type] || 0) + 1;
  return acc;
}, {}));

const stats = await getCampDataStatistics(campId, camp);
console.log('Stats:', stats);
```

---

## Troubleshooting

### Data Not Persisting
1. Check AsyncStorage has write permissions
2. Verify correct storage key: `@camp_harvests_{campId}` or `@camp_sightings_{campId}`
3. Log the data before saving:
   ```typescript
   console.log('Saving harvests:', harvests);
   ```

### GPS Not Auto-Tagging
1. Ensure location permission is granted
2. Check `useLocation()` hook is returning `location` object
3. Verify device has GPS signal (try entering map view first)

### Data Not Appearing in Aggregation
1. Verify AsyncStorage keys match: `campId` must be consistent
2. Check timestamp format (should be valid ISO string)
3. Log `getAllCampDataPoints` result to inspect structure

---

## Performance Notes

- **For <1000 data points:** No optimization needed
- **For >1000 data points:** Consider pagination in Phase 3
- **AsyncStorage limits:** ~10MB per app (plenty for harvest/sighting data)
- **Array sorting:** O(n log n) — negligible for typical camp datasets
- **GPS distance calc:** O(n) for m harvests × n scout points

---

## Future Enhancements

**Phase 3 Backend Integration:**
- Sync to PostgreSQL + pgvector
- Real-time collaboration between camp members
- Vector embeddings for semantic similarity
- ML model training on aggregated harvest patterns

**Reporting & Export:**
- PDF harvest history by year/species
- KML/GPX with harvest locations
- CSV export for external analysis
- Heat maps of successful hunting spots

**Predictive Analytics:**
- Forecast best days to hunt based on historical patterns
- Seasonal trend analysis
- Weather correlation engine
- Species movement prediction

---

## Related Files

- **Component:** `/src/components/deer-camp/HistoricalHarvestImport.tsx`
- **Component:** `/src/components/deer-camp/AddSightingModal.tsx`
- **Service:** `/src/services/campDataConnector.ts`
- **Screen Integration:** `/src/screens/DeerCampScreen.tsx`
- **Type Definitions:** `/src/types/deercamp.ts`, `/src/types/scout.ts`

---

## Support

For integration questions or Phase 3 API design, refer to:
- `DATA_CONNECTIONS_SUMMARY.md` — Technical overview
- `campDataConnector.ts` JSDoc — Function signatures
- `DeerCampScreen.tsx` — Integration example
