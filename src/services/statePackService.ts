/**
 * @file statePackService.ts
 * @description State data pack manager for multi-state expansion.
 *
 * Manages downloading, installing, and switching between state data packs.
 * Each state pack is a downloadable bundle containing:
 * - Regulations (seasons, bag limits, licenses)
 * - GIS boundaries (hunting lands, fishing grounds, parks, trails)
 * - Fishing/hunting/camping data (access sites, stocking locations, campgrounds)
 * - AI knowledge base (pre-indexed regulations for RAG chat)
 * - Map tile regions (offline Mapbox tile packs for each state)
 *
 * States: MD (built-in, cannot delete), VA (downloadable), PA (downloadable)
 *
 * AsyncStorage Keys:
 * @state_packs_metadata - Object mapping stateCode → StatePackMetadata
 * @active_state - Current active state code (defaults to 'MD')
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { StatePack, StateCode, StatePackMetadata, isValidStateCode } from '../types/statePack';
import {
  STATE_PACK_REGISTRY,
  getStatePackByCode,
  getInstalledPacks,
  formatPackSize,
} from '../data/statePackRegistry';

const METADATA_KEY = '@state_packs_metadata';
const ACTIVE_STATE_KEY = '@active_state';
const DEFAULT_ACTIVE_STATE: StateCode = 'MD';

/**
 * Initialize state pack metadata in AsyncStorage.
 * Called once on app startup.
 * @returns Promise that resolves when initialization is complete
 */
export async function initializeStatePacks(): Promise<void> {
  try {
    const existing = await AsyncStorage.getItem(METADATA_KEY);
    if (!existing) {
      // Initialize with registry data
      const metadata: Record<StateCode, StatePackMetadata> = {
        MD: {
          stateCode: 'MD',
          installed: true,
          version: STATE_PACK_REGISTRY[0].version,
          lastUpdated: STATE_PACK_REGISTRY[0].lastUpdated || new Date().toISOString(),
        },
        VA: {
          stateCode: 'VA',
          installed: false,
          version: STATE_PACK_REGISTRY[1].version,
          lastUpdated: STATE_PACK_REGISTRY[1].releaseDate || new Date().toISOString(),
        },
        PA: {
          stateCode: 'PA',
          installed: false,
          version: STATE_PACK_REGISTRY[2].version,
          lastUpdated: STATE_PACK_REGISTRY[2].releaseDate || new Date().toISOString(),
        },
      };
      await AsyncStorage.setItem(METADATA_KEY, JSON.stringify(metadata));
    }

    // Ensure active state is set
    const activeState = await AsyncStorage.getItem(ACTIVE_STATE_KEY);
    if (!activeState) {
      await AsyncStorage.setItem(ACTIVE_STATE_KEY, DEFAULT_ACTIVE_STATE);
    }
  } catch (error) {
    if (__DEV__) console.error('Error initializing state packs:', error);
    throw error;
  }
}

/**
 * Get all available state packs with current installation status.
 * Merges registry data with AsyncStorage metadata.
 * @returns Promise resolving to array of StatePack objects
 */
export async function getAvailableStatePacks(): Promise<StatePack[]> {
  try {
    const metadataStr = await AsyncStorage.getItem(METADATA_KEY);
    const metadata: Record<StateCode, StatePackMetadata> = metadataStr
      ? JSON.parse(metadataStr)
      : {};

    return STATE_PACK_REGISTRY.map((registryPack) => {
      const meta = metadata[registryPack.stateCode as StateCode];
      return {
        ...registryPack,
        installed: meta?.installed ?? registryPack.installed,
        downloadProgress: meta?.downloadProgress,
        lastUpdated: meta?.lastUpdated ?? registryPack.lastUpdated,
        version: meta?.version ?? registryPack.version,
      };
    });
  } catch (error) {
    if (__DEV__) console.error('Error fetching available state packs:', error);
    throw error;
  }
}

/**
 * Get only installed state packs.
 * @returns Promise resolving to array of installed StatePack objects
 */
