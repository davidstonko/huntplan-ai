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
import { useNavigation } from '@react-navigation/native';
import Colors from '../../theme/colors';
import { ActivityMode, useActivityMode } from '../../context/ActivityModeContext';
import ModeLogo from '../common/ModeLogo';

/**
 * Mode → root-stack route name mapping. Kept in sync with AppNavigator's
 * per-mode Tab.Navigator names so the header dropdown can cross-navigate
 * between mode-specific tab stacks without funneling back through the
 * ModePicker home screen.
 */
const MODE_ROUTE: Record<ActivityMode, 'HuntTabs' | 'FishTabs' | 'CampTabs' | 'HikeTabs'> = {
  hunt: 'HuntTabs',
  fish: 'FishTabs',
  camp: 'CampTabs',
  hike: 'HikeTabs',
};

/**
 * Mode configuration: label, accent color, and sublabel. The visual glyph
 * for each mode is rendered by `<ModeLogo />` — no letter tokens or emoji.
 */
const MODE_CONFIG: Record<
  ActivityMode,
  { label: string; accent: string; sublabel: string }
> = {
  // 2026-04-30 (V2.4 audit live): sublabels in this dropdown drifted
  // from the ones on ModePickerScreen — Fish here said "regulations"
  // while the home screen said "boating, crabbing". Unified all four
  // sublabels to match the home-screen text exactly so users see
  // consistent copy whether they switch modes from the home picker
  // or the in-app dropdown.
  hunt: {
    label: 'Hunt',
    accent: Colors.moss,
    sublabel: 'Public lands, scouting, deer camp, blinds, regulations',
  },
  fish: {
    label: 'Fish',
    accent: '#0277BD',
    sublabel: 'Angler access, stocking, tides, boating, crabbing',
  },
  camp: {
    label: 'Camp',
    accent: '#E67E22',
    sublabel: 'Campgrounds, trip planner, group camp, gear',
  },
  hike: {
    label: 'Hike',
    accent: '#2E7D32',
    sublabel: 'Appalachian Trail, state-park trails, trip planner',
  },
};

// All four V2.2.0 activity modes. Camp (Phase 5A) and Hike (Phase 5B) tab
// stacks are wired in AppNavigator alongside Hunt and Fish; each mode
// presents its own screens via ActivityMode-driven branching.
const MODES: ActivityMode[] = ['hunt', 'fish', 'camp', 'hike'];

/**
 * ActivityModePicker - Dropdown in the navigation header that lets users
 * switch between MDHuntFishOutdoors modes: Hunt, Fish, Camp, and Hike.
 */
export default function ActivityModePicker() {
  const { activeMode, setActiveMode } = useActivityMode();
  const navigation = useNavigation<any>();
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
    closeDropdown();
    if (mode === activeMode) return;
    setActiveMode(mode);
    // Navigate to the mode's dedicated tab stack. React Navigation climbs
    // up the navigator tree to find the matching route in the root Stack
    // (which owns ModePicker + the four mode tab stacks).
    navigation.navigate(MODE_ROUTE[mode]);
  };

  return (
    <>
      {/* Header Title Button \u2014 2026-05-02 (V2.4 audit, iter 12):
          added accessibilityRole + label so VoiceOver announces this
          as "Hunt mode, button" instead of just reading the visible
          glyph + label. Same hint pattern used on the dropdown rows. */}
      <TouchableOpacity
        style={styles.headerButton}
        onPress={openDropdown}
        activeOpacity={0.7}
        accessibilityRole="button"
        accessibilityLabel={`${config.label} mode`}
        accessibilityHint="Tap to switch between Hunt, Fish, Camp, and Hike"
      >
        <View style={styles.headerMarkWrap}>
          <ModeLogo mode={activeMode} size="sm" accent={config.accent} />
        </View>
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
                  accessibilityRole="button"
                  accessibilityLabel={
                    isActive
                      ? `${modeConf.label}, current mode`
                      : `Switch to ${modeConf.label}`
                  }
                  accessibilityHint={modeConf.sublabel}
                >
                  <View style={styles.rowMarkWrap}>
                    <ModeLogo mode={mode} size="md" accent={modeConf.accent} />
                  </View>
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
  headerMarkWrap: {
    marginRight: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.tan,
    letterSpacing: 0.5,
  },
  chevron: {
    fontSize: 10,
    color: Colors.tan,
    marginLeft: 4,
    marginTop: 2,
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
    alignItems: 'flex-start',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.mud,
  },
  dropdownItemActive: {
    backgroundColor: Colors.forestDark,
  },
  rowMarkWrap: {
    marginRight: 14,
    marginTop: 2,
  },
  modeTextContainer: {
    flex: 1,
  },
  modeLabel: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginBottom: 4,
  },
  modeSublabel: {
    fontSize: 12,
    color: Colors.textMuted,
    marginTop: 2,
    lineHeight: 16,
  },
  activeIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginLeft: 8,
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
