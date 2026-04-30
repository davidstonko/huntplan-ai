/**
 * CatchLogContext.tsx — React Context for fishing catch log state management
 *
 * Provides centralized state for catch log entries with AsyncStorage persistence.
 * Pattern mirrors ScoutDataContext for consistency. V2 uses AsyncStorage; backend sync
 * in Phase 3+.
 *
 * Features:
 * - CRUD operations (add, update, delete)
 * - Lookup utilities (getCatch, getCatchesBySpecies, getCatchesByLocation)
 * - Analytics helpers (getTopBaits, getRecentCatches, getPersonalBestBySpecies)
 * - Persistent state (AsyncStorage key: @catch_log_entries)
 * - Auto-load on mount, auto-persist on writes
 *
 * Usage:
 * ```typescript
 * const { catches, addCatch, totalCatches } = useCatchLog();
 * ```
 */

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { CatchLogEntry } from '../types/catchlog';

/**
 * Context type definition for catch log state and operations
 */
export interface CatchLogContextType {
  /** Array of all catch log entries */
  catches: CatchLogEntry[];

  /** Add a new catch log entry */
  addCatch: (entry: CatchLogEntry) => Promise<void>;

  /** Update an existing catch log entry */
  updateCatch: (entry: CatchLogEntry) => Promise<void>;

  /** Delete a catch log entry by ID */
  deleteCatch: (catchId: string) => Promise<void>;

  /** Get a single catch by ID, or undefined if not found */
  getCatch: (catchId: string) => CatchLogEntry | undefined;

  // Analytics helpers

  /** Get all catches for a specific species */
  getCatchesBySpecies: (species: string) => CatchLogEntry[];

  /** Get all catches at a specific location */
  getCatchesByLocation: (locationName: string) => CatchLogEntry[];

  /** Get top baits/flies by usage count, optionally filtered by species */
  getTopBaits: (species?: string) => { bait: string; count: number }[];

  /** Get most recent catches, limited by count */
  getRecentCatches: (limit?: number) => CatchLogEntry[];

  /** Get personal best (largest) catch for a species */
  getPersonalBestBySpecies: (species: string) => CatchLogEntry | undefined;

  // Stats

  /** Total number of catches logged */
  totalCatches: number;

  /** Array of unique species caught */
  speciesCaught: string[];

  /** Loading state for async operations */
  isLoading: boolean;
}

const CatchLogContext = createContext<CatchLogContextType | undefined>(undefined);

const CATCH_LOG_STORAGE_KEY = '@catch_log_entries';

/**
 * Generate a unique ID for a new catch log entry (UUID-like)
 * Format: catch_TIMESTAMP_RANDOM
 */
function generateId(): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 9);
  return `catch_${timestamp}_${random}`;
}

/**
 * CatchLogProvider — Wraps the app with catch log context
 * Loads catches from AsyncStorage on mount and persists on every write
 */
export const CatchLogProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [catches, setCatches] = useState<CatchLogEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Load catches from AsyncStorage on mount
  useEffect(() => {
    const loadCatches = async () => {
      try {
        const stored = await AsyncStorage.getItem(CATCH_LOG_STORAGE_KEY);
        if (stored) {
          setCatches(JSON.parse(stored));
        }
      } catch (error) {
        console.warn('Failed to load catch log from AsyncStorage:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadCatches();
  }, []);

  /**
   * Persist catches to AsyncStorage
   */
  const persistCatches = async (updatedCatches: CatchLogEntry[]) => {
    try {
      await AsyncStorage.setItem(
        CATCH_LOG_STORAGE_KEY,
        JSON.stringify(updatedCatches)
      );
    } catch (error) {
      console.warn('Failed to persist catch log to AsyncStorage:', error);
    }
  };

  /**
   * Add a new catch entry
   */
  const addCatch = async (entry: CatchLogEntry) => {
    const newCatches = [...catches, entry];
    setCatches(newCatches);
    await persistCatches(newCatches);
  };

  /**
   * Update an existing catch entry by ID
   */
  const updateCatch = async (entry: CatchLogEntry) => {
    const updatedCatches = catches.map(c => (c.id === entry.id ? entry : c));
    setCatches(updatedCatches);
    await persistCatches(updatedCatches);
  };

  /**
   * Delete a catch entry by ID
   */
  const deleteCatch = async (catchId: string) => {
    const filteredCatches = catches.filter(c => c.id !== catchId);
    setCatches(filteredCatches);
    await persistCatches(filteredCatches);
  };

  /**
   * Get a single catch by ID
   */
  const getCatch = (catchId: string): CatchLogEntry | undefined => {
    return catches.find(c => c.id === catchId);
  };

  /**
   * Get all catches for a specific species (case-insensitive)
   */
  const getCatchesBySpecies = (species: string): CatchLogEntry[] => {
    const lowerSpecies = species.toLowerCase();
    return catches.filter(c => c.species.toLowerCase() === lowerSpecies);
  };

  /**
   * Get all catches at a specific location (case-insensitive)
   */
  const getCatchesByLocation = (locationName: string): CatchLogEntry[] => {
    const lowerLocation = locationName.toLowerCase();
    return catches.filter(c => c.locationName.toLowerCase() === lowerLocation);
  };

  /**
   * Get top baits/flies by usage count, optionally filtered by species
   */
  const getTopBaits = (species?: string): { bait: string; count: number }[] => {
    const filtered = species
      ? getCatchesBySpecies(species)
      : catches;

    const baitCounts: { [key: string]: number } = {};
    filtered.forEach(c => {
      baitCounts[c.baitOrFly] = (baitCounts[c.baitOrFly] || 0) + 1;
    });

    return Object.entries(baitCounts)
      .map(([bait, count]) => ({ bait, count }))
      .sort((a, b) => b.count - a.count);
  };

  /**
   * Get most recent catches, limited by count
   */
  const getRecentCatches = (limit = 10): CatchLogEntry[] => {
    return catches
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, limit);
  };

  /**
   * Get personal best (largest by weight, then length) for a species
   */
  const getPersonalBestBySpecies = (species: string): CatchLogEntry | undefined => {
    const speciesCatches = getCatchesBySpecies(species);
    if (speciesCatches.length === 0) return undefined;

    return speciesCatches.reduce((best, current) => {
      const bestWeight = best.weight || 0;
      const currentWeight = current.weight || 0;
      const bestLength = best.length || 0;
      const currentLength = current.length || 0;

      if (currentWeight > bestWeight) return current;
      if (currentWeight === bestWeight && currentLength > bestLength) return current;
      return best;
    });
  };

  /**
   * Get total number of catches
   */
  const totalCatches = catches.length;

  /**
   * Get array of unique species caught
   */
  const speciesCaught = Array.from(new Set(catches.map(c => c.species))).sort();

  const value: CatchLogContextType = {
    catches,
    addCatch,
    updateCatch,
    deleteCatch,
    getCatch,
    getCatchesBySpecies,
    getCatchesByLocation,
    getTopBaits,
    getRecentCatches,
    getPersonalBestBySpecies,
    totalCatches,
    speciesCaught,
    isLoading,
  };

  return (
    <CatchLogContext.Provider value={value}>
      {children}
    </CatchLogContext.Provider>
  );
};

/**
 * Hook to access catch log context
 * Usage: const { catches, addCatch } = useCatchLog();
 */
export const useCatchLog = (): CatchLogContextType => {
  const context = useContext(CatchLogContext);
  if (!context) {
    throw new Error('useCatchLog must be used within a CatchLogProvider');
  }
  return context;
};

/**
 * Export the ID generator for use in forms
 */
export { generateId };
