/**
 * @file SettingsScreen.tsx
 * @description User settings and preferences screen.
 * Accessible from the Profile tab or gear icon. Includes:
 * - Notification preferences
 * - Weather & Safety overlay defaults (lightning, alerts, marine, hunter metrics)
 * - Offline maps shortcut
 * - Unit preferences (via SettingsContext)
 * - Account info
 * - About / legal
 *
 * @module Screens
 * @version 3.1.0 — 2026-04-17 V2.2.0 resubmission: added Weather & Safety section + SettingsContext wiring.
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
  hasPermission,
  requestPermission,
  PushPreferences,
} from '../services/pushNotifications';
import { getTotalDiskUsage, getDownloadedPacks } from '../services/offlineMaps';
import { useSettings, WeatherSafetyPrefs, UnitsPref } from '../context/SettingsContext';
import { APP_MARKETING_VERSION, APP_BUILD_NUMBER } from '../config';

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

  // Offline maps stats
  const [offlineMB, setOfflineMB] = useState(0);
  const [offlineCount, setOfflineCount] = useState(0);

  // Persisted settings (weather safety, units, etc.)
  const { settings, updateWeatherSafety, setUnits, resetSettings } = useSettings();

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    // Push prefs
    const prefs = await getPreferences();
    setPushPrefs(prefs);

    // Offline maps
    const mb = await getTotalDiskUsage();
    setOfflineMB(mb);
    const packs = await getDownloadedPacks();
    setOfflineCount(packs.length);
  };

  const toggleNotif = async (key: keyof PushPreferences, value: boolean) => {
    // When enabling any notification category, make sure OS permission is granted.
    if (value) {
      const already = await hasPermission();
      if (!already) {
        const granted = await requestPermission();
        if (!granted) {
          Alert.alert(
            'Notifications Off',
            'Notifications are blocked in iOS Settings. Enable them in Settings → MDHuntFishOutdoors → Notifications to receive alerts.',
          );
          return;
        }
      }
    }
    const updated = { ...pushPrefs, [key]: value };
    setPushPrefs(updated);
    await updatePreferences({ [key]: value });
  };

  const toggleWeatherSafety = async (
    key: keyof WeatherSafetyPrefs,
    value: boolean,
  ) => {
    await updateWeatherSafety({ [key]: value });
  };

  const toggleMetric = async (value: boolean) => {
    const next: UnitsPref = value ? 'metric' : 'imperial';
    await setUnits(next);
  };

  const confirmResetSettings = () => {
    Alert.alert(
      'Reset Settings',
      'Reset all weather/safety toggles and units back to their defaults? This does not affect notification prefs or cached data.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset',
          style: 'destructive',
          onPress: async () => {
            await resetSettings();
            Alert.alert('Done', 'Settings reset to defaults.');
          },
        },
      ],
    );
  };

  const clearLocalData = () => {
    Alert.alert(
      'Clear Local Data',
      'This will clear all cached data (hunt plans, tracks, scouting reports). Your account, saved settings, and offline maps will be preserved. Continue?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear',
          style: 'destructive',
          onPress: async () => {
            const keysToKeep = [
              '@auth_access_token',
              'auth_token',
              '@offline_packs',
              '@push_token',
              '@push_preferences',
              '@mdhuntfish:settings_v1',
            ];
            const allKeys = await AsyncStorage.getAllKeys();
            const keysToRemove = allKeys.filter((k) => !keysToKeep.includes(k));
            await AsyncStorage.multiRemove(keysToRemove);
            Alert.alert('Done', 'Local data cleared.');
          },
        },
      ],
    );
  };

  const useMetric = settings.units === 'metric';

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Text style={styles.screenTitle}>Settings</Text>

        {/* ── Weather & Safety ── */}
        <Text style={styles.sectionTitle}>Weather & Safety</Text>
        <Text style={styles.sectionHint}>
          Default overlays shown on the Weather screen. Individual overlays can still be toggled
          from the Weather screen at any time.
        </Text>
        <View style={styles.card}>
          <SettingRow
            label="Lightning Status"
            description="Show nearby-lightning indicator by default"
            value={settings.weatherSafety.lightning}
            onToggle={(v) => toggleWeatherSafety('lightning', v)}
          />
          <Divider />
          <SettingRow
            label="NWS Active Alerts"
            description="Show severe weather and marine warnings by default"
            value={settings.weatherSafety.alerts}
            onToggle={(v) => toggleWeatherSafety('alerts', v)}
          />
          <Divider />
          <SettingRow
            label="Marine Conditions"
            description="Tide, wave height, and water temp (auto-enabled in Fish mode)"
            value={settings.weatherSafety.marine}
            onToggle={(v) => toggleWeatherSafety('marine', v)}
          />
          <Divider />
          <SettingRow
            label="Hunter Metrics"
            description="Wind, thermals, and barometric pressure scoring (Hunt mode only)"
            value={settings.weatherSafety.hunterMetrics}
            onToggle={(v) => toggleWeatherSafety('hunterMetrics', v)}
          />
        </View>

        {/* ── Notifications ── */}
        <Text style={styles.sectionTitle}>Notifications</Text>
        <Text style={styles.sectionHint}>
          Schedules local reminders on your device for Maryland hunt season openings
          (dove, archery, muzzleloader, firearms deer, spring turkey). No account or
          network connection required.
        </Text>
        <View style={styles.card}>
          <SettingRow
            label="Season Opening Alerts"
            description="Notify me the morning Maryland hunt seasons open"
            value={pushPrefs.seasonAlerts}
            onToggle={(v) => toggleNotif('seasonAlerts', v)}
          />
        </View>

        {/* ── Offline Maps ── */}
        <Text style={styles.sectionTitle}>Offline Maps</Text>
        <TouchableOpacity
          style={styles.card}
          onPress={() => navigation?.navigate?.('OfflineMaps')}
          activeOpacity={0.7}
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

        {/* ── Dev tools ── (added 2026-04-26 fork merge) */}
        <Text style={styles.sectionTitle}>Dev tools</Text>
        <TouchableOpacity
          style={styles.card}
          onPress={() => navigation?.navigate?.('WindWidgetPlayground')}
          activeOpacity={0.7}
        >
          <View style={styles.linkRow}>
            <View>
              <Text style={styles.linkLabel}>Wind widget playground</Text>
              <Text style={styles.linkDesc}>
                Drag, resize, and tweak the Hunt-map wind/scent-cone widget,
                then copy the resulting StyleSheet snippet.
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
          <TouchableOpacity style={styles.linkRow} onPress={confirmResetSettings}>
            <View>
              <Text style={styles.linkLabel}>Reset Settings to Defaults</Text>
              <Text style={styles.linkDesc}>Restore weather/safety and units defaults</Text>
            </View>
          </TouchableOpacity>
          <Divider />
          <TouchableOpacity style={styles.linkRow} onPress={clearLocalData}>
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
          >
            <Text style={styles.linkLabel}>Privacy Policy</Text>
            <Text style={styles.chevron}>{'\u203A'}</Text>
          </TouchableOpacity>
          <Divider />
          <TouchableOpacity
            style={styles.linkRow}
            onPress={() => Linking.openURL('https://dnr.maryland.gov')}
          >
            <Text style={styles.linkLabel}>MD DNR Website</Text>
            <Text style={styles.chevron}>{'\u203A'}</Text>
          </TouchableOpacity>
          <Divider />
          <View style={styles.linkRow}>
            <Text style={styles.linkLabel}>Version</Text>
            <Text style={styles.versionText}>
              V{APP_MARKETING_VERSION} (Build {APP_BUILD_NUMBER})
            </Text>
          </View>
        </View>

        {/* Disclaimer */}
        <Text style={styles.disclaimer}>
          MDHuntFishOutdoors is a planning tool. Always verify hunting and fishing
          regulations with MD DNR before heading out. Weather data is informational
          only — not a substitute for NWS severe-weather alerts. This is not legal advice.
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
  sectionHint: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginBottom: 8,
    lineHeight: 16,
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
