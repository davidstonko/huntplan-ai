/**
 * HuntWindPanel — NOAA-powered wind chip + time slider for Hunt map.
 *
 * V2_3_FEATURE_EXPANSION_PLAN §B.2.d wires the UI half of the scent-cone
 * feature:
 *
 *   - A chip in the top-right legend stack that reads
 *     "Wind: NNW 8 mph" (or "Calm") once the NWS forecast loads.
 *   - A pill-shaped control strip below the chip showing the forecast
 *     hour ("now", "+3 h", "+6 h", …, "+48 h") and ± buttons to step.
 *   - A toggle ("Scent cones") that flips cone rendering on/off.
 *
 * The panel fetches the wind forecast itself (using `windService`) for
 * the map-center coordinate. The parent (Hunt MapScreen) subscribes via
 * `onChange({ wind, showCones })` and wires the resulting reading into
 * `<ScentConeLayer>`. Keeping the fetch/state inside the panel means
 * MapScreen doesn't grow yet another NOAA-specific state slice.
 *
 * Failure mode: when the NOAA fetch errors, the chip reads "Wind
 * unavailable" and cones stay off. No retry loop — the next map pan
 * will re-trigger the effect.
 *
 * @module Components/Map
 */

import React, { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  getWindAt,
  type WindReading,
} from '../../services/windService';
import { bearingToCardinal, CALM_THRESHOLD_MPH } from '../../services/scentConeGeometry';

// Persist the collapsed state so reopening the Hunt map doesn't pop the
// widget back over the middle of the screen the user just dismissed.
const COLLAPSED_KEY = '@hunt_wind_panel_collapsed_v1';

interface MapCenter {
  lat: number;
  lng: number;
}

export interface HuntWindPanelState {
  wind: WindReading | null;
  showCones: boolean;
  forecastIso: string;
  hoursAhead: number;
}

interface Props {
  mapCenter: MapCenter | null;
  onChange: (state: HuntWindPanelState) => void;
  /** Optional override for tests or non-"now" start. Defaults to Date.now. */
  nowProvider?: () => Date;
}

const HOUR_STEPS = [0, 3, 6, 9, 12, 15, 18, 24, 30, 36, 42, 48];

function formatHoursAhead(n: number): string {
  if (n === 0) return 'Now';
  return `+${n}h`;
}

