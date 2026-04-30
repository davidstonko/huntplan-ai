/**
 * JournalEntryContext — CRUD + persistence for the field journal.
 *
 * Mirrors UserWaypointContext architecturally: hydrate-once on mount,
 * commit-on-mutation through a small storage facade, expose helpers
 * pre-filtered by mode so per-mode list screens never have to filter
 * client-side.
 *
 * Sort order: descending by `entryDate` (then descending by `createdAt`
 * as a tie-breaker). Most-recent-trip-first is the default journal
 * surface for every product I checked. Backfilled entries land where
 * they belong chronologically, not where they were typed.
 *
 * Added 2026-04-24 per V2_3_FEATURE_EXPANSION_PLAN §3 / Phase A.5.
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
import { JournalEntry } from '../types/journalEntry';
import type { WaypointMode } from '../types/userWaypoint';
import {
  loadAll as storageLoadAll,
  saveAll as storageSaveAll,
  clearAll as storageClearAll,
} from '../services/journalEntryStorage';

/**
 * Input shape for `addEntry`. Caller supplies the meaningful fields;
 * the context fills in `id`, `createdAt`, `updatedAt`, and applies
 * defaults for `tags` / `photoUris` if the caller omits them.
 */
export type NewJournalEntryInput = Omit<
  JournalEntry,
  'id' | 'createdAt' | 'updatedAt' | 'tags' | 'photoUris'
> & {
  tags?: string[];
  photoUris?: string[];
};

/**
 * Patch shape for `updateEntry`. Everything except immutable identity
 * fields is mutable.
 */
export type JournalEntryPatch = Partial<
  Omit<JournalEntry, 'id' | 'createdAt'>
>;

interface JournalEntryContextValue {
  /** Every journal entry, sorted most-recent first. */
  allEntries: JournalEntry[];
  /** True once the initial AsyncStorage load has resolved. */
  hydrated: boolean;
  /** Pre-filter helper: return only entries belonging to a mode. */
  entriesForMode: (mode: WaypointMode) => JournalEntry[];
  /** Look up a single entry by id. Returns `null` if not found. */
  getEntry: (id: string) => JournalEntry | null;
  /** Create a new entry. Returns the stored row with id+timestamps filled. */
  addEntry: (input: NewJournalEntryInput) => Promise<JournalEntry>;
  /** Patch an existing entry. Returns the updated row or `null` if id miss. */
  updateEntry: (
    id: string,
    patch: JournalEntryPatch,
  ) => Promise<JournalEntry | null>;
  /** Remove a single entry. Returns `true` if a row was actually deleted. */
  deleteEntry: (id: string) => Promise<boolean>;
  /** Wipe every entry. Settings "reset on-device data" affordance. */
  clearAllEntries: () => Promise<void>;
}

const JournalEntryContext =
  createContext<JournalEntryContextValue | null>(null);

function generateId(): string {
  return (
    Date.now().toString(36) + Math.random().toString(36).slice(2, 11)
  );
}

function nowIso(): string {
  return new Date().toISOString();
}

/**
 * Sort entries most-recent first. Pure function — caller passes a fresh
 * array; we don't mutate. Tie-breaker is `createdAt` so a stack of
 * entries backfilled to the same date stays in stable order.
 */
function sortDesc(entries: JournalEntry[]): JournalEntry[] {
  return [...entries].sort((a, b) => {
    if (a.entryDate !== b.entryDate) {
      return a.entryDate < b.entryDate ? 1 : -1;
    }
    return a.createdAt < b.createdAt ? 1 : -1;
  });
}

interface Props {
  children: ReactNode;
}

export function JournalEntryProvider({ children }: Props) {
  const [allEntries, setAllEntries] = useState<JournalEntry[]>([]);
  const [hydrated, setHydrated] = useState(false);

  const latestRef = useRef<JournalEntry[]>([]);
  useEffect(() => {
    latestRef.current = allEntries;
  }, [allEntries]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const loaded = await storageLoadAll();
      if (cancelled) return;
      const sorted = sortDesc(loaded);
      setAllEntries(sorted);
      setHydrated(true);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const commit = useCallback(async (next: JournalEntry[]) => {
    const sorted = sortDesc(next);
    setAllEntries(sorted);
    latestRef.current = sorted;
    await storageSaveAll(sorted);
  }, []);

  const entriesForMode = useCallback(
    (mode: WaypointMode) => latestRef.current.filter((e) => e.mode === mode),
    [],
  );

  const getEntry = useCallback((id: string) => {
    return latestRef.current.find((e) => e.id === id) ?? null;
  }, []);

  const addEntry = useCallback(
    async (input: NewJournalEntryInput): Promise<JournalEntry> => {
      const ts = nowIso();
      const entry: JournalEntry = {
        id: generateId(),
        createdAt: ts,
        updatedAt: ts,
        entryDate: input.entryDate,
        mode: input.mode,
        title: input.title,
        body: input.body,
        outcome: input.outcome,
        tags: input.tags ?? [],
        lat: input.lat,
        lng: input.lng,
        locationLabel: input.locationLabel,
        weather: input.weather,
        photoUris: input.photoUris ?? [],
      };
      const next = [entry, ...latestRef.current];
      await commit(next);
      return entry;
    },
    [commit],
  );

  const updateEntry = useCallback(
    async (
      id: string,
      patch: JournalEntryPatch,
    ): Promise<JournalEntry | null> => {
      const current = latestRef.current;
      const idx = current.findIndex((e) => e.id === id);
      if (idx < 0) return null;
      const merged: JournalEntry = {
        ...current[idx],
        ...patch,
        id: current[idx].id,
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

  const deleteEntry = useCallback(
    async (id: string): Promise<boolean> => {
      const current = latestRef.current;
      const next = current.filter((e) => e.id !== id);
      if (next.length === current.length) return false;
      await commit(next);
      return true;
    },
    [commit],
  );

  const clearAllEntries = useCallback(async () => {
    await storageClearAll();
    setAllEntries([]);
    latestRef.current = [];
  }, []);

  const value = useMemo<JournalEntryContextValue>(
    () => ({
      allEntries,
      hydrated,
      entriesForMode,
      getEntry,
      addEntry,
      updateEntry,
      deleteEntry,
      clearAllEntries,
    }),
    [
      allEntries,
      hydrated,
      entriesForMode,
      getEntry,
      addEntry,
      updateEntry,
      deleteEntry,
      clearAllEntries,
    ],
  );

  return (
    <JournalEntryContext.Provider value={value}>
      {children}
    </JournalEntryContext.Provider>
  );
}

/**
 * Consume the JournalEntryContext. Throws if called outside a
 * <JournalEntryProvider> so misuse fails loudly during development
 * rather than silently returning defaulted data.
 */
export function useJournalEntries(): JournalEntryContextValue {
  const ctx = useContext(JournalEntryContext);
  if (!ctx) {
    throw new Error(
      'useJournalEntries must be called from a descendant of <JournalEntryProvider>.',
    );
  }
  return ctx;
}
