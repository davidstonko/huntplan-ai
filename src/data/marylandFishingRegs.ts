/**
 * @file data/marylandFishingRegs.ts
 * @description Structured Maryland fishing regulations — species-specific limits, seasons, license types.
 * Sources: eRegulations.com/maryland/fishing, MD DNR Fisheries, news.maryland.gov/dnr
 * Last updated: 2026-04-04
 */

/**
 * Fishing regulation for a single species
 */
export interface FishingRegulation {
  /** Common species name */
  species: string;
  /** Water type: tidal (Chesapeake Bay, coastal tributaries), nontidal (freshwater), or both */
  waterType: 'tidal' | 'nontidal' | 'both';
  /** Season description (e.g., "Year-round", "May 1 - Dec 31") */
  season: string;
  /** Daily creel/catch limit per angler (e.g., "5/day", "No limit") */
  dailyCreel: string;
  /** Possession limit (e.g., "10 total", same as dailyCreel if not specified) */
  possessionLimit?: string;
  /** Minimum size in inches (e.g., "12\"") */
  minSize?: string;
  /** Maximum size in inches for slot limits (e.g., "24\"" for slot 19-24") */
  maxSize?: string;
  /** Gear/method restrictions */
  gearRestrictions?: string;
  /** Special notes or region-specific rules */
  specialNotes?: string;
}

/**
 * Fishing license type and fee
 */
export interface FishingLicense {
  /** License name */
  name: string;
  /** Resident, Nonresident, or Special (senior/veteran/youth) */
  type: 'resident' | 'nonresident' | 'special';
  /** Annual fee (2026) */
  fee: string;
  /** Validity period */
  validity: string;
  /** License notes */
  notes: string;
}

/**
 * Maryland freshwater (nontidal) and tidal fishing regulations.
 * Includes all major species in both waters.
 * Source: eRegulations.com/maryland/fishing, MD DNR
 */
