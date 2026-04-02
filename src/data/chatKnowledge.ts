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
 * Main entry point for AI chat queries.
 * Analyzes the user's query and returns a contextual, data-driven response.
 */
export function getSmartResponse(userQuery: string): ChatResponse {
  const q = userQuery.toLowerCase().trim();

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
        '• **Deer**: 2 antlered, 5 antlerless per year\n' +
        '• **Turkey**: 1 in spring, 2 in fall\n' +
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
      '  Resident: $20/year or $8/3-day\n' +
      '  Non-Resident: $120/year or $35/10-day\n\n' +
      '• **Deer Stamp** — Required for deer hunting\n' +
      '  $11.65 (included in combo licenses)\n\n' +
      '• **Migratory Bird Stamp (HIP)** — Required for waterfowl\n' +
      '  Free online registration (compass.dnr.maryland.gov)\n\n' +
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
            ? `✓ **Sunday hunting IS allowed**\n\n` +
              `On private land: Allowed statewide on Sundays\n` +
              `On public land (WMAs): Varies by area — check specific WMA rules`
            : `✗ **Sunday hunting is NOT generally allowed** (with limited exceptions)\n\n` +
              `Check with local WMAs for special weekend hunting opportunities.`) +
          `\n\nAlways verify current rules with MD DNR before your hunt.`,
        citations: ['MD DNR Hunting Regulations'],
        followUpSuggestions: [
          'Other counties?',
          'Private vs public land Sunday rules?',
          'WMA Sunday hunting?',
        ],
      };
    }
  }

  return {
    text:
      '**Sunday Hunting in Maryland**\n\n' +
      '**Private Land:** Sunday hunting is allowed statewide on private land you have permission to hunt.\n\n' +
      '**Public Land (WMAs):** Varies by area. Some WMAs allow Sunday hunting, others do not. Check your specific WMA.\n\n' +
      '**General Rule:** Always verify with MD DNR and your specific hunting area before planning a Sunday hunt.\n\n' +
      'Tip: Tell me your county and I can give you specific rules!',
    citations: ['MD DNR Hunting Regulations'],
    followUpSuggestions: [
      'Which counties allow Sunday hunting?',
      'Can I hunt on Sunday in my WMA?',
      'Rules for Garrett County?',
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
      `**Region:** ${county.deerManagementRegion}\n` +
      `**Sunday Hunting:** ${county.sundayHuntingAllowed ? 'Allowed on private land' : 'Limited'}\n` +
      `**Antler Restrictions:** ${county.notes}\n\n` +
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
