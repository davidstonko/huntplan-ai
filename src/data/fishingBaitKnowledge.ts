/**
 * @file data/fishingBaitKnowledge.ts
 * @description Maryland fishing bait, fly, and lure knowledge base
 *
 * Comprehensive hatch charts for fly fishing and seasonal bait/lure recommendations
 * for all major Maryland species and water types. Used by AI chat to provide
 * intelligent tackle and bait suggestions.
 *
 * Sources:
 * - Hatch data: Local fly clubs, stream surveys, regional guides
 * - Bait/lure: MD DNR fishing reports, seasonal guides, charter captain knowledge
 * - Bay tactics: Chesapeake Bay Program, NatGeo tidal guides
 *
 * Last updated: 2026-04-04
 */

import { BaitRecommendation, HatchChart, HatchEntry, AmazonProductRef } from '../types/gear';

// ─────────────────────────────────────────────────────────────────────────────
// HATCH CHARTS FOR FLY FISHING
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Hatch charts for major fly fishing waters in Maryland.
 * Updated monthly for accurate emergence patterns.
 */
export const MARYLAND_HATCH_CHARTS: HatchChart[] = [
  {
    waterBody: 'Gunpowder Falls',
    region: 'Central MD (Baltimore County)',
    waterType: 'tailwater',
    lastUpdated: '2026-04-04',
    source: 'Gunpowder Falls Fly Club, MDFlies.org',
    entries: [
      // January
      {
        month: 1,
        insects: ['Midges (Diptera)', 'Little Winter Stoneflies (Capniidae)'],
        dryFlies: ["Griffith's Gnat #18-22", 'CDC Midge #20'],
        nymphs: ['Zebra Midge #18-20', 'Midge Larva #20', 'BH Pheasant Tail #16'],
        streamers: [],
        terrestrials: [],
        notes: 'Tailwater remains unfrozen; midges are primary food source. Fish dead drift patterns early morning (6-10am). Water temp 38-42°F.',
      },
      // February
      {
        month: 2,
        insects: ['Midges (Diptera)', 'Little Winter Stoneflies (Capniidae)', 'Blue Quills (Baetis early)'],
        dryFlies: ["Griffith's Gnat #18-22", 'Parachute Blue Quill #16'],
        nymphs: ['Zebra Midge #18-20', 'Midge Larva #20', 'BH Pheasant Tail #16'],
        streamers: [],
        terrestrials: [],
        notes: 'Warming trend brings Blue Quill emergences by late Feb. Fish midge patterns when air temps drop. Water temp 40-48°F.',
      },
      // March
      {
        month: 3,
        insects: ['Blue Winged Olives (Baetis)', 'Little Black Caddis (Leptocellidae)', 'Quill Gordon (early)'],
        dryFlies: ['BWO #16-18', 'Elk Hair Caddis #14-16', 'Parachute Quill Gordon #14'],
        nymphs: ['Hare\'s Ear #14-16', 'Caddis Larva #14', 'BH Prince Nymph #14-16'],
        streamers: ['Woolly Bugger #8-10 (olive, black)'],
        terrestrials: [],
        notes: 'Spring thaw increases water flow; nymph fishing most productive. March Browns start late month. Water temp 48-56°F.',
      },
      // April
      {
        month: 4,
        insects: ['Blue Winged Olives', 'Grannom Caddis (Brachycentridae)', 'Little Brown Stoneflies (Taeniopterygidae)', 'March Browns (early)'],
        dryFlies: ['BWO #16', 'Elk Hair Caddis #14', 'Grannom Caddis #14', 'Parachute March Brown #12-14'],
        nymphs: ['Caddis Larva #14', 'BH Prince Nymph #14', 'Hare\'s Ear #12-14', 'Stonefly Nymph #12'],
        streamers: ['Sculpin #6-8', 'Woolly Bugger #8-10'],
        terrestrials: [],
        notes: 'Peak spring fishing; high water from snowmelt. Grannom emergence afternoons (2-5pm). Water temp 56-62°F.',
      },
      // May
      {
        month: 5,
        insects: ['Sulphurs (Ephemerella)', 'Caddis (multiple), March Browns, Slate Drakes (late)'],
        dryFlies: ['Sulphur #14-16', 'Cinnamon Caddis #14', 'Parachute March Brown #12-14', 'Slate Drake #12'],
        nymphs: ['Sulphur Nymph #14', 'Caddis Pupa #14', 'March Brown Nymph #12'],
        streamers: [],
        terrestrials: [],
        notes: 'Peak season; morning Sulphur hatches (10am-1pm) and evening spinner falls. Midwater nymphing very productive. Water temp 62-68°F.',
      },
      // June
      {
        month: 6,
        insects: ['Sulphurs (afternoon)', 'Spotted Sedge (Helicopsyche)', 'Terrestrials (Ants, Beetles)', 'Tricos (early)'],
        dryFlies: ['Sulphur Spinner #16', 'Spotted Sedge #14', 'Deer Hair Caddis #14', 'Black Ant #16'],
        nymphs: ['Caddis Pupa #14-16'],
        streamers: [],
        terrestrials: ['Ant #16-18', 'Small Beetle #16'],
        notes: 'Hot daytime temps; fish early (dawn-9am) and late (dusk-dark). Sulphur spinners fall evening. Dry fly action best above the dam. Water temp 68-72°F.',
      },
      // July
      {
        month: 7,
        insects: ['Terrestrials (Ants, Beetles, Grasshoppers)', 'Sulphurs (evening spinners)', 'Caddis', 'Small Yellow Stoneflies (evening)'],
        dryFlies: ['Black Ant #16-18', 'Beetle #14-16', 'Grasshopper #10-12', 'Sulphur Spinner #16'],
        nymphs: ['Caddis Pupa #14-16'],
        streamers: ['Woolly Bugger #8-10 (black, brown)'],
        terrestrials: ['Ant #16-18', 'Beetle #14-16', 'Hopper #10-12'],
        notes: 'Summer slump; water temp peaks 72-74°F. Terrestrial fishing excellent mid-day on sunny banks. Nymph/streamer during low-light. Afternoon/evening only.',
      },
      // August
      {
        month: 8,
        insects: ['Terrestrials (Ants, Beetles, Crickets)', 'Tricos (dawn)', 'Small Caddis'],
        dryFlies: ['Black Ant #16-18', 'Beetle #14-16', 'Cricket #12-14', 'Trico #22-24 (spinner)'],
        nymphs: ['Trico Nymph #22', 'Inchworm #12-14', 'Caddis Pupa #14-16'],
        streamers: ['Woolly Bugger #8-10'],
        terrestrials: ['Ant #16-18', 'Beetle #14-16', 'Cricket #12-14', 'Grasshopper #10-12'],
        notes: 'Peak terrestrial season. Trico hatches dawn (6-7am) with heavy spinner falls. Fish deep during hot midday. Water temp 72-74°F; lowest oxygen.',
      },
      // September
      {
        month: 9,
        insects: ['Terrestrials (Ants, Beetles, Crickets)', 'BWO (early fall), Caddis (late)'],
        dryFlies: ['Ant #16-18', 'Beetle #14-16', 'Cricket #12-14', 'BWO #16-18 (late month)'],
        nymphs: ['Caddis Pupa #14-16', 'BWO Nymph #16 (late month)'],
        streamers: [],
        terrestrials: ['Ant #16-18', 'Beetle #14-16', 'Cricket #12-14', 'Grasshopper #10-12'],
        notes: 'Fall cooling improves fishing; water temp drops to 68-72°F. Terrestrial patterns still excellent. BWO returns late month. Nymph fishing improves mid-month.',
      },
      // October
      {
        month: 10,
        insects: ['Blue Winged Olives (fall), Caddis (Sedges)', 'Small Stoneflies'],
        dryFlies: ['BWO #16-18', 'Elk Hair Caddis #14-16', 'Parachute Adams #14-16'],
        nymphs: ['BWO Nymph #16-18', 'Caddis Larva #14', 'Hare\'s Ear #14'],
        streamers: ['Woolly Bugger #8-10 (black, olive)', 'Sculpin #6-8'],
        terrestrials: [],
        notes: 'Fall hatch peak; water temp 60-68°F. Strong BWO emergence afternoon (2-5pm). Streamer fishing excellent dawn/dusk. Excellent month for all methods.',
      },
      // November
      {
        month: 11,
        insects: ['Blue Winged Olives (fall)', 'Small Stoneflies', 'Midges (late month)'],
        dryFlies: ['BWO #16-18', 'Parachute Adams #14-16'],
        nymphs: ['BWO Nymph #16-18', 'Hare\'s Ear #14', 'Zebra Midge #18-20 (late month)'],
        streamers: ['Woolly Bugger #8-10', 'Sculpin #6-8', 'Muddler Minnow #6-8'],
        terrestrials: [],
        notes: 'Water temp 50-60°F; BWO afternoon hatches continue early month. Streamers productive as water cools. Transition to winter patterns mid-month.',
      },
      // December
      {
        month: 12,
        insects: ['Midges (Diptera)', 'Winter Stoneflies (Capniidae)'],
        dryFlies: ["Griffith's Gnat #18-22", 'Parachute Midge #20'],
        nymphs: ['Zebra Midge #18-20', 'San Juan Worm #12-16', 'Midge Larva #20'],
        streamers: ['Woolly Bugger #8-10 (black)', 'Streamer patterns'],
        terrestrials: [],
        notes: 'Winter patterns dominate. Tailwater unfrozen; midges and worms most productive. Dead-drift nymphs early morning. Water temp 38-48°F.',
      },
    ],
  },

  {
    waterBody: 'Savage River',
    region: 'Western MD (Garrett County)',
    waterType: 'tailwater',
    lastUpdated: '2026-04-04',
    source: 'Savage River Fly Club, Mountain Laurel Fly Fishers',
    entries: [
      // January
      {
        month: 1,
        insects: ['Midges (Diptera)', 'Winter Stoneflies (Capniidae)'],
        dryFlies: ["Griffith's Gnat #18-22", 'CDC Midge #20'],
        nymphs: ['Zebra Midge #18-20', 'Midge Larva #20', 'BH Stonefly Nymph #16'],
        streamers: [],
        terrestrials: [],
        notes: 'Coldest tailwater in MD; often partially iced over. Fish protected deep holes. Water temp 34-38°F. Limited fishing window.',
      },
      // February
      {
        month: 2,
        insects: ['Winter Stoneflies (Capniidae)', 'Early Quill Gordons (late month)'],
        dryFlies: ['Winter Stonefly #14', 'Parachute Quill Gordon #14 (late month)'],
        nymphs: ['BH Stonefly Nymph #14-16', 'Hare\'s Ear #14'],
        streamers: [],
        terrestrials: [],
        notes: 'Water temp 36-44°F. Late February brings early season activity. Fish nymphs deep over rocks. Winter stonefly nymphs dislodge in current.',
      },
      // March
      {
        month: 3,
        insects: ['Quill Gordons (Epeorus)', 'Little Blue Duns (Baetis early)', 'Winter Stoneflies'],
        dryFlies: ['Parachute Quill Gordon #14', 'Hare\'s Ear #14', 'Little Blue Dun #16-18'],
        nymphs: ['Quill Gordon Nymph #12-14', 'Hare\'s Ear #14', 'BH Stonefly Nymph #14'],
        streamers: ['Woolly Bugger #8-10 (olive)'],
        terrestrials: [],
        notes: 'Spring thaw; expect high water late month. Water temp 44-52°F. Nymph fishing most reliable. Lower Savage very good early month.',
      },
      // April
      {
        month: 4,
        insects: ['Quill Gordons', 'Blue Winged Olives (early)', 'Little Brown Stoneflies', 'Hendricksons (early)'],
        dryFlies: ['Parachute Quill Gordon #14', 'BWO #16-18', 'Elk Hair Caddis #14', 'Hendrickson #12-14'],
        nymphs: ['Hendrickson Nymph #12-14', 'Hare\'s Ear #14', 'Stonefly Nymph #12-14'],
        streamers: ['Sculpin #6-8', 'Woolly Bugger #8-10'],
        terrestrials: [],
        notes: 'Peak spring fishing; high water from snowmelt mid-month. Water temp 52-60°F. Nymphs and streamers best. Wet fly swing productive.',
      },
      // May
      {
        month: 5,
        insects: ['Sulphurs (Ephemerella)', 'Caddis (multiple)', 'Hendricksons', 'Slate Drakes (late)'],
        dryFlies: ['Sulphur #14-16', 'Cinnamon Caddis #14', 'Hendrickson #12-14'],
        nymphs: ['Sulphur Nymph #14', 'Caddis Pupa #14'],
        streamers: [],
        terrestrials: [],
        notes: 'Excellent fishing; water temp 60-65°F. Morning Sulphur hatches (11am-2pm). Evening spinner falls. Dry fly action peak of season.',
      },
      // June
      {
        month: 6,
        insects: ['Sulphurs (afternoon)', 'Caddis (Sedges)', 'Slate Drakes', 'Terrestrials (Ants, Beetles)'],
        dryFlies: ['Sulphur Spinner #16', 'Slate Drake #12-14', 'Elk Hair Caddis #14', 'Black Ant #16'],
        nymphs: ['Caddis Pupa #14-16', 'Slate Drake Nymph #12'],
        streamers: [],
        terrestrials: ['Ant #16-18', 'Beetle #16'],
        notes: 'Water temp 65-70°F. Afternoon Sulphur spinner falls excellent. Slate Drake emergence late afternoon. Terrestrials supplement dry fly diet.',
      },
      // July
      {
        month: 7,
        insects: ['Terrestrials (Ants, Beetles, Grasshoppers)', 'Sulphurs (spinners)', 'Caddis', 'Yellow Stoneflies (evening)'],
        dryFlies: ['Black Ant #16-18', 'Beetle #14-16', 'Hopper #10-12', 'Sulphur Spinner #16'],
        nymphs: ['Caddis Pupa #14-16', 'Yellow Stonefly Nymph #14'],
        streamers: ['Woolly Bugger #8-10 (olive, brown)'],
        terrestrials: ['Ant #16-18', 'Beetle #14-16', 'Hopper #10-12'],
        notes: 'Water temp 70-72°F; challenging month. Early morning (6-9am) and dusk fishing best. Terrestrials excellent on sunny, warm afternoons.',
      },
      // August
      {
        month: 8,
        insects: ['Terrestrials (Ants, Beetles, Crickets)', 'Tricos (pre-dawn)', 'Small Caddis'],
        dryFlies: ['Black Ant #16-18', 'Beetle #14-16', 'Cricket #12-14', 'Trico Spinner #22-24'],
        nymphs: ['Trico Nymph #22', 'Caddis Pupa #14-16', 'Inchworm #12'],
        streamers: [],
        terrestrials: ['Ant #16-18', 'Beetle #14-16', 'Cricket #12-14'],
        notes: 'Peak terrestrial season. Trico spinner falls dawn (6-7am) very prolific. Water temp 70-72°F. Fish nymphs deep in heat.',
      },
      // September
      {
        month: 9,
        insects: ['Terrestrials (Ants, Beetles)', 'Blue Winged Olives (late), Caddis'],
        dryFlies: ['Black Ant #16-18', 'Beetle #14-16', 'BWO #16-18 (late month)', 'Elk Hair Caddis #14'],
        nymphs: ['Caddis Pupa #14-16', 'BWO Nymph #16 (late month)'],
        streamers: [],
        terrestrials: ['Ant #16-18', 'Beetle #14-16'],
        notes: 'Water temp cools to 65-68°F by month\'s end. Terrestrials still productive. Transition to fall patterns late September.',
      },
      // October
      {
        month: 10,
        insects: ['Blue Winged Olives (fall)', 'Caddis (Sedges)', 'Small Stoneflies', 'Yellow Sallies (early)'],
        dryFlies: ['BWO #16-18', 'Elk Hair Caddis #14-16', 'Parachute Adams #14-16'],
        nymphs: ['BWO Nymph #16-18', 'Caddis Larva #14', 'Hare\'s Ear #14'],
        streamers: ['Woolly Bugger #8-10', 'Sculpin #6-8'],
        terrestrials: [],
        notes: 'Excellent fishing; water temp 56-64°F. Fall hatches strong. BWO afternoon emergences (2-5pm). Streamer fishing productive dawn/dusk.',
      },
      // November
      {
        month: 11,
        insects: ['Blue Winged Olives (fall)', 'Small Stoneflies', 'Midges (late month)'],
        dryFlies: ['BWO #16-18', 'Parachute Adams #14', 'Midge #20 (late month)'],
        nymphs: ['BWO Nymph #16-18', 'Hare\'s Ear #14', 'Midge Larva #20'],
        streamers: ['Woolly Bugger #8-10', 'Sculpin #6-8'],
        terrestrials: [],
        notes: 'Water temp drops to 48-56°F. BWO hatches continue early month. Streamers productive mid-day. Winter patterns dominate late month.',
      },
      // December
      {
        month: 12,
        insects: ['Midges (Diptera)', 'Winter Stoneflies'],
        dryFlies: ["Griffith's Gnat #18-22", 'Midge #20'],
        nymphs: ['Zebra Midge #18-20', 'Midge Larva #20', 'BH Stonefly Nymph #16'],
        streamers: ['Woolly Bugger #8-10 (black, olive)'],
        terrestrials: [],
        notes: 'Coldest month; water temp 34-42°F. Midges primary food source. Dead drift nymphs. Limited fishing window in mornings.',
      },
    ],
  },

  {
    waterBody: 'Deep Creek Lake',
    region: 'Western MD (Garrett County)',
    waterType: 'lake',
    lastUpdated: '2026-04-04',
    source: 'Deep Creek Lake Resort, MD DNR Fisheries',
    entries: [
      // January (No fly-specific data; lake fishing uses bait/lures primarily)
      {
        month: 1,
        insects: [],
        dryFlies: [],
        nymphs: ['Leech pattern #6-8 (black, brown)'],
        streamers: ['Woolly Bugger #6-8', 'Muddler Minnow #6-8'],
        terrestrials: [],
        notes: 'Winter; anglers fish deep with shiners, crawfish, or streamers. Lakes don\'t have traditional hatches. Jig/worm combos effective.',
      },
      // February
      {
        month: 2,
        insects: [],
        dryFlies: [],
        nymphs: [],
        streamers: ['Woolly Bugger #6-8 (black, olive)', 'Leech #6-8'],
        terrestrials: [],
        notes: 'Cold water; fish deep structures. Slow presentations (drop shot, jigs). Trophy largemouth move shallower by late Feb.',
      },
      // March
      {
        month: 3,
        insects: [],
        dryFlies: [],
        nymphs: [],
        streamers: ['Woolly Bugger #6-8', 'Shad imitation #4-6', 'Leech #6-8'],
        terrestrials: [],
        notes: 'Spring spawn begins; bass move shallow (4-8ft). Crawfish imitations effective. Water temp 45-55°F.',
      },
      // April
      {
        month: 4,
        insects: [],
        dryFlies: [],
        nymphs: [],
        streamers: ['Shad imitation #4-6', 'Crawfish imitation #6-8', 'Frog imitation (floating)'],
        terrestrials: [],
        notes: 'Peak spawn; topwater, crankbaits, and streamers in shallows. Panfish beds active. Water temp 55-65°F.',
      },
      // May
      {
        month: 5,
        insects: [],
        dryFlies: [],
        nymphs: [],
        streamers: ['Shad imitation #4-6', 'Crayfish imitation #6-8'],
        terrestrials: [],
        notes: 'Post-spawn; fish deeper structure (15-25ft). Jigs, worms, swimbaits. Crappie and bluegill excellent. Water temp 65-72°F.',
      },
      // June
      {
        month: 6,
        insects: [],
        dryFlies: [],
        nymphs: [],
        streamers: ['Shad imitation #4-6', 'Leech #6-8'],
        terrestrials: [],
        notes: 'Summer; fish thermocline (18-25ft). Swimbaits, jigs, soft plastics. Bass move deep. Panfish throughout day. Water temp 72-75°F.',
      },
      // July
      {
        month: 7,
        insects: [],
        dryFlies: [],
        nymphs: [],
        streamers: ['Leech #6-8 (black)', 'Shad imitation #4-6'],
        terrestrials: [],
        notes: 'Peak heat; stratification pronounced. Fish deep structure. Night fishing productive (bass). Catfish active all night. Water temp 75-78°F.',
      },
      // August
      {
        month: 8,
        insects: [],
        dryFlies: [],
        nymphs: [],
        streamers: ['Leech #6-8', 'Shad imitation #4-6', 'Frog (evening)'],
        terrestrials: [],
        notes: 'Summer peak; fish deep day, shallower evening. Soft plastics and jigs. Topwater at dusk. Catfish and stripers active. Water temp 74-78°F.',
      },
      // September
      {
        month: 9,
        insects: [],
        dryFlies: [],
        nymphs: [],
        streamers: ['Shad imitation #4-6', 'Crawfish #6-8', 'Leech #6-8'],
        terrestrials: [],
        notes: 'Fall cooling; fish begin shallowing. Topwater, swimbaits, crankbaits. Bluefish and stripers increase activity. Water temp 70-72°F.',
      },
      // October
      {
        month: 10,
        insects: [],
        dryFlies: [],
        nymphs: [],
        streamers: ['Shad imitation #4-6', 'Crawfish #6-8', 'Frog (topwater)'],
        terrestrials: [],
        notes: 'Prime fall fishing; bass active all day. Shallow structure productive. Crawfish patterns excellent. Water temp 62-68°F.',
      },
      // November
      {
        month: 11,
        insects: [],
        dryFlies: [],
        nymphs: [],
        streamers: ['Shad imitation #4-6', 'Leech #6-8', 'Crawfish #6-8'],
        terrestrials: [],
        notes: 'Late fall; bass and stripers feeding heavily before winter. Swimbaits, jigs, crankbaits. Water temp 55-60°F.',
      },
      // December
      {
        month: 12,
        insects: [],
        dryFlies: [],
        nymphs: [],
        streamers: ['Leech #6-8 (black)', 'Shad imitation #4-6', 'Jigs with worms'],
        terrestrials: [],
        notes: 'Winter; fish deep again. Slow presentations. Catfish active with stink bait. Bass deep (20-30ft). Water temp 45-50°F.',
      },
    ],
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// CHESAPEAKE BAY SEASONAL BAIT & LURE GUIDE
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Bait and lure recommendations for Chesapeake Bay and tidal waters.
 * Indexed by species and month for quick lookups by AI chat.
 */
export const CHESAPEAKE_BAIT_GUIDE: BaitRecommendation[] = [
  // STRIPED BASS (Rockfish) — Trophy/Spring Run
  {
    id: 'striped_bass_jan_trophy',
    species: 'striped_bass',
    waterType: 'tidal',
    region: 'chesapeake',
    months: [1, 2, 3],
    method: 'any',
    primaryBait: ['Live eels (8-12")', 'Cut menhaden (chunks)', 'Live herring'],
    primaryFlies: [],
    primaryLures: ['Parachute jigs (1/2-1oz, white/chartreuse)', 'Umbrella rigs (5-7 hook)', 'Shad rakes (1/2-1oz)'],
    conditions: 'Winter trophy season; fish deep structure, channel ledges, oyster bars. Best at slack tide (current changes). Water temp 40-48°F.',
    waterTemp: '40-48°F',
    confidence: 'high',
    source: 'MD DNR Fisheries, Chesapeake Bay Program',
    amazonProducts: [],
  },
  {
    id: 'striped_bass_apr_spring',
    species: 'striped_bass',
    waterType: 'tidal',
    region: 'chesapeake',
    months: [4],
    method: 'any',
    primaryBait: ['Live spot (4-6")', 'Bloodworms (bunches)', 'Peeler crabs (soft-shell)'],
    primaryFlies: [],
    primaryLures: ['Soft plastics (swim shad 4-6", Exo shad)', 'BFG rigs (bucktail + teaser)', 'Topwater plugs (early/late)'],
    conditions: 'Spring catch-and-release season (closed to harvest); intense feeding as rockfish migrate upriver. Best at tidal changes. Water temp 50-56°F.',
    waterTemp: '50-56°F',
    confidence: 'high',
    source: 'MD DNR Fisheries',
    amazonProducts: [],
  },
  {
    id: 'striped_bass_may_jun_harvest',
    species: 'striped_bass',
    waterType: 'tidal',
    region: 'chesapeake',
    months: [5, 6],
    method: 'any',
    primaryBait: ['Live spot', 'Live menhaden', 'Peeler crabs'],
    primaryFlies: [],
    primaryLures: ['Topwater (Whopper Plopper #90-100, walking)', 'BFG rigs (bucktail)', 'Soft plastics (swim shad)'],
    conditions: 'Prime season; fish shallows early/late, deep mid-day. Topwater explosive at dawn (5-7am) and dusk (7-9pm). Slack water productive. Water temp 62-70°F.',
    waterTemp: '62-70°F',
    confidence: 'high',
    source: 'MD DNR Fisheries, Bay Anglers Association',
    amazonProducts: [],
  },
  {
    id: 'striped_bass_jul_aug',
    species: 'striped_bass',
    waterType: 'tidal',
    region: 'chesapeake',
    months: [7, 8],
    method: 'any',
    primaryBait: ['Live menhaden', 'Live spot (small)', 'Squid strips'],
    primaryFlies: [],
    primaryLures: ['Jigging spoons (1/2-1oz, silver/white)', 'Bucktail jigs (1/2-1oz)', 'Soft plastics (swim shad, 4-5")'],
    conditions: 'Summer; fish deep structure during day (40-60ft). Chumming effective at anchor. Early morning/late evening shallower. Water temp 76-80°F; use lighter tackle.',
    waterTemp: '76-80°F',
    confidence: 'medium',
    source: 'MD DNR Fisheries',
    amazonProducts: [],
  },
  {
    id: 'striped_bass_sep_oct_fall_blitz',
    species: 'striped_bass',
    waterType: 'tidal',
    region: 'chesapeake',
    months: [9, 10],
    method: 'any',
    primaryBait: ['Live spot', 'Live eels', 'Live herring'],
    primaryFlies: [],
    primaryLures: ['Jigging spoons (1/2-1oz)', 'Umbrella rigs (5-7 hook)', 'Topwater (early/late)', 'Soft plastics'],
    conditions: 'Fall blitz; aggressive feeding as rockfish prepare for winter. All methods productive. Fish shallows. Best at tidal changes. Water temp 68-74°F.',
    waterTemp: '68-74°F',
    confidence: 'high',
    source: 'MD DNR Fisheries, Bay Anglers Association',
    amazonProducts: [],
  },
  {
    id: 'striped_bass_nov_dec_fall_late',
    species: 'striped_bass',
    waterType: 'tidal',
    region: 'chesapeake',
    months: [11, 12],
    method: 'any',
    primaryBait: ['Live eels', 'Cut menhaden', 'Live herring'],
    primaryFlies: [],
    primaryLures: ['Parachute jigs (1/2-1oz)', 'Heavy spoons (1-2oz, flutter)', 'Shad rakes'],
    conditions: 'Late fall; fish moving deep for winter. Anchor on structure, fish bottom. Slow presentations. Water temp 50-60°F.',
    waterTemp: '50-60°F',
    confidence: 'high',
    source: 'MD DNR Fisheries',
    amazonProducts: [],
  },

  // WHITE PERCH
  {
    id: 'white_perch_spring',
    species: 'white_perch',
    waterType: 'tidal',
    region: 'chesapeake',
    months: [3, 4, 5],
    method: 'any',
    primaryBait: ['Live minnows (2-3")', 'Grass shrimp', 'Bloodworms'],
    primaryFlies: [],
    primaryLures: ['Small jigs (1/8-1/4oz, white/chartreuse)', 'Small crankbaits (1-2", shad pattern)', 'Spinners (small, silver)'],
    conditions: 'Spring migration upriver; prolific. Fish shallows, grass beds, current breaks. Schooling; catch many. Water temp 50-62°F.',
    waterTemp: '50-62°F',
    confidence: 'high',
    source: 'MD DNR Fisheries',
    amazonProducts: [],
  },
  {
    id: 'white_perch_summer_deep',
    species: 'white_perch',
    waterType: 'tidal',
    region: 'chesapeake',
    months: [6, 7, 8],
    method: 'any',
    primaryBait: ['Live minnows', 'Squid strips'],
    primaryFlies: [],
    primaryLures: ['Small bucktail jigs (1/8-1/4oz)', 'Small soft plastics (2-3")', 'Jigging spoons (1/4oz)'],
    conditions: 'Summer; fish deeper (15-30ft) mid-day. Early morning/late evening shallower. Vertical jigging productive. Water temp 70-78°F.',
    waterTemp: '70-78°F',
    confidence: 'medium',
    source: 'MD DNR Fisheries',
    amazonProducts: [],
  },

  // YELLOW PERCH (Nontidal freshwater)
  {
    id: 'yellow_perch_nontidal_spring',
    species: 'yellow_perch',
    waterType: 'nontidal',
    region: 'western_md',
    months: [3, 4, 5],
    method: 'bait',
    primaryBait: ['Live minnows (small shiners)', 'Grass shrimp', 'Bloodworms'],
    primaryFlies: [],
    primaryLures: ['Small jigs (1/8-1/4oz)', 'Spinners (small)', 'Crankbaits (1-2")'],
    conditions: 'Spring spawning run; prolific schooling in shallows. Fish weed beds, creek mouths, rocky areas. Early morning/late evening best. Water temp 50-60°F.',
    waterTemp: '50-60°F',
    confidence: 'high',
    source: 'MD DNR Fisheries',
    amazonProducts: [],
  },

  // CATFISH (Year-round, all waters)
  {
    id: 'catfish_year_round',
    species: 'catfish',
    waterType: 'both',
    region: 'maryland',
    months: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12],
    method: 'bait',
    primaryBait: ['Chicken liver', 'Cut bait (shad, mackerel)', 'Stink bait (commercial)', 'Live shiners', 'Worms (night crawler bunches)'],
    primaryFlies: [],
    primaryLures: [],
    conditions: 'Year-round; noctural (night fishing best). Fish deep holes, undercut banks, near structure. Baited lines. Summer peaks; winter slower. Water temp 40-78°F depending on season.',
    waterTemp: '40-78°F',
    confidence: 'high',
    source: 'MD DNR Fisheries',
    amazonProducts: [],
  },

  // BROWN TROUT (Nontidal, cold streams)
  {
    id: 'brown_trout_nontidal',
    species: 'brown_trout',
    waterType: 'nontidal',
    region: 'gunpowder_savage',
    months: [3, 4, 5, 10, 11],
    method: 'any',
    primaryBait: ['Worms (night crawlers)', 'PowerBait (white, chartreuse)', 'Salmon eggs'],
    primaryFlies: ['Woolly Bugger #6-10', 'BH Pheasant Tail #14-16', 'Hare\'s Ear #14-16'],
    primaryLures: ['Spinners (small, gold/silver)', 'Rooster Tails #4-6', 'Small spoons (1/8-1/4oz)'],
    conditions: 'Spring/Fall peaks (cooler water). Dawn/dusk most productive. Fish pocket water, drop-offs. Hatch-matching important. Water temp 50-65°F.',
    waterTemp: '50-65°F',
    confidence: 'high',
    source: 'MD DNR Fisheries, Local fly clubs',
    amazonProducts: [],
  },

  // LARGEMOUTH BASS (Nontidal lakes and rivers)
  {
    id: 'largemouth_bass_spring',
    species: 'largemouth_bass',
    waterType: 'nontidal',
    region: 'deep_creek_lakes',
    months: [3, 4, 5],
    method: 'any',
    primaryBait: ['Live shiners (3-5")', 'Live crawfish', 'Worms (night crawler)'],
    primaryFlies: [],
    primaryLures: ['Crankbaits (shallow, 1-3")', 'Topwater (prop baits, walking)', 'Soft plastics (Senko, worm)', 'Spinnerbaits (white, chartreuse)'],
    conditions: 'Spring spawn; active shallow (2-6ft) around vegetation, docks, rocks. Dawn/dusk peak. Water temp 55-68°F.',
    waterTemp: '55-68°F',
    confidence: 'high',
    source: 'MD DNR Fisheries',
    amazonProducts: [],
  },
  {
    id: 'largemouth_bass_summer',
    species: 'largemouth_bass',
    waterType: 'nontidal',
    region: 'deep_creek_lakes',
    months: [6, 7, 8],
    method: 'any',
    primaryBait: ['Live shiners (small)', 'Live crawfish'],
    primaryFlies: [],
    primaryLures: ['Soft plastics (drop shot, Texas rig)', 'Jigs (1/2-1oz)', 'Swimbaits (4-6")', 'Topwater (evening)'],
    conditions: 'Summer; bass deep (10-20ft) mid-day, shallower early/late. Vertical jigging productive. Night fishing excellent. Water temp 76-82°F.',
    waterTemp: '76-82°F',
    confidence: 'high',
    source: 'MD DNR Fisheries',
    amazonProducts: [],
  },
  {
    id: 'largemouth_bass_fall',
    species: 'largemouth_bass',
    waterType: 'nontidal',
    region: 'deep_creek_lakes',
    months: [9, 10],
    method: 'any',
    primaryBait: ['Live shiners', 'Live crawfish'],
    primaryFlies: [],
    primaryLures: ['Crankbaits', 'Soft plastics', 'Topwater', 'Spinnerbaits', 'Jigs'],
    conditions: 'Fall feeding blitz; all methods productive. Shallow structure throughout day. Water temp 62-72°F.',
    waterTemp: '62-72°F',
    confidence: 'high',
    source: 'MD DNR Fisheries',
    amazonProducts: [],
  },

  // BLUEFISH (Tidal, summer/fall)
  {
    id: 'bluefish_summer_fall',
    species: 'bluefish',
    waterType: 'tidal',
    region: 'chesapeake',
    months: [7, 8, 9, 10],
    method: 'any',
    primaryBait: ['Live menhaden', 'Live spot', 'Squid chunks'],
    primaryFlies: [],
    primaryLures: ['Bucktail jigs (1/2-1oz)', 'Metal spoons (1/2-1oz)', 'Topwater (pencil poppers)', 'Soft plastics (swim shad)'],
    conditions: 'Aggressive predators; explosive strikes. Fish shallows chasing baitfish pods. Chumming very effective. Water temp 72-78°F.',
    waterTemp: '72-78°F',
    confidence: 'high',
    source: 'MD DNR Fisheries, Bay Anglers Association',
    amazonProducts: [],
  },

  // FLOUNDER (Summer tidal)
  {
    id: 'flounder_summer',
    species: 'flounder',
    waterType: 'tidal',
    region: 'chesapeake',
    months: [6, 7, 8, 9],
    method: 'any',
    primaryBait: ['Live spot', 'Squid strips', 'Bloodworms (bunches)'],
    primaryFlies: [],
    primaryLures: ['Bucktail jigs (1/4-1/2oz)', 'Soft plastics (paddle tail 3-4")', 'Jigging spoons (1/4-1/2oz)'],
    conditions: 'Bottom feeders; fish deep holes, sandy bottoms, channel edges. Slow presentations, dragging. Water temp 72-76°F.',
    waterTemp: '72-76°F',
    confidence: 'high',
    source: 'MD DNR Fisheries',
    amazonProducts: [],
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// HELPER FUNCTIONS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Get bait/fly recommendations for a specific species, month, and optional method.
 *
 * @param species Target species name (e.g., 'striped_bass', 'brown_trout')
 * @param month Current month (1-12)
 * @param method Optional fishing method filter ('bait', 'fly', 'lure')
 * @returns Array of matching BaitRecommendation objects
 *
 * @example
 * const recs = getRecommendationsForSpecies('striped_bass', 5, 'lure');
 * // Returns all lure recommendations for striped bass in May
 */
export function getRecommendationsForSpecies(
  species: string,
  month: number,
  method?: 'bait' | 'fly' | 'lure'
): BaitRecommendation[] {
  return CHESAPEAKE_BAIT_GUIDE.filter((rec) => {
    const matchesSpecies = rec.species.toLowerCase() === species.toLowerCase();
    const matchesMonth = rec.months.includes(month);
    const matchesMethod = !method || rec.method === 'any' || rec.method === method;
    return matchesSpecies && matchesMonth && matchesMethod;
  });
}

/**
 * Get the hatch chart for a specific water body.
 *
 * @param waterBody Water body name (e.g., 'Gunpowder Falls', 'Savage River')
 * @returns HatchChart object, or undefined if not found
 *
 * @example
 * const chart = getHatchChart('Gunpowder Falls');
 * if (chart) {
 *   console.log(`Peak month: ${chart.entries[4].insects}`); // May
 * }
 */
export function getHatchChart(waterBody: string): HatchChart | undefined {
  return MARYLAND_HATCH_CHARTS.find((chart) => chart.waterBody.toLowerCase() === waterBody.toLowerCase());
}

/**
 * Get current month's hatch entries for a water body.
 *
 * @param waterBody Water body name
 * @param month Optional month (1-12); defaults to current month
 * @returns HatchEntry for the given month, or undefined if water body not found
 *
 * @example
 * const hatch = getCurrentHatch('Gunpowder Falls', 5); // May
 * console.log(`Dry flies: ${hatch?.dryFlies}`); // Sulphur #14-16, etc.
 */
export function getCurrentHatch(waterBody: string, month?: number): HatchEntry | undefined {
  const chart = getHatchChart(waterBody);
  if (!chart) return undefined;

  const targetMonth = month ?? new Date().getMonth() + 1;
  return chart.entries[targetMonth - 1]; // Array is 0-indexed
}

/**
 * Get seasonal bait guide for a given month and optional water type.
 *
 * @param month Target month (1-12)
 * @param waterType Optional filter ('tidal', 'nontidal')
 * @returns Array of BaitRecommendation objects active in that month
 *
 * @example
 * const baits = getSeasonalBaitGuide(10, 'tidal');
 * // Returns all tidal bait recommendations for October (fall blitz season)
 */
export function getSeasonalBaitGuide(month: number, waterType?: 'tidal' | 'nontidal'): BaitRecommendation[] {
  return CHESAPEAKE_BAIT_GUIDE.filter((rec) => {
    const matchesMonth = rec.months.includes(month);
    const matchesWaterType = !waterType || rec.waterType === 'both' || rec.waterType === waterType;
    return matchesMonth && matchesWaterType;
  });
}
