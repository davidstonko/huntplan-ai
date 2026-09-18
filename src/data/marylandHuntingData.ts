/**
 * Maryland Hunting Data — 2026-2027 Season
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
 * DNR published for the 2026-2027 license year. DNR traditionally publishes
 * the next year's Hunter's Guide in mid-to-late summer, so there is a known
 * window between ~July and the archery opener (first Friday of September)
 * when the data in this file is the MOST RECENT PUBLISHED set but no longer
 * describes the upcoming season.
 *
 * The UI surfaces this as a banner on the Regulations screen. The banner
 * becomes more prominent after `nextSeasonExpectedBy` so users are never
 * misled about whether they're reading "current" regulations.
 *
 * When 2027-2028 data is published (see docs/REGS_2026_27_SOURCES.md for
 * the per-value provenance of the current set):
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
  seasonLabel: '2026-2027',
  // eRegulations 2026-2027 Guide to Hunting and Trapping in Maryland footer:
  // "Last Updated: June 12, 2026". Dates verified against the DNR
  // "Maryland Hunting Seasons Calendar for 2026-2027" PDF on 2026-09-18.
  publishedOn: '2026-06-12',
  // DNR publishes the new license-year regulations in early July. Flag the
  // bundled data as stale from 2027-07-01 so the in-app banner tells hunters
  // to verify the 2027-28 dates.
  nextSeasonExpectedBy: '2027-07-01',
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
// MARYLAND HUNTING SEASONS 2026-2027
// Source: MD DNR "Maryland Hunting Seasons Calendar for 2026-2027" +
// eRegulations 2026-2027 Guide. Provenance: docs/REGS_2026_27_SOURCES.md
// ─────────────────────────────────────────────────────────────────────────────

export const MD_SEASONS: HuntingSeason[] = [
  // ───── DEER (White-tailed Deer) — MD DNR 2026-2027 Hunting Seasons Calendar ─────
  {
    id: 'deer_archery_2026_1',
    species: 'White-tailed Deer',
    seasonType: 'Archery',
    startDate: '2026-09-11',
    endDate: '2026-10-21',
    weaponType: 'Bow',
    bagLimit: '2 antlered per year (no more than 1 per weapon season); antlerless by region',
    notes:
      'Archery segment. Archery is CLOSED during the early muzzleloader (Oct 22-24), firearms (Nov 28-Dec 12), late muzzleloader (Dec 19-Jan 2) and Region B January firearms (Jan 8-10) seasons. Antlerless: Region A 2 total for all seasons; Region B 15 for archery. Sundays open only per the DNR Sunday deer chart.',
    countyRestrictions: [],
  },
  {
    id: 'deer_archery_2026_2',
    species: 'White-tailed Deer',
    seasonType: 'Archery',
    startDate: '2026-10-25',
    endDate: '2026-11-27',
    weaponType: 'Bow',
    bagLimit: '2 antlered per year (no more than 1 per weapon season); antlerless by region',
    notes:
      'Archery segment. Archery is CLOSED during the early muzzleloader (Oct 22-24), firearms (Nov 28-Dec 12), late muzzleloader (Dec 19-Jan 2) and Region B January firearms (Jan 8-10) seasons. Antlerless: Region A 2 total for all seasons; Region B 15 for archery. Sundays open only per the DNR Sunday deer chart.',
    countyRestrictions: [],
  },
  {
    id: 'deer_archery_2026_3',
    species: 'White-tailed Deer',
    seasonType: 'Archery',
    startDate: '2026-12-14',
    endDate: '2026-12-18',
    weaponType: 'Bow',
    bagLimit: '2 antlered per year (no more than 1 per weapon season); antlerless by region',
    notes:
      'Archery segment. Archery is CLOSED during the early muzzleloader (Oct 22-24), firearms (Nov 28-Dec 12), late muzzleloader (Dec 19-Jan 2) and Region B January firearms (Jan 8-10) seasons. Antlerless: Region A 2 total for all seasons; Region B 15 for archery. Sundays open only per the DNR Sunday deer chart.',
    countyRestrictions: [],
  },
  {
    id: 'deer_archery_2026_4',
    species: 'White-tailed Deer',
    seasonType: 'Archery',
    startDate: '2027-01-03',
    endDate: '2027-01-07',
    weaponType: 'Bow',
    bagLimit: '2 antlered per year (no more than 1 per weapon season); antlerless by region',
    notes:
      'Archery segment. Archery is CLOSED during the early muzzleloader (Oct 22-24), firearms (Nov 28-Dec 12), late muzzleloader (Dec 19-Jan 2) and Region B January firearms (Jan 8-10) seasons. Antlerless: Region A 2 total for all seasons; Region B 15 for archery. Sundays open only per the DNR Sunday deer chart.',
    countyRestrictions: [],
  },
  {
    id: 'deer_archery_2026_5',
    species: 'White-tailed Deer',
    seasonType: 'Archery',
    startDate: '2027-01-11',
    endDate: '2027-01-31',
    weaponType: 'Bow',
    bagLimit: '2 antlered per year (no more than 1 per weapon season); antlerless by region',
    notes:
      'Archery segment. Archery is CLOSED during the early muzzleloader (Oct 22-24), firearms (Nov 28-Dec 12), late muzzleloader (Dec 19-Jan 2) and Region B January firearms (Jan 8-10) seasons. Antlerless: Region A 2 total for all seasons; Region B 15 for archery. Sundays open only per the DNR Sunday deer chart.',
    countyRestrictions: [],
  },
  {
    id: 'deer_archery_2027_regionA_jan',
    species: 'White-tailed Deer',
    seasonType: 'Archery (Region A only)',
    startDate: '2027-01-08',
    endDate: '2027-01-10',
    weaponType: 'Bow',
    bagLimit: '2 antlered per year (no more than 1 per weapon season); antlerless by region',
    notes:
      'Archery open Jan 8-10 in Deer Management Region A only (Allegany, Garrett, and western Washington County west of the Rt. 494/57/40/56 line). Region B is in firearms season these days.',
    countyRestrictions: ['Allegany', 'Garrett', 'Washington'],
  },
  {
    id: 'deer_firearms_2026',
    species: 'White-tailed Deer',
    seasonType: 'Firearms (Regular)',
    startDate: '2026-11-28',
    endDate: '2026-12-12',
    weaponType: 'Rifle or Shotgun',
    bagLimit: '2 antlered per year (no more than 1 per weapon season); antlerless by region',
    notes:
      'Regular firearms season. Antlerless: Region A antlerless firearms is Dec 5-12 only (2 total for the year); Region B 10 antlerless for firearms. Any legal weapon may be used; harvest counts toward the firearms bag.',
    countyRestrictions: [],
  },
  {
    id: 'deer_firearms_2027_regionB_jan',
    species: 'White-tailed Deer',
    seasonType: 'Firearms (Region B January)',
    startDate: '2027-01-08',
    endDate: '2027-01-10',
    weaponType: 'Rifle or Shotgun',
    bagLimit: '2 antlered per year (no more than 1 per weapon season); antlerless by region',
    notes:
      'January firearms segment open in Deer Management Region B only (all counties except Allegany, Garrett and western Washington). Region A is archery-only these days.',
    countyRestrictions: ['Anne Arundel', 'Baltimore', 'Baltimore City', 'Calvert', 'Caroline', 'Carroll', 'Cecil', 'Charles', 'Dorchester', 'Frederick', 'Harford', 'Howard', 'Kent', 'Montgomery', 'Prince George\'s', 'Queen Anne\'s', 'Somerset', 'St. Mary\'s', 'Talbot', 'Washington', 'Wicomico', 'Worcester'],
  },
  {
    id: 'deer_muzzleloader_early_2026',
    species: 'White-tailed Deer',
    seasonType: 'Muzzleloader (Early)',
    startDate: '2026-10-22',
    endDate: '2026-10-24',
    weaponType: 'Muzzleloader',
    bagLimit: '1 antlered per muzzleloader season; antlerless by region',
    notes:
      'Early muzzleloader segment, statewide. A Bonus Antlered Deer Stamp may NOT be used during Oct 22-24. Region A antlerless: 2 total for all seasons; Region B: 10 antlerless for muzzleloader.',
    countyRestrictions: [],
  },
  {
    id: 'deer_muzzleloader_2026_regionB_antlerless',
    species: 'White-tailed Deer',
    seasonType: 'Muzzleloader (Antlerless only, Region B)',
    startDate: '2026-10-26',
    endDate: '2026-10-31',
    weaponType: 'Muzzleloader',
    bagLimit: 'Antlerless only',
    notes:
      'Antlerless-only muzzleloader segment in Deer Management Region B only. No antlered deer may be taken on these dates.',
    countyRestrictions: ['Anne Arundel', 'Baltimore', 'Baltimore City', 'Calvert', 'Caroline', 'Carroll', 'Cecil', 'Charles', 'Dorchester', 'Frederick', 'Harford', 'Howard', 'Kent', 'Montgomery', 'Prince George\'s', 'Queen Anne\'s', 'Somerset', 'St. Mary\'s', 'Talbot', 'Washington', 'Wicomico', 'Worcester'],
  },
  {
    id: 'deer_muzzleloader_late_2026',
    species: 'White-tailed Deer',
    seasonType: 'Muzzleloader (Late)',
    startDate: '2026-12-19',
    endDate: '2027-01-02',
    weaponType: 'Muzzleloader',
    bagLimit: '1 antlered per muzzleloader season; antlerless by region',
    notes:
      'Late muzzleloader segment. Region A antlerless muzzleloader is Dec 26-Jan 2 only. Combined antlered limit for both muzzleloader segments is 1.',
    countyRestrictions: [],
  },
  {
    id: 'deer_junior_2026',
    species: 'White-tailed Deer',
    seasonType: 'Junior Deer Hunt Days',
    startDate: '2026-11-14',
    endDate: '2026-11-15',
    weaponType: 'Rifle or Shotgun',
    bagLimit: 'Region A: 1 antlered or 1 antlerless; Region B: 3 deer, no more than 1 antlered',
    notes:
      'Junior hunters only (Nov 14 statewide; Sunday Nov 15 in counties open per the DNR Sunday deer chart). Junior hunters are exempt from the antler-point restriction.',
    countyRestrictions: [],
  },
  {
    id: 'deer_primitive_2027',
    species: 'White-tailed Deer',
    seasonType: 'Primitive Deer Hunt Days',
    startDate: '2027-02-01',
    endDate: '2027-02-03',
    weaponType: 'Longbow, Recurve, or Flintlock/Sidelock Muzzleloader',
    bagLimit: '2 antlered per year (no more than 1 per weapon season); antlerless by region',
    notes:
      'Primitive weapons only: long bows, recurve bows, or flintlock and sidelock percussion muzzleloading rifles or handguns. Compound bows, crossbows and inline muzzleloaders are NOT legal on these days.',
    countyRestrictions: [],
  },

  // ───── SIKA DEER (statewide where found; Sika Deer Stamp required) ─────
  {
    id: 'sika_archery_2026_1',
    species: 'Sika Deer',
    seasonType: 'Archery',
    startDate: '2026-09-11',
    endDate: '2026-10-21',
    weaponType: 'Bow',
    bagLimit: '3 sika per season, no more than 1 antlered',
    notes:
      'Sika archery segment; same closures as white-tailed archery. Sika Deer Stamp required. Sika may be hunted statewide where found (primarily Dorchester, Wicomico, Somerset, Worcester).',
    countyRestrictions: [],
  },
  {
    id: 'sika_archery_2026_2',
    species: 'Sika Deer',
    seasonType: 'Archery',
    startDate: '2026-10-25',
    endDate: '2026-11-27',
    weaponType: 'Bow',
    bagLimit: '3 sika per season, no more than 1 antlered',
    notes:
      'Sika archery segment; same closures as white-tailed archery. Sika Deer Stamp required. Sika may be hunted statewide where found (primarily Dorchester, Wicomico, Somerset, Worcester).',
    countyRestrictions: [],
  },
  {
    id: 'sika_archery_2026_3',
    species: 'Sika Deer',
    seasonType: 'Archery',
    startDate: '2026-12-14',
    endDate: '2026-12-18',
    weaponType: 'Bow',
    bagLimit: '3 sika per season, no more than 1 antlered',
    notes:
      'Sika archery segment; same closures as white-tailed archery. Sika Deer Stamp required. Sika may be hunted statewide where found (primarily Dorchester, Wicomico, Somerset, Worcester).',
    countyRestrictions: [],
  },
  {
    id: 'sika_archery_2026_4',
    species: 'Sika Deer',
    seasonType: 'Archery',
    startDate: '2027-01-03',
    endDate: '2027-01-07',
    weaponType: 'Bow',
    bagLimit: '3 sika per season, no more than 1 antlered',
    notes:
      'Sika archery segment; same closures as white-tailed archery. Sika Deer Stamp required. Sika may be hunted statewide where found (primarily Dorchester, Wicomico, Somerset, Worcester).',
    countyRestrictions: [],
  },
  {
    id: 'sika_archery_2026_5',
    species: 'Sika Deer',
    seasonType: 'Archery',
    startDate: '2027-01-11',
    endDate: '2027-01-31',
    weaponType: 'Bow',
    bagLimit: '3 sika per season, no more than 1 antlered',
    notes:
      'Sika archery segment; same closures as white-tailed archery. Sika Deer Stamp required. Sika may be hunted statewide where found (primarily Dorchester, Wicomico, Somerset, Worcester).',
    countyRestrictions: [],
  },
  {
    id: 'sika_muzzleloader_early_2026',
    species: 'Sika Deer',
    seasonType: 'Muzzleloader (Early)',
    startDate: '2026-10-22',
    endDate: '2026-10-24',
    weaponType: 'Muzzleloader',
    bagLimit: '3 sika per season, no more than 1 antlered',
    notes:
      'Early muzzleloader segment, statewide. Sika Deer Stamp required.',
    countyRestrictions: [],
  },
  {
    id: 'sika_muzzleloader_2026_regionB_antlerless',
    species: 'Sika Deer',
    seasonType: 'Muzzleloader (Antlerless only, Region B)',
    startDate: '2026-10-26',
    endDate: '2026-10-31',
    weaponType: 'Muzzleloader',
    bagLimit: 'Antlerless only',
    notes:
      'Antlerless-only sika muzzleloader segment in Region B.',
    countyRestrictions: ['Anne Arundel', 'Baltimore', 'Baltimore City', 'Calvert', 'Caroline', 'Carroll', 'Cecil', 'Charles', 'Dorchester', 'Frederick', 'Harford', 'Howard', 'Kent', 'Montgomery', 'Prince George\'s', 'Queen Anne\'s', 'Somerset', 'St. Mary\'s', 'Talbot', 'Washington', 'Wicomico', 'Worcester'],
  },
  {
    id: 'sika_muzzleloader_late_2026',
    species: 'Sika Deer',
    seasonType: 'Muzzleloader (Late)',
    startDate: '2026-12-19',
    endDate: '2027-01-02',
    weaponType: 'Muzzleloader',
    bagLimit: '3 sika per season, no more than 1 antlered',
    notes:
      'Late muzzleloader segment. Sika Deer Stamp required.',
    countyRestrictions: [],
  },
  {
    id: 'sika_firearms_2026',
    species: 'Sika Deer',
    seasonType: 'Firearms (Regular)',
    startDate: '2026-11-28',
    endDate: '2026-12-12',
    weaponType: 'Rifle or Shotgun',
    bagLimit: '3 sika per season, no more than 1 antlered',
    notes:
      'Regular firearms season. Sika Deer Stamp required.',
    countyRestrictions: [],
  },
  {
    id: 'sika_firearms_2027_jan',
    species: 'Sika Deer',
    seasonType: 'Firearms (January)',
    startDate: '2027-01-08',
    endDate: '2027-01-10',
    weaponType: 'Rifle or Shotgun',
    bagLimit: '3 sika per season, no more than 1 antlered',
    notes:
      'January firearms segment. Sika Deer Stamp required.',
    countyRestrictions: [],
  },

  // ───── TURKEY ─────
  {
    id: 'turkey_spring_2027',
    species: 'Wild Turkey',
    seasonType: 'Spring',
    startDate: '2027-04-19',
    endDate: '2027-05-24',
    weaponType: 'Shotgun or Bow',
    bagLimit: '1 bearded turkey per day, 2 per season',
    notes:
      'Statewide. Bearded turkeys only. Shooting hours Apr 19-May 10: one-half hour before sunrise to noon; May 11-24: one-half hour before sunrise to sunset. Shotgun (#4 shot or smaller), crossbow, vertical bow or air gun. Sundays open in certain counties only.',
    countyRestrictions: [],
  },
  {
    id: 'turkey_junior_2027',
    species: 'Wild Turkey',
    seasonType: 'Spring (Junior Hunt Days)',
    startDate: '2027-04-17',
    endDate: '2027-04-18',
    weaponType: 'Shotgun or Bow',
    bagLimit: '1 bearded turkey per day',
    notes:
      'Junior hunters (16 or younger) accompanied by an adult 21+. Saturday Apr 17 statewide; Sunday Apr 18 only in counties open to Sunday turkey hunting.',
    countyRestrictions: [],
  },
  {
    id: 'turkey_fall_2026',
    species: 'Wild Turkey',
    seasonType: 'Fall',
    startDate: '2026-10-31',
    endDate: '2026-11-08',
    weaponType: 'Shotgun, Rifle, or Bow',
    bagLimit: '1 turkey of either sex (fall and winter combined)',
    notes:
      'Fall season is open in Allegany, Garrett and Washington counties ONLY. Legal: air guns, crossbows, handguns, shotguns, rifles or vertical bows. One turkey combined for fall + winter.',
    countyRestrictions: ['Allegany', 'Garrett', 'Washington'],
  },
  {
    id: 'turkey_winter_2027',
    species: 'Wild Turkey',
    seasonType: 'Winter',
    startDate: '2027-01-21',
    endDate: '2027-01-23',
    weaponType: 'Shotgun or Bow',
    bagLimit: '1 turkey of either sex (fall and winter combined)',
    notes:
      'Statewide winter season. Shotgun (#4 shot or smaller), crossbow, vertical bow or air gun. One turkey combined for fall + winter.',
    countyRestrictions: [],
  },

  // ───── WATERFOWL & MIGRATORY BIRDS (MD DNR 2026-2027; federal HIP + stamps required) ─────
  {
    id: 'waterfowl_early_teal_2026',
    species: 'Waterfowl (Teal)',
    seasonType: 'September Teal',
    startDate: '2026-09-17',
    endDate: '2026-09-26',
    weaponType: 'Shotgun',
    bagLimit: '6 per day, 18 in possession',
    notes:
      'Blue-winged and green-winged teal only, in the September Teal Hunt Zone: Calvert, Caroline, Cecil, Dorchester, Harford, Kent, Queen Anne\'s, St. Mary\'s, Somerset, Talbot, Wicomico, Worcester, and ONLY the parts of Anne Arundel east of I-895/I-97/Rt 3, Prince George\'s east of Rt 3/301, and Charles east of Rt 301. HIP registration, MD Migratory Game Bird Stamp and Federal Duck Stamp required.',
    countyRestrictions: ['Calvert', 'Caroline', 'Cecil', 'Dorchester', 'Harford', 'Kent', 'Queen Anne\'s', 'St. Mary\'s', 'Somerset', 'Talbot', 'Wicomico', 'Worcester', 'Anne Arundel', 'Prince George\'s', 'Charles'],
  },
  {
    id: 'waterfowl_duck_east_1_2026',
    species: 'Waterfowl (Ducks)',
    seasonType: 'Regular, Eastern Zone (Split 1)',
    startDate: '2026-10-10',
    endDate: '2026-10-17',
    weaponType: 'Shotgun',
    bagLimit: '6 per day (species sub-limits apply), 18 in possession',
    notes:
      'Eastern Duck Zone: Anne Arundel, Calvert, Caroline, Cecil, Charles, Dorchester, Harford, Kent, Queen Anne\'s, St. Mary\'s, Somerset, Talbot, Wicomico, Worcester, plus ONLY the parts of Baltimore, Howard, Prince George\'s and Montgomery counties east of I-83/I-695/I-95/I-495. Within 6 ducks: 4 mallards (2 hens), 3 wood ducks, 2 black ducks, 2 canvasbacks, 3 pintails, 2 redheads, 1 scaup (2 from Jan 8-30), 1 mottled duck.',
    countyRestrictions: ['Anne Arundel', 'Calvert', 'Caroline', 'Cecil', 'Charles', 'Dorchester', 'Harford', 'Kent', 'Queen Anne\'s', 'St. Mary\'s', 'Somerset', 'Talbot', 'Wicomico', 'Worcester', 'Baltimore', 'Baltimore City', 'Howard', 'Prince George\'s', 'Montgomery'],
  },
  {
    id: 'waterfowl_duck_east_2_2026',
    species: 'Waterfowl (Ducks)',
    seasonType: 'Regular, Eastern Zone (Split 2)',
    startDate: '2026-11-14',
    endDate: '2026-11-27',
    weaponType: 'Shotgun',
    bagLimit: '6 per day (species sub-limits apply), 18 in possession',
    notes:
      'Eastern Duck Zone: Anne Arundel, Calvert, Caroline, Cecil, Charles, Dorchester, Harford, Kent, Queen Anne\'s, St. Mary\'s, Somerset, Talbot, Wicomico, Worcester, plus ONLY the parts of Baltimore, Howard, Prince George\'s and Montgomery counties east of I-83/I-695/I-95/I-495. Within 6 ducks: 4 mallards (2 hens), 3 wood ducks, 2 black ducks, 2 canvasbacks, 3 pintails, 2 redheads, 1 scaup (2 from Jan 8-30), 1 mottled duck. Black duck season opens Nov 14 in the Eastern Zone.',
    countyRestrictions: ['Anne Arundel', 'Calvert', 'Caroline', 'Cecil', 'Charles', 'Dorchester', 'Harford', 'Kent', 'Queen Anne\'s', 'St. Mary\'s', 'Somerset', 'Talbot', 'Wicomico', 'Worcester', 'Baltimore', 'Baltimore City', 'Howard', 'Prince George\'s', 'Montgomery'],
  },
  {
    id: 'waterfowl_duck_west_1_2026',
    species: 'Waterfowl (Ducks)',
    seasonType: 'Regular, Western Zone (Split 1)',
    startDate: '2026-10-03',
    endDate: '2026-10-17',
    weaponType: 'Shotgun',
    bagLimit: '6 per day (species sub-limits apply), 18 in possession',
    notes:
      'Western Duck Zone: Allegany, Carroll, Frederick, Garrett, Washington, plus the parts of Baltimore, Howard, Prince George\'s and Montgomery counties west of I-83/I-695/I-95/I-495. Same species sub-limits as the Eastern Zone. Black ducks are CLOSED during this split.',
    countyRestrictions: ['Allegany', 'Carroll', 'Frederick', 'Garrett', 'Washington', 'Baltimore', 'Howard', 'Prince George\'s', 'Montgomery'],
  },
  {
    id: 'waterfowl_duck_west_2_2026',
    species: 'Waterfowl (Ducks)',
    seasonType: 'Regular, Western Zone (Split 2)',
    startDate: '2026-11-21',
    endDate: '2026-11-27',
    weaponType: 'Shotgun',
    bagLimit: '6 per day (species sub-limits apply), 18 in possession',
    notes:
      'Western Duck Zone: Allegany, Carroll, Frederick, Garrett, Washington, plus the parts of Baltimore, Howard, Prince George\'s and Montgomery counties west of I-83/I-695/I-95/I-495. Same species sub-limits as the Eastern Zone.',
    countyRestrictions: ['Allegany', 'Carroll', 'Frederick', 'Garrett', 'Washington', 'Baltimore', 'Howard', 'Prince George\'s', 'Montgomery'],
  },
  {
    id: 'waterfowl_duck_3_2026',
    species: 'Waterfowl (Ducks)',
    seasonType: 'Regular (Split 3, both zones)',
    startDate: '2026-12-15',
    endDate: '2027-01-30',
    weaponType: 'Shotgun',
    bagLimit: '6 per day (species sub-limits apply), 18 in possession',
    notes:
      'Final duck split, identical in the Eastern and Western zones. Scaup limit rises to 2 per day Jan 8-30. Possession limit is three times the daily bag.',
    countyRestrictions: [],
  },
  {
    id: 'goose_early_resident_east_2026',
    species: 'Waterfowl (Geese)',
    seasonType: 'Early Resident Canada Goose, Eastern Zone',
    startDate: '2026-09-01',
    endDate: '2026-09-15',
    weaponType: 'Shotgun',
    bagLimit: '8 per day, 24 in possession',
    notes:
      'Resident Canada geese. Eastern Hunt Zone: Calvert, Caroline, Cecil, Dorchester, Harford, Kent, Queen Anne\'s, St. Mary\'s, Somerset, Talbot, Wicomico, Worcester, plus ONLY the parts of Anne Arundel east of I-895/I-97/Rt 3, Prince George\'s east of Rt 3/301, and Charles east of Rt 301.',
    countyRestrictions: ['Calvert', 'Caroline', 'Cecil', 'Dorchester', 'Harford', 'Kent', 'Queen Anne\'s', 'St. Mary\'s', 'Somerset', 'Talbot', 'Wicomico', 'Worcester', 'Anne Arundel', 'Prince George\'s', 'Charles'],
  },
  {
    id: 'goose_early_resident_west_2026',
    species: 'Waterfowl (Geese)',
    seasonType: 'Early Resident Canada Goose, Western Zone',
    startDate: '2026-09-01',
    endDate: '2026-09-25',
    weaponType: 'Shotgun',
    bagLimit: '8 per day, 24 in possession',
    notes:
      'Resident Canada geese. Western Hunt Zone: Allegany, Baltimore, Carroll, Frederick, Garrett, Howard, Montgomery, Washington, plus the parts of Anne Arundel, Prince George\'s and Charles counties WEST of the Eastern Zone line.',
    countyRestrictions: ['Allegany', 'Baltimore', 'Baltimore City', 'Carroll', 'Frederick', 'Garrett', 'Howard', 'Montgomery', 'Washington', 'Anne Arundel', 'Prince George\'s', 'Charles'],
  },
  {
    id: 'goose_ap_1_2026',
    species: 'Waterfowl (Geese)',
    seasonType: 'Canada Goose, AP Zone (Split 1)',
    startDate: '2026-11-24',
    endDate: '2026-11-27',
    weaponType: 'Shotgun',
    bagLimit: '2 per day, 6 in possession',
    notes:
      'Atlantic Population (migratory) Canada goose zone: Anne Arundel, Baltimore, Calvert, Caroline, Cecil, Dorchester, Harford, Howard, Kent, Queen Anne\'s, Somerset, St. Mary\'s, Talbot, Wicomico, Worcester, plus Carroll east of Rt 31/97, Prince George\'s east of Rt 3/301 and Charles east of Rt 301.',
    countyRestrictions: ['Anne Arundel', 'Baltimore', 'Baltimore City', 'Calvert', 'Caroline', 'Cecil', 'Dorchester', 'Harford', 'Howard', 'Kent', 'Queen Anne\'s', 'Somerset', 'St. Mary\'s', 'Talbot', 'Wicomico', 'Worcester', 'Carroll', 'Prince George\'s', 'Charles'],
  },
  {
    id: 'goose_ap_2_2026',
    species: 'Waterfowl (Geese)',
    seasonType: 'Canada Goose, AP Zone (Split 2)',
    startDate: '2026-12-15',
    endDate: '2027-01-30',
    weaponType: 'Shotgun',
    bagLimit: '2 per day, 6 in possession',
    notes:
      'Atlantic Population (migratory) Canada goose zone: Anne Arundel, Baltimore, Calvert, Caroline, Cecil, Dorchester, Harford, Howard, Kent, Queen Anne\'s, Somerset, St. Mary\'s, Talbot, Wicomico, Worcester, plus Carroll east of Rt 31/97, Prince George\'s east of Rt 3/301 and Charles east of Rt 301.',
    countyRestrictions: ['Anne Arundel', 'Baltimore', 'Baltimore City', 'Calvert', 'Caroline', 'Cecil', 'Dorchester', 'Harford', 'Howard', 'Kent', 'Queen Anne\'s', 'Somerset', 'St. Mary\'s', 'Talbot', 'Wicomico', 'Worcester', 'Carroll', 'Prince George\'s', 'Charles'],
  },
  {
    id: 'goose_late_west_1_2026',
    species: 'Waterfowl (Geese)',
    seasonType: 'Late Resident Canada Goose, Western MD (Split 1)',
    startDate: '2026-11-21',
    endDate: '2026-11-27',
    weaponType: 'Shotgun',
    bagLimit: '5 per day, 15 in possession',
    notes:
      'Late Resident Western Maryland Canada Goose Zone: Allegany, Frederick, Garrett, Washington, and Carroll west of Rt 31/97.',
    countyRestrictions: ['Allegany', 'Frederick', 'Garrett', 'Washington', 'Carroll'],
  },
  {
    id: 'goose_late_west_2_2026',
    species: 'Waterfowl (Geese)',
    seasonType: 'Late Resident Canada Goose, Western MD (Split 2)',
    startDate: '2026-12-15',
    endDate: '2027-03-10',
    weaponType: 'Shotgun',
    bagLimit: '5 per day, 15 in possession',
    notes:
      'Late Resident Western Maryland Canada Goose Zone: Allegany, Frederick, Garrett, Washington, and Carroll west of Rt 31/97.',
    countyRestrictions: ['Allegany', 'Frederick', 'Garrett', 'Washington', 'Carroll'],
  },
  {
    id: 'goose_late_south_1_2026',
    species: 'Waterfowl (Geese)',
    seasonType: 'Late Resident Canada Goose, Southern MD (Split 1)',
    startDate: '2026-11-21',
    endDate: '2026-11-23',
    weaponType: 'Shotgun',
    bagLimit: '5 per day, 15 in possession',
    notes:
      'Late Resident Southern Maryland Canada Goose Zone: Montgomery County, Prince George\'s west of Rt 3/301, and Charles west of Rt 301.',
    countyRestrictions: ['Montgomery', 'Prince George\'s', 'Charles'],
  },
  {
    id: 'goose_late_south_2_2026',
    species: 'Waterfowl (Geese)',
    seasonType: 'Late Resident Canada Goose, Southern MD (Split 2)',
    startDate: '2026-11-24',
    endDate: '2026-11-27',
    weaponType: 'Shotgun',
    bagLimit: '2 per day, 6 in possession',
    notes:
      'Late Resident Southern Maryland Canada Goose Zone: Montgomery County, Prince George\'s west of Rt 3/301, and Charles west of Rt 301.',
    countyRestrictions: ['Montgomery', 'Prince George\'s', 'Charles'],
  },
  {
    id: 'goose_late_south_3_2026',
    species: 'Waterfowl (Geese)',
    seasonType: 'Late Resident Canada Goose, Southern MD (Split 3)',
    startDate: '2026-12-15',
    endDate: '2027-01-30',
    weaponType: 'Shotgun',
    bagLimit: '2 per day, 6 in possession',
    notes:
      'Late Resident Southern Maryland Canada Goose Zone: Montgomery County, Prince George\'s west of Rt 3/301, and Charles west of Rt 301.',
    countyRestrictions: ['Montgomery', 'Prince George\'s', 'Charles'],
  },
  {
    id: 'goose_late_south_4_2027',
    species: 'Waterfowl (Geese)',
    seasonType: 'Late Resident Canada Goose, Southern MD (Split 4)',
    startDate: '2027-02-01',
    endDate: '2027-03-10',
    weaponType: 'Shotgun',
    bagLimit: '5 per day, 15 in possession',
    notes:
      'Late Resident Southern Maryland Canada Goose Zone: Montgomery County, Prince George\'s west of Rt 3/301, and Charles west of Rt 301.',
    countyRestrictions: ['Montgomery', 'Prince George\'s', 'Charles'],
  },
  {
    id: 'goose_light_1_2026',
    species: 'Waterfowl (Geese)',
    seasonType: 'Light Geese (Snow/Blue/Ross\'s), Split 1',
    startDate: '2026-11-07',
    endDate: '2026-11-27',
    weaponType: 'Shotgun',
    bagLimit: '25 per day, no possession limit',
    notes:
      'Light geese statewide.',
    countyRestrictions: [],
  },
  {
    id: 'goose_light_2_2026',
    species: 'Waterfowl (Geese)',
    seasonType: 'Light Geese (Snow/Blue/Ross\'s), Split 2',
    startDate: '2026-11-30',
    endDate: '2027-02-06',
    weaponType: 'Shotgun',
    bagLimit: '25 per day, no possession limit',
    notes:
      'Light geese statewide.',
    countyRestrictions: [],
  },
  {
    id: 'goose_light_3_2027',
    species: 'Waterfowl (Geese)',
    seasonType: 'Light Geese, Eastern Region extension',
    startDate: '2027-02-08',
    endDate: '2027-03-10',
    weaponType: 'Shotgun',
    bagLimit: '25 per day, no possession limit',
    notes:
      'Light geese, Eastern Region only (AP goose zone counties). The separate Light Goose Conservation Order dates are listed as TBD by DNR.',
    countyRestrictions: ['Anne Arundel', 'Baltimore', 'Baltimore City', 'Calvert', 'Caroline', 'Cecil', 'Dorchester', 'Harford', 'Howard', 'Kent', 'Queen Anne\'s', 'Somerset', 'St. Mary\'s', 'Talbot', 'Wicomico', 'Worcester', 'Carroll', 'Prince George\'s', 'Charles'],
  },
  {
    id: 'brant_2026',
    species: 'Waterfowl (Brant)',
    seasonType: 'Regular',
    startDate: '2026-12-28',
    endDate: '2027-01-30',
    weaponType: 'Shotgun',
    bagLimit: '1 per day, 3 in possession',
    notes:
      'Atlantic brant, statewide.',
    countyRestrictions: [],
  },
  {
    id: 'dove_2026_1',
    species: 'Mourning Dove',
    seasonType: 'Regular (Split 1)',
    startDate: '2026-09-01',
    endDate: '2026-10-17',
    weaponType: 'Shotgun',
    bagLimit: '15 per day, 45 in possession',
    notes:
      'Mourning dove, statewide. HIP registration required.',
    countyRestrictions: [],
  },
  {
    id: 'dove_2026_2',
    species: 'Mourning Dove',
    seasonType: 'Regular (Split 2)',
    startDate: '2026-10-24',
    endDate: '2026-11-27',
    weaponType: 'Shotgun',
    bagLimit: '15 per day, 45 in possession',
    notes:
      'Mourning dove, statewide. HIP registration required.',
    countyRestrictions: [],
  },
  {
    id: 'dove_2026_3',
    species: 'Mourning Dove',
    seasonType: 'Regular (Split 3)',
    startDate: '2026-12-19',
    endDate: '2027-01-09',
    weaponType: 'Shotgun',
    bagLimit: '15 per day, 45 in possession',
    notes:
      'Mourning dove, statewide. HIP registration required.',
    countyRestrictions: [],
  },
  {
    id: 'woodcock_2026_1',
    species: 'Woodcock',
    seasonType: 'Regular (Split 1)',
    startDate: '2026-10-24',
    endDate: '2026-11-27',
    weaponType: 'Shotgun',
    bagLimit: '3 per day, 9 in possession',
    notes:
      'American woodcock, statewide. HIP registration required.',
    countyRestrictions: [],
  },
  {
    id: 'woodcock_2026_2',
    species: 'Woodcock',
    seasonType: 'Regular (Split 2)',
    startDate: '2027-01-11',
    endDate: '2027-01-27',
    weaponType: 'Shotgun',
    bagLimit: '3 per day, 9 in possession',
    notes:
      'American woodcock, statewide. HIP registration required.',
    countyRestrictions: [],
  },

  // ───── SMALL GAME ─────
  {
    id: 'rabbit_season_2026',
    species: 'Rabbit',
    seasonType: 'Regular',
    startDate: '2026-11-07',
    endDate: '2027-02-28',
    weaponType: 'Shotgun or Rifle',
    bagLimit: '4 per day, 8 in possession',
    notes:
      'Eastern cottontail rabbit, all counties. Sunday hunting only in the counties listed on the DNR Sunday small game chart.',
    countyRestrictions: [],
  },
  {
    id: 'squirrel_season_2026',
    species: 'Squirrel',
    seasonType: 'Regular',
    startDate: '2026-09-05',
    endDate: '2027-02-28',
    weaponType: 'Shotgun or Rifle',
    bagLimit: '6 per day, 12 in possession',
    notes:
      'Gray, red and eastern fox squirrel, all counties. Delmarva fox squirrel: closed season (protected).',
    countyRestrictions: [],
  },
  {
    id: 'pheasant_season_2026',
    species: 'Pheasant',
    seasonType: 'Regular',
    startDate: '2026-11-07',
    endDate: '2027-02-28',
    weaponType: 'Shotgun',
    bagLimit: '2 per day (either sex), 4 in possession',
    notes:
      'Ring-necked pheasant, all counties.',
    countyRestrictions: [],
  },
  {
    id: 'grouse_season_2026',
    species: 'Ruffed Grouse',
    seasonType: 'Regular',
    startDate: '2026-10-03',
    endDate: '2026-12-31',
    weaponType: 'Shotgun',
    bagLimit: '2 per day, 4 in possession',
    notes:
      'Ruffed grouse. DNR lists the season for all counties; huntable populations are in western Maryland.',
    countyRestrictions: [],
  },
  {
    id: 'quail_season_2026',
    species: 'Bobwhite Quail',
    seasonType: 'Regular',
    startDate: '2026-11-07',
    endDate: '2027-01-15',
    weaponType: 'Shotgun',
    bagLimit: '6 per day, 12 in possession',
    notes:
      'CLOSED in Allegany and Garrett counties and on DNR-owned/managed lands east of the Susquehanna River. Open on private lands east of the Susquehanna and all lands west of it (except Allegany/Garrett).',
    countyRestrictions: ['Anne Arundel', 'Baltimore', 'Baltimore City', 'Calvert', 'Caroline', 'Carroll', 'Cecil', 'Charles', 'Dorchester', 'Frederick', 'Harford', 'Howard', 'Kent', 'Montgomery', 'Prince George\'s', 'Queen Anne\'s', 'Somerset', 'St. Mary\'s', 'Talbot', 'Washington', 'Wicomico', 'Worcester'],
  },

  // ───── BEAR ─────
  {
    id: 'bear_season_2026',
    species: 'Black Bear',
    seasonType: 'Regular',
    startDate: '2026-10-26',
    endDate: '2026-10-31',
    weaponType: 'Rifle, Shotgun, Handgun, Muzzleloader, Bow, Crossbow, or Air Gun',
    bagLimit: '1 per permittee/sub-permittee team per season',
    notes:
      'Permit-only lottery hunt (application July 15-Aug 31, $15 fee). Zone 1: Allegany, Frederick, Garrett, Washington; Zone 2: Frederick, Washington. Not a quota hunt. Legal weapons per the DNR Guide: rifle, shotgun (28 ga+ solid projectile), handgun, muzzleloader (.40+), vertical bow (30 lb+), crossbow (75 lb+), air gun (.40+).',
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
      'Antlerless — REGION A (Allegany, Garrett, western Washington): up to 2 antlerless deer may be taken during a weapon season, but no more than 2 total for all seasons combined (archery, firearms, muzzleloader). Do not exceed 2.',
    countyRestrictions: ['Allegany', 'Garrett', 'Washington'],
  },
  {
    species: 'White-tailed Deer',
    weaponType: 'Any',
    limitType: 'season',
    quantity: 15,
    timePeriod: 'season',
    notes:
      'Antlerless — REGION B (rest of the state): archery 15 per season, firearms 10 per season, muzzleloader 10 per season. Unlimited antlerless archery in the Suburban Deer Management Zone (Anne Arundel, Baltimore, Howard, Montgomery, Prince George’s).',
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
    quantity: 2,
    timePeriod: 'spring season',
    notes:
      'Spring season: 1 bearded turkey per day, 2 bearded turkeys per season. Bearded birds only in spring.',
  },
  {
    species: 'Wild Turkey',
    weaponType: 'Any',
    limitType: 'season',
    quantity: 1,
    timePeriod: 'fall and winter combined',
    notes:
      'Fall (Allegany, Garrett, Washington only) and winter (statewide) combined: 1 turkey of either sex.',
  },

  // WATERFOWL
  {
    species: 'Ducks',
    weaponType: 'Shotgun',
    limitType: 'daily',
    quantity: 6,
    timePeriod: 'daily',
    notes: 'Regular duck season: 6 per day, no more than 4 mallards (2 hens), 3 wood ducks, 2 black ducks, 2 canvasbacks, 3 pintails, 2 redheads, 1 scaup (2 per day Jan 8-30), 1 fulvous tree duck, 1 mottled duck, 4 sea ducks. Possession 3x daily. Plus 15 coots per day.',
  },
  {
    species: 'Teal (Blue-winged, Green-winged)',
    weaponType: 'Shotgun',
    limitType: 'daily',
    quantity: 6,
    timePeriod: 'daily',
    notes: 'September teal season: 6 per day, 18 in possession.',
  },
  {
    species: 'Canada Goose (Atlantic Population zone)',
    weaponType: 'Shotgun',
    limitType: 'daily',
    quantity: 2,
    timePeriod: 'daily',
    notes: 'Migratory (AP) Canada goose zone — Eastern Shore, Bay counties and eastern Carroll/Prince George’s/Charles: 2 per day, 6 in possession.',
  },
  {
    species: 'Canada Goose (Resident zones)',
    weaponType: 'Shotgun',
    limitType: 'daily',
    quantity: 8,
    timePeriod: 'daily',
    notes: 'Early resident season (Sept): 8 per day, 24 in possession. Late resident Western MD zone: 5 per day. Late resident Southern MD zone: 5 per day Nov 21-23 and Feb 1-Mar 10, otherwise 2 per day.',
  },
  {
    species: 'Light Geese (Snow, Blue, Ross’s)',
    weaponType: 'Shotgun',
    limitType: 'daily',
    quantity: 25,
    timePeriod: 'daily',
    notes: 'Regular light goose season: 25 per day, no possession limit.',
  },
  {
    species: 'Brant',
    weaponType: 'Shotgun',
    limitType: 'daily',
    quantity: 1,
    timePeriod: 'daily',
    notes: 'Atlantic brant: 1 per day, 3 in possession.',
  },
  {
    species: 'Mourning Dove',
    weaponType: 'Shotgun',
    limitType: 'daily',
    quantity: 15,
    timePeriod: 'daily',
    notes: 'Mourning dove: 15 per day, 45 in possession.',
  },
  {
    species: 'Woodcock',
    weaponType: 'Shotgun',
    limitType: 'daily',
    quantity: 3,
    timePeriod: 'daily',
    notes: 'American woodcock: 3 per day, 9 in possession.',
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
    quantity: 2,
    timePeriod: 'daily',
    notes: 'Ruffed grouse. 2 per day, 4 in possession.',
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
    weaponType: 'Rifle, Shotgun, Handgun, Muzzleloader, Bow, Crossbow, or Air Gun',
    limitType: 'season',
    quantity: 1,
    timePeriod: 'season',
    notes:
      'Bear: 1 per permittee/sub-permittee hunting team per season. Lottery-draw permit hunt in Allegany, Frederick, Garrett, and Washington counties.',
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
    description: 'All waterfowl hunters 16+ must purchase a Federal Migratory Bird Hunting and Conservation Stamp ($29 through MD DNR; $27 at U.S. Post Offices and duckstamp.com). Available at post offices, online, or through the USFWS E-Stamp program. Must be signed across the face.',
    requirement: 'required',
  },
  {
    id: 'wf_reg_md_stamp',
    category: 'Licensing',
    title: 'Maryland Migratory Game Bird Stamp',
    description: 'Required for hunting ducks, geese, and other migratory birds in Maryland ($15). Available through Maryland DNR licensing system. Separate from the federal duck stamp.',
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
    description: 'Within the 6-duck daily limit: Mallard (4, only 2 hens), Wood Duck (3), Black Duck (2, black duck season only), Canvasback (2), Pintail (3), Redhead (2), Scaup (1; 2 per day Jan 8-30), Fulvous Tree Duck (1), Mottled Duck (1), Sea Ducks (4; no more than 3 scoters, 3 long-tailed ducks or 3 eiders with only 1 hen eider). No open season for harlequin ducks. Possession limit is 3x daily bag. Coots: 15 per day in addition.',
    requirement: 'required',
  },
  {
    id: 'wf_reg_goose_species',
    category: 'Bag Limits',
    title: 'Goose Species Limits',
    description: 'Canada Goose: 2 per day in the Atlantic Population (migratory) zone; 8 per day in the September resident season; 5 per day in the late resident Western MD zone (2 or 5 by date in the Southern MD zone). Light Geese (snow/blue/Ross’s): 25 per day, no possession limit; the separate Light Goose Conservation Order dates are TBD per DNR. Brant: 1 per day.',
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
    event: 'September Teal Season',
    dateRange: 'September 17 - September 26, 2026',
    description: 'September teal season (September Teal Hunt Zone only). Daily draws at applicable WMAs. Blue-winged and green-winged teal only, 6 per day.',
    url: 'https://dnr.maryland.gov/wildlife/Pages/hunt_trap/waterfowl.aspx',
  },
  {
    id: 'draw_regular_open',
    event: 'Regular Waterfowl Season Opens',
    dateRange: 'October 3 (Western Zone) / October 10 (Eastern Zone), 2026',
    description: 'Regular duck season opens (Western Zone Oct 3-17; Eastern Zone Oct 10-17). AP Canada goose opens Nov 24. Daily draws resume at WMA check stations. Arrive 1 hour before legal shooting time.',
    url: 'https://dnr.maryland.gov/wildlife/Pages/hunt_trap/waterfowl.aspx',
  },
  {
    id: 'draw_late_goose',
    event: 'Late Canada Goose Season',
    dateRange: 'Through March 10, 2027 (late resident zones)',
    description: 'Late resident Canada goose season in the Western MD zone (5 per day) and Southern MD zone (2-5 per day by date) runs through Mar 10, 2027. The AP (Eastern Shore) zone closes Jan 30, 2027.',
    url: 'https://dnr.maryland.gov/wildlife/Pages/hunt_trap/waterfowl.aspx',
  },
  {
    id: 'draw_snow_goose',
    event: 'Light Goose Seasons',
    dateRange: 'Nov 7 - Nov 27 and Nov 30, 2026 - Feb 6, 2027 (Eastern Region to Mar 10)',
    description: 'Regular light goose (snow/blue/Ross’s) season: 25 per day, no possession limit. The separate Light Goose Conservation Order dates are listed as TBD on the DNR 2026-27 calendar — check DNR before hunting under conservation-order rules.',
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
