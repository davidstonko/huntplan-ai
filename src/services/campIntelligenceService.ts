/**
 * Camp Intelligence Service — AI Learns Your Deer Camp
 *
 * Aggregates hunting data from deer camps and generates AI-powered insights
 * that improve as more data is collected (50+ data points to unlock).
 *
 * Features:
 * - Data point aggregation from annotations, tracks, photos, activity feed
 * - Haversine-based hotspot clustering (200m radius)
 * - Local insights computation (no API calls required)
 * - AI insights caching to prevent redundant backend calls
 * - Tier progression tracking (locked → basic → intermediate → advanced → expert)
 *
 * Architecture:
 * 1. Aggregate all camp data into standardized CampDataPoint array
 * 2. Compute local insights (time patterns, location clustering, species breakdown)
 * 3. Cache local results immediately
 * 4. Optionally request AI analysis from backend (non-blocking)
 * 5. Update cache with AI insights as they arrive
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import Config from '../config';
import { DeerCamp } from '../types/deercamp';
import {
  CampDataPoint,
  CampIntelligence,
  LocalInsights,
  AIInsights,
  IntelligenceTier,
  TIER_DEFINITIONS,
} from '../types/intelligence';

// ── Constants ──

const MIN_UNLOCK_POINTS = 50;
const INTELLIGENCE_CACHE_PREFIX = '@camp_intelligence_';
const AI_INSIGHTS_CACHE_PREFIX = '@camp_ai_insights_';

/**
 * Time-of-day buckets for analyzing hunting activity patterns
 */
const TIME_BUCKETS = {
  morning: { start: 5, end: 10 }, // 5am-10am
  midday: { start: 10, end: 14 }, // 10am-2pm
  evening: { start: 14, end: 19 }, // 2pm-7pm
};

/**
 * Haversine distance formula — calculates distance between two lat/lon points
 * Returns distance in meters
 */
function haversineDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371000; // Earth's radius in meters
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Extract time of day (hour) from ISO timestamp
 */
function getHourFromTimestamp(timestamp: string): number {
  const date = new Date(timestamp);
  return date.getHours();
}

/**
 * Determine which time bucket an hour falls into
 */
function getTimeBucket(hour: number): 'morning' | 'midday' | 'evening' | null {
  if (hour >= TIME_BUCKETS.morning.start && hour < TIME_BUCKETS.morning.end)
    return 'morning';
  if (hour >= TIME_BUCKETS.midday.start && hour < TIME_BUCKETS.midday.end)
    return 'midday';
  if (hour >= TIME_BUCKETS.evening.start && hour < TIME_BUCKETS.evening.end)
    return 'evening';
  return null;
}

/**
 * Get month name from ISO timestamp
 */
function getMonthFromTimestamp(timestamp: string): string {
  const date = new Date(timestamp);
  const months = [
    'Jan',
    'Feb',
    'Mar',
    'Apr',
    'May',
    'Jun',
    'Jul',
    'Aug',
    'Sep',
    'Oct',
    'Nov',
    'Dec',
  ];
  return months[date.getMonth()];
}

// ── Core Functions ──

/**
 * Aggregate all data from a deer camp into standardized CampDataPoint array
 * Collects: annotations (waypoints, routes, areas), tracks, photos, activity feed
 * Each item = 1 data point. Returns flat array sorted by timestamp.
 */
