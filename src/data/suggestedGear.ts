/**
 * suggestedGear.ts — AI-powered gear and fly suggestions for chat recommendations
 *
 * This module provides the data layer for when the AI chat suggests specific
 * gear, flies, lures, or equipment in response to user questions. Unlike the
 * curated "My Picks" screens (which show David's personal loadouts), this file
 * maps common fishing/hunting scenarios to specific product recommendations
 * that the AI can reference in chat responses.
 *
 * Examples:
 *   "What fly should I use on the Gunpowder in April?" → Euro nymph patterns + affiliate links
 *   "What broadhead do you recommend for whitetail?" → G5 Deadmeat V2 + affiliate link
 *   "Best turkey call for spring season?" → Specific call recommendations + links
 *
 * All Amazon links use affiliate tag matching ASSOCIATE_TAG in amazonAffiliateService.ts.
 *
 * @module Data
 */

import { AmazonProductRef } from '../types/gear';

// ─────────────────────────────────────────────────────────────────────────────
// CONSTANTS
// ─────────────────────────────────────────────────────────────────────────────

const TAG = 'mdoutdoors1-20';

function amazonUrl(asin: string): string {
  return `https://www.amazon.com/dp/${asin}?tag=${TAG}`;
}

// ─────────────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────────────

/** A single product suggestion the AI can reference in a chat response */
export interface AISuggestion {
  /** Product name */
  name: string;
  /** Why the AI recommends this — conversational tone */
  reason: string;
  /** Product category for matching */
  category: AmazonProductRef['category'];
  /** Price range string */
  price: string;
  /** Amazon affiliate URL */
  url: string;
  /** Amazon ASIN for tracking */
  asin: string;
  /** Optional personal endorsement from David */
  personalNote?: string;
}

/** A scenario-based suggestion group the AI chat can match against */
export interface AISuggestionGroup {
  /** Unique ID for this suggestion group */
  id: string;
  /** Keywords that trigger this group (lowercase) */
  triggers: string[];
  /** Activity mode */
  mode: 'fish' | 'hunt';
  /** Target species (optional — some are general) */
  species?: string;
  /** Region or water body (optional) */
  region?: string;
  /** Months when this is most relevant (1-12), empty = year-round */
  months: number[];
  /** Method filter */
  method?: string;
  /** Brief intro the AI can use before listing products */
  chatIntro: string;
  /** Product suggestions */
  suggestions: AISuggestion[];
  /** Follow-up questions the AI can offer */
  followUps: string[];
}

// ═══════════════════════════════════════════════════════════════════════════════
// FLY FISHING SUGGESTIONS
// ═══════════════════════════════════════════════════════════════════════════════

