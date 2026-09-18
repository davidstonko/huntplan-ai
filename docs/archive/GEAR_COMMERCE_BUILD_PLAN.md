# GEAR_COMMERCE_BUILD_PLAN.md — Bait/Fly Recommendations + Amazon Affiliate Commerce

> **Feature:** Smart gear recommendations with integrated Amazon affiliate purchasing
> **Scope:** Fishing (bait, flies, tackle, kits) + Hunting (camo, scent, calls, gear)
> **Revenue Model:** Amazon Associates (Creators API) affiliate commissions
> **Created:** 2026-04-04

---

## 1. Executive Summary

Build a **gear recommendation engine** that suggests bait, flies, lures, and tackle (fishing) or camo, scent products, calls, and hunting gear (hunting) based on species, season, water/land type, location, and user catch/harvest history. Integrate **Amazon Associates affiliate links** so users can purchase recommended gear directly, generating commission revenue for the app.

### Three-Tier Approach
1. **Static Knowledge Base** — Curated MD-specific recommendations (ships fast, works offline)
2. **Dynamic Data Layer** — Live hatch charts, water temps, stocking reports, seasonal adjustments
3. **AI-Powered Recommendations** — LLM contextual suggestions using knowledge base + user history

### Three UI Touchpoints
1. **Resources Tab → "Bait & Flies" / "Gear" segment** — Browse by category
2. **AI Chat integration** — Ask "what fly for trout in Gunpowder?" → inline product cards
3. **Standalone GearGuide screen** — Full recommendation wizard with species/season picker

---

## 2. Amazon Associates Integration

### 2.1 Critical: PA-API → Creators API Migration

> **PA-API 5.0 is deprecated April 30, 2026.** All new development MUST use the Creators API.

| Feature | PA-API 5.0 (Legacy) | Creators API (New) |
|---------|---------------------|-------------------|
| Auth | AWS-style HMAC signing | OAuth 2.0 |
| Credentials | AWS Console | Associates Central |
| Field naming | PascalCase | camelCase |
| Status | Deprecated Apr 30, 2026 | Active, recommended |
| Endpoint | webservices.amazon.com | affiliate-program.amazon.com/creatorsapi |

### 2.2 Eligibility Requirements

- **Amazon Associates account** — Free to join, requires active website/app
- **API access threshold:** 10 qualified sales in past 30 days
- **FTC disclosure required** — Must display affiliate disclosure in-app
- **Links must be public** — Cannot be in emails, PDFs, or private messages
- **Purchase happens on Amazon** — Cannot complete purchases in-app; link opens Amazon app/website

### 2.3 Bootstrapping Strategy (Pre-10 Sales)

Before reaching 10 sales, we cannot use the Creators API for programmatic product search. Strategy:

1. **Phase 1 (Pre-API):** Use manually curated affiliate links generated from Associates Central. Build product catalog with static ASINs and affiliate-tagged URLs. This is allowed from day 1.
2. **Phase 2 (Post-10 sales):** Unlock Creators API. Switch to programmatic product search, real-time pricing, dynamic product cards.

### 2.4 Commission Rates (2026)

| Category | Commission |
|----------|-----------|
| Outdoor Recreation | 3% |
| Sports & Outdoors | 3% |
| Fishing Gear (specialty) | 3-4% |
| Clothing & Accessories | 4% |
| Luxury Beauty | 10% |
| Amazon Gift Cards | 0% |
| Typical basket (mixed) | ~3% |

**Revenue projection:** If 1,000 monthly active users click 2 product links/month, with 5% conversion at $45 average order = ~$135/month at 3% commission. Scales linearly with user base.

### 2.5 Technical Architecture

