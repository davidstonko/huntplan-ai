import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Colors from '../../theme/colors';

/**
 * Shows an offline banner when the device has no network.
 * Import useNetworkStatus and pass isOffline prop, or
 * use this component directly with manual control.
 */
interface Props {
  isOffline?: boolean;
}

export default function OfflineIndicator({ isOffline = false }: Props) {
  if (!isOffline) return null;

  return (
    <View style={styles.indicator}>
      <Text style={styles.text}>OFFLINE — Some features unavailable</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  indicator: {
    backgroundColor: Colors.mud,
    paddingHorizontal: 12,
    paddingVertical: 6,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: Colors.clay,
  },
  text: {
    fontSize: 10,
    color: Colors.amber,
    fontWeight: '700',
    letterSpacing: 0.8,
  },
});
