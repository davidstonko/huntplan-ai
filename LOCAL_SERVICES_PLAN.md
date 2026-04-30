# Local Services — Outfitters / Guides / Shops / Charters / Lodges

Started 2026-04-26. Authoritative roadmap for the "Local Pros" join layer
that ties businesses to specific waters, regions, and species.

## What David asked for

> "if you're fishing the gunpowder river or its tributaries there would be
> a link to great feathers fly shop, back water anglers, and Tochterman's
> fly shop. If fishing the chesapeake bay, you might also have
> tochterman's gear shop, but also bass pro shop, or some other striped
> bass recommendations."

The mental model: **search from BOTH directions** — top-down (location →
services) and bottom-up (service → locations they cover). A fly shop in
Towson primarily serves the Gunpowder, but their website might mention
Big Hunting Creek, Beaver Creek, etc. Capture every water explicitly
served on the business's own pages.

## Data architecture

`src/data/marylandLocalServices.ts` is the new file. It complements
`guideServicesData.ts` (61 entries, flat by-type directory used in the
"Resources → Guide Directory" screen) by adding the join keys:

- `waters[]` — waterbody names matching `marylandFishingHotspots.ts`
- `regions[]` — county/region names matching hunting-land context
- `species[]` — duck/sika/whitetail etc.

Provenance discipline: every entry has a `source` URL where the data was
verified, plus `verifiedAt: 2026-04-26` and a `trust` tier of
`verified-2026 | directory | tip-only`. Per the
`fabrication_pattern_2026_04_18` memory: no hand-typed phone numbers
without a citation.

## Phase 1 — SHIPPED 2026-04-26

24 services, all `verified-2026`:

**11 fishing:**
- Fly shops: Great Feathers (Sparks), Backwater Angler (Monkton), Savage River Outfitters (Swanton)
- Tackle shops: Tochterman's (Baltimore), Anglers Sport Center (Annapolis)
- River guides: Heavy Water Anglers (Captain Tom Martin — Savage / North Branch / Beaver Creek)
- Offshore charters: OC Fishing Center, FINATIC Sportfishing, Over-Board Sportfishing
- Marina rental: Bill's Marine Service (Deep Creek)

**13 hunting:**
- Waterfowl outfitters: Winter Farms Hunting, MD Waterfowl Hunting (Capt. Spagnola), Harrison's Outfitter Service
- Sika outfitters: Muddy Marsh Outfitters, TUNDRATOUR, Nanticoke Outfitters
- Lodge: Riverside Lodge MD
- Call/decoy: Sean Mann Outdoors (Trappe — 35+ World calling titles)
- Taxidermists: Precision Taxidermy MD, Natalie's Taxidermy (Myersville)
- Archery pro shops: Autumn Sky Outfitters (Bel Air), Bowhunters Den (Taneytown)
- Big-box: Bass Pro Shops Hanover

UI wiring: FishMapScreen hotspot detail card now renders a "Local pros"
section with up to 4 services that explicitly serve the selected
waterbody. Tap a row to open the website (or call the phone if no
website).

Helper functions: `servicesForWater(name)`, `servicesForRegion(name)`,
`servicesForSpecies(name)`, `servicesByCategory(cat)`.

Validation: tsc clean, jest 102 suites / 2438 tests / 0 failed.

## Phase 2 — Bay charter fleet expansion (~25-30 entries)

Major hubs to research per-marina:
- **Solomons Island** (lower mid-Bay) — typically 15-25 captains operating
- **Chesapeake Beach** — Capt. Tony Friedrich for fly + light tackle
- **Rock Hall** — Eastern Shore upper Bay
- **Tilghman Island** — Eastern Bay
- **Kent Narrows** — central
- **Crisfield** — Tangier Sound, head boats + private charters
- **Annapolis** — Severn-area fleet

Method: Research each marina's "Charter Fleet" page. List individual
captains with their boat names, primary species, and whether they offer
fly/light-tackle (vs. trolling-only).

## Phase 3 — Eastern Shore lodge expansion

Beyond what Phase 1 captured, the well-known Eastern Shore waterfowl
lodges include:
- Pintail Point (Talbot Co — verify status)
- Schrader's Outdoors (Henderson — verify)
- Hopkins Game Farm (Kent Co)
- Whisky Point Outfitters (verify)
- North Bend Plantation (verify)

Method: Web-verify each via own website + recent guide-service blog
posts. Cross-check against MD Tourism listings.

## Phase 4 — Western MD bear / big-game pipeline

Western MD bear hunting is governed by lottery — outfitters there work
through the Allegany / Garrett DNR offices. Key step:
- Call MD DNR Wildlife Division (410-260-8540 — verify) to ask for the
  current list of bear-hunt-licensed outfitters
- Cross-reference with outfitters on the public-lands maps

## Phase 5 — Hunting-land detail card wiring

Mirror the Fish hotspot Local Pros wiring on the Hunt map's land detail
card. When a user taps a WMA or SF, show the relevant outfitters /
processors / taxidermists for that county.

Implementation: extend MapScreen.tsx land detail with the same
TouchableOpacity pattern, calling `servicesForRegion(land.county)`.

## Phase 6 — AI-chat integration

Wire `servicesForWater`, `servicesForRegion`, `servicesForSpecies` into
`fishingChatKnowledge.ts` and `chatKnowledge.ts` so questions like
"who guides on the Savage River?" or "best taxidermist for waterfowl on
the Eastern Shore?" return concrete recommendations with URLs.

Integrates with `AI_MONETIZATION_PLAN.md`: AI responses end with a
context-appropriate gear or service card with affiliate / referral link.

## Phase 7 — Affiliate / referral relationships

Currently every entry has `trust: verified-2026` from public web data.
Long-term, negotiate referral partnerships:
- Booking commissions on charter trips through fishingbooker.com /
  guidesly.com integrations
- Direct referral fees with key fly shops (Great Feathers / Backwater /
  Tochterman's) for Gunpowder traffic
- Lodge package commissions (Eastern Shore + Deep Creek)

Out of scope for app v1 — track in `MONETIZATION_PLAN.md`.

## Out of scope (won't do)

- **Posting reviews / ratings.** Risk + moderation overhead. Defer to V3+
- **Booking trips inside the app.** That's a different product. Web link
  is fine.
- **Hand-placing services without source URLs.** Per fabrication-pattern
  invariant.

## Validation gates per phase

- tsc clean (`npx tsc --noEmit`)
- jest green
- New contract test asserting every entry has `source`, `verifiedAt`,
  `trust`, plus `waters` OR `regions` OR `species`
- Live screenshot of the Local Pros section rendering correctly
- For Phase 5+: hunting-land detail card screenshot too

---

Last updated 2026-04-26. Phase 1 shipped. Phases 2-7 deferred.
