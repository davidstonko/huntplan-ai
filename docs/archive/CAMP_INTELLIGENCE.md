# Camp Intelligence Service — AI Learns Your Deer Camp

## Overview

The Camp Intelligence Service enables "AI Learns Your Deer Camp" — a progressive feature that generates AI-powered hunting insights as camps accumulate data. The service aggregates all hunting data from a camp (annotations, photos, tracks, activity) and generates insights that improve in scope and depth as more data points are collected.

### Key Features

- **Data Aggregation**: Collects all camp data into standardized data points
- **Local Insights**: Immediate analysis without API calls (time patterns, hot spots, species breakdown)
- **AI Analysis**: Optional backend analysis for strategic recommendations (caches results)
- **Tier System**: Progressive unlock of features at 50, 100, 200, and 500+ data points
- **Offline-First**: Local insights always available; AI insights cache for offline access

## Architecture

### Three-Layer System

```
┌─────────────────────────────────────────┐
│   Component (UI Display)                │
│   - DeerCampScreen                      │
│   - CampDetailModal                     │
│   - IntelligenceWidget                  │
└────────────┬────────────────────────────┘
             │
┌─────────────▼────────────────────────────┐
│   Cache Layer (AsyncStorage)             │
│   - Cached local insights                │
│   - Cached AI insights                   │
│   - Avoids redundant computation         │
└────────────┬────────────────────────────┘
             │
┌─────────────▼────────────────────────────┐
│   Service Layer                          │
│   - aggregateCampData()                  │
│   - computeLocalInsights()               │
│   - getCampIntelligence()                │
│   - requestAIAnalysis()                  │
└────────────┬────────────────────────────┘
             │
┌─────────────▼────────────────────────────┐
│   Data Sources                           │
│   - DeerCamp.annotations                 │
│   - DeerCamp.photos                      │
│   - DeerCamp.activityFeed                │
│   - (Future: HarvestEntry)               │
└─────────────────────────────────────────┘
```

## Data Points

Each item in a camp counts as **one data point**:

- **Annotations**: Waypoints, routes, areas, notes, shared tracks
- **Photos**: Geotagged photos with timestamps
- **Activity Feed**: Member actions (implicit engagement markers)

Example: A camp with 5 waypoints + 3 routes + 2 photos + 40 activity items = **50 data points**.

## Tier System

Intelligence unlocks and expands progressively as data accumulates:

| Tier | Points | Features |
|------|--------|----------|
| **Locked** | 0-49 | "Add X more points to unlock" — no insights yet |
| **Basic** | 50-99 | Time-of-day patterns, species breakdown, member contributions |
| **Intermediate** | 100-199 | Seasonal patterns, weapon effectiveness, location clustering |
| **Advanced** | 200-499 | Hot spot analysis, AI recommendations, predicted best days |
| **Expert** | 500+ | Full predictive analytics, multi-season trends, custom plans |

## API Reference

### Core Functions

#### `aggregateCampData(camp: DeerCamp): CampDataPoint[]`
Converts all camp data into standardized data points, sorted by timestamp.

```typescript
const dataPoints = aggregateCampData(camp);
console.log(`Camp has ${dataPoints.length} data points`);
```

#### `computeLocalInsights(dataPoints: CampDataPoint[]): LocalInsights`
Analyzes patterns without API calls. Always available when unlocked.

```typescript
const insights = computeLocalInsights(dataPoints);
console.log(`Best time: ${insights.bestTimeOfDay.evening}% evening hunts`);
console.log(`Avg weight: ${insights.averageHarvestWeight} lbs`);
```

#### `getTier(count: number): IntelligenceTier`
Returns the tier based on data point count.

```typescript
const tier = getTier(85); // Returns 'basic'
```

#### `getTierProgress(count: number): [number, number]`
Returns tuple: `[percentage to next tier (0-100), points needed for next tier]`.

```typescript
const [progress, nextTierAt] = getTierProgress(85);
console.log(`${progress}% progress to tier at ${nextTierAt} points`);
```

#### `getCampIntelligence(camp: DeerCamp): Promise<CampIntelligence>`
**Main entry point**. Returns complete intelligence package.
- Shows local insights immediately
- Loads AI insights async (non-blocking)
- Caches AI results to avoid redundant backend calls

```typescript
const intelligence = await getCampIntelligence(camp);

if (!intelligence.isUnlocked) {
  // Show lock screen with progress
  console.log(`Unlock at ${intelligence.nextTierAt} points`);
  console.log(`Benefits: ${intelligence.nextTierBenefits}`);
} else {
  // Show unlocked insights
  console.log(`Tier: ${intelligence.tier}`);
  console.log(`Local insights ready immediately`);
  if (intelligence.aiInsights) {
    console.log(`AI insights: ${intelligence.aiInsights.summary}`);
  }
}
```

