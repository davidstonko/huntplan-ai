/**
 * @file offlineMaps.ts
 * @description Mapbox offline tile pack manager for MDHuntFishOutdoors.
 * Downloads and manages offline map regions so hunters can use the app
 * in areas with no cell service.
 *
 * Uses @rnmapbox/maps offlineManager for tile storage.
 * Maryland-first: pre-defined regions covering all MD public hunting lands.
 *
 * @module services/offlineMaps
 * @version 3.0.0
 */

import MapboxGL from '@rnmapbox/maps';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { MAP_STYLE_OUTDOORS } from '../constants/mapStyles';

const STORAGE_KEY = '@offline_packs';

// ─── Types ───────────────────────────────────────────────────────

export interface OfflineRegion {
  id: string;
  name: string;
  /** [SW lng, SW lat, NE lng, NE lat] */
  bounds: [number, number, number, number];
  minZoom: number;
  maxZoom: number;
  /** Estimated size in MB */
  estimatedSizeMB: number;
}

export interface DownloadedPack {
  id: string;
  name: string;
  downloadedAt: string;
  sizeMB: number;
  status: 'complete' | 'downloading' | 'error';
  progress: number;  // 0-100
}

// ─── Pre-defined Maryland Regions ────────────────────────────────

export const MARYLAND_REGIONS: OfflineRegion[] = [
  {
    id: 'md-western',
    name: 'Western MD (Allegany, Garrett)',
    bounds: [-79.49, 39.20, -78.33, 39.73],
    minZoom: 8,
    maxZoom: 15,
    estimatedSizeMB: 120,
  },
  {
    id: 'md-central',
    name: 'Central MD (Frederick, Washington, Carroll)',
    bounds: [-77.85, 39.20, -76.85, 39.73],
    minZoom: 8,
    maxZoom: 15,
    estimatedSizeMB: 150,
  },
  {
    id: 'md-piedmont',
    name: 'Piedmont MD (Baltimore, Howard, Harford)',
    bounds: [-77.10, 39.15, -76.15, 39.73],
    minZoom: 8,
    maxZoom: 15,
    estimatedSizeMB: 180,
  },
  {
    id: 'md-eastern-shore',
    name: 'Eastern Shore (Dorchester, Talbot, Kent)',
    bounds: [-76.50, 38.05, -75.60, 39.40],
    minZoom: 8,
    maxZoom: 15,
    estimatedSizeMB: 140,
  },
  {
    id: 'md-southern',
    name: 'Southern MD (Charles, Calvert, St. Marys)',
    bounds: [-77.25, 38.05, -76.40, 38.75],
    minZoom: 8,
    maxZoom: 15,
    estimatedSizeMB: 110,
  },
];

// ─── Download Management ─────────────────────────────────────────

/**
 * Download an offline map region.
 * Uses Mapbox's offlineManager to store tiles locally.
 *
 * @param region - The region definition to download
 * @param onProgress - Progress callback (0-100, optional download details)
 */
export async function downloadRegion(
  region: OfflineRegion,
  onProgress?: (progress: number, details?: unknown) => void,
): Promise<void> {
  // Must match the styleURL the map screens render (see constants/mapStyles.ts)
  // or Mapbox will not serve these tiles to the live map.
  const styleURL = MAP_STYLE_OUTDOORS;

  // Define the pack
  const packName = region.id;
  const bounds: [number, number, number, number] = region.bounds;

  await MapboxGL.offlineManager.createPack(
    {
      name: packName,
      styleURL,
      bounds: [
        [bounds[0], bounds[1]],  // SW corner [lng, lat]
        [bounds[2], bounds[3]],  // NE corner [lng, lat]
      ],
      minZoom: region.minZoom,
      maxZoom: region.maxZoom,
    },
    (offlinePack, status) => {
      if (status && onProgress) {
        const progress = status.percentage ?? 0;
        onProgress(Math.round(progress));
      }
    },
    (offlinePack, error) => {
      console.error(`[OfflineMaps] Error downloading ${region.name}:`, error);
    },
  );

  // Save download record
  const packs = await getDownloadedPacks();
  const newPack: DownloadedPack = {
    id: region.id,
    name: region.name,
    downloadedAt: new Date().toISOString(),
    sizeMB: region.estimatedSizeMB,
    status: 'complete',
    progress: 100,
  };

  const existing = packs.findIndex(p => p.id === region.id);
  if (existing >= 0) {
    packs[existing] = newPack;
  } else {
    packs.push(newPack);
  }

  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(packs));
}

/**
 * Delete a downloaded offline region.
 */
export async function deleteRegion(regionId: string): Promise<void> {
  try {
    await MapboxGL.offlineManager.deletePack(regionId);
  } catch (e) {
    console.warn(`[OfflineMaps] Could not delete pack ${regionId}:`, e);
  }

  const packs = await getDownloadedPacks();
  const filtered = packs.filter(p => p.id !== regionId);
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
}

