# MDHuntFishOutdoors — Knowledge Base Research Plan

> **Goal:** make the app the canonical Maryland outdoors resource by
> harvesting >200 publicly-available webpages + 12+ books/papers across
> the categories below. Each finding either (a) backfills a chat-knowledge
> handler, (b) lands as a structured data file in `src/data/`, or
> (c) gets a citation row in a curated-resources screen.

> **Method:** content-side audit, not code-side. Each category gets a
> sweep, an inventory of what's already in the app, and a gap-fix plan.
> Track findings in `src/data/research/<slug>.md` so future sessions
> can pick up where we stopped.

> **Class-vs-single-miss test:** for every gap we find, ask "is this one
> data point that drifted, or is this an entire activity / license tier /
> audience the data model doesn't anticipate?" Class misses earn a new
> intent handler + data file. Single misses earn a one-line update.

---

## Category A — MD DNR primary docs (target: 60 pages)

Start at the top of dnr.maryland.gov and walk every linked subpage that
has hunting/fishing/camping/hiking content. Track URL + last-checked
date + summary in `src/data/research/dnr_pages.md`.

- [ ] huntersguide/pages/allspecies.aspx — top hub
- [ ] huntersguide/pages — per-species detail
  - [ ] White-tailed deer
  - [ ] Black bear
  - [ ] Wild turkey (spring + fall)
  - [ ] Sika deer
  - [ ] Migratory waterfowl (ducks, geese, swans)
  - [ ] Small game (rabbit, squirrel, pheasant, grouse)
  - [ ] Furbearers (beaver, fisher, fox, muskrat, mink, raccoon,
        opossum, skunk, coyote, weasel)
  - [ ] Crow + dove
  - [ ] Snipe + woodcock
