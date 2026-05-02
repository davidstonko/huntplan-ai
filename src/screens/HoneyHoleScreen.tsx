/**
 * HoneyHoleScreen — Collaborative fishing/boating/crabbing shared maps.
 *
 * Similar to DeerCampScreen but for water-based activities:
 * - Create a "Honey Hole" with a fixed viewport (user zooms to a body of water)
 * - Add specialized annotations: water features, structure, navigation, fishing intel, catch photos, bait/depth
 * - Share with friends, fishing buddies, yacht clubs, fly shops, guide services
 * - Chat integration (same CampChat component)
 * - Monetization: 10 free members, $5/25 paid blocks, chat toggle for 10+
 *
 * Refactored (Phase 5C): Uses CollaborativeMapBase for shared map UI.
 */

import React, { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
  Pressable,
  Alert,
  Dimensions,
} from 'react-native';
import MapboxGL from '@rnmapbox/maps';
import { useDeerCamp } from '../context/DeerCampContext';
import { useLocation } from '../hooks/useLocation';
import FishWaypointPicker, { FishWaypointPickerResult } from '../components/fish/FishWaypointPicker';
import ActivityDisclaimer from '../components/common/ActivityDisclaimer';
import Colors from '../theme/colors';
import Config, { MAPBOX_ACCESS_TOKEN } from '../config';
import ZoomIcon from '../components/map/ZoomIcon';
import { shareCampInvite as shareInviteLink } from '../services/deepLinkService';
import {
  DeerCamp,
  SharedAnnotation,
  CampPhoto,
  CampType,
  canAddMember,
  isChatAvailable,
  isModerator,
  roleDisplayLabel,
  MODERATOR_BADGE,
  FREE_TIER_MEMBER_LIMIT,
  PAID_TIER_PRICE_USD,
  PAID_TIER_BLOCK_SIZE,
  WaterFeatureType,
  WATER_FEATURE_LABELS,
  WATER_FEATURE_ICONS,
  StructureType,
  STRUCTURE_LABELS,
  STRUCTURE_ICONS,
  NavigationType,
  NAVIGATION_LABELS,
  NAVIGATION_ICONS,
  FishingIntelType,
  FISHING_INTEL_LABELS,
  FISHING_INTEL_ICONS,
  WaterFeaturePin,
  StructurePin,
  NavigationPin,
  FishingIntelPin,
  CatchPhotoPin,
  BaitDepthPin,
  MEMBER_COLORS,
} from '../types/deercamp';
import CampChat from '../components/deer-camp/CampChat';
import {
  ViewMode,
  BottomPanel,
  ToolbarButtonConfig,
  AnnotationGeoJSON,
} from '../types/collaborativeMap';
import { CollaborativeMapBase } from '../components/shared/CollaborativeMapBase';

MapboxGL.setAccessToken(Config.MAPBOX_ACCESS_TOKEN);

type CreateViewMode = 'list' | 'map' | 'create';
type AddPinType = 'water_feature' | 'structure' | 'navigation' | 'fishing_intel' | 'catch_photo' | 'bait_depth' | null;

// ── Pin type config for the tool palette ──
const PIN_CATEGORIES = [
  {
    type: 'water_feature' as AddPinType,
    label: 'Water',
    emoji: '\uD83C\uDF0A',
    color: '#1565C0',
    subtypes: Object.entries(WATER_FEATURE_LABELS).map(([k, v]) => ({
      key: k as WaterFeatureType,
      label: v,
      icon: WATER_FEATURE_ICONS[k as WaterFeatureType],
    })),
  },
  {
    type: 'structure' as AddPinType,
    label: 'Structure',
    emoji: '\uD83E\uDEB5',
    color: '#795548',
    subtypes: Object.entries(STRUCTURE_LABELS).map(([k, v]) => ({
      key: k as StructureType,
      label: v,
      icon: STRUCTURE_ICONS[k as StructureType],
    })),
  },
  {
    type: 'navigation' as AddPinType,
    label: 'Nav',
    emoji: '\u2693',
    color: '#37474F',
    subtypes: Object.entries(NAVIGATION_LABELS).map(([k, v]) => ({
      key: k as NavigationType,
      label: v,
      icon: NAVIGATION_ICONS[k as NavigationType],
    })),
  },
  {
    type: 'fishing_intel' as AddPinType,
    label: 'Intel',
    emoji: '\u2B50',
    color: '#FF8F00',
    subtypes: Object.entries(FISHING_INTEL_LABELS).map(([k, v]) => ({
      key: k as FishingIntelType,
      label: v,
      icon: FISHING_INTEL_ICONS[k as FishingIntelType],
    })),
  },
  {
    type: 'catch_photo' as AddPinType,
    label: 'Catch',
    emoji: '\uD83C\uDFA3',
    color: Colors.success,
    subtypes: [],
  },
  {
    type: 'bait_depth' as AddPinType,
    label: 'Bait',
    emoji: '\uD83E\uDEB1',
    color: '#6A1B9A',
    subtypes: [],
  },
];

