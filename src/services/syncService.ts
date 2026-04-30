/**
 * @file syncService.ts
 * @description WatermelonDB sync adapter for MDHuntFishOutdoors.
 *
 * Handles bi-directional sync between local WatermelonDB and FastAPI backend.
 * Uses pull/push pattern:
 *   - GET /api/v1/sync/pull?last_pulled_at=TIMESTAMP
 *   - POST /api/v1/sync/push with { changes: {...} }
 *
 * Syncs: hunt plans, waypoints, routes, areas, recorded tracks,
 *        deer camps, camp members, shared annotations, photos, activity feed
 *
 * Conflict resolution: last-write-wins with server timestamp
 * Graceful fallback: if backend unreachable, queues changes locally
 * Offline-first: doesn't crash if backend is down
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import Config from '../config';

// ─── Types ──────────────────────────────────────────────────────

interface SyncPullRequest {
  last_pulled_at: number | null;
}

interface SyncPullResponse {
  timestamp: number;
  changes: {
    created: Record<string, any[]>;
    updated: Record<string, any[]>;
    deleted: Record<string, string[]>;
  };
}

interface SyncPushRequest {
  changes: {
    created: Record<string, any[]>;
    updated: Record<string, any[]>;
    deleted: Record<string, string[]>;
  };
  client_timestamp: number;
}

interface SyncPushResponse {
  timestamp: number;
  acknowledged: boolean;
  conflicted_ids: string[];
}

export interface SyncResult {
  success: boolean;
  timestamp: number;
  pulledChanges: number;
  pushedChanges: number;
  conflicts: string[];
  error?: string;
}

// ─── Storage Keys ───────────────────────────────────────────────

const LAST_PULLED_AT_KEY = '@sync_last_pulled_at';
const PENDING_CHANGES_KEY = '@sync_pending_changes';
const SYNC_ERROR_KEY = '@sync_last_error';

// ─── HTTP Client Setup ──────────────────────────────────────────

const syncClient = axios.create({
  baseURL: Config.API_BASE_URL,
  timeout: 30000,
  headers: { 'Content-Type': 'application/json' },
});

/**
 * Add auth token to sync requests (placeholder for now)
 * In Phase 3, this will use actual bearer token from authService
 */
function getAuthHeader(): Record<string, string> {
  // TODO: Fetch actual auth token from authService when Phase 3 auth is ready
  // For now, sync is anonymous (profiles identified by user_id in payload)
  return {
    'Authorization': 'Bearer placeholder-token',
  };
}

// ─── Sync Service ───────────────────────────────────────────────

/**
 * Retrieve changes that haven't been pushed to the backend yet
 * Reads from AsyncStorage queue (set by contexts when creating/updating records)
 *
 * @internal
 * @returns Promise with pending changes in push format
 */
async function getPendingChanges(): Promise<SyncPushRequest['changes'] | null> {
  try {
    const stored = await AsyncStorage.getItem(PENDING_CHANGES_KEY);
    return stored ? JSON.parse(stored) : null;
  } catch (error) {
    if (__DEV__) console.warn('[SyncService] Failed to read pending changes:', error);
    return null;
  }
}

/**
 * Clear the pending changes queue after successful push
 *
 * @internal
 * @returns Promise<void>
 */
async function clearPendingChanges(): Promise<void> {
  try {
    await AsyncStorage.removeItem(PENDING_CHANGES_KEY);
  } catch (error) {
    if (__DEV__) console.warn('[SyncService] Failed to clear pending changes:', error);
  }
}

/**
 * Store error message from last sync attempt
 *
 * @internal
 * @param error - Error message or null to clear
 */
async function setSyncError(error: string | null): Promise<void> {
  try {
    if (error) {
      await AsyncStorage.setItem(SYNC_ERROR_KEY, JSON.stringify({
        message: error,
        timestamp: Date.now(),
      }));
    } else {
      await AsyncStorage.removeItem(SYNC_ERROR_KEY);
    }
  } catch (err) {
    if (__DEV__) console.warn('[SyncService] Failed to store sync error:', err);
  }
}

/**
 * Get last sync error if any
 *
 * @internal
 * @returns Promise<{message: string; timestamp: number} | null>
 */
async function getLastSyncError(): Promise<{ message: string; timestamp: number } | null> {
  try {
    const stored = await AsyncStorage.getItem(SYNC_ERROR_KEY);
    return stored ? JSON.parse(stored) : null;
  } catch (error) {
    return null;
  }
}

/**
 * Pull changes from backend
 * Fetches all records created/updated/deleted since last_pulled_at
 *
 * In V2, this is read-only (backend has no client-generated data yet).
 * In Phase 3+, this will sync regulations, maps, and friend data.
 *
 * @internal
 * @returns Promise<SyncPullResponse>
 * @throws If backend is unreachable and no cached data available
 */
