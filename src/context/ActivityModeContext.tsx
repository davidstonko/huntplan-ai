import React, { createContext, useContext, useState, ReactNode } from 'react';

export type ActivityMode = 'hunt' | 'fish' | 'hike' | 'crab' | 'boat';

interface ActivityModeContextType {
  activeMode: ActivityMode;
  setActiveMode: (mode: ActivityMode) => void;
}

const ActivityModeContext = createContext<ActivityModeContextType | undefined>(undefined);

export function ActivityModeProvider({ children }: { children: ReactNode }) {
  const [activeMode, setActiveMode] = useState<ActivityMode>('hunt');

  return (
    <ActivityModeContext.Provider value={{ activeMode, setActiveMode }}>
      {children}
    </ActivityModeContext.Provider>
  );
}

/**
 * Hook to access the current activity mode and setter.
 * Must be used within an ActivityModeProvider.
 */
export function useActivityMode() {
  const context = useContext(ActivityModeContext);
  if (!context) {
    throw new Error('useActivityMode must be used within an ActivityModeProvider');
  }
  return context;
}
