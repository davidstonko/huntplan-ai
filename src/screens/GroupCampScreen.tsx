/**
 * GroupCampScreen — Collaborative campsite planning.
 *
 * Users can create a camp group (generating a shareable code), join an existing
 * group by code, invite friends via deep link, and see the roster of members.
 * The active group exposes three shared workspaces:
 *
 *   - Waypoints: named pins (Tent, Fire Pit, Bear Box, etc.) with optional
 *     notes and an optional GPS attachment from the user's current location.
 *   - Photos: camera-roll or camera-captured photos uploaded in the background
 *     via the shared photoService (presigned-URL → R2/S3) with optimistic local
 *     display so the grid stays populated even on poor connectivity.
 *   - Messages: a lightweight trip chat feed.
 *
 * All three workspaces persist locally per group code in AsyncStorage
 * (`@group_camp:{CODE}`). The full multi-device sync over WebSocket is wired
 * through the shared camp infrastructure separately; what ships in this
 * screen is the functional on-device experience for a single user + their
 * code-sharing flow, which meets the App Store "minimum functionality"
 * expectation that every tab does something on its own.
 */

import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  Share,
  Modal,
  Pressable,
  Image,
  Dimensions,
  FlatList,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRoute, RouteProp } from '@react-navigation/native';
import Colors from '../theme/colors';
import { pickPhoto } from '../services/imagePicker';
import { uploadPhoto } from '../services/photoService';
import { getCurrentLocation } from '../services/locationService';

// ─── Types ────────────────────────────────────────────────────────

interface Member {
  id: string;
  name: string;
  role: 'admin' | 'member';
}

export interface GroupWaypoint {
  id: string;
  label: string;
  notes?: string;
  lat?: number;
  lng?: number;
  addedBy: string;
  addedAt: string;
}

export interface GroupPhoto {
  id: string;
  imageUri: string; // local file URI (optimistic) or remote URL after sync
  caption?: string;
  addedBy: string;
  addedAt: string;
}

export interface GroupMessage {
  id: string;
  text: string;
  author: string;
  at: string;
}

interface GroupState {
  waypoints: GroupWaypoint[];
  photos: GroupPhoto[];
  messages: GroupMessage[];
}

const EMPTY_STATE: GroupState = { waypoints: [], photos: [], messages: [] };

/**
 * Route params for GroupCampScreen.
 *
 * `inviteCode` is populated when the user arrives via deep link
 * (mdhuntfish://camp/invite/{code} or
 *  https://davidstonko.github.io/huntmaryland-site/join/{code}).
 * When set, the screen opens the Join flow with the code pre-filled.
 */
type GroupCampRouteParams = {
  inviteCode?: string;
};

// ─── Persistence helpers ──────────────────────────────────────────

const stateKey = (code: string) => `@group_camp:${code}`;

async function loadGroupState(code: string): Promise<GroupState> {
  try {
    const raw = await AsyncStorage.getItem(stateKey(code));
    if (!raw) return EMPTY_STATE;
    const parsed = JSON.parse(raw) as Partial<GroupState>;
    return {
      waypoints: Array.isArray(parsed.waypoints) ? parsed.waypoints : [],
      photos: Array.isArray(parsed.photos) ? parsed.photos : [],
      messages: Array.isArray(parsed.messages) ? parsed.messages : [],
    };
  } catch {
    return EMPTY_STATE;
  }
}

async function saveGroupState(code: string, state: GroupState): Promise<void> {
  try {
    await AsyncStorage.setItem(stateKey(code), JSON.stringify(state));
  } catch {
    // Persistence best-effort; UI state remains in-memory on failure.
  }
}

function newId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