export const MD_FISHING_REGULATIONS: FishingRegulation[] = [
  // TIDAL SPECIES (Chesapeake Bay, coastal waters, tidal tributaries)

  {
    species: 'Striped Bass',
    waterType: 'tidal',
    season: 'Year-round (C&R April, harvest May 1+, closed Aug)',
    dailyCreel: '1/day',
    minSize: '19"',
    maxSize: '24"',
    gearRestrictions: 'Trolling: 6 rod max, barbless hooks, no stinger hooks',
    specialNotes:
      'Slot: 19-24 inches. C&R only April 1-30. Spawning river closures March 1 - May 31 (Choptank, Chester, Manokin, Nanticoke, Patuxent, Transquaking, Wicomico, Upper Bay spawning area). August closed. Gear rules apply through May 15.',
  },

  {
    species: 'Yellow Perch',
    waterType: 'tidal',
    season: 'Year-round',
    dailyCreel: '5/day',
    specialNotes: 'All tidal waters and nontidal rivers/streams',
  },

  {
    species: 'Bluefish',
    waterType: 'tidal',
    season: 'Year-round',
    dailyCreel: '10/angler',
    minSize: '8"',
    specialNotes: 'Includes snappers (sub-adult blues)',
  },

  {
    species: 'Summer Flounder',
    waterType: 'tidal',
    season: 'Year-round',
    dailyCreel: '4/angler',
    minSize: '16"',
    maxSize: '17.5"',
    specialNotes: 'Jan 1 - May 31: 16" min. Jun 1 - Dec 31: 17.5" min',
  },

  {
    species: 'Spotted Seatrout',
    waterType: 'tidal',
    season: 'Year-round',
    dailyCreel: 'No limit',
    minSize: '12"',
    specialNotes: 'Also called Speckled Trout. No creel limit.',
  },

  {
    species: 'Croaker',
    waterType: 'tidal',
    season: 'Year-round',
    dailyCreel: '25/angler',
    minSize: '9"',
    specialNotes: 'Atlantic Croaker',
  },

  {
    species: 'Black Drum',
    waterType: 'tidal',
    season: 'Year-round',
    dailyCreel: '3/angler',
    minSize: '16"',
  },

  {
    species: 'Weakfish',
    waterType: 'tidal',
    season: 'Year-round',
    dailyCreel: '1/angler',
    minSize: '13"',
    specialNotes: 'Also called Gray Trout',
  },

  {
    species: 'Red Drum',
    waterType: 'tidal',
    season: 'Year-round',
    dailyCreel: '1/day',
    minSize: '18"',
    maxSize: '27"',
    specialNotes: 'Slot: 18-27 inches. Proposed Sept 1, 2026: 3/day, 18-26" slot',
  },

  // NONTIDAL SPECIES (Freshwater streams, lakes, rivers)

  {
    species: 'Trout (Rainbow/Brown)',
    waterType: 'nontidal',
    season: 'Put-and-Take: March 1 - October 31 (stocked areas); Catch-and-Return: year-round',
    dailyCreel: '5/day',
    possessionLimit: '10',
    specialNotes:
      'Put-and-Take areas: 5 combined daily, 10 possession. No min size. Barbed hooks prohibited. Brook trout: C&R only (must release immediately). Catch-and-Return areas vary by stream (e.g., Owens Creek C&R Jun 1 - Feb 28).',
  },

  {
    species: 'Largemouth Bass',
    waterType: 'nontidal',
    season: 'Year-round (closed during spring spawning in some areas)',
    dailyCreel: '5/day',
    minSize: '12"',
    specialNotes: 'Open Mar 1 - Jun 15 seasonally. Catch-and-release encouraged during spawning.',
  },

  {
    species: 'Smallmouth Bass',
    waterType: 'nontidal',
    season: 'Year-round',
    dailyCreel: '5/day',
    minSize: '12"',
    specialNotes: 'Same regulations as Largemouth Bass',
  },

  {
    species: 'Yellow Perch',
    waterType: 'nontidal',
    season: 'Year-round',
    dailyCreel: '5/day',
    specialNotes: 'Freshwater limit same as tidal',
  },

  {
    species: 'Black Crappie',
    waterType: 'nontidal',
    season: 'Year-round',
    dailyCreel: '15/day',
    possessionLimit: '30',
  },

  {
    species: 'White Crappie',
    waterType: 'nontidal',
    season: 'Year-round',
    dailyCreel: '15/day',
    possessionLimit: '30',
    specialNotes: 'Combined with Black Crappie: 15/day, 30 possession',
  },

  {
    species: 'Bluegill',
    waterType: 'nontidal',
    season: 'Year-round',
    dailyCreel: '15/day',
    possessionLimit: '30',
    specialNotes: 'Includes Pumpkinseed, Longear, Redbreast, Redear, Green Sunfish. Combined sunfish limit.',
  },

  {
    species: 'Rock Bass',
    waterType: 'nontidal',
    season: 'Year-round',
    dailyCreel: '15/day',
    possessionLimit: '30',
    specialNotes: 'Same limit as sunfish',
  },

  {
    species: 'Channel Catfish',
    waterType: 'nontidal',
    season: 'Year-round',
    dailyCreel: '5/day',
    possessionLimit: '10',
    specialNotes: 'No min size. Yellow/Brown Bullhead: no season, no min size.',
  },

  {
    species: 'Walleye',
    waterType: 'nontidal',
    season: 'Year-round',
    dailyCreel: '5/day',
    minSize: '15"',
    specialNotes: 'Found in select reservoirs and large rivers',
  },

  {
    species: 'Northern Pike',
    waterType: 'nontidal',
    season: 'Year-round',
    dailyCreel: '3/day',
    minSize: '20"',
    specialNotes: 'Limited availability in select waters',
  },

  {
    species: 'Carp',
    waterType: 'nontidal',
    season: 'Year-round',
    dailyCreel: 'No limit',
    specialNotes: 'No size restriction, no closed season',
  },

  {
    species: 'Common Carp',
    waterType: 'both',
    season: 'Year-round',
    dailyCreel: 'No limit',
    specialNotes: 'Often considered invasive species, encouraged for removal',
  },
];

