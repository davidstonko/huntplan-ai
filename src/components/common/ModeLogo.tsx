/**
 * @file ModeLogo.tsx
 * @description Custom glyph components for the four MDHuntFishOutdoors activity
 * modes (Hunt, Fish, Camp, Hike). Each logo is View/CSS-based — no SVG deps,
 * no font glyphs, no emoji — so the same component renders reliably across
 * the mode picker cards, the header chip, and the dropdown rows.
 *
 * Design language:
 *   - Hunt: 8-point whitetail rack (curved main beam + brow/G2/G3 tines per
 *           side — per user directive 2026-04-20 "make it look like deer
 *           antlers like an 8 point whitetail")
 *   - Fish: stylized fish body with a pointed tail
 *   - Camp: triangular tent with a dark door slit
 *   - Hike: twin mountain peaks
 *
 * All four share the same "chip" wrapper (rounded square tinted with the
 * mode accent color) so swapping from letter chips → icon chips is a
 * visual drop-in that keeps color coding consistent.
 */

import React from 'react';
import { View, StyleSheet } from 'react-native';
import { ActivityMode } from '../../context/ActivityModeContext';

export type ModeLogoSize = 'sm' | 'md' | 'lg';

interface ModeLogoProps {
  mode: ActivityMode;
  size?: ModeLogoSize;
  accent: string;
}

/**
 * Per-size dimensions for the chip container + the glyph drawn inside.
 * sm → header pill (22×22), md → dropdown row (32×32), lg → home card (56×56).
 */
const SIZES: Record<
  ModeLogoSize,
  { chip: number; radius: number; glyph: number }
> = {
  sm: { chip: 22, radius: 5, glyph: 14 },
  md: { chip: 32, radius: 7, glyph: 20 },
  lg: { chip: 56, radius: 12, glyph: 36 },
};

export default function ModeLogo({ mode, size = 'md', accent }: ModeLogoProps) {
  const dims = SIZES[size];
  return (
    <View
      style={[
        styles.chip,
        {
          width: dims.chip,
          height: dims.chip,
          borderRadius: dims.radius,
          backgroundColor: accent,
        },
      ]}
      accessibilityRole="image"
      accessibilityLabel={`${mode} mode icon`}
    >
      {mode === 'hunt' && <HuntGlyph size={dims.glyph} />}
      {mode === 'fish' && <FishGlyph size={dims.glyph} />}
      {mode === 'camp' && <CampGlyph size={dims.glyph} />}
      {mode === 'hike' && <HikeGlyph size={dims.glyph} />}
    </View>
  );
}

// ── Glyphs ────────────────────────────────────────────────────────────
// Each glyph is a fixed-aspect box whose internal pieces scale with `size`.
// The white-on-accent palette gives strong contrast on the colored chip.

const WHITE = '#FFFFFF';

/**
 * Hunt glyph — proper mature-buck whitetail antler silhouette.
 *
 * 2026-04-26 (third pass): the previous version had tines pointing forward
 * (rotated 26-58°) which read as "spider legs" or "asterisk" rather than
 * antlers. This rewrite moves all tines to point UP-AND-SLIGHTLY-OUT — the
 * way real deer antlers grow — and shapes the main beam as a clean C-curve
 * (low-out, up-vertical, top-inward) so the silhouette reads at 22px and
 * still looks like real antlers at 56px.
 *
 * Pattern per antler (mirror across the vertical center):
 *   • Main beam = three rotated rectangles forming a smooth C
 *     - base segment: -55° from vertical, base of the rack
 *     - mid segment: -15° from vertical, the "main beam stretch"
 *     - tip segment: +20° from vertical, curving back inward like a real beam
 *   • Tines = three vertical-ish rectangles standing UP off the mid/tip:
 *     - brow tine (G1): short, near the base
 *     - G2 (longest): middle of the beam
 *     - G3: between G2 and tip
 *   • Beam tip itself counts as the 4th point, so total = 8 points.
 *
 * No SVG, no emoji — pure View primitives, scales identically across
 * 22 / 32 / 56px without any pixel drift.
 */