const flyFishingSuggestions: AISuggestionGroup[] = [
  // ── Euro Nymphing / Tight-Line (Gunpowder, year-round) ──
  {
    id: 'euro_nymph_gunpowder',
    triggers: ['euro nymph', 'tight line', 'gunpowder', 'nymph', 'euro', 'czech nymph'],
    mode: 'fish',
    species: 'trout',
    region: 'gunpowder',
    months: [],
    method: 'fly',
    chatIntro: "Euro nymphing is the most productive technique on the Gunpowder. Here's what I fish with:",
    suggestions: [
      {
        name: 'Echo Shadow II 10\'6" 3wt',
        reason: "My go-to euro nymphing rod. The 10'6\" length gives you the reach you need for tight-line presentations on the Gunpowder.",
        category: 'tackle',
        price: '$200-250',
        url: `https://www.amazon.com/s?k=Echo+Shadow+II+Euro+Nymph+Rod&tag=${TAG}`,
        asin: 'B07FKWG7GJ',
        personalNote: "This is the rod I fish 90% of the time on the Gunpowder. Sensitive enough to feel takes at depth.",
      },
      {
        name: 'Perdigon Nymphs (Assorted 12-pack)',
        reason: 'Perdigons sink fast and work in all seasons. The tungsten bead gets them to the bottom quickly in the Gunpowder riffles.',
        category: 'fly',
        price: '$8-15',
        url: `https://www.amazon.com/s?k=Perdigon+Nymphs+Tungsten+Bead+12+pack&tag=${TAG}`,
        asin: 'B0BXMWQZ7K',
      },
      {
        name: 'Frenchie Nymphs (Assorted 12-pack)',
        reason: "The Frenchie is a euro nympher's bread and butter. The hot spot collar triggers strikes when nothing else works.",
        category: 'fly',
        price: '$8-15',
        url: `https://www.amazon.com/s?k=Frenchie+Nymphs+Euro+Fly+12+pack&tag=${TAG}`,
        asin: 'B09QKXZ3QM',
      },
      {
        name: 'Walt\'s Worm / Sexy Walt (6-pack)',
        reason: "A crane fly larva imitation — deadly on Gunpowder brown trout, especially in winter and early spring.",
        category: 'fly',
        price: '$7-12',
        url: `https://www.amazon.com/s?k=Walt+Worm+Sexy+Walt+Crane+Fly+Nymph&tag=${TAG}`,
        asin: 'B0C1YMXGFR',
      },
      {
        name: 'Cortland Euro Nymph Line',
        reason: 'Purpose-built thin euro line with a sighter section. Essential for reading takes with tight-line technique.',
        category: 'tackle',
        price: '$35-45',
        url: `https://www.amazon.com/s?k=Cortland+Euro+Nymph+Line+Sighter&tag=${TAG}`,
        asin: 'B07T2YDXJY',
      },
    ],
    followUps: [
      'What size tippet for euro nymphing?',
      'Best spots on the Gunpowder for trout?',
      'What waders do you recommend?',
    ],
  },

  // ── Spring Dry Fly (March-May) ──
  {
    id: 'spring_dry_fly_md',
    triggers: ['dry fly', 'hatch', 'march brown', 'hendrickson', 'blue quill', 'spring fly', 'surface', 'rising'],
    mode: 'fish',
    species: 'trout',
    months: [3, 4, 5],
    method: 'fly',
    chatIntro: 'Spring hatches on Maryland streams can be incredible. Here are the patterns to have in your box:',
    suggestions: [
      {
        name: 'Parachute Adams (12-pack, sizes 12-18)',
        reason: "The universal dry fly. If you can only carry one dry pattern, this is it — matches almost any mayfly hatch.",
        category: 'fly',
        price: '$8-14',
        url: `https://www.amazon.com/s?k=Parachute+Adams+Dry+Fly+12+pack&tag=${TAG}`,
        asin: 'B0BK7NFHCR',
      },
      {
        name: 'Elk Hair Caddis (12-pack, sizes 14-18)',
        reason: 'Caddis are huge on Maryland streams from April through October. This buoyant pattern floats all day.',
        category: 'fly',
        price: '$8-14',
        url: `https://www.amazon.com/s?k=Elk+Hair+Caddis+Dry+Fly+12+pack&tag=${TAG}`,
        asin: 'B0BK8GJBR5',
      },
      {
        name: 'Blue Wing Olive (BWO) Duns (12-pack)',
        reason: "BWOs hatch on overcast, drizzly days — exactly when most people stay home. That's when the fishing is best.",
        category: 'fly',
        price: '$8-14',
        url: `https://www.amazon.com/s?k=Blue+Wing+Olive+BWO+Dry+Fly+12+pack&tag=${TAG}`,
        asin: 'B0BK7Q8WJT',
      },
      {
        name: 'Woolly Bugger Assortment (12-pack)',
        reason: "Not a dry fly, but throw a black woolly bugger when nothing's hatching. Works on every species in Maryland.",
        category: 'fly',
        price: '$9-15',
        url: `https://www.amazon.com/s?k=Woolly+Bugger+Assortment+Fly+12+pack&tag=${TAG}`,
        asin: 'B07BGCRTPC',
      },
    ],
    followUps: [
      'When do hendricksons hatch on the Gunpowder?',
      'What rod weight for dry fly fishing?',
      'Best dry fly spots in Maryland?',
    ],
  },

  // ── Summer Terrestrials (June-September) ──
  {
    id: 'summer_terrestrials',
    triggers: ['terrestrial', 'hopper', 'ant', 'beetle', 'summer fly', 'grasshopper', 'foam'],
    mode: 'fish',
    species: 'trout',
    months: [6, 7, 8, 9],
    method: 'fly',
    chatIntro: "Summer is terrestrial time on Maryland streams. Bank-side bugs are the main food source when hatches taper off:",
    suggestions: [
      {
        name: 'Foam Hopper Assortment (12-pack)',
        reason: "Drop a hopper tight to the bank and hold on. Summer browns crush these on the Gunpowder, Patuxent, and Savage River.",
        category: 'fly',
        price: '$9-15',
        url: `https://www.amazon.com/s?k=Foam+Hopper+Fly+Assortment+12+pack&tag=${TAG}`,
        asin: 'B0BXNRB8YZ',
      },
      {
        name: 'Flying Ant Patterns (12-pack)',
        reason: "When ants swarm in July and August, trout go nuts. A size 16 black ant can save a slow day.",
        category: 'fly',
        price: '$8-12',
        url: `https://www.amazon.com/s?k=Flying+Ant+Fly+Pattern+12+pack&tag=${TAG}`,
        asin: 'B0BK7KPMCG',
      },
      {
        name: 'Foam Beetle (12-pack, sizes 12-16)',
        reason: "Japanese beetles fall off streamside trees all summer. Trout sip them quietly — look for subtle rises near overhanging branches.",
        category: 'fly',
        price: '$8-12',
        url: `https://www.amazon.com/s?k=Foam+Beetle+Fly+Pattern+12+pack&tag=${TAG}`,
        asin: 'B0BXNQ8K5Y',
      },
    ],
    followUps: [
      'Best summer trout spots in Maryland?',
      'How to fish a hopper-dropper rig?',
      'Water temperature limits for trout?',
    ],
  },

  // ── Streamer Fishing (Fall/Winter, big fish) ──
  {
    id: 'streamer_fishing',
    triggers: ['streamer', 'big trout', 'sculpin', 'articulated', 'fall fly', 'winter fly', 'meat'],
    mode: 'fish',
    species: 'trout',
    months: [10, 11, 12, 1, 2],
    method: 'fly',
    chatIntro: "Streamer season is big fish season. Fall through winter, aggressive browns are feeding up. Here's what to throw:",
    suggestions: [
      {
        name: 'Woolly Bugger Assortment (Olive/Black/White)',
        reason: "The classic. Start with olive and black in size 8-10. Strip, pause, strip — let it swing in the current.",
        category: 'fly',
        price: '$9-15',
        url: `https://www.amazon.com/s?k=Woolly+Bugger+Streamer+Olive+Black+White&tag=${TAG}`,
        asin: 'B08KGZN5JM',
      },
      {
        name: 'Sculpin Streamer Patterns (6-pack)',
        reason: "Sculpin are a primary forage fish on the Gunpowder. A sculpin pattern fished on the bottom is deadly for big browns.",
        category: 'fly',
        price: '$10-16',
        url: `https://www.amazon.com/s?k=Sculpin+Streamer+Fly+Pattern+6+pack&tag=${TAG}`,
        asin: 'B0BXNVR3ZY',
      },
      {
        name: 'Sage 9ft 5wt Foundation Outfit',
        reason: "A 5-weight is the right tool for streamer work. Enough backbone to throw big flies and fight larger fish.",
        category: 'tackle',
        price: '$250-350',
        url: `https://www.amazon.com/s?k=Sage+9ft+5wt+Foundation+Fly+Rod&tag=${TAG}`,
        asin: 'B0CG8DXQX7',
        personalNote: "I carry a Sage 5wt as my second rod for streamers and bigger water. Pairs perfectly with the Echo Shadow II for nymphing.",
      },
    ],
    followUps: [
      'Best streamer retrieval techniques?',
      'Where to find big trout in Maryland?',
      'Sink tip vs floating line for streamers?',
    ],
  },
];