export function aggregateCampData(camp: DeerCamp): CampDataPoint[] {
  const dataPoints: CampDataPoint[] = [];

  // Count annotations (waypoints, routes, areas, tracks as annotations)
  camp.annotations.forEach((annotation) => {
    const metadata: Record<string, any> = {
      annotationType: annotation.type,
      createdBy: annotation.createdBy,
    };

    // Extract specific metadata based on annotation type
    if (annotation.data) {
      if ('icon' in annotation.data) {
        // Waypoint
        const wp = annotation.data as any;
        metadata.icon = wp.icon;
        metadata.label = wp.label;
      } else if ('polygon' in annotation.data) {
        // Area
        const area = annotation.data as any;
        metadata.areaAcres = area.areaAcres;
      } else if ('points' in annotation.data && 'durationSeconds' in annotation.data) {
        // Track (has durationSeconds)
        const track = annotation.data as any;
        metadata.distanceMeters = track.distanceMeters;
        metadata.durationSeconds = track.durationSeconds;
      } else if ('points' in annotation.data) {
        // Route (has points but no durationSeconds)
        const route = annotation.data as any;
        metadata.distanceMeters = route.distanceMeters;
      }
    }

    let location: { latitude: number; longitude: number } | undefined;
    if ('lat' in annotation.data && 'lng' in annotation.data) {
      const data = annotation.data as any;
      location = { latitude: data.lat, longitude: data.lng };
    } else if ('lat' in annotation.data && 'lon' in annotation.data) {
      const data = annotation.data as any;
      location = { latitude: data.lat, longitude: data.lon };
    }

    dataPoints.push({
      type: annotation.type as any,
      timestamp: annotation.createdAt,
      location,
      memberName: annotation.createdBy,
      metadata,
    });
  });

  // Count photos
  camp.photos.forEach((photo) => {
    dataPoints.push({
      type: 'photo',
      timestamp: photo.uploadedAt,
      location: { latitude: photo.lat, longitude: photo.lng },
      memberName: photo.uploadedBy,
      metadata: {
        caption: photo.caption,
      },
    });
  });

  // Count activity feed items as implicit data points
  // (activity feed represents engagement)
  camp.activityFeed.forEach((item) => {
    dataPoints.push({
      type: 'sighting', // Generic "activity" type
      timestamp: item.timestamp,
      memberName: item.username,
      metadata: {
        action: item.action,
      },
    });
  });

  // Sort by timestamp (oldest first)
  dataPoints.sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  );

  return dataPoints;
}

/**
 * Compute local insights from aggregated data points
 * Pure computation — no API calls. Analyzes patterns in the local data.
 */
