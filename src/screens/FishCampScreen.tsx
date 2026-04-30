/**
 * FishCampScreen — Collaborative fishing groups for sharing spots and catch reports.
 * V2: Full implementation with group management, shared spots, and activity feed.
 *
 * Mirrors DeerCampScreen pattern but fishing-focused:
 * - Create/join fishing groups
 * - Share fishing spots with group
 * - Activity feed of catches and shared locations
 * - Member management with fishing avatars
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  Modal,
  Share,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Colors from '../theme/colors';
import CampChat from '../components/deer-camp/CampChat';

// ── Types ──
interface FishCampMember {
  id: string;
  name: string;
  color: string;
  joinedAt: string;
}

interface FishCampActivity {
  id: string;
  memberId: string;
  memberName: string;
  type: 'catch' | 'spot' | 'join' | 'note';
  text: string;
  timestamp: string;
}

interface FishCamp {
  id: string;
  name: string;
  createdAt: string;
  members: FishCampMember[];
  activities: FishCampActivity[];
  inviteCode: string;
}

const STORAGE_KEY = '@fish_camps';
// Member-unique avatar colors (intentionally not theme-derived for visual distinction per member)
const MEMBER_COLORS = ['#1565C0', '#2E7D32', '#EF6C00', '#6A1B9A', '#C62828', '#00695C'];

function generateId(): string {
  return `fc_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
}

function generateInviteCode(): string {
  return Math.random().toString(36).substr(2, 6).toUpperCase();
}

export default function FishCampScreen() {
  const [camps, setCamps] = useState<FishCamp[]>([]);
  const [selectedCamp, setSelectedCamp] = useState<FishCamp | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [showAddMember, setShowAddMember] = useState(false);
  const [showLogActivity, setShowLogActivity] = useState(false);
  const [newCampName, setNewCampName] = useState('');
  const [newMemberName, setNewMemberName] = useState('');
  const [activityText, setActivityText] = useState('');
  const [activityType, setActivityType] = useState<'catch' | 'spot' | 'note'>('catch');
  const [showChat, setShowChat] = useState(false);

  // Load from AsyncStorage
  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((data) => {
      if (data) setCamps(JSON.parse(data));
    });
  }, []);

  const persist = async (updated: FishCamp[]) => {
    setCamps(updated);
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  };

  // ── Create Camp ──
  const handleCreate = async () => {
    if (!newCampName.trim()) {
      Alert.alert('Name Required', 'Give your fishing group a name.');
      return;
    }
    const camp: FishCamp = {
      id: generateId(),
      name: newCampName.trim(),
      createdAt: new Date().toISOString(),
      members: [
        {
          id: 'me',
          name: 'You (Admin)',
          color: MEMBER_COLORS[0],
          joinedAt: new Date().toISOString(),
        },
      ],
      activities: [
        {
          id: generateId(),
          memberId: 'me',
          memberName: 'You',
          type: 'join',
          text: 'created the group',
          timestamp: new Date().toISOString(),
        },
      ],
      inviteCode: generateInviteCode(),
    };
    await persist([...camps, camp]);
    setNewCampName('');
    setShowCreate(false);
    setSelectedCamp(camp);
  };

  // ── Delete Camp ──
  const handleDelete = (campId: string) => {
    Alert.alert('Delete Fish Camp?', 'This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          await persist(camps.filter((c) => c.id !== campId));
          setSelectedCamp(null);
        },
      },
    ]);
  };

  // ── Add Member ──
  const handleAddMember = async () => {
    if (!newMemberName.trim() || !selectedCamp) return;
    const member: FishCampMember = {
      id: generateId(),
      name: newMemberName.trim(),
      color: MEMBER_COLORS[selectedCamp.members.length % MEMBER_COLORS.length],
      joinedAt: new Date().toISOString(),
    };
    const activity: FishCampActivity = {
      id: generateId(),
      memberId: member.id,
      memberName: member.name,
      type: 'join',
      text: 'joined the group',
      timestamp: new Date().toISOString(),
    };
    const updated = camps.map((c) =>
      c.id === selectedCamp.id
        ? { ...c, members: [...c.members, member], activities: [activity, ...c.activities] }
        : c
    );
    await persist(updated);
    setSelectedCamp(updated.find((c) => c.id === selectedCamp.id) || null);
    setNewMemberName('');
    setShowAddMember(false);
  };

  // ── Log Activity ──
  const handleLogActivity = async () => {
    if (!activityText.trim() || !selectedCamp) return;
    const emoji = activityType === 'catch' ? '\uD83C\uDFA3' : activityType === 'spot' ? '\uD83D\uDCCC' : '\uD83D\uDCDD';
    const activity: FishCampActivity = {
      id: generateId(),
      memberId: 'me',
      memberName: 'You',
      type: activityType,
      text: `${emoji} ${activityText.trim()}`,
      timestamp: new Date().toISOString(),
    };
    const updated = camps.map((c) =>
      c.id === selectedCamp.id
        ? { ...c, activities: [activity, ...c.activities] }
        : c
    );
    await persist(updated);
    setSelectedCamp(updated.find((c) => c.id === selectedCamp.id) || null);
    setActivityText('');
    setShowLogActivity(false);
  };

  // ── Share Invite ──
  const handleShareInvite = async (camp: FishCamp) => {
    try {
      await Share.share({
        message: `Join my Fish Camp "${camp.name}" on MDHuntFishOutdoors! Code: ${camp.inviteCode}\nhttps://davidstonko.github.io/huntmaryland-site/join?code=${camp.inviteCode}`,
      });
    } catch {
      // User cancelled
    }
  };

  // ── Camp Detail View ──
  if (selectedCamp) {
    const camp = camps.find((c) => c.id === selectedCamp.id) || selectedCamp;
    return (
      <View style={styles.container}>
        <ScrollView contentContainerStyle={styles.scrollContent}>
          {/* Header */}
          <View style={styles.campHeader}>
            <TouchableOpacity onPress={() => setSelectedCamp(null)}>
              <Text style={styles.backBtn}>{'\u2190'} Back</Text>
            </TouchableOpacity>
            <View style={{ flex: 1 }}>
              <Text style={styles.campTitle}>{camp.name}</Text>
              <Text style={styles.campMeta}>
                {camp.members.length} members · Code: {camp.inviteCode}
              </Text>
            </View>
          </View>

          {/* Action buttons */}
          <View style={styles.actionRow}>
            <TouchableOpacity style={styles.actionBtn} onPress={() => setShowLogActivity(true)}>
              <Text style={styles.actionEmoji}>{'\uD83C\uDFA3'}</Text>
              <Text style={styles.actionLabel}>Log</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionBtn, showChat && { borderColor: Colors.water }]}
              onPress={() => setShowChat(!showChat)}
            >
              <Text style={styles.actionEmoji}>{'\uD83D\uDCAC'}</Text>
              <Text style={styles.actionLabel}>Chat</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionBtn} onPress={() => setShowAddMember(true)}>
              <Text style={styles.actionEmoji}>{'\uD83D\uDC65'}</Text>
              <Text style={styles.actionLabel}>Add</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionBtn} onPress={() => handleShareInvite(camp)}>
              <Text style={styles.actionEmoji}>{'\uD83D\uDCE4'}</Text>
              <Text style={styles.actionLabel}>Invite</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.actionBtn, { borderColor: Colors.rust }]} onPress={() => handleDelete(camp.id)}>
              <Text style={styles.actionEmoji}>{'\uD83D\uDDD1\uFE0F'}</Text>
              <Text style={[styles.actionLabel, { color: Colors.rust }]}>Delete</Text>
            </TouchableOpacity>
          </View>

          {/* Camp Chat Panel */}
          {showChat && (
            <View style={styles.chatContainer}>
              <CampChat
                campId={camp.id}
                currentUserId="me"
                currentUsername="You"
                currentColor={Colors.water}
                visible={showChat}
              />
            </View>
          )}

          {/* Members */}
          <Text style={styles.sectionTitle}>Members</Text>
          {camp.members.map((m) => (
            <View key={m.id} style={styles.memberRow}>
              <View style={[styles.memberDot, { backgroundColor: m.color }]} />
              <Text style={styles.memberName}>{m.name}</Text>
            </View>
          ))}

          {/* Activity Feed */}
          <Text style={[styles.sectionTitle, { marginTop: 16 }]}>Activity</Text>
          {camp.activities.length === 0 ? (
            <Text style={styles.emptyText}>No activity yet.</Text>
          ) : (
            camp.activities.slice(0, 30).map((a) => (
              <View key={a.id} style={styles.activityRow}>
                <Text style={styles.activityMember}>{a.memberName}</Text>
                <Text style={styles.activityText}>{a.text}</Text>
                <Text style={styles.activityTime}>
                  {new Date(a.timestamp).toLocaleDateString()}
                </Text>
              </View>
            ))
          )}
        </ScrollView>

        {/* Add Member Modal */}
        <Modal visible={showAddMember} transparent animationType="slide">
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            style={styles.modalOverlay}
          >
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>Add Member</Text>
              <TextInput
                style={styles.input}
                placeholder="Name"
                placeholderTextColor={Colors.textMuted}
                value={newMemberName}
                onChangeText={setNewMemberName}
                autoFocus
              />
              <View style={styles.modalActions}>
                <TouchableOpacity onPress={() => setShowAddMember(false)}>
                  <Text style={styles.cancelText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.saveBtn} onPress={handleAddMember}>
                  <Text style={styles.saveBtnText}>Add</Text>
                </TouchableOpacity>
              </View>
            </View>
          </KeyboardAvoidingView>
        </Modal>

        {/* Log Activity Modal */}
        <Modal visible={showLogActivity} transparent animationType="slide">
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            style={styles.modalOverlay}
          >
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>Log Activity</Text>
              <View style={styles.typeRow}>
                {([
                  { t: 'catch' as const, label: 'Catch', e: '\uD83C\uDFA3' },
                  { t: 'spot' as const, label: 'Spot', e: '\uD83D\uDCCC' },
                  { t: 'note' as const, label: 'Note', e: '\uD83D\uDCDD' },
                ]).map(({ t, label, e }) => (
                  <TouchableOpacity
                    key={t}
                    style={[styles.typeChip, activityType === t && styles.typeChipActive]}
                    onPress={() => setActivityType(t)}
                  >
                    <Text>{e} {label}</Text>
                  </TouchableOpacity>
                ))}
              </View>
              <TextInput
                style={[styles.input, { height: 60, textAlignVertical: 'top' }]}
                placeholder={
                  activityType === 'catch' ? 'e.g., Caught a 20" striper on chartreuse bucktail'
                  : activityType === 'spot' ? 'e.g., Found new structure near rock pile'
                  : 'e.g., Water clarity improving after rain'
                }
                placeholderTextColor={Colors.textMuted}
                value={activityText}
                onChangeText={setActivityText}
                multiline
                autoFocus
              />
              <View style={styles.modalActions}>
                <TouchableOpacity onPress={() => setShowLogActivity(false)}>
                  <Text style={styles.cancelText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.saveBtn} onPress={handleLogActivity}>
                  <Text style={styles.saveBtnText}>Post</Text>
                </TouchableOpacity>
              </View>
            </View>
          </KeyboardAvoidingView>
        </Modal>
      </View>
    );
  }

  // ── Camp List View ──
  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <Text style={styles.headerIcon}>{'\u26F5'}</Text>
          <Text style={styles.headerTitle}>Fish Camp</Text>
          <Text style={styles.headerSubtitle}>
            Create a fishing group to share spots, catches, and reports with friends.
          </Text>
        </View>

        {camps.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyEmoji}>{'\uD83C\uDFA3'}</Text>
            <Text style={styles.emptyTitle}>No Fish Camps Yet</Text>
            <Text style={styles.emptyText}>
              Create your first camp and invite your fishing buddies!
            </Text>
          </View>
        ) : (
          camps.map((camp) => (
            <TouchableOpacity
              key={camp.id}
              style={styles.campCard}
              onPress={() => setSelectedCamp(camp)}
              onLongPress={() => handleDelete(camp.id)}
            >
              <Text style={styles.campCardIcon}>{'\u26F5'}</Text>
              <View style={{ flex: 1 }}>
                <Text style={styles.campCardName}>{camp.name}</Text>
                <Text style={styles.campCardMeta}>
                  {camp.members.length} members · {camp.activities.length} activities
                </Text>
              </View>
              <Text style={styles.chevron}>{'\u276F'}</Text>
            </TouchableOpacity>
          ))
        )}

        <TouchableOpacity
          style={styles.createBtn}
          onPress={() => setShowCreate(true)}
        >
          <Text style={styles.createBtnText}>+ Create Fish Camp</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Create Camp Modal */}
      <Modal visible={showCreate} transparent animationType="slide">
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.modalOverlay}
        >
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Create Fish Camp</Text>
            <TextInput
              style={styles.input}
              placeholder="Group name (e.g., Bay Boys)"
              placeholderTextColor={Colors.textMuted}
              value={newCampName}
              onChangeText={setNewCampName}
              autoFocus
            />
            <View style={styles.modalActions}>
              <TouchableOpacity onPress={() => setShowCreate(false)}>
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.saveBtn} onPress={handleCreate}>
                <Text style={styles.saveBtnText}>Create</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  scrollContent: { padding: 16, paddingBottom: 80 },

  // Header
  header: { alignItems: 'center', marginBottom: 20 },
  headerIcon: { fontSize: 40, marginBottom: 8 },
  headerTitle: { fontSize: 22, fontWeight: '700', color: Colors.textPrimary },
  headerSubtitle: {
    fontSize: 13, color: Colors.textSecondary, textAlign: 'center',
    marginTop: 6, lineHeight: 18, paddingHorizontal: 20,
  },

  // Empty state
  emptyState: { alignItems: 'center', paddingVertical: 30 },
  emptyEmoji: { fontSize: 48, marginBottom: 12 },
  emptyTitle: { fontSize: 16, fontWeight: '700', color: Colors.water, marginBottom: 6 },
  emptyText: { fontSize: 12, color: Colors.textMuted, textAlign: 'center' },

  // Camp card
  campCard: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: Colors.surface, borderRadius: 12,
    padding: 14, marginBottom: 8, gap: 10,
    borderWidth: 1, borderColor: Colors.mud,
  },
  campCardIcon: { fontSize: 24 },
  campCardName: { fontSize: 15, fontWeight: '700', color: Colors.textPrimary },
  campCardMeta: { fontSize: 11, color: Colors.textSecondary, marginTop: 2 },
  chevron: { fontSize: 16, color: Colors.textMuted },

  // Create button
  createBtn: {
    backgroundColor: Colors.water, borderRadius: 10,
    paddingVertical: 12, alignItems: 'center', marginTop: 12,
  },
  createBtnText: { fontSize: 15, fontWeight: '700', color: Colors.textOnAccent },

  // Camp detail header
  campHeader: {
    flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 16,
  },
  backBtn: { fontSize: 14, color: Colors.waterLight, fontWeight: '600' },
  campTitle: { fontSize: 18, fontWeight: '700', color: Colors.textPrimary },
  campMeta: { fontSize: 11, color: Colors.textSecondary },

  // Action row
  actionRow: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  actionBtn: {
    flex: 1, alignItems: 'center', paddingVertical: 8,
    backgroundColor: Colors.surface, borderRadius: 10,
    borderWidth: 1, borderColor: Colors.mud,
  },
  actionEmoji: { fontSize: 18 },
  actionLabel: { fontSize: 9, color: Colors.textSecondary, fontWeight: '700', marginTop: 2 },

  // Members
  sectionTitle: {
    fontSize: 13, fontWeight: '700', color: Colors.tan, marginBottom: 8,
    textTransform: 'uppercase', letterSpacing: 0.5,
  },
  memberRow: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingVertical: 4,
  },
  memberDot: { width: 10, height: 10, borderRadius: 5 },
  memberName: { fontSize: 13, color: Colors.textPrimary },

  // Activity feed
  activityRow: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 6,
    paddingVertical: 6, borderBottomWidth: 0.5, borderBottomColor: Colors.mud,
  },
  activityMember: { fontSize: 11, fontWeight: '700', color: Colors.waterLight, width: 50 },
  activityText: { flex: 1, fontSize: 12, color: Colors.textSecondary, lineHeight: 16 },
  activityTime: { fontSize: 9, color: Colors.textMuted },

  // Modal
  modalOverlay: {
    flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.5)',
  },
  modalContent: {
    backgroundColor: Colors.surfaceElevated,
    borderTopLeftRadius: 20, borderTopRightRadius: 20,
    padding: 20, paddingBottom: 36,
  },
  modalTitle: { fontSize: 17, fontWeight: '700', color: Colors.tan, marginBottom: 14 },
  input: {
    backgroundColor: Colors.surface, borderRadius: 8,
    paddingHorizontal: 12, paddingVertical: 10,
    fontSize: 14, color: Colors.textPrimary,
    borderWidth: 1, borderColor: Colors.mud, marginBottom: 10,
  },
  typeRow: { flexDirection: 'row', gap: 6, marginBottom: 10 },
  typeChip: {
    flex: 1, alignItems: 'center', paddingVertical: 6,
    backgroundColor: Colors.surface, borderRadius: 8,
    borderWidth: 1, borderColor: Colors.mud,
  },
  typeChipActive: { borderColor: Colors.water, backgroundColor: Colors.forestDark },
  modalActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 12 },
  cancelText: { fontSize: 14, color: Colors.textMuted, fontWeight: '600', padding: 8 },
  saveBtn: {
    backgroundColor: Colors.water, borderRadius: 8,
    paddingHorizontal: 16, paddingVertical: 8,
  },
  saveBtnText: { fontSize: 14, fontWeight: '700', color: Colors.textOnAccent },

  // Chat
  chatContainer: {
    height: 340,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.mud,
    backgroundColor: Colors.surface,
    marginBottom: 12,
    overflow: 'hidden',
  },
});
