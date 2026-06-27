/**
 * @file GaugeDetailCard.tsx
 * @description Bottom sheet shown when a USGS stream gauge is tapped — live
 * discharge (CFS), gage height, and water temperature, with the reading time
 * and a link to the full USGS station page.
 *
 * @module components/map/GaugeDetailCard
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Linking,
} from 'react-native';
import Colors from '../../theme/colors';
import { StreamGauge, GAUGE_ATTRIBUTION } from '../../services/streamGaugeService';

interface GaugeDetailCardProps {
  gauge: StreamGauge | null;
  onClose: () => void;
}

function titleCase(s: string): string {
  return s.toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
}

function readingTime(iso: string | undefined): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (isNaN(d.getTime())) return null;
  return d.toLocaleString();
}

export default function GaugeDetailCard({ gauge, onClose }: GaugeDetailCardProps) {
  const visible = gauge !== null;
  const updated =
    readingTime(
      gauge?.flowCfs?.at || gauge?.gageHeightFt?.at || gauge?.waterTempF?.at,
    );

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.sheet}>
          <View style={styles.handle} />
          <View style={styles.header}>
            <Text style={styles.title} numberOfLines={2}>
              {gauge ? titleCase(gauge.name) : 'Stream gauge'}
            </Text>
            <TouchableOpacity
              onPress={onClose}
              accessibilityRole="button"
              accessibilityLabel="Close gauge details"
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Text style={styles.close}>{'✕'}</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.statRow}>
            <Stat
              label="Flow"
              value={gauge?.flowCfs ? `${Math.round(gauge.flowCfs.value)}` : '—'}
              unit={gauge?.flowCfs ? 'cfs' : ''}
            />
            <Stat
              label="Gage ht"
              value={gauge?.gageHeightFt ? `${gauge.gageHeightFt.value}` : '—'}
              unit={gauge?.gageHeightFt ? 'ft' : ''}
            />
            <Stat
              label="Water temp"
              value={gauge?.waterTempF ? `${gauge.waterTempF.value}` : '—'}
              unit={gauge?.waterTempF ? '°F' : ''}
            />
          </View>

          {updated ? <Text style={styles.updated}>Updated {updated}</Text> : null}

          <TouchableOpacity
            style={styles.linkBtn}
            onPress={() => gauge && Linking.openURL(gauge.usgsUrl).catch(() => {})}
            accessibilityRole="button"
            accessibilityLabel="Open full USGS station page"
          >
            <Text style={styles.linkBtnText}>Full USGS data ↗</Text>
          </TouchableOpacity>

          <Text style={styles.attribution}>{GAUGE_ATTRIBUTION}</Text>
        </View>
      </View>
    </Modal>
  );
}

function Stat({ label, value, unit }: { label: string; value: string; unit: string }) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statValue}>
        {value}
        {unit ? <Text style={styles.statUnit}> {unit}</Text> : null}
      </Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: Colors.background,
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    paddingHorizontal: 18,
    paddingTop: 10,
    paddingBottom: 28,
  },
  handle: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.textMuted,
    marginBottom: 12,
  },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  title: { flex: 1, color: Colors.textPrimary, fontSize: 17, fontWeight: '700', paddingRight: 12 },
  close: { color: Colors.textSecondary, fontSize: 18, fontWeight: '600' },
  statRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 18 },
  stat: { flex: 1, alignItems: 'center' },
  statValue: { color: Colors.textPrimary, fontSize: 22, fontWeight: '800' },
  statUnit: { color: Colors.textMuted, fontSize: 13, fontWeight: '600' },
  statLabel: { color: Colors.textMuted, fontSize: 12, marginTop: 3 },
  updated: { color: Colors.textMuted, fontSize: 12, textAlign: 'center', marginTop: 14 },
  linkBtn: {
    backgroundColor: '#1A3A5C',
    borderRadius: 10,
    paddingVertical: 13,
    alignItems: 'center',
    marginTop: 16,
  },
  linkBtnText: { color: Colors.mdWhite, fontSize: 15, fontWeight: '700' },
  attribution: { color: Colors.textMuted, fontSize: 11, textAlign: 'center', marginTop: 12 },
});