```
┌─────────────────────────────────────────────────┐
│  Mobile App (React Native)                       │
│                                                  │
│  ┌──────────────┐  ┌──────────────────────────┐ │
│  │ GearGuide    │  │ AI Chat                   │ │
│  │ Screen       │  │ (inline product cards)    │ │
│  └──────┬───────┘  └────────────┬─────────────┘ │
│         │                       │                │
│  ┌──────▼───────────────────────▼─────────────┐ │
│  │  GearRecommendationEngine                   │ │
│  │  ├─ Static Knowledge Base (offline)         │ │
│  │  ├─ Dynamic Hatch/Conditions Layer          │ │
│  │  ├─ User Catch History (personalized)       │ │
│  │  └─ AI Enhancement (LLM contextual)         │ │
│  └──────────────────┬─────────────────────────┘ │
│                     │                            │
│  ┌──────────────────▼─────────────────────────┐ │
│  │  AmazonAffiliateService                     │ │
│  │  ├─ Phase 1: Static ASIN catalog + tags     │ │
│  │  ├─ Phase 2: Creators API (OAuth 2.0)       │ │
│  │  ├─ Product card renderer                   │ │
│  │  └─ Affiliate link generator (tag=mdoutdoors-20) │
│  └──────────────────┬─────────────────────────┘ │
│                     │                            │
│         Opens Amazon App / Safari                │
└─────────────────────────────────────────────────┘
```

---

## 3. Recommendation Knowledge Base

### 3.1 Fishing — Bait & Fly Recommendations

#### Data Sources

| Source | URL | Data Type |
|--------|-----|-----------|
| Gunpowder River Hatch Chart | totalflyfishing.com/maryland/gunpowder-river-hatch-chart | Monthly hatch patterns |
| Orvis MD Fishing Reports | fishingreports.orvis.com/northeast/maryland | Weekly conditions + fly suggestions |
| Perfect Fly Store — Gunpowder | perfectflystore.com (Gunpowder Falls page) | Seasonal fly patterns |
| MD DNR Trout Stocking | dnr.geodata.md.gov (TroutStockingActivities) | Live stocking data |
| FishTalk Magazine | fishtalkmag.com | MD-specific tactics |
| Fly Shack Hatch Charts | flyshack.com/HCState.aspx | State-level hatch charts |
| FishingBooker Chesapeake Guide | fishingbooker.com/blog/chesapeake-bay-rockfish | Seasonal rockfish tactics |
| VisitMaryland Lure Guide | fishandhuntmaryland.com (Top 6 Lures article) | Lure/tackle recommendations |

#### Knowledge Base Structure

```typescript
interface BaitRecommendation {
  id: string;
  species: string;            // 'striped_bass', 'brown_trout', 'largemouth_bass', etc.
  waterType: 'tidal' | 'nontidal' | 'both';
  region: string;             // 'chesapeake', 'gunpowder', 'deep_creek', 'coastal_bays', etc.
  months: number[];           // [3, 4, 5] = Mar-May
  method: 'bait' | 'fly' | 'lure' | 'any';

  // Recommendations
  primaryBait: string[];      // ['live menhaden', 'bloodworms', 'cut herring']
  primaryFlies: string[];     // ['Blue-winged Olive #16', 'Sulphur #14', 'Elk Hair Caddis #14']
  primaryLures: string[];     // ['Whopper Plopper', 'BFG umbrella rig', 'jigging spoon']

  // Context
  conditions: string;         // 'Best during falling tide, early morning'
  waterTemp: string;          // '50-60°F optimal'
  confidence: 'high' | 'medium' | 'low';
  source: string;             // 'Gunpowder Hatch Chart', 'Chesapeake Guide', etc.

  // Amazon products to recommend
  amazonProducts: AmazonProductRef[];
}

interface AmazonProductRef {
  asin: string;               // Amazon Standard Identification Number
  title: string;              // 'Blue Winged Olive Dry Fly - Size 16 (12 pack)'
  category: 'fly' | 'bait' | 'lure' | 'tackle' | 'kit' | 'accessory';
  priceRange: string;         // '$8-15'
  affiliateUrl: string;       // Pre-tagged affiliate link
  imageUrl?: string;          // Product thumbnail (from Creators API when available)
}
```

#### Maryland Hatch Chart Data (Gunpowder Falls Reference)

