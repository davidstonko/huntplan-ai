/**
 * UserWaypointContext — CRUD + persistence for personal waypoints.
 *
 * Owns the single source of truth for UserWaypoints across the app.
 * Consumers call `useUserWaypoints()` and receive a contract that hides
 * AsyncStorage I/O behind Promise-returning mutators.
 *
 * Design choices:
 *
 *   - Hydrate once on mount (`loadAll` from userWaypointStorage), then
 *     keep the canonical array in React state. Every mutation produces
 *     a new array (immutable update) and fires a save.
 *
 *   - The context exposes helpers that pre-filter by mode
 *     (`waypointsForMode`) so callers on the Hunt map don't accidentally
 *     render Fish pins. Callers never get the raw array unless they
 *     explicitly ask for `allWaypoints`.
 *
 *   - Saves are fire-and-forget from the caller's perspective. The
 *     context awaits internally so a rapid-fire sequence of edits can't
 *     race each other on AsyncStorage, but callers receive the updated
 *     waypoint (or null on not-found) immediately from the in-memory
 *     state.
 *
 *   - ID + timestamp generation lives here, not at the call site, so
 *     every waypoint in the store is guaranteed to have a valid ISO
 *     timestamp and a unique-ish ID regardless of which screen created
 *     it.
 *
 *   - `hydrated` is exposed so UI can skip rendering "No waypoints yet"
 *     before the initial load resolves (prevents a flash of empty
 *     state on cold start).
 *
 * Added 2026-04-24 per V2_3_FEATURE_EXPANSION_PLAN §3 / Phase A.1.
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
import {
  UserWaypoint,
  WaypointMode,
} from '../types/userWaypoint';
import {
  loadAll as storageLoadAll,
  saveAll as storageSaveAll,
  clearAll as storageClearAll,
} from '../services/userWaypointStorage';

/**
 * Shape accepted by `addWaypoint`. Callers supply the meaningful fields;
 * the context fills in `id`, `createdAt`, and `updatedAt`. `photoUris`
 * defaults to `[]` if the caller omits it.
 */
export type NewWaypointInput = Omit<
  UserWaypoint,
  'id' | 'createdAt' | 'updatedAt' | 'photoUris'
> & {
  photoUris?: string[];
};

/**
 * Shape accepted by `updateWaypoint`. Everything except the immutable
 * identity fields is patchable.
 */
export type WaypointPatch = Partial<
  Omit<UserWaypoint, 'id' | 'createdAt'>
>;

interface UserWaypointContextValue {
  /** Every personal waypoint across all four modes. */
  allWaypoints: UserWaypoint[];
  /** True once the initial AsyncStorage load has resolved. */
  hydrated: boolean;
  /** Return only the waypoints belonging to a given mode. */
  waypointsForMode: (mode: WaypointMode) => UserWaypoint[];
  /** Look up a single waypoint by id. Returns `null` if not found. */
  getWaypoint: (id: string) => UserWaypoint | null;
  /**
   * Create a new waypoint. Returns the stored row (with id + timestamps
   * filled in). Persists to AsyncStorage; errors are swallowed (logged
   * by the storage layer).
   */
  addWaypoint: (input: NewWaypointInput) => Promise<UserWaypoint>;
  /**
   * Patch an existing waypoint. Returns the updated row or `null` if
   * the id did not match any known waypoint. `updatedAt` is always
   * refreshed on successful patch.
   */
  updateWaypoint: (
    id: string,
    patch: WaypointPatch,
  ) => Promise<UserWaypoint | null>;
  /**
   * Remove a waypoint. No-op if the id does not match. Returns `true`
   * if a row was actually deleted.
   */
  deleteWaypoint: (id: string) => Promise<boolean>;
  /**
   * Wipe every waypoint. Intended for a Settings "reset on-device data"
   * affordance and for dev/test reset. The UI should confirm before
   * calling this.
   */
  clearAllWaypoints: () => Promise<void>;
}

const UserWaypointContext = createContext<UserWaypointContextValue | null>(null);

/**
 * Roughly-unique id generator. Mirrors the scout/deercamp helpers so
 * all three systems use the same shape (36-base timestamp + random).
 * Not cryptographically unique — good enough for on-device rows with
 * a creating-user count of one.
 */
