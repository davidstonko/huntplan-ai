/**
 * Scout Tab — Data Types
 * Used by ScoutDataContext for hunt plans, waypoints, routes, areas, and GPS tracks.
 */

export type WaypointIcon =
  | 'parking'
  | 'stand'
  | 'blind'
  | 'camera'
  | 'feeder'
  | 'food-plot'
  | 'water'
  | 'crossing'
  | 'sign'
  | 'custom';

export interface Waypoint {
  id: string;
  lat: number;
  lng: number;
  icon: WaypointIcon;
  label: string;
  notes: string;
}

export type RouteStyle = 'solid' | 'dashed' | 'dotted';

export interface Route {
  id: string;
  points: [number, number][]; // [lng, lat] pairs
  style: RouteStyle;
  label: string;
  distanceMeters: number;
}

export interface DrawnArea {
  id: string;
  polygon: [number, number][]; // [lng, lat] ring
  label: string;
  areaAcres: number;
}

export interface HuntPlan {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  color: string;
  visible: boolean;
  parkingPoint: Waypoint | null;
  waypoints: Waypoint[];
  routes: Route[];
  areas: DrawnArea[];
  notes: string;
}

export interface TrackPoint {
  lat: number;
  lng: number;
  timestamp: number;
  altitude?: number;
  speed?: number;
}

export interface RecordedTrack {
  id: string;
  name: string;
  date: string;
  points: TrackPoint[];
  distanceMeters: number;
  durationSeconds: number;
  visible: boolean;
}

// ── Palette for auto-assigning plan colors ──
export const PLAN_COLORS = [
  '#E03C31', // MD Red
  '#0277BD', // Blue
  '#FFD700', // MD Gold
  '#6A1B9A', // Purple
  '#EF6C00', // Orange
  '#00695C', // Teal
  '#C62828', // Deep Red
  '#1565C0', // Royal Blue
  '#2E7D32', // Forest Green
  '#AD1457', // Pink
];

// ── Waypoint icon emoji map for rendering ──
export const WAYPOINT_ICONS: Record<WaypointIcon, string> = {
  parking: '\uD83D\uDE97',   // 🚗
  stand: '\uD83C\uDF32',     // 🌲
  blind: '\uD83C\uDFAA',     // 🎪
  camera: '\uD83D\uDCF7',    // 📷
  feeder: '\uD83C\uDF3E',    // 🌾
  'food-plot': '\uD83C\uDF3F', // 🌿
  water: '\uD83D\uDCA7',     // 💧
  crossing: '\uD83D\uDEB6',  // 🚶
  sign: '\uD83E\uDEA7',      // 🪧
  custom: '\uD83D\uDCCC',    // 📌
};
