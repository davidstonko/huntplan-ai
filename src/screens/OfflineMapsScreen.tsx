/**
 * @file OfflineMapsScreen.tsx
 * @description Offline map tile pack manager UI.
 * Lets users download Maryland regional map packs for use without cell service.
 * Shows download status, disk usage, and manage/delete options.
 *
 * Connects to services/offlineMaps.ts for Mapbox offline tile management.
 *
 * @module Screens
 * @version 3.0.0
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
  SafeAreaView,
} from 'react-native';
import Colors from '../theme/colors';
import {
  MARYLAND_REGIONS,
  OfflineRegion,
  DownloadedPack,
  downloadRegion,
  deleteRegion,
  getDownloadedPacks,
  getTotalDiskUsage,
  deleteAllPacks,
} from '../services/offlineMaps';

export default function OfflineMapsScreen() {
  const [packs, setPacks] = useState<DownloadedPack[]>([]);
  const [totalMB, setTotalMB] = useState(0);
  const [downloading, setDownloading] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);

  const refresh = useCallback(async () => {
    const downloaded = await getDownloadedPacks();
    setPacks(downloaded);
    const usage = await getTotalDiskUsage();
    setTotalMB(usage);
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const handleDownload = async (region: OfflineRegion) => {
    setDownloading(region.id);
    setProgress(0);
    try {
      await downloadRegion(region, (p) => setProgress(p));
      await refresh();
    } catch (e: any) {
      Alert.alert('Download Failed', e.message || 'Could not download map pack');
    } finally {
      setDownloading(null);
      setProgress(0);
    }
  };

  const handleDelete = (region: OfflineRegion) => {
    Alert.alert(
      'Delete Map Pack',
      `Delete "${region.name}" offline map? You can re-download it later.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            await deleteRegion(region.id);
            await refresh();
          },
        },
      ],
    );
  };

  const handleDeleteAll = () => {
    if (packs.length === 0) return;
    Alert.alert(
      'Delete All Map Packs',
      'Remove all downloaded offline maps? This frees up disk space.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete All',
          style: 'destructive',
          onPress: async () => {
            await deleteAllPacks();
            await refresh();
          },
        },
      ],
    );
  };

  const isDownloaded = (regionId: string) =>
    packs.some((p) => p.id === regionId && p.status === 'complete');

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Offline Maps</Text>
          <Text style={styles.subtitle}>
            Download map packs for areas with no cell service.
            Maps include terrain, trails, and public land boundaries.
          </Text>
        </View>

        {/* Disk Usage */}
        <View style={styles.usageCard}>
          <Text style={styles.usageLabel}>Disk Usage</Text>
          <Text style={styles.usageValue}>
            {totalMB > 0 ? `${totalMB} MB` : 'No maps downloaded'}
          </Text>
          <Text style={styles.usageDetail}>
            {packs.length} of {MARYLAND_REGIONS.length} regions downloaded
          </Text>
          {packs.length > 0 && (
            <TouchableOpacity style={styles.deleteAllBtn} onPress={handleDeleteAll}>
              <Text style={styles.deleteAllText}>Delete All Maps</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Region List */}
        <Text style={styles.sectionTitle}>Maryland Regions</Text>

        {MARYLAND_REGIONS.map((region) => {
          const downloaded = isDownloaded(region.id);
          const isActive = downloading === region.id;

          return (
            <View key={region.id} style={styles.regionCard}>
              <View style={styles.regionInfo}>
                <Text style={styles.regionName}>{region.name}</Text>
                <Text style={styles.regionMeta}>
                  ~{region.estimatedSizeMB} MB · Zoom {region.minZoom}-{region.maxZoom}
                </Text>
                {downloaded && (
                  <Text style={styles.downloadedBadge}>Downloaded</Text>
                )}
              </View>

              <View style={styles.regionActions}>
                {isActive ? (
                  <View style={styles.progressContainer}>
                    <ActivityIndicator color={Colors.moss} size="small" />
                    <Text style={styles.progressText}>{progress}%</Text>
                  </View>
                ) : downloaded ? (
                  <TouchableOpacity
                    style={styles.deleteBtn}
                    onPress={() => handleDelete(region)}
                  >
                    <Text style={styles.deleteBtnText}>Remove</Text>
                  </TouchableOpacity>
                ) : (
                  <TouchableOpacity
                    style={styles.downloadBtn}
                    onPress={() => handleDownload(region)}
                    disabled={downloading !== null}
                  >
                    <Text style={styles.downloadBtnText}>Download</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          );
        })}

        {/* Tips */}
        <View style={styles.tipsCard}>
          <Text style={styles.tipsTitle}>Tips</Text>
          <Text style={styles.tipsText}>
            {'\u2022'} Download maps on Wi-Fi before heading to the field{'\n'}
            {'\u2022'} Western MD and Eastern Shore have the most remote hunting areas{'\n'}
            {'\u2022'} Maps work without any cell service — GPS still works offline{'\n'}
            {'\u2022'} Delete packs you no longer need to free up space
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  header: {
    marginBottom: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 14,
    color: Colors.textSecondary,
    lineHeight: 20,
  },
  usageCard: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: Colors.mud,
  },
  usageLabel: {
    fontSize: 12,
    color: Colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 4,
  },
  usageValue: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginBottom: 2,
  },
  usageDetail: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginBottom: 12,
  },
  deleteAllBtn: {
    alignSelf: 'flex-start',
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 6,
    backgroundColor: Colors.rust,
  },
  deleteAllText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.tan,
    marginBottom: 12,
  },
  regionCard: {
    backgroundColor: Colors.surface,
    borderRadius: 10,
    padding: 14,
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: Colors.mud,
  },
  regionInfo: {
    flex: 1,
    marginRight: 12,
  },
  regionName: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.textPrimary,
    marginBottom: 2,
  },
  regionMeta: {
    fontSize: 12,
    color: Colors.textMuted,
  },
  downloadedBadge: {
    fontSize: 11,
    color: Colors.success,
    fontWeight: '600',
    marginTop: 3,
  },
  regionActions: {
    alignItems: 'center',
  },
  downloadBtn: {
    backgroundColor: Colors.moss,
    paddingVertical: 8,
    paddingHorizontal: 18,
    borderRadius: 8,
  },
  downloadBtnText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
  },
  deleteBtn: {
    backgroundColor: Colors.surfaceElevated,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.rust,
  },
  deleteBtnText: {
    color: Colors.rust,
    fontSize: 13,
    fontWeight: '600',
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  progressText: {
    color: Colors.moss,
    fontSize: 13,
    fontWeight: '600',
  },
  tipsCard: {
    backgroundColor: Colors.forestDark,
    borderRadius: 10,
    padding: 14,
    marginTop: 16,
  },
  tipsTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.lichen,
    marginBottom: 6,
  },
  tipsText: {
    fontSize: 13,
    color: Colors.textSecondary,
    lineHeight: 20,
  },
});
