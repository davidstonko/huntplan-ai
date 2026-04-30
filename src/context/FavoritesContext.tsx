/**
 * FavoritesContext — CRUD + persistence for the cross-mode favorites set.
 *
 * Hydrate-once on mount, commit-on-mutation through the storage facade,
 * expose a `Set<string>` of composite keys for O(1) `isFavorite` checks
 * from any row in any list screen.
 *
 * The set is intentionally cross-mode: a user starring a hunt stand and
 * a fish hole gets both in one Favorites screen. Per-mode filtering
 * happens at the aggregator/screen level if it's needed.
 *
 * V2_3_FEATURE_EXPANSION_PLAN — Phase A.16.
 */

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  ReactNode,
} from 'react';
import { FavoriteRef, FavoriteKind, favoriteKey } from '../types/favorite';
import {
  loadAll as storageLoadAll,
  saveAll as storageSaveAll,
  clearAll as storageClearAll,
} from '../services/favoritesStorage';

interface FavoritesContextValue {
  /** Every favorite, sorted most-recently-starred first. */
  favorites: FavoriteRef[];
  /** True once the initial AsyncStorage load has resolved. */
  hydrated: boolean;
  /** O(1) check — is this row currently starred? */
  isFavorite: (kind: FavoriteKind, id: string) => boolean;
  /** Toggle the star on a row. Returns the new state (true = starred). */
  toggleFavorite: (kind: FavoriteKind, id: string) => Promise<boolean>;
  /** Remove without toggling — idempotent (no-op if not starred). */
  removeFavorite: (kind: FavoriteKind, id: string) => Promise<void>;
  /** All favorites of a single kind. */
  favoritesByKind: (kind: FavoriteKind) => FavoriteRef[];
  /** Total count across all kinds. */
  favoritesCount: number;
  /** Wipe every favorite. Settings "reset on-device data" affordance. */
  clearAllFavorites: () => Promise<void>;
}

const FavoritesContext = createContext<FavoritesContextValue | null>(null);

function nowIso(): string {
  return new Date().toISOString();
}

/**
 * Sort favorites most-recently-starred first. Pure function — caller
 * passes a fresh array; we don't mutate.
 */
function sortDesc(favs: FavoriteRef[]): FavoriteRef[] {
  return [...favs].sort((a, b) => (a.addedAt < b.addedAt ? 1 : -1));
}

interface Props {
  children: ReactNode;
}

export function FavoritesProvider({ children }: Props) {
  const [favorites, setFavorites] = useState<FavoriteRef[]>([]);
  const [hydrated, setHydrated] = useState(false);

  const latestRef = useRef<FavoriteRef[]>([]);
  useEffect(() => {
    latestRef.current = favorites;
  }, [favorites]);

  // O(1) lookup index — rebuilt on every favorites change. Cheaper than
  // a Set inside `isFavorite` because consumers call it from row render
  // paths and we don't want to recreate a Set per call.
  const indexRef = useRef<Set<string>>(new Set());
  useEffect(() => {
    indexRef.current = new Set(favorites.map((f) => favoriteKey(f.kind, f.id)));
  }, [favorites]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const loaded = await storageLoadAll();
      if (cancelled) return;
      const sorted = sortDesc(loaded);
      setFavorites(sorted);
      latestRef.current = sorted;
      indexRef.current = new Set(
        sorted.map((f) => favoriteKey(f.kind, f.id)),
      );
      setHydrated(true);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const commit = useCallback(async (next: FavoriteRef[]) => {
    const sorted = sortDesc(next);
    setFavorites(sorted);
    latestRef.current = sorted;
    indexRef.current = new Set(
      sorted.map((f) => favoriteKey(f.kind, f.id)),
    );
    await storageSaveAll(sorted);
  }, []);

  const isFavorite = useCallback(
    (kind: FavoriteKind, id: string) =>
      indexRef.current.has(favoriteKey(kind, id)),
    [],
  );

  const toggleFavorite = useCallback(
    async (kind: FavoriteKind, id: string): Promise<boolean> => {
      const key = favoriteKey(kind, id);
      const current = latestRef.current;
      const exists = current.some((f) => favoriteKey(f.kind, f.id) === key);
      if (exists) {
        const next = current.filter(
          (f) => favoriteKey(f.kind, f.id) !== key,
        );
        await commit(next);
        return false;
      }
      const ref: FavoriteRef = { kind, id, addedAt: nowIso() };
      const next = [ref, ...current];
      await commit(next);
      return true;
    },
    [commit],
  );

  const removeFavorite = useCallback(
    async (kind: FavoriteKind, id: string) => {
      const key = favoriteKey(kind, id);
      const current = latestRef.current;
      const next = current.filter((f) => favoriteKey(f.kind, f.id) !== key);
      if (next.length === current.length) return;
      await commit(next);
    },
    [commit],
  );

  const favoritesByKind = useCallback(
    (kind: FavoriteKind) => latestRef.current.filter((f) => f.kind === kind),
    [],
  );

  const clearAllFavorites = useCallback(async () => {
    await storageClearAll();
    setFavorites([]);
    latestRef.current = [];
    indexRef.current = new Set();
  }, []);

  const value = useMemo<FavoritesContextValue>(
    () => ({
      favorites,
      hydrated,
      isFavorite,
      toggleFavorite,
      removeFavorite,
      favoritesByKind,
      favoritesCount: favorites.length,
      clearAllFavorites,
    }),
    [
      favorites,
      hydrated,
      isFavorite,
      toggleFavorite,
      removeFavorite,
      favoritesByKind,
      clearAllFavorites,
    ],
  );

  return (
    <FavoritesContext.Provider value={value}>
      {children}
    </FavoritesContext.Provider>
  );
}

/**
 * Consume the FavoritesContext. Throws if called outside a
 * <FavoritesProvider> so misuse fails loudly during development.
 */
export function useFavorites(): FavoritesContextValue {
  const ctx = useContext(FavoritesContext);
  if (!ctx) {
    throw new Error(
      'useFavorites must be called from a descendant of <FavoritesProvider>.',
    );
  }
  return ctx;
}