#### `requestAIAnalysis(campId: string, dataPoints: CampDataPoint[], camp?: DeerCamp): Promise<AIInsights>`
Requests AI analysis from backend. Called automatically by `getCampIntelligence()` in the background.

```typescript
try {
  const aiInsights = await requestAIAnalysis(campId, dataPoints, camp);
  console.log(aiInsights.strategySuggestion);
} catch (error) {
  console.warn('AI analysis failed (local insights still available):', error);
}
```

#### `getDataPointCount(camp: DeerCamp): number`
Quick count without full analysis. Useful for checking unlock threshold.

```typescript
const count = getDataPointCount(camp);
if (count >= 45 && count < 50) {
  console.log(`Almost unlocked! ${50 - count} points remaining`);
}
```

#### `clearIntelligenceCache(campId?: string): Promise<void>`
Clears cached intelligence (useful for testing).

```typescript
// Clear specific camp
await clearIntelligenceCache(campId);

// Clear all
await clearIntelligenceCache();
```

## Data Structures

### CampDataPoint
```typescript
interface CampDataPoint {
  type: 'waypoint' | 'route' | 'area' | 'track' | 'photo' | 'harvest' | 'weather_log' | 'sighting';
  timestamp: string; // ISO 8601
  location?: { latitude: number; longitude: number };
  memberName?: string;
  metadata: Record<string, any>; // species, weapon, antler points, weight, etc.
}
```

### LocalInsights
```typescript
interface LocalInsights {
  topHarvestLocations: Array<{ name: string; lat: number; lon: number; count: number }>;
  bestTimeOfDay: { morning: number; midday: number; evening: number }; // percentages
  speciesBreakdown: Record<string, number>;
  weaponSuccess: Record<string, { attempts: number; harvests: number }>;
  seasonalPatterns: Array<{ month: string; activityLevel: number }>;
  memberContributions: Array<{ name: string; dataPoints: number }>;
  hotspotClusters: Array<{ center: { lat: number; lon: number }; radius: number; density: number }>;
  averageHarvestWeight?: number;
  averageAntlerPoints?: number;
  mostProductiveStand?: { name: string; harvests: number };
}
```

### AIInsights
```typescript
interface AIInsights {
  summary: string; // "Based on 127 data points from 4 members over 2 seasons..."
  recommendations: string[]; // Actionable tips specific to this camp
  patterns: string[]; // Observed patterns
  predictedBestDays: string[]; // e.g., "Nov 12-14"
  strategySuggestion: string; // Camp strategy recommendation
  lastAnalyzed: string; // ISO timestamp
}
```

### CampIntelligence (Complete Package)
```typescript
interface CampIntelligence {
  campId: string;
  dataPointCount: number;
  isUnlocked: boolean; // true when >= 50 points
  tier: 'locked' | 'basic' | 'intermediate' | 'advanced' | 'expert';
  localInsights: LocalInsights;
  aiInsights?: AIInsights; // Present if unlocked and cached/loaded
  progressToNextTier: number; // 0-100%
  nextTierAt: number; // points needed for next tier
  nextTierBenefits: string[]; // what unlocks next
}
```

## Usage Examples

### Example 1: Display in Camp List

```typescript
function CampListItem({ camp }: { camp: DeerCamp }) {
  const pointCount = getDataPointCount(camp);
  const isUnlocked = pointCount >= 50;

  return (
    <View>
      <Text>{camp.name}</Text>
      {isUnlocked && (
        <Badge label={`${pointCount} AI points`} color="#FFD700" />
      )}
      {!isUnlocked && (
        <Text>{`${50 - pointCount} points to unlock`}</Text>
      )}
    </View>
  );
}
```

### Example 2: Full Intelligence Panel

```typescript
async function showCampIntelligence(camp: DeerCamp) {
  const intelligence = await getCampIntelligence(camp);

  if (!intelligence.isUnlocked) {
    return (
      <LockedPanel
        progress={intelligence.progressToNextTier}
        nextTierAt={intelligence.nextTierAt}
        benefits={intelligence.nextTierBenefits}
      />
    );
  }

  return (
    <View>
      <Text>{`Tier: ${intelligence.tier}`}</Text>

      <LocalInsightsPanel insights={intelligence.localInsights} />

      {intelligence.aiInsights && (
        <AIInsightsPanel insights={intelligence.aiInsights} />
      )}
    </View>
  );
}
```

### Example 3: Real-Time Updates

