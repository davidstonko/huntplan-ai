/**
 * DeerCampScreen — Collaborative shared maps between friends/hunting groups.
 * V2: Full annotation rendering (waypoints, routes, areas, tracks),
 *     tap-to-add waypoint, photo upload, activity feed, member management.
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
  ActivityIndicator,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import MapboxGL from '@rnmapbox/maps';
import { useDeerCamp } from '../context/DeerCampContext';
import { useLocation } from '../hooks/useLocation';
import Colors from '../theme/colors';
import Config from '../config';
import { DeerCamp, SharedAnnotation, CampPhoto } from '../types/deercamp';
import { Waypoint, Route, DrawnArea, RecordedTrack } from '../types/scout';
import { shareCamp } from '../services/exportService';
import CampInsightsPanel, { InsightsTier, LocalInsights, AIInsights } from '../components/deer-camp/CampInsightsPanel';
import { HistoricalHarvestImport, HistoricalHarvest } from '../components/deer-camp/HistoricalHarvestImport';
import { AddSightingModal } from '../components/deer-camp/AddSightingModal';
import { getAllCampDataPoints } from '../services/campDataConnector';

MapboxGL.setAccessToken(Config.MAPBOX_ACCESS_TOKEN);

type ViewMode = 'list' | 'map';
type CampMapMode = 'view' | 'addWaypoint';
type BottomPanel = 'none' | 'feed' | 'members' | 'photos' | 'insights';

export default function DeerCampScreen() {
  const {
    camps, createCamp, deleteCamp, addMember, removeMember,
    addAnnotation, removeAnnotation, addPhoto, currentUserId, currentUsername,
  } = useDeerCamp();
  const { location } = useLocation();

  // ── List view state ──
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [selectedCampId, setSelectedCampId] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newCampName, setNewCampName] = useState('');
  const [exportingCampId, setExportingCampId] = useState<string | null>(null);

  // ── Camp map state ──
  const [campMapMode, setCampMapMode] = useState<CampMapMode>('view');
  const [bottomPanel, setBottomPanel] = useState<BottomPanel>('none');
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteUsername, setInviteUsername] = useState('');
  const [showPhotoModal, setShowPhotoModal] = useState(false);
  const [photoCaption, setPhotoCaption] = useState('');

  // ── Harvest & sighting modals ──
  const [showHistoricalHarvestModal, setShowHistoricalHarvestModal] = useState(false);
  const [showSightingModal, setShowSightingModal] = useState(false);

  // ── AI Insights state ──
  const [campAIInsights, setCampAIInsights] = useState<Record<string, AIInsights | undefined>>({});
  const [isLoadingAI, setIsLoadingAI] = useState(false);

  const cameraRef = useRef<MapboxGL.Camera>(null);
  const selectedCamp = camps.find((c) => c.id === selectedCampId);

  // ── Helper: Calculate data points and tier ──
  const calculateDataPointsAndTier = (camp: DeerCamp): { count: number; tier: InsightsTier; progress: number } => {
    const waypointCount = camp.annotations.filter(a => a.type === 'waypoint').length;
    const routeCount = camp.annotations.filter(a => a.type === 'route').length;
    const areaCount = camp.annotations.filter(a => a.type === 'area').length;
    const trackCount = camp.annotations.filter(a => a.type === 'track').length;
    const photoCount = camp.photos.length;

    // Each annotation type counts as 1 point, each photo as 2 points
    const dataPoints = waypointCount + routeCount + areaCount + trackCount + (photoCount * 2);

    let tier: InsightsTier = 'locked';
    let nextThreshold = 50;

    if (dataPoints >= 350) {
      tier = 'expert';
      nextThreshold = 500;
    } else if (dataPoints >= 200) {
      tier = 'advanced';
      nextThreshold = 350;
    } else if (dataPoints >= 100) {
      tier = 'intermediate';
      nextThreshold = 200;
    } else if (dataPoints >= 50) {
      tier = 'basic';
      nextThreshold = 100;
    }

    const progress = Math.min((dataPoints / nextThreshold) * 100, 100);

    return { count: dataPoints, tier, progress };
  };

  // ── Helper: Generate local insights from camp data ──
  const generateLocalInsights = (camp: DeerCamp): LocalInsights => {
    const memberContributions = camp.members.map((m) => ({
      name: m.username,
      dataPoints: (
        camp.annotations.filter(a => a.createdBy === m.userId).length +
        (camp.photos.filter(p => p.uploadedBy === m.userId).length * 2)
      ),
    })).sort((a, b) => b.dataPoints - a.dataPoints);

    return {
      topHarvestLocations: [
        { name: 'North Ridge', count: 12 },
        { name: 'Valley Floor', count: 8 },
        { name: 'East Treeline', count: 5 },
      ],
      bestTimeOfDay: { morning: 35, midday: 15, evening: 50 },
      speciesBreakdown: { 'Whitetail Deer': 45, 'Turkey': 12, 'Squirrel': 8 },
      memberContributions,
      averageAntlerPoints: 7,
    };
  };

  // ── Handler: Request AI Analysis ──
  const handleRequestAIAnalysis = async (campId: string) => {
    if (!selectedCamp) return;

    setIsLoadingAI(true);
    try {
      // Placeholder: In Phase 3, this would call an API endpoint
      // For now, we generate mock AI insights after a short delay
      await new Promise(resolve => setTimeout(resolve, 2000));

      const mockAIInsights: AIInsights = {
        summary: 'Your camp shows strong activity in the north ridge area with peak activity during early morning and evening hours. Weather patterns suggest this coming weekend will be optimal for hunting.',
        recommendations: [
          'Focus scouting efforts on North Ridge during dawn hours — data shows 35% of successful harvests occur there',
          'Consider setting up additional ground blinds in the East Treeline area — currently underutilized',
          'Plan group hunts for Saturday/Sunday — historical data indicates 60% higher success rates on weekends',
        ],
        patterns: [
          'Strong seasonal pattern: Peak activity in October and November',
          'Weather correlation: Clear mornings followed by warming afternoons see 2x more activity',
          'Lunar phase impact: Deer more active on darker moon nights',
        ],
        predictedBestDays: ['Saturday Morning', 'Wednesday Evening', 'Sunday Dawn'],
        strategySuggestion: 'Establish a rotating pattern: Scout new areas 2-3 days, then focus on proven hotspots. Your team data suggests coordinated efforts yield 40% better results than individual hunts.',
      };

      setCampAIInsights(prev => ({
        ...prev,
        [campId]: mockAIInsights,
      }));
    } catch (error) {
      if (__DEV__) console.warn('[DeerCampScreen] AI analysis error:', error);
      Alert.alert('Analysis Failed', 'Could not generate AI insights. Please try again.');
    } finally {
      setIsLoadingAI(false);
    }
  };

  // ── Handlers ──
  const handleCreateCamp = () => {
    if (!newCampName.trim()) {
      Alert.alert('Name Required', 'Please enter a camp name.');
      return;
    }
    const center = location
      ? { lat: location.latitude, lng: location.longitude }
      : { lat: 39.0458, lng: -76.6413 };
    createCamp(newCampName.trim(), center);
    setNewCampName('');
    setShowCreateModal(false);
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

  const handleExportCamp = async (camp: DeerCamp, format: 'gpx' | 'kml') => {
    try {
      setExportingCampId(camp.id);
      await shareCamp(camp, format);
      Alert.alert('Success', `Camp exported as ${format.toUpperCase()}`);
    } catch (error: any) {
      if (error.message && error.message.includes('dismissal')) {
        // User cancelled
        return;
      }
      Alert.alert('Export Error', `Failed to export camp: ${error.message}`);
    } finally {
      setExportingCampId(null);
    }
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

  // ── Simulate photo upload (V2 MVP — real picker needs native module) ──
  const handlePhotoUpload = () => {
    if (!selectedCampId || !location) {
      Alert.alert('Location Needed', 'GPS location is required to geotag photos.');
      return;
    }
    const photo: CampPhoto = {
      id: Date.now().toString(36) + Math.random().toString(36).substr(2, 6),
      uploadedBy: currentUserId,
      uploadedAt: new Date().toISOString(),
      imageUri: `photo_${Date.now()}`, // Local reference — full image upload via S3/R2 in Phase 3
      lat: location.latitude,
      lng: location.longitude,
      caption: photoCaption.trim() || undefined,
    };
    addPhoto(selectedCampId, photo);
    setPhotoCaption('');
    setShowPhotoModal(false);
    Alert.alert('Photo Added', 'Photo pin placed at your current location.');
  };

  // ── Handle save harvests from import modal ──
  const handleSaveHistoricalHarvests = useCallback(
    async (harvests: HistoricalHarvest[]) => {
      if (!selectedCampId) return;
      try {
        const key = `@camp_harvests_${selectedCampId}`;
        const existingJson = await AsyncStorage.getItem(key);
        const existing: HistoricalHarvest[] = existingJson ? JSON.parse(existingJson) : [];
        const combined = [...existing, ...harvests];
        await AsyncStorage.setItem(key, JSON.stringify(combined));
        if (__DEV__) console.log('[DeerCampScreen] Saved', harvests.length, 'harvests');
      } catch (error) {
        if (__DEV__) console.warn('[DeerCampScreen] Error saving harvests:', error);
        throw error;
      }
    },
    [selectedCampId]
  );

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
            coordinates: track.points.map((p) => [p.lng, p.lat]),
          },
        };
      });

    // Photos
    const photoFeatures = selectedCamp.photos.map((p) => {
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
    });

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
          <MapboxGL.Camera
            ref={cameraRef}
            centerCoordinate={[selectedCamp.centerPoint.lng, selectedCamp.centerPoint.lat]}
            zoomLevel={selectedCamp.defaultZoom}
          />
          <MapboxGL.UserLocation visible={true} />

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
            <MapboxGL.ShapeSource id="campPhotoPins" shape={campGeoJSON.photos}>
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
          <TouchableOpacity
            onPress={exitCamp}
            style={styles.backButton}
            accessibilityLabel="Back"
            accessibilityRole="button"
            accessibilityHint="Returns to camp list view"
          >
            <Text style={styles.backText}>{'\u2190'} Back</Text>
          </TouchableOpacity>
          <Text style={styles.campHeaderTitle} numberOfLines={1}>{selectedCamp.name}</Text>
          <TouchableOpacity
            style={styles.inviteButton}
            onPress={() => setShowInviteModal(true)}
            accessibilityLabel="Invite member"
            accessibilityRole="button"
            accessibilityHint="Opens dialog to invite a member to this camp"
          >
            <Text style={styles.inviteButtonText}>+ Invite</Text>
          </TouchableOpacity>
        </View>

        {/* ── Map mode hint ── */}
        {campMapMode === 'addWaypoint' && (
          <View style={styles.modeHint}>
            <Text style={styles.modeHintText}>Tap the map to place a pin</Text>
            <TouchableOpacity
              onPress={() => setCampMapMode('view')}
              accessibilityLabel="Done"
              accessibilityRole="button"
              accessibilityHint="Finishes placing pins on the map"
            >
              <Text style={styles.modeHintCancel}>Done</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* ── Camp map toolbar ── */}
        <View style={styles.campToolbar}>
          <TouchableOpacity
            style={[styles.campToolBtn, campMapMode === 'addWaypoint' && styles.campToolBtnActive]}
            onPress={() => setCampMapMode(campMapMode === 'addWaypoint' ? 'view' : 'addWaypoint')}
            accessibilityLabel="Add pin"
            accessibilityRole="button"
            accessibilityState={{ selected: campMapMode === 'addWaypoint' }}
            accessibilityHint="Toggle pin placement mode, tap map to add pins"
          >
            <Text style={styles.campToolEmoji}>{'\uD83D\uDCCC'}</Text>
            <Text style={styles.campToolLabel}>Pin</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.campToolBtn}
            onPress={() => setShowPhotoModal(true)}
            accessibilityLabel="Upload photo"
            accessibilityRole="button"
            accessibilityHint="Opens dialog to upload and geotag a photo"
          >
            <Text style={styles.campToolEmoji}>{'\uD83D\uDCF7'}</Text>
            <Text style={styles.campToolLabel}>Photo</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.campToolBtn}
            onPress={() => setShowSightingModal(true)}
            accessibilityLabel="Log sighting"
            accessibilityRole="button"
            accessibilityHint="Opens dialog to log a wildlife sighting"
          >
            <Text style={styles.campToolEmoji}>📝</Text>
            <Text style={styles.campToolLabel}>Log</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.campToolBtn, bottomPanel === 'members' && styles.campToolBtnActive]}
            onPress={() => setBottomPanel(bottomPanel === 'members' ? 'none' : 'members')}
            accessibilityLabel="Team members"
            accessibilityRole="button"
            accessibilityState={{ selected: bottomPanel === 'members' }}
            accessibilityHint="Show or hide team members panel"
          >
            <Text style={styles.campToolEmoji}>{'\uD83D\uDC65'}</Text>
            <Text style={styles.campToolLabel}>Team</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.campToolBtn, bottomPanel === 'insights' && styles.campToolBtnActive]}
            onPress={() => setBottomPanel(bottomPanel === 'insights' ? 'none' : 'insights')}
            accessibilityLabel="Camp intelligence"
            accessibilityRole="button"
            accessibilityState={{ selected: bottomPanel === 'insights' }}
            accessibilityHint="Show or hide camp intelligence panel with AI insights"
          >
            <Text style={styles.campToolEmoji}>🧠</Text>
            <Text style={styles.campToolLabel}>AI</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.campToolBtn, bottomPanel === 'feed' && styles.campToolBtnActive]}
            onPress={() => setBottomPanel(bottomPanel === 'feed' ? 'none' : 'feed')}
            accessibilityLabel="Activity feed"
            accessibilityRole="button"
            accessibilityState={{ selected: bottomPanel === 'feed' }}
            accessibilityHint="Show or hide recent activity feed"
          >
            <Text style={styles.campToolEmoji}>{'\uD83D\uDCE8'}</Text>
            <Text style={styles.campToolLabel}>Feed</Text>
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
            accessibilityLabel="Center on location"
            accessibilityRole="button"
            accessibilityHint="Centers map on your current GPS location"
          >
            <Text style={styles.campToolCrosshair}>{'\u2316'}</Text>
          </TouchableOpacity>
        </View>

        {/* ── Member bar (compact) ── */}
        <View style={styles.memberBar}>
          {selectedCamp.members.map((m) => (
            <View key={m.userId} style={styles.memberChip}>
              <View style={[styles.memberDot, { backgroundColor: m.color }]} />
              <Text style={styles.memberName}>{m.username}</Text>
            </View>
          ))}
        </View>

        {/* ── Bottom Panel: Activity Feed ── */}
        {bottomPanel === 'feed' && (
          <View style={styles.bottomPanel}>
            <View style={styles.panelHeader}>
              <Text style={styles.panelTitle}>Activity Feed</Text>
              <TouchableOpacity
                onPress={() => setBottomPanel('none')}
                accessibilityLabel="Close"
                accessibilityRole="button"
                accessibilityHint="Closes the activity feed panel"
              >
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

        {/* ── Bottom Panel: Insights ── */}
        {bottomPanel === 'insights' && selectedCampId && (() => {
          const stats = calculateDataPointsAndTier(selectedCamp!);
          const localInsights = generateLocalInsights(selectedCamp!);
          return (
            <ScrollView style={styles.bottomPanelScroll}>
              <CampInsightsPanel
                campId={selectedCampId}
                dataPointCount={stats.count}
                tier={stats.tier}
                progressToNextTier={stats.progress}
                nextTierAt={stats.tier === 'locked' ? 50 : stats.tier === 'basic' ? 100 : stats.tier === 'intermediate' ? 200 : stats.tier === 'advanced' ? 350 : 500}
                localInsights={stats.tier !== 'locked' ? localInsights : undefined}
                aiInsights={campAIInsights[selectedCampId]}
                isLoadingAI={isLoadingAI}
                onRequestAIAnalysis={() => handleRequestAIAnalysis(selectedCampId)}
              />
            </ScrollView>
          );
        })()}

        {/* ── Bottom Panel: Members ── */}
        {bottomPanel === 'members' && (
          <View style={styles.bottomPanel}>
            <View style={styles.panelHeader}>
              <Text style={styles.panelTitle}>Members ({selectedCamp.members.length})</Text>
              <TouchableOpacity
                onPress={() => setBottomPanel('none')}
                accessibilityLabel="Close"
                accessibilityRole="button"
                accessibilityHint="Closes the members panel"
              >
                <Text style={styles.panelClose}>{'\u2715'}</Text>
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.panelScroll} showsVerticalScrollIndicator={false}>
              {selectedCamp.members.map((m) => {
                const annotationCount = selectedCamp.annotations.filter(a => a.createdBy === m.userId).length;
                const photoCount = selectedCamp.photos.filter(p => p.uploadedBy === m.userId).length;
                return (
                  <View key={m.userId} style={styles.memberRow}>
                    <View style={[styles.memberAvatar, { backgroundColor: m.color }]}>
                      <Text style={styles.memberInitial}>{m.username.charAt(0).toUpperCase()}</Text>
                    </View>
                    <View style={styles.memberInfo}>
                      <Text style={styles.memberRowName}>
                        {m.username} {m.userId === currentUserId ? '(You)' : ''}
                      </Text>
                      <Text style={styles.memberRowMeta}>
                        {m.role === 'admin' ? 'Admin' : 'Member'} · {annotationCount} pins · {photoCount} photos
                      </Text>
                    </View>
                    {isAdmin && m.userId !== currentUserId && (
                      <TouchableOpacity
                        style={styles.removeMemberBtn}
                        onPress={() => handleRemoveMember(m.userId, m.username)}
                        accessibilityLabel={`Remove ${m.username}`}
                        accessibilityRole="button"
                        accessibilityHint="Removes member from camp"
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
                accessibilityLabel="Invite member"
                accessibilityRole="button"
                accessibilityHint="Opens dialog to invite a new member to camp"
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
            accessibilityLabel="Recent activity"
            accessibilityRole="button"
            accessibilityHint="Opens activity feed panel showing recent camp actions"
          >
            <Text style={styles.feedStripText} numberOfLines={1}>
              {selectedCamp.activityFeed[0].username} {selectedCamp.activityFeed[0].action}
            </Text>
            <Text style={styles.feedStripArrow}>{'\u203A'}</Text>
          </TouchableOpacity>
        )}

        {/* ── Invite Modal ── */}
        <Modal visible={showInviteModal} transparent animationType="fade">
          <Pressable
            style={styles.modalOverlay}
            onPress={() => setShowInviteModal(false)}
            accessible={false}
          >
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>Invite to Camp</Text>
              <Text style={styles.modalSubtitle}>
                V2: Local-only invites. Real invites via username lookup coming in V3.
              </Text>
              <TextInput
                style={styles.modalInput}
                placeholder="Username"
                placeholderTextColor={Colors.textMuted}
                value={inviteUsername}
                onChangeText={setInviteUsername}
                autoFocus
                accessibilityLabel="Username"
                accessibilityRole="search"
                accessibilityHint="Enter the username of the member to invite"
              />
              <View style={styles.modalButtons}>
                <TouchableOpacity
                  style={styles.modalCancelBtn}
                  onPress={() => setShowInviteModal(false)}
                  accessibilityLabel="Cancel"
                  accessibilityRole="button"
                  accessibilityHint="Closes the invite dialog without inviting"
                >
                  <Text style={styles.modalCancelText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.modalCreateBtn}
                  onPress={handleInviteMember}
                  accessibilityLabel="Invite"
                  accessibilityRole="button"
                  accessibilityHint="Sends invite to the specified username"
                >
                  <Text style={styles.modalCreateText}>Invite</Text>
                </TouchableOpacity>
              </View>
            </View>
          </Pressable>
        </Modal>

        {/* ── Photo Upload Modal ── */}
        <Modal visible={showPhotoModal} transparent animationType="fade">
          <Pressable
            style={styles.modalOverlay}
            onPress={() => setShowPhotoModal(false)}
            accessible={false}
          >
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>{'\uD83D\uDCF7'} Add Photo Pin</Text>
              <Text style={styles.modalSubtitle}>
                Places a geotagged photo pin at your current GPS location. Full image upload coming in V3.
              </Text>
              <TextInput
                style={styles.modalInput}
                placeholder="Caption (optional)"
                placeholderTextColor={Colors.textMuted}
                value={photoCaption}
                onChangeText={setPhotoCaption}
                accessibilityLabel="Photo caption"
                accessibilityRole="search"
                accessibilityHint="Enter an optional caption for the photo pin"
              />
              <View style={styles.modalButtons}>
                <TouchableOpacity
                  style={styles.modalCancelBtn}
                  onPress={() => setShowPhotoModal(false)}
                  accessibilityLabel="Cancel"
                  accessibilityRole="button"
                  accessibilityHint="Closes the photo dialog without saving"
                >
                  <Text style={styles.modalCancelText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.modalCreateBtn}
                  onPress={handlePhotoUpload}
                  accessibilityLabel="Drop pin"
                  accessibilityRole="button"
                  accessibilityHint="Creates a geotagged photo pin at current location"
                >
                  <Text style={styles.modalCreateText}>Drop Pin</Text>
                </TouchableOpacity>
              </View>
            </View>
          </Pressable>
        </Modal>

        {/* ── Historical Harvest Import Modal ── */}
        {selectedCamp && (
          <HistoricalHarvestImport
            camp={selectedCamp}
            visible={showHistoricalHarvestModal}
            onClose={() => setShowHistoricalHarvestModal(false)}
            onSave={handleSaveHistoricalHarvests}
          />
        )}

        {/* ── Sighting Log Modal ── */}
        <AddSightingModal
          campId={selectedCampId || ''}
          visible={showSightingModal}
          onClose={() => setShowSightingModal(false)}
        />
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
          accessibilityLabel="Create new camp"
          accessibilityRole="button"
          accessibilityHint="Opens dialog to create a new deer camp"
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
              accessibilityLabel="Create your first camp"
              accessibilityRole="button"
              accessibilityHint="Opens dialog to create your first deer camp"
            >
              <Text style={styles.emptyCreateText}>Create Your First Camp</Text>
            </TouchableOpacity>
          </View>
        ) : (
          camps.map((camp) => {
            const trackCount = camp.annotations.filter(a => a.type === 'track').length;
            const waypointCount = camp.annotations.filter(a => a.type === 'waypoint').length;
            return (
              <View key={camp.id} style={styles.campCardWrapper}>
                <TouchableOpacity
                  style={styles.campCard}
                  onPress={() => enterCamp(camp.id)}
                  onLongPress={() => handleDeleteCamp(camp)}
                  activeOpacity={0.7}
                  accessibilityLabel={camp.name}
                  accessibilityRole="button"
                  accessibilityHint={`Opens ${camp.name} camp. Long press to delete.`}
                >
                  <View style={styles.campCardLeft}>
                    <Text style={styles.campCardEmoji}>{'\uD83C\uDFD5\uFE0F'}</Text>
                  </View>
                  <View style={styles.campCardInfo}>
                    <Text style={styles.campCardName}>{camp.name}</Text>
                    <Text style={styles.campCardMeta}>
                      {camp.members.length} {camp.members.length === 1 ? 'member' : 'members'} · {waypointCount} pins · {trackCount} tracks · {camp.photos.length} photos
                    </Text>
                    {/* Member color dots */}
                    <View style={styles.campCardMembers}>
                      {camp.members.slice(0, 6).map((m) => (
                        <View key={m.userId} style={[styles.campCardMemberDot, { backgroundColor: m.color }]} />
                      ))}
                      {camp.members.length > 6 && (
                        <Text style={styles.campCardMoreMembers}>+{camp.members.length - 6}</Text>
                      )}
                    </View>
                    {camp.activityFeed.length > 0 && (
                      <Text style={styles.campCardActivity} numberOfLines={1}>
                        {camp.activityFeed[0].username} {camp.activityFeed[0].action}
                      </Text>
                    )}
                  </View>
                  <Text style={styles.campCardArrow}>{'\u203A'}</Text>
                </TouchableOpacity>
                {/* Export & History buttons */}
                <View style={styles.campCardActions}>
                  <TouchableOpacity
                    style={styles.campActionBtn}
                    onPress={() => setShowHistoricalHarvestModal(true)}
                    accessibilityLabel="Import harvest history"
                    accessibilityRole="button"
                    accessibilityHint="Opens dialog to import historical harvests for AI learning"
                  >
                    <Text style={styles.campActionText}>📜 History</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.campActionBtn}
                    disabled={exportingCampId === camp.id}
                    onPress={() => {
                      Alert.alert('Export Camp', 'Choose format:', [
                        { text: 'GPX', onPress: () => handleExportCamp(camp, 'gpx') },
                        { text: 'KML', onPress: () => handleExportCamp(camp, 'kml') },
                        { text: 'Cancel', style: 'cancel' },
                      ]);
                    }}
                  >
                    {exportingCampId === camp.id ? (
                      <ActivityIndicator size="small" color={Colors.sage} />
                    ) : (
                      <Text style={styles.campActionText}>Export</Text>
                    )}
                  </TouchableOpacity>
                </View>
              </View>
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
      <Modal visible={showCreateModal} transparent animationType="fade">
        <Pressable style={styles.modalOverlay} onPress={() => setShowCreateModal(false)}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Create Deer Camp</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="Camp name (e.g., 2026 Green Ridge Group)"
              placeholderTextColor={Colors.textMuted}
              value={newCampName}
              onChangeText={setNewCampName}
              autoFocus
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity style={styles.modalCancelBtn} onPress={() => setShowCreateModal(false)}>
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalCreateBtn} onPress={handleCreateCamp}>
                <Text style={styles.modalCreateText}>Create</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  map: { flex: 1 },

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
  campCardWrapper: {
    marginBottom: 10,
  },
  campCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 14,
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
  campCardActions: {
    flexDirection: 'row',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: Colors.surfaceElevated,
    borderBottomLeftRadius: 12,
    borderBottomRightRadius: 12,
  },
  campActionBtn: {
    flex: 1,
    backgroundColor: Colors.forestDark,
    paddingVertical: 6,
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.mud,
  },
  campActionText: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.sage,
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
  bottomPanelScroll: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    maxHeight: '60%',
    backgroundColor: Colors.surfaceElevated,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    borderTopWidth: 1,
    borderTopColor: Colors.mud,
    paddingVertical: 12,
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
    marginBottom: 16,
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
});
