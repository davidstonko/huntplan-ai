import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import Colors from '../../theme/colors';
import { useNetworkStatus } from '../../hooks/useNetworkStatus';

/**
 * OfflineBanner — Persistent network status indicator
 * Shows when device loses internet connection.
 * Auto-dismisses when connection is restored.
 * Uses useNetworkStatus() internally to monitor connectivity.
 */
export const OfflineBanner: React.FC = () => {
  const { isOnline } = useNetworkStatus();
  const [isVisible, setIsVisible] = useState(false);
  const [fadeAnim] = useState(new Animated.Value(0));

  useEffect(() => {
    if (!isOnline) {
      // Show banner when offline
      setIsVisible(true);
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }).start();
    } else {
      // Fade out and hide banner when back online
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }).start(() => {
        setIsVisible(false);
      });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOnline]);

  if (!isVisible) return null;

  return (
    <Animated.View style={[styles.container, { opacity: fadeAnim }]}>
      <Text style={styles.text}>Offline — using cached data</Text>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.amber,
    paddingVertical: 8,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 30,
  },
  text: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textOnAccent,
    textAlign: 'center',
    letterSpacing: 0.3,
  },
});
