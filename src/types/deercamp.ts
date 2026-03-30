/**
 * Deer Camp Tab — Data Types
 * Used by DeerCampContext for collaborative shared maps between friends/hunting groups.
 */

import { Waypoint, Route, DrawnArea, RecordedTrack } from './scout';

export type CampMemberRole = 'admin' | 'member';

export interface CampMember {
  userId: string;
  username: string;
  role: CampMemberRole;
  color: string;
  joinedAt: string;
}

export interface SharedAnnotation {
  id: string;
  type: 'waypoint' | 'route' | 'area' | 'note' | 'track';
  createdBy: string; // userId
  createdAt: string;
  data: Waypoint | Route | DrawnArea | CampNote | RecordedTrack;
  importedFromPlanId?: string;
}

export interface CampNote {
  id: string;
  lat: number;
  lng: number;
  text: string;
}

export interface CampPhoto {
  id: string;
  uploadedBy: string; // userId
  uploadedAt: string;
  imageUri: string;
  lat: number;
  lng: number;
  caption?: string;
}

export interface ActivityFeedItem {
  id: string;
  userId: string;
  username: string;
  action: string; // e.g., "added a waypoint", "uploaded a photo"
  timestamp: string;
  annotationId?: string;
  photoId?: string;
}

export interface DeerCamp {
  id: string;
  name: string;
  createdAt: string;
  createdBy: string; // userId
  linkedLandId?: string; // optional — ties to a public land
  centerPoint: { lat: number; lng: number };
  defaultZoom: number;
  members: CampMember[];
  annotations: SharedAnnotation[];
  photos: CampPhoto[];
  activityFeed: ActivityFeedItem[];
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