```typescript
function CampIntelligenceWidget({ campId }: { campId: string }) {
  const { camps } = useDeerCamp();
  const camp = camps.find(c => c.id === campId);

  if (!camp) return null;

  return (
    <FlatList
      key={camps.length} // Force re-render when camps change
      data={[camp]}
      renderItem={() => (
        <IntelligenceCard camp={camp} onPress={showFullPanel} />
      )}
    />
  );
}
```

### Example 4: Analytics Integration

```typescript
async function trackCampIntelligence(camp: DeerCamp) {
  const intelligence = await getCampIntelligence(camp);

  analytics.logEvent('camp_intelligence_viewed', {
    campId: camp.id,
    tier: intelligence.tier,
    dataPointCount: intelligence.dataPointCount,
    isUnlocked: intelligence.isUnlocked,
    topSpecies: Object.keys(intelligence.localInsights.speciesBreakdown)[0],
  });
}
```

## Caching Strategy

### Local Insights Cache
- **Key**: `@camp_intelligence_{campId}`
- **TTL**: No expiration (computed per request)
- **Purpose**: Avoid redundant computation on fast displays

### AI Insights Cache
- **Key**: `@camp_ai_insights_{campId}`
- **Stored with**: `dataPointCount` to detect when new data invalidates analysis
- **TTL**: Until data point count changes
- **Purpose**: Avoid redundant backend calls

### Offline Support
- Local insights always work offline
- AI insights cached locally for offline access
- Fresh AI analysis requests on next app launch (background)

## Integration Points

### With DeerCampContext
```typescript
const { camps } = useDeerCamp();
const intelligence = await getCampIntelligence(camps[0]);
```

### With DeerCampScreen
Display intelligence card when camp is expanded or selected.

### With Activity Feed
Track when intelligence is viewed/acted upon.

### With Backend (Future)
- POST `/api/v1/deercamp/{campId}/intelligence` — AI analysis
- GET `/api/v1/deercamp/{campId}/intelligence` — cached insights
- DELETE `/api/v1/deercamp/{campId}/intelligence` — invalidate cache

## Performance Notes

### Data Aggregation
- O(n) where n = total annotations + photos + activity items
- Typically < 500ms for camps with 500+ data points

### Local Insights Computation
- Time-of-day binning: O(n)
- Hotspot clustering: O(n²) haversine distance calculations
- Typical: < 1 second for 500 data points
- Runs on main thread; consider background task for UI responsiveness

### AI Analysis Request
- Non-blocking (background)
- ~2-5 second network latency
- Results cached to avoid redundant requests
- Graceful failure: local insights always available

## Future Enhancements

### Phase 3+
- **Real-time updates**: WebSocket notifications when new data is added
- **Multi-season analysis**: Compare current season vs. historical data
- **Predictive models**: ML-based predictions for optimal hunt timing
- **Custom reports**: Export intelligence as PDF/text
- **Shareable insights**: Send camp analysis to other members via share sheet

### Phase 4+
- **Multi-activity support**: Extend to fishing, crabbing, boating
- **Solunar tables**: Integrate solunar predictions with historical success
- **Weather integration**: Combine pressure trends with actual harvests
- **Competing camps**: Compare your camp's stats vs. region/state averages (anonymized)

## Testing

### Mock Data
```typescript
const mockCamp: DeerCamp = {
  id: 'test-camp-1',
  name: 'Test Camp',
  createdAt: new Date().toISOString(),
  createdBy: 'user-1',
  centerPoint: { lat: 39.0, lng: -76.5 },
  defaultZoom: 13,
  members: [{ userId: 'u1', username: 'Hunter', role: 'admin', color: '#E03C31', joinedAt: new Date().toISOString() }],
  annotations: [
    // Add 50+ annotations to trigger unlocked state
  ],
  photos: [],
  activityFeed: [],
};

const intelligence = await getCampIntelligence(mockCamp);
expect(intelligence.isUnlocked).toBe(true);
```

### Unit Tests
- Test haversine clustering with known distances
- Test time-of-day binning with mock timestamps
- Test tier progression at tier boundaries (50, 100, 200, 500)
- Test cache hit/miss scenarios
- Test graceful failure when backend is unavailable

## Files

- **`src/types/intelligence.ts`**: Type definitions (CampDataPoint, CampIntelligence, etc.)
- **`src/services/campIntelligenceService.ts`**: Core service implementation
- **`src/services/campIntelligenceService.example.ts`**: Usage examples (documentation only)
- **`CAMP_INTELLIGENCE.md`**: This file

## Related

- `DeerCampContext.tsx` — Data source (camps, annotations, photos)
- `DeerCampScreen.tsx` — Display integration point
- Backend API endpoint: `/api/v1/deercamp/{campId}/intelligence`

---

**Status**: Complete for V2
**Last Updated**: 2026-04-02