export function computeLocalInsights(dataPoints: CampDataPoint[]): LocalInsights {
  const insights: LocalInsights = {
    topHarvestLocations: [],
    bestTimeOfDay: { morning: 0, midday: 0, evening: 0 },
    speciesBreakdown: {},
    weaponSuccess: {},
    seasonalPatterns: [],
    memberContributions: [],
    hotspotClusters: [],
  };

  if (dataPoints.length === 0) {
    return insights;
  }

  // ── Analyze time-of-day patterns ──
  const timeOfDayCount = { morning: 0, midday: 0, evening: 0 };
  let harvestCount = 0;

  dataPoints.forEach((point) => {
    if (point.type === 'harvest' || point.type === 'waypoint' || point.type === 'photo') {
      const hour = getHourFromTimestamp(point.timestamp);
      const bucket = getTimeBucket(hour);
      if (bucket) {
        timeOfDayCount[bucket]++;
        harvestCount++;
      }
    }
  });

  if (harvestCount > 0) {
    insights.bestTimeOfDay.morning = Math.round((timeOfDayCount.morning / harvestCount) * 100);
    insights.bestTimeOfDay.midday = Math.round((timeOfDayCount.midday / harvestCount) * 100);
    insights.bestTimeOfDay.evening = Math.round((timeOfDayCount.evening / harvestCount) * 100);
  }

  // ── Species breakdown ──
  dataPoints.forEach((point) => {
    if (point.metadata.species) {
      const species = point.metadata.species as string;
      insights.speciesBreakdown[species] = (insights.speciesBreakdown[species] || 0) + 1;
    }
  });

  // ── Weapon success rates ──
  dataPoints.forEach((point) => {
    if (point.metadata.weapon) {
      const weapon = point.metadata.weapon as string;
      if (!insights.weaponSuccess[weapon]) {
        insights.weaponSuccess[weapon] = { attempts: 0, harvests: 0 };
      }
      insights.weaponSuccess[weapon].attempts++;

      if (point.type === 'harvest') {
        insights.weaponSuccess[weapon].harvests++;
      }
    }
  });

  // ── Seasonal patterns (activity per month) ──
  const monthlyActivity: Record<string, number> = {};
  const monthOrder = [
    'Jan',
    'Feb',
    'Mar',
    'Apr',
    'May',
    'Jun',
    'Jul',
    'Aug',
    'Sep',
    'Oct',
    'Nov',
    'Dec',
  ];

  dataPoints.forEach((point) => {
    const month = getMonthFromTimestamp(point.timestamp);
    monthlyActivity[month] = (monthlyActivity[month] || 0) + 1;
  });

  const maxActivity = Math.max(...Object.values(monthlyActivity), 1);
  monthOrder.forEach((month) => {
    const count = monthlyActivity[month] || 0;
    insights.seasonalPatterns.push({
      month,
      activityLevel: Math.round((count / maxActivity) * 100),
    });
  });

  // ── Member contributions ──
  const memberCounts: Record<string, number> = {};
  dataPoints.forEach((point) => {
    if (point.memberName) {
      memberCounts[point.memberName] = (memberCounts[point.memberName] || 0) + 1;
    }
  });

  Object.entries(memberCounts)
    .sort(([, a], [, b]) => b - a)
    .forEach(([name, count]) => {
      insights.memberContributions.push({ name, dataPoints: count });
    });

  // ── Hotspot clustering (haversine-based, 200m radius) ──
  const pointsWithLocation = dataPoints.filter((p) => p.location);
  const usedIndices = new Set<number>();
  const clusterRadius = 200; // meters

  for (let i = 0; i < pointsWithLocation.length; i++) {
    if (usedIndices.has(i)) continue;

    const seed = pointsWithLocation[i];
    const cluster = [i];

    // Find all points within clusterRadius of seed
    for (let j = i + 1; j < pointsWithLocation.length; j++) {
      if (usedIndices.has(j)) continue;

      const other = pointsWithLocation[j];
      if (
        seed.location &&
        other.location &&
        haversineDistance(
          seed.location.latitude,
          seed.location.longitude,
          other.location.latitude,
          other.location.longitude
        ) <= clusterRadius
      ) {
        cluster.push(j);
      }
    }

    if (cluster.length >= 1) {
      // Calculate cluster center (average of all points)
      let sumLat = 0,
        sumLon = 0;
      cluster.forEach((idx) => {
        const p = pointsWithLocation[idx];
        if (p.location) {
          sumLat += p.location.latitude;
          sumLon += p.location.longitude;
        }
      });

      const centerLat = sumLat / cluster.length;
      const centerLon = sumLon / cluster.length;

      // Calculate area of cluster in km²
      // Simple approximation: radius 200m = 0.2km, area = π * 0.2² ≈ 0.126 km²
      const clusterAreaKm2 = Math.PI * Math.pow(clusterRadius / 1000, 2);
      const density = cluster.length / clusterAreaKm2;

      insights.hotspotClusters.push({
        center: { lat: centerLat, lon: centerLon },
        radius: clusterRadius,
        density,
      });

      cluster.forEach((idx) => usedIndices.add(idx));
    }
  }

  // ── Harvest statistics (weight, antler points) ──
  const harvests = dataPoints.filter((p) => p.type === 'harvest');
  if (harvests.length > 0) {
    const weights = harvests
      .filter((h) => h.metadata.weight)
      .map((h) => h.metadata.weight as number);
    if (weights.length > 0) {
      insights.averageHarvestWeight =
        weights.reduce((a, b) => a + b, 0) / weights.length;
    }

    const antlerPoints = harvests
      .filter((h) => h.metadata.antlerPoints)
      .map((h) => h.metadata.antlerPoints as number);
    if (antlerPoints.length > 0) {
      insights.averageAntlerPoints =
        antlerPoints.reduce((a, b) => a + b, 0) / antlerPoints.length;
    }
  }

  // ── Top harvest locations ──
  const locationMap: Record<string, { lat: number; lon: number; count: number }> = {};
  dataPoints.forEach((point) => {
    if (point.type === 'harvest' && point.location) {
      const key = `${point.location.latitude.toFixed(4)},${point.location.longitude.toFixed(4)}`;
      if (!locationMap[key]) {
        locationMap[key] = {
          lat: point.location.latitude,
          lon: point.location.longitude,
          count: 0,
        };
      }
      locationMap[key].count++;
    }
  });

  insights.topHarvestLocations = Object.values(locationMap)
    .sort((a, b) => b.count - a.count)
    .slice(0, 10)
    .map((loc, idx) => ({
      name: `Hotspot ${idx + 1}`,
      lat: loc.lat,
      lon: loc.lon,
      count: loc.count,
    }));

  // ── Most productive stand ──
  if (insights.topHarvestLocations.length > 0) {
    insights.mostProductiveStand = {
      name: insights.topHarvestLocations[0].name,
      harvests: insights.topHarvestLocations[0].count,
    };
  }

  return insights;
}