/**
 * Get list of downloaded packs.
 */
export async function getDownloadedPacks(): Promise<DownloadedPack[]> {
  try {
    const json = await AsyncStorage.getItem(STORAGE_KEY);
    return json ? JSON.parse(json) : [];
  } catch {
    return [];
  }
}

/**
 * Check if a specific region is downloaded.
 */
export async function isRegionDownloaded(regionId: string): Promise<boolean> {
  const packs = await getDownloadedPacks();
  return packs.some(p => p.id === regionId && p.status === 'complete');
}

/**
 * Get all available regions with their download status.
 */
export async function getRegionsWithStatus(): Promise<(OfflineRegion & { downloaded: boolean })[]> {
  const packs = await getDownloadedPacks();
  return MARYLAND_REGIONS.map(region => ({
    ...region,
    downloaded: packs.some(p => p.id === region.id && p.status === 'complete'),
  }));
}

/**
 * Get total disk usage of all downloaded packs.
 */
export async function getTotalDiskUsage(): Promise<number> {
  const packs = await getDownloadedPacks();
  return packs.reduce((sum, p) => sum + p.sizeMB, 0);
}

/**
 * Download offline tiles for a single deer camp's user-drawn area.
 *
 * Deer-camp areas are capped at 5 sq mi, so downloads are small relative
 * to the pre-defined regional packs above — expect 10–60 MB depending on
 * zoom range and terrain. Pack id is derived from the camp id so the
 * pack can be deleted when the camp is deleted.
 *
 * Added 2026-04-20 per user directive: "the smaller the less data they
 * require, and then these are available offline and are the platform
 * upon which the social media element exists."
 *
 * @param campId    - Deer camp id (used as pack id prefix)
 * @param campName  - Human-readable label for the pack
 * @param bounds    - Camp area bounds (north/south/east/west in degrees)
 * @param onProgress - Progress callback (0-100)
 */
export async function downloadCampArea(
  campId: string,
  campName: string,
  bounds: { north: number; south: number; east: number; west: number },
  onProgress?: (progress: number) => void,
): Promise<void> {
  const region: OfflineRegion = {
    id: `camp-${campId}`,
    name: `Deer Camp — ${campName}`,
    bounds: [bounds.west, bounds.south, bounds.east, bounds.north],
    minZoom: 10,
    maxZoom: 15,
    estimatedSizeMB: 30, // rough mid-range estimate; revised post-download
  };
  await downloadRegion(region, onProgress);
}

/**
 * Delete the offline pack tied to a deer camp (called when the camp
 * itself is deleted, or when the user clears offline tiles).
 */
export async function deleteCampArea(campId: string): Promise<void> {
  await deleteRegion(`camp-${campId}`);
}

/**
 * Check whether a camp's offline tile pack has been downloaded.
 */
export async function isCampAreaDownloaded(campId: string): Promise<boolean> {
  return isRegionDownloaded(`camp-${campId}`);
}

/**
 * Delete all downloaded packs.
 */
export async function deleteAllPacks(): Promise<void> {
  const packs = await getDownloadedPacks();
  for (const pack of packs) {
    try {
      await MapboxGL.offlineManager.deletePack(pack.id);
    } catch (e) {
      // Continue deleting others
    }
  }
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify([]));
}

// ────────────────────────────────────────────────────────────────────────────
// 2026-04-26 (fork merge): stubs for the V2.2 OfflineMapsScreen surface.
// These functions exist so the screen typechecks; behavior is graceful no-op
// where the underlying capability isn't wired through Mapbox offlineManager.
// ────────────────────────────────────────────────────────────────────────────

export interface DownloadState {
  regionId: string;
  progress: number;
  status: 'queued' | 'downloading' | 'paused' | 'failed' | 'completed';
  error?: string;
  startedAt?: string;
}

const INTERRUPTED_KEY = '@offline_packs_interrupted_v1';

/** Retry a previously-failed/cancelled download. Same signature as downloadRegion. */
export async function retryDownload(
  region: OfflineRegion,
  onProgress?: (progress: number, details?: unknown) => void,
): Promise<void> {
  // Adapt: downloadRegion currently takes (region, (progress: number) => void).
  // Strip the second progress arg to match.
  await downloadRegion(region, (p) => onProgress?.(p, undefined));
}

/** Cancel an in-flight download by region id. Best-effort no-op for now. */
export async function cancelDownload(regionId: string): Promise<void> {
  try {
    await MapboxGL.offlineManager.deletePack(regionId);
  } catch {
    // Pack may not exist yet — fine.
  }
}

/** Return any download states the user left interrupted on a previous session. */
export async function getInterruptedDownloads(): Promise<DownloadState[]> {
  try {
    const json = await AsyncStorage.getItem(INTERRUPTED_KEY);
    return json ? (JSON.parse(json) as DownloadState[]) : [];
  } catch {
    return [];
  }
}