// ═══════════════════════════════════════════════════════════════════════════════
// BASS & FRESHWATER SUGGESTIONS
// ═══════════════════════════════════════════════════════════════════════════════

const bassFreshwaterSuggestions: AISuggestionGroup[] = [
  {
    id: 'bass_soft_plastics',
    triggers: ['bass', 'largemouth', 'smallmouth', 'soft plastic', 'senko', 'worm', 'freshwater lure'],
    mode: 'fish',
    species: 'bass',
    months: [],
    method: 'lure',
    chatIntro: "Soft plastics are the most versatile bass lures in Maryland. Here's what consistently produces:",
    suggestions: [
      {
        name: 'Yamamoto Senko 5" (10-pack, Green Pumpkin)',
        reason: "The Senko is the most consistent bass lure ever made. Wacky rig it and let it fall — bites happen on the drop.",
        category: 'lure',
        price: '$7-10',
        url: `https://www.amazon.com/s?k=Yamamoto+Senko+5+inch+Green+Pumpkin&tag=${TAG}`,
        asin: 'B000ALBJIS',
      },
      {
        name: 'Ned Rig Kit (Z-Man TRD)',
        reason: "The Ned rig catches everything — smallmouth, largemouth, spots. Drag it slowly on the bottom of Deep Creek or Liberty Reservoir.",
        category: 'lure',
        price: '$5-8',
        url: `https://www.amazon.com/s?k=Z-Man+TRD+Ned+Rig+Kit&tag=${TAG}`,
        asin: 'B072BGQYPB',
      },
      {
        name: 'Strike King Rage Craw (6-pack)',
        reason: "Flip a craw into laydowns and docks. The flapping claws drive bass crazy, especially around structure.",
        category: 'lure',
        price: '$5-7',
        url: `https://www.amazon.com/s?k=Strike+King+Rage+Craw+6+pack&tag=${TAG}`,
        asin: 'B003ZZBAIU',
      },
    ],
    followUps: [
      'Best bass lakes in Maryland?',
      'Topwater vs soft plastics — when to use which?',
      'What rod and reel for bass fishing?',
    ],
  },
];

