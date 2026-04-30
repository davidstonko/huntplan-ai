/**
 * MDHuntFishOutdoors AI Chat Knowledge Base — Camping Module
 *
 * This module provides intelligent responses to camping queries by searching through
 * Maryland camping data and generating contextual, accurate answers.
 *
 * When integrated with the backend, this will be replaced with RAG queries against
 * the PostgreSQL + pgvector database. For now, it provides smart local responses.
 *
 * Sources:
 * - MD DNR Camping & Cabins: https://dnr.maryland.gov/publiclands/pages/campinginfo.aspx
 * - Park Reservations: https://parkreservations.maryland.gov/
 * - MD DNR Fire Regulations: https://dnr.maryland.gov/forests/pages/fire/firenotes.aspx
 * - Pet Policy: https://dnr.maryland.gov/publiclands/pages/pets.aspx
 */

import {
  servicesForRegion,
  servicesByCategory,
  type LocalService,
} from './marylandLocalServices';
import { CURATED_CAMPING_GEAR } from './curatedCampingGear';

// ─────────────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────────────

export interface ChatResponse {
  text: string;
  citations?: string[];
  followUpSuggestions?: string[];
}

// 2026-04-27: Camp-mode local-pros augmentation. Mirrors the pattern from
// fishing/hunt/hike chat — detects MD region tokens and surfaces gear /
// outfitter / shop services. Camp uses the broadest tokens because most
// outfitter brands cover multiple parks (REI sells both backpacking +
// car-camping; Bass Pro covers everything from tents to ammo).
const CAMP_REGION_TOKENS: ReadonlyArray<readonly [string, string]> = [
  // Park-name → county mapping (parks the app explicitly supports)
  ['assateague', 'Worcester County'],
  ['deep creek', 'Garrett County'],
  ['cunningham falls', 'Frederick County'],
  ['catoctin', 'Frederick County'],
  ['gambrill', 'Frederick County'],
  ['greenbrier', 'Washington County'],
  ['rocky gap', 'Allegany County'],
  ['new germany', 'Garrett County'],
  ['herrington manor', 'Garrett County'],
  ['swallow falls', 'Garrett County'],
  ['gunpowder', 'Baltimore County'],
  ['patapsco', 'Howard County'],
  ['pocomoke', 'Worcester County'],
  ['janes island', 'Somerset County'],
  // County / region tokens
  ['western maryland', 'Western Maryland'],
  ['western md', 'Western Maryland'],
  ['eastern shore', 'Eastern Shore'],
  ['garrett', 'Garrett County'],
  ['frederick', 'Frederick County'],
  ['washington county', 'Washington County'],
  ['allegany', 'Allegany County'],
  ['baltimore county', 'Baltimore County'],
  ['howard county', 'Howard County'],
  ['anne arundel', 'Anne Arundel County'],
];

// Camping cares about a wider category set than hike — backpackers shop
// the same outfitters that car-campers do, plus state parks shoulder
// trail-running gear via shoe stores.
const CAMP_RELEVANT_CATEGORIES = new Set([
  'hiking-shop',
  'bike-shop',
  'shoe-store',
  'hiking-club',
  'big-box',
  'marina-rental', // Deep Creek + Bay-area car campers rent boats
]);

function detectCampRegion(q: string): string | null {
  for (const [token, canonical] of CAMP_REGION_TOKENS) {
    if (q.includes(token)) return canonical;
  }
  return null;
}

function augmentCampWithLocalPros(
  response: ChatResponse,
  userQuery: string,
): ChatResponse {
  const region = detectCampRegion(userQuery.toLowerCase());
  if (!region) return response;
  const collected: LocalService[] = [];
  const seen = new Set<string>();
  for (const s of servicesForRegion(region)) {
    if (CAMP_RELEVANT_CATEGORIES.has(s.category) && !seen.has(s.id)) {
      seen.add(s.id);
      collected.push(s);
      if (collected.length >= 3) break;
    }
  }
  // Fallback: REI big-box + statewide hiking clubs (works everywhere)
  if (collected.length === 0) {
    for (const s of servicesByCategory('hiking-shop')) {
      if (!seen.has(s.id)) {
        seen.add(s.id);
        collected.push(s);
        if (collected.length >= 2) break;
      }
    }
  }
  if (collected.length === 0) return response;
  const footer =
    `\n\n**Local pros for ${region}:**\n` +
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

// ─────────────────────────────────────────────────────────────────────────────
// MAIN QUERY HANDLER
// ─────────────────────────────────────────────────────────────────────────────

/**
 * 2026-04-29: AI gear-suggestion monetization for Camp mode.
 * Mirrors fishing/hunt/hike pattern. Token-match query to a camping
 * gear category, splice "What we use" footer with Amazon affiliate
 * links (mdoutdoors1-20 tag).
 */
const CAMP_GEAR_CATEGORY_TOKENS: ReadonlyArray<readonly [readonly string[], string]> = [
  [['car camp', 'car camping', 'state park', 'drive in', 'drive-in', 'family car', 'tent site'], 'car_camping_essentials'],
  [['backpack', 'thru-hike', 'thru hike', 'AT through', 'ultralight', 'ul gear', 'long trail', 'long-trail'], 'backpacking_ultralight'],
  [['family', 'kids', 'children', 'group camp', 'group site', 'family-friendly'], 'family_camping'],
  [['winter', 'cold', 'snow', 'sub-freezing', 'subfreezing', 'shoulder season'], 'winter_camping'],
];

function detectCampGearCategory(q: string): string | null {
  for (const [tokens, categoryId] of CAMP_GEAR_CATEGORY_TOKENS) {
    if (tokens.some((t) => q.includes(t))) return categoryId;
  }
  return null;
}

function augmentCampWithGearSuggestions(
  response: ChatResponse,
  userQuery: string,
): ChatResponse {
  const categoryId = detectCampGearCategory(userQuery.toLowerCase());
  if (!categoryId) return response;
  const category = CURATED_CAMPING_GEAR.find((c) => c.id === categoryId);
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
      `curatedCampingGear.ts — ${category.title}`,
    ],
  };
}

/**
 * Main entry point for camping AI chat queries.
 * 2026-04-27: wraps the raw responder with local-pros augmentation.
 * 2026-04-29: chained with gear-suggestion monetization (Amazon affiliate).
 */
export function getCampingSmartResponse(userQuery: string): ChatResponse | null {
  const raw = getCampingSmartResponseRaw(userQuery);
  if (!raw) return raw;
  const withPros = augmentCampWithLocalPros(raw, userQuery);
  return augmentCampWithGearSuggestions(withPros, userQuery);
}

function getCampingSmartResponseRaw(userQuery: string): ChatResponse | null {
  const q = userQuery.toLowerCase().trim();

  // Detect intent and route to appropriate handler
  if (isReservationQuery(q)) {
    return handleReservationQuery();
  }

  if (isCampfireQuery(q)) {
    return handleCampfireQuery();
  }

  if (isSeasonQuery(q)) {
    return handleSeasonQuery();
  }

  if (isPetQuery(q)) {
    return handlePetQuery();
  }

  if (isPopularCampsQuery(q)) {
    return handlePopularCampsQuery();
  }

  if (isBackcountryQuery(q)) {
    return handleBackcountryQuery();
  }

  if (isRVQuery(q)) {
    return handleRVQuery();
  }

  if (isCabinQuery(q)) {
    return handleCabinQuery();
  }

  if (isBearSafetyQuery(q)) {
    return handleBearSafetyQuery();
  }

  if (isLNTQuery(q)) {
    return handleLNTQuery();
  }

  if (isGearQuery(q)) {
    return handleGearQuery();
  }

  if (isFeeQuery(q)) {
    return handleFeeQuery();
  }

  if (isKOAQuery(q)) {
    return handleKOAQuery();
  }

  if (isPrivateCampQuery(q)) {
    return handlePrivateCampQuery();
  }

  if (isGlampingQuery(q)) {
    return handleGlampingQuery();
  }

  if (isATCampingQuery(q)) {
    return handleATCampingQuery();
  }

  if (isNearDCQuery(q)) {
    return handleNearDCQuery();
  }

  if (isNearOCQuery(q)) {
    return handleNearOCQuery();
  }

  if (isPrimitiveCampingQuery(q)) {
    return handlePrimitiveCampingQuery();
  }

  if (isJellystoneQuery(q)) {
    return handleJellystoneQuery();
  }

  if (isGlampingExpandedQuery(q)) {
    return handleGlampingExpandedQuery();
  }

  if (isTrailRaceQuery(q)) {
    return handleTrailRaceQuery();
  }

  if (isStateParkCampgroundQuery(q)) {
    return handleStateParkCampgroundQuery();
  }

  if (isCabinRentalQuery(q)) {
    return handleCabinRentalQuery();
  }

  if (isWinterActivitiesQuery(q)) {
    return handleWinterActivitiesQuery();
  }

  // No match found
  return null;
}

