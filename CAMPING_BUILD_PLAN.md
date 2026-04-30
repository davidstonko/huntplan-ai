# Phase 5A: MD Camp Mode + Deer Camp Sharing Build Plan

> **CANONICAL REPO LOCK:** This plan applies to `~/Documents/huntmaryland-build/` ONLY. If you see this file in any other folder (e.g. `huntplan-ai/mobile/`), that copy is **stale** — flag it to David and stop. (Lock added 2026-04-26 after a parallel V2.3 fork consolidation.)


**Created:** 2026-04-05
**Updated:** 2026-04-08
**Target:** New "MD Camp" activity mode with MD DNR campsite data + Amazon gear affiliate links; Universal Link sharing for Deer Camp invites
**Status:** Sprints C-A through C-D MOSTLY COMPLETE

---

## Current Status (Audit 2026-04-11)

- **CampMapScreen FULLY IMPLEMENTED** — Full Mapbox map with MD campsites, park boundaries, amenity filters (water, restrooms, RV hookups), accessibility features
- **GroupCampScreen FULLY IMPLEMENTED** — Collaborative shared camping maps with friends/camping groups (same architecture as DeerCampScreen)
- **CampGearScreen IMPLEMENTED** — Curated camping gear picks with product cards + Amazon affiliate links (mdoutdoors-20)
- **CampResourcesScreen IMPLEMENTED** — Camping regulations, park contacts, links & guides
- **Sprint C-D mostly done** — Need to complete: Associated Domains + Universal Link testing, AASA file on GitHub Pages, Associated Domains in Xcode

---

## 1. MD Camp Mode — Overview

New 6th activity mode: **MD Camp** — joins Hunt, Fish, Hike, Crab, Boat in the ActivityModePicker.

### Tab Structure
```
Camp Map | Gear | AI | Group Camp | Resources
```

- **Camp Map:** Full Mapbox map with MD DNR campsite locations (state parks, state forests, public campgrounds). Filters for amenities (electric, water, pet-friendly, waterfront, cabins, group sites). Site detail cards with reservation links.
- **Gear:** Curated camping equipment loadouts with Amazon affiliate links. Mirrors StarterGearScreen pattern — tab-based UI with category loadouts (Car Camping, Backpacking, Family, Winter).
- **AI:** Camping-focused chat — campsite recommendations, gear advice, weather, regulations, fire restrictions.
- **Group Camp:** Collaborative shared camp maps (mirrors Deer Camp / Fish Camp pattern). Plan group trips, mark campsites, trails, water sources, shared gear lists.
- **Resources:** Segmented control (Regulations | Links & Guides | Out of State) — camping-specific DNR links, fire regulations, reservation portals, Leave No Trace.

### Data Sources

| Source | URL | Content | Count | Priority |
|--------|-----|---------|-------|----------|
| **MD DNR State Parks** | dnr.maryland.gov/publiclands/pages/state-parks.aspx | 53 state parks — campgrounds, cabins, amenities | ~53 | P0 |
| **MD DNR State Forests** | dnr.maryland.gov/forests/pages/state-forests.aspx | 8 state forests — primitive camping | ~8 | P0 |
| **MD iMap Campgrounds** | data.imap.maryland.gov | GIS points for campground locations | TBD | P0 |
| **MD Park Reservations** | parkreservations.maryland.gov | Reservation links per campground | N/A | P0 |
| **Recreation.gov** | recreation.gov | Federal campgrounds in MD (Assateague, C&O Canal, etc.) | ~10 | P1 |
| **NOAA Weather** | weather.gov API | Already integrated | N/A | Existing |

### Campsite Data Schema