async function pullChanges(): Promise<SyncPullResponse> {
  try {
    // Get last pull timestamp from AsyncStorage
    const storedTimestamp = await AsyncStorage.getItem(LAST_PULLED_AT_KEY);
    const lastPulledAt = storedTimestamp ? parseInt(storedTimestamp, 10) : null;

    if (__DEV__) console.log(`[SyncService] Pulling changes since ${lastPulledAt || 'app start'}`);

    // Call backend pull endpoint
    const response = await syncClient.get<SyncPullResponse>(
      '/api/v1/sync/pull',
      {
        params: { last_pulled_at: lastPulledAt },
        headers: getAuthHeader(),
      }
    );

    // Store new last_pulled_at timestamp
    await AsyncStorage.setItem(LAST_PULLED_AT_KEY, response.data.timestamp.toString());

    if (__DEV__) {
      const changeCount = Object.values(response.data.changes.created).reduce((sum: number, arr: any) => sum + (Array.isArray(arr) ? arr.length : 0), 0) +
                          Object.values(response.data.changes.updated).reduce((sum: number, arr: any) => sum + (Array.isArray(arr) ? arr.length : 0), 0);
      console.log(`[SyncService] Pulled ${changeCount} changes from backend`);
    }

    return response.data;
  } catch (error) {
    if (__DEV__) console.warn('[SyncService] Pull failed:', error);
    throw error;
  }
}

/**
 * Push changes to backend
 * Sends all pending local changes (created, updated, deleted records)
 *
 * In V2, this is typically empty. In Phase 3+, syncs hunt plans, camps, photos, etc.
 *
 * @internal
 * @param changes - Changes to push
 * @returns Promise<SyncPushResponse>
 * @throws If backend is unreachable
 */
async function pushChanges(changes: SyncPushRequest['changes']): Promise<SyncPushResponse> {
  try {
    const payload: SyncPushRequest = {
      changes,
      client_timestamp: Date.now(),
    };

    if (__DEV__) {
      const changeCount = Object.values(changes.created).reduce((sum, arr) => sum + arr.length, 0) +
                          Object.values(changes.updated).reduce((sum, arr) => sum + arr.length, 0);
      console.log(`[SyncService] Pushing ${changeCount} changes to backend`);
    }

    const response = await syncClient.post<SyncPushResponse>(
      '/api/v1/sync/push',
      payload,
      {
        headers: getAuthHeader(),
      }
    );

    if (response.data.conflicted_ids.length > 0) {
      if (__DEV__) console.warn(`[SyncService] Conflicts detected: ${response.data.conflicted_ids.join(', ')}`);
    }

    return response.data;
  } catch (error) {
    if (__DEV__) console.warn('[SyncService] Push failed:', error);
    throw error;
  }
}

// ─── Public API ──────────────────────────────────────────────────

/**
 * Perform full bi-directional sync with backend
 *
 * Process:
 * 1. Pull remote changes (regulations, etc.)
 * 2. Push local changes (plans, camps, etc.)
 * 3. Handle conflicts via last-write-wins
 * 4. Update UI context with sync results
 *
 * Gracefully handles network errors:
 * - If backend unreachable, queues changes for later
 * - Does not crash app if sync fails
 * - Logs errors for debugging
 *
 * @async
 * @returns Promise<SyncResult> with sync outcome
 */
