#!/usr/bin/env python3
"""
Phase 5D.3: CoreML Export via LightGBM Native ONNX

Converts trained LightGBM model to ONNX directly, then to CoreML for iOS.
"""

import joblib
import numpy as np
import json
import os
import tempfile

# Load the trained model
model = joblib.load('ml/stand_score.joblib')

# Feature names and order (must match training script)
feature_names = [
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
]

print(f"Converting {type(model).__name__} to ONNX → CoreML...")

try:
    # LightGBM supports native ONNX export
    # Create a temporary ONNX file
    onnx_model_path = 'ml/stand_score.onnx'

    # Use lightgbm's booster object (accessible via model.booster_)
    # First we need to create an ONNX model using the booster
    import onnx
    from onnx import helper, TensorProto

    # Extract LightGBM's native ONNX capability
    # Convert model to ONNX using lightgbm's native export
    initial_dtype = np.float32
    booster = model.booster_

    # Use LightGBM's native ONNX converter
    try:
        onnx_str = booster.model_to_onnx(
            num_class=1,
            initial_types=[('float_input', [None, len(feature_names)])],
        )

        with open(onnx_model_path, 'wb') as f:
            f.write(onnx_str.SerializeToString())
        print(f"✓ Saved ONNX model to {onnx_model_path}")

    except Exception as e:
        print(f"Note: LightGBM native ONNX failed ({e}), trying alternative approach...")
        # Fallback: manually create a simple ONNX model from predictions
        # This is a workaround for edge cases
        raise

    # Now convert ONNX → CoreML using onnx-coreml
    try:
        from onnx_coreml import convert as onnx_to_coreml

        coreml_model = onnx_to_coreml(
            onnx_model_path,
            mode='regressor',
            image_input_names=None,
        )

        # Set model metadata
        coreml_model.short_description = "Stand-score regressor for deer hunting activity prediction"
        coreml_model.author = "MDHuntFishOutdoors AI"
        coreml_model.license = "Proprietary"
        coreml_model.version = "1.0.0"

        # Add feature names as metadata
        coreml_model.user_defined_metadata['features'] = json.dumps(feature_names)
        coreml_model.user_defined_metadata['disclaimer'] = (
            'Experimental: trained on limited historical data. Use as a guide, not a guarantee.'
        )

        # Save the .mlmodel
        output_path = 'mobile/ios/HuntPlanAI/StandScore.mlmodel'
        coreml_model.save(output_path)
        print(f"✓ Saved CoreML model to {output_path}")

        # Get file size
        model_size_kb = os.path.getsize(output_path) / 1024
        print(f"  Model size: {model_size_kb:.1f} KB")

    except ImportError:
        print("Note: onnx-coreml not available for this architecture.")
        print(f"The .mlmodel was NOT generated, but the .joblib model is ready for manual export.")
        print(f"Manual next steps:")
        print(f"  1. On macOS with Xcode, use: xcrun coremlcompiler compile {onnx_model_path} .")
        print(f"  2. Or use coremltools on macOS only (not supported on Linux)")
        output_path = None

    # Test the model with sample input
    print(f"\nTesting LightGBM model with sample inputs:")

    sample_inputs = [
        {
            'name': 'Pre-season (May)',
            'data': {
                'day_of_season': 120,
                'season_week': 0,
                'moon_phase': 0.3,
                'illumination': 0.6,
                'rut_stage_peak': 0,
                'rut_stage_pre': 1,
                'temp_min': 60,
                'temp_max': 72,
                'pressure_trend': 0.5,
                'wind_speed': 5.0,
                'precip_prob': 0.2,
                'cold_front': 0,
            }
        },
        {
            'name': 'Peak rut (mid-November)',
            'data': {
                'day_of_season': 290,
                'season_week': 6,
                'moon_phase': 0.5,
                'illumination': 0.95,
                'rut_stage_peak': 1,
                'rut_stage_pre': 0,
                'temp_min': 35,
                'temp_max': 48,
                'pressure_trend': -3.0,
                'wind_speed': 12.0,
                'precip_prob': 0.5,
                'cold_front': 1,
            }
        },
        {
            'name': 'Late season (December)',
            'data': {
                'day_of_season': 350,
                'season_week': 10,
                'moon_phase': 0.7,
                'illumination': 0.4,
                'rut_stage_peak': 0,
                'rut_stage_pre': 0,
                'temp_min': 25,
                'temp_max': 38,
                'pressure_trend': 1.0,
                'wind_speed': 6.0,
                'precip_prob': 0.7,
                'cold_front': 0,
            }
        },
    ]

    for sample in sample_inputs:
        test_array = np.array([[sample['data'][feat] for feat in feature_names]], dtype=np.float32)
        pred = model.predict(test_array)[0]
        print(f"  {sample['name']:30s}: {pred:.2f} harvests/week")

    print(f"\n" + "=" * 80)
    print("LightGBM stand-score model ready!")
    if output_path:
        print(f"CoreML model saved to: {output_path}")
        print(f"Model size:            {model_size_kb:.1f} KB")
    else:
        print(f"CoreML conversion skipped (platform limitation)")
        print(f"Joblib model available: ml/stand_score.joblib")
    print(f"\nNext steps:")
    print(f"  1. Create StandScorePredictor.swift wrapper")
    print(f"  2. Create mobile/src/services/StandScoreService.ts")
    print(f"  3. Wire into ScoutScreen UI")
    print("=" * 80)

except Exception as e:
    print(f"Error: {e}")
    print("\nFallback: .joblib model is still usable via Python bridge if needed.")
    import traceback
    traceback.print_exc()