// ─────────────────────────────────────────────────────────────────────────────
// INTENT DETECTION
// ─────────────────────────────────────────────────────────────────────────────

function isReservationQuery(q: string): boolean {
  return /reserv|book|when|available|how to|dates|cancel|refund/.test(q);
}

function isCampfireQuery(q: string): boolean {
  return /campfire|fire|burn|burn ban|wood|charcoal/.test(q);
}

function isSeasonQuery(q: string): boolean {
  return /season|open|close|when.*camp|dates|winter|summer|spring|fall/.test(q);
}

function isPetQuery(q: string): boolean {
  return /pet|dog|cat|animal|leash|allowed|can i bring/.test(q);
}

function isPopularCampsQuery(q: string): boolean {
  return /best|popular|recommend|top|where should|top camp|region|western|eastern/.test(q);
}

function isBackcountryQuery(q: string): boolean {
  return /backpack|primitive|backcountry|dispersed|tent|off-grid|green ridge/.test(q);
}

function isRVQuery(q: string): boolean {
  return /rv|motorhome|trailer|hookup|dump station|size limit/.test(q);
}

function isCabinQuery(q: string): boolean {
  return /cabin|yurt|shelter|heated|indoor|rent/.test(q);
}

function isBearSafetyQuery(q: string): boolean {
  return /bear|wildlife|food|storage|container|safe|danger/.test(q);
}

function isLNTQuery(q: string): boolean {
  return /leave no trace|lnt|impact|eco|environmental|responsible/.test(q);
}

function isGearQuery(q: string): boolean {
  return /gear|tent|sleep|what to bring|pack|equipment|checklist/.test(q);
}

function isFeeQuery(q: string): boolean {
  return /fee|cost|price|how much|expense|pay/.test(q);
}

function isKOAQuery(q: string): boolean {
  return /\bkoa\b|kampground/.test(q);
}

function isPrivateCampQuery(q: string): boolean {
  return /\bprivate\b.*\bcamp|resort\b|jellystone|cherry hill|ramblin|frontier town|bar harbor rv|woodlands camp|holiday park camp/.test(q);
}

function isGlampingQuery(q: string): boolean {
  return /\bglamp|luxury camp|safari tent|yurt lodge|savage river lodge|terrapin/.test(q);
}

function isATCampingQuery(q: string): boolean {
  return /\bappalachian|at shelter|\bat\b.*camp|\bat\b.*hike|four state/.test(q);
}

function isNearDCQuery(q: string): boolean {
  return /\bnear dc\b|near washington|close to dc|dc area camp/.test(q);
}

function isNearOCQuery(q: string): boolean {
  return /\bnear ocean city|near oc\b|beach camp|ocean city camp/.test(q);
}

function isPrimitiveCampingQuery(q: string): boolean {
  return /\bprimitive\b|green ridge|dispersed|backcountry/.test(q);
}

function isJellystoneQuery(q: string): boolean {
  return /jellystone|frontier town|private campground|rv resort|williams?port|berlin md/.test(q);
}

function isGlampingExpandedQuery(q: string): boolean {
  return /\bglamp|luxury camp|yurt|savage river|wild yough|little bennett/.test(q);
}

function isTrailRaceQuery(q: string): boolean {
  return /trail race|jfk 50|catoctin 50k|ultramarathon|running/.test(q);
}

function isStateParkCampgroundQuery(q: string): boolean {
  return /deep creek|assateague|elk neck|rocky gap|cunningham falls|janes island|new germany|big run|herrington|state park camp/.test(q);
}

function isCabinRentalQuery(q: string): boolean {
  return /cabin rental|state park cabin|cabin reservation|log cabin|cabin stay/.test(q);
}

function isWinterActivitiesQuery(q: string): boolean {
  return /winter camp|cross country ski|snowshoe|winter hike|snow|cold weather|sledding/.test(q);
}

// ─────────────────────────────────────────────────────────────────────────────
// QUERY HANDLERS
// ─────────────────────────────────────────────────────────────────────────────

function handleReservationQuery(): ChatResponse {
  return {
    text:
      "To reserve a campsite in Maryland State Parks:\n\n" +
      "• **Online**: Visit https://parkreservations.maryland.gov/ for the full reservation portal\n" +
      "• **Phone**: Call 1-888-432-2267 (US) or 301-687-8160 (international)\n" +
      "• **Hours**: New inventory opens at 9 a.m. on call center business days\n\n" +
      "**Minimum Stay Requirements**:\n" +
      "• Off-season (fall/winter): No minimum\n" +
      "• May 30 - Labor Day: 2-night minimum (Thu-Fri, Fri-Sat, or Sat-Sun)\n" +
      "• Holiday weekends: 3-night minimum (must include Fri/Sat/Sun)\n" +
      "• Saturday arrivals/departures not permitted during peak season unless booking 7+ nights\n\n" +
      "**Night Limits**: Max 14 consecutive nights per 21-day period, then must leave for 7+ days before rebooking.\n" +
      "**Cancellation**: Vary by park; check the specific park page for details.",
    citations: [
      'https://parkreservations.maryland.gov/',
      'https://dnr.maryland.gov/publiclands/pages/campinginfo.aspx',
    ],
    followUpSuggestions: [
      'What are the camping fees?',
      'Can I bring my dog?',
      'What campgrounds have cabins?',
    ],
  };
}

function handleCampfireQuery(): ChatResponse {
  return {
    text:
      "**Maryland Campfire Regulations**:\n\n" +
      "**When Burning is Allowed**:\n" +
      "• Small recreational campfires are generally permitted year-round (unless a statewide burn ban is active)\n" +
      "• Burning allowed: 4 p.m. - 12 midnight (any time if ground is snow-covered)\n" +
      "• Campfire rings/designated fire pits only\n\n" +
      "**Statewide Burn Bans**:\n" +
      "• Enacted when dry conditions and wildfire danger warrant\n" +
      "• Prohibits: Campfires, charcoal grilling (propane grills allowed)\n" +
      "• Penalty: $300+ for first violation\n" +
      "• Check current ban status: https://dnr.maryland.gov/forests/pages/fire/firenotes.aspx\n\n" +
      "**Fire Safety**:\n" +
      "• Use existing fire rings only\n" +
      "• Clear 10-foot radius around fire\n" +
      "• Never leave unattended\n" +
      "• Fully extinguish before sleeping or leaving camp",
    citations: [
      'https://dnr.maryland.gov/forests/pages/fire/firenotes.aspx',
      'https://dnr.maryland.gov/publiclands/pages/campinginfo.aspx',
    ],
    followUpSuggestions: [
      'What if there\'s a burn ban?',
      'Where can I camp without a campfire?',
      'What about propane grills?',
    ],
  };
}