| Month | Primary Hatches | Recommended Flies | Recommended Nymphs |
|-------|----------------|-------------------|-------------------|
| Jan-Feb | Midges, Little Winter Stoneflies | Griffith's Gnat #18-22, Zebra Midge #18 | Midge Larva #20, BH Pheasant Tail #16 |
| Mar | BWO, Little Black Caddis, Blue Quill | BWO #16-18, Elk Hair Caddis #14, Blue Quill #16 | Hare's Ear #14, Caddis Larva #14 |
| Apr | BWO, Grannom Caddis, Little Brown Stonefly | BWO #16, Grannom Caddis #14, Hendrickson #14 | BH Prince Nymph #14, Stonefly Nymph #12 |
| May | Sulphurs, Caddis, March Browns | Sulphur #14-16, Cinnamon Caddis #14, March Brown #12 | Sulphur Nymph #14, Soft Hackle #14 |
| Jun-Jul | Sulphurs, Spotted Sedge, Terrestrials | Sulphur Spinner #16, Spotted Sedge #14, Ant #16 | Caddis Pupa #14, BH Hare's Ear #14 |
| Aug-Sep | Terrestrials, Tricos, Small Caddis | Beetle #14, Hopper #10, Cricket #12, Trico #22 | Inchworm #12, BH Pheasant Tail #16 |
| Oct-Nov | BWO (fall run), Midges | BWO #16-18, Griffith's Gnat #20, Streamer | Woolly Bugger #8, Sculpin #6 |
| Dec | Midges | Zebra Midge #18-22, Griffith's Gnat #20 | San Juan Worm #12, Midge Larva #20 |

#### Chesapeake Bay / Tidal Bait Guide

| Month | Target Species | Live Bait | Cut Bait | Lures |
|-------|---------------|-----------|----------|-------|
| Jan-Mar | Trophy Rockfish | Live eels, spot | Cut menhaden | Parachute jigs, umbrella rigs |
| Apr | Spring Rockfish (C&R) | Bloodworms, peeler crabs | Cut herring | Soft plastics, swim shad |
| May-Jun | Rockfish, White Perch | Live spot, menhaden | Cut bunker | Topwater (Whopper Plopper), BFG rigs |
| Jul-Aug | Bluefish, Flounder, Croaker | Squid strips, bloodworms | Cut spot | Bucktail jigs, spoons |
| Sep-Oct | Fall Rockfish Blitz | Live spot, eels | Cut bunker | Jigging spoons, umbrella rigs, topwater |
| Nov-Dec | Late Fall Rockfish | Live eels | Cut herring | Parachute jigs, heavy spoons |

### 3.2 Hunting — Gear Recommendations

#### Knowledge Base Structure

```typescript
interface HuntingGearRecommendation {
  id: string;
  species: string;            // 'whitetail', 'turkey', 'waterfowl', 'bear', etc.
  season: string;             // 'archery_early', 'firearms', 'muzzleloader', 'late_season'
  months: number[];
  method: 'archery' | 'firearms' | 'muzzleloader' | 'any';

  // Gear categories
  clothing: GearItem[];       // Camo patterns, layers, boots
  scent: GearItem[];          // Scent eliminators, attractants, cover scents
  calls: GearItem[];          // Grunt calls, rattling antlers, turkey calls
  accessories: GearItem[];    // Rangefinders, binoculars, tree stand accessories

  // Context
  conditions: string;         // 'Early season: lightweight, scent-free. Late season: insulated layers.'
  tips: string[];
  amazonProducts: AmazonProductRef[];
}

interface GearItem {
  name: string;
  description: string;
  category: 'camo' | 'scent' | 'call' | 'optics' | 'stand' | 'pack' | 'clothing' | 'boot';
  seasonalRelevance: 'high' | 'medium' | 'low';
  priceRange: string;
}
```

#### Hunting Gear by Season/Species

