/**
 * @file campDataConnector.ts
 * @description Cross-references data across the app to find relevant data for a camp.
 * Aggregates harvests, sightings, scout plans, tracks, and other data points.
 * Used by "AI Learns Your Deer Camp" feature.
 *
 * @module Services
 * @version 1.0.0
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { DeerCamp, SharedAnnotation } from '../types/deercamp';
import { HuntPlan, RecordedTrack } from '../types/scout';

// ─── Types ──────────────────────────────────────────────────────

export interface HarvestEntry {
  id: string;
  species: string;
  harvest_date: string;
  harvest_time?: string;
  weapon: string;
  county?: string;
  land_name?: string;
  antler_points?: number;
  estimated_weight_lbs?: number;
  notes?: string;
  season_year: string;
}

export interface HistoricalHarvest {
  id: string;
  species: string;
  year: number;
  season: string;
  weapon: string;
  location: string;
  antlerPoints?: number;
  weight?: number;
  timeOfDay: string;
  notes?: string;
  addedAt: string;
}

export interface CampSighting {
  id: string;
  species: string;
  count: number;
  activity: string;
  directionOfTravel: string;
  distanceYards: number;
  timeLogged: string;
  location?: string;
  gpsLat?: number;
  gpsLng?: number;
  notes?: string;
  addedAt: string;
}

export type CampDataPointType =
  | 'waypoint'
  | 'route'
  | 'area'
  | 'track'
  | 'photo'
  | 'harvest'
  | 'historical_harvest'
  | 'sighting'
  | 'weather_log';

export interface CampDataPoint {
  type: CampDataPointType;
  timestamp: string;
  location?: { latitude: number; longitude: number };
  memberName?: string;
  metadata: Record<string, any>;
}

// ─── Utilities ──────────────────────────────────────────────────

/**
 * Haversine formula to calculate distance between two lat/lng points.
 * Returns distance in kilometers.
 */
export function calculateDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 6371; // Earth's radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
    Math.cos((lat2 * Math.PI) / 180) *
    Math.sin(dLng / 2) *
    Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Parse a harvest date string and return a Date object.
 */
function parseHarvestDate(dateStr: string): Date {
  // Assuming format: YYYY-MM-DD
  const date = new Date(dateStr + 'T00:00:00');
  return isNaN(date.getTime()) ? new Date() : date;
}

// ─── Core Functions ─────────────────────────────────────────────

/**
 * Find harvests from HarvestLog that match camp location/area.
 * Matches by land name overlap or GPS proximity (within 5km of camp center).
 */
export async function findRelatedHarvests(
  camp: DeerCamp,
  allHarvests: HarvestEntry[]
): Promise<HarvestEntry[]> {
  const related: HarvestEntry[] = [];

  for (const harvest of allHarvests) {
    let matches = false;

    // Match by land name if both have land names
    if (camp.linkedLandId && harvest.land_name) {
      if (harvest.land_name.toLowerCase().includes(camp.name.toLowerCase()) ||
        camp.name.toLowerCase().includes(harvest.land_name.toLowerCase())) {
        matches = true;
      }
    }

    if (matches) {
      related.push(harvest);
    }
  }

  return related;
}

/**
 * Find scout plans/tracks that overlap with camp area.
 * Matches by GPS proximity (within 5km of camp center).
 */
export function findRelatedScoutData(
  camp: DeerCamp,
  plans: HuntPlan[],
  tracks: RecordedTrack[]
): { plans: HuntPlan[]; tracks: RecordedTrack[] } {
  const PROXIMITY_KM = 5;
  const related = {
    plans: [] as HuntPlan[],
    tracks: [] as RecordedTrack[],
  };

  // Check plans for waypoints/routes/areas near camp
  for (const plan of plans) {
    let planMatches = false;

    // Check waypoints
    for (const wp of plan.waypoints) {
      const dist = calculateDistance(
        camp.centerPoint.lat,
        camp.centerPoint.lng,
        wp.lat,
        wp.lng
      );
      if (dist <= PROXIMITY_KM) {
        planMatches = true;
        break;
      }
    }

    // Check routes
    if (!planMatches) {
      for (const route of plan.routes) {
        for (const [lng, lat] of route.points) {
          const dist = calculateDistance(
            camp.centerPoint.lat,
            camp.centerPoint.lng,
            lat,
            lng
          );
          if (dist <= PROXIMITY_KM) {
            planMatches = true;
            break;
          }
        }
        if (planMatches) break;
      }
    }

    // Check areas
    if (!planMatches) {
      for (const area of plan.areas) {
        for (const [lng, lat] of area.polygon) {
          const dist = calculateDistance(
            camp.centerPoint.lat,
            camp.centerPoint.lng,
            lat,
            lng
          );
          if (dist <= PROXIMITY_KM) {
            planMatches = true;
            break;
          }
        }
        if (planMatches) break;
      }
    }

    if (planMatches) {
      related.plans.push(plan);
    }
  }

  // Check tracks for proximity
  for (const track of tracks) {
    let trackMatches = false;
    for (const point of track.points) {
      const dist = calculateDistance(
        camp.centerPoint.lat,
        camp.centerPoint.lng,
        point.lat,
        point.lng
      );
      if (dist <= PROXIMITY_KM) {
        trackMatches = true;
        break;
      }
    }
    if (trackMatches) {
      related.tracks.push(track);
    }
  }

  return related;
}

/**
 * Get all data points for a camp from all sources.
 * Aggregates annotations, photos, harvests, sightings, and historical data.
 */
