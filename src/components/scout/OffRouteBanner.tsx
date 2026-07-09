/**
 * OffRouteBanner — on/off-route status while following a saved route.
 * Pure/presentational; state comes from useOffRouteAlerts.
 */
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import Colors from '../../theme/colors';

interface OffRouteBannerProps {
  offRoute: boolean;
  distanceMeters: number | null;
  routeName?: string;
  onStop?: () => void;
}

export const OffRouteBanner: React.FC<OffRouteBannerProps> = ({
  offRoute,
  distanceMeters,
  routeName,
  onStop,
}) => {
  const dist = distanceMeters != null ? Math.round(distanceMeters) : null;
  return (
    <View style={[styles.container, offRoute ? styles.off : styles.on]}>
      <View style={styles.textCol}>
        <Text style={styles.title}>
          {offRoute ? '⚠︎ Off route' : '✓ On route'}
          {routeName ? ` · ${routeName}` : ''}
        </Text>
        <Text style={styles.sub}>
          {offRoute
            ? `You're ${dist ?? '—'} m off the line — head back toward your route.`
            : dist != null
              ? `${dist} m from the line`
              : 'Getting a GPS fix…'}
        </Text>
      </View>
      {onStop ? (
        <TouchableOpacity
          onPress={onStop}
          style={styles.stop}
          accessibilityRole="button"
          accessibilityLabel="Stop following route"
        >
          <Text style={styles.stopText}>Stop</Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderWidth: 1,
  },
  on: {
    backgroundColor: 'rgba(107,158,91,0.16)', // success, translucent
    borderColor: Colors.success,
  },
  off: {
    backgroundColor: 'rgba(199,84,80,0.18)', // danger, translucent
    borderColor: Colors.danger,
  },
  textCol: { flex: 1, paddingRight: 10 },
  title: { fontSize: 14, fontWeight: '800', color: Colors.textPrimary },
  sub: { fontSize: 12, color: Colors.textSecondary, marginTop: 2 },
  stop: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.mud,
  },
  stopText: { fontSize: 13, fontWeight: '700', color: Colors.textPrimary },
});