/**
 * Maryland fishing license types and 2026 fees.
 * Source: eRegulations.com/maryland/fishing/licenses-fees, MD DNR
 */
export const MD_FISHING_LICENSES: FishingLicense[] = [
  {
    name: 'Resident Nontidal (Freshwater)',
    type: 'resident',
    fee: '$32.00',
    validity: '365 days from purchase',
    notes: 'Fish freshwater streams, lakes, rivers (nontidal waters)',
  },

  {
    name: 'Resident Trout Stamp',
    type: 'resident',
    fee: '$20.00',
    validity: '365 days from purchase',
    notes: 'Required in addition to Nontidal license to fish put-and-take trout areas',
  },

  {
    name: 'Resident Chesapeake Bay & Coastal',
    type: 'resident',
    fee: '$15.00',
    validity: '365 days from purchase',
    notes: 'Fish tidal Chesapeake Bay and coastal waters',
  },

  {
    name: 'Resident Combined (Nontidal + Bay)',
    type: 'resident',
    fee: '$47.00',
    validity: '365 days from purchase',
    notes: 'Access all nontidal and tidal waters. Does not include Trout Stamp.',
  },

  {
    name: 'Senior Resident (65+)',
    type: 'special',
    fee: '$5.00',
    validity: '365 days from purchase',
    notes: 'Residents 65 or older. Covers nontidal and Bay/coastal waters.',
  },

  {
    name: 'Youth (Under 16)',
    type: 'special',
    fee: 'Free',
    validity: '365 days from purchase',
    notes: 'Free for all residents under 16. Must be supervised by adult.',
  },

  {
    name: 'Nonresident Nontidal (Freshwater)',
    type: 'nonresident',
    fee: 'Check current (varies by reciprocity agreements)',
    validity: '365 days from purchase',
    notes: 'Nonresidents fishing freshwater. Varies by state residency.',
  },

  {
    name: 'Nonresident Bay & Coastal',
    type: 'nonresident',
    fee: 'Check current (varies by reciprocity)',
    validity: '365 days from purchase',
    notes: 'Nonresidents fishing tidal Chesapeake Bay and coastal waters',
  },

  {
    name: 'Nonresident 3-Day Tourist',
    type: 'nonresident',
    fee: 'Check current rate',
    validity: '3 consecutive calendar days',
    notes: 'Short-term option for visiting tourists. Nontidal or Bay/Coastal varies.',
  },

  {
    name: 'Purple Heart Veteran',
    type: 'special',
    fee: '50% discount on any license',
    validity: '365 days from purchase',
    notes: 'Maryland veterans with Purple Heart receive 50% off any fishing license type',
  },
];

/**
 * Maryland free fishing days for 2026.
 * No license required to fish on these dates, but all regulations still apply.
 * Source: dnr.maryland.gov/fisheries/pages/free-fishing.aspx
 */
export const MD_FREE_FISHING_DAYS_2026 = [
  'June 6',
  'June 13',
  'July 4',
];

/**
 * Check if a species can be legally fished on a given date.
 * Returns allowed status and reason.
 *
 * @param species - Species name (case-insensitive)
 * @param date - Date to check
 * @param waterType - 'tidal' or 'nontidal' (default: 'nontidal')
 * @returns Object with allowed boolean and explanation
 */
