/**
 * WindWidgetPlayground — interactive sandbox for redesigning the Hunt
 * wind / scent-cone widget layout.
 *
 * 2026-04-26 (fork merge): added per David's request for "a dummy view I
 * can drag and redesign the formatting manually". Renders a faithful
 * mockup of `HuntWindPanel` inside a draggable container, with live
 * sliders for the most-edited style values (padding, borderRadius,
 * minWidth, font sizes, etc.) plus a copy-to-clipboard for the final
 * StyleSheet object so the chosen values can be pasted back into the
 * real component.
 *
 * Wire-up: this screen is registered as a stack route in AppNavigator
 * under "WindWidgetPlayground". From any dev menu (or the SettingsScreen
 * "Dev tools" section), navigate via:
 *   navigation.navigate('WindWidgetPlayground')
 *
 * Nothing here imports the real HuntWindPanel — duplicating the layout
 * keeps the playground free of NOAA fetches and lets the user iterate on
 * style tokens in isolation.
 *
 * @module Screens
 */

import React, { useCallback, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  PanResponder,
  Animated,
  Clipboard,
  Alert,
  SafeAreaView,
} from 'react-native';

// ─── Style-knob types ──────────────────────────────────────────────

interface WidgetTokens {
  bgAlpha: number;       // 0–1
  borderRadius: number;
  padding: number;
  gap: number;
  minWidth: number;
  chipFontSize: number;
  toggleFontSize: number;
  hoursFontSize: number;
  stepBtnSize: number;
  toggleVerticalPad: number;
  toggleHorizontalPad: number;
  toggleBorderRadius: number;
}

const DEFAULTS: WidgetTokens = {
  bgAlpha: 0.85,
  borderRadius: 8,
  padding: 8,
  gap: 6,
  minWidth: 148,
  chipFontSize: 12,
  toggleFontSize: 11,
  hoursFontSize: 13,
  stepBtnSize: 28,
  toggleVerticalPad: 6,
  toggleHorizontalPad: 10,
  toggleBorderRadius: 6,
};

const RANGES: Record<keyof WidgetTokens, [number, number, number]> = {
  // [min, max, step]
  bgAlpha: [0.2, 1.0, 0.05],
  borderRadius: [0, 24, 1],
  padding: [0, 24, 1],
  gap: [0, 16, 1],
  minWidth: [100, 280, 4],
  chipFontSize: [9, 20, 1],
  toggleFontSize: [9, 20, 1],
  hoursFontSize: [9, 20, 1],
  stepBtnSize: [20, 48, 2],
  toggleVerticalPad: [2, 16, 1],
  toggleHorizontalPad: [4, 24, 1],
  toggleBorderRadius: [0, 24, 1],
};

const KNOB_LABELS: Record<keyof WidgetTokens, string> = {
  bgAlpha: 'Bg opacity',
  borderRadius: 'Border radius',
  padding: 'Padding',
  gap: 'Vertical gap',
  minWidth: 'Min width',
  chipFontSize: 'Wind text',
  toggleFontSize: 'Toggle text',
  hoursFontSize: 'Hours text',
  stepBtnSize: '+/− size',
  toggleVerticalPad: 'Toggle V pad',
  toggleHorizontalPad: 'Toggle H pad',
  toggleBorderRadius: 'Toggle radius',
};

// ─── Component ─────────────────────────────────────────────────────

