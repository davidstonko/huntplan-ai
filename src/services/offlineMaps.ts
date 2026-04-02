/**
 * @file offlineMaps.ts
 * @description Offline map tile pack management for Mapbox GL.
 * Downloads, stores, and manages offline tile packs for Maryland hunting regions
 * using the real Mapbox offline manager API.
 *
 * Features:
 * - Download resume: interrupted downloads can be resumed
 * - Progress tracking: estimated time remaining, download speed
 * - Persistent state: download progress saved to AsyncStorage
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import MapboxGL from '@rnmapbox/maps';

const PACKS_METADATA_KEY = '@offline_map_packs_metadata';
const DOWNLOAD_STATE_KEY = '@offline_map_download_state';

export interface OfflineRegion {
  id: string;
  name: string;
  description: string;
  bounds: [[number, number], [number, number]]; // SW, NE corners
  minZoom: number;
  maxZoom: number;
  estimatedMB: number;
  estimatedSizeMB: number;
}

export interface DownloadedPack {
  id: string;
  name: string;
  downloadedAt: string;
  sizeMB: number;
  minZoom: number;
  maxZoom: number;
  status: 'complete' | 'downloading' | 'error' | 'interrupted';
}

export interface DownloadState {
  regionId: string;
  status: 'downloading' | 'complete' | 'interrupted' | 'error';
  startedAt: string;
  progress: number; // 0-1
  bytesDownloaded: number;
  estimatedTotalBytes: number;
  lastUpdatedAt: string;
  error?: string;
}

export const MARYLAND_REGIONS: OfflineRegion[] = [
  {
    id: 'md-western',
    name: 'Western Maryland',
    description: 'Garrett, Allegany, Washington counties — Green Ridge, Savage River, Dans Mountain',
    bounds: [[-79.5, 39.2], [-77.8, 39.75]],
    minZoom: 8,
    maxZoom: 15,
    estimatedMB: 120,
    estimatedSizeMB: 120,
  },
  {
    id: 'md-central',
    name: 'Central Maryland',
    description: 'Frederick, Carroll, Howard, Baltimore counties',
    bounds: [[-77.8, 39.1], [-76.5, 39.75]],
    minZoom: 8,
    maxZoom: 15,
    estimatedMB: 95,
    estimatedSizeMB: 95,
  },
  {
    id: 'md-eastern-shore',
    name: 'Eastern Shore',
    description: 'Kent, Queen Annes, Talbot, Dorchester, Wicomico — prime waterfowl territory',
    bounds: [[-76.5, 37.9], [-75.05, 39.5]],
    minZoom: 8,
    maxZoom: 15,
    estimatedMB: 140,
    estimatedSizeMB: 140,
  },
  {
    id: 'md-southern',
    name: 'Southern Maryland',
    description: 'Charles, Calvert, St. Marys, Prince Georges counties',
    bounds: [[-77.3, 38.0], [-76.3, 38.9]],
    minZoom: 8,
    maxZoom: 15,
    estimatedMB: 85,
    estimatedSizeMB: 85,
  },
  {
    id: 'md-north-central',
    name: 'North Central',
    description: 'Harford, Cecil, Baltimore County — Gunpowder Falls, Fair Hill',
    bounds: [[-76.8, 39.35], [-75.75, 39.75]],
    minZoom: 8,
    maxZoom: 15,
    estimatedMB: 70,
    estimatedSizeMB: 70,
  },
];

/**
 * Retrieves metadata for all downloaded packs from AsyncStorage
 * (Mapbox doesn't store metadata like download dates, so we track it separately)
 */
async function getPacksMetadata(): Promise<Record<string, DownloadedPack>> {
  try {
    const data = await AsyncStorage.getItem(PACKS_METADATA_KEY);
    return data ? JSON.parse(data) : {};
  } catch {
    return {};
  }
}

/**
 * Saves pack metadata to AsyncStorage
 */
