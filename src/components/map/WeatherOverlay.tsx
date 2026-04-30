/**
 * @file WeatherOverlay.tsx
 * @description Compact weather overlay for Map and Scout screens.
 * Shows current conditions and hunting assessment at a glance.
 * Expandable to show 3-day forecast with hunting conditions.
 *
 * @module Components/Map
 * @version 3.0.0
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import Colors from '../../theme/colors';
import weatherService, { HuntingConditions, WeatherForecast } from '../../services/weatherService';

interface WeatherOverlayProps {
  latitude: number;
  longitude: number;
  visible?: boolean;
}

interface WeatherState {
  loading: boolean;
  forecast: WeatherForecast[];
  huntingConditions: HuntingConditions;
  current: Record<string, any> | null;
  error: boolean;
}

/**
 * Map weather condition text to a fixed-width Unicode symbol.
 * Prevents badge from changing width based on forecast wording.
 */
const getWeatherSymbol = (forecast: string): { symbol: string; color: string } => {
  const f = forecast.toLowerCase();
  if (f.includes('thunder') || f.includes('storm')) return { symbol: '\u26A1', color: '#FBBF24' };
  if (f.includes('snow') || f.includes('sleet') || f.includes('ice') || f.includes('freez')) return { symbol: '\u2744', color: '#93C5FD' };
  if (f.includes('rain') || f.includes('shower') || f.includes('drizzle')) return { symbol: '\u2602', color: '#60A5FA' };
  if (f.includes('fog') || f.includes('mist') || f.includes('haz')) return { symbol: '\u2588', color: '#9CA3AF' };
  if ((f.includes('overcast') || f.includes('cloudy')) && !f.includes('partly') && !f.includes('mostly sunny')) return { symbol: '\u2601', color: '#9CA3AF' };
  if (f.includes('partly') || f.includes('mostly sunny') || f.includes('mostly clear')) return { symbol: '\u26C5', color: '#FCD34D' };
  if (f.includes('clear') || f.includes('sunny') || f.includes('fair')) return { symbol: '\u2600', color: '#FBBF24' };
  if (f.includes('wind')) return { symbol: '\u2634', color: '#93C5FD' };
  return { symbol: '\u25CB', color: '#9CA3AF' };
};

/** Map full rating word to a compact 1-2 char label */
const getRatingShort = (r: string | undefined): string => {
  if (!r) return '';
  if (r === 'Excellent') return 'A+';
  if (r === 'Good') return 'A';
  if (r === 'Fair') return 'B';
  if (r === 'Poor') return 'C';
  if (r === 'Moderate') return 'B';
  return r.charAt(0);
};

/**
 * WeatherOverlay — Compact weather badge + expandable forecast panel.
 *
 * Collapsed: shows temp + weather symbol + compact wind + rating letter
 * Expanded: shows 3-day forecast with wind, hunting assessment, and pressure
 */
