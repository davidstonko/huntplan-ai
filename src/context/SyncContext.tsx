/**
 * @file SyncContext.tsx
 * @description React context for managing backend sync state and lifecycle.
 * Wraps src/services/syncService.ts which uses AsyncStorage + axios under
 * the hood. The pull/push protocol matches watermelondb-sync's wire format
 * so the storage layer can be swapped to WatermelonDB in Phase 3.
 *
 * Tracks:
 * - lastSyncedAt: timestamp of last successful sync
 * - isSyncing: whether a sync is in progress
 * - syncError: most recent error message, if any
 * - autoSyncEnabled: whether auto-sync is active
 *
 * Provides:
 * - syncNow(): trigger immediate sync
 * - enableAutoSync(): start periodic syncing (60s interval)
 * - disableAutoSync(): stop periodic syncing
 * - clearError(): dismiss error message
 *
 * Behavior:
 * - Auto-sync only runs when online (uses NetInfo to detect connectivity)
 * - Gracefully handles network errors — doesn't crash app
 * - Logs sync events for debugging via console (DEV mode)
 *
 * Usage:
 * ```tsx
 * // In App.tsx
 * <SyncProvider>
 *   <RestOfApp />
 * </SyncProvider>
 *
 * // In component
 * const { lastSyncedAt, isSyncing, syncError, syncNow } = useSync();
 * ```
 */

import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useRef,
  ReactNode,
} from 'react';
import NetInfo from '@react-native-community/netinfo';
import { sync, getSyncStats, SyncResult } from '../services/syncService';

// ─── Types ──────────────────────────────────────────────────────

export interface SyncState {
  /** Timestamp of last successful sync (null if never synced) */
  lastSyncedAt: number | null;

  /** Whether a sync is currently in progress */
  isSyncing: boolean;

  /** Most recent sync error message, if any */
  syncError: string | null;

  /** Whether auto-sync is enabled */
  autoSyncEnabled: boolean;

  /** Result of last sync attempt */
  lastSyncResult: SyncResult | null;

  /** Number of pending changes queued for sync */
  pendingChangeCount: number;
}

interface SyncContextType extends SyncState {
  /** Trigger immediate sync */
  syncNow: () => Promise<SyncResult>;

  /** Enable automatic periodic syncing (60s interval) */
  enableAutoSync: () => void;

  /** Disable automatic periodic syncing */
  disableAutoSync: () => void;

  /** Clear error message */
  clearError: () => void;

  /** Reset sync state (for logout/debugging) */
  resetSync: () => void;
}

const SyncContext = createContext<SyncContextType | undefined>(undefined);

// ─── Constants ──────────────────────────────────────────────────

const AUTO_SYNC_INTERVAL_MS = 60 * 1000; // 60 seconds

// ─── Provider Component ──────────────────────────────────────────

interface SyncProviderProps {
  children: ReactNode;
  autoSyncEnabled?: boolean;
}

/**
 * SyncProvider — Manages sync state and lifecycle
 * Wrap your root component tree with this provider to enable syncing.
 *
 * Features:
 * - Monitors network connectivity via NetInfo
 * - Auto-sync only when online and autoSyncEnabled
 * - Graceful error handling (doesn't crash on sync failure)
 * - Periodic stats refresh (gets pending change count)
 *
 * @component
 */
