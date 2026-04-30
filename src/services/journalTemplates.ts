/**
 * journalTemplates — Phase A.24.
 *
 * Per-mode + per-outcome "fill-in-the-blank" body templates for the field
 * journal. The retention pitch: when the user opens a New Entry from the
 * Quick-Add FAB and picks (e.g.) Hunt + Harvest, tapping "USE TEMPLATE"
 * pre-fills the body with structured prompts so they don't sit staring at
 * an empty box trying to remember what details matter for that outcome.
 *
 * Cuts the journaling-from-scratch friction substantially while also
 * producing a more consistently-shaped corpus for future analytics
 * (Comparable Conditions, Year-in-Review tag tally, eventual ML).
 *
 * Design principles:
 *   - Pure data (no React, no I/O) so the screen renders synchronously.
 *   - Templates are heading-and-blank format (e.g. "Time on stand:")
 *     not multiple-choice, because journaling intent is narrative.
 *   - Templates also seed a small set of suggested tags — the user can
 *     accept all, edit, or wipe before save.
 *   - Falling back to a minimal generic template if a specific outcome
 *     has no curated entry — no template should ever be blank.
 *
 * Critical: this is journal-shape, not journal-content. We prompt for
 * "Time on stand:" but never inject placeholder data the user might
 * forget to overwrite. Saving with the template untouched persists the
 * blanks, which is honest data ("the user opened a template and saved
 * without filling it in") rather than fabricated detail.
 */

import type { JournalOutcome } from '../types/journalEntry';
import type { WaypointMode } from '../types/userWaypoint';

export interface JournalTemplate {
  /** Short label shown in the picker row. */
  label: string;
  /** One-line description of when to use it. */
  description: string;
  /**
   * Multiline body the screen will paste into the NOTES field. Uses
   * plain ASCII headings (no markdown — the journal renders as text).
   */
  body: string;
  /** Suggested tags to seed the TAGS field (user can edit). */
  suggestedTags: string[];
}

// ── Hunt templates ──────────────────────────────────────────────────────
const HUNT_HARVEST: JournalTemplate = {
  label: 'Hunt — Harvest',
  description: 'Successful sit. Captures animal, shot, and recovery details.',
  body: [
    'Species:',
    'Sex / age class:',
    'Weight (estimated):',
    'Antler / horn details:',
    '',
    'Time on stand (in / out):',
    'Stand / blind:',
    'Wind direction & speed:',
    'Temperature & sky:',
    '',
    'Distance of shot (yards):',
    'Caliber / bow draw:',
    'Shot placement:',
    'Reaction & blood trail:',
    'Recovery time:',
    '',
    'What worked:',
    'What I would do differently:',
  ].join('\n'),
  suggestedTags: ['harvest'],
};

const HUNT_SIGHTING: JournalTemplate = {
  label: 'Hunt — Sighting',
  description: 'Saw game but no shot opportunity (or passed).',
  body: [
    'Species & count:',
    'Distance & direction:',
    'Time observed:',
    'Behavior (feeding / cruising / bedded):',
    '',
    'Stand / blind:',
    'Wind direction & speed:',
    'Why no shot:',
    '',
    'Travel route observed:',
    'Implication for next sit:',
  ].join('\n'),
  suggestedTags: ['sighting'],
};

const HUNT_SIGN: JournalTemplate = {
  label: 'Hunt — Sign',
  description: 'Scrapes, rubs, tracks, scat, beds.',
  body: [
    'Sign type (scrape / rub / track / scat / bed):',
    'Location:',
    'Freshness (today / 1-3 days / older):',
    'Size / count:',
    '',
    'Cover & terrain:',
    'Likely travel direction:',
    'Wind direction at observation:',
    '',
    'Stand setup ideas:',
  ].join('\n'),
  suggestedTags: ['sign', 'scout'],
};

const HUNT_SKUNKED: JournalTemplate = {
  label: 'Hunt — Skunked',
  description: 'No game seen. Document conditions to learn from later.',
  body: [
    'Time on stand (in / out):',
    'Stand / blind:',
    'Wind direction & speed:',
    'Temperature & sky:',
    'Pressure trend:',
    'Moon phase / overhead time:',
    '',
    'Other hunters / disturbance:',
    'What I might change next time:',
  ].join('\n'),
  suggestedTags: ['skunked'],
};

const HUNT_SCOUT: JournalTemplate = {
  label: 'Hunt — Scout',
  description: 'Pre-season or off-day scout. Map your findings.',
  body: [
    'Area scouted:',
    'Travel routes located:',
    'Bedding areas:',
    'Food sources:',
    'Water:',
    '',
    'Stand / blind candidates:',
    'Wind requirements:',
    'Access route:',
    '',
    'Next steps:',
  ].join('\n'),
  suggestedTags: ['scout'],
};

