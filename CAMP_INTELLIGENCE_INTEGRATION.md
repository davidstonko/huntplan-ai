# Camp Intelligence Integration Guide

Quick start for integrating Camp Intelligence into DeerCampScreen and related components.

## Installation (Already Done)

The following files have been created:

```
src/types/intelligence.ts                    # Type definitions
src/services/campIntelligenceService.ts      # Core service
CAMP_INTELLIGENCE.md                         # Full documentation
```

No additional npm packages required. The service uses existing dependencies: `AsyncStorage`, `axios`, `react-native`.

## Basic Usage

### 1. Import the service

```typescript
import {
  getCampIntelligence,
  getDataPointCount,
  getTier,
  TIER_DEFINITIONS,
} from '../services/campIntelligenceService';
import type { CampIntelligence } from '../types/intelligence';
```

### 2. Display in camp list (e.g., DeerCampScreen)

```typescript
function CampListCard({ camp }: { camp: DeerCamp }) {
  const pointCount = getDataPointCount(camp);
  const isUnlocked = pointCount >= 50;

  return (
    <TouchableOpacity onPress={() => viewCampDetails(camp.id)}>
      <View style={styles.card}>
        <Text style={styles.campName}>{camp.name}</Text>

        {isUnlocked ? (
          <Badge
            label={`${pointCount} AI points`}
            color={colors.mdGold}
          />
        ) : (
          <Text style={styles.hint}>
            {`Add ${50 - pointCount} more points to unlock`}
          </Text>
        )}
      </View>
    </TouchableOpacity>
  );
}
```

### 3. Show full intelligence panel (modal or screen)

```typescript
async function showIntelligencePanel(camp: DeerCamp) {
  const intelligence = await getCampIntelligence(camp);

  return (
    <ScrollView>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Camp Intelligence</Text>
        <Text style={styles.subtitle}>
          Tier: {TIER_DEFINITIONS[intelligence.tier].label}
        </Text>
      </View>

      {/* Locked state */}
      {!intelligence.isUnlocked && (
        <View style={styles.lockedPanel}>
          <Text style={styles.message}>
            Unlock AI insights by adding {intelligence.nextTierAt - intelligence.dataPointCount} more data points
          </Text>
          <ProgressBar
            value={intelligence.progressToNextTier}
            max={100}
          />
          <Text style={styles.benefits}>
            Benefits of {TIER_DEFINITIONS[intelligence.nextTierBenefits[0]].label}:
            {intelligence.nextTierBenefits.map(b => `• ${b}`).join('\n')}
          </Text>
        </View>
      )}

      {/* Unlocked state */}
      {intelligence.isUnlocked && (
        <View style={styles.unlockedPanel}>
          {/* Show local insights immediately */}
          <LocalInsightsPanel insights={intelligence.localInsights} />

          {/* Show AI insights if available (loaded async) */}
          {intelligence.aiInsights ? (
            <AIInsightsPanel insights={intelligence.aiInsights} />
          ) : (
            <Text style={styles.loading}>Loading AI analysis...</Text>
          )}
        </View>
      )}
    </ScrollView>
  );
}
```

### 4. Create reusable hook (optional)

```typescript
import { useEffect, useState } from 'react';
import { CampIntelligence } from '../types/intelligence';
import { getCampIntelligence } from '../services/campIntelligenceService';

export function useCampIntelligence(campId: string) {
  const [intelligence, setIntelligence] = useState<CampIntelligence | null>(null);
  const [loading, setLoading] = useState(true);
  const { getCamp } = useDeerCamp();

  useEffect(() => {
    (async () => {
      const camp = getCamp(campId);
      if (camp) {
        const intel = await getCampIntelligence(camp);
        setIntelligence(intel);
      }
      setLoading(false);
    })();
  }, [campId, getCamp]);

  return { intelligence, loading };
}

// Usage in component
function CampDetails({ campId }: { campId: string }) {
  const { intelligence, loading } = useCampIntelligence(campId);

  if (loading) return <Text>Loading...</Text>;
  if (!intelligence) return <Text>Camp not found</Text>;

  return showIntelligencePanel(intelligence);
}
```

