/**
 * SettingsContext — Persistent user preferences for MDHuntFishOutdoors.
 *
 * Stores user-facing settings in AsyncStorage and exposes a typed API for
 * reading and updating them. Currently tracks:
 *   - Weather & Safety overlay defaults (lightning, alerts, marine, hunter metrics)
 *   - Units (imperial vs metric)
 *   - Map style preference (dark topo, hybrid, etc.)
 *
 * Added for V2.2.0 (2026-04-17) to support the unified WeatherScreen and
 * pre-configured safety overlays per Apple App Store resubmission plan.
 */

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  ReactNode,
} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = '@mdhuntfish:settings_v1';

/**
 * WeatherSafetyPrefs — Per-mode defaults for the safety overlays rendered on WeatherScreen.
 *
 * Defaults chosen 2026-04-17 based on user request:
 *   - Lightning on by default (all modes)
 *   - NWS alerts off by default (user can enable)
 *   - Marine off by default (auto-on when activity mode is fish)
 *   - Hunter metrics on by default for hunt mode
 */
export interface WeatherSafetyPrefs {
  lightning: boolean;
  alerts: boolean;
  marine: boolean;
  hunterMetrics: boolean;
}

export type UnitsPref = 'imperial' | 'metric';

/**
 * Multi-state support — Phase 5C scaffolding.
 * TODO: Expand to 'VA' | 'PA' when multi-state becomes active.
 */
export type CurrentState = 'MD';

export interface AppSettings {
  weatherSafety: WeatherSafetyPrefs;
  units: UnitsPref;
  /** Whether user has ever acknowledged the DNR regulations disclaimer */
  regulationsAcknowledged: boolean;
  /** Last-known mapbox style id — persists across sessions */
  mapStyleId: string;
  /** Currently selected state (Phase 5C: MD only, multi-state support deferred) */
  currentState: CurrentState;
  /** Whether to send analytics events to backend (opt-out) */
  analyticsEnabled: boolean;
}

const DEFAULT_SETTINGS: AppSettings = {
  weatherSafety: {
    lightning: true,
    alerts: false,
    marine: false,
    hunterMetrics: true,
  },
  units: 'imperial',
  regulationsAcknowledged: false,
  mapStyleId: 'mapbox://styles/mapbox/outdoors-v12',
  currentState: 'MD',
  analyticsEnabled: true,
};

interface SettingsContextType {
  settings: AppSettings;
  isLoaded: boolean;
  updateWeatherSafety: (patch: Partial<WeatherSafetyPrefs>) => Promise<void>;
  setUnits: (units: UnitsPref) => Promise<void>;
  acknowledgeRegulations: () => Promise<void>;
  setMapStyleId: (id: string) => Promise<void>;
  setCurrentState: (state: CurrentState) => Promise<void>;
  setAnalyticsEnabled: (enabled: boolean) => Promise<void>;
  resetSettings: () => Promise<void>;
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [isLoaded, setIsLoaded] = useState(false);

  // Hydrate from AsyncStorage on mount
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        if (!cancelled && raw) {
          const parsed = JSON.parse(raw) as Partial<AppSettings>;
          // Merge with defaults so new keys added in future versions are safe
          setSettings({
            ...DEFAULT_SETTINGS,
            ...parsed,
            weatherSafety: {
              ...DEFAULT_SETTINGS.weatherSafety,
              ...(parsed.weatherSafety || {}),
            },
          });
        }
      } catch (err) {
        // Swallow — fall back to defaults
        // eslint-disable-next-line no-console
        console.warn('[SettingsContext] Failed to load settings:', err);
      } finally {
        if (!cancelled) setIsLoaded(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const persist = useCallback(async (next: AppSettings) => {
    setSettings(next);
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch (err) {
      // eslint-disable-next-line no-console
      console.warn('[SettingsContext] Failed to persist settings:', err);
    }
  }, []);

  const updateWeatherSafety = useCallback(
    async (patch: Partial<WeatherSafetyPrefs>) => {
      await persist({
        ...settings,
        weatherSafety: { ...settings.weatherSafety, ...patch },
      });
    },
    [settings, persist],
  );

  const setUnits = useCallback(
    async (units: UnitsPref) => {
      await persist({ ...settings, units });
    },
    [settings, persist],
  );

  const acknowledgeRegulations = useCallback(async () => {
    await persist({ ...settings, regulationsAcknowledged: true });
  }, [settings, persist]);

  const setMapStyleId = useCallback(
    async (mapStyleId: string) => {
      await persist({ ...settings, mapStyleId });
    },
    [settings, persist],
  );

  const setCurrentState = useCallback(
    async (currentState: CurrentState) => {
      await persist({ ...settings, currentState });
    },
    [settings, persist],
  );

  const setAnalyticsEnabled = useCallback(
    async (analyticsEnabled: boolean) => {
      await persist({ ...settings, analyticsEnabled });
    },
    [settings, persist],
  );

  const resetSettings = useCallback(async () => {
    await persist(DEFAULT_SETTINGS);
  }, [persist]);

  return (
    <SettingsContext.Provider
      value={{
        settings,
        isLoaded,
        updateWeatherSafety,
        setUnits,
        acknowledgeRegulations,
        setMapStyleId,
        setCurrentState,
        setAnalyticsEnabled,
        resetSettings,
      }}
    >
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  const ctx = useContext(SettingsContext);
  if (!ctx) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return ctx;
}

/**
 * Convenience hook that returns the effective safety prefs for the
 * currently active activity mode — applies the "marine auto-on when fishing"
 * rule on top of the stored defaults.
 */
export function useEffectiveWeatherSafety(
  activityMode: 'hunt' | 'fish' | 'camp' | 'hike',
): WeatherSafetyPrefs {
  const { settings } = useSettings();
  const base = settings.weatherSafety;
  return {
    lightning: base.lightning,
    alerts: base.alerts,
    // Marine auto-activates for fish mode unless user explicitly disables it later.
    // Camp and hike don't auto-enable marine — they default to whatever the user set.
    marine: base.marine || activityMode === 'fish',
    hunterMetrics: base.hunterMetrics && activityMode === 'hunt',
  };
}
