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
 * Hunt glyph — whitetail antler silhouette.
 *
 * 2026-04-30 (fourth pass): user shared a clean reference image of
 * deer antlers and said "we want our Hunt symbol to look like that".
 * The previous version (six rotated rectangles per side trying to
 * mimic main beam + 3 tines) read as spider legs at 22px. This pass
 * goes simpler — fewer pieces, cleaner shapes, more recognizable at
 * small sizes:
 *
 *   • ONE long curved beam per side (a single rotated rounded
 *     rectangle, ~55° outward from vertical), forming the C-shape
 *     spread of the rack
 *   • THREE short straight tines per side, all pointing UP off the
 *     beam at a slight outward lean (the way real antlers grow)
 *   • All white on the moss-green chip
 *
 * Total per side: 4 pieces (1 beam + 3 tines), down from 6. Reads
 * cleanly at 22px, still looks intentional at 56px. Pure View
 * primitives — no SVG dep, no asset files.
 */
function HuntGlyph({ size }: { size: number }) {
  // Stroke widths scale with the chip size. Min 2px so we never
  // disappear at the small (sm: 14px) glyph size.
  const beamW = Math.max(2, Math.round(size * 0.10));
  const tineW = Math.max(2, Math.round(size * 0.075));

  // Beam: a single long rounded rectangle, rotated ~55° from vertical
  // so it sweeps from low-center upward-and-outward like a buck's
  // main beam. Length is most of the glyph height.
  const beamH = Math.round(size * 0.62);

  // Tines all start from the beam and point upward. Three per side
  // gives the silhouette "real antler" weight without crowding.
  // Heights tuned so the middle tine is tallest (G2 is always the
  // longest tine on a real rack).
  const browH = Math.round(size * 0.20);
  const g2H = Math.round(size * 0.30);
  const g3H = Math.round(size * 0.22);

  return (
    <View
      style={{
        width: size,
        height: size,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      {/* ─── LEFT antler ─────────────────────────────────────── */}

      {/* Main beam — single long stroke arcing up and out. */}
      <View
        style={{
          position: 'absolute',
          bottom: size * 0.08,
          left: size * 0.36,
          width: beamW,
          height: beamH,
          backgroundColor: WHITE,
          borderRadius: beamW,
          transform: [{ rotate: '-30deg' }],
        }}
      />

      {/* G1 brow tine — short, points up near the base of the beam. */}
      <View
        style={{
          position: 'absolute',
          bottom: size * 0.36,
          left: size * 0.28,
          width: tineW,
          height: browH,
          backgroundColor: WHITE,
          borderRadius: tineW,
          transform: [{ rotate: '-12deg' }],
        }}
      />
      {/* G2 — longest tine, mid-beam, points straight up with a small
          outward lean. */}
      <View
        style={{
          position: 'absolute',
          bottom: size * 0.42,
          left: size * 0.18,
          width: tineW,
          height: g2H,
          backgroundColor: WHITE,
          borderRadius: tineW,
          transform: [{ rotate: '-6deg' }],
        }}
      />
      {/* G3 — near the tip of the beam, slightly inward to give the
          rack its closed-top whitetail shape. */}
      <View
        style={{
          position: 'absolute',
          bottom: size * 0.50,
          left: size * 0.12,
          width: tineW,
          height: g3H,
          backgroundColor: WHITE,
          borderRadius: tineW,
          transform: [{ rotate: '0deg' }],
        }}
      />

      {/* ─── RIGHT antler (mirror) ───────────────────────────── */}

      <View
        style={{
          position: 'absolute',
          bottom: size * 0.08,
          right: size * 0.36,
          width: beamW,
          height: beamH,
          backgroundColor: WHITE,
          borderRadius: beamW,
          transform: [{ rotate: '30deg' }],
        }}
      />
      <View
        style={{
          position: 'absolute',
          bottom: size * 0.36,
          right: size * 0.28,
          width: tineW,
          height: browH,
          backgroundColor: WHITE,
          borderRadius: tineW,
          transform: [{ rotate: '12deg' }],
        }}
      />
      <View
        style={{
          position: 'absolute',
          bottom: size * 0.42,
          right: size * 0.18,
          width: tineW,
          height: g2H,
          backgroundColor: WHITE,
          borderRadius: tineW,
          transform: [{ rotate: '6deg' }],
        }}
      />
      <View
        style={{
          position: 'absolute',
          bottom: size * 0.50,
          right: size * 0.12,
          width: tineW,
          height: g3H,
          backgroundColor: WHITE,
          borderRadius: tineW,
          transform: [{ rotate: '0deg' }],
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
