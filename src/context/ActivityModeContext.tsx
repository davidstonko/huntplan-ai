/**
 * ActivityModeContext — Global state for the currently active outdoor activity mode.
 *
 * Manages user selection of which outdoor activity the app is currently focused on (hunt or fish).
 * This drives which regulations, screens, map layers, and resources are displayed.
 *
 * Persistence: In-memory only (no AsyncStorage). Default mode is 'hunt'. Selection is lost on app restart.
 *
 * Usage:
 * 1. Wrap app root with <ActivityModeProvider>
 * 2. Call useActivityMode() in any component to access activeMode and setActiveMode
 *
 * V2.2.0 (2026-04-17 afternoon): Scope revised back to full 4-mode support
 * (hunt, fish, camp, hike) per V2_2_0_BUILD_PLAN.md. Crab and Boat remain
 * deferred to Future Projects.
 *
 * Future: Consider adding AsyncStorage persistence if users want their last mode remembered.
 */

import React, { createContext, useContext, useState, ReactNode } from 'react';

/**
 * ActivityMode — Union type for the four outdoor activities shipped in V2.2.0.
 * @type {'hunt' | 'fish' | 'camp' | 'hike'}
 *
 * Legacy 'crab' and 'boat' content is folded into the fish UX (see CLAUDE.md);
 * helper code that still references those literals uses local type assertions.
 */
export type ActivityMode = 'hunt' | 'fish' | 'camp' | 'hike';

/**
 * ActivityModeContextType — Contract for the ActivityMode context.
 * @interface
 */
interface ActivityModeContextType {
  /** The currently active activity mode */
  activeMode: ActivityMode;
  /** Function to update the active mode */
  setActiveMode: (mode: ActivityMode) => void;
}

const ActivityModeContext = createContext<ActivityModeContextType | undefined>(undefined);

/**
 * ActivityModeProvider — React context provider for activity mode state.
 *
 * Wraps the app root to make activity mode accessible throughout the component tree.
 *
 * @param {ReactNode} children - Child components
 * @returns {JSX.Element}
 *
 * @example
 * <ActivityModeProvider>
 *   <App />
 * </ActivityModeProvider>
 */
export function ActivityModeProvider({ children }: { children: ReactNode }) {
  // Default mode is 'hunt' — the MVP activity. Others are phases 4-5.
  const [activeMode, setActiveMode] = useState<ActivityMode>('hunt');

  return (
    <ActivityModeContext.Provider value={{ activeMode, setActiveMode }}>
      {children}
    </ActivityModeContext.Provider>
  );
}

/**
 * useActivityMode — Custom hook to access activity mode state and setter.
 *
 * Returns the current active activity mode and a function to change it.
 * Throws if called outside an ActivityModeProvider.
 *
 * @returns {ActivityModeContextType} { activeMode, setActiveMode }
 * @throws {Error} If used outside ActivityModeProvider
 *
 * @example
 * const { activeMode, setActiveMode } = useActivityMode();
 * if (activeMode === 'hunt') { // render hunt-specific UI }
 */
export function useActivityMode() {
  const context = useContext(ActivityModeContext);
  if (!context) {
    throw new Error('useActivityMode must be used within an ActivityModeProvider');
  }
  return context;
}
