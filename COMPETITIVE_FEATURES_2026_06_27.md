# Competitive Feature Analysis — onX Hunt · HuntStand · TroutRoutes · AllTrails

Research 2026-06-27. Goal: identify which competitor features to build on our own
Mapbox stack (feature parity, NOT data integration — OnX data integration stays ruled out).
Pairs with the offline/first-run findings in AUDIT_2026_06_27.md.

## The pattern across all four apps

Every one of these apps gates the SAME two things behind their paywall, and they are the
two features users praise most:
1. **Bulletproof offline maps** — tiles + layers cached, persist with no signal.
2. **Map DATA the user can't get elsewhere** — parcel/landowner boundaries (onX/HuntStand),
   trout-stream classification + public-access/easements (TroutRoutes), curated trail
   catalog + live conditions (AllTrails).

Our monetization is gear-affiliate only (no subscription), so we can give all of this away
free — that's the wedge. But **our offline maps are currently broken** (see audit), so the
first competitive move is also a bug fix.

## Gap analysis (have / partial / missing)

| Feature | onX | HuntStand | TroutRoutes | AllTrails | Us today | MD effort |
|---|:--:|:--:|:--:|:--:|---|---|
| Offline map tiles wired into every map | ✅ | ✅ | ✅ | ✅ | ⚠️ exists but undiscoverable/Hunt-only | **M** (wiring) |
| Property/parcel boundaries + landowner | ✅ | ✅ | — | — | ❌ | **L** (MD iMap parcels) |
| Public/private land + legal access points | ✅ | ✅ | ✅ | — | ⚠️ public lands yes, access pins partial | **M** |
| Waypoints (icons/notes/photos) | ✅ | ✅ | ✅ | ✅ | ✅ Scout/AnnotationLayer | done |
| GPS track recording + stats | ✅ | ✅ | ✅ | ✅ | ✅ TrackRecorder/TrackMeBar | done |
| Measure distance/area | ✅ | ✅ | ✅ (River Miles) | ✅ | ✅ MeasureTool | done |
| Scent-cone wind forecast per stand (72hr) | ✅ | ✅ | — | — | ⚠️ wind pill + cone widget | **M** |
| Multi-day game/rut activity forecast | ✅ Elite | ✅ Ultimate | — | — | ❌ | **M** |
| 3D / LiDAR / slope-aspect terrain | ✅ | ✅ | ✅ 3D | ✅ 3D | ⚠️ 3D terrain planned | **M** |
| Live USGS stream gauges (flow/temp) | — | — | ✅ | — | ❌ | **S** (free NWIS API) |
| Stream classification coloring | — | — | ✅ | — | ❌ | **M** (MD curation) |
| Fishing easements / access overlay | — | — | ✅ | — | ❌ | **M** (MD curation) |
| Crowd trail-condition tags + recent reviews | — | — | — | ✅ | ❌ | **M** (needs backend) |
| Community photos on trails/spots | — | — | — | ✅ | ⚠️ Deer Camp photo pins only | **M** |
| Wrong-turn / off-route alerts | — | — | — | ✅ | ❌ | **S–M** |
| Live-Share safety location | ✅ LiveMap | ✅ Friend Locator | — | ✅ Lifeline | ❌ | **M** (backend) |
| Group/club shared maps | ✅ | ✅ | — | — | ✅ Deer Camp / Group Camp | done |
| Trail-cam photo management + AI tag | ✅ | ✅ | — | — | ❌ | **L** |
| Stand reservations (clubs) | — | ✅ | — | — | ❌ | **M** |
| Harvest / catch / sightings log | — | ✅ | ✅ notes | — | ✅ Harvest/CatchLog/Journal | done* |
| Activity filters (difficulty/length/dog…) | — | — | — | ✅ | ⚠️ partial | **S** |
| AI assistant | ❌ | ❌ | ❌ | ✅ Peak | ✅ per-mode chat | **our edge** |
| Curated MD regulations/seasons | ❌ (punts) | ⚠️ | ⚠️ | — | ✅ | **our edge** |

\* CatchLog screen exists but its provider isn't mounted (latent crash — fix before exposing).

## Where we already win (lean into these)
- **Free + offline-first** vs onX ($100/yr Elite, state-locked) and AllTrails Peak ($80/yr).
- **AI chat assistant per mode** — none of the four hunting/fishing apps have this.
- **Curated MD regulations/seasons** — onX/TroutRoutes punt to eRegulations.
- **Multi-activity in one app** (hunt/fish/camp/hike) — competitors are single-purpose.
- **Community forums** — TroutRoutes explicitly refuses to build social; we have it.

## Recommended build order (highest ROI first)
1. ✅ **DONE 2026-06-27 — Real offline maps, wired into every map screen.** Added an offline
   button to all 5 map screens (Hunt/Scout/Fish/Camp/Hike) opening a shared download sheet
   (`components/map/OfflineMapsModal`), backed by `hooks/useOfflineMaps`. Button turns red "!"
   when offline with no cached tiles. ALSO fixed the silent bug that made offline useless:
   packs downloaded outdoors-v11 while Hunt/Scout rendered outdoors-v12 — standardized every
   screen + the downloader to `constants/mapStyles` (v12). Guard test in offlineMaps.test.ts.
   Remaining polish: per-viewport "download what I'm looking at" (needs MapView refs) and a
   satellite-style pack (packs currently cover the Outdoors style only).
2. **MD parcel boundaries + landowner info** — the flagship differentiator that sells onX/
   HuntStand; MD iMap publishes parcel GIS. Big "wow," MD-tractable, free for us. (L)
3. **Fishing intelligence: live USGS gauges + stream classification + access/easements** —
   TroutRoutes parity for our fish module; USGS NWIS API is free and easy. (S→M)
4. **Per-stand scent-cone wind forecast (72hr)** — extend the wind widget we already have to a
   forward-projected per-marker cone; HuntStand's signature. (M)
5. **Live-Share safety location** + **wrong-turn alerts** — cross-activity safety (AllTrails). (M)
6. **Crowd condition reports + community photos** on trails/spots (AllTrails). (M, needs backend)
7. Later/L: trail-cam management, game/rut multi-day forecast, stand reservations, LiDAR layer.

## Data-licensing note
Parcel/landowner and stream-classification data are the licensing-sensitive pieces. MD iMap
(data.imap.maryland.gov) publishes statewide parcel boundaries; confirm the use license before
shipping. USGS NWIS (gauges) is public-domain. Trail/condition crowdsourcing is our own data.