function handleSeasonQuery(): ChatResponse {
  return {
    text:
      "**Maryland Camping Seasons**:\n\n" +
      "**Peak Season (May 30 - Labor Day)**:\n" +
      "• All state park campgrounds open\n" +
      "• 2-night minimum stay required (Fri-Sat preferred)\n" +
      "• Highest demand and pricing\n" +
      "• Holiday weekends require 3-night minimum\n\n" +
      "**Spring/Fall (April - May, Labor Day - November)**:\n" +
      "• Most parks open with reduced crowds\n" +
      "• No minimum stay requirement\n" +
      "• Ideal for scouting and primitive camping\n" +
      "• Great weather and fewer insects\n\n" +
      "**Winter (December - March)**:\n" +
      "• Limited park hours (day-use only at some)\n" +
      "• Year-round options: Green Ridge State Forest (100 primitive sites)\n" +
      "• Lower fees and no minimum stay\n" +
      "• Some facilities (showers, water) may have limited service\n\n" +
      "**Hunting Season (Fall/Winter)**:\n" +
      "• Some hunting areas off-limits during season\n" +
      "• Camp as base for scouting trips\n" +
      "• Blaze orange required in hunting areas",
    citations: ['https://parkreservations.maryland.gov/'],
    followUpSuggestions: [
      'Which parks are open in winter?',
      'When is the best time to visit?',
      'Can I camp during hunting season?',
    ],
  };
}

function handlePetQuery(): ChatResponse {
  return {
    text:
      "**Maryland Camping Pet Policy**:\n\n" +
      "**Requirements**:\n" +
      "• All pets must be licensed and vaccinated (rabies required)\n" +
      "• Leash: Max 6 feet, hand-held, at all times (except swimming/hunting with permit)\n" +
      "• Must be well-behaved and under control\n\n" +
      "**Campsite Rules**:\n" +
      "• Cannot be left unattended for more than 30 minutes\n" +
      "• Do not tie to trees, bushes, fences, or natural features\n" +
      "• Owner must clean up all waste\n\n" +
      "**Restrictions**:\n" +
      "• Service animals only in park buildings\n" +
      "• Service animals only in playgrounds\n" +
      "• Pets prohibited in day-use picnic areas (varies by park)\n\n" +
      "**Pet-Friendly Campgrounds**:\n" +
      "• Most state parks allow pets in designated camp loops (e.g., Ash, Birch, Chestnut loops at Big Run)\n" +
      "• Check park-specific pet policy before booking: https://dnr.maryland.gov/publiclands/pages/pets.aspx\n\n" +
      "**Tip**: Bring extra waste bags and water for your pet.",
    citations: [
      'https://dnr.maryland.gov/publiclands/pages/pets.aspx',
      'https://dnr.maryland.gov/publiclands/Documents/Assateague/Assateague-SP-Rules-for-Pet-Camping.pdf',
    ],
    followUpSuggestions: [
      'Which parks are most dog-friendly?',
      'Can my dog swim in the lake?',
      'What about service dogs?',
    ],
  };
}

function handlePopularCampsQuery(): ChatResponse {
  return {
    text:
      "**Popular Maryland Campgrounds by Region**:\n\n" +
      "**Western Maryland (Mountains)**:\n" +
      "• Deep Creek Lake State Park — pristine lake, hiking, 4-season\n" +
      "• Green Ridge State Forest — 100 primitive dispersed sites, secluded\n" +
      "• Swallow Falls State Park — waterfall views, trout streams\n" +
      "• Rocky Gap State Park — mountain lake, Evitts Mountain Trails\n\n" +
      "**Central Maryland (Piedmont)**:\n" +
      "• Patapsco Valley State Park — river access, close to Baltimore\n" +
      "• Savage Mill State Park — historic mill, hiking trails\n\n" +
      "**Eastern Shore (Coastal)**:\n" +
      "• Assateague Island State Park — wild horses, beach camping, bay access\n" +
      "• Elk Neck State Park — Elk Neck Lighthouse, river camping\n" +
      "• Point Lookout State Park — Civil War history, Potomac River views\n\n" +
      "**Southern Maryland (Tidal)**:\n" +
      "• Sotterley Plantation State Historic Site — waterfront, colonial history\n\n" +
      "**Pro Tip**: Use https://parkreservations.maryland.gov/ to view photos and amenities before booking.",
    citations: ['https://dnr.maryland.gov/publiclands/pages/campinginfo.aspx'],
    followUpSuggestions: [
      'Which park has the best hiking?',
      'Where can I fish from camp?',
      'What about primitive camping?',
    ],
  };
}

function handleBackcountryQuery(): ChatResponse {
  return {
    text:
      "**Backcountry & Primitive Camping in Maryland**:\n\n" +
      "**Green Ridge State Forest** (Only Public Dispersed Camping in MD)\n" +
      "• Location: Western Maryland (Allegany/Washington counties), near Little Orleans\n" +
      "• **100 designated primitive campsites** throughout the forest\n" +
      "• Open year-round, first-come/first-served\n" +
      "• **Permit**: $10/night at 24/7 kiosk at Green Ridge Headquarters (no advance reservations)\n" +
      "• Amenities: Picnic table, fire ring only (no water, no facilities)\n" +
      "• 6 group sites available (20+ people) by reservation\n" +
      "• Perfect for backcountry hiking, scouting, minimal impact camping\n\n" +
      "**What You Need**:\n" +
      "• Entirely self-sufficient (water, waste, shelter)\n" +
      "• Leave No Trace essentials\n" +
      "• Camp stove or firewood (check fire ban status)\n\n" +
      "**Getting There**:\n" +
      "• Gate closes at 9 p.m. — plan arrival time\n" +
      "• Pay at headquarters kiosk on-site\n\n" +
      "**Note**: Maryland does not permit dispersed camping on other state lands. All other camping must be at designated campgrounds.",
    citations: [
      'https://dnr.maryland.gov/forests/Pages/publiclands/Greenridge/Recreation-Camping.aspx',
      'https://marylandroadtrips.com/keep-camping-simple-go-primitive-at-green-ridge-state-forest/',
    ],
    followUpSuggestions: [
      'What\'s the best time for Green Ridge?',
      'Can I hike between campsites?',
      'What about bear safety at Green Ridge?',
    ],
  };
}

function handleRVQuery(): ChatResponse {
  return {
    text:
      "**RV Camping in Maryland State Parks**:\n\n" +
      "**Full Hookup Availability**:\n" +
      "• Not all parks offer full hookups (water, electric, sewer)\n" +
      "• Popular RV parks: Deep Creek Lake, Rocky Gap, Swallow Falls (check site-by-site)\n" +
      "• Visit https://parkreservations.maryland.gov/ and filter by 'RV' to see available options\n\n" +
      "**Typical RV Site Amenities**:\n" +
      "• Electric hookup (30/50 amp)\n" +
      "• Water spigot nearby (not always at site)\n" +
      "• Dump station (usually at park entrance or office)\n" +
      "• Paved or gravel pad\n\n" +
      "**Size Limits & Restrictions**:\n" +
      "• Varies by park; check individual site details\n" +
      "• Most parks accommodate up to 40-45 ft RVs\n" +
      "• Width limits may apply in some loops\n\n" +
      "**Booking Tips**:\n" +
      "• Reserve early for peak season (May-August)\n" +
      "• Call 1-888-432-2267 to confirm hookup availability\n" +
      "• Winter (Nov-Mar) offers quieter, cheaper RV camping\n\n" +
      "**Day-Use Fees**: $3 (MD residents) or $5 (out-of-state) per vehicle",
    citations: ['https://parkreservations.maryland.gov/'],
    followUpSuggestions: [
      'Which parks have dump stations?',
      'Can I stay longer than 14 days?',
      'What are the electric hookup costs?',
    ],
  };
}