// ═══════════════════════════════════════════════════════════════════════════════
// CHESAPEAKE BAY / SALTWATER SUGGESTIONS
// ═══════════════════════════════════════════════════════════════════════════════

const saltwaterSuggestions: AISuggestionGroup[] = [
  {
    id: 'striper_chesapeake',
    triggers: ['striper', 'striped bass', 'rockfish', 'chesapeake', 'bay fishing', 'jigging'],
    mode: 'fish',
    species: 'striped_bass',
    region: 'chesapeake',
    months: [4, 5, 6, 9, 10, 11],
    chatIntro: "Striped bass are the king of the Chesapeake. Here's what to rig up for rockfish season:",
    suggestions: [
      {
        name: 'BKD Jig Heads (1oz, 3-pack)',
        reason: "Vertical jigging with a bucktail is the classic Chesapeake striper technique. 1oz gets you to the bottom on most Bay structure.",
        category: 'lure',
        price: '$8-12',
        url: amazonUrl('B07GXQY8P5'),
        asin: 'B07GXQY8P5',
      },
      {
        name: 'Gulp! Swimming Mullet (4", Chartreuse)',
        reason: "Tip your jig with a Gulp mullet for extra scent and action. The chartreuse color is money in stained Bay water.",
        category: 'bait',
        price: '$8-11',
        url: `https://www.amazon.com/s?k=Gulp+Swimming+Mullet+4+inch+Chartreuse&tag=${TAG}`,
        asin: 'B001448PEW',
      },
      {
        name: 'Kastmaster Spoon (1oz, Chrome)',
        reason: "For casting from shore or jigging from a boat — the Kastmaster catches stripers, bluefish, and everything in between.",
        category: 'lure',
        price: '$5-8',
        url: `https://www.amazon.com/s?k=Kastmaster+Spoon+1oz+Chrome&tag=${TAG}`,
        asin: 'B00019N8JC',
      },
    ],
    followUps: [
      'What are the 2026 striper regulations?',
      'Best time to fish the Bay for rockfish?',
      'Shore fishing spots for stripers?',
    ],
  },
];