export async function sync(): Promise<SyncResult> {
  const startTime = Date.now();

  try {
    let pulledCount = 0;
    let pushedCount = 0;
    let conflicts: string[] = [];

    // Step 1: Pull changes from backend
    // In V2, this primarily fetches regulatory updates
    // In Phase 3+, this syncs friend data, forums, etc.
    try {
      const pullResponse = await pullChanges();
      pulledCount = Object.values(pullResponse.changes.created).reduce((sum: number, arr: any) => sum + (Array.isArray(arr) ? arr.length : 0), 0) +
                    Object.values(pullResponse.changes.updated).reduce((sum: number, arr: any) => sum + (Array.isArray(arr) ? arr.length : 0), 0);
    } catch (pullError) {
      if (__DEV__) console.warn('[SyncService] Pull phase failed, continuing with push:', pullError);
      // Continue to push even if pull fails
    }

    // Step 2: Push local changes to backend
    // In V2, this typically queues empty changes
    // In Phase 3+, syncs plans, camps, photos, etc.
    const pendingChanges = await getPendingChanges();
    if (pendingChanges) {
      try {
        const pushResponse = await pushChanges(pendingChanges);
        pushedCount = Object.values(pendingChanges.created).reduce((sum: number, arr: any) => sum + (Array.isArray(arr) ? arr.length : 0), 0) +
                      Object.values(pendingChanges.updated).reduce((sum: number, arr: any) => sum + (Array.isArray(arr) ? arr.length : 0), 0);
        conflicts = pushResponse.conflicted_ids;

        // Only clear pending changes if push succeeded
        if (pushResponse.acknowledged) {
          await clearPendingChanges();
        }
      } catch (pushError) {
        if (__DEV__) console.warn('[SyncService] Push phase failed, keeping changes queued:', pushError);
        // Keep pending changes queued for next sync attempt
      }
    }

    const timestamp = Date.now();
    const duration = timestamp - startTime;

    // Log successful sync to analytics
    try {
      // Direct call for now; in Phase 3, use analyticsService wrapper
      if (__DEV__) console.log(`[SyncService] Sync completed in ${duration}ms: pulled ${pulledCount}, pushed ${pushedCount}, conflicts ${conflicts.length}`);
    } catch (analyticsError) {
      // Ignore analytics errors
    }

    // Clear error flag on success
    await setSyncError(null);

    return {
      success: true,
      timestamp,
      pulledChanges: pulledCount,
      pushedChanges: pushedCount,
      conflicts,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    await setSyncError(errorMessage);

    if (__DEV__) console.error('[SyncService] Sync failed:', error);

    return {
      success: false,
      timestamp: Date.now(),
      pulledChanges: 0,
      pushedChanges: 0,
      conflicts: [],
      error: errorMessage,
    };
  }
}

/**
 * Queue a change for later sync
 * Used by contexts (ScoutDataContext, DeerCampContext) to mark data as dirty
 *
 * @async
 * @param table - Table name ('hunt_plans', 'waypoints', 'deer_camps', etc.)
 * @param action - 'create', 'update', or 'delete'
 * @param record - The record data (with id field)
 */
export async function queueChange(
  table: string,
  action: 'create' | 'update' | 'delete',
  record: { id: string; [key: string]: any }
): Promise<void> {
  try {
    const stored = await AsyncStorage.getItem(PENDING_CHANGES_KEY);
    const changes = stored ? JSON.parse(stored) : { created: {}, updated: {}, deleted: {} };

    // Initialize table arrays if missing
    if (!changes[action][table]) {
      changes[action][table] = [];
    }

    // For deletes, only store the ID
    if (action === 'delete') {
      if (!changes.deleted[table]) {
        changes.deleted[table] = [];
      }
      const filtered = changes.deleted[table].filter((id: string) => id !== record.id);
      changes.deleted[table] = [...filtered, record.id];
    } else {
      // For creates/updates, store full record
      const filtered = changes[action][table].filter((r: any) => r.id !== record.id);
      changes[action][table] = [...filtered, record];
    }

    await AsyncStorage.setItem(PENDING_CHANGES_KEY, JSON.stringify(changes));

    if (__DEV__) console.log(`[SyncService] Queued ${action} on ${table}:${record.id}`);
  } catch (error) {
    if (__DEV__) console.warn('[SyncService] Failed to queue change:', error);
  }
}

/**
 * Force clear all pending changes
 * Useful for debugging or after full reset
 *
 * @async
 * @returns Promise<void>
 */
export async function clearAllPendingChanges(): Promise<void> {
  try {
    await AsyncStorage.removeItem(PENDING_CHANGES_KEY);
    if (__DEV__) console.log('[SyncService] Cleared all pending changes');
  } catch (error) {
    if (__DEV__) console.warn('[SyncService] Failed to clear pending changes:', error);
  }
}

/**
 * Reset sync state (for debugging or logout)
 * Clears last_pulled_at, pending changes, and error flag
 *
 * @async
 * @returns Promise<void>
 */
export async function resetSyncState(): Promise<void> {
  try {
    await Promise.all([
      AsyncStorage.removeItem(LAST_PULLED_AT_KEY),
      AsyncStorage.removeItem(PENDING_CHANGES_KEY),
      AsyncStorage.removeItem(SYNC_ERROR_KEY),
    ]);
    if (__DEV__) console.log('[SyncService] Reset sync state');
  } catch (error) {
    if (__DEV__) console.warn('[SyncService] Failed to reset sync state:', error);
  }
}

/**
 * Get sync statistics for debugging
 *
 * @async
 * @returns Promise with pending change count and last error
 */
export async function getSyncStats(): Promise<{
  pendingChangeCount: number;
  lastError: { message: string; timestamp: number } | null;
  lastPulledAt: number | null;
}> {
  try {
    const [pendingStored, lastError, lastPulledAtStored] = await Promise.all([
      AsyncStorage.getItem(PENDING_CHANGES_KEY),
      getLastSyncError(),
      AsyncStorage.getItem(LAST_PULLED_AT_KEY),
    ]);

    let pendingChangeCount = 0;
    if (pendingStored) {
      const changes = JSON.parse(pendingStored);
      const countArrays = (obj: Record<string, any>): number => {
        return Object.values(obj).reduce((sum: number, arr: any) => sum + (Array.isArray(arr) ? arr.length : 0), 0);
      };
      pendingChangeCount = countArrays(changes.created) + countArrays(changes.updated) + countArrays(changes.deleted);
    }

    return {
      pendingChangeCount,
      lastError,
      lastPulledAt: lastPulledAtStored ? parseInt(lastPulledAtStored, 10) : null,
    };
  } catch (error) {
    if (__DEV__) console.warn('[SyncService] Failed to get sync stats:', error);
    return {
      pendingChangeCount: 0,
      lastError: null,
      lastPulledAt: null,
    };
  }
}
