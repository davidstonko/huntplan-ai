/**
 * onboardingStorage — AsyncStorage-backed "have you seen the tour?" set
 * for the per-mode onboarding tour (V2.3 Phase A.26).
 *
 * One key holds a JSON array of mode strings the user has dismissed the
 * onboarding tour for. The set is intentionally append-only from normal
 * UI flow — `markTourSeen('hunt')` adds 'hunt'. Resetting (via the
 * "Take the tour again" entry point on each mode's Resources screen)
 * removes one mode so the gate fires again on next mount.
 *
 * Defensive load matching favoritesStorage / goalsStorage: any IO or
 * JSON parse error returns an empty set. We never crash the app over a
 * missing tour flag.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import type { WaypointMode } from '../types/userWaypoint';

const ONBOARDING_KEY = 'user_onboarding_v1';

/** Read the current set of dismissed-mode strings. Returns Set<mode>. */
export async function loadSeenModes(): Promise<Set<WaypointMode>> {
  try {
    const raw = await AsyncStorage.getItem(ONBOARDING_KEY);
    if (!raw) return new Set();
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return new Set();
    return new Set(parsed.filter((m): m is WaypointMode =>
      m === 'hunt' || m === 'fish' || m === 'camp' || m === 'hike',
    ));
  } catch {
    return new Set();
  }
}

/** Has the user already dismissed the tour for this mode? */
export async function hasSeenTour(mode: WaypointMode): Promise<boolean> {
  const seen = await loadSeenModes();
  return seen.has(mode);
}

/** Mark this mode's tour as seen. Idempotent; subsequent calls are no-ops. */
export async function markTourSeen(mode: WaypointMode): Promise<void> {
  try {
    const seen = await loadSeenModes();
    if (seen.has(mode)) return;
    seen.add(mode);
    await AsyncStorage.setItem(
      ONBOARDING_KEY,
      JSON.stringify(Array.from(seen)),
    );
  } catch {
    //
  }
}

/** Clear the seen flag for one mode so the gate fires again next time. */
export async function resetTour(mode: WaypointMode): Promise<void> {
  try {
    const seen = await loadSeenModes();
    if (!seen.has(mode)) return;
    seen.delete(mode);
    await AsyncStorage.setItem(
      ONBOARDING_KEY,
      JSON.stringify(Array.from(seen)),
    );
  } catch {
    //
  }
}

/** Test/dev helper: forget every mode's tour state. */
export async function clearAllTourState(): Promise<void> {
  try {
    await AsyncStorage.removeItem(ONBOARDING_KEY);
  } catch {
    //
  }
}
