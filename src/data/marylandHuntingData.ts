/**
 * Maryland Hunting Data — 2025-2026 Season
 *
 * Real, comprehensive data for all Maryland hunting seasons, WMAs, counties, and bag limits.
 * Sources: MD DNR Hunter's Guide, eRegulations.com/maryland, and official season announcements.
 *
 * This file is the single source of truth for the app's regulations engine.
 */

// ─────────────────────────────────────────────────────────────────────────────
// DATA FRESHNESS METADATA
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Hunting-regulation freshness metadata.
 *
 * Everything in MD_SEASONS / MD_BAG_LIMITS describes the regulations that MD
 * DNR published for the 2025-2026 license year. DNR traditionally publishes
 * the next year's Hunter's Guide in mid-to-late summer, so there is a known
 * window between ~July and the archery opener (first Friday of September)
 * when the data in this file is the MOST RECENT PUBLISHED set but no longer
 * describes the upcoming season.
 *
 * The UI surfaces this as a banner on the Regulations screen. The banner
 * becomes more prominent after `nextSeasonExpectedBy` so users are never
 * misled about whether they're reading "current" regulations.
 *
 * When 2026-2027 data is published:
 *   1. Update every MD_SEASONS entry with the new dates
 *   2. Update MD_BAG_LIMITS if any limits changed
 *   3. Bump REGULATIONS_META.seasonLabel, publishedOn, nextSeasonExpectedBy
 */
export interface RegulationsMeta {
  /** Human-readable label of the season this data describes (e.g. "2025-2026"). */
  seasonLabel: string;
  /** ISO date when MD DNR published this season's Hunter's Guide. */
  publishedOn: string;
  /** ISO date after which we expect DNR to have published the NEXT season. */
  nextSeasonExpectedBy: string;
  /** Official DNR source users should check for the current regulations. */
  sourceUrl: string;
}

export const REGULATIONS_META: RegulationsMeta = {
  seasonLabel: '2025-2026',
  publishedOn: '2025-07-15',
  // The 2025-26 license year has closed; DNR publishes the new license-year
  // regulations in early July. Flag the bundled data as stale from 2026-07-01
  // so the in-app banner tells hunters to verify the current 2026-27 dates.
  nextSeasonExpectedBy: '2026-07-01',
  sourceUrl: 'https://dnr.maryland.gov/huntersguide',
};

/**
 * Returns true if today is on or after `nextSeasonExpectedBy` — meaning the
 * data in this file is stale relative to the current license year.
 */
export function isRegulationsStale(now: Date = new Date()): boolean {
  return now >= new Date(REGULATIONS_META.nextSeasonExpectedBy);
}

// ─────────────────────────────────────────────────────────────────────────────
// SEASONS DATA STRUCTURE
// ─────────────────────────────────────────────────────────────────────────────

export interface HuntingSeason {
  id: string;
  species: string;
  seasonType: string; // e.g. 'Archery', 'Firearms', 'Muzzleloader', 'Spring', 'Fall'
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
  weaponType: string; // e.g. 'Bow', 'Rifle', 'Shotgun', 'Muzzleloader'
  bagLimit?: string; // e.g. '2 antlered, 5 antlerless' or '1 bearded'
  notes: string; // County restrictions, antler size, etc.
  countyRestrictions?: string[]; // Counties where this season applies; if empty, statewide
}

export interface WildlifeManagementArea {
  id: string;
  name: string;
  county: string;
  acres: number;
  allowedSpecies: string[]; // e.g. ['Deer', 'Turkey', 'Waterfowl', 'Upland Game']
  allowedWeapons: string[];
  sundayHunting: boolean;
  dnrUrl: string;
  notes: string;
}

export interface MarylandCounty {
  name: string;
  // Maryland uses a TWO-region deer system: 'Region A' (western: Allegany,
  // Garrett, and western Washington) and 'Region B' (the rest of the state).
  // The regions carry very different antlerless bag limits — see MD_BAG_LIMITS.
  deerManagementRegion: string;
  // Sunday deer hunting in MD is allowed only on specific DESIGNATED DATES that
  // vary by county and season (see DNR's Sunday Deer Hunting Calendar). This
  // boolean means "some Sunday deer hunting dates exist in this county"; it does
  // NOT mean every Sunday is open. A few counties allow none.
  sundayHuntingAllowed: boolean;
  // Maryland's statewide antler-point restriction (same in every county).
  antlerRestrictions: string;
  notes: string;
}

export interface BagLimitRule {
  species: string;
  weaponType?: string; // If null, applies to all weapons
  limitType: string; // 'daily', 'season', 'possession'
  quantity: number;
  timePeriod: string; // 'daily', 'season', 'calendar year'
  notes: string;
  countyRestrictions?: string[]; // If empty, statewide
}

// ─────────────────────────────────────────────────────────────────────────────
// MARYLAND HUNTING SEASONS 2025-2026
// ─────────────────────────────────────────────────────────────────────────────

