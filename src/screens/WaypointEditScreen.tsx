/**
 * WaypointEditScreen — Create / edit / delete a personal waypoint.
 *
 * Route params:
 *   - `mode`        (WaypointMode, required) — which mode-stack opened this
 *   - `waypointId?` (string) — if present, edit; if absent, create
 *   - `initialLat?` / `initialLng?` (number) — seed coordinates for the
 *     create flow (e.g., long-press on map provided a location, or the
 *     list screen passed the Maryland centroid placeholder)
 *
 * Behavior:
 *   - Category picker filtered by the mode (CATEGORIES_BY_MODE[mode])
 *   - Title: required, maxLength 80
 *   - Notes: optional, multiline, maxLength 2000
 *   - Lat/Lng: Phase A.1 displays as read-only. The "Pick on Map" affordance
 *     is Phase A.1b — for now, Edit preserves existing coordinates and
 *     Create uses whatever seed the caller passed (or 0,0 if missing, with
 *     a prominent "Location not set" warning so we never silently lie).
 *   - Photos: tap "+ ADD PHOTO" to launch pickPhoto (camera or library).
 *     Rendered as thumbnails; tap to remove (with confirmation).
 *   - Save: commits via addWaypoint or updateWaypoint, then navigation.goBack()
 *   - Cancel: discards changes and goes back (confirms if dirty)
 *   - Delete: (edit mode only) confirms → deleteWaypoint → goBack
 *
 * Matches the style conventions of CampDetailsEditor.tsx: Cancel / Title /
 * Save header row, label+input sections, primary action in Colors.mdGold.
 * Rendered as a full screen rather than a modal because the per-mode tab
 * stacks push this via navigation.navigate('WaypointEdit', …).
 *
 * Added 2026-04-24 per V2_3_FEATURE_EXPANSION_PLAN §3 / Phase A.1.
 */

