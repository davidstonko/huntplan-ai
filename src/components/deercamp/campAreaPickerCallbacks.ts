/**
 * campAreaPickerCallbacks.ts
 *
 * Tiny module-scoped callback registry for the CampAreaPicker Stack route.
 *
 * Why this exists: React Navigation logs a warning when non-serializable
 * values (like function references) are passed via route.params, because
 * such state can't be persisted/restored. Stashing the callbacks on a
 * module-level ref keyed by an opaque requestId keeps route.params clean
 * (only strings + plain coords) and silences the warning.
 *
 * Usage from DeerCampScreen:
 *   const reqId = setPendingAreaPickerCallbacks({ onConfirm, onCancel });
 *   navigation.navigate('CampAreaPicker', { reqId, campName, initialCenter });
 *
 * Usage from CampAreaPickerScreen:
 *   const cbs = takePendingAreaPickerCallbacks(route.params.reqId);
 *   if (cbs) cbs.onConfirm(area);  // or cbs.onCancel()
 *
 * The map is intentionally tiny — at most one entry per active picker —
 * but using a Map keyed by reqId lets us survive (rare) cases where the
 * user kicks off two picker sessions in flight simultaneously.
 *
 * 2026-04-26 (cleanup task #48).
 */

import type { CampArea } from '../../types/deercamp';

export interface AreaPickerCallbacks {
  onConfirm: (area: CampArea) => void;
  onCancel: () => void;
}

const pending = new Map<string, AreaPickerCallbacks>();

let nextId = 1;

/**
 * Register a pair of callbacks for an upcoming picker session.
 * Returns an opaque requestId to put on route.params.
 */
export function setPendingAreaPickerCallbacks(
  cbs: AreaPickerCallbacks,
): string {
  const reqId = `area-picker-${nextId++}`;
  pending.set(reqId, cbs);
  return reqId;
}

/**
 * Retrieve and remove the callbacks for a given requestId.
 * Returns undefined if the id is unknown (which would mean the screen
 * was reopened from a stale navigation state — safe to ignore).
 */
export function takePendingAreaPickerCallbacks(
  reqId: string | undefined,
): AreaPickerCallbacks | undefined {
  if (!reqId) return undefined;
  const cbs = pending.get(reqId);
  if (cbs) pending.delete(reqId);
  return cbs;
}
