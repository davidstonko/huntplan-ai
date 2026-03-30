/**
 * PlanSidebar — Slide-out panel from the left edge of ScoutScreen.
 * Lists all saved hunt plans with visibility toggles, waypoint/route/area counts,
 * expand to see annotations, swipe-to-delete, and "New Plan" + "Export to Deer Camp" actions.
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { useScoutData } from '../../context/ScoutDataContext';
import { useDeerCamp } from '../../context/DeerCampContext';
import { HuntPlan, RecordedTrack, WAYPOINT_ICONS } from '../../types/scout';
import Colors from '../../theme/colors';

interface PlanSidebarProps {
  onNewPlan: () => void;
  onEditPlan: (planId: string) => void;
  onClose: () => void;
}

const formatTrackDuration = (seconds: number): string => {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
};

const formatTrackDistance = (meters: number): string => {
  if (meters < 1609) return `${Math.round(meters)} ft`;
  return `${(meters / 1609.34).toFixed(1)} mi`;
};

export default function PlanSidebar({ onNewPlan, onEditPlan, onClose }: PlanSidebarProps) {
  const { plans, deletePlan, togglePlanVisibility, tracks, deleteTrack, toggleTrackVisibility } = useScoutData();
  const { camps, importPlanToCamp, exportTrackToCamp } = useDeerCamp();
  const [expandedPlanId, setExpandedPlanId] = useState<string | null>(null);

  const handleExportToCamp = (plan: HuntPlan) => {
    if (camps.length === 0) {
      Alert.alert(
        'No Deer Camps',
        'Create a Deer Camp first, then you can export plans to it.',
        [{ text: 'OK' }]
      );
      return;
    }

    // If only one camp, export directly
    if (camps.length === 1) {
      importPlanToCamp(camps[0].id, plan);
      Alert.alert('Exported!', `"${plan.name}" exported to ${camps[0].name}.`);
      return;
    }

    // Multiple camps — let user pick (simple alert for V2, real picker later)
    Alert.alert(
      'Export to Deer Camp',
      'Which camp should receive this plan?',
      camps.map((camp) => ({
        text: camp.name,
        onPress: () => {
          importPlanToCamp(camp.id, plan);
          Alert.alert('Exported!', `"${plan.name}" exported to ${camp.name}.`);
        },
      })).concat([{ text: 'Cancel', onPress: () => {} }])
    );
  };

  const handleExportTrackToCamp = (track: RecordedTrack) => {
    if (camps.length === 0) {
      Alert.alert(
        'No Deer Camps',
        'Create a Deer Camp first, then you can export tracks to it.',
        [{ text: 'OK' }]
      );
      return;
    }

    if (camps.length === 1) {
      exportTrackToCamp(camps[0].id, track);
      Alert.alert('Exported!', `Track "${track.name}" exported to ${camps[0].name}.`);
      return;
    }

    Alert.alert(
      'Export Track to Deer Camp',
      'Which camp should receive this track?',
      camps.map((camp) => ({
        text: camp.name,
        onPress: () => {
          exportTrackToCamp(camp.id, track);
          Alert.alert('Exported!', `Track "${track.name}" exported to ${camp.name}.`);
        },
      })).concat([{ text: 'Cancel', onPress: () => {} }])
    );
  };

  const toggleExpanded = (planId: string) => {
    setExpandedPlanId(expandedPlanId === planId ? null : planId);
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Hunt Plans</Text>
        <View style={styles.headerButtons}>
          <TouchableOpacity style={styles.newButton} onPress={onNewPlan}>
            <Text style={styles.newButtonText}>+ New</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.closeButton} onPress={onClose}>
            <Text style={styles.closeText}>{'\u2715'}</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Plan list */}
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {plans.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyEmoji}>{'\uD83D\uDCCB'}</Text>
            <Text style={styles.emptyTitle}>No Plans Yet</Text>
            <Text style={styles.emptySubtitle}>
              Create a hunt plan to start marking stands, routes, and areas on the map.
            </Text>
          </View>
        ) : (
          plans.map((plan) => {
            const isExpanded = expandedPlanId === plan.id;
            const totalAnnotations = plan.waypoints.length + plan.routes.length + plan.areas.length;

            return (
              <View key={plan.id} style={styles.planCard}>
                {/* Plan header row */}
                <View style={styles.planRow}>
                  {/* Visibility toggle */}
                  <TouchableOpacity
                    style={styles.visToggle}
                    onPress={() => togglePlanVisibility(plan.id)}
                  >
                    <View style={[
                      styles.eyeIcon,
                      { backgroundColor: plan.visible ? plan.color : Colors.mud },
                    ]}>
                      <Text style={styles.eyeText}>{plan.visible ? '\uD83D\uDC41' : '\u2014'}</Text>
                    </View>
                  </TouchableOpacity>

                  {/* Plan name + meta — tappable to expand */}
                  <TouchableOpacity
                    style={styles.planInfo}
                    onPress={() => toggleExpanded(plan.id)}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.planName, !plan.visible && styles.planNameHidden]}>
                      {plan.name}
                    </Text>
                    <Text style={styles.planMeta}>
                      {plan.waypoints.length} pts · {plan.routes.length} routes · {plan.areas.length} areas
                    </Text>
                  </TouchableOpacity>

                  {/* Expand chevron */}
                  <Text style={styles.chevron}>{isExpanded ? '\u25B2' : '\u25BC'}</Text>
                </View>

                {/* Expanded details */}
                {isExpanded && (
                  <View style={styles.expandedSection}>
                    {/* Parking point */}
                    {plan.parkingPoint && (
                      <View style={styles.annotationRow}>
                        <Text style={styles.annotationIcon}>{WAYPOINT_ICONS.parking}</Text>
                        <Text style={styles.annotationLabel}>
                          Parking: {plan.parkingPoint.label || 'Set'}
                        </Text>
                      </View>
                    )}

                    {/* Waypoints */}
                    {plan.waypoints.map((wp) => (
                      <View key={wp.id} style={styles.annotationRow}>
                        <Text style={styles.annotationIcon}>{WAYPOINT_ICONS[wp.icon]}</Text>
                        <Text style={styles.annotationLabel}>{wp.label || wp.icon}</Text>
                      </View>
                    ))}

                    {/* Routes */}
                    {plan.routes.map((rt) => (
                      <View key={rt.id} style={styles.annotationRow}>
                        <Text style={styles.annotationIcon}>{'\u27A1\uFE0F'}</Text>
                        <Text style={styles.annotationLabel}>
                          {rt.label || 'Route'} ({Math.round(rt.distanceMeters)}m)
                        </Text>
                      </View>
                    ))}

                    {/* Areas */}
                    {plan.areas.map((area) => (
                      <View key={area.id} style={styles.annotationRow}>
                        <Text style={styles.annotationIcon}>{'\u2B1B'}</Text>
                        <Text style={styles.annotationLabel}>
                          {area.label || 'Area'} ({area.areaAcres.toFixed(1)} ac)
                        </Text>
                      </View>
                    ))}

                    {totalAnnotations === 0 && !plan.parkingPoint && (
                      <Text style={styles.noAnnotations}>No annotations yet. Tap Edit to add some.</Text>
                    )}

                    {/* Action buttons */}
                    <View style={styles.actionRow}>
                      <TouchableOpacity
                        style={styles.actionButton}
                        onPress={() => onEditPlan(plan.id)}
                      >
                        <Text style={styles.actionText}>Edit</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.actionButton}
                        onPress={() => handleExportToCamp(plan)}
                      >
                        <Text style={styles.actionText}>Export to Camp</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.actionButton, styles.deleteButton]}
                        onPress={() => {
                          Alert.alert('Delete Plan', `Delete "${plan.name}"?`, [
                            { text: 'Cancel', style: 'cancel' },
                            { text: 'Delete', style: 'destructive', onPress: () => deletePlan(plan.id) },
                          ]);
                        }}
                      >
                        <Text style={[styles.actionText, styles.deleteText]}>Delete</Text>
                      </TouchableOpacity>
                    </View>

                    {/* Plan notes */}
                    {plan.notes ? (
                      <Text style={styles.planNotes}>{plan.notes}</Text>
                    ) : null}
                  </View>
                )}
              </View>
            );
          })
        )}

        {/* ── Saved Tracks Section ── */}
        <View style={styles.sectionDivider}>
          <Text style={styles.sectionTitle}>Saved Tracks</Text>
        </View>

        {tracks.length === 0 ? (
          <View style={styles.emptyTrackState}>
            <Text style={styles.emptyTrackText}>
              No saved tracks yet. Use the Track tool to record a GPS route.
            </Text>
          </View>
        ) : (
          tracks.map((track) => (
            <View key={track.id} style={styles.trackCard}>
              <View style={styles.planRow}>
                {/* Visibility toggle */}
                <TouchableOpacity
                  style={styles.visToggle}
                  onPress={() => toggleTrackVisibility(track.id)}
                >
                  <View style={[
                    styles.eyeIcon,
                    { backgroundColor: track.visible ? '#FF4444' : Colors.mud },
                  ]}>
                    <Text style={styles.eyeText}>{track.visible ? '\uD83D\uDC41' : '\u2014'}</Text>
                  </View>
                </TouchableOpacity>

                {/* Track info */}
                <View style={styles.planInfo}>
                  <Text style={[styles.planName, !track.visible && styles.planNameHidden]}>
                    {track.name}
                  </Text>
                  <Text style={styles.planMeta}>
                    {formatTrackDistance(track.distanceMeters)} · {formatTrackDuration(track.durationSeconds)} · {track.points.length} pts
                  </Text>
                </View>
              </View>

              {/* Track actions */}
              <View style={styles.trackActions}>
                <TouchableOpacity
                  style={styles.actionButton}
                  onPress={() => handleExportTrackToCamp(track)}
                >
                  <Text style={styles.actionText}>Export to Camp</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.actionButton, styles.deleteButton]}
                  onPress={() => {
                    Alert.alert('Delete Track', `Delete "${track.name}"?`, [
                      { text: 'Cancel', style: 'cancel' },
                      { text: 'Delete', style: 'destructive', onPress: () => deleteTrack(track.id) },
                    ]);
                  }}
                >
                  <Text style={[styles.actionText, styles.deleteText]}>Delete</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 60,
    width: 270,
    backgroundColor: Colors.surfaceElevated,
    borderRightWidth: 1,
    borderRightColor: Colors.mud,
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 2, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 14,
    borderBottomWidth: 1,
    borderBottomColor: Colors.mud,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.tan,
  },
  headerButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  newButton: {
    backgroundColor: Colors.moss,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
  },
  newButtonText: {
    color: Colors.textOnAccent,
    fontSize: 11,
    fontWeight: '700',
  },
  closeButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: Colors.clay,
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeText: {
    color: Colors.textPrimary,
    fontSize: 12,
    fontWeight: '700',
  },
  content: {
    flex: 1,
    padding: 10,
  },

  // Empty state
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
    paddingHorizontal: 16,
  },
  emptyEmoji: { fontSize: 36, marginBottom: 12 },
  emptyTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginBottom: 6,
  },
  emptySubtitle: {
    fontSize: 12,
    color: Colors.textMuted,
    textAlign: 'center',
    lineHeight: 18,
  },

  // Plan card
  planCard: {
    backgroundColor: Colors.surface,
    borderRadius: 10,
    marginBottom: 8,
    overflow: 'hidden',
  },
  planRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
  },
  visToggle: {
    marginRight: 8,
  },
  eyeIcon: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  eyeText: {
    fontSize: 12,
  },
  planInfo: {
    flex: 1,
  },
  planName: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  planNameHidden: {
    opacity: 0.4,
  },
  planMeta: {
    fontSize: 10,
    color: Colors.textMuted,
    marginTop: 1,
  },
  chevron: {
    fontSize: 10,
    color: Colors.textMuted,
    marginLeft: 4,
  },

  // Expanded section
  expandedSection: {
    paddingHorizontal: 10,
    paddingBottom: 10,
    borderTopWidth: 1,
    borderTopColor: Colors.mud,
    marginTop: 2,
  },
  annotationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
    gap: 6,
  },
  annotationIcon: {
    fontSize: 14,
    width: 22,
    textAlign: 'center',
  },
  annotationLabel: {
    fontSize: 11,
    color: Colors.textSecondary,
    flex: 1,
  },
  noAnnotations: {
    fontSize: 11,
    color: Colors.textMuted,
    fontStyle: 'italic',
    paddingVertical: 8,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 6,
    marginTop: 8,
  },
  actionButton: {
    backgroundColor: Colors.forestDark,
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: Colors.mud,
  },
  actionText: {
    fontSize: 10,
    fontWeight: '600',
    color: Colors.sage,
  },
  deleteButton: {
    borderColor: Colors.rust,
  },
  deleteText: {
    color: Colors.rust,
  },
  planNotes: {
    fontSize: 10,
    color: Colors.textMuted,
    fontStyle: 'italic',
    marginTop: 6,
  },

  // ── Saved Tracks section ──
  sectionDivider: {
    marginTop: 16,
    marginBottom: 8,
    borderTopWidth: 1,
    borderTopColor: Colors.mud,
    paddingTop: 12,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.tan,
    marginBottom: 4,
  },
  emptyTrackState: {
    paddingVertical: 12,
    paddingHorizontal: 4,
  },
  emptyTrackText: {
    fontSize: 11,
    color: Colors.textMuted,
    fontStyle: 'italic',
    lineHeight: 16,
  },
  trackCard: {
    backgroundColor: Colors.surface,
    borderRadius: 10,
    marginBottom: 8,
    padding: 10,
    borderLeftWidth: 3,
    borderLeftColor: '#FF4444',
  },
  trackActions: {
    flexDirection: 'row',
    gap: 6,
    marginTop: 8,
  },
});