| Season | Species | Key Gear Categories | Example Products |
|--------|---------|-------------------|-----------------|
| Sep (Early Archery) | Whitetail | Lightweight camo, scent elimination, trail cams | Sitka Subalpine pattern, Ozonics, Moultrie trail cam |
| Oct-Nov (Archery/Firearms) | Whitetail | Mid-weight layers, grunt calls, rattling antlers | Primos Hunting Speak Easy, Wildgame Innovations |
| Nov-Dec (Firearms) | Whitetail | Insulated camo, hand warmers, shooting sticks | Thermacell, Caldwell shooting sticks, heated socks |
| Nov-Dec (Late Muzzleloader) | Whitetail | Heavy insulation, scent cover | Sitka Fanatic jacket, Dead Down Wind spray |
| Apr-May (Spring Turkey) | Turkey | Turkey vest, slate/box calls, decoys | HS Strut, Primos Hunting, Avian-X decoys |
| Oct (Fall Turkey) | Turkey | Lightweight camo, locator calls | Lynch World Champion box call |
| Nov-Jan (Waterfowl) | Ducks/Geese | Waders, layout blinds, duck calls | Drake Waterfowl, Banded, RNT calls |
| Oct (Bear) | Bear | Scent control, tree stands, bear spray | Summit Viper SD, Counter Assault bear spray |

### 3.3 Pre-Built Kits (Curated Amazon Lists)

One of the most powerful features: **curated gear kits** that link to multiple products at once.

#### Fishing Kits

| Kit Name | Contents | Target User | Est. Price |
|----------|----------|-------------|-----------|
| MD Trout Starter Kit | Rod/reel combo, fly box (BWO/Caddis/Sulphur), tippet, leader, nippers | Beginner fly fisher | $120-180 |
| Chesapeake Striper Kit | Medium-heavy rod, umbrella rig, jigging spoons, live bait rig, tackle box | Bay angler | $150-250 |
| Shore Fishing Starter Kit | Spinning combo, bloodworm hooks, sinkers, bobbers, tackle box | Family/beginner | $60-100 |
| Gunpowder Dry Fly Collection | 24-fly assortment (BWO, Sulphur, Caddis, terrestrials) sized for Gunpowder | Experienced fly fisher | $35-50 |
| Kayak Fishing Essentials | Rod holder, tackle crate, anchor, fish finder, PFD | Kayak angler | $200-350 |

#### Hunting Kits

| Kit Name | Contents | Target User | Est. Price |
|----------|----------|-------------|-----------|
| MD Archery Deer Starter | Release, broadheads, rangefinder, scent spray, grunt call | New bowhunter | $150-250 |
| Turkey Hunting Kit | Slate call, box call, decoy, face mask, turkey vest | Spring turkey hunter | $120-200 |
| Waterfowl Essentials | Duck call, lanyard, blind bag, hand warmers, face paint | Duck hunter | $80-150 |
| Late Season Warmth Kit | Base layers, hand warmers, heated insoles, face mask, balaclava | Cold-weather hunter | $100-180 |
| Trail Cam Setup Kit | 2x trail cams, SD cards, mounting straps, lock boxes | Year-round scouter | $150-250 |

---

## 4. Catch/Harvest Log System

### 4.1 Fishing Catch Log

```typescript
interface CatchLogEntry {
  id: string;
  date: string;               // ISO date
  time: string;               // HH:MM

  // Location
  lat: number;
  lng: number;
  locationName: string;       // 'Gunpowder Falls - Masemore Rd'
  waterType: 'tidal' | 'nontidal';
  region: string;

  // Catch details
  species: string;            // 'Brown Trout'
  length?: number;            // inches
  weight?: number;            // pounds
  kept: boolean;              // kept or released
  photoUri?: string;

  // What worked
  method: 'fly' | 'bait' | 'lure';
  baitOrFly: string;          // 'BWO #16 dry fly' or 'live menhaden'
  presentation: string;       // 'dead drift', 'slow retrieve', 'jigging'
  depth?: string;             // 'surface', 'mid-column', 'bottom'

  // Conditions
  waterTemp?: number;         // °F
  airTemp?: number;           // °F
  weather: string;            // 'partly cloudy', 'overcast', 'rain'
  windSpeed?: number;         // mph
  tidePhase?: string;         // 'incoming', 'outgoing', 'slack high', 'slack low'

  // Rating
  rating: 1 | 2 | 3 | 4 | 5; // How good was the fishing?
  notes: string;
}
```

### 4.2 Hunting Harvest Log (Enhancement to existing)