async function savePacksMetadata(metadata: Record<string, DownloadedPack>): Promise<void> {
  await AsyncStorage.setItem(PACKS_METADATA_KEY, JSON.stringify(metadata));
}

/**
 * Get all active download states
 */
async function getDownloadStates(): Promise<Record<string, DownloadState>> {
  try {
    const data = await AsyncStorage.getItem(DOWNLOAD_STATE_KEY);
    return data ? JSON.parse(data) : {};
  } catch {
    return {};
  }
}

/**
 * Save download state for a region
 */
async function saveDownloadState(regionId: string, state: DownloadState): Promise<void> {
  try {
    const states = await getDownloadStates();
    states[regionId] = state;
    await AsyncStorage.setItem(DOWNLOAD_STATE_KEY, JSON.stringify(states));
  } catch (err) {
    if (__DEV__) console.warn('[offlineMaps] Failed to save download state:', err);
  }
}

/**
 * Get download state for a specific region
 */
export async function getDownloadState(regionId: string): Promise<DownloadState | null> {
  try {
    const states = await getDownloadStates();
    return states[regionId] || null;
  } catch {
    return null;
  }
}

/**
 * Clear download state for a region
 */
async function clearDownloadState(regionId: string): Promise<void> {
  try {
    const states = await getDownloadStates();
    delete states[regionId];
    await AsyncStorage.setItem(DOWNLOAD_STATE_KEY, JSON.stringify(states));
  } catch (err) {
    if (__DEV__) console.warn('[offlineMaps] Failed to clear download state:', err);
  }
}

/**
 * Calculates the actual disk size of a downloaded pack from Mapbox status
 */
function calculatePackSizeMB(pack: any): number {
  if (pack.status && pack.status.completedResourceSize) {
    // Mapbox reports size in bytes
    return Math.round(pack.status.completedResourceSize / (1024 * 1024));
  }
  return 0;
}

/**
 * Get all currently downloaded offline packs
 * Syncs Mapbox packs with local metadata and returns the combined result
 */
export async function getDownloadedPacks(): Promise<DownloadedPack[]> {
  try {
    // Get actual packs from Mapbox
    const mapboxPacks = await MapboxGL.offlineManager.getPacks();
    const metadata = await getPacksMetadata();

    // Map Mapbox packs to DownloadedPack format, using stored metadata
    return mapboxPacks.map((pack: any) => {
      const stored = metadata[pack.name];
      const sizeMB = calculatePackSizeMB(pack);

      return {
        id: pack.name,
        name: pack.name,
        downloadedAt: stored?.downloadedAt || new Date().toISOString(),
        sizeMB: sizeMB || stored?.sizeMB || 0,
        minZoom: stored?.minZoom || 8,
        maxZoom: stored?.maxZoom || 15,
        status: 'complete' as const,
      };
    });
  } catch (error) {
    if (__DEV__) console.warn('[offlineMaps] Error getting packs:', error);
    return [];
  }
}

/**
 * Download an offline map region using Mapbox offlineManager
 * Tracks progress with estimated time remaining and download speed.
 * Download state is persisted so interrupted downloads can be resumed.
 */