export const MD_SEASONS: HuntingSeason[] = [
  // ───── DEER (White-tailed Deer) ─────
  {
    id: 'deer_archery_2025',
    species: 'White-tailed Deer',
    seasonType: 'Archery',
    startDate: '2025-09-06',
    endDate: '2026-01-31',
    weaponType: 'Bow',
    bagLimit: '2 antlered, 5 antlerless',
    notes:
      'Archery season runs 5 months. Antlerless bag limit varies by county/region. Check your county for antler restrictions.',
    countyRestrictions: [],
  },
  {
    id: 'deer_firearms_2025',
    species: 'White-tailed Deer',
    seasonType: 'Firearms (Regular)',
    startDate: '2025-11-29',
    endDate: '2025-12-13',
    weaponType: 'Rifle or Shotgun',
    bagLimit: '2 antlered, 5 antlerless',
    notes:
      'Regular firearms season begins Saturday after Thanksgiving. All hunting methods except archery. Antlerless limit varies by county.',
    countyRestrictions: [],
  },
  {
    id: 'deer_muzzleloader_fall_2025',
    species: 'White-tailed Deer',
    seasonType: 'Muzzleloader (Fall)',
    startDate: '2025-10-18',
    endDate: '2025-10-25',
    weaponType: 'Muzzleloader',
    bagLimit: '1 antlered per season',
    notes:
      'Muzzleloader only. One antlered deer per season from both fall and winter segments combined. Antlerless also allowed.',
    countyRestrictions: [],
  },
  {
    id: 'deer_muzzleloader_winter_2025',
    species: 'White-tailed Deer',
    seasonType: 'Muzzleloader (Winter)',
    startDate: '2025-12-20',
    endDate: '2026-01-03',
    weaponType: 'Muzzleloader',
    bagLimit: '1 antlered per season',
    notes:
      'Winter muzzleloader season. Combined antlered limit with fall muzzleloader is 1 per season. Antlerless available.',
    countyRestrictions: [],
  },

  // ───── TURKEY ─────
  {
    id: 'turkey_spring_2026',
    species: 'Wild Turkey',
    seasonType: 'Spring',
    startDate: '2026-04-14',
    endDate: '2026-05-23',
    weaponType: 'Shotgun or Bow',
    bagLimit: '1 bearded turkey',
    notes:
      'Bearded turkeys only (males). Spring season is limited to one bird. Check your county for opening dates.',
    countyRestrictions: [],
  },
  {
    id: 'turkey_fall_archery_2025',
    species: 'Wild Turkey',
    seasonType: 'Fall (Archery)',
    startDate: '2025-10-04',
    endDate: '2025-11-01',
    weaponType: 'Bow',
    bagLimit: '2 turkeys',
    notes:
      'Fall archery season allows turkeys of either sex. Maximum 2 per fall/winter combined.',
    countyRestrictions: [],
  },
  {
    id: 'turkey_fall_firearms_2025',
    species: 'Wild Turkey',
    seasonType: 'Fall (Firearms)',
    startDate: '2025-10-18',
    endDate: '2025-10-25',
    weaponType: 'Shotgun',
    bagLimit: '2 turkeys combined fall/winter',
    notes:
      'Fall firearms week (shotgun only). Turkeys of either sex. Counts toward fall/winter combined limit of 2.',
    countyRestrictions: [],
  },

  // ───── WATERFOWL ─────
  {
    id: 'waterfowl_early_teal_2025',
    species: 'Waterfowl (Teal)',
    seasonType: 'Early Teal',
    startDate: '2025-09-01',
    endDate: '2025-09-15',
    weaponType: 'Shotgun',
    bagLimit: '4 per day',
    notes:
      'Blue-winged and green-winged teal only. Requires HIP registration and valid waterfowl stamp.',
    countyRestrictions: [],
  },
  {
    id: 'waterfowl_duck_1_2025',
    species: 'Waterfowl (Ducks)',
    seasonType: 'Regular (Split 1)',
    startDate: '2025-10-25',
    endDate: '2025-11-15',
    weaponType: 'Shotgun',
    bagLimit: '6 per day',
    notes:
      'First split of regular duck season. Includes most species. Federal framework limits apply.',
    countyRestrictions: [],
  },
  {
    id: 'waterfowl_duck_2_2025',
    species: 'Waterfowl (Ducks)',
    seasonType: 'Regular (Split 2)',
    startDate: '2025-11-29',
    endDate: '2025-12-14',
    weaponType: 'Shotgun',
    bagLimit: '6 per day',
    notes:
      'Second split of regular duck season. Continues waterfowl hunting through early winter.',
    countyRestrictions: [],
  },
  {
    id: 'waterfowl_goose_2025',
    species: 'Waterfowl (Geese)',
    seasonType: 'Regular',
    startDate: '2025-10-25',
    endDate: '2025-12-14',
    weaponType: 'Shotgun',
    bagLimit: '5 per day',
    notes:
      'Canada and snow geese. Daily limit 5 geese. Must have valid federal stamp and HIP registration.',
    countyRestrictions: [],
  },

  // ───── SMALL GAME ─────
  {
    id: 'rabbit_season_2025',
    species: 'Rabbit',
    seasonType: 'Regular',
    startDate: '2025-10-01',
    endDate: '2026-02-28',
    weaponType: 'Shotgun or Rifle',
    bagLimit: '4 per day, 8 in possession',
    notes:
      'Eastern cottontail and marsh rabbit. Shotgun or .22 caliber rifle only.',
    countyRestrictions: [],
  },
  {
    id: 'squirrel_season_2025',
    species: 'Squirrel',
    seasonType: 'Regular',
    startDate: '2025-09-06',
    endDate: '2026-02-01',
    weaponType: 'Shotgun or Rifle',
    bagLimit: '6 per day, 12 in possession',
    notes:
      'Gray and fox squirrel. Includes archery season. Shotgun or .22 rifle.',
    countyRestrictions: [],
  },
  {
    id: 'pheasant_season_2025',
    species: 'Pheasant',
    seasonType: 'Regular',
    startDate: '2025-11-01',
    endDate: '2025-12-31',
    weaponType: 'Shotgun',
    bagLimit: '2 per day, 4 in possession',
    notes:
      'Ring-necked pheasant. Limited availability; check for restocking areas. Shotgun only.',
    countyRestrictions: [],
  },
  {
    id: 'grouse_season_2025',
    species: 'Ruffed Grouse',
    seasonType: 'Regular',
    startDate: '2025-10-04',
    endDate: '2025-11-22',
    weaponType: 'Shotgun',
    bagLimit: '3 per day, 6 in possession',
    notes:
      'Ruffed grouse only. Western Maryland forests. Shotgun with #4 shot or smaller.',
    countyRestrictions: ['Garrett', 'Allegany'],
  },

  // ───── BEAR ─────
  {
    id: 'bear_season_2025',
    species: 'Black Bear',
    seasonType: 'Regular',
    startDate: '2025-10-20',
    endDate: '2025-10-25',
    weaponType: 'Rifle',
    bagLimit: '1 per season',
    notes:
      'Lottery-draw permit hunt in Allegany, Frederick, Garrett, and Washington counties. Rifle or shotgun slug. Apply for the bear lottery before the season.',
    countyRestrictions: ['Allegany', 'Frederick', 'Garrett', 'Washington'],
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// MARYLAND WILDLIFE MANAGEMENT AREAS (WMAs)
// ─────────────────────────────────────────────────────────────────────────────

export const MD_WMAS: WildlifeManagementArea[] = [
  {
    id: 'dans_mountain',
    name: 'Dan\'s Mountain WMA',
    county: 'Allegany',
    acres: 10246,
    allowedSpecies: ['Deer', 'Turkey', 'Grouse', 'Squirrel'],
    allowedWeapons: ['Bow', 'Rifle', 'Shotgun', 'Muzzleloader'],
    sundayHunting: true,
    dnrUrl: 'https://dnr.maryland.gov/wildlife/Pages/WMA/DansMountain.aspx',
    notes:
      'Mountainous terrain in western Maryland. Popular for deer archery. Scenic ridges.',
  },
  {
    id: 'savage_river',
    name: 'Savage River WMA',
    county: 'Garrett',
    acres: 6500,
    allowedSpecies: ['Deer', 'Turkey', 'Grouse', 'Squirrel'],
    allowedWeapons: ['Bow', 'Rifle', 'Shotgun', 'Muzzleloader'],
    sundayHunting: false,
    dnrUrl: 'https://dnr.maryland.gov/wildlife/Pages/WMA/SavageRiver.aspx',
    notes:
      'Western Maryland. No Sunday hunting. Pristine hardwood forests. Popular for whitetail.',
  },
  {
    id: 'green_ridge',
    name: 'Green Ridge WMA',
    county: 'Allegany',
    acres: 9475,
    allowedSpecies: ['Deer', 'Turkey', 'Grouse', 'Small Game'],
    allowedWeapons: ['Bow', 'Rifle', 'Shotgun', 'Muzzleloader'],
    sundayHunting: false,
    dnrUrl: 'https://dnr.maryland.gov/wildlife/Pages/WMA/GreenRidge.aspx',
    notes:
      'Ridge habitat in Allegany County. Limited Sunday hunting. Excellent for deer.',
  },
  {
    id: 'pocomoke',
    name: 'Pocomoke WMA',
    county: 'Somerset',
    acres: 9212,
    allowedSpecies: ['Deer', 'Waterfowl', 'Turkey', 'Small Game'],
    allowedWeapons: ['Bow', 'Rifle', 'Shotgun'],
    sundayHunting: true,
    dnrUrl: 'https://dnr.maryland.gov/wildlife/Pages/WMA/Pocomoke.aspx',
    notes:
      'Eastern Shore swamp habitat. Excellent waterfowl hunting. Deer and turkey also present.',
  },
  {
    id: 'leconte',
    name: 'LeCompte WMA',
    county: 'Dorchester',
    acres: 4050,
    allowedSpecies: ['Waterfowl', 'Deer', 'Turkey'],
    allowedWeapons: ['Bow', 'Rifle', 'Shotgun'],
    sundayHunting: true,
    dnrUrl: 'https://dnr.maryland.gov/wildlife/Pages/WMA/LeCompte.aspx',
    notes:
      'Eastern Shore marsh and upland. Great waterfowl and deer habitat. Limited acreage.',
  },
  {
    id: 'idylwild',
    name: 'Idylwild WMA',
    county: 'Talbot',
    acres: 1627,
    allowedSpecies: ['Waterfowl', 'Upland Game'],
    allowedWeapons: ['Shotgun'],
    sundayHunting: false,
    dnrUrl: 'https://dnr.maryland.gov/wildlife/Pages/WMA/Idylwild.aspx',
    notes:
      'Eastern Shore. Waterfowl and small game. Shotgun only; no rifles.',
  },
  {
    id: 'millington',
    name: 'Millington WMA',
    county: 'Kent',
    acres: 6447,
    allowedSpecies: ['Waterfowl', 'Turkey', 'Upland Game', 'Deer'],
    allowedWeapons: ['Bow', 'Rifle', 'Shotgun'],
    sundayHunting: true,
    dnrUrl: 'https://dnr.maryland.gov/wildlife/Pages/WMA/Millington.aspx',
    notes:
      'Upper Eastern Shore. Mixed habitat with marshes and uplands. Good deer and waterfowl.',
  },
  {
    id: 'stoney_creek',
    name: 'Stoney Creek WMA',
    county: 'Cecil',
    acres: 5618,
    allowedSpecies: ['Deer', 'Turkey', 'Waterfowl', 'Upland Game'],
    allowedWeapons: ['Bow', 'Rifle', 'Shotgun'],
    sundayHunting: true,
    dnrUrl: 'https://dnr.maryland.gov/wildlife/Pages/WMA/StoneyCreek.aspx',
    notes:
      'Upper Eastern Shore. Mixed hardwood and agricultural land. Excellent deer hunting.',
  },
  {
    id: 'back_river',
    name: 'Back River Neck WMA',
    county: 'Anne Arundel',
    acres: 3800,
    allowedSpecies: ['Waterfowl', 'Deer'],
    allowedWeapons: ['Bow', 'Shotgun'],
    sundayHunting: true,
    dnrUrl: 'https://dnr.maryland.gov/wildlife/Pages/WMA/BackRiverNeck.aspx',
    notes:
      'Central Maryland. Tidal marsh and upland. Waterfowl primary; deer secondary.',
  },
  {
    id: 'morgan_run',
    name: 'Morgan Run WMA',
    county: 'Baltimore',
    acres: 2700,
    allowedSpecies: ['Deer', 'Turkey', 'Upland Game'],
    allowedWeapons: ['Bow', 'Rifle', 'Shotgun'],
    sundayHunting: false,
    dnrUrl: 'https://dnr.maryland.gov/wildlife/Pages/WMA/MorganRun.aspx',
    notes:
      'Central Maryland. No Sunday hunting. Hardwood forest and streams. Good deer.',
  },
  {
    id: 'little_bennett',
    name: 'Little Bennett Regional Park (Hunting)',
    county: 'Montgomery',
    acres: 3700,
    allowedSpecies: ['Deer', 'Turkey', 'Upland Game'],
    allowedWeapons: ['Bow', 'Shotgun'],
    sundayHunting: false,
    dnrUrl: 'https://dnr.maryland.gov/wildlife/Pages/WMA/LittleBennett.aspx',
    notes:
      'Northern Maryland. No centerfire rifles. Excellent deer bowhunting.',
  },
  {
    id: 'patapsco',
    name: 'Patapsco Valley State Park (Hunting)',
    county: 'Baltimore',
    acres: 14000,
    allowedSpecies: ['Deer', 'Turkey', 'Upland Game'],
    allowedWeapons: ['Bow', 'Shotgun'],
    sundayHunting: false,
    dnrUrl: 'https://dnr.maryland.gov/wildlife/Pages/WMA/PatapscoValley.aspx',
    notes:
      'Large park with hunting sections. Bow and shotgun only. Excellent urban deer hunting.',
  },
  {
    id: 'elkridge',
    name: 'Elk Ridge WMA',
    county: 'Howard',
    acres: 2800,
    allowedSpecies: ['Deer', 'Upland Game'],
    allowedWeapons: ['Bow', 'Shotgun'],
    sundayHunting: false,
    dnrUrl: 'https://dnr.maryland.gov/wildlife/Pages/WMA/ElkRidge.aspx',
    notes:
      'Central Maryland. Shotgun and bow only. Small but productive for deer.',
  },
  {
    id: 'washington_monument',
    name: 'Washington Monument State Park (Hunting)',
    county: 'Washington',
    acres: 2289,
    allowedSpecies: ['Deer', 'Turkey'],
    allowedWeapons: ['Bow'],
    sundayHunting: true,
    dnrUrl: 'https://dnr.maryland.gov/wildlife/Pages/WMA/WashingtonMonument.aspx',
    notes:
      'Western Maryland. Bow only. Scenic ridgeline. Limited acreage but productive.',
  },
  {
    id: 'soldiers_delight',
    name: 'Soldiers Delight Natural Environment Area',
    county: 'Baltimore',
    acres: 1860,
    allowedSpecies: ['Deer', 'Turkey'],
    allowedWeapons: ['Bow', 'Shotgun'],
    sundayHunting: false,
    dnrUrl: 'https://dnr.maryland.gov/wildlife/Pages/WMA/SoldiersDelight.aspx',
    notes:
      'Urban reserve. Shotgun and bow only. Important for urban deer management.',
  },
  {
    id: 'cedarville',
    name: 'Cedarville State Forest',
    county: 'Charles',
    acres: 3700,
    allowedSpecies: ['Deer', 'Turkey', 'Upland Game'],
    allowedWeapons: ['Bow', 'Rifle', 'Shotgun'],
    sundayHunting: true,
    dnrUrl: 'https://dnr.maryland.gov/wildlife/Pages/WMA/Cedarville.aspx',
    notes:
      'Southern Maryland. Mixed forest and fields. Good all-around hunting.',
  },
  {
    id: 'newman_wma',
    name: 'Newman WMA',
    county: 'Montgomery',
    acres: 5200,
    allowedSpecies: ['Deer', 'Turkey', 'Upland Game'],
    allowedWeapons: ['Bow', 'Shotgun'],
    sundayHunting: true,
    dnrUrl: 'https://dnr.maryland.gov/wildlife/Pages/WMA/Newman.aspx',
    notes:
      'Northwestern Maryland. No centerfire rifles. Agricultural land with deer.',
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// MARYLAND COUNTIES (23 counties + Baltimore City)
// ─────────────────────────────────────────────────────────────────────────────

// Maryland's antler-point restriction is STATEWIDE and identical in every
// county. Source: eRegulations MD Deer Seasons & Bag Limits.
const STATEWIDE_APR =
  'Statewide: your first antlered deer may be any buck; each additional ' +
  'antlered deer must have at least 3 points on one antler.';

// Counties that allow NO Sunday deer hunting (per DNR Sunday Deer Hunting
// Calendar). Everywhere else, Sunday hunting is open only on designated dates.
// Source: https://dnr.maryland.gov/huntersguide/documents/sundaydeerhuntingcalendar.pdf
export const MD_COUNTIES: MarylandCounty[] = [
  {
    name: 'Allegany',
    deerManagementRegion: 'Region A',
    sundayHuntingAllowed: true,
    antlerRestrictions: STATEWIDE_APR,
    notes:
      'Region A (western). Restrictive antlerless limits — see bag limits. Mountain region. Grouse and bear hunting available.',
  },
  {
    name: 'Anne Arundel',
    deerManagementRegion: 'Region B',
    sundayHuntingAllowed: true,
    antlerRestrictions: STATEWIDE_APR,
    notes:
      'Region B. Part of the Urban/Suburban Deer Management Zone (unlimited antlerless archery). Around Annapolis. Waterfowl in tidewater.',
  },
  {
    name: 'Baltimore',
    deerManagementRegion: 'Region B',
    sundayHuntingAllowed: false,
    antlerRestrictions: STATEWIDE_APR,
    notes:
      'Region B. No Sunday deer hunting. Urban/Suburban Deer Management Zone (unlimited antlerless archery). Bow and shotgun emphasis.',
  },
  {
    name: 'Baltimore City',
    deerManagementRegion: 'Region B',
    sundayHuntingAllowed: false,
    antlerRestrictions: 'No general hunting except dedicated programs/WMAs.',
    notes: 'Urban area. Limited hunting except dedicated wildlife management programs.',
  },
  {
    name: 'Calvert',
    deerManagementRegion: 'Region B',
    sundayHuntingAllowed: true,
    antlerRestrictions: STATEWIDE_APR,
    notes: 'Region B. Southern Maryland. Tidewater. Waterfowl and deer habitat.',
  },
  {
    name: 'Caroline',
    deerManagementRegion: 'Region B',
    sundayHuntingAllowed: true,
    antlerRestrictions: STATEWIDE_APR,
    notes: 'Region B. Eastern Shore. Agricultural land. Good deer and upland game.',
  },
  {
    name: 'Carroll',
    deerManagementRegion: 'Region B',
    sundayHuntingAllowed: true,
    antlerRestrictions: STATEWIDE_APR,
    notes: 'Region B. Northwestern Maryland. Rolling hills. Good deer hunting.',
  },
  {
    name: 'Cecil',
    deerManagementRegion: 'Region B',
    sundayHuntingAllowed: true,
    antlerRestrictions: STATEWIDE_APR,
    notes: 'Region B. Upper Eastern Shore. Mixed habitat. Good all-around hunting.',
  },
  {
    name: 'Charles',
    deerManagementRegion: 'Region B',
    sundayHuntingAllowed: true,
    antlerRestrictions: STATEWIDE_APR,
    notes: 'Region B. Southern Maryland. Potomac River area. Waterfowl and deer.',
  },
  {
    name: 'Dorchester',
    deerManagementRegion: 'Region B',
    sundayHuntingAllowed: true,
    antlerRestrictions: STATEWIDE_APR,
    notes: 'Region B. Eastern Shore marshlands. Excellent waterfowl. Deer available.',
  },
  {
    name: 'Frederick',
    deerManagementRegion: 'Region B',
    sundayHuntingAllowed: true,
    antlerRestrictions: STATEWIDE_APR,
    notes:
      'Region B. North-central Maryland. Appalachian foothills. One of four counties open to bear hunting.',
  },
  {
    name: 'Garrett',
    deerManagementRegion: 'Region A',
    sundayHuntingAllowed: true,
    antlerRestrictions: STATEWIDE_APR,
    notes:
      'Region A (western). Restrictive antlerless limits — see bag limits. Far western Maryland. Bear season. Grouse habitat.',
  },
  {
    name: 'Harford',
    deerManagementRegion: 'Region B',
    sundayHuntingAllowed: true,
    antlerRestrictions: STATEWIDE_APR,
    notes: 'Region B. Northern Maryland. Rolling terrain. Good deer and turkey.',
  },
  {
    name: 'Howard',
    deerManagementRegion: 'Region B',
    sundayHuntingAllowed: false,
    antlerRestrictions: STATEWIDE_APR,
    notes:
      'Region B. No Sunday deer hunting. Urban/Suburban Deer Management Zone (unlimited antlerless archery). Limited hunting areas.',
  },
  {
    name: 'Kent',
    deerManagementRegion: 'Region B',
    sundayHuntingAllowed: true,
    antlerRestrictions: STATEWIDE_APR,
    notes: 'Region B. Upper Eastern Shore. Chesapeake Bay tributaries. Mixed habitat.',
  },
  {
    name: 'Montgomery',
    deerManagementRegion: 'Region B',
    sundayHuntingAllowed: true,
    antlerRestrictions: STATEWIDE_APR,
    notes:
      'Region B. Urban/Suburban Deer Management Zone (unlimited antlerless archery). Multiple WMAs. Shotgun/bow emphasis.',
  },
  {
    name: 'Prince George\'s',
    deerManagementRegion: 'Region B',
    sundayHuntingAllowed: false,
    antlerRestrictions: STATEWIDE_APR,
    notes:
      'Region B. No Sunday deer hunting. Urban/Suburban Deer Management Zone (unlimited antlerless archery). D.C. suburbs; limited areas.',
  },
  {
    name: 'Queen Anne\'s',
    deerManagementRegion: 'Region B',
    sundayHuntingAllowed: true,
    antlerRestrictions: STATEWIDE_APR,
    notes: 'Region B. Upper Eastern Shore. Chesapeake Bay area. Waterfowl and deer.',
  },
  {
    name: 'Somerset',
    deerManagementRegion: 'Region B',
    sundayHuntingAllowed: true,
    antlerRestrictions: STATEWIDE_APR,
    notes: 'Region B. Lower Eastern Shore. Swamp habitat. Excellent waterfowl.',
  },
  {
    name: 'St. Mary\'s',
    deerManagementRegion: 'Region B',
    sundayHuntingAllowed: true,
    antlerRestrictions: STATEWIDE_APR,
    notes: 'Region B. Southern Maryland. Potomac River. Waterfowl and deer.',
  },
  {
    name: 'Talbot',
    deerManagementRegion: 'Region B',
    sundayHuntingAllowed: true,
    antlerRestrictions: STATEWIDE_APR,
    notes: 'Region B. Upper Eastern Shore. Chesapeake Bay area. Waterfowl habitat.',
  },
  {
    name: 'Washington',
    deerManagementRegion: 'Region A (west) / Region B (east)',
    sundayHuntingAllowed: true,
    antlerRestrictions: STATEWIDE_APR,
    notes:
      'Split county: the western portion is Region A (restrictive antlerless limits), the eastern portion is Region B. One of four bear-hunting counties. Verify which region your specific area falls in.',
  },
  {
    name: 'Wicomico',
    deerManagementRegion: 'Region B',
    sundayHuntingAllowed: true,
    antlerRestrictions: STATEWIDE_APR,
    notes: 'Region B. Lower Eastern Shore. Mixed habitat. Good hunting.',
  },
  {
    name: 'Worcester',
    deerManagementRegion: 'Region B',
    sundayHuntingAllowed: true,
    antlerRestrictions: STATEWIDE_APR,
    notes: 'Region B. Lower Eastern Shore. Coastal area. Waterfowl emphasis.',
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// BAG LIMITS BY SPECIES
// ─────────────────────────────────────────────────────────────────────────────

export const MD_BAG_LIMITS: BagLimitRule[] = [
  // DEER
  {
    species: 'White-tailed Deer',
    weaponType: 'Any',
    limitType: 'season',
    quantity: 2,
    timePeriod: 'calendar year',
    notes:
      'Antlered deer: 2 per year on the regular bag (a Bonus Antlered Deer Stamp is required for additional antlered deer). Antler-point rule (statewide): your first antlered deer may be any buck; each additional antlered deer must have at least 3 points on one antler.',
  },
  // Antlerless limits differ sharply by deer region — the most commonly
  // misunderstood MD rule. Source: eRegulations MD Deer Seasons & Bag Limits.
  {
    species: 'White-tailed Deer',
    weaponType: 'Any',
    limitType: 'season',
    quantity: 2,
    timePeriod: 'calendar year',
    notes:
      'Antlerless — REGION A (Allegany, Garrett, western Washington): maximum 1 per day and 2 total for the year, combined across archery, firearms, and muzzleloader. Do not exceed 2.',
    countyRestrictions: ['Allegany', 'Garrett', 'Washington'],
  },
  {
    species: 'White-tailed Deer',
    weaponType: 'Any',
    limitType: 'season',
    quantity: 15,
    timePeriod: 'season',
    notes:
      'Antlerless — REGION B (rest of the state): archery 15 per season, firearms 10 per season, muzzleloader 10 per season. Unlimited antlerless archery in the Urban/Suburban Deer Management Zone (Anne Arundel, Baltimore, Howard, Montgomery, Prince George’s).',
  },
  {
    species: 'White-tailed Deer',
    weaponType: 'Muzzleloader',
    limitType: 'season',
    quantity: 1,
    timePeriod: 'calendar year',
    notes:
      'Antlered limit for muzzleloader hunters: 1 per calendar year combined (fall + winter seasons).',
  },

  // TURKEY
  {
    species: 'Wild Turkey',
    weaponType: 'Shotgun or Bow',
    limitType: 'season',
    quantity: 1,
    timePeriod: 'spring season',
    notes:
      'Spring season: 1 bearded turkey. Bearded birds only in spring.',
  },
  {
    species: 'Wild Turkey',
    weaponType: 'Any',
    limitType: 'season',
    quantity: 2,
    timePeriod: 'fall and winter combined',
    notes:
      'Fall/winter combined: 2 turkeys. Either sex. Includes archery and firearms.',
  },

  // WATERFOWL
  {
    species: 'Ducks',
    weaponType: 'Shotgun',
    limitType: 'daily',
    quantity: 6,
    timePeriod: 'daily',
    notes: 'Regular duck season daily limit. Varies by specific species.',
  },
  {
    species: 'Teal (Blue-winged, Green-winged)',
    weaponType: 'Shotgun',
    limitType: 'daily',
    quantity: 4,
    timePeriod: 'daily',
    notes: 'Early teal season daily limit.',
  },
  {
    species: 'Geese (Canada, Snow)',
    weaponType: 'Shotgun',
    limitType: 'daily',
    quantity: 5,
    timePeriod: 'daily',
    notes: 'Canada and snow geese combined. Daily limit.',
  },

  // SMALL GAME
  {
    species: 'Eastern Cottontail Rabbit',
    weaponType: 'Shotgun or Rifle',
    limitType: 'daily',
    quantity: 4,
    timePeriod: 'daily',
    notes: 'Eastern cottontail rabbit. 4 per day, 8 in possession.',
  },
  {
    species: 'Gray Squirrel',
    weaponType: 'Any',
    limitType: 'daily',
    quantity: 6,
    timePeriod: 'daily',
    notes: 'Gray and fox squirrel combined. 6 per day, 12 in possession.',
  },
  {
    species: 'Ruffed Grouse',
    weaponType: 'Shotgun',
    limitType: 'daily',
    quantity: 3,
    timePeriod: 'daily',
    notes: 'Ruffed grouse. 3 per day, 6 in possession. Western Maryland only.',
  },
  {
    species: 'Ring-necked Pheasant',
    weaponType: 'Shotgun',
    limitType: 'daily',
    quantity: 2,
    timePeriod: 'daily',
    notes: 'Ring-necked pheasant only. 2 per day, 4 in possession.',
  },

  // BEAR
  {
    species: 'Black Bear',
    weaponType: 'Rifle or Shotgun Slug',
    limitType: 'season',
    quantity: 1,
    timePeriod: 'calendar year',
    notes:
      'Bear: 1 per calendar year. Lottery-draw permit hunt in Allegany, Frederick, Garrett, and Washington counties.',
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// HELPER FUNCTIONS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Get all seasons for a specific species.
 */
export function getSeasonsBySpecies(species: string): HuntingSeason[] {
  return MD_SEASONS.filter(
    (s) => s.species.toLowerCase() === species.toLowerCase()
  );
}

/**
 * Check if a given date falls within a hunting season for a species.
 *
 * When `county` is supplied, seasons that are restricted to specific counties
 * (via `countyRestrictions`) are only considered open in those counties — so a
 * bear/grouse hunt does not read "in season" statewide. Omitting `county`
 * preserves the old statewide behavior for callers that don't have one.
 */
export function isInSeason(
  species: string,
  date: Date,
  weaponType: string,
  county?: string
): boolean {
  const seasons = getSeasonsBySpecies(species);
  const dateStr = date.toISOString().split('T')[0];

  return seasons.some((season) => {
    const dateOk = season.startDate <= dateStr && dateStr <= season.endDate;
    const weaponOk = season.weaponType
      .toLowerCase()
      .includes(weaponType.toLowerCase());
    const restrictedTo = season.countyRestrictions ?? [];
    const countyOk =
      !county ||
      restrictedTo.length === 0 ||
      restrictedTo.some((c) => c.toLowerCase() === county.toLowerCase());
    return dateOk && weaponOk && countyOk;
  });
}

/**
 * Get all WMAs in a specific county.
 */
export function getWMAsByCounty(county: string): WildlifeManagementArea[] {
  return MD_WMAS.filter(
    (wma) => wma.county.toLowerCase() === county.toLowerCase()
  );
}

/**
 * Get bag limit info for a species.
 */
export function getBagLimitInfo(species: string): BagLimitRule[] {
  return MD_BAG_LIMITS.filter(
    (rule) => rule.species.toLowerCase() === species.toLowerCase()
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// WATERFOWL HUNTING — PUBLIC BLINDS, BLIND DRAWS, & REGULATIONS
// ─────────────────────────────────────────────────────────────────────────────

export interface WaterfowlBlindSite {
  id: string;
  name: string;
  county: string;
  wmaName: string;
  blindCount: number;
  blindType: 'shoreline' | 'offshore' | 'pit' | 'field' | 'mixed';
  gooseFields?: number;
  reservationRequired: boolean;
  reservationMethod: 'daily_draw' | 'lottery' | 'first_come' | 'online';
  accessMethod: 'walk_in' | 'boat_required' | 'both';
  adaAccessible: boolean;
  tidalZone: 'tidal' | 'non_tidal';
  primarySpecies: string[];
  center: [number, number]; // [lon, lat]
  notes: string;
  dnrUrl: string;
}

export interface WaterfowlRegulationDetail {
  id: string;
  category: string;
  title: string;
  description: string;
  requirement: 'required' | 'recommended' | 'info';
}

/** Maryland public waterfowl blind sites — MD DNR managed */
export const MD_WATERFOWL_BLINDS: WaterfowlBlindSite[] = [
  {
    id: 'blind_ehor',
    name: 'Eastern Neck NWR Blinds',
    county: 'Kent',
    wmaName: 'Eastern Neck National Wildlife Refuge',
    blindCount: 6,
    blindType: 'shoreline',
    reservationRequired: true,
    reservationMethod: 'first_come',
    accessMethod: 'walk_in',
    adaAccessible: true,
    tidalZone: 'tidal',
    primarySpecies: ['Canada Goose', 'Mallard', 'Black Duck', 'Canvasback', 'Scaup'],
    center: [-76.22, 39.03],
    notes: 'Federal refuge. Waterfowl hunting by permit only on designated days. 2 ADA-accessible blinds. Check FWS website for specific hunt dates.',
    dnrUrl: 'https://www.fws.gov/refuge/eastern-neck',
  },
  {
    id: 'blind_blackwater',
    name: 'Blackwater NWR Blinds',
    county: 'Dorchester',
    wmaName: 'Blackwater National Wildlife Refuge',
    blindCount: 25,
    blindType: 'mixed',
    gooseFields: 4,
    reservationRequired: true,
    reservationMethod: 'lottery',
    accessMethod: 'both',
    adaAccessible: true,
    tidalZone: 'tidal',
    primarySpecies: ['Canada Goose', 'Snow Goose', 'Mallard', 'Pintail', 'Teal', 'Black Duck'],
    center: [-76.10, 38.42],
    notes: 'Largest blind site in MD. 25 blinds + 4 goose fields. Lottery draw required. 3 ADA-accessible blinds. Premier waterfowl destination on Eastern Shore. Refuge hunts on specific dates only.',
    dnrUrl: 'https://www.fws.gov/refuge/blackwater',
  },
  {
    id: 'blind_deal_island',
    name: 'Deal Island WMA Blinds',
    county: 'Somerset',
    wmaName: 'Deal Island WMA',
    blindCount: 12,
    blindType: 'shoreline',
    reservationRequired: true,
    reservationMethod: 'daily_draw',
    accessMethod: 'walk_in',
    adaAccessible: false,
    tidalZone: 'tidal',
    primarySpecies: ['Black Duck', 'Mallard', 'Pintail', 'Teal', 'Bufflehead'],
    center: [-75.95, 38.17],
    notes: 'Somerset County tidal marshes. Daily draw at designated check station 1 hour before shooting time. Excellent black duck habitat.',
    dnrUrl: 'https://dnr.maryland.gov/wildlife/Pages/publiclands/eastern/dealisland.aspx',
  },
  {
    id: 'blind_fairmount',
    name: 'Fairmount WMA Blinds',
    county: 'Somerset',
    wmaName: 'Fairmount WMA',
    blindCount: 8,
    blindType: 'shoreline',
    reservationRequired: true,
    reservationMethod: 'daily_draw',
    accessMethod: 'walk_in',
    adaAccessible: false,
    tidalZone: 'tidal',
    primarySpecies: ['Black Duck', 'Mallard', 'Teal', 'Pintail'],
    center: [-75.87, 38.14],
    notes: 'Adjacent to Deal Island. Tidal marsh blinds. Daily draw system. Good late-season hunting.',
    dnrUrl: 'https://dnr.maryland.gov/wildlife/Pages/publiclands/eastern/fairmount.aspx',
  },
  {
    id: 'blind_pocomoke',
    name: 'Pocomoke River WMA Blinds',
    county: 'Worcester',
    wmaName: 'Pocomoke River WMA',
    blindCount: 6,
    blindType: 'shoreline',
    reservationRequired: true,
    reservationMethod: 'daily_draw',
    accessMethod: 'both',
    adaAccessible: false,
    tidalZone: 'tidal',
    primarySpecies: ['Mallard', 'Black Duck', 'Wood Duck', 'Teal'],
    center: [-75.56, 38.10],
    notes: 'Pocomoke River swamp habitat. Mix of tidal and freshwater marshes. Some blinds require boat access.',
    dnrUrl: 'https://dnr.maryland.gov/wildlife/Pages/publiclands/eastern/pocomoke.aspx',
  },
  {
    id: 'blind_lecompte',
    name: 'LeCompte WMA Blinds',
    county: 'Dorchester',
    wmaName: 'LeCompte WMA',
    blindCount: 4,
    blindType: 'shoreline',
    reservationRequired: true,
    reservationMethod: 'daily_draw',
    accessMethod: 'walk_in',
    adaAccessible: false,
    tidalZone: 'tidal',
    primarySpecies: ['Canada Goose', 'Mallard', 'Black Duck', 'Teal'],
    center: [-76.05, 38.50],
    notes: 'Eastern Shore marsh habitat. 4 blinds with daily draw. Good early-season teal and late-season goose hunting.',
    dnrUrl: 'https://dnr.maryland.gov/wildlife/Pages/publiclands/eastern/lecompte.aspx',
  },
  {
    id: 'blind_idylwild',
    name: 'Idylwild WMA Blinds',
    county: 'Talbot',
    wmaName: 'Idylwild WMA',
    blindCount: 4,
    blindType: 'shoreline',
    reservationRequired: true,
    reservationMethod: 'daily_draw',
    accessMethod: 'walk_in',
    adaAccessible: false,
    tidalZone: 'tidal',
    primarySpecies: ['Canada Goose', 'Mallard', 'Scaup', 'Canvasback'],
    center: [-76.18, 38.78],
    notes: 'Talbot County, Eastern Shore. Chesapeake Bay tidal marshes. Good diver duck hunting.',
    dnrUrl: 'https://dnr.maryland.gov/wildlife/Pages/publiclands/eastern/idylwild.aspx',
  },
  {
    id: 'blind_millington',
    name: 'Millington WMA Blinds',
    county: 'Kent',
    wmaName: 'Millington WMA',
    blindCount: 6,
    blindType: 'mixed',
    gooseFields: 2,
    reservationRequired: true,
    reservationMethod: 'daily_draw',
    accessMethod: 'walk_in',
    adaAccessible: true,
    tidalZone: 'non_tidal',
    primarySpecies: ['Canada Goose', 'Mallard', 'Teal', 'Wood Duck'],
    center: [-75.85, 39.25],
    notes: 'Upper Eastern Shore. Non-tidal impoundments and goose fields. 1 ADA-accessible blind. Good early season for wood duck and teal.',
    dnrUrl: 'https://dnr.maryland.gov/wildlife/Pages/publiclands/eastern/millington.aspx',
  },
  {
    id: 'blind_susquehanna',
    name: 'Susquehanna Flats Blinds',
    county: 'Cecil',
    wmaName: 'Susquehanna Flats',
    blindCount: 15,
    blindType: 'offshore',
    reservationRequired: false,
    reservationMethod: 'first_come',
    accessMethod: 'boat_required',
    adaAccessible: false,
    tidalZone: 'tidal',
    primarySpecies: ['Canvasback', 'Redhead', 'Scaup', 'Bufflehead', 'Goldeneye', 'Canada Goose'],
    center: [-76.05, 39.52],
    notes: 'Legendary Chesapeake Bay waterfowl area. Offshore blinds require boat. Premier canvasback hunting in the Atlantic Flyway. No reservation required but limited stakes.',
    dnrUrl: 'https://dnr.maryland.gov/wildlife/Pages/hunt_trap/waterfowlblind.aspx',
  },
  {
    id: 'blind_back_river',
    name: 'Back River Neck WMA Blinds',
    county: 'Anne Arundel',
    wmaName: 'Back River Neck WMA',
    blindCount: 4,
    blindType: 'shoreline',
    reservationRequired: true,
    reservationMethod: 'daily_draw',
    accessMethod: 'walk_in',
    adaAccessible: false,
    tidalZone: 'tidal',
    primarySpecies: ['Canada Goose', 'Mallard', 'Black Duck', 'Bufflehead'],
    center: [-76.47, 39.20],
    notes: 'Central Maryland tidal marsh. Close to Baltimore. Daily draw at check station.',
    dnrUrl: 'https://dnr.maryland.gov/wildlife/Pages/publiclands/central/backriver.aspx',
  },
];

/** Waterfowl-specific regulations and requirements for Maryland */
export const MD_WATERFOWL_REGULATIONS: WaterfowlRegulationDetail[] = [
  {
    id: 'wf_reg_hip',
    category: 'Licensing',
    title: 'Harvest Information Program (HIP) Registration',
    description: 'All waterfowl hunters in Maryland must register with the HIP program before hunting migratory birds. Free registration available online at the USFWS website. Must be renewed annually.',
    requirement: 'required',
  },
  {
    id: 'wf_reg_duck_stamp',
    category: 'Licensing',
    title: 'Federal Duck Stamp',
    description: 'All waterfowl hunters 16+ must purchase a Federal Migratory Bird Hunting and Conservation Stamp ($25). Available at post offices, online, or through the USFWS E-Stamp program. Must be signed across the face.',
    requirement: 'required',
  },
  {
    id: 'wf_reg_md_stamp',
    category: 'Licensing',
    title: 'Maryland Migratory Game Bird Stamp',
    description: 'Required for hunting ducks, geese, and other migratory birds in Maryland. Available through Maryland DNR licensing system. Separate from the federal duck stamp.',
    requirement: 'required',
  },
  {
    id: 'wf_reg_steel_shot',
    category: 'Equipment',
    title: 'Non-Toxic Shot Required',
    description: 'Lead shot is prohibited for all waterfowl hunting. Must use approved non-toxic shot: steel, bismuth, tungsten-iron, tungsten-matrix, or other USFWS-approved alternatives. No shot size larger than T-shot.',
    requirement: 'required',
  },
  {
    id: 'wf_reg_plugged_gun',
    category: 'Equipment',
    title: 'Plugged Shotgun',
    description: 'Shotguns must be plugged to hold no more than 3 shells total (1 in chamber + 2 in magazine). Applies to all migratory bird hunting.',
    requirement: 'required',
  },
  {
    id: 'wf_reg_shooting_hours',
    category: 'Timing',
    title: 'Legal Shooting Hours',
    description: 'Waterfowl hunting begins 30 minutes before sunrise and ends at sunset. Check MD DNR for exact daily times. Shooting hours differ from upland game seasons.',
    requirement: 'required',
  },
  {
    id: 'wf_reg_blind_draw',
    category: 'Access',
    title: 'Public Blind Lottery & Daily Draw',
    description: 'Most MD DNR-managed waterfowl blinds require either a pre-season lottery (Blackwater NWR) or a daily draw at the check station (most WMAs). Hunters must arrive at the check station 1 hour before legal shooting time. Daily draw results are final. Some federal refuge hunts require separate permits.',
    requirement: 'required',
  },
  {
    id: 'wf_reg_boat_blinds',
    category: 'Access',
    title: 'Private & Stake Blinds',
    description: 'Private permanent blinds on public waters require a DNR permit. Stake blind sites are licensed annually through a competitive application. All permanent blinds must display a valid license plate. No hunting within 150 yards of another blind without permission.',
    requirement: 'info',
  },
  {
    id: 'wf_reg_flyway',
    category: 'Regulations',
    title: 'Atlantic Flyway Framework',
    description: 'Maryland is in the Atlantic Flyway. Season dates and bag limits are set within federal frameworks established by the USFWS based on annual breeding population surveys. Maryland cannot exceed federal maximums.',
    requirement: 'info',
  },
  {
    id: 'wf_reg_species_limits',
    category: 'Bag Limits',
    title: 'Species-Specific Daily Bag Limits',
    description: 'Within the 6-duck daily limit: Mallard (4, only 2 hens), Black Duck (2), Canvasback (1), Redhead (2), Scaup (1 early season / 2 late season), Pintail (1), Mottled Duck (1), Wood Duck (3). Possession limit is 3x daily bag.',
    requirement: 'required',
  },
  {
    id: 'wf_reg_goose_species',
    category: 'Bag Limits',
    title: 'Goose Species Limits',
    description: 'Canada Goose: 5 per day during regular season, 15 per day during late season (Jan-Feb). Snow Goose: 25 per day during conservation season (no plug required, electronic calls allowed). Light geese have separate liberal season.',
    requirement: 'required',
  },
  {
    id: 'wf_reg_tidal_zones',
    category: 'Zones',
    title: 'Tidal vs. Non-Tidal Zones',
    description: 'Maryland distinguishes between tidal and non-tidal waterfowl hunting zones. Tidal zones include Chesapeake Bay, its tributaries, and Atlantic coastal waters. Season dates may differ between zones. Check specific zone boundaries on MD DNR website.',
    requirement: 'info',
  },
  {
    id: 'wf_reg_sunday',
    category: 'Timing',
    title: 'Sunday Waterfowl Hunting',
    description: 'Sunday hunting for waterfowl is permitted on private land and in some public areas during regular waterfowl seasons. Check specific WMA rules as some restrict Sunday hunting.',
    requirement: 'info',
  },
];

/** Blind draw calendar — key dates for waterfowl blind applications */
export const MD_BLIND_DRAW_CALENDAR = [
  {
    id: 'draw_lottery_app',
    event: 'Seasonal Blind Lottery Application Opens',
    dateRange: 'July 1 - August 15',
    description: 'Apply for pre-season lottery drawings for Blackwater NWR and other federal refuge hunts. Applications via MD DNR website.',
    url: 'https://dnr.maryland.gov/wildlife/Pages/hunt_trap/waterfowlblind.aspx',
  },
  {
    id: 'draw_lottery_results',
    event: 'Lottery Results Announced',
    dateRange: 'September 1 - September 15',
    description: 'Pre-season lottery results posted on MD DNR website. Successful applicants notified by email.',
    url: 'https://dnr.maryland.gov/wildlife/Pages/hunt_trap/waterfowlblind.aspx',
  },
  {
    id: 'draw_early_teal',
    event: 'Early Teal Season',
    dateRange: 'September 1 - September 15',
    description: 'Early teal season. Daily draws at applicable WMAs. Blue-winged and green-winged teal only.',
    url: 'https://dnr.maryland.gov/wildlife/Pages/hunt_trap/waterfowl.aspx',
  },
  {
    id: 'draw_regular_open',
    event: 'Regular Waterfowl Season Opens',
    dateRange: 'Late October',
    description: 'Regular duck and goose seasons open. Daily draws resume at WMA check stations. Arrive 1 hour before legal shooting time.',
    url: 'https://dnr.maryland.gov/wildlife/Pages/hunt_trap/waterfowl.aspx',
  },
  {
    id: 'draw_late_goose',
    event: 'Late Canada Goose Season',
    dateRange: 'January - February',
    description: 'Extended goose season with liberal bag limit (15 per day). Good opportunity on Eastern Shore agricultural fields.',
    url: 'https://dnr.maryland.gov/wildlife/Pages/hunt_trap/waterfowl.aspx',
  },
  {
    id: 'draw_snow_goose',
    event: 'Conservation Snow Goose Season',
    dateRange: 'January - April',
    description: 'Liberal snow goose conservation season. No plug required. Electronic calls permitted. No daily bag limit or possession limit.',
    url: 'https://dnr.maryland.gov/wildlife/Pages/hunt_trap/waterfowl.aspx',
  },
];

/** Helper: Get all blind sites for a county */
export function getBlindsByCounty(county: string): WaterfowlBlindSite[] {
  return MD_WATERFOWL_BLINDS.filter(
    (b) => b.county.toLowerCase() === county.toLowerCase()
  );
}

/** Helper: Get all ADA-accessible blind sites */
export function getAccessibleBlinds(): WaterfowlBlindSite[] {
  return MD_WATERFOWL_BLINDS.filter((b) => b.adaAccessible);
}

/** Helper: Get blind sites by tidal zone */
export function getBlindsByZone(zone: 'tidal' | 'non_tidal'): WaterfowlBlindSite[] {
  return MD_WATERFOWL_BLINDS.filter((b) => b.tidalZone === zone);
}

/** Helper: Get waterfowl regulations by category */
export function getWaterfowlRegsByCategory(category: string): WaterfowlRegulationDetail[] {
  return MD_WATERFOWL_REGULATIONS.filter(
    (r) => r.category.toLowerCase() === category.toLowerCase()
  );
}

// ────────────────────────────────────────────────────────────────────────────
// 2026-04-26 (fork merge): rut-phase stubs.
// chatKnowledge.ts imports these. The richer rut model lives in
// services/rutCalendarService.ts (V2.3 Phase D.1 — moon-phase + temporal
// scoring). These stubs keep chatKnowledge functional until it's rewired
// to consume rutCalendarService directly.
// ────────────────────────────────────────────────────────────────────────────

export interface RutPhaseInfo {
  /** Phase name (e.g., 'Pre-rut', 'Chase', 'Post-rut'). */
  phase: string;
  startMonth: number;  // 1-12
  startDay: number;    // 1-31
  endMonth: number;
  endDay: number;
  description: string;
  /** Concise hunting strategy tip for this phase. */
  huntingTips: string;
}

export const MD_RUT_CALENDAR: RutPhaseInfo[] = [
  { phase: 'Pre-rut', startMonth: 10, startDay: 15, endMonth: 11, endDay: 4,
    description: 'Bucks scrape and rub aggressively. Increased daylight movement.',
    huntingTips: 'Hunt rub lines and scrape edges; sit dawn and last light.' },
  { phase: 'Seeking', startMonth: 11, startDay: 5, endMonth: 11, endDay: 9,
    description: 'Bucks cruise looking for receptive does. Best week to be in the woods.',
    huntingTips: 'All-day sits in funnels between bedding and food.' },
  { phase: 'Chase', startMonth: 11, startDay: 10, endMonth: 11, endDay: 14,
    description: 'Peak chasing. Daytime movement is at its highest.',
    huntingTips: 'Rattling and grunting can pull cruising bucks; stay all day.' },
  { phase: 'Breeding', startMonth: 11, startDay: 15, endMonth: 11, endDay: 25,
    description: 'Bucks lock down with does. Movement slows but key buck activity continues.',
    huntingTips: 'Find a hot doe; watch doe bedding areas and travel corridors.' },
  { phase: 'Post-rut', startMonth: 11, startDay: 26, endMonth: 12, endDay: 15,
    description: 'Bucks recover and feed heavily. Late-season food sources are productive.',
    huntingTips: 'Standing corn, beans, and acorn drops draw recovering bucks.' },
  { phase: 'Second-rut', startMonth: 12, startDay: 16, endMonth: 12, endDay: 31,
    description: 'Late-cycle does come back into estrus. A small but real movement bump.',
    huntingTips: 'Cold-front afternoons over food are the highest-percentage sits.' },
];

export function getCurrentRutPhase(now: Date = new Date()): RutPhaseInfo | null {
  const m = now.getMonth() + 1;
  const d = now.getDate();
  const after = (sm: number, sd: number) => m > sm || (m === sm && d >= sd);
  const before = (em: number, ed: number) => m < em || (m === em && d <= ed);
  for (const phase of MD_RUT_CALENDAR) {
    if (after(phase.startMonth, phase.startDay) && before(phase.endMonth, phase.endDay)) {
      return phase;
    }
  }
  return null;
}