export default function HuntWindPanel({
  mapCenter,
  onChange,
  nowProvider,
}: Props) {
  const [hoursAhead, setHoursAhead] = useState(0);
  const [showCones, setShowCones] = useState(false);
  const [wind, setWind] = useState<WindReading | null>(null);
  const [loading, setLoading] = useState(false);
  const [errorText, setErrorText] = useState<string | null>(null);
  // 2026-04-26 (fork merge): widget is now collapsible. Default to
  // COLLAPSED on first open so the wind controls don't cover the middle
  // of the Hunt map. Tap "Wind ▼" pill to expand.
  const [collapsed, setCollapsed] = useState(true);
  useEffect(() => {
    let alive = true;
    AsyncStorage.getItem(COLLAPSED_KEY).then((v) => {
      if (alive && v !== null) setCollapsed(v === '1');
    });
    return () => { alive = false; };
  }, []);
  const toggleCollapsed = useCallback(() => {
    setCollapsed((c) => {
      const next = !c;
      AsyncStorage.setItem(COLLAPSED_KEY, next ? '1' : '0').catch(() => {});
      return next;
    });
  }, []);

  const forecastIso = useMemo(() => {
    const base = (nowProvider?.() ?? new Date()).getTime();
    // Round base to hour start so repeated +3h taps don't drift.
    const hourMs = 60 * 60 * 1000;
    const hourAligned = Math.floor(base / hourMs) * hourMs;
    return new Date(hourAligned + hoursAhead * hourMs).toISOString();
  }, [hoursAhead, nowProvider]);

  const fetchCountRef = useRef(0);

  // Fetch wind whenever the map-center rounded-grid or forecast hour changes.
  useEffect(() => {
    if (!mapCenter) return;
    const myFetch = ++fetchCountRef.current;
    setLoading(true);
    setErrorText(null);
    getWindAt(mapCenter.lat, mapCenter.lng, forecastIso)
      .then((r) => {
        if (myFetch !== fetchCountRef.current) return; // stale
        setWind(r);
        setLoading(false);
      })
      .catch((err) => {
        if (myFetch !== fetchCountRef.current) return;
        setWind(null);
        setLoading(false);
        setErrorText(err?.message ?? 'Wind unavailable');
      });
  }, [mapCenter?.lat, mapCenter?.lng, forecastIso]);

  // Propagate every state change upward so MapScreen can drive ScentConeLayer.
  useEffect(() => {
    onChange({ wind, showCones, forecastIso, hoursAhead });
  }, [wind, showCones, forecastIso, hoursAhead, onChange]);

  const stepHoursAhead = useCallback((direction: 1 | -1) => {
    setHoursAhead((prev) => {
      const idx = HOUR_STEPS.indexOf(prev);
      const nextIdx = Math.min(
        HOUR_STEPS.length - 1,
        Math.max(0, (idx >= 0 ? idx : 0) + direction),
      );
      return HOUR_STEPS[nextIdx];
    });
  }, []);

  const chipText = useMemo(() => {
    if (loading && !wind) return 'Wind: loading…';
    if (errorText) return 'Wind: unavailable';
    if (!wind) return 'Wind: —';
    if (wind.speedMph < CALM_THRESHOLD_MPH) return 'Wind: calm';
    const cardinal = bearingToCardinal(wind.directionDeg);
    return `Wind: ${cardinal} ${Math.round(wind.speedMph)} mph`;
  }, [loading, wind, errorText]);

  if (collapsed) {
    // Single tappable pill — shows just the wind reading + a chevron.
    // Tapping anywhere on the pill expands the full panel.
    return (
      <TouchableOpacity
        onPress={toggleCollapsed}
        style={styles.collapsedPill}
        accessibilityRole="button"
        accessibilityLabel="Expand wind panel"
      >
        <Text style={styles.chipText}>{chipText}</Text>
        <Text style={styles.collapseChevron}>▼</Text>
      </TouchableOpacity>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.chipRow}>
        <View style={styles.chip}>
          <Text style={styles.chipText}>{chipText}</Text>
          {loading ? (
            <ActivityIndicator
              size="small"
              color="#f59e0b"
              style={{ marginLeft: 6 }}
            />
          ) : null}
        </View>
        {/* Collapse handle — top-right of the panel */}
        <TouchableOpacity
          onPress={toggleCollapsed}
          style={styles.collapseBtn}
          accessibilityRole="button"
          accessibilityLabel="Collapse wind panel"
          hitSlop={{ top: 8, right: 8, bottom: 8, left: 8 }}
        >
          <Text style={styles.collapseChevron}>▲</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.sliderRow}>
        <TouchableOpacity
          onPress={() => stepHoursAhead(-1)}
          style={styles.stepBtn}
          accessibilityLabel="Earlier forecast hour"
        >
          <Text style={styles.stepText}>−</Text>
        </TouchableOpacity>
        <Text style={styles.hoursLabel}>{formatHoursAhead(hoursAhead)}</Text>
        <TouchableOpacity
          onPress={() => stepHoursAhead(+1)}
          style={styles.stepBtn}
          accessibilityLabel="Later forecast hour"
        >
          <Text style={styles.stepText}>+</Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity
        onPress={() => setShowCones((v) => !v)}
        style={[
          styles.toggle,
          showCones ? styles.toggleOn : styles.toggleOff,
        ]}
        accessibilityLabel="Toggle scent cones"
      >
        <Text style={styles.toggleText}>
          {showCones ? 'Scent cones ON' : 'Scent cones OFF'}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'rgba(17,24,39,0.85)', // slate-900 / 85%
    borderRadius: 8,
    padding: 8,
    gap: 6,
    minWidth: 148,
  },
  // Collapsed-state pill — small tappable chip showing just the wind reading.
  // Replaces the full panel until the user taps to expand.
  collapsedPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(17,24,39,0.85)',
    borderRadius: 16,
    paddingHorizontal: 10,
    paddingVertical: 6,
    gap: 6,
    alignSelf: 'flex-end',
  },
  collapseBtn: {
    paddingLeft: 6,
    paddingVertical: 2,
  },
  collapseChevron: {
    color: '#f59e0b',
    fontSize: 11,
    fontWeight: '800',
  },
  chipRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  chipText: {
    color: '#e5e7eb',
    fontSize: 12,
    fontWeight: '600',
  },
  sliderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  stepBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#1f2937',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepText: {
    color: '#f59e0b',
    fontSize: 18,
    fontWeight: '800',
    lineHeight: 20,
  },
  hoursLabel: {
    color: '#e5e7eb',
    fontSize: 13,
    fontWeight: '700',
  },
  toggle: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 6,
    alignItems: 'center',
  },
  toggleOn: {
    backgroundColor: '#f59e0b',
  },
  toggleOff: {
    backgroundColor: '#374151',
  },
  toggleText: {
    color: '#111827',
    fontSize: 11,
    fontWeight: '800',
  },
});
