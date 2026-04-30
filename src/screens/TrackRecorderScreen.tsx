/**
 * TrackRecorderScreen — Live GPS recording HUD.
 *
 * The surface the user sees while actively recording a track. Shows
 * live stats (distance, duration, current state) and exposes the
 * lifecycle controls (Start / Pause / Resume / Save / Discard).
 *
 * Launched per-mode from the containing map stack, so the mode is
 * passed through route params and sent verbatim into the
 * TrackRecorderContext. The recorder itself is mode-agnostic — the
 * mode tag just controls which list screen the saved track shows up
 * in later.
 *
 * Kept deliberately stat-dense rather than graph-heavy: users glance
 * at this while walking, and "how far have I gone" / "how long" /
 * "am I recording" are the questions they need answered in < 1s. A
 * live map replay is deferred to TrackDetailScreen where the user has
 * time to look at it.
 *
 * Added 2026-04-24 per V2_3_FEATURE_EXPANSION_PLAN §3 / Phase A.2.
 */

import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Alert,
  ScrollView,
  SafeAreaView,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { useTrackRecorder } from '../context/TrackRecorderContext';
import {
  computeDistanceM,
  computeDurationSec,
  formatDistance,
  formatDuration,
} from '../types/track';
import { WaypointMode } from '../types/userWaypoint';
import Colors from '../theme/colors';

type TrackRecorderRoute = RouteProp<
  { TrackRecorder: { mode: WaypointMode } },
  'TrackRecorder'
>;

const MODE_LABEL: Record<WaypointMode, string> = {
  hunt: 'Hunt',
  fish: 'Fish',
  camp: 'Camp',
  hike: 'Hike',
};