function handleCabinQuery(): ChatResponse {
  return {
    text:
      "**Cabin & Yurt Rentals in Maryland State Parks**:\n\n" +
      "**Cabin & Yurt Options**:\n" +
      "• Many state parks offer heated cabins (year-round comfort)\n" +
      "• Some parks feature yurts (round tent-like structures, year-round insulated)\n" +
      "• Popular parks: Deep Creek Lake, Rocky Gap, Swallow Falls, Elk Neck\n\n" +
      "**Typical Amenities**:\n" +
      "• Beds (usually 4-8 persons)\n" +
      "• Heat/AC and electricity\n" +
      "• Bathroom with shower (full cabin) or pit toilet (yurt)\n" +
      "• Small kitchen or kitchenette (varies)\n" +
      "• Picnic table and fire ring outside\n\n" +
      "**Booking**:\n" +
      "• Reserve online: https://parkreservations.maryland.gov/\n" +
      "• Phone: 1-888-432-2267\n" +
      "• Pets: Usually allowed in designated cabins (fee may apply)\n" +
      "• Peak season: 2-3 night minimum (same as tent camping)\n\n" +
      "**Pricing**: Typically $60-$150/night depending on size and season\n\n" +
      "**Tip**: Cabins book fast in summer; reserve as early as possible (often opens 12+ months ahead).",
    citations: ['https://parkreservations.maryland.gov/'],
    followUpSuggestions: [
      'Which cabin has the best views?',
      'Can I bring my dog to a cabin?',
      'What utilities are included?',
    ],
  };
}

function handleBearSafetyQuery(): ChatResponse {
  return {
    text:
      "**Bear Safety in Maryland (Western Camping)**:\n\n" +
      "**Where Bears Are Present**:\n" +
      "• Western Maryland: Allegany, Garrett, Washington counties\n" +
      "• Particularly: Green Ridge State Forest, Rocky Gap, Swallow Falls areas\n" +
      "• NOT a concern in Central or Eastern Shore parks\n\n" +
      "**Essential Bear Safety**:\n" +
      "• Store ALL food in bear-proof containers (provided at some parks)\n" +
      "• Hang food 12+ feet high if no container available\n" +
      "• Never cook or eat in your tent\n" +
      "• Pack out all trash (leave nothing)\n" +
      "• Keep a clean camp — bears are attracted to smells\n\n" +
      "**If You Encounter a Bear**:\n" +
      "• Stay calm; bears usually avoid humans\n" +
      "• DO NOT run; back away slowly\n" +
      "• Make yourself appear larger; raise arms\n" +
      "• Speak firmly; do not scream or make sudden movements\n" +
      "• If attacked, use bear spray if available; report to rangers\n\n" +
      "**Pro Tip**: Ask rangers at Green Ridge or Rocky Gap about bear activity when you arrive.\n" +
      "**Bear Spray**: Recommended but not required; available at outdoor retailers.",
    citations: ['https://dnr.maryland.gov/publiclands/pages/campinginfo.aspx'],
    followUpSuggestions: [
      'What food-storage options are available?',
      'Are bears dangerous?',
      'Should I bring bear spray?',
    ],
  };
}

function handleLNTQuery(): ChatResponse {
  return {
    text:
      "**Leave No Trace Camping in Maryland**:\n\n" +
      "**MD DNR Leave No Trace Principles**:\n\n" +
      "1. **Plan & Prepare**\n" +
      "   • Know campfire regulations and burn bans before you go\n" +
      "   • Check weather and park conditions\n" +
      "   • Bring all necessary gear so you don't impact the site\n\n" +
      "2. **Travel on Durable Surfaces**\n" +
      "   • Stick to marked trails and established campsites\n" +
      "   • Avoid cutting across vegetation or widening trails\n" +
      "   • Camp 200+ ft from water sources\n\n" +
      "3. **Dispose of Waste Properly**\n" +
      "   • Pack out ALL trash (leave nothing behind)\n" +
      "   • Use provided waste containers\n" +
      "   • Human waste: Bury 6-8 inches deep, 200 ft from water\n" +
      "   • Strain dishwater; scatter away from camp\n\n" +
      "4. **Leave What You Find**\n" +
      "   • Take only photos; leave plants, rocks, artifacts\n" +
      "   • Don't carve initials in trees or rocks\n" +
      "   • Restore campsites before leaving\n\n" +
      "5. **Minimize Campfire Impact**\n" +
      "   • Use established fire rings only\n" +
      "   • Use dead/fallen wood (never strip bark)\n" +
      "   • Fully extinguish fires; scatter cold ashes\n\n" +
      "6. **Respect Wildlife**\n" +
      "   • Observe from distance; don't feed animals\n" +
      "   • Store food to prevent wildlife dependency\n" +
      "   • Make noise while hiking to avoid surprise encounters\n\n" +
      "7. **Be Considerate of Others**\n" +
      "   • Quiet hours: Usually dusk to dawn\n" +
      "   • Respect other campers' space and solitude\n" +
      "   • Follow park-specific quiet hour times\n\n" +
      "**Maryland Parks Award LNT Campers**: Some parks recognize excellent stewardship.",
    citations: ['https://dnr.maryland.gov/publiclands/pages/campinginfo.aspx'],
    followUpSuggestions: [
      'How do I dispose of human waste?',
      'What if there\'s no fire ring?',
      'Can I collect firewood?',
    ],
  };
}

function handleGearQuery(): ChatResponse {
  return {
    text:
      "**Camping Gear Checklist for Maryland**:\n\n" +
      "**Tent & Sleep System**:\n" +
      "• 3-season tent (4-season if winter camping)\n" +
      "• Sleeping bag rated for season (summer: 40°F, spring/fall: 20°F)\n" +
      "• Sleeping pad (insulation + comfort)\n" +
      "• Camp pillow (optional)\n\n" +
      "**Cooking & Food**:\n" +
      "• Camp stove (fuel canister or liquid)\n" +
      "• Cookware (pot, pan, utensils)\n" +
      "• Cooler or food-storage container (bear-proof if western MD)\n" +
      "• Water bottles (2-3 L capacity)\n" +
      "• Water filter or purification tablets\n\n" +
      "**Clothing** (Layer system):\n" +
      "• Base layers (moisture-wicking, avoid cotton)\n" +
      "• Fleece or insulating layer\n" +
      "• Waterproof jacket & rain pants\n" +
      "• Warm hat & gloves (spring/fall/winter)\n" +
      "• Extra socks\n" +
      "• Blaze orange vest (hunting season)\n\n" +
      "**Safety & Navigation**:\n" +
      "• Headlamp or flashlight (+ extra batteries)\n" +
      "• First-aid kit\n" +
      "• Multi-tool or knife\n" +
      "• Map of park\n" +
      "• Fire starter (matches, lighter, kindling)\n" +
      "• Whistle\n\n" +
      "**Other Essentials**:\n" +
      "• Backpack (45-60L for overnights)\n" +
      "• Portable chair\n" +
      "• Toilet paper & trowel\n" +
      "• Sunscreen & insect repellent\n" +
      "• Biodegradable soap\n" +
      "• Rope (for hanging food if needed)\n\n" +
      "**By Season**:\n" +
      "• **Summer**: Bug net, shade cloth, lighter sleeping bag\n" +
      "• **Fall/Spring**: Extra layers, warmer sleeping bag\n" +
      "• **Winter**: Insulated sleeping pad, winter-rated bag, hand warmers\n\n" +
      "**Pro Tip**: Test all gear at home before your trip!",
    citations: ['https://dnr.maryland.gov/publiclands/pages/campinginfo.aspx'],
    followUpSuggestions: [
      'What sleeping bag rating do I need?',
      'Is a hammock allowed?',
      'Where can I buy/rent gear?',
    ],
  };
}

function handleFeeQuery(): ChatResponse {
  return {
    text:
      "**Maryland Camping Fees (2026)**:\n\n" +
      "**Tent Camping**:\n" +
      "• Standard sites: ~$25-$35/night (peak season higher)\n" +
      "• Premium sites (waterfront): ~$35-$50/night\n" +
      "• Off-season (Nov-Apr): Usually 10-20% cheaper\n\n" +
      "**RV/Full Hookup**:\n" +
      "• Standard RV sites: ~$40-$60/night\n" +
      "• Full hookup: ~$45-$65/night\n" +
      "• Premium RV (waterfront): ~$50-$75/night\n\n" +
      "**Cabins & Yurts**:\n" +
      "• Small cabin (4-person): ~$60-$100/night\n" +
      "• Large cabin (8-person): ~$100-$150/night\n" +
      "• Yurt: ~$50-$90/night\n\n" +
      "**Group Camping**:\n" +
      "• Group sites (25 people): ~$55/night\n" +
      "• Larger groups (50+): Call for pricing\n\n" +
      "**Primitive Camping** (Green Ridge State Forest):\n" +
      "• $10/night per site (no reservation, first-come/first-served)\n" +
      "• Group sites (20+): By reservation\n\n" +
      "**Day-Use Admission**:\n" +
      "• $3 per vehicle (MD residents)\n" +
      "• $5 per vehicle (out-of-state)\n\n" +
      "**Reservations Fee**: No online booking fee (call center may have small fee)\n\n" +
      "**Note**: Exact fees vary by park and season. Check https://parkreservations.maryland.gov/ for current rates.",
    citations: [
      'https://parkreservations.maryland.gov/',
      'https://dnr.maryland.gov/publiclands/pages/campinginfo.aspx',
    ],
    followUpSuggestions: [
      'Are there discounts for seniors or veterans?',
      'Can I get a refund if I cancel?',
      'What is the pet fee?',
    ],
  };
}