```typescript
interface MarylandCampsite {
  id: string;
  name: string;
  type: 'state_park' | 'state_forest' | 'federal' | 'county';
  lat: number;
  lng: number;
  county: string;
  region: 'western' | 'central' | 'southern' | 'eastern_shore';

  // Amenities
  electric: boolean;
  water: boolean;
  sewer: boolean;
  showers: boolean;
  restrooms: boolean;
  petFriendly: boolean;
  adaAccessible: boolean;
  waterfront: boolean;
  wifi: boolean;

  // Site types available
  tentSites: boolean;
  rvSites: boolean;
  cabins: boolean;
  yurts: boolean;
  groupSites: boolean;
  primitiveOnly: boolean;

  // Metadata
  totalSites?: number;
  seasonOpen?: string;    // e.g., "April 1 – October 31"
  seasonClose?: string;
  maxStay?: number;       // nights
  reservationUrl?: string;
  websiteUrl?: string;
  phone?: string;
  description?: string;

  // Pricing (approximate ranges)
  tentPriceRange?: string;  // e.g., "$21-$31/night"
  rvPriceRange?: string;
  cabinPriceRange?: string;

  // Map display
  color: string;           // Mapbox marker color
  polygon?: GeoJSON.Feature; // Boundary if available from iMap
}
```

### Camp Filter System

| Category | Options |
|----------|---------|
| **Site Type** | State Park, State Forest, Federal, County |
| **Amenities** | Electric, Water, Showers, Pet Friendly, ADA, Waterfront |
| **Lodging** | Tent, RV, Cabin/Yurt, Primitive |
| **Season** | Open Now, Year-Round |
| **Region** | Western MD, Central MD, Southern MD, Eastern Shore |

### Curated Camping Gear (Amazon Affiliate)

4 loadout tabs mirroring the StarterGearScreen pattern:

| Tab | Target Audience | Example Items |
|-----|----------------|---------------|
| **Car Camping** | Families, beginners | 4-person tent, camp stove, cooler, sleeping bags, chairs, lantern |
| **Backpacking** | Experienced hikers | Ultralight tent, backpack, water filter, camp stove, headlamp |
| **Family Camping** | Parents + kids | Large tent, air mattress, games, s'mores kit, bug spray, first aid |
| **Winter Camping** | Cold-weather campers | 0°F sleeping bag, insulated pad, hand warmers, layering guide |

Uses existing `amazonAffiliateService.ts` + `ASSOCIATE_TAG = 'mdoutdoors1-20'` pattern.

---

## 2. Deer Camp Invite Sharing via Universal Links

### Architecture

```
┌──────────────────────────────────────────────────────┐
│  User taps "Invite" in Deer Camp                     │
│  → Generates invite code (6-char alphanumeric)       │
│  → Stores code in camp.inviteCode                    │
│  → Shares link via iOS Share Sheet (iMessage, SMS)   │
│                                                      │
│  Link format:                                        │
│  https://davidstonko.github.io/huntmaryland-site/    │
│         join?camp=ABC123                             │
│                                                      │
│  ┌─────────────────────────────────────────────┐     │
│  │ Recipient taps link                         │     │
│  │                                             │     │
│  │ Has app? ──YES──→ Universal Link opens app  │     │
│  │    │              → Auto-joins camp          │     │
│  │    NO             → Shows in Deer Camp tab   │     │
│  │    │                                        │     │
│  │    └──→ Fallback HTML page loads            │     │
│  │         → "Get MDHuntFishOutdoors" button   │     │
│  │         → Links to App Store                │     │
│  │         → Invite code stored for post-      │     │
│  │            install deep link                │     │
│  └─────────────────────────────────────────────┘     │
└──────────────────────────────────────────────────────┘
```

### Implementation Steps

#### A. GitHub Pages — Universal Link Support

1. **apple-app-site-association (AASA) file** — host at `/.well-known/apple-app-site-association` on huntmaryland-site:

```json
{
  "applinks": {
    "apps": [],
    "details": [
      {
        "appID": "TEAM_ID.com.davidstonko.huntmaryland",
        "paths": ["/join*"]
      }
    ]
  }
}
```

2. **Fallback HTML page** (`join/index.html`) — shown when app is not installed:
   - MDHuntFishOutdoors branding
   - "You've been invited to join a Deer Camp!"
   - Camp name (passed as query param or decoded from invite)
   - "Download on the App Store" button → `https://apps.apple.com/app/id6761347484`
   - Smart App Banner meta tag: `<meta name="apple-itunes-app" content="app-id=6761347484, app-argument=camp/ABC123">`

#### B. iOS App — Associated Domains + Deep Link Handling

1. **Xcode Capabilities:**
   - Add `Associated Domains` capability
   - Add `applinks:davidstonko.github.io`

