# Fishing Research Watchlist

> The dataset is never "complete" — only "current as of {date}." Append
> to this file during any session that touches fishing research. The
> principle: this app aims to be the most comprehensive source of
> high-quality MD fishing data. Stopping at any number is wrong; the
> right answer is "we keep adding."

Started 2026-04-29 after David flagged that 102 spots radically
under-represents MD's water resources.

## Outstanding research targets (next session)

### Pass 3 — Trout streams (recover from disk)

Agent ran 2026-04-29 with extensive WebSearch + WebFetch. Output >50KB,
persisted to host filesystem outside sandbox read access. Path on host:

```
~/Library/Application Support/Claude/.../tool-results/
  toolu_01C5dsUr6RxwF2Ff1uDVawrH.json
```

Next session, use the Read tool (which CAN read absolute paths on
host) to retrieve, then run through the curation pass.

Targeted streams in the prompt: Gunpowder Falls (Big Gunpowder),
Big Hunting Creek, Savage River, North Branch Potomac, Casselman River,
Beaver Creek, Owens Creek, Town Creek, Antietam Creek, Catoctin Creek,
Little Patuxent, Patapsco mainstem, Bear Branch, Morgan Run, Falls Run,
Gillis Falls, Hunting Creek, Fishing Creek tailwater, Crabtree Creek,
Youghiogheny River, Deep Run, Octoraro Creek, Big + Little Pipe Creek.

Preview from agent output shows entries starting with Bunker Hill Pool,
Big Falls Pool, etc. for Gunpowder Falls — comprehensive.

### Pass 5 — Atlantic / coastal / lakes / specialty (recover from disk)

Agent ran 2026-04-29. Output >60KB, persisted to host filesystem. Path:

```
~/Library/Application Support/Claude/.../tool-results/
  toolu_0163QDZHuqTfSCjAZy2tAwSD.json
```

Targeted categories in the prompt: Ocean City inlet area, OC surf,
Assateague surf + bay, Sinepuxent Bay, Isle of Wight Bay, Assawoman Bay,
Chincoteague Bay (MD waters), offshore wrecks (Jackspot, Bass Grounds,
African Queen, etc.), artificial reefs (8 + additional), power plants
(Calvert Cliffs, Vienna, Brandon Shores, Wagner), park ponds
(Centennial, Wilde, Roland, Druid Hill, Lake Roland, Tuckahoe, Adkins,
Smith Point, Johnson's Pond, Pemberton, Cypress Branch, Mt. Pleasant,
Wye Mills Lake, Unicorn Lake, Lake Whetstone, Lake Linganore,
Black Hill / Little Seneca, Lake Needwood, Lake Frank, Hashawha,
Cunningham Falls Lake, New Germany Lake, Big Run Lake, Broadford),
snakehead specialty hotspots, crappie hotspots.

Preview shows OC inlet jetty entries — comprehensive.

## Border-water policy (2026-04-29)

> Maryland anglers can fish either side of border waters with their MD
> license, per reciprocal agreements. Do NOT filter VA/PA/DE entries
> just because they're not in MD county boundaries — many are legitimately
> in scope.

Specifically in scope as MD-license-fishable:

- **Lower Potomac River (MD/VA):** Governed by the Potomac River Compact.
  MD license valid on water from MD shore launches; VA shore launches
  require VA license. So VA-side spots like Mathias Point Channel,
  Mason Neck (Occoquan mouth), Quantico Creek mouth, Aquia Creek mouth,
  and Mt. Vernon area are LEGITIMATE MD-fishable from MD ramps.
- **Lower Tangier Sound (MD/VA):** MD-side waters (Smith Island MD,
  Bloodsworth, Holland Island) are MD; the boundary line through
  Tangier itself is in MD waters at most points. VA waters near
  the line (Watts Island channel, Pocomoke Sound MD side) are
  fishable from MD ramps.
- **MD/PA Susquehanna line near Conowingo:** Some reciprocity exists.
  PA waters above Conowingo Pond accessible via MD ramps with MD
  license in specific stretches.
- **MD/DE coastal bays:** Indian River Inlet (DE), Little Assawoman
  Bay (DE-mostly) — for tidal saltwater, MD/DE have reciprocity for
  MD anglers. Verify per current DNR rules each season.

When adding entries:
- Set `borderWater: true` on the FishingHotspot
- Use the MD county where the access is, OR the actual VA/PA/DE
  county if the spot is genuinely in that state's waters
