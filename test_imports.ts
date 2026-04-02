// Simple test to verify our types and service can be imported
import type { 
  CampDataPoint, 
  CampIntelligence, 
  LocalInsights, 
  AIInsights,
  IntelligenceTier 
} from './src/types/intelligence';

import {
  aggregateCampData,
  computeLocalInsights,
  getTier,
  getTierProgress,
  requestAIAnalysis,
  getCampIntelligence,
  getDataPointCount,
  clearIntelligenceCache,
} from './src/services/campIntelligenceService';

import type { DeerCamp } from './src/types/deercamp';

// Type check: all imports should resolve
const testCamp: DeerCamp = {} as any;
const testTier: IntelligenceTier = 'basic';
const testInsight: CampIntelligence = {} as any;

console.log('✅ All imports resolve correctly');