```typescript
interface HarvestLogEntry {
  id: string;
  date: string;
  time: string;

  // Location
  lat: number;
  lng: number;
  locationName: string;       // 'Dan's Mountain WMA'
  landType: string;           // 'WMA', 'Private', etc.

  // Harvest
  species: string;            // 'Whitetail Buck'
  method: 'archery' | 'firearms' | 'muzzleloader';
  weapon: string;             // 'Mathews V3X' or 'Remington 700'
  distance?: number;          // yards
  shotPlacement?: string;     // 'double lung', 'heart', etc.
  photoUri?: string;

  // Measurements
  points?: number;            // antler points (deer)
  weight?: number;            // field-dressed weight
  beardLength?: number;       // turkey

  // Gear used (feeds recommendations)
  camoPattern: string;        // 'Realtree Edge', 'Sitka Subalpine'
  scentProduct?: string;      // 'Ozonics HR-500', 'Dead Down Wind'
  callUsed?: string;          // 'Primos Speak Easy grunt call'
  attractant?: string;        // 'Code Blue doe estrus'

  // Conditions
  temperature: number;
  windDirection: string;
  windSpeed: number;
  weather: string;
  moonPhase?: string;

  rating: 1 | 2 | 3 | 4 | 5;
  notes: string;
}
```

### 4.3 Feedback Loop

Catch/harvest log data feeds back into the recommendation engine:

1. **Personal history:** "Last time you fished Gunpowder in May, you caught 4 browns on Sulphur #14 dry flies"
2. **Community trends:** (Phase 5+) Aggregate anonymous catch data → "BWO #16 is hot on Gunpowder this week"
3. **Gear effectiveness:** Track which products lead to successful outings → surface best performers
4. **Seasonal patterns:** Build personal patterns over years of logging

---

## 5. UI Design

### 5.1 GearGuideScreen (Standalone — New Screen)

```
┌─────────────────────────────┐
│  🎣 Gear Guide              │  ← Header with mode icon
├─────────────────────────────┤
│ What are you targeting?     │
│ ┌───────┐ ┌───────┐ ┌─────┐│
│ │Striped│ │ Trout │ │Bass ││  ← Species chips (scrollable)
│ │ Bass  │ │       │ │     ││
│ └───────┘ └───────┘ └─────┘│
│ ┌───────┐ ┌───────┐        │
│ │Catfish│ │Panfish│        │
│ └───────┘ └───────┘        │
├─────────────────────────────┤
│ Where?          📍 Near me  │
│ ┌──────────┐ ┌────────────┐│
│ │Chesapeake│ │ Gunpowder  ││  ← Region chips
│ └──────────┘ └────────────┘│
├─────────────────────────────┤
│ Method                      │
│ ┌────┐ ┌──────┐ ┌────────┐│
│ │Fly │ │ Bait │ │ Lure   ││
│ └────┘ └──────┘ └────────┘│
├─────────────────────────────┤
│                             │
│  ✨ Get Recommendations     │  ← Primary CTA
│                             │
├─────────────────────────────┤
│                             │
│  🔥 Curated Kits            │
│  ┌─────────────────────────┐│
│  │ 🐟 Chesapeake Striper  ││
│  │ Kit — $150-250          ││  ← Scrollable kit cards
│  │ [View on Amazon →]      ││
│  └─────────────────────────┘│
│  ┌─────────────────────────┐│
│  │ 🪰 Gunpowder Dry Fly   ││
│  │ Collection — $35-50     ││
│  │ [View on Amazon →]      ││
│  └─────────────────────────┘│
│                             │
└─────────────────────────────┘
```

#### Recommendation Results View

