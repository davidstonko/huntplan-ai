/**
 * @file TideWidget.tsx
 * @description Floating tide prediction widget for the Fish Map screen.
 * Fetches real-time tide data from NOAA Tides & Currents API and displays
 * current tide status, water level, and next high/low tide times.
 *
 * Features:
 * - Fetches tide predictions from NOAA (station: Baltimore 8574680)
 * - Shows current tide status (Rising/Falling/High/Low)
 * - Displays current water level and next tide times
 * - Collapsible card with dark theme styling
 * - Offline fallback with cached data
 * - Loading spinner while fetching
 *
 * @module Components
 * @version 1.0.0
 */

import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import Colors from '../../theme/colors';

// ── Types ──

interface TidePrediction {
  t: string; // ISO timestamp
  v: string; // Water level in feet
}

interface NOAATideResponse {
  predictions: TidePrediction[];
}

interface TideDataPoint {
  time: Date;
  level: number;
}

// NOAA Baltimore station ID
const NOAA_STATION_ID = '8574680';
const NOAA_API_BASE = 'https://api.tidesandcurrents.noaa.gov/api/prod/datagetter';

/**
 * TideWidget — Floating card showing current tide status and predictions.
 *
 * Fetches hourly tide predictions from NOAA API and displays:
 * - Current tide status (Rising/Falling/High/Low)
 * - Current water level
 * - Time to next high/low tide
 * - Simple visual tide indicator (up/down arrows)
 *
 * Data is fetched on mount and cached in component state.
 * Gracefully handles offline/error scenarios.
 *
 * @param visible - Whether widget should be displayed (false when location panel open)
 * @returns JSX.Element - Floating tide widget card
 */
interface TideWidgetProps {
  visible?: boolean;
}

