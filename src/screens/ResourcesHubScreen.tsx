/**
 * ResourcesHubScreen — Wrapper that combines Regulations and Resources
 * into a single tab with a segmented control at the top.
 * Replaces the old separate Regs and Resources tabs.
 */

import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import Colors from '../theme/colors';
import RegulationsScreen from './RegulationsScreen';
import ResourcesScreen from './ResourcesScreen';

type Segment = 'regulations' | 'links';

export default function ResourcesHubScreen() {
  const [activeSegment, setActiveSegment] = useState<Segment>('regulations');

  return (
    <View style={styles.container}>
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
});
