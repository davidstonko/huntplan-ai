/**
 * @file SettingsScreen.tsx
 * @description User settings and preferences screen.
 * Accessible from the Profile tab or gear icon. Includes:
 * - Notification preferences
 * - Offline maps shortcut
 * - Unit preferences
 * - Account info
 * - About / legal
 *
 * @module Screens
 * @version 3.0.0
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  SafeAreaView,
  Linking,
  Alert,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Colors from '../theme/colors';
import {
  getPreferences,
  updatePreferences,
  PushPreferences,
} from '../services/pushNotifications';
import { getTotalDiskUsage, getDownloadedPacks } from '../services/offlineMaps';

interface SettingsScreenProps {
  navigation?: any;
}

export default function SettingsScreen({ navigation }: SettingsScreenProps) {
  // Notification prefs
  const [pushPrefs, setPushPrefs] = useState<PushPreferences>({
    seasonAlerts: true,
    campActivity: true,
    regulationChanges: true,
    weatherAlerts: false,
  });

  // Units
  const [useMetric, setUseMetric] = useState(false);

  // Offline maps
  const [offlineMB, setOfflineMB] = useState(0);
  const [offlineCount, setOfflineCount] = useState(0);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    // Push prefs
    const prefs = await getPreferences();
    setPushPrefs(prefs);

    // Units
    const metric = await AsyncStorage.getItem('@use_metric');
    setUseMetric(metric === 'true');

    // Offline maps
    const mb = await getTotalDiskUsage();
    setOfflineMB(mb);
    const packs = await getDownloadedPacks();
    setOfflineCount(packs.length);
  };

  const toggleNotif = async (key: keyof PushPreferences, value: boolean) => {
    const updated = { ...pushPrefs, [key]: value };
    setPushPrefs(updated);
    await updatePreferences({ [key]: value });
  };

  const toggleMetric = async (value: boolean) => {
    setUseMetric(value);
    await AsyncStorage.setItem('@use_metric', value ? 'true' : 'false');
  };

  const clearLocalData = () => {
    Alert.alert(
      'Clear Local Data',
      'This will clear all cached data (hunt plans, tracks, scouting reports). Your account and offline maps will be preserved. Continue?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear',
          style: 'destructive',
          onPress: async () => {
            const keysToKeep = ['@auth_access_token', 'auth_token', '@offline_packs', '@push_token', '@push_preferences', '@use_metric'];
            const allKeys = await AsyncStorage.getAllKeys();
            const keysToRemove = allKeys.filter((k) => !keysToKeep.includes(k));
            await AsyncStorage.multiRemove(keysToRemove);
            Alert.alert('Done', 'Local data cleared.');
          },
        },
      ],
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Text style={styles.screenTitle}>Settings</Text>

        {/* ── Notifications ── */}
        <Text style={styles.sectionTitle}>Notifications</Text>
        <View style={styles.card}>
          <SettingRow
            label="Season Alerts"
            description="Get notified when hunting seasons open"
            value={pushPrefs.seasonAlerts}
            onToggle={(v) => toggleNotif('seasonAlerts', v)}
          />
          <Divider />
          <SettingRow
            label="Camp Activity"
            description="Alerts when camp members add pins or photos"
            value={pushPrefs.campActivity}
            onToggle={(v) => toggleNotif('campActivity', v)}
          />
          <Divider />
          <SettingRow
            label="Regulation Changes"
            description="Updates when MD DNR changes hunting rules"
            value={pushPrefs.regulationChanges}
            onToggle={(v) => toggleNotif('regulationChanges', v)}
          />
          <Divider />
          <SettingRow
            label="Weather Alerts"
            description="High wind or storm warnings for hunt areas"
            value={pushPrefs.weatherAlerts}
            onToggle={(v) => toggleNotif('weatherAlerts', v)}
          />
        </View>

        {/* ── Offline Maps ── */}
        <Text style={styles.sectionTitle}>Offline Maps</Text>
        <TouchableOpacity
          style={styles.card}
          onPress={() => navigation?.navigate?.('OfflineMaps')}
          activeOpacity={0.7}
          accessibilityLabel="Manage offline maps"
          accessibilityRole="button"
          accessibilityHint={offlineCount > 0 ? `${offlineCount} region downloaded` : 'No maps downloaded. Open to download offline maps'}
        >
          <View style={styles.linkRow}>
            <View>
              <Text style={styles.linkLabel}>Manage Offline Maps</Text>
              <Text style={styles.linkDesc}>
                {offlineCount > 0
                  ? `${offlineCount} region${offlineCount > 1 ? 's' : ''} downloaded (${offlineMB} MB)`
                  : 'No maps downloaded'}
              </Text>
            </View>
            <Text style={styles.chevron}>{'\u203A'}</Text>
          </View>
        </TouchableOpacity>

        {/* ── Units ── */}
        <Text style={styles.sectionTitle}>Units</Text>
        <View style={styles.card}>
          <SettingRow
            label="Metric Units"
            description="Use km/m instead of mi/ft"
            value={useMetric}
            onToggle={toggleMetric}
          />
        </View>

        {/* ── Data ── */}
        <Text style={styles.sectionTitle}>Data</Text>
        <View style={styles.card}>
          <TouchableOpacity
            style={styles.linkRow}
            onPress={clearLocalData}
            accessibilityLabel="Clear local data"
            accessibilityRole="button"
            accessibilityHint="Removes all cached plans, tracks, and reports from device"
          >
            <View>
              <Text style={[styles.linkLabel, { color: Colors.rust }]}>Clear Local Data</Text>
              <Text style={styles.linkDesc}>Remove cached plans, tracks, and reports</Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* ── About ── */}
        <Text style={styles.sectionTitle}>About</Text>
        <View style={styles.card}>
          <TouchableOpacity
            style={styles.linkRow}
            onPress={() => Linking.openURL('https://davidstonko.github.io/huntmaryland-site/privacy.html')}
            accessibilityLabel="Privacy policy"
            accessibilityRole="link"
            accessibilityHint="Opens privacy policy on website"
          >
            <Text style={styles.linkLabel}>Privacy Policy</Text>
            <Text style={styles.chevron}>{'\u203A'}</Text>
          </TouchableOpacity>
          <Divider />
          <TouchableOpacity
            style={styles.linkRow}
            onPress={() => Linking.openURL('https://dnr.maryland.gov')}
            accessibilityLabel="Maryland DNR website"
            accessibilityRole="link"
            accessibilityHint="Opens Maryland Department of Natural Resources website"
          >
            <Text style={styles.linkLabel}>MD DNR Website</Text>
            <Text style={styles.chevron}>{'\u203A'}</Text>
          </TouchableOpacity>
          <Divider />
          <View style={styles.linkRow}>
            <Text style={styles.linkLabel}>Version</Text>
            <Text style={styles.versionText}>3.0.0 (Build 3)</Text>
          </View>
        </View>

        {/* Disclaimer */}
        <Text style={styles.disclaimer}>
          MDHuntFishOutdoors is a planning tool. Always verify hunting
          regulations with MD DNR before hunting. This is not legal advice.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

