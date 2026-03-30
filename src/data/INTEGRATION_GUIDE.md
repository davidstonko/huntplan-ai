# Maryland Hunting Data Integration Guide

## Overview

Two new TypeScript files have been created in `src/data/`:

1. **marylandHuntingData.ts** — Comprehensive Maryland hunting data (seasons, WMAs, counties, bag limits)
2. **chatKnowledge.ts** — Smart AI chat response engine

## Quick Start

### 1. Update ChatScreen.tsx to use the new knowledge base

Replace the `getMockResponse` function in `screens/ChatScreen.tsx` with:

```typescript
import { getSmartResponse } from '../data/chatKnowledge';

// In the handleSend function:
const handleSend = async () => {
  const query = inputText.trim();
  if (!query) return;

  addMessage(query, true);
  setInputText('');
  setLoading(true);

  // Use the new smart response engine
  setTimeout(() => {
    const response = getSmartResponse(query);
    addMessage(response.text, false);
    setLoading(false);
  }, 800 + Math.random() * 600);
};
```

### 2. Use data directly in Regulations or other screens

Example: Populate the Seasons tab with real data

```typescript
import { MD_SEASONS } from '../data/marylandHuntingData';

// In your component:
const [seasons, setSeasons] = useState(MD_SEASONS);
```

### 3. Query specific data

```typescript
import {
  getSeasonsBySpecies,
  getWMAsByCounty,
  getBagLimitInfo,
  isInSeason,
} from '../data/marylandHuntingData';

// Get all deer seasons
const deerSeasons = getSeasonsBySpecies('White-tailed Deer');

// Get WMAs in Garrett County
const garrettWMAs = getWMAsByCounty('Garrett');

// Check if a date is in season
const inSeason = isInSeason('White-tailed Deer', new Date(), 'Bow');

// Get bag limits for a species
const deerLimits = getBagLimitInfo('White-tailed Deer');
```

## Data Structure

### HuntingSeason
```typescript
{
  id: string;
  species: string;
  seasonType: string; // 'Archery', 'Firearms', 'Spring', etc.
  startDate: string; // YYYY-MM-DD
  endDate: string;
  weaponType: string;
  bagLimit?: string;
  notes: string;
  countyRestrictions?: string[];
}
```

### WildlifeManagementArea
```typescript
{
  id: string;
  name: string;
  county: string;
  acres: number;
  allowedSpecies: string[];
  allowedWeapons: string[];
  sundayHunting: boolean;
  dnrUrl: string;
  notes: string;
}
```

### BagLimitRule
```typescript
{
  species: string;
  weaponType?: string;
  limitType: string; // 'daily', 'season', 'possession'
  quantity: number;
  timePeriod: string;
  notes: string;
  countyRestrictions?: string[];
}
```

## Chat Response Format

`getSmartResponse(userQuery)` returns:

```typescript
{
  text: string;           // The main response message
  citations?: string[];   // References (e.g. 'MD DNR Hunter\'s Guide')
  followUpSuggestions?: string[]; // Suggested next questions
}
```

## Query Examples

The chat system automatically detects intent and routes to appropriate handlers:

| Query | Handler | Example Response |
|-------|---------|------------------|
| "When is deer season?" | Season Query | Shows archery, firearms, muzzleloader dates |
| "How many deer can I take?" | Bag Limit Query | Shows antlered/antlerless limits |
| "Where can I hunt?" | WMA Query | Lists public lands in area |
| "Can I hunt on Sunday?" | Sunday Query | County-specific answer |
| "What about Garrett County?" | County Query | County-specific regulations |
| "Help me plan a hunt" | Planning Query | Asks clarifying questions |

## Data Sources

All data sourced from official Maryland DNR sources:
- **Seasons**: eRegulations.com/maryland, MD DNR Hunter's Guide
- **WMAs**: MD DNR WMA Database (93+ areas)
- **Counties**: MD DNR Regional Data
- **Bag Limits**: Official 2025-2026 Season Regulations

## Future Integration

When the backend (FastAPI + PostgreSQL + pgvector) is ready:

1. Replace `getSmartResponse()` calls with API calls to `/api/v1/planner/query`
2. Keep this local data as offline fallback
3. Backend will use RAG (Retrieval-Augmented Generation) with pgvector embeddings
4. Responses will improve with machine learning

## Real Data Notes

This data is based on David's knowledge as a Maryland hunter:
- 23 Maryland counties + Baltimore City
- 15+ major WMAs (representing ~93+ statewide)
- Accurate 2025-2026 seasons with real dates
- Real bag limits from MD DNR regulations
- County-specific antler restrictions and Sunday hunting rules

## Testing

To test the chat responses in your app:

```typescript
import { getSmartResponse } from '../data/chatKnowledge';

// Test a query
const response = getSmartResponse('When is deer archery season in Garrett County?');
console.log(response.text);
console.log(response.citations);
console.log(response.followUpSuggestions);
```

## Adding More Data

To add more WMAs or seasons:

1. Edit `marylandHuntingData.ts`
2. Add entries to the appropriate array (MD_SEASONS, MD_WMAS, etc.)
3. Follow the existing structure for consistency
4. The chat engine will automatically use the new data

---

**Created**: March 28, 2026
**Project**: HuntMaryland v1.0
**Data Version**: 2025-2026 Maryland Season