export default function TrackRecorderScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<TrackRecorderRoute>();
  const mode = route.params?.mode ?? 'hunt';

  const {
    state,
    activeTrack,
    recoveredDraft,
    start,
    pause,
    resume,
    save,
    discard,
    resumeRecoveredDraft,
    discardRecoveredDraft,
  } = useTrackRecorder();

  // Local name field; seeded with a sensible default the user can edit.
  const [name, setName] = useState<string>(() => {
    const now = new Date();
    const hh = String(now.getHours()).padStart(2, '0');
    const mm = String(now.getMinutes()).padStart(2, '0');
    return `${MODE_LABEL[mode]} ${now.toLocaleDateString()} ${hh}:${mm}`;
  });

  // Force a re-render every second while recording so the duration
  // counter animates. Cheap — we're not re-sampling GPS, just rerendering.
  const [, setTick] = useState(0);
  useEffect(() => {
    if (state !== 'recording') return;
    const id = setInterval(() => setTick((n) => n + 1), 1000);
    return () => clearInterval(id);
  }, [state]);

  // Live stat derivation (uses activeTrack.samples directly — cheap).
  const samples = activeTrack?.samples ?? [];
  const liveDistance = computeDistanceM(samples);
  const liveDuration =
    samples.length > 0
      ? computeDurationSec([
          ...samples,
          { ...samples[samples.length - 1], timestamp: Date.now() },
        ])
      : 0;

  const handleStart = async () => {
    await start(mode, name);
  };

  const handleSave = async () => {
    if (samples.length < 2) {
      Alert.alert(
        'Nothing to save',
        'We need at least two GPS fixes before a track can be saved. Keep recording, or discard and try again.',
      );
      return;
    }
    const saved = await save(name);
    if (saved) {
      Alert.alert('Track saved', `${saved.name} — ${formatDistance(saved.distanceM)}`, [
        {
          text: 'View',
          onPress: () => navigation.navigate('TrackDetail', { trackId: saved.id }),
        },
        { text: 'OK', style: 'cancel' },
      ]);
    }
  };

  const handleDiscard = () => {
    Alert.alert(
      'Discard this track?',
      'The samples recorded so far will be lost. This cannot be undone.',
      [
        { text: 'Keep recording', style: 'cancel' },
        {
          text: 'Discard',
          style: 'destructive',
          onPress: async () => {
            await discard();
          },
        },
      ],
    );
  };

  // Recovered-draft prompt — if the app was killed mid-record we surface
  // it before letting the user start a new recording.
  if (recoveredDraft) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.recoveryBox}>
          <Text style={styles.recoveryTitle}>Recover unsaved track?</Text>
          <Text style={styles.recoveryBody}>
            A recording from a previous session was interrupted.
          </Text>
          <Text style={styles.recoveryStats}>
            {recoveredDraft.name} —{' '}
            {formatDistance(computeDistanceM(recoveredDraft.samples))} •{' '}
            {recoveredDraft.samples.length} fixes
          </Text>
          <View style={styles.recoveryRow}>
            <TouchableOpacity
              style={[styles.btn, styles.btnSecondary]}
              onPress={discardRecoveredDraft}
            >
              <Text style={styles.btnSecondaryText}>Discard</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.btn, styles.btnPrimary]}
              onPress={resumeRecoveredDraft}
            >
              <Text style={styles.btnPrimaryText}>Resume</Text>
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.modeTag}>{MODE_LABEL[mode].toUpperCase()} TRACK</Text>

        <View style={styles.statBlock}>
          <Text style={styles.statLabel}>Distance</Text>
          <Text style={styles.statValue}>{formatDistance(liveDistance)}</Text>
        </View>
        <View style={styles.statBlock}>
          <Text style={styles.statLabel}>Duration</Text>
          <Text style={styles.statValue}>{formatDuration(liveDuration)}</Text>
        </View>
        <View style={styles.statBlock}>
          <Text style={styles.statLabel}>Samples</Text>
          <Text style={styles.statValue}>{samples.length}</Text>
        </View>
        <View style={styles.statBlock}>
          <Text style={styles.statLabel}>Status</Text>
          <Text
            style={[
              styles.statValue,
              state === 'recording' && { color: Colors.mdRed },
              state === 'paused' && { color: Colors.amber },
              state === 'idle' && { color: Colors.textMuted },
              state === 'saved' && { color: Colors.success },
            ]}
          >
            {state.toUpperCase()}
          </Text>
        </View>

        <Text style={styles.fieldLabel}>Track name</Text>
        <TextInput
          style={styles.input}
          value={name}
          onChangeText={setName}
          maxLength={80}
          placeholder="Give your track a name"
          placeholderTextColor={Colors.textMuted}
          editable={state !== 'recording'}
        />

        <View style={styles.controlsRow}>
          {state === 'idle' && (
            <TouchableOpacity
              style={[styles.btn, styles.btnPrimary, styles.btnWide]}
              onPress={handleStart}
            >
              <Text style={styles.btnPrimaryText}>● Start Recording</Text>
            </TouchableOpacity>
          )}
          {state === 'recording' && (
            <>
              <TouchableOpacity
                style={[styles.btn, styles.btnSecondary]}
                onPress={pause}
              >
                <Text style={styles.btnSecondaryText}>⏸ Pause</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.btn, styles.btnPrimary]}
                onPress={handleSave}
              >
                <Text style={styles.btnPrimaryText}>■ Save</Text>
              </TouchableOpacity>
            </>
          )}
          {state === 'paused' && (
            <>
              <TouchableOpacity
                style={[styles.btn, styles.btnSecondary]}
                onPress={resume}
              >
                <Text style={styles.btnSecondaryText}>▶ Resume</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.btn, styles.btnPrimary]}
                onPress={handleSave}
              >
                <Text style={styles.btnPrimaryText}>■ Save</Text>
              </TouchableOpacity>
            </>
          )}
        </View>

        {(state === 'recording' || state === 'paused') && (
          <TouchableOpacity
            style={[styles.btn, styles.btnDanger, styles.btnWide]}
            onPress={handleDiscard}
          >
            <Text style={styles.btnDangerText}>Discard</Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity
          style={styles.listLink}
          onPress={() => navigation.navigate('TrackList', { mode })}
        >
          <Text style={styles.listLinkText}>View saved tracks →</Text>
        </TouchableOpacity>

        <Text style={styles.footnote}>
          Track recording uses GPS continuously. Accuracy and battery use
          depend on signal; the recorder reduces sampling when you're
          stationary to conserve power.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  scroll: { padding: 16, paddingBottom: 48 },

  modeTag: {
    color: Colors.mdGold,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1.2,
    marginBottom: 16,
  },

  statBlock: {
    backgroundColor: Colors.surface,
    borderRadius: 10,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: Colors.mud,
  },
  statLabel: {
    color: Colors.textSecondary,
    fontSize: 12,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  statValue: {
    color: Colors.textPrimary,
    fontSize: 28,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },

  fieldLabel: {
    color: Colors.textSecondary,
    fontSize: 13,
    marginTop: 18,
    marginBottom: 6,
  },
  input: {
    backgroundColor: Colors.surfaceElevated,
    borderWidth: 1,
    borderColor: Colors.mud,
    borderRadius: 8,
    color: Colors.textPrimary,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
  },

  controlsRow: {
    flexDirection: 'row',
    marginTop: 20,
    gap: 10,
  },
  btn: {
    flex: 1,
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnWide: { flex: undefined, width: '100%', marginTop: 10 },
  btnPrimary: { backgroundColor: Colors.mdGold },
  btnPrimaryText: { color: Colors.mdBlack, fontWeight: '700', fontSize: 15 },
  btnSecondary: {
    backgroundColor: Colors.surfaceElevated,
    borderWidth: 1,
    borderColor: Colors.mud,
  },
  btnSecondaryText: { color: Colors.textPrimary, fontWeight: '600', fontSize: 15 },
  btnDanger: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: Colors.danger,
  },
  btnDangerText: { color: Colors.danger, fontWeight: '600', fontSize: 14 },

  listLink: { marginTop: 24, alignItems: 'center' },
  listLinkText: { color: Colors.oak, fontSize: 14, fontWeight: '600' },

  footnote: {
    color: Colors.textMuted,
    fontSize: 12,
    lineHeight: 18,
    marginTop: 20,
    fontStyle: 'italic',
  },

  recoveryBox: {
    margin: 20,
    padding: 20,
    backgroundColor: Colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.amber,
  },
  recoveryTitle: {
    color: Colors.amber,
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 8,
  },
  recoveryBody: {
    color: Colors.textPrimary,
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 8,
  },
  recoveryStats: {
    color: Colors.textSecondary,
    fontSize: 13,
    marginBottom: 16,
    fontVariant: ['tabular-nums'],
  },
  recoveryRow: { flexDirection: 'row', gap: 10 },
});