```
┌─────────────────────────────┐
│ ← Results: Striped Bass     │
│   Chesapeake · Bait · April │
├─────────────────────────────┤
│                             │
│ 🎯 Top Recommendations     │
│                             │
│ ┌─────────────────────────┐ │
│ │ 🐟 Live Menhaden        │ │
│ │ The #1 bait for spring  │ │
│ │ rockfish in the Bay.    │ │
│ │ ⭐ High confidence       │ │
│ │ 📊 Source: Chesapeake    │ │
│ │    Fishing Guide         │ │
│ └─────────────────────────┘ │
│                             │
│ 🛒 Recommended Gear        │
│ ┌────┬────────────────────┐ │
│ │ 📷 │ Circle Hooks 7/0   │ │
│ │    │ Gamakatsu (50 pk)  │ │
│ │    │ ⭐⭐⭐⭐⭐ $12.99     │ │
│ │    │ [Buy on Amazon →]  │ │
│ └────┴────────────────────┘ │
│ ┌────┬────────────────────┐ │
│ │ 📷 │ Fish Finder Rig    │ │
│ │    │ Pre-tied leaders    │ │
│ │    │ ⭐⭐⭐⭐ $8.99       │ │
│ │    │ [Buy on Amazon →]  │ │
│ └────┴────────────────────┘ │
│                             │
│ 💡 Pro Tip                  │
│ "Fish the outgoing tide     │
│ near channel edges. Last    │
│ time you were here (3/15),  │
│ you caught 2 on live spot." │
│                             │
│ ── From Your Catch Log ──   │
│                             │
└─────────────────────────────┘
```

### 5.2 Resources Tab — "Bait & Flies" Segment

Add a 4th segment to the ResourcesHubScreen segmented control:

```
[ Regulations | Bait & Flies | Links & Guides | Out of State ]
```

This segment shows a simplified version of GearGuideScreen:
- Current month's hatch chart (fly fishing)
- Current month's bait recommendations (bait fishing)
- Quick links to curated kits
- "See full Gear Guide →" link to standalone screen

### 5.3 AI Chat — Inline Product Cards

When users ask gear questions in Chat, the AI responds with:
1. Text recommendation with reasoning
2. Inline product cards (compact: thumbnail + title + price + buy link)
3. "See more in Gear Guide →" link

