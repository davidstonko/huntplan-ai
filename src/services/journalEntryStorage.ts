/**
 * journalEntryStorage.ts — AsyncStorage persistence for JournalEntry rows.
 *
 * Mirrors `userWaypointStorage.ts` line-for-line on purpose: same
 * schemaVersion-wrapped JSON shape, same defensive load guards, same
 * never-throw contract. Keeping the personal-layer storage modules
 * structurally identical means the migration story (when one of them
 * lands a v2 schema) is copy-paste mechanical rather than per-module
 * archaeology.
 *
 * Storage shape:
 *   Key:   '@journal_entries_v1'
 *   Value: JSON-serialized `{ schemaVersion: 1, entries: JournalEntry[] }`
 *
 * Added 2026-04-24 per V2_3_FEATURE_EXPANSION_PLAN §3 / Phase A.5.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { JournalEntry } from '../types/journalEntry';

const STORAGE_KEY = '@journal_entries_v1';
const CURRENT_SCHEMA_VERSION = 1;

interface StoredShape {
  schemaVersion: number;
  entries: JournalEntry[];
}

/**
 * Load every persisted journal entry. Returns an empty array if the
 * store is uninitialized, corrupt, or written by a future schema.
 */
export async function loadAll(): Promise<JournalEntry[]> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as StoredShape;
    if (!parsed || !Array.isArray(parsed.entries)) return [];
    if (parsed.schemaVersion > CURRENT_SCHEMA_VERSION) {
      console.warn(
        '[journalEntryStorage] Stored entries are from a newer schema (',
        parsed.schemaVersion,
        ') than this build (',
        CURRENT_SCHEMA_VERSION,
        '). Ignoring to avoid corrupting data.',
      );
      return [];
    }
    return parsed.entries;
  } catch (err) {
    console.warn('[journalEntryStorage] loadAll failed:', String(err));
    return [];
  }
}

/**
 * Persist every entry. Full-rewrite is fine at expected scale.
 */
export async function saveAll(entries: JournalEntry[]): Promise<boolean> {
  try {
    const payload: StoredShape = {
      schemaVersion: CURRENT_SCHEMA_VERSION,
      entries,
    };
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    return true;
  } catch (err) {
    console.warn('[journalEntryStorage] saveAll failed:', String(err));
    return false;
  }
}

/**
 * Drop the entire journal. Intended for the Settings reset affordance
 * and for test teardown.
 */
export async function clearAll(): Promise<boolean> {
  try {
    await AsyncStorage.removeItem(STORAGE_KEY);
    return true;
  } catch (err) {
    console.warn('[journalEntryStorage] clearAll failed:', String(err));
    return false;
  }
}

/** Exposed for tests that need to assert on the key directly. */
export const __STORAGE_KEY_FOR_TESTS = STORAGE_KEY;
