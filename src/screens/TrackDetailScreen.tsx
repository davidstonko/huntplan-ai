/**
 * TrackDetailScreen — Detail view for a saved RecordedTrack.
 *
 * Shows the track's stats and — where Mapbox is available — a
 * map-preview LineString of the recorded path. The map rendering is
 * gated behind the same @rnmapbox/maps import the rest of the app
 * uses, and falls back to a stats-only view if Mapbox isn't ready.
 *
 * Supports rename (via inline edit), notes edit, delete, and a minimal
 * GPX export hook (opens the native share sheet with a GPX file). The
 * GPX builder is inline here rather than split into its own service
 * because the only caller is this screen.
 *
 * Added 2026-04-24 per V2_3_FEATURE_EXPANSION_PLAN §3 / Phase A.3.
 */

import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Alert,
  ScrollView,
  SafeAreaView,
  Share,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import Mapbox from '@rnmapbox/maps';
import { useTrackRecorder } from '../context/TrackRecorderContext';
import { RecordedTrack, formatDistance, formatDuration } from '../types/track';
import Colors from '../theme/colors';
import FavoriteStarButton from '../components/personal/FavoriteStarButton';
import { seedFromTrack } from '../services/journalSeedService';

type TrackDetailRoute = RouteProp<
  { TrackDetail: { trackId: string } },
  'TrackDetail'
>;

