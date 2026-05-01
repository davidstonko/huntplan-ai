/**
 * @file ContactFab.tsx
 * @description Floating Contact button anchored at bottom-right.
 *
 * Originally lived inside ResourcesHubScreen (Hunt's Info tab) as a
 * file-local component (see ResourcesHubScreen.tsx commit history —
 * the V2.4 contact-card refactor that pulled the email banner out of
 * the top of the screen and tucked it into a small bottom-right FAB).
 *
 * Extracted to a shared component on 2026-05-01 so the same affordance
 * could ship on Fish / Camp / Hike Resources screens — cross-module
 * audit caught that contact was Hunt-only.
 *
 * Email destination is hard-coded to the public app inbox
 * `feedback.mdhuntfishoutdoors@gmail.com`. Never use David's personal
 * email here (see the V2.4 audit memory entry — the personal email
 * leaked into 5 sites including this FAB before the sweep).
 *
 * Positioning:
 *   - Default `bottom: 24` puts the FAB at the bottom-right corner.
 *   - On Hunt's Info tab there's also a Report FAB at `bottom: 24`,
 *     so callers there pass `bottom={96}` to stack above it
 *     (24 + ~64 button height + 8 gap = 96).
 */

import React from 'react';
import { Linking, StyleSheet, Text, TouchableOpacity } from 'react-native';
import Colors from '../../theme/colors';

const FEEDBACK_EMAIL = 'feedback.mdhuntfishoutdoors@gmail.com';

interface ContactFabProps {
  /**
   * Distance from the bottom of the screen in pt. Default 24.
   * Use 96 when there's another FAB at bottom: 24 below this one.
   */
  bottom?: number;
}

export default function ContactFab({ bottom = 24 }: ContactFabProps) {
  const onPress = React.useCallback(() => {
    const subject = encodeURIComponent(
      'MDHuntFishOutdoors — partnership / listing inquiry',
    );
    const body = encodeURIComponent(
      'Hi,\n\n' +
        'I would like to talk about [adding my business / partnership / a feature request / other]:\n\n\n' +
        '— Sent from MDHuntFishOutdoors',
    );
    Linking.openURL(
      `mailto:${FEEDBACK_EMAIL}?subject=${subject}&body=${body}`,
    ).catch(() => {});
  }, []);

  return (
    <TouchableOpacity
      style={[styles.fab, { bottom }]}
      onPress={onPress}
      activeOpacity={0.7}
      accessibilityRole="button"
      accessibilityLabel="Contact MDHuntFishOutdoors"
      accessibilityHint={`Opens an email to ${FEEDBACK_EMAIL} about adding a business, partnership, or feedback`}
    >
      <Text style={styles.icon}>{'✉'}</Text>
      <Text style={styles.label}>Contact</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  fab: {
    position: 'absolute',
    right: 16,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.moss,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 22,
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 4,
    zIndex: 50,
  },
  icon: { fontSize: 14, color: '#FFFFFF' },
  label: { color: '#FFFFFF', fontSize: 13, fontWeight: '700', letterSpacing: 0.3 },
});