## Component Integration Checklist

- [ ] **DeerCampScreen** — Add intelligence badge to camp list cards
- [ ] **CampDetailModal** — Add intelligence panel when expanding camp
- [ ] **ScoutScreen** — Optional: Show "X points to unlock" hint in camp selector
- [ ] **Navigation** — Add route/modal for full intelligence view
- [ ] **Analytics** — Log when intelligence is viewed/acted upon
- [ ] **Styling** — Update colors/spacing per theme (already using colors.ts)

## UI Component Templates

### LocalInsightsPanel

```typescript
function LocalInsightsPanel({ insights }: { insights: LocalInsights }) {
  return (
    <View>
      {/* Time of day chart */}
      {insights.bestTimeOfDay && (
        <Section title="Best Time to Hunt">
          <Row>
            <Text>Morning: {insights.bestTimeOfDay.morning}%</Text>
            <Text>Midday: {insights.bestTimeOfDay.midday}%</Text>
            <Text>Evening: {insights.bestTimeOfDay.evening}%</Text>
          </Row>
        </Section>
      )}

      {/* Species breakdown */}
      {Object.keys(insights.speciesBreakdown).length > 0 && (
        <Section title="Species Activity">
          {Object.entries(insights.speciesBreakdown)
            .sort(([, a], [, b]) => b - a)
            .map(([species, count]) => (
              <Row key={species}>
                <Text>{species}</Text>
                <Text>{count} sightings</Text>
              </Row>
            ))}
        </Section>
      )}

      {/* More sections... */}
    </View>
  );
}
```

### AIInsightsPanel

```typescript
function AIInsightsPanel({ insights }: { insights: AIInsights }) {
  return (
    <View>
      <Section title="AI Analysis">
        <Text style={styles.summary}>{insights.summary}</Text>

        {insights.recommendations.length > 0 && (
          <View>
            <Text style={styles.subheading}>Recommendations</Text>
            {insights.recommendations.map((rec, i) => (
              <Text key={i} style={styles.bullet}>• {rec}</Text>
            ))}
          </View>
        )}

        {insights.strategySuggestion && (
          <View>
            <Text style={styles.subheading}>Strategy</Text>
            <Text style={styles.italic}>{insights.strategySuggestion}</Text>
          </View>
        )}
      </Section>
    </View>
  );
}
```

## Backend API Endpoint

The service expects this endpoint to exist (create during Phase 3):

**POST** `/api/v1/deercamp/{campId}/intelligence`

### Request Body
```json
{
  "dataPointCount": 127,
  "speciesBreakdown": { "Deer": 95, "Turkey": 32 },
  "topLocations": [
    { "name": "Hotspot 1", "lat": 39.0, "lon": -76.5, "count": 12 }
  ],
  "timePatterns": { "morning": 45, "midday": 20, "evening": 35 },
  "seasonalData": [
    { "month": "Oct", "activityLevel": 78 },
    { "month": "Nov", "activityLevel": 92 }
  ],
  "memberCount": 3,
  "weaponSuccess": {
    "Bow": { "attempts": 10, "harvests": 2 },
    "Rifle": { "attempts": 5, "harvests": 3 }
  },
  "averageHarvestWeight": 145.5,
  "averageAntlerPoints": 8.2
}
```

### Response
```json
{
  "summary": "Based on 127 data points from 3 members over 2 seasons, your camp excels at early-season deer hunting...",
  "recommendations": [
    "Focus on morning hunts during October (highest success rate)",
    "Evening sits show 35% activity; rifle hunting most effective",
    "Consider archery for doe season; historically better success"
  ],
  "patterns": [
    "Peak activity: October 15 - November 10",
    "Weather correlation: Falling pressure = 30% more sightings",
    "Morning hunts yield 45% of all harvests"
  ],
  "predicted_best_days": [
    "Oct 18-21 (pre-rut, falling pressure)",
    "Nov 5-8 (peak rut window)"
  ],
  "strategy_suggestion": "Prioritize morning stands at Hotspot 1 through October. Shift to evening hunts and rifle hunting in November as rut activity peaks."
}
```

