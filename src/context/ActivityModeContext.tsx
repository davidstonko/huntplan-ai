/**
 * ActivityModeContext — Global state for the currently active outdoor activity mode.
 *
 * Manages user selection of which outdoor activity the app is currently focused on
 * (hunt / fish / camp / hike). Drives which regulations, screens, map layers, and
 * resources are displayed across the app.
 *
 * Persistence: AsyncStorage-backed, key '@activity_mode'. Last selection is rehydrated
 * on app boot — a user who picked "Fish" yesterday lands in Fish today, not "Hunt".
 *
 * 2026-05-02 (V2.4 audit, iter 14): added the persistence layer that CLAUDE.md
 * already promised but the code was missing. The previous in-memory-only behavior
 * meant every cold start dropped users back into Hunt regardless of their last
 * choice — surprising UX for non-hunt users. The migration is forward-only:
 *   - Old installs (no key) → boot into 'hunt' (existing default)
 *   - New installs / mode changes → persist to AsyncStorage on every setActiveMode
 *   - Boot reads the stored value, validates it's one of the 4 active modes, falls
 *     back to 'hunt' on any decode/validation error
 *
 * The hydration is async; consumers can rely on activeMode being correct after
 * the first render but before then it shows 'hunt'. A flicker is possible but
 * inconsequential since ModePicker is the boot landing screen and most users
 * tap-pick a mode there anyway.
 *
 * V2.2.0 (2026-04-17 afternoon): Scope revised back to full 4-mode support
 * (hunt, fish, camp, hike) per V2_2_0_BUILD_PLAN.md. Crab and Boat remain
 * deferred to Future Projects.
 *
 * Usage:
 * 1. Wrap app root with <ActivityModeProvider>
 * 2. Call useActivityMode() in any component to access activeMode and setActiveMode
 */

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = '@activity_mode';

/**
 * ActivityMode — Union type for the four outdoor activities shipped in V2.2.0.
 * @type {'hunt' | 'fish' | 'camp' | 'hike'}
 *
 * Legacy 'crab' and 'boat' content is folded into the fish UX (see CLAUDE.md);
 * helper code that still references those literals uses local type assertions.
 */
export type ActivityMode = 'hunt' | 'fish' | 'camp' | 'hike';

const VALID_MODES: ReadonlyArray<ActivityMode> = ['hunt', 'fish', 'camp', 'hike'];

function isValidMode(value: unknown): value is ActivityMode {
  return typeof value === 'string' && VALID_MODES.includes(value as ActivityMode);
}

/**
 * ActivityModeContextType — Contract for the ActivityMode context.
 * @interface
 */
interface ActivityModeContextType {
  /** The currently active activity mode */
  activeMode: ActivityMode;
  /** Function to update the active mode (persists to AsyncStorage). */
  setActiveMode: (mode: ActivityMode) => void;
}

const ActivityModeContext = createContext<ActivityModeContextType | undefined>(undefined);

/**
 * ActivityModeProvider — React context provider for activity mode state.
 *
 * Wraps the app root to make activity mode accessible throughout the component tree.
 * Hydrates from AsyncStorage on mount; persists on every setActiveMode call.
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
  // Default mode is 'hunt' — the MVP activity. Hydration replaces this if a
  // valid stored value exists.
  const [activeMode, setActiveModeState] = useState<ActivityMode>('hunt');

  // Hydrate stored mode on mount. Fail-quiet on any error — fallback to 'hunt'.
  useEffect(() => {
    (async () => {
      try {
        const stored = await AsyncStorage.getItem(STORAGE_KEY);
        if (stored && isValidMode(stored)) {
          setActiveModeState(stored);
        }
      } catch {
        // Storage unavailable / decode error — keep default 'hunt'.
      }
    })();
  }, []);

  // Wrap setter to also persist. Fire-and-forget the write — we don't gate the
  // UI update on disk I/O.
  const setActiveMode = (mode: ActivityMode) => {
    setActiveModeState(mode);
    AsyncStorage.setItem(STORAGE_KEY, mode).catch(() => {
      // Best-effort persistence; UI continues regardless.
    });
  };

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
