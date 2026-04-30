/**
 * gearChecklistStorage.ts — AsyncStorage persistence for GearChecklist rows.
 *
 * Mirrors `journalEntryStorage.ts` line-for-line: same schemaVersion-
 * wrapped JSON shape, defensive load guards, never-throw contract.
 *
 * Storage shape:
 *   Key:   '@gear_checklists_v1'
 *   Value: JSON-serialized `{ schemaVersion: 1, checklists: GearChecklist[] }`
 *
 * Phase A.6 — added 2026-04-24 per V2_3_FEATURE_EXPANSION_PLAN.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { GearChecklist } from '../types/gearChecklist';

const STORAGE_KEY = '@gear_checklists_v1';
const CURRENT_SCHEMA_VERSION = 1;

interface StoredShape {
  schemaVersion: number;
  checklists: GearChecklist[];
}

export async function loadAll(): Promise<GearChecklist[]> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as StoredShape;
    if (!parsed || !Array.isArray(parsed.checklists)) return [];
    if (parsed.schemaVersion > CURRENT_SCHEMA_VERSION) {
      console.warn(
        '[gearChecklistStorage] Stored checklists are from a newer schema (',
        parsed.schemaVersion,
        ') than this build (',
        CURRENT_SCHEMA_VERSION,
        '). Ignoring to avoid corrupting data.',
      );
      return [];
    }
    return parsed.checklists;
  } catch (err) {
    console.warn('[gearChecklistStorage] loadAll failed:', String(err));
    return [];
  }
}

export async function saveAll(checklists: GearChecklist[]): Promise<boolean> {
  try {
    const payload: StoredShape = {
      schemaVersion: CURRENT_SCHEMA_VERSION,
      checklists,
    };
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    return true;
  } catch (err) {
    console.warn('[gearChecklistStorage] saveAll failed:', String(err));
    return false;
  }
}

export async function clearAll(): Promise<boolean> {
  try {
    await AsyncStorage.removeItem(STORAGE_KEY);
    return true;
  } catch (err) {
    console.warn('[gearChecklistStorage] clearAll failed:', String(err));
    return false;
  }
}

export const __STORAGE_KEY_FOR_TESTS = STORAGE_KEY;
