# MDHuntFishOutdoors

[![App Store](https://img.shields.io/badge/App%20Store-6761347484-blue.svg)](https://apps.apple.com)
[![React Native](https://img.shields.io/badge/React%20Native-0.76.6-61dafb.svg)](https://reactnative.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.5-3178c6.svg)](https://www.typescriptlang.org)
[![iOS](https://img.shields.io/badge/iOS-12%2B-000.svg)](https://www.apple.com/ios)
[![License](https://img.shields.io/badge/License-Proprietary-red.svg)](#license)

Your free, offline-first guide to Maryland's outdoor recreation. Consolidate hunting regulations, fishing seasons, public lands, and community knowledge into a single app.

## About

MDHuntFishOutdoors is **not** a replacement for OnX Maps. Instead, it consolidates the disparate Maryland Department of Natural Resources (DNR) information—regulations, seasons, bag limits, public land data, and more—into one free, open-source iOS app. No more hunting across multiple state websites.

Starting with **hunting**, the app is designed to expand to fishing, crabbing, boating, and hiking. The app emphasizes community knowledge sharing, local access information, and real-time collaboration through shared maps and forums.

**Launched:** March 2026 | **Target Platform:** iPhone 12+ | **Region:** Maryland (expanding to VA, PA, and beyond)

---

## Current Status

| Milestone | Status |
|-----------|--------|
| **V1 MVP (Hunting)** | Shipped to App Store Connect (Build 3, v1.0.0) |
| **V2 (Scout + Deer Camp)** | Code complete, pending App Review |
| **Phase 3** | Planned: 3D terrain, backend sync, multi-state expansion |
| **Phase 4** | Planned: Fishing module |

---

## Features

### Core Map & Navigation
- **Interactive Mapbox map** with 192 public hunting lands + 14 shooting ranges
- **124 polygon boundaries** sourced from Maryland iMap GIS
- **68 center-point markers** for quick identification at all zoom levels
- **9 land type filters:** WMA, CWMA, CFL, State Forest, State Park, NRMA, NEA, FMA, Shooting Range
- **5 species filters:** Deer, Turkey, Waterfowl, Bear, Small Game
- **3 weapon filters:** Archery, Firearms, Muzzleloader
- **3 access filters:** Sunday Hunting, No Reservation Required, ADA Accessible
- **AND logic filtering** — show lands matching all active criteria

### Hunting Module (V1)
- Comprehensive Maryland hunting regulations with seasons and bag limits
- Offline-first regulations database (eRegulations.com integration)
- Regulations feedback system for reporting errors or outdated information
- AI chat with Maryland-specific hunting knowledge base
- Interactive resource hub with links, guides, and contact information

### Scout Tab (V2 New)
- **Full Mapbox map** with the same layer filters as Map tab
- **Hunt plan creation wizard:** Name → Parking Location → Annotate → Save
- **Annotation tools:** Waypoints, routes, areas, GPS tracks
- **Compass overlay** with animated cardinal directions and heading readout
- **Track me bar:** Real-time GPS recording with distance, time, speed, elevation metrics
- **Measure tool:** Tap points to measure distance and bearing between segments
- **Plan sidebar** with visibility toggles and export to Deer Camp
- **Plan export:** Save plans as GeoJSON for backup or sharing

### Deer Camp Tab (V2 New)
- **Collaborative group maps** for hunting parties and clubs
- **Camp list view** with member roster cards
- **Camp map view** rendering all 5 annotation types color-coded per member
- **Member management:** Role badges, annotation counts, admin controls
- **Activity feed:** Last 30 actions with timestamps and member color indicators
- **Photo uploads** with automatic geotagging at current GPS location
- **Import/Export:** Add Scout plans and tracks to Deer Camp collaboratively
- **Local-first MVP** (V2); real-time backend sync planned for V3

### UI & User Experience
- **Activity mode switching:** Hunt, Fish, Hike, Crab, Boat (header dropdown)
- **Dark theme** with Maryland flag colors (gold, black, red)
- **Persistent disclaimer footer** reminding users to verify all info with MD DNR
- **Animated splash screen** with Ken Burns zoom effect over 4 bundled photos
- **Custom app icon** (sunset + Maryland outline + wildlife)
- **Responsive bottom tab navigation** with 5 primary tabs

### Accessibility & Performance
- **Offline-first architecture** with AsyncStorage for local persistence
- **iPhone-12+ optimized** for modern hardware
- **Mapbox offline tile packs** for maps without internet
- **TypeScript 0 errors** — strict type safety
- **Minimal dependencies** — clean, maintainable codebase

---

## Tech Stack

| Layer | Technology | Version |
|-------|-----------|---------|
| **Framework** | React Native | 0.76.6 |
| **Language** | TypeScript | 5.5 |
| **UI Library** | React | 18.3.1 |
| **Maps** | Mapbox GL Native | 10.1.35 |
| **Navigation** | React Navigation | 7.0 |
| **Storage** | AsyncStorage | 1.x |
| **HTTP** | Axios | 1.x |
| **Icons** | react-native-vector-icons | 10.x |
| **Build Tool** | Metro | (integrated) |
| **IDE** | Xcode | 15+ |

**Future:** WatermelonDB (SQLite) for offline-first sync, PostGIS + pgvector for server-side GIS and RAG.

---

## Project Structure

```
mobile/src/
├── screens/
│   ├── MapScreen.tsx              # Interactive hunting lands map
│   ├── ScoutScreen.tsx            # NEW: Hunt planning with GPS tools
│   ├── AIScreen.tsx               # Chat with hunting knowledge base
│   ├── DeerCampScreen.tsx         # NEW: Collaborative group maps
│   ├── ResourcesHubScreen.tsx     # Regs, links, guides
│   ├── ChatScreen.tsx             # Legacy social chat
│   ├── CommunityScreen.tsx        # User profiles, forums
│   ├── OnboardingScreen.tsx       # Disclaimer + setup
│   └── [10 more screens]
│
├── components/
│   ├── map/                       # MapScreen components
│   ├── chat/                      # AI chat UI
│   ├── scout/                     # NEW Scout tab
│   │   ├── PlanSidebar.tsx
│   │   ├── PlanCreationFlow.tsx
│   │   ├── AnnotationLayer.tsx
│   │   ├── CompassOverlay.tsx
│   │   ├── TrackMeBar.tsx
│   │   └── MeasureTool.tsx
│   ├── deercamp/                  # NEW Deer Camp tab
│   ├── common/                    # Reusable UI (buttons, headers)
│   ├── splash/                    # Animated splash screen
│   └── navigation/                # Tab & stack navigators
│
├── context/
│   ├── ActivityModeContext.tsx    # Hunt/Fish/Hike/Crab/Boat mode
│   ├── ScoutDataContext.tsx       # Plans + tracks (AsyncStorage)
│   └── DeerCampContext.tsx        # Camps + members + annotations
│
├── services/
│   ├── api/                       # Axios + FastAPI endpoints
│   ├── location/                  # GPS & geolocation
│   └── weather/                   # Weather service (future)
│
├── data/
│   ├── chatKnowledge/             # MD hunting knowledge base
│   ├── maryland_lands_v2.json     # 192 lands + 14 ranges
│   ├── regulations.json           # Seasons, bag limits
│   └── [state data packs]
│
├── hooks/
│   ├── useLocation.ts             # GPS tracking
│   ├── useNetworkStatus.ts        # Offline detection
│   └── [custom hooks]
│
├── types/
│   ├── scout.ts                   # Plan, Track, Annotation types
│   └── deercamp.ts                # Camp, Member, SharedAnnotation types
│
├── theme/
│   ├── colors.ts                  # MD flag colors, dark theme
│   └── design.ts                  # Typography, spacing
│
├── navigation/
│   └── AppNavigator.tsx           # Bottom tabs + native stack
│
└── models/
    └── (WatermelonDB schema — future)
```

---

## Data Coverage

### Hunting Lands
- **192 public hunting lands** across Maryland
- **14 shooting ranges** (clay, rifle, archery)
- **124 polygon boundaries** from Maryland iMap GIS (4-source merge)
- **68 center-point markers** for quick map identification

### Data Enrichment
| Metric | Count | Coverage |
|--------|-------|----------|
| Detail-enriched | 72 lands | 37.5% |
| Parking locations | 67 lands | 34.9% |
| Contact info | 70 lands | 36.5% |
| Website URLs | 135 | 70.3% |
| PDF map links | 64 | 33.3% |
| Access notes | 72 lands | 37.5% |

### Data Sources
1. **Maryland iMap GIS** (299 features → 124 polygons)
2. **DNR detail page scrapes** (77 lands via WebFetch)
3. **DNR regional pages** (75 lands with URLs + PDF maps)
4. **eRegulations.com** (192 lands + 14 ranges inventory)

---

## Getting Started

### Prerequisites
- **macOS 12+** with Xcode 15+
- **Node.js 18+** and npm
- **CocoaPods**
- **Mapbox access token** (free tier sufficient for dev)

### Installation

```bash
# Clone the repository
git clone https://github.com/davidstonko/huntmaryland.git
cd huntmaryland

# Install Node dependencies
cd mobile
npm install

# Install iOS pods
cd ios
pod install
cd ../..

# Set Mapbox token (add to ios/Podfile or xcode build settings)
# export MAPBOX_PUBLIC_TOKEN=your_token_here

# Run on simulator
npx react-native run-ios

# Or open Xcode and build directly
open ios/HuntMaryland.xcworkspace
```

### Build Configuration
- **Bundle ID:** `com.davidstonko.huntmaryland` (registered with Apple)
- **Display Name:** MDHuntFishOutdoors
- **Minimum iOS:** 12.0
- **Target devices:** iPhone only (iPad support planned)
- **Build system:** Hermes (legacy: JavaScriptCore)

---

## Development Phases

### V1 — Hunting MVP (Shipped 2026-03-30)
- Map with 192 hunting lands + 14 ranges
- Regulations viewer with MD seasons & bag limits
- AI chat with hunting knowledge base
- Social features: user profiles, forum, community reports
- Resources hub with links and guides
- Animated splash screen

### V2 — Scout & Deer Camp (Code Complete, Pending Review)
- **Scout tab:** Hunt planning with GPS tools, annotations, measure tool
- **Deer Camp tab:** Collaborative group maps with member color-coding
- Branding update to MDHuntFishOutdoors
- TypeScript 0 errors, production-ready codebase

### Phase 3 — Terrain & Multi-State (Weeks 15–22)
- 3D terrain rendering (Mapbox 3D)
- Backend sync for Deer Camp (real-time collaboration)
- Forum marketplace for gear trading and land access
- Multi-state expansion: Virginia, Pennsylvania
- MATLAB analytics integration

### Phase 4 — Fishing Module (Weeks 23–30)
- MD fishing regulations & stocking reports
- Boat ramps, fishing spot database
- Tidal charts for saltwater fishing
- Fish species guides

### Phase 5 — Additional Modules (Weeks 31+)
- Crabbing: season info, gear, locations
- Boating: launch sites, safety regulations
- Hiking: trail database, difficulty ratings

### Phase 6 — Monetization (Post-Launch)
- In-app banner ads
- Premium features (advanced analytics, group management)
- Sponsored content from gear retailers

---

## Regulations & Data Management

### Feedback System
- **Floating "Report" FAB** on RegulationsScreen
- Three feedback types: Error/Bug, Outdated, Suggestion
- **V2:** Logs locally
- **V3+:** Sends to backend for crowdsourced corrections

### State Data Packs
- Modular architecture supports any US state
- Each state includes: regulations, GIS data, terrain, harvest data
- Maryland ships as built-in pack; other states download on demand

### Maryland Data Sources
- **Regulations:** eRegulations.com/maryland, MD DNR Hunter's Guide, Hunting Seasons Calendar PDF
- **GIS/Lands:** Maryland iMap, MD DNR WMA maps, USFWS Open Data
- **Parcels:** County assessor records via Maryland iMap
- **Harvest:** MD DNR annual reports

---

## Architecture Highlights

### Offline-First Design
- **WatermelonDB (SQLite)** on device for fast queries and sync
- **AsyncStorage** for user preferences and plan metadata
- **Mapbox offline tile packs** for maps without internet
- All regulations, land data, and guides bundled with app

### Mapbox Integration
- **GL Native (@rnmapbox/maps 10.1.35)** for best iOS performance
- **Data-driven styling** using `['get', 'color']` expressions
- **Dual-layer markers:** white circle + colored border for visibility
- **Zoom-dependent labels:** Text appears at zoom 10+, size 10pt
- **9 land type + 5 species + 3 weapon + 3 access filters** with AND logic

### Activity Mode System
- Global **ActivityModeContext** for Hunt/Fish/Hike/Crab/Boat switching
- Mode-specific regulations, land types, and UI labels
- Consistent data model across all activities

### Real-Time Collaboration (V3+)
- Deer Camp backend sync with PostgreSQL + PostGIS
- Member presence, live annotations, activity feed
- Offline queue for changes made without internet

---

## Testing & Quality

- **TypeScript strict mode** — 0 errors after each sprint
- **React Navigation dev tools** for deep link debugging
- **Mapbox GL Native** stability tested on iPhone 12/13/14/15
- **AsyncStorage** persistence verified across app relaunches
- **Dark theme** rendering tested on OLED displays

---

## Known Limitations

- **OnX integration:** Deferred indefinitely (OnX has no public API; DMCA takedowns against scrapers)
- **iPad support:** iPhone-only for V1–V2 (planned for Phase 3)
- **Backend sync:** Deer Camp local-first for V2; real-time sync in V3
- **Photo uploads:** Full image upload deferred to V3 (V2: caption + geotag only)
- **Multi-language:** English only for Maryland launch (i18n planned for expansion states)

---

## Contributing

This is a proprietary project. For issues, feature requests, or data corrections, please contact the development team directly.

---

## Support & Resources

- **Website:** https://davidstonko.github.io/huntmaryland-site/
- **Privacy Policy:** https://davidstonko.github.io/huntmaryland-site/privacy.html
- **App Store:** [MDHuntFishOutdoors](https://apps.apple.com) (Apple ID: 6761347484)
- **MD DNR Official:** https://dnr.maryland.gov/huntersguide

---

## License

**Proprietary** — All rights reserved. Unauthorized copying, distribution, or modification is strictly prohibited.

---

## Changelog

### V2 (2026-03-30 — Current)
- Added Scout tab with plan wizard, GPS tracking, compass, measure tool
- Added Deer Camp tab with group map collaboration
- Rebranded to MDHuntFishOutdoors
- TypeScript refactored to 0 errors
- Resources hub redesigned with segmented control (Regulations | Links & Guides)
- Animated splash screen with Ken Burns effect

### V1 (2026-03-30 — Shipped)
- Hunting MVP with 5 core tabs: Map, Chat, Regulations, Social, Resources
- 192 hunting lands + 14 ranges on interactive map
- AI chat with Maryland hunting knowledge
- User profiles and community forum (beta)
- Offline-first regulations database

---

**Built with care for Maryland's outdoor enthusiasts.**
