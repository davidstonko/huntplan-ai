import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type ActivityMode = 'hunt' | 'fish' | 'hike' | 'crab' | 'boat';

interface ActivityModeContextType {
  activeMode: ActivityMode;
  setActiveMode: (mode: ActivityMode) => void;
  isLoading: boolean;
}

const ActivityModeContext = createContext<ActivityModeContextType | undefined>(undefined);

/**
 * ActivityModeProvider — Manages current activity mode with AsyncStorage persistence.
 *
 * Persists the selected activity mode across app sessions using AsyncStorage key @activity_mode.
 * Provides a loading state to prevent UI flash during initialization.
 *
 * @param children — React components to wrap
 * @returns {JSX.Element} Provider component
 */
export function ActivityModeProvider({ children }: { children: ReactNode }) {
  const [activeMode, setActiveMode] = useState<ActivityMode>('hunt');
  const [isLoading, setIsLoading] = useState(true);

  // Load persisted mode on mount
  useEffect(() => {
    const loadMode = async () => {
      try {
        const saved = await AsyncStorage.getItem('@activity_mode');
        if (saved && isValidMode(saved)) {
          setActiveMode(saved as ActivityMode);
        }
      } catch (err) {
        if (__DEV__) console.warn('[ActivityModeContext] Failed to load persisted mode:', err);
      } finally {
        setIsLoading(false);
      }
    };

    loadMode();
  }, []);

  // Persist mode whenever it changes
  const handleSetMode = async (mode: ActivityMode) => {
    setActiveMode(mode);
    try {
      await AsyncStorage.setItem('@activity_mode', mode);
    } catch (err) {
      if (__DEV__) console.warn('[ActivityModeContext] Failed to persist mode:', err);
    }
  };

  return (
    <ActivityModeContext.Provider value={{ activeMode, setActiveMode: handleSetMode, isLoading }}>
      {children}
    </ActivityModeContext.Provider>
  );
}

/**
 * Type guard to validate activity mode string.
 */
function isValidMode(value: unknown): value is ActivityMode {
  return typeof value === 'string' && ['hunt', 'fish', 'hike', 'crab', 'boat'].includes(value);
}

/**
 * Hook to access the current activity mode, setter, and loading state.
 * Must be used within an ActivityModeProvider.
 *
 * The isLoading flag can be used to avoid UI flashing during AsyncStorage initialization.
 * Once isLoading becomes false, activeMode has been hydrated from persistent storage.
 *
 * @returns {ActivityModeContextType} { activeMode, setActiveMode, isLoading }
 */
export function useActivityMode() {
  const context = useContext(ActivityModeContext);
  if (!context) {
    throw new Error('useActivityMode must be used within an ActivityModeProvider');
  }
  return context;
}
