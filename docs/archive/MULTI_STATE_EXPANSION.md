# Multi-State Expansion Architecture

## Overview

The multi-state expansion system enables MDHuntFishOutdoors to support hunting, fishing, camping, and hiking data for multiple states (MD, VA, PA) with downloadable state data packs. Maryland is built-in; Virginia and Pennsylvania are downloadable for pro users.

**Current Status**: Architecture created (V2), implementation ready for Phase 3 backend integration.

## Architecture Files

### 1. **Type Definitions** (`src/types/statePack.ts`)
Comprehensive TypeScript types for the state pack system:

- `StateCode`: Type-safe state identifier (`'MD' | 'VA' | 'PA'`)
- `StatePack`: Main pack metadata (size, version, features, installation status)
- `StatePackManifest`: Server-side pack definition with checksums
- `StateDataBundle`: Complete state data loaded into memory
- `RegulationData`: Hunting/fishing/camping regulations by activity
- `GISData`: Boundaries for lands, fishing grounds, campgrounds, trails
- `FishingData`: Access sites, stocking locations, boat ramps, hatcheries
- `HuntingData`: Hunting lands, shooting ranges
- `AIKnowledgeBase`: Pre-indexed regulations for RAG chat
- Type guards: `isValidStateCode()`, `isValidStatePack()`

### 2. **State Pack Registry** (`src/data/statePackRegistry.ts`)
Master registry of all available state packs:

```
MD (Maryland):
  - Built-in, 50MB
  - 192 hunting lands, 436 fishing locations, 45 campgrounds, 1 hiking trail
  - Version 2.1.0

VA (Virginia):
  - Downloadable, 120MB
  - 350 hunting lands, 500 fishing locations, 80 campgrounds, 200 hiking trails
  - Version 1.0.0 (Phase 3)
  - Pro subscription required

PA (Pennsylvania):
  - Downloadable, 100MB
  - 300 hunting lands, 400 fishing locations, 60 campgrounds, 150 hiking trails
  - Version 1.0.0 (Phase 3)
  - Pro subscription required
```

Helper functions:
- `getStatePackByCode(stateCode)`: Lookup pack metadata
- `getInstalledPacks()`: List installed packs
- `getAvailablePacks()`: List downloadable packs
- `formatPackSize(bytes)`: Human-readable size (e.g., "120 MB")
- `getHuntingDescription(stateCode)`: Detailed hunting features
- `getFishingDescription(stateCode)`: Detailed fishing features
- `getHikingDescription(stateCode)`: Detailed hiking features
- `getNotableDestinations(stateCode)`: Popular locations array

### 3. **State Pack Service** (`src/services/statePackService.ts`)
Core service managing pack lifecycle:

#### Initialization
```typescript
await initializeStatePacks(); // Called on app startup
```

#### Pack Management
```typescript
// Get all packs with current status
const allPacks = await getAvailableStatePacks();

// Get only installed packs
const installed = await getInstalledStatePacks();

// Get single pack
const pack = await getStatePackByCodeAsync('VA');

// Download a pack (with progress callback)
await downloadStatePack('VA', (progress) => {
  console.log(`Download progress: ${progress}%`);
});

// Delete a pack (not MD)
await deleteStatePack('VA');

// Check for updates
const updatesAvailable = await checkForUpdates();
```

#### Active State Switching
```typescript
// Get currently active state
const activeState = await getActiveState(); // Returns 'MD' by default

// Switch active state (must be installed)
await setActiveState('VA');
```

#### Storage & Status
```typescript
// Get download progress for a pack
const progress = await getDownloadProgress('VA'); // 0-100 or undefined

// Get summary of installed packs
const summary = await getInstalledPackSummary(); // ['Maryland (~50 MB)', ...]

// Total storage used
const used = await getTotalPackStorageUsed(); // bytes
```

#### AsyncStorage Keys
- `@state_packs_metadata`: Object mapping stateCode → StatePackMetadata
- `@active_state`: Current active state code (defaults to 'MD')

### 4. **State Pack Screen** (`src/screens/StatePackScreen.tsx`)
Full-featured UI for managing state packs:

**Features**:
- Browse all available states with emoji flags (🦀 MD, 🌲 VA, ⛰️ PA)
- View pack features: hunting lands count, fishing locations, campgrounds, trails
- Download state packs with progress tracking
- Delete installed packs (except MD)
- Switch active state
- View detailed descriptions and notable destinations
- Storage usage summary
- Installation badges (Built-In, Pro, Installed)
- Expandable details for each state

**States**:
- MD: "Built-In" badge (cannot delete)
- VA/PA: "Pro" badge when not installed, "Installed" badge when ready

## Integration Points

### 1. **App Startup** (`src/App.tsx`)
Add initialization call:
```typescript
import { initializeStatePacks } from './services/statePackService';

// In app initialization
useEffect(() => {
  (async () => {
    await initializeStatePacks();
    // ... rest of startup
  })();
}, []);
```

### 2. **Navigation** (`src/navigation/AppNavigator.tsx`)
Add StatePackScreen to navigation:
```typescript
import StatePackScreen from '../screens/StatePackScreen';

// In navigator configuration
<Stack.Screen 
  name="StatePacks" 
  component={StatePackScreen}
  options={{ title: 'State Data Packs' }}
/>
```

### 3. **ProfileScreen Integration**
The existing ProfileScreen placeholder (lines 109-137) should be replaced or enhanced to navigate to StatePackScreen:
```typescript
// Option 1: Navigate to dedicated screen
<TouchableOpacity onPress={() => navigation.navigate('StatePacks')}>
  <Text>Manage State Packs</Text>
</TouchableOpacity>

// Option 2: Embed StatePackScreen in ProfileScreen
// Remove the simple toggle switches, use full StatePackScreen
```

### 4. **MapScreen / Data Loading**
Update map and data loading to respect active state:
```typescript
import { getActiveState } from '../services/statePackService';

useEffect(() => {
  (async () => {
    const activeState = await getActiveState();
    // Load hunting lands, fishing locations for activeState
    const lands = huntingDataByState[activeState];
    // ...
  })();
}, []);
```

### 5. **Context/Store Integration**
Create StateContext to track active pack:
```typescript
// src/context/StateContext.tsx
const StateContext = createContext<{
  activeState: StateCode;
  switchState: (code: StateCode) => Promise<void>;
}>(...);

// Wrap app with StateProvider
// In AppNavigator, subscribe to activeState
```

### 6. **AI Chat** (`src/screens/AIScreen.tsx`)
Load state-specific knowledge base:
```typescript
import { getActiveState, getStatePackByCodeAsync } from '../services/statePackService';

useEffect(() => {
  (async () => {
    const activeState = await getActiveState();
    const pack = await getStatePackByCodeAsync(activeState);
    const knowledge = pack?.aiKnowledgeBase;
    // Use knowledge for RAG chat
  })();
}, []);
```

### 7. **Regulations Screen** (`src/screens/ResourcesHubScreen.tsx`)
Load state regulations:
```typescript
const activeState = await getActiveState();
const pack = await getStatePackByCodeAsync(activeState);
const regs = pack?.regulations;
// Display regs for current state
```

## Data Pack Structure

### Inside Each State Pack Bundle

**Regulations** (`RegulationData`)
- Hunting seasons (species, dates, bag limits, weapons)
- Fishing seasons (species, sizes, bag limits)
- Camping rules (stay limits, fires, pets)
- Hiking rules (trail use, backcountry)
- License info (hunting, fishing, URLs)
- State-specific disclaimers

**GIS Data** (`GISData`)
- Hunting lands (WMA, State Forest, Federal, etc.) — polygons + metadata
- Fishing grounds (Bay, River, Lake, Ocean) — polygons with species
- Campgrounds — points with amenities
- Hiking trails — linestrings (AT, state trails, etc.)
- Park boundaries — polygons

**Fishing Data** (`FishingData`)
- Access sites (307+ in MD, 500+ in VA, 400+ in PA)
- Stocking locations (trout, stripers, etc.)
- Fishing grounds (61 in MD)
- Hatcheries (16 in MD)
- Boat ramps

**Hunting Data** (`HuntingData`)
- Hunting lands (192 in MD, 350 in VA, 300 in PA)
- Shooting ranges (14 in MD)
- Season data

