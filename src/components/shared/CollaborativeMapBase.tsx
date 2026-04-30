/**
 * CollaborativeMapBase — Shared component for collaborative maps.
 * Extracted from DeerCampScreen, HoneyHoleScreen, and GroupCampScreen.
 *
 * Handles:
 * - Mapbox map view with GeoJSON layer rendering (waypoints, routes, areas, tracks, photos)
 * - Header bar (back, title, share button)
 * - Toolbar with configurable buttons
 * - Bottom panels (activity feed, members list)
 * - Mode hint overlay (when in add mode)
 * - Camera ref forwarding for programmatic control
 *
 * Props:
 * - campName, members, activityFeed, geoJsonLayers
 * - centerPoint, zoomLevel
 * - bottomPanel, isAdmin, showAddModeHint, addModeHintText
 * - toolbarButtons, onMapPress, onExitMap, onShare, onToolbarPress, onBottomPanelChange
 * - cameraRef, mapRef
 * - optional: renderCustomPanel, onStartEditTitle, onConfirmEditTitle, onCancelEditTitle
 */

import React, { forwardRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
} from 'react-native';
import MapboxGL from '@rnmapbox/maps';
import Colors from '../../theme/colors';
import Config from '../../config';
import {
  CollaborativeMapBaseProps,
  ToolbarButtonConfig,
} from '../../types/collaborativeMap';

MapboxGL.setAccessToken(Config.MAPBOX_ACCESS_TOKEN);

