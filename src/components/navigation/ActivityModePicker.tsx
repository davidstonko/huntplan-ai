import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Animated,
  Pressable,
} from 'react-native';
import Colors from '../../theme/colors';
import { ActivityMode, useActivityMode } from '../../context/ActivityModeContext';

/**
 * Mode configuration: emoji, label, and accent color for each activity
 */
const MODE_CONFIG: Record<
  ActivityMode,
  { emoji: string; label: string; accent: string; sublabel: string }
> = {
  hunt: {
    emoji: '\uD83C\uDFAF',
    label: 'MD Hunt',
    accent: Colors.moss,
    sublabel: 'Hunting',
  },
  fish: {
    emoji: '\uD83D\uDC1F',
    label: 'MD Fish',
    accent: '#0277BD',
    sublabel: 'Fishing',
  },
  hike: {
    emoji: '\uD83E\uDD7E',
    label: 'MD Hike',
    accent: '#6D4C41',
    sublabel: 'Hiking',
  },
  crab: {
    emoji: '\uD83E\uDD80',
    label: 'MD Crab',
    accent: '#D84315',
    sublabel: 'Crabbing',
  },
  boat: {
    emoji: '\uD83D\uDEA4',
    label: 'MD Boat',
    accent: '#00695C',
    sublabel: 'Boating',
  },
};

const MODES: ActivityMode[] = ['hunt', 'fish', 'hike', 'crab', 'boat'];

/**
 * ActivityModePicker - Dropdown in the navigation header that lets users
 * switch between HuntMaryland, FishMaryland, HikeMaryland, etc.
 */
export default function ActivityModePicker() {
  const { activeMode, setActiveMode } = useActivityMode();
  const [showDropdown, setShowDropdown] = useState(false);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  const config = MODE_CONFIG[activeMode];

  const openDropdown = () => {
    setShowDropdown(true);
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 200,
      useNativeDriver: true,
    }).start();
  };

  const closeDropdown = () => {
    Animated.timing(fadeAnim, {
      toValue: 0,
      duration: 150,
      useNativeDriver: true,
    }).start(() => setShowDropdown(false));
  };

  const selectMode = (mode: ActivityMode) => {
    setActiveMode(mode);
    closeDropdown();
  };

  return (
    <>
      {/* Header Title Button */}
      <TouchableOpacity
        style={styles.headerButton}
        onPress={openDropdown}
        activeOpacity={0.7}
      >
        <Text style={styles.headerEmoji}>{config.emoji}</Text>
        <Text style={styles.headerTitle}>{config.label}</Text>
        <Text style={styles.chevron}>{'\u25BC'}</Text>
      </TouchableOpacity>

      {/* Dropdown Modal */}
      <Modal
        visible={showDropdown}
        transparent
        animationType="none"
        onRequestClose={closeDropdown}
      >
        <Pressable style={styles.modalOverlay} onPress={closeDropdown}>
          <Animated.View style={[styles.dropdown, { opacity: fadeAnim }]}>
            <View style={styles.dropdownHeader}>
              <Text style={styles.dropdownTitle}>Switch Activity</Text>
            </View>
            {MODES.map((mode) => {
              const modeConf = MODE_CONFIG[mode];
              const isActive = mode === activeMode;
              return (
                <TouchableOpacity
                  key={mode}
                  style={[styles.dropdownItem, isActive && styles.dropdownItemActive]}
                  onPress={() => selectMode(mode)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.modeEmoji}>{modeConf.emoji}</Text>
                  <View style={styles.modeTextContainer}>
                    <Text
                      style={[
                        styles.modeLabel,
                        isActive && { color: modeConf.accent },
                      ]}
                    >
                      {modeConf.label}
                    </Text>
                    <Text style={styles.modeSublabel}>{modeConf.sublabel}</Text>
                  </View>
                  {isActive && (
                    <View style={[styles.activeIndicator, { backgroundColor: modeConf.accent }]} />
                  )}
                  {mode !== 'hunt' && mode !== 'fish' && (
                    <View style={styles.comingSoonBadge}>
                      <Text style={styles.comingSoonText}>Soon</Text>
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}
            {/* MD Flag stripe at bottom */}
            <View style={styles.mdStripe}>
              <View style={[styles.stripeBlock, { backgroundColor: Colors.mdRed }]} />
              <View style={[styles.stripeBlock, { backgroundColor: Colors.mdGold }]} />
              <View style={[styles.stripeBlock, { backgroundColor: Colors.mdBlack }]} />
              <View style={[styles.stripeBlock, { backgroundColor: Colors.mdWhite }]} />
            </View>
          </Animated.View>
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  // Header button
  headerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 4,
    paddingVertical: 4,
  },
  headerEmoji: {
    fontSize: 18,
    marginRight: 6,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.tan,
    letterSpacing: 0.5,
  },
  chevron: {
    fontSize: 18,
    color: Colors.tan,
    marginLeft: 6,
    marginTop: 1,
  },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-start',
    alignItems: 'center',
    paddingTop: 100,
  },
  dropdown: {
    width: 260,
    backgroundColor: Colors.surfaceElevated,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.clay,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 10,
  },
  dropdownHeader: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.mud,
  },
  dropdownTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  dropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: Colors.mud,
  },
  dropdownItemActive: {
    backgroundColor: Colors.forestDark,
  },
  modeEmoji: {
    fontSize: 22,
    marginRight: 12,
  },
  modeTextContainer: {
    flex: 1,
  },
  modeLabel: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  modeSublabel: {
    fontSize: 11,
    color: Colors.textMuted,
    marginTop: 1,
  },
  activeIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginLeft: 8,
  },
  comingSoonBadge: {
    backgroundColor: Colors.mud,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 2,
    marginLeft: 8,
  },
  comingSoonText: {
    fontSize: 9,
    fontWeight: '700',
    color: Colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },

  // MD stripe
  mdStripe: {
    flexDirection: 'row',
    height: 4,
  },
  stripeBlock: {
    flex: 1,
  },
});
