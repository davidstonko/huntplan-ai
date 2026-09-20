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
 * Hunt glyph — whitetail rack silhouette.
 *
 * 2026-09-20 (seventh pass), drawn against a reference photo of a real
 * whitetail rack. Earlier attempts and why they failed:
 *   • straight rotated rectangles   -> read as a wishbone
 *   • two mirrored border arcs      -> the arcs closed into a ring and
 *                                      read as a helmet
 *   • short tines on a curved beam  -> read as a horseshoe
 *
 * What actually makes a rack read as a rack: the main beam sweeps WIDE
 * out from the skull, rises, and curls back inward at the tip; the
 * tines are LONG (half the height or more), rise off the inner edge of
 * that beam and fan toward center; and every stroke TAPERS from a thick
 * base to a fine point.
 *
 * React Native has no path primitive (react-native-svg is not a
 * dependency), so each stroke is a polyline of rounded rectangles. Each
 * segment is drawn `width` longer than its span so the round caps
 * overlap at the joints and the polyline reads as one continuous curve,
 * and each segment takes its own interpolated width, which is what
 * produces the taper.
 *
 * Geometry is normalized 0..1 and describes the LEFT antler only; the
 * right one is the same layer mirrored with scaleX, so the pair can
 * never drift out of symmetry.
 */

/** A normalized polyline plus the widths of its thick and fine ends. */
interface RackStroke {
  points: ReadonlyArray<readonly [number, number]>;
  /** Width at the base, as a fraction of the glyph size. */
  from: number;
  /** Width at the tip, as a fraction of the glyph size. */
  to: number;
}

/** Main beam: skull, out wide, up, then curling back toward center. */
const BEAM: RackStroke = {
  points: [
    [0.455, 0.94],
    [0.33, 0.87],
    [0.19, 0.74],
    [0.1, 0.53],
    [0.085, 0.33],
    [0.145, 0.17],
    [0.225, 0.09],
  ],
  from: 0.105,
  to: 0.026,
};

/** G1 brow tine — the short one low on the beam. */
const G1: RackStroke = {
  points: [
    [0.275, 0.8],
    [0.325, 0.7],
    [0.355, 0.605],
  ],
  from: 0.062,
  to: 0.02,
};

/** G2 — the longest tine, off the widest point of the beam. */
const G2: RackStroke = {
  points: [
    [0.135, 0.615],
    [0.215, 0.42],
    [0.3, 0.21],
  ],
  from: 0.075,
  to: 0.022,
};

/** G3 — high on the beam, leaning in to close the fan. */
const G3: RackStroke = {
  points: [
    [0.093, 0.43],
    [0.175, 0.28],
    [0.255, 0.125],
  ],
  from: 0.07,
  to: 0.02,
};

const RACK_FULL: readonly RackStroke[] = [BEAM, G1, G2, G3];
// At the 14px (sm) glyph the brow tine is barely a pixel and only
// muddies the silhouette, so small sizes drop it and run heavier.
const RACK_SMALL: readonly RackStroke[] = [
  { ...BEAM, from: 0.125, to: 0.04 },
  { ...G2, from: 0.095, to: 0.035 },
  { ...G3, from: 0.09, to: 0.035 },
];

/** One tapering polyline, drawn as overlapping round-capped segments. */
function Stroke({ stroke, size }: { stroke: RackStroke; size: number }) {
  const { points, from, to } = stroke;
  const segments = [];

  for (let i = 0; i < points.length - 1; i += 1) {
    const [x1, y1] = points[i];
    const [x2, y2] = points[i + 1];
    const dx = (x2 - x1) * size;
    const dy = (y2 - y1) * size;
    const span = Math.hypot(dx, dy);

    // Width interpolated at this segment's midpoint along the stroke.
    const t = (i + 0.5) / (points.length - 1);
    const width = Math.max(1.5, size * (from + (to - from) * t));

    // Rectangles are vertical by default, so subtract 90deg to turn the
    // segment's angle into a rotation.
    const angle = (Math.atan2(dy, dx) * 180) / Math.PI - 90;

    segments.push(
      <View
        key={i}
        style={{
          position: 'absolute',
          left: ((x1 + x2) / 2) * size - width / 2,
          // Overlength by `width` so the round caps close the joints.
          top: ((y1 + y2) / 2) * size - (span + width) / 2,
          width,
          height: span + width,
          borderRadius: width,
          backgroundColor: WHITE,
          transform: [{ rotate: `${angle}deg` }],
        }}
      />,
    );
  }

  return <>{segments}</>;
}

/** The left antler. Mirrored by the caller to make the right one. */
function HalfRack({ size, mirrored }: { size: number; mirrored?: boolean }) {
  const rack = size < 24 ? RACK_SMALL : RACK_FULL;
  return (
    <View
      style={{
        position: 'absolute',
        width: size,
        height: size,
        transform: mirrored ? [{ scaleX: -1 }] : undefined,
      }}
    >
      {rack.map((stroke, i) => (
        <Stroke key={i} stroke={stroke} size={size} />
      ))}
    </View>
  );
}

function HuntGlyph({ size }: { size: number }) {
  return (
    <View style={{ width: size, height: size }}>
      <HalfRack size={size} />
      <HalfRack size={size} mirrored />
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
