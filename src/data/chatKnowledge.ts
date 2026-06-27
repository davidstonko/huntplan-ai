/**
 * MDHuntFishOutdoors AI Chat Knowledge Base
 *
 * This module provides intelligent responses to hunting queries by searching through
 * Maryland hunting data and generating contextual, accurate answers.
 *
 * When integrated with the backend, this will be replaced with RAG queries against
 * the PostgreSQL + pgvector database. For now, it provides smart local responses.
 */

import {
  MD_SEASONS,
  MD_WMAS,
  MD_COUNTIES,
  MD_BAG_LIMITS,
  MD_RUT_CALENDAR,
  getSeasonsBySpecies,
  isInSeason,
  getWMAsByCounty,
  getBagLimitInfo,
  getCurrentRutPhase,
} from './marylandHuntingData';
import {
  marylandPublicLands,
  searchLands,
  getLandsByCounty,
  DATA_STATS,
} from './marylandPublicLands';
import {
  servicesForRegion,
  servicesForSpecies,
  type LocalService,
} from './marylandLocalServices';
import { CURATED_HUNTING_GEAR } from './curatedHuntingGear';

// ─────────────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────────────

export interface ChatResponse {
  text: string;
  citations?: string[]; // References like 'MD DNR Hunter\'s Guide', etc.
  followUpSuggestions?: string[];
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN QUERY HANDLER
// ─────────────────────────────────────────────────────────────────────────────

/**
 * 2026-04-27: Hunt-mode local-pros augmentation. Mirrors the fishing
 * chat pattern but joins on regions (counties, named areas) and species
 * (sika, whitetail, goose, duck, bear) instead of waterbodies. Up to 3
 * services rendered as a markdown bullet list at the end of any
 * response that mentions a known region or species.
 */
const HUNT_REGION_TOKENS: ReadonlyArray<readonly [string, string]> = [
  // Eastern Shore counties
  ['dorchester', 'Dorchester County'],
  ['kent county', 'Kent County'],
  ['queen anne', "Queen Anne's County"],
  ['talbot', 'Talbot County'],
  ['eastern shore', 'Eastern Shore'],
  // Western counties
  ['garrett', 'Garrett County'],
  ['allegany', 'Allegany County'],
  ['western maryland', 'Western Maryland'],
  ['western md', 'Western Maryland'],
  ['frederick county', 'Frederick County'],
  // Central
  ['baltimore county', 'Baltimore County'],
  ['carroll', 'Carroll County'],
  ['howard county', 'Howard County'],
  ['anne arundel', 'Anne Arundel County'],
  ['harford', 'Harford County'],
  ['baltimore metro', 'Baltimore Metro'],
  // Conowingo corridor
  ['conowingo', 'Conowingo area'],
];

const HUNT_SPECIES_TOKENS: ReadonlyArray<readonly [string, string]> = [
  ['sika', 'Sika Deer'],
  ['whitetail', 'Whitetail'],
  ['white-tail', 'Whitetail'],
  ['white tail', 'Whitetail'],
  ['goose', 'Canada Goose'],
  ['geese', 'Canada Goose'],
  ['snow goose', 'Snow Goose'],
  ['duck', 'Duck'],
  ['waterfowl', 'Duck'],
  ['turkey', 'Turkey'],
  ['bear', 'Bear'],
  ['sea duck', 'Sea Duck'],
];

function detectHuntContext(q: string): { region?: string; species?: string } {
  const ctx: { region?: string; species?: string } = {};
  for (const [token, canonical] of HUNT_REGION_TOKENS) {
    if (q.includes(token)) {
      ctx.region = canonical;
      break;
    }
  }
  for (const [token, canonical] of HUNT_SPECIES_TOKENS) {
    if (q.includes(token)) {
      ctx.species = canonical;
      break;
    }
  }
  return ctx;
}

/**
 * Append a "Local pros" footer for hunt-mode responses. Joins on region
 * first (more specific), falls back to species if no region match. The
 * union prevents the same business from listing twice when both match.
 */
function augmentWithHuntLocalPros(
  response: ChatResponse,
  userQuery: string,
): ChatResponse {
  const ctx = detectHuntContext(userQuery.toLowerCase());
  if (!ctx.region && !ctx.species) return response;
  const seen = new Set<string>();
  const collected: LocalService[] = [];
  if (ctx.region) {
    for (const s of servicesForRegion(ctx.region)) {
      if (!seen.has(s.id)) {
        seen.add(s.id);
        collected.push(s);
        if (collected.length >= 3) break;
      }
    }
  }
  if (collected.length < 3 && ctx.species) {
    for (const s of servicesForSpecies(ctx.species)) {
      if (!seen.has(s.id)) {
        seen.add(s.id);
        collected.push(s);
        if (collected.length >= 3) break;
      }
    }
  }
  if (collected.length === 0) return response;
  const headerWater = ctx.region ?? ctx.species ?? 'Maryland';
  const footer =
    `\n\n**Local pros for ${headerWater}:**\n` +
    collected
      .map((p) => {
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
 * 2026-04-29: AI gear-suggestion monetization for Hunt mode.
 * Mirrors the fishing pattern (augmentWithGearSuggestions in
 * fishingChatKnowledge.ts). When a chat query mentions a species /
 * weapon-method / accessory category, append a "What we use" footer
 * with top 3 picks from CURATED_HUNTING_GEAR (Amazon affiliate links,
 * mdoutdoors1-20 tag).
 *
 * Detection map:
 *   - whitetail / deer / saddle / treestand → 'whitetail_saddle' or 'hunting_stands_blinds'
 *   - turkey / spring → 'spring_turkey'
 *   - sika → 'sika_deer'
 *   - bear → 'bear_hunting'
 *   - waterfowl / duck / goose → 'hunting_calls_decoys'
 *   - optics / binoculars / scope / rangefinder → 'hunting_optics_observation'
 *   - clothing / camo / base layer → 'hunting_clothing_layers'
 *   - call / decoy → 'hunting_calls_decoys'
 *   - knife / pack / accessory → 'hunting_accessories_tools'
 */
const HUNT_GEAR_CATEGORY_TOKENS: ReadonlyArray<readonly [readonly string[], string]> = [
  [['saddle', 'tree saddle'], 'whitetail_saddle'],
  [['treestand', 'tree stand', 'climbing stand', 'ladder stand', 'ground blind'], 'hunting_stands_blinds'],
  [['turkey', 'gobbler', 'spring season'], 'spring_turkey'],
  [['sika'], 'sika_deer'],
  [['bear'], 'bear_hunting'],
  [['call', 'decoy', 'duck call', 'goose call', 'turkey call', 'grunt'], 'hunting_calls_decoys'],
  [['binocular', 'scope', 'rangefinder', 'spotting', 'optic'], 'hunting_optics_observation'],
  [['camo', 'base layer', 'jacket', 'pant', 'clothing', 'merino'], 'hunting_clothing_layers'],
  [['knife', 'pack', 'backpack', 'accessory'], 'hunting_accessories_tools'],
  // Fallback for whitetail/deer questions: surface saddle gear as the
  // creator-pick category (David runs saddle setups, mostly).
  [['whitetail', 'deer'], 'whitetail_saddle'],
];

function detectHuntGearCategory(q: string): string | null {
  for (const [tokens, categoryId] of HUNT_GEAR_CATEGORY_TOKENS) {
    if (tokens.some((t) => q.includes(t))) return categoryId;
  }
  return null;
}

function augmentWithHuntGearSuggestions(
  response: ChatResponse,
  userQuery: string,
): ChatResponse {
  const categoryId = detectHuntGearCategory(userQuery.toLowerCase());
  if (!categoryId) return response;
  const category = CURATED_HUNTING_GEAR.find((c) => c.id === categoryId);
  if (!category || category.items.length === 0) return response;
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
      `curatedHuntingGear.ts — ${category.title}`,
    ],
  };
}

/**
 * Main entry point for AI chat queries.
 * Analyzes the user's query and returns a contextual, data-driven response.
 *
 * 2026-04-29: chain-augmented with two enhancements (mirroring fishing):
 *   1. augmentWithHuntLocalPros — splices "Local pros" footer for known counties/species
 *   2. augmentWithHuntGearSuggestions — splices "What we use" footer with
 *      Amazon affiliate links from CURATED_HUNTING_GEAR (David's monetization)
 */
export function getSmartResponse(userQuery: string): ChatResponse {
  const raw = getSmartResponseRaw(userQuery);
  const withPros = augmentWithHuntLocalPros(raw, userQuery);
  return augmentWithHuntGearSuggestions(withPros, userQuery);
}

function getSmartResponseRaw(userQuery: string): ChatResponse {
  const q = userQuery.toLowerCase().trim();

  // Specific legal-detail intents go first — they use words ("when", "how
  // many", "need", "time") that the broader season/license/bag handlers below
  // would otherwise grab.
  if (isShootingHoursQuery(q)) {
    return handleShootingHoursQuery(userQuery);
  }

  if (isBlazeOrangeQuery(q)) {
    return handleBlazeOrangeQuery(userQuery);
  }

  if (isFieldTaggingQuery(q)) {
    return handleFieldTaggingQuery(userQuery);
  }

  // Detect intent and route to appropriate handler
  if (isSeasonQuery(q)) {
    return handleSeasonQuery(userQuery);
  }

  if (isBagLimitQuery(q)) {
    return handleBagLimitQuery(userQuery);
  }

  if (isWeaponQuery(q)) {
    return handleWeaponQuery(userQuery);
  }

  if (isWMAQuery(q)) {
    return handleWMAQuery(userQuery);
  }

  if (isLicenseQuery(q)) {
    return handleLicenseQuery(userQuery);
  }

  if (isSundayHuntingQuery(q)) {
    return handleSundayHuntingQuery(userQuery);
  }

  if (isCountySpecificQuery(q)) {
    return handleCountySpecificQuery(userQuery);
  }

  if (isPlanningQuery(q)) {
    return handlePlanningQuery(userQuery);
  }

  if (isRutQuery(q)) {
    return handleRutQuery(userQuery);
  }

  if (isCWDQuery(q)) {
    return handleCWDQuery(userQuery);
  }

  if (isHarvestDataQuery(q)) {
    return handleHarvestDataQuery(userQuery);
  }

  if (isLicenseFeeQuery(q)) {
    return handleLicenseFeeQuery(userQuery);
  }

  if (isBearHuntingQuery(q)) {
    return handleBearHuntingQuery(userQuery);
  }

  if (isTurkeyQuery(q)) {
    return handleTurkeyQuery(userQuery);
  }

  if (isSpecialHuntsQuery(q)) {
    return handleSpecialHuntsQuery(userQuery);
  }

  if (isFederalLandsQuery(q)) {
    return handleFederalLandsQuery(userQuery);
  }

  if (isConservationOrgsQuery(q)) {
    return handleConservationOrgsQuery(userQuery);
  }

  if (isWaterfowlQuery(q)) {
    return handleWaterfowlQuery(userQuery);
  }

  if (isManagedHuntQuery(q)) {
    return handleManagedHuntQuery(userQuery);
  }

  if (isHarvestReportingQuery(q)) {
    return handleHarvestReportingQuery(userQuery);
  }

  if (isHunterEducationQuery(q)) {
    return handleHunterEducationQuery(userQuery);
  }

  if (isDogTrainingQuery(q)) {
    return handleDogTrainingQuery(userQuery);
  }

  if (isAccessibleHuntingQuery(q)) {
    return handleAccessibleHuntingQuery(userQuery);
  }

  if (isPublicPermitQuery(q)) {
    return handlePublicPermitQuery(userQuery);
  }

  if (isSmallGameQuery(q)) {
    return handleSmallGameQuery(userQuery);
  }

  if (isSikaDeerQuery(q)) {
    return handleSikaDeerQuery(userQuery);
  }

  // 2026-05-02 (DNR research pass): trapping was a class-miss until
  // today. Keep the dispatch ordered so trapping is checked AFTER
  // sika (which uses 'eastern shore' that could falsely match) and
  // BEFORE the default — every query that mentions 'trap' or any of
  // the 11 furbearer species should hit the dedicated handler.
  if (isTrappingQuery(q)) {
    return handleTrappingQuery(userQuery);
  }

  if (isBowfishingQuery(q)) {
    return handleBowfishingQuery(userQuery);
  }

  if (isHarvestStatsQuery(q)) {
    return handleHarvestStatsQuery(userQuery);
  }

  // Default: helpful fallback
  return getDefaultResponse();
}

// ─────────────────────────────────────────────────────────────────────────────
// INTENT DETECTION
// ─────────────────────────────────────────────────────────────────────────────

function isSeasonQuery(q: string): boolean {
  return /season|when|dates|open|close|start|end/.test(q);
}

function isBagLimitQuery(q: string): boolean {
  return /bag limit|how many|limit|harvest|take/.test(q);
}

function isWeaponQuery(q: string): boolean {
  return /weapon|bow|rifle|shotgun|muzzleloader|firearm|gun/.test(q);
}

function isWMAQuery(q: string): boolean {
  return /wma|public land|where.*hunt|public ground|management area|area|location/.test(q);
}

function isLicenseQuery(q: string): boolean {
  return /license|permit|stamp|HIP|registration|requirement|need/.test(q);
}

function isSundayHuntingQuery(q: string): boolean {
  return /sunday|sabbath|day of week|when open/.test(q);
}

function isCountySpecificQuery(q: string): boolean {
  return /county|maryland region|area|garret|alleghany|cecil|harford|washington|montgomery|frederick|carroll|baltimore|howard|anne arundel|prince george|calvert|charles|st\.? mary|dorchester|somerset|wicomico|worcester|talbot|queen anne|kent|caroline/.test(
    q
  );
}

function isPlanningQuery(q: string): boolean {
  return /plan|recommend|suggest|help|what should|best time|where to hunt|hunt plan/.test(q);
}

function isRutQuery(q: string): boolean {
  return /rut|breeding|estrus|doe|doe cycle|seeking|pre-rut|post-rut|peak rut|second rut|buck behavior|chasing|scrape|rub line/.test(q);
}

function isCWDQuery(q: string): boolean {
  return /cwd|chronic wasting|disease|cwdma|spine|backbone|deboned|carcass transport/.test(q);
}

function isHarvestDataQuery(q: string): boolean {
  return /harvest|statistics|how many|deer harvest|total deer|antlered|antlerless|harvest report/.test(q);
}

function isLicenseFeeQuery(q: string): boolean {
  return /license cost|how much|license fee|price|resident|nonresident|senior|junior|apprentice|stamp cost/.test(q);
}

function isBearHuntingQuery(q: string): boolean {
  return /bear|black bear|bear hunting|bear permit|bear zone|bear lottery/.test(q);
}

function isTurkeyQuery(q: string): boolean {
  return /turkey|gobbler|tom|wild turkey|turkey season|turkey harvest/.test(q);
}

function isSpecialHuntsQuery(q: string): boolean {
  return /special hunt|lottery|mentored|chesapeake forest|deal island|military base|fort meade|patuxent|apg/.test(q);
}

function isFederalLandsQuery(q: string): boolean {
  return /blackwater|federal|refuge|national wildlife|eastern neck|patuxent|nwf|c&o canal|chesapeake.{0,5}ohio|recreation\.gov|non.{0,2}lead|nontoxic|straight.{0,2}wall/.test(q);
}

function isConservationOrgsQuery(q: string): boolean {
  return /trout unlimited|ducks unlimited|nwtf|wild turkey federation|sportsmen|conservation org|cbf|chesapeake bay foundation|qdma|backcountry hunters|bha|coastal conservation|cca|izaak walton|banquet|chapter meeting|volunteer.{0,20}(steward|conservation)/.test(q);
}

function isWaterfowlQuery(q: string): boolean {
  return /waterfowl|duck|goose|geese|blind|midwinter survey|diving duck|canada geese|teal|mallard|waterfowl hunt/.test(q);
}

function isManagedHuntQuery(q: string): boolean {
  return /managed hunt|urban archery|controlled hunt|anne arundel|seneca creek|wye island|lottery hunt/.test(q);
}

function isHarvestReportingQuery(q: string): boolean {
  return /report harvest|check station|report deer|confirmation|harvest report|compass\.dnr|mdoutdoors|register.*(deer|turkey|harvest)/.test(q);
}

function isShootingHoursQuery(q: string): boolean {
  return /shooting hours|hunting hours|legal hours|shooting light|legal light|what time.*hunt|how early.*hunt|how late.*hunt|before sunrise|after sunset|sunrise|sunset|half hour/.test(
    q
  );
}

function isBlazeOrangeQuery(q: string): boolean {
  return /blaze orange|fluorescent|hunter orange|safety orange|daylight orange|\borange\b|fluorescent pink|what.*(to )?wear/.test(
    q
  );
}

function isFieldTaggingQuery(q: string): boolean {
  return /field tag|field-tag|\btagging\b|tag (my|the|your|a|that) (deer|turkey|bear|animal|harvest|kill)|possession tag|how.*tag|attach.*tag|do i.*tag|need.*tag/.test(
    q
  );
}

function isHunterEducationQuery(q: string): boolean {
  return /hunter education|hunter safety|hunter ed|safety course|apprentice|learnhunting/.test(q);
}

function isDogTrainingQuery(q: string): boolean {
  return /dog training|retriever|bird dog|dog area|mckee-beshers|indian springs/.test(q);
}

function isAccessibleHuntingQuery(q: string): boolean {
  return /disabled|ada|accessible|wheelchair|disability|mobility|universal disability/.test(q);
}

function isPublicPermitQuery(q: string): boolean {
  return /public land permit|free permit|state land|wma permit|display parking/.test(q);
}

function isSmallGameQuery(q: string): boolean {
  return /rabbit|squirrel|pheasant|small game|dove|quail|grouse|delmarva fox squirrel/.test(q);
}

function isSikaDeerQuery(q: string): boolean {
  return /sika|sika deer|elk|asian elk|eastern shore|fishing bay|taylor's island/.test(q);
}

// 2026-05-02 (V2.4 audit, DNR research pass): trapping/furbearer was a
// CLASS MISS — the entire activity (beaver, fisher, fox, muskrat, mink,
// raccoon, opossum, skunk, coyote, weasel) had zero coverage in the
// hunt chat-knowledge. App previously modeled everything as either
// hunt or fish; trapping uses many of the same lands but its own
// license tier, season calendar, and reporting flow.
function isTrappingQuery(q: string): boolean {
  return /trap|trapping|trapper|furbearer|fur-bear|beaver|fisher\b|muskrat|mink\b|raccoon|opossum|possum|skunk|weasel|coyote|conibear|foothold|bodygrip|fur season|fur taking|fur-taker/.test(q);
}

// 2026-05-02 (V2.4 audit, DNR research pass): added detector for
// statewide harvest stats. The 2024-2025 deer harvest report (DNR
// Big Game Report) reported 84,201 deer (15.9% above prior year),
// and spring 2025 turkey harvest was 4,851 birds. Users asking
// "how many deer were taken in MD last year" now hit a real handler
// instead of the default fallback.
function isHarvestStatsQuery(q: string): boolean {
  return /how many (deer|turkey|bear|sika)|harvest (stat|report|number|total)|big game report|deer report|turkey report|brood survey|how many.*hunters|annual harvest|statewide harvest|last year.*harvest/.test(q);
}

// 2026-05-02 (V2.4 audit, DNR research pass): bowfishing for invasive
// snakehead and blue catfish removes ~20% of the snakehead population
// annually per DNR's 2026 study. We had bowfishing in fish chat but
// no cross-link from hunt — bowhunters often add bowfishing as a
// summer extension of the same skillset.
function isBowfishingQuery(q: string): boolean {
  return /bow ?fish|bowfishing|gigging|gar |snakehead|invasive fish|blue catfish/.test(q);
}

// ─────────────────────────────────────────────────────────────────────────────
// SEASON QUERY HANDLER
// ─────────────────────────────────────────────────────────────────────────────

function handleSeasonQuery(userQuery: string): ChatResponse {
  const q = userQuery.toLowerCase();

  // Extract species name from query
  const species = extractSpeciesFromQuery(q);

  if (!species) {
    return {
      text:
        'I can help you find season dates! Which species are you interested in?\n\n' +
        '• White-tailed Deer (archery, firearms, muzzleloader)\n' +
        '• Wild Turkey (spring, fall)\n' +
        '• Waterfowl (ducks, geese, teal)\n' +
        '• Small Game (rabbit, squirrel, pheasant, grouse)\n' +
        '• Black Bear (Garrett/Allegany counties only)\n\n' +
        'Just ask about the one you\'re interested in!',
      citations: ['MD DNR Hunter\'s Guide'],
      followUpSuggestions: [
        'When is deer archery season?',
        'When can I hunt turkey?',
        'Waterfowl season dates',
      ],
    };
  }

  const seasons = getSeasonsBySpecies(species);

  if (seasons.length === 0) {
    return {
      text: `I don't have season information for "${species}" yet. Check the Regulations tab for a complete list, or ask about deer, turkey, waterfowl, or small game.`,
      citations: ['MD DNR Hunter\'s Guide'],
    };
  }

  // Format seasons for display
  const seasonLines = seasons
    .map((s) => {
      const startFormatted = formatDate(s.startDate);
      const endFormatted = formatDate(s.endDate);
      return `• ${s.seasonType}: ${startFormatted} — ${endFormatted}\n  Weapon: ${s.weaponType}${
        s.notes ? `\n  ${s.notes}` : ''
      }`;
    })
    .join('\n\n');

  return {
    text:
      `**${species} Seasons (2025-2026 Maryland)**\n\n${seasonLines}\n\n` +
      'Always verify exact dates with the MD DNR Hunter\'s Guide before heading out.\n' +
      'Check the Regulations tab for detailed bag limits and county-specific rules.',
    citations: ['MD DNR Hunter\'s Guide', 'Maryland Season Calendar'],
    followUpSuggestions: [
      `What are the bag limits for ${species}?`,
      `Where can I hunt ${species}?`,
      'What weapon types are allowed?',
    ],
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// BAG LIMIT QUERY HANDLER
// ─────────────────────────────────────────────────────────────────────────────

function handleBagLimitQuery(userQuery: string): ChatResponse {
  const q = userQuery.toLowerCase();
  const species = extractSpeciesFromQuery(q);

  if (!species) {
    return {
      text:
        'Bag limits vary by species. Which animal are you asking about?\n\n' +
        '• **Deer**: 2 antlered per year (plus a Bonus Antlered Deer Stamp for more). Antlerless depends on your deer region — Region A (Allegany, Garrett, western Washington) is just 2 for the year; Region B is much higher (archery 15, firearms 10, muzzleloader 10).\n' +
        '• **Turkey**: 1 in spring, 2 in fall/winter combined\n' +
        '• **Ducks**: 6 per day\n' +
        '• **Rabbits**: 4 per day\n' +
        '• **Squirrels**: 6 per day\n\n' +
        'Ask me about a specific species for full details.',
      citations: ['MD DNR Bag Limits'],
      followUpSuggestions: [
        'Deer bag limit',
        'Turkey bag limit',
        'Waterfowl limits',
      ],
    };
  }

  const limits = getBagLimitInfo(species);

  if (limits.length === 0) {
    return {
      text: `No specific bag limit information available for "${species}". Check the Regulations tab for complete details.`,
      citations: ['MD DNR Bag Limits'],
    };
  }

  const limitLines = limits
    .map(
      (l) =>
        `• ${l.limitType}: ${l.quantity} ${l.species} per ${l.timePeriod}${
          l.weaponType ? ` (${l.weaponType})` : ''
        }${l.notes ? ` — ${l.notes}` : ''}`
    )
    .join('\n');

  return {
    text:
      `**${species} Bag Limits (Maryland 2025-2026)**\n\n${limitLines}\n\n` +
      'Check the Regulations tab for county-specific variations and any recent updates.',
    citations: ['MD DNR Bag Limits'],
    followUpSuggestions: [
      `When is ${species} season?`,
      'What weapons can I use?',
      'Are there county restrictions?',
    ],
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// WEAPON QUERY HANDLER
// ─────────────────────────────────────────────────────────────────────────────

function handleWeaponQuery(userQuery: string): ChatResponse {
  const q = userQuery.toLowerCase();

  const weaponInfo: Record<string, string> = {
    bow: 'Archery (Bow) — Earliest seasons. Allows longest seasons (Sep-Jan for deer). Requires practice and skill. Most versatile across species.',
    rifle:
      'Rifle — High-powered rifles (.243 or larger). Used during firearms season (Nov-Dec). Not allowed everywhere.',
    shotgun:
      'Shotgun — Versatile weapon. Used for firearms season (with slugs), waterfowl (with shot), and small game. Widely allowed.',
    muzzleloader:
      'Muzzleloader — Special season in fall and winter. Single-shot, must reload between shots. One antlered deer limit per season.',
    slug: 'Shotgun Slug — Used in shotguns for deer during firearms season. Effective up to 100+ yards with modern slugs.',
  };

  for (const [weapon, info] of Object.entries(weaponInfo)) {
    if (q.includes(weapon)) {
      return {
        text:
          `**${weapon.toUpperCase()} — Maryland Hunting**\n\n${info}\n\n` +
          'Different seasons allow different weapons. Check the Regulations tab to see which weapons are allowed for your target species.',
        citations: ['MD DNR Hunter\'s Guide'],
        followUpSuggestions: [
          'What seasons allow bows?',
          'When is rifle season?',
          'Shotgun seasons in Maryland?',
        ],
      };
    }
  }

  // Generic weapon response
  return {
    text:
      'Maryland allows multiple weapon types for hunting:\n\n' +
      '• **Bow (Archery)** — Longest seasons, early opener (Sep 6 for deer)\n' +
      '• **Rifle** — Powerful, accurate, limited seasons\n' +
      '• **Shotgun** — Versatile, allowed in more places\n' +
      '• **Muzzleloader** — Special seasons, single-shot\n\n' +
      'Each weapon has different seasons. Check the Regulations tab for complete details.',
    citations: ['MD DNR Hunter\'s Guide'],
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// WMA (PUBLIC LAND) QUERY HANDLER
// ─────────────────────────────────────────────────────────────────────────────

function handleWMAQuery(userQuery: string): ChatResponse {
  const q = userQuery.toLowerCase();

  // Try to extract county from query
  const countyName = extractCountyFromQuery(q);

  // First try searching the full 192-land database
  const searchTerms = q.replace(/wma|public land|where|hunt|can i|near|me|in|the|a|an|at/g, '').trim();
  if (searchTerms.length > 2) {
    const results = searchLands(searchTerms).slice(0, 5);
    if (results.length > 0 && results[0].name.toLowerCase().includes(searchTerms.slice(0, 4))) {
      const land = results[0];
      const speciesList = land.huntableSpecies.length > 0 ? land.huntableSpecies.join(', ') : 'Check with DNR';
      const weaponsList = land.allowedWeapons.length > 0 ? land.allowedWeapons.join(', ') : 'Check with DNR';
      return {
        text:
          `**${land.name}** (${land.designation})\n` +
          `County: ${land.county}\n` +
          (land.acres ? `Acres: ${land.acres.toLocaleString()}\n` : '') +
          `Species: ${speciesList}\n` +
          `Weapons: ${weaponsList}\n` +
          `Sunday Hunting: ${land.sundayHunting ? 'Yes' : 'No'}\n` +
          `Reservation Required: ${land.reservationRequired ? 'Yes' : 'No'}\n` +
          (land.mobilityImpaired ? `ADA Accessible: Yes\n` : '') +
          (land.accessNotes ? `\nAccess: ${land.accessNotes}\n` : '') +
          (land.websiteUrl ? `\nMore info: ${land.websiteUrl}` : '') +
          (land.dnrMapPdf ? `\nMap PDF: ${land.dnrMapPdf}` : ''),
        citations: ['MDHuntFishOutdoors Database (192 lands)', 'MD DNR'],
        followUpSuggestions: [
          `Other lands in ${land.county}?`,
          `When is ${land.huntableSpecies[0] || 'deer'} season?`,
          'Show me on the map',
        ],
      };
    }
  }

  if (countyName) {
    // Search the full 192-land database by county
    const landsInCounty = getLandsByCounty(countyName);

    if (landsInCounty.length > 0) {
      const landList = landsInCounty
        .slice(0, 8)
        .map(
          (l) =>
            `• **${l.name}** (${l.designation}${l.acres ? `, ${l.acres.toLocaleString()} ac` : ''})${l.sundayHunting ? ' — Sun OK' : ''}`
        )
        .join('\n');

      return {
        text:
          `**Public Hunting Lands in ${countyName} County** (${landsInCounty.length} areas)\n\n${landList}\n` +
          (landsInCounty.length > 8 ? `\n...and ${landsInCounty.length - 8} more\n` : '') +
          '\nTap the Map tab to see exact boundaries and locations for each area.',
        citations: ['MDHuntFishOutdoors Database (192 lands)', 'MD DNR'],
        followUpSuggestions: [
          `Details about ${landsInCounty[0].name}?`,
          'Sunday hunting allowed?',
          'Which have deer hunting?',
        ],
      };
    }
  }

  // Generic public lands response using real stats
  const stats = DATA_STATS;
  return {
    text:
      `**Maryland Public Hunting Lands**\n\n` +
      `MDHuntFishOutdoors tracks **${stats.totalLands} public hunting areas** across ${stats.countiesWithLands} counties, plus **${stats.totalRanges} shooting ranges**.\n\n` +
      `By type:\n` +
      `• WMA (Wildlife Management Area): ${stats.landsByDesignation.WMA}\n` +
      `• State Forest: ${stats.landsByDesignation.SF}\n` +
      `• State Park: ${stats.landsByDesignation.SP}\n` +
      `• CFL (Cooperative Forest Land): ${stats.landsByDesignation.CFL}\n` +
      `• CWMA (Cooperative WMA): ${stats.landsByDesignation.CWMA}\n` +
      `• NRMA (Natural Resource Mgmt Area): ${stats.landsByDesignation.NRMA}\n` +
      `• NEA (Natural Environment Area): ${stats.landsByDesignation.NEA}\n` +
      `• FMA (Forest Mgmt Agreement): ${stats.landsByDesignation.FMA}\n\n` +
      'Use the **Map** tab to explore all areas with real GIS boundaries, or tell me your county to see nearby options.',
    citations: ['MDHuntFishOutdoors Database', 'MD DNR', 'MD iMap GIS'],
    followUpSuggestions: [
      'Public lands in my county?',
      'Which WMAs allow deer hunting?',
      'Can I hunt on Sunday?',
    ],
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// LICENSE & PERMIT HANDLER
// ─────────────────────────────────────────────────────────────────────────────

function handleLicenseQuery(userQuery: string): ChatResponse {
  return {
    text:
      '**Maryland Hunting License Requirements**\n\n' +
      '**Required:**\n' +
      '• **Hunting License** — Resident or Non-Resident\n' +
      '  Resident: $35/year (Junior under 16: $15, Senior 65+: $5)\n' +
      '  Non-Resident: $160/year (Junior: $80, Senior: $65)\n\n' +
      '• **Bonus Antlered Deer Stamp** — only for additional antlered deer\n' +
      '  $10 resident / $25 non-resident\n\n' +
      '• **Waterfowl** — free **HIP registration** plus the **Maryland Migratory\n' +
      '  Game Bird Stamp ($15)** and the **Federal Duck Stamp ($29)**\n\n' +
      '• **Hunter Safety Course** — Required if born after 1-1-1976\n' +
      '  Take the course online, then pass the exam\n\n' +
      '**Optional but Common:**\n' +
      '• **Trout Stamp** — If fishing for trout\n' +
      '• **Archery/Crossbow Permits** — Usually included\n\n' +
      '**Purchase at:** compass.dnr.maryland.gov or authorized vendors\n\n' +
      '_I can\'t purchase licenses for you — you\'ll need to do that yourself for security._',
    citations: ['MD DNR License & Permits', 'compass.dnr.maryland.gov'],
    followUpSuggestions: [
      'What if I\'m a non-resident?',
      'Do I need a hunter safety course?',
      'Where do I buy a license?',
    ],
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// SUNDAY HUNTING HANDLER
// ─────────────────────────────────────────────────────────────────────────────

function handleSundayHuntingQuery(userQuery: string): ChatResponse {
  const q = userQuery.toLowerCase();
  const countyName = extractCountyFromQuery(q);

  if (countyName) {
    const county = MD_COUNTIES.find(
      (c) => c.name.toLowerCase() === countyName.toLowerCase()
    );

    if (county) {
      return {
        text:
          `**Sunday Hunting in ${county.name} County, Maryland**\n\n` +
          (county.sundayHuntingAllowed
            ? `Maryland does **not** allow hunting every Sunday. Sunday deer hunting is open only on **specific designated dates** that vary by county, season, and weapon.\n\n` +
              `${county.name} County has some designated Sunday hunting dates, but you must check the exact dates and whether they apply to private land only or also designated public land.\n\n` +
              `📅 See DNR's **Sunday Deer Hunting Calendar** for this county's exact dates.`
            : `✗ **No Sunday deer hunting** is offered in ${county.name} County.`) +
          `\n\nAlways verify current rules with MD DNR before your hunt.`,
        citations: [
          'MD DNR Sunday Deer Hunting Calendar',
          'https://dnr.maryland.gov/huntersguide/documents/sundaydeerhuntingcalendar.pdf',
        ],
        followUpSuggestions: [
          'Other counties?',
          'What are the Sunday hunting hours?',
          'Sunday hunting on public land?',
        ],
      };
    }
  }

  return {
    text:
      '**Sunday Hunting in Maryland**\n\n' +
      'Maryland does **not** have blanket Sunday hunting. Sunday deer hunting is allowed only on **specific designated dates** that vary by **county, season, and weapon** — and a few counties (Baltimore, Howard, Prince George’s) offer none.\n\n' +
      '**Where it applies:** some counties open designated Sundays on private and designated public land; others on private land only. Some Sundays also carry restricted shooting hours.\n\n' +
      '**Find your dates:** DNR publishes a dedicated **Sunday Deer Hunting Calendar** each license year — that is the authoritative source.\n\n' +
      'Tip: Tell me your county and I can point you to the right rules.',
    citations: [
      'MD DNR Sunday Deer Hunting Calendar',
      'https://dnr.maryland.gov/huntersguide/documents/sundaydeerhuntingcalendar.pdf',
    ],
    followUpSuggestions: [
      'Sunday hunting in Garrett County?',
      'What are the legal hunting hours?',
      'Which counties have no Sunday hunting?',
    ],
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// COUNTY-SPECIFIC QUERY HANDLER
// ─────────────────────────────────────────────────────────────────────────────

function handleCountySpecificQuery(userQuery: string): ChatResponse {
  const q = userQuery.toLowerCase();
  const countyName = extractCountyFromQuery(q);

  if (!countyName) {
    return {
      text: 'Which Maryland county are you hunting in? I can give you specific rules and recommendations.',
      citations: ['MD DNR'],
    };
  }

  const county = MD_COUNTIES.find(
    (c) => c.name.toLowerCase() === countyName.toLowerCase()
  );

  if (!county) {
    return {
      text: `I'm not finding county data for "${countyName}". Make sure you've spelled it correctly and it's a Maryland county.`,
    };
  }

  const wmAs = getWMAsByCounty(countyName);

  return {
    text:
      `**Hunting in ${county.name} County, Maryland**\n\n` +
      `**Deer Region:** ${county.deerManagementRegion}\n` +
      `**Sunday Hunting:** ${county.sundayHuntingAllowed ? 'Designated Sundays only — see DNR Sunday Deer Hunting Calendar' : 'None offered'}\n` +
      `**Antler Restriction:** ${county.antlerRestrictions}\n\n` +
      (wmAs.length > 0
        ? `**Public Hunting Areas:**\n${wmAs.map((w) => `• ${w.name}`).join('\n')}\n\n`
        : 'No major WMAs found in this county. Check private land access.\n\n') +
      `${county.notes}`,
    citations: ['MD DNR County Hunting Data'],
    followUpSuggestions: [
      `Seasons in ${countyName}?`,
      'WMAs and public land?',
      'Bag limits here?',
    ],
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// HUNT PLANNING HANDLER
// ─────────────────────────────────────────────────────────────────────────────

function handlePlanningQuery(userQuery: string): ChatResponse {
  return {
    text:
      '**Let\'s Plan Your Hunt!**\n\n' +
      'To give you the best recommendation, I\'ll need:\n\n' +
      '1. **What species?** (Deer, turkey, waterfowl, small game, etc.)\n' +
      '2. **What weapon?** (Bow, rifle, shotgun, muzzleloader)\n' +
      '3. **Which county/area?** (Your home county, travel destination, etc.)\n' +
      '4. **What dates?** (This weekend, next month, etc.)\n\n' +
      'Once I know these details, I can suggest:\n' +
      '• Season dates and bag limits\n' +
      '• Specific WMAs or public lands\n' +
      '• Best hunting conditions\n' +
      '• License/permit requirements\n\n' +
      'You can also use the **Plan** tab to create and save hunt plans in the app.',
    citations: ['MDHuntFishOutdoors Planning Guide'],
    followUpSuggestions: [
      'I want to hunt deer with a bow in Garrett County next month',
      'Best turkey hunting locations',
      'Waterfowl hunting plan for Cecil County',
    ],
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// RUT QUERY HANDLER
// ─────────────────────────────────────────────────────────────────────────────

function handleRutQuery(userQuery: string): ChatResponse {
  const q = userQuery.toLowerCase();
  const today = new Date();
  const currentPhase = getCurrentRutPhase(today);

  // Build rut calendar information
  let text = '**Maryland Whitetail Rut Calendar**\n\n';

  if (currentPhase) {
    text +=
      `🦌 **Current Rut Phase: ${currentPhase.phase}**\n\n` +
      `${currentPhase.description}\n\n` +
      `**Hunting Tips:** ${currentPhase.huntingTips}\n\n`;
  } else {
    text += 'Currently outside the primary rut season. Rut typically runs October-December.\n\n';
  }

  text += '**Full Rut Timeline:**\n\n';

  for (const phase of MD_RUT_CALENDAR) {
    const startDate = formatDateShort(phase.startMonth, phase.startDay);
    const endDate = formatDateShort(phase.endMonth, phase.endDay);
    text +=
      `**${phase.phase}** (${startDate} – ${endDate})\n` +
      `${phase.description}\n` +
      `*Tips: ${phase.huntingTips}*\n\n`;
  }

  text +=
    '**Key Rut Hunting Strategies:**\n' +
    '• **Pre-Rut:** Focus on rub lines, scrapes, and doe bedding areas\n' +
    '• **Seeking/Peak:** All-day sits pay off. Use doe estrus scent, rattling, and grunting\n' +
    '• **Post-Rut:** Shift focus to food sources; hunt edges of fields and acorn concentrations\n' +
    '• **Second Rut:** Unbred does trigger late-season activity – another great hunting window\n\n' +
    'The rut is the most predictable time for deer movement. Use it to your advantage!';

  return {
    text,
    citations: ['MD DNR Hunter\'s Guide', 'White-tailed Deer Behavior Studies'],
    followUpSuggestions: [
      'Best rut hunting strategies',
      'Peak rut dates in November',
      'How to use doe estrus scent',
    ],
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// CWD (CHRONIC WASTING DISEASE) HANDLER
// ─────────────────────────────────────────────────────────────────────────────

function handleCWDQuery(userQuery: string): ChatResponse {
  return {
    text:
      '**Chronic Wasting Disease (CWD) in Maryland**\n\n' +
      '**Affected Counties (CWDMA):**\n' +
      '• Allegany\n' +
      '• Baltimore\n' +
      '• Carroll\n' +
      '• Frederick\n' +
      '• Howard (added 2025)\n' +
      '• Montgomery\n' +
      '• Washington\n\n' +
      '**Carcass Transport Rules in CWDMA:**\n' +
      '✓ **Allowed:** Deboned meat only\n' +
      '✗ **NOT Allowed:** Spine, backbone, skull, head, or bone-in pieces\n' +
      '✗ **NOT Allowed:** Transport of whole carcasses out of CWDMA\n\n' +
      '**Cumulative cases:** 354 deer confirmed CWD-positive since first detection (Allegany County, Nov 2010). The 2024 annual surveillance survey detected 62 positives — up from 52 in 2023 and 38 in 2022. Allegany + Washington remain the hotspots.\n\n' +
      '**Sika & CWD:** Sika deer have NOT tested positive in MD to date. Susceptibility in cervid relatives is not fully established; DNR continues surveillance through hunter-submitted heads (free testing).\n\n' +
      '**Testing & Surveillance:**\n' +
      'MD DNR maintains 95% surveillance confidence through voluntary testing and targeted sampling. All harvested deer in CWDMA should be tested (free).\n\n' +
      '**Questions?** Contact MD DNR: **301-334-4255**\n\n' +
      'Always verify current CWD regulations with MD DNR before transporting deer.',
    citations: [
      'https://dnr.maryland.gov/wildlife/Pages/hunt_trap/CWD.aspx',
      'https://news.maryland.gov/dnr/2025/06/24/maryland-department-of-natural-resources-annual-survey-detects-62-deer-with-chronic-wasting-disease-in-2024/',
    ],
    followUpSuggestions: [
      'How do I test my deer?',
      'Can I bring a whole carcass across county lines?',
      'Is my county in a CWDMA?',
      'Are sika deer susceptible to CWD?',
    ],
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// HARVEST DATA & STATISTICS HANDLER
// ─────────────────────────────────────────────────────────────────────────────

function handleHarvestDataQuery(userQuery: string): ChatResponse {
  return {
    text:
      '**Maryland Deer Harvest Statistics (2024-2025)**\n\n' +
      '**Total Harvest:** 84,201 deer\n\n' +
      '**By Sex:**\n' +
      '• Antlered: 32,148\n' +
      '• Antlerless: 47,271\n\n' +
      '**By Method:**\n' +
      '• Archery: 28,775 (61% using crossbow)\n' +
      '• Firearms & Muzzleloader: Remaining\n\n' +
      '**Junior Hunters:** 2,493 harvested (+12% increase from previous year)\n\n' +
      '**Special Seasons:**\n' +
      '• Sunday Hunting: 9,459 deer harvested across 7 authorized counties\n' +
      '• Sika Deer: Harvested at Taylor\'s Island WMA and Fishing Bay WMA\n\n' +
      'These statistics show Maryland\'s thriving deer population and strong hunting heritage!',
    citations: ['https://dnr.maryland.gov/wildlife/Pages/hunt_trap/deerharvest.aspx'],
    followUpSuggestions: [
      'Which county had the most deer harvested?',
      'What are the season dates?',
      'How do junior hunter licenses work?',
    ],
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// LICENSE FEES HANDLER
// ─────────────────────────────────────────────────────────────────────────────

function handleLicenseFeeQuery(userQuery: string): ChatResponse {
  return {
    text:
      '**Maryland Hunting License Fees (2025-2026)**\n\n' +
      '**Base License:**\n' +
      '• Resident: $35/year\n' +
      '• Senior (65+): $5/year\n' +
      '• Junior (under 16): $15/year (free one-time after Hunter Education, with archery & muzzleloader stamps)\n' +
      '• Disabled Veteran: FREE lifetime license\n' +
      '• Nonresident: $160/year (Junior $80, Senior $65)\n\n' +
      '**Required Stamps & Permits:**\n' +
      '• Archery Stamp: $6 resident / $25 nonresident\n' +
      '• Muzzleloader Stamp: $6 resident / $25 nonresident\n' +
      '• Sika Deer Stamp: $10 resident / $200 nonresident\n' +
      '• Bonus Antlered Deer Stamp: $10 resident / $25 nonresident\n' +
      '• HIP registration: FREE (required for all migratory bird hunting)\n' +
      '• Maryland Migratory Game Bird Stamp: $15\n' +
      '• Federal Duck Stamp: $29 (via Maryland)\n\n' +
      '**Purchase:** compass.dnr.maryland.gov or authorized vendors\n\n' +
      'Many stamps are included in combo licenses — check the COMPASS website for best pricing.',
    citations: ['https://dnr.maryland.gov/wildlife/Pages/hunt_trap/huntinglicenses.aspx'],
    followUpSuggestions: [
      'Do I need all these stamps?',
      'Are there combo deals?',
      'How do I register for HIP?',
    ],
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// BEAR HUNTING HANDLER
// ─────────────────────────────────────────────────────────────────────────────

function handleBearHuntingQuery(userQuery: string): ChatResponse {
  return {
    text:
      '**Black Bear Hunting in Maryland**\n\n' +
      '**Special Permit Required:**\n' +
      'Black bear hunting is by lottery permit only. Application fee: **$15**\n\n' +
      '**Eligible Zones:**\n' +
      '• **Zone 1:** Allegany, Frederick, Garrett, Washington counties\n' +
      '• **Zone 2:** Frederick, Washington counties\n\n' +
      '**Bag Limit:** 1 bear per permit holder per season\n\n' +
      '**Allowed Methods:**\n' +
      '• Firearms\n' +
      '• Archery\n\n' +
      '**Lottery Period:** July 12 – August 31 (annual application deadline)\n\n' +
      '**Apply:** compass.dnr.maryland.gov\n\n' +
      'Black bear hunting is a special privilege with limited permits. Start planning in summer to apply for the next season!',
    citations: ['https://dnr.maryland.gov/wildlife/Pages/hunt_trap/bearhunting.aspx'],
    followUpSuggestions: [
      'How do I apply for a bear permit?',
      'What\'s the success rate?',
      'Can I use a bow?',
    ],
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// TURKEY HUNTING HANDLER
// ─────────────────────────────────────────────────────────────────────────────

function handleTurkeyQuery(userQuery: string): ChatResponse {
  return {
    text:
      '**Wild Turkey Hunting in Maryland**\n\n' +
      '**2025 Spring Harvest:** 4,851 turkeys\n' +
      '• 81% adult gobblers (mature males)\n\n' +
      '**Top Harvest Counties:**\n' +
      '• Garrett: 506\n' +
      '• Charles: 445\n' +
      '• Washington: 406\n' +
      '• Worcester: 400\n' +
      '• Allegany: 314\n\n' +
      '**Population Status:**\n' +
      'Statewide population exceeds 40,000+ birds. Record harvests in recent years in Cecil, St. Mary\'s, Talbot, and Wicomico counties show expanding populations.\n\n' +
      '**Spring & Fall Seasons:**\n' +
      'Ask about specific season dates or use the Regulations tab for exact open dates.\n\n' +
      'Maryland has exceptional turkey hunting with strong populations and prime habitat across the state!',
    citations: ['https://dnr.maryland.gov/wildlife/Pages/hunt_trap/turkeyreport.aspx'],
    followUpSuggestions: [
      'When is spring turkey season?',
      'Best counties for turkey hunting?',
      'What calls work best?',
    ],
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// SPECIAL HUNTS HANDLER
// ─────────────────────────────────────────────────────────────────────────────

function handleSpecialHuntsQuery(userQuery: string): ChatResponse {
  return {
    text:
      '**Special Hunts & Lotteries in Maryland**\n\n' +
      '**Chesapeake Forest Lottery:**\n' +
      'Premier public hunting area with limited permits. Application deadline: August 21 annually.\n\n' +
      '**Mentored Deer Hunts:**\n' +
      'Central Region offers structured hunts for mentoring new hunters and youth programs.\n\n' +
      '**Deal Island WMA Impoundment:**\n' +
      '• Early Season: September 1–15\n' +
      '• Main Season: November 1–February 7\n' +
      'Specialized waterfowl and upland hunting opportunities.\n\n' +
      '**Military Base Hunting (with required credentials):**\n' +
      '• Aberdeen Proving Ground (APG)\n' +
      '• Fort Meade\n' +
      '• Patuxent Naval Air Station (NAS)\n' +
      '• Indian Head Naval Support Facility (NSF)\n\n' +
      '**Eligibility varies by program.** Check DNR website or contact 301-334-4255 for application details.',
    citations: ['https://dnr.maryland.gov/wildlife/Pages/hunt_trap/specialhunts.aspx'],
    followUpSuggestions: [
      'How do I apply for Chesapeake Forest?',
      'What\'s the mentored hunt program?',
      'Do I qualify for military base hunting?',
    ],
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// FEDERAL LANDS HANDLER
// ─────────────────────────────────────────────────────────────────────────────

function handleFederalLandsQuery(userQuery: string): ChatResponse {
  return {
    text:
      '**Federal Refuges & Lands in Maryland**\n\n' +
      '**Blackwater National Wildlife Refuge (NWR)** — Dorchester County\n' +
      '• ~15,000 acres open to deer hunting Sept–Jan\n' +
      '• Species: Sika & white-tailed deer (sika archery is the marquee draw)\n' +
      '• Archery: 12+ weeks (extended opportunity vs. state seasons)\n' +
      '• Permits via Recreation.gov; $6 reservation fee\n' +
      '• Early teal season participates (Sept)\n' +
      '• **NEW Sept 1, 2026:** Non-lead/non-toxic ammunition REQUIRED for all hunting (deer included). Pre-order copper or other non-lead ahead of season.\n' +
      '• Straight-wall cartridges allowed during shotgun seasons\n\n' +
      '**Eastern Neck National Wildlife Refuge** — Kent County\n' +
      '• 2,285 acres on Chesapeake Bay\n' +
      '• Youth mentored spring turkey hunt (ages 12–16) — partnership with NWTF\n' +
      '• Non-lead ammo requirement also applies starting Sept 1, 2026\n' +
      '• Quality hunt — application via Recreation.gov\n\n' +
      '**Patuxent Research Refuge** — Anne Arundel/Prince George\'s Counties\n' +
      '• Limited seasonal deer hunting (lottery-style draws)\n' +
      '• North Tract has public access for hunting Sept–Jan\n' +
      '• Contact refuge directly: 301-497-5500\n\n' +
      '**Chesapeake & Ohio Canal NHP (C&O Canal)**\n' +
      '• 184.5-mile NPS unit from Cumberland to Georgetown\n' +
      '• Fishing: requires MD or DC state fishing license (no separate NPS permit)\n' +
      '• Camping: 6 drive-in campgrounds + 1 group site + 31 hiker/biker sites along the towpath (free, first-come)\n' +
      '• No hunting in the park itself, but adjacent SF/WMA lands open\n\n' +
      '**Assateague Island National Seashore**\n' +
      '• Waterfowl hunting permitted in designated zones with NPS permit + MD license\n' +
      '• Surf fishing year-round (state license required)\n\n' +
      '**Federal lands have their own regs layered on top of MD DNR. Always check the refuge-specific brochure on fws.gov before going.**',
    citations: [
      'https://www.fws.gov/refuge/blackwater',
      'https://www.fws.gov/refuge/eastern-neck',
      'https://www.nps.gov/choh',
    ],
    followUpSuggestions: [
      'How do I make a Blackwater reservation on Recreation.gov?',
      'What non-lead ammo do I need for Sept 2026?',
      'Tell me about Eastern Neck youth turkey hunts',
      'Can I camp along the C&O Canal?',
    ],
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// CONSERVATION ORGS HANDLER
// ─────────────────────────────────────────────────────────────────────────────

function handleConservationOrgsQuery(userQuery: string): ChatResponse {
  return {
    text:
      '**Conservation Orgs Active in Maryland**\n\n' +
      '**Maryland Sportsmen\'s Foundation** — mdsportsmen.org\n' +
      '• Statewide advocacy for hunting, fishing, trapping access\n' +
      '• Tracks legislative threats to public-land hunting + 2A rights\n' +
      '• Sponsors youth hunt and education programs\n\n' +
      '**Trout Unlimited — Maryland Chapter (MDTU)** — Gold-tier chapter\n' +
      '• Cold-water restoration (Jones Falls, Patapsco, Gunpowder)\n' +
      '• Volunteer stream cleanups + monitoring throughout MD\n' +
      '• 6 active MD chapters total — find local via tu.org/chapters\n\n' +
      '**Ducks Unlimited — MD State Council** — ducks.org/maryland\n' +
      '• Wetland conservation across DelMarVa + Eastern Shore\n' +
      '• Multiple banquet fundraisers each year; check ducksunlimited.myeventscenter.com/browseByState/MD\n' +
      '• Partners with DNR on Deal Island and Fishing Bay WMA habitat work\n\n' +
      '**National Wild Turkey Federation (NWTF)** — nwtf.org\n' +
      '• Two MD chapters: Western MD (wmdnwtf.org) and Southern MD\n' +
      '• Partners with Eastern Neck NWR on the youth mentored turkey hunt\n' +
      '• Funds habitat work + Hunting Heritage banquets\n\n' +
      '**Chesapeake Bay Foundation (CBF)** — cbf.org\n' +
      '• Largest Bay-focused org; water quality + oyster + grass restoration\n' +
      '• Member volunteer days; not a hunting/fishing-access org per se but its work directly benefits striped bass, crab, and waterfowl populations\n\n' +
      '**Coastal Conservation Association MD (CCA MD)** — ccamd.org\n' +
      '• Saltwater angler advocacy; striped bass + menhaden focus\n' +
      '• Annual banquets across the Bay region\n\n' +
      '**Backcountry Hunters & Anglers — MD Chapter (BHA)**\n' +
      '• Public-land access advocacy; recent push on Sunday hunting expansion\n' +
      '• Pint Nights monthly in Baltimore/DC region\n\n' +
      '**Izaak Walton League — MD Division**\n' +
      '• Oldest conservation org in MD (founded 1922)\n' +
      '• Local chapters host shooting ranges, fishing access, conservation education\n\n' +
      '**Why join?** Banquets fund habitat work directly tied to hunts you actually do — Deal Island impoundments, sika range, Bay grass beds. The $50 chapter dues moves more conservation dollars than any tax check.',
    citations: [
      'https://mdsportsmen.org/',
      'https://www.tu.org/chapters/mid-atlantic/maryland/',
      'https://www.ducks.org/maryland',
      'https://www.nwtf.org/chapters/western-maryland-chaptermd',
      'https://www.cbf.org/',
    ],
    followUpSuggestions: [
      'When is the next Ducks Unlimited MD banquet?',
      'How do I join Trout Unlimited?',
      'What does CCA MD do for stripers?',
      'Is there a BHA pint night near me?',
    ],
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// WATERFOWL HANDLER
// ─────────────────────────────────────────────────────────────────────────────

function handleWaterfowlQuery(userQuery: string): ChatResponse {
  return {
    text:
      '**Waterfowl Hunting in Maryland**\n\n' +
      '**2026 Midwinter Survey:**\n' +
      '• Total: 926,900 birds (35% above 5-year average)\n' +
      '• Canada Geese: 509,400\n' +
      '• Diving Ducks: 239,100\n\n' +
      '**Strong Population = Excellent Hunting!**\n\n' +
      '**Required Licenses & Stamps:**\n' +
      '• Maryland Duck Stamp: $9\n' +
      '• Federal Duck Stamp: $25\n' +
      '• HIP Registration: FREE (Harvest Information Program)\n\n' +
      '**Blind Reservations:**\n' +
      '• Call up to 4 days prior (max 2 sites per call)\n' +
      '• Limited availability — plan ahead during peak season\n\n' +
      '**Season Dates & Limits:**\n' +
      'Check the Regulations tab for current duck & goose seasons, daily bag limits, and species-specific rules.\n\n' +
      'Maryland\'s Chesapeake Bay region is a world-class waterfowl destination!',
    citations: ['https://dnr.maryland.gov/wildlife/Pages/hunt_trap/waterfowlhunting.aspx'],
    followUpSuggestions: [
      'When is waterfowl season?',
      'How do I reserve a blind?',
      'What\'s the daily bag limit for ducks?',
    ],
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// MANAGED HUNTS & URBAN ARCHERY HANDLER
// ─────────────────────────────────────────────────────────────────────────────

function handleManagedHuntQuery(userQuery: string): ChatResponse {
  return {
    text:
      '**Managed Hunts & Urban Archery in Maryland**\n\n' +
      '**Anne Arundel Managed Hunt**\n' +
      '• Lottery-based: 140 hunters\n' +
      '• Application Deadline: October 17\n' +
      '• Structured deer management program\n\n' +
      '**Seneca Creek State Park Managed Hunt**\n' +
      '• Limited Permits: 30 hunters\n' +
      '• Season Window: September 3 – December 5\n' +
      '• Urban deer management initiative\n\n' +
      '**Wye Island NRMA**\n' +
      '• Multiple Weapon Types: Archery, Firearms, Muzzleloader, Rabbit\n' +
      '• Specialized access program\n\n' +
      '**Urban Archery Programs**\n' +
      'Deer management archery programs available in populated counties for population control in developed areas.\n\n' +
      '**How to Apply:**\n' +
      'Apply via the MD DNR website. Check www.dnr.maryland.gov for current deadlines and application details.',
    citations: ['https://dnr.maryland.gov/wildlife/Pages/hunt_trap/managedhunts.aspx'],
    followUpSuggestions: [
      'When is the Anne Arundel lottery deadline?',
      'How do I apply for Seneca Creek?',
      'What is urban archery in Maryland?',
    ],
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// HARVEST REPORTING HANDLER
// ─────────────────────────────────────────────────────────────────────────────

function handleHarvestReportingQuery(userQuery: string): ChatResponse {
  return {
    text:
      '**Harvest Reporting Requirements (Deer & Turkey)**\n\n' +
      '**At the place of kill, before moving the animal:** complete a field tag in ink and attach it, **or** check the animal in there and get a confirmation number. (See "field tagging" for the details.)\n\n' +
      '**Reporting Timeline:**\n' +
      '• **Register within 24 hours** of recovering the deer or turkey\n\n' +
      '**Reporting Methods:**\n' +
      '• Online: mdoutdoors.maryland.gov (preferred)\n' +
      '• Phone: Big Game Registration line, (888) 800-0121\n' +
      '• Mobile App: Use the MD Outdoors app\n\n' +
      '**Check Stations:**\n' +
      'No physical check stations since 2004 — all reporting is done online or by phone.\n\n' +
      '**Confirmation Number:**\n' +
      '• You will receive a confirmation number when you report\n' +
      '• **Keep this number for documentation and compliance records**\n' +
      '• Required if you are ever checked by a wildlife officer\n\n' +
      '**Why It Matters:**\n' +
      'Harvest reports help MD DNR track populations, set future seasons, and manage wildlife resources statewide.',
    citations: ['https://dnr.maryland.gov/wildlife/Pages/hunt_trap/harvestreport.aspx'],
    followUpSuggestions: [
      'How do I report my harvest online?',
      'What if I forget my confirmation number?',
      'Can I report by phone?',
    ],
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// LEGAL HUNTING HOURS HANDLER
// ─────────────────────────────────────────────────────────────────────────────

function handleShootingHoursQuery(_userQuery: string): ChatResponse {
  return {
    text:
      '**Legal Hunting Hours in Maryland**\n\n' +
      '**Deer, fall turkey, and small game:**\n' +
      '• One half hour before sunrise to one half hour after sunset.\n\n' +
      '**Spring turkey:**\n' +
      '• Early portion: one half hour before sunrise to **noon**.\n' +
      '• Later portion: one half hour before sunrise to **sunset**.\n\n' +
      '**Waterfowl & migratory birds (ducks, geese, coots, snipe, woodcock):**\n' +
      '• One half hour before sunrise to **sunset**.\n\n' +
      '**Doves:**\n' +
      '• Early season: **noon to sunset**; later segments one half hour before sunrise to sunset.\n\n' +
      'Some designated Sundays in some counties carry restricted hours. Always use local sunrise/sunset times for the exact day and place you hunt, and verify with the current DNR guide.',
    citations: ['https://www.eregulations.com/maryland/hunting'],
    followUpSuggestions: [
      'What are the spring turkey hours?',
      'What time can I shoot ducks?',
      'Do I need to wear orange?',
    ],
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// FLUORESCENT ORANGE / PINK HANDLER
// ─────────────────────────────────────────────────────────────────────────────

function handleBlazeOrangeQuery(_userQuery: string): ChatResponse {
  return {
    text:
      '**Fluorescent Orange / Pink Requirement (Maryland)**\n\n' +
      'During firearms and muzzleloader deer seasons you must wear daylight fluorescent **orange or pink** as an outer garment at all times, in one of these forms:\n\n' +
      '• A solid fluorescent orange/pink **cap**; **or**\n' +
      '• A **vest or jacket** with at least **250 square inches** of solid fluorescent orange/pink on the front and back; **or**\n' +
      '• An outer garment of camouflage fluorescent orange/pink worn above the waist that is at least **50%** fluorescent color.\n\n' +
      '**Ground blinds:** display a fluorescent orange/pink cap or a 250-square-inch panel on or within 25 feet of the blind.\n\n' +
      '**Exemptions:** archery-only deer season; falconry; and hunters pursuing waterfowl, dove, crow, furbearers, or turkey. **But** archery hunters afield during an open firearms deer season must still comply.\n\n' +
      'When in doubt, wear it — it is the cheapest insurance in the woods.',
    citations: ['https://www.eregulations.com/maryland/hunting/hunting-regulations'],
    followUpSuggestions: [
      'Do I need orange for archery?',
      'Orange rules for ground blinds?',
      'What are the legal hunting hours?',
    ],
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// FIELD TAGGING HANDLER
// ─────────────────────────────────────────────────────────────────────────────

function handleFieldTaggingQuery(_userQuery: string): ChatResponse {
  return {
    text:
      '**Field Tagging & Game Registration (Deer & Turkey)**\n\n' +
      '**At the place of kill, before you move the animal, do ONE of these:**\n' +
      '1. **Complete a field tag in ink** — harvest date, county of kill, your name, and DNRid number — and attach it to the animal; **or**\n' +
      '2. **Check the animal in** right there and get a **confirmation number** — then you may move it untagged.\n\n' +
      '**Then register the harvest within 24 hours** of recovering the animal:\n' +
      '• Online — **mdoutdoors.maryland.gov** (or the MD Outdoors app)\n' +
      '• Phone — **Big Game Registration line, (888) 800-0121**\n\n' +
      'Keep your confirmation number — you must show it if checked by a wildlife officer. (Black bear has its own mandatory tagging and registration rules under the bear-hunt permit.)',
    citations: [
      'https://www.eregulations.com/maryland/hunting/deer-turkey-tagging-checking',
    ],
    followUpSuggestions: [
      'How do I register my harvest?',
      'What is a DNRid number?',
      'Do I tag a turkey the same way?',
    ],
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// HUNTER EDUCATION HANDLER
// ─────────────────────────────────────────────────────────────────────────────

function handleHunterEducationQuery(userQuery: string): ChatResponse {
  return {
    text:
      '**Hunter Education in Maryland**\n\n' +
      '**Two Certification Paths:**\n\n' +
      '**Option 1: Full In-Person Course**\n' +
      '• Required if you are under 13 years old\n' +
      '• Comprehensive classroom and field instruction\n' +
      '• Live-fire component included\n\n' +
      '**Option 2: Hybrid (Recommended)**\n' +
      '• Online course component (flexible timing)\n' +
      '• Field Day: 4–6 hours with live-fire instruction\n' +
      '• Best option for most adult hunters\n\n' +
      '**Apprentice License Exemption:**\n' +
      '• Short online safety course\n' +
      '• Hunt with mentor supervision\n' +
      '• Full certification required after 2 years\n\n' +
      '**Requirement to Buy License:**\n' +
      'You must complete hunter education BEFORE purchasing a Maryland hunting license.\n\n' +
      '**Learn More:**\n' +
      'Visit learnhunting.org for course schedules and registration.',
    citations: ['https://dnr.maryland.gov/wildlife/Pages/hunt_trap/huntered.aspx'],
    followUpSuggestions: [
      'Can I hunt without hunter education?',
      'What is the apprentice hunter program?',
      'Where can I take the online course?',
    ],
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// DOG TRAINING AREAS HANDLER
// ─────────────────────────────────────────────────────────────────────────────

function handleDogTrainingQuery(userQuery: string): ChatResponse {
  return {
    text:
      '**Dog Training Areas in Maryland**\n\n' +
      '**McKee-Beshers Wildlife Management Area**\n' +
      '• Open: Year-round for dog training\n' +
      '• No reservations required\n' +
      '• Leash Rules: April 15–August 15 (spring/summer)\n' +
      '• Premier retriever and bird dog training location\n\n' +
      '**Indian Springs Wildlife Management Area**\n' +
      '• Location: Washington County\n' +
      '• Size: 6,400 acres\n' +
      '• Year-round access for dog training\n\n' +
      '**Live Bird Training:**\n' +
      '• $5 Annual Retriever Dog Training Permit required if releasing live birds\n' +
      '• Permits available through MD DNR\n\n' +
      '**Best Practices:**\n' +
      '• Call ahead to confirm current access\n' +
      '• Follow all area rules and regulations\n' +
      '• Respect seasonal leash restrictions',
    citations: ['https://dnr.maryland.gov/wildlife/Pages/hunt_trap/dogtraining.aspx'],
    followUpSuggestions: [
      'Do I need a permit to train my dog?',
      'Is McKee-Beshers open year-round?',
      'Can I release live birds for training?',
    ],
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// ACCESSIBLE & DISABLED HUNTING HANDLER
// ─────────────────────────────────────────────────────────────────────────────

function handleAccessibleHuntingQuery(userQuery: string): ChatResponse {
  return {
    text:
      '**Accessible Hunting for Disabled Hunters**\n\n' +
      '**Universal Disability Pass**\n' +
      '• FREE with physician certification\n' +
      '• Grants access to accessible facilities\n' +
      '• Apply through MD DNR\n\n' +
      '**Access Permit**\n' +
      '• FREE and required for participating locations\n' +
      '• Includes ADA accommodations\n\n' +
      '**Accessible Waterfowl Blinds**\n' +
      '• Location: LeCompte Wildlife Management Area\n' +
      '• Schedule: 1 day/week by reservation\n' +
      '• Wheelchair-accessible design\n\n' +
      '**Wheelchair-Accessible Boardwalks & Facilities:**\n' +
      '• Cunningham Swamp\n' +
      '• Mt. Nebo\n' +
      '• Warrior Mountain\n\n' +
      '**How to Get Started:**\n' +
      'Contact MD DNR at 301-334-4255 or visit the website for more information about accommodations and permits.',
    citations: ['https://dnr.maryland.gov/wildlife/Pages/hunt_trap/disabledhunting.aspx'],
    followUpSuggestions: [
      'How do I get a Universal Disability Pass?',
      'Where are accessible waterfowl blinds?',
      'What accessibility features are available?',
    ],
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// PUBLIC HUNTING PERMIT HANDLER
// ─────────────────────────────────────────────────────────────────────────────

function handlePublicPermitQuery(userQuery: string): ChatResponse {
  return {
    text:
      '**Free Public Hunting Permit Requirement**\n\n' +
      '**The Requirement:**\n' +
      '• A FREE permit is REQUIRED to hunt on all Maryland state hunting lands\n' +
      '• This includes WMAs (Wildlife Management Areas) and state forests\n' +
      '• Getting a permit is easy and takes just minutes\n\n' +
      '**How to Get Your Permit:**\n\n' +
      '**Option 1: Online (Fastest)**\n' +
      '• Visit MD Outdoors portal\n' +
      '• Register and print permit immediately\n\n' +
      '**Option 2: In-Person**\n' +
      '• Gwynnbrook Regional Office: 410-356-9272\n' +
      '• Myrtle Grove Regional Office: 301-743-5161\n\n' +
      '**Rules for State Lands:**\n' +
      '• Portable stands ONLY (no permanent structures)\n' +
      '• No baiting allowed\n' +
      '• Display your parking pass at trailhead\n' +
      '• Permit must be obtained BEFORE hunting\n\n' +
      '**Important:**\n' +
      'Always carry your permit with you when hunting on public lands.',
    citations: ['https://dnr.maryland.gov/wildlife/Pages/hunt_trap/publichunt.aspx'],
    followUpSuggestions: [
      'How do I apply for a public hunting permit?',
      'Are permits really free?',
      'What are the rules on state land?',
    ],
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// SMALL GAME & PHEASANT HANDLER
// ─────────────────────────────────────────────────────────────────────────────

function handleSmallGameQuery(userQuery: string): ChatResponse {
  return {
    text:
      '**Small Game & Pheasant Hunting in Maryland**\n\n' +
      '**Rabbits**\n' +
      '• Season: September 1 – February 28\n' +
      '• Year-round opportunity across state\n\n' +
      '**Squirrels**\n' +
      '• Season: September 6 – February 28\n' +
      '• Daily Bag Limit: 6 per day\n' +
      '• ⚠️ Delmarva Fox Squirrel: PROTECTED (not legal to harvest)\n\n' +
      '**Pheasant Stocking (FREE Hunting!)**\n' +
      '• Stocking Dates: November 22–23, 2025\n' +
      '• Locations: 12 WMAs + 2 state forests\n' +
      '• NO stamp required — completely FREE\n' +
      '• Excellent opportunity for pheasant hunting\n\n' +
      '**Dove**\n' +
      '• Season: September 1 – January 31\n' +
      '• Daily Bag Limit: 15 birds per day\n' +
      '• Popular early-season hunting\n\n' +
      '**Quail**\n' +
      '• Season: November – February\n' +
      '• Daily Bag Limit: 4 birds per day\n' +
      '• ⚠️ Note: Declining population statewide\n\n' +
      'Check the Regulations tab for specific county dates and additional small game species.',
    citations: ['https://dnr.maryland.gov/wildlife/Pages/hunt_trap/smallgame.aspx'],
    followUpSuggestions: [
      'When does squirrel season open?',
      'Is pheasant stocking free?',
      'What\'s the dove bag limit?',
    ],
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// SIKA DEER HANDLER
// ─────────────────────────────────────────────────────────────────────────────

function handleSikaDeerQuery(userQuery: string): ChatResponse {
  return {
    text:
      '**Sika Deer Hunting in Maryland**\n\n' +
      '**Unique to Maryland\'s Eastern Shore**\n' +
      '• Only free-ranging sika deer population in the United States\n' +
      '• Distinctive Asian elk relative — bugling calls during rut\n' +
      '• Smaller body size than white-tailed deer\n\n' +
      '**Primary Hunting Locations:**\n\n' +
      '**Fishing Bay Wildlife Management Area**\n' +
      '• Size: 29,000 acres\n' +
      '• Status: Largest WMA in Maryland\n' +
      '• Excellent sika deer population\n\n' +
      '**Taylor\'s Island Wildlife Management Area**\n' +
      '• Size: 1,120 acres\n' +
      '• Eastern Shore prime habitat\n\n' +
      '**Stamp Requirement:**\n' +
      '• $10 Sika Deer Stamp: Required for all sika hunters\n\n' +
      '**Hunting Tips:**\n' +
      '• Best hunted from marshland edges\n' +
      '• Listen for bugling calls during rut (September–October)\n' +
      '• Smaller target than whitetail — careful bullet placement\n' +
      '• Marsh access typically by canoe or foot\n\n' +
      'Sika hunting is a truly unique Maryland hunting experience!',
    citations: ['https://dnr.maryland.gov/wildlife/Pages/hunt_trap/sikadeer.aspx'],
    followUpSuggestions: [
      'Where are sika deer found in Maryland?',
      'Do I need a sika stamp?',
      'When is sika season?',
    ],
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// TRAPPING / FURBEARER QUERY HANDLER
// 2026-05-02 (V2.4 audit, DNR research): added because the entire trapping
// activity was a class-miss in the chat knowledge. Source: MD DNR Hunting
// & Trapping Guide 2025-2026, Sunday Furbearer Hunting regulations.
// ─────────────────────────────────────────────────────────────────────────────

function handleTrappingQuery(_userQuery: string): ChatResponse {
  return {
    text:
      '**Maryland Trapping & Furbearer Hunting**\n\n' +
      'Maryland has 11 furbearer species that may be trapped or hunted. ' +
      'A separate Furtaker license is required for trapping; the General ' +
      'Hunting license alone does not cover trap-set activity.\n\n' +
      '**Furbearer Species:**\n' +
      '• Beaver, Fisher, Fox (red & gray), Muskrat, Mink\n' +
      '• Raccoon, Opossum, Skunk, Coyote, Long-tailed Weasel\n' +
      '• Bobcat is protected — no open season\n\n' +
      '**Licenses & Permits:**\n' +
      '• Resident Furtaker (trapping) license: $30.50\n' +
      '• Nonresident Furtaker license: $250\n' +
      '• Trapper Education course required for first-time license holders\n' +
      '• Trapping on someone else\'s property requires written permission\n\n' +
      '**Season Highlights (2025-2026):**\n' +
      '• Most furbearer trapping seasons run roughly Nov–Feb\n' +
      '• Sunday furbearer HUNTING (not trapping) is allowed in ' +
      'specific WMAs in Allegany, Cecil, Garrett, St. Mary\'s, ' +
      'Washington, Wicomico, and Worcester counties\n' +
      '• Coyote may be hunted year-round, no bag limit\n\n' +
      '**Legal Trap Types:**\n' +
      '• Foothold (offset/padded jaws preferred)\n' +
      '• Conibear/bodygrip (max size restrictions vary by species)\n' +
      '• Cage/box traps for raccoon, opossum, skunk\n' +
      '• Snares are restricted — check current regs\n\n' +
      'Always verify current dates, bag limits, and trap-type rules ' +
      'on the Maryland DNR Hunters Guide before setting a trapline.',
    citations: [
      'https://dnr.maryland.gov/huntersguide/pages/allspecies.aspx',
      'https://dnr.maryland.gov/wildlife/pages/hunt_trap/home.aspx',
    ],
    followUpSuggestions: [
      'Where can I trap on public land?',
      'When is coyote season?',
      'What\'s the muskrat season?',
      'Is Trapper Education the same as Hunter Education?',
    ],
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// BOWFISHING QUERY HANDLER
// 2026-05-02 (V2.4 audit, DNR research): bowfishing for invasive snakehead
// + blue catfish removes ~20% of the snakehead population annually per
// DNR's 2026 study. Bowhunters often add it as a summer extension.
// ─────────────────────────────────────────────────────────────────────────────

function handleBowfishingQuery(_userQuery: string): ChatResponse {
  return {
    text:
      '**Bowfishing in Maryland**\n\n' +
      'A natural summer activity for bowhunters, and one of the most ' +
      'effective tools for invasive-species removal in the Chesapeake.\n\n' +
      '**Legal Targets:**\n' +
      '• Northern Snakehead (Channa) — INVASIVE, no limit\n' +
      '• Blue Catfish — INVASIVE, no limit, top predator on blue crabs/perch\n' +
      '• Common Carp — non-game, no limit\n' +
      '• Longnose & Spotted Gar — open season, check current regs\n' +
      '• Bowfin — non-game\n\n' +
      'Game fish (rockfish, largemouth, smallmouth, panfish, etc.) ' +
      '**may not** be taken with archery tackle.\n\n' +
      '**Why it matters:**\n' +
      '• MD DNR 2026 study: bowfishing harvests ~20% of the upper-bay ' +
      'snakehead population each year\n' +
      '• Bowfishermen take larger, more-fecund females than hook-and-line ' +
      'anglers — disproportionately effective at limiting reproduction\n\n' +
      '**License:**\n' +
      '• A regular Maryland fishing license covers bowfishing\n' +
      '• No archery-specific stamp needed for fish\n' +
      '• Crabbing/oyster license does NOT count\n\n' +
      '**Where to go:**\n' +
      '• Upper Chesapeake Bay tributaries (Susquehanna Flats, Sassafras, ' +
      'Bohemia, Elk rivers)\n' +
      '• Patapsco River system\n' +
      '• Tidal Potomac (Mattawoman, Piscataway)\n\n' +
      'Several charter captains run dedicated bowfishing trips at night ' +
      'with generator-powered lights — check the Local Pros section in ' +
      'the Fish tab for guides.',
    citations: [
      'https://news.maryland.gov/dnr/2026/02/25/dnr-study-bowfishing-contributes-heavily-to-chesapeake-channa-harvest/',
      'https://www.eregulations.com/maryland/fishing/invasive-species',
    ],
    followUpSuggestions: [
      'Where can I bowfish for snakehead?',
      'Do I need a special license to bowfish?',
      'What\'s the snakehead bag limit?',
      'When is bowfishing season?',
    ],
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// HARVEST STATS QUERY HANDLER
// 2026-05-02 (V2.4 audit, DNR research): added so users asking "how many
// deer were taken last year in MD" hit a real handler instead of the
// default fallback. Source: MD DNR Big Game Report 2024-25, Wild Turkey
// Survey 2025.
// ─────────────────────────────────────────────────────────────────────────────

function handleHarvestStatsQuery(_userQuery: string): ChatResponse {
  return {
    text:
      '**Maryland Big Game Harvest Report (2024-2025)**\n\n' +
      'Maryland deer hunters harvested 84,201 deer from Sept. 6, 2024 ' +
      'through Feb. 4, 2025 — a 15.9% increase over 2023-24 and 10.4% ' +
      'above the 5-year average.\n\n' +
      '**Deer breakdown:**\n' +
      '• Antlered white-tailed: 32,148\n' +
      '• Antlerless white-tailed: 47,271\n' +
      '• Antlered sika: 2,143\n' +
      '• Antlerless sika: 2,639\n\n' +
      '**Spring 2025 turkey harvest:** 4,851 birds\n\n' +
      '**Wild Turkey Brood Survey 2025:**\n' +
      '• 2.6 poults/hen — slightly below the 15-year average (2.5)\n' +
      '• 54% of hens observed with young\n' +
      '• Average brood size: 3.7 poults\n' +
      '• Below average productivity but the moderate output of ' +
      '2021-2024 should sustain healthy populations\n\n' +
      '**Where the harvest comes from:**\n' +
      '• Frederick + Carroll lead all-deer harvest\n' +
      '• Garrett dominates bear (lottery counties only)\n' +
      '• Dorchester carries the sika harvest (Eastern Shore marshes)\n\n' +
      'DNR publishes the full Big Game Report each Feb-Mar. Citation ' +
      'in the resource hub.',
    citations: [
      'https://news.maryland.gov/dnr/2025/02/14/maryland-hunters-harvest-84201-deer-for-2024-2025-season/',
      'https://dnr.maryland.gov/wildlife/Documents/maryland-Big-Game-Report_2024-25.pdf',
      'https://dnr.maryland.gov/wildlife/documents/wt_observe_survey.pdf',
    ],
    followUpSuggestions: [
      'Where do most deer get harvested?',
      'How does sika compare to whitetail harvest?',
      'When does turkey nesting succeed in MD?',
    ],
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// DEFAULT RESPONSE
// ─────────────────────────────────────────────────────────────────────────────

function getDefaultResponse(): ChatResponse {
  return {
    text:
      '**Welcome to MDHuntFishOutdoors AI!**\n\n' +
      'I can help you with:\n\n' +
      '• **Season dates** — "When is deer archery season?"\n' +
      '• **Bag limits** — "How many deer can I take?"\n' +
      '• **Public lands** — "Where can I hunt near me?"\n' +
      '• **Weapon rules** — "Can I use a rifle?"\n' +
      '• **County info** — "What\'s the season in Garrett County?"\n' +
      '• **Sunday hunting** — "Can I hunt on Sundays?"\n' +
      '• **Licenses** — "What permits do I need?"\n' +
      '• **Hunt planning** — "Help me plan my next hunt"\n\n' +
      'Try asking any of these questions, or browse the **Regulations** and **Map** tabs for more details.\n\n' +
      '⚠️ Always verify current rules with MD DNR before hunting.',
    citations: ['MD DNR Hunter\'s Guide', 'MDHuntFishOutdoors'],
    followUpSuggestions: [
      'When is deer season?',
      'Where can I hunt?',
      'What licenses do I need?',
    ],
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// EXTRACTION HELPERS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Extract a species name from a user query.
 */
function extractSpeciesFromQuery(q: string): string | null {
  const speciesPatterns: Record<string, string> = {
    'white-tailed deer|whitetail|deer': 'White-tailed Deer',
    'wild turkey|turkey': 'Wild Turkey',
    'waterfowl|duck|ducks|goose|geese|teal|mallard': 'Waterfowl',
    'rabbit|cottontail': 'Eastern Cottontail Rabbit',
    'squirrel|gray squirrel': 'Gray Squirrel',
    'pheasant|ring-necked pheasant': 'Ring-necked Pheasant',
    'grouse|ruffed grouse': 'Ruffed Grouse',
    'bear|black bear': 'Black Bear',
  };

  for (const [pattern, species] of Object.entries(speciesPatterns)) {
    if (new RegExp(pattern).test(q)) {
      return species;
    }
  }

  return null;
}

/**
 * Extract a county name from a user query.
 */
function extractCountyFromQuery(q: string): string | null {
  const counties = [
    'Allegany', 'Anne Arundel', 'Baltimore', 'Baltimore City', 'Calvert',
    'Caroline', 'Carroll', 'Cecil', 'Charles', 'Dorchester', 'Frederick',
    'Garrett', 'Harford', 'Howard', 'Kent', 'Montgomery', "Prince George's",
    'Queen Anne', 'Somerset', "St. Mary's", 'Talbot', 'Washington',
    'Wicomico', 'Worcester',
  ];

  for (const county of counties) {
    if (q.includes(county.toLowerCase())) {
      return county;
    }
  }

  return null;
}

/**
 * Extract a WMA name from a user query.
 */
function extractWMANameFromQuery(q: string): string | null {
  const wmaPatterns = [
    'dan\'?s mountain', 'savage river', 'green ridge', 'pocomoke',
    'leconte', 'idylwild', 'millington', 'stoney creek',
    'back river', 'morgan run', 'little bennett', 'patapsco',
    'elk ridge', 'washington monument', 'soldiers delight', 'cedarville',
  ];

  for (const pattern of wmaPatterns) {
    if (new RegExp(pattern).test(q)) {
      return pattern;
    }
  }

  return null;
}

/**
 * Format a date string (YYYY-MM-DD) to a readable format.
 */
function formatDate(dateStr: string): string {
  try {
    const [year, month, day] = dateStr.split('-').map(Number);
    const date = new Date(year, month - 1, day);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  } catch (error) {
    if (__DEV__) console.error('[ChatKnowledge] Date formatting failed:', error);
    return dateStr;
  }
}

/**
 * Format month and day to a readable format (e.g., "Oct 20").
 */
function formatDateShort(month: number, day: number): string {
  const date = new Date(2025, month - 1, day);
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });
}
