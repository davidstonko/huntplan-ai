/**
 * @file tripChecklistLinkStorage.ts
 * @description Phase A.43 — write-back utility that links a freshly-
 * created GearChecklist back to its parent CampTrip or HikeTrip in
 * AsyncStorage.
 *
 * Why this lives in its own module:
 *  - upcomingTripsService.ts is intentionally pure (no AsyncStorage,
 *    no Date.now in test paths). Side-effecting persistence belongs
 *    elsewhere.
 *  - Camp + Hike trips don't have a React context provider (only the
 *    checklists do). So the link write-back has to read+update+write
 *    AsyncStorage directly. A dedicated thin wrapper keeps the side-
 *    effect surface auditable.
 *
 * The helper is idempotent: if the trip already carries the same
 * checklist id, the rewrite is still safe (same JSON in, same JSON
 * out).
 *
 * @module Services
 * @version 2.3.0
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import type { CampTrip } from '../types/camp';
import type { HikeTrip } from '../types/hike';

const CAMP_KEY = 'camp_trips_v1';
const HIKE_KEY = 'hike_trips_v1';

/**
 * Set `gearChecklistId` on the trip with `tripId` to `checklistId`,
 * persist back to AsyncStorage, and bump `updatedAt`. Returns the
 * patched trip (for callers that want to update local state without
 * re-reading) or null if the trip wasn't found / storage was empty.
 *
 * Pass `checklistId = null` to UNLINK a checklist from a trip (used
 * when the user deletes a checklist that was previously linked).
 */
export async function persistTripChecklistLink(
  kind: 'camp' | 'hike',
  tripId: string,
  checklistId: string | null,
  now: Date = new Date(),
): Promise<CampTrip | HikeTrip | null> {
  const key = kind === 'camp' ? CAMP_KEY : HIKE_KEY;
  const raw = await AsyncStorage.getItem(key);
  if (!raw) return null;

  let arr: (CampTrip | HikeTrip)[];
  try {
    arr = JSON.parse(raw) as (CampTrip | HikeTrip)[];
  } catch {
    return null;
  }
  if (!Array.isArray(arr)) return null;

  const idx = arr.findIndex((t) => t.id === tripId);
  if (idx < 0) return null;

  const patched = {
    ...arr[idx],
    gearChecklistId: checklistId,
    updatedAt: now.toISOString(),
  } as CampTrip | HikeTrip;

  const next = [...arr];
  next[idx] = patched;
  await AsyncStorage.setItem(key, JSON.stringify(next));
  return patched;
}
