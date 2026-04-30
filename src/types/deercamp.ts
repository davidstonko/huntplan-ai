/**
 * Camp Types — Shared by Deer Camp (hunt) and Honey Hole (fish/boat/crab).
 * Used by DeerCampContext for collaborative shared maps between friends/groups.
 *
 * camp_type: 'deer_camp' (hunting groups) | 'honey_hole' (fishing/boating/crabbing)
 */

import { Waypoint, Route, DrawnArea, RecordedTrack } from './scout';

// ── Camp Type ──────────────────────────────────────────────────

export type CampType = 'deer_camp' | 'honey_hole';

// ── V2.3 area-bounded camp redesign (Phase D2, 2026-04-20) ─────
// Imported from huntplan-ai fork merge 2026-04-26.
// All new DeerCamp fields are OPTIONAL for backward-compat with
// V2.2 stored camps that won't have them.

export interface CampArea {
  north: number;
  south: number;
  east: number;
  west: number;
  areaSqMi: number;
}

export const DEER_CAMP_MAX_AREA_SQ_MI = 5;

export type OfflineTileStatus = 'none' | 'downloading' | 'ready' | 'error';

export interface CampDocument {
  id: string;
  addedBy: string;
  addedAt: string;
  title: string;
  kind: 'image' | 'pdf' | 'other';
  uri: string;
  caption?: string;
  sizeBytes?: number;
}

// ── Member Roles ───────────────────────────────────────────────

export type CampMemberRole = 'admin' | 'member';

export interface CampMember {
  userId: string;
  username: string;
  role: CampMemberRole;
  color: string;
  joinedAt: string;
}

/** Display label for role — 'admin' renders as 'Moderator' in UI. */
export function roleDisplayLabel(role: CampMemberRole): string {
  return role === 'admin' ? 'Moderator' : 'Member';
}

/** Check if a member is the camp moderator (creator/admin). */
export function isModerator(camp: { members: CampMember[] }, userId: string): boolean {
  const member = camp.members.find((m) => m.userId === userId);
  return member?.role === 'admin';
}

/** Moderator badge unicode star. */
export const MODERATOR_BADGE = '\u2B50';

/**
 * Check if a user can delete an annotation (creator OR moderator).
 * The creator can always delete their own annotations.
 * The camp moderator (admin) can delete any annotation.
 */
export function canDeleteAnnotation(
  camp: DeerCamp,
  userId: string,
  annotation: SharedAnnotation
): boolean {
  // Creator can always delete their own annotation
  if (annotation.createdBy === userId) {
    return true;
  }
  // Moderator can delete any annotation
  return isModerator(camp, userId);
}

/**
 * Check if a user can toggle visibility of an annotation (creator only).
 * Only the creator can hide/show their own annotations from camp view.
 */
export function canToggleVisibility(
  userId: string,
  annotation: SharedAnnotation
): boolean {
  return annotation.createdBy === userId;
}

/**
 * Get annotations visible to a specific user in a camp.
 * Filters out annotations that are hidden from camp view by their creator,
 * unless the user is the creator of that annotation.
 */
export function getVisibleAnnotations(
  camp: DeerCamp,
  userId: string
): SharedAnnotation[] {
  return camp.annotations.filter((annotation) => {
    // If hidden from camp, only the creator can see it
    if (annotation.hiddenFromCamp) {
      return annotation.createdBy === userId;
    }
    return true;
  });
}

// ── Annotations ────────────────────────────────────────────────

/**
 * SharedAnnotation types:
 * - waypoint, route, area, note, track — standard (used by both Deer Camp and Honey Hole)
 * - water_feature, structure, navigation, fishing_intel, catch_photo, bait_depth — Honey Hole specific
 */
export type AnnotationType =
  | 'waypoint' | 'route' | 'area' | 'note' | 'track'
  | 'water_feature' | 'structure' | 'navigation' | 'fishing_intel' | 'catch_photo' | 'bait_depth';

export interface SharedAnnotation {
  id: string;
  type: AnnotationType;
  createdBy: string; // userId
  createdAt: string;
  data: Waypoint | Route | DrawnArea | CampNote | RecordedTrack
    | WaterFeaturePin | StructurePin | NavigationPin | FishingIntelPin | CatchPhotoPin | BaitDepthPin;
  importedFromPlanId?: string;
  /** Whether this annotation is hidden from camp view by its creator */
  hiddenFromCamp?: boolean;
  /** Whether the annotation creator has allowed camp members to see notes/photos */
  notesVisible?: boolean;
}