export default function HoneyHoleScreen() {
  const ctx = useDeerCamp();
  const {
    camps, createCamp, deleteCamp, renameCamp, addMember, removeMember,
    addAnnotation, removeAnnotation, removePhoto, addPhoto, currentUserId, currentUsername,
    ensureCampInviteCode,
  } = ctx;
  // 2026-04-26 (fork merge): Honey Hole uses A-era context methods that aren't
  // present on V2.3 DeerCampContextType. Cast through `any` and fall back to
  // no-ops so this orphan screen typechecks until it's wired into the navigator.
  const ctxAny = ctx as unknown as Record<string, ((...args: any[]) => void) | undefined>;
  const upgradeTier: (campId: string) => void = ctxAny.upgradeTier ?? (() => {});
  const toggleChat: (campId: string) => void = ctxAny.toggleChat ?? (() => {});
  // 2026-04-27: Wire share-link to the real deepLinkService.shareCampInvite
  // so Honey Hole reaches parity with Deer Camp's "Share Link via Messages"
  // flow. Honey Holes are persisted as DeerCamp records under the hood, so
  // they share the same inviteCode field. Recipient flow:
  //   1. Friend taps the link in Messages
  //   2. If app installed → deepLinkRouter opens HuntTabs > DeerCampTab
  //      with the inviteCode (works for both deer + honey hole codes)
  //   3. If not installed → App Store fallback
  const shareCampInvite = useCallback(
    (holeId: string) => {
      const hole = camps.find((c) => c.id === holeId);
      if (!hole) return;
      // 2026-04-28: prefer the eagerly-set inviteCode (new spots); for
      // spots created before eager-generation landed, lazily generate +
      // persist via ensureCampInviteCode. Mirrors the Deer Camp fix.
      const code = hole.inviteCode || ensureCampInviteCode(holeId);
      if (!code) {
        Alert.alert(
          'Share Link Unavailable',
          'Could not generate a share link for this Honey Hole. Use the username invite instead.',
        );
        return;
      }
      // Defer to next tick so the invite modal has time to dismiss before
      // the iOS share sheet opens — avoids the same UIKit modal-stack
      // race we hit in Deer Camp.
      setTimeout(() => {
        shareInviteLink(hole.name, code).catch(() => {});
      }, 250);
    },
    [camps, ensureCampInviteCode],
  );

  const { location } = useLocation();

  // Filter only honey holes
  const honeyHoles = useMemo(() => camps.filter((c) => c.campType === 'honey_hole'), [camps]);

  // ── View state ──
  const [viewMode, setViewMode] = useState<CreateViewMode>('list');
  const [selectedHoleId, setSelectedHoleId] = useState<string | null>(null);
  const [bottomPanel, setBottomPanel] = useState<BottomPanel>('none');
  const [chatUnreadCount, setChatUnreadCount] = useState(0);

  // ── Create flow state ──
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newHoleName, setNewHoleName] = useState('');
  // 2026-04-26: track current zoom for incremental +/- buttons (mirrors
  // CampAreaPicker pattern); add address search state for the create view.
  const [createZoom, setCreateZoom] = useState(12);
  const [createSearchQuery, setCreateSearchQuery] = useState('');
  const [createSearching, setCreateSearching] = useState(false);

  const handleCreateAddressSearch = useCallback(async () => {
    const q = createSearchQuery.trim();
    if (!q) return;
    setCreateSearching(true);
    try {
      const url =
        'https://api.mapbox.com/geocoding/v5/mapbox.places/' +
        encodeURIComponent(q) +
        '.json?limit=1&country=US&proximity=-76.6,39.0&access_token=' +
        MAPBOX_ACCESS_TOKEN;
      const res = await fetch(url);
      const json = await res.json();
      const feature = json?.features?.[0];
      if (feature?.center && Array.isArray(feature.center)) {
        const [lng, lat] = feature.center;
        cameraRef.current?.setCamera({
          centerCoordinate: [lng, lat],
          zoomLevel: 12,
          animationDuration: 600,
        });
        setCreateZoom(12);
      } else {
        Alert.alert('Not found', `Couldn't find a place matching "${q}".`);
      }
    } catch {
      Alert.alert('Search failed', 'Check your network connection.');
    } finally {
      setCreateSearching(false);
    }
  }, [createSearchQuery]);
  const [createStep, setCreateStep] = useState<'name' | 'viewport'>('name');

  // ── Map state ──
  const [addPinType, setAddPinType] = useState<AddPinType>(null);
  const [selectedSubtype, setSelectedSubtype] = useState<string>('');
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteUsername, setInviteUsername] = useState('');
  const [showToolPalette, setShowToolPalette] = useState(false);
  const [showSubtypePicker, setShowSubtypePicker] = useState(false);
  const [showFishWaypointPicker, setShowFishWaypointPicker] = useState(false);
  const [pendingFishWaypointResult, setPendingFishWaypointResult] = useState<FishWaypointPickerResult | null>(null);

  // ── Moderator features ──
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [editTitleValue, setEditTitleValue] = useState('');
  const [showManageAnnotations, setShowManageAnnotations] = useState(false);

  const cameraRef = useRef<MapboxGL.Camera>(null);
  const mapRef = useRef<MapboxGL.MapView>(null);
  const selectedHole = honeyHoles.find((c) => c.id === selectedHoleId);

  // ── Handlers ──
  const handleStartCreate = () => {
    setCreateStep('name');
    setShowCreateModal(true);
  };

  const handleNameConfirm = () => {
    if (!newHoleName.trim()) {
      Alert.alert('Name Required', 'Give your Honey Hole a name.');
      return;
    }
    setCreateStep('viewport');
    setShowCreateModal(false);
    setViewMode('create');
  };

  const handleViewportConfirm = async () => {
    // Get current map bounds as the fixed viewport
    const center = location
      ? { lat: location.latitude, lng: location.longitude }
      : { lat: 38.9, lng: -76.5 }; // Default: Chesapeake Bay area

    // 2026-04-26 (fork merge): V2.3 createCamp takes (name, area, linkedLandId).
    // Build a tiny default area around `center` (~0.5 sq mi) for compat.
    const halfDeg = 0.005;
    const area = {
      north: center.lat + halfDeg,
      south: center.lat - halfDeg,
      east: center.lng + halfDeg,
      west: center.lng - halfDeg,
      areaSqMi: 0.5,
    };
    const newHole = createCamp(newHoleName.trim(), area, undefined);

    setNewHoleName('');
    setSelectedHoleId(newHole.id);
    setViewMode('map');
  };

  const handleDeleteHole = (hole: DeerCamp) => {
    Alert.alert(
      'Delete Honey Hole',
      `Delete "${hole.name}" and all its data? This cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: () => { deleteCamp(hole.id); setSelectedHoleId(null); setViewMode('list'); } },
      ]
    );
  };

  const enterHole = (holeId: string) => {
    setSelectedHoleId(holeId);
    setViewMode('map');
    setBottomPanel('none');
    setAddPinType(null);
  };

  const exitHole = () => {
    setViewMode('list');
    setSelectedHoleId(null);
    setBottomPanel('none');
    setAddPinType(null);
  };

  const handleInviteMember = () => {
    if (!inviteUsername.trim() || !selectedHoleId) return;
    const hole = honeyHoles.find((h) => h.id === selectedHoleId);
    if (hole) {
      const check = canAddMember(hole);
      if (!check.canAdd) {
        Alert.alert(
          'Member Limit Reached',
          `Adding ${PAID_TIER_BLOCK_SIZE} member slots will cost $${PAID_TIER_PRICE_USD} when payments are enabled. For now, enjoy the expanded capacity free during our beta!`,
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Unlock Free (Beta)', onPress: () => upgradeTier(selectedHoleId) },
          ]
        );
        return;
      }
    }
    addMember(selectedHoleId, inviteUsername.trim());
    setInviteUsername('');
    setShowInviteModal(false);
  };

  // ── Map tap to add pin ──
  const handleMapPress = useCallback((event: any) => {
    if (!pendingFishWaypointResult || !selectedHoleId) return;
    const { geometry } = event;
    if (!geometry?.coordinates) return;
    const [lng, lat] = geometry.coordinates;

    let annotationData: any;
    const pinId = Date.now().toString(36) + Math.random().toString(36).substr(2, 6);
    const waypointType = pendingFishWaypointResult.type;

    // Map the FishWaypointType to one of the legacy pin types for annotation storage
    // For now, store them all as fishing_intel since the picker returns generic fish waypoint types
    const annotation: SharedAnnotation = {
      id: Date.now().toString(36) + Math.random().toString(36).substr(2, 9),
      type: 'fishing_intel',
      createdBy: currentUserId,
      createdAt: new Date().toISOString(),
      data: {
        id: pinId,
        lat, lng,
        intelType: waypointType as FishingIntelType,
        label: pendingFishWaypointResult.species || waypointType,
        notes: pendingFishWaypointResult.notes,
        depth: pendingFishWaypointResult.depthFt,
      } as FishingIntelPin,
    };

    addAnnotation(selectedHoleId, annotation);
    setPendingFishWaypointResult(null);
  }, [pendingFishWaypointResult, selectedHoleId, currentUserId, addAnnotation]);

  // ── GeoJSON for Honey Hole pins ──
  const holeGeoJSON = useMemo(() => {
    if (!selectedHole) return null;

    const features = selectedHole.annotations.map((a) => {
      const data = a.data as any;
      const member = selectedHole.members.find((m) => m.userId === a.createdBy);
      let color = member?.color || MEMBER_COLORS[0];
      let icon = '\uD83D\uDCCD';
      let label = 'Pin';

      // Determine icon and color based on annotation type
      switch (a.type) {
        case 'water_feature':
          color = '#1565C0';
          icon = WATER_FEATURE_ICONS[(data as WaterFeaturePin).featureType] || '\uD83C\uDF0A';
          label = (data as WaterFeaturePin).label || 'Water';
          break;
        case 'structure':
          color = '#795548';
          icon = STRUCTURE_ICONS[(data as StructurePin).structureType] || '\uD83E\uDEB5';
          label = (data as StructurePin).label || 'Structure';
          break;
        case 'navigation':
          color = '#37474F';
          icon = NAVIGATION_ICONS[(data as NavigationPin).navType] || '\u2693';
          label = (data as NavigationPin).label || 'Nav';
          break;
        case 'fishing_intel':
          color = '#FF8F00';
          icon = FISHING_INTEL_ICONS[(data as FishingIntelPin).intelType] || '\u2B50';
          label = (data as FishingIntelPin).label || 'Intel';
          break;
        case 'catch_photo':
          color = Colors.success;
          icon = '\uD83C\uDFA3';
          label = (data as CatchPhotoPin).species || 'Catch';
          break;
        case 'bait_depth':
          color = '#6A1B9A';
          icon = '\uD83E\uDEB1';
          label = (data as BaitDepthPin).bait || 'Bait';
          break;
        default:
          // Standard waypoint/route/area/track
          label = data.label || 'Pin';
      }

      return {
        type: 'Feature' as const,
        properties: {
          id: a.id,
          label,
          icon,
          color,
          username: member?.username || 'Unknown',
        },
        geometry: {
          type: 'Point' as const,
          coordinates: [data.lng || 0, data.lat || 0],
        },
      };
    }).filter((f) => f.geometry.coordinates[0] !== 0);

    return features.length > 0
      ? { type: 'FeatureCollection' as const, features } as any
      : null;
  }, [selectedHole]);

  // ═══════════════════════════════════════════
  // ── CREATE FLOW: Set Viewport ──
  // ═══════════════════════════════════════════
  if (viewMode === 'create') {
    return (
      <View style={styles.container}>
        <MapboxGL.MapView
          ref={mapRef}
          style={styles.map}
          styleURL="mapbox://styles/mapbox/outdoors-v12"
        >
          {/* 2026-04-26: defaultSettings + downtown Baltimore fallback
              (39.2904, -76.6122) — matches the Deer Camp pattern. User
              can pan/zoom freely + use address search to navigate. */}
          {/* 2026-05-02 (V2.4 audit, iter 16): inMaryland geofence
              before applying user GPS as initial center. Same fix as
              ScoutScreen and the map screens — without it, an out-of-
              state user (or iOS Simulator on a CA-based dev machine)
              opens to their own location instead of the MD picker
              cluster the screen exists to surface. */}
          <MapboxGL.Camera
            ref={cameraRef}
            defaultSettings={{
              centerCoordinate:
                location &&
                location.longitude >= -79.5 && location.longitude <= -74.9 &&
                location.latitude >= 37.8 && location.latitude <= 39.8
                  ? [location.longitude, location.latitude]
                  : [-76.6122, 39.2904],
              zoomLevel: 12,
            }}
          />
          <MapboxGL.UserLocation visible={true} />
        </MapboxGL.MapView>

        {/* 2026-04-26: Address search bar — Mapbox forward-geocode +
            recenter. Position: top of screen so it's accessible without
            obscuring the map content. */}
        <View style={honeyExtras.searchRow}>
          <TextInput
            style={honeyExtras.searchInput}
            placeholder="Search lake, river, or town"
            placeholderTextColor={Colors.textSecondary}
            value={createSearchQuery}
            onChangeText={setCreateSearchQuery}
            onSubmitEditing={handleCreateAddressSearch}
            returnKeyType="search"
            autoCorrect={false}
            autoCapitalize="words"
            editable={!createSearching}
          />
          <TouchableOpacity
            style={honeyExtras.searchBtn}
            onPress={handleCreateAddressSearch}
            disabled={createSearching || !createSearchQuery.trim()}
          >
            <Text style={honeyExtras.searchBtnText}>{createSearching ? '…' : 'Go'}</Text>
          </TouchableOpacity>
        </View>

        {/* 2026-04-26: Zoom +/- buttons. + on top of −. Anchored above
            the bottom create-overlay so they don't get covered. */}
        <View style={honeyExtras.zoomCol}>
          <TouchableOpacity
            style={honeyExtras.zoomBtn}
            onPress={() => {
              const next = Math.min(20, createZoom + 1);
              cameraRef.current?.zoomTo(next);
              setCreateZoom(next);
            }}
          >
            <ZoomIcon variant="plus" color={Colors.textPrimary} size={20} />
          </TouchableOpacity>
          <TouchableOpacity
            style={honeyExtras.zoomBtn}
            onPress={() => {
              const next = Math.max(3, createZoom - 1);
              cameraRef.current?.zoomTo(next);
              setCreateZoom(next);
            }}
          >
            <ZoomIcon variant="minus" color={Colors.textPrimary} size={20} />
          </TouchableOpacity>
        </View>

        <View style={styles.createOverlay}>
          <Text style={styles.createTitle}>Set Your Honey Hole</Text>
          <Text style={styles.createSubtitle}>
            Zoom and pan to frame the body of water, river section, or area you want to map.
            This becomes the fixed map for "{newHoleName}".
          </Text>
          <View style={styles.createActions}>
            <TouchableOpacity
              style={styles.createCancelBtn}
              onPress={() => { setViewMode('list'); setNewHoleName(''); }}
            >
              <Text style={styles.createCancelText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.createConfirmBtn}
              onPress={handleViewportConfirm}
            >
              <Text style={styles.createConfirmText}>Lock This View</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  }

  // ═══════════════════════════════════════════
  // ── HONEY HOLE MAP VIEW (using CollaborativeMapBase) ──
  // ═══════════════════════════════════════════
  if (viewMode === 'map' && selectedHole) {
    const isAdmin = selectedHole.members.find(m => m.userId === currentUserId)?.role === 'admin';
    const chatAvailable = isChatAvailable(selectedHole);
    const pinCount = selectedHole.annotations.length;

    // Build toolbar buttons for honey hole
    const toolbarButtons: ToolbarButtonConfig[] = [
      {
        id: 'tools',
        emoji: '📍',
        label: 'Add',
      },
      ...(chatAvailable ? [{
        id: 'chat' as const,
        emoji: '💬' as const,
        label: 'Chat' as const,
        badge: chatUnreadCount > 0 && bottomPanel !== 'chat' ? chatUnreadCount : undefined,
      }] : []),
      {
        id: 'members',
        emoji: '👥',
        label: 'Members',
      },
      {
        id: 'feed',
        emoji: '📨',
        label: 'Feed',
      },
      {
        id: 'manage',
        emoji: '⚙️',
        label: 'Manage',
        adminOnly: true,
      },
      {
        id: 'center',
        emoji: '⌖',
        label: 'Center',
      },
    ];

    const handleToolbarPress = (buttonId: string) => {
      switch (buttonId) {
        case 'tools':
          setShowFishWaypointPicker(true);
          break;
        case 'chat':
          setBottomPanel(bottomPanel === 'chat' ? 'none' : 'chat');
          if (bottomPanel !== 'chat') setChatUnreadCount(0);
          break;
        case 'members':
          setBottomPanel(bottomPanel === 'members' ? 'none' : 'members');
          break;
        case 'feed':
          setBottomPanel(bottomPanel === 'feed' ? 'none' : 'feed');
          break;
        case 'manage':
          setShowManageAnnotations(!showManageAnnotations);
          break;
        case 'center':
          if (location && cameraRef.current) {
            cameraRef.current.setCamera({
              centerCoordinate: [location.longitude, location.latitude],
              zoomLevel: 14,
              animationDuration: 500,
            });
          }
          break;
      }
    };

    return (
      <View style={styles.container}>
        <CollaborativeMapBase
          campName={selectedHole.name}
          members={selectedHole.members}
          activityFeed={selectedHole.activityFeed}
          geoJsonLayers={holeGeoJSON || { waypoints: null, routes: null, areas: null, tracks: null, photos: null }}
          centerPoint={selectedHole.centerPoint}
          zoomLevel={selectedHole.defaultZoom}
          bottomPanel={bottomPanel}
          isAdmin={isAdmin}
          showAddModeHint={!!addPinType}
          addModeHintText={addPinType ? `Tap to place: ${selectedSubtype ? (PIN_CATEGORIES.find(c => c.type === addPinType)?.subtypes.find(s => s.key === selectedSubtype)?.label || addPinType) : addPinType}` : ''}
          isEditingTitle={isEditingTitle}
          editTitleValue={editTitleValue}
          toolbarButtons={toolbarButtons}
          onMapPress={handleMapPress}
          onExitMap={exitHole}
          onShare={() => shareCampInvite(selectedHole.id)}
          onToolbarPress={handleToolbarPress}
          onBottomPanelChange={setBottomPanel}
          onStartEditTitle={() => {
            setEditTitleValue(selectedHole.name);
            setIsEditingTitle(true);
          }}
          onConfirmEditTitle={(newTitle) => {
            if (newTitle.trim()) {
              renameCamp(selectedHole.id, newTitle);
            }
            setIsEditingTitle(false);
          }}
          onCancelEditTitle={() => setIsEditingTitle(false)}
          cameraRef={cameraRef}
          renderCustomPanel={(panelId) => {
            if (panelId === 'tools') {
              return (
                <View style={styles.customToolPanel}>
                  <ScrollView style={styles.toolPaletteScroll}>
                    {PIN_CATEGORIES.map((category) => (
                      <TouchableOpacity
                        key={category.type}
                        style={[styles.toolCategoryBtn, addPinType === category.type && styles.toolCategoryBtnActive]}
                        onPress={() => {
                          if (addPinType === category.type) {
                            setAddPinType(null);
                            setSelectedSubtype('');
                          } else {
                            setAddPinType(category.type);
                            setSelectedSubtype(category.subtypes.length > 0 ? category.subtypes[0].key : '');
                          }
                        }}
                      >
                        <Text style={styles.toolCategoryEmoji}>{category.emoji}</Text>
                        <Text style={styles.toolCategoryLabel}>{category.label}</Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>
              );
            }
            if (panelId === 'chat' && selectedHoleId && chatAvailable) {
              return (
                <View style={styles.customPanelContent}>
                  <CampChat
                    campId={selectedHoleId}
                    currentUserId={currentUserId}
                    currentUsername={currentUsername}
                    visible={bottomPanel === 'chat'}
                    onUnreadCountChange={setChatUnreadCount}
                  />
                </View>
              );
            }
            if (panelId === 'members') {
              return (
                <View style={styles.customMembersPanel}>
                  <View style={styles.bottomPanelHeader}>
                    <Text style={styles.bottomPanelTitle}>Members ({selectedHole.members.length})</Text>
                    {isAdmin && (
                      <TouchableOpacity onPress={() => setShowInviteModal(true)}>
                        <Text style={styles.addMemberText}>+ Add</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                  <ScrollView style={styles.memberList}>
                    {selectedHole.members.map((m) => (
                      <View key={m.userId} style={styles.memberRow}>
                        <View style={[styles.memberAvatar, { backgroundColor: m.color }]}>
                          <Text style={styles.memberInitial}>{m.username.charAt(0).toUpperCase()}</Text>
                        </View>
                        <View style={styles.memberInfo}>
                          <Text style={styles.memberRowName}>
                            {m.role === 'admin' ? MODERATOR_BADGE + ' ' : ''}{m.username} {m.userId === currentUserId ? '(You)' : ''}
                          </Text>
                          <Text style={styles.memberRowMeta}>{roleDisplayLabel(m.role)}</Text>
                        </View>
                        {isAdmin && m.userId !== currentUserId && (
                          <TouchableOpacity
                            style={styles.removeMemberBtn}
                            onPress={() => {
                              if (m.userId !== currentUserId) {
                                Alert.alert('Remove Member', `Remove ${m.username} from this hole?`, [
                                  { text: 'Cancel', style: 'cancel' },
                                  { text: 'Remove', style: 'destructive', onPress: () => removeMember(selectedHole.id, m.userId) },
                                ]);
                              }
                            }}
                          >
                            <Text style={styles.removeMemberText}>{'\u2715'}</Text>
                          </TouchableOpacity>
                        )}
                      </View>
                    ))}
                  </ScrollView>
                </View>
              );
            }
            return null;
          }}
        />

        {/* ── Manage Annotations Modal (overlay on map) ── */}
        {showManageAnnotations && isAdmin && (
          <View style={styles.managePanel}>
            <View style={styles.panelHeader}>
              <Text style={styles.panelTitle}>{MODERATOR_BADGE} Manage Features</Text>
              <TouchableOpacity onPress={() => setShowManageAnnotations(false)}>
                <Text style={styles.panelClose}>{'\u2715'}</Text>
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.managePanelScroll}>
              {selectedHole.annotations.length === 0 && selectedHole.photos.length === 0 && (
                <Text style={styles.manageEmptyText}>No features to manage.</Text>
              )}
              {selectedHole.annotations.map((ann) => {
                const creator = selectedHole.members.find((m) => m.userId === ann.createdBy);
                const label = (ann.data as any).label || (ann.data as any).name || (ann.data as any).featureType || ann.type;
                return (
                  <View key={ann.id} style={styles.manageRow}>
                    <View style={styles.manageRowInfo}>
                      <Text style={styles.manageRowType}>{ann.type.replace(/_/g, ' ')}</Text>
                      <Text style={styles.manageRowLabel} numberOfLines={1}>{label}</Text>
                      <Text style={styles.manageRowCreator}>by {creator?.username || 'Unknown'}</Text>
                    </View>
                    <TouchableOpacity
                      style={styles.manageDeleteBtn}
                      onPress={() => {
                        Alert.alert(
                          'Remove Feature',
                          `Remove "${label}" (${ann.type.replace(/_/g, ' ')}) by ${creator?.username || 'Unknown'}?`,
                          [
                            { text: 'Cancel', style: 'cancel' },
                            {
                              text: 'Remove',
                              style: 'destructive',
                              onPress: () => removeAnnotation(selectedHole.id, ann.id),
                            },
                          ]
                        );
                      }}
                    >
                      <Text style={styles.manageDeleteText}>{'\uD83D\uDDD1'}</Text>
                    </TouchableOpacity>
                  </View>
                );
              })}
              {selectedHole.photos.map((photo) => {
                const creator = selectedHole.members.find((m) => m.userId === photo.uploadedBy);
                return (
                  <View key={photo.id} style={styles.manageRow}>
                    <View style={styles.manageRowInfo}>
                      <Text style={styles.manageRowType}>photo</Text>
                      <Text style={styles.manageRowLabel} numberOfLines={1}>{photo.caption || 'Photo'}</Text>
                      <Text style={styles.manageRowCreator}>by {creator?.username || 'Unknown'}</Text>
                    </View>
                    <TouchableOpacity
                      style={styles.manageDeleteBtn}
                      onPress={() => {
                        Alert.alert(
                          'Remove Photo',
                          `Remove photo by ${creator?.username || 'Unknown'}?`,
                          [
                            { text: 'Cancel', style: 'cancel' },
                            {
                              text: 'Remove',
                              style: 'destructive',
                              onPress: () => removePhoto(selectedHole.id, photo.id),
                            },
                          ]
                        );
                      }}
                    >
                      <Text style={styles.manageDeleteText}>{'\uD83D\uDDD1'}</Text>
                    </TouchableOpacity>
                  </View>
                );
              })}
            </ScrollView>
          </View>
        )}

        {/* ── Fish Waypoint Picker ── */}
        <FishWaypointPicker
          visible={showFishWaypointPicker}
          onConfirm={(result) => {
            setPendingFishWaypointResult(result);
            setShowFishWaypointPicker(false);
          }}
          onCancel={() => {
            setShowFishWaypointPicker(false);
            setPendingFishWaypointResult(null);
          }}
          linkedHoleId={selectedHoleId || undefined}
        />

        {/* ── Invite Modal ── */}
        <Modal visible={showInviteModal} transparent animationType="fade">
          <Pressable style={styles.modalOverlay} onPress={() => setShowInviteModal(false)}>
            <Pressable style={styles.modalContent} onPress={(e) => e.stopPropagation()}>
              <Text style={styles.modalTitle}>Invite to Honey Hole</Text>
              {selectedHoleId && (
                <TouchableOpacity
                  style={styles.shareLinkBtn}
                  onPress={() => {
                    setShowInviteModal(false);
                    shareCampInvite(selectedHoleId);
                  }}
                >
                  <Text style={styles.shareLinkText}>{'\uD83D\uDD17'} Share Invite Link</Text>
                </TouchableOpacity>
              )}
              <TextInput
                style={styles.modalInput}
                placeholder="Username"
                placeholderTextColor={Colors.textMuted}
                value={inviteUsername}
                onChangeText={setInviteUsername}
              />
              <View style={styles.modalButtons}>
                <TouchableOpacity style={styles.modalCancelBtn} onPress={() => setShowInviteModal(false)}>
                  <Text style={styles.modalCancelText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.modalCreateBtn} onPress={handleInviteMember}>
                  <Text style={styles.modalCreateText}>Add</Text>
                </TouchableOpacity>
              </View>
            </Pressable>
          </Pressable>
        </Modal>
      </View>
    );
  }

  // ═══════════════════════════════════════════
  // ── HONEY HOLE LIST VIEW ──
  // ═══════════════════════════════════════════
  return (
    <View style={styles.container}>
      <ScrollView style={styles.listContent} contentContainerStyle={styles.listContentContainer}>
        <View style={styles.listHeader}>
          <Text style={styles.listEmoji}>{'\uD83C\uDFA3'}</Text>
          <Text style={styles.listTitle}>Honey Holes</Text>
          <Text style={styles.listSubtitle}>
            Map your secret fishing spots, share with your crew, and mark every detail — structure, depth, bait, catches.
          </Text>
        </View>

        {honeyHoles.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyEmoji}>{'\uD83D\uDDFA\uFE0F'}</Text>
            <Text style={styles.emptyTitle}>No Honey Holes Yet</Text>
            <Text style={styles.emptySubtitle}>
              Create one by zooming to a body of water, then start mapping features like channels, structure, and hot spots.
            </Text>
            <TouchableOpacity style={styles.emptyCreateBtn} onPress={handleStartCreate}>
              <Text style={styles.emptyCreateText}>Create Your First Honey Hole</Text>
            </TouchableOpacity>
          </View>
        ) : (
          honeyHoles.map((hole) => {
            const pinCount = hole.annotations.length;
            return (
              <TouchableOpacity
                key={hole.id}
                style={styles.holeCard}
                onPress={() => enterHole(hole.id)}
                onLongPress={() => handleDeleteHole(hole)}
              >
                <Text style={styles.holeCardEmoji}>{'\uD83C\uDFA3'}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={styles.holeCardName}>{hole.name}</Text>
                  <Text style={styles.holeCardMeta}>
                    {hole.members.length} members · {pinCount} pins
                    {hole.tier?.status === 'paid' ? ' · \u2B50 Premium' : ''}
                  </Text>
                </View>
                <Text style={styles.holeCardArrow}>{'\u276F'}</Text>
              </TouchableOpacity>
            );
          })
        )}

        <TouchableOpacity style={styles.createBtn} onPress={handleStartCreate}>
          <Text style={styles.createBtnText}>+ New Honey Hole</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* ── Create Name Modal ── */}
      <Modal visible={showCreateModal} transparent animationType="fade">
        <Pressable style={styles.modalOverlay} onPress={() => setShowCreateModal(false)}>
          <Pressable style={styles.modalContent} onPress={(e) => e.stopPropagation()}>
            <Text style={styles.modalTitle}>{'\uD83C\uDFA3'} New Honey Hole</Text>
            <Text style={styles.modalSubtitle}>
              Name your spot, then you'll zoom to the body of water to set the map area.
            </Text>
            <TextInput
              style={styles.modalInput}
              placeholder='e.g., "Chesapeake Striper Grounds"'
              placeholderTextColor={Colors.textMuted}
              value={newHoleName}
              onChangeText={setNewHoleName}
              autoFocus
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity style={styles.modalCancelBtn} onPress={() => setShowCreateModal(false)}>
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalCreateBtn} onPress={handleNameConfirm}>
                <Text style={styles.modalCreateText}>Next</Text>
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      {/* Persistent disclaimer footer */}
      <ActivityDisclaimer mode="fish" />
    </View>
  );
}

// ── Styles ──────────────────────────────────────────────────────

// 2026-04-26: Honey Hole create-view extras (search row + zoom column).
// Kept in their own object so they don't bloat the main StyleSheet.
const honeyExtras = StyleSheet.create({
  searchRow: {
    position: 'absolute',
    top: 60,
    left: 16,
    right: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: Colors.overlay,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: Colors.mud,
    elevation: 4,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: Colors.textPrimary,
    paddingVertical: 6,
  },
  searchBtn: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    backgroundColor: Colors.moss,
    borderRadius: 8,
  },
  searchBtnText: {
    color: Colors.textOnAccent,
    fontWeight: '700',
    fontSize: 13,
  },
  zoomCol: {
    position: 'absolute',
    right: 12,
    bottom: 200, // above the createOverlay panel (which has a few hundred px of buttons)
    flexDirection: 'column',
    gap: 8,
  },
  zoomBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.overlay,
    borderWidth: 1,
    borderColor: Colors.mud,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 4,
  },
});

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  map: { flex: 1 },

  // ── Create flow ──
  createOverlay: {
    position: 'absolute', bottom: 40, left: 16, right: 16,
    backgroundColor: Colors.surfaceElevated,
    borderRadius: 16, padding: 20,
    shadowColor: Colors.shadow, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 8,
  },
  createTitle: { fontSize: 18, fontWeight: '700', color: Colors.tan, marginBottom: 6 },
  createSubtitle: { fontSize: 13, color: Colors.textSecondary, lineHeight: 18, marginBottom: 16 },
  createActions: { flexDirection: 'row', gap: 10 },
  createCancelBtn: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 10, backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.mud },
  createCancelText: { fontSize: 14, fontWeight: '600', color: Colors.textMuted },
  createConfirmBtn: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 10, backgroundColor: Colors.water },
  createConfirmText: { fontSize: 14, fontWeight: '700', color: Colors.textOnAccent },

  // ── List view ──
  listContent: { flex: 1 },
  listContentContainer: { padding: 16, paddingBottom: 80 },
  listHeader: { alignItems: 'center', marginBottom: 20 },
  listEmoji: { fontSize: 40, marginBottom: 8 },
  listTitle: { fontSize: 22, fontWeight: '700', color: Colors.textPrimary },
  listSubtitle: { fontSize: 13, color: Colors.textSecondary, textAlign: 'center', marginTop: 6, lineHeight: 18, paddingHorizontal: 12 },

  emptyState: { alignItems: 'center', paddingVertical: 30 },
  emptyEmoji: { fontSize: 48, marginBottom: 12 },
  emptyTitle: { fontSize: 16, fontWeight: '700', color: Colors.water, marginBottom: 6 },
  emptySubtitle: { fontSize: 12, color: Colors.textMuted, textAlign: 'center', lineHeight: 17, paddingHorizontal: 20 },
  emptyCreateBtn: { marginTop: 16, backgroundColor: Colors.water, borderRadius: 10, paddingVertical: 12, paddingHorizontal: 24 },
  emptyCreateText: { fontSize: 15, fontWeight: '700', color: Colors.textOnAccent },

  holeCard: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: Colors.surface, borderRadius: 12, padding: 14, marginBottom: 8, gap: 10,
    borderWidth: 1, borderColor: Colors.mud,
  },
  holeCardEmoji: { fontSize: 24 },
  holeCardName: { fontSize: 15, fontWeight: '700', color: Colors.textPrimary },
  holeCardMeta: { fontSize: 11, color: Colors.textSecondary, marginTop: 2 },
  holeCardArrow: { fontSize: 16, color: Colors.textMuted },

  createBtn: { backgroundColor: Colors.water, borderRadius: 10, paddingVertical: 12, alignItems: 'center', marginTop: 12 },
  createBtnText: { fontSize: 15, fontWeight: '700', color: Colors.textOnAccent },

  // ── Map view header ──
  holeHeader: {
    position: 'absolute', top: 50, left: 0, right: 0,
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: Colors.overlay, paddingHorizontal: 12, paddingVertical: 8, gap: 8,
  },
  holeHeaderTitle: { fontSize: 15, fontWeight: '700', color: Colors.textPrimary },
  titleEditInput: {
    fontSize: 15, fontWeight: '700', color: Colors.textPrimary,
    borderBottomWidth: 1, borderBottomColor: Colors.mdGold, paddingVertical: 2,
  },
  holeHeaderMeta: { fontSize: 10, color: Colors.textSecondary },
  backButton: { paddingVertical: 4, paddingHorizontal: 8 },
  backText: { fontSize: 14, fontWeight: '600', color: Colors.waterLight },
  inviteButton: { backgroundColor: Colors.water, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 5 },
  inviteButtonText: { fontSize: 12, fontWeight: '700', color: Colors.textOnAccent },

  // ── Mode hint ──
  modeHint: {
    position: 'absolute', top: 100, left: 16, right: 16,
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    backgroundColor: Colors.water, borderRadius: 8, paddingHorizontal: 14, paddingVertical: 8,
  },
  modeHintText: { fontSize: 13, color: Colors.textOnAccent, fontWeight: '600' },
  modeHintCancel: { fontSize: 13, color: Colors.mdGold, fontWeight: '700' },

  // ── Toolbar ──
  toolbar: {
    position: 'absolute', right: 8, top: 110,
    backgroundColor: Colors.overlay, borderRadius: 12, paddingVertical: 4, gap: 2,
  },
  toolBtn: { alignItems: 'center', paddingVertical: 6, paddingHorizontal: 10, borderRadius: 8 },
  toolBtnActive: { backgroundColor: Colors.forestDark },
  toolEmoji: { fontSize: 18 },
  toolLabel: { fontSize: 8, color: Colors.textSecondary, fontWeight: '700', marginTop: 1 },
  toolCrosshair: { fontSize: 22, color: Colors.textPrimary, fontWeight: '700' },
  unreadBadge: {
    position: 'absolute', top: 0, right: 2,
    minWidth: 16, height: 16, borderRadius: 8,
    backgroundColor: Colors.mdRed, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 4,
  },
  unreadBadgeText: { fontSize: 9, fontWeight: '800', color: Colors.textOnAccent },

  // ── Member bar ──
  memberBar: {
    position: 'absolute', bottom: 16, left: 12,
    flexDirection: 'row', gap: 6, flexWrap: 'wrap',
  },
  memberChip: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: Colors.overlay, borderRadius: 12, paddingHorizontal: 8, paddingVertical: 4,
  },
  memberDot: { width: 8, height: 8, borderRadius: 4 },
  memberName: { fontSize: 10, color: Colors.textPrimary, fontWeight: '600' },

  // ── Bottom panels ──
  bottomPanel: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    maxHeight: 300, backgroundColor: Colors.surfaceElevated,
    borderTopLeftRadius: 16, borderTopRightRadius: 16,
    borderTopWidth: 1, borderTopColor: Colors.mud,
  },
  chatPanel: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    height: '55%', backgroundColor: Colors.surfaceElevated,
    borderTopLeftRadius: 16, borderTopRightRadius: 16,
    borderTopWidth: 1, borderTopColor: Colors.mud,
  },
  panelHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: Colors.mud,
  },
  panelTitle: { fontSize: 15, fontWeight: '700', color: Colors.tan },
  panelClose: { fontSize: 16, color: Colors.textMuted, fontWeight: '700' },
  panelScroll: { paddingHorizontal: 16, paddingVertical: 8 },
  panelEmpty: { fontSize: 12, color: Colors.textMuted, textAlign: 'center', paddingVertical: 16 },

  // ── Tool palette grid ──
  toolGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  toolGridItem: {
    width: '30%', alignItems: 'center', paddingVertical: 12,
    backgroundColor: Colors.surface, borderRadius: 12,
    borderWidth: 1.5, borderColor: Colors.mud,
  },
  toolGridEmoji: { fontSize: 28, marginBottom: 4 },
  toolGridLabel: { fontSize: 12, fontWeight: '700', color: Colors.textPrimary },
  toolGridCount: { fontSize: 9, color: Colors.textMuted, marginTop: 2 },

  // ── Subtype picker ──
  subtypeModal: {
    backgroundColor: Colors.surfaceElevated, borderTopLeftRadius: 20, borderTopRightRadius: 20,
    padding: 20, paddingBottom: 40, maxHeight: '60%',
  },
  subtypeTitle: { fontSize: 17, fontWeight: '700', color: Colors.tan, marginBottom: 14 },
  subtypeRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingVertical: 10, borderBottomWidth: 0.5, borderBottomColor: Colors.mud,
  },
  subtypeIcon: { fontSize: 22 },
  subtypeLabel: { fontSize: 14, color: Colors.textPrimary },

  // ── Feed items ──
  feedItem: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, paddingVertical: 6 },
  feedDot: { width: 8, height: 8, borderRadius: 4, marginTop: 4 },
  feedAction: { fontSize: 12, color: Colors.textSecondary },
  feedUsername: { fontWeight: '700', color: Colors.textPrimary },
  feedTime: { fontSize: 9, color: Colors.textMuted, marginTop: 2 },

  // ── Member panel ──
  tierBanner: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    backgroundColor: Colors.surface, borderRadius: 8, padding: 10, marginBottom: 10,
    borderWidth: 1, borderColor: Colors.mud,
  },
  tierText: { fontSize: 12, color: Colors.textSecondary, fontWeight: '600' },
  upgradeBtn: { backgroundColor: Colors.water, borderRadius: 6, paddingHorizontal: 10, paddingVertical: 4 },
  upgradeBtnText: { fontSize: 11, fontWeight: '700', color: Colors.textOnAccent },
  chatToggleRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingVertical: 8, borderBottomWidth: 0.5, borderBottomColor: Colors.mud, marginBottom: 8,
  },
  chatToggleLabel: { fontSize: 13, color: Colors.textPrimary },
  chatToggleValue: { fontSize: 13, color: Colors.sage },
  memberRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8 },
  memberAvatar: { width: 32, height: 32, borderRadius: 16, justifyContent: 'center', alignItems: 'center' },
  memberInitial: { fontSize: 14, fontWeight: '700', color: Colors.textOnAccent },
  memberRowName: { fontSize: 13, fontWeight: '600', color: Colors.textPrimary },
  memberRowMeta: { fontSize: 10, color: Colors.textSecondary },
  removeMemberBtn: { padding: 8 },
  removeMemberText: { fontSize: 14, color: Colors.textMuted },
  inviteMemberBtn: { paddingVertical: 10, alignItems: 'center' },
  inviteMemberText: { fontSize: 13, fontWeight: '700', color: Colors.waterLight },

  // ── Modals ──
  modalOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.5)' },
  modalContent: { backgroundColor: Colors.surfaceElevated, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, paddingBottom: 36 },
  modalTitle: { fontSize: 17, fontWeight: '700', color: Colors.tan, marginBottom: 6 },
  modalSubtitle: { fontSize: 12, color: Colors.textSecondary, marginBottom: 14, lineHeight: 17 },
  modalInput: {
    backgroundColor: Colors.surface, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10,
    fontSize: 14, color: Colors.textPrimary, borderWidth: 1, borderColor: Colors.mud, marginBottom: 12,
  },
  modalButtons: { flexDirection: 'row', justifyContent: 'flex-end', gap: 10 },
  modalCancelBtn: { paddingVertical: 10, paddingHorizontal: 16 },
  modalCancelText: { fontSize: 14, fontWeight: '600', color: Colors.textMuted },
  modalCreateBtn: { backgroundColor: Colors.water, borderRadius: 10, paddingVertical: 10, paddingHorizontal: 20 },
  modalCreateText: { fontSize: 14, fontWeight: '700', color: Colors.textOnAccent },
  shareLinkBtn: {
    backgroundColor: Colors.forestDark, borderRadius: 10, paddingVertical: 12, alignItems: 'center', marginBottom: 12,
    borderWidth: 1, borderColor: Colors.moss,
  },
  shareLinkText: { fontSize: 14, fontWeight: '700', color: Colors.waterLight },

  // ── Manage Annotations Panel ──
  managePanel: {
    position: 'absolute', bottom: 60, left: 0, right: 0, height: '45%',
    backgroundColor: Colors.surface, borderTopLeftRadius: 16, borderTopRightRadius: 16,
    paddingTop: 12, paddingHorizontal: 16,
  },
  managePanelScroll: { flex: 1, marginTop: 8 },
  manageEmptyText: { color: Colors.textMuted, textAlign: 'center', marginTop: 24, fontSize: 13 },
  manageRow: {
    flexDirection: 'row', alignItems: 'center', paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: Colors.mud,
  },
  manageRowInfo: { flex: 1 },
  manageRowType: { fontSize: 10, color: Colors.mdGold, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
  manageRowLabel: { fontSize: 14, color: Colors.textPrimary, fontWeight: '600', marginTop: 1 },
  manageRowCreator: { fontSize: 11, color: Colors.textMuted, marginTop: 1 },
  manageDeleteBtn: { padding: 8, marginLeft: 8 },
  manageDeleteText: { fontSize: 18 },

  // ── Custom panels for CollaborativeMapBase ──
  customPanelContent: {
    flex: 1,
  },
  customMembersPanel: {
    flex: 1,
  },
  customToolPanel: {
    flex: 1,
  },
  toolPaletteScroll: {
    flex: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  toolCategoryBtn: {
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderBottomWidth: 1,
    borderBottomColor: Colors.mud,
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 12,
  },
  toolCategoryBtnActive: {
    backgroundColor: Colors.surface,
    borderBottomColor: Colors.water,
  },
  toolCategoryEmoji: {
    fontSize: 18,
  },
  toolCategoryLabel: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: Colors.textPrimary,
  },
  memberInfo: {
    flex: 1,
  },
  bottomPanelHeader: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    alignItems: 'center' as const,
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
    color: Colors.water,
    fontWeight: '600',
  },
  memberList: {
    flex: 1,
    paddingHorizontal: 12,
  },
});