// ── Fish templates ──────────────────────────────────────────────────────
const FISH_CATCH: JournalTemplate = {
  label: 'Fish — Catch',
  description: 'Landed fish. Captures species, gear, conditions.',
  body: [
    'Species:',
    'Length / weight:',
    'Released or kept:',
    'Time of catch:',
    '',
    'Bait / lure:',
    'Rig / leader:',
    'Depth & retrieve:',
    '',
    'Tide stage (incoming / slack / outgoing):',
    'Water temp & clarity:',
    'Air temp & sky:',
    'Wind direction & speed:',
    '',
    'Pattern / what worked:',
  ].join('\n'),
  suggestedTags: ['catch'],
};

const FISH_SIGHTING: JournalTemplate = {
  label: 'Fish — Sighting',
  description: 'Saw fish, schools, or bait but no hookup.',
  body: [
    'Species / size:',
    'Location & depth:',
    'Time observed:',
    'Bait present:',
    '',
    'Tide stage:',
    'Water temp & clarity:',
    '',
    'What I tried:',
    'What I would try next:',
  ].join('\n'),
  suggestedTags: ['sighting'],
};

const FISH_SKUNKED: JournalTemplate = {
  label: 'Fish — Skunked',
  description: 'No fish landed. Document conditions for pattern-finding.',
  body: [
    'Time on water (in / out):',
    'Locations tried:',
    'Baits / lures rotated:',
    '',
    'Tide stage at peak effort:',
    'Water temp & clarity:',
    'Air temp & sky:',
    'Wind direction & speed:',
    'Pressure trend:',
    '',
    'What I would change next time:',
  ].join('\n'),
  suggestedTags: ['skunked'],
};

const FISH_SCOUT: JournalTemplate = {
  label: 'Fish — Scout',
  description: 'Recon a new ramp, pond, or tide window.',
  body: [
    'Spot:',
    'Access (ramp / bank / wade):',
    'Parking notes:',
    '',
    'Depth & structure:',
    'Bait observed:',
    'Tide window worth retrying:',
    '',
    'Plan for next visit:',
  ].join('\n'),
  suggestedTags: ['scout'],
};

// ── Camp templates ──────────────────────────────────────────────────────
const CAMP_COMPLETED: JournalTemplate = {
  label: 'Camp — Completed',
  description: 'Trip finished. Site, weather, gear notes.',
  body: [
    'Campground / site #:',
    'Nights:',
    'Party size:',
    '',
    'Weather (lows / highs / precip):',
    'Bugs / wildlife:',
    'Fire ban or restriction:',
    '',
    'Gear that performed:',
    'Gear that disappointed:',
    'What I forgot:',
    '',
    'Would I return:',
  ].join('\n'),
  suggestedTags: ['completed'],
};

const CAMP_TURNED_BACK: JournalTemplate = {
  label: 'Camp — Turned Back',
  description: 'Cut short. Capture why so you can plan around it next time.',
  body: [
    'Campground / site #:',
    'Reason cut short:',
    'Conditions at decision:',
    '',
    'What would have made the trip work:',
    'Backup plan for next time:',
  ].join('\n'),
  suggestedTags: ['turned-back'],
};

const CAMP_SCOUT: JournalTemplate = {
  label: 'Camp — Scout',
  description: 'Day-tripped a campground to evaluate it for a future trip.',
  body: [
    'Campground:',
    'Loop / sites worth booking:',
    'Sites to avoid:',
    '',
    'Water source:',
    'Bathroom condition:',
    'Cell signal / Wi-Fi:',
    'Nearest amenities (gas / store / dump station):',
    '',
    'Booking notes:',
  ].join('\n'),
  suggestedTags: ['scout'],
};

// ── Hike templates ──────────────────────────────────────────────────────
const HIKE_COMPLETED: JournalTemplate = {
  label: 'Hike — Completed',
  description: 'Logged a finish. Trail, conditions, gear notes.',
  body: [
    'Trail / loop:',
    'Distance & elevation:',
    'Moving time:',
    '',
    'Trail surface (smooth / rocky / muddy):',
    'Stream crossings:',
    'Snow / ice:',
    '',
    'Weather (start → end):',
    'Wildlife & views:',
    '',
    'Footwear & layers worked:',
    'What I would change:',
  ].join('\n'),
  suggestedTags: ['completed'],
};

