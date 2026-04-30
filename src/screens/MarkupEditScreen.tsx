/**
 * MarkupEditScreen — Rename / recolor / delete / export a single markup.
 *
 * Geometry editing (move vertices) is intentionally out of scope here —
 * if the user wants a different shape, they redraw. This keeps the edit
 * surface tight: title, notes, color, photos, delete, and export.
 *
 * Export is delegated to `geoExport` + the native Share sheet so a single
 * tap produces a .kml or .gpx the user can drop into onX Hunt, Garmin
 * BaseCamp, Google Earth, etc.
 *
 * V2_3_FEATURE_EXPANSION_PLAN §D.2.
 */

import React, { useCallback, useMemo, useState } from 'react';
import {
  Alert,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import Colors from '../theme/colors';
import { useUserMarkups } from '../context/UserMarkupContext';
import FavoriteStarButton from '../components/personal/FavoriteStarButton';
import {
  DEFAULT_MARKUP_COLOR,
  resolveMarkupColor,
  UserMarkup,
} from '../types/userMarkup';
import type { WaypointMode } from '../types/userWaypoint';
import { buildKml, buildGpx } from '../services/geoExport';

type MarkupEditParams = {
  MarkupEdit: { mode: WaypointMode; markupId: string };
};

const COLOR_PALETTE = [
  '#f59e0b', // default amber
  '#ef4444', // red
  '#10b981', // emerald
  '#3b82f6', // blue
  '#a855f7', // purple
  '#ffffff', // white
];

export default function MarkupEditScreen() {
  const route = useRoute<RouteProp<MarkupEditParams, 'MarkupEdit'>>();
  const navigation = useNavigation<any>();
  const { mode, markupId } = route.params;
  const { getMarkup, updateMarkup, deleteMarkup } = useUserMarkups();

  const target = useMemo(() => getMarkup(markupId), [getMarkup, markupId]);

  const [title, setTitle] = useState(target?.title ?? '');
  const [notes, setNotes] = useState(target?.notes ?? '');
  const [color, setColor] = useState<string>(
    target ? resolveMarkupColor(target) : DEFAULT_MARKUP_COLOR,
  );

  const onSave = useCallback(async () => {
    if (!target) return;
    await updateMarkup(target.id, {
      title: title.trim(),
      notes: notes.trim(),
      color,
    });
    navigation.goBack();
  }, [target, title, notes, color, updateMarkup, navigation]);

  const onDelete = useCallback(() => {
    if (!target) return;
    Alert.alert(
      'Delete markup?',
      `"${target.title || 'Untitled'}" will be permanently removed.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            await deleteMarkup(target.id);
            navigation.goBack();
          },
        },
      ],
    );
  }, [target, deleteMarkup, navigation]);

  const onExport = useCallback(
    async (fmt: 'kml' | 'gpx') => {
      if (!target) return;
      // Save changes first so the export reflects what the user just typed.
      await updateMarkup(target.id, {
        title: title.trim(),
        notes: notes.trim(),
        color,
      });
      const fresh: UserMarkup = {
        ...target,
        title: title.trim(),
        notes: notes.trim(),
        color,
      } as UserMarkup;
      const body =
        fmt === 'kml'
          ? buildKml({ waypoints: [], markups: [fresh] })
          : buildGpx({ waypoints: [], markups: [fresh] });
      try {
        await Share.share({
          title: `${fresh.title || 'Markup'}.${fmt}`,
          message: body,
        });
      } catch {
        // Share cancellation isn't an error worth surfacing.
      }
    },
    [target, title, notes, color, updateMarkup],
  );

  if (!target) {
    return (
      <View style={styles.screen}>
        <View style={styles.empty}>
          <Text style={styles.emptyTitle}>Markup not found</Text>
          <Text style={styles.emptyHint}>
            It may have been deleted from another device or session.
          </Text>
          <Pressable onPress={() => navigation.goBack()} style={styles.primaryBtn}>
            <Text style={styles.primaryBtnText}>BACK</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  const shapeLabel =
    target.shapeType === 'LineString' ? 'Line' : 'Polygon (area)';

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.body}>
      <Text style={styles.section}>{shapeLabel.toUpperCase()} — {mode.toUpperCase()}</Text>

      <Text style={styles.label}>TITLE</Text>
      <TextInput
        value={title}
        onChangeText={setTitle}
        placeholder={target.shapeType === 'Polygon' ? 'e.g., Property A' : 'e.g., Shoot Lane North'}
        placeholderTextColor={Colors.textMuted}
        style={styles.input}
      />

      <Text style={styles.label}>NOTES</Text>
      <TextInput
        value={notes}
        onChangeText={setNotes}
        multiline
        placeholder="Optional"
        placeholderTextColor={Colors.textMuted}
        style={[styles.input, styles.notesInput]}
      />

      <Text style={styles.label}>COLOR</Text>
      <View style={styles.swatchRow}>
        {COLOR_PALETTE.map((c) => (
          <Pressable
            key={c}
            onPress={() => setColor(c)}
            style={[
              styles.swatch,
              { backgroundColor: c },
              color === c ? styles.swatchActive : null,
            ]}
          />
        ))}
      </View>

      <Text style={styles.label}>EXPORT</Text>
      <View style={styles.exportRow}>
        <Pressable onPress={() => onExport('kml')} style={styles.secondaryBtn}>
          <Text style={styles.secondaryBtnText}>SHARE .KML</Text>
        </Pressable>
        <Pressable onPress={() => onExport('gpx')} style={styles.secondaryBtn}>
          <Text style={styles.secondaryBtnText}>SHARE .GPX</Text>
        </Pressable>
      </View>

      <FavoriteStarButton kind="markup" id={target.id} />

      <Pressable onPress={onSave} style={styles.primaryBtn}>
        <Text style={styles.primaryBtnText}>SAVE CHANGES</Text>
      </Pressable>
      <Pressable onPress={onDelete} style={styles.dangerBtn}>
        <Text style={styles.dangerBtnText}>DELETE MARKUP</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.background },
  body: { padding: 18, paddingBottom: 40 },
  empty: { flex: 1, padding: 28, justifyContent: 'center', alignItems: 'center' },
  emptyTitle: {
    color: Colors.textPrimary,
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 8,
  },
  emptyHint: { color: Colors.textMuted, fontSize: 13, textAlign: 'center', marginBottom: 16 },
  section: {
    color: Colors.mdGold,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.2,
    marginBottom: 10,
  },
  label: {
    color: Colors.textMuted,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.8,
    marginTop: 14,
    marginBottom: 6,
  },
  input: {
    backgroundColor: Colors.surface,
    borderRadius: 8,
    color: Colors.textPrimary,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
  },
  notesInput: { minHeight: 80, textAlignVertical: 'top' },
  swatchRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  swatch: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 2,
    borderColor: Colors.mud,
    marginRight: 8,
    marginBottom: 4,
  },
  swatchActive: { borderColor: Colors.textPrimary, borderWidth: 3 },
  exportRow: { flexDirection: 'row', gap: 10 },
  secondaryBtn: {
    backgroundColor: Colors.surfaceElevated,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 8,
    flex: 1,
    alignItems: 'center',
    marginRight: 8,
  },
  secondaryBtnText: {
    color: Colors.textPrimary,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.8,
  },
  primaryBtn: {
    backgroundColor: Colors.mdGold,
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 18,
  },
  primaryBtnText: {
    color: Colors.mdBlack,
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 1,
  },
  dangerBtn: {
    backgroundColor: 'transparent',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 8,
  },
  dangerBtnText: {
    color: '#ef4444',
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.8,
  },
});