- [ ] wildlife/pages/hunt_trap/* — hunt/trap administration
- [ ] wildlife/pages/licenses/* — every license sub-page
  - [ ] Falconry
  - [ ] Junior hunter
  - [ ] Apprentice hunter
  - [ ] Disabled hunter
  - [ ] Universal Disability Pass
  - [ ] Lifetime
  - [ ] Senior consolidated
- [ ] wildlife/pages/hunt_trap/cwd_in_maryland.aspx
- [ ] wildlife/pages/hunt_trap/shooting_ranges.aspx
- [ ] fisheries/pages/* — every fish species page
  - [ ] Striped bass
  - [ ] Largemouth + smallmouth bass
  - [ ] Trout (rainbow, brown, brook)
  - [ ] Snakehead
  - [ ] Blue catfish
  - [ ] White perch + yellow perch
  - [ ] Crappie
  - [ ] Walleye
  - [ ] Atlantic croaker, spot, bluefish, Spanish mackerel
  - [ ] Tautog, summer flounder, black sea bass
- [ ] fisheries/pages/oysters/*
- [ ] fisheries/pages/crab/*
- [ ] forests/pages/publiclands/* — every state forest detail
- [ ] publiclands/pages/* — every WMA detail
- [ ] boating/pages/* — boat ramps, registration, tides
- [ ] nrp/pages/* — Natural Resources Police, hunter education
- [ ] news.maryland.gov/dnr — recent press releases (last 12 mo)

## Category B — eRegulations.com/maryland (target: 25 pages)

The DNR's official regulation publisher. Each section has a permanent
URL we should cite directly.

- [ ] /hunting top page + every subsection
- [ ] /fishing top page + every species + tidal/non-tidal split
- [ ] /boating
- [ ] /oysters-clams
- [ ] /crabs (commercial + recreational)
- [ ] /chronic-wasting-disease
- [ ] /managed-deer-hunting-programs
- [ ] /sunday-deer-hunting

## Category C — Federal land managers in MD (target: 30 pages)

- [ ] NPS — C&O Canal NHP (184.5 mi corridor)
- [ ] NPS — Antietam NB
- [ ] NPS — Monocacy NB
- [ ] NPS — Catoctin Mountain Park
- [ ] NPS — Assateague Island NS
- [ ] NPS — Appalachian National Scenic Trail (40.9 mi MD section)
- [ ] USFWS — Patuxent Research Refuge
- [ ] USFWS — Blackwater NWR
- [ ] USFWS — Eastern Neck NWR
- [ ] USFWS — Susquehanna NWR
- [ ] USFWS — Martin NWR
- [ ] USACE — Susquehanna Flats / Conowingo
- [ ] USCG — Atlantic + Bay safety advisories
- [ ] BLM — none in MD (skip)
- [ ] USFS — none in MD (skip)
- [ ] NOAA — Tides & Currents stations (already wired)
- [ ] NOAA — Marine forecasts
- [ ] NOAA — Striped bass stock assessment

## Category D — Conservation + advocacy orgs (target: 25 pages)

- [ ] Chesapeake Bay Foundation
- [ ] Appalachian Trail Conservancy
- [ ] Trout Unlimited Maryland
- [ ] Ducks Unlimited Maryland
- [ ] Pheasants Forever / Quail Forever MD
- [ ] National Wild Turkey Federation MD
- [ ] Backcountry Hunters & Anglers MD
- [ ] Coastal Conservation Association MD
- [ ] Maryland Saltwater Sportfishermen's Association
- [ ] MD Bowhunters Society
- [ ] NRA Maryland State Association
- [ ] MD Fly Anglers
- [ ] Patapsco Valley TU chapter
- [ ] Potomac-Patuxent TU chapter

## Category E — Academic + scientific reports (target: 15 papers)

- [ ] MD DNR annual deer harvest report (most recent)
- [ ] MD DNR fish stocking reports (trout, walleye, muskellunge)
- [ ] ASMFC Striped Bass stock assessment (most recent benchmark)
- [ ] DNR snakehead bowfishing study (Feb 2026, ICB journal)
- [ ] CWD surveillance summary (annual)
- [ ] DNR oyster spat survey
- [ ] Chesapeake Bay water-quality report (CBP partnership)
- [ ] Bay grasses (SAV) annual survey
- [ ] DNR turkey brood survey
- [ ] DNR black bear population survey (Garrett/Allegany)
- [ ] DNR sika deer population study (Eastern Shore)
- [ ] Tidal Fish + Wildlife Conservation Office annual report
- [ ] Catch-and-release mortality studies (rockfish, largemouth)
- [ ] Bay tributary sediment + invasive species reports

## Category F — Books (target: 12)

These need ISBNs + author + year + which-app-section to cite. We can't
ship the text, but we can cite chapter-level claims and let the AI
direct users to the canonical source.

- [ ] **Maryland's WMA: A Hunter's Guide** (DNR pub)
- [ ] **The Hunter's Encyclopedia** — Stackpole Books
- [ ] **The Striper Coast** — John Skinner — striped bass tactics
- [ ] **Striped Bass: A Natural History** — Daniel
- [ ] **Tidewater Fishing in the Mid-Atlantic** — Lefty Kreh
- [ ] **The Complete Whitetail Hunter** — Outdoor Life
- [ ] **Wild Turkey Hunting: Spring & Fall** — NWTF / Lovett Williams
- [ ] **Black Bear Hunting** — Stackpole
- [ ] **AT Companion Guide** — ATC
- [ ] **Atlantic Salt Marsh** (relevant to Eastern Shore sika habitat)
- [ ] **Maryland State Forests Camping Guide** (DNR)
- [ ] **Chesapeake Bay Crabbing Guide** (DNR + UMD Sea Grant)

## Category G — Forums + community (target: 50 threads)

Capture the recurring "what's hitting now" wisdom. We won't reproduce
forum posts, but we can synthesize patterns into the AI's seasonal
guidance + Local-Pros recommendations.

- [ ] TidalFish.com — MD striper section, snakehead section
- [ ] FishTalkMag bay reports (weekly)
- [ ] DCBassFishing.com
- [ ] MD Whitetail Hunting Facebook (private but many announcements)
- [ ] Reddit r/saltwaterfishing — search "Maryland"
- [ ] Reddit r/Maryland — outdoors threads
- [ ] Outdoor Life — MD coverage
- [ ] BoatUS Maryland boating tips
- [ ] Fly Fishing Maryland Facebook group
- [ ] AT Trail Forum (whiteblaze.net) — MD section
- [ ] r/Appalachian_Trail — MD section
- [ ] HikingUpward.com — MD trails

---

## Tracking

Each category gets a status row updated as we work through it. Use
`src/data/research/<category>.md` for the actual notes. This top-level
file just tracks completion %.

| Category | Pages found | Pages reviewed | App update landed |
|----------|-------------|----------------|-------------------|
| A — MD DNR | TBD | 0 | Trapping + Bowfishing handlers (00359b64) |
| B — eRegulations | TBD | 0 | Most license fees + species rules already wired |
| C — Federal lands | TBD | 0 | C&O Canal + AT in hike data; NWRs in fish data |
| D — Conservation orgs | TBD | 0 | Some already linked from Resources screens |
| E — Academic | TBD | 1 | Snakehead bowfishing study cited |
| F — Books | 0 | 0 | None yet |
| G — Forums | TBD | 0 | None yet |

## Process per source

For each URL/book/paper:

1. Read or skim it.
2. Compare against existing data files (`src/data/`) and chat handlers.
3. If gap: classify single-miss vs class-miss.
4. Single-miss → patch the relevant data file + commit.
5. Class-miss → add new intent handler / data structure + commit + memo.
6. Add citation row to `src/data/research/citations.ts` (new file).
7. Update this checklist.

## Why this matters

The research pass on 2026-05-02 (memo: dnr_research_audit_2026_05_02.md)
caught 1 class-miss (trapping) + several single-misses with just
~5 search queries. Scaling that to 200+ sources will surface dozens of
new content gaps and validate the existing data set.

---

Last updated: 2026-05-02
