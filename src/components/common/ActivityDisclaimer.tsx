/**
 * @file ActivityDisclaimer.tsx
 * @description Dismissible, activity-specific disclaimer banner.
 * Shows once per session for each activity mode. User can tap X to hide it.
 * Persists dismissal in AsyncStorage so it stays hidden until next app launch.
 *
 * Usage:
 *   <ActivityDisclaimer mode="fish" />
 *   <ActivityDisclaimer mode="boat" />
 */

import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Colors from '../../theme/colors';
import { ActivityMode } from '../../context/ActivityModeContext';

const DISMISS_KEY_PREFIX = '@disclaimer_dismissed_';

interface DisclaimerConfig {
  icon: string;
  text: string;
  accentColor: string;
}

// 2026-04-26 (fork merge): legacy 'boat' and 'crab' keys retained for any
// nav code that may still set those modes, even though only 4 are in the
// ActivityMode union. Cast keeps TS quiet without fanning the union out.
const DISCLAIMER_CONFIGS: Record<string, DisclaimerConfig> = {
  fish: {
    icon: '\uD83C\uDFA3',
    text: 'A valid Maryland fishing license is required. Verify current regulations, seasons, and catch limits with MD DNR before fishing.',
    accentColor: Colors.water,
  },
  boat: {
    icon: '\u26F5',
    text: 'Always wear a life jacket. Check weather and water conditions before launch. This app is not a substitute for proper navigation equipment.',
    accentColor: Colors.waterLight,
  },
  crab: {
    icon: '\uD83E\uDD80',
    text: 'A valid Maryland crabbing license is required. Verify current regulations, size limits, and harvest restrictions with MD DNR.',
    accentColor: Colors.amber,
  },
};

interface ActivityDisclaimerProps {
  mode: ActivityMode;
}

export default function ActivityDisclaimer({ mode }: ActivityDisclaimerProps) {
  const [visible, setVisible] = useState(false);
  const config = DISCLAIMER_CONFIGS[mode];

  useEffect(() => {
    if (!config) return;

    // Check if already dismissed this session
    AsyncStorage.getItem(DISMISS_KEY_PREFIX + mode).then((val) => {
      if (val !== 'true') {
        setVisible(true);
      }
    }).catch(() => {
      setVisible(true); // Show if storage fails
    });
  }, [mode, config]);

  const handleDismiss = async () => {
    setVisible(false);
    try {
      await AsyncStorage.setItem(DISMISS_KEY_PREFIX + mode, 'true');
    } catch {
      // Silently fail — banner just reappears next time
    }
  };

  if (!visible || !config) return null;

  return (
    <View style={[styles.banner, { borderLeftColor: config.accentColor }]}>
      <Text style={styles.icon}>{config.icon}</Text>
      <Text style={styles.text}>{config.text}</Text>
      <TouchableOpacity
        style={styles.dismissButton}
        onPress={handleDismiss}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        accessibilityLabel="Dismiss disclaimer"
        accessibilityRole="button"
      >
        <Text style={styles.dismissText}>{'\u2715'}</Text>
      </TouchableOpacity>
    </View>
  );
}

/**
 * Call this on app launch to reset all activity disclaimers so they show again.
 * Typically called in App.tsx initialization.
 */
export async function resetActivityDisclaimers(): Promise<void> {
  const keys = Object.keys(DISCLAIMER_CONFIGS).map((m) => DISMISS_KEY_PREFIX + m);
  try {
    await AsyncStorage.multiRemove(keys);
  } catch {
    // Silently fail
  }
}

const styles = StyleSheet.create({
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.forestDark,
    borderTopWidth: 1,
    borderTopColor: Colors.mud,
    borderLeftWidth: 3,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  icon: {
    fontSize: 14,
    marginRight: 6,
  },
  text: {
    flex: 1,
    fontSize: 10,
    color: Colors.amber,
    letterSpacing: 0.3,
    lineHeight: 14,
  },
  dismissButton: {
    marginLeft: 8,
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dismissText: {
    fontSize: 12,
    color: Colors.textMuted,
    fontWeight: '600',
  },
});
