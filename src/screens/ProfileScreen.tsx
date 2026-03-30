import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Switch,
  TextInput,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Colors from '../theme/colors';

interface ProfileData {
  anonymousHandle: string;
  dataPackMD: boolean;
  dataPackVA: boolean;
  dataPackPA: boolean;
  notificationsEnabled: boolean;
}

const DEFAULT_PROFILE: ProfileData = {
  anonymousHandle: 'HunterMD_' + Math.floor(Math.random() * 9999),
  dataPackMD: true,
  dataPackVA: false,
  dataPackPA: false,
  notificationsEnabled: true,
};

const PROFILE_KEY = 'HUNTPLAN_PROFILE';
const VERSION = '1.0.0';

export default function ProfileScreen() {
  const [profile, setProfile] = useState<ProfileData>(DEFAULT_PROFILE);
  const [editHandle, setEditHandle] = useState(false);
  const [tempHandle, setTempHandle] = useState(DEFAULT_PROFILE.anonymousHandle);

  useEffect(() => {
    (async () => {
      try {
        const saved = await AsyncStorage.getItem(PROFILE_KEY);
        if (saved) {
          const parsed = JSON.parse(saved);
          setProfile(parsed);
          setTempHandle(parsed.anonymousHandle);
        }
      } catch (e) {
        console.error('Error loading profile:', e);
      }
    })();
  }, []);

  const saveProfile = async (updated: ProfileData) => {
    try {
      await AsyncStorage.setItem(PROFILE_KEY, JSON.stringify(updated));
      setProfile(updated);
    } catch (e) {
      Alert.alert('Error', 'Failed to save profile.');
    }
  };

  const handleSaveHandle = () => {
    if (!tempHandle.trim()) {
      Alert.alert('Invalid', 'Handle cannot be empty.');
      return;
    }
    saveProfile({ ...profile, anonymousHandle: tempHandle });
    setEditHandle(false);
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
      showsVerticalScrollIndicator={false}
    >
      {/* Profile */}
      <Text style={styles.sectionTitle}>ANONYMOUS PROFILE</Text>
      <View style={styles.card}>
        <View style={styles.handleRow}>
          <View style={styles.handleContent}>
            <Text style={styles.label}>YOUR HANDLE</Text>
            {editHandle ? (
              <TextInput
                style={styles.handleInput}
                value={tempHandle}
                onChangeText={setTempHandle}
                placeholderTextColor={Colors.textMuted}
                maxLength={30}
                autoFocus
              />
            ) : (
              <Text style={styles.handleText}>{profile.anonymousHandle}</Text>
            )}
            <Text style={styles.subtext}>Visible to other hunters in the community</Text>
          </View>
          <TouchableOpacity
            onPress={() => {
              if (editHandle) handleSaveHandle();
              else { setEditHandle(true); setTempHandle(profile.anonymousHandle); }
            }}
          >
            <Text style={styles.editBtn}>{editHandle ? 'SAVE' : 'EDIT'}</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Data Packs */}
      <Text style={styles.sectionTitle}>OFFLINE DATA PACKS</Text>
      <View style={styles.card}>
        {[
          { key: 'dataPackMD' as const, name: 'Maryland', size: '~450 MB', installed: true },
          { key: 'dataPackVA' as const, name: 'Virginia', size: '~500 MB', installed: false },
          { key: 'dataPackPA' as const, name: 'Pennsylvania', size: '~480 MB', installed: false },
        ].map((pack, i) => (
          <View key={pack.key}>
            {i > 0 && <View style={styles.divider} />}
            <View style={styles.packRow}>
              <View>
                <Text style={styles.packName}>{pack.name}</Text>
                <Text style={styles.packStatus}>
                  {profile[pack.key] ? 'Downloaded' : 'Available'}
                </Text>
                <Text style={styles.packSize}>{pack.size}</Text>
              </View>
              <Switch
                value={profile[pack.key]}
                onValueChange={() => saveProfile({ ...profile, [pack.key]: !profile[pack.key] })}
                trackColor={{ false: Colors.mud, true: Colors.moss }}
                thumbColor={profile[pack.key] ? Colors.textOnAccent : Colors.textMuted}
                disabled={pack.installed}
              />
            </View>
          </View>
        ))}
      </View>

      {/* Settings */}
      <Text style={styles.sectionTitle}>SETTINGS</Text>
      <View style={styles.card}>
        <View style={styles.settingRow}>
          <Text style={styles.settingLabel}>Push Notifications</Text>
          <Switch
            value={profile.notificationsEnabled}
            onValueChange={() =>
              saveProfile({ ...profile, notificationsEnabled: !profile.notificationsEnabled })
            }
            trackColor={{ false: Colors.mud, true: Colors.moss }}
            thumbColor={profile.notificationsEnabled ? Colors.textOnAccent : Colors.textMuted}
          />
        </View>
      </View>

      {/* Status */}
      <Text style={styles.sectionTitle}>APP INFO</Text>
      <View style={styles.card}>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Version</Text>
          <Text style={styles.infoValue}>{VERSION}</Text>
        </View>
        <View style={styles.divider} />
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Pilot State</Text>
          <Text style={styles.infoValue}>Maryland</Text>
        </View>
      </View>

      {/* Danger Zone */}
      <TouchableOpacity
        style={styles.dangerButton}
        onPress={() => {
          Alert.alert(
            'Clear All Data',
            'This removes all local plans, notes, and cached data. Cannot be undone.',
            [
              { text: 'Cancel', style: 'cancel' },
              {
                text: 'Delete',
                style: 'destructive',
                onPress: async () => {
                  await AsyncStorage.clear();
                  Alert.alert('Done', 'All local data cleared.');
                },
              },
            ]
          );
        }}
        activeOpacity={0.7}
      >
        <Text style={styles.dangerButtonText}>Clear All Data</Text>
      </TouchableOpacity>
      <Text style={styles.dangerNote}>
        Removes plans, notes, and cached data. Cannot be undone.
      </Text>

      <View style={{ height: 30 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  contentContainer: { paddingHorizontal: 16, paddingVertical: 16 },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: Colors.oak,
    letterSpacing: 1.5,
    marginBottom: 10,
    marginTop: 8,
  },
  card: {
    backgroundColor: Colors.surface,
    borderRadius: 10,
    padding: 16,
    marginBottom: 20,
  },
  handleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  handleContent: { flex: 1 },
  label: { fontSize: 10, color: Colors.textMuted, letterSpacing: 1, marginBottom: 4 },
  handleText: { fontSize: 16, fontWeight: '700', color: Colors.textPrimary, marginBottom: 4 },
  handleInput: {
    backgroundColor: Colors.background,
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 8,
    color: Colors.textPrimary,
    fontSize: 14,
    marginBottom: 4,
    borderWidth: 1,
    borderColor: Colors.oak,
  },
  subtext: { fontSize: 11, color: Colors.textMuted },
  editBtn: { fontSize: 11, color: Colors.oak, fontWeight: '800', letterSpacing: 0.5, paddingLeft: 12 },
  divider: { height: 1, backgroundColor: Colors.mud, marginVertical: 12 },
  packRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  packName: { fontSize: 15, fontWeight: '600', color: Colors.textPrimary, marginBottom: 2 },
  packStatus: { fontSize: 12, color: Colors.sage },
  packSize: { fontSize: 11, color: Colors.textMuted },
  settingRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  settingLabel: { fontSize: 15, color: Colors.textPrimary, fontWeight: '500' },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  infoLabel: { fontSize: 14, color: Colors.textSecondary },
  infoValue: { fontSize: 14, color: Colors.oak, fontWeight: '600' },
  dangerButton: {
    backgroundColor: '#3A2220',
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.rust,
    alignItems: 'center',
    marginTop: 8,
  },
  dangerButtonText: { color: '#FF8888', fontWeight: '600', fontSize: 14 },
  dangerNote: { fontSize: 11, color: Colors.textMuted, textAlign: 'center', marginTop: 6 },
});
