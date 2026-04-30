/**
 * GearChecklistContext — CRUD + persistence for the pre-trip gear checklist.
 *
 * Mirrors JournalEntryContext. Hydrate-once on mount, commit-on-mutation
 * through gearChecklistStorage, expose helpers pre-filtered by mode.
 *
 * Sort order: descending by `tripDate` if present, else descending by
 * `updatedAt`. The list is "what trips am I planning / what was I just
 * working on" rather than chronological history.
 *
 * Phase A.6 — added 2026-04-24 per V2_3_FEATURE_EXPANSION_PLAN.
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
  GearChecklist,
  GearChecklistItem,
  BASE_GEAR_LIBRARY,
  defaultChecklistName,
} from '../types/gearChecklist';
import type { WaypointMode } from '../types/userWaypoint';
import {
  loadAll as storageLoadAll,
  saveAll as storageSaveAll,
  clearAll as storageClearAll,
} from '../services/gearChecklistStorage';

export interface NewChecklistInput {
  mode: WaypointMode;
  /** Defaults to `defaultChecklistName(mode)` if empty/missing. */
  name?: string;
  /** Optional planned trip date (YYYY-MM-DD). */
  tripDate?: string;
  /**
   * If true (default), seed the new checklist from BASE_GEAR_LIBRARY for
   * the mode. Pass false for a blank canvas.
   */
  seed?: boolean;
}

export type ChecklistPatch = Partial<
  Omit<GearChecklist, 'id' | 'createdAt' | 'mode' | 'items'>
>;

interface GearChecklistContextValue {
  allChecklists: GearChecklist[];
  hydrated: boolean;
  checklistsForMode: (mode: WaypointMode) => GearChecklist[];
  getChecklist: (id: string) => GearChecklist | null;
  addChecklist: (input: NewChecklistInput) => Promise<GearChecklist>;
  updateChecklist: (
    id: string,
    patch: ChecklistPatch,
  ) => Promise<GearChecklist | null>;
  deleteChecklist: (id: string) => Promise<boolean>;
  /** Toggle one item's checked state. No-op if id miss. */
  toggleItem: (
    checklistId: string,
    itemId: string,
  ) => Promise<GearChecklist | null>;
  /** Append a user-typed custom item. */
  addCustomItem: (
    checklistId: string,
    label: string,
    category?: GearChecklistItem['category'],
  ) => Promise<GearChecklist | null>;
  /** Remove a custom item. Seeded items can only be unchecked, not removed. */
  removeCustomItem: (
    checklistId: string,
    itemId: string,
  ) => Promise<GearChecklist | null>;
  clearAllChecklists: () => Promise<void>;
}

const GearChecklistContext =
  createContext<GearChecklistContextValue | null>(null);

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 11);
}

function nowIso(): string {
  return new Date().toISOString();
}

/**
 * Sort: tripDate desc (rows w/ tripDate first), then updatedAt desc.
 * Most-soon trip surfaces first; if no trip date, recently-edited bubbles.
 */
function sortDesc(checklists: GearChecklist[]): GearChecklist[] {
  return [...checklists].sort((a, b) => {
    if (a.tripDate && b.tripDate && a.tripDate !== b.tripDate) {
      return a.tripDate < b.tripDate ? 1 : -1;
    }
    if (a.tripDate && !b.tripDate) return -1;
    if (!a.tripDate && b.tripDate) return 1;
    return a.updatedAt < b.updatedAt ? 1 : -1;
  });
}

function seededItems(mode: WaypointMode): GearChecklistItem[] {
  return BASE_GEAR_LIBRARY[mode].map((seed) => ({
    id: generateId(),
    label: seed.label,
    category: seed.category,
    checked: false,
    isCustom: false,
  }));
}

interface Props {
  children: ReactNode;
}