export default function WeatherOverlay({ latitude, longitude, visible = true }: WeatherOverlayProps) {
  const [expanded, setExpanded] = useState(false);
  const [weather, setWeather] = useState<WeatherState>({
    loading: true,
    forecast: [],
    huntingConditions: {},
    current: null,
    error: false,
  });

  const fetchWeather = useCallback(async () => {
    if (!latitude || !longitude) return;

    setWeather(prev => ({ ...prev, loading: true, error: false }));
    try {
      const result = await weatherService.getBackendWeather(latitude, longitude);
      setWeather({
        loading: false,
        forecast: result.forecast,
        huntingConditions: result.huntingConditions,
        current: result.current,
        error: false,
      });
    } catch {
      setWeather(prev => ({ ...prev, loading: false, error: true }));
    }
  }, [latitude, longitude]);

  useEffect(() => {
    fetchWeather();
  }, [fetchWeather]);

  if (!visible) return null;

  const today = weather.forecast[0];
  const rating = weather.huntingConditions.overall_rating;

  // Rating color coding
  const ratingColor =
    rating === 'Excellent' ? '#22c55e' :
    rating === 'Good' ? '#84cc16' :
    rating === 'Fair' ? '#f59e0b' :
    rating === 'Poor' ? '#ef4444' : Colors.textMuted;

  if (weather.loading) {
    return (
      <View style={[styles.badge, styles.badgeLoading]}>
        <ActivityIndicator size="small" color={Colors.oak} />
      </View>
    );
  }

  if (weather.error || !today) {
    return null; // Don't show anything if weather unavailable
  }

  return (
    <View style={styles.container}>
      {/* Collapsed badge — fixed-width: temp | symbol | wind | rating */}
      <TouchableOpacity
        style={styles.badge}
        onPress={() => setExpanded(!expanded)}
        activeOpacity={0.8}
      >
        <Text style={styles.tempText}>{today.temperature}°</Text>
        <Text style={[styles.weatherSymbol, { color: getWeatherSymbol(today.shortForecast).color }]}>
          {getWeatherSymbol(today.shortForecast).symbol}
        </Text>
        <Text style={styles.windCompact}>{today.windSpeed} {today.windDirection}</Text>
        {rating && (
          <View style={[styles.ratingBadge, { backgroundColor: ratingColor }]}>
            <Text style={styles.ratingText}>{getRatingShort(rating)}</Text>
          </View>
        )}
      </TouchableOpacity>

      {/* Expanded panel */}
      {expanded && (
        <View style={styles.expandedPanel}>
          {/* Current conditions */}
          {weather.current && (
            <View style={styles.currentRow}>
              <Text style={styles.sectionLabel}>Now</Text>
              <Text style={styles.detailText}>
                {weather.current.temperature_f != null ? `${weather.current.temperature_f}°F` : ''} ·{' '}
                Wind {weather.current.wind_speed_mph ?? '?'} mph {weather.current.wind_direction ?? ''}
                {weather.current.wind_gust_mph ? ` (gusts ${weather.current.wind_gust_mph})` : ''}
              </Text>
              {weather.current.humidity != null && (
                <Text style={styles.detailText}>
                  Humidity: {Math.round(weather.current.humidity)}%
                  {weather.current.barometric_pressure_mb ? ` · Pressure: ${weather.current.barometric_pressure_mb} mb` : ''}
                </Text>
              )}
            </View>
          )}

          {/* Hunting assessment */}
          {weather.huntingConditions.deer_activity && (
            <View style={styles.huntingSection}>
              <Text style={styles.sectionLabel}>Hunting Conditions</Text>
              <Text style={styles.assessmentText}>
                {weather.huntingConditions.deer_activity}
              </Text>
              {weather.huntingConditions.wind_assessment && (
                <Text style={styles.assessmentText}>
                  {weather.huntingConditions.wind_assessment}
                </Text>
              )}
              {weather.huntingConditions.pressure_trend && (
                <Text style={styles.assessmentText}>
                  {weather.huntingConditions.pressure_trend}
                </Text>
              )}
            </View>
          )}

          {/* 3-day forecast */}
          <View style={styles.forecastSection}>
            <Text style={styles.sectionLabel}>Forecast</Text>
            {weather.forecast.slice(0, 6).map((period, i) => (
              <View key={i} style={styles.forecastRow}>
                <Text style={styles.periodName} numberOfLines={1}>{period.name}</Text>
                <Text style={styles.periodTemp}>{period.temperature}°</Text>
                <Text style={styles.periodWind}>{period.windSpeed} {period.windDirection}</Text>
                <Text style={styles.periodCondition} numberOfLines={1}>{period.shortForecast}</Text>
              </View>
            ))}
          </View>

          {/* Refresh button */}
          <TouchableOpacity style={styles.refreshButton} onPress={fetchWeather}>
            <Text style={styles.refreshText}>Refresh</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 50,
    right: 12,
    zIndex: 100,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(13, 26, 13, 0.9)',
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 5,
    gap: 5,
    borderWidth: 1,
    borderColor: Colors.mud,
  },
  badgeLoading: {
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  tempText: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  weatherSymbol: {
    fontSize: 14,
    width: 18,
    textAlign: 'center',
  },
  windCompact: {
    fontSize: 10,
    color: Colors.textSecondary,
    fontWeight: '600',
  },
  ratingBadge: {
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  ratingText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#fff',
  },
  expandedPanel: {
    marginTop: 4,
    backgroundColor: 'rgba(13, 26, 13, 0.95)',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: Colors.mud,
  },
  currentRow: {
    marginBottom: 10,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.oak,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  detailText: {
    fontSize: 12,
    color: Colors.textSecondary,
    lineHeight: 16,
  },
  huntingSection: {
    marginBottom: 10,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.1)',
  },
  assessmentText: {
    fontSize: 12,
    color: Colors.textPrimary,
    lineHeight: 16,
    marginBottom: 4,
  },
  forecastSection: {
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.1)',
  },
  forecastRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 3,
    gap: 4,
  },
  periodName: {
    fontSize: 11,
    color: Colors.textSecondary,
    width: 65,
  },
  periodTemp: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.textPrimary,
    width: 30,
  },
  periodWind: {
    fontSize: 10,
    color: Colors.textMuted,
    width: 65,
  },
  periodCondition: {
    fontSize: 10,
    color: Colors.textSecondary,
    flex: 1,
  },
  refreshButton: {
    marginTop: 8,
    alignSelf: 'center',
  },
  refreshText: {
    fontSize: 11,
    color: Colors.oak,
    fontWeight: '600',
  },
});