// ═══════════════════════════════════════════════════════════════════════════════
// HUNTING SUGGESTIONS
// ═══════════════════════════════════════════════════════════════════════════════

const huntingSuggestions: AISuggestionGroup[] = [
  // ── Whitetail — Archery / Saddle Hunting ──
  {
    id: 'whitetail_archery_gear',
    triggers: ['broadhead', 'arrow', 'bow', 'archery', 'whitetail gear', 'saddle hunt', 'treestand'],
    mode: 'hunt',
    species: 'whitetail',
    months: [9, 10, 11, 12, 1],
    method: 'archery',
    chatIntro: "For Maryland whitetail archery, here's the setup I trust in the tree:",
    suggestions: [
      {
        name: 'G5 Deadmeat V2 Broadheads (3-pack)',
        reason: "My broadhead of choice. The Deadmeat V2 flies true and leaves massive wound channels. I've taken multiple deer with these.",
        category: 'accessory',
        price: '$40-50',
        url: amazonUrl('B06Y2CN27L'),
        asin: 'B06Y2CN27L',
        personalNote: "These fly like field points out of my bow at 65 lbs. No re-tuning needed.",
      },
      {
        name: 'Victory RIP TKO 400 Arrows (6-pack)',
        reason: "These arrows are consistent and durable. The 400 spine works perfectly at my 65lb/30\" draw setup.",
        category: 'accessory',
        price: '$70-90',
        url: amazonUrl('B0D6Z9S7R4'),
        asin: 'B0D6Z9S7R4',
      },
      {
        name: 'Bear Archery Legit RTH Compound Bow',
        reason: "Very similar to the Species RTH the dev uses (currently unavailable). Ready-to-hunt out of the box, 10-70 lbs draw weight, handles any animal in Maryland.",
        category: 'accessory',
        price: '$299-399',
        url: `https://www.amazon.com/s?k=Bear+Archery+Legit+RTH+Compound+Bow&tag=${TAG}`,
        asin: 'B08NCYY3B2',
        personalNote: "I shoot the Species RTH at 65 lbs / 30\" draw — the Legit is the same platform. Add a Bear Paw Grip (beararchery.com) if you have larger hands.",
      },
      {
        name: 'Tethrd Phantom Saddle',
        reason: "Saddle hunting is the most versatile way to hunt public land. Lighter than a climber and you can set up on any tree.",
        category: 'stand',
        price: '$250-300',
        url: `https://www.amazon.com/s?k=Tethrd+Phantom+Saddle+Hunting&tag=${TAG}`,
        asin: 'B09KMJFKNG',
        personalNote: "I hunt exclusively from a saddle on Maryland public land. Total game changer for mobility.",
      },
    ],
    followUps: [
      'How to set up a saddle hunting system?',
      'Best public land for archery in Maryland?',
      'When is the archery deer season?',
    ],
  },

  // ── Turkey — Spring Season ──
  {
    id: 'spring_turkey_gear',
    triggers: ['turkey call', 'turkey', 'gobbler', 'spring turkey', 'turkey decoy', 'turkey hunting', 'slate call', 'box call', 'mouth call'],
    mode: 'hunt',
    species: 'turkey',
    months: [4, 5],
    chatIntro: "Spring turkey season is all about calling. Here's the call set and gear I bring every hunt:",
    suggestions: [
      {
        name: 'Primos Hook-Up Magnetic Box Call',
        reason: "Best box call on the market for loud, long-range yelps. Use this to locate gobblers at first light.",
        category: 'call',
        price: '$25-35',
        url: `https://www.amazon.com/s?k=Primos+Hook-Up+Magnetic+Box+Call+Turkey&tag=${TAG}`,
        asin: 'B001CJZA38',
      },
      {
        name: 'Woodhaven Ninja Slate Call',
        reason: "For soft calling when a bird is coming in. The slate gives you realistic purrs and clucks at close range.",
        category: 'call',
        price: '$20-30',
        url: `https://www.amazon.com/s?k=Woodhaven+Ninja+Slate+Call+Turkey&tag=${TAG}`,
        asin: 'B00AQLYWB0',
      },
      {
        name: 'Primos Hunting Sonic Dome Mouth Call (3-pack)',
        reason: "Hands-free calling when a gobbler is in range and you need to shoulder the gun. Practice these — they take time to learn.",
        category: 'call',
        price: '$10-15',
        url: `https://www.amazon.com/s?k=Primos+Sonic+Dome+Mouth+Call+Turkey+3+pack&tag=${TAG}`,
        asin: 'B000PKFGTO',
      },
      {
        name: 'Savage 301 Turkey XP 20ga',
        reason: "Single-shot simplicity. The 20 gauge patterns beautifully with TSS loads and weighs almost nothing in the field.",
        category: 'accessory',
        price: '$200-250',
        url: `https://www.amazon.com/s?k=Savage+301+Turkey+XP+20+Gauge&tag=${TAG}`,
        asin: 'B09NQZLHVM',
        personalNote: "My primary turkey gun. The SKU is 23220 — the dedicated turkey model with built-in optic rail.",
      },
      {
        name: 'First Lite Phantom Leafy Suit',
        reason: "Lightweight leafy camo that breaks up your outline. Way better than a blind for run-and-gun turkey hunting.",
        category: 'clothing',
        price: '$100-150',
        url: `https://www.amazon.com/s?k=First+Lite+Phantom+Leafy+Suit+Camo&tag=${TAG}`,
        asin: 'B0CG1KXRYP',
      },
      {
        name: 'BASSDASH Fingerless Hunting Gloves',
        reason: "Your hands are the most visible thing when you're calling. These camo fingerless gloves keep you hidden without losing trigger feel in the warm spring season.",
        category: 'clothing',
        price: '$12-18',
        url: amazonUrl('B0BRP4KZJ3'),
        asin: 'B0BRP4KZJ3',
      },
    ],
    followUps: [
      'When is turkey season in Maryland?',
      'Best public land for turkeys?',
      'How to pattern a turkey shotgun?',
    ],
  },

  // ── Scent Control ──
  {
    id: 'scent_control',
    triggers: ['scent', 'wind', 'ozone', 'scent killer', 'cover scent', 'scent control', 'doe urine'],
    mode: 'hunt',
    species: 'whitetail',
    months: [9, 10, 11, 12, 1],
    chatIntro: "Scent control is critical for Maryland whitetail hunting, especially on pressured public land:",
    suggestions: [
      {
        name: 'Dead Down Wind Field Spray (24oz)',
        reason: "Spray down everything — clothes, boots, gear. The enzyme-based formula actually eliminates odor instead of just masking it.",
        category: 'scent',
        price: '$8-12',
        url: `https://www.amazon.com/s?k=Dead+Down+Wind+Field+Spray+24oz&tag=${TAG}`,
        asin: 'B009OCYIAQ',
      },
      {
        name: 'Code Blue Whitetail Doe Estrous',
        reason: "During the rut (November in Maryland), a drag rag with doe estrous can bring in bucks from downwind.",
        category: 'scent',
        price: '$12-18',
        url: `https://www.amazon.com/s?k=Code+Blue+Whitetail+Doe+Estrous&tag=${TAG}`,
        asin: 'B003E38Z2G',
      },
    ],
    followUps: [
      'When is the rut in Maryland?',
      'How to play the wind on public land?',
      'Best scent-free laundry routine?',
    ],
  },
];

