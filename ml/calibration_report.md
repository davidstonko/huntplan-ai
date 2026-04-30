# Stand-Score Regressor Calibration Report

**Generated:** 2026-04-20T12:37:51.578229

## Model Performance

### Cross-Validated Metrics (5-fold)
- **Mean Absolute Error (MAE)**: 25.14 harvests/week
- **Root Mean Squared Error (RMSE)**: 46.07
- **Brier Score**: 0.0044

### Data Summary
- **Total Training Rows**: 3,050
- **Real Data Rows**: 1,050
- **Synthetic Data Rows**: 2,000
- **Target Range**: 3–698 harvests/week
- **Target Mean**: 55.48

## Data Sources

### Real Data (Verified Maryland DNR Harvest Summaries)
- **Counties**: 21 unique
- **Years**: 2020–2023
- **Weapons**: archery, firearms, muzzleloader, rifle
- **Source**: MD Department of Natural Resources annual wildlife harvest bulletins
- **Note**: County-level aggregates; no land-level granularity available publicly

### Synthetic Data
- **Generation Method**: Plausible feature combinations with Poisson-based harvest generation
- **Moon Phase**: Computed via synodic month model
- **Rut Stage**: Heuristic based on date (pre-rut, peak, post-rut)
- **Weather**: Synthetic temperature/pressure/wind drawn from plausible seasonal distributions
- **Labeling**: All synthetic rows tagged with is_real=0 for transparency

## Model Architecture

- **Algorithm**: LightGBM Gradient Boosting Regressor
- **Trees**: 200
- **Max Depth**: 6
- **Learning Rate**: 0.05
- **Leaf Count**: 31

## Feature List (12 total)

1. `day_of_season` — Day number within calendar year (0–365)
2. `season_week` — Week within legal hunting season (1–13)
3. `moon_phase` — Phase angle 0–1 (new=0, full=0.5)
4. `illumination` — Moon illumination fraction 0–1
5. `rut_stage_peak` — Binary: 1 if Oct 11–Nov 20, else 0
6. `rut_stage_pre` — Binary: 1 if Aug 1–Oct 10, else 0
7. `temp_min` — Daily minimum temperature (°F)
8. `temp_max` — Daily maximum temperature (°F)
9. `pressure_trend` — 24-hour barometric pressure change (mb)
10. `wind_speed` — Average wind speed (mph)
11. `precip_prob` — Precipitation probability (0–1)
12. `cold_front` — Binary: 1 if pressure drops >2 mb and temp <45°F

## Calibration Notes

- **Reliability**: Model is trained on historical county-level aggregates. Predictions at per-land granularity should be treated as indicative, not prescriptive.
- **Cold-Start**: Users new to the app have no personal sighting history; model works off weather + solunar + date only.
- **Retraining Cadence**: Target 3-month intervals with updated DNR harvest data.
- **Confidence Intervals**: V1 does not compute prediction intervals; future versions may add Bayesian calibration.

## App Disclaimer

"Experimental: trained on limited historical data. Use as a guide, not a guarantee."

---