export default function TrackDetailScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<TrackDetailRoute>();
  const { trackId } = route.params;
  const { getTrack, updateTrack, deleteTrack } = useTrackRecorder();

  const track = getTrack(trackId);
  const [name, setName] = useState(track?.name ?? '');
  const [notes, setNotes] = useState(track?.notes ?? '');

  // Compute bounds + geoJSON once — cheap, but avoids recomputing when
  // the user types in the name/notes fields.
  const { geoJson, bounds } = useMemo(() => {
    if (!track || track.samples.length < 2) {
      return { geoJson: null, bounds: null };
    }
    const coords = track.samples.map((s) => [s.lng, s.lat]);
    const lngs = coords.map((c) => c[0]);
    const lats = coords.map((c) => c[1]);
    const ne: [number, number] = [Math.max(...lngs), Math.max(...lats)];
    const sw: [number, number] = [Math.min(...lngs), Math.min(...lats)];
    return {
      geoJson: {
        type: 'FeatureCollection' as const,
        features: [
          {
            type: 'Feature' as const,
            properties: {},
            geometry: {
              type: 'LineString' as const,
              coordinates: coords,
            },
          },
        ],
      },
      bounds: { ne, sw },
    };
  }, [track]);

  if (!track) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.missing}>
          <Text style={styles.missingTitle}>Track not found</Text>
          <Text style={styles.missingBody}>
            It may have been deleted. Go back to the list and pick another.
          </Text>
          <TouchableOpacity style={styles.btn} onPress={() => navigation.goBack()}>
            <Text style={styles.btnText}>Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const dirty = name !== track.name || (notes ?? '') !== (track.notes ?? '');

  const handleSave = async () => {
    await updateTrack(track.id, { name, notes });
    Alert.alert('Saved', 'Track updated.');
  };

  const handleDelete = () => {
    Alert.alert(
      'Delete track?',
      `"${track.name}" — ${formatDistance(track.distanceM)}. This cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            await deleteTrack(track.id);
            navigation.goBack();
          },
        },
      ],
    );
  };

  const handleExport = async () => {
    const gpx = buildGpx(track);
    try {
      await Share.share({
        message: gpx,
        title: `${track.name}.gpx`,
      });
    } catch (err) {
      Alert.alert('Export failed', String(err));
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll}>
        {geoJson && bounds ? (
          <View style={styles.mapWrap}>
            <Mapbox.MapView
              style={styles.map}
              styleURL={Mapbox.StyleURL.Satellite}
            >
              <Mapbox.Camera
                bounds={{
                  ne: bounds.ne,
                  sw: bounds.sw,
                  paddingTop: 24,
                  paddingBottom: 24,
                  paddingLeft: 24,
                  paddingRight: 24,
                }}
              />
              <Mapbox.ShapeSource id="trackLine" shape={geoJson}>
                <Mapbox.LineLayer
                  id="trackLineLayer"
                  style={{
                    lineColor: Colors.mdGold,
                    lineWidth: 4,
                    lineCap: 'round',
                    lineJoin: 'round',
                  }}
                />
              </Mapbox.ShapeSource>
            </Mapbox.MapView>
          </View>
        ) : (
          <View style={styles.noMap}>
            <Text style={styles.noMapText}>
              Not enough samples to draw this track.
            </Text>
          </View>
        )}

        <View style={styles.statsRow}>
          <View style={styles.statCell}>
            <Text style={styles.statValue}>{formatDistance(track.distanceM)}</Text>
            <Text style={styles.statLabel}>DISTANCE</Text>
          </View>
          <View style={styles.statCell}>
            <Text style={styles.statValue}>{formatDuration(track.durationSec)}</Text>
            <Text style={styles.statLabel}>DURATION</Text>
          </View>
          <View style={styles.statCell}>
            <Text style={styles.statValue}>{track.samples.length}</Text>
            <Text style={styles.statLabel}>FIXES</Text>
          </View>
          <View style={styles.statCell}>
            <Text style={styles.statValue}>
              {track.elevationGainM > 0
                ? `${track.elevationGainM.toFixed(0)}m`
                : '—'}
            </Text>
            <Text style={styles.statLabel}>ASCENT</Text>
          </View>
        </View>

        <Text style={styles.fieldLabel}>Name</Text>
        <TextInput
          style={styles.input}
          value={name}
          onChangeText={setName}
          maxLength={80}
        />
        <Text style={styles.fieldLabel}>Notes</Text>
        <TextInput
          style={[styles.input, styles.multi]}
          value={notes}
          onChangeText={setNotes}
          multiline
          maxLength={2000}
          placeholder="Add notes about this track…"
          placeholderTextColor={Colors.textMuted}
        />
        <Text style={styles.recordedAt}>
          Recorded {new Date(track.startedAt).toLocaleString()}
        </Text>

        {dirty && (
          <TouchableOpacity
            style={[styles.btn, styles.btnPrimary]}
            onPress={handleSave}
          >
            <Text style={styles.btnPrimaryText}>Save changes</Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity
          style={[styles.btn, styles.btnSecondary]}
          onPress={() =>
            navigation.navigate('TrackInsights', { trackId: track.id })
          }
        >
          <Text style={styles.btnSecondaryText}>View Insights</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.btn, styles.btnSecondary]}
          onPress={() =>
            navigation.navigate('JournalEdit', {
              mode: track.mode,
              seed: seedFromTrack(track),
            })
          }
        >
          <Text style={styles.btnSecondaryText}>Log Journal Entry</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.btn, styles.btnSecondary]}
          onPress={handleExport}
        >
          <Text style={styles.btnSecondaryText}>Export GPX</Text>
        </TouchableOpacity>

        <FavoriteStarButton kind="track" id={track.id} />

        <TouchableOpacity
          style={[styles.btn, styles.btnDanger]}
          onPress={handleDelete}
        >
          <Text style={styles.btnDangerText}>Delete Track</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

/**
 * Build a minimal GPX 1.1 document from a RecordedTrack. The shape
 * matches what Gaia, AllTrails, and OnX Hunt accept as import input.
 */
function buildGpx(t: RecordedTrack): string {
  const escape = (s: string) =>
    s
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  const pts = t.samples
    .map((s) => {
      const iso = new Date(s.timestamp).toISOString();
      const ele =
        typeof s.altitude === 'number' ? `<ele>${s.altitude}</ele>` : '';
      return `<trkpt lat="${s.lat}" lon="${s.lng}">${ele}<time>${iso}</time></trkpt>`;
    })
    .join('\n');
  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<gpx version="1.1" creator="MDHuntFishOutdoors" xmlns="http://www.topografix.com/GPX/1/1">',
    `<metadata><name>${escape(t.name)}</name><time>${t.startedAt}</time></metadata>`,
    `<trk><name>${escape(t.name)}</name><trkseg>`,
    pts,
    '</trkseg></trk>',
    '</gpx>',
  ].join('\n');
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  scroll: { paddingBottom: 32 },

  mapWrap: {
    height: 260,
    borderBottomWidth: 1,
    borderBottomColor: Colors.mud,
  },
  map: { flex: 1 },
  noMap: {
    height: 140,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.surface,
  },
  noMapText: { color: Colors.textSecondary, fontSize: 14 },

  statsRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 14,
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: Colors.mud,
  },
  statCell: { flex: 1, alignItems: 'center' },
  statValue: {
    color: Colors.mdGold,
    fontSize: 16,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  statLabel: {
    color: Colors.textMuted,
    fontSize: 10,
    marginTop: 2,
    letterSpacing: 0.8,
  },

  fieldLabel: {
    color: Colors.textSecondary,
    fontSize: 13,
    marginHorizontal: 16,
    marginTop: 16,
    marginBottom: 6,
  },
  input: {
    backgroundColor: Colors.surfaceElevated,
    marginHorizontal: 16,
    borderWidth: 1,
    borderColor: Colors.mud,
    borderRadius: 8,
    color: Colors.textPrimary,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
  },
  multi: { minHeight: 84, textAlignVertical: 'top' },
  recordedAt: {
    color: Colors.textMuted,
    fontSize: 12,
    marginHorizontal: 16,
    marginTop: 10,
    fontStyle: 'italic',
  },

  btn: {
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnText: { color: Colors.textPrimary, fontSize: 15, fontWeight: '600' },
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

  missing: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  missingTitle: {
    color: Colors.textPrimary,
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 10,
  },
  missingBody: {
    color: Colors.textSecondary,
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
    marginBottom: 20,
  },
});