- In the `reg` field, document the reciprocity rule explicitly:
  e.g. "Lower Potomac: MD license valid on-water from MD shore
  launches; VA shore launches require VA license. Potomac River
  Compact governs."
- In `accessNotes`, document which MD ramp(s) reach the spot

What's NOT in scope (filter these out):
- Deep-VA waters (Rappahannock, York, James, Hampton-Roads channel) —
  these are NOT MD-license-fishable. They were correctly filtered
  in the original Pass 1.
- Waters that require a separate state license to LAUNCH from
  (where MD license alone wouldn't be valid). MD ramp + MD license
  is the test.

## Standing categories to watch (every session)

### DNR press releases

Subscribe / monitor: https://news.maryland.gov/dnr/category/fisheries-news/

When DNR publishes:
- New trout-stocking schedule (each spring/fall)
- New artificial reef permit
- Snakehead population report
- Striped bass spawning closure update
- New C&R / DH section designation

→ check whether new spot info should be added to the dataset.

### NOAA chart updates

Charts get republished. Check periodically:
- Chart 12273 (Chesapeake Bay)
- Chart 12230 (Chesapeake Bay - Northern Part)
- Chart 12278 (Chesapeake and Delaware Canal)
- Chart 12266 (Chester River)
- Chart 12231 (Chesapeake Bay - Eastern Bay/South River)
- Chart 12270 (Chesapeake Bay - Eastern Bay)
- Chart 12286 (Potomac River entrance)
- Chart 12211 (Fenwick to Chincoteague)

→ if a new named feature appears, add it (with chart number citation).

### Forum + community attribution

When fishing forums (FishTalk, Tidal Fish, Maryland Striper) name a
new productive spot, add only with:
- Verifiable coordinates (chart-able location, not "secret")
- Attribution to the forum post
- `sourceTier: 'community'` flag

Per fabrication-pattern memory: never invent a "secret hotspot." If
unsure, skip it.

### Charter captain partnerships

Future: formal partnerships where charter captains contribute spots
in exchange for being listed on the marylandLocalServices roster.
Their contribution gets `sourceTier: 'community'` + attribution.

### Tournament reports

Tidal Bass Tournament results (DNR publishes). Top finishers
sometimes name productive areas — add with attribution where
they're not already on the dataset.

## Specific known-missing spots (drop-in adds)

Things I've noted but not yet researched into entries — drop in next
session with verified coords:

- **Gunpowder Falls additional named pools:** Sparks Pool, Glencoe
  Pool, Phoenix area, Camp Hidden Valley, Pot Rocks (some in
  agent output, recover via Read tool from disk).
- **Loch Raven additional coves:** there are ~20 named coves on the
  reservoir; we currently cover ~10. The remaining ~10 (Camp Notre
  Dame, Phoenix, Big Falls, Camp Hidden Valley arms) are in the
  agent output.
- **Casselman River wild brook trout sections:** Penn Hill, Markleysburg
  approach. Worcester PA border watersheds.
- **Antietam Creek smallmouth water** below Funkstown Dam.
- **Catoctin Creek** native brookie water — multiple unnamed pools.
- **Choptank wood-cover bass spots:** Hill's Neck, Ganey's Wharf
  (already in), Trippe Creek (already in), several more between
  Cambridge and Choptank Mills.
- **Pocomoke cypress-river largemouth:** Whiton Crossing area
  documented; need to add.
- **Tangier Sound MD-side cobia + black drum spots:** Smith Island
  marshes (already), need more granular Lower Sound entries.
- **OC inlet specifics:** north + south jetty distinguished; Route 50
  bridge; Convention Center bulkhead — all in agent Pass 5 output.

## How to use this file

When you discover a spot worth adding:
1. Append it under "Specific known-missing spots" with the source URL
2. Don't add to the data file until next dedicated research pass
   (avoids one-off entries with weak provenance discipline)
3. When a pass runs, this file becomes the seed list for the agent

When DNR publishes something new:
1. Note the date + URL under "DNR press releases" with one-line
   summary of what changed
2. Add to the appropriate pass for the next research round

## Provenance reminder

Per the fabrication_pattern memory and the strict source-tier discipline:
**no fabricated coordinates, no fabricated source attribution.** If you
can't defend a coordinate from a public document or chart, don't add it.
Mark `isStretch: true` for stretches; that's not a fabrication, that's
admitting uncertainty about exact pinpoint. Never invent a citation.
