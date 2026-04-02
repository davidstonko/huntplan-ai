# Camp Intelligence Mobile Integration Guide

Quick reference for iOS developers integrating "AI Learns Your Deer Camp" into the mobile app.

## Endpoint

```
POST /api/v1/deercamp/camps/{camp_id}/intelligence
```

**Headers:**
```
Authorization: Bearer {jwt_token}
Content-Type: application/json
```

## When to Call

User taps "AI Learns Camp" button from:
- Camp detail screen → Intelligence tab
- Camp menu → "Get AI Insights"
- Deer Camp side panel → "Analyze"

## What Data to Send

Aggregate camp data from the Deer Camp context:

```typescript
interface CampIntelligencePayload {
  data_point_count: number;           // Total harvests + records
  members_count: number;              // Number of hunters
  species_breakdown: Record<string, number>; // {"Deer": 89, "Turkey": 12}
  harvest_locations: Array<{
    name: string;                     // Stand/location name
    lat: number;
    lng: number;
    count: number;                    // Harvest count at location
  }>;
  time_patterns: Record<string, number>; // {"morning": 65, "midday": 10, "evening": 25}
  seasonal_data: Array<{
    month: string;                    // "November"
    activity: number;                 // Percentage 0-100
  }>;
  weapon_stats: Record<string, {
    attempts: number;
    harvests: number;
  }>;
  average_harvest_weight?: number;    // lbs
  average_antler_points?: number;
  top_stands?: Array<{
    name: string;
    harvests: number;
  }>;
  camp_bounds?: {
    north: number;
    south: number;
    east: number;
    west: number;
  };
}
```

## How to Build the Payload

From `DeerCampContext`:

```typescript
// 1. Count all annotations (waypoints, routes, areas, tracks, notes)
const dataPointCount = camp.annotations.length;

// 2. Count members
const membersCount = camp.members.length;

// 3. Species breakdown — from photos or annotation data
const speciesBreakdown = {
  "Deer": 89,
  "Turkey": 12,
  // ...
};

// 4. Harvest locations — group by location name
const harvestLocations = camp.annotations
  .filter(a => a.type === "waypoint" && a.data.is_harvest)
  .reduce((acc, annot) => {
    const loc = acc.find(l => l.name === annot.data.location_name);
    if (loc) {
      loc.count += 1;
    } else {
      acc.push({
        name: annot.data.location_name,
        lat: annot.data.lat,
        lng: annot.data.lng,
        count: 1,
      });
    }
    return acc;
  }, []);

// 5. Time patterns — from annotation timestamps
const timePatterns = {
  morning: 65,    // 5am-11am
  midday: 10,     // 11am-4pm
  evening: 25,    // 4pm-sunset
};

// 6. Seasonal data — from activity feed timestamps
const seasonalData = [
  { month: "October", activity: 45 },
  { month: "November", activity: 92 },
  // ...
];

// 7. Weapon stats — from annotation data
const weaponStats = {
  "Archery": { attempts: 45, harvests: 12 },
  "Firearms": { attempts: 32, harvests: 18 },
  "Muzzleloader": { attempts: 15, harvests: 5 },
};

// 8. Averages — from harvested animals
const averageWeight = 187.5;
const averagePoints = 7.2;

// 9. Top stands
const topStands = [
  { name: "Ridge Stand", harvests: 34 },
  { name: "Creek Bottom", harvests: 28 },
];
```

## Making the Request

```typescript
async function analyzecampIntelligence(
  campId: string,
  payload: CampIntelligencePayload,
  token: string
) {
  const response = await fetch(
    `${API_BASE_URL}/api/v1/deercamp/camps/${campId}/intelligence`,
    {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    }
  );

  if (response.status === 403) {
    const data = await response.json();
    if (data.detail.includes("data points")) {
      // Insufficient data — show tier gating message
      return {
        error: "insufficient_data",
        message: data.detail,
      };
    } else {
      // Not camp member
      return {
        error: "forbidden",
        message: "You must be a member of this camp",
      };
    }
  }

  if (!response.ok) {
    return {
      error: "api_error",
      message: `Error: ${response.status}`,
    };
  }

  return await response.json();
}
```

## Response Format

**Success (200 OK):**
```json
{
  "status": "ok",
  "summary": "Your camp has recorded 145 data points from 4 members...",
  "recommendations": [
    "Morning hunts show strong success (65%)...",
    "Archery shows the highest success rate...",
    ...
  ],
  "patterns": [
    "Whitetail deer dominates the harvest...",
    ...
  ],
  "predicted_best_days": [
    "Late October/Early November (Pre-rut peak activity)",
    "Mid-November (Peak rut period, highest movement)",
    ...
  ],
  "strategy_suggestion": "With 4 hunters on your team...",
  "analyzed_at": "2026-04-02T18:32:45.123456+00:00",
  "data_point_count": 145,
  "members_count": 4,
  "fallback": false
}
```

**Insufficient Data (403 Forbidden):**
```json
{
  "detail": "Need at least 50 data points to unlock AI insights. Currently at 23."
}
```

## Display in UI

### Intelligence Panel Layout

