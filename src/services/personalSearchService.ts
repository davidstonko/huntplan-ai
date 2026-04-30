/**
 * personalSearchService.ts — pure-function search across the user's
 * five personal-layer collections (waypoints, tracks, markups, journal
 * entries, gear checklists).
 *
 * Goals:
 *  - One query string → unified ranked list, regardless of layer.
 *  - Tokenized, case-insensitive substring match (e.g. "cedar hill" matches
 *    "Cedar Hill stand" and "Hill at Cedar Run").
 *  - Strict mode filter when a mode is specified — otherwise cross-mode.
 *  - Stable, deterministic ordering: higher score first, ties broken by
 *    most-recent activity timestamp, then by id.
 *  - No async, no I/O, no React. The hosting screen passes already-loaded
 *    arrays in. Keeps the service trivially testable.
 *
 * Phase A.8 — added 2026-04-24 per V2_3_FEATURE_EXPANSION_PLAN.
 */

import type { UserWaypoint, WaypointMode } from '../types/userWaypoint';
import type { RecordedTrack } from '../types/track';
import type { UserMarkup } from '../types/userMarkup';
import type { JournalEntry } from '../types/journalEntry';
import { JOURNAL_OUTCOME_META } from '../types/journalEntry';
import type { GearChecklist } from '../types/gearChecklist';

export type PersonalSearchKind =
  | 'waypoint'
  | 'track'
  | 'markup'
  | 'journal'
  | 'checklist';

export interface PersonalSearchResult {
  kind: PersonalSearchKind;
  /** Letter-code chip ("WP", "TR", "MK", "JR", "GC"). */
  code: string;
  /** Source mode the row belongs to. */
  mode: WaypointMode;
  /** Original row id (callers use this to navigate to the edit screen). */
  id: string;
  /** Headline label, e.g. "Cedar Hill stand". */
  label: string;
  /** Secondary line, e.g. "Hunt waypoint · 5 days ago". */
  detail: string;
  /** Ranking score; higher = better match. */
  score: number;
  /** ISO timestamp used as a tiebreaker (most recent first). */
  timestamp: string;
}

export interface PersonalSearchInputs {
  waypoints: UserWaypoint[];
  tracks: RecordedTrack[];
  markups: UserMarkup[];
  journalEntries: JournalEntry[];
  checklists: GearChecklist[];
}

export interface PersonalSearchOptions {
  /** When set, drops rows from other modes before scoring. */
  mode?: WaypointMode;
  /** When set, only returns these kinds. Empty/undefined = all kinds. */
  kinds?: PersonalSearchKind[];
  /** Hard ceiling on result count (default 50). */
  limit?: number;
}

/**
 * Normalize a raw query into lowercase tokens. Empty / whitespace-only
 * input returns an empty array — callers should treat that as "no
 * search active" and skip ranking entirely.
 */
export function tokenizeQuery(raw: string): string[] {
  if (!raw) return [];
  return raw
    .toLowerCase()
    .split(/[\s,]+/)
    .map((t) => t.trim())
    .filter((t) => t.length > 0);
}

/**
 * Score a list of haystack strings against a token list.
 *  - +3 if a haystack starts with the token (e.g. "Cedar..." starts with "cedar")
 *  - +2 if the token appears as a whole word inside a haystack
 *  - +1 if the token appears anywhere as a substring
 *  - 0 if the token is absent
 *  - Result is the SUM across all tokens. ALL tokens must match at least
 *    once (substring OK) for the row to be returned at all — partial
 *    matches return 0 and the row is dropped.
 *
 * Empty haystack list → 0.
 */