// ── Sub-components ──

function SettingRow({
  label,
  description,
  value,
  onToggle,
}: {
  label: string;
  description?: string;
  value: boolean;
  onToggle: (v: boolean) => void;
}) {
  return (
    <View style={styles.settingRow}>
      <View style={styles.settingInfo}>
        <Text style={styles.settingLabel}>{label}</Text>
        {description && <Text style={styles.settingDesc}>{description}</Text>}
      </View>
      <Switch
        value={value}
        onValueChange={onToggle}
        trackColor={{ false: Colors.mud, true: Colors.moss }}
        thumbColor={value ? Colors.lichen : Colors.textMuted}
        ios_backgroundColor={Colors.mud}
        accessible
        accessibilityLabel={label}
        accessibilityRole="switch"
        accessibilityState={{ checked: value }}
        accessibilityHint={description || `Toggle ${label}`}
      />
    </View>
  );
}

function Divider() {
  return <View style={styles.divider} />;
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
  screenTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 8,
    marginTop: 20,
  },
  card: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: Colors.mud,
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
  },
  settingInfo: {
    flex: 1,
    marginRight: 12,
  },
  settingLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  settingDesc: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  linkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
  },
  linkLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  linkDesc: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  chevron: {
    fontSize: 22,
    color: Colors.textMuted,
    fontWeight: '300',
  },
  versionText: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
  divider: {
    height: 1,
    backgroundColor: Colors.mud,
    marginLeft: 14,
  },
  disclaimer: {
    fontSize: 11,
    color: Colors.textMuted,
    textAlign: 'center',
    marginTop: 24,
    lineHeight: 16,
    paddingHorizontal: 20,
  },
});
