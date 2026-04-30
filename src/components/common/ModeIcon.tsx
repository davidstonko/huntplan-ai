/**
 * ModeIcon — Custom branded icons for each activity mode.
 * Uses MaterialCommunityIcons for recognizable silhouettes
 * inside styled circular badges.
 */

import React from 'react';
import { View, StyleSheet } from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import Colors from '../../theme/colors';
import { ActivityMode } from '../../context/ActivityModeContext';

interface ModeIconProps {
  mode: ActivityMode;
  size?: number;
}

/** Mode-specific configuration: icon name, colors */
const MODE_VISUALS: Record<string, { icon: string; bg: string; accent: string }> = {
  hunt: { icon: 'deer', bg: Colors.moss, accent: Colors.mdGold },
  fish: { icon: 'sail-boat', bg: Colors.info, accent: Colors.mdWhite },
  camp: { icon: 'tent', bg: Colors.oak, accent: Colors.mdGold },
  hike: { icon: 'shoe-print', bg: Colors.sage, accent: Colors.mdWhite },
  crab: { icon: 'fish', bg: Colors.rust, accent: Colors.mdGold },
  boat: { icon: 'sail-boat', bg: Colors.forestDark, accent: Colors.mdWhite },
};

const ModeIcon: React.FC<ModeIconProps> = ({ mode, size = 36 }) => {
  const vis = MODE_VISUALS[mode] || MODE_VISUALS.hunt;
  const borderW = Math.max(2, size * 0.06);
  const iconSize = size * 0.52;

  return (
    <View
      style={[
        styles.outer,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          borderWidth: borderW,
          borderColor: vis.accent,
          backgroundColor: vis.bg,
        },
      ]}
    >
      <MaterialCommunityIcons
        name={vis.icon}
        size={iconSize}
        color={vis.accent}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  outer: {
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.25,
    shadowRadius: 3,
    elevation: 3,
  },
});

export default ModeIcon;
