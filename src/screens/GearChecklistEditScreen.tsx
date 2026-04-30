/**
 * GearChecklistEditScreen — Edit one GearChecklist (or create a new one).
 *
 * Two routes:
 *   - GearChecklistEdit { mode } → create new (seeded from BASE_GEAR_LIBRARY)
 *   - GearChecklistEdit { mode, checklistId } → edit existing
 *
 * The edit surface:
 *   - Name (required, ≤80 chars)
 *   - Optional trip date (YYYY-MM-DD)
 *   - Items grouped by category (sortOrder)
 *   - Per-item tap → toggle checked
 *   - Per-item swipe-no, just a small (×) on customs
 *   - "+ ADD ITEM" row at the bottom of every category
 *
 * Save commits the new/edited checklist. Cancel asks if dirty.
 *
 * Phase A.6 — added 2026-04-24 per V2_3_FEATURE_EXPANSION_PLAN.
 */

import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import {
  useNavigation,
  useRoute,
  RouteProp,
} from '@react-navigation/native';
import Colors from '../theme/colors';
import { useGearChecklists } from '../context/GearChecklistContext';
import FavoriteStarButton from '../components/personal/FavoriteStarButton';
import {
  GearChecklist,
  GEAR_CATEGORY_META,
  GearCategory,
  countItems,
  defaultChecklistName,
  groupByCategory,
} from '../types/gearChecklist';
import type { WaypointMode } from '../types/userWaypoint';

type GearChecklistEditParams = {
  GearChecklistEdit: { mode: WaypointMode; checklistId?: string };
};

function isValidIsoDate(s: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  const [y, m, d] = s.split('-').map((p) => parseInt(p, 10));
  const dt = new Date(y, m - 1, d);
  return (
    dt.getFullYear() === y &&
    dt.getMonth() === m - 1 &&
    dt.getDate() === d
  );
}

const ADDABLE_CATEGORIES: GearCategory[] = [
  'safety',
  'navigation',
  'apparel',
  'food-water',
  'shelter',
  'tools',
  'optics',
  'mode-specific',
  'other',
];

