/**
 * favorite.ts — types for the Personal Layer "favorites / pinned" set.
 *
 * A favorite is a tiny cross-mode reference: just `{kind, id, addedAt}`.
 * It does NOT duplicate the underlying row — the aggregator joins back
 * to the live waypoint/track/markup/journal/checklist arrays so a
 * favorited item that's been edited surfaces with its current title,
 * subtitle, color, etc.
 *
 * Why a separate set instead of a `favorited: boolean` column on each
 * underlying type:
 *   - The 5 layer types are owned by 5 different storage modules; adding
 *     a column to each one means touching 5 storage migrations and 5
 *     edit screens for what should be a single cross-cutting concern.
 *   - Favorites are by definition cross-mode (a "Pinned" tab should mix
 *     a hunt stand with a fish hole with a hike trail), so the data
 *     belongs in its own context regardless.
 *
 * V2_3_FEATURE_EXPANSION_PLAN — Phase A.16.
 */

/**
 * Which personal-layer kind this favorite points at. Mirrors the
 * polymorphic discriminator used throughout the personal-layer
 * aggregators (recentActivity, onThisDay, personalSearch, etc.) so the
 * detail-screen routing logic stays uniform.
 */
export type FavoriteKind =
  | 'waypoint'
  | 'track'
  | 'markup'
  | 'journal'
  | 'checklist';

/**
 * A single favorite reference. The `(kind, id)` pair is the natural key —
 * an `id` is only unique within a kind (waypoint and track ids both come
 * from the same generator, so they can collide across kinds in the
 * abstract). `addedAt` is the ISO timestamp the user starred the row;
 * the Favorites screen sorts most-recent-starred first by default.
 */
export interface FavoriteRef {
  kind: FavoriteKind;
  id: string;
  addedAt: string; // ISO 8601
}

/** Convenience: stable composite key for Set/Map lookups. */
export function favoriteKey(kind: FavoriteKind, id: string): string {
  return `${kind}:${id}`;
}