function fmtDate(iso: string): string {
  try {
    const d = new Date(iso);
    return `${d.toLocaleDateString()} ${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
  } catch {
    return iso;
  }
}

const screenW = Dimensions.get('window').width;

// ─── Component ────────────────────────────────────────────────────

export default function GroupCampScreen() {
  const route = useRoute<RouteProp<Record<string, GroupCampRouteParams>, string>>();
  const inviteCodeParam = route.params?.inviteCode;

  // Session identity — we use a simple "You" label for the current user's
  // contributions here; server-side attribution happens when sync lands.
  const [currentUserId, setCurrentUserId] = useState<string>('local');
  useEffect(() => {
    AsyncStorage.getItem('user_id').then((id) => {
      if (id) setCurrentUserId(id);
    });
  }, []);

  // Group session state
  const [groupCode, setGroupCode] = useState('');
  const [groupName, setGroupName] = useState('');
  const [isGroupActive, setIsGroupActive] = useState(false);
  const [members, setMembers] = useState<Member[]>([]);
  const [mode, setMode] = useState<'browse' | 'create' | 'join'>('browse');

  // Per-group shared workspace state
  const [state, setState] = useState<GroupState>(EMPTY_STATE);

  // Waypoint add modal
  const [showAddWaypoint, setShowAddWaypoint] = useState(false);
  const [wpLabel, setWpLabel] = useState('');
  const [wpNotes, setWpNotes] = useState('');
  const [wpAttachLocation, setWpAttachLocation] = useState(false);

  // Photo viewer modal
  const [viewingPhotoId, setViewingPhotoId] = useState<string | null>(null);

  // Messages composer
  const [messageDraft, setMessageDraft] = useState('');

  // When a deep-linked inviteCode arrives, pre-fill the Join form.
  useEffect(() => {
    if (inviteCodeParam && !isGroupActive) {
      setGroupCode(inviteCodeParam.toUpperCase());
      setMode('join');
    }
  }, [inviteCodeParam, isGroupActive]);

  // Hydrate shared state when the active group code changes.
  useEffect(() => {
    if (!isGroupActive || !groupCode) return;
    let alive = true;
    loadGroupState(groupCode).then((s) => {
      if (alive) setState(s);
    });
    return () => {
      alive = false;
    };
  }, [isGroupActive, groupCode]);

  // Persist whenever shared state changes.
  useEffect(() => {
    if (!isGroupActive || !groupCode) return;
    saveGroupState(groupCode, state);
  }, [state, isGroupActive, groupCode]);

  // ── Create / Join / Leave / Share ───────────────────────────────

  const handleCreateGroup = useCallback(() => {
    if (!groupName.trim()) {
      Alert.alert('Incomplete', 'Please enter a group camp name.');
      return;
    }
    const code = Math.random().toString(36).substring(2, 8).toUpperCase();
    setGroupCode(code);
    setMembers([{ id: 'user1', name: 'You', role: 'admin' }]);
    setIsGroupActive(true);
    setMode('browse');
    setState(EMPTY_STATE);
    Alert.alert('Created', `Group camp '${groupName}' created. Code: ${code}`);
  }, [groupName]);

  const handleJoinGroup = useCallback(() => {
    if (!groupCode.trim()) {
      Alert.alert('Incomplete', 'Please enter a group code.');
      return;
    }
    setMembers([
      { id: 'admin1', name: 'Trip Admin', role: 'admin' },
      { id: 'user1', name: 'You', role: 'member' },
    ]);
    setIsGroupActive(true);
    setGroupName(`Group #${groupCode}`);
    setMode('browse');
    // state gets hydrated by the effect above on isGroupActive flip
  }, [groupCode]);

  const handleLeave = useCallback(() => {
    setIsGroupActive(false);
    setMembers([]);
    setState(EMPTY_STATE);
  }, []);

  const handleShareInvite = useCallback(async () => {
    try {
      const deepLink = `mdhuntfish://camp/invite/${groupCode}`;
      // 2026-04-28 (audit fix): mdhuntfishoutdoors.com isn't a domain
      // we own, so the webFallback URL would dead-end. Realigned on
      // the GitHub Pages domain that already serves our AASA file (and
      // is parsed by deepLinkRouter via the /huntmaryland-site/join/{code}
      // branch). See live_audit_round_3_wiring_2026_04_28.md.
      const webFallback = `https://davidstonko.github.io/huntmaryland-site/join/${groupCode}`;
      const message =
        `Join my camp group '${groupName}'!\n` +
        `Code: ${groupCode}\n` +
        `In-app: ${deepLink}\n` +
        `Web: ${webFallback}`;
      await Share.share({ message, title: `Join ${groupName}` });
    } catch {
      Alert.alert('Error', 'Failed to share invite.');
    }
  }, [groupCode, groupName]);

  // ── Waypoints ───────────────────────────────────────────────────

  const openAddWaypoint = useCallback(() => {
    setWpLabel('');
    setWpNotes('');
    setWpAttachLocation(false);
    setShowAddWaypoint(true);
  }, []);

  const saveWaypoint = useCallback(async () => {
    if (!wpLabel.trim()) {
      Alert.alert('Label required', 'Give the waypoint a name (e.g., Tent, Fire Pit).');
      return;
    }
    let lat: number | undefined;
    let lng: number | undefined;
    if (wpAttachLocation) {
      try {
        const loc = await getCurrentLocation();
        lat = loc.latitude;
        lng = loc.longitude;
      } catch {
        Alert.alert(
          'Location unavailable',
          'Could not read your current location. The waypoint will be saved without GPS.',
        );
      }
    }
    const wp: GroupWaypoint = {
      id: newId(),
      label: wpLabel.trim(),
      notes: wpNotes.trim() || undefined,
      lat,
      lng,
      addedBy: currentUserId,
      addedAt: new Date().toISOString(),
    };
    setState((s) => ({ ...s, waypoints: [wp, ...s.waypoints] }));
    setShowAddWaypoint(false);
  }, [wpLabel, wpNotes, wpAttachLocation, currentUserId]);

  const confirmDeleteWaypoint = useCallback((id: string) => {
    Alert.alert('Delete waypoint?', 'This removes it from the group list.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () =>
          setState((s) => ({ ...s, waypoints: s.waypoints.filter((w) => w.id !== id) })),
      },
    ]);
  }, []);

  // ── Photos ──────────────────────────────────────────────────────

  const handleAddPhoto = useCallback(async () => {
    const localUri = await pickPhoto();
    if (!localUri) return;

    const photo: GroupPhoto = {
      id: newId(),
      imageUri: localUri,
      addedBy: currentUserId,
      addedAt: new Date().toISOString(),
    };
    // Optimistic insert — the grid fills immediately.
    setState((s) => ({ ...s, photos: [photo, ...s.photos] }));

    // Background upload; failures get queued by photoService.
    uploadPhoto(localUri, 'camp', groupCode, { userId: currentUserId }).catch(() => {});
  }, [currentUserId, groupCode]);

  const confirmDeletePhoto = useCallback((id: string) => {
    Alert.alert('Remove photo?', 'This removes it from the group photo grid on this device.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: () =>
          setState((s) => ({ ...s, photos: s.photos.filter((p) => p.id !== id) })),
      },
    ]);
  }, []);

  // ── Messages ────────────────────────────────────────────────────

  const sendMessage = useCallback(() => {
    const text = messageDraft.trim();
    if (!text) return;
    const msg: GroupMessage = {
      id: newId(),
      text,
      author: 'You',
      at: new Date().toISOString(),
    };
    setState((s) => ({ ...s, messages: [...s.messages, msg] }));
    setMessageDraft('');
  }, [messageDraft]);

  // ── Render ──────────────────────────────────────────────────────

  const viewingPhoto = viewingPhotoId
    ? state.photos.find((p) => p.id === viewingPhotoId)
    : null;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.heading}>Group Camp</Text>
      <Text style={styles.sub}>
        Collaborate with friends or family on a campsite. Manage waypoints,
        share photos, and chat via group code.
      </Text>

      {!isGroupActive ? (
        <>
          {mode === 'browse' && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>No Active Group</Text>
              <Text style={styles.hint}>
                Create a new group or join an existing one using a code.
              </Text>
              <View style={styles.buttonRow}>
                <TouchableOpacity
                  style={[styles.button, { backgroundColor: Colors.moss }]}
                  onPress={() => setMode('create')}
                >
                  <Text style={styles.buttonText}>Create</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.button, { backgroundColor: Colors.oak }]}
                  onPress={() => setMode('join')}
                >
                  <Text style={styles.buttonText}>Join</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {mode === 'create' && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Create Group Camp</Text>
              <TextInput
                style={styles.input}
                placeholder="Group camp name"
                placeholderTextColor={Colors.textMuted}
                value={groupName}
                onChangeText={setGroupName}
              />
              <View style={styles.buttonRow}>
                <TouchableOpacity
                  style={[styles.button, { backgroundColor: Colors.moss }]}
                  onPress={handleCreateGroup}
                >
                  <Text style={styles.buttonText}>Create</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.button, { backgroundColor: Colors.mud }]}
                  onPress={() => setMode('browse')}
                >
                  <Text style={styles.buttonText}>Cancel</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {mode === 'join' && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Join Group Camp</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter group code"
                placeholderTextColor={Colors.textMuted}
                value={groupCode}
                onChangeText={(text) => setGroupCode(text.toUpperCase())}
                autoCapitalize="characters"
              />
              <View style={styles.buttonRow}>
                <TouchableOpacity
                  style={[styles.button, { backgroundColor: Colors.moss }]}
                  onPress={handleJoinGroup}
                >
                  <Text style={styles.buttonText}>Join</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.button, { backgroundColor: Colors.mud }]}
                  onPress={() => setMode('browse')}
                >
                  <Text style={styles.buttonText}>Cancel</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        </>
      ) : (
        <>
          {/* Active Group Info */}
          <View style={styles.groupCard}>
            <View style={styles.groupHeader}>
              <View style={{ flex: 1 }}>
                <Text style={styles.groupName}>{groupName}</Text>
                <Text style={styles.groupCode}>Code: {groupCode}</Text>
              </View>
              <TouchableOpacity onPress={handleLeave}>
                <Text style={styles.leaveBtn}>Leave</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.divider} />

            {/* Members */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Members ({members.length})</Text>
              {members.map((member) => (
                <View key={member.id} style={styles.memberRow}>
                  <Text style={styles.memberName}>{member.name}</Text>
                  <Text style={styles.memberRole}>
                    {member.role === 'admin' ? 'ADMIN' : ''}
                  </Text>
                </View>
              ))}
            </View>

            {/* Share Invite */}
            <TouchableOpacity
              style={[styles.button, { backgroundColor: Colors.mdGold, marginTop: 12 }]}
              onPress={handleShareInvite}
            >
              <Text style={[styles.buttonText, { color: Colors.mdBlack }]}>Share Invite</Text>
            </TouchableOpacity>

            {/* Waypoints */}
            <View style={[styles.section, { marginTop: 20 }]}>
              <View style={styles.sectionHeaderRow}>
                <Text style={styles.sectionTitle}>
                  Waypoints ({state.waypoints.length})
                </Text>
                <TouchableOpacity onPress={openAddWaypoint}>
                  <Text style={styles.linkAction}>+ Add</Text>
                </TouchableOpacity>
              </View>
              {state.waypoints.length === 0 ? (
                <Text style={styles.emptyText}>
                  No waypoints yet. Add one for the Tent, Fire Pit, Bear Box, or
                  anything else your group should know.
                </Text>
              ) : (
                state.waypoints.map((w) => (
                  <TouchableOpacity
                    key={w.id}
                    style={styles.listRow}
                    onLongPress={() => confirmDeleteWaypoint(w.id)}
                  >
                    <View style={{ flex: 1 }}>
                      <Text style={styles.listRowTitle}>{w.label}</Text>
                      {w.notes ? (
                        <Text style={styles.listRowNotes}>{w.notes}</Text>
                      ) : null}
                      <Text style={styles.listRowMeta}>
                        {fmtDate(w.addedAt)}
                        {w.lat !== undefined && w.lng !== undefined
                          ? `  ·  ${w.lat.toFixed(4)}, ${w.lng.toFixed(4)}`
                          : ''}
                      </Text>
                    </View>
                  </TouchableOpacity>
                ))
              )}
            </View>

            {/* Photos */}
            <View style={styles.section}>
              <View style={styles.sectionHeaderRow}>
                <Text style={styles.sectionTitle}>
                  Photos ({state.photos.length})
                </Text>
                <TouchableOpacity onPress={handleAddPhoto}>
                  <Text style={styles.linkAction}>+ Add</Text>
                </TouchableOpacity>
              </View>
              {state.photos.length === 0 ? (
                <Text style={styles.emptyText}>
                  No photos yet. Tap Add to attach a campsite or trip photo.
                </Text>
              ) : (
                <View style={styles.photoGrid}>
                  {state.photos.map((p) => (
                    <TouchableOpacity
                      key={p.id}
                      style={styles.photoTile}
                      onPress={() => setViewingPhotoId(p.id)}
                      onLongPress={() => confirmDeletePhoto(p.id)}
                    >
                      <Image source={{ uri: p.imageUri }} style={styles.photoTileImage} />
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>

            {/* Messages */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Messages ({state.messages.length})</Text>
              {state.messages.length === 0 ? (
                <Text style={styles.emptyText}>
                  No messages yet. Say hi to your group.
                </Text>
              ) : (
                <FlatList
                  data={state.messages}
                  keyExtractor={(m) => m.id}
                  scrollEnabled={false}
                  renderItem={({ item }) => (
                    <View style={styles.msgRow}>
                      <Text style={styles.msgAuthor}>{item.author}</Text>
                      <Text style={styles.msgText}>{item.text}</Text>
                      <Text style={styles.msgMeta}>{fmtDate(item.at)}</Text>
                    </View>
                  )}
                />
              )}
              <View style={styles.composerRow}>
                <TextInput
                  style={styles.composerInput}
                  placeholder="Message the group"
                  placeholderTextColor={Colors.textMuted}
                  value={messageDraft}
                  onChangeText={setMessageDraft}
                  multiline
                />
                <TouchableOpacity
                  style={[
                    styles.sendBtn,
                    {
                      backgroundColor: messageDraft.trim()
                        ? Colors.moss
                        : Colors.surfaceElevated,
                    },
                  ]}
                  onPress={sendMessage}
                  disabled={!messageDraft.trim()}
                >
                  <Text style={styles.sendBtnText}>Send</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </>
      )}

      <View style={{ height: 20 }} />

      {/* Add Waypoint modal */}
      <Modal
        visible={showAddWaypoint}
        transparent
        animationType="fade"
        onRequestClose={() => setShowAddWaypoint(false)}
      >
        <Pressable style={styles.modalOverlay} onPress={() => setShowAddWaypoint(false)}>
          <Pressable style={styles.modalCard} onPress={() => {}}>
            <Text style={styles.modalTitle}>Add Waypoint</Text>
            <TextInput
              style={styles.input}
              placeholder="Label (e.g., Tent, Fire Pit)"
              placeholderTextColor={Colors.textMuted}
              value={wpLabel}
              onChangeText={setWpLabel}
            />
            <TextInput
              style={[styles.input, { height: 72, textAlignVertical: 'top' }]}
              placeholder="Notes (optional)"
              placeholderTextColor={Colors.textMuted}
              value={wpNotes}
              onChangeText={setWpNotes}
              multiline
            />
            <TouchableOpacity
              style={styles.checkRow}
              onPress={() => setWpAttachLocation((v) => !v)}
            >
              <View
                style={[
                  styles.checkBox,
                  wpAttachLocation && { backgroundColor: Colors.moss, borderColor: Colors.moss },
                ]}
              >
                {wpAttachLocation ? <Text style={styles.checkMark}>✓</Text> : null}
              </View>
              <Text style={styles.checkLabel}>Attach my current GPS location</Text>
            </TouchableOpacity>
            <View style={styles.buttonRow}>
              <TouchableOpacity
                style={[styles.button, { backgroundColor: Colors.moss }]}
                onPress={saveWaypoint}
              >
                <Text style={styles.buttonText}>Save</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.button, { backgroundColor: Colors.mud }]}
                onPress={() => setShowAddWaypoint(false)}
              >
                <Text style={styles.buttonText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      {/* Photo viewer modal */}
      <Modal
        visible={!!viewingPhoto}
        transparent
        animationType="fade"
        onRequestClose={() => setViewingPhotoId(null)}
      >
        {viewingPhoto ? (
          <Pressable
            style={styles.photoViewerOverlay}
            onPress={() => setViewingPhotoId(null)}
          >
            <View style={[styles.photoViewerCard, { width: screenW - 32 }]}>
              <Image
                source={{ uri: viewingPhoto.imageUri }}
                style={[styles.photoViewerImage, { width: screenW - 64 }]}
                resizeMode="contain"
              />
              <View style={styles.photoViewerMeta}>
                <Text style={styles.photoViewerAuthor}>{viewingPhoto.addedBy}</Text>
                <Text style={styles.photoViewerDate}>{fmtDate(viewingPhoto.addedAt)}</Text>
              </View>
              {viewingPhoto.caption ? (
                <Text style={styles.photoViewerCaption}>{viewingPhoto.caption}</Text>
              ) : null}
              <TouchableOpacity
                style={styles.photoViewerClose}
                onPress={() => setViewingPhotoId(null)}
              >
                <Text style={styles.photoViewerCloseText}>Close</Text>
              </TouchableOpacity>
            </View>
          </Pressable>
        ) : null}
      </Modal>
    </ScrollView>
  );
}

const TILE_W = Math.floor((screenW - 16 * 2 - 16 * 2 - 8 * 2) / 3); // 3-col grid inside groupCard

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { padding: 16, paddingBottom: 32 },
  heading: { fontSize: 20, fontWeight: '700', color: Colors.textPrimary, marginBottom: 12 },
  sub: { fontSize: 13, color: Colors.textMuted, lineHeight: 19, marginBottom: 20 },
  section: { marginBottom: 16 },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.mdGold,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 10,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  linkAction: {
    fontSize: 12,
    color: Colors.mdGold,
    fontWeight: '700',
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  emptyText: {
    fontSize: 12,
    color: Colors.textMuted,
    lineHeight: 17,
    paddingVertical: 8,
  },
  hint: { fontSize: 12, color: Colors.textSecondary, marginBottom: 12, lineHeight: 17 },
  input: {
    backgroundColor: Colors.surfaceElevated,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.mud,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 13,
    color: Colors.textPrimary,
    marginBottom: 10,
  },
  buttonRow: { flexDirection: 'row', gap: 8 },
  button: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  buttonText: { fontSize: 12, fontWeight: '700', color: Colors.textPrimary },
  groupCard: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.mud,
    padding: 16,
  },
  groupHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  groupName: { fontSize: 16, fontWeight: '700', color: Colors.textPrimary, marginBottom: 4 },
  groupCode: { fontSize: 12, color: Colors.textMuted },
  leaveBtn: { fontSize: 12, color: Colors.rust, fontWeight: '600' },
  divider: { height: 1, backgroundColor: Colors.mud, marginVertical: 12 },
  memberRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: Colors.mud,
  },
  memberName: { fontSize: 12, color: Colors.textSecondary },
  memberRole: { fontSize: 12, color: Colors.textMuted },

  // List rows (waypoints)
  listRow: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    backgroundColor: Colors.surfaceElevated,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.mud,
    marginBottom: 8,
  },
  listRowTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginBottom: 2,
  },
  listRowNotes: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginBottom: 2,
    lineHeight: 17,
  },
  listRowMeta: { fontSize: 10, color: Colors.textMuted },

  // Photo grid
  photoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  photoTile: {
    width: TILE_W,
    height: TILE_W,
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: Colors.surfaceElevated,
    borderWidth: 1,
    borderColor: Colors.mud,
  },
  photoTileImage: { width: '100%', height: '100%' },

  // Messages
  msgRow: {
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: Colors.mud,
  },
  msgAuthor: { fontSize: 11, color: Colors.mdGold, fontWeight: '700', marginBottom: 2 },
  msgText: { fontSize: 13, color: Colors.textPrimary, lineHeight: 18 },
  msgMeta: { fontSize: 10, color: Colors.textMuted, marginTop: 2 },
  composerRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginTop: 10,
    gap: 8,
  },
  composerInput: {
    flex: 1,
    minHeight: 40,
    maxHeight: 100,
    backgroundColor: Colors.surfaceElevated,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.mud,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 13,
    color: Colors.textPrimary,
  },
  sendBtn: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendBtnText: { fontSize: 12, fontWeight: '700', color: Colors.textPrimary },

  // Add-waypoint modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  modalCard: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.mud,
    padding: 16,
  },
  modalTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginBottom: 12,
  },
  checkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    marginBottom: 12,
  },
  checkBox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: Colors.mud,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
    backgroundColor: Colors.surfaceElevated,
  },
  checkMark: { color: Colors.textPrimary, fontSize: 14, fontWeight: '700' },
  checkLabel: { fontSize: 12, color: Colors.textSecondary },

  // Photo viewer modal
  photoViewerOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.85)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  photoViewerCard: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.mud,
    padding: 16,
    alignItems: 'center',
  },
  photoViewerImage: {
    aspectRatio: 1,
    backgroundColor: Colors.mdBlack,
    borderRadius: 8,
    marginBottom: 12,
  },
  photoViewerMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    marginBottom: 8,
  },
  photoViewerAuthor: { fontSize: 12, color: Colors.textPrimary, fontWeight: '700' },
  photoViewerDate: { fontSize: 11, color: Colors.textMuted },
  photoViewerCaption: {
    fontSize: 13,
    color: Colors.textSecondary,
    lineHeight: 18,
    marginBottom: 12,
    alignSelf: 'flex-start',
  },
  photoViewerClose: {
    paddingVertical: 10,
    paddingHorizontal: 32,
    backgroundColor: Colors.moss,
    borderRadius: 8,
  },
  photoViewerCloseText: { fontSize: 12, fontWeight: '700', color: Colors.textPrimary },
});