export async function getInstalledStatePacks(): Promise<StatePack[]> {
  const allPacks = await getAvailableStatePacks();
  return allPacks.filter((pack) => pack.installed);
}

/**
 * Get a single state pack by code.
 * @param stateCode - The state code ('MD', 'VA', 'PA')
 * @returns Promise resolving to StatePack or undefined if not found
 */
export async function getStatePackByCodeAsync(stateCode: StateCode): Promise<StatePack | undefined> {
  const allPacks = await getAvailableStatePacks();
  return allPacks.find((pack) => pack.stateCode === stateCode);
}

/**
 * Download and install a state pack.
 * This is a placeholder that simulates download progress and updates AsyncStorage.
 *
 * In Phase 3+, this will:
 * 1. Download pack manifest from server
 * 2. Verify checksums
 * 3. Download tile packs to device filesystem
 * 4. Extract and validate data
 * 5. Update AsyncStorage with installed status
 *
 * @param stateCode - The state code to download
 * @param onProgress - Optional callback for download progress (0-100)
 * @returns Promise that resolves when installation is complete
 * @throws Error if state code is invalid or pack already installed
 */
export async function downloadStatePack(
  stateCode: StateCode,
  onProgress?: (progress: number) => void
): Promise<void> {
  try {
    if (!isValidStateCode(stateCode)) {
      throw new Error(`Invalid state code: ${stateCode}`);
    }

    if (stateCode === 'MD') {
      throw new Error('Cannot download Maryland pack — it is built-in.');
    }

    const allPacks = await getAvailableStatePacks();
    const pack = allPacks.find((p) => p.stateCode === stateCode);

    if (!pack) {
      throw new Error(`State pack not found: ${stateCode}`);
    }

    if (pack.installed) {
      throw new Error(`State pack already installed: ${stateCode}`);
    }

    // TODO: Phase 3 — Implement actual download
    // For now, simulate progress and mark as installed
    const metadata: Record<StateCode, StatePackMetadata> = JSON.parse(
      (await AsyncStorage.getItem(METADATA_KEY)) || '{}'
    );

    // Simulate download progress
    for (let progress = 0; progress <= 100; progress += 10) {
      await new Promise((resolve) => setTimeout(resolve, 100)); // Simulate delay
      onProgress?.(progress);

      // Update progress in storage
      metadata[stateCode] = {
        ...metadata[stateCode],
        downloadProgress: progress,
      };
      await AsyncStorage.setItem(METADATA_KEY, JSON.stringify(metadata));
    }

    // Mark as installed
    metadata[stateCode] = {
      stateCode,
      installed: true,
      version: pack.version,
      lastUpdated: new Date().toISOString(),
      downloadProgress: undefined,
    };

    await AsyncStorage.setItem(METADATA_KEY, JSON.stringify(metadata));

    if (__DEV__) console.log(`State pack installed: ${stateCode}`);
  } catch (error) {
    if (__DEV__) console.error('Error downloading state pack:', error);
    throw error;
  }
}

/**
 * Delete a state pack from the device.
 * Cannot delete Maryland (built-in).
 *
 * @param stateCode - The state code to delete
 * @returns Promise that resolves when deletion is complete
 * @throws Error if attempting to delete Maryland or pack not found
 */
export async function deleteStatePack(stateCode: StateCode): Promise<void> {
  try {
    if (stateCode === 'MD') {
      throw new Error('Cannot delete Maryland pack — it is built-in.');
    }

    const metadata: Record<StateCode, StatePackMetadata> = JSON.parse(
      (await AsyncStorage.getItem(METADATA_KEY)) || '{}'
    );

    if (!metadata[stateCode]) {
      throw new Error(`State pack not found: ${stateCode}`);
    }

    // TODO: Phase 3 — Delete map tiles and cached data from filesystem
    // For now, just update AsyncStorage

    metadata[stateCode] = {
      ...metadata[stateCode],
      installed: false,
      downloadProgress: undefined,
    };

    await AsyncStorage.setItem(METADATA_KEY, JSON.stringify(metadata));

    // If deleted state was active, switch back to MD
    const activeState = await AsyncStorage.getItem(ACTIVE_STATE_KEY);
    if (activeState === stateCode) {
      await AsyncStorage.setItem(ACTIVE_STATE_KEY, DEFAULT_ACTIVE_STATE);
    }

    if (__DEV__) console.log(`State pack deleted: ${stateCode}`);
  } catch (error) {
    if (__DEV__) console.error('Error deleting state pack:', error);
    throw error;
  }
}

