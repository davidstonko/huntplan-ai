/**
 * @file DeerCampScreen.tsx
 * @description Collaborative shared maps for hunting groups and friends.
 * Allows groups to pool scouting data, waypoints, tracks, and photos on a shared camp map.
 *
 * @module Screens
 * @version 2.0.0
 *
 * Key features:
 * - Two view modes: Camp list (cards) and Camp map (full Mapbox GL)
 * - Create camps, invite members, manage member roles and access
 * - Full annotation rendering: waypoints, routes, areas, tracks, photo pins (color-coded per member)
 * - Tap-to-add waypoint on camp map with icon picker
 * - Geotag-based photo upload with optional captions (image storage in V3)
 * - Activity feed showing last 30 actions (member additions, annotations, photos) with timestamps
 * - Member management panel showing avatars, initials, role badges, pin/photo counts
 * - Camp toolbar: Pin, Photo, Team (members), Feed (activity), GPS crosshair
 * - Import hunt plans to camp (converts plan annotations to SharedAnnotations)
 * - Export saved GPS tracks to camp as track-type annotations
 * - Long-press camp to delete with confirmation
 * - V2 local-first with AsyncStorage; V3+ adds backend sync
 */

import React, { useState, useMemo, useCallback, useRef } from 'react';
import { useNavigation } from '@react-navigation/native';
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
  Image,
  Dimensions,
} from 'react-native';
import MapboxGL from '@rnmapbox/maps';
import { useDeerCamp } from '../context/DeerCampContext';
import { useLocation } from '../hooks/useLocation';
import Colors from '../theme/colors';
import { useModalFocus } from '../hooks/useModalFocus';
import { DeerCamp, SharedAnnotation, CampPhoto, CampArea } from '../types/deercamp';
import CampAreaPicker from '../components/deercamp/CampAreaPicker';
import CampDetailsEditor from '../components/deercamp/CampDetailsEditor';
import CampInviteLinkModal from '../components/deercamp/CampInviteLinkModal';
import { Waypoint, Route, DrawnArea, RecordedTrack } from '../types/scout';
import { MAPBOX_ACCESS_TOKEN } from '../config';
import { pickPhoto } from '../services/imagePicker';
import { uploadPhoto } from '../services/photoService';
import { shareCampInvite } from '../services/deepLinkService';
import { setPendingAreaPickerCallbacks } from '../components/deercamp/campAreaPickerCallbacks';
import { downloadCampArea } from '../services/offlineMaps';

MapboxGL.setAccessToken(MAPBOX_ACCESS_TOKEN);

type ViewMode = 'list' | 'map';
type CampMapMode = 'view' | 'addWaypoint';
type BottomPanel = 'none' | 'feed' | 'members' | 'photos';

/**
 * DeerCampScreen — Collaborative shared hunting camp interface.
 *
 * Enables hunting groups to create and manage shared camps where members can
 * pool scouting data, waypoints, routes, areas, GPS tracks, and geotagged photos.
 *
 * Supports two view modes:
 *
 * 1. **List View**: Cards showing camp name, member count, recent activity, and long-press delete
 * 2. **Map View**: Full Mapbox map with all camp annotations color-coded by contributor,
 *    7-button toolbar for actions (add pin, upload photo, manage team, view feed, GPS crosshair)
 *
 * Integrates with DeerCampContext for state management and AsyncStorage for offline-first
 * persistence. Plans and tracks can be imported from ScoutScreen to enrich camp data.
 *
 * Member management includes role badges and annotation counting. Activity feed logs all
 * actions with member color dots and timestamps. V3+ will add real-time sync via backend.
 *
 * @returns {JSX.Element} Full-screen UI with camp list/map view switcher
 */
