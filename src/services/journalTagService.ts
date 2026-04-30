/**
 * journalTagService.ts — pure-function tag analytics for the field
 * journal (Phase A.5 added free-form `tags: string[]` to each entry;
 * this service makes those tags discoverable / filterable).
 *
 * Provides:
 *   - `tagFrequency(entries, opts?)`    → ranked list of {tag, count, lastUsedAt}
 *   - `entriesWithTag(entries, tag)`    → strict-equality (case-insensitive) filter
 *   - `normalizeTag(raw)`               → lowercase, trim, collapse whitespace
 *
 * All functions are synchronous + pure. Tag comparison is
 * case-insensitive (so "Archery" and "archery" are the same tag).
 *
 * Phase A.10 — added 2026-04-24 per V2_3_FEATURE_EXPANSION_PLAN.
 */

import type { JournalEntry } from '../types/journalEntry';
import type { WaypointMode } from '../types/userWaypoint';

export interface TagFrequencyEntry {
  /** Display form of the tag (the most recently authored casing). */
  tag: string;
  /** Lowercased canonical form (used for grouping). */
  key: string;
  /** Number of entries that carry this tag. */
  count: number;
  /** ISO timestamp (entryDate@T12:00Z) of the most recent entry with this tag. */
  lastUsedAt: string;
  /** Modes the tag has been applied to (deduped, in insertion order). */
  modes: WaypointMode[];
}

export interface TagFrequencyOptions {
  /** When set, only counts tags that appear in entries of this mode. */
  mode?: WaypointMode;
  /** Hard ceiling on returned tags (default 200). */
  limit?: number;
}

/**
 * Canonical form: lowercase, trim, collapse internal whitespace runs to
 * single space. Returns "" for null / whitespace-only input.
 */
export function normalizeTag(raw: string | undefined | null): string {
  if (!raw) return '';
  return raw
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ');
}

/**
 * Build a frequency-ranked tag list. Sort: count DESC, then lastUsedAt
 * DESC, then alphabetical ASC for stable tiebreaks.
 *
 * Display casing rule: when the same canonical key appears with mixed
 * casing across entries, the casing from the *most recent* entry wins
 * — so a user who once wrote "Archery" and then later switched to
 * "archery" sees "archery" in the cloud.
 */
export function tagFrequency(
  entries: JournalEntry[],
  opts: TagFrequencyOptions = {},
): TagFrequencyEntry[] {
  const limit = opts.limit ?? 200;
  const modeFilter = opts.mode;

  const acc = new Map<string, {
    display: string;
    displayDate: string;
    count: number;
    lastUsedAt: string;
    modes: WaypointMode[];
  }>();

  for (const e of entries) {
    if (modeFilter && e.mode !== modeFilter) continue;
    const tags = e.tags ?? [];
    if (tags.length === 0) continue;
    const journalIso = `${e.entryDate}T12:00:00.000Z`;
    for (const raw of tags) {
      const key = normalizeTag(raw);
      if (!key) continue;
      const existing = acc.get(key);
      if (existing) {
        existing.count += 1;
        if (journalIso > existing.lastUsedAt) {
          existing.lastUsedAt = journalIso;
          existing.display = (raw || '').trim() || existing.display;
          existing.displayDate = journalIso;
        }
        if (!existing.modes.includes(e.mode)) {
          existing.modes.push(e.mode);
        }
      } else {
        acc.set(key, {
          display: (raw || '').trim() || key,
          displayDate: journalIso,
          count: 1,
          lastUsedAt: journalIso,
          modes: [e.mode],
        });
      }
    }
  }

  const out: TagFrequencyEntry[] = Array.from(acc.entries()).map(
    ([key, v]) => ({
      tag: v.display,
      key,
      count: v.count,
      lastUsedAt: v.lastUsedAt,
      modes: v.modes,
    }),
  );

  out.sort((a, b) => {
    if (b.count !== a.count) return b.count - a.count;
    if (a.lastUsedAt !== b.lastUsedAt) return a.lastUsedAt < b.lastUsedAt ? 1 : -1;
    return a.key < b.key ? -1 : a.key > b.key ? 1 : 0;
  });

  return out.slice(0, limit);
}

/**
 * Entries that carry a given tag (case-insensitive equality).
 * Returns a new array; original `entries` order is preserved.
 */
export function entriesWithTag(
  entries: JournalEntry[],
  tag: string,
): JournalEntry[] {
  const target = normalizeTag(tag);
  if (!target) return [];
  return entries.filter((e) =>
    (e.tags ?? []).some((t) => normalizeTag(t) === target),
  );
}
