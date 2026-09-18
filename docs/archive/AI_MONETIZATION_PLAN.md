# AI Chat Monetization — Affiliate-Anchored Responses

> **CANONICAL REPO LOCK:** This plan applies to `~/Documents/huntmaryland-build/` ONLY. If you see this file in any other folder, that copy is **stale** — flag it to David and stop. (Lock added 2026-04-26 after a parallel V2.3 fork consolidation.)

**Status:** Direction set 2026-04-26. Not yet implemented.

## Why this exists

MDHuntFishOutdoors currently has **one** revenue path: Amazon affiliate links via the `mdoutdoors1-20` tag. There are **no** ads, no sponsorships, no paid placements, no in-app purchases. Every dollar the app generates comes from a user tapping an Amazon link in the app and Amazon paying a commission.

The Gear tabs (Hunt / Fish / Hike, all wired 2026-04-26) surface affiliate links explicitly. The AI chat surface — which sees far higher engagement per session than the Gear tab — currently surfaces zero. That is the highest-leverage change we can make for revenue right now.

## The directive

**Every AI chat response should close with one relevant gear suggestion + Amazon link with the `mdoutdoors1-20` tag.**

The suggestion must be:

1. **Relevant to the question** — not a random "buy this rifle" appended to a question about turkey calls.
2. **Tier-matched if context allows** — if the user asked about budget gear, suggest budget. If they're discussing high-end hunts, suggest premium.
3. **Maryland-tuned** — defaults toward gear that works in Maryland conditions (no AK-style cold-weather kit recommended for Eastern Shore waterfowl).
4. **One per response, not five** — affiliate-link spam degrades the chat experience and Apple has rejected apps for it. One clean suggestion per turn.
5. **Visually distinct from the answer text** — render in a separate "Gear pick" card under the answer, with a clear "View on Amazon →" CTA, NOT inline as a sentence the user might miss.

## Worked examples

| User question | AI answer | Gear suggestion link |
|---|---|---|
| "What deer call should I use during the rut?" | Explains grunt vs bleat vs rattle in late-October MD whitetail season. | Primos Buck Roar grunt call (mid-tier) |
| "How do I pick a fly line for the Gunpowder?" | Explains weight-forward vs double-taper, line weight matching rod weight, and floating vs sinking. | Rio Premier Gold WF5F (David's actual line) |
| "What waders should I get?" | Explains breathable vs neoprene, stockingfoot vs bootfoot, sizing. | Orvis Clearwater Chest Waders (David's actual waders) |
| "What shoes should I run in for the AT?" | Explains trail-runner vs hiking-boot tradeoff for thru-hiking, foot-strike differences, ankle support. | Altra Lone Peak 8 (mid-tier) |
| "How do I camp in the rain?" | Explains tarp orientation, ground cloth, vestibule storage, dry-bag essentials. | Sea to Summit Ultra-Sil 13L Dry Sack |

## Implementation plan

### Phase 1 — content (no code yet)

1. **Build a curated `chatGearSuggestions` map** keyed by intent/topic. Each entry: `{ topic, gearItem, reasonText, amazonAsin, tier, mode }`.
2. Reuse what's in `curatedHuntingGear.ts`, `curatedFishingGear.ts`, `curatedHikingGear.ts`, `curatedCampingGear.ts`. Don't duplicate.
3. Cover the top ~50 most-likely chat topics per mode (rough Pareto — those will catch 80%+ of user questions).
4. David fills in personally-vetted picks (`creatorPick: true`) for high-traffic topics.

### Phase 2 — wire into chat response

1. The chat backend / on-device responder already returns markdown text. Add a structured trailer field:
   ```ts
   {
     answer: string,            // existing markdown body
     gearPick?: {               // NEW
       name: string,
       reason: string,          // 1 sentence on why this fits the question
       amazonUrl: string,       // already-tagged with mdoutdoors1-20
       price: string,
       creatorPick: boolean,
     }
   }
   ```
2. ChatScreen renders the existing answer, then the `gearPick` as a dedicated card below — same gold-accented "By David" treatment if `creatorPick` is true.

### Phase 3 — topic-matching

1. **Server-side**: fastest, easiest. The chat API picks from the suggestion map based on the user's prompt + the answer it generated. If no good match, omit `gearPick` for that turn (don't force a bad suggestion).
2. **Fallback**: a tiny on-device fuzzy match (keyword → topic) for offline AI responses.

### Phase 4 — analytics

1. Already have analyticsService — log a `gear_pick_shown` event when a card renders, and `gear_pick_tapped` when the user clicks through. These two numbers tell us:
   - **CTR** (taps / shown) — is the suggestion relevant?
   - **Bid rate** (taps / total chat turns) — is the picker firing on enough turns?
2. Target CTR: > 5% (Amazon Native Shopping Ads benchmark is ~2-3%; relevance-matched should beat that).

### Phase 5 — content expansion

1. Mode-specific prompt seeding: add tags like `[gear:fly-line-medium]` to chat knowledge entries so the matcher gets unambiguous routing.
2. David's "By David" picks should outrank generic picks when both are available — the personal-curation signal converts much better than tier-only sorting.

## What this is NOT

- **Not ad placement.** No banners, no inline ads, no sponsored content. The single gear card per response is editorial — the same way a YouTube outdoors creator might end a video with "here's the rifle I use, link in the description."
- **Not a paywall.** Chat stays free.
- **Not push notifications selling gear.** That would be aggressive and Apple-rejection-bait.
- **Not multiple links per turn.** One pick, surfaced cleanly.

## Apple Review considerations

Per Guideline 2.5.4 (must do what you say) and 4.0 (Design):
- Disclose affiliate relationship in app footer (already there — mdoutdoors1-20 tag is mentioned in the Gear tab and at chat-screen footer).
- The card must be visually distinct from the "answer" — Amazon Affiliate operating agreement requires that affiliate placement is clearly identified.
- "MDHuntFishOutdoors may earn a small referral commission at no cost to you" copy is already used in the Gear tab; mirror that on the chat-screen card.

## Proximate work this depends on

- Curated gear data files (DONE for fly fishing — 26 picks landed 2026-04-26; rest are placeholder until David fills in).
- Chat backend response shape (existing — `services/aiService.ts` and the FastAPI side; add `gearPick` field).
- ChatScreen renderer (existing — add card render below answer).
- analyticsService event types (existing — add `gear_pick_shown` and `gear_pick_tapped` types).

---

Last updated: 2026-04-26