function generateId(): string {
  return (
    Date.now().toString(36) + Math.random().toString(36).slice(2, 11)
  );
}

/**
 * ISO 8601 timestamp helper. Pulled into a named function so tests can
 * stub `Date.now()` via jest fake timers without also needing to
 * monkey-patch toISOString.
 */
function nowIso(): string {
  return new Date().toISOString();
}

interface Props {
  children: ReactNode;
}

export function UserWaypointProvider({ children }: Props) {
  const [allWaypoints, setAllWaypoints] = useState<UserWaypoint[]>([]);
  const [hydrated, setHydrated] = useState(false);

  // Keep a ref to the latest array so callbacks (closed over at mount)
  // can safely compute patches against the newest state without adding
  // `allWaypoints` to their dep arrays (which would recreate them on
  // every mutation).
  const latestRef = useRef<UserWaypoint[]>([]);
  useEffect(() => {
    latestRef.current = allWaypoints;
  }, [allWaypoints]);

  // Hydrate on mount.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const loaded = await storageLoadAll();
      if (cancelled) return;
      setAllWaypoints(loaded);
      setHydrated(true);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  /** Persist the given array and update in-memory state. */
  const commit = useCallback(async (next: UserWaypoint[]) => {
    setAllWaypoints(next);
    latestRef.current = next;
    await storageSaveAll(next);
  }, []);

  const waypointsForMode = useCallback(
    (mode: WaypointMode) =>
      latestRef.current.filter((w) => w.mode === mode),
    [],
  );

  const getWaypoint = useCallback((id: string) => {
    return latestRef.current.find((w) => w.id === id) ?? null;
  }, []);

  const addWaypoint = useCallback(
    async (input: NewWaypointInput): Promise<UserWaypoint> => {
      const ts = nowIso();
      const wp: UserWaypoint = {
        id: generateId(),
        createdAt: ts,
        updatedAt: ts,
        mode: input.mode,
        category: input.category,
        title: input.title,
        notes: input.notes,
        lat: input.lat,
        lng: input.lng,
        photoUris: input.photoUris ?? [],
        colorOverride: input.colorOverride,
      };
      const next = [wp, ...latestRef.current];
      await commit(next);
      return wp;
    },
    [commit],
  );

  const updateWaypoint = useCallback(
    async (
      id: string,
      patch: WaypointPatch,
    ): Promise<UserWaypoint | null> => {
      const current = latestRef.current;
      const idx = current.findIndex((w) => w.id === id);
      if (idx < 0) return null;
      const merged: UserWaypoint = {
        ...current[idx],
        ...patch,
        id: current[idx].id, // preserve immutable identity fields
        createdAt: current[idx].createdAt,
        updatedAt: nowIso(),
      };
      const next = [...current];
      next[idx] = merged;
      await commit(next);
      return merged;
    },
    [commit],
  );

  const deleteWaypoint = useCallback(
    async (id: string): Promise<boolean> => {
      const current = latestRef.current;
      const next = current.filter((w) => w.id !== id);
      if (next.length === current.length) return false;
      await commit(next);
      return true;
    },
    [commit],
  );

  const clearAllWaypoints = useCallback(async () => {
    await storageClearAll();
    setAllWaypoints([]);
    latestRef.current = [];
  }, []);

  const value = useMemo<UserWaypointContextValue>(
    () => ({
      allWaypoints,
      hydrated,
      waypointsForMode,
      getWaypoint,
      addWaypoint,
      updateWaypoint,
      deleteWaypoint,
      clearAllWaypoints,
    }),
    [
      allWaypoints,
      hydrated,
      waypointsForMode,
      getWaypoint,
      addWaypoint,
      updateWaypoint,
      deleteWaypoint,
      clearAllWaypoints,
    ],
  );

  return (
    <UserWaypointContext.Provider value={value}>
      {children}
    </UserWaypointContext.Provider>
  );
}

/**
 * Hook for consuming the UserWaypointContext. Throws if called outside
 * a <UserWaypointProvider> so misuse fails loudly in development
 * instead of silently returning stale/defaulted data.
 */
export function useUserWaypoints(): UserWaypointContextValue {
  const ctx = useContext(UserWaypointContext);
  if (!ctx) {
    throw new Error(
      'useUserWaypoints must be called from a descendant of <UserWaypointProvider>.',
    );
  }
  return ctx;
}
