import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Linking } from 'react-native';
import Colors from '../../theme/colors';
import { PublicLand } from '../../services/api';

interface LandInfoPanelProps {
  land: PublicLand;
  onClose: () => void;
}

const TYPE_COLORS: Record<string, string> = {
  WMA: Colors.landWMA,
  'State Forest': Colors.landStateForest,
  Federal: Colors.landFederal,
};

export default function LandInfoPanel({ land, onClose }: LandInfoPanelProps) {
  return (
    <View style={styles.container}>
      <View style={styles.handle} />

      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View
            style={[
              styles.typeBadge,
              { backgroundColor: TYPE_COLORS[land.land_type] || Colors.oak },
            ]}
          >
            <Text style={styles.typeText}>{land.land_type}</Text>
          </View>
          <Text style={styles.name} numberOfLines={2}>
            {land.name}
          </Text>
        </View>
        <TouchableOpacity onPress={onClose} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Text style={styles.closeBtn}>X</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.details}>
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>County</Text>
          <Text style={styles.detailValue}>{land.county || 'N/A'}</Text>
        </View>

        {land.acres && (
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Acres</Text>
            <Text style={styles.detailValue}>
              {land.acres.toLocaleString()}
            </Text>
          </View>
        )}

        {land.managing_agency && (
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Agency</Text>
            <Text style={styles.detailValue}>{land.managing_agency}</Text>
          </View>
        )}

        {land.huntable_species && land.huntable_species.length > 0 && (
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Species</Text>
            <Text style={styles.detailValue}>
              {land.huntable_species.join(', ')}
            </Text>
          </View>
        )}
      </View>

      {land.website_url ? (
        <TouchableOpacity
          style={styles.linkButton}
          onPress={() => Linking.openURL(land.website_url!)}
          activeOpacity={0.7}
        >
          <Text style={styles.linkText}>View Regulations on MD DNR</Text>
        </TouchableOpacity>
      ) : land.land_type === 'WMA' ? (
        <TouchableOpacity
          style={styles.linkButton}
          onPress={() =>
            Linking.openURL(
              'https://dnr.maryland.gov/wildlife/Pages/publiclands/wma.aspx',
            )
          }
          activeOpacity={0.7}
        >
          <Text style={styles.linkText}>Browse WMAs on MD DNR</Text>
        </TouchableOpacity>
      ) : land.land_type === 'State Forest' ? (
        <TouchableOpacity
          style={styles.linkButton}
          onPress={() =>
            Linking.openURL(
              'https://dnr.maryland.gov/forests/Pages/publiclands/home.aspx',
            )
          }
          activeOpacity={0.7}
        >
          <Text style={styles.linkText}>Browse State Forests on MD DNR</Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 50,
    left: 12,
    right: 12,
    backgroundColor: Colors.surface,
    borderRadius: 14,
    padding: 16,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.4,
    shadowRadius: 6,
  },
  handle: {
    width: 36,
    height: 4,
    backgroundColor: Colors.mud,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 12,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  headerLeft: {
    flex: 1,
    marginRight: 12,
  },
  typeBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
    marginBottom: 6,
  },
  typeText: {
    fontSize: 10,
    fontWeight: '800',
    color: Colors.textOnAccent,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  name: {
    fontSize: 17,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  closeBtn: {
    fontSize: 16,
    color: Colors.textMuted,
    fontWeight: '700',
    padding: 4,
  },
  details: {
    gap: 8,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  detailLabel: {
    fontSize: 13,
    color: Colors.textMuted,
    fontWeight: '500',
  },
  detailValue: {
    fontSize: 13,
    color: Colors.textPrimary,
    fontWeight: '600',
    flex: 1,
    textAlign: 'right',
    marginLeft: 12,
  },
  linkButton: {
    marginTop: 12,
    paddingVertical: 10,
    backgroundColor: Colors.forestDark,
    borderRadius: 8,
    alignItems: 'center',
  },
  linkText: {
    fontSize: 13,
    color: Colors.sage,
    fontWeight: '600',
  },
});