## Error Handling

The service gracefully degrades:

```typescript
const intelligence = await getCampIntelligence(camp);

// Local insights ALWAYS available if unlocked
if (intelligence.isUnlocked) {
  showLocalInsights(intelligence.localInsights); // Always works
}

// AI insights load async and may fail
if (intelligence.aiInsights) {
  showAIInsights(intelligence.aiInsights); // Works if cached/fresh
} else {
  // Local insights alone are still useful
  // AI will be cached for next time
}
```

## Performance Considerations

### Fast Path (Typical)
1. `getDataPointCount()` — O(1), instant badge update
2. Show locked/unlocked state
3. `getCampIntelligence()` returns local insights immediately
4. Background: AI analysis loads async, cached on success

### Optimization Tips
- Use `getDataPointCount()` for quick checks (list rendering)
- Call `getCampIntelligence()` only when showing full panel
- AI results are cached — subsequent calls return immediately
- Consider virtualizing large camp lists

## Styling

All colors are from `theme/colors.ts`:

```typescript
import colors from '../theme/colors';

const styles = StyleSheet.create({
  aiPanel: {
    backgroundColor: colors.surface,
    borderTopColor: colors.mdGold,
    borderTopWidth: 2,
  },
  lockedPanel: {
    backgroundColor: colors.surfaceElevated,
    borderColor: colors.clay,
    borderWidth: 1,
  },
  unlockedPanel: {
    backgroundColor: colors.surface,
  },
  tierLabel: {
    color: colors.mdGold,
    fontSize: 14,
    fontWeight: 'bold',
  },
});
```

## Testing

### Test in Development
```typescript
// In DeerCampScreen dev menu:
async function testIntelligence() {
  const camp = camps[0];
  const intel = await getCampIntelligence(camp);
  console.log('Intelligence:', intel);

  // Test tier progression
  console.log('Tier:', intel.tier);
  console.log('Progress:', intel.progressToNextTier + '%');
  console.log('Next tier at:', intel.nextTierAt);
}
```

### Mock Data
```typescript
const mockCamp: DeerCamp = {
  // ... camp properties
  annotations: Array(60).fill(null).map((_, i) => ({
    id: `ann-${i}`,
    type: i % 4 === 0 ? 'waypoint' : i % 4 === 1 ? 'route' : 'area',
    createdBy: 'test-user',
    createdAt: new Date(2024, 0, 1 + i).toISOString(),
    data: { /* ... */ },
  })),
  photos: Array(20).fill(null).map((_, i) => ({
    id: `photo-${i}`,
    uploadedBy: 'test-user',
    uploadedAt: new Date(2024, 0, 1 + i).toISOString(),
    imageUri: 'file://...',
    lat: 39.0 + (Math.random() - 0.5) * 0.01,
    lng: -76.5 + (Math.random() - 0.5) * 0.01,
  })),
  activityFeed: Array(40).fill(null).map((_, i) => ({
    id: `feed-${i}`,
    userId: 'u1',
    username: 'Hunter',
    action: 'added a waypoint',
    timestamp: new Date(2024, 0, 1 + i).toISOString(),
  })),
};

const intel = await getCampIntelligence(mockCamp);
// Should show: dataPointCount = 120, tier = 'advanced'
```

## Next Steps

1. **Now**: Integrate intelligence display into DeerCampScreen
2. **Next**: Add modal/detailed view with full AI insights
3. **Future**: Create backend endpoint for AI analysis
4. **Future**: Add real-time updates via WebSocket
5. **Future**: Implement multi-season comparison

---

**For full details, see `CAMP_INTELLIGENCE.md`**
