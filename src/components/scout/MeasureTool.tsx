/**
 * MeasureTool — Tap points on the map to measure distances and bearing.
 * Shows a floating panel with total distance, segment distances, and bearing.
 * Renders measurement line + point markers via parent map callbacks.
 */

import React, { useState, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import Colors from '../../theme/colors';

export interface MeasurePoint {
  lat: number;
  lng: number;
}

interface MeasureToolProps {
  points: MeasurePoint[];
  onClear: () => void;
  onUndo: () => void;
  onClose: () => void;
}

// ── Helpers ──
const haversineDistance = (
  lat1: number, lon1: number,
  lat2: number, lon2: number,
): number => {
  const R = 6371000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

const bearing = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const y = Math.sin(dLon) * Math.cos((lat2 * Math.PI) / 180);
  const x =
    Math.cos((lat1 * Math.PI) / 180) * Math.sin((lat2 * Math.PI) / 180) -
    Math.sin((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.cos(dLon);
  const brng = (Math.atan2(y, x) * 180) / Math.PI;
  return (brng + 360) % 360;
};

const formatDist = (meters: number): string => {
  if (meters < 1609) {
    const feet = meters * 3.28084;
    return `${Math.round(feet)} ft`;
  }
  return `${(meters / 1609.34).toFixed(2)} mi`;
};

const formatBearing = (deg: number): string => {
  const dirs = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
  const idx = Math.round(deg / 45) % 8;
  return `${Math.round(deg)}\u00B0 ${dirs[idx]}`;
};

export default function MeasureTool({ points, onClear, onUndo, onClose }: MeasureToolProps) {
  // Calculate segments
  const segments = useMemo(() => {
    const segs: { distance: number; bearing: number }[] = [];
    for (let i = 1; i < points.length; i++) {
      const p1 = points[i - 1];
      const p2 = points[i];
      segs.push({
        distance: haversineDistance(p1.lat, p1.lng, p2.lat, p2.lng),
        bearing: bearing(p1.lat, p1.lng, p2.lat, p2.lng),
      });
    }
    return segs;
  }, [points]);

  const totalDistance = useMemo(
    () => segments.reduce((sum, s) => sum + s.distance, 0),
    [segments],
  );

  return (
    <View style={styles.panel}>
      <View style={styles.header}>
        <Text style={styles.title}>{'\uD83D\uDCCF'} Measure</Text>
        <TouchableOpacity onPress={onClose}>
          <Text style={styles.closeText}>{'\u2715'}</Text>
        </TouchableOpacity>
      </View>

      {points.length === 0 ? (
        <Text style={styles.hint}>Tap the map to place measurement points</Text>
      ) : (
        <>
          {/* Total */}
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Total Distance</Text>
            <Text style={styles.totalValue}>{formatDist(totalDistance)}</Text>
          </View>

          {/* Segment list */}
          {segments.length > 0 && (
            <ScrollView style={styles.segmentList} nestedScrollEnabled>
              {segments.map((seg, i) => (
                <View key={i} style={styles.segmentRow}>
                  <Text style={styles.segmentLabel}>
                    {i + 1} {'\u2192'} {i + 2}
                  </Text>
                  <Text style={styles.segmentDist}>{formatDist(seg.distance)}</Text>
                  <Text style={styles.segmentBearing}>{formatBearing(seg.bearing)}</Text>
                </View>
              ))}
            </ScrollView>
          )}

          {/* Point count */}
          <Text style={styles.pointCount}>{points.length} point{points.length !== 1 ? 's' : ''}</Text>
        </>
      )}

      {/* Actions */}
      <View style={styles.actions}>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={onUndo}
          disabled={points.length === 0}
        >
          <Text style={[styles.actionText, points.length === 0 && styles.actionDisabled]}>Undo</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={onClear}
          disabled={points.length === 0}
        >
          <Text style={[styles.actionText, points.length === 0 && styles.actionDisabled]}>Clear</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ── Helper to generate GeoJSON from measure points (used by ScoutScreen) ──
export function measurePointsToGeoJSON(points: MeasurePoint[]) {
  const features: any[] = [];

  // Line connecting all points
  if (points.length >= 2) {
    features.push({
      type: 'Feature' as const,
      properties: { kind: 'line' },
      geometry: {
        type: 'LineString' as const,
        coordinates: points.map((p) => [p.lng, p.lat]),
      },
    });
  }

  // Point markers
  points.forEach((p, i) => {
    features.push({
      type: 'Feature' as const,
      properties: { kind: 'point', index: i + 1 },
      geometry: {
        type: 'Point' as const,
        coordinates: [p.lng, p.lat],
      },
    });
  });

  return { type: 'FeatureCollection' as const, features } as any;
}

const styles = StyleSheet.create({
  panel: {
    position: 'absolute',
    bottom: 32,
    left: 12,
    right: 12,
    backgroundColor: Colors.overlay,
    borderRadius: 14,
    padding: 14,
    maxHeight: 280,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  title: {
    fontSize: 15,
    fontWeight: '800',
    color: Colors.textPrimary,
  },
  closeText: {
    fontSize: 18,
    color: Colors.textMuted,
    padding: 4,
  },
  hint: {
    fontSize: 12,
    color: Colors.textSecondary,
    textAlign: 'center',
    paddingVertical: 10,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: Colors.forestDark,
    padding: 10,
    borderRadius: 8,
    marginBottom: 8,
  },
  totalLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  totalValue: {
    fontSize: 16,
    fontWeight: '800',
    color: Colors.tan,
  },
  segmentList: {
    maxHeight: 120,
    marginBottom: 6,
  },
  segmentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 5,
    borderBottomWidth: 1,
    borderBottomColor: Colors.mud,
  },
  segmentLabel: {
    flex: 1,
    fontSize: 12,
    color: Colors.textMuted,
  },
  segmentDist: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.tan,
    marginRight: 12,
  },
  segmentBearing: {
    fontSize: 11,
    color: Colors.sage,
    width: 60,
    textAlign: 'right',
  },
  pointCount: {
    fontSize: 10,
    color: Colors.textMuted,
    textAlign: 'center',
    marginBottom: 6,
  },
  actions: {
    flexDirection: 'row',
    gap: 10,
  },
  actionButton: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: Colors.surfaceElevated,
    borderWidth: 1,
    borderColor: Colors.clay,
  },
  actionText: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  actionDisabled: {
    color: Colors.textMuted,
  },
});
