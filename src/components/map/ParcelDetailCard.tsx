/**
 * @file ParcelDetailCard.tsx
 * @description Bottom-sheet shown when a parcel is tapped. Displays the free
 * Maryland parcel data — property address, acreage, account id, and the owner's
 * MAILING address — plus a "Look up owner on SDAT" button that opens the
 * parcel's official SDAT page (where the owner NAME is shown). Owner names are
 * intentionally not displayed in-app; see parcelService for why.
 *
 * @module components/map/ParcelDetailCard
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
import {
  ParcelProperties,
  PARCEL_ATTRIBUTION,
} from '../../services/parcelService';

interface ParcelDetailCardProps {
  parcel: ParcelProperties | null;
  onClose: () => void;
}

function titleCase(s: string): string {
  return s
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

export default function ParcelDetailCard({ parcel, onClose }: ParcelDetailCardProps) {
  const visible = parcel !== null;
  const address = parcel?.address ? titleCase(parcel.address) : null;
  const cityZip = parcel
    ? [parcel.city ? titleCase(parcel.city) : null, parcel.zip].filter(Boolean).join(' ')
    : '';

  const openSdat = () => {
    if (parcel?.sdatUrl) Linking.openURL(parcel.sdatUrl).catch(() => {});
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.backdrop}>
        <View style={styles.sheet}>
          <View style={styles.handle} />
          <View style={styles.header}>
            <Text style={styles.title} numberOfLines={2}>
              {address || 'Property parcel'}
            </Text>
            <TouchableOpacity
              onPress={onClose}
              accessibilityRole="button"
              accessibilityLabel="Close parcel details"
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Text style={styles.close}>{'✕'}</Text>
            </TouchableOpacity>
          </View>

          {cityZip ? <Text style={styles.subtle}>{cityZip}</Text> : null}

          {parcel?.category === 'public' ? (
            <View style={styles.publicBadge}>
              <Text style={styles.publicBadgeText}>
                ● Likely public land{parcel.exemptDesc ? ` · ${parcel.exemptDesc}` : ''}
              </Text>
            </View>
          ) : null}

          <View style={styles.rows}>
            {parcel?.acres != null ? (
              <Row label="Size" value={`${parcel.acres.toFixed(2)} acres`} />
            ) : null}
            {parcel?.landUse ? <Row label="Land use" value={parcel.landUse} /> : null}
            {parcel?.acctid ? <Row label="Account" value={parcel.acctid} /> : null}
            {parcel?.ownerMailing ? (
              <Row label="Owner mailing" value={titleCase(parcel.ownerMailing)} />
            ) : null}
          </View>

          <Text style={styles.note}>
            Maryland's open data doesn't include the owner's name. Tap below to see
            the owner on the official state SDAT record.
          </Text>

          <TouchableOpacity
            style={[styles.sdatBtn, !parcel?.sdatUrl && styles.sdatBtnDisabled]}
            onPress={openSdat}
            disabled={!parcel?.sdatUrl}
            accessibilityRole="button"
            accessibilityLabel="Look up owner on Maryland SDAT"
          >
            <Text style={styles.sdatBtnText}>Look up owner on SDAT ↗</Text>
          </TouchableOpacity>

          <Text style={styles.attribution}>{PARCEL_ATTRIBUTION}</Text>
        </View>
      </View>
    </Modal>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  title: {
    flex: 1,
    color: Colors.textPrimary,
    fontSize: 18,
    fontWeight: '700',
    paddingRight: 12,
  },
  close: {
    color: Colors.textSecondary,
    fontSize: 18,
    fontWeight: '600',
  },
  subtle: {
    color: Colors.textSecondary,
    fontSize: 13,
    marginTop: 2,
  },
  publicBadge: {
    alignSelf: 'flex-start',
    marginTop: 10,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    backgroundColor: 'rgba(0,200,83,0.15)',
    borderWidth: 1,
    borderColor: '#00C853',
  },
  publicBadgeText: {
    color: '#00C853',
    fontSize: 12,
    fontWeight: '700',
  },
  rows: {
    marginTop: 14,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingVertical: 7,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.surfaceElevated,
  },
  rowLabel: {
    color: Colors.textMuted,
    fontSize: 13,
    width: 110,
  },
  rowValue: {
    flex: 1,
    color: Colors.textPrimary,
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'right',
  },
  note: {
    color: Colors.textSecondary,
    fontSize: 12,
    lineHeight: 17,
    marginTop: 14,
  },
  sdatBtn: {
    backgroundColor: Colors.forest,
    borderRadius: 10,
    paddingVertical: 13,
    alignItems: 'center',
    marginTop: 12,
  },
  sdatBtnDisabled: {
    opacity: 0.45,
  },
  sdatBtnText: {
    color: Colors.mdWhite,
    fontSize: 15,
    fontWeight: '700',
  },
  attribution: {
    color: Colors.textMuted,
    fontSize: 11,
    textAlign: 'center',
    marginTop: 12,
  },
});
