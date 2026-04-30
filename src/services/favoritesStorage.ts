/**
 * favoritesStorage.ts — AsyncStorage persistence for the favorites set.
 *
 * Mirrors `journalEntryStorage.ts` line-for-line on purpose: same
 * schemaVersion-wrapped JSON shape, same defensive load guards, same
 * never-throw contract.
 *
 * Storage shape:
 *   Key:   '@favorites_v1'
 *   Value: JSON-serialized `{ schemaVersion: 1, favorites: FavoriteRef[] }`
 *
 * V2_3_FEATURE_EXPANSION_PLAN — Phase A.16.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import type { FavoriteRef } from '../types/favorite';

const STORAGE_KEY = '@favorites_v1';
const CURRENT_SCHEMA_VERSION = 1;

interface StoredShape {
  schemaVersion: number;
  favorites: FavoriteRef[];
}

/**
 * Load every persisted favorite. Returns an empty array if the store is
 * uninitialized, corrupt, or written by a future schema.
 */
export async function loadAll(): Promise<FavoriteRef[]> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as StoredShape;
    if (!parsed || !Array.isArray(parsed.favorites)) return [];
    if (parsed.schemaVersion > CURRENT_SCHEMA_VERSION) {
      console.warn(
        '[favoritesStorage] Stored favorites are from a newer schema (',
        parsed.schemaVersion,
        ') than this build (',
        CURRENT_SCHEMA_VERSION,
        '). Ignoring to avoid corrupting data.',
      );
      return [];
    }
    return parsed.favorites;
  } catch (err) {
    console.warn('[favoritesStorage] loadAll failed:', String(err));
    return [];
  }
}

/**
 * Persist every favorite. Full-rewrite is fine at expected scale (a
 * power user is unlikely to ever cross a few thousand favorites).
 */
export async function saveAll(favorites: FavoriteRef[]): Promise<boolean> {
  try {
    const payload: StoredShape = {
      schemaVersion: CURRENT_SCHEMA_VERSION,
      favorites,
    };
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    return true;
  } catch (err) {
    console.warn('[favoritesStorage] saveAll failed:', String(err));
    return false;
  }
}

/**
 * Drop every favorite. Intended for the Settings reset affordance and
 * for test teardown.
 */
export async function clearAll(): Promise<boolean> {
  try {
    await AsyncStorage.removeItem(STORAGE_KEY);
    return true;
  } catch (err) {
    console.warn('[favoritesStorage] clearAll failed:', String(err));
    return false;
  }
}

/** Exposed for tests that need to assert on the key directly. */
export const __STORAGE_KEY_FOR_TESTS = STORAGE_KEY;
