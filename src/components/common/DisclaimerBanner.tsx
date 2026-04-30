import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import Colors from '../../theme/colors';

interface DisclaimerBannerProps {
  /**
   * When true, shows a ✕ button on the right that hides the banner.
   * Default true on all map screens.
   */
  dismissible?: boolean;
  /**
   * Controlled-mode dismissal flag. If provided alongside `onDismiss`, the
   * banner is treated as externally controlled so the parent can sync its
   * own layout (e.g. slide a search bar down when the banner is hidden).
   */
  dismissed?: boolean;
  onDismiss?: () => void;
}

/**
 * DNR disclaimer banner shown at the bottom of every map screen.
 *
 * Two modes:
 *   - Uncontrolled (default): manages its own dismissed state for the rest
 *     of the session.
 *   - Controlled: parent passes `dismissed` + `onDismiss` and reads the
 *     dismissed state to adjust other layout (search bar, bottom controls).
 *
 * User directive 2026-04-20: "we also need to enable the use to minimize
 * the warnings at the bottom".
 */
export default function DisclaimerBanner({
  dismissible = true,
  dismissed,
  onDismiss,
}: DisclaimerBannerProps) {
  const [localDismissed, setLocalDismissed] = useState(false);
  const isControlled = typeof dismissed === 'boolean';
  const effectiveDismissed = isControlled ? (dismissed as boolean) : localDismissed;

  if (effectiveDismissed) return null;

  const handleDismiss = () => {
    if (isControlled) {
      onDismiss?.();
    } else {
      setLocalDismissed(true);
    }
  };

  return (
    <View style={styles.banner}>
      <Text style={styles.text}>
        Data may not reflect current regulations. Always verify with MD DNR.
      </Text>
      {dismissible ? (
        <TouchableOpacity
          style={styles.dismissBtn}
          onPress={handleDismiss}
          accessibilityLabel="Dismiss DNR disclaimer"
          accessibilityRole="button"
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Text style={styles.dismissText}>✕</Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    backgroundColor: Colors.forestDark,
    borderTopWidth: 1,
    borderTopColor: Colors.mud,
    paddingHorizontal: 12,
    paddingVertical: 7,
    paddingRight: 32, // reserve room for ✕ button
    flexDirection: 'row',
    alignItems: 'center',
  },
  text: {
    flex: 1,
    fontSize: 10,
    color: Colors.amber,
    textAlign: 'center',
    letterSpacing: 0.3,
  },
  dismissBtn: {
    position: 'absolute',
    top: 0, bottom: 0, right: 0,
    width: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dismissText: {
    fontSize: 14,
    fontWeight: '800',
    color: Colors.amber,
  },
});