/**
 * Check if newer versions of installed packs are available.
 * This is a placeholder for Phase 3+.
 *
 * @returns Promise resolving to array of state codes with available updates
 */
export async function checkForUpdates(): Promise<StateCode[]> {
  try {
    // TODO: Phase 3 — Fetch manifest from server and compare versions
    // For now, return empty array
    if (__DEV__) console.log('Checking for state pack updates...');
    return [];
  } catch (error) {
    if (__DEV__) console.error('Error checking for updates:', error);
    return [];
  }
}

/**
 * Get the currently active state code.
 * Used to determine which state's data to display.
 *
 * @returns Promise resolving to the active state code
 */
export async function getActiveState(): Promise<StateCode> {
  try {
    const activeState = await AsyncStorage.getItem(ACTIVE_STATE_KEY);
    if (activeState && isValidStateCode(activeState)) {
      return activeState as StateCode;
    }
    return DEFAULT_ACTIVE_STATE;
  } catch (error) {
    if (__DEV__) console.error('Error getting active state:', error);
    return DEFAULT_ACTIVE_STATE;
  }
}

/**
 * Switch the active state.
 * The state must be installed before it can be made active.
 *
 * @param stateCode - The state code to activate
 * @returns Promise that resolves when state is switched
 * @throws Error if state code is invalid or pack not installed
 */
export async function setActiveState(stateCode: StateCode): Promise<void> {
  try {
    if (!isValidStateCode(stateCode)) {
      throw new Error(`Invalid state code: ${stateCode}`);
    }

    const pack = await getStatePackByCodeAsync(stateCode);

    if (!pack || !pack.installed) {
      throw new Error(`State pack not installed: ${stateCode}`);
    }

    await AsyncStorage.setItem(ACTIVE_STATE_KEY, stateCode);

    if (__DEV__) console.log(`Active state switched to: ${stateCode}`);
  } catch (error) {
    if (__DEV__) console.error('Error setting active state:', error);
    throw error;
  }
}

/**
 * Get download progress for a specific state pack.
 * Useful for updating UI during downloads.
 *
 * @param stateCode - The state code
 * @returns Promise resolving to progress 0-100 or undefined if not downloading
 */
export async function getDownloadProgress(stateCode: StateCode): Promise<number | undefined> {
  try {
    const metadata: Record<StateCode, StatePackMetadata> = JSON.parse(
      (await AsyncStorage.getItem(METADATA_KEY)) || '{}'
    );

    return metadata[stateCode]?.downloadProgress;
  } catch (error) {
    if (__DEV__) console.error('Error getting download progress:', error);
    return undefined;
  }
}

/**
 * Get a user-friendly summary of installed packs.
 * @returns Promise resolving to array of pack descriptions
 */
export async function getInstalledPackSummary(): Promise<string[]> {
  try {
    const installed = await getInstalledStatePacks();
    return installed.map((pack) => `${pack.stateName} (${formatPackSize(pack.sizeBytes)})`);
  } catch (error) {
    if (__DEV__) console.error('Error getting pack summary:', error);
    return [];
  }
}

/**
 * Calculate total storage used by all installed packs.
 * @returns Promise resolving to total bytes used
 */
export async function getTotalPackStorageUsed(): Promise<number> {
  try {
    const installed = await getInstalledStatePacks();
    return installed.reduce((total, pack) => total + pack.sizeBytes, 0);
  } catch (error) {
    if (__DEV__) console.error('Error calculating storage:', error);
    return 0;
  }
}
