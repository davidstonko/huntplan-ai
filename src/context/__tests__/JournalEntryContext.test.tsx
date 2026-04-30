/**
 * JournalEntryContext.test.tsx — CRUD + sort-order contract.
 *
 * Mirrors UserWaypointContext.test.tsx in approach: drives AsyncStorage
 * the same way the Provider does (no React renderer needed), and asserts
 * on the observable contract — id/timestamp generation, sort order,
 * mode-filtering, immutable-identity-on-update, idempotent delete, and
 * clearAll wipes the storage key.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  loadAll,
  saveAll,
  clearAll,
  __STORAGE_KEY_FOR_TESTS,
} from '../../services/journalEntryStorage';
import {
  JournalEntry,
} from '../../types/journalEntry';
import type { WaypointMode } from '../../types/userWaypoint';

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 11);
}
function nowIso(): string {
  return new Date().toISOString();
}

/**
 * Sort entries most-recent first by entryDate, with createdAt as the
 * tie-breaker. Mirrors the Provider's `sortDesc`.
 */
function sortDesc(entries: JournalEntry[]): JournalEntry[] {
  return [...entries].sort((a, b) => {
    if (a.entryDate !== b.entryDate) {
      return a.entryDate < b.entryDate ? 1 : -1;
    }
    return a.createdAt < b.createdAt ? 1 : -1;
  });
}

async function simulateAdd(
  current: JournalEntry[],
  input: Omit<
    JournalEntry,
    'id' | 'createdAt' | 'updatedAt' | 'tags' | 'photoUris'
  > & { tags?: string[]; photoUris?: string[] },
): Promise<JournalEntry[]> {
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
  const next = sortDesc([entry, ...current]);
  await saveAll(next);
  return next;
}

async function simulateUpdate(
  current: JournalEntry[],
  id: string,
  patch: Partial<Omit<JournalEntry, 'id' | 'createdAt'>>,
): Promise<{ next: JournalEntry[]; merged: JournalEntry | null }> {
  const idx = current.findIndex((e) => e.id === id);
  if (idx < 0) return { next: current, merged: null };
  const merged: JournalEntry = {
    ...current[idx],
    ...patch,
    id: current[idx].id,
    createdAt: current[idx].createdAt,
    updatedAt: nowIso(),
  };
  const updated = [...current];
  updated[idx] = merged;
  const next = sortDesc(updated);
  await saveAll(next);
  return { next, merged };
}

async function simulateDelete(
  current: JournalEntry[],
  id: string,
): Promise<{ next: JournalEntry[]; deleted: boolean }> {
  const next = current.filter((e) => e.id !== id);
  if (next.length === current.length) {
    return { next: current, deleted: false };
  }
  await saveAll(next);
  return { next, deleted: true };
}

