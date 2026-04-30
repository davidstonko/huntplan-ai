/**
 * photoGalleryService.ts — pure-function aggregator that flattens every
 * photo attached to the user's personal layer (currently: waypoints +
 * journal entries) into a single chronological grid feed.
 *
 * Returns one entry per photo URI (a single waypoint with 3 photos
 * produces 3 grid items), each with a back-reference to the source row
 * so the gallery screen can deep-link to the originating edit screen.
 *
 * Sort order: most-recent source row first, then by photo index within
 * the source row (so a multi-photo entry's photos stay in their
 * authored order).
 *
 * Phase A.9 — added 2026-04-24 per V2_3_FEATURE_EXPANSION_PLAN.
 */

import type { UserWaypoint, WaypointMode } from '../types/userWaypoint';
import type { JournalEntry } from '../types/journalEntry';
import { JOURNAL_OUTCOME_META } from '../types/journalEntry';

export type PhotoSourceKind = 'waypoint' | 'journal';

export interface PhotoGalleryItem {
  /** Stable composite id: `${kind}:${sourceId}:${photoIndex}`. */
  id: string;
  /** Local file URI of the photo. */
  uri: string;
  /** Where the photo lives in the personal layer. */
  kind: PhotoSourceKind;
  /** Mode of the source row (used for filtering). */
  mode: WaypointMode;
  /** ID of the source row (used for navigation). */
  sourceId: string;
  /** Letter-code chip for the source kind ("WP" | "JR"). */
  code: string;
  /** Headline label, e.g. "Cedar Hill stand" or "Evening sit (Sighting)". */
  caption: string;
  /** ISO timestamp used for sort. */
  timestamp: string;
}

export interface PhotoGalleryInputs {
  waypoints: UserWaypoint[];
  journalEntries: JournalEntry[];
}

export interface PhotoGalleryOptions {
  /** When set, drops photos whose source mode != this. */
  mode?: WaypointMode;
  /** When set, only returns photos from these source kinds. */
  kinds?: PhotoSourceKind[];
  /** Hard ceiling on result count (default 250). */
  limit?: number;
}

function isNonEmptyUri(s: unknown): s is string {
  return typeof s === 'string' && s.trim().length > 0;
}

/**
 * Aggregate every photo across the personal layer into a flat,
 * chronologically-sorted grid feed.
 */
export function buildPhotoGallery(
  inputs: PhotoGalleryInputs,
  opts: PhotoGalleryOptions = {},
): PhotoGalleryItem[] {
  const limit = opts.limit ?? 250;
  const kindsFilter = opts.kinds && opts.kinds.length > 0
    ? new Set(opts.kinds)
    : null;
  const modeFilter = opts.mode;

  const out: PhotoGalleryItem[] = [];

  if (!kindsFilter || kindsFilter.has('waypoint')) {
    for (const w of inputs.waypoints) {
      if (modeFilter && w.mode !== modeFilter) continue;
      const uris = (w.photoUris ?? []).filter(isNonEmptyUri);
      uris.forEach((uri, idx) => {
        out.push({
          id: `waypoint:${w.id}:${idx}`,
          uri,
          kind: 'waypoint',
          mode: w.mode,
          sourceId: w.id,
          code: 'WP',
          caption: w.title || 'Waypoint',
          timestamp: w.updatedAt,
        });
      });
    }
  }

  if (!kindsFilter || kindsFilter.has('journal')) {
    for (const j of inputs.journalEntries) {
      if (modeFilter && j.mode !== modeFilter) continue;
      const uris = (j.photoUris ?? []).filter(isNonEmptyUri);
      const meta = JOURNAL_OUTCOME_META[j.outcome];
      const outcomeLabel = meta ? meta.label : j.outcome;
      const journalIso = `${j.entryDate}T12:00:00.000Z`;
      const baseCaption = j.title?.trim() || 'Untitled entry';
      uris.forEach((uri, idx) => {
        out.push({
          id: `journal:${j.id}:${idx}`,
          uri,
          kind: 'journal',
          mode: j.mode,
          sourceId: j.id,
          code: 'JR',
          caption: `${baseCaption} (${outcomeLabel})`,
          timestamp: journalIso,
        });
      });
    }
  }

  out.sort((a, b) => {
    if (a.timestamp !== b.timestamp) return a.timestamp < b.timestamp ? 1 : -1;
    // Same source-row timestamp: keep photos in authored order via id suffix.
    return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
  });

  return out.slice(0, limit);
}

/**
 * Quick total of every photo across the layer for badge counts.
 */
export function totalPhotoCount(inputs: PhotoGalleryInputs): number {
  let n = 0;
  for (const w of inputs.waypoints) {
    n += (w.photoUris ?? []).filter(isNonEmptyUri).length;
  }
  for (const j of inputs.journalEntries) {
    n += (j.photoUris ?? []).filter(isNonEmptyUri).length;
  }
  return n;
}
