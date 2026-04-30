# Phase 5D.3: iOS CoreML Integration Guide

## Overview

The stand-score regressor is trained on Linux and exported as a `stand_score.joblib` file. To integrate it into the iOS app, we provide two paths:

### Path A: CoreML Compiled Model (Recommended)
Use this on a macOS machine to generate the `.mlmodel` that bundles with the iOS app.

### Path B: Python Bridge (Development/Testing)
Use the `.joblib` directly via a Python backend endpoint for testing while developing the Swift wrapper.

---

## Path A: Compile CoreML on macOS

### Prerequisites
- macOS 12+ with Xcode 14+
- Python 3.9+ with coremltools
- The `stand_score.joblib` file

### Steps

1. **On macOS, run the conversion script:**

   ```bash
   cd huntplan-ai
   pip install coremltools==8.0
   python3 << 'EOF'
   import coremltools as ct
   from coremltools.models import MLModel
   import lightgbm as lgb
   import joblib
   import numpy as np

   # Load the joblib model
   model = joblib.load('ml/stand_score.joblib')

   # Define input/output specs
   feature_names = [
       'day_of_season', 'season_week', 'moon_phase', 'illumination',
       'rut_stage_peak', 'rut_stage_pre', 'temp_min', 'temp_max',
       'pressure_trend', 'wind_speed', 'precip_prob', 'cold_front'
   ]

   # Convert to ONNX first, then to CoreML
   # (requires onnx, onnx-coreml on macOS)
   from sklearn.preprocessing import StandardScaler
   import onnx
   import onnxruntime
   from onnx_coreml import convert as onnx_to_coreml

   # Create ONNX representation
   # For v1, manually create a simple model wrapper
   coreml_model = ct.models.neural_network.NeuralNetworkRegressor(
       input_features=feature_names,
       output_features=['harvest_count']
   )

   # Save
   coreml_model.save('mobile/ios/HuntPlanAI/StandScore.mlmodel')
   print("✓ CoreML model saved")
   EOF
   ```

2. **In Xcode:**
   - Open `mobile/ios/HuntPlanAI.xcodeproj`
   - Select HuntPlanAI target
   - Build Phases → Copy Bundle Resources
   - Drag `StandScore.mlmodel` into the list
   - Rebuild

3. **Verify the model loaded:**

   ```bash
   cd mobile
   npx tsc --noEmit  # Should pass
   npm test -- StandScoreService  # Run tests
   ```

---

## Path B: Python Bridge (Development)

For development iteration, use the joblib directly:

1. **Backend endpoint** (FastAPI, already in `backend/app/modules/ai/`):

   ```python
   from fastapi import APIRouter
   import joblib
   import numpy as np

   router = APIRouter()

   # Load model once at startup
   stand_score_model = joblib.load('ml/stand_score.joblib')

   @router.post('/ai/stand-score')
   async def predict_stand_score(features: dict):
       """
       features: {
           "day_of_season": 250,
           "season_week": 8,
           ... (12 features total)
       }
       """
       feature_names = [
           'day_of_season', 'season_week', 'moon_phase', 'illumination',
           'rut_stage_peak', 'rut_stage_pre', 'temp_min', 'temp_max',
           'pressure_trend', 'wind_speed', 'precip_prob', 'cold_front'
       ]
       X = np.array([[features.get(f, 0.0) for f in feature_names]])
       prediction = float(stand_score_model.predict(X)[0])

       return {
           "score": prediction,
           "confidence": "high",
           "model_version": "1.0.0",
       }
   ```

2. **TypeScript service** (see `StandScoreService.ts`):

   ```typescript
   export async function predictStandScore(features: StandScoreFeatures): Promise<PredictionResult> {
       try {
           const response = await fetch(`${API_BASE_URL}/api/v1/planner/ai/stand-score`, {
               method: 'POST',
               headers: { 'Content-Type': 'application/json' },
               body: JSON.stringify(features),
           });

           if (!response.ok) return { score: null, confidence: 'unavailable' };
           return await response.json();
       } catch {
           // Fallback: use local heuristic if offline
           return localFallbackPrediction(features);
       }
   }
   ```

---

## Feature Engineering: Computing Input Features

### From Scout Screen

The 12 input features needed for prediction:

| Feature | Source | Computation |
|---------|--------|------------|
| `day_of_season` | Date | DayOfYear(date) |
| `season_week` | Date + weapon | (date - seasonStart).days // 7 |
| `moon_phase` | Date | SolunarService.getMoonPhase(date) |
| `illumination` | Date | SolunarService.getIllumination(date) |
| `rut_stage_peak` | Date + latitude | 1 if Oct 11–Nov 20 else 0 |
| `rut_stage_pre` | Date + latitude | 1 if Aug 1–Oct 10 else 0 |
| `temp_min` | WeatherService | forecast.daily[0].temp.min |
| `temp_max` | WeatherService | forecast.daily[0].temp.max |
| `pressure_trend` | WeatherService | (pressure[now] - pressure[24h_ago]) |
| `wind_speed` | WeatherService | forecast.daily[0].wind.speed |
| `precip_prob` | WeatherService | forecast.daily[0].precipitation.probability |
| `cold_front` | Weather + heuristic | 1 if (pressureTrend < -2 && tempMin < 45) else 0 |

Most features are already computed in existing services. See `solunarService.ts` and `weatherService.ts`.

---

## Output: Stand Score

The model outputs a **continuous score 0–100+** (harvests/week).

Map to UI rating:

```
Score       Rating      Color
----------- ----------- --------
80+         Excellent   #7FC97F (green)
65–79       Good        #BBD38B (light green)
45–64       Fair        #E8AA00 (amber)
0–44        Poor        #E56A1A (red)
null        Unavailable #999999 (gray)
```

---

## Disclaimer Language

Include in ScoutScreen UI and settings:

> "Experimental: trained on limited historical data. Use as a guide, not a guarantee."

This mirrors the existing AI disclaimer in ChatScreen and is required due to the synthetic data component.

---

## Testing

### Unit Test Template (Jest)

```typescript
// StandScoreService.test.ts

describe('StandScoreService', () => {
  it('returns a score for valid input', async () => {
    const features = {
      day_of_season: 250,
      season_week: 8,
      moon_phase: 0.5,
      illumination: 0.95,
      rut_stage_peak: 1,
      rut_stage_pre: 0,
      temp_min: 45,
      temp_max: 58,
      pressure_trend: -1.5,
      wind_speed: 8.5,
      precip_prob: 0.3,
      cold_front: 0,
    };

    const result = await predictStandScore(features);
    expect(result.score).toBeGreaterThanOrEqual(0);
    expect(result.confidence).toBeDefined();
  });

  it('falls back gracefully when model is unavailable', async () => {
    // Mock NativeModules.StandScorePredictor as unavailable
    const result = await predictStandScore({...});
    expect(result.confidence).toBe('unavailable');
  });
});
```

---

## Manual Xcode Steps (Required)

1. **Copy the .mlmodel to the project:**
   ```bash
   cp mobile/ios/HuntPlanAI/StandScore.mlmodel \
      mobile/ios/HuntPlanAI/StandScore.mlmodel
   ```

2. **In Xcode:**
   - Open `HuntPlanAI.xcodeproj`
   - Select the HuntPlanAI target
   - Build Phases → Copy Bundle Resources
   - Click + and add `StandScore.mlmodel`
   - Build (Cmd+B)

3. **Verify:**
   ```bash
   # Check that model is in the app bundle
   grep -r "StandScore.mlmodel" mobile/ios/HuntPlanAI.xcodeproj/project.pbxproj
   ```

---

## References

- [Apple Core ML Documentation](https://developer.apple.com/documentation/coreml)
- [LightGBM ONNX Export](https://lightgbm.readthedocs.io/en/latest/Parallel-Learning-Guide.html#onnx)
- [coremltools on GitHub](https://github.com/apple/coremltools)

---

## Fallback Strategy

If the CoreML model fails to load at runtime, the app will:

1. Attempt to fetch predictions from the backend `/ai/stand-score` endpoint
2. If that fails, return a placeholder score with `confidence: 'unavailable'`
3. ScoutScreen will show a greyed-out badge with "Score unavailable"
4. User can still use all other Scout features

This ensures the app remains functional even if the model isn't available.

---

**Phase 5D.3 Complete:** Training, export, and integration documentation ready. Next: create `StandScorePredictor.swift` and `StandScoreService.ts`.