describe('JournalEntryContext — CRUD + sort contract', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
  });

  it('cold start loads to an empty array', async () => {
    const state = await loadAll();
    expect(state).toEqual([]);
  });

  it('addEntry fills id, createdAt, updatedAt and defaults tags/photoUris', async () => {
    const after = await simulateAdd([], {
      entryDate: '2026-04-24',
      mode: 'hunt',
      title: 'Morning sit',
      body: 'Saw a doe at first light.',
      outcome: 'sighting',
    });
    expect(after).toHaveLength(1);
    const row = after[0];
    expect(row.id).toBeTruthy();
    expect(row.createdAt).toBe(row.updatedAt);
    expect(new Date(row.createdAt).toString()).not.toBe('Invalid Date');
    expect(row.tags).toEqual([]);
    expect(row.photoUris).toEqual([]);
  });

  it('sorts most-recent entryDate first regardless of insertion order', async () => {
    let state: JournalEntry[] = [];
    state = await simulateAdd(state, {
      entryDate: '2026-04-10',
      mode: 'hunt',
      title: 'Older',
      body: '',
      outcome: 'note',
    });
    state = await simulateAdd(state, {
      entryDate: '2026-04-22',
      mode: 'hunt',
      title: 'Newer',
      body: '',
      outcome: 'note',
    });
    state = await simulateAdd(state, {
      entryDate: '2026-04-15',
      mode: 'hunt',
      title: 'Middle',
      body: '',
      outcome: 'note',
    });
    expect(state.map((e) => e.title)).toEqual([
      'Newer',
      'Middle',
      'Older',
    ]);
  });

  it('persists across simulated cold-start by reloading from storage', async () => {
    const seeded = await simulateAdd([], {
      entryDate: '2026-04-20',
      mode: 'fish',
      title: 'Striper sunrise',
      body: 'Two on top-water.',
      outcome: 'catch',
    });
    const reloaded = await loadAll();
    expect(reloaded).toEqual(seeded);
  });

  it('entriesForMode-style filter returns only matching rows', async () => {
    let state: JournalEntry[] = [];
    state = await simulateAdd(state, {
      entryDate: '2026-04-21',
      mode: 'hunt',
      title: 'H1',
      body: '',
      outcome: 'note',
    });
    state = await simulateAdd(state, {
      entryDate: '2026-04-22',
      mode: 'fish',
      title: 'F1',
      body: '',
      outcome: 'catch',
    });
    state = await simulateAdd(state, {
      entryDate: '2026-04-23',
      mode: 'fish',
      title: 'F2',
      body: '',
      outcome: 'skunked',
    });
    const modes: WaypointMode[] = ['hunt', 'fish', 'camp', 'hike'];
    const counts = Object.fromEntries(
      modes.map((m) => [m, state.filter((e) => e.mode === m).length]),
    );
    expect(counts).toEqual({ hunt: 1, fish: 2, camp: 0, hike: 0 });
  });

  it('updateEntry preserves id + createdAt and refreshes updatedAt', async () => {
    const seeded = await simulateAdd([], {
      entryDate: '2026-04-22',
      mode: 'hunt',
      title: 'Before',
      body: '',
      outcome: 'note',
    });
    const target = seeded[0];
    const originalCreatedAt = target.createdAt;

    await new Promise((r) => setTimeout(r, 2));

    const { merged, next } = await simulateUpdate(seeded, target.id, {
      title: 'After',
      body: 'Edited body',
      outcome: 'sighting',
    });
    expect(merged).not.toBeNull();
    expect(merged!.id).toBe(target.id);
    expect(merged!.createdAt).toBe(originalCreatedAt);
    expect(merged!.title).toBe('After');
    expect(merged!.body).toBe('Edited body');
    expect(merged!.outcome).toBe('sighting');
    expect(merged!.updatedAt >= originalCreatedAt).toBe(true);
    expect(next).toHaveLength(1);
  });

  it('updateEntry returns null when id is unknown', async () => {
    const seeded = await simulateAdd([], {
      entryDate: '2026-04-22',
      mode: 'hunt',
      title: 'Only',
      body: '',
      outcome: 'note',
    });
    const { merged, next } = await simulateUpdate(seeded, 'does-not-exist', {
      title: 'x',
    });
    expect(merged).toBeNull();
    expect(next).toBe(seeded);
  });

  it('deleteEntry removes a row and is idempotent', async () => {
    let state = await simulateAdd([], {
      entryDate: '2026-04-22',
      mode: 'hunt',
      title: 'DeleteMe',
      body: '',
      outcome: 'note',
    });
    const id = state[0].id;
    const { next, deleted } = await simulateDelete(state, id);
    expect(deleted).toBe(true);
    expect(next).toHaveLength(0);

    const { deleted: second } = await simulateDelete(next, id);
    expect(second).toBe(false);
  });

  it('clearAll drops the storage key', async () => {
    await simulateAdd([], {
      entryDate: '2026-04-22',
      mode: 'hunt',
      title: 'x',
      body: '',
      outcome: 'note',
    });
    const raw1 = await AsyncStorage.getItem(__STORAGE_KEY_FOR_TESTS);
    expect(raw1).not.toBeNull();

    await clearAll();
    const raw2 = await AsyncStorage.getItem(__STORAGE_KEY_FOR_TESTS);
    expect(raw2).toBeNull();
  });
});
