/**
 * Maryland Hunting Data — 2025-2026 Season
 *
 * Real, comprehensive data for all Maryland hunting seasons, WMAs, counties, and bag limits.
 * Sources: MD DNR Hunter's Guide, eRegulations.com/maryland, and official season announcements.
 *
 * This file is the single source of truth for the app's regulations engine.
 */

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
  deerManagementRegion: string;
  sundayHuntingAllowed: boolean;
  antlerRestrictions: string; // e.g. 'No antler restrictions', 'Minimum 15" inside or 17" outside'
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

export interface RutPhase {
  phase: string;
  startMonth: number;
  startDay: number;
  endMonth: number;
  endDay: number;
  description: string;
  huntingTips: string;
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
    startDate: '2025-12-14',
    endDate: '2025-12-20',
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
      'Designated counties only (primarily Garrett and Allegany). Rifle or shotgun slug. Lottery draw for permits.',
    countyRestrictions: ['Garrett', 'Allegany'],
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

export const MD_COUNTIES: MarylandCounty[] = [
  {
    name: 'Allegany',
    deerManagementRegion: 'Western',
    sundayHuntingAllowed: true,
    antlerRestrictions: 'No restrictions',
    notes: 'Mountain region. Western Maryland. Grouse hunting available.',
  },
  {
    name: 'Anne Arundel',
    deerManagementRegion: 'Central',
    sundayHuntingAllowed: true,
    antlerRestrictions: 'No restrictions',
    notes: 'Around Annapolis. Urban and suburban. Waterfowl hunting in tidewater.',
  },
  {
    name: 'Baltimore',
    deerManagementRegion: 'Central',
    sundayHuntingAllowed: true,
    antlerRestrictions: 'No restrictions',
    notes: 'Urban/suburban. Limited hunting areas. Bow and shotgun emphasis.',
  },
  {
    name: 'Baltimore City',
    deerManagementRegion: 'Central',
    sundayHuntingAllowed: false,
    antlerRestrictions: 'No hunting except special programs',
    notes: 'Urban area. Limited hunting except dedicated wildlife management areas.',
  },
  {
    name: 'Calvert',
    deerManagementRegion: 'Central',
    sundayHuntingAllowed: true,
    antlerRestrictions: 'No restrictions',
    notes: 'Southern Maryland. Tidewater. Waterfowl and deer habitat.',
  },
  {
    name: 'Caroline',
    deerManagementRegion: 'Eastern Shore',
    sundayHuntingAllowed: true,
    antlerRestrictions: 'No restrictions',
    notes: 'Eastern Shore. Agricultural land. Good deer and upland game.',
  },
  {
    name: 'Carroll',
    deerManagementRegion: 'Central',
    sundayHuntingAllowed: true,
    antlerRestrictions: 'No restrictions',
    notes: 'Northwestern Maryland. Rolling hills. Good deer hunting.',
  },
  {
    name: 'Cecil',
    deerManagementRegion: 'Northern',
    sundayHuntingAllowed: true,
    antlerRestrictions: 'No restrictions',
    notes: 'Upper Eastern Shore. Mixed habitat. Good all-around hunting.',
  },
  {
    name: 'Charles',
    deerManagementRegion: 'Southern',
    sundayHuntingAllowed: true,
    antlerRestrictions: 'No restrictions',
    notes: 'Southern Maryland. Potomac River area. Waterfowl and deer.',
  },
  {
    name: 'Dorchester',
    deerManagementRegion: 'Eastern Shore',
    sundayHuntingAllowed: true,
    antlerRestrictions: 'No restrictions',
    notes: 'Eastern Shore marshlands. Excellent waterfowl. Deer available.',
  },
  {
    name: 'Frederick',
    deerManagementRegion: 'Central',
    sundayHuntingAllowed: true,
    antlerRestrictions: 'No restrictions',
    notes: 'North-central Maryland. Appalachian foothills. Good deer.',
  },
  {
    name: 'Garrett',
    deerManagementRegion: 'Western',
    sundayHuntingAllowed: true,
    antlerRestrictions: 'No restrictions',
    notes: 'Far western Maryland. High elevation. Bear season. Grouse habitat.',
  },
  {
    name: 'Harford',
    deerManagementRegion: 'Northern',
    sundayHuntingAllowed: true,
    antlerRestrictions: 'No restrictions',
    notes: 'Northern Maryland. Rolling terrain. Good deer and turkey.',
  },
  {
    name: 'Howard',
    deerManagementRegion: 'Central',
    sundayHuntingAllowed: true,
    antlerRestrictions: 'No restrictions',
    notes: 'Central Maryland. Urban/suburban. Limited hunting areas.',
  },
  {
    name: 'Kent',
    deerManagementRegion: 'Eastern Shore',
    sundayHuntingAllowed: true,
    antlerRestrictions: 'No restrictions',
    notes: 'Upper Eastern Shore. Chesapeake Bay tributaries. Mixed habitat.',
  },
  {
    name: 'Montgomery',
    deerManagementRegion: 'Central',
    sundayHuntingAllowed: true,
    antlerRestrictions: 'No restrictions',
    notes: 'Northern suburban Maryland. Multiple WMAs. Shotgun/bow emphasis.',
  },
  {
    name: 'Prince George\'s',
    deerManagementRegion: 'Central',
    sundayHuntingAllowed: true,
    antlerRestrictions: 'No restrictions',
    notes: 'Washington D.C. suburbs. Limited hunting areas.',
  },
  {
    name: 'Queen Anne\'s',
    deerManagementRegion: 'Eastern Shore',
    sundayHuntingAllowed: true,
    antlerRestrictions: 'No restrictions',
    notes: 'Upper Eastern Shore. Chesapeake Bay area. Waterfowl and deer.',
  },
  {
    name: 'Somerset',
    deerManagementRegion: 'Eastern Shore',
    sundayHuntingAllowed: true,
    antlerRestrictions: 'No restrictions',
    notes: 'Lower Eastern Shore. Swamp habitat. Excellent waterfowl.',
  },
  {
    name: 'St. Mary\'s',
    deerManagementRegion: 'Southern',
    sundayHuntingAllowed: true,
    antlerRestrictions: 'No restrictions',
    notes: 'Southern Maryland. Potomac River. Waterfowl and deer.',
  },
  {
    name: 'Talbot',
    deerManagementRegion: 'Eastern Shore',
    sundayHuntingAllowed: true,
    antlerRestrictions: 'No restrictions',
    notes: 'Upper Eastern Shore. Chesapeake Bay area. Waterfowl habitat.',
  },
  {
    name: 'Washington',
    deerManagementRegion: 'Western',
    sundayHuntingAllowed: true,
    antlerRestrictions: 'No restrictions',
    notes: 'Western Maryland. Potomac area. Appalachian terrain.',
  },
  {
    name: 'Wicomico',
    deerManagementRegion: 'Eastern Shore',
    sundayHuntingAllowed: true,
    antlerRestrictions: 'No restrictions',
    notes: 'Lower Eastern Shore. Mixed habitat. Good hunting.',
  },
  {
    name: 'Worcester',
    deerManagementRegion: 'Eastern Shore',
    sundayHuntingAllowed: true,
    antlerRestrictions: 'No restrictions',
    notes: 'Lower Eastern Shore. Coastal area. Waterfowl emphasis.',
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
    notes: 'Antlered deer: Maximum 2 per calendar year.',
  },
  {
    species: 'White-tailed Deer',
    weaponType: 'Any',
    limitType: 'season',
    quantity: 5,
    timePeriod: 'calendar year',
    notes:
      'Antlerless deer: 5 per calendar year (varies by county). Check specific county bag limits.',
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
      'Bear: 1 per calendar year in designated counties (Garrett, Allegany). Lottery draw permits.',
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// MARYLAND WHITETAIL RUT CALENDAR
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Whitetail rut timeline for Maryland.
 * Provides guidance on deer behavior and hunting strategy by phase.
 * Based on historical breeding patterns in Eastern US populations.
 */
export const MD_RUT_CALENDAR: RutPhase[] = [
  {
    phase: 'Pre-Rut',
    startMonth: 10,
    startDay: 20,
    endMonth: 11,
    endDay: 1,
    description: 'Bucks starting to scrape and rub. Increased movement at dawn and dusk.',
    huntingTips:
      'Hunt travel corridors, rub lines, and scrape areas. Focus on doe bedding areas. Best hunting: dawn and dusk.',
  },
  {
    phase: 'Seeking Phase',
    startMonth: 11,
    startDay: 1,
    endMonth: 11,
    endDay: 7,
    description: 'Bucks actively seeking does. All-day movement peaks as bucks cruise looking for estrous does.',
    huntingTips:
      'All-day sits can be productive. Stay on stand throughout daylight. Use doe estrus scent. Rattle and grunt.',
  },
  {
    phase: 'Peak Rut',
    startMonth: 11,
    startDay: 7,
    endMonth: 11,
    endDay: 20,
    description: 'Peak breeding activity. Bucks chasing does throughout the day. Best overall hunting period.',
    huntingTips:
      'All-day hunting is ideal. Expect increased movement all day. Less caution from bucks. Use all techniques.',
  },
  {
    phase: 'Post-Rut',
    startMonth: 11,
    startDay: 20,
    endMonth: 12,
    endDay: 5,
    description: 'Bucks recovering from rut. Reduced movement. Does concentrate on feeding and recovery.',
    huntingTips:
      'Focus on food sources: acorns, agricultural fields, browse. Sit food sources in early morning and late afternoon.',
  },
  {
    phase: 'Second Rut',
    startMonth: 12,
    startDay: 10,
    endMonth: 12,
    endDay: 20,
    description: 'Unbred does cycle again, triggering a secondary rut period. Bucks active again briefly.',
    huntingTips:
      'Secondary hunting opportunity. Expect moderate activity. Smaller than peak rut but still productive.',
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
 */
export function isInSeason(
  species: string,
  date: Date,
  weaponType: string
): boolean {
  const seasons = getSeasonsBySpecies(species);
  const dateStr = date.toISOString().split('T')[0];

  return seasons.some(
    (season) =>
      season.startDate <= dateStr &&
      dateStr <= season.endDate &&
      season.weaponType.toLowerCase().includes(weaponType.toLowerCase())
  );
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

/**
 * Get the current rut phase for a given date.
 * Returns the matching RutPhase or null if outside rut season.
 */
export function getCurrentRutPhase(date: Date): RutPhase | null {
  const month = date.getMonth() + 1; // getMonth() returns 0-11
  const day = date.getDate();

  for (const phase of MD_RUT_CALENDAR) {
    // Check if date falls within phase
    const startDateNum = phase.startMonth * 100 + phase.startDay;
    const endDateNum = phase.endMonth * 100 + phase.endDay;
    const currentDateNum = month * 100 + day;

    if (currentDateNum >= startDateNum && currentDateNum <= endDateNum) {
      return phase;
    }
  }

  return null;
}