function handleKOAQuery(): ChatResponse {
  return {
    text:
      "**KOA Kampgrounds in Maryland**:\n\n" +
      "Maryland has 2 KOA Holiday campgrounds:\n\n" +
      "**Hagerstown/Antietam Battlefield KOA** (Williamsport)\n" +
      "• 150+ sites near Antietam Battlefield National Monument\n" +
      "• Amenities: Creek access, outdoor theater, Conestoga wagons, pool\n" +
      "• Lodging: Tent sites, RV hookups (30/50 amp), cabin rentals\n" +
      "• Year-round operation\n" +
      "• Perfect base for exploring Antietam and Western Maryland\n\n" +
      "**Washington DC/Capitol KOA** (Millersville)\n" +
      "• 200+ sites, 30 min to National Mall\n" +
      "• Amenities: Full hookups, cabin rentals, pool, splash pad\n" +
      "• Year-round operation\n" +
      "• Great for families visiting DC monuments\n\n" +
      "**KOA Amenities**:\n" +
      "• Full RV hookups (water, electric, sewer)\n" +
      "• Pull-through and back-in sites\n" +
      "• Laundry facilities\n" +
      "• Pet-friendly sites (usually $10-15/pet/night)\n" +
      "• Wi-Fi available\n\n" +
      "**Booking**: Visit koa.com or call directly for reservations.",
    citations: [
      'https://koa.com/campgrounds/hagerstown/',
      'https://koa.com/campgrounds/washington-dc/',
    ],
    followUpSuggestions: [
      'What amenities do KOAs have?',
      'Are there RV parks near DC?',
      'Show me campgrounds near Antietam',
    ],
  };
}

function handlePrivateCampQuery(): ChatResponse {
  return {
    text:
      "**Private Campgrounds & RV Resorts in Maryland**:\n\n" +
      "**Premium Resort Parks**:\n\n" +
      "**Jellystone Park** (Williamsport)\n" +
      "• 200+ site family resort with water park\n" +
      "• Amenities: Lazy river, mini golf, laser tag, arcade\n" +
      "• Year-round; highly rated for families\n\n" +
      "**Cherry Hill Park** (College Park)\n" +
      "• 150+ sites near Washington DC (metro accessible)\n" +
      "• Amenities: Pools, splash park, planned activities\n" +
      "• Walking distance to college campus area\n\n" +
      "**Ramblin' Pines** (Woodbine)\n" +
      "• 200 sites between Baltimore and DC\n" +
      "• Gated family resort with activities\n" +
      "• Convenient to both cities\n\n" +
      "**Waterfront Parks**:\n\n" +
      "**Bar Harbor RV Park** (Abingdon)\n" +
      "• 93 waterfront sites on Bush River\n" +
      "• Marina access, boating available\n" +
      "• Near Baltimore\n\n" +
      "**Additional Options**:\n\n" +
      "**Sun Outdoors Frontier Town** (Berlin)\n" +
      "• 400+ sites near Ocean City\n" +
      "• Wild West theme, water park, Go Ape canopy course\n" +
      "• Family-friendly with entertainment\n\n" +
      "**Holiday Park** (Frederick)\n" +
      "• 200+ sites with pool, mini golf, planned activities\n\n" +
      "**Woodlands** (Harford Co.)\n" +
      "• 150 sites near Aberdeen\n\n" +
      "**Common Amenities at Private Parks**:\n" +
      "• Full RV hookups (water, electric, sewer)\n" +
      "• Pools and splash pads\n" +
      "• Playgrounds and recreation\n" +
      "• Laundry and camp store\n" +
      "• Pet-friendly accommodations\n" +
      "• Wi-Fi and sometimes cable TV",
    citations: [
      'https://www.cherryhillpark.com/',
      'https://www.jellystonemaryland.com/',
      'https://www.sunoutdoors.com/maryland/sun-outdoors-frontier-town',
    ],
    followUpSuggestions: [
      'Which private campgrounds are near Ocean City?',
      'Which have water parks?',
      'Are there campgrounds near Baltimore?',
    ],
  };
}

function handleGlampingQuery(): ChatResponse {
  return {
    text:
      "**Glamping (Luxury Camping) in Maryland**:\n\n" +
      "**Savage River Lodge** (Garrett County)\n" +
      "• Location: Savage River State Forest (Western MD mountains)\n" +
      "• Luxury timber cabins with full amenities\n" +
      "• Yurt accommodations with wood-burning stoves\n" +
      "• On-site restaurant\n" +
      "• Year-round operation\n" +
      "• Perfect for romantic getaways or group retreats\n" +
      "• Hiking and nature activities nearby\n\n" +
      "**Terrapin Adventures** (Howard County)\n" +
      "• Safari-style glamping tents near Savage Mill\n" +
      "• Unique tent accommodations\n" +
      "• On-site activities: Zip lines, climbing wall, ropes courses\n" +
      "• May-October season\n" +
      "• Adventure-focused experience\n\n" +
      "**State Park Yurt Camping**:\n" +
      "For a more budget-friendly glamping experience, try yurts at state parks:\n" +
      "• Deep Creek Lake State Park — mountain lake setting\n" +
      "• Rocky Gap State Park — scenic mountain views\n" +
      "• Little Bennett Regional Park — Montgomery County, hiking trails\n" +
      "• All bookable through parkreservations.maryland.gov\n\n" +
      "**What to Expect**:\n" +
      "• Heated accommodations (year-round comfort)\n" +
      "• Beds with linens provided\n" +
      "• Electricity and heating\n" +
      "• Private or shared bathroom facilities\n" +
      "• Fire pit or outdoor cooking area\n\n" +
      "**Glamping Pricing**: $100-250+/night depending on location and season",
    citations: [
      'https://www.savageriverlodge.com/',
      'https://www.terrapinadventures.com/',
      'https://parkreservations.maryland.gov/',
    ],
    followUpSuggestions: [
      'What state parks have yurts?',
      'Where can I camp in Garrett County?',
      'What are the most unique camping spots?',
    ],
  };
}

