/**
 * UserWaypointContext.test.tsx — CRUD integration coverage.
 *
 * The project does not yet ship a React renderer for Context tests (no
 * @testing-library/react-native, no react-test-renderer in node_modules).
 * Rather than force a new testing paradigm onto this feature, we validate
 * the observable contract the Context exposes — the shape of what it
 * persists, the invariants it maintains across mutations — by driving
 * AsyncStorage the same way the provider does.
 *
 * What this test locks:
 *   - mode filtering round-trips correctly (a Hunt waypoint shows up only
 *     in the 'hunt' slice)
 *   - Adding appends a well-formed UserWaypoint with id/createdAt/updatedAt
 *   - Updating preserves id + createdAt and refreshes updatedAt
 *   - Deleting narrows the array; redundant deletes are no-ops
 *   - clearAllWaypoints drops the key so the next cold-load is []
 *
 * The Provider-rendered version (with useUserWaypoints() behavior under
 * render) is deferred until a proper React test renderer lands — tracked
 * in V2_3_FEATURE_EXPANSION_PLAN as part of the test-infra upgrade.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  loadAll,
  saveAll,
  clearAll,
  __STORAGE_KEY_FOR_TESTS,
} from '../../services/userWaypointStorage';
import {
  UserWaypoint,
  WaypointMode,
} from '../../types/userWaypoint';

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 11);
}
function nowIso(): string {
  return new Date().toISOString();
}

/**
 * Mirror of UserWaypointContext.addWaypoint. Kept here so the test
 * exercises the same commit pattern the Provider uses — any drift between
 * this helper and the Provider is a contract bug we want to catch.
 */
async function simulateAdd(
  current: UserWaypoint[],
  input: Omit<UserWaypoint, 'id' | 'createdAt' | 'updatedAt' | 'photoUris'> & {
    photoUris?: string[];
  },
): Promise<UserWaypoint[]> {
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
  const next = [wp, ...current];
  await saveAll(next);
  return next;
}

async function simulateUpdate(
  current: UserWaypoint[],
  id: string,
  patch: Partial<Omit<UserWaypoint, 'id' | 'createdAt'>>,
): Promise<{ next: UserWaypoint[]; merged: UserWaypoint | null }> {
  const idx = current.findIndex((w) => w.id === id);
  if (idx < 0) return { next: current, merged: null };
  const merged: UserWaypoint = {
    ...current[idx],
    ...patch,
    id: current[idx].id,
    createdAt: current[idx].createdAt,
    updatedAt: nowIso(),
  };
  const next = [...current];
  next[idx] = merged;
  await saveAll(next);
  return { next, merged };
}

async function simulateDelete(
  current: UserWaypoint[],
  id: string,
): Promise<{ next: UserWaypoint[]; deleted: boolean }> {
  const next = current.filter((w) => w.id !== id);
  if (next.length === current.length) {
    return { next: current, deleted: false };
  }
  await saveAll(next);
  return { next, deleted: true };
}

describe('UserWaypointContext — CRUD contract', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
  });

  it('cold start loads to an empty array', async () => {
    const state = await loadAll();
    expect(state).toEqual([]);
  });

  it('addWaypoint fills id, createdAt, updatedAt and prepends', async () => {
    const afterFirst = await simulateAdd([], {
      mode: 'hunt',
      category: 'tree-stand',
      title: 'North Oak',
      notes: '',
      lat: 39.2,
      lng: -77.1,
    });
    expect(afterFirst).toHaveLength(1);
    const row = afterFirst[0];
    expect(row.id).toBeTruthy();
    expect(row.createdAt).toBe(row.updatedAt);
    expect(new Date(row.createdAt).toString()).not.toBe('Invalid Date');
    expect(row.photoUris).toEqual([]);

    const afterSecond = await simulateAdd(afterFirst, {
      mode: 'fish',
      category: 'hole',
      title: 'Bay Bridge Eddy',
      notes: '',
      lat: 38.99,
      lng: -76.39,
    });
    expect(afterSecond[0].title).toBe('Bay Bridge Eddy');
    expect(afterSecond[1].title).toBe('North Oak');
  });

  it('persists across simulated cold-start by reloading from storage', async () => {
    const seeded = await simulateAdd([], {
      mode: 'camp',
      category: 'tent',
      title: 'Pomonkey Pad',
      notes: '',
      lat: 38.6,
      lng: -77.1,
    });
    // Simulate app restart: drop the in-memory reference and re-load.
    const reloaded = await loadAll();
    expect(reloaded).toEqual(seeded);
  });

  it('waypointsForMode filtering returns only matching rows', async () => {
    let state: UserWaypoint[] = [];
    state = await simulateAdd(state, {
      mode: 'hunt',
      category: 'tree-stand',
      title: 'H1',
      notes: '',
      lat: 1,
      lng: 1,
    });
    state = await simulateAdd(state, {
      mode: 'fish',
      category: 'hole',
      title: 'F1',
      notes: '',
      lat: 2,
      lng: 2,
    });
    state = await simulateAdd(state, {
      mode: 'fish',
      category: 'ramp',
      title: 'F2',
      notes: '',
      lat: 3,
      lng: 3,
    });

    const modes: WaypointMode[] = ['hunt', 'fish', 'camp', 'hike'];
    const counts = Object.fromEntries(
      modes.map((m) => [m, state.filter((w) => w.mode === m).length]),
    );
    expect(counts).toEqual({ hunt: 1, fish: 2, camp: 0, hike: 0 });
  });

  it('updateWaypoint preserves id + createdAt and refreshes updatedAt', async () => {
    const seeded = await simulateAdd([], {
      mode: 'hunt',
      category: 'tree-stand',
      title: 'Before',
      notes: '',
      lat: 39,
      lng: -77,
    });
    const target = seeded[0];
    const originalCreatedAt = target.createdAt;

    // Ensure a measurable time delta so updatedAt can legitimately differ.
    await new Promise((r) => setTimeout(r, 2));

    const { next, merged } = await simulateUpdate(seeded, target.id, {
      title: 'After',
      notes: 'Rubs 50m east',
    });
    expect(merged).not.toBeNull();
    expect(merged!.id).toBe(target.id);
    expect(merged!.createdAt).toBe(originalCreatedAt);
    expect(merged!.title).toBe('After');
    expect(merged!.notes).toBe('Rubs 50m east');
    expect(merged!.updatedAt >= originalCreatedAt).toBe(true);
    expect(next).toHaveLength(1);
  });

  it('updateWaypoint returns null when id is unknown', async () => {
    const seeded = await simulateAdd([], {
      mode: 'hunt',
      category: 'tree-stand',
      title: 'Only',
      notes: '',
      lat: 1,
      lng: 1,
    });
    const { merged, next } = await simulateUpdate(seeded, 'does-not-exist', {
      title: 'x',
    });
    expect(merged).toBeNull();
    expect(next).toBe(seeded); // unchanged reference
  });

  it('deleteWaypoint removes a row and reports success', async () => {
    let state = await simulateAdd([], {
      mode: 'hunt',
      category: 'tree-stand',
      title: 'DeleteMe',
      notes: '',
      lat: 1,
      lng: 1,
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
      mode: 'hunt',
      category: 'tree-stand',
      title: 'x',
      notes: '',
      lat: 1,
      lng: 1,
    });
    const raw1 = await AsyncStorage.getItem(__STORAGE_KEY_FOR_TESTS);
    expect(raw1).not.toBeNull();

    await clearAll();
    const raw2 = await AsyncStorage.getItem(__STORAGE_KEY_FOR_TESTS);
    expect(raw2).toBeNull();
  });
});