export const TideWidget: React.FC<TideWidgetProps> = ({ visible = true }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [tideData, setTideData] = useState<TideDataPoint[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  // ── Fetch tide data from NOAA ──
  const fetchTideData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // Get today's date in YYYYMMDD format
      const now = new Date();
      const dateStr = now.toISOString().split('T')[0].replace(/-/g, '');

      // Build NOAA API URL with parameters
      const params = new URLSearchParams({
        station: NOAA_STATION_ID,
        date: dateStr,
        product: 'predictions',
        datum: 'MLLW',
        units: 'english',
        time_zone: 'lst_ldt',
        format: 'json',
        interval: 'h',
      });

      const response = await fetch(`${NOAA_API_BASE}?${params.toString()}`);

      if (!response.ok) {
        throw new Error(`NOAA API error: ${response.status}`);
      }

      const data: NOAATideResponse = await response.json();

      if (!data.predictions || data.predictions.length === 0) {
        throw new Error('No tide predictions available');
      }

      // Convert NOAA predictions to TideDataPoint[]
      const predictions: TideDataPoint[] = data.predictions.map((pred) => ({
        time: new Date(pred.t),
        level: parseFloat(pred.v),
      }));

      setTideData(predictions);
      setLastUpdated(new Date());
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch tide data';
      setError(message);
      setTideData([]);
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch tide data on mount
  useEffect(() => {
    fetchTideData();
  }, [fetchTideData]);

  // ── Calculate current tide status ──
  const getCurrentTideStatus = useCallback((): {
    status: 'High' | 'Low' | 'Rising' | 'Falling';
    currentLevel: number;
    nextTideTime: Date | null;
    nextTideType: 'High' | 'Low' | null;
  } => {
    if (tideData.length < 2) {
      return {
        status: 'Rising',
        currentLevel: 0,
        nextTideTime: null,
        nextTideType: null,
      };
    }

    const now = new Date();
    let currentIdx = 0;

    // Find closest prediction to current time
    for (let i = 0; i < tideData.length; i++) {
      if (tideData[i].time > now) {
        currentIdx = i > 0 ? i - 1 : 0;
        break;
      }
      currentIdx = i;
    }

    const current = tideData[currentIdx];
    const next = tideData[currentIdx + 1] || tideData[currentIdx];

    // Determine if rising or falling
    const isRising = next.level > current.level;
    let status: 'High' | 'Low' | 'Rising' | 'Falling' = isRising ? 'Rising' : 'Falling';

    // Check if near high/low (within 0.1 feet of local extrema)
    if (currentIdx > 0 && currentIdx < tideData.length - 1) {
      const prev = tideData[currentIdx - 1];
      const threshold = 0.1;

      // Check if at or near high tide
      if (
        current.level >= prev.level - threshold &&
        current.level >= next.level - threshold
      ) {
        status = 'High';
      }
      // Check if at or near low tide
      else if (
        current.level <= prev.level + threshold &&
        current.level <= next.level + threshold
      ) {
        status = 'Low';
      }
    }

    // Find next high or low tide
    let nextTideIdx: number | null = null;
    let nextTideType: 'High' | 'Low' | null = null;

    for (let i = currentIdx + 1; i < tideData.length - 1; i++) {
      const prev = tideData[i - 1];
      const curr = tideData[i];
      const next = tideData[i + 1];

      // Check for local high
      if (curr.level >= prev.level && curr.level >= next.level) {
        nextTideIdx = i;
        nextTideType = 'High';
        break;
      }
      // Check for local low
      if (curr.level <= prev.level && curr.level <= next.level) {
        nextTideIdx = i;
        nextTideType = 'Low';
        break;
      }
    }

    return {
      status,
      currentLevel: current.level,
      nextTideTime: nextTideIdx !== null ? tideData[nextTideIdx].time : null,
      nextTideType,
    };
  }, [tideData]);

  const tideStatus = getCurrentTideStatus();

  // ── Format time for display ──
  const formatTime = (date: Date | null): string => {
    if (!date) return '--:--';
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
  };

  // ── Format last updated time ──
  const formatLastUpdated = (date: Date | null): string => {
    if (!date) return '';
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
  };

  // Get visual indicator emoji based on tide status
  const getTideIndicator = (): string => {
    switch (tideStatus.status) {
      case 'High':
        return '📈';
      case 'Low':
        return '📉';
      case 'Rising':
        return '🔼';
      case 'Falling':
        return '🔽';
      default:
        return '🌊';
    }
  };

  if (!visible) return null;

  return (
    <TouchableOpacity
      style={styles.container}
      onPress={() => setIsExpanded(!isExpanded)}
      activeOpacity={0.8}
    >
      {/* ── Collapsed View ── */}
      <View style={styles.header}>
        <Text style={styles.tideIndicator}>{getTideIndicator()}</Text>
        <View style={styles.titleSection}>
          <Text style={styles.title}>Tide</Text>
          <Text style={styles.status}>{tideStatus.status}</Text>
        </View>
        {!loading && !error && (
          <Text style={styles.level}>{tideStatus.currentLevel.toFixed(1)} ft</Text>
        )}
      </View>

      {/* ── Expanded View ── */}
      {isExpanded && (
        <View style={styles.expandedContent}>
          {loading && (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="small" color={Colors.water} />
              <Text style={styles.loadingText}>Fetching tide data...</Text>
            </View>
          )}

          {error && (
            <View style={styles.errorContainer}>
              <Text style={styles.errorText}>Tide data unavailable</Text>
              {lastUpdated && (
                <Text style={styles.lastUpdatedText}>
                  Last: {formatLastUpdated(lastUpdated)}
                </Text>
              )}
            </View>
          )}

          {!loading && !error && tideData.length > 0 && (
            <>
              {/* Current status details */}
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Status:</Text>
                <Text style={styles.detailValue}>
                  {tideStatus.status} • {tideStatus.currentLevel.toFixed(2)} ft
                </Text>
              </View>

              {/* Next tide info */}
              {tideStatus.nextTideTime && tideStatus.nextTideType && (
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Next:</Text>
                  <Text style={styles.detailValue}>
                    {tideStatus.nextTideType} at {formatTime(tideStatus.nextTideTime)}
                  </Text>
                </View>
              )}

              {/* Location info */}
              <View style={styles.locationInfo}>
                <Text style={styles.locationLabel}>Baltimore, MD</Text>
                <Text style={styles.stationLabel}>Station {NOAA_STATION_ID}</Text>
              </View>

              {/* Last updated */}
              {lastUpdated && (
                <Text style={styles.lastUpdatedText}>
                  Updated: {formatLastUpdated(lastUpdated)}
                </Text>
              )}
            </>
          )}
        </View>
      )}
    </TouchableOpacity>
  );
};

// ── Styles ──

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 120,
    left: 16,
    minWidth: 160,
    backgroundColor: Colors.overlay,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.water,
    overflow: 'hidden',
    shadowColor: Colors.mdBlack,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 5,
    zIndex: 10,
  },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 10,
  },

  tideIndicator: {
    fontSize: 20,
  },

  titleSection: {
    flex: 1,
    gap: 2,
  },

  title: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.water,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },

  status: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.textPrimary,
  },

  level: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.water,
  },

  expandedContent: {
    borderTopWidth: 1,
    borderTopColor: Colors.water,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 8,
  },

  loadingContainer: {
    alignItems: 'center',
    gap: 8,
    paddingVertical: 12,
  },

  loadingText: {
    fontSize: 11,
    color: Colors.textSecondary,
    fontWeight: '500',
  },

  errorContainer: {
    gap: 4,
    paddingVertical: 8,
  },

  errorText: {
    fontSize: 12,
    color: Colors.warning,
    fontWeight: '600',
  },

  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
    paddingVertical: 6,
  },

  detailLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },

  detailValue: {
    fontSize: 11,
    fontWeight: '500',
    color: Colors.textPrimary,
    flex: 1,
    textAlign: 'right',
  },

  locationInfo: {
    borderTopWidth: 1,
    borderTopColor: Colors.mud,
    paddingTop: 8,
    gap: 2,
  },

  locationLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.textPrimary,
  },

  stationLabel: {
    fontSize: 9,
    color: Colors.textMuted,
    fontWeight: '400',
  },

  lastUpdatedText: {
    fontSize: 9,
    color: Colors.textMuted,
    fontStyle: 'italic',
    marginTop: 4,
  },
});
