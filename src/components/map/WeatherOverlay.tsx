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
import weatherService, {
  HuntingConditions,
  WeatherForecast,
  PressureTrend,
  ScentCondition,
} from '../../services/weatherService';
import WindDirectionIndicator from './WindDirectionIndicator';

interface WeatherOverlayProps {
  latitude: number;
  longitude: number;
  visible?: boolean;
  onWindDataChange?: (windData: { direction: string; speed: string }) => void;
}

interface WeatherState {
  loading: boolean;
  forecast: WeatherForecast[];
  huntingConditions: HuntingConditions;
  current: Record<string, any> | null;
  error: boolean;
  pressureValue: number | null;
  pressureTrend: PressureTrend;
  dewPoint: number | null;
  scentRisk: number;
  scentCondition: ScentCondition;
  scentTip: string;
}

/**
 * WeatherOverlay — Compact weather badge + expandable forecast panel.
 *
 * Collapsed: shows temp + short forecast + hunting rating
 * Expanded: shows 3-day forecast with wind, hunting assessment, and pressure
 */
export default function WeatherOverlay({
  latitude,
  longitude,
  visible = true,
  onWindDataChange,
}: WeatherOverlayProps) {
  const [expanded, setExpanded] = useState(false);
  const [weather, setWeather] = useState<WeatherState>({
    loading: true,
    forecast: [],
    huntingConditions: {},
    current: null,
    error: false,
    pressureValue: null,
    pressureTrend: 'unknown',
    dewPoint: null,
    scentRisk: 5,
    scentCondition: 'moderate',
    scentTip: 'Moderate scent conditions.',
  });

  const fetchWeather = useCallback(async () => {
    if (!latitude || !longitude) return;

    setWeather(prev => ({ ...prev, loading: true, error: false }));
    try {
      // Fetch both backend weather and hunting weather (for pressure data and scent conditions)
      const backendResult = await weatherService.getBackendWeather(latitude, longitude);
      const huntingResult = await weatherService.getHuntingWeather(latitude, longitude);

      // Notify parent of wind data for wind direction indicator
      if (backendResult.forecast.length > 0) {
        const today = backendResult.forecast[0];
        onWindDataChange?.({
          direction: today.windDirection,
          speed: today.windSpeed,
        });
      }

      setWeather({
        loading: false,
        forecast: backendResult.forecast,
        huntingConditions: backendResult.huntingConditions,
        current: backendResult.current,
        error: false,
        pressureValue: huntingResult.pressureValue,
        pressureTrend: huntingResult.pressureTrend,
        dewPoint: huntingResult.dewPoint,
        scentRisk: huntingResult.scentRisk,
        scentCondition: huntingResult.scentCondition,
        scentTip: huntingResult.scentTip,
      });
    } catch {
      setWeather(prev => ({ ...prev, loading: false, error: true }));
    }
  }, [latitude, longitude, onWindDataChange]);

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
              {/* Barometric pressure trend */}
              {weather.pressureValue !== null && (
                <Text style={[
                  styles.pressureTrendText,
                  {
                    color: weather.pressureTrend === 'rising' ? Colors.success :
                           weather.pressureTrend === 'falling' ? Colors.danger : Colors.textSecondary,
                  },
                ]}>
                  Pressure: {weather.pressureValue.toFixed(1)} mb {
                    weather.pressureTrend === 'rising' ? '↑' :
                    weather.pressureTrend === 'falling' ? '↓' : '→'
                  } {weather.pressureTrend}
                </Text>
              )}

              {/* Scent conditions */}
              <View style={styles.scentRow}>
                <Text style={[
                  styles.scentLabel,
                  {
                    color: weather.scentCondition === 'excellent' ? Colors.success :
                           weather.scentCondition === 'good' ? Colors.warning :
                           weather.scentCondition === 'moderate' ? Colors.amber : Colors.danger,
                  },
                ]}>
                  Scent: {weather.scentCondition.charAt(0).toUpperCase() + weather.scentCondition.slice(1)}
                  {weather.dewPoint !== null ? ` (${weather.dewPoint.toFixed(0)}°F dew point)` : ''}
                </Text>
              </View>
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
    backgroundColor: Colors.forestDark,
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
    color: Colors.mdWhite,
  },
  expandedPanel: {
    marginTop: 4,
    backgroundColor: Colors.forestDark,
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
    borderTopColor: Colors.overlayLight,
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
    borderTopColor: Colors.overlayLight,
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
  pressureTrendText: {
    fontSize: 11,
    fontWeight: '600',
    marginTop: 4,
  },
  scentRow: {
    marginTop: 6,
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: Colors.overlayLight,
  },
  scentLabel: {
    fontSize: 11,
    fontWeight: '600',
    lineHeight: 14,
  },
});
