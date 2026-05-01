/**
 * @file FilterPicker.tsx
 * @description Reusable single-button + bottom-sheet filter picker.
 *
 * Replaces the horizontal-chip-row pattern that was used on every map
 * screen (Hunt MapScreen, FishMapScreen, FishSpotsScreen, HikeMapScreen,
 * StarterGearScreen, etc.) and broke on iPhone 17 Pro Max where 5+
 * chips ran off the right edge of the screen and clipped mid-word.
 *
 * Why a single picker instead of horizontal scroll:
 *   - Horizontal scroll was visually ambiguous — users assumed the
 *     visible chips were ALL the chips, not realizing more existed
 *     off-screen
 *   - On larger phones the clipping looked broken even though the
 *     content was technically scrollable
 *   - A single "Filters (N)" button surfaces the active count clearly
 *     and gives every option equal visual weight when opened
 *
 * Usage:
 * ```tsx
 * <FilterPicker
 *   title="Land Type"
 *   options={[
 *     { key: 'wma', label: 'WMA', active: filters.wma },
 *     { key: 'cwma', label: 'Co-op WMA', active: filters.cwma },
 *     ...
 *   ]}
 *   onChange={(key, next) => setFilters({ ...filters, [key]: next })}
 *   onClearAll={() => setFilters(emptyFilters)}
 * />
 * ```
 *
 * The component owns its open/close state. If the screen needs to drive
 * the modal externally, expose `open` + `onOpenChange` props (not
 * needed today).
 *
 * Accessibility:
 *   - Trigger button gets `accessibilityRole="button"` with a label
 *     that includes the active count
 *   - Each row in the modal is a `Switch` control with its own label
 *   - Close button on the modal header with an explicit dismiss label
 */

import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Switch,
  ScrollView,
  Pressable,
} from 'react-native';
import Colors from '../../theme/colors';

export interface FilterOption {
  /** Stable key — used as the identifier in onChange callbacks. */
  key: string;
  /** Display label (e.g. "WMA", "Boat Ramp", "Trout Stream"). */
  label: string;
  /** Optional secondary text shown beneath the label (e.g. count badges). */
  hint?: string;
  /** Whether this filter is currently on. */
  active: boolean;
  /**
   * Optional accent color applied to the row's switch track when active.
   * Falls back to `Colors.moss` when omitted.
   */
  accent?: string;
}

interface FilterPickerProps {
  /** Title shown in the modal header. */
  title: string;
  /** Filter options rendered as switch rows. */
  options: FilterOption[];
  /** Called when any switch is toggled. */
  onChange: (key: string, next: boolean) => void;
  /** Called when the user taps "Clear all". Show only when an option is active. */
  onClearAll?: () => void;
  /**
   * Optional override for the trigger button label. Defaults to
   * "Filters" with the active count appended in parentheses, e.g.
   * "Filters (3)". Passing `triggerLabel="Land Type"` produces
   * "Land Type (3)".
   */
  triggerLabel?: string;
  /**
   * Optional positioning hint. When `compact` is true the trigger
   * button is rendered narrower so it can sit alongside other controls
   * in a row without overflowing. Default false.
   */
  compact?: boolean;
}

