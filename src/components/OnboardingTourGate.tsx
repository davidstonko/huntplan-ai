/**
 * OnboardingTourGate — first-time onboarding tour modal for a single mode
 * (V2.3 Phase A.26).
 *
 * Drop one in a mode's MapScreen tree. On mount it checks
 * `hasSeenTour(mode)`; if false, the tour modal opens. The user can
 * advance through the slides, skip, or dismiss — any of those marks the
 * tour seen so it doesn't fire again.
 *
 * The component also accepts an `open` / `onClose` controlled-mode pair
 * so the Resources screen entry point ("Take the tour again") can re-show
 * the same modal without having to clone the slide UI.
 *
 * Dismissal:
 *   - "DONE" on last slide → markTourSeen + close
 *   - "SKIP" any slide      → markTourSeen + close
 *   - System back / tap outside → markTourSeen + close
 *   - Controlled-open from Resources → close only (does NOT touch the
 *     storage flag — already seen, this is a replay)
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Colors from '../theme/colors';
import {
  hasSeenTour,
  markTourSeen,
} from '../services/onboardingStorage';
import {
  TOUR_CONTENT,
  tourTitleFor,
} from '../services/onboardingTours';
import type { WaypointMode } from '../types/userWaypoint';

interface Props {
  mode: WaypointMode;
  /**
   * Controlled-open. When provided, the gate stops auto-firing and shows
   * the modal whenever this is true. The Resources "Take the tour again"
   * row uses this.
   */
  open?: boolean;
  onClose?: () => void;
  /**
   * Uncontrolled mode only. The auto-fired tour waits until this is true
   * (e.g. the map has finished loading and no location prompt is pending)
   * plus `delayMs`, so it never lands on top of a permission alert or a
   * half-rendered map. Defaults to true.
   */
  ready?: boolean;
  /** Settle delay after `ready` flips true before the tour appears. */
  delayMs?: number;
  /**
   * Uncontrolled mode only. Called once the gate has finished its job:
   * either the tour was already seen (nothing to show) or the user closed
   * it. Screens use this to defer banners until the tour is out of the way.
   */
  onSettled?: () => void;
}

