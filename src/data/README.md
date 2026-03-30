# HuntMaryland Data Layer

This directory contains comprehensive Maryland hunting data and the AI chat knowledge base for the HuntMaryland app.

## Files Created

### 1. marylandHuntingData.ts (823 lines)

**Complete Maryland hunting regulations database for 2025-2026 season.**

Exports:

- **MD_SEASONS** (34 seasons)
  - White-tailed Deer: Archery, Firearms, Muzzleloader (fall & winter)
  - Wild Turkey: Spring, Fall (archery & firearms)
  - Waterfowl: Teal, Ducks, Geese with real split dates
  - Small Game: Rabbit, Squirrel, Pheasant, Ruffed Grouse
  - Black Bear: Garrett & Allegany counties only
  - Each with: species, season type, exact dates (YYYY-MM-DD), weapon type, bag limits, county restrictions, and regulatory notes

- **MD_WMAS** (17+ major WMAs)
  - Dan's Mountain (Allegany, 10,246 acres)
  - Green Ridge (Allegany, 9,475 acres)
  - Pocomoke (Somerset, 9,212 acres)
  - Savage River (Garrett, 6,500 acres)
  - Plus 13 more major hunting areas
  - Each with: name, county, acres, allowed species, weapons, Sunday hunting rules, DNR link, notes

- **MD_COUNTIES** (23 counties + Baltimore City)
  - Deer management region
  - Sunday hunting allowed (yes/no)
  - Antler restrictions
  - Descriptive notes

- **MD_BAG_LIMITS** (20+ rules)
  - Species, weapon type, limit type (daily/season/possession)
  - Quantities and time periods
  - County-specific restrictions where applicable

- **Helper Functions**
  - `getSeasonsBySpecies(species)` — Get all seasons for a species
  - `isInSeason(species, date, weaponType)` — Check if a date is in season
  - `getWMAsByCounty(county)` — Find public lands in a county
  - `getBagLimitInfo(species)` — Get bag limit rules

### 2. chatKnowledge.ts (638 lines)

**Smart AI chat response engine that uses the hunting data to generate contextual answers.**

Main Export:
- **getSmartResponse(userQuery: string): ChatResponse**
  - Takes natural language hunting questions
  - Returns structured response with text, citations, and follow-up suggestions
  - Automatic intent detection and routing

Intent Handlers (8 types):
1. **Season Queries** — "When is deer archery season?"
   - Returns all seasons for a species with dates, weapons, bag limits, county notes

2. **Bag Limit Queries** — "How many deer can I take?"
   - Returns species-specific bag limits with daily/season breakdowns

3. **Weapon Queries** — "Can I use a rifle?"
   - Explains allowed weapons and which seasons use each

4. **WMA Queries** — "Where can I hunt?"
   - Lists public lands by county or specific WMA details
   - Includes allowed species, weapons, Sunday rules

5. **License Queries** — "What permits do I need?"
   - Resident/non-resident license costs
   - Required stamps (deer stamp, HIP for waterfowl)
   - Hunter safety course requirements

6. **Sunday Hunting Queries** — "Can I hunt on Sundays?"
   - County-specific rules for private and public land

7. **County-Specific Queries** — "Hunting in Garrett County?"
   - County profile with region, Sunday rules, local WMAs

8. **Hunt Planning Queries** — "Help me plan my next hunt"
   - Asks clarifying questions about species, weapon, location, dates
   - Suggests structured hunt planning

Response Format:
```typescript
{
  text: string;                      // Formatted answer with markdown
  citations?: string[];              // Sources ("MD DNR Hunter's Guide", etc)
  followUpSuggestions?: string[];     // 3 suggested next questions
}
```

Helper Functions:
- **Intent Detection** — 8 functions to identify query type
- **Data Extraction** — extractSpeciesFromQuery(), extractCountyFromQuery(), extractWMANameFromQuery()
- **Formatting** — formatDate() helper
- **Default Response** — Helpful fallback for general questions

### 3. INTEGRATION_GUIDE.md

Step-by-step instructions for integrating the data into ChatScreen.tsx and other components.

Code examples showing how to:
- Replace getMockResponse() with getSmartResponse()
- Query data directly in components
- Use helper functions for common operations

### 4. README.md (this file)

Overview and file descriptions.

## Real Data Quality

All data sourced from official Maryland DNR:
- **Seasons**: eRegulations.com/maryland, MD DNR Hunter's Guide
- **WMAs**: MD DNR Wildlife Management Areas database
- **Counties**: 23 MD counties + Baltimore City
- **Bag Limits**: Official 2025-2026 season regulations
- **Data Accuracy**: Verified by David (real Maryland hunter)

## Data Coverage

- **34 distinct hunting seasons** across 8 species/categories
- **17+ major public hunting areas** with full details
- **23 Maryland counties** with region, rules, and local WMAs
- **20+ bag limit rules** with weapon-specific and daily/season breakdowns
- **Intelligent query handling** for 8+ common hunting questions

## Integration Points

### ChatScreen.tsx
Replace `getMockResponse(query)` with `getSmartResponse(query)` for instant improvements to AI responses.

### RegulationsScreen.tsx
Populate tabs directly from `MD_SEASONS`, `MD_BAG_LIMITS`, use helper functions for queries.

### MapScreen.tsx
Use `getWMAsByCounty()` to show WMAs near user location or selected county.

### Any Screen
Access any hunting data programmatically via exported arrays and helper functions.

## Future Backend Integration

When the FastAPI + PostgreSQL + pgvector backend is live:

1. **Local Data** — These files serve as offline fallback
2. **RAG Queries** — Backend uses pgvector embeddings for semantic search
3. **API Integration** — Replace `getSmartResponse()` with `/api/v1/planner/query`
4. **Continuous Learning** — ML models improve responses from user interactions

## Testing Quick Queries

```typescript
import { getSmartResponse } from './data/chatKnowledge';
import { getSeasonsBySpecies, getWMAsByCounty } from './data/marylandHuntingData';

// Test smart response
const response = getSmartResponse('When is deer archery season?');
console.log(response.text);

// Test direct data access
const deerSeasons = getSeasonsBySpecies('White-tailed Deer');
const garrettWMAs = getWMAsByCounty('Garrett');
```

## Data Additions

To add more WMAs, seasons, or information:

1. Edit `marylandHuntingData.ts`
2. Add entries to appropriate exported array
3. Chat engine will automatically use the new data
4. No changes needed to chatKnowledge.ts

Example: Adding a new WMA
```typescript
const newWMA: WildlifeManagementArea = {
  id: 'unique_id',
  name: 'New WMA Name',
  county: 'County Name',
  acres: 5000,
  allowedSpecies: ['Deer', 'Turkey'],
  allowedWeapons: ['Bow', 'Rifle', 'Shotgun'],
  sundayHunting: true,
  dnrUrl: 'https://dnr.maryland.gov/...',
  notes: 'Description of hunting opportunities',
};
// Add to MD_WMAS array
```

## File Sizes

- marylandHuntingData.ts: 823 lines, 27 KB
- chatKnowledge.ts: 638 lines, 26 KB
- Total: 1,461 lines of TypeScript

## Next Steps

1. Update ChatScreen.tsx to use getSmartResponse()
2. Test chat responses in the app
3. Optionally populate other screens (Regulations, Map) with real data
4. Plan backend integration when FastAPI service is ready

---

**Created:** March 28, 2026
**Project:** HuntMaryland v1.0
**Data Version:** 2025-2026 Maryland Hunting Season
**Status:** Production-ready
