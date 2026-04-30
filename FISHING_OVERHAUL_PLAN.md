# Fishing Module — Overhaul Plan

Started 2026-04-26. Authoritative roadmap for the multi-pass fishing-data
expansion David asked for ("massive fishing-spot data expansion — Loch Raven
Reservoir, Chesapeake Bay, etc.").

## Why we needed this

Before today, fish-mode had 737 DNR access points — that's "where to launch
or wade in". But it didn't tell anglers **where to actually drop a line
within a waterbody**. Loch Raven's most productive crappie water is the
Dulaney Valley Bridge pilings — that's nowhere in the access dataset.
The Hill, Stone Rock, Hooper Strait — charted Bay structure that every
striper fisherman knows — wasn't in the app.

The fishing experience read as "here's a parking lot near water" instead
of "here's where the fish are." This plan closes that gap.

## Provenance discipline

Per the `fabrication_pattern_2026_04_18` memory, Phase 5 agents got caught
inventing data with false source attribution. The fix is a strict
`sourceTier` field on every spot:

| Tier | Meaning | Example |
|---|---|---|
| `dnr-publication` | DNR fishing report, creel survey, Angler's Log | Loch Raven crappie report |
| `dnr-regulation` | Officially-named DNR-regulated stretch | Big Hunting Creek C&R |
| `noaa-chart` | Named feature on a public NOAA chart | Stone Rock (Chart 12270) |
| `community` | User-contributed (gated, deferred to V3+) | — |

Every entry must cite a verifiable public source in the `source` field.
**No hand-placed coordinates from training knowledge alone.** If we can't
defend a coordinate from a public document or chart, it doesn't ship.

## Phase 1 — SHIPPED 2026-04-26

`src/data/marylandFishingHotspots.ts` — 48 named in-water hotspots:

- **9 reservoirs × 2-4 spots each = 19 spots:** Loch Raven (Dam Pool,
  Dulaney Bridge, Seminary Cove, Paper Mill Flats), Prettyboy (Dam Cove,
  Gunpowder Inflow), Liberty (Dam Pool, Oakland Causeway, North Branch),
  Triadelphia (Dam, Mill Cove), Rocky Gorge (Dam, Browns Bridge),
  Deep Creek (State Park, Glendale Bridge Hump, North Glade Run),
  Piney Run, Greenbrier Lake, Conowingo Pond.

- **7 Bay structure features:** Susquehanna Flats, Pooles Island, Stone
  Rock, The Hill, Thomas Point Light, Hooper Strait, Conowingo Tailwater.

- **5 trout-stream named pools/sections:** Big Hunting Creek C&R,
  Gunpowder Falls C&R, Savage River Tailwater, North Branch Potomac
  Trophy, Beaver Creek Delayed Harvest.

UI wiring: new `HOT` filter chip on FishMapScreen, separate detail card
showing name / waterbody / kind / species / best months / technique notes
/ regulation note / source citation.

Type system: `FishingHotspot` interface with `waterClass`, `kind`,
`primarySpecies[]`, `techniqueNotes`, `bestMonths`, `isStretch`,
`sourceTier`, `source`, optional `reg`. Helpers: `hotspotsByWaterClass`,
`hotspotsForMonth`, `FISHING_HOTSPOT_STATS`.

Validation: tsc clean, jest 102 suites / 2438 tests / 0 failed.

## Phase 2 — Bay structure expansion (~50-80 more spots)

Target sources: NOAA Chart 12273 (Cheaspeake Bay, Sandy Point to
Susquehanna), 12270 (Eastern Bay), 12266 (Cove Point to Sandy Point),
12230 (Tangier Sound). Every named lump, shoal, light, or charted wreck.

Specific targets:
- **Upper Bay:** Belvedere Shoal, Worton Point, Howell Point, Swan Point,
  Love Point, Sandy Point shoals.
- **Mid-Bay:** Bay Bridge complex (eastern + western), Tolly Point,
  Bloody Point Light, Poplar Island reefs (DNR-engineered).
- **Lower MD Bay:** Buoy 76 (Hooper Strait approach), Smith Point,
  Smith Island marshes, Janes Island flats.
- **Tributary mouths:** Magothy mouth, Severn mouth, South River mouth,
  Patuxent mouth, Choptank mouth, Nanticoke mouth, Wicomico mouth.

Estimated effort: 1 day with NOAA chart cross-referencing.

## Phase 3 — Reservoir bathymetry expansion (~50-100 more spots)

Each reservoir has DNR bathymetric maps showing humps, drops, channels.
Add 5-15 spots per reservoir from those maps:

- Loch Raven: add Glen Echo, Beaver Dam, Merryman's Mill arm, mid-lake
  hump at the bend.
- Prettyboy: add Spook Hill, the upper end before the inflow, Heaver Run
  arm.
- Liberty: 3,100 acres — at least 12 more spots merit attention (we
  shipped 3).
- Deep Creek: Marsh Run cove, State Park ramp humps, Honi Honi cove,
  Cherry Creek cove, Boulder cove.

Estimated effort: 2-3 days. Heavy DNR doc review.

## Phase 4 — Trout-stream named pools (~30-50 more spots)

Wading anglers use named pools. Big Hunting Creek alone has 8+ named
pools (Big Pool, Cunningham Falls Pool, etc.) DNR documents some;
the rest come from named pool guides published by Trout Unlimited
chapters.

Targets:
- All 9 DNR-designated trout-management areas (we shipped 5)
- Per area, the 3-5 most-fished named pools with TU chapter citations

Estimated effort: 1-2 days.

## Phase 5 — Tidal-river detail (~40-60 spots)

Tidal Potomac, Choptank, Patuxent, Nanticoke, Pocomoke have specific
named bends, holes, and creek mouths that are striped-bass / blue-cat /
LMB legendary. Sources: DNR tidal-bass / striper / catfish reports;
DNR snakehead-strike-team intel.

Estimated effort: 2 days.

## Phase 6 — UI: pull hotspots into the AI chat

Wire `hotspotsForMonth()` and `hotspotsByWaterClass()` into
`fishingChatKnowledge.ts` so the AI can answer "where should I fish next
weekend?" with concrete, sourced recommendations + Amazon-affiliate gear
suggestions per the AI monetization plan.

Hooks needed in `fishingChatKnowledge.ts`:
- `INTENT_HOTSPOT_BY_SPECIES` — "where can I catch walleye?"
- `INTENT_HOTSPOT_BY_MONTH` — "what's biting in May?"
- `INTENT_HOTSPOT_BY_BODY` — "best spots on Loch Raven?"

Estimated effort: 1 day.

## Phase 7 — Community spot moderation pipeline (V3+)

Once we have backend sync (currently deferred to Phase 3 of the master
roadmap), accept user-submitted hotspots gated through admin review. The
`community` source tier already exists in the type system; just need the
moderation UI + backend route.

## Out of scope (won't do)

- **OnX-style detailed structure traces.** OnX has rights to scraped DNR
  bathymetry; we don't. Stick to public chart features.
- **"Secret community spots" without citation.** Per the fabrication
  pattern memory — every spot needs a defensible source.
- **Charter-captain confidential spots.** Don't burn a charter rep by
  publishing their spot. Could partner formally; that's a future thing.

## Validation gates per phase

Each phase ships with:
- tsc clean (`npx tsc --noEmit`)
- jest green (current baseline 2438 tests)
- New contract test asserting count, MD bbox, source-tier presence,
  no fabricated sources
- Live screenshot demo on the simulator

---

Last updated 2026-04-26. Phase 1 shipped. Phases 2-7 deferred per
context-budget; resume in next session.

---

## 2026-04-29 RE-SCOPING — Target: 1000 verified spots

David flagged that 100 hotspots radically under-represents Maryland's
water resources. He's right. Realistic floor:

| Category | Realistic count |
|---|---|
| Chesapeake Bay structure (named bottoms, lighthouses, bridge pilings, channel edges, oyster bars, river mouths) | 120-150 |
| Reservoirs (10 of them, named coves/points/dams/inflows/humps) | 150 |
| Trout streams (200+ mi of MD trout water, named pools/runs/sections) | 150 |
| Tidal rivers (12+ rivers + tributaries) | 100-150 |
| Atlantic Ocean / Ocean City / coastal bays / Assateague | 40-60 |
| Community + park lakes (non-reservoir) | 50 |
| Power-plant warm-water + artificial reefs | 20 |
| **TOTAL TARGET** | **~700-900 curated** + the **737 raw DNR PublicFishingAccessSites** already wired = **~1500 fish-related pins** |

This is the real target. The "≥90" floor in the original plan was wrong.

### Pass structure (revised 2026-04-29)

Each pass = one focused research agent with strict provenance, then
manual curation pass for format normalization, dedup, and MD-bbox
validation. **Quality-over-quantity:** prefer 80 verified entries to
150 fabricated.

- **Pass 1 — Bay structure** (target ~150 net new). 2026-04-29 round
  produced ~95 entries; some were Virginia waters (Rappahannock,
  York, James, Mobjack, Hampton Roads) — filtered out during
  curation, keeping only MD county-coded entries.
- **Pass 2 — Reservoirs** (target ~150 net new). 2026-04-29 round
  produced ~120 entries with strong DNR sourcing. Some duplicate IDs
  with existing 102 (e.g. `lochraven_yorkshire_point` vs existing
  `lochraven_yorkshire`) handled in dedup pass.
- **Pass 3 — Trout streams** (target ~150 net new). Agent ran but
  output was >50KB, persisted to host filesystem outside sandbox
  read access. Recoverable next session via Read tool. Tracked as
  task #127 watchlist item.
- **Pass 4 — Tidal rivers** (target ~150 net new). 2026-04-29 round
  produced ~139 entries. Several `kind: 'bay'` and `kind: 'island'`
  values aren't in the union — remapped during curation
  ('bay' → 'cove', 'island' → 'point').
- **Pass 5 — Atlantic / coastal / lakes / specialty** (target ~150
  net new). Agent ran but output was >60KB, persisted to host
  filesystem. Tracked as task #129 watchlist item.

### Always-be-watching pattern

The dataset is **never** "complete." It's "current as of {date}." Every
research session adds entries. Sources accumulate as spots get
identified in:
- DNR press releases
- Forum posts (with attribution)
- NOAA chart updates
- Charter captain mentions (with permission)
- New artificial reef permits
- Tournament reports

The standing watchlist file is `FISHING_RESEARCH_NOTES.md` — append to
it during any session that touches fishing data. The principle: this
is the entire point of the app — be the most comprehensive source of
high-quality MD fishing data. Stopping at any number is wrong; the
right answer is "we keep adding."

### Format / quality fixes locked in 2026-04-29 curation

Discovered during agent-output curation; future agent prompts should
pre-empt these:

1. **County coding** must be MD county only. Filter entries with
   non-MD county fields (e.g. `Northumberland`, `Mathews`, `York`,
   `Gloucester`, `Hampton-Roads` — those are Virginia).
2. **Coordinate precision** — round to 5 decimals (~1.1m). Some
   agents return 4-decimal output; normalize.
3. **Species names** — Title Case strings (`Striped Bass`, not
   `striped-bass`). Some agents use slug case; normalize.
4. **bestMonths format** — comma-separated 3-letter abbreviations
   (`Apr,May,Sep,Oct`), not date ranges (`April-October`). Normalize.
5. **kind enum** — strict: `'hump' | 'point' | 'channel-edge' | 'creek-mouth' | 'rip-line' | 'flat' | 'cove' | 'tailwater' | 'pool' | 'reef' | 'wreck' | 'shoal'`. NO `'bay'`, `'island'`, `'jetty'`, `'pond'`, `'bridge'`. Remap.
6. **isStretch** — true for stretches and approximate-coordinate
   features; false for charted points. Default false unless
   uncertain.
7. **Deduplicate** — both against existing IDs and against other
   agents' output (Pass 1 + Pass 4 both included Susquehanna Flats
   entries; merge to single canonical entry).