// ── Standard Notes ─────────────────────────────────────────────

export interface CampNote {
  id: string;
  lat: number;
  lng: number;
  text: string;
}

// ── Honey Hole: Water Features ─────────────────────────────────

export type WaterFeatureType =
  | 'deep_pool' | 'channel' | 'drop_off' | 'current_break' | 'eddy'
  | 'riffle' | 'shoal' | 'sandbar' | 'oyster_bar' | 'tidal_flat'
  | 'spring' | 'confluence' | 'tailwater';

export const WATER_FEATURE_LABELS: Record<WaterFeatureType, string> = {
  deep_pool: 'Deep Pool',
  channel: 'Channel',
  drop_off: 'Drop-off',
  current_break: 'Current Break',
  eddy: 'Eddy',
  riffle: 'Riffle',
  shoal: 'Shoal',
  sandbar: 'Sandbar',
  oyster_bar: 'Oyster Bar',
  tidal_flat: 'Tidal Flat',
  spring: 'Spring',
  confluence: 'Confluence',
  tailwater: 'Tailwater',
};

export const WATER_FEATURE_ICONS: Record<WaterFeatureType, string> = {
  deep_pool: '\uD83C\uDF0A',
  channel: '\u27A1\uFE0F',
  drop_off: '\u2B07\uFE0F',
  current_break: '\uD83C\uDF00',
  eddy: '\uD83D\uDD04',
  riffle: '\u3030\uFE0F',
  shoal: '\u26A0\uFE0F',
  sandbar: '\uD83C\uDFD6\uFE0F',
  oyster_bar: '\uD83E\uDEA6',
  tidal_flat: '\uD83C\uDF05',
  spring: '\uD83D\uDCA7',
  confluence: '\uD83D\uDD00',
  tailwater: '\uD83C\uDF0A',
};

export interface WaterFeaturePin {
  id: string;
  lat: number;
  lng: number;
  featureType: WaterFeatureType;
  label: string;
  depthFt?: number;
  notes?: string;
}

// ── Honey Hole: Structure & Cover ──────────────────────────────

export type StructureType =
  | 'submerged_timber' | 'rock_pile' | 'bridge_piling' | 'dock'
  | 'laydown' | 'grass_bed' | 'lily_pads' | 'riprap'
  | 'stump_field' | 'brush_pile' | 'seawall' | 'jetty';

export const STRUCTURE_LABELS: Record<StructureType, string> = {
  submerged_timber: 'Submerged Timber',
  rock_pile: 'Rock Pile',
  bridge_piling: 'Bridge Piling',
  dock: 'Dock',
  laydown: 'Laydown',
  grass_bed: 'Grass Bed',
  lily_pads: 'Lily Pads',
  riprap: 'Rip-rap',
  stump_field: 'Stump Field',
  brush_pile: 'Brush Pile',
  seawall: 'Seawall',
  jetty: 'Jetty',
};

export const STRUCTURE_ICONS: Record<StructureType, string> = {
  submerged_timber: '\uD83E\uDEB5',
  rock_pile: '\uD83E\uDEA8',
  bridge_piling: '\uD83C\uDF09',
  dock: '\u2693',
  laydown: '\uD83E\uDEB5',
  grass_bed: '\uD83C\uDF3F',
  lily_pads: '\uD83C\uDF3E',
  riprap: '\uD83E\uDEA8',
  stump_field: '\uD83E\uDEB5',
  brush_pile: '\uD83C\uDF33',
  seawall: '\uD83E\uDDF1',
  jetty: '\uD83C\uDF0A',
};

export interface StructurePin {
  id: string;
  lat: number;
  lng: number;
  structureType: StructureType;
  label: string;
  depthFt?: number;
  notes?: string;
}

// ── Honey Hole: Navigation & Safety ────────────────────────────

export type NavigationType =
  | 'boat_ramp' | 'no_wake_zone' | 'shallow_hazard' | 'channel_marker'
  | 'mooring' | 'fuel_dock' | 'marina' | 'anchorage'
  | 'speed_limit' | 'restricted_area';