export function canIFish(
  species: string,
  date: Date,
  waterType: 'tidal' | 'nontidal' = 'nontidal'
): { allowed: boolean; reason: string } {
  const speciesLower = species.toLowerCase();
  const month = date.getMonth() + 1; // 1-12
  const day = date.getDate();

  // Find the regulation for this species
  const regulation = MD_FISHING_REGULATIONS.find(
    (reg) =>
      reg.species.toLowerCase() === speciesLower &&
      (reg.waterType === waterType || reg.waterType === 'both')
  );

  if (!regulation) {
    return {
      allowed: false,
      reason: `No regulations found for ${species} in ${waterType} waters. Check MD DNR website.`,
    };
  }

  // Check season
  if (regulation.season === 'Year-round') {
    return {
      allowed: true,
      reason: `${species}: Year-round season. Daily limit: ${regulation.dailyCreel}${regulation.minSize ? `, ${regulation.minSize} min size` : ''}`,
    };
  }

  // Parse season string for specific months
  if (
    regulation.species === 'Striped Bass' &&
    waterType === 'tidal' &&
    month === 8
  ) {
    return {
      allowed: false,
      reason: `Striped Bass: Closed in August (warm water temperature protection)`,
    };
  }

  if (
    regulation.species === 'Trout (Rainbow/Brown)' &&
    month >= 3 &&
    month <= 10
  ) {
    return {
      allowed: true,
      reason: `Trout: Put-and-Take season (Mar 1 - Oct 31). Daily limit: ${regulation.dailyCreel}`,
    };
  }

  if (
    regulation.species === 'Largemouth Bass' &&
    month >= 3 &&
    month <= 6
  ) {
    return {
      allowed: true,
      reason: `Largemouth Bass: Season open (Mar 1 - Jun 15). Daily limit: ${regulation.dailyCreel}`,
    };
  }

  // Default allowed
  return {
    allowed: true,
    reason: `${regulation.species}: ${regulation.season}. Daily limit: ${regulation.dailyCreel}${regulation.minSize ? `, ${regulation.minSize} min` : ''}`,
  };
}

/**
 * Get license recommendation for a user.
 *
 * @param isResident - Is the angler a Maryland resident?
 * @param wantsNontidal - Fish freshwater?
 * @param wantsTidal - Fish tidal/Bay waters?
 * @returns Array of recommended licenses
 */
export function recommendLicenses(
  isResident: boolean,
  wantsNontidal: boolean,
  wantsTidal: boolean
): FishingLicense[] {
  const recommendations: FishingLicense[] = [];

  if (!isResident) {
    if (wantsNontidal) {
      recommendations.push(
        MD_FISHING_LICENSES.find((l) => l.name === 'Nonresident Nontidal (Freshwater)')!
      );
    }
    if (wantsTidal) {
      recommendations.push(
        MD_FISHING_LICENSES.find((l) => l.name === 'Nonresident Bay & Coastal')!
      );
    }
    return recommendations;
  }

  // Resident recommendations
  if (wantsNontidal && wantsTidal) {
    recommendations.push(
      MD_FISHING_LICENSES.find((l) => l.name === 'Resident Combined (Nontidal + Bay)')!
    );
  } else if (wantsNontidal) {
    recommendations.push(
      MD_FISHING_LICENSES.find((l) => l.name === 'Resident Nontidal (Freshwater)')!
    );
  } else if (wantsTidal) {
    recommendations.push(
      MD_FISHING_LICENSES.find((l) => l.name === 'Resident Chesapeake Bay & Coastal')!
    );
  }

  // Add trout stamp if nontidal fishing
  if (wantsNontidal) {
    recommendations.push(
      MD_FISHING_LICENSES.find((l) => l.name === 'Resident Trout Stamp')!
    );
  }

  return recommendations;
}

/**
 * Check if today is a free fishing day.
 *
 * @param date - Date to check (default: today)
 * @returns Object with isFreeDay and reason
 */
export function checkFreeFishingDay(date: Date = new Date()): {
  isFreeDay: boolean;
  reason: string;
} {
  const month = date.getMonth() + 1;
  const day = date.getDate();
  const dateStr = `${month === 6 ? 'June' : 'July'} ${day}`;

  const isFreeDay = MD_FREE_FISHING_DAYS_2026.includes(dateStr);

  if (isFreeDay) {
    return {
      isFreeDay: true,
      reason: `Free Fishing Day! No license required on ${dateStr}. All other regulations apply.`,
    };
  }

  return {
    isFreeDay: false,
    reason: `License required to fish. Next free fishing day: ${MD_FREE_FISHING_DAYS_2026[0]}`,
  };
}
