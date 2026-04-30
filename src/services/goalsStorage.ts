/**
 * goalsStorage — AsyncStorage-backed persistence for user goals (Phase A.28).
 *
 * Mirrors the storage pattern used by favoritesStorage / journalEntryStorage:
 * a thin async wrapper around a single AsyncStorage key, with defensive
 * JSON parse and a tolerated-failure model (any error → empty array, never
 * throws to the caller). Goals are pure-read in normal use; the UI calls
 * `addGoal` / `updateGoal` / `deleteGoal` and reads the next list.
 *
 * The schema is small enough that no migration helper is needed yet — if
 * a future field is added, the load step should backfill defaults.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Goal } from '../types/goal';

const GOALS_KEY = 'user_goals_v1';

/**
 * Read all stored goals. Defensive: returns `[]` on JSON-parse failure or
 * missing key. Never throws.
 */
export async function loadGoals(): Promise<Goal[]> {
  try {
    const raw = await AsyncStorage.getItem(GOALS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

/**
 * Replace the entire stored list. Used by add/update/delete after they
 * compute the next state in memory.
 */
export async function saveGoals(goals: Goal[]): Promise<void> {
  try {
    await AsyncStorage.setItem(GOALS_KEY, JSON.stringify(goals));
  } catch {
    //
  }
}

/**
 * Append a new goal. The screen builds the Goal object (with stable id +
 * timestamps) and hands it in; storage is just persistence.
 */
export async function addGoal(goal: Goal): Promise<Goal[]> {
  const current = await loadGoals();
  const next = [...current, goal];
  await saveGoals(next);
  return next;
}

/**
 * Replace an existing goal by id. No-op if id doesn't exist (defensive
 * — caller may have stale state).
 */
export async function updateGoal(updated: Goal): Promise<Goal[]> {
  const current = await loadGoals();
  const next = current.map((g) =>
    g.id === updated.id ? { ...updated, updatedAt: new Date().toISOString() } : g,
  );
  await saveGoals(next);
  return next;
}

/**
 * Remove a goal by id.
 */
export async function deleteGoal(id: string): Promise<Goal[]> {
  const current = await loadGoals();
  const next = current.filter((g) => g.id !== id);
  await saveGoals(next);
  return next;
}

/** Convenience for synthetic-data tests / dev helpers. */
export async function clearGoals(): Promise<void> {
  try {
    await AsyncStorage.removeItem(GOALS_KEY);
  } catch {
    //
  }
}
