/**
 * SampleDataBanner - "Load sample data" / "Remove sample data" card for
 * the Log tab. Visible to every user, no gates: a brand-new install (or an
 * App Review tester) can populate the personal layer with a demo track,
 * waypoints, a journal entry and a gear checklist in one tap, and remove
 * them just as easily.
 *
 * Reads and writes through the four personal-layer contexts, so the map
 * and lists update immediately with no restart.
 */

import React, { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import Colors from '../../theme/colors';
import { useTrackRecorder } from '../../context/TrackRecorderContext';
import { useUserWaypoints } from '../../context/UserWaypointContext';
import { useJournalEntries } from '../../context/JournalEntryContext';
import { useGearChecklists } from '../../context/GearChecklistContext';
import {
  clearSampleData,
  countSampleData,
  seedSampleData,
  type SampleDataStores,
} from '../../services/sampleDataService';

interface Props {
  /** Optional callback after a seed or clear completes. */
  onChanged?: (loaded: boolean) => void;
  /** Extra outer style (margins) from the host screen. */
  style?: object;
}

export default function SampleDataBanner({ onChanged, style }: Props) {
  const tracks = useTrackRecorder();
  const waypoints = useUserWaypoints();
  const journal = useJournalEntries();
  const gear = useGearChecklists();
  const [busy, setBusy] = useState(false);

  const stores = useMemo<SampleDataStores>(
    () => ({
      tracks: {
        allTracks: tracks.allTracks,
        importTrack: tracks.importTrack,
        deleteTrack: tracks.deleteTrack,
      },
      waypoints: {
        allWaypoints: waypoints.allWaypoints,
        addWaypoint: waypoints.addWaypoint,
        deleteWaypoint: waypoints.deleteWaypoint,
      },
      journal: {
        allEntries: journal.allEntries,
        addEntry: journal.addEntry,
        deleteEntry: journal.deleteEntry,
      },
      gear: {
        allChecklists: gear.allChecklists,
        addChecklist: gear.addChecklist,
        deleteChecklist: gear.deleteChecklist,
      },
    }),
    [
      tracks.allTracks,
      tracks.importTrack,
      tracks.deleteTrack,
      waypoints.allWaypoints,
      waypoints.addWaypoint,
      waypoints.deleteWaypoint,
      journal.allEntries,
      journal.addEntry,
      journal.deleteEntry,
      gear.allChecklists,
      gear.addChecklist,
      gear.deleteChecklist,
    ],
  );

  const counts = useMemo(() => countSampleData(stores), [stores]);
  const loaded = counts.tracks + counts.waypoints + counts.journalEntries + counts.checklists > 0;

  const onLoad = useCallback(async () => {
    if (busy) return;
    setBusy(true);
    try {
      await seedSampleData(stores);
      onChanged?.(true);
    } catch {
      Alert.alert('Could not load sample data', 'Please try again.');
    } finally {
      setBusy(false);
    }
  }, [busy, stores, onChanged]);

  const onRemove = useCallback(() => {
    if (busy) return;
    Alert.alert(
      'Remove sample data?',
      'This removes only the records marked "Sample". Your own tracks, pins, entries, and checklists stay.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            setBusy(true);
            try {
              await clearSampleData(stores);
              onChanged?.(false);
            } catch {
              Alert.alert('Could not remove sample data', 'Please try again.');
            } finally {
              setBusy(false);
            }
          },
        },
      ],
    );
  }, [busy, stores, onChanged]);

  return (
    <View style={[styles.card, style]}>
      <View style={styles.textCol}>
        <Text style={styles.title}>
          {loaded ? 'Sample data is loaded' : 'New here? Try sample data'}
        </Text>
        <Text style={styles.body}>
          {loaded
            ? 'A demo track, three pins, a journal entry, and a gear list are marked "Sample" so you can tell them apart from your own.'
            : 'Adds a demo track near Patapsco Valley, three pins including a stand, a journal entry, and a gear checklist. Remove it any time.'}
        </Text>
      </View>
      <TouchableOpacity
        style={[styles.button, loaded ? styles.buttonSecondary : null, busy && styles.buttonDisabled]}
        onPress={loaded ? onRemove : onLoad}
        disabled={busy}
        activeOpacity={0.8}
        accessibilityRole="button"
        accessibilityLabel={loaded ? 'Remove sample data' : 'Load sample data'}
      >
        {busy ? (
          <ActivityIndicator size="small" color={loaded ? Colors.textPrimary : Colors.mdBlack} />
        ) : (
          <Text style={[styles.buttonText, loaded ? styles.buttonTextSecondary : null]}>
            {loaded ? 'Remove sample data' : 'Load sample data'}
          </Text>
        )}
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.surfaceElevated,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.mud,
    padding: 14,
    marginHorizontal: 16,
    marginVertical: 10,
  },
  textCol: {
    marginBottom: 10,
  },
  title: {
    color: Colors.textPrimary,
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 0.3,
    marginBottom: 4,
  },
  body: {
    color: Colors.textSecondary,
    fontSize: 13,
    lineHeight: 18,
  },
  button: {
    alignSelf: 'flex-start',
    backgroundColor: Colors.mdGold,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    minWidth: 160,
    alignItems: 'center',
  },
  buttonSecondary: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.mud,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: Colors.mdBlack,
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 0.4,
  },
  buttonTextSecondary: {
    color: Colors.textPrimary,
  },
});

export { SampleDataBanner };
