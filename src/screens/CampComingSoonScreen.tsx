/**
 * CampComingSoonScreen.tsx — Placeholder for MD Camp mode tabs
 *
 * Displays a branded "Coming Soon" message for all camp mode tabs until
 * the full camping module is built out (Sprint C-B+). Shows a tent emoji,
 * feature preview list, and encourages users to stay tuned.
 *
 * Usage: Used as the component for all 5 camp mode tabs in AppNavigator.
 */

import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import Colors from '../theme/colors';

const UPCOMING_FEATURES = [
  { emoji: '\uD83C\uDFD5\uFE0F', label: 'MD DNR Campsite Map' },
  { emoji: '\uD83E\uDDF3', label: 'Camping Gear Picks' },
  { emoji: '\uD83E\uDD16', label: 'AI Camp Planner' },
  { emoji: '\uD83D\uDC65', label: 'Group Camp Trips' },
  { emoji: '\uD83D\uDD25', label: 'Fire Regs & Resources' },
];

export default function CampComingSoonScreen() {
  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
    >
      <Text style={styles.tentEmoji}>{'\u26FA'}</Text>
      <Text style={styles.title}>MD Camp</Text>
      <Text style={styles.subtitle}>Coming Soon</Text>

      <View style={styles.divider} />

      <Text style={styles.description}>
        Maryland&apos;s state parks, forests, and campgrounds — all in one place.
        Find campsites, plan group trips, and gear up with curated picks.
      </Text>

      <View style={styles.featureList}>
        {UPCOMING_FEATURES.map((feature) => (
          <View key={feature.label} style={styles.featureRow}>
            <Text style={styles.featureEmoji}>{feature.emoji}</Text>
            <Text style={styles.featureLabel}>{feature.label}</Text>
          </View>
        ))}
      </View>

      <View style={styles.footer}>
        <Text style={styles.footerText}>
          Stay tuned — this module is in active development.
        </Text>
        <Text style={styles.disclaimer}>
          Always verify regulations with Maryland DNR
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  content: {
    alignItems: 'center',
    paddingHorizontal: 32,
    paddingTop: 60,
    paddingBottom: 40,
  },
  tentEmoji: {
    fontSize: 64,
    marginBottom: 12,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: Colors.tan,
    letterSpacing: 0.5,
  },
  subtitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.oak,
    marginTop: 4,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  divider: {
    width: 60,
    height: 3,
    backgroundColor: Colors.oak,
    borderRadius: 2,
    marginVertical: 24,
  },
  description: {
    fontSize: 15,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 32,
  },
  featureList: {
    width: '100%',
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.mud,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: Colors.mud,
  },
  featureEmoji: {
    fontSize: 20,
    marginRight: 12,
    width: 30,
    textAlign: 'center',
  },
  featureLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  footer: {
    marginTop: 32,
    alignItems: 'center',
  },
  footerText: {
    fontSize: 13,
    color: Colors.textMuted,
    textAlign: 'center',
  },
  disclaimer: {
    fontSize: 11,
    color: Colors.textMuted,
    marginTop: 12,
    fontStyle: 'italic',
  },
});
