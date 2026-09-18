/**
 * offlineHuntPlanService - builds a hunt plan from bundled Maryland data
 * when the backend AI planner is unreachable (cold Render dyno, airplane
 * mode, App Review with no data).
 *
 * The output is plain text shaped like the backend's plan so HuntPlanScreen
 * can render it in the same card, labeled "Offline plan". Everything here
 * comes from src/data/marylandHuntingData.ts and marylandPublicLands.ts;
 * no network access.
 */

import {
  MD_COUNTIES,
  MD_SEASONS,
  MD_WMAS,
  getBagLimitInfo,
  getCurrentRutPhase,
  getWMAsByCounty,
  isInSeason,
  type HuntingSeason,
} from '../data/marylandHuntingData';
import { marylandPublicLands } from '../data/marylandPublicLands';
import { getSmartResponse } from '../data/chatKnowledge';

export interface OfflineHuntPlanInput {
  /** Picker value: deer | turkey | waterfowl | bear | small_game */
  species: string;
  /** Picker value: archery | firearms | muzzleloader */
  weapon: string;
  /** YYYY-MM-DD */
  huntDate: string;
  county?: string;
  landName?: string;
}

export interface OfflineHuntPlan {
  plan: string;
  sources: string[];
  /** True when at least one matching season covers the date. */
  inSeason: boolean;
}

/** Picker value -> species names used in MD_SEASONS / MD_BAG_LIMITS. */
const SPECIES_NAMES: Record<string, string[]> = {
  deer: ['White-tailed Deer'],
  turkey: ['Wild Turkey'],
  waterfowl: ['Waterfowl (Ducks)', 'Waterfowl (Geese)', 'Waterfowl (Teal)', 'Ducks', 'Geese (Canada, Snow)', 'Teal (Blue-winged, Green-winged)'],
  bear: ['Black Bear'],
  small_game: ['Rabbit', 'Squirrel', 'Pheasant', 'Ruffed Grouse', 'Eastern Cottontail Rabbit', 'Gray Squirrel', 'Ring-necked Pheasant'],
};

const SPECIES_LABEL: Record<string, string> = {
  deer: 'Deer',
  turkey: 'Turkey',
  waterfowl: 'Waterfowl',
  bear: 'Black bear',
  small_game: 'Small game',
};

/** Picker value -> weaponType substrings used in MD_SEASONS. */
const WEAPON_MATCH: Record<string, string[]> = {
  archery: ['bow'],
  firearms: ['rifle', 'shotgun'],
  muzzleloader: ['muzzleloader'],
};

const WEAPON_LABEL: Record<string, string> = {
  archery: 'Archery',
  firearms: 'Firearms',
  muzzleloader: 'Muzzleloader',
};

/** Public-land allowedWeapons vocabulary. */
const LAND_WEAPON: Record<string, string> = {
  archery: 'Archery',
  firearms: 'Firearms',
  muzzleloader: 'Muzzleloader',
};

/** Public-land huntableSpecies vocabulary. */
const LAND_SPECIES: Record<string, string[]> = {
  deer: ['Deer'],
  turkey: ['Turkey'],
  waterfowl: ['Waterfowl'],
  bear: ['Bear'],
  small_game: ['Small Game', 'Squirrel', 'Rabbit', 'Pheasant', 'Grouse'],
};

/** Counties where deer firearms hunting is restricted to shotgun (no rifle). */
const SHOTGUN_ONLY_COUNTIES = [
  'Anne Arundel',
  'Baltimore',
  'Baltimore City',
  'Howard',
  'Montgomery',
  'Prince Georges',
];

function parseDate(iso: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return null;
  const d = new Date(`${iso}T12:00:00Z`);
  return Number.isNaN(d.getTime()) ? null : d;
}

function formatDate(iso: string): string {
  const d = parseDate(iso);
  if (!d) return iso;
  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC',
  });
}

function normalizeCounty(c: string): string {
  return c.toLowerCase().replace(/[^a-z]/g, '');
}

function seasonsFor(species: string, weapon: string): HuntingSeason[] {
  const names = (SPECIES_NAMES[species] ?? []).map((n) => n.toLowerCase());
  const weaponTerms = WEAPON_MATCH[weapon] ?? [];
  return MD_SEASONS.filter((s) => {
    const speciesOk = names.includes(s.species.toLowerCase());
    const weaponOk =
      weaponTerms.length === 0 ||
      weaponTerms.some((t) => s.weaponType.toLowerCase().includes(t));
    return speciesOk && weaponOk;
  });
}

