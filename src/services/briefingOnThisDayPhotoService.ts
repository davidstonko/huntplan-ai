/**
 * briefingOnThisDayPhotoService — pure helper that picks a single
 * "Photo of the Day" from the On This Day memories feed, so the
 * Daily Briefing teaser can render a hero image instead of just a
 * memory count.
 *
 * Why a separate service:
 *   - The On This Day teaser on the briefing was already a narrow
 *     rendering of `OnThisDayResult`. A.37 widens it with a photo,
 *     but the photo-pick rule ("first usable photo from the newest
 *     bucket, walking item order") is a real piece of business
 *     logic worth testing in isolation. Stuffing the loop into the
 *     screen file would make it untestable without an RN renderer.
 *   - Keeps DailyBriefingScreen.tsx free of array-walking + URI
 *     defensiveness — it just renders what the projection returns.
 *
 * Why "first usable" and not e.g. "random" or "most-recent-edited":
 *   - On This Day buckets are already sorted newest-year-first, then
 *     by item id ASC within a year (locked by onThisDayService).
 *     "First usable" is therefore "the most recent year's first
 *     photo-bearing memory" — a stable, predictable pick that
 *     doesn't change while the user stares at the briefing.
 *   - Random would re-shuffle on every render (or worse, on every
 *     mount), which feels broken on a dashboard surface.
 *
 * Pure function; no I/O, no `new Date()`, no theme imports.
 */

import type { OnThisDayItem, OnThisDayResult } from './onThisDayService';

/**
 * Source-kind values that can carry photos on the personal layer.
 * Tracks / markups / checklists do not have a `photoUris` field, so
 * they're never candidates for the teaser. Kept as a union (not a
 * string) so a future "campNote" addition is a type error here
 * before it can silently be omitted.
 */
export type OnThisDayPhotoKind = 'waypoint' | 'journal';

/**
 * View-model for the briefing's hero photo. Includes the year +
 * yearsAgo so the caption can read "1 YEAR AGO" / "3 YEARS AGO"
 * without re-deriving from the buckets, and the title + kind so the
 * screen can show a tasteful caption and (eventually) deep-link to
 * the source row.
 */
export interface OnThisDayPhotoTeaser {
  /** Local file URI usable as `<Image source={{ uri }} />`. */
  uri: string;
  /** Calendar year the memory came from (e.g. 2024). */
  year: number;
  /** todayYear − year. Already on the bucket; mirrored here for caller convenience. */
  yearsAgo: number;
  /** Source kind, useful for a chip code ("WP" / "JR") and future deep-linking. */
  kind: OnThisDayPhotoKind;
  /** Short caption — falls back to a generic label if the source has no title. */
  title: string;
}

/** Tiny narrowing helper — accepts only non-empty trimmed strings. */
function isUsableUri(s: unknown): s is string {
  return typeof s === 'string' && s.trim().length > 0;
}

/**
 * Return the first usable photo URI on a personal-layer item that
 * may carry photos. Returns `null` when the field is missing,
 * empty, or contains only blank strings. Defensive against legacy
 * rows where `photoUris` could be undefined.
 */
function firstUsableUri(photoUris: unknown): string | null {
  if (!Array.isArray(photoUris)) return null;
  for (const u of photoUris) {
    if (isUsableUri(u)) return u.trim();
  }
  return null;
}

/**
 * Default caption when a waypoint or journal has no user-set title.
 * Matches the wording used elsewhere (PhotoGallery / lists) so the
 * teaser caption doesn't disagree with deeper screens.
 */
function titleOf(item: OnThisDayItem): string {
  if (item.kind === 'waypoint') {
    const t = item.item.title;
    return typeof t === 'string' && t.trim().length > 0
      ? t.trim()
      : 'Waypoint';
  }
  if (item.kind === 'journal') {
    const t = item.item.title;
    return typeof t === 'string' && t.trim().length > 0
      ? t.trim()
      : 'Untitled entry';
  }
  // Unreachable in practice — pickOnThisDayPhoto only invokes this on
  // waypoint | journal items. Defensive fallback to avoid crashing on
  // a future enum addition.
  return 'Memory';
}

/**
 * Walk the On This Day result newest-year-first, in-bucket
 * id-order, and return the first photo-bearing item's first usable
 * photo URI plus the supporting view-model. Returns `null` when no
 * memory in any bucket carries a photo.
 *
 * @example
 *   const result = getOnThisDayItems(now, inputs);
 *   const teaser = pickOnThisDayPhoto(result);
 *   if (teaser) {
 *     // <Image source={{ uri: teaser.uri }} />
 *     // "1 YEAR AGO · Sat morning hunt"
 *   }
 */
export function pickOnThisDayPhoto(
  result: OnThisDayResult,
): OnThisDayPhotoTeaser | null {
  for (const bucket of result.buckets) {
    for (const it of bucket.items) {
      if (it.kind !== 'waypoint' && it.kind !== 'journal') continue;
      const uri = firstUsableUri(it.item.photoUris);
      if (!uri) continue;
      return {
        uri,
        year: bucket.year,
        yearsAgo: bucket.yearsAgo,
        kind: it.kind,
        title: titleOf(it),
      };
    }
  }
  return null;
}

/**
 * Lightweight predicate for "do we have a photo to render?". Mirrors
 * the A.33 / A.36 "render-gating predicate paired with projection"
 * convention so the screen doesn't have to compare the result to
 * `null` in JSX.
 */
export function hasOnThisDayPhoto(result: OnThisDayResult): boolean {
  return pickOnThisDayPhoto(result) !== null;
}