export const SyncProvider: React.FC<SyncProviderProps> = ({
  children,
  autoSyncEnabled: initialAutoSyncEnabled = true,
}) => {
  // State
  const [syncState, setSyncState] = useState<SyncState>({
    lastSyncedAt: null,
    isSyncing: false,
    syncError: null,
    autoSyncEnabled: initialAutoSyncEnabled,
    lastSyncResult: null,
    pendingChangeCount: 0,
  });

  // Refs for lifecycle management
  const syncTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const isOnlineRef = useRef<boolean>(true);

  // ─── Sync Logic ─────────────────────────────────────────────

  /**
   * Perform sync and update state
   */
  const performSync = useCallback(async (): Promise<SyncResult> => {
    // Don't sync if offline
    if (!isOnlineRef.current) {
      if (__DEV__) console.log('[SyncContext] Skipping sync while offline');
      return {
        success: false,
        timestamp: Date.now(),
        pulledChanges: 0,
        pushedChanges: 0,
        conflicts: [],
        error: 'Device is offline',
      };
    }

    // Set syncing flag
    setSyncState(prev => ({
      ...prev,
      isSyncing: true,
      syncError: null,
    }));

    try {
      // Perform actual sync
      const result = await sync();

      // Get updated stats
      const stats = await getSyncStats();

      // Update state with result
      setSyncState(prev => ({
        ...prev,
        lastSyncedAt: result.timestamp,
        isSyncing: false,
        syncError: result.error || null,
        lastSyncResult: result,
        pendingChangeCount: stats.pendingChangeCount,
      }));

      if (__DEV__) {
        const status = result.success ? 'succeeded' : 'failed';
        console.log(`[SyncContext] Sync ${status}: ${result.pulledChanges} pulled, ${result.pushedChanges} pushed`);
      }

      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);

      setSyncState(prev => ({
        ...prev,
        isSyncing: false,
        syncError: errorMessage,
        lastSyncResult: {
          success: false,
          timestamp: Date.now(),
          pulledChanges: 0,
          pushedChanges: 0,
          conflicts: [],
          error: errorMessage,
        },
      }));

      if (__DEV__) console.error('[SyncContext] Sync error:', error);

      return {
        success: false,
        timestamp: Date.now(),
        pulledChanges: 0,
        pushedChanges: 0,
        conflicts: [],
        error: errorMessage,
      };
    }
  }, []);

  /**
   * Start auto-sync timer
   */
  const startAutoSync = useCallback(() => {
    if (syncTimerRef.current) {
      return; // Already running
    }

    if (__DEV__) console.log('[SyncContext] Starting auto-sync timer (60s interval)');

    // Perform sync immediately, then set up interval
    performSync().catch(error => {
      if (__DEV__) console.warn('[SyncContext] Initial sync failed:', error);
    });

    syncTimerRef.current = setInterval(() => {
      if (isOnlineRef.current && syncState.autoSyncEnabled) {
        performSync().catch(error => {
          if (__DEV__) console.warn('[SyncContext] Auto-sync failed:', error);
        });
      }
    }, AUTO_SYNC_INTERVAL_MS);
  }, [performSync, syncState.autoSyncEnabled]);

  /**
   * Stop auto-sync timer
   */
  const stopAutoSync = useCallback(() => {
    if (syncTimerRef.current) {
      clearInterval(syncTimerRef.current);
      syncTimerRef.current = null;
      if (__DEV__) console.log('[SyncContext] Stopped auto-sync timer');
    }
  }, []);

  // ─── Effects ────────────────────────────────────────────────

  /**
   * Monitor network connectivity
   */
  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener(state => {
      const isOnline = state.isConnected === true;
      isOnlineRef.current = isOnline;

      if (__DEV__) {
        console.log(`[SyncContext] Network ${isOnline ? 'online' : 'offline'}`);
      }

      // If coming back online, trigger sync
      if (isOnline && syncState.autoSyncEnabled && !syncState.isSyncing) {
        performSync().catch(error => {
          if (__DEV__) console.warn('[SyncContext] Sync after reconnect failed:', error);
        });
      }
    });

    return () => {
      unsubscribe();
    };
  }, [syncState.autoSyncEnabled, syncState.isSyncing, performSync]);

  /**
   * Manage auto-sync lifecycle based on autoSyncEnabled flag
   */
  useEffect(() => {
    if (syncState.autoSyncEnabled) {
      startAutoSync();
    } else {
      stopAutoSync();
    }

    return () => {
      // Cleanup on unmount
      stopAutoSync();
    };
  }, [syncState.autoSyncEnabled, startAutoSync, stopAutoSync]);

  /**
   * Get initial sync stats on mount
   */
  useEffect(() => {
    getSyncStats()
      .then(stats => {
        setSyncState(prev => ({
          ...prev,
          pendingChangeCount: stats.pendingChangeCount,
        }));
      })
      .catch(error => {
        if (__DEV__) console.warn('[SyncContext] Failed to get initial sync stats:', error);
      });
  }, []);

  // ─── Context Value ──────────────────────────────────────────

  const contextValue: SyncContextType = {
    ...syncState,
    syncNow: performSync,
    enableAutoSync: () => {
      setSyncState(prev => ({ ...prev, autoSyncEnabled: true }));
    },
    disableAutoSync: () => {
      setSyncState(prev => ({ ...prev, autoSyncEnabled: false }));
    },
    clearError: () => {
      setSyncState(prev => ({ ...prev, syncError: null }));
    },
    resetSync: () => {
      setSyncState({
        lastSyncedAt: null,
        isSyncing: false,
        syncError: null,
        autoSyncEnabled: initialAutoSyncEnabled,
        lastSyncResult: null,
        pendingChangeCount: 0,
      });
    },
  };

  return (
    <SyncContext.Provider value={contextValue}>
      {children}
    </SyncContext.Provider>
  );
};

// ─── Hook ───────────────────────────────────────────────────────

/**
 * useSync — Hook to access sync context in components
 *
 * @returns SyncContextType with all sync state and actions
 * @throws If used outside of SyncProvider
 *
 * @example
 * ```tsx
 * const { lastSyncedAt, isSyncing, syncNow } = useSync();
 *
 * return (
 *   <>
 *     <Text>Last synced: {lastSyncedAt ? new Date(lastSyncedAt).toLocaleString() : 'Never'}</Text>
 *     {isSyncing && <ActivityIndicator />}
 *     <Button title="Sync Now" onPress={syncNow} />
 *   </>
 * );
 * ```
 */
export function useSync(): SyncContextType {
  const context = useContext(SyncContext);
  if (!context) {
    throw new Error('useSync() must be called within <SyncProvider>');
  }
  return context;
}
