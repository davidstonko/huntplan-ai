/**
 * MDHuntFishOutdoors AI Chat Knowledge Base — Fishing Module
 *
 * This module provides intelligent responses to fishing queries by searching through
 * Maryland fishing data and generating contextual, accurate answers.
 *
 * When integrated with the backend, this will be replaced with RAG queries against
 * the PostgreSQL + pgvector database. For now, it provides smart local responses.
 */

import { getSeasonalBaitGuide } from './fishingBaitKnowledge';
import { servicesForWater, type LocalService } from './marylandLocalServices';
import { CURATED_FISHING_GEAR } from './curatedFishingGear';

// ─────────────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────────────

export interface ChatResponse {
  text: string;
  citations?: string[];
  followUpSuggestions?: string[];
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN QUERY HANDLER
// ─────────────────────────────────────────────────────────────────────────────

/**
 * 2026-04-27: Detect waterbody mentioned in the user's query so we can
 * splice "Local pros" recommendations into responses. Substring match
 * against known waters in marylandLocalServices.ts entries — keeps the
 * lookup self-maintaining as new services land.
 */
const KNOWN_WATER_TOKENS: ReadonlyArray<readonly [string, string]> = [
  // [substring to match, canonical waterbody name to query]
  ['gunpowder', 'Gunpowder Falls'],
  ['big hunting', 'Big Hunting Creek'],
  ['savage', 'Savage River'],
  ['north branch', 'North Branch Potomac River'],
  ['beaver creek', 'Beaver Creek'],
  ['loch raven', 'Loch Raven Reservoir'],
  ['prettyboy', 'Prettyboy Reservoir'],
  ['liberty', 'Liberty Reservoir'],
  ['triadelphia', 'Triadelphia Reservoir'],
  ['rocky gorge', 'Rocky Gorge Reservoir'],
  ['deep creek', 'Deep Creek Lake'],
  ['piney run', 'Piney Run Reservoir'],
  ['greenbrier', 'Greenbrier Lake'],
  ['conowingo', 'Conowingo Pond'],
  ['susquehanna', 'Susquehanna River'],
  ['chesapeake', 'Chesapeake Bay'],
  ['the bay', 'Chesapeake Bay'],
  ['severn', 'Severn River'],
  ['magothy', 'Magothy River'],
  ['patuxent', 'Patuxent River'],
];

function detectWaterbody(q: string): string | null {
  for (const [token, canonical] of KNOWN_WATER_TOKENS) {
    if (q.includes(token)) return canonical;
  }
  return null;
}

/**
 * Append a "Local pros" footer to a response when the user mentioned a
 * specific waterbody we can join against. Up to 3 services rendered as
 * a markdown bullet list. Idempotent: if no services match the water,
 * the response passes through unchanged.
 */
function augmentWithLocalPros(
  response: ChatResponse,
  userQuery: string,
): ChatResponse {
  const water = detectWaterbody(userQuery.toLowerCase());
  if (!water) return response;
  const pros = servicesForWater(water).slice(0, 3);
  if (pros.length === 0) return response;
  const footer =
    `\n\n**Local pros for ${water}:**\n` +
    pros
      .map((p: LocalService) => {
        const phone = p.phone ? ` · ${p.phone}` : '';
        const url = p.website ? ` · ${p.website}` : '';
        return `• **${p.name}** (${p.category.replace('-', ' ')}, ${p.city})${phone}${url}`;
      })
      .join('\n');
  return {
    ...response,
    text: response.text + footer,
    citations: [
      ...(response.citations ?? []),
      'marylandLocalServices.ts (verified-2026 listings)',
    ],
  };
}

/**
 * 2026-04-29: AI gear-suggestion monetization augmentation.
 *
 * When the user's query mentions a fishing technique / species / waterbody
 * that matches a curated gear category, append a "What we use" footer with
 * the top 1-3 picks from CURATED_FISHING_GEAR. Each pick is an Amazon
 * affiliate link (mdoutdoors1-20 tag). This is the core monetization path
 * David flagged: every chat answer should nudge toward verified-by-David
 * gear and earn affiliate revenue when the user converts.
 *
 * Detection heuristics (token → category id):
 *   - "fly", "nymph", "trout", "gunpowder", "savage" → fly_gunpowder
 *   - "bass", "largemouth", "smallmouth", "crappie" → bass_freshwater
 *   - "striped bass", "rockfish", "chesapeake", "the bay" → chesapeake_bay
 *   - "ocean city", "saltwater", "surf", "flounder", "tautog" → saltwater_oc
 *
 * Idempotent: if no category matches, response passes through. If the
 * category has zero items (data gap), passes through. Renders at most 3
 * items to keep responses readable.
 */
const GEAR_CATEGORY_TOKENS: ReadonlyArray<readonly [readonly string[], string]> = [
  [['fly', 'nymph', 'trout', 'gunpowder', 'savage', 'big hunting', 'beaver creek'], 'fly_gunpowder'],
  [['ocean city', 'oc inlet', 'saltwater', 'surf', 'flounder', 'tautog', 'spanish mackerel', 'sea bass'], 'saltwater_oc'],
  [['striped bass', 'rockfish', 'chesapeake', 'the bay', 'cobia', 'black drum'], 'chesapeake_bay'],
  [['bass', 'largemouth', 'smallmouth', 'crappie', 'bluegill', 'panfish'], 'bass_freshwater'],
];

function detectGearCategory(q: string): string | null {
  for (const [tokens, categoryId] of GEAR_CATEGORY_TOKENS) {
    if (tokens.some((t) => q.includes(t))) return categoryId;
  }
  return null;
}

function augmentWithGearSuggestions(
  response: ChatResponse,
  userQuery: string,
): ChatResponse {
  const categoryId = detectGearCategory(userQuery.toLowerCase());
  if (!categoryId) return response;
  const category = CURATED_FISHING_GEAR.find((c) => c.id === categoryId);
  if (!category || category.items.length === 0) return response;
  // Prefer essentials + creatorPicks first; cap at 3
  const ranked = [...category.items].sort((a, b) => {
    const aScore = (a.essential ? 2 : 0) + (a.creatorPick ? 1 : 0);
    const bScore = (b.essential ? 2 : 0) + (b.creatorPick ? 1 : 0);
    return bScore - aScore;
  });
  const picks = ranked.slice(0, 3);
  const footer =
    `\n\n**What we use (${category.title}):**\n` +
    picks
      .map((g) => {
        const tag = g.creatorPick ? ' ⭐ By David' : '';
        return `• [${g.name}](${g.url})${tag} — ${g.description} (${g.price})`;
      })
      .join('\n') +
    `\n\n_Affiliate links — purchases support MDHuntFishOutdoors._`;
  return {
    ...response,
    text: response.text + footer,
    citations: [
      ...(response.citations ?? []),
      `curatedFishingGear.ts — ${category.title}`,
    ],
  };
}

/**
 * Main entry point for fishing AI chat queries.
 * Analyzes the user's query and returns a contextual, data-driven response.
 *
 * 2026-04-29: chain-augmented with two enhancements:
 *   1. augmentWithLocalPros — splices "Local pros" footer for known waters
 *   2. augmentWithGearSuggestions — splices "What we use" footer with
 *      Amazon affiliate links from the curated gear list (David's monetization)
 *
 * Order matters: local pros first (helps the user find a guide if they want
 * one), then gear (suggests what to bring on the trip). Both are idempotent.
 */
export function getFishingSmartResponse(userQuery: string): ChatResponse | null {
  const raw = getFishingSmartResponseRaw(userQuery);
  if (!raw) return raw;
  const withPros = augmentWithLocalPros(raw, userQuery);
  return augmentWithGearSuggestions(withPros, userQuery);
}

function getFishingSmartResponseRaw(userQuery: string): ChatResponse | null {
  const q = userQuery.toLowerCase().trim();

  // Detect intent and route to appropriate handler
  if (isSeasonQuery(q)) {
    return handleSeasonQuery(userQuery);
  }

  if (isBagLimitQuery(q)) {
    return handleBagLimitQuery(userQuery);
  }

  if (isLicenseQuery(q)) {
    return handleLicenseQuery(userQuery);
  }

  if (isSpeciesQuery(q)) {
    return handleSpeciesQuery(userQuery);
  }

  if (isAccessQuery(q)) {
    return handleAccessQuery(userQuery);
  }

  if (isTideQuery(q)) {
    return handleTideQuery(userQuery);
  }

  if (isStockingQuery(q)) {
    return handleStockingQuery(userQuery);
  }

  if (isLocationQuery(q)) {
    return handleLocationQuery(userQuery);
  }

  // Check fly-specific queries BEFORE general bait/tackle to avoid overlap
  if (isFlyQuery(q)) {
    return handleFlyRecommendationQuery(userQuery);
  }

  if (isBaitTackleQuery(q)) {
    return handleBaitTackleQuery(userQuery);
  }

  if (isSafetyQuery(q)) {
    return handleSafetyQuery(userQuery);
  }

  if (isBaitQuery(q)) {
    return handleBaitRecommendationQuery(userQuery);
  }

  if (isLureQuery(q)) {
    return handleLureRecommendationQuery(userQuery);
  }

  if (isGearQuery(q)) {
    return handleGearTackleQuery(userQuery);
  }

  if (isKitQuery(q)) {
    return handleKitRecommendationQuery(userQuery);
  }

  if (isStripedBass2026ChangesQuery(q)) {
    return handleStripedBass2026ChangesQuery(userQuery);
  }

  if (isFishConsumptionAdvisoryQuery(q)) {
    return handleFishConsumptionAdvisoryQuery(userQuery);
  }

  if (isFishingLicenseFeesQuery(q)) {
    return handleFishingLicenseFeesQuery(userQuery);
  }

  if (isTroutStockingQuery(q)) {
    return handleTroutStockingQuery(userQuery);
  }

  if (isCrabbingQuery(q)) {
    return handleCrabbingQuery(userQuery);
  }

  if (isBoatingSafetyQuery(q)) {
    return handleBoatingSafetyQuery(userQuery);
  }

  if (isCreelSurveyQuery(q)) {
    return handleCreelSurveyQuery(userQuery);
  }

  if (isFreshwaterRegulationsQuery(q)) {
    return handleFreshwaterRegulationsQuery(userQuery);
  }

  if (isSnakeheadFishingQuery(q)) {
    return handleSnakeheadFishingQuery(userQuery);
  }

  if (isFlyFishingStreamsQuery(q)) {
    return handleFlyFishingStreamsQuery(userQuery);
  }

  if (isTrophyFishQuery(q)) {
    return handleTrophyFishQuery(userQuery);
  }

  if (isIceFishingQuery(q)) {
    return handleIceFishingQuery(userQuery);
  }

  if (isArtificialReefQuery(q)) {
    return handleArtificialReefQuery(userQuery);
  }

  if (isSpawningClosureQuery(q)) {
    return handleSpawningClosureQuery(userQuery);
  }

  if (isCommunityFishingReportsQuery(q)) {
    return handleCommunityFishingReportsQuery(userQuery);
  }

  // 2026-05-02 (V2.4 audit, DNR research pass): added 3 specific
  // intents pulled from the May 2026 sweep. Ordering matters:
  // is2026StockingProgramQuery before isStockingQuery (already
  // dispatched above) — actually placed AFTER all earlier intents
  // so the more-general stocking handler still wins on plain
  // "when is stocking" queries.
  if (is2026StockingProgramQuery(q)) {
    return handle2026StockingProgramQuery(userQuery);
  }

  if (isSeniorLicenseQuery(q)) {
    return handleSeniorLicenseQuery(userQuery);
  }

  if (isPFDQuery(q)) {
    return handlePFDQuery(userQuery);
  }

  if (isBassTournamentQuery(q)) {
    return handleBassTournamentQuery(userQuery);
  }

  // No match found
  return null;
}

function isBassTournamentQuery(q: string): boolean {
  return /tournament|bass nation|bassmaster|b\.a\.s\.s\.|mlf|major league fishing|smallwood|aba|club trail|team trail|tournament trail/.test(q);
}

function handleBassTournamentQuery(_userQuery: string): ChatResponse {
  return {
    text:
      '**Maryland Bass Tournaments (2026)**\n\n' +
      '**Headline waters:** Potomac River (the crown jewel — 400+ miles), Chesapeake tidal Bay, Deep Creek Lake, Susquehanna Flats.\n\n' +
      '**Premier venue:** Smallwood State Park (Marbury) hosts MLF, Bassmaster (B.A.S.S.), and American Bass Anglers events.\n\n' +
      '**Maryland Bass Nation (MBN)** — mdbassnation.com\n' +
      '• 4 regions, dozens of affiliated clubs\n' +
      '• Annual State Championship + High School Championship\n' +
      '• Year-round club trails and team trails\n\n' +
      '**2026 calendar:** 91+ MD events. See basscalendar.com/md and mdbasstourney.netlify.app for the rolling schedule.\n\n' +
      '**Trophy citations:** MD DNR Angler Award Program recognizes smallmouth ≥18", largemouth ≥21", striped bass ≥40" (multiple categories). Free certificates — submit through dnr.maryland.gov/fisheries.\n\n' +
      '**Tournament permits:** Required from MD DNR if >25 boats or you intend to weigh-in fish. dnr.maryland.gov/fisheries/pages/bass/tournaments.aspx',
    citations: [
      'https://dnr.maryland.gov/fisheries/pages/bass/tournaments.aspx',
      'https://mdbassnation.com/',
      'https://basscalendar.com/md/',
    ],
    followUpSuggestions: [
      'How do I get a tournament permit?',
      'What\'s the trophy fish program?',
      'Best Potomac tournament launch ramps?',
      'How do I join a Maryland bass club?',
    ],
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// INTENT DETECTION
// ─────────────────────────────────────────────────────────────────────────────

function isSeasonQuery(q: string): boolean {
  return /season|when|dates|open|close|start|end|start date|end date/.test(q);
}

function isBagLimitQuery(q: string): boolean {
  return /bag limit|how many|limit|harvest|take|creel|daily|per day/.test(q);
}

function isLicenseQuery(q: string): boolean {
  return /license|permit|stamp|registration|requirement|cost|price|fee/.test(q);
}

function isSpeciesQuery(q: string): boolean {
  return /species|fish|trout|bass|perch|catfish|carp|pike|musky|identify|type|kind|what fish/.test(q);
}

function isAccessQuery(q: string): boolean {
  return /access|boat ramp|shore|where|public|location|site|place|can i fish/.test(q);
}

function isTideQuery(q: string): boolean {
  return /tide|tidal|high tide|low tide|when fish|best time|slack/.test(q);
}

function isStockingQuery(q: string): boolean {
  return /stock|trout stocking|stock report|when stocked|release|put in/.test(q);
}

// 2026-05-02 (V2.4 audit, DNR research): added detector for the 2026
// stocking enhancement program. DNR is stocking 240,000 trout this
// spring (26% increase). Youth-only day March 21, opening day
// March 28. Hotline 800-688-3467 option 1 for recorded weekly update.
function is2026StockingProgramQuery(q: string): boolean {
  return /enhanced.*stock|2026 stock|240,?000|how many trout|spring stock|youth.*trout|trout opening day|trout hotline/.test(q);
}

// 2026-05-02 (V2.4 audit, DNR research): senior consolidated license
// changed in 2025 — trout stamp no longer included. Seniors who fish
// for trout must buy the $20 trout stamp separately. Added detector
// since this is a recurring Q for 65+ anglers.
function isSeniorLicenseQuery(q: string): boolean {
  return /senior|65|65\+|elderly|consolidated|seniors? license|senior fishing|over 65/.test(q);
}

// 2026-05-02 (V2.4 audit, DNR research): added detector for boating
// safety / PFD / boat ramps. Memory had safety as a generic intent
// but no specific PFD requirement coverage.
function isPFDQuery(q: string): boolean {
  return /\bpfd\b|life jacket|life vest|coast guard|type i\b|type ii\b|type iii\b|type iv\b|type v\b|wearable|throwable|child.*pfd|pwc.*pfd/.test(q);
}

function isLocationQuery(q: string): boolean {
  return /where.*fish|fishing ground|chesapeake|bay|river|creek|lake|deep creek|potomac|susquehanna/.test(q);
}

function isBaitTackleQuery(q: string): boolean {
  return /bait|lure|tackle|rod|reel|what to use|how to fish|technique/.test(q);
}

function isSafetyQuery(q: string): boolean {
  return /safe|safety|life jacket|weather|wind|hypothermia|boat|boating|rules/.test(q);
}

function isBaitQuery(q: string): boolean {
  return /\bbait\b|what bait|what to use|live bait|cut bait/.test(q);
}

function isFlyQuery(q: string): boolean {
  return /\bfly\b|what fly|hatch|dry fly|nymph|fly fishing|fly pattern/.test(q);
}

function isLureQuery(q: string): boolean {
  return /\blure\b|what lure|jig|spoon|topwater|crankbait|plug/.test(q);
}

function isGearQuery(q: string): boolean {
  return /\bgear\b|tackle|equipment|rod|reel|line/.test(q) && !q.includes('gear guide');
}

function isKitQuery(q: string): boolean {
  return /kit|starter|beginner|setup|complete|everything i need/.test(q);
}

function isStripedBass2026ChangesQuery(q: string): boolean {
  return /striped bass 2026|rockfish changes|new striper rules|august closure|striper 2026/.test(q);
}

function isFishConsumptionAdvisoryQuery(q: string): boolean {
  return /advisory|pfas|mercury|safe to eat|consumption|contaminant|health risk/.test(q);
}

function isFishingLicenseFeesQuery(q: string): boolean {
  return /license.*cost|license.*fee|license.*price|how much.*license|fishing license.*cost/.test(q);
}

function isTroutStockingQuery(q: string): boolean {
  return /stocking|trout stocking|when stocked|stocking schedule|stock report/.test(q);
}

function isCrabbingQuery(q: string): boolean {
  return /crab|crabbing|blue crab|crabbing season|crab limit/.test(q);
}

function isBoatingSafetyQuery(q: string): boolean {
  return /boating safety|boat certificate|pfd|life jacket|pwc|jet ski|boating rules/.test(q);
}

function isCreelSurveyQuery(q: string): boolean {
  return /creel|survey|fish population|stock assessment|volunteer/.test(q);
}

function isFreshwaterRegulationsQuery(q: string): boolean {
  return /freshwater limit|bass limit|trout limit|panfish|walleye|muskie|regulations quick/.test(q);
}

function isSnakeheadFishingQuery(q: string): boolean {
  return /snakehead|northern snakehead|invasive fish|invasive species/.test(q);
}

function isFlyFishingStreamsQuery(q: string): boolean {
  return /fly fishing|fly rod|fly stream|gunpowder fly|savage river fly/.test(q);
}

function isTrophyFishQuery(q: string): boolean {
  return /record fish|trophy|state record|biggest fish|citation fish|master angler/.test(q);
}

function isIceFishingQuery(q: string): boolean {
  return /ice fishing|ice fish|winter fishing/.test(q);
}

function isArtificialReefQuery(q: string): boolean {
  return /artificial reef|reef fishing|reef location|reef coordinates/.test(q);
}

function isSpawningClosureQuery(q: string): boolean {
  return /spawning closure|river closure|march closure|closed river|spawning season/.test(q);
}

function isCommunityFishingReportsQuery(q: string): boolean {
  return /fishing report|where are fish biting|what.s biting|current conditions|water temp|fish biting/.test(q);
}

// ─────────────────────────────────────────────────────────────────────────────
// SEASON QUERY HANDLER
// ─────────────────────────────────────────────────────────────────────────────

function handleSeasonQuery(userQuery: string): ChatResponse {
  const q = userQuery.toLowerCase();

  // Striped bass specific
  if (q.includes('striped') || q.includes('striper')) {
    return {
      text:
        '**Striped Bass Season in Maryland (2026)**\n\n' +
        '**Harvest Season:**\n' +
        '• May 1 — December 31\n\n' +
        '**Size & Bag Limit:**\n' +
        '• Slot: 19-24 inches\n' +
        '• Daily Limit: 1 per day\n' +
        '• Only harvest fish in the 19-24" range\n\n' +
        '**Catch & Release Period:**\n' +
        '• April — April 30\n' +
        '• You can catch and release stripers during April, but must release them\n\n' +
        '**Spawning River Closures:**\n' +
        '• Potomac River: Closed April 1 — May 31\n' +
        '• Susquehanna River: Closed April 1 — May 31\n' +
        '• Patapsco River: Closed April 1 — May 31\n\n' +
        '**Where:** Chesapeake Bay, tidal rivers and tributaries\n\n' +
        '**Stock status (2024 ASMFC update):** Striped bass remain *overfished*. Seven consecutive years of weak Chesapeake recruitment threaten the spawning stock biomass after 2029. ASMFC Addendum III (Oct 2025) allows Maryland to revisit its Chesapeake recreational baseline through a state regulatory process — watch for possible 2026 season changes. A new benchmark stock assessment + peer review is expected Spring 2027.\n\n' +
        '**What that means for you:** measure carefully, lip-grip release in C&R, single hook on circle hooks where required, avoid surface fishing in water >75°F (post-release mortality spikes).\n\n' +
        'Stripers are a prized species. Keep your license and documentation on you at all times.',
      citations: [
        'MD DNR Fisheries Regulations 2026',
        'ASMFC Atlantic Striped Bass Addendum III (2025)',
        'https://asmfc.org/species/atlantic-striped-bass/',
      ],
      followUpSuggestions: [
        'Best time to fish for stripers?',
        'What bait should I use?',
        'Where are boat ramps?',
      ],
    };
  }

  // Yellow perch specific
  if (q.includes('perch') || q.includes('yellow perch')) {
    return {
      text:
        '**Yellow Perch Season in Maryland**\n\n' +
        '**Chesapeake Bay & Tidal Waters:**\n' +
        '• Open Year-round\n' +
        '• Best: December — March (winter fishing)\n\n' +
        '**Size & Bag Limit:**\n' +
        '• No minimum size\n' +
        '• Daily Limit: 5 per day\n\n' +
        '**Freshwater (Lakes/Reservoirs):**\n' +
        '• Check specific lake regulations\n' +
        '• Limits vary by location\n\n' +
        'Yellow perch are excellent eating fish and popular for winter ice fishing in the Bay.',
      citations: ['MD DNR Fisheries Regulations'],
      followUpSuggestions: [
        'Best season for perch fishing?',
        'Where can I fish for perch?',
        'What bait works best?',
      ],
    };
  }

  // Trout specific
  if (q.includes('trout')) {
    return {
      text:
        '**Trout Season in Maryland**\n\n' +
        '**General Trout (Rainbow, Brown, Golden):**\n' +
        '• Stocking Season: Spring (March-May) & Fall (September-November)\n' +
        '• Year-round in some managed streams\n\n' +
        '**Rainbow Trout (Most Common):**\n' +
        '• Stocked heavily from March — May\n' +
        '• Secondary stocking September — November\n' +
        '• Size: 8-10 inches at stocking\n\n' +
        '**Size & Bag Limit:**\n' +
        '• No minimum size\n' +
        '• Daily Limit: Varies by location (check your specific stream)\n\n' +
        '**Trout Stamp Required:**\n' +
        '• $20 annual stamp (in addition to fishing license)\n' +
        '• Required even for non-residents in MD\n\n' +
        '**Best Fishing:**\n' +
        '• Right after stocking (check DNR stocking reports)\n' +
        '• Early morning or evening\n' +
        '• Cool water months (spring & fall)\n\n' +
        'Check DNR website for current stocking schedules — 68+ locations statewide.',
      citations: ['MD DNR Trout Stocking Program', 'MD DNR Fisheries Regulations'],
      followUpSuggestions: [
        'When are trout stocked?',
        'Where are trout stocking locations?',
        'What flies should I use?',
      ],
    };
  }

  // Generic season response
  return {
    text:
      '**Maryland Fishing Seasons**\n\n' +
      'Different species have different seasons:\n\n' +
      '• **Striped Bass:** May 1 — Dec 31 (1/day, 19-24" slot)\n' +
      '• **Yellow Perch:** Year-round (5/day)\n' +
      '• **Rainbow Trout:** Spring/Fall stocking (check stocking reports)\n' +
      '• **Largemouth Bass:** Year-round (5/day, 12" minimum)\n' +
      '• **Smallmouth Bass:** Year-round (5/day, 12" minimum)\n' +
      '• **Channel Catfish:** Year-round (25/day)\n\n' +
      'Which species are you interested in? I can give you detailed season info.',
    citations: ['MD DNR Fisheries Regulations'],
    followUpSuggestions: [
      'Striped bass season details',
      'Trout stocking schedule',
      'Largemouth bass regulations',
    ],
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// BAG LIMIT QUERY HANDLER
// ─────────────────────────────────────────────────────────────────────────────

function handleBagLimitQuery(userQuery: string): ChatResponse {
  const q = userQuery.toLowerCase();

  // Striped bass specific
  if (q.includes('striped') || q.includes('striper')) {
    return {
      text:
        '**Striped Bass Daily Limit in Maryland**\n\n' +
        '**Harvest (May 1 — Dec 31):**\n' +
        '• Daily Limit: **1 fish per day**\n' +
        '• Size: **19-24 inches** (slot limit)\n' +
        '• Must be within this range to keep\n\n' +
        '**Catch & Release (April):**\n' +
        '• You may catch and release during April\n' +
        '• No harvest allowed April 1-30\n\n' +
        '**Why the slot limit?**\n' +
        'The 19-24" slot protects breeding stock (smaller fish) and larger trophy fish. It targets the ideal harvest size and supports population sustainability.\n\n' +
        'Strict limits help maintain the striped bass fishery. Always measure your fish and release any outside the slot.',
      citations: ['MD DNR Striped Bass Management Plan'],
      followUpSuggestions: [
        'Where can I fish for stripers?',
        'Best time for striped bass?',
        'What tackle should I use?',
      ],
    };
  }

  // Yellow perch
  if (q.includes('perch')) {
    return {
      text:
        '**Yellow Perch Daily Limit in Maryland**\n\n' +
        '• **Daily Limit: 5 fish per day**\n' +
        '• No minimum size\n' +
        '• Applies in Chesapeake Bay and tidal waters\n\n' +
        'Yellow perch are excellent eating fish. Check your local freshwater lake for any different limits.',
      citations: ['MD DNR Fisheries Regulations'],
      followUpSuggestions: [
        'Trout bag limit?',
        'Bass limits?',
        'Catfish limits?',
      ],
    };
  }

  // Generic limits
  return {
    text:
      '**Maryland Fishing Bag Limits**\n\n' +
      '• **Striped Bass:** 1/day (19-24" slot)\n' +
      '• **Yellow Perch:** 5/day\n' +
      '• **Largemouth Bass:** 5/day (12" minimum)\n' +
      '• **Smallmouth Bass:** 5/day (12" minimum)\n' +
      '• **Channel Catfish:** 25/day\n' +
      '• **Blue Catfish:** 15/day\n' +
      '• **Crappie:** 15/day\n' +
      '• **Rainbow Trout:** Varies by location\n\n' +
      'Limits may vary by specific location. Always verify before fishing.',
    citations: ['MD DNR Fisheries Regulations'],
    followUpSuggestions: [
      'Striped bass limit details?',
      'Trout regulations?',
      'Local lake limits?',
    ],
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// LICENSE QUERY HANDLER
// ─────────────────────────────────────────────────────────────────────────────

function handleLicenseQuery(userQuery: string): ChatResponse {
  const q = userQuery.toLowerCase();

  if (q.includes('cost') || q.includes('price') || q.includes('how much')) {
    return {
      text:
        '**Maryland Fishing License Costs (2026)**\n\n' +
        '**Resident Licenses:**\n' +
        '• **Nontidal Fishing License:** $32/year\n' +
        '• **Trout Stamp:** $20/year (required if fishing for trout)\n' +
        '• **Chesapeake Bay License:** $15/year (required for Bay fishing)\n\n' +
        '**Non-Resident Licenses:**\n' +
        '• **Reciprocal License:** Varies by state\n' +
        '• **Temporary License:** Available for 7/14 days\n\n' +
        '**Free Fishing:**\n' +
        '• Under 16 years old: Free (no license needed)\n' +
        '• **Free Fishing Days:** June 6, 13 and July 4\n\n' +
        '**Purchase at:** compass.dnr.maryland.gov or authorized vendors\n\n' +
        'I can\'t purchase licenses for you — you\'ll need to do that yourself for security.',
      citations: ['compass.dnr.maryland.gov', 'MD DNR License Fees'],
      followUpSuggestions: [
        'Where do I buy a license?',
        'Do I need a trout stamp?',
        'Am I eligible for free fishing?',
      ],
    };
  }

  // Generic license response
  return {
    text:
      '**Maryland Fishing Licenses**\n\n' +
      '**Required for Most Fishing:**\n' +
      '• Nontidal Fishing License — $32/year (residents)\n' +
      '• Chesapeake Bay License — $15/year (for Bay/tidal water)\n\n' +
      '**Additional Stamps:**\n' +
      '• Trout Stamp — $20/year (if fishing for trout)\n\n' +
      '**Free Fishing:**\n' +
      '• Under 16 — No license needed\n' +
      '• Free Fishing Days — June 6, 13, and July 4\n\n' +
      '**Purchase:** compass.dnr.maryland.gov\n\n' +
      'Non-residents can purchase reciprocal licenses or short-term permits.',
    citations: ['compass.dnr.maryland.gov'],
    followUpSuggestions: [
      'License pricing?',
      'Do I need a trout stamp?',
      'Non-resident license?',
    ],
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// SPECIES IDENTIFICATION HANDLER
// ─────────────────────────────────────────────────────────────────────────────

function handleSpeciesQuery(userQuery: string): ChatResponse {
  const q = userQuery.toLowerCase();

  // Striped bass identification
  if (q.includes('striped bass') || q.includes('striper') || (q.includes('bass') && q.includes('stripe'))) {
    return {
      text:
        '**Striped Bass Identification**\n\n' +
        '**What to Look For:**\n' +
        '• **Body:** Silver to dark gray back, white/silver belly\n' +
        '• **Stripes:** Dark horizontal stripes along entire body (5-8 stripes)\n' +
        '• **Mouth:** Large mouth, protruding lower jaw\n' +
        '• **Dorsal Fins:** Two dorsal fins (first has 7-8 spines)\n' +
        '• **Size:** 18-30+ inches common, can exceed 40 lbs\n\n' +
        '**Stripers vs Largemouths:**\n' +
        '• Stripers have stripes (largemouths have a dark side stripe, not horizontal lines)\n' +
        '• Stripers have larger mouths extending past the eye\n' +
        '• Stripers live in saltwater/brackish (Chesapeake Bay, tidal rivers)\n\n' +
        '**2026 Maryland Slot Limit:**\n' +
        '• Keep only 19-24 inches\n' +
        '• Daily Limit: 1 fish\n\n' +
        'Always measure your fish before keeping it!',
      citations: ['MD DNR Fish ID Guide'],
      followUpSuggestions: [
        'Striped bass season?',
        'Best striper fishing spots?',
        'What bait for stripers?',
      ],
    };
  }

  // Largemouth vs smallmouth
  if ((q.includes('bass') && q.includes('type')) || q.includes('largemouth') || q.includes('smallmouth')) {
    return {
      text:
        '**Bass Identification: Largemouth vs Smallmouth**\n\n' +
        '**Largemouth Bass:**\n' +
        '• **Mouth:** Large mouth extending past eye\n' +
        '• **Stripe:** One dark lateral (side) stripe\n' +
        '• **Jaw:** Lower jaw projects noticeably beyond upper\n' +
        '• **Color:** Greenish, lighter belly\n' +
        '• **Habitat:** Lakes, slow rivers, weedy areas\n\n' +
        '**Smallmouth Bass:**\n' +
        '• **Mouth:** Smaller mouth, not extending past eye\n' +
        '• **Stripes:** Fine vertical lines (no large lateral stripe)\n' +
        '• **Color:** Bronze to reddish-brown\n' +
        '• **Eye:** Red-orange eye\n' +
        '• **Habitat:** Fast rivers, rocky areas, deeper structure\n\n' +
        '**Maryland Bag Limit (Both):**\n' +
        '• Daily Limit: 5 fish\n' +
        '• Minimum Size: 12 inches\n\n' +
        'Both species are great eating and fun to catch!',
      citations: ['MD DNR Fish ID Guide'],
      followUpSuggestions: [
        'How to fish for largemouths?',
        'Smallmouth bass locations?',
        'Best lures for bass?',
      ],
    };
  }

  // Trout identification
  if (q.includes('trout') && (q.includes('identify') || q.includes('type') || q.includes('difference'))) {
    return {
      text:
        '**Maryland Trout Species**\n\n' +
        '**Rainbow Trout (Most Common):**\n' +
        '• **Color:** Silvery body with pink/red stripe along side\n' +
        '• **Spots:** Dark spots on back and tail\n' +
        '• **Rainbow band:** Distinctive pink/red band on side\n' +
        '• **Origin:** Regularly stocked by MD DNR\n' +
        '• **Size:** 8-12 inches at stocking\n\n' +
        '**Brown Trout:**\n' +
        '• **Color:** Brown to dark back, yellowish side, white belly\n' +
        '• **Spots:** Red/brown spots with pale halos\n' +
        '• **Mouth:** More subtle, less colorful than rainbows\n' +
        '• **Behavior:** More cautious, excellent in cover\n\n' +
        '**Golden Trout (Rare in MD):**\n' +
        '• **Color:** Gold/yellow body with red stripes\n' +
        '• **Spots:** Bright orange/red spots\n' +
        '• **Habitat:** Cold mountain streams only\n\n' +
        '**Trout Stamp Required:** $20/year for any trout fishing',
      citations: ['MD DNR Stocking Program', 'Fish ID Guide'],
      followUpSuggestions: [
        'Where are trout stocked?',
        'Best fly patterns?',
        'Trout season dates?',
      ],
    };
  }

  // Catfish
  if (q.includes('catfish')) {
    return {
      text:
        '**Maryland Catfish Species**\n\n' +
        '**Channel Catfish:**\n' +
        '• **Color:** Gray to blue-brown, lighter belly\n' +
        '• **Whiskers (Barbels):** 4 small barbels around mouth\n' +
        '• **Size:** 1-5 lbs common, can reach 20+ lbs\n' +
        '• **Daily Limit:** 25/day\n' +
        '• **Habitat:** Slow rivers, lakes, ponds\n\n' +
        '**Blue Catfish:**\n' +
        '• **Color:** Blue-gray back, white belly\n' +
        '• **Size:** Larger than channel cats (5-20+ lbs common)\n' +
        '• **Daily Limit:** 15/day\n' +
        '• **Whiskers:** 4 small barbels\n' +
        '• **Habitat:** Larger rivers (Potomac, Susquehanna)\n\n' +
        '**Flathead Catfish:**\n' +
        '• **Color:** Brown to olive-brown\n' +
        '• **Shape:** Flattened head (not rounded)\n' +
        '• **Mouth:** Larger, more aggressive\n' +
        '• **Bait:** Prefers live fish\n\n' +
        '**Best Baits:** Chicken liver, cut shad, stink bait, live bluegill',
      citations: ['MD DNR Fish ID Guide'],
      followUpSuggestions: [
        'Best catfish bait?',
        'Where to catch catfish?',
        'Catfish season?',
      ],
    };
  }

  // Generic species response
  return {
    text:
      '**Maryland Fish Species**\n\n' +
      'Common species in Maryland:\n\n' +
      '• **Striped Bass** — Chesapeake Bay, tidal rivers\n' +
      '• **Largemouth Bass** — Lakes, ponds, slow rivers\n' +
      '• **Smallmouth Bass** — Rivers, rocky areas\n' +
      '• **Rainbow Trout** — Stocked streams (spring/fall)\n' +
      '• **Yellow Perch** — Bay, year-round\n' +
      '• **Channel Catfish** — Lakes, slow rivers\n' +
      '• **Blue Catfish** — Large rivers\n' +
      '• **Crappie** — Lakes, slow rivers\n\n' +
      'Which species would you like to know more about?',
    citations: ['MD DNR Fish ID Guide'],
    followUpSuggestions: [
      'How to identify stripers?',
      'Bass vs catfish?',
      'Trout species?',
    ],
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// ACCESS QUERY HANDLER
// ─────────────────────────────────────────────────────────────────────────────

function handleAccessQuery(userQuery: string): ChatResponse {
  return {
    text:
      '**Maryland Public Fishing Access**\n\n' +
      'MDHuntFishOutdoors tracks **307 public fishing access sites** across Maryland:\n\n' +
      '• **Boat Ramps:** Many access sites have maintained ramps\n' +
      '• **Shore Fishing:** Bank/wade access at numerous locations\n' +
      '• **Chesapeake Bay Access:** Multiple public ramps and beaches\n' +
      '• **Freshwater Lakes:** Deep Creek Lake, reservoirs with public access\n' +
      '• **Rivers:** Potomac, Susquehanna, Patapsco, and tributaries\n\n' +
      '**Finding Access Near You:**\n' +
      '1. Use the **Fish Map** tab to see all 307 public sites\n' +
      '2. Filter by region or click a location for details\n' +
      '3. Check for amenities: ramp, parking, restrooms\n\n' +
      '**Boat Ramp Tips:**\n' +
      '• Arrive early (popular spots fill up)\n' +
      '• Use courtesy when launching/retrieving\n' +
      '• Some ramps have fees ($3-7 typical)\n' +
      '• Check depth/conditions before launching\n\n' +
      'Use the Fish Map to explore all 307 access sites in your area!',
    citations: ['MD DNR Public Fishing Access', 'MDHuntFishOutdoors Database'],
    followUpSuggestions: [
      'Where is the nearest boat ramp?',
      'Shore fishing locations?',
      'Chesapeake Bay access?',
    ],
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// TIDE QUERY HANDLER
// ─────────────────────────────────────────────────────────────────────────────

function handleTideQuery(userQuery: string): ChatResponse {
  const q = userQuery.toLowerCase();

  if (q.includes('best') || q.includes('when')) {
    return {
      text:
        '**Best Times for Bay Fishing Based on Tides**\n\n' +
        '**Ideal Tide Conditions:**\n' +
        '• **Moving Water = Better Fishing**\n' +
        '• Best: 1-2 hours before high tide through 1-2 hours after\n' +
        '• Second best: 1-2 hours before low tide through 1-2 hours after\n' +
        '• Avoid: Dead slack water (when tide turns)\n\n' +
        '**Why Tides Matter:**\n' +
        '• Moving water pushes baitfish and nutrients\n' +
        '• Fish are more active when feeding current flows\n' +
        '• Slack water = minimal fish activity\n\n' +
        '**Chesapeake Bay Tidal Patterns:**\n' +
        '• Semi-diurnal (2 high tides, 2 low tides per day)\n' +
        '• Average range: 2-3 feet\n' +
        '• Tidal current: 0.5-1.5 knots typical\n\n' +
        '**Check Tides:**\n' +
        'Use the app tide widget or visit noaa.gov/tides for real-time predictions.',
      citations: ['NOAA Tides & Currents', 'Chesapeake Bay Fishing Guide'],
      followUpSuggestions: [
        'How do I use tide tables?',
        'Best striped bass tides?',
        'Where is high tide information?',
      ],
    };
  }

  // Generic tide response
  return {
    text:
      '**Understanding Tides for Fishing**\n\n' +
      '**Tides in Chesapeake Bay:**\n' +
      '• **High Tide:** Water rises (good for flooded grassbeds, structure)\n' +
      '• **Low Tide:** Water drops (concentrates fish on deeper flats)\n' +
      '• **Slack Water:** Transition between high and low (slow fishing)\n' +
      '• **Moving Current:** Best fishing (fish feed during current)\n\n' +
      '**Species Responses:**\n' +
      '• **Stripers:** Most active on tide changes\n' +
      '• **Perch:** Good on slack water near structure\n' +
      '• **Catfish:** Year-round, less tide-dependent\n\n' +
      '**Planning Your Trip:**\n' +
      '• Fish 1-2 hours before peak tide\n' +
      '• Fish 1-2 hours after tide change\n' +
      '• Avoid dead slack periods\n\n' +
      'Use NOAA tides or the app widget for current predictions.',
    citations: ['NOAA Tides & Currents'],
    followUpSuggestions: [
      'Best time to fish?',
      'How do tides affect stripers?',
      'What about slack water?',
    ],
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// STOCKING QUERY HANDLER
// ─────────────────────────────────────────────────────────────────────────────

function handleStockingQuery(userQuery: string): ChatResponse {
  const q = userQuery.toLowerCase();

  if (q.includes('where') || q.includes('location')) {
    return {
      text:
        '**Trout Stocking Locations in Maryland**\n\n' +
        'MD DNR stocks **68+ trout locations** statewide, including:\n\n' +
        '**Western Maryland (Allegany/Garrett):**\n' +
        '• Deep Creek Lake (major)\n' +
        '• Savage River\n' +
        '• Multiple tributaries\n\n' +
        '**Central Maryland:**\n' +
        '• Gunpowder River\n' +
        '• Patapsco River\n' +
        '• Little Bennett Creek\n' +
        '• Difficult Run\n\n' +
        '**Eastern Maryland:**\n' +
        '• Various smaller streams\n' +
        '• Coastal plain streams\n\n' +
        '**Finding Nearby Stocking Locations:**\n' +
        '1. Use the **Fish Map** tab\n' +
        '2. Look for stocking location markers\n' +
        '3. Check the DNR stocking report for recent activity\n\n' +
        '**Check Stocking Reports:**\n' +
        'Visit dnr.maryland.gov for live stocking updates (weekly during season).',
      citations: ['MD DNR Trout Stocking Program'],
      followUpSuggestions: [
        'When is the next stocking?',
        'Best time after stocking?',
        'Which locations are stocked now?',
      ],
    };
  }

  if (q.includes('when') || q.includes('schedule')) {
    return {
      text:
        '**Trout Stocking Schedule in Maryland**\n\n' +
        '**Spring Stocking:**\n' +
        '• March — May\n' +
        '• Peak activity: April-May\n' +
        '• Heaviest stocking period\n\n' +
        '**Fall Stocking:**\n' +
        '• September — November\n' +
        '• Secondary but significant period\n' +
        '• Waters cool down for trout\n\n' +
        '**Winter Stocking:**\n' +
        '• Limited (water temp dependent)\n' +
        '• Only in select locations\n\n' +
        '**Best Fishing Window:**\n' +
        '• 1-2 days after stocking (fish aggressive)\n' +
        '• First 2 weeks (high catch rates)\n' +
        '• Early morning preferred\n\n' +
        '**Track Stocking:**\n' +
        'Check dnr.maryland.gov for weekly stocking reports during season.',
      citations: ['MD DNR Stocking Schedule'],
      followUpSuggestions: [
        'What time to fish after stocking?',
        'Best trout fishing locations?',
        'How to find stocking reports?',
      ],
    };
  }

  // Generic stocking response
  return {
    text:
      '**Maryland Trout Stocking Program**\n\n' +
      '**68+ Locations Stocked Annually:**\n' +
      '• Spring season: March-May (heaviest)\n' +
      '• Fall season: September-November\n' +
      '• Winter: Limited, location-dependent\n\n' +
      '**Stocked Species:**\n' +
      '• Rainbow Trout (most common, 8-10")\n' +
      '• Brown Trout (less frequent)\n' +
      '• Golden Trout (specialty locations)\n\n' +
      '**After Stocking:**\n' +
      '• Fish are most aggressive 1-2 days after\n' +
      '• Early morning is best\n' +
      '• Standard trout baits work well\n\n' +
      '**Trout Stamp Required:** $20/year\n\n' +
      'Track stocking at dnr.maryland.gov/fisheries',
      citations: ['MD DNR Trout Stocking Program'],
      followUpSuggestions: [
        'Where are trout stocked?',
        'When is spring stocking?',
        'Trout stamp cost?',
      ],
    };
}

// ─────────────────────────────────────────────────────────────────────────────
// LOCATION QUERY HANDLER
// ─────────────────────────────────────────────────────────────────────────────

function handleLocationQuery(userQuery: string): ChatResponse {
  const q = userQuery.toLowerCase();

  // Chesapeake Bay specific
  if (q.includes('chesapeake') || q.includes('bay')) {
    return {
      text:
        '**Fishing the Chesapeake Bay**\n\n' +
        '**Major Species:**\n' +
        '• **Striped Bass** — Most prized (1/day, 19-24" slot)\n' +
        '• **Yellow Perch** — Year-round, winter peak\n' +
        '• **Blue Catfish** — Abundant, growing population\n' +
        '• **Cobia** — Summer season\n' +
        '• **Spot & Croaker** — Seasonal\n\n' +
        '**Major Fishing Areas:**\n' +
        '• **Upper Bay:** Susquehanna Flats (perch paradise)\n' +
        '• **Middle Bay:** Patapsco River, Bodkin Creek\n' +
        '• **Lower Bay:** Tangier Sound, Pocomoke Sound\n\n' +
        '**Access:**\n' +
        '• **307 public fishing access sites**\n' +
        '• Many with boat ramps and amenities\n' +
        '• Ramp fees typically $3-7\n\n' +
        '**Bay License Required:**\n' +
        '• $15/year (in addition to base license)\n' +
        '• Required for all Bay fishing\n\n' +
        'Use the Fish Map to find boat ramps and access near you.',
      citations: ['MD DNR Bay Fishing Guide', 'Chesapeake Bay Program'],
      followUpSuggestions: [
        'Best striped bass spots?',
        'Perch fishing locations?',
        'Boat ramp near me?',
      ],
    };
  }

  // Deep Creek Lake
  if (q.includes('deep creek')) {
    return {
      text:
        '**Deep Creek Lake Fishing**\n\n' +
        '**Lake Info:**\n' +
        '• Maryland\'s largest freshwater lake\n' +
        '• Located in Garrett County (western MD)\n' +
        '• 3,900 acres, 65 miles of shoreline\n' +
        '• Very popular destination\n\n' +
        '**Fish Species:**\n' +
        '• **Largemouth Bass** — 5/day, 12" minimum\n' +
        '• **Rainbow Trout** — Stocked annually (3/day)\n' +
        '• **Channel Catfish** — 25/day\n' +
        '• **Carp, Crappie, Bluegill**\n\n' +
        '**Best Fishing Seasons:**\n' +
        '• **Spring:** Post-spawn bass, trout stocking\n' +
        '• **Summer:** Early morning/evening\n' +
        '• **Fall:** Excellent bass fishing\n' +
        '• **Winter:** Ice fishing (perch, bass)\n\n' +
        '**Facilities:**\n' +
        '• Multiple public boat ramps\n' +
        '• Marinas and rentals\n' +
        '• Lodging and restaurants\n\n' +
        'Check lake condition reports before visiting.',
      citations: ['MD DNR Lake Info', 'Deep Creek Lake Authority'],
      followUpSuggestions: [
        'Best lures for bass?',
        'Trout season?',
        'Boat ramps at Deep Creek?',
      ],
    };
  }

  // Potomac River
  if (q.includes('potomac')) {
    return {
      text:
        '**Fishing the Potomac River**\n\n' +
        '**Tidal Section (Chesapeake influence):**\n' +
        '• **Striped Bass** — Primary species (1/day, 19-24")\n' +
        '• **Yellow Perch** — Winter peak\n' +
        '• **Channel Catfish** — Year-round\n\n' +
        '**Freshwater Section (Upriver):**\n' +
        '• **Largemouth & Smallmouth Bass** — Excellent\n' +
        '• **Channel Catfish** — Abundant\n' +
        '• **Rainbow Trout** — Selected stocking areas\n\n' +
        '**Spawning Closures (Important!):**\n' +
        '• April 1 — May 31: Striped bass spawning closure\n' +
        '• This section is off-limits to all striped bass fishing\n' +
        '• Allows population replenishment\n\n' +
        '**Major Access Points:**\n' +
        '• Multiple public boat ramps\n' +
        '• 307+ access sites in system\n\n' +
        'Always check current closures before fishing.',
      citations: ['MD DNR River Fishing Guide'],
      followUpSuggestions: [
        'Best striped bass spots?',
        'Smallmouth bass fishing?',
        'Potomac access points?',
      ],
    };
  }

  // Generic location response
  return {
    text:
      '**Where to Fish in Maryland**\n\n' +
      'MDHuntFishOutdoors covers **307 public fishing access sites**:\n\n' +
      '**Major Waters:**\n' +
      '• **Chesapeake Bay** — Stripers, perch, catfish\n' +
      '• **Deep Creek Lake** — Bass, trout, catfish\n' +
      '• **Potomac River** — All species\n' +
      '• **Susquehanna River** — Bass, catfish, stripers\n' +
      '• **Patapsco River** — Bass, catfish\n\n' +
      '**How to Find Spots:**\n' +
      '1. Open the **Fish Map** tab\n' +
      '2. Browse 307 public access sites\n' +
      '3. Check amenities (ramp, parking, restrooms)\n' +
      '4. Filter by region or species\n\n' +
      'Which area interests you?',
    citations: ['MD DNR Public Fishing Access', 'MDHuntFishOutdoors Database'],
    followUpSuggestions: [
      'Chesapeake Bay fishing?',
      'Deep Creek Lake?',
      'Nearest boat ramp?',
    ],
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// BAIT & TACKLE HANDLER
// ─────────────────────────────────────────────────────────────────────────────

function handleBaitTackleQuery(userQuery: string): ChatResponse {
  const q = userQuery.toLowerCase();

  // Striped bass specific
  if ((q.includes('striped') || q.includes('striper')) && (q.includes('bait') || q.includes('lure') || q.includes('tackle'))) {
    return {
      text:
        '**Striped Bass Tackle & Baits**\n\n' +
        '**Live Bait:**\n' +
        '• **Live Shad** — Best choice for trophy stripers\n' +
        '• **Live Herring** — Excellent in Bay\n' +
        '• **Live Bluegill** — Works in rivers\n' +
        '• **Live Eels** — Classic striper bait\n\n' +
        '**Cut Bait:**\n' +
        '• **Cut Shad** — Effective and cost-efficient\n' +
        '• **Mullet chunks** — Good in Bay\n\n' +
        '**Artificial Lures:**\n' +
        '• **Topwater plugs** — Early morning/dusk\n' +
        '• **Crankbaits** — Medium-diving (shad pattern)\n' +
        '• **Soft plastics** — 4-6" shad/herring mimics\n' +
        '• **Spoons** — Silvery 1-2 oz\n\n' +
        '**Tackle Setup:**\n' +
        '• Medium-heavy 6.5-7ft rod\n' +
        '• Baitcasting or conventional reel\n' +
        '• 20-30 lb braided line or mono\n' +
        '• 3-4 oz sinker (adjust for drift)\n\n' +
        '**Best Times:**\n' +
        '• Early morning (dawn — 2 hours after sunrise)\n' +
        '• Late evening (1 hour before sunset)\n' +
        '• Moving tide periods',
      citations: ['MD DNR Striped Bass Guide', 'Chesapeake Bay Fishing Handbook'],
      followUpSuggestions: [
        'Where to fish for stripers?',
        'Striper season 2026?',
        'Rod and reel recommendations?',
      ],
    };
  }

  // Trout specific
  if (q.includes('trout') && (q.includes('bait') || q.includes('fly') || q.includes('lure'))) {
    return {
      text:
        '**Trout Fishing Techniques in Maryland**\n\n' +
        '**Fly Fishing (Most Popular):**\n' +
        '• **Dry Flies:** Light Cahills, Pale Morning Duns (spring)\n' +
        '• **Nymphs:** Gold Ribbed Hare\'s Ears, Pheasant Tails (effective)\n' +
        '• **Streamers:** Woolly Buggers, streamers (deeper water)\n' +
        '• **Rod:** 4-6 weight, 8-9 feet\n\n' +
        '**Spin Fishing:**\n' +
        '• **Small spinners:** 1/8 oz silver/gold\n' +
        '• **Spoons:** 1/16 oz shiny patterns\n' +
        '• **Small crankbaits:** 1-2 inches\n' +
        '• **Soft plastics:** 2-3" minnow imitations\n\n' +
        '**Live Bait:**\n' +
        '• **Small minnows** — Creek chubs, shiners\n' +
        '• **Insects** — Caddis larvae, mayfly nymphs (in stream)\n' +
        '• **Worms** — Red wigglers, nightcrawlers\n\n' +
        '**Best Approach:**\n' +
        '• Downstream presentations (let current carry flies)\n' +
        '• Work structure: rocks, logs, overhanging trees\n' +
        '• Early morning most productive\n\n' +
        'Fly fishing for trout is very rewarding in MD streams!',
      citations: ['MD DNR Trout Fishing Guide', 'Fly Fishing Resources'],
      followUpSuggestions: [
        'Where can I fly fish?',
        'Best trout season?',
        'How to start fly fishing?',
      ],
    };
  }

  // Catfish
  if (q.includes('catfish') && (q.includes('bait') || q.includes('smell'))) {
    return {
      text:
        '**Catfish Bait (The Smellier the Better!)**\n\n' +
        '**Best Catfish Baits:**\n' +
        '• **Chicken Liver** — Classic, inexpensive, effective\n' +
        '• **Stink Bait** — Purchased or homemade\n' +
        '• **Cut Shad** — Fresh or frozen\n' +
        '• **Cut Mullet** — Excellent in tidal water\n' +
        '• **Prepared Dip Baits** — Commercial blends\n\n' +
        '**Live Bait:**\n' +
        '• **Live Bluegill** — For large catfish\n' +
        '• **Live Shiners** — Also effective\n' +
        '• **Crawfish** — Excellent for catfish\n\n' +
        '**DIY Stink Bait Recipe:**\n' +
        '• Mix chicken liver + flour paste\n' +
        '• Age it a few days (stronger = better)\n' +
        '• Store in sealed container\n\n' +
        '**Tackle Setup:**\n' +
        '• Medium rod and reel\n' +
        '• 15-20 lb test line\n' +
        '• 3-4 oz sinker\n' +
        '• Catfish rig (3-way or basic)\n\n' +
        '**Pro Tips:**\n' +
        '• Catfish hunt by smell, not sight\n' +
        '• Fish multiple lines (check local regs)\n' +
        '• Fish deeper holes at night\n' +
        '• Channel cats bite year-round',
      citations: ['MD DNR Catfish Guide'],
      followUpSuggestions: [
        'Where to catch catfish?',
        'Best catfish spots?',
        'Catfish season?',
      ],
    };
  }

  // Generic tackle response
  return {
    text:
      '**Fishing Techniques by Species**\n\n' +
      '**Striped Bass:**\n' +
      '• Live shad, cut shad, topwater plugs\n' +
      '• Medium-heavy rod, 20-30 lb line\n\n' +
      '**Bass (Largemouth/Smallmouth):**\n' +
      '• Crankbaits, soft plastics, topwater\n' +
      '• Medium rod, 10-15 lb line\n\n' +
      '**Trout:**\n' +
      '• Fly fishing (nymphs, dries, streamers) or spin\n' +
      '• Light rod, 4-6 lb line\n\n' +
      '**Catfish:**\n' +
      '• Chicken liver, stink bait, cut fish\n' +
      '• Medium rod, 15-20 lb line\n\n' +
      'Which species are you interested in?',
    citations: ['MD DNR Fishing Guides'],
    followUpSuggestions: [
      'Striped bass tactics?',
      'Trout fly fishing?',
      'Catfish baits?',
    ],
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// SAFETY QUERY HANDLER
// ─────────────────────────────────────────────────────────────────────────────

function handleSafetyQuery(userQuery: string): ChatResponse {
  const q = userQuery.toLowerCase();

  if (q.includes('life jacket') || q.includes('pfd') || q.includes('flotation')) {
    return {
      text:
        '**Life Jacket (PFD) Requirements in Maryland**\n\n' +
        '**Legal Requirements:**\n' +
        '• One USCG-approved PFD per person required on boat\n' +
        '• Children under 13: Must wear at all times\n' +
        '• Adults: Must have on board and available\n\n' +
        '**Recommended:**\n' +
        '• Wear your life jacket at all times while on boat\n' +
        '• Especially important in cold water\n' +
        '• Solo anglers should always wear one\n\n' +
        '**PFD Types (USCG Approved):**\n' +
        '• Type I: Offshore life jacket (best for emergencies)\n' +
        '• Type II: Near-shore buoyant vest (boating)\n' +
        '• Type III: Flotation aid (most comfortable for fishing)\n' +
        '• Type IV: Throwable (backup)\n' +
        '• Type V: Special use (specific activities)\n\n' +
        '**Cold Water Alert:**\n' +
        'Hypothermia can set in quickly. Always wear a life jacket in cold months.',
      citations: ['USCG Boating Safety', 'MD DNR Boating Laws'],
      followUpSuggestions: [
        'What\'s the best PFD for fishing?',
        'Boating rules in Maryland?',
        'Hypothermia prevention?',
      ],
    };
  }

  if (q.includes('hypothermia') || q.includes('cold')) {
    return {
      text:
        '**Hypothermia Risk While Fishing**\n\n' +
        '**What is Hypothermia?**\n' +
        'Drop in core body temperature to dangerous levels — can occur even in moderately cold water.\n\n' +
        '**Danger Timeline in Cold Water:**\n' +
        '• Cold shock: First 1-3 minutes\n' +
        '• Hypothermia onset: 10-20 minutes (60°F water)\n' +
        '• Loss of consciousness: 30-90 minutes\n\n' +
        '**Prevention:**\n' +
        '• Wear a life jacket (provides flotation & insulation)\n' +
        '• Dress in layers (fleece, not cotton)\n' +
        '• Avoid getting wet\n' +
        '• Stay with your boat if it capsizes\n' +
        '• Never fish alone in cold months\n\n' +
        '**Warning Signs:**\n' +
        '• Uncontrollable shivering\n' +
        '• Confusion, slurred speech\n' +
        '• Loss of coordination\n' +
        '• Excessive fatigue\n\n' +
        '**If Hypothermia Occurs:**\n' +
        '1. Get to warmth immediately\n' +
        '2. Remove wet clothing\n' +
        '3. Cover with blankets\n' +
        '4. Call 911\n\n' +
        'Cold-water fishing requires serious preparation!',
      citations: ['Coast Guard Cold Water Safety', 'MD DNR Safety Guidelines'],
      followUpSuggestions: [
        'What to wear for winter fishing?',
        'Life jacket importance?',
        'Safe boating tips?',
      ],
    };
  }

  if (q.includes('weather') || q.includes('wind') || q.includes('storm')) {
    return {
      text:
        '**Weather Safety for Bay Fishing**\n\n' +
        '**Check Before You Go:**\n' +
        '• NOAA weather forecast (weather.gov)\n' +
        '• Wind speed and direction\n' +
        '• Wave height predictions\n' +
        '• Thunderstorm potential\n\n' +
        '**Wind Safety:**\n' +
        '• Winds 10-15 knots: Manageable for most boats\n' +
        '• Winds 15-20 knots: Difficult conditions, stay close to shore\n' +
        '• Winds 20+ knots: Dangerous, don\'t go out\n' +
        '• Gusts can create unexpected waves\n\n' +
        '**Wave Height:**\n' +
        '• 1-2 feet: Safe for most boats\n' +
        '• 2-3 feet: Can be rough, use caution\n' +
        '• 3+ feet: Dangerous for small boats\n\n' +
        '**Thunderstorm Awareness:**\n' +
        '• Never fish during lightning\n' +
        '• Get off water 30+ minutes before storm\n' +
        '• Metal fishing rods attract lightning\n' +
        '• Seek shelter if trapped by storm\n\n' +
        '**Pro Tips:**\n' +
        '• Fish early (calmer mornings)\n' +
        '• Afternoon winds typically increase\n' +
        '• Always file a float plan with someone\n' +
        '• Have emergency radio on board',
      citations: ['NOAA Weather', 'USCG Safety'],
      followUpSuggestions: [
        'When is safe to fish?',
        'Lightning safety?',
        'Boating in rough water?',
      ],
    };
  }

  // Generic safety response
  return {
    text:
      '**Fishing Safety in Maryland**\n\n' +
      '**Boating Safety:**\n' +
      '• Wear a life jacket (USCG-approved)\n' +
      '• Check weather before going out\n' +
      '• File a float plan with someone\n' +
      '• Carry communication device\n' +
      '• Keep emergency supplies on board\n\n' +
      '**Cold Water Safety:**\n' +
      '• Hypothermia risk in cold water\n' +
      '• Dress in layers\n' +
      '• Never fish alone in winter\n\n' +
      '**Fishing Rules:**\n' +
      '• Keep current license and stamps\n' +
      '• Follow bag limits and size restrictions\n' +
      '• Respect closures (spawning periods)\n' +
      '• Practice catch-and-release responsibly\n\n' +
      '**Be Prepared:**\n' +
      '• Check weather (NOAA)\n' +
      '• Know your skill level\n' +
      '• Tell someone where you\'re going\n\n' +
      'Safety first — enjoy responsibly!',
    citations: ['USCG Boating Safety', 'MD DNR Safety'],
    followUpSuggestions: [
      'Life jacket requirements?',
      'Hypothermia prevention?',
      'Safe boating practices?',
    ],
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// GEAR RECOMMENDATION HANDLERS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Handle bait recommendation queries
 */
function handleBaitRecommendationQuery(userQuery: string): ChatResponse {
  const q = userQuery.toLowerCase();
  const currentMonth = new Date().getMonth() + 1;

  // Get seasonal bait guide
  const seasonalGuide = getSeasonalBaitGuide(currentMonth);

  return {
    text:
      '**Fishing Bait Recommendations**\n\n' +
      `**This Month (${new Date().toLocaleString('default', { month: 'long' })}):**\n` +
      `${seasonalGuide}\n\n` +
      '**How to Choose Bait:**\n' +
      '• **Match the hatch:** Use bait that resembles natural food in the water\n' +
      '• **Water type:** Different baits for rivers vs. bay vs. lakes\n' +
      '• **Season:** What fish feed on varies month to month\n' +
      '• **Fish species:** Each species has preferred foods\n\n' +
      '**Pro Tips:**\n' +
      '• Fresh bait is best — replace if sitting in sun\n' +
      '• Keep bait cool in insulated cooler\n' +
      '• Buy from local tackle shops for local knowledge\n' +
      '• Ask other anglers what\'s working\n\n' +
      'Want to explore pre-built bait kits? Check out the Bait & Flies guide!',
    citations: ['MD DNR Fishing Reports', 'Seasonal Bait Guides'],
    followUpSuggestions: [
      'What flies for trout?',
      'Best catfish bait?',
      'View Bait & Flies guide',
    ],
  };
}

/**
 * Handle fly fishing recommendation queries
 */
function handleFlyRecommendationQuery(userQuery: string): ChatResponse {
  const q = userQuery.toLowerCase();

  // Hatch-specific response
  if (q.includes('hatch')) {
    return {
      text:
        '**Maryland Fly Fishing Hatches**\n\n' +
        '**Spring (March — May):**\n' +
        '• **Blue Quills** — Early spring, small flies #16-18\n' +
        '• **Quill Gordons** — March/April, dark patterns\n' +
        '• **Caddis** — April emergence, sedge patterns\n' +
        '• **Light Cahills** — Late spring, #14-16\n\n' +
        '**Summer (June — August):**\n' +
        '• **Pale Morning Duns** — Morning hatch, critical pattern\n' +
        '• **Sulphurs** — Afternoon/evening, #16-18\n' +
        '• **Midges** — Year-round, especially hot days\n' +
        '• **Ants & Beetles** — Terrestrial season\n\n' +
        '**Fall (September — November):**\n' +
        '• **Blue-Winged Olives** — Prime fall hatch, must-have\n' +
        '• **Caddis** — Fall emergence continues\n' +
        '• **Stoneflies** — Golden Stonefly nymphs\n\n' +
        '**Winter (December — February):**\n' +
        '• **Midges** — Almost only option\n' +
        '• **Zebra Midge** — #18-20 essential\n' +
        '• **Blue Quills** — Late winter return\n\n' +
        'Check hatch charts at MDHuntFishOutdoors or local fly shops for real-time updates!',
      citations: ['MD Hatch Charts', 'Local Fly Club Data', 'MDFlies.org'],
      followUpSuggestions: [
        'Where to fly fish in MD?',
        'Fly fishing technique tips?',
        'Best trout streams?',
      ],
    };
  }

  // General fly recommendations
  return {
    text:
      '**Fly Fishing in Maryland**\n\n' +
      '**Essential Dry Fly Assortment:**\n' +
      '• Parachute Adams #12-16\n' +
      '• Light Cahill #14-16\n' +
      '• Pale Morning Dun #16-18\n' +
      '• Blue-Winged Olive #16-20\n' +
      '• Griffith\'s Gnat #18-22 (midge)\n\n' +
      '**Nymph Assortment (Most Effective):**\n' +
      '• Pheasant Tail #14-18\n' +
      '• Hare\'s Ear Gold Ribbed #12-16\n' +
      '• Zebra Midge #18-20\n' +
      '• Caddis Larva Green #14-16\n' +
      '• BWO Nymph #16-18\n\n' +
      '**Streamer/Wet Fly:**\n' +
      '• Woolly Bugger (various colors) #6-10\n' +
      '• Muddler Minnow #8-12\n' +
      '• Soft Hackle patterns\n\n' +
      '**Rod Setup:**\n' +
      '• 8.5-9 ft rod, 4-5 weight\n' +
      '• Weight-forward floating line\n' +
      '• 9-12 ft leader, 4-6x tippet\n\n' +
      'Browse our Bait & Flies section for recommended fly patterns and gear!',
    citations: ['MD DNR Fly Fishing Guide', 'Fly Fishing Resources'],
    followUpSuggestions: [
      'Monthly hatch predictions?',
      'Fly fishing technique?',
      'Best fly fishing locations?',
    ],
  };
}

/**
 * Handle lure recommendation queries
 */
function handleLureRecommendationQuery(userQuery: string): ChatResponse {
  const q = userQuery.toLowerCase();

  return {
    text:
      '**Lure Fishing in Maryland**\n\n' +
      '**For Striped Bass:**\n' +
      '• **Topwater Plugs** — Early morning/dusk strikes\n' +
      '• **Crankbaits** — Medium-diving (6-12 ft), shad pattern\n' +
      '• **Soft Plastics** — 4-6" shad/herring imitations\n' +
      '• **Spoons** — Silvery 1-2 oz, cast and retrieve\n\n' +
      '**For Largemouth Bass:**\n' +
      '• **Shallow Crankbaits** — Around vegetation\n' +
      '• **Jigs** — 1/4-1/2 oz with trailer\n' +
      '• **Soft Plastics** — Worms, creature baits\n' +
      '• **Topwater** — Explosive strikes in low light\n\n' +
      '**For Smallmouth Bass:**\n' +
      '• **Deep Crankbaits** — 12-18 ft dives in rivers\n' +
      '• **Jigs** — Around rocky structure\n' +
      '• **Spinnerbaits** — Chartreuse or white\n' +
      '• **Soft Plastics** — Crawfish imitations\n\n' +
      '**For Catfish:**\n' +
      '• **Large swimbaits** — 3-5 inches\n' +
      '• **Jigs with trailers** — Bright colors\n' +
      '• **Spoons** — Heavy, slow retrieve\n\n' +
      'Want more detailed recommendations? Check the Bait & Flies guide!',
    citations: ['MD DNR Lure Fishing Tips', 'Fishing Technique Guides'],
    followUpSuggestions: [
      'Best lures for stripers?',
      'Bass lure colors?',
      'Where to buy fishing lures?',
    ],
  };
}

/**
 * Handle gear and tackle equipment queries
 */
function handleGearTackleQuery(userQuery: string): ChatResponse {
  const q = userQuery.toLowerCase();

  return {
    text:
      '**Fishing Gear & Tackle Guide**\n\n' +
      'MDHuntFishOutdoors has a comprehensive **Gear Guide** with personalized recommendations based on:\n\n' +
      '• **Your Target Fish** — Different setups for stripers, bass, trout, catfish\n' +
      '• **Water Type** — River, bay, lake, or stream specific gear\n' +
      '• **Fishing Method** — Fly, spin, bait, trolling gear\n' +
      '• **Skill Level** — Beginner, intermediate, or advanced setups\n' +
      '• **Budget** — From budget-friendly to premium options\n\n' +
      '**Quick Gear Categories:**\n' +
      '• **Rods & Reels** — Matched combos and singles\n' +
      '• **Line & Leaders** — Monofilament, braided, fluorocarbon\n' +
      '• **Terminal Tackle** — Hooks, sinkers, swivels, leaders\n' +
      '• **Accessories** — Tackle boxes, nets, scales, pliers\n' +
      '• **Seasonal Gear** — Cold weather, summer, specific season items\n\n' +
      '**Recommendation:**\n' +
      'Open the **Gear Guide** for curated product selections, Amazon links, and expert tips tailored to YOUR fishing style!',
    citations: ['MDHuntFishOutdoors Gear Database', 'Expert Fishing Guides'],
    followUpSuggestions: [
      'Open Gear Guide',
      'Rod recommendations?',
      'Beginner rod setup?',
    ],
  };
}

/**
 * Handle fishing kit recommendation queries
 */
function handleKitRecommendationQuery(userQuery: string): ChatResponse {
  const q = userQuery.toLowerCase();

  const isBeginnerQuery = q.includes('beginner') || q.includes('starter') || q.includes('start');

  return {
    text: isBeginnerQuery
      ? '**Beginner Fishing Kits for Maryland**\n\n' +
        'Getting started in fishing? MDHuntFishOutdoors offers **pre-built beginner kits** with everything you need:\n\n' +
        '**Popular Starter Kits:**\n' +
        '• **MD Trout Starter Kit** — Fly fishing for streams (rod, flies, leaders)\n' +
        '• **Chesapeake Bay Starter** — Bay fishing basics (rod, tackle, access guide)\n' +
        '• **Panfish Kit** — Lakes & ponds (simple setup, perfect for kids)\n' +
        '• **Catfish Kit** — Fun, easy fishing (minimal technique required)\n\n' +
        '**What\'s Included in Kits:**\n' +
        '• Rod & reel combo matched for species\n' +
        '• Essential lures, baits, or flies\n' +
        '• Terminal tackle (hooks, sinkers, leaders)\n' +
        '• Tackle box or storage\n' +
        '• Beginner-friendly instruction card\n\n' +
        '**Next Step:**\n' +
        'Check the **Gear Guide** for detailed kit breakdowns, pricing, and expert reviews!'
      : '**Fishing Kit Recommendations**\n\n' +
        'MDHuntFishOutdoors provides **12 comprehensive fishing kits** for different species and skill levels:\n\n' +
        '**Fly Fishing Kits:**\n' +
        '• MD Trout Starter Kit\n' +
        '• Gunpowder Falls Advanced Kit\n' +
        '• Bay Saltwater Fly Kit\n\n' +
        '**Freshwater Kits:**\n' +
        '• Largemouth Bass Kit\n' +
        '• Smallmouth Bass Kit\n' +
        '• Catfish Night Kit\n' +
        '• Panfish Kit\n\n' +
        '**Bay/Saltwater Kits:**\n' +
        '• Chesapeake Striped Bass Kit\n' +
        '• Kayak Fishing Kit\n\n' +
        '**Why Kits?**\n' +
        '• Removes guesswork — expert-vetted gear\n' +
        '• Better value — bundled pricing\n' +
        '• All matched — rod/reel/line/tackle work together\n' +
        '• Beginner-friendly — clear instructions included\n\n' +
        'Open the **Gear Guide** to explore all kits with photos, reviews, and links!',
    citations: ['MDHuntFishOutdoors Gear Kits', 'Expert Recommendations'],
    followUpSuggestions: isBeginnerQuery
      ? [
          'Which kit is best for me?',
          'Open Gear Guide',
          'View all kits',
        ]
      : [
          'Kit details & pricing?',
          'Open Gear Guide',
          'Beginner kit?',
        ],
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// STRIPED BASS 2026 CHANGES HANDLER
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Handle striped bass 2026 rule changes
 */
function handleStripedBass2026ChangesQuery(userQuery: string): ChatResponse {
  return {
    text:
      '**Striped Bass 2026 Rule Changes — CRITICAL UPDATE**\n\n' +
      '**April 2026 — Catch & Release Only (NEW THIS YEAR)**\n' +
      '• No harvest allowed April 1-30\n' +
      '• First time April is a full C&R month\n' +
      '• All fish must be released\n\n' +
      '**August 2026 — FULL CLOSURE (NEW THIS YEAR)**\n' +
      '• August 1-31: No targeting striped bass\n' +
      '• No fishing for stripers whatsoever\n' +
      '• First time August has a complete closure\n\n' +
      '**Chesapeake Bay (May-September):**\n' +
      '• Daily Limit: 1 fish\n' +
      '• Slot: 19-24 inches\n' +
      '• Spawning river closures: March 1 — May 31 (7 rivers + Upper Bay)\n\n' +
      '**Ocean (Year-round):**\n' +
      '• Daily Limit: 1 fish\n' +
      '• Slot: 28-31 inches (larger than Bay)\n\n' +
      '**Charter Boat Bonuses:**\n' +
      '• Captain + 1 crew mate get extra fish each\n' +
      '• Total 4 fish per boat possible\n\n' +
      '**Why These Changes?**\n' +
      'Poor juvenile recruitment for 7 years straight. These rules protect breeding stock and nurseries.\n\n' +
      '**Key Takeaway:** Plan your fishing around April C&R and August closure. Check DNR before you go.',
    citations: ['https://dnr.maryland.gov/fisheries/Pages/striped-bass.aspx'],
    followUpSuggestions: [
      'What about ocean stripers?',
      'Spawning river closures details?',
      'Charter boat regulations?',
    ],
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// FISH CONSUMPTION ADVISORY HANDLER
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Handle fish consumption advisory queries
 */
function handleFishConsumptionAdvisoryQuery(userQuery: string): ChatResponse {
  return {
    text:
      '**Maryland Fish Consumption Advisory**\n\n' +
      '**Health Contaminants Monitored:**\n' +
      '• Methylmercury (mercury)\n' +
      '• PCBs (polychlorinated biphenyls)\n' +
      '• Pesticides (historical)\n' +
      '• PFAS (new — "forever chemicals")\n\n' +
      '**15 Species Monitored:**\n' +
      '• Largemouth & smallmouth bass\n' +
      '• Yellow perch\n' +
      '• Channel & blue catfish\n' +
      '• Common carp\n' +
      '• American shad\n' +
      '• Crappie & bluegill\n' +
      '• White perch\n' +
      '• And more\n\n' +
      '**Vulnerable Groups (Follow Stricter Limits):**\n' +
      '• Children (highest risk)\n' +
      '• Pregnant women\n' +
      '• Nursing mothers\n' +
      '• Women of childbearing age\n\n' +
      '**Resources:**\n' +
      '• **Interactive Mobile Map:** View by location and species\n' +
      '• **PDF Advisory Guide:** Full details and portion recommendations\n' +
      '• **Species-Specific Info:** Check what\'s safe in YOUR area\n\n' +
      '**Safe Fishing Practices:**\n' +
      'Trim skin and fatty tissue. Cook with high heat. Eat variety of species. Don\'t eat organs.',
    citations: ['https://mde.maryland.gov/programs/Marylander/fishandshellfish/Pages/FishConsumptionAdvisory.aspx'],
    followUpSuggestions: [
      'Which fish are safest to eat?',
      'PFAS explained?',
      'Where is it safe in my area?',
    ],
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// FISHING LICENSE FEES HANDLER
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Handle fishing license fee queries
 */
function handleFishingLicenseFeesQuery(userQuery: string): ChatResponse {
  return {
    text:
      '**Maryland Fishing License Fees 2026**\n\n' +
      '**Resident Freshwater:**\n' +
      '• **Annual License:** $32\n' +
      '• **7-Day Option:** Available\n' +
      '• **3-Day Option:** Available\n\n' +
      '**Non-Resident:**\n' +
      '• **Annual License:** $55+\n' +
      '• **Short-Term Options:** 7-day, 3-day available\n\n' +
      '**Additional Stamps (Separate Purchases):**\n' +
      '• **Trout Stamp:** $20 resident / $30 non-resident\n' +
      '  (Required if fishing for trout — changed 2025)\n' +
      '  (Seniors eligible for discount)\n' +
      '• **Chesapeake Bay License:** $15 resident\n' +
      '  (Required for Bay and tidal water fishing)\n' +
      '• **Crabbing Add-on:** $2 (with Chesapeake Bay license)\n\n' +
      '**Free Fishing:**\n' +
      '• **Youth Under 16:** NO LICENSE REQUIRED\n' +
      '• **Disabled Veterans:** FREE lifetime license\n' +
      '• **Free Fishing Days 2026:**\n' +
      '  - June 6 (Saturday)\n' +
      '  - June 13 (Saturday)\n' +
      '  - July 4 (Saturday)\n\n' +
      '**Purchase Licenses:**\n' +
      'compass.dnr.maryland.gov or authorized vendors statewide\n\n' +
      '**Pro Tip:** Plan your trips around Free Fishing Days if you\'re new to the sport!',
    citations: ['https://dnr.maryland.gov/fisheries/Pages/licenses.aspx'],
    followUpSuggestions: [
      'Do I need a trout stamp?',
      'What about Bay fishing?',
      'Free fishing days coming up?',
    ],
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// TROUT STOCKING HANDLER
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Handle trout stocking queries
 */
function handleTroutStockingQuery(userQuery: string): ChatResponse {
  return {
    text:
      '**Trout Stocking in Maryland 2026**\n\n' +
      '**Stocking Volume:**\n' +
      '• ~240,000 adult trout annually\n' +
      '• 26% increase planned for 2026\n' +
      '• Species: Brown, Golden, Rainbow\n\n' +
      '**Stocking Coverage:**\n' +
      '• 19 counties\n' +
      '• 100+ waters statewide\n' +
      '• Mix of streams, lakes, ponds\n\n' +
      '**Spring 2026 Schedule:**\n' +
      '• **February:** Start stocking (south/central/east regions)\n' +
      '• **March:** Continue stocking (western regions)\n' +
      '• **Youth-Only Fishing:** March 21\n' +
      '• **Public Opening Day:** March 28\n\n' +
      '**Get Live Updates:**\n' +
      '• **Hotline:** 800-688-3467 ext 1 (call for daily updates)\n' +
      '• **Facebook:** Follow MD DNR for Friday stocking reports\n' +
      '• **Website:** compass.dnr.maryland.gov for detailed locations\n\n' +
      '**Pro Tip:** Fish RIGHT after stocking for best success. New stockings = aggressive fish!',
    citations: ['https://dnr.maryland.gov/fisheries/Pages/trout-stocking.aspx'],
    followUpSuggestions: [
      'Which waters get stocked near me?',
      'When is youth opening day?',
      'What flies work best for stocked trout?',
    ],
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// CRABBING HANDLER
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Handle crabbing queries
 */
function handleCrabbingQuery(userQuery: string): ChatResponse {
  return {
    text:
      '**Crabbing Season & Regulations in Maryland**\n\n' +
      '**Season:**\n' +
      '• April 1 — December 15\n' +
      '• Wednesdays CLOSED (no crabbing)\n\n' +
      '**Size Requirements:**\n' +
      '• **Males Only** (females protected for breeding)\n' +
      '• **5" minimum** carapace width\n' +
      '• **5.25" minimum** after July 14\n\n' +
      '**Daily Limits:**\n' +
      '• **Unlicensed (recreational):** 24 crabs/day\n' +
      '• **2 People:** 48 crabs/day combined\n' +
      '• **Licensed Boat:** 1 bushel capacity\n\n' +
      '**Required Licenses & Fees:**\n' +
      '• **Chesapeake Bay License:** Required ($15)\n' +
      '• **Crabbing Add-on:** $2 (separate)\n' +
      '• **Purchase:** compass.dnr.maryland.gov\n\n' +
      '**Pot Equipment Requirements:**\n' +
      '• **Cull Rings (escape hatches):**\n' +
      '  - 2.1875" (small females)\n' +
      '  - 2.5625" (egg-bearing females)\n' +
      '• **Turtle Reduction Device (TRD):** Mandatory\n\n' +
      '**Private Property:**\n' +
      '• **2 pots allowed FREE** on private land\n' +
      '• No commercial activity\n\n' +
      '**Fishing Hours:**\n' +
      '• **April/October-December:** Half hour after sunrise to sunset\n' +
      '• **May-September:** Half hour BEFORE sunrise to sunset\n\n' +
      'Always check local regulations before heading out!',
    citations: ['https://dnr.maryland.gov/fisheries/Pages/crabbing.aspx'],
    followUpSuggestions: [
      'Best crabbing locations?',
      'How to measure crabs?',
      'What bait works best?',
    ],
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// BOATING SAFETY HANDLER
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Handle boating safety queries
 */
function handleBoatingSafetyQuery(userQuery: string): ChatResponse {
  return {
    text:
      '**Boating Safety in Maryland**\n\n' +
      '**Boating Certificate (Required):**\n' +
      '• **Requirement:** Born after July 1, 1972 (everyone)\n' +
      '• **Minimum Course:** 8 hours\n' +
      '• **Exam:** 80% to pass\n' +
      '• **NASBLA-Approved:** Online courses accepted\n' +
      '• **Lifetime Valid:** No renewal needed\n\n' +
      '**Boat Registration:**\n' +
      '• **Required for:** All motorized vessels\n' +
      '• **Duration:** 2-year registration\n' +
      '• **Decals:** Display required\n\n' +
      '**Personal Flotation Devices (PFDs/Life Jackets):**\n' +
      '• **Requirement:** One USCG-approved PFD per person on board\n' +
      '• **Types Approved:** Type I, II, III, IV, V (USCG-certified)\n' +
      '• **Children <13:** MUST WEAR on boats <21 feet\n' +
      '• **Children <4:** Must have leg strap on PFD\n\n' +
      '**Personal Watercraft (PWC/Jet Skis):**\n' +
      '• **Operator Age:** 16 years minimum\n' +
      '• **Certificate:** Required\n' +
      '• **PFD Requirement:** ALL operators and passengers MUST wear\n' +
      '• **No Exceptions:** Everyone wears a life jacket\n\n' +
      '**Boating Under the Influence (BUI):**\n' +
      '• **Penalties:** Up to 1 year jail + $1,000 fine\n' +
      '• **BAC Limit:** Same as driving (0.08%)\n\n' +
      '**Safe Fishing Practices:**\n' +
      'Wear your PFD while fishing on any boat. Accidents happen fast.',
    citations: ['https://dnr.maryland.gov/boating/Pages/safety.aspx'],
    followUpSuggestions: [
      'Where do I get a boating certificate?',
      'What type of PFD do I need?',
      'Boating rules on the Chesapeake?',
    ],
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// CREEL SURVEY HANDLER
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Handle creel survey and stock assessment queries
 */
function handleCreelSurveyQuery(userQuery: string): ChatResponse {
  return {
    text:
      '**Creel Surveys & Fish Population Monitoring**\n\n' +
      '**What is a Creel Survey?**\n' +
      'Volunteer-based monitoring program that tracks fish populations and fishery health statewide.\n\n' +
      '**History:**\n' +
      '• Active since 2009\n' +
      '• Proven method for stock assessment\n' +
      '• Community engagement + science\n\n' +
      '**Key Monitoring Programs:**\n' +
      '• **Potomac River Muskellunge Tracking:** Monitor trophy muskie population\n' +
      '• **Electrofishing (Daytime):** General stock assessment in streams\n' +
      '• **Electrofishing (Nighttime):** Potomac River catfish surveys on boat\n\n' +
      '**Data Collected:**\n' +
      '• Species composition\n' +
      '• Size distributions\n' +
      '• Population trends\n' +
      '• Stocking effectiveness\n\n' +
      '**Reports Generated:**\n' +
      '• **Monthly Reports:** Stock assessments, stocking activity, survey results\n' +
      '• **Public Availability:** Free online (compass.dnr.maryland.gov)\n' +
      '• **Actionable Data:** Guides regulation changes and stocking decisions\n\n' +
      '**How to Participate:**\n' +
      'Volunteers welcome! Contact MD DNR Fisheries Division for opportunities.\n\n' +
      '**Why It Matters:**\n' +
      'Your catch data helps protect Maryland\'s fishery for future generations.',
    citations: ['https://dnr.maryland.gov/fisheries/Pages/surveys.aspx'],
    followUpSuggestions: [
      'How do I volunteer?',
      'Are muskies recovering?',
      'Latest stocking report?',
    ],
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// FRESHWATER REGULATIONS QUICK REFERENCE HANDLER
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Handle freshwater regulations quick reference queries
 */
function handleFreshwaterRegulationsQuery(userQuery: string): ChatResponse {
  return {
    text:
      '**Maryland Freshwater Fishing Regulations — Quick Reference**\n\n' +
      '**Trout (Brook, Brown, Rainbow):**\n' +
      '• **Brook & Brown Combined:** 2 fish/day\n' +
      '• **Rainbow (Put-and-Take):** 5 fish/day\n' +
      '• **Youth Areas (under 16):** 2 trout max (no brook)\n' +
      '• **Trout Stamp Required:** $20 (in addition to license)\n\n' +
      '**Bass (Largemouth & Smallmouth):**\n' +
      '• **Minimum Size:** 12 inches\n' +
      '• **Daily Limit:** 5 fish/day per species\n' +
      '• **Preferred:** Native largemouths in lakes, smallmouths in rivers\n\n' +
      '**Panfish (Crappie, Bluegill, etc):**\n' +
      '• **Crappie & Bluegill:** 15 fish/day combined\n' +
      '• **No minimum size**\n' +
      '• **Great for kids:** Easy to catch, excellent eating\n\n' +
      '**Catfish (Channel & Blue):**\n' +
      '• **Channel Catfish:** NO daily limit (year-round)\n' +
      '• **Blue Catfish:** NO daily limit (year-round)\n' +
      '• **No minimum size**\n' +
      '• **Available:** Ponds, lakes, rivers\n\n' +
      '**Muskie (Muskellunge):**\n' +
      '• **Minimum Size:** 40 inches\n' +
      '• **Daily Limit:** 1 fish/day\n' +
      '• **Trophy Fish:** C&R recommended unless you want taxidermy\n\n' +
      '**Walleye (Deep Creek Reservoir):**\n' +
      '• **Minimum Size:** 15 inches\n' +
      '• **Protected Slot:** 18-21 inches (must release)\n' +
      '• **Closed:** March 1 — April 15 (spawning protection)\n' +
      '• **Daily Limit:** Check current regulations\n\n' +
      '**General Tips:**\n' +
      'Always verify local lake/stream regulations. Some waters have different limits. Check compass.dnr.maryland.gov before you go.',
    citations: ['https://dnr.maryland.gov/fisheries/Pages/regulations/freshwater.aspx'],
    followUpSuggestions: [
      'Deep Creek walleye details?',
      'Where can I fish for muskie?',
      'Best freshwater spots?',
    ],
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// SNAKEHEAD FISHING HANDLER
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Handle snakehead fishing queries
 */
function handleSnakeheadFishingQuery(userQuery: string): ChatResponse {
  return {
    text:
      '**Snakehead Fishing in Maryland**\n\n' +
      '**Why Snakeheads Matter:**\n' +
      'Largest U.S. population of Northern Snakeheads established in Maryland. Invasive species with no natural predators — they threaten native fish and disturb aquatic ecosystems.\n\n' +
      '**Regulations (NO Size or Creel Limits):**\n' +
      '• **Size Limit:** NONE — keep any size\n' +
      '• **Daily Limit:** NO limit — kill on sight encouraged\n' +
      '• **Methods:** Rod & reel, bowfishing, spearfishing all legal\n' +
      '• **Bounty Program:** ACTIVE — check dnr.maryland.gov for details\n' +
      '• **Reporting:** Submit catches to help tracking efforts\n\n' +
      '**Why No Limits?**\n' +
      'Snakeheads can breathe air, survive out of water for days, and thrive in warm, shallow water. They reproduce rapidly and outcompete native species.\n\n' +
      '**Top Hotspots:**\n' +
      '• **Blackwater NWR (Dorchester County):** Densest population in U.S.\n' +
      '• **Mattawoman Creek:** Large fish, high pressure from anglers\n' +
      '• **Pomonkey Creek:** Hidden gem with fewer anglers\n' +
      '• **Cambridge/Dorchester County waters:** Consistent catches\n\n' +
      '**Effective Tactics:**\n' +
      '• **Topwater Frogs:** Walk the dog patterns, early morning/evening\n' +
      '• **Chatterbaits:** 3/8–1/2 oz, slow retrieve near structure\n' +
      '• **Bowfishing:** Night hunting with lights, 30–40 lb bow\n' +
      '• **Best Times:** Warm months (April–October)\n\n' +
      '**Keep Your Catch:**\n' +
      'Snakeheads are firm, white meat — excellent eating. Fillet carefully (spiny dorsal).',
    citations: ['https://dnr.maryland.gov/fisheries/Pages/snakehead.aspx'],
    followUpSuggestions: [
      'Bowfishing techniques for snakeheads?',
      'Blackwater NWR access details?',
      'Snakehead tournaments?',
    ],
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// FLY FISHING STREAMS HANDLER
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Handle fly fishing stream queries
 */
function handleFlyFishingStreamsQuery(userQuery: string): ChatResponse {
  return {
    text:
      '**Fly Fishing Streams in Maryland**\n\n' +
      '**Top Fly Fishing Destinations:**\n\n' +
      '**Gunpowder Falls (Carroll County)**\n' +
      '• **Fly-Only Section:** 7.2 miles of pristine water\n' +
      '• **Rod Recommendation:** 4–5 weight\n' +
      '• **Species:** Rainbow trout, brown trout\n' +
      '• **Techniques:** Nymphs (Pheasant Tail, Hare\'s Ear), dry flies (Blue-Winged Olives, Stimulators)\n\n' +
      '**Savage River (Garrett County)**\n' +
      '• **Designation:** Fly-Only section (Blue Ribbon tailwater)\n' +
      '• **Rod Recommendation:** 4 weight\n' +
      '• **Habitat:** Cold spring-fed, excellent insect hatches\n' +
      '• **Difficulty:** Moderate to advanced (selective trout)\n\n' +
      '**Big Hunting Creek (Catoctin Mountains)**\n' +
      '• **Scenic:** Catoctin Mountain National Park access\n' +
      '• **Species:** Native brook trout, stocked rainbows\n' +
      '• **Rod:** 3–4 weight\n\n' +
      '**Youghiogheny River (Garrett County)**\n' +
      '• **Characteristics:** Larger river, trophy browns\n' +
      '• **Rod:** 5–6 weight\n' +
      '• **Best:** Post-dam release for high water\n\n' +
      '**Hatch Calendar:**\n' +
      '• **March–April:** Blue-Winged Olives (BWO), Hendricksons\n' +
      '• **May–June:** Sulfurs, Caddis (especially Gunpowder)\n' +
      '• **July–August:** Hopper season, terrestrials\n' +
      '• **Sept–October:** Streamers (Woolly Buggers), Marabou\n\n' +
      '**Essential Patterns:**\n' +
      '• Nymphs: Pheasant Tail, Hare\'s Ear, Caddis Larva\n' +
      '• Dry: Adams, Light Cahill, Elk Hair Caddis, Stimulator\n' +
      '• Streamers: Woolly Bugger (black/brown), Articulated Streamer',
    citations: ['https://dnr.maryland.gov/fisheries/Pages/trout.aspx'],
    followUpSuggestions: [
      'Best fly for summer fishing?',
      'Gunpowder parking and access?',
      'Fly casting lessons in Maryland?',
    ],
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// TROPHY FISH / STATE RECORDS HANDLER
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Handle trophy fish and state record queries
 */
function handleTrophyFishQuery(userQuery: string): ChatResponse {
  return {
    text:
      '**Maryland Trophy Fish & State Records**\n\n' +
      '**FishMaryland Program**\n' +
      'Official recognition and tracking program for trophy and exceptional catches in Maryland.\n\n' +
      '**Coverage:**\n' +
      '• **60+ Species Tracked:** All major game and panfish species\n' +
      '• **Categories:** Catch & Release, Kept Fish\n' +
      '• **Records:** Weight, length, location, date, angler name\n\n' +
      '**Master Angler Award**\n' +
      '• **Achievement:** Catch 10 different species listed in FishMaryland\n' +
      '• **Recognition:** Certificate, inclusion on recognition wall\n' +
      '• **Community:** Join elite group of skilled anglers\n\n' +
      '**How to Submit Your Catch:**\n' +
      '1. Catch a noteworthy fish (species record or personal best)\n' +
      '2. Take high-quality photo(s) of the fish with ruler/weight scale visible\n' +
      '3. Record: Species, weight, length, location, date, angler name\n' +
      '4. Visit dnr.maryland.gov/fisheries/Pages/FishMaryland.aspx\n' +
      '5. Complete submission form online\n\n' +
      '**Photo Requirements:**\n' +
      '• Fish must be in focus and identifiable\n' +
      '• Ruler or scale clearly visible\n' +
      '• Timestamp or date recorded\n' +
      '• Water/location context recommended\n\n' +
      '**Why Participate?**\n' +
      '• Preserve your achievement permanently\n' +
      '• Contribute to scientific data on fish populations\n' +
      '• Join Maryland\'s fishing legacy\n' +
      '• Inspire other anglers\n\n' +
      '**Processing Time:**\n' +
      'Submissions typically reviewed within 2–4 weeks. Verification by DNR staff.',
    citations: ['https://dnr.maryland.gov/fisheries/Pages/FishMaryland.aspx'],
    followUpSuggestions: [
      'What\'s the state record for [species]?',
      'How do I get Master Angler?',
      'Submit a catch',
    ],
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// ICE FISHING HANDLER
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Handle ice fishing queries
 */
function handleIceFishingQuery(userQuery: string): ChatResponse {
  return {
    text:
      '**Ice Fishing in Maryland**\n\n' +
      '**Primary Destination:**\n' +
      '**Deep Creek Lake (Garrett County)** is the ONLY realistic option for ice fishing in Maryland. Located in the western mountains, it reliably freezes 12–16 weeks per winter.\n\n' +
      '**Deep Creek Lake Regulations:**\n' +
      '• **Yellow Perch:** 10 fish/day limit\n' +
      '• **Walleye:** 5 fish/day (season opens April 16)\n' +
      '• **License:** Valid Maryland fishing license required\n' +
      '• **Ice Thickness:** 4 inches minimum for walking\n\n' +
      '**Ice Safety — CRITICAL:**\n' +
      '• **Walking:** 4 inches minimum\n' +
      '• **Snowmobile/ATV:** 5–7 inches\n' +
      '• **Vehicle (Car):** 8–12 inches\n' +
      '• **Check Conditions:** Ice thickness varies across lake\n' +
      '• **Unsafe Zones:** Inlets, outlets, springs (always thin)\n' +
      '• **Never Go Alone:** Always fish with a buddy\n' +
      '• **Tell Someone:** Let people know where you\'ll be\n\n' +
      '**Before You Go:**\n' +
      '1. Contact local bait shops for current ice conditions\n' +
      '2. Check weather forecasts — sudden thaws dangerous\n' +
      '3. Drill test holes as you move\n' +
      '4. Bring ice chisel, rope, floatation device\n' +
      '5. Avoid black ice (thin spots)\n\n' +
      '**Ice Fishing Gear Essentials:**\n' +
      '• Ice auger (hand crank or electric)\n' +
      '• Ice fishing rod (short, 24–28")\n' +
      '• Jigs (1/16–1/8 oz, yellow/white)\n' +
      '• Live minnows (shiners, herring)\n' +
      '• Sled or bucket for gear\n' +
      '• Weatherproof clothing, hand warmers\n\n' +
      '**Hole Size Regulation:**\n' +
      '• **Maximum Diameter:** 10 inches\n' +
      '• **Violations:** Subject to citation\n\n' +
      '**Season Timing:**\n' +
      '• Typically December–February (depends on freeze)\n' +
      '• Peak conditions: January–early February\n' +
      '• Monitor compass.dnr.maryland.gov for conditions',
    citations: ['https://dnr.maryland.gov/fisheries/Pages/regulations/icefishing.aspx'],
    followUpSuggestions: [
      'Current ice conditions at Deep Creek?',
      'Best ice fishing time?',
      'Deep Creek Lake access points?',
    ],
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// ARTIFICIAL REEFS HANDLER
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Handle artificial reef queries
 */
function handleArtificialReefQuery(userQuery: string): ChatResponse {
  return {
    text:
      '**Maryland Artificial Reefs**\n\n' +
      '**Maryland Reef Initiative**\n' +
      'Largest artificial reef program on East Coast. Over 60 reef sites in Chesapeake Bay created to enhance fish habitat and provide structure for recreational fishing.\n\n' +
      '**Program Stats:**\n' +
      '• **60+ Reef Sites:** Mapped and tracked\n' +
      '• **Partners:** 60+ organizations (universities, NGOs, municipalities, private sector)\n' +
      '• **Reef Type:** Reef balls (concrete structures with chambers)\n' +
      '• **Coverage:** Main stem Chesapeake Bay and Eastern Shore\n\n' +
      '**Key Reef Locations:**\n' +
      '• **Cedar Point Reef:** 38.31°N, 76.37°W (excellent fishing)\n' +
      '• **Cedarhurst Reef:** 38.84°N, 76.46°W (trophy stripers)\n' +
      '• **Coble Reef:** 5 acres, high fish density\n' +
      '• **Additional 57+ Sites:** Detailed on Maryland iMap portal\n\n' +
      '**How to Find Reefs:**\n' +
      '1. **Maryland iMap Portal:** data.imap.maryland.gov\n' +
      '2. **Search Layer:** "Maryland Artificial Reefs"\n' +
      '3. **GPS Coordinates:** Display coordinates and download details\n' +
      '4. **Mobile Access:** Use mobile GPS app to navigate\n\n' +
      '**Fishing on Reefs:**\n' +
      '• **Best Species:** Striped bass, largemouth bass, catfish\n' +
      '• **Techniques:** Bottom structure fishing, jigging, live bait\n' +
      '• **Timing:** Spring/fall peak (water temp 55–70°F)\n' +
      '• **Boat:** Needed — most reefs 15–60 feet deep\n\n' +
      '**Habitat Benefits:**\n' +
      'Reef balls provide shelter for juvenile fish, breeding grounds, and food sources (algae, crustaceans). They reduce turbidity and increase biodiversity.\n\n' +
      '**Support the Program:**\n' +
      'Consider adopting a reef or volunteering with partner organizations. Report data (catches, species, observations) to support research.',
    citations: ['https://dnr.maryland.gov/fisheries/Pages/artificial-reefs.aspx'],
    followUpSuggestions: [
      'Best reef for stripers?',
      'How to access Maryland iMap?',
      'Reef adoption volunteer opportunities?',
    ],
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// SPAWNING CLOSURES DETAIL HANDLER
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Handle spawning closure and river closure queries
 */
function handleSpawningClosureQuery(userQuery: string): ChatResponse {
  return {
    text:
      '**Striped Bass Spawning Closures in Maryland**\n\n' +
      '**Annual Closure Period: March 1 — May 31**\n' +
      'Protects spawning runs in critical nursery rivers.\n\n' +
      '**CLOSED RIVERS (NO TARGETING STRIPED BASS):**\n' +
      '• **Choptank River** (Eastern Shore)\n' +
      '• **Nanticoke River** (Eastern Shore, DE border)\n' +
      '• **Potomac River tributaries:** Shenandoah, James, etc.\n' +
      '• **Chester River** (Eastern Shore)\n' +
      '• **Elk River** (Upper Chesapeake)\n' +
      '• **Northeast River** (Upper Chesapeake)\n' +
      '• **Susquehanna River** (Upper Chesapeake)\n\n' +
      '**Susquehanna Flats Boundary:**\n' +
      '• **Northern Limit (Closure Boundary):** 39.60°N, 76.13°W\n' +
      '• **South of boundary:** Fishing allowed (with restrictions)\n' +
      '• **North of boundary:** Closed March 1—May 31\n\n' +
      '**2026 Changes (New):**\n' +
      '• **Catch & Release (C&R) in Main Bay:** NOW ALLOWED in April\n' +
      '• **Keep Restrictions:** Harvest allowed May 1+ only (main Bay)\n' +
      '• **Confirmation:** Check dnr.maryland.gov for 2026 season details\n\n' +
      '**Why These Closures?**\n' +
      'Striped bass spawn in spring when water temps reach 50–60°F. Rivers provide critical nursery habitat for larvae. Closures prevent harvest during vulnerable window.\n\n' +
      '**Penalties for Violation:**\n' +
      '• Citation and fine (up to $500+)\n' +
      '• License suspension possible\n\n' +
      '**Fishing Alternatives During Closure:**\n' +
      '• Fish main Chesapeake Bay (south of closure boundary)\n' +
      '• Target other species: largemouth bass, catfish, perch\n' +
      '• Fish coastal waters (Tangier Sound, etc.)\n' +
      '• Catch & release in Bay (April only, 2026)',
    citations: ['https://dnr.maryland.gov/fisheries/Pages/striped-bass.aspx'],
    followUpSuggestions: [
      'Striped bass season details?',
      'Chesapeake Bay fishing rules?',
      'Alternative fishing during closure?',
    ],
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// COMMUNITY FISHING REPORTS HANDLER
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Handle community fishing reports and current conditions queries
 */
function handleCommunityFishingReportsQuery(userQuery: string): ChatResponse {
  return {
    text:
      '**Where to Find Current Fishing Reports**\n\n' +
      '**Official Maryland DNR Reports**\n' +
      '• **Friday Fishing Report:** news.maryland.gov/dnr\n' +
      '• **Topics:** Weekly stocking, water conditions, bite reports by region\n' +
      '• **Updated:** Every Friday (seasonal)\n' +
      '• **Email Subscription:** Available on DNR website\n\n' +
      '**Regional & Community Sources**\n\n' +
      '**FishTalk Magazine** (fishtalkmag.com)\n' +
      '• Weekly Chesapeake Bay fishing reports\n' +
      '• Species-specific guides (stripers, perch, catfish)\n' +
      '• Tackle reviews, tournament announcements\n\n' +
      '**On The Water** (onthewater.com/regions/chesapeake)\n' +
      '• Multi-species reports (saltwater focus)\n' +
      '• Seasonal migration tracking\n' +
      '• Video content\n\n' +
      '**Tidal Fish Forum** (tidalfish.com)\n' +
      '• Very active Chesapeake Bay fishing community\n' +
      '• Daily spot reports, real-time bite updates\n' +
      '• Species-specific forums\n' +
      '• Mentorship from experienced anglers\n\n' +
      '**Podcasts (Subscribe & Listen)**\n' +
      '• **"Fishing the DMV"** — #1 DMV fishing podcast, weekly episodes\n' +
      '• **"Maryland Fishing Line"** — Local expertise, guest anglers\n' +
      '• **"Chesapeake Bay Daily Report"** — Short daily updates\n\n' +
      '**YouTube Channels (24/7 Content)**\n' +
      '• **Amped Up Outdoors** — Chesapeake techniques, tournament coverage\n' +
      '• **Bass Brothers Fishing** (21.4K subs) — Education, how-tos\n' +
      '• **Chesapeake Light Tackle** — Technique-focused, stripers & light tackle\n\n' +
      '**Water Temperature & Conditions:**\n' +
      '• **NOAA Buoys:** buoys.noaa.gov (real-time Bay water temp)\n' +
      '• **WeatherGov:** weather.gov/marine (wind, tides, forecasts)\n' +
      '• **Tidal Predictions:** tidesandcurrents.noaa.gov\n\n' +
      '**Pro Tips for Finding Fish:**\n' +
      '1. Check multiple sources for consensus (when 2+ sources agree, fish are likely there)\n' +
      '2. Watch recent videos to see techniques that work NOW\n' +
      '3. Join Tidal Fish Forum — anglers post real-time updates\n' +
      '4. Follow seasonal patterns (spring spawning, summer structure, fall migration)',
    citations: ['https://news.maryland.gov/dnr/category/fishing-report/'],
    followUpSuggestions: [
      'Latest stocking report?',
      'Current Chesapeake stripers bite?',
      'Water temperature today?',
    ],
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// 2026-05-02 — DNR research pass handlers (V2.4)
// ─────────────────────────────────────────────────────────────────────────────

function handle2026StockingProgramQuery(_userQuery: string): ChatResponse {
  return {
    text:
      '**2026 Spring Trout Stocking Program — Enhanced**\n\n' +
      'MD DNR is stocking ~240,000 adult trout this spring — a 26% ' +
      'increase over 2025, thanks to better summer conditions at the ' +
      'Bear Creek hatchery.\n\n' +
      '**Stocking timing:**\n' +
      '• Central / southern / eastern counties: stocking starts February\n' +
      '• Allegany + Garrett: stocking starts March, runs through May\n' +
      '• Species: brown, golden rainbow, rainbow trout (no brook from put-and-take)\n\n' +
      '**Key dates:**\n' +
      '• March 21 — Youth-Only Trout Fishing Day (kids <16, 2-fish limit)\n' +
      '• March 28 — Trout Opening Day (closure-period waters reopen)\n\n' +
      '**Stocking updates:**\n' +
      '• Daily on the DNR trout-stocking webpage\n' +
      '• Weekly Friday afternoon on Facebook / X / FishBrain\n' +
      '• Phone hotline: 800-688-3467, press option 1 (recorded weekly)\n\n' +
      '**Email signup:** dnr.maryland.gov news service for stocking ' +
      'alerts as soon as a water gets stocked.',
    citations: [
      'https://news.maryland.gov/dnr/2026/02/05/maryland-dnr-offers-enhanced-trout-stocking-program-for-2026/',
      'https://dnr.maryland.gov/fisheries/Documents/MD_DNR-2026MonthlyStockingSchedule.pdf',
      'https://dnr.maryland.gov/fisheries/pages/trout/stocking.aspx',
    ],
    followUpSuggestions: [
      'When is opening day?',
      'Which streams are stocked?',
      'How do I sign up for stocking alerts?',
    ],
  };
}

function handleSeniorLicenseQuery(_userQuery: string): ChatResponse {
  return {
    text:
      '**Maryland Senior Fishing License (65+)**\n\n' +
      'Maryland residents 65+ qualify for the **Resident Senior ' +
      'Consolidated License**, which covers fresh + tidal Bay + ' +
      'Atlantic / coastal-bay fishing for 365 days from purchase.\n\n' +
      '**2025 change:**\n' +
      'The Senior Consolidated License **no longer includes the ' +
      'trout stamp**. Seniors who fish for trout must now buy the ' +
      '**$20 Resident Trout Stamp separately**.\n\n' +
      '**Other senior provisions:**\n' +
      '• Free fishing days don\'t require a license at any age — ' +
      'first 2 Saturdays of June + July 4\n' +
      '• Universal Disability Pass available for seniors with ' +
      'qualifying disability\n' +
      '• Lifetime license is one-time purchase, no annual renewal\n\n' +
      '**How to buy:** Maryland Outdoors licensing system (online), ' +
      'any DNR license agent, or 866-344-8889 Mon-Fri 8:30am-4:30pm.',
    citations: [
      'https://dnr.maryland.gov/pages/service_fishing_license.aspx',
      'https://www.eregulations.com/maryland/fishing/licenses-fees',
    ],
    followUpSuggestions: [
      'Do I need a trout stamp?',
      'When are free fishing days?',
      'How do I get a Universal Disability Pass?',
    ],
  };
}

function handlePFDQuery(_userQuery: string): ChatResponse {
  return {
    text:
      '**Maryland Boating PFD Requirements**\n\n' +
      '**On any vessel:**\n' +
      '• At least one wearable Type I, II, III, or V PFD per person\n' +
      '• All PFDs must be USCG-approved, in serviceable condition, ' +
      'readily accessible, properly sized\n\n' +
      '**Boats >16 ft (recreational):**\n' +
      '• Plus at least one Type IV (throwable — ring buoy or seat ' +
      'cushion)\n\n' +
      '**Children under 13:**\n' +
      '• Must wear a PFD at all times while underway on any vessel ' +
      '<21 ft, unless below deck / in an enclosed cabin / vessel ' +
      'is moored or anchored\n\n' +
      '**Personal watercraft (PWC):**\n' +
      '• ALL occupants wear a PFD while underway, no size exemption\n\n' +
      '**Don\'t cut corners:**\n' +
      '• PFDs in a sealed bag don\'t count as "readily accessible"\n' +
      '• Type V inflatables only count if worn, not stowed\n' +
      '• A throwable Type IV alone doesn\'t satisfy the wearable rule\n\n' +
      'Maryland Natural Resources Police actively boards on the Bay; ' +
      'fines start ~$50 per missing/expired PFD.',
    citations: [
      'https://dnr.maryland.gov/nrp/pages/boatingsafety/state-requirements-for-recreational-vessels.aspx',
      'https://dnr.maryland.gov/boating/documents/recreationvessels.pdf',
    ],
    followUpSuggestions: [
      'Where can I find boat ramps?',
      'What\'s the BUI law?',
      'Do I need a boating safety course?',
    ],
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// HELPER FUNCTIONS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Extract species from a fishing query
 */
function extractSpeciesFromQuery(q: string): string | null {
  const patterns: Record<string, string> = {
    'striped bass|stripers?|striper': 'Striped Bass',
    'largemouth bass|largemouth': 'Largemouth Bass',
    'smallmouth bass|smallmouth': 'Smallmouth Bass',
    'yellow perch|perch': 'Yellow Perch',
    'rainbow trout|rainbow': 'Rainbow Trout',
    'brown trout|brown': 'Brown Trout',
    'channel catfish|catfish|cats': 'Channel Catfish',
    'blue catfish|blue cat': 'Blue Catfish',
    'carp|common carp': 'Carp',
    'crappie': 'Crappie',
  };

  for (const [pattern, species] of Object.entries(patterns)) {
    if (new RegExp(pattern).test(q)) {
      return species;
    }
  }

  return null;
}
