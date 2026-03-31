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
 * WeatherOverlay — Compact weather badge + expandable forecast panel.
 *
 * Collapsed: shows temp + short forecast + hunting rating
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
      {/* Collapsed badge */}
      <TouchableOpacity
        style={styles.badge}
        onPress={() => setExpanded(!expanded)}
        activeOpacity={0.8}
      >
        <Text style={styles.tempText}>{today.temperature}°{today.temperatureUnit}</Text>
        <Text style={styles.conditionText} numberOfLines={1}>{today.shortForecast}</Text>
        {rating && (
          <View style={[styles.ratingBadge, { backgroundColor: ratingColor }]}>
            <Text style={styles.ratingText}>{rating}</Text>
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
    top: 8,
    right: 8,
    zIndex: 100,
    maxWidth: 280,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(13, 26, 13, 0.9)',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 6,
    gap: 6,
    borderWidth: 1,
    borderColor: Colors.mud,
  },
  badgeLoading: {
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  tempText: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  conditionText: {
    fontSize: 12,
    color: Colors.textSecondary,
    flexShrink: 1,
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