export const NAVIGATION_LABELS: Record<NavigationType, string> = {
  boat_ramp: 'Boat Ramp',
  no_wake_zone: 'No-Wake Zone',
  shallow_hazard: 'Shallow Hazard',
  channel_marker: 'Channel Marker',
  mooring: 'Mooring',
  fuel_dock: 'Fuel Dock',
  marina: 'Marina',
  anchorage: 'Anchorage',
  speed_limit: 'Speed Limit',
  restricted_area: 'Restricted Area',
};

export const NAVIGATION_ICONS: Record<NavigationType, string> = {
  boat_ramp: '\uD83D\uDEA3',
  no_wake_zone: '\uD83D\uDEAB',
  shallow_hazard: '\u26A0\uFE0F',
  channel_marker: '\uD83D\uDEA9',
  mooring: '\u2693',
  fuel_dock: '\u26FD',
  marina: '\u26F5',
  anchorage: '\u2693',
  speed_limit: '\uD83D\uDEB0',
  restricted_area: '\uD83D\uDEAB',
};

export interface NavigationPin {
  id: string;
  lat: number;
  lng: number;
  navType: NavigationType;
  label: string;
  notes?: string;
}

// ── Honey Hole: Fishing Intel ──────────────────────────────────

export type FishingIntelType =
  | 'honey_spot' | 'bait_school' | 'trolling_lane' | 'drift_line'
  | 'anchor_point' | 'crab_pot_area' | 'cast_zone'
  | 'spawning_area' | 'feeding_lane' | 'structure_edge';

export const FISHING_INTEL_LABELS: Record<FishingIntelType, string> = {
  honey_spot: 'Honey Spot',
  bait_school: 'Bait School',
  trolling_lane: 'Trolling Lane',
  drift_line: 'Drift Line',
  anchor_point: 'Anchor Point',
  crab_pot_area: 'Crab Pot Area',
  cast_zone: 'Cast Zone',
  spawning_area: 'Spawning Area',
  feeding_lane: 'Feeding Lane',
  structure_edge: 'Structure Edge',
};

export const FISHING_INTEL_ICONS: Record<FishingIntelType, string> = {
  honey_spot: '\u2B50',
  bait_school: '\uD83D\uDC1F',
  trolling_lane: '\u27A1\uFE0F',
  drift_line: '\uD83C\uDF2C\uFE0F',
  anchor_point: '\u2693',
  crab_pot_area: '\uD83E\uDD80',
  cast_zone: '\uD83C\uDFA3',
  spawning_area: '\uD83E\uDD5A',
  feeding_lane: '\uD83C\uDF7D\uFE0F',
  structure_edge: '\uD83D\uDCCD',
};

export interface FishingIntelPin {
  id: string;
  lat: number;
  lng: number;
  intelType: FishingIntelType;
  label: string;
  species?: string;
  bestTide?: 'incoming' | 'outgoing' | 'slack' | 'any';
  bestTime?: 'dawn' | 'morning' | 'midday' | 'evening' | 'night' | 'any';
  notes?: string;
}

// ── Honey Hole: Catch Photos ───────────────────────────────────

export interface CatchPhotoPin {
  id: string;
  lat: number;
  lng: number;
  imageUri: string; // Local reference (full upload in V3 via S3/R2)
  species?: string;
  lengthInches?: number;
  weightLbs?: number;
  caption?: string;
  caughtAt: string; // ISO timestamp
  kept: boolean;
}

// ── Honey Hole: Bait & Depth Notes ─────────────────────────────

export interface BaitDepthPin {
  id: string;
  lat: number;
  lng: number;
  bait: string; // e.g., "Chartreuse bucktail", "Chicken neck", "Live minnow"
  presentation?: string; // e.g., "Bottom bounce", "Jigging", "Trolling 3mph"
  depthFt?: number;
  species?: string;
  success: 'hot' | 'decent' | 'slow' | 'nothing';
  date: string; // ISO date
  notes?: string;
}

// ── Photos ─────────────────────────────────────────────────────

export interface CampPhoto {
  id: string;
  uploadedBy: string; // userId
  uploadedAt: string;
  imageUri: string;
  lat: number;
  lng: number;
  caption?: string;
}

// ── Activity Feed ──────────────────────────────────────────────

export interface ActivityFeedItem {
  id: string;
  userId: string;
  username: string;
  action: string; // e.g., "added a waypoint", "uploaded a photo"
  timestamp: string;
  annotationId?: string;
  photoId?: string;
}

// ── Monetization Tier System ───────────────────────────────────