// ═══════════════════════════════════════════════════════════════════════════════
// ALL SUGGESTION GROUPS (merged)
// ═══════════════════════════════════════════════════════════════════════════════

export const ALL_AI_SUGGESTIONS: AISuggestionGroup[] = [
  ...flyFishingSuggestions,
  ...bassFreshwaterSuggestions,
  ...saltwaterSuggestions,
  ...huntingSuggestions,
];

// ═══════════════════════════════════════════════════════════════════════════════
// QUERY FUNCTIONS — Called by AI chat handlers
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Find relevant gear suggestions based on a user's chat query.
 * Returns the best-matching suggestion group, or null if no match.
 *
 * @param query - The user's chat message (lowercase)
 * @param mode - Current activity mode ('fish' or 'hunt')
 * @param month - Current month (1-12) for seasonal relevance
 */
export function getAISuggestions(
  query: string,
  mode: 'fish' | 'hunt',
  month?: number
): AISuggestionGroup | null {
  const q = query.toLowerCase();

  // Filter to matching mode first
  const modeGroups = ALL_AI_SUGGESTIONS.filter(g => g.mode === mode);

  // Score each group by trigger match count
  let bestMatch: AISuggestionGroup | null = null;
  let bestScore = 0;

  for (const group of modeGroups) {
    let score = 0;

    // Count trigger keyword matches
    for (const trigger of group.triggers) {
      if (q.includes(trigger)) {
        // Multi-word triggers get bonus points
        score += trigger.split(' ').length;
      }
    }

    // Seasonal bonus: +1 if current month is in the group's relevant months
    if (month && group.months.length > 0 && group.months.includes(month)) {
      score += 1;
    }

    if (score > bestScore) {
      bestScore = score;
      bestMatch = group;
    }
  }

  return bestScore > 0 ? bestMatch : null;
}

