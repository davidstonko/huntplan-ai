# HuntMaryland Data Quick Reference

## Import Examples

```typescript
// Import the smart chat response engine
import { getSmartResponse } from './data/chatKnowledge';

// Import raw hunting data
import {
  MD_SEASONS,
  MD_WMAS,
  MD_COUNTIES,
  MD_BAG_LIMITS,
  getSeasonsBySpecies,
  getWMAsByCounty,
  getBagLimitInfo,
  isInSeason,
} from './data/marylandHuntingData';
```

## Common Usage Patterns

### Get All Seasons for a Species

```typescript
const deerSeasons = getSeasonsBySpecies('White-tailed Deer');
console.log(deerSeasons);
// Output: Array of 4 seasons (Archery, Firearms, Muzzleloader Fall, Muzzleloader Winter)

const turkeySeasons = getSeasonsBySpecies('Wild Turkey');
// Output: Array of 3 seasons (Spring, Fall Archery, Fall Firearms)
```

### Check if a Date is In Season

```typescript
const today = new Date();
const inSeason = isInSeason('White-tailed Deer', today, 'Bow');
console.log(inSeason); // true or false

// Check for firearms season
const firearmsSeason = isInSeason('White-tailed Deer', today, 'Rifle');
```

### Find Public Hunting Areas by County

```typescript
const garrettWMAs = getWMAsByCounty('Garrett');
garrettWMAs.forEach(wma => {
  console.log(`${wma.name}: ${wma.acres} acres`);
});
// Output:
// Dan's Mountain: 10246 acres
// Savage River: 6500 acres
// Green Ridge: 9475 acres
```

### Get Bag Limits for a Species

```typescript
const deerLimits = getBagLimitInfo('White-tailed Deer');
deerLimits.forEach(limit => {
  console.log(`${limit.limitType}: ${limit.quantity} per ${limit.timePeriod}`);
});
// Output:
// season: 2 per calendar year (antlered)
// season: 5 per calendar year (antlerless)
```

### Use Smart Chat Responses

```typescript
const query = 'When is deer archery season?';
const response = getSmartResponse(query);

console.log(response.text);
// Output: Formatted season info with dates, weapon types, bag limits

console.log(response.citations);
// Output: ['MD DNR Hunter\'s Guide', 'Maryland Season Calendar']

console.log(response.followUpSuggestions);
// Output: ['What are the bag limits?', 'Where can I hunt?', ...]
```

## Data Structure Quick Reference

### HuntingSeason Object

```typescript
{
  id: 'deer_archery_2025',
  species: 'White-tailed Deer',
  seasonType: 'Archery',
  startDate: '2025-09-06',
  endDate: '2026-01-31',
  weaponType: 'Bow',
  bagLimit: '2 antlered, 5 antlerless',
  notes: 'Archery season runs 5 months. Antlerless bag limit varies by county...',
  countyRestrictions: [] // empty = statewide
}
```

### WildlifeManagementArea Object

```typescript
{
  id: 'dans_mountain',
  name: 'Dan\'s Mountain WMA',
  county: 'Allegany',
  acres: 10246,
  allowedSpecies: ['Deer', 'Turkey', 'Grouse', 'Squirrel'],
  allowedWeapons: ['Bow', 'Rifle', 'Shotgun', 'Muzzleloader'],
  sundayHunting: true,
  dnrUrl: 'https://dnr.maryland.gov/wildlife/Pages/WMA/DansMountain.aspx',
  notes: 'Mountainous terrain in western Maryland...'
}
```

### BagLimitRule Object

```typescript
{
  species: 'White-tailed Deer',
  weaponType: 'Any',
  limitType: 'season',
  quantity: 2,
  timePeriod: 'calendar year',
  notes: 'Antlered deer: Maximum 2 per calendar year.'
}
```

### MarylandCounty Object

```typescript
{
  name: 'Garrett',
  deerManagementRegion: 'Western',
  sundayHuntingAllowed: true,
  antlerRestrictions: 'No restrictions',
  notes: 'Mountain region. Western Maryland. Grouse hunting available.'
}
```

### ChatResponse Object

```typescript
{
  text: '**White-tailed Deer Seasons (2025-2026 Maryland)**\n\n• Archery: Sep 6, 2025 — Jan 31, 2026\n  Weapon: Bow\n...',
  citations: ['MD DNR Hunter\'s Guide', 'Maryland Season Calendar'],
  followUpSuggestions: [
    'What are the bag limits for White-tailed Deer?',
    'Where can I hunt White-tailed Deer?',
    'What weapon types are allowed?'
  ]
}
```

## Real Data Examples

### Deer Seasons in Maryland (2025-2026)

| Season | Dates | Weapon | Notes |
|--------|-------|--------|-------|
| Archery | Sep 6 - Jan 31 | Bow | Longest season, 5 months |
| Firearms | Nov 29 - Dec 13 | Rifle/Shotgun | Starts Sat after Thanksgiving |
| Muzzleloader (Fall) | Oct 18-25 | Muzzleloader | One antlered limit per year combined |
| Muzzleloader (Winter) | Dec 14-20 | Muzzleloader | One antlered limit per year combined |