export function scoreAgainst(
  tokens: string[],
  haystacks: Array<string | undefined | null>,
): number {
  if (tokens.length === 0) return 0;
  const fields = haystacks
    .filter((h): h is string => typeof h === 'string' && h.length > 0)
    .map((s) => s.toLowerCase());
  if (fields.length === 0) return 0;

  let total = 0;
  for (const token of tokens) {
    let bestForToken = 0;
    for (const field of fields) {
      if (field.startsWith(token)) {
        bestForToken = Math.max(bestForToken, 3);
        continue;
      }
      // whole-word match: surrounded by start/end or non-word chars
      const wordRe = new RegExp(
        `(^|\\W)${escapeRegex(token)}(\\W|$)`,
      );
      if (wordRe.test(field)) {
        bestForToken = Math.max(bestForToken, 2);
        continue;
      }
      if (field.includes(token)) {
        bestForToken = Math.max(bestForToken, 1);
      }
    }
    if (bestForToken === 0) return 0; // any token misses → drop the row
    total += bestForToken;
  }
  return total;
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function modeLabel(mode: WaypointMode): string {
  switch (mode) {
    case 'hunt':
      return 'Hunt';
    case 'fish':
      return 'Fish';
    case 'camp':
      return 'Camp';
    case 'hike':
      return 'Hike';
    default:
      return 'Mode';
  }
}

function shortDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

/**
 * Run the search. Returns a deterministically ordered list of results.
 * Callers can pass an empty query to get a "recently touched" listing
 * (no scoring; sorted purely by timestamp desc).
 */
export function searchPersonalLayer(
  rawQuery: string,
  inputs: PersonalSearchInputs,
  opts: PersonalSearchOptions = {},
): PersonalSearchResult[] {
  const tokens = tokenizeQuery(rawQuery);
  const limit = opts.limit ?? 50;
  const kindsFilter = opts.kinds && opts.kinds.length > 0
    ? new Set(opts.kinds)
    : null;
  const modeFilter = opts.mode;

  const out: PersonalSearchResult[] = [];

  if (!kindsFilter || kindsFilter.has('waypoint')) {
    for (const w of inputs.waypoints) {
      if (modeFilter && w.mode !== modeFilter) continue;
      const score = tokens.length === 0
        ? 0
        : scoreAgainst(tokens, [w.title, w.notes, w.category]);
      if (tokens.length > 0 && score === 0) continue;
      out.push({
        kind: 'waypoint',
        code: 'WP',
        mode: w.mode,
        id: w.id,
        label: w.title || 'Waypoint',
        detail: `${modeLabel(w.mode)} waypoint  ·  ${shortDate(w.updatedAt)}`,
        score,
        timestamp: w.updatedAt,
      });
    }
  }

  if (!kindsFilter || kindsFilter.has('track')) {
    for (const t of inputs.tracks) {
      if (modeFilter && t.mode !== modeFilter) continue;
      const score = tokens.length === 0
        ? 0
        : scoreAgainst(tokens, [t.name, t.notes]);
      if (tokens.length > 0 && score === 0) continue;
      out.push({
        kind: 'track',
        code: 'TR',
        mode: t.mode,
        id: t.id,
        label: t.name || 'Track',
        detail: `${modeLabel(t.mode)} track  ·  ${shortDate(t.startedAt)}`,
        score,
        timestamp: t.startedAt,
      });
    }
  }

  if (!kindsFilter || kindsFilter.has('markup')) {
    for (const m of inputs.markups) {
      if (modeFilter && m.mode !== modeFilter) continue;
      const score = tokens.length === 0
        ? 0
        : scoreAgainst(tokens, [m.title, m.notes, m.shapeType]);
      if (tokens.length > 0 && score === 0) continue;
      out.push({
        kind: 'markup',
        code: 'MK',
        mode: m.mode,
        id: m.id,
        label:
          m.title ||
          (m.shapeType === 'Polygon' ? 'Area' : 'Line'),
        detail: `${modeLabel(m.mode)} ${m.shapeType === 'Polygon' ? 'area' : 'line'}  ·  ${shortDate(m.updatedAt)}`,
        score,
        timestamp: m.updatedAt,
      });
    }
  }

  if (!kindsFilter || kindsFilter.has('journal')) {
    for (const j of inputs.journalEntries) {
      if (modeFilter && j.mode !== modeFilter) continue;
      const meta = JOURNAL_OUTCOME_META[j.outcome];
      const outcomeLabel = meta ? meta.label : j.outcome;
      const score = tokens.length === 0
        ? 0
        : scoreAgainst(tokens, [
            j.title,
            j.body,
            j.locationLabel,
            ...(j.tags ?? []),
            outcomeLabel,
          ]);
      if (tokens.length > 0 && score === 0) continue;
      const journalIso = `${j.entryDate}T12:00:00.000Z`;
      out.push({
        kind: 'journal',
        code: 'JR',
        mode: j.mode,
        id: j.id,
        label: j.title || 'Untitled entry',
        detail: `${outcomeLabel}  ·  ${shortDate(journalIso)}`,
        score,
        timestamp: journalIso,
      });
    }
  }

  if (!kindsFilter || kindsFilter.has('checklist')) {
    for (const c of inputs.checklists) {
      if (modeFilter && c.mode !== modeFilter) continue;
      const itemLabels = c.items.map((it) => it.label);
      const score = tokens.length === 0
        ? 0
        : scoreAgainst(tokens, [c.name, ...itemLabels]);
      if (tokens.length > 0 && score === 0) continue;
      const checked = c.items.filter((it) => it.checked).length;
      out.push({
        kind: 'checklist',
        code: 'GC',
        mode: c.mode,
        id: c.id,
        label: c.name,
        detail: `${modeLabel(c.mode)} pack list  ·  ${checked}/${c.items.length} packed`,
        score,
        timestamp: c.updatedAt,
      });
    }
  }

  out.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    if (a.timestamp !== b.timestamp) return a.timestamp < b.timestamp ? 1 : -1;
    return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
  });

  return out.slice(0, limit);
}