/** Free tier allows up to FREE_TIER_MEMBER_LIMIT members. */
export const FREE_TIER_MEMBER_LIMIT = 10;
/** Each paid upgrade adds PAID_TIER_BLOCK_SIZE members. */
export const PAID_TIER_BLOCK_SIZE = 25;
/** Cost per paid tier block (USD). */
export const PAID_TIER_PRICE_USD = 5;

export type TierStatus = 'free' | 'paid';

export interface CampTier {
  status: TierStatus;
  /** Total allowed members (10 for free, 10 + N*25 for paid blocks). */
  maxMembers: number;
  /** Number of paid blocks purchased. */
  paidBlocks: number;
  /** Whether owner has enabled chat (auto-enabled under 10, owner toggle for 10+). */
  chatEnabled: boolean;
}

// ── Main Camp Interface ────────────────────────────────────────

export interface DeerCamp {
  id: string;
  name: string;
  /**
   * Optional 2026-04-26 (fork merge): older V2.2 camps stored locally
   * predate the campType field. Default to 'deer_camp' on read.
   */
  campType?: CampType;
  createdAt: string;
  createdBy: string; // userId
  linkedLandId?: string; // optional — ties to a public land
  inviteCode?: string; // 6-char alphanumeric code for sharing via Universal Link
  centerPoint: { lat: number; lng: number };
  defaultZoom: number;
  members: CampMember[];
  annotations: SharedAnnotation[];
  photos: CampPhoto[];
  activityFeed: ActivityFeedItem[];
  /** Monetization tier — defaults to free with 10 members, chat auto-enabled */
  /**
   * Optional 2026-04-26 (fork merge): older V2.2 camps don't have tier;
   * default to 'free' on read.
   */
  tier?: CampTier;
  /**
   * Honey Hole only: locked viewport bounds set at creation time.
   * Users pick an area of water/river/land, then this defines the map extent.
   */
  viewportBounds?: {
    ne: { lat: number; lng: number };
    sw: { lat: number; lng: number };
  };

  // ── V2.3 area-bounded fields (added 2026-04-20). Optional. ──
  area?: CampArea;
  offlineTileStatus?: OfflineTileStatus;
  description?: string;
  documents?: CampDocument[];
}

// ── Member color palette (unique per member in a camp) ──
export const MEMBER_COLORS = [
  '#E03C31', // Red
  '#0277BD', // Blue
  '#FFD700', // Gold
  '#6A1B9A', // Purple
  '#EF6C00', // Orange
  '#00695C', // Teal
  '#AD1457', // Pink
  '#1565C0', // Royal Blue
  '#2E7D32', // Green
  '#F57F17', // Amber
];

// ── Default tier for new camps ──
export function createDefaultTier(): CampTier {
  return {
    status: 'free',
    maxMembers: FREE_TIER_MEMBER_LIMIT,
    paidBlocks: 0,
    chatEnabled: true,
  };
}

/**
 * Check if a camp can accept more members.
 * Returns { canAdd, reason? }
 */
export function canAddMember(camp: DeerCamp): { canAdd: boolean; reason?: string } {
  const currentCount = camp.members.length;
  // 2026-04-26 (fork merge): tier is now optional; default to free tier shape.
  const tier = camp.tier ?? { maxMembers: FREE_TIER_MEMBER_LIMIT, status: 'free' as const, chatEnabled: true };
  const max = tier.maxMembers;

  if (currentCount < max) {
    return { canAdd: true };
  }

  if (tier.status === 'free') {
    return {
      canAdd: false,
      reason: `Free tier limited to ${FREE_TIER_MEMBER_LIMIT} members. Upgrade for $${PAID_TIER_PRICE_USD} to add ${PAID_TIER_BLOCK_SIZE} more.`,
    };
  }

  return {
    canAdd: false,
    reason: `Current tier allows ${max} members. Upgrade for $${PAID_TIER_PRICE_USD} to add ${PAID_TIER_BLOCK_SIZE} more.`,
  };
}

/**
 * Check if chat should be available for this camp.
 * Auto-enabled under FREE_TIER_MEMBER_LIMIT. Owner toggle for larger camps.
 */
export function isChatAvailable(camp: DeerCamp): boolean {
  if (camp.members.length <= FREE_TIER_MEMBER_LIMIT) {
    return true; // Always available for small camps
  }
  return camp.tier?.chatEnabled ?? true;
}