/**
 * Get tier based on data point count
 */
export function getTier(count: number): IntelligenceTier {
  if (count < 50) return 'locked';
  if (count < 100) return 'basic';
  if (count < 200) return 'intermediate';
  if (count < 500) return 'advanced';
  return 'expert';
}

/**
 * Calculate progress to next tier
 * Returns tuple: [progress percentage (0-100), points needed for next tier]
 */
export function getTierProgress(count: number): [number, number] {
  const tier = getTier(count);
  const tierDef = TIER_DEFINITIONS[tier];
  const nextTierDef = TIER_DEFINITIONS[
    tier === 'expert'
      ? 'expert'
      : (['basic', 'intermediate', 'advanced', 'expert'] as const)[
          Object.keys(TIER_DEFINITIONS).indexOf(tier) + 1
        ]
  ];

  const progressInTier = count - tierDef.min;
  const tierSize = tierDef.max - tierDef.min;
  const percentage = Math.round((progressInTier / tierSize) * 100);

  return [Math.max(0, Math.min(100, percentage)), nextTierDef.min];
}

/**
 * Request AI analysis from backend
 * Sends data summary (NOT raw data) to API endpoint
 * POST /api/v1/deercamp/{campId}/intelligence
 * Returns AI-generated insights or throws error
 */
export async function requestAIAnalysis(
  campId: string,
  dataPoints: CampDataPoint[],
  camp?: DeerCamp
): Promise<AIInsights> {
  const localInsights = computeLocalInsights(dataPoints);

  // Prepare data summary for backend (NOT raw data)
  const summary = {
    dataPointCount: dataPoints.length,
    speciesBreakdown: localInsights.speciesBreakdown,
    topLocations: localInsights.topHarvestLocations.slice(0, 5),
    timePatterns: localInsights.bestTimeOfDay,
    seasonalData: localInsights.seasonalPatterns,
    memberCount: camp?.members.length || 1,
    weaponSuccess: localInsights.weaponSuccess,
    averageHarvestWeight: localInsights.averageHarvestWeight,
    averageAntlerPoints: localInsights.averageAntlerPoints,
  };

  try {
    // Call backend API for AI analysis
    const client = axios.create({
      baseURL: Config.API_BASE_URL,
      timeout: 15000,
      headers: { 'Content-Type': 'application/json' },
    });

    const response = await client.post(
      `/api/v1/deercamp/${campId}/intelligence`,
      summary
    );

    if (response.status === 200 && response.data) {
      return {
        summary: response.data.summary || 'Analysis complete.',
        recommendations: response.data.recommendations || [],
        patterns: response.data.patterns || [],
        predictedBestDays: response.data.predicted_best_days || [],
        strategySuggestion: response.data.strategy_suggestion || '',
        lastAnalyzed: new Date().toISOString(),
      };
    }

    throw new Error('Invalid API response');
  } catch (error) {
    if (__DEV__) console.warn('[CampIntelligence] AI analysis request failed:', error);
    throw error;
  }
}

/**
 * Get cached AI insights for a camp
 * Returns null if not cached or cache is stale
 */
