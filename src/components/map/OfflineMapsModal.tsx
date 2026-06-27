/**
 * @file OfflineMapsModal.tsx
 * @description Self-contained bottom-sheet for downloading Maryland offline map
 * tile packs, reachable from the offline-tiles button on every map screen.
 *
 * Wraps services/offlineMaps.ts. Kept self-contained (its own Modal) so it can
 * be dropped into the Hunt/Fish/Camp/Hike/Scout map screens without registering
 * a route in four separate navigators.
 *
 * @module components/map/OfflineMapsModal
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import Colors from '../../theme/colors';
import {
  MARYLAND_REGIONS,
  OfflineRegion,
  regionFromBounds,
  downloadRegion,
  deleteRegion,
  getDownloadedPacks,
  getTotalDiskUsage,
} from '../../services/offlineMaps';

interface OfflineMapsModalProps {
  visible: boolean;
  onClose: () => void;
  /** Called after any download/delete so the parent can refresh its banner state. */
  onChanged?: () => void;
  /** Offline status, surfaced as a header hint when true. */
  isOffline?: boolean;
  /**
   * Optional: returns the map's current viewport so the user can cache exactly
   * the area they're looking at. When provided, a "download current view"
   * option appears. Screens without a MapView ref simply omit it.
   */
  getBounds?: () => Promise<{
    minLng: number;
    minLat: number;
    maxLng: number;
    maxLat: number;
  } | null>;
}