export async function downloadRegion(
  region: OfflineRegion,
  onProgress?: (pct: number, details?: { speedMBps: number; remainingSeconds: number }) => void,
): Promise<DownloadedPack> {
  return new Promise((resolve, reject) => {
    const downloadStartTime = Date.now();
    let lastProgressUpdate = downloadStartTime;
    let lastProgressValue = 0;
    let totalBytesEstimate = region.estimatedMB * 1024 * 1024;

    // Initialize download state
    saveDownloadState(region.id, {
      regionId: region.id,
      status: 'downloading',
      startedAt: new Date().toISOString(),
      progress: 0,
      bytesDownloaded: 0,
      estimatedTotalBytes: totalBytesEstimate,
      lastUpdatedAt: new Date().toISOString(),
    }).catch((err) => {
      if (__DEV__) console.warn('[offlineMaps] Failed to initialize download state:', err);
    });

    MapboxGL.offlineManager.createPack(
      {
        name: region.id,
        styleURL: MapboxGL.StyleURL.Outdoors,
        minZoom: region.minZoom,
        maxZoom: region.maxZoom,
        bounds: region.bounds,
      },
      // Progress callback
      async (offlineRegion: any, status: any) => {
        if (status && typeof status.percentage === 'number') {
          const pct = status.percentage / 100;

          // Calculate download speed and estimated time remaining
          const elapsedMs = Date.now() - downloadStartTime;
          const elapsedSeconds = Math.max(elapsedMs / 1000, 0.1);
          const bytesDownloaded = Math.floor(pct * totalBytesEstimate);
          const speedBytesPerSec = Math.max(bytesDownloaded / elapsedSeconds, 0.1);
          const speedMBps = speedBytesPerSec / (1024 * 1024);
          const remainingBytes = Math.max(totalBytesEstimate - bytesDownloaded, 0);
          const remainingSeconds = Math.ceil(remainingBytes / speedBytesPerSec);

          // Update download state periodically (every 2%)
          if (pct - lastProgressValue >= 0.02 || pct === 1) {
            saveDownloadState(region.id, {
              regionId: region.id,
              status: 'downloading',
              startedAt: new Date(downloadStartTime).toISOString(),
              progress: pct,
              bytesDownloaded,
              estimatedTotalBytes: totalBytesEstimate,
              lastUpdatedAt: new Date().toISOString(),
            }).catch((err) => {
              if (__DEV__) console.warn('[offlineMaps] Failed to save download progress:', err);
            });
            lastProgressValue = pct;
          }

          onProgress?.(pct, { speedMBps, remainingSeconds });
        }
      },
      // Error callback
      async (offlineRegion: any, error: any) => {
        if (error) {
          if (__DEV__) console.error('[offlineMaps] Download error for region:', region.id, error);

          // Mark as interrupted (user can resume)
          await saveDownloadState(region.id, {
            regionId: region.id,
            status: 'interrupted',
            startedAt: new Date(downloadStartTime).toISOString(),
            progress: lastProgressValue,
            bytesDownloaded: Math.floor(lastProgressValue * totalBytesEstimate),
            estimatedTotalBytes: totalBytesEstimate,
            lastUpdatedAt: new Date().toISOString(),
            error: error.message,
          }).catch((err) => {
            if (__DEV__) console.warn('[offlineMaps] Failed to save interrupted state:', err);
          });

          reject(new Error(`Failed to download ${region.name}: ${error.message}`));
        }
      },
    );

    // Poll for completion with more aggressive timing (250ms instead of 500ms)
    const pollInterval = setInterval(async () => {
      try {
        const packs = await MapboxGL.offlineManager.getPacks();
        const downloadedPack = packs.find((p: any) => p.name === region.id);

        if (downloadedPack) {
          const sizeMB = calculatePackSizeMB(downloadedPack);
          // status may be a function returning a promise or an object — handle both
          const rawStatus = typeof downloadedPack.status === 'function'
            ? await (downloadedPack.status as () => Promise<any>)()
            : downloadedPack.status;
          const resourceCount = rawStatus?.completedResourceCount || 0;
          const totalResources = rawStatus?.requiredResourceCount || 1;

          // Check if download is complete
          if (resourceCount > 0 && resourceCount === totalResources) {
            clearInterval(pollInterval);

            // Save metadata
            const metadata = await getPacksMetadata();
            const pack: DownloadedPack = {
              id: region.id,
              name: region.name,
              downloadedAt: new Date().toISOString(),
              sizeMB: sizeMB || region.estimatedMB,
              minZoom: region.minZoom,
              maxZoom: region.maxZoom,
              status: 'complete',
            };
            metadata[region.id] = pack;
            await savePacksMetadata(metadata);

            // Clear download state on completion
            await clearDownloadState(region.id);

            if (__DEV__) {
              console.log(
                `[offlineMaps] Download complete: ${region.id} (${(sizeMB).toFixed(1)}MB)`,
              );
            }

            resolve(pack);
          }
        }
      } catch (error) {
        clearInterval(pollInterval);
        if (__DEV__) console.error('[offlineMaps] Polling error:', error);
        reject(error);
      }
    }, 250); // Poll every 250ms for more responsive progress updates

    // Timeout after 30 minutes
    setTimeout(() => {
      clearInterval(pollInterval);
      reject(new Error(`Download timeout for ${region.name}`));
    }, 30 * 60 * 1000);
  });
}