2. **Info.plist — URL Scheme (backup):**
   ```xml
   <key>CFBundleURLTypes</key>
   <array>
     <dict>
       <key>CFBundleURLSchemes</key>
       <array>
         <string>huntmaryland</string>
       </array>
     </dict>
   </array>
   ```

3. **App.tsx — Deep Link Handler:**
   - Listen for `Linking.addEventListener('url', handleDeepLink)`
   - Parse invite code from URL: `/join?camp=ABC123`
   - Look up camp by invite code
   - Auto-join: call `addMember(campId, deviceUsername)`
   - Navigate to Deer Camp tab → open that camp's map view

#### C. DeerCampContext — Invite Code System

1. **Generate invite code** on camp creation (or on-demand):
   ```typescript
   function generateInviteCode(): string {
     // 6-char alphanumeric, collision-resistant
     return Math.random().toString(36).substring(2, 8).toUpperCase();
   }
   ```

2. **New context methods:**
   ```typescript
   // Generate or refresh invite code for a camp
   shareCamp(campId: string): Promise<string>  // returns invite URL

   // Join camp via invite code (called from deep link handler)
   joinCampByInvite(inviteCode: string, username: string): Promise<DeerCamp | null>
   ```

3. **Populate `inviteCode` field** (already exists in DeerCamp type but is never set):
   - Set on first share, persisted in AsyncStorage
   - V3+: validate server-side

#### D. Share Sheet Integration

```typescript
import { Share } from 'react-native';

async function shareCampInvite(camp: DeerCamp) {
  const code = camp.inviteCode || await generateAndSaveInviteCode(camp.id);
  const url = `https://davidstonko.github.io/huntmaryland-site/join?camp=${code}`;

  await Share.share({
    message: `Join my Deer Camp "${camp.name}" on MDHuntFishOutdoors!\n${url}`,
    url: url, // iOS uses this for iMessage link preview
  });
}
```

#### E. iMessage Preview (Optional Enhancement)

Add Open Graph meta tags to `join/index.html` for rich link previews:
```html
<meta property="og:title" content="Join my Deer Camp on MDHuntFishOutdoors" />
<meta property="og:description" content="Collaborative hunting maps for Maryland" />
<meta property="og:image" content="https://davidstonko.github.io/huntmaryland-site/assets/og-image.png" />
```

---

## 3. Sprint Breakdown

### Sprint C-A: Coming Soon Placeholder + Deer Camp Sharing ✅ COMPLETE (2026-04-05)

**MD Camp — Coming Soon:**
- [x] Add `'camp'` to ActivityMode type
- [x] Add camp config to `activityModeConfig.ts` (labels, icons, empty state)
- [x] Register camp tabs in AppNavigator
- [x] Show camp mode in ActivityModePicker dropdown
- [x] CampComingSoonScreen: branded placeholder with tent emoji

**Deer Camp Sharing:**
- [x] Add `inviteCode` generation to DeerCampContext
- [x] Add `shareCampInvite()`, `joinCampByInvite()`, `getCampByInviteCode()` methods
- [x] Add "Share Invite Link" button to DeerCampScreen invite modal
- [x] Implement Share Sheet integration (iMessage, SMS, copy link)
- [x] Add DeepLinkHandler in App.tsx (Linking API)
- [x] Create `join/index.html` fallback page for GitHub Pages
- [x] Create `.well-known/apple-app-site-association` for GitHub Pages
- [ ] **REMAINING:** Add Associated Domains capability in Xcode (needs Team ID)
- [ ] **REMAINING:** Add `huntmaryland://` URL scheme to Info.plist
- [ ] **REMAINING:** Push AASA + join page to GitHub Pages repo
- [ ] **REMAINING:** Test end-to-end Universal Link flow

### Sprint C-B: Campsite Data Pipeline ✅ COMPLETE (2026-04-08)

- [x] Research MD DNR state park campground data via web sources
- [x] Compile 27 campgrounds with GPS coordinates, amenities, metadata
- [x] Generate `marylandCampsiteData.ts` — 27 sites across 4 regions
- [x] Helper functions: getCampsitesByRegion, getCampsitesByType, getCampsitesWithAmenity, getCampsitesSummary
- [ ] **REMAINING:** Build CampMapScreen with Mapbox markers + filters (needs map layer work)

### Sprint C-C: Camp Gear + AI + Resources Screens ✅ COMPLETE (2026-04-08)