Example AI response:
> For trout on Gunpowder Falls in April, Blue-winged Olives are hatching heavily. I'd recommend a BWO dry fly in size 16-18 for surface action, with a Hare's Ear nymph #14 dropper.
>
> [Product Card: Blue Winged Olive Dry Flies 12-pack — $11.99 → Amazon]
> [Product Card: BH Hare's Ear Nymph 12-pack — $9.99 → Amazon]

---

## 6. File Structure

### New Files

```
src/
├── data/
│   ├── fishingBaitKnowledge.ts       # Static bait/fly/lure recommendations
│   ├── huntingGearKnowledge.ts       # Static hunting gear recommendations
│   ├── amazonProductCatalog.ts       # Curated ASIN list + affiliate URLs
│   └── gearKits.ts                   # Pre-built kit definitions
│
├── services/
│   ├── amazonAffiliateService.ts     # Affiliate link generator + Creators API client
│   └── catchLogService.ts           # Catch/harvest log CRUD (AsyncStorage → WatermelonDB)
│
├── screens/
│   ├── GearGuideScreen.tsx           # Standalone recommendation wizard
│   ├── CatchLogScreen.tsx            # Fishing catch log (list + add entry)
│   └── HarvestLogScreen.tsx          # (EXISTS — enhance with gear tracking fields)
│
├── components/
│   ├── gear/
│   │   ├── ProductCard.tsx           # Amazon product card with buy button
│   │   ├── KitCard.tsx               # Curated kit display card
│   │   ├── RecommendationCard.tsx    # Bait/fly recommendation with context
│   │   ├── HatchChart.tsx            # Monthly hatch chart visualization
│   │   └── GearWizard.tsx            # Species → Region → Method picker
│   └── fishing/
│       └── CatchLogEntry.tsx         # Individual catch log form/display
│
├── context/
│   └── CatchLogContext.tsx           # Catch log state management
│
├── types/
│   ├── gear.ts                       # GearRecommendation, AmazonProduct, Kit types
│   └── catchlog.ts                   # CatchLogEntry, HarvestLogEntry types
│
└── config/
    └── activityModeConfig.ts         # (UPDATE — add gear categories per mode)
```

### Modified Files

```
src/screens/ResourcesHubScreen.tsx    # Add "Bait & Flies" / "Gear" segment
src/screens/ChatScreen.tsx            # Inline product card rendering
src/data/fishingChatKnowledge.ts      # Add gear recommendation intents
src/data/chat-knowledge-base.json     # Add hunting gear knowledge
src/navigation/AppNavigator.tsx       # Add GearGuide + CatchLog to stacks
src/config/activityModeConfig.ts      # Add gear config per mode
```

---

## 7. Sprint Plan

### Sprint G-A: Knowledge Base + Types (2-3 days)

**Goal:** Build the static recommendation engine data layer.

| Task | File | Description |
|------|------|-------------|
| G-A.1 | `types/gear.ts` | Define BaitRecommendation, HuntingGearRecommendation, AmazonProductRef, GearKit interfaces |
| G-A.2 | `types/catchlog.ts` | Define CatchLogEntry, HarvestLogEntry interfaces |
| G-A.3 | `data/fishingBaitKnowledge.ts` | Populate full MD bait/fly/lure knowledge base (Gunpowder hatch chart, Chesapeake bait guide, Deep Creek, Patuxent, coastal bays) |
| G-A.4 | `data/huntingGearKnowledge.ts` | Populate hunting gear recommendations by species/season/method |
| G-A.5 | `data/gearKits.ts` | Define 10+ curated kits (5 fishing, 5 hunting) with descriptions and target users |
| G-A.6 | `data/amazonProductCatalog.ts` | Curate initial ASIN catalog (50-100 products) with manually tagged affiliate URLs |

### Sprint G-B: Amazon Affiliate Service (2 days)

**Goal:** Build the affiliate link infrastructure.

| Task | File | Description |
|------|------|-------------|
| G-B.1 | `services/amazonAffiliateService.ts` | Affiliate link generator with Associate tag injection |
| G-B.2 | - | Sign up for Amazon Associates, get Associate ID (tag) |
| G-B.3 | `services/amazonAffiliateService.ts` | Add Creators API client (OAuth 2.0 flow) — initially stubbed, activates at 10 sales |
| G-B.4 | `services/amazonAffiliateService.ts` | Product search, price lookup, image fetch (Creators API) |
| G-B.5 | FTC compliance | Add affiliate disclosure to app (Settings, product cards, footer) |

### Sprint G-C: UI Components (2-3 days)

**Goal:** Build reusable gear display components.

| Task | File | Description |
|------|------|-------------|
| G-C.1 | `components/gear/ProductCard.tsx` | Amazon product card (image, title, price, rating, buy button) |
| G-C.2 | `components/gear/KitCard.tsx` | Curated kit card (hero image, name, price range, item count, buy all) |
| G-C.3 | `components/gear/RecommendationCard.tsx` | Bait/fly recommendation with confidence, source, conditions |
| G-C.4 | `components/gear/HatchChart.tsx` | Monthly hatch chart — visual timeline of hatches by month |
| G-C.5 | `components/gear/GearWizard.tsx` | Species → Region → Method step picker |

### Sprint G-D: GearGuide Screen + Resources Integration (2-3 days)

**Goal:** Build the standalone GearGuide and integrate into Resources tab.

| Task | File | Description |
|------|------|-------------|
| G-D.1 | `screens/GearGuideScreen.tsx` | Full recommendation wizard: pick species/region/method → results with product cards |
| G-D.2 | `screens/ResourcesHubScreen.tsx` | Add "Bait & Flies" segment (fish mode) / "Gear" segment (hunt mode) |
| G-D.3 | `navigation/AppNavigator.tsx` | Add GearGuide to ResourcesStack and FishResourcesStack |
| G-D.4 | AI integration | Update ChatScreen to render inline ProductCards for gear queries |
| G-D.5 | Update `fishingChatKnowledge.ts` | Add bait/fly/gear recommendation intent handlers |
| G-D.6 | Update `chat-knowledge-base.json` | Add hunting gear knowledge entries |

### Sprint G-E: Catch/Harvest Log (2-3 days)

**Goal:** Build the catch logging system that feeds recommendations.

| Task | File | Description |
|------|------|-------------|
| G-E.1 | `context/CatchLogContext.tsx` | Catch log state management (AsyncStorage-backed) |
| G-E.2 | `services/catchLogService.ts` | CRUD operations, analytics queries, personal patterns |
| G-E.3 | `screens/CatchLogScreen.tsx` | Fishing catch log — list view + add entry form |
| G-E.4 | `screens/HarvestLogScreen.tsx` | Enhance existing — add gear tracking fields (camo, scent, call, attractant) |
| G-E.5 | `components/fishing/CatchLogEntry.tsx` | Individual entry form with species, bait, conditions, photo |
| G-E.6 | Integration | Connect catch history to GearGuide for personalized recommendations |

### Sprint G-F: QC + Polish (1-2 days)

| Task | Description |
|------|-------------|
| G-F.1 | TypeScript 0 errors (`npx tsc --noEmit`) |
| G-F.2 | FTC affiliate disclosure review |
| G-F.3 | Offline mode testing — all recommendations work without network |
| G-F.4 | Product card tap → opens Amazon app / Safari correctly |
| G-F.5 | Catch log persistence across app launches |
| G-F.6 | Update CLAUDE.md, ARCHITECTURE.md with gear commerce documentation |

---

## 8. Monetization Strategy

### Phase 1: Affiliate Links (Immediate)

- **Revenue:** 3% average commission on outdoor gear
- **Approach:** Curated product catalog with static affiliate-tagged URLs
- **No API required** — just Associate ID and manually built links
- **FTC disclosure required** in-app

### Phase 2: Creators API Integration (After 10 Sales)

- **Revenue:** Same commission rates, but dynamic product data
- **Approach:** Programmatic product search, real-time pricing
- **Benefit:** Always-current products, price comparisons, trending items

### Phase 3: Sponsored Listings (Future)

- **Revenue:** Local fly shops / bait shops pay for featured placement
- **Approach:** "Sponsored" badge on partner products in recommendations
- **Example:** Backwater Angler (Monkton, MD) pays for featured placement in Gunpowder recommendations
- **Higher margins** than Amazon affiliate (negotiate 10-20% referral fee)

### Phase 4: Premium Gear Guide (Future)

- **Revenue:** Premium subscription feature
- **Approach:** Basic recommendations free, advanced AI-powered + personal catch history analysis = premium
- **Tie-in:** Premium users get detailed hatch chart data, water temp overlays, personalized seasonal patterns

---

## 9. Legal & Compliance

### Amazon Associates Requirements
- Display FTC affiliate disclosure: "As an Amazon Associate, MDHuntFishOutdoors earns from qualifying purchases"
- Disclosure must appear near product links (footer of ProductCard component)
- Cannot guarantee prices (prices may change between display and purchase)
- Cannot use Amazon trademarks in app name or icon
- Must include "Pricing and availability subject to change" near product displays

### App Store Guidelines
- Apple allows affiliate links in apps
- Must not mislead users about in-app purchases vs external purchases
- Product purchases happen externally (Amazon website/app), not in-app

---

## 10. Data Expansion Roadmap

### Fishing Data Expansion
1. **Gunpowder Falls** (complete hatch chart) ← Sprint G-A
2. **Chesapeake Bay tidal** (seasonal bait guide) ← Sprint G-A
3. **Deep Creek Lake** (bass/trout/walleye patterns)
4. **Patuxent River** (mixed tidal/nontidal)
5. **Coastal Bays** (saltwater: flounder, drum, croaker)
6. **Susquehanna Flats** (spring shad/herring run)

### Hunting Data Expansion
1. **Whitetail Deer** (all seasons, full gear matrix) ← Sprint G-A
2. **Spring Turkey** (calls, decoys, camo)
3. **Waterfowl** (waders, blinds, calls, decoys)
4. **Bear** (specialized gear, safety equipment)
5. **Small Game** (upland, rabbit, squirrel)

---

## 11. Success Metrics

| Metric | Target (6 months) | Measurement |
|--------|-------------------|-------------|
| Gear Guide screen visits | 500/month | Analytics |
| Product link taps | 200/month | Amazon Associate dashboard |
| Affiliate conversion rate | 5%+ | Amazon Associate dashboard |
| Monthly affiliate revenue | $50-150 | Amazon Associate dashboard |
| Catch log entries created | 100/month | AsyncStorage analytics |
| AI gear queries answered | 300/month | Chat analytics |

---

*Last Updated: 2026-04-04*
*Author: MDHuntFishOutdoors Development Team*
