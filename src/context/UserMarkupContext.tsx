/**
 * UserMarkupContext — CRUD + persistence for personal LineString and
 * Polygon markups (V2_3 §D.2).
 *
 * Mirrors UserWaypointContext: hydrate-on-mount, mode-pre-filter helper,
 * fire-and-forget commits to a separate AsyncStorage key. Kept distinct
 * from waypoints so the Point schema stays stable and shape-aware
 * tooling (draw UI, KML/GPX export) only has to reason about lines and
 * polygons.
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
  UserMarkup,
  LineStringMarkup,
  PolygonMarkup,
  closePolygon,
} from '../types/userMarkup';
import type { WaypointMode } from '../types/userWaypoint';
import {
  loadAll as storageLoadAll,
  saveAll as storageSaveAll,
  clearAll as storageClearAll,
} from '../services/userMarkupStorage';

/**
 * Shape accepted by `addMarkup`. Caller supplies the meaningful fields;
 * the context fills in `id`, `createdAt`, `updatedAt`, and defaults
 * `photoUris` to `[]`.
 *
 * NOTE: This is a true discriminated union over `shapeType` so the
 * `coordinates` field stays correlated with `shapeType` after `Omit`.
 * Collapsing to `Omit<UserMarkup, ...>` would distribute the omit and
 * drop the discrimination, leaving `coordinates: LineStringCoords |
 * PolygonCoords` regardless of `shapeType`.
 */
export type NewMarkupInput =
  | (Omit<
      LineStringMarkup,
      'id' | 'createdAt' | 'updatedAt' | 'photoUris'
    > & { photoUris?: string[] })
  | (Omit<
      PolygonMarkup,
      'id' | 'createdAt' | 'updatedAt' | 'photoUris'
    > & { photoUris?: string[] });

/**
 * Patchable fields. Identity (`id`, `createdAt`) is preserved across an
 * update; everything else can be replaced including the geometry.
 */
export type MarkupPatch = Partial<Omit<UserMarkup, 'id' | 'createdAt'>>;

interface UserMarkupContextValue {
  allMarkups: UserMarkup[];
  hydrated: boolean;
  markupsForMode: (mode: WaypointMode) => UserMarkup[];
  getMarkup: (id: string) => UserMarkup | null;
  addMarkup: (input: NewMarkupInput) => Promise<UserMarkup>;
  updateMarkup: (
    id: string,
    patch: MarkupPatch,
  ) => Promise<UserMarkup | null>;
  deleteMarkup: (id: string) => Promise<boolean>;
  clearAllMarkups: () => Promise<void>;
}

const UserMarkupContext = createContext<UserMarkupContextValue | null>(null);

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 11);
}

function nowIso(): string {
  return new Date().toISOString();
}

interface Props {
  children: ReactNode;
}

export function UserMarkupProvider({ children }: Props) {
  const [allMarkups, setAllMarkups] = useState<UserMarkup[]>([]);
  const [hydrated, setHydrated] = useState(false);

  const latestRef = useRef<UserMarkup[]>([]);
  useEffect(() => {
    latestRef.current = allMarkups;
  }, [allMarkups]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const loaded = await storageLoadAll();
      if (cancelled) return;
      setAllMarkups(loaded);
      setHydrated(true);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const commit = useCallback(async (next: UserMarkup[]) => {
    setAllMarkups(next);
    latestRef.current = next;
    await storageSaveAll(next);
  }, []);

  const markupsForMode = useCallback(
    (mode: WaypointMode) =>
      latestRef.current.filter((m) => m.mode === mode),
    [],
  );

  const getMarkup = useCallback((id: string) => {
    return latestRef.current.find((m) => m.id === id) ?? null;
  }, []);

  const addMarkup = useCallback(
    async (input: NewMarkupInput): Promise<UserMarkup> => {
      const ts = nowIso();
      // Polygons get defensively closed so a misbehaving draw UI can't
      // produce an unclosed ring that fails isValidMarkup on next load.
      const photoUris = input.photoUris ?? [];
      let markup: UserMarkup;
      if (input.shapeType === 'Polygon') {
        markup = {
          id: generateId(),
          createdAt: ts,
          updatedAt: ts,
          mode: input.mode,
          title: input.title,
          notes: input.notes,
          color: input.color,
          photoUris,
          shapeType: 'Polygon',
          coordinates: closePolygon(input.coordinates),
        };
      } else {
        markup = {
          id: generateId(),
          createdAt: ts,
          updatedAt: ts,
          mode: input.mode,
          title: input.title,
          notes: input.notes,
          color: input.color,
          photoUris,
          shapeType: 'LineString',
          coordinates: input.coordinates,
        };
      }
      const next = [markup, ...latestRef.current];
      await commit(next);
      return markup;
    },
    [commit],
  );

  const updateMarkup = useCallback(
    async (
      id: string,
      patch: MarkupPatch,
    ): Promise<UserMarkup | null> => {
      const current = latestRef.current;
      const idx = current.findIndex((m) => m.id === id);
      if (idx < 0) return null;
      const target = current[idx];
      // The discriminated union forces us to reconstruct by shapeType;
      // straight spread {...target, ...patch} would lose narrowing.
      const merged = {
        ...target,
        ...patch,
        id: target.id,
        createdAt: target.createdAt,
        updatedAt: nowIso(),
        // `shapeType` cannot change once authored — hold the line even if
        // a caller tries to patch it.
        shapeType: target.shapeType,
      } as UserMarkup;
      const next = [...current];
      next[idx] = merged;
      await commit(next);
      return merged;
    },
    [commit],
  );

  const deleteMarkup = useCallback(
    async (id: string): Promise<boolean> => {
      const current = latestRef.current;
      const next = current.filter((m) => m.id !== id);
      if (next.length === current.length) return false;
      await commit(next);
      return true;
    },
    [commit],
  );

  const clearAllMarkups = useCallback(async () => {
    await storageClearAll();
    setAllMarkups([]);
    latestRef.current = [];
  }, []);

  const value = useMemo<UserMarkupContextValue>(
    () => ({
      allMarkups,
      hydrated,
      markupsForMode,
      getMarkup,
      addMarkup,
      updateMarkup,
      deleteMarkup,
      clearAllMarkups,
    }),
    [
      allMarkups,
      hydrated,
      markupsForMode,
      getMarkup,
      addMarkup,
      updateMarkup,
      deleteMarkup,
      clearAllMarkups,
    ],
  );

  return (
    <UserMarkupContext.Provider value={value}>
      {children}
    </UserMarkupContext.Provider>
  );
}

export function useUserMarkups(): UserMarkupContextValue {
  const ctx = useContext(UserMarkupContext);
  if (!ctx) {
    throw new Error(
      'useUserMarkups must be called from a descendant of <UserMarkupProvider>.',
    );
  }
  return ctx;
}