function HuntGlyph({ size }: { size: number }) {
  const beamW = Math.max(2, Math.round(size * 0.085));
  const tineW = Math.max(2, Math.round(size * 0.07));

  // Main beam — three segments per antler.
  const segLow  = Math.round(size * 0.32);  // base outward
  const segMid  = Math.round(size * 0.32);  // upward stretch
  const segTip  = Math.round(size * 0.26);  // curving inward

  // Tines — all point up-and-slightly-out (5° to 15° from vertical).
  const browH = Math.round(size * 0.18);
  const g2H   = Math.round(size * 0.30);
  const g3H   = Math.round(size * 0.22);

  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      {/* ─── LEFT antler ─────────────────────────────────────── */}

      {/* Beam segment 1 — base, angles outward from center-bottom */}
      <View
        style={{
          position: 'absolute',
          bottom: size * 0.10,
          left: size * 0.39,
          width: beamW,
          height: segLow,
          backgroundColor: WHITE,
          borderRadius: beamW,
          transform: [{ rotate: '-55deg' }],
        }}
      />
      {/* Beam segment 2 — mid, mostly vertical */}
      <View
        style={{
          position: 'absolute',
          top: size * 0.26,
          left: size * 0.16,
          width: beamW,
          height: segMid,
          backgroundColor: WHITE,
          borderRadius: beamW,
          transform: [{ rotate: '-15deg' }],
        }}
      />
      {/* Beam segment 3 — tip, curves back inward */}
      <View
        style={{
          position: 'absolute',
          top: size * 0.04,
          left: size * 0.22,
          width: beamW,
          height: segTip,
          backgroundColor: WHITE,
          borderRadius: beamW,
          transform: [{ rotate: '20deg' }],
        }}
      />

      {/* G1 brow tine — short, sticks up near the base */}
      <View
        style={{
          position: 'absolute',
          bottom: size * 0.22,
          left: size * 0.30,
          width: tineW,
          height: browH,
          backgroundColor: WHITE,
          borderRadius: tineW,
          transform: [{ rotate: '-15deg' }],
        }}
      />
      {/* G2 — longest tine, mid-beam, points up-and-slightly-out */}
      <View
        style={{
          position: 'absolute',
          top: size * 0.20,
          left: size * 0.13,
          width: tineW,
          height: g2H,
          backgroundColor: WHITE,
          borderRadius: tineW,
          transform: [{ rotate: '-10deg' }],
        }}
      />
      {/* G3 — between G2 and tip */}
      <View
        style={{
          position: 'absolute',
          top: size * 0.06,
          left: size * 0.20,
          width: tineW,
          height: g3H,
          backgroundColor: WHITE,
          borderRadius: tineW,
          transform: [{ rotate: '-5deg' }],
        }}
      />

      {/* ─── RIGHT antler (mirror) ───────────────────────────── */}

      {/* Beam segment 1 */}
      <View
        style={{
          position: 'absolute',
          bottom: size * 0.10,
          right: size * 0.39,
          width: beamW,
          height: segLow,
          backgroundColor: WHITE,
          borderRadius: beamW,
          transform: [{ rotate: '55deg' }],
        }}
      />
      {/* Beam segment 2 */}
      <View
        style={{
          position: 'absolute',
          top: size * 0.26,
          right: size * 0.16,
          width: beamW,
          height: segMid,
          backgroundColor: WHITE,
          borderRadius: beamW,
          transform: [{ rotate: '15deg' }],
        }}
      />
      {/* Beam segment 3 */}
      <View
        style={{
          position: 'absolute',
          top: size * 0.04,
          right: size * 0.22,
          width: beamW,
          height: segTip,
          backgroundColor: WHITE,
          borderRadius: beamW,
          transform: [{ rotate: '-20deg' }],
        }}
      />
      {/* G1 brow */}
      <View
        style={{
          position: 'absolute',
          bottom: size * 0.22,
          right: size * 0.30,
          width: tineW,
          height: browH,
          backgroundColor: WHITE,
          borderRadius: tineW,
          transform: [{ rotate: '15deg' }],
        }}
      />
      {/* G2 */}
      <View
        style={{
          position: 'absolute',
          top: size * 0.20,
          right: size * 0.13,
          width: tineW,
          height: g2H,
          backgroundColor: WHITE,
          borderRadius: tineW,
          transform: [{ rotate: '10deg' }],
        }}
      />
      {/* G3 */}
      <View
        style={{
          position: 'absolute',
          top: size * 0.06,
          right: size * 0.20,
          width: tineW,
          height: g3H,
          backgroundColor: WHITE,
          borderRadius: tineW,
          transform: [{ rotate: '5deg' }],
        }}
      />
    </View>
  );
}