export const CollaborativeMapBase = forwardRef<any, CollaborativeMapBaseProps>(
  (props, ref) => {
    const {
      campName,
      members,
      activityFeed,
      geoJsonLayers,
      centerPoint,
      zoomLevel,
      bottomPanel,
      isAdmin,
      showAddModeHint = false,
      addModeHintText = '',
      isEditingTitle = false,
      editTitleValue = '',
      toolbarButtons,
      onMapPress,
      onExitMap,
      onShare,
      onToolbarPress,
      onBottomPanelChange,
      onStartEditTitle,
      onConfirmEditTitle,
      onCancelEditTitle,
      onRecenterMap,
      renderCustomPanel,
      cameraRef,
      mapRef,
    } = props;

    // ═══════════════════════════════════════════
    // ── MAP VIEW RENDER ──
    // ═══════════════════════════════════════════
    return (
      <View style={styles.container}>
        {/* ── Mapbox MapView ── */}
        <MapboxGL.MapView
          ref={mapRef}
          style={styles.map}
          styleURL="mapbox://styles/mapbox/outdoors-v12"
          onPress={onMapPress}
        >
          {/* 2026-04-26 (cross-cutting audit): switched from controlled
              `centerCoordinate=` to `defaultSettings`. Live prop reapplied
              the camera on every render and blocked drag/pan — same bug
              we fixed on Hunt MapScreen. */}
          <MapboxGL.Camera
            ref={cameraRef}
            defaultSettings={{
              centerCoordinate: [centerPoint.lng, centerPoint.lat],
              zoomLevel,
            }}
          />
          <MapboxGL.UserLocation visible={true} />

          {/* ── Area polygons ── */}
          {geoJsonLayers.areas && (
            <MapboxGL.ShapeSource id="mapAreas" shape={geoJsonLayers.areas}>
              <MapboxGL.FillLayer
                id="mapAreaFill"
                style={{
                  fillColor: ['get', 'color'],
                  fillOpacity: 0.2,
                }}
              />
              <MapboxGL.LineLayer
                id="mapAreaBorder"
                style={{
                  lineColor: ['get', 'color'],
                  lineWidth: 2,
                  lineDasharray: [3, 2],
                }}
              />
            </MapboxGL.ShapeSource>
          )}

          {/* ── Route polylines ── */}
          {geoJsonLayers.routes && (
            <MapboxGL.ShapeSource id="mapRoutes" shape={geoJsonLayers.routes}>
              <MapboxGL.LineLayer
                id="mapRouteLines"
                style={{
                  lineColor: ['get', 'color'],
                  lineWidth: 3,
                  lineOpacity: 0.85,
                }}
              />
            </MapboxGL.ShapeSource>
          )}

          {/* ── Track polylines ── */}
          {geoJsonLayers.tracks && (
            <MapboxGL.ShapeSource id="mapTracks" shape={geoJsonLayers.tracks}>
              <MapboxGL.LineLayer
                id="mapTrackLines"
                style={{
                  lineColor: ['get', 'color'],
                  lineWidth: 2.5,
                  lineOpacity: 0.75,
                  lineDasharray: [2, 1],
                }}
              />
            </MapboxGL.ShapeSource>
          )}

          {/* ── Waypoint markers ── */}
          {geoJsonLayers.waypoints && (
            <MapboxGL.ShapeSource id="mapWaypoints" shape={geoJsonLayers.waypoints}>
              <MapboxGL.CircleLayer
                id="mapWaypointOuter"
                style={{
                  circleRadius: 12,
                  circleColor: ['get', 'color'],
                  circleStrokeWidth: 2.5,
                  circleStrokeColor: Colors.mdWhite,
                }}
              />
              <MapboxGL.SymbolLayer
                id="mapWaypointLabels"
                style={{
                  textField: ['get', 'label'],
                  textSize: 10,
                  textColor: Colors.mdWhite,
                  textOffset: [0, 2],
                  textHaloColor: Colors.mdBlack,
                  textHaloWidth: 1,
                  textFont: ['DIN Pro Medium', 'Arial Unicode MS Regular'],
                }}
              />
            </MapboxGL.ShapeSource>
          )}

          {/* ── Photo pins ── */}
          {geoJsonLayers.photos && (
            <MapboxGL.ShapeSource id="mapPhotoPins" shape={geoJsonLayers.photos}>
              <MapboxGL.CircleLayer
                id="mapPhotoOuter"
                style={{
                  circleRadius: 9,
                  circleColor: Colors.mdGold,
                  circleStrokeWidth: 2,
                  circleStrokeColor: Colors.mdWhite,
                }}
              />
              <MapboxGL.SymbolLayer
                id="mapPhotoIcon"
                style={{
                  textField: '\uD83D\uDCF7',
                  textSize: 10,
                }}
              />
            </MapboxGL.ShapeSource>
          )}
        </MapboxGL.MapView>

        {/* ── Header bar ── */}
        <View style={styles.header}>
          <TouchableOpacity
            onPress={onExitMap}
            style={styles.backButton}
            accessibilityLabel="Back"
            accessibilityRole="button"
            accessibilityHint="Returns to camp list view"
          >
            <Text style={styles.backText}>{'\u2190'} Back</Text>
          </TouchableOpacity>

          {isEditingTitle && isAdmin ? (
            <View style={styles.titleEditRow}>
              <TextInput
                style={styles.titleEditInput}
                value={editTitleValue}
                onChangeText={(text) => {
                  // Let parent handle actual state — we just display the editing UI
                }}
                autoFocus
                maxLength={40}
                returnKeyType="done"
                onSubmitEditing={() => onConfirmEditTitle?.(editTitleValue)}
                onBlur={() => onCancelEditTitle?.()}
              />
            </View>
          ) : (
            <TouchableOpacity
              onLongPress={isAdmin ? onStartEditTitle : undefined}
              activeOpacity={isAdmin ? 0.6 : 1}
              style={styles.titleArea}
            >
              <Text style={styles.headerTitle} numberOfLines={1}>
                {campName} {isAdmin ? '\u270E' : ''}
              </Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={styles.shareButton}
            onPress={onShare}
            accessibilityLabel="Share"
            accessibilityRole="button"
            accessibilityHint="Share this camp with others"
          >
            <Text style={styles.shareButtonText}>Share</Text>
          </TouchableOpacity>
        </View>

        {/* ── Toolbar (right side, vertical stack) ── */}
        <View style={styles.toolbar}>
          {toolbarButtons.map((btn) => {
            if (btn.visible === false) return null;
            if (btn.adminOnly && !isAdmin) return null;

            const isActive = btn.active || bottomPanel === btn.id;
            return (
              <TouchableOpacity
                key={btn.id}
                style={[styles.toolbarBtn, isActive && styles.toolbarBtnActive]}
                onPress={() => onToolbarPress(btn.id)}
                accessibilityLabel={btn.label}
                accessibilityRole="button"
              >
                <Text style={styles.toolbarIcon}>{btn.emoji}</Text>
                {btn.badge !== undefined && btn.badge > 0 && (
                  <View style={styles.toolbarBadge}>
                    <Text style={styles.toolbarBadgeText}>
                      {btn.badge > 9 ? '9+' : btn.badge}
                    </Text>
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </View>

        {/* ── Add mode hint overlay ── */}
        {showAddModeHint && (
          <View style={styles.modeHint}>
            <Text style={styles.modeHintText}>{addModeHintText}</Text>
            <TouchableOpacity
              onPress={() => onToolbarPress('done')}
              accessibilityLabel="Done"
              accessibilityRole="button"
            >
              <Text style={styles.modeHintCancel}>Done</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* ── Bottom panels ── */}
        {bottomPanel === 'members' && (
          <MembersPanel
            members={members}
            isAdmin={isAdmin}
            onRemoveMember={(userId, username) => {
              // Parent screen handles this via its own state
            }}
          />
        )}

        {bottomPanel === 'feed' && (
          <ActivityFeedPanel activityFeed={activityFeed} />
        )}

        {bottomPanel !== 'none' && bottomPanel !== 'members' && bottomPanel !== 'feed' && renderCustomPanel && (
          <View style={styles.bottomPanel}>
            {renderCustomPanel(bottomPanel)}
          </View>
        )}
      </View>
    );
  }
);

CollaborativeMapBase.displayName = 'CollaborativeMapBase';

// ═══════════════════════════════════════════
// ── MEMBERS PANEL ──
// ═══════════════════════════════════════════

interface MembersPanelProps {
  members: any[];
  isAdmin: boolean;
  onRemoveMember: (userId: string, username: string) => void;
  onAddMember?: () => void;
}

const MembersPanel: React.FC<MembersPanelProps> = ({
  members,
  isAdmin,
  onRemoveMember,
  onAddMember,
}) => {
  const currentUserId = ''; // Parent screen provides this context
  return (
    <View style={styles.bottomPanel}>
      <View style={styles.bottomPanelHeader}>
        <Text style={styles.bottomPanelTitle}>Members ({members.length})</Text>
        {isAdmin && onAddMember && (
          <TouchableOpacity onPress={onAddMember}>
            <Text style={styles.addMemberText}>+ Add</Text>
          </TouchableOpacity>
        )}
      </View>
      <ScrollView style={styles.memberList}>
        {members.map((member) => (
          <View key={member.userId} style={styles.memberItem}>
            <View
              style={[
                styles.memberColorDot,
                { backgroundColor: member.color },
              ]}
            />
            <View style={styles.memberInfo}>
              <Text style={styles.memberName}>{member.username}</Text>
              <Text style={styles.memberRole}>{member.role}</Text>
            </View>
            {isAdmin && member.userId !== currentUserId && (
              <TouchableOpacity
                onPress={() => onRemoveMember(member.userId, member.username)}
              >
                <Text style={styles.memberRemoveBtn}>✕</Text>
              </TouchableOpacity>
            )}
          </View>
        ))}
      </ScrollView>
    </View>
  );
};

// ═══════════════════════════════════════════
// ── ACTIVITY FEED PANEL ──
// ═══════════════════════════════════════════

interface ActivityFeedPanelProps {
  activityFeed: any[];
}

const ActivityFeedPanel: React.FC<ActivityFeedPanelProps> = ({ activityFeed }) => {
  return (
    <View style={styles.bottomPanel}>
      <Text style={styles.bottomPanelTitle}>Activity Feed</Text>
      <ScrollView style={styles.feedList}>
        {activityFeed.length === 0 ? (
          <Text style={styles.emptyFeedText}>No activity yet</Text>
        ) : (
          activityFeed.slice(0, 20).map((item) => (
            <View key={item.id} style={styles.feedItem}>
              <View style={styles.feedMember}>
                <Text style={styles.feedUsername}>{item.username}</Text>
                <Text style={styles.feedAction}>{item.action}</Text>
              </View>
              <Text style={styles.feedTime}>
                {new Date(item.timestamp).toLocaleTimeString()}
              </Text>
            </View>
          ))
        )}
      </ScrollView>
    </View>
  );
};

// ═══════════════════════════════════════════
// ── STYLES ──
// ═══════════════════════════════════════════

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  map: {
    flex: 1,
  },

  // ── Header ──
  header: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.overlay,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: Colors.mud,
  },
  backButton: {
    marginRight: 12,
  },
  backText: {
    fontSize: 14,
    color: Colors.tan,
    fontWeight: '600',
  },
  titleArea: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  titleEditRow: {
    flex: 1,
  },
  titleEditInput: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.textPrimary,
    backgroundColor: Colors.surface,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: Colors.mud,
  },
  shareButton: {
    backgroundColor: Colors.moss,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
  },
  shareButtonText: {
    color: Colors.textOnAccent,
    fontSize: 11,
    fontWeight: '700',
  },

  // ── Toolbar ──
  toolbar: {
    position: 'absolute',
    bottom: 80,
    right: 12,
    flexDirection: 'column',
    gap: 8,
  },
  toolbarBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Colors.overlay,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.mud,
  },
  toolbarBtnActive: {
    backgroundColor: Colors.moss,
    borderColor: Colors.moss,
  },
  toolbarIcon: {
    fontSize: 20,
  },
  toolbarBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: Colors.mdRed,
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  toolbarBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: Colors.textOnAccent,
  },

  // ── Mode hint overlay ──
  modeHint: {
    position: 'absolute',
    top: 60,
    left: 16,
    right: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: Colors.moss,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 8,
  },
  modeHintText: {
    flex: 1,
    fontSize: 12,
    fontWeight: '600',
    color: Colors.textOnAccent,
  },
  modeHintCancel: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.textOnAccent,
    marginLeft: 8,
  },

  // ── Bottom panel ──
  bottomPanel: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    maxHeight: '40%',
    backgroundColor: Colors.surface,
    borderTopWidth: 1,
    borderTopColor: Colors.mud,
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
  },
  bottomPanelHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: Colors.mud,
  },
  bottomPanelTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  addMemberText: {
    fontSize: 12,
    color: Colors.moss,
    fontWeight: '600',
  },

  // ── Member list ──
  memberList: {
    flex: 1,
    paddingHorizontal: 12,
  },
  memberItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: Colors.mud,
  },
  memberColorDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 10,
  },
  memberInfo: {
    flex: 1,
  },
  memberName: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  memberRole: {
    fontSize: 11,
    color: Colors.textMuted,
    marginTop: 2,
  },
  memberRemoveBtn: {
    fontSize: 16,
    color: Colors.mdRed,
    fontWeight: '700',
  },

  // ── Activity feed ──
  feedList: {
    flex: 1,
    paddingHorizontal: 12,
  },
  feedItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: Colors.mud,
  },
  feedMember: {
    flex: 1,
  },
  feedUsername: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  feedAction: {
    fontSize: 11,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  feedTime: {
    fontSize: 10,
    color: Colors.textMuted,
  },
  emptyFeedText: {
    fontSize: 12,
    color: Colors.textMuted,
    textAlign: 'center',
    marginTop: 20,
  },
});