export function GearChecklistProvider({ children }: Props) {
  const [allChecklists, setAllChecklists] = useState<GearChecklist[]>([]);
  const [hydrated, setHydrated] = useState(false);

  const latestRef = useRef<GearChecklist[]>([]);
  useEffect(() => {
    latestRef.current = allChecklists;
  }, [allChecklists]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const loaded = await storageLoadAll();
      if (cancelled) return;
      const sorted = sortDesc(loaded);
      setAllChecklists(sorted);
      setHydrated(true);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const commit = useCallback(async (next: GearChecklist[]) => {
    const sorted = sortDesc(next);
    setAllChecklists(sorted);
    latestRef.current = sorted;
    await storageSaveAll(sorted);
  }, []);

  const checklistsForMode = useCallback(
    (mode: WaypointMode) =>
      latestRef.current.filter((c) => c.mode === mode),
    [],
  );

  const getChecklist = useCallback(
    (id: string) => latestRef.current.find((c) => c.id === id) ?? null,
    [],
  );

  const addChecklist = useCallback(
    async (input: NewChecklistInput): Promise<GearChecklist> => {
      const ts = nowIso();
      const items =
        input.seed === false ? [] : seededItems(input.mode);
      const checklist: GearChecklist = {
        id: generateId(),
        createdAt: ts,
        updatedAt: ts,
        mode: input.mode,
        name: input.name?.trim() || defaultChecklistName(input.mode),
        tripDate: input.tripDate,
        items,
      };
      const next = [checklist, ...latestRef.current];
      await commit(next);
      return checklist;
    },
    [commit],
  );

  const updateChecklist = useCallback(
    async (
      id: string,
      patch: ChecklistPatch,
    ): Promise<GearChecklist | null> => {
      const current = latestRef.current;
      const idx = current.findIndex((c) => c.id === id);
      if (idx < 0) return null;
      const merged: GearChecklist = {
        ...current[idx],
        ...patch,
        id: current[idx].id,
        createdAt: current[idx].createdAt,
        mode: current[idx].mode,
        items: current[idx].items,
        updatedAt: nowIso(),
      };
      const next = [...current];
      next[idx] = merged;
      await commit(next);
      return merged;
    },
    [commit],
  );

  const deleteChecklist = useCallback(
    async (id: string): Promise<boolean> => {
      const current = latestRef.current;
      const next = current.filter((c) => c.id !== id);
      if (next.length === current.length) return false;
      await commit(next);
      return true;
    },
    [commit],
  );

  const toggleItem = useCallback(
    async (
      checklistId: string,
      itemId: string,
    ): Promise<GearChecklist | null> => {
      const current = latestRef.current;
      const idx = current.findIndex((c) => c.id === checklistId);
      if (idx < 0) return null;
      const list = current[idx];
      const itemIdx = list.items.findIndex((i) => i.id === itemId);
      if (itemIdx < 0) return null;
      const newItems = [...list.items];
      newItems[itemIdx] = {
        ...newItems[itemIdx],
        checked: !newItems[itemIdx].checked,
      };
      const merged: GearChecklist = {
        ...list,
        items: newItems,
        updatedAt: nowIso(),
      };
      const next = [...current];
      next[idx] = merged;
      await commit(next);
      return merged;
    },
    [commit],
  );

  const addCustomItem = useCallback(
    async (
      checklistId: string,
      label: string,
      category: GearChecklistItem['category'] = 'other',
    ): Promise<GearChecklist | null> => {
      const trimmed = label.trim();
      if (!trimmed) return null;
      const current = latestRef.current;
      const idx = current.findIndex((c) => c.id === checklistId);
      if (idx < 0) return null;
      const list = current[idx];
      const newItem: GearChecklistItem = {
        id: generateId(),
        label: trimmed,
        category,
        checked: false,
        isCustom: true,
      };
      const merged: GearChecklist = {
        ...list,
        items: [...list.items, newItem],
        updatedAt: nowIso(),
      };
      const next = [...current];
      next[idx] = merged;
      await commit(next);
      return merged;
    },
    [commit],
  );

  const removeCustomItem = useCallback(
    async (
      checklistId: string,
      itemId: string,
    ): Promise<GearChecklist | null> => {
      const current = latestRef.current;
      const idx = current.findIndex((c) => c.id === checklistId);
      if (idx < 0) return null;
      const list = current[idx];
      const itemIdx = list.items.findIndex((i) => i.id === itemId);
      if (itemIdx < 0) return null;
      // Refuse to remove a seeded item — uncheck it instead.
      if (!list.items[itemIdx].isCustom) return list;
      const merged: GearChecklist = {
        ...list,
        items: list.items.filter((i) => i.id !== itemId),
        updatedAt: nowIso(),
      };
      const next = [...current];
      next[idx] = merged;
      await commit(next);
      return merged;
    },
    [commit],
  );

  const clearAllChecklists = useCallback(async () => {
    await storageClearAll();
    setAllChecklists([]);
    latestRef.current = [];
  }, []);

  const value = useMemo<GearChecklistContextValue>(
    () => ({
      allChecklists,
      hydrated,
      checklistsForMode,
      getChecklist,
      addChecklist,
      updateChecklist,
      deleteChecklist,
      toggleItem,
      addCustomItem,
      removeCustomItem,
      clearAllChecklists,
    }),
    [
      allChecklists,
      hydrated,
      checklistsForMode,
      getChecklist,
      addChecklist,
      updateChecklist,
      deleteChecklist,
      toggleItem,
      addCustomItem,
      removeCustomItem,
      clearAllChecklists,
    ],
  );

  return (
    <GearChecklistContext.Provider value={value}>
      {children}
    </GearChecklistContext.Provider>
  );
}

export function useGearChecklists(): GearChecklistContextValue {
  const ctx = useContext(GearChecklistContext);
  if (!ctx) {
    throw new Error(
      'useGearChecklists must be called from a descendant of <GearChecklistProvider>.',
    );
  }
  return ctx;
}
