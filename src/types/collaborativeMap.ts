/**
 * Shared types for collaborative map components (Deer Camp, Honey Hole, Group Camp).
 * Used by CollaborativeMapBase and derived screens.
 */

import { Waypoint, Route, DrawnArea, RecordedTrack } from './scout';
import { SharedAnnotation, CampMember, ActivityFeedItem } from './deercamp';

/**
 * View mode: 'list' for camp selection, 'map' for collaborative map view.
 */
export type ViewMode = 'list' | 'map';

/**
 * Bottom panel overlay options.
 */
export type BottomPanel = 'none' | 'feed' | 'members' | 'chat' | 'photos' | 'insights' | 'tools';

/**
 * Toolbar button configuration.
 * Used by CollaborativeMapBase to render configurable action buttons.
 */
export interface ToolbarButtonConfig {
  /** Unique identifier for the button */
  id: string;
  /** Emoji or icon character */
  emoji: string;
  /** Label text (shown on button or in tooltip) */
  label: string;
  /** Whether button is currently active/selected */
  active?: boolean;
  /** Optional badge count to display */
  badge?: number;
  /** Whether button is only visible to admins */
  adminOnly?: boolean;
  /** Whether button is visible (default true) */
  visible?: boolean;
}

/**
 * GeoJSON feature collection for map layers.
 * Contains features for different annotation types.
 */
export interface AnnotationGeoJSON {
  waypoints: any | null;
  routes: any | null;
  areas: any | null;
  tracks: any | null;
  photos?: any | null;
}

/**
 * Props for CollaborativeMapBase component.
 * Extracts shared map UI and renders from DeerCamp, HoneyHole, GroupCamp screens.
 */
export interface CollaborativeMapBaseProps {
  // ── Data ──
  /** Currently selected camp/hole name */
  campName: string;
  /** List of camp members */
  members: CampMember[];
  /** Activity feed items (last 30) */
  activityFeed: ActivityFeedItem[];
  /** GeoJSON layers (waypoints, routes, areas, tracks, photos) */
  geoJsonLayers: AnnotationGeoJSON;
  /** Map center point */
  centerPoint: { lat: number; lng: number };
  /** Initial map zoom level */
  zoomLevel: number;

  // ── State ──
  /** Current bottom panel (feed, members, chat, photos, insights, tools, or none) */
  bottomPanel: BottomPanel;
  /** Whether the current user is admin/moderator */
  isAdmin: boolean;
  /** Whether to show "add mode" hint overlay */
  showAddModeHint?: boolean;
  /** Add mode hint text (e.g., "Tap to place: Water Feature") */
  addModeHintText?: string;
  /** Whether the current user is editing the camp title */
  isEditingTitle?: boolean;
  /** Current value of title edit field (if editing) */
  editTitleValue?: string;

  // ── Toolbar buttons ──
  /** Array of toolbar button configs */
  toolbarButtons: ToolbarButtonConfig[];

  // ── Callbacks ──
  /** Called when user taps the map (for adding annotations) */
  onMapPress?: (event: any) => void;
  /** Called when user clicks back button */
  onExitMap: () => void;
  /** Called when user clicks share/invite button */
  onShare: () => void;
  /** Called when user clicks a toolbar button */
  onToolbarPress: (buttonId: string) => void;
  /** Called when bottom panel changes */
  onBottomPanelChange: (panel: BottomPanel) => void;
  /** Called when user starts editing title (admin only) */
  onStartEditTitle?: () => void;
  /** Called when user confirms title edit */
  onConfirmEditTitle?: (newTitle: string) => void;
  /** Called when user cancels title edit */
  onCancelEditTitle?: () => void;
  /** Called when user requests to recenter map */
  onRecenterMap?: (cameraRef: React.RefObject<any>) => void;

  // ── Optional custom rendering ──
  /** Custom render function for additional bottom panel content */
  renderCustomPanel?: (panelId: string) => React.ReactNode;

  // ── Refs ──
  /** Mapbox Camera ref for programmatic control */
  cameraRef: React.RefObject<any>;
  /** Mapbox MapView ref for programmatic control */
  mapRef?: React.RefObject<any>;
}

/**
 * Bottom panel context for rendering members, feed, or custom content.
 */
export interface BottomPanelContext {
  panelType: BottomPanel;
  isAdmin: boolean;
  memberCount: number;
  onAddMember?: () => void;
  onRemoveMember?: (userId: string, username: string) => void;
}
