/**
 * userMarkupStorage — AsyncStorage persistence for UserMarkup (lines + polygons).
 *
 * Mirrors the `userWaypointStorage` pattern: a schemaVersion wrapper,
 * lenient reads that recover from corrupt/missing data, and a separate
 * storage key so waypoint migrations don't touch markup data.
 *
 * V2_3_FEATURE_EXPANSION_PLAN §D.2.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { UserMarkup, isValidMarkup } from '../types/userMarkup';

const STORAGE_KEY = '@user_markups_v1';
const CURRENT_SCHEMA_VERSION = 1;

interface StoredShape {
  schemaVersion: number;
  markups: UserMarkup[];
}

export const __STORAGE_KEY_FOR_TESTS = STORAGE_KEY;

export async function loadAll(): Promise<UserMarkup[]> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (raw == null) return [];
    const parsed = JSON.parse(raw) as StoredShape;
    if (
      !parsed ||
      typeof parsed !== 'object' ||
      !Array.isArray(parsed.markups) ||
      typeof parsed.schemaVersion !== 'number'
    ) {
      return [];
    }
    if (parsed.schemaVersion > CURRENT_SCHEMA_VERSION) {
      // Future version — safer to return [] than guess.
      return [];
    }
    // Only keep rows that are structurally valid — silently drop the
    // rest rather than crashing the whole app on one bad row.
    return parsed.markups.filter((m) => {
      try {
        return isValidMarkup(m);
      } catch {
        return false;
      }
    });
  } catch (err) {
    console.warn('[userMarkupStorage] loadAll failed; returning []', err);
    return [];
  }
}

export async function saveAll(markups: UserMarkup[]): Promise<void> {
  try {
    const shape: StoredShape = {
      schemaVersion: CURRENT_SCHEMA_VERSION,
      markups,
    };
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(shape));
  } catch (err) {
    console.warn('[userMarkupStorage] saveAll failed', err);
  }
}

export async function clearAll(): Promise<void> {
  try {
    await AsyncStorage.removeItem(STORAGE_KEY);
  } catch (err) {
    console.warn('[userMarkupStorage] clearAll failed', err);
  }
}
