/**
 * userWaypointStorage.ts — AsyncStorage persistence layer for UserWaypoints.
 *
 * Thin wrapper over `@react-native-async-storage/async-storage`. Isolating
 * the storage calls behind a small service makes unit-testing the
 * UserWaypointContext straightforward (tests mock this module, not
 * AsyncStorage directly) and gives us a single place to add migration
 * logic when the waypoint schema changes.
 *
 * Storage shape:
 *   Key:   '@user_waypoints_v1'
 *   Value: JSON-serialized `{ schemaVersion: 1, waypoints: UserWaypoint[] }`
 *
 * A schemaVersion wrapper is overkill for v1 but cheap to include now and
 * expensive to retrofit once there's real user data in the wild. When
 * schema v2 lands, `loadAll` reads v1 → migrates → writes v2 on the next
 * save.
 *
 * All functions are Promise-returning and never throw; they log a warning
 * and return a safe default (empty array / no-op). Callers get a
 * predictable surface and don't need to wrap every call in try/catch.
 *
 * Added 2026-04-24 per V2_3_FEATURE_EXPANSION_PLAN §3 / Phase A.1.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { UserWaypoint } from '../types/userWaypoint';

const STORAGE_KEY = '@user_waypoints_v1';
const CURRENT_SCHEMA_VERSION = 1;

interface StoredShape {
  schemaVersion: number;
  waypoints: UserWaypoint[];
}

/**
 * Load every persisted waypoint. Returns an empty array if the store
 * is uninitialized, corrupt, or a future schema version we don't know
 * how to read yet.
 *
 * Defensive against:
 *   - null (first-run: key not yet written)
 *   - malformed JSON (e.g., partial write during OOM)
 *   - shape drift (missing top-level `waypoints`, non-array)
 *   - future schema versions we can't migrate backward
 */
export async function loadAll(): Promise<UserWaypoint[]> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as StoredShape;
    if (!parsed || !Array.isArray(parsed.waypoints)) return [];
    if (parsed.schemaVersion > CURRENT_SCHEMA_VERSION) {
      console.warn(
        '[userWaypointStorage] Stored waypoints are from a newer schema (',
        parsed.schemaVersion,
        ') than this build (',
        CURRENT_SCHEMA_VERSION,
        '). Ignoring to avoid corrupting data.',
      );
      return [];
    }
    // Future: branch on parsed.schemaVersion for migrations.
    return parsed.waypoints;
  } catch (err) {
    console.warn('[userWaypointStorage] loadAll failed:', String(err));
    return [];
  }
}

/**
 * Persist every waypoint. Callers pass the full array rather than a
 * delta because AsyncStorage has no efficient partial-update primitive
 * at this size (a few hundred waypoints max; full-rewrite is fine).
 *
 * Returns `true` on success, `false` on failure (with a warning logged).
 * Callers can surface failures to the user if they choose but most
 * will fire-and-forget.
 */
export async function saveAll(waypoints: UserWaypoint[]): Promise<boolean> {
  try {
    const payload: StoredShape = {
      schemaVersion: CURRENT_SCHEMA_VERSION,
      waypoints,
    };
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    return true;
  } catch (err) {
    console.warn('[userWaypointStorage] saveAll failed:', String(err));
    return false;
  }
}

/**
 * Drop the entire user-waypoint store. Intended for the Settings screen
 * "reset on-device data" affordance and for test teardown.
 */
export async function clearAll(): Promise<boolean> {
  try {
    await AsyncStorage.removeItem(STORAGE_KEY);
    return true;
  } catch (err) {
    console.warn('[userWaypointStorage] clearAll failed:', String(err));
    return false;
  }
}

/** Exposed for tests that need to assert on the key directly. */
export const __STORAGE_KEY_FOR_TESTS = STORAGE_KEY;
