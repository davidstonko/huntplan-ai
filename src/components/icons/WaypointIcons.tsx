/**
 * WaypointIcons — Custom SVG icon components for hunt waypoints.
 *
 * Replaces emoji-based waypoint markers with clean, scalable SVG icons
 * rendered in the MD color palette. Each icon is a simple silhouette
 * designed for small map markers (24-32px) and picker UI (40-48px).
 *
 * Icons are React Native Svg components using react-native-svg.
 * They accept `size` and `color` props for flexibility.
 */

import React from 'react';
import { View, StyleSheet, Text } from 'react-native';
import Colors from '../../theme/colors';

interface IconProps {
  size?: number;
  color?: string;
}

/**
 * Since react-native-svg may not be installed, we use a lightweight
 * text-based icon system with single-character glyphs and styled containers.
 * These render as colored circles with a short text glyph inside.
 *
 * When react-native-svg is available (Phase 6), these can be upgraded
 * to full SVG paths without changing the API.
 */

// ── Icon Glyph Map ──────────────────────────────────────────
// Short text glyphs designed for 14-24px rendering inside colored circles.
// Uses Unicode symbols and single letters where no good Unicode exists.

const ICON_GLYPHS: Record<string, string> = {
  // Deer
  deer_antlers:   '♛',   // crown → antlers
  deer_head:      '♀',   // doe
  trophy_antlers: '★',   // star → trophy
  fawn:           '♡',   // heart → fawn
  bed_buck:       '◉',   // target circle → bedding
  bed_doe:        '◎',   // double circle → doe bed
  tree_rub:       '∥',   // parallel → rub
  scrape:         '⊘',   // circle-slash → scrape
  antler_shed:    '⚑',   // flag → shed
  hoof_print:     '⊻',   // tracks
  scat:           '•',   // dot
  crossing:       '⇌',   // crossing arrows
  trail_arrow:    '→',   // travel corridor
  staging:        '◈',   // diamond → staging

  // Turkey
  turkey_gobbler: '♂',   // male
  turkey_hen:     '♀',   // female
  nest:           '⊙',   // centered dot → nest
  roost_tree:     '↑',   // up arrow → roost
  flock:          '⋮⋮',  // dots → flock
  strut_zone:     '♂',   // male → strut
  dust_bath:      '≈',   // waves → dust
  decoy:          '⊕',   // target → decoy

  // Bear
  bear_paw:       '✋',   // hand → paw
  claw_marks:     '≡',   // triple line → claw
  den:            '⌂',   // house → den
  bear_trail:     '↝',   // wavy arrow → trail

  // Predator
  coyote:         '⊗',   // circled x → predator
  fox:            '◇',   // diamond → fox
  predator_track: '⊗',   // circled x

  // Small Game
  rabbit:         '◌',   // dashed circle
  squirrel:       '◦',   // ring
  pheasant:       '◊',   // diamond
  grouse:         '◊',   // diamond

  // Waterfowl
  duck:           '≋',   // triple wave → water
  goose:          '∨',   // v → flying
  water_roost:    '≋',   // waves
  water_blind:    '▬',   // rectangle → blind

  // Sika
  sika:           '❖',   // diamond star
  sika_sign:      '❖',

  // Hunt Events
  crosshair:      '⊕',   // crosshair → kill site
  blood_drop:     '♦',   // diamond → blood
  target:         '◎',   // target → shot
  flag:           '⚐',   // flag → recovery

  // Infrastructure
  tree_stand:     '▲',   // triangle → elevated
  ground_blind:   '■',   // square → blind
  prepped_tree:   '△',   // open triangle → prepped
  trail_cam:      '◻',   // square → camera
  feeder:         '▼',   // inverted triangle → feeder
  food_plot:      '▧',   // hatched → plot
  mineral:        '◆',   // filled diamond → mineral

  // Habitat
  water_drop:     '◙',   // circle dot → water
  funnel:         '⊳',   // triangle → funnel
  saddle:         '∪',   // cup → saddle
  ridge:          '∧',   // caret → ridge
  acorn:          '●',   // filled circle → acorn/mast
  field_edge:     '┃',   // line → edge
  thick_brush:    '✦',   // star → thick

  // Access
  parking_p:      'P',   // P
  gate:           '╫',   // gate
  tent:           '⛺',  // tent
  clipboard:      '☑',   // checkbox → check station
  corner_flag:    '⚐',   // flag
  warning:        '⚠',   // warning

  // General
  pin:            '●',   // dot
};

// ── Icon Component ──────────────────────────────────────────

interface WaypointIconComponentProps {
  iconKey: string;
  size?: number;
  color?: string;
  backgroundColor?: string;
  showBorder?: boolean;
}

/**
 * Renders a waypoint icon as a colored circle with a glyph.
 * Used in the waypoint picker UI and map marker callouts.
 *
 * For map rendering (Mapbox CircleLayer + SymbolLayer), we pass
 * the shortLabel text to the SymbolLayer textField instead.
 */
export const WaypointIcon: React.FC<WaypointIconComponentProps> = ({
  iconKey,
  size = 32,
  color = Colors.textPrimary,
  backgroundColor = Colors.surface,
  showBorder = true,
}) => {
  const glyph = ICON_GLYPHS[iconKey] || '●';
  const fontSize = size * 0.45;
  const borderWidth = showBorder ? 2 : 0;

  return (
    <View
      style={[
        styles.iconContainer,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor,
          borderWidth,
          borderColor: color,
        },
      ]}
    >
      <Text
        style={[
          styles.iconGlyph,
          { fontSize, color, lineHeight: fontSize * 1.2 },
        ]}
        allowFontScaling={false}
      >
        {glyph}
      </Text>
    </View>
  );
};

/**
 * Gets the text glyph for a given icon key.
 * Used by AnnotationLayer to set the SymbolLayer textField.
 */
export function getIconGlyph(iconKey: string): string {
  return ICON_GLYPHS[iconKey] || '●';
}

/**
 * Gets all available icon keys.
 */
export function getAllIconKeys(): string[] {
  return Object.keys(ICON_GLYPHS);
}

const styles = StyleSheet.create({
  iconContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  iconGlyph: {
    textAlign: 'center',
    fontWeight: '700',
  },
});

export default WaypointIcon;