export async function getAllCampDataPoints(
  campId: string,
  camp: DeerCamp
): Promise<CampDataPoint[]> {
  const points: CampDataPoint[] = [];

  // 1. Camp annotations (waypoints, routes, areas, tracks, notes)
  for (const annotation of camp.annotations) {
    const point: CampDataPoint = {
      type: annotation.type as any,
      timestamp: annotation.createdAt,
      memberName: annotation.createdBy,
      metadata: {
        annotationId: annotation.id,
        data: annotation.data,
      },
    };

    // Extract location if available
    if (annotation.type === 'waypoint') {
      const wp = annotation.data as any;
      if (wp.lat && wp.lng) {
        point.location = { latitude: wp.lat, longitude: wp.lng };
      }
    } else if (annotation.type === 'track') {
      const track = annotation.data as any;
      if (track.points && track.points.length > 0) {
        const firstPoint = track.points[0];
        point.location = { latitude: firstPoint.lat, longitude: firstPoint.lng };
      }
    }

    points.push(point);
  }

  // 2. Camp photos
  for (const photo of camp.photos) {
    points.push({
      type: 'photo',
      timestamp: photo.uploadedAt,
      memberName: photo.uploadedBy,
      location: {
        latitude: photo.lat,
        longitude: photo.lng,
      },
      metadata: {
        photoId: photo.id,
        imageUri: photo.imageUri,
        caption: photo.caption,
      },
    });
  }

  // 3. Historical harvests from AsyncStorage
  try {
    const harvestKey = `@camp_harvests_${campId}`;
    const harvestJson = await AsyncStorage.getItem(harvestKey);
    if (harvestJson) {
      const harvests: HistoricalHarvest[] = JSON.parse(harvestJson);
      for (const harvest of harvests) {
        points.push({
          type: 'historical_harvest',
          timestamp: harvest.addedAt,
          metadata: {
            harvestId: harvest.id,
            species: harvest.species,
            year: harvest.year,
            season: harvest.season,
            weapon: harvest.weapon,
            location: harvest.location,
            antlerPoints: harvest.antlerPoints,
            weight: harvest.weight,
            timeOfDay: harvest.timeOfDay,
            notes: harvest.notes,
          },
        });
      }
    }
  } catch (err) {
    if (__DEV__) console.warn('[campDataConnector] Error loading harvests:', err);
  }

  // 4. Sightings from AsyncStorage
  try {
    const sightingKey = `@camp_sightings_${campId}`;
    const sightingJson = await AsyncStorage.getItem(sightingKey);
    if (sightingJson) {
      const sightings: CampSighting[] = JSON.parse(sightingJson);
      for (const sighting of sightings) {
        points.push({
          type: 'sighting',
          timestamp: sighting.addedAt,
          location: sighting.gpsLat && sighting.gpsLng
            ? { latitude: sighting.gpsLat, longitude: sighting.gpsLng }
            : undefined,
          metadata: {
            sightingId: sighting.id,
            species: sighting.species,
            count: sighting.count,
            activity: sighting.activity,
            directionOfTravel: sighting.directionOfTravel,
            distanceYards: sighting.distanceYards,
            timeLogged: sighting.timeLogged,
            location: sighting.location,
            notes: sighting.notes,
          },
        });
      }
    }
  } catch (err) {
    if (__DEV__) console.warn('[campDataConnector] Error loading sightings:', err);
  }

  // Sort by timestamp descending (newest first)
  points.sort((a, b) => {
    const timeA = new Date(a.timestamp).getTime();
    const timeB = new Date(b.timestamp).getTime();
    return timeB - timeA;
  });

  return points;
}

/**
 * Get statistics summary for a camp.
 * Returns counts by data type, species, and time ranges.
 */
export async function getCampDataStatistics(
  campId: string,
  camp: DeerCamp
): Promise<Record<string, any>> {
  const allPoints = await getAllCampDataPoints(campId, camp);

  const stats = {
    totalDataPoints: allPoints.length,
    byType: {} as Record<string, number>,
    bySpecies: {} as Record<string, number>,
    timeRange: {
      oldest: null as string | null,
      newest: null as string | null,
    },
    memberCount: camp.members.length,
    photoCount: camp.photos.length,
    annotationCount: camp.annotations.length,
  };

  // Count by type
  for (const point of allPoints) {
    stats.byType[point.type] = (stats.byType[point.type] || 0) + 1;
  }

  // Count by species
  for (const point of allPoints) {
    const species = point.metadata.species;
    if (species) {
      stats.bySpecies[species] = (stats.bySpecies[species] || 0) + 1;
    }
  }

  // Find time range
  if (allPoints.length > 0) {
    stats.timeRange.newest = allPoints[0].timestamp;
    stats.timeRange.oldest = allPoints[allPoints.length - 1].timestamp;
  }

  return stats;
}

/**
 * Get data points for a specific time range.
 */
export async function getCampDataPointsInRange(
  campId: string,
  camp: DeerCamp,
  startDate: Date,
  endDate: Date
): Promise<CampDataPoint[]> {
  const allPoints = await getAllCampDataPoints(campId, camp);
  const startTime = startDate.getTime();
  const endTime = endDate.getTime();

  return allPoints.filter((point) => {
    const pointTime = new Date(point.timestamp).getTime();
    return pointTime >= startTime && pointTime <= endTime;
  });
}

/**
 * Get data points grouped by date.
 */
export async function getCampDataPointsByDate(
  campId: string,
  camp: DeerCamp
): Promise<Record<string, CampDataPoint[]>> {
  const allPoints = await getAllCampDataPoints(campId, camp);
  const byDate: Record<string, CampDataPoint[]> = {};

  for (const point of allPoints) {
    const date = new Date(point.timestamp);
    const dateKey = date.toISOString().split('T')[0]; // YYYY-MM-DD
    if (!byDate[dateKey]) {
      byDate[dateKey] = [];
    }
    byDate[dateKey].push(point);
  }

  return byDate;
}
