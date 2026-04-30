/**
 * ImportPickerScreen — V2.3 Phase A.25 ("switching cost" reduction).
 *
 * The inverse of "Backup My Data" (Phase A.12) and KML/GPX Export (Phase
 * D.2). Lets a user pick a `.kml` or `.gpx` file from Files (or another
 * app via the Share sheet), preview every artifact the parser found,
 * include / exclude rows individually, edit the title before commit, pick
 * a destination mode, and persist the chosen rows into the local
 * UserWaypoint / UserMarkup contexts.
 *
 * Why a preview step (not "import everything silently"):
 *   - A KML from OnX or AllTrails routinely contains hundreds of named
 *     features, most of which the user doesn't want littering their map.
 *   - Per-row toggles + inline title-edit means the user keeps editorial
 *     control. We don't pollute their personal layer just to claim
 *     "import worked".
 *   - The mode-picker chip row at top means a single import call can route
 *     a fishing-trip GPX into FISH instead of the previously open mode.
 *
 * Honest failure-mode pattern:
 *   - The parser returns `skippedCount` and `warnings`. We surface BOTH at
 *     the top of the preview so the user knows "we found 14 rows, 3 were
 *     malformed, and we dropped inner rings on a polygon". Silently
 *     swallowing skipped rows would leave the user thinking everything
 *     came through.
 */

