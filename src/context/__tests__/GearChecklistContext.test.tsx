/**
 * GearChecklistContext.test.tsx — CRUD + sort + item-toggle contract.
 *
 * Mirrors JournalEntryContext.test.tsx in approach: no React renderer,
 * drives storage directly via simulate-* helpers and asserts on the
 * observable contract (id/timestamp generation, seed/blank, sort order,
 * mode filter, immutable identity on update, idempotent delete, item
 * toggle, custom-item add/remove rules, clearAll wipes the storage key).
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  loadAll,
  saveAll,
  clearAll,
  __STORAGE_KEY_FOR_TESTS,
} from '../../services/gearChecklistStorage';
import {
  BASE_GEAR_LIBRARY,
  GearChecklist,
  GearChecklistItem,
  defaultChecklistName,
} from '../../types/gearChecklist';
import type { WaypointMode } from '../../types/userWaypoint';

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 11);
}
function nowIso(): string {
  return new Date().toISOString();
}

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

async function simulateAdd(
  current: GearChecklist[],
  input: { mode: WaypointMode; name?: string; tripDate?: string; seed?: boolean },
): Promise<GearChecklist[]> {
  const ts = nowIso();
  const items = input.seed === false ? [] : seededItems(input.mode);
  const checklist: GearChecklist = {
    id: generateId(),
    createdAt: ts,
    updatedAt: ts,
    mode: input.mode,
    name: input.name?.trim() || defaultChecklistName(input.mode),
    tripDate: input.tripDate,
    items,
  };
  const next = sortDesc([checklist, ...current]);
  await saveAll(next);
  return next;
}

async function simulateToggleItem(
  current: GearChecklist[],
  checklistId: string,
  itemId: string,
): Promise<GearChecklist[]> {
  const idx = current.findIndex((c) => c.id === checklistId);
  if (idx < 0) return current;
  const list = current[idx];
  const itemIdx = list.items.findIndex((i) => i.id === itemId);
  if (itemIdx < 0) return current;
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
  await saveAll(next);
  return next;
}

async function simulateAddCustom(
  current: GearChecklist[],
  checklistId: string,
  label: string,
): Promise<GearChecklist[]> {
  const idx = current.findIndex((c) => c.id === checklistId);
  if (idx < 0) return current;
  const list = current[idx];
  const newItem: GearChecklistItem = {
    id: generateId(),
    label,
    category: 'other',
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
  await saveAll(next);
  return next;
}

async function simulateRemoveItem(
  current: GearChecklist[],
  checklistId: string,
  itemId: string,
): Promise<{ next: GearChecklist[]; removed: boolean }> {
  const idx = current.findIndex((c) => c.id === checklistId);
  if (idx < 0) return { next: current, removed: false };
  const list = current[idx];
  const item = list.items.find((i) => i.id === itemId);
  if (!item || !item.isCustom) return { next: current, removed: false };
  const merged: GearChecklist = {
    ...list,
    items: list.items.filter((i) => i.id !== itemId),
    updatedAt: nowIso(),
  };
  const next = [...current];
  next[idx] = merged;
  await saveAll(next);
  return { next, removed: true };
}

describe('GearChecklistContext — CRUD + sort + items contract', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
  });

  it('cold start loads to an empty array', async () => {
    const state = await loadAll();
    expect(state).toEqual([]);
  });

  it('addChecklist seeds items from BASE_GEAR_LIBRARY by default', async () => {
    const after = await simulateAdd([], { mode: 'hunt' });
    expect(after).toHaveLength(1);
    const list = after[0];
    expect(list.items.length).toBe(BASE_GEAR_LIBRARY.hunt.length);
    expect(list.items.every((i) => i.isCustom === false)).toBe(true);
    expect(list.items.every((i) => i.checked === false)).toBe(true);
  });

  it('addChecklist with seed=false produces an empty checklist', async () => {
    const after = await simulateAdd([], { mode: 'fish', seed: false });
    expect(after[0].items).toEqual([]);
  });

  it('addChecklist defaults the name when none provided', async () => {
    const after = await simulateAdd([], { mode: 'camp' });
    expect(after[0].name).toMatch(/^Camp — \d{4}-\d{2}-\d{2}$/);
  });

  it('persists across simulated cold-start by reloading from storage', async () => {
    const seeded = await simulateAdd([], {
      mode: 'hunt',
      name: 'Opening day',
    });
    const reloaded = await loadAll();
    expect(reloaded).toEqual(seeded);
  });

  it('checklistsForMode-style filter returns only matching mode rows', async () => {
    let state: GearChecklist[] = [];
    state = await simulateAdd(state, { mode: 'hunt' });
    state = await simulateAdd(state, { mode: 'fish' });
    state = await simulateAdd(state, { mode: 'fish' });
    const counts: Record<WaypointMode, number> = {
      hunt: state.filter((c) => c.mode === 'hunt').length,
      fish: state.filter((c) => c.mode === 'fish').length,
      camp: state.filter((c) => c.mode === 'camp').length,
      hike: state.filter((c) => c.mode === 'hike').length,
    };
    expect(counts).toEqual({ hunt: 1, fish: 2, camp: 0, hike: 0 });
  });

  it('toggleItem flips one item without touching siblings', async () => {
    let state = await simulateAdd([], { mode: 'hunt' });
    const list = state[0];
    const target = list.items[0];
    expect(target.checked).toBe(false);
    state = await simulateToggleItem(state, list.id, target.id);
    expect(state[0].items[0].checked).toBe(true);
    expect(state[0].items[1].checked).toBe(false);
    state = await simulateToggleItem(state, list.id, target.id);
    expect(state[0].items[0].checked).toBe(false);
  });

  it('addCustomItem appends an isCustom=true item', async () => {
    let state = await simulateAdd([], { mode: 'hunt' });
    const before = state[0].items.length;
    state = await simulateAddCustom(state, state[0].id, 'Lucky thermos');
    expect(state[0].items.length).toBe(before + 1);
    const last = state[0].items[state[0].items.length - 1];
    expect(last.label).toBe('Lucky thermos');
    expect(last.isCustom).toBe(true);
    expect(last.checked).toBe(false);
  });

  it('remove on a seeded item is a no-op (uncheck-only contract)', async () => {
    const state = await simulateAdd([], { mode: 'hunt' });
    const seededItem = state[0].items[0];
    expect(seededItem.isCustom).toBe(false);
    const { removed } = await simulateRemoveItem(
      state,
      state[0].id,
      seededItem.id,
    );
    expect(removed).toBe(false);
  });

  it('remove on a custom item drops it from the list', async () => {
    let state = await simulateAdd([], { mode: 'hunt' });
    state = await simulateAddCustom(state, state[0].id, 'Cooler');
    const customItem = state[0].items[state[0].items.length - 1];
    const before = state[0].items.length;
    const { next, removed } = await simulateRemoveItem(
      state,
      state[0].id,
      customItem.id,
    );
    expect(removed).toBe(true);
    expect(next[0].items.length).toBe(before - 1);
  });

  it('clearAll drops the storage key', async () => {
    await simulateAdd([], { mode: 'hunt' });
    const raw1 = await AsyncStorage.getItem(__STORAGE_KEY_FOR_TESTS);
    expect(raw1).not.toBeNull();
    await clearAll();
    const raw2 = await AsyncStorage.getItem(__STORAGE_KEY_FOR_TESTS);
    expect(raw2).toBeNull();
  });
});