import React, { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import Colors from '../theme/colors';
import { useUserWaypoints } from '../context/UserWaypointContext';
import { pickPhoto } from '../services/imagePicker';
import FavoriteStarButton from '../components/personal/FavoriteStarButton';
import {
  UserWaypoint,
  WaypointCategory,
  WaypointMode,
  CATEGORY_META,
  CATEGORIES_BY_MODE,
  resolveWaypointColor,
  resolveWaypointLetterCode,
} from '../types/userWaypoint';

// ── Route typing ─────────────────────────────────────────────────────
type WaypointEditParams = {
  WaypointEdit: {
    mode: WaypointMode;
    waypointId?: string;
    initialLat?: number;
    initialLng?: number;
  };
};

/**
 * Format a lat/lng pair for display. Six decimals ≈ 11 cm precision,
 * which is well below any GPS we can realistically trust, but matches
 * the convention in scout waypoints and deercamp annotations so users
 * aren't seeing three different precisions across the app.
 */
function fmtCoord(v: number | null | undefined): string {
  if (v == null || !Number.isFinite(v)) return '—';
  return v.toFixed(6);
}

/**
 * Default category for a given mode. The first entry in CATEGORIES_BY_MODE
 * is curated to be the most common pick for that mode (tree-stand for
 * hunt, hole for fish, tent for camp, landmark for hike).
 */
function defaultCategoryFor(mode: WaypointMode): WaypointCategory {
  return CATEGORIES_BY_MODE[mode][0];
}

export default function WaypointEditScreen() {
  const route = useRoute<RouteProp<WaypointEditParams, 'WaypointEdit'>>();
  const navigation = useNavigation<any>();
  const { mode, waypointId, initialLat, initialLng } = route.params;
  const {
    getWaypoint,
    addWaypoint,
    updateWaypoint,
    deleteWaypoint,
    hydrated,
  } = useUserWaypoints();

  const isEdit = !!waypointId;
  const existing: UserWaypoint | null = useMemo(
    () => (waypointId ? getWaypoint(waypointId) : null),
    [waypointId, getWaypoint],
  );

  // ── Form state ──────────────────────────────────────────────────────
  // Seeded from the existing waypoint on edit, or from route-param seeds /
  // mode defaults on create. We keep a `dirty` flag so Cancel can confirm
  // before discarding user input.
  const [category, setCategory] = useState<WaypointCategory>(
    existing ? existing.category : defaultCategoryFor(mode),
  );
  const [title, setTitle] = useState<string>(existing ? existing.title : '');
  const [notes, setNotes] = useState<string>(existing ? existing.notes : '');
  const [lat, setLat] = useState<number | null>(
    existing ? existing.lat : initialLat ?? null,
  );
  const [lng, setLng] = useState<number | null>(
    existing ? existing.lng : initialLng ?? null,
  );
  const [photoUris, setPhotoUris] = useState<string[]>(
    existing ? existing.photoUris : [],
  );
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);

  // If the context hydrates AFTER this screen mounts (user deep-linked into
  // an edit URL before storage loaded), refresh form state once the real
  // row lands. Without this, edit opens briefly with default values and
  // then the user's actual data would require a remount to appear.
  useEffect(() => {
    if (!isEdit) return;
    if (!hydrated) return;
    if (!existing) return;
    setCategory(existing.category);
    setTitle(existing.title);
    setNotes(existing.notes);
    setLat(existing.lat);
    setLng(existing.lng);
    setPhotoUris(existing.photoUris);
    setDirty(false);
  }, [hydrated, existing, isEdit]);

  // ── Derived ─────────────────────────────────────────────────────────
  // Category list filtered to this mode. Centralized so the picker and the
  // header preview badge stay in sync.
  const modeCategories = CATEGORIES_BY_MODE[mode];

  // Ephemeral waypoint shape used by resolveWaypointColor / resolveWaypointLetterCode
  // to power the preview badge at the top of the screen. We don't create a
  // real UserWaypoint here because `id`/timestamps are meaningless until
  // save; the resolvers only read `category` and `colorOverride`.
  const previewWp = useMemo(
    () =>
      ({
        id: 'preview',
        createdAt: '',
        updatedAt: '',
        mode,
        category,
        title: '',
        notes: '',
        lat: 0,
        lng: 0,
        photoUris: [],
        colorOverride: existing?.colorOverride,
      } satisfies UserWaypoint),
    [mode, category, existing?.colorOverride],
  );
  const previewColor = resolveWaypointColor(previewWp);
  const previewCode = resolveWaypointLetterCode(previewWp);

  const hasLocation =
    lat != null &&
    lng != null &&
    Number.isFinite(lat) &&
    Number.isFinite(lng);

  const canSave = title.trim().length > 0 && hasLocation && !saving;

  // ── Handlers ────────────────────────────────────────────────────────
  const markDirty = () => {
    if (!dirty) setDirty(true);
  };

  const onPickCategory = (c: WaypointCategory) => {
    setCategory(c);
    markDirty();
  };

  const onChangeTitle = (v: string) => {
    setTitle(v);
    markDirty();
  };

  const onChangeNotes = (v: string) => {
    setNotes(v);
    markDirty();
  };

  const onAddPhoto = async () => {
    const uri = await pickPhoto();
    if (!uri) return;
    setPhotoUris((prev) => [...prev, uri]);
    markDirty();
  };

  const onRemovePhoto = (uri: string) => {
    Alert.alert(
      'Remove photo?',
      'The photo will be detached from this waypoint. The file on your device is not deleted.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: () => {
            setPhotoUris((prev) => prev.filter((u) => u !== uri));
            markDirty();
          },
        },
      ],
    );
  };

  const onPickOnMap = () => {
    // Phase A.1b wires map-driven location editing. Until then, surface a
    // clear "not implemented yet" affordance rather than a broken button.
    Alert.alert(
      'Pick on Map',
      'Choosing a precise location on the map is coming in the next update. For now, long-press the map to drop a pin and then tap it to rename and categorize.',
    );
  };

  const onCancel = () => {
    if (!dirty) {
      navigation.goBack();
      return;
    }
    Alert.alert(
      'Discard changes?',
      'Your edits to this waypoint will be lost.',
      [
        { text: 'Keep Editing', style: 'cancel' },
        {
          text: 'Discard',
          style: 'destructive',
          onPress: () => navigation.goBack(),
        },
      ],
    );
  };

  const onSave = async () => {
    if (!canSave || lat == null || lng == null) return;
    setSaving(true);
    try {
      if (isEdit && waypointId) {
        await updateWaypoint(waypointId, {
          category,
          title: title.trim(),
          notes,
          lat,
          lng,
          photoUris,
        });
      } else {
        await addWaypoint({
          mode,
          category,
          title: title.trim(),
          notes,
          lat,
          lng,
          photoUris,
        });
      }
      navigation.goBack();
    } catch (err) {
      Alert.alert('Save failed', String(err));
      setSaving(false);
    }
  };

  const onDelete = () => {
    if (!isEdit || !waypointId) return;
    Alert.alert(
      'Delete waypoint?',
      'This waypoint will be permanently removed from this device. This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            await deleteWaypoint(waypointId);
            navigation.goBack();
          },
        },
      ],
    );
  };

  // ── Render ──────────────────────────────────────────────────────────
  // Guard: if we're in edit mode and the context is hydrated but the id
  // doesn't match anything, show a friendly not-found rather than a blank
  // form. This can happen if the user follows a stale deep link.
  if (isEdit && hydrated && !existing) {
    return (
      <View style={styles.screen}>
        <View style={styles.header}>
          <Pressable onPress={() => navigation.goBack()} hitSlop={16}>
            <Text style={styles.cancelText}>BACK</Text>
          </Pressable>
          <Text style={styles.headerTitle}>Waypoint</Text>
          <View style={{ width: 60 }} />
        </View>
        <View style={styles.notFoundWrap}>
          <Text style={styles.notFoundTitle}>Waypoint not found</Text>
          <Text style={styles.notFoundBody}>
            This waypoint may have been deleted from another device, or the
            link you followed is no longer valid.
          </Text>
        </View>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.header}>
        <Pressable onPress={onCancel} hitSlop={16}>
          <Text style={styles.cancelText}>CANCEL</Text>
        </Pressable>
        <Text style={styles.headerTitle}>
          {isEdit ? 'Edit Waypoint' : 'New Waypoint'}
        </Text>
        <Pressable onPress={onSave} hitSlop={16} disabled={!canSave}>
          <Text style={[styles.saveText, !canSave && styles.saveTextDisabled]}>
            {saving ? 'SAVING…' : 'SAVE'}
          </Text>
        </Pressable>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollBody}
        keyboardShouldPersistTaps="handled"
      >
        {/* Preview row — shows the exact badge that will appear on the map */}
        <View style={styles.previewRow}>
          <View style={[styles.previewBadge, { backgroundColor: previewColor }]}>
            <Text style={styles.previewBadgeText}>{previewCode}</Text>
          </View>
          <View style={styles.previewBody}>
            <Text style={styles.previewTitle} numberOfLines={1}>
              {title.trim() || 'Untitled Waypoint'}
            </Text>
            <Text style={styles.previewMeta} numberOfLines={1}>
              {CATEGORY_META[category]?.label ?? category} · {mode.toUpperCase()}
            </Text>
          </View>
        </View>

        {/* Category picker ─ mode-filtered chip grid */}
        <Text style={styles.label}>CATEGORY</Text>
        <View style={styles.chipGrid}>
          {modeCategories.map((c) => {
            const meta = CATEGORY_META[c];
            const selected = c === category;
            const chipColor = meta?.defaultColor ?? Colors.mud;
            return (
              <Pressable
                key={c}
                onPress={() => onPickCategory(c)}
                style={[
                  styles.chip,
                  selected && {
                    backgroundColor: chipColor,
                    borderColor: chipColor,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.chipText,
                    selected && styles.chipTextSelected,
                  ]}
                >
                  {meta?.label ?? c}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {/* Title ─ required */}
        <Text style={styles.label}>TITLE</Text>
        <TextInput
          value={title}
          onChangeText={onChangeTitle}
          placeholder={`e.g., "${CATEGORY_META[category]?.label ?? 'Waypoint'} #1"`}
          placeholderTextColor={Colors.textMuted}
          style={styles.input}
          maxLength={80}
          returnKeyType="done"
        />

        {/* Notes ─ optional, long-form */}
        <Text style={styles.label}>NOTES</Text>
        <TextInput
          value={notes}
          onChangeText={onChangeNotes}
          placeholder="Wind direction, trail-cam battery, access notes…"
          placeholderTextColor={Colors.textMuted}
          style={[styles.input, styles.multilineInput]}
          multiline
          textAlignVertical="top"
          maxLength={2000}
        />
        <Text style={styles.helper}>
          Private to this device. Not shared with other users unless you
          explicitly post to a Deer Camp.
        </Text>

        {/* Location ─ read-only in Phase A.1 */}
        <Text style={styles.label}>LOCATION</Text>
        {hasLocation ? (
          <View style={styles.locationRow}>
            <View style={styles.locationBody}>
              <Text style={styles.locationCoords}>
                {fmtCoord(lat)}, {fmtCoord(lng)}
              </Text>
              <Text style={styles.locationHint}>
                Decimal degrees (WGS84).
              </Text>
            </View>
            <Pressable onPress={onPickOnMap} hitSlop={10}>
              <Text style={styles.locationLink}>PICK ON MAP</Text>
            </Pressable>
          </View>
        ) : (
          <View style={[styles.locationRow, styles.locationWarning]}>
            <View style={styles.locationBody}>
              <Text style={styles.locationWarningTitle}>Location not set</Text>
              <Text style={styles.locationHint}>
                Go back to the map, long-press the spot you want to save,
                and save it from there. You can't save a waypoint without a
                location.
              </Text>
            </View>
            <Pressable onPress={onPickOnMap} hitSlop={10}>
              <Text style={styles.locationLink}>PICK ON MAP</Text>
            </Pressable>
          </View>
        )}

        {/* Photos */}
        <View style={styles.sectionHeader}>
          <Text style={styles.label}>PHOTOS</Text>
          <Pressable onPress={onAddPhoto} hitSlop={10}>
            <Text style={styles.addLink}>+ ADD PHOTO</Text>
          </Pressable>
        </View>
        {photoUris.length === 0 ? (
          <Text style={styles.photoEmpty}>
            Attach trail-cam stills, a photo of the rub, a shot of the boat
            ramp — whatever makes this waypoint recognizable later.
          </Text>
        ) : (
          <View style={styles.photoGrid}>
            {photoUris.map((uri) => (
              <Pressable
                key={uri}
                onPress={() => onRemovePhoto(uri)}
                style={styles.photoTile}
                accessibilityLabel="Remove photo"
              >
                <Image source={{ uri }} style={styles.photoImage} />
                <View style={styles.photoRemoveBadge}>
                  <Text style={styles.photoRemoveText}>×</Text>
                </View>
              </Pressable>
            ))}
          </View>
        )}

        {/* Star toggle ─ edit mode only (a row must exist before it can be pinned) */}
        {isEdit && waypointId ? (
          <FavoriteStarButton kind="waypoint" id={waypointId} />
        ) : null}

        {/* Delete ─ edit mode only */}
        {isEdit && (
          <Pressable onPress={onDelete} style={styles.deleteBtn} hitSlop={8}>
            <Text style={styles.deleteText}>DELETE WAYPOINT</Text>
          </Pressable>
        )}

        <View style={{ height: 24 }} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingTop: 14,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderColor: Colors.mud,
  },
  headerTitle: {
    color: Colors.textPrimary,
    fontSize: 15,
    fontWeight: '700',
  },
  cancelText: {
    color: Colors.textSecondary,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.6,
  },
  saveText: {
    color: Colors.mdGold,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.6,
  },
  saveTextDisabled: {
    color: Colors.textMuted,
  },
  scroll: {
    flex: 1,
  },
  scrollBody: {
    padding: 18,
    paddingBottom: 60,
  },
  previewRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: Colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.mud,
    marginBottom: 18,
  },
  previewBadge: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  previewBadgeText: {
    color: Colors.textOnAccent,
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.6,
  },
  previewBody: {
    flex: 1,
  },
  previewTitle: {
    color: Colors.textPrimary,
    fontSize: 15,
    fontWeight: '700',
  },
  previewMeta: {
    color: Colors.textSecondary,
    fontSize: 12,
    marginTop: 2,
  },
  label: {
    color: Colors.textMuted,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.8,
    marginBottom: 6,
    marginTop: 6,
  },
  chipGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 14,
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 16,
    backgroundColor: Colors.surfaceElevated,
    borderWidth: 1,
    borderColor: Colors.mud,
  },
  chipText: {
    color: Colors.textSecondary,
    fontSize: 12,
    fontWeight: '600',
  },
  chipTextSelected: {
    color: Colors.textOnAccent,
    fontWeight: '800',
  },
  input: {
    backgroundColor: Colors.surfaceElevated,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: Colors.textPrimary,
    fontSize: 14,
    borderWidth: 1,
    borderColor: Colors.mud,
    marginBottom: 6,
  },
  multilineInput: {
    height: 120,
  },
  helper: {
    color: Colors.textMuted,
    fontSize: 11,
    lineHeight: 15,
    marginTop: 2,
    marginBottom: 16,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: Colors.surfaceElevated,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.mud,
    marginBottom: 16,
  },
  locationWarning: {
    backgroundColor: Colors.surface,
    borderColor: Colors.amber,
  },
  locationBody: {
    flex: 1,
    marginRight: 10,
  },
  locationCoords: {
    color: Colors.textPrimary,
    fontSize: 14,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  locationWarningTitle: {
    color: Colors.amber,
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 3,
  },
  locationHint: {
    color: Colors.textMuted,
    fontSize: 11,
    lineHeight: 15,
    marginTop: 2,
  },
  locationLink: {
    color: Colors.mdGold,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.6,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
  },
  addLink: {
    color: Colors.mdGold,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.6,
  },
  photoEmpty: {
    color: Colors.textMuted,
    fontSize: 12,
    lineHeight: 17,
    padding: 12,
    backgroundColor: Colors.surfaceElevated,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.mud,
    borderStyle: 'dashed',
    marginTop: 6,
    marginBottom: 16,
  },
  photoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 6,
    marginBottom: 16,
  },
  photoTile: {
    width: 92,
    height: 92,
    borderRadius: 10,
    overflow: 'hidden',
    backgroundColor: Colors.surfaceElevated,
    borderWidth: 1,
    borderColor: Colors.mud,
    position: 'relative',
  },
  photoImage: {
    width: '100%',
    height: '100%',
  },
  photoRemoveBadge: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  photoRemoveText: {
    color: Colors.textOnAccent,
    fontSize: 14,
    fontWeight: '800',
    lineHeight: 16,
  },
  deleteBtn: {
    marginTop: 20,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.danger,
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  deleteText: {
    color: Colors.danger,
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  notFoundWrap: {
    flex: 1,
    padding: 28,
    justifyContent: 'center',
    alignItems: 'center',
  },
  notFoundTitle: {
    color: Colors.textPrimary,
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 8,
  },
  notFoundBody: {
    color: Colors.textMuted,
    fontSize: 13,
    lineHeight: 19,
    textAlign: 'center',
  },
});