function handleATCampingQuery(): ChatResponse {
  return {
    text:
      "**Camping on the Appalachian Trail in Maryland**:\n\n" +
      "**Trail Overview**:\n" +
      "• The AT runs 40.9 miles through Maryland along South Mountain\n" +
      "• Straddles the MD-PA border (scenic ridge-top hiking)\n" +
      "• Camping restricted to designated shelters and campsites only\n" +
      "• Max group size: 10 people per shelter/campsite\n\n" +
      "**9 Shelters & Campsites (North to South)**:\n\n" +
      "1. **Ed Garvey Shelter** — capacity 12, reliable spring\n" +
      "2. **Crampton Gap Shelter** — capacity 6\n" +
      "3. **Rocky Run Shelter** — capacity 16, reliable spring\n" +
      "4. **Pine Knob Shelter** — capacity 8\n" +
      "5. **Annapolis Rock Campsite** — capacity 30 (POPULAR! Fills early on weekends)\n" +
      "6. **Pogo Memorial Campsite** — capacity 25, best spring water\n" +
      "7. **Raven Rock Shelter** — capacity 16\n" +
      "8. **Ensign Cowall Shelter** — capacity 10\n" +
      "9. **High Rock Campsite** — capacity 5\n\n" +
      "**Camping Rules**:\n" +
      "• All camping is first-come, first-served (no reservations)\n" +
      "• Camp only at designated shelters/campsites\n" +
      "• No dispersed camping\n" +
      "• Group limit: 10 people\n" +
      "• Annapolis Rock: Plan to arrive early or mid-week\n\n" +
      "**Four States Challenge**:\n" +
      "• Hiking segment combining PA, MD, WV borders\n" +
      "• Scenic ridge hiking with mountain views\n" +
      "• 2-3 day trip typical\n\n" +
      "**Getting There**:\n" +
      "• Parking at Raven Rock (south trailhead)\n" +
      "• Parking at Crampton Gap (central access)\n" +
      "• Parking at MD-PA border (north)\n\n" +
      "**When to Go**:\n" +
      "• Spring (April-May): Wildflowers, reliable water\n" +
      "• Fall (Sept-Oct): Perfect weather, foliage\n" +
      "• Summer: Busy, hot\n" +
      "• Winter: Shelters shelter from snow, water scarce",
    citations: [
      'https://dnr.maryland.gov/publiclands/pages/at.aspx',
      'https://appalachiantrail.org/experience/hike-the-trail/explore-by-state/maryland/',
    ],
    followUpSuggestions: [
      'Tell me about the Four States Challenge',
      'Best AT shelters in Maryland?',
      'Where to park for the AT?',
    ],
  };
}

function handleNearDCQuery(): ChatResponse {
  return {
    text:
      "**Best Campgrounds Near Washington DC**:\n\n" +
      "**Closest Options (15-30 min from DC)**:\n\n" +
      "**Cherry Hill Park** (College Park, MD)\n" +
      "• Distance: 30 min to National Mall\n" +
      "• 150+ sites, pools, splash park\n" +
      "• Metro accessible (walk to college campus area)\n" +
      "• Year-round operation\n\n" +
      "**Capitol KOA** (Millersville, MD)\n" +
      "• Distance: 30 min to DC\n" +
      "• 200+ sites, full service KOA\n" +
      "• Cabins and RV hookups available\n" +
      "• Year-round\n\n" +
      "**Regional Maryland Options (30-60 min)**:\n\n" +
      "**Little Bennett Regional Park** (Clarksburg, MD)\n" +
      "• Distance: 45 min from DC\n" +
      "• Montgomery County, 91 tent sites\n" +
      "• Cabin and yurt rentals\n" +
      "• Hiking trails, creek access\n\n" +
      "**Cosca Regional Park** (Clinton, MD)\n" +
      "• Distance: 45 min from DC\n" +
      "• Prince George's County, 25 sites\n" +
      "• Quieter alternative to bigger parks\n\n" +
      "**Patapsco Valley State Park** (Hollofield/Hilton)\n" +
      "• Distance: 45 min from DC\n" +
      "• Scenic river valley\n" +
      "• Historic sites nearby\n\n" +
      "**Greenbrier State Park**\n" +
      "• Distance: 60 min from DC\n" +
      "• 165 sites with lake access\n" +
      "• Swimming, fishing, nature trails\n\n" +
      "**Pro Tip**: Cherry Hill Park offers the best DC metro access. Book early for peak season.",
    citations: [
      'https://www.cherryhillpark.com/',
      'https://koa.com/campgrounds/washington-dc/',
      'https://montgomeryparks.org/parks-and-trails/little-bennett-regional-park/',
    ],
    followUpSuggestions: [
      'Which have pool access?',
      'Are there cabins near DC?',
      'Show me campgrounds on the map',
    ],
  };
}

function handleNearOCQuery(): ChatResponse {
  return {
    text:
      "**Campgrounds Near Ocean City, Maryland**:\n\n" +
      "**Closest Resort Option**:\n\n" +
      "**Sun Outdoors Frontier Town** (Berlin, MD)\n" +
      "• Distance: 15 min from Ocean City\n" +
      "• 400+ sites, full-service resort\n" +
      "• Amenities: Water park, lazy river, Go Ape zip lines, mini golf\n" +
      "• Marina with boat rentals\n" +
      "• Arcade and entertainment\n" +
      "• Best for family vacation camping\n\n" +
      "**Beach Camping Options**:\n\n" +
      "**Assateague Island State Park** (Ocean City area)\n" +
      "• Distance: 30 min south of OC\n" +
      "• 150 sites, beach camping with wild horses\n" +
      "• Year-round operation\n" +
      "• Unique experience camping on barrier island\n" +
      "• Watch wild ponies roaming the beach\n\n" +
      "**Assateague National Seashore** (Oceanside option)\n" +
      "• Distance: 30 min south of OC\n" +
      "• 350 oceanside sites via Recreation.gov\n" +
      "• More developed facilities than state park\n" +
      "• Popular in summer (book early!)\n\n" +
      "**Other Nearby Options (30-45 min)**:\n\n" +
      "**Pocomoke River State Park — Shad Landing**\n" +
      "• Distance: 30 min from OC\n" +
      "• 175 sites on scenic river\n" +
      "• Canoeing and fishing\n" +
      "• Lower crowds than beachfront\n\n" +
      "**Pocomoke River State Park — Milburn Landing**\n" +
      "• Distance: 30 min from OC\n" +
      "• 32 electric sites\n" +
      "• Quieter river setting\n\n" +
      "**Beach vs. River vs. Resort**:\n" +
      "• **Frontier Town**: Best for families, water activities, entertainment\n" +
      "• **Assateague**: Most unique nature experience, wild horses, quiet\n" +
      "• **Pocomoke River**: Middle ground — nature without crowds\n\n" +
      "**Booking Tips**:\n" +
      "• Book 2-3 months ahead for summer weekends\n" +
      "• Fall (Sept-Oct) offers great weather with smaller crowds\n" +
      "• Spring (May) is ideal for Assateague foal season",
    citations: [
      'https://www.sunoutdoors.com/maryland/sun-outdoors-frontier-town',
      'https://dnr.maryland.gov/publiclands/pages/eastern/assateague.aspx',
      'https://recreation.gov/',
    ],
    followUpSuggestions: [
      'Can I camp on the beach?',
      'Tell me about Assateague wild horses',
      'Which has the best water access?',
    ],
  };
}

function handlePrimitiveCampingQuery(): ChatResponse {
  return {
    text:
      "**Primitive Camping in Maryland — Green Ridge State Forest**:\n\n" +
      "**Overview**:\n" +
      "• Location: Western Maryland, near Flintstone in Allegany/Washington counties\n" +
      "• **49,000 acres** of undeveloped forest\n" +
      "• **100 designated primitive campsites** throughout the forest\n" +
      "• Open year-round, first-come/first-served\n" +
      "• Cost: $10/night at 24/7 check-in kiosk (no advance reservations)\n\n" +
      "**Amenities**:\n" +
      "• Fire pit + picnic table only at each site\n" +
      "• NO water, NO toilets, NO plumbing\n" +
      "• Fully self-sufficient — bring all supplies\n" +
      "• No electric or shower facilities\n\n" +
      "**Group Camping**:\n" +
      "• **Minimum 20 people** required for group sites\n" +
      "• 6 designated group camping areas\n" +
      "• Reservations required (call ahead: 301-334-2038)\n\n" +
      "**Check-In & Hours**:\n" +
      "• 24/7 kiosk payment at park headquarters\n" +
      "• Gates close at 9 p.m. — plan your arrival\n" +
      "• Perfect for backcountry hiking, scouting, or minimal-impact camping\n\n" +
      "**What to Bring**:\n" +
      "• Water (no reliable sources at sites)\n" +
      "• Camp stove or firewood\n" +
      "• Waste containers and Leave No Trace gear\n" +
      "• First-aid, navigation, weather protection\n\n" +
      "**Why Green Ridge?**:\n" +
      "• Only public dispersed camping in Maryland\n" +
      "• Secluded, quiet, excellent for scouting base camps\n" +
      "• Great for fall hunting trips\n" +
      "• Ideal for backcountry experience without resort amenities",
    citations: [
      'https://dnr.maryland.gov/forests/Pages/publiclands/greenridge.aspx',
      'https://dnr.maryland.gov/forests/Pages/publiclands/greenridge/Recreation-Camping.aspx',
    ],
    followUpSuggestions: [
      "What's the best time to visit Green Ridge?",
      'Can I hike between campsites?',
      'What is the weather like there?',
    ],
  };
}