const HIKE_TURNED_BACK: JournalTemplate = {
  label: 'Hike — Turned Back',
  description: 'Bailed mid-hike. Capture conditions and the call.',
  body: [
    'Trail:',
    'Turn-around point:',
    'Reason (weather / time / injury / route-find):',
    '',
    'Conditions at decision:',
    'What would have changed the call:',
    'Plan for the redo:',
  ].join('\n'),
  suggestedTags: ['turned-back'],
};

const HIKE_SIGHTING: JournalTemplate = {
  label: 'Hike — Sighting',
  description: 'Wildlife, vista, or trail feature worth remembering.',
  body: [
    'What I saw:',
    'Where on the trail (mile / landmark):',
    'Time of day:',
    '',
    'Conditions:',
    'Photo taken (yes / no):',
  ].join('\n'),
  suggestedTags: ['sighting'],
};

const HIKE_SCOUT: JournalTemplate = {
  label: 'Hike — Scout',
  description: 'Recon a trail for a longer future trip.',
  body: [
    'Trailhead:',
    'Parking notes:',
    'Trail markings clarity:',
    '',
    'Surface & difficulty:',
    'Water sources on route:',
    'Cell coverage:',
    '',
    'Plan for the full effort:',
  ].join('\n'),
  suggestedTags: ['scout'],
};

// ── Cross-mode generic templates ────────────────────────────────────────
const GENERIC_NOTE: JournalTemplate = {
  label: 'Note',
  description: 'Free-form thought, planning, or gear observation.',
  body: [
    'What:',
    'Why it matters:',
    'Follow-up action:',
  ].join('\n'),
  suggestedTags: [],
};

/**
 * Map (mode, outcome) → curated template. Falls back to GENERIC_NOTE if
 * no entry is registered (defensive — adding a new outcome to the union
 * without registering a template here still ships a usable entry).
 */
const TEMPLATE_TABLE: Partial<
  Record<WaypointMode, Partial<Record<JournalOutcome, JournalTemplate>>>
> = {
  hunt: {
    harvest: HUNT_HARVEST,
    sighting: HUNT_SIGHTING,
    sign: HUNT_SIGN,
    skunked: HUNT_SKUNKED,
    scout: HUNT_SCOUT,
    note: GENERIC_NOTE,
  },
  fish: {
    catch: FISH_CATCH,
    sighting: FISH_SIGHTING,
    skunked: FISH_SKUNKED,
    scout: FISH_SCOUT,
    note: GENERIC_NOTE,
  },
  camp: {
    completed: CAMP_COMPLETED,
    'turned-back': CAMP_TURNED_BACK,
    scout: CAMP_SCOUT,
    note: GENERIC_NOTE,
  },
  hike: {
    completed: HIKE_COMPLETED,
    'turned-back': HIKE_TURNED_BACK,
    sighting: HIKE_SIGHTING,
    scout: HIKE_SCOUT,
    note: GENERIC_NOTE,
  },
};

/**
 * Look up the template for a given (mode, outcome). Returns the curated
 * template if one exists, else the generic note template. Never returns
 * null — every (mode, outcome) call gets a usable shape.
 */
export function templateFor(
  mode: WaypointMode,
  outcome: JournalOutcome,
): JournalTemplate {
  return TEMPLATE_TABLE[mode]?.[outcome] ?? GENERIC_NOTE;
}

/**
 * Apply a template body to existing body content. If the existing body
 * is empty (typical "new entry from FAB" case), returns the template as-is.
 * If the user already typed something, prepends the template ABOVE the
 * existing body separated by a blank line — so we never silently destroy
 * what they wrote.
 */
export function applyTemplateBody(
  existingBody: string,
  template: JournalTemplate,
): string {
  const trimmed = existingBody.trim();
  if (trimmed.length === 0) return template.body;
  return `${template.body}\n\n--- previous notes ---\n${trimmed}`;
}

/**
 * Merge template suggested tags with an existing tag string (comma-sep).
 * Dedupes case-insensitively, keeps user's first-seen casing. Returns the
 * merged comma-separated string ready to drop into a TextInput.
 */
export function applyTemplateTags(
  existingTagText: string,
  template: JournalTemplate,
): string {
  const seen = new Set<string>();
  const out: string[] = [];
  // Existing tags first so user's casing wins.
  for (const raw of existingTagText.split(',')) {
    const t = raw.trim();
    if (!t) continue;
    const k = t.toLowerCase();
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(t);
  }
  for (const raw of template.suggestedTags) {
    const t = raw.trim();
    if (!t) continue;
    const k = t.toLowerCase();
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(t);
  }
  return out.join(', ');
}
