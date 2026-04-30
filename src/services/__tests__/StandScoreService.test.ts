/**
 * @file StandScoreService.test.ts
 * @description Unit tests for stand-score prediction service.
 * Mocks NativeModules and tests both on-device and backend fallback paths.
 */

import { predictStandScore, scoreToRating, getDisclaimerText, StandScoreFeatures } from '../StandScoreService';
import { NativeModules, Platform } from 'react-native';

// Mock NativeModules and Platform
jest.mock('react-native', () => ({
  NativeModules: {
    StandScorePredictor: null,
  },
  Platform: {
    OS: 'ios',
  },
}));

// Mock fetch globally
global.fetch = jest.fn();

const mockFeatures: StandScoreFeatures = {
  day_of_season: 290,
  season_week: 6,
  moon_phase: 0.5,
  illumination: 0.95,
  rut_stage_peak: 1,
  rut_stage_pre: 0,
  temp_min: 35,
  temp_max: 48,
  pressure_trend: -3.0,
  wind_speed: 12.0,
  precip_prob: 0.5,
  cold_front: 1,
};

describe('StandScoreService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    NativeModules.StandScorePredictor = null;
  });

  // ─────────────────────────────────────────────────────────────────────────
  // Integration Tests
  // ─────────────────────────────────────────────────────────────────────────

  it('returns a high-confidence score for valid input when native module available', async () => {
    NativeModules.StandScorePredictor = {
      predictStandScore: jest.fn().mockResolvedValue({
        score: 78.5,
        confidence: 'high',
        version: '1.0.0',
      }),
    };

    const result = await predictStandScore(mockFeatures);

    expect(result.score).toBe(78.5);
    expect(result.confidence).toBe('high');
    expect(NativeModules.StandScorePredictor.predictStandScore).toHaveBeenCalledWith(mockFeatures);
  });

  it('falls back to backend when native module unavailable', async () => {
    NativeModules.StandScorePredictor = null;

    const mockResponse = {
      ok: true,
      json: jest.fn().mockResolvedValue({
        score: 65.2,
        confidence: 'medium',
        version: '1.0.0',
      }),
    };

    (global.fetch as jest.Mock).mockResolvedValueOnce(mockResponse);

    const result = await predictStandScore(mockFeatures);

    expect(result.score).toBe(65.2);
    expect(result.confidence).toBe('medium');
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/v1/planner/ai/stand-score'),
      expect.objectContaining({
        method: 'POST',
        body: expect.stringContaining('day_of_season'),
      })
    );
  });

  it('handles native prediction errors gracefully', async () => {
    NativeModules.StandScorePredictor = {
      predictStandScore: jest.fn().mockRejectedValue(new Error('Model not loaded')),
    };

    const mockResponse = {
      ok: true,
      json: jest.fn().mockResolvedValue({
        score: 45.0,
        confidence: 'low',
      }),
    };

    (global.fetch as jest.Mock).mockResolvedValueOnce(mockResponse);

    const result = await predictStandScore(mockFeatures);

    // Should fall back to backend
    expect(result.score).toBe(45.0);
  });

  it('returns unavailable when both native and backend fail', async () => {
    NativeModules.StandScorePredictor = null;
    (global.fetch as jest.Mock).mockRejectedValue(new Error('Network error'));

    const result = await predictStandScore(mockFeatures);

    expect(result.score).toBeNull();
    expect(result.confidence).toBe('unavailable');
    expect(result.reason).toBe('backend_unavailable');
  });

  // ─────────────────────────────────────────────────────────────────────────
  // Feature Validation Tests
  // ─────────────────────────────────────────────────────────────────────────

  it('rejects features with missing required fields', async () => {
    const incompleteFeatures = { ...mockFeatures };
    delete (incompleteFeatures as any).wind_speed;

    const result = await predictStandScore(incompleteFeatures as StandScoreFeatures);

    expect(result.score).toBeNull();
    expect(result.confidence).toBe('unavailable');
    expect(result.reason).toBe('invalid_features');
  });

  it('rejects features with NaN values', async () => {
    const badFeatures: StandScoreFeatures = {
      ...mockFeatures,
      wind_speed: NaN,
    };

    const result = await predictStandScore(badFeatures);

    expect(result.score).toBeNull();
    expect(result.confidence).toBe('unavailable');
  });

  it('rejects features with non-numeric values', async () => {
    const badFeatures = {
      ...mockFeatures,
      day_of_season: 'not a number',
    } as any;

    const result = await predictStandScore(badFeatures);

    expect(result.score).toBeNull();
    expect(result.confidence).toBe('unavailable');
  });

  // ─────────────────────────────────────────────────────────────────────────
  // Score to Rating Mapping Tests
  // ─────────────────────────────────────────────────────────────────────────

  it('maps high scores to Excellent', () => {
    const prediction = { score: 85, confidence: 'high' as const };
    const rating = scoreToRating(prediction);

    expect(rating.label).toBe('Excellent');
    expect(rating.color).toBe('#7FC97F');
    expect(rating.score).toBe(85);
  });

  it('maps medium scores to Good', () => {
    const prediction = { score: 72, confidence: 'medium' as const };
    const rating = scoreToRating(prediction);

    expect(rating.label).toBe('Good');
    expect(rating.color).toBe('#BBD38B');
  });

  it('maps fair scores to Fair', () => {
    const prediction = { score: 55, confidence: 'medium' as const };
    const rating = scoreToRating(prediction);

    expect(rating.label).toBe('Fair');
    expect(rating.color).toBe('#E8AA00');
  });

  it('maps low scores to Poor', () => {
    const prediction = { score: 20, confidence: 'low' as const };
    const rating = scoreToRating(prediction);

    expect(rating.label).toBe('Poor');
    expect(rating.color).toBe('#E56A1A');
  });

  it('maps null score to Unavailable', () => {
    const prediction = { score: null, confidence: 'unavailable' as const };
    const rating = scoreToRating(prediction);

    expect(rating.label).toBe('Unavailable');
    expect(rating.color).toBe('#999999');
    expect(rating.score).toBeNull();
  });

  it('rounds score to nearest integer', () => {
    const prediction = { score: 75.8, confidence: 'high' as const };
    const rating = scoreToRating(prediction);

    expect(rating.score).toBe(76);
  });

  // ─────────────────────────────────────────────────────────────────────────
  // Disclaimer Tests
  // ─────────────────────────────────────────────────────────────────────────

  it('returns the AI disclaimer text', () => {
    const disclaimer = getDisclaimerText();

    expect(disclaimer).toContain('Experimental');
    expect(disclaimer).toContain('limited historical data');
    expect(disclaimer.length).toBeGreaterThan(20);
  });

  // ─────────────────────────────────────────────────────────────────────────
  // Boundary Value Tests
  // ─────────────────────────────────────────────────────────────────────────

  it('handles score exactly at thresholds', () => {
    expect(scoreToRating({ score: 80, confidence: 'high' }).label).toBe('Excellent');
    expect(scoreToRating({ score: 79, confidence: 'high' }).label).toBe('Good');
    expect(scoreToRating({ score: 65, confidence: 'high' }).label).toBe('Good');
    expect(scoreToRating({ score: 64, confidence: 'medium' }).label).toBe('Fair');
    expect(scoreToRating({ score: 45, confidence: 'medium' }).label).toBe('Fair');
    expect(scoreToRating({ score: 44, confidence: 'low' }).label).toBe('Poor');
  });

  it('handles extreme temperature values', async () => {
    const extremeFeatures: StandScoreFeatures = {
      ...mockFeatures,
      temp_min: -20,
      temp_max: 110,
    };

    NativeModules.StandScorePredictor = {
      predictStandScore: jest.fn().mockResolvedValue({
        score: 30,
        confidence: 'low',
      }),
    };

    const result = await predictStandScore(extremeFeatures);

    expect(result.score).toBe(30);
  });

  it('handles zero and negative pressure trend', async () => {
    const lowPressureFeatures: StandScoreFeatures = {
      ...mockFeatures,
      pressure_trend: -5.0,
    };

    NativeModules.StandScorePredictor = {
      predictStandScore: jest.fn().mockResolvedValue({
        score: 70,
        confidence: 'high',
      }),
    };

    const result = await predictStandScore(lowPressureFeatures);

    expect(result.score).toBe(70);
  });

  // ─────────────────────────────────────────────────────────────────────────
  // Confidence Level Tests
  // ─────────────────────────────────────────────────────────────────────────

  it('propagates confidence levels from predictions', async () => {
    const confidenceLevels: Array<'high' | 'medium' | 'low' | 'unavailable'> = [
      'high',
      'medium',
      'low',
      'unavailable',
    ];

    for (const confidence of confidenceLevels) {
      NativeModules.StandScorePredictor = {
        predictStandScore: jest.fn().mockResolvedValue({
          score: confidence === 'unavailable' ? null : 50,
          confidence,
        }),
      };

      const result = await predictStandScore(mockFeatures);
      expect(result.confidence).toBe(confidence);
    }
  });
});