function handleJellystoneQuery(): ChatResponse {
  return {
    text:
      "**Private Campground Resorts in Maryland**:\n\n" +
      "**Jellystone Park — Williamsport, MD**:\n" +
      "• Season: March 27 – November 29\n" +
      "• **9 cabin types** available\n" +
      "• Maximum capacity: 16 people per cabin\n" +
      "• Amenities: Lazy river, mini golf, water park\n" +
      "• Perfect for families and group camping\n" +
      "• Full RV hookups and tent sites\n" +
      "• Website: https://www.campjellystone.com\n\n" +
      "**Frontier Town — Berlin, MD (Sun Outdoors)**:\n" +
      "• Massive private resort complex\n" +
      "• **~700 campsites** across multiple loops\n" +
      "• Location: Sinepuxent Bay waterfront (great for crabbing)\n" +
      "• Wild West theme with Saloon Bar & Grill\n" +
      "• Water park, mini golf, Go Ape zip lines\n" +
      "• Marina with boat rentals\n" +
      "• Arcade and family entertainment\n" +
      "• Full RV hookups available\n" +
      "• Website: https://www.sunoutdoors.com/maryland\n\n" +
      "**KOA Campgrounds Near Washington DC/Baltimore/Annapolis**:\n" +
      "• Multiple locations within 30-90 min of DC metro\n" +
      "• Standard KOA amenities: Full hookups, pool, WiFi\n" +
      "• Good base for urban day trips\n" +
      "• Website: https://koa.com\n\n" +
      "**Why Private Resorts?**:\n" +
      "• Family entertainment beyond camping\n" +
      "• Full services: Showers, laundry, convenience stores\n" +
      "• Less crowded than peak-season state parks\n" +
      "• Variety of accommodation styles (cabins, RVs, tents)",
    citations: [
      'https://www.campjellystone.com',
      'https://www.sunoutdoors.com/maryland',
      'https://koa.com',
    ],
    followUpSuggestions: [
      'What are the cabin prices?',
      'Can I bring my dog to Jellystone?',
      'Tell me more about Frontier Town water activities',
    ],
  };
}

function handleGlampingExpandedQuery(): ChatResponse {
  return {
    text:
      "**Glamping (Luxury Camping) in Maryland**:\n\n" +
      "**Wild Yough — Garrett County**:\n" +
      "• Location: Mountaintop property overlooking Youghiogheny River\n" +
      "• Luxury canvas glamping tents with beds, heating, A/C\n" +
      "• Private decks with river views\n" +
      "• Perfect for couples or small groups\n" +
      "• Nearby hiking and river activities\n\n" +
      "**Savage River Lodge — Garrett County**:\n" +
      "• Location: 700 acres of pristine forest\n" +
      "• **Luxury cabins + yurts** with full amenities\n" +
      "• Marketed as \"Ultimate East Coast Glamping\"\n" +
      "• Private bathrooms, heating, comfort bedding\n" +
      "• Mountain scenery, hiking trails on property\n" +
      "• Premium pricing but exceptional experience\n" +
      "• Perfect for romantic getaways or outdoor enthusiasts seeking comfort\n\n" +
      "**Little Bennett Campground — Clarksburg, MD**:\n" +
      "• Montgomery County regional park\n" +
      "• **Luxury canvas glamping + yurts** available\n" +
      "• Year-round operation (climate-controlled)\n" +
      "• Electricity and heat included\n" +
      "• Close to DC metro (30 min drive)\n" +
      "• Hiking trails, stream access\n" +
      "• Affordable glamping option\n\n" +
      "**What is Glamping?**:\n" +
      "• \"Glamorous camping\" — outdoor experience with comfort\n" +
      "• Canvas tents or yurts with real beds and heating\n" +
      "• Private bathrooms or accessible facilities\n" +
      "• No tent setup required\n" +
      "• Ideal for beginners wanting outdoor experience safely\n\n" +
      "**Booking**:\n" +
      "• Glamping books faster than traditional camping\n" +
      "• Reserve 3-6 months ahead for peak season\n" +
      "• Premium pricing ($120-$300+ per night)",
    citations: [
      'https://www.wildyough.com',
      'https://www.savageriverlodge.com',
      'https://montgomeryparks.org/parks-and-trails/little-bennett-regional-park/',
    ],
    followUpSuggestions: [
      'What is the price range for glamping?',
      'Can I bring my family to glamping?',
      'What activities are near these properties?',
    ],
  };
}

function handleTrailRaceQuery(): ChatResponse {
  return {
    text:
      "**Ultra-Trail Running Races in Maryland Region**:\n\n" +
      "**JFK 50 Mile Run**:\n" +
      "• Historic ultra-marathon (64th edition planned for **November 21, 2026**)\n" +
      "• **Oldest continuous 50-mile race in the United States**\n" +
      "• Location: Western Maryland mountains\n" +
      "• Start time: 6:30 a.m. sharp\n" +
      "• Course: Challenging terrain with significant elevation gain\n" +
      "• Registration opens: March 1 annually\n" +
      "• Registration fills quickly — sign up early\n" +
      "• Attracts 300-500+ runners from around the US\n" +
      "• Substantial crew support allowed\n" +
      "• Website: https://jfk50mile.org\n\n" +
      "**Catoctin 50K**:\n" +
      "• Date: **June 20, 2026**\n" +
      "• Location: Catoctin Mountains, Frederick County\n" +
      "• **\"Half Cat\" option**: 25K alternative for less experienced runners\n" +
      "• Terrain: Rocky, demanding, technical (not beginner-friendly)\n" +
      "• Course style: Out-and-back with full turnaround\n" +
      "• Elevation gain: Significant (2,000+ feet)\n" +
      "• Aid stations at regular intervals\n" +
      "• Website: https://www.catoctin50k.com\n\n" +
      "**Training for Ultra-Trail Races**:\n" +
      "• Start 12-16 weeks before race\n" +
      "• Long runs: Build to 15-20+ miles\n" +
      "• Hill training: Essential for mountain courses\n" +
      "• Speed work: Maintain fitness between long runs\n" +
      "• Nutrition practice: Test fueling strategy on runs\n\n" +
      "**Race Support**:\n" +
      "• Crews allowed at aid stations (check race rules)\n" +
      "• Pacers permitted (check specific race rules)\n" +
      "• Community atmosphere — great for first ultramarathons\n\n" +
      "**Why Run Ultras in MD?**:\n" +
      "• World-class historic courses (JFK legendary status)\n" +
      "• Beautiful Appalachian scenery\n" +
      "• Strong local running community\n" +
      "• Accessible from major East Coast cities",
    citations: [
      'https://jfk50mile.org',
      'https://www.catoctin50k.com',
    ],
    followUpSuggestions: [
      'How do I register for JFK 50?',
      'What is the difficulty level?',
      'Can I volunteer at these races?',
    ],
  };
}

