/**
 * @file ElevationProfile.tsx
 * @description Elevation profile chart for GPS tracks.
 * Displays a mini chart showing elevation changes along a recorded or imported track.
 * Uses the Mapbox Tilequery API to fetch elevation data for track points.
 *
 * @module Components/Map
 * @version 3.0.0
 */

import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  ActivityIndicator,
  TouchableOpacity,
} from 'react-native';
import Colors from '../../theme/colors';

export interface TrackPoint {
  latitude: number;
  longitude: number;
  altitude?: number; // meters — from GPS if available
  timestamp?: string;
}

interface ElevationProfileProps {
  /** Track points to profile */
  trackPoints: TrackPoint[];
  /** Height of the chart area */
  height?: number;
  /** Whether the panel is expanded */
  expanded?: boolean;
  /** Callback when user taps a point on the profile */
  onPointSelect?: (index: number, point: TrackPoint) => void;
}

/**
 * Calculate distance between two GPS points in meters (Haversine formula).
 */
function haversineDistance(
  lat1: number, lon1: number,
  lat2: number, lon2: number,
): number {
  const R = 6371000; // Earth radius in meters
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/**
 * Downsample track points evenly to a maximum count.
 */
function downsample(points: TrackPoint[], maxPoints: number): TrackPoint[] {
  if (points.length <= maxPoints) return points;
  const step = (points.length - 1) / (maxPoints - 1);
  const result: TrackPoint[] = [];
  for (let i = 0; i < maxPoints; i++) {
    result.push(points[Math.round(i * step)]);
  }
  return result;
}

/**
 * ElevationProfile — Mini elevation chart for GPS tracks.
 *
 * Renders a filled area chart showing elevation over distance.
 * Uses GPS altitude if available, with option to enhance via Mapbox Terrain API.
 * Shows key stats: total gain, total loss, min/max elevation.
 */
export default function ElevationProfile({
  trackPoints,
  height = 120,
  expanded = true,
  onPointSelect,
}: ElevationProfileProps) {
  const [loading, setLoading] = useState(false);

  // Downsample to max 100 points for performance
  const sampledPoints = useMemo(
    () => downsample(trackPoints, 100),
    [trackPoints],
  );

  // Calculate cumulative distances
  const { distances, elevations, totalDistance } = useMemo(() => {
    const dists: number[] = [0];
    const elev: number[] = [];

    for (let i = 0; i < sampledPoints.length; i++) {
      const pt = sampledPoints[i];
      elev.push(pt.altitude ?? 0);
      if (i > 0) {
        const prev = sampledPoints[i - 1];
        dists.push(dists[i - 1] + haversineDistance(
          prev.latitude, prev.longitude,
          pt.latitude, pt.longitude,
        ));
      }
    }

    return {
      distances: dists,
      elevations: elev,
      totalDistance: dists[dists.length - 1] || 0,
    };
  }, [sampledPoints]);

  // Compute stats
  const stats = useMemo(() => {
    if (elevations.length === 0) return { min: 0, max: 0, gain: 0, loss: 0 };

    let min = elevations[0];
    let max = elevations[0];
    let gain = 0;
    let loss = 0;

    for (let i = 1; i < elevations.length; i++) {
      const diff = elevations[i] - elevations[i - 1];
      if (diff > 0) gain += diff;
      else loss += Math.abs(diff);
      min = Math.min(min, elevations[i]);
      max = Math.max(max, elevations[i]);
    }

    return { min, max, gain, loss };
  }, [elevations]);

  if (trackPoints.length < 2) {
    return (
      <View style={[styles.container, { height }]}>
        <Text style={styles.emptyText}>Record a track to see elevation profile</Text>
      </View>
    );
  }

  const chartWidth = Dimensions.get('window').width - 40;
  const chartHeight = height - 40; // Leave room for stats
  const elevRange = stats.max - stats.min || 1;

  // Build SVG-like path data for the profile area
  const pathPoints = elevations.map((elev, i) => {
    const x = totalDistance > 0 ? (distances[i] / totalDistance) * chartWidth : (i / elevations.length) * chartWidth;
    const y = chartHeight - ((elev - stats.min) / elevRange) * (chartHeight - 10);
    return { x, y };
  });

  const formatDistance = (meters: number): string => {
    if (meters >= 1609.34) return `${(meters / 1609.34).toFixed(1)} mi`;
    return `${Math.round(meters)} m`;
  };

  const formatElevation = (meters: number): string => {
    return `${Math.round(meters * 3.28084)} ft`; // Convert to feet
  };

  return (
    <View style={[styles.container, !expanded && styles.collapsed]}>
      {expanded && (
        <>
          {/* ── Stats Row ── */}
          <View style={styles.statsRow}>
            <View style={styles.stat}>
              <Text style={styles.statValue}>{formatDistance(totalDistance)}</Text>
              <Text style={styles.statLabel}>Distance</Text>
            </View>
            <View style={styles.stat}>
              <Text style={[styles.statValue, { color: '#2E7D32' }]}>
                +{formatElevation(stats.gain)}
              </Text>
              <Text style={styles.statLabel}>Gain</Text>
            </View>
            <View style={styles.stat}>
              <Text style={[styles.statValue, { color: '#C62828' }]}>
                -{formatElevation(stats.loss)}
              </Text>
              <Text style={styles.statLabel}>Loss</Text>
            </View>
            <View style={styles.stat}>
              <Text style={styles.statValue}>{formatElevation(stats.max)}</Text>
              <Text style={styles.statLabel}>High</Text>
            </View>
            <View style={styles.stat}>
              <Text style={styles.statValue}>{formatElevation(stats.min)}</Text>
              <Text style={styles.statLabel}>Low</Text>
            </View>
          </View>

          {/* ── Chart Area (rendered with View bars) ── */}
          <View style={[styles.chart, { height: chartHeight }]}>
            {loading && (
              <View style={styles.loadingOverlay}>
                <ActivityIndicator size="small" color={Colors.moss} />
              </View>
            )}
            <View style={styles.barContainer}>
              {pathPoints.map((pt, i) => {
                const barHeight = chartHeight - pt.y;
                return (
                  <TouchableOpacity
                    key={i}
                    style={[
                      styles.bar,
                      {
                        height: Math.max(barHeight, 1),
                        width: Math.max(chartWidth / pathPoints.length - 1, 1),
                        backgroundColor: elevations[i] > (stats.min + stats.max) / 2
                          ? '#4a6741'
                          : '#6b8f5e',
                      },
                    ]}
                    onPress={() => onPointSelect?.(i, sampledPoints[i])}
                    activeOpacity={0.7}
                  />
                );
              })}
            </View>

            {/* Y-axis labels */}
            <View style={styles.yAxis}>
              <Text style={styles.axisLabel}>{formatElevation(stats.max)}</Text>
              <Text style={styles.axisLabel}>{formatElevation(stats.min)}</Text>
            </View>
          </View>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 10,
    marginHorizontal: 10,
    borderWidth: 1,
    borderColor: Colors.mud,
  },
  collapsed: {
    paddingVertical: 6,
  },
  emptyText: {
    color: Colors.textMuted,
    fontSize: 12,
    textAlign: 'center',
    marginTop: 20,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
    paddingHorizontal: 4,
  },
  stat: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  statLabel: {
    fontSize: 9,
    color: Colors.textSecondary,
    marginTop: 1,
  },
  chart: {
    position: 'relative',
    borderRadius: 6,
    overflow: 'hidden',
    backgroundColor: Colors.background,
  },
  barContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingLeft: 2,
    gap: 1,
  },
  bar: {
    borderTopLeftRadius: 1,
    borderTopRightRadius: 1,
  },
  yAxis: {
    position: 'absolute',
    right: 4,
    top: 2,
    bottom: 2,
    justifyContent: 'space-between',
  },
  axisLabel: {
    fontSize: 8,
    color: Colors.textMuted,
    backgroundColor: Colors.background + 'CC',
    paddingHorizontal: 2,
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.overlay,
    zIndex: 1,
  },
});