- [x] CampGearScreen: 4-tab loadout UI (Car Camping, Backpacking, Family, Winter) — 66 products
- [x] Curated gear data files with real Amazon affiliate links (mdoutdoors1-20)
- [x] Camp AI tab: Wired to shared AIStack (ChatScreen) — camp knowledge base created
- [x] campingChatKnowledge.ts: 12 intent handlers (reservations, campfires, seasons, pets, popular camps, backcountry, RV, cabins, bear safety, LNT, gear, fees)
- [x] CampResourcesScreen: 3-segment layout (Regulations, Links & Guides, Out of State) — 30+ resource links
- [x] campingResources.ts: 7 resource categories with real verified URLs
- [x] AppNavigator updated: Gear tab → CampGearScreen, AI tab → AIStack, Resources tab → CampResourcesStack
- [x] TypeScript 0 errors, all QC checks pass

### Sprint C-D: Camp Map + Group Camp (Future)

- [ ] CampMapScreen: Full Mapbox with 27 campsite markers + filters (using marylandCampsiteData.ts)
- [ ] GroupCampScreen: Mirrors Deer Camp — collaborative trip planning
- [ ] GroupCampContext: Shared annotations, members, activity feed
- [ ] Camping-specific waypoint icons (tent, fire ring, water source, latrine, trailhead)
- [ ] Weather integration for campsite forecasts
- [ ] Wire camp knowledge base into ChatScreen's mode-aware routing

---

## 4. Files to Create/Modify

### New Files
| File | Purpose | Status |
|------|---------|--------|
| `src/screens/CampComingSoonScreen.tsx` | Placeholder for Camp Map + Group Camp tabs | ✅ Created |
| `src/screens/CampGearScreen.tsx` | 4-tab camping gear loadouts with Amazon links | ✅ Created |
| `src/screens/CampResourcesScreen.tsx` | 3-segment resources (Regs, Links, Out of State) | ✅ Created |
| `src/screens/CampMapScreen.tsx` | Full Mapbox with campsite markers + filters | Planned (C-D) |
| `src/data/marylandCampsiteData.ts` | 27 campgrounds with GPS, amenities, metadata | ✅ Created |
| `src/data/curatedCampingGear.ts` | 66 curated products across 4 loadout categories | ✅ Created |
| `src/data/campingChatKnowledge.ts` | AI knowledge base — 12 intent handlers | ✅ Created |
| `src/data/campingResources.ts` | 30+ resource links in 7 categories | ✅ Created |
| `src/data/curatedCampingGear.ts` | Curated gear with affiliate links (Sprint C-C) |
| `src/data/campingChatKnowledge.ts` | AI knowledge base for camping (Sprint C-C) |
| `src/context/GroupCampContext.tsx` | Group camp state management (Sprint C-D) |
| GitHub Pages: `.well-known/apple-app-site-association` | Universal Links config |
| GitHub Pages: `join/index.html` | Fallback page for non-app-users |

### Modified Files
| File | Changes |
|------|---------|
| `src/context/ActivityModeContext.tsx` | Add `'camp'` to ActivityMode union |
| `src/config/activityModeConfig.ts` | Add full camp mode config |
| `src/navigation/AppNavigator.tsx` | Register camp mode tabs |
| `src/context/DeerCampContext.tsx` | Add invite code generation, shareCamp(), joinCampByInvite() |
| `src/types/deercamp.ts` | Add `inviteCode?: string` to DeerCamp interface (already has it) |
| `src/App.tsx` | Add deep link listener for Universal Links |
| `ios/HuntPlanAI.xcodeproj` | Associated Domains capability |
| `ios/HuntPlanAI/Info.plist` | URL scheme registration |

---

## 5. Notes

- **V2 local-first:** Invite codes stored in AsyncStorage. When two users share a camp, they each have a local copy. Real-time sync is a V3 backend feature.
- **Offline constraint:** The invite flow requires network to open the link, but once the camp data is imported, it works offline.
- **App Store link:** `https://apps.apple.com/app/id6761347484`
- **Team ID:** Needed for AASA file — get from Apple Developer portal (Certificates, Identifiers & Profiles).
- **Smart App Banner:** iOS Safari will show a native banner linking to the app when users visit the join page.

---

Last Updated: 2026-04-05