export default function DeerCampScreen() {
  const navigation = useNavigation<any>();
  const {
    camps, createCamp, deleteCamp, addMember, removeMember,
    addAnnotation, removeAnnotation, addPhoto, currentUserId, currentUsername,
    setCampOfflineStatus,
    ensureCampInviteCode,
    renameCamp, updateCampDescription, addCampDocument, removeCampDocument,
  } = useDeerCamp();
  const { location } = useLocation();

  // ── List view state ──
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [selectedCampId, setSelectedCampId] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newCampName, setNewCampName] = useState('');
  // After a user submits a name, we stash it here and open the area picker.
  // Cancelling the area picker clears this and drops the pending name (the
  // user has not yet committed anything).
  const [pendingAreaName, setPendingAreaName] = useState<string | null>(null);

  // ── Camp map state ──
  const [campMapMode, setCampMapMode] = useState<CampMapMode>('view');
  const [bottomPanel, setBottomPanel] = useState<BottomPanel>('none');
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteUsername, setInviteUsername] = useState('');
  const [showPhotoModal, setShowPhotoModal] = useState(false);
  const [photoCaption, setPhotoCaption] = useState('');
  const [viewingPhotoId, setViewingPhotoId] = useState<string | null>(null);
  // Moderator tools added 2026-04-20: details editor + shareable invite link.
  // Gated on isAdmin at the buttons that open them.
  const [showDetailsEditor, setShowDetailsEditor] = useState(false);
  const [showInviteLinkModal, setShowInviteLinkModal] = useState(false);

  const cameraRef = useRef<MapboxGL.Camera>(null);
  const createCampInputRef = useModalFocus(showCreateModal);
  const inviteInputRef = useModalFocus(showInviteModal);
  const photoCaptionInputRef = useModalFocus(showPhotoModal);
  // Multi-tap guard: prevent double-create if user taps "Confirm" twice rapidly
  const createCampInProgressRef = useRef(false);
  const selectedCamp = camps.find((c) => c.id === selectedCampId);

  // ── Handlers ──
  /**
   * Step 1 of create flow: user submits the camp name. We stash the name,
   * close the name modal, and open the area picker. createCamp is NOT
   * called until step 2 completes.
   */
  const handleNameNext = () => {
    const name = newCampName.trim();
    if (!name) {
      Alert.alert('Name Required', 'Please enter a camp name.');
      return;
    }
    // 2026-04-26 (fork merge, fifth pass): navigate to CampAreaPicker as a
    // separate Stack route. Modal/overlay approaches all lost the picker to
    // iOS UIKit modal-stack races. A real navigation push is bulletproof.
    if (__DEV__) console.log('[DeerCamp] opening area picker for', name);
    setShowCreateModal(false);
    setPendingAreaName(name);
    setTimeout(() => {
      // 2026-04-26 task #48: stash callbacks in a module-scoped registry
      // and pass only the opaque reqId on route.params, so React Navigation
      // doesn't warn about non-serializable function values.
      const reqId = setPendingAreaPickerCallbacks({
        onConfirm: (area: CampArea) => {
          createCamp(name, area);
          setPendingAreaName(null);
          setNewCampName('');
        },
        onCancel: () => {
          setPendingAreaName(null);
        },
      });
      navigation?.navigate?.('CampAreaPicker', {
        reqId,
        campName: name,
        // Prefer user GPS; fall back to downtown Baltimore (39.2904,
        // -76.6122) — user can pan/zoom out + use the address search to
        // navigate elsewhere if GPS doesn't reflect their target.
        initialCenter: location
          ? { lat: location.latitude, lng: location.longitude }
          : { lat: 39.2904, lng: -76.6122 },
      });
    }, 250);
  };

  /**
   * Step 2 of create flow: user confirms the drawn rectangle. We create
   * the camp now, clear the pending name, and reset the name input.
   * 2026-05-02 iter 21: guard against multi-tap double-create race.
   */
  const handleAreaConfirm = (area: CampArea) => {
    if (createCampInProgressRef.current) return; // Debounce
    const name = pendingAreaName;
    if (!name) return;
    createCampInProgressRef.current = true;
    try {
      createCamp(name, area);
      setPendingAreaName(null);
      setNewCampName('');
    } finally {
      createCampInProgressRef.current = false;
    }
  };

  /**
   * User backed out of the area-picker step. Drop the pending name —
   * no camp is created.
   */
  const handleAreaCancel = () => {
    setPendingAreaName(null);
  };

  /**
   * Trigger a deferred offline-tile download for the currently selected
   * camp. Walks the camp through offlineTileStatus 'none' → 'downloading'
   * → 'ready' (or 'error'). Safe to call repeatedly; underlying Mapbox
   * pack is keyed by camp id.
   */
  const handleDownloadOffline = async (camp: DeerCamp) => {
    if (camp.offlineTileStatus === 'downloading') {
      Alert.alert('Already Downloading', 'This camp is already downloading. Please wait.');
      return;
    }
    if (camp.offlineTileStatus === 'ready') {
      Alert.alert('Already Downloaded', `"${camp.name}" is already available offline.`);
      return;
    }
    if (!camp.area) {
      Alert.alert('No Area Defined', `"${camp.name}" was created before area-bounded camps and can't be downloaded for offline use. Edit the camp to draw an area first.`);
      return;
    }
    setCampOfflineStatus(camp.id, 'downloading');
    try {
      await downloadCampArea(camp.id, camp.name, camp.area);
      setCampOfflineStatus(camp.id, 'ready');
      Alert.alert('Offline Ready', `"${camp.name}" is now available offline.`);
    } catch (e) {
      console.warn('[DeerCamp] offline download failed:', e);
      setCampOfflineStatus(camp.id, 'error');
      Alert.alert('Download Failed', 'Could not download offline tiles. Check connection and try again.');
    }
  };

  const handleDeleteCamp = (camp: DeerCamp) => {
    Alert.alert(
      'Delete Camp',
      `Delete "${camp.name}" and all its data? This cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: () => deleteCamp(camp.id) },
      ]
    );
  };

  const handleInviteMember = () => {
    if (!inviteUsername.trim() || !selectedCampId) return;
    addMember(selectedCampId, inviteUsername.trim());
    setInviteUsername('');
    setShowInviteModal(false);
  };

  const handleRemoveMember = (userId: string, username: string) => {
    if (!selectedCampId) return;
    if (userId === currentUserId) {
      Alert.alert('Cannot Remove', 'You cannot remove yourself from the camp.');
      return;
    }
    Alert.alert('Remove Member', `Remove ${username} from this camp?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Remove', style: 'destructive', onPress: () => removeMember(selectedCampId, userId) },
    ]);
  };

  const enterCamp = (campId: string) => {
    setSelectedCampId(campId);
    setViewMode('map');
    setCampMapMode('view');
    setBottomPanel('none');
  };

  const exitCamp = () => {
    setViewMode('list');
    setSelectedCampId(null);
    setCampMapMode('view');
    setBottomPanel('none');
  };

  // ── Map tap handler ──
  const handleMapPress = useCallback((event: any) => {
    if (campMapMode !== 'addWaypoint' || !selectedCampId) return;
    const { geometry } = event;
    if (!geometry?.coordinates) return;
    const [lng, lat] = geometry.coordinates;

    const newAnnotation: SharedAnnotation = {
      id: Date.now().toString(36) + Math.random().toString(36).substr(2, 9),
      type: 'waypoint',
      createdBy: currentUserId,
      createdAt: new Date().toISOString(),
      data: {
        id: Date.now().toString(36) + Math.random().toString(36).substr(2, 6),
        lat,
        lng,
        icon: 'custom' as const,
        label: `Pin ${(selectedCamp?.annotations.filter(a => a.type === 'waypoint').length || 0) + 1}`,
        notes: '',
      } as Waypoint,
    };
    addAnnotation(selectedCampId, newAnnotation);
    // Stay in add mode for rapid placement
  }, [campMapMode, selectedCampId, currentUserId, addAnnotation, selectedCamp]);

  // ── Photo upload: pick -> geotag -> optimistic add -> background upload ──
  const handlePhotoUpload = async () => {
    if (!selectedCampId || !location) {
      Alert.alert('Location Needed', 'GPS location is required to geotag photos.');
      return;
    }

    // Dismiss the caption modal before the iOS picker sheet presents.
    const caption = photoCaption.trim() || undefined;
    setPhotoCaption('');
    setShowPhotoModal(false);

    const localUri = await pickPhoto();
    if (!localUri) {
      // User cancelled or permission denied (already shown by imagePicker).
      return;
    }

    // 1. Optimistic local insert — pin appears on the map immediately.
    const photoId = Date.now().toString(36) + Math.random().toString(36).substr(2, 6);
    const photo: CampPhoto = {
      id: photoId,
      uploadedBy: currentUserId,
      uploadedAt: new Date().toISOString(),
      imageUri: localUri,
      lat: location.latitude,
      lng: location.longitude,
      caption,
    };
    addPhoto(selectedCampId, photo);

    // 2. Attempt background upload to backend. Failures queue for retry in
    //    photoService; UI continues to show the local URI either way.
    uploadPhoto(localUri, 'camp', selectedCampId, {
      lat: location.latitude,
      lng: location.longitude,
      caption,
      userId: currentUserId,
    }).catch(() => {
      // Already queued by photoService; silent is fine here.
    });
  };

  // ── GeoJSON builders for camp map ──
  const campGeoJSON = useMemo(() => {
    if (!selectedCamp) return { waypoints: null, routes: null, areas: null, tracks: null, photos: null };

    // Waypoints
    const waypointFeatures = selectedCamp.annotations
      .filter((a) => a.type === 'waypoint')
      .map((a) => {
        const wp = a.data as Waypoint;
        const member = selectedCamp.members.find((m) => m.userId === a.createdBy);
        return {
          type: 'Feature' as const,
          properties: {
            id: a.id,
            label: wp.label || 'Pin',
            color: member?.color || '#E03C31',
            username: member?.username || 'Unknown',
          },
          geometry: { type: 'Point' as const, coordinates: [wp.lng, wp.lat] },
        };
      });

    // Routes
    const routeFeatures = selectedCamp.annotations
      .filter((a) => a.type === 'route')
      .map((a) => {
        const rt = a.data as Route;
        const member = selectedCamp.members.find((m) => m.userId === a.createdBy);
        return {
          type: 'Feature' as const,
          properties: {
            id: a.id,
            label: rt.label || 'Route',
            color: member?.color || '#0277BD',
          },
          geometry: { type: 'LineString' as const, coordinates: rt.points },
        };
      });

    // Areas
    const areaFeatures = selectedCamp.annotations
      .filter((a) => a.type === 'area')
      .map((a) => {
        const area = a.data as DrawnArea;
        const member = selectedCamp.members.find((m) => m.userId === a.createdBy);
        // Ensure polygon ring is closed
        let ring = [...area.polygon];
        if (ring.length > 0) {
          const first = ring[0];
          const last = ring[ring.length - 1];
          if (first[0] !== last[0] || first[1] !== last[1]) {
            ring.push(first);
          }
        }
        return {
          type: 'Feature' as const,
          properties: {
            id: a.id,
            label: area.label || 'Area',
            color: member?.color || '#6A1B9A',
          },
          geometry: { type: 'Polygon' as const, coordinates: [ring] },
        };
      });

    // Tracks
    const trackFeatures = selectedCamp.annotations
      .filter((a) => a.type === 'track')
      .map((a) => {
        const track = a.data as RecordedTrack;
        const member = selectedCamp.members.find((m) => m.userId === a.createdBy);
        return {
          type: 'Feature' as const,
          properties: {
            id: a.id,
            label: track.name || 'Track',
            color: member?.color || '#FF4444',
          },
          geometry: {
            type: 'LineString' as const,
            coordinates: (track.points?.map((p) => [p.lng, p.lat]) || []),
          },
        };
      });

    // Photos
    const photoFeatures = (selectedCamp?.photos?.map((p) => {
      const member = selectedCamp.members.find((m) => m.userId === p.uploadedBy);
      return {
        type: 'Feature' as const,
        properties: {
          id: p.id,
          caption: p.caption || 'Photo',
          color: member?.color || '#FFD700',
        },
        geometry: { type: 'Point' as const, coordinates: [p.lng, p.lat] },
      };
    }) || []);

    const makeFC = (features: any[]) =>
      features.length > 0 ? { type: 'FeatureCollection' as const, features } as any : null;

    return {
      waypoints: makeFC(waypointFeatures),
      routes: makeFC(routeFeatures),
      areas: makeFC(areaFeatures),
      tracks: makeFC(trackFeatures),
      photos: makeFC(photoFeatures),
    };
  }, [selectedCamp]);

  // ═══════════════════════════════════════════
  // ── CAMP MAP VIEW ──
  // ═══════════════════════════════════════════
  if (viewMode === 'map' && selectedCamp) {
    const isAdmin = selectedCamp.members.find(m => m.userId === currentUserId)?.role === 'admin';

    return (
      <View style={styles.container}>
        <MapboxGL.MapView
          style={styles.map}
          styleURL="mapbox://styles/mapbox/outdoors-v12"
          onPress={handleMapPress}
        >
          {/* 2026-04-26 (cross-cutting audit): defaultSettings instead of
              controlled centerCoordinate so users can drag/pan the camp
              map. Camera mounts fresh whenever user enters camp-map view
              (returning to list unmounts), so initial-only is correct. */}
          <MapboxGL.Camera
            ref={cameraRef}
            defaultSettings={{
              centerCoordinate: [selectedCamp.centerPoint.lng, selectedCamp.centerPoint.lat],
              zoomLevel: selectedCamp.defaultZoom,
            }}
          />
          <MapboxGL.UserLocation visible={true} />

          {/* ── Camp-boundary rectangle (user-drawn at creation, 2026-04-20) ── */}
          {selectedCamp.area && (
            <MapboxGL.ShapeSource
              id="campBoundary"
              shape={{
                type: 'Feature',
                properties: {},
                geometry: {
                  type: 'Polygon',
                  coordinates: [[
                    [selectedCamp.area.west, selectedCamp.area.north],
                    [selectedCamp.area.east, selectedCamp.area.north],
                    [selectedCamp.area.east, selectedCamp.area.south],
                    [selectedCamp.area.west, selectedCamp.area.south],
                    [selectedCamp.area.west, selectedCamp.area.north],
                  ]],
                },
              } as any}
            >
              <MapboxGL.LineLayer
                id="campBoundaryLine"
                style={{
                  lineColor: Colors.mdRed,
                  lineWidth: 2.5,
                  lineOpacity: 0.9,
                }}
              />
              <MapboxGL.FillLayer
                id="campBoundaryFill"
                style={{
                  fillColor: Colors.mdRed,
                  fillOpacity: 0.05,
                }}
              />
            </MapboxGL.ShapeSource>
          )}

          {/* ── Area polygons ── */}
          {campGeoJSON.areas && (
            <MapboxGL.ShapeSource id="campAreas" shape={campGeoJSON.areas}>
              <MapboxGL.FillLayer
                id="campAreaFill"
                style={{
                  fillColor: ['get', 'color'],
                  fillOpacity: 0.2,
                }}
              />
              <MapboxGL.LineLayer
                id="campAreaBorder"
                style={{
                  lineColor: ['get', 'color'],
                  lineWidth: 2,
                  lineDasharray: [3, 2],
                }}
              />
            </MapboxGL.ShapeSource>
          )}

          {/* ── Route polylines ── */}
          {campGeoJSON.routes && (
            <MapboxGL.ShapeSource id="campRoutes" shape={campGeoJSON.routes}>
              <MapboxGL.LineLayer
                id="campRouteLines"
                style={{
                  lineColor: ['get', 'color'],
                  lineWidth: 3,
                  lineOpacity: 0.85,
                }}
              />
            </MapboxGL.ShapeSource>
          )}

          {/* ── Track polylines ── */}
          {campGeoJSON.tracks && (
            <MapboxGL.ShapeSource id="campTracks" shape={campGeoJSON.tracks}>
              <MapboxGL.LineLayer
                id="campTrackLines"
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
          {campGeoJSON.waypoints && (
            <MapboxGL.ShapeSource id="campWaypoints" shape={campGeoJSON.waypoints}>
              <MapboxGL.CircleLayer
                id="campWaypointOuter"
                style={{
                  circleRadius: 12,
                  circleColor: ['get', 'color'],
                  circleStrokeWidth: 2.5,
                  circleStrokeColor: '#ffffff',
                }}
              />
              <MapboxGL.SymbolLayer
                id="campWaypointLabels"
                style={{
                  textField: ['get', 'label'],
                  textSize: 10,
                  textColor: '#ffffff',
                  textOffset: [0, 2],
                  textHaloColor: '#000000',
                  textHaloWidth: 1,
                  textFont: ['DIN Pro Medium', 'Arial Unicode MS Regular'],
                }}
              />
            </MapboxGL.ShapeSource>
          )}

          {/* ── Photo pins ── */}
          {campGeoJSON.photos && (
            <MapboxGL.ShapeSource
              id="campPhotoPins"
              shape={campGeoJSON.photos}
              onPress={(e) => {
                const id = e.features?.[0]?.properties?.id;
                if (id) setViewingPhotoId(String(id));
              }}
            >
              <MapboxGL.CircleLayer
                id="campPhotoOuter"
                style={{
                  circleRadius: 9,
                  circleColor: '#FFD700',
                  circleStrokeWidth: 2,
                  circleStrokeColor: '#ffffff',
                }}
              />
              <MapboxGL.SymbolLayer
                id="campPhotoIcon"
                style={{
                  textField: '\uD83D\uDCF7',
                  textSize: 10,
                }}
              />
            </MapboxGL.ShapeSource>
          )}
        </MapboxGL.MapView>

        {/* ── Camp header bar ── */}
        <View style={styles.campHeader}>
          <TouchableOpacity onPress={exitCamp} style={styles.backButton}>
            <Text style={styles.backText}>{'\u2190'} Back</Text>
          </TouchableOpacity>
          <Text style={styles.campHeaderTitle} numberOfLines={1}>{selectedCamp.name}</Text>
          <View style={styles.headerActions}>
            {/* Moderator-only: edit details + share invite link. Non-admin
                members still see the roster invite button below. */}
            {isAdmin && (
              <>
                <TouchableOpacity
                  style={styles.iconButton}
                  onPress={() => setShowDetailsEditor(true)}
                  accessibilityLabel="Edit camp details"
                >
                  <Text style={styles.iconButtonText}>EDIT</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.iconButton}
                  onPress={() => {
                    // 2026-04-28: ensure a real 6-char inviteCode is
                    // generated + persisted before opening the modal.
                    // Otherwise the modal renders a Universal Link with
                    // the long base36 camp.id as a fallback, which works
                    // (deepLinkRouter regex accepts any length) but
                    // produces an ugly URL. Calling ensureCampInviteCode
                    // is idempotent for camps already carrying a code.
                    if (selectedCamp) ensureCampInviteCode(selectedCamp.id);
                    setShowInviteLinkModal(true);
                  }}
                  accessibilityLabel="Share invite link"
                >
                  <Text style={styles.iconButtonText}>LINK</Text>
                </TouchableOpacity>
              </>
            )}
            <TouchableOpacity
              style={styles.inviteButton}
              onPress={() => setShowInviteModal(true)}
            >
              <Text style={styles.inviteButtonText}>+ Invite</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* ── Map mode hint ── */}
        {campMapMode === 'addWaypoint' && (
          <View style={styles.modeHint}>
            <Text style={styles.modeHintText}>Tap the map to place a pin</Text>
            <TouchableOpacity onPress={() => setCampMapMode('view')}>
              <Text style={styles.modeHintCancel}>Done</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* ── Camp map toolbar ── */}
        <View style={styles.campToolbar}>
          <TouchableOpacity
            style={[styles.campToolBtn, campMapMode === 'addWaypoint' && styles.campToolBtnActive]}
            onPress={() => setCampMapMode(campMapMode === 'addWaypoint' ? 'view' : 'addWaypoint')}
          >
            <Text style={styles.campToolEmoji}>{'\uD83D\uDCCC'}</Text>
            <Text style={styles.campToolLabel}>Pin</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.campToolBtn}
            onPress={() => {
              if (!location) {
                Alert.alert('Location Needed', 'GPS location is required to geotag photos. Please enable location services.');
                return;
              }
              setShowPhotoModal(true);
            }}
          >
            <Text style={styles.campToolEmoji}>{'\uD83D\uDCF7'}</Text>
            <Text style={styles.campToolLabel}>Photo</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.campToolBtn, bottomPanel === 'members' && styles.campToolBtnActive]}
            onPress={() => setBottomPanel(bottomPanel === 'members' ? 'none' : 'members')}
          >
            <Text style={styles.campToolEmoji}>{'\uD83D\uDC65'}</Text>
            <Text style={styles.campToolLabel}>Team</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.campToolBtn, bottomPanel === 'feed' && styles.campToolBtnActive]}
            onPress={() => setBottomPanel(bottomPanel === 'feed' ? 'none' : 'feed')}
          >
            <Text style={styles.campToolEmoji}>{'\uD83D\uDCE8'}</Text>
            <Text style={styles.campToolLabel}>Feed</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.campToolBtn}
            onPress={() => handleDownloadOffline(selectedCamp)}
            disabled={selectedCamp.offlineTileStatus === 'downloading'}
          >
            <Text style={styles.campToolEmoji}>
              {selectedCamp.offlineTileStatus === 'ready' ? '\u2713' :
               selectedCamp.offlineTileStatus === 'downloading' ? '\u2026' :
               selectedCamp.offlineTileStatus === 'error' ? '\u26A0' : '\u2B07'}
            </Text>
            <Text style={styles.campToolLabel}>
              {selectedCamp.offlineTileStatus === 'ready' ? 'Offline' :
               selectedCamp.offlineTileStatus === 'downloading' ? 'DL…' :
               selectedCamp.offlineTileStatus === 'error' ? 'Retry' : 'Offline'}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.campToolBtn}
            onPress={() => {
              if (location) {
                cameraRef.current?.setCamera({
                  centerCoordinate: [location.longitude, location.latitude],
                  zoomLevel: 14,
                  animationDuration: 500,
                });
              }
            }}
          >
            <Text style={styles.campToolCrosshair}>{'\u2316'}</Text>
          </TouchableOpacity>
        </View>

        {/* ── Member bar (compact) ── */}
        <View style={styles.memberBar}>
          {selectedCamp?.members?.map((m) => (
            <View key={m.userId} style={styles.memberChip}>
              <View style={[styles.memberDot, { backgroundColor: m.color }]} />
              <Text style={styles.memberName}>{m.username}</Text>
              {/* MOD badge identifies the camp moderator(s). Letter-code chip
                  pattern (see professionalism pass 2026-04-19). */}
              {m.role === 'admin' && (
                <View style={styles.modBadge}>
                  <Text style={styles.modBadgeText}>MOD</Text>
                </View>
              )}
            </View>
          ))}
        </View>

        {/* ── Bottom Panel: Activity Feed ── */}
        {bottomPanel === 'feed' && (
          <View style={styles.bottomPanel}>
            <View style={styles.panelHeader}>
              <Text style={styles.panelTitle}>Activity Feed</Text>
              <TouchableOpacity onPress={() => setBottomPanel('none')}>
                <Text style={styles.panelClose}>{'\u2715'}</Text>
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.panelScroll} showsVerticalScrollIndicator={false}>
              {selectedCamp.activityFeed.length === 0 ? (
                <Text style={styles.panelEmpty}>No activity yet.</Text>
              ) : (
                selectedCamp.activityFeed.slice(0, 30).map((item) => {
                  const member = selectedCamp.members.find(m => m.userId === item.userId);
                  return (
                    <View key={item.id} style={styles.feedItem}>
                      <View style={[styles.feedDot, { backgroundColor: member?.color || Colors.textMuted }]} />
                      <View style={styles.feedContent}>
                        <Text style={styles.feedAction}>
                          <Text style={styles.feedUsername}>{item.username}</Text> {item.action}
                        </Text>
                        <Text style={styles.feedTime}>
                          {new Date(item.timestamp).toLocaleDateString()} {new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </Text>
                      </View>
                    </View>
                  );
                })
              )}
            </ScrollView>
          </View>
        )}

        {/* ── Bottom Panel: Members ── */}
        {bottomPanel === 'members' && (
          <View style={styles.bottomPanel}>
            <View style={styles.panelHeader}>
              <Text style={styles.panelTitle}>Members ({selectedCamp.members.length})</Text>
              <TouchableOpacity onPress={() => setBottomPanel('none')}>
                <Text style={styles.panelClose}>{'\u2715'}</Text>
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.panelScroll} showsVerticalScrollIndicator={false}>
              {selectedCamp?.members?.map((m) => {
                const annotationCount = selectedCamp.annotations.filter(a => a.createdBy === m.userId).length;
                const photoCount = selectedCamp.photos.filter(p => p.uploadedBy === m.userId).length;
                return (
                  <View key={m.userId} style={styles.memberRow}>
                    <View style={[styles.memberAvatar, { backgroundColor: m.color }]}>
                      <Text style={styles.memberInitial}>{m.username.charAt(0).toUpperCase()}</Text>
                    </View>
                    <View style={styles.memberInfo}>
                      <View style={styles.memberNameRow}>
                        <Text style={styles.memberRowName}>
                          {m.username} {m.userId === currentUserId ? '(You)' : ''}
                        </Text>
                        {m.role === 'admin' && (
                          <View style={styles.modBadge}>
                            <Text style={styles.modBadgeText}>MOD</Text>
                          </View>
                        )}
                      </View>
                      <Text style={styles.memberRowMeta}>
                        {m.role === 'admin' ? 'Moderator' : 'Member'} · {annotationCount} pins · {photoCount} photos
                      </Text>
                    </View>
                    {isAdmin && m.userId !== currentUserId && (
                      <TouchableOpacity
                        style={styles.removeMemberBtn}
                        onPress={() => handleRemoveMember(m.userId, m.username)}
                        accessibilityRole="button"
                        accessibilityLabel={`Remove ${m.username} from camp`}
                      >
                        <Text style={styles.removeMemberText}>{'\u2715'}</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                );
              })}
              <TouchableOpacity
                style={styles.inviteMemberBtn}
                onPress={() => setShowInviteModal(true)}
                accessibilityRole="button"
                accessibilityLabel="Open invite member dialog"
              >
                <Text style={styles.inviteMemberText}>+ Invite Member</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        )}

        {/* ── Latest activity strip (when no panel open) ── */}
        {bottomPanel === 'none' && selectedCamp.activityFeed.length > 0 && (
          <TouchableOpacity
            style={styles.feedStrip}
            onPress={() => setBottomPanel('feed')}
            activeOpacity={0.8}
          >
            <Text style={styles.feedStripText} numberOfLines={1}>
              {selectedCamp.activityFeed[0].username} {selectedCamp.activityFeed[0].action}
            </Text>
            <Text style={styles.feedStripArrow}>{'\u203A'}</Text>
          </TouchableOpacity>
        )}

        {/* ── Invite Modal ── */}
        <Modal visible={showInviteModal} transparent animationType="fade" onRequestClose={() => setShowInviteModal(false)}>
          <Pressable style={styles.modalOverlay} onPress={() => setShowInviteModal(false)}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>Invite to Camp</Text>
              <Text style={styles.modalSubtitle}>
                Invite a camp member by username so they appear on your shared roster for this season.
              </Text>
              <TextInput
                ref={inviteInputRef}
                style={styles.modalInput}
                placeholder="Username"
                placeholderTextColor={Colors.textMuted}
                value={inviteUsername}
                onChangeText={setInviteUsername}
                autoFocus
                autoCapitalize="none"
                autoCorrect={false}
                returnKeyType="done"
                onSubmitEditing={handleInviteMember}
                maxLength={30}
              />
              <View style={styles.modalButtons}>
                <TouchableOpacity style={styles.modalCancelBtn} onPress={() => setShowInviteModal(false)}>
                  <Text style={styles.modalCancelText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.modalCreateBtn} onPress={handleInviteMember}>
                  <Text style={styles.modalCreateText}>Invite</Text>
                </TouchableOpacity>
              </View>
              {/* 2026-04-26: "Share Link" alternative — opens iOS share sheet
                  with a Universal Link. Recipient with the app installed
                  taps and is dropped into the camp join flow; recipient
                  without the app is bounced to the App Store. Implemented
                  on top of the existing shareCampInvite + deepLinkService. */}
              <TouchableOpacity
                style={styles.shareLinkBtn}
                accessibilityRole="button"
                accessibilityLabel="Share Deer Camp invite link via Messages"
                onPress={() => {
                  if (!selectedCamp) return;
                  // 2026-04-28: prefer the eagerly-set inviteCode (new camps);
                  // for camps created before eager-generation landed, lazily
                  // generate + persist via ensureCampInviteCode. The fallback
                  // alert is now unreachable in practice but kept as a
                  // belt-and-suspenders for the (hypothetical) case where
                  // ensureCampInviteCode can't find the camp by id.
                  const code =
                    selectedCamp.inviteCode ||
                    ensureCampInviteCode(selectedCamp.id);
                  if (!code) {
                    Alert.alert(
                      'Share Link Unavailable',
                      'Could not generate a share link for this camp. Use the username invite above instead.',
                    );
                    return;
                  }
                  setShowInviteModal(false);
                  setTimeout(() => {
                    shareCampInvite(selectedCamp.name, code).catch(() => {});
                  }, 250);
                }}
              >
                <Text style={styles.shareLinkBtnEmoji}>{'🔗'}</Text>
                <Text style={styles.shareLinkBtnText}>
                  Share Link via Messages
                </Text>
              </TouchableOpacity>
              <Text style={styles.shareLinkHelp}>
                Friend taps the link → opens the app or directs them to the App Store.
              </Text>
            </View>
          </Pressable>
        </Modal>

        {/* ── Photo Upload Modal ── */}
        <Modal visible={showPhotoModal} transparent animationType="fade" onRequestClose={() => setShowPhotoModal(false)}>
          <Pressable style={styles.modalOverlay} onPress={() => setShowPhotoModal(false)}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>Add Photo Pin</Text>
              <Text style={styles.modalSubtitle}>
                Places a geotagged pin at your current GPS location with an optional caption so the camp can find it later.
              </Text>
              <TextInput
                ref={photoCaptionInputRef}
                style={styles.modalInput}
                placeholder="Caption (optional)"
                placeholderTextColor={Colors.textMuted}
                value={photoCaption}
                onChangeText={setPhotoCaption}
                autoCapitalize="sentences"
                returnKeyType="done"
                onSubmitEditing={handlePhotoUpload}
                maxLength={200}
              />
              <View style={styles.modalButtons}>
                <TouchableOpacity style={styles.modalCancelBtn} onPress={() => setShowPhotoModal(false)}>
                  <Text style={styles.modalCancelText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.modalCreateBtn} onPress={handlePhotoUpload}>
                  <Text style={styles.modalCreateText}>Choose Photo</Text>
                </TouchableOpacity>
              </View>
            </View>
          </Pressable>
        </Modal>

        {/* ── Photo Viewer Modal ── */}
        {(() => {
          const viewing = viewingPhotoId
            ? selectedCamp?.photos.find((p) => p.id === viewingPhotoId)
            : null;
          if (!viewing) return null;
          const author = selectedCamp?.members.find((m) => m.userId === viewing.uploadedBy);
          const screenW = Dimensions.get('window').width;
          return (
            <Modal
              visible
              transparent
              animationType="fade"
              onRequestClose={() => setViewingPhotoId(null)}
            >
              <Pressable style={styles.photoViewerOverlay} onPress={() => setViewingPhotoId(null)}>
                <View style={[styles.photoViewerCard, { width: screenW - 32 }]}>
                  <Image
                    source={{ uri: viewing.imageUri }}
                    style={[styles.photoViewerImage, { width: screenW - 64 }]}
                    resizeMode="contain"
                  />
                  <View style={styles.photoViewerMeta}>
                    <Text style={styles.photoViewerAuthor}>
                      {author?.username || 'Unknown'}
                    </Text>
                    <Text style={styles.photoViewerDate}>
                      {new Date(viewing.uploadedAt).toLocaleDateString()}
                    </Text>
                  </View>
                  {viewing.caption ? (
                    <Text style={styles.photoViewerCaption}>{viewing.caption}</Text>
                  ) : null}
                  <TouchableOpacity
                    style={styles.photoViewerClose}
                    onPress={() => setViewingPhotoId(null)}
                  >
                    <Text style={styles.photoViewerCloseText}>Close</Text>
                  </TouchableOpacity>
                </View>
              </Pressable>
            </Modal>
          );
        })()}

        {/* ── Moderator-only: edit details modal ── */}
        {isAdmin && (
          <CampDetailsEditor
            visible={showDetailsEditor}
            camp={selectedCamp}
            currentUserId={currentUserId}
            onClose={() => setShowDetailsEditor(false)}
            onSave={({ name, description }) => {
              if (name !== selectedCamp.name) renameCamp(selectedCamp.id, name);
              if (description !== (selectedCamp.description ?? '')) {
                updateCampDescription(selectedCamp.id, description);
              }
            }}
            onAddDocument={(doc) => addCampDocument(selectedCamp.id, doc)}
            onRemoveDocument={(docId) => removeCampDocument(selectedCamp.id, docId)}
          />
        )}

        {/* ── Moderator-only: shareable invite link modal ── */}
        {isAdmin && (
          <CampInviteLinkModal
            visible={showInviteLinkModal}
            camp={selectedCamp}
            onClose={() => setShowInviteLinkModal(false)}
          />
        )}
      </View>
    );
  }

  // ═══════════════════════════════════════════
  // ── CAMP LIST VIEW ──
  // ═══════════════════════════════════════════
  return (
    <View style={styles.container}>
      <View style={styles.listHeader}>
        <Text style={styles.listTitle}>Deer Camp</Text>
        <TouchableOpacity
          style={styles.createButton}
          onPress={() => setShowCreateModal(true)}
        >
          <Text style={styles.createButtonText}>+ New Camp</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.listContent} contentContainerStyle={styles.listContentContainer}>
        {camps.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyEmoji}>{'\uD83C\uDFD5\uFE0F'}</Text>
            <Text style={styles.emptyTitle}>No Deer Camps Yet</Text>
            <Text style={styles.emptySubtitle}>
              Create a camp to start sharing maps and scouting data with your hunting buddies.
            </Text>
            <TouchableOpacity
              style={styles.emptyCreateBtn}
              onPress={() => setShowCreateModal(true)}
            >
              <Text style={styles.emptyCreateText}>Create Your First Camp</Text>
            </TouchableOpacity>
          </View>
        ) : (
          camps.map((camp) => {
            if (!camp) return null;
            const trackCount = (camp.annotations ?? []).filter(a => a.type === 'track').length;
            const waypointCount = (camp.annotations ?? []).filter(a => a.type === 'waypoint').length;
            return (
              <TouchableOpacity
                key={camp.id}
                style={styles.campCard}
                onPress={() => enterCamp(camp.id)}
                onLongPress={() => handleDeleteCamp(camp)}
                activeOpacity={0.7}
              >
                <View style={styles.campCardLeft}>
                  <Text style={styles.campCardEmoji}>{'\uD83C\uDFD5\uFE0F'}</Text>
                </View>
                <View style={styles.campCardInfo}>
                  <Text style={styles.campCardName}>{camp.name}</Text>
                  <Text style={styles.campCardMeta}>
                    {(camp.members ?? []).length} {(camp.members ?? []).length === 1 ? 'member' : 'members'} · {waypointCount} pins · {trackCount} tracks · {(camp.photos ?? []).length} photos
                  </Text>
                  {/* Member color dots */}
                  <View style={styles.campCardMembers}>
                    {(camp.members ?? []).slice(0, 6).map((m) => (
                      <View key={m.userId} style={[styles.campCardMemberDot, { backgroundColor: m.color }]} />
                    ))}
                    {(camp.members ?? []).length > 6 && (
                      <Text style={styles.campCardMoreMembers}>+{(camp.members ?? []).length - 6}</Text>
                    )}
                  </View>
                  {(camp.activityFeed ?? []).length > 0 && (
                    <Text style={styles.campCardActivity} numberOfLines={1}>
                      {(camp.activityFeed ?? [])[0]?.username} {(camp.activityFeed ?? [])[0]?.action}
                    </Text>
                  )}
                </View>
                <Text style={styles.campCardArrow}>{'\u203A'}</Text>
              </TouchableOpacity>
            );
          })
        )}

        {camps.length > 0 && (
          <View>
            <TouchableOpacity
              style={styles.addAnotherBtn}
              onPress={() => setShowCreateModal(true)}
            >
              <Text style={styles.addAnotherText}>+ Create Another Camp</Text>
            </TouchableOpacity>
            <Text style={styles.deleteHint}>Long-press a camp to delete it</Text>
          </View>
        )}
      </ScrollView>

      {/* ── Create Camp Modal ── */}
      <Modal visible={showCreateModal} transparent animationType="fade" onRequestClose={() => setShowCreateModal(false)}>
        <Pressable style={styles.modalOverlay} onPress={() => setShowCreateModal(false)}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Create Deer Camp</Text>
            <TextInput
              ref={createCampInputRef}
              style={styles.modalInput}
              placeholder="Camp name (e.g., 2026 Green Ridge Group)"
              placeholderTextColor={Colors.textMuted}
              value={newCampName}
              onChangeText={setNewCampName}
              autoFocus
              autoCapitalize="words"
              returnKeyType="next"
              onSubmitEditing={handleNameNext}
              maxLength={50}
            />
            <Text style={styles.modalHelperText}>
              Next: you'll draw the map area your camp covers. That rectangle
              anchors the shared map your friends see and edit, and controls
              what's downloadable for offline use.
            </Text>
            <View style={styles.modalButtons}>
              <TouchableOpacity style={styles.modalCancelBtn} onPress={() => setShowCreateModal(false)}>
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalCreateBtn} onPress={handleNameNext}>
                <Text style={styles.modalCreateText}>Next: Draw Area</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Pressable>
      </Modal>

      {/* 2026-04-26 (fork merge, fifth pass): Area picker is now a nav
          Stack route (CampAreaPickerScreen). Inline render dropped — see
          handleNameNext() above for the navigation push. */}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  map: { flex: 1 },

  // 2026-04-27: Share Link via Messages button (in invite modal). Moved
  // out of inline props for consistency with the rest of the StyleSheet.
  shareLinkBtn: {
    marginTop: 10,
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: Colors.lichen,
    borderRadius: 10,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
  },
  shareLinkBtnEmoji: { fontSize: 16 },
  shareLinkBtnText: {
    color: Colors.textOnAccent,
    fontWeight: '700',
    fontSize: 14,
  },
  shareLinkHelp: {
    fontSize: 11,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginTop: 6,
    fontStyle: 'italic',
  },

  // ── List view ──
  listHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.mud,
  },
  listTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.tan,
  },
  createButton: {
    backgroundColor: Colors.moss,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
  },
  createButtonText: {
    color: Colors.textOnAccent,
    fontSize: 13,
    fontWeight: '700',
  },
  listContent: { flex: 1 },
  listContentContainer: { padding: 16 },

  // ── Empty state ──
  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyEmoji: { fontSize: 48, marginBottom: 16 },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
    paddingHorizontal: 20,
  },
  emptyCreateBtn: {
    backgroundColor: Colors.moss,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 10,
  },
  emptyCreateText: {
    color: Colors.textOnAccent,
    fontSize: 15,
    fontWeight: '700',
  },

  // ── Camp cards ──
  campCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    borderLeftWidth: 3,
    borderLeftColor: Colors.oak,
  },
  campCardLeft: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.forestDark,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  campCardEmoji: { fontSize: 20 },
  campCardInfo: { flex: 1 },
  campCardName: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.textPrimary,
    marginBottom: 3,
  },
  campCardMeta: {
    fontSize: 11,
    color: Colors.textSecondary,
  },
  campCardMembers: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    marginTop: 4,
  },
  campCardMemberDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  campCardMoreMembers: {
    fontSize: 9,
    color: Colors.textMuted,
    marginLeft: 2,
  },
  campCardActivity: {
    fontSize: 10,
    color: Colors.textMuted,
    fontStyle: 'italic',
    marginTop: 3,
  },
  campCardArrow: {
    fontSize: 24,
    color: Colors.textMuted,
    marginLeft: 8,
  },
  addAnotherBtn: {
    alignItems: 'center',
    paddingVertical: 14,
    marginTop: 8,
  },
  addAnotherText: {
    fontSize: 14,
    color: Colors.moss,
    fontWeight: '600',
  },
  deleteHint: {
    textAlign: 'center',
    fontSize: 10,
    color: Colors.textMuted,
    marginTop: 4,
  },

  // ── Camp map header ──
  campHeader: {
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
  backButton: { marginRight: 12 },
  backText: { fontSize: 14, color: Colors.tan, fontWeight: '600' },
  campHeaderTitle: {
    flex: 1,
    fontSize: 16,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  inviteButton: {
    backgroundColor: Colors.moss,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
  },
  inviteButtonText: {
    color: Colors.textOnAccent,
    fontSize: 11,
    fontWeight: '700',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  iconButton: {
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: Colors.clay,
    backgroundColor: Colors.surfaceElevated,
  },
  iconButtonText: {
    color: Colors.mdGold,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.6,
  },
  // MOD badge (2026-04-20) — admin/moderator visual flag on member chips.
  // Letter-code chip pattern from the Build 9 professionalism pass.
  modBadge: {
    marginLeft: 4,
    backgroundColor: Colors.mdGold,
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 4,
  },
  modBadgeText: {
    color: Colors.mdBlack,
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.6,
  },
  memberNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  // ── Mode hint ──
  modeHint: {
    position: 'absolute',
    top: 48,
    left: 12,
    right: 72,
    backgroundColor: Colors.overlay,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  modeHintText: { fontSize: 12, color: Colors.tan, fontWeight: '600', flex: 1 },
  modeHintCancel: { fontSize: 12, color: Colors.lichen, fontWeight: '700', marginLeft: 8 },

  // ── Camp toolbar ──
  campToolbar: {
    position: 'absolute',
    right: 12,
    top: 52,
    flexDirection: 'column',
    gap: 8,
  },
  campToolBtn: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: Colors.overlay,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.clay,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  campToolBtnActive: {
    backgroundColor: Colors.moss,
    borderColor: Colors.lichen,
  },
  campToolEmoji: { fontSize: 18 },
  campToolLabel: { fontSize: 7, color: Colors.textPrimary, fontWeight: '700', marginTop: 1 },
  campToolCrosshair: { fontSize: 24, color: Colors.textPrimary, fontWeight: '300' },

  // ── Member bar ──
  memberBar: {
    position: 'absolute',
    top: 42,
    left: 0,
    right: 68,
    flexDirection: 'row',
    backgroundColor: Colors.overlay,
    paddingHorizontal: 12,
    paddingVertical: 6,
    gap: 8,
    flexWrap: 'wrap',
  },
  memberChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  memberDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  memberName: {
    fontSize: 11,
    color: Colors.textPrimary,
    fontWeight: '600',
  },

  // ── Bottom panels ──
  bottomPanel: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    maxHeight: 280,
    backgroundColor: Colors.surfaceElevated,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    borderTopWidth: 1,
    borderTopColor: Colors.mud,
  },
  panelHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.mud,
  },
  panelTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.tan,
  },
  panelClose: {
    fontSize: 16,
    color: Colors.textMuted,
    padding: 4,
  },
  panelScroll: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    maxHeight: 220,
  },
  panelEmpty: {
    fontSize: 12,
    color: Colors.textMuted,
    fontStyle: 'italic',
    textAlign: 'center',
    paddingVertical: 20,
  },

  // ── Feed items ──
  feedItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: Colors.mud,
    gap: 8,
  },
  feedDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginTop: 4,
  },
  feedContent: { flex: 1 },
  feedAction: {
    fontSize: 12,
    color: Colors.textSecondary,
    lineHeight: 18,
  },
  feedUsername: {
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  feedTime: {
    fontSize: 10,
    color: Colors.textMuted,
    marginTop: 1,
  },

  // ── Member rows ──
  memberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: Colors.mud,
    gap: 10,
  },
  memberAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  memberInitial: {
    fontSize: 14,
    fontWeight: '800',
    color: '#ffffff',
  },
  memberInfo: { flex: 1 },
  memberRowName: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  memberRowMeta: {
    fontSize: 10,
    color: Colors.textMuted,
    marginTop: 1,
  },
  removeMemberBtn: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: Colors.rust,
    justifyContent: 'center',
    alignItems: 'center',
  },
  removeMemberText: {
    fontSize: 10,
    color: '#ffffff',
    fontWeight: '700',
  },
  inviteMemberBtn: {
    alignItems: 'center',
    paddingVertical: 12,
    marginTop: 4,
  },
  inviteMemberText: {
    fontSize: 13,
    color: Colors.moss,
    fontWeight: '600',
  },

  // ── Feed strip ──
  feedStrip: {
    position: 'absolute',
    bottom: 10,
    left: 10,
    right: 10,
    backgroundColor: Colors.overlay,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    flexDirection: 'row',
    alignItems: 'center',
  },
  feedStripText: {
    flex: 1,
    fontSize: 11,
    color: Colors.textSecondary,
    fontStyle: 'italic',
  },
  feedStripArrow: {
    fontSize: 18,
    color: Colors.textMuted,
    marginLeft: 6,
  },

  // ── Modals ──
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: 300,
    backgroundColor: Colors.surfaceElevated,
    borderRadius: 14,
    padding: 20,
    borderWidth: 1,
    borderColor: Colors.clay,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.tan,
    marginBottom: 8,
  },
  modalSubtitle: {
    fontSize: 11,
    color: Colors.textMuted,
    marginBottom: 12,
    lineHeight: 16,
  },
  modalInput: {
    backgroundColor: Colors.surface,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: Colors.textPrimary,
    borderWidth: 1,
    borderColor: Colors.mud,
    marginBottom: 12,
  },
  modalHelperText: {
    fontSize: 11,
    color: Colors.textSecondary,
    lineHeight: 15,
    marginBottom: 14,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
  },
  modalCancelBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  modalCancelText: {
    color: Colors.textMuted,
    fontSize: 14,
    fontWeight: '600',
  },
  modalCreateBtn: {
    backgroundColor: Colors.moss,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  modalCreateText: {
    color: Colors.textOnAccent,
    fontSize: 14,
    fontWeight: '700',
  },

  // ── Photo viewer ──
  photoViewerOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.88)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  photoViewerCard: {
    backgroundColor: Colors.surfaceElevated,
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.clay,
    alignItems: 'center',
  },
  photoViewerImage: {
    height: 360,
    backgroundColor: '#000',
    borderRadius: 8,
    marginBottom: 12,
  },
  photoViewerMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    marginBottom: 6,
  },
  photoViewerAuthor: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  photoViewerDate: {
    fontSize: 11,
    color: Colors.textMuted,
  },
  photoViewerCaption: {
    fontSize: 13,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 12,
  },
  photoViewerClose: {
    backgroundColor: Colors.moss,
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 8,
  },
  photoViewerCloseText: {
    color: Colors.textOnAccent,
    fontSize: 13,
    fontWeight: '700',
  },
});