export default function OfflineMapsModal({
  visible,
  onClose,
  onChanged,
  isOffline,
  getBounds,
}: OfflineMapsModalProps) {
  const [downloadedIds, setDownloadedIds] = useState<Set<string>>(new Set());
  const [totalMB, setTotalMB] = useState(0);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [viewRegion, setViewRegion] = useState<OfflineRegion | null>(null);

  const refresh = useCallback(async () => {
    const packs = await getDownloadedPacks();
    setDownloadedIds(
      new Set(packs.filter((p) => p.status === 'complete').map((p) => p.id)),
    );
    setTotalMB(await getTotalDiskUsage());
    if (getBounds) {
      try {
        const b = await getBounds();
        setViewRegion(b ? regionFromBounds(b) : null);
      } catch {
        setViewRegion(null);
      }
    }
  }, [getBounds]);

  useEffect(() => {
    if (visible) refresh();
  }, [visible, refresh]);

  const handleDownload = useCallback(
    async (region: OfflineRegion) => {
      if (downloadingId) return;
      setDownloadingId(region.id);
      setProgress(0);
      try {
        await downloadRegion(region, (p) => setProgress(p));
        await refresh();
        onChanged?.();
      } catch (e) {
        Alert.alert(
          'Download failed',
          'Could not download this region. Check your connection and try again.',
        );
      } finally {
        setDownloadingId(null);
        setProgress(0);
      }
    },
    [downloadingId, refresh, onChanged],
  );

  const handleDelete = useCallback(
    (region: OfflineRegion) => {
      Alert.alert(
        'Delete offline map',
        `Remove the downloaded tiles for ${region.name}? You can re-download anytime.`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Delete',
            style: 'destructive',
            onPress: async () => {
              await deleteRegion(region.id);
              await refresh();
              onChanged?.();
            },
          },
        ],
      );
    },
    [refresh, onChanged],
  );

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
            <Text style={styles.title}>Offline Maps</Text>
            <TouchableOpacity
              onPress={onClose}
              accessibilityRole="button"
              accessibilityLabel="Close offline maps"
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Text style={styles.close}>{'✕'}</Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.subtitle}>
            {isOffline
              ? "You're offline. Maps only work in areas you've already downloaded."
              : 'Download a region so the map works with no cell service in the field.'}
          </Text>

          {viewRegion && !isOffline ? (
            <View style={styles.viewCard}>
              <View style={styles.viewInfo}>
                <Text style={styles.viewTitle}>Download the area I'm viewing</Text>
                <Text style={styles.viewMeta}>
                  ~{viewRegion.estimatedSizeMB} MB · current map view
                </Text>
              </View>
              <TouchableOpacity
                style={[
                  styles.btn,
                  styles.btnDownload,
                  downloadingId ? styles.btnDisabled : null,
                ]}
                disabled={!!downloadingId}
                onPress={() => handleDownload(viewRegion)}
                accessibilityRole="button"
                accessibilityLabel="Download the current map view for offline use"
              >
                <Text style={styles.btnDownloadText}>
                  {downloadingId === viewRegion.id ? `${progress}%` : 'Download'}
                </Text>
              </TouchableOpacity>
            </View>
          ) : null}

          <ScrollView style={styles.list} contentContainerStyle={styles.listContent}>
            {MARYLAND_REGIONS.map((region) => {
              const downloaded = downloadedIds.has(region.id);
              const busy = downloadingId === region.id;
              return (
                <View key={region.id} style={styles.row}>
                  <View style={styles.rowInfo}>
                    <Text style={styles.rowName}>{region.name}</Text>
                    <Text style={styles.rowMeta}>
                      {downloaded
                        ? `Saved · ~${region.estimatedSizeMB} MB`
                        : `~${region.estimatedSizeMB} MB`}
                    </Text>
                    {busy ? (
                      <View style={styles.progressTrack}>
                        <View
                          style={[styles.progressFill, { width: `${progress}%` }]}
                        />
                      </View>
                    ) : null}
                  </View>
                  {busy ? (
                    <View style={styles.action}>
                      <ActivityIndicator color={Colors.mdGold} />
                      <Text style={styles.progressPct}>{progress}%</Text>
                    </View>
                  ) : downloaded ? (
                    <TouchableOpacity
                      style={[styles.btn, styles.btnDelete]}
                      onPress={() => handleDelete(region)}
                      accessibilityRole="button"
                      accessibilityLabel={`Delete offline map for ${region.name}`}
                    >
                      <Text style={styles.btnDeleteText}>Delete</Text>
                    </TouchableOpacity>
                  ) : (
                    <TouchableOpacity
                      style={[
                        styles.btn,
                        styles.btnDownload,
                        downloadingId ? styles.btnDisabled : null,
                      ]}
                      disabled={!!downloadingId || isOffline}
                      onPress={() => handleDownload(region)}
                      accessibilityRole="button"
                      accessibilityLabel={`Download offline map for ${region.name}`}
                    >
                      <Text style={styles.btnDownloadText}>
                        {isOffline ? 'Offline' : 'Download'}
                      </Text>
                    </TouchableOpacity>
                  )}
                </View>
              );
            })}
          </ScrollView>

          <Text style={styles.footer}>
            {totalMB > 0
              ? `${totalMB} MB downloaded · tiles use the Outdoors map style`
              : 'No regions downloaded yet'}
          </Text>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: Colors.background,
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    paddingHorizontal: 18,
    paddingBottom: 28,
    paddingTop: 10,
    maxHeight: '78%',
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
    alignItems: 'center',
  },
  title: {
    color: Colors.textPrimary,
    fontSize: 20,
    fontWeight: '700',
  },
  close: {
    color: Colors.textSecondary,
    fontSize: 18,
    fontWeight: '600',
  },
  subtitle: {
    color: Colors.textSecondary,
    fontSize: 13,
    marginTop: 6,
    marginBottom: 10,
    lineHeight: 18,
  },
  viewCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.surface,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 12,
    marginBottom: 10,
  },
  viewInfo: {
    flex: 1,
    paddingRight: 12,
  },
  viewTitle: {
    color: Colors.textPrimary,
    fontSize: 14,
    fontWeight: '700',
  },
  viewMeta: {
    color: Colors.textMuted,
    fontSize: 12,
    marginTop: 2,
  },
  list: {
    flexGrow: 0,
  },
  listContent: {
    paddingBottom: 8,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.surfaceElevated,
  },
  rowInfo: {
    flex: 1,
    paddingRight: 12,
  },
  rowName: {
    color: Colors.textPrimary,
    fontSize: 15,
    fontWeight: '600',
  },
  rowMeta: {
    color: Colors.textMuted,
    fontSize: 12,
    marginTop: 2,
  },
  progressTrack: {
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.surfaceElevated,
    marginTop: 8,
    overflow: 'hidden',
  },
  progressFill: {
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.mdGold,
  },
  action: {
    alignItems: 'center',
    width: 76,
  },
  progressPct: {
    color: Colors.textMuted,
    fontSize: 11,
    marginTop: 2,
  },
  btn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    minWidth: 90,
    alignItems: 'center',
  },
  btnDownload: {
    backgroundColor: Colors.forest,
  },
  btnDownloadText: {
    color: Colors.mdWhite,
    fontSize: 13,
    fontWeight: '700',
  },
  btnDelete: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: Colors.mdRed,
  },
  btnDeleteText: {
    color: Colors.mdRed,
    fontSize: 13,
    fontWeight: '700',
  },
  btnDisabled: {
    opacity: 0.45,
  },
  footer: {
    color: Colors.textMuted,
    fontSize: 12,
    textAlign: 'center',
    marginTop: 10,
  },
});