**AI Knowledge Base** (`AIKnowledgeBase`)
- FAQ by activity (hunting, fishing, camping, hiking)
- Regulations indexed for RAG
- Land descriptions
- Local tips

**Map Tiles**
- Offline Mapbox tile regions (5 pre-defined regions per state)
- Zoom levels 0-15

## Phase 3+ Implementation Tasks

### Backend (`/backend`)
1. **State Pack API**
   - `/api/state-packs` — List all packs with manifests
   - `/api/state-packs/{stateCode}/download` — Get download URL & checksum
   - `/api/state-packs/{stateCode}/manifest` — Verify pack version

2. **Data Pipeline**
   - `scripts/generate_virginia_packs.py` — Extract VA data (GIS, regs, fishing)
   - `scripts/generate_pennsylvania_packs.py` — Extract PA data
   - Upload pack bundles to S3 for CDN distribution

3. **Database Schema**
   - `models/statepacks.py` — Pack metadata, versions, checksums
   - Track which users have which packs installed

### Mobile (`/src`)
1. **Download Management**
   - Implement actual S3 downloads in `downloadStatePack()`
   - Add resume capability for interrupted downloads
   - Store tile packs in device filesystem using `react-native-fs`

2. **Offline Maps**
   - Initialize Mapbox offline tile packs per state
   - Pre-cache regions when pack is downloaded
   - Clear caches when pack is deleted

3. **State-Aware Features**
   - Load regulations from active pack
   - Display active state in header
   - Show pack selection UI in profile/settings
   - Sync active state across app screens

4. **Subscription Integration**
   - Check pro subscription before allowing VA/PA downloads
   - Show paywall if user attempts VA/PA without pro
   - Link to SubscriptionScreen

## Testing Checklist

- [ ] `initializeStatePacks()` runs on app startup
- [ ] MD pack shows as installed and built-in
- [ ] VA/PA packs show as available for download
- [ ] Download simulation completes and updates AsyncStorage
- [ ] Delete pack removes from list and switches active state back to MD
- [ ] Switching active state persists across app closes
- [ ] StatePackScreen displays all packs with correct features/sizes
- [ ] Navigation to StatePackScreen works from ProfileScreen
- [ ] TypeScript: `npx tsc --noEmit` returns 0 errors
- [ ] Dark theme colors render correctly
- [ ] Download progress bar animates (Phase 3)
- [ ] Map loads data for active state (Phase 3)

## Files Created

```
src/types/statePack.ts                  — Type definitions (StatePack, StateCode, etc.)
src/data/statePackRegistry.ts           — Pack metadata & descriptions
src/services/statePackService.ts        — Pack lifecycle management
src/screens/StatePackScreen.tsx         — Pack browser UI
MULTI_STATE_EXPANSION.md                — This file
```

## Naming Conventions

- `stateCode`: Type-safe 'MD' | 'VA' | 'PA'
- `stateName`: Display name ('Maryland', 'Virginia', 'Pennsylvania')
- `activeState`: Currently selected state from AsyncStorage
- `pack` / `allPacks`: StatePack objects
- `metadata`: StatePackMetadata in AsyncStorage

## Color Usage

- Oak (`Colors.oak`) — Primary accent for buttons, badges, highlights
- Sage (`Colors.sage`) — Installed badge background
- Brass (`Colors.brass`) — Pro subscription badge
- Rust (`Colors.rust`) — Delete button
- Dark theme throughout (`Colors.background`, `Colors.surface`)

## Notes for Development

1. **Phase 2 (Current)**: Architecture only, UI mockups, no real downloads
2. **Phase 3**: Implement backend APIs, real downloads, tile pack caching
3. **State files are independent**: Each state pack is self-contained
4. **MD is immutable**: Built-in and cannot be deleted or downgraded
5. **TypeScript strict mode**: All files pass `npx tsc --noEmit`
6. **No external dependencies** beyond existing (AsyncStorage)
7. **Async-first**: All operations are Promise-based for future backend calls

---

**Last Updated**: 2026-04-11
**Status**: Ready for Phase 3 backend integration
