/**
 * Camp Intelligence Types — AI Learns Your Deer Camp
 *
 * Defines the structure for aggregated camp data points and AI-generated insights
 * that improve as more hunting data is collected (50+ data points to unlock).
 */

/**
 * A single aggregated data point from a deer camp
 * Represents any measurable hunting activity or observation
 */
export interface CampDataPoint {
  type: 'waypoint' | 'route' | 'area' | 'track' | 'photo' | 'harvest' | 'weather_log' | 'sighting';
  timestamp: string; // ISO 8601 string
  location?: {
    latitude: number;
    longitude: number;
  };
  memberName?: string;
  metadata: Record<string, any>; // species, weapon, antler points, weight, weather, etc.
}

/**
 * Identifies the tier of intelligence unlocked for a camp
 * Tiers unlock as data points accumulate
 */
export type IntelligenceTier = 'locked' | 'basic' | 'intermediate' | 'advanced' | 'expert';

/**
 * Pre-computed local insights (no AI required)
 * These are always available once unlocked
 */
export interface LocalInsights {
  topHarvestLocations: Array<{
    name: string;
    lat: number;
    lon: number;
    count: number;
  }>;
  bestTimeOfDay: {
    morning: number; // % of sightings/harvests (5am-10am)
    midday: number;  // % (10am-2pm)
    evening: number; // % (2pm-7pm)
  };
  speciesBreakdown: Record<string, number>;
  weaponSuccess: Record<string, { attempts: number; harvests: number }>;
  seasonalPatterns: Array<{
    month: string;
    activityLevel: number; // 0-100%
  }>;
  memberContributions: Array<{
    name: string;
    dataPoints: number;
  }>;
  hotspotClusters: Array<{
    center: { lat: number; lon: number };
    radius: number; // meters
    density: number; // points per square km
  }>;
  averageHarvestWeight?: number;
  averageAntlerPoints?: number;
  mostProductiveStand?: {
    name: string;
    harvests: number;
  };
}

/**
 * AI-generated insights from backend analysis
 * Requires 50+ data points and API call to backend
 */
export interface AIInsights {
  summary: string; // e.g., "Based on 127 data points from 4 members over 2 seasons..."
  recommendations: string[]; // Actionable hunting tips specific to this camp
  patterns: string[]; // Observed patterns in the data
  predictedBestDays: string[]; // e.g., "Nov 12-14 looks excellent based on history + solunar + rut"
  strategySuggestion: string; // Overall camp strategy recommendation
  lastAnalyzed: string; // ISO timestamp
}

/**
 * Complete intelligence package for a camp
 * Combines tier, local insights, and AI insights
 */
export interface CampIntelligence {
  campId: string;
  dataPointCount: number;
  isUnlocked: boolean; // true when >= 50 data points
  tier: IntelligenceTier;
  // Tier breakdown:
  // locked: 0-49 points
  // basic: 50-99 points (harvest locations, time patterns, species breakdown)
  // intermediate: 100-199 points (seasonal patterns, weapon effectiveness, member stats)
  // advanced: 200-499 points (hotspot clustering, AI recommendations, predicted best days)
  // expert: 500+ points (full predictive analytics, multi-season trends)

  localInsights: LocalInsights;
  aiInsights?: AIInsights;

  progressToNextTier: number; // 0-100%
  nextTierAt: number; // data points needed for next tier
  nextTierBenefits: string[]; // what unlocks at next tier
}

/**
 * Tier definition metadata
 */
export interface TierDefinition {
  min: number;
  max: number;
  label: string;
  benefits: string[];
}

export const TIER_DEFINITIONS: Record<IntelligenceTier, TierDefinition> = {
  locked: {
    min: 0,
    max: 49,
    label: 'Locked',
    benefits: ['Add 50 data points to unlock AI insights'],
  },
  basic: {
    min: 50,
    max: 99,
    label: 'Basic Intelligence',
    benefits: ['Harvest location analysis', 'Time-of-day patterns', 'Species breakdown'],
  },
  intermediate: {
    min: 100,
    max: 199,
    label: 'Intermediate',
    benefits: [
      'Seasonal pattern analysis',
      'Weapon effectiveness stats',
      'Member contribution tracking',
    ],
  },
  advanced: {
    min: 200,
    max: 499,
    label: 'Advanced',
    benefits: [
      'Hotspot clustering analysis',
      'AI strategy recommendations',
      'Predicted best hunting days',
    ],
  },
  expert: {
    min: 500,
    max: Infinity,
    label: 'Expert',
    benefits: [
      'Full predictive analytics',
      'Multi-season trend analysis',
      'Custom AI hunting plans',
    ],
  },
};