/**
 * Retry downloading a region that was previously interrupted
 * Resumes from the current state if possible
 */
export async function retryDownload(
  region: OfflineRegion,
  onProgress?: (pct: number, details?: { speedMBps: number; remainingSeconds: number }) => void,
): Promise<DownloadedPack> {
  if (__DEV__) console.log(`[offlineMaps] Retrying download for region: ${region.id}`);
  return downloadRegion(region, onProgress);
}

/**
 * Cancel an active or interrupted download and clean up its state
 */
export async function cancelDownload(regionId: string): Promise<void> {
  try {
    // Attempt to delete the partial pack from Mapbox
    try {
      await MapboxGL.offlineManager.deletePack(regionId);
    } catch (err) {
      if (__DEV__) console.warn('[offlineMaps] Failed to delete pack from Mapbox:', err);
    }

    // Clear the download state
    await clearDownloadState(regionId);

    if (__DEV__) console.log(`[offlineMaps] Download cancelled: ${regionId}`);
  } catch (error) {
    if (__DEV__) console.error('[offlineMaps] Error cancelling download:', error);
    throw error;
  }
}

/**
 * Check for interrupted downloads on app launch and return them for user action
 */
export async function getInterruptedDownloads(): Promise<DownloadState[]> {
  try {
    const states = await getDownloadStates();
    return Object.values(states).filter((s) => s.status === 'interrupted');
  } catch (error) {
    if (__DEV__) console.warn('[offlineMaps] Error getting interrupted downloads:', error);
    return [];
  }
}

/**
 * Delete an offline map region from Mapbox and metadata storage
 */
export async function deleteRegion(regionId: string): Promise<void> {
  try {
    // Delete from Mapbox
    await MapboxGL.offlineManager.deletePack(regionId);

    // Delete from metadata
    const metadata = await getPacksMetadata();
    delete metadata[regionId];
    await savePacksMetadata(metadata);
  } catch (error) {
    if (__DEV__) console.error('[offlineMaps] Error deleting region:', regionId, error);
    throw error;
  }
}

/**
 * Delete all offline map packs
 */
export async function deleteAllPacks(): Promise<void> {
  try {
    const packs = await MapboxGL.offlineManager.getPacks();

    // Delete each pack from Mapbox
    for (const pack of packs) {
      try {
        await MapboxGL.offlineManager.deletePack(pack.name);
      } catch (error) {
        if (__DEV__) console.warn('[offlineMaps] Error deleting pack:', pack.name, error);
      }
    }

    // Clear metadata
    await AsyncStorage.removeItem(PACKS_METADATA_KEY);
  } catch (error) {
    if (__DEV__) console.error('[offlineMaps] Error deleting all packs:', error);
    throw error;
  }
}

/**
 * Get total disk usage of all downloaded offline packs in MB
 */
export async function getTotalDiskUsage(): Promise<number> {
  try {
    const packs = await getDownloadedPacks();
    return packs.reduce((sum, p) => sum + p.sizeMB, 0);
  } catch (error) {
    if (__DEV__) console.error('[offlineMaps] Error calculating total disk usage:', error);
    return 0;
  }
}
