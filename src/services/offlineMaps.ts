/**
 * @file offlineMaps.ts
 * @description Offline map tile pack management for Mapbox GL.
 * Downloads, stores, and manages offline tile packs for Maryland hunting regions.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

const PACKS_KEY = '@offline_map_packs';

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
  status: 'complete' | 'downloading' | 'error';
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

export async function getDownloadedPacks(): Promise<DownloadedPack[]> {
  try {
    const data = await AsyncStorage.getItem(PACKS_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

async function savePacks(packs: DownloadedPack[]): Promise<void> {
  await AsyncStorage.setItem(PACKS_KEY, JSON.stringify(packs));
}

export async function downloadRegion(
  region: OfflineRegion,
  onProgress?: (pct: number) => void,
): Promise<DownloadedPack> {
  // Simulate download progress (real implementation uses Mapbox.offlineManager)
  for (let i = 0; i <= 100; i += 10) {
    await new Promise((r) => setTimeout(r, 200));
    onProgress?.(i / 100);
  }

  const pack: DownloadedPack = {
    id: region.id,
    name: region.name,
    downloadedAt: new Date().toISOString(),
    sizeMB: region.estimatedMB,
    minZoom: region.minZoom,
    maxZoom: region.maxZoom,
    status: 'complete',
  };

  const packs = await getDownloadedPacks();
  const existing = packs.findIndex((p) => p.id === region.id);
  if (existing >= 0) {
    packs[existing] = pack;
  } else {
    packs.push(pack);
  }
  await savePacks(packs);
  return pack;
}

export async function deleteRegion(regionId: string): Promise<void> {
  const packs = await getDownloadedPacks();
  await savePacks(packs.filter((p) => p.id !== regionId));
}

export async function deleteAllPacks(): Promise<void> {
  await AsyncStorage.removeItem(PACKS_KEY);
}

export async function getTotalDiskUsage(): Promise<number> {
  const packs = await getDownloadedPacks();
  return packs.reduce((sum, p) => sum + p.sizeMB, 0);
}