function handleStateParkCampgroundQuery(): ChatResponse {
  return {
    text:
      "**Maryland State Park Campgrounds**:\n\n" +
      "**Deep Creek Lake State Park**:\n" +
      "• **105 campsites** across 4 loops\n" +
      "• Electric hookups, full service sites\n" +
      "• Beautiful mountain lake, fishing, boating\n" +
      "• Most popular park in Western Maryland\n\n" +
      "**Assateague Island State Park**:\n" +
      "• **342 campsites** on barrier island\n" +
      "• Famous for wild horses roaming beach\n" +
      "• Beach camping, bay access\n" +
      "• Ocean City gateway location\n\n" +
      "**Elk Neck State Park**:\n" +
      "• **331 campsites** in scenic northeastern Maryland\n" +
      "• 9 rustic cabins + 7 mini cabins available\n" +
      "• Point of dramatic overlook\n" +
      "• Excellent hiking trails on property\n\n" +
      "**Rocky Gap State Park**:\n" +
      "• **278 campsites** in 10 loops\n" +
      "• Yurts available (unique accommodations)\n" +
      "• Mountain scenery, lake activities\n" +
      "• Western Maryland location\n\n" +
      "**Cunningham Falls State Park**:\n" +
      "• **158 campsites** near historic waterfall\n" +
      "• 78-foot Cunningham Falls nearby\n" +
      "• Popular day hike destination\n" +
      "• Excellent for families\n\n" +
      "**Janes Island State Park**:\n" +
      "• **104 campsites** in 3 loops\n" +
      "• Historic lodge available\n" +
      "• Coastal Eastern Shore location\n" +
      "• Kayaking and water access\n\n" +
      "**New Germany State Park**:\n" +
      "• **49 campsites** with groomed winter trails\n" +
      "• Cross-country skiing in winter\n" +
      "• Quieter alternative to Deep Creek\n\n" +
      "**Big Run State Park**:\n" +
      "• **23 primitive sites** + 6 glamping tents\n" +
      "• Glamping option for comfort camping\n" +
      "• Remote Western Maryland location\n\n" +
      "**Herrington Manor State Park**:\n" +
      "• **20 log cabins** (year-round)\n" +
      "• Winter activities: Cross-country skiing (10 groomed miles)\n" +
      "• Most reliable winter camping option\n" +
      "• Scenic lake setting\n\n" +
      "**Booking Information**:\n" +
      "• Book up to **365 days in advance** online\n" +
      "• Phone: **1-888-432-CAMP (2267)**\n" +
      "• Website: https://parkreservations.maryland.gov/\n" +
      "• Holiday periods book quickly — reserve early\n" +
      "• 2-night minimum (3 nights holidays)",
    citations: [
      'https://dnr.maryland.gov/publiclands/Pages/index.aspx',
      'https://parkreservations.maryland.gov/',
    ],
    followUpSuggestions: [
      'Which park is best for families?',
      'Can I camp in winter?',
      'Do these parks have cabins?',
    ],
  };
}

function handleCabinRentalQuery(): ChatResponse {
  return {
    text:
      "**Cabin Rentals in Maryland State Parks**:\n\n" +
      "**Availability**: Maryland operates **120+ cabins** across state parks, ranging from rustic to full-service.\n\n" +
      "**Booking Details**:\n" +
      "• **Reserve online**: https://parkreservations.maryland.gov/\n" +
      "• **Phone**: 1-888-432-2267 or 301-687-8160\n" +
      "• **Advance booking**: Up to 365 days ahead\n" +
      "• **Minimum stay**: 2 nights (3 nights on holidays)\n" +
      "• **Price range**: $45-90/night (mini cabins) to $86.75/night (full-service)\n\n" +
      "**Popular Cabin Parks**:\n\n" +
      "**Herrington Manor State Park**:\n" +
      "• **20 log cabins** (largest cabin park in MD)\n" +
      "• Year-round operation\n" +
      "• Ideal for winter camping with heating\n" +
      "• Heat and amenities included\n\n" +
      "**Elk Neck State Park**:\n" +
      "• **9 rustic cabins** + **7 mini cabins**\n" +
      "• Scenic overlook location\n" +
      "• Good for families and groups\n\n" +
      "**New Germany State Park**:\n" +
      "• Cabin options available\n" +
      "• Cross-country skiing in winter\n\n" +
      "**Janes Island State Park**:\n" +
      "• Historic lodge cabin accommodations\n" +
      "• Coastal Eastern Shore setting\n\n" +
      "**Cabin Types**:\n" +
      "• **Mini cabins**: Single-room, basic amenities, most affordable\n" +
      "• **Standard cabins**: 1-2 bedrooms, kitchenette, bathroom\n" +
      "• **Full-service cabins**: Complete kitchen, heating, utilities\n" +
      "• **Rustic cabins**: Traditional, authentic park experience\n" +
      "• **Log cabins**: Premium option (Herrington Manor)\n\n" +
      "**Booking Tips**:\n" +
      "• **Peak season** (summer/fall): Book 6+ months ahead\n" +
      "• **Winter**: Herrington Manor has year-round heat\n" +
      "• **Holiday periods**: Fill 12 months in advance\n" +
      "• **Last-minute deals**: Check website for cancellations\n\n" +
      "**What's Included**:\n" +
      "• Sleeping accommodations\n" +
      "• Basic utilities (heating, water, electricity)\n" +
      "• Picnic table and fire ring\n" +
      "• Access to park amenities (trails, beach, water)\n" +
      "• Most provide bedding (verify when booking)",
    citations: [
      'https://dnr.maryland.gov/publiclands/Pages/cabins.aspx',
      'https://parkreservations.maryland.gov/',
    ],
    followUpSuggestions: [
      'Which cabin parks are open in winter?',
      'What amenities are included?',
      'Can I book a cabin for just one night?',
    ],
  };
}

function handleWinterActivitiesQuery(): ChatResponse {
  return {
    text:
      "**Winter Activities & Camping in Maryland**:\n\n" +
      "**Cross-Country Skiing**:\n\n" +
      "**Herrington Manor State Park** (Garrett County)\n" +
      "• **10 groomed miles** of cross-country ski trails\n" +
      "• Equipment rentals: $20-40/day\n" +
      "• Year-round cabin accommodations with heat\n" +
      "• Most reliable winter skiing in MD\n" +
      "• Beautiful winter forest scenery\n\n" +
      "**New Germany State Park** (Garrett County)\n" +
      "• **10 miles** of groomed trails\n" +
      "• Winter camping available\n" +
      "• Quieter alternative to Herrington\n\n" +
      "**Snowshoeing**:\n\n" +
      "**Savage River State Forest** (#1 destination)\n" +
      "• Exceptional snowshoeing terrain\n" +
      "• Scenic river valley trails\n" +
      "• Backcountry camping available\n\n" +
      "**Green Ridge State Forest**:\n" +
      "• Extensive trail network\n" +
      "• Mountain views\n" +
      "• Less crowded than state parks\n\n" +
      "**Rocky Gap State Park**:\n" +
      "• Mountain trail options\n" +
      "• Beautiful winter vistas\n\n" +
      "**Winter Camping Logistics**:\n\n" +
      "**Limitations**:\n" +
      "• Most state park campgrounds **close October/November**\n" +
      "• Few parks operate year-round\n" +
      "• Winter camping is weather-dependent\n" +
      "• Cold nights require 4-season tent + winter sleeping bag\n\n" +
      "**Best Practice for Winter Base Camp**:\n" +
      "• **Herrington Manor log cabins** = warmest winter option\n" +
      "• Heated year-round, full amenities\n" +
      "• Use as base camp for day hikes/skiing\n" +
      "• Book well in advance (fills quickly in winter)\n\n" +
      "**Winter Conditions**:\n" +
      "• Snow typically falls November-March\n" +
      "• Best skiing/snowshoeing: January-February\n" +
      "• Trail conditions vary by elevation (higher = more snow)\n" +
      "• Weather-dependent — call park for conditions\n\n" +
      "**Gear Requirements**:\n" +
      "• Insulated sleeping bag (0°F rated minimum)\n" +
      "• 4-season tent or cabin stay\n" +
      "• Winter boots, layers, hat, gloves\n" +
      "• Hand/foot warmers for extremely cold nights\n" +
      "• Avalanche safety gear (if backcountry)\n\n" +
      "**Contact for Conditions**:\n" +
      "• Call individual parks before winter trips\n" +
      "• Check MD DNR website for trail closures\n" +
      "• Visit https://dnr.maryland.gov/publiclands for updates",
    citations: [
      'https://dnr.maryland.gov/publiclands/Pages/western/herringtonmanor.aspx',
      'https://dnr.maryland.gov/publiclands/Pages/index.aspx',
    ],
    followUpSuggestions: [
      'What winter gear do I need?',
      'Can I tent camp in winter?',
      'Which is easier: skiing or snowshoeing?',
    ],
  };
}
