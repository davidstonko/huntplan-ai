/**
 * @file components/fishing/TideWidget.tsx
 * @description Compact tide display widget for FishMapScreen overlay.
 *
 * Shows current/next tide (high or low) with time, nearest station name, and
 * direction indicator. Taps to expand and show next 3 tide predictions.
 *
 * Behavior:
 * - On mount, locates nearest tide station and fetches next tide prediction
 * - Shows loading shimmer while fetching
 * - Displays tide type (High/Low), time, station name, and arrow (↑/↓)
 * - Gracefully handles errors (shows "Tide data unavailable")
 * - Uses theme colors for consistent dark mode styling
 *
 * @module Components
 * @version 1.0.0
 */

import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, ViewStyle } from 'react-native';
import { getNearestStation, getNextTide, type NextTide } from '../../services/tidalService';
import Colors from '../../theme/colors';

// ── Types ──────────────────────────────────────────────────────

interface TideWidgetProps {
  /** User's latitude (optional) */
  userLat?: number;
  /** User's longitude (optional) */
  userLng?: number;
  /** Optional container style override */
  style?: ViewStyle;
}

// ── Component ──────────────────────────────────────────────────

/**
 * TideWidget - Compact tide prediction display for fishing maps
 *
 * Shows next high/low tide with time and nearest station name.
 * Fetches from NOAA API (cached for 24 hours) on mount.
 *
 * @component
 * @example
 * <TideWidget userLat={38.5} userLng={-76.0} />
 */
export const TideWidget: React.FC<TideWidgetProps> = ({ userLat, userLng, style }) => {
  const [nextTide, setNextTide] = useState<NextTide | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    const fetchTideData = async () => {
      try {
        setLoading(true);
        setError(false);

        // Use provided coordinates or default to central Maryland (8574680 = Baltimore)
        let stationId = '8574680'; // Baltimore as default
        if (typeof userLat === 'number' && typeof userLng === 'number') {
          const station = getNearestStation(userLat, userLng);
          stationId = station.id;
        }

        const tideData = await getNextTide(stationId);
        if (tideData) {
          setNextTide(tideData);
        } else {
          setError(true);
        }
      } catch (err) {
        if (__DEV__) console.warn('[TideWidget] Fetch failed:', err);
        setError(true);
      } finally {
        setLoading(false);
      }
    };

    fetchTideData();
  }, [userLat, userLng]);

  // Format time to readable string (e.g., "2:45 PM")
  const formatTime = (dateString: string): string => {
    try {
      const date = new Date(dateString);
      return date.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
      });
    } catch {
      return 'TBD';
    }
  };

  // Determine tide direction arrow
  const getTideArrow = (tideType: 'H' | 'L'): string => {
    return tideType === 'H' ? '↑' : '↓';
  };

  // Loading state
  if (loading) {
    return (
      <View style={[styles.container, style]}>
        <ActivityIndicator size="small" color={Colors.lichen} />
      </View>
    );
  }

  // Error state
  if (error || !nextTide) {
    return (
      <View style={[styles.container, style]}>
        <Text style={styles.errorText}>Tide data unavailable</Text>
      </View>
    );
  }

  const tideTime = formatTime(nextTide.tide.time);
  const tideType = nextTide.tide.type === 'H' ? 'High' : 'Low';
  const arrow = getTideArrow(nextTide.tide.type);
  const hoursDisplay = nextTide.hoursUntil.toFixed(1);

  return (
    <TouchableOpacity
      style={[styles.container, style]}
      onPress={() => setExpanded(!expanded)}
      activeOpacity={0.7}
    >
      {expanded ? (
        // Expanded view - show next 3 predictions
        <View style={styles.expandedContent}>
          <Text style={styles.expandedTitle}>Next Tides - {nextTide.stationName}</Text>
          {nextTide.predictions.slice(0, 3).map((tide, idx) => (
            <View key={idx} style={styles.tideRow}>
              <Text style={styles.tideTypeText}>
                {tide.type === 'H' ? 'High' : 'Low'} {getTideArrow(tide.type)}
              </Text>
              <Text style={styles.tideTimeText}>{formatTime(tide.time)}</Text>
              <Text style={styles.tideHeightText}>{tide.height.toFixed(1)} ft</Text>
            </View>
          ))}
          <Text style={styles.closeHint}>Tap to collapse</Text>
        </View>
      ) : (
        // Compact view - show next tide only
        <View style={styles.compactContent}>
          <View style={styles.compactMain}>
            <Text style={styles.arrowText}>{arrow}</Text>
            <View style={styles.textStack}>
              <Text style={styles.compactType}>{tideType}</Text>
              <Text style={styles.compactTime}>{tideTime}</Text>
            </View>
            <Text style={styles.hoursText}>in {hoursDisplay}h</Text>
          </View>
          <Text style={styles.stationName}>{nextTide.stationName}</Text>
        </View>
      )}
    </TouchableOpacity>
  );
};

// ── Styles ─────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.surface,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.surfaceElevated,
    padding: 12,
    minWidth: 160,
  },

  // Loading and error states
  errorText: {
    color: Colors.textSecondary,
    fontSize: 12,
    textAlign: 'center',
  },

  // Compact view
  compactContent: {
    gap: 8,
  },

  compactMain: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },

  arrowText: {
    fontSize: 20,
    color: Colors.lichen,
    fontWeight: '600',
  },

  textStack: {
    flex: 1,
  },

  compactType: {
    color: Colors.textPrimary,
    fontSize: 14,
    fontWeight: '600',
  },

  compactTime: {
    color: Colors.textSecondary,
    fontSize: 12,
  },

  hoursText: {
    color: Colors.lichen,
    fontSize: 12,
    fontWeight: '600',
  },

  stationName: {
    color: Colors.textSecondary,
    fontSize: 11,
    paddingLeft: 28,
  },

  // Expanded view
  expandedContent: {
    gap: 12,
  },

  expandedTitle: {
    color: Colors.textPrimary,
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 4,
  },

  tideRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
    borderTopWidth: 1,
    borderTopColor: Colors.surfaceElevated,
  },

  tideTypeText: {
    color: Colors.textPrimary,
    fontSize: 12,
    fontWeight: '500',
    flex: 1,
  },

  tideTimeText: {
    color: Colors.lichen,
    fontSize: 12,
    fontWeight: '600',
    flex: 1,
    textAlign: 'right',
  },

  tideHeightText: {
    color: Colors.textSecondary,
    fontSize: 11,
    marginLeft: 8,
    minWidth: 40,
    textAlign: 'right',
  },

  closeHint: {
    color: Colors.textMuted,
    fontSize: 10,
    textAlign: 'center',
    marginTop: 4,
    fontStyle: 'italic',
  },
});