/**
 * Get all suggestion groups for a given species.
 * Useful when the AI knows the species but not the specific scenario.
 */
export function getSuggestionsBySpecies(
  species: string,
  mode: 'fish' | 'hunt'
): AISuggestionGroup[] {
  const s = species.toLowerCase();
  return ALL_AI_SUGGESTIONS.filter(
    g => g.mode === mode && g.species?.toLowerCase().includes(s)
  );
}

/**
 * Format a suggestion group into a chat-friendly text response.
 * Returns markdown-style text the AI can include in its response.
 */
export function formatSuggestionsForChat(group: AISuggestionGroup): string {
  let text = group.chatIntro + '\n\n';

  for (const item of group.suggestions) {
    text += `• **${item.name}** (${item.price})\n`;
    text += `  ${item.reason}\n`;
    if (item.personalNote) {
      text += `  _💬 ${item.personalNote}_\n`;
    }
    text += '\n';
  }

  text += '_As an Amazon Associate, MDHuntFishOutdoors earns from qualifying purchases._';

  return text;
}

/**
 * Get AmazonProductRef objects from a suggestion group.
 * Useful for the tap tracking system in amazonAffiliateService.
 */
export function getProductRefsFromGroup(group: AISuggestionGroup): AmazonProductRef[] {
  return group.suggestions.map(s => ({
    asin: s.asin,
    title: s.name,
    category: s.category,
    priceRange: s.price,
    affiliateUrl: s.url,
  }));
}

/**
 * Quick lookup: get a single product suggestion by ASIN.
 * Used when the AI wants to recommend one specific product.
 */
export function getSuggestionByAsin(asin: string): AISuggestion | null {
  for (const group of ALL_AI_SUGGESTIONS) {
    const found = group.suggestions.find(s => s.asin === asin);
    if (found) return found;
  }
  return null;
}

/**
 * Get seasonal suggestions based on current month.
 * Returns groups that are specifically relevant to the given month.
 */
export function getSeasonalSuggestions(
  month: number,
  mode: 'fish' | 'hunt'
): AISuggestionGroup[] {
  return ALL_AI_SUGGESTIONS.filter(
    g => g.mode === mode && g.months.length > 0 && g.months.includes(month)
  );
}
