/**
 * favoritesAggregatorService — joins the favorites set with the live
 * personal-layer arrays into a polymorphic "starred items" feed.
 *
 * Pure function over 6 inputs (the favorites refs + 5 layer arrays). The
 * output mirrors the OnThisDay / RecentActivity item shape so the
 * Favorites screen can reuse the same row component patterns.
 *
 * Why join at read time instead of denormalizing the favorited row into
 * the FavoriteRef itself: the underlying row's title, color, mode, etc.
 * can change. A favorite that snapshots the row at star-time would drift.
 * Joining at read time means a renamed waypoint shows up in Favorites
 * with its current name automatically.
 *
 * Stale refs (favorited row was deleted from the underlying layer) are
 * filtered out — silently, not surfaced as errors. The user already saw
 * the deletion confirmation when they deleted the row.
 *
 * V2_3_FEATURE_EXPANSION_PLAN — Phase A.16.
 */

import type { JournalEntry } from '../types/journalEntry';
import type { UserWaypoint } from '../types/userWaypoint';
import type { RecordedTrack } from '../types/track';
import type { UserMarkup } from '../types/userMarkup';
import type { GearChecklist } from '../types/gearChecklist';
import type { FavoriteRef, FavoriteKind } from '../types/favorite';

/**
 * Polymorphic item in the favorites feed. The `kind` discriminator tells
 * the UI which detail screen to deep-link to. `addedAt` is preserved so
 * the screen can show "starred 3 days ago" if it ever needs to.
 */
export type FavoriteItem =
  | { kind: 'waypoint';  addedAt: string; item: UserWaypoint }
  | { kind: 'track';     addedAt: string; item: RecordedTrack }
  | { kind: 'markup';    addedAt: string; item: UserMarkup }
  | { kind: 'journal';   addedAt: string; item: JournalEntry }
  | { kind: 'checklist'; addedAt: string; item: GearChecklist };

/**
 * One kind's worth of favorites, suitable for rendering as a section.
 */
export interface FavoriteKindBucket {
  kind: FavoriteKind;
  label: string;
  items: FavoriteItem[];
}

/**
 * Top-level result. `staleCount` exposes how many favorited refs no
 * longer have a matching live row (e.g. user deleted the underlying
 * waypoint). The screen could surface a "clean up stale favorites" CTA
 * if this is non-zero, though the current screen just hides them.
 */
export interface FavoritesResult {
  items: FavoriteItem[];
  buckets: FavoriteKindBucket[];
  totalCount: number;
  staleCount: number;
}

export interface FavoritesAggregatorInputs {
  favorites: FavoriteRef[];
  waypoints?: UserWaypoint[];
  tracks?: RecordedTrack[];
  markups?: UserMarkup[];
  journalEntries?: JournalEntry[];
  checklists?: GearChecklist[];
}

const KIND_LABEL: Record<FavoriteKind, string> = {
  waypoint: 'Waypoints',
  track: 'Tracks',
  markup: 'Markups',
  journal: 'Journal Entries',
  checklist: 'Gear Checklists',
};

const KIND_ORDER: FavoriteKind[] = [
  'waypoint',
  'track',
  'markup',
  'journal',
  'checklist',
];

/**
 * Build a fast lookup map keyed by id. Each underlying row type uses an
 * `id: string` field, so this generic helper works for all 5.
 */
function indexById<T extends { id: string }>(rows: T[]): Map<string, T> {
  const m = new Map<string, T>();
  for (const r of rows) m.set(r.id, r);
  return m;
}

/**
 * Main entry point. Joins each favorite ref with its live row. Refs with
 * no matching row are dropped (and counted as `staleCount`).
 *
 * Order:
 *   - `items` is sorted by `addedAt` DESC (most recently starred first).
 *   - `buckets` is fixed kind order (waypoint, track, markup, journal,
 *     checklist), with items inside each bucket also addedAt DESC.
 */
export function getFavoriteItems(
  inputs: FavoritesAggregatorInputs,
): FavoritesResult {
  const wpById = indexById(inputs.waypoints ?? []);
  const trById = indexById(inputs.tracks ?? []);
  const mkById = indexById(inputs.markups ?? []);
  const jeById = indexById(inputs.journalEntries ?? []);
  const gcById = indexById(inputs.checklists ?? []);

  const items: FavoriteItem[] = [];
  let staleCount = 0;

  for (const ref of inputs.favorites) {
    switch (ref.kind) {
      case 'waypoint': {
        const item = wpById.get(ref.id);
        if (item) items.push({ kind: 'waypoint', addedAt: ref.addedAt, item });
        else staleCount += 1;
        break;
      }
      case 'track': {
        const item = trById.get(ref.id);
        if (item) items.push({ kind: 'track', addedAt: ref.addedAt, item });
        else staleCount += 1;
        break;
      }
      case 'markup': {
        const item = mkById.get(ref.id);
        if (item) items.push({ kind: 'markup', addedAt: ref.addedAt, item });
        else staleCount += 1;
        break;
      }
      case 'journal': {
        const item = jeById.get(ref.id);
        if (item) items.push({ kind: 'journal', addedAt: ref.addedAt, item });
        else staleCount += 1;
        break;
      }
      case 'checklist': {
        const item = gcById.get(ref.id);
        if (item) items.push({ kind: 'checklist', addedAt: ref.addedAt, item });
        else staleCount += 1;
        break;
      }
    }
  }

  // Most-recently-starred first.
  items.sort((a, b) => (a.addedAt < b.addedAt ? 1 : -1));

  // Group by kind in fixed display order.
  const byKind = new Map<FavoriteKind, FavoriteItem[]>();
  for (const it of items) {
    const arr = byKind.get(it.kind) ?? [];
    arr.push(it);
    byKind.set(it.kind, arr);
  }
  const buckets: FavoriteKindBucket[] = KIND_ORDER.filter((k) =>
    byKind.has(k),
  ).map((k) => ({
    kind: k,
    label: KIND_LABEL[k],
    items: byKind.get(k) ?? [],
  }));

  return {
    items,
    buckets,
    totalCount: items.length,
    staleCount,
  };
}

/**
 * Convenience: count of LIVE favorites (excludes stale refs that no
 * longer match a row). Used to badge the FV HubRow on PersonalHubScreen.
 */
export function liveFavoriteCount(
  inputs: FavoritesAggregatorInputs,
): number {
  return getFavoriteItems(inputs).totalCount;
}