export default function GearChecklistEditScreen() {
  const route = useRoute<RouteProp<GearChecklistEditParams, 'GearChecklistEdit'>>();
  const navigation = useNavigation<any>();
  const { mode, checklistId } = route.params;
  const {
    getChecklist,
    addChecklist,
    updateChecklist,
    deleteChecklist,
    toggleItem,
    addCustomItem,
    removeCustomItem,
  } = useGearChecklists();

  const isEditing = !!checklistId;
  const existing: GearChecklist | null = useMemo(
    () => (checklistId ? getChecklist(checklistId) : null),
    [checklistId, getChecklist],
  );

  // ── Form state. For new checklists, the row is created on first save
  // (giving the user a chance to cancel without persisting an empty list).
  // For existing, we mutate via context immediately on toggles, but local
  // state holds name + tripDate edits until "Save".
  const [name, setName] = useState<string>(
    existing?.name ?? defaultChecklistName(mode),
  );
  const [tripDate, setTripDate] = useState<string>(existing?.tripDate ?? '');
  const [newItemLabel, setNewItemLabel] = useState<string>('');
  const [newItemCategory, setNewItemCategory] = useState<GearCategory>('other');
  const [pickerOpen, setPickerOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const dirtyRef = useRef(false);

  // ── For new checklists, we need an in-memory checklist to render
  // toggles. Create it eagerly, but only persist on Save.
  const [draftId, setDraftId] = useState<string | null>(checklistId ?? null);

  // Re-pull the live row whenever the context updates and we have an id.
  const live: GearChecklist | null = useMemo(
    () => (draftId ? getChecklist(draftId) : null),
    [draftId, getChecklist],
  );

  // For "new" mode, ensure a draft exists so the user can interact w/ items.
  useEffect(() => {
    if (!isEditing && !draftId) {
      (async () => {
        const created = await addChecklist({ mode, name });
        setDraftId(created.id);
      })();
    }
    // intentionally only on first mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const dateOk = tripDate.trim() === '' || isValidIsoDate(tripDate.trim());
  const canSave = name.trim().length > 0 && dateOk && !saving;

  const grouped = useMemo(
    () => (live ? groupByCategory(live.items) : []),
    [live],
  );
  const counts = live ? countItems(live.items) : { checked: 0, total: 0 };

  const onToggle = useCallback(
    (itemId: string) => {
      if (!live) return;
      void toggleItem(live.id, itemId);
    },
    [live, toggleItem],
  );

  const onRemoveCustom = useCallback(
    (itemId: string) => {
      if (!live) return;
      void removeCustomItem(live.id, itemId);
    },
    [live, removeCustomItem],
  );

  const onAddItem = useCallback(() => {
    if (!live) return;
    const label = newItemLabel.trim();
    if (!label) return;
    void addCustomItem(live.id, label, newItemCategory);
    setNewItemLabel('');
    dirtyRef.current = true;
  }, [live, newItemLabel, newItemCategory, addCustomItem]);

  const onSave = useCallback(async () => {
    if (!canSave || !live) return;
    setSaving(true);
    await updateChecklist(live.id, {
      name: name.trim(),
      tripDate: tripDate.trim() === '' ? undefined : tripDate.trim(),
    });
    setSaving(false);
    navigation.goBack();
  }, [canSave, live, name, tripDate, updateChecklist, navigation]);

  const onCancel = useCallback(() => {
    if (!isEditing && live) {
      // Discarding a brand-new draft → delete the row we eagerly created.
      Alert.alert(
        'Discard checklist?',
        'This new checklist will be deleted.',
        [
          { text: 'Keep editing', style: 'cancel' },
          {
            text: 'Discard',
            style: 'destructive',
            onPress: async () => {
              await deleteChecklist(live.id);
              navigation.goBack();
            },
          },
        ],
      );
      return;
    }
    navigation.goBack();
  }, [isEditing, live, deleteChecklist, navigation]);

  const onDelete = useCallback(() => {
    if (!live) return;
    Alert.alert(
      'Delete checklist?',
      `"${live.name}" will be permanently removed from this device.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            await deleteChecklist(live.id);
            navigation.goBack();
          },
        },
      ],
    );
  }, [live, deleteChecklist, navigation]);

  if (!live) {
    return (
      <View style={styles.screen}>
        <View style={styles.emptyWrap}>
          <Text style={styles.emptyText}>Loading checklist…</Text>
        </View>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={styles.screen}
    >
      <ScrollView
        contentContainerStyle={styles.body}
        keyboardShouldPersistTaps="handled"
      >
        {/* Progress meter */}
        <View style={styles.progressRow}>
          <View style={styles.progressTrack}>
            <View
              style={[
                styles.progressFill,
                {
                  width: `${counts.total === 0 ? 0 : Math.round((counts.checked / counts.total) * 100)}%`,
                  backgroundColor:
                    counts.total > 0 && counts.checked === counts.total
                      ? Colors.moss
                      : Colors.amber,
                },
              ]}
            />
          </View>
          <Text style={styles.progressText}>
            {counts.checked}/{counts.total}
          </Text>
        </View>

        {/* Name */}
        <View style={styles.field}>
          <Text style={styles.label}>NAME</Text>
          <TextInput
            value={name}
            onChangeText={(t) => {
              setName(t);
              dirtyRef.current = true;
            }}
            placeholder="e.g. Opening day stand sit"
            placeholderTextColor={Colors.textMuted}
            maxLength={80}
            style={styles.input}
          />
        </View>

        {/* Trip date */}
        <View style={styles.field}>
          <Text style={styles.label}>TRIP DATE  ·  optional</Text>
          <TextInput
            value={tripDate}
            onChangeText={(t) => {
              setTripDate(t);
              dirtyRef.current = true;
            }}
            placeholder="YYYY-MM-DD"
            placeholderTextColor={Colors.textMuted}
            style={[
              styles.input,
              !dateOk && { borderColor: Colors.danger },
            ]}
            autoCorrect={false}
            autoCapitalize="none"
          />
          {!dateOk && (
            <Text style={styles.errorText}>Use YYYY-MM-DD format.</Text>
          )}
        </View>

        {/* Items grouped by category */}
        {grouped.map((group) => {
          const meta = GEAR_CATEGORY_META[group.category];
          return (
            <View key={group.category} style={styles.groupBlock}>
              <View style={styles.groupHeader}>
                <View style={styles.groupCode}>
                  <Text style={styles.groupCodeText}>{meta.letterCode}</Text>
                </View>
                <Text style={styles.groupTitle}>{meta.label.toUpperCase()}</Text>
              </View>
              {group.items.map((item) => (
                <Pressable
                  key={item.id}
                  onPress={() => onToggle(item.id)}
                  style={styles.itemRow}
                  android_ripple={{ color: Colors.surfaceElevated }}
                >
                  <View
                    style={[
                      styles.checkbox,
                      item.checked && styles.checkboxChecked,
                    ]}
                  >
                    {item.checked && (
                      <Text style={styles.checkmark}>✓</Text>
                    )}
                  </View>
                  <Text
                    style={[
                      styles.itemLabel,
                      item.checked && styles.itemLabelChecked,
                    ]}
                  >
                    {item.label}
                  </Text>
                  {item.isCustom && (
                    <Pressable
                      onPress={() => onRemoveCustom(item.id)}
                      hitSlop={10}
                      style={styles.removeBtn}
                    >
                      <Text style={styles.removeBtnText}>×</Text>
                    </Pressable>
                  )}
                </Pressable>
              ))}
            </View>
          );
        })}

        {/* Add custom item */}
        <View style={styles.addBlock}>
          <Text style={styles.addBlockLabel}>+ ADD ITEM</Text>
          <TextInput
            value={newItemLabel}
            onChangeText={setNewItemLabel}
            placeholder="Custom item label"
            placeholderTextColor={Colors.textMuted}
            style={styles.input}
            maxLength={80}
            onSubmitEditing={onAddItem}
            returnKeyType="done"
          />
          <Pressable
            onPress={() => setPickerOpen((v) => !v)}
            style={styles.categoryBtn}
          >
            <Text style={styles.categoryBtnLabel}>
              Category: {GEAR_CATEGORY_META[newItemCategory].label}
            </Text>
            <Text style={styles.categoryBtnChev}>{pickerOpen ? '▲' : '▼'}</Text>
          </Pressable>
          {pickerOpen && (
            <View style={styles.categoryPicker}>
              {ADDABLE_CATEGORIES.map((cat) => {
                const m = GEAR_CATEGORY_META[cat];
                const active = cat === newItemCategory;
                return (
                  <Pressable
                    key={cat}
                    onPress={() => {
                      setNewItemCategory(cat);
                      setPickerOpen(false);
                    }}
                    style={[
                      styles.categoryChip,
                      active && styles.categoryChipActive,
                    ]}
                  >
                    <Text
                      style={[
                        styles.categoryChipText,
                        active && styles.categoryChipTextActive,
                      ]}
                    >
                      {m.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          )}
          <Pressable
            onPress={onAddItem}
            disabled={!newItemLabel.trim()}
            style={[
              styles.addItemBtn,
              !newItemLabel.trim() && styles.addItemBtnDisabled,
            ]}
          >
            <Text style={styles.addItemBtnText}>ADD</Text>
          </Pressable>
        </View>

        {/* Footer actions */}
        <View style={styles.footer}>
          <Pressable onPress={onCancel} style={styles.footerBtn}>
            <Text style={styles.footerBtnText}>CANCEL</Text>
          </Pressable>
          <Pressable
            onPress={onSave}
            disabled={!canSave}
            style={[
              styles.footerBtn,
              styles.footerBtnPrimary,
              !canSave && styles.footerBtnDisabled,
            ]}
          >
            <Text style={[styles.footerBtnText, styles.footerBtnTextPrimary]}>
              {saving ? 'SAVING…' : 'SAVE'}
            </Text>
          </Pressable>
        </View>

        {isEditing && draftId ? (
          <FavoriteStarButton kind="checklist" id={draftId} />
        ) : null}

        {isEditing && (
          <Pressable onPress={onDelete} style={styles.deleteBtn}>
            <Text style={styles.deleteBtnText}>DELETE CHECKLIST</Text>
          </Pressable>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  body: {
    padding: 16,
    paddingBottom: 64,
  },
  emptyWrap: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 28,
  },
  emptyText: {
    color: Colors.textMuted,
    fontSize: 13,
  },
  progressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
  },
  progressTrack: {
    flex: 1,
    height: 6,
    backgroundColor: Colors.surface,
    borderRadius: 3,
    overflow: 'hidden',
    marginRight: 10,
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
  },
  progressText: {
    color: Colors.textPrimary,
    fontSize: 12,
    fontWeight: '800',
  },
  field: {
    marginBottom: 14,
  },
  label: {
    color: Colors.textSecondary,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.8,
    marginBottom: 6,
  },
  input: {
    color: Colors.textPrimary,
    fontSize: 14,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.mud,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  errorText: {
    color: Colors.danger,
    fontSize: 11,
    marginTop: 4,
  },
  groupBlock: {
    marginTop: 18,
    backgroundColor: Colors.surface,
    borderRadius: 10,
    paddingVertical: 6,
  },
  groupHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: Colors.mud,
  },
  groupCode: {
    width: 26,
    height: 22,
    borderRadius: 4,
    backgroundColor: Colors.background,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  groupCodeText: {
    color: Colors.textPrimary,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  groupTitle: {
    color: Colors.textPrimary,
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.7,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderWidth: 2,
    borderColor: Colors.textMuted,
    borderRadius: 5,
    marginRight: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxChecked: {
    borderColor: Colors.moss,
    backgroundColor: Colors.moss,
  },
  checkmark: {
    color: Colors.background,
    fontSize: 14,
    fontWeight: '900',
    lineHeight: 14,
  },
  itemLabel: {
    flex: 1,
    color: Colors.textPrimary,
    fontSize: 14,
  },
  itemLabelChecked: {
    color: Colors.textMuted,
    textDecorationLine: 'line-through',
  },
  removeBtn: {
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  removeBtnText: {
    color: Colors.danger,
    fontSize: 18,
    fontWeight: '700',
    lineHeight: 20,
  },
  addBlock: {
    marginTop: 22,
    padding: 14,
    backgroundColor: Colors.surface,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.mud,
  },
  addBlockLabel: {
    color: Colors.textSecondary,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.8,
    marginBottom: 8,
  },
  categoryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.background,
    borderWidth: 1,
    borderColor: Colors.mud,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginTop: 8,
  },
  categoryBtnLabel: {
    color: Colors.textPrimary,
    fontSize: 13,
  },
  categoryBtnChev: {
    color: Colors.textSecondary,
    fontSize: 11,
  },
  categoryPicker: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 8,
  },
  categoryChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: Colors.background,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: Colors.mud,
  },
  categoryChipActive: {
    backgroundColor: Colors.mdGold,
    borderColor: Colors.mdGold,
  },
  categoryChipText: {
    color: Colors.textPrimary,
    fontSize: 11,
    fontWeight: '700',
  },
  categoryChipTextActive: {
    color: Colors.mdBlack,
  },
  addItemBtn: {
    marginTop: 10,
    paddingVertical: 10,
    backgroundColor: Colors.moss,
    borderRadius: 8,
    alignItems: 'center',
  },
  addItemBtnDisabled: {
    opacity: 0.45,
  },
  addItemBtnText: {
    color: Colors.background,
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.6,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 24,
    gap: 10,
  },
  footerBtn: {
    flex: 1,
    paddingVertical: 14,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.mud,
    borderRadius: 8,
    alignItems: 'center',
  },
  footerBtnPrimary: {
    backgroundColor: Colors.mdGold,
    borderColor: Colors.mdGold,
  },
  footerBtnDisabled: {
    opacity: 0.45,
  },
  footerBtnText: {
    color: Colors.textPrimary,
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 0.6,
  },
  footerBtnTextPrimary: {
    color: Colors.mdBlack,
  },
  deleteBtn: {
    marginTop: 18,
    paddingVertical: 12,
    alignItems: 'center',
  },
  deleteBtnText: {
    color: Colors.danger,
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.7,
  },
});