async function getCachedAIInsights(
  campId: string,
  dataPointCount: number
): Promise<AIInsights | null> {
  try {
    const cached = await AsyncStorage.getItem(`${AI_INSIGHTS_CACHE_PREFIX}${campId}`);
    if (!cached) return null;

    const parsed = JSON.parse(cached);

    // Only use cache if data point count hasn't changed
    // (new data may change analysis)
    if (parsed.dataPointCount === dataPointCount) {
      return parsed.insights;
    }

    return null;
  } catch (error) {
    if (__DEV__) console.warn('[CampIntelligence] Failed to retrieve cached AI insights:', error);
    return null;
  }
}

/**
 * Cache AI insights for a camp
 */
async function cacheAIInsights(
  campId: string,
  dataPointCount: number,
  insights: AIInsights
): Promise<void> {
  try {
    await AsyncStorage.setItem(
      `${AI_INSIGHTS_CACHE_PREFIX}${campId}`,
      JSON.stringify({ dataPointCount, insights })
    );
  } catch (error) {
    if (__DEV__) console.warn('[CampIntelligence] Failed to cache AI insights:', error);
  }
}

/**
 * Main entry point — Get complete camp intelligence
 * Shows local insights immediately, then loads AI insights async if available
 */
export async function getCampIntelligence(camp: DeerCamp): Promise<CampIntelligence> {
  const dataPoints = aggregateCampData(camp);
  const dataPointCount = dataPoints.length;
  const tier = getTier(dataPointCount);
  const isUnlocked = dataPointCount >= MIN_UNLOCK_POINTS;
  const [progress, nextTierAt] = getTierProgress(dataPointCount);

  const localInsights = computeLocalInsights(dataPoints);

  const intelligence: CampIntelligence = {
    campId: camp.id,
    dataPointCount,
    isUnlocked,
    tier,
    localInsights,
    progressToNextTier: progress,
    nextTierAt,
    nextTierBenefits: TIER_DEFINITIONS[tier].benefits,
  };

  // Try to load cached AI insights if unlocked
  if (isUnlocked) {
    const cachedAI = await getCachedAIInsights(camp.id, dataPointCount);
    if (cachedAI) {
      intelligence.aiInsights = cachedAI;
    }

    // Request fresh AI analysis in background (non-blocking)
    // Don't await — let it populate the cache for next time
    requestAIAnalysis(camp.id, dataPoints, camp)
      .then((aiInsights) => {
        cacheAIInsights(camp.id, dataPointCount, aiInsights).catch((e) => {
          if (__DEV__) console.warn('[CampIntelligence] Failed to cache new AI insights:', e);
        });
      })
      .catch((error) => {
        if (__DEV__) console.warn('[CampIntelligence] Background AI analysis failed:', error);
        // Silently fail — local insights are still available
      });
  }

  return intelligence;
}

/**
 * Quick count of data points without full analysis
 * Useful for checking if camp is near unlock threshold
 */
export function getDataPointCount(camp: DeerCamp): number {
  let count = 0;

  count += camp.annotations.length;
  count += camp.photos.length;
  count += camp.activityFeed.length;

  return count;
}

/**
 * Clear cached intelligence data (useful for testing)
 */
export async function clearIntelligenceCache(campId?: string): Promise<void> {
  try {
    if (campId) {
      // Clear specific camp caches
      await AsyncStorage.multiRemove([
        `${INTELLIGENCE_CACHE_PREFIX}${campId}`,
        `${AI_INSIGHTS_CACHE_PREFIX}${campId}`,
      ]);
    } else {
      // Clear all intelligence caches
      const keys = await AsyncStorage.getAllKeys();
      const cacheKeys = keys.filter(
        (k) => k.startsWith(INTELLIGENCE_CACHE_PREFIX) || k.startsWith(AI_INSIGHTS_CACHE_PREFIX)
      );
      await AsyncStorage.multiRemove(cacheKeys);
    }

    if (__DEV__) console.log('[CampIntelligence] Cache cleared');
  } catch (error) {
    if (__DEV__) console.warn('[CampIntelligence] Failed to clear cache:', error);
  }
}
