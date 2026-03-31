/**
 * @file ResourcesHubScreen.tsx
 * @description Tab wrapper combining Regulations and external Resources/Links into unified Resources tab.
 * Replaces the old separate "Regulations" and "Resources" tabs with a segmented control for switching.
 *
 * @module Screens
 * @version 2.0.0
 *
 * Key features:
 * - Segmented control (Regulations | Links & Guides) for toggling between two content views
 * - Regulations view: Full seasons, bag limits, and "Can I Hunt?" checker
 * - Links & Guides view: External DNR resources, license sales, documentation, gear guides
 * - Clean, unified tab preventing navigation clutter in V2 tab bar
 */

/**
 * ResourcesHubScreen — Combined regulations and external resources interface.
 *
 * Provides two content areas accessible via a horizontal segmented control at the top:
 *
 * 1. **Regulations**: Full RegulationsScreen with seasons, bag limits, and "Can I Hunt?" checker
 * 2. **Links & Guides**: External resources (DNR links, license sales, guides) from ResourcesScreen
 *
 * Replaces the old separate tabs, reducing clutter while keeping both features easily accessible.
 *
 * @returns {JSX.Element} Container with segmented control and content view
 */

import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import Colors from '../theme/colors';
import RegulationsScreen from './RegulationsScreen';
import ResourcesScreen from './ResourcesScreen';

type Segment = 'regulations' | 'links';

/**
 * ResourcesHubScreen component — Segmented wrapper for Regulations and Resources.
 * Includes quick-access toolbar for Harvest Log and Settings sub-screens.
 *
 * @returns {JSX.Element} Container with segmented control and either RegulationsScreen or ResourcesScreen
 */
export default function ResourcesHubScreen() {
  const [activeSegment, setActiveSegment] = useState<Segment>('regulations');
  const navigation = useNavigation<any>();

  return (
    <View style={styles.container}>
      {/* ── Quick-Access Toolbar ── */}
      <View style={styles.quickBar}>
        <TouchableOpacity
          style={styles.quickButton}
          onPress={() => navigation.navigate('HarvestLog')}
          activeOpacity={0.7}
        >
          <Text style={styles.quickIcon}>{'🦌'}</Text>
          <Text style={styles.quickLabel}>Harvest Log</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.quickButton}
          onPress={() => navigation.navigate('Forum')}
          activeOpacity={0.7}
        >
          <Text style={styles.quickIcon}>{'💬'}</Text>
          <Text style={styles.quickLabel}>Forum</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.quickButton}
          onPress={() => navigation.navigate('Settings')}
          activeOpacity={0.7}
        >
          <Text style={styles.quickIcon}>{'⚙️'}</Text>
          <Text style={styles.quickLabel}>Settings</Text>
        </TouchableOpacity>
      </View>

      {/* ── Segmented Control ── */}
      <View style={styles.segmentBar}>
        <TouchableOpacity
          style={[styles.segment, activeSegment === 'regulations' && styles.segmentActive]}
          onPress={() => setActiveSegment('regulations')}
          activeOpacity={0.7}
        >
          <Text style={[styles.segmentText, activeSegment === 'regulations' && styles.segmentTextActive]}>
            Regulations
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.segment, activeSegment === 'links' && styles.segmentActive]}
          onPress={() => setActiveSegment('links')}
          activeOpacity={0.7}
        >
          <Text style={[styles.segmentText, activeSegment === 'links' && styles.segmentTextActive]}>
            Links & Guides
          </Text>
        </TouchableOpacity>
      </View>

      {/* ── Content ── */}
      <View style={styles.content}>
        {activeSegment === 'regulations' ? <RegulationsScreen /> : <ResourcesScreen />}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  segmentBar: {
    flexDirection: 'row',
    backgroundColor: Colors.surface,
    marginHorizontal: 16,
    marginTop: 10,
    marginBottom: 4,
    borderRadius: 10,
    padding: 3,
    borderWidth: 1,
    borderColor: Colors.mud,
  },
  segment: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 8,
  },
  segmentActive: {
    backgroundColor: Colors.moss,
  },
  segmentText: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.textMuted,
  },
  segmentTextActive: {
    color: Colors.textOnAccent,
  },
  content: {
    flex: 1,
  },
  quickBar: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 2,
  },
  quickButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Colors.mud,
    gap: 6,
  },
  quickIcon: {
    fontSize: 14,
  },
  quickLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
});
