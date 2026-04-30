/**
 * @file StandScoreService.ts
 * @description Client-side stand-score prediction service.
 * Wraps native CoreML predictions via React Native NativeModules,
 * with fallback to backend `/ai/stand-score` endpoint when offline or model unavailable.
 *
 * @module services/StandScoreService
 * @version 1.0.0
 *
 * Key features:
 * - Async prediction via native CoreML (on-device, <20ms)
 * - Graceful fallback to backend inference
 * - Confidence levels and error handling
 * - Disclaimer enforcement ("Experimental: trained on limited historical data...")
 */

import { NativeModules, Platform } from 'react-native';
import { API_BASE_URL } from './api';

// ────────────────────────────────────────────────────────────────────────────
// Types
// ────────────────────────────────────────────────────────────────────────────

export interface StandScoreFeatures {
  day_of_season: number;        // 0-365
  season_week: number;          // 0-13
  moon_phase: number;           // 0-1
  illumination: number;         // 0-1
  rut_stage_peak: number;       // 0 or 1
  rut_stage_pre: number;        // 0 or 1
  temp_min: number;             // °F
  temp_max: number;             // °F
  pressure_trend: number;       // mb (24h change)
  wind_speed: number;           // mph
  precip_prob: number;          // 0-1
  cold_front: number;           // 0 or 1
}

export interface StandScorePrediction {
  score: number | null;
  confidence: 'high' | 'medium' | 'low' | 'unavailable';
  reason?: string;
  version?: string;
  timestamp?: string;
}

export interface StandScoreRating {
  score: number | null;
  label: 'Excellent' | 'Good' | 'Fair' | 'Poor' | 'Unavailable';
  color: string;
  confidence: StandScorePrediction['confidence'];
}

// ────────────────────────────────────────────────────────────────────────────
// Constants
// ────────────────────────────────────────────────────────────────────────────

const DISCLAIMER = 'Experimental: trained on limited historical data. Use as a guide, not a guarantee.';

const SCORE_THRESHOLDS = {
  excellent: 80,
  good: 65,
  fair: 45,
  poor: 0,
};

const SCORE_COLORS = {
  excellent: '#7FC97F',  // Green (matches existing solunar palette)
  good: '#BBD38B',       // Light green
  fair: '#E8AA00',       // Amber
  poor: '#E56A1A',       // Red
  unavailable: '#999999', // Gray
};

// ────────────────────────────────────────────────────────────────────────────
// Service Implementation
// ────────────────────────────────────────────────────────────────────────────

/**
 * Get the native stand-score predictor module.
 * Returns null if not available (e.g., Android, or CoreML model not bundled).
 */
function getNativePredictor(): any {
  if (Platform.OS === 'ios') {
    return NativeModules.StandScorePredictor || null;
  }
  // Android not yet implemented
  return null;
}

/**
 * Predict stand score using native CoreML (iOS) or backend fallback.
 * Tries native prediction first; falls back to backend if unavailable.
 *
 * @param features 12 numeric features from weather, solunar, season, etc.
 * @returns Prediction with score (or null) and confidence level
 */
export async function predictStandScore(features: StandScoreFeatures): Promise<StandScorePrediction> {
  // Validate input
  if (!validateFeatures(features)) {
    return {
      score: null,
      confidence: 'unavailable',
      reason: 'invalid_features',
    };
  }

  // Try native iOS prediction first
  if (Platform.OS === 'ios') {
    const native = getNativePredictor();
    if (native && native.predictStandScore) {
      try {
        const result = await native.predictStandScore(features);
        if (result && result.score !== null && result.score !== undefined) {
          return result;
        }
      } catch (err) {
        console.warn('Native stand-score prediction failed:', err);
        // Fall through to backend
      }
    }
  }

  // Fallback: backend prediction
  return predictStandScoreBackend(features);
}

/**
 * Backend fallback: POST to `/ai/stand-score` endpoint.
 * Used when CoreML model is unavailable or on non-iOS platforms.
 */
async function predictStandScoreBackend(features: StandScoreFeatures): Promise<StandScorePrediction> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/v1/planner/ai/stand-score`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(features),
    });

    if (response.ok) {
      const data = await response.json();
      return {
        score: data.score || null,
        confidence: data.confidence || 'unavailable',
        version: data.version,
        timestamp: data.timestamp,
      };
    }
  } catch (err) {
    console.warn('Backend stand-score prediction failed:', err);
  }

  // All fallbacks exhausted
  return {
    score: null,
    confidence: 'unavailable',
    reason: 'backend_unavailable',
  };
}

/**
 * Map stand score to a human-readable rating with color.
 *
 * @param prediction Result from predictStandScore()
 * @returns Rating with label and color
 */
export function scoreToRating(prediction: StandScorePrediction): StandScoreRating {
  if (prediction.score === null || prediction.score === undefined) {
    return {
      score: null,
      label: 'Unavailable',
      color: SCORE_COLORS.unavailable,
      confidence: 'unavailable',
    };
  }

  let label: 'Excellent' | 'Good' | 'Fair' | 'Poor';
  let color: string;

  if (prediction.score >= SCORE_THRESHOLDS.excellent) {
    label = 'Excellent';
    color = SCORE_COLORS.excellent;
  } else if (prediction.score >= SCORE_THRESHOLDS.good) {
    label = 'Good';
    color = SCORE_COLORS.good;
  } else if (prediction.score >= SCORE_THRESHOLDS.fair) {
    label = 'Fair';
    color = SCORE_COLORS.fair;
  } else {
    label = 'Poor';
    color = SCORE_COLORS.poor;
  }

  return {
    score: Math.round(prediction.score),
    label,
    color,
    confidence: prediction.confidence,
  };
}

/**
 * Predict for next 7 days and return top 3 windows.
 * (Placeholder for Phase 5D.4+)
 */
export async function getTopStandScoreDays(
  baseDate: Date,
  county: string,
  weapon: 'archery' | 'firearms' | 'muzzleloader',
  weatherData: any[], // From WeatherService.getForecast()
  solunarData: any,   // From SolunarService.getWeeklySolunar()
): Promise<Array<{ date: string; score: number; label: string; color: string }>> {
  // For v1, return empty; implement in Phase 5D.4
  return [];
}

/**
 * Get the disclaimer text for UI display.
 */
export function getDisclaimerText(): string {
  return DISCLAIMER;
}

/**
 * Validate all required features are present and numeric.
 */
function validateFeatures(features: StandScoreFeatures): boolean {
  const required = [
    'day_of_season',
    'season_week',
    'moon_phase',
    'illumination',
    'rut_stage_peak',
    'rut_stage_pre',
    'temp_min',
    'temp_max',
    'pressure_trend',
    'wind_speed',
    'precip_prob',
    'cold_front',
  ];

  for (const key of required) {
    const value = (features as any)[key];
    if (typeof value !== 'number' || isNaN(value)) {
      console.warn(`Invalid stand-score feature: ${key}=${value}`);
      return false;
    }
  }

  return true;
}