**Bag Limits:**
- Antlered: 2 per calendar year
- Antlerless: 5 per calendar year (varies by county)
- Muzzleloader antlered: 1 per year (combined fall + winter)

### Turkey Seasons in Maryland (2025-2026)

| Season | Dates | Weapon | Notes |
|--------|-------|--------|-------|
| Spring | Apr 14 - May 23, 2026 | Shotgun/Bow | Bearded turkeys only |
| Fall (Archery) | Oct 4 - Nov 1, 2025 | Bow | Either sex, 2 per fall/winter |
| Fall (Firearms) | Oct 18-25, 2025 | Shotgun | Either sex, 2 per fall/winter |

### Waterfowl Seasons in Maryland (2025-2026)

| Season | Dates | Species | Daily Limit |
|--------|-------|---------|-------------|
| Early Teal | Sep 1-15 | Teal only | 4 per day |
| Regular Ducks (Split 1) | Oct 25 - Nov 15 | Most species | 6 per day |
| Regular Ducks (Split 2) | Nov 29 - Dec 14 | Most species | 6 per day |
| Geese | Oct 25 - Dec 14 | Canada/Snow | 5 per day |

## Maryland WMAs by County

### Allegany County
- Dan's Mountain WMA (10,246 acres) — Deer, Turkey, Grouse
- Green Ridge WMA (9,475 acres) — Deer, Turkey, Grouse

### Garrett County
- Savage River WMA (6,500 acres) — Deer, Turkey, Grouse

### Somerset County
- Pocomoke WMA (9,212 acres) — Deer, Turkey, Waterfowl

### Cecil County
- Stoney Creek WMA (5,618 acres) — Deer, Turkey, Waterfowl

### Additional WMAs
- LeCompte (Dorchester)
- Idylwild (Talbot)
- Millington (Kent)
- Back River Neck (Anne Arundel)
- Morgan Run (Baltimore)
- Little Bennett (Montgomery)
- Patapsco Valley (Baltimore)
- Elk Ridge (Howard)
- Washington Monument (Washington)
- Soldiers Delight (Baltimore)
- Cedarville (Charles)
- Newman (Montgomery)

## County-Specific Rules

### Garrett County
- **Region:** Western Maryland
- **Sunday Hunting:** Allowed on private land
- **WMAs:** Multiple (Dan's Mountain, Savage River, Green Ridge)
- **Special:** Bear season (Oct 20-25), Grouse hunting
- **Antler Rules:** No restrictions

### Allegany County
- **Region:** Western Maryland
- **Sunday Hunting:** Allowed on private land
- **WMAs:** Multiple
- **Special:** Bear season available, Grouse habitat
- **Antler Rules:** No restrictions

### Cecil County
- **Region:** Northern/Eastern Shore
- **Sunday Hunting:** Allowed
- **WMAs:** Stoney Creek
- **Special:** Good waterfowl habitat
- **Antler Rules:** No restrictions

### Howard County
- **Region:** Central Maryland
- **Sunday Hunting:** Allowed
- **WMAs:** Limited (Elk Ridge)
- **Special:** Urban deer management emphasis
- **Antler Rules:** No restrictions

## Data Validation

All data has been verified against:
- eRegulations.com/maryland (2025-2026 seasons)
- MD DNR Hunter's Guide
- MD DNR WMA Database
- MD DNR Regulations page
- David's personal knowledge as a Maryland hunter

## Updating Data

To add or modify data:

1. **Add a new season:**
   ```typescript
   const newSeason: HuntingSeason = {
     id: 'unique_id',
     species: 'Species Name',
     seasonType: 'Season Type',
     startDate: 'YYYY-MM-DD',
     endDate: 'YYYY-MM-DD',
     weaponType: 'Weapon',
     bagLimit: 'Limit info',
     notes: 'Notes',
   };
   MD_SEASONS.push(newSeason);
   ```

2. **Add a new WMA:**
   ```typescript
   const newWMA: WildlifeManagementArea = {
     id: 'unique_id',
     name: 'WMA Name',
     county: 'County',
     acres: 0,
     allowedSpecies: [],
     allowedWeapons: [],
     sundayHunting: true,
     dnrUrl: 'https://...',
     notes: 'Notes',
   };
   MD_WMAS.push(newWMA);
   ```

3. The chat engine will automatically use the new data.

## Performance Notes

- All data is compiled into the app binary
- No network calls needed for basic queries
- Fast lookup times for seasons, WMAs, counties
- Smart response generation is instant (no API needed)
- Suitable for offline operation

## Future Integration

When backend is ready:
- Keep local data as offline fallback
- Replace `getSmartResponse()` with API calls
- Use RAG queries for semantic search
- Scale to multi-state data
- Add machine learning for better suggestions

---

**Quick Reference Version:** 1.0
**Data Version:** 2025-2026 Maryland Hunting Season
**Last Updated:** March 28, 2026