function seasonCoversDate(s: HuntingSeason, iso: string, county?: string): boolean {
  const dateOk = s.startDate <= iso && iso <= s.endDate;
  const restricted = s.countyRestrictions ?? [];
  const countyOk =
    !county ||
    restricted.length === 0 ||
    restricted.some((c) => normalizeCounty(c) === normalizeCounty(county));
  return dateOk && countyOk;
}

/**
 * The chat handlers answer in light markdown for the chat bubble. The plan
 * card renders plain text, so bold/italic markers become plain words,
 * bullets become dashes, and the "Today (date)" block, which is computed
 * for the current day rather than the hunt date, is dropped.
 */
export function stripChatMarkdown(text: string): string {
  const paragraphs = text.split(/\n\s*\n/);
  const kept = paragraphs.filter((p) => !/^\*{0,2}Today \(/.test(p.trim()));
  return kept
    .join('\n\n')
    .replace(/\*\*/g, '')
    .replace(/^_(.*)_$/gm, '$1')
    .replace(/^\s*[•●]\s*/gm, '- ')
    .replace(/[ \t]+\n/g, '\n')
    .trim();
}

/** Legal-detail snippets pulled from the chat knowledge base handlers. */
function knowledgeSnippet(query: string): { text: string; citations: string[] } {
  try {
    const res = getSmartResponse(query);
    // Keep the answer body only; drop trailing gear/pros footers that the
    // chat augmenters append after a blank line.
    const body = res.text.split(/\n\s*\n(?=(?:Gear|Local|Nearby|Shop))/i)[0].trim();
    return { text: stripChatMarkdown(body), citations: res.citations ?? [] };
  } catch {
    return { text: '', citations: [] };
  }
}

/**
 * Build a plan from bundled data. Never throws; always returns a usable
 * plan string even for unknown species or bad dates.
 */
export function buildOfflineHuntPlan(input: OfflineHuntPlanInput): OfflineHuntPlan {
  const species = (input.species || 'deer').toLowerCase();
  const weapon = (input.weapon || 'archery').toLowerCase();
  const county = (input.county || '').trim();
  const landName = (input.landName || '').trim();
  const huntDate = input.huntDate;
  const date = parseDate(huntDate);

  const speciesLabel = SPECIES_LABEL[species] ?? species;
  const weaponLabel = WEAPON_LABEL[weapon] ?? weapon;
  const sources = new Set<string>(['MD DNR Hunting Seasons Calendar', 'MD DNR Guide to Hunting and Trapping']);
  const lines: string[] = [];

  // ── Overview ──
  lines.push(`${speciesLabel} hunt, ${weaponLabel.toLowerCase()}${county ? `, ${county} County` : ', Maryland'}`);
  lines.push(`Planned date: ${date ? formatDate(huntDate) : huntDate || 'not set'}`);
  lines.push('');

  // ── Season status ──
  const matching = seasonsFor(species, weapon);
  let inSeason = false;
  lines.push('SEASON STATUS');
  if (!date) {
    lines.push('Enter the date as YYYY-MM-DD to check season dates.');
  } else if (matching.length === 0) {
    lines.push(`No ${weaponLabel.toLowerCase()} season for ${speciesLabel.toLowerCase()} is listed in the bundled Maryland data. Check the DNR calendar for the current season.`);
  } else {
    const open = matching.filter((s) => seasonCoversDate(s, huntDate, county || undefined));
    inSeason = open.length > 0;
    if (inSeason) {
      for (const s of open) {
        lines.push(`OPEN: ${s.species} ${s.seasonType} (${formatDate(s.startDate)} to ${formatDate(s.endDate)})${s.bagLimit ? `. Bag limit ${s.bagLimit}.` : ''}`);
      }
    } else {
      lines.push(`No ${speciesLabel.toLowerCase()} ${weaponLabel.toLowerCase()} season is open on ${formatDate(huntDate)}${county ? ` in ${county} County` : ''}.`);
      const upcoming = matching
        .filter((s) => s.startDate > huntDate)
        .sort((a, b) => a.startDate.localeCompare(b.startDate));
      if (upcoming.length > 0) {
        const n = upcoming[0];
        lines.push(`Next: ${n.species} ${n.seasonType} opens ${formatDate(n.startDate)} and runs through ${formatDate(n.endDate)}.`);
      } else {
        lines.push('Listed seasons for this combination have ended for the year.');
      }
    }
    // Any species-specific restriction notes worth surfacing.
    const restricted = matching.find((s) => (s.countyRestrictions ?? []).length > 0);
    if (restricted) {
      lines.push(`Note: ${restricted.species} ${restricted.seasonType} is limited to ${restricted.countyRestrictions!.join(', ')}.`);
    }
    // Deer sanity check: isInSeason from the data module agrees.
    if (species === 'deer' && date) {
      const term = WEAPON_MATCH[weapon]?.[0] ?? weapon;
      const check = isInSeason('White-tailed Deer', date, term, county || undefined);
      if (check !== inSeason && check) inSeason = true;
    }
  }
  lines.push('');

  // ── Bag limits ──
  const bagRules = (SPECIES_NAMES[species] ?? []).flatMap((n) => getBagLimitInfo(n));
  if (bagRules.length > 0) {
    lines.push('BAG LIMITS');
    const seen = new Set<string>();
    for (const r of bagRules) {
      const key = `${r.species}|${r.notes}`;
      if (seen.has(key)) continue;
      seen.add(key);
      const scope =
        r.countyRestrictions && r.countyRestrictions.length > 0
          ? ` (${r.countyRestrictions.join(', ')})`
          : '';
      lines.push(`${r.species}${scope}: ${r.quantity} per ${r.timePeriod}. ${r.notes}`);
    }
    lines.push('');
  }

  // ── County ──
  if (county) {
    const info = MD_COUNTIES.find((c) => normalizeCounty(c.name) === normalizeCounty(county));
    lines.push(`${county.toUpperCase()} COUNTY`);
    if (info) {
      lines.push(`Deer management: ${info.deerManagementRegion}.`);
      lines.push(
        info.sundayHuntingAllowed
          ? 'Sunday hunting: allowed on designated dates only. Check the DNR Sunday hunting calendar for this county.'
          : 'Sunday hunting: not allowed in this county.',
      );
      if (species === 'deer') lines.push(`Antler rule: ${info.antlerRestrictions}`);
      if (info.notes) lines.push(info.notes);
    } else {
      lines.push('County details are not in the bundled data. Verify local rules with MD DNR.');
    }
    if (
      species === 'deer' &&
      weapon === 'firearms' &&
      SHOTGUN_ONLY_COUNTIES.some((c) => normalizeCounty(c) === normalizeCounty(county))
    ) {
      lines.push('Shotgun-only zone: rifles are not legal for deer here. Use a shotgun with slugs, a muzzleloader, or archery gear as the season allows.');
    }
    lines.push('');
  }

  // ── Where to hunt ──
  lines.push('WHERE TO HUNT');
  const wantSpecies = LAND_SPECIES[species] ?? [];
  const wantWeapon = LAND_WEAPON[weapon];
  let landLines: string[] = [];
  if (landName) {
    const q = landName.toLowerCase();
    const land = marylandPublicLands.find((l) => l.name.toLowerCase().includes(q));
    if (land) {
      const speciesOk = wantSpecies.length === 0 || land.huntableSpecies.some((s) => wantSpecies.includes(s));
      const weaponOk = !wantWeapon || land.allowedWeapons.length === 0 || land.allowedWeapons.includes(wantWeapon);
      landLines.push(`${land.name} (${land.designationFull}, ${land.county} County${land.acres ? `, ${land.acres.toLocaleString()} acres` : ''}).`);
      landLines.push(`${speciesLabel}: ${speciesOk ? 'listed as huntable' : 'not listed as huntable here'}. ${weaponLabel}: ${weaponOk ? 'allowed' : 'not listed as allowed'}.`);
      if (land.freePermitRequired) landLines.push('A free DNR public-land hunting permit is required.');
      if (land.reservationRequired) landLines.push(`Reservation required. ${land.reservationInfo ?? ''}`.trim());
      landLines.push(`Sunday hunting: ${land.sundayHunting ? 'permitted on designated dates' : 'not permitted'}.`);
      if (land.contact) landLines.push(`Contact: ${land.contact}.`);
      if (land.parking && land.parking.length > 0) {
        landLines.push(`Parking: ${land.parking.length} mapped lot${land.parking.length === 1 ? '' : 's'}. Open the land on the Map tab for directions.`);
      }
      sources.add('MD DNR Public Hunting Lands');
    } else {
      landLines.push(`"${landName}" is not in the bundled public-land list. Search for it on the Map tab or verify the name with DNR.`);
    }
  }
  if (landLines.length === 0 && county) {
    const wmas = getWMAsByCounty(county).filter((w) =>
      wantSpecies.length === 0 || w.allowedSpecies.some((s) => wantSpecies.some((ws) => s.toLowerCase().includes(ws.toLowerCase()))),
    );
    const lands = marylandPublicLands
      .filter((l) => normalizeCounty(l.county) === normalizeCounty(county))
      .filter((l) => wantSpecies.length === 0 || l.huntableSpecies.some((s) => wantSpecies.includes(s)))
      .filter((l) => !wantWeapon || l.allowedWeapons.length === 0 || l.allowedWeapons.includes(wantWeapon))
      .filter((l) => !wmas.some((w) => w.name.toLowerCase() === l.name.toLowerCase()))
      .sort((a, b) => (b.acres ?? 0) - (a.acres ?? 0))
      .slice(0, 5);
    for (const w of wmas) {
      landLines.push(`${w.name} (${w.acres.toLocaleString()} acres). ${w.notes}${w.sundayHunting ? ' Sunday hunting on designated dates.' : ''}`);
    }
    for (const l of lands) {
      landLines.push(`${l.name} (${l.designationFull}${l.acres ? `, ${l.acres.toLocaleString()} acres` : ''}).${l.freePermitRequired ? ' Free DNR permit required.' : ''}`);
    }
    if (landLines.length === 0) {
      landLines.push(`No bundled public land in ${county} County lists ${speciesLabel.toLowerCase()} for ${weaponLabel.toLowerCase()}. Try a neighboring county on the Map tab.`);
    }
    sources.add('MD DNR Public Hunting Lands');
  }
  if (landLines.length === 0) {
    const top = MD_WMAS.filter((w) =>
      wantSpecies.length === 0 || w.allowedSpecies.some((s) => wantSpecies.some((ws) => s.toLowerCase().includes(ws.toLowerCase()))),
    )
      .sort((a, b) => b.acres - a.acres)
      .slice(0, 5);
    landLines.push('Pick a county for local suggestions. Largest statewide options:');
    for (const w of top) landLines.push(`${w.name}, ${w.county} County (${w.acres.toLocaleString()} acres).`);
    sources.add('MD DNR Public Hunting Lands');
  }
  lines.push(...landLines);
  lines.push('');

  // ── Timing ──
  lines.push('TIMING');
  if (species === 'deer' && date) {
    const rut = getCurrentRutPhase(date);
    if (rut) {
      lines.push(`Rut phase on your date: ${rut.phase}. ${rut.description} ${rut.huntingTips}`);
    } else {
      lines.push('Outside the rut window. Focus on food sources and bedding-to-feed travel at first and last light.');
    }
  } else if (species === 'turkey') {
    lines.push('Set up before first light near roost trees; gobblers are most vocal at dawn. Midmorning can be productive after hens leave.');
  } else if (species === 'waterfowl') {
    lines.push('Be set up and hidden before legal light; the first hour is usually the best flight. Watch the tide and wind on tidal marshes.');
  } else if (species === 'bear') {
    lines.push('Bears feed heavily in early morning and late afternoon. Focus on mast-heavy ridges and edges near cover.');
  } else {
    lines.push('Early morning and the last two hours of light are the most productive windows.');
  }
  const hours = knowledgeSnippet('legal shooting hours');
  if (hours.text) {
    lines.push(hours.text);
    hours.citations.forEach((c) => sources.add(c));
  }
  lines.push('');

  // ── Gear and safety ──
  lines.push('GEAR AND SAFETY');
  const gear: string[] = ['Valid Maryland hunting license and any required stamps or permits', 'Printed or saved DNR map of the land and your parking spot'];
  if (weapon === 'archery') gear.push('Bow or crossbow, sighted in, with legal broadheads', 'Safety harness if hunting from a stand');
  if (weapon === 'firearms') gear.push('Firearm legal for the county (shotgun with slugs in shotgun-only zones)', 'Ammunition, hearing protection');
  if (weapon === 'muzzleloader') gear.push('Muzzleloader, powder, primers, and loading tools kept dry');
  if (species === 'deer' || species === 'bear') gear.push('Field-dressing kit, drag rope, and harvest tags or the DNR reporting number');
  if (species === 'waterfowl') gear.push('Federal duck stamp and Maryland migratory game bird stamp', 'Non-toxic shot only', 'Decoys, calls, and a blind bag');
  if (species === 'turkey') gear.push('Turkey calls, decoys, and full camouflage', 'Shot size and gauge legal for turkey');
  if (species === 'small_game') gear.push('Small-game vest and appropriate shot size');
  for (const g of gear) lines.push(`- ${g}`);
  const orange = knowledgeSnippet('blaze orange requirements');
  if (orange.text) {
    lines.push(orange.text);
    orange.citations.forEach((c) => sources.add(c));
  }
  lines.push('');

  lines.push('This offline plan was built from the app\'s bundled Maryland regulation data. Verify dates, limits, and land rules with MD DNR before you hunt.');

  return {
    plan: lines.join('\n'),
    sources: Array.from(sources),
    inSeason,
  };
}