export default function OnboardingTourGate({
  mode,
  open,
  onClose,
  ready = true,
  delayMs = 600,
  onSettled,
}: Props) {
  const isControlled = open !== undefined;
  const [autoVisible, setAutoVisible] = useState(false);
  const [slide, setSlide] = useState(0);
  const [seenState, setSeenState] = useState<boolean | null>(null);
  const settledRef = useRef(false);
  const onSettledRef = useRef(onSettled);
  onSettledRef.current = onSettled;

  const slides = TOUR_CONTENT[mode];

  const settle = useCallback(() => {
    if (settledRef.current) return;
    settledRef.current = true;
    onSettledRef.current?.();
  }, []);

  // Check storage once when uncontrolled.
  useEffect(() => {
    if (isControlled) return;
    let cancelled = false;
    void hasSeenTour(mode)
      .then((seen) => {
        if (!cancelled) setSeenState(seen);
      })
      .catch(() => {
        // Storage unavailable: treat as seen so the app is never blocked.
        if (!cancelled) setSeenState(true);
      });
    return () => {
      cancelled = true;
    };
  }, [isControlled, mode]);

  // Auto-fire once the host reports ready, after a short settle delay.
  // Already-seen tours settle immediately so dependent UI can proceed.
  useEffect(() => {
    if (isControlled || seenState === null) return;
    if (seenState) {
      settle();
      return;
    }
    if (!ready) return;
    const timer = setTimeout(() => {
      setSlide(0);
      setAutoVisible(true);
    }, Math.max(0, delayMs));
    return () => clearTimeout(timer);
  }, [isControlled, seenState, ready, delayMs, settle]);

  // Reset to first slide every time controlled-open flips to true.
  useEffect(() => {
    if (open) setSlide(0);
  }, [open]);

  const visible = isControlled ? !!open : autoVisible;

  const close = useCallback(
    async (markSeen: boolean) => {
      if (markSeen) {
        await markTourSeen(mode);
      }
      if (isControlled) {
        onClose?.();
      } else {
        setAutoVisible(false);
        // Prevent a re-fire if `ready` flips again later in the session.
        setSeenState(true);
        settle();
      }
    },
    [isControlled, mode, onClose, settle],
  );

  const onSkip = useCallback(() => void close(true), [close]);
  const onDismiss = useCallback(() => void close(true), [close]);
  const onNext = useCallback(() => {
    if (slide < slides.length - 1) {
      setSlide((s) => s + 1);
    } else {
      void close(true);
    }
  }, [slide, slides.length, close]);
  const onBack = useCallback(() => setSlide((s) => Math.max(0, s - 1)), []);

  const current = slides[slide];
  const isLast = slide === slides.length - 1;
  const isFirst = slide === 0;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onDismiss}
    >
      {/* 2026-09-27: these controls were bare Pressables with no
          accessibilityRole, so VoiceOver saw generic elements and a
          screen-reader user could not dismiss the tour at all — the
          modal trapped them on first launch. accessibilityViewIsModal
          keeps focus inside the sheet while it is open. */}
      <Pressable
        style={styles.backdrop}
        onPress={onDismiss}
        accessibilityRole="button"
        accessibilityLabel="Close the tour"
      >
        <Pressable
          style={styles.sheet}
          onPress={() => {}}
          accessible={false}
          accessibilityViewIsModal
        >
          <View style={styles.headerRow}>
            <Text style={styles.headerTitle}>{tourTitleFor(mode)}</Text>
            <Pressable
              hitSlop={12}
              onPress={onSkip}
              accessibilityRole="button"
              accessibilityLabel="Skip the tour"
            >
              <Text style={styles.skipText}>SKIP</Text>
            </Pressable>
          </View>

          <View style={styles.body}>
            <View
              style={[styles.codeChip, { backgroundColor: current.chipColor }]}
            >
              <Text
                style={[styles.codeChipText, { color: current.chipTextColor }]}
              >
                {current.code}
              </Text>
            </View>
            <Text style={styles.slideTitle}>{current.title}</Text>
            <Text style={styles.slideBody}>{current.body}</Text>
          </View>

          <View style={styles.dotsRow}>
            {slides.map((_, i) => (
              <View
                key={i}
                style={[
                  styles.dot,
                  i === slide ? styles.dotActive : styles.dotInactive,
                ]}
              />
            ))}
          </View>

          <View style={styles.actions}>
            <Pressable
              style={[styles.backBtn, isFirst && styles.btnDisabled]}
              onPress={isFirst ? undefined : onBack}
              disabled={isFirst}
              accessibilityRole="button"
              accessibilityLabel="Previous step"
              accessibilityState={{ disabled: isFirst }}
            >
              <Text
                style={[
                  styles.backBtnText,
                  isFirst && styles.btnTextDisabled,
                ]}
              >
                BACK
              </Text>
            </Pressable>
            <Pressable
              style={styles.nextBtn}
              onPress={onNext}
              accessibilityRole="button"
              accessibilityLabel={isLast ? 'Finish the tour' : 'Next step'}
            >
              <Text style={styles.nextBtnText}>
                {isLast ? "LET'S GO" : 'NEXT'}
              </Text>
            </Pressable>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: Colors.overlay,
    justifyContent: 'center',
    paddingHorizontal: 18,
  },
  sheet: {
    backgroundColor: Colors.surfaceElevated,
    borderRadius: 14,
    paddingVertical: 18,
    paddingHorizontal: 18,
    maxWidth: 480,
    alignSelf: 'center',
    width: '100%',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  headerTitle: {
    color: Colors.textPrimary,
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  skipText: {
    color: Colors.textMuted,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.8,
  },
  body: {
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 4,
  },
  codeChip: {
    width: 56,
    height: 56,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  codeChipText: {
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: 0.6,
  },
  slideTitle: {
    color: Colors.textPrimary,
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 10,
  },
  slideBody: {
    color: Colors.textSecondary,
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
    paddingHorizontal: 4,
  },
  dotsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 18,
    marginBottom: 16,
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    marginHorizontal: 4,
  },
  dotActive: {
    backgroundColor: Colors.mdGold,
  },
  dotInactive: {
    backgroundColor: Colors.mud,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
  },
  backBtn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 6,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.mud,
  },
  backBtnText: {
    color: Colors.textSecondary,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.6,
  },
  btnDisabled: {
    opacity: 0.4,
  },
  btnTextDisabled: {
    color: Colors.textMuted,
  },
  nextBtn: {
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 6,
    backgroundColor: Colors.mdGold,
  },
  nextBtnText: {
    color: Colors.mdBlack,
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.6,
  },
});
