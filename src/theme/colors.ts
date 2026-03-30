/**
 * OutdoorsMaryland - Woodland & Maryland Flag Color Palette
 *
 * Base palette inspired by natural woodland environments combined with
 * Maryland state flag colors (red, gold, black, white).
 * No copyrighted camo patterns (Mossy Oak, Realtree, etc.) are used.
 * All colors are derived from natural earth tones, foliage, bark, and Maryland heritage.
 */

const Colors = {
  // ── Primary Backgrounds ──
  /** Deep charcoal - main app background */
  background: '#1A1E16',
  /** Dark olive - card/surface background */
  surface: '#2A2F22',
  /** Slightly lighter surface for elevated elements */
  surfaceElevated: '#343A2C',

  // ── Woodland Greens ──
  /** Deep forest canopy */
  forestDark: '#1E3A2B',
  /** Rich moss green - primary brand color */
  moss: '#4A6741',
  /** Lighter sage for accents */
  sage: '#6B7F5E',
  /** Bright lichen highlight */
  lichen: '#8FA67A',

  // ── Earth Browns ──
  /** Dark bark - secondary accent */
  bark: '#5C4033',
  /** Warm oak - primary accent (buttons, highlights) */
  oak: '#8B7355',
  /** Sandy tan for text on dark */
  tan: '#C4A882',
  /** Light fawn for primary text */
  fawn: '#D4B896',

  // ── Accent & Utility ──
  /** Autumn amber for warnings */
  amber: '#D4913D',
  /** Deep rust for errors/danger */
  rust: '#A44A3F',
  /** Muted clay for borders */
  clay: '#7A5C3E',
  /** Dark mud for dividers */
  mud: '#3D3428',

  // ── Text Colors ──
  /** Primary text - warm off-white */
  textPrimary: '#E8DFD0',
  /** Secondary text - muted sand */
  textSecondary: '#A89B8C',
  /** Disabled/hint text */
  textMuted: '#6B6358',
  /** Text on accent backgrounds */
  textOnAccent: '#FFFFFF',

  // ── Map Land Type Colors ──
  /** WMA polygon fill */
  landWMA: '#4A6741',
  /** WMA polygon border */
  landWMABorder: '#2D4A22',
  /** State Forest polygon fill */
  landStateForest: '#2D6B4A',
  /** State Forest polygon border */
  landStateForestBorder: '#1A4D33',
  /** Federal land polygon fill */
  landFederal: '#8B7355',
  /** Federal land polygon border */
  landFederalBorder: '#6B5535',

  // ── Status Colors ──
  /** Online / success green */
  success: '#6B9E5B',
  /** Warning amber */
  warning: '#D4913D',
  /** Error / danger */
  danger: '#C75450',
  /** Info blue-grey */
  info: '#5B7B8A',

  // ── Transparency Helpers ──
  overlay: 'rgba(26, 30, 22, 0.85)',
  overlayLight: 'rgba(26, 30, 22, 0.6)',
  shadow: 'rgba(0, 0, 0, 0.4)',

  // ── Maryland Flag Accent Colors ──
  /** Crossland banner red */
  mdRed: '#E03C31',
  /** Crossland banner gold */
  mdGold: '#FFD700',
  /** Calvert black */
  mdBlack: '#1C1C1C',
  /** Calvert white/cream */
  mdWhite: '#F5F5DC',
} as const;

export type ColorKey = keyof typeof Colors;
export default Colors;