/**
 * Fish glyph — elongated oval body with a triangular tail fin.
 */
function FishGlyph({ size }: { size: number }) {
  const bodyW = Math.round(size * 0.7);
  const bodyH = Math.round(size * 0.42);
  const tail = Math.round(size * 0.22);
  const eye = Math.max(2, Math.round(size * 0.08));
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      {/* Body */}
      <View
        style={{
          width: bodyW,
          height: bodyH,
          borderRadius: bodyH / 2,
          backgroundColor: WHITE,
          marginLeft: -tail * 0.3,
        }}
      />
      {/* Tail (triangle pointing left) */}
      <View
        style={{
          position: 'absolute',
          right: size * 0.08,
          width: 0,
          height: 0,
          borderTopWidth: tail * 0.55,
          borderBottomWidth: tail * 0.55,
          borderLeftWidth: tail,
          borderTopColor: 'transparent',
          borderBottomColor: 'transparent',
          borderLeftColor: WHITE,
        }}
      />
      {/* Eye */}
      <View
        style={{
          position: 'absolute',
          left: size * 0.22,
          top: size * 0.36,
          width: eye,
          height: eye,
          borderRadius: eye / 2,
          backgroundColor: '#0D47A1',
        }}
      />
    </View>
  );
}

/**
 * Camp glyph — triangular A-frame tent with a darker door slit.
 */
function CampGlyph({ size }: { size: number }) {
  const base = Math.round(size * 0.8);
  const height = Math.round(size * 0.62);
  const doorW = Math.max(2, Math.round(size * 0.1));
  const doorH = Math.round(height * 0.55);
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'flex-end', paddingBottom: size * 0.15 }}>
      {/* Tent triangle */}
      <View
        style={{
          width: 0,
          height: 0,
          borderLeftWidth: base / 2,
          borderRightWidth: base / 2,
          borderBottomWidth: height,
          borderLeftColor: 'transparent',
          borderRightColor: 'transparent',
          borderBottomColor: WHITE,
        }}
      />
      {/* Ground line */}
      <View
        style={{
          position: 'absolute',
          bottom: size * 0.15,
          width: base + size * 0.1,
          height: 2,
          backgroundColor: WHITE,
          borderRadius: 1,
        }}
      />
      {/* Door slit */}
      <View
        style={{
          position: 'absolute',
          bottom: size * 0.15,
          width: doorW,
          height: doorH,
          backgroundColor: 'rgba(0,0,0,0.35)',
          borderTopLeftRadius: doorW,
          borderTopRightRadius: doorW,
        }}
      />
    </View>
  );
}

/**
 * Hike glyph — twin mountain peaks with a sun dot behind them.
 */
function HikeGlyph({ size }: { size: number }) {
  const peakBase = Math.round(size * 0.54);
  const peakHeight = Math.round(size * 0.5);
  const sun = Math.round(size * 0.2);
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'flex-end', paddingBottom: size * 0.14 }}>
      {/* Sun dot behind peaks */}
      <View
        style={{
          position: 'absolute',
          top: size * 0.18,
          right: size * 0.2,
          width: sun,
          height: sun,
          borderRadius: sun / 2,
          backgroundColor: WHITE,
          opacity: 0.55,
        }}
      />
      {/* Back peak (right, taller) */}
      <View
        style={{
          position: 'absolute',
          bottom: size * 0.14,
          right: size * 0.12,
          width: 0,
          height: 0,
          borderLeftWidth: peakBase / 2,
          borderRightWidth: peakBase / 2,
          borderBottomWidth: peakHeight,
          borderLeftColor: 'transparent',
          borderRightColor: 'transparent',
          borderBottomColor: WHITE,
        }}
      />
      {/* Front peak (left, shorter, fully opaque over back) */}
      <View
        style={{
          position: 'absolute',
          bottom: size * 0.14,
          left: size * 0.08,
          width: 0,
          height: 0,
          borderLeftWidth: peakBase / 2,
          borderRightWidth: peakBase / 2,
          borderBottomWidth: peakHeight * 0.78,
          borderLeftColor: 'transparent',
          borderRightColor: 'transparent',
          borderBottomColor: WHITE,
        }}
      />
      {/* Ground line */}
      <View
        style={{
          position: 'absolute',
          bottom: size * 0.14,
          width: size * 0.82,
          height: 2,
          backgroundColor: WHITE,
          borderRadius: 1,
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  chip: {
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
});
