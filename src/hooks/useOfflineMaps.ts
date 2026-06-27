/**
 * @file useOfflineMaps.ts
 * @description Shared hook backing the on-map offline-tiles control that every
 * map screen renders. Surfaces whether the device is offline and whether any
 * tile packs have been downloaded, so a map can warn the user when they are
 * offline with no cached tiles (the "blank gray basemap" failure the offline
 * audit flagged as the #1 risk).
 *
 * @module hooks/useOfflineMaps
 */

import { useState, useEffect, useCallback } from 'react';
import { useNetworkStatus } from './useNetworkStatus';
import {
  getDownloadedPacks,
  DownloadedPack,
} from '../services/offlineMaps';

export interface UseOfflineMapsResult {
  /** Device currently has no usable internet connection. */
  isOffline: boolean;
  /** At least one completed offline tile pack exists on disk. */
  hasPacks: boolean;
  /** All downloaded packs (completed or otherwise). */
  packs: DownloadedPack[];
  /** True until the first pack lookup resolves (avoids a warning flash). */
  loading: boolean;
  /** Re-read the downloaded packs from disk (call after a download/delete). */
  refresh: () => Promise<void>;
}

export function useOfflineMaps(): UseOfflineMapsResult {
  const { isOnline } = useNetworkStatus();
  const [packs, setPacks] = useState<DownloadedPack[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const downloaded = await getDownloadedPacks();
      setPacks(downloaded);
    } catch {
      setPacks([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return {
    isOffline: !isOnline,
    hasPacks: packs.some((p) => p.status === 'complete'),
    packs,
    loading,
    refresh,
  };
}