export default function WindWidgetPlayground() {
  const [tokens, setTokens] = useState<WidgetTokens>(DEFAULTS);
  const [showCones, setShowCones] = useState(false);

  // Drag state — the widget moves around freely as the user drags it.
  const pan = useRef(new Animated.ValueXY({ x: 24, y: 24 })).current;
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: () => {
        pan.extractOffset();
      },
      onPanResponderMove: Animated.event(
        [null, { dx: pan.x, dy: pan.y }],
        { useNativeDriver: false },
      ),
      onPanResponderRelease: () => {
        pan.flattenOffset();
      },
    }),
  ).current;

  const setKnob = useCallback(
    (key: keyof WidgetTokens, value: number) => {
      const [min, max] = RANGES[key];
      setTokens((t) => ({ ...t, [key]: Math.max(min, Math.min(max, value)) }));
    },
    [],
  );

  const stepKnob = useCallback(
    (key: keyof WidgetTokens, dir: 1 | -1) => {
      const [, , step] = RANGES[key];
      setTokens((t) => {
        const next = t[key] + dir * step;
        const [min, max] = RANGES[key];
        return { ...t, [key]: Math.max(min, Math.min(max, Number(next.toFixed(2)))) };
      });
    },
    [],
  );

  const widgetStyles = useMemo(() => makeWidgetStyles(tokens), [tokens]);

  const stylesheetSource = useMemo(() => buildStyleSheetSource(tokens), [tokens]);

  const onCopy = useCallback(() => {
    Clipboard.setString(stylesheetSource);
    Alert.alert('Copied', 'Widget StyleSheet snippet is on your clipboard.');
  }, [stylesheetSource]);

  const onResetTokens = () => setTokens(DEFAULTS);
  const onResetPosition = () => {
    pan.flattenOffset();
    pan.setValue({ x: 24, y: 24 });
  };

  return (
    <SafeAreaView style={layout.screen}>
      <Text style={layout.title}>Wind Widget Playground</Text>
      <Text style={layout.subtitle}>
        Drag the widget anywhere · tweak the knobs · tap Copy to grab the
        resulting StyleSheet snippet.
      </Text>

      {/* ── Stage area — fills available space; the widget floats on top ── */}
      <View style={layout.stage}>
        <Text style={layout.stageHint}>↳ drag the dark pill anywhere on this stage</Text>

        <Animated.View
          {...panResponder.panHandlers}
          style={[
            { transform: [{ translateX: pan.x }, { translateY: pan.y }] },
          ]}
        >
          <View style={widgetStyles.container}>
            <View style={widgetStyles.chipRow}>
              <View style={widgetStyles.chip}>
                <Text style={widgetStyles.chipText}>Wind: NW 8 mph</Text>
              </View>
            </View>

            <View style={widgetStyles.sliderRow}>
              <View style={widgetStyles.stepBtn}>
                <Text style={widgetStyles.stepText}>−</Text>
              </View>
              <Text style={widgetStyles.hoursLabel}>Now</Text>
              <View style={widgetStyles.stepBtn}>
                <Text style={widgetStyles.stepText}>+</Text>
              </View>
            </View>

            <TouchableOpacity
              onPress={() => setShowCones((v) => !v)}
              style={[
                widgetStyles.toggle,
                showCones ? widgetStyles.toggleOn : widgetStyles.toggleOff,
              ]}
            >
              <Text style={widgetStyles.toggleText}>
                {showCones ? 'Scent cones ON' : 'Scent cones OFF'}
              </Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </View>

      {/* ── Knob panel ── */}
      <ScrollView
        style={layout.knobScroll}
        contentContainerStyle={layout.knobContent}
        showsVerticalScrollIndicator={false}
      >
        {(Object.keys(KNOB_LABELS) as Array<keyof WidgetTokens>).map((k) => (
          <KnobRow
            key={k}
            label={KNOB_LABELS[k]}
            value={tokens[k]}
            onMinus={() => stepKnob(k, -1)}
            onPlus={() => stepKnob(k, +1)}
          />
        ))}

        <View style={layout.actionRow}>
          <TouchableOpacity onPress={onResetPosition} style={layout.actionBtn}>
            <Text style={layout.actionText}>Reset position</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={onResetTokens} style={layout.actionBtn}>
            <Text style={layout.actionText}>Reset styles</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={onCopy}
            style={[layout.actionBtn, layout.actionPrimary]}
          >
            <Text style={[layout.actionText, layout.actionPrimaryText]}>
              Copy StyleSheet
            </Text>
          </TouchableOpacity>
        </View>

        <View style={layout.codePreview}>
          <Text style={layout.codeText}>{stylesheetSource}</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── KnobRow ───────────────────────────────────────────────────────

function KnobRow({
  label,
  value,
  onMinus,
  onPlus,
}: {
  label: string;
  value: number;
  onMinus: () => void;
  onPlus: () => void;
}) {
  return (
    <View style={layout.knobRow}>
      <Text style={layout.knobLabel}>{label}</Text>
      <View style={layout.knobControls}>
        <TouchableOpacity onPress={onMinus} style={layout.knobBtn}>
          <Text style={layout.knobBtnText}>−</Text>
        </TouchableOpacity>
        <Text style={layout.knobValue}>{value}</Text>
        <TouchableOpacity onPress={onPlus} style={layout.knobBtn}>
          <Text style={layout.knobBtnText}>+</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ─── Style helpers ─────────────────────────────────────────────────

function makeWidgetStyles(t: WidgetTokens) {
  const bg = `rgba(17,24,39,${t.bgAlpha.toFixed(2)})`;
  return StyleSheet.create({
    container: {
      backgroundColor: bg,
      borderRadius: t.borderRadius,
      padding: t.padding,
      gap: t.gap,
      minWidth: t.minWidth,
    },
    chipRow: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    chip: {
      flexDirection: 'row',
      alignItems: 'center',
      flex: 1,
    },
    chipText: {
      color: '#e5e7eb',
      fontSize: t.chipFontSize,
      fontWeight: '600',
    },
    sliderRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    stepBtn: {
      width: t.stepBtnSize,
      height: t.stepBtnSize,
      borderRadius: t.stepBtnSize / 2,
      backgroundColor: '#1f2937',
      alignItems: 'center',
      justifyContent: 'center',
    },
    stepText: {
      color: '#f59e0b',
      fontSize: Math.round(t.stepBtnSize * 0.55),
      fontWeight: '800',
    },
    hoursLabel: {
      color: '#e5e7eb',
      fontSize: t.hoursFontSize,
      fontWeight: '700',
    },
    toggle: {
      paddingVertical: t.toggleVerticalPad,
      paddingHorizontal: t.toggleHorizontalPad,
      borderRadius: t.toggleBorderRadius,
      alignItems: 'center',
    },
    toggleOn: { backgroundColor: '#f59e0b' },
    toggleOff: { backgroundColor: '#374151' },
    toggleText: {
      color: '#111827',
      fontSize: t.toggleFontSize,
      fontWeight: '800',
    },
  });
}

function buildStyleSheetSource(t: WidgetTokens): string {
  const bg = `rgba(17,24,39,${t.bgAlpha.toFixed(2)})`;
  return `// Paste into HuntWindPanel.tsx (replacing the existing styles).
const styles = StyleSheet.create({
  container: {
    backgroundColor: '${bg}',
    borderRadius: ${t.borderRadius},
    padding: ${t.padding},
    gap: ${t.gap},
    minWidth: ${t.minWidth},
  },
  chipText: {
    color: '#e5e7eb',
    fontSize: ${t.chipFontSize},
    fontWeight: '600',
  },
  stepBtn: {
    width: ${t.stepBtnSize},
    height: ${t.stepBtnSize},
    borderRadius: ${t.stepBtnSize / 2},
    backgroundColor: '#1f2937',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepText: {
    color: '#f59e0b',
    fontSize: ${Math.round(t.stepBtnSize * 0.55)},
    fontWeight: '800',
  },
  hoursLabel: {
    color: '#e5e7eb',
    fontSize: ${t.hoursFontSize},
    fontWeight: '700',
  },
  toggle: {
    paddingVertical: ${t.toggleVerticalPad},
    paddingHorizontal: ${t.toggleHorizontalPad},
    borderRadius: ${t.toggleBorderRadius},
    alignItems: 'center',
  },
  toggleText: {
    color: '#111827',
    fontSize: ${t.toggleFontSize},
    fontWeight: '800',
  },
});`;
}

// ─── Outer-screen styles ───────────────────────────────────────────

const layout = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#0b0f17',
  },
  title: {
    color: '#fef3c7',
    fontSize: 18,
    fontWeight: '800',
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  subtitle: {
    color: '#9ca3af',
    fontSize: 12,
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  stage: {
    height: 320,
    margin: 12,
    borderRadius: 12,
    backgroundColor: '#111827',
    borderWidth: 1,
    borderColor: '#1f2937',
    borderStyle: 'dashed',
    overflow: 'hidden',
  },
  stageHint: {
    color: '#4b5563',
    fontSize: 10,
    padding: 8,
    fontStyle: 'italic',
  },
  knobScroll: {
    flex: 1,
    backgroundColor: '#0b0f17',
  },
  knobContent: {
    padding: 12,
    paddingBottom: 32,
  },
  knobRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 4,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#1f2937',
  },
  knobLabel: {
    color: '#d1d5db',
    fontSize: 13,
    fontWeight: '600',
  },
  knobControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  knobBtn: {
    width: 30,
    height: 30,
    borderRadius: 6,
    backgroundColor: '#1f2937',
    alignItems: 'center',
    justifyContent: 'center',
  },
  knobBtnText: {
    color: '#f59e0b',
    fontSize: 16,
    fontWeight: '800',
  },
  knobValue: {
    color: '#fef3c7',
    fontSize: 13,
    fontWeight: '700',
    minWidth: 44,
    textAlign: 'center',
  },
  actionRow: {
    flexDirection: 'row',
    gap: 8,
    paddingTop: 12,
  },
  actionBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 6,
    backgroundColor: '#1f2937',
    alignItems: 'center',
  },
  actionPrimary: {
    backgroundColor: '#f59e0b',
  },
  actionText: {
    color: '#e5e7eb',
    fontSize: 12,
    fontWeight: '700',
  },
  actionPrimaryText: {
    color: '#111827',
  },
  codePreview: {
    marginTop: 12,
    padding: 10,
    backgroundColor: '#0a0d12',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#1f2937',
  },
  codeText: {
    color: '#cbd5e1',
    fontFamily: 'Menlo',
    fontSize: 10,
    lineHeight: 14,
  },
});