export default function FilterPicker({
  title,
  options,
  onChange,
  onClearAll,
  triggerLabel,
  compact,
}: FilterPickerProps) {
  const [open, setOpen] = useState(false);

  const activeCount = useMemo(
    () => options.reduce((n, o) => n + (o.active ? 1 : 0), 0),
    [options],
  );

  const triggerText = useMemo(() => {
    const base = triggerLabel ?? 'Filters';
    return activeCount > 0 ? `${base} (${activeCount})` : base;
  }, [triggerLabel, activeCount]);

  return (
    <>
      <TouchableOpacity
        style={[
          styles.trigger,
          activeCount > 0 && styles.triggerActive,
          compact && styles.triggerCompact,
        ]}
        onPress={() => setOpen(true)}
        activeOpacity={0.7}
        accessibilityRole="button"
        accessibilityLabel={`${triggerText} — tap to open filter picker`}
      >
        <Text style={styles.triggerIcon}>⌕</Text>
        <Text style={styles.triggerText} numberOfLines={1}>
          {triggerText}
        </Text>
      </TouchableOpacity>

      <Modal
        visible={open}
        transparent
        animationType="slide"
        onRequestClose={() => setOpen(false)}
      >
        {/* Tappable backdrop dismisses without applying anything;
            since onChange already commits each toggle live, there's no
            "apply vs cancel" distinction needed. */}
        <Pressable style={styles.backdrop} onPress={() => setOpen(false)}>
          <Pressable
            style={styles.sheet}
            onPress={(e) => e.stopPropagation()}
          >
            <View style={styles.header}>
              <Text style={styles.headerTitle}>{title}</Text>
              <TouchableOpacity
                style={styles.closeBtn}
                onPress={() => setOpen(false)}
                accessibilityRole="button"
                accessibilityLabel="Close filter picker"
              >
                <Text style={styles.closeBtnText}>×</Text>
              </TouchableOpacity>
            </View>

            <ScrollView
              style={styles.optionsScroll}
              contentContainerStyle={styles.optionsContent}
              showsVerticalScrollIndicator={false}
            >
              {options.map((opt) => (
                <View key={opt.key} style={styles.row}>
                  <View style={styles.rowText}>
                    <Text style={styles.rowLabel}>{opt.label}</Text>
                    {opt.hint ? (
                      <Text style={styles.rowHint}>{opt.hint}</Text>
                    ) : null}
                  </View>
                  <Switch
                    value={opt.active}
                    onValueChange={(next) => onChange(opt.key, next)}
                    trackColor={{
                      false: Colors.mud,
                      true: opt.accent ?? Colors.moss,
                    }}
                    thumbColor={Colors.textOnAccent}
                    accessibilityLabel={`Toggle ${opt.label} filter`}
                  />
                </View>
              ))}
            </ScrollView>

            <View style={styles.footer}>
              {activeCount > 0 && onClearAll ? (
                <TouchableOpacity
                  style={styles.footerSecondary}
                  onPress={() => {
                    onClearAll();
                  }}
                  accessibilityRole="button"
                  accessibilityLabel="Clear all filters"
                >
                  <Text style={styles.footerSecondaryText}>Clear all</Text>
                </TouchableOpacity>
              ) : (
                <View style={{ flex: 1 }} />
              )}
              <TouchableOpacity
                style={styles.footerPrimary}
                onPress={() => setOpen(false)}
                accessibilityRole="button"
                accessibilityLabel="Done with filters"
              >
                <Text style={styles.footerPrimaryText}>Done</Text>
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  // ── Trigger ────────────────────────────────────────────────────
  trigger: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.overlay,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Colors.clay,
    gap: 6,
    alignSelf: 'flex-start',
    minHeight: 36,
  },
  triggerActive: {
    borderColor: Colors.moss,
    backgroundColor: Colors.surfaceElevated,
  },
  triggerCompact: {
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  triggerIcon: {
    fontSize: 14,
    color: Colors.textPrimary,
  },
  triggerText: {
    color: Colors.textPrimary,
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.3,
  },

  // ── Modal ──────────────────────────────────────────────────────
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    paddingBottom: 28,
    maxHeight: '80%',
    borderTopWidth: 1,
    borderColor: Colors.mud,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingTop: 14,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: Colors.mud,
  },
  headerTitle: {
    color: Colors.textPrimary,
    fontSize: 16,
    fontWeight: '800',
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.mud,
  },
  closeBtnText: {
    color: Colors.textPrimary,
    fontSize: 20,
    lineHeight: 22,
    fontWeight: '600',
  },

  // ── Option rows ────────────────────────────────────────────────
  optionsScroll: {
    flexGrow: 0,
  },
  optionsContent: {
    paddingHorizontal: 18,
    paddingVertical: 6,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.06)',
  },
  rowText: {
    flex: 1,
    marginRight: 12,
  },
  rowLabel: {
    color: Colors.textPrimary,
    fontSize: 15,
    fontWeight: '600',
  },
  rowHint: {
    color: Colors.textSecondary,
    fontSize: 12,
    marginTop: 2,
  },

  // ── Footer ─────────────────────────────────────────────────────
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingTop: 12,
    gap: 12,
  },
  footerSecondary: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.mud,
  },
  footerSecondaryText: {
    color: Colors.textSecondary,
    fontSize: 14,
    fontWeight: '600',
  },
  footerPrimary: {
    flex: 1,
    backgroundColor: Colors.moss,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  footerPrimaryText: {
    color: Colors.textOnAccent,
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: 0.4,
  },
});
