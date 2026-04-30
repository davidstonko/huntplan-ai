/**
 * UserMarkupContext.test.tsx — CRUD contract coverage.
 *
 * No React renderer in the test toolchain (see UserWaypointContext.test.tsx
 * note). We exercise the same commit pattern the Provider uses by driving
 * the storage layer directly, locking the observable invariants:
 *
 *   - Cold start loads to []
 *   - Adding fills id/createdAt/updatedAt and prepends
 *   - Add defensively closes a polygon ring
 *   - Mode filtering is per-mode (markup with mode='hunt' never leaks to fish)
 *   - updateMarkup preserves id + createdAt and refreshes updatedAt
 *   - updateMarkup never mutates shapeType
 *   - deleteMarkup removes a row; redundant deletes are no-ops
 *   - clearAll drops the storage key
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  loadAll,
  saveAll,
  clearAll,
  __STORAGE_KEY_FOR_TESTS,
} from '../../services/userMarkupStorage';
import {
  UserMarkup,
  LineStringMarkup,
  PolygonMarkup,
  closePolygon,
} from '../../types/userMarkup';
import type { WaypointMode } from '../../types/userWaypoint';

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 11);
}
function nowIso(): string {
  return new Date().toISOString();
}

type NewMarkupInput =
  | (Omit<
      LineStringMarkup,
      'id' | 'createdAt' | 'updatedAt' | 'photoUris'
    > & { photoUris?: string[] })
  | (Omit<
      PolygonMarkup,
      'id' | 'createdAt' | 'updatedAt' | 'photoUris'
    > & { photoUris?: string[] });

async function simulateAdd(
  current: UserMarkup[],
  input: NewMarkupInput,
): Promise<UserMarkup[]> {
  const ts = nowIso();
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
  const next = [markup, ...current];
  await saveAll(next);
  return next;
}

async function simulateUpdate(
  current: UserMarkup[],
  id: string,
  patch: Partial<Omit<UserMarkup, 'id' | 'createdAt'>>,
): Promise<{ next: UserMarkup[]; merged: UserMarkup | null }> {
  const idx = current.findIndex((m) => m.id === id);
  if (idx < 0) return { next: current, merged: null };
  const target = current[idx];
  const merged = {
    ...target,
    ...patch,
    id: target.id,
    createdAt: target.createdAt,
    updatedAt: nowIso(),
    shapeType: target.shapeType,
  } as UserMarkup;
  const next = [...current];
  next[idx] = merged;
  await saveAll(next);
  return { next, merged };
}

async function simulateDelete(
  current: UserMarkup[],
  id: string,
): Promise<{ next: UserMarkup[]; deleted: boolean }> {
  const next = current.filter((m) => m.id !== id);
  if (next.length === current.length) return { next: current, deleted: false };
  await saveAll(next);
  return { next, deleted: true };
}

describe('UserMarkupContext — CRUD contract', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
  });

  it('cold start loads to []', async () => {
    expect(await loadAll()).toEqual([]);
  });

  it('addMarkup fills id/createdAt/updatedAt and prepends a LineString', async () => {
    const after = await simulateAdd([], {
      mode: 'hunt',
      title: 'Shoot Lane North',
      shapeType: 'LineString',
      coordinates: [
        [-77, 39],
        [-76.99, 39.01],
      ],
    });
    expect(after).toHaveLength(1);
    const row = after[0];
    expect(row.id).toBeTruthy();
    expect(row.createdAt).toBe(row.updatedAt);
    expect(row.photoUris).toEqual([]);
    expect(row.shapeType).toBe('LineString');
  });

  it('addMarkup defensively closes an open polygon ring', async () => {
    const after = await simulateAdd([], {
      mode: 'camp',
      title: 'Property A',
      shapeType: 'Polygon',
      coordinates: [
        [
          [-77, 39],
          [-76.9, 39],
          [-76.95, 39.1],
        ],
      ],
    });
    expect(after).toHaveLength(1);
    const row = after[0];
    if (row.shapeType !== 'Polygon') throw new Error('expected polygon');
    const ring = row.coordinates[0];
    expect(ring).toHaveLength(4);
    expect(ring[0]).toEqual(ring[ring.length - 1]);
  });

  it('persists across simulated cold-start by reloading from storage', async () => {
    const seeded = await simulateAdd([], {
      mode: 'hike',
      title: 'Off-trail spur',
      shapeType: 'LineString',
      coordinates: [
        [-77, 39],
        [-76.99, 39],
      ],
    });
    const reloaded = await loadAll();
    expect(reloaded).toEqual(seeded);
  });

  it('markupsForMode filtering returns only matching rows', async () => {
    let state: UserMarkup[] = [];
    state = await simulateAdd(state, {
      mode: 'hunt',
      title: 'H1',
      shapeType: 'LineString',
      coordinates: [
        [0, 0],
        [1, 1],
      ],
    });
    state = await simulateAdd(state, {
      mode: 'fish',
      title: 'F1',
      shapeType: 'LineString',
      coordinates: [
        [0, 0],
        [1, 1],
      ],
    });
    state = await simulateAdd(state, {
      mode: 'fish',
      title: 'F2',
      shapeType: 'Polygon',
      coordinates: [
        [
          [0, 0],
          [1, 0],
          [1, 1],
          [0, 0],
        ],
      ],
    });
    const modes: WaypointMode[] = ['hunt', 'fish', 'camp', 'hike'];
    const counts = Object.fromEntries(
      modes.map((m) => [m, state.filter((x) => x.mode === m).length]),
    );
    expect(counts).toEqual({ hunt: 1, fish: 2, camp: 0, hike: 0 });
  });

  it('updateMarkup preserves id + createdAt and refreshes updatedAt', async () => {
    const seeded = await simulateAdd([], {
      mode: 'hunt',
      title: 'Before',
      shapeType: 'LineString',
      coordinates: [
        [0, 0],
        [1, 1],
      ],
    });
    const target = seeded[0];
    await new Promise((r) => setTimeout(r, 2));
    const { merged } = await simulateUpdate(seeded, target.id, {
      title: 'After',
      notes: 'kept the line, retitled',
    });
    expect(merged).not.toBeNull();
    expect(merged!.id).toBe(target.id);
    expect(merged!.createdAt).toBe(target.createdAt);
    expect(merged!.title).toBe('After');
    expect(merged!.updatedAt >= target.createdAt).toBe(true);
  });

  it('updateMarkup never lets shapeType change', async () => {
    const seeded = await simulateAdd([], {
      mode: 'camp',
      title: 'Boundary',
      shapeType: 'Polygon',
      coordinates: [
        [
          [0, 0],
          [1, 0],
          [1, 1],
          [0, 0],
        ],
      ],
    });
    const target = seeded[0];
    const { merged } = await simulateUpdate(seeded, target.id, {
      shapeType: 'LineString' as const,
      title: 'sneaky',
    } as Partial<Omit<UserMarkup, 'id' | 'createdAt'>>);
    expect(merged).not.toBeNull();
    expect(merged!.shapeType).toBe('Polygon');
  });

  it('deleteMarkup removes a row and reports success', async () => {
    let state = await simulateAdd([], {
      mode: 'hunt',
      title: 'gone',
      shapeType: 'LineString',
      coordinates: [
        [0, 0],
        [1, 1],
      ],
    });
    const id = state[0].id;
    const { next, deleted } = await simulateDelete(state, id);
    expect(deleted).toBe(true);
    expect(next).toHaveLength(0);
    const second = await simulateDelete(next, id);
    expect(second.deleted).toBe(false);
  });

  it('clearAll drops the storage key', async () => {
    await simulateAdd([], {
      mode: 'hunt',
      title: 'x',
      shapeType: 'LineString',
      coordinates: [
        [0, 0],
        [1, 1],
      ],
    });
    expect(await AsyncStorage.getItem(__STORAGE_KEY_FOR_TESTS)).not.toBeNull();
    await clearAll();
    expect(await AsyncStorage.getItem(__STORAGE_KEY_FOR_TESTS)).toBeNull();
  });
});