```
┌─ Camp Intelligence ─────────────┐
│                                 │
│ 📊 SUMMARY                      │
│ Your camp has recorded 145 data │
│ points from 4 members...        │
│                                 │
│ 💡 RECOMMENDATIONS              │
│ • Morning hunts show strength   │
│ • Archery is most effective     │
│ • Ridge Stand is hottest        │
│ • Peak in November              │
│ • Manage hunter rotation        │
│                                 │
│ 🎯 PATTERNS                     │
│ • Whitetail dominated (89)      │
│ • Success concentrated (37%)    │
│ • Strong morning preference     │
│ • Healthy population (187 lbs)  │
│                                 │
│ 📅 BEST HUNTING DAYS            │
│ ◆ Late Oct/Early Nov (Pre-rut)  │
│ ◆ Mid-Nov (Peak rut)            │
│ ◆ Dec 1-15 (Secondary rut)      │
│ ◆ Weekdays in season            │
│                                 │
│ 🏹 STRATEGY                     │
│ With 4 hunters on your team,... │
│                                 │
└─ [Share] [Refresh]             │
│ Data: 145 points | AI Analysis  │
│ Analyzed: April 2, 6:32 PM     │
└─────────────────────────────────┘
```

### Error Messages

| Scenario | UI Message |
|----------|-----------|
| < 50 data points | "Need 50+ data points to unlock AI insights. Current: {count}. Keep logging harvests!" |
| Not camp member | "You must join this camp to view intelligence." |
| Network error | "Connection failed. Check your internet." |
| API timeout | "Analysis taking too long. Try again." |
| Fallback mode | "Analysis ready (offline mode). Results based on statistics, not AI." |

## Loading State

```
┌─────────────────────────────────┐
│  🔄 Analyzing Camp Data...      │
│                                 │
│  [████░░░░░░░░░░░░░░░░░░] 40%   │
│                                 │
│  Checking patterns...           │
│  Generating insights...         │
└─────────────────────────────────┘
```

Expected duration: 2-5 seconds (or instant if fallback)

## Caching Recommendation

Cache the response for **24 hours** to:
- Reduce API calls
- Provide instant subsequent views
- Reduce Gemini API usage

```typescript
// Store in DeerCampContext
interface CachedIntelligence {
  campId: string;
  analysis: CampIntelligenceResponse;
  cachedAt: number; // timestamp
}

// Check cache before API call
const cached = cache.get(campId);
if (cached && Date.now() - cached.cachedAt < 24 * 60 * 60 * 1000) {
  return cached.analysis;
}

// Otherwise fetch new
```

## Error Handling

```typescript
async function getCampIntelligence(campId: string) {
  try {
    // Show loading
    setLoading(true);

    // Aggregate data
    const payload = buildPayload();

    // Call endpoint
    const result = await analyzeIntelligence(campId, payload, token);

    // Handle responses
    if (result.error === "insufficient_data") {
      showModal("Not enough data", result.message);
      return;
    }

    if (result.error) {
      showAlert("Analysis failed", "Try again in a few moments");
      return;
    }

    // Cache and display
    cache.set(campId, result);
    setIntelligence(result);
    showIntelligencePanel(result);

  } catch (error) {
    console.error("Intelligence error:", error);
    showAlert("Error", "Could not analyze camp");
  } finally {
    setLoading(false);
  }
}
```

## Refresh Button

Allow user to force fresh analysis:

```typescript
async function refreshIntelligence() {
  cache.delete(campId);  // Clear cache
  await getCampIntelligence(campId);  // Fetch new
}
```

## Share Feature

Allow user to share analysis:

```typescript
function shareIntelligence(analysis: CampIntelligenceResponse) {
  const text = `
🏹 Deer Camp Intelligence Report
${analysis.summary}

💡 Top Recommendations:
${analysis.recommendations.map(r => `• ${r}`).join('\n')}

📅 Best Days to Hunt:
${analysis.predicted_best_days.join('\n')}

🎯 Strategy:
${analysis.strategy_suggestion}

Analyzed: ${formatDate(analysis.analyzed_at)}
  `.trim();

  Share.share({
    message: text,
    title: "Camp Intelligence Report",
  });
}
```

## Fallback Handling

Mobile app should gracefully handle fallback mode:

```typescript
if (analysis.fallback) {
  showBanner({
    title: "📊 Offline Analysis",
    message: "AI unavailable. Results based on statistics.",
    icon: "info",
  });
}
```

## Testing Checklist

- [ ] Payload builds correctly
- [ ] Network request sends with auth
- [ ] Response parses without errors
- [ ] UI displays all sections
- [ ] Tier gating message shows correctly
- [ ] Error handling works
- [ ] Loading spinner appears
- [ ] Cache stores and retrieves
- [ ] Refresh clears cache
- [ ] Share button works
- [ ] Works in fallback mode

## API Rate Limits

Gemini free tier: **15 requests per minute**

Recommendation: Debounce refresh button (min 5 seconds between calls)

```typescript
let lastCall = 0;
async function refreshWithThrottle() {
  const now = Date.now();
  if (now - lastCall < 5000) {
    showAlert("Please wait before refreshing again");
    return;
  }
  lastCall = now;
  await refreshIntelligence();
}
```

## Example User Flow

1. User opens Deer Camp → "Intelligence" tab
2. Tab shows: "AI Learns Your Camp" button (if >= 50 points)
3. User taps button
4. Loading spinner appears (2-5 seconds)
5. Analysis panel slides up with:
   - Summary card
   - Expandable recommendations
   - Patterns section
   - Best days calendar
   - Strategy card
6. User can:
   - Scroll through insights
   - Tap [Share] to send to friends
   - Tap [Refresh] to get new analysis
   - Tap [Close] to dismiss

---

**Status:** Ready for implementation
**Estimated Mobile Dev Time:** 2-4 hours
**Dependencies:** JWT auth, DeerCampContext, fetch API