import React, { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import {
  useNavigation,
  useRoute,
  RouteProp,
} from '@react-navigation/native';
import RNFS from 'react-native-fs';
import Colors from '../theme/colors';
import {
  parseGeoFile,
  artifactToWaypointInput,
  artifactToLineInput,
  artifactToPolygonInput,
  type ImportArtifact,
  type ImportParseResult,
} from '../services/geoImport';
import { useUserWaypoints } from '../context/UserWaypointContext';
import { useUserMarkups } from '../context/UserMarkupContext';
import type { WaypointMode } from '../types/userWaypoint';

type ImportPickerParams = {
  ImportPicker: { mode?: WaypointMode };
};

const MODE_CHOICES: WaypointMode[] = ['hunt', 'fish', 'camp', 'hike'];

/** Lazy-loaded picker — same pattern as documentPicker.ts. */
let pickerModule: any = null;
let pickerLoadAttempted = false;
function loadPicker(): any {
  if (pickerLoadAttempted) return pickerModule;
  pickerLoadAttempted = true;
  try {
    pickerModule = require('@react-native-documents/picker');
  } catch (err) {
    console.log('[ImportPicker] picker module not linked:', String(err));
    pickerModule = undefined;
  }
  return pickerModule;
}

interface RowState {
  include: boolean;
  title: string;
}

export default function ImportPickerScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<RouteProp<ImportPickerParams, 'ImportPicker'>>();
  const initialMode: WaypointMode = route.params?.mode ?? 'hunt';

  const [mode, setMode] = useState<WaypointMode>(initialMode);
  const [parseResult, setParseResult] = useState<ImportParseResult | null>(null);
  const [rowStates, setRowStates] = useState<Record<string, RowState>>({});
  const [busy, setBusy] = useState(false);
  const [committing, setCommitting] = useState(false);
  const [sourceLabel, setSourceLabel] = useState<string | null>(null);

  const { addWaypoint } = useUserWaypoints();
  const { addMarkup } = useUserMarkups();

  // ── Pick + parse ───────────────────────────────────────────────────
  const onPickFile = useCallback(async () => {
    if (busy || committing) return;
    const picker = loadPicker();
    if (!picker || typeof picker.pick !== 'function') {
      Alert.alert(
        'Document Picker Unavailable',
        'Please run `npm install && cd ios && pod install`, then try again.',
      );
      return;
    }

    setBusy(true);
    try {
      // Allow any file — KML and GPX MIME types are inconsistent across
      // exporters (Garmin sets octet-stream, OnX sets vnd.google-earth.kml,
      // some set text/xml). We sniff the format ourselves after read.
      const result = await picker.pick({
        type: [picker.types.allFiles],
      });
      const file = Array.isArray(result) ? result[0] : result;
      if (!file?.uri) {
        setBusy(false);
        return;
      }
      const name = file.name || 'imported file';
      setSourceLabel(name);

      // RNFS.readFile takes a URI on iOS; on Android we'd need stat-and-
      // copy for content:// URIs but we're iOS-only for V2.3.
      const raw = await RNFS.readFile(file.uri, 'utf8');
      const parsed = parseGeoFile(raw);
      setParseResult(parsed);

      // Default every artifact to "include" with the parser-extracted
      // title. The user toggles individual rows off if they don't want
      // them.
      const next: Record<string, RowState> = {};
      for (const a of parsed.artifacts) {
        next[a.tempId] = { include: true, title: a.title };
      }
      setRowStates(next);
    } catch (err: any) {
      // Cancellation is the common path — silent.
      if (
        picker.isErrorWithCode &&
        picker.errorCodes &&
        picker.isErrorWithCode(err, picker.errorCodes.OPERATION_CANCELED)
      ) {
        return;
      }
      if (
        (err as any)?.code === 'OPERATION_CANCELED' ||
        (err as any)?.code === 'DOCUMENT_PICKER_CANCELED'
      ) {
        return;
      }
      Alert.alert(
        'Could not read file',
        (err as any)?.message ?? String(err) ?? 'Unknown error',
      );
    } finally {
      setBusy(false);
    }
  }, [busy, committing]);

  // ── Per-row controls ───────────────────────────────────────────────
  const toggleRow = useCallback((tempId: string) => {
    setRowStates((prev) => {
      const cur = prev[tempId];
      if (!cur) return prev;
      return { ...prev, [tempId]: { ...cur, include: !cur.include } };
    });
  }, []);

  const editRowTitle = useCallback((tempId: string, title: string) => {
    setRowStates((prev) => {
      const cur = prev[tempId];
      if (!cur) return prev;
      return { ...prev, [tempId]: { ...cur, title } };
    });
  }, []);

  const includedCount = useMemo(
    () =>
      Object.values(rowStates).filter((r) => r.include).length,
    [rowStates],
  );

  // ── Commit ─────────────────────────────────────────────────────────
  const onImport = useCallback(async () => {
    if (committing || !parseResult) return;
    if (includedCount === 0) {
      Alert.alert(
        'Nothing selected',
        'Toggle at least one row on, or pick a different file.',
      );
      return;
    }
    setCommitting(true);
    let added = 0;
    let failed = 0;
    try {
      for (const a of parseResult.artifacts) {
        const state = rowStates[a.tempId];
        if (!state || !state.include) continue;
        const titled: ImportArtifact = { ...a, title: state.title.trim() || a.title };
        try {
          if (titled.kind === 'waypoint') {
            const input = artifactToWaypointInput(titled, mode);
            if (input) {
              await addWaypoint(input);
              added += 1;
            } else {
              failed += 1;
            }
          } else if (titled.kind === 'line') {
            const input = artifactToLineInput(titled, mode);
            if (input) {
              await addMarkup(input);
              added += 1;
            } else {
              failed += 1;
            }
          } else if (titled.kind === 'polygon') {
            const input = artifactToPolygonInput(titled, mode);
            if (input) {
              await addMarkup(input);
              added += 1;
            } else {
              failed += 1;
            }
          }
        } catch (rowErr) {
          console.log('[ImportPicker] row commit failed:', rowErr);
          failed += 1;
        }
      }
      Alert.alert(
        'Import complete',
        `Added ${added} item${added === 1 ? '' : 's'} to your ${mode.toUpperCase()} layer.${
          failed > 0 ? ` (${failed} could not be saved.)` : ''
        }`,
        [
          {
            text: 'OK',
            onPress: () => navigation.goBack(),
          },
        ],
      );
    } finally {
      setCommitting(false);
    }
  }, [
    committing,
    parseResult,
    rowStates,
    includedCount,
    mode,
    addWaypoint,
    addMarkup,
    navigation,
  ]);

  // ── Render ─────────────────────────────────────────────────────────
  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
    >
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Import KML / GPX</Text>
        <Text style={styles.headerSub}>
          Pull pins, tracks, and shapes from Garmin BaseCamp, OnX, AllTrails,
          Caltopo, gaiagps, or any backup file. Preview each row before
          adding it to your layer.
        </Text>
      </View>

      <Text style={styles.sectionLabel}>DESTINATION MODE</Text>
      <View style={styles.modeRow}>
        {MODE_CHOICES.map((m) => {
          const active = m === mode;
          return (
            <TouchableOpacity
              key={m}
              style={[
                styles.modeChip,
                active && styles.modeChipActive,
              ]}
              onPress={() => setMode(m)}
              accessibilityRole="button"
              accessibilityLabel={`Set destination mode to ${m}`}
            >
              <Text
                style={[
                  styles.modeChipText,
                  active && styles.modeChipTextActive,
                ]}
              >
                {m.toUpperCase()}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <TouchableOpacity
        style={[styles.pickBtn, busy && styles.pickBtnBusy]}
        onPress={onPickFile}
        disabled={busy || committing}
        accessibilityRole="button"
        accessibilityLabel="Pick a KML or GPX file from Files"
      >
        {busy ? (
          <ActivityIndicator color={Colors.background} />
        ) : (
          <Text style={styles.pickBtnText}>
            {parseResult ? 'PICK A DIFFERENT FILE' : 'PICK FILE'}
          </Text>
        )}
      </TouchableOpacity>

      {sourceLabel && (
        <Text style={styles.sourceLabel}>{`Source: ${sourceLabel}`}</Text>
      )}

      {parseResult && (
        <>
          <View style={styles.summaryBox}>
            <Text style={styles.summaryTitle}>
              {parseResult.detectedFormat === 'unknown'
                ? 'Unrecognized file format'
                : `${parseResult.detectedFormat.toUpperCase()} file`}
            </Text>
            <Text style={styles.summaryLine}>
              {`Found ${parseResult.artifacts.length} item${
                parseResult.artifacts.length === 1 ? '' : 's'
              }${
                parseResult.skippedCount > 0
                  ? ` · skipped ${parseResult.skippedCount} unreadable`
                  : ''
              }`}
            </Text>
            {parseResult.warnings.map((w, i) => (
              <Text key={i} style={styles.summaryWarn}>
                {`! ${w}`}
              </Text>
            ))}
          </View>

          {parseResult.artifacts.length === 0 && (
            <Text style={styles.empty}>
              Nothing to import from this file. Try a different KML or GPX.
            </Text>
          )}

          {parseResult.artifacts.map((a) => {
            const state = rowStates[a.tempId];
            if (!state) return null;
            const kindBadge = kindLabel(a);
            return (
              <View key={a.tempId} style={styles.row}>
                <TouchableOpacity
                  style={[
                    styles.checkbox,
                    state.include && styles.checkboxOn,
                  ]}
                  onPress={() => toggleRow(a.tempId)}
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: state.include }}
                  accessibilityLabel={`Include ${state.title}`}
                >
                  <Text style={styles.checkboxMark}>
                    {state.include ? '\u2713' : ''}
                  </Text>
                </TouchableOpacity>
                <View style={styles.rowBody}>
                  <View style={styles.rowHeader}>
                    <View style={styles.kindBadge}>
                      <Text style={styles.kindBadgeText}>{kindBadge}</Text>
                    </View>
                    {a.droppedInnerRings && (
                      <View style={[styles.kindBadge, styles.warnBadge]}>
                        <Text style={styles.warnBadgeText}>HOLES DROPPED</Text>
                      </View>
                    )}
                  </View>
                  <TextInput
                    style={styles.titleInput}
                    value={state.title}
                    onChangeText={(t) => editRowTitle(a.tempId, t)}
                    placeholder="Title"
                    placeholderTextColor={Colors.textMuted}
                  />
                  {a.notes ? (
                    <Text style={styles.notes} numberOfLines={2}>
                      {a.notes}
                    </Text>
                  ) : null}
                  <Text style={styles.coordsHint}>{coordsHint(a)}</Text>
                </View>
              </View>
            );
          })}

          {parseResult.artifacts.length > 0 && (
            <TouchableOpacity
              style={[
                styles.commitBtn,
                committing && styles.commitBtnBusy,
              ]}
              onPress={onImport}
              disabled={committing}
              accessibilityRole="button"
              accessibilityLabel={`Import ${includedCount} items into ${mode} mode`}
            >
              {committing ? (
                <ActivityIndicator color={Colors.background} />
              ) : (
                <Text style={styles.commitBtnText}>
                  {`IMPORT ${includedCount} ITEM${includedCount === 1 ? '' : 'S'} INTO ${mode.toUpperCase()}`}
                </Text>
              )}
            </TouchableOpacity>
          )}
        </>
      )}

      <Text style={styles.disclaimer}>
        We extract pins, lines, and area outlines. Style colors, icons, and
        polygon holes are not round-tripped — your layer's defaults will
        apply.
      </Text>
      <View style={{ height: 60 }} />
    </ScrollView>
  );
}

function kindLabel(a: ImportArtifact): string {
  switch (a.kind) {
    case 'waypoint':
      return 'WAYPOINT';
    case 'line':
      return 'LINE';
    case 'polygon':
      return 'AREA';
  }
}

function coordsHint(a: ImportArtifact): string {
  if (a.kind === 'waypoint' && a.lat !== undefined && a.lng !== undefined) {
    return `${a.lat.toFixed(5)}, ${a.lng.toFixed(5)}`;
  }
  if (a.coordinates) {
    return `${a.coordinates.length} vertices`;
  }
  return '';
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  content: {
    padding: 16,
  },
  header: {
    marginBottom: 16,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginBottom: 4,
  },
  headerSub: {
    fontSize: 13,
    color: Colors.textSecondary,
    lineHeight: 18,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: Colors.textMuted,
    letterSpacing: 1,
    marginBottom: 6,
    marginTop: 4,
  },
  modeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 14,
  },
  modeChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.mud,
    backgroundColor: Colors.surface,
    marginRight: 8,
    marginBottom: 8,
  },
  modeChipActive: {
    borderColor: Colors.amber,
    backgroundColor: Colors.surfaceElevated,
  },
  modeChipText: {
    fontSize: 12,
    fontWeight: '800',
    color: Colors.textSecondary,
    letterSpacing: 0.8,
  },
  modeChipTextActive: {
    color: Colors.amber,
  },
  pickBtn: {
    backgroundColor: Colors.moss,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginBottom: 12,
  },
  pickBtnBusy: {
    opacity: 0.7,
  },
  pickBtnText: {
    color: Colors.background,
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  sourceLabel: {
    color: Colors.textMuted,
    fontSize: 12,
    marginBottom: 12,
  },
  summaryBox: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.mud,
    borderRadius: 10,
    padding: 12,
    marginBottom: 14,
  },
  summaryTitle: {
    color: Colors.textPrimary,
    fontSize: 13,
    fontWeight: '800',
    marginBottom: 4,
    letterSpacing: 0.5,
  },
  summaryLine: {
    color: Colors.textSecondary,
    fontSize: 12,
    lineHeight: 16,
  },
  summaryWarn: {
    color: Colors.amber,
    fontSize: 12,
    marginTop: 4,
    lineHeight: 16,
  },
  empty: {
    color: Colors.textSecondary,
    fontSize: 13,
    marginBottom: 14,
    textAlign: 'center',
  },
  row: {
    flexDirection: 'row',
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.mud,
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: Colors.mud,
    backgroundColor: Colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    marginTop: 2,
  },
  checkboxOn: {
    backgroundColor: Colors.moss,
    borderColor: Colors.moss,
  },
  checkboxMark: {
    color: Colors.background,
    fontSize: 16,
    fontWeight: '800',
    lineHeight: 18,
  },
  rowBody: {
    flex: 1,
  },
  rowHeader: {
    flexDirection: 'row',
    marginBottom: 6,
  },
  kindBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    backgroundColor: Colors.background,
    borderWidth: 1,
    borderColor: Colors.oak,
    marginRight: 6,
  },
  kindBadgeText: {
    color: Colors.oak,
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  warnBadge: {
    borderColor: Colors.amber,
  },
  warnBadgeText: {
    color: Colors.amber,
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  titleInput: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.textPrimary,
    backgroundColor: Colors.background,
    borderWidth: 1,
    borderColor: Colors.mud,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 6,
    marginBottom: 4,
  },
  notes: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginBottom: 4,
    lineHeight: 16,
  },
  coordsHint: {
    fontSize: 11,
    color: Colors.textMuted,
  },
  commitBtn: {
    backgroundColor: Colors.mdGold,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 8,
  },
  commitBtnBusy: {
    opacity: 0.7,
  },
  commitBtnText: {
    color: Colors.background,
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  disclaimer: {
    marginTop: 16,
    fontSize: 11,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 15,
  },
});
