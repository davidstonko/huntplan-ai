/**
 * @file StatePackScreen.tsx
 * @description Screen for browsing, downloading, and managing state data packs.
 *
 * Features:
 * - View all available states (MD, VA, PA)
 * - Download/install additional state packs
 * - Delete downloaded packs (except MD)
 * - Switch active state
 * - View feature summaries and storage sizes
 * - Download progress tracking
 *
 * Built-in state (MD) shows "Built-In" badge and cannot be deleted.
 * VA and PA show pro/subscription badge (placeholder for Phase 3).
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  FlatList,
  Dimensions,
} from 'react-native';
import Colors from '../theme/colors';
import {
  getAvailableStatePacks,
  downloadStatePack,
  deleteStatePack,
  getActiveState,
  setActiveState,
  getTotalPackStorageUsed,
} from '../services/statePackService';
import {
  getHuntingDescription,
  getFishingDescription,
  getHikingDescription,
  getNotableDestinations,
  formatPackSize,
} from '../data/statePackRegistry';
import { StatePack, StateCode } from '../types/statePack';

const SCREEN_WIDTH = Dimensions.get('window').width;

export default function StatePackScreen() {
  const [packs, setPacks] = useState<StatePack[]>([]);
  const [activeState, setActiveStateLocal] = useState<StateCode>('MD');
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState<StateCode | null>(null);
  const [totalStorage, setTotalStorage] = useState(0);
  const [expandedState, setExpandedState] = useState<StateCode | null>(null);

  // Load initial data
  useEffect(() => {
    (async () => {
      try {
        const allPacks = await getAvailableStatePacks();
        const active = await getActiveState();
        const storage = await getTotalPackStorageUsed();

        setPacks(allPacks);
        setActiveStateLocal(active);
        setTotalStorage(storage);
      } catch (error) {
        if (__DEV__) console.error('Error loading state packs:', error);
        Alert.alert('Error', 'Failed to load state packs.');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // Handle download
  const handleDownload = useCallback(
    (stateCode: StateCode) => {
      Alert.alert(
        `Download ${stateCode} Pack?`,
        `This will download the ${stateCode} data pack (${
          packs.find((p) => p.stateCode === stateCode)?.sizeBytes
            ? formatPackSize(packs.find((p) => p.stateCode === stateCode)!.sizeBytes)
            : 'unknown size'
        }). You need WiFi or mobile data.`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Download',
            style: 'default',
            onPress: async () => {
              setDownloading(stateCode);
              try {
                await downloadStatePack(stateCode, (progress) => {
                  // Update UI with progress
                  setPacks((prev) =>
                    prev.map((p) =>
                      p.stateCode === stateCode ? { ...p, downloadProgress: progress } : p
                    )
                  );
                });

                // Refresh pack list
                const updated = await getAvailableStatePacks();
                const storage = await getTotalPackStorageUsed();
                setPacks(updated);
                setTotalStorage(storage);

                Alert.alert('Success', `${stateCode} pack downloaded and ready to use.`);
              } catch (error) {
                if (__DEV__) console.error('Download error:', error);
                Alert.alert('Error', `Failed to download ${stateCode} pack.`);
              } finally {
                setDownloading(null);
              }
            },
          },
        ]
      );
    },
    [packs]
  );

  // Handle delete
  const handleDelete = useCallback((stateCode: StateCode) => {
    Alert.alert(
      `Delete ${stateCode} Pack?`,
      `This will remove the ${stateCode} data pack from your device. You can download it again later.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteStatePack(stateCode);

              // Refresh pack list
              const updated = await getAvailableStatePacks();
              const active = await getActiveState();
              const storage = await getTotalPackStorageUsed();

              setPacks(updated);
              setActiveStateLocal(active);
              setTotalStorage(storage);

              Alert.alert('Success', `${stateCode} pack deleted.`);
            } catch (error) {
              if (__DEV__) console.error('Delete error:', error);
              Alert.alert('Error', `Failed to delete ${stateCode} pack.`);
            }
          },
        },
      ]
    );
  }, []);

  // Handle state switch
  const handleSwitchState = useCallback(
    (stateCode: StateCode) => {
      if (stateCode === activeState) return; // Already active

      Alert.alert(
        `Switch to ${stateCode}?`,
        `This will make ${stateCode} your active state. Maps and regulations will update accordingly.`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Switch',
            style: 'default',
            onPress: async () => {
              try {
                await setActiveState(stateCode);
                setActiveStateLocal(stateCode);
                Alert.alert('Success', `Active state switched to ${stateCode}.`);
              } catch (error) {
                if (__DEV__) console.error('Switch error:', error);
                Alert.alert('Error', `Failed to switch to ${stateCode}.`);
              }
            },
          },
        ]
      );
    },
    [activeState]
  );

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.oak} />
          <Text style={styles.loadingText}>Loading state packs...</Text>
        </View>
      </View>
    );
  }

  const stateFlags: Record<StateCode, string> = {
    MD: '🦀',
    VA: '🌲',
    PA: '⛰️',
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
      showsVerticalScrollIndicator={false}
    >
      {/* Header */}
      <Text style={styles.headerText}>STATE DATA PACKS</Text>
      <Text style={styles.subheaderText}>
        Offline hunting, fishing, camping & hiking data for multiple states
      </Text>

      {/* Storage Summary */}
      <View style={styles.storageCard}>
        <View style={styles.storageRow}>
          <Text style={styles.storageLabel}>Total Storage Used</Text>
          <Text style={styles.storageValue}>{formatPackSize(totalStorage)}</Text>
        </View>
        <View style={styles.divider} />
        <View style={styles.storageRow}>
          <Text style={styles.storageLabel}>Installed Packs</Text>
          <Text style={styles.storageValue}>{packs.filter((p) => p.installed).length}</Text>
        </View>
      </View>

      {/* State Packs List */}
      <Text style={styles.sectionTitle}>AVAILABLE STATES</Text>
      {packs.map((pack) => (
        <View key={pack.stateCode}>
          <TouchableOpacity
            style={[
              styles.packCard,
              activeState === pack.stateCode && styles.packCardActive,
            ]}
            onPress={() => setExpandedState(expandedState === pack.stateCode ? null : pack.stateCode)}
            activeOpacity={0.7}
          >
            {/* Header Row */}
            <View style={styles.packHeader}>
              <View style={styles.packTitleContainer}>
                <Text style={styles.packFlag}>{stateFlags[pack.stateCode]}</Text>
                <View style={styles.packInfo}>
                  <Text style={styles.packName}>{pack.stateName}</Text>
                  <Text style={styles.packVersion}>v{pack.version}</Text>
                </View>
              </View>

              {/* Badge / Action Button */}
              <View style={styles.badgeContainer}>
                {pack.stateCode === 'MD' ? (
                  <View style={styles.builtInBadge}>
                    <Text style={styles.builtInBadgeText}>BUILT-IN</Text>
                  </View>
                ) : !pack.installed ? (
                  <View style={styles.proBadge}>
                    <Text style={styles.proBadgeText}>PRO</Text>
                  </View>
                ) : (
                  <View style={styles.installedBadge}>
                    <Text style={styles.installedBadgeText}>INSTALLED</Text>
                  </View>
                )}
              </View>
            </View>

            {/* Download Progress Bar */}
            {downloading === pack.stateCode && pack.downloadProgress !== undefined && (
              <View style={styles.progressBarContainer}>
                <View
                  style={[
                    styles.progressBar,
                    { width: `${pack.downloadProgress}%` },
                  ]}
                />
                <Text style={styles.progressText}>{pack.downloadProgress}%</Text>
              </View>
            )}

            {/* Features Row */}
            <View style={styles.featuresRow}>
              <View style={styles.featureItem}>
                <Text style={styles.featureLabel}>🏹</Text>
                <Text style={styles.featureValue}>{pack.features.huntingLands}</Text>
              </View>
              <View style={styles.featureItem}>
                <Text style={styles.featureLabel}>🎣</Text>
                <Text style={styles.featureValue}>{pack.features.fishingLocations}</Text>
              </View>
              <View style={styles.featureItem}>
                <Text style={styles.featureLabel}>⛺</Text>
                <Text style={styles.featureValue}>{pack.features.campgrounds}</Text>
              </View>
              <View style={styles.featureItem}>
                <Text style={styles.featureLabel}>🥾</Text>
                <Text style={styles.featureValue}>{pack.features.hikingTrails}</Text>
              </View>
            </View>

            {/* Size */}
            <Text style={styles.packSize}>{formatPackSize(pack.sizeBytes)}</Text>
          </TouchableOpacity>

          {/* Expanded Details */}
          {expandedState === pack.stateCode && (
            <View style={styles.expandedDetails}>
              {/* Hunting */}
              <View style={styles.detailSection}>
                <Text style={styles.detailTitle}>🏹 Hunting</Text>
                <Text style={styles.detailText}>
                  {getHuntingDescription(pack.stateCode)}
                </Text>
              </View>

              {/* Fishing */}
              <View style={styles.detailSection}>
                <Text style={styles.detailTitle}>🎣 Fishing</Text>
                <Text style={styles.detailText}>
                  {getFishingDescription(pack.stateCode)}
                </Text>
              </View>

              {/* Hiking */}
              <View style={styles.detailSection}>
                <Text style={styles.detailTitle}>🥾 Hiking</Text>
                <Text style={styles.detailText}>
                  {getHikingDescription(pack.stateCode)}
                </Text>
              </View>

              {/* Notable Destinations */}
              <View style={styles.detailSection}>
                <Text style={styles.detailTitle}>📍 Notable Destinations</Text>
                <View style={styles.destinationsList}>
                  {getNotableDestinations(pack.stateCode).slice(0, 4).map((dest, i) => (
                    <Text key={i} style={styles.destinationItem}>
                      • {dest}
                    </Text>
                  ))}
                </View>
              </View>

              {/* Action Buttons */}
              <View style={styles.actionButtons}>
                {pack.stateCode === 'MD' ? (
                  <Text style={styles.builtInNote}>Built-in pack cannot be deleted</Text>
                ) : pack.installed ? (
                  <View style={styles.buttonRow}>
                    <TouchableOpacity
                      style={[styles.actionButton, styles.switchButton]}
                      onPress={() => handleSwitchState(pack.stateCode)}
                      activeOpacity={0.6}
                    >
                      <Text style={styles.buttonText}>
                        {activeState === pack.stateCode ? 'ACTIVE' : 'MAKE ACTIVE'}
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.actionButton, styles.deleteButton]}
                      onPress={() => handleDelete(pack.stateCode)}
                      activeOpacity={0.6}
                    >
                      <Text style={styles.deleteButtonText}>DELETE</Text>
                    </TouchableOpacity>
                  </View>
                ) : (
                  <TouchableOpacity
                    style={[styles.actionButton, styles.downloadButton]}
                    onPress={() => handleDownload(pack.stateCode)}
                    disabled={downloading === pack.stateCode}
                    activeOpacity={0.6}
                  >
                    {downloading === pack.stateCode ? (
                      <ActivityIndicator size="small" color={Colors.textOnAccent} />
                    ) : (
                      <Text style={styles.buttonText}>DOWNLOAD</Text>
                    )}
                  </TouchableOpacity>
                )}
              </View>
            </View>
          )}
        </View>
      ))}

      {/* Info */}
      <View style={styles.infoCard}>
        <Text style={styles.infoTitle}>About State Packs</Text>
        <Text style={styles.infoText}>
          Each state pack includes offline hunting regulations, fishing access sites, camping
          locations, hiking trails, and AI-powered chat knowledge. Download packs over WiFi for
          best performance.
        </Text>
        <Text style={[styles.infoText, { marginTop: 12 }]}>
          Pro subscription required for Virginia and Pennsylvania packs (coming soon).
        </Text>
      </View>

      <View style={{ height: 30 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  contentContainer: { paddingHorizontal: 16, paddingVertical: 16 },

  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: Colors.textMuted,
  },

  headerText: {
    fontSize: 18,
    fontWeight: '800',
    color: Colors.textPrimary,
    marginBottom: 4,
  },
  subheaderText: {
    fontSize: 13,
    color: Colors.textMuted,
    marginBottom: 20,
    lineHeight: 18,
  },

  storageCard: {
    backgroundColor: Colors.surface,
    borderRadius: 10,
    padding: 12,
    marginBottom: 24,
  },
  storageRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  storageLabel: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
  storageValue: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.oak,
  },
  divider: {
    height: 1,
    backgroundColor: Colors.mud,
    marginVertical: 8,
  },

  sectionTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: Colors.oak,
    letterSpacing: 1.5,
    marginBottom: 12,
    marginTop: 8,
  },

  packCard: {
    backgroundColor: Colors.surface,
    borderRadius: 10,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: Colors.mud,
  },
  packCardActive: {
    borderColor: Colors.oak,
    borderWidth: 2,
  },

  packHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  packTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  packFlag: {
    fontSize: 28,
    marginRight: 12,
  },
  packInfo: {
    flex: 1,
  },
  packName: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  packVersion: {
    fontSize: 11,
    color: Colors.textMuted,
    marginTop: 2,
  },

  badgeContainer: {
    marginLeft: 8,
  },
  builtInBadge: {
    backgroundColor: Colors.sage,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  builtInBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    color: Colors.mdBlack,
    letterSpacing: 0.5,
  },
  proBadge: {
    backgroundColor: Colors.brass,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  proBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    color: Colors.mdBlack,
    letterSpacing: 0.5,
  },
  installedBadge: {
    backgroundColor: Colors.sage,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  installedBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    color: Colors.mdBlack,
    letterSpacing: 0.5,
  },

  progressBarContainer: {
    marginBottom: 12,
    borderRadius: 6,
    overflow: 'hidden',
    backgroundColor: Colors.mud,
    height: 20,
    justifyContent: 'center',
  },
  progressBar: {
    backgroundColor: Colors.oak,
    height: '100%',
  },
  progressText: {
    position: 'absolute',
    alignSelf: 'center',
    fontSize: 10,
    fontWeight: '600',
    color: Colors.textPrimary,
  },

  featuresRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 10,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: Colors.mud,
  },
  featureItem: {
    alignItems: 'center',
  },
  featureLabel: {
    fontSize: 16,
    marginBottom: 4,
  },
  featureValue: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.textPrimary,
  },

  packSize: {
    fontSize: 11,
    color: Colors.textMuted,
  },

  expandedDetails: {
    backgroundColor: Colors.background,
    borderBottomLeftRadius: 10,
    borderBottomRightRadius: 10,
    marginHorizontal: -14,
    marginBottom: -12,
    paddingHorizontal: 14,
    paddingVertical: 14,
    marginTop: 12,
  },

  detailSection: {
    marginBottom: 14,
  },
  detailTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.oak,
    marginBottom: 6,
  },
  detailText: {
    fontSize: 12,
    color: Colors.textSecondary,
    lineHeight: 16,
  },

  destinationsList: {
    marginTop: 6,
  },
  destinationItem: {
    fontSize: 11,
    color: Colors.textSecondary,
    marginBottom: 4,
  },

  actionButtons: {
    marginTop: 14,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: Colors.mud,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 10,
  },
  actionButton: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  downloadButton: {
    flex: 1,
    backgroundColor: Colors.oak,
  },
  switchButton: {
    flex: 1,
    backgroundColor: Colors.sage,
  },
  deleteButton: {
    flex: 1,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.rust,
  },
  buttonText: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.mdBlack,
    letterSpacing: 0.5,
  },
  deleteButtonText: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.rust,
    letterSpacing: 0.5,
  },

  builtInNote: {
    fontSize: 11,
    color: Colors.textMuted,
    fontStyle: 'italic',
  },

  infoCard: {
    backgroundColor: Colors.surface,
    borderRadius: 10,
    padding: 14,
    marginTop: 24,
    borderLeftWidth: 3,
    borderLeftColor: Colors.oak,
  },
  infoTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginBottom: 8,
  },
  infoText: {
    fontSize: 12,
    color: Colors.textSecondary,
    lineHeight: 16,
  },
});
